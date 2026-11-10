// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable no-undef */
// @ts-nocheck
// 安全组(MAXGROUP 及子表授权) 查询 / 导出 / 导入接口
//
// 调用方式:
//   GET/POST /maximo/api/script/SKS_MIGRATEAPI_SECURGROUP?_action=query
//        body: { groupname, description, where, pageNum, pageSize }
//        → { maxgroupList:[ 主记录行(含 appcount/sitecount/usercount) ], total, pageNum, pageSize }
//   GET/POST ...?_action=detail&groupname=xxx  (或 body: { groupnames:[...] })
//        → { maxgroupList:[ 完整对象(含 _skschild_ 子表数组) ], conditionList:[ 关联条件 ] }
//   GET/POST ...?_action=export[&where=...|&groupname=...]  (不分页)
//        body: { groupnames:[...], appnames:[...], ignoreMain:true, _ignoreList:["conditionList"], _apiMode:"appauth" }
//        → { maxgroupList:[ 完整对象(含 _skschild_ 子表数组) ], conditionList:[ 关联条件 ] }
//        _skschild_APPLICATIONAUTH 按 APP 聚合: [ { APP, sks:appdescription, APPLICATIONAUTH:[ 权限行 ] } ]
//        appnames 非空时仅保留 APPLICATIONAUTH/SECURITYRESTRICT/CTRLGROUP 中这些 APP 的行
//        _apiMode=appauth 只导出应用级子表 APPLICATIONAUTH/SECURITYRESTRICT(CTRLGROUP 由应用信息迁移负责, 不导出);
//        ignoreMain=true 时每个对象带 _ignoreMain:true(导入不改主记录)
//        _ignoreList 中的根节点不输出(如 conditionList), 也支持 URL 参数 _ignoreList=conditionList
//   GET/POST ...?_action=apps&app=IBM  → { apps:[{APP,DESCRIPTION}], total }
//   POST ...?_action=import  body: { "maxgroupList": [ 完整对象... ], "conditionList": [ 关联条件... ],
//                                   "_ignoreList": ["conditionList"],
//                                   "_deleteNotExists": ["maxgroupList:_skschild_APPLICATIONAUTH:APPLICATIONAUTH"] }
//        主记录直接用 MboSet upsert(支持 _ignoreMain/_delete);
//        conditionList 先按 CONDITIONNUM 绝对值 upsert(_ignoreList 含 conditionList 时跳过);
//        APPLICATIONAUTH 兼容聚合/扁平两种格式; _deleteNotExists 命中时按 APP 删除目标中不存在于 JSON 的权限行
//        子表数组(带/不带 _skschild_ 前缀均可)按键匹配 upsert, 行内 _delete=true 删除该行
//        注意: 目标环境应用注册表中不存在的 APP, 新增其 APPLICATIONAUTH 行会被 Maximo 表域校验拒绝(该组导入失败)
//        → { total, added, updated, deleted, failed, results, sks:successSumTotal, sks:failSumTotal }
//   _langcode=ZH      设置会话语言
//   _debug=true       返回 debugMsg
//   _errorAssert=true 存在失败时抛出异常
//   dmDeploySet=true  导入时 MboSet.setDMDeploySet(true)(迁移模式)
//
// 完整对象结构(导出/导入一致):
//   {
//     GROUPNAME, DESCRIPTION, ...主记录字段..., MAXGROUPID(仅参考),
//     _ignoreMain: true,        // 可选: 不修改主记录本身(逻辑在 SKS_MIGRATE_MAXGROUP)
//     _delete: true,            // 可选: 删除主记录
//     _skschild_SITEAUTH: [ {SITEID, ORGID, ...}, ... ],
//     _skschild_LOCAUTH: [...], _skschild_APPLICATIONAUTH: [...], _skschild_GLAUTH: [...],
//     _skschild_GROUPUSER: [...], _skschild_GRPREASSIGNAUTH: [...], _skschild_LIMITTOLERANCE: [...],
//     _skschild_SECURITYRESTRICT: [...], _skschild_CTRLGROUP: [...], _skschild_COLLECTIONAUTH: [...],
//     _skschild_DASHBOARDAUTH: [...], _skschild_REPFACAUTH: [ ... ],
//     子表行内可加 _delete: true 删除该行
//   }
//   子表统一以 _skschild_ 开头, 避免与主表字段同名(导入兼容无前缀旧键)
//   根级条件: 收集子表 CONDITIONNUM 去重后输出 conditionList(CONDITION 表行)

/** @type {psdi.util.MXApplicationException} */
var MXApplicationException = Java.type("psdi.util.MXApplicationException");
/** @type {psdi.server.MXServer} */
var MXServer = Java.type("psdi.server.MXServer");
/** @type {psdi.mbo.SqlFormat} */
var SqlFormat = Java.type("psdi.mbo.SqlFormat");

var scriptName = service.getScriptName();
var svc = service;
var mxserver = MXServer.getMXServer();

/** @type {psdi.util.logging.MXLogger} */
var loggerMX = Java.type("psdi.util.logging.MXLoggerFactory").getLogger("maximo.script." + scriptName);
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true });
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

var OBJECT_NAME = "MAXGROUP";
var GROUPNAME_PATTERN = /^[A-Za-z0-9_\-]+$/;
// 子表统一前缀: 返回 JSON 中子级键 = _skschild_ + 子对象名, 避免与主表字段同名
var CHILD_PREFIX = "_skschild_";
// 条件表字段(关联 CONDITIONNUM 输出到根级 conditionList; BOOLEANNOCACHING/EXPORCLASS 为非持久虚拟字段)
var CONDITION_COLUMNS = ["CONDITIONNUM", "TYPE", "EXPRESSION", "CLASSNAME", "DESCRIPTION", "NOCACHING"];
// 主记录导入时跳过的字段(自动编号/行版本/语言由目标环境处理)
var MAIN_SKIP_FIELDS = ["ROWSTAMP", "LANGCODE", "MAXGROUPID"];

