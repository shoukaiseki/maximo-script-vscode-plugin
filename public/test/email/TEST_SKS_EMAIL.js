// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />

// ============================
// TEST_SKS_EMAIL.js
// Maximo 邮件发送测试脚本（接口脚本）
// 使用 MXServer.sendEMail() 直接发送邮件
//
// MXServer.sendEMail 重载方法列表:
//   1. sendEMail(to, from, subject, t:Throwable)
//   2. sendEMail(to, from, subject, message)
//   3. sendEMail(to, from, subject, message, attachment, filename)
//   4. sendEMail(to[], from, subject, t:Throwable)
//   5. sendEMail(to[], from, subject, message)
//   6. sendEMail(to[], from, subject, message, attachment, filename)
//   7. sendEMail(to, cc, bcc, from, subject, message, ReplyTo, fileName[], urlName[])
//   8. sendEMail(to, cc, bcc, from, subject, message, ReplyTo, fileName[], urlName[], overrideProps)
//
// 系统属性配置:
//   mail.smtp.host              - SMTP服务器
//   mail.smtp.port              - SMTP端口
//   mail.smtp.ssl.enable        - 是否SSL
//   mxe.smtp.user               - SMTP用户
//   mxe.smtp.password           - SMTP密码
//   mxe.smtp.timeout            - 超时时间
//   mxe.email.charset           - 邮件字符集
//   mxe.email.content.type      - 邮件内容类型(text/html 或 text/plain)
// ============================

// load('nashorn:mozilla_compat.js');

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

/** @type {java.lang.System} */
System = Java.type("java.lang.System");

/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");

/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");

/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");

/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({logger: loggerMX, ansiOpen: true});

/** @type {javax.mail.MessagingException} */
MessagingException = Java.type("javax.mail.MessagingException");

var scriptName = service.getScriptName();

logger.info("[" + scriptName + "] ================ 邮件发送测试脚本(MXServer.sendEMail) 开始执行 ================");
logger.info("[" + scriptName + "] webclientsession=" + service.webclientsession());

// ============================
// 保存隐式变量
// ============================

/** @type {java.lang.String} */
var requestBodyTmp = requestBody;

/** @type {psdi.security.UserInfo} */
var userInfoTmp = userInfo;

/** @type {com.ibm.tivoli.maximo.oslc.provider.OslcRequest} */
var requestTmp = request;

/** @type {java.util.HashMap} */
var responseHeadersTmp = responseHeaders;

/** @type {java.lang.String} */
var httpMethodTmp = httpMethod;

// ============================
// 解析请求参数
// ============================

var params = {};
try {
    if (requestBodyTmp && requestBodyTmp.trim() !== "") {
        params = JSON.parse(requestBodyTmp);
    }
} catch (e) {
    logger.warn("[" + scriptName + "] 请求Body解析失败，使用默认参数: " + e);
}

// 从请求参数或默认值获取配置
var CONFIG = {
    // 收件人(必填)，可从请求body传入
    // to: params.to || "jiang28555@qq.com",
    to: params.to || "425728232@qq.com",
    // 发件人 - 默认使用 SMTP 认证用户(mxe.smtp.user)，必须与 SMTP 认证账号一致
    from: params.from || MXServer.getMXServer().getProperty("mxe.smtp.user") || "",
    // 抄送
    cc: params.cc || "",
    // 密送
    bcc: params.bcc || "",
    // 回复地址
    replyTo: params.replyTo || "",
    // 主题
    subject: params.subject || "[Test] MXServer.sendEMail 测试邮件",
    // 消息内容
    message: params.message || "这是一封来自 Maximo MXServer.sendEMail 的测试邮件。\n\n如果收到此邮件，说明邮件发送功能正常。\n\n发送时间: " + new Date(),
    // 附件文件路径
    attachmentPath: params.attachmentPath || "",
    // 附件显示名
    attachmentName: params.attachmentName || "",
    // 文件附件数组(完整版方法使用)
    fileNames: params.fileNames || null,
    // URL附件数组(完整版方法使用)
    urlNames: params.urlNames || null
};

// ============================
// 主逻辑
// ============================

main();

