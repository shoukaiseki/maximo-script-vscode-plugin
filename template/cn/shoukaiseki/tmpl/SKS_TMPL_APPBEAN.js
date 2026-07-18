// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load('nashorn:mozilla_compat.js');
//-------------------------------------------
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
/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8
loggerMX.info("["+scriptName+"]----------");

/** @type {jscustom.AnsiLogger} */
var logger=null
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils = null


/**
 * 初始化日志记录器,在bean脚本中,每次都需要调用该方法以初始化logger
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function initLogger(dbctx){
    if(logger!=null){
        return
    }
    sksLogAnsiUtils = dbctx.invokeScript("SKS_LOG_ANSI_UTILS");
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
    var clientsession = dbctx.webclientsession();
    // clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "APPBEAN.initializeApp触发了!!!", 1);
    // clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", new MXApplicationException("ibm_rl","createpoSuccessNoOrder").getMessage(msr), 0);
    /**
     { "msgGroup": "ibm_system", "msgKey": "option_ok", "value": "操作成功", "displayMethod": "TEXT", "options": ["close"], "prefix": "BMXZZ", "suffix": "E" },
        displayMethod = TEXT 和 STATUS 都是绿色
		STATUS常用在显示固定值,比如列表过滤器,下载显示的按钮名称
     */
    //右上角绿色成功提示
    clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("ibm_system", "option_ok"));

    logger.info("[" + scriptName + "] initializeApp")
}

/**
 * 生成ITEM
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function MKITEM(dbctx) {
    initLogger(dbctx);
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
    logger.info("[" + scriptName + "] MKITEM")
}

/**
 * 设置焦点
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function setFocus(dbctx) {
    initLogger(dbctx);
    logger.info("[" + scriptName + "] setFocus")
}


/**
 * 选择记录
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function selectrecord(dbctx) {
    initLogger(dbctx);
    logger.info("[" + scriptName + "] selectrecord")
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
 * 特别注意: 如果在选择操作中想执行APPBEAN的方法,在签名选项中: 高级签名选项要选 (无) 不要做任何高级签名选项的修改
 *                      如果选择了: 此操作必须由用户在UI中调用,则不会执行APPBEAN的方法
 *                      此操作必须由用户在UI中调用勾选了,触发的会是 操作脚本
 * 
 * 无需配置其它信息, APPBEAN.应用名
 * 
 * 
{
  "owneremail": "",
  "createdbyid": "",
  "description": "测试",
  "sks:autoscript:enable:remark":"bean脚本开启条件,系统属性mxe.script.allowbeanscript=1",
  "sks:autoscript:remark": "脚本名一定要APPBEAN.<appname>,其中<appname>是应用的名称,转为大写,应用中URL参数中的value=ITEM",
  "autoscript": "APPBEAN.ITEM",
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
  "variables": [],
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