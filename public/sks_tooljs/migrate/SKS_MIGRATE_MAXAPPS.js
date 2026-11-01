/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// SKS_MIGRATE_MAXAPPS.js
// 应用主表 MAXAPPS 的迁移脚本(新增/修改/删除/导出)
// 调用方式:
//   var sm = service.invokeScript("SKS_MIGRATE_MAXAPPS");
//   sm.exportApp(config, "ITEM_ITEM");
//   sm.changeMbo(config, { APP: "ITEM_ITEM", DESCRIPTION: "...", _apiAction: "imp" });
load('nashorn:mozilla_compat.js');

var MXServer = Java.type("psdi.server.MXServer");
var MboConstants = Java.type("psdi.mbo.MboConstants");
var SqlFormat = Java.type("psdi.mbo.SqlFormat");
var MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");

var scriptName = service.getScriptName();
var mxserver = MXServer.getMXServer();
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
var sksLogAnsiUtils = null;
try {
    sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
} catch (e) { }
var logger = sksLogAnsiUtils ? sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true }) : loggerMX;

var OBJECT_NAME = "MAXAPPS";
var APP_FIELD = "APP";
var KEY_CANDIDATES = [["APP"]];
var SKIP_COLUMNS = ["ROWSTAMP"];
// DD 读取不到字段时使用的默认字段
var DETAIL_FIELDS = ["APP", "DESCRIPTION", "APPTYPE", "RESTRICTIONS", "ORDERBY", "ORIGINALAPP", "CUSTAPPTYPE", "MAINTBNAME", "MAXAPPSID", "ISMOBILE", "LOCKENABLED", "HASLD", "LANGCODE", "SKIPNAVIGATION"];
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

/**
 * 预留: 返回本脚本添加到对应应用的签名选项
 * @param {jscustom.SksMigrateParamConfig} config
 */
function getScriptSigoption(config) {
    return { "sigoptions": [] };
}

/**
 * 获取行详情(传入 Mbo 时使用)
 * config._allLangcode=true 时, 对启用多语言的字段输出 sks:langdata
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {psdi.mbo.Mbo} mbo
 */
function getDetail(config, mbo) {
    var row = {};
    if (!mbo) {
        return row;
    }
    readMboFields(config, mbo, row, resolveDetailFields(OBJECT_NAME, DETAIL_FIELDS));
    try { row["sks:ref"] = mbo.getString(APP_FIELD); } catch (ignored) { }
    row._status = "success";
    return row;
}

/**
 * 读取 Mbo 字段到 row; 字段启用多语言时追加 sks:langdata({字段:{语言:值}})
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {psdi.mbo.Mbo} mbo
 * @param {Object} row
 * @param {Array<string>} fields
 */
function readMboFields(config, mbo, row, fields) {
    var langcodes = (config && config._allLangcode === true && config._langcodeList) ? config._langcodeList : [];
    var langData = {};
    var hasLangData = false;
    for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        try { row[f] = mbo.getString(f); } catch (ignored) { row[f] = null; }
        if (langcodes.length === 0 || !isMlInUse(mbo, f)) {
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

/**
 * 导出: 按 APP 读取整行(跳过 ROWSTAMP), 全部字段转字符串
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {string} app
 * @returns {Array}
 */
function exportApp(config, app) {
    var sql = "SELECT * FROM " + OBJECT_NAME + " WHERE " + APP_FIELD + " = ?";
    return queryRows(config, sql, app, SKIP_COLUMNS);
}

/**
 * 导入: 遍历行数据逐条新增/修改/删除
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {Array} rows
 * @param {string} app
 */
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

/**
 * 变更对象: 新增/修改/删除
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {Object} data
 */
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

/**
 * 关闭 MboSet(支持延迟关闭)
 * @param {psdi.mbo.MboSet} mboSet
 * @param {jscustom.SksMigrateParamConfig} config
 */
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

/**
 * 选择主键字段: 取第一组在数据中全部存在的字段
 * @param {Object} data
 */
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

/**
 * 生成 where: "app = :1 and ..."
 * @param {Array} keyFields
 */
function buildWhere(keyFields) {
    var parts = [];
    for (var i = 0; i < keyFields.length; i++) {
        parts.push(keyFields[i].toLowerCase() + " = :" + (i + 1));
    }
    return parts.join(" and ");
}

/**
 * 写入非主键/非控制字段
 * @param {psdi.mbo.Mbo} mbo
 * @param {Object} data
 */
function applyFields(mbo, data, cacheUseError) {
    for (var k in data) {
        if (!data.hasOwnProperty(k)) {
            continue;
        }
        if (k.charAt(0) === "_" || k.indexOf(":") >= 0 || k === "flags") {
            continue;
        }
        var v = data[k];
        if (v === undefined || v === null) {
            continue;
        }
        try {
            mbo.setValue(k, v, MboConstants.NOACCESSCHECK);
        } catch (e) {
            cacheUseError.ind2 = " attrName=" + k;
            cacheUseError.ind3 = e.message || String(e);
        }
    }
}

/**
 * 通过 JDBC 读取整行(全部字段转字符串)
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {string} sql
 * @param {string} appValue
 * @param {Array} skipColumns
 */
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

/**
 * 返回脚本对外方法(供 service.invokeScript 使用)
 */
function main() {
    return {
        getScriptSigoption: getScriptSigoption,
        getDetail: getDetail,
        exportApp: exportApp,
        importApp: importApp,
        changeMbo: changeMbo,
        _close: _close
    };
}

main();
