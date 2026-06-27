// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
loggerMX.error("[TEST_SKS_LOG_ANSI_UTILS]----------1");
var sksLogAnsiUtils=service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("[TEST_SKS_LOG_ANSI_UTILS]----------2");
loggerMX.error("[TEST_SKS_LOG_ANSI_UTILS]----------3");
/** @type {jscustom.AnsiLogger} */
var logger =sksLogAnsiUtils.newAnsiLogger({logger:loggerMX, ansiOpen:true})
loggerMX.error("[TEST_SKS_LOG_ANSI_UTILS]----------4");
loggerMX.error("[TEST_SKS_LOG_ANSI_UTILS]logger="+logger);
// logger.setLevel(Level.INFO);
logger.debug("[TEST_SKS_LOG_ANSI_UTILS]---debug" )
logger.info("[TEST_SKS_LOG_ANSI_UTILS]---info")
logger.warn("[TEST_SKS_LOG_ANSI_UTILS]---warn")
logger.error("[TEST_SKS_LOG_ANSI_UTILS]---error")
responseBody = "{\"status\":\"success\"}";
