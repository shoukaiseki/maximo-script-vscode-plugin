// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load('nashorn:mozilla_compat.js');
var scriptName=service.getScriptName()
/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
var sksLogAnsiUtils=service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("["+scriptName+"]----------1");
/** @type {jscustom.AnsiLogger} */
var logger =sksLogAnsiUtils.newAnsiLogger({logger:loggerMX, ansiOpen:true})
// logger.setLevel(Level.INFO);
logger.info("["+scriptName+"]----------------Starting execution of script " + service.getScriptName());
logger.info("["+scriptName+"]-------------webclientsession=" + service.webclientsession())

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

/** @type {psdi.mbo.MboValueInfoStatic} */
MboValueInfoStatic = Java.type("psdi.mbo.MboValueInfoStatic")
//还有一个字段名相同的变量, 值是通过 ScriptUtil.getValueFromMaxType(this.getMboValue().getMaxType()) 获取
//当前字段名是 ORDERUNIT ,变量名就是orderunit,maximo中已转为小写

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");

/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");//19


/** @type {com.ibm.json.java.JSONObject} */
var resultData= new JSONObject()
resultData.put("status", "success");
resultData.put("message", "");

main()

function main(){
    var message=""
    /** @type {com.ibm.json.java.JSONObject} */
    var data=new JSONObject()
    var clientsession = service.webclientsession();
    if(clientsession){
        message="clientsession is not null"
        logger.info("["+scriptName+"]----------clientsession is not null")
    }else{
        message="clientsession is null"
        logger.info("["+scriptName+"]----------clientsession is null")
    }

    var objectName="ITEM"
    var attribute="DESCRIPTION"
    /** @type {psdi.mbo.MboValueInfoStatic} */
    var mvis = MXServer.getMXServer().getMaximoMLDD().getMboValueInfoStatic(userInfo, objectName, attribute);
    logger.info("["+scriptName+"]----------mvis=" + mvis)
    if(mvis){
        message =  "mvis is not null"
        logger.info("[" + scriptName + "]----------mvis is not null")
        data.put("attributeName", mvis.getAttributeName())
        data.put("attributeLabel", mvis.getCacheName())
        data.put("attributeScale", mvis.getScale())
    }else{
        message="mvis is null"
        logger.info("["+scriptName+"]----------mvis is null")
    }
    resultData.put("message", message);
    resultData.put("data", data)

    // try{
    //     var mboCountJson = service.jsonToString(MXServer.getMXServer().getAllTenantsMboCountAsJSON());
    //     resultData.put("mboCount", mboCountJson)
    // } catch (e) {
    //     logger.error("["+scriptName+"]----------error=" + e,e)
    // }

    var item = MXServer.getMXServer().getMaximoDD().getMboSetInfo("ITEM");
    /** @type {java.util.Iterator} */
    var attrsIter = item.getAttributes();
    var itemSetInfo = new JSONObject();
    while (attrsIter.hasNext()) {
        var mvi = attrsIter.next();
        var keyAttribute = mvi.getAttributeName()
        logger.info("keyAttribute=" + keyAttribute);
        var mviJson = new JSONObject();
        mviJson.put("title", mvi.getTitle());
        mviJson.put("attributeName", mvi.getAttributeName());
        mviJson.put("name", mvi.getName());
        // mviJson.put("objectName", mvi.getObjectName());
        // mviJson.put("type", mvi.getType());
        // mviJson.put("maxType", mvi.getMaxType());
        // mviJson.put("length", mvi.getLength());
        // mviJson.put("scale", mvi.getScale());
        // mviJson.put("searchType", mvi.getSearchType());
        // mviJson.put("domainId", mvi.getDomainId());
        // mviJson.put("domainName", mvi.getDomainName());
        // mviJson.put("defaultValue", mvi.getDefaultValue());
        // mviJson.put("alias", mvi.getAlias());
        // mviJson.put("className", mvi.getClassName());
        // mviJson.put("entityName", mvi.getEntityName());
        // mviJson.put("entityColumnName", mvi.getEntityColumnName());
        // mviJson.put("cacheName", mvi.getCacheName());
        // mviJson.put("sameAsObject", mvi.getSameAsObject());
        // mviJson.put("sameAsAttribute", mvi.getSameAsAttribute());
        // mviJson.put("autoKeyName", mvi.getAutoKeyName());
        // mviJson.put("attributeNumber", mvi.getAttributeNumber());
        // mviJson.put("persistentAttributeNumber", mvi.getPersistentAttributeNumber());
        // mviJson.put("isKey", mvi.isKey());
        // mviJson.put("isRequired", mvi.isRequired());
        // mviJson.put("isPersistent", mvi.isPersistent());
        // mviJson.put("isInteger", mvi.isInteger());
        // mviJson.put("isNumeric", mvi.isNumeric());
        // mviJson.put("isPositive", mvi.isPositive());
        // mviJson.put("isRestricted", mvi.isRestricted());
        // mviJson.put("isUserdefined", mvi.isUserdefined());
        // mviJson.put("isExtended", mvi.isExtended());
        // mviJson.put("isLDOwner", mvi.isLDOwner());
        // mviJson.put("isLocalizable", mvi.isLocalizable());
        // mviJson.put("isMLSupported", mvi.isMLSupported());
        // mviJson.put("isMLInUse", mvi.isMLInUse());
        // mviJson.put("isContentAttribute", mvi.isContentAttribute());
        // mviJson.put("isFetchAttribute", mvi.isFetchAttribute());
        // mviJson.put("isESigEnabled", mvi.isESigEnabled());
        // mviJson.put("isTenantOwned", mvi.isTenantOwned());
        // mviJson.put("hasLongDescription", mvi.hasLongDescription());
        // mviJson.put("isEAuditEnabled", mvi.isEAuditEnabled());

        itemSetInfo.put(keyAttribute, mviJson);
    }
    resultData.put("itemSetInfo", itemSetInfo);


}
logger.info("["+scriptName+"]----------------End of script 我想看看有没有乱码" )
responseBody = service.jsonToString(resultData);
