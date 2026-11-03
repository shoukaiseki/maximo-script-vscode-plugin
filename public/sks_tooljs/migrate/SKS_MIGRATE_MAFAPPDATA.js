/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// SKS_MIGRATE_MAFAPPDATA.js
// MAF 应用包数据表 MAFAPPDATA 的迁移脚本(新增/修改/删除/导出)
// APPID 关联 MAXAPPS.APP; APP 字段为 zip 字节码(BLOB)
// 调用方式:
//   var sm = service.invokeScript("SKS_MIGRATE_MAFAPPDATA");
//   sm.exportApp(config, "ACTION");                          // 仅元信息(含 ZIP_SIZE), 不含 zip 字节码
//   sm.exportApp(config, "ACTION", { includeZip: true });    // 额外返回 zipBase64(仅适合小包)
//   sm.exportZip(config, "ACTION");                          // 返回 { fileName, bytes }, 供二进制下载
load('nashorn:mozilla_compat.js');

var MXServer = Java.type("psdi.server.MXServer");
var SqlFormat = Java.type("psdi.mbo.SqlFormat");
var MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
var MboConstants = Java.type("psdi.mbo.MboConstants");
var Base64 = Java.type("java.util.Base64");

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

var OBJECT_NAME = "MAFAPPDATA";
var APP_FIELD = "APPID";
var BLOB_FIELD = "APP";
var KEY_CANDIDATES = [[APP_FIELD]];
var SKIP_COLUMNS = ["ROWSTAMP", "APP"];
// DD 读取不到字段时使用的默认字段
var DETAIL_FIELDS = ["MAFAPPDATAID", "APPID", "APPMODE", "DEPLOYDATETIME", "BUILDTIMESTAMP", "DEPLOYBY", "PRIVATEKEY", "STATUS", "VERSION", "REVISION", "CHECKSUM", "ISMOBILE"];
// 虚拟字段(表中不存在的计算/统计字段)统一使用 sks: 前缀, 导入时忽略
var SIZE_FIELD = "sks:ZIP_SIZE";
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
    try { row["sks:ref"] = mbo.getString(APP_FIELD); } catch (ignored) { }
    var appValue = String(row[APP_FIELD] || "").trim().toUpperCase();
    if (config && config._includeZip === true) {
        var zip = exportZip(config, appValue);
        if (zip && zip.bytes) {
            row[SIZE_FIELD] = String(zip.size);
            row["zipBase64"] = Base64.getEncoder().encodeToString(zip.bytes);
        }
    } else {
        var size = queryZipSize(config, appValue);
        if (size !== null && size !== undefined) {
            row[SIZE_FIELD] = String(size);
        }
    }
    row._status = "success";
    return row;
}

/**
 * 读取 zip 字节码长度(不含字节码本身, 避免大字段传输)
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {string} appValue
 * @returns {string|null}
 */
