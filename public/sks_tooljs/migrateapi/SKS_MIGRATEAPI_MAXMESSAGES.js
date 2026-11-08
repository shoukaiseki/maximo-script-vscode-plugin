// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// 消息(MAXMESSAGES) 查询 / 导出 / 导入接口
// 字段名与 messages_page_3.json 保持一致:
//   msgGroup, msgKey, value, MAXMESSAGESID, displayMethod,
//   options, sks:options, prefix, msgIdPrefix, msgIdSuffix
// 查询全部通过 MboSet 读取(Mbo.getString(attr, lang)), 不再写死 ZH/EN/JA 三列 SQL:
//   - 启用语言由 MXServer.getLanguageList() 动态获取(失败回退 LANGUAGE 表 ENABLED=1)
//   - 多语言统一输出到 sks:langdata(见 _allLangcode), 不再平铺 value_<lang>
//   - MboSet.setFlag(MboConstants.DISCARDABLE, true) 取消 MboSet 最多 5000 条的限制
//
// 调用方式:
//   GET/POST /maximo/api/script/SKS_MIGRATEAPI_MAXMESSAGES?_action=query
//        body: { where | filterMode:"gk"+groupKeyList, msgid, msggroup, msgkey, value, pageNum, pageSize }
//        → { messages:[...], total, pageNum?, pageSize? }
//   GET/POST ...?_action=detail&maxmessagesid=xxx  (或 msggroup+msgkey)
//        → 单条消息对象(不存在返回 null)
//   GET/POST ...?_action=export[_&where=...]  (不分页, 导出全部)
//        → { messages:[...] }
//   POST ...?_action=import  body: { "messages": [ 消息对象... ] }
//        按 MSGGROUP+MSGKEY 新增/更新; delete/_delete=true 删除
//        新增时未给 msgId 且未给 msgIdPrefix/msgIdSuffix 则默认 BMXZZ/E
//        → { total, added, updated, deleted, failed, results, sks:successSumTotal, sks:failSumTotal }
//   _langcode=ZH      按语言取值(value 取该语言译文)
//   _includeExtra=true 额外返回 title/buttonText/explanation/.../msgId
//   _allLangcode=true 查询/导出时输出 sks:langdata = { 字段: { 语言: 值 } };
//                     导入时按 sks:langdata 设置多语言, 否则只 setValue("VALUE", value)
//   _debug=true       返回 debugMsg
//   dmDeploySet=true  导入时 MboSet.setDMDeploySet(true)(迁移模式)

// load('nashorn:mozilla_compat.js');
// importPackage(java.io);
// importPackage(java.sql);

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");//13

/** @type {java.util.HashMap} */
HashMap = Java.type("java.util.HashMap");

/** @type {com.ibm.json.java.JSONArray} */
JSONArray = Java.type("com.ibm.json.java.JSONArray");
/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");
/** @type {com.ibm.json.java.OrderedJSONObject} */
OrderedJSONObject = Java.type("com.ibm.json.java.OrderedJSONObject");
/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");
var scriptName = service.getScriptName()
// 通过 invokeScript 调用本脚本时 service 可能不在闭包作用域, 顶层先捕获
var svc = service;
var mxserver = MXServer.getMXServer();

/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("[" + scriptName + "]----------1");
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
// logger.setLevel(Level.INFO);
logger.info("[" + scriptName + "]----------------Starting execution of script " + service.getScriptName());
logger.info("[" + scriptName + "]-------------webclientsession=" + service.webclientsession())

// SKS_COMMONS_UTILS: autoMboSetValue 按 Mbo 字段类型设值
var sksCommonsUtils = null;
try {
  sksCommonsUtils = svc.invokeScript("SKS_COMMONS_UTILS");
} catch (ignored) {
  logger.warn("[" + scriptName + "] SKS_COMMONS_UTILS 不可用, 回退 mbo.setValue");
}

//如果是多语言的表,通过下面方式设置语言环境的数据
var _langcode = "EN";
if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
  _langcode = String(request.getQueryParam("_langcode")).toUpperCase();
  userInfo.setLangCode(_langcode);
  logger.info("[" + scriptName + "] _langcode=" + _langcode + ", langCode=" + userInfo.getLocale().getLanguage());
}

// 新模式多语言输出: _allLangcode=true 时返回 sks:langdata = { 字段: { 语言: 值 } }
var _allLangcode = false;
if (request.getQueryParam("_allLangcode") !== 'undefined' && request.getQueryParam("_allLangcode")) {
  _allLangcode = String(request.getQueryParam("_allLangcode")) === 'true';
  logger.info("[" + scriptName + "] _allLangcode=" + _allLangcode);
}

/** @type {java.lang.StringBuilder} */
StringBuilder = Java.type("java.lang.StringBuilder");
/** @type {java.lang.StringBuilder} */
var debugMsg = new StringBuilder();
// 调试参数,设置为true,则会返回debugMsg
var paramDebug = false

if (request.getQueryParam("_debug") !== 'undefined' && request.getQueryParam("_debug")) {
  //paramDebug=true
  paramDebug = request.getQueryParam("_debug") === 'true';
  logger.info("\x1b[35;40m[" + scriptName + "]------------------paramDebug=" + paramDebug + "\x1b[0m");
}

//参数中不要包含以下参数,这些是maximo中在用的: action,distinct,maxsso,template,collectioncount,localref,relatedref 

/** @type {java.lang.String} */
var requestBodyTmp = requestBody

/** @type {psdi.security.UserInfo} */
var userInfoTmp = userInfo

/** @type {com.ibm.tivoli.maximo.osprovider.OslcRequest} */
var requestTmp = request

/** @type {java.util.HashMap} */
var responseHeadersTmp = responseHeaders

