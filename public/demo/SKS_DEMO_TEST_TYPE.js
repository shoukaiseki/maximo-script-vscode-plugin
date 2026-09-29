// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//可用于控制字段只读

// =============================================================================
// SKS_DEMO_TEST_TYPE
// TEST_TYPE 表(graphite 内嵌页面) 的 REST 接口脚本,
// 接口风格与 SKS.AUTOSCRIPT.WORKFLOW 保持一致(URL 参数 + JSON 请求体 + MBO 读写)。
//
// 调用方式(HTTP, 通过 Maximo ScriptRouteHandler 暴露, 与项目内其他脚本一致):
//   GET    /maximo/oslc/script/SKS_DEMO_TEST_TYPE?page=1&pageSize=20
//            &testtypeid=<精确>&description=<包含>&field_01=<包含>&field_03=<包含>   列表(分页+搜索)
//   GET    /maximo/oslc/script/SKS_DEMO_TEST_TYPE?detail=1&testtypeid=<主键>        单条详情(全字段)
//   POST   /maximo/oslc/script/SKS_DEMO_TEST_TYPE
//          body: {"description":"...", ...}                                       新建(主键自动生成, 查 MAX+1)
//          body: {"testtypeid":123,"description":"...", ...}                       也可显式提供主键(查重后使用)
//   PATCH  /maximo/oslc/script/SKS_DEMO_TEST_TYPE?testtypeid=123
//          (或 PUT, testtypeid 也可放请求体) body: {"description":"...", ...}      保存更新(主键不可改)
//
// 返回结构(外层由 main 统一包裹):
//   成功: {"status":"success","data":<列表{list,total,page,pageSize} | 单条全字段记录>,"message":"Script executed successfully"}
//   失败: {"status":"error","message":<错误堆栈>}
//
// 字段口径(TEST_TYPE 对象权威定义 + DB2 核实):
//   列表 11 列(前端顺序): testtypeid, description, field_01, field_03, field_06, field_07,
//                         field_10, field_12, field_14, field_17, hasld
//   编辑页全字段 34 个:  TEST_TYPEID/DESCRIPTION/DESCRIPTION_LONGDESCRIPTION/FIELD_01~FIELD_32
//                        (FIELD_20/21 不存在)/HASLD;  YORN: hasld, field_12, field_13;
//                        BLOB: field_26(不回写); CRYPTO: field_27/28(编辑时保持原值, 仅新建可写)
// =============================================================================

// load('nashorn:mozilla_compat.js');
// importPackage(java.io);
// importPackage(java.sql);

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8

/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat")

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

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");

/** 省略访问控制检查(No Access), setValue/add/save 通用 */
var NA = MboConstants.NOACCESS;

/** 引入 SKS_COMMONS_UTILS —— 按 MAXTYPE 类型码自动分派字段值的读写 */
/** @type {any} */
var sksCommonsUtils = service.invokeScript("SKS_COMMONS_UTILS");

var scriptName = service.getScriptName()

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
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
// logger.setLevel(Level.INFO);
logger.info("[" + scriptName + "]----------------Starting execution of script " + service.getScriptName());


//如果是多语言的表,通过下面方式设置语言环境的数据
var _langcode = "EN";
if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
  _langcode = request.getQueryParam("_langcode").toUpperCase();
  uInfo.setLangCode(_langcode);
  logger.info("[" + scriptName + "] _langcode=" + _langcode + ", langCode=" + uInfo.getLocale().getLanguage());
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



// =============================================================================
// 对象与字段定义
// =============================================================================

/** 目标 MBO 对象 */
var OBJECT_NAME = "TEST_TYPE";

/**
 * 列表字段(与前端列表页一致, 用户指定顺序, 全小写实际列名)
 */
var LIST_FIELDS = [
  "test_typeid", "description", "field_01", "field_03", "field_06", "field_07",
  "field_10", "field_12", "field_14", "field_17", "hasld"
];

