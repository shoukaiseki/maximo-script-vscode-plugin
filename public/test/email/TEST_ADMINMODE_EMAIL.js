// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />

// ============================
// TEST_ADMINMODE_EMAIL.js
// 模拟 AdminModeManager 管理方式开启时的邮件通知
// 只做: 创建公告板消息 + 发送通知邮件，不涉及会话管理
// 
// 使用:
//   sks-maximo invoke TEST_ADMINMODE_EMAIL -e loc
//   或通过 REST API POST /maximo/api/os/script/TEST_ADMINMODE_EMAIL
//
// 请求参数(可选):
//   minutes  - 倒计时分钟数（默认 5）
// ============================

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");

/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");

/** @type {java.util.GregorianCalendar} */
GregorianCalendar = Java.type("java.util.GregorianCalendar");

var mxServer = MXServer.getMXServer();
var scriptName = service.getScriptName();

print("[" + scriptName + "] ============= 开始 =============");

// 获取系统 UserInfo 及消息格式化器（参考 AdminModeManager.getMsgFormatter()）
var secServ = mxServer.lookup("SECURITY");
var userInfo = secServ.getSystemUserInfo();
var msgFormatter = mxServer.getMboSet("ADMINMONITOR", userInfo);

var minutesStr = "5";
try {
    if (requestBody && requestBody.trim() !== "") {
        var params = JSON.parse(requestBody);
        if (params.minutes) minutesStr = String(params.minutes);
    }
} catch (e) {
    // 使用默认值
}

// ============================================================
// 阶段1: 获取活跃用户邮箱
// ============================================================
var adminEmail = mxServer.getProperty("mxe.adminEmail");

print("[" + scriptName + "] 管理员邮箱: " + adminEmail);

var sqf = new SqlFormat(
    "isprimary = 1 and personid in " +
    "(select personid from maxuser where userid in " +
    "(select userid from maxsession where issystem = 0 " +
    "and servername = :1 and serverhost = :2))");
sqf.setObject(1, "MAXSESSION", "SERVERNAME", mxServer.getName());
sqf.setObject(2, "MAXSESSION", "SERVERHOST", mxServer.getServerHost());

var emailSet = mxServer.getMboSet("EMAIL", userInfo);
emailSet.setWhere(sqf.format());

print("[" + scriptName + "] 活跃用户邮箱数: " + emailSet.count());

// ============================================================
// 阶段2: 创建公告板消息 (BULLETINBOARD)
// ============================================================
var msgId = mxServer.getMaxMessageCache()
    .getMaxMessage("system", "AdminLogoutSubject").getId();

sqf = new SqlFormat(userInfo,
    "subject like :1 and postdate <= :2 and expiredate >= :3");
sqf.setObject(1, "BULLETINBOARD", "SUBJECT", msgId + "%");
sqf.setTimestamp(2, mxServer.getDate());
sqf.setTimestamp(3, mxServer.getDate());

var bbSet = mxServer.getMboSet("BULLETINBOARD", userInfo);
bbSet.setWhere(sqf.format());
bbSet.reset();

var bb;
if (bbSet.isEmpty()) {
    bb = bbSet.add(2);
    var param = [minutesStr];
    var bbSubject = new MXApplicationException(
        "system", "AdminLogoutSubject", param).getMessage(msgFormatter);
    var bbMsg = new MXApplicationException(
        "system", "AdminLogoutMessage", param).getMessage(msgFormatter);

    bb.setValue("subject", bbSubject, 2);
    bb.setValue("message", bbMsg, 2);
    bb.setValue("status", mxServer.getMaximoDD().getTranslator()
        .toExternalDefaultValue("BULLETINSTATUS", "APPROVED", bb), 11);

    var expDate = new GregorianCalendar();
    expDate.setTime(bb.getDate("postdate"));
    expDate.add(java.util.Calendar.MINUTE, parseInt(minutesStr) + 1);
    bb.setValue("expiredate", expDate.getTime(), 2);

    print("[" + scriptName + "] 公告板消息已创建: " + bbSubject);
} else {
    bb = bbSet.getMbo(0);
    print("[" + scriptName + "] 已存在公告板消息，直接复用: " + bb.getString("subject"));
}

// ============================================================
// 阶段3: 发送通知邮件
// ============================================================
if (!emailSet.isEmpty()) {
    var commLog = bb.getMboSet("COMMLOG").add();
    commLog.setValueNull("sendto");
    commLog.setValue("sendto", adminEmail, 2);
    commLog.associateEmailsToCommLog(null, emailSet, null, false, false, true);
    commLog.setValue("sendfrom", adminEmail, 2);
    commLog.setSendPartial(true);
    commLog.sendMessage();

    print("[" + scriptName + "] 通知邮件已发送，收件人数: " + emailSet.count());
} else {
    print("[" + scriptName + "] 未找到活跃用户的邮箱，跳过邮件发送");
}

bbSet.save();
print("[" + scriptName + "] ============= 完成 =============");

// REST API 响应
responseBody = JSON.stringify({
    "status": "success",
    "scriptName": scriptName,
    "message": "公告板消息创建完毕，通知邮件已发送"
});
