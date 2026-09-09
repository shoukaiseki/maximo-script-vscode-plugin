// @ts-nocheck
/* eslint-disable */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { httpRequestToMaximo } from './httpRequest';
import { findEnvironment } from './envConfig';

const DEBUG_SCRIPT_NAME = 'SKS.AUTOSCRIPT.DEBUG';
const JAR_NAME = 'sks-autoscript-debug.jar';

let dbgChannel: vscode.LogOutputChannel | null = null;

function log(): vscode.LogOutputChannel {
  if (!dbgChannel) {
    dbgChannel = vscode.window.createOutputChannel('SKS Debug', { log: true });
  }
  return dbgChannel;
}

function resourcePath(context: vscode.ExtensionContext, name: string): string {
  return path.join(context.extensionPath, 'resources', name);
}


function parseHost(serverUrl: string): string {
  const u = String(serverUrl || '').trim();
  const m = u.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/:]+)/);
  if (m) return m[1];
  const m2 = u.match(/^([^/:]+)/);
  return m2 ? m2[1] : '127.0.0.1';
}

function buildScriptIndex(scriptRoots: string[]): Record<string, string> {
  const index: Record<string, string> = {};
  const walk = (p: string) => {
    let st;
    try {
      st = fs.statSync(p);
    } catch (e) {
      return;
    }
    if (st.isDirectory()) {
      let entries;
      try {
        entries = fs.readdirSync(p);
      } catch (e) {
        return;
      }
      for (const entry of entries) {
        walk(path.join(p, entry));
      }
      return;
    }
    const ext = path.extname(p).toLowerCase();
    if (ext !== '.py' && ext !== '.js' && ext !== '.jy') {
      return;
    }
    index[path.basename(p, ext).toUpperCase()] = p;
  };
  for (const root of scriptRoots || []) {
    if (root) {
      walk(root);
    }
  }
  return index;
}

async function req(env: any, url: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH', data?: any, headers?: any): Promise<any> {
  return httpRequestToMaximo({
    method,
    url,
    data,
    headers,
    serverUrl: env.serverUrl,
    authTypeIn: env.authType,
    maxauth: env.maxauth,
    apiKey: env.apiKey,
    apiType: env.apiType || 'oslc',
    langcode: env.langcode || 'en',
    timeout: 30000,
    logger: log()
  });
}

async function callScriptStatus(env: any): Promise<any> {
  return req(env, 'script/' + DEBUG_SCRIPT_NAME, 'GET', undefined);
}

async function callScriptPost(env: any, body: any): Promise<any> {
  return req(env, 'script/' + DEBUG_SCRIPT_NAME, 'POST', body);
}

/**
 * 执行导入 SKS.AUTOSCRIPT.DEBUG 脚本到 Maximo 服务器
 */
