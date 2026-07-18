// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//可用于控制字段只读

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");
/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");
/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");

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

/** @type {java.lang.String} */
var app = app
/** @type {java.lang.String} */
var mbonameTmp = mboname
/** @type {boolean} */
var interactiveTmp = interactive
/** @type {boolean} */
var onaddTmp = onadd
/** @type {ScriptService} */
var serviceTmp = service
/** @type {boolean} */
var onupdateTmp = onupdate
/** @type {java.lang.String} */
var scriptNameTmp = scriptName
/** @type {psdi.mbo.Mbo} */
var mboTmp = mbo
/** @type {boolean} */
var ondeleteTmp = ondelete
/** @type {java.lang.String} */
var userTmp = user

/** @type {psdi.mbo.MboValue} */
var evalresultTmp = evalresult

var appName = service.invokeScript("COMMON.UTILS", "getAppNameByMbo", [mbo]);
logger.info("---------------appName=" + appName)
userInfo=mbo.getUserInfo();
/** @type {psdi.server.MXServer} */
var mxserver = MXServer.getMXServer();

mbo.setValue("CHANGEBY", userInfo.getPersonId());
mbo.setValue("CHANGEDATE", mxserver.getDate());


/**
{
  "sks:autoscript:remark": "如果名称是<对象名>.SAVE,那么不要设置启动点,会执行两次",
  "autoscript": "IBM_REQSRC.SAVE",
  "description": "保存前操作",
  "scriptlanguage": "JavaScript",
  "loglevel": "ERROR",
  "interface": 0,
  "active": 1,
  "ibm_packagepath": "ibm.item.mbo",
  "variables": [],
  "launchPoints": [
    {
      "launchpointname": "SAVE",
      "description": "保存前操作",
      "objectname": "IBM_REQSRC",
      "launchpointtype": "OBJECT",
      "objectevent": 14,
      "sks:eventtype": "保存",
      "eventtype": "4",
      "sks:evcontext": "保存前",
      "evcontext": "0",
      "sks:addupdatedelete": "添加,更新,删除",
      "add": true,
      "update": true,
      "delete": true,
      "active": true
    }
  ],
  "status": "Draft",
  "version": "1.0.6",
  "langcode": "ZH"
}
 */