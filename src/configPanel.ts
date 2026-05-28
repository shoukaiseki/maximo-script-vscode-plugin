import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { httpRequestToMaximo } from './httpRequest';
import * as envConfig from './envConfig';

// 创建日志输出通道
const logger = vscode.window.createOutputChannel('Maximo Script Helper', { log: true });

// Maximo API 路径常量

export class ConfigPanel {
  public static currentPanel: ConfigPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private readonly _extensionUri: vscode.Uri;

  /**
   * 向 Webview 发送消息（静态方法）
   */
  private static sendMessageToWebview(command: string, data?: any, useHtml: boolean = false) {
    if (ConfigPanel.currentPanel && ConfigPanel.currentPanel._panel) {
      ConfigPanel.currentPanel._panel.webview.postMessage({ command, useHtml, ...data });
    }
  }

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
          case 'pullScript':
            await this._pullScript(message.scriptName, message.storagePath);
            return;
          case 'loadLoggerConfig':
            await this._loadLoggerConfig();
            return;
          case 'saveLoggerConfig':
            await this._saveLoggerConfig(message.config);
            return;
          case 'queryLoggerLevel':
            await this._queryLoggerLevel(message.loggers);
            return;
          case 'updateLoggerLevel':
            await this._updateLoggerLevel(message.loggers);
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
          case 'loadEnvironmentConfig':
            // 加载指定环境的配置
            await this._loadEnvironmentConfig(message.envnum);
            return;
          case 'deleteEnvironment':
            // 删除指定环境
            await this._deleteEnvironment(message.envnum);
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
    
    logger.info(`[Webview] Script URI: ${scriptUri.toString()}`);
    logger.info(`[Webview] Style URI: ${styleUri.toString()}`);
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https: data: blob:; script-src 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval'; style-src vscode-resource: 'unsafe-inline' https:; font-src vscode-resource: https:;">
  <title>Maximo Script 配置</title>
  <link href="${styleUri}" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * 加载指定环境的配置
   */
  private async _loadEnvironmentConfig(envnum: string) {
    try {
      const envConfigData = envConfig.findEnvironment(envnum);
      
      if (!envConfigData) {
        logger.warn(`[EnvConfig] 环境配置不存在: ${envnum}`);
        this._panel.webview.postMessage({
          command: 'showMessage',
          type: 'warning',
          text: `环境配置 "${envnum}" 不存在`
        });
        return;
      }
      
      logger.info(`[EnvConfig] 加载环境配置: ${envnum}`);
      
      // 更新 VSCode 配置中的当前环境名称
      const config = vscode.workspace.getConfiguration('maximoScript');
      await config.update('envnum', envnum, vscode.ConfigurationTarget.Global);
      logger.info(`[EnvConfig] 已更新 VSCode 配置 envnum: ${envnum}`);
      
      // 发送环境配置到前端
      this._panel.webview.postMessage({
        command: 'loadEnvironmentConfig',
        data: envConfigData
      });
      
      vscode.window.showInformationMessage(`已加载环境配置: ${envnum}`);
    } catch (error: any) {
      logger.error(`[EnvConfig] 加载环境配置失败: ${error.message}`);
      vscode.window.showErrorMessage(`加载环境配置失败: ${error.message}`);
    }
  }

  private async _deleteEnvironment(envnum: string) {
    try {
      logger.info(`[EnvConfig] 删除环境配置: ${envnum}`);
      
      const deleteResult = envConfig.deleteEnvironment(envnum);
      
      if (deleteResult) {
        logger.info(`[EnvConfig] 环境配置已删除: ${envnum}`);
        
        // 刷新环境列表
        const envNames = envConfig.getEnvironmentNames();
        this._panel.webview.postMessage({
          command: 'updateEnvList',
          envList: envNames
        });
        
        vscode.window.showInformationMessage(`环境配置 "${envnum}" 已删除`);
      } else {
        logger.warn(`[EnvConfig] 环境配置不存在，无法删除: ${envnum}`);
        vscode.window.showWarningMessage(`环境配置 "${envnum}" 不存在`);
      }
    } catch (error: any) {
      logger.error(`[EnvConfig] 删除环境配置失败: ${error.message}`);
      vscode.window.showErrorMessage(`删除环境配置失败: ${error.message}`);
    }
  }

