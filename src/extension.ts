import * as vscode from 'vscode';
import { CompletionProvider } from './completionProvider';
import { ConfigPanel } from './configPanel';
import { httpRequestToMaximo, initializeAxiosInterceptors, HttpRequestOptions, HttpResponse } from './httpRequest';

// 导出 HTTP 请求方法和初始化函数，供其他模块使用
export { httpRequestToMaximo, initializeAxiosInterceptors };
export type { HttpRequestOptions, HttpResponse };

export function activate(context: vscode.ExtensionContext) {
  console.log('Maximo Script Helper 已激活');

  // 创建带日志功能的输出通道
  const logger = vscode.window.createOutputChannel('Maximo Script Helper', { log: true });
  
  logger.info('Maximo Script Helper 插件已启动');
  logger.info('💡 提示：日志级别会在重启后重置为 Info');
  logger.info('如需持久化设置，请使用命令：Developer: Set Log Level...');
  context.subscriptions.push(logger);

  // 初始化 Axios 全局拦截器
  initializeAxiosInterceptors(logger);

  // 注册查看日志命令
  const showLogsCommand = vscode.commands.registerCommand('maximoScript.showLogs', () => {
    logger.show();
  });
  context.subscriptions.push(showLogsCommand);

  // 注册设置日志级别命令
  const setLogLevelCommand = vscode.commands.registerCommand('maximoScript.setLogLevel', async () => {
    const levels = [
      { label: 'Trace (最详细)', value: vscode.LogLevel.Trace },
      { label: 'Debug', value: vscode.LogLevel.Debug },
      { label: 'Info (默认)', value: vscode.LogLevel.Info },
      { label: 'Warning', value: vscode.LogLevel.Warning },
      { label: 'Error (仅错误)', value: vscode.LogLevel.Error }
    ];
    
    const selected = await vscode.window.showQuickPick(
      levels.map(l => ({ label: l.label, description: '', value: l.value })),
      { placeHolder: '选择日志级别' }
    );
    
    if (selected) {
      // 注意：LogOutputChannel 的 logLevel 是只读的，这里只是提示用户
      vscode.window.showInformationMessage(
        `当前选择的日志级别: ${selected.label}\n\n` +
        `请在输出面板中手动设置：\n` +
        `1. 打开输出面板 (Ctrl+Shift+U)\n` +
        `2. 选择 "Maximo Script Helper"\n` +
        `3. 点击右下角的日志级别图标`
      );
    }
  });
  context.subscriptions.push(setLogLevelCommand);

  // 注册配置命令
  const configCommand = vscode.commands.registerCommand('maximoScript.showConfig', () => {
    ConfigPanel.createOrShow(context.extensionUri);
  });

  context.subscriptions.push(configCommand);

  // 创建状态栏按钮 - 配置
  const configStatusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  configStatusItem.text = '$(gear) Maximo配置';
  configStatusItem.tooltip = '点击打开 Maximo Script 配置面板';
  configStatusItem.command = 'maximoScript.showConfig';
  configStatusItem.show();
  context.subscriptions.push(configStatusItem);

  // 创建状态栏按钮 - 查看日志
  const logStatusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    98
  );
  logStatusItem.text = '$(output) 日志';
  logStatusItem.tooltip = '点击查看插件日志';
  logStatusItem.command = 'maximoScript.showLogs';
  logStatusItem.show();
  context.subscriptions.push(logStatusItem);

  // 创建补全模式切换器
  const modeSwitcher = new CompletionModeSwitcher(context);
  context.subscriptions.push(modeSwitcher);

  // 注册代码补全提供者（仅支持 JavaScript）
  const completionProvider = new CompletionProvider(logger);
  
  // JavaScript 语言选择器
  const jsSelector: vscode.DocumentSelector = { 
    scheme: 'file', 
    language: 'javascript' 
  };

  // 注册 JavaScript 补全提供者（触发字符：. 和 (）
  const jsCompletion = vscode.languages.registerCompletionItemProvider(
    jsSelector,
    completionProvider,
    '.',
    '('
  );

  context.subscriptions.push(jsCompletion);

  // 监听配置变化
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('maximoScript')) {
        completionProvider.refreshConfig();
        modeSwitcher.updateDisplay();
      }
    })
  );

  // 注册推送到 Maximo 命令
  const pushToMaximoCommand = vscode.commands.registerCommand('maximoScript.pushToMaximo', async () => {
    try {
      const editor = vscode.window.activeTextEditor;
      
      if (!editor) {
        vscode.window.showErrorMessage('没有打开的编辑器');
        return;
      }
      
      const document = editor.document;
      
      // 只处理 JavaScript 文件
      if (document.languageId !== 'javascript') {
        vscode.window.showErrorMessage('只能在 JavaScript 文件中使用此功能');
        return;
      }
      
      // 获取文件名（不含扩展名）作为 autoscript
      const fileName = document.fileName;
      const path = require('path');
      const scriptName = path.basename(fileName, path.extname(fileName));
      
      // 获取文件内容作为 source
      const source = document.getText();
      
      logger.info(`[PushToMaximo] 开始推送脚本: ${scriptName}, 文件路径: ${fileName}`);
      
      // 显示进度提示
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `正在推送脚本: ${scriptName}`,
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: '正在连接 Maximo...' });
          
          // 调用 ConfigPanel 的静态方法，传递文件路径
          const success = await ConfigPanel.pushScriptToMaximo(scriptName, source, logger, fileName);
          
          if (success) {
            logger.info(`[PushToMaximo] ✅ 脚本推送成功: ${scriptName}`);
            vscode.window.showInformationMessage(`脚本 "${scriptName}" 已成功推送到 Maximo`);
          } else {
            logger.error(`[PushToMaximo] ❌ 推送失败: ${scriptName}`);
            vscode.window.showErrorMessage(`推送到 Maximo 失败: ${scriptName}`);
          }
        }
      );
    } catch (error: any) {
      console.log(error);
      logger.error(`[PushToMaximo] ❌ 推送失败: ${error.message}`);
      vscode.window.showErrorMessage(`推送到 Maximo 失败: ${error.message}`);
    }
  });
  context.subscriptions.push(pushToMaximoCommand);
}

