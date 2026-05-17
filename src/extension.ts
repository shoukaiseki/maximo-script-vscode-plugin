import * as vscode from 'vscode';
import { CompletionProvider } from './completionProvider';
import { ConfigPanel } from './configPanel';
import { httpRequestToMaximo, initializeAxiosInterceptors, HttpRequestOptions, HttpResponse } from './httpRequest';

// 导出 HTTP 请求方法和初始化函数，供其他模块使用
export { httpRequestToMaximo, initializeAxiosInterceptors };
export type { HttpRequestOptions, HttpResponse };

export function activate(context: vscode.ExtensionContext) {
  console.log('Maximo Script Helper 已激活');

  // 创建输出通道用于显示日志
  const outputChannel = vscode.window.createOutputChannel('Maximo Script Helper');
  outputChannel.appendLine('Maximo Script Helper 插件已启动');
  context.subscriptions.push(outputChannel);

  // 初始化 Axios 全局拦截器
  initializeAxiosInterceptors(outputChannel);

  // 注册查看日志命令
  const showLogsCommand = vscode.commands.registerCommand('maximoScript.showLogs', () => {
    outputChannel.show();
  });
  context.subscriptions.push(showLogsCommand);

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
  const completionProvider = new CompletionProvider(outputChannel);
  
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
    const jarDirectories = config.get('jarDirectories', []) as string[];
    
    // 根据是否配置了 JAR 目录显示不同内容
    if (jarDirectories && jarDirectories.length > 0) {
      this.statusBarItem.text = '$(zap) 反射模式';
      this.statusBarItem.tooltip = '当前使用反射模式（通过 JAR 文件实时获取 API）\n点击切换为默认模式';
    } else {
      this.statusBarItem.text = '$(info) 默认模式';
      this.statusBarItem.tooltip = '当前使用默认模式（本地缓存 + 常用 API）\n点击切换为反射模式';
    }
  }

  /**
   * 切换模式
   */
  private async toggleMode() {
    const config = vscode.workspace.getConfiguration('maximoScript');
    const jarDirectories = config.get('jarDirectories', []) as string[];
    
    if (jarDirectories && jarDirectories.length > 0) {
      // 当前是反射模式，询问是否切换为默认模式
      const choice = await vscode.window.showQuickPick(
        [
          {
            label: '$(info) 默认模式',
            description: '使用本地缓存 + 常用 API 列表',
            detail: '适合离线使用或快速开发'
          },
          {
            label: '$(zap) 反射模式（当前）',
            description: '通过 JAR 文件实时反射获取 API',
            detail: '提供最精确的 API 补全',
            picked: true
          }
        ],
        {
          placeHolder: '选择补全模式',
          title: 'Maximo 补全模式切换'
        }
      );
      
      if (choice && choice.label.includes('默认模式')) {
        // 清除 JAR 目录配置，切换到默认模式
        await config.update('jarDirectories', [], vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('已切换为默认模式');
      }
    } else {
      // 当前是默认模式，询问是否切换为反射模式
      const choice = await vscode.window.showQuickPick(
        [
          {
            label: '$(info) 默认模式（当前）',
            description: '使用本地缓存 + 常用 API 列表',
            detail: '适合离线使用或快速开发',
            picked: true
          },
          {
            label: '$(zap) 反射模式',
            description: '通过 JAR 文件实时反射获取 API',
            detail: '提供最精确的 API 补全'
          }
        ],
        {
          placeHolder: '选择补全模式',
          title: 'Maximo 补全模式切换'
        }
      );
      
      if (choice && choice.label.includes('反射模式')) {
        // 提示用户配置 JAR 目录
        const action = await vscode.window.showInformationMessage(
          '反射模式需要配置 JAR 目录，是否现在配置？',
          '打开配置',
          '取消'
        );
        
        if (action === '打开配置') {
          vscode.commands.executeCommand('maximoScript.showConfig');
        }
      }
    }
    
    // 更新显示
    this.updateDisplay();
  }
}