// 子表配置: name=子对象名(也是 JSON 键), keys=匹配键(不含 GROUPNAME)
var REL_CONFIG = [
  { name: "SITEAUTH", keys: ["SITEID"] },
  { name: "LOCAUTH", keys: ["SITEID", "LOCATION"] },
  { name: "LABORAUTH", keys: ["ORGID", "LABORCODE"] },
  { name: "APPLICATIONAUTH", keys: ["APP", "OPTIONNAME"] },
  { name: "GLAUTH", keys: ["ORGID", "GLACCOUNTFIELD"] },
  { name: "GROUPUSER", keys: ["USERID"] },
  { name: "GRPREASSIGNAUTH", keys: ["USERID"] },
  { name: "LIMITTOLERANCE", keys: ["ORGID"] },
  { name: "SECURITYRESTRICT", keys: ["APP", "OBJECTNAME", "ATTRIBUTENAME", "TYPE"] },
  { name: "CTRLGROUP", keys: ["APP", "OPTIONNAME"] },
  { name: "COLLECTIONAUTH", keys: ["COLLECTIONNUM"] },
  { name: "DASHBOARDAUTH", keys: ["VIEWMANAGERID"] },
  { name: "REPFACAUTH", keys: ["SITEID", "REPAIRFACILITY"] }
];

var MAIN_COLUMNS = ["GROUPNAME", "DESCRIPTION", "INDEPENDENT", "AUTHALLSITES", "AUTHALLSTOREROOMS",
  "AUTHALLREPFACS", "AUTHLABORALL", "AUTHLABORCREW", "AUTHLABORSELF", "AUTHLABORSUPER",
  "AUTHPERSONGROUP", "DFLTAPP", "LANGCODE", "MAXGROUPID", "SCTEMPLATEID", "SIDENAV",
  "WORKCENTER", "MASISSUER", "PASSWORDDURATION", "PASSWORDWARNING", "MAXSCHEDREPORT",
  "REPORTSTOPLIMIT", "NULLREPFAC", "ADHOCCREATELIMIT", "AUTHALLGLS", "HASLD"];

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
    var errorData = { status: "error", message: errorMessage , errorMessageTrace: errorMessageTrace };
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
  if (action === "export" || action === "exportApp") {
    return doExport(config);
  }
  if (action === "apps") {
    return doApps(config);
  }
  if (action === "import" || action === "importApp") {
    return doImport(config);
  }
  throw new MXApplicationException("#", "未知 _action: " + action + " (可用: query/detail/export/apps/import)");
}

function buildConfig(action) {
  return {
    _service: svc,
    _userInfo: userInfo,
    _langcode: _langcode,
    _action: action,
    _body: parseRequestBody(),
    _errorAssert: qparam("_errorAssert") === "true",
    _debug: paramDebug,
    dmDeploySet: (qparam("dmDeploySet") === "true" || qparam("_dmDeploySet") === "true")
  };
}

function getAction() {
  var a = qparam("_action");
  return a === null ? "query" : a;
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
    if (parsed === null || typeof parsed === "undefined") {
      return {};
    }
    if (Array.isArray(parsed)) {
      return { maxgroupList: parsed };
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

/**
 * 读取 _ignoreList: 根节点忽略清单
 * 支持 body._ignoreList=["conditionList"] 或 URL 参数 _ignoreList=conditionList(逗号分隔)
 * @returns {Object} 键为需要忽略的根节点名
 */
function resolveIgnoreList(config) {
  var raw = bodyOrParam(config, ["_ignoreList", "ignoreList", "ignorelist"]);
  var map = {};
  if (raw instanceof Array) {
    for (var i = 0; i < raw.length; i++) {
      var item = String(raw[i] || "").trim();
      if (item !== "") {
        map[item] = true;
      }
    }
  } else if (raw !== null) {
    var parts = String(raw).split(",");
    for (var j = 0; j < parts.length; j++) {
      var name = String(parts[j] || "").trim();
      if (name !== "") {
        map[name] = true;
      }
    }
  }
  return map;
}

/** 按 _ignoreList 删除返回 JSON 的根级节点(如 conditionList) */
function dropIgnoredRoots(payload, config) {
  var ignored = resolveIgnoreList(config);
  for (var key in ignored) {
    if (Object.prototype.hasOwnProperty.call(ignored, key) &&
        Object.prototype.hasOwnProperty.call(payload, key)) {
      delete payload[key];
    }
  }
  return payload;
}

/**
 * 读取 _deleteNotExists: 不存在则删除的集合路径清单
 * 元素格式 根节点:子级键:数组键, 如 maxgroupList:_skschild_APPLICATIONAUTH:APPLICATIONAUTH
 * 命中指定子表时返回 true
 */
function isDeleteNotExists(config, relName) {
  var raw = bodyOrParam(config, ["_deleteNotExists", "deleteNotExists"]);
  var list = [];
  if (raw instanceof Array) {
    list = raw;
  } else if (raw !== null) {
    list = String(raw).split(",");
  }
  var token = CHILD_PREFIX + relName;
  for (var i = 0; i < list.length; i++) {
    var path = String(list[i] || "").trim();
    if (path === "") continue;
    if (path === relName || path.indexOf(token) >= 0) {
      return true;
    }
  }
  return false;
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

// ---------------------------------------------------------------------------
// 查询
// ---------------------------------------------------------------------------

function doQuery(config) {
  var where = resolveWhere(config);
  var pageNum = toInt(bodyOrParam(config, ["pageNum", "page"]), 0);
  var pageSize = toInt(bodyOrParam(config, ["pageSize", "limit"]), 0);
  var paginated = pageNum > 0 && pageSize > 0;

  var sql = "select " + MAIN_COLUMNS.join(",") +
    ", (select count(*) from applicationauth aa where aa.groupname = m.groupname) as appcount" +
    ", (select count(*) from siteauth sa where sa.groupname = m.groupname) as sitecount" +
    ", (select count(*) from groupuser gu where gu.groupname = m.groupname) as usercount" +
    " from maxgroup m where " + where + " order by groupname";
  var countSql = "select count(*) from maxgroup m where " + where;

  var conn = null;
  var rows = [];
  var total = 0;
  try {
    conn = getConnection(config);
    if (paginated) {
      total = countRows(conn, countSql);
      sql = sql + " offset " + ((pageNum - 1) * pageSize) + " rows fetch next " + pageSize + " rows only";
    } else {
      total = countRows(conn, countSql);
    }
    rows = queryRows(conn, sql);
    if (!paginated) {
      total = rows.length;
    }
  } finally {
    freeConnection(config, conn);
  }
  var result = { maxgroupList: rows, total: total };
  if (paginated) {
    result.pageNum = pageNum;
    result.pageSize = pageSize;
  }
  return result;
}

function resolveWhere(config) {
  var where = bodyOrParam(config, ["where"]);
  if (where !== null) {
    return validateWhere(String(where), config);
  }
  var conds = [];
  var groupname = bodyOrParam(config, ["groupname", "GROUPNAME"]);
  var description = bodyOrParam(config, ["description", "DESCRIPTION"]);
  if (groupname !== null) {
    conds.push("upper(groupname) like '%" + escapeSql(String(groupname).toUpperCase()) + "%'");
  }
  if (description !== null) {
    conds.push("upper(description) like '%" + escapeSql(String(description).toUpperCase()) + "%'");
  }
  return conds.length > 0 ? conds.join(" and ") : "1=1";
}

function validateWhere(where, config) {
  var set = null;
  try {
    set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
    set.setWhere(where);
    set.reset();
    var complete = set.getCompleteWhere();
    if (complete === null || complete === undefined || String(complete) === "") {
      return where;
    }
    return String(complete);
  } catch (e) {
    throw new MXApplicationException("#", "where 条件不合法: " + (e.message || e));
  } finally {
    if (set != null) {
      try { set.close(); } catch (ignored) { }
    }
  }
}

// ---------------------------------------------------------------------------
// 详情 / 导出
// ---------------------------------------------------------------------------

function doDetail(config) {
  var names = resolveGroupNames(config);
  if (names.length === 0) {
    var single = bodyOrParam(config, ["groupname", "GROUPNAME"]);
    if (single !== null) {
      names = [String(single).trim()];
    }
  }
  var conn = null;
  try {
    conn = getConnection(config);
    var groups = [];
    for (var i = 0; i < names.length; i++) {
      var g = buildGroupObject(conn, names[i]);
      if (g !== null) {
        attachSigDescriptions(conn, g);
        groups.push(g);
      }
    }
    return dropIgnoredRoots({ maxgroupList: groups, conditionList: collectConditions(conn, groups) }, config);
  } finally {
    freeConnection(config, conn);
  }
}

/**
 * 递归收集行内 CONDITIONNUM:
 * 兼容扁平子表行与 APPLICATIONAUTH 聚合格式({APP, APPLICATIONAUTH:[...]})
 */
function collectConditionNums(rows, seen, nums) {
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row || typeof row !== "object") continue;
    var num = row.CONDITIONNUM;
    if (num !== null && num !== undefined && String(num) !== "" && !seen[String(num)]) {
      seen[String(num)] = true;
      nums.push(String(num));
    }
    for (var key in row) {
      if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
      if (!(row[key] instanceof Array)) continue;
      if (key.indexOf(CHILD_PREFIX) === 0 || key === "APPLICATIONAUTH") {
        collectConditionNums(row[key], seen, nums);
      }
    }
  }
}

function collectConditions(conn, groups) {
  var seen = {};
  var nums = [];
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    if (!g) continue;
    for (var key in g) {
      if (!Object.prototype.hasOwnProperty.call(g, key)) continue;
      if (key.indexOf(CHILD_PREFIX) !== 0 || !(g[key] instanceof Array)) continue;
      collectConditionNums(g[key], seen, nums);
    }
  }
  if (nums.length === 0) {
    return [];
  }
  var inList = [];
  for (var k = 0; k < nums.length; k++) {
    inList.push("'" + escapeSql(nums[k]) + "'");
  }
  return queryRows(conn, "select " + CONDITION_COLUMNS.join(",") +
    " from condition where conditionnum in (" + inList.join(",") + ") order by conditionnum");
}

