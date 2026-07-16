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

/** @type {java.lang.String} */
var appTmp = app
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
/** @type {psdi.mbo.MboValue} */
var mbovalueTmp = mbovalue
/** @type {ScriptService} */
var serviceTmp = service
/** @type {psdi.mbo.Mbo} */
var mboTmp = mbo
/** @type {java.lang.String} */
var userTmp = user

//可能是initvalue脚本设置的那个值
/** @type {java.lang.String} */
var lookupnameTmp = lookupname
//字段名如果是id,属性名就是 id_previous
//<lower(attrname)_previous>  原来的值
//<lower(attrname)_initial>  初始的值
//<lower(attrname)           现在的值


//方法中设置,必须在声明全局变量
var relationObject
var relationWhere

var listWhere
var listOrder

    //将另一个对象的哪个字段
var srcKeys 
    //存到当前对象的哪个字段
var targetKeys 

//如果想返回listMboSet,必须设置listMboSet
//如果不设置值,不能声明该变量,否则mboset永远null
// var listMboSet = null

main()
var appName = service.invokeScript("COMMON.UTILS", "getAppNameByMbo", [mbo]);

function main() {
  // 属性启动点 - 检索列表事件
  // 参考隐式变量
  relationObject = "LOCATIONS";
  relationWhere = "LOCATION=:IBM_STOREROOM";

  listWhere = "type in ( 'STOREROOM' )";

  // 排序
  listOrder = "LOCATIONSID asc";

  service.log("当前 listWhere = " + listWhere);


  // thisvalue=["IBM_STOREROOM","SITEID"]
  // lookupname=["LOCATION","SITEID"]

  //将另一个对象的哪个字段
  srcKeys = Arrays.asList(["LOCATION"]);
  //存到当前对象的哪个字段
  targetKeys = Arrays.asList(["IBM_STOREROOM"]);

  var clientsession = service.webclientsession();
  clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "----删除----" + mbo.getString("STATUS"), 1);

}


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