/** @type {java.lang.String} */
var httpMethodTmp = httpMethod

var OBJECT_NAME = "MAXMESSAGES";
// 消息唯一键: MSGGROUP + MSGKEY (MAXMESSAGESID 由序列生成, 跨环境导入不写)
var KEY_FIELDS = ["MSGGROUP", "MSGKEY"];
// OPTIONS 位掩码: CLOSE=1, OK=2, CANCEL=4, YES=8, NO=16
var OPTION_BITS = { close: 1, ok: 2, cancel: 4, yes: 8, no: 16 };
var OPTION_ATTRS = [["close", "CLOSE"], ["ok", "OK"], ["cancel", "CANCEL"], ["yes", "YES"], ["no", "NO"]];
// 导出/查询默认不返回的可选字段(camel 名 → MBO 属性), _includeExtra=true 时追加
var EXTRA_FIELDS = [
  ["title", "TITLE"],
  ["buttonText", "BUTTONTEXT"],
  ["explanation", "EXPLANATION"],
  ["adminResponse", "ADMINRESPONSE"],
  ["operatorResponse", "OPERATORRESPONSE"],
  ["systemAction", "SYSTEMACTION"],
  ["response", "RESPONSE"],
  ["msgId", "MSGID"]
];
// 导入时可直接映射的字段(camel 名 → MBO 属性)
var IMPORT_FIELDS = [
  ["msgGroup", "MSGGROUP"],
  ["msgKey", "MSGKEY"],
  ["displayMethod", "DISPLAYMETHOD"],
  ["prefix", "PREFIX"],
  ["title", "TITLE"],
  ["buttonText", "BUTTONTEXT"],
  ["explanation", "EXPLANATION"],
  ["adminResponse", "ADMINRESPONSE"],
  ["operatorResponse", "OPERATORRESPONSE"],
  ["systemAction", "SYSTEMACTION"],
  ["response", "RESPONSE"]
];
// 多语言字段(MLSUPPORTED=1): TITLE 非多语言
var ML_FIELD_LIST = ["VALUE", "BUTTONTEXT", "EXPLANATION", "ADMINRESPONSE", "OPERATORRESPONSE", "SYSTEMACTION", "RESPONSE"];
// 启用语言缓存(必须在 main() 调用前初始化: main() 在 175 行执行, 之后的 top-level 赋值尚未运行)
var _enabledLangcodesCache = null;


//成功时
var successData = {}

main()
function main() {

  try {
    // 管理模式下不允许执行脚本，抛出异常
    if (Java.type("psdi.iface.mic.MicUtil").getAdminModeState()) {
      throw new MXApplicationException("ibm_system", "AdminOnThis")
    }
    successData = process()
    var resData = {
      "status": "success",
      "data": successData,
      "message": "Script executed successfully"
    }

    if (paramDebug) {
      resData.debugMsg = debugMsg.toString();
    }

    //返回的设置到responseBody变量,String类型或者 byte[]类型
    responseBody = JSON.stringify(resData);
  } catch (error) {
    logger.info("[" + scriptName + "]----------------responseBodyTmp error.");
    logger.error(">>> [API ERROR] 全局捕获异常:", error)
    var errorMessage = "error"
    try {
      errorMessage = sksLogAnsiUtils.getErrorStackTrace(error)
      debugPrint(errorMessage);
    } catch (e) { service.log_error(">>> [API ERROR] 获取异常堆栈:") }

    var errorData = { "status": "error", "message": errorMessage }
    if (paramDebug) {
      errorData.debugMsg = debugMsg.toString();
    }
    responseBody = JSON.stringify(errorData);
  } finally {
    logger.info("[" + scriptName + "]----------------responseBodyTmp finally");
    logger.debug("[" + scriptName + "]----------------responseBodyTmp=" + responseBody + ".");
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
  if (action === "export" || action === "exportApp") {
    return doExport(config);
  }
  if (action === "import" || action === "importApp") {
    return doImport(config);
  }
  throw new MXApplicationException("#", "未知 _action: " + action + " (可用: query/detail/export/import)");
}

/**
 * 构建本次请求的 config(与 SKS_MIGRATE_* 脚本的 config 风格一致)
 * @param {string} action
 * @returns {Object}
 */
function buildConfig(action) {
  return {
    _service: svc,
    _userInfo: userInfo,
    _langcode: _langcode,
    _action: action,
    _apiAction: (action === "import" || action === "importApp") ? "imp" : action,
    _body: parseRequestBody(),
    _includeExtra: qparam("_includeExtra") === "true",
    _allLangcode: _allLangcode,
    _errorAssert: qparam("_errorAssert") === "true",
    dmDeploySet: (qparam("dmDeploySet") === "true" || qparam("_dmDeploySet") === "true")
  };
}

function getAction() {
  var a = qparam("_action");
  return a === null ? "query" : a;
}

/**
 * 解析请求体: 支持对象 {messages:[...]} 和直接数组 [...]
 * @returns {Object|Array}
 */
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
    if (parsed === null || typeof parsed === "undefined") {
      return {};
    }
    if (Array.isArray(parsed)) {
      return { messages: parsed };
    }
    return parsed;
  } catch (e) {
    throw new MXApplicationException("#", "请求体不是合法的 JSON: " + (e.message || e));
  }
}

/**
 * 读取 URL 查询参数
 * @param {string} name
 * @returns {string|null}
 */
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

/**
 * 优先取请求体字段, 再取 URL 参数
 * @param {Object} config
 * @param {Array<string>} names
 * @returns {*}
 */
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

/**
 * 取对象属性, 空串/null 视为未提供
 * @param {Object} obj
 * @param {string} key
 * @returns {*}
 */
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
 * 取 camel 或 MBO 属性名的值(兼容新旧 JSON)
 * @param {Object} data
 * @param {string} camel
 * @param {string} attr
 * @returns {*}
 */
