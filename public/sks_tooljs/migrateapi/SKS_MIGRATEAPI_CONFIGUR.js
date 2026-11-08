// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable no-undef */
// @ts-nocheck
// ============================================================================
// 对象配置(DBCONFIG, maxObjects 结构)导入接口 —— 新模式接口
// 核心导入逻辑移植(复制改写)自 SKS.AUTOSCRIPT.LIBRARY:
//   MaxObject 构造函数 / MaxObject.prototype.setMboValues / addOrUpdateMaxObject
//
// 调用方式:
//   POST /maximo/api/script/SKS_MIGRATEAPI_CONFIGUR?_action=import
//        body: { "maxObjects": [ { object, description, attributes:[...],
//                                   indexes:[...], relationships:[...] }, ... ] }
//        兼容: body 直接传数组 [...] 或单个对象定义 { "object": "RFQ", ... }
//   POST /maximo/api/script/SKS_MIGRATEAPI_CONFIGUR?_action=export&ignoreDefVal=true&_langcode=zh
//        body: { "objectNames": [ "RFQ", ... ] }
//        兼容: { "maxObjects": [...] }(取各项 object 名) / 裸数组(字符串或对象定义) / 单对象定义
//
// query 参数:
//   _action=import|export      默认 import; 其它值返回 error
//   dmDeploySet=true|false     [import] 默认 false; true 时对 MAXOBJECTCFG 及其子 MAXATTRIBUTECFG
//                              set 调用 setDMDeploySet(true)(等价源脚本 forceImport),
//                              并无条件显式设置 MAXTYPE/LENGTH/SCALE(见下方说明)
//   ignoreAttributes=true      [import] 跳过 MAXATTRIBUTECFG 属性处理
//   ignoreRelationships=true   [import] 跳过 MAXRELATIONSHIP 关系处理
//   ignoreDefVal=true          [export] 默认 false; true 精简导出(只输出非默认值字段),
//                              false 全字段导出(字段方式参考 SKS_EXPORT_DBCONFIG)
//   _allLangcode=true          [export] 对本地化字段附加 "sks:langdata":
//                              { "<字段名>": { "<LANGCODE>": "<值>" } }
//                              (对象 DESCRIPTION→MAXOBJECTMLS, 属性 DESCRIPTION/TITLE/REMARKS→
//                               MAXATTRIBUTEMLS, 关系 REMARKS→MAXRELATIONSHIPMLS;
//                               MLS 查询失败不影响主导出); sks: 前缀避免与业务字段冲突
//   _langcode=ZH               设置会话语言
//   _debug=true                返回 debugMsg
//
// MAXTYPE/LENGTH/SCALE 与源逻辑的差异(用户明确要求):
//   源逻辑: 仅当 sameAsAttribute 与 sameAsObject 都未提供时才设置, 且 length/scale
//           用真值判断(0 被跳过)。
//   本接口: dmDeploySet=true 时, 只要 config 中该键 !== undefined && !== null 就设置
//           (0 也设置), 不再受 sameAs 条件限制, 并在设置 sameAsObject/sameAsAttribute
//           之前先设置; 原因: 等同属性引用的对象/属性在目标环境可能还不存在,
//           开启 DM 迁移模式时直接显式设置类型信息。
//   dmDeploySet=false 时保持源逻辑不变。
//
// dmDeploySet=true 的对象变更标志补齐:
//   部署集模式下 MBO 框架不会联动把主对象 MAXOBJECTCFG.CHANGED 置为变更,
//   会出现"字段显示 Add 但对象无变更, 数据库配置提示无可配置项";
//   CHANGED 为单字符编码(N=无变更, I=新增, A=修改, D=删除), 因此存在新增/更新子行
//   (或本身为新增对象)且当前为 N/空时显式置为 I(新增)或 A(修改)。
//
// 安全策略: 源脚本 deployMaxObjects 中 delete:true 的删除已被注释掉(安全第一),
//           本脚本同样不执行任何删除: 对象级 delete:true 记为 skipped;
//           属性/索引/关系行内 delete:true 跳过该行并计数, 不删除。
//
// 返回 responseBody(JSON 字符串, UTF-8) —— 对齐 SKS.AUTOSCRIPT.SCREENS 导入返回规范:
//   子级(属性/索引/关系)同样以行数组返回, 每行盖相同 sks: 前缀统计字段,
//   客户端可多层循环、分批分次导入统一统计; sks: 前缀避免与业务字段冲突。
//   成功: { status:'success',
//           message:'导入完成 共N个对象：新增X 更新Y 跳过Z 失败W；总计 成功S 忽略I 失败F',
//           data:{ total, added, updated, skipped, failed,          // 对象级聚合(保留)
//                  results:[ 对象行 ],
//                  "sks:successSumTotal": Σ各对象行 sks:successSumTotal(含子级递归全局总数),
//                  "sks:failSumTotal":    Σ各对象行 sks:failSumTotal,
//                  "sks:ignoreSumTotal":  Σ各对象行 sks:ignoreSumTotal } }
//   对象行: { object, "sks:objectName":"MAXOBJECT", "sks:ref":对象名, "_apiAction":"imp",
//             "_status":'success'|'failed'|'skipped',
//             "_operation":'added'|'updated'|'skipped'(delete标记未执行; failed 行无),
//             "_message"(有提示才给),
//             attributes/indexes/relationships: 子级行数组(对象失败时保留已处理部分行, 无则空数组),
//             6 个统计字段(见下) }
//   子级行: { "sks:objectName":'MAXATTRIBUTE'|'MAXSYSINDEXES'|'MAXRELATIONSHIP',
//             "sks:ref":行名, "_apiAction":"imp", "_status"/"_operation"/"_message"(同上),
//             6 个统计字段 }
//   行级 6 统计字段(stampImportStats 语义):
//     sks:successTotal/sks:failTotal/sks:ignoreTotal: 本行 own 层级计数——
//       对象行只算该行自身(success→1/0/0, failed→0/1/0, skipped→0/0/1);
//       子行恒为 0(own 层级在父行统计, 避免重复计数)。
//     sks:successSumTotal/sks:failSumTotal/sks:ignoreSumTotal: 含嵌套子数组的递归总数——
//       对象行 = 自身 + 三个子数组; 子行 = 自身(无嵌套数组)。
//   整体异常(body 解析失败等):
//         { status:'error', message, errorMessageTrace, debugMsg? }
//   单个对象失败不中断整体: 记录到 results 后继续处理下一个对象。
//
//   _action=export 成功返回(对齐本接口风格, 字段方式参考 SKS_EXPORT_DBCONFIG):
//   { status:'success', message:'导出完成 共N个对象',
//     data:{ maxObjects:[ { object, description, level, entity, service, ...,
//                           attributes:[ { attribute, description, title, type, ... } ],
//                           relationships:[ { relationship, child, whereClause, ... } },
//                           indexes:[ { index, table, columns:[ { column, ordering, colSeq } ] } ] } ] } }
//   _allLangcode=true 时对象/属性/关系行附 "sks:langdata": { "<字段名>": { "<LANGCODE>": "<值>" } }。
// ============================================================================

/** @type {psdi.mbo.MboConstants} */
var MboConstants = Java.type("psdi.mbo.MboConstants");
/** @type {psdi.mbo.SqlFormat} */
var SqlFormat = Java.type("psdi.mbo.SqlFormat");
/** @type {psdi.server.MXServer} */
var MXServer = Java.type("psdi.server.MXServer");
/** @type {psdi.util.MXApplicationException} */
var MXApplicationException = Java.type("psdi.util.MXApplicationException");
/** @type {psdi.util.logging.MXLoggerFactory} */
var MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {java.lang.StringBuilder} */
var StringBuilder = Java.type("java.lang.StringBuilder");
/** @type {java.io.StringWriter} */
var StringWriter = Java.type("java.io.StringWriter");
/** @type {java.io.PrintWriter} */
var PrintWriter = Java.type("java.io.PrintWriter");

var scriptName = service.getScriptName();
// 通过 invokeScript 调用本脚本时 service 可能不在闭包作用域, 顶层先捕获
var svc = service;
var mxserver = MXServer.getMXServer();

/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils = null;
/** @type {jscustom.AnsiLogger} */
var logger = loggerMX;
try {
  sksLogAnsiUtils = svc.invokeScript("SKS_LOG_ANSI_UTILS");
  logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true });
} catch (ignored) {
  logger = loggerMX;
}
logger.info("[" + scriptName + "]----------Starting execution of script");

// 多语言表环境: 通过 _langcode 设置会话语言
var _langcode = "EN";
if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
  _langcode = String(request.getQueryParam("_langcode")).toUpperCase();
  userInfo.setLangCode(_langcode);
}

/** @type {java.lang.StringBuilder} */
var debugMsg = new StringBuilder();
var paramDebug = false;
if (request.getQueryParam("_debug") !== 'undefined' && request.getQueryParam("_debug")) {
  paramDebug = request.getQueryParam("_debug") === 'true';
}

var OBJECT_NAME = "MAXOBJECTCFG";

var successData = {};
var responseMessage = "";

function main() {
  try {
    // 管理模式下不允许执行脚本, 抛出异常
    //这个就不判断了,先注释掉
    // if (Java.type("psdi.iface.mic.MicUtil").getAdminModeState()) {
    //   throw new MXApplicationException("ibm_system", "AdminOnThis");
    // }
    successData = process();
    var resData = {
      status: "success",
      data: successData,
      message: responseMessage === "" ? "Script executed successfully" : responseMessage
    };
    if (paramDebug) {
      resData.debugMsg = debugMsg.toString();
    }
    responseBody = JSON.stringify(resData);
  } catch (error) {
    logger.error(">>> [API ERROR] 全局捕获异常:", error);
    var errorMessage = "error";
    var errorMessageTrace = "";
    try {
      errorMessage = getErrorMessage(error);
    } catch (e) { /* ignore */ }
    try {
      errorMessageTrace = getErrorStackTrace(error);
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
  logger.info("[" + scriptName + "] _action=" + action + ", _langcode=" + _langcode
    + ", dmDeploySet=" + config.dmDeploySet
    + ", ignoreAttributes=" + config.ignoreAttributes
    + ", ignoreRelationships=" + config.ignoreRelationships);
  if (action === "import") {
    return doImport(config);
  }
  if (action === "export") {
    return doExport(config);
  }
  throw new MXApplicationException("#", "不支持的 _action: " + action + " (目前实现 import|export)");
}

function buildConfig(action) {
  return {
    _service: svc,
    _userInfo: userInfo,
    _langcode: _langcode,
    _action: action,
    _body: parseRequestBody(),
    _debug: paramDebug,
    dmDeploySet: (qparam("dmDeploySet") === "true" || qparam("_dmDeploySet") === "true"),
    ignoreAttributes: (qparam("ignoreAttributes") === "true"),
    ignoreRelationships: (qparam("ignoreRelationships") === "true"),
    ignoreDefVal: (qparam("ignoreDefVal") === "true"),
    allLangcode: (qparam("_allLangcode") === "true")
  };
}

function getAction() {
  var a = qparam("_action");
  return a === null ? "import" : a;
}

/**
 * 解析请求体: 支持 {maxObjects:[...]} / 直接数组 / 单个对象定义 {object:...}
 * @returns {Object}
 */
function parseRequestBody() {
  if (typeof requestBody === "undefined" || requestBody === null) {
    return {};
  }
  var s = String(requestBody);
  if (s === "" || s === "undefined" || s === "null") {
    return {};
  }
  var parsed;
  try {
    parsed = JSON.parse(s);
  } catch (e) {
    throw new MXApplicationException("#", "请求体不是合法的 JSON: " + (e.message || e));
  }
  if (parsed === null || typeof parsed === "undefined") {
    return {};
  }
  if (Array.isArray(parsed)) {
    return { maxObjects: parsed };
  }
  if (typeof parsed === "object" && parsed.maxObjects === undefined && parsed.object !== undefined) {
    return { maxObjects: [parsed] };
  }
  return parsed;
}

/**
 * 从请求体取 maxObjects 数组
 * @param {Object} body
 * @returns {Array<Object>|null}
 */
function getMaxObjectsFromBody(body) {
  if (!body) {
    return null;
  }
  if (Array.isArray(body)) {
    return body;
  }
  if (Array.isArray(body.maxObjects)) {
    return body.maxObjects;
  }
  if (body.object !== undefined) {
    return [body];
  }
  return null;
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

/**
 * 取异常消息: MXApplicationException/Java 异常取 getMessage, JS 错误取 message
 * @param {*} error
 * @returns {string}
 */
function getErrorMessage(error) {
  if (error === null || typeof error === "undefined") {
    return "error is null";
  }
  try {
    if (typeof error.getMessage === "function") {
      return String(error.getMessage());
    }
    if (typeof error.message !== "undefined" && error.message !== null) {
      return String(error.message);
    }
  } catch (ignored) { }
  return String(error);
}

/**
 * 取异常堆栈字符串
 * @param {*} error
 * @returns {string}
 */
function getErrorStackTrace(error) {
  if (error === null || typeof error === "undefined") {
    return "error is null";
  }
  try {
    if (typeof error.printStackTrace === "function") {
      var sw = new StringWriter();
      var pw = new PrintWriter(sw);
      error.printStackTrace(pw);
      return sw.toString();
    }
    if (typeof error.stack !== "undefined" && error.stack !== null) {
      return String(error.stack);
    }
  } catch (ignored) {
    return String(error);
  }
  return getErrorMessage(error);
}

function debugPrint(msg) {
  debugMsg.append(String(msg)).append("\n");
}

/**
 * 关闭 MboSet
 */
function _close(set) {
  try {
    if (set) {
      try { set.close(); } catch (ignored) { }
      try { set.cleanup(); } catch (ignored) { }
    }
  } catch (ignored) { }
}

// ---------------------------------------------------------------------------
// 导入统计三件套(对齐 SKS.AUTOSCRIPT.SCREENS 的
// countImportLevel/countImportRecursive/stampImportStats, 增加 ignore 忽略维度):
// _status: success→成功, failed→失败, skipped→忽略
// ---------------------------------------------------------------------------

/**
 * 统计当前层级(不含嵌套子数组)的成功/失败/忽略数量
 * @param {Array|Object} list
 * @returns {Object} {success, fail, ignore}
 */
function countImportLevel(list) {
  var stat = { success: 0, fail: 0, ignore: 0 };
  if (!list) {
    return stat;
  }
  var rows = Array.isArray(list) ? list : [list];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row) {
      continue;
    }
    if (row._status === "success") {
      stat.success++;
    } else if (row._status === "failed") {
      stat.fail++;
    } else if (row._status === "skipped") {
      stat.ignore++;
    }
  }
  return stat;
}

/**
 * 递归统计成功/失败/忽略数量(含行内嵌套数组, 如 attributes/indexes/relationships)
 * @param {Array|Object} list
 * @returns {Object} {success, fail, ignore}
 */
function countImportRecursive(list) {
  var stat = countImportLevel(list);
  if (!list) {
    return stat;
  }
  var rows = Array.isArray(list) ? list : [list];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row) {
      continue;
    }
    for (var k in row) {
      if (!row.hasOwnProperty(k) || !Array.isArray(row[k])) {
        continue;
      }
      var child = countImportRecursive(row[k]);
      stat.success += child.success;
      stat.fail += child.fail;
      stat.ignore += child.ignore;
    }
  }
  return stat;
}