/**
 * detail 专用: 为 APPLICATIONAUTH 行附加虚拟字段
 *   sks:appdescription  应用中文名(L_MAXAPPS 当前语言, 回退 MAXAPPS 英文描述)
 *   sks:sigdescription  签名描述(L_SIGOPTION 当前语言, 回退 SIGOPTION 英文描述)
 * sks: 前缀键导入时被忽略, 不影响迁移; 表不存在(未启用多语言)时自动跳过
 */
function attachSigDescriptions(conn, group) {
  var childRows = group && (group[CHILD_PREFIX + "APPLICATIONAUTH"] || group.APPLICATIONAUTH);
  if (!(childRows instanceof Array) || childRows.length === 0) {
    return;
  }
  var items = [];
  var wrappers = [];
  for (var i = 0; i < childRows.length; i++) {
    var item = childRows[i];
    if (!item) continue;
    var nested = item.APPLICATIONAUTH || item.applicationauth;
    if (nested instanceof Array) {
      wrappers.push(item);
      for (var n = 0; n < nested.length; n++) {
        if (nested[n]) {
          items.push({ app: String(item.APP || ""), row: nested[n], nested: true });
        }
      }
    } else {
      items.push({ app: String(item.APP || ""), row: item, nested: false });
    }
  }
  var seen = {};
  var inList = [];
  for (var i2 = 0; i2 < items.length; i2++) {
    var app = items[i2].app;
    if (app && !seen[app]) {
      seen[app] = true;
      inList.push("'" + app.replace(/'/g, "''") + "'");
    }
  }
  if (inList.length === 0) {
    return;
  }
  var lang = String(_langcode || "EN").replace(/'/g, "''");
  var appMap = {};
  try {
    var appRows = queryRows(conn,
      "select a.app, a.description as en_desc, la.description as l_desc" +
      " from maxapps a left join l_maxapps la on la.ownerid = a.maxappsid and la.langcode = '" + lang + "'" +
      " where a.app in (" + inList.join(",") + ")");
    for (var m = 0; m < appRows.length; m++) {
      appMap[String(appRows[m].APP)] = appRows[m].L_DESC || appRows[m].EN_DESC || null;
    }
  } catch (e) {
    logger.warn("[" + scriptName + "] 应用描述查询失败, 跳过: " + (e.message || String(e)));
  }
  var sigMap = {};
  try {
    var sigRows = queryRows(conn,
      "select s.app, s.optionname, s.description as en_desc, ls.description as l_desc" +
      " from sigoption s left join l_sigoption ls on ls.ownerid = s.sigoptionid and ls.langcode = '" + lang + "'" +
      " where s.app in (" + inList.join(",") + ")");
    for (var j = 0; j < sigRows.length; j++) {
      sigMap[String(sigRows[j].APP) + "|" + String(sigRows[j].OPTIONNAME)] =
        sigRows[j].L_DESC || sigRows[j].EN_DESC || null;
    }
  } catch (e2) {
    logger.warn("[" + scriptName + "] 签名描述查询失败, 跳过: " + (e2.message || String(e2)));
  }
  // 聚合格式: APP 描述挂在应用包装行上
  for (var w = 0; w < wrappers.length; w++) {
    var wrapperApp = String(wrappers[w].APP || "");
    var wrapperDesc = appMap[wrapperApp];
    if (wrapperDesc) {
      wrappers[w]["sks:appdescription"] = wrapperDesc;
    }
  }
  for (var k = 0; k < items.length; k++) {
    var it = items[k];
    var row = it.row;
    var appKey = it.app;
    // 聚合格式的权限行不补 APP、不挂应用描述, 一律以包装行为准
    if (!it.nested) {
      if (!row.APP && appKey) {
        row.APP = appKey;
      }
      var appDesc = appMap[appKey];
      if (appDesc) {
        row["sks:appdescription"] = appDesc;
      }
    }
    var sigDesc = sigMap[appKey + "|" + String(row.OPTIONNAME)];
    if (sigDesc) {
      row["sks:sigdescription"] = sigDesc;
    }
  }
}

function doExport(config) {
  var names = resolveGroupNames(config);
  var appnames = resolveAppNames(config);
  var ignoreMain = isTrue(bodyOrParam(config, ["ignoreMain", "ignoremain", "_ignoreMain"]));
  // _apiMode=appauth: 只导出应用级权限(APPLICATIONAUTH/SECURITYRESTRICT/CTRLGROUP), 其它子表全部去掉
  var apiMode = String(bodyOrParam(config, ["_apiMode", "apiMode"]) || "").toLowerCase();
  var appOnly = apiMode === "appauth" || isTrue(bodyOrParam(config, ["appOnly", "apponly"]));
  var conn = null;
  try {
    conn = getConnection(config);
    if (names.length === 0) {
      // 未显式指定组: 按查询条件导出全部匹配组
      var where = resolveWhere(config);
      var rows = queryRows(conn, "select groupname from maxgroup where " + where + " order by groupname");
      for (var i = 0; i < rows.length; i++) {
        names.push(String(rows[i].GROUPNAME));
      }
    }
    var groups = [];
    for (var j = 0; j < names.length; j++) {
      var g = buildGroupObject(conn, names[j]);
      if (g !== null) {
        if (appnames.length > 0 || appOnly) {
          filterGroupByApps(g, appnames, appOnly);
        }
        if (ignoreMain) {
          // 只保留组名/描述 + 子表数组, 其它主表字段反正是忽略不更新的
          var slim = { GROUPNAME: g.GROUPNAME, DESCRIPTION: g.DESCRIPTION };
          for (var ck in g) {
            if (Object.prototype.hasOwnProperty.call(g, ck) && g[ck] instanceof Array) {
              slim[ck] = g[ck];
            }
          }
          slim._ignoreMain = true;
          g = slim;
        }
        groups.push(g);
      }
    }
    debugPrint("export groups=" + groups.length + ", appnames=" + appnames.join(","));
    return dropIgnoredRoots({ maxgroupList: groups, conditionList: collectConditions(conn, groups) }, config);
  } finally {
    freeConnection(config, conn);
  }
}

/** 读取 body.appnames: 仅导出这些应用的权限行 */
function resolveAppNames(config) {
  var names = [];
  var body = config._body;
  var list = body ? body.appnames : null;
  if (list instanceof Array) {
    for (var i = 0; i < list.length; i++) {
      var n = String(list[i] || "").trim();
      if (n !== "") {
        names.push(n);
      }
    }
  }
  return names;
}

/** 按 APP 过滤子表: 只保留应用授权 / 安全限制 / 控制组中这些 APP 的行, 其余子表清空; appOnly 时不含控制组(由应用信息迁移负责) */
function filterGroupByApps(group, appnames, appOnly) {
  var appSet = {};
  for (var i = 0; i < appnames.length; i++) {
    appSet[String(appnames[i]).toUpperCase()] = true;
  }
  var appRels = ["APPLICATIONAUTH", "SECURITYRESTRICT", "CTRLGROUP"];
  for (var k = 0; k < REL_CONFIG.length; k++) {
    var name = REL_CONFIG[k].name;
    var childKey = CHILD_PREFIX + name;
    if (!(group[childKey] instanceof Array)) {
      continue;
    }
    if (appRels.indexOf(name) < 0 || (appOnly && name === "CTRLGROUP")) {
      // 非应用级子表 / appOnly 下的控制组: 直接从导出结果中去掉, 不输出空数组
      delete group[childKey];
      continue;
    }
    var kept = [];
    for (var j = 0; j < group[childKey].length; j++) {
      var row = group[childKey][j];
      var app = row ? String(row.APP || "").toUpperCase() : "";
      if (appSet[app]) {
        kept.push(row);
      }
    }
    // 没有数据也去掉该子表键, 避免导出 JSON 出现大量空数组
    if (appnames.length === 0) {
      if (group[childKey].length > 0) {
        kept = group[childKey];
      }
    }
    if (kept.length > 0) {
      group[childKey] = kept;
    } else {
      delete group[childKey];
    }
  }
}

/** _action=apps: 查询 MAXAPPS 应用列表(支持 app 模糊匹配) */
function doApps(config) {
  var app = bodyOrParam(config, ["app", "APP", "keyword"]);
  // 用 MBO 查询: DESCRIPTION 为多语言属性, MBO 会按 userInfo 的 langcode 取 L_MAXAPPS 译文
  var set = mxserver.getMboSet("MAXAPPS", config._userInfo);
  try {
    if (app !== null && String(app).trim() !== "") {
      set.setWhere("upper(APP) like '%" + escapeSql(String(app).toUpperCase()) + "%'");
    }
    set.setOrderBy("APP");
    var apps = [];
    var total = set.count();
    for (var i = 0; i < total; i++) {
      var mbo = set.getMbo(i);
      if (mbo == null) {
        continue;
      }
      apps.push({
        APP: String(mbo.getString("APP") || ""),
        DESCRIPTION: String(mbo.getString("DESCRIPTION") || "")
      });
    }
    return { apps: apps, total: apps.length };
  } finally {
    set.close();
  }
}

function resolveGroupNames(config) {
  var names = [];
  var body = config._body;
  var list = body ? body.groupnames : null;
  if (list instanceof Array) {
    for (var i = 0; i < list.length; i++) {
      var n = String(list[i] || "").trim();
      if (n !== "") {
        names.push(n);
      }
    }
  }
  return names;
}

function buildGroupObject(conn, groupname) {
  if (!GROUPNAME_PATTERN.test(groupname)) {
    throw new MXApplicationException("#", "GROUPNAME 含非法字符: " + groupname);
  }
  var rows = queryRows(conn, "select " + MAIN_COLUMNS.join(",") + " from maxgroup where groupname = '" + groupname + "'");
  if (rows.length === 0) {
    return null;
  }
  var group = rows[0];
  group["sks:ref"] = groupname;
  for (var i = 0; i < REL_CONFIG.length; i++) {
    var rel = REL_CONFIG[i];
    var childRows = queryRows(conn,
      "select * from " + rel.name + " where groupname = '" + groupname + "' order by 1");
    // 子表行去掉 GROUPNAME, 便于复制到其它安全组时直接粘贴
    // 子级键统一加 _skschild_ 前缀, 避免与主表字段同名
    var cleanRows = stripGroupname(childRows);
    // APPLICATIONAUTH 按 APP 聚合成 [ { APP, APPLICATIONAUTH:[...] } ], 便于按应用核对/删除不存在的权限
    group[CHILD_PREFIX + rel.name] = rel.name === "APPLICATIONAUTH"
      ? aggregateByApp(cleanRows)
      : cleanRows;
  }
  return group;
}

/** APPLICATIONAUTH 按 APP 聚合: [ { APP, APPLICATIONAUTH:[权限行] } ]; 权限行不再重复输出 APP */
function aggregateByApp(rows) {
  var map = {};
  var order = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var app = (row && row.APP !== undefined && row.APP !== null) ? String(row.APP) : "";
    if (!map[app]) {
      map[app] = { APP: app, APPLICATIONAUTH: [] };
      order.push(app);
    }
    // 权限行去掉 APP, 导入时统一以包装行 APP 为准
    var perm = {};
    for (var k in row) {
      if (Object.prototype.hasOwnProperty.call(row, k) && String(k).toUpperCase() !== "APP") {
        perm[k] = row[k];
      }
    }
    map[app].APPLICATIONAUTH.push(perm);
  }
  order.sort();
  var list = [];
  for (var j = 0; j < order.length; j++) {
    list.push(map[order[j]]);
  }
  return list;
}

/** APPLICATIONAUTH 聚合格式 -> 扁平行(补 APP); 兼容旧扁平格式 */
function flattenAppAuthRows(rows) {
  var flat = [];
  for (var i = 0; i < rows.length; i++) {
    var item = rows[i];
    if (!item || typeof item !== "object") {
      flat.push(item);
      continue;
    }
    var nested = item.APPLICATIONAUTH || item.applicationauth;
    if (!(nested instanceof Array)) {
      flat.push(item);
      continue;
    }
    var app = item.APP !== undefined ? item.APP : item.app;
    for (var j = 0; j < nested.length; j++) {
      var perm = nested[j];
      if (!perm || typeof perm !== "object") {
        flat.push(perm);
        continue;
      }
      var copy = {};
      for (var k in perm) {
        if (Object.prototype.hasOwnProperty.call(perm, k)) {
          copy[k] = perm[k];
        }
      }
      // 以包装行 APP 为准(旧格式权限行自带 APP 时同样覆盖)
      if (app !== undefined && app !== null && String(app) !== "") {
        copy.APP = app;
      }
      flat.push(copy);
    }
  }
  return flat;
}

/** 去掉子表行的 GROUPNAME 列(导入时按主记录组名补齐) */
function stripGroupname(rows) {
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    for (var k in row) {
      if (Object.prototype.hasOwnProperty.call(row, k) && String(k).toUpperCase() === "GROUPNAME") {
        delete row[k];
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 导入
// ---------------------------------------------------------------------------

function doImport(config) {
  var body = config._body || {};
  var groups = body.maxgroupList || body.groups;
  if (!(groups instanceof Array) || groups.length === 0) {
    throw new MXApplicationException("#", "maxgroupList 必须为非空数组");
  }
  var merged = {
    total: groups.length,
    added: 0,
    updated: 0,
    deleted: 0,
    failed: 0,
    results: [],
    "sks:successSumTotal": 0,
    "sks:failSumTotal": 0
  };

  // 关联条件先行: 保证子表 CONDITIONNUM 在目标环境已存在
  // _ignoreList 含 conditionList 时跳过条件导入
  var ignored = resolveIgnoreList(config);
  var conditionStat = ignored.conditionList
    ? { total: 0, added: 0, updated: 0, deleted: 0, failed: 0, errors: [] }
    : importConditions(config, body.conditionList);
  merged.conditions = conditionStat;

  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    var groupname = group ? String(group.GROUPNAME || group.groupname || "").trim() : "";
    var item = { "sks:ref": groupname, _status: "failed", _operation: "none", children: {} };
    try {
      importGroup(config, group, item);
    } catch (e) {
      item._status = "failed";
      item._message = errText(e) + (e && e.stack ? " | " + String(e.stack) : "");
      logger.error("[" + scriptName + "] 导入组失败: " + groupname + " - " + errText(e));
    }
    if (item._status === "success") {
      merged["sks:successSumTotal"]++;
    } else {
      merged.failed++;
      merged["sks:failSumTotal"]++;
    }
    merged.added += Number(item.added || 0);
    merged.updated += Number(item.updated || 0);
    merged.deleted += Number(item.deleted || 0);
    merged.results.push(item);
    debugPrint("import " + groupname + " => " + item._status + " " + (item._message || ""));
  }

  if (config._errorAssert && (merged.failed > 0 || conditionStat.failed > 0)) {
    throw new MXApplicationException("#", "导入存在 " + (merged.failed + conditionStat.failed) + " 条失败, 详见 results/conditions");
  }
  return merged;
}

/**
 * 导入根级 conditionList: 按 CONDITIONNUM upsert, 行内 _delete=true 删除
 * @returns {{total:number,added:number,updated:number,deleted:number,failed:number,errors:Array}}
 */
function importConditions(config, list) {
  var stat = { total: 0, added: 0, updated: 0, deleted: 0, failed: 0, errors: [] };
  if (!(list instanceof Array) || list.length === 0) {
    return stat;
  }
  stat.total = list.length;
  for (var i = 0; i < list.length; i++) {
    var row = list[i];
    var conditionnum = row ? String(row.CONDITIONNUM || row.conditionnum || "").trim() : "";
    if (!conditionnum) {
      stat.failed++;
      stat.errors.push("conditionList[" + i + "] CONDITIONNUM 不能为空");
      continue;
    }
    var set = null;
    try {
      set = mxserver.getMboSet("CONDITION", config._userInfo);
      set.setWhere("conditionnum = '" + escapeSql(conditionnum) + "'");
      set.reset();
      var mbo = set.isEmpty() ? null : set.getMbo(0);
      if (isTrue(row._delete)) {
        if (mbo) {
          mbo.delete();
          saveConditionSet(set, config);
          stat.deleted++;
        }
        continue;
      }
      var isNew = false;
      if (!mbo) {
        mbo = set.add();
        isNew = true;
        setConditionValue(mbo, "CONDITIONNUM", conditionnum);
      }
      for (var key in row) {
        if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
        if (key.charAt(0) === "_" || key.indexOf(":") >= 0) continue;
        var upper = String(key).toUpperCase();
        if (upper === "CONDITIONNUM" || upper === "CONDITIONID" || upper === "REFCOUNT" ||
          upper === "ROWSTAMP" || upper === "BOOLEANNOCACHING" || upper === "EXPORCLASS") continue;
        var value = row[key];
        if (value === null || typeof value === "undefined") continue;
        setConditionValue(mbo, upper, value);
      }
      saveConditionSet(set, config);
      if (isNew) {
        stat.added++;
      } else {
        stat.updated++;
      }
    } catch (e) {
      stat.failed++;
      stat.errors.push(conditionnum + ": " + errText(e));
      logger.warn("[" + scriptName + "] 条件导入失败: " + conditionnum + " - " + errText(e));
    } finally {
      if (set != null) {
        try { set.close(); } catch (ignored) { }
      }
    }
  }
  logger.info("[" + scriptName + "] conditionList 导入: 新增 " + stat.added +
    ", 更新 " + stat.updated + ", 删除 " + stat.deleted + ", 失败 " + stat.failed);
  return stat;
}

function saveConditionSet(set, config) {
  if (config && isTrue(config.dmDeploySet)) {
    try { set.setDMDeploySet(true); } catch (ignored) { }
  }
  set.save();
}

/** 条件字段写入: 优先 sksCommonsUtils 类型转换, 失败再按 flag=2(跳过只读/校验) 写入 */
function setConditionValue(mbo, attr, value) {
  try {
    if (sksCommonsUtils && typeof sksCommonsUtils.autoMboSetValue === "function") {
      sksCommonsUtils.autoMboSetValue(mbo, attr, value, false, false);
      return;
    }
  } catch (ignored) {
    // 回退 setValue
  }
  try {
    mbo.setValue(attr, value, 2);
  } catch (e) {
    mbo.setValue(attr, value);
  }
}

function importGroup(config, group, item) {
  if (!group || typeof group !== "object") {
    throw new MXApplicationException("#", "组对象不合法");
  }
  var groupname = String(group.GROUPNAME || group.groupname || "").trim();
  if (!groupname) {
    throw new MXApplicationException("#", "GROUPNAME 不能为空");
  }
  if (!GROUPNAME_PATTERN.test(groupname)) {
    throw new MXApplicationException("#", "GROUPNAME 含非法字符: " + groupname);
  }

  // 1. 主记录(支持 _ignoreMain / _delete, 直接操作 MboSet, 不依赖其它脚本)
  var mainResult = applyGroupMain(config, group, groupname);
  item._operation = String(mainResult._operation || "none");
  if (mainResult._status !== "success") {
    item._message = String(mainResult._message || "主记录处理失败");
    return;
  }
  if (mainResult._operation === "added") {
    item.added = 1;
  } else if (mainResult._operation === "updated") {
    item.updated = 1;
  } else if (mainResult._operation === "deleted") {
    item.deleted = 1;
  }
  item._ignoreMain = isIgnoreMain(group);

  // _delete 已删除主记录, 不再处理子表
  if (mainResult._operation === "deleted") {
    item._status = "success";
    return;
  }

  // 2. 子表授权数据
  var childAdded = 0, childUpdated = 0, childDeleted = 0, childFailed = 0;
  for (var i = 0; i < REL_CONFIG.length; i++) {
    var rel = REL_CONFIG[i];
    var rows = group[CHILD_PREFIX + rel.name];
    if (!(rows instanceof Array)) {
      rows = group[rel.name]; // 兼容无 _skschild_ 前缀的旧格式
    }
    if (rel.name === "APPLICATIONAUTH" && rows instanceof Array) {
      rows = flattenAppAuthRows(rows); // 兼容 [ {APP, APPLICATIONAUTH:[...]} ] 聚合格式
    }
    if (!(rows instanceof Array) || rows.length === 0) {
      continue;
    }
    var deleteNotExists = rel.name === "APPLICATIONAUTH" && isDeleteNotExists(config, rel.name);
    var stat = syncChildren(config, groupname, rel, rows, deleteNotExists);
    item.children[rel.name] = stat;
    childAdded += stat.added;
    childUpdated += stat.updated;
    childDeleted += stat.deleted;
    childFailed += stat.failed;
  }
  item.added = (item.added || 0) + childAdded;
  item.updated = (item.updated || 0) + childUpdated;
  item.deleted = (item.deleted || 0) + childDeleted;
  if (childFailed > 0) {
    item._status = "failed";
    item._message = "子表存在 " + childFailed + " 条失败";
    return;
  }
  item._status = "success";
}

/** 忽略主表变更: _ignoreMain(通用控制字段), 兼容旧 sks:ignoreMain */
function isIgnoreMain(group) {
  if (!group) {
    return false;
  }
  return isTrue(group._ignoreMain) || isTrue(group["sks:ignoreMain"]);
}

/**
 * 主记录 upsert / 删除
 * @returns {{_status:string,_operation:string,_message?:string}}
 */
function applyGroupMain(config, group, groupname) {
  var set = null;
  try {
    set = mxserver.getMboSet("MAXGROUP", config._userInfo);
    var mbo = null;
    var total = set.count();
    for (var i = 0; i < total; i++) {
      var m = set.getMbo(i);
      if (m == null) {
        continue;
      }
      if (String(m.getString("GROUPNAME") || "").trim() === groupname) {
        mbo = m;
        break;
      }
    }

    if (isTrue(group._delete)) {
      if (!mbo) {
        return { _status: "success", _operation: "none", _message: "记录不存在, 无需删除" };
      }
      mbo.delete();
      saveGroupSet(set, config);
      return { _status: "success", _operation: "deleted" };
    }

    if (isIgnoreMain(group)) {
      if (!mbo) {
        // 目标组不存在时仍需建一条主记录, 否则子表无法挂载; 但不写任何业务字段
        mbo = set.add();
        if (!mbo) {
          return { _status: "failed", _operation: "none", _message: "无法新增 MAXGROUP: " + groupname };
        }
        mbo.setValue("GROUPNAME", groupname);
        saveGroupSet(set, config);
        return { _status: "success", _operation: "added", _message: "_ignoreMain=true, 仅创建主记录" };
      }
      return { _status: "success", _operation: "ignored" };
    }

    var operation = "updated";
    if (!mbo) {
      mbo = set.add();
      if (!mbo) {
        return { _status: "failed", _operation: "none", _message: "无法新增 MAXGROUP: " + groupname };
      }
      operation = "added";
      mbo.setValue("GROUPNAME", groupname);
    }

    for (var key in group) {
      if (!Object.prototype.hasOwnProperty.call(group, key)) {
        continue;
      }
      if (key.charAt(0) === "_" || key.indexOf(":") >= 0) {
        continue;
      }
      var upper = String(key).toUpperCase();
      if (upper === "GROUPNAME" || MAIN_SKIP_FIELDS.indexOf(upper) >= 0) {
        continue;
      }
      var value = group[key];
      if (value === null || typeof value === "undefined" || value instanceof Array || typeof value === "object") {
        continue;
      }
      var oldValue = null;
      try {
        oldValue = mbo.getString(upper);
      } catch (eIgnore) {
        oldValue = null; // 非本对象属性(如子表数组键)跳过
      }
      if (oldValue === null || oldValue === String(value)) {
        continue;
      }
      try {
        mbo.setValue(upper, value);
      } catch (e) {
        logger.warn("[" + scriptName + "] 字段写入失败: " + upper + " - " + errText(e));
      }
    }

    saveGroupSet(set, config);
    return { _status: "success", _operation: operation };
  } finally {
    if (set != null) {
      try { set.close(); } catch (ignored) { }
    }
  }
}

function saveGroupSet(set, config) {
  if (config && isTrue(config.dmDeploySet)) {
    try { set.setDMDeploySet(true); } catch (ignored) { }
  }
  set.save();
}

/**
 * 子表同步: 按键匹配 upsert, 行内 _delete=true 删除
 * @returns {{added:number,updated:number,deleted:number,failed:number,errors:Array}}
 */
function syncChildren(config, groupname, rel, rows, deleteNotExists) {
  var stat = { added: 0, updated: 0, deleted: 0, failed: 0, errors: [] };
  var set = null;
  try {
    set = mxserver.getMboSet(rel.name, config._userInfo);
    set.setWhere("groupname = '" + groupname + "'");
    set.reset();

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row || typeof row !== "object") {
        stat.failed++;
        stat.errors.push(rel.name + "[" + i + "] 行不合法");
        continue;
      }
      try {
        var target = findByKeys(set, rel.keys, row);
        if (isTrue(row._delete)) {
          if (target) {
            target.delete();
            stat.deleted++;
          }
          continue;
        }
        if (target) {
          applyChildFields(target, row, rel.keys, false);
          stat.updated++;
        } else {
          var nm = set.add();
          if (!nm) {
            throw new MXApplicationException("#", "无法新增 " + rel.name + " 行");
          }
          try {
            nm.setValue("GROUPNAME", groupname);
            setChildKeys(nm, rel.keys, row);
            applyChildFields(nm, row, rel.keys, true);
          } catch (eAdd) {
            // 失败的新增行必须移出 set, 否则保存时违反必填校验
            try { nm.delete(); } catch (eDel) {
              logger.warn("[" + scriptName + "] 回滚新增行失败: " + errText(eDel));
            }
            throw eAdd;
          }
          stat.added++;
        }
      } catch (e) {
        stat.failed++;
        stat.errors.push(rel.name + "[" + i + "] " + String((e && e.message) ? e.message : e));
        logger.warn("[" + scriptName + "] " + rel.name + " 行处理失败: " + JSON.stringify(row), e);
      }
    }

    if (deleteNotExists) {
      stat.deleted += deleteMissingAppAuth(set, rel, rows);
    }
    if (config.dmDeploySet) {
      try { set.setDMDeploySet(true); } catch (ignored) { }
    }
    set.save();
  } catch (e) {
    stat.failed++;
    stat.errors.push(rel.name + " 保存失败: " + String((e && e.message) ? e.message : e));
    logger.error("[" + scriptName + "] " + rel.name + " save 失败: " + groupname, e);
    throw e;
  } finally {
    if (set != null) {
      try { set.close(); } catch (ignored) { }
    }
  }
  return stat;
}

/**
 * 不存在则删除: 以导入行中的 APP 为范围, 删除目标中该 APP 下未出现在导入 JSON 中的行
 * 仅用于 APPLICATIONAUTH(键为 APP + OPTIONNAME)
 */
function deleteMissingAppAuth(set, rel, rows) {
  var kept = {};
  var scopes = {};
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row || typeof row !== "object") continue;
    var app = String(row.APP || "").trim();
    scopes[app] = true;
    if (isTrue(row._delete)) continue;
    kept[rowKey(rel.keys, row)] = true;
  }
  var marked = [];
  var total = set.count();
  for (var idx = 0; idx < total; idx++) {
    var m = set.getMbo(idx);
    if (m == null) continue;
    var isDel = false;
    try { isDel = m.isDeleted(); } catch (ignored) { isDel = false; }
    if (isDel) continue;
    var appKey = "";
    try { appKey = String(m.getString("APP") || "").trim(); } catch (ignored2) { appKey = ""; }
    if (!scopes[appKey]) continue;
    if (!kept[mboKey(rel.keys, m)]) {
      marked.push(m);
    }
  }
  for (var d = 0; d < marked.length; d++) {
    marked[d].delete();
  }
  return marked.length;
}

