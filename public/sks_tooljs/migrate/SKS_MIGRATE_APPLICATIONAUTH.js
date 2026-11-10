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
// 本脚本固定处理 APPLICATIONAUTH: 业务主键就是 APP + GROUPNAME + OPTIONNAME, 三者缺一不可
var KEY_FIELDS = ["APP", "GROUPNAME", "OPTIONNAME"];
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
    // 三个主键字段必须齐全, 否则会命中其它安全组的权限行
    var missing = missingKeyFields(data);
    if (missing.length > 0) {
        out._status = "failed";
        out._message = "缺少主键字段: " + missing.join(", ");
        return out;
    }
    out._id = String(data.APP) + "/" + String(data.GROUPNAME) + "/" + String(data.OPTIONNAME);
    var set = null;
    try {
        set = mxserver.getMboSet(OBJECT_NAME, userInfo);
        if (config.dmDeploySet === true) {
            try { set.setDMDeploySet(true); } catch (ignored) { }
        }
        // 用 SqlFormat 处理主键条件, 自动做类型/引号转义
        var sqlf = new SqlFormat("app = :1 and groupname = :2 and optionname = :3");
        sqlf.setObject(1, OBJECT_NAME, "APP", String(data.APP));
        sqlf.setObject(2, OBJECT_NAME, "GROUPNAME", String(data.GROUPNAME));
        sqlf.setObject(3, OBJECT_NAME, "OPTIONNAME", String(data.OPTIONNAME));
        set.setWhere(sqlf.format());
        set.reset();

        if (data._delete === true) {
            // 按主键删除, 找不到时 deleteAll 为空操作
            set.deleteAll();
            out._operation = "deleted";
        } else if (set.isEmpty()) {
            applyFields(set.add(), data);
            out._operation = "added";
        } else {
            applyFields(set.getMbo(0), data);
            out._operation = "updated";
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

function missingKeyFields(data) {
    var missing = [];
    for (var i = 0; i < KEY_FIELDS.length; i++) {
        var v = data[KEY_FIELDS[i]];
        if (v === undefined || v === null || String(v).trim() === "") {
            missing.push(KEY_FIELDS[i]);
        }
    }
    return missing;
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