/**
 * 给导入结果行追加统计字段(JSON 数组无法挂属性, 写进每行, 兼容多文件连续导入的统计)
 * 与 SCREENS 版差异: 本接口逐行盖章——
 *   own(sks:successTotal/sks:failTotal/sks:ignoreTotal):
 *     ownZero=false(对象行) → 只计该行自身 _status;
 *     ownZero=true (子行)   → 恒 0(子行自身不算 own, own 层级在父行统计);
 *   sum(sks:successSumTotal/sks:failSumTotal/sks:ignoreSumTotal):
 *     countImportRecursive([row]), 即该行 + 其嵌套子数组(子行无嵌套, sum=该行自身)。
 * @param {Array|Object} list
 * @param {boolean} ownZero 本层级 own 是否清零(子行传 true)
 * @returns {Object} {successSum, failSum, ignoreSum} 各行 sum 字段合计
 */
function stampImportStats(list, ownZero) {
  var totals = { successSum: 0, failSum: 0, ignoreSum: 0 };
  if (!list) {
    return totals;
  }
  var rows = Array.isArray(list) ? list : [list];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row) {
      continue;
    }
    var own = ownZero ? { success: 0, fail: 0, ignore: 0 } : countImportLevel([row]);
    var all = countImportRecursive([row]);
    row["sks:successTotal"] = own.success;
    row["sks:failTotal"] = own.fail;
    row["sks:ignoreTotal"] = own.ignore;
    row["sks:successSumTotal"] = all.success;
    row["sks:failSumTotal"] = all.fail;
    row["sks:ignoreSumTotal"] = all.ignore;
    totals.successSum += all.success;
    totals.failSum += all.fail;
    totals.ignoreSum += all.ignore;
  }
  return totals;
}

// ---------------------------------------------------------------------------
// 导入
// ---------------------------------------------------------------------------

/**
 * 导入 maxObjects 数组, 单个对象失败不中断整体(聚合到 results)
 * @param {Object} config
 * @returns {Object}
 */
function doImport(config) {
  var maxObjects = getMaxObjectsFromBody(config._body);
  if (!maxObjects || maxObjects.length === 0) {
    throw new MXApplicationException("#", "请求体必须包含非空 maxObjects 数组");
  }

  var merged = {
    total: maxObjects.length,
    added: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    results: []
  };

  var grand = { successSum: 0, failSum: 0, ignoreSum: 0 };

  for (var i = 0; i < maxObjects.length; i++) {
    var def = maxObjects[i];
    var objectName = (def && typeof def === "object" && def.object !== undefined && def.object !== null)
      ? String(def.object) : "";
    var item = {
      "object": objectName,
      "sks:objectName": "MAXOBJECT",
      "sks:ref": objectName,
      "_apiAction": "imp"
    };
    if (def && typeof def["sks:uuid"] !== "undefined" && def["sks:uuid"] !== null) {
      item["sks:uuid"] = def["sks:uuid"];
    }
    // 处理进度上下文, 出错时拼入 message 方便定位
    var cacheUseError = { ind1: "", ind2: "", ind3: "", ind4: "" };
    // 出参: 对象处理失败时由 importMaxObject 回填已产生的部分子级结果行数组(数组引用)
    var statsOut = { attributes: null, indexes: null, relationships: null };
    try {
      var r = importMaxObject(config, def, cacheUseError, statsOut);
      item._operation = r.operation;
      item._status = (r.operation === "skipped") ? "skipped" : "success";
      if (r.message) {
        item._message = r.message;
      }
      item.attributes = r.attributes ? r.attributes : [];
      item.indexes = r.indexes ? r.indexes : [];
      item.relationships = r.relationships ? r.relationships : [];
      if (r.operation === "added") {
        merged.added++;
      } else if (r.operation === "updated") {
        merged.updated++;
      } else if (r.operation === "skipped") {
        merged.skipped++;
      }
    } catch (e) {
      item._status = "failed";
      var ctx = String(cacheUseError.ind1 || "") + String(cacheUseError.ind2 || "")
        + String(cacheUseError.ind3 || "") + String(cacheUseError.ind4 || "");
      item._message = getErrorMessage(e) + (ctx === "" ? "" : " @" + ctx);
      // 对象失败时保留已处理的部分子级行
      item.attributes = statsOut.attributes ? statsOut.attributes : [];
      item.indexes = statsOut.indexes ? statsOut.indexes : [];
      item.relationships = statsOut.relationships ? statsOut.relationships : [];
      merged.failed++;
      debugPrint("stack for " + objectName + ":\n" + getErrorStackTrace(e));
      logger.error("[" + scriptName + "] 导入对象失败: " + objectName, e);
    }
    // 子行盖章(own 清零, sum=该行自身), 再对对象行盖章(own=该行自身, sum=自身+子数组递归)
    stampImportStats(item.attributes, true);
    stampImportStats(item.indexes, true);
    stampImportStats(item.relationships, true);
    var st = stampImportStats([item], false);
    grand.successSum += st.successSum;
    grand.failSum += st.failSum;
    grand.ignoreSum += st.ignoreSum;
    merged.results.push(item);
    debugPrint("import " + objectName + " => " + item._status + " " + (item._message || ""));
  }

  // 顶层三个 Sum 字段 = Σ 各对象行的 sum 字段(含子级递归的全局总数)
  merged["sks:successSumTotal"] = grand.successSum;
  merged["sks:failSumTotal"] = grand.failSum;
  merged["sks:ignoreSumTotal"] = grand.ignoreSum;

  responseMessage = "导入完成 共" + merged.total + "个对象：新增" + merged.added
    + " 更新" + merged.updated + " 跳过" + merged.skipped + " 失败" + merged.failed
    + "；总计 成功" + grand.successSum + " 忽略" + grand.ignoreSum + " 失败" + grand.failSum;
  logger.info("[" + scriptName + "] " + responseMessage);
  return merged;
}

/**
 * 导入单个对象(移植自 addOrUpdateMaxObject): MAXOBJECTCFG set、setWhere(objectname)、
 * add/更新、save、finally 关闭; 子 set 随父 save。
 * @param {Object} config
 * @param {Object} maxObjectDef 对象定义(maxObjects 数组中的一项)
 * @param {Object} cacheUseError 进度上下文
 * @param {Object} statsOut 出参, 对象失败时回填已产生的部分子级结果行数组 { attributes, indexes, relationships }
 * @returns {Object} { operation:'added'|'updated'|'skipped', message:string,
 *                      attributes:Array|null, indexes:Array|null, relationships:Array|null }
 */
function importMaxObject(config, maxObjectDef, cacheUseError, statsOut) {
  if (!maxObjectDef || typeof maxObjectDef !== "object") {
    throw new MXApplicationException("#", "对象定义不合法");
  }
  // 安全第一: 与源脚本 deployMaxObjects 一致, delete 标记不执行删除, 记为 skipped
  if (maxObjectDef.delete === true || maxObjectDef.delete === "true") {
    return { operation: "skipped", message: "delete 标记, 未执行删除(安全策略)",
      attributes: null, indexes: null, relationships: null };
  }

  logger.info("[" + scriptName + "] Setting up the " + maxObjectDef.object + " Maximo object.");
  var maxObjectSet = null;
  var maxObjectConfig = null;
  try {
    maxObjectSet = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
    // 迁移模式: 等同源脚本 forceImport 行为
    if (config.dmDeploySet) {
      maxObjectSet.setDMDeploySet(true);
    }
    maxObjectConfig = new MaxObject(maxObjectDef);
    // 防注入: SqlFormat + setObject
    var sqlf = new SqlFormat("objectname = :1");
    sqlf.setObject(1, OBJECT_NAME, "OBJECTNAME", maxObjectDef.object);
    maxObjectSet.setWhere(sqlf.format());

    var operation;
    var masMboObject;
    if (maxObjectSet.isEmpty()) {
      masMboObject = maxObjectSet.add();
      operation = "added";
    } else {
      masMboObject = maxObjectSet.moveFirst();
      operation = "updated";
    }
    var subMessage = maxObjectConfig.setMboValues(config, masMboObject, cacheUseError);
    debugPrint("pre-save UNIQUECOLUMNNAME=" + masMboObject.getString("UNIQUECOLUMNNAME"));
    maxObjectSet.save();
    debugPrint("post-save UNIQUECOLUMNNAME=" + masMboObject.getString("UNIQUECOLUMNNAME"));
    var chkSet = null;
    try {
      chkSet = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
      var sqlfChk = new SqlFormat("objectname = :1");
      sqlfChk.setObject(1, OBJECT_NAME, "OBJECTNAME", maxObjectDef.object);
      chkSet.setWhere(sqlfChk.format());
      debugPrint("reloaded UNIQUECOLUMNNAME=" + chkSet.moveFirst().getString("UNIQUECOLUMNNAME"));
    } finally { _close(chkSet); }
    logger.info("[" + scriptName + "] Set up the " + maxObjectDef.object + " Maximo object. (" + operation + ")");
    // save 成功后读取子级结果行数组
    return { operation: operation, message: subMessage,
      attributes: maxObjectConfig.resultAttributes,
      indexes: maxObjectConfig.resultIndexes,
      relationships: maxObjectConfig.resultRelationships };
  } catch (e) {
    // 对象失败时也把已处理的部分子级行带出(数组引用, 由 doImport 盖章)
    try {
      if (statsOut && maxObjectConfig) {
        statsOut.attributes = maxObjectConfig.resultAttributes;
        statsOut.indexes = maxObjectConfig.resultIndexes;
        statsOut.relationships = maxObjectConfig.resultRelationships;
      }
    } catch (ignoredStats) { }
    try {
      if (maxObjectSet) {
        maxObjectSet.rollback();
      }
    } catch (ignored) { }
    throw e;
  } finally {
    _close(maxObjectSet);
  }
}

// ---------------------------------------------------------------------------
// MaxObject(移植自 SKS.AUTOSCRIPT.LIBRARY L2082-2162): 字段解析与校验
// ---------------------------------------------------------------------------

