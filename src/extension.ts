import * as vscode from 'vscode';
import { CompletionProvider } from './completionProvider';
import { ConfigPanel } from './configPanel';
import { CreateScriptPanel } from './createScriptPanel';
import { httpRequestToMaximo, initializeAxiosInterceptors, clearJSESSIONID, HttpRequestOptions, HttpResponse, fetchClassReflection, fetchClassReflectionLocal } from './httpRequest';
import { QuickCodeManager } from './quickCodeManager';

// 导出 HTTP 请求方法和初始化函数，供其他模块使用
export { httpRequestToMaximo, initializeAxiosInterceptors, clearJSESSIONID };
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

  // 初始化版本警告状态栏
  ConfigPanel.initVersionStatusBar(context);

  // 注册活动栏视图（左侧扩展图标下方，永久显示）
  const helperViewProvider = new HelperViewProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(HelperViewProvider.viewType, helperViewProvider)
  );

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

  // 监听 JavaScript 文件打开事件，自动扫描 Java 类并触发后台反射获取
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      if (document.languageId === 'javascript' && completionProvider.isAutoGenerateReflectionEnabled()) {
        logger.info(`[AutoReflection] 检测到 JS 文件打开: ${document.fileName}`);
        await completionProvider.scanAndFetchJavaClasses(document);
      }
    })
  );

  // 监听 JavaScript 文件保存事件，重新扫描 Java 类
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.languageId === 'javascript' && completionProvider.isAutoGenerateReflectionEnabled()) {
        logger.info(`[AutoReflection] 检测到 JS 文件保存: ${document.fileName}`);
        await completionProvider.scanAndFetchJavaClasses(document);
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
          const result = await ConfigPanel.pushScriptToMaximo(scriptName, source, logger, fileName);

          if (result.success) {
            logger.info(`[PushToMaximo] ✅ 脚本推送成功: ${scriptName}`);
            vscode.window.showInformationMessage(`脚本 "${scriptName}" 已成功推送到 Maximo`);
          } else {
            logger.error(`[PushToMaximo] ❌ 推送失败: ${scriptName}`);
            const errorMsg = result.errorMessage || '未知错误';
            vscode.window.showErrorMessage(`推送到 Maximo 失败: ${errorMsg}`);
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

  // 注册推送 XML 到 Maximo 命令
  const pushXmlToMaximoCommand = vscode.commands.registerCommand('maximoScript.pushXmlToMaximo', async () => {
    try {
      const editor = vscode.window.activeTextEditor;
      
      if (!editor) {
        vscode.window.showErrorMessage('没有打开的编辑器');
        return;
      }
      
      const document = editor.document;
      
      // 只处理 XML 文件
      if (document.languageId !== 'xml') {
        vscode.window.showErrorMessage('只能在 XML 文件中使用此功能');
        return;
      }
      
      // 获取文件内容
      const xmlContent = document.getText();
      const fileName = document.fileName;
      
      logger.info(`[PushXmlToMaximo] 开始推送 XML: ${fileName}`);
      
      // 显示进度提示
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `正在推送 XML 到 Maximo`,
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: '正在连接 Maximo...' });
          
          // 调用 ConfigPanel 的静态方法推送 XML
          const result = await ConfigPanel.pushXmlToMaximo(xmlContent, logger);

          if (result.success) {
            logger.info(`[PushXmlToMaximo] ✅ XML 推送成功`);
            vscode.window.showInformationMessage(`XML 已成功推送到 Maximo.\n如果没有生效,右键点击,选择"Maximo Script:修复应用xml推送"`);
            // logger.error(`maxauth用户`)
            logger.error(`如果没有生效,右键点击,选择"Maximo Script:修复应用xml推送"`)
            logger.error(`或者web先登录一次应用程序设计器`)
            logger.error(`或者再初始化以下工具箱`)
          } else {
            logger.error(`[PushXmlToMaximo] ❌ 推送失败`);
            const errorMsg = result.errorMessage || '未知错误';
            vscode.window.showErrorMessage(`推送到 Maximo 失败: ${errorMsg}`);
          }
        }
      );
    } catch (error: any) {
      console.log(error);
      logger.error(`[PushXmlToMaximo] ❌ 推送失败: ${error.message}`);
      vscode.window.showErrorMessage(`推送到 Maximo 失败: ${error.message}`);
    }
  });
  context.subscriptions.push(pushXmlToMaximoCommand);

  // 注册 Pull 应用 XML 命令
  const pullAppXmlCommand = vscode.commands.registerCommand('maximoScript.pullAppXml', async (uri?: vscode.Uri) => {
    try {
      let filePath: string | undefined;
      let fileContent: string | undefined;

      if (uri) {
        filePath = uri.fsPath;
        fileContent = require('fs').readFileSync(filePath, 'utf-8');
        logger.info(`[PullAppXml] 从资源管理器右键菜单触发: ${filePath}`);
      } else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage('没有打开的编辑器');
          return;
        }
        const document = editor.document;
        if (document.languageId !== 'xml') {
          vscode.window.showErrorMessage('只能在 XML 文件中使用此功能');
          return;
        }
        filePath = document.fileName;
        fileContent = document.getText();
        logger.info(`[PullAppXml] 从编辑器右键菜单触发: ${filePath}`);
      }

      if (!filePath || !fileContent) {
        vscode.window.showErrorMessage('无法获取文件内容');
        return;
      }

      const path = require('path');
      const fs = require('fs');
      const fileName = path.basename(filePath, '.xml');

      let idMatch = fileContent.match(/<presentation[^>]*\sid=["']([^"']+)["']/i);
      let elementType = 'presentation';
      if (!idMatch) {
        idMatch = fileContent.match(/<systemlib[^>]*\sid=["']([^"']+)["']/i);
        elementType = 'systemlib';
      }
      if (!idMatch) {
        vscode.window.showErrorMessage('未找到 presentation 或 systemlib 元素的 id 属性');
        return;
      }

      const presentationId = idMatch[1];
      logger.info(`[PullAppXml] 文件名: ${fileName}, ${elementType} id: ${presentationId}`);

      if (fileName !== presentationId) {
        const choice = await vscode.window.showWarningMessage(
          `文件名与 id 属性值不同，是否继续？\n文件名: ${fileName}\nid属性: ${presentationId}`,
          { modal: true },
          '确定',
          '取消'
        );
        if (choice !== '确定') {
          logger.info(`[PullAppXml] 用户取消操作`);
          return;
        }
      }

      const config = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = config.get<string>('serverUrl', '');
      if (!serverUrl) {
        vscode.window.showErrorMessage('请先在设置中配置服务器地址');
        return;
      }

      if (!ConfigPanel.checkConfig()) {
        vscode.window.showErrorMessage('配置不完整，请先在配置面板中设置服务器信息');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `正在 Pull 应用 XML: ${presentationId}`,
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: '正在从 Maximo 获取应用 XML...' });

          const hostname = require('os').hostname();
          const aliasNameConfig = vscode.workspace.getConfiguration('maximoScript').get('aliasName', '');
          let screenUrl = `script/SHARPTREE.AUTOSCRIPT.SCREENS/${encodeURIComponent(presentationId)}`;
          const queryParams: string[] = [];
          if (hostname) {
            queryParams.push(`_clenthost=${encodeURIComponent(hostname)}`);
          }
          if (aliasNameConfig) {
            queryParams.push(`_aliasname=${encodeURIComponent(aliasNameConfig)}`);
          }
          if (queryParams.length > 0) {
            screenUrl += '?' + queryParams.join('&');
          }
          const screenResult = await httpRequestToMaximo({
            url: screenUrl,
            method: 'GET'
          });

          if (screenResult.status !== 200 || !screenResult.data) {
            throw new Error(`获取应用 XML 失败: HTTP ${screenResult.status}`);
          }

          const presentation = screenResult.data.presentation;
          if (!presentation) {
            throw new Error(`应用 ${presentationId} 没有 Presentation XML`);
          }

          progress.report({ message: '正在备份原文件...' });

          const os = require('os');
          const backupDir = path.join(os.homedir(), '.sks', 'maxbackup', 'maxappxmlbackup', 'maxappxml');
          if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
          }

          const now = new Date();
          const pad = (n: number, len = 2) => String(n).padStart(len, '0');
          const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`;
          const backupFileName = `${presentationId}_${timestamp}.xml`;
          const backupFilePath = path.join(backupDir, backupFileName);

          fs.copyFileSync(filePath, backupFilePath);
          logger.info(`[PullAppXml] 原文件已备份: ${backupFilePath}`);

          progress.report({ message: '正在写入新文件...' });

          fs.writeFileSync(filePath, presentation, 'utf-8');
          logger.info(`[PullAppXml] ✅ ${presentationId}.xml 已更新`);

          // 如果文件已在编辑器中打开，自动刷新显示
          try {
            const existingEditor = vscode.window.visibleTextEditors.find(e =>
              e.document.fileName === filePath
            );
            if (existingEditor && !existingEditor.document.isDirty) {
              // 切换到该文件并执行 revert 强制从磁盘重新加载
              await vscode.window.showTextDocument(existingEditor.document, {
                viewColumn: existingEditor.viewColumn,
                preserveFocus: true
              });
              await vscode.commands.executeCommand('workbench.action.files.revert');
              logger.info(`[PullAppXml] 已自动刷新编辑器: ${presentationId}.xml`);
            }
          } catch (refreshError: any) {
            logger.warn(`[PullAppXml] 刷新编辑器失败: ${refreshError.message}`);
          }

          vscode.window.showInformationMessage(`应用 XML 已更新: ${presentationId}`);
        }
      );

    } catch (error: any) {
      logger.error(`[PullAppXml] ❌ Pull 失败: ${error.message}`);
      vscode.window.showErrorMessage(`Pull 应用 XML 失败: ${error.message}`);
    }
  });
  context.subscriptions.push(pullAppXmlCommand);

  // 注册修复应用 XML 推送命令
  const repairAppXmlPushCommand = vscode.commands.registerCommand('maximoScript.repairAppXmlPush', async () => {
    try {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showErrorMessage('没有打开的编辑器');
        return;
      }

      const document = editor.document;

      // 只处理 XML 文件
      if (document.languageId !== 'xml') {
        vscode.window.showErrorMessage('只能在 XML 文件中使用此功能');
        return;
      }

      logger.info('[RepairAppXmlPush] 开始修复应用 XML 推送...');

      // 显示进度提示
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: '正在修复应用 XML 推送',
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: '正在连接 Maximo...' });

          // 调用 ConfigPanel 的静态方法
          const result = await ConfigPanel.repairAppXmlPush(logger);

          if (result.success) {
            logger.info('[RepairAppXmlPush] ✅ 修复推送成功');
            vscode.window.showInformationMessage('修复应用 XML 推送成功');
          } else {
            logger.error(`[RepairAppXmlPush] ❌ 修复推送失败: ${result.errorMessage}`);
            vscode.window.showErrorMessage(`修复应用 XML 推送失败: ${result.errorMessage}`);
          }
        }
      );
    } catch (error: any) {
      console.log(error);
      logger.error(`[RepairAppXmlPush] ❌ 修复失败: ${error.message}`);
      vscode.window.showErrorMessage(`修复应用 XML 推送失败: ${error.message}`);
    }
  });
  context.subscriptions.push(repairAppXmlPushCommand);

  // 注册从模板创建脚本命令
  const createScriptFromTemplateCommand = vscode.commands.registerCommand('maximoScript.createScriptFromTemplate', async (uri?: vscode.Uri) => {
    try {
      let targetDir: string;

      if (uri) {
        const fs = require('fs');
        const path = require('path');
        const stat = fs.statSync(uri.fsPath);
        if (stat.isDirectory()) {
          targetDir = uri.fsPath;
        } else {
          targetDir = path.dirname(uri.fsPath);
        }
        logger.info(`[CreateScriptFromTemplate] 从资源管理器触发，目标目录: ${targetDir}`);
      } else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage('没有打开的编辑器');
          return;
        }
        targetDir = require('path').dirname(editor.document.fileName);
        logger.info(`[CreateScriptFromTemplate] 从编辑器触发，目标目录: ${targetDir}`);
      }

      CreateScriptPanel.createOrShow(context.extensionUri, targetDir);

    } catch (error: any) {
      logger.error(`[CreateScriptFromTemplate] ❌ 创建脚本失败: ${error.message}`);
      vscode.window.showErrorMessage(`创建脚本失败: ${error.message}`);
    }
  });
  context.subscriptions.push(createScriptFromTemplateCommand);

  const importScriptFromJsonCommand = vscode.commands.registerCommand('maximoScript.importScriptFromJson', async (uri?: vscode.Uri) => {
    try {
      if (!uri) {
        vscode.window.showErrorMessage('请选择要导入的 JSON 文件');
        return;
      }

      const fs = require('fs');
      const path = require('path');
      const jsonFilePath = uri.fsPath;

      if (!fs.existsSync(jsonFilePath)) {
        vscode.window.showErrorMessage('文件不存在');
        return;
      }

      const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8');
      const scriptConfig = JSON.parse(jsonContent);
      const scriptName = scriptConfig.autoscript;

      if (!scriptName) {
        vscode.window.showErrorMessage('JSON 文件中未找到 autoscript 字段');
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `确定要导入脚本 "${scriptName}" 到 Maximo 吗？`,
        { modal: true },
        '确定',
        '取消'
      );

      if (confirm !== '确定') {
        return;
      }

      const jsFilePath = path.join(path.dirname(jsonFilePath), `${scriptName}.js`);
      let source = '';
      if (fs.existsSync(jsFilePath)) {
        source = fs.readFileSync(jsFilePath, 'utf-8');
      } else if (scriptConfig.source) {
        source = scriptConfig.source;
      }

      if (!source) {
        vscode.window.showErrorMessage('未找到脚本源代码，请确保存在同名的 .js 文件');
        return;
      }

      const result = await ConfigPanel.importScriptFromJson(scriptName, source, scriptConfig, logger, jsFilePath);

      if (result.success) {
        logger.info(`[ImportScriptFromJson] ✅ 脚本导入成功: ${scriptName}`);
        vscode.window.showInformationMessage(`脚本 "${scriptName}" 已成功导入到 Maximo`);
      } else {
        logger.error(`[ImportScriptFromJson] ❌ 脚本导入失败: ${result.errorMessage}`);
        vscode.window.showErrorMessage(`脚本导入失败: ${result.errorMessage}`);
      }

    } catch (error: any) {
      logger.error(`[ImportScriptFromJson] ❌ 导入脚本失败: ${error.message}`);
      vscode.window.showErrorMessage(`导入脚本失败: ${error.message}`);
    }
  });
  context.subscriptions.push(importScriptFromJsonCommand);

  // 注册 Pull 自动化脚本命令（右键 JS 文件）
  const pullScriptFromJsCommand = vscode.commands.registerCommand('maximoScript.pullScriptFromJs', async (uri?: vscode.Uri) => {
    try {
      // 支持编辑器右键和资源管理器右键
      let jsFilePath: string | undefined;
      if (uri && uri.fsPath) {
        jsFilePath = uri.fsPath;
      } else {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'javascript') {
          jsFilePath = editor.document.uri.fsPath;
        }
      }

      if (!jsFilePath) {
        vscode.window.showErrorMessage('请打开或选中要 Pull 的 JS 文件');
        return;
      }

      await ConfigPanel.pullScriptFromJs(jsFilePath, logger);

    } catch (error: any) {
      logger.error(`[PullScriptFromJs] ❌ Pull 自动化脚本失败: ${error.message}`);
      vscode.window.showErrorMessage(`Pull 自动化脚本失败: ${error.message}`);
    }
  });
  context.subscriptions.push(pullScriptFromJsCommand);

  // 注册手动获取反射信息命令
  const fetchReflectionCommand = vscode.commands.registerCommand('maximoScript.fetchReflection', async () => {
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
      
      // 获取选中的文本
      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showErrorMessage('请先选中一个 Java 类名（如：java.util.Base64$Encoder）');
        return;
      }
      
      const selectedText = document.getText(selection).trim();
      
      if (!selectedText) {
        vscode.window.showErrorMessage('选中的文本为空');
        return;
      }
      
      logger.info(`[FetchReflection] 用户选中类名: ${selectedText}`);
      
      // 验证类名格式（简单的正则检查）
      const classNamePattern = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)*(\$[A-Z][a-zA-Z0-9]*)*$/;
      if (!classNamePattern.test(selectedText)) {
        const confirm = await vscode.window.showWarningMessage(
          `"${selectedText}" 看起来不是一个合法的 Java 类名。`,
          { modal: true },
          '仍然尝试',
          '取消'
        );
        
        if (confirm !== '仍然尝试') {
          return;
        }
      }
      
      // 显示进度提示
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `正在获取反射信息: ${selectedText}`,
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: '正在连接 Maximo...' });
          
          try {
            // 调用反射接口
            const reflectionData = await fetchClassReflection(selectedText, logger);
            
            if (!reflectionData || reflectionData.status === 'error') {
              const errorMsg = reflectionData?.message || '未知错误';
              logger.error(`[FetchReflection] ❌ 获取失败: ${errorMsg}`);
              vscode.window.showErrorMessage(`获取反射信息失败: ${errorMsg}`);
              return;
            }
            
            progress.report({ message: '正在保存数据并生成文件...' });
            
            // 使用 completionProvider 的私有方法保存数据
            // 注意：这里需要访问 completionProvider 实例
            // 由于 triggerReflectionFetch 是私有的，我们需要通过反射管理器直接操作
            
            // 获取工作区根目录
            const path = require('path');
            const fs = require('fs');
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
              vscode.window.showErrorMessage('未检测到工作区，请先打开一个文件夹');
              return;
            }
            
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const userHome = require('os').homedir();
            const reflectionDataDir = path.join(userHome, '.sks', 'maximo-script-helper', 'reflection-data');
            const javaapiDir = path.join(workspaceRoot, 'javaapi');
            
            // 1. 保存 JSON 到 reflection-data 目录
            const jsonRelativePath = selectedText.replace(/\./g, path.sep) + '.json';
            const jsonFullPath = path.join(reflectionDataDir, jsonRelativePath);
            const jsonDir = path.dirname(jsonFullPath);
            if (!fs.existsSync(jsonDir)) {
              fs.mkdirSync(jsonDir, { recursive: true });
            }
            fs.writeFileSync(jsonFullPath, JSON.stringify(reflectionData, null, 2), 'utf-8');
            logger.info(`[FetchReflection] 💾 保存 JSON: ${jsonRelativePath}`);
            
            // 2. 生成 .d.ts 文件到 javaapi 目录
            const generator = new (require('./dtsGenerator').DtsGenerator)();
            const dtsContent = generator.generateDtsContent(reflectionData);
            
            const parsed = generator.parseClassName(selectedText);
            const dtsRelativePath = parsed.packageName ? 
              path.join(parsed.packageName.replace(/\./g, path.sep), `${parsed.simpleClassName}.d.ts`) :
              `${parsed.simpleClassName}.d.ts`;
            
            const dtsFullPath = path.join(javaapiDir, dtsRelativePath);
            const dtsDir = path.dirname(dtsFullPath);
            if (!fs.existsSync(dtsDir)) {
              fs.mkdirSync(dtsDir, { recursive: true });
            }
            fs.writeFileSync(dtsFullPath, dtsContent, 'utf-8');
            logger.info(`[FetchReflection] 💾 生成 .d.ts: ${dtsRelativePath}`);
            
            // 3. 更新 .maximoScriptClass 缓存
            const cacheFilePath = path.join(javaapiDir, '.maximoScriptClass.json');
            let cacheData: Record<string, any> = {};
            if (fs.existsSync(cacheFilePath)) {
              try {
                cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
              } catch (e) {
                cacheData = {};
              }
            }
            cacheData[selectedText] = {
              lastUpdated: new Date().toISOString(),
              status: 'success'
            };
            fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2), 'utf-8');
            logger.info(`[FetchReflection] 📝 已更新 .maximoScriptClass 缓存`);
            
            // 4. 更新 global.d.ts
            const globalDtsPath = path.join(javaapiDir, 'global.d.ts');
            let existingContent = '';
            let existingReferences: string[] = [];
            let otherContent: string[] = [];
            
            if (fs.existsSync(globalDtsPath)) {
              existingContent = fs.readFileSync(globalDtsPath, 'utf-8');
              const lines = existingContent.split('\n');
              lines.forEach(line => {
                const refMatch = line.match(/^\/\/\/\s*<reference\s+path="\.?\/?([^"]+)"\s*\/>/);
                if (refMatch) {
                  const normalizedPath = refMatch[1].replace(/^\.?\//, '');
                  existingReferences.push(normalizedPath);
                } else if (line.trim() !== '') {
                  otherContent.push(line);
                }
              });
            }
            
            const normalizedNewRef = dtsRelativePath.replace(/^\.?\//, '').replace(/\\/g, '/');
            const allReferences = [...new Set([...existingReferences, normalizedNewRef])];
            const referenceLines = allReferences.map(ref => `/// <reference path="./${ref}" />`);
            
            let globalContent = referenceLines.join('\n') + '\n';
            if (otherContent.length > 0) {
              globalContent += '\n' + otherContent.join('\n') + '\n';
            }
            
            fs.writeFileSync(globalDtsPath, globalContent, 'utf-8');
            logger.info(`[FetchReflection] 📝 已更新 global.d.ts`);
            
            logger.info(`[FetchReflection] ✅ 成功完成所有操作`);
            
            // 显示成功消息
            vscode.window.showInformationMessage(
              `✅ 已成功获取并生成 ${parsed.simpleClassName}.d.ts`,
              '打开文件'
            ).then(choice => {
              if (choice === '打开文件') {
                vscode.workspace.openTextDocument(dtsFullPath).then(doc => {
                  vscode.window.showTextDocument(doc);
                });
              }
            });
            
          } catch (error: any) {
            logger.error(`[FetchReflection] ❌ 处理失败: ${error.message}`);
            vscode.window.showErrorMessage(`获取反射信息失败: ${error.message}`);
          }
        }
      );
    } catch (error: any) {
      console.log(error);
      logger.error(`[FetchReflection] ❌ 命令执行失败: ${error.message}`);
      vscode.window.showErrorMessage(`获取反射信息失败: ${error.message}`);
    }
  });
  context.subscriptions.push(fetchReflectionCommand);

  // 注册本地反射获取命令
  const fetchReflectionLocalCommand = vscode.commands.registerCommand('maximoScript.fetchReflectionLocal', async () => {
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
      
      // 获取选中的文本
      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showErrorMessage('请先选中一个 Java 类名（如：java.util.Base64$Encoder）');
        return;
      }
      
      const selectedText = document.getText(selection).trim();
      
      if (!selectedText) {
        vscode.window.showErrorMessage('选中的文本为空');
        return;
      }
      
      logger.info(`[FetchReflectionLocal] 用户选中类名: ${selectedText}`);
      
      // 验证类名格式（简单的正则检查）
      const classNamePattern = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)*(\$[A-Z][a-zA-Z0-9]*)*$/;
      if (!classNamePattern.test(selectedText)) {
        const confirm = await vscode.window.showWarningMessage(
          `"${selectedText}" 看起来不是一个合法的 Java 类名。`,
          { modal: true },
          '仍然尝试',
          '取消'
        );
        
        if (confirm !== '仍然尝试') {
          return;
        }
      }
      
      // 显示进度提示
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `正在通过本地反射获取信息: ${selectedText}`,
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: '正在执行 Java 反射...' });
          
          try {
            // 调用本地反射接口
            const reflectionData = await fetchClassReflectionLocal(selectedText, logger);
            
            if (!reflectionData || reflectionData.status === 'error') {
              const errorMsg = reflectionData?.message || '未知错误';
              logger.error(`[FetchReflectionLocal] ❌ 获取失败: ${errorMsg}`);
              vscode.window.showErrorMessage(`获取反射信息失败: ${errorMsg}`);
              return;
            }
            
            progress.report({ message: '正在保存数据并生成文件...' });
            
            // 使用 completionProvider 的私有方法保存数据
            // 注意：这里需要访问 completionProvider 实例
            // 由于 triggerReflectionFetch 是私有的，我们需要通过反射管理器直接操作
            
            // 获取工作区根目录
            const path = require('path');
            const fs = require('fs');
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
              vscode.window.showErrorMessage('未检测到工作区，请先打开一个文件夹');
              return;
            }
            
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const userHome = require('os').homedir();
            const reflectionDataDir = path.join(userHome, '.sks', 'maximo-script-helper', 'reflection-data');
            const javaapiDir = path.join(workspaceRoot, 'javaapi');
            
            // 1. 保存 JSON 到 reflection-data 目录
            const jsonRelativePath = selectedText.replace(/\./g, path.sep) + '.json';
            const jsonFullPath = path.join(reflectionDataDir, jsonRelativePath);
            const jsonDir = path.dirname(jsonFullPath);
            if (!fs.existsSync(jsonDir)) {
              fs.mkdirSync(jsonDir, { recursive: true });
            }
            fs.writeFileSync(jsonFullPath, JSON.stringify(reflectionData, null, 2), 'utf-8');
            logger.info(`[FetchReflectionLocal] ✅ JSON 已保存: ${jsonFullPath}`);
            
            // 2. 生成 .d.ts 文件
            const { DtsGenerator } = require('./dtsGenerator');
            const dtsGenerator = new DtsGenerator();
            const dtsContent = dtsGenerator.generateDtsContent(reflectionData);
            
            // 计算 .d.ts 文件路径
            const dtsRelativePath = selectedText.replace(/\./g, path.sep) + '.d.ts';
            const dtsFullPath = path.join(javaapiDir, dtsRelativePath);
            const dtsDir = path.dirname(dtsFullPath);
            if (!fs.existsSync(dtsDir)) {
              fs.mkdirSync(dtsDir, { recursive: true });
            }
            fs.writeFileSync(dtsFullPath, dtsContent, 'utf-8');
            logger.info(`[FetchReflectionLocal] ✅ .d.ts 已生成: ${dtsFullPath}`);
            
            // 3. 更新 global.d.ts
            const globalDtsPath = path.join(javaapiDir, 'global.d.ts');
            let existingContent = '';
            if (fs.existsSync(globalDtsPath)) {
              existingContent = fs.readFileSync(globalDtsPath, 'utf-8');
            }
            
            // 提取现有的 reference 行
            const referenceLines = existingContent.split('\n')
              .filter(line => line.trim().startsWith('/// <reference'));
            
            // 提取其他内容
            const otherContent = existingContent.split('\n')
              .filter(line => !line.trim().startsWith('/// <reference'))
              .join('\n');
            
            // 添加新的 reference
            const newReference = `/// <reference path="${dtsRelativePath.replace(/\\/g, '/')}" />`;
            if (!referenceLines.includes(newReference)) {
              referenceLines.push(newReference);
            }
            
            // 重新构建 global.d.ts
            const newGlobalContent = referenceLines.join('\n') + '\n' + otherContent;
            fs.writeFileSync(globalDtsPath, newGlobalContent, 'utf-8');
            logger.info(`[FetchReflectionLocal] ✅ global.d.ts 已更新`);
            
            // 4. 更新缓存记录
            const cachePath = path.join(javaapiDir, '.maximoScriptClass.json');
            let cacheData: any = {};
            if (fs.existsSync(cachePath)) {
              cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
            }
            
            cacheData[selectedText] = {
              lastFetched: new Date().toISOString(),
              source: 'local',
              retryCount: 0
            };
            
            fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
            logger.info(`[FetchReflectionLocal] ✅ 缓存已更新`);
            
            progress.report({ message: '完成！' });
            
            logger.info(`[FetchReflectionLocal] ✅ 成功完成所有操作`);
            
            // 解析类名获取简单类名
            const parts = selectedText.split('.');
            const simpleClassName = parts[parts.length - 1].split('$').pop();
            
            // 显示成功消息
            vscode.window.showInformationMessage(
              `✅ 已成功获取并生成 ${simpleClassName}.d.ts（本地反射）`,
              '打开文件'
            ).then(choice => {
              if (choice === '打开文件') {
                vscode.workspace.openTextDocument(dtsFullPath).then(doc => {
                  vscode.window.showTextDocument(doc);
                });
              }
            });
            
          } catch (error: any) {
            logger.error(`[FetchReflectionLocal] ❌ 处理失败: ${error.message}`);
            vscode.window.showErrorMessage(`获取反射信息失败: ${error.message}`);
          }
        }
      );
    } catch (error: any) {
      console.log(error);
      logger.error(`[FetchReflectionLocal] ❌ 命令执行失败: ${error.message}`);
      vscode.window.showErrorMessage(`获取反射信息失败: ${error.message}`);
    }
  });
  context.subscriptions.push(fetchReflectionLocalCommand);

  // 注册修复XML重复ID命令
  const fixXmlIdsCommand = vscode.commands.registerCommand('maximoScript.fixXmlIds', async () => {
    try {
      const editor = vscode.window.activeTextEditor;
      
      if (!editor) {
        vscode.window.showErrorMessage('没有打开的编辑器');
        return;
      }
      
      const document = editor.document;
      
      // 只处理 XML 文件
      if (document.languageId !== 'xml') {
        vscode.window.showErrorMessage('只能在 XML 文件中使用此功能');
        return;
      }
      
      const fullText = document.getText();
      
      // 1. 找出所有注释区域，避免修改注释内的 id
      const commentRanges: Array<{start: number, end: number}> = [];
      const commentRegex = /<!--[\s\S]*?-->/g;
      let commentMatch;
      while ((commentMatch = commentRegex.exec(fullText)) !== null) {
        commentRanges.push({ start: commentMatch.index, end: commentMatch.index + commentMatch[0].length });
      }
      
      // 判断某个位置是否在注释内
      const isInComment = (pos: number): boolean => {
        return commentRanges.some(r => pos >= r.start && pos < r.end);
      };
      
      // 2. 找出所有 id="..." 属性（匹配 id="value" 或 id='value'）
      const idAttrRegex = /\bid\s*=\s*"([^"]*)"/g;
      const idOccurrences: Array<{matchStart: number, matchEnd: number, valueStart: number, valueEnd: number, value: string}> = [];
      let idMatch;
      while ((idMatch = idAttrRegex.exec(fullText)) !== null) {
        if (!isInComment(idMatch.index)) {
          idOccurrences.push({
            matchStart: idMatch.index,
            matchEnd: idMatch.index + idMatch[0].length,
            valueStart: idMatch.index + idMatch[0].indexOf(idMatch[1]),
            valueEnd: idMatch.index + idMatch[0].indexOf(idMatch[1]) + idMatch[1].length,
            value: idMatch[1]
          });
        }
      }
      
      if (idOccurrences.length === 0) {
        vscode.window.showInformationMessage('未找到任何 id 属性');
        return;
      }
      
      // 3. 找出重复的 id
      const seenIds = new Map<string, number>(); // id value -> first occurrence index
      const duplicates: Array<{index: number, oldValue: string}> = [];
      
      for (let i = 0; i < idOccurrences.length; i++) {
        const occ = idOccurrences[i];
        if (seenIds.has(occ.value)) {
          duplicates.push({ index: i, oldValue: occ.value });
        } else {
          seenIds.set(occ.value, i);
        }
      }
      
      if (duplicates.length === 0) {
        vscode.window.showInformationMessage(`共找到 ${idOccurrences.length} 个 id 属性，没有重复的 id`);
        return;
      }
      
      // 4. 生成新的唯一 ID
      // const generateNewId = (): string => {
      //   const chars = '0123456789abcdef';
      //   let result = 'crea';
      //   for (let i = 0; i < 8; i++) {
      //     result += chars[Math.floor(Math.random() * chars.length)];
      //   }
      //   result = 'tach_id_'+result;
      //   for (let i = 0; i < 8; i++) {
      //     result += chars[Math.floor(Math.random() * chars.length)];
      //   }
      //   return result;
      // };
      const generateNewId = (): string => {
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

        // 提取一个生成指定长度随机字符串的辅助函数
        const getRandomString = (length: number): string => {
          let res = "";
          for (let i = 0; i < length; i++) {
            res += chars[Math.floor(Math.random() * chars.length)];
          }
          return res;
        };

        // 使用模板字符串直接拼接最终结果
        // let newId = `tach_id_crea${getRandomString(8)}${getRandomString(8)}`;
        let newId = `${getRandomString(8)}${getRandomString(8)}`;
        return newId;
      };

      
      // 确保新ID不会与现有的重复
      const allExistingIds = new Set(idOccurrences.map(o => o.value));
      const newIdSet = new Set<string>();
      
      const getUniqueId = (): string => {
        let newId = generateNewId();
        let attempts = 0;
        while ((allExistingIds.has(newId) || newIdSet.has(newId)) && attempts < 100) {
          newId = generateNewId();
          attempts++;
        }
        newIdSet.add(newId);
        return newId;
      };
      
      // 5. 从后往前替换（避免偏移变化）
      const edits: Array<{range: vscode.Range, newText: string}> = [];
      for (const dup of duplicates) {
        const occ = idOccurrences[dup.index];
        const newId = getUniqueId();
        const startPos = document.positionAt(occ.valueStart);
        const endPos = document.positionAt(occ.valueEnd);
        edits.push({
          range: new vscode.Range(startPos, endPos),
          newText: newId
        });
      }
      
      // 按位置倒序排列
      edits.sort((a, b) => {
        const lineDiff = b.range.start.line - a.range.start.line;
        if (lineDiff !== 0) { return lineDiff; }
        return b.range.start.character - a.range.start.character;
      });
      
      // 应用编辑
      const success = await editor.edit(editBuilder => {
        for (const edit of edits) {
          editBuilder.replace(edit.range, edit.newText);
        }
      });
      
      if (success) {
        logger.info(`[FixXmlIds] ✅ 修复了 ${duplicates.length} 个重复的 id`);
        vscode.window.showInformationMessage(`修复完成！共修复了 ${duplicates.length} 个重复的 id 属性`);
      } else {
        logger.error('[FixXmlIds] ❌ 编辑失败');
        vscode.window.showErrorMessage('修复失败，请重试');
      }
    } catch (error: any) {
      console.log(error);
      logger.error(`[FixXmlIds] ❌ 执行失败: ${error.message}`);
      vscode.window.showErrorMessage(`修复失败: ${error.message}`);
    }
  });
  context.subscriptions.push(fixXmlIdsCommand);
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

