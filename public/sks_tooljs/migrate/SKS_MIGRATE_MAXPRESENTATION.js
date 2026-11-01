/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// SKS_MIGRATE_MAXPRESENTATION.js
// 应用 XML 表 MAXPRESENTATION 的迁移脚本(新增/修改/删除/导出)
// 一个应用最多一条记录, 也可能没有记录
// 调用方式:
//   var sm = service.invokeScript("SKS_MIGRATE_MAXPRESENTATION");
//   sm.exportApp(config, "ACTION");                        // 不含 PRESENTATION 大字段, 仅返回元信息
//   sm.exportApp(config, "ACTION", { includePresentation: true }); // 含 XML 文本
//   sm.changeMbo(config, { APP: "ACTION", PRESENTATION: "<xml/>" });
load('nashorn:mozilla_compat.js');

var MXServer = Java.type("psdi.server.MXServer");
var SqlFormat = Java.type("psdi.mbo.SqlFormat");
var MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
var StringReader = Java.type("java.io.StringReader");

var scriptName = service.getScriptName();
var mxserver = MXServer.getMXServer();
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
var sksLogAnsiUtils = null;
try {
    sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
} catch (e) { }
var logger = sksLogAnsiUtils ? sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true }) : loggerMX;

var OBJECT_NAME = "MAXPRESENTATION";
var APP_FIELD = "APP";
var KEY_CANDIDATES = [["APP"]];
var SKIP_COLUMNS = ["ROWSTAMP", "PRESENTATION"];
// DD 读取不到字段时使用的默认字段
var DETAIL_FIELDS = ["APP", "MAXPRESENTATIONID"];
// 虚拟字段(表中不存在的计算/统计字段)统一使用 sks: 前缀, 导入时忽略
var SIZE_FIELD = "sks:XML_SIZE";
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
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {psdi.mbo.Mbo} mbo
 */