function MaxObject(maxobject) {
  if (!maxobject) {
    throw new MXApplicationException("", "An maxobject JSON is required to create the MaxObject object.");
  } else if (typeof maxobject.object === "undefined") {
    throw new MXApplicationException("", "The object property is required and must be the name of the object.");
  }

  this.object = maxobject.object;
  this.description = typeof maxobject.description === "undefined" ? "" : maxobject.description;
  this.service = typeof maxobject.service === "undefined" ? null : maxobject.service;
  this.entity = typeof maxobject.entity === "undefined" ? null : maxobject.entity;
  this.className = typeof maxobject.className === "undefined" ? null : maxobject.className;
  this.extendsObject = typeof maxobject.extendsObject === "undefined" ? null : maxobject.extendsObject;
  this.level = typeof maxobject.level === "undefined" ? null : maxobject.level;
  this.triggerRoot = typeof maxobject.triggerRoot === "undefined" ? null : maxobject.triggerRoot;
  this.textDirection = typeof maxobject.textDirection === "undefined" ? null : maxobject.textDirection;
  this.mainObject = typeof maxobject.mainObject === "undefined" ? true : maxobject.mainObject;
  this.storagePartition = typeof maxobject.storagePartition === "undefined" ? null : maxobject.storagePartition;
  this.unqiueColumn = typeof maxobject.unqiueColumn === "undefined" ? null : maxobject.unqiueColumn;
  this.languageTable = typeof maxobject.languageTable === "undefined" ? null : maxobject.languageTable;
  this.languageColumn = typeof maxobject.languageColumn === "undefined" ? null : maxobject.languageColumn;
  this.alternateIndex = typeof maxobject.alternateIndex === "undefined" ? null : maxobject.alternateIndex;
  this.persistent = typeof maxobject.persistent === "undefined" ? true : maxobject.persistent;
  this.addRowstamp = typeof maxobject.addRowstamp === "undefined" ? true : maxobject.addRowstamp;
  this.textSearchEnabled = typeof maxobject.textSearchEnabled === "undefined" ? false : maxobject.textSearchEnabled;
  this.view = typeof maxobject.view === "undefined" ? false : maxobject.view;
  this.viewWhere = typeof maxobject.viewWhere === "undefined" ? null : maxobject.viewWhere;
  this.joinToObject = typeof maxobject.joinToObject === "undefined" ? null : maxobject.joinToObject;
  this.automaticallySelect = typeof maxobject.automaticallySelect === "undefined" ? true : maxobject.automaticallySelect;
  this.viewSelect = typeof maxobject.viewSelect === "undefined" ? null : maxobject.viewSelect;
  this.viewFrom = typeof maxobject.viewFrom === "undefined" ? null : maxobject.viewFrom;
  this.auditEnabled = typeof maxobject.auditEnabled === "undefined" ? false : maxobject.auditEnabled;
  this.auditTable = typeof maxobject.auditTable === "undefined" ? null : maxobject.auditTable;
  this.eAuditFilter = typeof maxobject.eAuditFilter === "undefined" ? null : maxobject.eAuditFilter;
  this.eSignatureFilter = typeof maxobject.eSignatureFilter === "undefined" ? null : maxobject.eSignatureFilter;
  this.ignoreObjectMain = typeof maxobject.ignoreObjectMain === "undefined" ? false : maxobject.ignoreObjectMain;
  this.internal = typeof maxobject.internal === "undefined" ? false : maxobject.internal;

  //attributes
  if (typeof maxobject.attributes !== "undefined" && Array.isArray(maxobject.attributes)) {
    maxobject.attributes.forEach(function (attribute) {
      if (typeof attribute.attribute === "undefined") {
        throw new MXApplicationException("", "The attribute property is required for each attribute.");
      } else if (typeof attribute.description === "undefined" || attribute.description == "") {
        throw new MXApplicationException("", "The description property is required for each attribute");
      } else if (typeof attribute.title === "undefined" || attribute.title == "") {
        throw new MXApplicationException("", "The title property is required for each attribute");
      }
    });
    this.attributes = maxobject.attributes;
  } else {
    this.attributes = [];
  }

  //indexes
  if (typeof maxobject.indexes !== "undefined" && Array.isArray(maxobject.indexes)) {
    maxobject.indexes.forEach(function (index) {
      if (typeof index.index === "undefined") {
        throw new MXApplicationException("", "The index property is required for each index.");
      }
    });
    this.indexes = maxobject.indexes;
  } else {
    this.indexes = [];
  }

  //relationships
  if (typeof maxobject.relationships !== "undefined" && Array.isArray(maxobject.relationships)) {
    maxobject.relationships.forEach(function (relationship) {
      if (typeof relationship.relationship === "undefined") {
        throw new MXApplicationException("", "The relationship property is required for each relationship.");
      } else if (typeof relationship.child === "undefined" && typeof relationship.delete === "undefined") {
        throw new MXApplicationException("", "The child property is required for each relationship.");
      }
    });
    this.relationships = maxobject.relationships;
  } else {
    this.relationships = [];
  }

  //子级(属性/索引/关系)逐行结果数组, setMboValues 循环中逐行 push
  //(对齐 SKS.AUTOSCRIPT.SCREENS 导入返回规范, 每行盖 sks: 统计字段);
  //对象处理中途失败时保留已处理的部分行(importMaxObject 经 statsOut 带出)
  this.resultAttributes = [];
  this.resultIndexes = [];
  this.resultRelationships = [];
}

