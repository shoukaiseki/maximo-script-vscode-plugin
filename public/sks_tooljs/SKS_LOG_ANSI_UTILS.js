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

/**
 *  获取错误堆栈跟踪
    var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
    sksLogAnsiUtils.getErrorStackTrace(error)
 * @param {*} error 
 * @returns 
 */
function getErrorStackTrace(error){
    scriptName="[SKS_LOG_ANSI_UTILS]";
    logger.info("\x1b[31m[SKS_LOG_ANSI_UTILS] getErrorStackTrace\x1b[0m");
    var errorMessage;
    if(!error){
        logger.error("\x1b[31m[" + scriptName + "] getErrorStackTrace error is null\x1b[0m");
        return "error is null"
    }
    try{
        logger.info("\x1b[31m[SKS_LOG_ANSI_UTILS] getErrorStackTrace 001\x1b[0m");
        if (error instanceof org.openjdk.nashorn.internal.objects.NativeTypeError) {
            logger.info("\x1b[31m[SKS_LOG_ANSI_UTILS] getErrorStackTrace 002\x1b[0m");
            logger.warn("\x1b[31m[" + scriptName + "] Nashorn NativeTypeError \x1b[0m")
            // 打印堆栈跟踪
            errorMessage = error.getStackTrace();
            logger.warn("\x1b[31m[" + scriptName + "] Nashorn NativeTypeError: " + errorMessage);
        } else if (error instanceof org.openjdk.nashorn.internal.objects.NativeTypeError) {
            logger.warn("\x1b[31m[" + scriptName + "] Nashorn NativeTypeError \x1b[0m")
            errorMessage = error.getStackTrace();
            logger.warn("\x1b[31m[" + scriptName + "] Nashorn NativeTypeError: " + errorMessage);
        } else if (error instanceof org.openjdk.nashorn.api.scripting.ScriptObjectMirror) {
            logger.warn("\x1b[31m[" + scriptName + "] Nashorn ScriptObjectMirror2 \x1b[0m"+error);
            // logger.warn("\x1b[31m[" + scriptName + "] Nashorn ScriptObjectMirror 002\x1b[0m");
            errorMessage = error.stack
            //error.message
            logger.warn("\x1b[31m[" + scriptName + "] Nashorn ScriptObjectMirror: " + errorMessage);
        }else{
            logger.warn("\x1b[31m[" + scriptName + "] " , error);
            // logger.warn("\x1b[31m[" + scriptName + "] Nashorn ScriptObjectMirror 002\x1b[0m");
            StringWriter = Java.type("java.io.StringWriter")
            PrintWriter = Java.type("java.io.PrintWriter")
            var sw=new StringWriter();
            var pw=new PrintWriter(sw);
            error.printStackTrace(pw);
            errorMessage = sw.toString();
        }
        return errorMessage
    }catch(ignored){
        try{
            logger.error("\x1b[31m[" + scriptName + "] getErrorStackTrace error!!"+ ignored)
        }catch(ignored2){}
        return error.toString();
    }
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

/**
 * 
    var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
    logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
 * @param {*} config 
 * @returns 
 */
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
    // 是否开启打印模式,在mxlogger无效的时候启用
    this.printModel=config.printModel||false;
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
    if(this.printModel){
        java.lang.System.out.println("\x1b[34m[DEBUG] "+ msg + "\x1b[0m")
        return 
    }
    var formattedMsg=formatMsgByLevel(msg,"DEBUG",this.ansiOpen)
    if(error){
        this.logger.debug(formattedMsg,error)
    } else {
        this.logger.debug(formattedMsg)
    }
}
AnsiLogger.prototype.info = function (msg,error) {
    if(this.printModel){
        java.lang.System.out.println("\x1b[32m[INFO] "+ msg + "\x1b[0m")
        return 
    }
    var formattedMsg=formatMsgByLevel(msg,"INFO",this.ansiOpen)
    if(error){
        this.logger.info(formattedMsg,error)
    } else {
        this.logger.info(formattedMsg)
    }
}

AnsiLogger.prototype.warn = function (msg,error) {
    if(this.printModel){
        java.lang.System.out.println("\x1b[33m[WARN] "+ msg + "\x1b[0m")
        return 
    }
    var formattedMsg=formatMsgByLevel(msg,"WARN",this.ansiOpen)
    if(typeof error === "undefined" || error == null || !error){
        this.logger.warn(formattedMsg)
    } else {
        this.logger.warn(formattedMsg+"\n"+getErrorStackTrace(error))
    }
}

AnsiLogger.prototype.error = function (msg,error) {
    if(this.printModel){
        java.lang.System.out.println("\x1b[31m[ERROR] "+ msg + "\x1b[0m")
        return 
    }
    var formattedMsg=formatMsgByLevel(msg,"ERROR",this.ansiOpen)
    if(typeof error === "undefined" || error == null || !error){
        this.logger.error(formattedMsg)
    } else {
        this.logger.error(formattedMsg+"\n"+getErrorStackTrace(error))
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