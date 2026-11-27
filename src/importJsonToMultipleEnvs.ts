import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EnvironmentConfig, loadEnvironments } from './envConfig';
import { httpRequestToMaximo } from './httpRequest';

/**
 * JSON 导入到多个环境的对象类型
 * 参数与 maximo-manager-panel 中 src/views/maximo_v2 下各导入对话框保持一致
 */
export type JsonImportKind =
  | 'maxobject'
  | 'autokey'
  | 'maxvars'
  | 'maxmessage'
  | 'maxapps'
  | 'maxmodules'
  | 'maxmenu'
  | 'sigoption'
  | 'maxobjectcfg'
  | 'maxattributecfg'
  | 'domain';

/** 导入参数勾选项 */
interface KindOption {
  key: string;
  label: string;
  picked: boolean;
}

/** 各类型导入规格 */
interface ImportSpec {
  kind: JsonImportKind;
  label: string;
  script: string;
  /** 源 JSON 中可识别的数组根节点 */
  wrapperKeys: string[];
  /** 单对象格式的识别字段 */
  singleKeys: string[];
  /** 发往服务端的数组包装字段 */
  outKey: string;
  batchSize?: number;
  options: KindOption[];
  buildQuery(selected: string[], env: EnvironmentConfig): Record<string, string>;
}

interface ImportTotals {
  total: number;
  added: number;
  updated: number;
  deleted: number;
  failed: number;
  failures: string[];
}

interface EnvImportResult {
  envnum: string;
  success: boolean;
  totals?: ImportTotals;
  message?: string;
  /** 结构化返回：请求信息 + 每批响应体，用于面板“查看详情”的树结构与 JSON 源码 */
  json: any;
}

function overridesOf(env: EnvironmentConfig) {
  return {
    serverUrl: env.serverUrl,
    authTypeIn: env.authType,
    maxauth: env.maxauth,
    apiKey: env.apiKey,
    apiType: env.apiType,
    langcode: env.langcode
  };
}

function langOf(env: EnvironmentConfig): string {
  return String(env.langcode || 'ZH');
}

/** 多语言维护页共用的 select 参数 */
function mlQuery(onlyFunctions: string, selected: string[], env: EnvironmentConfig): Record<string, string> {
  return {
    _action: 'import',
    _langcode: langOf(env),
    _onlyFunctions: onlyFunctions,
    _allLangcode: 'true',
    dmDeploySet: selected.indexOf('dmDeploySet') >= 0 ? 'true' : 'false'
  };
}

const ML_OPTIONS: KindOption[] = [
  { key: 'dmDeploySet', label: '启用迁移模式(dmDeploySet)', picked: true }
];

