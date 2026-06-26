// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//可用于控制字段只读

// load('nashorn:mozilla_compat.js');

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");
ScriptService = Java.type("com.ibm.tivoli.maximo.script.ScriptService");
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
var scriptNameTmp = scriptName
/** @type {psdi.mbo.Mbo} */
var mboTmp = mbo
/** @type {psdi.security.UserInfo} */
var userInfoTmp = userInfo
/** @type {java.lang.String} */
var appTmp = app
/** @type {psdi.mbo.RelationInfo} */
var riTmp = ri


/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");
var where=null
// where="ownertable = :1 and ownerid = :2 and transtype in('分配完成的 WF')"
where="ownertable = :1 and ownerid = :2  and transtype in (select value from synonymdomain where domainid ='WFTRANSTYPE' and maxvalue in ('WFASSIGNCOMP'))"
var sqlFormat=new SqlFormat(where)
sqlFormat.setString(1, mbo.getName());
sqlFormat.setLong(2, mbo.getUniqueIDValue());
var whereClause=sqlFormat.format()
logger.info("\x1b[32m["+scriptName+"]-------------whereClause=" + whereClause+"\x1b[0m")
//返回的mboset
// mboset=mbo.getMboSet("!WFHISTORY","WFTRANSACTION",whereClause)
// mboset=mbo.getMboSet(ri.getName(),"WFTRANSACTION",whereClause)
mboset=mbo.getMboSet(ri.getName(),ri.getDest(),whereClause)

/**
 * 关联关系脚本
 * Mbo getMboSet 方法中
{
    "relationship": "WFHISTORY",
    "child": "WFTRANSACTION",
    "sks:whereClause:remark": "内容是 script:<脚本名称>",
    "whereClause": "script:RS_ALL_WFHISTORY",
    "remarks": "通过RS_ALL_WFHISTORY脚本获取mboset",
    "cardinality": "MULTIPLE"
}
 
{
  "owneremail": "",
  "createdbyid": "",
  "description": "通用关系,工作流历史",
  "sks:autoscript:remark": "脚本名无特殊要求",
  "sks:autoscript:suggested: "建议命名:<RS>_<关系所属主表>_<关系名>",
  "autoscript": "RS_ALL_WFHISTORY",
  "launchPoints": [],
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
  "autoscriptid": 254,
  "active": 1,
  "changedate": "2026-06-08T03:17:27+08:00",
  "ownerid": "",
  "version": "1.0.1",
  "orgid": "",
  "statusdate": "2026-06-08T03:17:27+08:00",
  "hasld": 0,
  "ibm_packagepath": "ibm.system.relationship",
  "loglevel": "INFO",
  "ownerphone": "",
  "category": "",
  "userdefined": 1,
  "status": "Draft",
  "createdbyname": ""
}
 */