function pick(data, camel, attr) {
  if (!data || typeof data !== "object") {
    return null;
  }
  if (data[camel] !== undefined && data[camel] !== null) {
    return data[camel];
  }
  if (data[attr] !== undefined && data[attr] !== null) {
    return data[attr];
  }
  return null;
}

function toInt(value, defaultValue) {
  if (value === null || typeof value === "undefined") {
    return defaultValue;
  }
  var n = parseInt(String(value), 10);
  return isNaN(n) ? defaultValue : n;
}

/**
 * 当前语言代码(只保留字母数字, 防止拼入 SQL 时注入)
 * @returns {string}
 */
function getLang() {
  var lang = String(_langcode || "EN").toUpperCase().replace(/[^A-Z0-9_]/g, "");
  return lang === "" ? "EN" : lang;
}

// ---------------------------------------------------------------------------
// 查询 / 导出
// ---------------------------------------------------------------------------

/**
 * 解析过滤条件(where 模式 / gk 模式)
 * @param {Object} config
 * @returns {string} SQL WHERE
 */
function resolveWhere(config) {
  var body = config._body || {};
  var filterMode = getValue(body, "filterMode");
  if (filterMode === null) {
    filterMode = qparam("filterMode");
  }
  if (filterMode === null) {
    filterMode = "where";
  }

  if (filterMode === "gk") {
    return buildGroupKeyWhere(config);
  }
  if (filterMode !== "where") {
    throw new MXApplicationException("#", "filterMode 必须是 'where' 或 'gk'");
  }

  var where = getValue(body, "where");
  if (where === null) {
    where = qparam("where");
  }
  if (where === null) {
    // 字段搜索: VALUE 同时匹配基表与所有语言(L_MAXMESSAGES)译文
    var fields = [
      ["MSGID", bodyOrParam(config, ["msgid", "MSGID"])],
      ["MSGGROUP", bodyOrParam(config, ["msggroup", "msgGroup", "MSGGROUP"])],
      ["MSGKEY", bodyOrParam(config, ["msgkey", "msgKey", "MSGKEY"])],
      ["VALUE", bodyOrParam(config, ["value", "VALUE"])]
    ];
    where = buildWhereFromFields(fields);
    if (where === null || where === "") {
      where = "1=1";
    }
    // 字段条件已是 SQL(含 EXISTS 子查询), 直接交给 MboSet.setWhere
    return where;
  }
  if (where === null || where === "") {
    where = "1=1";
  }

  // 用 MboSet 校验 where 语法(Maximo 支持 & 等写法), 取完整 where
  return validateWhere(where);
}

/**
 * 用 MboSet 解析 where, 返回完整 where(SQL)
 * @param {string} where
 * @returns {string}
 */
function validateWhere(where) {
  var set = null;
  try {
    set = mxserver.getMboSet(OBJECT_NAME, userInfo);
    set.setFlag(MboConstants.DISCARDABLE, true);
    set.setWhere(where);
    set.reset();
    var complete = set.getCompleteWhere();
    if (complete === null || complete === undefined || String(complete) === "") {
      return where;
    }
    return String(complete);
  } finally {
    _close(set);
  }
}

/**
 * gk 模式: 按 msgGroup+msgKey 批量查询
 * @param {Object} config
 * @returns {string}
 */
function buildGroupKeyWhere(config) {
  var body = config._body || {};
  var list = body.groupKeyList;
  if (typeof list === "string") {
    try { list = JSON.parse(list); } catch (e) { list = null; }
  }
  if (!list) {
    var raw = qparam("groupKeyList");
    if (raw !== null) {
      try { list = JSON.parse(raw); } catch (e) { list = null; }
    }
  }
  if (!list || !list.length) {
    throw new MXApplicationException("#", "groupKeyList 不能为空");
  }

  var conditions = [];
  for (var i = 0; i < list.length; i++) {
    var gk = list[i];
    if (!gk || !gk.msgGroup || !gk.msgKey) {
      continue;
    }
    var sqlf = new SqlFormat("(MSGGROUP = :1 and MSGKEY = :2)");
    sqlf.setObject(1, OBJECT_NAME, "MSGGROUP", String(gk.msgGroup));
    sqlf.setObject(2, OBJECT_NAME, "MSGKEY", String(gk.msgKey));
    conditions.push(sqlf.format());
  }
  if (conditions.length === 0) {
    throw new MXApplicationException("#", "groupKeyList 没有有效的 msgGroup/msgKey");
  }
  return conditions.join(" OR ");
}

/**
 * 字段搜索条件(=精确, 含 %/_ 原样 LIKE, 否则 %x%)
 * @param {Array} fields  [[列名, 值], ...]
 * @returns {string}
 */
function buildWhereFromFields(fields) {
  var clauses = [];
  for (var i = 0; i < fields.length; i++) {
    var col = fields[i][0];
    var val = fields[i][1];
    if (val === null || typeof val === "undefined" || val === "") {
      continue;
    }
    val = String(val);
    if (col === "VALUE") {
      // value 同时搜索基表与所有语言译文(L_MAXMESSAGES 任意 LANGCODE)
      clauses.push("(" + buildFieldCondition("MAXMESSAGES.VALUE", val)
        + " OR EXISTS (SELECT 1 FROM L_MAXMESSAGES LX WHERE LX.OWNERID = MAXMESSAGES.MAXMESSAGESID AND "
        + buildFieldCondition("LX.VALUE", val) + "))");
    } else {
      clauses.push(buildFieldCondition(col, val));
    }
  }
  return clauses.join(" and ");
}

