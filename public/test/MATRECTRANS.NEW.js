// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//接收

// load('nashorn:mozilla_compat.js');
MXApplicationException = Java.type("psdi.util.MXApplicationException");

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


var appName = service.invokeScript("COMMON.UTILS", "getAppNameByMbo", [mbo]);
logger.info("\x1b[31m["+scriptName+"]---------------appName=" + appName+"\x1b[0m")
// mbo.delete()

// throw new MXApplicationException("sks", "接收异常");



//  curl --request POST \
//   --url http://localhost:9080/maximo/api/os/MXRECEIPT \
//   --header 'Accept: */*' \
//   --header 'Accept-Encoding: gzip, deflate, br' \
//   --header 'Connection: keep-alive' \
//   --header 'Content-Type: application/json' \
//   --header 'Cookie: JSESSIONID=0000R1LPZTe8EegY-BMSrWqN3-T:084ad680-6965-4628-b822-2d364533b088' \
//   --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
//   --header 'apiKey: kufl9t6i501qh2gci7h10ak00prp68gomu2b2r2c' \
//   --data '{
//   "spi:issuetype": "RECEIPT",
//   "spi:sourcesysid": "YONYOU",
//   "spi:externalrefid": "20250470",
//   "spi:orgid": "ISUZU",
//   "spi:siteid": "ISUZUSET",
//   "spi:positeid": "MWSITE",
//   "spi:actualdate": "2026-02-11T08:00:00+08:00",
//   "spi:ponum": "1020",
//   "spi:polinenum": "1",
//   "spi:itemnum": "TESTZZJ",
//   "spi:tostoreloc": "HD01",
//   "spi:receiptquantity": "1.00000000"
// }
// '