/**
 * SKS_MIGRATEAPI_MAXATTRIBUTECFG - 属性配置(MAXATTRIBUTECFG)多语言迁移接口(新模式)
 *
 * 多语言字段: TITLE(标题, 80) + REMARKS(备注, 4000), 译文均存放在 L_MAXATTRCFG
 *
 * 接口:
 *   GET/POST /maximo/api/script/SKS_MIGRATEAPI_MAXATTRIBUTECFG?_action=query
 *        body: { objectname, attributename, value, where, pageNum, pageSize }
 *        → { maxattributecfgList:[ MAXATTRIBUTECFG 行 ], total, pageNum, pageSize }
 *   GET/POST ...?_action=detail[&objectname=xxx&attributename=xxx]
 *        → { maxattributecfgList:[ ... ] }
 *   GET/POST ...?_action=export[&objectname=xxx|&where=...]  (不分页)
 *        body: { objectname, attributename, value, where, maxattributecfgIds:[...] }
 *        maxattributecfgIds: 主键数组, 传了就按 MAXATTRIBUTEID in (...) 过滤(选中记录导出)
 *        → { maxattributecfgList:[ ... ] }
 *   POST ...?_action=import  body: { "maxattributecfgList": [ MAXATTRIBUTECFG 行... ] }
 *        按 OBJECTNAME + ATTRIBUTENAME upsert; 行内 _delete=true 删除
 *        → { total, added, updated, deleted, skipped, failed, results,
 *            sks:successSumTotal, sks:failSumTotal, sks:ignoreSumTotal }
 *
 * 参数:
 *   _langcode=ZH       会话语言(TITLE/REMARKS 返回该语言译文, 没有译文时回退基础语言)
 *   _allLangcode=true  导出/导入多语言:
 *        行内 sks:langdata = { TITLE: { EN: "...", ZH: "..." }, REMARKS: { EN: "...", ZH: "..." } }
 *   _langcodeList=EN,ZH 限制参与 sks:langdata 的语言
 *   _ignoreList=maxattributecfgList 跳过该根节点的导入
 *   _debug=true        返回 debugMsg
 *   _errorAssert=true  存在失败时抛出异常
 *   dmDeploySet=true   导入时 MboSet.setDMDeploySet(true)(迁移模式)
 *
 * 对象结构(导出/导入一致):
 *   {
 *     OBJECTNAME, ATTRIBUTENAME, TITLE, REMARKS, MAXTYPE, LENGTH, REQUIRED,
 *     PERSISTENT, DOMAINID, ALIAS, MAXATTRIBUTEID,
 *     "sks:langdata": { "TITLE": {...}, "REMARKS": {...} },   // 可选
 *     _delete: true   // 可选: 删除该属性配置
 *   }
 *   根级列表统一使用「表名+List」: maxattributecfgList
 *
 * 说明:
 *   基础语言列(TITLE/REMARKS)为 NOT NULL, 空值为占位符 ~null~;
 *   非基础语言会话下 setMLValue 只写 L_MAXATTRIBUTECFG, 基础列在导入后切换基础语言补写。
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

var OBJECT_NAME = "MAXATTRIBUTECFG";
var LIST_KEY = "maxattributecfgList";
// 多语言字段(译文在 L_MAXATTRCFG)
var ML_FIELDS = ["TITLE", "REMARKS"];
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
      return { maxattributecfgList: parsed };
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
  var where = bodyOrParam(config, ["where"]);
  if (where !== null) {
    conds.push("(" + validateWhere(String(where)) + ")");
  }
  var ids = bodyNumericArray(config, ["maxattributecfgIds", "_maxattributecfgIds", "maxattributecfgid"]);
  if (ids.length > 0) {
    conds.push("MAXATTRIBUTECFG.MAXATTRIBUTEID in (" + ids.join(",") + ")");
  }
  var objectname = bodyOrParam(config, ["objectname", "OBJECTNAME"]);
  var attributename = bodyOrParam(config, ["attributename", "ATTRIBUTENAME"]);
  var value = bodyOrParam(config, ["value", "VALUE", "description", "DESCRIPTION"]);
  if (objectname !== null) {
    conds.push(likeCond("objectname", String(objectname)));
  }
  if (attributename !== null) {
    conds.push(likeCond("attributename", String(attributename)));
  }
  if (value !== null) {
    conds.push(buildValueCond(String(value), String(config._langcode || "").toUpperCase(), getBaseLang()));
  }
  return conds.length > 0 ? conds.join(" and ") : "1=1";
}

/**
 * 值搜索: TITLE / REMARKS 任一匹配; 非基础语言时同时匹配 L_MAXATTRIBUTECFG 译文
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
  var op = exact ? "=" : "like";
  var fields = ML_FIELDS;
  var baseConds = [];
  for (var i = 0; i < fields.length; i++) {
    baseConds.push("upper(MAXATTRIBUTECFG." + fields[i] + ") " + op + " '" + escapeSql(like) + "'");
  }
  var cond = "(" + baseConds.join(" or ") + ")";
  if (!langcode || langcode === baseLang) {
    return cond;
  }
  var mlConds = [];
  for (var j = 0; j < fields.length; j++) {
    mlConds.push("upper(l." + fields[j].toLowerCase() + ") " + op + " '" + escapeSql(like) + "'");
  }
  return "(" + cond + " or exists (select 1 from l_maxattributecfg l where l.ownerid = MAXATTRIBUTECFG.MAXATTRIBUTEID" +
    " and upper(l.langcode) = '" + escapeSql(langcode) + "'" +
    " and (" + mlConds.join(" or ") + ")))";
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
  var objectname = bodyOrParam(config, ["objectname", "OBJECTNAME"]);
  var attributename = bodyOrParam(config, ["attributename", "ATTRIBUTENAME"]);
  if (objectname !== null) {
    conds.push("upper(objectname) = '" + escapeSql(String(objectname).toUpperCase()) + "'");
  }
  if (attributename !== null) {
    conds.push("upper(attributename) = '" + escapeSql(String(attributename).toUpperCase()) + "'");
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
  debugPrint("query maxattributecfg=" + found.maxattributecfgList.length + ", total=" + found.total);

  var result = { maxattributecfgList: found.maxattributecfgList, total: found.total };
  if (paginated) {
    result.pageNum = pageNum;
    result.pageSize = pageSize;
  }
  return result;
}

function doDetail(config) {
  var where = buildDetailWhere(config);
  var found = queryLabels(config, where, null);
  return { maxattributecfgList: found.maxattributecfgList };
}

function doExport(config) {
  var where = buildWhere(config);
  var found = queryLabels(config, where, null);
  debugPrint("export maxattributecfg=" + found.maxattributecfgList.length);
  return { maxattributecfgList: found.maxattributecfgList };
}

// ---------------------------------------------------------------------------
// MboSet 查询
// ---------------------------------------------------------------------------

var _enabledLangcodesCache = null;

/**
 * 打开 MAXATTRIBUTECFG MboSet
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
  set.setOrderBy("OBJECTNAME, ATTRIBUTENAME");
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
 * @returns {Object} { maxattributecfgList, total }
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
  return { maxattributecfgList: rows, total: total };
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
    OBJECTNAME: mboStr(mbo, "OBJECTNAME"),
    ATTRIBUTENAME: mboStr(mbo, "ATTRIBUTENAME"),
    TITLE: resolveMboLangValue(mbo, "TITLE", langcode),
    REMARKS: resolveMboLangValue(mbo, "REMARKS", langcode),
    MAXTYPE: mboStr(mbo, "MAXTYPE"),
    LENGTH: mboIntValue(mbo, "LENGTH"),
    REQUIRED: mboIntValue(mbo, "REQUIRED"),
    PERSISTENT: mboIntValue(mbo, "PERSISTENT"),
    DOMAINID: mboStr(mbo, "DOMAINID"),
    ALIAS: mboStr(mbo, "ALIAS"),
    MAXATTRIBUTEID: mboLongValue(mbo, "MAXATTRIBUTEID")
  };
  row["sks:ref"] = String(row.OBJECTNAME) + "/" + String(row.ATTRIBUTENAME);
  row._status = "success";

  if (config._allLangcode) {
    var codes = resolveLangdataCodes(config);
    var langdata = {};
    for (var f = 0; f < ML_FIELDS.length; f++) {
      var field = ML_FIELDS[f];
      var vals = {};
      var count = 0;
      for (var i = 0; i < codes.length; i++) {
        var v = mboMlString(mbo, field, codes[i]);
        if (v !== null) {
          vals[codes[i]] = v;
          count++;
        }
      }
      if (count === 0 && row[field] !== null) {
        vals[getBaseLang() || "EN"] = row[field];
      }
      langdata[field] = vals;
    }
    row["sks:langdata"] = langdata;
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
 * 取 Mbo 整型字段(避免 getString 的千分位格式化)
 */
