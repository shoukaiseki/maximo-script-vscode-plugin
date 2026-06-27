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

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");

/** @type {com.ibm.tivoli.maximo.rest.MboJSONStructure} */
MboJSONStructure = Java.type("com.ibm.tivoli.maximo.rest.MboJSONStructure");

/** @type {com.ibm.tivoli.maximo.oslc.provider.OslcMboJsonSerializer} */
OslcMboJsonSerializer = Java.type("com.ibm.tivoli.maximo.oslc.provider.OslcMboJsonSerializer");

/** @type {com.ibm.json.java.OrderedJSONObject} */
OrderedJSONObject = Java.type("com.ibm.json.java.OrderedJSONObject");

/** @type {java.util.HashSet} */
HashSet = Java.type("java.util.HashSet");

/** @type {java.util.Set} */
Set = Java.type("java.util.Set");

/** @type {psdi.iface.mos.ConversionUtil} */
ConversionUtil = Java.type("psdi.iface.mos.ConversionUtil");

/** @type {javax.xml.bind.DatatypeConverter} */
DatatypeConverter = Java.type("javax.xml.bind.DatatypeConverter");
var scriptName=service.getScriptName()
String = Java.type("java.lang.String");

/** @type {java.util.Date} */
Date = Java.type("java.util.Date");

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

var jsonObjectMode=false

var results = new JSONObject()
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
    testTypeMbo.setValue("FIELD_10", new Date());
    testTypeMbo.setValue("FIELD_11", new Date());
    testTypeMbo.setValue("FIELD_12", 1);
    testTypeMbo.setValue("FIELD_13", 0);
    testTypeMbo.setValue("FIELD_14", 99.99);
    testTypeMbo.setValue("FIELD_15", 888);
    testTypeMbo.setValue("FIELD_16", 9999999999);
    testTypeMbo.setValue("FIELD_17", new Date());
    testTypeMbo.setValue("FIELD_18", 55.55);
    testTypeMbo.setValue("FIELD_19", "01-001-001-001");
    testTypeMbo.setValue("FIELD_22", new Date());
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
    
    var testTypeMbo2 = testTypeMboSet.add()
    testTypeMbo2.setValue("FIELD_01", "第二条记录");
    testTypeMbo2.setValue("FIELD_02", 54321);
    testTypeMbo2.setValue("FIELD_10", new Date());
    
    testTypeMboSet.save();
    logger.info("["+scriptName+"] 测试数据写入完成");
    
    // ====== 方案1: MboJSONStructure Compact 模式（推荐）======
    logger.info("["+scriptName+"] --- 方案1: MboJSONStructure Compact 模式 ---");
    var result1 = serializeMboWithCompactMode(testTypeMbo);
    results.put("方案1_MboJSONStructure_Compact", result1);
    
    // ====== 方案2: MboJSONStructure 非 Compact 模式（完整格式）======
    logger.info("["+scriptName+"] --- 方案2: MboJSONStructure 非 Compact 模式 ---");
    var result2 = serializeMboWithFullMode(testTypeMbo);
    results.put("方案2_MboJSONStructure_Full", result2);
    
    // ====== 方案3: MboJSONStructure 只序列化指定字段 ======
    logger.info("["+scriptName+"] --- 方案3: MboJSONStructure 指定字段 ---");
    var result3 = serializeMboWithSpecificFields(testTypeMbo);
    results.put("方案3_MboJSONStructure_SpecificFields", result3);
    
    // ====== 方案4: OslcMboJsonSerializer 方式 ======
    logger.info("["+scriptName+"] --- 方案4: OslcMboJsonSerializer ---");
    var result4 = serializeMboWithOslcSerializer(testTypeMbo);
    results.put("方案4_OslcMboJsonSerializer", result4);
    
    // ====== 方案5: 手动遍历属性构建 JSONObject ======
    logger.info("["+scriptName+"] --- 方案5: 手动遍历属性 ---");
    var result5 = serializeMboManually(testTypeMbo);
    results.put("方案5_Manual_Iteration", result5);
    
    // ====== 方案6: MboJSONStructure 序列化 MboSet ======
    logger.info("["+scriptName+"] --- 方案6: MboJSONStructure 序列化 MboSet ---");
    var result6 = serializeMboSetWithMboJSONStructure(testTypeMboSet);
    results.put("方案6_MboJSONStructure_MboSet", result6);
    
}catch(e){
    logger.error("["+scriptName+"] Error: " , e);
    results.put("status", "error");
    results.put("message", e.toString());
}finally{
    _close(testTypeMboSet)
}

