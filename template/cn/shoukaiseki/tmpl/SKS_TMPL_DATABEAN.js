// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load('nashorn:mozilla_compat.js');
// 直接调用方法的脚本,无任何隐式变量可以使用
var scriptName="${sks_scriptName}"//service.getScriptName()
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
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils = null

// clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "DATABEAN.加载了!!!", 1);

/**
 * 初始化日志记录器
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function initLogger(dbctx){
    if(logger!=null){
        return
    }
    sksLogAnsiUtils = dbctx.invokeScript("SKS_LOG_ANSI_UTILS");
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
    /**
     * 管理模式下不允许执行
     {
        "msgGroup": "ibm_system",
        "msgKey": "AdminOnThis",
        "value": "管理方式已开启,页面初始化程序受到影响,NEW/INIT等脚本无法执行,<br/>请在先回启动中心,等待管理方式关闭之后重新进入应用",
        "displayMethod": "MSGBOX",
        "options": ["close"],
        "prefix": "BMXZZ",
        "suffix": "E"
    },
     */
    if(Java.type("psdi.iface.mic.MicUtil").getAdminModeState()){
        throw new MXApplicationException("ibm_system","AdminOnThis")
    }

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
    }
    var clientsession = dbctx.webclientsession();
    clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("fusion", "TestOk"));
}

/**
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function addrow(dbctx){
    initLogger(dbctx);
    logger.info("[" + scriptName + "] addrow")
}


/**
 * 关闭（有close方法的对象）
 */
function _closeOnly(f) {
  try {
    if (f) {
      f.close()
    }
  } catch (ignored) { }
}

/**
 * 关闭MboSet
 */
function _close(set) {
  try {
    if (set) {
      try { set.cleanup(); } catch (ignored) { }
      try { set.close(); } catch (ignored) { }
    }
  } catch (ignored) { }
}

/**
 * 一定要DATABEAN. 开头
 * 
{
  "owneremail": "",
  "createdbyid": "",
  "description": "DATABEAN脚本",
  "sks:autoscript:enable:remark":"bean脚本开启条件,系统属性mxe.script.allowbeanscript=1",
  "sks:autoscript:remark": "脚本名一定要DATABEAN.开头",
  "sks:autoscript:suggested: "建议命名: DATABEAN.<appname>.<beanid>",
  "autoscript": "DATABEAN.ITEM.RESULTS_SHOWLIST",
  "launchPoints": [],
  "createdbyemail": "",
  "sks:interface:remark": "interface的值一定要=1,如果之前是0,pull脚本之后,使用工具箱中的导入功能,导入会更改interface的值",
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
      "sks:varbindingvalue:remark": "应用中URL参数中的value=ITEM,其中的ITEM是应用的名称,转为大写",
      "varbindingvalue": "ITEM",
      "varname": "beanapp"
    },
    {
      "varbindingtype": "LITERAL",
      "vartype": "IN",
      "allowoverride": "Y",
      "sks:varbindingvalue:remark": "maximo.script的日志级别设置为debug,点击按钮之后查看日志, attempting to find databean script for <appName>~<bean.getId()> 的日志,设置正确的beanid",
      "varbindingvalue": "results_showlist",
      "varname": "beanid"
    }
  ],
  "comments": "",
  "ownername": "",
  "changeby": "MAXADMIN",
  "active": 1,
  "ownerid": "",
  "version": "1.0.1",
  "orgid": "",
  "hasld": 0,
  "ibm_packagepath": "ibm.item.bean",
  "loglevel": "ERROR",
  "ownerphone": "",
  "category": "",
  "userdefined": 1,
  "status": "Draft",
  "createdbyname": ""
} 
 */