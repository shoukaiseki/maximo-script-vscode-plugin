// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable no-undef */
// @ts-nocheck
// 安全组(MAXGROUP 及子表授权) 查询 / 导出 / 导入接口
//
// 调用方式:
//   GET/POST /maximo/api/script/SKS_MIGRATEAPI_SECURGROUP?_action=query
//        body: { groupname, description, where, pageNum, pageSize }
//        → { groups:[ 主记录行(含 appcount/sitecount/usercount) ], total, pageNum, pageSize }
//   GET/POST ...?_action=detail&groupname=xxx  (或 body: { groupnames:[...] })
//        → { groups:[ 完整对象(含子表数组) ] }
//   GET/POST ...?_action=export[&where=...|&groupname=...]  (不分页)
//        → { groups:[ 完整对象(含子表数组) ] }
//   POST ...?_action=import  body: { "groups": [ 完整对象... ] }
//        主记录经 SKS_MIGRATE_MAXGROUP.changeMbo 处理(支持 _ignoreMain/_delete);
//        子表数组按键匹配 upsert, 行内 _delete=true 删除该行
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
//     SITEAUTH: [ {SITEID, ORGID, ...}, ... ],
//     LOCAUTH: [...], LABORAUTH: [...], APPLICATIONAUTH: [...], GLAUTH: [...],
//     GROUPUSER: [...], GRPREASSIGNAUTH: [...], LIMITTOLERANCE: [...],
//     SECURITYRESTRICT: [...], CTRLGROUP: [...], COLLECTIONAUTH: [...],
//     DASHBOARDAUTH: [...], REPFACAUTH: [ ... ],
//     子表行内可加 _delete: true 删除该行
//   }

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
      return { groups: parsed };
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
  var result = { groups: rows, total: total };
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
    return { groups: groups };
  } finally {
    freeConnection(config, conn);
  }
}

/**
 * detail 专用: 为 APPLICATIONAUTH 行附加虚拟字段
 *   sks:appdescription  应用中文名(L_MAXAPPS 当前语言, 回退 MAXAPPS 英文描述)
 *   sks:sigdescription  签名描述(L_SIGOPTION 当前语言, 回退 SIGOPTION 英文描述)
 * sks: 前缀键导入时被忽略, 不影响迁移; 表不存在(未启用多语言)时自动跳过
 */
function attachSigDescriptions(conn, group) {
  var rows = group && group.APPLICATIONAUTH;
  if (!rows || rows.length === 0) {
    return;
  }
  var seen = {};
  var inList = [];
  for (var i = 0; i < rows.length; i++) {
    var app = rows[i].APP;
    if (app && !seen[String(app)]) {
      seen[String(app)] = true;
      inList.push("'" + String(app).replace(/'/g, "''") + "'");
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
  for (var k = 0; k < rows.length; k++) {
    var appDesc = appMap[String(rows[k].APP)];
    if (appDesc) {
      rows[k]["sks:appdescription"] = appDesc;
    }
    var sigDesc = sigMap[String(rows[k].APP) + "|" + String(rows[k].OPTIONNAME)];
    if (sigDesc) {
      rows[k]["sks:sigdescription"] = sigDesc;
    }
  }
}

function doExport(config) {
  var names = resolveGroupNames(config);
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
        groups.push(g);
      }
    }
    debugPrint("export groups=" + groups.length);
    return { groups: groups };
  } finally {
    freeConnection(config, conn);
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
    group[rel.name] = queryRows(conn,
      "select * from " + rel.name + " where groupname = '" + groupname + "' order by 1");
  }
  return group;
}

// ---------------------------------------------------------------------------
// 导入
// ---------------------------------------------------------------------------

function doImport(config) {
  var body = config._body || {};
  var groups = body.groups;
  if (!(groups instanceof Array) || groups.length === 0) {
    throw new MXApplicationException("#", "groups 必须为非空数组");
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

  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    var groupname = group ? String(group.GROUPNAME || group.groupname || "").trim() : "";
    var item = { "sks:ref": groupname, _status: "failed", _operation: "none", children: {} };
    try {
      importGroup(config, group, item);
    } catch (e) {
      item._status = "failed";
      item._message = String((e && e.message) ? e.message : e);
      logger.error("[" + scriptName + "] 导入组失败: " + groupname, e);
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

  if (config._errorAssert && merged.failed > 0) {
    throw new MXApplicationException("#", "导入存在 " + merged.failed + " 条失败, 详见 results");
  }
  return merged;
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

  // 1. 主记录(含 _ignoreMain 逻辑, 在 SKS_MIGRATE_MAXGROUP 中实现)
  var mainConfig = {
    _userInfo: config._userInfo,
    _debug: config._debug,
    dmDeploySet: config.dmDeploySet
  };
  var mainResult = svc.invokeScript("SKS_MIGRATE_MAXGROUP").changeMbo(mainConfig, group);
  mainResult = toJsObject(mainResult);
  item._operation = mainResult ? String(mainResult._operation || "none") : "none";
  if (!mainResult || mainResult._status !== "success") {
    item._message = mainResult ? String(mainResult._message || "主记录处理失败") : "主记录处理失败";
    return;
  }
  if (mainResult._operation === "added") {
    item.added = 1;
  } else if (mainResult._operation === "updated") {
    item.updated = 1;
  } else if (mainResult._operation === "deleted") {
    item.deleted = 1;
  }
  item._ignoreMain = isTrue(group._ignoreMain);

  // _delete 已删除主记录, 不再处理子表
  if (mainResult._operation === "deleted") {
    item._status = "success";
    return;
  }

  // 2. 子表授权数据
  var childAdded = 0, childUpdated = 0, childDeleted = 0, childFailed = 0;
  for (var i = 0; i < REL_CONFIG.length; i++) {
    var rel = REL_CONFIG[i];
    var rows = group[rel.name];
    if (!(rows instanceof Array)) {
      continue;
    }
    var stat = syncChildren(config, groupname, rel, rows);
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

/**
 * 子表同步: 按键匹配 upsert, 行内 _delete=true 删除
 * @returns {{added:number,updated:number,deleted:number,failed:number,errors:Array}}
 */
function syncChildren(config, groupname, rel, rows) {
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
          nm.setValue("GROUPNAME", groupname);
          applyChildFields(nm, row, rel.keys, true);
          stat.added++;
        }
      } catch (e) {
        stat.failed++;
        stat.errors.push(rel.name + "[" + i + "] " + String((e && e.message) ? e.message : e));
        logger.warn("[" + scriptName + "] " + rel.name + " 行处理失败: " + JSON.stringify(row), e);
      }
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

function findByKeys(set, keys, row) {
  var it = set.iterator();
  while (it.hasNext()) {
    var m = it.next();
    if (m.isDeleted()) {
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

function applyChildFields(mbo, row, keys, isNew) {
  var uniqueIdName = String(mbo.getUniqueIDName() || "").toUpperCase();
  for (var key in row) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
    if (key.charAt(0) === "_" || key.indexOf(":") >= 0) continue;
    var upper = String(key).toUpperCase();
    if (upper === "ROWSTAMP" || upper === uniqueIdName) continue;
    if (upper === "GROUPNAME") continue; // 新增时已显式设置
    if (!isNew && keys.indexOf(upper) >= 0) continue; // 更新不改键

    var value = row[key];
    if (value === undefined) continue;
    var field = null;
    try {
      field = mbo.getMboField(upper);
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
