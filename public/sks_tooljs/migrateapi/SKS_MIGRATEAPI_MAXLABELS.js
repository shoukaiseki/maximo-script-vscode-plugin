/**
 * SKS_MIGRATEAPI_MAXLABELS - 应用XML标签(MAXLABELS)多语言迁移接口(新模式)
 *
 * 接口:
 *   GET/POST /maximo/api/script/SKS_MIGRATEAPI_MAXLABELS?_action=query
 *        body: { app, id, property, value, where, pageNum, pageSize }
 *        → { maxlabelsList:[ MAXLABELS 行 ], total, pageNum, pageSize }
 *   GET/POST ...?_action=detail[&app=xxx][&id=xxx][&property=xxx]
 *        → { maxlabelsList:[ ... ] }
 *   GET/POST ...?_action=export[&app=xxx|&where=...]  (不分页)
 *        body: { app, id, property, value, where, maxlabelsIds:[...] }
 *        maxlabelsIds: 主键数组, 传了就按 MAXLABELSID in (...) 过滤(选中记录导出)
 *        → { maxlabelsList:[ ... ] }
 *   POST ...?_action=import  body: { "maxlabelsList": [ MAXLABELS 行... ] }
 *        按 APP + ID + PROPERTY upsert; 行内 _delete=true 删除
 *        → { total, added, updated, deleted, skipped, failed, results,
 *            sks:successSumTotal, sks:failSumTotal, sks:ignoreSumTotal }
 *
 * 参数:
 *   _langcode=ZH       会话语言(VALUE 返回该语言译文, 没有译文时回退基础语言)
 *   _allLangcode=true  导出/导入多语言: 行内 sks:langdata = { VALUE: { EN: "...", ZH: "..." } }
 *   _langcodeList=EN,ZH 限制参与 sks:langdata 的语言
 *   _ignoreList=maxlabelsList 跳过该根节点的导入
 *   _debug=true        返回 debugMsg
 *   _errorAssert=true  存在失败时抛出异常
 *   dmDeploySet=true   导入时 MboSet.setDMDeploySet(true)(迁移模式)
 *
 * 对象结构(导出/导入一致):
 *   {
 *     APP, ID, PROPERTY, VALUE, MAXLABELSID,
 *     "sks:langdata": { "VALUE": { "EN": "...", "ZH": "..." } },  // 可选, _allLangcode=true 时有
 *     _delete: true   // 可选: 删除该标签
 *   }
 *   根级列表统一使用「表名+List」: maxlabelsList
 *
 * 说明:
 *   MAXLABELS.VALUE 是 MLINUSE 多语言字段, 译文存放在 L_MAXLABELS(OWNERID/LANGCODE/VALUE);
 *   非基础语言会话下 setValue 只写 L_MAXLABELS, 新增行的基础列在导入后切换基础语言补写。
 */
/** @type {psdi.util.MXApplicationException} */
var MXApplicationException = Java.type("psdi.util.MXApplicationException");
/** @type {psdi.server.MXServer} */
var MXServer = Java.type("psdi.server.MXServer");
var MboConstants = Java.type("psdi.mbo.MboConstants");
var SqlFormat = Java.type("psdi.mbo.SqlFormat");

var scriptName = service.getScriptName();
var svc = service;
var mxserver = MXServer.getMXServer();

/** @type {psdi.util.logging.MXLogger} */
var loggerMX = Java.type("psdi.util.logging.MXLoggerFactory").getLogger("maximo.script." + scriptName);
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils = null;
try {
  sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
} catch (ignored) { }
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils ? sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true }) : loggerMX;
logger.info("[" + scriptName + "]----------Starting execution of script");

// SKS_COMMONS_UTILS: autoMboSetValue 按 Mbo 字段类型设值
var sksCommonsUtils = null;
try {
  sksCommonsUtils = svc.invokeScript("SKS_COMMONS_UTILS");
} catch (ignored) {
  logger.warn("[" + scriptName + "] SKS_COMMONS_UTILS 不可用, 回退 mbo.setValue");
}

var _langcode = "EN";
if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
  _langcode = String(request.getQueryParam("_langcode")).toUpperCase();
  userInfo.setLangCode(_langcode);
}

/** @type {java.lang.StringBuilder} */
var StringBuilder = Java.type("java.lang.StringBuilder");
var debugMsg = new StringBuilder();
var paramDebug = false;
if (request.getQueryParam("_debug") !== 'undefined' && request.getQueryParam("_debug")) {
  paramDebug = request.getQueryParam("_debug") === 'true';
}

