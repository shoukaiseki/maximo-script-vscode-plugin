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
// clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("fusion", "TestOk"));


// service.
// /** @type {psdi.security.UserInfo} */
// var profile = userInfo.getProfile()
var data={
    "status": "success",
    "message": "Script executed successfully"
}

//返回的header使用responseHeaders变量设置,默认是"application/json"
// responseHeaders.put("content-type", "application/json");

//返回的设置到responseBody变量,String类型或者 byte[]类型
responseBody = JSON.stringify(data);

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
  "loglevel": "INFO",
  "ownerphone": "",
  "category": "",
  "userdefined": 1,
  "status": "Draft",
  "createdbyname": ""
}
 */