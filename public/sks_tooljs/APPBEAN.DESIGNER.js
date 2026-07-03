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

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");

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

/** @type {java.text.SimpleDateFormat} */
SimpleDateFormat = Java.type("java.text.SimpleDateFormat");

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
    logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true ,printModel:false})
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

    // /** @type {psdi.webclient.system.controller.AppInstance} */
    // var appInstance = dbctx.getAppInstance();
    // /** @type {psdi.webclient.system.beans.DataBean} */
    // var appBean = appInstance.getAppBean();
    // /** @type {psdi.mbo.MboRemote} */
    // var mbo = appBean.getMbo();
    // appBean.setQbe("APPLYNUM", "1003");
    // appBean.reset()
    logger.info("[" + scriptName + "] initializeApp")
}
function SAVE2(dbctx){
    initLogger(dbctx);
    logger.info("[" + scriptName + "] save")
    /** @type {psdi.webclient.system.controller.AppInstance} */
    var appInstance = dbctx.getAppInstance();
    /** @type {psdi.webclient.system.beans.DataBean} */
    var appBean = appInstance.getAppBean();
    /** @type {psdi.mbo.MboRemote} */
    var mbo = appBean.getMbo();
    if(!mbo){
        return
    }
    var userInfo=mbo.getUserInfo();
    logger.info("\x1b[32m[" + scriptName + "] mbo.langcode=" + userInfo.getLangCode() + "\x1b[0m")
        // ✅ 使用 appBean.toBeSaved() 检查是否有任何待保存的数据（主表+子表）
    if(!appBean.toBeSaved()){
        logger.info("[" + scriptName + "] 无任何变更，跳过保存")
        return
    }
    var xml=mbo.getString("MAXPRESENTATION.PRESENTATION");
    // logger.info("\x1b[32m[" + scriptName + "] mbo.xml=" + xml + "\x1b[0m")
    if(!(mbo.toBeUpdated()||mbo.toBeAdded())){
        return
    }
    logger.info("\x1b[32m[" + scriptName + "] mbo.name=" + mbo.getName() + "\x1b[0m")

}

function SAVE(dbctx){
    initLogger(dbctx);
    logger.info("[" + scriptName + "] 保存应用程序设计器历史记录")
    /** @type {psdi.webclient.system.controller.AppInstance} */
    var appInstance = dbctx.getAppInstance();
    /** @type {psdi.webclient.system.beans.DataBean} */
    var appBean = appInstance.getAppBean();
    /** @type {psdi.mbo.MboRemote} */
    var mbo = appBean.getMbo();
    if(!mbo){
        return
    }
    var userInfo=mbo.getUserInfo();
    logger.info("\x1b[32m[" + scriptName + "] mbo.langcode=" + userInfo.getLangCode() + "\x1b[0m")
        // ✅ 使用 appBean.toBeSaved() 检查是否有任何待保存的数据（主表+子表）
    if(!appBean.toBeSaved()){
        logger.info("[" + scriptName + "] 无任何变更，跳过备份")
        return
    }

    var xml=mbo.getString("MAXPRESENTATION.PRESENTATION")
    if(!xml){
        logger.warn("[" + scriptName + "] PRESENTATION为空，跳过备份")
        return
    }

    var historySet=null
    try {
        historySet = MXServer.getMXServer().getMboSet("IBM_MAXAPPXML_HISTORY", mbo.getUserInfo());
        historySet.setWhere("1=2")
        historySet.reset()
        var appHistory = historySet.add()

        // SOURCE字段存放PRESENTATION XML内容
        appHistory.setValue("SOURCE", xml, MboConstants.NOACCESSCHECK);

        // APP字段存放应用名称
        var appName = mbo.getString("APP")
        if(!appName){
            appName = "_NULL_"
        }
        appHistory.setValue("APP", appName, MboConstants.NOACCESSCHECK);

        // ALIASNAME标识为设计器备份
        appHistory.setValue("ALIASNAME", "_designer_", MboConstants.NOACCESSCHECK);

        // TYPE标识为设计器类型
        appHistory.setValue("TYPE", "designer", MboConstants.NOACCESSCHECK);

        // DESCRIPTION使用应用名
        appHistory.setValue("DESCRIPTION", appName, MboConstants.NOACCESSCHECK);
        var clentHost = userInfo.getClientHost();
        logger.info("\x1b[32m[" + scriptName + "] mbo.clientHost=" + clentHost + "\x1b[0m")
        if(!hostnameIsValid(clentHost)){
            if (appBean.getMXSession()) {
                clentHost=appBean.getMXSession().getClientHost();
                logger.info("\x1b[32m[" + scriptName + "] mbo.clientHost2=" + clentHost + "\x1b[0m")
                if (!hostnameIsValid(clentHost)) {
                    clentHost=appBean.getMXSession().getClientAddr();
                    logger.info("\x1b[32m[" + scriptName + "] mbo.clientHost3=" + clentHost + "\x1b[0m")
                }
            }

        }
        if(clentHost){
            appHistory.setValue("HOSTNAME", clentHost, MboConstants.NOACCESSCHECK);
        }else{
            appHistory.setValue("HOSTNAME", "_unknown_", MboConstants.NOACCESSCHECK);
        }
        appHistory.setValue("LANGCODE", userInfo.getLangCode(), MboConstants.NOACCESSCHECK);
        historySet.save()
        logger.info("\x1b[32m" + "应用程序设计器备份成功" + "\x1b[0m")
    }catch(e){
        try{

        logger.error("[" + scriptName + "] SAVE2",e)
        }catch(eignored){}
    }finally{
        _close(historySet)
    }
    // appBean.fireDataChangedEvent()
}

//是否有效主机名
function hostnameIsValid(clentHost){
    if (!clentHost) {
        return false
    }
    if (clentHost.equalsIgnoreCase("_unknown_")) {
        return false
    }
    if (clentHost.equalsIgnoreCase("_gateway")) {
        return false
    }
    return true
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