/** JSON 行按 rel.keys 拼匹配键 */
function rowKey(keys, row) {
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    var v = row[keys[i]];
    if (v === undefined || v === null) {
      v = row[String(keys[i]).toLowerCase()];
    }
    parts.push(v === undefined || v === null ? "" : String(v).trim());
  }
  return parts.join("\u0001");
}

/** MBO 按 rel.keys 拼匹配键 */
function mboKey(keys, mbo) {
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    var v = "";
    try { v = String(mbo.getString(keys[i]) || "").trim(); } catch (ignored) { v = ""; }
    parts.push(v);
  }
  return parts.join("\u0001");
}

function findByKeys(set, keys, row) {
  var total = set.count();
  for (var idx = 0; idx < total; idx++) {
    var m = set.getMbo(idx);
    if (m == null) {
      continue;
    }
    var deleted = false;
    try { deleted = m.isDeleted(); } catch (ignored) { deleted = false; }
    if (deleted) {
      continue;
    }
    var matched = true;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var actual = "";
      try { actual = String(m.getString(k) || "").trim(); } catch (ignored) { }
      var want = row[k];
      if (want === undefined || want === null) {
        want = row[String(k).toLowerCase()];
      }
      var wantStr = (want === undefined || want === null) ? "" : String(want).trim();
      if (actual !== wantStr) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return m;
    }
  }
  return null;
}

