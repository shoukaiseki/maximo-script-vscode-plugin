// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//可用于控制字段只读

// load('nashorn:mozilla_compat.js');
// importPackage(java.io);
// importPackage(java.sql);

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");//13

/** @type {java.util.HashMap} */
HashMap = Java.type("java.util.HashMap");


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
var sksLogAnsiUtils=service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("["+scriptName+"]----------1");
/** @type {jscustom.AnsiLogger} */
var logger =sksLogAnsiUtils.newAnsiLogger({logger:loggerMX, ansiOpen:true})
// logger.setLevel(Level.INFO);
logger.info("["+scriptName+"]----------------Starting execution of script " + service.getScriptName());
logger.info("["+scriptName+"]-------------webclientsession=" + service.webclientsession())

/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");//67

/** @type {java.util.Date} */
Date = Java.type("java.util.Date");

/** @type {java.lang.String} */
var requestBodyTmp=requestBody

/** @type {psdi.security.UserInfo} */
var userInfoTmp=userInfo

/** @type {com.ibm.tivoli.maximo.oslc.provider.OslcRequest} */
var requestTmp=request

/** @type {java.util.HashMap} */
var responseHeadersTmp=responseHeaders

/** @type {java.lang.String} */
var httpMethodTmp=httpMethod


// var clientsession = service.webclientsession();
//接口中获取不到的
// clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "----删除----" + mbo.getString("STATUS"), 1);
StructureData = Java.type("psdi.iface.mic.StructureData");
String = Java.type("java.lang.String");

var mboSet = MXServer.getMXServer().getMboSet("ITEM", userInfoTmp);


var data={}
//占位符后面只支持数字
var whereSource="STATUSDATE <  :1 "
/** @type {psdi.mbo.SqlFormat} */
var sqlFormat = new SqlFormat(whereSource);
//占位符的值
sqlFormat.setDate(1, new Date())
var sql1 = getMboSetCountByWhere(mboSet,sqlFormat.format())
sql1['whereSource']=whereSource
data["SqlFormat1"] = sql1;

whereSource = "itemnum =  :1 ";
sqlFormat = new SqlFormat(whereSource);
sqlFormat.setString(1, "'asus")
sql1 = getMboSetCountByWhere(mboSet,sqlFormat.format())
sql1['whereSource']=whereSource
data["SqlFormat2"] = sql1;


//占位符可以不按顺序来
whereSource = "itemnum =  :22 and rotating= :11";
var itemnum="')"
sqlFormat = new SqlFormat(whereSource);
sqlFormat.setObject(22, "ITEM", "ITEMNUM",itemnum)
var rotating=0
sqlFormat.setObject(11, "ITEM", "ROTATING",rotating)
sql1 = getMboSetCountByWhere(mboSet,sqlFormat.format())
sql1['whereSource']=whereSource
data["SqlFormat3"] = sql1;

itemnum="'"
whereSource = "itemnum =  '"+itemnum+"'";
sql1 = getMboSetCountByWhere(mboSet,whereSource)
sql1['whereSource']=whereSource
data["sql1"] = sql1;


var result={
    "status": "success",
    "data": data,
    "message": "Script executed successfully"
}
//返回的header使用responseHeaders变量设置,默认是"application/json"
// responseHeaders.put("content-type", "application/json");

//返回的设置到responseBody变量,String类型或者 byte[]类型
responseBody = JSON.stringify(result);


function getMboSetCountByWhere(mboSet, whereClause){
    try{

        mboSet.setWhere(whereClause);
        mboSet.reset()
        return {
            "whereTarget": whereClause,
            "count": mboSet.count()
        }
    }catch(e){
        logger.error("getMboSetCountByWhere error:" , e)
        return {
            "error": e.toString()
        }
    }
}

function _close(mboSet){
    try{
        if (mboSet) {
            try { mboSet.cleanup() } catch (ignored) { }
            try { mboSet.close() } catch (eignored) { }
        }
    }catch(ignored){ }
}

