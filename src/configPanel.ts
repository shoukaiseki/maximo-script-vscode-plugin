import * as vscode from 'vscode';

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
        switch (message.command) {
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

  private _getWebviewContent(extensionUri: vscode.Uri): string {
    const config = vscode.workspace.getConfiguration('maximoScript');
    
    // 调试日志：输出当前配置值
    console.log('[ConfigPanel] 读取配置 enableHttpLog:', config.get('enableHttpLog', false));
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maximo Script 配置</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
    }
    
    .container {
      display: flex;
      height: calc(100vh - 40px);
      gap: 20px;
    }
    
    .sidebar {
      width: 200px;
      background: var(--vscode-sideBar-background);
      border-radius: 6px;
      padding: 10px;
    }
    
    .menu-item {
      padding: 10px 15px;
      cursor: pointer;
      border-radius: 4px;
      margin-bottom: 5px;
      transition: background 0.2s;
    }
    
    .menu-item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    
    .menu-item.active {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
    }
    
    .content {
      flex: 1;
      background: var(--vscode-editor-background);
      border-radius: 6px;
      padding: 20px;
      overflow-y: auto;
    }
    
    .section {
      display: none;
    }
    
    .section.active {
      display: block;
    }
    
    h2 {
      margin-bottom: 20px;
      color: var(--vscode-foreground);
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }
    
    input[type="text"],
    input[type="password"],
    select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: 14px;
    }
    
    input:focus,
    select:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
    
    .help-text {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 5px;
    }
    
    button {
      padding: 10px 20px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    input[type="checkbox"] {
      width: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="sidebar">
      <div class="menu-item active" data-section="connection">连接配置</div>
      <div class="menu-item" data-section="completion">补全设置</div>
      <div class="menu-item" data-section="other">其它配置</div>
      <div class="menu-item" data-section="about">关于</div>
    </div>
    
    <div class="content">
      <div class="section active" id="connection">
        <h2>连接配置</h2>
        
        <div class="form-group">
          <label for="serverUrl">服务器地址</label>
          <input type="text" id="serverUrl" value="${config.get('serverUrl', '')}" placeholder="http://localhost:9080/maximo">
          <div class="help-text">Maximo服务器的完整URL地址</div>
        </div>
        
        <div class="form-group">
          <label for="authType">登录方式</label>
          <select id="authType">
            <option value="maxauth" ${config.get('authType', 'maxauth') === 'maxauth' ? 'selected' : ''}>MAXAUTH (Base64认证)</option>
            <option value="apikey" ${config.get('authType') === 'apikey' ? 'selected' : ''}>API Key</option>
          </select>
          <div class="help-text">选择认证方式：MAXAUTH 或 API Key</div>
        </div>
        
        <div class="form-group" id="maxauthGroup">
          <label for="maxauth">认证信息 (MAXAUTH)</label>
          <input type="password" id="maxauth" value="${config.get('maxauth', '')}" placeholder="Base64编码的用户名:密码">
          <div class="help-text">格式：Base64(username:password)，例如：bWF4YWRtaW46MTIzNDU2</div>
        </div>
        
        <div class="form-group" id="apiKeyGroup" style="display: ${config.get('authType') === 'apikey' ? 'block' : 'none'};">
          <label for="apiKey">API Key</label>
          <input type="password" id="apiKey" value="${config.get('apiKey', '')}" placeholder="输入您的 API Key">
          <div class="help-text">Maximo REST API 的 API Key</div>
        </div>
        
        <div class="form-group">
          <label for="version">Maximo版本</label>
          <select id="version">
            <option value="7.6" ${config.get('version') === '7.6' ? 'selected' : ''}>7.6</option>
            <option value="9.1" ${config.get('version') === '9.1' ? 'selected' : ''}>9.1</option>
          </select>
          <div class="help-text">选择您的Maximo版本</div>
        </div>
        
        <div class="form-group">
          <label for="apiType">接口方式</label>
          <select id="apiType">
            <option value="oslc" ${config.get('apiType', 'oslc') === 'oslc' ? 'selected' : ''}>OSLC API (/oslc)</option>
            <option value="rest" ${config.get('apiType') === 'rest' ? 'selected' : ''}>REST API (/api)</option>
          </select>
          <div class="help-text">选择 Maximo API 接口类型：OSLC 或 REST</div>
        </div>
        
        <div class="form-group">
          <button id="testConnectionBtn" type="button" style="width: 100%;">🔗 测试连接</button>
          <div id="connectionResult" style="margin-top: 10px; padding: 10px; border-radius: 4px; display: none;"></div>
        </div>
      </div>
      
      <div class="section" id="completion">
        <h2>补全设置</h2>
        
        <div class="form-group">
          <div class="checkbox-group">
            <input type="checkbox" id="enableCompletion" ${config.get('enableCompletion') ? 'checked' : ''}>
            <label for="enableCompletion" style="margin: 0;">启用代码补全</label>
          </div>
          <div class="help-text">开启后将提供Maximo API的智能代码补全</div>
        </div>
        
        <div class="form-group">
          <div class="checkbox-group">
            <input type="checkbox" id="enableJSDocParsing" ${config.get('enableJSDocParsing', true) ? 'checked' : ''}>
            <label for="enableJSDocParsing" style="margin: 0;">启用 JSDoc 类型注释解析</label>
          </div>
          <div class="help-text">支持从 /** @type {ClassName} */ 注释中提取变量类型</div>
        </div>
        
        <div class="form-group">
          <div class="checkbox-group">
            <input type="checkbox" id="enableTypeInference" ${config.get('enableTypeInference', true) ? 'checked' : ''}>
            <label for="enableTypeInference" style="margin: 0;">启用返回值类型推断</label>
          </div>
          <div class="help-text">支持链式调用，如：assetMbo.getMboSet("LOCATIONS").moveFirst()</div>
        </div>
        
        <div class="form-group">
          <label for="localApiPath">本地API数据目录</label>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="localApiPath" value="${config.get('localApiPath', '')}" placeholder="E:/gitwork/maximo-script-manager/reflection-data" style="flex: 1;">
            <button id="selectDirBtn" type="button">选择目录</button>
          </div>
          <div class="help-text">选择包含JSON API反射数据的目录（从 Gitee 下载：https://gitee.com/shoukaiseki/maximo-script-editor/tree/master/reflection-data）</div>
        </div>
        
        <div class="form-group">
          <label>JAR 目录配置（用于实时反射）</label>
          <div style="display: flex; gap: 10px; margin-bottom: 8px;">
            <input type="text" id="jarDirectoryInput" placeholder="例如: E:/maximo/lib" style="flex: 1;">
            <button id="addJarDirBtn" type="button">➕ 添加目录</button>
          </div>
          <div id="jarDirectoriesList" style="background: var(--vscode-input-background); padding: 10px; border-radius: 4px; min-height: 50px;">
            ${this._renderJarDirectories(config.get('jarDirectories', []))}
          </div>
          <div class="help-text">添加 Maximo JAR 文件所在目录，插件将尝试通过 Java 反射获取真实的 API 信息</div>
        </div>
        
        <div class="form-group">
          <label>添加单个 JAR 文件</label>
          <div style="display: flex; gap: 10px; margin-bottom: 8px;">
            <input type="text" id="singleJarInput" placeholder="例如: E:/maximo/lib/businessobject.jar" style="flex: 1;">
            <button id="selectSingleJarBtn" type="button">📁 选择文件</button>
            <button id="addSingleJarBtn" type="button"> 添加</button>
          </div>
          <div id="additionalJarsList" style="background: var(--vscode-input-background); padding: 10px; border-radius: 4px; min-height: 50px;">
            ${this._renderJarDirectories(config.get('additionalJars', []))}
          </div>
          <div class="help-text">添加单个 JAR 文件，用于精确控制需要反射的 JAR 文件</div>
        </div>
        
        <div class="form-group">
          <label for="jdkPath">JDK 安装路径</label>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="jdkPath" value="${config.get('jdkPath', '')}" placeholder="C:\Program Files\Java\jdk-11" style="flex: 1;">
            <button id="selectJdkBtn" type="button">选择 JDK</button>
          </div>
          <div class="help-text">配置 JDK 安装路径，用于调用 Java 反射 API 获取真实的类方法信息</div>
        </div>
      </div>
      
      <div class="section" id="other">
        <h2>其它配置</h2>
        
        <div class="form-group">
          <div class="checkbox-group">
            <input type="checkbox" id="enableHttpLog" ${config.get('enableHttpLog', false) ? 'checked' : ''}>
            <label for="enableHttpLog" style="margin: 0;">启用 HTTP 请求日志保存</label>
          </div>
          <div class="help-text">自动生成 IntelliJ IDEA HTTP Client 格式的 .http 文件到临时目录（开发调试时使用）</div>
        </div>
        
        <div class="form-group">
          <label for="logLevel">日志级别</label>
          <select id="logLevel">
            <option value="trace" ${(config.get('logLevel', 'info') as string) === 'trace' ? 'selected' : ''}>Trace（最详细）</option>
            <option value="debug" ${(config.get('logLevel') as string) === 'debug' ? 'selected' : ''}>Debug</option>
            <option value="info" ${(config.get('logLevel', 'info') as string) === 'info' ? 'selected' : ''}>Info（默认）</option>
            <option value="warning" ${(config.get('logLevel') as string) === 'warning' ? 'selected' : ''}>Warning</option>
            <option value="error" ${(config.get('logLevel') as string) === 'error' ? 'selected' : ''}>Error（仅错误）</option>
          </select>
          <div class="help-text">设置插件日志的详细程度，开发调试时建议使用 Debug 或 Trace</div>
        </div>
      </div>
      
      <div class="section" id="about">
        <h2>关于</h2>
        <p><strong>Maximo Script Helper</strong></p>
        <p>版本：1.0.0</p>
        <p>作者：shoukaiseki</p>
        <br>
        <p>功能特性：</p>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>智能代码补全</li>
          <li>Maximo API提示</li>
          <li>多版本支持（7.6/9.1）</li>
          <li>语法高亮</li>
        </ul>
      </div>
      
      <button id="saveBtn" style="margin-top: 20px;">保存配置</button>
    </div>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    
    // 登录方式切换
    document.getElementById('authType').addEventListener('change', () => {
      const authType = document.getElementById('authType').value;
      const maxauthGroup = document.getElementById('maxauthGroup');
      const apiKeyGroup = document.getElementById('apiKeyGroup');
      
      if (authType === 'maxauth') {
        maxauthGroup.style.display = 'block';
        apiKeyGroup.style.display = 'none';
      } else if (authType === 'apikey') {
        maxauthGroup.style.display = 'none';
        apiKeyGroup.style.display = 'block';
      }
    });
    
    // 菜单切换
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        
        item.classList.add('active');
        const sectionId = item.dataset.section;
        document.getElementById(sectionId).classList.add('active');
      });
    });
    
    // 选择目录按钮
    document.getElementById('selectDirBtn').addEventListener('click', () => {
      vscode.postMessage({
        command: 'selectDirectory'
      });
    });
    
    // 添加 JAR 目录按钮
    document.getElementById('addJarDirBtn').addEventListener('click', () => {
      const input = document.getElementById('jarDirectoryInput');
      const path = input.value.trim();
      
      if (!path) {
        vscode.window.showErrorMessage('请输入 JAR 目录路径');
        return;
      }
      
      // 发送添加 JAR 目录请求
      vscode.postMessage({
        command: 'addJarDirectory',
        path: path
      });
      
      // 清空输入框
      input.value = '';
    });
    
    // 选择单个 JAR 文件按钮
    document.getElementById('selectSingleJarBtn').addEventListener('click', () => {
      vscode.postMessage({
        command: 'selectSingleJar'
      });
    });
    
    // 添加单个 JAR 文件按钮
    document.getElementById('addSingleJarBtn').addEventListener('click', () => {
      const input = document.getElementById('singleJarInput');
      const jarPath = input.value.trim();
      
      if (!jarPath) {
        vscode.window.showErrorMessage('请输入 JAR 文件路径');
        return;
      }
      
      // 发送添加单个 JAR 文件请求
      vscode.postMessage({
        command: 'addSingleJar',
        path: jarPath
      });
      
      // 清空输入框
      input.value = '';
    });
    
    // 选择 JDK 按钮
    document.getElementById('selectJdkBtn').addEventListener('click', () => {
      vscode.postMessage({
        command: 'selectJdk'
      });
    });
    
    // 测试连接按钮
    document.getElementById('testConnectionBtn').addEventListener('click', () => {
      const serverUrl = document.getElementById('serverUrl').value.trim();
      const authType = document.getElementById('authType').value;
      const apiType = document.getElementById('apiType').value;
      const maxauth = document.getElementById('maxauth').value.trim();
      const apiKey = document.getElementById('apiKey').value.trim();
      
      if (!serverUrl) {
        showConnectionResult('error', '❌ 请输入服务器地址');
        return;
      }
      
      if (authType === 'maxauth' && !maxauth) {
        showConnectionResult('error', '❌ 请输入 MAXAUTH 认证信息');
        return;
      }
      
      if (authType === 'apikey' && !apiKey) {
        showConnectionResult('error', '❌ 请输入 API Key');
        return;
      }
      
      // 显示加载状态
      showConnectionResult('loading', '⏳ 正在测试连接...');
      
      // 发送测试连接请求到扩展主机
      vscode.postMessage({
        command: 'testConnection',
        data: {
          serverUrl: serverUrl,
          authType: authType,
          apiType: apiType,
          maxauth: maxauth,
          apiKey: apiKey
        }
      });
    });
    
    // 显示连接测试结果
    function showConnectionResult(type, message) {
      const resultDiv = document.getElementById('connectionResult');
      resultDiv.style.display = 'block';
      
      if (type === 'success') {
        resultDiv.style.background = 'var(--vscode-terminal-ansiGreen)';
        resultDiv.style.color = 'white';
        resultDiv.innerHTML = '\u2705 ' + message;
      } else if (type === 'error') {
        resultDiv.style.background = 'var(--vscode-terminal-ansiRed)';
        resultDiv.style.color = 'white';
        resultDiv.innerHTML = '\u274c ' + message;
      } else if (type === 'loading') {
        resultDiv.style.background = 'var(--vscode-terminal-ansiYellow)';
        resultDiv.style.color = 'black';
        resultDiv.innerHTML = message;
      }
    }
    
    // 全局函数：删除 JAR 目录（供 HTML 中的 onclick 调用）
    window.removeJarDir = function(index) {
      vscode.postMessage({
        command: 'removeJarDirectory',
        index: index
      });
    };
    
    // 接收从扩展主机返回的目录路径
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'setDirectoryPath') {
        document.getElementById('localApiPath').value = message.path;
      }
      if (message.command === 'setSingleJarPath') {
        document.getElementById('singleJarInput').value = message.path;
      }
      if (message.command === 'setJdkPath') {
        document.getElementById('jdkPath').value = message.path;
      }
      // 接收测试结果
      if (message.command === 'connectionResult') {
        showConnectionResult(message.type, message.text);
      }
      // 接收 JAR 目录列表更新
      if (message.command === 'updateJarDirectoriesList') {
        document.getElementById('jarDirectoriesList').innerHTML = message.html;
      }
      // 接收单个 JAR 文件列表更新
      if (message.command === 'updateAdditionalJarsList') {
        document.getElementById('additionalJarsList').innerHTML = message.html;
      }
    });
    
    // 保存配置
    document.getElementById('saveBtn').addEventListener('click', () => {
      const config = {
        serverUrl: document.getElementById('serverUrl').value,
        authType: document.getElementById('authType').value,
        maxauth: document.getElementById('maxauth').value,
        apiKey: document.getElementById('apiKey').value,
        apiType: document.getElementById('apiType').value,
        version: document.getElementById('version').value,
        enableCompletion: document.getElementById('enableCompletion').checked,
        localApiPath: document.getElementById('localApiPath').value,
        enableJSDocParsing: document.getElementById('enableJSDocParsing').checked,
        enableTypeInference: document.getElementById('enableTypeInference').checked,
        enableHttpLog: document.getElementById('enableHttpLog').checked,
        logLevel: document.getElementById('logLevel').value,
        jdkPath: document.getElementById('jdkPath').value
      };
      
      vscode.postMessage({
        command: 'saveConfig',
        data: config
      });
    });
  </script>
