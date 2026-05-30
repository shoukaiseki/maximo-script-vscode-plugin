/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
logger.info("\x1b[31m[SKS_LOG_ANSI_UTILS] init start\x1b[0m")
logger.info('\x1b[31m红色文本\x1b[0m'); // 红色文本，\x1b[0m重置颜色
logger.info('\x1b[32m绿色文本\x1b[0m'); // 绿色文本
logger.info('\x1b[33m黄色文本\x1b[0m'); // 黄色文本
logger.info('\x1b[34m蓝色文本\x1b[0m'); // 蓝色文本
logger.info('\x1b[35m品红文本\x1b[0m'); // 品红文本
logger.info('\x1b[36m青色文本\x1b[0m'); // 青色文本
logger.info('\x1b[37m白色文本\x1b[0m'); // 白色文本

if(logger.isInfoEnabled()){
    logger.info("\x1b[31m[SKS_LOG_ANSI_UTILS] init debug\x1b[0m")
    logger.info(formatMsgByAnsiCode("[SKS_LOG_ANSI_UTILS] formatMsgByAnsiCode","31"))
    logger.info(formatMsgByLevel("[SKS_LOG_ANSI_UTILS] formatMsgByLevel","DEBUG"))
}

 function formatMsgByAnsiCode (msg,ansiCode) {
    return '\x1b[' + ansiCode + 'm' + msg + '\x1b[0m'
}

function formatMsgByLevel(msg,levelStr,ansiOpen) {
    logger.info("[SKS_LOG_ANSI_UTILS]formatMsgByLevel START")
    if(!ansiOpen){
        return msg
    }
    var stmp = msg
    if(levelStr=="ERROR"){
        logger.info("[SKS_LOG_ANSI_UTILS]formatMsgByLevel ERROR")
        stmp=formatMsgByAnsiCode(msg,"31")
    }
    else if(levelStr=="WARN"){
        logger.info("[SKS_LOG_ANSI_UTILS]formatMsgByLevel WARN")
        stmp=formatMsgByAnsiCode(msg,"33")
    }
    else if(levelStr=="INFO"){
        logger.info("[SKS_LOG_ANSI_UTILS]formatMsgByLevel INFO")
        stmp=formatMsgByAnsiCode(msg,"32")
    }
    else if(levelStr=="DEBUG"){
        logger.info("[SKS_LOG_ANSI_UTILS]formatMsgByLevel DEBUG")
        stmp=formatMsgByAnsiCode(msg,"34")
    }
    logger.info("[SKS_LOG_ANSI_UTILS]formatMsgByLevel END")
    return stmp
}

function newAnsiLogger(config) {
    return new AnsiLogger(config)
}

/**
 * AnsiLogger
 * @param config {logger,ansiOpen}
 * @constructor
 */
function AnsiLogger(config) {
    /**  @type {psdi.util.logging.MXLogger}*/
    this.logger = config.logger;
    // 是否开启ANSI
    this.ansiOpen=config.ansiOpen||false;
    logger.info("[SKS_LOG_ANSI_UTILS] AnsiLogger ansiOpen="+this.ansiOpen)
}



AnsiLogger.prototype.constructor = AnsiLogger;

AnsiLogger.prototype.setLevel = function (level) {
    this.logger.setLevel(level)
}
AnsiLogger.prototype.getLogger=function () {
    return this.logger
}

AnsiLogger.prototype.debug = function (msg,error) {
    var formattedMsg=formatMsgByLevel(msg,"DEBUG",this.ansiOpen)
    if(error){
        this.logger.debug(formattedMsg,error)
    } else {
        this.logger.debug(formattedMsg)
    }
}
AnsiLogger.prototype.info = function (msg,error) {
    var formattedMsg=formatMsgByLevel(msg,"INFO",this.ansiOpen)
    if(error){
        this.logger.info(formattedMsg,error)
    } else {
        this.logger.info(formattedMsg)
    }
}

AnsiLogger.prototype.warn = function (msg,error) {
    var formattedMsg=formatMsgByLevel(msg,"WARN",this.ansiOpen)
    if(error){
        this.logger.warn(formattedMsg,error)
    } else {
        this.logger.warn(formattedMsg)
    }
}

AnsiLogger.prototype.error = function (msg,error) {
    var formattedMsg=formatMsgByLevel(msg,"ERROR",this.ansiOpen)
    if(error){
        this.logger.error(formattedMsg,error)
    } else {
        this.logger.error(formattedMsg)
    }
}
AnsiLogger.prototype.isDebugEnabled = function () {
    return this.logger.isDebugEnabled()
}

AnsiLogger.prototype.isInfoEnabled = function () {
    return this.logger.isInfoEnabled()
}
AnsiLogger.prototype.isWarnEnabled = function () {
    return this.logger.isWarnEnabled()
}
AnsiLogger.prototype.isErrorEnabled = function () {
    return this.logger.isErrorEnabled()
}
AnsiLogger.prototype.isTraceEnabled = function () {
    return this.logger.isTraceEnabled()
}
