/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// SKS_MIGRATE_MAXMESSAGES.js
// 消息 MAXMESSAGES 的迁移脚本(查询详情/导出/导入)
// 唯一键: MSGGROUP + MSGKEY; MAXMESSAGESID 由序列生成, 导入时不写
// 导出字段名与 messages_page_3.json 保持一致:
//   msgGroup, msgKey, value, MAXMESSAGESID, value_zh, displayMethod,
//   options, sks:options, prefix, msgIdPrefix, msgIdSuffix
// 调用方式:
//   var sm = service.invokeScript("SKS_MIGRATE_MAXMESSAGES");
//   sm.exportApp(config);                  // 导出全部消息(不分页)
//   sm.exportApp(config, "system");        // 只导出 MSGGROUP = system
//   sm.importApp(config, rows);            // 按 MSGGROUP + MSGKEY 新增/更新/删除
load('nashorn:mozilla_compat.js');

var MXServer = Java.type("psdi.server.MXServer");
var MXApplicationException = Java.type("psdi.util.MXApplicationException");
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

var OBJECT_NAME = "MAXMESSAGES";
// OPTIONS 位掩码: CLOSE=1, OK=2, CANCEL=4, YES=8, NO=16, WARNING=32, STOP=64, EXCLAMATION=128
var OPTION_ATTRS = [
    ["close", "CLOSE", 1],
    ["ok", "OK", 2],
    ["cancel", "CANCEL", 4],
    ["yes", "YES", 8],
    ["no", "NO", 16],
    ["warning", "WARNING", 32],
    ["stop", "STOP", 64],
    ["exclamation", "EXCLAMATION", 128]
];
// options 数组只放按钮(与 messages_page_3.json 一致); 图标(32/64/128)保留在 sks:options 位掩码
var BUTTON_OPTION_ATTRS = OPTION_ATTRS.slice(0, 5);
// 导出默认不返回的可选字段(camel 名 → MBO 属性), config._includeExtra === true 时追加
var EXTRA_FIELDS = [
    ["title", "TITLE"],
    ["buttonText", "BUTTONTEXT"],
    ["explanation", "EXPLANATION"],
    ["adminResponse", "ADMINRESPONSE"],
    ["operatorResponse", "OPERATORRESPONSE"],
    ["systemAction", "SYSTEMACTION"],
    ["response", "RESPONSE"],
    ["msgId", "MSGID"]
];
// 导入字段映射(camel 名 → MBO 属性), VALUE 单独处理
var IMPORT_FIELDS = [
    ["displayMethod", "DISPLAYMETHOD"],
    ["prefix", "PREFIX"],
    ["title", "TITLE"],
    ["buttonText", "BUTTONTEXT"],
    ["explanation", "EXPLANATION"],
    ["adminResponse", "ADMINRESPONSE"],
    ["operatorResponse", "OPERATORRESPONSE"],
    ["systemAction", "SYSTEMACTION"],
    ["response", "RESPONSE"]
];
// L_MAXMESSAGES 中存放译文的字段(TITLE 非多语言, 不在 L_ 表)
var ML_FIELDS = ["VALUE", "BUTTONTEXT", "EXPLANATION", "ADMINRESPONSE", "OPERATORRESPONSE", "SYSTEMACTION", "RESPONSE"];
var SKIP_COLUMNS = ["ROWSTAMP"];
// DD 读取不到字段时使用的默认字段
var DETAIL_FIELDS = ["MSGGROUP", "MSGKEY", "VALUE", "MAXMESSAGESID", "DISPLAYMETHOD", "OPTIONS", "PREFIX", "MSGID",
    "TITLE", "BUTTONTEXT", "EXPLANATION", "ADMINRESPONSE", "OPERATORRESPONSE", "SYSTEMACTION", "RESPONSE", "OVERLAIDMSG", "OTHERSCRC"];
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

// ---------------------------------------------------------------------------
// 详情
// ---------------------------------------------------------------------------

