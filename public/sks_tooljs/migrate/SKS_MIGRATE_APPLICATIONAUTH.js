/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// SKS_MIGRATE_APPLICATIONAUTH.js
// 应用权限组 APPLICATIONAUTH 的迁移脚本
// 调用方式:
//   var sm = service.invokeScript("SKS_MIGRATE_APPLICATIONAUTH");
//   sm.exportApp(config, "ITEM_ITEM");
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

var OBJECT_NAME = "APPLICATIONAUTH";
var APP_FIELD = "APP";
// 主键候选: 取第一组在数据中全部存在的字段
var KEY_CANDIDATES = [["APP", "GROUPNAME", "OPTIONNAME"], ["APP", "GROUPNAME"], ["APP"]];
var SKIP_COLUMNS = ["ROWSTAMP"];
var DETAIL_FIELDS = ["APP", "GROUPNAME", "OPTIONNAME", "INSGROUP", "PRIMARYGROUP"];

function getScriptSigoption(config) {
    return { "sigoptions": [] };
}

function getDetail(config, mbo) {
    var row = {};
    if (!mbo) {
        return row;
    }
    for (var i = 0; i < DETAIL_FIELDS.length; i++) {
        try { row[DETAIL_FIELDS[i]] = mbo.getString(DETAIL_FIELDS[i]); } catch (ignored) { row[DETAIL_FIELDS[i]] = null; }
    }
    row._id = row.APP + "/" + row.GROUPNAME + "/" + row.OPTIONNAME;
    row._status = "success";
    return row;
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
    var out = { "_id": null, "_status": "success" };
    if (!data) {
        out._status = "failed";
        out._message = "数据为空";
        return out;
    }
    var keyFields = resolveKeyFields(data);
    if (keyFields.length === 0) {
        out._status = "failed";
        out._message = "缺少主键字段 " + KEY_CANDIDATES.join(" / ");
        return out;
    }
    out._id = data[keyFields[0]];
    var set = null;
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
            set.deleteAll();
            out._operation = "deleted";
        } else {
            var mbo;
            if (set.isEmpty()) {
                mbo = set.add();
                out._status = "success";
                out._operation = "added";
            } else {
                mbo = set.getMbo(0);
                out._status = "success";
                out._operation = "updated";
            }
            applyFields(mbo, data);
        }
        set.save();
        out._apiAction = config._apiAction;
    } catch (e) {
        out._status = "failed";
        out._message = e.message || String(e);
        logger.error("[" + scriptName + "] changeMbo " + out._id + " 失败", e);
    } finally {
        _close(set, config);
    }
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

function applyFields(mbo, data) {
    for (var k in data) {
        if (!data.hasOwnProperty(k)) {
            continue;
        }
        if (k === "_delete" || k === "_status" || k === "_message" || k === "_apiAction" || k === "_id" || k === "flags") {
            continue;
        }
        var v = data[k];
        if (v === undefined || v === null) {
            continue;
        }
        try {
            mbo.setValue(k, v, MboConstants.NOACCESSCHECK);
        } catch (ignored) { }
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
