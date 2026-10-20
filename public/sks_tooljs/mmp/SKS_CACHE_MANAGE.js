// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />

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

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");
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
logger.info("[" + scriptName + "]----------------Starting execution of script " + service.getScriptName());
logger.info("[" + scriptName + "]-------------webclientsession=" + service.webclientsession())


//如果是多语言的表,通过下面方式设置语言环境的数据
var _langcode = "EN";
if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
  _langcode = request.getQueryParam("_langcode").toUpperCase();
  userInfo.setLangCode(_langcode);
  logger.info("[" + scriptName + "] _langcode=" + _langcode + ", langCode=" + userInfo.getLocale().getLanguage());
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

/** @type {com.ibm.tivoli.maximo.oslc.provider.OslcRequest} */
var requestTmp = request

/** @type {java.util.HashMap} */
var responseHeadersTmp = responseHeaders

/** @type {java.lang.String} */
var httpMethodTmp = httpMethod

//成功时
var successData = {}

//--------------------------------------------------------------------
// Java 类型引用（反射统计缓存条数用）
//--------------------------------------------------------------------
/** @type {java.util.Map} */
var JavaMap = Java.type("java.util.Map");
/** @type {java.util.Collection} */
var JavaCollection = Java.type("java.util.Collection");
/** @type {java.lang.reflect.Array} */
var JavaArray = Java.type("java.lang.reflect.Array");
/** @type {java.lang.reflect.Modifier} */
var JavaModifier = Java.type("java.lang.reflect.Modifier");
/** @type {psdi.mbo.MaximoMTEnabledCache} */
var MaximoMTEnabledCacheCls = Java.type("psdi.mbo.MaximoMTEnabledCache");

// 统计缓存条数时忽略的字段（非数据字段/内部辅助结构，避免把辅助结构算进条数）
var COUNT_FIELD_BLACKLIST = {
  "botcCaches": 1,
  "lastAccess": 1,
  "tenantLockObjs": 1,
  "refToMasterCache": 1,
  "doNotRunList": 1,
  "tloMaxCache": 1,
  "logger": 1,
  "LOGGER": 1,
  "MAXIMOLOGGER": 1
};

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

    // message 只放简短错误信息，完整堆栈放到 errorStackTrace（前端仅在浏览器控制台查看）
    var errorMessage = getSimpleErrorMessage(error)
    var errorStackTrace = ""
    try {
      errorStackTrace = sksLogAnsiUtils.getErrorStackTrace(error)
      debugPrint(errorStackTrace);
    } catch (e) { service.log_error(">>> [API ERROR] 获取异常堆栈:") }

    var errorData = { "status": "error", "message": errorMessage, "errorStackTrace": errorStackTrace }
    if (paramDebug) {
      errorData.debugMsg = debugMsg.toString();
    }
    responseBody = JSON.stringify(errorData);
  } finally {
    logger.info("[" + scriptName + "]----------------responseBodyTmp finally");
    logger.info("[" + scriptName + "]----------------responseBodyTmp=" + responseBody + ".");
  }

}

/**
 * 入口：根据 _action 分发
 * 支持的动作：
 *   list    列出所有缓存（循环获取：缓存名 + 总条数 + 缓存类名）
 *   reload  重载缓存（_cacheName 或 _cacheNames 逗号分隔）
 *   delete  删除/卸载缓存（_cacheName 或 _cacheNames 逗号分隔）
 */
function process() {
  try {
    var action = getParam("_action");
    if (!action) {
      action = "list";
    }
    debugPrint("action=" + action)
    switch (action) {
      case "list":
        return actionList();
      case "reload":
        return actionReload();
      case "delete":
        return actionDelete();
      default:
        throw new Error("不支持的 _action: " + action + "（支持 list/reload/delete）");
    }
  } catch (error) {
    logger.error(">>> [API ERROR] 脚本执行异常:", error)
    // 向上抛出原始异常,由 main() 统一组装 message(简短) + errorStackTrace(完整堆栈)
    throw error
  }
}

/**
 * 列出所有缓存：
 * 缓存名来自 MXServer.getMaximoCacheNames()，再按名称用 getFromMaximoCache() 取缓存对象
 */
function actionList() {
  var mxserver = MXServer.getMXServer()
  var names = []
  var nameSet = mxserver.getMaximoCacheNames()
  var it = nameSet.iterator()
  while (it.hasNext()) {
    names.push(String(it.next()))
  }
  names.sort()

  // 反射取 wrapper（仅用于判断是否租户级缓存，决定能否卸载）
  var wrapperMap = getMaximoCacheWrapperMap(mxserver)

  var list = []
  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    var info = buildCacheInfo(mxserver, name, wrapperMap)
    list.push(info)
  }

  return {
    total: list.length,
    list: list
  }
}

