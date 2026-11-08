// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable no-undef */
// @ts-nocheck
// 自动键(AUTOKEY) 查询 / 详情 / 导出 / 导入接口
//
// 调用方式:
//   GET/POST /maximo/api/script/SKS_MIGRATEAPI_AUTOKEY?_action=query
//        body: { autokeyname, prefix, siteid, orgid, setid, level, where, pageNum, pageSize }
//        → { autokeys:[ 行(含 sks:level / sks:ownerdescription) ], total, pageNum, pageSize }
//   GET/POST ...?_action=detail&autokeyid=xxx  (或 autokeyname + siteid/orgid/setid)
//        → { autokeys:[ 行 ] }
//   GET/POST ...?_action=export[&where=...|body:{autokeynames:[...]}]  (不分页)
//        → { autokeys:[ 行 ] }
//   POST ...?_action=import  body: { "autokeys": [ 定义对象... ] }
//        定义对象字段(大小写均可, sks: 前缀与 _ 开头属性忽略):
//          autokeyname(必填) / siteid / orgid / setid / prefix / seed / defautSeed / langcode
//          siteorgtype: SITE/ORG/SYSTEM/ITEMSET/COMPANYSET, 按级别批量创建(参考 SKS_DEPLOY_AUTOKEY)
//          _delete: true 删除; _deleteAll: true 删除所有同名
//        → { total, added, updated, deleted, failed, results, sks:successSumTotal, sks:failSumTotal }
//   _langcode=ZH      设置会话语言
//   _debug=true       返回 debugMsg
//   _errorAssert=true 存在失败时抛出异常
//   dmDeploySet=true  导入时 MboSet.setDMDeploySet(true)(迁移模式)

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

var OBJECT_NAME = "AUTOKEY";
var NAME_PATTERN = /^[A-Za-z0-9_\-]+$/;

var MAIN_COLUMNS = ["AUTOKEYID", "AUTOKEYNAME", "SITEID", "ORGID", "SETID", "PREFIX", "SEED", "LANGCODE"];

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
  if (action === "export" || action === "exportApp") {
    return doExport(config);
  }
  if (action === "import" || action === "importApp") {
    return doImport(config);
  }
  throw new MXApplicationException("#", "未知 _action: " + action + " (可用: query/detail/export/import)");
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
      return { autokeys: parsed };
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

// 行级别: SITE > ORG > SET > SYSTEM
function resolveLevel(row) {
  if (row.SITEID) return "SITE";
  if (row.ORGID) return "ORG";
  if (row.SETID) return "SET";
  return "SYSTEM";
}

// ---------------------------------------------------------------------------
// 查询
// ---------------------------------------------------------------------------

