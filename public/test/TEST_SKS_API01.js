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


/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");
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


/** @type {java.lang.String} */
var requestBodyTmp=requestBody

/** @type {psdi.security.UserInfo} */
var userInfoTmp=userInfo

/** @type {com.ibm.tivoli.maximo.oslc.provider.OslcRequest} */
var requestTmp=request

/** @type {java.util.HashMap} */
var responseHeadersTmp=responseHeaders

/** @type {java.lang.String} */
var httpMethodTmp=httpMethod


// var clientsession = service.webclientsession();
//接口中获取不到的
// clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "----删除----" + mbo.getString("STATUS"), 1);
XMLUtils = Java.type("psdi.iface.util.XMLUtils")
Document = Java.type("org.jdom2.Document");
StructureData = Java.type("psdi.iface.mic.StructureData");
XMLUtils = Java.type("psdi.iface.util.XMLUtils");
String = Java.type("java.lang.String");
var req='<max:CreateMXRECEIPT xmlns:max="http://www.ibm.com/maximo" baseLanguage="EN" transLanguage="EN"> <max:MXRECEIPTSet> <max:MXRECEIPT> <max:ISSUETYPE>RECEIPT</max:ISSUETYPE> <max:SOURCESYSID>SKS</max:SOURCESYSID> <max:EXTERNALREFID>TEST01</max:EXTERNALREFID> <max:ORGID>SKS</max:ORGID> <max:SITEID>TEST01</max:SITEID> <max:POSITEID>TEST01</max:POSITEID> <max:ACTUALDATE>2026-06-06T08:00:00+08:00</max:ACTUALDATE> <max:PONUM>TEST01</max:PONUM> <max:POLINENUM>10</max:POLINENUM> <max:ITEMNUM>TEST01</max:ITEMNUM> <max:TOSTORELOC>TEST01</max:TOSTORELOC> <max:RECEIPTQUANTITY>1.00000000</max:RECEIPTQUANTITY> </max:MXRECEIPT> </max:MXRECEIPTSet> </max:CreateMXRECEIPT> '
req=requestBody
logger.info("["+scriptName+"]-------------req=" + req)
        var document = XMLUtils.convertBytesToDocument(req.getBytes("UTF-8"));
        var irData=new StructureData(document);
        irData.breakData();
        do {
            var childrenData = irData.getChildrenData();
//        for (Object childrenDatum : childrenData) {
//            int currentPosition = irData.getCurrentPosition();
//            irData.removeCurrentData();
//            irData.breakData();
//            irData.setCurrentPosition(currentPosition-1);
//        }
            var currentPosition = irData.getCurrentPosition();
            irData.removeCurrentData();
            irData.breakData();
            irData.setCurrentPosition(currentPosition-1);
        }while (irData.moveToNextIntObject());
        irData.addObjectStructure();
        req = irData.getDataAsBytes();
        var resultData = new String(req)
        logger.info("["+scriptName+"]-------------newReq=" + new String(req));



// var data={
//     "status": "success",
//     "message": "Script executed successfully"
// }
//返回的header使用responseHeaders变量设置,默认是"application/json"
// responseHeaders.put("content-type", "application/json");

//返回的设置到responseBody变量,String类型或者 byte[]类型
// responseBody = JSON.stringify(data);

responseHeaders.put("content-type", "application/xml");
responseBody=resultData