function getDetail(config, mbo) {
    var row = {};
    if (!mbo) {
        return row;
    }
    readMboFields(config, mbo, row, resolveDetailFields(OBJECT_NAME, DETAIL_FIELDS));
    var xml = null;
    try { xml = mbo.getString("PRESENTATION"); } catch (ignored) { xml = null; }
    if (xml !== null && xml !== undefined) {
        row[SIZE_FIELD] = String(xml.length);
        if (config && config._includePresentation === true) {
            row["PRESENTATION"] = xml;
        }
    }
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
 * 导出: 按 APP 读取(默认不含 PRESENTATION 大字段, 用 LENGTH 返回 sks:XML_SIZE 便于判断是否存在)
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {string} app
 * @param {Object} [opts] { includePresentation: boolean }
 * @returns {Array} 0 或 1 条
 */
function exportApp(config, app, opts) {
    opts = opts || {};
    var cols = "APP, MAXPRESENTATIONID, LENGTH(PRESENTATION) AS SKS_XML_SIZE";
    if (opts.includePresentation === true) {
        cols += ", PRESENTATION";
    }
    var rows = queryRows(config, "SELECT " + cols + " FROM " + OBJECT_NAME + " WHERE " + APP_FIELD + " = ?", app, SKIP_COLUMNS);
    for (var i = 0; i < rows.length; i++) {
        if (rows[i].SKS_XML_SIZE !== undefined) {
            rows[i][SIZE_FIELD] = rows[i].SKS_XML_SIZE;
            delete rows[i].SKS_XML_SIZE;
        }
    }
    return rows;
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
 * 变更对象: 新增/修改/删除(PRESENTATION 为 CLOB, 统一走 JDBC 写入)
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {Object} data
 */
function changeMbo(config, data) {
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
    var appValue = data[APP_FIELD];
    if (appValue === undefined || appValue === null || String(appValue).trim() === "") {
        out._status = "failed";
        out._message = "缺少主键字段 APP";
        cacheUseError.ind3 = out._message;
        out["sks:ref"] = ref;
        out["sks:currentCacheUseError"] = cacheUseError;
        return out;
    }
    appValue = String(appValue).trim().toUpperCase();
    ref = appValue;

    var conn = null;
    var connKey = config._userInfo.getConnectionKey();
    try {
        conn = mxserver.getDBManager().getConnection(connKey);
        conn.setAutoCommit(false);

        if (data._delete === true) {
            var delPs = null;
            try {
                delPs = conn.prepareStatement("DELETE FROM " + OBJECT_NAME + " WHERE " + APP_FIELD + " = ?");
                delPs.setString(1, appValue);
                delPs.executeUpdate();
            } finally {
                _closeOnly(delPs);
            }
            out._operation = "deleted";
        } else {
            var exists = existsPresence(conn, appValue);
            var xml = data.PRESENTATION;
            if (xml === undefined || xml === null) {
                xml = "";
            }
            if (exists) {
                if (String(xml) !== "") {
                    var upPs = null;
                    try {
                        upPs = conn.prepareStatement("UPDATE " + OBJECT_NAME + " SET PRESENTATION = ? WHERE " + APP_FIELD + " = ?");
                        upPs.setCharacterStream(1, new StringReader(String(xml)), String(xml).length);
                        upPs.setString(2, appValue);
                        upPs.executeUpdate();
                    } finally {
                        _closeOnly(upPs);
                    }
                }
                out._operation = "updated";
            } else if (String(xml) !== "") {
                var insPs = null;
                try {
                    insPs = conn.prepareStatement("INSERT INTO " + OBJECT_NAME +
                        " (MAXPRESENTATIONID, " + APP_FIELD + ", PRESENTATION) VALUES (NEXT VALUE FOR MAXPRESENTATIONSEQ, ?, ?)");
                    insPs.setString(1, appValue);
                    insPs.setCharacterStream(2, new StringReader(String(xml)), String(xml).length);
                    insPs.executeUpdate();
                } finally {
                    _closeOnly(insPs);
                }
                out._operation = "added";
            } else {
                out._status = "skipped";
                out._message = "无 XML 内容, 未新增记录";
            }
        }
        conn.commit();
        out._apiAction = config._apiAction;
        out["sks:objectName"] = OBJECT_NAME;
        out["sks:uuid"] = data["sks:uuid"] || createUuid();
        out["sks:uniqueID"] = "";
        out["sks:uniqueIDName"] = "";
    } catch (e) {
        out._status = "failed";
        out._message = e.message || String(e);
        cacheUseError.ind3 = out._message || "导入失败";
        out["sks:currentCacheUseError"] = cacheUseError;
        try { if (conn) conn.rollback(); } catch (ignored) { }
        logger.error("[" + scriptName + "] changeMbo " + ref + " 失败", e);
        if (config._errorAssert === true) {
            throw e;
        }
    } finally {
        if (conn) {
            try { mxserver.getDBManager().freeConnection(connKey, conn); } catch (ignored) { }
        }
    }
    out["sks:ref"] = ref;
    return out;
}

/**
 * 判断应用是否已有 XML 记录
 * @param {java.sql.Connection} conn
 * @param {string} appValue
 */
function existsPresence(conn, appValue) {
    var ps = null;
    var rs = null;
    try {
        ps = conn.prepareStatement("SELECT MAXPRESENTATIONID FROM " + OBJECT_NAME + " WHERE " + APP_FIELD + " = ?");
        ps.setString(1, appValue);
        rs = ps.executeQuery();
        return rs.next();
    } finally {
        _closeOnly(rs);
        _closeOnly(ps);
    }
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
 * 关闭 JDBC 对象
 */
function _closeOnly(obj) {
    try { if (obj) obj.close(); } catch (ignored) { }
}

/**
 * 通过 JDBC 读取(全部字段转字符串)
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
        _closeOnly(rs);
        _closeOnly(ps);
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
