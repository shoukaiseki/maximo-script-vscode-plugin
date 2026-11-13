/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// SKS_MIGRATE_MAXMENU.js
// 应用菜单 MAXMENU 的迁移脚本(操作/工具栏/查找菜单)
// 调用方式:
//   var sm = service.invokeScript("SKS_MIGRATE_MAXMENU");
//   sm.exportApp(config, "ITEM_ITEM");
load('nashorn:mozilla_compat.js');

var MXServer = Java.type("psdi.server.MXServer");
var MboConstants = Java.type("psdi.mbo.MboConstants");
var SqlFormat = Java.type("psdi.mbo.SqlFormat");
var MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");

var scriptName = service.getScriptName();
// 通过 invokeScript 调用本脚本时 service 可能不在闭包作用域, 顶层先捕获, 函数内统一使用 svc
var svc = service;
var mxserver = MXServer.getMXServer();
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
var sksLogAnsiUtils = null;
try {
    sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
} catch (e) { }
var logger = sksLogAnsiUtils ? sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true }) : loggerMX;
// SKS_COMMONS_UTILS 工具脚本(按 Mbo 类型取值/设值, 缺失时回退旧逻辑)
var sksCommonsUtils = null;
try {
    sksCommonsUtils = service.invokeScript("SKS_COMMONS_UTILS");
} catch (ignored) { }
var OrderedJSONObject = Java.type("com.ibm.json.java.OrderedJSONObject");

var OBJECT_NAME = "MAXMENU";
var APP_FIELD = "MODULEAPP";
// MAXMENU_NDX1 唯一索引: MENUTYPE+MODULEAPP+ELEMENTTYPE+KEYVALUE
// 必须先按唯一键匹配, POSITION/SUBPOSITION 只是可更新的属性;
// 否则导出环境里菜单位置调整过(如 WFENDWAIT 由 99/0 改为 88/1)时会被当成新增行, 触发唯一键冲突
var KEY_CANDIDATES = [
    ["MENUTYPE", "MODULEAPP", "ELEMENTTYPE", "KEYVALUE"],
    ["MENUTYPE", "MODULEAPP", "ELEMENTTYPE", "KEYVALUE", "POSITION", "SUBPOSITION"],
    ["MENUTYPE", "MODULEAPP", "KEYVALUE"]
];
var SKIP_COLUMNS = ["ROWSTAMP"];
// DD 读取不到字段时使用的默认字段
var DETAIL_FIELDS = ["MENUTYPE", "MODULEAPP", "ELEMENTTYPE", "KEYVALUE", "POSITION", "SUBPOSITION", "HEADERDESCRIPTION", "URL", "VISIBLE", "IMAGE", "ACCESSKEY", "TABDISPLAY", "MAXMENUID", "PINNED"];
// 字段列表缓存(按对象名)
var detailFieldsCache = {};

/**
 * 生成随机 uuid
 * @returns {string}
 */
function createUuid() {
    try {
        return String(Java.type("java.util.UUID").randomUUID());
    } catch (ignored) {
        return "";
    }
}

/**
 * 当前缓存使用错误信息, 导入失败时返回(排查 setValue 等缓存使用报错)
 * @returns {Object}
 */
function newCacheUseError() {
    return { ind1: "", ind2: "", ind3: "", ind4: "" };
}

function getScriptSigoption(config) {
    return { "sigoptions": [] };
}

function getDetail(config, mbo) {
    var row = {};
    if (!mbo) {
        return row;
    }
    var fields = resolveDetailFields(OBJECT_NAME, DETAIL_FIELDS);
    var aliasMap = {};
    for (var i = 0; i < fields.length; i++) {
        aliasMap[fields[i]] = fields[i];
    }
    if (sksCommonsUtils) {
        try {
            // 按 Mbo 字段类型取值(整数/小数/YORN/日期), 避免 getString 的千分位格式化
            row = JSON.parse(String(sksCommonsUtils.mboToOrderJSONObject(svc, new OrderedJSONObject(), mbo, aliasMap)));
        } catch (e) {
            logger.error("[" + scriptName + "] getDetail mboToOrderJSONObject 失败", e);
            row = {};
        }
    }
    if (!sksCommonsUtils || Object.keys(row).length === 0) {
        readMboFields(config, mbo, row, fields);
    }
    appendLangData(config, mbo, row, fields);
    row["sks:ref"] = row.MENUTYPE + "/" + row.MODULEAPP + "/" + row.KEYVALUE;
    row._status = "success";
    return row;
}