/**
 * 编辑页全字段(TEST_TYPE 表 34 个业务字段, 不含 FIELD_20/21)
 */
var ALL_FIELDS = [
  "test_typeid", "description", "description_longdescription",
  "field_01", "field_02", "field_03", "field_04", "field_05", "field_06", "field_07",
  "field_08", "field_09", "field_10", "field_11", "field_12", "field_13", "field_14",
  "field_15", "field_16", "field_17", "field_18", "field_19",
  "field_22", "field_23", "field_24", "field_25", "field_26", "field_27", "field_28",
  "field_29", "field_30", "field_31", "field_32",
  "hasld"
];

// -----------------------------------------------------------------------------
// 字段业务规则
// -----------------------------------------------------------------------------

/** 不经 JSON 读取的字段(BLOB 二进制无法 JSON 化) */
var SKIP_READ_FIELDS = { "field_26": true };

/** 不经 JSON 回写的字段(BLOB + HASLD 由 MBO 自动维护) */
var SKIP_WRITE_FIELDS = { "field_26": true, "hasld": true };

/** CRYPTO/CRYPTOX 字段: 编辑时不回写(避免把密文当明文二次加密), 仅新建可写 */
var CRYPTO_FIELDS = { "field_27": true, "field_28": true };


var successData = {}

main();

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
    logger.info("[" + scriptName + "]----------------responseBody error.");
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
    logger.info("[" + scriptName + "]----------------responseBody finally");
    logger.info("[" + scriptName + "]----------------responseBody=" + responseBody + ".");
    addLog()
  }

}

// =============================================================================
// 接口入口: 按 HTTP 方法分发
//   GET       列表(分页+搜索) / detail=1&testtypeid= 详情
//   POST      新建(testtypeid 必填+查重)
//   PATCH/PUT 保存更新(testtypeid 从 URL 或请求体取, 主键不可改)
// =============================================================================
function process() {
  try {
    var method = String(typeof httpMethod !== 'undefined' && httpMethod ? httpMethod : "GET").toUpperCase();
    var qpTestTypeId = getQueryParam("testtypeid");
    var qpDetail = getQueryParam("detail");
    logger.info("[" + scriptName + "] process() method=" + method +
      ", queryParams: detail=" + qpDetail + ", testtypeid=" + qpTestTypeId +
      ", page=" + getQueryParam("page") + ", pageSize=" + getQueryParam("pageSize"));

    if (method === "GET") {
      if (qpDetail === "1" && qpTestTypeId) {
        return getDetail(qpTestTypeId);
      }
      return getList();
    }

    var body = parseRequestBody();

    // Servlet 2.5 不支持 PATCH/PUT，前端用 POST + _op=update 查询参数区分写操作
    var op = getQueryParam("_op");

    if (method === "POST") {
      if (op === "update") {
        var tid = qpTestTypeId;
        if (!tid && body && body.test_typeid !== undefined && body.test_typeid !== null && String(body.test_typeid) !== "") {
          tid = String(body.test_typeid);
        }
        return updateRecord(tid, body);
      }
      return createRecord(body);
    }

    if (method === "PATCH" || method === "PUT") {
      var tid2 = qpTestTypeId;
      if (!tid2 && body && body.test_typeid !== undefined && body.test_typeid !== null && String(body.test_typeid) !== "") {
        tid2 = String(body.test_typeid);
      }
      return updateRecord(tid2, body);
    }

    throw new MXApplicationException("#", "不支持的 HTTP 方法: " + method + ", 仅支持 GET/POST(_op=update)|PATCH|PUT");
  } catch (error) {
    logger.error(">>> [API ERROR] 脚本执行异常:", error)
    throw error;
  }
}

// =============================================================================
// 查询
// =============================================================================

/**
 * 列表: GET ?page=&pageSize=&testtypeid=&description=&field_01=&field_03=
 * 返回 {list:[...], total, page, pageSize}
 */
