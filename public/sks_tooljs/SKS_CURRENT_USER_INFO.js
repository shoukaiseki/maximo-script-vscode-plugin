// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
var sksLogAnsiUtils=service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("[SKS_CURRENT_USER_INFO]----------1");
/** @type {jscustom.AnsiLogger} */
var logger =sksLogAnsiUtils.newAnsiLogger({logger:loggerMX, ansiOpen:true})
logger.setLevel(Level.INFO);
logger.info("[SKS_CURRENT_USER_INFO]----------------Starting execution of script " + service.getScriptName());
logger.info("[SKS_CURRENT_USER_INFO]-------------webclientsession=" + service.webclientsession())

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");

/** @type {com.ibm.tivoli.maximo.rest.MOSJSONStructure} */
MOSJSONStructure = Java.type("com.ibm.tivoli.maximo.rest.MOSJSONStructure");//60

/** @type {psdi.iface.mos.ObjectStructureCache} */
ObjectStructureCache = Java.type("psdi.iface.mos.ObjectStructureCache");//61

/** @type {psdi.iface.mos.MosDetailInfo} */
MosDetailInfo = Java.type("psdi.iface.mos.MosDetailInfo");//62

/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");//19
/** @type {com.ibm.json.java.JSONObject} */
var jo=new JSONObject()

/** @type {com.ibm.json.java.JSONObject} */
var userInfoJo=new JSONObject()

 var objName = "MXPERUSER"; // 对象结构名字
 var sql= "PERSONID='"+userInfo.getPersonId()+"'";//过滤语句

 var peruser = mosNameToJson(objName,sql)

userInfoJo.put("personId", userInfo.getPersonId())
userInfoJo.put("langcode", userInfo.getLangCode())
// Locale 对象不能直接放入 JSONObject，需要转换为字符串
/** @type {java.util.Locale} */
var locale = userInfo.getLocale();
if (locale) {
    userInfoJo.put("locale", locale.toString())
    userInfoJo.put("localeLanguage", locale.getLanguage()||"")
    userInfoJo.put("localeCountry", locale.getCountry()||"")
}
// userInfo 对象也不能直接放入，如果需要可以序列化关键信息
// userInfoJo.put("userInfo", userInfo.getUserName())

if(request.getQueryParam("_langcode")!=='undefined'&&request.getQueryParam("_langcode")){
    var _langcode = request.getQueryParam("_langcode");
    // uInfo.setLocale(lang);
    userInfo.setLangCode(_langcode.toLowerCase())
    logger.info("[SKS_CURRENT_USER_INFO]------------------_langcode=" + userInfo.getLocale().getLanguage() + ",country=" + userInfo.getLocale().getCountry());
}

var data=new JSONObject()
// userInfo 对象需要转换为字符串或提取关键信息
userInfoJo.put("userName", userInfo.getUserName())
userInfoJo.put("personId", userInfo.getPersonId())
userInfoJo.put("displayname", userInfo.getDisplayName())


sql="APP in('CONFIGUR','DESIGNER','USER','SECURGROUP','AUTOSCRIPT')";
 var maxapp = mosNameToJSONArray('MXAPIMAXAPP',sql)

data.put("userInfo",userInfoJo);

data.put("peruser",peruser)
data.put("maxapps",maxapp)
jo.put("data",data),
jo.put("status","success")
var responseBodyStr = service.jsonToString(jo)
responseBody = responseBodyStr;

/**
 调用说明：
 var objName = "MXPERSON"; // 对象结构名字
 var sql= "personid='MAXADMIN'";//过滤语句
 var args=[objName,sql];
 var json = service.invokeScript("COMMON.OBJTOJSON","mosNameToJson",args);

 */

function mosNameToJson(objectStructureName, whereClause) {
    /** @type {psdi.server.MXServer} */
    var mxServer = MXServer.getMXServer();
    var maximoId = "";

    /** @type {com.ibm.tivoli.maximo.rest.MOSJSONStructure} */
    var mosJson = new MOSJSONStructure(
        objectStructureName,
        "Query",
        false, false, false, false, false, false,
        false, false,
        true,
        false,
        true
    );

    /** @type {psdi.iface.mos.MosDetailInfo} */
    var mosInfo = ObjectStructureCache.getInstance().getMosInfo(objectStructureName);

    var primaryObjectName = mosInfo.getPrimaryMosDetailInfo().getObjectName();

    var mboSet = mxServer.getMboSet(primaryObjectName, userInfo);

    if (whereClause !== null && whereClause !== "") {
        mboSet.setWhere(whereClause);
    } else {
        throw new MXApplicationException("##", "whereClause参数不能为空");
    }

    mboSet.reset();

    maximoId = mboSet.getMbo(0).getUniqueIDValue();

/** @type {com.ibm.json.java.OrderedJSONObject} */
    var jsonObject = mosJson.serializeMboSetAsJSONObject(mboSet, 0, mboSet.count());
    logger.info("[SKS_CURRENT_USER_INFO]----------------mosJson.serializeMboSetAsJSONObject(jsonObject)" + service.jsonToString(jsonObject));

    var responseKey = "Query" + objectStructureName + "Response";
    var setKey = objectStructureName + "Set";

    var dataArray = jsonObject.get(responseKey).get(setKey).get(primaryObjectName);

    mboSet.close();

    // 构建返回对象，优先添加 maximoId 和 primaryObjectName
    if (dataArray.size() === 1) {
        var result = dataArray.get(0);
        result.maximoId = maximoId;
        result.objectName = primaryObjectName;
        return result
    }else{
    var result = new JSONObject()
        return result;
    }

}

function mosNameToJSONArray(objectStructureName, whereClause) {
    /** @type {psdi.server.MXServer} */
    var mxServer = MXServer.getMXServer();

    /** @type {com.ibm.tivoli.maximo.rest.MOSJSONStructure} */
    var mosJson = new MOSJSONStructure(
        objectStructureName,
        "Query",
        false, false, false, false, false, false,
        false, false,
        true,
        false,
        true
    );

    /** @type {psdi.iface.mos.MosDetailInfo} */
    var mosInfo = ObjectStructureCache.getInstance().getMosInfo(objectStructureName);


    var primaryObjectName = mosInfo.getPrimaryMosDetailInfo().getObjectName();
    var mboSet = mxServer.getMboSet(primaryObjectName, userInfo);

    if (whereClause !== null && whereClause !== "") {
        mboSet.setWhere(whereClause);
    } else {
        throw new MXApplicationException("##", "whereClause参数不能为空");
    }

    mboSet.reset();

/** @type {com.ibm.json.java.OrderedJSONObject} */
    var jsonObject = mosJson.serializeMboSetAsJSONObject(mboSet, 0, mboSet.count());
    mboSet.close();
    if(logger.isDebugEnabled()){
        logger.info("[SKS_CURRENT_USER_INFO]----------------mosJson.serializeMboSetAsJSONObject(jsonObject)" + service.jsonToString(jsonObject));
    }

    var responseKey = "Query" + objectStructureName + "Response";
    var setKey = objectStructureName + "Set";

    return jsonObject.get(responseKey).get(setKey).get(primaryObjectName);


}