// var clientsession = service.webclientsession();
//接口中获取不到的
// clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "----删除----" + mbo.getString("STATUS"), 1);

/**
 * 方案1: MboJSONStructure Compact模式 - 推荐方案
 * 
 * 特点:
 *   - compact=true: 属性直接以键值对形式输出，无Attributes包装层
 *   - dropNulls=true: 自动忽略空值字段，减少输出体积
 *   - 输出简洁，适合API响应场景
 * 
 * 输出格式示例:
 *   {
 *     "TEST_TYPE": {
 *       "FIELD_01": "ALN测试文本",
 *       "FIELD_02": 12345,
 *       "FIELD_10": "2026-06-27T10:30:00"
 *     }
 *   }
 * 
 * @param {psdi.mbo.MboRemote} mbo - 要序列化的MBO对象
 * @returns {com.ibm.json.java.OrderedJSONObject} - 序列化后的JSON对象
 */
function serializeMboWithCompactMode(mbo) {
    try {
        var mboJson = new MboJSONStructure(
            false,   // verbose: false=不格式化输出
            true,    // dropNulls: true=忽略空值字段
            false,   // locale: false=不需要本地化内容
            null,    // cols: null=所有字段
            false,   // exclude: false=cols为包含模式
            false,   // retainMbos: false=设置为discardable
            false,   // generic: false=使用具体对象名
            false,   // metaData: false=不需要元数据
            true,    // compact: true=紧凑格式(推荐)
            false,   // calculateEtag: false=不需要ETag
            false,   // useTotalCount: false=不需要总数
            false    // keys: false=返回所有字段
        );
        var ojo = new OrderedJSONObject();
        mboJson.serializeMbo(ojo, mbo);
        var jsonStr = ojo.serialize(false);
        logger.info("["+scriptName+"] Compact模式输出: " + jsonStr.substring(0, Math.min(500, jsonStr.length)) + "...");
        return ojo;
    } catch (e) {
        logger.error("["+scriptName+"] Compact模式失败: " + e);
        return null;
    }
}

/**
 * 方案2: MboJSONStructure 非Compact模式(完整格式)
 * 
 * 特点:
 *   - compact=false: 属性嵌套在Attributes对象中，每个属性有content字段
 *   - 包含完整的元数据结构，适合需要详细字段信息的场景
 *   - 输出体积较大，但信息完整
 * 
 * 输出格式示例:
 *   {
 *     "TEST_TYPE": {
 *       "Attributes": {
 *         "FIELD_01": { "content": "ALN测试文本" },
 *         "FIELD_02": { "content": 12345 }
 *       }
 *     }
 *   }
 * 
 * @param {psdi.mbo.MboRemote} mbo - 要序列化的MBO对象
 * @returns {com.ibm.json.java.OrderedJSONObject} - 序列化后的JSON对象
 */
function serializeMboWithFullMode(mbo) {
    try {
        var mboJson = new MboJSONStructure(
            false,   // verbose: false=不格式化输出
            true,    // dropNulls: true=忽略空值字段
            false,   // locale: false=不需要本地化内容
            null,    // cols: null=所有字段
            false,   // exclude: false=cols为包含模式
            false,   // retainMbos: false=设置为discardable
            false,   // generic: false=使用具体对象名
            false,   // metaData: false=不需要元数据
            false,   // compact: false=完整格式
            false,   // calculateEtag: false=不需要ETag
            false,   // useTotalCount: false=不需要总数
            false    // keys: false=返回所有字段
        );
        var ojo = new OrderedJSONObject();
        mboJson.serializeMbo(ojo, mbo);
        var jsonStr = ojo.serialize(false);
        logger.info("["+scriptName+"] Full模式输出: " + jsonStr.substring(0, Math.min(500, jsonStr.length)) + "...");
        return ojo;
    } catch (e) {
        logger.error("["+scriptName+"] Full模式失败: " + e);
        return null;
    }
}