const SPECS: Record<JsonImportKind, ImportSpec> = {
  maxobject: {
    kind: 'maxobject',
    label: 'MAXOBJECT 对象配置',
    script: 'SKS_MIGRATEAPI_CONFIGUR',
    wrapperKeys: ['maxObjects'],
    singleKeys: ['object', 'OBJECT'],
    outKey: 'maxObjects',
    options: [
      { key: 'importMl', label: '导入多语言数据（sks:langdata，取消勾选只导入结构）', picked: true },
      { key: 'dmDeploySet', label: 'dmDeploySet（迁移模式：sameAs 引用的对象/属性目标环境不存在时需开启）', picked: false },
      { key: 'enableDelete', label: '启用删除字段（JSON 中 delete:true 的属性实际删除）', picked: false }
    ],
    buildQuery(selected, env) {
      const q: Record<string, string> = {
        _action: 'import',
        _langcode: langOf(env),
        dmDeploySet: selected.indexOf('dmDeploySet') >= 0 ? 'true' : 'false'
      };
      if (selected.indexOf('enableDelete') >= 0) {
        q._enableDelete = 'true';
      }
      if (selected.indexOf('importMl') >= 0) {
        q._allLangcode = 'true';
      } else {
        q._onlyFunctions = 'configur';
      }
      return q;
    }
  },
  autokey: {
    kind: 'autokey',
    label: '自动编号 AUTOKEY',
    script: 'SKS_MIGRATEAPI_AUTOKEY',
    wrapperKeys: ['autokeys'],
    singleKeys: ['autokeyname', 'AUTOKEYNAME'],
    outKey: 'autokeys',
    batchSize: 200,
    options: [
      { key: 'dmDeploySet', label: '启用迁移模式(dmDeploySet)', picked: false }
    ],
    buildQuery(selected, env) {
      const q: Record<string, string> = { _action: 'import', _langcode: langOf(env) };
      if (selected.indexOf('dmDeploySet') >= 0) {
        q.dmDeploySet = 'true';
      }
      return q;
    }
  },
  maxvars: {
    kind: 'maxvars',
    label: '系统变量 MAXVARS',
    script: 'SKS_MIGRATEAPI_MAXVARS',
    wrapperKeys: ['maxvarsList', 'maxvars', 'variables'],
    singleKeys: ['varname', 'VARNAME'],
    outKey: 'maxvarsList',
    options: [],
    buildQuery(selected, env) {
      return { _action: 'import', _langcode: langOf(env) };
    }
  },
  maxmessage: {
    kind: 'maxmessage',
    label: '消息 MAXMESSAGES',
    script: 'SKS_MIGRATEAPI_MAXMESSAGES',
    wrapperKeys: ['messages'],
    singleKeys: ['msgkey', 'MSGKEY'],
    outKey: 'messages',
    batchSize: 500,
    options: [
      { key: 'allLangCode', label: '按 sks:langdata 导入所有语言(_allLangcode)', picked: true },
      { key: 'dmDeploySet', label: '启用迁移模式(dmDeploySet)', picked: false }
    ],
    buildQuery(selected, env) {
      const q: Record<string, string> = {
        _action: 'import',
        _langcode: langOf(env),
        _allLangcode: selected.indexOf('allLangCode') >= 0 ? 'true' : 'false'
      };
      if (selected.indexOf('dmDeploySet') >= 0) {
        q.dmDeploySet = 'true';
      }
      return q;
    }
  },
  maxapps: {
    kind: 'maxapps',
    label: '应用多语言 MAXAPPS',
    script: 'SKS_MIGRATEAPI_CONFIGUR',
    wrapperKeys: ['maxappsList', 'maxObjects'],
    singleKeys: [],
    outKey: 'maxappsList',
    options: ML_OPTIONS,
    buildQuery(selected, env) { return mlQuery('mlmaxapps', selected, env); }
  },
  maxmodules: {
    kind: 'maxmodules',
    label: '模块多语言 MAXMODULES',
    script: 'SKS_MIGRATEAPI_CONFIGUR',
    wrapperKeys: ['maxmodulesList', 'maxObjects'],
    singleKeys: [],
    outKey: 'maxmodulesList',
    options: ML_OPTIONS,
    buildQuery(selected, env) { return mlQuery('mlmaxmodules', selected, env); }
  },
  maxmenu: {
    kind: 'maxmenu',
    label: '菜单多语言 MAXMENU',
    script: 'SKS_MIGRATEAPI_CONFIGUR',
    wrapperKeys: ['maxmenuList', 'maxObjects'],
    singleKeys: [],
    outKey: 'maxmenuList',
    options: ML_OPTIONS,
    buildQuery(selected, env) { return mlQuery('mlmaxmenu', selected, env); }
  },
  sigoption: {
    kind: 'sigoption',
    label: '签名选项多语言 SIGOPTION',
    script: 'SKS_MIGRATEAPI_CONFIGUR',
    wrapperKeys: ['sigoptionList', 'maxObjects'],
    singleKeys: [],
    outKey: 'sigoptionList',
    options: ML_OPTIONS,
    buildQuery(selected, env) { return mlQuery('mlsigoption', selected, env); }
  },
  maxobjectcfg: {
    kind: 'maxobjectcfg',
    label: '对象配置多语言 MAXOBJECTCFG',
    script: 'SKS_MIGRATEAPI_CONFIGUR',
    wrapperKeys: ['maxobjectcfgList', 'maxObjects'],
    singleKeys: [],
    outKey: 'maxobjectcfgList',
    options: ML_OPTIONS,
    buildQuery(selected, env) { return mlQuery('mlmaxobjectcfg', selected, env); }
  },
  maxattributecfg: {
    kind: 'maxattributecfg',
    label: '属性配置多语言 MAXATTRIBUTECFG',
    script: 'SKS_MIGRATEAPI_CONFIGUR',
    wrapperKeys: ['maxattributecfgList', 'maxObjects'],
    singleKeys: [],
    outKey: 'maxattributecfgList',
    options: ML_OPTIONS,
    buildQuery(selected, env) { return mlQuery('mlmaxattributecfg', selected, env); }
  },
  domain: {
    kind: 'domain',
    label: '域定义 MAXDOMAIN',
    script: 'SKS_MIGRATEAPI_DOMAIN',
    wrapperKeys: ['domainList'],
    singleKeys: [],
    outKey: 'domainList',
    options: [
      { key: 'allLangcode', label: '导入多语言数据（sks:langdata）', picked: true },
      { key: 'dmDeploySet', label: '启用迁移模式(dmDeploySet)', picked: false },
      { key: 'errorAssert', label: '遇到错误时中断导入(_errorAssert)', picked: false },
      { key: 'keepAln', label: '保留(不删除)不存在的 ALN 值', picked: false },
      { key: 'keepSynonym', label: '保留(不删除)不存在的同义词', picked: false },
      { key: 'keepNumeric', label: '保留(不删除)不存在的数值', picked: false },
      { key: 'keepNumRange', label: '保留(不删除)不存在的数值范围', picked: false },
      { key: 'keepTable', label: '保留(不删除)不存在的表域', picked: false }
    ],
    buildQuery(selected, env) {
      const q: Record<string, string> = {
        _action: 'import',
        _langcode: langOf(env),
        _allLangcode: selected.indexOf('allLangcode') >= 0 ? 'true' : 'false'
      };
      if (selected.indexOf('dmDeploySet') >= 0) {
        q.dmDeploySet = 'true';
      }
      if (selected.indexOf('errorAssert') >= 0) {
        q._errorAssert = 'true';
      }
      const keep: string[] = [];
      if (selected.indexOf('keepAln') >= 0) { keep.push('alndomain'); }
      if (selected.indexOf('keepSynonym') >= 0) { keep.push('synonymdomain'); }
      if (selected.indexOf('keepNumeric') >= 0) { keep.push('numericdomain'); }
      if (selected.indexOf('keepNumRange') >= 0) { keep.push('numrangedomain'); }
      if (selected.indexOf('keepTable') >= 0) { keep.push('tabledomain'); }
      if (keep.length) {
        q._deleteNotExists = keep.map(k => `domainList:_skschild_${k}:${k}`).join(',');
      }
      return q;
    }
  }
};

