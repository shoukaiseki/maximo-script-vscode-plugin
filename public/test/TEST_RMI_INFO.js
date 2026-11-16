// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//TEST_RMI_INFO: 输出本 JVM 的 RMI 注册端点、主机名解析、TCP 连通性与 RMI 自检结果
//用途: WEBUI 登录报 BMXAA4188E(The system could not connect to an application server on the specified host) 时,
//     不依赖 UI 登录即可判断是"注册端点不一致"还是"主机名/端口不通", 也可通过请求体指定 host/port 验证旧记录里的端点是否仍可达
//调用: sks-maximo call TEST_RMI_INFO -e <环境名>
//      sks-maximo call TEST_RMI_INFO -e <环境名> --file body.json  (body.json: {"host":"<registry-host>","port":1099})

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");

/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");

/** @type {java.net.InetAddress} */
InetAddress = Java.type("java.net.InetAddress");

/** @type {java.net.Socket} */
Socket = Java.type("java.net.Socket");

/** @type {java.net.InetSocketAddress} */
InetSocketAddress = Java.type("java.net.InetSocketAddress");

/** @type {java.rmi.Naming} */
Naming = Java.type("java.rmi.Naming");

/** @type {java.lang.management.ManagementFactory} */
ManagementFactory = Java.type("java.lang.management.ManagementFactory");

/** @type {java.lang.System} */
System = Java.type("java.lang.System");

/** @type {java.text.SimpleDateFormat} */
SimpleDateFormat = Java.type("java.text.SimpleDateFormat");

/** @type {java.util.Date} */
Date = Java.type("java.util.Date");

var scriptName = service.getScriptName();

//日志: 优先复用 SKS_LOG_ANSI_UTILS, 该组件缺失时退化为直接写 logger/print, 避免诊断脚本自身跑不起来
var logger = null;
try {
    /** @type {psdi.util.logging.MXLoggerFactory} */
    MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
    var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
    try {
        var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
        logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true });
    } catch (e1) {
        logger = {
            info: function (m) { loggerMX.info(m); },
            error: function (m) { loggerMX.error(m); },
            isDebugEnabled: function () { return false; }
        };
    }
} catch (e2) {
    logger = {
        info: function (m) { print(m); },
        error: function (m) { print(m); },
        isDebugEnabled: function () { return false; }
    };
}

logger.info("[" + scriptName + "]----------------Starting execution of script " + scriptName);

function nowStr() {
    return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS").format(new Date());
}

function timeStr(millis) {
    return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date(millis));
}

function safeStr(v) {
    return (v === null || typeof v === "undefined") ? "" : String(v);
}

function errStr(e) {
    if (!e) {
        return "unknown";
    }
    var msg = "";
    try {
        msg = e.getMessage ? e.getMessage() : "";
    } catch (ignore) {
        msg = "";
    }
    return e.toString() + (msg ? (" | " + msg) : "");
}

function writeJson(obj) {
    try {
        return service.jsonToString(obj);
    } catch (e) {
        return String(obj);
    }
}

