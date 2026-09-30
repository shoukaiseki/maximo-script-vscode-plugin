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

// 这几个隐式变量是"按 HTTP 方法注入"的: GET 请求没有 requestBody / responseHeaders,
// 直接用会 ReferenceError, 所以统一用 typeof 兜一层
/** @type {java.lang.String} */
var requestBodyTmp = (typeof requestBody === 'undefined') ? null : requestBody

/** @type {psdi.security.UserInfo} */
var userInfoTmp = userInfo

/** @type {com.ibm.tivoli.maximo.oslc.provider.OslcRequest} */
var requestTmp = request

/** @type {java.util.HashMap} */
var responseHeadersTmp = (typeof responseHeaders === 'undefined') ? null : responseHeaders

/** @type {java.lang.String} */
var httpMethodTmp = (typeof httpMethod === 'undefined') ? null : httpMethod


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

function process() {
  // 默认测这个视图, 也可以用 ?objectname=XXX 覆盖
  var objectname = "V_IBM_RLLINE_QTY"
  var qpObjectname = request.getQueryParam("objectname")
  if (qpObjectname !== 'undefined' && qpObjectname) {
    objectname = qpObjectname
  }
  var objectnameLiteral = objectname.replace(/'/g, "''")
  debugPrint("process objectname=" + objectname)

  // dryRun=true 时只读诊断: 不调用 setupTableOrViewByMbo, 不改任何数据
  var dryRun = false
  var qpDryRun = request.getQueryParam("dryRun")
  if (qpDryRun !== 'undefined' && qpDryRun) {
    dryRun = (qpDryRun === 'true')
  }
  debugPrint("dryRun=" + dryRun)

  var mxserver = MXServer.getMXServer()
  // 配置类对象必须用系统用户查, 普通用户没有 MAXOBJECTCFG / MAXATTRIBUTECFG 的权限
  var ui = mxserver.getSystemUserInfo()

  var mboSet = null
  var checkSet = null
  var probeSet = null
  try {
    mboSet = mxserver.getMboSet("MAXOBJECTCFG", ui)
    mboSet.setWhere("objectname = '" + objectnameLiteral + "'")
    mboSet.reset()
    var mbo = mboSet.getMbo(0)
    if (mbo == null) {
      throw new MXApplicationException("#", "找不到 MAXOBJECTCFG.objectname=" + objectname)
    }
    var entityname = mbo.getString("entityname")
    debugPrint("MAXOBJECTCFG: changed=" + mbo.getString("changed")
      + ", isview=" + mbo.getBoolean("isview")
      + ", imported=" + mbo.getBoolean("imported")
      + ", persistent=" + mbo.getBoolean("persistent")
      + ", entityname=" + entityname)

    // ---- 1. 数据库真值: 全新 MboSet 直查, 不经过 Mbo 上缓存的关系子表 ----
    var dbBefore = queryAttrRows(mxserver, ui, "objectname = '" + objectnameLiteral + "'")
    debugPrint("dbBefore count=" + dbBefore.length)

    // ---- 2. 原生列清单(视图在数据字典里的真实列) ----
    var nativeInfo = service.invokeScript("APPBEAN.CONFIGUR", "diagNativeColumns", [service, mbo])
    var nativeColumns = (nativeInfo && nativeInfo.columns) ? nativeInfo.columns : []
    debugPrint("nativeCount=" + nativeInfo.count + ", columns=" + nativeColumns.join("|"))

    // ---- 3. 内存里的关系子表(loadCreateView 会改的就是这个对象) ----
    var memBefore = dumpAttrRows(mbo.getMboSet("MAXATTRIBUTECFG"))
    debugPrint("memBefore count=" + memBefore.length)

    // ---- 4. 调用被测逻辑 ----
    //
    // ！！必须用 3 参数形式 invokeScript(脚本名, 函数名, 参数数组):
    // APPBEAN.CONFIGUR 的 interface=1(Bean 脚本), JSR223ScriptDriver.evalScript 对这类脚本
    // 走的是 engine.get(context.get("invokeFunction")) 分支, 再 Invocable.invokeFunction(...)。
    // 用 1 参数的 invokeScript(名) 时 invokeFunction 是 null -> engine.get(null) 直接 NPE
    // ("key can not be null")。interface=0 的脚本(如 SKS_LOG_ANSI_UTILS)才走 1 参数那条路。
    //
    // doSave=true: 没有 UI AppBean, 内部会用 mbo.getThisMboSet().save() 提交
    var report = null
    var reportText = null
    if (dryRun) {
      debugPrint("dryRun=true, 跳过 setupTableOrViewByMbo(不做任何修改)")
    } else {
      report = service.invokeScript("APPBEAN.CONFIGUR", "setupTableOrViewByMbo", [service, mbo, true, false, null])
      try {
        reportText = JSON.stringify(report)
      } catch (ignored) {
        // 跨 script engine 返回的 Nashorn 对象不一定能序列化, 退化成 toString
        reportText = "" + report
      }
      debugPrint("report=" + reportText)
    }

    // ---- 5. 执行后: 内存 vs 数据库 ----
    var memAfter = dumpAttrRows(mbo.getMboSet("MAXATTRIBUTECFG"))
    debugPrint("memAfter count=" + memAfter.length)
    var dbAfter = queryAttrRows(mxserver, ui, "objectname = '" + objectnameLiteral + "'")
    debugPrint("dbAfter count=" + dbAfter.length)

    // ---- 6. 差集: 原生列 - 配置列 ----
    var memMap = {}
    for (var i1 = 0; i1 < memAfter.length; i1++) {
      memMap[String(memAfter[i1].columnname).toUpperCase()] = true
    }
    var dbMap = {}
    for (var i2 = 0; i2 < dbAfter.length; i2++) {
      dbMap[String(dbAfter[i2].columnname).toUpperCase()] = true
    }
    var missingInDb = []
    var missingInMem = []
    for (var i3 = 0; i3 < nativeColumns.length; i3++) {
      var nm = String(nativeColumns[i3]).split(":")[0].toUpperCase()
      if (!dbMap[nm]) {
        missingInDb.push(nm)
      }
      if (!memMap[nm]) {
        missingInMem.push(nm)
      }
    }
    debugPrint("missingInDb=" + missingInDb.join("|") + ", missingInMem=" + missingInMem.join("|"))

    // ---- 7. 直查"库里缺的那几列"(不加 objectname 过滤): 看它们是不是落在别的 objectname 下 ----
    var probeRows = []
    if (missingInDb.length > 0) {
      var quoted = []
      for (var i4 = 0; i4 < missingInDb.length; i4++) {
        quoted.push("'" + String(missingInDb[i4]).replace(/'/g, "''") + "'")
      }
      probeSet = mxserver.getMboSet("MAXATTRIBUTECFG", ui)
      probeSet.setWhere("columnname in (" + quoted.join(",") + ")")
      probeSet.reset()
      probeRows = dumpAttrRows(probeSet)
      debugPrint("probeRows=" + JSON.stringify(probeRows))
    }

    return {
      "dryRun": dryRun,
      "objectname": objectname,
      "entityname": entityname,
      "cfg": {
        "changed": mbo.getString("changed"),
        "viewchanged": mbo.getString("viewchanged"),
        "imported": mbo.getBoolean("imported"),
        "isview": mbo.getBoolean("isview"),
        "persistent": mbo.getBoolean("persistent")
      },
      "nativeCount": nativeColumns.length,
      "dbBeforeCount": dbBefore.length,
      "memBeforeCount": memBefore.length,
      "memAfterCount": memAfter.length,
      "dbAfterCount": dbAfter.length,
      "missingInDb": missingInDb,
      "missingInMem": missingInMem,
      "probeRows": probeRows,
      "dbBeforeRows": dbBefore,
      "memBeforeRows": memBefore,
      "memAfterRows": memAfter,
      "productAppended": (report && report.productAppended) ? report.productAppended : [],
      "appended": (report && report.appended) ? report.appended : [],
      "report": reportText
    }
  } catch (error) {
    if (mboSet) {
      mboSet.rollback()
    }
    logger.error(">>> [API ERROR] 脚本执行异常:", error)
    throw error
  } finally {
    _close(probeSet)
    _close(checkSet)
    _close(mboSet)
  }
}

/**
 * 用一个全新的 MboSet 直查 MAXATTRIBUTECFG(数据库真值)
 * @param {psdi.server.MXServer} mxserver
 * @param {psdi.security.UserInfo} ui
 * @param {String} where - where 条件
 * @return {Array} dumpAttrRows() 的结果
 */
function queryAttrRows(mxserver, ui, where) {
  var set = null
  try {
    set = mxserver.getMboSet("MAXATTRIBUTECFG", ui)
    set.setWhere(where)
    set.reset()
    return dumpAttrRows(set)
  } catch (e) {
    logger.error("[" + scriptName + "] queryAttrRows error where=" + where, e)
    return []
  } finally {
    _close(set)
  }
}

/**
 * 把一个 MAXATTRIBUTECFG MboSet 的内容导成普通 JS 数组, 便于 JSON 输出
 *
 * 带上了 changed / toBeAdded / toBeDeleted, 因为"内存里有、库里没有"的行
 * 往往就是被这些状态标记搞的(例如 changed='I' 却没被 save 提交)
 *
 * @param {psdi.mbo.MboSetRemote} set - MAXATTRIBUTECFG 集合(可以是 Mbo 上的关系子表)
 * @return {Array} [{columnname, attributename, maxtype, objectname, entityname, changed, added, deleted}]
 */
function dumpAttrRows(set) {
  var list = []
  if (set == null) {
    return list
  }
  try {
    var row = null
    for (var i = 0; (row = set.getMbo(i)) != null; i++) {
      list.push({
        "columnname": row.getString("columnname"),
        "attributename": row.getString("attributename"),
        "maxtype": row.getString("maxtype"),
        "objectname": row.getString("objectname"),
        "entityname": row.getString("entityname"),
        "changed": row.getString("changed"),
        "added": row.toBeAdded(),
        "deleted": row.toBeDeleted()
      })
    }
  } catch (e) {
    logger.error("[" + scriptName + "] dumpAttrRows error", e)
  }
  return list
}

/**
 * 接口调用日志(只记日志, 不写 IBM_IFACELOG 表)
 */
function addLog() {
  try {
    logger.debug("[" + scriptName + "] addLog: responseBody.length=" + (responseBody ? responseBody.length : 0));
  } catch (ignored) { }
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