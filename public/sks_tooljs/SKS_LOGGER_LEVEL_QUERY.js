/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var MXLogger = Java.type("psdi.util.logging.MXLogger");
/** @type {java.util.Hashtable} */
var Hashtable = Java.type("java.util.HashMap");

/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

main();

function main() {
    try {
        // 验证请求体
        if (typeof requestBody === "undefined" || !requestBody) {
            /** @type {psdi.util.MXApplicationException} */
            var MXApplicationException = Java.type("psdi.util.MXApplicationException");
            throw new MXApplicationException("error", "请求体不能为空");
        }
        
        // 解析请求数据
        /** @type {Object} */
        var requestData = JSON.parse(requestBody);
        
        /** @type {Array} */
        var loggers = requestData.loggers;
        
        logger.info("开始查询日志记录器级别");
        
        // 获取日志级别信息
        /** @type {Object} */
        var result = getLoggerLevels(loggers);
        
        // 返回成功响应
        responseBody = JSON.stringify(result, null, 4);
        
    } catch (error) {
        logger.error("查询日志级别失败: " + error.message);
        
        /** @type {Object} */
        var errorData = {
            success: false,
            message: error.message,
            result: []
        };
        responseBody = JSON.stringify(errorData, null, 4);
    }
}

/**
 * 获取日志记录器的级别信息
 * @param {Array} loggers - 日志记录器名称数组，每个元素包含 loggerName 字段。如果为空则查询所有
 * @returns {Object} 包含 success、message 和 result 的响应对象
 */
function getLoggerLevels(loggers) {
    try {
        /** @type {java.util.Hashtable} */
        var allLoggers = MXLoggerFactory.loggers;
        
        /** @type {Array} */
        var resultList = [];
        
        // 判断是否查询所有日志记录器
        /** @type {boolean} */
        var queryAll = !loggers || !Array.isArray(loggers) || loggers.length === 0;
        
        if (queryAll) {
            logger.info("未指定 loggers 参数，查询所有 " + allLoggers.size() + " 个日志记录器");
            
            // 遍历所有日志记录器
            /** @type {java.util.Set} */
            var entrySet = allLoggers.entrySet();
            /** @type {java.util.Iterator} */
            var iterator = entrySet.iterator();
            
            while (iterator.hasNext()) {
                /** @type {java.util.Map.Entry} */
                var entry = iterator.next();
                /** @type {string} */
                var loggerName = entry.getKey();
                /** @type {psdi.util.logging.Log4jLogger} */
                var mxLogger = entry.getValue();
                
                /** @type {string} */
                var level = "INHERITED";
                
                if (mxLogger && mxLogger.getLevel()) {
                    level = mxLogger.getLevel().toString();
                }
                
                /** @type {Object} */
                var loggerInfo = {
                    loggerName: loggerName,
                    level: level
                };
                
                resultList.push(loggerInfo);
            }
            
        } else {
            logger.info("查询指定的 " + loggers.length + " 个日志记录器");
            
            // 查询指定的日志记录器
            for (var i = 0; i < loggers.length; i++) {
                /** @type {string} */
                var loggerName = loggers[i].loggerName;
                
                if (!loggerName) {
                    logger.warn("跳过空的 loggerName");
                    continue;
                }
                
                /** @type {string} */
                var level = "NOT_FOUND";
                
                // 尝试从 MXLoggerFactory 中获取日志记录器
                if (allLoggers.containsKey(loggerName)) {
                    /** @type {psdi.util.logging.Log4jLogger} */
                    var mxLogger = allLoggers.get(loggerName);
                    
                    if (mxLogger && mxLogger.getLevel()) {
                        level = mxLogger.getLevel().toString();
                    } else {
                        level = "INHERITED";
                    }
                } else {
                    // 如果日志记录器不存在，尝试获取它（这会创建一个新的）
                    try {
                        /** @type {psdi.util.logging.MXLogger} */
                        var newLogger = MXLoggerFactory.getLogger(loggerName);
                        
                        if (newLogger && newLogger.getLevel()) {
                            level = newLogger.getLevel().toString();
                        } else {
                            level = "INHERITED";
                        }
                        
                        logger.info("已创建新的日志记录器: " + loggerName + ", 级别: " + level);
                        
                    } catch (getError) {
                        logger.warn("无法获取日志记录器 " + loggerName + ": " + getError.message);
                        level = "ERROR_GETTING";
                    }
                }
                
                /** @type {Object} */
                var loggerInfo = {
                    loggerName: loggerName,
                    level: level
                };
                
                resultList.push(loggerInfo);
            }
        }
        
        logger.info("成功获取 " + resultList.length + " 个日志记录器的级别信息");
        
        return {
            success: true,
            message: "OK",
            result: resultList
        };
        
    } catch (error) {
        logger.error("获取日志级别信息失败: " + error.message);
        
        /** @type {psdi.util.MXApplicationException} */
        var MXApplicationException = Java.type("psdi.util.MXApplicationException");
        throw new MXApplicationException("error", "获取日志级别信息失败: " + error.message);
    }
}