function main() {
    var startTime = System.currentTimeMillis();
    var tcResults = [];

    try {
        // TC01: 查询SMTP配置
        // tcResults.push(tc01_querySmtpConfig());

        // TC02: 最简单方式 - sendEMail(to, from, subject, message)
        // tcResults.push(tc02_sendSimpleText());

        // TC03: 多收件人 - sendEMail(to[], from, subject, message)
        // tcResults.push(tc03_sendToArray());

        // TC04: 发送异常堆栈 - sendEMail(to, from, subject, t:Throwable)
        // tcResults.push(tc04_sendThrowable());

        // TC05: 带附件 - sendEMail(to, from, subject, message, attachment, filename)
        // tcResults.push(tc05_sendWithAttachment());

        // TC06: 完整版 - sendEMail(to, cc, bcc, from, subject, message, ReplyTo, fileName[], urlName[])
        // tcResults.push(tc06_sendFullFeatured());

        // TC07: HTML内容邮件
        // tcResults.push(tc07_sendHtmlEmail());

        tcResults.push(tc08_sendLangEmail());

    } catch (e) {
        logger.error("[" + scriptName + "] 主流程异常: " + e);
        tcResults.push({
            tcName: "主流程",
            status: "error",
            message: e.toString()
        });
    }

    var endTime = System.currentTimeMillis();
    var elapsed = endTime - startTime;

    var result = {
        "status": "success",
        "scriptName": scriptName,
        "elapsed": elapsed + "ms",
        "config": {
            "smtpHost": MXServer.getMXServer().getProperty("mail.smtp.host"),
            "smtpPort": MXServer.getMXServer().getProperty("mail.smtp.port"),
            "sslEnabled": MXServer.getMXServer().getProperty("mail.smtp.ssl.enable"),
            "emailCharset": MXServer.getMXServer().getProperty("mxe.email.charset"),
            "contentType": MXServer.getMXServer().getProperty("mxe.email.content.type"),
            "targetEmail": CONFIG.to || "(未指定，请在请求body中传入 to 字段)"
        },
        "testCases": tcResults
    };

    logger.info("[" + scriptName + "] ================ 执行完成, 耗时: " + elapsed + "ms ================");
    responseBody = JSON.stringify(result);
}

// ============================
// 辅助函数
// ============================

/**
 * 检查目标邮箱是否已配置
 */
function hasTargetEmail() {
    return CONFIG.to && CONFIG.to.trim() !== "";
}

/**
 * 获取邮件发送结果描述
 */
function getSendResult(successMsg) {
    if (!hasTargetEmail()) {
        return "跳过实际发送：未指定收件人(to)，请在请求body中传入: {\"to\":\"xxx@example.com\"}";
    }
    return successMsg;
}

// ============================
// 测试用例
// ============================

/**
 * TC01: 查询SMTP邮件配置
 */
function tc01_querySmtpConfig() {
    var tcName = "TC01-查询SMTP邮件配置";
    logger.info("[" + scriptName + "] ---------- " + tcName + " ----------");

    try {
        var mxServer = MXServer.getMXServer();
        var config = {
            "mail.smtp.host": mxServer.getProperty("mail.smtp.host"),
            "mail.smtp.port": mxServer.getProperty("mail.smtp.port"),
            "mail.smtp.ssl.enable": mxServer.getProperty("mail.smtp.ssl.enable"),
            "mxe.smtp.user": mxServer.getProperty("mxe.smtp.user"),
            "mxe.smtp.timeout": mxServer.getProperty("mxe.smtp.timeout"),
            "mxe.smtp.connectiontimeout": mxServer.getProperty("mxe.smtp.connectiontimeout"),
            "mxe.email.charset": mxServer.getProperty("mxe.email.charset"),
            "mxe.email.content.type": mxServer.getProperty("mxe.email.content.type")
        };

        logger.info("[" + scriptName + "] SMTP配置: " + JSON.stringify(config));
        return {
            tcName: tcName,
            status: "success",
            config: config
        };
    } catch (e) {
        logger.error("[" + scriptName + "] " + tcName + " 异常: " + e);
        return {tcName: tcName, status: "error", message: e.toString()};
    }
}

/**
 * TC02: 最简单方式
 * 调用: sendEMail(String to, String from, String subject, String message)
 */