function doQuery(config) {
  var where = resolveWhere(config);
  var pageNum = toInt(bodyOrParam(config, ["pageNum", "page"]), 0);
  var pageSize = toInt(bodyOrParam(config, ["pageSize", "limit"]), 0);
  var paginated = pageNum > 0 && pageSize > 0;

  var sql = "select " + MAIN_COLUMNS.join(",") + " from autokey where " + where +
    " order by autokeyname, siteid, orgid, setid";
  var countSql = "select count(*) from autokey where " + where;

  var conn = null;
  var rows = [];
  var total = 0;
  try {
    conn = getConnection(config);
    total = countRows(conn, countSql);
    if (paginated) {
      sql = sql + " offset " + ((pageNum - 1) * pageSize) + " rows fetch next " + pageSize + " rows only";
    }
    rows = queryRows(conn, sql);
    if (!paginated) {
      total = rows.length;
    }
    attachOwnerInfo(conn, rows);
  } finally {
    freeConnection(config, conn);
  }
  var result = { autokeys: rows, total: total };
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
  var autokeyname = bodyOrParam(config, ["autokeyname", "AUTOKEYNAME"]);
  var prefix = bodyOrParam(config, ["prefix", "PREFIX"]);
  var siteid = bodyOrParam(config, ["siteid", "SITEID"]);
  var orgid = bodyOrParam(config, ["orgid", "ORGID"]);
  var setid = bodyOrParam(config, ["setid", "SETID"]);
  var level = bodyOrParam(config, ["level", "LEVEL"]);
  if (autokeyname !== null) {
    conds.push("upper(autokeyname) like '%" + escapeSql(String(autokeyname).toUpperCase()) + "%'");
  }
  if (prefix !== null) {
    conds.push("upper(prefix) like '%" + escapeSql(String(prefix).toUpperCase()) + "%'");
  }
  if (siteid !== null) {
    conds.push("upper(siteid) = '" + escapeSql(String(siteid).toUpperCase()) + "'");
  }
  if (orgid !== null) {
    conds.push("upper(orgid) = '" + escapeSql(String(orgid).toUpperCase()) + "'");
  }
  if (setid !== null) {
    conds.push("upper(setid) = '" + escapeSql(String(setid).toUpperCase()) + "'");
  }
  if (level !== null) {
    var lv = String(level).toUpperCase();
    if (lv === "SYSTEM") {
      conds.push("siteid is null and orgid is null and setid is null");
    } else if (lv === "SITE") {
      conds.push("siteid is not null");
    } else if (lv === "ORG") {
      conds.push("orgid is not null and siteid is null");
    } else if (lv === "SET") {
      conds.push("setid is not null");
    }
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

/**
 * 为行附加虚拟字段(导入时 sks: 前缀键自动忽略):
 *   sks:level             级别(SYSTEM/ORG/SITE/SET)
 *   sks:ownerdescription  归属描述(SITE/ORGANIZATION/SETS 的 DESCRIPTION)
 */
function attachOwnerInfo(conn, rows) {
  if (!rows || rows.length === 0) {
    return;
  }
  var siteids = {}, orgids = {}, setids = {};
  var siteIn = [], orgIn = [], setIn = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    row["sks:level"] = resolveLevel(row);
    if (row.SITEID && !siteids[String(row.SITEID)]) {
      siteids[String(row.SITEID)] = true;
      siteIn.push("'" + String(row.SITEID).replace(/'/g, "''") + "'");
    } else if (row.ORGID && !orgids[String(row.ORGID)]) {
      orgids[String(row.ORGID)] = true;
      orgIn.push("'" + String(row.ORGID).replace(/'/g, "''") + "'");
    } else if (row.SETID && !setids[String(row.SETID)]) {
      setids[String(row.SETID)] = true;
      setIn.push("'" + String(row.SETID).replace(/'/g, "''") + "'");
    }
  }
  var siteMap = {}, orgMap = {}, setMap = {};
  try {
    if (siteIn.length > 0) {
      var sRows = queryRows(conn, "select siteid, description from site where siteid in (" + siteIn.join(",") + ")");
      for (var a = 0; a < sRows.length; a++) siteMap[String(sRows[a].SITEID)] = sRows[a].DESCRIPTION || "";
    }
    if (orgIn.length > 0) {
      var oRows = queryRows(conn, "select orgid, description from organization where orgid in (" + orgIn.join(",") + ")");
      for (var b = 0; b < oRows.length; b++) orgMap[String(oRows[b].ORGID)] = oRows[b].DESCRIPTION || "";
    }
    if (setIn.length > 0) {
      var tRows = queryRows(conn, "select setid, description from sets where setid in (" + setIn.join(",") + ")");
      for (var c = 0; c < tRows.length; c++) setMap[String(tRows[c].SETID)] = tRows[c].DESCRIPTION || "";
    }
  } catch (e) {
    logger.warn("[" + scriptName + "] 归属描述查询失败, 跳过: " + (e.message || String(e)));
  }
  for (var k = 0; k < rows.length; k++) {
    var r = rows[k];
    var desc = "";
    if (r.SITEID) desc = siteMap[String(r.SITEID)];
    else if (r.ORGID) desc = orgMap[String(r.ORGID)];
    else if (r.SETID) desc = setMap[String(r.SETID)];
    if (desc) {
      r["sks:ownerdescription"] = desc;
    }
  }
}

// ---------------------------------------------------------------------------
// 详情 / 导出
// ---------------------------------------------------------------------------

function doDetail(config) {
  var autokeyid = bodyOrParam(config, ["autokeyid", "AUTOKEYID"]);
  var conn = null;
  try {
    conn = getConnection(config);
    var rows;
    if (autokeyid !== null) {
      rows = queryRows(conn, "select " + MAIN_COLUMNS.join(",") + " from autokey where autokeyid = " + toInt(autokeyid, 0));
    } else {
      var name = bodyOrParam(config, ["autokeyname", "AUTOKEYNAME"]);
      if (name === null) {
        throw new MXApplicationException("#", "缺少 autokeyid 或 autokeyname");
      }
      var where = "upper(autokeyname) = '" + escapeSql(String(name).toUpperCase()) + "'";
      var siteid = bodyOrParam(config, ["siteid", "SITEID"]);
      var orgid = bodyOrParam(config, ["orgid", "ORGID"]);
      var setid = bodyOrParam(config, ["setid", "SETID"]);
      if (siteid !== null) where += " and upper(siteid) = '" + escapeSql(String(siteid).toUpperCase()) + "'";
      else if (orgid !== null) where += " and upper(orgid) = '" + escapeSql(String(orgid).toUpperCase()) + "'";
      else if (setid !== null) where += " and upper(setid) = '" + escapeSql(String(setid).toUpperCase()) + "'";
      rows = queryRows(conn, "select " + MAIN_COLUMNS.join(",") + " from autokey where " + where);
    }
    attachOwnerInfo(conn, rows);
    for (var i = 0; i < rows.length; i++) {
      rows[i]["sks:ref"] = String(rows[i].AUTOKEYNAME) + "/" + rows[i]["sks:level"];
    }
    return { autokeys: rows };
  } finally {
    freeConnection(config, conn);
  }
}

function doExport(config) {
  var conn = null;
  try {
    conn = getConnection(config);
    var names = resolveAutokeyNames(config);
    var rows;
    if (names.length > 0) {
      var inList = [];
      for (var i = 0; i < names.length; i++) {
        if (!NAME_PATTERN.test(names[i])) {
          throw new MXApplicationException("#", "AUTOKEYNAME 含非法字符: " + names[i]);
        }
        inList.push("'" + escapeSql(names[i]) + "'");
      }
      rows = queryRows(conn, "select " + MAIN_COLUMNS.join(",") +
        " from autokey where autokeyname in (" + inList.join(",") + ") order by autokeyname, siteid, orgid, setid");
    } else {
      var where = resolveWhere(config);
      rows = queryRows(conn, "select " + MAIN_COLUMNS.join(",") +
        " from autokey where " + where + " order by autokeyname, siteid, orgid, setid");
    }
    debugPrint("export autokeys=" + rows.length);
    return { autokeys: rows };
  } finally {
    freeConnection(config, conn);
  }
}

function resolveAutokeyNames(config) {
  var names = [];
  var body = config._body;
  var list = body ? body.autokeynames : null;
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

// ---------------------------------------------------------------------------
// 导入(逻辑参考 SKS_DEPLOY_AUTOKEY.js)
// ---------------------------------------------------------------------------

function doImport(config) {
  var body = config._body || {};
  var autokeys = body.autokeys;
  if (!(autokeys instanceof Array) || autokeys.length === 0) {
    if (autokeys && typeof autokeys === "object") {
      autokeys = [autokeys];
    } else {
      throw new MXApplicationException("#", "autokeys 必须为非空数组");
    }
  }
  var merged = {
    total: autokeys.length,
    added: 0,
    updated: 0,
    deleted: 0,
    failed: 0,
    results: [],
    "sks:successSumTotal": 0,
    "sks:failSumTotal": 0
  };

  // 整个导入共用一个 JDBC 连接(删除用), 避免逐条 getConnection/freeConnection 后拿到已关闭连接
  var conn = null;
  try {
    conn = getConnection(config);
  } catch (e) {
    logger.warn("[" + scriptName + "] 获取 JDBC 连接失败, 删除操作将逐条获取连接: " + (e.message || String(e)));
  }
  config._jdbcConn = conn;

  for (var i = 0; i < autokeys.length; i++) {
    var data = autokeys[i];
    var item = { "sks:ref": "", _status: "failed", _operation: "none", added: 0, updated: 0, deleted: 0 };
    try {
      importAutokey(config, data, item);
    } catch (e) {
      item._status = "failed";
      item._message = String((e && e.message) ? e.message : e);
      logger.error("[" + scriptName + "] 导入自动键失败: " + JSON.stringify(data), e);
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
    debugPrint("import " + item["sks:ref"] + " => " + item._status + " " + (item._message || ""));
  }

  config._jdbcConn = null;
  freeConnection(config, conn);

  if (config._errorAssert && merged.failed > 0) {
    throw new MXApplicationException("#", "导入存在 " + merged.failed + " 条失败, 详见 results");
  }
  return merged;
}

// 取字段值: 兼容小写/驼峰/大写导出列名; "" 视为 null
function pick(data, names) {
  for (var i = 0; i < names.length; i++) {
    var v = data[names[i]];
    if (v === undefined || v === null) continue;
    if (typeof v === "string") {
      v = v.trim();
      if (v === "" || v === "undefined") continue;
    }
    return v;
  }
  return null;
}

function pickNum(data, names) {
  var v = pick(data, names);
  if (v === null) return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

function importAutokey(config, data, item) {
  if (!data || typeof data !== "object") {
    throw new MXApplicationException("#", "自动键对象不合法");
  }
  var autokeyname = pick(data, ["autokeyname", "AUTOKEYNAME", "autokeynum", "AUTOKEYNUM"]);
  if (autokeyname === null) {
    throw new MXApplicationException("#", "autokeyname(自动键名称)不能为空");
  }
  autokeyname = String(autokeyname).trim();
  if (!NAME_PATTERN.test(autokeyname)) {
    throw new MXApplicationException("#", "autokeyname 含非法字符: " + autokeyname);
  }
  var siteid = pick(data, ["siteid", "siteId", "SITEID"]);
  var orgid = pick(data, ["orgid", "orgId", "ORGID"]);
  var setid = pick(data, ["setid", "setId", "SETID"]);
  var seed = pickNum(data, ["seed", "SEED"]);
  var defaultSeed = pickNum(data, ["defautSeed", "defaultSeed", "DEFAUTSEED", "DEFAULTSEED"]);
  var prefix = pick(data, ["prefix", "PREFIX"]);
  var langcode = pick(data, ["langcode", "langCode", "LANGCODE"]);
  var siteorgtype = pick(data, ["siteorgtype", "siteOrgType", "SITEORGTYPE"]);

  var level = siteid ? "SITE" : (orgid ? "ORG" : (setid ? "SET" : "SYSTEM"));
  item["sks:ref"] = autokeyname + "/" + level;

  // 删除
  if (isTrue(data._delete) || isTrue(data._deleteAll)) {
    var delCount = deleteAutokeys(config, autokeyname, siteid, orgid, setid, isTrue(data._deleteAll));
    item.deleted = delCount;
    item._operation = delCount > 0 ? "deleted" : "none";
    item._status = "success";
    item._message = delCount > 0 ? ("已删除 " + delCount + " 条") : "自动键不存在，无需删除";
    return;
  }

  var stats = { added: 0, updated: 0 };
  if (siteorgtype !== null) {
    // 按 SITEORGTYPE 批量创建(参考 SKS_DEPLOY_AUTOKEY)
    if (siteid || orgid || setid) {
      // SITEORGTYPE 派生级别只接收 defautSeed
      createAutokeyBySiteOrgType(config, autokeyname, String(siteorgtype), null, defaultSeed, null, langcode, stats);
      if (siteid) {
        createSingleAutokey(config, autokeyname, String(siteid), null, null, seed, defaultSeed, prefix, langcode, stats);
      } else if (orgid) {
        createSingleAutokey(config, autokeyname, null, String(orgid), null, seed, defaultSeed, prefix, langcode, stats);
      } else {
        createSingleAutokey(config, autokeyname, null, null, String(setid), seed, defaultSeed, prefix, langcode, stats);
      }
    } else {
      createAutokeyBySiteOrgType(config, autokeyname, String(siteorgtype), seed, defaultSeed, prefix, langcode, stats);
    }
  } else {
    createSingleAutokey(config, autokeyname, siteid ? String(siteid) : null,
      orgid ? String(orgid) : null, setid ? String(setid) : null, seed, defaultSeed, prefix, langcode, stats);
  }
  item.added = stats.added;
  item.updated = stats.updated;
  item._operation = stats.added > 0 ? "added" : (stats.updated > 0 ? "updated" : "none");
  item._status = "success";
  item._message = "新增 " + stats.added + " / 更新 " + stats.updated;
}

// 删除自动键: allSameName=true 删除所有同名, 否则按级别删除
// 说明: psdi.app.system.AutoKey.canDelete 要求会话当前应用为 AUTOKEY, 脚本 REST 上下文无法满足
//       (BMXAA0028E), 故删除采用 JDBC 直删; AUTOKEY 定义无缓存表(MAXCACHESPEC 无 AUTOKEY 条目), 直删安全
function deleteAutokeys(config, autokeyname, siteid, orgid, setid, allSameName) {
  var whereClause;
  if (allSameName) {
    whereClause = "autokeyname = '" + escapeSql(autokeyname) + "'";
  } else if (siteid) {
    whereClause = "autokeyname = '" + escapeSql(autokeyname) + "' and siteid = '" + escapeSql(siteid) + "'";
  } else if (orgid) {
    whereClause = "autokeyname = '" + escapeSql(autokeyname) + "' and orgid = '" + escapeSql(orgid) + "'";
  } else if (setid) {
    whereClause = "autokeyname = '" + escapeSql(autokeyname) + "' and setid = '" + escapeSql(setid) + "'";
  } else {
    whereClause = "autokeyname = '" + escapeSql(autokeyname) +
      "' and siteid is null and orgid is null and setid is null";
  }
  var ownConn = !config._jdbcConn;
  var conn = ownConn ? getConnection(config) : config._jdbcConn;
  var stmt = null;
  try {
    stmt = conn.prepareStatement("delete from autokey where " + whereClause);
    var count = stmt.executeUpdate();
    debugPrint("delete " + autokeyname + " count=" + count);
    return count;
  } finally {
    closeStmt(stmt);
    if (ownConn) {
      freeConnection(config, conn);
    }
  }
}

/**
 * 根据 SITEORGTYPE 批量创建自动键(参考 SKS_DEPLOY_AUTOKEY.createAutokeyBySiteOrgType)
 */
function createAutokeyBySiteOrgType(config, autokeyname, siteorgtypeExternal, seed, defaultSeed, prefix, langcode, stats) {
  var translator = mxserver.getMaximoDD().getTranslator();
  var siteorgtype = String(translator.toInternalString("SITEORGTYPE", siteorgtypeExternal));
  debugPrint("siteorgtype " + siteorgtypeExternal + " => " + siteorgtype);

  if (siteorgtype.indexOf("SYSTEM") >= 0) {
    createSingleAutokey(config, autokeyname, null, null, null, seed, defaultSeed, prefix, langcode, stats);
    return;
  }

  if (siteorgtype !== "ORG" && siteorgtype !== "ORGSITE" &&
      siteorgtype !== "ORGAPPFILTER" && siteorgtype !== "SITE" &&
      siteorgtype !== "SITEAPPFILTER") {
    var setType = null;
    if (siteorgtype.indexOf("ITEMSET") >= 0) {
      setType = ["ITEM"];
    } else if (siteorgtype.indexOf("COMPANYSET") >= 0) {
      setType = ["COMPANY"];
    }
    if (setType) {
      var setSet = null;
      try {
        var typeList = String(translator.toExternalList("SETTYPE", setType));
        setSet = mxserver.getMboSet("SETS", mxserver.getSystemUserInfo());
        setSet.setWhere("settype in (" + typeList + ")");
        setSet.reset();
        var setMbo = setSet.moveFirst();
        while (setMbo) {
          createSingleAutokey(config, autokeyname, null, null, setMbo.getString("SETID"), seed, defaultSeed, prefix, langcode, stats);
          setMbo = setSet.moveNext();
        }
      } finally {
        mboSetClose(setSet);
      }
    }
    return;
  }

  // 组织级/站点级: 为所有组织创建
  var orgSet = null;
  try {
    orgSet = mxserver.getMboSet("ORGANIZATION", mxserver.getSystemUserInfo());
    orgSet.setWhere("1=1");
    orgSet.reset();
    var orgMbo = orgSet.moveFirst();
    while (orgMbo) {
      createSingleAutokey(config, autokeyname, null, orgMbo.getString("ORGID"), null, seed, defaultSeed, prefix, langcode, stats);
      orgMbo = orgSet.moveNext();
    }
  } finally {
    mboSetClose(orgSet);
  }
}

/**
 * 创建/更新单个自动键(参考 SKS_DEPLOY_AUTOKEY.createSingleAutokey)
 */
function createSingleAutokey(config, autokeyname, siteid, orgid, setid, seed, defaultSeed, prefix, langcode, stats) {
  var autokeySet = null;
  try {
    autokeySet = getAutokeySet(config);
    var result = findOrCreateAutokey(config, autokeySet, autokeyname, siteid, orgid, setid,
      seed, defaultSeed, prefix, langcode);
    if (result.created) {
      stats.added++;
    } else {
      stats.updated++;
    }
  } finally {
    mboSetClose(autokeySet);
  }
}

/**
 * 查找或创建自动键(参考 SKS_DEPLOY_AUTOKEY.findOrCreateAutokey)
 * @returns {{autokeyMbo:Object, created:boolean}}
 */
function findOrCreateAutokey(config, autokeySet, autokeyname, siteid, orgid, setid, seed, defaultSeed, prefix, langcode) {
  var ownerMbo = null;
  var ownerSet = null;
  var parentAutokeySet = null;
  var autokeyMbo = null;
  var saveSet = null;
  var created = false;

  try {
    // 已存在则直接更新
    var found = findExistingMbo(autokeySet, autokeyname, siteid, orgid, setid);
    if (found) {
      updateAutokeyFields(found, seed, defaultSeed, prefix, langcode, false);
      applyDmDeploySet(autokeySet, config);
      autokeySet.save();
      return { autokeyMbo: found, created: false };
    }

    // 不存在: 通过父 MBO 的 AUTOKEY 关系创建
    if (siteid) {
      ownerSet = mxserver.getMboSet("SITE", mxserver.getSystemUserInfo());
      var siteSqlf = new SqlFormat("siteid = :1");
      siteSqlf.setObject(1, "SITE", "SITEID", siteid);
      ownerSet.setWhere(siteSqlf.format());
      ownerSet.reset();
      if (!ownerSet.isEmpty()) ownerMbo = ownerSet.getMbo(0);
    } else if (orgid) {
      ownerSet = mxserver.getMboSet("ORGANIZATION", mxserver.getSystemUserInfo());
      var orgSqlf = new SqlFormat("orgid = :1");
      orgSqlf.setObject(1, "ORGANIZATION", "ORGID", orgid);
      ownerSet.setWhere(orgSqlf.format());
      ownerSet.reset();
      if (!ownerSet.isEmpty()) ownerMbo = ownerSet.getMbo(0);
    } else if (setid) {
      ownerSet = mxserver.getMboSet("SETS", mxserver.getSystemUserInfo());
      var setSqlf = new SqlFormat("setid = :1");
      setSqlf.setObject(1, "SETS", "SETID", setid);
      ownerSet.setWhere(setSqlf.format());
      ownerSet.reset();
      if (!ownerSet.isEmpty()) ownerMbo = ownerSet.getMbo(0);
    } else {
      ownerSet = mxserver.getMboSet("ORGANIZATION", mxserver.getSystemUserInfo());
      ownerSet.setWhere("1=1");
      ownerSet.reset();
      if (!ownerSet.isEmpty()) ownerMbo = ownerSet.getMbo(0);
    }

    if (!ownerMbo) {
      throw new MXApplicationException("#", "无法获取父 MBO 来创建自动键: " + autokeyname);
    }

    parentAutokeySet = ownerMbo.getMboSet("AUTOKEY");
    try {
      autokeyMbo = parentAutokeySet.add();
      saveSet = parentAutokeySet;
    } catch (e) {
      logger.warn("[" + scriptName + "] 通过父 MBO 创建失败, 尝试直接创建: " + (e.message || String(e)));
      autokeySet.setWhere("");
      autokeySet.reset();
      autokeyMbo = autokeySet.add();
      saveSet = autokeySet;
    }
    if (!autokeyMbo) {
      throw new MXApplicationException("#", "创建自动键失败: add() 返回 null");
    }

    autokeyMbo.setValue("AUTOKEYNAME", autokeyname, 11);
    if (siteid) {
      autokeyMbo.setValue("SITEID", siteid, 11);
      if (orgid) {
        autokeyMbo.setValue("ORGID", orgid, 11);
      } else {
        // 站点未提供组织时从 SITE 表取
        var derivedOrg = getOrgIdBySite(config, siteid);
        if (derivedOrg) {
          autokeyMbo.setValue("ORGID", derivedOrg, 11);
        }
      }
    } else if (orgid) {
      autokeyMbo.setValue("ORGID", orgid, 11);
      autokeyMbo.setValueNull("SITEID");
    } else if (setid) {
      autokeyMbo.setValue("SETID", setid, 11);
      autokeyMbo.setValueNull("ORGID");
      autokeyMbo.setValueNull("SITEID");
    } else {
      autokeyMbo.setValueNull("ORGID");
      autokeyMbo.setValueNull("SITEID");
      autokeyMbo.setValueNull("SETID");
    }
    created = true;

    updateAutokeyFields(autokeyMbo, seed, defaultSeed, prefix, langcode, created);
    applyDmDeploySet(saveSet, config);
    saveSet.save();
    debugPrint("created " + autokeyname + " site=" + siteid + " org=" + orgid + " set=" + setid);
    return { autokeyMbo: autokeyMbo, created: created };
  } finally {
    // 关闭 ownerSet 会同时关闭 parentAutokeySet
    if (ownerSet != null) {
      mboSetClose(ownerSet);
    }
  }
}

function findExistingMbo(autokeySet, autokeyname, siteid, orgid, setid) {
  var whereClause;
  if (siteid) {
    whereClause = "autokeyname = :1 and siteid = :2";
  } else if (orgid) {
    whereClause = "autokeyname = :1 and orgid = :2";
  } else if (setid) {
    whereClause = "autokeyname = :1 and setid = :2";
  } else {
    whereClause = "autokeyname = :1 and siteid is null and orgid is null and setid is null";
  }
  var sqlf = new SqlFormat(whereClause);
  sqlf.setObject(1, "AUTOKEY", "AUTOKEYNAME", autokeyname);
  if (siteid) {
    sqlf.setObject(2, "AUTOKEY", "SITEID", siteid);
  } else if (orgid) {
    sqlf.setObject(2, "AUTOKEY", "ORGID", orgid);
  } else if (setid) {
    sqlf.setObject(2, "AUTOKEY", "SETID", setid);
  }
  autokeySet.setWhere(sqlf.format());
  autokeySet.reset();
  if (!autokeySet.isEmpty()) {
    return autokeySet.getMbo(0);
  }
  return null;
}

function getOrgIdBySite(config, siteid) {
  var siteSet = null;
  try {
    siteSet = mxserver.getMboSet("SITE", mxserver.getSystemUserInfo());
    var sqlf = new SqlFormat("siteid = :1");
    sqlf.setObject(1, "SITE", "SITEID", siteid);
    siteSet.setWhere(sqlf.format());
    siteSet.reset();
    if (!siteSet.isEmpty()) {
      return siteSet.getMbo(0).getString("ORGID");
    }
    return null;
  } finally {
    mboSetClose(siteSet);
  }
}

/**
 * 更新自动键字段(参考 SKS_DEPLOY_AUTOKEY.updateAutokeyFields)
 *   seed: 存在时更新当前级别 SEED
 *   defaultSeed: 仅新建记录且未提供 seed 时写入 SEED
 */
function updateAutokeyFields(autokeyMbo, seed, defaultSeed, prefix, langcode, created) {
  if (seed !== null && seed !== undefined) {
    autokeyMbo.setValue("SEED", seed);
  }
  if (created && (seed === null || seed === undefined) && defaultSeed !== null && defaultSeed !== undefined) {
    autokeyMbo.setValue("SEED", defaultSeed);
  }
  if (prefix !== null && prefix !== undefined) {
    autokeyMbo.setValue("PREFIX", prefix);
  }
  if (langcode) {
    autokeyMbo.setValue("LANGCODE", String(langcode).toUpperCase());
  } else {
    try {
      if (autokeyMbo.isNull("LANGCODE")) {
        autokeyMbo.setValue("LANGCODE", _langcode || "EN");
      }
    } catch (e) {
      logger.warn("[" + scriptName + "] 设置 LANGCODE 默认值失败: " + (e.message || String(e)));
    }
  }
}

// ---------------------------------------------------------------------------
// MboSet / JDBC 工具
// ---------------------------------------------------------------------------

// 导入路径统一使用系统用户(参考 SKS_DEPLOY_AUTOKEY), 避免 API 调用用户对 AUTOKEY 应用无权限
function getAutokeySet(config) {
  return mxserver.getMboSet(OBJECT_NAME, mxserver.getSystemUserInfo());
}

function applyDmDeploySet(set, config) {
  if (config && config.dmDeploySet && set) {
    try { set.setDMDeploySet(true); } catch (ignored) { }
  }
}

function mboSetClose(set) {
  if (set != null) {
    try { set.cleanup(); } catch (ignored) { }
    try { set.close(); } catch (ignored) { }
  }
}

function getConnection(config) {
  var connKey = config._userInfo.getConnectionKey();
  return mxserver.getDBManager().getConnection(connKey);
}

function freeConnection(config, conn) {
  if (!conn) {
    return;
  }
  try {
    mxserver.getDBManager().freeConnection(config._userInfo.getConnectionKey(), conn);
  } catch (ignored) {
    try { conn.close(); } catch (e) { }
  }
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
