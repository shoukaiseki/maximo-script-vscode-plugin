/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
scriptName=service.getScriptName()
/** @type {psdi.server.MXServer} */
MXServer= Java.type("psdi.server.MXServer")
/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
var sksLogAnsiUtils=service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("[" + scriptName + "]----------1");
/** @type {jscustom.AnsiLogger} */
var logger =sksLogAnsiUtils.newAnsiLogger({logger:loggerMX, ansiOpen:true})
logger.setLevel(Level.INFO);
logger.info("[" + scriptName + "]----------------Starting execution of script " + service.getScriptName());
logger.info("["+ scriptName + "]-------------webclientsession=" + service.webclientsession())

RESTRequest = Java.type("com.ibm.tivoli.oslc.RESTRequest");

if(request.getQueryParam("_langcode")!=='undefined'&&request.getQueryParam("_langcode")){
    var _langcode = request.getQueryParam("_langcode");
    // uInfo.setLocale(lang);
    userInfo.setLangCode(_langcode.toLowerCase())
    if(userInfo.getLocale()){
        logger.error("\x1b[35;40m["+ scriptName + "]------------------没有错误,只为一直显示_langcode=" + userInfo.getLangCode() + ",locale.language=" + userInfo.getLocale().getLanguage() + ",country=" + userInfo.getLocale().getCountry() + "\x1b[0m");
    }
}
var msr=null
try{
    var mxserver = MXServer.getMXServer();
    var msr = mxserver.getMboSet("MAXOBJECT", userInfo);
    msr.reset()
    var tmpMbo;
    resp = [];
    if (!msr.isEmpty()) {
        var rownum=1;
        for (tmpMbo = msr.moveFirst();tmpMbo;tmpMbo = msr.moveNext()) {
            resp.push({
                "_rownum": rownum++,
                "objectName": tmpMbo.getString("OBJECTNAME"),
                "description": tmpMbo.getString("DESCRIPTION")
            });
            // "scriptLanguage": tmpMbo.getString("SCRIPTLANGUAGE"),
            //     "logLevel": tmpMbo.getString("LOGLEVEL"),
            //     "source": tmpMbo.getString("SOURCE"),
            
        }

    }
}catch(e){
    logger.error("[" + scriptName + "]------------------error:" + e);
}finally{
    _close(msr);
}

responseBody = JSON.stringify(resp);


function _close(set) {
    if (set) {
        try {
            set.cleanup();
            set.close();
        } catch (ignore) { }
    }
}