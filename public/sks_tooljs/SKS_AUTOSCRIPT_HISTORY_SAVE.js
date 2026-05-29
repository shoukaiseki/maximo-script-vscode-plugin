/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="/javaapi/global.d.ts" />
/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");
/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");

/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

logger.info
main();

function main() {
    try {
        // 验证请求体是否存在
        if (typeof requestBody === "undefined" || !requestBody) {
            throw new Error("请求体(requestBody)不能为空");
        }

        // 解析请求体
        /** @type {Object} */
        var requestData = JSON.parse(requestBody);

        // 提取需要的字段
        /** @type {string} */
        var autoScript = requestData.autoscript || requestData.autoscript || "";
        /** @type {string} */
        var source = requestData.source || requestData.source || "";
        /** @type {string} */
        var version = requestData.version || requestData.version || "";
        /** @type {string} */
        var aliasName = requestData.aliasname || requestData.aliasname || "";
        /** @type {string} */
        var hostname = requestData.hostname || requestData.hostname || getHostname();

        // 验证必填字段
        if (!autoScript) {
            throw new Error("AUTOSCRIPT字段不能为空");
        }

        // 保存到IBM_AUTOSCRIPT_HISTORY表
        saveToHistory(autoScript, source, version, aliasName, hostname);

        // 返回成功响应
        /** @type {Object} */
        var response = {
            status: "success",
            message: "脚本历史记录保存成功",
            data: {
                AUTOSCRIPT: autoScript,
                VERSION: version,
                ALIASNAME: aliasName,
                HOSTNAME: hostname
            }
        };
        responseBody = JSON.stringify(response, null, 4);

    } catch (error) {
        logger.error("保存脚本历史记录失败: " + error.message);
        
        /** @type {Object} */
        var response = {
            status: "error",
            message: error.message
        };
        responseBody = JSON.stringify(response, null, 4);
    }
}

/**
 * 保存脚本历史记录到IBM_AUTOSCRIPT_HISTORY表
 */
function saveToHistory(autoScript, source, version, aliasName, hostname) {
    /** @type {psdi.mbo.MboSetRemote} */
    var historySet = null;
    
    try {
        // 获取IBM_AUTOSCRIPT_HISTORY表的MBO集合
        historySet = MXServer.getMXServer().getMboSet("IBM_AUTOSCRIPT_HISTORY", MXServer.getMXServer().getSystemUserInfo());
        
        // 创建新记录
        /** @type {psdi.mbo.MboRemote} */
        var historyMbo = historySet.add();
        
        // 设置字段值
        historyMbo.setValue("AUTOSCRIPT", autoScript);
        historyMbo.setValue("SOURCE", source);
        historyMbo.setValue("VERSION", version);
        historyMbo.setValue("ALIASNAME", aliasName);
        historyMbo.setValue("HOSTNAME", hostname);
        
        // 保存记录
        historySet.save();
        
        logger.info("脚本历史记录保存成功: AUTOSCRIPT=" + autoScript + ", VERSION=" + version);
        
    } catch (error) {
        logger.error("保存IBM_AUTOSCRIPT_HISTORY表失败: " + error.message);
        throw error;
    } finally {
        // 清理资源
        if (historySet) {
            historySet.cleanup();
            historySet.close();
        }
    }
}

/**
 * 获取主机名
 */
function getHostname() {
    try {
        /** @type {java.net.InetAddress} */
        var InetAddress = Java.type("java.net.InetAddress");
        return InetAddress.getLocalHost().getHostName();
    } catch (error) {
        logger.warn("无法获取主机名，使用默认值: " + error.message);
        return "unknown";
    }
}