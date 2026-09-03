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
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils=service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("["+scriptName+"]----------1");
/** @type {jscustom.AnsiLogger} */
var logger =sksLogAnsiUtils.newAnsiLogger({logger:loggerMX, ansiOpen:true})
// logger.setLevel(Level.INFO);
logger.info("["+scriptName+"]----------------Starting execution of script " + service.getScriptName());
logger.info("["+scriptName+"]-------------webclientsession=" + service.webclientsession())


/**
日志记录->选择操作->监视环境信息

新建资源
资源名称: syslocale
属性名称: syslocale
类名或者脚本名称: script:SKS_TEST_BR_SYSTEMLOCALE
属性命名空间(默认值): http://jazz.net/ns/ism/asset/smarter_physical_infrastructure#
 */
Locale=Java.type("java.util.Locale")
br.setProperty("syslocale",Locale.getDefault().toString())

//获取memberId
/**
 curl --request GET --url http://36.134.146.70:9080/maximo/oslc/members?lean=true
 member.identifier 中的值就是 memberId,是base64编码的字符串

 127.0.0.1:1099/MXServer encode之后是 MTI3LjAuMC4xOjEwOTkvTVhTZXJ2ZXI=

 {
	"href": "http://36.134.146.70:9080/maximo/oslc/members",
	"member": [
		{
			"jvmName": "1@de46c6dc13ba",
			"serverHost": "172.21.0.3:1099",
			"serverName": "MXServer",
			"registryPort": 1099,
			"thisServer": false,
			"identifier": "MTcyLjIxLjAuMzoxMDk5L01YU2VydmVy"
		}
	]
}

测试接口

curl --request GET  --url /maximo/oslc/members/{memberId}/syslocale?lean=true  --header 'apiKey: xxxxxxxx' 
curl --request GET  --url /maximo/oslc/members/MTI3LjAuMC4xOjEwOTkvTVhTZXJ2ZXI=/syslocale  --header 'apiKey: xxxxxxxx' 

获取可查询的资源
curl --request GET --url 'http://36.134.146.70:9080/maximo/oslc/members/MTI3LjAuMC4xOjEwOTkvTVhTZXJ2ZXI=?lean=true' 
 */