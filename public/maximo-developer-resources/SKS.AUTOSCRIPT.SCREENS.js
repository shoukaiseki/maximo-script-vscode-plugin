// @ts-nocheck
/* eslint-disable no-undef */
/// <reference path="@javaapi/global.d.ts" />
load('nashorn:mozilla_compat.js');
scriptName = service.getScriptName()
/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("[SKS.AUTOSCRIPT.SCREENS]----------1");
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
logger.setLevel(Level.INFO);
logger.info("[SKS.AUTOSCRIPT.SCREENS]----------------Starting execution of script " + service.getScriptName());
logger.info("[SKS.AUTOSCRIPT.SCREENS]-------------webclientsession=" + service.webclientsession())

var classLoadFlag = false
RESTRequest = Java.type("com.ibm.tivoli.oslc.RESTRequest");

/** @type {psdi.util.MXSession} */
MXSession = Java.type("psdi.util.MXSession");

if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
    var _langcode = request.getQueryParam("_langcode");
    // uInfo.setLocale(lang);
    userInfo.setLangCode(_langcode.toLowerCase())
    if (userInfo.getLocale()) {
        logger.error("\x1b[35;40m[SKS.AUTOSCRIPT.SCREENS]------------------没有错误,只为一直显示_langcode=" + userInfo.getLangCode() + ",locale.language=" + userInfo.getLocale().getLanguage() + ",country=" + userInfo.getLocale().getCountry() + "\x1b[0m");
    }
}

//如果为true,导出时则不增加metadata信息，默认为false
var ignoreMetadata = false
if (request.getQueryParam("ignoreMetadata") !== 'undefined' && request.getQueryParam("ignoreMetadata")=="true") {
    ignoreMetadata= true
}

var clentHost = null
var aliasName = null
if (request.getQueryParam("_clenthost") !== 'undefined' && request.getQueryParam("_clenthost")) {
    clentHost = request.getQueryParam("_clenthost")
}
if (request.getQueryParam("_aliasname") !== 'undefined' && request.getQueryParam("_aliasname")) {
    aliasName = request.getQueryParam("_aliasname")
}

RuntimeException = Java.type("java.lang.RuntimeException");
Exception = Java.type("java.lang.Exception");
System.out.println("----------------Starting execution of script " + service.getScriptName());

URLDecoder = Java.type("java.net.URLDecoder");
StandardCharsets = Java.type("java.nio.charset.StandardCharsets");

MboConstants = Java.type("psdi.mbo.MboConstants");
SqlFormat = Java.type("psdi.mbo.SqlFormat");
MXServer = Java.type("psdi.server.MXServer");

MXException = Java.type("psdi.util.MXException");
MXAccessException = Java.type("psdi.util.MXAccessException");
MXApplicationException = Java.type("psdi.util.MXApplicationException");
/** @type {java.lang.System} */
System = Java.type("java.lang.System");//59
logger.info("\x1b[35;40m[SKS.AUTOSCRIPT.SCREENS]------------------001");

var PresentationLoader = null

var classLoader
try {
    classLoader = java.lang.Thread.currentThread().getContextClassLoader();
    /** @type {psdi.webclient.system.controller.PresentationLoader} */
    PresentationLoader = sksLogAnsiUtils.autoJavaType("psdi.webclient.system.controller.PresentationLoader");

    /** @type {psdi.webclient.system.session.WebClientSessionFactory} */
    WebClientSessionFactory = sksLogAnsiUtils.autoJavaType("psdi.webclient.system.session.WebClientSessionFactory");

    /** @type {psdi.webclient.system.runtime.WebClientRuntime} */
    WebClientRuntime = sksLogAnsiUtils.autoJavaType("psdi.webclient.system.runtime.WebClientRuntime");
    /** @type {psdi.webclient.system.controller.IdProperty} */
    IdProperty = sksLogAnsiUtils.autoJavaType("psdi.webclient.system.controller.IdProperty");
    /** @type {psdi.webclient.system.controller.LabelCacheMgr} */
    LabelCacheMgr = sksLogAnsiUtils.autoJavaType("psdi.webclient.system.controller.LabelCacheMgr");
    classLoadFlag = true

} catch (ignored3) {
    logger.error("[SKS.AUTOSCRIPT.SCREENS] 类加载失败0",ignored3)

    // try {
    //     /** @type {psdi.webclient.system.controller.PresentationLoader} */
    //     PresentationLoader = Java.type("psdi.webclient.system.controller.PresentationLoader");
    //     /** @type {psdi.webclient.system.session.WebClientSessionFactory} */
    //     WebClientSessionFactory = Java.type("psdi.webclient.system.session.WebClientSessionFactory");
    //     /** @type {psdi.webclient.system.runtime.WebClientRuntime} */
    //     WebClientRuntime = Java.type("psdi.webclient.system.runtime.WebClientRuntime");//53
    //     /** @type {psdi.webclient.system.controller.IdProperty} */
    //     IdProperty = Java.type("psdi.webclient.system.controller.IdProperty");//51
    //     /** @type {psdi.webclient.system.controller.LabelCacheMgr} */
    //     LabelCacheMgr = Java.type("psdi.webclient.system.controller.LabelCacheMgr");//58
    //     classLoadFlag = true
    //     logger.warn("[SKS.AUTOSCRIPT.SCREENS] 类加载成功1")
    // } catch (ignored) {
    //     logger.error("[SKS.AUTOSCRIPT.SCREENS] 应该是PresentationLoader not fount,重新push SKS.AUTOSCRIPT.SCREENS 应该就可以了" + ignored);
    //     logger.error("[SKS.AUTOSCRIPT.SCREENS] 类加载失败1")
    //     classLoadFlag = false
    //     try {

    //         classLoader = request.getClass().getClassLoader();
    //         /** @type {psdi.webclient.system.controller.PresentationLoader} */
    //         PresentationLoader = Java.type("psdi.webclient.system.controller.PresentationLoader", classLoader);
    //         /** @type {psdi.webclient.system.session.WebClientSessionFactory} */
    //         WebClientSessionFactory = Java.type("psdi.webclient.system.session.WebClientSessionFactory", classLoader);
    //         /** @type {psdi.webclient.system.runtime.WebClientRuntime} */
    //         WebClientRuntime = Java.type("psdi.webclient.system.runtime.WebClientRuntime", classLoader);//53
    //         /** @type {psdi.webclient.system.controller.IdProperty} */
    //         IdProperty = Java.type("psdi.webclient.system.controller.IdProperty", classLoader);//51
    //         /** @type {psdi.webclient.system.controller.LabelCacheMgr} */
    //         LabelCacheMgr = Java.type("psdi.webclient.system.controller.LabelCacheMgr", classLoader);//58
    //         classLoadFlag = true
    //         logger.warn("[SKS.AUTOSCRIPT.SCREENS] 类加载成功2")
    //     } catch (ignored2) {
    //         logger.error("[SKS.AUTOSCRIPT.SCREENS] 类加载失败2")
    //     }
    // }
}


// MAS removed support for legacy JDOM, switch to JDOM2 and then fall back to legacy JDOM for older versions.
try {
    Element = Java.type("org.jdom2.Element");
    SAXBuilder = Java.type("org.jdom2.input.SAXBuilder");
    Format = Java.type("org.jdom2.output.Format");
    XMLOutputter = Java.type("org.jdom2.output.XMLOutputter");
} catch (error) {
    if (error instanceof Java.type("java.lang.ClassNotFoundException") || error instanceof Java.type("java.lang.RuntimeException")) {
        Element = Java.type("org.jdom.Element");
        SAXBuilder = Java.type("org.jdom.input.SAXBuilder");
        Format = Java.type("org.jdom.output.Format");
        XMLOutputter = Java.type("org.jdom.output.XMLOutputter");
    } else {
        // if some other error is occurring throw the error to the user.
        throw error;
    }
}
logger.info("\x1b[35;40m[SKS.AUTOSCRIPT.SCREENS]------------------003");

StringReader = Java.type("java.io.StringReader");
StringWriter = Java.type("java.io.StringWriter");
logger.setLevel(Level.INFO);

logger.info("\x1b[35;40m[SKS.AUTOSCRIPT.SCREENS]------------------004");
function ImportAppScript(xml) {
    logger.info("[SKS.AUTOSCRIPT.SCREENS]  ImportAppScript")
    this.xml = xml;
    this.currentAppID = null;
}