</body>
</html>`;
  }

  private async _saveConfig(data: any) {
    try {
      const config = vscode.workspace.getConfiguration('maximoScript');
      
      console.log('[SaveConfig] 开始保存配置...');
      console.log('[SaveConfig] enableHttpLog:', data.enableHttpLog, '类型:', typeof data.enableHttpLog);
      
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
      await config.update('logLevel', data.logLevel, vscode.ConfigurationTarget.Global);
      await config.update('jdkPath', data.jdkPath, vscode.ConfigurationTarget.Global);
      
      // 验证保存结果
      const savedValue = config.get('enableHttpLog', false);
      console.log('[SaveConfig] 保存后读取 enableHttpLog:', savedValue);
      
      vscode.window.showInformationMessage('配置已保存');
    } catch (error: any) {
      console.error('[SaveConfig] 保存配置失败:', error);
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
    
    // 更新 UI 列表
    this._panel.webview.postMessage({
      command: 'updateJarDirectoriesList',
      html: this._renderJarDirectories(newDirs)
    });
    
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
    
    // 更新 UI 列表
    this._panel.webview.postMessage({
      command: 'updateJarDirectoriesList',
      html: this._renderJarDirectories(newDirs)
    });
    
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
    
    // 更新 UI 列表
    this._panel.webview.postMessage({
      command: 'updateAdditionalJarsList',
      html: this._renderJarDirectories(newJars)
    });
    
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