async function importDebugScript(context: vscode.ExtensionContext, env: any): Promise<boolean> {
  try {
    // 1. 从插件资源目录读取 JS 和 JSON
    const resDir = path.join(context.extensionPath, 'public', 'maximo-developer-resources');
    const jsPath = path.join(resDir, DEBUG_SCRIPT_NAME + '.js');
    const jsonPath = path.join(resDir, DEBUG_SCRIPT_NAME + '.json');
    if (!fs.existsSync(jsPath) || !fs.existsSync(jsonPath)) {
      log().error('[SKS-DEBUG] 找不到插件资源文件: ' + jsPath + ' / ' + jsonPath);
      vscode.window.showErrorMessage('找不到插件资源文件 ' + DEBUG_SCRIPT_NAME + '.js/.json，无法导入');
      return false;
    }
    const source = fs.readFileSync(jsPath, 'utf-8');
    const jsonConfig = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    log().info('[SKS-DEBUG] 读取脚本资源: ' + DEBUG_SCRIPT_NAME + ', source长度=' + source.length);

    // 2. 检查脚本是否已存在
    const checkUrl = `os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript&oslc.where=autoscript="${DEBUG_SCRIPT_NAME}"`;
    const checkResult = await req(env, checkUrl, 'GET');
    let scriptExists = false;
    let scriptHref: string | null = null;
    if (checkResult.status === 200 && checkResult.data) {
      const memberCount = checkResult.data.member ? checkResult.data.member.length : 0;
      if (memberCount === 1) {
        scriptExists = true;
        scriptHref = checkResult.data.member[0].href;
      }
    }

    // 3. 构建 customFields（参考 configPanel.importScriptFromJson）
    const ignoreFields = ['BINARYSCRIPTSOURCE', 'AUTOSCRIPTID', 'source'];
    const customFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(jsonConfig)) {
      if (ignoreFields.includes(key.toUpperCase())) {
        continue;
      }
      customFields[key.toLowerCase()] = value;
    }
    customFields.autoscript = DEBUG_SCRIPT_NAME;
    customFields.source = source.replace(/\r\n/g, '\n');
    if (jsonConfig.scriptlanguage) {
      customFields.scriptlanguage = jsonConfig.scriptlanguage;
    }
    if (jsonConfig.active !== undefined) {
      customFields.active = jsonConfig.active === true || jsonConfig.active === 1 || jsonConfig.active === '1';
    } else {
      customFields.active = true;
    }

    // 4. 构建部署 body（spi: 前缀）
    const deployBody: any = {};
    for (const key in customFields) {
      if (!customFields.hasOwnProperty(key)) {
        continue;
      }
      if (key.toLowerCase() === 'autoscript' || key.toLowerCase() === 'description' || key.toLowerCase() === 'source') {
        continue;
      }
      if (key.toLowerCase().startsWith('sks:') || key.toLowerCase() === 'changedate' || key.toLowerCase() === 'statusdate') {
        continue;
      }
      deployBody['spi:' + key.toLowerCase()] = customFields[key];
    }
    deployBody['spi:autoscript'] = DEBUG_SCRIPT_NAME;
    deployBody['spi:description'] = jsonConfig.description || DEBUG_SCRIPT_NAME;
    deployBody['spi:scriptlanguage'] = jsonConfig.scriptlanguage || 'javascript';
    if (deployBody['spi:active'] === undefined) {
      deployBody['spi:active'] = true;
    }
    if (deployBody['spi:version'] === undefined || deployBody['spi:version'] === '') {
      deployBody['spi:version'] = '1.0.0';
    }
    deployBody['spi:source'] = source.replace(/\r\n/g, '\n');

    // 5. 创建或更新脚本
    let deployUrl: string;
    let deployMethod: 'POST' | 'PATCH' = 'POST';
    const deployHeaders: any = {
      'Content-Type': 'application/json'
    };
    if (scriptExists && scriptHref) {
      deployUrl = scriptHref;
      deployMethod = 'PATCH';
      deployHeaders['Content-Type'] = 'application/merge-patch+json';
      deployHeaders['x-method-override'] = 'PATCH';
    } else {
      deployUrl = 'os/MXAPIAUTOSCRIPT';
    }
    log().info('[SKS-DEBUG] 部署 ' + DEBUG_SCRIPT_NAME + ' (method=' + deployMethod + ', exists=' + scriptExists + ') ...');
    const deployResult = await req(env, deployUrl, deployMethod, deployBody, deployHeaders);
    if (deployResult.status !== 200 && deployResult.status !== 201 && deployResult.status !== 204) {
      log().error('[SKS-DEBUG] 导入脚本失败: HTTP ' + deployResult.status + ', ' + JSON.stringify(deployResult.data && deployResult.data['oslc:Error'] || deployResult.data));
      return false;
    }
    log().info('[SKS-DEBUG] 导入脚本成功: ' + DEBUG_SCRIPT_NAME);
    return true;
  } catch (e: any) {
    log().error('[SKS-DEBUG] 导入脚本异常: ' + (e && e.message ? e.message : String(e)));
    return false;
  }
}

