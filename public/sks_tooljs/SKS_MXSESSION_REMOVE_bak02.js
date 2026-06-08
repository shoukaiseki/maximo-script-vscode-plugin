// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
loggerMX.error("[TEST_SKS_LOG_ANSI_UTILS]----------1");
var sksLogAnsiUtils=service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("[TEST_SKS_LOG_ANSI_UTILS]----------2");
loggerMX.error("[TEST_SKS_LOG_ANSI_UTILS]----------3");
/** @type {jscustom.AnsiLogger} */
var logger =sksLogAnsiUtils.newAnsiLogger({logger:loggerMX, ansiOpen:true})
loggerMX.error("[TEST_SKS_LOG_ANSI_UTILS]----------4");
loggerMX.error("[TEST_SKS_LOG_ANSI_UTILS]logger="+logger);
// logger.setLevel(Level.INFO);
logger.debug("[TEST_SKS_LOG_ANSI_UTILS]---debug" )
logger.info("[TEST_SKS_LOG_ANSI_UTILS]---info")
logger.warn("[TEST_SKS_LOG_ANSI_UTILS]---warn")
logger.error("[TEST_SKS_LOG_ANSI_UTILS]---error")


logger.debug("[TEST_SKS_LOG_ANSI_UTILS]---debug14" )


/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");
/** @type {psdi.security.SecurityService} */
SecurityService= Java.type("psdi.security.SecurityService")

// 通过 lookup("SECURITY") 获取 SecurityService 实例
var securityService = MXServer.getMXServer().lookup("SECURITY");
loggerMX.error("securityService class: " + securityService.getClass().getName());

// 读取 action 参数: get=查询, disconnect=踢出用户
var action = request ? request.getQueryParam("action") : "get";
if (!action) {
    action = "get";
}

// 直接调用 getSessionCounter() 获取会话数
var totalLiveSessions = securityService.getSessionCounter();
loggerMX.error("当前会话数: " + totalLiveSessions);

// 通过反射获取 users 字段，遍历在线用户
/** @type {java.lang.reflect.Field} */
var Field = Java.type("java.lang.reflect.Field");
var usersField = SecurityService.class.getDeclaredField("users");
usersField.setAccessible(true);
var users = usersField.get(securityService);
loggerMX.error("users: " + users);

var disconnectedUsers = [];
var onlineUsers = [];

if (users !== null) {
    var userMap = users.get();
    if (userMap !== null) {
        loggerMX.error("userMap size: " + userMap.size());
        var userKeys = userMap.keySet().toArray();
        for (var i = 0; i < userKeys.length; i++) {
            var uid = userKeys[i];
            loggerMX.error("用户: " + uid);
            onlineUsers.push(uid);

            // 如果是断开连接模式，匹配目标用户
            if (action === "disconnect") {
                var targetUserId = request.getQueryParam("userId");
                if (targetUserId && uid.equals(targetUserId)) {
                    var securityInfo = userMap.get(uid);
                    loggerMX.error("securityInfo class: " + securityInfo.getClass().getName());

                    // 从 SecurityInfo.sessions 字段获取实际的 session ID
                    var sessionsField = securityInfo.getClass().getDeclaredField("sessions");
                    sessionsField.setAccessible(true);
                    var sessionsMap = sessionsField.get(securityInfo); // Map<Long, Date>
                    loggerMX.error("sessionsMap: " + sessionsMap);

                    var sessionKeys = sessionsMap.keySet().toArray();
                    var disconnectedCount = 0;
                    for (var si = 0; si < sessionKeys.length; si++) {
                        var sid = sessionKeys[si];
                        if (sid.longValue() > 0) {
                            logger.info("断开 session: sid=" + sid);
                            // 先断开用户（设置 profile.setLogout(true)）
                            securityService.disconnectUser(uid, sid.longValue(), 2, "SYSTEM");
                            disconnectedCount++;
                        }
                    }
                    if (disconnectedCount > 0) {
                        // 手动从 users hashtable 中移除
                        userMap.remove(uid);
                        // 清除 profile 缓存
                        securityService.clearProfileCache(uid);
                        loggerMX.error("已断开用户: " + uid + ", 处理了 " + disconnectedCount + " 个 session");
                        disconnectedUsers.push(uid);
                    } else {
                        loggerMX.error("用户 " + uid + " 没有有效的 session (非0)");
                    }
                }
            }
        }
    } else {
        loggerMX.error("userMap 为 null");
    }
} else {
    loggerMX.error("users TenantLevelObj 为 null");
}

if (action === "disconnect") {
    data={
        "status": "success",
        "action": "disconnect",
        "totalLiveSessions": totalLiveSessions,
        "disconnectedUsers": disconnectedUsers
    };
} else {
    data={
        "status": "success",
        "action": "get",
        "totalLiveSessions": totalLiveSessions,
        "onlineUsers": onlineUsers
    };
}

responseBody = JSON.stringify(data);