/**
 * 单个字段搜索条件
 * @param {string} col
 * @param {string} val
 * @returns {string}
 */
function buildFieldCondition(col, val) {
  if (val.charAt(0) === "=") {
    return "UPPER(" + col + ") = UPPER('" + escapeSql(val.substring(1)) + "')";
  }
  if (val.indexOf("%") >= 0 || val.indexOf("_") >= 0) {
    return "UPPER(" + col + ") LIKE UPPER('" + escapeSql(val) + "')";
  }
  return "UPPER(" + col + ") LIKE UPPER('%" + escapeSql(val) + "%')";
}

function escapeSql(str) {
  if (!str) {
    return "";
  }
  return String(str).replace(/'/g, "''");
}

// ---------------------------------------------------------------------------
// 动态语言 / Mbo 取值
// ---------------------------------------------------------------------------

/**
 * 查询启用语言代码: 优先 MXServer.getLanguageList(), 失败时回退 LANGUAGE 表 ENABLED=1
 * @returns {Array<string>} 大写语言代码, 如 ["EN","ZH","JA"]
 */
function getEnabledLangcodes() {
  // 用真值判断而不是 !== null: 避免缓存变量为 undefined 时直接返回 undefined
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
      langSet = mxserver.getMboSet("LANGUAGE", userInfo);
      langSet.setFlag(MboConstants.DISCARDABLE, true);
      langSet.setWhere("ENABLED = 1");
      langSet.reset();
      var count = langSet.count();
      for (var j = 0; j < count; j++) {
        var langMbo = langSet.getMbo(j);
        if (!langMbo) {
          continue;
        }
        var langCode = String(langMbo.getString("MAXLANGCODE") || "").toUpperCase();
        if (langCode !== "" && list.indexOf(langCode) < 0) {
          list.push(langCode);
        }
      }
    } catch (e) {
      logger.warn("[" + scriptName + "] 查询启用语言失败", e);
    } finally {
      _close(langSet);
    }
  }

  // 当前请求语言即使未启用也保留, 保证 value_<lang> 字段存在
  var cur = getLang();
  if (cur !== "" && list.indexOf(cur) < 0) {
    list.push(cur);
  }

  // 兜底: 至少保证返回数组, 并包含基语言
  if (list.length === 0) {
    var baseLang = getBaseLang();
    list.push(baseLang !== "" ? baseLang : "EN");
  }

  _enabledLangcodesCache = list;
  logger.info("[" + scriptName + "] langcodes=" + list.join(","));
  return list;
}

/**
 * 系统基语言(基表字段值所在语言)
 * @returns {string}
 */
function getBaseLang() {
  try {
    var lang = mxserver.getBaseLang();
    return lang === null ? "" : String(lang).toUpperCase();
  } catch (ignored) {
    return "";
  }
}

/**
 * 取 Mbo 多语言字段指定语言的值(无译文返回 null)
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} attr
 * @param {string} lang
 * @returns {string|null}
 */
function getMlString(mbo, attr, lang) {
  if (!lang) {
    return null;
  }
  try {
    var v = mbo.getString(attr, String(lang).toUpperCase());
    return isEmptyMlValue(v) ? null : v;
  } catch (ignored) {
    return null;
  }
}

/**
 * 取 Mbo 字段值(按指定语言, 无译文时回退当前语言/基表)
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} attr
 * @param {string} lang
 * @returns {string|null}
 */
function getLangString(mbo, attr, lang) {
  var v = getMlString(mbo, attr, lang);
  if (v !== null) {
    return v;
  }
  return mboStr(mbo, attr);
}

/**
 * 取 Mbo 字段字符串值
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} attr
 * @returns {string|null}
 */
function mboStr(mbo, attr) {
  try {
    var v = mbo.getString(attr);
    return isEmptyMlValue(v) ? null : v;
  } catch (ignored) {
    return null;
  }
}

/**
 * 取 Mbo 长整型字段(避免 getString 的千分位格式化, 如 750,247)
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} attr
 * @returns {string|null}
 */
function mboLongStr(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : String(mbo.getLong(attr));
  } catch (ignored) {
    return null;
  }
}

/**
 * YORN 的 Y/N 转成与表列一致的 1/0
 * @param {string} value
 * @returns {string|null}
 */
function yornToFlag(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (String(value).toUpperCase() === "Y") {
    return "1";
  }
  if (String(value).toUpperCase() === "N") {
    return "0";
  }
  return value;
}

/**
 * 创建 MAXMESSAGES 查询 MboSet
 * DISCARDABLE: 取消 MboSet 查询最多 5000 条的限制
 * @param {Object} config
 * @param {string} where
 * @returns {psdi.mbo.MboSet}
 */
function createMessageSet(config, where) {
  var set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
  set.setFlag(MboConstants.DISCARDABLE, true);
  if (where !== null && where !== undefined && String(where) !== "") {
    set.setWhere(String(where));
  }
  set.setOrderBy("MSGGROUP, MSGKEY");
  set.reset();
  return set;
}

/**
 * 取 OPTIONS 位掩码
 * @param {psdi.mbo.Mbo} mbo
 * @returns {number}
 */
function getOptionsMask(mbo) {
  try {
    var mask = mbo.getInt("OPTIONS");
    return isNaN(mask) ? 0 : mask;
  } catch (ignored) {
    return 0;
  }
}

/**
 * 位掩码 → options 数组
 * @param {number} mask
 * @returns {Array<string>}
 */
function optionsFromMask(mask) {
  var optionsArr = [];
  if (mask & 1) { optionsArr.push("close"); }
  if (mask & 2) { optionsArr.push("ok"); }
  if (mask & 4) { optionsArr.push("cancel"); }
  if (mask & 8) { optionsArr.push("yes"); }
  if (mask & 16) { optionsArr.push("no"); }
  return optionsArr;
}

