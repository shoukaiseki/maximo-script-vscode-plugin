// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// LOGGER 管理接口
// 调用方式: POST /oslc/script/SKS_LOGGER_MANAGE
// 请求体格式(数组):
// [
//   {
//     "logger": "maximo.script.TEST",       // 必填,查询主记录用
//     "loglevel": "DEBUG",                   // 日志级别: DEBUG,ERROR,FATAL,INFO,WARN
//     "logkey": "maximo.script.TEST",        // 日志键
//     "active": 1,                           // 是否激活 0/1
//     "children": [                          // 子记录(可选)
//       {
//         "logger": "maximo.script.TEST.sub",
//         "loglevel": "INFO",
//         "logkey": "maximo.script.TEST.sub",
//         "active": 1
//       }
//     ]
//   }
// ]
// 主记录不存在时自动新增
// 子记录不存在时自动新增,已存在时更新
// 更新时只修改 loglevel

// LOGLEVEL 可选值: DEBUG,ERROR,FATAL,INFO,WARN

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");

/** @type {java.util.HashMap} */
HashMap = Java.type("java.util.HashMap");

/** @type {com.ibm.json.java.JSONArray} */
JSONArray = Java.type("com.ibm.json.java.JSONArray");
/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");

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
/** @type {jscustom.AnsiLogger} */
var logger =sksLogAnsiUtils.newAnsiLogger({logger:loggerMX, ansiOpen:true})
logger.info("["+scriptName+"]----------------Starting execution of script " + service.getScriptName());

main();

function main() {
    if (typeof requestBody === "undefined" || !requestBody) {
        responseBody = JSON.stringify({ status: "error", message: "请求体不能为空" });
        return;
    }

    var items;
    try {
        items = JSON.parse(requestBody);
    } catch (e) {
        responseBody = JSON.stringify({ status: "error", message: "JSON 解析失败: " + e.message });
        return;
    }

    if (!Array.isArray(items)) {
        responseBody = JSON.stringify({ status: "error", message: "请求体必须是数组" });
        return;
    }

    var results = [];
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var result = processMainLogger(item);
        results.push(result);
    }

    responseBody = JSON.stringify({
        status: "success",
        message: "处理完成",
        total: items.length,
        results: results
    });
    
    // 应用日志配置
    applyLoggingSettings();
}

/**
 * 处理单个主记录
 * @param {Object} item
 * @returns {Object}
 */
