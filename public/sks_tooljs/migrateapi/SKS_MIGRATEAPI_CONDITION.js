/**
 * SKS_MIGRATEAPI_CONDITION - 条件表达式(CONDITION)迁移接口(新模式)
 *
 * 接口:
 *   GET/POST /maximo/api/script/SKS_MIGRATEAPI_CONDITION?_action=query
 *        body: { conditionnum, description, type, expression, where, pageNum, pageSize }
 *        → { conditionList:[ CONDITION 行 ], total, pageNum, pageSize }
 *   GET/POST ...?_action=detail&conditionnum=xxx  (或 body: { conditionnums:[...] })
 *        → { conditionList:[ ... ] }
 *   GET/POST ...?_action=export[&where=...|&conditionnum=...]  (不分页)
 *        → { conditionList:[ ... ] }
 *   POST ...?_action=import  body: { "conditionList": [ CONDITION 行... ] }
 *        按 CONDITIONNUM upsert; 行内 _delete=true 删除
 *        → { total, added, updated, deleted, failed, results, sks:successSumTotal, sks:failSumTotal }
 *   _langcode=ZH      设置会话语言
 *   _debug=true       返回 debugMsg
 *   _errorAssert=true 存在失败时抛出异常
 *   dmDeploySet=true  导入时 MboSet.setDMDeploySet(true)(迁移模式)
 *
 * 对象结构(导出/导入一致):
 *   {
 *     CONDITIONNUM, TYPE, EXPRESSION, CLASSNAME, DESCRIPTION, NOCACHING,
 *     _delete: true   // 可选: 删除该条件
 *   }
 *   根级列表统一使用「表名+List」: conditionList
 */
/** @type {psdi.util.MXApplicationException} */
var MXApplicationException = Java.type("psdi.util.MXApplicationException");
/** @type {psdi.server.MXServer} */
var MXServer = Java.type("psdi.server.MXServer");

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

var OBJECT_NAME = "CONDITION";
// 条件表字段(不含自动编号 CONDITIONID / 引用计数 REFCOUNT / 行版本 ROWSTAMP;
// BOOLEANNOCACHING、EXPORCLASS 为非持久虚拟字段, 不参与导出导入)
var MAIN_COLUMNS = ["CONDITIONNUM", "TYPE", "EXPRESSION", "CLASSNAME", "DESCRIPTION", "NOCACHING"];
var MAIN_SKIP_FIELDS = ["ROWSTAMP", "CONDITIONID", "REFCOUNT", "BOOLEANNOCACHING", "EXPORCLASS"];

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
      return { conditionList: parsed };
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

// ---------------------------------------------------------------------------
// 查询
// ---------------------------------------------------------------------------

function buildWhere(config) {
  var where = bodyOrParam(config, ["where"]);
  if (where !== null) {
    return validateWhere(String(where));
  }
  var conds = [];
  var conditionnum = bodyOrParam(config, ["conditionnum", "CONDITIONNUM"]);
  var description = bodyOrParam(config, ["description", "DESCRIPTION"]);
  var type = bodyOrParam(config, ["type", "TYPE"]);
  var expression = bodyOrParam(config, ["expression", "EXPRESSION"]);
  if (conditionnum !== null) {
    conds.push("upper(conditionnum) like '%" + escapeSql(String(conditionnum).toUpperCase()) + "%'");
  }
  if (description !== null) {
    conds.push("upper(description) like '%" + escapeSql(String(description).toUpperCase()) + "%'");
  }
  if (type !== null) {
    conds.push("upper(type) like '%" + escapeSql(String(type).toUpperCase()) + "%'");
  }
  if (expression !== null) {
    conds.push("upper(expression) like '%" + escapeSql(String(expression).toUpperCase()) + "%'");
  }
  return conds.length > 0 ? conds.join(" and ") : "1=1";
}

function validateWhere(where) {
  var upper = String(where).toUpperCase();
  if (upper.indexOf(";") >= 0 || upper.indexOf("--") >= 0 || upper.indexOf("/*") >= 0) {
    throw new MXApplicationException("#", "where 含非法字符");
  }
  return where;
}

function resolveNumbers(config) {
  var nums = [];
  var single = bodyOrParam(config, ["conditionnum", "CONDITIONNUM"]);
  if (single !== null) {
    nums.push(String(single));
  }
  var list = bodyOrParam(config, ["conditionnums", "conditionList"]);
  if (list instanceof Array) {
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var n = (item && typeof item === "object") ? item.CONDITIONNUM : item;
      if (n !== null && n !== undefined && String(n) !== "") {
        nums.push(String(n));
      }
    }
  }
  return nums;
}

function doQuery(config) {
  var where = buildWhere(config);
  var pageNum = toInt(bodyOrParam(config, ["pageNum", "page"]), 0);
  var pageSize = toInt(bodyOrParam(config, ["pageSize", "limit"]), 0);
  var paginated = pageNum > 0 && pageSize > 0;

  var sql = "select " + MAIN_COLUMNS.join(",") +
    " from condition where " + where + " order by conditionnum";
  var countSql = "select count(*) from condition where " + where;

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
  } finally {
    freeConnection(config, conn);
  }
  var result = { conditionList: rows, total: total };
  if (paginated) {
    result.pageNum = pageNum;
    result.pageSize = pageSize;
  }
  return result;
}

