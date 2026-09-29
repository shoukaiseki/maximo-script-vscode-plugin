// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//可用于控制字段只读

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
loggerMX.error("[" + scriptName + "]----------1");
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
// logger.setLevel(Level.INFO);
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


// var clientsession = service.webclientsession();
//接口中获取不到的
// clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "----删除----" + mbo.getString("STATUS"), 1);
// clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("fusion", "TestOk"));
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
    // service.
    // /** @type {psdi.security.UserInfo} */
    // var profile = userInfo.getProfile()
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
    // if (e instanceof MXException || e instanceof MXApplicationException) {
    // }
    var errorMessage="error"
    try {
      errorMessage = sksLogAnsiUtils.getErrorStackTrace(error)
      debugPrint(errorMessage);
    } catch (e) { service.log_error(">>> [API ERROR] 获取异常堆栈:") }

    var errorData = { "status": "error", "message": errorMessage}
    if (paramDebug) {
      errorData.debugMsg = debugMsg.toString();
    }
    responseBody = JSON.stringify(errorData);
  } finally {
    logger.info("[" + scriptName + "]----------------responseBodyTmp finally");
    logger.info("[" + scriptName + "]----------------responseBodyTmp=" + responseBody + ".");
    addLog()
  }

}

function process(){
  var mboSet =null
  try{
    // URL 参数: _action=clearMafappCache
    var actionParam = request.getQueryParam("_action")
    if (actionParam === "clearMafappCache") {
      return doClearCache()
    }

    logger.info("[" + scriptName + "] 默认 process 未匹配 action=" + actionParam)
    return { status: "ignored", message: "未知 _action: " + actionParam }
  }catch(error){
    if(mboSet){
      mboSet.rollback()
    }
    logger.error(">>> [API ERROR] 脚本执行异常:", error)
    sksLogAnsiUtils.throwError(error)
  }finally{
    _close(mboSet)
  }
  return "成功的数据"
}

/**
 * 清除 Graphite 应用服务器缓存目录。
 *
 * 缓存定位（与 GraphiteRouteHandler.getGraphiteRootDir / FileResourceLoader 一致）:
 *   root = MAF_APP_ROOT(系统属性) > MAF_APP_ROOT(环境变量) > MicUtil.getMeaGlobalDir()/maximo/maf
 *          > mxe.int.globaldir/maximo/maf > user.dir/maximo/maf
 *   应用缓存 = root 下与 appId 同名的一级子目录（大小写不敏感匹配实际目录名），
 *   即 new FileResourceLoader(root, app).getAppDir()；其下按 "{version}-{revision}-{checksum}"
 *   存放 expandApp 从 MAFAPPDATA.APP 解压出的 zip 内容。
 *
 * 接口约定（SKS.AUTOSCRIPT.OBJECTS 风格，参数走 URL）:
 *   POST api/script/SKS_APP_MANAGE?_action=clearMafappCache            → 预览（不删除）
 *   POST ...?_action=clearMafappCache&_confirm=true    body {"appid":"TEST"}   → 删除指定应用缓存
 *   POST ...?_action=clearMafappCache&_confirm=true&_all=true                   → 删除全部应用缓存
 *
 * @returns {Object} { mode, root, targets/appsCleared..., message }
 */
function doClearCache() {
  /** @type {java.lang.System} */
  var System = Java.type("java.lang.System");

  var rootFile = getGraphiteRootDir();
  var rootAbs = rootFile.getAbsolutePath();
  logger.info("[" + scriptName + "] MAF 缓存根目录 = " + rootAbs);

  var confirmFlag = request.getQueryParam("_confirm") === "true";
  var allFlag = request.getQueryParam("_all") === "true";

  // 1. 解析 appid（body.appid / body.appids 支持字符串或数组；URL appid 兜底）
  var ids = [];
  var bodyAppIds = null;
  if (requestBody) {
    try {
      var parsed = JSON.parse(requestBody);
      if (parsed) bodyAppIds = parsed.appid || parsed.appids || parsed.appIds || null;
    } catch (e) { /* 非法 JSON 忽略 */ }
  }
  if (bodyAppIds == null) {
    var q = request.getQueryParam("appid");
    if (q && q !== "") bodyAppIds = q;
  }
  if (typeof bodyAppIds === "string") ids = [bodyAppIds];
  else if (bodyAppIds) ids = bodyAppIds;

  // 2. 收集 root 下实际存在的一级子目录（用于大小写不敏感匹配）
  var subDirs = [];
  if (rootFile.exists() && rootFile.isDirectory()) {
    var kids = rootFile.listFiles();
    if (kids) {
      for (var i = 0; i < kids.length; i++) {
        if (kids[i].isDirectory()) subDirs.push(kids[i]);
      }
    }
  }

  // 3. 确定目标目录
  var targets = [];
  var notFound = [];
  if (allFlag) {
    targets = subDirs;
  } else if (ids.length > 0) {
    for (var n = 0; n < ids.length; n++) {
      var id = String(ids[n]).trim();
      if (!id) continue;
      var hit = null;
      for (var m = 0; m < subDirs.length; m++) {
        if (subDirs[m].getName().equalsIgnoreCase(id)) { hit = subDirs[m]; break; }
      }
      if (hit) targets.push(hit);
      else notFound.push(id.toUpperCase());
    }
  } else {
    return { mode: confirmFlag ? "delete" : "list", root: rootAbs,
      cleared: 0, failed: 0, targets: [], appsCleared: [], appsFailed: [], notFound: [],
      message: "未指定 appid（body {\"appid\":...} 或 URL ?appid=），且未加 _all=true，未做任何操作" };
  }

  // 4. 预览模式（默认，不删除）
  if (!confirmFlag) {
    var preview = [];
    var totalBytes = 0;
    for (var p = 0; p < targets.length; p++) {
      var sz = dirSize(targets[p]);
      totalBytes += sz;
      preview.push({ app: targets[p].getName(), dir: targets[p].getAbsolutePath(), bytes: sz });
    }
    return { mode: "list", root: rootAbs, targets: preview, notFound: notFound,
      totalBytes: totalBytes, cleared: 0, failed: 0, appsCleared: [], appsFailed: [],
      message: "预览：待清除 " + preview.length + " 个应用缓存目录，共 " + formatBytes(totalBytes) + "（加 _confirm=true 执行删除）" };
  }

  // 5. 删除模式
  var cleared = 0, failed = 0, freed = 0;
  var appsCleared = [], appsFailed = [];
  for (var t = 0; t < targets.length; t++) {
    /** @type {java.io.File} */
    var dir = targets[t];
    var name = dir.getName();
    var bytes = dirSize(dir);
    var ok = deleteRecursive(dir);
    if (ok) {
      cleared++; freed += bytes; appsCleared.push(name);
      logger.info("[" + scriptName + "] 已清除: " + dir.getAbsolutePath());
    } else {
      failed++; appsFailed.push(name);
      logger.warn("[" + scriptName + "] 清除失败(可能有文件被占用): " + dir.getAbsolutePath());
    }
  }

  return {
    mode: "delete", root: rootAbs,
    cleared: cleared, failed: failed, freedBytes: freed,
    appsCleared: appsCleared, appsFailed: appsFailed, notFound: notFound,
    message: "已清除 " + cleared + " 个应用缓存(" + formatBytes(freed) + ")"
      + (failed > 0 ? ("，" + failed + " 个失败") : "")
      + (notFound.length > 0 ? ("，未找到目录: " + notFound.join(", ")) : "")
  };
}