function buildQueryString(query: Record<string, string>): string {
  return Object.keys(query)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join('&');
}

/** 从导入 JSON 中提取数据行（兼容数组 / 包装对象 / 单对象） */
function extractRows(parsed: any, spec: ImportSpec): any[] | null {
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }
  const containers = [parsed, parsed.data];
  for (const container of containers) {
    if (!container || typeof container !== 'object') {
      continue;
    }
    for (const key of spec.wrapperKeys) {
      if (Array.isArray(container[key])) {
        return container[key];
      }
    }
  }
  for (const key of spec.singleKeys) {
    if (parsed[key]) {
      return [parsed];
    }
  }
  return null;
}

/** 解析脚本返回体 */
function parseBody(res: any): any {
  let body: any = res && res.data !== undefined ? res.data : res;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      // 非 JSON 响应按原文处理
    }
  }
  if (body && body.code !== undefined && body.data !== undefined) {
    body = body.data;
  }
  return body;
}

/** 累计统计信息 */
function mergeResponse(totals: ImportTotals, body: any): void {
  if (!body) {
    throw new Error('服务端返回为空');
  }
  if (body.status === 'error') {
    throw new Error(body.message || '导入失败');
  }
  const data = body.data || {};
  totals.added += Number(data.added || 0);
  totals.updated += Number(data.updated || 0);
  totals.deleted += Number(data.deleted || 0);
  totals.failed += Number(data.failed || 0);
  const results = Array.isArray(data.results) ? data.results : [];
  for (const item of results) {
    if (item && String(item._status || '').toLowerCase() === 'failed' && totals.failures.length < 5) {
      totals.failures.push(`${item['sks:ref'] || ''} ${item._message || ''}`.trim());
    }
  }
}

/** 按环境分批导入，返回统计与结构化响应（树结构 / JSON 源码展示用） */
async function importToEnv(
  spec: ImportSpec,
  rows: any[],
  selected: string[],
  env: EnvironmentConfig,
  logger: vscode.LogOutputChannel
): Promise<EnvImportResult> {
  const totals: ImportTotals = {
    total: rows.length,
    added: 0,
    updated: 0,
    deleted: 0,
    failed: 0,
    failures: []
  };
  const batchSize = spec.batchSize && spec.batchSize > 0 ? spec.batchSize : rows.length;
  const queryString = buildQueryString(spec.buildQuery(selected, env));
  const url = `script/${spec.script}?${queryString}`;
  const responses: any[] = [];
  const payload: any = {
    request: { method: 'POST', url, langcode: langOf(env), batchSize },
    responses
  };
  try {
    for (let offset = 0; offset < rows.length; offset += batchSize) {
      const batch = rows.slice(offset, offset + batchSize);
      const result = await httpRequestToMaximo({
        url,
        method: 'POST',
        data: { [spec.outKey]: batch },
        timeout: 1800000,
        ...overridesOf(env),
        logger
      });
      const body = parseBody(result);
      const bodyClone = safeClone(body);
      responses.push({
        batch: `${offset + 1}-${Math.min(offset + batch.length, rows.length)}`,
        httpStatus: result.status,
        body: bodyClone
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`HTTP ${result.status}`);
      }
      mergeResponse(totals, body);
    }
    payload.totals = totals;
    logger.info(`[ImportJsonPanel] ✅ ${env.envnum} 完成: 共 ${totals.total} 条，新增 ${totals.added}，更新 ${totals.updated}，删除 ${totals.deleted}，失败 ${totals.failed}`);
    return { envnum: env.envnum, success: true, totals, json: payload };
  } catch (error: any) {
    const message = error && error.message ? error.message : String(error);
    payload.error = message;
    logger.error(`[ImportJsonPanel] ❌ ${env.envnum} 失败: ${message}`);
    return { envnum: env.envnum, success: false, message, json: payload };
  }
}

/** 深拷贝响应体，避免 webview postMessage 传输大对象时报错（含循环引用等） */
function safeClone(body: any): any {
  if (body === undefined || body === null) {
    return body;
  }
  try {
    return JSON.parse(JSON.stringify(body));
  } catch (e) {
    return String(body);
  }
}

/**
 * “Maximo Script: 导入到多个环境” Web 导入面板
 * 左侧选择功能项，右侧配置参数/环境，导入后按环境展示结果并支持查看详情
 */
export class ImportJsonPanel {
  private static currentPanel: ImportJsonPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly logger: vscode.LogOutputChannel;
  private filePath: string;
  private running = false;

  static createOrShow(extensionUri: vscode.Uri, filePath: string, logger: vscode.LogOutputChannel): ImportJsonPanel {
    if (ImportJsonPanel.currentPanel) {
      ImportJsonPanel.currentPanel.filePath = filePath;
      ImportJsonPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      ImportJsonPanel.currentPanel.sendInit();
      return ImportJsonPanel.currentPanel;
    }
    const panel = vscode.window.createWebviewPanel(
      'maximoImportJson',
      '导入到多个环境',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    ImportJsonPanel.currentPanel = new ImportJsonPanel(panel, extensionUri, filePath, logger);
    return ImportJsonPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, filePath: string, logger: vscode.LogOutputChannel) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.filePath = filePath;
    this.logger = logger;
    this.panel.webview.html = this.getHtml();
    this.panel.onDidDispose(() => {
      ImportJsonPanel.currentPanel = undefined;
    });
    this.panel.webview.onDidReceiveMessage(async message => {
      switch (message.command) {
        case 'ready':
          this.sendInit();
          return;
        case 'import':
          await this.handleImport(message);
          return;
        case 'openDetailInEditor':
          this.openDetailInEditor(message);
          return;
      }
    });
  }