ImportAppScript.prototype.constructor = ImportAppScript;
ImportAppScript.prototype.importApp = function (app, saveLabels) {
    var xml = this.xml
    //maximo9.1
    /** @type {psdi.webclient.system.controller.PresentationParser} */
    PresentationParser = sksLogAnsiUtils.autoJavaType("psdi.webclient.system.controller.PresentationParser")
    /** @type {psdi.webclient.system.controller.PresentationParser} */
    var pp = new PresentationParser(xml);
    this.currentAppID = pp.getApplication();
    logger.info('[SKS.AUTOSCRIPT.SCREENS] ImportAppScript.currentAppID=' + this.currentAppID)
    if (pp.getTrimmedXML().indexOf("<systemlib") < 0) {
        //应用xml
        /** @type {psdi.mbo.MboSetRemote} */
        var maxAppsSet = MXServer.getMXServer().getMboSet("MAXAPPS", userInfo);
        /** @type {psdi.mbo.MboRemote} */
        var app = maxAppsSet.moveFirst();

        var exists = false;
        for (exists = false; app != null; app = maxAppsSet.moveNext()) {
            var compAppId = app.getString("app");
            if (compAppId.equalsIgnoreCase(this.currentAppID)) {
                exists = true;
                logger.info("[SKS.AUTOSCRIPT.SCREENS]  ImportAppScript.应用存在")
                break;
            }
        }

        if (!exists) {
            throw new MXApplicationException("designer", "noapp", [this.currentAppID.toUpperCase()]);
        }

    } else if (MXServer.isBotcInstalled() && this.currentAppID != null && (this.currentAppID.equalsIgnoreCase("library") || this.currentAppID.equalsIgnoreCase("lookups") || this.currentAppID.equalsIgnoreCase("menus"))) {
        throw new MXApplicationException("botc", "nosystempresentataions");
    }
    //在这里增加保存系统当前的历史记录,新增一个保存历史记录的方法,参考 masscript\cn\shoukaiseki\tools\APPBEAN.DESIGNER.js
    // 保存旧版本历史记录（从数据库查询当前已有内容，作为导入前的备份）
    if (!saveOldVersionHistory(pp)) {
        logger.info("[SKS.AUTOSCRIPT.SCREENS]  无旧版本需要备份或保存失败")
    }
    logger.info("[SKS.AUTOSCRIPT.SCREENS]  ImportAppScript.saveHistory")
    //系统xml 或者 应用xml存在
    var labels = pp.getLabels();
    this.saveXML(this.currentAppID, pp.getTrimmedXML());
    if (saveLabels) {
        logger.info("[SKS.AUTOSCRIPT.SCREENS]  ImportAppScript.saveLabels")
        this.saveLabels(this.currentAppID, labels);
    }

    this.refreshApp(this.currentAppID);
    if (this.currentAppID.equalsIgnoreCase("REPLIBRARY")) {
        if (logger.isDebugEnabled()) {
            logger.debug("*** Telling the server to reload REPLIBRARY cache");
        }

        if (WebClientRuntime.isMTEnabled()) {
            try {
                WebClientRuntime.getWebClientRuntime().getPresentationCache().reload("REPLIBRARY_" + MXServer.getTenantContext());
            } catch (e) {
                e.printStackTrace();
            }
        }

        MXServer.getMXServer().reloadMaximoCache("PRESENTATION", this.currentAppID, true);
    } else {
        if (logger.isDebugEnabled()) {
            logger.debug("*** Telling the server to reload SYSTEM cache");
        }

        MXServer.getMXServer().reloadMaximoCache("PRESENTATION", true);
    }

    logger.info("Successfully imported " + this.currentAppID.toUpperCase() + " application");

}

ImportAppScript.prototype.saveXML = function (appID, xml) {
    logger.info("[SKS.AUTOSCRIPT.SCREENS]  ImportAppScript.saveXML")
    try {
        /** @type {psdi.mbo.MboSetRemote} */
        var mboset = MXServer.getMXServer().getMboSet("MAXPRESENTATION", userInfo);
        mboset.resetQbe();
        mboset.setQbeExactMatch(true);
        mboset.setQbe("app", appID);
        mboset.reset();
        /** @type {psdi.mbo.MboRemote} */
        var mbo = null;
        if (mboset.isEmpty()) {
            mbo = mboset.add();
            mbo.setValue("app", appID, 9);
        } else {
            mbo = mboset.getMbo(0);
        }

        mbo.setValue("presentation", xml);
        mboset.save();
        /** @type {WebClientRuntime} */
        var wcr = WebClientRuntime.getWebClientRuntime();
        wcr.setAppXML(appID, xml);
    } catch (var7) {
        var params = new Array("Unable to save xml definition:  IO Error");
        throw new MXApplicationException("importApp", "generic", params);
    }
    logger.info("[SKS.AUTOSCRIPT.SCREENS]  ImportAppScript.saveXML end")

}
/**
 * 保存当前数据库中的旧版本 XML 到历史记录表（导入前的备份）
 * 根据 appID 查询 MAXPRESENTATION 表中的当前 PRESENTATION 内容并保存到 IBM_MAXAPPXML_HISTORY
 * @param {string} appID - 应用名
 * @returns {boolean} 是否保存成功
 */
function saveOldVersionHistory(pp) {
    appID = pp.getApplication();
    logger.info("[SKS.AUTOSCRIPT.SCREENS] saveOldVersionHistory appID=" + appID);
    var presentationSet = null;
    var historySet = null;
    try {
        // 查询当前数据库中的 MAXPRESENTATION 记录
        presentationSet = MXServer.getMXServer().getMboSet("MAXPRESENTATION", userInfo);
        presentationSet.resetQbe();
        presentationSet.setQbeExactMatch(true);
        presentationSet.setQbe("app", appID);
        presentationSet.reset();

        if (presentationSet.isEmpty()) {
            logger.info("[SKS.AUTOSCRIPT.SCREENS] MAXPRESENTATION中无旧版本记录，跳过备份");
            return true;
        }

        var mbo = presentationSet.getMbo(0);
        var oldXml = mbo.getString("PRESENTATION");
        if (!oldXml) {
            logger.info("[SKS.AUTOSCRIPT.SCREENS] PRESENTATION为空，跳过备份");
            return true;
        }

        // 保存到 IBM_MAXAPPXML_HISTORY
        historySet = MXServer.getMXServer().getMboSet("IBM_MAXAPPXML_HISTORY", userInfo);
        var history = historySet.add();

        history.setValue("SOURCE", oldXml, MboConstants.NOACCESSCHECK);
        history.setValue("APP", appID, MboConstants.NOACCESSCHECK);
        if (!clentHost) {
            clentHost = userInfo.getClientHost();
        }
        if (!clentHost) {
            clentHost = request.getHttpServletRequest().getRemoteHost();
        }
        if (clentHost) {
            history.setValue("HOSTNAME", clentHost, MboConstants.NOACCESSCHECK);
        } else {
            history.setValue("HOSTNAME", "_unknown_", MboConstants.NOACCESSCHECK);
        }
        history.setValue("ALIASNAME", aliasName ? aliasName : "_screen_", MboConstants.NOACCESSCHECK);
        history.setValue("TYPE", "screens", MboConstants.NOACCESSCHECK);
        history.setValue("DESCRIPTION", appID, MboConstants.NOACCESSCHECK);
        history.setValue("LANGCODE", userInfo.getLangCode(), MboConstants.NOACCESSCHECK);
        history.setValue("VERSION", "save.before", MboConstants.NOACCESSCHECK);
        history = history.copy()
        history.setValue("VERSION", "save.after", MboConstants.NOACCESSCHECK);
        history.setValue("SOURCE", pp.getTrimmedXML(), MboConstants.NOACCESSCHECK);
        historySet.save();
        logger.info("\x1b[32m[SKS.AUTOSCRIPT.SCREENS] 旧版本历史记录保存成功: " + appID + "\x1b[0m");
        return true;
    } catch (e) {
        logger.error("[SKS.AUTOSCRIPT.SCREENS] saveOldVersionHistory error", e);
        return false;
    } finally {
        _close(presentationSet);
        _close(historySet);
    }
}
/**
 * 查询系统标签值, 用于跳过与系统默认值相同的标签。
 * 注意: getSystemLabelCache 需要 WebClientSession, 不能传 MXServer;
 * API 调用时没有 WebClientSession, 直接返回 null(不跳过, 全部写入 MAXLABELS)。
 * @param {psdi.webclient.system.controller.IdProperty} l
 * @returns {java.lang.String}
 */
function getSystemLabelValue(l) {
    try {
        var wcs = service.webclientsession();
        if (!wcs) {
            return null;
        }
        var syscache = LabelCacheMgr.getSystemLabelCache(wcs);
        return syscache.getString(l.getId(), l.getProperty());
    } catch (ignore) {
        return null;
    }
}

/**
 * 补写新增标签的基础语言值。
 * VALUE 是 MLINUSE=1 多语言字段, 在非基础语言会话下 add 只会写 L_MAXLABELS,
 * 基础列需要切到基础语言会话后用新集合直接 setValue 才能落库。
 * @param {string} appID
 * @param {Array} addedLabels [{id, property, value}]
 */
function applyBaseLangLabels(appID, addedLabels) {
    if (!addedLabels || addedLabels.length === 0) {
        return
    }
    var currentLang = ""
    try { currentLang = String(userInfo.getLangCode()).toUpperCase() } catch (ignored) { }
    var baseLang = ""
    try { baseLang = String(MXServer.getMXServer().getBaseLang()).toUpperCase() } catch (ignored) { }
    if (!baseLang || baseLang === currentLang) {
        return
    }

    var labelSet = null
    try {
        userInfo.setLangCode(baseLang)
        labelSet = MXServer.getMXServer().getMboSet("MAXLABELS", userInfo)
        var sqlFormat = new SqlFormat("app = :1 and id = :2 and property = :3")
        var changed = 0
        for (var i = 0; i < addedLabels.length; i++) {
            var item = addedLabels[i]
            sqlFormat.setObject(1, "MAXLABELS", "APP", appID)
            sqlFormat.setObject(2, "MAXLABELS", "ID", item.id)
            sqlFormat.setObject(3, "MAXLABELS", "PROPERTY", item.property)
            labelSet.setWhere(sqlFormat.format())
            labelSet.reset()
            var target = labelSet.getMbo(0)
            if (!target) {
                continue
            }
            target.setValue("value", '~null~', MboConstants.NOACCESSCHECK)
            // 必须逐条保存: 下一次 reset() 会丢弃未保存的修改
            labelSet.save()
            changed++
        }
        if (changed > 0) {
            logger.info("[SKS.AUTOSCRIPT.SCREENS] 基础语言(" + baseLang + ")补写标签成功: " + changed)
        }
    } catch (e) {
        logger.warn("[SKS.AUTOSCRIPT.SCREENS] 基础语言补写标签失败", e)
    } finally {
        if (labelSet) {
            try { labelSet.cleanup() } catch (ignored) { }
            try { labelSet.close() } catch (ignored) { }
        }
        if (currentLang) {
            try { userInfo.setLangCode(currentLang) } catch (ignored) { }
        }
    }
}

