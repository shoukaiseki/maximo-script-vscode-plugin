/**
 * SKS_MIGRATEAPI_DOMAIN - 域(MAXDOMAIN 及域值子表) 查询 / 导出 / 导入接口(新模式)
 *
 * 调用方式:
 *   GET/POST /maximo/api/script/SKS_MIGRATEAPI_DOMAIN?_action=query
 *        body: { domainid, domaintype, description, where, pageNum, pageSize }
 *        → { domainList:[ 主记录行 ], total, pageNum, pageSize }
 *   GET/POST ...?_action=detail&domainid=xxx  (或 body: { domainids:[...] })
 *        → { domainList:[ 完整对象(含 _skschild_ 子表数组) ] }
 *   GET/POST ...?_action=export[&where=...|&domainid=...]  (不分页)
 *        → { domainList:[ 完整对象(含 _skschild_ 子表数组) ] }
 *   POST ...?_action=import  body: { "domainList": [ 完整对象... ],
 *                                   "_ignoreList": ["domainList"],
 *                                   "_deleteNotExists": ["domainList:_skschild_alndomain:alndomain"] }
 *        按 DOMAINID upsert; 行内 _delete=true 删除该域
 *        → { total, added, updated, deleted, failed, results,
 *            sks:successSumTotal, sks:failSumTotal, sks:ignoreSumTotal }
 *   _langcode=ZH       设置会话语言(description 取该语言译文)
 *   _allLangcode=true  多语言开关: 输出/导入 sks:langdata = { DESCRIPTION: { ZH: ... } }
 *   _debug=true        返回 debugMsg
 *   _errorAssert=true  存在失败时抛出异常
 *   dmDeploySet=true   导入时 MboSet.setDMDeploySet(true)(迁移模式)
 *
 * 对象结构(导出/导入一致, 字段名沿用 v1 SKS_EXPORT_DOMAIN / SKS_DEPLOY_DOMAIN):
 *   {
 *     domainid, domaintype, description, maxtype, length, scale, internal, nevercache,
 *     sks:ref: domainid, sks:objectName: "MAXDOMAIN",
 *     sks:langdata: { DESCRIPTION: { EN: "...", ZH: "..." } },
 *     _skschild_alndomain:      [ { value, description, orgid, siteid } ],
 *     _skschild_synonymdomain:  [ { maxvalue, value, description, defaults, orgid, siteid } ],
 *     _skschild_numericdomain:  [ { value, description, orgid, siteid } ],
 *     _skschild_numrangedomain: [ { rangesegment, rangeminimum, rangemaximum, rangeinterval, orgid, siteid } ],
 *     _skschild_tabledomain:    [ { objectname, validtnwhereclause, listwhereclause,
 *                                   errorresourcbundle, erroraccesskey, orgid, siteid,
 *                                   _skschild_crossoverdomain: [ { sourcefield, destfield, ... } ] } ],
 *     子级键兼容 v1 无前缀写法(alndomain / synonymdomain / ...)
 *   }
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
try {
  if (userInfo.getLangCode()) {
    _langcode = String(userInfo.getLangCode()).toUpperCase();
  }
} catch (ignored) { /* default EN */ }
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

var OBJECT_NAME = "MAXDOMAIN";
// 子级统一前缀: 返回 JSON 中子级键 = _skschild_ + 子表键
var CHILD_PREFIX = "_skschild_";
// 主记录字段(v1 字段名, 不含 MAXDOMAINID/CHANGED/ROWSTAMP)
var MAIN_COLUMNS = ["DOMAINID", "DOMAINTYPE", "DESCRIPTION", "MAXTYPE", "LENGTH", "SCALE", "INTERNAL", "NEVERCACHE"];
var MAIN_SKIP_FIELDS = ["ROWSTAMP", "MAXDOMAINID", "CHANGED", "LANGCODE"];

/**
 * 域值子表配置(按域类型):
 *   key       JSON 子级键(v1 字段名)
 *   rel       MAXDOMAIN 上的关系名(导入用)
 *   object    子对象名(sks:objectName)
 *   table     物理表名(导出用)
 *   idCol     子表主键(L_ 表 OWNERID 指向)
 *   lTable    L_ 多语言表(仅带 DESCRIPTION 的子表)
 *   cols      导出列(顺序即 JSON 字段顺序)
 *   keys      匹配键(不含 DOMAINID)
 */
