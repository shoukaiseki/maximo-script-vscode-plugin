/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//日志标记工具 - 支持日志区间内的内容提取
//配合 https://gitee.com/shoukaiseki/maximo-manager-panel 使用
Thread = Java.type("java.lang.Thread");

// eslint-disable-next-line no-global-assign
Date = Java.type("java.util.Date");

System = Java.type("java.lang.System");

// eslint-disable-next-line no-global-assign
File = Java.type("java.io.File");
RandomAccessFile = Java.type("java.io.RandomAccessFile");

/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
logger = MXLoggerFactory.getLogger("maximo");//使用根目录记录器

var MARKER_PREFIX_START = "SKS_LOG_MARKER:start:";
var MARKER_PREFIX_END = "SKS_LOG_MARKER:end:";

main();

function main() {
    if (typeof request === "undefined" || !request) {
        responseBody = JSON.stringify({ "status": "error", "message": "该脚本仅支持通过 Web 请求调用。" });
        return;
    }

    var marker = request.getQueryParam("marker");
    if (!marker) {
        responseBody = JSON.stringify({ "status": "error", "message": "缺少 marker 参数 (start|end|get)" });
        return;
    }

    if (marker === "start") {
        handleStart();
    } else if (marker === "end") {
        handleEnd();
    } else if (marker === "get") {
        handleGet();
    } else {
        responseBody = JSON.stringify({ "status": "error", "message": "无效的 marker 值: '" + marker + "'，仅支持 start、end、get。" });
    }
}

function handleStart() {
    var startuuid = request.getQueryParam("startuuid");
    if (!startuuid) {
        responseBody = JSON.stringify({ "status": "error", "message": "缺少 startuuid 参数" });
        return;
    }
    logger.error("\x1B[31m" + MARKER_PREFIX_START + startuuid + "\x1B[0m");
    responseBody = JSON.stringify({ "status": "success", "action": "start", "startuuid": startuuid });
}

function handleEnd() {
    var enduuid = request.getQueryParam("enduuid");
    if (!enduuid) {
        responseBody = JSON.stringify({ "status": "error", "message": "缺少 enduuid 参数" });
        return;
    }
    logger.error("\x1B[31m" + MARKER_PREFIX_END + enduuid + "\x1B[0m");
    responseBody = JSON.stringify({ "status": "success", "action": "end", "enduuid": enduuid });
}

function handleGet() {
    var startuuid = request.getQueryParam("startuuid");
    var enduuid = request.getQueryParam("enduuid");

    if (!startuuid || !enduuid) {
        responseBody = JSON.stringify({ "status": "error", "message": "缺少 startuuid 和 enduuid 参数" });
        return;
    }

    var encoding = request.getQueryParam("encoding");
    if (!encoding) {
        encoding = "UTF-8";
    }

    var logFolder = System.getenv("LOG_DIR");
    if (!logFolder) {
        logFolder = System.getProperty("com.ibm.ws.logging.log.directory");
    }
    if (!logFolder) {
        logFolder = "/logs";
    }
    if (!logFolder.trim().endsWith(File.separator)) {
        logFolder = logFolder + File.separator;
    }

    var logFile = new File(logFolder + "messages.log");
    if (!logFile.exists()) {
        responseBody = JSON.stringify({ "status": "error", "message": "无法打开日志文件: " + logFile.getPath() });
        return;
    }

    var collectedLines = [];
    var inRange = false;
    var foundStart = false;
    var foundEnd = false;
    var line;

    var rfa = new RandomAccessFile(logFile, "r");
    try {
        while ((line = rfa.readLine()) !== null) {
            var rawBytes = java.lang.String.valueOf(line).getBytes("ISO-8859-1");
            var decodedLine = new java.lang.String(rawBytes, encoding);

            if (decodedLine.indexOf(startuuid) !== -1) {
                inRange = true;
                foundStart = true;
            }

            if (inRange) {
                collectedLines.push(decodedLine);
            }

            if (inRange && decodedLine.indexOf(enduuid) !== -1) {
                foundEnd = true;
                break;
            }
        }
    } finally {
        rfa.close();
    }

    if (!foundStart) {
        responseBody = JSON.stringify({ "status": "error", "message": "未在日志中找到起始标记，UUID: '" + startuuid + "'" });
        return;
    }

    if (!foundEnd) {
        responseBody = JSON.stringify({ "status": "error", "message": "在起始标记之后未找到结束标记，UUID: '" + enduuid + "'" });
        return;
    }

    var logContent = collectedLines.join("\n");
    responseBody = JSON.stringify({
        "status": "success",
        "action": "get",
        "startuuid": startuuid,
        "enduuid": enduuid,
        "lines": collectedLines.length,
        "content": logContent
    });
}