// ---------------------------------------------------------------------------
// setMboValues(移植自 SKS.AUTOSCRIPT.LIBRARY L2165-2934)
// 与源差异:
//   - forceImport / request.getQueryParam(...) → config.dmDeploySet /
//     config.ignoreAttributes / config.ignoreRelationships
//   - currentCacheUseError 全局 → 入参 cacheUseError
//   - delete:true 不再删除(源脚本属性/索引/关系级会删除), 改为跳过并计数
//   - MAXTYPE/LENGTH/SCALE: dmDeploySet=true 时无条件显式设置(含 0)
//   - 移除源里的 JSONArray/JSONObject 调试转储与冗余日志
//   - 子级逐行结果数组: 循环中向 this.resultAttributes/resultIndexes/resultRelationships
//     push 结果行(每行 sks:objectName/sks:ref/_status/_operation/_apiAction, 统计字段由
//     doImport 的 stampImportStats 盖章); 口径: 新增行→added, 已有行执行更新块→updated,
//     主键列/_updateIgnored/索引已存在/delete标记→skipped, 关系逐条catch→failed(带 _message)
// @returns {string} 附加信息(跳过/失败计数), 无则空串
// ---------------------------------------------------------------------------
MaxObject.prototype.constructor = MaxObject;
MaxObject.prototype.setMboValues = function (config, mbo, cacheUseError) {
  cacheUseError.ind1 = " objectName=" + this.object;
  if (!mbo) {
    throw new MXApplicationException("", "A Mbo is required to set values from the MAXOBJECTCFG object.");
  } else if (!(mbo instanceof Java.type("psdi.mbo.Mbo"))) {
    throw new MXApplicationException("", "The mbo parameter must be an instance of psdi.mbo.Mbo.");
  } else if (!mbo.isBasedOn("MAXOBJECTCFG")) {
    throw new MXApplicationException("", "The mbo parameter must be based on the MAXOBJECTCFG Maximo object.");
  }
  // 应该迁移管理器中会设置该值
  mbo.setMeaFlag(true);

  if (mbo.toBeAdded()) {
    mbo.setValue("OBJECTNAME", this.object);
  }
  // 忽略maximo主表信息更新, 只有更新时候才设置为true, 有些主表信息不能更改, 只能增加字段
  var ignoreObjectMain = (typeof this.ignoreObjectMain === "undefined" || !this.ignoreObjectMain);
  var skipDeleteCount = 0; // 行内 delete 标记被跳过的条数(不执行删除, 用于对象行 _message)
  var relFailCount = 0;    // 关系处理失败条数(用于对象行 _message)
  // 子级逐行结果数组(构造函数已初始化), 循环中逐行 push
  var resAttr = this.resultAttributes;
  var resIdx = this.resultIndexes;
  var resRel = this.resultRelationships;

  // 构造子级结果行骨架(统计字段由 doImport 的 stampImportStats 统一盖章)
  // srcRow 带 sks:uuid(导出时"每行设置UUID"盖的)时原样带回, 便于按导出行对账排查错误
  function newChildRow(sksObjectName, ref, srcRow) {
    var row = {
      "sks:objectName": sksObjectName,
      "sks:ref": ref,
      "_apiAction": "imp"
    };
    if (srcRow && typeof srcRow["sks:uuid"] !== "undefined" && srcRow["sks:uuid"] !== null) {
      row["sks:uuid"] = srcRow["sks:uuid"];
    }
    return row;
  }

  // 判断子级结果数组里是否存在有效新增/更新行(用于 dmDeploySet 下补齐对象变更标志)
  function scanChildRows(rows) {
    for (var ri = 0; rows && ri < rows.length; ri++) {
      var rr = rows[ri];
      if (rr._status === "success" && (rr._operation === "added" || rr._operation === "updated")) {
        return true;
      }
    }
    return false;
  }

  if (ignoreObjectMain) {
    logger.info("[" + scriptName + "] objectName= " + this.object + " change maxobject");
    if (!this.description) {
      throw new MXApplicationException("#", "objectName=" + this.object + " 的描述不能为空");
    }

    mbo.setValue("DESCRIPTION", this.description, 2);

    if (mbo.toBeAdded()) {
      if (this.entity != null) {
        mbo.setValue("ENTITYNAME", this.entity, 2);
      }
    }
    if (this.service != null) {
      mbo.setValue("SERVICENAME", this.service, 2);
    }

    if (this.class != null) {
      mbo.setValue("CLASSNAME", this.class, 2);
    }

    if (mbo.toBeAdded()) {
      if (this.extendsObject != null) {
        mbo.setValue("EXTENDSOBJECT", this.extendsObject, 2);
      }
    }

    if (this.level != null && !mbo.getMboValueData("SITEORGTYPE").isReadOnly()) {
      mbo.setValue("SITEORGTYPE", this.level);
    }

    if (!mbo.getMboValueData("TEXTDIRECTION").isReadOnly()) {
      this.textDirection == null ? mbo.setValueNull("TEXTDIRECTION") : mbo.setValue("TEXTDIRECTION", this.textDirection);
    }

    if (this.triggerRoot != null && !mbo.getMboValueData("TRIGROOT").isReadOnly()) {
      mbo.setValue("TRIGROOT", this.triggerRoot);
    }

    if (typeof this.mainObject !== 'undefined' && this.mainObject != null) {
      mbo.setValue("MAINOBJECT", this.mainObject, 2);
    }
  }

  logger.info("[" + scriptName + "] view change " + this.view);

  if (!this.view) {
    if (mbo.toBeAdded()) {
      if (!mbo.getMboValueData("PERSISTENT").isReadOnly()) {
        mbo.setValue("PERSISTENT", this.persistent);
      }

      if (!mbo.getMboValueData("ADDROWSTAMP").isReadOnly()) {
        mbo.setValue("ADDROWSTAMP", this.addRowstamp);
      }
      // UNIQUECOLUMNNAME: 新对象在属性循环前设置(与 v1 LIBRARY 一致).
      // FldMaxObjectCfgUniqueColumnName(action) 会自动 addKeyColumn 创建同名 BIGINT/required/persistent 属性(PK=1),
      // 后续属性循环会在内存属性集中找到该属性并更新.
      // 用 NOVALIDATION(2) 跳过校验链(校验器会误判"列已存在"), 但保留事件联动.
      if (this.unqiueColumn != null && this.unqiueColumn !== "") {
        cacheUseError.ind3 = " new UNIQUECOLUMNNAME=" + this.unqiueColumn;
        if (config.dmDeploySet && !mbo.isForDM()) { mbo.setForDM(true); }
        mbo.setValue("UNIQUECOLUMNNAME", this.unqiueColumn, 2);
      }
    }
    if (typeof this.internal !== "undefined") {
      mbo.setValue("internal", this.internal, 2);
    }

    // 忽略maximo主表信息更新, 只有更新时候才设置为true, 有些主表信息不能更改, 只能增加字段
    if (ignoreObjectMain) {
      if (this.storagePartition != null) {
        mbo.setValue("STORAGEPARTITION", this.storagePartition, 2);
      }
      if (!mbo.getMboValueData("LANGTABLENAME").isReadOnly()) {
        this.languageTable != null ? mbo.setValue("LANGTABLENAME", this.languageTable) : mbo.setValueNull("LANGTABLENAME");
      }
      if (!mbo.getMboValueData("LANGCOLUMNNAME").isReadOnly()) {
        this.languageColumn != null ? mbo.setValue("LANGCOLUMNNAME", this.languageColumn) : mbo.setValueNull("LANGCOLUMNNAME");
      }

      if (this.indexes.length > 0 && !mbo.getMboValueData("ALTIXNAME").isReadOnly()) {
        this.alternateIndex != null ? mbo.setValue("ALTIXNAME", this.alternateIndex, MboConstants.NOVALIDATION) : mbo.setValueNull("ALTIXNAME");
      }

      if (!mbo.getMboValueData("TEXTSEARCHENABLED").isReadOnly()) {
        mbo.setValue("TEXTSEARCHENABLED", this.textSearchEnabled);
      }
      if (this.auditEnabled !== null && typeof this.auditEnabled !== undefined) {
        if (!mbo.getMboValueData("EAUDITENABLED").isReadOnly()) {
          mbo.setValue("EAUDITENABLED", this.auditEnabled);
        }
        // 如果配置中没有设置审计, 则忽略
        if (mbo.getBoolean("EAUDITENABLED")) {
          this.auditTable != null ? mbo.setValue("EAUDITTBNAME", this.auditTable) : mbo.setValueNull("EAUDITTBNAME");
          this.eAuditFilter != null ? mbo.setValue("EAUDITFILTER", this.eAuditFilter) : mbo.setValueNull("EAUDITFILTER");
          this.eSignatureFilter != null ? mbo.setValue("ESIGFILTER", this.eSignatureFilter) : mbo.setValueNull("ESIGFILTER");
        }
      }
    }
  } else {
    if (mbo.toBeAdded()) {
      mbo.setValue("ISVIEW", this.view, 2);
    }

    this.viewWhere != null ? mbo.setValue("VIEWWHERE", this.viewWhere, 2) : mbo.setValueNull("VIEWWHERE", 2);

    if (this.joinToObject && mbo.toBeAdded()) {
      mbo.setValue("JOINOBJECT", this.joinToObject, 2);
    }

    mbo.setValue("AUTOSELECT", this.automaticallySelect, 2);

    if (!this.automaticallySelect) {
      this.viewSelect != null ? mbo.setValue("VIEWSELECT", this.viewSelect, 2) : mbo.setValueNull("VIEWSELECT", 2);
      this.viewFrom != null ? mbo.setValue("VIEWFROM", this.viewFrom, 2) : mbo.setValueNull("VIEWFROM", 2);
    }
  }

  if (!config.ignoreAttributes) {
    /** @type {psdi.mbo.MboSetRemote} */
    var attributeSet = mbo.getMboSet("MAXATTRIBUTECFG");
    if (config.dmDeploySet) {
      attributeSet.setDMDeploySet(true);
    }

    var isView = this.view;
    var extendsObjectTmp = this.extendsObject;

    for (var attrIndex = 0; attrIndex < this.attributes.length; attrIndex++) {
      var attributeConfig = this.attributes[attrIndex];

      cacheUseError.ind2 = " attrName=" + attributeConfig.attribute;
      var attrRow = newChildRow("MAXATTRIBUTE", attributeConfig.attribute, attributeConfig);
      logger.info("[" + scriptName + "] attrIndex=" + attrIndex + ",attributeConfig.attribute=" + attributeConfig.attribute + " isView=" + isView);
      if (!isView) {
        // 处理非视图属性

        /** @type {psdi.mbo.MboRemote} */
        var attribute = attributeSet.moveFirst();
        while (attribute) {
          if (attribute.getString("ATTRIBUTENAME") == attributeConfig.attribute) {
            break;
          }
          attribute = attributeSet.moveNext();
        }

        if (attributeConfig.delete) {
          // 安全第一: 不删除, 跳过并记录
          skipDeleteCount++;
          attrRow._status = "skipped";
          attrRow._operation = "deleted";
          resAttr.push(attrRow);
          logger.warn("[" + scriptName + "] attribute " + attributeConfig.attribute + " delete 标记已跳过(安全策略)");
        } else if (attribute && attribute.getString("ATTRIBUTENAME").equalsIgnoreCase(mbo.getString("UNIQUECOLUMNNAME"))) {
          if (attributeConfig.description) {
            // 原表中会有空格, 设置为无空格的会有变更, 所以需要去前尾空之后判断是否相同, 避免无意义的变更
            if (attributeConfig.description.trim() !== attribute.getString("REMARKS").trim()) {
              cacheUseError.ind3 = " setValue REMARKS";
              attribute.setValue("REMARKS", attributeConfig.description);
            }
          }
          if (attributeConfig.title) {
            if (attributeConfig.title.trim() !== attribute.getString("TITLE").trim()) {
              attribute.setValue("TITLE", attributeConfig.title);
            }
          }
          // 不是新增的就忽略主键ID
          attrRow._status = "skipped";
          attrRow._operation = "updated";
          resAttr.push(attrRow);
        } else {
          var attrIsNew = !attribute;
          if (!attribute) {
            attribute = attributeSet.add();
            cacheUseError.ind3 = " setValue ATTRIBUTENAME";
            attribute.setValue("ATTRIBUTENAME", attributeConfig.attribute);
            logger.info("attributeConfig.attribute=" + attributeConfig.attribute + ".added");
          }
          if (attribute.isNew() || !attributeConfig._updateIgnored) {
            // 原表中会有空格, 设置为无空格的会有变更, 所以需要去前尾空之后判断是否相同, 避免无意义的变更
            if (attributeConfig.description && attributeConfig.description.trim() !== attribute.getString("REMARKS").trim()) {
              cacheUseError.ind3 = " setValue REMARKS";
              attribute.setValue("REMARKS", attributeConfig.description);
            }
            if (attributeConfig.title && attributeConfig.title.trim() !== attribute.getString("TITLE").trim()) {
              cacheUseError.ind3 = " setValue TITLE";
              attribute.setValue("TITLE", attributeConfig.title);
            }

            if (typeof attributeConfig.class !== "undefined" && !attribute.getMboValueData("CLASSNAME").isReadOnly()) {
              attributeConfig.class == null ? attribute.setValueNull("CLASSNAME") : attribute.setValue("CLASSNAME", attributeConfig.class);
            }

            // ---- MAXTYPE/LENGTH/SCALE (与源逻辑的差异点, 见文件头注释) ----
            if (config.dmDeploySet) {
              // DM 迁移模式: 等同属性引用的对象/属性在目标环境可能还不存在,
              // 无条件显式设置类型信息(0 也是有效值, 不用真值短路判断)
              if (typeof attributeConfig.type !== "undefined" && attributeConfig.type !== null) {
                cacheUseError.ind3 = " setValue MAXTYPE";
                attribute.setValue("MAXTYPE", attributeConfig.type, 2);
              }
              if (typeof attributeConfig.length !== "undefined" && attributeConfig.length !== null) {
                cacheUseError.ind3 = " setValue LENGTH";
                attribute.setValue("LENGTH", attributeConfig.length, 2);
              }
              if (typeof attributeConfig.scale !== "undefined" && attributeConfig.scale !== null) {
                cacheUseError.ind3 = " setValue SCALE";
                attribute.setValue("SCALE", attributeConfig.scale, 2);
              }
            } else if (typeof attributeConfig.sameAsAttribute === "undefined" && typeof attributeConfig.sameAsObject === "undefined") {
              // 源逻辑: 只有等同对象为空的时候才会设置 type 和 length
              if (typeof attributeConfig.type !== "undefined" && !attribute.getMboValueData("MAXTYPE").isReadOnly()) {
                attributeConfig.type == null ? attribute.setValueNull("MAXTYPE", 2) : attribute.setValue("MAXTYPE", attributeConfig.type, 2);
              }

              if (typeof attributeConfig.length !== "undefined" && attributeConfig.length && !attribute.getMboValueData("LENGTH").isReadOnly()) {
                cacheUseError.ind3 = " setValue LENGTH";
                attribute.setValue("LENGTH", attributeConfig.length, 2);
              }

              if (typeof attributeConfig.scale !== "undefined" && attributeConfig.scale && !attribute.getMboValueData("SCALE").isReadOnly()) {
                attribute.setValue("SCALE", attributeConfig.scale, 2);
              }
            }
            // ---- 以上块位于 SAMEASOBJECT/SAMEASATTRIBUTE 设置之前(与源码顺序一致) ----

            if (!attribute.getMboValueData("REQUIRED").isReadOnly()) {
              attribute.setValue("REQUIRED", typeof attributeConfig.required === "undefined" ? false : attributeConfig.required);
            }

            if (typeof attributeConfig.domain !== "undefined" && !attribute.getMboValueData("DOMAINID").isReadOnly()) {
              cacheUseError.ind3 = " setValue DOMAINID";
              if (config.dmDeploySet) {
                attributeConfig.domain == null ? attribute.setValueNull("DOMAINID", 11) : attribute.setValue("DOMAINID", attributeConfig.domain, 11);
              } else {
                attributeConfig.domain == null ? attribute.setValueNull("DOMAINID", 2) : attribute.setValue("DOMAINID", attributeConfig.domain, 2);
              }
            }

            if (typeof attributeConfig.alias !== "undefined") {
              attributeConfig.alias == null ? attribute.setValueNull("ALIAS", 2) : attribute.setValue("ALIAS", attributeConfig.alias, 2);
            }

            if (attributeConfig.persistent !== null && typeof attributeConfig.persistent !== "undefined") {
              attribute.setValue("PERSISTENT", attributeConfig.persistent, 2);
            }

            if (attributeConfig.mustBe !== null && typeof attributeConfig.mustBe !== "undefined") {
              attribute.setValue("MUSTBE", attributeConfig.mustBe, 2);
            }

            if (typeof attributeConfig.columnName !== "undefined" && !attribute.getMboValueData("COLUMNNAME").isReadOnly()) {
              attributeConfig.columnName == null ? attribute.setValueNull("COLUMNNAME") : attribute.setValue("COLUMNNAME", attributeConfig.columnName);
            }

            if (typeof attributeConfig.sameAsObject !== "undefined") {
              attributeConfig.sameAsObject == null ? attribute.setValueNull("SAMEASOBJECT", 2) : attribute.setValue("SAMEASOBJECT", attributeConfig.sameAsObject, 2);
            }
            if (typeof attributeConfig.sameAsAttribute !== "undefined") {
              attributeConfig.sameAsAttribute == null
                ? attribute.setValueNull("SAMEASATTRIBUTE", 2)
                : attribute.setValue("SAMEASATTRIBUTE", attributeConfig.sameAsAttribute, 2);
            }

            if (!attribute.getMboValueData("CANAUTONUM").isReadOnly()) {
              attribute.setValue("CANAUTONUM", typeof attributeConfig.canAutonumber === "undefined" ? false : attributeConfig.canAutonumber);
            }

            if (!attribute.getMboValueData("AUTOKEYNAME").isReadOnly()) {
              if (typeof attributeConfig.autonumber !== "undefined") {
                if (attributeConfig.autonumber == null) {
                  attribute.setValueNull("AUTOKEYNAME");
                } else {
                  attribute.setValue("AUTOKEYNAME", attributeConfig.autonumber);
                }
              }
            } else {
              if (attributeConfig.autonumber) {
                attribute.setValue("AUTOKEYNAME", attributeConfig.autonumber, 11);
              }
            }
            try {
              if (typeof attributeConfig.defaultValue !== "undefined") {
                if (attributeConfig.defaultValue == null) {
                  attribute.setValueNull("DEFAULTVALUE");
                } else {
                  attribute.setValue("DEFAULTVALUE", attributeConfig.defaultValue);
                }
              }
            } catch (ei) { }

            if (!attribute.getMboValueData("SEARCHTYPE").isReadOnly()) {
              if (typeof attributeConfig.searchType !== "undefined") {
                attributeConfig.searchType == null ? attribute.setValueNull("SEARCHTYPE") : attribute.setValue("SEARCHTYPE", attributeConfig.searchType);
              }
            }

            if (!attribute.getMboValueData("LOCALIZABLE").isReadOnly()) {
              attribute.setValue("LOCALIZABLE", typeof attributeConfig.localizable === "undefined" ? false : attributeConfig.localizable);
            }

            if (!attribute.getMboValueData("TEXTDIRECTION").isReadOnly()) {
              if (typeof attributeConfig.textDirection !== "undefined") {
                attributeConfig.textDirection == null
                  ? attribute.setValueNull("TEXTDIRECTION")
                  : attribute.setValue("TEXTDIRECTION", attributeConfig.textDirection);
              }
            }

            if (!attribute.getMboValueData("ISPOSITIVE").isReadOnly()) {
              attribute.setValue("ISPOSITIVE", typeof attributeConfig.positive === "undefined" ? false : attributeConfig.positive);
            }

            if (!attribute.getMboValueData("ISLDOWNER").isReadOnly()) {
              attribute.setValue("ISLDOWNER", typeof attributeConfig.longDescriptionOwner === "undefined" ? false : attributeConfig.longDescriptionOwner);
            }
            if (!attribute.getMboValueData("SEQUENCENAME").isReadOnly()) {
              if (typeof attributeConfig.sequenceName !== "undefined") {
                attributeConfig.sequenceName == null
                  ? attribute.setValueNull("SEQUENCENAME")
                  : attribute.setValue("SEQUENCENAME", attributeConfig.sequenceName);
              }
            }

            if (!attribute.getMboValueData("COMPLEXEXPRESSION").isReadOnly()) {
              if (typeof attributeConfig.typeOfComplexExpression !== "undefined") {
                attributeConfig.typeOfComplexExpression == null
                  ? attribute.setValueNull("COMPLEXEXPRESSION")
                  : attribute.setValue("COMPLEXEXPRESSION", attributeConfig.typeOfComplexExpression);
              }
            }

            if (typeof attributeConfig.eAuditEnabled !== "undefined" && attributeConfig.eAuditEnabled !== null) {
              if (!attribute.getMboValueData("EAUDITENABLED").isReadOnly()) {
                attribute.setValue("EAUDITENABLED", attributeConfig.eAuditEnabled);
              }
            }
            if (!attribute.getMboValueData("MLINUSE").isReadOnly()) {
              attribute.setValue("MLINUSE", typeof attributeConfig.multiLanguageInUse === "undefined" ? false : attributeConfig.multiLanguageInUse);
            }
            if (!attribute.getMboValueData("ESIGENABLED").isReadOnly()) {
              attribute.setValue("ESIGENABLED", typeof attributeConfig.eSignatureEnabled === "undefined" ? false : attributeConfig.eSignatureEnabled);
            }
            if (typeof attributeConfig.primaryColumn === "undefined" || attributeConfig.primaryColumn == null) {
              attribute.setValueNull("PRIMARYKEYCOLSEQ", MboConstants.NOACCESSCHECK);
            } else {
              attribute.setValue("PRIMARYKEYCOLSEQ", attributeConfig.primaryColumn, MboConstants.NOACCESSCHECK);
            }
          }
          if (attrIsNew) {
            attrRow._status = "success";
            attrRow._operation = "added";
          } else if (attributeConfig._updateIgnored) {
            attrRow._status = "skipped";
            attrRow._operation = "updated";
          } else {
            attrRow._status = "success";
            attrRow._operation = "updated";
          }
          resAttr.push(attrRow);
        }
      } else {
        // 处理视图属性

        /** @type {psdi.mbo.MboRemote} */
        var attribute = attributeSet.moveFirst();
        while (attribute) {
          if (attribute.getString("ATTRIBUTENAME") == attributeConfig.attribute) {
            break;
          }
          attribute = attributeSet.moveNext();
        }
        if (attributeConfig.delete) {
          // 安全第一: 不删除, 跳过并记录
          skipDeleteCount++;
          attrRow._status = "skipped";
          attrRow._operation = "deleted";
          resAttr.push(attrRow);
          logger.warn("[" + scriptName + "] view attribute " + attributeConfig.attribute + " delete 标记已跳过(安全策略)");
        } else if (attribute && (attribute.getString("ATTRIBUTENAME").equalsIgnoreCase(mbo.getString("UNIQUECOLUMNNAME"))
          || attribute.getString("ATTRIBUTENAME").equalsIgnoreCase(extendsObjectTmp + "ID")
        )) {
          if (attributeConfig.description) {
            attribute.setValue("REMARKS", attributeConfig.description);
          }
          if (attributeConfig.title) {
            attribute.setValue("TITLE", attributeConfig.title);
          }
          // 不是新增的就忽略主键ID
          attrRow._status = "skipped";
          attrRow._operation = "updated";
          resAttr.push(attrRow);
        } else {
          var attrIsNew = !attribute;
          if (!attribute) {
            attribute = attributeSet.add();
            attribute.setValue("ATTRIBUTENAME", attributeConfig.attribute);
            logger.info("attributeConfig.attribute=" + attributeConfig.attribute + ".added");
          }
          if (attribute.isNew() || !attributeConfig._updateIgnored) {
            var roAlways = ["objectname", "changed", "viewchanged", "attributeno", "userdefined", "eaudittbname", "langtablename", "ishandlecolumn", "entityname", "nextsequenceno"];
            // 取消只读
            attribute.setFieldFlag(roAlways, MboConstants.READONLY, false);

            if (typeof attributeConfig.persistent !== "undefined") {
              attribute.setValue("persistent", attributeConfig.persistent ? true : false, MboConstants.NOACCESSCHECK);
            }
            if (typeof attributeConfig.entityName !== "undefined") {
              if (attributeConfig.entityName) {
                attribute.setValue("entityName", attributeConfig.entityName, MboConstants.NOACCESSCHECK);
              } else {
                attribute.setValueNull("entityName", MboConstants.NOACCESSCHECK);
              }
            }
            if (typeof attributeConfig.columnName !== "undefined") {
              if (attributeConfig.columnName) {
                attribute.setValue("columnName", attributeConfig.columnName, MboConstants.NOACCESSCHECK);
              } else {
                attribute.setValueNull("columnName", MboConstants.NOACCESSCHECK);
              }
            }

            attribute.setValue("REMARKS", attributeConfig.description);
            attribute.setValue("TITLE", attributeConfig.title);

            if (typeof attributeConfig.class !== "undefined" && attributeConfig.class !== null) {
              attribute.setValue("CLASSNAME", attributeConfig.class, MboConstants.NOACCESSCHECK);
            } else {
              attribute.setValueNull("CLASSNAME", MboConstants.NOACCESSCHECK);
            }

            // ---- MAXTYPE/LENGTH/SCALE (与源逻辑的差异点, 见文件头注释) ----
            if (config.dmDeploySet) {
              // DM 迁移模式: 无条件显式设置类型信息(0 也是有效值)
              if (typeof attributeConfig.type !== "undefined" && attributeConfig.type !== null) {
                cacheUseError.ind3 = " setValue MAXTYPE";
                attribute.setValue("MAXTYPE", attributeConfig.type, 2);
              }
              if (typeof attributeConfig.length !== "undefined" && attributeConfig.length !== null) {
                cacheUseError.ind3 = " setValue LENGTH";
                attribute.setValue("LENGTH", attributeConfig.length, 2);
              }
              if (typeof attributeConfig.scale !== "undefined" && attributeConfig.scale !== null) {
                cacheUseError.ind3 = " setValue SCALE";
                attribute.setValue("SCALE", attributeConfig.scale, 2);
              }
            } else if (typeof attributeConfig.sameAsAttribute === "undefined" && typeof attributeConfig.sameAsObject === "undefined") {
              // 源逻辑: 只有等同对象为空的时候才会设置 type 和 length
              if (typeof attributeConfig.type !== "undefined") {
                attribute.setValue("MAXTYPE", attributeConfig.type, 2);
              } else {
                attribute.setValueNull("MAXTYPE", 2);
              }

              if (typeof attributeConfig.length !== "undefined" && attributeConfig.length != null) {
                attribute.setValue("LENGTH", attributeConfig.length, 2);
              }

              if (typeof attributeConfig.scale !== "undefined" && attributeConfig.scale != null) {
                attribute.setValue("SCALE", attributeConfig.scale, 2);
              }
            }
            // ---- 以上块位于 SAMEASOBJECT/SAMEASATTRIBUTE 设置之前(与源码顺序一致) ----

            if (typeof attributeConfig.required === "undefined") {
              if (attributeConfig.required) {
                attribute.setValue("REQUIRED", attributeConfig.required ? true : false, MboConstants.NOACCESSCHECK);
              }
            }

            if (typeof attributeConfig.domain !== "undefined") {
              if (attributeConfig.domain == null) {
                attribute.setValueNull("DOMAINID", 2);
              } else {
                attribute.setValue("DOMAINID", attributeConfig.domain, 2);
              }
            }

            if (typeof attributeConfig.alias !== "undefined") {
              attributeConfig.alias == null ? attribute.setValueNull("ALIAS", 2) : attribute.setValue("ALIAS", attributeConfig.alias, 2);
            }

            if (typeof attributeConfig.mustBe === "undefined") {
              attribute.setValue("MUSTBE", attributeConfig.mustBe ? true : false, MboConstants.NOACCESSCHECK);
            }

            if (typeof attributeConfig.columnName !== "undefined") {
              if (attributeConfig.columnName == null) {
                attribute.setValueNull("COLUMNNAME", 2);
              } else {
                attribute.setValue("COLUMNNAME", attributeConfig.columnName, 2);
              }
            }

            if (typeof attributeConfig.sameAsObject !== "undefined") {
              attributeConfig.sameAsObject == null
                ? attribute.setValueNull("SAMEASOBJECT", 2)
                : attribute.setValue("SAMEASOBJECT", attributeConfig.sameAsObject, 2);
            }
            if (typeof attributeConfig.sameAsAttribute !== "undefined") {
              attributeConfig.sameAsAttribute == null
                ? attribute.setValueNull("SAMEASATTRIBUTE", 2)
                : attribute.setValue("SAMEASATTRIBUTE", attributeConfig.sameAsAttribute, 2);
            }

            if (typeof attributeConfig.canAutonumber !== "undefined") {
              attribute.setValue("CANAUTONUM", attributeConfig.canAutonumber ? true : false, MboConstants.NOACCESSCHECK);
            }

            if (typeof attributeConfig.autonumber !== "undefined") {
              if (attributeConfig.autonumber) {
                attribute.setValue("AUTOKEYNAME", attributeConfig.autonumber, 11);
              } else {
                attribute.setValueNull("AUTOKEYNAME", 2);
              }
            }
            try {
              if (typeof attributeConfig.defaultValue !== "undefined") {
                if (attributeConfig.defaultValue == null) {
                  attribute.setValueNull("DEFAULTVALUE", 2);
                } else {
                  attribute.setValue("DEFAULTVALUE", attributeConfig.defaultValue, 2);
                }
              }
            } catch (ei) { }

            if (typeof attributeConfig.searchType !== "undefined") {
              attributeConfig.searchType == null ? attribute.setValueNull("SEARCHTYPE") : attribute.setValue("SEARCHTYPE", attributeConfig.searchType, 2);
            }

            if (typeof attributeConfig.localizable !== "undefined") {
              attribute.setValue("LOCALIZABLE", typeof attributeConfig.localizable === "undefined" ? false : attributeConfig.localizable, 2);
            }

            if (typeof attributeConfig.textDirection !== "undefined") {
              attributeConfig.textDirection == null
                ? attribute.setValueNull("TEXTDIRECTION", 2)
                : attribute.setValue("TEXTDIRECTION", attributeConfig.textDirection, 2);
            }

            if (typeof attributeConfig.positive !== "undefined") {
              attribute.setValue("ISPOSITIVE", typeof attributeConfig.positive === "undefined" ? false : attributeConfig.positive, 2);
            }

            if (typeof attributeConfig.longDescriptionOwner !== "undefined") {
              attribute.setValue("ISLDOWNER", typeof attributeConfig.longDescriptionOwner === "undefined" ? false : attributeConfig.longDescriptionOwner, 2);
            }
            if (typeof attributeConfig.sequenceName !== "undefined") {
              attributeConfig.sequenceName == null
                ? attribute.setValueNull("SEQUENCENAME", 2)
                : attribute.setValue("SEQUENCENAME", attributeConfig.sequenceName, 2);
            }

            if (typeof attributeConfig.typeOfComplexExpression !== "undefined") {
              attributeConfig.typeOfComplexExpression == null
                ? attribute.setValueNull("COMPLEXEXPRESSION", 2)
                : attribute.setValue("COMPLEXEXPRESSION", attributeConfig.typeOfComplexExpression, 2);
            }

            if (typeof attributeConfig.eAuditEnabled !== "undefined" && attributeConfig.eAuditEnabled !== null) {
              attribute.setValue("EAUDITENABLED", typeof attributeConfig.eAuditEnabled === "undefined" ? false : attributeConfig.eAuditEnabled, 2);
            }
            if (typeof attributeConfig.multiLanguageInUse !== "undefined") {
              attribute.setValue("MLINUSE", typeof attributeConfig.multiLanguageInUse === "undefined" ? false : attributeConfig.multiLanguageInUse, 2);
            }
            if (typeof attributeConfig.eSignatureEnabled !== "undefined") {
              attribute.setValue("ESIGENABLED", typeof attributeConfig.eSignatureEnabled === "undefined" ? false : attributeConfig.eSignatureEnabled, 2);
            }
            if (typeof attributeConfig.primaryColumn !== "undefined") {
              if (attributeConfig.primaryColumn == null) {
                attribute.setValueNull("PRIMARYKEYCOLSEQ", MboConstants.NOACCESSCHECK);
              } else {
                attribute.setValue("PRIMARYKEYCOLSEQ", attributeConfig.primaryColumn, MboConstants.NOACCESSCHECK);
              }
            }
          }
          if (attrIsNew) {
            attrRow._status = "success";
            attrRow._operation = "added";
          } else if (attributeConfig._updateIgnored) {
            attrRow._status = "skipped";
            attrRow._operation = "updated";
          } else {
            attrRow._status = "success";
            attrRow._operation = "updated";
          }
          resAttr.push(attrRow);
        }
      }
    }
  }

  // UNIQUECOLUMNNAME 处理(FldMaxObjectCfgUniqueColumnName, 已反编译核实):
  // - 校验链: validate() 先调父类 FldMaxAttributeCfgColumnName.validate(), 它查
  //   MAXATTRIBUTE where objectname/entityname/columnname = 新唯一列(无排除条件), 只要同名属性已存在就抛
  //   BMXAA0653E "A column with this name already exists" -> 普通 setValue 永远无法把唯一列改成已存在的属性
  // - 联动在 action()(不受 NOVALIDATION 标志跳过): changeKeyColumn(旧列属性) + addKeyColumn(新列, 不存在才建),
  //   即清旧唯一列属性、保证新唯一列属性为 BIGINT/required/persistent 并作为键列
  // - 所以更新路径必须用 NOVALIDATION(2) 设置; 值相同则跳过(避免无谓联动)
  if (!this.view && !mbo.toBeAdded() && this.unqiueColumn != null && this.unqiueColumn !== "") {
    var curUniqueColumn = mbo.getString("UNIQUECOLUMNNAME");
    if (curUniqueColumn == null || !curUniqueColumn.equalsIgnoreCase(this.unqiueColumn)) {
      cacheUseError.ind2 = "";
      cacheUseError.ind3 = " setValue UNIQUECOLUMNNAME=" + this.unqiueColumn;
      // MboValue._setValue 仅在 mbo.isForDM() 时跳过字段校验器(NOVALIDATION 标志不拦截该路径),
      // 与部署机制一致: dmDeploySet=true 时显式置 DM 标志, 让 action() 联动完成唯一列切换
      debugPrint("UNIQUECOLUMNNAME change: isForDM(before)=" + mbo.isForDM() + " dmDeploySet=" + config.dmDeploySet);
      if (config.dmDeploySet && !mbo.isForDM()) { mbo.setForDM(true); }
      mbo.setValue("UNIQUECOLUMNNAME", this.unqiueColumn, 2);
      debugPrint("UNIQUECOLUMNNAME after setValue: " + mbo.getString("UNIQUECOLUMNNAME"));
    }
  }

  if (this.indexes && Array.isArray(this.indexes) && this.indexes.length > 0) {
    var indexSet = mbo.getMboSet("MAXSYSINDEXES");
    this.indexes.forEach(function (indexConfig) {
      cacheUseError.ind3 = " index.name=" + indexConfig.index;
      var idxRow = newChildRow("MAXSYSINDEXES", indexConfig.index, indexConfig);
      var index = indexSet.moveFirst();
      while (index) {
        if (index.getString("NAME").equalsIgnoreCase(indexConfig.index)) {
          break;
        }
        index = indexSet.moveNext();
      }
      if (indexConfig.delete) {
        // 安全第一: 不删除, 跳过并记录
        skipDeleteCount++;
        idxRow._status = "skipped";
        idxRow._operation = "deleted";
        resIdx.push(idxRow);
        logger.warn("[" + scriptName + "] index " + indexConfig.index + " delete 标记已跳过(安全策略)");
      } else if (!index && typeof indexConfig.columns !== "undefined" && Array.isArray(indexConfig.columns) && indexConfig.columns.length > 0) {
        idxRow._status = "success";
        idxRow._operation = "added";
        resIdx.push(idxRow);
        index = indexSet.add();
        index.setValue("NAME", indexConfig.index);
        index.setValue("UNIQUE", typeof indexConfig.enforceUniqueness === "undefined" ? false : indexConfig.enforceUniqueness);
        index.setValue("CLUSTERRULE", typeof indexConfig.clusteredIndex === "undefined" ? false : indexConfig.clusteredIndex);
        if (!index.getMboValueData("TEXTSEARCH").isReadOnly()) {
          index.setValue("TEXTSEARCH", typeof indexConfig.textSearchIndex === "undefined" ? false : indexConfig.textSearchIndex);
        }

        if (!index.getMboValueData("STORAGEPARTITION").isReadOnly()) {
          typeof indexConfig.storagePartition === "undefined" || indexConfig.storagePartition == null
            ? index.setValueNull("STORAGEPARTITION")
            : index.setValue("STORAGEPARTITION", indexConfig.storagePartition);
        }

        var maxSysKeysSet = index.getMboSet("MAXSYSKEYS");

        indexConfig.columns.forEach(function (column, colIdx) {
          var key = maxSysKeysSet.add();
          key.setValue("COLNAME", column.column);
          // 兼容两种导出格式: CONFIGUR/SKS_EXPORT_DBCONFIG 用 ordering("ASC"/"DESC"), 旧 LIBRARY 格式用 ascending(布尔)
          if (typeof column.ordering !== "undefined" && column.ordering !== null) {
            key.setValue("ORDERING", column.ordering);
          } else {
            key.setValue("ASCENDING", typeof column.ascending === "undefined" ? false : column.ascending);
          }
          // colSeq(CONFIGUR 导出) / sequence(旧格式); 未提供时不 setValue, 避免 Nashorn 传 undefined 导致重载歧义
          var seq = typeof column.colSeq !== "undefined" ? column.colSeq
            : (typeof column.sequence !== "undefined" ? column.sequence : null);
          if (seq !== null) {
            key.setValue("COLSEQ", seq);
          } else {
            key.setValue("COLSEQ", colIdx + 1);
          }
        });
      } else {
        // 索引已存在(源逻辑不更新已有索引)或缺少列定义: 无变更
        idxRow._status = "skipped";
        idxRow._operation = "updated";
        resIdx.push(idxRow);
      }
    });
  }

  if (this.relationships && Array.isArray(this.relationships) && this.relationships.length > 0 && !config.ignoreRelationships) {
    var relationshipSet = mbo.getMboSet("MAXRELATIONSHIP");

    this.relationships.forEach(function (relationshipConfig) {
      cacheUseError.ind4 = " relationship.name=" + relationshipConfig.relationship;
      var relRow = newChildRow("MAXRELATIONSHIP", relationshipConfig.relationship, relationshipConfig);
      /** @type {psdi.mbo.MboRemote} */
      var relationship = null;
      try {
        relationship = relationshipSet.moveFirst();
        while (relationship) {
          if (relationship.getString("NAME").equalsIgnoreCase(relationshipConfig.relationship)) {
            break;
          }
          relationship = relationshipSet.moveNext();
        }
        if (relationshipConfig.delete) {
          // 安全第一: 不删除, 跳过并记录
          skipDeleteCount++;
          relRow._status = "skipped";
          relRow._operation = "deleted";
          logger.warn("[" + scriptName + "] relationship " + relationshipConfig.relationship + " delete 标记已跳过(安全策略)");
        } else if (!relationshipConfig.delete) {
          var relIsNew = !relationship;
          if (!relationship) {
            relationship = relationshipSet.add();
            relationship.setValue("NAME", relationshipConfig.relationship, 2);
            relationship.setValue("CHILD", relationshipConfig.child, 2);
            relationship.setValue("PARENT", mbo.getString("OBJECTNAME"), 2);
          }
          try {
            if (relationshipConfig.cardinality !== "undefined" && relationshipConfig.cardinality) {
              // cardinality SINGLE/UNDEFINED/MULTIPLE
              relationship.setValue("CARDINALITY", relationshipConfig.cardinality);
            }
          } catch (eee) {
            logger.info("老版本maximo不存在CARDINALITY字段,属于正常现象:" + eee.getMessage());
          }

          typeof relationshipConfig.remarks === "undefined" || relationshipConfig.remarks == null
            ? relationship.setValueNull("REMARKS")
            : relationship.setValue("REMARKS", relationshipConfig.remarks);
          typeof relationshipConfig.whereClause === "undefined" || relationshipConfig.whereClause == null
            ? relationship.setValueNull("WHERECLAUSE")
            : relationship.setValue("WHERECLAUSE", relationshipConfig.whereClause);
          relRow._status = "success";
          relRow._operation = relIsNew ? "added" : "updated";
        }
        logger.info("[" + scriptName + "] relationship==" + relationshipConfig.relationship);
        resRel.push(relRow);
      } catch (rsError) {
        if (relationship && relationship.toBeAdded()) {
          // 如果出错, 新增的则删除(错误回滚清理, 非配置删除), 否则保存会有问题
          relationship.delete();
        }
        relRow._status = "failed";
        relRow._message = getErrorMessage(rsError);
        relFailCount++;
        resRel.push(relRow);
        logger.error("[" + scriptName + "] relationship " + relationshipConfig.relationship + " 处理失败", rsError);
      }
    });
  }

  // dmDeploySet=true 时子集按部署集保存, MBO 框架不会把主对象 MAXOBJECTCFG.CHANGED 置为变更,
  // 会出现"字段显示 Add、索引已新增, 但对象无变更状态, 数据库配置提示无可配置项"。
  // CHANGED 为单字符编码(N=无变更, I=新增, A=修改, D=删除), 有有效子行变更时补齐为 I/A。
  if (config.dmDeploySet) {
    var hasChildChange = mbo.toBeAdded() || scanChildRows(resAttr) || scanChildRows(resIdx) || scanChildRows(resRel);
    if (hasChildChange) {
      try {
        var curChangedFlag = mbo.isNull("CHANGED") ? "" : mbo.getString("CHANGED");
        if (curChangedFlag == null || curChangedFlag === "" || curChangedFlag === "N") {
          mbo.setFieldFlag(["CHANGED"], MboConstants.READONLY, false);
          mbo.setValue("CHANGED", mbo.toBeAdded() ? "I" : "A", MboConstants.NOACCESSCHECK);
          debugPrint("[" + scriptName + "] CHANGED -> " + mbo.getString("CHANGED") + " (" + this.object + ")");
        }
      } catch (chgErr) {
        // 老版本对象可能没有 CHANGED 字段, 不影响导入
        logger.info("[" + scriptName + "] 设置 CHANGED 失败(可能字段不存在): " + (chgErr && chgErr.getMessage ? chgErr.getMessage() : String(chgErr)));
      }
    }
  }

  var msgs = [];
  if (skipDeleteCount > 0) {
    msgs.push("delete标记行已跳过 " + skipDeleteCount + " 条(不执行删除)");
  }
  if (relFailCount > 0) {
    msgs.push("关系处理失败 " + relFailCount + " 条");
  }
  // 子级结果行数组已挂在实例(this.resultAttributes/resultIndexes/resultRelationships),
  // 由 importMaxObject 读取, 统计字段由 doImport 的 stampImportStats 统一盖章
  return msgs.length > 0 ? msgs.join("; ") : "";
};