ImportAppScript.prototype.saveLabels = function (appID, labels) {
    logger.info("[SKS.AUTOSCRIPT.SCREENS]  ImportAppScript.saveLabels")
    try {
        var mboset = MXServer.getMXServer().getMboSet("MAXLABELS", userInfo);
        mboset.resetQbe();
        mboset.setQbeExactMatch(true);
        mboset.setQbe("app", appID);
        mboset.reset();
        mboset.setLogLargFetchResultDisabled(true);
        var index = 0;
        var addCount = 0;
        var updateCount = 0;
        var deleteCount = 0;
        var addedLabels = [];
        logger.info("[SKS.AUTOSCRIPT.SCREENS] saveLabels app=" + appID + ", labels.size=" + labels.size())

        while (true) {
            /** @type {psdi.mbo.MboRemote} */
            var mbo = mboset.getMbo(index);
            if (mbo == null) {
                // 注意: Nashorn 下 for...in 不会迭代 Java Set 的元素, 必须用 Iterator
                var labelIter = labels.entrySet().iterator();
                while (labelIter.hasNext()) {
                    var entry = labelIter.next();
                    /** @type {psdi.webclient.system.controller.IdProperty} */
                    var l = entry.getKey();
                    /** @type {java.lang.String} */
                    var v = entry.getValue();
                    var sysValue = getSystemLabelValue(l);
                    if (!v.equals(sysValue)) {

                        var newLabel = mboset.add();
                        newLabel.setValue("app", appID, 9);
                        newLabel.setValue("id", l.getId());
                        newLabel.setValue("property", l.getProperty());
                        newLabel.setValue("value", v);
                        addedLabels.push({ id: String(l.getId()), property: String(l.getProperty()), value: String(v) });
                        addCount++;
                    }
                }

                mboset.save();
                applyBaseLangLabels(appID, addedLabels);
                logger.info("\x1b[35;40m[SKS.AUTOSCRIPT.SCREENS] saveLabels end, app=" + appID + ", add=" + addCount + ", update=" + updateCount + ", delete=" + deleteCount + "\x1b[0m")
                return;
            }

            var existingLabel = new IdProperty(mbo.getString("id"), mbo.getString("property"));
            var newValue = labels.get(existingLabel);
            if (newValue == null) {
                mbo.delete();
                deleteCount++;
            } else {
                mbo.setValue("app", appID, 11);
                mbo.setValue("id", existingLabel.getId(), 11);
                mbo.setValue("property", existingLabel.getProperty(), 11);
                mbo.setValue("value", newValue, 11);
                updateCount++;
            }

            labels.remove(existingLabel);
            ++index;
        }
    } catch (x) {
        System.out.println("Unable to save presentation labels: " + x);
        var params = new Array("Unable to save presentation labels: IO Error");
        throw new MXApplicationException("importApp", "generic", params);
    }

}

