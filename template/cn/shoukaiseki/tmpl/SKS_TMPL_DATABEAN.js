// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load('nashorn:mozilla_compat.js');
// 直接调用方法的脚本,无任何隐式变量可以使用
var scriptName="DATABEAN.IBM_ADDITEMAPPLY.RESULTS_SHOWLIST"//service.getScriptName()
/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
loggerMX.info("["+scriptName+"]----------");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");//13

/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");//67

/** @type {jscustom.AnsiLogger} */
var logger=null

clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "DATABEAN.加载了!!!", 1);

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

    logger.info("[" + scriptName + "] initLogger")
}


/**
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function initialize(dbctx){
    initLogger(dbctx);
    var clientsession = dbctx.webclientsession();
    clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "APPBEAN.initializeApp!!!", 1);

    /** @type {psdi.webclient.system.controller.AppInstance} */
    var appInstance = dbctx.getAppInstance();
    /** @type {psdi.webclient.system.beans.DataBean} */
    var appBean = appInstance.getAppBean();
    /** @type {psdi.mbo.MboRemote} */
    var mbo = appBean.getMbo();
    // appBean.setQbe("APPLYNUM", 12);


    logger.info("[" + scriptName + "] initialize")
}

/**
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function test(dbctx){
    initLogger(dbctx);
    logger.info("[" + scriptName + "] test")

    var mbo = dbctx.getMbo()
    logger.info("[" + scriptName + "] mbo= " + mbo)
    logger.info("[" + scriptName + "] dbctx.getEvent().getType()= " + dbctx.getEvent().getType())
    if(!mbo){
        var appInstance = dbctx.getAppInstance()
        logger.info("[" + scriptName + "] appInstance= " + appInstance)
        var appBean = appInstance.getAppBean()
        logger.info("[" + scriptName + "] appBean= " + appBean)
      //应用主列表按钮的mbo获取
        mbo = appBean.getMbo()
        logger.info("[" + scriptName + "] mbo= " + mbo)
        var appName=mbo.getString("app")
        logger.info("[" + scriptName + "] appName= " + appName)
    }
}

/**
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function addrow(dbctx){
    initLogger(dbctx);
    logger.info("[" + scriptName + "] addrow")
}



/**
 * 一定要DATABEAN. 开头
 * 
{
  "owneremail": "",
  "createdbyid": "",
  "description": "零件申请主表",
  "launchPoints": [],
  "createdbyemail": "",
  "sks:interface": "interface的值一定要=1",
  "interface": 1,
  "scriptlanguage": "JavaScript",
  "langcode": "ZH",
  "createdby": "MAXADMIN",
  "siteid": "",
  "action": "",
  "createdbyphone": "",
  "scheduledstatus": "",
  "owner": "MAXADMIN",
  "variables": [
    {
      "varbindingtype": "LITERAL",
      "vartype": "IN",
      "allowoverride": "Y",
      "varbindingvalue": "IBM_ADDITEMAPPLY",
      "varname": "beanapp"
    },
    {
      "varbindingtype": "LITERAL",
      "vartype": "IN",
      "allowoverride": "Y",
      "varbindingvalue": "results_showlist",
      "varname": "beanid"
    }
  ],
  "comments": "",
  "autoscript": "DATABEAN.IBM_ADDITEMAPPLY.RESULTS_SHOWLIST",
  "ownername": "",
  "changeby": "MAXADMIN",
  "autoscriptid": 116,
  "active": 1,
  "changedate": "2026-05-29T00:11:56+08:00",
  "ownerid": "",
  "version": "1.0.13",
  "orgid": "",
  "statusdate": "2026-05-29T00:10:12+08:00",
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