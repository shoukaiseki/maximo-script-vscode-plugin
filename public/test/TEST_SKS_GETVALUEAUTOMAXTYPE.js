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

/** @type {com.ibm.json.java.JSONArray} */
JSONArray = Java.type("com.ibm.json.java.JSONArray");//17

/** @type {com.ibm.json.java.JSONArtifact} */
JSONArtifact = Java.type("com.ibm.json.java.JSONArtifact");//18

/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");//19
/** @type {com.ibm.tivoli.maximo.script.ScriptUtil} */
ScriptUtil = Java.type("com.ibm.tivoli.maximo.script.ScriptUtil");
/** @type {psdi.iface.mos.ConversionUtil} */
ConversionUtil = Java.type("psdi.iface.mos.ConversionUtil");

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");
var scriptName=service.getScriptName()
String = Java.type("java.lang.String");

Timestamp = Java.type("java.sql.Timestamp");

/** @type {java.util.Date} */
JavaDate = Java.type("java.util.Date");

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

/** @type {psdi.mbo.MboSetRemote} */
var testTypeMboSet = MXServer.getMXServer().getMboSet("TEST_TYPE", userInfo);

var jsonObjectMode = request.getQueryParam("jsonObjectMode") == "true"

var dataJs = []
var data = new JSONArray()
try{
    testTypeMboSet.setWhere("1=2");
    testTypeMboSet.reset()
    var testTypeMbo = testTypeMboSet.add()

    // ====== 设置测试数据 ======
    testTypeMbo.setValue("FIELD_01", "ALN测试文本");
    testTypeMbo.setValue("FIELD_02", 12345);
    testTypeMbo.setValue("FIELD_03", "UPPER_TEXT");
    testTypeMbo.setValue("FIELD_04", 3600);
    testTypeMbo.setValue("FIELD_05", 7200);
    testTypeMbo.setValue("FIELD_06", 1234.56);
    testTypeMbo.setValue("FIELD_07", "ALN描述文本");
    testTypeMbo.setValue("FIELD_08", "WILDCARD_VAL");
    testTypeMbo.setValue("FIELD_09", 7890.12);
    testTypeMbo.setValue("FIELD_10", new JavaDate());
    testTypeMbo.setValue("FIELD_11", new JavaDate());
    testTypeMbo.setValue("FIELD_12", 1);
    testTypeMbo.setValue("FIELD_13", 0);
    testTypeMbo.setValue("FIELD_14", 99.99);
    testTypeMbo.setValue("FIELD_15", 888);
    testTypeMbo.setValue("FIELD_16", 9999999999);
    testTypeMbo.setValue("FIELD_17", new JavaDate());
    testTypeMbo.setValue("FIELD_18", 55.55);
    testTypeMbo.setValue("FIELD_19", "01-001-001-001");
    testTypeMbo.setValue("FIELD_22", new JavaDate());
    testTypeMbo.setValue("FIELD_23", 8888888888);
    testTypeMbo.setValue("FIELD_24", "CLOB大文本内容测试");
    testTypeMbo.setValue("FIELD_25", "第二个CLOB大文本内容测试");
    testTypeMbo.setValue("FIELD_26", new String("BLOB测试二进制数据").getBytes());
    testTypeMbo.setValue("FIELD_27", "加密扩展测试值");
    testTypeMbo.setValue("FIELD_28", "加密测试值");
    testTypeMbo.setValue("FIELD_29", 3.14159);
    testTypeMbo.setValue("FIELD_30", java.sql.Time.valueOf("13:30:00"));
    testTypeMbo.setValue("FIELD_31", 123);
    testTypeMbo.setValue("FIELD_32", "lowercase_text");
    if(jsonObjectMode){
        data.add(getMboTOJSONObject(testTypeMbo))
    }else{
        dataJs.push(getMboTOJSONObject(testTypeMbo))
    }
    testTypeMbo = testTypeMboSet.add()
    if(jsonObjectMode){
        data.add(getMboTOJSONObject(testTypeMbo))
    }else{
        dataJs.push(getMboTOJSONObject(testTypeMbo))
    }
    
    testTypeMboSet.save();
    logger.info("["+scriptName+"] 测试数据写入完成");
    // for(var testType=testTypeMboSet.moveFirst();testType;testType=testTypeMboSet.moveNext()){
    //     data.put(getMboTOJSONObject(testType))
    // }
}catch(e){
    logger.error("["+scriptName+"] Error: " , e);
}finally{

    _close(testTypeMboSet)
}

// var clientsession = service.webclientsession();
//接口中获取不到的
// clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "----删除----" + mbo.getString("STATUS"), 1);