function getList() {
  /** @type {psdi.mbo.MboSetRemote} */
  var set = null;
  try {
    var page = toPositiveInt(getQueryParam("page"), 1);
    var pageSize = toPositiveInt(getQueryParam("pageSize"), 20);
    if (pageSize > 500) {
      pageSize = 500;
    }
    var whereClause = buildSearchWhere();

    set = MXServer.getMXServer().getMboSet(OBJECT_NAME, userInfo);
    set.setWhere(whereClause);
    set.setOrderBy("test_typeid");
    set.reset();

    var total = set.count();
    var list = [];
    var idx = 0;
    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    var mbo = set.moveFirst();
    while (mbo != null) {
      if (idx >= start && idx < end) {
        list.push(buildListRow(mbo));
      }
      idx++;
      mbo = set.moveNext();
    }

    logger.info("[" + scriptName + "] getList 完成: 共 " + total + " 条, 返回 " + list.length + " 条");
    return { list: list, total: total, page: page, pageSize: pageSize };
  } finally {
    _close(set);
  }
}

/**
 * 单条详情: GET ?detail=1&testtypeid=<主键> 返回全部 34 个字段
 */
function getDetail(testtypeid) {
  /** @type {psdi.mbo.MboSetRemote} */
  var set = null;
  try {
    var n = toLong(testtypeid, null);
    if (n === null) {
      throw new MXApplicationException("#", "testtypeid 必须是数字: " + testtypeid);
    }
    set = MXServer.getMXServer().getMboSet(OBJECT_NAME, userInfo);
    var f = new SqlFormat("test_typeid = :1");
    f.setLong(1, n);
    set.setWhere(f.format());
    set.reset();
    var mbo = set.moveFirst();
    if (mbo == null) {
      throw new MXApplicationException("#", "未找到 testtypeid=" + testtypeid + " 的记录");
    }
    return buildFullRow(mbo);
  } finally {
    _close(set);
  }
}

/**
 * 列表搜索条件(testtypeid 精确, description/field_01/field_03 模糊包含)
 */
function buildSearchWhere() {
  var conds = [];
  var t = getQueryParam("testtypeid");
  if (t) {
    var n = toLong(t, null);
    if (n !== null) {
      var f = new SqlFormat("test_typeid = :1");
      f.setLong(1, n);
      conds.push(f.format());
    }
  }
  // field_03 为 UPPER 类型(库中存大写), 用 UPPER(列) like 匹配
  var likeCols = [
    { col: "description", upper: false },
    { col: "field_01", upper: false },
    { col: "field_03", upper: true }
  ];
  for (var i = 0; i < likeCols.length; i++) {
    var v = getQueryParam(likeCols[i].col);
    if (!v) {
      continue;
    }
    var f2 = new SqlFormat((likeCols[i].upper ? "upper(" + likeCols[i].col + ")" : likeCols[i].col) + " like :1");
    f2.setString(1, "%" + (likeCols[i].upper ? String(v).toUpperCase() : String(v)) + "%");
    conds.push(f2.format());
  }
  return conds.length > 0 ? conds.join(" and ") : "1=1";
}

/** 列表行(11 字段, 与前端列一致) */
function buildListRow(mbo) {
  var row = {};
  for (var i = 0; i < LIST_FIELDS.length; i++) {
    row[LIST_FIELDS[i]] = getFieldValue(mbo, LIST_FIELDS[i]);
  }
  return row;
}

/** 详情/新建/更新后的完整记录(全部 34 个字段) */
function buildFullRow(mbo) {
  var row = {};
  for (var i = 0; i < ALL_FIELDS.length; i++) {
    row[ALL_FIELDS[i]] = getFieldValue(mbo, ALL_FIELDS[i]);
  }
  return row;
}