function main() {
    var resp = new JSONObject();
    var data = new JSONObject();
    data.put("at", nowStr());
    data.put("scriptName", scriptName);

    /** @type {psdi.server.MXServer} */
    var mxServer = MXServer.getMXServer();

    //==================== 1. 本 JVM 的 MXServer 视角 ====================
    var jvm = new JSONObject();
    var serverName = safeStr(mxServer.getName());
    var serverHost = safeStr(mxServer.getServerHost());
    var registryPort = safeStr(mxServer.getRegistryPort());
    jvm.put("serverName", serverName);
    jvm.put("serverHost", serverHost);
    jvm.put("registryPort", registryPort);
    jvm.put("prop.mxe.rmi.port", safeStr(mxServer.getProperty("mxe.rmi.port")));
    jvm.put("prop.mxe.rmi.enabled", safeStr(mxServer.getProperty("mxe.rmi.enabled")));
    jvm.put("prop.mxe.registry.port", safeStr(mxServer.getProperty("mxe.registry.port")));

    try {
        /** @type {java.lang.management.RuntimeMXBean} */
        var runtimeMXBean = ManagementFactory.getRuntimeMXBean();
        jvm.put("jvmName", safeStr(runtimeMXBean.getName()));
        jvm.put("jvmStartTime", timeStr(runtimeMXBean.getStartTime()));
        jvm.put("jvmUptimeMinutes", String(Math.round(runtimeMXBean.getUptime() / 60000)));
    } catch (e) {
        jvm.put("jvmNameError", errStr(e));
    }
    jvm.put("javaVersion", safeStr(System.getProperty("java.version")));
    data.put("jvm", jvm);

    //==================== 2. 主机名解析 ====================
    var hostJo = new JSONObject();
    try {
        var local = InetAddress.getLocalHost();
        hostJo.put("localHostName", safeStr(local.getHostName()));
        hostJo.put("localHostAddress", safeStr(local.getHostAddress()));
        hostJo.put("localCanonicalName", safeStr(local.getCanonicalHostName()));
    } catch (e3) {
        hostJo.put("localError", errStr(e3));
    }

    var hostOnly = serverHost;
    var idx = hostOnly.indexOf(":");
    if (idx > -1) {
        hostOnly = hostOnly.substring(0, idx);
    }
    try {
        var addrs = InetAddress.getAllByName(hostOnly);
        var addrList = [];
        for (var i = 0; i < addrs.length; i++) {
            addrList.push(safeStr(addrs[i].getHostAddress()));
        }
        hostJo.put("resolvedName", hostOnly);
        hostJo.put("resolvedAddresses", addrList.join(","));
    } catch (e4) {
        hostJo.put("resolvedName", hostOnly);
        hostJo.put("resolveError", errStr(e4));
    }
    data.put("host", hostJo);

    //==================== 3. 端点连通与 RMI 自检 ====================
    var targetHost = hostOnly;
    var targetPort = 0;
    try {
        targetPort = parseInt(registryPort, 10);
    } catch (ignorePort) {
        targetPort = 0;
    }
    if (!targetPort) {
        targetPort = 1099;
    }

    var override = null;
    try {
        if (typeof requestBody !== "undefined" && requestBody) {
            override = JSON.parse(String(requestBody));
        }
    } catch (e5) {
        override = null;
    }
    if (override && override.host) {
        targetHost = String(override.host);
    }
    if (override && override.port) {
        var p = parseInt(String(override.port), 10);
        if (p) {
            targetPort = p;
        }
    }

    var probe = new JSONObject();
    probe.put("host", targetHost);
    probe.put("port", String(targetPort));
    probe.put("overridden", override ? "1" : "0");

    //3.1 TCP 连通性(3 秒超时)
    var t0 = System.currentTimeMillis();
    var sock = null;
    try {
        sock = new Socket();
        sock.connect(new InetSocketAddress(targetHost, targetPort), 3000);
        probe.put("tcp", "OK");
    } catch (e6) {
        probe.put("tcp", "FAIL: " + errStr(e6));
    } finally {
        if (sock) {
            try {
                sock.close();
            } catch (ignoreClose) {
            }
        }
    }
    probe.put("tcpMs", String(System.currentTimeMillis() - t0));

    //3.2 RMI 查找 + 一次真实远程调用(等价于 WEBUI 的 SimpleWebAppSession.getMXServer)
    var r0 = System.currentTimeMillis();
    try {
        var stub = Naming.lookup("rmi://" + targetHost + ":" + targetPort + "/" + serverName);
        probe.put("lookup", "OK");
        try {
            probe.put("remoteCall", "OK: getName=" + safeStr(stub.getName()));
        } catch (e7) {
            probe.put("remoteCall", "FAIL: " + errStr(e7));
        }
    } catch (e8) {
        probe.put("lookup", "FAIL: " + errStr(e8));
        probe.put("remoteCall", "SKIP");
    }
    probe.put("rmiMs", String(System.currentTimeMillis() - r0));
    data.put("rmiProbe", probe);

    //==================== 4. SERVERSESSION 注册记录(缺失时不影响整体返回) ====================
    var reg = new JSONObject();
    try {
        var sessionSet = mxServer.getMboSet("SERVERSESSION", userInfo);
        var cnt = sessionSet.count();
        reg.put("count", String(cnt));
        var list = [];
        for (var j = 0; j < cnt; j++) {
            var mbo = sessionSet.getMbo(j);
            if (!mbo) {
                continue;
            }
            var row = new JSONObject();
            row.put("serverName", safeStr(mbo.getString("SERVERNAME")));
            row.put("serverHost", safeStr(mbo.getString("SERVERHOST")));
            row.put("registryPort", safeStr(mbo.getString("REGISTRYPORT")));
            row.put("active", safeStr(mbo.getString("ACTIVE")));
            row.put("startTime", safeStr(mbo.getString("STARTTIME")));
            row.put("jvmName", safeStr(mbo.getString("JAVAJVMNAME")));
            row.put("ports", safeStr(mbo.getString("PORTS")));
            list.push(writeJson(row));
        }
        reg.put("rows", "[" + list.join(",") + "]");
    } catch (e9) {
        reg.put("count", "-1");
        reg.put("error", errStr(e9));
    }
    data.put("serverSession", reg);

    resp.put("status", "success");
    resp.put("data", data);
    return resp;
}

var result;
try {
    result = main();
} catch (eMain) {
    logger.error("[" + scriptName + "]----------------FAILED: " + errStr(eMain));
    var errJo = new JSONObject();
    var errData = new JSONObject();
    errData.put("at", nowStr());
    errData.put("error", errStr(eMain));
    errJo.put("status", "error");
    errJo.put("message", errStr(eMain));
    errJo.put("data", errData);
    result = errJo;
}

responseHeaders.put("content-type", "application/json");
responseBody = writeJson(result);
logger.info("[" + scriptName + "]----------------responseBody=" + responseBody);