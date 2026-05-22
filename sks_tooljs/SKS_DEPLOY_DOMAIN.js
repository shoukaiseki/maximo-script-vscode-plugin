/*
 *shoukaiseki this_is_auto_comment_donot_delete:这是导出的自动注释,不要删除,否则下次导出会出现重复注释
 * 脚本(AUTOSCRIPT): SKS_DOMAIN_SAVE
 * 脚本语言(SCRIPTLANGUAGE): nashorn
 * 描述(DESCRIPTION): 存储域定义到MAXDOMAIN表
 * 日志级别(LOGLEVEL): ERROR
 * 唯一标识(AUTOSCRIPTID): 269            语言代码(LANGCODE): ZH
 * 用户定义(USERDEFINED): Y               状态(STATUS): Draft
 * 是接口(INTERFACE): N                  活动(ACTIVE): Y
 * 变更人(CHANGEBY): MAXADMIN
 * 日期(CHANGEDATE): 2026/5/20 16:00:00
 *
 * Variables: 无
 *
 * Launch Points: 无
 */
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");
/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");

/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

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

        // 提取必填字段
        /** @type {string} */
        var domainId = requestData.domainid || "";
        /** @type {string} */
        var domainType = requestData.domaintype || "";

        // 验证必填字段
        if (!domainId) {
            throw new Error("domainid（域名）不能为空");
        }
        if (!domainType) {
            throw new Error("domaintype（域类型）不能为空");
        }

        // 提取可选字段
        /** @type {string} */
        var description = requestData.description || "";
        /** @type {string} */
        var maxType = requestData.maxtype || "";
        /** @type {number} */
        var length = requestData.length || 0;
        /** @type {number} */
        var scale = requestData.scale || 0;
        /** @type {number} */
        var internal = requestData.internal || 0;
        /** @type {boolean} */
        var neverCache = requestData.nevercache || false;

        // 保存或更新域定义
        saveOrUpdateDomain(domainId, domainType, description, maxType, length, scale, internal, neverCache);

        // 返回成功响应
        /** @type {Object} */
        var responseData = {
            status: "success",
            message: "域定义保存成功",
            data: {
                domainid: domainId,
                domaintype: domainType,
                description: description
            }
        };
        responseBody = JSON.stringify(responseData, null, 4);

    } catch (error) {
        logger.error("保存域定义失败: " + error.message);
        
        /** @type {Object} */
        var errorData = {
            status: "error",
            message: error.message
        };
        responseBody = JSON.stringify(errorData, null, 4);
    }
}

/**
 * 保存或更新域定义到MAXDOMAIN表
 * @param {string} domainId - 域名
 * @param {string} domainType - 域类型
 * @param {string} description - 描述
 * @param {string} maxType - 数据类型
 * @param {number} length - 长度
 * @param {number} scale - 小数位数
 * @param {number} internal - 内部标志
 * @param {boolean} neverCache - 禁用缓存
 */
function saveOrUpdateDomain(domainId, domainType, description, maxType, length, scale, internal, neverCache) {
    /** @type {psdi.mbo.MboSetRemote} */
    var domainSet = null;
    
    try {
        // 获取MAXDOMAIN表的MBO集合
        domainSet = MXServer.getMXServer().getMboSet("MAXDOMAIN", MXServer.getMXServer().getSystemUserInfo());
        
        // 查询是否已存在
        /** @type {psdi.mbo.SqlFormat} */
        var sqlf = new SqlFormat("domainid = :1");
        sqlf.setObject(1, "MAXDOMAIN", "DOMAINID", domainId);
        domainSet.setWhere(sqlf.format());
        domainSet.reset();
        
        /** @type {psdi.mbo.MboRemote} */
        var domainMbo;
        
        if (domainSet.isEmpty()) {
            // 创建新记录
            logger.info("创建新域定义: " + domainId);
            domainMbo = domainSet.add();
            domainMbo.setValue("DOMAINID", domainId);
        } else {
            // 更新现有记录
            logger.info("更新现有域定义: " + domainId);
            domainMbo = domainSet.getMbo(0);
        }
        
        // 设置字段值
        domainMbo.setValue("DOMAINTYPE", domainType);
        
        if (description) {
            domainMbo.setValue("DESCRIPTION", description);
        }
        
        if (maxType) {
            domainMbo.setValue("MAXTYPE", maxType,11);
        }
        
        if (length > 0) {
            domainMbo.setValue("LENGTH", length);
        }
        
        if (scale >= 0) {
            domainMbo.setValue("SCALE", scale);
        }
        
        domainMbo.setValue("INTERNAL", internal);
        domainMbo.setValue("NEVERCACHE", neverCache);
        
        // 保存记录
        domainSet.save();
        
        logger.info("域定义保存成功: DOMAINID=" + domainId + ", DOMAINTYPE=" + domainType);
        
    } catch (error) {
        logger.error("保存MAXDOMAIN表失败: " + error.message);
        throw error;
    } finally {
        // 清理资源
        if (domainSet) {
            domainSet.cleanup();
            domainSet.close();
        }
    }
}