var DOMAIN_CHILD_CONFIG = {
  ALN: [{
    key: "alndomain", rel: "ALNDOMAINVALUE", object: "ALNDOMAIN", table: "alndomain",
    idCol: "ALNDOMAINID", lTable: "L_ALNDOMAIN", descCol: "DESCRIPTION",
    cols: ["VALUE", "DESCRIPTION", "ORGID", "SITEID"], keys: ["VALUE"], keyCols: ["VALUE"]
  }],
  SYNONYM: [{
    key: "synonymdomain", rel: "SYNONYMDOMAIN", object: "SYNONYMDOMAIN", table: "synonymdomain",
    idCol: "SYNONYMDOMAINID", lTable: "L_SYNONYMDOMAIN", descCol: "DESCRIPTION",
    cols: ["MAXVALUE", "VALUE", "DESCRIPTION", "DEFAULTS", "ORGID", "SITEID"],
    keys: ["MAXVALUE", "VALUE"], keyCols: ["MAXVALUE", "VALUE"]
  }],
  NUMERIC: [{
    key: "numericdomain", rel: "NUMDOMAINVALUE", object: "NUMERICDOMAIN", table: "numericdomain",
    idCol: "NUMERICDOMAINID", lTable: "L_NUMERICDOMAIN", descCol: "DESCRIPTION",
    cols: ["VALUE", "DESCRIPTION", "ORGID", "SITEID"], keys: ["VALUE"], keyCols: ["VALUE"]
  }],
  NUMRANGE: [{
    key: "numrangedomain", rel: "RANGEDOMSEGMENT", object: "NUMRANGEDOMAIN", table: "numrangedomain",
    idCol: "NUMRANGEDOMAINID", lTable: null, descCol: null,
    cols: ["RANGESEGMENT", "RANGEMINIMUM", "RANGEMAXIMUM", "RANGEINTERVAL", "ORGID", "SITEID"],
    keys: ["RANGESEGMENT"], keyCols: ["RANGESEGMENT"]
  }],
  TABLE: [{
    key: "tabledomain", rel: "MAXTABLEDOMAIN", object: "MAXTABLEDOMAIN", table: "maxtabledomain",
    idCol: "MAXTABLEDOMAINID", lTable: null, descCol: null,
    cols: ["OBJECTNAME", "VALIDTNWHERECLAUSE", "LISTWHERECLAUSE", "ERRORRESOURCBUNDLE", "ERRORACCESSKEY", "ORGID", "SITEID"],
    keys: ["OBJECTNAME"], keyCols: ["OBJECTNAME"],
    child: {
      key: "crossoverdomain", rel: "CROSSOVERDOMAIN", object: "CROSSOVERDOMAIN", table: "crossoverdomain",
      idCol: "CROSSOVERDOMAINID", lTable: null, descCol: null,
      cols: ["SOURCEFIELD", "DESTFIELD", "SOURCECONDITION", "DESTCONDITION",
        "COPYEVENIFSRCNULL", "COPYONLYIFDESTNULL", "SEQUENCE", "ORGID", "SITEID"],
      keys: ["SOURCEFIELD", "DESTFIELD"], keyCols: ["SOURCEFIELD", "DESTFIELD"]
    }
  }],
  CROSSOVER: [{
    key: "tabledomain", rel: "MAXTABLEDOMAINFORCROSSOVER", object: "MAXTABLEDOMAIN", table: "maxtabledomain",
    idCol: "MAXTABLEDOMAINID", lTable: null, descCol: null,
    cols: ["OBJECTNAME", "VALIDTNWHERECLAUSE", "LISTWHERECLAUSE", "ERRORRESOURCBUNDLE", "ERRORACCESSKEY", "ORGID", "SITEID"],
    keys: ["OBJECTNAME"], keyCols: ["OBJECTNAME"],
    child: {
      key: "crossoverdomain", rel: "CROSSOVERDOMAIN", object: "CROSSOVERDOMAIN", table: "crossoverdomain",
      idCol: "CROSSOVERDOMAINID", lTable: null, descCol: null,
      cols: ["SOURCEFIELD", "DESTFIELD", "SOURCECONDITION", "DESTCONDITION",
        "COPYEVENIFSRCNULL", "COPYONLYIFDESTNULL", "SEQUENCE", "ORGID", "SITEID"],
      keys: ["SOURCEFIELD", "DESTFIELD"], keyCols: ["SOURCEFIELD", "DESTFIELD"]
    }
  }]
};

