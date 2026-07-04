/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
load('nashorn:mozilla_compat.js');
/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");//13
var scriptName = service.getScriptName()

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");//9

/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");
/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");
/** @type {com.ibm.json.java.JSONArray} */
JSONArray = Java.type("com.ibm.json.java.JSONArray");
/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");

/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
var mxserver = MXServer.getMXServer();
var sksLogAnsiUtils = null;
try {
    sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
} catch (e) { }
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils ? sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true, printModel: false }) : loggerMX;

//_lang=zh ,_lang=en,
// _langcode=zh , _langcode=en
if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
    var _langcode = request.getQueryParam("_langcode");
    // uInfo.setLocale(lang);
    userInfo.setLangCode(_langcode);
    logger.info("------------------_langcode=" + userInfo.getLocale().getLanguage() + ",country=" + userInfo.getLocale().getCountry());
}

try {
    var reqBody = JSON.parse(requestBody);

    // 支持传入数组（多个APP批量导入）或单个对象
    var appList = Array.isArray(reqBody) ? reqBody : [reqBody];

    if (appList.length === 0) {
        responseBody = JSON.stringify({ "code": 400, "message": "请求体为空" });
        exit;
    }

    var results = [];
    var hasError = false;

    for (var ai = 0; ai < appList.length; ai++) {
        var appConfig = appList[ai];

        if (!appConfig.app) {
            results.push({ "code": 400, "message": "缺少app参数", "index": ai });
            hasError = true;
            continue;
        }

        var appName = appConfig.app.toUpperCase();
        logger.info("[" + scriptName + "] [" + ai + "] APP=" + appName);

        var appResult = {
            "code": 200,
            "message": "success",
            "APP": appName,
            "sigoption": { "imported": 0, "updated": 0, "deleted": 0 },
            "maxmenu": { "imported": 0, "updated": 0, "deleted": 0 }
        };

        try {
            // 1. 导入 SIGOPTION
            if (appConfig.sigoptions && appConfig.sigoptions.length > 0) {
                var sigResult = importSigoptions(appName, appConfig.sigoptions);
                appResult.sigoption = sigResult;
            }

            // 2. 导入 MAXMENU
            if (appConfig.menus && appConfig.menus.length > 0) {
                var menuResult = importMaxmenus(appName, appConfig.menus);
                appResult.maxmenu = menuResult;
            }
        } catch (e) {
            logger.error("[" + scriptName + "] [" + ai + "] APP=" + appName + " error", e);
            appResult.code = 500;
            appResult.message = "导入失败: " + e.message;
            hasError = true;
        }

        results.push(appResult);
    }

    responseBody = JSON.stringify({
        "code": hasError ? 500 : 200,
        "message": hasError ? "部分导入完成" : "全部导入完成",
        "data": results
    });
} catch (e) {
    logger.error("[" + scriptName + "] error", e);
    responseBody = JSON.stringify({ "code": 500, "message": "导入失败: " + e.message });
}

/**
 * 导入SIGOPTION（签名选项）
 * SIGOPTION主表字段: APP, OPTIONNAME, DESCRIPTION, ESIGENABLED, VISIBLE, ALSOGRANTS, ALSOREVOKES, PREREQUISITE, LANGCODE
 * 子表 SIGOPTFLAG: APP, OPTIONNAME, FLAGNAME, VALUE
 * @param {string} appName
 * @param {Array} sigoptions
 * @returns {{imported: number, updated: number}}
 */
function importSigoptions(appName, sigoptions) {
    var imported = 0, updated = 0, deleted = 0;
    var sigOptSet = null;
    try {
        sigOptSet = mxserver.getMboSet("SIGOPTION", userInfo);
        var sqlf = new SqlFormat("app = :1");
        sqlf.setObject(1, "SIGOPTION", "APP", appName);
        sigOptSet.setWhere(sqlf.format());
        sigOptSet.reset();

        for (var i = 0; i < sigoptions.length; i++) {
            var opt = sigoptions[i];
            var optName = opt.optionName ? opt.optionName.toUpperCase() : null;
            if (!optName) continue;

            // 删除模式
            if (opt._delete === true) {
                var found = deleteSigoptionMbo(sigOptSet, optName);
                if (found) deleted++;
                continue;
            }

            var exists = false;
            for (var sigOptMbo = sigOptSet.moveFirst(); sigOptMbo; sigOptMbo = sigOptSet.moveNext()) {
                if (sigOptMbo.getString("OPTIONNAME").equalsIgnoreCase(optName)) {
                    exists = true;
                    break;
                }
            }

            if (!exists) {
                sigOptMbo = sigOptSet.add();
                sigOptMbo.setValue("APP", appName, MboConstants.NOACCESSCHECK);
                sigOptMbo.setValue("OPTIONNAME", optName, MboConstants.NOACCESSCHECK);
                imported++;
            } else {
                updated++;
            }

            sigOptMbo.setValue("ESIGENABLED", opt.esigEnabled||false, MboConstants.NOACCESSCHECK);
            logger.info("[" + scriptName + "] SIGOPTION: " + optName + ", description=" + opt.description);
            if (opt.description !== undefined) sigOptMbo.setValue("DESCRIPTION", opt.description, MboConstants.NOACCESSCHECK);
            sigOptMbo.setValue("VISIBLE", opt.visible !== undefined ? opt.visible : true, MboConstants.NOACCESSCHECK);
            if (opt.alsoGrants !== undefined) sigOptMbo.setValue("ALSOGRANTS", opt.alsoGrants, MboConstants.NOACCESSCHECK);
            if (opt.alsoRevokes !== undefined) sigOptMbo.setValue("ALSOREVOKES", opt.alsoRevokes, MboConstants.NOACCESSCHECK);
            if (opt.prerequisite !== undefined) sigOptMbo.setValue("PREREQUISITE", opt.prerequisite, MboConstants.NOACCESSCHECK);

            importSigoptFlags(sigOptMbo, opt.flags);
        }
        sigOptSet.save();
        logger.info("[" + scriptName + "] SIGOPTION导入完成: imported=" + imported + ", updated=" + updated + ", deleted=" + deleted);
    } catch (e) {
        logger.error("[" + scriptName + "] importSigoptions error", e);
        throw e;
    } finally {
        _close(sigOptSet);
    }
    return { "imported": imported, "updated": updated, "deleted": deleted };
}

