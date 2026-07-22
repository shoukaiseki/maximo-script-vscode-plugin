// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load("nashorn:mozilla_compat.js");
scriptName = service.getScriptName();
/** @type {java.util.Arrays} */
Arrays = Java.type("java.util.Arrays");
/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");
/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");

/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");

/** @type {java.sql.Connection} */
Connection = Java.type("java.sql.Connection");
/** @type {java.sql.Statement} */
Statement = Java.type("java.sql.Statement");
/** @type {java.sql.ResultSet} */
ResultSet = Java.type("java.sql.ResultSet");

var clientsession = service.webclientsession();

Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true, printModel: false })

var appName = service.invokeScript("COMMON.UTILS", "getAppNameByMbo", [mbo]);
logger.info("[" + scriptName + "] script run appName: " + appName + " ,launchPoint:" + launchPoint)

// /** @type {java.lang.String} */
// var appTmp = app
// /** @type {java.lang.String} */
// var mboattrTmp = mboattr
// /** @type {java.lang.String} */
// var scriptNameTmp = scriptName
// /** @type {java.lang.String} */
// var launchPointTmp = launchPoint
// /** @type {java.lang.String} */
// var mbonameTmp = mboname
// /** @type {boolean} */
// var interactiveTmp = interactive
// /** @type {psdi.mbo.MboValue} */
// var mbovalueTmp = mbovalue
// /** @type {ScriptService} */
// var serviceTmp = service
// /** @type {psdi.mbo.Mbo} */
// var mboTmp = mbo
// /** @type {java.lang.String} */
// var userTmp = user

// //可能是initvalue脚本设置的那个值
// /** @type {java.lang.String} */
// var lookupnameTmp = lookupname
// //字段名如果是id,属性名就是 id_previous
// //<lower(attrname)_previous>  原来的值
// //<lower(attrname)_initial>  初始的值
// //<lower(attrname)           现在的值



if ("ibm_prlrpool".equalsIgnoreCase(appName)) {

} else {
  throw new MXApplicationException("#", "脚本" + scriptName + "中,未定义该应用的处理逻辑");
}


if (launchPoint == 'ACTION') {
  action()

} else if (launchPoint == 'LIST') {
  //方法中设置,必须在声明全局变量
  var relationObject
  var relationWhere

  var listWhere
  var listOrder

  //将另一个对象的哪个字段
  var srcKeys
  //存到当前对象的哪个字段
  var targetKeys
  lookup()
} else if (launchPoint == 'INIT') {
  init()
}

function lookup() {
  // 属性启动点 - 检索列表事件
  // 参考隐式变量
  relationObject = "LOCATIONS";
  relationWhere = "LOCATION=:ALN01 and SITEID=:SITEID";

  listWhere = "type in ( 'STOREROOM' ) and SITEID=:SITEID";

  // 排序
  listOrder = "LOCATIONSID asc";
  service.log("\x1b[32m[" + scriptName + "]当前 listWhere = " + listWhere + "\x1b[0m");



  // thisvalue=["IBM_STOREROOM","SITEID"]
  // lookupname=["LOCATION","SITEID"]
  //将另一个对象的哪个字段
  srcKeys = Arrays.asList(["LOCATION"]);
  //存到当前对象的哪个字段
  targetKeys = Arrays.asList(["ALN01"]);
}

function action(){

}



/**
 * 
{
  "autoscript": "IBM_VWPUBQUERY.ALN01.FLD",
  "description": "字段多启动点功能",
  "version": "1.0.6",
  "active": 1,
  "loglevel": "INFO",
  "scriptlanguage": "JavaScript",
  "interface": 0,
  "variables": [],
  "launchPoints": [
    {
      "launchpointname": "INIT",
      "description": "字段初始化功能",
      "objectname": "IBM_VWPUBQUERY",
      "attributename": "ALN01",
      "launchpointtype": "ATTRIBUTE",
      "objectevent": 2,
      "attributeevent": "0",
      "sks:eventtype": "初始化值",
      "eventtype": "",
      "sks:evcontext": "",
      "evcontext": "",
      "sks:addupdatedelete": "",
      "add": false,
      "update": false,
      "delete": false,
      "condition": "",
      "active": true
    },
    {
      "launchpointname": "LIST",
      "launchpointtype": "ATTRIBUTE",
      "objectname": "IBM_VWPUBQUERY",
      "attributename": "ALN01",
      "active": true,
      "description": "字段查找功能",
      "condition": "",
      "eventtype": "3",
      "objectevent": 1,
      "attributeevent": "3",
      "evcontext": "0",
      "add": true,
      "update": true,
      "delete": false
    },
    {
      "add": false,
      "sks:evcontext": "",
      "sks:addupdatedelete": "",
      "objectname": "IBM_VWPUBQUERY",
      "update": false,
      "description": "ACTION",
      "active": true,
      "attributename": "ALN01",
      "launchpointname": "ACTION",
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
  "status": "Draft",
  "langcode": "ZH",
  "userdefined": 1,
  "autoscriptid": 0,
  "ibm_packagepath": "ibm.vwpubquery.fld"
}
 */