function tc02_sendSimpleText() {
    var tcName = "TC02-sendEMail(to, from, subject, message) - 简单文本邮件";
    logger.info("[" + scriptName + "] ---------- " + tcName + " ----------");

    if (!hasTargetEmail()) {
        return {tcName: tcName, status: "skipped", message: getSendResult()}
    }
    if (!CONFIG.from) {
        return {tcName: tcName, status: "skipped",
            message: "发件人(from)为空！SMTP服务器要求 Mail from 必须与认证用户一致。请在请求body中传入from参数，或在Maximo中设置系统属性 mxe.smtp.user"};
    }

    try {
        var startTime = System.currentTimeMillis();
        MXServer.sendEMail(CONFIG.to, CONFIG.from, CONFIG.subject + " [TC02]", CONFIG.message);
        var elapsed = System.currentTimeMillis() - startTime;

        logger.info("[" + scriptName + "] sendEMail 简单文本邮件 发送成功, 耗时: " + elapsed + "ms");
        return {
            tcName: tcName,
            status: "success",
            to: CONFIG.to,
            from: CONFIG.from,
            subject: CONFIG.subject + " [TC02]",
            elapsed: elapsed + "ms"
        };
    } catch (e) {
        logger.error("[" + scriptName + "] " + tcName + " 发送失败: " + e);
        return {tcName: tcName, status: "error", message: e.toString()};
    }
}

/**
 * TC03: 多收件人数组方式
 * 调用: sendEMail(String[] to, String from, String subject, String message)
 */
function tc03_sendToArray() {
    var tcName = "TC03-sendEMail(to[], from, subject, message) - 多收件人";
    logger.info("[" + scriptName + "] ---------- " + tcName + " ----------");

    if (!hasTargetEmail()) {
        return {tcName: tcName, status: "skipped", message: getSendResult()}
    }

    try {
        // 构建 String[] 数组
        var toArray = Java.type("java.lang.String[]")([CONFIG.to]);

        var startTime = System.currentTimeMillis();
        MXServer.sendEMail(toArray, CONFIG.from, CONFIG.subject + " [TC03-数组方式]", CONFIG.message);
        var elapsed = System.currentTimeMillis() - startTime;

        logger.info("[" + scriptName + "] sendEMail 多收件人 发送成功, 耗时: " + elapsed + "ms");
        return {
            tcName: tcName,
            status: "success",
            toList: [CONFIG.to],
            elapsed: elapsed + "ms"
        };
    } catch (e) {
        logger.error("[" + scriptName + "] " + tcName + " 发送失败: " + e);
        return {tcName: tcName, status: "error", message: e.toString()};
    }
}

/**
 * TC04: 发送异常堆栈
 * 调用: sendEMail(String to, String from, String subject, Throwable t)
 */
function tc04_sendThrowable() {
    var tcName = "TC04-sendEMail(to, from, subject, t:Throwable) - 发送异常堆栈";
    logger.info("[" + scriptName + "] ---------- " + tcName + " ----------");

    if (!hasTargetEmail()) {
        return {tcName: tcName, status: "skipped", message: getSendResult()}
    }

    try {
        // 构造一个测试异常
        var testException = new java.lang.Exception("这是一封测试异常邮件 - 请忽略此异常");

        var startTime = System.currentTimeMillis();
        MXServer.sendEMail(CONFIG.to, CONFIG.from, CONFIG.subject + " [TC04-异常堆栈]", testException);
        var elapsed = System.currentTimeMillis() - startTime;

        logger.info("[" + scriptName + "] sendEMail 异常堆栈 发送成功, 耗时: " + elapsed + "ms");
        return {
            tcName: tcName,
            status: "success",
            elapsed: elapsed + "ms"
        };
    } catch (e) {
        logger.error("[" + scriptName + "] " + tcName + " 发送失败: " + e);
        return {tcName: tcName, status: "error", message: e.toString()};
    }
}

/**
 * TC05: 带附件
 * 调用: sendEMail(String to, String from, String subject, String message, String attachment, String filename)
 */
function tc05_sendWithAttachment() {
    var tcName = "TC05-sendEMail(to, from, subject, message, attachment, filename) - 带附件";
    logger.info("[" + scriptName + "] ---------- " + tcName + " ----------");

    if (!hasTargetEmail()) {
        return {tcName: tcName, status: "skipped", message: getSendResult()}
    }

    try {
        var attachmentPath = CONFIG.attachmentPath;
        var attachmentName = CONFIG.attachmentName;

        if (!attachmentPath) {
            return {
                tcName: tcName,
                status: "skipped",
                message: "未指定附件路径(attachmentPath)，跳过。" +
                    "请在请求body中传入: {\"attachmentPath\":\"/path/to/file\", \"attachmentName\":\"文件名\"}"
            };
        }

        var startTime = System.currentTimeMillis();
        MXServer.sendEMail(CONFIG.to, CONFIG.from, CONFIG.subject + " [TC05-附件]",
            CONFIG.message, attachmentPath, attachmentName || "attachment.txt");
        var elapsed = System.currentTimeMillis() - startTime;

        logger.info("[" + scriptName + "] sendEMail 带附件 发送成功, 耗时: " + elapsed + "ms");
        return {
            tcName: tcName,
            status: "success",
            attachmentPath: attachmentPath,
            attachmentName: attachmentName || "attachment.txt",
            elapsed: elapsed + "ms"
        };
    } catch (e) {
        logger.error("[" + scriptName + "] " + tcName + " 发送失败: " + e);
        return {tcName: tcName, status: "error", message: e.toString()};
    }
}