/**
 * 读取 Mbo 字段到 row(回退旧逻辑: 全部按 getString 取值)
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {psdi.mbo.Mbo} mbo
 * @param {Object} row
 * @param {Array<string>} fields
 */
function readMboFields(config, mbo, row, fields) {
    for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        try { row[f] = mbo.getString(f); } catch (ignored) { row[f] = null; }
    }
}

/**
 * 字段启用多语言时追加 sks:langdata({字段:{语言:值}})
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {psdi.mbo.Mbo} mbo
 * @param {Object} row
 * @param {Array<string>} fields
 */
function appendLangData(config, mbo, row, fields) {
    var langcodes = (config && config._allLangcode === true && config._langcodeList) ? config._langcodeList : [];
    if (langcodes.length === 0) {
        return;
    }
    var langData = {};
    var hasLangData = false;
    for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        if (!isMlInUse(mbo, f)) {
            continue;
        }
        var vals = {};
        for (var j = 0; j < langcodes.length; j++) {
            try { vals[langcodes[j]] = mbo.getString(f, langcodes[j]); } catch (ignored) { }
        }
        langData[f] = vals;
        hasLangData = true;
    }
    if (hasLangData) {
        row["sks:langdata"] = langData;
    }
}

/**
 * 详情字段: 优先从 MaximoDD 读取对象的持久化属性(排除 SKIP_COLUMNS), 失败时使用默认字段
 * @param {string} objectName
 * @param {Array<string>} fallbackFields
 * @returns {Array<string>}
 */
function resolveDetailFields(objectName, fallbackFields) {
    if (detailFieldsCache[objectName]) {
        return detailFieldsCache[objectName];
    }
    var list = [];
    try {
        var setInfo = mxserver.getMaximoDD().getMboSetInfo(objectName);
        var attrs = setInfo.getAttributes();
        while (attrs.hasNext()) {
            var info = attrs.next();
            var name = String(info.getAttributeName() || "").toUpperCase();
            if (name === "" || SKIP_COLUMNS.indexOf(name) >= 0) {
                continue;
            }
            var persistent = true;
            try { persistent = info.isPersistent(); } catch (ignored) { }
            if (persistent === false) {
                continue;
            }
            list.push(name);
        }
    } catch (e) {
        logger.warn("[" + scriptName + "] 读取 " + objectName + " 字段列表失败, 使用默认字段", e);
    }
    if (list.length === 0) {
        list = fallbackFields.slice(0);
    }
    detailFieldsCache[objectName] = list;
    return list;
}

/**
 * 判断字段是否启用多语言: 优先 MboValue.getMboValueInfo(), 回退 MboValueInfoStatic
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} field
 * @returns {boolean}
 */
function isMlInUse(mbo, field) {
    try {
        var mv = mbo.getMboValue(field);
        var mvInfo = mv ? mv.getMboValueInfo() : null;
        if (mvInfo && mlFlag(mvInfo)) {
            return true;
        }
    } catch (ignored) { }
    try {
        var staticInfo = mbo.getMboValueInfoStatic(field);
        if (staticInfo && mlFlag(staticInfo)) {
            return true;
        }
    } catch (ignored) { }
    return false;
}

/**
 * MboValueInfo / MboValueInfoStatic 的多语言标记
 * @param {Object} info
 * @returns {boolean}
 */
function mlFlag(info) {
    try { if (info.isMLInUse()) { return true; } } catch (ignored) { }
    try { if (info.isMLSupported()) { return true; } } catch (ignored) { }
    return false;
}

function exportApp(config, app) {
    return queryRows(config, "SELECT * FROM " + OBJECT_NAME + " WHERE " + APP_FIELD + " = ?", app, SKIP_COLUMNS);
}

