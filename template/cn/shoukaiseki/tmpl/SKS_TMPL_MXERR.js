// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load('nashorn:mozilla_compat.js');
//脚本中不要使用 MXException,容易出现嵌套循环的,也最好不要引用其它脚本
var serviceName=service.getScriptName()

/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
loggerMX.info("["+scriptName+"]----------");
/** @type {java.io.StringWriter} */
StringWriter = Java.type("java.io.StringWriter")
/** @type {java.io.PrintWriter} */
PrintWriter = Java.type("java.io.PrintWriter")

/** @type {java.lang.String} */
var egroupTmp=egroup
/** @type {java.lang.String} */
var ekeyTmp=ekey
/** @type {java.lang.Object[]} */
var eparamsTmp=eparams
/** @type {java.lang.String} */
var scriptNameTmp=scriptName

/** @type {com.ibm.tivoli.maximo.script.ScriptService} */
var serviceTmp=service

//根据 egroup 和 ekey 获取的对应的消息,消息语言使用的是system账号默认语言
/** @type {java.lang.String} */
var emsgTmp=emsg

loggerMX.info("["+scriptName+"]----------"+emsg);

var sksBool = true
if (sksBool) {
    try {

        var sw = new StringWriter();
        var pw = new PrintWriter(sw);
        // Throwable 不需要导入,查看堆栈信息
        new Throwable("[" + scriptName + "]----------堆栈信息").printStackTrace(pw);
        var errorMessage = sw.toString();
        // mxerrormsg=errorMessage
        loggerMX.warn("[" + scriptName + "]----------", errorMessage)
    } catch (e) {
        loggerMX.error("[" + scriptName + "]----------", e)
        sksBool = false
    }
}

// mxerrormsg="自定义返回消息,为null则显示原来消息内容"
mxerrormsg=null

/**
{
  "owneremail": "",
  "createdbyid": "",
  "description": "异常脚本,有些异常没打印出堆栈信息,使用此脚本方便排查问题",
  "sks:autoscript:remark": "脚本名限制为: MXERR.<msggroup>.<msgkey> 全部大写",
  "autoscript": "MXERR.SYSTEM.NOATTRIBUTE",
  "launchPoints": [],
  "createdbyemail": "",
  "sks:interface:remark": "interface的值一定要=0,如果之前是1,pull脚本之后,使用工具箱中的导入功能,导入会更改interface的值",
  "interface": 0,
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
  "ibm_packagepath": "cn.shoukaiseki.mxerr",
  "loglevel": "ERROR",
  "ownerphone": "",
  "category": "",
  "userdefined": 1,
  "status": "Draft",
  "createdbyname": ""
} 
* 
 */