var successData = {};
// ignoreDefVal 精简模式开关(buildConfig 中按请求参数赋值)
var _ignoreDefValGlobal = false;

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
  var ignoreDefVal = (qparam("ignoreDefVal") === "true");
  _ignoreDefValGlobal = ignoreDefVal;
  return {
    _service: svc,
    _userInfo: userInfo,
    _langcode: _langcode,
    _action: action,
    _body: parseRequestBody(),
    _errorAssert: qparam("_errorAssert") === "true",
    _debug: paramDebug,
    allLangcode: (qparam("_allLangcode") === "true"),
    ignoreDefVal: ignoreDefVal,
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
    if (parsed === null || typeof parsed === "undefined") {
      return {};
    }
    if (Array.isArray(parsed)) {
      return { domainList: parsed };
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

/** 读取 _ignoreList: 根节点忽略清单(body 数组或 URL 逗号分隔) */
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

/** 按 _ignoreList 删除返回 JSON 的根级节点 */
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

/** _deleteNotExists 是否命中某子表(元素格式: domainList:_skschild_alndomain:alndomain) */
function isDeleteNotExists(config, childKey) {
  var raw = bodyOrParam(config, ["_deleteNotExists", "deleteNotExists"]);
  var list = [];
  if (raw instanceof Array) {
    list = raw;
  } else if (raw !== null) {
    list = String(raw).split(",");
  }
  var token = CHILD_PREFIX + childKey;
  for (var i = 0; i < list.length; i++) {
    var path = String(list[i] || "").trim();
    if (path === "") continue;
    if (path === childKey || path.indexOf(token) >= 0 || path.indexOf(":" + childKey) >= 0) {
      return true;
    }
  }
  return false;
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
  var domainid = bodyOrParam(config, ["domainid", "DOMAINID"]);
  var domaintype = bodyOrParam(config, ["domaintype", "DOMAINTYPE"]);
  var description = bodyOrParam(config, ["description", "DESCRIPTION"]);
  var maxtype = bodyOrParam(config, ["maxtype", "MAXTYPE"]);
  if (domainid !== null) {
    conds.push("upper(domainid) like '%" + escapeSql(String(domainid).toUpperCase()) + "%'");
  }
  if (domaintype !== null) {
    conds.push("upper(domaintype) like '%" + escapeSql(String(domaintype).toUpperCase()) + "%'");
  }
  if (description !== null) {
    conds.push("upper(description) like '%" + escapeSql(String(description).toUpperCase()) + "%'");
  }
  if (maxtype !== null) {
    conds.push("upper(maxtype) like '%" + escapeSql(String(maxtype).toUpperCase()) + "%'");
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

function resolveDomainIds(config) {
  var ids = [];
  var single = bodyOrParam(config, ["domainid", "DOMAINID"]);
  if (single !== null) {
    ids.push(String(single).trim());
  }
  var list = bodyOrParam(config, ["domainids", "domainList"]);
  if (list instanceof Array) {
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var n = (item && typeof item === "object") ? (item.DOMAINID || item.domainid) : item;
      if (n !== null && n !== undefined && String(n) !== "") {
        ids.push(String(n).trim());
      }
    }
  }
  return ids;
}

function doQuery(config) {
  var where = buildWhere(config);
  var pageNum = toInt(bodyOrParam(config, ["pageNum", "page"]), 0);
  var pageSize = toInt(bodyOrParam(config, ["pageSize", "limit"]), 0);
  var paginated = pageNum > 0 && pageSize > 0;

  var sql = "select " + MAIN_COLUMNS.join(",") + " from maxdomain where " + where +
    " order by domaintype, domainid";
  var countSql = "select count(*) from maxdomain where " + where;

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
    rows = decorateMainRows(conn, config, rows);
  } finally {
    freeConnection(config, conn);
  }
  var result = { domainList: rows, total: total };
  if (paginated) {
    result.pageNum = pageNum;
    result.pageSize = pageSize;
  }
  return result;
}

function doDetail(config) {
  var ids = resolveDomainIds(config);
  var conn = null;
  try {
    conn = getConnection(config);
    if (ids.length === 0) {
      var rows = queryRows(conn, "select domainid from maxdomain where " + buildWhere(config) +
        " order by domaintype, domainid");
      for (var i = 0; i < rows.length; i++) {
        ids.push(String(rows[i].DOMAINID));
      }
    }
    var domains = [];
    for (var j = 0; j < ids.length; j++) {
      var d = buildDomainObject(conn, config, ids[j]);
      if (d !== null) {
        domains.push(d);
      }
    }
    return dropIgnoredRoots({ domainList: domains }, config);
  } finally {
    freeConnection(config, conn);
  }
}

function doExport(config) {
  var ids = resolveDomainIds(config);
  var conn = null;
  try {
    conn = getConnection(config);
    if (ids.length === 0) {
      var where = buildWhere(config);
      var rows = queryRows(conn, "select domainid from maxdomain where " + where +
        " order by domaintype, domainid");
      for (var i = 0; i < rows.length; i++) {
        ids.push(String(rows[i].DOMAINID));
      }
      debugPrint("export where=" + where + ", domains=" + ids.length);
    }
    var domains = [];
    for (var j = 0; j < ids.length; j++) {
      var d = buildDomainObject(conn, config, ids[j]);
      if (d !== null) {
        domains.push(d);
      }
    }
    debugPrint("export domains=" + domains.length);
    return dropIgnoredRoots({ domainList: domains }, config);
  } finally {
    freeConnection(config, conn);
  }
}

/** 查询结果行: 按当前语言覆盖 description, _allLangcode 时附加 sks:langdata */
function decorateMainRows(conn, config, rows) {
  if (rows.length === 0) {
    return rows;
  }
  var result = [];
  var langMap = null;
  if (needLang(config)) {
    var inList = [];
    for (var i = 0; i < rows.length; i++) {
      inList.push("'" + escapeSql(String(rows[i].DOMAINID)) + "'");
    }
    langMap = loadMainLangMap(conn, "m.domainid in (" + inList.join(",") + ")");
  }
  for (var j = 0; j < rows.length; j++) {
    var src = rows[j];
    var obj = {};
    obj.domainid = src.DOMAINID;
    obj.domaintype = src.DOMAINTYPE;
    putIfNotDef(obj, "description", src.DESCRIPTION);
    putIfNotDef(obj, "maxtype", src.MAXTYPE);
    putIfNotDef(obj, "length", src.LENGTH);
    if (src.DOMAINTYPE === "NUMERIC" || src.DOMAINTYPE === "NUMRANGE") {
      putIfNotDef(obj, "scale", src.SCALE);
    }
    putIfNotDef(obj, "internal", src.INTERNAL);
    putIfNotDef(obj, "nevercache", src.NEVERCACHE);
    obj["sks:ref"] = src.DOMAINID;
    obj["sks:objectName"] = OBJECT_NAME;
    applyMainLang(config, obj, langMap ? langMap[String(src.DOMAINID)] : null, src.DESCRIPTION);
    result.push(obj);
  }
  return result;
}

/** 完整域对象(含域值子表) */
function buildDomainObject(conn, config, domainid) {
  var rows = queryRows(conn, "select " + MAIN_COLUMNS.join(",") +
    " from maxdomain where domainid = '" + escapeSql(domainid) + "'");
  if (rows.length === 0) {
    return null;
  }
  var src = rows[0];
  var domainType = String(src.DOMAINTYPE || "");
  var obj = {};
  obj.domainid = src.DOMAINID;
  obj.domaintype = src.DOMAINTYPE;
  putIfNotDef(obj, "description", src.DESCRIPTION);
  putIfNotDef(obj, "maxtype", src.MAXTYPE);
  putIfNotDef(obj, "length", src.LENGTH);
  if (domainType === "NUMERIC" || domainType === "NUMRANGE") {
    putIfNotDef(obj, "scale", src.SCALE);
  }
  putIfNotDef(obj, "internal", src.INTERNAL);
  putIfNotDef(obj, "nevercache", src.NEVERCACHE);
  obj["sks:ref"] = src.DOMAINID;
  obj["sks:objectName"] = OBJECT_NAME;

  if (needLang(config)) {
    var langMap = loadMainLangMap(conn, "m.domainid = '" + escapeSql(domainid) + "'");
    applyMainLang(config, obj, langMap[String(src.DOMAINID)], src.DESCRIPTION);
  }

  var children = DOMAIN_CHILD_CONFIG[domainType];
  if (children) {
    for (var i = 0; i < children.length; i++) {
      var arr = buildChildRows(conn, config, children[i], src.DOMAINID);
      if (arr.length > 0) {
        obj[CHILD_PREFIX + children[i].key] = arr;
      }
    }
  }
  return obj;
}

/** 读取某类域值子表(含多语言描述) */
function buildChildRows(conn, config, childCfg, domainid) {
  var rows = queryRows(conn, "select " + childCfg.cols.join(",") +
    " from " + childCfg.table + " where domainid = '" + escapeSql(domainid) + "' order by 1");
  var langMap = null;
  if (needLang(config) && childCfg.lTable) {
    var keySelect = "";
    for (var k = 0; k < childCfg.keyCols.length; k++) {
      keySelect += ", a." + childCfg.keyCols[k];
    }
    langMap = {};
    var langRows = queryRows(conn,
      "select l.langcode, l." + childCfg.descCol + " as L_DESC" + keySelect +
      " from " + childCfg.lTable + " l join " + childCfg.table + " a on a." + childCfg.idCol +
      " = l.ownerid where a.domainid = '" + escapeSql(domainid) + "'");
    for (var m = 0; m < langRows.length; m++) {
      var lr = langRows[m];
      var lk = rowKey(childCfg.keyCols, lr);
      if (!langMap[lk]) {
        langMap[lk] = {};
      }
      if (lr.L_DESC !== null && lr.L_DESC !== undefined && lr.L_DESC !== "") {
        langMap[lk][String(lr.LANGCODE).toUpperCase()] = lr.L_DESC;
      }
    }
  }
  var result = [];
  for (var i = 0; i < rows.length; i++) {
    var src = rows[i];
    var obj = {};
    for (var c = 0; c < childCfg.cols.length; c++) {
      var col = childCfg.cols[c];
      putIfNotDef(obj, col.toLowerCase(), src[col], defaultOf(col));
    }
    obj["sks:ref"] = rowRef(childCfg.keyCols, src);
    obj["sks:objectName"] = childCfg.object;

    var bucket = langMap ? langMap[rowKey(childCfg.keyCols, src)] : null;
    if (childCfg.descCol) {
      var baseDesc = src[childCfg.descCol];
      var desc = baseDesc;
      if (bucket && bucket[_langcode]) {
        desc = bucket[_langcode];
      }
      if (desc !== null && desc !== undefined && desc !== "") {
        obj.description = desc;
      }
      if (config.allLangcode) {
        var langdata = buildLangdata(bucket, baseDesc);
        if (langdata !== null) {
          obj["sks:langdata"] = langdata;
        }
      }
    }

    if (childCfg.child) {
      var subArr = buildCrossoverRows(conn, config, childCfg.child, domainid);
      if (subArr.length > 0) {
        obj[CHILD_PREFIX + childCfg.child.key] = subArr;
      }
    }
    result.push(obj);
  }
  return result;
}

/** CROSSOVERDOMAIN 子行(按 domainid 查询) */
function buildCrossoverRows(conn, config, childCfg, domainid) {
  var rows = queryRows(conn, "select " + childCfg.cols.join(",") +
    " from " + childCfg.table + " where domainid = '" + escapeSql(domainid) + "' order by 1");
  var result = [];
  for (var i = 0; i < rows.length; i++) {
    var src = rows[i];
    var obj = {};
    for (var c = 0; c < childCfg.cols.length; c++) {
      var col = childCfg.cols[c];
      putIfNotDef(obj, col.toLowerCase(), src[col], defaultOf(col));
    }
    obj["sks:ref"] = rowRef(childCfg.keyCols, src);
    obj["sks:objectName"] = childCfg.object;
    result.push(obj);
  }
  return result;
}

/** 主表多语言: { DOMAINID: { LANG: description } } */
function loadMainLangMap(conn, whereSql) {
  var map = {};
  try {
    var rows = queryRows(conn,
      "select m.domainid as KEYVAL, l.langcode, l.description as L_DESC" +
      " from l_maxdomain l join maxdomain m on m.maxdomainid = l.ownerid where " + whereSql);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var key = String(r.KEYVAL);
      if (!map[key]) {
        map[key] = {};
      }
      if (r.L_DESC !== null && r.L_DESC !== undefined && r.L_DESC !== "") {
        map[key][String(r.LANGCODE).toUpperCase()] = r.L_DESC;
      }
    }
  } catch (e) {
    logger.warn("[" + scriptName + "] L_MAXDOMAIN 查询失败, 跳过多语言: " + errText(e));
  }
  return map;
}

/** 按当前语言覆盖 description, _allLangcode 时附加 sks:langdata */
function applyMainLang(config, obj, bucket, baseDesc) {
  var desc = baseDesc;
  if (bucket && bucket[_langcode]) {
    desc = bucket[_langcode];
  }
  if (desc !== null && desc !== undefined && desc !== "") {
    obj.description = desc;
  }
  if (config.allLangcode) {
    var langdata = buildLangdata(bucket, baseDesc);
    if (langdata !== null) {
      obj["sks:langdata"] = langdata;
    }
  }
}

/** 构造 { DESCRIPTION: { EN: ..., ZH: ... } }; 无有效值时返回 null */
function buildLangdata(bucket, baseDesc) {
  var langs = {};
  var has = false;
  var baseLang = getBaseLang();
  if (baseDesc !== null && baseDesc !== undefined && String(baseDesc) !== "") {
    langs[baseLang !== "" ? baseLang : "EN"] = baseDesc;
    has = true;
  }
  if (bucket) {
    for (var lang in bucket) {
      if (!Object.prototype.hasOwnProperty.call(bucket, lang)) continue;
      langs[String(lang).toUpperCase()] = bucket[lang];
      has = true;
    }
  }
  if (!has) {
    return null;
  }
  return { DESCRIPTION: langs };
}

// ---------------------------------------------------------------------------
// 导入
// ---------------------------------------------------------------------------

function doImport(config) {
  var body = config._body || {};
  var list = body.domainList || body.domains || body.domainlist;
  if (!(list instanceof Array) || list.length === 0) {
    throw new MXApplicationException("#", "domainList 必须为非空数组");
  }
  var merged = {
    total: list.length,
    added: 0,
    updated: 0,
    deleted: 0,
    failed: 0,
    skipped: 0,
    results: [],
    "sks:successSumTotal": 0,
    "sks:failSumTotal": 0,
    "sks:ignoreSumTotal": 0
  };
  var ignored = resolveIgnoreList(config);
  if (ignored.domainList || ignored.domains) {
    merged.skipped = list.length;
    merged["sks:ignoreSumTotal"] = list.length;
    return merged;
  }

  for (var i = 0; i < list.length; i++) {
    var domain = list[i];
    var domainid = domain ? String(domain.DOMAINID || domain.domainid || "").trim() : "";
    var item = {
      "sks:objectName": OBJECT_NAME,
      "sks:ref": domainid,
      "_apiAction": "imp",
      "_status": "failed",
      "_operation": "none"
    };
    try {
      importDomain(config, domain, domainid, item);
    } catch (e) {
      item._status = "failed";
      item._operation = "none";
      item._message = errText(e);
      logger.error("[" + scriptName + "] 导入域失败: " + domainid + " - " + errText(e));
    }
    merged.added += Number(item.added || 0);
    merged.updated += Number(item.updated || 0);
    merged.deleted += Number(item.deleted || 0);
    merged.failed += Number(item.failedChild || 0);
    if (item._status === "failed") {
      merged.failed++;
    }
    merged.results.push(item);
    debugPrint("import " + domainid + " => " + item._status + " " + (item._message || ""));
  }

  stampResults(merged.results);
  merged["sks:successSumTotal"] = 0;
  merged["sks:failSumTotal"] = 0;
  merged["sks:ignoreSumTotal"] = 0;
  for (var r = 0; r < merged.results.length; r++) {
    merged["sks:successSumTotal"] += Number(merged.results[r]["sks:successSumTotal"] || 0);
    merged["sks:failSumTotal"] += Number(merged.results[r]["sks:failSumTotal"] || 0);
    merged["sks:ignoreSumTotal"] += Number(merged.results[r]["sks:ignoreSumTotal"] || 0);
  }
  merged.success = merged["sks:successSumTotal"];
  merged.failedSum = merged["sks:failSumTotal"];
  merged.ignoreSum = merged["sks:ignoreSumTotal"];

  if (config._errorAssert && merged["sks:failSumTotal"] > 0) {
    throw new MXApplicationException("#", "导入存在 " + merged["sks:failSumTotal"] + " 条失败, 详见 results");
  }
  return merged;
}

function importDomain(config, domain, domainid, item) {
  if (!domain || typeof domain !== "object") {
    throw new MXApplicationException("#", "域对象不合法");
  }
  if (!domainid) {
    throw new MXApplicationException("#", "DOMAINID 不能为空");
  }

  var set = null;
  try {
    set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
    set.setWhere("domainid = '" + escapeSql(domainid) + "'");
    set.reset();
    // 与 SKS.AUTOSCRIPT.OBJECTS 一致: 迁移导入默认关闭校验
    set.setDMDeploySet(true);
    var mbo = set.isEmpty() ? null : set.getMbo(0);

    if (isTrue(domain._delete)) {
      if (!mbo) {
        item._status = "skipped";
        item._operation = "none";
        item._message = "记录不存在, 无需删除";
        return;
      }
      mbo.delete();
      saveSet(set, config);
      item._status = "success";
      item._operation = "deleted";
      item.deleted = 1;
      return;
    }

    var isNew = false;
    if (!mbo) {
      var newType = String(domain.DOMAINTYPE || domain.domaintype || "").trim().toUpperCase();
      if (newType === "") {
        item._status = "failed";
        item._message = "新增域时 DOMAINTYPE 不能为空";
        return;
      }
      mbo = set.add();
      if (!mbo) {
        item._status = "failed";
        item._message = "无法新增 MAXDOMAIN: " + domainid;
        return;
      }
      isNew = true;
      setMboValue(mbo, "DOMAINID", domainid);
      setMboValue(mbo, "DOMAINTYPE", newType);
    }

    var effectiveType = String(domain.DOMAINTYPE || domain.domaintype || getMboString(mbo, "DOMAINTYPE")).toUpperCase();
    var ignoreMain = isTrue(domain._ignoreMain) || isTrue(domain["sks:ignoreMain"]);
    if (!ignoreMain) {
      applyDomainMainFields(config, mbo, domain, effectiveType, isNew);
    }

    var failedChild = 0;
    var children = DOMAIN_CHILD_CONFIG[effectiveType] || [];
    for (var i = 0; i < children.length; i++) {
      var childCfg = children[i];
      var rows = domain[CHILD_PREFIX + childCfg.key];
      if (!(rows instanceof Array)) {
        rows = domain[childCfg.key]; // 兼容 v1 无前缀写法
      }
      if (!(rows instanceof Array) || rows.length === 0) {
        continue;
      }
      var stat = syncChildren(config, mbo, childCfg, rows, isDeleteNotExists(config, childCfg.key));
      item[CHILD_PREFIX + childCfg.key] = stat.rows;
      item.added = (item.added || 0) + stat.added;
      item.updated = (item.updated || 0) + stat.updated;
      item.deleted = (item.deleted || 0) + stat.deleted;
      failedChild += stat.failed;
      if (stat.errors.length > 0) {
        item._message = (item._message ? item._message + "; " : "") + stat.errors.join("; ");
      }
    }

    // 与 v1 一致: 子表处理完再统一保存主表, 避免新建 TABLE/CROSSOVER 域时
    // 触发 "You must provide at least one domain value" 校验
    saveSet(set, config);
    // 新建子行在保存前 ownerid 还不存在, setMLValue 会失败; 保存后补写一次各语言描述
    if (config.allLangcode) {
      applyChildrenLangdataAfterSave(config, mbo, domain, effectiveType);
    }
    item._operation = isNew ? "added" : "updated";
    item.added = (item.added || 0) + (isNew ? 1 : 0);
    item.updated = (item.updated || 0) + (isNew ? 0 : 1);
    item.failedChild = failedChild;
    if (failedChild > 0) {
      item._status = "failed";
      item._message = "子表存在 " + failedChild + " 条失败" + (item._message ? ": " + item._message : "");
    } else {
      item._status = "success";
    }
  } catch (e) {
    item._status = "failed";
    item._message = errText(e);
    logger.error("[" + scriptName + "] 域导入失败: " + domainid + " - " + errText(e));
  } finally {
    if (set != null) {
      try { set.close(); } catch (ignored) { }
    }
  }
}

/** 写入主记录字段(不保存, 由调用方统一 save) */
function applyDomainMainFields(config, mbo, domain, effectiveType, isNew) {
  var isTableType = effectiveType === "TABLE" || effectiveType === "CROSSOVER";
  for (var key in domain) {
    if (!Object.prototype.hasOwnProperty.call(domain, key)) continue;
    if (key.charAt(0) === "_" || key.indexOf(":") >= 0) continue;
    var upper = String(key).toUpperCase();
    if (upper === "DOMAINID" || MAIN_SKIP_FIELDS.indexOf(upper) >= 0) continue;
    var value = domain[key];
    if (value === null || typeof value === "undefined" || value instanceof Array || typeof value === "object") continue;
    if (upper === "DOMAINTYPE") {
      if (!isNew) {
        setMboValue(mbo, "DOMAINTYPE", value, 2);
      }
      continue;
    }
    if (isTableType && (upper === "MAXTYPE" || upper === "LENGTH")) continue;
    if (upper === "SCALE" && effectiveType !== "NUMERIC" && effectiveType !== "NUMRANGE") continue;
    if (!hasMboValue(mbo, upper)) continue;
    if (!isNew) {
      var oldValue = getMboString(mbo, upper);
      if (oldValue === String(value)) continue;
    }
    setMboValue(mbo, upper, value);
  }
  // _allLangcode: 按 sks:langdata 设置各语言描述
  if (config.allLangcode) {
    applyRowLangdata(mbo, domain);
  }
}

/**
 * 子表同步: 按键匹配 upsert, 行内 _delete=true 删除; deleteNotExists 时删除目标多余行
 * @returns {{added:number,updated:number,deleted:number,failed:number,errors:Array,rows:Array}}
 */
function syncChildren(config, domainMbo, childCfg, rows, deleteNotExists) {
  var stat = { added: 0, updated: 0, deleted: 0, failed: 0, errors: [], rows: [] };
  var childSet = null;
  try {
    childSet = domainMbo.getMboSet(childCfg.rel);
    childSet.reset();

    var kept = {};
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var out = {
        "sks:objectName": childCfg.object,
        "sks:ref": "",
        "_apiAction": "imp",
        "_status": "failed",
        "_operation": "none"
      };
      if (!row || typeof row !== "object") {
        stat.failed++;
        out._message = "行不合法";
        stat.rows.push(out);
        stat.errors.push(childCfg.key + "[" + i + "] 行不合法");
        continue;
      }
      out["sks:ref"] = rowRef(childCfg.keys, row);
      try {
        var target = findByKeys(childSet, childCfg.keys, row);
        if (isTrue(row._delete)) {
          if (target) {
            target.delete();
            stat.deleted++;
            out._status = "success";
            out._operation = "deleted";
          } else {
            out._status = "skipped";
            out._operation = "none";
            out._message = "记录不存在, 无需删除";
          }
          stat.rows.push(out);
          continue;
        }
        kept[rowKey(childCfg.keys, row)] = true;
        if (target) {
          var changed = applyChildFields(target, row, childCfg, false, config.allLangcode);
          stat.updated++;
          out._status = "success";
          out._operation = changed ? "updated" : "skipped";
          if (!changed) {
            out._message = "无变化";
          }
        } else {
          var nm = childSet.add();
          if (!nm) {
            throw new MXApplicationException("#", "无法新增 " + childCfg.object + " 行");
          }
          setChildKeys(nm, childCfg, row);
          applyChildFields(nm, row, childCfg, true, config.allLangcode);
          stat.added++;
          out._status = "success";
          out._operation = "added";
          target = nm;
        }
        // CROSSOVER: 嵌套 tabledomain 行下再同步 CROSSOVERDOMAIN
        if (childCfg.child) {
          var subRows = row[CHILD_PREFIX + childCfg.child.key];
          if (!(subRows instanceof Array)) {
            subRows = row[childCfg.child.key];
          }
          if (subRows instanceof Array && subRows.length > 0) {
            var subStat = syncCrossoverRows(config, target, childCfg.child, subRows);
            out[CHILD_PREFIX + childCfg.child.key] = subStat.rows;
            stat.added += subStat.added;
            stat.updated += subStat.updated;
            stat.deleted += subStat.deleted;
            stat.failed += subStat.failed;
            for (var e = 0; e < subStat.errors.length; e++) {
              stat.errors.push(subStat.errors[e]);
            }
            if (subStat.failed > 0) {
              out._status = "failed";
              out._message = "子表存在 " + subStat.failed + " 条失败";
            }
          }
        }
        var langApplied = config.allLangcode && childCfg.descCol ? applyRowLangdata(target, row, true) : false;
        if (out._operation === "skipped" && langApplied) {
          out._operation = "updated";
          out._message = "";
        }
      } catch (e2) {
        stat.failed++;
        out._status = "failed";
        out._message = errText(e2);
        logger.warn("[" + scriptName + "] " + childCfg.object + " 行处理失败: " + errText(e2));
        stat.errors.push(childCfg.key + "[" + i + "] " + errText(e2));
      }
      stat.rows.push(out);
    }

    if (deleteNotExists) {
      var marked = [];
      var total = childSet.count();
      for (var idx = 0; idx < total; idx++) {
        var m = childSet.getMbo(idx);
        if (m == null) continue;
        var isDel = false;
        try { isDel = m.isDeleted(); } catch (ignored) { isDel = false; }
        if (isDel) continue;
        if (!kept[mboKey(childCfg.keys, m)]) {
          marked.push(m);
        }
      }
      for (var d = 0; d < marked.length; d++) {
        marked[d].delete();
        stat.deleted++;
      }
    }

    // 与 SKS.AUTOSCRIPT.OBJECTS 保持一致: 子表不单独 save/close,
    // 统一由外层 domainSet.save() 级联保存; 单独 save 后再级联会重复插入(BMXAA4211E -407)
  } catch (e) {
    stat.failed++;
    stat.errors.push(childCfg.key + " 保存失败: " + errText(e));
    logger.error("[" + scriptName + "] " + childCfg.object + " save 失败: " + getMboString(domainMbo, "DOMAINID"), e);
  }
  return stat;
}