/**
 * 新增子表行先写键字段(含 GROUPNAME 之外的键)
 */
function setChildKeys(mbo, keys, row) {
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = row[key];
    if (value === undefined || value === null || String(value) === "") {
      continue;
    }
    mbo.setValue(key, value);
  }
}

function applyChildFields(mbo, row, keys, isNew) {
  var uniqueIdName = String(mbo.getUniqueIDName() || "").toUpperCase();
  for (var key in row) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
    if (key.charAt(0) === "_" || key.indexOf(":") >= 0) continue;
    var upper = String(key).toUpperCase();
    if (upper === "ROWSTAMP" || upper === uniqueIdName) continue;
    if (upper === "GROUPNAME") continue; // 新增时已显式设置
    if (keys.indexOf(upper) >= 0) continue; // 键字段由调用方先行设置(新增)或保持不变(更新)

    var value = row[key];
    if (value === undefined) continue;
    var field = null;
    try {
      field = mbo.getMboValue(upper);
    } catch (ignored) {
      field = null;
    }
    if (field == null) continue;

    if (!isNew) {
      var oldValue = "";
      try { oldValue = String(mbo.getString(upper) || ""); } catch (ignored) { }
      if (oldValue === (value === null ? "" : String(value))) {
        continue;
      }
    }
    setMboValue(mbo, upper, value);
  }
}