async function ensureScriptExists(env: any, context: vscode.ExtensionContext): Promise<any> {
  let info: any = null;
  let errorDetail = '';
  try {
    const r = await callScriptStatus(env);
    info = r && r.data ? r.data : null;
  } catch (e) {
    const d = e && e.response && e.response.data;
    if (d && d['oslc:Error']) {
      const oe = d['oslc:Error'];
      errorDetail = String(oe['oslc:message'] || oe['spi:reasonCode'] || JSON.stringify(d));
    } else if (e && e.message) {
      errorDetail = String(e.message);
    } else {
      errorDetail = String(e);
    }
    info = null;
  }
  if (info && info.status === 'success') {
    log().info('[SKS-DEBUG] 服务器存在调试脚本 ' + DEBUG_SCRIPT_NAME + ', scriptVersion=' + info.scriptVersion);
    return info;
  }
  if (info && info.status === 'error') {
    errorDetail = JSON.stringify(info);
  }
  const msg =
    '服务器上不存在或无法执行自动化脚本 ' + DEBUG_SCRIPT_NAME + '。' + '\n' +
    '请先将 ' + DEBUG_SCRIPT_NAME + ' 部署到 Maximo(脚本语言: javascript),或者进入工具箱进行初始化脚本, 然后重新启动调试。' +
    (errorDetail ? '\n\n服务端返回: ' + errorDetail : '');
  log().error('[SKS-DEBUG] ' + msg);

  // 提示用户是否导入调试脚本
  const choice = await vscode.window.showWarningMessage(
    '服务器上不存在调试脚本 ' + DEBUG_SCRIPT_NAME + '，是否立即导入？',
    { modal: true },
    '是',
    '否'
  );
  if (choice === '是') {
    log().info('[SKS-DEBUG] 用户选择导入调试脚本 ...');
    const imported = await importDebugScript(context, env);
    if (imported) {
      // 导入成功后重新查询状态
      try {
        const r2 = await callScriptStatus(env);
        if (r2 && r2.data && r2.data.status === 'success') {
          log().info('[SKS-DEBUG] 导入成功，脚本可用: ' + JSON.stringify(r2.data));
          return r2.data;
        }
      } catch (e2) {
        // 忽略重新查询失败
      }
    }
    vscode.window.showErrorMessage(DEBUG_SCRIPT_NAME + ' 导入失败，请手动部署后重试。', { modal: true });
  }
  throw new Error(DEBUG_SCRIPT_NAME + ' 脚本不可用: ' + errorDetail);
}

async function ensureDebuggerInstalled(context: vscode.ExtensionContext, env: any): Promise<void> {
  const info = await ensureScriptExists(env, context);
  const jarPath = resourcePath(context, JAR_NAME);
  if (!fs.existsSync(jarPath)) {
    throw new Error('缺少驱动 jar: ' + jarPath);
  }
  const localJarSize = fs.statSync(jarPath).size;
  const serverJarSize = Number(info.driverJarSize || 0);
  log().info(
    '[SKS-DEBUG] 服务端状态: version=' + info.version + ', driverAvailable=' + info.driverClassAvailable +
    ', driverLoaded=' + info.driverLoaded + ', 服务端jar=' + serverJarSize + 'B, 本地jar=' + localJarSize + 'B'
  );

  // 驱动缺失或 jar 与本地不一致(旧驱动未卸载/版本过期)时, 先卸载旧驱动再重新上传
  const needsReinstall = !info.driverClassAvailable || serverJarSize !== localJarSize;
  if (needsReinstall) {
    if (info.driverClassAvailable || info.driverLoaded || serverJarSize > 0) {
      log().info('[SKS-DEBUG] 检测到旧/缺失驱动, 先卸载旧驱动并清理 jar ...');
      try {
        await callScriptPost(env, { deactivate: true });
      } catch (e) {
        log().warn('[SKS-DEBUG] 卸载旧驱动失败(继续安装): ' + (e && e.message ? e.message : String(e)));
      }
    }
    const jarB64 = fs.readFileSync(jarPath).toString('base64');
    log().info('[SKS-DEBUG] 上传并激活驱动(' + localJarSize + ' B) ...');
    const resp = await callScriptPost(env, { jar: jarB64 });
    const d = resp && resp.data ? resp.data : {};
    if (d.status !== 'success') {
      throw new Error('驱动安装失败: ' + JSON.stringify(d));
    }
    log().info('[SKS-DEBUG] 驱动安装响应: ' + JSON.stringify(d));
    return;
  }
  if (!info.driverLoaded) {
    log().info('[SKS-DEBUG] 驱动已安装未加载, 执行 load ...');
    const resp = await callScriptPost(env, { activateOnly: true });
    const d = resp && resp.data ? resp.data : {};
    if (d.status !== 'success') {
      throw new Error('驱动加载失败: ' + JSON.stringify(d));
    }
    log().info('[SKS-DEBUG] 驱动加载响应: ' + JSON.stringify(d));
    return;
  }
  log().info('[SKS-DEBUG] 驱动已安装且已加载');
}