/**
 * 查询消息(分页/不分页均走 MboSet)
 * @param {Object} config
 * @param {string} where
 * @param {Object|null} page {pageNum, pageSize}
 * @returns {Object} { messages, total }
 */
function queryMessagesByMbo(config, where, page) {
  var set = null;
  var messages = [];
  var total = 0;
  try {
    set = createMessageSet(config, where);
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
        messages.push(buildMessageObjectFromMbo(mbo, config));
        if (limit > 0 && messages.length >= limit) {
          break;
        }
      }
      index++;
      mbo = set.moveNext();
    }
    if (!page) {
      total = messages.length;
    }
  } finally {
    _close(set);
  }
  return { messages: messages, total: total };
}

/**
 * 查询单条消息
 * @param {Object} config
 * @param {string} where
 * @returns {Object|null}
 */
function queryOneMessage(config, where) {
  var set = null;
  try {
    set = createMessageSet(config, where);
    var mbo = set.getMbo(0);
    return mbo === null ? null : buildMessageObjectFromMbo(mbo, config);
  } finally {
    _close(set);
  }
}

/**
 * Mbo → 消息对象(字段名/顺序与 messages_page_3.json 一致)
 * @param {psdi.mbo.Mbo} mbo
 * @param {Object} config
 * @returns {Object}
 */
function buildMessageObjectFromMbo(mbo, config) {
  var lang = getLang();
  var obj = {};
  obj.msgGroup = mboStr(mbo, "MSGGROUP");
  obj.msgKey = mboStr(mbo, "MSGKEY");
  obj.value = getLangString(mbo, "VALUE", lang);
  obj.MAXMESSAGESID = mboLongStr(mbo, "MAXMESSAGESID");

  if (config && config._allLangcode) {
    // 多语言统一放 sks:langdata({字段:{语言:值}}), 不再平铺 value_<lang>
    var langData = buildLangDataFromMbo(mbo);
    if (langData !== null) {
      obj["sks:langdata"] = langData;
    }
  }

  obj.displayMethod = mboStr(mbo, "DISPLAYMETHOD");
  var mask = getOptionsMask(mbo);
  obj.options = optionsFromMask(mask);
  obj["sks:options"] = mask;
  obj.prefix = yornToFlag(mboStr(mbo, "PREFIX"));

  var msgId = mboStr(mbo, "MSGID");
  if (msgId !== null && msgId.length > 0) {
    obj.msgIdPrefix = msgId.substring(0, Math.min(5, msgId.length));
    obj.msgIdSuffix = msgId.substring(msgId.length - 1);
  } else {
    obj.msgIdPrefix = null;
    obj.msgIdSuffix = null;
  }

  if (config && config._includeExtra) {
    for (var j = 0; j < EXTRA_FIELDS.length; j++) {
      var extraKey = EXTRA_FIELDS[j][0];
      var attr = EXTRA_FIELDS[j][1];
      var val = (attr === "TITLE" || attr === "MSGID")
        ? mboStr(mbo, attr)
        : getLangString(mbo, attr, lang);
      if (val !== null && val !== "") {
        obj[extraKey] = val;
      }
    }
  }
  return obj;
}

/**
 * 按新模式汇总多语言字段: { 字段: { 语言: 值 } }
 * 仅包含实际有值的语言
 * @param {psdi.mbo.Mbo} mbo
 * @returns {Object|null}
 */
function buildLangDataFromMbo(mbo) {
  var langcodes = getEnabledLangcodes() || [];
  var langData = {};
  var hasAny = false;
  for (var i = 0; i < ML_FIELD_LIST.length; i++) {
    var attr = ML_FIELD_LIST[i];
    var vals = {};
    var count = 0;
    for (var j = 0; j < langcodes.length; j++) {
      var code = langcodes[j];
      var v = getMlString(mbo, attr, code);
      if (v !== null) {
        vals[code] = v;
        count++;
      }
    }
    if (count > 0) {
      langData[attr] = vals;
      hasAny = true;
    }
  }
  return hasAny ? langData : null;
}

/**
 * 多语言值是否为空(含 MBO 的 ~null~ 占位)
 * @param {*} v
 * @returns {boolean}
 */
function isEmptyMlValue(v) {
  return v === null || typeof v === "undefined" || String(v) === "" || String(v) === "~null~";
}

/**
 * 查询列表(支持分页)
 * @param {Object} config
 * @returns {Object}
 */
function doQuery(config) {
  var where = resolveWhere(config);
  var pageNum = toInt(bodyOrParam(config, ["pageNum", "page"]), 0);
  var pageSize = toInt(bodyOrParam(config, ["pageSize"]), 0);
  var paginated = pageNum > 0 && pageSize > 0;
  var page = paginated ? { pageNum: pageNum, pageSize: pageSize } : null;

  logger.info("[" + scriptName + "] query where=" + where + ", paginated=" + paginated);

  var rows = queryMessagesByMbo(config, where, page);
  var messages = rows.messages;
  var total = rows.total;

  var result = { messages: messages, total: total };
  if (paginated) {
    result.pageNum = pageNum;
    result.pageSize = pageSize;
  }
  logger.info("[" + scriptName + "] query 完成, 共 " + messages.length + " 条, total=" + total);
  return result;
}

/**
 * 查询单条消息详情
 * @param {Object} config
 * @returns {Object|null}
 */