var OBJECT_NAME = "MAXLABELS";
// 多语言字段(译文在 L_MAXLABELS)
var ML_FIELD = "VALUE";
// 11 = NOVALIDATION(1) | NOACCESSCHECK(2) | NOACTION(8)
var ML_ACCESS = 11;

var successData = {};

main();
function main() {
  try {
    if (Java.type("psdi.iface.mic.MicUtil").getAdminModeState()) {
      throw new MXApplicationException("ibm_system", "AdminOnThis");
    }
    successData = process();
    var resData = { status: "success", data: successData, message: "Script executed successfully" };
    if (paramDebug) {
      resData.debugMsg = debugMsg.toString();
    }
    responseBody = JSON.stringify(resData);
  } catch (error) {
    logger.error(">>> [API ERROR] 全局捕获异常:", error);
    var errorMessage = "error";
    var errorMessageTrace = "";
    try {
      errorMessage = sksLogAnsiUtils.getErrorMessage(error);
    } catch (e) { /* ignore */ }
    try {
      errorMessageTrace = sksLogAnsiUtils.getErrorStackTrace(error);
    } catch (e) { /* ignore */ }
    var errorData = { status: "error", message: errorMessage, errorMessageTrace: errorMessageTrace };
    if (paramDebug) {
      errorData.debugMsg = debugMsg.toString();
    }
    responseBody = JSON.stringify(errorData);
  }
}

function process() {
  var action = getAction();
  var config = buildConfig(action);
  logger.info("[" + scriptName + "] _action=" + action + ", _langcode=" + _langcode);
  if (action === "query" || action === "list") {
    return doQuery(config);
  }
  if (action === "detail" || action === "getDetail") {
    return doDetail(config);
  }
  if (action === "export") {
    return doExport(config);
  }
  if (action === "import") {
    return doImport(config);
  }
  throw new MXApplicationException("#", "未知 _action: " + action + " (可用: query/detail/export/import)");
}

function getAction() {
  var a = qparam("_action");
  return a === null ? "query" : a;
}

function buildConfig(action) {
  var body = parseRequestBody();
  return {
    _service: svc,
    _userInfo: userInfo,
    _langcode: _langcode,
    _action: action,
    _body: body,
    _allLangcode: isTrue(bodyOrParamValue(body, "_allLangcode")),
    _langcodeList: resolveLangcodeList(body),
    _errorAssert: isTrue(bodyOrParamValue(body, "_errorAssert")),
    _debug: paramDebug,
    dmDeploySet: isTrue(bodyOrParamValue(body, "dmDeploySet") || bodyOrParamValue(body, "_dmDeploySet"))
  };
}

/**
 * 读取数字数组参数(body 数组 / 逗号分隔字符串 / URL 参数)
 * 只保留纯数字项, 避免拼接 SQL 注入
 * @param {Object} config
 * @param {Array<string>} names
 * @returns {Array<string>}
 */
function bodyNumericArray(config, names) {
  var body = config._body;
  var raw = null;
  for (var i = 0; i < names.length; i++) {
    if (body && body[names[i]] !== undefined && body[names[i]] !== null && body[names[i]] !== "") {
      raw = body[names[i]];
      break;
    }
  }
  if (raw === null && names.length > 0) {
    raw = qparam(names[0]);
  }
  if (raw === null || raw === undefined || raw === "") {
    return [];
  }
  if (!(raw instanceof Array)) {
    raw = String(raw).split(",");
  }
  var list = [];
  for (var j = 0; j < raw.length; j++) {
    var v = raw[j] === null || raw[j] === undefined ? "" : String(raw[j]).trim();
    if (/^[0-9]+$/.test(v)) {
      list.push(v);
    }
  }
  return list;
}

function bodyOrParamValue(body, name) {
  if (body && body[name] !== undefined && body[name] !== null && body[name] !== "") {
    return body[name];
  }
  return qparam(name);
}

function resolveLangcodeList(body) {
  var raw = body ? body["_langcodeList"] : null;
  if (raw === undefined || raw === null || raw === "") {
    raw = qparam("_langcodeList");
  }
  var list = [];
  if (raw instanceof Array) {
    for (var i = 0; i < raw.length; i++) {
      var v = String(raw[i] || "").trim().toUpperCase();
      if (v !== "") {
        list.push(v);
      }
    }
  } else if (raw !== null && raw !== undefined) {
    var parts = String(raw).split(",");
    for (var j = 0; j < parts.length; j++) {
      var p = String(parts[j] || "").trim().toUpperCase();
      if (p !== "") {
        list.push(p);
      }
    }
  }
  return list;
}

