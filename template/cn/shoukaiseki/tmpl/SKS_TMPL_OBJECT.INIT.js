// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//可用于控制字段只读

load('nashorn:mozilla_compat.js');
importPackage(java.io);
importPackage(java.sql);
importClass(Packages.psdi.util.MXException);
importClass(Packages.psdi.util.MXApplicationException);
importClass(Packages.psdi.server.MXServer);
importClass(Packages.java.util.HashMap);

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");
var scriptName=service.getScriptName()

/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils=service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("["+scriptName+"]----------1");
/** @type {jscustom.AnsiLogger} */
var logger =sksLogAnsiUtils.newAnsiLogger({logger:loggerMX, ansiOpen:true})
// logger.setLevel(Level.INFO);
logger.info("["+scriptName+"]----------------Starting execution of script " + service.getScriptName());
logger.info("["+scriptName+"]-------------webclientsession=" + service.webclientsession())


var appName = service.invokeScript("COMMON.UTILS", "getAppNameByMbo", [mbo]);
logger.info("---------------appName=" + appName)

/** @type {java.lang.String} */
var app = app
/** @type {boolean} */
var interactiveTmp = interactive
/** @type {boolean} */
var onaddTmp = onadd
/** @type {java.lang.String} */
var launchPointTmp = launchPoint
/** @type {boolean} */
var onsetupTmp = onsetup
/** @type {java.lang.String} */
var mbonameTmp = mboname
/** @type {ScriptService} */
var serviceTmp = service
/** @type {boolean} */
var onupdateTmp = onupdate
/** @type {java.lang.String} */
var scriptNameTmp = scriptName
/** @type {psdi.mbo.Mbo} */
var mboTmp = mbo
/** @type {boolean} */
var ondeleteTmp = ondelete
/** @type {java.lang.String} */
var userTmp = user

/** @type {psdi.mbo.MboValue} */
var evalresultTmp = evalresult

if(appName=="IBM_ITEM"){
    // var clientsession =  service.webclientsession();
    //clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning","----初始化" + mbo.getString("STATUS"), 1);
    var activelist = ["DESCRIPTION"];
    if (!mbo.getString("STATUS").equals("DRAFT")) {
        //mbo.setFlag( MboConstants.READONLY, true);
        mbo.setFieldFlag(activelist, MboConstants.READONLY, true);
        mbo.getMboSet("IBM_CUSTOMERADD").setFlag(MboConstants.READONLY, true);
    }
}

var clientsession = service.webclientsession();
clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "----删除----" + mbo.getString("STATUS"), 1);


/**
{
  "owneremail": "",
  "createdbyid": "",
  "description": "ITEM初始化脚本",
  "launchPoints": [
    {
      "launchpointtype": "OBJECT",
      "addupdatedelete": "",
      "sks:evcontext": "保存前",
      "condition": "",
      "attributeevent": "",
      "objectname": "ITEM",
      "description": "ITEM初始化脚本",
      "active": "Y",
      "eventtype": "初始化值",
      "attributename": "",
      "launchpointname": "INIT_ACTION",
      "objectevent": "1"
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
  "autoscript": "ITEM.INIT",
  "ownername": "",
  "changeby": "MAXADMIN",
  "active": 1,
  "changedate": "2026-06-02T22:03:29+08:00",
  "ownerid": "",
  "version": "1.0.7",
  "orgid": "",
  "statusdate": "2026-05-25T07:05:55+08:00",
  "hasld": 0,
  "ibm_packagepath": "ibm.item.apply",
  "loglevel": "ERROR",
  "ownerphone": "",
  "category": "",
  "userdefined": 1,
  "status": "Draft",
  "createdbyname": ""
}
 */