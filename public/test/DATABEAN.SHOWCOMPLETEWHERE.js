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
var scriptName = "DATABEAN.RECEIPTS_MATRE"//service.getScriptName()
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
loggerMX.info("[" + scriptName + "]------------------load------------------");

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
/** @type {com.ibm.json.java.JSONArray} */
JSONArray = Java.type("com.ibm.json.java.JSONArray");
/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");

/** @type {psdi.webclient.system.controller.Utility} */
Utility = Java.type("psdi.webclient.system.controller.Utility");
/** @type {psdi.webclient.system.controller.WebClientEvent} */
WebClientEvent = Java.type("psdi.webclient.system.controller.WebClientEvent");

/** @type {psdi.util.MXApplicationYesNoCancelException} */
MXApplicationYesNoCancelException = Java.type("psdi.util.MXApplicationYesNoCancelException");//71

/** @type {jscustom.AnsiLogger} */
var logger = null


/**
 * 初始化日志记录器,在bean脚本中,每次都需要调用该方法以初始化logger
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function initLogger(dbctx) {
    java.lang.System.out.println("[" + scriptName + "] initLogger")
    if (logger != null) {
        return
    }
    var sksLogAnsiUtils = dbctx.invokeScript("SKS_LOG_ANSI_UTILS");
    logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true, printModel: true })
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
function initialize(dbctx) {
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
    logger.info("[" + scriptName + "] initialize")
}

function test(dbctx) {
    initLogger(dbctx);
    logger.info("[" + scriptName + "] test")
    /** @type {psdi.webclient.system.controller.AppInstance} */
    var appInstance = dbctx.getAppInstance();
    /** @type {psdi.webclient.system.beans.DataBean} */
    var appBean = appInstance.getAppBean();
    var dataBean = appInstance.getDataBean();
    // dataBean.execute()

    logger.info("[" + scriptName + "] test=")
    var clientsession = dbctx.webclientsession();
    // Utility.handleDialogOK(clientsession.getAdaptorInstance());
    // clientsession.handleDialogOK(true)

    var event = clientsession.getCurrentEvent();
    var msgRet = event.getMessageReturn();
    logger.info("[" + scriptName + "] msgRet=" + msgRet)
    if (msgRet < 0) {
        throw new MXApplicationYesNoCancelException("__custom_id", "configure", "CreateNewAutokeyQuestion");
    } else {
        if (msgRet == MXApplicationYesNoCancelException.OK) {
            logger.info("[" + scriptName + "] ----- OK -----")
        } else if (msgRet == MXApplicationYesNoCancelException.CANCEL) {
            logger.info("[" + scriptName + "] ----- CANCEL -----")
        } else if (msgRet == MXApplicationYesNoCancelException.YES) {
            logger.info("[" + scriptName + "] ----- YES -----")
        } else if (msgRet == MXApplicationYesNoCancelException.NO) {
            logger.info("[" + scriptName + "] ----- NO -----")
        } else {
            logger.info("[" + scriptName + "] ----- UNKNOWN -----" + msgRet)
        }
        dbctx.closeDialog()
        // Utility.sendEvent(new WebClientEvent("dialogok", appInstance.getCurrentPageId(), null, dbctx.sessionContext));
        logger.info("[" + scriptName + "] dialog-----")
    }


}