/**
 * 读取字段值, 委托 SKS_COMMONS_UTILS.getValueByMaxTypeDateTimeAutoZhcn ——
 *   按 MAXTYPE 类型码自动分派 getter, 日期字段用中文偏好格式:
 *     字符串 → getString()
 *     整数/大整数 → getLong()
 *     小数/金额/浮点 → getDouble()
 *     YORN → getBoolean() (JS true/false)
 *     DATETIME → SimpleDateFormat("yyyy-MM-dd HH:mm:ss")
 *     DATE → MXFormat.dateToSQLString() (yyyy-MM-dd)
 *     TIME → MXFormat.timeToSQLString() (HH:mm:ss)
 *     BLOB → null (前端不处理二进制)
 * 空值统一返回 null, 异常兜底返回 null。
 */
function getFieldValue(mbo, attr) {
  try {
    if (mbo.isNull(attr)) {
      return null;
    }
    if (SKIP_READ_FIELDS[attr]) {
      return null;
    }
    // 委托 commons 按 MAXTYPE 自动分派
    return sksCommonsUtils.getValueByMaxTypeDateTimeAutoZhcn(service, mbo, attr);
  } catch (ignored) {
    return null;
  }
}

// =============================================================================
// 写入
// =============================================================================

/**
 * 新建: POST, 请求体 testtypeid 可选——未提供时由 MboSet.add() 自动生成;
 *       若显式提供则查重后使用(主键必须为数字)
 * 返回完整记录
 */
function createRecord(body) {
  if (!body) {
    throw new MXApplicationException("#", "新建记录请求体(requestBody)不能为空");
  }
  var explicitId = (body.test_typeid === undefined || body.test_typeid === null || String(body.test_typeid) === "") ? null : toLong(body.test_typeid, null);
  if (explicitId === null && body.test_typeid !== undefined && body.test_typeid !== null && String(body.test_typeid) !== "") {
    throw new MXApplicationException("#", "test_typeid 必须是数字: " + body.test_typeid);
  }

  /** @type {psdi.mbo.MboSetRemote} */
  var set = null;
  try {
    set = MXServer.getMXServer().getMboSet(OBJECT_NAME, userInfo);

    // 显式提供主键 → 先查重
    if (explicitId !== null) {
      var f = new SqlFormat("test_typeid = :1");
      f.setLong(1, explicitId);
      set.setWhere(f.format());
      set.reset();
      if (!set.isEmpty()) {
        throw new MXApplicationException("#", "test_typeid=" + explicitId + " 已存在, 不能重复新建");
      }
      set.setWhere("1=0");   // 清空 where，add() 才能成功
      set.reset();
    }

    var mbo = set.add(NA);
    if (explicitId !== null) {
      mbo.setValue("test_typeid", explicitId, NA);
    }
    // 否则: MboSet.add() 会自动填充主键(MustBe+Required 触发 setAutoKey)

    applyFields(mbo, body, false);
    set.save(NA);

    // 取实际生成的主键(自动/显式)
    var actualId = mbo.getLong("test_typeid");
    logger.info("[" + scriptName + "] createRecord 成功: test_typeid=" + actualId + " (" + (explicitId !== null ? "显式提供" : "自动生成") + ")");
  } finally {
    _close(set);
  }
  return getDetail(String(actualId));
}

/**
 * 更新: PATCH/PUT, testtypeid 从 URL 或请求体取(主键本身不可修改)
 * 返回完整记录
 */