/**
 * 组装单个缓存的信息
 */
function buildCacheInfo(mxserver, name, wrapperMap) {
  var cache = null
  var className = ""
  var count = -1
  try {
    cache = mxserver.getFromMaximoCache(name)
  } catch (e) {
    debugPrint("getFromMaximoCache(" + name + ") 失败: " + e)
  }

  if (cache !== null && cache !== undefined) {
    try {
      className = String(cache.getClass().getName())
      count = countDataEntries(cache, 0)
    } catch (e) {
      debugPrint("统计缓存[" + name + "]条数失败: " + e)
    }
  }

  var mtEnabled = false
  try {
    if (wrapperMap !== null && wrapperMap !== undefined) {
      var wrapper = wrapperMap.get(name)
      if (wrapper !== null && wrapper !== undefined) {
        var actual = wrapper.getMaximoCache()
        mtEnabled = actual !== null && actual !== undefined && isJavaInstance(MaximoMTEnabledCacheCls, actual)
      }
    }
  } catch (e) { }

  return {
    name: name,
    count: count,
    className: className,
    mtEnabled: mtEnabled
  }
}

/**
 * 重载缓存
 */
function actionReload() {
  var names = getActionCacheNames()
  var mxserver = MXServer.getMXServer()
  var results = []
  var successCount = 0
  var errorCount = 0

  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    try {
      debugPrint("开始重载缓存[" + name + "]")
      mxserver.reloadMaximoCache(name, true)
      results.push({ name: name, status: "success", message: "重载成功" })
      successCount++
    } catch (e) {
      logger.error(">>> [API ERROR] 重载缓存[" + name + "]失败:", e)
      results.push({ name: name, status: "error", message: "" + e })
      errorCount++
    }
  }

  return {
    results: results,
    total: names.length,
    successCount: successCount,
    errorCount: errorCount
  }
}

/**
 * 删除(卸载)缓存：
 * MXServer 仅提供 unloadTenantCache，只有租户级缓存(MaximoMTEnabledCache)生效；
 * 非租户级缓存调用为 no-op，会返回 skipped 提示。
 */
function actionDelete() {
  var names = getActionCacheNames()
  var mxserver = MXServer.getMXServer()
  var wrapperMap = getMaximoCacheWrapperMap(mxserver)
  var results = []
  var successCount = 0
  var skipCount = 0
  var errorCount = 0

  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    try {
      var mtEnabled = false
      if (wrapperMap !== null && wrapperMap !== undefined) {
        var wrapper = wrapperMap.get(name)
        if (wrapper !== null && wrapper !== undefined) {
          var actual = wrapper.getMaximoCache()
          mtEnabled = actual !== null && actual !== undefined && isJavaInstance(MaximoMTEnabledCacheCls, actual)
        }
      }
      if (wrapperMap !== null && wrapperMap !== undefined && !mtEnabled) {
        results.push({ name: name, status: "skipped", message: "非租户级缓存，MXServer 不支持卸载（仅重载生效）" })
        skipCount++
        continue
      }
      debugPrint("开始卸载缓存[" + name + "]")
      mxserver.unloadTenantCache(name)
      results.push({ name: name, status: "success", message: "缓存已卸载" })
      successCount++
    } catch (e) {
      logger.error(">>> [API ERROR] 卸载缓存[" + name + "]失败:", e)
      results.push({ name: name, status: "error", message: "" + e })
      errorCount++
    }
  }

  return {
    results: results,
    total: names.length,
    successCount: successCount,
    skipCount: skipCount,
    errorCount: errorCount
  }
}

//--------------------------------------------------------------------
// 辅助方法
//--------------------------------------------------------------------

/**
 * 读取请求参数，兼容 getQueryParam 返回 "undefined"/空串的情况
 * @param {java.lang.String} pname
 */
function getParam(pname) {
  try {
    var v = request.getQueryParam(pname)
    if (v === null || v === undefined) {
      return null
    }
    v = String(v)
    if (v === "" || v === "undefined" || v === "null") {
      return null
    }
    return v
  } catch (e) {
    return null
  }
}

/**
 * 取本次要操作的缓存名列表（_cacheName 单个 或 _cacheNames 逗号分隔）
 */
