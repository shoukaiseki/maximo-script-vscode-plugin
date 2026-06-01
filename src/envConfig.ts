import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 环境配置接口
 */
export interface EnvironmentConfig {
  envnum: string;
  serverUrl: string;
  authType: string;
  maxauth: string;
  apiKey: string;
  apiType: string;
  version: string;
  completionMode: string;
  langcode: string;  // 语言代码，默认 en
  pushXmlAlwaysUseMaxauth?: boolean;  // 推送 XML 时始终使用 MAXAUTH 认证方式，默认为 true
}

/**
 * 环境配置文件路径
 */
const ENV_CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '', '.sks', 'maximo-script-helper');
const ENV_CONFIG_FILE = path.join(ENV_CONFIG_DIR, 'envs.json');

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(ENV_CONFIG_DIR)) {
    fs.mkdirSync(ENV_CONFIG_DIR, { recursive: true });
  }
}

/**
 * 加载所有环境配置
 * @returns 环境配置数组
 */
export function loadEnvironments(): EnvironmentConfig[] {
  try {
    ensureConfigDir();
    
    if (!fs.existsSync(ENV_CONFIG_FILE)) {
      // 文件不存在，返回空数组
      return [];
    }
    
    const content = fs.readFileSync(ENV_CONFIG_FILE, 'utf-8');
    const envs: EnvironmentConfig[] = JSON.parse(content);
    
    // 验证数据结构
    if (!Array.isArray(envs)) {
      console.error('[EnvConfig] envs.json 格式错误：应该是数组');
      return [];
    }
    
    return envs;
  } catch (error) {
    console.error('[EnvConfig] 加载环境配置失败:', error);
    return [];
  }
}

/**
 * 保存所有环境配置
 * @param envs 环境配置数组
 * @returns 是否保存成功
 */
export function saveEnvironments(envs: EnvironmentConfig[]): boolean {
  try {
    ensureConfigDir();
    
    const content = JSON.stringify(envs, null, 2);
    fs.writeFileSync(ENV_CONFIG_FILE, content, 'utf-8');
    
    console.log(`[EnvConfig] 环境配置已保存到: ${ENV_CONFIG_FILE}`);
    return true;
  } catch (error) {
    console.error('[EnvConfig] 保存环境配置失败:', error);
    return false;
  }
}

/**
 * 根据环境名称查找环境配置
 * @param envnum 环境名称
 * @returns 环境配置或 undefined
 */
export function findEnvironment(envnum: string): EnvironmentConfig | undefined {
  const envs = loadEnvironments();
  return envs.find(env => env.envnum === envnum);
}

/**
 * 添加或更新环境配置
 * @param envConfig 环境配置
 * @returns 是否操作成功
 */
export function upsertEnvironment(envConfig: EnvironmentConfig): boolean {
  try {
    const envs = loadEnvironments();
    
    // 查找是否存在相同环境名
    const index = envs.findIndex(env => env.envnum === envConfig.envnum);
    
    if (index >= 0) {
      // 更新现有配置
      envs[index] = envConfig;
      console.log(`[EnvConfig] 更新环境配置: ${envConfig.envnum}`);
    } else {
      // 新增配置
      envs.push(envConfig);
      console.log(`[EnvConfig] 新增环境配置: ${envConfig.envnum}`);
    }
    
    return saveEnvironments(envs);
  } catch (error) {
    console.error('[EnvConfig] 添加/更新环境配置失败:', error);
    return false;
  }
}

/**
 * 删除环境配置
 * @param envnum 环境名称
 * @returns 是否删除成功
 */
export function deleteEnvironment(envnum: string): boolean {
  try {
    const envs = loadEnvironments();
    const filtered = envs.filter(env => env.envnum !== envnum);
    
    if (filtered.length === envs.length) {
      console.warn(`[EnvConfig] 环境配置不存在: ${envnum}`);
      return false;
    }
    
    const result = saveEnvironments(filtered);
    if (result) {
      console.log(`[EnvConfig] 删除环境配置: ${envnum}`);
    }
    
    return result;
  } catch (error) {
    console.error('[EnvConfig] 删除环境配置失败:', error);
    return false;
  }
}

/**
 * 获取所有环境名称列表
 * @returns 环境名称数组
 */
export function getEnvironmentNames(): string[] {
  const envs = loadEnvironments();
  return envs.map(env => env.envnum);
}
