// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// commonsUtils=service.invokeScript("SKS_COMMONS_UTILS");
// load('nashorn:mozilla_compat.js');
/** @type {psdi.mbo.MboRemote} */
MboRemote = Java.type("psdi.mbo.MboRemote");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");
/** @type {com.ibm.tivoli.maximo.script.ScriptUtil} */
ScriptUtil = Java.type("com.ibm.tivoli.maximo.script.ScriptUtil");

/** @type {psdi.iface.mos.ConversionUtil} */
ConversionUtil = Java.type("psdi.iface.mos.ConversionUtil");

var scriptName = "SKS_COMMONS_UTILS"

/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

/**
 * 获取应用名称,通常用于子表获取appName
 var appName = service.invokeScript("SKS_COMMONS_UTILS", "getAppNameByMbo", [mbo]);
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
 * 获取MBO的布尔值
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.Boolean} 属性值
 */
function getMboBooleanValue(service, mbo, attributeName)
{
    if (mbo.isNull(attributeName)) {
        return null
    }
    return mbo.getBoolean(attributeName);
}


/**
 * 获取MBO的整数值
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.Integer} 属性值
 */
function getMboIntValue(service, mbo, attributeName)
{
    if (mbo.isNull(attributeName)) {
        return null
    }
    return mbo.getInt(attributeName);
}



/**
 * 获取MBO的长整型值
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.Long} 属性值
 */
function getMboLongValue(service, mbo, attributeName){
    if (mbo.isNull(attributeName)) {
        return null
    }
    return mbo.getLong(attributeName);
}

/**
 * 获取MBO的字符串值,允许null
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.String} 属性值
 */
function getMboStringValue(service, mbo, attributeName)
{

    logger.debug("getMboStringValue")
    if (mbo.isNull(attributeName)) {
        return null
    }
    return mbo.getString(attributeName);
}

/**
 * 获取MBO的日期值
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.String} 属性值
 */
function getMboDateValue(service, mbo, attributeName){
    return formatDateTime(mbo.getDate(attributeName))
}

// 辅助函数：格式化日期时间
function formatDateTime(date) {
  try {

    // 1. 创建 SimpleDateFormat 实例
    // 注意：X 模式在 Java 7+ 支持，XXX 表示 +08:00 格式
    var sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX");

    // 2. 重要：设置时区
    // 如果不设置，会使用 JVM 默认时区，可能导致偏移量不符合预期
    sdf.setTimeZone(TimeZone.getTimeZone("GMT+8"));

    //2026-05-16T05:48:25+08:00
    // 使用 ISO 8601
    // 3. 执行格式化
    return sdf.format(date);

  } catch (e) {
    return null; // 出错时返回原值
  }
}

/**
 * 获取MBO的属性值，自动转换为Java类型,不适合转json时候使用
 * 
 * 因为时间格式对应ibm的JSONObject转换成json会异常,使用JSON.stringify转换会忽略掉
 *                          
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.Object} 属性值
 */
function getValueAutoType(service,mbo,attributeName){
    //Date,DateTime
    return ScriptUtil.getValueFromMaxType(mbo.getMboValue(attributeName).getMaxType())
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
function getValueByMaxType(service,mbo, attrName) {
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