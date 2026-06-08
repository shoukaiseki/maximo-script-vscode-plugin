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

// sessionManager 参数: security=仅SecurityService方式, full=SecurityService+WebClientSession方式
var sessionManager = request ? request.getQueryParam("sessionManager") : "full";
if (!sessionManager) {
    sessionManager = "full";
}

// 直接调用 getSessionCounter() 获取会话数
var totalLiveSessions = securityService.getSessionCounter();
loggerMX.error("当前会话数: " + totalLiveSessions);

/**
 * 方式1: 仅使用 SecurityService 断开用户（对应 bak02 方式）
 * - disconnectUser(type=2) 设置 profile.setLogout(true)
 * - 从 users hashtable 移除
 * - 清除 profile 缓存
 * @param {*} uid 用户名
 * @param {*} sessionsMap SecurityInfo.sessions (Map<Long, Date>)
 * @param {*} securityService SecurityService 实例
 * @param {*} userMap users hashtable
 * @returns {number} 断开的 session 数
 */
function disconnectBySecurityService(uid, sessionsMap, securityService, userMap) {
    var sessionKeys = sessionsMap.keySet().toArray();
    var disconnectedCount = 0;
    for (var si = 0; si < sessionKeys.length; si++) {
        var sid = sessionKeys[si];
        if (sid.longValue() > 0) {
            logger.info("断开 session: sid=" + sid);
            securityService.disconnectUser(uid, sid.longValue(), 2, "SYSTEM");
            disconnectedCount++;
        }
    }
    if (disconnectedCount > 0) {
        userMap.remove(uid);
        securityService.clearProfileCache(uid);
    }
    return disconnectedCount;
}

/**
 * 方式2: SecurityService + WebClientSession 断开用户（当前完整方式）
 * - disconnectUser(type=2) 设置 profile.setLogout(true)
 * - 从 users hashtable 移除
 * - 清除 profile 缓存
 * - 遍历 WebClientSessionFactory 关闭该用户的 HTTP 会话
 * @param {*} uid 用户名
 * @param {*} sessionsMap SecurityInfo.sessions (Map<Long, Date>)
 * @param {*} securityService SecurityService 实例
 * @param {*} userMap users hashtable
 * @returns {number} 断开的 session 数
 */
function disconnectByWebClientSession(uid, sessionsMap, securityService, userMap) {
    // 先用 SecurityService 方式断开
    var count = disconnectBySecurityService(uid, sessionsMap, securityService, userMap);
    if (count <= 0) {
        return count;
    }

    // 关闭 WebClientSession（Liberty HTTP 会话）
    try {
        var WebClientSessionFactory = Java.type("psdi.webclient.system.session.WebClientSessionFactory");
        var wcsf = WebClientSessionFactory.getWebClientSessionFactory();
        var sessionListField = wcsf.getClass().getDeclaredField("sessionList");
        sessionListField.setAccessible(true);
        var sessionList = sessionListField.get(wcsf); // HashMap<String, WebClientSession>
        var wcsIterator = sessionList.values().iterator();
        var closedCount = 0;
        while (wcsIterator.hasNext()) {
            var wcs = wcsIterator.next();
            try {
                var mxSession = wcs.getMXSession();
                if (mxSession !== null) {
                    var userInfo = mxSession.getUserInfo();
                    if (userInfo !== null && uid.equals(userInfo.getUserName())) {
                        wcs.cleanup();
                        closedCount++;
                    }
                }
            } catch (e) {
                loggerMX.error("关闭 WebClientSession 异常: " + e);
            }
        }
        loggerMX.error("已关闭 " + closedCount + " 个 WebClientSession");
    } catch (e2) {
        loggerMX.error("访问 WebClientSessionFactory 异常: " + e2);
    }

    return count;
}

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
        loggerMX.error("sessionManager mode: " + sessionManager);
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

                    var disconnectedCount = 0;
                    if (sessionManager === "security") {
                        // 仅 SecurityService 方式
                        disconnectedCount = disconnectBySecurityService(uid, sessionsMap, securityService, userMap);
                    } else {
                        // SecurityService + WebClientSession 方式
                        disconnectedCount = disconnectByWebClientSession(uid, sessionsMap, securityService, userMap);
                    }

                    if (disconnectedCount > 0) {
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

/*
 * ========================================
 * 调用方式说明
 * ========================================
 *
 * 1. 查询在线用户（不踢出）:
 *    GET /maximo/oslc/script/SKS_MXSESSION_REMOVE?action=get
 *
 * 2. 踢出用户 - 仅 SecurityService 方式 (对应 bak02):
 *    GET /maximo/oslc/script/SKS_MXSESSION_REMOVE?action=disconnect&userId=MAXADMIN&sessionManager=security
 *
 * 3. 踢出用户 - SecurityService + WebClientSession 完整方式 (默认):
 *    GET /maximo/oslc/script/SKS_MXSESSION_REMOVE?action=disconnect&userId=MAXADMIN&sessionManager=full
 *
 *    sessionManager 参数说明:
 *      - security: 仅调用 SecurityService.disconnectUser(type=2) + userMap.remove + clearProfileCache
 *      - full (默认): 在 security 基础上, 额外遍历 WebClientSessionFactory 调用 wcs.cleanup()
 *                      关闭 Liberty HTTP 会话
 */