/**
 * 方案3: MboJSONStructure 指定字段模式
 * 
 * 特点:
 *   - 通过cols参数指定要序列化的字段列表
 *   - exclude=false表示cols是包含列表(只序列化指定字段)
 *   - 性能最优，减少数据传输量
 *   - 每种MaxType类型选取一个代表性字段进行测试
 * 
 * 字段类型对照:
 *   FIELD_01: ALN      - 字符串类型
 *   FIELD_02: INTEGER  - 整数类型
 *   FIELD_03: UPPER    - 大写字符串
 *   FIELD_04: DURATION - 时长类型
 *   FIELD_06: AMOUNT   - 金额类型
 *   FIELD_10: DATETIME - 日期时间类型
 *   FIELD_12: YORN     - 布尔类型
 *   FIELD_14: DECIMAL  - 小数类型
 *   FIELD_16: BIGINT   - 大整数类型
 *   FIELD_17: DATE     - 日期类型
 *   FIELD_24: CLOB     - 大文本类型
 *   FIELD_26: BLOB     - 二进制类型
 *   FIELD_27: CRYPTOX  - 加密扩展类型
 *   FIELD_28: CRYPTO   - 加密类型
 *   FIELD_29: FLOAT    - 浮点类型
 *   FIELD_30: TIME     - 时间类型
 *   FIELD_31: SMALLINT - 小整数类型
 *   FIELD_32: LOWER    - 小写字符串
 * 
 * 适用场景:
 *   - 只需要部分字段时使用
 *   - 敏感字段过滤
 *   - 性能优化场景
 * 
 * @param {psdi.mbo.MboRemote} mbo - 要序列化的MBO对象
 * @returns {com.ibm.json.java.OrderedJSONObject} - 序列化后的JSON对象
 */
function serializeMboWithSpecificFields(mbo) {
    try {
        var includeCols = new HashSet();
        // 每种类型一个代表性字段
        includeCols.add("FIELD_01");  // ALN - 字符串
        includeCols.add("FIELD_02");  // INTEGER - 整数
        includeCols.add("FIELD_03");  // UPPER - 大写字符串
        includeCols.add("FIELD_04");  // DURATION - 时长
        includeCols.add("FIELD_06");  // AMOUNT - 金额
        includeCols.add("FIELD_10");  // DATETIME - 日期时间
        includeCols.add("FIELD_12");  // YORN - 布尔
        includeCols.add("FIELD_14");  // DECIMAL - 小数
        includeCols.add("FIELD_16");  // BIGINT - 大整数
        includeCols.add("FIELD_17");  // DATE - 日期
        includeCols.add("FIELD_24");  // CLOB - 大文本
        includeCols.add("FIELD_26");  // BLOB - 二进制
        includeCols.add("FIELD_27");  // CRYPTOX - 加密扩展
        includeCols.add("FIELD_28");  // CRYPTO - 加密
        includeCols.add("FIELD_29");  // FLOAT - 浮点
        includeCols.add("FIELD_30");  // TIME - 时间
        includeCols.add("FIELD_31");  // SMALLINT - 小整数
        includeCols.add("FIELD_32");  // LOWER - 小写字符串
        
        var mboJson = new MboJSONStructure(
            false,       // verbose: false=不格式化输出
            true,        // dropNulls: true=忽略空值字段
            false,       // locale: false=不需要本地化内容
            includeCols, // cols: 指定包含的字段列表(每种类型一个)
            false,       // exclude: false=cols为包含模式
            false,       // retainMbos: false=设置为discardable
            false,       // generic: false=使用具体对象名
            false,       // metaData: false=不需要元数据
            true,        // compact: true=紧凑格式
            false,       // calculateEtag: false=不需要ETag
            false,       // useTotalCount: false=不需要总数
            false        // keys: false=返回所有字段
        );
        var ojo = new OrderedJSONObject();
        mboJson.serializeMbo(ojo, mbo);
        var jsonStr = ojo.serialize(false);
        logger.info("["+scriptName+"] 指定字段输出: " + jsonStr);
        return ojo;
    } catch (e) {
        logger.error("["+scriptName+"] 指定字段模式失败: " + e);
        return null;
    }
}