function resolveIgnoreList(config) {
  var raw = config._body ? config._body["_ignoreList"] : null;
  if (raw === undefined || raw === null || raw === "") {
    raw = qparam("_ignoreList");
  }
  var list = [];
  if (raw instanceof Array) {
    for (var i = 0; i < raw.length; i++) {
      list.push(String(raw[i]));
    }
  } else if (raw !== null && raw !== undefined) {
    var parts = String(raw).split(",");
    for (var j = 0; j < parts.length; j++) {
      var p = String(parts[j] || "").trim();
      if (p !== "") {
        list.push(p);
      }
    }
  }
  return list;
}

function parseRequestBody() {
  if (typeof requestBody === "undefined" || requestBody === null) {
    return {};
  }
  var s = String(requestBody);
  if (s === "" || s === "undefined" || s === "null") {
    return {};
  }
  try {
    var parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      return { maxlabelsList: parsed };
    }
    return parsed;
  } catch (e) {
    throw new MXApplicationException("#", "请求体不是合法的 JSON: " + (e.message || e));
  }
}

function qparam(name) {
  try {
    var v = request.getQueryParam(name);
    if (v === null || typeof v === "undefined") {
      return null;
    }
    v = String(v);
    if (v === "" || v === "undefined" || v === "null") {
      return null;
    }
    return v;
  } catch (ignored) {
    return null;
  }
}

function bodyOrParam(config, names) {
  var body = config._body;
  if (body) {
    for (var i = 0; i < names.length; i++) {
      var v = getValue(body, names[i]);
      if (v !== null) {
        return v;
      }
    }
  }
  for (var j = 0; j < names.length; j++) {
    var p = qparam(names[j]);
    if (p !== null) {
      return p;
    }
  }
  return null;
}

function getValue(obj, key) {
  if (!obj || typeof obj !== "object") {
    return null;
  }
  var v = obj[key];
  if (v === undefined || v === null) {
    return null;
  }
  if (typeof v === "string" && v === "") {
    return null;
  }
  return v;
}

function toInt(value, defaultValue) {
  if (value === null || typeof value === "undefined") {
    return defaultValue;
  }
  var n = parseInt(String(value), 10);
  return isNaN(n) ? defaultValue : n;
}

function isTrue(v) {
  return v === true || String(v).toLowerCase() === "true";
}