/** CROSSOVERDOMAIN 子行同步(挂在 MAXTABLEDOMAIN 行下) */
function syncCrossoverRows(config, tableMbo, childCfg, rows) {
  var stat = { added: 0, updated: 0, deleted: 0, failed: 0, errors: [], rows: [] };
  var childSet = null;
  try {
    childSet = tableMbo.getMboSet(childCfg.rel);
    childSet.reset();
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var out = {
        "sks:objectName": childCfg.object,
        "sks:ref": "",
        "_apiAction": "imp",
        "_status": "failed",
        "_operation": "none"
      };
      if (!row || typeof row !== "object") {
        stat.failed++;
        out._message = "行不合法";
        stat.rows.push(out);
        stat.errors.push(childCfg.key + "[" + i + "] 行不合法");
        continue;
      }
      out["sks:ref"] = rowRef(childCfg.keys, row);
      try {
        var target = findByKeys(childSet, childCfg.keys, row);
        if (isTrue(row._delete)) {
          if (target) {
            target.delete();
            stat.deleted++;
            out._status = "success";
            out._operation = "deleted";
          } else {
            out._status = "skipped";
            out._message = "记录不存在, 无需删除";
          }
          stat.rows.push(out);
          continue;
        }
        if (target) {
          var changed = applyChildFields(target, row, childCfg, false, config.allLangcode);
          stat.updated++;
          out._status = "success";
          out._operation = changed ? "updated" : "skipped";
          if (!changed) {
            out._message = "无变化";
          }
        } else {
          var nm = childSet.add();
          if (!nm) {
            throw new MXApplicationException("#", "无法新增 " + childCfg.object + " 行");
          }
          setChildKeys(nm, childCfg, row);
          applyChildFields(nm, row, childCfg, true, config.allLangcode);
          stat.added++;
          out._status = "success";
          out._operation = "added";
        }
      } catch (e2) {
        stat.failed++;
        out._status = "failed";
        out._message = errText(e2);
        stat.errors.push(childCfg.key + "[" + i + "] " + errText(e2));
      }
      stat.rows.push(out);
    }
    // 同 syncChildren: 不单独 save/close, 由外层 domainSet.save() 级联
  } catch (e) {
    stat.failed++;
    stat.errors.push(childCfg.key + " 保存失败: " + errText(e));
    logger.error("[" + scriptName + "] " + childCfg.object + " save 失败", e);
  }
  return stat;
}