/**
 * TC06: 完整版邮件发送
 * 调用: sendEMail(to, cc, bcc, from, subject, message, ReplyTo, fileName[], urlName[])
 */
function tc06_sendFullFeatured() {
    var tcName = "TC06-sendEMail(to, cc, bcc, from, subject, message, ReplyTo, fileName[], urlName[]) - 完整版";
    logger.info("[" + scriptName + "] ---------- " + tcName + " ----------");

    if (!hasTargetEmail()) {
        return {tcName: tcName, status: "skipped", message: getSendResult()}
    }

    try {
        // 构建文件附件数组
        var fileNames = CONFIG.fileNames;
        var fileNamesArray = null;
        if (fileNames && fileNames.length > 0) {
            fileNamesArray = Java.type("java.lang.String[]")(fileNames);
        } else if (CONFIG.attachmentPath) {
            fileNamesArray = Java.type("java.lang.String[]")([CONFIG.attachmentPath]);
        }

        // 构建URL附件数组
        var urlNames = CONFIG.urlNames;
        var urlNamesArray = null;
        if (urlNames && urlNames.length > 0) {
            urlNamesArray = Java.type("java.lang.String[]")(urlNames);
        }

        var startTime = System.currentTimeMillis();
        MXServer.sendEMail(
            CONFIG.to,           // to
            CONFIG.cc,            // cc
            CONFIG.bcc,           // bcc
            CONFIG.from,          // from
            CONFIG.subject + " [TC06-完整版]", // subject
            CONFIG.message,       // message
            CONFIG.replyTo,       // ReplyTo
            fileNamesArray,       // fileName[]
            urlNamesArray         // urlName[]
        );
        var elapsed = System.currentTimeMillis() - startTime;

        var detail = {
            tcName: tcName,
            status: "success",
            to: CONFIG.to,
            cc: CONFIG.cc || "(无)",
            bcc: CONFIG.bcc || "(无)",
            from: CONFIG.from,
            replyTo: CONFIG.replyTo || "(无)",
            elapsed: elapsed + "ms"
        };
        if (fileNamesArray) detail.attachments = CONFIG.fileNames || [CONFIG.attachmentPath];
        if (urlNamesArray) detail.urlAttachments = CONFIG.urlNames;

        logger.info("[" + scriptName + "] sendEMail 完整版 发送成功, 耗时: " + elapsed + "ms");
        return detail;
    } catch (e) {
        logger.error("[" + scriptName + "] " + tcName + " 发送失败: " + e);
        return {tcName: tcName, status: "error", message: e.toString()};
    }
}

/**
 * TC07: 发送HTML内容邮件
 * 通过设置 mxe.email.content.type=text/html 系统属性支持HTML邮件
 */
function tc07_sendHtmlEmail() {
    var tcName = "TC07-sendEMail(to, from, subject, message) - HTML内容邮件";
    logger.info("[" + scriptName + "] ---------- " + tcName + " ----------");

    if (!hasTargetEmail()) {
        return {tcName: tcName, status: "skipped", message: getSendResult()}
    }

    try {
        var htmlContent = "<html><body>" +
            "<h2 style='color: #0066cc;'>Maximo MXServer.sendEMail 测试邮件</h2>" +
            "<hr/>" +
            "<p>这是一封 <b>HTML 格式</b>的测试邮件。</p>" +
            "<ul>" +
            "<li>发送方式: <code>MXServer.sendEMail()</code></li>" +
            "<li>发送时间: " + new Date() + "</li>" +
            "<li>脚本名称: " + scriptName + "</li>" +
            "</ul>" +
            "<hr/>" +
            "<p style='color: #999; font-size: 12px;'>如果收到此邮件，说明HTML邮件发送功能正常。</p>" +
            "</body></html>";

        var startTime = System.currentTimeMillis();
        MXServer.sendEMail(CONFIG.to, CONFIG.from, CONFIG.subject + " [TC07-HTML]", htmlContent);
        var elapsed = System.currentTimeMillis() - startTime;

        logger.info("[" + scriptName + "] sendEMail HTML邮件 发送成功, 耗时: " + elapsed + "ms");
        return {
            tcName: tcName,
            status: "success",
            contentType: "text/html",
            elapsed: elapsed + "ms"
        };
    } catch (e) {
        logger.error("[" + scriptName + "] " + tcName + " 发送失败: " + e);
        return {tcName: tcName, status: "error", message: e.toString()};
    }
}