  private async _saveConfig(data: any) {
    try {
      const config = vscode.workspace.getConfiguration('maximoScript');
      
      console.log('[SaveConfig] 开始保存配置...');
      console.log('[SaveConfig] enableHttpLog:', data.enableHttpLog, '类型:', typeof data.enableHttpLog);
      console.log('[SaveConfig] localApiPath:', data.localApiPath);
      console.log('[SaveConfig] scriptStoragePath:', data.scriptStoragePath);
      console.log('[SaveConfig] aliasName:', data.aliasName);
      
      logger.info('[SaveConfig] 开始保存配置...');
      logger.info(`[SaveConfig] enableHttpLog: ${data.enableHttpLog}, 类型: ${typeof data.enableHttpLog}`);
      logger.info(`[SaveConfig] localApiPath: ${data.localApiPath}`);
      logger.info(`[SaveConfig] scriptStoragePath: ${data.scriptStoragePath}`);
      logger.info(`[SaveConfig] aliasName: ${data.aliasName}`);
      
      await config.update('serverUrl', data.serverUrl, vscode.ConfigurationTarget.Global);
      await config.update('authType', data.authType, vscode.ConfigurationTarget.Global);
      await config.update('maxauth', data.maxauth, vscode.ConfigurationTarget.Global);
      await config.update('apiKey', data.apiKey, vscode.ConfigurationTarget.Global);
      await config.update('apiType', data.apiType, vscode.ConfigurationTarget.Global);
      await config.update('version', data.version, vscode.ConfigurationTarget.Global);
      await config.update('completionMode', data.completionMode || 'vscode', vscode.ConfigurationTarget.Global);
      await config.update('localApiPath', data.localApiPath, vscode.ConfigurationTarget.Global);
      await config.update('scriptStoragePath', data.scriptStoragePath, vscode.ConfigurationTarget.Global);
      await config.update('aliasName', data.aliasName || '', vscode.ConfigurationTarget.Global);
      await config.update('exportDirectory', data.exportDirectory || '', vscode.ConfigurationTarget.Global);
      await config.update('envnum', data.envnum || 'default', vscode.ConfigurationTarget.Global);
      await config.update('enableJSDocParsing', data.enableJSDocParsing, vscode.ConfigurationTarget.Global);
      await config.update('enableTypeInference', data.enableTypeInference, vscode.ConfigurationTarget.Global);
      await config.update('enableHttpLog', Boolean(data.enableHttpLog), vscode.ConfigurationTarget.Global);
      await config.update('jdkPath', data.jdkPath, vscode.ConfigurationTarget.Global);
      await config.update('jarDirectories', data.jarDirectories || [], vscode.ConfigurationTarget.Global);
      await config.update('additionalJars', data.additionalJars || [], vscode.ConfigurationTarget.Global);
      
      // 验证保存结果
      const savedValue = config.get('enableHttpLog', false);
      const savedLocalApiPath = config.get('localApiPath', '');
      const savedScriptStoragePath = config.get('scriptStoragePath', 'masscript');
      console.log('[SaveConfig] 保存后读取 enableHttpLog:', savedValue);
      console.log('[SaveConfig] 保存后读取 localApiPath:', savedLocalApiPath);
      console.log('[SaveConfig] 保存后读取 scriptStoragePath:', savedScriptStoragePath);
      logger.info(`[SaveConfig] 保存后读取 enableHttpLog: ${savedValue}`);
      logger.info(`[SaveConfig] 保存后读取 localApiPath: ${savedLocalApiPath}`);
      logger.info(`[SaveConfig] 保存后读取 scriptStoragePath: ${savedScriptStoragePath}`);
      
      // 保存环境配置到 envs.json
      const envnum = data.envnum || 'default';
      const environmentConfig: envConfig.EnvironmentConfig = {
        envnum: envnum,
        serverUrl: data.serverUrl,
        authType: data.authType,
        maxauth: data.maxauth,
        apiKey: data.apiKey,
        apiType: data.apiType,
        version: data.version,
        completionMode: data.completionMode || 'vscode'
      };
      
      const saveResult = envConfig.upsertEnvironment(environmentConfig);
      if (saveResult) {
        logger.info(`[EnvConfig] 环境配置已保存到 envs.json: ${envnum}`);
        
        // 刷新环境列表
        const envNames = envConfig.getEnvironmentNames();
        this._panel.webview.postMessage({
          command: 'updateEnvList',
          envList: envNames
        });
      } else {
        logger.error(`[EnvConfig] 保存环境配置失败: ${envnum}`);
      }
      
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
      const { httpRequestToMaximo, clearJSESSIONID } = require('./extension');
      
      // 先清除 Cookie，避免使用旧的会话信息
      clearJSESSIONID();
      logger.info('[TestConnection] 已清除 JSESSIONID Cookie');
      
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
    
    // 加载环境列表
    const envNames = envConfig.getEnvironmentNames();
    const currentEnvnum = config.get('envnum', 'default');
    
    // 尝试从 envs.json 加载当前环境的配置
    let initialConfigData: any = {
      serverUrl: config.get('serverUrl', ''),
      authType: config.get('authType', 'maxauth'),
      maxauth: config.get('maxauth', ''),
      apiKey: config.get('apiKey', ''),
      apiType: config.get('apiType', 'oslc'),
      version: config.get('version', '7.6'),
      completionMode: config.get('completionMode', 'vscode'),
      localApiPath: config.get('localApiPath', ''),
      scriptStoragePath: config.get('scriptStoragePath', 'masscript'),
      aliasName: config.get('aliasName', ''),
      exportDirectory: config.get('exportDirectory', ''),
      enableJSDocParsing: config.get('enableJSDocParsing', true),
      enableTypeInference: config.get('enableTypeInference', true),
      enableHttpLog: config.get('enableHttpLog', false),
      jdkPath: config.get('jdkPath', ''),
      jarDirectories: config.get('jarDirectories', []),
      additionalJars: config.get('additionalJars', []),
      envnum: currentEnvnum,
      envList: envNames
    };
    
    // 如果当前环境存在于 envs.json 中，使用该环境的配置
    const envConfigData = envConfig.findEnvironment(currentEnvnum);
    if (envConfigData) {
      logger.info(`[ConfigPanel] 从 envs.json 加载环境配置: ${currentEnvnum}`);
      initialConfigData = {
        ...initialConfigData,
        serverUrl: envConfigData.serverUrl || initialConfigData.serverUrl,
        authType: envConfigData.authType || initialConfigData.authType,
        maxauth: envConfigData.maxauth || initialConfigData.maxauth,
        apiKey: envConfigData.apiKey || initialConfigData.apiKey,
        apiType: envConfigData.apiType || initialConfigData.apiType,
        version: envConfigData.version || initialConfigData.version,
        completionMode: envConfigData.completionMode || initialConfigData.completionMode
      };
    } else {
      logger.info(`[ConfigPanel] 环境配置不存在，使用 VSCode 配置: ${currentEnvnum}`);
    }
    
    logger.info(`[ConfigPanel] 发送初始配置到 Webview (当前环境: ${currentEnvnum}, 环境列表: ${envNames.length}个)`);
    
    this._panel.webview.postMessage({
      command: 'loadConfig',
      data: initialConfigData
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
  /**
   * 保存脚本历史记录
   */
  private async _saveScriptHistory(
    autoscript: string,
    source: string,
    serverUrl: string,
    authType: string,
    maxauth: string,
    apiKey: string,
    aliasName: string,
    scriptStoragePath: string
  ): Promise<void> {
    try {
      // 获取工作区根目录
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        logger.warn('[_saveScriptHistory] 未打开工作区，跳过版本管理');
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const jsonFilePath = path.join(workspaceRoot, scriptStoragePath || 'masscript', `${autoscript}.json`);

      let version = '1.0.1'; // 默认版本

      logger.debug(`[_saveScriptHistory] 正在检查 JSON 文件: ${jsonFilePath}`);
      // 检查 JSON 文件是否存在
      if (fs.existsSync(jsonFilePath)) {
        logger.debug(`[_saveScriptHistory] JSON 文件存在，正在读取: ${jsonFilePath}`);
        try {
          const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
          const jsonData = JSON.parse(fileContent);
          
          if (jsonData.version) {
            // 解析版本号，尝试递增最后一位
            const versionParts = jsonData.version.split('.');
            const lastPart = versionParts[versionParts.length - 1];
            
            // 检查最后一部分是否是数字
            if (/^\d+$/.test(lastPart)) {
              const newLastPart = parseInt(lastPart) + 1;
              versionParts[versionParts.length - 1] = newLastPart.toString();
              version = versionParts.join('.');
              
              // 更新 JSON 文件中的版本号
              jsonData.version = version;
              fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
              logger.info(`[_saveScriptHistory] 版本号已更新: ${jsonData.version} -> ${version}`);
            } else {
              version = jsonData.version;
              logger.info(`[_saveScriptHistory] 版本号最后一位不是数字，使用原版本: ${version}`);
            }
          }
        } catch (parseError: any) {
          logger.error(`[_saveScriptHistory] 解析 JSON 文件失败: ${parseError.message}`);
        }
      }

      // 获取本机主机名
      const hostname = require('os').hostname();

      // 调用保存历史记录 API
      const historyUrl = `${serverUrl}/api/script/SKS_AUTOSCRIPT_HISTORY_SAVE`;
      const historyResult = await httpRequestToMaximo({
        url: historyUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authType === 'maxauth' ? { 'MAXAUTH': maxauth } : { 'apiKey': apiKey })
        },
        data: {
          source: source,
          autoscript: autoscript,
          version: version,
          aliasname: aliasName || '',
          hostname: hostname
        }
      });

      if (historyResult.status === 200) {
        logger.info(`[_saveScriptHistory] 历史记录保存成功: ${autoscript} v${version}`);
      } else {
        logger.error(`[_saveScriptHistory] 历史记录保存失败: ${historyResult.status}`);
      }
    } catch (error: any) {
      logger.error(`[_saveScriptHistory] 保存历史记录异常: ${error.message}`);
      throw error; // 重新抛出，让调用者处理
    }
  }


  public static async checkConfig() {
      // 从配置中读取服务器信息
      const config = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = config.get<string>('serverUrl', '');
      const authType = config.get<string>('authType', 'maxauth');
      const maxauth = config.get<string>('maxauth', '');
      const apiKey = config.get<string>('apiKey', '');
      const aliasName = config.get<string>('aliasName', '');
      const scriptStoragePath = config.get<string>('scriptStoragePath', 'masscript');
      
      if (!serverUrl) {
        logger.error('[checkConfig] 服务器地址未配置');
        return false;
      }
      
      if (authType === 'maxauth' && !maxauth) {
        logger.error('[checkConfig] MAXAUTH 未配置');
        return false;
      }
      
      if (authType === 'apikey' && !apiKey) {
        logger.error('[checkConfig] API Key 未配置');
        return false;
      }
      return true;
  }

  /**
   * 推送脚本到 Maximo（公共静态方法,供 extension.ts 调用）
   * @returns { success: boolean, errorMessage?: string }
   */
  public static async pushScriptToMaximo(
    autoscript: string,
    source: string,
    logger: vscode.LogOutputChannel,
    filePath?: string  // 可选：脚本文件的完整路径
  ): Promise<{ success: boolean; errorMessage?: string }> {
    logger.debug(`[pushScriptToMaximo] ------------------- 开始推送脚本: ${autoscript} -------------------`);
    try {
      if (!autoscript || !source) {
        const errorMsg = '[_deployScript] autoscript, source 缺少必要参数';
        logger.error(errorMsg);
        ConfigPanel.sendMessageToWebview('pushScriptError', { error: errorMsg });
        return { success: false, errorMessage: errorMsg };
      }
      // 从配置中读取服务器信息
      const config = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = config.get<string>('serverUrl', '');
      const authType = config.get<string>('authType', 'maxauth');
      const maxauth = config.get<string>('maxauth', '');
      const apiKey = config.get<string>('apiKey', '');
      const aliasName = config.get<string>('aliasName', '');
      const scriptStoragePath = config.get<string>('scriptStoragePath', 'masscript');
      
      if(!this.checkConfig()){
        const errorMsg = '配置不完整，请先在配置面板中设置服务器信息';
        logger.error(errorMsg);
        ConfigPanel.sendMessageToWebview('pushScriptError', { error: errorMsg });
        return { success: false, errorMessage: errorMsg };
      }
      var historyResult: { version: string; logLevel: any } = { version: '', logLevel: undefined };
      // 步骤0: 保存历史记录（失败只记录日志，继续执行）
      let version: string | undefined;
      try {
        logger.debug(`[pushScriptToMaximo] 正在保存历史记录: ${autoscript}, filePath: ${filePath || '未提供'}, storagePath: ${scriptStoragePath}`);
        historyResult = await ConfigPanel._saveScriptHistoryStatic(autoscript, source, serverUrl, authType, maxauth, apiKey, aliasName, scriptStoragePath, logger, filePath);
        version = historyResult.version;
        logger.info(`[pushScriptToMaximo] 获取版本号: ${version}`);
      } catch (historyError: any) {
        logger.error(`[pushScriptToMaximo] 保存历史记录失败: ${historyError.message}`);
      }
      
      // 步骤1: 检查脚本是否存在
      const checkUrl = `os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript&oslc.where=autoscript="${autoscript}"`;
      
      const checkResult = await httpRequestToMaximo({
        url: checkUrl,
        method: 'GET'
      });
      
      
      if (checkResult.status === 200 && checkResult.data) {
        const memberCount = checkResult.data.member ? checkResult.data.member.length : 0;
        if (memberCount === 0) {
        const errorMsg = '脚本不存在,需要先新建,或者导入';
        logger.error(errorMsg);
        ConfigPanel.sendMessageToWebview('pushScriptError', { error: errorMsg });
        return { success: false, errorMessage: errorMsg };
        }
      }else{
        console.log(checkResult);
        logger.info(`[PushScript] 检查脚本结果: ${JSON.stringify(checkResult.data)}`);
        const errorMsg = `检查脚本失败: ${checkResult.status}`;
        ConfigPanel.sendMessageToWebview('pushScriptError', { error: errorMsg });
        return { success: false, errorMessage: errorMsg };
      }
      
      // 步骤2: 决定使用创建还是更新
      let deployUrl:string;
      let deployMethod: 'POST'|'PATCH' = 'POST';
      
        // 更新现有脚本
      deployUrl = `os/MXSCRIPT/_${Buffer.from(autoscript).toString('base64')}`;
      deployMethod = 'POST';
      
      // 步骤3: 构建请求体 - 遍历 customFields，将所有字段添加为 spi: 前缀
      const deployBody: any = {};
      
      
      // 确保必要的字段存在
      if (!deployBody['spi:autoscript']) {
        deployBody['spi:autoscript'] = autoscript;
      }
      if (!deployBody['spi:source']) {
        deployBody['spi:source'] = source.replace(/\r\n/g, '\n');
      }
      // 如果 version 存在，添加 version 字段
      if (version) {
        deployBody['spi:version'] = version;
        logger.info(`[pushScriptToMaximo] 推送脚本时包含版本号: ${version}`);
      }
      if (historyResult&&historyResult.logLevel!=undefined&&historyResult.logLevel!=null&&historyResult.logLevel!='') {
        deployBody['spi:loglevel'] = historyResult.logLevel;
      }
      
      // 步骤4: 发送请求
      const deployResult = await httpRequestToMaximo({
        url: deployUrl,
        method: deployMethod,
        headers: {
          'x-method-override': 'PATCH'
        },
        data: deployBody

      });
      if(deployResult.data&&deployResult.data.status&&deployResult.data.status==='error'){
        const errorMsgText = `[pushScriptToMaximo] ❌ 部署失败: ${deployResult.data.status} ${JSON.stringify(deployResult.data.message)}`;
        logger.error(errorMsgText);
        // 前端 Webview 使用 HTML 格式，后端通知使用纯文本格式
        ConfigPanel.sendMessageToWebview('pushXmlError', { error: errorMsgText }, true);
        return { success: false, errorMessage: errorMsgText };
      }
      if(deployResult.status === 200 || deployResult.status === 201 || deployResult.status === 204){
        return { success: true }
      }else{
        console.error(deployResult);
        const errorMsg = `部署失败: ${deployResult.status} ${JSON.stringify(deployResult.data)}`;
        logger.error(`[pushScriptToMaximo] ❌ ${errorMsg}`);
        ConfigPanel.sendMessageToWebview('pushScriptError', { error: errorMsg });
        return { success: false, errorMessage: errorMsg }
      }
      
      
    } catch (error: any) {
      console.log(error);
      const errorMsg = `[_deployScript] 部署失败: ${error.message}`;
      logger.error(errorMsg);
      ConfigPanel.sendMessageToWebview('pushScriptError', { error: errorMsg });
      return { success: false, errorMessage: errorMsg };
    }
  }

  /**
   * 推送 XML 文件到 Maximo（静态方法，供 extension.ts 调用）
   * @returns { success: boolean, errorMessage?: string }
   */
  public static async pushXmlToMaximo(
    xmlContent: string,
    logger: vscode.LogOutputChannel
  ): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      // 从配置中读取服务器信息
      const config = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = config.get<string>('serverUrl', '');
      const maxauth = config.get<string>('maxauth', '');
      const apiKey = config.get<string>('apiKey', '');
      const aliasName = config.get<string>('aliasName', '');
      const scriptStoragePath = config.get<string>('scriptStoragePath', 'masscript');
      
      if (!serverUrl) {
        logger.error('[checkConfig] 服务器地址未配置');
        const errorMsg = '服务器地址未配置';
        ConfigPanel.sendMessageToWebview('pushXmlError', { error: errorMsg });
        return { success: false, errorMessage: errorMsg };
      }
      
      if (!maxauth) {
        logger.error('[checkConfig] MAXAUTH 未配置');
        const errorMsg = 'MAXAUTH 未配置,推送应用xml需要使用MAXAUTH';
        ConfigPanel.sendMessageToWebview('pushXmlError', { error: errorMsg });
        return { success: false, errorMessage: errorMsg };
      }
      

      logger.info('[pushXmlToMaximo] 开始推送 XML...');

      // 直接调用 SHARPTREE.AUTOSCRIPT.SCREENS API
      const deployUrl = `script/SHARPTREE.AUTOSCRIPT.SCREENS`;
      
      const deployResult = await httpRequestToMaximo({
        url: deployUrl,
        method: 'POST',
        noAuth: true,
        authTypeIn: 'maxauth',
        headers: {
          'Content-Type': 'application/xml',
        },
        data: xmlContent,
        logger: logger
      });
      if(deployResult.data&&deployResult.data.status&&deployResult.data.status==='error'){
        const errorMsgHtml = [`[pushXmlToMaximo] ❌ 部署失败: ${deployResult.data.status} ${JSON.stringify(deployResult.data.message)}
`,`
💡 提示：
`,`
1. 推送应用 XML 需要使用 MAXAUTH 授权方式
`,`
2. 如果之前使用过 API Key，请点击"测试连接"清除 Cookie 缓存`];
        const errorMsgText = `[pushXmlToMaximo] ❌ 部署失败: ${deployResult.data.status} ${JSON.stringify(deployResult.data.message)}

💡 提示：
1. 推送应用 XML 需要使用 MAXAUTH 授权方式
2. 如果之前使用过 API Key，请点击"测试连接"清除 Cookie 缓存`;
        logger.error(errorMsgText);
        // 前端 Webview 使用 HTML 格式，后端通知使用纯文本格式
        ConfigPanel.sendMessageToWebview('pushXmlError', { error: errorMsgHtml }, true);
        return { success: false, errorMessage: errorMsgText };
      }

      if (deployResult.status === 200 || deployResult.status === 201 || deployResult.status === 204) {
        logger.info('[pushXmlToMaximo] ✅ XML 推送成功');
        ConfigPanel.sendMessageToWebview('pushXmlSuccess', { message: 'XML 推送成功' });
        return { success: true };
      } else {
        const errorMsg = `[pushXmlToMaximo] ❌ 部署失败: ${deployResult.status} ${JSON.stringify(deployResult.data)}`;
        logger.error(errorMsg);
        ConfigPanel.sendMessageToWebview('pushXmlError', { error: errorMsg });
        return { success: false, errorMessage: errorMsg };
      }
    } catch (error: any) {
      logger.error(error)
      const errorMsg = `[pushXmlToMaximo] ❌ 推送失败: ${error.message}`;
      logger.error(errorMsg);
      ConfigPanel.sendMessageToWebview('pushXmlError', { error: errorMsg });
      return { success: false, errorMessage: errorMsg };
    }
  }

