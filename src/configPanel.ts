import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { httpRequestToMaximo } from './httpRequest';

// 创建日志输出通道
const logger = vscode.window.createOutputChannel('Maximo Script Helper', { log: true });

// Maximo API 路径常量

export class ConfigPanel {
  public static currentPanel: ConfigPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private readonly _extensionUri: vscode.Uri;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._panel.webview.html = this._getWebviewContent(extensionUri);
    
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    
    this._panel.webview.onDidReceiveMessage(
      async message => {
        logger.info(`[ConfigPanel] 收到消息: ${message.command}`);
        switch (message.command) {
          case 'webviewReady':
            // React 已准备好，发送初始配置
            this._sendInitialConfig();
            return;
          case 'saveConfig':
            await this._saveConfig(message.data);
            return;
          case 'selectDirectory':
            await this._selectDirectory();
            return;
          case 'testConnection':
            await this._testConnection(message.data);
            return;
          case 'addJarDirectory':
            await this._addJarDirectory(message.path);
            return;
          case 'removeJarDirectory':
            await this._removeJarDirectory(message.index);
            return;
          case 'selectSingleJar':
            await this._selectSingleJar();
            return;
          case 'addSingleJar':
            await this._addSingleJar(message.path);
            return;
          case 'selectJdk':
            await this._selectJdk();
            return;
          case 'initScripts':
            await this._initScripts();
            return;
          case 'clearScripts':
            await this._clearScripts();
            return;
          case 'deployScript':
            await this._deploySingleFile(message.filePath);
            return;
          case 'deployDirectory':
            await this._deployDirectory(message.directoryPath, message.recursive);
            return;
          case 'selectFileForDeploy':
            await this._selectFileForDeploy();
            return;
          case 'selectDirectoryForDeploy':
            await this._selectDirectoryForDeploy();
            return;
          case 'selectDeleteJson':
            await this._selectDeleteJson();
            return;
          case 'selectDirectoryForExtract':
            await this._selectDirectoryForExtract();
            return;
          case 'extractScripts':
            await this._extractScripts(message.directoryPath);
            return;
          case 'queryScripts':
            await this._queryScripts();
            return;
          case 'confirmClearScripts':
            await this._confirmClearScripts(message.jsonPath);
            return;
          case 'clearScripts':
            await this._clearScripts(message.jsonPath);
            return;
          case 'showWarning':
            vscode.window.showWarningMessage(message.message);
            return;
          case 'showInfo':
            vscode.window.showInformationMessage(message.message);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (ConfigPanel.currentPanel) {
      ConfigPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'maximoScriptConfig',
      'Maximo Script 配置',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    ConfigPanel.currentPanel = new ConfigPanel(panel, extensionUri);
  }

  /**
   * 生成随机 nonce 用于 CSP
   */
  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

private _getWebviewContent(extensionUri: vscode.Uri): string {
    // 使用 React 构建的 Webview
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'index.js')
    );
    
    const styleUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'style.css')
    );
    
    const nonce = this._getNonce();
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https: data: blob:; script-src 'nonce-${nonce}' 'unsafe-inline'; style-src vscode-resource: 'unsafe-inline' https:; font-src vscode-resource: https:;">
  <title>Maximo Script 配置</title>
  <link href="${styleUri}" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private async _saveConfig(data: any) {
    try {
      const config = vscode.workspace.getConfiguration('maximoScript');
      
      console.log('[SaveConfig] 开始保存配置...');
      console.log('[SaveConfig] enableHttpLog:', data.enableHttpLog, '类型:', typeof data.enableHttpLog);
      
      logger.info('[SaveConfig] 开始保存配置...');
      logger.info(`[SaveConfig] enableHttpLog: ${data.enableHttpLog}, 类型: ${typeof data.enableHttpLog}`);
      
      await config.update('serverUrl', data.serverUrl, vscode.ConfigurationTarget.Global);
      await config.update('authType', data.authType, vscode.ConfigurationTarget.Global);
      await config.update('maxauth', data.maxauth, vscode.ConfigurationTarget.Global);
      await config.update('apiKey', data.apiKey, vscode.ConfigurationTarget.Global);
      await config.update('apiType', data.apiType, vscode.ConfigurationTarget.Global);
      await config.update('version', data.version, vscode.ConfigurationTarget.Global);
      await config.update('completionMode', data.completionMode || 'vscode', vscode.ConfigurationTarget.Global);
      await config.update('localApiPath', data.localApiPath, vscode.ConfigurationTarget.Global);
      await config.update('enableJSDocParsing', data.enableJSDocParsing, vscode.ConfigurationTarget.Global);
      await config.update('enableTypeInference', data.enableTypeInference, vscode.ConfigurationTarget.Global);
      await config.update('enableHttpLog', Boolean(data.enableHttpLog), vscode.ConfigurationTarget.Global);
      await config.update('jdkPath', data.jdkPath, vscode.ConfigurationTarget.Global);
      await config.update('jarDirectories', data.jarDirectories || [], vscode.ConfigurationTarget.Global);
      await config.update('additionalJars', data.additionalJars || [], vscode.ConfigurationTarget.Global);
      
      // 验证保存结果
      const savedValue = config.get('enableHttpLog', false);
      console.log('[SaveConfig] 保存后读取 enableHttpLog:', savedValue);
      logger.info(`[SaveConfig] 保存后读取 enableHttpLog: ${savedValue}`);
      
      vscode.window.showInformationMessage('配置已保存');
    } catch (error: any) {
      console.error('[SaveConfig] 保存配置失败:', error);
      logger.error(`[SaveConfig] 保存配置失败: ${error.message}`);
      vscode.window.showErrorMessage(`保存配置失败: ${error.message}`);
    }
  }