/**
 * 定位 Graphite 缓存根目录。解析顺序（每一跳都写日志，便于核对）:
 *   1. MAF_APP_ROOT 系统属性
 *   2. MAF_APP_ROOT 环境变量
 *   3. MicUtil.getMeaGlobalDir()/maximo/maf   （GraphiteRouteHandler 用的方式）
 *   4. mxe.int.globaldir/maximo/maf          （标准集成全局目录，兜底）
 *   5. user.dir/maximo/maf                   （最后兜底）
 */
function getGraphiteRootDir() {
  /** @type {java.io.File} */
  var File = Java.type("java.io.File");
  /** @type {java.lang.System} */
  var System = Java.type("java.lang.System");

  // 1/2. MAF_APP_ROOT 系统属性 > 环境变量
  var rootFolder = System.getProperty("MAF_APP_ROOT");
  var source = "系统属性 MAF_APP_ROOT";
  if (rootFolder == null || String(rootFolder) === "") {
    rootFolder = System.getenv("MAF_APP_ROOT");
    source = "环境变量 MAF_APP_ROOT";
  }
  if (rootFolder != null && String(rootFolder) !== "") {
    logger.info("[" + scriptName + "] 缓存根目录来源: " + source + " = " + rootFolder);
    return toCanonical(new File(String(rootFolder)));
  }

  // 3. MicUtil.getMeaGlobalDir()
  try {
    var MicUtil = Java.type("psdi.iface.mic.MicUtil");
    var meaDir = MicUtil.getMeaGlobalDir();
    if (meaDir != null && String(meaDir) !== "") {
      logger.info("[" + scriptName + "] 缓存根目录来源: MicUtil.getMeaGlobalDir() = " + meaDir);
      return toCanonical(new File(String(meaDir), "maximo/maf"));
    }
  } catch (e) {
    logger.warn("[" + scriptName + "] MicUtil.getMeaGlobalDir 不可用: " + e);
  }

  // 4. mxe.int.globaldir
  try {
    var globalDir = MXServer.getMXServer().getProperty("mxe.int.globaldir");
    if (globalDir != null && String(globalDir) !== "") {
      logger.info("[" + scriptName + "] 缓存根目录来源: mxe.int.globaldir = " + globalDir);
      return toCanonical(new File(String(globalDir), "maximo/maf"));
    }
  } catch (e) {
    logger.warn("[" + scriptName + "] 读取 mxe.int.globaldir 失败: " + e);
  }

  // 5. 兜底
  logger.warn("[" + scriptName + "] 未能从配置解析缓存根目录, 回退 user.dir/maximo/maf");
  return toCanonical(new File(System.getProperty("user.dir"), "maximo/maf"));
}

/** File → canonical（失败退 absolute） */
function toCanonical(f) {
  try {
    return f.getCanonicalFile();
  } catch (e) {
    return f.getAbsoluteFile();
  }
}

/** 递归删除目录（先删子项再删自身） */
function deleteRecursive(f) {
  if (f.isDirectory()) {
    var kids = f.listFiles();
    if (kids) {
      for (var k = 0; k < kids.length; k++) deleteRecursive(kids[k]);
    }
  }
  return f["delete"]();
}

/** 递归统计目录大小（字节） */
function dirSize(f) {
  if (f.isFile()) return f.length();
  var sum = 0;
  var kids = f.listFiles();
  if (kids) {
    for (var k = 0; k < kids.length; k++) sum += dirSize(kids[k]);
  }
  return sum;
}

/** 字节数格式化 */
function formatBytes(b) {
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(2) + " MB";
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