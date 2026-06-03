// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load('nashorn:mozilla_compat.js');
//无任何变量可以使用
var scriptName="APPBEAN.IBM_ADDITEMAPPLY"//service.getScriptName()
/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
loggerMX.info("["+scriptName+"]----------");

/** @type {jscustom.AnsiLogger} */
var logger=null


/**
 * 初始化日志记录器
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function initLogger(dbctx){
    if(logger!=null){
        return
    }
    var sksLogAnsiUtils = dbctx.invokeScript("SKS_LOG_ANSI_UTILS");
    logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
// logger.setLevel(Level.INFO);

    logger.info("[" + scriptName + "] initialize")
}

/**
 * 初始化应用
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function initializeApp(dbctx){
    initLogger(dbctx);


    logger.info("[" + scriptName + "] initializeApp")
}

/**
 * 生成ITEM
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function MKITEM(dbctx) {
    initLogger(dbctx)
    logger.info("[" + scriptName + "] MKITEM")
}

/**
 * 设置焦点
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function setFocus(dbctx) {
    initLogger(dbctx)
    logger.info("[" + scriptName + "] setFocus")
}


/**
 * 选择记录
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function selectrecord(dbctx) {
    initLogger(dbctx)
    logger.info("[" + scriptName + "] selectrecord")
}




/**
 * 无需配置其它信息, APPBEAN.应用名
 * 
{
  "owneremail": "",
  "createdbyid": "",
  "description": "测试",
  "launchPoints": [],
  "createdbyemail": "",
  "interface": 1,
  "scriptlanguage": "JavaScript",
  "langcode": "ZH",
  "createdby": "MAXADMIN",
  "siteid": "",
  "action": "",
  "createdbyphone": "",
  "scheduledstatus": "",
  "owner": "MAXADMIN",
  "variables": [],
  "comments": "",
  "autoscript": "APPBEAN.ITEM",
  "ownername": "",
  "changeby": "MAXADMIN",
  "autoscriptid": 117,
  "active": 1,
  "changedate": "2026-05-29T00:24:30+08:00",
  "ownerid": "",
  "version": "1.0.18",
  "orgid": "",
  "statusdate": "2026-05-29T00:23:34+08:00",
  "hasld": 0,
  "ibm_packagepath": "ibm.item.bean",
  "loglevel": "INFO",
  "ownerphone": "",
  "category": "",
  "userdefined": 1,
  "status": "Draft",
  "createdbyname": ""
} 
 */