function escapeSql(s) {
  return String(s).replace(/'/g, "''");
}

function debugPrint(msg) {
  debugMsg.append(String(msg)).append("\n");
}

function createUuid() {
  try {
    return String(Java.type("java.util.UUID").randomUUID());
  } catch (ignored) {
    return "";
  }
}

function getBaseLang() {
  try {
    return String(mxserver.getBaseLang() || "").toUpperCase();
  } catch (ignored) {
    return "";
  }
}

// ---------------------------------------------------------------------------
// 查询
// ---------------------------------------------------------------------------

/**
 * 条件拼接: 以 "=" 开头精确匹配, 其余模糊匹配(含 % 时按用户通配符)
 * @param {string} field
 * @param {string} input
 * @returns {string}
 */
function likeCond(field, input) {
  var val = String(input).trim();
  if (val.charAt(0) === "=") {
    return "upper(" + field + ") = '" + escapeSql(val.substring(1).toUpperCase()) + "'";
  }
  var like = val.indexOf("%") >= 0 ? val : "%" + val + "%";
  return "upper(" + field + ") like '" + escapeSql(like.toUpperCase()) + "'";
}

function buildWhere(config) {
  var conds = [];
  // 自定义 where 与字段条件同时存在时 AND 组合(前端把 app/id/property 放 where, value 单独传)
  var where = bodyOrParam(config, ["where"]);
  if (where !== null) {
    conds.push("(" + validateWhere(String(where)) + ")");
  }
  var ids = bodyNumericArray(config, ["maxlabelsIds", "_maxlabelsIds", "maxlabelsid"]);
  if (ids.length > 0) {
    conds.push("MAXLABELS.MAXLABELSID in (" + ids.join(",") + ")");
  }
  var app = bodyOrParam(config, ["app", "APP"]);
  var id = bodyOrParam(config, ["id", "ID"]);
  var property = bodyOrParam(config, ["property", "PROPERTY"]);
  var value = bodyOrParam(config, ["value", "VALUE"]);
  if (app !== null) {
    conds.push(likeCond("app", String(app)));
  }
  if (id !== null) {
    conds.push(likeCond("id", String(id)));
  }
  if (property !== null) {
    conds.push(likeCond("property", String(property)));
  }
  if (value !== null) {
    conds.push(buildValueCond(String(value), String(config._langcode || "").toUpperCase(), getBaseLang()));
  }
  return conds.length > 0 ? conds.join(" and ") : "1=1";
}

/**
 * 值搜索: 会话语言为基础语言时直接搜 VALUE 列, 否则同时匹配 L_MAXLABELS 译文
 * @param {string} input 以 "=" 开头精确匹配
 * @param {string} langcode
 * @param {string} baseLang
 * @returns {string}
 */
function buildValueCond(input, langcode, baseLang) {
  var val = String(input).trim();
  var exact = val.charAt(0) === "=";
  if (exact) {
    val = val.substring(1);
  }
  var like = exact ? val.toUpperCase() : (val.indexOf("%") >= 0 ? val : "%" + val + "%").toUpperCase();
  var cond = "upper(MAXLABELS.VALUE) " + (exact ? "=" : "like") + " '" + escapeSql(like) + "'";
  if (!langcode || langcode === baseLang) {
    return cond;
  }
  return "(" + cond + " or exists (select 1 from l_maxlabels l where l.ownerid = MAXLABELS.MAXLABELSID" +
    " and upper(l.langcode) = '" + escapeSql(langcode) + "'" +
    " and upper(l.value) " + (exact ? "=" : "like") + " '" + escapeSql(like) + "'))";
}

function validateWhere(where) {
  var upper = String(where).toUpperCase();
  if (upper.indexOf(";") >= 0 || upper.indexOf("--") >= 0 || upper.indexOf("/*") >= 0) {
    throw new MXApplicationException("#", "where 含非法字符");
  }
  return where;
}

function buildDetailWhere(config) {
  var conds = [];
  var app = bodyOrParam(config, ["app", "APP"]);
  var id = bodyOrParam(config, ["id", "ID"]);
  var property = bodyOrParam(config, ["property", "PROPERTY"]);
  if (app !== null) {
    conds.push("upper(app) = '" + escapeSql(String(app).toUpperCase()) + "'");
  }
  if (id !== null) {
    conds.push("upper(id) = '" + escapeSql(String(id).toUpperCase()) + "'");
  }
  if (property !== null) {
    conds.push("upper(property) = '" + escapeSql(String(property).toUpperCase()) + "'");
  }
  if (conds.length === 0) {
    return buildWhere(config);
  }
  return conds.join(" and ");
}

function doQuery(config) {
  var where = buildWhere(config);
  var pageNum = toInt(bodyOrParam(config, ["pageNum", "page"]), 0);
  var pageSize = toInt(bodyOrParam(config, ["pageSize", "limit"]), 0);
  var paginated = pageNum > 0 && pageSize > 0;
  var page = paginated ? { pageNum: pageNum, pageSize: pageSize } : null;

  var found = queryLabels(config, where, page);
  debugPrint("query maxlabels=" + found.maxlabelsList.length + ", total=" + found.total);

  var result = { maxlabelsList: found.maxlabelsList, total: found.total };
  if (paginated) {
    result.pageNum = pageNum;
    result.pageSize = pageSize;
  }
  return result;
}

function doDetail(config) {
  var where = buildDetailWhere(config);
  var found = queryLabels(config, where, null);
  return { maxlabelsList: found.maxlabelsList };
}

function doExport(config) {
  var where = buildWhere(config);
  var found = queryLabels(config, where, null);
  debugPrint("export maxlabels=" + found.maxlabelsList.length);
  return { maxlabelsList: found.maxlabelsList };
}

// ---------------------------------------------------------------------------
// MboSet 查询(与 SKS_MIGRATEAPI_MAXMESSAGES 一致)
// ---------------------------------------------------------------------------

var _enabledLangcodesCache = null;

/**
 * 打开 MAXLABELS MboSet
 * @param {Object} config
 * @param {string} where
 * @returns {psdi.mbo.MboSetRemote}
 */
function createLabelSet(config, where) {
  var set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
  set.setFlag(MboConstants.DISCARDABLE, true);
  if (where !== null && where !== undefined && String(where) !== "") {
    set.setWhere(String(where));
  }
  set.setOrderBy("APP, ID, PROPERTY");
  set.reset();
  return set;
}

function closeSet(set) {
  try {
    if (set) {
      try { set.close(); } catch (ignored) { }
      try { set.cleanup(); } catch (ignored) { }
    }
  } catch (ignored) { }
}

/**
 * MboSet 查询(分页/不分页)
 * @param {Object} config
 * @param {string} where
 * @param {Object|null} page {pageNum, pageSize}
 * @returns {Object} { maxlabelsList, total }
 */
function queryLabels(config, where, page) {
  var set = null;
  var rows = [];
  var total = 0;
  try {
    set = createLabelSet(config, where);
    if (page) {
      total = set.count();
      set.reset();
    }
    var skip = page ? (page.pageNum - 1) * page.pageSize : 0;
    var limit = page ? page.pageSize : 0;
    var index = 0;
    var mbo = set.getMbo(0);
    while (mbo !== null) {
      if (index >= skip) {
        rows.push(buildLabelRow(mbo, config));
        if (limit > 0 && rows.length >= limit) {
          break;
        }
      }
      index++;
      mbo = set.moveNext();
    }
    if (!page) {
      total = rows.length;
    }
  } finally {
    closeSet(set);
  }
  return { maxlabelsList: rows, total: total };
}

/**
 * Mbo → 导出行(字段名与表列一致 + sks:ref/_status/sks:langdata)
 * @param {psdi.mbo.Mbo} mbo
 * @param {Object} config
 * @returns {Object}
 */
function buildLabelRow(mbo, config) {
  var langcode = String(config._langcode || "").toUpperCase();
  var row = {
    APP: mboStr(mbo, "APP"),
    ID: mboStr(mbo, "ID"),
    PROPERTY: mboStr(mbo, "PROPERTY"),
    VALUE: resolveMboLangValue(mbo, langcode),
    MAXLABELSID: mboLongValue(mbo, "MAXLABELSID")
  };
  row["sks:ref"] = String(row.APP) + "/" + String(row.ID) + "/" + String(row.PROPERTY);
  row._status = "success";

  if (config._allLangcode) {
    var codes = resolveLangdataCodes(config);
    var vals = {};
    var count = 0;
    for (var i = 0; i < codes.length; i++) {
      // 原始取值: 基础列的空值占位符 ~null~ 也要返回, 便于前端显示 EN 列
      var v = mboMlString(mbo, codes[i]);
      if (v !== null) {
        vals[codes[i]] = v;
        count++;
      }
    }
    if (count === 0 && row.VALUE !== null) {
      vals[getBaseLang() || "EN"] = row.VALUE;
    }
    row["sks:langdata"] = { VALUE: vals };
  }
  return row;
}

/**
 * _allLangcode 参与语言: 优先 _langcodeList, 否则启用语言
 */
function resolveLangdataCodes(config) {
  if (config._langcodeList && config._langcodeList.length > 0) {
    return config._langcodeList;
  }
  return getEnabledLangcodes(config);
}

/**
 * 启用语言代码: 优先 MXServer.getLanguageList(), 失败回退 LANGUAGE 表 ENABLED=1
 * @param {Object} config
 * @returns {Array<string>}
 */
function getEnabledLangcodes(config) {
  if (_enabledLangcodesCache && _enabledLangcodesCache.length > 0) {
    return _enabledLangcodesCache;
  }
  var list = [];
  try {
    var langs = mxserver.getLanguageList();
    for (var i = 0; i < langs.length; i++) {
      var code = langs[i][0] ? String(langs[i][0]).toUpperCase() : "";
      if (code !== "" && list.indexOf(code) < 0) {
        list.push(code);
      }
    }
  } catch (e) {
    logger.warn("[" + scriptName + "] getLanguageList 失败, 回退 LANGUAGE 表", e);
  }
  if (list.length === 0) {
    var langSet = null;
    try {
      langSet = mxserver.getMboSet("LANGUAGE", config._userInfo);
      langSet.setFlag(MboConstants.DISCARDABLE, true);
      langSet.setWhere("ENABLED = 1");
      langSet.reset();
      var total = langSet.count();
      for (var j = 0; j < total; j++) {
        var langMbo = langSet.getMbo(j);
        if (!langMbo) {
          continue;
        }
        var langCode = String(langMbo.getString("MAXLANGCODE") || "").toUpperCase();
        if (langCode !== "" && list.indexOf(langCode) < 0) {
          list.push(langCode);
        }
      }
    } catch (e2) {
      logger.warn("[" + scriptName + "] 查询启用语言失败", e2);
    } finally {
      closeSet(langSet);
    }
  }
  var cur = String(config._langcode || "").toUpperCase();
  if (cur !== "" && list.indexOf(cur) < 0) {
    list.push(cur);
  }
  var base = getBaseLang();
  if (base !== "" && list.indexOf(base) < 0) {
    list.push(base);
  }
  if (list.length === 0) {
    list.push("EN");
  }
  _enabledLangcodesCache = list;
  return list;
}

/**
 * 取 Mbo 字段字符串值(空值返回 null)
 */
function mboStr(mbo, attr) {
  try {
    var v = mbo.getString(attr);
    return v === null || String(v) === "" ? null : String(v);
  } catch (ignored) {
    return null;
  }
}

/**
 * 取 Mbo 长整型字段(避免 getString 的千分位格式化)
 */
function mboLongValue(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : mbo.getLong(attr);
  } catch (ignored) {
    return null;
  }
}

