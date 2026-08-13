import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';

const logger = vscode.window.createOutputChannel('Maximo Script Helper', { log: true });

/** YAML 顶层结构 */
export interface QuickCodeConfig {
  tmplenv?: Record<string, { desc?: string; remark?: string }>;
  javascript?: QuickCodeGroup[];
  maxappxml?: QuickCodeGroup[];
  maxobjectjson?: QuickCodeGroup[];
  [key: string]: any;
}

/** 分组节点 */
export interface QuickCodeGroup {
  name: string;
  childrens?: QuickCodeItem[];
}

/** 代码片段（叶子节点有 code，中间节点有 childrens） */
export interface QuickCodeItem {
  name: string;
  remark?: string;
  code?: string;
  componentName?: string;
  childrens?: QuickCodeItem[];
}

/** 类型标签 */
export interface QuickCodeType {
  key: string;
  label: string;
}

/** 已知的类型映射 */
const TYPE_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  maxappxml: '应用XML',
  maxobjectjson: 'MAXOBJECT配置'
};

export class QuickCodeManager {
  private _extensionUri: vscode.Uri;
  private _mergedConfig: QuickCodeConfig | null = null;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  /** 获取用户自定义配置目录路径 */
  private _getUserDir(): string {
    const homeDir = process.env.USERPROFILE || process.env.HOME || '';
    return path.join(homeDir, '.sks', 'maximo-script-helper', 'quick-code');
  }

  /** 获取插件内置默认 YAML 路径（优先加载，不做 copy） */
  private _getDefaultYamlPath(): string {
    return path.join(this._extensionUri.fsPath, 'public', 'quick-code-pub', 'quick-code-default.yaml');
  }

  /** 获取插件内置模板 YAML 路径（copy 到本地目录） */
  private _getTemplateYamlPath(): string {
    return path.join(this._extensionUri.fsPath, 'public', 'quick-code-pub', 'quick-code-loc-tmpl.yaml');
  }