  /** 把某环境的导入返回 JSON 写到临时文件并在编辑器打开 */
  private openDetailInEditor(message: any): void {
    try {
      const envnum = String(message.envnum || 'result');
      const json = message.json;
      const text = typeof json === 'string' ? json : JSON.stringify(json, null, 2);
      const safeName = envnum.replace(/[^\w.-]+/g, '_');
      const tmpFile = path.join(os.tmpdir(), `import-result-${safeName}-${Date.now()}.json`);
      fs.writeFileSync(tmpFile, text, 'utf-8');
      vscode.workspace.openTextDocument(tmpFile).then(doc => {
        vscode.window.showTextDocument(doc, { preview: false });
      });
    } catch (error: any) {
      vscode.window.showErrorMessage(`在编辑器中打开失败: ${error.message}`);
    }
  }

  /** 发送功能项、环境与源文件信息 */
  private sendInit(): void {
    const kinds = Object.keys(SPECS).map(key => {
      const spec = SPECS[key as JsonImportKind];
      return {
        kind: spec.kind,
        label: spec.label,
        options: spec.options,
        rows: this.countRows(spec)
      };
    });
    const envs = loadEnvironments().map(e => ({ envnum: e.envnum, serverUrl: e.serverUrl }));
    this.panel.webview.postMessage({
      command: 'init',
      filePath: this.filePath,
      fileName: path.basename(this.filePath),
      kinds,
      envs
    });
  }