/** 新增子行时先写匹配键 */
function setChildKeys(mbo, childCfg, row) {
  for (var i = 0; i < childCfg.keys.length; i++) {
    var key = childCfg.keys[i];
    var value = row[key];
    if (value === undefined || value === null) {
      value = row[String(key).toLowerCase()];
    }
    if (value === undefined || value === null || String(value) === "") {
      continue;
    }
    // 与 SKS.AUTOSCRIPT.OBJECTS 一致: 子表键用 NOACCESSCHECK 写入。
    // SYNONYMDOMAIN.MAXVALUE 的字段校验要求"同域同内部值的记录必须已存在",
    // 新建域时首条必然查不到会报 BMXAA4051E, 故绕过校验(合法性由导入数据保证)
    setMboValue(mbo, key, value, 11);
  }
}

/** 写入子行其余字段, 返回是否有变更 */
function applyChildFields(mbo, row, childCfg, isNew, allLangcode) {
  var changed = false;
  var uniqueIdName = String(mbo.getUniqueIDName() || "").toUpperCase();
  for (var key in row) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
    if (key.charAt(0) === "_" || key.indexOf(":") >= 0) continue;
    var upper = String(key).toUpperCase();
    if (upper === "ROWSTAMP" || upper === uniqueIdName) continue;
    if (upper === "DOMAINID") continue;
    if (childCfg.keys.indexOf(upper) >= 0) continue;
    var value = row[key];
    if (value === undefined || value instanceof Array || (value !== null && typeof value === "object")) continue;
    if (!hasMboValue(mbo, upper)) continue;
    if (!isNew) {
      var oldValue = getMboString(mbo, upper);
      if (oldValue === (value === null ? "" : String(value))) continue;
    }
    setMboValue(mbo, upper, value);
    changed = true;
  }
  // 子行多语言: 非基础语言在此写入, 基础语言由保存后切基础语言会话写基础列
  if (allLangcode && applyRowLangdata(mbo, row, true)) {
    changed = true;
  }
  return changed;
}

