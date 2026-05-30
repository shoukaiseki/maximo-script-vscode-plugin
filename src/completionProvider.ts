import * as vscode from 'vscode';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { ReflectionDataManager } from './reflectionDataManager';
import { DtsGenerator } from './dtsGenerator';
import { fetchClassReflection } from './httpRequest';

interface CompletionConfig {
  serverUrl: string;
  maxauth: string;
  version: string;
  completionMode: string;  // 补全模式：vscode, default, reflection
  enableCompletion: boolean;
  localApiPath: string;
  enableJSDocParsing: boolean;  // 启用 JSDoc 解析
  enableTypeInference: boolean;  // 启用类型推断
  autoGenerateReflectionApi: boolean;  // 自动生成反射API
  jarDirectories: string[];  // JAR 文件目录列表
  additionalJars: string[];  // 额外的 JAR 文件路径
  jdkPath: string;  // JDK 安装路径
}

interface MethodInfo {
  name: string;
  returnType: string;
  parameters: string[];
  description: string;
  modifiers: string;
  isStatic: boolean;
  isPublic: boolean;
  exceptions?: string[];
}

interface ApiClassData {
  className: string;
  superClass: string | null;
  interfaces: string[];
  methods: MethodInfo[];
}

export class CompletionProvider implements vscode.CompletionItemProvider {
  private config: CompletionConfig;
  private completionCache: Map<string, vscode.CompletionItem[]> = new Map();
  private localApiCache: Map<string, ApiClassData> = new Map();
  private outputChannel: vscode.OutputChannel;
  private reflectionManager: ReflectionDataManager | null = null;  // 反射数据管理器
  private dtsGenerator: DtsGenerator;  // .d.ts 生成器
  
  // 隐式变量类型映射（Maximo 脚本中的默认可用变量）
  private readonly implicitVariableTypes: Record<string, string> = {
    'mbo': 'psdi.mbo.MboRemote',
    'mboset': 'psdi.mbo.MboSetRemote',
    'service': 'com.ibm.ism.script.ScriptService',
    'userInfo': 'psdi.security.UserInfo',
  };
  
  // 方法返回值类型映射（支持链式调用）
  private readonly methodReturnTypeMap: Record<string, string> = {
    // MboRemote 的方法
    'getMboSet': 'psdi.mbo.MboSetRemote',
    'getOwner': 'psdi.mbo.MboRemote',
    'getThisMboSet': 'psdi.mbo.MboSetRemote',
    
    // MboSetRemote 的方法
    'getMbo': 'psdi.mbo.MboRemote',
    'moveFirst': 'psdi.mbo.MboRemote',
    'moveNext': 'psdi.mbo.MboRemote',
    'getCurrentRow': 'psdi.mbo.MboRemote',

    'service': 'com.ibm.ism.script.ScriptService',
  };

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.config = this.loadConfig();
    this.dtsGenerator = new DtsGenerator();
    this.loadLocalApiData();
    this.log('插件初始化完成');
    
