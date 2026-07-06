// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
var scriptName=service.getScriptName()
/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8
/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");
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


//非主表会为null
/** @type {java.lang.String} */
var appTmp=app

/** @type {java.lang.String} */
var mbonameTmp=mboname


/** @type {java.lang.Boolean} */
var interactiveTmp = interactive 

/** @type {java.lang.Boolean} */
var onupdateTmp = onupdate 

/** @type {java.lang.Boolean} */
var ondeleteTmp = ondelete 

/** @type {java.lang.Boolean} */
var onaddTmp =  onadd

/** @type {java.lang.String} */
var userTmp = user 

/** @type {com.ibm.tivoli.maximo.script.ScriptService} */
var serviceTmp=service

/** @type {psdi.mbo.MboRemote} */
var mboTmp=mbo

/** @type {java.lang.String} */
var scriptNameTmp=scriptName//来自 ACTION.PARAMETER 第1个参数


/** @type {java.lang.String} */
var launchPointTmp=launchPoint//来自 ACTION.PARAMETER 第2个参数



//表达式最后的结果,必须在方法外声明
var evalresult=main()
logger.info("["+scriptName+"]-------------evalresult=" + evalresult)

function main(){
    if(mbo.isNull("XLSTYPE")){
        return false
    }
    var xlsType = mbo.getString("XLSTYPE")
    if("".equalsIgnoreCase(xlsType)||"NONE".equalsIgnoreCase(xlsType)){
        return false

    }
    return true

}




/**
 * 条件表达式
      条件名称:      SKS_TMPLCT 应该无限制,我使用的是启动点同名 
      表达式内容:    <脚本名>:<启动点名称>
              例如: TEST_EXPRESSION:IBM_PRHIDEIX
      条件表达式绑定类 com.ibm.tivoli.maximo.script.ScriptCustomCondition
 
{
  "autoscript": "TEST_EXPRESSION",
  "description": "隐藏IBM_PO(PR)中excel导入table",
  "scriptlanguage": "JavaScript",
  "loglevel": "INFO",
  "interface": 0,
  "active": 1,
  "ibm_packagepath": "cn.shoukaiseki.cn",
  "variables": [],
  "launchPoints": [
    {
      "launchpointname": "IBM_PRHIDEIX",
      "description": "隐藏IBM_PO(PR)中excel导入table",
      "launchpointtype": "CUSTOMCONDITION",
      "objectevent": 0,
      "sks:eventtype": "验证",
      "active": true
    }
  ],
  "status": "Draft",
  "version": "1.0.2",
  "category": "",
  "hasld": 0,
  "langcode": "ZH",
  "userdefined": 1
}
 */