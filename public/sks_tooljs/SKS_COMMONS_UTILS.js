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