/**
 * 删除单个SIGOPTION记录（含子表SIGOPTFLAG）
 * @param {psdi.mbo.MboSetRemote} sigOptSet
 * @param {string} optName
 * @returns {boolean} 是否找到并删除
 */
function deleteSigoptionMbo(sigOptSet, optName) {
    for (var mbo = sigOptSet.moveFirst(); mbo; mbo = sigOptSet.moveNext()) {
        if (mbo.getString("OPTIONNAME").equalsIgnoreCase(optName)) {
            logger.info("[" + scriptName + "] 删除SIGOPTION: " + optName);
            // 先删子表SIGOPTFLAG
            var flagSet = null;
            flagSet = mbo.getMboSet("SIGOPTFLAG");
            if (!flagSet.isEmpty()) {
                flagSet.deleteAll();
            }
            mbo.delete();
            return true;
        }
    }
    return false;
}

/**
 * 导入SIGOPTFLAG子表
 * @param {psdi.mbo.MboRemote} sigOptMbo
 * @param {Array} flags
 */
function importSigoptFlags(sigOptMbo, flags) {
    if (!flags || flags.length === 0) return;
    var flagSet = null;
    try {
        flagSet = sigOptMbo.getMboSet("SIGOPTFLAG");
        for (var i = 0; i < flags.length; i++) {
            var f = flags[i];
            if (!f.flagName) continue;

            var exists = false;
            if (!flagSet.isEmpty()) {
                var fm = flagSet.moveFirst();
                while (fm) {
                    if (fm.getString("FLAGNAME").equalsIgnoreCase(f.flagName)) {
                        exists = true;
                        break;
                    }
                    fm = flagSet.moveNext();
                }
            }

            var flagMbo = null;
            if (exists) {
                flagMbo = flagSet.moveFirst();
                while (flagMbo) {
                    if (flagMbo.getString("FLAGNAME").equalsIgnoreCase(f.flagName)) break;
                    flagMbo = flagSet.moveNext();
                }
            } else {
                flagMbo = flagSet.add();
                flagMbo.setValue("APP", sigOptMbo.getString("APP"), MboConstants.NOACCESSCHECK);
                flagMbo.setValue("OPTIONNAME", sigOptMbo.getString("OPTIONNAME"), MboConstants.NOACCESSCHECK);
                flagMbo.setValue("FLAGNAME", f.flagName.toUpperCase(), MboConstants.NOACCESSCHECK);
            }
            if (f.value !== undefined) flagMbo.setValue("VALUE", f.value, MboConstants.NOACCESSCHECK);
        }
    } finally {
        _close(flagSet);
    }
}

/**
 * 导入MAXMENU（操作菜单）
 * MAXMENU字段: MENUTYPE, MODULEAPP, ELEMENTTYPE, POSITION, SUBPOSITION, KEYVALUE,
 *             HEADERDESCRIPTION, DESCRIPTION, URL, VISIBLE, IMAGE, TABDISPLAY, ACCESSKEY, PINNED
 * @param {string} appName
 * @param {Array} menus
 * @returns {{imported: number, updated: number}}
 */