function processMainLogger(item) {
    var loggerName = item.logger;
    if (!loggerName) {
        return { logger: "(空)", status: "error", message: "logger 名称不能为空" };
    }

    var mainSet = null;
    try {
        // 按 LOGGER 名称查找主记录
        mainSet = MXServer.getMXServer().getMboSet("MAXLOGGER", userInfo);
        mainSet.setWhere("LOGGER='" + loggerName.replace(/'/g, "''") + "'");
        mainSet.reset();

        if (mainSet.isEmpty()) {
            // 主记录不存在,自动新增
            /** @type {psdi.mbo.MboRemote} */
            var mainMbo = mainSet.add();
            mainMbo.setValue("LOGGER", loggerName, MboConstants.NOACCESSCHECK);
            mainMbo.setValue("LOGKEY", item.logkey || ("log4j.logger.maximo." + loggerName), MboConstants.NOACCESSCHECK);
            if (item.loglevel !== null && item.loglevel !== undefined) {
                mainMbo.setValue("LOGLEVEL", item.loglevel, MboConstants.NOACCESSCHECK);
            }
            if (item.active !== null && item.active !== undefined) {
                mainMbo.setValue("ACTIVE", item.active, MboConstants.NOACCESSCHECK);
            }
            mainSet.save();
            logger.info("["+scriptName+"] 新增主记录: LOGGER=" + loggerName);

            var mainResult = {
                logger: loggerName,
                loglevel: mainMbo.getString("LOGLEVEL"),
                logkey: mainMbo.getString("LOGKEY"),
                active: mainMbo.getInt("ACTIVE"),
                status: "success",
                message: "新增成功"
            };

            // 处理子记录
            if (item.children && Array.isArray(item.children) && item.children.length > 0) {
                mainResult.children = processChildLoggers(mainMbo, item.children);
            }
            return mainResult;
        }

        var mainMbo = mainSet.getMbo(0);

        // 更新主表字段
        if (item.loglevel !== null && item.loglevel !== undefined) {
            mainMbo.setValue("LOGLEVEL", item.loglevel, MboConstants.NOACCESSCHECK);
        }
        if (item.active !== null && item.active !== undefined) {
            mainMbo.setValue("ACTIVE", item.active, MboConstants.NOACCESSCHECK);
        }

        mainSet.save();

        var childResults = [];
        // 处理子记录
        if (item.children && Array.isArray(item.children) && item.children.length > 0) {
            childResults = processChildLoggers(mainMbo, item.children);
        }

        var mainResult = {
            logger: loggerName,
            loglevel: mainMbo.getString("LOGLEVEL"),
            logkey: mainMbo.getString("LOGKEY"),
            active: mainMbo.getInt("ACTIVE"),
            status: "success",
            message: "更新成功",
            children: childResults
        };

        return mainResult;

    } catch (e) {
        logger.error("["+scriptName+"] 处理 LOGGER '" + loggerName + "' 失败: " + e);
        return { logger: loggerName, status: "error", message: e.toString() };
    } finally {
        _close(mainSet);
    }
}

/**
 * 处理子记录 - 通过 CHILDLOGGERS 关系
 * 子记录如果已存在则更新,不存在则新增
 * @param {psdi.mbo.MboRemote} parentMbo
 * @param {Array} children
 * @returns {Array}
 */
function processChildLoggers(parentMbo, children) {
    var results = [];

    // 获取当前已有的子记录,按 LOGGER 建立映射
    var childSet = parentMbo.getMboSet("CHILDLOGGERS");
    try {
        childSet.reset();
        var existingMap = {};
        if (!childSet.isEmpty()) {
            var childMbo = childSet.moveFirst();
            while (childMbo) {
                var childLogger = childMbo.getString("LOGGER");
                if (childLogger) {
                    existingMap[childLogger] = childMbo;
                }
                childMbo = childSet.moveNext();
            }
        }

        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            var childLoggerName = child.logger;
            if (!childLoggerName) {
                results.push({ logger: "(空)", status: "error", message: "子记录 logger 名称不能为空" });
                continue;
            }

            try {
                var childMbo = existingMap[childLoggerName];

                if (childMbo) {
                    // 更新已有子记录
                    if (child.loglevel !== null && child.loglevel !== undefined) {
                        childMbo.setValue("LOGLEVEL", child.loglevel, MboConstants.NOACCESSCHECK);
                    }
                    if (child.active !== null && child.active !== undefined) {
                        childMbo.setValue("ACTIVE", child.active, MboConstants.NOACCESSCHECK);
                    }
                    results.push({
                        logger: childLoggerName,
                        status: "success",
                        message: "子记录更新成功"
                    });
                } else {
                    // 新增子记录 - 不设置 logkey
                    var newChild = childSet.add();
                    newChild.setValue("LOGGER", childLoggerName, MboConstants.NOACCESSCHECK);
                    if (child.loglevel !== null && child.loglevel !== undefined) {
                        newChild.setValue("LOGLEVEL", child.loglevel, MboConstants.NOACCESSCHECK);
                    }
                    if (child.active !== null && child.active !== undefined) {
                        newChild.setValue("ACTIVE", child.active, MboConstants.NOACCESSCHECK);
                    }
                    results.push({
                        logger: childLoggerName,
                        status: "success",
                        message: "子记录新增成功"
                    });
                }
            } catch (e) {
                logger.error("["+scriptName+"] 处理子记录 '" + childLoggerName + "' 失败: " + e);
                results.push({ logger: childLoggerName, status: "error", message: e.toString() });
            }
        }

        childSet.save();

    } catch (e) {
        logger.error("["+scriptName+"] 获取子记录集合失败: " + e);
        results.push({ logger: "(子表)", status: "error", message: e.toString() });
    }
    // 子MboSet由父级管理,不需要独立close

    return results;
}

/**
 * 应用日志配置 - 调用 LoggingService.applySettings 使配置立即生效
 * 对应 LoggingAppBean 中的:
 *   LoggingServiceRemote loggingService = (LoggingServiceRemote)s.lookup("LOGGING");
 *   loggingService.applySettings(false);
 */
function applyLoggingSettings() {
    try {
        /** @type {psdi.server.MXServer} */
        var mxServer = MXServer.getMXServer();
        var loggingService = mxServer.lookup("LOGGING");
        loggingService.applySettings(false);
        logger.info("["+scriptName+"] 日志配置已应用");
    } catch (e) {
        logger.error("["+scriptName+"] 应用日志配置失败: " + e);
    }
}

/**
 * 关闭 MboSet
 */
function _close(mboSet){
    try{
        if (mboSet) {
            try { mboSet.cleanup(); } catch (ignored) { }
            try { mboSet.close(); } catch (eignored) { }
        }
    }catch(ignored){ }
}
