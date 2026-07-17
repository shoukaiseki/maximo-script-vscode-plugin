// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load('nashorn:mozilla_compat.js');
var scriptName = service.getScriptName()

/** @type {com.ibm.tivoli.maximo.script.ScriptUtil} */
ScriptUtil = Java.type("com.ibm.tivoli.maximo.script.ScriptUtil");
/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");
/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8
/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");
// var scriptName=scriptName
/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer")
/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");//67

/** @type {psdi.util.MXSession} */
MXSession = Java.type("psdi.util.MXSession");
/** @type {com.ibm.json.java.JSONArray} */
JSONArray = Java.type("com.ibm.json.java.JSONArray");
/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");
/** @type {java.text.SimpleDateFormat} */
SimpleDateFormat = Java.type("java.text.SimpleDateFormat")


/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("[" + scriptName + "]----------1");
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
// logger.setLevel(Level.INFO);
logger.info("[" + scriptName + "]----------------Starting execution of script " + service.getScriptName());
logger.info("[" + scriptName + "]-------------webclientsession=" + service.webclientsession())


/** @type {java.lang.String} */
var scriptNameTmp = scriptName

/** @type {java.lang.String} */
var instanceNameTmp = instanceName

/** @type {psdi.security.UserInfo} */
var runAsUserInfoTmp = runAsUserInfo

/** @type {java.lang.String} */
var argTmp = arg

/** @type {psdi.mbo.MboSet} */
var scriptSet = null
var scriptHistorySet = null

try {
    logger.error("\x1b[32m[" + scriptName + "]----------------备份脚本定时任务开始------------------\x1b[0m");

    scriptSet = MXServer.getMXServer().getMboSet("AUTOSCRIPT", runAsUserInfo)
    scriptSet.setWhere("1=1")
    scriptSet.reset()

    scriptHistorySet = MXServer.getMXServer().getMboSet("IBM_AUTOSCRIPT_HISTORY", runAsUserInfo)
    scriptHistorySet.setWhere("1=2")
    scriptHistorySet.reset()

    var i = 0
    for (var script = scriptSet.moveFirst(); script; script = scriptSet.moveNext()) {
        logger.info("[" + scriptName + "]----------------开始备份脚本: " + script.getString("AUTOSCRIPT"));
        var scriptHistory = scriptHistorySet.add()
        service.invokeScript("AUTOSCRIPT_UTILS", "copyScriptToHistory", [service, script, scriptHistory])
        // copyScriptToHistory(script, scriptHistory)
        scriptHistory.setValue("ALIASNAME", "_crontask_", MboConstants.NOACCESSCHECK);
        if (i % 10 == 0) {
            scriptHistorySet.save()
        }
        i++
    }
    scriptHistorySet.save()

    // 清理7天前的历史记录
    logger.info("[" + scriptName + "]----------------开始清理37天前的_CRONTASK_历史记录");
    cleanUpHistory(runAsUserInfo)
    logger.error("\x1b[32m[" + scriptName + "]----------------备份脚本定时任务完成------------------\x1b[0m");
} catch (e) {
    logger.error("[" + scriptName + "]----------------Error: ", e);
    sksLogAnsiUtils.throwError(e)
} finally {
    _close(scriptSet)
    _close(scriptHistorySet)
}

function cleanUpHistory(runAsUserInfo) {
    var connBackup = null
    var stmtBackup = null
    try {

        /** @type {java.sql.Connection} */
        connBackup = MXServer.getMXServer().getDBManager().getConnection(runAsUserInfo.getConnectionKey());
        /** @type {java.sql.Statement} */
        var stmtBackup = connBackup.createStatement();
        var sqlDelete = "DELETE FROM IBM_AUTOSCRIPT_HISTORY WHERE ALIASNAME='_crontask_' AND CREATETIME < CURRENT_DATE - 37 DAYS";
        var deletedCount = stmtBackup.executeUpdate(sqlDelete);
        logger.info("[" + scriptName + "]----------------已清理 " + deletedCount + " 条历史记录");
    } finally {
        _closeOnly(stmtBackup)
        _closeOnly(connBackup)
    }
}

/**
 * 关闭（有close方法的对象）
 */
function _closeOnly(obj) {
    try {
        if (obj) {
            obj.close()
        }
    } catch (ignored) { }
}


function _close(set) {
    if (set) {
        try {
            set.cleanup()
        } catch (ignore) { }
        try {
            set.close()
        } catch (ignore) { }
    }
}
