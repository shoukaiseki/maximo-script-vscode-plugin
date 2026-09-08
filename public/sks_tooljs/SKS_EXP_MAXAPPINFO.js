/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
load('nashorn:mozilla_compat.js');
// SKS_EXP_MAXAPPINFO.js
// 导出 MAXAPPINFO (SIGOPTION + SIGOPTFLAG + MAXMENU) 为 JSON
// 参照 SKS_IMP_MAXAPPINFO.js 的导入格式, 导出的JSON可直接用于导入
// 调用方式: POST /api/script/SKS_EXP_MAXAPPINFO?app=APPNAME&ignoreDefVal=true&_langcode=ZH

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");
/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");
/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");
/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");

var scriptName = service.getScriptName()
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
var mxserver = MXServer.getMXServer();
var sksLogAnsiUtils = null;
try {
    sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
} catch (e) { }
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils ? sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true, printModel: false }) : loggerMX;

// _langcode 处理
if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
    var _langcode = request.getQueryParam("_langcode");
    userInfo.setLangCode(_langcode);
    logger.info("[" + scriptName + "] _langcode=" + userInfo.getLocale().getLanguage());
}

// 精简模式: 省略空值或默认值, 简化JSON(用于跨环境迁移)
var ignoreDefVal = false;
if (request.getQueryParam("ignoreDefVal") == "true") {
    ignoreDefVal = true;
}

try {
    var appName = request.getQueryParam("app");
    if (!appName || appName === 'undefined' || appName.trim() === "") {
        responseBody = JSON.stringify({ status: "error", message: "缺少app参数" });
        exit;
    }
    appName = appName.trim().toUpperCase();
    logger.info("[" + scriptName + "] 导出 MAXAPPINFO: app=" + appName + ", ignoreDefVal=" + ignoreDefVal);

    var result = {};
    result.app = appName;
    result.sigoptions = exportSigoptions(appName);
    result.menus = exportMaxmenus(appName);

    logger.info("[" + scriptName + "] 导出完成: sigoptions=" + result.sigoptions.length + ", menus=" + result.menus.length);
    responseBody = JSON.stringify(result);
} catch (e) {
    logger.error("[" + scriptName + "] error", e);
    responseBody = JSON.stringify({ status: "error", message: "导出失败: " + (e.message || String(e)) });
}

/**
 * 导出 SIGOPTION + SIGOPTFLAG 子表
 * @param {string} appName
 * @returns {Array}
 */
function exportSigoptions(appName) {
    var sigoptions = [];
    var sigOptSet = null;
    try {
        sigOptSet = mxserver.getMboSet("SIGOPTION", userInfo);
        var sqlf = new SqlFormat("app = :1");
        sqlf.setObject(1, "SIGOPTION", "APP", appName);
        sigOptSet.setWhere(sqlf.format());
        sigOptSet.reset();
        try { sigOptSet.setOrderBy("OPTIONNAME"); } catch (e) { }

        for (var sigOptMbo = sigOptSet.moveFirst(); sigOptMbo; sigOptMbo = sigOptSet.moveNext()) {
            var opt = {};
            opt.optionName = sigOptMbo.getString("OPTIONNAME");

            addStr(opt, "description", sigOptMbo.getString("DESCRIPTION"));
            addBool(opt, "esigEnabled", sigOptMbo.getBoolean("ESIGENABLED"), false);
            addBool(opt, "visible", sigOptMbo.getBoolean("VISIBLE"), true);
            addStr(opt, "alsoGrants", sigOptMbo.getString("ALSOGRANTS"));
            addStr(opt, "alsoRevokes", sigOptMbo.getString("ALSOREVOKES"));
            addStr(opt, "prerequisite", sigOptMbo.getString("PREREQUISITE"));

            // SIGOPTFLAG 子表
            var flags = [];
            var flagSet = null;
            try {
                flagSet = sigOptMbo.getMboSet("SIGOPTFLAG");
                for (var flagMbo = flagSet.moveFirst(); flagMbo; flagMbo = flagSet.moveNext()) {
                    var flag = {};
                    flag.flagName = flagMbo.getString("FLAGNAME");
                    addStr(flag, "value", flagMbo.getString("VALUE"));
                    flags.push(flag);
                }
            } finally {
                _close(flagSet);
            }
            if (flags.length > 0) {
                opt.flags = flags;
            }

            sigoptions.push(opt);
        }
    } finally {
        _close(sigOptSet);
    }
    return sigoptions;
}

/**
 * 导出 MAXMENU
 * @param {string} appName
 * @returns {Array}
 */
function exportMaxmenus(appName) {
    var menus = [];
    var menuSet = null;
    try {
        menuSet = mxserver.getMboSet("MAXMENU", userInfo);
        var sqlf = new SqlFormat("moduleapp = :1");
        sqlf.setObject(1, "MAXMENU", "MODULEAPP", appName);
        menuSet.setWhere(sqlf.format());
        menuSet.reset();
        try { menuSet.setOrderBy("MENUTYPE, POSITION, SUBPOSITION"); } catch (e) { }

        for (var menuMbo = menuSet.moveFirst(); menuMbo; menuMbo = menuSet.moveNext()) {
            var menu = {};
            menu.menuType = menuMbo.getString("MENUTYPE");
            menu.keyValue = menuMbo.getString("KEYVALUE");
            menu.elementType = menuMbo.getString("ELEMENTTYPE");

            addInt(menu, "position", menuMbo.getInt("POSITION"), 0);
            addInt(menu, "subPosition", menuMbo.getInt("SUBPOSITION"), 0);
            addStr(menu, "headerDescription", menuMbo.getString("HEADERDESCRIPTION"));
            addStr(menu, "url", menuMbo.getString("URL"));
            addBool(menu, "visible", menuMbo.getBoolean("VISIBLE"), true);
            addStr(menu, "image", menuMbo.getString("IMAGE"));
            addStr(menu, "tabDisplay", menuMbo.getString("TABDISPLAY"));
            addStr(menu, "accessKey", menuMbo.getString("ACCESSKEY"));
            addInt(menu, "pinned", menuMbo.getInt("PINNED"), 0);

            menus.push(menu);
        }
    } finally {
        _close(menuSet);
    }
    return menus;
}

/**
 * 添加字符串字段(精简模式下跳过空值)
 * @param {Object} obj
 * @param {string} field
 * @param {string} val
 */
function addStr(obj, field, val) {
    if (!ignoreDefVal || (val && val.trim() !== "")) {
        obj[field] = val;
    }
}

/**
 * 添加布尔字段(精简模式下跳过默认值)
 * @param {Object} obj
 * @param {string} field
 * @param {boolean} val
 * @param {boolean} defaultVal
 */
function addBool(obj, field, val, defaultVal) {
    if (!ignoreDefVal || val !== defaultVal) {
        obj[field] = val ? true : false;
    }
}

/**
 * 添加整数字段(精简模式下跳过默认值)
 * @param {Object} obj
 * @param {string} field
 * @param {number} val
 * @param {number} defaultVal
 */
function addInt(obj, field, val, defaultVal) {
    if (!ignoreDefVal || val !== defaultVal) {
        obj[field] = val;
    }
}

/**
 * 关闭 MboSet 释放资源
 * @param {psdi.mbo.MboSetRemote} set
 */
function _close(set) {
    try {
        if (set) {
            set.cleanup();
            set.close();
        }
    } catch (ignored) { }
}
