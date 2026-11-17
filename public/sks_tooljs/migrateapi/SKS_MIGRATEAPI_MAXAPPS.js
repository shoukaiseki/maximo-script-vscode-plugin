/**
 * SKS_MIGRATEAPI_MAXAPPS - 应用(MAXAPPS)多语言迁移接口(新模式)
 *
 * 接口:
 *   GET/POST /maximo/api/script/SKS_MIGRATEAPI_MAXAPPS?_action=query
 *        body: { app, description, where, pageNum, pageSize }
 *        → { maxappsList:[ MAXAPPS 行 ], total, pageNum, pageSize }
 *   GET/POST ...?_action=detail[&app=xxx]
 *        → { maxappsList:[ ... ] }
 *   GET/POST ...?_action=export[&app=xxx|&where=...]  (不分页)
 *        body: { app, description, where, appIds:[...] }
 *        appIds: 应用名数组, 传了就按 APP in (...) 过滤(选中记录导出)
 *        → { maxappsList:[ ... ] }
 *
 * 参数:
 *   _langcode=ZH       会话语言(DESCRIPTION 返回该语言译文, 没有译文时回退基础语言)
 *   tab=all|xml|mafapp 过滤标签页: xml=存在 MAXPRESENTATION 的应用, mafapp=APPTYPE in ('WC')
 *   _allLangcode=true  导出多语言: 行内 sks:langdata = { DESCRIPTION: { EN: "...", ZH: "..." } }
 *   _langcodeList=EN,ZH 限制参与 sks:langdata 的语言
 *   _debug=true        返回 debugMsg
 *
 * 对象结构(导出):
 *   {
 *     APP, DESCRIPTION, APPTYPE, MAINTBNAME, ORIGINALAPP, LANGCODE,
 *     ISMOBILE, LOCKENABLED, SKIPNAVIGATION, HASLD, MAXAPPSID,
 *     "sks:langdata": { "DESCRIPTION": { "EN": "...", "ZH": "..." } }  // 可选
 *   }
 *   根级列表统一使用「表名+List」: maxappsList
 *
 * 说明:
 *   MAXAPPS.DESCRIPTION 是 MLINUSE 多语言字段, 译文存放在 L_MAXAPPS(OWNERID/LANGCODE/DESCRIPTION);
 *   导入由 SKS_MIGRATEAPI_CONFIGUR 的 mlmaxapps 功能统一处理(基础语言列切会话补写)。
 */
/** @type {psdi.util.MXApplicationException} */
var MXApplicationException = Java.type("psdi.util.MXApplicationException");
/** @type {psdi.server.MXServer} */
var MXServer = Java.type("psdi.server.MXServer");
var MboConstants = Java.type("psdi.mbo.MboConstants");

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

var OBJECT_NAME = "MAXAPPS";
// 多语言字段(译文在 L_MAXAPPS)
var ML_FIELD = "DESCRIPTION";

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
  throw new MXApplicationException("#", "未知 _action: " + action + " (可用: query/detail/export)");
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
    _debug: paramDebug
  };
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
      return { maxappsList: parsed };
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

