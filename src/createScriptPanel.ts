import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const logger = vscode.window.createOutputChannel('Maximo Script Helper', { log: true });

export interface ScriptTypeItem {
  value: string;
  label: string;
  description: string;
  category: 'normal' | 'object' | 'attribute' | 'other';
}

export interface ScriptConfig {
  autoscript: string;
  description: string;
  version: string;
  active: number;
  logLevel: string;
  scriptlanguage: string;
  interface: number;
  variables: any[];
  launchPoints: any[];
  [key: string]: any;
}

export class CreateScriptPanel {
  public static currentPanel: CreateScriptPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private readonly _extensionUri: vscode.Uri;
  private _targetDir: string;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, targetDir: string) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._targetDir = targetDir;

    this._panel.webview.html = this._getWebviewContent(extensionUri);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async message => {
        logger.info(`[CreateScriptPanel] 收到消息: ${message.command}`);
        switch (message.command) {
          case 'webviewReady':
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
            this._panel.webview.postMessage({
              command: 'loadTargetDir',
              targetDir: this._targetDir,
              workspaceRoot: workspaceRoot
            });
            return;
          case 'createScript':
            await this._createScript(message.data);
            return;
          case 'closePanel':
            this._panel.dispose();
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri, targetDir: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (CreateScriptPanel.currentPanel) {
      CreateScriptPanel.currentPanel._panel.reveal(column);
      CreateScriptPanel.currentPanel._targetDir = targetDir;
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'maximoScriptCreateScript',
      '创建脚本',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    CreateScriptPanel.currentPanel = new CreateScriptPanel(panel, extensionUri, targetDir);
  }

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private _getWebviewContent(extensionUri: vscode.Uri): string {
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'create-script.js')
    );

    const styleUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'create-script.css')
    );

    const nonce = this._getNonce();

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https: data: blob:; script-src 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval'; style-src vscode-resource: 'unsafe-inline' https:; font-src vscode-resource: https:;">
  <title>创建脚本</title>
  <link href="${styleUri}" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private async _createScript(data: {
    scriptName: string;
    scriptType: string;
    description: string;
    ibmPackagepath?: string;
    launchPointConfig?: any;
  }) {
    try {
      const { scriptName, scriptType, description, ibmPackagepath, launchPointConfig } = data;

      if (!scriptName || !scriptName.trim()) {
        this._panel.webview.postMessage({
          command: 'showError',
          message: '脚本名称不能为空'
        });
        return;
      }

      if (!scriptType) {
        this._panel.webview.postMessage({
          command: 'showError',
          message: '请选择脚本类型'
        });
        return;
      }

      const templateDir = path.join(__dirname, '../template/cn/shoukaiseki/tmpl');
      const templateFilePath = path.join(templateDir, `SKS_TMPL_${scriptType}.js`);

      let templateContent = '';
      if (fs.existsSync(templateFilePath)) {
        templateContent = fs.readFileSync(templateFilePath, 'utf-8');
      } else {
        templateContent = this._generateDefaultScriptContent(scriptType);
      }

      const scriptConfig = this._generateScriptConfig(scriptName, scriptType, description, ibmPackagepath || '', launchPointConfig);

      const jsFilePath = path.join(this._targetDir, `${scriptName}.js`);
      const jsonFilePath = path.join(this._targetDir, `${scriptName}.json`);

      if (fs.existsSync(jsFilePath) || fs.existsSync(jsonFilePath)) {
        this._panel.webview.postMessage({
          command: 'showOverwriteConfirm',
          jsFilePath,
          jsonFilePath
        });
        return;
      }

      await this._doCreateFiles(jsFilePath, jsonFilePath, templateContent, scriptConfig);

    } catch (error: any) {
      logger.error(`[CreateScriptPanel] 创建脚本失败: ${error.message}`);
      this._panel.webview.postMessage({
        command: 'showError',
        message: `创建脚本失败: ${error.message}`
      });
    }
  }

  private _generateDefaultScriptContent(scriptType: string): string {
    const typeInfo = this._getScriptTypeInfo(scriptType);
    
    let content = `// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />

var scriptName = service.getScriptName();

/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
loggerMX.info("[" + scriptName + "] Starting execution");

`;

    if (typeInfo.category === 'object') {
      content += `/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");

var app = app;
var interactive = interactive;
var onadd = onadd;
var launchPoint = launchPoint;
var onsetup = onsetup;
var mboname = mboname;
var service = service;
var onupdate = onupdate;
var mbo = mbo;
var ondelete = ondelete;
var user = user;

main();

function main() {
    loggerMX.info("[" + scriptName + "] Object script execution");
}
`;
    } else if (typeInfo.category === 'attribute') {
      content += `/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");

var app = app;
var mboattr = mboattr;
var launchPoint = launchPoint;
var mboname = mboname;
var interactive = interactive;
var onadd = onadd;
var mbovalue = mbovalue;
var service = service;
var onupdate = onupdate;
var mbo = mbo;
var ondelete = ondelete;
var user = user;

main();

function main() {
    loggerMX.info("[" + scriptName + "] Attribute script execution");
}
`;
    } else {
      content += `main();

function main() {
    loggerMX.info("[" + scriptName + "] Script execution");
}
`;
    }

    return content;
  }

  private _getScriptTypeInfo(scriptType: string): ScriptTypeItem {
    const scriptTypes: ScriptTypeItem[] = [
      { value: 'APISCRIPT', label: 'API脚本', description: '通过 REST API 调用', category: 'normal' },
      { value: 'CONDITION', label: '条件脚本', description: '用于条件判断', category: 'normal' },
      { value: 'DATABEAN', label: 'DataBean脚本', description: '数据Bean扩展', category: 'normal' },
      { value: 'CRONTASK', label: '定时任务脚本', description: '定时执行', category: 'normal' },
      { value: 'APPBEAN', label: 'AppBean脚本', description: '应用Bean扩展', category: 'normal' },
      { value: 'OPTION', label: '选项脚本', description: '选项列表', category: 'normal' },
      { value: 'MXERR', label: '异常脚本', description: '异常处理', category: 'normal' },
      { value: 'LOOKUP', label: 'Lookup脚本', description: '查找功能', category: 'normal' },
      { value: 'OBJECT.INIT', label: '对象初始化', description: '在对象创建时触发', category: 'object' },
      { value: 'OBJECT.SAVE', label: '对象保存', description: '在对象保存时触发', category: 'object' },
      { value: 'OBJECT.INITZOMBIE', label: '对象僵尸初始化', description: '僵尸对象初始化', category: 'object' },
      { value: 'FLD_ACTION', label: '字段动作', description: '字段值变更后触发', category: 'attribute' },
      { value: 'FLD_VALIDATE', label: '字段验证', description: '字段值验证', category: 'attribute' },
      { value: 'FLD_LOOKUP', label: '字段查找', description: '字段查找功能', category: 'attribute' },
      { value: 'WF_ACTION', label: '工作流动作', description: '工作流步骤动作', category: 'other' },
      { value: 'RELATIONSHIP', label: '关系脚本', description: '关系验证', category: 'other' }
    ];
    return scriptTypes.find(t => t.value === scriptType) || { value: scriptType, label: scriptType, description: '', category: 'normal' };
  }

  private _generateScriptConfig(scriptName: string, scriptType: string, description: string, ibmPackagepath: string, launchPointConfig?: any): ScriptConfig {
    const typeInfo = this._getScriptTypeInfo(scriptType);
    
    const isInterface = scriptType === 'APPBEAN' || scriptType === 'DATABEAN';
    
    const scriptConfig: ScriptConfig = {
      autoscript: scriptName,
      description: description || `${scriptName} - ${typeInfo.description}`,
      version: '1.0.0',
      active: 1,
      logLevel: 'ERROR',
      scriptlanguage: 'JavaScript',
      interface: isInterface ? 1 : 0,
      variables: [],
      launchPoints: [],
      status: 'Draft',
      langcode: 'ZH',
      createdby: 'MAXADMIN',
      owner: 'MAXADMIN',
      userdefined: 1,
      hasld: 0,
      orgid: '',
      siteid: '',
      action: '',
      scheduledstatus: '',
      comments: '',
      ownerid: '',
      ownername: '',
      owneremail: '',
      ownerphone: '',
      createdbyid: '',
      createdbyname: '',
      createdbyemail: '',
      createdbyphone: '',
      changeby: 'MAXADMIN',
      category: '',
      autoscriptid: 0,
      ibm_packagepath: ibmPackagepath
    };

    if (typeInfo.category === 'object' || typeInfo.category === 'attribute') {
      if (launchPointConfig) {
        const launchPoint: any = {
          launchpointname: launchPointConfig.launchpointname || scriptType.replace('OBJECT.', '').replace('FLD_', ''),
          launchpointtype: typeInfo.category === 'attribute' ? 'ATTRIBUTE' : 'OBJECT',
          objectname: launchPointConfig.objectname || '',
          attributename: typeInfo.category === 'attribute' ? (launchPointConfig.attributename || '') : '',
          active: launchPointConfig.active ? 'Y' : 'N',
          description: launchPointConfig.description || `${scriptName} - ${typeInfo.description}`,
          condition: launchPointConfig.condition || '',
          eventtype: launchPointConfig.eventtype || '0',
          objectevent: launchPointConfig.objectevent || (typeInfo.category === 'attribute' ? 1 : 1),
          attributeevent: typeInfo.category === 'attribute' ? (launchPointConfig.attributeevent || '0') : '',
          evcontext: launchPointConfig.evcontext || '0',
          add: launchPointConfig.add || false,
          update: launchPointConfig.update || false,
          delete: launchPointConfig.delete || false
        };

        scriptConfig.launchPoints = [launchPoint];
      } else {
        const launchPoint: any = {
          launchpointname: scriptType.replace('OBJECT.', '').replace('FLD_', ''),
          launchpointtype: typeInfo.category === 'attribute' ? 'ATTRIBUTE' : 'OBJECT',
          objectname: '',
          attributename: typeInfo.category === 'attribute' ? '' : '',
          active: 'Y',
          description: `${scriptName} - ${typeInfo.description}`,
          condition: '',
          eventtype: typeInfo.category === 'attribute' ? '' : '0',
          objectevent: typeInfo.category === 'attribute' ? 1 : 1,
          attributeevent: typeInfo.category === 'attribute' ? '0' : '',
          evcontext: '0',
          add: false,
          update: false,
          delete: false
        };
        scriptConfig.launchPoints = [launchPoint];
      }
    }

    return scriptConfig;
  }

  public async _doCreateFiles(
    jsFilePath: string,
    jsonFilePath: string,
    templateContent: string,
    scriptConfig: ScriptConfig
  ) {
    try {
      fs.writeFileSync(jsFilePath, templateContent, 'utf-8');
      fs.writeFileSync(jsonFilePath, JSON.stringify(scriptConfig, null, 2), 'utf-8');

      logger.info(`[CreateScriptPanel] ✅ 已创建脚本: ${scriptConfig.autoscript}`);

      this._panel.webview.postMessage({
        command: 'createSuccess',
        scriptName: scriptConfig.autoscript,
        jsFilePath,
        jsonFilePath
      });

      setTimeout(() => {
        this._panel.dispose();
        
        vscode.window.showInformationMessage(
          `脚本 ${scriptConfig.autoscript} 创建成功!`,
          { title: '打开 JS 文件', action: 'openJs' },
          { title: '打开 JSON 文件', action: 'openJson' }
        ).then(async (selection) => {
          if (selection?.action === 'openJs') {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(jsFilePath));
            await vscode.window.showTextDocument(doc);
          } else if (selection?.action === 'openJson') {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(jsonFilePath));
            await vscode.window.showTextDocument(doc);
          }
        });
      }, 500);

    } catch (error: any) {
      logger.error(`[CreateScriptPanel] 写入文件失败: ${error.message}`);
      this._panel.webview.postMessage({
        command: 'showError',
        message: `写入文件失败: ${error.message}`
      });
    }
  }

  private dispose() {
    CreateScriptPanel.currentPanel = undefined;
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}