// ---------------------------------------------------------------------------
// 导出 (_action=export): 字段方式参考 SKS_EXPORT_DBCONFIG.exportDatabaseConfig,
// ignoreDefVal 两分支逻辑(精简=只输出非默认值字段, 完整=全字段)完整移植;
// 响应格式对齐本接口风格: { status:'success', data:{maxObjects:[...]},
//                            message:'导出完成 共N个对象' }
// _allLangcode=true: 本地化字段附加 "sks:langdata": { "<字段名>": { "<LANGCODE>": "<值>" } },
// MLS 查询失败(如环境未启用多语言)不影响主导出。
// 移植修正(母本已知 bug):
//   - exportRelationships 签名与调用处 maxObjectCfg 参数不一致 → 已统一;
//   - ISVIEW 分支 vAutoSelect 在声明前使用 → 已提前声明;
//   - 母本 Java String 引用比较(!==/==)导致部分"默认值省略"条件失效 →
//     本实现统一转原生 JS 字符串做值比较(即真正实现精简);
//   - 母本 exportIndexes 循环覆盖 maxSysIndexColsSet 不关闭 → 每个索引处理后即关闭。
// ---------------------------------------------------------------------------

/**
 * 读取 Mbo 字符串值(isNull 返回 null), 转原生 JS 字符串(JSON.stringify 安全)
 * (等价母本 commonsUtils.getMboStringValue)
 */