/**
 * 方案4: OslcMboJsonSerializer方式
 * 
 * 特点:
 *   - 遵循OSLC(Open Services for Lifecycle Collaboration)标准
 *   - 输出包含href等OSLC标准字段
 *   - 需要OslcRequest上下文，适用于REST API Handler场景
 * 
 * 输出格式示例:
 *   {
 *     "href": "/oslc/os/test_type/123",
 *     "FIELD_01": "ALN测试文本",
 *     "FIELD_02": 12345
 *   }
 * 
 * 注意:
 *   - 需要request变量存在(OSLC请求上下文)
 *   - 如果request为空，返回错误信息
 * 
 * @param {psdi.mbo.MboRemote} mbo - 要序列化的MBO对象
 * @returns {com.ibm.json.java.JSONObject} - 序列化后的JSON对象或错误信息
 */
function serializeMboWithOslcSerializer(mbo) {
    try {
        if (request == null) {
            logger.warn("["+scriptName+"] request为空，跳过OslcMboJsonSerializer方案");
            var result = new JSONObject();
            result.put("error", "request为空，OslcMboJsonSerializer需要OSLC请求上下文");
            return result;
        }
        var mboSer = new OslcMboJsonSerializer("*", request);
        var jo = mboSer.serializeMbo(mbo);
        logger.info("["+scriptName+"] OslcMboJsonSerializer输出: " + jo.serialize().substring(0, Math.min(500, jo.serialize().length)) + "...");
        return jo;
    } catch (e) {
        logger.error("["+scriptName+"] OslcMboJsonSerializer失败: " + e);
        var result = new JSONObject();
        result.put("error", e.toString());
        return result;
    }
}

/**
 * 方案5: 手动遍历属性构建JSONObject
 * 
 * 特点:
 *   - 完全自定义控制，逐个字段处理
 *   - 根据MaxType类型码选择合适的get方法
 *   - BLOB字段使用Base64编码
 *   - 灵活性最高，可添加自定义逻辑
 * 
 * 适用场景:
 *   - 需要特殊字段处理逻辑
 *   - 需要添加自定义计算字段
 *   - 需要控制字段顺序
 * 
 * @param {psdi.mbo.MboRemote} mbo - 要序列化的MBO对象
 * @returns {com.ibm.json.java.JSONObject} - 序列化后的JSON对象
 */
function serializeMboManually(mbo) {
    var row = new JSONObject();
    try {
        for (var i = 1; i < 33; i++) {
            if (i == 20 || i == 21) continue;
            var attrName = "FIELD_" + (i < 10 ? "0" + i : i);
            if (!mbo.isNull(attrName)) {
                var val = getValueByMaxType(mbo, attrName);
                row.put(attrName, val);
            }
        }
        logger.info("["+scriptName+"] 手动遍历输出: " + row.serialize().substring(0, Math.min(500, row.serialize().length)) + "...");
        return row;
    } catch (e) {
        logger.error("["+scriptName+"] 手动遍历失败: " + e);
        return row;
    }
}

/**
 * 根据MaxType类型码获取字段值 (与MboJSONStructure方案一相同的转换策略)
 * 
 * 转换策略与MboJSONStructure compact模式保持一致:
 *   - 字符串类型: getString() -> 直接返回字符串
 *   - 日期类型: getDate() -> ConversionUtil.dateToString() -> ISO 8601字符串
 *   - 整数类型: getLong() -> 直接返回数字(long)
 *   - 小数类型: getDouble() -> 直接返回数字(double)
 *   - 布尔类型: getBoolean() -> 直接返回布尔值
 *   - 加密类型: getString() -> MXCipher加密 -> DatatypeConverter Base64编码
 *   - BLOB类型: getBytes() -> DatatypeConverter Base64编码
 * 
 * MaxType类型码对照表:
 *   0-2,13-14,17: ALN/UPPER/LOWER等字符串类型
 *   3-5: DATETIME/DATE/TIME日期类型
 *   6-7,19: INTEGER/BIGINT/SMALLINT整数类型
 *   8-11: DECIMAL/AMOUNT/FLOAT等小数类型
 *   12: YORN布尔类型
 *   15: CRYPTO加密类型
 *   18: BLOB二进制类型
 * 
 * @param {psdi.mbo.MboRemote} mbo - MBO对象
 * @param {string} attrName - 属性名
 * @returns {*} - 字段值(字符串/数字/布尔/Base64字符串)
 */