function doDetail(config) {
  var nums = resolveNumbers(config);
  var where;
  if (nums.length > 0) {
    var inList = [];
    for (var i = 0; i < nums.length; i++) {
      inList.push("'" + escapeSql(nums[i]) + "'");
    }
    where = "conditionnum in (" + inList.join(",") + ")";
  } else {
    where = buildWhere(config);
  }
  var conn = null;
  try {
    conn = getConnection(config);
    return {
      conditionList: queryRows(conn, "select " + MAIN_COLUMNS.join(",") +
        " from condition where " + where + " order by conditionnum")
    };
  } finally {
    freeConnection(config, conn);
  }
}

function doExport(config) {
  var nums = resolveNumbers(config);
  var where;
  if (nums.length > 0) {
    var inList = [];
    for (var i = 0; i < nums.length; i++) {
      inList.push("'" + escapeSql(nums[i]) + "'");
    }
    where = "conditionnum in (" + inList.join(",") + ")";
  } else {
    where = buildWhere(config);
  }
  var conn = null;
  try {
    conn = getConnection(config);
    var rows = queryRows(conn, "select " + MAIN_COLUMNS.join(",") +
      " from condition where " + where + " order by conditionnum");
    debugPrint("export conditions=" + rows.length);
    return { conditionList: rows };
  } finally {
    freeConnection(config, conn);
  }
}

// ---------------------------------------------------------------------------
// 导入
// ---------------------------------------------------------------------------

function doImport(config) {
  var body = config._body || {};
  var list = body.conditionList || body.conditions;
  if (!(list instanceof Array) || list.length === 0) {
    throw new MXApplicationException("#", "conditionList 必须为非空数组");
  }
  var merged = {
    total: list.length,
    added: 0,
    updated: 0,
    deleted: 0,
    failed: 0,
    results: [],
    "sks:successSumTotal": 0,
    "sks:failSumTotal": 0
  };
  for (var i = 0; i < list.length; i++) {
    var row = list[i];
    var conditionnum = row ? String(row.CONDITIONNUM || row.conditionnum || "").trim() : "";
    var item = { "sks:ref": conditionnum, _status: "failed", _operation: "none" };
    try {
      item._operation = importCondition(config, row, conditionnum);
      item._status = "success";
      if (item._operation === "added") {
        merged.added++;
      } else if (item._operation === "updated") {
        merged.updated++;
      } else if (item._operation === "deleted") {
        merged.deleted++;
      }
    } catch (e) {
      item._status = "failed";
      item._message = errText(e);
      logger.error("[" + scriptName + "] 导入条件失败: " + conditionnum + " - " + errText(e));
    }
    if (item._status === "success") {
      merged["sks:successSumTotal"]++;
    } else {
      merged.failed++;
      merged["sks:failSumTotal"]++;
    }
    merged.results.push(item);
    debugPrint("import " + conditionnum + " => " + item._status + " " + (item._message || ""));
  }
  if (config._errorAssert && merged.failed > 0) {
    throw new MXApplicationException("#", "导入存在 " + merged.failed + " 条失败, 详见 results");
  }
  return merged;
}

function importCondition(config, row, conditionnum) {
  if (!row || typeof row !== "object") {
    throw new MXApplicationException("#", "条件对象不合法");
  }
  if (!conditionnum) {
    throw new MXApplicationException("#", "CONDITIONNUM 不能为空");
  }
  var set = null;
  try {
    set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
    set.setWhere("conditionnum = '" + escapeSql(conditionnum) + "'");
    set.reset();
    var mbo = set.isEmpty() ? null : set.getMbo(0);
    if (isTrue(row._delete)) {
      if (!mbo) {
        return "none";
      }
      mbo.delete();
      saveSet(set, config);
      return "deleted";
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
      if (upper === "CONDITIONNUM" || MAIN_SKIP_FIELDS.indexOf(upper) >= 0) continue;
      var value = row[key];
      if (value === null || typeof value === "undefined") continue;
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
        if (oldValue === String(value)) {
          continue;
        }
      }
      setConditionValue(mbo, upper, value);
    }
    saveSet(set, config);
    return isNew ? "added" : "updated";
  } finally {
    if (set != null) {
      try { set.close(); } catch (ignored) { }
    }
  }
}

function saveSet(set, config) {
  if (config && isTrue(config.dmDeploySet)) {
    try { set.setDMDeploySet(true); } catch (ignored) { }
  }
  set.save();
}

function setConditionValue(mbo, attr, value) {
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
    try {
      mxserver.getDBManager().freeConnection(connKey, conn);
    } catch (ignored) {
    }
  }
  return conn;
}

function isConnClosed(conn) {
  try {
    return !conn || conn.isClosed();
  } catch (e) {
    return true;
  }
}

function freeConnection(config, conn) {
  // 同会话连接由 Maximo 统一回收, 这里不主动 closed, 避免 -4470
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