ImportAppScript.prototype.refreshApp = function (name) {
    try {
        var wcsf = WebClientSessionFactory.getWebClientSessionFactory();
        var wcs = wcsf.createSession(request.getHttpServletRequest(), request.getHttpServletResponse());
        var wcr = WebClientRuntime.getWebClientRuntime();
        if (name.equalsIgnoreCase("replibrary")) {
            wcr.getLibraryDescriptor(name, wcs);
        } else {
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
        logger.error("\x1b[35;40m[SKS.AUTOSCRIPT.SCREENS] refreshApp end\x1b[0m")
    } catch (e) {
        logger.warn("[SKS.AUTOSCRIPT.SCREENS] refreshApp error,正常现象,api调用肯定异常,MAXAUTH调用也经常会异常", e)
    }


}

function main() {
    if (typeof httpMethod !== "undefined") {
        var response = {};
        try {
            checkPermissions("SKS_UTILS", "DEPLOYSCRIPT");

            // 应用信息导入导出(新方式, 使用 SKS_MIGRATE_* 对象处理脚本)
            var actionParam = request.getQueryParam("_action");
            if (actionParam === "exportAppInfo" || actionParam === "importAppInfo") {
                var migrateResult = actionParam === "exportAppInfo" ? exportAppInfo() : importAppInfo();
                response.status = "success";
                responseBody = JSON.stringify(migrateResult);
                return;
            }
            if (actionParam === "exportAppZip") {
                // 二进制下载: 直接返回 byte[], 不经过 base64/JSON
                var zipResult = exportAppZip();
                if (zipResult) {
                    responseBody = JSON.stringify(zipResult);
                }
                return;
            }

            if (httpMethod.toLowerCase() === "get") {
                var screenName = getRequestScreentName();
                if (typeof screenName === "undefined" || screenName === null || !screenName) {
                    // If nothing is requested then return a list of all screens.
                    var presentationSet;
                    var mafappdataSet;
                    try {
                        presentationSet = MXServer.getMXServer().getMboSet("MAXPRESENTATION", userInfo);
                        // presentationSet.setUserWhere("app in (select app from maxapps where apptype not in ('OS', 'APP', 'WC', 'MAS') and app not in('ACTUALCI','CHANGE','CONTSFW','DBINFO','DPAMADPT','DPAMMANU','DPAMOS','DPAMPROC','DPAMSW','DPAMSWS','DPAMSWUSG','DPLDASSET','GRPASSIGN','IBMCONTENT','IMICONF','INCIDENT','NDASSET','NPASSET','PROBLEM','PRODUCT','RCNASTLINK','RCNASTRSLT','RCNCILINK','RCNCIRSLT','RCNCMPRULE','RCNLNKRULE','RCNTSKFLTR','RECONLINK','RECONTASK','RELEASE','SFWLICVIEW','TENANTREG','TLOAMSWCTG','WORKER_LH'))")
                        //这几个导入会报错的,直接不导出
                        presentationSet.setUserWhere(" app not in('ACTUALCI','CHANGE','CONTSFW','DBINFO','DPAMADPT','DPAMMANU','DPAMOS','DPAMPROC','DPAMSW','DPAMSWS','DPAMSWUSG','DPLDASSET','GRPASSIGN','IBMCONTENT','IMICONF','INCIDENT','NDASSET','NPASSET','PROBLEM','PRODUCT','RCNASTLINK','RCNASTRSLT','RCNCILINK','RCNCIRSLT','RCNCMPRULE','RCNLNKRULE','RCNTSKFLTR','RECONLINK','RECONTASK','RELEASE','SFWLICVIEW','TENANTREG','TLOAMSWCTG','WORKER_LH')")
                        presentationSet.reset();

                        var presentations = [];
                        var presentation = presentationSet.getMbo(0);

                        while (presentation) {
                            presentations.push(presentation.getString("APP"));
                            presentationSet.remove(0);
                            presentation = presentationSet.getMbo(0);
                        }
                        mafappdataSet = MXServer.getMXServer().getMboSet("MAFAPPDATA", userInfo)
                        mafappdataSet.reset()
                        for (var mafappdata = mafappdataSet.moveFirst(); mafappdata != null; mafappdata = mafappdataSet.moveNext()) {
                            presentations.push(mafappdata.getString("APPID"));
                        }

                        response.status = "success";
                        response.screenNames = presentations;
                        response.screenNamesCount = presentations.length;
                        responseBody = JSON.stringify(response);
                    } catch (error) {
                        logger.error("[SKS.AUTOSCRIPT.SCREENS]", error);
                    } finally {
                        _close(presentationSet);
                        _close(mafappdataSet);
                    }
                } else {
                    response.status = "success";
                    response.presentation = extractScreen(screenName);
                    responseBody = JSON.stringify(response);
                }
                return;
            } else if (httpMethod.toLowerCase() === "post" && typeof requestBody !== "undefined") {
                var screen = new SAXBuilder().build(new StringReader(requestBody));
                var metadata = screen.getRootElement().getChild("metadata");
                var app = screen.getRootElement().getAttributeValue("id");

                if (metadata) {
                    var controlGroups = metadata.getChildren("ctrlgroup");

                    // remove any existing control groups
                    resetControlGroups(screen.getRootElement().getAttributeValue("id"));
                    if (controlGroups) {
                        controlGroups.forEach(function (controlGroupInfo) {
                            createGroupIfNotExists(controlGroupInfo.getChild("group"));
                            createOrUpdateSigOption(controlGroupInfo.getChild("sigoption"));

                            controlConditions = controlGroupInfo.getChildren("ctrlcondition");

                            if (controlConditions) {
                                controlConditions.forEach(function (controlCondition) {
                                    var conditionInfo = controlCondition.getChild("condition");

                                    if (conditionInfo) {
                                        createOrUpdateCondition(conditionInfo);
                                    }
                                });
                            }

                            // add the control groups defined by the application.
                            createControlGroup(controlGroupInfo);
                        });
                    }
                    //Remove the meta data from the XML so the Maximo screen parser doesn't process it.
                    screen.getRootElement().removeChild("metadata");
                }

                var writer = new StringWriter();

                new XMLOutputter(Format.getPrettyFormat()).output(screen, writer);

                // if (typeof PresentationLoader !== "undefined" && typeof WebClientSessionFactory !== "undefined") 
                if (typeof PresentationLoader !== "undefined" && typeof WebClientSessionFactory !== "undefined") {
                    // var loader = new PresentationLoader();
                    // var wcsf = WebClientSessionFactory.getWebClientSessionFactory();
                    // var wcs = wcsf.createSession(request.getHttpServletRequest(), request.getHttpServletResponse());

                    logger.info("[SKS.AUTOSCRIPT.SCREENS]request.getMXSession()=" + request.getMXSession());
                    // var loader = new PresentationLoader();
                    // var wcsf = WebClientSessionFactory.getWebClientSessionFactory();
                    // var wcs = wcsf.createSession(request.getHttpServletRequest(), request.getHttpServletResponse());
                    // loader.importApp(wcs, writer.toString());

                    // logger.info("-------------webclientsession="+service.webclientsession())
                    // //wcs = service.webclientsession()
                    // if (wcs.getMXSession() == null) {
                    //     logger.error("wcs.MXSession is null");
                    //     var session = request.getHttpServletRequest().getSession();
                    //     var mxSession = session.getAttribute("MXSession");
                    //     logger.info("mxSession=" + mxSession);
                    //     if (mxSession == null) {
                    //         mxSession = request.getMXSession();
                    //         if (mxSession == null) {
                    //             mxSession = MXSession.getNewSession();
                    //             logger.info("newSession=" + mxSession);
                    //         }
                    //         session.setAttribute("MXSession", mxSession);
                    //     }
                    //     logger.error("wcs.MXSession is null");
                    // }


                    logger.info("Importing application " + app + " through PresentationLoader.");
                    var importAppScript = new ImportAppScript(writer.toString());
                    importAppScript.importApp(app, true)
                } else {
                    var maxPresentationSet;
                    try {
                        maxPresentationSet = MXServer.getMXServer().getMboSet("MAXPRESENTATION", userInfo);

                        // Query to see if the option has already been assigned to the group.
                        var sqlFormat = new SqlFormat("app = :1 ");
                        sqlFormat.setObject(1, "MAXPRESENTATION", "APP", app);

                        maxPresentationSet.setWhere(sqlFormat.format());
                        maxPresentation = maxPresentationSet.moveFirst();
                        if (maxPresentation) {
                            maxPresentation.setValue("PRESENTATION", writer.toString());
                            maxPresentationSet.save();
                        } else {
                            throw new MXApplicationException("designer", "noapp", Java.to([app.toUpperCase()], "java.lang.String[]"));
                        }
                    } catch (error) {
                        logger.error(error);
                    } finally {
                        _close(maxPresentationSet);
                    }
                }
                response.status = "success";
                responseBody = JSON.stringify(response);
            } else {
                throw new MXApplicationException("only_get_supported", "Only the HTTP GET method is supported when extracting automation scripts.");
            }
        } catch (error) {
            if (error instanceof MXApplicationException) {
                throw error;
            }
            logger.error("----------");
            logger.error(error);
            response.status = "error";
            // ensure the error is logged to the Maximo logs
            Java.type("java.lang.System").out.println(error);
            if (error instanceof ScreenError) {
                response.message = error.message;
                response.reason = error.reason;
            } else if (error instanceof SyntaxError) {
                response.reason = "syntax_error";
                response.message = error.message;
            } else if (error instanceof Error) {
                response.message = error.message;
            } else if (error instanceof MXException) {
                response.reason = error.getErrorGroup() + "_" + error.getErrorKey();
                response.message = error.getMessage();
                throw error;
            } else if (error instanceof RuntimeException) {
                if (error.getCause() instanceof MXException) {
                    response.reason = error.getCause().getErrorGroup() + "_" + error.getCause().getErrorKey();
                    response.message = error.getCause().getMessage();
                    throw error.getCause();
                } else {
                    response.reason = "runtime_exception";
                    response.message = error.getMessage();
                }
            } else if (error instanceof Exception) {
                    response.reason = "exception";
                    response.message = error.getMessage();
            } else {
                response.cause = error;
            }
            // logger.error(error);

            if (response.status == "error") {
                logger.error("----------" + response.message);
                throw new MXApplicationException("", response.message)
            }
            if (typeof httpMethod !== "undefined") {

                try {
                    if(!PresentationLoader){
                        PresentationLoader = Java.type("psdi.webclient.system.controller.PresentationLoader");
                    }

                } catch (error) {
                    response.noPresentationLoader = true
                }

                responseBody = JSON.stringify(response);
            }



            return;
        }
    }
}

function resetControlGroups(app) {
    var ctrlGroupSet;
    try {
        ctrlGroupSet = MXServer.getMXServer().getMboSet("CTRLGROUP", userInfo);

        var sqlf = new SqlFormat("app = :1");

        sqlf.setObject(1, "CTRLGROUP", "APP", app);

        ctrlGroupSet.setWhere(sqlf.format());

        ctrlGroupSet.deleteAll();
        ctrlGroupSet.save();
    } catch (error) {
        logger.error(error);
    } finally {
        _close(ctrlGroupSet);
    }
}

function createControlGroup(ctrlGroupInfo) {
    var ctrlGroupSet;
    try {
        ctrlGroupSet = MXServer.getMXServer().getMboSet("CTRLGROUP", userInfo);

        var ctrlGroup = ctrlGroupSet.add();
        ctrlGroup.setValue("GROUPNAME", ctrlGroupInfo.getAttributeValue("groupname"));
        ctrlGroup.setValue("OPTIONNAME", ctrlGroupInfo.getAttributeValue("optionname"), MboConstants.NOACCESSCHECK);
        ctrlGroup.setValue("APP", ctrlGroupInfo.getAttributeValue("app"), MboConstants.NOACCESSCHECK);

        // This normally relies on being part of a set that is attached to the application.
        // Since we are confident that the values being added are correct, allow no-validation.
        ctrlGroup.setValue("GROUPSEQ", ctrlGroupInfo.getAttributeValue("groupseq"), MboConstants.NOVALIDATION);

        var ctrlConditionSet = ctrlGroup.getMboSet("CTRLCONDITION");
        var controlConditions = ctrlGroupInfo.getChildren("ctrlcondition");
        if (controlConditions) {
            controlConditions.forEach(function (controlConditionInfo) {
                ctrlCondition = ctrlConditionSet.add();
                ctrlCondition.setValue("CONDITIONNUM", controlConditionInfo.getAttributeValue("conditionnum"));
                ctrlCondition.setValue("CONDITIONSEQ", controlConditionInfo.getAttributeValue("conditionseq"));
                ctrlCondition.setValue("REEVALUATE", controlConditionInfo.getAttributeValue("reevaluate"));

                var controlCondProps = controlConditionInfo.getChildren("ctrlcondprop");

                if (controlCondProps) {
                    var ctrlCondPropSet = ctrlCondition.getMboSet("CTRLCONDPROP");
                    controlCondProps.forEach(function (controlCondPropInfo) {
                        var ctrlCondProp = ctrlCondPropSet.add();
                        ctrlCondProp.setValue("CONDITIONRESULT", controlCondPropInfo.getAttributeValue("conditionresult"));
                        ctrlCondProp.setValue("PROPERTY", controlCondPropInfo.getAttributeValue("property"));
                        ctrlCondProp.setValue("PROPERTYVALUE", controlCondPropInfo.getAttributeValue("propertyvalue"));
                    });
                }
            });
        }

        ctrlGroupSet.save();
    } catch (error) {
        logger.error(error);
    } finally {
        _close(ctrlGroupSet);
    }
}

function createOrUpdateCondition(conditionInfo) {
    if (conditionInfo) {
        var conditionSet;
        try {
            conditionSet = MXServer.getMXServer().getMboSet("CONDITION", userInfo);
            var sqlf = new SqlFormat("conditionnum = :1");
            sqlf.setObject(1, "CONDITION", "CONDITIONNUM", conditionInfo.getAttributeValue("conditionnum"));
            conditionSet.setWhere(sqlf.format());

            var condition;

            if (conditionSet.isEmpty()) {
                condition = conditionSet.add();
                condition.setValue("CONDITIONNUM", conditionInfo.getAttributeValue("conditionnum"));
            } else {
                condition = conditionSet.moveFirst();
            }
            condition.setValue("DESCRIPTION", conditionInfo.getAttributeValue("description"));
            condition.setValue("TYPE", conditionInfo.getAttributeValue("type"));
            condition.setValue("EXPRESSION", conditionInfo.getAttributeValue("expression"));
            condition.setValue("CLASSNAME", conditionInfo.getAttributeValue("classname"), MboConstants.NOACCESSCHECK);
            condition.setValue("NOCACHING", conditionInfo.getAttributeValue("nocaching"));

            conditionSet.save();
        } catch (error) {
            logger.error(error);
        } finally {
            _close(conditionSet);
        }
    }
}

function createOrUpdateSigOption(sigOptionInfo) {
    logger.info("[" + scriptName + "]" + "createOrUpdateSigOption")
    if (sigOptionInfo) {
        var sigOptionSet;
        try {
            sigOptionSet = MXServer.getMXServer().getMboSet("SIGOPTION", userInfo);
            var sqlf = new SqlFormat("optionname = :1 and app = :2");
            sqlf.setObject(1, "SIGOPTION", "OPTIONNAME", sigOptionInfo.getAttributeValue("optionname"));
            sqlf.setObject(2, "SIGOPTION", "APP", sigOptionInfo.getAttributeValue("app"));

            var sqlWhere = sqlf.format()
            sigOptionSet.setWhere(sqlWhere);
            sigOptionSet.reset()
            logger.info("[" + scriptName + "]" + " createOrUpdateSigOption.sql=" + sqlWhere)
            var sigOption;
            var sigOptFlag;
            var sigOptFlagSet;
            if (sigOptionSet.isEmpty()) {
                sigOption = sigOptionSet.add();
                sigOption.setValue("APP", sigOptionInfo.getAttributeValue("app"));
                sigOption.setValue("OPTIONNAME", sigOptionInfo.getAttributeValue("optionname"));
                sigOption.setValue("DESCRIPTION", sigOptionInfo.getAttributeValue("description"));
                sigOption.setValue("ESIGENABLED", sigOptionInfo.getAttributeValue("esigenabled"));
                sigOption.setValue("VISIBLE", sigOptionInfo.getAttributeValue("visible"));
                sigOption.setValue("ALSOGRANTS", sigOptionInfo.getAttributeValue("alsogrants"));
                sigOption.setValue("ALSOREVOKES", sigOptionInfo.getAttributeValue("alsorevokes"));
                sigOption.setValue("PREREQUISITE", sigOptionInfo.getAttributeValue("prerequisite"));
                sigOption.setValue("LANGCODE", sigOptionInfo.getAttributeValue("langcode"));

                sigoptFlagInfo = sigOptionInfo.getChild("sigoptflag");
                if (sigoptFlagInfo) {
                    sigOptFlag = sigOption.getMboSet("SIGOPTFLAG").add();
                    sigOptFlag.setValue("APP", sigoptFlagInfo.getAttributeValue("app"));
                    sigOptFlag.setValue("OPTIONNAME", sigoptFlagInfo.getAttributeValue("optionname"));
                    sigOptFlag.setValue("FLAGNAME", sigoptFlagInfo.getAttributeValue("flagname"));
                    sigOptFlag.setValue("VALUE", sigoptFlagInfo.getAttributeValue("value"));
                }
                sigOptionSet.save();
            } else {
                sigOption = sigOptionSet.moveFirst();
                sigOption.setValue("DESCRIPTION", sigOptionInfo.getAttributeValue("description"));
                sigOption.setValue("ESIGENABLED", sigOptionInfo.getAttributeValue("esigenabled"));
                sigOption.setValue("VISIBLE", sigOptionInfo.getAttributeValue("visible"));
                sigOption.setValue("ALSOGRANTS", sigOptionInfo.getAttributeValue("alsogrants"));
                sigOption.setValue("ALSOREVOKES", sigOptionInfo.getAttributeValue("alsorevokes"));
                sigOption.setValue("PREREQUISITE", sigOptionInfo.getAttributeValue("prerequisite"));

                sigoptFlagInfo = sigOptionInfo.getChild("sigoptflag");
                if (sigoptFlagInfo) {
                    sigOptFlagSet = sigOption.getMboSet("SIGOPTFLAG");
                    if (!sigOptFlagSet.isEmpty()) {
                        sigOptFlag = sigOptFlagSet.moveFirst();
                        sigOptFlag.setValue("FLAGNAME", sigoptFlagInfo.getAttributeValue("flagname"));
                        sigOptFlag.setValue("VALUE", sigoptFlagInfo.getAttributeValue("value"));
                    } else {
                        sigOptFlag = sigOption.getMboSet("SIGOPTFLAG").add();
                        sigOptFlag.setValue("APP", sigoptFlagInfo.getAttributeValue("app"));
                        sigOptFlag.setValue("OPTIONNAME", sigoptFlagInfo.getAttributeValue("optionname"));
                        sigOptFlag.setValue("FLAGNAME", sigoptFlagInfo.getAttributeValue("flagname"));
                        sigOptFlag.setValue("VALUE", sigoptFlagInfo.getAttributeValue("value"));
                    }
                } else {
                    sigOptFlagSet = sigOption.getMboSet("SIGOPTFLAG");
                    if (!sigOptFlagSet.isEmpty()) {
                        sigOptFlagSet.deleteAll();
                    }
                }
                sigOptionSet.save();
            }
        } catch (error) {
            logger.error(error);
        } finally {
            _close(sigOptionSet);
        }
    }
}

function createGroupIfNotExists(groupInfo) {
    if (groupInfo) {
        var groupSet;
        try {
            groupSet = MXServer.getMXServer().getMboSet("MAXGROUP", userInfo);
            var sqlf = new SqlFormat("groupname = :1");
            sqlf.setObject(1, "MAXGROUP", "GROUPNAME", groupInfo.getAttributeValue("groupname"));

            groupSet.setWhere(sqlf.format());
            if (groupSet.isEmpty()) {
                var group = groupSet.add();
                group.setValue("GROUPNAME", groupInfo.getAttributeValue("groupname"));
                group.setValue("DESCRIPTION", groupInfo.getAttributeValue("description"));
                group.setValue("PASSWORDDURATION", groupInfo.getAttributeValue("passwordduration"));
                group.setValue("PASSWORDWARNING", groupInfo.getAttributeValue("passwordwarning"));
                group.setValue("INDEPENDENT", groupInfo.getAttributeValue("independent"));
                group.setValue("AUTHALLSITES", groupInfo.getAttributeValue("authallsites"));
                group.setValue("AUTHALLGLS", groupInfo.getAttributeValue("authallgls"));
                group.setValue("AUTHALLSTOREROOMS", groupInfo.getAttributeValue("authallstorerooms"));
                group.setValue("AUTHLABORALL", groupInfo.getAttributeValue("authlaborall"));
                group.setValue("AUTHLABORCREW", groupInfo.getAttributeValue("authlaborcrew"));
                group.setValue("AUTHLABORSELF", groupInfo.getAttributeValue("authlaborself"));
                group.setValue("AUTHLABORSUPER", groupInfo.getAttributeValue("authlaborsuper"));
                group.setValue("LANGCODE", groupInfo.getAttributeValue("langcode"));
                group.setValue(
                    "SCTEMPLATEID",
                    scTemplateExists(groupInfo.getAttributeValue("sctemplateid")) ? groupInfo.getAttributeValue("sctemplateid") : ""
                );
                group.setValue("AUTHPERSONGROUP", groupInfo.getAttributeValue("authpersongroup"));
                group.setValue("NULLREPFAC", groupInfo.getAttributeValue("nullrepfac"));
                group.setValue("AUTHALLREPFACS", groupInfo.getAttributeValue("authallrepfacs"));
                group.setValue("MAXSCHEDREPORT", groupInfo.getAttributeValue("maxschedreport"));
                group.setValue("DFLTAPP", groupInfo.getAttributeValue("dfltapp"));
                group.setValue("ADHOCCREATELIMIT", groupInfo.getAttributeValue("adhoccreatelimit"));
                group.setValue("REPORTSTOPLIMIT", groupInfo.getAttributeValue("reportstoplimit"));
                group.setValue("SIDENAV", groupInfo.getAttributeValue("sidenav"));
                group.setValue("WORKCENTER", groupInfo.getAttributeValue("workcenter"));

                groupSet.save();
            }
        } catch (error) {
            logger.error(error);
        } finally {
            _close(groupSet);
        }
    }
}

function scTemplateExists(templateId) {
    if (templateId && templateId != "") {
        var sctemplateSet;
        try {
            sctemplateSet = MXServer.getMXServer().getMboSet("SCTEMPLATE", userInfo);
            var sqlf = new SqlFormat("groupname = :1");
            sqlf.setObject(1, "SCTEMPLATE", "SCTEMPLATEID", templateId);
            sctemplateSet.setWhere(sqlf.format());

            return !sctemplateSet.exists();
        } catch (error) {
            logger.error(error);
        } finally {
            _close(sctemplateSet);
        }
    }
}

function extractScreen(screenName) {
    var maxpresentationSet;
    try {
        maxpresentationSet = MXServer.getMXServer().getMboSet("MAXPRESENTATION", userInfo);
        var sqlf = new SqlFormat("app = :1");
        sqlf.setObject(1, "MAXPRESENTATION", "APP", screenName);

        maxpresentationSet.setWhere(sqlf.format());

        if (!maxpresentationSet.isEmpty()) {
            var maxpresentation = maxpresentationSet.moveFirst();
            var xml = maxpresentation.getString("PRESENTATION");
            logger.info("\x1b[33m[SKS.AUTOSCRIPT.SCREENS] ignoreMetadata=" + ignoreMetadata + " \x1b[0m")
            xml = formatXMLByLangCode(xml)
            //不能转换,转换之后导入就有问题了
            // xml = xml.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
            if (ignoreMetadata) {
                // 如果请求ignoreMetadata=true，则直接返回原始XML，不添加metadata（控制组/权限组等附加信息）
                logger.info("[SKS.AUTOSCRIPT.SCREENS] extractScreen: ignoreMetadata=true, 直接返回原始XML");
                return xml;
            }
            return addConditionalExpressionsMetaData(xml, screenName);
        } else {
            throw new ScreenError("screen_not_found", "The screen definition for " + screenName + " was not found.");
        }
    } catch (error) {
    } finally {
        _close(maxpresentationSet);
    }
}

/**
 * 根据用户语言代码替换label等多语言信息
 * 模拟 Maximo 导出应用XML的逻辑(SystemEventHandler.exportxml):
 * 1. MAXPRESENTATION 本身不区分 langcode(无 LANGCODE 列), 取到的是基础语言的 XML 骨架
 * 2. 语言差异来自 MAXLABELS: 打开 MboSet 时设置 PROCESSML 标志(32),
 *    框架会按 userInfo 的 langcode 自动合并翻译表 L_MAXLABELS(OWNERID/LANGCODE/VALUE) 中的译文
 * 3. 遍历 XML, 元素有 id 属性时, 凡属性名(id|property)命中 label 缓存的, 用当前语言的译文替换属性值
 *    (对应 SystemEventHandler.writeFormattedXML 中 LabelCache.makeUniqueKey 的替换逻辑)
 * @param {string} xml - MAXPRESENTATION 中导出的原始应用 XML
 * @returns {string} 替换当前 langcode 标签后的 XML
 */
function formatXMLByLangCode(xml) {
    if (!xml) {
        return xml;
    }
    var langCode = userInfo.getLangCode();
    if (!langCode) {
        logger.warn("[SKS.AUTOSCRIPT.SCREENS] formatXMLByLangCode: langcode为空, 返回原始XML");
        return xml;
    }

    // 解析XML, 失败则原样返回
    var screen;
    try {
        screen = new SAXBuilder().build(new StringReader(xml));
    } catch (e) {
        logger.error("[SKS.AUTOSCRIPT.SCREENS] formatXMLByLangCode: 解析XML失败, 返回原始XML", e);
        return xml;
    }

    var root = screen.getRootElement();
    var appID = root.getAttributeValue("id");
    if (!appID) {
        logger.warn("[SKS.AUTOSCRIPT.SCREENS] formatXMLByLangCode: 根元素无id属性, 返回原始XML");
        return xml;
    }
    appID = appID.toUpperCase();

    // 加载该应用在当前用户langcode下的标签, key = id|property (同LabelCache.makeUniqueKey)
    var labelMap = {};
    var labelSet;
    try {
        labelSet = MXServer.getMXServer().getMboSet("MAXLABELS", userInfo);
        labelSet.setLogLargFetchResultDisabled(true);
        labelSet.setFlag(32, true); // PROCESSML: 按userInfo的langcode自动合并L_MAXLABELS译文
        labelSet.resetQbe();
        labelSet.setQbeExactMatch(true);
        labelSet.setQbe("app", appID);
        labelSet.reset();

        var label = labelSet.moveFirst();
        while (label) {
            var labelId = label.getString("id");
            var labelProperty = label.getString("property");
            var labelValue = label.getString("value");
            if (labelId && labelProperty && labelValue !== null) {
                labelMap[labelId + "|" + labelProperty.toLowerCase()] = labelValue;
            }
            label = labelSet.moveNext();
        }
    } catch (e) {
        logger.error("[SKS.AUTOSCRIPT.SCREENS] formatXMLByLangCode: 加载MAXLABELS失败, 返回原始XML", e);
        return xml;
    } finally {
        _close(labelSet);
    }

    var labelCount = 0;
    for (var key in labelMap) {
        labelCount++;
    }
    if (labelCount === 0) {
        logger.info("[SKS.AUTOSCRIPT.SCREENS] formatXMLByLangCode: langcode=" + langCode + ", app=" + appID + " 无label记录, 返回原始XML");
        return xml;
    }

    // 递归替换元素属性值(对应writeFormattedXML: 按元素id+属性名查缓存, 命中则替换)
    replaceLabelsInElement(root, labelMap);

    var writer = new StringWriter();
    new XMLOutputter(Format.getPrettyFormat()).output(screen, writer);
    logger.info("[SKS.AUTOSCRIPT.SCREENS] formatXMLByLangCode: langcode=" + langCode + ", app=" + appID + ", 加载label " + labelCount + " 条");
    return writer.toString();
}

/**
 * 递归遍历元素: 元素有id属性时, 逐个属性按 id|属性名 在labelMap中查找译文并替换
 * @param {org.jdom2.Element} element
 * @param {Object} labelMap - key: id|property, value: 当前langcode的译文
 */
function replaceLabelsInElement(element, labelMap) {
    var id = element.getAttributeValue("id");
    if (id) {
        var attrs = element.getAttributes();
        for (var i = 0; i < attrs.size(); i++) {
            var attr = attrs.get(i);
            var mapKey = id + "|" + attr.getName().toLowerCase();
            if (labelMap[mapKey] !== undefined) {
                attr.setValue(labelMap[mapKey]);
            }
        }
    }

    var children = element.getChildren();
    for (var c = 0; c < children.size(); c++) {
        replaceLabelsInElement(children.get(c), labelMap);
    }
}

// ==================== 应用信息导入导出(新方式) ====================
// 对象处理脚本统一放在 cn/shoukaiseki/tools/migrate 目录, 命名 SKS_MIGRATE_<对象名>
// 每个脚本对外提供 getScriptSigoption/getDetail/exportApp/importApp/changeMbo/_close
// objectName: MboSet 读取时使用的 Maximo 对象
// filterField: 按应用过滤的字段(导出 where 条件)
// appField: 导出 JSON 中需要删除的应用字段(null 表示保留, 如 MAXAPPS.APP)
var MIGRATE_OBJECTS = [
    // 主对象: 导出保留 APP, 导入时由 body.app 覆盖(支持复制到其它应用)
    { key: "maxapps", script: "SKS_MIGRATE_MAXAPPS", objectName: "MAXAPPS", filterField: "APP", appField: null, single: true },
    // 应用 XML: 每个应用最多一条, 也可能没有; 默认不返回 PRESENTATION 大字段
    { key: "presentation", script: "SKS_MIGRATE_MAXPRESENTATION", objectName: "MAXPRESENTATION", filterField: "APP", appField: "APP", single: true },
    // MAF 应用包: 每个应用最多一条, 也可能没有; 默认不返回 zip 字节码(用 _action=exportAppZip 下载)
    { key: "mafappdata", script: "SKS_MIGRATE_MAFAPPDATA", objectName: "MAFAPPDATA", filterField: "APPID", appField: "APPID", single: true },
    { key: "sigoptions", script: "SKS_MIGRATE_SIGOPTION", objectName: "SIGOPTION", filterField: "APP", appField: "APP" },
    { key: "maxlabels", script: "SKS_MIGRATE_MAXLABELS", objectName: "MAXLABELS", filterField: "APP", appField: "APP" },
    { key: "menus", script: "SKS_MIGRATE_MAXMENU", objectName: "MAXMENU", filterField: "MODULEAPP", appField: "MODULEAPP" },
    { key: "appdoctype", script: "SKS_MIGRATE_APPDOCTYPE", objectName: "APPDOCTYPE", filterField: "APP", appField: "APP" }
];
// APPLICATIONAUTH(应用授权)不纳入应用信息, 后续由安全组导出功能单独处理

/**
 * 查询语言代码: 优先 MXServer.getLanguageList(), 失败时回退 LANGUAGE 表 ENABLED=1
 * @returns {Array<string>} 大写语言代码, 如 ["EN","ZH"]
 */
function getEnabledLangcodes() {
    var list = [];
    // 与导入 setMLValue 一致: 优先使用 MXServer.getLanguageList() ([0]=语言代码, [1]=语言名)
    try {
        var langs = MXServer.getMXServer().getLanguageList();
        for (var i = 0; i < langs.length; i++) {
            var code = langs[i][0] ? String(langs[i][0]).toUpperCase() : "";
            if (code) {
                list.push(code);
            }
        }
    } catch (e) {
        logger.warn("[SKS.AUTOSCRIPT.SCREENS] getLanguageList 失败, 回退 LANGUAGE 表", e);
    }
    if (list.length > 0) {
        return list;
    }
    var langSet = null;
    try {
        langSet = MXServer.getMXServer().getMboSet("LANGUAGE", userInfo);
        langSet.setWhere("ENABLED = 1");
        langSet.reset();
        for (var j = 0; j < langSet.count(); j++) {
            var langMbo = langSet.getMbo(j);
            if (!langMbo) {
                continue;
            }
            var langCode = langMbo.getString("MAXLANGCODE");
            if (langCode) {
                list.push(String(langCode).toUpperCase());
            }
        }
    } catch (e) {
        logger.warn("[SKS.AUTOSCRIPT.SCREENS] 查询启用语言失败", e);
    } finally {
        _close(langSet);
    }
    return list;
}

/**
 * 构造迁移配置对象(jscustom.SksMigrateParamConfig)
 * @param {string} apiAction export/imp/add
 * @param {string} [app] 当前处理的应用
 * @returns {Object}
 */
function buildMigrateConfig(apiAction, app) {
    var langcode = null;
    try { langcode = userInfo.getLangCode(); } catch (ignored) { }
    return {
        service: service,
        _userInfo: userInfo,
        _langcode: langcode,
        _apiAction: apiAction,
        _apiMode: "migrate",
        _apiType: request.getQueryParam("_apiType") || "",
        _app: app || null,
        _deferredCloseSets: [],
        _allLangcode: request.getQueryParam("_allLangcode") === "true",
        _langcodeList: getEnabledLangcodes(),
        _errorAssert: request.getQueryParam("_errorAssert") === "true",
        dmDeploySet: request.getQueryParam("dmDeploySet") === "true"
    };
}

/**
 * 生成随机 uuid(导出时写入每行 sks:uuid, 便于导入结果与导出行对应排查)
 * @returns {string}
 */
function createUuid() {
    try {
        return String(Java.type("java.util.UUID").randomUUID());
    } catch (ignored) {
        return "";
    }
}

/**
 * 统计当前层级(不含嵌套子数组)的成功/失败数量
 * @param {Array|Object} list
 * @returns {{success:number, fail:number}}
 */
function countImportLevel(list) {
    var stat = { success: 0, fail: 0 };
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
        }
    }
    return stat;
}