function mboStr(mbo, col) {
  try {
    if (mbo.isNull(col)) {
      return null;
    }
    var v = mbo.getString(col);
    return (v === null || typeof v === "undefined") ? null : String(v);
  } catch (ignored) {
    return null;
  }
}

/** 读取 Mbo 整数值(isNull 返回 null), 转原生 JS number */
function mboInt(mbo, col) {
  try {
    if (mbo.isNull(col)) {
      return null;
    }
    return Number(mbo.getInt(col));
  } catch (ignored) {
    return null;
  }
}

/** 读取 Mbo 长整型值(isNull 返回 null), 转原生 JS number */
function mboLong(mbo, col) {
  try {
    if (mbo.isNull(col)) {
      return null;
    }
    return Number(mbo.getLong(col));
  } catch (ignored) {
    return null;
  }
}

/** 读取 Mbo 布尔值(isNull 返回 null), 转原生 JS boolean */
function mboBool(mbo, col) {
  try {
    if (mbo.isNull(col)) {
      return null;
    }
    return mbo.getBoolean(col) ? true : false;
  } catch (ignored) {
    return null;
  }
}

/**
 * 从请求体提取导出对象名列表(大写去重): 兼容 {objectNames:[...]} /
 * {maxObjects:[...]}(取各项 object) / 裸数组(字符串或对象定义) / 单对象定义
 * @param {Object} body parseRequestBody 结果
 * @returns {Array<string>}
 */
function getObjectNamesFromBody(body) {
  var raw;
  if (!body) {
    raw = [];
  } else if (Array.isArray(body)) {
    raw = body;
  } else if (Array.isArray(body.objectNames)) {
    raw = body.objectNames;
  } else if (Array.isArray(body.maxObjects)) {
    raw = body.maxObjects;
  } else if (body.object !== undefined && body.object !== null) {
    raw = [body];
  } else {
    raw = [];
  }
  var names = [];
  for (var i = 0; i < raw.length; i++) {
    var item = raw[i];
    if (item === null || typeof item === "undefined") {
      continue;
    }
    var s = (typeof item === "object")
      ? (item.object === undefined || item.object === null ? "" : String(item.object))
      : String(item);
    s = s.replace(/\s/g, "").toUpperCase();
    // IN 列表安全: 拒绝含单引号的名称
    if (s === "" || s.indexOf("'") !== -1) {
      continue;
    }
    if (names.indexOf(s) === -1) {
      names.push(s);
    }
  }
  return names;
}

/**
 * 导出入口: 解析对象名列表并导出
 * @param {Object} config
 * @returns {Object} { maxObjects: [...] }
 */
function doExport(config) {
  var objectNames = getObjectNamesFromBody(config._body);
  if (objectNames.length === 0) {
    throw new MXApplicationException("#", "导出请求体需包含非空 objectNames(或 maxObjects/object 对象定义)");
  }
  logger.info("[" + scriptName + "] 开始导出数据库配置, 对象列表: " + objectNames.join(", ")
    + ", ignoreDefVal=" + config.ignoreDefVal + ", _allLangcode=" + config.allLangcode);
  var maxObjects = exportDatabaseConfig(objectNames, config);
  responseMessage = "导出完成 共" + maxObjects.length + "个对象";
  logger.info("[" + scriptName + "] " + responseMessage);
  return { maxObjects: maxObjects };
}

/**
 * 导出数据库配置: MAXOBJECTCFG where objectname IN (...) 逐对象导出, 单对象失败不中断
 * @param {Array<string>} objectNames
 * @param {Object} config
 * @returns {Array<Object>}
 */
function exportDatabaseConfig(objectNames, config) {
  var maxObjectCfgSet = null;
  try {
    maxObjectCfgSet = mxserver.getMboSet("MAXOBJECTCFG", config._userInfo);
    var objectList = objectNames.map(function (name) {
      return "'" + name + "'";
    }).join(",");
    maxObjectCfgSet.setWhere("objectname IN (" + objectList + ")");
    maxObjectCfgSet.reset();
    logger.info("[" + scriptName + "] 查询到 " + maxObjectCfgSet.count() + " 个对象需要导出");
    var maxObjects = [];
    var maxObjectCfg = maxObjectCfgSet.moveFirst();
    while (maxObjectCfg) {
      var objectName = String(maxObjectCfg.getString("OBJECTNAME"));
      try {
        var objectConfig = exportMaxObject(objectName, config);
        if (objectConfig) {
          maxObjects.push(objectConfig);
        }
      } catch (objError) {
        logger.error("[" + scriptName + "] 导出对象 " + objectName + " 失败", objError);
      }
      maxObjectCfg = maxObjectCfgSet.moveNext();
    }
    return maxObjects;
  } finally {
    _close(maxObjectCfgSet);
  }
}

/**
 * 导出单个 Maximo 对象配置(字段与母本 SKS_EXPORT_DBCONFIG.exportMaxObject 一致)
 * @param {string} objectName
 * @param {Object} config
 * @returns {Object|null} 对象不存在返回 null
 */