function bodyOrParamValue(body, name) {
  if (body && body[name] !== undefined && body[name] !== null && body[name] !== "") {
    return body[name];
  }
  return qparam(name);
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

/**
 * 读取应用名数组(body 数组 / 逗号分隔字符串 / URL 参数), 只保留合法应用名(防注入)
 * @param {Object} config
 * @param {Array<string>} names
 * @returns {Array<string>}
 */
function bodyAppArray(config, names) {
  var raw = null;
  for (var i = 0; i < names.length; i++) {
    var v = getValue(config._body, names[i]);
    if (v !== null) {
      raw = v;
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
    var app = String(raw[j] === null || raw[j] === undefined ? "" : raw[j]).trim().toUpperCase();
    if (/^[A-Z0-9_]+$/.test(app) && list.indexOf(app) < 0) {
      list.push(app);
    }
  }
  return list;
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
  var ids = bodyAppArray(config, ["appIds", "_appIds"]);
  if (ids.length > 0) {
    var quoted = [];
    for (var i = 0; i < ids.length; i++) {
      quoted.push("'" + escapeSql(ids[i]) + "'");
    }
    conds.push("MAXAPPS.APP in (" + quoted.join(",") + ")");
  }
  var app = bodyOrParam(config, ["app", "APP"]);
  var description = bodyOrParam(config, ["description", "DESCRIPTION", "value", "VALUE"]);
  if (app !== null) {
    conds.push(likeCond("app", String(app)));
  }
  if (description !== null) {
    conds.push(buildValueCond(String(description), String(config._langcode || "").toUpperCase(), getBaseLang()));
  }
  // 过滤标签页(与 maxobject/maxapps 一致): xml=存在 MAXPRESENTATION, mafapp=APPTYPE in ('WC')
  var tab = bodyOrParam(config, ["tab"]);
  if (tab !== null) {
    var mode = String(tab).trim().toLowerCase();
    if (mode === "xml") {
      conds.push("exists (select 1 from maxpresentation xp where xp.app = MAXAPPS.APP)");
    } else if (mode === "mafapp") {
      conds.push("MAXAPPS.APPTYPE in ('WC')");
    }
  }
  return conds.length > 0 ? conds.join(" and ") : "1=1";
}

/**
 * 值搜索: 会话语言为基础语言时直接搜 DESCRIPTION 列, 否则同时匹配 L_MAXAPPS 译文
 */
function buildValueCond(input, langcode, baseLang) {
  var val = String(input).trim();
  var exact = val.charAt(0) === "=";
  if (exact) {
    val = val.substring(1);
  }
  var like = exact ? val.toUpperCase() : (val.indexOf("%") >= 0 ? val : "%" + val + "%").toUpperCase();
  var cond = "upper(MAXAPPS.DESCRIPTION) " + (exact ? "=" : "like") + " '" + escapeSql(like) + "'";
  if (!langcode || langcode === baseLang) {
    return cond;
  }
  return "(" + cond + " or exists (select 1 from l_maxapps l where l.ownerid = MAXAPPS.MAXAPPSID" +
    " and upper(l.langcode) = '" + escapeSql(langcode) + "'" +
    " and upper(l.description) " + (exact ? "=" : "like") + " '" + escapeSql(like) + "'))";
}

function validateWhere(where) {
  var upper = String(where).toUpperCase();
  if (upper.indexOf(";") >= 0 || upper.indexOf("--") >= 0 || upper.indexOf("/*") >= 0) {
    throw new MXApplicationException("#", "where 含非法字符");
  }
  return where;
}

function buildDetailWhere(config) {
  var app = bodyOrParam(config, ["app", "APP"]);
  if (app !== null) {
    return "upper(app) = '" + escapeSql(String(app).toUpperCase()) + "'";
  }
  return buildWhere(config);
}

function doQuery(config) {
  var where = buildWhere(config);
  var pageNum = toInt(bodyOrParam(config, ["pageNum", "page"]), 0);
  var pageSize = toInt(bodyOrParam(config, ["pageSize", "limit"]), 0);
  var paginated = pageNum > 0 && pageSize > 0;
  var page = paginated ? { pageNum: pageNum, pageSize: pageSize } : null;

  var found = queryApps(config, where, page);
  debugPrint("query maxapps=" + found.maxappsList.length + ", total=" + found.total);

  var result = { maxappsList: found.maxappsList, total: found.total };
  if (paginated) {
    result.pageNum = pageNum;
    result.pageSize = pageSize;
  }
  return result;
}

function doDetail(config) {
  var found = queryApps(config, buildDetailWhere(config), null);
  return { maxappsList: found.maxappsList };
}

function doExport(config) {
  var found = queryApps(config, buildWhere(config), null);
  debugPrint("export maxapps=" + found.maxappsList.length);
  return { maxappsList: found.maxappsList };
}

// ---------------------------------------------------------------------------
// MboSet 查询
// ---------------------------------------------------------------------------

var _enabledLangcodesCache = null;

function createAppSet(config, where) {
  var set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
  set.setFlag(MboConstants.DISCARDABLE, true);
  if (where !== null && where !== undefined && String(where) !== "") {
    set.setWhere(String(where));
  }
  set.setOrderBy("APP");
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

function queryApps(config, where, page) {
  var set = null;
  var rows = [];
  var total = 0;
  try {
    set = createAppSet(config, where);
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
        rows.push(buildAppRow(mbo, config));
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
  return { maxappsList: rows, total: total };
}

/**
 * Mbo → 导出行(字段名与表列一致 + sks:ref/_status/sks:langdata)
 */
function buildAppRow(mbo, config) {
  var langcode = String(config._langcode || "").toUpperCase();
  var row = {
    APP: mboStr(mbo, "APP"),
    DESCRIPTION: resolveMboLangValue(mbo, langcode),
    APPTYPE: mboStr(mbo, "APPTYPE"),
    MAINTBNAME: mboStr(mbo, "MAINTBNAME"),
    ORIGINALAPP: mboStr(mbo, "ORIGINALAPP"),
    LANGCODE: mboStr(mbo, "LANGCODE"),
    ISMOBILE: mboIntValue(mbo, "ISMOBILE"),
    LOCKENABLED: mboIntValue(mbo, "LOCKENABLED"),
    SKIPNAVIGATION: mboIntValue(mbo, "SKIPNAVIGATION"),
    HASLD: mboIntValue(mbo, "HASLD"),
    MAXAPPSID: mboLongValue(mbo, "MAXAPPSID")
  };
  row["sks:ref"] = row.APP === null ? "" : String(row.APP);
  row._status = "success";

  if (config._allLangcode) {
    var codes = resolveLangdataCodes(config);
    var vals = {};
    var count = 0;
    for (var i = 0; i < codes.length; i++) {
      var v = mboMlString(mbo, codes[i]);
      if (v !== null) {
        vals[codes[i]] = v;
        count++;
      }
    }
    if (count === 0 && row.DESCRIPTION !== null) {
      vals[getBaseLang() || "EN"] = row.DESCRIPTION;
    }
    row["sks:langdata"] = { DESCRIPTION: vals };
  }
  return row;
}

function resolveLangdataCodes(config) {
  if (config._langcodeList && config._langcodeList.length > 0) {
    return config._langcodeList;
  }
  return getEnabledLangcodes(config);
}

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

function mboStr(mbo, attr) {
  try {
    var v = mbo.getString(attr);
    return v === null || String(v) === "" ? null : String(v);
  } catch (ignored) {
    return null;
  }
}

function mboLongValue(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : mbo.getLong(attr);
  } catch (ignored) {
    return null;
  }
}

function mboIntValue(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : mbo.getInt(attr);
  } catch (ignored) {
    return null;
  }
}

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
