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
  "launchPoints": [
    {
      "launchpointtype": "ATTRIBUTE",
      "addupdatedelete": "",
      "condition": "",
      "attributeevent": "3",
      "objectname": "IBM_ITEM_APPLYLINE",
      "description": "IBM_ITEM_APPLYLINE.IBM_STOREROOM.list",
      "active": "Y",
      "eventtype": "",
      "attributename": "IBM_STOREROOM",
      "launchpointname": "IBM_ITEM_APPLYLINE.IBM_STORERO",
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
  "autoscript": "IBM_ITEM_APPLYLINE.IBM_STOREROOM.LIST",
  "ownername": "",
  "changeby": "MAXADMIN",
  "autoscriptid": 87,
  "active": 1,
  "changedate": "2026-05-28T09:08:15+08:00",
  "ownerid": "",
  "version": "1.0.13",
  "orgid": "",
  "statusdate": "2026-05-27T16:04:34+08:00",
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