import React, { useState, useEffect } from 'react';
import './App.css';

declare global {
  interface Window {
    acquireVsCodeApi: () => any;
  }
}

interface ConfigData {
  serverUrl: string;
  authType: string;
  maxauth: string;
  apiKey: string;
  apiType: string;
  version: string;
  completionMode: string;
  localApiPath: string;
  enableJSDocParsing: boolean;
  enableTypeInference: boolean;
  enableHttpLog: boolean;
  jdkPath: string;
  jarDirectories: string[];
  additionalJars: string[];
}

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState('connection');
  const [activeToolboxTab, setActiveToolboxTab] = useState('init'); // 'init', 'clear' or 'deploy'
  const [connectionResult, setConnectionResult] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });
  const [toolboxOutput, setToolboxOutput] = useState<string>('');
  const [deployFilePath, setDeployFilePath] = useState<string>('');
  const [deployDirectoryPath, setDeployDirectoryPath] = useState<string>('');
  const [deployMode, setDeployMode] = useState<'file' | 'directory'>('file');
  const [deployRecursive, setDeployRecursive] = useState<boolean>(true);
  const [isInitRunning, setIsInitRunning] = useState<boolean>(false);
  const [isClearRunning, setIsClearRunning] = useState<boolean>(false);
  const [isDeployRunning, setIsDeployRunning] = useState<boolean>(false);
  const [deleteJsonPath, setDeleteJsonPath] = useState<string>('');
  const [config, setConfig] = useState<ConfigData>({
    serverUrl: '',
    authType: 'maxauth',
    maxauth: '',
    apiKey: '',
    apiType: 'oslc',
    version: '7.6',
    completionMode: 'vscode',
    localApiPath: '',
    enableJSDocParsing: true,
    enableTypeInference: true,
    enableHttpLog: false,
    jdkPath: '',
    jarDirectories: [],
    additionalJars: []
  });

  // 使用 useRef 确保只获取一次 VSCode API
  const vscodeRef = React.useRef<any>(null);
  
  const getVsCodeApi = () => {
    if (!vscodeRef.current) {
      vscodeRef.current = window.acquireVsCodeApi();
    }
    return vscodeRef.current;
  };

  useEffect(() => {
    // 通知扩展主机 React 已准备好
    getVsCodeApi().postMessage({ command: 'webviewReady' });
    console.log('[React Webview] 已发送 ready 信号');
    
    // 监听来自扩展的消息
    window.addEventListener('message', event => {
      const message = event.data;
      console.log('[React Webview] 收到消息:', message);
      
      switch (message.command) {
        case 'loadConfig':
          // 加载初始配置
          console.log('[React Webview] 加载配置:', message.data);
          setConfig(message.data);
          break;
        case 'setDirectoryPath':
          setConfig(prev => ({ ...prev, localApiPath: message.path }));
          break;
        case 'setJdkPath':
          setConfig(prev => ({ ...prev, jdkPath: message.path }));
          break;
        case 'setSingleJarPath':
          // 设置单个 JAR 文件的输入框
          const singleJarInput = document.getElementById('singleJarInput') as HTMLInputElement;
          if (singleJarInput) {
            singleJarInput.value = message.path;
          }
          break;
        case 'updateJarDirectoriesList':
          // 这个命令在旧版中使用，现在通过保存配置来更新
          break;
        case 'updateAdditionalJarsList':
          // 这个命令在旧版中使用，现在通过保存配置来更新
          break;
        case 'connectionResult':
          // 处理连接测试结果
          setConnectionResult({ type: message.type, text: message.text });
          // 3秒后自动清除结果
          setTimeout(() => setConnectionResult({ type: null, text: '' }), 5000);
          break;
        case 'updateToolboxOutput':
          // 更新工具箱输出日志
          setToolboxOutput(prev => prev + message.text + '\n');
          break;
        case 'clearToolboxOutput':
          // 清空工具箱输出
          setToolboxOutput('');
          break;
        case 'setDeployFilePath':
          // 设置部署文件路径
          setDeployFilePath(message.path);
          break;
        case 'setDeployDirectoryPath':
          // 设置部署目录路径
          setDeployDirectoryPath(message.path);
          break;
        case 'setDeleteJsonPath':
          // 设置删除脚本 JSON 文件路径
          console.log('[App] 收到 setDeleteJsonPath 消息:', message.path);
          console.log('[App] 当前的 deleteJsonPath:', deleteJsonPath);
          setDeleteJsonPath(message.path);
          console.log('[App] 已调用 setDeleteJsonPath，新值应该是:', message.path);
          break;
        case 'initScriptsComplete':
          // 初始化脚本完成
          setIsInitRunning(false);
          break;
        case 'clearScriptsComplete':
          // 清除脚本完成
          setIsClearRunning(false);
          break;
        case 'executeClearScripts':
          // 后端确认后，执行清除操作
          executeClearScripts();
          break;
        case 'deployScriptComplete':
          // 部署脚本完成
          setIsDeployRunning(false);
          break;
      }
    });
  }, []);

  // 即时保存配置
  const saveConfig = (newConfig: ConfigData) => {
    getVsCodeApi().postMessage({
      command: 'saveConfig',
      data: newConfig
    });
  };

  // 更新配置并自动保存
  const updateConfig = (updates: Partial<ConfigData>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleSave = () => {
    getVsCodeApi().postMessage({
      command: 'saveConfig',
      data: config
    });
    alert('配置已保存！');
  };

  const handleTestConnection = () => {
    getVsCodeApi().postMessage({
      command: 'testConnection',
      data: config
    });
  };

  // 工具箱 - 初始化脚本
  const handleInitScripts = () => {
    setIsInitRunning(true);
    setToolboxOutput(''); // 清空之前的输出
    getVsCodeApi().postMessage({
      command: 'initScripts'
    });
  };

  // 工具箱 - 清空输出
  const handleClearToolboxOutput = () => {
    setToolboxOutput('');
  };

  // 工具箱 - 清除工具脚本
  const handleClearScripts = () => {
    console.log('[App] handleClearScripts 被调用');
    console.log('[App] deleteJsonPath:', deleteJsonPath);
    console.log('[App] isInitRunning:', isInitRunning);
    console.log('[App] isClearRunning:', isClearRunning);
    console.log('[App] isDeployRunning:', isDeployRunning);
    
    if (!deleteJsonPath) {
      // 使用 VSCode 的通知而不是 alert
      getVsCodeApi().postMessage({
        command: 'showWarning',
        message: '请先选择要删除的脚本列表 JSON 文件'
      });
      return;
    }
    
    // 请求后端显示确认对话框
    getVsCodeApi().postMessage({
      command: 'confirmClearScripts',
      jsonPath: deleteJsonPath
    });
  };

  // 处理确认后的清除操作
  const executeClearScripts = () => {
    setIsClearRunning(true);
    setToolboxOutput(''); // 清空之前的输出
    getVsCodeApi().postMessage({
      command: 'clearScripts',
      jsonPath: deleteJsonPath
    });
  };

  // 使用 useEffect 添加原生 DOM 事件监听器
  React.useEffect(() => {
    console.log('[App] useEffect 执行，设置按钮事件监听器');
    
    const clearButton = document.getElementById('clearScriptsButton');
    const testButton = document.getElementById('testButton');
    
    if (clearButton) {
      console.log('[App] 找到 clearScriptsButton');
      clearButton.addEventListener('click', (e) => {
        console.log('[App] clearScriptsButton 被点击（原生事件）');
        e.preventDefault();
        e.stopPropagation();
        handleClearScripts();
      });
    } else {
      console.log('[App] 未找到 clearScriptsButton');
    }
    
    if (testButton) {
      console.log('[App] 找到 testButton');
      testButton.addEventListener('click', (e) => {
        console.log('[App] testButton 被点击（原生事件）');
        e.preventDefault();
        e.stopPropagation();
        // 使用 VSCode 的通知而不是 alert
        getVsCodeApi().postMessage({
          command: 'showInfo',
          message: '测试按钮被点击了！deleteJsonPath: ' + deleteJsonPath
        });
      });
    } else {
      console.log('[App] 未找到 testButton');
    }
    
    // 清理函数
    return () => {
      if (clearButton) {
        clearButton.removeEventListener('click', () => {});
      }
      if (testButton) {
        testButton.removeEventListener('click', () => {});
      }
    };
  }, [deleteJsonPath, isInitRunning, isClearRunning, isDeployRunning]);

  // 工具箱 - 选择删除脚本 JSON 文件
  const handleSelectDeleteJson = () => {
    getVsCodeApi().postMessage({
      command: 'selectDeleteJson'
    });
  };

  // 工具箱 - 选择部署文件
  const handleSelectDeployFile = () => {
    getVsCodeApi().postMessage({
      command: 'selectFileForDeploy'
    });
  };

  // 工具箱 - 选择部署目录
  const handleSelectDeployDirectory = () => {
    getVsCodeApi().postMessage({
      command: 'selectDirectoryForDeploy'
    });
  };

  // 工具箱 - 开始部署
  const handleStartDeploy = () => {
    if (deployMode === 'file') {
      if (!deployFilePath) {
        alert('请先选择要部署的文件');
        return;
      }
      setIsDeployRunning(true);
      setToolboxOutput('');
      getVsCodeApi().postMessage({
        command: 'deployScript',
        filePath: deployFilePath
      });
    } else {
      if (!deployDirectoryPath) {
        alert('请先选择要部署的目录');
        return;
      }
      setIsDeployRunning(true);
      setToolboxOutput('');
      getVsCodeApi().postMessage({
        command: 'deployDirectory',
        directoryPath: deployDirectoryPath,
        recursive: deployRecursive
      });
    }
  };

  // 添加 JAR 目录
  const handleAddJarDirectory = () => {
    const jarDirInput = document.getElementById('jarDirectoryInput') as HTMLInputElement;
    const path = jarDirInput?.value.trim();
    
    if (!path) {
      alert('请输入 JAR 目录路径');
      return;
    }
    
    getVsCodeApi().postMessage({
      command: 'addJarDirectory',
      path: path
    });
    
    if (jarDirInput) {
      jarDirInput.value = '';
    }
  };

  // 删除 JAR 目录
  const handleRemoveJarDirectory = (index: number) => {
    getVsCodeApi().postMessage({
      command: 'removeJarDirectory',
      index: index
    });
  };

  // 选择单个 JAR 文件
  const handleSelectSingleJar = () => {
    getVsCodeApi().postMessage({ command: 'selectSingleJar' });
  };

  // 添加单个 JAR 文件
  const handleAddSingleJar = () => {
    const singleJarInput = document.getElementById('singleJarInput') as HTMLInputElement;
    const jarPath = singleJarInput?.value.trim();
    
    if (!jarPath) {
      alert('请输入 JAR 文件路径');
      return;
    }
    
    getVsCodeApi().postMessage({
      command: 'addSingleJar',
      path: jarPath
    });
    
    if (singleJarInput) {
      singleJarInput.value = '';
    }
  };

  const menuItems = [
    { id: 'connection', label: '连接配置' },
    { id: 'completion', label: '补全设置' },
    { id: 'other', label: '其它配置' },
    { id: 'toolbox', label: '工具箱' },
    { id: 'about', label: '关于' }
  ];

  return (
    <div className="container">
      <div className="sidebar">
        {menuItems.map(item => (
          <div
            key={item.id}
            className={`menu-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => setActiveSection(item.id)}
          >
            {item.label}
          </div>
        ))}
      </div>

      <div className="content">
        {activeSection === 'connection' && (
          <div className="section active">
            <h2>连接配置</h2>
            
            <div className="form-group">
              <label>服务器地址</label>
              <input
                type="text"
                value={config.serverUrl}
                onChange={(e) => updateConfig({ serverUrl: e.target.value })}
                placeholder="http://localhost:9080/maximo"
              />
            </div>

            <div className="form-group">
              <label>登录方式</label>
              <select
                value={config.authType}
                onChange={(e) => updateConfig({ authType: e.target.value })}
              >
                <option value="maxauth">MAXAUTH (Base64认证)</option>
                <option value="apikey">API Key</option>
              </select>
            </div>

            {config.authType === 'maxauth' && (
              <div className="form-group">
                <label>认证信息 (MAXAUTH)</label>
                <input
                  type="password"
                  value={config.maxauth}
                  onChange={(e) => updateConfig({ maxauth: e.target.value })}
                  placeholder="Base64编码的用户名:密码"
                />
              </div>
            )}

            {config.authType === 'apikey' && (
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => updateConfig({ apiKey: e.target.value })}
                  placeholder="输入您的 API Key"
                />
              </div>
            )}

            <div className="form-group">
              <label>Maximo版本</label>
              <select
                value={config.version}
                onChange={(e) => updateConfig({ version: e.target.value })}
              >
                <option value="7.6">7.6</option>
                <option value="9.1">9.1</option>
              </select>
            </div>

            <div className="form-group">
              <label>接口方式</label>
              <select
                value={config.apiType}
                onChange={(e) => updateConfig({ apiType: e.target.value })}
              >
                <option value="oslc">OSLC API (/oslc)</option>
                <option value="rest">REST API (/api)</option>
              </select>
            </div>

            {connectionResult.type && (
              <div style={{ 
                padding: '10px', 
                marginBottom: '15px', 
                borderRadius: '4px',
                background: connectionResult.type === 'success' ? 'var(--vscode-terminal-ansiGreen)' : 'var(--vscode-terminal-ansiRed)',
                color: 'white'
              }}>
                {connectionResult.type === 'success' ? '✅ ' : '❌ '}
                <span dangerouslySetInnerHTML={{ __html: connectionResult.text }} />
              </div>
            )}

            <button onClick={handleTestConnection}>测试连接</button>
          </div>
        )}

        {activeSection === 'completion' && (
          <div className="section active">
            <h2>补全设置</h2>
            
            <div className="form-group">
              <div style={{ 
                padding: '15px', 
                background: 'var(--vscode-textBlockQuote-background)',
                borderLeft: '4px solid var(--vscode-textLink-foreground)',
                borderRadius: '4px'
              }}>
                <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>💡 如何关闭插件补全？</p>
                <p style={{ margin: '0 0 10px 0' }}>
                  如果您想使用 VSCode 内置的智能感知而不是插件提供的补全，请点击编辑器右下角的<strong>"补全模式"</strong>状态栏项，将其切换为<strong>"VSCode 模式"</strong>。
                </p>
                <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.8 }}>
                  切换后，插件将不再提供代码补全建议，您可以完全依赖 VSCode 的原生补全功能。
                </p>
              </div>
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="enableJSDocParsing"
                  checked={config.enableJSDocParsing}
                  onChange={(e) => updateConfig({ enableJSDocParsing: e.target.checked })}
                />
                <label htmlFor="enableJSDocParsing" style={{ margin: 0 }}>启用 JSDoc 解析</label>
              </div>
              <div className="help-text">
                从 JSDoc 注释中提取类型信息和文档
              </div>
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="enableTypeInference"
                  checked={config.enableTypeInference}
                  onChange={(e) => updateConfig({ enableTypeInference: e.target.checked })}
                />
                <label htmlFor="enableTypeInference" style={{ margin: 0 }}>启用类型推断</label>
              </div>
              <div className="help-text">
                自动推断变量和函数的类型
              </div>
            </div>

            <div className="form-group">
              <label>本地 API 文档路径</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={config.localApiPath}
                  onChange={(e) => updateConfig({ localApiPath: e.target.value })}
                  placeholder="选择包含 API 文档的目录"
                  style={{ flex: 1 }}
                />
                <button 
                  onClick={() => {
                    getVsCodeApi().postMessage({ command: 'selectDirectory' });
                  }}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  选择目录
                </button>
              </div>
              <div className="help-text">
                用于加载本地 Maximo API 文档以提供更准确的补全建议
              </div>
            </div>

            <div className="form-group">
              <label>JDK 安装路径</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={config.jdkPath}
                  onChange={(e) => updateConfig({ jdkPath: e.target.value })}
                  placeholder="例如: C:\\Program Files\\Java\\jdk-11"
                  style={{ flex: 1 }}
                />
                <button 
                  onClick={() => {
                    getVsCodeApi().postMessage({ command: 'selectJdk' });
                  }}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  选择 JDK
                </button>
              </div>
              <div className="help-text">
                用于反射获取 Java 类的详细信息（可选）
              </div>
            </div>

            <div className="form-group">
              <label>JAR 目录配置（用于实时反射）</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <input 
                  type="text" 
                  id="jarDirectoryInput" 
                  placeholder="例如: E:/maximo/lib" 
                  style={{ flex: 1 }}
                />
                <button onClick={handleAddJarDirectory} style={{ whiteSpace: 'nowrap' }}>➕ 添加目录</button>
              </div>
              <div style={{ background: 'var(--vscode-input-background)', padding: '10px', borderRadius: '4px', minHeight: '50px' }}>
                {config.jarDirectories.length === 0 ? (
                  <div style={{ color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' }}>暂无配置的 JAR 目录</div>
                ) : (
                  config.jarDirectories.map((dir, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--vscode-panel-border)' }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={dir}>{dir}</span>
                      <button onClick={() => handleRemoveJarDirectory(index)} style={{ marginLeft: '10px', padding: '2px 8px', cursor: 'pointer' }}>❌ 删除</button>
                    </div>
                  ))
                )}
              </div>
              <div className="help-text">添加 Maximo JAR 文件所在目录，插件将尝试通过 Java 反射获取真实的 API 信息</div>
            </div>

            <div className="form-group">
              <label>添加单个 JAR 文件</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <input 
                  type="text" 
                  id="singleJarInput" 
                  placeholder="例如: E:/maximo/lib/businessobject.jar" 
                  style={{ flex: 1 }}
                />
                <button onClick={handleSelectSingleJar} style={{ whiteSpace: 'nowrap' }}>📁 选择文件</button>
                <button onClick={handleAddSingleJar} style={{ whiteSpace: 'nowrap' }}>➕ 添加</button>
              </div>
              <div style={{ background: 'var(--vscode-input-background)', padding: '10px', borderRadius: '4px', minHeight: '50px' }}>
                {config.additionalJars.length === 0 ? (
                  <div style={{ color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' }}>暂无添加的 JAR 文件</div>
                ) : (
                  config.additionalJars.map((jar, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--vscode-panel-border)' }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={jar}>{jar}</span>
                      <button onClick={() => handleRemoveJarDirectory(index)} style={{ marginLeft: '10px', padding: '2px 8px', cursor: 'pointer' }}>❌ 删除</button>
                    </div>
                  ))
                )}
              </div>
              <div className="help-text">添加单个 JAR 文件，用于精确控制需要反射的 JAR 文件</div>
            </div>

            <button onClick={handleSave}>保存配置</button>
          </div>
        )}

        {activeSection === 'other' && (
          <div className="section active">
            <h2>其它配置</h2>
            
            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="enableHttpLog"
                  checked={config.enableHttpLog}
                  onChange={(e) => updateConfig({ enableHttpLog: e.target.checked })}
                />
                <label htmlFor="enableHttpLog" style={{ margin: 0 }}>启用 HTTP 请求日志保存</label>
              </div>
              <div className="help-text">
                自动生成 IntelliJ IDEA HTTP Client 格式的 .http 文件到临时目录（开发调试时使用）
              </div>
            </div>
          </div>
        )}

        {activeSection === 'toolbox' && (
          <div className="section active">
            <h2>工具箱</h2>
            
            {/* 标签页导航 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid var(--vscode-panel-border)', paddingBottom: '10px' }}>
              <button
                onClick={() => setActiveToolboxTab('init')}
                style={{
                  padding: '8px 16px',
                  background: activeToolboxTab === 'init' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'init' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'init' ? 'bold' : 'normal'
                }}
              >
                🚀 初始化脚本
              </button>
              <button
                onClick={() => setActiveToolboxTab('clear')}
                style={{
                  padding: '8px 16px',
                  background: activeToolboxTab === 'clear' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'clear' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'clear' ? 'bold' : 'normal'
                }}
              >
                🗑️ 清除脚本
              </button>
              <button
                onClick={() => setActiveToolboxTab('deploy')}
                style={{
                  padding: '8px 16px',
                  background: activeToolboxTab === 'deploy' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'deploy' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'deploy' ? 'bold' : 'normal'
                }}
              >
                📤 导入脚本
              </button>
            </div>

            {/* 初始化脚本标签页 */}
            {activeToolboxTab === 'init' && (
              <div>
                <div style={{ 
                  padding: '15px', 
                  background: 'var(--vscode-textBlockQuote-background)',
                  borderLeft: '4px solid var(--vscode-textLink-foreground)',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>🚀 初始化工具脚本</p>
                  <p style={{ margin: 0 }}>
                    一键部署所有 Maximo 开发工具脚本到服务器，包括：自动脚本安装、提取、日志查看等工具。
                  </p>
                </div>

                <button 
                  onClick={handleInitScripts}
                  disabled={isInitRunning || isClearRunning || isDeployRunning}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '20px',
                    opacity: (isInitRunning || isClearRunning || isDeployRunning) ? 0.6 : 1,
                    cursor: (isInitRunning || isClearRunning || isDeployRunning) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isInitRunning ? '⏳ 正在初始化...' : '🚀 开始初始化'}
                </button>

                {/* 输出日志区域 */}
                <div style={{ 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  padding: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>📋 部署进度</span>
                    <button 
                      onClick={handleClearToolboxOutput}
                      style={{ padding: '4px 12px', fontSize: '0.9em' }}
                    >
                      清空
                    </button>
                  </div>
                  <pre style={{ 
                    margin: 0,
                    padding: '10px',
                    background: 'var(--vscode-textCodeBlock-background)',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontSize: '0.9em'
                  }}>
                    {toolboxOutput || '准备就绪，点击“开始初始化”按钮...'}
                  </pre>
                </div>
              </div>
            )}

            {/* 清除脚本标签页 */}
            {activeToolboxTab === 'clear' && (
              <div>
                <div style={{ 
                  padding: '15px', 
                  background: 'var(--vscode-textBlockQuote-background)',
                  borderLeft: '4px solid var(--vscode-errorForeground)',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: 'var(--vscode-errorForeground)' }}>⚠️ 警告：危险操作</p>
                  <p style={{ margin: '0 0 10px 0' }}>
                    此功能将从 Maximo 服务器上删除指定的自动化脚本。
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--vscode-descriptionForeground)' }}>
                    📌 <strong>使用说明：</strong><br/>
                    1. 准备一个 JSON 文件，包含要删除的脚本名称列表<br/>
                    2. JSON 格式：<code>["script1", "script2", "script3"]</code><br/>
                    3. 示例：demo/delete.json<br/>
                    4. 点击“选择 JSON 文件”按钮选择文件<br/>
                    5. 点击“开始清除”按钮执行删除
                  </p>
                </div>

                {/* JSON 文件选择 */}
                <div className="form-group">
                  <label>选择脚本列表 JSON 文件：</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={deleteJsonPath}
                      readOnly
                      placeholder="选择包含脚本名称列表的 JSON 文件"
                      style={{ flex: 1 }}
                    />
                    <button onClick={handleSelectDeleteJson} style={{ whiteSpace: 'nowrap' }}>📄 选择文件</button>
                  </div>
                </div>

                <button 
                  id="clearScriptsButton"
                  disabled={!deleteJsonPath || isInitRunning || isClearRunning || isDeployRunning}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '10px',
                    background: !deleteJsonPath ? 'var(--vscode-disabledForeground)' : 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    opacity: (!deleteJsonPath || isInitRunning || isClearRunning || isDeployRunning) ? 0.6 : 1,
                    cursor: (!deleteJsonPath || isInitRunning || isClearRunning || isDeployRunning) ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    zIndex: 100
                  }}
                >
                  {!deleteJsonPath ? '⚠️ 请先选择 JSON 文件' : (isClearRunning ? '⏳ 正在清除...' : '🗑️ 开始清除')}
                </button>

                {/* 测试按钮 */}
                <button 
                  id="testButton"
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '20px',
                    background: 'green',
                    color: 'white',
                    position: 'relative',
                    zIndex: 100
                  }}
                >
                  🧪 测试按钮（点击我）
                </button>

                {/* 调试信息 */}
                <div style={{ 
                  padding: '10px', 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontSize: '0.85em'
                }}>
                  <strong>🔍 调试信息：</strong><br/>
                  deleteJsonPath: {deleteJsonPath || '(空)'}<br/>
                  isInitRunning: {isInitRunning.toString()}<br/>
                  isClearRunning: {isClearRunning.toString()}<br/>
                  isDeployRunning: {isDeployRunning.toString()}<br/>
                  disabled: {(!deleteJsonPath || isInitRunning || isClearRunning || isDeployRunning).toString()}
                </div>

                {/* 输出日志区域 */}
                <div style={{ 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  padding: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>📋 清除进度</span>
                    <button 
                      onClick={handleClearToolboxOutput}
                      style={{ padding: '4px 12px', fontSize: '0.9em' }}
                    >
                      清空
                    </button>
                  </div>
                  <pre style={{ 
                    margin: 0,
                    padding: '10px',
                    background: 'var(--vscode-textCodeBlock-background)',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontSize: '0.9em'
                  }}>
                    {toolboxOutput || '准备就绪，请选择 JSON 文件并点击“开始清除”按钮...'}
                  </pre>
                </div>
              </div>
            )}

            {/* 导入脚本标签页 */}
            {activeToolboxTab === 'deploy' && (
              <div>
                <div style={{ 
                  padding: '15px', 
                  background: 'var(--vscode-textBlockQuote-background)',
                  borderLeft: '4px solid var(--vscode-textLink-foreground)',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>📤 导入脚本</p>
                  <p style={{ margin: 0 }}>
                    将本地的脚本配置文件（JSON格式）部署到 Maximo 服务器。支持单文件和批量目录部署。
                  </p>
                </div>

                {/* 部署模式选择 */}
                <div className="form-group">
                  <label>部署模式：</label>
                  <select
                    value={deployMode}
                    onChange={(e) => setDeployMode(e.target.value as 'file' | 'directory')}
                  >
                    <option value="file">单个文件</option>
                    <option value="directory">整个目录</option>
                  </select>
                </div>

                {/* 文件选择 */}
                {deployMode === 'file' && (
                  <div className="form-group">
                    <label>选择文件：</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={deployFilePath}
                        readOnly
                        placeholder="选择要部署的 JSON 配置文件"
                        style={{ flex: 1 }}
                      />
                      <button onClick={handleSelectDeployFile} style={{ whiteSpace: 'nowrap' }}>
                        📄 选择文件
                      </button>
                    </div>
                  </div>
                )}

                {/* 目录选择 */}
                {deployMode === 'directory' && (
                  <div>
                    <div className="form-group">
                      <label>选择目录：</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                          type="text"
                          value={deployDirectoryPath}
                          readOnly
                          placeholder="选择包含 JSON 配置文件的目录"
                          style={{ flex: 1 }}
                        />
                        <button onClick={handleSelectDeployDirectory} style={{ whiteSpace: 'nowrap' }}>
                          📁 选择目录
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="checkbox-group">
                        <input
                          type="checkbox"
                          id="deployRecursive"
                          checked={deployRecursive}
                          onChange={(e) => setDeployRecursive(e.target.checked)}
                        />
                        <label htmlFor="deployRecursive" style={{ margin: 0 }}>递归子目录</label>
                      </div>
                      <div className="help-text">
                        同时部署子目录中的脚本配置文件
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleStartDeploy}
                  disabled={isDeployRunning}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '20px',
                    opacity: isDeployRunning ? 0.6 : 1,
                    cursor: isDeployRunning ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isDeployRunning ? '⏳ 正在导入...' : '📤 开始导入'}
                </button>

                {/* 输出日志区域 */}
                <div style={{ 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  padding: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>📋 输出信息</span>
                    <button 
                      onClick={handleClearToolboxOutput}
                      style={{ padding: '4px 12px', fontSize: '0.9em' }}
                    >
                      清空
                    </button>
                  </div>
                  <pre style={{ 
                    margin: 0,
                    padding: '10px',
                    background: 'var(--vscode-textCodeBlock-background)',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontSize: '0.9em'
                  }}>
                    {toolboxOutput || '准备就绪，点击“开始导入”按钮...'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'about' && (
          <div className="section active">
            <h2>关于</h2>
            <p><strong>Maximo Script Helper</strong></p>
            <p>版本：1.0.0</p>
            <p>作者：shoukaiseki</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