function importApp(config, rows, app) {
    var results = [];
    if (!rows) {
        return results;
    }
    for (var i = 0; i < rows.length; i++) {
        var data = rows[i];
        if (data && data[APP_FIELD] === undefined && app) {
            data[APP_FIELD] = app;
        }
        results.push(changeMbo(config, data));
    }
    return results;
}

function changeMbo(config, data) {
    var userInfo = config._userInfo;
    var out = { "_status": "success" };
    var ref = null;
    var cacheUseError = newCacheUseError();
    cacheUseError.ind1 = " objectName=" + OBJECT_NAME;
    if (!data) {
        out._status = "failed";
        out._message = "数据为空";
        cacheUseError.ind3 = out._message;
        out["sks:ref"] = ref;
        out["sks:currentCacheUseError"] = cacheUseError;
        return out;
    }
    var keyFields = resolveKeyFields(data);
    if (keyFields.length === 0) {
        out._status = "failed";
        out._message = "缺少主键字段 " + KEY_CANDIDATES.join(" / ");
        cacheUseError.ind3 = out._message;
        out["sks:ref"] = ref;
        out["sks:currentCacheUseError"] = cacheUseError;
        return out;
    }
    ref = data[keyFields[0]];
    var set = null;
    var mbo = null;
    try {
        set = mxserver.getMboSet(OBJECT_NAME, userInfo);
        if (config.dmDeploySet === true) {
            try { set.setDMDeploySet(true); } catch (ignored) { }
        }
        var sqlf = new SqlFormat(buildWhere(keyFields));
        for (var i = 0; i < keyFields.length; i++) {
            sqlf.setObject(i + 1, OBJECT_NAME, keyFields[i], String(data[keyFields[i]]));
        }
        set.setWhere(sqlf.format());
        set.reset();

        if (data._delete === true) {
            try { mbo = set.getMbo(0); } catch (ignored) { }
            set.deleteAll();
            out._operation = "deleted";
        } else {
            if (set.isEmpty()) {
                mbo = set.add();
                out._status = "success";
                out._operation = "added";
            } else {
                mbo = set.getMbo(0);
                out._status = "success";
                out._operation = "updated";
            }
            applyFields(mbo, data, cacheUseError);
        }
        set.save();
        out._apiAction = config._apiAction;
        out["sks:objectName"] = OBJECT_NAME;
        out["sks:uuid"] = data["sks:uuid"] || createUuid();
        out["sks:uniqueID"] = "";
        out["sks:uniqueIDName"] = "";
        try {
            if (mbo) {
                out["sks:uniqueID"] = String(mbo.getUniqueIDValue());
                out["sks:uniqueIDName"] = String(mbo.getUniqueIDName());
            }
        } catch (ignored) { }
    } catch (e) {
        out._status = "failed";
        out._message = e.message || String(e);
        cacheUseError.ind3 = out._message || "导入失败";
        out["sks:currentCacheUseError"] = cacheUseError;
        logger.error("[" + scriptName + "] changeMbo " + ref + " 失败", e);
        if (config._errorAssert === true) {
            throw e;
        }
    } finally {
        _close(set, config);
    }
    out["sks:ref"] = ref;
    return out;
}

function _close(mboSet, config) {
    try {
        if (!mboSet) {
            return;
        }
        if (config && config._deferredCloseSets) {
            config._deferredCloseSets.push(mboSet);
            return;
        }
        try { mboSet.cleanup(); } catch (ignored) { }
        try { mboSet.close(); } catch (ignored) { }
    } catch (ignored) { }
}

function resolveKeyFields(data) {
    for (var i = 0; i < KEY_CANDIDATES.length; i++) {
        var keys = KEY_CANDIDATES[i];
        var ok = true;
        for (var j = 0; j < keys.length; j++) {
            if (data[keys[j]] === undefined || data[keys[j]] === null || String(data[keys[j]]).trim() === "") {
                ok = false;
                break;
            }
        }
        if (ok) {
            return keys;
        }
    }
    return [];
}

function buildWhere(keyFields) {
    var parts = [];
    for (var i = 0; i < keyFields.length; i++) {
        parts.push(keyFields[i].toLowerCase() + " = :" + (i + 1));
    }
    return parts.join(" and ");
}