  private countRows(spec: ImportSpec): number {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8').replace(/^\uFEFF/, '').trim());
      const rows = extractRows(parsed, spec);
      return rows ? rows.length : 0;
    } catch (e) {
      return 0;
    }
  }

  private async handleImport(message: any): Promise<void> {
    if (this.running) {
      return;
    }
    const spec = SPECS[message.kind as JsonImportKind];
    if (!spec) {
      this.panel.webview.postMessage({ command: 'importError', error: `不支持的导入类型: ${message.kind}` });
      return;
    }
    const envnums: string[] = Array.isArray(message.envnums) ? message.envnums : [];
    const envs = loadEnvironments().filter(e => envnums.indexOf(e.envnum) >= 0);
    if (envs.length === 0) {
      this.panel.webview.postMessage({ command: 'importError', error: '请至少勾选一个目标环境' });
      return;
    }

    let rows: any[] | null = null;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf-8').replace(/^\uFEFF/, '').trim());
      rows = extractRows(parsed, spec);
    } catch (e: any) {
      this.panel.webview.postMessage({ command: 'importError', error: `解析 JSON 失败: ${e.message}` });
      return;
    }
    if (!rows || rows.length === 0) {
      this.panel.webview.postMessage({
        command: 'importError',
        error: `文件中未找到 ${spec.label} 可导入的数据（需要 ${spec.wrapperKeys.map(k => `{${k}:[...]}`).join(' 或 ')} 或数组）`
      });
      return;
    }

    const selected: string[] = Array.isArray(message.options) ? message.options : [];
    this.running = true;
    this.logger.info(`[ImportJsonPanel] 开始导入 ${spec.label}: ${rows.length} 条，目标环境: ${envs.map(e => e.envnum).join(', ')}`);
    this.panel.webview.postMessage({ command: 'importStart', total: envs.length, rows: rows.length });
    try {
      for (const env of envs) {
        this.panel.webview.postMessage({ command: 'envStart', envnum: env.envnum });
        const result = await importToEnv(spec, rows, selected, env, this.logger);
        this.panel.webview.postMessage({ command: 'envResult', result });
      }
    } finally {
      this.running = false;
      this.panel.webview.postMessage({ command: 'importDone' });
    }
  }

  private getHtml(): string {
    const webview = this.panel.webview;
    const cspSource = webview.cspSource;
    const vueUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'dist', 'vendor', 'vue.global.prod.js'));
    const epJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'dist', 'vendor', 'element-plus.full.min.js'));
    const epCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'dist', 'vendor', 'element-plus.css'));
    const epDarkCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'dist', 'vendor', 'element-plus-dark.css'));
    const csp = [
      "default-src 'none'",
      `style-src ${cspSource} vscode-resource: 'unsafe-inline'`,
      `script-src ${cspSource} vscode-resource: 'unsafe-inline' 'unsafe-eval'`,
      `img-src ${cspSource} vscode-resource: data:`,
      `font-src ${cspSource} vscode-resource: data:`,
      `connect-src 'none'`
    ].join('; ');
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>导入到多个环境</title>
<link rel="stylesheet" href="${epCssUri}">
<link rel="stylesheet" href="${epDarkCssUri}">
<style>
  :root, html.dark {
    --el-color-primary: var(--vscode-button-background, #409eff);
    --el-border-color: var(--vscode-panel-border, #dcdfe6);
    --el-border-color-lighter: var(--vscode-panel-border, #e4e7ed);
    --el-fill-color-blank: var(--vscode-editor-background, #fff);
    --el-bg-color: var(--vscode-editor-background, #fff);
    --el-bg-color-overlay: var(--vscode-editorWidget-background, var(--vscode-editor-background, #fff));
    --el-text-color-primary: var(--vscode-foreground, #303133);
    --el-text-color-regular: var(--vscode-foreground, #606266);
    --el-text-color-secondary: var(--vscode-descriptionForeground, #909399);
    --el-fill-color-light: var(--vscode-textCodeBlock-background, #f5f7fa);
    /* 斑马纹 / 表头：半透明灰，深浅主题下都不会出现刺眼的白条 */
    --el-fill-color-lighter: rgba(128, 128, 128, 0.12);
    --el-table-bg-color: transparent;
    --el-table-tr-bg-color: transparent;
    --el-table-header-bg-color: rgba(128, 128, 128, 0.14);
    --el-table-header-text-color: var(--vscode-foreground, #303133);
    --el-table-text-color: var(--vscode-foreground, #303133);
    --el-table-row-hover-bg-color: var(--vscode-list-hoverBackground, rgba(128, 128, 128, 0.2));
    --el-table-border-color: var(--vscode-panel-border, #ebeef5);
    --el-table-current-row-bg-color: var(--vscode-list-inactiveSelectionBackground, rgba(128, 128, 128, 0.16));
  }
  html, body { height: 100%; margin: 0; padding: 0; }
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); }
  #app { height: 100vh; }
  .aside { border-right: 1px solid var(--vscode-panel-border); background: var(--vscode-sideBar-background, transparent); overflow-y: auto; }
  .aside-title { padding: 10px 14px 6px; font-size: 12px; opacity: .75; }
  .kind-menu { border-right: none !important; background: transparent !important; }
  .kind-menu .el-menu-item { color: var(--vscode-foreground); height: 36px; line-height: 36px; }
  .kind-menu .el-menu-item.is-active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
  .kind-menu .cnt { opacity: .6; font-size: 11px; margin-left: 6px; }
  .main { background: var(--vscode-editor-background); overflow-y: auto; }
  .file-line { font-size: 12px; opacity: .85; margin: 6px 0 12px; word-break: break-all; }
  .sec { margin-bottom: 14px; background: transparent !important; }
  .sec .el-card__header { padding: 8px 12px; font-weight: bold; font-size: 13px; background: var(--vscode-editorWidget-background, transparent); border-bottom-color: var(--vscode-panel-border); }
  .sec .el-card__body { padding: 10px 12px; }
  .hdr { display: flex; align-items: center; gap: 10px; }
  .muted { opacity: .65; font-size: 12px; }
  .env-list { border: 1px solid var(--vscode-panel-border); border-radius: 4px; max-height: 280px; overflow-y: auto; }
  .env-row { padding: 5px 10px; border-bottom: 1px solid var(--vscode-panel-border); }
  .env-row:last-child { border-bottom: none; }
  .env-row:hover { background: var(--vscode-list-hoverBackground); }
  .env-name { font-weight: bold; margin-right: 8px; }
  .env-url { opacity: .7; font-size: 12px; }
  .actions { margin: 14px 0; display: flex; align-items: center; gap: 12px; }
  .status { font-size: 12px; opacity: .8; }
  .err { margin-bottom: 10px; }
  .result-row { display: flex; align-items: center; gap: 10px; padding: 7px 6px; border-bottom: 1px solid var(--vscode-panel-border); }
  .result-row:last-child { border-bottom: none; }
  .r-name { font-weight: bold; min-width: 90px; }
  .r-stat { flex: 1; font-size: 12px; }
  .r-stat.ok { color: var(--vscode-testing-iconPassed, #4daf7c); }
  .r-stat.warn { color: var(--vscode-editorWarning-foreground, #cca700); }
  .r-stat.bad { color: var(--vscode-errorForeground); }
  .raw-actions { display: flex; gap: 8px; margin-bottom: 8px; }
  .raw-pre { max-height: 55vh; overflow: auto; background: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px; font-family: var(--vscode-editor-font-family), monospace; font-size: 12px; white-space: pre-wrap; word-break: break-all; margin: 0; color: var(--vscode-foreground); }
  .json-tree { max-height: 60vh; overflow: auto; padding: 8px; background: var(--vscode-textCodeBlock-background); border-radius: 4px; }
  .jn { font-family: var(--vscode-editor-font-family), monospace; font-size: 12px; }
  .jn-line { cursor: default; line-height: 1.65; white-space: nowrap; }
  .jn-line:hover { background: var(--vscode-list-hoverBackground); }
  .jn-caret { display: inline-block; width: 14px; color: var(--vscode-foreground); cursor: pointer; user-select: none; }
  .jn-key { color: var(--vscode-symbolIcon-stringForeground, #9cdcfe); margin-right: 4px; }
  .jn-bracket { color: var(--vscode-foreground); }
  .jn-summary { color: var(--vscode-descriptionForeground); font-style: italic; margin: 0 4px; }
  .jn-children { margin-left: 14px; border-left: 1px dashed var(--vscode-panel-border); padding-left: 8px; }
  .jn-close { color: var(--vscode-foreground); }
  .jn-val-string { color: var(--vscode-textPreformat-foreground, #ce9178); }
  .jn-val-number { color: #b5cea8; }
  .jn-val-bool { color: #569cd6; }
  .jn-val-null { color: #808080; }
</style>
</head>
<body>
<script>
// 根据 VS Code 当前主题自动启用/关闭 Element Plus 暗色变量（html.dark）
(function () {
  function applyTheme() {
    var root = document.documentElement;
    var body = document.body;
    if (!root || !body) { return; }
    var dark = body.classList.contains('vscode-dark') || body.classList.contains('vscode-high-contrast');
    root.classList.toggle('dark', dark);
  }
  applyTheme();
  if (document.body) {
    new MutationObserver(applyTheme).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
})();
</script>
<div id="app">
  <el-container style="height:100vh">
    <el-aside width="230px" class="aside">
      <div class="aside-title">可导入的功能项</div>
      <el-menu :default-active="selectedKind" @select="pickKind" class="kind-menu">
        <el-menu-item v-for="k in kinds" :key="k.kind" :index="k.kind">
          {{ k.label }}<span class="cnt">({{ k.rows }} 条)</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-main class="main">
      <div class="file-line">源文件：{{ filePath }}</div>

      <el-card shadow="never" class="sec">
        <template #header>导入参数{{ currentKind ? ' - ' + currentKind.label : '' }}</template>
        <template v-if="currentKind && currentKind.options.length">
          <el-checkbox v-for="o in currentKind.options" :key="o.key"
            :model-value="optionPicked(currentKind.kind, o.key)"
            @change="setOption(currentKind.kind, o.key, $event)" style="display:block;margin:4px 0;">
            {{ o.label }}
          </el-checkbox>
        </template>
        <span v-else class="muted">该功能项无额外参数</span>
      </el-card>

      <el-card shadow="never" class="sec">
        <template #header>
          <div class="hdr">目标环境
            <el-button size="small" link @click="checkAllEnvs(true)">全选</el-button>
            <el-button size="small" link @click="checkAllEnvs(false)">清空</el-button>
          </div>
        </template>
        <template v-if="envs.length">
          <div class="env-list">
            <div v-for="e in envs" :key="e.envnum" class="env-row">
              <el-checkbox :model-value="!!envCheck[e.envnum]" @change="envCheck[e.envnum] = $event">
                <span class="env-name">{{ e.envnum }}</span><span class="env-url">{{ e.serverUrl }}</span>
              </el-checkbox>
            </div>
          </div>
        </template>
        <span v-else class="muted">未配置环境，请先在插件配置中添加环境</span>
      </el-card>

      <div class="actions">
        <el-button type="primary" :loading="running" @click="doImport">确定导入</el-button>
        <span class="status">{{ statusText }}</span>
      </div>
      <el-alert v-if="errorText" :title="errorText" type="error" show-icon :closable="false" class="err"></el-alert>

      <el-card v-if="results.length" shadow="never" class="sec">
        <template #header>导入结果（点击「查看详情」浏览返回内容）</template>
        <div v-for="r in results" :key="r.envnum" class="result-row">
          <span class="r-name">{{ r.envnum }}</span>
          <span class="r-stat" :class="statClass(r)">
            <el-tag v-if="r.loading" type="info" size="small">导入中…</el-tag>
            <template v-else-if="r.success">共 {{ r.totals.total }} 条（新增 {{ r.totals.added }} / 更新 {{ r.totals.updated }} / 删除 {{ r.totals.deleted }} / 失败 {{ r.totals.failed }}）</template>
            <template v-else>{{ r.message }}</template>
          </span>
          <el-button v-if="r.json" size="small" @click="showDetail(r)">查看详情</el-button>
        </div>
      </el-card>
    </el-main>
  </el-container>

  <el-dialog v-model="detail.visible" :title="'导入详情 - ' + detail.envnum" width="82%" top="5vh">
    <el-tabs v-model="detail.activeTab">
      <el-tab-pane :label="'列表(' + listTotal + ')'" name="list">
        <div class="raw-actions">
          <el-button size="small" @click="toggleExpandAll">{{ expandAll ? '收缩所有' : '展开所有' }}</el-button>
          <span class="muted">共 {{ listRows.length }} 个批次 / {{ listTotal }} 条记录</span>
        </div>
        <el-table ref="listTable" :data="listRows" border stripe size="small" max-height="520"
          row-key="rowKey" :default-expand-all="expandAll" :tree-props="{ children: 'children' }">
          <el-table-column prop="label" label="对象 / 记录" min-width="300" show-overflow-tooltip></el-table-column>
          <el-table-column prop="status" label="状态" width="90">
            <template #default="scope">
              <el-tag v-if="scope.row.status" :type="scope.row.statusType || 'info'" size="small">{{ scope.row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="operation" label="操作" width="90"></el-table-column>
          <el-table-column prop="message" label="消息" min-width="260" show-overflow-tooltip></el-table-column>
        </el-table>
        <el-empty v-if="listRows.length === 0" description="无明细返回" :image-size="60"></el-empty>
      </el-tab-pane>
      <el-tab-pane label="树结构" name="tree">
        <div class="json-tree"><json-node :value="detail.json" :depth="0"></json-node></div>
      </el-tab-pane>
      <el-tab-pane label="JSON 源码" name="raw">
        <div class="raw-actions">
          <el-button size="small" @click="copyJson">复制</el-button>
          <el-button size="small" type="primary" @click="openInEditor">编辑器查看</el-button>
        </div>
        <pre class="raw-pre">{{ rawText }}</pre>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</div>

<script type="text/x-template" id="jn-tpl">
  <div class="jn">
    <div v-if="isExpandable" class="jn-line" @click="open = !open">
      <span class="jn-caret">{{ open ? '▾' : '▸' }}</span>
      <span v-if="name !== null" class="jn-key">{{ name }}:</span>
      <span class="jn-bracket">{{ isArray ? '[' : '{' }}</span>
      <span v-if="!open" class="jn-summary">{{ summary }}</span>
      <span v-if="!open" class="jn-bracket">{{ isArray ? ']' : '}' }}</span>
    </div>
    <div v-else class="jn-line">
      <span v-if="name !== null" class="jn-key">{{ name }}:</span>
      <span :class="['jn-val', 'jn-' + valType]">{{ displayVal }}</span>
    </div>
    <div v-if="isExpandable && open" class="jn-children">
      <json-node v-for="it in entries" :key="it.k" :name="it.k" :value="it.v" :depth="depth + 1"></json-node>
      <div class="jn-close">{{ isArray ? ']' : '}' }}</div>
    </div>
  </div>
</script>

<script src="${vueUri}"></script>
<script src="${epJsUri}"></script>
<script>
(function () {
  var vscode = acquireVsCodeApi();

  // 明细主键取值：优先 sks:ref，其次常见主键字段，再退化为行内第一个非控制字段
  function pickLabel(item, i) {
    if (item === null || item === undefined) { return '#' + (i + 1); }
    if (typeof item !== 'object') { return String(item); }
    var candidates = ['sks:ref', 'object', 'label', 'name', 'key', 'OBJECTNAME', 'objectname'];
    for (var c = 0; c < candidates.length; c++) {
      var v = item[candidates[c]];
      if (v !== undefined && v !== null && typeof v !== 'object' && String(v).trim() !== '') {
        return String(v);
      }
    }
    var keys = Object.keys(item);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (key.charAt(0) === '_' || key.indexOf('sks:') === 0) { continue; }
      var val = item[key];
      if ((typeof val === 'string' && val.trim() !== '') || typeof val === 'number' || typeof val === 'boolean') {
        return String(val);
      }
    }
    return '#' + (i + 1);
  }

  var STATUS_TAG = { success: 'success', failed: 'danger', error: 'danger', skipped: 'info' };

  try {
    var app = Vue.createApp({
    data: function () {
      return {
        filePath: '',
        kinds: [],
        envs: [],
        selectedKind: null,
        optionState: {},
        envCheck: {},
        running: false,
        statusText: '',
        errorText: '',
        results: [],
        expandAll: false,
        detail: { visible: false, activeTab: 'list', envnum: '', json: null }
      };
    },
    computed: {
      currentKind: function () {
        for (var i = 0; i < this.kinds.length; i++) {
          if (this.kinds[i].kind === this.selectedKind) { return this.kinds[i]; }
        }
        return null;
      },
      rawText: function () {
        try { return JSON.stringify(this.detail.json, null, 2); } catch (e) { return String(this.detail.json); }
      },
      // 把每批响应转成 el-table 树形列表：批次为父行，响应明细 data.results 为子行
      listRows: function () {
        var j = this.detail.json || {};
        var responses = Array.isArray(j.responses) ? j.responses : [];
        var out = [];
        responses.forEach(function (r, idx) {
          r = r || {};
          var body = r.body || {};
          var data = (body && body.data) || {};
          var results = Array.isArray(data.results) ? data.results : [];
          var failed = Number(data.failed || 0);
          var isError = body.status === 'error';
          var children = results.map(function (it, i) {
            it = it || {};
            var st = String(it._status || '');
            return {
              rowKey: 'b' + idx + '-i' + i,
              label: pickLabel(it, i),
              status: st,
              statusType: STATUS_TAG[st.toLowerCase()] || 'info',
              operation: (it._operation && it._operation !== 'none') ? it._operation : '',
              message: it._message || ''
            };
          });
          var badHttp = typeof r.httpStatus === 'number' && r.httpStatus >= 400;
          out.push({
            rowKey: 'b' + idx,
            label: '批次 ' + (r.batch || (idx + 1)) + '（HTTP ' + (r.httpStatus != null ? r.httpStatus : '-') + '）',
            status: (isError || failed > 0 || badHttp) ? 'failed' : 'success',
            operation: results.length ? ('明细 ' + results.length + ' 条') : '',
            message: body.message || data.message || '',
            children: children
          });
        });
        if (!out.length && j.error) {
          out.push({ rowKey: 'err', label: '调用失败', status: 'failed', operation: '', message: String(j.error) });
        }
        return out;
      },
      // 明细记录总数（不含批次父行）
      listTotal: function () {
        var n = 0;
        this.listRows.forEach(function (r) { n += (r.children ? r.children.length : 0); });
        return n;
      }
    },
    methods: {
      pickKind: function (k) { if (!this.running) { this.selectedKind = k; } },
      ensureKindOptions: function (k) {
        if (!this.optionState[k.kind]) {
          var o = {};
          (k.options || []).forEach(function (op) { o[op.key] = !!op.picked; });
          this.optionState[k.kind] = o;
        }
      },
      optionPicked: function (kind, key) {
        var o = this.optionState[kind];
        return o ? !!o[key] : false;
      },
      setOption: function (kind, key, v) {
        if (!this.optionState[kind]) { this.optionState[kind] = {}; }
        this.optionState[kind][key] = !!v;
      },
      checkAllEnvs: function (v) {
        var self = this;
        this.envs.forEach(function (e) { self.envCheck[e.envnum] = v; });
      },
      selectedEnvs: function () {
        var self = this, out = [];
        this.envs.forEach(function (e) { if (self.envCheck[e.envnum]) { out.push(e.envnum); } });
        return out;
      },
      selectedOptions: function () {
        var o = this.optionState[this.selectedKind] || {}, out = [];
        Object.keys(o).forEach(function (k) { if (o[k]) { out.push(k); } });
        return out;
      },
      doImport: function () {
        if (this.running) { return; }
        this.errorText = '';
        if (!this.selectedKind) { this.errorText = '请选择左侧功能项'; return; }
        if (this.selectedEnvs().length === 0) { this.errorText = '请至少勾选一个目标环境'; return; }
        this.results = [];
        vscode.postMessage({ command: 'import', kind: this.selectedKind, options: this.selectedOptions(), envnums: this.selectedEnvs() });
      },
      upsertResult: function (envnum, patch) {
        for (var i = 0; i < this.results.length; i++) {
          if (this.results[i].envnum === envnum) {
            this.results.splice(i, 1, Object.assign({}, this.results[i], patch));
            return;
          }
        }
        this.results.push(Object.assign({ envnum: envnum, loading: true }, patch));
      },
      statClass: function (r) {
        if (r.loading) { return ''; }
        if (!r.success) { return 'bad'; }
        return (r.totals && r.totals.failed > 0) ? 'warn' : 'ok';
      },
      showDetail: function (r) {
        this.detail.envnum = r.envnum;
        this.detail.json = r.json;
        this.detail.activeTab = 'list';
        this.expandAll = false;
        this.detail.visible = true;
      },
      toggleExpandAll: function () {
        this.expandAll = !this.expandAll;
        var self = this;
        this.$nextTick(function () {
          var t = self.$refs.listTable;
          if (!t || !t.toggleRowExpansion) { return; }
          self.listRows.forEach(function (row) { t.toggleRowExpansion(row, self.expandAll); });
        });
      },
      copyJson: function () {
        var text = this.rawText;
        var done = function () { ElementPlus.ElMessage.success('已复制到剪贴板'); };
        var fail = function () { ElementPlus.ElMessage.error('复制失败，请手动选择文本复制'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done, fail); });
        } else {
          fallbackCopy(text, done, fail);
        }
      },
      openInEditor: function () {
        vscode.postMessage({ command: 'openDetailInEditor', envnum: this.detail.envnum, json: this.detail.json });
      }
    },
    mounted: function () {
      var self = this;
      window.addEventListener('message', function (event) {
        var msg = event.data;
        switch (msg.command) {
          case 'init':
            self.filePath = msg.filePath || '';
            self.kinds = msg.kinds || [];
            self.envs = msg.envs || [];
            self.kinds.forEach(function (k) { self.ensureKindOptions(k); });
            if (!self.selectedKind && self.kinds.length > 0) { self.selectedKind = self.kinds[0].kind; }
            break;
          case 'importStart':
            self.running = true;
            self.statusText = '共 ' + msg.rows + ' 条数据，导入 ' + msg.total + ' 个环境…';
            break;
          case 'envStart':
            self.upsertResult(msg.envnum, { loading: true, success: undefined, json: null });
            break;
          case 'envResult':
            var r = msg.result || {};
            self.upsertResult(r.envnum, { loading: false, success: r.success, message: r.message, totals: r.totals, json: r.json });
            break;
          case 'importDone':
            self.running = false;
            self.statusText = '导入完成';
            break;
          case 'importError':
            self.running = false;
            self.statusText = '';
            self.errorText = msg.error;
            break;
        }
      });
      vscode.postMessage({ command: 'ready' });
    }
  });

  app.component('json-node', {
    name: 'JsonNode',
    template: '#jn-tpl',
    props: { name: { default: null }, value: null, depth: { type: Number, default: 0 } },
    data: function () { return { open: this.depth < 2 }; },
    computed: {
      isExpandable: function () { var v = this.value; return v !== null && typeof v === 'object'; },
      isArray: function () { return Array.isArray(this.value); },
      entries: function () {
        var v = this.value, out = [];
        if (Array.isArray(v)) { v.forEach(function (x, i) { out.push({ k: String(i), v: x }); }); }
        else if (v && typeof v === 'object') { Object.keys(v).forEach(function (k) { out.push({ k: k, v: v[k] }); }); }
        return out;
      },
      valType: function () {
        var v = this.value;
        if (v === null || v === undefined) { return 'null'; }
        if (typeof v === 'string') { return 'string'; }
        if (typeof v === 'number') { return 'number'; }
        if (typeof v === 'boolean') { return 'bool'; }
        return 'string';
      },
      displayVal: function () {
        var v = this.value;
        if (v === null || v === undefined) { return 'null'; }
        if (typeof v === 'string') { return '"' + v + '"'; }
        return String(v);
      },
      summary: function () {
        var n = this.entries.length;
        return n + ' 项';
      }
    }
  });

  function fallbackCopy(text, done, fail) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? done() : fail();
    } catch (e) { fail(); }
  }

    app.use(ElementPlus);
    app.mount('#app');
  } catch (err) {
    var box = document.getElementById('app');
    if (box) {
      box.innerHTML = '<div style="padding:16px;color:#f48771;font-family:var(--vscode-font-family);">面板初始化失败：<pre style="white-space:pre-wrap;margin-top:8px;">' + String((err && err.message) ? err.message : err) + '</pre></div>';
    }
  }
})();
</script>
</body>
</html>`;
  }
}