/**
 * TC08: 日語郵件發送
 * 以日語內容發送郵件，測試日語編碼(mxe.email.charset)支援
 */
function tc08_sendLangEmail() {
    var tcName = "TC08-sendEMail(to, from, subject, message) - 日本語メール送信";
    logger.info("[" + scriptName + "] ---------- " + tcName + " ----------");

    if (!hasTargetEmail()) {
        return {tcName: tcName, status: "skipped", message: getSendResult()}
    }
    if (!CONFIG.from) {
        return {tcName: tcName, status: "skipped",
            message: "発信者(from)が空です！SMTPサーバーは Mail from が認証ユーザーと一致する必要があります。"};
    }

    try {
        // 日本語件名と本文
        var jpSubject = CONFIG.subject + " [TC08-日本語]";
        if (CONFIG.subject.indexOf("[Test]") >= 0) {
            jpSubject = "【テスト】Maximo MXServer.sendEMail 日本語メール送信テスト";
        }

        var jpMessage = "----------------------------------------\n" +
            "Maximo MXServer.sendEMail 日本語メール送信テスト\n" +
            "----------------------------------------\n" +
            "\n" +
            "このメールは Maximo システムから送信されています。\n" +
            "\n" +
            "--- 送信情報 ---\n" +
            "送信方法: MXServer.sendEMail()\n" +
            "スクリプト名: " + scriptName + "\n" +
            "送信日時: " + new Date() + "\n" +
            "文字コード: " + (MXServer.getMXServer().getProperty("mxe.email.charset") || "UTF-8") + "\n" +
            "\n" +
            "このメールが正常に届いた場合、日本語メール送信は正常に動作しています。\n" +
            "----------------------------------------\n";

        logger.info("[" + scriptName + "] 日本語メールを送信中...");
        var startTime = System.currentTimeMillis();

        MXServer.sendEMail(CONFIG.to, CONFIG.from, jpSubject, jpMessage);

        var elapsed = System.currentTimeMillis() - startTime;
        logger.info("[" + scriptName + "] 日本語メール送信成功, 所要時間: " + elapsed + "ms");

        return {
            tcName: tcName,
            status: "success",
            to: CONFIG.to,
            from: CONFIG.from,
            subject: jpSubject,
            lang: "ja",
            charset: MXServer.getMXServer().getProperty("mxe.email.charset") || "UTF-8",
            elapsed: elapsed + "ms"
        };
    } catch (e) {
        logger.error("[" + scriptName + "] " + tcName + " 送信失敗: " + e);
        return {tcName: tcName, status: "error", message: e.toString()};
    }
}

/**
 * 接口脚本配置说明
 *
 * 脚本类型: 接口脚本 (interface=1)
 * 建议命名: TEST_SKS_EMAIL
 * 包路径: cn.shoukaiseki.test
 *
 * 请求方式: POST
 * 请求URL: /maximo/api/os/script/TEST_SKS_EMAIL
 *
 * 请求Body示例:
 * {
 *   // === 必填 ===
 *   "to": "recipient@example.com",
 *
 *   // === 可选 ===
 *   "from": "maximo@test.com",          // 发件人(默认: maximo@test.com)
 *   "cc": "cc@example.com",             // 抄送
 *   "bcc": "bcc@example.com",           // 密送
 *   "replyTo": "reply@example.com",     // 回复地址
 *   "subject": "测试邮件主题",           // 主题
 *   "message": "邮件正文内容",           // 正文
 *   "attachmentPath": "/path/to/file",  // 附件路径
 *   "attachmentName": "display.txt"     // 附件显示名
 * }
 *
 * 配置参数:
 * {
 *   "autoscript": "TEST_SKS_EMAIL",
 *   "description": "邮件发送测试脚本(MXServer.sendEMail)",
 *   "interface": 1,
 *   "scriptlanguage": "JavaScript",
 *   "langcode": "ZH",
 *   "ibm_packagepath": "cn.shoukaiseki.test",
 *   "loglevel": "ERROR",
 *   "active": 1,
 *   "status": "Draft"
 * }
 */