  private async _selectDirectory() {
    const result = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: '选择API数据目录',
      title: '选择包含JSON API反射数据的目录'
    });

    if (result && result.length > 0) {
      const selectedPath = result[0].fsPath;
      // 向webview发送选中的路径
      this._panel.webview.postMessage({
        command: 'setDirectoryPath',
        path: selectedPath
      });
    }
  }

  /**
   * 渲染 JAR 目录列表
   */
  private _renderJarDirectories(directories: string[]): string {
    if (!directories || directories.length === 0) {
      return '<div style="color: var(--vscode-descriptionForeground); font-style: italic;">暂无配置的 JAR 目录</div>';
    }
    
    return directories.map((dir, index) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--vscode-panel-border);">
        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${dir}">${dir}</span>
        <button onclick="removeJarDir(${index})" style="margin-left: 10px; padding: 2px 8px; cursor: pointer;">❌ 删除</button>
      </div>
    `).join('');
  }

  private async _testConnection(data: { serverUrl: string; authType: string; apiType: string; maxauth: string; apiKey: string }) {
    try {
      console.log('[TestConnection] 收到测试连接请求');
      console.log('[TestConnection] 数据:', JSON.stringify(data, null, 2));
      
      logger.info('[TestConnection] 收到测试连接请求');
      logger.info(`[TestConnection] 服务器: ${data.serverUrl}`);
      logger.info(`[TestConnection] 认证类型: ${data.authType}, 接口类型: ${data.apiType}`);
      
      // 先保存配置,没点保存按钮的话,测试使用的会是以前的配置信息
      //先直接保存
      const config = require('vscode').workspace.getConfiguration('maximoScript');
      await config.update('serverUrl', data.serverUrl, require('vscode').ConfigurationTarget.Global);
      await config.update('authType', data.authType, require('vscode').ConfigurationTarget.Global);
      await config.update('maxauth', data.maxauth, require('vscode').ConfigurationTarget.Global);
      await config.update('apiKey', data.apiKey, require('vscode').ConfigurationTarget.Global);
      await config.update('apiType', data.apiType, require('vscode').ConfigurationTarget.Global);
      
      console.log(`[TestConnection] 开始测试连接...`);
      console.log(`[TestConnection] 认证类型: ${data.authType}, 接口类型: ${data.apiType}`);
      
      logger.info('[TestConnection] 开始发送 HTTP 请求...');
      
      // 使用全局 httpRequestToMaximo 方法（会从配置中读取）
      const { httpRequestToMaximo } = require('./extension');
      
      const response = await httpRequestToMaximo({
        method: 'GET',
        url: 'os/MXAPIPERSON/_TUFYQURNSU4=?lean=1'
      });
      
      // 检查响应
      if (response.status === 200 && response.data) {
        let userInfo = '';
        
        // 根据不同接口类型解析用户信息
        if (data.apiType === 'oslc') {
          const displayName = response.data.displayname || '未知用户';
          const personId = response.data.personid || 'N/A';
          userInfo = `用户: ${displayName} (${personId})`;
        } else {
          const displayName = response.data.displayname || response.data.name || '未知用户';
          const personId = response.data.personid || response.data.id || 'N/A';
          userInfo = `用户: ${displayName} (${personId})`;
        }
        
        // 发送成功结果到 webview
        this._panel.webview.postMessage({
          command: 'connectionResult',
          type: 'success',
          text: `连接成功！<br/>${userInfo}<br/>接口类型: ${data.apiType === 'oslc' ? 'OSLC' : 'REST'}, 认证方式: ${data.authType === 'maxauth' ? 'MAXAUTH' : 'API Key'}`
        });
        
        console.log(`[TestConnection] ✅ 连接成功: ${userInfo}`);
        logger.info(`[TestConnection] ✅ 连接成功: ${userInfo}`);
      } else {
        throw new Error(`HTTP ${response.status}: 未知错误`);
      }
    } catch (error: any) {
      let errorMessage = '连接失败';
      
      if (error.response) {
        // 服务器返回错误状态码
        errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        if (error.response.data && error.response.data.errorMsg) {
          errorMessage += `<br/>详情: ${error.response.data.errorMsg}`;
        }
      } else if (error.request) {
        // 请求已发送但没有收到响应
        errorMessage = '无法连接到服务器，请检查网络和服务器地址';
      } else {
        // 其他错误
        errorMessage = error.message || '未知错误';
      }
      
      // 发送错误结果到 webview
      this._panel.webview.postMessage({
        command: 'connectionResult',
        type: 'error',
        text: errorMessage
      });
      
      console.error('[TestConnection] ❌ 连接失败:', error.message);
      logger.error(`[TestConnection] ❌ 连接失败: ${error.message}`);
    }
  }

  /**
   * 添加 JAR 目录
   */
  private async _addJarDirectory(path: string) {
    const config = vscode.workspace.getConfiguration('maximoScript');
    const currentDirs = config.get('jarDirectories', []) as string[];
    
    // 检查是否已存在
    if (currentDirs.includes(path)) {
      vscode.window.showWarningMessage('该目录已存在');
      return;
    }
    
    // 添加新目录
    const newDirs = [...currentDirs, path];
    await config.update('jarDirectories', newDirs, vscode.ConfigurationTarget.Global);
    
    logger.info(`[ConfigPanel] 已添加 JAR 目录: ${path}`);
    
    // 重新发送完整配置以更新 UI
    this._sendInitialConfig();
    
    vscode.window.showInformationMessage(`已添加 JAR 目录: ${path}`);
  }

  /**
   * 删除 JAR 目录
   */
  private async _removeJarDirectory(index: number) {
    const config = vscode.workspace.getConfiguration('maximoScript');
    const currentDirs = config.get('jarDirectories', []) as string[];
    
    if (index < 0 || index >= currentDirs.length) {
      return;
    }
    
    // 删除指定索引的目录
    const newDirs = currentDirs.filter((_, i) => i !== index);
    await config.update('jarDirectories', newDirs, vscode.ConfigurationTarget.Global);
    
    logger.info(`[ConfigPanel] 已删除 JAR 目录 (索引: ${index})`);
    
    // 重新发送完整配置以更新 UI
    this._sendInitialConfig();
    
    vscode.window.showInformationMessage('已删除 JAR 目录');
  }

  /**
   * 选择单个 JAR 文件
   */
  private async _selectSingleJar() {
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'JAR Files': ['jar']
      },
      openLabel: '选择 JAR 文件'
    });

    if (result && result.length > 0) {
      const jarPath = result[0].fsPath;
      this._panel.webview.postMessage({
        command: 'setSingleJarPath',
        path: jarPath
      });
    }
  }

  /**
   * 添加单个 JAR 文件
   */
  private async _addSingleJar(jarPath: string) {
    const config = vscode.workspace.getConfiguration('maximoScript');
    const currentJars = config.get('additionalJars', []) as string[];
    
    // 检查是否已存在
    if (currentJars.includes(jarPath)) {
      vscode.window.showWarningMessage('该 JAR 文件已存在');
      return;
    }
    
    // 添加新 JAR 文件
    const newJars = [...currentJars, jarPath];
    await config.update('additionalJars', newJars, vscode.ConfigurationTarget.Global);
    
    logger.info(`[ConfigPanel] 已添加 JAR 文件: ${jarPath}`);
    
    // 重新发送完整配置以更新 UI
    this._sendInitialConfig();
    
    vscode.window.showInformationMessage(`已添加 JAR 文件: ${jarPath}`);
  }

  /**
   * 选择 JDK 路径
   */
  private async _selectJdk() {
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: '选择 JDK 安装目录'
    });

    if (result && result.length > 0) {
      const jdkPath = result[0].fsPath;
      this._panel.webview.postMessage({
        command: 'setJdkPath',
        path: jdkPath
      });
    }
  }

  /**
   * 发送初始配置数据到 Webview
   */
  private _sendInitialConfig() {
    const config = vscode.workspace.getConfiguration('maximoScript');
    
    const configData = {
      serverUrl: config.get('serverUrl', ''),
      authType: config.get('authType', 'maxauth'),
      maxauth: config.get('maxauth', ''),
      apiKey: config.get('apiKey', ''),
      apiType: config.get('apiType', 'oslc'),
      version: config.get('version', '7.6'),
      completionMode: config.get('completionMode', 'vscode'),
      localApiPath: config.get('localApiPath', ''),
      enableJSDocParsing: config.get('enableJSDocParsing', true),
      enableTypeInference: config.get('enableTypeInference', true),
      enableHttpLog: config.get('enableHttpLog', false),
      jdkPath: config.get('jdkPath', ''),
      jarDirectories: config.get('jarDirectories', []),
      additionalJars: config.get('additionalJars', [])
    };
    
    logger.info('[ConfigPanel] 发送初始配置到 Webview');
    
    this._panel.webview.postMessage({
      command: 'loadConfig',
      data: configData
    });
  }

  /**
   * 选择要部署的文件
   */
  private async _selectFileForDeploy() {
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'JSON Files': ['json']
      },
      openLabel: '选择脚本配置文件'
    });

    if (result && result.length > 0) {
      this._panel.webview.postMessage({
        command: 'setDeployFilePath',
        path: result[0].fsPath
      });
    }
  }

  /**
   * 选择要部署的目录
   */
  private async _selectDirectoryForDeploy() {
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: '选择脚本目录'
    });

    if (result && result.length > 0) {
      this._panel.webview.postMessage({
        command: 'setDeployDirectoryPath',
        path: result[0].fsPath
      });
    }
  }

  /**
   * 选择删除脚本的 JSON 文件
   */
  private async _selectDeleteJson() {
    logger.info('[SelectDeleteJson] 开始选择 JSON 文件');
    
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'JSON Files': ['json']
      },
      openLabel: '选择脚本列表 JSON 文件'
    });

    if (result && result.length > 0) {
      const selectedPath = result[0].fsPath;
      logger.info(`[SelectDeleteJson] 已选择文件: ${selectedPath}`);
      
      this._panel.webview.postMessage({
        command: 'setDeleteJsonPath',
        path: selectedPath
      });
      
      logger.info('[SelectDeleteJson] 已发送 setDeleteJsonPath 消息到 Webview');
    } else {
      logger.info('[SelectDeleteJson] 用户取消了选择');
    }
  }

  /**
   * 确认清除脚本
   */
  private async _confirmClearScripts(jsonPath: string) {
    const result = await vscode.window.showWarningMessage(
      '⚠️ 警告：此操作将删除服务器上指定的 Maximo 脚本！\n\n此操作不可恢复，确定要继续吗？',
      { modal: true },
      '确定',
      '取消'
    );
    
    if (result === '确定') {
      // 用户点击了确定，通知前端执行清除操作
      this._panel.webview.postMessage({
        command: 'executeClearScripts'
      });
    }
  }

  /**
   * 向工具箱输出日志
   */
  private _sendToolboxOutput(text: string) {
    this._panel.webview.postMessage({
      command: 'updateToolboxOutput',
      text: text
    });
  }

  /**
   * 通用的脚本部署方法（先查后改）
   * @param customFields 自定义字段对象，包含 autoscript、description、source 等
   * @returns 是否成功
   */
  private async _deployScript(
    customFields: any
  ): Promise<boolean> {
    try {
      var autoscript: string = customFields.autoscript;
      var description: string = customFields.description;
      var source: string = customFields.source;
      if (!autoscript || !source) {
        logger.error('[_deployScript] autoscript, source 缺少必要参数');
        return false;
      }
      if(!description){
        description=autoscript;
      }
      // 从配置中读取服务器信息
      const config = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = config.get<string>('serverUrl', '');
      const authType = config.get<string>('authType', 'maxauth');
      const maxauth = config.get<string>('maxauth', '');
      const apiKey = config.get<string>('apiKey', '');
      
      if (!serverUrl) {
        logger.error('[_deployScript] 服务器地址未配置');
        return false;
      }
      
      if (authType === 'maxauth' && !maxauth) {
        logger.error('[_deployScript] MAXAUTH 未配置');
        return false;
      }
      
      if (authType === 'apikey' && !apiKey) {
        logger.error('[_deployScript] API Key 未配置');
        return false;
      }
      
      // 步骤1: 检查脚本是否存在
      const checkUrl = `${serverUrl}/oslc/os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript&oslc.where=autoscript="${autoscript}"`;
      
      const checkResult = await httpRequestToMaximo({
        url: checkUrl,
        method: 'GET',
        headers: {
          ...(authType === 'maxauth' ? { 'MAXAUTH': maxauth } : { 'apiKey': apiKey })
        }
      });
      
      let scriptExists = false;
      let scriptHref = null;
      
      if (checkResult.status === 200 && checkResult.data) {
        const memberCount = checkResult.data.member ? checkResult.data.member.length : 0;
        if (memberCount === 1) {
          scriptExists = true;
          scriptHref = checkResult.data.member[0].href;
        }
      }
      
      // 步骤2: 决定使用创建还是更新
      let deployUrl: string;
      let deployMethod: 'POST' | 'PATCH' = 'POST';
      const deployHeaders: any = {
        'Content-Type': 'application/json',
        ...(authType === 'maxauth' ? { 'MAXAUTH': maxauth } : { 'apiKey': apiKey })
      };
      
      if (scriptExists && scriptHref) {
        // 更新现有脚本
        deployUrl = scriptHref;
        deployHeaders['Content-Type'] = 'application/merge-patch+json';
        deployHeaders['x-method-override'] = 'PATCH';
      } else {
        // 创建新脚本
        deployUrl = `${serverUrl}/oslc/os/MXAPIAUTOSCRIPT`;
      }
      
      // 步骤3: 构建请求体 - 遍历 customFields，将所有字段添加为 spi: 前缀
      const deployBody: any = {};
      
      // 遍历 customFields 对象的所有属性
      for (const key in customFields) {
        if (customFields.hasOwnProperty(key)) {
          // 跳过 autoscript、description、source 这三个特殊字段（它们会被单独处理）
          if (key.toLowerCase() === 'autoscript' || key.toLowerCase() === 'description' || key.toLowerCase() === 'source') {
            continue;
          }
          
          // 其他字段都添加 spi: 前缀
          const prefixedKey = `spi:${key.toLowerCase()}`;
          let value = customFields[key];
          
          // 如果是 source 字段，需要处理换行符
          if (key === 'source') {
            value = String(value).replace(/\r\n/g, '\n');
          }
          
          deployBody[prefixedKey] = value;
        }
      }
      
      // 确保必要的字段存在
      if (!deployBody['spi:autoscript']) {
        deployBody['spi:autoscript'] = autoscript;
      }
      if (!deployBody['spi:description']) {
        deployBody['spi:description'] = description;
      }
      if (!deployBody['spi:scriptlanguage']) {
        deployBody['spi:scriptlanguage'] = 'nashorn';
      }
      if (deployBody['spi:active'] === undefined) {
        deployBody['spi:active'] = true;
      }
      if (!deployBody['spi:source']) {
        deployBody['spi:source'] = source.replace(/\r\n/g, '\n');
      }
      
      // 步骤4: 发送请求
      const deployResult = await httpRequestToMaximo({
        url: deployUrl,
        method: deployMethod,
        headers: deployHeaders,
        data: deployBody
      });
      
      return deployResult.status === 200 || deployResult.status === 201 || deployResult.status === 204;
      
    } catch (error: any) {
      logger.error(`[_deployScript] 部署失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 清空工具箱输出
   */
  private _clearToolboxOutput() {
    this._panel.webview.postMessage({
      command: 'clearToolboxOutput'
    });
  }

  /**
   * 部署单个脚本文件
   */
  private async _deploySingleFile(filePath: string) {
    try {
      this._sendToolboxOutput(`🔄 开始导入脚本: ${filePath}`);
      
      await this._deploySingleFileInternal(filePath);
      
      this._sendToolboxOutput(`✅ 脚本部署完成`);
    } catch (error: any) {
      this._sendToolboxOutput(`❌ 部署失败: ${error.message}`);
      logger.error(`[DeployScript] 部署失败: ${error.message}`);
    } finally {
      this._panel.webview.postMessage({ command: 'deployScriptComplete' });
    }
  }

  /**
   * 部署目录下的所有脚本
   */
  private async _deployDirectory(directoryPath: string, recursive: boolean) {
    try {
      this._sendToolboxOutput(`🔄 开始批量导入脚本 from: ${directoryPath}`);
      
      // 查找所有 JSON 文件
      const jsonFiles = this._findJsonFiles(directoryPath, recursive);
      
      if (jsonFiles.length === 0) {
        this._sendToolboxOutput('⚠️ 未找到任何 JSON 配置文件');
        this._panel.webview.postMessage({ command: 'deployScriptComplete' });
        return;
      }

      this._sendToolboxOutput(`📋 找到 ${jsonFiles.length} 个配置文件`);

      // 逐个部署
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < jsonFiles.length; i++) {
        const filePath = jsonFiles[i];
        this._sendToolboxOutput(`\n[${i + 1}/${jsonFiles.length}] 处理: ${path.basename(filePath)}`);
        
        try {
          await this._deploySingleFileInternal(filePath);
          successCount++;
        } catch (error: any) {
          this._sendToolboxOutput(`❌ 失败: ${error.message}`);
          failCount++;
        }
      }

      this._sendToolboxOutput(`\n✅ 批量导入完成！成功: ${successCount}, 失败: ${failCount}`);
    } catch (error: any) {
      this._sendToolboxOutput(`❌ 批量导入失败: ${error.message}`);
      logger.error(`[DeployDirectory] 批量导入失败: ${error.message}`);
    } finally {
      this._panel.webview.postMessage({ command: 'deployScriptComplete' });
    }
  }

  /**
   * 查找目录下的所有 JSON 文件
   */
  private _findJsonFiles(dirPath: string, recursive: boolean): string[] {
    const jsonFiles: string[] = [];
    
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile() && entry.name.endsWith('.json')) {
          jsonFiles.push(fullPath);
        } else if (recursive && entry.isDirectory()) {
          jsonFiles.push(...this._findJsonFiles(fullPath, recursive));
        }
      }
    } catch (error: any) {
      logger.error(`[FindJsonFiles] 读取目录失败: ${error.message}`);
    }
    
    return jsonFiles;
  }

  /**
   * 内部部署方法（不发送完成消息）
   */
  private async _deploySingleFileInternal(filePath: string): Promise<void> {
    try {
      this._sendToolboxOutput(`🔄 开始导入脚本: ${filePath}`);

      // 读取 JSON 配置文件
      if (!fs.existsSync(filePath)) {
        this._sendToolboxOutput(`❌ 配置文件不存在: ${filePath}`);
        return;
      }

      const jsonContent = fs.readFileSync(filePath, 'utf-8');
      
      let config: any;
      try {
        config = JSON.parse(jsonContent);
      } catch (e: any) {
        this._sendToolboxOutput(`❌ JSON 解析失败: ${e.message}`);
        return;
      }

      // 检查必需字段
      const requiredFields = ['AUTOSCRIPT', 'DESCRIPTION', 'SCRIPTLANGUAGE'];
      const missingFields = requiredFields.filter((field: string) => !config[field]);
      if (missingFields.length > 0) {
        this._sendToolboxOutput(`❌ 配置文件缺少必需字段: ${missingFields.join(', ')}`);
        return;
      }

      // 获取脚本名和语言
      const autoScript = config.AUTOSCRIPT;
      const scriptLanguage = config.SCRIPTLANGUAGE.toLowerCase();
      const isPython = (scriptLanguage === 'python' || scriptLanguage === 'jython');
      const scriptExt = isPython ? '.py' : '.js';

      // 构建脚本文件路径（与 JSON 文件同目录同名）
      const dirPath = path.dirname(filePath);
      const scriptFileName = autoScript + scriptExt;
      const scriptFilePath = path.join(dirPath, scriptFileName);

      this._sendToolboxOutput(`🔍 查找脚本文件: ${scriptFilePath}`);

      // 检查脚本文件是否存在
      if (!fs.existsSync(scriptFilePath)) {
        this._sendToolboxOutput(`❌ 未找到脚本文件: ${scriptFileName}`);
        return;
      }

      const scriptContent = fs.readFileSync(scriptFilePath, 'utf-8');

      this._sendToolboxOutput(`📤 正在导入: ${autoScript}`);

      // 定义需要忽略的字段
      const ignoreFields = ['BINARYSCRIPTSOURCE', 'AUTOSCRIPTID'];

      // 构建自定义字段（从 JSON 配置中读取所有属性）
      const customFields: any = {};

      // 遍历 JSON 配置中的所有属性
      for (const [key, value] of Object.entries(config)) {
        // 如果字段在忽略列表中，则跳过
        if (ignoreFields.includes(key)) {
          continue;
        }

        if (key === 'SOURCE') {
          // SOURCE 字段使用脚本文件内容，不在这里设置
          continue;
        } else {
          // 将字段名转换为小写，以匹配 Maximo API 的要求
          customFields[key.toLowerCase()] = value;
        }
      }

      // 添加必要字段
      customFields.autoscript = autoScript;
      customFields.description = config.DESCRIPTION;
      customFields.source = scriptContent.replace(/\r\n/g, '\n');
      customFields.scriptlanguage = config.SCRIPTLANGUAGE;
      
      // 处理 ACTIVE 字段
      if (config.ACTIVE !== undefined) {
        customFields.active = config.ACTIVE === true || config.ACTIVE === 1 || config.ACTIVE === '1';
      } else {
        customFields.active = true; // 默认为 true
      }

      // 调用通用部署方法
      const deployResult = await this._deployScript(customFields);

      if (deployResult) {
        this._sendToolboxOutput(`✅ 导入成功: ${autoScript}`);
      } else {
        this._sendToolboxOutput(`❌ 导入失败: ${autoScript}`);
      }

    } catch (error: any) {
      logger.error(`[_deploySingleFileInternal] 部署失败: ${error.message}`);
      this._sendToolboxOutput(`❌ 部署出错: ${error.message}`);
    }
  }

  /**
   * 初始化工具脚本（简化版）
   */
  /**
   * 初始化 Maximo 开发工具脚本
   */
  private async _initScripts() {
    try {
      this._sendToolboxOutput('🚀 开始初始化 Maximo 开发工具脚本...');
      
      // 获取配置
      const config = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = config.get<string>('serverUrl', '');
      const authType = config.get<string>('authType', 'maxauth');
      const maxauth = config.get<string>('maxauth', '');
      const apiKey = config.get<string>('apiKey', '');
      
      if (!serverUrl) {
        this._sendToolboxOutput('❌ 请先在设置中配置服务器地址');
        return;
      }
      
      if (authType === 'maxauth' && !maxauth) {
        this._sendToolboxOutput('❌ 请先在设置中配置 MAXAUTH');
        return;
      }
      
      if (authType === 'apikey' && !apiKey) {
        this._sendToolboxOutput('❌ 请先在设置中配置 API Key');
        return;
      }
      
      // 获取扩展安装路径
      const scriptsDir = path.join(this._extensionUri.fsPath, 'public', 'maximo-developer-resources');
      
      this._sendToolboxOutput(`📂 脚本目录: ${scriptsDir}`);
      
      // 检查目录是否存在
      if (!fs.existsSync(scriptsDir)) {
        this._sendToolboxOutput(`❌ 脚本目录不存在: ${scriptsDir}`);
        return;
      }
      
      // 步骤1: 部署并执行 bootstrap 脚本（install）
      this._sendToolboxOutput('\n📦 步骤 1/2: 部署并执行 bootstrap 脚本...');
      
      const installFilePath = path.join(scriptsDir, 'sharptree.autoscript.install.js');
      if (!fs.existsSync(installFilePath)) {
        this._sendToolboxOutput(`❌ install 脚本不存在: ${installFilePath}`);
        return;
      }
      
      const installScriptContent = fs.readFileSync(installFilePath, 'utf-8');
      
      // 使用通用方法部署脚本
      const deploySuccess = await this._deployScript({
        autoscript: 'SHARPTREE.AUTOSCRIPT.INSTALL',
        description: 'Sharptree Automation Script Install Script',
        source: installScriptContent,
        scriptlanguage: 'nashorn',
        active: true
      });
      
      if (!deploySuccess) {
        this._sendToolboxOutput('❌ Bootstrap 脚本部署失败');
        return;
      }
      
      this._sendToolboxOutput('✅ Bootstrap 脚本部署成功');
      
      // 执行 bootstrap 脚本
      this._sendToolboxOutput('⚙️ 正在执行 bootstrap 脚本...');
      const execUrl = `${serverUrl}/oslc/script/sharptree.autoscript.install`;
      
      const execResult = await httpRequestToMaximo({
        url: execUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authType === 'maxauth' ? { 'MAXAUTH': maxauth } : { 'apiKey': apiKey })
        }
      });
      
      if (execResult.status !== 200) {
        this._sendToolboxOutput(`❌ Bootstrap 执行失败: HTTP ${execResult.status}`);
        this._sendToolboxOutput(`错误信息: ${JSON.stringify(execResult.data)}`);
        return;
      }
      
      this._sendToolboxOutput('✅ Bootstrap 脚本执行成功');
      
      // 步骤2: 部署其余脚本
      this._sendToolboxOutput('\n📦 步骤 2/2: 部署其他工具脚本...');
      
      const otherScripts = [
        { fileName: 'sharptree.autoscript.store.js', autoscript: 'SHARPTREE.AUTOSCRIPT.STORE', description: 'Sharptree Automation Script Storage Script' },
        { fileName: 'sharptree.autoscript.extract.js', autoscript: 'SHARPTREE.AUTOSCRIPT.EXTRACT', description: 'Sharptree Automation Script Extract Script' },
        { fileName: 'sharptree.autoscript.logging.js', autoscript: 'SHARPTREE.AUTOSCRIPT.LOGGING', description: 'Sharptree Automation Script Log Streaming' },
        { fileName: 'sharptree.autoscript.deploy.js', autoscript: 'SHARPTREE.AUTOSCRIPT.DEPLOY', description: 'Sharptree Automation Script Deploy Script' },
        { fileName: 'sharptree.autoscript.screens.js', autoscript: 'SHARPTREE.AUTOSCRIPT.SCREENS', description: 'Sharptree Screens Script' },
        { fileName: 'sharptree.autoscript.form.js', autoscript: 'SHARPTREE.AUTOSCRIPT.FORM', description: 'Sharptree Forms Script' },
        { fileName: 'sharptree.autoscript.library.js', autoscript: 'SHARPTREE.AUTOSCRIPT.LIBRARY', description: 'Sharptree Deployment Library Script' },
        { fileName: 'sharptree.autoscript.admin.js', autoscript: 'SHARPTREE.AUTOSCRIPT.ADMIN', description: 'Sharptree Admin Script' },
      ];
      
      let successCount = 0;
      let failCount = 0;
      const totalFiles = otherScripts.length;
      
      for (let i = 0; i < otherScripts.length; i++) {
        const script = otherScripts[i];
        const filePath = path.join(scriptsDir, script.fileName);
        
        try {
          this._sendToolboxOutput(`  [${i + 1}/${totalFiles}] 正在部署: ${script.fileName}`);
          
          if (!fs.existsSync(filePath)) {
            this._sendToolboxOutput(`  ⚠️ 文件不存在，跳过: ${script.fileName}`);
            failCount++;
            continue;
          }
          
          const scriptContent = fs.readFileSync(filePath, 'utf-8');
          
          // 使用通用方法部署脚本
          const deployResult = await this._deployScript({
            autoscript: script.autoscript,
            description: script.description,
            source: scriptContent,
            scriptlanguage: 'nashorn',
            active: true
          });
          
          if (deployResult) {
            successCount++;
            this._sendToolboxOutput(`  ✅ 部署成功: ${script.fileName}`);
          } else {
            failCount++;
            this._sendToolboxOutput(`  ❌ 部署失败: ${script.fileName}`);
          }
        } catch (error: any) {
          failCount++;
          this._sendToolboxOutput(`  ❌ 处理 ${script.fileName} 时出错: ${error.message}`);
        }
      }
      
      this._sendToolboxOutput(`\n🎉 初始化工具脚本完成！成功: ${successCount}, 失败: ${failCount}`);
      
    } catch (error: any) {
      this._sendToolboxOutput(`❌ 初始化过程出错: ${error.message}`);
      logger.error(`[InitScripts] 初始化失败: ${error.message}`);
    } finally {
      this._panel.webview.postMessage({ command: 'initScriptsComplete' });
    }
  }

  /**
   * 选择导出目录
   */
  private async _selectDirectoryForExtract() {
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: '选择导出目录'
    });

    if (result && result.length > 0) {
      this._panel.webview.postMessage({
        command: 'setExtractDirectoryPath',
        path: result[0].fsPath
      });
    }
  }

  /**
   * 导出 Maximo 脚本
   */
  private async _extractScripts(directoryPath: string) {
    try {
      this._sendToolboxOutput('📦 开始导出所有脚本...');

      // 获取配置
      const config = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = config.get<string>('serverUrl', '');
      const authType = config.get<string>('authType', 'maxauth');
      const maxauth = config.get<string>('maxauth', '');
      const apiKey = config.get<string>('apiKey', '');
      
      if (!serverUrl) {
        this._sendToolboxOutput('❌ 请先在设置中配置服务器地址');
        return;
      }
      
      if (authType === 'maxauth' && !maxauth) {
        this._sendToolboxOutput('❌ 请先在设置中配置 MAXAUTH');
        return;
      }
      
      if (authType === 'apikey' && !apiKey) {
        this._sendToolboxOutput('❌ 请先在设置中配置 API Key');
        return;
      }

      // 创建带日期时间的导出目录
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const backupDirName = `autoscript_backup_${dateStr}`;
      const backupDir = path.join(directoryPath, backupDirName);

      // 检查目录是否存在，不存在则创建
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      this._sendToolboxOutput(`📁 导出目录: ${backupDir}`);

      // 获取所有脚本名称
      const scriptsUrl = `${serverUrl}/oslc/script/GETAUTOSCRIPTNAMES`;
      
      const scriptsResult = await httpRequestToMaximo({
        url: scriptsUrl,
        method: 'GET',
        headers: {
          ...(authType === 'maxauth' ? { 'MAXAUTH': maxauth } : { 'apiKey': apiKey })
        }
      });

      if (scriptsResult.status !== 200 || !scriptsResult.data) {
        this._sendToolboxOutput(`❌ 获取脚本列表失败: HTTP ${scriptsResult.status}`);
        return;
      }

      // 解析脚本名称列表
      let scriptNames: any[];
      if (Array.isArray(scriptsResult.data)) {
        scriptNames = scriptsResult.data;
      } else if (scriptsResult.data.member && Array.isArray(scriptsResult.data.member)) {
        scriptNames = scriptsResult.data.member;
      } else {
        this._sendToolboxOutput('❌ 获取脚本列表失败，数据格式不正确');
        return;
      }

      this._sendToolboxOutput(`📋 共找到 ${scriptNames.length} 个脚本`);

      let successCount = 0;
      let failCount = 0;

      // 循环获取每个脚本的详情并保存
      for (let i = 0; i < scriptNames.length; i++) {
        const scriptInfo = scriptNames[i];
        const scriptName = scriptInfo.autoScript || scriptInfo['oslc:autoscript'] || scriptInfo.autoscript;

        if (!scriptName) {
          this._sendToolboxOutput(`⚠️ 跳过无效脚本 [${i + 1}]`);
          continue;
        }

        try {
          this._sendToolboxOutput(`[${i + 1}/${scriptNames.length}] 正在导出: ${scriptName}`);

          // 步骤1: 调用 SKS_GET_AUTOSCRIPTINFOBYNAME 获取元数据
          const metadataUrl = `script/SKS_GET_AUTOSCRIPTINFOBYNAME`;
          const metadataResult = await httpRequestToMaximo({
            url: metadataUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authType === 'maxauth' ? { 'MAXAUTH': maxauth } : { 'apiKey': apiKey })
            },
            data: { 'AUTOSCRIPT': scriptName }
          });

          if (metadataResult.status !== 200 || !metadataResult.data) {
            failCount++;
            this._sendToolboxOutput(`❌ 获取元数据失败: ${scriptName} - 状态码: ${metadataResult.status}`);
            continue;
          }

          // 解析返回的JSON数据
          let metadata: any;
          try {
            metadata = typeof metadataResult.data === 'string' ? JSON.parse(metadataResult.data) : metadataResult.data;
          } catch (parseErr: any) {
            failCount++;
            this._sendToolboxOutput(`❌ 解析元数据失败: ${scriptName} - ${parseErr.message}`);
            continue;
          }

          if (metadata.code !== 200 || !metadata.data) {
            failCount++;
            this._sendToolboxOutput(`❌ 元数据响应错误: ${scriptName} - ${metadata.message}`);
            continue;
          }

          const scriptData = metadata.data;

          // 步骤2: 调用 SKS_EXP_AUTOSCRIPTBYNAME 获取源代码
          const exportUrl = `${serverUrl}/oslc/script/SKS_EXP_AUTOSCRIPTBYNAME`;
          const exportResult = await httpRequestToMaximo({
            url: exportUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authType === 'maxauth' ? { 'MAXAUTH': maxauth } : { 'apiKey': apiKey })
            },
            data: { 'AUTOSCRIPT': scriptName }
          });

          if (exportResult.status === 200 && exportResult.data) {
            // 获取源代码
            let sourceCode = typeof exportResult.data === 'string' ? exportResult.data : JSON.stringify(exportResult.data);

            // 确定文件扩展名
            const scriptLanguage = (scriptData.SCRIPTLANGUAGE || 'javascript').toLowerCase();
            const extMap: Record<string, string> = {
              'javascript': 'js',
              'js': 'js',
              'python': 'py',
              'jython': 'py',
              'py': 'py',
              'json': 'json',
              'nashorn': 'js'
            };
            const ext = extMap[scriptLanguage] || 'txt';

            // 保存配置文件（JSON格式）
            const configFileName = `${scriptName}.json`;
            const configFilePath = path.join(backupDir, configFileName);
            fs.writeFileSync(configFilePath, JSON.stringify(scriptData, null, 2), 'utf-8');

            // 保存源代码文件
            const codeFileName = `${scriptName}.${ext}`;
            const codeFilePath = path.join(backupDir, codeFileName);
            fs.writeFileSync(codeFilePath, sourceCode, 'utf-8');

            successCount++;
            this._sendToolboxOutput(`✅ 已导出: ${scriptName} (${configFileName}, ${codeFileName})`);
          } else {
            failCount++;
            this._sendToolboxOutput(`❌ 导出源代码失败: ${scriptName} - 状态码: ${exportResult.status}`);
          }
        } catch (error: any) {
          failCount++;
          this._sendToolboxOutput(`❌ 导出异常: ${scriptName} - ${error.message}`);
        }
      }

      this._sendToolboxOutput(`\n🎉 导出完成！成功: ${successCount}, 失败: ${failCount}`);
      this._sendToolboxOutput(`📁 保存位置: ${backupDir}`);

    } catch (error: any) {
      logger.error(`[_extractScripts] 导出失败: ${error.message}`);
      this._sendToolboxOutput(`❌ 导出过程出错: ${error.message}`);
    } finally {
      this._panel.webview.postMessage({ command: 'extractScriptsComplete' });
    }
  }

  /**
   * 查询所有脚本
   */
  private async _queryScripts() {
    try {
      // 获取配置
      const config = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = config.get<string>('serverUrl', '');
      const authType = config.get<string>('authType', 'maxauth');
      const maxauth = config.get<string>('maxauth', '');
      const apiKey = config.get<string>('apiKey', '');
      
      if (!serverUrl) {
        this._panel.webview.postMessage({
          command: 'setScriptList',
          scripts: []
        });
        return;
      }
      
      if (authType === 'maxauth' && !maxauth) {
        this._panel.webview.postMessage({
          command: 'setScriptList',
          scripts: []
        });
        return;
      }
      
      if (authType === 'apikey' && !apiKey) {
        this._panel.webview.postMessage({
          command: 'setScriptList',
          scripts: []
        });
        return;
      }

      // 调用 GETAUTOSCRIPTNAMES 获取所有脚本名称
      const scriptsUrl = `script/GETAUTOSCRIPTNAMES`;
      
      const scriptsResult = await httpRequestToMaximo({
        url: scriptsUrl,
        method: 'GET',
        headers: {
          ...(authType === 'maxauth' ? { 'MAXAUTH': maxauth } : { 'apiKey': apiKey })
        }
      });

      if (scriptsResult.status !== 200 || !scriptsResult.data) {
        this._panel.webview.postMessage({
          command: 'setScriptList',
          scripts: []
        });
        return;
      }

      // 解析脚本名称列表
      let scriptNames: any[];
      if (Array.isArray(scriptsResult.data)) {
        scriptNames = scriptsResult.data;
      } else if (scriptsResult.data.member && Array.isArray(scriptsResult.data.member)) {
        scriptNames = scriptsResult.data.member;
      } else {
        this._panel.webview.postMessage({
          command: 'setScriptList',
          scripts: []
        });
        return;
      }

      // 提取脚本信息（只需要 autoscript 和 description）
      const scriptDetails: any[] = scriptNames.map((scriptInfo: any) => {
        return {
          AUTOSCRIPT: scriptInfo.autoScript || scriptInfo['oslc:autoscript'] || scriptInfo.autoscript || '',
          DESCRIPTION: scriptInfo.description || scriptInfo['oslc:description'] || ''
        };
      }).filter((script: any) => script.AUTOSCRIPT); // 过滤掉没有脚本名的项

      // 发送脚本列表到前端
      this._panel.webview.postMessage({
        command: 'setScriptList',
        scripts: scriptDetails
      });

    } catch (error: any) {
      logger.error(`[_queryScripts] 查询失败: ${error.message}`);
      this._panel.webview.postMessage({
        command: 'setScriptList',
        scripts: []
      });
    }
  }

  /**
   * 清除 Maximo 开发工具脚本
   */
  private async _clearScripts(jsonPath?: string) {
    try {
      this._sendToolboxOutput('🗑️ 开始清除 Maximo 脚本...');
      
      // 获取配置
      const config = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = config.get<string>('serverUrl', '');
      const authType = config.get<string>('authType', 'maxauth');
      const maxauth = config.get<string>('maxauth', '');
      const apiKey = config.get<string>('apiKey', '');
      const version = config.get<string>('version', '7.6');
      
      if (!serverUrl) {
        this._sendToolboxOutput('❌ 请先在设置中配置服务器地址');
        return;
      }
      
      if (authType === 'maxauth' && !maxauth) {
        this._sendToolboxOutput('❌ 请先在设置中配置 MAXAUTH');
        return;
      }
      
      if (authType === 'apikey' && !apiKey) {
        this._sendToolboxOutput('❌ 请先在设置中配置 API Key');
        return;
      }
      
      // 从 JSON 文件读取脚本列表
      let scriptsToDelete: string[] = [];
      
      if (jsonPath) {
        this._sendToolboxOutput(`📂 读取脚本列表文件: ${jsonPath}`);
        
        if (!fs.existsSync(jsonPath)) {
          this._sendToolboxOutput(`❌ JSON 文件不存在: ${jsonPath}`);
          return;
        }
        
        try {
          const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
          scriptsToDelete = JSON.parse(jsonContent);
          
          if (!Array.isArray(scriptsToDelete)) {
            this._sendToolboxOutput('❌ JSON 文件格式错误：必须是数组');
            return;
          }
          
          this._sendToolboxOutput(`✅ 成功读取 ${scriptsToDelete.length} 个脚本名称`);
        } catch (error: any) {
          this._sendToolboxOutput(`❌ 解析 JSON 文件失败: ${error.message}`);
          return;
        }
      } else {
        this._sendToolboxOutput('⚠️ 未提供 JSON 文件，使用默认脚本列表');
        // 默认脚本列表（保留作为备选）
        scriptsToDelete = [
          'SHARPTREE.AUTOSCRIPT.INSTALL',
          'SHARPTREE.AUTOSCRIPT.STORE',
          'SHARPTREE.AUTOSCRIPT.EXTRACT',
          'SHARPTREE.AUTOSCRIPT.LOGGING',
          'SHARPTREE.AUTOSCRIPT.DEPLOY',
          'SHARPTREE.AUTOSCRIPT.SCREENS',
          'SHARPTREE.AUTOSCRIPT.FORM',
          'SHARPTREE.AUTOSCRIPT.LIBRARY',
          'SHARPTREE.AUTOSCRIPT.ADMIN'
        ];
      }
      
      if (scriptsToDelete.length === 0) {
        this._sendToolboxOutput('⚠️ 脚本列表为空，无需删除');
        return;
      }
      
      this._sendToolboxOutput(`📋 找到 ${scriptsToDelete.length} 个脚本待删除`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < scriptsToDelete.length; i++) {
        const scriptName = scriptsToDelete[i].trim();
        
        if (!scriptName) {
          continue;
        }
        
        try {
          this._sendToolboxOutput(`  [${i + 1}/${scriptsToDelete.length}] 正在删除: ${scriptName}`);
          
          // 构建 scriptId (Base64 编码)
          const scriptId = '_' + Buffer.from(scriptName).toString('base64');
          
          // 确定使用的 API 端点
          const isMaximo91 = version === '9.1';
          const apiEndpoint = isMaximo91 ? 'MXSCRIPT' : 'AUTOSCRIPT';
          const deleteUrl = `${serverUrl}/api/os/${apiEndpoint}/${scriptId}${isMaximo91 ? '?lean=1' : ''}`;
          
          const deleteResult = await httpRequestToMaximo({
            url: deleteUrl,
            method: 'DELETE',
            headers: {
              ...(authType === 'maxauth' ? { 'MAXAUTH': maxauth } : { 'apiKey': apiKey })
            }
          });
          
          if (deleteResult.status === 204 || deleteResult.status === 200) {
            successCount++;
            this._sendToolboxOutput(`  ✅ 删除成功: ${scriptName}`);
          } else {
            failCount++;
            this._sendToolboxOutput(`  ❌ 删除失败: ${scriptName} - HTTP ${deleteResult.status}`);
          }
        } catch (error: any) {
          failCount++;
          this._sendToolboxOutput(`  ❌ 删除 ${scriptName} 时出错: ${error.message}`);
        }
      }
      
      this._sendToolboxOutput(`\n🎉 清除脚本完成！成功: ${successCount}, 失败: ${failCount}`);
      
    } catch (error: any) {
      this._sendToolboxOutput(`❌ 清除过程出错: ${error.message}`);
      logger.error(`[ClearScripts] 清除失败: ${error.message}`);
    } finally {
      this._panel.webview.postMessage({ command: 'clearScriptsComplete' });
    }
  }

  public dispose() {
    ConfigPanel.currentPanel = undefined;
    this._panel.dispose();
    
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