/**
 * 取多语言字段指定语言的值(框架自动合并 L_MAXLABELS)
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} lang
 * @returns {string|null}
 */
function mboMlString(mbo, lang) {
  if (!lang) {
    return null;
  }
  try {
    var v = mbo.getString(ML_FIELD, String(lang).toUpperCase());
    return v === null || String(v) === "" ? null : String(v);
  } catch (ignored) {
    return null;
  }
}

/**
 * 按请求语言取值, 无译文时回退基础语言/当前语言
 */
function resolveMboLangValue(mbo, langcode) {
  var v = mboMlString(mbo, langcode);
  if (v !== null) {
    return v;
  }
  var base = getBaseLang();
  if (base !== "") {
    v = mboMlString(mbo, base);
    if (v !== null) {
      return v;
    }
  }
  return mboStr(mbo, ML_FIELD);
}

// ---------------------------------------------------------------------------
// 导入
// ---------------------------------------------------------------------------

function doImport(config) {
  var ignoreList = resolveIgnoreList(config);
  if (ignoreList.indexOf("maxlabelsList") >= 0) {
    debugPrint("maxlabelsList ignored by _ignoreList");
    return {
      total: 0,
      added: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      failed: 0,
      results: [],
      "sks:successSumTotal": 0,
      "sks:failSumTotal": 0,
      "sks:ignoreSumTotal": 0
    };
  }
  var body = config._body || {};
  var list = body.maxlabelsList || body.labels || body.maxlabels;
  if (!(list instanceof Array) || list.length === 0) {
    throw new MXApplicationException("#", "maxlabelsList 必须为非空数组");
  }
  var merged = {
    total: list.length,
    added: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
    results: [],
    "sks:successSumTotal": 0,
    "sks:failSumTotal": 0,
    "sks:ignoreSumTotal": 0
  };
  var pendingBase = [];
  for (var i = 0; i < list.length; i++) {
    var row = list[i];
    var ref = buildRef(row);
    var item = newStatItem(row, ref);
    try {
      var operation = importLabel(config, row, pendingBase);
      item._operation = operation;
      if (operation === "skipped") {
        item._status = "skipped";
        merged.skipped++;
        merged["sks:ignoreSumTotal"]++;
        item["sks:ignoreTotal"] = 1;
        item["sks:ignoreSumTotal"] = 1;
      } else {
        item._status = "success";
        if (operation === "added") {
          merged.added++;
        } else if (operation === "updated") {
          merged.updated++;
        } else if (operation === "deleted") {
          merged.deleted++;
        }
        merged["sks:successSumTotal"]++;
        item["sks:successTotal"] = 1;
        item["sks:successSumTotal"] = 1;
      }
    } catch (e) {
      item._status = "failed";
      item._message = errText(e);
      merged.failed++;
      merged["sks:failSumTotal"]++;
      item["sks:failTotal"] = 1;
      item["sks:failSumTotal"] = 1;
      logger.error("[" + scriptName + "] 导入标签失败: " + ref + " - " + errText(e));
    }
    merged.results.push(item);
    debugPrint("import " + ref + " => " + item._status + " " + (item._message || ""));
  }
  applyBaseLangValues(config, pendingBase);
  if (config._errorAssert && merged.failed > 0) {
    throw new MXApplicationException("#", "导入存在 " + merged.failed + " 条失败, 详见 results");
  }
  return merged;
}