/** 主表保存后, 重新定位子行补写多语言:
 *  1) 非基础语言: 会话语言下走 setMLValue 写 L_ 表
 *  2) 基础语言: 切到基础语言会话再开新集合, setValue 直接写基础列
 *     (setMLValue 写基础语言只改虚拟字段 _BASELANGUAGE, 不会把 Mbo 标记为 modified,
 *      MboSet.updateMbo 会整行跳过, 导致基础列永远为空)
 */
function applyChildrenLangdataAfterSave(config, domainMbo, domain, effectiveType) {
  var children = DOMAIN_CHILD_CONFIG[effectiveType] || [];
  var baseLang = getBaseLang();
  var domainid = getMboString(domainMbo, "DOMAINID");
  for (var i = 0; i < children.length; i++) {
    var cfg = children[i];
    var rows = domain[CHILD_PREFIX + cfg.key] || domain[cfg.key];
    if (!rows || !rows.length) continue;
    applyChildLangNonBase(config, cfg, rows, domainid);
    if (baseLang !== "") {
      applyChildLangBase(config, cfg, rows, domainid, baseLang);
    }
  }
}

/** 非基础语言译文: 会话语言下写 L_ 表 */
function applyChildLangNonBase(config, cfg, rows, domainid) {
  var childSet = null;
  try {
    childSet = mxserver.getMboSet(cfg.object, userInfo);
    childSet.setWhere("domainid = '" + escapeSql(domainid) + "'");
    childSet.reset();
    childSet.setDMDeploySet(true);
    var touched = false;
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      if (!row || row._delete || !row["sks:langdata"]) continue;
      var target = findByKeys(childSet, cfg.keys, row);
      if (!target) {
        logger.warn("[" + scriptName + "] MLAFTER " + cfg.object + " 未找到行 " + rowRef(cfg.keys, row));
        continue;
      }
      if (applyRowLangdata(target, row, true)) {
        touched = true;
      }
    }
    if (touched) {
      childSet.setDMDeploySet(true);
      childSet.save();
      logger.info("[" + scriptName + "] MLAFTER " + cfg.object + " 非基础语言已保存 domainid=" + domainid);
    }
  } catch (e) {
    logger.warn("[" + scriptName + "] 子表非基础语言补写失败 " + cfg.object + ": " + errText(e));
  } finally {
    if (childSet != null) {
      try { childSet.close(); } catch (ignored) { }
    }
  }
}