  /**
   * 保存脚本历史记录（静态版本，供 extension.ts 调用）
   */
  private static async _saveScriptHistoryStatic(
    autoscript: string,
    source: string,
    serverUrl: string,
    authType: string,
    maxauth: string,
    apiKey: string,
    aliasName: string,
    scriptStoragePath: string,
    logger: vscode.LogOutputChannel,
    filePath?: string  // 可选：脚本文件的完整路径
  ): Promise<{ version: string; logLevel: any }> {
    let version: string = '1.0.1'; // 默认版本
    
    try {
      let jsonFilePath: string;

      // 如果提供了文件路径，使用文件所在目录；否则使用配置的 storagePath
      if (filePath) {
        const fileDir = path.dirname(filePath);
        jsonFilePath = path.join(fileDir, `${autoscript}.json`);
        logger.debug(`[_saveScriptHistory] 使用脚本所在目录: ${fileDir}`);
      } else {
        // 获取工作区根目录
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          logger.warn('[_saveScriptHistory] 未打开工作区，跳过版本管理');
          return { version: '', logLevel: undefined };
        }
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        jsonFilePath = path.join(workspaceRoot, scriptStoragePath || 'masscript', `${autoscript}.json`);
        logger.debug(`[_saveScriptHistory] 使用配置的存储路径: ${scriptStoragePath}`);
      }

      var loglevel = undefined;
      logger.debug(`[_saveScriptHistory] 正在检查 JSON 文件: ${jsonFilePath}`);
      // 检查 JSON 文件是否存在
      if (fs.existsSync(jsonFilePath)) {
        logger.debug(`[_saveScriptHistory] JSON 文件存在，正在读取: ${jsonFilePath}`);
        try {
          const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
          const jsonData = JSON.parse(fileContent);
          if(jsonData&&jsonData.loglevel!==undefined&&jsonData.loglevel!==null&&jsonData.loglevel!==''){
            loglevel = jsonData.loglevel
          }
          
          if (jsonData.version) {
            version = jsonData.version;
            logger.debug(`[_saveScriptHistory] 当前版本: ${version}`);
            
            // 检查最后一个 '.' 后面的字符是否是数字
            const parts = version.split('.');
            const lastPart = parts[parts.length - 1];
            
            if (/^\d+$/.test(lastPart)) {
              // 是数字，递增
              const newNumber = parseInt(lastPart) + 1;
              parts[parts.length - 1] = newNumber.toString();
              version = parts.join('.');
              
              // 写回 JSON 文件
              jsonData.version = version;
              fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
              logger.info(`[_saveScriptHistory] 版本号已更新: ${version}`);
            } else {
              logger.debug(`[_saveScriptHistory] 版本号最后一部分不是数字，保持原版本: ${version}`);
            }
          }
        } catch (parseError: any) {
          logger.error(`[_saveScriptHistory] 解析 JSON 文件失败: ${parseError.message}`);
        }
      } else {
        logger.debug(`[_saveScriptHistory] JSON 文件不存在，使用默认版本: ${version}`);
      }

      // 获取本机主机名
      const os = require('os');
      const hostname = os.hostname();

      // 构建历史记录请求
      const historyUrl = `${serverUrl}/api/script/SKS_AUTOSCRIPT_HISTORY_SAVE`;
      const historyBody = {
        source: source,
        autoscript: autoscript,
        version: version,
        aliasname: aliasName || '',
        hostname: hostname
      };

      logger.debug(`[_saveScriptHistory] 正在保存历史记录: ${autoscript}, 版本: ${version}, 主机名: ${hostname}`);

      // 发送请求
      const result = await httpRequestToMaximo({
        url: historyUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authType === 'maxauth' ? { 'MAXAUTH': maxauth } : { 'apiKey': apiKey })
        },
        data: historyBody
      });

      if (result.status === 200 || result.status === 201) {
        logger.info(`[_saveScriptHistory] ✅ 历史记录保存成功: ${autoscript} v${version}`);
      } else {
        logger.error(`[_saveScriptHistory] 历史记录保存失败，状态码: ${result.status}`);
      }
    } catch (error: any) {
      logger.error(`[_saveScriptHistory] 保存历史记录异常: ${error.message}`);
      throw error; // 重新抛出异常，让调用者处理
    }
    return {
      version: version,
      logLevel: loglevel
    };
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
      const checkUrl = `os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript&oslc.where=autoscript="${autoscript}"`;
      
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
        deployUrl = `os/MXAPIAUTOSCRIPT`;
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
      const requiredFields = ['autoscript', 'description', 'scriptlanguage'];
      const missingFields = requiredFields.filter((field: string) => !config[field]);
      if (missingFields.length > 0) {
        this._sendToolboxOutput(`❌ 配置文件缺少必需字段: ${missingFields.join(', ')}`);
        return;
      }

      // 获取脚本名和语言
      const autoScript = config.autoscript;
      const scriptLanguage = config.scriptlanguage.toLowerCase();
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
      customFields.description = config.description;
      customFields.source = scriptContent.replace(/\r\n/g, '\n');
      customFields.scriptlanguage = config.scriptlanguage;
      
      // 处理 ACTIVE 字段
      if (config.active !== undefined) {
        customFields.active = config.active === true || config.active === 1 || config.active === '1';
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
      const execUrl = `${serverUrl}/api/script/sharptree.autoscript.install`;
      
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
      
      interface ScriptInfo {
        _fileName: string;
        autoscript: string;
        description: string;
        version: string;
        scriptlanguage: string;
        _sourceDir: string;  // 记录脚本来源目录
      }
      
      const otherScripts: ScriptInfo[] = [];
      
      // 定义要扫描的目录列表
      const scanDirs = [
        { path: scriptsDir, name: '主目录' },
        { path: path.join(scriptsDir, '..', 'sks_tooljs'), name: 'sks_tooljs' }
      ];
      
      
      for (const dir of scanDirs) {
      this._sendToolboxOutput(`📂 脚本目录: ${dir.path}`);
        try {
          // 检查目录是否存在
          if (!fs.existsSync(dir.path)) {
            this._sendToolboxOutput(`  ⚠️ 目录不存在，跳过: ${dir.name} (${dir.path})`);
            continue;
          }
          
          // 读取目录下的所有 JSON 文件
          const jsonFiles = fs.readdirSync(dir.path).filter(f => f.endsWith('.json'));
          this._sendToolboxOutput(`  📋 ${dir.name}: 找到 ${jsonFiles.length} 个脚本配置文件`);
          
          for (const jsonFile of jsonFiles) {
            try {
              const jsonPath = path.join(dir.path, jsonFile);
              const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
              const jsonData = JSON.parse(jsonContent);
              
              // 从 JSON 文件中获取 autoscript 和 description
              if (jsonData.autoscript && jsonData.description) {
                // 对应的 .js 文件名
                const jsFileName = jsonFile.replace('.json', '.js');
                
                otherScripts.push({
                  _fileName: jsFileName,
                  autoscript: jsonData.autoscript,
                  description: jsonData.description,
                  version: jsonData.version,
                  scriptlanguage: jsonData.scriptlanguage,
                  _sourceDir: dir.path
                });
              }
            } catch (error: any) {
              this._sendToolboxOutput(`  ⚠️ 解析 ${jsonFile} 失败: ${error.message}`);
            }
          }
        } catch (error: any) {
          this._sendToolboxOutput(`  ⚠️ 扫描 ${dir.name} 目录失败: ${error.message}`);
        }
      }
      
      if (otherScripts.length === 0) {
        this._sendToolboxOutput('  ⚠️ 未找到有效的脚本配置');
        return;
      }
      
      this._sendToolboxOutput(`  ✅ 共准备部署 ${otherScripts.length} 个脚本\n`);
      
      let successCount = 0;
      let failCount = 0;
      const totalFiles = otherScripts.length;
      
      for (let i = 0; i < otherScripts.length; i++) {
        const script = otherScripts[i];
        // 使用脚本来源目录构建完整路径
        const filePath = path.join(script._sourceDir, script._fileName);
        
        try {
          this._sendToolboxOutput(`  [${i + 1}/${totalFiles}] 正在部署: ${script._fileName}`);
          
          if (!fs.existsSync(filePath)) {
            this._sendToolboxOutput(`  ⚠️ 文件不存在，跳过: ${script._fileName}`);
            failCount++;
            continue;
          }
          
          const scriptContent = fs.readFileSync(filePath, 'utf-8');
          
          // 使用通用方法部署脚本
          const deployResult = await this._deployScript({
            autoscript: script.autoscript,
            description: script.description,
            version: script.version,
            scriptlanguage: script.scriptlanguage,
            source: scriptContent,
            active: true
          });
          
          if (deployResult) {
            successCount++;
            this._sendToolboxOutput(`  ✅ 部署成功: ${script._fileName}`);
          } else {
            failCount++;
            this._sendToolboxOutput(`  ❌ 部署失败: ${script._fileName}`);
          }
        } catch (error: any) {
          failCount++;
          this._sendToolboxOutput(`  ❌ 处理 ${script._fileName} 时出错: ${error.message}`);
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
      const exportPath = result[0].fsPath;
      
      // 保存到 VSCode 配置（持久化）
      const config = vscode.workspace.getConfiguration('maximoScript');
      await config.update('exportDirectory', exportPath, vscode.ConfigurationTarget.Global);
      
      logger.info(`[ExportDirectory] 导出目录已保存: ${exportPath}`);
      
      this._panel.webview.postMessage({
        command: 'setExtractDirectoryPath',
        path: exportPath
      });
      
      this._panel.webview.postMessage({
        command: 'showMessage',
        type: 'success',
        text: '导出目录已保存'
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
      const scriptsUrl = `script/SKS_GET_AUTOSCRIPTNAMES`;
      
      const scriptsResult = await httpRequestToMaximo({
        url: scriptsUrl,
        method: 'GET'
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
              'Content-Type': 'application/json'
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
          const exportUrl = `script/SKS_EXP_AUTOSCRIPTBYNAME`;
          const exportResult = await httpRequestToMaximo({
            url: exportUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
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

      // 调用 SKS_GET_AUTOSCRIPTNAMES 获取所有脚本名称
      const scriptsUrl = `script/SKS_GET_AUTOSCRIPTNAMES`;
      
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
   * Pull 单个脚本到本地目录
   */
  private async _pullScript(scriptName: string, storagePath: string) {
    try {
      // 获取配置
      const config = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = config.get<string>('serverUrl', '');
      const authType = config.get<string>('authType', 'maxauth');
      const maxauth = config.get<string>('maxauth', '');
      const apiKey = config.get<string>('apiKey', '');
      
      if (!serverUrl) {
        vscode.window.showErrorMessage('请先在设置中配置服务器地址');
        return;
      }
      
      if (authType === 'maxauth' && !maxauth) {
        vscode.window.showErrorMessage('请先在设置中配置 MAXAUTH');
        return;
      }
      
      if (authType === 'apikey' && !apiKey) {
        vscode.window.showErrorMessage('请先在设置中配置 API Key');
        return;
      }

      // 获取工作区根目录
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('未打开工作区');
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      let targetDir = path.join(workspaceRoot, storagePath || 'masscript');

      // 先获取接口 JSON 数据（元数据）
      const metadataUrl = `script/SKS_GET_AUTOSCRIPTINFOBYNAME`;
      const metadataResult = await httpRequestToMaximo({
        url: metadataUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: { 'AUTOSCRIPT': scriptName }
      });

      if (metadataResult.status !== 200 || !metadataResult.data) {
        vscode.window.showErrorMessage(`获取脚本元数据失败: ${scriptName}`);
        return;
      }

      // 解析返回的 JSON 数据
      let metadata: any;
      try {
        metadata = typeof metadataResult.data === 'string' ? JSON.parse(metadataResult.data) : metadataResult.data;
      } catch (parseErr: any) {
        vscode.window.showErrorMessage(`解析元数据失败: ${parseErr.message}`);
        return;
      }

      // 调试：打印实际响应结构
      logger.debug(`[_pullScript] 元数据响应: ${JSON.stringify(metadata, null, 2)}`);

      // SKS_GET_AUTOSCRIPTINFOBYNAME 返回格式: { code: 200, data: {...} }
      if (metadata.code !== 200 || !metadata.data) {
        vscode.window.showErrorMessage(`元数据响应错误: ${metadata.message || '未知错误'}\n响应数据: ${JSON.stringify(metadata)}`);
        return;
      }

      const scriptData = metadata.data;

      // 如果 ibm_packagepath 存在且不为空，则追加到目标目录
      const packagePath = scriptData.ibm_packagepath;
      if (packagePath && packagePath.trim() !== '') {
        // 将点号替换为斜杠（例如：com.example.script -> com/example/script）
        const packageDir = packagePath.replace(/\./g, '/');
        targetDir = path.join(targetDir, packageDir);
        logger.info(`[_pullScript] 使用 ibm_packagepath: ${packagePath}, 目标目录: ${targetDir}`);
      }

      // 确保目标目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        logger.info(`[_pullScript] 创建目录: ${targetDir}`);
      }

      // 检查 JSON 文件是否已存在
      const jsonFilePath = path.join(targetDir, `${scriptName}.json`);
      const fileExists = fs.existsSync(jsonFilePath);

      if (fileExists) {
        // 询问是否覆盖
        const result = await vscode.window.showWarningMessage(
          `文件 ${scriptName}.json 已存在，是否覆盖？`,
          { modal: true },
          '覆盖',
          '取消'
        );
        
        if (result !== '覆盖') {
          logger.info(`[_pullScript] 用户取消覆盖: ${scriptName}`);
          return; // 用户取消
        }
      }

      // 用户同意后才将内容写入 JSON 文件
      fs.writeFileSync(jsonFilePath, JSON.stringify(scriptData, null, 2), 'utf-8');
      logger.info(`[_pullScript] 已保存 JSON 文件: ${jsonFilePath}`);

      // 再拉取脚本文件（源代码）

      // 调用 SKS_EXP_AUTOSCRIPTBYNAME 获取源代码
      const exportUrl = `script/SKS_EXP_AUTOSCRIPTBYNAME`;
      const exportResult = await httpRequestToMaximo({
        url: exportUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: { 'AUTOSCRIPT': scriptName }
      });

      if (exportResult.status !== 200 || !exportResult.data) {
        vscode.window.showErrorMessage(`导出源代码失败: ${scriptName}`);
        return;
      }

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
      const configFilePath = path.join(targetDir, configFileName);
      fs.writeFileSync(configFilePath, JSON.stringify(scriptData, null, 2), 'utf-8');

      // 保存源代码文件
      const codeFileName = `${scriptName}.${ext}`;
      const codeFilePath = path.join(targetDir, codeFileName);
      fs.writeFileSync(codeFilePath, sourceCode, 'utf-8');

      vscode.window.showInformationMessage(`✅ 脚本已导出: ${configFileName}, ${codeFileName}`);

    } catch (error: any) {
      logger.error(`[_pullScript] 导出失败: ${error.message}`);
      vscode.window.showErrorMessage(`导出脚本失败: ${error.message}`);
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

  // ==================== 日志管理相关方法 ====================

  /**
   * 加载本地日志配置
   */
  private async _loadLoggerConfig() {
    try {
      const configPath = this._getLoggerConfigPath();
      
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        this._panel.webview.postMessage({
          command: 'loggerConfigLoaded',
          config: config
        });
        logger.debug(`[Logger] 配置已加载: ${configPath}`);
      } else {
        // 文件不存在，返回空数组
        this._panel.webview.postMessage({
          command: 'loggerConfigLoaded',
          config: []
        });
        logger.debug('[Logger] 配置文件不存在，返回空配置');
      }
    } catch (error: any) {
      logger.error(`[Logger] 加载配置失败: ${error.message}`);
      this._panel.webview.postMessage({
        command: 'loggerConfigLoaded',
        config: [],
        error: error.message
      });
    }
  }

  /**
   * 保存日志配置到本地
   */
  private async _saveLoggerConfig(config: any[]) {
    try {
      const configPath = this._getLoggerConfigPath();
      const configDir = path.dirname(configPath);
      
      // 确保目录存在
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.info(`[Logger] 配置已保存: ${configPath}`);
      
      this._panel.webview.postMessage({
        command: 'loggerConfigSaved',
        success: true
      });
    } catch (error: any) {
      logger.error(`[Logger] 保存配置失败: ${error.message}`);
      this._panel.webview.postMessage({
        command: 'loggerConfigSaved',
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 查询日志级别
   */
  private async _queryLoggerLevel(loggers: any[]) {
    try {
      const config = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = config.get('serverUrl', '');
      const authType = config.get('authType', 'maxauth');
      const maxauth = config.get('maxauth', '');
      const apiKey = config.get('apiKey', '');
      
      const result = await httpRequestToMaximo({
        url: 'script/SKS_LOGGER_LEVEL_QUERY',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: { loggers: loggers || [] }
      });
      
      if (result.status === 200 && result.data.success) {
        this._panel.webview.postMessage({
          command: 'loggerQueryResult',
          result: result.data.result
        });
        logger.info(`[Logger] 查询成功，返回 ${result.data.result?.length || 0} 条记录`);
      } else {
        throw new Error(result.data?.message || '查询失败');
      }
    } catch (error: any) {
      logger.error(`[Logger] 查询失败: ${error.message}`);
      this._panel.webview.postMessage({
        command: 'loggerQueryResult',
        result: [],
        error: error.message
      });
    }
  }

  /**
   * 更新日志级别
   */
  private async _updateLoggerLevel(loggers: any[]) {
    try {
      const config = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = config.get('serverUrl', '');
      const authType = config.get('authType', 'maxauth');
      const maxauth = config.get('maxauth', '');
      const apiKey = config.get('apiKey', '');
      
      const result = await httpRequestToMaximo({
        url: 'script/SKS_LOGGER_LEVEL_UPDATE',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: { loggers }
      });
      
      if (result.status === 200 && result.data.success) {
        this._panel.webview.postMessage({
          command: 'loggerUpdateResult',
          success: true,
          message: result.data.message || '日志级别更新成功',
          result: result.data.result
        });
        logger.info(`[Logger] 更新成功: ${result.data.message}`);
      } else {
        throw new Error(result.data?.message || '更新失败');
      }
    } catch (error: any) {
      logger.error(`[Logger] 更新失败: ${error.message}`);
      this._panel.webview.postMessage({
        command: 'loggerUpdateResult',
        success: false,
        message: error.message
      });
    }
  }

  /**
   * 获取日志配置文件路径
   */
  private _getLoggerConfigPath(): string {
    const homeDir = require('os').homedir();
    return path.join(homeDir, '.sks', 'maximo-script-helper', 'logger-config.json');
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