function doDetail(config) {
  var id = bodyOrParam(config, ["maxmessagesid", "MAXMESSAGESID", "id"]);
  var where = null;
  if (id !== null) {
    if (!/^\d+$/.test(String(id))) {
      throw new MXApplicationException("#", "maxmessagesid 必须是数字");
    }
    where = "MAXMESSAGESID = " + String(id);
  } else {
    var msgGroup = bodyOrParam(config, ["msggroup", "msgGroup", "MSGGROUP"]);
    var msgKey = bodyOrParam(config, ["msgkey", "msgKey", "MSGKEY"]);
    if (msgGroup === null || msgKey === null) {
      throw new MXApplicationException("#", "请提供 maxmessagesid 或 msggroup+msgkey");
    }
    var sqlf = new SqlFormat("(MSGGROUP = :1 and MSGKEY = :2)");
    sqlf.setObject(1, OBJECT_NAME, "MSGGROUP", String(msgGroup));
    sqlf.setObject(2, OBJECT_NAME, "MSGKEY", String(msgKey));
    where = sqlf.format();
  }

  var row = queryOneMessage(config, where);
  logger.info("[" + scriptName + "] detail where=" + where + ", found=" + (row !== null));
  return row;
}

/**
 * 导出全部消息(不分页)
 * @param {Object} config
 * @returns {Object} { messages: [...] }
 */
function doExport(config) {
  var where = resolveWhere(config);
  var rows = queryMessagesByMbo(config, where, null);
  var messages = rows.messages;
  logger.info("[" + scriptName + "] export 完成, 共 " + messages.length + " 条");
  return { messages: messages };
}

// ---------------------------------------------------------------------------
// 导入
// ---------------------------------------------------------------------------

/**
 * 导入消息数组, 按 MSGGROUP+MSGKEY 新增/更新/删除
 * @param {Object} config
 * @param {Array<Object>} rows
 * @returns {Object}
 */
function doImport(config) {
  var rows = getMessagesFromBody(config._body);
  if (!rows) {
    throw new MXApplicationException("#", "请求体必须包含 messages 数组");
  }

  var results = importApp(config, rows);
  var added = 0, updated = 0, deleted = 0, failed = 0;
  for (var i = 0; i < results.length; i++) {
    if (results[i]._status === "failed") {
      failed++;
    } else if (results[i]._operation === "added") {
      added++;
    } else if (results[i]._operation === "updated") {
      updated++;
    } else if (results[i]._operation === "deleted") {
      deleted++;
    }
  }

  var result = {
    total: rows.length,
    added: added,
    updated: updated,
    deleted: deleted,
    failed: failed,
    results: results,
    "sks:successSumTotal": added + updated + deleted,
    "sks:failSumTotal": failed
  };
  logger.info("[" + scriptName + "] import 完成: total=" + result.total + ", added=" + added
    + ", updated=" + updated + ", deleted=" + deleted + ", failed=" + failed);
  return result;
}

/**
 * @param {Object} body
 * @returns {Array<Object>|null}
 */
function getMessagesFromBody(body) {
  if (!body) {
    return null;
  }
  if (Array.isArray(body)) {
    return body;
  }
  if (Array.isArray(body.messages)) {
    return body.messages;
  }
  if (Array.isArray(body.maxmessages)) {
    return body.maxmessages;
  }
  return null;
}

/**
 * @param {Object} config
 * @param {Array<Object>} rows
 * @returns {Array<Object>}
 */
function importApp(config, rows) {
  var results = [];
  for (var i = 0; i < rows.length; i++) {
    results.push(changeMbo(config, rows[i]));
  }
  return results;
}

/**
 * 新增/更新/删除单条消息
 * @param {Object} config
 * @param {Object} data
 * @returns {Object}
 */
function changeMbo(config, data) {
  var out = {};
  var cacheUseError = newCacheUseError();
  cacheUseError.ind1 = " objectName=" + OBJECT_NAME;

  if (!data || typeof data !== "object") {
    out.msgGroup = "";
    out.msgKey = "";
    out._status = "failed";
    out._message = "数据为空";
    cacheUseError.ind3 = out._message;
    out["sks:ref"] = "";
    out["sks:currentCacheUseError"] = cacheUseError;
    return out;
  }

  var msgGroup = pick(data, "msgGroup", "MSGGROUP");
  var msgKey = pick(data, "msgKey", "MSGKEY");
  out.msgGroup = msgGroup === null ? "" : String(msgGroup);
  out.msgKey = msgKey === null ? "" : String(msgKey);
  out._status = "success";
  out["sks:objectName"] = OBJECT_NAME;

  if (msgGroup === null || msgKey === null || String(msgGroup) === "" || String(msgKey) === "") {
    out._status = "failed";
    out._message = "缺少唯一键字段 MSGGROUP / MSGKEY";
    cacheUseError.ind3 = out._message;
    out["sks:ref"] = out.msgGroup + "/" + out.msgKey;
    out["sks:currentCacheUseError"] = cacheUseError;
    return out;
  }
  out["sks:ref"] = String(msgGroup) + "/" + String(msgKey);

  var set = null;
  var mbo = null;
  try {
    set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
    if (config.dmDeploySet === true) {
      try { set.setDMDeploySet(true); } catch (ignored) { }
    }
    var sqlf = new SqlFormat("msggroup = :1 and msgkey = :2");
    sqlf.setObject(1, OBJECT_NAME, "MSGGROUP", String(msgGroup));
    sqlf.setObject(2, OBJECT_NAME, "MSGKEY", String(msgKey));
    set.setWhere(sqlf.format());
    set.reset();

    if (isDelete(data)) {
      set.deleteAll();
      set.save();
      out._operation = "deleted";
    } else {
      var isNew = set.isEmpty();
      mbo = isNew ? set.add() : set.getMbo(0);
      out._operation = isNew ? "added" : "updated";
      applyMessageFields(config, mbo, data, isNew, cacheUseError);
      set.save();
      try {
        out["sks:uniqueID"] = String(mbo.getUniqueIDValue());
        out["sks:uniqueIDName"] = String(mbo.getUniqueIDName());
      } catch (ignored) { }
      try {
        out.MAXMESSAGESID = mbo.isNull("MAXMESSAGESID") ? null : String(mbo.getLong("MAXMESSAGESID"));
      } catch (ignored) { }
    }
    out._apiAction = config._apiAction;
  } catch (e) {
    out._status = "failed";
    out._message = e.message || String(e);
    cacheUseError.ind3 = out._message;
    out["sks:currentCacheUseError"] = cacheUseError;
    logger.error("[" + scriptName + "] changeMbo " + out["sks:ref"] + " 失败", e);
    try { if (set) { set.rollback(); } } catch (ignored) { }
    if (config._errorAssert === true) {
      throw e;
    }
  } finally {
    _close(set);
  }
  return out;
}