function applyFields(mbo, data, cacheUseError) {
    // 唯一ID列由 Maximo 自动生成, 导入时不能写入(否则不同环境ID重复会触发 -803)
    var uniqueIDName = "";
    try { uniqueIDName = String(mbo.getUniqueIDName() || "").toUpperCase(); } catch (ignored) { }
    // sks:langdata = { 字段: { 语言: 值 } }, 启用多语言的字段改用 setMLValue 逐语言设置
    var langData = data["sks:langdata"];
    for (var k in data) {
        if (!data.hasOwnProperty(k)) {
            continue;
        }
        if (k.charAt(0) === "_" || k.indexOf(":") >= 0 || k === "flags" || k.toUpperCase() === "ROWSTAMP" || k.toUpperCase() === uniqueIDName) {
            continue;
        }
        if (langData && langData.hasOwnProperty(k)) {
            // 多语言字段交给 applyLangData 统一设置, 避免按当前会话语言写入错误的译文
            continue;
        }
        var v = data[k];
        if (v === undefined || v === null) {
            continue;
        }
        try {
            if (sksCommonsUtils) {
                // 按 Mbo 字段类型自动转换后设值(支持 null/YORN/日期/数值)
                sksCommonsUtils.autoMboSetValue(svc, mbo, k, data[k], MboConstants.NOACCESSCHECK);
            } else {
                mbo.setValue(k, data[k], MboConstants.NOACCESSCHECK);
            }
        } catch (e) {
            cacheUseError.ind2 = " attrName=" + k;
            cacheUseError.ind3 = e.message || String(e);
            logger.error("[" + scriptName + "] applyFields setValue " + k + " 失败", e);
        }
    }
    applyLangData(mbo, data, cacheUseError);
}

/**
 * 设置多语言字段: data["sks:langdata"] = { 字段: { 语言: 值 } }
 * accessModifier 与 Maximo 内部用法一致: 11 = NOVALIDATION(1) | NOACCESSCHECK(2) | NOACTION(8)
 * @param {psdi.mbo.Mbo} mbo
 * @param {Object} data
 * @param {Object} cacheUseError
 */
function applyLangData(mbo, data, cacheUseError) {
    var langData = data["sks:langdata"];
    if (!langData || typeof langData !== "object") {
        return;
    }
    for (var field in langData) {
        if (!langData.hasOwnProperty(field)) {
            continue;
        }
        var vals = langData[field];
        if (!vals || typeof vals !== "object") {
            continue;
        }
        for (var lang in vals) {
            if (!vals.hasOwnProperty(lang)) {
                continue;
            }
            var v = vals[lang];
            // ~null~ 是多语言字段在基表的占位值, 不能当作译文写入
            if (v === undefined || v === null || String(v) === "~null~") {
                continue;
            }
            try {
                mbo.setMLValue(field, String(lang).toUpperCase(), String(v), 11);
            } catch (e) {
                cacheUseError.ind2 = " mlAttrName=" + field + "@" + lang;
                cacheUseError.ind3 = e.message || String(e);
                logger.error("[" + scriptName + "] applyLangData setMLValue " + field + "@" + lang + " 失败", e);
            }
        }
    }
}

function queryRows(config, sql, appValue, skipColumns) {
    var rows = [];
    var conn = null;
    var connKey = config._userInfo.getConnectionKey();
    try {
        conn = mxserver.getDBManager().getConnection(connKey);
        var ps = conn.prepareStatement(sql);
        if (appValue !== null && appValue !== undefined) {
            ps.setString(1, appValue);
        }
        var rs = ps.executeQuery();
        var meta = rs.getMetaData();
        var count = meta.getColumnCount();
        while (rs.next()) {
            var row = {};
            for (var i = 1; i <= count; i++) {
                var col = String(meta.getColumnLabel(i)).toUpperCase();
                if (skipColumns && skipColumns.indexOf(col) >= 0) {
                    continue;
                }
                row[col] = rs.getString(i);
            }
            rows.push(row);
        }
    } finally {
        if (conn) {
            try { mxserver.getDBManager().freeConnection(connKey, conn); } catch (ignored) { }
        }
    }
    return rows;
}
