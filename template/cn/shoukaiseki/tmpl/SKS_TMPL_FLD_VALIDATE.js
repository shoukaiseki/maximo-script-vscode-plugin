// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load('nashorn:mozilla_compat.js');
var scriptName=service.getScriptName()
/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
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

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

/** @type {psdi.mbo.MboRemote} */
var mboTmp=mbo

/** @type {psdi.mbo.MboValue} */
var mbovalueTmp=mbovalue

/** @type {string} */
var appTmp=app

/** @type {string} */
var mboattrTmp=mboattr

/** @type {string} */
var scriptNameTmp=scriptName

/** @type {string} */
var launchPointTmp=launchPoint

/** @type {string} */
var mbonameTmp=mboname

//还有一个字段名相同的变量, 值是通过 ScriptUtil.getValueFromMaxType(this.getMboValue().getMaxType()) 获取
//当前字段名是 ORDERUNIT ,变量名就是orderunit,maximo中已转为小写

if(orderunit != null){
    logger.info("["+scriptName+"]----------ORDERUNIT=" + orderunit);
    if(mbo.isNull("ISSUEUNIT")){
        mbo.setValue("ISSUEUNIT",orderunit)
    }
}
main()

function main(){
    var clientsession = dbctx.webclientsession();
    clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "DATABEAN.initialize触发了!!!", 1);

}


/**
 * AttributeLaunchPoint 类中
 {
  "owneremail": "",
  "createdbyid": "",
  "description": "零件申请行计量单位(采购)",
  "launchPoints": [
    {
      "launchpointtype": "ATTRIBUTE",
      "addupdatedelete": "",
      "sks:evcontext": "",
      "condition": "",
      "attributeevent": "2",
      "objectname": "IBM_ITEM_APPLYLINE",
      "description": "零件申请行计量单位(采购)",
      "active": "Y",
      "eventtype": "",
      "attributename": "ORDERUNIT",
      "launchpointname": "IBM_ITEM_APPLYLN_ORDUNIT_VAL",
      "objectevent": "0"
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
  "autoscript": "IBM_ITEM_APPLYLINE.ORDERUNIT.VALIDATE",
  "ownername": "",
  "changeby": "MAXADMIN",
  "autoscriptid": 161,
  "active": 1,
  "changedate": "2026-06-02T05:07:50+08:00",
  "ownerid": "",
  "version": "1.0.8",
  "orgid": "",
  "statusdate": "2026-06-02T05:06:22+08:00",
  "hasld": 0,
  "ibm_packagepath": "ibm.item.attrvalidate",
  "loglevel": "INFO",
  "ownerphone": "",
  "category": "",
  "userdefined": 1,
  "status": "Draft",
  "createdbyname": ""
} 
 */