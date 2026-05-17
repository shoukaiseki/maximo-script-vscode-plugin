import * as vscode from 'vscode';

// 创建日志输出通道
const logger = vscode.window.createOutputChannel('Maximo Script Helper', { log: true });

// Maximo API 路径常量

export class ConfigPanel {
  public static currentPanel: ConfigPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
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
      await config.update('enableCompletion', data.enableCompletion, vscode.ConfigurationTarget.Global);
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
      enableCompletion: config.get('enableCompletion', false),
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