function updateRecord(testtypeid, body) {
  if (!body) {
    throw new MXApplicationException("#", "更新记录请求体(requestBody)不能为空");
  }
  var n = toLong(testtypeid, null);
  if (n === null) {
    throw new MXApplicationException("#", "testtypeid(主键, 从 URL 或请求体提供)必须是数字: " + testtypeid);
  }

  /** @type {psdi.mbo.MboSetRemote} */
  var set = null;
  try {
    set = MXServer.getMXServer().getMboSet(OBJECT_NAME, userInfo);
    var f = new SqlFormat("test_typeid = :1");
    f.setLong(1, n);
    set.setWhere(f.format());
    set.reset();
    if (set.isEmpty()) {
      throw new MXApplicationException("#", "未找到 testtypeid=" + testtypeid + " 的记录, 无法保存");
    }
    var mbo = set.getMbo(0);
    applyFields(mbo, body, true);
    set.save(NA);
    logger.info("[" + scriptName + "] updateRecord 成功: testtypeid=" + n);
  } finally {
    _close(set);
  }
  return getDetail(String(n));
}

/**
 * 按 ALL_FIELDS 把请求体中的字段写入 mbo
 * 主键 test_typeid 单独处理不在此写; BLOB 不回写; 编辑时 CRYPTO/CRYPTOX 保持原值
 * 类型转换委托 Maximo setValue 自动完成(YORN 接受 boolean, 数字接受 number, 日期接受字符串)
 */
function applyFields(mbo, body, isUpdate) {
  for (var i = 0; i < ALL_FIELDS.length; i++) {
    var attr = ALL_FIELDS[i];
    if (attr === "test_typeid") {
      continue;
    }
    if (SKIP_WRITE_FIELDS[attr]) {
      continue;
    }
    if (isUpdate && CRYPTO_FIELDS[attr]) {
      continue;
    }
    var raw = body[attr];
    if (raw === undefined ) {
      continue;
    }
    logger.info("\x1b[34;40m[" + scriptName + "] applyFields: " + attr + "=" + raw + "\x1b[0m")
    // Maximo setValue 按字段 MAXTYPE 自动完成转换:
    //   boolean → YORN 的 Y/N
    //   number (int/double) → INTEGER/BIGINT/DECIMAL/AMOUNT/FLOAT/DURATION
    //   string → ALN/UPPER/LOWER/LONGALN/CLOB/CRYPTO, 以及 DATE/DATETIME/TIME
    //            (日期字符串按 MXFormat 标准格式解析, 前端已发送正确格式)
    sksCommonsUtils.autoMboSetValue(service, mbo, attr, raw, NA);
  }
}

// =============================================================================
// 通用辅助方法
// =============================================================================

/** 解析 POST/PATCH 请求体(JSON), 为空返回 null */
function parseRequestBody() {
  if (typeof requestBody === 'undefined' || !requestBody) {
    return null;
  }
  try {
    var data = JSON.parse(requestBody);
    return data;
  } catch (error) {
    throw new MXApplicationException('#', '请求体(requestBody) JSON 解析失败: ' + error);
  }
}

/** 读取 URL 查询参数, 缺省/空串返回 null(Maximo 的 getQueryParam 缺省返回字符串 "undefined") */
function getQueryParam(name) {
  try {
    var val = request.getQueryParam(name);
    if (val === undefined || val === null) {
      return null;
    }
    val = String(val);
    if (val === "" || val === "undefined" || val === "null") {
      return null;
    }
    return val;
  } catch (ignored) {
    return null;
  }
}

/** 转长整型, 无效时返回缺省值 */
function toLong(value, defaultVal) {
  if (value === undefined || value === null || value === "") {
    return defaultVal;
  }
  var num = parseInt(value, 10);
  return isNaN(num) ? defaultVal : num;
}

/** 转正整数, 无效或 <=0 时返回缺省值 */
function toPositiveInt(value, defaultVal) {
  var num = toLong(value, defaultVal);
  return (num === null || num <= 0) ? defaultVal : num;
}

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
 * 接口调用日志(Main 的 finally 中调用, 无外部系统/主业务记录, 走 logger 记录)
 */
function addLog() {
  try {
    logger.info("[" + scriptName + "] addLog: httpMethod=" + httpMethod +
      ", requestBody=" + requestBody +
      ", responseBody=" + (typeof responseBody !== 'undefined' ? responseBody : ""));
  } catch (ignored) { }
}