function exportMaxObject(objectName, config) {
  var ignoreDefVal = config.ignoreDefVal;
  var maxObjectCfgSet = null;
  try {
    maxObjectCfgSet = mxserver.getMboSet("MAXOBJECTCFG", config._userInfo);
    var sqlf = new SqlFormat("objectname = :1");
    sqlf.setObject(1, "MAXOBJECTCFG", "OBJECTNAME", objectName);
    maxObjectCfgSet.setWhere(sqlf.format());
    maxObjectCfgSet.reset();
    if (maxObjectCfgSet.isEmpty()) {
      logger.warn("[" + scriptName + "] 对象 " + objectName + " 不存在");
      return null;
    }
    var maxObjectCfg = maxObjectCfgSet.getMbo(0);
    var objectConfig = {};

    var objName = mboStr(maxObjectCfg, "OBJECTNAME");
    objectConfig.object = objName;
    objectConfig.description = mboStr(maxObjectCfg, "DESCRIPTION");
    // 系统默认必填
    objectConfig.level = mboStr(maxObjectCfg, "SITEORGTYPE");
    var entity = mboStr(maxObjectCfg, "ENTITYNAME");
    if (!ignoreDefVal || entity !== objName) {
      objectConfig.entity = entity;
    }
    var serviceName = mboStr(maxObjectCfg, "SERVICENAME");
    // 默认是 CUSTAPP
    if (!ignoreDefVal || serviceName !== "CUSTAPP") {
      objectConfig.service = serviceName;
    }

    if (!ignoreDefVal) {
      objectConfig.extendsObject = mboStr(maxObjectCfg, "EXTENDSOBJECT");
      objectConfig.textDirection = mboStr(maxObjectCfg, "TEXTDIRECTION");
      objectConfig.resourceType = mboStr(maxObjectCfg, "RESOURCETYPE");
      objectConfig.langCode = mboStr(maxObjectCfg, "LANGCODE");
      objectConfig.triggerRoot = mboStr(maxObjectCfg, "TRIGROOT");
      objectConfig.storagePartition = mboStr(maxObjectCfg, "STORAGEPARTITION");
      objectConfig.unqiueColumn = mboStr(maxObjectCfg, "UNIQUECOLUMNNAME");
      objectConfig.languageTable = mboStr(maxObjectCfg, "LANGTABLENAME");
      objectConfig.languageColumn = mboStr(maxObjectCfg, "LANGCOLUMNNAME");
      objectConfig.alternateIndex = mboStr(maxObjectCfg, "ALTIXNAME");
      // 长整型字段
      objectConfig.maxObjectId = mboLong(maxObjectCfg, "MAXOBJECTID");
      objectConfig.userDefined = mboBool(maxObjectCfg, "USERDEFINED");
    } else {
      var vClassName = mboStr(maxObjectCfg, "CLASSNAME");
      if (vClassName && vClassName !== "psdi.mbo.custapp.CustomMboSet"
        && vClassName !== "psdi.mbo.custapp.NonPersistentCustomMboSet") {
        objectConfig.className = vClassName;
      }
      var vExtendsObject = mboStr(maxObjectCfg, "EXTENDSOBJECT");
      if (vExtendsObject) { objectConfig.extendsObject = vExtendsObject; }
      var vTextDirection = mboStr(maxObjectCfg, "TEXTDIRECTION");
      if (vTextDirection) { objectConfig.textDirection = vTextDirection; }
      var vResourceType = mboStr(maxObjectCfg, "RESOURCETYPE");
      if (vResourceType) { objectConfig.resourceType = vResourceType; }
      var vLangCode = mboStr(maxObjectCfg, "LANGCODE");
      if (vLangCode) { objectConfig.langCode = vLangCode; }
      var vTriggerRoot = mboStr(maxObjectCfg, "TRIGROOT");
      if (vTriggerRoot) { objectConfig.triggerRoot = vTriggerRoot; }
      var vStoragePartition = mboStr(maxObjectCfg, "STORAGEPARTITION");
      if (vStoragePartition) { objectConfig.storagePartition = vStoragePartition; }
      var vUniqueColumn = mboStr(maxObjectCfg, "UNIQUECOLUMNNAME");
      if (vUniqueColumn) { objectConfig.unqiueColumn = vUniqueColumn; }
      var vLanguageTable = mboStr(maxObjectCfg, "LANGTABLENAME");
      if (vLanguageTable) { objectConfig.languageTable = vLanguageTable; }
      var vLanguageColumn = mboStr(maxObjectCfg, "LANGCOLUMNNAME");
      if (vLanguageColumn) { objectConfig.languageColumn = vLanguageColumn; }
      var vAlternateIndex = mboStr(maxObjectCfg, "ALTIXNAME");
      if (vAlternateIndex) { objectConfig.alternateIndex = vAlternateIndex; }
      var vUserDefined = mboBool(maxObjectCfg, "USERDEFINED");
      if (vUserDefined) { objectConfig.userDefined = vUserDefined; }
    }

    // 布尔类型字段
    if (!ignoreDefVal) {
      objectConfig.persistent = mboBool(maxObjectCfg, "PERSISTENT");
      objectConfig.mainObject = mboBool(maxObjectCfg, "MAINOBJECT");
      objectConfig.addRowstamp = mboBool(maxObjectCfg, "ADDROWSTAMP");
      objectConfig.auditEnabled = mboBool(maxObjectCfg, "EAUDITENABLED");
      objectConfig.textSearchEnabled = mboBool(maxObjectCfg, "TEXTSEARCHENABLED");
      objectConfig.internal = mboBool(maxObjectCfg, "INTERNAL");
      objectConfig.view = mboBool(maxObjectCfg, "ISVIEW");
      objectConfig.hasLD = mboBool(maxObjectCfg, "HASLD");
      objectConfig.imported = mboBool(maxObjectCfg, "IMPORTED");
    } else {
      var vPersistent = mboBool(maxObjectCfg, "PERSISTENT");
      if (!vPersistent) { objectConfig.persistent = vPersistent; }
      var vMainObject = mboBool(maxObjectCfg, "MAINOBJECT");
      if (!vMainObject) { objectConfig.mainObject = vMainObject; }
      var vAddRowstamp = mboBool(maxObjectCfg, "ADDROWSTAMP");
      if (!vAddRowstamp) { objectConfig.addRowstamp = vAddRowstamp; }
      var vAuditEnabled = mboBool(maxObjectCfg, "EAUDITENABLED");
      if (vAuditEnabled) { objectConfig.auditEnabled = vAuditEnabled; }
      var vTextSearchEnabled = mboBool(maxObjectCfg, "TEXTSEARCHENABLED");
      if (vTextSearchEnabled) { objectConfig.textSearchEnabled = vTextSearchEnabled; }
      var vInternal = mboBool(maxObjectCfg, "INTERNAL");
      if (vInternal) { objectConfig.internal = vInternal; }
      var vIsView = mboBool(maxObjectCfg, "ISVIEW");
      if (vIsView) { objectConfig.view = vIsView; }
      var vHasLD = mboBool(maxObjectCfg, "HASLD");
      if (vHasLD) { objectConfig.hasLD = vHasLD; }
      var vImported = mboBool(maxObjectCfg, "IMPORTED");
      if (vImported) { objectConfig.imported = vImported; }
    }

    // 审计相关字段
    if (maxObjectCfg.getBoolean("EAUDITENABLED")) {
      if (!ignoreDefVal) {
        objectConfig.auditTable = mboStr(maxObjectCfg, "EAUDITTBNAME");
        objectConfig.eAuditFilter = mboStr(maxObjectCfg, "EAUDITFILTER");
        objectConfig.eSignatureFilter = mboStr(maxObjectCfg, "ESIGFILTER");
      } else {
        var vAuditTable = mboStr(maxObjectCfg, "EAUDITTBNAME");
        if (vAuditTable) { objectConfig.auditTable = vAuditTable; }
        var vEAuditFilter = mboStr(maxObjectCfg, "EAUDITFILTER");
        if (vEAuditFilter) { objectConfig.eAuditFilter = vEAuditFilter; }
        var vESigFilter = mboStr(maxObjectCfg, "ESIGFILTER");
        if (vESigFilter) { objectConfig.eSignatureFilter = vESigFilter; }
      }
    }

    if (maxObjectCfg.getBoolean("ISVIEW")) {
      // 视图相关字段(母本 vAutoSelect 声明前使用, 此处已提前声明修正)
      var vAutoSelect = mboBool(maxObjectCfg, "AUTOSELECT");
      if (!ignoreDefVal) {
        if (!vAutoSelect) {
          objectConfig.viewSelect = mboStr(maxObjectCfg, "VIEWSELECT");
          objectConfig.viewFrom = mboStr(maxObjectCfg, "VIEWFROM");
        }
        objectConfig.viewWhere = mboStr(maxObjectCfg, "VIEWWHERE");
        objectConfig.joinToObject = mboStr(maxObjectCfg, "JOINOBJECT");
      } else {
        var vViewSelect = mboStr(maxObjectCfg, "VIEWSELECT");
        if (vViewSelect) { objectConfig.viewSelect = vViewSelect; }
        var vViewWhere = mboStr(maxObjectCfg, "VIEWWHERE");
        if (vViewWhere) { objectConfig.viewWhere = vViewWhere; }
        var vViewFrom = mboStr(maxObjectCfg, "VIEWFROM");
        if (vViewFrom) { objectConfig.viewFrom = vViewFrom; }
        var vJoinToObject = mboStr(maxObjectCfg, "JOINOBJECT");
        if (vJoinToObject) { objectConfig.joinToObject = vJoinToObject; }
      }
      objectConfig.automaticallySelect = vAutoSelect;
    }

    // _allLangcode: 对象级 DESCRIPTION 多语言(MAXOBJECTMLS, keycolvalue=objectname)
    if (config.allLangcode) {
      var objMlsMap = loadMlsMap("MAXOBJECTMLS", "OBJECTNAME", objectName, ["DESCRIPTION"], config);
      if (objMlsMap) {
        attachLangdata(objectConfig, objMlsMap[objectName]);
      }
    }

    // 导出属性/关系/索引
    var attributes = exportAttributes(objectName, entity, maxObjectCfg, config);
    if (attributes.length > 0) {
      objectConfig.attributes = attributes;
    }
    var relationships = exportRelationships(objectName, config);
    if (relationships.length > 0) {
      objectConfig.relationships = relationships;
    }
    var indexes = exportIndexes(objectName, maxObjectCfg, config);
    if (indexes.length > 0) {
      objectConfig.indexes = indexes;
    }

    return objectConfig;
  } finally {
    _close(maxObjectCfgSet);
  }
}

/**
 * 导出对象所有属性(MAXATTRIBUTECFG orderBy ATTRIBUTENAME, 跳过系统字段;
 * 字段与母本 SKS_EXPORT_DBCONFIG.exportAttributes 一致)
 * @param {string} objectName
 * @param {string|null} objectEntity 对象实体表名(entityName 等于它时精简模式省略)
 * @param {psdi.mbo.MboRemote} maxObjectCfg
 * @param {Object} config
 * @returns {Array<Object>}
 */
function exportAttributes(objectName, objectEntity, maxObjectCfg, config) {
  var ignoreDefVal = config.ignoreDefVal;
  var isView = maxObjectCfg.getBoolean("ISVIEW");
  var maxAttributeCfgSet = null;
  try {
    // _allLangcode: 一次查出该对象全部属性 MLS(MAXATTRIBUTEMLS, keycolvalue=objectname+attributename)
    var attrMlsMap = config.allLangcode
      ? loadMlsMap("MAXATTRIBUTEMLS", "OBJECTNAME", objectName, ["DESCRIPTION", "TITLE", "REMARKS"], config)
      : null;
    maxAttributeCfgSet = mxserver.getMboSet("MAXATTRIBUTECFG", config._userInfo);
    var sqlf = new SqlFormat("objectname = :1 ");
    sqlf.setObject(1, "MAXATTRIBUTECFG", "OBJECTNAME", objectName);
    maxAttributeCfgSet.setWhere(sqlf.format());
    maxAttributeCfgSet.setOrderBy("ATTRIBUTENAME");
    maxAttributeCfgSet.reset();
    logger.info("[" + scriptName + "] 对象 " + objectName + " 查询到 " + maxAttributeCfgSet.count() + " 个属性");
    var attributes = [];
    var attributeCfg = maxAttributeCfgSet.moveFirst();
    while (attributeCfg) {
      var attributeName = String(attributeCfg.getString("ATTRIBUTENAME"));
      // 跳过系统字段
      if (attributeName === "ROWSTAMP" || attributeName === "HASLD"
        || attributeName === "DESCRIPTION_LONGDESCRIPTION") {
        attributeCfg = maxAttributeCfgSet.moveNext();
        continue;
      }
      var attribute = {};
      attribute.attribute = attributeName;
      attribute.description = mboStr(attributeCfg, "REMARKS");
      attribute.title = mboStr(attributeCfg, "TITLE");
      attribute.type = mboStr(attributeCfg, "MAXTYPE");
      var sameAsObject = mboStr(attributeCfg, "SAMEASOBJECT");
      if (sameAsObject !== null && sameAsObject !== "") {
        attribute.sameAsObject = sameAsObject;
        attribute.sameAsAttribute = mboStr(attributeCfg, "SAMEASATTRIBUTE");
      }
      // 整数类型字段
      attribute.length = mboInt(attributeCfg, "LENGTH");
      attribute.scale = mboInt(attributeCfg, "SCALE");
      var domainId = mboStr(attributeCfg, "DOMAINID");
      var autonumber = mboStr(attributeCfg, "AUTOKEYNAME");
      if (!ignoreDefVal || autonumber) {
        attribute.autonumber = autonumber;
      }
      if (!ignoreDefVal || domainId) {
        attribute.domain = domainId;
      }
      var vEntityName = mboStr(attributeCfg, "ENTITYNAME");
      var columnName = mboStr(attributeCfg, "COLUMNNAME");
      if (!ignoreDefVal || (columnName && columnName !== attributeName)) {
        attribute.columnName = columnName;
      }
      if (!ignoreDefVal || (vEntityName && vEntityName !== objectEntity)) {
        attribute.entityName = vEntityName;
      }
      if (!ignoreDefVal) {
        attribute.typeOfComplexExpression = mboStr(attributeCfg, "COMPLEXEXPRESSION");
        attribute.handleColumnName = mboStr(attributeCfg, "HANDLECOLUMNNAME");
        attribute.textDirection = mboStr(attributeCfg, "TEXTDIRECTION");
        attribute.class = mboStr(attributeCfg, "CLASSNAME");
      } else {
        var vTypeOfComplexExpression = mboStr(attributeCfg, "COMPLEXEXPRESSION");
        if (vTypeOfComplexExpression) { attribute.typeOfComplexExpression = vTypeOfComplexExpression; }
        var vHandleColumnName = mboStr(attributeCfg, "HANDLECOLUMNNAME");
        if (vHandleColumnName) { attribute.handleColumnName = vHandleColumnName; }
        var attrTextDirection = mboStr(attributeCfg, "TEXTDIRECTION");
        if (attrTextDirection) { attribute.textDirection = attrTextDirection; }
        var vClass = mboStr(attributeCfg, "CLASSNAME");
        if (vClass) { attribute.class = vClass; }
      }
      var alias = mboStr(attributeCfg, "ALIAS");
      if (!ignoreDefVal || alias !== attributeName) {
        attribute.alias = alias;
      }
      if (!ignoreDefVal) {
        attribute.attributeNo = mboInt(attributeCfg, "ATTRIBUTENO");
        attribute.extended = mboInt(attributeCfg, "EXTENDED");
      } else {
        var vExtended = mboInt(attributeCfg, "EXTENDED");
        if (vExtended) { attribute.extended = vExtended; }
      }
      var vPrimaryKeyColSeq = mboInt(attributeCfg, "PRIMARYKEYCOLSEQ");
      var required = mboBool(attributeCfg, "REQUIRED");
      var persistent = mboBool(attributeCfg, "PERSISTENT");
      var mustbe = mboBool(attributeCfg, "MUSTBE");
      var positive = mboBool(attributeCfg, "ISPOSITIVE");
      var defaultValue = mboStr(attributeCfg, "DEFAULTVALUE");
      if (!ignoreDefVal) {
        attribute.defaultValue = defaultValue;
        attribute.maxAttributeId = mboLong(attributeCfg, "MAXATTRIBUTEID");
        attribute.primaryColumn = vPrimaryKeyColSeq;
        attribute.required = required;
        attribute.persistent = persistent;
        attribute.mustBe = mustbe;
        attribute.positive = positive;
      } else {
        if (vPrimaryKeyColSeq) { attribute.primaryColumn = vPrimaryKeyColSeq; }
        if (required) { attribute.required = required; }
        if (!persistent) { attribute.persistent = persistent; }
        if (mustbe) { attribute.mustBe = mustbe; }
        if (positive) { attribute.positive = positive; }
        if (defaultValue) { attribute.defaultValue = defaultValue; }
      }
      if (!ignoreDefVal) {
        attribute.canAutonumber = mboBool(attributeCfg, "CANAUTONUM");
        attribute.eAuditEnabled = mboBool(attributeCfg, "EAUDITENABLED");
        attribute.multiLanguageInUse = mboBool(attributeCfg, "MLINUSE");
        attribute.mlSupported = mboBool(attributeCfg, "MLSUPPORTED");
        attribute.eSignatureEnabled = mboBool(attributeCfg, "ESIGENABLED");
        attribute.localizable = mboBool(attributeCfg, "LOCALIZABLE");
        attribute.longDescriptionOwner = mboBool(attributeCfg, "ISLDOWNER");
        attribute.restricted = mboBool(attributeCfg, "RESTRICTED");
        attribute.userDefined = mboBool(attributeCfg, "USERDEFINED");
        attribute.searchType = mboStr(attributeCfg, "SEARCHTYPE");
        attribute.changed = mboStr(attributeCfg, "CHANGED");
      } else {
        var canAutonumber = mboBool(attributeCfg, "CANAUTONUM");
        if (canAutonumber) { attribute.canAutonumber = canAutonumber; }
        var vMLInUse = mboBool(attributeCfg, "MLINUSE");
        if (vMLInUse) { attribute.multiLanguageInUse = vMLInUse; }
        var vMLSupported = mboBool(attributeCfg, "MLSUPPORTED");
        if (vMLSupported) { attribute.mlSupported = vMLSupported; }
        var vESigEnabled = mboBool(attributeCfg, "ESIGENABLED");
        if (vESigEnabled) { attribute.eSignatureEnabled = vESigEnabled; }
        var localizable = mboBool(attributeCfg, "LOCALIZABLE");
        if (localizable) { attribute.localizable = localizable; }
        var attrEAuditEnabled = mboBool(attributeCfg, "EAUDITENABLED");
        if (attrEAuditEnabled) { attribute.eAuditEnabled = attrEAuditEnabled; }
        var longDescriptionOwner = mboBool(attributeCfg, "ISLDOWNER");
        if (longDescriptionOwner) { attribute.longDescriptionOwner = longDescriptionOwner; }
        var restricted = mboBool(attributeCfg, "RESTRICTED");
        if (restricted) { attribute.restricted = restricted; }
        var attrUserDefined = mboBool(attributeCfg, "USERDEFINED");
        if (!attrUserDefined) { attribute.userDefined = attrUserDefined; }
        var searchType = mboStr(attributeCfg, "SEARCHTYPE");
        if (searchType) { attribute.searchType = searchType; }
      }
      if (isView) {
        // 处理视图属性
        if (vEntityName && columnName) {
          attribute.entityName = vEntityName;
          attribute.columnName = columnName;
        }
        attribute.persistent = persistent;
      }
      if (attrMlsMap) {
        attachLangdata(attribute, attrMlsMap[objectName + attributeName]);
      }
      attributes.push(attribute);
      attributeCfg = maxAttributeCfgSet.moveNext();
    }
    return attributes;
  } finally {
    _close(maxAttributeCfgSet);
  }
}

