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

  /** 获取用户自定义 YAML 路径 */
  private _getUserYamlPath(): string {
    const homeDir = process.env.USERPROFILE || process.env.HOME || '';
    return path.join(homeDir, '.sks', 'maximo-script-helper', 'quick-code.yaml');
  }

  /** 获取插件内置 YAML 路径 */
  private _getDefaultYamlPath(): string {
    // extensionUri 指向插件安装目录
    return path.join(this._extensionUri.fsPath, 'public', 'quick-code.yaml');
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

  /** 加载并合并配置（带缓存） */
  public loadConfig(forceRefresh = false): QuickCodeConfig {
    if (this._mergedConfig && !forceRefresh) {
      return this._mergedConfig;
    }

    const defaultPath = this._getDefaultYamlPath();
    const userPath = this._getUserYamlPath();

    const defaultConfig = this._loadYaml(defaultPath) || {};
    const userConfig = this._loadYaml(userPath) || {};

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

  /** 打开用户自定义 YAML 文件（不存在则从模板复制） */
  public async openUserYaml(): Promise<void> {
    const userPath = this._getUserYamlPath();
    if (!fs.existsSync(userPath)) {
      const dir = path.dirname(userPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // 从默认模板复制
      const defaultPath = this._getDefaultYamlPath();
      if (fs.existsSync(defaultPath)) {
        fs.copyFileSync(defaultPath, userPath);
        logger.info(`[QuickCode] 已从模板复制用户配置: ${userPath}`);
      } else {
        // 创建空模板
        fs.writeFileSync(userPath, '# 快捷插入代码配置（用户自定义）\n# 代码块使用 | 或 |- 保留换行格式\n\ntmplenv: {}\n\njavascript: []\nmaxappxml: []\nmaxobjectjson: []\n', 'utf-8');
      }
    }
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(userPath));
    await vscode.window.showTextDocument(doc);
  }

  /** 刷新缓存 */
  public refresh(): void {
    this._mergedConfig = null;
  }
}
