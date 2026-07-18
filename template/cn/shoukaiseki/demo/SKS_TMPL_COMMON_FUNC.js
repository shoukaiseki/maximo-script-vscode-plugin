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
 * 初始化日志记录器,在通用脚本中,每次都需要调用该方法以初始化logger
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 脚本服务
 */
function initLogger(service){
    if(logger!=null){
        return
    }
    sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
    logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
// logger.setLevel(Level.INFO);

    logger.info("[" + scriptName + "] initialize")
}

/**
 * 多次调用方式,脚本配置中 interface=0
    var itemUtils = service.invokeScript("ITEM_UTILS");
    var result = itemUtils.testCalc(service,mbo)
 * 
 * 单次调用方式,脚本配置中 interface=1
 * 
    var result = service.invokeScript("ITEM_UTILS","testCalc",[service,mbo]);

 *  被调用的方法
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 脚本服务
 * @param {psdi.mbo.Mbo} mbo - MBO对象
 * @returns {string}
 * 
 */
function testCalc(service,mbo){
    initLogger(service,mbo);
    // var clientsession = service.webclientsession();
    // //右上角绿色成功提示
    // clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("ibm_system", "option_ok"));

    logger.info("[" + scriptName + "] initializeApp")
    return "testCalc ok"
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
 * 自定义通用脚本,有两种方式,单次调用方式和频繁调用方式
 * 
 * 多次调用方式,脚本配置中 interface=0
    var itemUtils = service.invokeScript("ITEM_UTILS");
    var result = itemUtils.testCalc(service,mbo)
 * 
 * 单次调用方式,脚本配置中 interface=1
 * 
    var result = service.invokeScript("ITEM_UTILS","testCalc",[service,mbo]);
 * 
 *  
 * 无需配置其它信息
 * 
 * 
{
  "owneremail": "",
  "createdbyid": "",
  "description": "测试",
  "sks:autoscript:remark": "脚本名无要求",
  "autoscript": "ITEM_UTILS",
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