function setMboValue(mbo, attr, value) {
  if (value === null || value === undefined) {
    try { mbo.setValue(attr, ""); } catch (e) { logger.warn(attr + " 置空失败: " + e); }
    return;
  }
  if (sksCommonsUtils && typeof sksCommonsUtils.autoMboSetValue === "function") {
    try {
      sksCommonsUtils.autoMboSetValue(mbo, attr, value, false, false);
      return;
    } catch (e) {
      logger.warn("autoMboSetValue 失败, 回退 setValue: " + attr + " - " + e);
    }
  }
  try {
    mbo.setValue(attr, value);
  } catch (e) {
    if (typeof value === "number") {
      mbo.setValue(attr, Packages.java.lang.Double(value));
    } else {
      throw e;
    }
  }
}

// invokeScript 返回的可能是 Java Map, 统一转为 JS 对象
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

function toJsObject(obj) {
  if (obj === null || typeof obj === "undefined") {
    return null;
  }
  if (typeof obj.get === "function" && typeof obj.keySet === "function") {
    var result = {};
    var it = obj.keySet().iterator();
    while (it.hasNext()) {
      var k = String(it.next());
      result[k] = obj.get(k);
    }
    return result;
  }
  return obj;
}

// ---------------------------------------------------------------------------
// JDBC 工具
// ---------------------------------------------------------------------------