function buildRef(row) {
  if (!row || typeof row !== "object") {
    return "";
  }
  var app = row.APP !== undefined ? row.APP : row.app;
  var id = row.ID !== undefined ? row.ID : row.id;
  var property = row.PROPERTY !== undefined ? row.PROPERTY : row.property;
  return String(app === undefined || app === null ? "" : app) + "/" +
    String(id === undefined || id === null ? "" : id) + "/" +
    String(property === undefined || property === null ? "" : property);
}

function newStatItem(row, ref) {
  return {
    "sks:ref": ref,
    "sks:objectName": OBJECT_NAME,
    "sks:uuid": row && row["sks:uuid"] ? String(row["sks:uuid"]) : createUuid(),
    _apiAction: "imp",
    _status: "failed",
    _operation: "none",
    "sks:successTotal": 0,
    "sks:failTotal": 0,
    "sks:ignoreTotal": 0,
    "sks:successSumTotal": 0,
    "sks:failSumTotal": 0,
    "sks:ignoreSumTotal": 0
  };
}

/**
 * 单行导入(APP + ID + PROPERTY upsert)
 * @param {Object} config
 * @param {Object} row
 * @param {Array} pendingBase 新增行基础语言待补写队列
 * @returns {string} added / updated / deleted / skipped / none
 */
