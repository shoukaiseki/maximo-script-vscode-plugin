/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />

/*
 更新日志级别
 */
// 1. 解析 requestBody 中的 JSON
var body = requestBody;
if (!body || body.trim().length === 0) {
    service.error("BMXAA7901E", "请求 body 不能为空，请传入 JSON 数据");
}

var data;
try {
    data = JSON.parse(body);
} catch (e) {
    service.error("BMXAA7901E", "请求 body 不是合法的 JSON");
}

if (!data.loggers || !Array.isArray(data.loggers)) {
    service.error("BMXAA7901E", "请求 body 中必须包含 loggers 数组");
}

// 2. 准备日志组件
var MXLoggerFactory = Packages.psdi.util.logging.MXLoggerFactory;
var Level = Packages.org.apache.log4j.Level;

var resultList = [];

// 3. 遍历并设置日志级别
for (var i = 0; i < data.loggers.length; i++) {
    var item = data.loggers[i];
    var loggerName = item.loggerName;
    var logLevel = item.level;
    var ignore = item.ignore || false;

    // 如果 ignore 为 true，跳过设置
    if (ignore) {
        resultList.push({
            loggerName: loggerName,
            level: logLevel,
            status: "IGNORED",
            reason: "ignore 属性为 true，已跳过"
        });
        continue;
    }

    if (!loggerName || !logLevel) {
        resultList.push({
            loggerName: loggerName,
            level: logLevel,
            status: "FAILED",
            reason: "loggerName 或 level 为空"
        });
        continue;
    }

    try {
        var logger = MXLoggerFactory.getLogger(loggerName);

        switch (logLevel.toUpperCase()) {
            case "DEBUG":
                logger.setLevel(Level.DEBUG);
                break;
            case "INFO":
                logger.setLevel(Level.INFO);
                break;
            case "WARN":
            case "WARNING":
                logger.setLevel(Level.WARN);
                break;
            case "ERROR":
                logger.setLevel(Level.ERROR);
                break;
            default:
                throw new Error("不支持的日志级别：" + logLevel);
        }

        resultList.push({
            loggerName: loggerName,
            level: logLevel,
            status: "SUCCESS"
        });

    } catch (e) {
        resultList.push({
            loggerName: loggerName,
            level: logLevel,
            status: "FAILED",
            reason: e.message
        });
    }
}

// 4. 脚本自身记录日志
var scriptLogger = MXLoggerFactory.getLogger("maximo.script");
scriptLogger.info("批量修改 MXLogger 日志级别完成：" + JSON.stringify(resultList));

// 5. 返回成功结果（JSON）
responseBody=(JSON.stringify({
    success: true,
    message: "MXLogger 日志级别已成功修改",
    result: resultList
}));