/** 基础语言: 切到基础语言会话(processML=false)后用新集合直接写基础列 */
function applyChildLangBase(config, cfg, rows, domainid, baseLang) {
  runWithLang(baseLang, function () {
    var childSet = null;
    try {
      childSet = mxserver.getMboSet(cfg.object, userInfo);
      childSet.setWhere("domainid = '" + escapeSql(domainid) + "'");
      childSet.reset();
      childSet.setDMDeploySet(true);
      var changed = 0;
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        if (!row || row._delete || !row["sks:langdata"]) continue;
        var target = findByKeys(childSet, cfg.keys, row);
        if (!target) continue;
        if (applyRowLangdata(target, row, false, baseLang)) {
          changed++;
        }
      }
      if (changed > 0) {
        childSet.save();
        logger.info("[" + scriptName + "] MLAFTER " + cfg.object + " 基础语言(" + baseLang
          + ")已保存 " + changed + " 行 domainid=" + domainid);
      }
    } catch (e) {
      logger.warn("[" + scriptName + "] 子表基础语言补写失败 " + cfg.object + ": " + errText(e));
    } finally {
      if (childSet != null) {
        try { childSet.close(); } catch (ignored) { }
      }
    }
  });
}

/** 临时切换会话语言执行 fn, finally 恢复(processML 在集合创建时按会话语言判定) */
function runWithLang(langCode, fn) {
  var old = "";
  try { old = String(userInfo.getLangCode()); } catch (ignored) { old = ""; }
  try {
    userInfo.setLangCode(langCode);
    return fn();
  } finally {
    if (old !== "") {
      try { userInfo.setLangCode(old); } catch (ignored) { }
    }
  }
}

/** 行内 sks:langdata = { 字段: { 语言: 值 } } → setMLValue; 返回是否写入
 *  skipBaseLang=true 时跳过基础语言(由基础语言会话单独写基础列)
 *  onlyLang 指定时只写该语言
 */
