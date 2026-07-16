import * as vscode from 'vscode';
import { CompletionProvider } from './completionProvider';
import { ConfigPanel } from './configPanel';
import { CreateScriptPanel } from './createScriptPanel';
import { httpRequestToMaximo, initializeAxiosInterceptors, clearJSESSIONID, HttpRequestOptions, HttpResponse, fetchClassReflection, fetchClassReflectionLocal } from './httpRequest';

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
