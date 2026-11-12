import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EnvironmentConfig, loadEnvironments } from './envConfig';
import { httpRequestToMaximo, checkResponseHasError } from './httpRequest';
import { ConfigPanel } from './configPanel';

/**
 * 推送类型：
 * - script: 推送自动化脚本（.js）
 * - xml:    推送应用 XML（.xml）
 * - import: 导入脚本（.json，配合同名 .js）
 */
type PushKind = 'script' | 'xml' | 'import';

interface PushTarget {
  kind: PushKind;
  filePath: string;
  scriptName: string;
  source?: string;
  xmlContent?: string;
  scriptConfig?: any;
}

interface PerEnvResult {
  envnum: string;
  success: boolean;
  message?: string;
}

interface PushResult {
  success: boolean;
  errorMessage?: string;
}

/** 本轮多环境推送的版本信息（只计算一次，各环境共用） */
interface VersionInfo {
  version: string;
  logLevel: any;
  /** true 表示未打开工作区，跳过版本管理 */
  skip: boolean;
}

interface VersionCache {
  info?: VersionInfo;
}

/**
 * 单环境请求覆盖参数（传给 httpRequestToMaximo，避免读取/修改 VS Code 全局配置）
 */
interface EnvOverrides {
  serverUrl: string;
  authTypeIn: string;
  maxauth: string;
  apiKey: string;
  apiType: string;
  langcode: string;
}

function overridesOf(env: EnvironmentConfig): EnvOverrides {
  return {
    serverUrl: env.serverUrl,
    authTypeIn: env.authType,
    maxauth: env.maxauth,
    apiKey: env.apiKey,
    apiType: env.apiType,
    langcode: env.langcode
  };
}

/**
 * 推送到多个环境（独立实现，按环境参数直接调用底层请求，不修改 VS Code 配置）
 */
export class PushToMultipleEnvs {
  /**
   * 根据右键目标/当前编辑器推断推送类型和所需数据
   */
  static resolveTarget(uri?: vscode.Uri): PushTarget | { error: string } {
    let filePath: string | undefined;

    if (uri && uri.scheme === 'file' && fs.existsSync(uri.fsPath) && fs.statSync(uri.fsPath).isFile()) {
      filePath = uri.fsPath;
    } else if (vscode.window.activeTextEditor) {
      filePath = vscode.window.activeTextEditor.document.fileName;
    }

    if (!filePath) {
      return { error: '请选择要推送的文件' };
    }
    if (!fs.existsSync(filePath)) {
      return { error: `文件不存在: ${filePath}` };
    }

    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.js') {
      const scriptName = path.basename(filePath, ext);
      const source = fs.readFileSync(filePath, 'utf-8');
      return { kind: 'script', filePath, scriptName, source };
    }

    if (ext === '.xml') {
      const xmlContent = fs.readFileSync(filePath, 'utf-8');
      return { kind: 'xml', filePath, scriptName: path.basename(filePath), xmlContent };
    }

    if (ext === '.json') {
      const jsonContent = fs.readFileSync(filePath, 'utf-8');
      let scriptConfig: any;
      try {
        scriptConfig = JSON.parse(jsonContent);
      } catch (e: any) {
        return { error: `解析 JSON 失败: ${e.message}` };
      }
      const scriptName = scriptConfig.autoscript;
      if (!scriptName) {
        return { error: 'JSON 文件中未找到 autoscript 字段' };
      }
      const jsFilePath = path.join(path.dirname(filePath), `${scriptName}.js`);
      let source = '';
      if (fs.existsSync(jsFilePath)) {
        source = fs.readFileSync(jsFilePath, 'utf-8');
      } else if (scriptConfig.source) {
        source = scriptConfig.source;
      }
      if (!source) {
        return { error: '未找到脚本源代码，请确保存在同名的 .js 文件' };
      }
      return { kind: 'import', filePath, scriptName, source, scriptConfig };
    }