function importMaxmenus(appName, menus) {
    var imported = 0, updated = 0, deleted = 0;
    var menuSet = null;
    try {
        menuSet = mxserver.getMboSet("MAXMENU", userInfo);

        for (var i = 0; i < menus.length; i++) {
            var menu = menus[i];
            var menuType = menu.menuType ? menu.menuType.toUpperCase() : "APPMENU";
            var keyValue = menu.keyValue ? menu.keyValue.toUpperCase() : null;
            if (!keyValue) continue;
            logger.info("[" + scriptName + "] [" + i + "] APP=" + appName + " MENUTYPE=" + menuType + " KEYVALUE=" + keyValue + ", ELEMENTTYPE=" + (menu.elementType) + ", _delete=" + (menu._delete === true));

            // 删除模式
            if (menu._delete === true) {
                var found = deleteMaxmenuMbo(menuSet, menuType, appName, keyValue, menu.elementType);
                if (found) deleted++;
                menuSet.save();
                continue;
            }

            var sqlf = new SqlFormat("menutype = :1 and moduleapp = :2 and keyvalue = :3 and elementtype = :4");
            sqlf.setObject(1, "MAXMENU", "MENUTYPE", menuType);
            sqlf.setObject(2, "MAXMENU", "MODULEAPP", appName);
            sqlf.setObject(3, "MAXMENU", "KEYVALUE", keyValue);
            sqlf.setObject(4, "MAXMENU", "KEYVALUE", menu.elementType || "MENUITEM");

            menuSet.setWhere(sqlf.format());
            menuSet.reset();

            var menuMbo = null;
            if (menuSet.isEmpty()) {
                menuMbo = menuSet.add();
                menuMbo.setValue("MENUTYPE", menuType, MboConstants.NOACCESSCHECK);
                menuMbo.setValue("MODULEAPP", appName, MboConstants.NOACCESSCHECK);
                menuMbo.setValue("KEYVALUE", keyValue, MboConstants.NOACCESSCHECK);
                menuMbo.setValue("ELEMENTTYPE", menu.elementType || "MENUITEM", MboConstants.NOACCESSCHECK);
                imported++;
            } else {
                menuMbo = menuSet.getMbo(0);
                updated++;
            }

            if(menu.tabDisplay !== undefined){
                menuMbo.setValue("TABDISPLAY", menu.tabDisplay, MboConstants.NOACCESSCHECK);
            }
            if (menu.position !== undefined) menuMbo.setValue("POSITION", menu.position, MboConstants.NOACCESSCHECK);
            if (menu.subPosition !== undefined) menuMbo.setValue("SUBPOSITION", menu.subPosition, MboConstants.NOACCESSCHECK);
            if (menu.headerDescription !== undefined) menuMbo.setValue("HEADERDESCRIPTION", menu.headerDescription, MboConstants.NOACCESSCHECK);
            if (menu.visible !== undefined) {
                menuMbo.setValue("VISIBLE", menu.visible, MboConstants.NOACCESSCHECK);
            }else{
                menuMbo.setValue("VISIBLE", true, MboConstants.NOACCESSCHECK);
            }
            if (menu.image !== undefined) menuMbo.setValue("IMAGE", menu.image, MboConstants.NOACCESSCHECK);
            if (menu.url !== undefined) menuMbo.setValue("URL", menu.url, MboConstants.NOACCESSCHECK);
            if (menu.tabDisplay !== undefined) menuMbo.setValue("TABDISPLAY", menu.tabDisplay, MboConstants.NOACCESSCHECK);
            if (menu.accessKey !== undefined) menuMbo.setValue("ACCESSKEY", menu.accessKey, MboConstants.NOACCESSCHECK);
            if (menu.pinned !== undefined) menuMbo.setValue("PINNED", menu.pinned, MboConstants.NOACCESSCHECK);
            menuSet.save();
        }
        logger.info("[" + scriptName + "] MAXMENU导入完成: imported=" + imported + ", updated=" + updated + ", deleted=" + deleted);
    } catch (e) {
        logger.error("[" + scriptName + "] importMaxmenus error");
        sksLogAnsiUtils.throwError(e)
    } finally {
        _close(menuSet);
    }
    return { "imported": imported, "updated": updated, "deleted": deleted };
}

/**
 * 删除单个MAXMENU记录
 * @param {psdi.mbo.MboSetRemote} menuSet
 * @param {string} menuType
 * @param {string} appName
 * @param {string} keyValue
 * @param {string} elementType
 * @returns {boolean} 是否找到并删除
 */
function deleteMaxmenuMbo(menuSet, menuType, appName, keyValue, elementType) {
    var sqlf = new SqlFormat("menutype = :1 and moduleapp = :2 and keyvalue = :3 and elementtype = :4");
    sqlf.setObject(1, "MAXMENU", "MENUTYPE", menuType);
    sqlf.setObject(2, "MAXMENU", "MODULEAPP", appName);
    sqlf.setObject(3, "MAXMENU", "KEYVALUE", keyValue);
    sqlf.setObject(4, "MAXMENU", "KEYVALUE", elementType || "MENUITEM");
    var whereClause = sqlf.format();
    menuSet.setWhere(whereClause);
    menuSet.reset();

    if (!menuSet.isEmpty()) {
        if(menuSet.count() > 1){
            throw MXApplicationException("#", "删除maxmenu中获得的,结果是多行,whereClause:" + whereClause);
        }
        logger.info("[" + scriptName + "] 删除MAXMENU: " + menuType + "/" + keyValue);
        menuSet.deleteAll();
        menuSet.save();
        return true;
    }
    logger.warn("[" + scriptName + "] 未找到MAXMENU: " + menuType + "/" + keyValue);
    return false;
}

function _close(set) {
    try {
        if (set) {
            set.cleanup();
            set.close();
        }
    } catch (ignored) { }
}