function getActionCacheNames() {
  var names = []
  var single = getParam("_cacheName")
  if (single) {
    names.push(single)
  }
  var multi = getParam("_cacheNames")
  if (multi) {
    var parts = multi.split(",")
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim()
      if (p !== "") {
        names.push(p)
      }
    }
  }
  // 去重
  var uniq = []
  var seen = {}
  for (var j = 0; j < names.length; j++) {
    if (!seen[names[j]]) {
      seen[names[j]] = 1
      uniq.push(names[j])
    }
  }
  if (uniq.length === 0) {
    throw new Error("缺少参数 _cacheName 或 _cacheNames")
  }
  return uniq
}

/**
 * 反射获取 MXServer 内部的 maximoCache (HashMap<String, MaximoCacheWrapper>)
 */
function getMaximoCacheWrapperMap(mxserver) {
  if (mxserver === null || mxserver === undefined) {
    return null
  }
  var cls = mxserver.getClass()
  while (cls !== null && cls !== undefined) {
    try {
      var f = cls.getDeclaredField("maximoCache")
      f.setAccessible(true)
      return f.get(mxserver)
    } catch (e) {
      // 继续向父类查找
    }
    try {
      cls = cls.getSuperclass()
    } catch (e) {
      cls = null
    }
  }
  return null
}

/**
 * 判断对象是否为某个 Java 类型的实例。
 * 注意：Nashorn 中 Java.type("x.y.Z") 返回的是 StaticClass，不能直接调用 Class.isInstance，
 * 需通过 clsRef.class 取到 java.lang.Class 再调用 isInstance。
 * @param {Object} clsRef Java.type(...) 得到的类型引用
 * @param {Object} obj 待判断对象
 * @returns {boolean}
 */
function isJavaInstance(clsRef, obj) {
  if (obj === null || obj === undefined || clsRef === null || clsRef === undefined) {
    return false
  }
  try {
    return clsRef.class.isInstance(obj)
  } catch (e) {
    try {
      return obj instanceof clsRef
    } catch (e2) {
      return false
    }
  }
}

/**
 * 判断并返回容器的元素个数；非容器返回 -1
 * @param {Object} v
 */
function sizeOfContainer(v) {
  if (v === null || v === undefined) {
    return -1
  }
  try {
    if (isJavaInstance(JavaMap, v)) {
      return v.size()
    }
    if (isJavaInstance(JavaCollection, v)) {
      return v.size()
    }
    if (v.getClass().isArray()) {
      return JavaArray.getLength(v)
    }
  } catch (e) { }
  return -1
}

/**
 * 反射统计缓存对象的记录条数：
 * 容器字段(Map/Collection/数组)直接取元素个数；psdi.* 的非容器对象字段向下递归
 */
function countDataEntries(obj, depth) {
  if (obj === null || obj === undefined || depth > 3) {
    return 0
  }
  var direct = sizeOfContainer(obj)
  if (direct >= 0) {
    return direct
  }

  var total = 0
  var cls = obj.getClass()
  var seen = {}
  while (cls !== null && cls !== undefined && cls.getName() !== "java.lang.Object") {
    var fields = null
    try {
      fields = cls.getDeclaredFields()
    } catch (e) {
      fields = null
    }
    if (fields !== null) {
      for (var i = 0; i < fields.length; i++) {
        var f = fields[i]
        var fname = f.getName()
        if (seen[fname] || COUNT_FIELD_BLACKLIST[fname]) {
          continue
        }
        seen[fname] = 1
        try {
          if (JavaModifier.isStatic(f.getModifiers())) {
            continue
          }
          f.setAccessible(true)
          var val = f.get(obj)
          if (val === null || val === undefined) {
            continue
          }
          var sc = sizeOfContainer(val)
          if (sc >= 0) {
            total += sc
            continue
          }
          if (depth < 3 && String(val.getClass().getName()).indexOf("psdi.") === 0) {
            total += countDataEntries(val, depth + 1)
          }
        } catch (e) {
          // 单个字段读取失败忽略
        }
      }
    }
    try {
      cls = cls.getSuperclass()
    } catch (e) {
      cls = null
    }
  }
  return total
}

/**
 * 提取简短的错误信息（不包含堆栈），用于响应体的 message 字段。
 * 完整堆栈请使用 sksLogAnsiUtils.getErrorStackTrace() 放到 errorStackTrace 字段。
 * @param {Object} error
 * @returns {java.lang.String}
 */
function getSimpleErrorMessage(error) {
  if (error === null || error === undefined) {
    return "error"
  }
  try {
    var msg = error.message
    if (msg !== null && msg !== undefined && String(msg) !== "") {
      msg = String(msg)
      // 兜底：万一 message 里带了堆栈，只取第一行
      var nl = msg.indexOf("\n")
      if (nl > 0) {
        msg = msg.substring(0, nl)
      }
      return msg
    }
  } catch (e) { }
  try {
    return String(error)
  } catch (e2) {
    return "error"
  }
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