function mboIntValue(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : mbo.getInt(attr);
  } catch (ignored) {
    return null;
  }
}

/**
 * 取多语言字段指定语言的值(框架自动合并 L_MAXATTRIBUTECFG)
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} field
 * @param {string} lang
 * @returns {string|null}
 */
function mboMlString(mbo, field, lang) {
  if (!lang) {
    return null;
  }
  try {
    var v = mbo.getString(field, String(lang).toUpperCase());
    return v === null || String(v) === "" ? null : String(v);
  } catch (ignored) {
    return null;
  }
}

/**
 * 按请求语言取值, 无译文时回退基础语言/当前语言
 */
function resolveMboLangValue(mbo, field, langcode) {
  var v = mboMlString(mbo, field, langcode);
  if (v !== null) {
    return v;
  }
  var base = getBaseLang();
  if (base !== "") {
    v = mboMlString(mbo, field, base);
    if (v !== null) {
      return v;
    }
  }
  return mboStr(mbo, field);
}

// ---------------------------------------------------------------------------
// 导入
// ---------------------------------------------------------------------------

function doImport(config) {
  var ignoreList = resolveIgnoreList(config);
  if (ignoreList.indexOf(LIST_KEY) >= 0) {
    debugPrint(LIST_KEY + " ignored by _ignoreList");
    return emptyImportResult();
  }
  var body = config._body || {};
  var list = body[LIST_KEY] || body.maxattributecfg || body.attributecfgs;
  if (!(list instanceof Array) || list.length === 0) {
    throw new MXApplicationException("#", LIST_KEY + " 必须为非空数组");
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
      logger.error("[" + scriptName + "] 导入属性配置失败: " + ref + " - " + errText(e));
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

function emptyImportResult() {
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

function buildRef(row) {
  if (!row || typeof row !== "object") {
    return "";
  }
  var objectname = row.OBJECTNAME !== undefined ? row.OBJECTNAME : row.objectname;
  var attributename = row.ATTRIBUTENAME !== undefined ? row.ATTRIBUTENAME : row.attributename;
  return String(objectname === undefined || objectname === null ? "" : objectname) + "/" +
    String(attributename === undefined || attributename === null ? "" : attributename);
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
 * 通过 MAXOBJECTCFG 的关系 MAXATTRIBUTECFG 获取属性配置行:
 * 顶层直接打开 MAXATTRIBUTECFG 时, 其语言表 L_MAXATTRCFG 不允许 ADD(BMXAA0024E);
 * 从 MAXOBJECTCFG.MAXATTRIBUTECFG 关系进入后可正常新增语言行。
 * @param {Object} config
 * @param {string} objectname
 * @param {string} attributename
 * @returns {Object} { rootSet, cfgSet, mbo }
 */
function openAttributeCfg(config, objectname, attributename) {
  var rootSet = null;
  try {
    rootSet = mxserver.getMboSet("MAXOBJECTCFG", config._userInfo);
    rootSet.setWhere("upper(objectname) = '" + escapeSql(String(objectname).toUpperCase()) + "'");
    rootSet.reset();
    var rootMbo = rootSet.isEmpty() ? null : rootSet.getMbo(0);
    if (!rootMbo) {
      throw new MXApplicationException("#", "MAXOBJECTCFG 中不存在对象 " + objectname);
    }
    var cfgSet = rootMbo.getMboSet("MAXATTRIBUTECFG");
    cfgSet.reset();
    var mbo = null;
    var current = cfgSet.moveFirst();
    while (current !== null) {
      if (String(current.getString("ATTRIBUTENAME") || "").toUpperCase() === String(attributename).toUpperCase()) {
        mbo = current;
        break;
      }
      current = cfgSet.moveNext();
    }
    return { rootSet: rootSet, cfgSet: cfgSet, mbo: mbo };
  } catch (e) {
    if (rootSet) {
      try { rootSet.close(); } catch (ignored) { }
    }
    throw e;
  }
}

function closeAttributeCfg(ctx) {
  if (!ctx) {
    return;
  }
  if (ctx.cfgSet) {
    try { ctx.cfgSet.close(); } catch (ignored) { }
  }
  if (ctx.rootSet) {
    try { ctx.rootSet.close(); } catch (ignored) { }
  }
}

/**
 * 单行导入(OBJECTNAME + ATTRIBUTENAME upsert), TITLE/REMARKS 两个多语言字段分别处理
 * @param {Object} config
 * @param {Object} row
 * @param {Array} pendingBase 基础语言待补写队列
 * @returns {string} added / updated / deleted / skipped
 */
function importLabel(config, row, pendingBase) {
  if (!row || typeof row !== "object") {
    throw new MXApplicationException("#", "属性配置不合法");
  }
  var objectname = trimStr(getValue(row, "OBJECTNAME") !== null ? row.OBJECTNAME : row.objectname);
  var attributename = trimStr(getValue(row, "ATTRIBUTENAME") !== null ? row.ATTRIBUTENAME : row.attributename);
  if (objectname === "") {
    throw new MXApplicationException("#", "OBJECTNAME 不能为空");
  }
  if (attributename === "") {
    throw new MXApplicationException("#", "ATTRIBUTENAME 不能为空");
  }
  var ctx = null;
  try {
    ctx = openAttributeCfg(config, objectname, attributename);
    if (config.dmDeploySet === true) {
      try { ctx.cfgSet.setDMDeploySet(true); } catch (ignored) { }
    }
    var mbo = ctx.mbo;

    if (isTrue(row._delete)) {
      if (!mbo) {
        return "skipped";
      }
      mbo.delete();
      saveSet(ctx.cfgSet, config);
      return "deleted";
    }

    var isNew = !mbo;
    if (isNew) {
      mbo = ctx.cfgSet.add();
      mbo.setValue("ATTRIBUTENAME", attributename, MboConstants.NOACCESSCHECK);
      if (mbo.isNull("OBJECTNAME")) {
        mbo.setValue("OBJECTNAME", objectname, MboConstants.NOACCESSCHECK);
      }
    } else if (isTrue(row._updateIgnored)) {
      return "skipped";
    }
    debugPrint("match " + objectname + "/" + attributename + " isNew=" + isNew +
      " currentLang=" + String(config._userInfo.getLangCode()));

    var baseLang = getBaseLang();
    // 会话实际语言(_langcode 默认 EN, 与 JSESSIONID/apikey 会话语言可能不一致)
    var currentLang = String(config._userInfo.getLangCode() || "").toUpperCase();
    var allLang = config._allLangcode === true;
    var langData = row["sks:langdata"];
    var changed = false;
    var pendingForRow = [];

    for (var f = 0; f < ML_FIELDS.length; f++) {
      var field = ML_FIELDS[f];
      var values = (allLang && langData && langData[field] && typeof langData[field] === "object") ? langData[field] : null;
      var baseValue = null;
      var baseValueProvided = false;
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
          mlCount++;
          if (upperLang === baseLang) {
            // 基础语言: 统一交给 applyBaseLangValues 在基础语言会话下写基础列
            if (!isNew && isLangValueEqual(mbo, field, baseLang, String(v))) {
              continue;
            }
            baseValue = String(v);
            baseValueProvided = true;
            changed = true;
            continue;
          }
          if (!isNew && isLangValueEqual(mbo, field, upperLang, String(v))) {
            continue;
          }
          writeLangValue(config, mbo, field, upperLang, String(v));
          changed = true;
        }
      }
      var flatValue = getValue(row, field);
      var hasFlat = flatValue !== null && String(flatValue).trim() !== "";
      if ((!values || mlCount === 0) && hasFlat) {
        // 未带该字段的 sks:langdata: 平铺 TITLE/REMARKS 按会话语言写入
        if (isNew || !isLangValueEqual(mbo, field, currentLang, String(flatValue))) {
          setLabelValue(mbo, field, String(flatValue));
          changed = true;
        }
      }
      if (baseValueProvided && baseLang) {
        pendingForRow.push({ field: field, value: baseValue });
      } else if (isNew && !baseValueProvided && hasFlat && baseLang && currentLang !== baseLang) {
        // 非基础语言会话下新增行且未提供基础语言值: 基础列保持空值占位(~null~)
        pendingForRow.push({ field: field, value: null });
      }
    }

    if (!isNew && !changed) {
      return "skipped";
    }
    // 保存 MAXOBJECTCFG.MAXATTRIBUTECFG 关系集及其语言行
    saveSet(ctx.cfgSet, config);
    try { ctx.rootSet.save(); } catch (ignoredSave) { }
    for (var p = 0; p < pendingForRow.length; p++) {
      pendingBase.push({
        objectname: objectname,
        attributename: attributename,
        field: pendingForRow[p].field,
        value: pendingForRow[p].value
      });
    }
    return isNew ? "added" : "updated";
  } finally {
    closeAttributeCfg(ctx);
  }
}

/**
 * 在基础语言会话下写入基础列(逐条 save):
 * - item.value 有值: 写入该值(setMLValue 无法更新基础列, 必须切基础语言会话 setValue)
 * - item.value 为 null: 置空占位(~null~), 与 Maximo ImportAppBean 一致
 * @param {Object} config
 * @param {Array} pending
 */
function applyBaseLangValues(config, pending) {
  if (!pending || pending.length === 0) {
    return;
  }
  var currentLang = String(config._userInfo.getLangCode() || "").toUpperCase();
  var baseLang = getBaseLang();
  if (!baseLang) {
    return;
  }
  var changed = 0;
  try {
    config._userInfo.setLangCode(baseLang);
    for (var i = 0; i < pending.length; i++) {
      var item = pending[i];
      var ctx = null;
      try {
        // 与导入一致: 经 MAXOBJECTCFG 关系取属性配置行
        ctx = openAttributeCfg(config, item.objectname, item.attributename);
        if (!ctx.mbo) {
          continue;
        }
        if (item.value === null || item.value === undefined) {
          ctx.mbo.setValueNull(item.field, MboConstants.NOACCESSCHECK);
        } else {
          ctx.mbo.setValue(item.field, String(item.value), MboConstants.NOACCESSCHECK);
        }
        saveSet(ctx.cfgSet, config);
        try { ctx.rootSet.save(); } catch (ignoredSave) { }
        changed++;
      } finally {
        closeAttributeCfg(ctx);
      }
    }
    debugPrint("baseLang(" + baseLang + ") maxattributecfg updated=" + changed);
  } catch (e) {
    logger.error("[" + scriptName + "] 基础语言属性配置更新失败", e);
  } finally {
    try { config._userInfo.setLangCode(currentLang); } catch (ignored) { }
  }
}

/**
 * 写入非基础语言译文(父对象由 MAXOBJECTCFG 关系取得, 语言行随关系集保存)
 * @param {Object} config
 * @param {psdi.mbo.Mbo} mbo 父对象(MAXATTRIBUTECFG)
 * @param {string} field 多语言字段(TITLE/REMARKS)
 * @param {string} lang 语言代码
 * @param {string} value 译文
 */
function writeLangValue(config, mbo, field, lang, value) {
  var langCode = String(lang).toUpperCase();
  mbo.setMLValue(field, langCode, String(value), ML_ACCESS);
  debugPrint("ml write " + field + "/" + langCode);
}

function setLabelValue(mbo, field, value) {
  if (sksCommonsUtils && typeof sksCommonsUtils.autoMboSetValue === "function") {
    try {
      sksCommonsUtils.autoMboSetValue(svc, mbo, field, value, MboConstants.NOACCESSCHECK);
      return;
    } catch (e) {
      logger.warn("autoMboSetValue 失败, 回退 setValue: " + field + " - " + e);
    }
  }
  mbo.setValue(field, value, MboConstants.NOACCESSCHECK);
}

function isLangValueEqual(mbo, field, lang, value) {
  try {
    var old = mbo.getString(field, lang);
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
