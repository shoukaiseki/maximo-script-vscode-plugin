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
/**
 * 操作中 PARAMETER 值根据","分割参数
工作流操作
与应用程序签名绑定操作一样,只不过传入的 params数组长度不同
工作流中对PARAMETER值第三个参数没那么讲究,只需第一个配置脚本名即可和第二个启动点名称匹配,因为工作流本身绑定了操作,是通过操作获取脚本名和启动点名称


action表
    - 绑定类 com.ibm.tivoli.maximo.script.ScriptAction
    - PARAMETER 的值 [脚本名(表AUTOSCRIPT.AUTOSCRIPT),启动点名称(工作流中可以随便起,建议IBM_WF_开头,保证不被前端页面调用),actionName自己定义(默认取表ACTION.ACTION)]

//params[0] 操作的参数/属性值
//params[1] WFInstance
//params[2] WFAction
 */
main()
/** @type {com.ibm.tivoli.maximo.script.ScriptService} */
var serviceTmp=service

/** @type {psdi.mbo.MboRemote} */
var mboTmp=mbo
/** @type {psdi.mbo.MboRemote} */
var scriptHomeTmp=scriptHome

/** @type {java.lang.String} */
var scriptNameTmp=scriptName//来自 ACTION.PARAMETER 第1个参数


/** @type {java.lang.String} */
var launchPointTmp=launchPoint//来自 ACTION.PARAMETER 第2个参数


/** @type {java.lang.String} */
var actionTmp=action//来自 ACTION.PARAMETER 第3个参数

/** @type {java.lang.String} */
var PARAMETER = params[0] //操作的参数/属性值

/** @type {psdi.workflow.WFInstance} */
var wfInstance=params[1]

/** @type {psdi.workflow.WFAction} */
var wfAction=params[2]

function main(){

    // throw new MXApplicationException("ibm_test","ok")
}


```
action
    action: SKS_TMPL_WF_ACTION
    PARAMETER: SKS_TMPL_WF_ACTION.SKS_TMPL_WF_ACTION.ABC

{
  "owneremail": "",
  "createdbyid": "",
  "description": "WF-ITEM",
  "launchPoints": [
    {
      "launchpointtype": "ACTION",
      "addupdatedelete": "",
      "sks:evcontext": "",
      "condition": "",
      "attributeevent": "",
      "objectname": "ITEM",
      "description": "WF-ITEM",
      "active": "Y",
      "eventtype": "",
      "attributename": "",
      "launchpointname": "SKS_TMPL_WF_ACTION",
      "objectevent": ""
    }
  ],
  "createdbyemail": "",
  "interface": 0,
  "scriptlanguage": "JavaScript",
  "langcode": "ZH",
  "createdby": "MAXZHCN",
  "siteid": "",
  "action": "",
  "createdbyphone": "",
  "scheduledstatus": "",
  "owner": "MAXZHCN",
  "variables": [],
  "comments": "",
  "autoscript": "SKS_TMPL_WF_ACTION",
  "ownername": "",
  "changeby": "MAXZHCN",
  "autoscriptid": 172,
  "active": 1,
  "changedate": "2026-05-31T07:50:15+08:00",
  "ownerid": "",
  "version": "1.0.6",
  "orgid": "",
  "statusdate": "2026-05-31T10:27:03+08:00",
  "hasld": 0,
  "ibm_packagepath": "ibm.item.option",
  "loglevel": "INFO",
  "ownerphone": "",
  "category": "",
  "userdefined": 1,
  "status": "Draft",
  "createdbyname": ""
}
```