// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
    load("nashorn:mozilla_compat.js");
    importPackage(Packages.javax.management);
    importPackage(Packages.java.lang.management);
//直接调用方法的脚本,无任何隐式变量可以使用
var scriptName="APPBEAN.DESIGNER"//service.getScriptName()
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
loggerMX.info("["+scriptName+"]------------------load------------------");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");//13

/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");//67

/** @type {psdi.util.MXSession} */
MXSession = Java.type("psdi.util.MXSession");


/** @type {jscustom.AnsiLogger} */
var logger=null


/**
 * 初始化日志记录器,在bean脚本中,每次都需要调用该方法以初始化logger
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function initLogger(dbctx){
    java.lang.System.out.println("[" + scriptName + "] initLogger")
    if(logger!=null){
        return
    }
    var sksLogAnsiUtils = dbctx.invokeScript("SKS_LOG_ANSI_UTILS");
    logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true ,printModel:true})
    // logger = loggerMX

    // logger.setLevel(Level.INFO);

    logger.debug("[" + scriptName + "] initLogger")
    logger.info("[" + scriptName + "] initLogger")
    logger.warn("[" + scriptName + "] initLogger")
    logger.error("[" + scriptName + "] initLogger")
}

/**
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function initializeApp(dbctx){
    initLogger(dbctx);
    // var clientsession = dbctx.webclientsession();
    // clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "APPBEAN.initializeApp!!!", 1);

    /** @type {psdi.webclient.system.controller.AppInstance} */
    var appInstance = dbctx.getAppInstance();
    /** @type {psdi.webclient.system.beans.DataBean} */
    var appBean = appInstance.getAppBean();
    /** @type {psdi.mbo.MboRemote} */
    var mbo = appBean.getMbo();
    // appBean.setQbe("APPLYNUM", "1003");
    // appBean.reset()
    logger.info("[" + scriptName + "] initializeApp")
}


/**
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function reloadcache(dbctx){
    initLogger(dbctx);
    logger.debug("[" + scriptName + "] reloadcache")
    logger.info("[" + scriptName + "] reloadcache")
    logger.warn("[" + scriptName + "] reloadcache")
    logger.error("[" + scriptName + "] reloadcache")

    /** @type {psdi.security.SecurityService} */
    SecurityService = Java.type("psdi.security.SecurityService")
    var securityService = new SecurityService(MXServer.getMXServer());

    // 通过反射获取 users 字段
    /** @type {java.lang.reflect.Field} */
    var Field = Java.type("java.lang.reflect.Field");
    var usersField = SecurityService.class.getDeclaredField("users");
    usersField.setAccessible(true);
    var users = usersField.get(securityService);
    loggerMX.error("[" + scriptName + "]users: " + users);
    var userMap = users.get();

    loggerMX.error("[" + scriptName + "]当前登录用户数: " + userMap);

    var profile=securityService.getProfile(dbctx.getUserInfo())
    loggerMX.error("[" + scriptName + "]profile: " + profile);
    var appInfo = profile.getAppInfo("IBM_RLFC8", dbctx.getUserInfo());

    logger.info("[" + scriptName + "]appInfo.sks=" + appInfo.get("SKS"));
    logger.info("[" + scriptName + "]appInfo.INSERT=" + appInfo.get("INSERT"));
    logger.info("[" + scriptName + "]appInfo.READ=" + appInfo.get("READ"));
    logger.info("[" + scriptName + "]appInfo.SAVE=" + appInfo.get("SAVE"));
    appInfo = profile.getAppInfo("DESIGNER", dbctx.getUserInfo());
    logger.info("[" + scriptName + "]appInfo.DESIGNER.INSERT=" + appInfo.get("INSERT"));
    logger.info("[" + scriptName + "]appInfo.DESIGNER.READ=" + appInfo.get("READ"));
    logger.info("[" + scriptName + "]appInfo.DESIGNER.SAVE=" + appInfo.get("SAVE"));

    MXServer.getMXServer().reloadMaximoCache("SECURITY", null, true)
    logger.info("[" + scriptName + "] reloadMaximoCache")
    // var clientsession = dbctx.webclientsession();
    // clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "APPBEAN.initializeApp!!!", 1);


    var mbeanServer = ManagementFactory.getPlatformMBeanServer();
    var queryName = new ObjectName("WebSphere:type=SessionStats,*");
    var mbeans = mbeanServer.queryNames(queryName, null);

    var totalLiveSessions = 0;
    var iterator = mbeans.iterator();
    while (iterator.hasNext()) {
        var name = iterator.next();
        var liveCount = mbeanServer.getAttribute(name, "LiveCount");
        if (liveCount != null) {
            totalLiveSessions += parseInt(liveCount);
        }
    }

    print("当前总会话数: " + totalLiveSessions);

}


// Cleans up the MboSet connections and closes the set.
function _close(set) {
    if (set) {
        try {
            set.cleanup();
            set.close();
        } catch (ignore) { }
    }
}