function applyRowLangdata(mbo, row, skipBaseLang, onlyLang) {
  var langData = row ? row["sks:langdata"] : null;
  if (!langData || typeof langData !== "object") {
    return false;
  }
  var baseLang = getBaseLang();
  var applied = false;
  for (var field in langData) {
    if (!Object.prototype.hasOwnProperty.call(langData, field)) continue;
    var vals = langData[field];
    if (!vals || typeof vals !== "object") continue;
    for (var lang in vals) {
      if (!Object.prototype.hasOwnProperty.call(vals, lang)) continue;
      var v = vals[lang];
      if (v === undefined || v === null || String(v) === "~null~") continue;
      var code = String(lang).toUpperCase();
      if (onlyLang !== undefined && onlyLang !== null && code !== onlyLang) continue;
      if (skipBaseLang === true && code === baseLang) continue;
      // 必须用 setMLValue 写各语言: 对基础语言(Maximo 基础语言如 EN)会写入基础字段列,
      // 其他语言写入 L_ 表; 若用 setValue 只会写入"当前会话语言"的 L 行, 导致基础语言值丢失
      try {
        var done = false;
        try {
          mbo.getMboValue(field).setMLValue(code, String(v));
          done = true;
        } catch (e0) {
          done = false;
        }
        if (!done) {
          try {
            mbo.setMLValue(field, code, String(v), 11);
          } catch (e4) {
            mbo.setMLValue(field, code, String(v));
          }
        }
        applied = true;
        debugPrint("MLWRITE " + mbo.getName() + "." + field + "@" + code + "=" + v
          + " via=" + (done ? "MboValue" : "Mbo"));
      } catch (e) {
        logger.warn("[" + scriptName + "] setMLValue " + field + "@" + code + " 失败: " + errText(e));
      }
    }
  }
  return applied;
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
    if (deleted) continue;
    if (mboKey(keys, m) === rowKey(keys, row)) {
      return m;
    }
  }
  return null;
}

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

/** 可读引用(用于 sks:ref 展示) */
function rowRef(keys, row) {
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    var v = row[keys[i]];
    if (v === undefined || v === null) {
      v = row[String(keys[i]).toLowerCase()];
    }
    parts.push(v === undefined || v === null ? "" : String(v).trim());
  }
  return parts.join("/");
}

function mboKey(keys, mbo) {
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    var v = "";
    try { v = String(mbo.getString(keys[i]) || "").trim(); } catch (ignored) { v = ""; }
    parts.push(v);
  }
  return parts.join("\u0001");
}

function hasMboValue(mbo, attr) {
  try {
    return mbo.getMboValue(attr) != null;
  } catch (ignored) {
    return false;
  }
}

function getMboString(mbo, attr) {
  try {
    return mbo.isNull(attr) ? "" : String(mbo.getString(attr));
  } catch (ignored) {
    return "";
  }
}

function saveSet(set, config) {
  if (config && isTrue(config.dmDeploySet)) {
    try { set.setDMDeploySet(true); } catch (ignored) { }
  }
  set.save();
}

/** 字段写入: 优先 SKS_COMMONS_UTILS 类型转换, 失败回退 setValue */
function setMboValue(mbo, attr, value, accessModifier) {
  if (value === null || value === undefined) {
    try { mbo.setValue(attr, ""); } catch (e) { logger.warn(attr + " 置空失败: " + errText(e)); }
    return;
  }
  if (sksCommonsUtils && typeof sksCommonsUtils.autoMboSetValue === "function") {
    try {
      sksCommonsUtils.autoMboSetValue(svc, mbo, attr, value,
        accessModifier === undefined || accessModifier === null ? 2 : accessModifier);
      return;
    } catch (e) {
      logger.warn("autoMboSetValue 失败, 回退 setValue: " + attr + " - " + errText(e));
    }
  }
  try {
    if (accessModifier !== undefined && accessModifier !== null) {
      mbo.setValue(attr, value, accessModifier);
    } else {
      mbo.setValue(attr, value);
    }
  } catch (e) {
    try {
      if (typeof value === "number") {
        mbo.setValue(attr, java.lang.Double.valueOf(String(value)),
          accessModifier === undefined || accessModifier === null ? 2 : accessModifier);
      } else {
        throw e;
      }
    } catch (e2) {
      logger.warn("[" + scriptName + "] 字段写入失败: " + attr + " - " + errText(e2));
      throw e2;
    }
  }
}

// ---------------------------------------------------------------------------
// 行级统计(第 3 章规范)
// ---------------------------------------------------------------------------

function ownStats(row) {
  var s = 0, f = 0, i = 0;
  var status = String(row._status || "");
  if (status === "success") {
    s = 1;
  } else if (status === "failed") {
    f = 1;
  } else {
    i = 1;
  }
  return { s: s, f: f, i: i };
}

function stampRow(row) {
  var own = ownStats(row);
  var sumS = own.s, sumF = own.f, sumI = own.i;
  for (var key in row) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
    var val = row[key];
    if (!(val instanceof Array)) continue;
    if (key.indexOf(CHILD_PREFIX) !== 0 && key !== "children") continue;
    for (var j = 0; j < val.length; j++) {
      var child = val[j];
      if (!child || typeof child !== "object") continue;
      stampRow(child);
      sumS += Number(child["sks:successSumTotal"] || 0);
      sumF += Number(child["sks:failSumTotal"] || 0);
      sumI += Number(child["sks:ignoreSumTotal"] || 0);
    }
  }
  row["sks:successTotal"] = own.s;
  row["sks:failTotal"] = own.f;
  row["sks:ignoreTotal"] = own.i;
  row["sks:successSumTotal"] = sumS;
  row["sks:failSumTotal"] = sumF;
  row["sks:ignoreSumTotal"] = sumI;
}

function stampResults(results) {
  for (var i = 0; i < results.length; i++) {
    stampRow(results[i]);
  }
}

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

function needLang(config) {
  return config.allLangcode || _langcode !== getBaseLang();
}

function getBaseLang() {
  try {
    var lang = mxserver.getBaseLang();
    return lang === null ? "" : String(lang).toUpperCase();
  } catch (ignored) {
    return "EN";
  }
}

/** 字段默认值(ignoreDefVal 精简模式下省略) */
function defaultOf(col) {
  if (col === "INTERNAL" || col === "NEVERCACHE" || col === "DEFAULTS" ||
    col === "COPYEVENIFSRCNULL" || col === "COPYONLYIFDESTNULL" || col === "SCALE") {
    return 0;
  }
  return undefined;
}

/** 空值不输出; ignoreDefVal=true 时默认值也不输出 */
function putIfNotDef(obj, jsonKey, val, defVal) {
  if (val === null || val === undefined || val === "") return;
  if (defVal !== undefined && defVal !== null && String(val) === String(defVal) && _ignoreDefValGlobal) return;
  obj[jsonKey] = val;
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
  // 同会话连接由 Maximo 统一回收, 这里不主动 close, 避免 -4470
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