export function deactivate() {
  console.log('Maximo Script Helper 已停用');
}

/**
 * 补全模式切换器：提供状态栏快速切换默认模式和反射模式
 */
class CompletionModeSwitcher implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    
    // 创建状态栏项（显示在当前语言模式旁边）
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99 // 优先级略低于配置按钮
    );
    
    // 设置命令
    this.statusBarItem.command = 'maximoScript.toggleCompletionMode';
    
    // 更新显示
    this.updateDisplay();
    this.statusBarItem.show();
    
    // 注册切换命令
    const toggleCommand = vscode.commands.registerCommand(
      'maximoScript.toggleCompletionMode',
      () => this.toggleMode()
    );
    
    this.disposables.push(this.statusBarItem);
    this.disposables.push(toggleCommand);
  }

  /**
   * 实现 Disposable 接口
   */
  public dispose() {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }

  /**
   * 更新状态栏显示
   */
  public updateDisplay() {
    const config = vscode.workspace.getConfiguration('maximoScript');
    const completionMode = config.get('completionMode', 'vscode') as string;
    
    // 根据补全模式显示不同内容
    if (completionMode === 'vscode') {
      this.statusBarItem.text = '$(circle-slash) VSCode 模式';
      this.statusBarItem.tooltip = '当前使用 VSCode 内置补全（插件补全已禁用）\n点击切换为其他模式';
    } else if (completionMode === 'reflection') {
      this.statusBarItem.text = '$(zap) 反射模式';
      this.statusBarItem.tooltip = '当前使用反射模式（通过 JAR 文件实时获取 API）\n点击切换为其他模式';
    } else {
      this.statusBarItem.text = '$(info) 默认模式';
      this.statusBarItem.tooltip = '当前使用默认模式（本地缓存 + 常用 API）\n点击切换为其他模式';
    }
  }

  /**
   * 切换模式
   */
  private async toggleMode() {
    const config = vscode.workspace.getConfiguration('maximoScript');
    const currentMode = config.get('completionMode', 'vscode') as string;
    
    // 显示所有可用的模式供选择
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: '$(circle-slash) VSCode 模式',
          description: '使用 VSCode 内置补全（插件补全已禁用）',
          detail: '完全依赖 VSCode 原生智能感知',
          picked: currentMode === 'vscode'
        },
        {
          label: '$(info) 默认模式',
          description: '使用本地缓存 + 常用 API 列表',
          detail: '适合离线使用或快速开发',
          picked: currentMode === 'default'
        },
        {
          label: '$(zap) 反射模式',
          description: '通过 JAR 文件实时反射获取 API',
          detail: '提供最精确的 API 补全',
          picked: currentMode === 'reflection'
        }
      ],
      {
        placeHolder: '选择补全模式',
        title: 'Maximo 补全模式切换'
      }
    );
    
    if (!choice) {
      return; // 用户取消
    }
    
    // 根据选择更新配置
    let newMode = '';
    if (choice.label.includes('VSCode')) {
      newMode = 'vscode';
    } else if (choice.label.includes('默认')) {
      newMode = 'default';
    } else if (choice.label.includes('反射')) {
      newMode = 'reflection';
    }
    
    if (newMode && newMode !== currentMode) {
      await config.update('completionMode', newMode, vscode.ConfigurationTarget.Global);
      this.updateDisplay();
      vscode.window.showInformationMessage(`已切换为${choice.label.split(' ')[1]}`);
    }
  }
}