function importLabel(config, row, pendingBase) {
  if (!row || typeof row !== "object") {
    throw new MXApplicationException("#", "标签对象不合法");
  }
  var app = trimStr(getValue(row, "APP") !== null ? row.APP : row.app);
  var id = trimStr(getValue(row, "ID") !== null ? row.ID : row.id);
  var property = trimStr(getValue(row, "PROPERTY") !== null ? row.PROPERTY : row.property);
  if (app === "" || id === "" || property === "") {
    throw new MXApplicationException("#", "APP / ID / PROPERTY 不能为空");
  }
  var set = null;
  try {
    set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
    if (config.dmDeploySet === true) {
      try { set.setDMDeploySet(true); } catch (ignored) { }
    }
    var sqlf = new SqlFormat("app = :1 and id = :2 and property = :3");
    sqlf.setObject(1, OBJECT_NAME, "APP", app);
    sqlf.setObject(2, OBJECT_NAME, "ID", id);
    sqlf.setObject(3, OBJECT_NAME, "PROPERTY", property);
    set.setWhere(sqlf.format());
    set.reset();
    var mbo = set.isEmpty() ? null : set.getMbo(0);

    if (isTrue(row._delete)) {
      if (!mbo) {
        // 删除标记未执行, 按跳过统计
        return "skipped";
      }
      mbo.delete();
      saveSet(set, config);
      return "deleted";
    }

    var isNew = !mbo;
    if (isNew) {
      mbo = set.add();
      mbo.setValue("APP", app, MboConstants.NOACCESSCHECK);
      mbo.setValue("ID", id, MboConstants.NOACCESSCHECK);
      mbo.setValue("PROPERTY", property, MboConstants.NOACCESSCHECK);
    } else if (isTrue(row._updateIgnored)) {
      return "skipped";
    }

    var baseLang = getBaseLang();
    // 会话实际语言(_langcode 默认 EN, 与 JSESSIONID/apikey 会话语言可能不一致)
    var currentLang = String(config._userInfo.getLangCode() || "").toUpperCase();
    var allLang = config._allLangcode === true;
    var langData = row["sks:langdata"];
    var values = (allLang && langData && langData[ML_FIELD] && typeof langData[ML_FIELD] === "object") ? langData[ML_FIELD] : null;
    var baseValue = null;
    var baseValueProvided = false;
    var changed = false;
    var mlCount = 0;
    if (values) {
      for (var lang in values) {
        if (!values.hasOwnProperty(lang)) {
          continue;
        }
        var v = values[lang];
        // 空值与 ~null~ 占位符视为未提供, 不覆盖已有译文
        if (v === undefined || v === null || String(v).trim() === "" || String(v) === "~null~") {
          continue;
        }
        var upperLang = String(lang).toUpperCase();
        if (upperLang === baseLang) {
          // 基础语言: setMLValue/setValue 受会话语言影响, 统一交给 applyBaseLangValues 在基础语言会话下写基础列
          mlCount++;
          if (!isNew && isLangValueEqual(mbo, baseLang, String(v))) {
            continue;
          }
          baseValue = String(v);
          baseValueProvided = true;
          changed = true;
          continue;
        }
        mlCount++;
        if (!isNew && isLangValueEqual(mbo, upperLang, String(v))) {
          continue;
        }
        mbo.setMLValue(ML_FIELD, upperLang, String(v), ML_ACCESS);
        changed = true;
      }
    }
    var flatValue = getValue(row, "VALUE") !== null ? row.VALUE : row.value;
    var hasFlat = flatValue !== undefined && flatValue !== null && String(flatValue) !== "";
    if (!values || mlCount === 0) {
      // 未带 sks:langdata: 平铺 VALUE 按会话语言写入
      if (!hasFlat) {
        throw new MXApplicationException("#", "VALUE 不能为空");
      }
      if (isNew || !isLangValueEqual(mbo, currentLang, String(flatValue))) {
        setLabelValue(mbo, String(flatValue));
        changed = true;
      }
    }
    if (!isNew && !changed) {
      return "skipped";
    }
    saveSet(set, config);
    if (baseValueProvided && baseLang) {
      // langdata 里带基础语言值: 切到基础语言会话后写入基础列
      pendingBase.push({ app: app, id: id, property: property, value: baseValue });
    } else if (isNew && !baseValueProvided && hasFlat && baseLang && currentLang !== baseLang) {
      // 非基础语言会话下新增行且未提供基础语言值: 基础列保持空值占位(~null~)
      pendingBase.push({ app: app, id: id, property: property, value: null });
    }
    return isNew ? "added" : "updated";
  } finally {
    if (set != null) {
      try { set.close(); } catch (ignored) { }
    }
  }
}