function testYesNo(dbctx) {
    var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
    var sksLogAnsiUtils = dbctx.invokeScript("SKS_LOG_ANSI_UTILS");
    logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true, printModel: true })
    logger.info("[" + scriptName + "] testYesNo")
    /** @type {psdi.webclient.system.controller.AppInstance} */
    var appInstance = dbctx.getAppInstance();
    /** @type {psdi.webclient.system.beans.DataBean} */
    var appBean = appInstance.getAppBean();
    try {
        var dataBean = appInstance.getDataBean();
        // dataBean.execute()

        logger.info("[" + scriptName + "] test=")
        var clientsession = dbctx.webclientsession();
        // Utility.handleDialogOK(clientsession.getAdaptorInstance());
        // clientsession.handleDialogOK(true)
        var event = clientsession.getCurrentEvent();
        var msgRet = event.getMessageReturn();
        logger.info("[" + scriptName + "] msgRet=" + msgRet)
        if (msgRet < 0) {
            throw new MXApplicationYesNoCancelException("__custom_id222", "configure", "CreateNewAutokeyQuestion");
        } else {
        // dbctx.closeDialog()
            if (msgRet == MXApplicationYesNoCancelException.OK) {
                logger.info("[" + scriptName + "] ----- OK -----")
                clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("login", "welcomeusername", ["--- 点击了 OK "]));
                return
            } else if (msgRet == MXApplicationYesNoCancelException.CANCEL) {
                logger.info("[" + scriptName + "] ----- CANCEL -----")
                clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("login", "welcomeusername", ["--- 点击了 CANCEL "]));
                return
            } else if (msgRet == MXApplicationYesNoCancelException.YES) {
                logger.info("[" + scriptName + "] ----- YES -----")
                clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("login", "welcomeusername", ["--- 点击了 YES "]));
                return
            } else if (msgRet == MXApplicationYesNoCancelException.NO) {
                logger.info("[" + scriptName + "] ----- NO -----")
                clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("login", "welcomeusername", ["--- 点击了 NO "]));
                return
            } else {
                logger.info("[" + scriptName + "] ----- UNKNOWN -----" + msgRet)

                clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("login", "welcomeusername", ["UNKNOWN"]));
                return
            }
        }
    } catch (e) {
        if (e instanceof MXApplicationYesNoCancelException) {
            throw e;
        }
        try {
            logger.info("[" + scriptName + "] dialog-----", e)
        } catch (eignored) { }
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
 * 判断 Java 对象是否为 Map 类型（通过检查接口方法）
 * @param {Object} obj
 * @returns {boolean}
 */
function isJavaMap(obj) {
    try {
        return typeof obj.keySet === "function" && typeof obj.get === "function";
    } catch (e) {
        return false;
    }
}

/**
 * 判断 Java 对象是否为 List/Collection 类型
 * @param {Object} obj
 * @returns {boolean}
 */
function isJavaList(obj) {
    try {
        var cls = obj.getClass().getName();
        return cls.indexOf("List") !== -1 || cls.indexOf("Vector") !== -1 || cls.indexOf("Array") !== -1;
    } catch (e) {
        return false;
    }
}

/**
 * 将 Java Map 转换为 JS 对象（支持 TreeMap、Hashtable 等所有 Map 实现）
 * @param {java.util.Map} javaMap
 * @returns {Object}
 */
function javaMapToJS(javaMap) {
    var result = {};
    var keys = javaMap.keySet().iterator();
    while (keys.hasNext()) {
        var key = keys.next();
        var value = javaMap.get(key);
        if (value != null && isJavaMap(value)) {
            result["" + key] = javaMapToJS(value);
        } else if (value != null && isJavaList(value)) {
            result["" + key] = Java.from(value);
        } else {
            result["" + key] = value;
        }
    }
    return result;
}

/**
  1.安全组授权后权限刷新
 2.用于vscode插件等方式push的xml文件,刷新应用(不一定有效)
 
 DESIGNER 应用程序设计器,随便找个应用导出(例如ITEM),然后在导出的url上将targetid改成dedesigner
  maximo/ui/item.xml?event=exportxml&designmode=true&targetid=designer

  主表列中增加以下按钮
<tablecol mxevent="refreshauth" mxevent_desc="刷新应用权限" mxevent_icon="listab_refresh.gif"  id="results_showlist_tablebody_8"  type="event"/>
<tablecol mxevent="refreshmaxapp" mxevent_desc="刷新应用" mxevent_icon="listab_refresh.gif"  id="results_showlist_tablebody_9"  type="event"/>


放到table里面
<table>
<tablebody>
</tablebody>
<buttongroup id="resultsButtongroup">
    <pushbutton disabledonclick="true" id="results_btn_po_bottom" label="重载所有应用权限" mxevent="refreshallauth"/>
</buttongroup>
</table>
 */