/**
 * 递归统计成功/失败数量(含行内嵌套数组, 如 sigoptions 的 flags)
 * @param {Array|Object} list
 * @returns {{success:number, fail:number}}
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
        }
    }
    return stat;
}

/**
 * 给某个对象导入结果追加统计字段(每行写入, JSON 数组无法挂属性)
 * sks:successTotal/sks:failTotal: 当前对象本层级成功/失败总数
 * sks:successSumTotal/sks:failSumTotal: 含嵌套子级(递归)的成功/失败总数
 * @param {Array|Object} list
 * @returns {{success:number, fail:number, successSum:number, failSum:number}}
 */
function stampImportStats(list) {
    var own = countImportLevel(list);
    var all = countImportRecursive(list);
    if (!list) {
        return { success: own.success, fail: own.fail, successSum: all.success, failSum: all.fail };
    }
    var rows = Array.isArray(list) ? list : [list];
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (!row) {
            continue;
        }
        row["sks:successTotal"] = own.success;
        row["sks:failTotal"] = own.fail;
        row["sks:successSumTotal"] = all.success;
        row["sks:failSumTotal"] = all.fail;
    }
    return { success: own.success, fail: own.fail, successSum: all.success, failSum: all.fail };
}

/**
 * 调用迁移脚本方法
 * @param {string} scriptName
 * @param {string} method
 * @param {Object} config
 * @param {Object} arg1
 * @param {Object} arg2
 */