/**
 * 活动栏视图提供者：在左侧活动栏（扩展图标下方）提供 Maximo 配置入口和快捷代码插入
 */
class HelperViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'maximoScript.helperView';

  private _view?: vscode.WebviewView;
  private _quickCodeManager: QuickCodeManager;
  private _context: vscode.ExtensionContext;

  constructor(private readonly _extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
    this._quickCodeManager = new QuickCodeManager(_extensionUri);
    this._context = context;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'openConfig':
          vscode.commands.executeCommand('maximoScript.showConfig');
          break;
        case 'showLogs':
          vscode.commands.executeCommand('maximoScript.showLogs');
          break;
        case 'loadQuickCode':
          this._quickCodeManager.refresh();
          const data = this._quickCodeManager.loadConfig();
          const showRemark = this._context.globalState.get('quickCodeShowRemark', true);
          this._postMessage({ command: 'quickCodeData', data, showRemark });
          break;
        case 'insertCode':
          await this._insertCode(message.code);
          break;
        case 'copyCode':
          await vscode.env.clipboard.writeText(message.code);
          vscode.window.showInformationMessage('代码已复制到剪贴板');
          break;
        case 'openQuickCodeConfig':
          await this._quickCodeManager.openUserYaml();
          break;
        case 'saveRemarkVisibility':
          await this._context.globalState.update('quickCodeShowRemark', message.showRemark);
          break;
      }
    });
  }

  private _postMessage(message: any): void {
    this._view?.webview.postMessage(message);
  }

  /** 插入代码到当前编辑器光标位置 */
  private async _insertCode(code: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('请先打开一个文件');
      return;
    }
    await editor.edit(editBuilder => {
      editBuilder.insert(editor.selection.active, code);
    });
  }

  private _getHtml(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {
    padding: 0; margin: 0;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background-color: var(--vscode-sideBar-background);
  }
  .header {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; margin-bottom: 0;
    font-size: 13px; font-weight: 600;
    color: var(--vscode-sideBarTitle-foreground);
    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
  }
  .header .logo { font-size: 16px; }

  /* 标签页 */
  .tabs {
    display: flex; border-bottom: 1px solid var(--vscode-panel-border);
  }
  .tab {
    flex: 1; padding: 8px 0; text-align: center;
    font-size: 12px; cursor: pointer;
    color: var(--vscode-foreground); opacity: 0.7;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  .tab:hover { opacity: 1; background: var(--vscode-list-hoverBackground); }
  .tab.active {
    opacity: 1;
    border-bottom-color: var(--vscode-textLink-foreground);
    color: var(--vscode-textLink-foreground);
  }
  .tab-content { display: none; }
  .tab-content.active { display: block; }

  /* 快捷操作 */
  .btn {
    display: flex; align-items: center; gap: 8px;
    width: 100%; padding: 8px 10px; margin-bottom: 8px;
    border: 1px solid var(--vscode-button-border, transparent);
    border-radius: 4px;
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    font-size: 13px; cursor: pointer; text-align: left; box-sizing: border-box;
  }
  .btn:hover { background-color: var(--vscode-button-secondaryHoverBackground); }
  .btn .icon { font-size: 14px; }
  .container { padding: 10px; }
  .desc {
    padding: 0 10px; margin-top: 10px;
    font-size: 12px; color: var(--vscode-descriptionForeground); line-height: 1.6;
  }

  /* 快捷代码 */
  .qc-type-header {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 8px; margin-top: 8px;
    font-size: 12px; font-weight: 700;
    color: var(--vscode-textLink-foreground);
    border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
    user-select: none;
  }
  .qc-type-header .type-icon { font-size: 13px; }
  .qc-toolbar {
    padding: 8px 10px 4px;
  }
  .qc-search {
    width: 100%;
    padding: 4px 6px 4px 22px; font-size: 12px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px; outline: none;
    box-sizing: border-box;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: 6px center;
  }
  .qc-actions {
    display: flex; gap: 4px; padding: 0 10px 6px;
    flex-wrap: wrap; align-items: center;
  }
  .qc-action-btn {
    padding: 3px 8px; font-size: 11px;
    background: transparent; color: var(--vscode-textLink-foreground);
    border: 1px solid var(--vscode-textLink-foreground);
    border-radius: 3px; cursor: pointer;
  }
  .qc-action-btn:hover {
    background: var(--vscode-textLink-foreground); color: white;
  }
  .qc-checkbox {
    display: flex; align-items: center; gap: 4px;
    font-size: 11px; color: var(--vscode-foreground);
    cursor: pointer; margin-left: auto;
    user-select: none;
  }
  .qc-checkbox input {
    margin: 0; cursor: pointer;
  }

  /* 树形结构 */
  .qc-tree { padding: 0 6px 10px; }
  .qc-group {
    margin-bottom: 2px;
  }
  .qc-group-header {
    display: flex; align-items: center; gap: 4px;
    padding: 5px 8px; cursor: pointer;
    border-radius: 3px; font-size: 12px; font-weight: 600;
    color: var(--vscode-foreground);
    user-select: none;
  }
  .qc-group-header:hover { background: var(--vscode-list-hoverBackground); }
  .qc-group-header .arrow {
    font-size: 10px; transition: transform 0.15s;
    color: var(--vscode-descriptionForeground);
    width: 14px; text-align: center; flex-shrink: 0;
  }
  .qc-group-header .arrow.open { transform: rotate(90deg); }
  .qc-group-body { display: none; padding-left: 12px; }
  .qc-group-body.open { display: block; }

  .qc-item {
    padding: 4px 8px 4px 20px;
    border-radius: 3px; cursor: pointer;
    font-size: 12px; color: var(--vscode-foreground);
    user-select: none; position: relative;
  }
  .qc-item:hover { background: var(--vscode-list-hoverBackground); }
  .qc-item.has-children {
    font-weight: 500; padding-left: 8px;
  }
  .qc-item .item-arrow {
    display: inline-block; width: 14px; font-size: 10px;
    color: var(--vscode-descriptionForeground);
    transition: transform 0.15s;
  }
  .qc-item .item-arrow.open { transform: rotate(90deg); }
  .qc-item-children { display: none; padding-left: 12px; }
  .qc-item-children.open { display: block; }

  .qc-leaf {
    display: flex; align-items: center; justify-content: space-between;
    padding: 3px 8px 3px 28px;
    border-radius: 3px;
    font-size: 12px; color: var(--vscode-foreground);
    user-select: none;
  }
  .qc-leaf:hover { background: var(--vscode-list-hoverBackground); }
  .qc-leaf .leaf-name {
    display: flex; align-items: center; gap: 4px;
    flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;
  }
  .qc-leaf .leaf-icon {
    color: var(--vscode-textLink-foreground); flex-shrink: 0;
  }
  .qc-leaf-btns {
    display: none; gap: 3px; flex-shrink: 0; margin-left: 6px;
  }
  .qc-leaf:hover .qc-leaf-btns { display: flex; }
  .qc-leaf-btn {
    padding: 1px 6px; font-size: 10px;
    background: transparent; color: var(--vscode-textLink-foreground);
    border: 1px solid var(--vscode-textLink-foreground);
    border-radius: 3px; cursor: pointer;
    line-height: 1.4;
  }
  .qc-leaf-btn:hover {
    background: var(--vscode-textLink-foreground); color: white;
  }
  .qc-remark {
    font-size: 11px; color: var(--vscode-descriptionForeground);
    padding: 1px 8px 4px 28px; line-height: 1.4;
    display: none;
  }
  .qc-remark.show { display: block; }

  .qc-empty {
    padding: 20px 10px; text-align: center;
    font-size: 12px; color: var(--vscode-descriptionForeground);
  }

  /* 变量对话框 */
  .var-dialog-overlay {
    display: none; position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 100;
    align-items: center; justify-content: center;
  }
  .var-dialog-overlay.show { display: flex; }
  .var-dialog {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px; padding: 16px;
    width: 300px; max-width: 90vw;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  }
  .var-dialog h4 {
    margin: 0 0 12px; font-size: 13px; font-weight: 600;
    color: var(--vscode-foreground);
  }
  .var-field { margin-bottom: 10px; }
  .var-field label {
    display: block; margin-bottom: 3px;
    font-size: 12px; font-weight: 500;
    color: var(--vscode-foreground);
  }
  .var-field .var-hint {
    font-size: 11px; color: var(--vscode-descriptionForeground);
    margin-bottom: 3px;
  }
  .var-field input {
    width: 100%; padding: 5px 8px;
    font-size: 12px; box-sizing: border-box;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px; outline: none;
  }
  .var-field input:focus { border-color: var(--vscode-focusBorder); }
  .var-preview {
    margin-top: 8px; padding: 8px;
    background: var(--vscode-textBlockQuote-background);
    border-left: 3px solid var(--vscode-textBlockQuote-border);
    border-radius: 3px; font-size: 11px;
    font-family: monospace;
    color: var(--vscode-foreground);
    max-height: 100px; overflow-y: auto;
    white-space: pre-wrap; word-break: break-all;
  }
  .var-btns {
    display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px;
  }
  .var-btns button {
    padding: 5px 14px; font-size: 12px;
    border: none; border-radius: 3px; cursor: pointer;
  }
  .var-btn-cancel {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  .var-btn-insert {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  .var-btn-insert:hover { opacity: 0.9; }
</style>
</head>
<body>
  <div class="header">
    <span class="logo">⚙</span>
    <span>Maximo Script Helper</span>
  </div>

  <div class="tabs">
    <div class="tab active" data-tab="actions">快捷操作</div>
    <div class="tab" data-tab="quickcode">快捷代码</div>
  </div>

  <!-- 快捷操作标签页 -->
  <div id="tab-actions" class="tab-content active">
    <div class="container">
      <button class="btn" id="btnOpenConfig">
        <span class="icon">⚙</span><span>打开配置</span>
      </button>
      <button class="btn" id="btnShowLogs">
        <span class="icon">📄</span><span>查看日志</span>
      </button>
      <div class="desc">
        Maximo 自动化脚本开发助手<br/>
        配置 · 导出 · 补全
      </div>
    </div>
  </div>

  <!-- 快捷代码标签页 -->
  <div id="tab-quickcode" class="tab-content">
    <div class="qc-toolbar">
      <input class="qc-search" id="searchInput" type="text" placeholder="搜索快捷代码..." />
    </div>
    <div class="qc-actions">
      <button class="qc-action-btn" id="btnToggleAll">📂 全部展开</button>
      <button class="qc-action-btn" id="btnRefreshQC">🔄 刷新</button>
      <button class="qc-action-btn" id="btnEditConfig">📝 编辑配置</button>
      <label class="qc-checkbox">
        <input type="checkbox" id="chkShowRemark" checked />
        <span>显示备注</span>
      </label>
    </div>
    <div class="qc-tree" id="treeContainer">
      <div class="qc-empty">加载中...</div>
    </div>
  </div>

  <!-- 变量对话框 -->
  <div class="var-dialog-overlay" id="varDialog">
    <div class="var-dialog">
      <h4 id="varDialogTitle">填写变量</h4>
      <div id="varFields"></div>
      <div class="var-preview" id="varPreview"></div>
      <div class="var-btns">
        <button class="var-btn-cancel" id="btnCancelVar">取消</button>
        <button class="var-btn-insert" id="btnInsertVar">插入</button>
      </div>
    </div>
  </div>

<script>
  const vscode = acquireVsCodeApi();

  // === 事件绑定（避免 onclick 被 CSP 阻止） ===
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  document.getElementById('btnOpenConfig').addEventListener('click', () => {
    vscode.postMessage({ command: 'openConfig' });
  });
  document.getElementById('btnShowLogs').addEventListener('click', () => {
    vscode.postMessage({ command: 'showLogs' });
  });
  document.getElementById('searchInput').addEventListener('input', () => renderTree());
  document.getElementById('btnToggleAll').addEventListener('click', () => toggleAll());
  document.getElementById('btnRefreshQC').addEventListener('click', () => refreshQC());
  document.getElementById('btnEditConfig').addEventListener('click', () => {
    vscode.postMessage({ command: 'openQuickCodeConfig' });
  });
  document.getElementById('btnCancelVar').addEventListener('click', () => cancelVarDialog());
  document.getElementById('btnInsertVar').addEventListener('click', () => confirmInsert());
  document.getElementById('chkShowRemark').addEventListener('change', (e) => {
    _showRemark = e.target.checked;
    vscode.postMessage({ command: 'saveRemarkVisibility', showRemark: _showRemark });
    updateRemarkVisibility();
  });

  // 树容器事件委托
  document.getElementById('treeContainer').addEventListener('click', (e) => {
    const el = e.target;
    // 点击分组头
    const groupHeader = el.closest('.qc-group-header');
    if (groupHeader) {
      const body = groupHeader.nextElementSibling;
      const arrow = groupHeader.querySelector('.arrow');
      if (body) body.classList.toggle('open');
      if (arrow) arrow.classList.toggle('open');
      return;
    }
    // 点击子分组头
    const itemHeader = el.closest('.qc-item.has-children');
    if (itemHeader) {
      const children = itemHeader.nextElementSibling;
      const arrow = itemHeader.querySelector('.item-arrow');
      if (children) children.classList.toggle('open');
      if (arrow) arrow.classList.toggle('open');
      return;
    }
    // 点击叶子节点的插入/复制按钮
    const insertBtn = el.closest('.qc-leaf-btn.insert-btn');
    if (insertBtn) {
      const leaf = insertBtn.closest('.qc-leaf');
      const codeIdx = leaf.dataset.codeIdx;
      const name = leaf.dataset.name;
      if (codeIdx !== undefined && _allCodes[codeIdx] !== undefined) {
        selectLeaf(_allCodes[codeIdx], name);
      }
      return;
    }
    const copyBtn = el.closest('.qc-leaf-btn.copy-btn');
    if (copyBtn) {
      const leaf = copyBtn.closest('.qc-leaf');
      const codeIdx = leaf.dataset.codeIdx;
      if (codeIdx !== undefined && _allCodes[codeIdx] !== undefined) {
        vscode.postMessage({ command: 'copyCode', code: _allCodes[codeIdx] });
      }
      return;
    }
  });

  // === 标签页切换 ===
  function switchTab(name) {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === name);
    });
    document.querySelectorAll('.tab-content').forEach(c => {
      c.classList.toggle('active', c.id === 'tab-' + name);
    });
    if (name === 'quickcode' && !window._qcLoaded) {
      loadQuickCode();
    }
  }

  // === 快捷操作 ===
  // (已在顶部绑定事件)

  // === 快捷代码 ===
  let _configData = null;
  let _tmplenv = {};
  let _currentCode = '';
  let _currentVars = [];
  let _allCodes = []; // 存储所有叶子节点的 code，通过索引引用
  let _showRemark = true; // 是否显示备注
  window._qcLoaded = false;

  function loadQuickCode() {
    window._qcLoaded = true;
    vscode.postMessage({ command: 'loadQuickCode' });
  }

  function refreshQC() {
    window._qcLoaded = false;
    loadQuickCode();
  }

  function editConfig() {
    vscode.postMessage({ command: 'openQuickCodeConfig' });
  }

  // 接收后端数据
  window.addEventListener('message', event => {
    const msg = event.data;
    if (msg.command === 'quickCodeData') {
      _configData = msg.data;
      _tmplenv = msg.data.tmplenv || {};
      _showRemark = msg.showRemark !== false; // 默认显示
      document.getElementById('chkShowRemark').checked = _showRemark;
      renderTree();
      updateRemarkVisibility();
    }
  });

  // 更新备注显示/隐藏状态
  function updateRemarkVisibility() {
    const remarks = document.querySelectorAll('.qc-remark');
    remarks.forEach(r => {
      if (_showRemark) {
        r.classList.add('show');
      } else {
        r.classList.remove('show');
      }
    });
  }

  function renderTree() {
    const container = document.getElementById('treeContainer');
    if (!_configData) { container.innerHTML = '<div class="qc-empty">加载中...</div>'; return; }

    const search = (document.getElementById('searchInput').value || '').trim().toLowerCase();
    _allCodes = [];
    const typeKeys = Object.keys(_configData).filter(k => k !== 'tmplenv' && Array.isArray(_configData[k]) && _configData[k].length > 0);
    if (!typeKeys.length) {
      container.innerHTML = '<div class="qc-empty">暂无配置</div>';
      return;
    }

    const typeIcons = { javascript: 'JS', maxappxml: 'XML', maxobjectjson: 'DB' };
    const typeLabels = { javascript: 'JavaScript', maxappxml: '应用XML', maxobjectjson: 'MAXOBJECT配置' };

    let html = '';
    let globalIdx = 0;
    typeKeys.forEach(typeKey => {
      const groups = _configData[typeKey] || [];
      let typeHtml = '';
      let typeHasContent = false;

      groups.forEach((group, gi) => {
        const groupBodyId = 'gb_' + typeKey + '_' + gi;
        const visibleChildren = filterItems(group.childrens || [], search);
        if (search && !visibleChildren.length) return;
        typeHasContent = true;

        // 无搜索时默认全部收缩；搜索时自动展开便于查看结果
        const isOpen = search ? ' open' : '';

        typeHtml += '<div class="qc-group">';
        typeHtml += '<div class="qc-group-header">';
        typeHtml += '<span class="arrow' + isOpen + '" id="arr_' + groupBodyId + '">▶</span>';
        typeHtml += '<span>' + escHtml(group.name) + '</span>';
        typeHtml += '</div>';
        typeHtml += '<div class="qc-group-body' + isOpen + '" id="' + groupBodyId + '">';
        typeHtml += renderItems(visibleChildren, search, typeKey + '_' + gi);
        typeHtml += '</div></div>';
        globalIdx++;
      });

      if (typeHasContent) {
        html += '<div class="qc-type-header">';
        html += '<span class="type-icon">' + (typeIcons[typeKey] || '⚙') + '</span>';
        html += '<span>' + (typeLabels[typeKey] || typeKey) + '</span>';
        html += '</div>';
        html += typeHtml;
      }
    });

    container.innerHTML = html || '<div class="qc-empty">无匹配结果</div>';
    // 更新全部收缩/展开按钮文字（无搜索时默认全部收缩）
    const toggleBtn = document.getElementById('btnToggleAll');
    if (toggleBtn) toggleBtn.textContent = search ? '📂 全部收缩' : '📂 全部展开';
  }

  function filterItems(items, search) {
    if (!search) return items;
    return items.filter(item => {
      if ((item.name || '').toLowerCase().includes(search)) return true;
      if ((item.remark || '').toLowerCase().includes(search)) return true;
      // 同时搜索 code 内容（不区分大小写）
      if ((item.code || '').toLowerCase().includes(search)) return true;
      if (item.childrens && filterItems(item.childrens, search).length > 0) return true;
      return false;
    });
  }

  function renderItems(items, search, parentIdx) {
    let html = '';
    items.forEach((item, ii) => {
      const id = parentIdx + '_' + ii;
      if (item.childrens && item.childrens.length > 0) {
        const visChildren = filterItems(item.childrens, search);
        // 无搜索时默认收缩；搜索时自动展开
        const isOpen = search ? ' open' : '';
        html += '<div class="qc-item has-children">';
        html += '<span class="item-arrow' + isOpen + '" id="iarr_' + id + '">▶</span>';
        html += '<span>' + escHtml(item.name) + '</span>';
        html += '</div>';
        html += '<div class="qc-item-children' + isOpen + '" id="ich_' + id + '">';
        html += renderItems(visChildren, search, id);
        html += '</div>';
      } else if (item.code) {
        const codeIdx = _allCodes.length;
        _allCodes.push(item.code);
        html += '<div class="qc-leaf" data-code-idx="' + codeIdx + '" data-name="' + escHtml(item.name) + '">';
        html += '<span class="leaf-name"><span class="leaf-icon">⊕</span>' + escHtml(item.name) + '</span>';
        html += '<span class="qc-leaf-btns">';
        html += '<button class="qc-leaf-btn insert-btn">插入</button>';
        html += '<button class="qc-leaf-btn copy-btn">复制</button>';
        html += '</span>';
        html += '</div>';
        if (item.remark) {
          html += '<div class="qc-remark' + (_showRemark ? ' show' : '') + '">' + escHtml(item.remark) + '</div>';
        }
      }
    });
    return html;
  }

  function toggleAll() {
    const container = document.getElementById('treeContainer');
    const allBodies = container.querySelectorAll('.qc-group-body, .qc-item-children');
    const allArrows = container.querySelectorAll('.arrow, .item-arrow');
    const btn = document.getElementById('btnToggleAll');

    // 检查当前是否全部展开
    let allOpen = true;
    allBodies.forEach(b => { if (!b.classList.contains('open')) allOpen = false; });

    if (allOpen) {
      // 全部收缩
      allBodies.forEach(b => b.classList.remove('open'));
      allArrows.forEach(a => a.classList.remove('open'));
      btn.textContent = '📂 全部展开';
    } else {
      // 全部展开
      allBodies.forEach(b => b.classList.add('open'));
      allArrows.forEach(a => a.classList.add('open'));
      btn.textContent = '📂 全部收缩';
    }
  }

  // === 变量对话框 ===
  function selectLeaf(code, name) {
    _currentCode = code;
    const varSet = new Set();
    const varMatches = code.match(/\$\{\w+\}/g) || [];
    varMatches.forEach(vm => {
      const vn = vm.replace('\${', '').replace('}', '');
      varSet.add(vn);
    });
    _currentVars = Array.from(varSet);

    if (_currentVars.length === 0) {
      // 无变量，直接插入
      vscode.postMessage({ command: 'insertCode', code: code });
      return;
    }

    showVarDialog(name, _currentVars);
  }

  function showVarDialog(name, vars) {
    document.getElementById('varDialogTitle').textContent = '填写变量 - ' + name;
    const fields = document.getElementById('varFields');
    let html = '';
    vars.forEach(v => {
      const env = _tmplenv[v];
      html += '<div class="var-field">';
      html += '<label>' + escHtml(v) + '</label>';
      if (env) {
        html += '<div class="var-hint">' + escHtml(env.desc || '') + (env.remark ? ' (' + escHtml(env.remark) + ')' : '') + '</div>';
      }
      html += '<input type="text" id="var_' + escHtml(v) + '" />';
      html += '</div>';
    });
    fields.innerHTML = html;
    // 绑定 input 事件和聚焦
    fields.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => updatePreview());
    });
    const firstInput = fields.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
    updatePreview();
    document.getElementById('varDialog').classList.add('show');
  }

  function updatePreview() {
    let code = _currentCode;
    _currentVars.forEach(v => {
      const input = document.getElementById('var_' + v);
      const val = input ? input.value : '';
      code = code.replace(new RegExp('\\$\\{' + v + '\\}', 'g'), val || '\${' + v + '}');
    });
    document.getElementById('varPreview').textContent = code;
  }

  function cancelVarDialog() {
    document.getElementById('varDialog').classList.remove('show');
  }

  function confirmInsert() {
    let code = _currentCode;
    _currentVars.forEach(v => {
      const input = document.getElementById('var_' + v);
      const val = input ? input.value : '';
      code = code.replace(new RegExp('\\$\\{' + v + '\\}', 'g'), val);
    });
    document.getElementById('varDialog').classList.remove('show');
    vscode.postMessage({ command: 'insertCode', code: code });
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
</script>
</body>
</html>`;
  }
}