function getValueByMaxType(mbo, attrName) {
    try {
        var mboValueInfo = mbo.getThisMboSet().getMboSetInfo().getAttribute(attrName);
        var maxType = mboValueInfo.getTypeAsInt();
        switch (maxType) {
            case 0:  
            case 1:  
            case 2:  
            case 13: 
            case 14: 
            case 17: 
                return mbo.getString(attrName);
            case 3:  
            case 4:  
            case 5:  
                if (mbo.isNull(attrName)) {
                    return null;
                }
                var dateVal = mbo.getDate(attrName);
                return ConversionUtil.dateToString(dateVal);
            case 6:  
            case 7:  
            case 19: 
                return mbo.getLong(attrName);
            case 8:  
            case 9:  
            case 10: 
            case 11: 
                return mbo.getDouble(attrName);
            case 12: 
                return mbo.getBoolean(attrName);
            case 15: 
                var clearTextVal = mbo.getString(attrName);
                if (clearTextVal == null) {
                    return null;
                }
                var encData = MXServer.getMXServer().getMXCipher().encData(clearTextVal);
                return DatatypeConverter.printBase64Binary(encData);
            case 18: 
                var bytes = mbo.getBytes(attrName);
                if (bytes == null) {
                    return null;
                }
                return DatatypeConverter.printBase64Binary(bytes);
            default:
                return mbo.getString(attrName);
        }
    } catch (e) {
        logger.error("["+scriptName+"] getValueByMaxType error for " + attrName + ": " + e);
        return null;
    }
}

/**
 * 方案6: MboJSONStructure 序列化MboSet集合
 * 
 * 特点:
 *   - 一次性序列化整个MboSet，包含多条记录
 *   - useTotalCount=true: 返回rsTotal总数信息
 *   - 支持分页参数(startIndex, maxCount)
 *   - 输出包含rsStart/rsCount/rsTotal分页信息
 * 
 * 输出格式示例:
 *   {
 *     "TEST_TYPEMboSet": {
 *       "rsStart": 0,
 *       "rsCount": 2,
 *       "rsTotal": 2,
 *       "TEST_TYPE": [
 *         { "FIELD_01": "记录1", "FIELD_02": 123 },
 *         { "FIELD_01": "记录2", "FIELD_02": 456 }
 *       ]
 *     }
 *   }
 * 
 * @param {psdi.mbo.MboSetRemote} mboSet - 要序列化的MboSet集合
 * @returns {com.ibm.json.java.OrderedJSONObject} - 序列化后的JSON对象
 */
function serializeMboSetWithMboJSONStructure(mboSet) {
    try {
        var mboJson = new MboJSONStructure(
            false,   // verbose: false=不格式化输出
            true,    // dropNulls: true=忽略空值字段
            false,   // locale: false=不需要本地化内容
            null,    // cols: null=所有字段
            false,   // exclude: false=cols为包含模式
            false,   // retainMbos: false=设置为discardable
            false,   // generic: false=使用具体对象名
            false,   // metaData: false=不需要元数据
            true,    // compact: true=紧凑格式
            false,   // calculateEtag: false=不需要ETag
            true,    // useTotalCount: true=返回总数
            false    // keys: false=返回所有字段
        );
        var ojo = mboJson.serializeMboSetAsJSONObject(mboSet, 0, -1);
        var jsonStr = ojo.serialize(false);
        logger.info("["+scriptName+"] MboSet输出: " + jsonStr.substring(0, Math.min(800, jsonStr.length)) + "...");
        return ojo;
    } catch (e) {
        logger.error("["+scriptName+"] MboSet序列化失败: " + e);
        return null;
    }
}


results.put("status", "success");
results.put("message", "所有序列化方案执行完成");

responseBody = service.jsonToString(results);




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