function invokeMigrate(scriptName, method, config, arg1, arg2) {
    var sm = service.invokeScript(scriptName);
    if (!sm || typeof sm[method] !== "function") {
        throw new ScreenError("migrate_script_missing", scriptName + " 未实现方法 " + method);
    }
    return sm[method](config, arg1, arg2);
}

/**
 * 关闭延迟关闭的 MboSet
 * @param {Object} config
 */
function closeDeferredSets(config) {
    var sets = config._deferredCloseSets || [];
    for (var i = 0; i < sets.length; i++) {
        _close(sets[i]);
    }
    config._deferredCloseSets = [];
}

/**
 * 解析导出参数
 * _include: 逗号分隔, 可选 presentation(含 XML 文本) / zip(含 zipBase64, 仅适合小包)
 * 默认两者都不含: 只返回两张表的元信息(MAXPRESENTATION 无 PRESENTATION, MAFAPPDATA 无 APP 字节码)
 */
function resolveExportOpts() {
    var include = String(request.getQueryParam("_include") || "").toLowerCase();
    var opts = {
        includePresentation: include.indexOf("presentation") >= 0,
        includeZip: include.indexOf("zip") >= 0
    };
    opts._include = include;
    return opts;
}

/**
 * 使用 MboSet 读取对象数据, 每行调用 SKS_MIGRATE_<对象>.getDetail 转 JSON
 * getDetail 内部会处理字段值与多语言(config._allLangcode=true 时输出 sks:langdata)
 * @param {Object} obj MIGRATE_OBJECTS 中的对象定义
 * @param {Object} config 迁移配置
 * @param {string} app 应用名
 * @returns {Array<Object>}
 */