function getConnection(config) {
  var connKey = config._userInfo.getConnectionKey();
  var conn = null;
  for (var i = 0; i < 3; i++) {
    conn = mxserver.getDBManager().getConnection(connKey);
    if (conn && !isConnClosed(conn)) {
      return conn;
    }
    // 连接已关闭: 先释放掉, 让 DBManager 在下次 getConnection 时重建物理连接
    try {
      mxserver.getDBManager().freeConnection(connKey, conn);
    } catch (ignored) {
    }
  }
  return conn;
}

/** 数据库连接是否已关闭 */
function isConnClosed(conn) {
  try {
    return !conn || conn.isClosed();
  } catch (e) {
    return true;
  }
}

function freeConnection(config, conn) {
  // 不释放/关闭: getConnection 拿的是当前会话的连接(带引用计数),
  // 这里 free 会把该 ConRef 关闭, 之后同会话的下一次请求再 getConnection
  // 会拿到已关闭的连接, 报 "Connection is closed"(-4470)。
  // 交给 Maximo 在会话结束时统一回收。
  return;
}

function countRows(conn, sql) {
  var stmt = null;
  var rs = null;
  try {
    stmt = conn.prepareStatement(sql);
    rs = stmt.executeQuery();
    if (rs.next()) {
      return rs.getInt(1);
    }
    return 0;
  } finally {
    closeRs(rs);
    closeStmt(stmt);
  }
}