function getMboTOJSONObject(mbo){
    var row = jsonObjectMode?new JSONObject():{}
    for (var i = 1; i < 33; i++) {
        if(i==20||i==21)continue;
        var attrName = "FIELD_" + (i < 10 ? "0" + i : i);
        var val = null;
        if (!mbo.isNull(attrName)) {
            val =ScriptUtil.getValueFromMaxType(mbo.getMboValue(attrName).getMaxType())
        }
        logger.info("["+scriptName+"] getMboTOJSONObject attrName=" + attrName+",isNull="+mbo.isNull(attrName)+",val="+val)
        if(jsonObjectMode){
            row.put(attrName, val)
        }else{
            logger.info("[" + scriptName + "] getMboTOJSONObject attrName=" + attrName + ",val.type=" + typeof val + ",val=" + val)
            if(val&&isJavaDateTime(val)) {
                 var ms = val.getTime();
                //  ms = val.getDate();
                if (ms != null) {
                    // val = new Date(ms); // 正常转为JS Date
                    val = ConversionUtil.dateToString(val)
                }
            } 
            logger.info("[" + scriptName + "] getMboTOJSONObject attrName=" + attrName + ",val2.type=" + typeof val + ",val2=" + val)
            row[attrName] = val
            // try{
            //只能转换数组等
                // val = Java.from(val)
                // logger.info("[" + scriptName + "] getMboTOJSONObject attrName=" + attrName + ",isNull=" + mbo.isNull(attrName) + ",val=" + val + ",val2=" + val)
            // }catch(e){}
        }
    }
    return row
}


var result = null
if(jsonObjectMode){
    result = new JSONObject()
    result.put("data", data)
    result.put("status", "success")
    result.put("message", "Script executed successfully")
}else{
    result={
        "data": dataJs,
        "status": "success",
        "message": "Script executed successfully"
    }
}
//返回的header使用responseHeaders变量设置,默认是"application/json"
// responseHeaders.put("content-type", "application/json");

//返回的设置到responseBody变量,String类型或者 byte[]类型

if(jsonObjectMode){
    responseBody = service.jsonToString(result);
}else{
    responseBody = JSON.stringify(result);
}

// 判断是否为Java日期时间对象
function isJavaDateTime(val) {
    return val != null && (val instanceof JavaDate || val instanceof Timestamp);
}

function _close(mboSet){
    try{
        if (mboSet) {
            try { mboSet.cleanup() } catch (ignored) { }
            try { mboSet.close() } catch (eignored) { }
        }
    }catch(ignored){ }
}





