/**
 * SKS_MIGRATEAPI_MAXVARS - 系统变量(MAXVARS)迁移/维护接口(新模式)
 *
 * 接口:
 *   POST /maximo/api/script/SKS_MIGRATEAPI_MAXVARS?_action=query
 *        body: { varname, varvalue, vartype, orgid, siteid, where, pageNum, pageSize }
 *        → { maxvarsList:[ MAXVARS 行 ], total, pageNum, pageSize }
 *   POST ...?_action=detail[&maxvarsid=xxx | &varname=xxx]
 *        → { maxvarsList:[ ... ] }
 *   POST ...?_action=export[&where=...]  (不分页)
 *        body: { varname, varvalue, vartype, orgid, siteid, where, maxvarsIds:[...] }
 *        → { maxvarsList:[ ... ] }
 *   POST ...?_action=update
 *        body: { maxvarsid, varvalue } 或 { varname, orgid, siteid, varvalue }
 *        → { maxvarsList:[ 更新后的行 ], updated: true }
 *   POST ...?_action=import
 *        body: { "maxvarsList": [ ... ] }(兼容裸数组 / variables / maxvars)
 *        → 第 3 章行级统计(results[].sks:ref=VARNAME[@ORG/SITE])
 *
 * 参数:
 *   _langcode=ZH  会话语言
 *   _debug=true   返回 debugMsg
 *   _errorAssert=true 导入任一行失败立即中止
 *
 * 对象结构(导出):
 *   { VARNAME, VARVALUE, VARTYPE, ORGID, SITEID, MAXVARSID, "sks:ref", _status }
 *   根级列表统一使用「表名+List」: maxvarsList
 *
 * 说明:
 *   - 变量值更新逻辑参考 SKS_MAXVARS_MANAGE: 先 MaxVarService.put(varname, null, varvalue)
 *     刷新缓存服务, 再按 MAXVARSID/变量键定位 MAXVARS 行 setValue("VARVALUE") 并 save。
 *   - VARVALUE 必须为字符串, 否则 put 时抛 ClassCastException(缓存按 String 读取)。
 *   - 导入只更新已存在的变量行, 不新增变量(WORKORDER 等对象无 VARTYPE 时无法校验)。
 *   - `_delete=true` 时按定位到的行删除; `_updateIgnored=true` 时不覆盖已有值。
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

var OBJECT_NAME = "MAXVARS";

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
  if (action === "update" || action === "save") {
    return doUpdate(config);
  }
  if (action === "import") {
    return doImport(config);
  }
  throw new MXApplicationException("#", "未知 _action: " + action + " (可用: query/detail/export/update/import)");
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
    _debug: paramDebug,
    _errorAssert: isTrue(bodyOrParamValue(body, "_errorAssert"))
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
      return { maxvarsList: parsed };
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

/** 保留空串(变量值允许为空), 仅把 undefined/null 视为未传 */
function bodyOrParamRaw(body, names) {
  if (body) {
    for (var i = 0; i < names.length; i++) {
      var v = body[names[i]];
      if (v !== undefined && v !== null) {
        return v;
      }
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

function toLongString(value) {
  var s = String(value === null || typeof value === "undefined" ? "" : value).trim();
  if (!/^-?\d+$/.test(s)) {
    throw new MXApplicationException("#", "ID 不是合法数字: " + s);
  }
  return s;
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

function errText(e) {
  var msg = "";
  try {
    msg = sksLogAnsiUtils ? sksLogAnsiUtils.getErrorMessage(e) : String(e && e.message ? e.message : e);
  } catch (ignored) {
    msg = String(e);
  }
  // 去掉 MXApplicationException 消息前的 ## 前缀
  return String(msg).replace(/^#+\s*/, "");
}

// ---------------------------------------------------------------------------
// 查询条件
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

function validateWhere(where) {
  var upper = String(where).toUpperCase();
  if (upper.indexOf(";") >= 0 || upper.indexOf("--") >= 0 || upper.indexOf("/*") >= 0) {
    throw new MXApplicationException("#", "where 含非法字符");
  }
  return where;
}

function buildWhere(config) {
  var conds = [];
  var where = bodyOrParam(config, ["where"]);
  if (where !== null) {
    conds.push("(" + validateWhere(String(where)) + ")");
  }
  var ids = bodyIdArray(config, ["maxvarsIds", "_maxvarsIds"]);
  if (ids.length > 0) {
    conds.push("MAXVARS.MAXVARSID in (" + ids.join(",") + ")");
  }
  var varname = bodyOrParam(config, ["varname", "VARNAME"]);
  var varvalue = bodyOrParam(config, ["varvalue", "VARVALUE", "value", "VALUE"]);
  var vartype = bodyOrParam(config, ["vartype", "VARTYPE"]);
  var orgid = bodyOrParam(config, ["orgid", "ORGID"]);
  var siteid = bodyOrParam(config, ["siteid", "SITEID"]);
  if (varname !== null) {
    conds.push(likeCond("varname", String(varname)));
  }
  if (varvalue !== null) {
    conds.push(likeCond("varvalue", String(varvalue)));
  }
  if (vartype !== null) {
    conds.push("upper(vartype) = '" + escapeSql(String(vartype).toUpperCase()) + "'");
  }
  if (orgid !== null) {
    conds.push("upper(orgid) = '" + escapeSql(String(orgid).toUpperCase()) + "'");
  }
  if (siteid !== null) {
    conds.push("upper(siteid) = '" + escapeSql(String(siteid).toUpperCase()) + "'");
  }
  return conds.length > 0 ? conds.join(" and ") : "1=1";
}

/** 读取 MAXVARSID 数组(body 数组 / 逗号分隔字符串 / URL 参数), 只保留数字 */
function bodyIdArray(config, names) {
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
    var s = String(raw[j] === null || raw[j] === undefined ? "" : raw[j]).trim();
    if (/^-?\d+$/.test(s) && list.indexOf(s) < 0) {
      list.push(s);
    }
  }
  return list;
}

function buildDetailWhere(config) {
  var id = bodyOrParam(config, ["maxvarsid", "MAXVARSID", "id"]);
  if (id !== null) {
    return "maxvarsid = " + toLongString(id);
  }
  return buildWhere(config);
}

/**
 * 按变量键定位行: MAXVARSID 优先, 否则 VARNAME + ORGID + SITEID(空即 is null)
 */
function buildVarKeyWhere(row) {
  var id = row.MAXVARSID !== undefined ? row.MAXVARSID : row.maxvarsid;
  if (id !== undefined && id !== null && String(id).trim() !== "") {
    return "maxvarsid = " + toLongString(id);
  }
  var varname = row.VARNAME !== undefined ? row.VARNAME : row.varname;
  varname = String(varname === null || varname === undefined ? "" : varname).trim();
  if (varname === "") {
    throw new MXApplicationException("#", "VARNAME 不能为空");
  }
  var conds = ["upper(varname) = '" + escapeSql(varname.toUpperCase()) + "'"];
  var orgid = row.ORGID !== undefined ? row.ORGID : row.orgid;
  var siteid = row.SITEID !== undefined ? row.SITEID : row.siteid;
  if (siteid !== undefined && siteid !== null && String(siteid).trim() !== "") {
    conds.push("upper(siteid) = '" + escapeSql(String(siteid).trim().toUpperCase()) + "'");
  } else {
    conds.push("siteid is null");
  }
  if (orgid !== undefined && orgid !== null && String(orgid).trim() !== "") {
    conds.push("upper(orgid) = '" + escapeSql(String(orgid).trim().toUpperCase()) + "'");
  } else {
    conds.push("orgid is null");
  }
  return conds.join(" and ");
}

// ---------------------------------------------------------------------------
// 查询 / 详情 / 导出
// ---------------------------------------------------------------------------

function doQuery(config) {
  var where = buildWhere(config);
  var pageNum = toInt(bodyOrParam(config, ["pageNum", "page"]), 0);
  var pageSize = toInt(bodyOrParam(config, ["pageSize", "limit"]), 0);
  var paginated = pageNum > 0 && pageSize > 0;
  var page = paginated ? { pageNum: pageNum, pageSize: pageSize } : null;

  var found = queryVars(config, where, page);
  debugPrint("query maxvars=" + found.maxvarsList.length + ", total=" + found.total);

  var result = { maxvarsList: found.maxvarsList, total: found.total };
  if (paginated) {
    result.pageNum = pageNum;
    result.pageSize = pageSize;
  }
  return result;
}

function doDetail(config) {
  var found = queryVars(config, buildDetailWhere(config), null);
  return { maxvarsList: found.maxvarsList };
}

function doExport(config) {
  var found = queryVars(config, buildWhere(config), null);
  debugPrint("export maxvars=" + found.maxvarsList.length);
  return { maxvarsList: found.maxvarsList };
}

function createVarSet(config, where) {
  var set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
  set.setFlag(MboConstants.DISCARDABLE, true);
  if (where !== null && where !== undefined && String(where) !== "") {
    set.setWhere(String(where));
  }
  set.setOrderBy("varname, orgid, siteid");
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

function queryVars(config, where, page) {
  var set = null;
  var rows = [];
  var total = 0;
  try {
    set = createVarSet(config, where);
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
        rows.push(buildVarRow(mbo));
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
  return { maxvarsList: rows, total: total };
}

function buildVarRow(mbo) {
  var row = {
    VARNAME: mboStr(mbo, "VARNAME"),
    VARVALUE: mboRawStr(mbo, "VARVALUE"),
    VARTYPE: mboStr(mbo, "VARTYPE"),
    ORGID: mboStr(mbo, "ORGID"),
    SITEID: mboStr(mbo, "SITEID"),
    MAXVARSID: mboLongValue(mbo, "MAXVARSID")
  };
  row["sks:ref"] = buildRef(row);
  row._status = "success";
  return row;
}

function buildRef(row) {
  var ref = row.VARNAME || "";
  if (row.SITEID) {
    ref += "@SITE:" + row.SITEID;
  } else if (row.ORGID) {
    ref += "@ORG:" + row.ORGID;
  }
  return ref;
}

function mboStr(mbo, attr) {
  try {
    var v = mbo.getString(attr);
    return v === null || String(v) === "" ? null : String(v);
  } catch (ignored) {
    return null;
  }
}

/** 保留空串(如变量值允许为空) */
function mboRawStr(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : String(mbo.getString(attr));
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

// ---------------------------------------------------------------------------
// 更新变量值(参考 SKS_MAXVARS_MANAGE)
// ---------------------------------------------------------------------------

function doUpdate(config) {
  var body = config._body || {};
  var varvalueRaw = bodyOrParamRaw(body, ["varvalue", "VARVALUE", "value", "VALUE"]);
  if (varvalueRaw === null) {
    throw new MXApplicationException("#", "varvalue 不能为空");
  }
  var varvalue = String(varvalueRaw);
  var id = bodyOrParam(config, ["maxvarsid", "MAXVARSID", "id"]);
  var varname = bodyOrParam(config, ["varname", "VARNAME"]);

  var where = null;
  if (id !== null) {
    where = "maxvarsid = " + toLongString(id);
  } else if (varname !== null) {
    var keyRow = {
      VARNAME: varname,
      ORGID: bodyOrParamRaw(body, ["orgid", "ORGID"]),
      SITEID: bodyOrParamRaw(body, ["siteid", "SITEID"])
    };
    where = buildVarKeyWhere(keyRow);
  } else {
    throw new MXApplicationException("#", "需要 maxvarsid 或 varname 定位变量");
  }

  var set = null;
  try {
    set = createVarSet(config, where);
    var mbo = set.isEmpty() ? null : set.getMbo(0);
    if (!mbo) {
      throw new MXApplicationException("#", "变量不存在: " + where);
    }
    updateVarValue(mbo, set, varvalue);
    var row = buildVarRow(mbo);
    row.VARVALUE = varvalue;
    debugPrint("update " + row["sks:ref"] + " => " + varvalue);
    var result = { maxvarsList: [row], updated: true };
    result["sks:successSumTotal"] = 1;
    return result;
  } finally {
    closeSet(set);
  }
}

/**
 * 与 SKS_MAXVARS_MANAGE 一致: 先写 MAXVARS.VARVALUE 并保存, 再刷新 MaxVarService 缓存。
 * 部分 Maximo 版本 MAXVARS 对象只读, MBO save() 不落库, 此时改用 JDBC 直接更新同一行。
 */
function updateVarValue(mbo, set, varvalue) {
  var varname = String(mbo.getString("VARNAME"));
  var orgid = mboStr(mbo, "ORGID");
  var maxvarsid = mbo.getLong("MAXVARSID");
  if (varvalue.length > 254) {
    throw new MXApplicationException("#", "变量值长度不能超过 254: " + varname);
  }
  // MaxVarsSet 在 init 中可能给行打上 READONLY(NOADD|NOUPDATE|NODELETE) 等标记
  try { set.setFlags(0); } catch (ignoredFlag0) { }
  try { set.setFlag(MboConstants.READONLY, false); } catch (ignoredFlag1) { }
  try { mbo.setFlag(MboConstants.READONLY, false); } catch (ignoredFlag2) { }
  try {
    mbo.setValue("VARVALUE", varvalue);
    set.save();
  } catch (e) {
    var msg = errText(e);
    if (msg.indexOf("BMXAA0031E") >= 0 || msg.indexOf("read only") >= 0) {
      logger.warn("[" + scriptName + "] MAXVARS 为只读对象, 改用 JDBC 更新: " + varname);
    } else {
      throw e;
    }
  }
  // MAXVARS 只读版本 save() 不会报错但也不落库, 统一用 JDBC 再写一次保证持久化
  updateVarValueByJdbc(maxvarsid, varvalue);
  refreshMaxVarsCache(varname, orgid, siteid, varvalue);
}

/** 通过 DBManager 的 sequence 连接直接更新 MAXVARS(绕过只读 MBO) */
function updateVarValueByJdbc(maxvarsid, varvalue) {
  var conn = null;
  var stmt = null;
  try {
    conn = mxserver.getDBManager().getSequenceConnection();
    stmt = conn.createStatement();
    var sql = "update maxvars set varvalue = '" + escapeSql(varvalue) + "' where maxvarsid = " + maxvarsid;
    var count = stmt.executeUpdate(sql);
    if (count <= 0) {
      throw new MXApplicationException("#", "未更新到 MAXVARS 行: maxvarsid=" + maxvarsid);
    }
    debugPrint("JDBC 更新 MAXVARS: " + sql + " -> " + count);
  } finally {
    try { if (stmt) stmt.close(); } catch (ignoredStmt) { }
    try { if (conn) conn.close(); } catch (ignoredConn) { }
  }
}

/** 刷新 MaxVarService 内存缓存, 使后续 getString 立即生效 */
function refreshMaxVarsCache(varname, orgid, siteid, varvalue) {
  try {
    mxserver.reloadMaximoCache("MAXVARS", true);
  } catch (e) {
    logger.warn("[" + scriptName + "] reloadMaximoCache(MAXVARS) 失败: " + errText(e));
    try {
      mxserver.lookup("MAXVARS").put(varname, orgid, varvalue);
    } catch (ignoredPut) { }
  }
}

// ---------------------------------------------------------------------------
// 导入(只更新已存在的变量值)
// ---------------------------------------------------------------------------

/** 导入结果展示用 ref: 优先 sks:ref / VARNAME, 仅有 MAXVARSID 时显示 MAXVARSID:<id> */
function buildInputRef(input) {
  if (!input || typeof input !== "object") return "";
  var ref = input["sks:ref"] || input.VARNAME || input.varname;
  if (!ref) {
    var id = input.MAXVARSID !== undefined ? input.MAXVARSID : input.maxvarsid;
    if (id !== undefined && id !== null && String(id) !== "") ref = "MAXVARSID:" + id;
  }
  return ref ? String(ref) : "";
}

function doImport(config) {
  var body = config._body || {};
  var list = body.maxvarsList || body.maxvars || body.variables;
  if (!(list instanceof Array) || list.length === 0) {
    throw new MXApplicationException("#", "maxvarsList 必须为非空数组");
  }
  var merged = {
    total: list.length,
    updated: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
    results: [],
    "sks:successSumTotal": 0,
    "sks:failSumTotal": 0
  };
  for (var i = 0; i < list.length; i++) {
    var input = list[i];
    var item = { "sks:ref": buildInputRef(input), _status: "failed", _operation: "none" };
    try {
      var outcome = importVar(config, input);
      item._status = outcome.status;
      item._operation = outcome.operation;
      if (outcome.operation === "updated") {
        merged.updated++;
      } else if (outcome.operation === "deleted") {
        merged.deleted++;
      } else if (outcome.status === "skipped") {
        merged.skipped++;
      }
    } catch (e) {
      item._status = "failed";
      item._message = errText(e);
      logger.error("[" + scriptName + "] 导入变量失败: " + item["sks:ref"] + " - " + item._message);
    }
    if (item._status === "failed") {
      merged.failed++;
      merged["sks:failSumTotal"]++;
    } else {
      merged["sks:successSumTotal"]++;
    }
    merged.results.push(item);
    debugPrint("import " + item["sks:ref"] + " => " + item._status + " " + (item._operation || "") + " " + (item._message || ""));
  }
  if (config._errorAssert && merged.failed > 0) {
    throw new MXApplicationException("#", "导入存在 " + merged.failed + " 条失败, 详见 results");
  }
  return merged;
}

function importVar(config, row) {
  if (!row || typeof row !== "object") {
    throw new MXApplicationException("#", "变量对象不合法");
  }
  var varvalueRaw = row.VARVALUE !== undefined ? row.VARVALUE : row.varvalue;
  if (varvalueRaw === undefined || varvalueRaw === null) {
    throw new MXApplicationException("#", "VARVALUE 不能为空");
  }
  var varvalue = String(varvalueRaw);
  var set = null;
  try {
    set = createVarSet(config, buildVarKeyWhere(row));
    var mbo = set.isEmpty() ? null : set.getMbo(0);
    if (isTrue(row._delete)) {
      if (!mbo) {
        return { status: "skipped", operation: "none" };
      }
      mbo.delete();
      set.save();
      return { status: "success", operation: "deleted" };
    }
    if (!mbo) {
      throw new MXApplicationException("#", "变量不存在(导入只更新已有变量): " + (row.VARNAME || row.varname));
    }
    if (isTrue(row._updateIgnored)) {
      return { status: "skipped", operation: "none" };
    }
    var oldValue = "";
    try { oldValue = String(mbo.getString("VARVALUE") || ""); } catch (ignored) { }
    if (oldValue === varvalue) {
      return { status: "skipped", operation: "none" };
    }
    updateVarValue(mbo, set, varvalue);
    return { status: "success", operation: "updated" };
  } finally {
    closeSet(set);
  }
}