/**
 * 在基础语言会话下写入基础列(逐条 save):
 * - item.value 有值: 写入该值(setMLValue 无法更新基础列, 必须切基础语言会话 setValue)
 * - item.value 为 null: 置空占位(~null~), 与 Maximo ImportAppBean 一致
 * 不能把当前语言译文回写到基础语言, 否则基础语言(如 EN)会显示当前语言(如 ZH)的内容
 * @param {Object} config
 * @param {Array} pending
 */
function applyBaseLangValues(config, pending) {
  if (!pending || pending.length === 0) {
    return;
  }
  // 会话实际语言(不能用 config._langcode, 该值默认 EN 与实际会话语言可能不一致)
  var currentLang = String(config._userInfo.getLangCode() || "").toUpperCase();
  var baseLang = getBaseLang();
  if (!baseLang) {
    return;
  }
  var set = null;
  var changed = 0;
  try {
    config._userInfo.setLangCode(baseLang);
    set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
    if (config.dmDeploySet === true) {
      try { set.setDMDeploySet(true); } catch (ignored) { }
    }
    var sqlf = new SqlFormat("app = :1 and id = :2 and property = :3");
    for (var i = 0; i < pending.length; i++) {
      var item = pending[i];
      sqlf.setObject(1, OBJECT_NAME, "APP", item.app);
      sqlf.setObject(2, OBJECT_NAME, "ID", item.id);
      sqlf.setObject(3, OBJECT_NAME, "PROPERTY", item.property);
      set.setWhere(sqlf.format());
      set.reset();
      var mbo = set.getMbo(0);
      if (!mbo) {
        continue;
      }
      if (item.value === null || item.value === undefined) {
        mbo.setValueNull(ML_FIELD, MboConstants.NOACCESSCHECK);
      } else {
        mbo.setValue(ML_FIELD, String(item.value), MboConstants.NOACCESSCHECK);
      }
      set.save();
      changed++;
    }
    debugPrint("baseLang(" + baseLang + ") labels updated=" + changed);
  } catch (e) {
    logger.error("[" + scriptName + "] 基础语言标签更新失败", e);
  } finally {
    if (set) {
      try { set.cleanup(); } catch (ignored) { }
      try { set.close(); } catch (ignored) { }
    }
    try { config._userInfo.setLangCode(currentLang); } catch (ignored) { }
  }
}

function setLabelValue(mbo, value) {
  if (sksCommonsUtils && typeof sksCommonsUtils.autoMboSetValue === "function") {
    try {
      sksCommonsUtils.autoMboSetValue(svc, mbo, ML_FIELD, value, MboConstants.NOACCESSCHECK);
      return;
    } catch (e) {
      logger.warn("autoMboSetValue 失败, 回退 setValue: " + ML_FIELD + " - " + e);
    }
  }
  mbo.setValue(ML_FIELD, value, MboConstants.NOACCESSCHECK);
}

function isLangValueEqual(mbo, lang, value) {
  try {
    var old = mbo.getString(ML_FIELD, lang);
    return String(old === null || old === undefined ? "" : old) === String(value);
  } catch (ignored) {
    return false;
  }
}

function trimStr(v) {
  if (v === null || v === undefined) {
    return "";
  }
  return String(v).trim();
}

function saveSet(set, config) {
  if (config && config.dmDeploySet === true) {
    try { set.setDMDeploySet(true); } catch (ignored) { }
  }
  set.save();
}

function errText(e) {
  if (e === null || typeof e === "undefined") {
    return "";
  }
  try {
    if (e.message) {
      return String(e.message);
    }
  } catch (ignored) { }
  return String(e);
}