export class SKSDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  constructor(private context: vscode.ExtensionContext) {}

  async resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration
  ): Promise<vscode.DebugConfiguration | undefined> {
    try {
      log().show(true);
      log().info('=== SKS debug attach: resolving configuration ===');
      const envnum = String(vscode.workspace.getConfiguration('maximoScript').get('envnum') || 'default');
      const env = findEnvironment(envnum);
      if (!env) {
        throw new Error('未找到环境配置 "' + envnum + '"(请先用 Maximo Script: 打开配置 添加并选择环境)');
      }
      const workspaceFolder =
        (folder && folder.uri && folder.uri.fsPath) ||
        (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0] && vscode.workspace.workspaceFolders[0].uri.fsPath) ||
        '';
      // scriptRoots 直接读取 Maximo Script 配置 -> "其它配置" 中的"脚本存放目录"(scriptStoragePath, 默认 masscript)
      // launch.json 里显式写了 scriptRoots 时仍以其为准(覆盖)
      const rawRoots = Array.isArray(config.scriptRoots) && config.scriptRoots.length
        ? config.scriptRoots
        : [String(vscode.workspace.getConfiguration('maximoScript').get('scriptStoragePath') || 'masscript')];
      const scriptRoots = rawRoots.map((s: string) => {
        const resolved = String(s).replace(/\$\{workspaceFolder\}/g, workspaceFolder);
        if (!resolved) {
          return workspaceFolder;
        }
        return path.isAbsolute(resolved) ? resolved : path.join(workspaceFolder || '', resolved);
      });
      const scriptIndex = buildScriptIndex(scriptRoots);
      log().info('[SKS-DEBUG] 脚本目录: ' + JSON.stringify(scriptRoots));
      const debugPort = Number(env.debugPort || vscode.workspace.getConfiguration('maximoScript').get('debugPort') || 9229);
      const settingDebugHostname = String(vscode.workspace.getConfiguration('maximoScript').get('debugHostname') || '').trim();
      const envDebugHostname = env.debugHostname ? String(env.debugHostname).trim() : '';
      const host = envDebugHostname || settingDebugHostname || parseHost(env.serverUrl);
      log().info('[SKS-DEBUG] 环境: ' + envnum + ', host=' + host + ', debugPort=' + debugPort + ', auth=' + env.authType);
      await ensureDebuggerInstalled(this.context, env);
      const resolved: vscode.DebugConfiguration = {
        type: 'maximo-script-helper',
        request: 'attach',
        name: config.name || 'Attach to Maximo Automation Script (SKS)',
        host: host,
        port: debugPort,
        localRoot: workspaceFolder,
        scriptRoots: scriptRoots,
        scriptIndex: scriptIndex,
        sksEnv: env
      };
      log().info('[SKS-DEBUG] attach 就绪: ' + host + ':' + debugPort + ', 脚本索引 ' + Object.keys(scriptIndex).length + ' 个');
      return resolved;
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      log().error('[SKS-DEBUG] attach 失败: ' + msg);
      vscode.window.showErrorMessage('SKS 调试启动失败: ' + msg, { modal: true });
      throw e;
    }
  }
}

class SKSDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    const host = session.configuration.host || '127.0.0.1';
    const port = typeof session.configuration.port === 'number' ? session.configuration.port : 9229;
    log().info('[SKS-DEBUG] DAP 客户端连接 ' + host + ':' + port + ' ...');
    return new vscode.DebugAdapterServer(port, host);
  }
}

async function unloadDriverFromSession(session: vscode.DebugSession): Promise<void> {
  const env = session.configuration && session.configuration.sksEnv;
  if (!env) {
    return;
  }
  try {
    const resp = await callScriptPost(env, { deactivate: true });
    log().info('[SKS-DEBUG] 驱动已卸载: ' + JSON.stringify(resp && resp.data));
  } catch (e) {
    log().error('[SKS-DEBUG] 卸载失败: ' + (e && e.message ? e.message : String(e)));
  }
}

class SKSDebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
  createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) {
        return;
      }
      cleaned = true;
      unloadDriverFromSession(session);
    };
    return {
      onWillReceiveMessage: (message: any) => {
        if (message && message.command === 'disconnect') {
          cleanup();
        }
      },
      onDidSendMessage: (message: any) => {
        if (message && message.type === 'event' && (message.event === 'terminated' || message.event === 'exited')) {
          cleanup();
        }
      }
    };
  }
}

export function registerSksDebugger(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider('maximo-script-helper', new SKSDebugConfigurationProvider(context)),
    vscode.debug.registerDebugAdapterDescriptorFactory('maximo-script-helper', new SKSDebugAdapterDescriptorFactory()),
    vscode.debug.registerDebugAdapterTrackerFactory('maximo-script-helper', new SKSDebugAdapterTrackerFactory())
  );
}