function queryRows(conn, sql) {
  var stmt = null;
  var rs = null;
  try {
    stmt = conn.prepareStatement(sql);
    rs = stmt.executeQuery();
    var md = rs.getMetaData();
    var colCount = md.getColumnCount();
    var rows = [];
    while (rs.next()) {
      var row = {};
      for (var i = 1; i <= colCount; i++) {
        // getColumnLabel: DB2 JDBC 下 getColumnName 对带别名(as x)的列返回基础列名, 会互相覆盖
        var col = String(md.getColumnLabel(i)).toUpperCase();
        if (col === "ROWSTAMP") {
          continue;
        }
        row[col] = readColumn(rs, i, md.getColumnType(i));
      }
      rows.push(row);
    }
    return rows;
  } finally {
    closeRs(rs);
    closeStmt(stmt);
  }
}

function readColumn(rs, index, sqlType) {
  var v = rs.getObject(index);
  if (v === null || typeof v === "undefined") {
    return "";
  }
  var Types = Java.type("java.sql.Types");
  switch (sqlType) {
    case Types.INTEGER:
    case Types.SMALLINT:
    case Types.TINYINT:
      return rs.getInt(index);
    case Types.BIGINT:
      return Number(rs.getLong(index));
    case Types.FLOAT:
    case Types.REAL:
    case Types.DOUBLE:
    case Types.DECIMAL:
    case Types.NUMERIC:
      return rs.getDouble(index);
    case Types.BOOLEAN:
    case Types.BIT:
      return rs.getBoolean(index) ? "1" : "0";
    default:
      var s = rs.getString(index);
      return s === null ? "" : s;
  }
}

function closeRs(rs) {
  if (rs) {
    try { rs.close(); } catch (ignored) { }
  }
}

function closeStmt(stmt) {
  if (stmt) {
    try { stmt.close(); } catch (ignored) { }
  }
}
