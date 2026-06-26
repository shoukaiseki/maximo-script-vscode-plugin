// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//增加引用
/** @type {java.util.Arrays} */
Arrays = Java.type("java.util.Arrays");
// var variableName = mbo;

// 属性启动点 - 检索列表事件
// 参考隐式变量
var relationObject = "LOCATIONS";
var relationWhere = "LOCATION=:IBM_STOREROOM";

listWhere = "type in ( 'STOREROOM' )";

// 排序
listOrder = "LOCATIONSID asc";

service.log("当前 listWhere = " + listWhere);


// thisvalue=["IBM_STOREROOM","SITEID"]
// lookupname=["LOCATION","SITEID"]

//将另一个对象的哪个字段
srcKeys = Arrays.asList(["LOCATION"]);
//存到当前对象的哪个字段
targetKeys= Arrays.asList(["IBM_STOREROOM"]);

var clientsession = service.webclientsession();
clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "----删除----" + mbo.getString("STATUS"), 1);


/**
AttributeLaunchPoint
{
  "owneremail": "",
  "createdbyid": "",
  "description": "IBM_ITEM_APPLYLINE.IBM_STOREROOM.list",
  "sks:autoscript:remark": "脚本名无特殊要求",
  "sks:autoscript:suggested: "建议命名<表名>.<字段名>.LIST",
  "autoscript": "ITEM.ITEMNUM.LIST",
  "launchPoints": [
    {
      "launchpointtype": "ATTRIBUTE",
      "addupdatedelete": "",
      "condition": "",
      "attributeevent": "3",
      "sks:objectname:remark": "表名称",
      "objectname": "ITEM",
      "sks:attributename:remark": "字段名称",
      "attributename": "ITEMNUM",
      "description": "ITEM.ITEMNUM.LIST",
      "active": "Y",
      "eventtype": "",
      "launchpointname": "ITEM.ITEMNUM.LIST",
      "objectevent": "64",
      "evcontext": ""
    }
  ],
  "createdbyemail": "",
  "interface": 0,
  "scriptlanguage": "javascript",
  "langcode": "ZH",
  "createdby": "MAXZHCN",
  "siteid": "",
  "action": "",
  "createdbyphone": "",
  "scheduledstatus": "",
  "owner": "MAXZHCN",
  "variables": [],
  "comments": "",
  "ownername": "",
  "changeby": "MAXADMIN",
  "active": 1,
  "ownerid": "",
  "version": "1.0.1",
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