    // 总是初始化反射数据管理器（创建目录和元数据文件）
    // 如果启用了自动生成反射API，则启用后台反射获取功能
    this.initializeReflectionManager();
  }

  /**
   * 统一的日志输出方法
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${prefix} ${message}`;
    this.outputChannel.appendLine(logMessage);
    console.log(logMessage);
  }

  /**
   * 初始化反射数据管理器
   */
  private async initializeReflectionManager(): Promise<void> {
    try {
      this.reflectionManager = new ReflectionDataManager(this.outputChannel);
      await this.reflectionManager.initialize();
      this.log('✅ 反射数据管理器初始化成功');
    } catch (error: any) {
      this.log(`❌ 反射数据管理器初始化失败: ${error.message}`, 'error');
    }
  }

  private loadConfig(): CompletionConfig {
    const config = vscode.workspace.getConfiguration('maximoScript');
    return {
      serverUrl: config.get('serverUrl', ''),
      maxauth: config.get('maxauth', ''),
      version: config.get('version', '7.6'),
      completionMode: config.get('completionMode', 'vscode'),
      enableCompletion: config.get('enableCompletion', true),
      localApiPath: config.get('localApiPath', ''),
      enableJSDocParsing: config.get('enableJSDocParsing', true),
      enableTypeInference: config.get('enableTypeInference', true),
      autoGenerateReflectionApi: config.get('autoGenerateReflectionApi', false),
      jarDirectories: config.get('jarDirectories', []),
      additionalJars: config.get('additionalJars', []),
      jdkPath: config.get('jdkPath', ''),
    };
  }

  public refreshConfig() {
    this.config = this.loadConfig();
    this.completionCache.clear();
    this.loadLocalApiData();
  }

  /**
   * 检查是否启用了自动生成反射API
   */
  public isAutoGenerateReflectionEnabled(): boolean {
    return this.config.autoGenerateReflectionApi && this.reflectionManager !== null;
  }

  /**
   * 扫描文档中的 Java 类并触发后台反射获取
   * @param document VSCode 文裆对象
   */
  public async scanAndFetchJavaClasses(document: vscode.TextDocument): Promise<void> {
    if (!this.isAutoGenerateReflectionEnabled()) {
      return;
    }

    try {
      const text = document.getText();
      const javaClasses = this.extractJavaClassesFromText(text);
      
      this.log(`[AutoReflection] 从文档中提取到 ${javaClasses.length} 个 Java 类`);
      
      // 对每个类触发后台反射获取
      for (const className of javaClasses) {
        // 异步触发，不等待完成
        this.triggerReflectionFetch(className).catch(err => {
          this.log(`[AutoReflection] 后台反射获取失败: ${className} - ${err}`, 'warn');
        });
      }
    } catch (error: any) {
      this.log(`[AutoReflection] 扫描 Java 类失败: ${error.message}`, 'error');
    }
  }

  /**
   * 从文本中提取 Java 类名
   * 支持的模式：
   * - MXServer.getMXServer()
   * - psdi.mbo.MboRemote
   * - var mbo: psdi.mbo.MboRemote
   * - @type {psdi.mbo.MboRemote}
   */
  private extractJavaClassesFromText(text: string): string[] {
    const classes = new Set<string>();
    
    // 模式1: 匹配完整的 Java 类名（包名.类名），支持内部类（$符号）
    // 例如: psdi.mbo.MboRemote, com.ibm.tivoli.maximo.script.ScriptService, java.util.Base64$Encoder
    // 注意：使用负向后顾确保不在 $ 后面开始匹配
    const fullClassNamePattern = /(?<!\$)([a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*\.[A-Z][a-zA-Z0-9]*(?:\$[A-Z][a-zA-Z0-9]*)*)\b/g;
    let match;
    while ((match = fullClassNamePattern.exec(text)) !== null) {
      const className = match[1];
      // 过滤掉常见的非 Java 类
      if (!className.startsWith('var ') && 
          !className.startsWith('let ') && 
          !className.startsWith('const ') &&
          !className.includes('function') &&
          !className.includes('return')) {
        classes.add(className);
      }
    }
    
    // 模式2: 匹配 JSDoc 类型注释
    // 例如: @type {psdi.mbo.MboRemote}, @param {psdi.mbo.MboSetRemote}
    const jsdocPattern = /@(?:type|param|returns?)\s+\{([^}]+)\}/g;
    while ((match = jsdocPattern.exec(text)) !== null) {
      const typeStr = match[1];
      // 提取可能的 Java 类名（支持内部类）
      const typeClasses = typeStr.match(/(?<!\$)([a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*\.[A-Z][a-zA-Z0-9]*(?:\$[A-Z][a-zA-Z0-9]*)*)\b/g);
      if (typeClasses) {
        typeClasses.forEach(cls => classes.add(cls));
      }
    }
    
    // 模式3: 匹配 TypeScript 类型注解
    // 例如: : psdi.mbo.MboRemote, as psdi.mbo.MboRemote
    const tsTypePattern = /(?::|as)\s*(?<!\$)([a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*\.[A-Z][a-zA-Z0-9]*(?:\$[A-Z][a-zA-Z0-9]*)*)/g;
    while ((match = tsTypePattern.exec(text)) !== null) {
      classes.add(match[1]);
    }
    
    // 转换为数组并过滤
    const result = Array.from(classes).filter(className => {
      // 过滤 jscustom 包名
      if (className.startsWith('jscustom.')) return false;
      
      // 过滤 custom 和 global 类名
      const simpleName = className.split(/[.$]/).pop() || '';  // 支持 $ 分隔
      if (simpleName === 'custom' || simpleName === 'global') return false;
      
      // 过滤明显不合法的类名（包名太短或看起来像截断的，如 e64.Encoder）
      const parts = className.split('.');
      if (parts.length >= 2) {
        const firstPart = parts[0];
        // 如果第一部分长度小于4，或者以数字结尾（可能是截断的），则过滤
        if (firstPart.length < 4 || /\d+$/.test(firstPart)) {
          return false;
        }
      }
      
      return true;
    });
    
    return result;
  }

  private async loadLocalApiData() {
    if (!this.config.localApiPath) {
      return;
    }

    try {
      const apiDir = this.config.localApiPath;
      
      // 检查目录是否存在
      if (!fs.existsSync(apiDir)) {
        this.log(`API数据目录不存在: ${apiDir}`, 'warn');
        return;
      }

      // 读取目录中的所有JSON文件
      const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        try {
          const filePath = path.join(apiDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data: ApiClassData = JSON.parse(content);
          
          // 缓存API数据，使用类名作为key
          this.localApiCache.set(data.className, data);
          
          // 也缓存简化的名称映射（例如：psdi-mbo-MboRemote.json -> MboRemote）
          const simpleName = file.replace('.json', '').split('-').pop();
          if (simpleName) {
            this.localApiCache.set(simpleName, data);
          }
        } catch (error) {
          this.log(`加载API文件失败 ${file}: ${error}`, 'error');
        }
      }
      
      this.log(`已加载 ${this.localApiCache.size} 个API类数据`);
    } catch (error) {
      this.log(`加载本地API数据失败: ${error}`, 'error');
    }
  }

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
    this.log('触发补全');
    if (!this.config.enableCompletion) {
      return [];
    }

    const linePrefix = document.lineAt(position).text.substr(0, position.character);
    
    // 获取当前行的完整文本，用于分析上下文
    const lineText = document.lineAt(position).text;
    
    // 提取触发前缀（支持复杂表达式，如：assetMbo.getMboSet("LOCATIONS")）
    // 改进：支持匹配到部分方法名，例如：service.inv、a.toU
    const prefixMatch = linePrefix.match(/([\w$]+(?:\.\s*[\w$]+\s*\([^)]*\))*)\.\s*([\w]*)$/);
    this.log(`prefixMatch: ${prefixMatch}`);
    
    if (!prefixMatch) {
      return [];
    }
    
    const triggerPrefix = prefixMatch[1].trim();  // 对象表达式，如：service、a
    const inputSuffix = prefixMatch[2] || '';      // 用户已输入的方法名前缀，如：inv、toU
    
    this.log(`triggerPrefix: ${triggerPrefix}, inputSuffix: "${inputSuffix}"`);

    const startTime = Date.now();
    this.log(`触发补全，前缀: ${triggerPrefix}`);

    try {
      // 1. 解析 JSDoc 类型注释
      let variableTypeMap: Record<string, string> = {};
      if (this.config.enableJSDocParsing) {
        variableTypeMap = this.parseJSDocTypes(document);
      }
      
      // 2. 合并类型映射表（隐式变量 + JSDoc）
      const mergedTypeMap = {
        ...this.implicitVariableTypes,
        ...variableTypeMap
      };
      
      // 3. 如果启用了类型推断，分析变量赋值语句
      if (this.config.enableTypeInference) {
        const inferredTypes = this.analyzeVariableTypes(document, mergedTypeMap);
        Object.assign(mergedTypeMap, inferredTypes);
      }
      
      // 4. 匹配表达式到类型
      const matchedType = this.matchExpressionToType(triggerPrefix, mergedTypeMap);
      this.log(`matchedType: ${matchedType}`) 
      if (!matchedType) {
        this.log(`未找到 ${triggerPrefix} 的类型定义`, 'warn');
        // 降级到原有的简单对象名匹配逻辑
        const simpleMatch = triggerPrefix.match(/^(\w+)$/);
        if (simpleMatch) {
          const objectName = simpleMatch[1];
          const cacheKey = `${objectName}_${this.config.version}`;
          if (this.completionCache.has(cacheKey)) {
            this.log(`使用缓存数据: ${cacheKey}`);
            return this.completionCache.get(cacheKey)!;
          }
          
          this.log(`获取补全数据: ${objectName}`);
          const completions = await this.fetchCompletions(objectName);
          this.completionCache.set(cacheKey, completions);
          return completions;
        }
        return [];
      }
      
      this.log(`匹配到类型: ${matchedType}`);
      
      // 5. 根据类型获取补全建议（三层降级策略）
      const suggestions = await this.getReflectionSuggestions(matchedType, position);
      
      // 6. 记录当前输入的后缀，用于调试
      this.log(`用户输入后缀: "${inputSuffix}"，补全项数量: ${suggestions.length}`);
      
      // 7. 如果有输入后缀，显示匹配的方法
      if (inputSuffix) {
        const matchedMethods = suggestions.filter(item => 
          item.label.toString().toLowerCase().startsWith(inputSuffix.toLowerCase())
        );
        this.log(`匹配 "${inputSuffix}" 的方法数: ${matchedMethods.length}`);
        if (matchedMethods.length > 0 && matchedMethods.length <= 5) {
          matchedMethods.forEach(m => this.log(`  - ${m.label}`));
        }
      }
      
      const endTime = Date.now();
      this.log(`补全完成，耗时: ${endTime - startTime}ms，返回 ${suggestions.length} 个项`);
      return suggestions;
    } catch (error) {
      this.log(`获取补全数据失败: ${error}`, 'error');
      return [];
    }
  }

  private async fetchCompletions(objectName: string): Promise<vscode.CompletionItem[]> {
    const items: vscode.CompletionItem[] = [];

    // 首先尝试从本地API缓存中获取
    const localData = this.getLocalApiCompletions(objectName);
    if (localData && localData.length > 0) {
      return localData;
    }

    // 如果本地没有数据，使用内置的常用对象补全
    const maximoObjects: Record<string, Array<{ label: string; detail?: string; documentation?: string }>> = {
      'service': [
        { label: 'log', detail: '记录日志', documentation: 'service.log(message)' },
        { label: 'error', detail: '记录错误', documentation: 'service.error(message)' },
        { label: 'getMboSet', detail: '获取MBO集合', documentation: 'service.getMboSet(objectName, userInfo)' },
        { label: 'getMXServer', detail: '获取MXServer实例', documentation: 'service.getMXServer()' }
      ],
      'mbo': [
        { label: 'getString', detail: '获取字符串值', documentation: 'mbo.getString(attributeName)' },
        { label: 'getInt', detail: '获取整数值', documentation: 'mbo.getInt(attributeName)' },
        { label: 'getLong', detail: '获取长整数值', documentation: 'mbo.getLong(attributeName)' },
        { label: 'getDouble', detail: '获取双精度值', documentation: 'mbo.getDouble(attributeName)' },
        { label: 'getDate', detail: '获取日期值', documentation: 'mbo.getDate(attributeName)' },
        { label: 'getBoolean', detail: '获取布尔值', documentation: 'mbo.getBoolean(attributeName)' },
        { label: 'setValue', detail: '设置值', documentation: 'mbo.setValue(attributeName, value)' },
        { label: 'isNull', detail: '检查是否为空', documentation: 'mbo.isNull(attributeName)' },
        { label: 'getMboSet', detail: '获取关联集合', documentation: 'mbo.getMboSet(relationshipName)' }
      ],
      'mboSet': [
        { label: 'moveFirst', detail: '移动到第一条', documentation: 'mboSet.moveFirst()' },
        { label: 'moveNext', detail: '移动到下一条', documentation: 'mboSet.moveNext()' },
        { label: 'isEmpty', detail: '检查是否为空', documentation: 'mboSet.isEmpty()' },
        { label: 'count', detail: '获取记录数', documentation: 'mboSet.count()' },
        { label: 'add', detail: '添加新记录', documentation: 'mboSet.add()' },
        { label: 'delete', detail: '删除记录', documentation: 'mboSet.delete()' },
        { label: 'save', detail: '保存更改', documentation: 'mboSet.save()' },
        { label: 'reset', detail: '重置游标', documentation: 'mboSet.reset()' },
        { label: 'close', detail: '关闭集合', documentation: 'mboSet.close()' },
        { label: 'setWhere', detail: '设置查询条件', documentation: 'mboSet.setWhere(whereClause)' }
      ],
      'userInfo': [
        { label: 'getUserName', detail: '获取用户名', documentation: 'userInfo.getUserName()' },
        { label: 'getLangCode', detail: '获取语言代码', documentation: 'userInfo.getLangCode()' },
        { label: 'getOrgId', detail: '获取组织ID', documentation: 'userInfo.getOrgId()' },
        { label: 'getSiteId', detail: '获取站点ID', documentation: 'userInfo.getSiteId()' }
      ]
    };

    const objectCompletions = maximoObjects[objectName.toLowerCase()];
    
    if (objectCompletions) {
      objectCompletions.forEach(item => {
        const completionItem = new vscode.CompletionItem(
          item.label,
          vscode.CompletionItemKind.Method
        );
        completionItem.detail = item.detail;
        completionItem.documentation = new vscode.MarkdownString(item.documentation);
        completionItem.insertText = item.label;
        items.push(completionItem);
      });
    }

    return items;
  }

  private getLocalApiCompletions(objectName: string): vscode.CompletionItem[] | null {
    // 尝试多种可能的类名匹配
    const possibleNames = [
      objectName,
      objectName.charAt(0).toUpperCase() + objectName.slice(1),
      `Mbo${objectName.charAt(0).toUpperCase() + objectName.slice(1)}Remote`,
      `${objectName.charAt(0).toUpperCase() + objectName.slice(1)}Remote`,
      `${objectName.charAt(0).toUpperCase() + objectName.slice(1)}SetRemote`
    ];

    let apiData: ApiClassData | undefined;
    
    for (const name of possibleNames) {
      apiData = this.localApiCache.get(name);
      if (apiData) break;
    }

    if (!apiData || !apiData.methods) {
      return null;
    }

    const items: vscode.CompletionItem[] = [];
    
    // 去重处理（同一个方法可能有多个重载）
    const processedMethods = new Set<string>();

    apiData.methods.forEach(method => {
      // 跳过非公共方法
      if (!method.isPublic) return;

      const methodKey = method.name;
      if (processedMethods.has(methodKey)) return;
      processedMethods.add(methodKey);

      const completionItem = new vscode.CompletionItem(
        method.name,
        vscode.CompletionItemKind.Method
      );

      // 构建详细的签名信息
      const params = method.parameters.map(p => {
        const simpleType = p.split('.').pop() || p;
        return simpleType;
      }).join(', ');

      const signature = `${method.returnType} ${method.name}(${params})`;
      
      completionItem.detail = signature;
      completionItem.documentation = new vscode.MarkdownString(
        `**${method.description}**\n\n` +
        `修饰符: ${method.modifiers}\n\n` +
        (method.exceptions && method.exceptions.length > 0 
          ? `异常: ${method.exceptions.join(', ')}` 
          : '')
      );
      
      // 添加参数提示
      if (method.parameters.length > 0) {
        completionItem.insertText = new vscode.SnippetString(
          `${method.name}($\{1:${params}})$0`
        );
      } else {
        completionItem.insertText = `${method.name}()`;
      }

      items.push(completionItem);
    });

    return items.length > 0 ? items : null;
  }

  resolveCompletionItem?(
    item: vscode.CompletionItem,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CompletionItem> {
    return item;
  }

  /**
   * 解析 JSDoc 类型注释
   * 支持格式：
   * 1. /** @type {ClassName} *\/
   *    var variableName;
   * 2. /** @type {ClassName} *\/ var variableName;
   * 3. /** @type {ClassName} expression.method() *\/ (表达式映射)
   */
  private parseJSDocTypes(document: vscode.TextDocument): Record<string, string> {
    const typeMap: Record<string, string> = {};
    const text = document.getText();
    const lines = text.split('\n');
    
    // 正则匹配 JSDoc @type 注释
    const jsdocPattern = /\/\*\*\s*@type\s*\{([^}]+)\}(.*?)\*\//;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const jsdocMatch = line.match(jsdocPattern);
      
      if (jsdocMatch) {
        const className = jsdocMatch[1].trim(); // 提取类型名称
        const afterType = jsdocMatch[2] ? jsdocMatch[2].trim() : ''; // 提取 @type 后面的内容
        
        // 清理末尾的 */
        const cleanAfter = afterType.replace(/\*\/$/, '').trim();
        
        if (cleanAfter && cleanAfter.length > 0) {
          // 检查是否是表达式格式（包含括号和点号）
          // 例如：b3.getMbo(0)、locationSet.moveFirst()
          const expressionPattern = /^[a-zA-Z_$][\w$]*(?:\s*\.\s*[a-zA-Z_$][\w$]*\s*\([^)]*\))+$/;
          
          if (expressionPattern.test(cleanAfter)) {
            // 表达式格式：直接作为键名存储
            // 支持正则占位符：\d, \w, .*, \s
            typeMap[cleanAfter] = className;
            this.log(`注册表达式映射: ${cleanAfter} -> ${className}`);
            continue;
          }
          
          // 否则按原来的逻辑处理（多个变量名）
          const varNames = cleanAfter.split(/[,\s]+/).map(v => v.trim()).filter(v => v.length > 0 && /^[a-zA-Z_$][\w$]*$/.test(v));
          
          varNames.forEach(varName => {
            typeMap[varName] = className;
          });
          continue;
        }
        
        // 情况2：变量在下一行
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const varDeclMatch = nextLine.match(/(?:var|let|const)\s+([a-zA-Z_$][\w$]*(?:\s*,\s*[a-zA-Z_$][\w$]*)*)/);
          
          if (varDeclMatch) {
            const varNames = varDeclMatch[1].split(',').map(v => v.trim());
            varNames.forEach(varName => {
              typeMap[varName] = className;
            });
          }
        }
      }
    }
    
    return typeMap;
  }

  /**
   * 分析变量赋值语句，推断类型
   * 例如：var locationSet = assetMbo.getMboSet("LOCATIONS");
   * 如果 assetMbo 的类型是 MboRemote，且 getMboSet 返回 MboSetRemote
   * 则推断 locationSet 的类型为 MboSetRemote
   */
  private analyzeVariableTypes(
    document: vscode.TextDocument,
    variableTypeMap: Record<string, string>
  ): Record<string, string> {
    const inferredTypes: Record<string, string> = {};
    const text = document.getText();
    const lines = text.split('\n');
    
    // 匹配赋值语句：varName = expression.method()
    const assignmentPattern = /(?:var|let|const)\s+([a-zA-Z_$][\w$]*)\s*=\s*([a-zA-Z_$][\w$]*)\.(\w+)\(/;
    
    for (const line of lines) {
      const match = line.match(assignmentPattern);
      if (match) {
        const varName = match[1];
        const sourceVar = match[2];
        const methodName = match[3];
        
        // 如果源变量有类型定义，且方法在返回值映射表中
        if (variableTypeMap[sourceVar] && this.methodReturnTypeMap[methodName]) {
          inferredTypes[varName] = this.methodReturnTypeMap[methodName];
        }
      }
    }
    
    return inferredTypes;
  }

  /**
   * 匹配表达式到类型
   * 支持：
   * 1. 完全匹配（包括 JSDoc 表达式映射）
   * 2. 正则匹配（处理带占位符的表达式）
   * 3. 返回值类型推断
   */
  private matchExpressionToType(
    expression: string,
    typeMap: Record<string, string>
  ): string | null {
    if (!expression || !typeMap) {
      return null;
    }
    
    this.log(`尝试匹配表达式: "${expression}"`);
    
    // 第一步：尝试完全匹配（包括 JSDoc 表达式映射）
    if (typeMap[expression]) {
      this.log(`完全匹配成功: ${expression} -> ${typeMap[expression]}`);
      return typeMap[expression];
    }
    
    // 第二步：尝试正则匹配（处理带占位符的表达式）
    // 支持的占位符：\d (数字), \w (单词字符), .* (任意字符串), \s (空白字符)
    for (const [key, type] of Object.entries(typeMap)) {
      // 检查键名是否包含正则占位符
      if (key.includes('\\d') || key.includes('\\w') || key.includes('.*') || key.includes('\\s')) {
        // 将占位符转换为真正的正则表达式
        let pattern = key
          .replace(/\\d/g, '\\d+')   // \d -> \d+ (一个或多个数字)
          .replace(/\\w/g, '\\w+')   // \w -> \w+ (一个或多个单词字符)
          .replace(/\.\*/g, '.*')     // .* -> .* (任意字符串)
          .replace(/\\s/g, '\\s+');   // \s -> \s+ (一个或多个空白字符)
        
        // 转义其他特殊字符（除了我们已经转换的）
        pattern = pattern.replace(/[.+?^${}()|[\]\\]/g, (match) => {
          // 不转义我们已经处理的特殊序列
          if (match === '\\' && pattern.substring(pattern.indexOf(match), pattern.indexOf(match) + 3).match(/\\[dws]/)) {
            return match;
          }
          return match === '.' ? '\\.' : match;
        });
        
        try {
          const regex = new RegExp(`^${pattern}$`);
          if (regex.test(expression)) {
            this.log(`正则匹配成功: ${expression} ~ ${key} -> ${type}`);
            return type;
          }
        } catch (e) {
          this.log(`正则表达式构建失败: ${key} - ${e}`, 'warn');
        }
      }
    }
    
    // 第三步：尝试从表达式末尾提取方法调用，使用返回值类型映射
    const methodCallMatch = expression.match(/\.(\w+)\(/);
    if (methodCallMatch) {
      const methodName = methodCallMatch[1];
      if (this.methodReturnTypeMap[methodName]) {
        this.log(`返回值类型推断: ${methodName} -> ${this.methodReturnTypeMap[methodName]}`);
        return this.methodReturnTypeMap[methodName];
      }
    }
    
    this.log(`未找到匹配的类型`, 'warn');
    return null;
  }

  /**
   * 根据类型获取补全建议（三层降级策略）
   * 第1层：实时 JDK 反射（通过配置的 JAR 目录，仅在 reflection 模式下）
   * 第2层：预加载的 reflection-data JSON 缓存
   * 第3层：降级到常用 API 静态列表
   */
  private async getReflectionSuggestions(
    className: string,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    const startTime = Date.now();
      
    // 第1层：尝试实时反射（仅在 reflection 模式且配置了 JAR 目录时）
    if (this.config.completionMode === 'reflection' && this.config.jarDirectories && this.config.jarDirectories.length > 0) {
      this.log(`[Layer 1] 尝试实时反射: ${className}`);
      const realTimeResult = await this.getRealTimeReflection(className);
      if (realTimeResult && realTimeResult.length > 0) {
        const elapsed = Date.now() - startTime;
        this.log(`[Layer 1] ✅ 使用实时反射数据: ${className} (耗时: ${elapsed}ms, 返回 ${realTimeResult.length} 个项)`);
        return realTimeResult;
      }
    }
      
    // 第2层：使用预加载的 JSON 缓存
    this.log(`[Layer 2] 尝试缓存数据: ${className}`);
    const cacheResult = this.getReflectionFromCache(className, position);
    if (cacheResult && cacheResult.length > 0) {
      const elapsed = Date.now() - startTime;
      this.log(`[Layer 2] ✅ 使用缓存数据: ${className} (耗时: ${elapsed}ms, 返回 ${cacheResult.length} 个项)`);
      
      // 如果启用了自动生成反射API，后台触发反射获取
      if (this.config.autoGenerateReflectionApi && this.reflectionManager) {
        this.triggerReflectionFetch(className).catch(err => {
          this.log(`后台反射获取失败: ${err}`, 'warn');
        });
      }
      
      return cacheResult;
    }
      
    // 第3层：使用常用 API 静态列表
    this.log(`[Layer 3] 缓存中未找到 ${className}，降级到常用 API`);
    const commonResult = this.getCommonAPISuggestions(className, position);
    const elapsed = Date.now() - startTime;
    this.log(`[Layer 3] ✅ 使用常用 API: ${className} (耗时: ${elapsed}ms, 返回 ${commonResult.length} 个项)`);
    
    // 如果启用了自动生成反射API，后台触发反射获取
    if (this.config.autoGenerateReflectionApi && this.reflectionManager) {
      this.triggerReflectionFetch(className).catch(err => {
        this.log(`后台反射获取失败: ${err}`, 'warn');
      });
    }
    
    return commonResult;
  }

  /**
   * 后台触发反射获取（异步，不阻塞当前补全）
   */
  private async triggerReflectionFetch(className: string): Promise<void> {
    this.log(`[Debug] triggerReflectionFetch 被调用: ${className}`);
    this.log(`[Debug] autoGenerateReflectionApi: ${this.config.autoGenerateReflectionApi}`);
    this.log(`[Debug] reflectionManager: ${this.reflectionManager ? '已初始化' : '未初始化'}`);
    
    if (!this.reflectionManager) {
      this.log(`[Debug] ❌ reflectionManager 未初始化，跳过`);
      return;
    }
    
    // 检查是否需要处理
    if (!this.reflectionManager.shouldProcessClass(className)) {
      this.log(`[Debug] ❌ shouldProcessClass 返回 false，跳过`);
      return;
    }
    
    // 防抖检查
    if (this.reflectionManager.isInDebouncePeriod(className)) {
      this.log(`[Debug] ❌ 在防抖期内，跳过`);
      return;
    }
    
    this.log(`[Debug] ✅ 所有检查通过，开始执行反射获取`);
    this.reflectionManager.recordRequestTime(className);
    
    try {
      this.log(`[Background] 开始后台反射获取: ${className}`);
      
      // 调用 Maximo 接口
      const reflectionData = await fetchClassReflection(className, this.outputChannel as any);
      
      if (reflectionData.status === 'error') {
        // 类不存在，永久忽略
        await this.reflectionManager.addToIgnoreList(
          className,
          reflectionData.message || '未知错误',
          true
        );
        this.log(`[Background] ⚠️ 类不存在，永久忽略: ${className}`);
        return;
      }
      
      // 保存 JSON 数据到 reflection-data
      await this.saveReflectionJson(className, reflectionData);
      
      // 生成 .d.ts 文件到 javaapi
      await this.generateDtsFile(className, reflectionData);
      
      // 更新元数据
      await this.reflectionManager.markClassAsProcessed(className);
      
      // 重新加载补全缓存
      this.loadLocalApiData();
      
      this.log(`[Background] ✅ 自动生成反射API成功: ${className}`);
    } catch (error: any) {
      // 临时失败，增加重试次数
      if (this.reflectionManager) {
        await this.reflectionManager.addToIgnoreList(
          className,
          error.message || '未知错误',
          false
        );
      }
      this.log(`[Background] ❌ 自动生成反射API失败: ${className} - ${error.message}`, 'error');
    }
  }

  /**
   * 保存反射 JSON 数据到 reflection-data 目录
   */
  private async saveReflectionJson(className: string, reflectionData: any): Promise<void> {
    if (!this.reflectionManager) {
      return;
    }
    
    const jsonFilePath = this.dtsGenerator.calculateJsonFilePath(className);
    const fullPath = path.join(this.reflectionManager.getReflectionDataPath(), jsonFilePath);
    
    // 创建目录
    const dirPath = path.dirname(fullPath);
    await fs.promises.mkdir(dirPath, { recursive: true });
    
    // 保存 JSON 文件
    await fs.promises.writeFile(fullPath, JSON.stringify(reflectionData, null, 2), 'utf-8');
    this.log(`[Background] 💾 保存 JSON: ${jsonFilePath}`);
  }

  /**
   * 生成 .d.ts 文件到 javaapi 目录
   */
  private async generateDtsFile(className: string, reflectionData: any): Promise<void> {
    if (!this.reflectionManager) {
      return;
    }
    
    // 生成 .d.ts 内容
    const dtsContent = this.dtsGenerator.generateDtsContent(reflectionData);
    
    // 计算文件路径
    const dtsFilePath = this.dtsGenerator.calculateFilePath(className);
    const fullPath = path.join(this.reflectionManager.getJavaapiPath(), dtsFilePath);
    
    // 创建目录
    const dirPath = path.dirname(fullPath);
    await fs.promises.mkdir(dirPath, { recursive: true });
    
    // 保存 .d.ts 文件
    await fs.promises.writeFile(fullPath, dtsContent, 'utf-8');
    this.log(`[Background] 💾 生成 .d.ts: ${dtsFilePath}`);
    
    // 自动更新 global.d.ts，添加新的引用
    try {
      await this.updateGlobalDts(dtsFilePath);
      this.log(`[Background] 📝 已更新 global.d.ts`);
    } catch (error: any) {
      this.log(`[Background] ⚠️ 更新 global.d.ts 失败: ${error.message}`, 'warn');
    }
  }

  /**
   * 更新 global.d.ts 文件，添加新的引用
   * @param newDtsFilePath 新生成的 .d.ts 文件相对路径（如：com/ibm/test/TestClass.d.ts）
   */
  private async updateGlobalDts(newDtsFilePath: string): Promise<void> {
    if (!this.reflectionManager) {
      return;
    }
    
    const javaapiPath = this.reflectionManager.getJavaapiPath();
    const globalDtsPath = path.join(javaapiPath, 'global.d.ts');
    
    let existingContent = '';
    let existingReferences: string[] = [];
    let otherContent: string[] = []; // 非 reference 的其他内容
    
    // 读取现有文件内容
    if (fs.existsSync(globalDtsPath)) {
      existingContent = fs.readFileSync(globalDtsPath, 'utf8');
      const lines = existingContent.split('\n');
      
      // 分离 reference 行和其他内容
      lines.forEach(line => {
        const refMatch = line.match(/^\/\/\/\s*<reference\s+path="\.?\/?([^"]+)"\s*\/>/);
        if (refMatch) {
          // 标准化路径：移除开头的 ./ 或 /
          const normalizedPath = refMatch[1].replace(/^\.?\//, '');
          existingReferences.push(normalizedPath);
        } else if (line.trim() !== '') {
          // 保留非空白的非 reference 行
          otherContent.push(line);
        }
      });
    }
    
    // 标准化新引用的路径
    const normalizedNewRef = newDtsFilePath.replace(/^\.?\//, '').replace(/\\/g, '/');
    
    // 合并引用（去重）
    const allReferences = [...new Set([...existingReferences, normalizedNewRef])];
    
    // 构建新的 global.d.ts 内容
    const referenceLines = allReferences.map(ref => 
      `/// <reference path="./${ref}" />`
    );
    
    let globalContent = referenceLines.join('\n') + '\n';
    
    // 如果有其他内容，添加分隔符后追加
    if (otherContent.length > 0) {
      globalContent += '\n' + otherContent.join('\n') + '\n';
    }
    
    // 写入文件
    fs.writeFileSync(globalDtsPath, globalContent, 'utf8');
  }

  /**
   * 从预加载的 JSON 缓存中获取方法列表
   */
  private getReflectionFromCache(
    className: string,
    position: vscode.Position
  ): vscode.CompletionItem[] | null {
    // 从本地 API 缓存中查找
    const apiData = this.localApiCache.get(className);
    
    if (!apiData || !apiData.methods) {
      return null;
    }
    
    console.log(`[Reflection] ✅ 使用缓存数据: ${className}`);
    
    const items: vscode.CompletionItem[] = [];
    const processedMethods = new Set<string>();
    
    apiData.methods.forEach(method => {
      // 跳过非公共方法
      if (!method.isPublic) return;
      
      const methodKey = method.name;
      if (processedMethods.has(methodKey)) return;
      processedMethods.add(methodKey);
      
      // 构建完整签名：方法名(参数类型1, 参数类型2)
      const paramsStr = method.parameters.length > 0
        ? `(${method.parameters.map(p => p.split('.').pop() || p).join(', ')})`
        : '()';
      
      const completionItem = new vscode.CompletionItem(
        `${method.name}${paramsStr}`,
        vscode.CompletionItemKind.Method
      );
      
      const signature = `${method.returnType} ${method.name}(${method.parameters.join(', ')})`;
      
      completionItem.detail = `${signature} [缓存]`;
      completionItem.documentation = new vscode.MarkdownString(
        `**来源: [缓存]**\n\n` +
        `**方法签名:**\n\n` +
        `\`\`\`java
${signature}
\`\`\`

` +
        (method.description || '')
      );
      
      // 插入文本（使用 snippet）
      if (method.parameters.length > 0) {
        const params = method.parameters.map((p, i) => `\${${i + 1}:${p.split('.').pop() || p}}`).join(', ');
        completionItem.insertText = new vscode.SnippetString(`${method.name}(${params})`);
      } else {
        completionItem.insertText = `${method.name}()`;
      }
      
      items.push(completionItem);
    });
    
    return items.length > 0 ? items : null;
  }

  /**
   * 实时 JDK 反射获取方法列表（通过配置的 JAR 目录）
   */
  private async getRealTimeReflection(
    className: string
  ): Promise<vscode.CompletionItem[] | null> {
    try {
      // 检查是否配置了 JDK 路径
      if (!this.config.jdkPath) {
        this.log(`未配置 JDK 路径，跳过实时反射`, 'warn');
        return null;
      }

      // 检查是否配置了 JAR 目录或单个 JAR 文件
      const hasJarConfig = 
        (this.config.jarDirectories && this.config.jarDirectories.length > 0) ||
        (this.config.additionalJars && this.config.additionalJars.length > 0);
      
      if (!hasJarConfig) {
        this.log(`未配置 JAR 目录或 JAR 文件，跳过实时反射`, 'warn');
        return null;
      }

      this.log(`开始实时反射: ${className}`);
      const startTime = Date.now();

      // 构建 classpath
      const classpath = this.buildClasspath();
      
      // 调用 Java 反射工具类
      const methods = await this.invokeJavaReflection(className, classpath);
      
      if (!methods || methods.length === 0) {
        this.log(`实时反射未找到方法: ${className}`, 'warn');
        return null;
      }

      // 转换为 VSCode 补全项
      const items = methods.map(method => {
        const paramsStr = method.parameters.length > 0
          ? `(${method.parameters.join(', ')})`
          : '()';
        
        const completionItem = new vscode.CompletionItem(
          `${method.name}${paramsStr}`,
          vscode.CompletionItemKind.Method
        );
        
        const signature = `${method.returnType} ${method.name}(${method.parameters.join(', ')})`;
        
        completionItem.detail = `${signature} [实时反射]`;
        completionItem.documentation = new vscode.MarkdownString(
          `**来源: [实时反射]**\n\n` +
          (method.description ? `**说明:** ${method.description}\n\n` : '') +
          `**方法签名:**\n\n` +
          `\`\`\`java\n${signature}\n\`\`\``
        );
        
        // 插入文本（使用 snippet）
        if (method.parameters.length > 0) {
          const params = method.parameters.map((p, i) => `\${${i + 1}:${p.split('.').pop() || p}}`).join(', ');
          completionItem.insertText = new vscode.SnippetString(`${method.name}(${params})`);
        } else {
          completionItem.insertText = `${method.name}()`;
        }
        
        return completionItem;
      });

      const elapsed = Date.now() - startTime;
      this.log(`实时反射成功: ${className} (耗时: ${elapsed}ms, 返回 ${items.length} 个方法)`);
      
      return items;
    } catch (error) {
      this.log(`实时反射失败: ${className} - ${error}`, 'error');
      return null;
    }
  }

  /**
   * 构建 classpath
   */
  private buildClasspath(): string {
    const paths: string[] = [];
    
    // 添加 JAR 目录中的所有 .jar 文件
    if (this.config.jarDirectories) {
      for (const dir of this.config.jarDirectories) {
        try {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              if (file.endsWith('.jar')) {
                paths.push(path.join(dir, file));
              }
            }
          }
        } catch (e) {
          this.log(`读取目录失败: ${dir} - ${e}`, 'warn');
        }
      }
    }
    
    // 添加单个 JAR 文件
    if (this.config.additionalJars) {
      for (const jar of this.config.additionalJars) {
        if (fs.existsSync(jar)) {
          paths.push(jar);
        } else {
          this.log(`JAR 文件不存在: ${jar}`, 'warn');
        }
      }
    }
    
    return paths.join(path.delimiter);
  }

  /**
   * 调用 Java 反射获取类的方法信息
   */
  private invokeJavaReflection(
    className: string,
    classpath: string
  ): Promise<Array<{ name: string; returnType: string; parameters: string[]; description: string }>> {
    return new Promise((resolve, reject) => {
      const javaExe = path.join(this.config.jdkPath, 'bin', 'java');
      
      // 使用预编译的 ReflectHelper.class 文件
      const classFilePath = path.join(__dirname, 'ReflectHelper.class');
      
      if (!fs.existsSync(classFilePath)) {
        this.log(`预编译的 ReflectHelper.class 不存在: ${classFilePath}`, 'error');
        reject(new Error('ReflectHelper.class not found'));
        return;
      }
      
      const classDir = path.dirname(classFilePath);
      
      // 运行 Java 反射
      this.log(`执行 Java 反射: ${className}`);
      const runProcess = spawn(javaExe, [
        '-cp',
        `${classDir}${path.delimiter}${classpath}`,
        'ReflectHelper',
        className,
        classpath
      ]);
      
      let stdout = '';
      let stderr = '';
      
      runProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      runProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      runProcess.on('close', (code) => {
        if (code !== 0) {
          this.log(`Java 执行失败: ${stderr}`, 'error');
          reject(new Error(`Java execution failed: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          if (result.error) {
            this.log(`Java 反射错误: ${result.error}`, 'warn');
            resolve([]);
            return;
          }
          
          resolve(result.methods || []);
        } catch (e) {
          this.log(`解析 Java 输出失败: ${e}`, 'error');
          reject(e);
        }
      });
    });
  }

  /**
   * 获取常用 API 静态列表（降级方案）
   */
  private getCommonAPISuggestions(
    className: string,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const commonMethods: Record<string, Array<{ name: string; returnType: string; params: string[]; description?: string }>> = {
      'psdi.mbo.MboRemote': [
        { name: 'getString', returnType: 'String', params: ['String'], description: '获取字符串属性值' },
        { name: 'getInt', returnType: 'int', params: ['String'], description: '获取整数属性值' },
        { name: 'getLong', returnType: 'long', params: ['String'], description: '获取长整数属性值' },
        { name: 'getDouble', returnType: 'double', params: ['String'], description: '获取双精度浮点数属性值' },
        { name: 'getBoolean', returnType: 'boolean', params: ['String'], description: '获取布尔属性值' },
        { name: 'getDate', returnType: 'Date', params: ['String'], description: '获取日期属性值' },
        { name: 'getByte', returnType: 'byte', params: ['String'], description: '获取字节属性值' },
        { name: 'getFloat', returnType: 'float', params: ['String'], description: '获取浮点数属性值' },
        { name: 'setValue', returnType: 'void', params: ['String', 'Object'], description: '设置属性值' },
        { name: 'setValueNull', returnType: 'void', params: ['String'], description: '将属性值设置为null' },
        { name: 'isNull', returnType: 'boolean', params: ['String'], description: '检查属性值是否为null' },
        { name: 'isModified', returnType: 'boolean', params: [], description: '检查是否已修改' },
        { name: 'getMboSet', returnType: 'MboSetRemote', params: ['String'], description: '获取关联的MBO集合' },
        { name: 'getOwner', returnType: 'MboRemote', params: [], description: '获取所有者MBO' },
        { name: 'getThisMboSet', returnType: 'MboSetRemote', params: [], description: '获取当前MBO所属的集合' },
        { name: 'add', returnType: 'void', params: [], description: '添加新记录（在MboSet上使用）' },
        { name: 'delete', returnType: 'void', params: [], description: '删除当前记录' },
        { name: 'save', returnType: 'void', params: [], description: '保存更改' },
        { name: 'flagForDelete', returnType: 'void', params: [], description: '标记为删除' },
        { name: 'undelete', returnType: 'void', params: [], description: '取消删除标记' },
        { name: 'isFlagForDelete', returnType: 'boolean', params: [], description: '检查是否标记为删除' },
        { name: 'isBasedOn', returnType: 'boolean', params: ['String'], description: '检查是否基于指定的对象' },
        { name: 'getUniqueIDName', returnType: 'String', params: [], description: '获取唯一标识符名称' },
        { name: 'getUniqueIDValue', returnType: 'long', params: [], description: '获取唯一标识符值' },
      ],
      'psdi.mbo.MboSetRemote': [
        { name: 'moveFirst', returnType: 'MboRemote', params: [], description: '移动到第一条记录' },
        { name: 'moveNext', returnType: 'MboRemote', params: [], description: '移动到下一条记录' },
        { name: 'moveLast', returnType: 'MboRemote', params: [], description: '移动到最后一条记录' },
        { name: 'getCurrentRow', returnType: 'MboRemote', params: [], description: '获取当前行的MBO' },
        { name: 'getMbo', returnType: 'MboRemote', params: ['int'], description: '获取指定索引的MBO' },
        { name: 'count', returnType: 'int', params: [], description: '获取记录总数' },
        { name: 'isEmpty', returnType: 'boolean', params: [], description: '检查集合是否为空' },
        { name: 'add', returnType: 'MboRemote', params: [], description: '添加新记录' },
        { name: 'addAt', returnType: 'MboRemote', params: ['int'], description: '在指定位置添加新记录' },
        { name: 'delete', returnType: 'void', params: [], description: '删除当前记录' },
        { name: 'deleteAll', returnType: 'void', params: [], description: '删除所有记录' },
        { name: 'save', returnType: 'void', params: [], description: '保存所有更改' },
        { name: 'reset', returnType: 'void', params: [], description: '重置游标到初始位置' },
        { name: 'close', returnType: 'void', params: [], description: '关闭集合，释放资源' },
        { name: 'setWhere', returnType: 'void', params: ['String'], description: '设置查询条件' },
        { name: 'setOrderBy', returnType: 'void', params: ['String'], description: '设置排序条件' },
        { name: 'getApp', returnType: 'String', params: [], description: '获取应用程序名称' },
        { name: 'getObjectName', returnType: 'String', params: [], description: '获取对象名称' },
      ],
      'com.ibm.ism.script.ScriptService': [
        { name: 'log', returnType: 'void', params: ['String'], description: '记录日志信息' },
        { name: 'error', returnType: 'void', params: ['String'], description: '记录错误信息' },
        { name: 'warn', returnType: 'void', params: ['String'], description: '记录警告信息' },
        { name: 'info', returnType: 'void', params: ['String'], description: '记录信息' },
        { name: 'debug', returnType: 'void', params: ['String'], description: '记录调试信息' },
        { name: 'getMboSet', returnType: 'MboSetRemote', params: ['String', 'UserInfo'], description: '获取MBO集合' },
        { name: 'getMXServer', returnType: 'MXServer', params: [], description: '获取MXServer实例' },
        { name: 'getProperty', returnType: 'String', params: ['String'], description: '获取属性值' },
        { name: 'setProperty', returnType: 'void', params: ['String', 'String'], description: '设置属性值' },
      ],
      'psdi.security.UserInfo': [
        { name: 'getUserName', returnType: 'String', params: [], description: '获取用户名' },
        { name: 'getLangCode', returnType: 'String', params: [], description: '获取语言代码' },
        { name: 'getOrgId', returnType: 'String', params: [], description: '获取组织ID' },
        { name: 'getSiteId', returnType: 'String', params: [], description: '获取站点ID' },
        { name: 'getLocale', returnType: 'Locale', params: [], description: '获取区域设置' },
        { name: 'getTimeZone', returnType: 'TimeZone', params: [], description: '获取时区' },
        { name: 'isInteractive', returnType: 'boolean', params: [], description: '检查是否为交互式会话' },
      ]
    };
    
    const methods = commonMethods[className] || [];
    
    return methods.map(method => {
      const paramsStr = method.params.length > 0
        ? `(${method.params.join(', ')})`
        : '()';
      
      const completionItem = new vscode.CompletionItem(
        `${method.name}${paramsStr}`,
        vscode.CompletionItemKind.Method
      );
      
      const signature = `${method.returnType} ${method.name}(${method.params.join(', ')})`;
      
      completionItem.detail = `${signature} [常用API]`;
      completionItem.documentation = new vscode.MarkdownString(
        `**来源: [常用API]**\n\n` +
        (method.description ? `**说明:** ${method.description}\n\n` : '') +
        `**方法签名:**\n\n` +
        `\`\`\`java\n${signature}\n\`\`\``
      );
      
      // 插入文本（使用 snippet）
      if (method.params.length > 0) {
        const params = method.params.map((p, i) => `\${${i + 1}}`).join(', ');
        completionItem.insertText = new vscode.SnippetString(`${method.name}(${params})`);
      } else {
        completionItem.insertText = `${method.name}()`;
      }
      
      return completionItem;
    });
  }
}
