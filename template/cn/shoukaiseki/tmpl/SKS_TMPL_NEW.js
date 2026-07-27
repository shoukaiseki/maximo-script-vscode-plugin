// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//可用于控制字段只读
var scriptName = service.getScriptName()

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("[" + scriptName + "]----------1");
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
// logger.setLevel(Level.INFO);
logger.info("[" + scriptName + "]----------------Starting execution of script " + service.getScriptName());
logger.info("[" + scriptName + "]-------------webclientsession=" + service.webclientsession())


var appName = service.invokeScript("COMMON.UTILS", "getAppNameByMbo", [mbo]);
logger.info("---------------appName=" + appName)

main()

function main() {
  if (appName == "IBM_NONPO") {
    mbo.setValue("PURCHASEAGENT", mbo.getUserInfo().getPersonId(), 2)
  }
}

/**
 * 
 * 
{
  "sks:autoscript:remark": "<OBJECTNAME>.NEW",
  "autoscript": "PO.NEW",
  "description": "在对象创建时触发",
  "version": "1.0.4",
  "active": 1,
  "loglevel": "INFO",
  "scriptlanguage": "JavaScript",
  "interface": 0,
  "variables": [],
  "launchPoints": [],
  "status": "Draft",
  "langcode": "ZH",
  "userdefined": 1,
  "autoscriptid": 0,
  "ibm_packagepath": "ibm.po.mbo"
}
 */