/**
 * @param {Object} data
 * @returns {boolean}
 */
function isDelete(data) {
  return data._delete === true || data.delete === true
    || data._delete === "true" || data.delete === "true";
}

/**
 * 写入消息字段(按 Mbo 类型自动转换)
 * @param {Object} config
 * @param {psdi.mbo.Mbo} mbo
 * @param {Object} data
 * @param {boolean} isNew
 * @param {Object} cacheUseError
 */
function applyMessageFields(config, mbo, data, isNew, cacheUseError) {
  // 仅 _allLangcode=true 时才按 sks:langdata 设置多语言; 否则只写当前语言的 VALUE
  var useLangData = !!(config && config._allLangcode);
  var langData = useLangData ? data["sks:langdata"] : null;

  setMboValue(mbo, "MSGGROUP", pick(data, "msgGroup", "MSGGROUP"), cacheUseError);
  setMboValue(mbo, "MSGKEY", pick(data, "msgKey", "MSGKEY"), cacheUseError);

  var value = pick(data, "value", "VALUE");
  if (isNew && (value === null || String(value) === "")) {
    throw new MXApplicationException("#", "value 不能为空");
  }
  if (value !== null) {
    if (!(langData && langData.hasOwnProperty("VALUE"))) {
      setMboValue(mbo, "VALUE", value, cacheUseError);
    }
  }

  for (var i = 0; i < IMPORT_FIELDS.length; i++) {
    var key = IMPORT_FIELDS[i][0];
    var attr = IMPORT_FIELDS[i][1];
    if (key === "msgGroup" || key === "msgKey") {
      continue;
    }
    if (langData && langData.hasOwnProperty(attr)) {
      continue;
    }
    var v = pick(data, key, attr);
    if (v !== null) {
      setMboValue(mbo, attr, v, cacheUseError);
    }
  }

  // MSGID 优先; 没有 MSGID 时用 msgIdPrefix/msgIdSuffix
  var msgId = pick(data, "msgId", "MSGID");
  if (msgId !== null) {
    setMboValue(mbo, "MSGID", msgId, cacheUseError);
  } else {
    var msgIdPrefix = pick(data, "msgIdPrefix", "MSGIDPREFIX");
    var msgIdSuffix = pick(data, "msgIdSuffix", "MSGIDSUFFIX");
    // 新增时按旧导入逻辑(SKS.AUTOSCRIPT.LIBRARY Message)补默认前缀/后缀
    if (isNew && msgIdPrefix === null) {
      msgIdPrefix = "BMXZZ";
    }
    if (isNew && msgIdSuffix === null) {
      msgIdSuffix = "E";
    }
    if (msgIdPrefix !== null) {
      setMboValue(mbo, "MSGIDPREFIX", msgIdPrefix, cacheUseError);
    }
    if (msgIdSuffix !== null) {
      setMboValue(mbo, "MSGIDSUFFIX", msgIdSuffix, cacheUseError);
    }
  }

  // 列表模式平铺的 value_<lang>(value_zh / value_en / value_fr ...): 动态按语言写入译文
  if (useLangData && !(langData && langData.hasOwnProperty("VALUE"))) {
    var langcodes = getEnabledLangcodes();
    var curLang = getLang();
    var baseLang = getBaseLang();
    for (var li = 0; li < langcodes.length; li++) {
      var code = langcodes[li];
      // 当前语言已由 value 写入, 基语言写基表字段, 均跳过
      if (code === curLang || code === baseLang) {
        continue;
      }
      var langValue = pick(data, "value_" + code.toLowerCase(), "VALUE_" + code);
      if (langValue === null) {
        continue;
      }
      try {
        mbo.setMLValue("VALUE", code, String(langValue), 11);
      } catch (e) {
        cacheUseError.ind2 = " mlAttrName=VALUE@" + code;
        cacheUseError.ind3 = e.message || String(e);
        logger.error("[" + scriptName + "] setMLValue VALUE@" + code + " 失败", e);
      }
    }
  }

  applyOptions(mbo, data, isNew, cacheUseError);
  if (useLangData) {
    applyLangData(mbo, data, cacheUseError);
  }
}

/**
 * 设置 OPTIONS 对应的按钮布尔字段
 * @param {psdi.mbo.Mbo} mbo
 * @param {Object} data
 * @param {boolean} isNew
 * @param {Object} cacheUseError
 */
function applyOptions(mbo, data, isNew, cacheUseError) {
  var opt = resolveOptions(data);
  if (!opt.has && !isNew) {
    return;
  }
  var list = opt.list;
  if (!opt.has && isNew) {
    // 新增时默认 ok(与 SKS.AUTOSCRIPT.LIBRARY 的 Message 默认值一致)
    list = ["ok"];
  }
  for (var i = 0; i < OPTION_ATTRS.length; i++) {
    setMboValue(mbo, OPTION_ATTRS[i][1], false, cacheUseError);
  }
  for (var j = 0; j < list.length; j++) {
    for (var k = 0; k < OPTION_ATTRS.length; k++) {
      if (OPTION_ATTRS[k][0] === String(list[j]).toLowerCase()) {
        setMboValue(mbo, OPTION_ATTRS[k][1], true, cacheUseError);
        break;
      }
    }
  }
}