    return { error: `不支持的文件类型: ${ext}（仅支持 .js / .xml / .json）` };
  }

  /**
   * 弹出环境勾选框（多选），返回选中的环境配置
   * @param showRedeployOption 是否显示"重新部署脚本"勾选项（XML 推送时不需要）
   */
  static async pickEnvironments(showRedeployOption: boolean): Promise<{ envs: EnvironmentConfig[]; redeploy: boolean } | undefined> {
    const envs = loadEnvironments();
    if (!envs || envs.length === 0) {
      vscode.window.showWarningMessage('未找到任何环境配置，请先在配置面板中保存环境');
      return undefined;
    }

    const currentEnvnum = vscode.workspace.getConfiguration('maximoScript').get<string>('envnum', '');

    const items: any[] = envs.map(env => ({
      label: env.envnum,
      description: env.serverUrl,
      detail: `认证: ${env.authType}${env.envnum === currentEnvnum ? '（当前环境）' : ''}`,
      picked: false,
      env
    }));

    if (showRedeployOption) {
      items.push({
        label: '$(refresh) 重新部署脚本',
        description: '删除后重新导入',
        detail: '勾选后先查询服务器脚本是否存在，存在则先删除再推送；适用于脚本启动点/变量变更',
        picked: false,
        isRedeployOption: true
      });
    }

    const picked = await vscode.window.showQuickPick(items, {
      canPickMany: true,
      title: '推送到多个环境 - 选择目标环境',
      placeHolder: showRedeployOption
        ? '勾选需要推送的环境（可多选），按回车确认；如需删除后重新导入，可同时勾选"重新部署脚本"'
        : '勾选需要推送的环境（可多选），按回车确认',
      ignoreFocusOut: true
    });

    if (!picked || picked.length === 0) {
      return undefined;
    }

    const redeploy = picked.some((p: any) => p.isRedeployOption);
    const pickedEnvs = picked.filter((p: any) => !p.isRedeployOption).map((p: any) => p.env as EnvironmentConfig);
    if (pickedEnvs.length === 0) {
      vscode.window.showWarningMessage('请至少选择一个目标环境');
      return undefined;
    }
    return { envs: pickedEnvs, redeploy };
  }

  /**
   * 删除指定环境中的脚本（用于"重新部署脚本"）
   */
  private static async deleteScriptInEnv(
    autoscript: string,
    href: string | undefined,
    env: EnvironmentConfig,
    logger: vscode.LogOutputChannel
  ): Promise<PushResult> {
    const deleteUrl = href || `os/AUTOSCRIPT/_${Buffer.from(autoscript).toString('base64')}`;
    const deleteResult = await httpRequestToMaximo({
      url: deleteUrl,
      method: 'DELETE',
      ...overridesOf(env)
    });

    if (deleteResult.status === 200 || deleteResult.status === 204) {
      logger.info(`[MultiEnv] 🗑️ 已删除脚本: ${autoscript} @ ${env.envnum}`);
      return { success: true };
    }
    return { success: false, errorMessage: `删除脚本失败: HTTP ${deleteResult.status}` };
  }

  /** 版本号比较（复制自 ConfigPanel，避免依赖私有方法） */
  private static compareVersions(v1: string, v2: string): number {
    if (!v2) { return 1; }
    if (!v1) { return -1; }
    const parts1 = v1.split('.').map(p => parseInt(p) || 0);
    const parts2 = v2.split('.').map(p => parseInt(p) || 0);
    const maxLen = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < maxLen; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 !== p2) { return p1 - p2; }
    }
    return 0;
  }

  /**
   * 读取本地 JSON 并把版本号末位 +1（会写回文件）。
   * 多环境推送时只应调用一次，结果由 VersionCache 复用。
   */
  private static readAndBumpVersion(
    autoscript: string,
    scriptStoragePath: string,
    logger: vscode.LogOutputChannel,
    filePath?: string
  ): VersionInfo {
    let version: string = '1.0.1';
    let loglevel: any = undefined;

    let jsonFilePath: string;
    if (filePath) {
      jsonFilePath = path.join(path.dirname(filePath), `${autoscript}.json`);
    } else {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        logger.warn('[_saveScriptHistory] 未打开工作区，跳过版本管理');
        return { version: '', logLevel: undefined, skip: true };
      }
      jsonFilePath = path.join(workspaceFolders[0].uri.fsPath, scriptStoragePath || 'masscript', `${autoscript}.json`);
    }

    if (fs.existsSync(jsonFilePath)) {
      try {
        const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
        if (jsonData && jsonData.loglevel !== undefined && jsonData.loglevel !== null && jsonData.loglevel !== '') {
          loglevel = jsonData.loglevel;
        }
        if (jsonData.version) {
          version = jsonData.version;
          const parts = version.split('.');
          const lastPart = parts[parts.length - 1];
          if (/^\d+$/.test(lastPart)) {
            parts[parts.length - 1] = (parseInt(lastPart) + 1).toString();
            version = parts.join('.');
            jsonData.version = version;
            fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');
            logger.info(`[_saveScriptHistory] 版本号已更新: ${version}`);
          }
        }
      } catch (parseError: any) {
        logger.error(`[_saveScriptHistory] 解析 JSON 文件失败: ${parseError.message}`);
      }
    }

    return { version, logLevel: loglevel, skip: false };
  }

  /** 读取本地脚本 JSON 完整内容（不存在或解析失败时返回空对象） */
  private static readLocalScriptConfig(
    autoscript: string,
    scriptStoragePath: string,
    logger: vscode.LogOutputChannel,
    filePath?: string
  ): any {
    let jsonFilePath: string;
    if (filePath) {
      jsonFilePath = path.join(path.dirname(filePath), `${autoscript}.json`);
    } else {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return {};
      }
      jsonFilePath = path.join(workspaceFolders[0].uri.fsPath, scriptStoragePath || 'masscript', `${autoscript}.json`);
    }

    if (!fs.existsSync(jsonFilePath)) {
      return {};
    }

    try {
      return JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8')) || {};
    } catch (e: any) {
      logger.warn(`[MultiEnv][pushScript] 读取本地 JSON 失败: ${e.message}`);
      return {};
    }
  }

  /** 从脚本 JSON 构建自定义字段（保留 launchpoints/variables/包名等完整信息，与导入脚本一致） */
  private static buildCustomFields(scriptConfig: any, scriptName: string, source: string): Record<string, any> {
    const ignoreFields = ['BINARYSCRIPTSOURCE', 'AUTOSCRIPTID', 'source'];
    const customFields: Record<string, any> = {};

    for (const [key, value] of Object.entries(scriptConfig || {})) {
      if (ignoreFields.includes(key.toUpperCase())) {
        continue;
      }
      customFields[key.toLowerCase()] = value;
    }

    customFields.autoscript = scriptName;
    customFields.source = source.replace(/\r\n/g, '\n');

    if (scriptConfig && scriptConfig.scriptlanguage) {
      customFields.scriptlanguage = scriptConfig.scriptlanguage;
    }

    if (scriptConfig && scriptConfig.active !== undefined) {
      customFields.active = scriptConfig.active === true || scriptConfig.active === 1 || scriptConfig.active === '1';
    } else {
      customFields.active = true;
    }

    return customFields;
  }

  /** 把自定义字段转换为 Maximo 部署请求体（spi: 前缀、launchpoints/variables 特殊处理） */
  private static buildDeployBody(customFields: Record<string, any>): any {
    const deployBody: any = {};

    for (const key in customFields) {
      if (!customFields.hasOwnProperty(key)) {
        continue;
      }
      const lower = key.toLowerCase();
      if (lower === 'autoscript' || lower === 'description' || lower === 'source') {
        continue;
      }
      if (lower.startsWith('sks:') || lower === 'changedate' || lower === 'statusdate') {
        continue;
      }

      if (lower === 'launchpoints') {
        const launchPointsTmp: any[] = [];
        for (const launchPoint of customFields[key]) {
          const launchPointTmp: any = {};
          for (const lpKey in launchPoint) {
            if (lpKey.toLowerCase() === 'eventtype' || lpKey.startsWith('sks:')) {
              continue;
            }
            if (launchPoint.hasOwnProperty(lpKey)) {
              launchPointTmp[`spi:${lpKey.toLowerCase()}`] = launchPoint[lpKey];
            }
          }
          launchPointsTmp.push(launchPointTmp);
        }
        deployBody['spi:scriptlaunchpoint'] = launchPointsTmp;
        continue;
      }

      if (lower === 'variables') {
        const variablesTmp: any[] = [];
        for (const variable of customFields[key]) {
          const variableTmp: any = {};
          for (const vKey in variable) {
            if (variable.hasOwnProperty(vKey)) {
              variableTmp[`spi:${vKey.toLowerCase()}`] = variable[vKey];
            }
          }
          variablesTmp.push(variableTmp);
        }
        deployBody['spi:autoscriptvars'] = variablesTmp;
        continue;
      }

      deployBody[`spi:${lower}`] = customFields[key];
    }

    if (!deployBody['spi:autoscript']) { deployBody['spi:autoscript'] = customFields.autoscript; }
    if (!deployBody['spi:description']) { deployBody['spi:description'] = customFields.description || customFields.autoscript; }
    if (!deployBody['spi:scriptlanguage']) { deployBody['spi:scriptlanguage'] = customFields.scriptlanguage || 'nashorn'; }
    if (deployBody['spi:active'] === undefined) { deployBody['spi:active'] = true; }
    if (deployBody['spi:version'] === undefined || deployBody['spi:version'] === '') { deployBody['spi:version'] = '1.0.0'; }
    deployBody['spi:source'] = customFields.source ? customFields.source.replace(/\r\n/g, '\n') : '';

    return deployBody;
  }

  /** 保存脚本历史记录（按环境服务器地址提交） */
  private static async saveScriptHistory(
    autoscript: string,
    source: string,
    env: EnvironmentConfig,
    aliasName: string,
    scriptStoragePath: string,
    logger: vscode.LogOutputChannel,
    filePath?: string,
    cache?: VersionCache
  ): Promise<{ version: string; logLevel: any }> {
    try {
      // 版本号在一轮多环境推送中只递增一次，其余环境复用同一版本
      const versionCache = cache || {};
      if (!versionCache.info) {
        versionCache.info = PushToMultipleEnvs.readAndBumpVersion(autoscript, scriptStoragePath, logger, filePath);
      }
      const info = versionCache.info;

      if (info.skip) {
        return { version: '', logLevel: undefined };
      }
      const version = info.version;
      const loglevel = info.logLevel;

      const hostname = require('os').hostname();
      const historyUrl = `${env.serverUrl}/api/script/SKS_AUTOSCRIPT_HISTORY_SAVE`;
      const historyBody = {
        source: source,
        autoscript: autoscript,
        version: version,
        aliasname: aliasName || '',
        hostname: hostname
      };

      const result = await httpRequestToMaximo({
        url: historyUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.authType === 'maxauth' ? { 'MAXAUTH': env.maxauth } : { 'apiKey': env.apiKey })
        },
        data: historyBody,
        ...overridesOf(env)
      });

      if (result.status === 200 || result.status === 201) {
        logger.info(`[_saveScriptHistory] ✅ 历史记录保存成功: ${autoscript} v${version}`);
      } else {
        logger.error(`[_saveScriptHistory] 历史记录保存失败，状态码: ${result.status}`);
      }
      return { version, logLevel: loglevel };
    } catch (error: any) {
      logger.error(`[_saveScriptHistory] 保存历史记录异常: ${error.message}`);
      throw error;
    }
  }

  /**
   * 推送自动化脚本到指定环境（复制自 ConfigPanel.pushScriptToMaximo，改为按环境执行）
   */
  private static async pushScriptToEnv(
    autoscript: string,
    source: string,
    env: EnvironmentConfig,
    logger: vscode.LogOutputChannel,
    filePath?: string,
    versionCache?: VersionCache,
    redeploy: boolean = false
  ): Promise<PushResult> {
    logger.debug(`[MultiEnv][pushScript] 开始推送脚本: ${autoscript} @ ${env.envnum}`);
    try {
      if (!autoscript || !source) {
        return { success: false, errorMessage: 'autoscript, source 缺少必要参数' };
      }

      const cfg = vscode.workspace.getConfiguration('maximoScript');
      const aliasName = cfg.get<string>('aliasName', '');
      const scriptStoragePath = cfg.get<string>('scriptStoragePath', 'masscript');

      const serverUrl = env.serverUrl;
      const authType = env.authType;
      const maxauth = env.maxauth;
      const apiKey = env.apiKey;

      if (!serverUrl) { return { success: false, errorMessage: '服务器地址未配置' }; }
      if (authType === 'maxauth' && !maxauth) { return { success: false, errorMessage: 'MAXAUTH 未配置' }; }
      if (authType === 'apikey' && !apiKey) { return { success: false, errorMessage: 'API Key 未配置' }; }

      // 步骤0: 版本检查
      try {
        const metadataUrl = `script/SKS_GET_AUTOSCRIPTINFOBYNAME`;
        const metadataResult = await httpRequestToMaximo({
          url: metadataUrl,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: { 'AUTOSCRIPT': autoscript },
          ...overridesOf(env)
        });

        if (metadataResult.status === 200 && metadataResult.data) {
          let serverMetadata: any;
          try {
            serverMetadata = typeof metadataResult.data === 'string' ? JSON.parse(metadataResult.data) : metadataResult.data;
          } catch (parseErr) {
            logger.warn(`[MultiEnv][pushScript] 解析服务器元数据失败: ${parseErr}`);
          }

          if (serverMetadata && serverMetadata.code === 200 && serverMetadata.data) {
            const serverVersion = serverMetadata.data.version || '';

            let localVersion = '';
            let jsonFilePath: string;
            if (filePath) {
              jsonFilePath = path.join(path.dirname(filePath), `${autoscript}.json`);
            } else {
              const workspaceFolders = vscode.workspace.workspaceFolders;
              jsonFilePath = (workspaceFolders && workspaceFolders.length > 0)
                ? path.join(workspaceFolders[0].uri.fsPath, scriptStoragePath || 'masscript', `${autoscript}.json`)
                : '';
            }

            if (jsonFilePath && fs.existsSync(jsonFilePath)) {
              try {
                const localJson = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
                localVersion = localJson.version || '';
              } catch (e) {
                logger.warn(`[MultiEnv][pushScript] 读取本地 JSON 文件失败: ${e}`);
              }
            }

            if (serverVersion && PushToMultipleEnvs.compareVersions(serverVersion, localVersion) > 0) {
              const exportUrl = `script/SKS_EXP_AUTOSCRIPTBYNAME`;
              const exportResult = await httpRequestToMaximo({
                url: exportUrl,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                data: { 'AUTOSCRIPT': autoscript },
                ...overridesOf(env)
              });

              if (exportResult.status === 200 && exportResult.data) {
                const serverSourceCode = typeof exportResult.data === 'string' ? exportResult.data : JSON.stringify(exportResult.data);
                let saveDir: string;
                if (filePath) {
                  saveDir = path.dirname(filePath);
                } else {
                  const wf = vscode.workspace.workspaceFolders;
                  saveDir = wf ? path.join(wf[0].uri.fsPath, scriptStoragePath || 'masscript') : '';
                }

                if (saveDir) {
                  const scriptLanguage = (serverMetadata.data.SCRIPTLANGUAGE || 'javascript').toLowerCase();
                  const extMap: Record<string, string> = {
                    'javascript': 'js', 'js': 'js', 'python': 'py', 'jython': 'py',
                    'py': 'py', 'nashorn': 'js', 'ecmascript': 'js', 'mbr': 'py'
                  };
                  const ext = extMap[scriptLanguage] || 'js';
                  const serverFileName = `${autoscript}-${serverVersion}.${ext}`;
                  const serverFilePath = path.join(saveDir, serverFileName);
                  fs.writeFileSync(serverFilePath, serverSourceCode, 'utf-8');
                  ConfigPanel.showVersionWarning(
                    `服务器有更新: ${autoscript} (服务器:${serverVersion} 本地:${localVersion || '无'}) 点击查看`,
                    serverFilePath
                  );
                  return { success: false, errorMessage: `服务器版本(${serverVersion})高于本地(${localVersion || '无'})，推送已取消` };
                }
              }
            }
          }
        }
      } catch (versionCheckError: any) {
        logger.warn(`[MultiEnv][pushScript] 版本检查失败: ${versionCheckError.message}，继续推送`);
      }

      // 步骤1: 保存历史记录
      let historyResult: { version: string; logLevel: any } = { version: '', logLevel: undefined };
      try {
        historyResult = await PushToMultipleEnvs.saveScriptHistory(autoscript, source, env, aliasName, scriptStoragePath, logger, filePath, versionCache);
      } catch (historyError: any) {
        logger.error(`[MultiEnv][pushScript] 保存历史记录失败: ${historyError.message}`);
      }

      // 步骤2: 检查脚本是否存在
      const checkUrl = `os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript&oslc.where=autoscript="${autoscript}"`;
      const checkResult = await httpRequestToMaximo({
        url: checkUrl,
        method: 'GET',
        ...overridesOf(env)
      });

      let scriptExists = false;
      let scriptHref: string | undefined;
      if (checkResult.status === 200 && checkResult.data) {
        const memberCount = checkResult.data.member ? checkResult.data.member.length : 0;
        scriptExists = memberCount > 0;
        if (scriptExists && checkResult.data.member[0]) {
          scriptHref = checkResult.data.member[0].href;
        }
      } else {
        return { success: false, errorMessage: `检查脚本失败: ${checkResult.status}` };
      }

      // 勾选"重新部署脚本"时，先删除已存在的脚本，后续走新增流程
      if (redeploy && scriptExists) {
        const deleteResult = await PushToMultipleEnvs.deleteScriptInEnv(autoscript, scriptHref, env, logger);
        if (!deleteResult.success) {
          return { success: false, errorMessage: deleteResult.errorMessage || '删除脚本失败' };
        }
        scriptExists = false;
        scriptHref = undefined;
      }

      // 读取本地 JSON（新增时复用导入脚本的完整字段逻辑）
      const localConfig = PushToMultipleEnvs.readLocalScriptConfig(autoscript, scriptStoragePath, logger, filePath);

      // 步骤3: 脚本不存在时自动新增（复用导入脚本的新增逻辑，保留 launchpoints/variables/包名等完整信息）
      if (!scriptExists) {
        const customFields = PushToMultipleEnvs.buildCustomFields(localConfig, autoscript, source);
        const createBody = PushToMultipleEnvs.buildDeployBody(customFields);
        if (historyResult.version) { createBody['spi:version'] = historyResult.version; }
        if (createBody['spi:loglevel'] === undefined
          && historyResult.logLevel !== undefined && historyResult.logLevel !== null && historyResult.logLevel !== '') {
          createBody['spi:loglevel'] = historyResult.logLevel;
        }

        const createResult = await httpRequestToMaximo({
          url: 'os/MXAPIAUTOSCRIPT',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: createBody,
          ...overridesOf(env)
        });

        if (createResult.data && createResult.data.status && createResult.data.status === 'error') {
          return { success: false, errorMessage: `新增脚本失败: ${JSON.stringify(createResult.data.message || createResult.data)}` };
        }
        if (createResult.status === 200 || createResult.status === 201) {
          logger.info(`[MultiEnv][pushScript] ✅ 脚本不存在，已新增: ${autoscript} @ ${env.envnum}`);
          return { success: true };
        }
        return { success: false, errorMessage: `新增脚本失败: ${createResult.status} ${JSON.stringify(createResult.data)}` };
      }

      // 步骤4-5: 构建部署请求
      const deployUrl = `os/MXSCRIPT/_${Buffer.from(autoscript).toString('base64')}`;
      const deployBody: any = {};
      if (!deployBody['spi:autoscript']) { deployBody['spi:autoscript'] = autoscript; }
      if (!deployBody['spi:source']) { deployBody['spi:source'] = source.replace(/\r\n/g, '\n'); }
      if (historyResult.version) { deployBody['spi:version'] = historyResult.version; }
      if (historyResult.logLevel !== undefined && historyResult.logLevel !== null && historyResult.logLevel !== '') {
        deployBody['spi:loglevel'] = historyResult.logLevel;
      }
      // 带上本地包名
      const packagePath = localConfig.ibm_packagepath || localConfig.IBM_PACKAGEPATH || localConfig.PACKAGEPATH;
      if (typeof packagePath === 'string' && packagePath.trim() !== '') {
        deployBody['spi:ibm_packagepath'] = packagePath.trim();
      }

      // 步骤6: 发送请求
      const deployResult = await httpRequestToMaximo({
        url: deployUrl,
        method: 'POST',
        headers: { 'x-method-override': 'PATCH' },
        data: deployBody,
        ...overridesOf(env)
      });

      if (deployResult.data && deployResult.data.status && deployResult.data.status === 'error') {
        return { success: false, errorMessage: `部署失败: ${deployResult.data.status} ${JSON.stringify(deployResult.data.message)}` };
      }
      if (deployResult.status === 200 || deployResult.status === 201 || deployResult.status === 204) {
        return { success: true };
      }
      return { success: false, errorMessage: `部署失败: ${deployResult.status} ${JSON.stringify(deployResult.data)}` };
    } catch (error: any) {
      return { success: false, errorMessage: error.message };
    }
  }

  /**
   * 推送应用 XML 到指定环境（复制自 ConfigPanel.pushXmlToMaximo，改为按环境执行）
   */
  private static async pushXmlToEnv(xmlContent: string, env: EnvironmentConfig, logger: vscode.LogOutputChannel): Promise<PushResult> {
    try {
      const cfg = vscode.workspace.getConfiguration('maximoScript');
      const serverUrl = env.serverUrl;
      const maxauth = env.maxauth;
      const pushXmlAlwaysUseMaxauth = env.pushXmlAlwaysUseMaxauth ?? cfg.get<boolean>('pushXmlAlwaysUseMaxauth', true);
      const aliasNameConfig = cfg.get<string>('aliasName', '');

      if (!serverUrl) { return { success: false, errorMessage: '服务器地址未配置' }; }
      if (!maxauth && pushXmlAlwaysUseMaxauth) {
        return { success: false, errorMessage: 'MAXAUTH 未配置,推送应用xml需要使用MAXAUTH' };
      }

      const hostname = require('os').hostname();
      let deployUrl = `script/SKS.AUTOSCRIPT.SCREENS`;
      const queryParams: string[] = [];
      if (hostname) { queryParams.push(`_clenthost=${encodeURIComponent(hostname)}`); }
      if (aliasNameConfig) { queryParams.push(`_aliasname=${encodeURIComponent(aliasNameConfig)}`); }
      if (queryParams.length > 0) { deployUrl += '?' + queryParams.join('&'); }

      const requestOptions: any = {
        url: deployUrl,
        method: 'POST',
        noAuth: true,
        headers: { 'Content-Type': 'application/xml' },
        data: xmlContent,
        logger: logger,
        ...overridesOf(env)
      };

      if (pushXmlAlwaysUseMaxauth) {
        requestOptions.authTypeIn = 'maxauth';
      } else {
        requestOptions.noAuth = false;
      }

      const deployResult = await httpRequestToMaximo(requestOptions);

      if (deployResult.data && deployResult.data.status && deployResult.data.status === 'error') {
        return { success: false, errorMessage: `部署失败: ${deployResult.data.status} ${JSON.stringify(deployResult.data.message)}` };
      }

      const { hasError, errorMsg } = checkResponseHasError(deployResult, logger, '[MultiEnv][pushXml]');
      if (hasError) {
        return { success: false, errorMessage: errorMsg };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, errorMessage: error.message };
    }
  }

  /**
   * 导入脚本到指定环境（复制自 ConfigPanel.importScriptFromJson，改为按环境执行）
   */
  private static async importScriptToEnv(
    scriptName: string,
    source: string,
    scriptConfig: any,
    env: EnvironmentConfig,
    logger: vscode.LogOutputChannel,
    filePath?: string,
    versionCache?: VersionCache,
    redeploy: boolean = false
  ): Promise<PushResult> {
    try {
      const cfg = vscode.workspace.getConfiguration('maximoScript');
      const aliasName = cfg.get<string>('aliasName', '');
      const scriptStoragePath = cfg.get<string>('scriptStoragePath', 'masscript');

      const authType = env.authType;
      const maxauth = env.maxauth;
      const apiKey = env.apiKey;

      if (!env.serverUrl || (authType === 'maxauth' && !maxauth) || (authType === 'apikey' && !apiKey)) {
        return { success: false, errorMessage: '配置不完整，请先在配置面板中设置服务器信息' };
      }

      let historyResult: { version: string; logLevel: any } = { version: '', logLevel: undefined };
      try {
        historyResult = await PushToMultipleEnvs.saveScriptHistory(scriptName, source, env, aliasName, scriptStoragePath, logger, filePath, versionCache);
      } catch (historyError: any) {
        logger.error(`[MultiEnv][importScript] 保存历史记录失败: ${historyError.message}`);
      }

      const customFields = PushToMultipleEnvs.buildCustomFields(scriptConfig, scriptName, source);

      const checkUrl = `os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript&oslc.where=autoscript="${scriptName}"`;
      const checkResult = await httpRequestToMaximo({
        url: checkUrl,
        method: 'GET',
        headers: {
          ...(authType === 'maxauth' ? { 'MAXAUTH': maxauth } : { 'apiKey': apiKey })
        },
        ...overridesOf(env)
      });

      let scriptExists = false;
      let scriptHref: any = null;

      if (checkResult.status === 200 && checkResult.data) {
        const memberCount = checkResult.data.member ? checkResult.data.member.length : 0;
        if (memberCount === 1) {
          scriptExists = true;
          scriptHref = checkResult.data.member[0].href;
        }
      }

      // 勾选"重新部署脚本"时，先删除已存在的脚本，后续走新增流程
      if (redeploy && scriptExists) {
        const deleteResult = await PushToMultipleEnvs.deleteScriptInEnv(scriptName, scriptHref, env, logger);
        if (!deleteResult.success) {
          return { success: false, errorMessage: deleteResult.errorMessage || '删除脚本失败' };
        }
        scriptExists = false;
        scriptHref = null;
      }

      let deployUrl: string;
      const deployMethod: 'POST' | 'PATCH' = 'POST';
      const deployHeaders: any = {
        'Content-Type': 'application/json',
        ...(authType === 'maxauth' ? { 'MAXAUTH': maxauth } : { 'apiKey': apiKey })
      };

      if (scriptExists && scriptHref) {
        deployUrl = scriptHref;
        deployHeaders['Content-Type'] = 'application/merge-patch+json';
        deployHeaders['x-method-override'] = 'PATCH';
      } else {
        deployUrl = `os/MXAPIAUTOSCRIPT`;
      }

      const deployBody = PushToMultipleEnvs.buildDeployBody(customFields);

      const deployResult = await httpRequestToMaximo({
        url: deployUrl,
        method: deployMethod,
        headers: deployHeaders,
        data: deployBody,
        ...overridesOf(env)
      });

      const { hasError, errorMsg } = checkResponseHasError(deployResult, logger, '[MultiEnv][importScript]');
      if (hasError) {
        return { success: false, errorMessage: errorMsg };
      }
      return { success: true };
    } catch (error: any) {
      logger.error(`[MultiEnv][importScript] 导入失败: ${error.message}`);
      return { success: false, errorMessage: error.message };
    }
  }

  /**
   * 对单个环境执行推送（根据类型分发）
   */
  private static async pushToEnv(
    target: PushTarget,
    env: EnvironmentConfig,
    logger: vscode.LogOutputChannel,
    versionCache?: VersionCache,
    redeploy: boolean = false
  ): Promise<void> {
    let result: PushResult;
    if (target.kind === 'script') {
      result = await PushToMultipleEnvs.pushScriptToEnv(target.scriptName, target.source!, env, logger, target.filePath, versionCache, redeploy);
    } else if (target.kind === 'xml') {
      result = await PushToMultipleEnvs.pushXmlToEnv(target.xmlContent!, env, logger);
    } else if (target.kind === 'import') {
      result = await PushToMultipleEnvs.importScriptToEnv(target.scriptName, target.source!, target.scriptConfig, env, logger, target.filePath, versionCache, redeploy);
    } else {
      throw new Error('未知推送类型');
    }
    if (!result.success) {
      throw new Error(result.errorMessage || '推送失败');
    }
  }

  /**
   * 主入口：解析目标 -> 勾选环境 -> 逐个推送 -> 汇总
   */
  static async run(uri: vscode.Uri | undefined, logger: vscode.LogOutputChannel): Promise<void> {
    const resolved = PushToMultipleEnvs.resolveTarget(uri);
    if ('error' in resolved) {
      vscode.window.showErrorMessage(resolved.error);
      return;
    }
    const target = resolved as PushTarget;

    const selection = await PushToMultipleEnvs.pickEnvironments(target.kind !== 'xml');
    if (!selection) {
      return;
    }
    const { envs, redeploy } = selection;

    if (redeploy) {
      const confirm = await vscode.window.showWarningMessage(
        `已勾选"重新部署脚本"：将在 ${envs.map(e => e.envnum).join(', ')} 中删除已存在的脚本后重新导入，是否继续？`,
        { modal: true },
        '继续'
      );
      if (confirm !== '继续') {
        return;
      }
      logger.info('[PushToMultipleEnvs] 已勾选重新部署：推送前会先删除已存在的脚本');
    }

    const kindLabel = (target.kind === 'script' ? '推送脚本' : target.kind === 'xml' ? '推送应用 XML' : '导入脚本')
      + (redeploy ? '（重新部署）' : '');
    logger.info(`[PushToMultipleEnvs] 开始${kindLabel}: ${target.scriptName}，目标环境: ${envs.map(e => e.envnum).join(', ')}`);

    const results: PerEnvResult[] = [];
    // 本轮所有环境共用一个版本号，避免每推一个环境版本号 +1
    const versionCache: VersionCache = {};

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `${kindLabel} 到多个环境`,
        cancellable: false
      },
      async (progress) => {
        const total = envs.length;
        for (let i = 0; i < total; i++) {
          const env = envs[i];
          progress.report({ message: `(${i + 1}/${total}) ${env.envnum}`, increment: 100 / total });
          try {
            await PushToMultipleEnvs.pushToEnv(target, env, logger, versionCache, redeploy);
            results.push({ envnum: env.envnum, success: true });
            logger.info(`[PushToMultipleEnvs] ✅ ${env.envnum} 成功`);
          } catch (error: any) {
            results.push({ envnum: env.envnum, success: false, message: error.message });
            logger.error(`[PushToMultipleEnvs] ❌ ${env.envnum} 失败: ${error.message}`);
          }
        }
      }
    );

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    const lines = results.map(r => `${r.success ? '✅' : '❌'} ${r.envnum}${r.success ? '' : `：${r.message || '失败'}`}`);
    const summary = `${kindLabel}完成：成功 ${successCount}，失败 ${failCount}\n` + lines.join('\n');

    logger.info(`[PushToMultipleEnvs] ${summary.replace(/\n/g, ' | ')}`);

    if (failCount === 0) {
      vscode.window.showInformationMessage(`${kindLabel}到多个环境全部成功（${successCount} 个）`);
    } else {
      vscode.window.showWarningMessage(summary, { modal: true });
    }
  }
}