function loadObjectRows(obj, config, app) {
    var rows = [];
    var set = null;
    try {
        set = MXServer.getMXServer().getMboSet(obj.objectName, userInfo);
        if (config.dmDeploySet === true) {
            try { set.setDMDeploySet(true); } catch (ignored) { }
        }
        if (obj.filterField) {
            var sqlf = new SqlFormat(obj.filterField.toLowerCase() + " = :1");
            sqlf.setObject(1, obj.objectName, obj.filterField, app);
            set.setWhere(sqlf.format());
        }
        set.reset();
        var total = set.count();
        for (var i = 0; i < total; i++) {
            var mbo = set.getMbo(i);
            if (!mbo) {
                continue;
            }
            var row = invokeMigrate(obj.script, "getDetail", config, mbo);
            // 每个导出行写入随机 uuid, 导入结果会带回该值, 便于排查
            row["sks:uuid"] = createUuid();
            rows.push(row);
        }
    } finally {
        _close(set);
    }
    return rows;
}

/**
 * 导出应用信息: 以 MAXAPPS 为主对象, 子表(签名/标签/菜单/文档类型)删除 APP 字段
 * 附带 MAXPRESENTATION / MAFAPPDATA 的元信息(默认不含 XML 文本与 zip 字节码)
 * 参数: app 必填; _include=presentation,zip 可选; _allLangcode=true 导出所有启用的语言
 */
function exportAppInfo() {
    var app = request.getQueryParam("app");
    if (!app || String(app).trim() === "") {
        throw new ScreenError("missing_app", "缺少app参数");
    }
    app = String(app).trim().toUpperCase();
    var opts = resolveExportOpts();
    var config = buildMigrateConfig("export", app);
    config._include = opts._include;
    config._includePresentation = opts.includePresentation;
    config._includeZip = opts.includeZip;
    var data = {
        app: app,
        _langcode: config._langcode,
        _allLangcode: config._allLangcode,
        _include: opts._include === "" ? null : opts._include,
        status: "success"
    };
    try {
        for (var i = 0; i < MIGRATE_OBJECTS.length; i++) {
            var obj = MIGRATE_OBJECTS[i];
            var rows = loadObjectRows(obj, config, app);
            if (obj.appField) {
                for (var j = 0; j < rows.length; j++) {
                    if (rows[j]) {
                        delete rows[j][obj.appField];
                    }
                }
            }
            data[obj.key] = obj.single ? (rows.length > 0 ? rows[0] : null) : rows;
        }
    } finally {
        closeDeferredSets(config);
    }
    logger.info("[SKS.AUTOSCRIPT.SCREENS] exportAppInfo 完成: app=" + app + " include=" + opts._include + " allLangcode=" + config._allLangcode);
    return data;
}

/**
 * 导出应用 zip(MAFAPPDATA.APP 字节码)
 * 默认: responseBody = byte[], 通过 responseHeaders 设置 application/octet-stream
 * _format=base64: 返回 JSON { fileName, size, zipBase64 }
 */
function exportAppZip() {
    var app = request.getQueryParam("app");
    if (!app || String(app).trim() === "") {
        throw new ScreenError("missing_app", "缺少app参数");
    }
    app = String(app).trim().toUpperCase();
    var config = buildMigrateConfig("export", app);
    var zip = invokeMigrate("SKS_MIGRATE_MAFAPPDATA", "exportZip", config, app);
    if (!zip || !zip.bytes) {
        throw new ScreenError("zip_not_found", "应用 " + app + " 没有 MAFAPPDATA zip 数据");
    }
    var format = String(request.getQueryParam("_format") || "").toLowerCase();
    if (format === "base64") {
        var Base64 = Java.type("java.util.Base64");
        return {
            status: "success",
            app: app,
            fileName: zip.fileName,
            size: zip.size,
            zipBase64: Base64.getEncoder().encodeToString(zip.bytes)
        };
    }
    try {
        responseHeaders.put("content-type", "application/octet-stream");
        responseHeaders.put("content-disposition", "attachment; filename=" + zip.fileName);
    } catch (ignored) { }
    responseBody = zip.bytes;
    logger.info("[SKS.AUTOSCRIPT.SCREENS] exportAppZip 完成: app=" + app + " size=" + zip.size);
    return null;
}

/**
 * 导入应用信息: 请求体为 exportAppInfo 的 JSON(可只包含部分对象)
 * 子表 APP / menus 的 MODULEAPP / mafappdata 的 APPID 统一由 body.app 注入, 便于复制到其它应用
 */
function importAppInfo() {
    var body = JSON.parse(requestBody);
    if (!body) {
        throw new ScreenError("empty_body", "请求体为空");
    }
    var app = body.app ? String(body.app).trim().toUpperCase() : null;
    if (!app) {
        throw new ScreenError("missing_app", "缺少app参数");
    }
    var config = buildMigrateConfig("imp", app);
    var result = { app: app, _apiAction: "imp", status: "success", data: {} };
    var totalSuccess = 0;
    var totalFail = 0;
    try {
        for (var i = 0; i < MIGRATE_OBJECTS.length; i++) {
            var obj = MIGRATE_OBJECTS[i];
            var rows = body[obj.key];
            if (!rows) {
                continue;
            }
            if (!Array.isArray(rows)) {
                rows = [rows];
            }
            for (var j = 0; j < rows.length; j++) {
                if (!rows[j]) {
                    continue;
                }
                if (obj.key === "maxapps") {
                    rows[j].APP = app;
                } else if (obj.appField) {
                    rows[j][obj.appField] = app;
                }
            }
            var outRows = invokeMigrate(obj.script, "importApp", config, rows, app);
            // 当前对象成功/失败总数 + 递归(含 flags 等子级)总数, 写入每行
            var stat = stampImportStats(outRows);
            totalSuccess += stat.successSum;
            totalFail += stat.failSum;
            result.data[obj.key] = outRows;
        }
    } finally {
        closeDeferredSets(config);
    }
    result["sks:successSumTotal"] = totalSuccess;
    result["sks:failSumTotal"] = totalFail;
    logger.info("[SKS.AUTOSCRIPT.SCREENS] importAppInfo 完成: app=" + app);
    return result;
}

function addConditionalExpressionsMetaData(xml, screenName) {
    var screen = new SAXBuilder().build(new StringReader(xml));

    var controlGroupSet;

    try {
        controlGroupSet = MXServer.getMXServer().getMboSet("CTRLGROUP", userInfo);
        var sqlf = new SqlFormat("app = :1");
        sqlf.setObject(1, "CTRLGROUP", "APP", screenName);

        controlGroupSet.setWhere(sqlf.format());

        if (!controlGroupSet.isEmpty()) {
            controlGroup = controlGroupSet.moveFirst();
            var presentation = screen.getRootElement();
            var metadata = new Element("metadata");
            while (controlGroup) {
                metadata.addContent(getControlGroup(controlGroup));
                controlGroup = controlGroupSet.moveNext();
            }
            presentation.addContent(0, metadata);
            var writer = new StringWriter();
            var outputter = new XMLOutputter(Format.getPrettyFormat());
            outputter.output(screen, writer);

            return writer.toString();
        } else {
            return xml;
        }
    } catch (error) {
        logger.error(error);
    } finally {
        _close(controlGroupSet);
    }
}

