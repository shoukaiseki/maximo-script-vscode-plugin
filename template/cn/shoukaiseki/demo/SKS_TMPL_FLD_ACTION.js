// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load('nashorn:mozilla_compat.js');
var scriptName=service.getScriptName()

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");
/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8
/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");
// var scriptName=scriptName

/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
var sksLogAnsiUtils=service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("["+scriptName+"]----------1");
/** @type {jscustom.AnsiLogger} */
var logger =sksLogAnsiUtils.newAnsiLogger({logger:loggerMX, ansiOpen:true})
// logger.setLevel(Level.INFO);
logger.info("["+scriptName+"]----------------Starting execution of script " + service.getScriptName());
logger.info("["+scriptName+"]-------------webclientsession=" + service.webclientsession())


/** @type {java.lang.String} */
var app = app
/** @type {java.lang.String} */
var mboattrTmp = mboattr
/** @type {java.lang.String} */
var scriptNameTmp = scriptName
/** @type {java.lang.String} */
var launchPointTmp = launchPoint
/** @type {java.lang.String} */
var mbonameTmp = mboname
/** @type {boolean} */
var interactiveTmp = interactive
/** @type {boolean} */
var onaddTmp = onadd
/** @type {psdi.mbo.MboValue} */
var mbovalueTmp = mbovalue
/** @type {ScriptService} */
var serviceTmp = service
/** @type {boolean} */
var onupdateTmp = onupdate
/** @type {boolean} */
var ondeleteTmp = ondelete
/** @type {psdi.mbo.Mbo} */
var mboTmp = mbo
/** @type {java.lang.String} */
var userTmp = user
//字段名如果是id,属性名就是 id_previous
//<lower(attrname)_previous>  原来的值
//<lower(attrname)_initial>  初始的值
//<lower(attrname)           现在的值


logger.info("\x1b[32m[" + scriptName + "]----------------mboattr= " + mboattr + "\x1b[0m")

var appName = service.invokeScript("COMMON.UTILS", "getAppNameByMbo", [mbo]);
//还有一个字段名相同的变量, 值是通过 ScriptUtil.getValueFromMaxType(this.getMboValue().getMaxType()) 获取
main()

function main(){
    var clientsession = service.webclientsession();
    //ACTION不会有提示
    // clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("ibm_system", "option_ok"));
    //抛出异常会在字段中提示输入的值无效
  // throw new MXApplicationException("ibm_system", "option_ok")

}

/**
变更值后触发
AttributeLaunchPoint 类中
 
{
  "owneremail": "",
  "createdbyid": "",
  "description": "ITEMNUM变更值触发",
  "sks:autoscript:remark": "脚本名无特殊要求",
  "sks:autoscript:suggested: "建议命名<表名>.<字段名>.ACTION",
  "autoscript": "ITEM.ITEMNUM.ACTION",
  "launchPoints": [
    {
      "add": false,
      "sks:evcontext": "",
      "sks:addupdatedelete": "",
      "sks:objectname:remark": "表名称",
      "objectname": "ITEM",
      "sks:attributename:remark": "字段名称",
      "attributename": "ITEMNUM",
      "launchpointname": "ITEMNUM.ACTION",
      "description": "ITEM.ITEMNUM.ACTION",
      "update": false,
      "active": true,
      "delete": false,
      "objectevent": 1,
      "launchpointtype": "ATTRIBUTE",
      "condition": "",
      "attributeevent": "4",
      "eventtype": "",
      "sks:eventtype": "",
      "evcontext": ""
    }
  ],
  "createdbyemail": "",
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
  "version": "1.0.3",
  "orgid": "",
  "hasld": 0,
  "ibm_packagepath": "ibm.item.attrlist",
  "loglevel": "ERROR",
  "ownerphone": "",
  "category": "",
  "userdefined": 1,
  "status": "Draft",
  "createdbyname": ""
}
 */