/**
 * 解析 options 数组或 sks:options 位掩码
 * @param {Object} data
 * @returns {Object} { has, list }
 */
function resolveOptions(data) {
  var result = { has: false, list: [] };
  if (data && data.options !== undefined && data.options !== null) {
    result.has = true;
    if (Array.isArray(data.options)) {
      for (var i = 0; i < data.options.length; i++) {
        result.list.push(String(data.options[i]).toLowerCase());
      }
    }
  }
  if (!result.has && data && data["sks:options"] !== undefined && data["sks:options"] !== null) {
    result.has = true;
    var mask = parseInt(String(data["sks:options"]), 10);
    if (!isNaN(mask)) {
      if (mask & 1) { result.list.push("close"); }
      if (mask & 2) { result.list.push("ok"); }
      if (mask & 4) { result.list.push("cancel"); }
      if (mask & 8) { result.list.push("yes"); }
      if (mask & 16) { result.list.push("no"); }
    }
  }
  return result;
}

/**
 * 设置多语言字段: data["sks:langdata"] = { 属性: { 语言: 值 } }
 * accessModifier 11 = NOVALIDATION(1) | NOACCESSCHECK(2) | NOACTION(8)
 * @param {psdi.mbo.Mbo} mbo
 * @param {Object} data
 * @param {Object} cacheUseError
 */
function applyLangData(mbo, data, cacheUseError) {
  var langData = data["sks:langdata"];
  if (!langData || typeof langData !== "object") {
    return;
  }
  for (var field in langData) {
    if (!langData.hasOwnProperty(field)) {
      continue;
    }
    var vals = langData[field];
    if (!vals || typeof vals !== "object") {
      continue;
    }
    for (var lang in vals) {
      if (!vals.hasOwnProperty(lang)) {
        continue;
      }
      var v = vals[lang];
      // ~null~ 是多语言字段在基表的占位值
      if (v === undefined || v === null || String(v) === "~null~") {
        continue;
      }
      try {
        mbo.setMLValue(field, String(lang).toUpperCase(), String(v), 11);
      } catch (e) {
        cacheUseError.ind2 = " mlAttrName=" + field + "@" + lang;
        cacheUseError.ind3 = e.message || String(e);
        logger.error("[" + scriptName + "] applyLangData setMLValue " + field + "@" + lang + " 失败", e);
      }
    }
  }
}

/**
 * 按 Mbo 字段类型设值(失败只记录, 由 save 决定整行成败)
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} attr
 * @param {*} value
 * @param {Object} cacheUseError
 */
function setMboValue(mbo, attr, value, cacheUseError) {
  try {
    if (sksCommonsUtils) {
      sksCommonsUtils.autoMboSetValue(svc, mbo, attr, value, MboConstants.NOACCESSCHECK);
    } else {
      mbo.setValue(attr, value, MboConstants.NOACCESSCHECK);
    }
  } catch (e) {
    if (cacheUseError) {
      cacheUseError.ind2 = " attrName=" + attr;
      cacheUseError.ind3 = e.message || String(e);
    }
    logger.error("[" + scriptName + "] setValue " + attr + " 失败", e);
  }
}

function newCacheUseError() {
  return { ind1: "", ind2: "", ind3: "", ind4: "" };
}

// ---------------------------------------------------------------------------
// 公共工具
// ---------------------------------------------------------------------------

/**
 * 调试信息
 * @param {java.lang.String} msg
 * @param {boolean} noln            是否不换行
 */
function debugPrint(msg, noln) {
  logger.info("\x1b[35;40m[" + scriptName + "] " + msg + "\x1b[0m")
  debugMsg.append(msg);
  if (typeof noln === 'undefined' && !noln) {
    debugMsg.append("\n");
  }
}

/**
 * 关闭（有close方法的对象）
 */
function _closeOnly(f) {
  try {
    if (f) {
      f.close()
    }
  } catch (ignored) { }
}

/**
 * 关闭MboSet
 */
function _close(set) {
  try {
    if (set) {
      try { set.close(); } catch (ignored) { }
      try { set.cleanup(); } catch (ignored) { }
    }
  } catch (ignored) { }
}

/**
 * 接口脚本
    com.ibm.tivoli.maximo.oslc.provider.ScriptRouteHandler; 类中
 
{
  "owneremail": "",
  "createdbyid": "",
  "description": "测试接口脚本",
  "sks:autoscript:suggested: "建议命名: <TABLE_NAME>API",
  "autoscript": "SKS_TMPL_APISCRIPT",
  "launchPoints": [],
  "createdbyemail": "",
  "interface": 0,
  "scriptlanguage": "JavaScript",
  "langcode": "ZH",
  "createdby": "MAXZHCN",
  "siteid": "",
  "action": "",
  "createdbyphone": "",
  "scheduledstatus": "",
  "owner": "MAXZHCN",
  "variables": [],
  "comments": "",
  "ownername": "",
  "changeby": "MAXZHCN",
  "autoscriptid": 253,
  "active": 1,
  "changedate": "2026-06-07T16:24:46+08:00",
  "ownerid": "",
  "version": "1.0.36",
  "orgid": "",
  "statusdate": "2026-05-30T06:50:14+08:00",
  "hasld": 0,
  "ibm_packagepath": "cn.shoukaiseki.test",
  "loglevel": "ERROR",
  "ownerphone": "",
  "category": "",
  "userdefined": 1,
  "status": "Draft",
  "createdbyname": ""
}
 */
