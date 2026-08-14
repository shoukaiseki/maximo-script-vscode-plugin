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


// var appName = service.invokeScript("COMMON.UTILS", "getAppNameByMbo", [mbo]);
var appName = getAppNameByMbo(mbo)

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

// var clientsession = service.webclientsession();
// clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "----删除----" + mbo.getString("STATUS"), 1);


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