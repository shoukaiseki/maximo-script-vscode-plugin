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

var scriptName = "SKS_COMMONS_UTILS"

/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());


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
 * 获取MBO的属性值，自动转换为Java类型
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.Object} 属性值
 */
function getValueAutoType(service,mbo,attributeName){
    //Date,DateTime
    return ScriptUtil.getValueFromMaxType(mbo.getMboValue(attributeName).getMaxType())
}