function getControlGroup(controlGroup) {
    var ctrlgroup = new Element("ctrlgroup");
    ctrlgroup.setAttribute("groupname", controlGroup.getString("GROUPNAME"));
    ctrlgroup.setAttribute("optionname", controlGroup.getString("OPTIONNAME"));
    ctrlgroup.setAttribute("app", controlGroup.getString("APP"));
    ctrlgroup.setAttribute("groupseq", controlGroup.getString("GROUPSEQ"));

    var sigoption = new Element("sigoption");
    sigoption.setAttribute("optionname", controlGroup.getString("SIGOPTION.OPTIONNAME"));
    sigoption.setAttribute("app", controlGroup.getString("SIGOPTION.APP"));
    sigoption.setAttribute("description", controlGroup.getString("SIGOPTION.DESCRIPTION"));
    sigoption.setAttribute("esigenabled", controlGroup.getString("SIGOPTION.ESIGENABLED"));
    sigoption.setAttribute("visible", controlGroup.getString("SIGOPTION.VISIBLE"));
    sigoption.setAttribute("alsogrants", controlGroup.getString("SIGOPTION.ALSOGRANTS"));
    sigoption.setAttribute("alsorevokes", controlGroup.getString("SIGOPTION.ALSOREVOKES"));
    sigoption.setAttribute("prerequisite", controlGroup.getString("SIGOPTION.PREREQUISITE"));
    sigoption.setAttribute("langcode", controlGroup.getString("SIGOPTION.LANGCODE"));

    if (!controlGroup.isNull("SIGOPTION.SIGOPTFLAG.OPTIONNAME")) {
        var sigoptFlag = new Element("sigoptflag");
        sigoptFlag.setAttribute("optionname", controlGroup.getString("SIGOPTION.SIGOPTFLAG.OPTIONNAME"));
        sigoptFlag.setAttribute("app", controlGroup.getString("SIGOPTION.SIGOPTFLAG.APP"));
        sigoptFlag.setAttribute("flagname", controlGroup.getString("SIGOPTION.SIGOPTFLAG.FLAGNAME"));
        sigoptFlag.setAttribute("value", controlGroup.getString("SIGOPTION.SIGOPTFLAG.VALUE"));

        sigoption.addContent(sigoptFlag);
    }
    ctrlgroup.addContent(sigoption);

    var group = new Element("group");
    group.setAttribute("groupname", controlGroup.getString("MAXGROUP.GROUPNAME"));
    group.setAttribute("description", controlGroup.getString("MAXGROUP.DESCRIPTION"));
    group.setAttribute("passwordduration", controlGroup.getString("MAXGROUP.PASSWORDDURATION"));
    group.setAttribute("passwordwarning", controlGroup.getString("MAXGROUP.PASSWORDWARNING"));
    group.setAttribute("independent", controlGroup.getString("MAXGROUP.INDEPENDENT"));
    group.setAttribute("authallsites", controlGroup.getString("MAXGROUP.AUTHALLSITES"));
    group.setAttribute("authallgls", controlGroup.getString("MAXGROUP.AUTHALLGLS"));
    group.setAttribute("authallstorerooms", controlGroup.getString("MAXGROUP.AUTHALLSTOREROOMS"));
    group.setAttribute("authlaborall", controlGroup.getString("MAXGROUP.AUTHLABORALL"));
    group.setAttribute("authlaborcrew", controlGroup.getString("MAXGROUP.AUTHLABORCREW"));
    group.setAttribute("authlaborself", controlGroup.getString("MAXGROUP.AUTHLABORSELF"));
    group.setAttribute("authlaborsuper", controlGroup.getString("MAXGROUP.AUTHLABORSUPER"));
    group.setAttribute("langcode", controlGroup.getString("MAXGROUP.LANGCODE"));
    group.setAttribute("sctemplateid", controlGroup.getString("MAXGROUP.SCTEMPLATEID"));
    group.setAttribute("authpersongroup", controlGroup.getString("MAXGROUP.AUTHPERSONGROUP"));
    group.setAttribute("nullrepfac", controlGroup.getString("MAXGROUP.NULLREPFAC"));
    group.setAttribute("authallrepfacs", controlGroup.getString("MAXGROUP.AUTHALLREPFACS"));
    group.setAttribute("maxschedreport", controlGroup.getString("MAXGROUP.MAXSCHEDREPORT"));
    group.setAttribute("dfltapp", controlGroup.getString("MAXGROUP.DFLTAPP"));
    group.setAttribute("adhoccreatelimit", controlGroup.getString("MAXGROUP.ADHOCCREATELIMIT"));
    group.setAttribute("reportstoplimit", controlGroup.getString("MAXGROUP.REPORTSTOPLIMIT"));
    group.setAttribute("sidenav", controlGroup.getString("MAXGROUP.SIDENAV"));
    group.setAttribute("workcenter", controlGroup.getString("MAXGROUP.WORKCENTER"));

    ctrlgroup.addContent(group);

    controlConditionSet = controlGroup.getMboSet("CTRLCONDITION");
    if (!controlConditionSet.isEmpty()) {
        controlCondition = controlConditionSet.moveFirst();

        while (controlCondition) {
            var ctrlcondition = new Element("ctrlcondition");
            ctrlcondition.setAttribute("conditionnum", controlCondition.getString("CONDITIONNUM"));
            ctrlcondition.setAttribute("conditionseq", controlCondition.getString("CONDITIONSEQ"));
            ctrlcondition.setAttribute("reevaluate", controlCondition.getString("REEVALUATE"));

            var condition = new Element("condition");
            condition.setAttribute("conditionnum", controlCondition.getString("CONDITIONNUM"));
            condition.setAttribute("type", controlCondition.getString("CONDITION.TYPE"));
            condition.setAttribute("expression", controlCondition.getString("CONDITION.EXPRESSION"));
            condition.setAttribute("classname", controlCondition.getString("CONDITION.CLASSNAME"));
            condition.setAttribute("description", controlCondition.getString("CONDITION.DESCRIPTION"));
            condition.setAttribute("nocaching", controlCondition.getString("CONDITION.NOCACHING"));

            ctrlcondition.addContent(condition);

            controlCondPropSet = controlCondition.getMboSet("CTRLCONDPROP");
            if (!controlCondPropSet.isEmpty()) {
                var controlCondProp = controlCondPropSet.moveFirst();

                while (controlCondProp) {
                    var ctrlcondprop = new Element("ctrlcondprop");
                    ctrlcondprop.setAttribute("property", controlCondProp.getString("PROPERTY"));
                    ctrlcondprop.setAttribute("propertyvalue", controlCondProp.getString("PROPERTYVALUE"));
                    ctrlcondprop.setAttribute("conditionresult", controlCondProp.getString("CONDITIONRESULT"));

                    ctrlcondition.addContent(ctrlcondprop);

                    controlCondProp = controlCondPropSet.moveNext();
                }
            }
            ctrlgroup.addContent(ctrlcondition);
            controlCondition = controlConditionSet.moveNext();
        }
    }

    return ctrlgroup;
}

function getRequestScreentName() {
    var httpRequest = request.getHttpServletRequest();

    var requestURI = httpRequest.getRequestURI();
    var contextPath = httpRequest.getContextPath();
    var resourceReq = requestURI;

    if (contextPath && contextPath !== "") {
        resourceReq = requestURI.substring(contextPath.length());
    }

    if (!resourceReq.startsWith("/")) {
        resourceReq = "/" + resourceReq;
    }

    var isOSLC = true;

    if (!resourceReq.toLowerCase().startsWith("/oslc/script/" + service.scriptName.toLowerCase())) {
        if (!resourceReq.toLowerCase().startsWith("/api/script/" + service.scriptName.toLowerCase())) {
            return null;
        } else {
            osOSLC = false;
        }
    }

    var baseReqPath = isOSLC ? "/oslc/script/" + service.scriptName : "/api/script/" + service.scriptName;

    var action = resourceReq.substring(baseReqPath.length);

    if (action.startsWith("/")) {
        action = action.substring(1);
    }

    if (!action || action.trim() === "") {
        return null;
    }

    return URLDecoder.decode(action.toLowerCase(), StandardCharsets.UTF_8.name());
}

function checkPermissions(app, optionName) {
    if (!userInfo) {
        throw new ScreenError("no_user_info", "The userInfo global variable has not been set, therefore the user permissions cannot be verified.");
    }

    if (!MXServer.getMXServer().lookup("SECURITY").getProfile(userInfo).hasAppOption(app, optionName) && !isInAdminGroup()) {
        throw new ScreenError(
            "no_permission",
            "The user " + userInfo.getUserName() + " does not have access to the " + optionName + " option in the " + app + " object structure."
        );
    }
}

// Determines if the current user is in the administrator group, returns true if the user is, false otherwise.
function isInAdminGroup() {
    var user = userInfo.getUserName();
    service.log_info("Determining if the user " + user + " is in the administrator group.");
    var groupUserSet;

    try {
        groupUserSet = MXServer.getMXServer().getMboSet("GROUPUSER", MXServer.getMXServer().getSystemUserInfo());

        // Get the ADMINGROUP MAXVAR value.
        var adminGroup = MXServer.getMXServer().lookup("MAXVARS").getString("ADMINGROUP", null);

        // Query for the current user and the found admin group.
        // The current user is determined by the implicity `user` variable.
        sqlFormat = new SqlFormat("userid = :1 and groupname = :2");
        sqlFormat.setObject(1, "GROUPUSER", "USERID", user);
        sqlFormat.setObject(2, "GROUPUSER", "GROUPNAME", adminGroup);
        groupUserSet.setWhere(sqlFormat.format());

        if (!groupUserSet.isEmpty()) {
            service.log_info("The user " + user + " is in the administrator group " + adminGroup + ".");
            return true;
        } else {
            service.log_info("The user " + user + " is not in the administrator group " + adminGroup + ".");
            return false;
        }
    } catch (error) {
        logger.error(error);
    } finally {
        _close(groupUserSet);
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

function ScreenError(reason, message) {
    Error.call(this, message);
    this.reason = reason;
    this.message = message;
}


// ConfigurationError derives from Error
ScreenError.prototype = Object.create(Error.prototype);
ScreenError.prototype.constructor = ScreenError;
ScreenError.prototype.element;

// eslint-disable-next-line no-unused-vars
var scriptConfig = {
    autoscript: "SKS.AUTOSCRIPT.SCREENS",
    description: "Extract screen definitions.",
    version: "1.0.0",
    active: true,
    logLevel: "ERROR"
};

// 脚本入口: 放在文件末尾, 确保 main() 执行前所有顶层变量(MIGRATE_OBJECTS、ScreenError 原型等)已完成初始化
main();