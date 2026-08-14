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
// logger.setLevel(Level.INFO);
service.log_info("\x1b[32m[" + scriptName + "]-------------Starting execution of script " + service.getScriptName()+"\x1b[0m")
service.log_info("\x1b[32m[" + scriptName + "]-------------webclientsession=" + service.webclientsession()+"\x1b[0m")


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
var appName = getAppNameByMbo(mbo)

//还有一个字段名相同的变量, 值是通过 ScriptUtil.getValueFromMaxType(this.getMboValue().getMaxType()) 获取
main()

function main(){
  var clientsession = service.webclientsession();
  if ("ITEM".equalsIgnoreCase(appName)) {
    // if("ITEM"===mbo.getName()){

    // }
  }
    //ACTION不会有提示
    // clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("ibm_system", "option_ok"));
    //抛出异常会在字段中提示输入的值无效
  // throw new MXApplicationException("ibm_system", "option_ok")

}

/**
 * 因为调用其他脚本耗时更长,初始化又是最影响速度的脚本类型,所以需要使用最小执行效率来编写
 * 
 * 获取应用名称,通常用于子表获取appName
 * @param {*} mbo
 * @param {*} frequency
 * @returns
 */
function getAppNameByMbo(mbo, frequency) {
    // 防止无限递归，设置最大递归深度
    var maxDepth = 5;
    var currentDepth = (frequency === undefined || frequency == null) ? 0 : frequency;

    if (currentDepth >= maxDepth) {
        return null;
    }

    if (mbo == null) {
        return null;
    }

    // 获取当前MBO的应用名称
    var app = mbo.getThisMboSet().getApp();

    // 如果当前应用名称有效，直接返回
    if (app != null && app !== "") {
        return app;
    }

    // 如果当前没有应用名称，尝试从父级获取
    var parent = mbo.getOwner();
    if (parent != null) {
        // 递归调用，深度+1
        return getAppNameByMbo(parent, currentDepth + 1);
    }

    // 没有父级且当前也没有应用名称，返回null
    return null;
}

/**
初始化时候触发
AttributeLaunchPoint 类中
 
{
  "owneremail": "",
  "createdbyid": "",
  "description": "ITEMNUM字段初始化触发",
  "sks:autoscript:remark": "脚本名无特殊要求",
  "sks:autoscript:suggested: "建议命名<表名>.<字段名>.INIT",
  "autoscript": "ITEM.ITEMNUM.INIT",
  "launchPoints": [
    {
      "sks:evcontext": "",
      "sks:addupdatedelete": "",
      "sks:objectname:remark": "表名称",
      "objectname": "ITEM",
      "sks:attributename:remark": "字段名称",
      "attributename": "ITEMNUM",
      "launchpointname": "ITEMNUM.INIT",
      "description": "ITEM.ITEMNUM.INIT",
      "active": true,
      "objectevent": 1,
      "launchpointtype": "ATTRIBUTE",
      "condition": "",
      "attributeevent": "0",
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