import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * 忽略列表项接口
 */
interface IgnoreClassEntry {
  className: string;
  retryCount: number;
  reason: string;
}

/**
 * Maximo 反射数据管理器
 * 负责管理反射 API 的持久化存储和缓存
 */
export class ReflectionDataManager {
  private reflectionDataPath: string;  // reflection-data 目录路径
  private javaapiPath: string;          // javaapi 目录路径
  private cachedClasses: Set<string>;   // 已处理的类名缓存
  private ignoredClasses: Map<string, IgnoreClassEntry>; // 忽略列表
  private lastRequestTime: Map<string, number>; // 防抖记录（类名 -> 上次请求时间戳）
  private outputChannel: vscode.OutputChannel;
  
  private static readonly DEBOUNCE_PERIOD = 5000; // 5秒防抖期
  private static readonly MAX_RETRY_COUNT = 10;    // 最大重试次数
  
  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.cachedClasses = new Set();
    this.ignoredClasses = new Map();
    this.lastRequestTime = new Map();
    
    const userHome = os.homedir();
    // javaapi 目录存储在项目根目录，以便 VSCode 能够识别 .d.ts 文件
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      this.javaapiPath = path.join(workspaceFolders[0].uri.fsPath, 'javaapi');
    } else {
      // 如果没有工作区，回退到用户目录
      this.javaapiPath = path.join(userHome, '.sks', 'maximo-script-helper', 'javaapi');
    }
    // reflection-data 存储在用户目录
    this.reflectionDataPath = path.join(userHome, '.sks', 'maximo-script-helper', 'reflection-data');
  }
  
  /**
   * 初始化反射数据管理器
   */
  async initialize(): Promise<void> {
    this.log('开始初始化反射数据管理器...');
    
    try {
      // 1. 创建目录
      await this.ensureDirectories();
      
      // 2. 复制初始文件
      await this.copyInitialFiles();
      
      // 3. 加载元数据
      await this.loadMetadata();
      
      this.log(`✅ 反射数据管理器初始化完成`);
      this.log(`   - 已处理类数: ${this.cachedClasses.size}`);
      this.log(`   - 忽略类数: ${this.ignoredClasses.size}`);
    } catch (error: any) {
      this.log(`❌ 反射数据管理器初始化失败: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * 确保目录存在
   */
  private async ensureDirectories(): Promise<void> {
    await fs.promises.mkdir(this.javaapiPath, { recursive: true });
    await fs.promises.mkdir(this.reflectionDataPath, { recursive: true });
    this.log(`目录检查完成: javaapi, reflection-data`);
  }
  
  /**
   * 复制初始文件（从 public/javaapisource 到 javaapi）
   */
  private async copyInitialFiles(): Promise<void> {
    const sourceDir = path.join(__dirname, '..', 'public', 'javaapisource');
    
    if (!fs.existsSync(sourceDir)) {
      this.log(`⚠️ 源目录不存在，跳过初始文件复制: ${sourceDir}`, 'warn');
      return;
    }
    
    try {
      await this.copyDirectory(sourceDir, this.javaapiPath);
      this.log(`✅ 初始文件复制完成`);
    } catch (error: any) {
      this.log(`⚠️ 初始文件复制失败: ${error.message}`, 'warn');
    }
  }
  
  /**
   * 递归复制目录
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await fs.promises.mkdir(destPath, { recursive: true });
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }
  
  /**
   * 加载元数据文件
   */
  private async loadMetadata(): Promise<void> {
    // 加载 .maximoScriptClass.json
    const classFilePath = path.join(this.javaapiPath, '.maximoScriptClass.json');
    if (fs.existsSync(classFilePath)) {
      try {
        const content = await fs.promises.readFile(classFilePath, 'utf-8');
        const classes: string[] = JSON.parse(content);
        this.cachedClasses = new Set(classes);
        this.log(`已加载 ${this.cachedClasses.size} 个已处理类`);
      } catch (error: any) {
        this.log(`⚠️ 加载 .maximoScriptClass.json 失败: ${error.message}`, 'warn');
        this.cachedClasses = new Set();
      }
    } else {
      // 创建空文件
      await this.saveClassList();
      this.log(`创建空的 .maximoScriptClass.json`);
    }
    
    // 加载 .ignoreMaximoScriptClass.json
    const ignoreFilePath = path.join(this.javaapiPath, '.ignoreMaximoScriptClass.json');
    if (fs.existsSync(ignoreFilePath)) {
      try {
        const content = await fs.promises.readFile(ignoreFilePath, 'utf-8');
        const ignores: IgnoreClassEntry[] = JSON.parse(content);
        this.ignoredClasses = new Map(ignores.map(item => [item.className, item]));
        this.log(`已加载 ${this.ignoredClasses.size} 个忽略类`);
      } catch (error: any) {
        this.log(`⚠️ 加载 .ignoreMaximoScriptClass.json 失败: ${error.message}`, 'warn');
        this.ignoredClasses = new Map();
      }
    } else {
      // 创建空文件
      await this.saveIgnoreList();
      this.log(`创建空的 .ignoreMaximoScriptClass.json`);
    }
  }
  
  /**
   * 保存已处理类列表
   */
  private async saveClassList(): Promise<void> {
    const filePath = path.join(this.javaapiPath, '.maximoScriptClass.json');
    const classes = Array.from(this.cachedClasses);
    await fs.promises.writeFile(filePath, JSON.stringify(classes, null, 2), 'utf-8');
  }
  
  /**
   * 保存忽略列表
   */
  private async saveIgnoreList(): Promise<void> {
    const filePath = path.join(this.javaapiPath, '.ignoreMaximoScriptClass.json');
    const ignores = Array.from(this.ignoredClasses.values());
    await fs.promises.writeFile(filePath, JSON.stringify(ignores, null, 2), 'utf-8');
  }
  
  /**
   * 检查类是否需要处理
   * @param className 完整的类名（如：com.ibm.tivoli.maximo.script.ScriptService）
   * @returns true 表示需要处理，false 表示跳过
   */
  shouldProcessClass(className: string): boolean {
    // 1. 过滤 jscustom 包名的类
    if (className.startsWith('jscustom.')) {
      this.log(`跳过 jscustom 包名: ${className}`);
      return false;
    }
    
    // 2. 过滤 custom 和 global 类名
    const simpleClassName = className.split('.').pop() || '';
    if (simpleClassName === 'custom' || simpleClassName === 'global') {
      this.log(`跳过特殊类名: ${className}`);
      return false;
    }
    
    // 3. 检查是否已在缓存中
    if (this.cachedClasses.has(className)) {
      this.log(`类已在缓存中，跳过: ${className}`);
      return false;
    }
    
    // 4. 检查是否在忽略列表中
    const ignoreEntry = this.ignoredClasses.get(className);
    if (ignoreEntry) {
      if (ignoreEntry.retryCount === -1) {
        this.log(`类被永久忽略: ${className} (${ignoreEntry.reason})`);
        return false;
      }
      
      if (ignoreEntry.retryCount >= ReflectionDataManager.MAX_RETRY_COUNT) {
        this.log(`类已达到最大重试次数: ${className} (重试 ${ignoreEntry.retryCount} 次)`);
        return false;
      }
      
      this.log(`类在忽略列表中但可重试: ${className} (当前重试 ${ignoreEntry.retryCount} 次)`);
    }
    
    return true;
  }
  
  /**
   * 标记类为已处理
   * @param className 完整的类名
   */
  async markClassAsProcessed(className: string): Promise<void> {
    this.cachedClasses.add(className);
    await this.saveClassList();
    
    // 从忽略列表中删除
    if (this.ignoredClasses.has(className)) {
      this.ignoredClasses.delete(className);
      await this.saveIgnoreList();
      this.log(`已从忽略列表中移除: ${className}`);
    }
    
    this.log(`✅ 标记类为已处理: ${className}`);
  }
  
  /**
   * 添加到忽略列表
   * @param className 完整的类名
   * @param reason 失败原因
   * @param isPermanent 是否永久忽略（true: retryCount=-1, false: retryCount+1）
   */
  async addToIgnoreList(className: string, reason: string, isPermanent: boolean): Promise<void> {
    const existing = this.ignoredClasses.get(className);
    
    let retryCount: number;
    if (isPermanent) {
      retryCount = -1;
    } else if (existing && existing.retryCount !== -1) {
      retryCount = existing.retryCount + 1;
    } else {
      retryCount = 1;
    }
    
    this.ignoredClasses.set(className, {
      className,
      retryCount,
      reason
    });
    
    await this.saveIgnoreList();
    
    if (isPermanent) {
      this.log(`⚠️ 永久忽略类: ${className} (${reason})`);
    } else {
      this.log(`⚠️ 临时失败，增加到忽略列表: ${className} (重试 ${retryCount}/${ReflectionDataManager.MAX_RETRY_COUNT} 次)`);
    }
  }
  
  /**
   * 检查是否在防抖期内
   * @param className 完整的类名
   * @returns true 表示在防抖期内，不应再次请求
   */
  isInDebouncePeriod(className: string): boolean {
    const lastTime = this.lastRequestTime.get(className);
    if (!lastTime) {
      return false;
    }
    
    const now = Date.now();
    const elapsed = now - lastTime;
    
    if (elapsed < ReflectionDataManager.DEBOUNCE_PERIOD) {
      this.log(`类在防抖期内，跳过: ${className} (距上次请求 ${elapsed}ms)`);
      return true;
    }
    
    return false;
  }
  
  /**
   * 记录请求时间
   * @param className 完整的类名
   */
  recordRequestTime(className: string): void {
    this.lastRequestTime.set(className, Date.now());
  }
  
  /**
   * 获取 reflection-data 目录路径
   */
  getReflectionDataPath(): string {
    return this.reflectionDataPath;
  }
  
  /**
   * 获取 javaapi 目录路径
   */
  getJavaapiPath(): string {
    return this.javaapiPath;
  }
  
  /**
   * 获取已处理类数量
   */
  getCachedClassCount(): number {
    return this.cachedClasses.size;
  }
  
  /**
   * 获取忽略类数量
   */
  getIgnoredClassCount(): number {
    return this.ignoredClasses.size;
  }
  
  /**
   * 日志输出
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
    const logMessage = `[${timestamp}] [ReflectionManager] [${level.toUpperCase()}] ${prefix} ${message}`;
    this.outputChannel.appendLine(logMessage);
    console.log(logMessage);
  }
}