/**
 * 获取行详情(传入 Mbo 时使用), 字段名与 messages_page_3.json 一致
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {psdi.mbo.Mbo} mbo
 */
function getDetail(config, mbo) {
    var row = {};
    if (!mbo) {
        return row;
    }
    var lang = getConfigLang(config);
    var value = getLangString(mbo, "VALUE", lang);
    row.msgGroup = mboStr(mbo, "MSGGROUP");
    row.msgKey = mboStr(mbo, "MSGKEY");
    row.value = value;
    row.MAXMESSAGESID = mboLongStr(mbo, "MAXMESSAGESID");
    row.value_zh = getValueZh(mbo, lang, value);
    row.displayMethod = mboStr(mbo, "DISPLAYMETHOD");
    var mask = getOptionsMask(mbo);
    row.options = optionsFromMask(mask);
    row["sks:options"] = mask;
    row.prefix = yornToFlag(mboStr(mbo, "PREFIX"));
    var msgId = mboStr(mbo, "MSGID");
    appendMsgId(row, msgId);

    if (config && config._includeExtra === true) {
        for (var i = 0; i < EXTRA_FIELDS.length; i++) {
            var key = EXTRA_FIELDS[i][0];
            var attr = EXTRA_FIELDS[i][1];
            if (attr === "MSGID") {
                continue;
            }
            var val = getLangString(mbo, attr, lang);
            if (val !== null && val !== "") {
                row[key] = val;
            }
        }
        if (msgId !== null && msgId !== "") {
            row.msgId = msgId;
        }
    }

    appendLangData(config, mbo, row, resolveDetailFields(OBJECT_NAME, DETAIL_FIELDS));
    row["sks:ref"] = String(row.msgGroup) + "/" + String(row.msgKey);
    row._status = "success";
    return row;
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
            try {
                var v = mbo.getString(f, langcodes[j]);
                if (v !== null && v !== undefined && String(v) !== "~null~") {
                    vals[langcodes[j]] = v;
                }
            } catch (ignored) { }
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

// ---------------------------------------------------------------------------
// 导出
// ---------------------------------------------------------------------------

/**
 * 导出: 不分页; app 作为 MSGGROUP 过滤(为空导出全部)
 * 字段名与 messages_page_3.json 一致
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {string} [app] MSGGROUP
 * @param {Object} [opts] 预留
 * @returns {Array}
 */
function exportApp(config, app, opts) {
    var lang = getConfigLang(config);
    var sql = buildExportSql(lang, app);
    logger.info("[" + scriptName + "] exportApp msggroup=" + (app || "") + ", _langcode=" + lang);
    var raw = queryRows(config, sql, app);
    var rows = [];
    for (var i = 0; i < raw.length; i++) {
        rows.push(toMessageRow(raw[i], config));
    }
    appendExportLangData(config, rows);
    logger.info("[" + scriptName + "] exportApp 完成, 共 " + rows.length + " 条");
    return rows;
}

/**
 * 导出 SQL: 当前语言取译文, 另外始终带出 ZH 译文(value_zh)
 * @param {string} lang
 * @param {string} appValue
 * @returns {string}
 */
function buildExportSql(lang, appValue) {
    var ml = function (attr) {
        if (lang === "ZH") {
            return "COALESCE(L_ZH." + attr + ", MAXMESSAGES." + attr + ")";
        }
        if (lang === "EN") {
            return "MAXMESSAGES." + attr;
        }
        return "COALESCE(L_CUR." + attr + ", MAXMESSAGES." + attr + ")";
    };
    var valueZh = (lang === "ZH") ? ml("VALUE") : "L_ZH.VALUE";
    var cols = [
        "MAXMESSAGES.MSGGROUP AS MSGGROUP",
        "MAXMESSAGES.MSGKEY AS MSGKEY",
        ml("VALUE") + " AS VALUE",
        "MAXMESSAGES.MAXMESSAGESID AS MAXMESSAGESID",
        valueZh + " AS VALUE_ZH",
        "MAXMESSAGES.DISPLAYMETHOD AS DISPLAYMETHOD",
        "MAXMESSAGES.OPTIONS AS OPTIONS",
        "MAXMESSAGES.PREFIX AS PREFIX",
        "MAXMESSAGES.MSGID AS MSGID",
        "MAXMESSAGES.TITLE AS TITLE",
        ml("BUTTONTEXT") + " AS BUTTONTEXT",
        ml("EXPLANATION") + " AS EXPLANATION",
        ml("ADMINRESPONSE") + " AS ADMINRESPONSE",
        ml("OPERATORRESPONSE") + " AS OPERATORRESPONSE",
        ml("SYSTEMACTION") + " AS SYSTEMACTION",
        ml("RESPONSE") + " AS RESPONSE"
    ];
    var from = "MAXMESSAGES LEFT JOIN L_MAXMESSAGES L_ZH ON (L_ZH.OWNERID = MAXMESSAGES.MAXMESSAGESID AND L_ZH.LANGCODE = 'ZH')";
    if (lang !== "EN" && lang !== "ZH") {
        from += " LEFT JOIN L_MAXMESSAGES L_CUR ON (L_CUR.OWNERID = MAXMESSAGES.MAXMESSAGESID AND L_CUR.LANGCODE = '" + lang + "')";
    }
    var sql = "SELECT " + cols.join(", ") + " FROM " + from;
    if (appValue !== null && appValue !== undefined && String(appValue) !== "") {
        sql += " WHERE UPPER(MAXMESSAGES.MSGGROUP) = UPPER(?)";
    }
    sql += " ORDER BY MAXMESSAGES.MSGGROUP, MAXMESSAGES.MSGKEY";
    return sql;
}

/**
 * 查询结果行 → 消息对象
 * @param {Object} raw
 * @param {jscustom.SksMigrateParamConfig} config
 * @returns {Object}
 */
function toMessageRow(raw, config) {
    var mask = toInt(raw.OPTIONS, 0);
    var row = {
        msgGroup: raw.MSGGROUP === undefined ? null : raw.MSGGROUP,
        msgKey: raw.MSGKEY === undefined ? null : raw.MSGKEY,
        value: raw.VALUE === undefined ? null : raw.VALUE,
        MAXMESSAGESID: raw.MAXMESSAGESID === undefined ? null : raw.MAXMESSAGESID,
        value_zh: raw.VALUE_ZH === undefined ? null : raw.VALUE_ZH,
        displayMethod: raw.DISPLAYMETHOD === undefined ? null : raw.DISPLAYMETHOD,
        options: optionsFromMask(mask),
        "sks:options": mask,
        prefix: raw.PREFIX === undefined ? null : raw.PREFIX
    };
    appendMsgId(row, raw.MSGID);
    if (config && config._includeExtra === true) {
        for (var i = 0; i < EXTRA_FIELDS.length; i++) {
            var key = EXTRA_FIELDS[i][0];
            var attr = EXTRA_FIELDS[i][1];
            var val = raw[attr];
            if (val !== undefined && val !== null && val !== "") {
                row[key] = val;
            }
        }
    }
    return row;
}

/**
 * MSGID 拆分为 msgIdPrefix(前5位) / msgIdSuffix(最后1位)
 * @param {Object} row
 * @param {string} msgId
 */
function appendMsgId(row, msgId) {
    if (msgId !== null && msgId !== undefined && String(msgId).length > 0) {
        msgId = String(msgId);
        row.msgIdPrefix = msgId.substring(0, Math.min(5, msgId.length));
        row.msgIdSuffix = msgId.substring(msgId.length - 1);
    } else {
        row.msgIdPrefix = null;
        row.msgIdSuffix = null;
    }
}

/**
 * config._allLangcode 时导出 L_MAXMESSAGES 译文到 sks:langdata
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {Array} rows
 */
function appendExportLangData(config, rows) {
    var langcodes = (config && config._allLangcode === true && config._langcodeList) ? config._langcodeList : [];
    if (langcodes.length === 0 || rows.length === 0) {
        return;
    }
    var byId = {};
    for (var i = 0; i < rows.length; i++) {
        if (rows[i].MAXMESSAGESID !== null) {
            byId[String(rows[i].MAXMESSAGESID)] = rows[i];
        }
    }
    for (var j = 0; j < langcodes.length; j++) {
        var lang = String(langcodes[j]).toUpperCase();
        var translations;
        try {
            translations = queryLangTranslations(config, lang);
        } catch (e) {
            logger.warn("[" + scriptName + "] 读取 L_MAXMESSAGES " + lang + " 译文失败", e);
            continue;
        }
        for (var id in translations) {
            if (!translations.hasOwnProperty(id)) {
                continue;
            }
            var row = byId[id];
            if (!row) {
                continue;
            }
            var langData = row["sks:langdata"] || {};
            var vals = translations[id];
            for (var attr in vals) {
                if (!vals.hasOwnProperty(attr)) {
                    continue;
                }
                if (!langData[attr]) {
                    langData[attr] = {};
                }
                langData[attr][lang] = vals[attr];
            }
            row["sks:langdata"] = langData;
        }
    }
}

/**
 * 读取某语言的译文: { OWNERID: { 属性: 值 } }
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {string} lang
 * @returns {Object}
 */
function queryLangTranslations(config, lang) {
    var result = {};
    var conn = null;
    var ps = null;
    var rs = null;
    var connKey = config._userInfo.getConnectionKey();
    try {
        conn = mxserver.getDBManager().getConnection(connKey);
        ps = conn.prepareStatement("SELECT OWNERID, " + ML_FIELDS.join(", ") + " FROM L_MAXMESSAGES WHERE LANGCODE = ?");
        ps.setString(1, lang);
        rs = ps.executeQuery();
        while (rs.next()) {
            var ownerId = rs.getString(1);
            if (ownerId === null) {
                continue;
            }
            var vals = {};
            for (var i = 0; i < ML_FIELDS.length; i++) {
                var attr = ML_FIELDS[i];
                var v = getStringFromRS(rs, attr);
                if (v !== null && v !== "~null~") {
                    vals[attr] = v;
                }
            }
            result[ownerId] = vals;
        }
    } finally {
        _closeOnly(rs);
        _closeOnly(ps);
        if (conn) {
            try { mxserver.getDBManager().freeConnection(connKey, conn); } catch (ignored) { }
        }
    }
    return result;
}

// ---------------------------------------------------------------------------
// 导入
// ---------------------------------------------------------------------------

/**
 * 导入: 遍历行数据逐条新增/修改/删除(MAXMESSAGES 无 APP 字段, app 参数不参与)
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {Array} rows
 * @param {string} [app]
 * @returns {Array}
 */
function importApp(config, rows, app) {
    var results = [];
    if (!rows) {
        return results;
    }
    for (var i = 0; i < rows.length; i++) {
        results.push(changeMbo(config, rows[i]));
    }
    return results;
}

/**
 * 变更对象: 按 MSGGROUP + MSGKEY 新增/修改/删除
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {Object} data
 * @returns {Object}
 */
function changeMbo(config, data) {
    var out = { "_status": "success" };
    var ref = null;
    var cacheUseError = newCacheUseError();
    cacheUseError.ind1 = " objectName=" + OBJECT_NAME;
    if (!data || typeof data !== "object") {
        out._status = "failed";
        out._message = "数据为空";
        cacheUseError.ind3 = out._message;
        out["sks:ref"] = ref;
        out["sks:currentCacheUseError"] = cacheUseError;
        return out;
    }
    var msgGroup = pick(data, "msgGroup", "MSGGROUP");
    var msgKey = pick(data, "msgKey", "MSGKEY");
    if (msgGroup === null || msgKey === null || String(msgGroup).trim() === "" || String(msgKey).trim() === "") {
        out._status = "failed";
        out._message = "缺少唯一键字段 MSGGROUP / MSGKEY";
        cacheUseError.ind3 = out._message;
        out["sks:ref"] = (msgGroup === null ? "" : String(msgGroup)) + "/" + (msgKey === null ? "" : String(msgKey));
        out["sks:currentCacheUseError"] = cacheUseError;
        return out;
    }
    ref = String(msgGroup) + "/" + String(msgKey);

    var set = null;
    var mbo = null;
    try {
        set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
        if (config.dmDeploySet === true) {
            try { set.setDMDeploySet(true); } catch (ignored) { }
        }
        var sqlf = new SqlFormat("msggroup = :1 and msgkey = :2");
        sqlf.setObject(1, OBJECT_NAME, "MSGGROUP", String(msgGroup));
        sqlf.setObject(2, OBJECT_NAME, "MSGKEY", String(msgKey));
        set.setWhere(sqlf.format());
        set.reset();

        if (isDelete(data)) {
            set.deleteAll();
            out._operation = "deleted";
        } else {
            var isNew = set.isEmpty();
            mbo = isNew ? set.add() : set.getMbo(0);
            out._operation = isNew ? "added" : "updated";
            applyMessageFields(config, mbo, data, isNew, cacheUseError);
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
                out.MAXMESSAGESID = mbo.isNull("MAXMESSAGESID") ? null : String(mbo.getLong("MAXMESSAGESID"));
            }
        } catch (ignored) { }
    } catch (e) {
        out._status = "failed";
        out._message = e.message || String(e);
        cacheUseError.ind3 = out._message || "导入失败";
        out["sks:currentCacheUseError"] = cacheUseError;
        try { if (set) { set.rollback(); } } catch (ignored) { }
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
 * @param {Object} data
 * @returns {boolean}
 */
function isDelete(data) {
    return data._delete === true || data.delete === true
        || data._delete === "true" || data.delete === "true";
}

/**
 * 写入消息字段(兼容 messages_page_3.json 的 camel 名与物理列名)
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {psdi.mbo.Mbo} mbo
 * @param {Object} data
 * @param {boolean} isNew
 * @param {Object} cacheUseError
 */
function applyMessageFields(config, mbo, data, isNew, cacheUseError) {
    var langData = data["sks:langdata"];
    var hasLangData = langData && typeof langData === "object";
    setMboValue(mbo, "MSGGROUP", pick(data, "msgGroup", "MSGGROUP"), cacheUseError);
    setMboValue(mbo, "MSGKEY", pick(data, "msgKey", "MSGKEY"), cacheUseError);

    // VALUE: 有译文数据时交给 applyLangData 逐语言写入
    var value = pick(data, "value", "VALUE");
    if (isNew && value === null && !(hasLangData && langData.hasOwnProperty("VALUE"))) {
        throw new MXApplicationException("#", "value 不能为空");
    }
    if (value !== null && !(hasLangData && langData.hasOwnProperty("VALUE"))) {
        setMboValue(mbo, "VALUE", value, cacheUseError);
    }

    for (var i = 0; i < IMPORT_FIELDS.length; i++) {
        var key = IMPORT_FIELDS[i][0];
        var attr = IMPORT_FIELDS[i][1];
        if (hasLangData && langData.hasOwnProperty(attr)) {
            continue;
        }
        if (attr === "PREFIX" || attr === "DISPLAYMETHOD") {
            continue;
        }
        var v = pick(data, key, attr);
        if (v !== null) {
            setMboValue(mbo, attr, v, cacheUseError);
        }
    }

    var displayMethod = pick(data, "displayMethod", "DISPLAYMETHOD");
    if (displayMethod === null && isNew) {
        displayMethod = "MSGBOX";
    }
    if (displayMethod !== null) {
        setMboValue(mbo, "DISPLAYMETHOD", displayMethod, cacheUseError);
    }

    var prefix = pick(data, "prefix", "PREFIX");
    if (prefix === null && isNew) {
        prefix = true;
    }
    if (prefix !== null) {
        setMboValue(mbo, "PREFIX", prefix, cacheUseError);
    }

    // MSGID 优先; 没有 MSGID 时用 msgIdPrefix/msgIdSuffix, 新增默认 BMXZZ/E
    var msgId = pick(data, "msgId", "MSGID");
    if (msgId !== null) {
        setMboValue(mbo, "MSGID", msgId, cacheUseError);
    } else {
        var msgIdPrefix = pick(data, "msgIdPrefix", "MSGIDPREFIX");
        var msgIdSuffix = pick(data, "msgIdSuffix", "MSGIDSUFFIX");
        if (isNew && msgIdPrefix === null) {
            msgIdPrefix = "BMXZZ";
        }
        if (isNew && msgIdSuffix === null) {
            msgIdSuffix = "E";
        }
        if (msgIdPrefix !== null) {
            setMboValue(mbo, "MSGIDPREFIX", msgIdPrefix, cacheUseError);
        }
        if (msgIdSuffix !== null) {
            setMboValue(mbo, "MSGIDSUFFIX", msgIdSuffix, cacheUseError);
        }
    }

    // value_zh: 非 ZH 导入时写 ZH 译文
    var valueZh = pick(data, "value_zh", "VALUE_ZH");
    if (valueZh !== null && getConfigLang(config) !== "ZH" && !(hasLangData && langData.hasOwnProperty("VALUE"))) {
        try {
            mbo.setMLValue("VALUE", "ZH", String(valueZh), 11);
        } catch (e) {
            cacheUseError.ind2 = " mlAttrName=VALUE@ZH";
            cacheUseError.ind3 = e.message || String(e);
            logger.error("[" + scriptName + "] setMLValue VALUE@ZH 失败", e);
        }
    }

    applyOptions(mbo, data, isNew, cacheUseError);
    applyLangData(mbo, data, cacheUseError);
}

/**
 * 设置 OPTIONS 对应的按钮布尔字段(OPTIONS 由这些非持久 YORN 字段在保存时生成)
 * @param {psdi.mbo.Mbo} mbo
 * @param {Object} data
 * @param {boolean} isNew
 * @param {Object} cacheUseError
 */
function applyOptions(mbo, data, isNew, cacheUseError) {
    var opt = resolveOptions(data);
    if (!opt.has && !isNew) {
        return;
    }
    var list = opt.list;
    if (!opt.has && isNew) {
        // 新增时默认 ok(与旧导入逻辑 SKS.AUTOSCRIPT.LIBRARY 的 Message 默认值一致)
        list = ["ok"];
    }
    if (opt.mask !== null) {
        // 有完整位掩码: 按钮与图标全部按掩码重置
        for (var i = 0; i < OPTION_ATTRS.length; i++) {
            setMboValue(mbo, OPTION_ATTRS[i][1], ((opt.mask & OPTION_ATTRS[i][2]) !== 0), cacheUseError);
        }
        return;
    }
    // 只有 options 数组: 只重置按钮, 图标保持不变
    for (var j = 0; j < BUTTON_OPTION_ATTRS.length; j++) {
        setMboValue(mbo, BUTTON_OPTION_ATTRS[j][1], false, cacheUseError);
    }
    for (var k = 0; k < list.length; k++) {
        for (var n = 0; n < OPTION_ATTRS.length; n++) {
            if (OPTION_ATTRS[n][0] === String(list[k]).toLowerCase()) {
                setMboValue(mbo, OPTION_ATTRS[n][1], true, cacheUseError);
                break;
            }
        }
    }
}

/**
 * 解析 options 数组 / sks:options 位掩码 / OPTIONS 原值
 * @param {Object} data
 * @returns {Object} { has, list, mask }
 */
function resolveOptions(data) {
    var result = { has: false, list: [], mask: null };
    var list = null;
    if (data.options !== undefined && data.options !== null && Array.isArray(data.options)) {
        list = [];
        for (var i = 0; i < data.options.length; i++) {
            list.push(String(data.options[i]).toLowerCase());
        }
    }
    // 位掩码优先(可完整还原按钮与图标), 只有数组时按数组处理
    if (data["sks:options"] !== undefined && data["sks:options"] !== null) {
        result.mask = toInt(data["sks:options"], null);
    }
    if (result.mask === null && data.OPTIONS !== undefined && data.OPTIONS !== null) {
        result.mask = toInt(data.OPTIONS, null);
    }
    if (result.mask !== null) {
        result.has = true;
        result.list = optionsFromMask(result.mask);
        return result;
    }
    if (list !== null) {
        result.has = true;
        result.list = list;
    }
    return result;
}

/**
 * 位掩码 → options 数组(只含按钮, 与 messages_page_3.json 一致)
 * @param {number} mask
 * @returns {Array<string>}
 */
function optionsFromMask(mask) {
    var list = [];
    for (var i = 0; i < BUTTON_OPTION_ATTRS.length; i++) {
        if (mask & BUTTON_OPTION_ATTRS[i][2]) {
            list.push(BUTTON_OPTION_ATTRS[i][0]);
        }
    }
    return list;
}

/**
 * 读取 OPTIONS 位掩码; 为 0 时按布尔字段汇总
 * @param {psdi.mbo.Mbo} mbo
 * @returns {number}
 */
function getOptionsMask(mbo) {
    var mask = 0;
    try { mask = mbo.getInt("OPTIONS"); } catch (ignored) { }
    if (mask === 0) {
        for (var i = 0; i < OPTION_ATTRS.length; i++) {
            try {
                if (mbo.getBoolean(OPTION_ATTRS[i][1])) {
                    mask |= OPTION_ATTRS[i][2];
                }
            } catch (ignored) { }
        }
    }
    return mask;
}

/**
 * 设置多语言字段: data["sks:langdata"] = { 属性: { 语言: 值 } }
 * accessModifier 11 = NOVALIDATION(1) | NOACCESSCHECK(2) | NOACTION(8)
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

/**
 * 按 Mbo 字段类型设值(失败只记录, 由 save 决定整行成败)
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} attr
 * @param {*} value
 * @param {Object} cacheUseError
 */
function setMboValue(mbo, attr, value, cacheUseError) {
    try {
        if (sksCommonsUtils) {
            sksCommonsUtils.autoMboSetValue(svc, mbo, attr, value, MboConstants.NOACCESSCHECK);
        } else {
            mbo.setValue(attr, value, MboConstants.NOACCESSCHECK);
        }
    } catch (e) {
        if (cacheUseError) {
            cacheUseError.ind2 = " attrName=" + attr;
            cacheUseError.ind3 = e.message || String(e);
        }
        logger.error("[" + scriptName + "] setValue " + attr + " 失败", e);
    }
}

// ---------------------------------------------------------------------------
// 公共工具
// ---------------------------------------------------------------------------

/**
 * 取 camel 或物理列名的值(兼容 messages_page_3.json 与 SELECT * 导出的数据)
 * @param {Object} data
 * @param {string} camel
 * @param {string} attr
 * @returns {*}
 */
function pick(data, camel, attr) {
    if (!data || typeof data !== "object") {
        return null;
    }
    if (data[camel] !== undefined && data[camel] !== null) {
        return data[camel];
    }
    if (data[attr] !== undefined && data[attr] !== null) {
        return data[attr];
    }
    return null;
}

function toInt(value, defaultValue) {
    if (value === null || value === undefined) {
        return defaultValue;
    }
    var n = parseInt(String(value), 10);
    return isNaN(n) ? defaultValue : n;
}

/**
 * 当前语言(只保留字母数字, 防止拼入 SQL 时注入)
 * @param {jscustom.SksMigrateParamConfig} config
 * @returns {string}
 */
function getConfigLang(config) {
    var lang = String((config && config._langcode) || "EN").toUpperCase().replace(/[^A-Z0-9_]/g, "");
    return lang === "" ? "EN" : lang;
}

/**
 * 取 Mbo 字段值(按指定语言, 无译文时回退当前语言)
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} attr
 * @param {string} lang
 * @returns {string|null}
 */
function getLangString(mbo, attr, lang) {
    if (lang) {
        try {
            var v = mbo.getString(attr, lang);
            if (v !== null && v !== undefined && String(v) !== "~null~") {
                return v;
            }
        } catch (ignored) { }
    }
    try {
        var base = mbo.getString(attr);
        return (base !== null && base !== undefined && String(base) !== "~null~") ? base : null;
    } catch (ignored) {
        return null;
    }
}

/**
 * 取 Mbo 字段值(无 null 转换)
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} attr
 * @returns {string|null}
 */
function mboStr(mbo, attr) {
    try {
        var v = mbo.getString(attr);
        return v === null ? null : v;
    } catch (ignored) {
        return null;
    }
}

/**
 * 取 Mbo 长整型字段(避免 getString 的千分位格式化, 如 750,247)
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} attr
 * @returns {string|null}
 */
function mboLongStr(mbo, attr) {
    try {
        return mbo.isNull(attr) ? null : String(mbo.getLong(attr));
    } catch (ignored) {
        return mboStr(mbo, attr);
    }
}

/**
 * YORN 的 Y/N 转成与表列一致的 1/0
 * @param {string} value
 * @returns {string|null}
 */
function yornToFlag(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (String(value).toUpperCase() === "Y") {
        return "1";
    }
    if (String(value).toUpperCase() === "N") {
        return "0";
    }
    return value;
}

/**
 * ZH 译文(当前语言为 ZH 时同 value)
 * @param {psdi.mbo.Mbo} mbo
 * @param {string} lang
 * @param {string} value
 * @returns {string|null}
 */
function getValueZh(mbo, lang, value) {
    if (lang === "ZH") {
        return value;
    }
    try {
        var v = mbo.getString("VALUE", "ZH");
        return (v !== null && v !== undefined && String(v) !== "~null~") ? v : null;
    } catch (ignored) {
        return null;
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
 * 通过 JDBC 读取整行(全部字段转字符串, 跳过 SKIP_COLUMNS)
 * @param {jscustom.SksMigrateParamConfig} config
 * @param {string} sql
 * @param {string} appValue
 * @returns {Array}
 */
function queryRows(config, sql, appValue) {
    var rows = [];
    var conn = null;
    var ps = null;
    var rs = null;
    var connKey = config._userInfo.getConnectionKey();
    try {
        conn = mxserver.getDBManager().getConnection(connKey);
        ps = conn.prepareStatement(sql);
        if (appValue !== null && appValue !== undefined && String(appValue) !== "") {
            ps.setString(1, String(appValue));
        }
        rs = ps.executeQuery();
        var meta = rs.getMetaData();
        var count = meta.getColumnCount();
        while (rs.next()) {
            var row = {};
            for (var i = 1; i <= count; i++) {
                var col = String(meta.getColumnLabel(i)).toUpperCase();
                if (SKIP_COLUMNS.indexOf(col) >= 0) {
                    continue;
                }
                row[col] = getStringFromRS(rs, col);
            }
            rows.push(row);
        }
    } finally {
        _closeOnly(rs);
        _closeOnly(ps);
        if (conn) {
            try { mxserver.getDBManager().freeConnection(connKey, conn); } catch (ignored) { }
        }
    }
    return rows;
}

/**
 * 读取 ResultSet 字符串列(wasNull → null)
 * @param {java.sql.ResultSet} rs
 * @param {string} col
 * @returns {string|null}
 */
function getStringFromRS(rs, col) {
    try {
        var val = rs.getString(col);
        return rs.wasNull() ? null : val;
    } catch (e) {
        return null;
    }
}