function queryZipSize(config, appValue) {
    var conn = null;
    var ps = null;
    var rs = null;
    var connKey = config._userInfo.getConnectionKey();
    try {
        conn = mxserver.getDBManager().getConnection(connKey);
        ps = conn.prepareStatement("SELECT LENGTH(" + BLOB_FIELD + ") FROM " + OBJECT_NAME + " WHERE " + APP_FIELD + " = ?");
        ps.setString(1, appValue);
        rs = ps.executeQuery();
        if (rs.next()) {
            return rs.getString(1);
        }
    } catch (e) {
        logger.warn("[" + scriptName + "] 读取 " + BLOB_FIELD + " 长度失败: " + (e.message || String(e)));
    } finally {
        _closeOnly(rs);
        _closeOnly(ps);
        if (conn) {
            try { mxserver.getDBManager().freeConnection(connKey, conn); } catch (ignored) { }
        }
    }
    return null;
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

/**
 * 导出: 按 APPID 读取元信息(不含 zip 字节码)
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {string} app
 * @param {Object} [opts] { includeZip: boolean }
 * @returns {Array} 0 或 1 条
 */
function exportApp(config, app, opts) {
    opts = opts || {};
    var sql = "SELECT MAFAPPDATAID, " + APP_FIELD + ", APPMODE, DEPLOYDATETIME, BUILDTIMESTAMP, DEPLOYBY, PRIVATEKEY, STATUS, VERSION, REVISION, CHECKSUM, ISMOBILE, LENGTH(" + BLOB_FIELD + ") AS SKS_ZIP_SIZE FROM " + OBJECT_NAME + " WHERE " + APP_FIELD + " = ?";
    var rows = queryRows(config, sql, app, SKIP_COLUMNS);
    for (var i = 0; i < rows.length; i++) {
        if (rows[i].SKS_ZIP_SIZE !== undefined) {
            rows[i][SIZE_FIELD] = rows[i].SKS_ZIP_SIZE;
            delete rows[i].SKS_ZIP_SIZE;
        }
    }
    if (opts.includeZip === true && rows.length > 0) {
        var zip = exportZip(config, app);
        if (zip && zip.bytes) {
            rows[0].zipBase64 = Base64.getEncoder().encodeToString(zip.bytes);
        }
    }
    return rows;
}

/**
 * 读取 zip 字节码(供 SKS.AUTOSCRIPT.SCREENS 的 _action=exportAppZip 二进制下载)
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {string} app
 * @returns {Object|null} { fileName, bytes, size }
 */
function exportZip(config, app) {
    var conn = null;
    var ps = null;
    var rs = null;
    var connKey = config._userInfo.getConnectionKey();
    try {
        conn = mxserver.getDBManager().getConnection(connKey);
        ps = conn.prepareStatement("SELECT " + BLOB_FIELD + " FROM " + OBJECT_NAME + " WHERE " + APP_FIELD + " = ?");
        ps.setString(1, String(app).trim().toUpperCase());
        rs = ps.executeQuery();
        if (rs.next()) {
            var bytes = rs.getBytes(1);
            if (bytes) {
                return { fileName: String(app).trim().toUpperCase() + ".zip", bytes: bytes, size: bytes.length };
            }
        }
    } finally {
        _closeOnly(rs);
        _closeOnly(ps);
        if (conn) {
            try { mxserver.getDBManager().freeConnection(connKey, conn); } catch (ignored) { }
        }
    }
    return null;
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
 * 变更对象: 新增/修改/删除(元信息与 zip 字节码统一走 JDBC)
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
        out._message = "缺少主键字段 APPID";
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
            var exists = existsRow(conn, appValue);
            var zipBytes = decodeZip(data.zipBase64);
            if (exists) {
                updateRow(conn, appValue, data, zipBytes);
                out._operation = "updated";
            } else {
                if (!zipBytes) {
                    out._status = "skipped";
                    out._message = "无 zip 字节码, 未新增记录";
                } else {
                    insertRow(conn, appValue, data, zipBytes);
                    out._operation = "added";
                }
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
 * 判断应用包记录是否存在
 * @param {java.sql.Connection} conn
 * @param {string} appValue
 */
function existsRow(conn, appValue) {
    var ps = null;
    var rs = null;
    try {
        ps = conn.prepareStatement("SELECT MAFAPPDATAID FROM " + OBJECT_NAME + " WHERE " + APP_FIELD + " = ?");
        ps.setString(1, appValue);
        rs = ps.executeQuery();
        return rs.next();
    } finally {
        _closeOnly(rs);
        _closeOnly(ps);
    }
}

/**
 * 更新已有记录(只更新提供值的字段)
 */
function updateRow(conn, appValue, data, zipBytes) {
    var sets = [];
    var values = [];
    var fields = ["APPMODE", "STATUS", "VERSION", "CHECKSUM", "REVISION", "ISMOBILE", "DEPLOYBY", "PRIVATEKEY"];
    for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        if (data[f] !== undefined && data[f] !== null) {
            sets.push(f + " = ?");
            values.push(data[f]);
        }
    }
    var ps = null;
    try {
        if (zipBytes) {
            var zipSql = "UPDATE " + OBJECT_NAME + " SET " + BLOB_FIELD + " = ?" + (sets.length ? ", " + sets.join(", ") : "") + " WHERE " + APP_FIELD + " = ?";
            ps = conn.prepareStatement(zipSql);
            var idx = 1;
            ps.setBytes(idx++, zipBytes);
            for (var j = 0; j < values.length; j++) {
                ps.setObject(idx++, values[j]);
            }
            ps.setString(idx++, appValue);
            ps.executeUpdate();
        } else if (sets.length) {
            var upSql = "UPDATE " + OBJECT_NAME + " SET " + sets.join(", ") + " WHERE " + APP_FIELD + " = ?";
            ps = conn.prepareStatement(upSql);
            var k = 1;
            for (var m = 0; m < values.length; m++) {
                ps.setObject(k++, values[m]);
            }
            ps.setString(k++, appValue);
            ps.executeUpdate();
        }
    } finally {
        _closeOnly(ps);
    }
}

/**
 * 新增记录(APP 大字段必须有 zip 字节码)
 */
function insertRow(conn, appValue, data, zipBytes) {
    var deployBy = data.DEPLOYBY || "MAXADMIN";
    var appMode = data.APPMODE || "DEBUG";
    var version = data.VERSION || "0.0.0";
    var isMobile = data.ISMOBILE !== undefined && data.ISMOBILE !== null ? data.ISMOBILE : 0;
    var ps = null;
    try {
        ps = conn.prepareStatement("INSERT INTO " + OBJECT_NAME +
            " (MAFAPPDATAID, " + BLOB_FIELD + ", " + APP_FIELD + ", APPMODE, DEPLOYDATETIME, BUILDTIMESTAMP, DEPLOYBY, PRIVATEKEY, STATUS, VERSION, REVISION, CHECKSUM, ISMOBILE)" +
            " VALUES (NEXT VALUE FOR MAFAPPDATASEQ, ?, ?, ?, CURRENT TIMESTAMP, CURRENT TIMESTAMP, ?, ?, ?, ?, ?, ?, ?)");
        var idx = 1;
        ps.setBytes(idx++, zipBytes);
        ps.setString(idx++, appValue);
        ps.setString(idx++, appMode);
        ps.setString(idx++, deployBy);
        ps.setString(idx++, nullIfEmpty(data.PRIVATEKEY));
        ps.setString(idx++, nullIfEmpty(data.STATUS));
        ps.setString(idx++, version);
        ps.setObject(idx++, toIntOrNull(data.REVISION));
        ps.setString(idx++, nullIfEmpty(data.CHECKSUM));
        ps.setObject(idx++, toIntOrNull(isMobile));
        ps.executeUpdate();
    } finally {
        _closeOnly(ps);
    }
}

/**
 * base64 转字节码
 * @param {string} base64Text
 */
function decodeZip(base64Text) {
    if (!base64Text || String(base64Text) === "") {
        return null;
    }
    try {
        return Base64.getDecoder().decode(String(base64Text));
    } catch (e) {
        logger.warn("[" + scriptName + "] zipBase64 解码失败: " + (e.message || String(e)));
        return null;
    }
}

/**
 * 空串转 null
 */
function nullIfEmpty(v) {
    if (v === undefined || v === null || String(v) === "") {
        return null;
    }
    return String(v);
}

/**
 * 转整数(null 安全)
 */
function toIntOrNull(v) {
    if (v === undefined || v === null || String(v).trim() === "") {
        return null;
    }
    return java.lang.Integer.valueOf(String(v));
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
