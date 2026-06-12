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
var scriptName="DATABEAN_DESIGNER_RESULTS_SHOWLIST"//service.getScriptName()
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
function refreshmaxapp(dbctx){
    initLogger(dbctx);
    logger.debug("[" + scriptName + "] reloadcache")
    logger.info("[" + scriptName + "] reloadcache")
    logger.warn("[" + scriptName + "] reloadcache")
    logger.error("[" + scriptName + "] reloadcache")
    var mbo = dbctx.getMbo()
    logger.info("[" + scriptName + "] mbo= " + mbo)
    logger.info("[" + scriptName + "] dbctx.getEvent().getType()= " + dbctx.getEvent().getType())
    if(!mbo){
        var appInstance = dbctx.getAppInstance()
        logger.info("[" + scriptName + "] appInstance= " + appInstance)
        var appBean = appInstance.getAppBean()
        logger.info("[" + scriptName + "] appBean= " + appBean)
        mbo = appBean.getMbo()
        logger.info("[" + scriptName + "] mbo= " + mbo)
        var appName=mbo.getString("app")
        logger.info("[" + scriptName + "] appName= " + appName)
    }
    var name = mbo.getString("app")
    logger.info("[" + scriptName + "] reloadcache " + name)
    try {
        /** @type {psdi.webclient.system.session.WebClientSessionFactory} */
        WebClientSessionFactory = Java.type("psdi.webclient.system.session.WebClientSessionFactory");
        /** @type {psdi.webclient.system.runtime.WebClientRuntime} */
        WebClientRuntime = Java.type("psdi.webclient.system.runtime.WebClientRuntime");//53
        var wcsf = WebClientSessionFactory.getWebClientSessionFactory();
        var wcs=dbctx.getEvent().getWebClientSession()
        // var wcs = wcsf.createSession(request.getHttpServletRequest(), request.getHttpServletResponse());
        var wcr = WebClientRuntime.getWebClientRuntime();
        if (name.equalsIgnoreCase("replibrary")) {
            wcr.getLibraryDescriptor(name, wcs);
        } else {
            /** @type {psdi.webclient.system.controller.LabelCacheMgr} */
            LabelCacheMgr = Java.type("psdi.webclient.system.controller.LabelCacheMgr");//58
            System = Java.type("java.lang.System")
            LabelCacheMgr.clearCache(name, wcs);
            LabelCacheMgr.clearSystemCache(wcs);
            if (wcr.removeAppDescriptor(name) != null) {
                System.out.println("Refreshed application \"" + name + "\".");
            } else if (wcr.removeLibraryDescriptor(name) != null) {
                wcr.getLibraryDescriptor(name, wcs);
                System.out.println("Refreshed library \"" + name + "\".");
            } else if (wcr.removeAppXML(name) != null) {
                System.out.println("Refreshed application \"" + name + "\".");
            } else {
                System.out.println("Refresh not necessary for \"" + name.toUpperCase() + "\" application.");
            }
        }
        logger.error("\x1b[35;40m[" + scriptName + "] refreshApp end\x1b[0m")
    } catch (e) {
        logger.warn(e)
        logger.warn("[" + scriptName + "] refreshApp error,正常现象", e)
    }

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

/**
 * 主要用于vscode插件等方式push的xml文件,刷新应用
  DESIGNER 应用程序设计器,通过数据查询 select *from MAXPRESENTATION  where app='DESIGNER'
  复制里面的xml内容,去网上找xml在线格式化,之后保存到 DESIGNER.xml
  主表列中增加以下按钮
     <tablecol mxevent="refreshmaxapp" mxevent_desc="刷新应用" mxevent_icon="listab_refresh.gif"  id="results_showlist_tablebody_8"  type="event"/>
 */