/**
 * 导出对象所有关系(MAXRELATIONSHIP where parent='x'; 字段与母本一致;
 * 母本签名/调用 maxObjectCfg 参数不一致问题已修正——本函数不需要该参数)
 * @param {string} objectName
 * @param {Object} config
 * @returns {Array<Object>}
 */
function exportRelationships(objectName, config) {
  var ignoreDefVal = config.ignoreDefVal;
  var maxRelationshipSet = null;
  try {
    // _allLangcode: REMARKS 多语言(MAXRELATIONSHIPMLS, keycolvalue=parent+relationship)
    var relMlsMap = config.allLangcode
      ? loadMlsMap("MAXRELATIONSHIPMLS", "PARENT", objectName, ["REMARKS"], config)
      : null;
    maxRelationshipSet = mxserver.getMboSet("MAXRELATIONSHIP", config._userInfo);
    var sqlf = new SqlFormat("parent = :1");
    sqlf.setString(1, objectName);
    maxRelationshipSet.setWhere(sqlf.format());
    maxRelationshipSet.reset();
    var relationships = [];
    var relationship = maxRelationshipSet.moveFirst();
    while (relationship) {
      var relConfig = {};
      relConfig.relationship = mboStr(relationship, "NAME");
      relConfig.child = mboStr(relationship, "CHILD");
      relConfig.whereClause = mboStr(relationship, "WHERECLAUSE");
      relConfig.remarks = mboStr(relationship, "REMARKS");
      relConfig.cardinality = mboStr(relationship, "CARDINALITY");
      if (!ignoreDefVal) {
        // 必需数据库连接吗? / 长整型字段
        relConfig.dbJoinRequired = mboInt(relationship, "DBJOINREQUIRED");
        relConfig.maxRelationshipId = mboLong(relationship, "MAXRELATIONSHIPID");
      }
      relConfig.isDefault = mboBool(relationship, "ISDEFAULT");
      if (relMlsMap) {
        attachLangdata(relConfig, relMlsMap[objectName + relConfig.relationship]);
      }
      relationships.push(relConfig);
      relationship = maxRelationshipSet.moveNext();
    }
    return relationships;
  } finally {
    _close(maxRelationshipSet);
  }
}

/**
 * 导出对象所有索引(MAXSYSINDEXES where tbname, 跳过 MAXSYS 前缀与 N+对象名前缀的系统索引与
 * uniqueColumn 索引; 字段与母本一致; 母本 cols set 不关闭问题已修正)
 * @param {string} objectName
 * @param {psdi.mbo.MboRemote} maxObjectCfg
 * @param {Object} config
 * @returns {Array<Object>}
 */
function exportIndexes(objectName, maxObjectCfg, config) {
  var ignoreDefVal = config.ignoreDefVal;
  var maxSysIndexesSet = null;
  var maxSysIndexColsSet = null;
  try {
    maxSysIndexesSet = mxserver.getMboSet("MAXSYSINDEXES", config._userInfo);
    var sqlf = new SqlFormat("tbname = :1");
    sqlf.setObject(1, "MAXSYSINDEXES", "TBNAME", objectName.toUpperCase());
    maxSysIndexesSet.setWhere(sqlf.format());
    maxSysIndexesSet.reset();
    var indexes = [];
    var uniqueColumn = mboStr(maxObjectCfg, "UNIQUECOLUMNNAME");
    var index = maxSysIndexesSet.moveFirst();
    while (index) {
      var indexName = String(index.getString("NAME"));
      // 跳过系统索引
      if (indexName.indexOf("MAXSYS") === 0 || indexName.indexOf("N" + objectName.toUpperCase()) === 0) {
        index = maxSysIndexesSet.moveNext();
        continue;
      }
      var indexConfig = {};
      indexConfig.index = mboStr(index, "NAME");
      indexConfig.table = mboStr(index, "TBNAME");
      indexConfig.storagePartition = mboStr(index, "STORAGEPARTITION");
      if (!ignoreDefVal) {
        indexConfig.changed = mboStr(index, "CHANGED");
      } else {
        var vChanged = mboStr(index, "CHANGED");
        if (vChanged) { indexConfig.changed = vChanged; }
      }
      if (!ignoreDefVal) {
        indexConfig.maxSysIndexesId = mboLong(index, "MAXSYSINDEXESID");
      }
      indexConfig.enforceUniqueness = mboBool(index, "UNIQUE");
      indexConfig.clusteredIndex = mboBool(index, "CLUSTERRULE");
      if (!ignoreDefVal) {
        indexConfig.textSearchIndex = mboBool(index, "TEXTSEARCH");
        indexConfig.internal = mboBool(index, "REQUIRED");
      } else {
        var vTextSearch = mboBool(index, "TEXTSEARCH");
        if (vTextSearch) { indexConfig.textSearchIndex = vTextSearch; }
        var vIdxInternal = mboBool(index, "REQUIRED");
        if (vIdxInternal) { indexConfig.internal = vIdxInternal; }
      }
      // 获取索引列
      maxSysIndexColsSet = index.getMboSet("MAXSYSKEYS");
      var columns = [];
      var indexCol = maxSysIndexColsSet.moveFirst();
      var isIdIndex = false;
      while (indexCol) {
        var colConfig = {};
        colConfig.column = mboStr(indexCol, "COLNAME");
        colConfig.ordering = mboStr(indexCol, "ORDERING");
        if (!ignoreDefVal) {
          colConfig.changed = mboStr(indexCol, "CHANGED");
        } else {
          var vColChanged = mboStr(indexCol, "CHANGED");
          if (vColChanged) { colConfig.changed = vColChanged; }
        }
        colConfig.colSeq = mboInt(indexCol, "COLSEQ");
        if (!ignoreDefVal) {
          colConfig.maxSysKeysId = mboLong(indexCol, "MAXSYSKEYSID");
        }
        columns.push(colConfig);
        if (uniqueColumn && uniqueColumn === colConfig.column) {
          isIdIndex = true;
        }
        indexCol = maxSysIndexColsSet.moveNext();
      }
      // 每个索引的列 set 处理完即关闭(母本仅在 finally 关最后一次, 已修正)
      _close(maxSysIndexColsSet);
      maxSysIndexColsSet = null;
      if (columns.length > 0) {
        indexConfig.columns = columns;
      }
      if (!isIdIndex) {
        indexes.push(indexConfig);
      }
      index = maxSysIndexesSet.moveNext();
    }
    return indexes;
  } finally {
    _close(maxSysIndexesSet);
    _close(maxSysIndexColsSet);
  }
}

/**
 * 查询 MLS 多语言表, 构建 keycolvalue → { LANGCODE → { 字段名(小写): 值 } } 映射。
 * Maximo 标准 keycolvalue 约定: MAXOBJECTMLS=objectname,
 * MAXATTRIBUTEMLS=objectname+attributename 直拼, MAXRELATIONSHIPMLS=parent+name 直拼。
 * 查询失败(如环境未启用多语言、表不存在)记 warn 返回 null, 不影响主导出。
 * @param {string} mlsObject MLS MboSet 名
 * @param {string} keyCol 过滤列名(OBJECTNAME/PARENT)
 * @param {string} keyValue 过滤值
 * @param {Array<string>} mlsCols 需收集的多语言列(DESCRIPTION/TITLE/REMARKS)
 * @param {Object} config
 * @returns {Object|null}
 */
function loadMlsMap(mlsObject, keyCol, keyValue, mlsCols, config) {
  var mlsSet = null;
  try {
    mlsSet = mxserver.getMboSet(mlsObject, config._userInfo);
    var sqlf = new SqlFormat(keyCol + " = :1");
    sqlf.setString(1, keyValue);
    mlsSet.setWhere(sqlf.format());
    mlsSet.reset();
    var map = {};
    var mls = mlsSet.moveFirst();
    while (mls) {
      var kv = mboStr(mls, "KEYCOLVALUE");
      var lang = mboStr(mls, "LANGCODE");
      if (kv !== null && lang !== null) {
        var bucket = map[kv];
        if (!bucket) {
          bucket = {};
          map[kv] = bucket;
        }
        var entry = bucket[lang];
        if (!entry) {
          entry = {};
          bucket[lang] = entry;
        }
        for (var i = 0; i < mlsCols.length; i++) {
          var v = mboStr(mls, mlsCols[i]);
          if (v !== null && v !== "") {
            entry[mlsCols[i].toLowerCase()] = v;
          }
        }
      }
      mls = mlsSet.moveNext();
    }
    return map;
  } catch (e) {
    logger.warn("[" + scriptName + "] MLS 查询 " + mlsObject + "(" + keyCol + "=" + keyValue
      + ") 失败, 跳过多语言: " + getErrorMessage(e));
    return null;
  } finally {
    _close(mlsSet);
  }
}

/**
 * 把某行对应的多语言桶转成 "sks:langdata": { "<字段名>": { "<LANGCODE>": "<值>" } } 挂到行上;
 * 桶为空/无有效值时不附加
 * @param {Object} row
 * @param {Object|null} bucket { LANGCODE: { 字段名: 值 } }
 */
function attachLangdata(row, bucket) {
  if (!bucket) {
    return;
  }
  var langdata = {};
  var has = false;
  for (var lang in bucket) {
    if (!bucket.hasOwnProperty(lang)) {
      continue;
    }
    var fields = bucket[lang];
    for (var f in fields) {
      if (!fields.hasOwnProperty(f)) {
        continue;
      }
      if (!langdata[f]) {
        langdata[f] = {};
      }
      langdata[f][lang] = fields[f];
      has = true;
    }
  }
  if (has) {
    row["sks:langdata"] = langdata;
  }
}

// main 必须放在所有定义之后: MaxObject.prototype.setMboValues 等是赋值语句(不提升),
// 若在 main() 执行前未赋值会报 "setMboValues is not a function"
main();