  /** 读取并解析单个 YAML 文件 */
  private _loadYaml(filePath: string): QuickCodeConfig | null {
    try {
      if (!fs.existsSync(filePath)) {
        logger.info(`[QuickCode] YAML 文件不存在: ${filePath}`);
        return null;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = yaml.load(content) as QuickCodeConfig;
      logger.info(`[QuickCode] 已加载 YAML: ${filePath}`);
      return parsed;
    } catch (error: any) {
      logger.error(`[QuickCode] 解析 YAML 失败 (${filePath}): ${error.message}`);
      return null;
    }
  }

  /** 合并两个配置（用户覆盖/追加到默认配置） */
  private _mergeConfigs(defaultConfig: QuickCodeConfig, userConfig: QuickCodeConfig): QuickCodeConfig {
    const merged: QuickCodeConfig = { ...defaultConfig };

    // 合并 tmplenv
    if (userConfig.tmplenv) {
      merged.tmplenv = { ...(defaultConfig.tmplenv || {}), ...userConfig.tmplenv };
    }

    // 合并各类型数组（追加用户自定义分组）
    const typeKeys = ['javascript', 'maxappxml', 'maxobjectjson'];
    for (const key of typeKeys) {
      const defaultGroups = (defaultConfig[key] as QuickCodeGroup[]) || [];
      const userGroups = (userConfig[key] as QuickCodeGroup[]) || [];
      (merged as any)[key] = [...defaultGroups, ...userGroups];
    }

    return merged;
  }

  /** 扫描目录下所有 yaml/yml 文件，按文件名排序后依次加载并合并 */
  private _loadUserDir(): QuickCodeConfig {
    const userDir = this._getUserDir();
    if (!fs.existsSync(userDir)) {
      logger.info(`[QuickCode] 用户配置目录不存在: ${userDir}`);
      return {};
    }

    const files = fs.readdirSync(userDir)
      .filter(f => /\.(ya?ml)$/i.test(f))
      .sort((a, b) => a.localeCompare(b));

    if (files.length === 0) {
      logger.info(`[QuickCode] 用户配置目录为空: ${userDir}`);
      return {};
    }

    let merged: QuickCodeConfig = {};
    for (const file of files) {
      const filePath = path.join(userDir, file);
      const config = this._loadYaml(filePath);
      if (config) {
        merged = this._mergeConfigs(merged, config);
        logger.info(`[QuickCode] 已合并用户文件: ${file}`);
      }
    }
    logger.info(`[QuickCode] 用户配置目录共加载 ${files.length} 个文件`);
    return merged;
  }

  /** 加载并合并配置（带缓存） */
  public loadConfig(forceRefresh = false): QuickCodeConfig {
    if (this._mergedConfig && !forceRefresh) {
      return this._mergedConfig;
    }

    const defaultPath = this._getDefaultYamlPath();
    const defaultConfig = this._loadYaml(defaultPath) || {};
    const userConfig = this._loadUserDir();

    this._mergedConfig = this._mergeConfigs(defaultConfig, userConfig);
    logger.info(`[QuickCode] 配置已合并，tmplenv 条目: ${Object.keys(this._mergedConfig.tmplenv || {}).length}`);

    return this._mergedConfig;
  }

  /** 获取所有可用类型 */
  public getTypes(): QuickCodeType[] {
    const config = this.loadConfig();
    const types: QuickCodeType[] = [];
    for (const key of Object.keys(config)) {
      if (key === 'tmplenv') continue;
      if (Array.isArray(config[key]) && config[key].length > 0) {
        types.push({
          key,
          label: TYPE_LABELS[key] || key
        });
      }
    }
    return types;
  }

  /** 获取指定类型的分组数据 */
  public getGroups(typeKey: string): QuickCodeGroup[] {
    const config = this.loadConfig();
    return (config[typeKey] as QuickCodeGroup[]) || [];
  }

  /** 获取 tmplenv 变量定义 */
  public getTmplenv(): Record<string, { desc?: string; remark?: string }> {
    const config = this.loadConfig();
    return config.tmplenv || {};
  }

  /** 提取代码中的变量名（${xxx} 格式） */
  public extractVariables(code: string): string[] {
    const regex = /\$\{(\w+)\}/g;
    const vars = new Set<string>();
    let match;
    while ((match = regex.exec(code)) !== null) {
      vars.add(match[1]);
    }
    return Array.from(vars);
  }

  /** 替换代码中的变量 */
  public replaceVariables(code: string, values: Record<string, string>): string {
    return code.replace(/\$\{(\w+)\}/g, (_, varName) => {
      return values[varName] !== undefined ? values[varName] : `\${${varName}}`;
    });
  }

  /** 确保本地配置目录和模板文件存在，返回目录路径 */
  private _ensureUserDir(): string {
    const userDir = this._getUserDir();
    const tmplFile = path.join(userDir, '01-quick-code.yml');

    if (fs.existsSync(userDir) && fs.existsSync(tmplFile)) {
      return userDir;
    }

    // 目录不存在则创建
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
      logger.info(`[QuickCode] 已创建用户配置目录: ${userDir}`);
    }

    // 01-quick-code.yml 不存在则从模板 copy
    if (!fs.existsSync(tmplFile)) {
      const tmplSrc = this._getTemplateYamlPath();
      if (fs.existsSync(tmplSrc)) {
        fs.copyFileSync(tmplSrc, tmplFile);
        logger.info(`[QuickCode] 已从模板复制: ${tmplFile}`);
      }
    }

    return userDir;
  }

  /** 打开用户自定义配置目录（QuickPick 选择文件） */
  public async openUserYaml(): Promise<void> {
    const userDir = this._ensureUserDir();

    // 列出目录下所有 yaml/yml 文件
    const files = fs.readdirSync(userDir)
      .filter(f => /\.(ya?ml)$/i.test(f))
      .sort((a, b) => a.localeCompare(b));

    if (files.length === 0) {
      logger.info(`[QuickCode] 用户配置目录为空: ${userDir}`);
      await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(userDir));
      return;
    }

    // 显示 QuickPick 文件列表
    const picked = await vscode.window.showQuickPick(
      files.map(f => ({ label: f, description: path.join(userDir, f) })),
      { placeHolder: '选择要编辑的快捷代码配置文件' }
    );

    if (picked) {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(picked.description!));
      await vscode.window.showTextDocument(doc);
    }
  }

  /** 刷新缓存 */
  public refresh(): void {
    this._mergedConfig = null;
  }
}
