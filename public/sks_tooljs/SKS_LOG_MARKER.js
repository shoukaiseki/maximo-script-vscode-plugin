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
    var logFile = null;
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
    var logfileIndex = request.getQueryParam("logfileIndex");

    var lfn = "maximo.log"
    try {

        /** @type {java.net.InetAddress} */
        InetAddress = Java.type("java.net.InetAddress");
        /** @type {psdi.server.MXServer} */
        MXServer = Java.type("psdi.server.MXServer");//13
        var serverName = MXServer.getMXServer().getName();
        var i = InetAddress.getLocalHost();
        var lfn = i.getHostName() + "_" + serverName + "_maximo.log"

    } catch (e) {
        logger.error(e)
        logger.error("获取主机名/服务器名失败 ");
    }

    if (logfileIndex && logfileIndex > 0) {
        //maximo.log
        var rootfolder=MXServer.getMXServer().getProperty("mxe.logging.rootfolder")
        if(rootfolder){
            var candidate = new File(rootfolder +  "/"+ lfn);
            if (candidate.exists()) {
                logFile = candidate;
            }else{
                candidate = new File(rootfolder +"/maximo/logs/" + lfn);
                if (candidate.exists()) {
                    logFile = candidate;
                }else{
                    candidate = new File("/opt/ibm/wlp/output/defaultServer/maximo/logs/" + lfn);
                    if (candidate.exists()) {
                        logFile = candidate;
                    }
                }
            }
        }

    } 
    if (logFile == null) {

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

        var logFileCandidates

        if (logfileIndex && logfileIndex > 0) {
            logFileCandidates = [lfn, "messages.log"];
        } else {
            logFileCandidates = ["messages.log", lfn];
        }
        for (var fi = 0; fi < logFileCandidates.length; fi++) {
            var candidate = new File(logFolder + logFileCandidates[fi]);
            if (candidate.exists()) {
                logFile = candidate;
                break;
            }
        }

    }

    if (!logFile) {
        responseBody = JSON.stringify({
            "status": "error",
            "message": "无法找到日志文件，尝试了: " + logFileCandidates.join(", ") + "，路径: " + logFolder
        });
        return;
    }

    // 从文件末尾向前分块查找标记（避免大文件从头扫描）
    var rfa = new RandomAccessFile(logFile, "r");
    try {
        var fileLength = rfa.length();
        var CHUNK_SIZE = 65536; // 64KB/块
        var buffer = "";
        var readPos = fileLength;
        var startMarker = MARKER_PREFIX_START + startuuid;
        var endMarker = MARKER_PREFIX_END + enduuid;
        var startIdx = -1;
        var endIdx = -1;
        var startLinePos = -1; // 开始标记所在行的行首位置

        // 从文件末尾向前分块读取
        while (readPos > 0 && (endIdx === -1 || startIdx === -1 || (startIdx > -1 && startLinePos === -1))) {
            var chunkSize = Math.min(CHUNK_SIZE, readPos);
            readPos -= chunkSize;
            rfa.seek(readPos);

            var rawBytes = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, chunkSize);
            rfa.readFully(rawBytes);
            var chunk = new java.lang.String(rawBytes, 0, chunkSize, "ISO-8859-1");
            chunk = new java.lang.String(chunk.getBytes("ISO-8859-1"), encoding);

            buffer = chunk + buffer;

            if (endIdx === -1) {
                endIdx = buffer.lastIndexOf(endMarker);
            }

            if (startIdx === -1) {
                startIdx = buffer.lastIndexOf(startMarker);
            }

            // 找到开始标记后，继续向前查找其行首
            if (startIdx > -1 && startLinePos === -1) {
                var lineStart = buffer.lastIndexOf("\n", startIdx - 1);
                if (lineStart > -1) {
                    startLinePos = lineStart + 1;
                } else if (readPos <= 0) {
                    // 已到文件开头，没有换行符，行首就是 buffer 开头
                    startLinePos = 0;
                }
                // 未找到换行符且还有数据可读，继续向前读取
            }
        }

        // SSE 流式输出
        var res = request.getHttpServletResponse();
        var output = res.getOutputStream();
        res.setBufferSize(0);
        res.setContentType("text/event-stream");
        res.flushBuffer();

        var collectedLines = 0;

        if (startIdx === -1) {
            output.println("data: " + JSON.stringify({
                "event": "end", "status": "error",
                "message": "未在日志文件中找到起始标记，UUID: '" + startuuid + "'",
                "startuuid": startuuid, "enduuid": enduuid,
                "lines": 0, "logFile": logFile.getPath()
            }));
            output.println("");
        } else if (endIdx === -1) {
            output.println("data: " + JSON.stringify({
                "event": "end", "status": "error",
                "message": "未在日志文件中找到结束标记，UUID: '" + enduuid + "'",
                "startuuid": startuuid, "enduuid": enduuid,
                "lines": 0, "logFile": logFile.getPath()
            }));
            output.println("");
        } else if (startIdx > endIdx) {
            output.println("data: " + JSON.stringify({
                "event": "end", "status": "error",
                "message": "起始标记在结束标记之后，请检查UUID对应关系",
                "startuuid": startuuid, "enduuid": enduuid,
                "lines": 0, "logFile": logFile.getPath()
            }));
            output.println("");
        } else {
            // 提取起止标记间的内容
            var content = buffer.substring(startLinePos, endIdx + endMarker.length);
            var lines = content.split("\n");

            for (var li = 0; li < lines.length; li++) {
                if (lines[li]) {
                    collectedLines++;
                    output.println("data: " + lines[li]);
                    output.println("");
                }
            }

            output.println("data: " + JSON.stringify({
                "event": "end", "status": "success",
                "startuuid": startuuid, "enduuid": enduuid,
                "lines": collectedLines, "logFile": logFile.getPath()
            }));
            output.println("");
        }

        res.flushBuffer();

    } finally {
        rfa.close();
    }
}