/**

{
  "maxObjects": [
    {
      "object": "TEST_TYPE",
      "description": "测试字段类型表",
      "attributes": [
        {
          "searchType": "NONE",
          "length": 46,
          "description": "类型01",
          "scale": 0,
          "positive": false,
          "title": "类型01",
          "type": "ALN",
          "required": false,
          "attribute": "FIELD_01"
        },
        {
          "searchType": "EXACT",
          "length": 32,
          "description": "类型02",
          "scale": 0,
          "positive": false,
          "title": "类型02",
          "type": "INTEGER",
          "required": false,
          "attribute": "FIELD_02"
        },
        {
          "searchType": "NONE",
          "length": 64,
          "description": "类型03",
          "scale": 0,
          "positive": false,
          "title": "类型03",
          "type": "UPPER",
          "required": false,
          "attribute": "FIELD_03"
        },
        {
          "searchType": "EXACT",
          "length": 8,
          "description": "类型04",
          "scale": 0,
          "positive": false,
          "title": "类型04",
          "type": "DURATION",
          "required": false,
          "attribute": "FIELD_04"
        },
        {
          "searchType": "EXACT",
          "length": 8,
          "description": "类型05",
          "scale": 0,
          "positive": false,
          "title": "类型05",
          "type": "DURATION",
          "required": false,
          "attribute": "FIELD_05"
        },
        {
          "searchType": "EXACT",
          "length": 10,
          "description": "类型06",
          "scale": 2,
          "positive": false,
          "title": "类型06",
          "type": "AMOUNT",
          "required": false,
          "attribute": "FIELD_06"
        },
        {
          "searchType": "NONE",
          "length": 200,
          "description": "类型07",
          "scale": 0,
          "positive": false,
          "title": "类型07",
          "type": "ALN",
          "required": false,
          "attribute": "FIELD_07"
        },
        {
          "searchType": "WILDCARD",
          "length": 64,
          "description": "类型08",
          "scale": 0,
          "positive": false,
          "title": "类型08",
          "type": "UPPER",
          "required": false,
          "attribute": "FIELD_08"
        },
        {
          "searchType": "EXACT",
          "length": 10,
          "description": "类型09",
          "scale": 2,
          "positive": false,
          "title": "类型09",
          "type": "AMOUNT",
          "required": false,
          "attribute": "FIELD_09"
        },
        {
          "searchType": "EXACT",
          "length": 10,
          "description": "类型10",
          "scale": 0,
          "positive": false,
          "title": "类型10",
          "type": "DATETIME",
          "required": false,
          "attribute": "FIELD_10"
        },
        {
          "searchType": "EXACT",
          "length": 10,
          "description": "类型11",
          "scale": 0,
          "positive": false,
          "title": "类型11",
          "type": "DATETIME",
          "required": false,
          "attribute": "FIELD_11"
        },
        {
          "searchType": "NONE",
          "length": 1,
          "description": "类型12",
          "scale": 0,
          "positive": false,
          "title": "类型12",
          "type": "YORN",
          "required": false,
          "attribute": "FIELD_12"
        },
        {
          "searchType": "NONE",
          "length": 1,
          "description": "类型13",
          "scale": 0,
          "positive": false,
          "title": "类型13",
          "type": "YORN",
          "required": false,
          "attribute": "FIELD_13"
        },
        {
          "searchType": "EXACT",
          "length": 15,
          "description": "类型14",
          "scale": 2,
          "positive": false,
          "title": "类型14",
          "type": "DECIMAL",
          "required": false,
          "attribute": "FIELD_14"
        },
        {
          "searchType": "EXACT",
          "length": 12,
          "description": "类型15",
          "scale": 0,
          "positive": false,
          "title": "类型15",
          "type": "INTEGER",
          "required": false,
          "attribute": "FIELD_15"
        },
        {
          "searchType": "EXACT",
          "length": 19,
          "description": "类型16",
          "scale": 0,
          "positive": false,
          "title": "类型16",
          "type": "BIGINT",
          "required": false,
          "attribute": "FIELD_16"
        },
        {
          "searchType": "EXACT",
          "length": 4,
          "description": "类型17",
          "scale": 0,
          "positive": false,
          "title": "类型17",
          "type": "DATE",
          "required": false,
          "attribute": "FIELD_17"
        },
        {
          "searchType": "EXACT",
          "length": 15,
          "description": "类型18",
          "scale": 2,
          "positive": false,
          "title": "类型18",
          "type": "DECIMAL",
          "required": false,
          "attribute": "FIELD_18"
        },
        {
          "searchType": "WILDCARD",
          "length": 110,
          "description": "类型19",
          "scale": 0,
          "positive": false,
          "title": "类型19",
          "type": "ALN",
          "required": false,
          "attribute": "FIELD_19"
        },
        {
          "searchType": "EXACT",
          "length": 4,
          "description": "类型22",
          "scale": 0,
          "positive": false,
          "title": "类型22",
          "type": "DATE",
          "required": false,
          "attribute": "FIELD_22"
        },
        {
          "searchType": "EXACT",
          "length": 19,
          "description": "类型23",
          "scale": 0,
          "positive": false,
          "title": "类型23",
          "type": "BIGINT",
          "required": false,
          "attribute": "FIELD_23"
        },
        {
          "searchType": "NONE",
          "length": 999999,
          "description": "类型24",
          "scale": 0,
          "positive": false,
          "title": "类型24",
          "type": "CLOB",
          "required": false,
          "attribute": "FIELD_24"
        },
        {
          "searchType": "NONE",
          "length": 999999,
          "description": "类型25",
          "scale": 0,
          "positive": false,
          "title": "类型25",
          "type": "CLOB",
          "required": false,
          "attribute": "FIELD_25"
        },
        {
          "searchType": "NONE",
          "length": 999999,
          "description": "类型26",
          "scale": 0,
          "positive": false,
          "title": "类型26",
          "type": "BLOB",
          "required": false,
          "attribute": "FIELD_26"
        },
        {
          "searchType": "EXACT",
          "length": 128,
          "description": "类型27",
          "scale": 0,
          "positive": false,
          "title": "类型27",
          "type": "CRYPTOX",
          "required": false,
          "attribute": "FIELD_27"
        },
        {
          "searchType": "EXACT",
          "length": 128,
          "description": "类型28",
          "scale": 0,
          "positive": false,
          "title": "类型28",
          "type": "CRYPTO",
          "required": false,
          "attribute": "FIELD_28"
        },
        {
          "searchType": "EXACT",
          "length": 15,
          "description": "类型29",
          "scale": 4,
          "positive": false,
          "title": "类型29",
          "type": "FLOAT",
          "required": false,
          "attribute": "FIELD_29"
        },
        {
          "searchType": "EXACT",
          "length": 4,
          "description": "类型30",
          "scale": 0,
          "positive": false,
          "title": "类型30",
          "type": "TIME",
          "required": false,
          "attribute": "FIELD_30"
        },
        {
          "searchType": "EXACT",
          "length": 6,
          "description": "类型31",
          "scale": 0,
          "positive": false,
          "title": "类型31",
          "type": "SMALLINT",
          "required": false,
          "attribute": "FIELD_31"
        },
        {
          "searchType": "WILDCARD",
          "length": 100,
          "description": "类型32",
          "scale": 0,
          "positive": false,
          "title": "类型32",
          "type": "LOWER",
          "required": false,
          "attribute": "FIELD_32"
        }
      ]
    }
  ]
}

 
 */