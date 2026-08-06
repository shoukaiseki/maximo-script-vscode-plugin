// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");

/** @type {com.ibm.json.java.JSONArray} */
JSONArray = Java.type("com.ibm.json.java.JSONArray");
/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");
/** @type {com.ibm.json.java.OrderedJSONObject} */
OrderedJSONObject = Java.type("com.ibm.json.java.OrderedJSONObject");

var scriptName = service.getScriptName();

/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true });
logger.info("[" + scriptName + "]----------------Starting execution of script " + scriptName);

/** @type {psdi.security.UserInfo} */
var uInfo = userInfo;
var _langcode = "EN";
if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
  _langcode = request.getQueryParam("_langcode").toUpperCase();
  uInfo.setLangCode(_langcode);
  logger.info("[" + scriptName + "] _langcode=" + _langcode + ", langCode=" + uInfo.getLocale().getLanguage());
}

// API类型: exp=导出(仅返回 _langcode 指定语言的描述), 其它=管理端查询(额外返回 description_zh/en)
var apiType = request.getQueryParam("apiType");

// 忽略可选字段(默认值), 仅导出必填字段, 简化JSON
var ignoreDefVal = false;
if (request.getQueryParam("ignoreDefVal") !== 'undefined' && request.getQueryParam("ignoreDefVal") == "true") {
  ignoreDefVal = true;
}

// 分页参数
var pageNum = request.getQueryParam("pageNum");
var pageSize = request.getQueryParam("pageSize");
var hasPagination = pageNum && pageSize && pageNum !== 'undefined' && pageSize !== 'undefined';
var pageNumInt = hasPagination ? parseInt(pageNum) : 1;
var pageSizeInt = hasPagination ? parseInt(pageSize) : 0;

responseBody = main();

function main() {
  try {
    if (typeof requestBody === "undefined" || !requestBody) {
      throw new MXApplicationException("#", "请求体(requestBody)不能为空");
    }

    /** @type {Object} */
    var requestData = JSON.parse(requestBody);

    // 仅支持 where 过滤, 为空时导出全部
    var whereClause = requestData.where || "1=1";

    /** @type {psdi.mbo.MboSetRemote} */
    var domainSet = null;
    try {
      domainSet = MXServer.getMXServer().getMboSet("MAXDOMAIN", uInfo);
      domainSet.setWhere(whereClause);
      domainSet.reset();

      var total = domainSet.count();
      logger.info("[" + scriptName + "] 过滤条件: " + whereClause + ", 共 " + total + " 条");

      /** @type {com.ibm.json.java.JSONArray} */
      var domains = new JSONArray();

      var mbo = domainSet.moveFirst();
      var idx = 0;
      while (mbo) {
        if (hasPagination) {
          // 内存分页
          if (idx >= (pageNumInt - 1) * pageSizeInt && idx < pageNumInt * pageSizeInt) {
            domains.add(buildDomainObject(mbo));
          }
          idx++;
        } else {
          domains.add(buildDomainObject(mbo));
        }
        mbo = domainSet.moveNext();
      }

      /** @type {com.ibm.json.java.JSONObject} */
      var result = new OrderedJSONObject();
      result.put("domains", domains);
      if (hasPagination) {
        result.put("total", total);
        result.put("pageNum", pageNumInt);
        result.put("pageSize", pageSizeInt);
      }

      logger.info("[" + scriptName + "] 导出完成, 共 " + domains.size() + " 条");
      return service.jsonToString(result);
    } finally {
      __close(domainSet);
    }
  } catch (error) {
    logger.error("[" + scriptName + "] 导出域定义失败: " + error);
    /** @type {com.ibm.json.java.JSONObject} */
    var errorData = new JSONObject();
    errorData.put("status", "error");
    errorData.put("message", error.message ? error.message : error.toString());
    return errorData.serialize();
  }
}

/**
 * 构建域定义 JSON 对象(与 SKS_DEPLOY_DOMAIN 导入格式完全兼容)
 * @param {psdi.mbo.MboRemote} domainMbo - MAXDOMAIN MBO
 * @returns {com.ibm.json.java.JSONObject}
 */
function buildDomainObject(domainMbo) {
  /** @type {com.ibm.json.java.OrderedJSONObject} */
  var obj = new OrderedJSONObject();

  // 必填字段
  obj.put("domainid", getString(domainMbo, "DOMAINID"));
  obj.put("domaintype", getString(domainMbo, "DOMAINTYPE"));

  if (!ignoreDefVal) {
    obj.put("description", getString(domainMbo, "DESCRIPTION"));
    // 非导出模式额外返回多语言描述(备份查看用)
    if (apiType !== 'exp') {
      putLangField(obj, domainMbo, "description_zh", "DESCRIPTION", "ZH");
      putLangField(obj, domainMbo, "description_en", "DESCRIPTION", "EN");
    }
    putIfHas(obj, domainMbo, "maxtype", "MAXTYPE");
    putIfNotNull(obj, "length", getInt(domainMbo, "LENGTH"));
    putIfNotNull(obj, "scale", getInt(domainMbo, "SCALE"));
    putIfNotNull(obj, "internal", getInt(domainMbo, "INTERNAL"));
    putIfNotNull(obj, "nevercache", getInt(domainMbo, "NEVERCACHE"));
  }

  // ALNDOMAIN 子记录(与导入脚本 SKS_DEPLOY_DOMAIN 使用同一关系)
  /** @type {psdi.mbo.MboSetRemote} */
  var alnSet = null;
  try {
    alnSet = domainMbo.getMboSet("ALNDOMAINVALUE");
    alnSet.reset();
    /** @type {com.ibm.json.java.JSONArray} */
    var alnArr = new JSONArray();
    var alnMbo = alnSet.moveFirst();
    while (alnMbo) {
      /** @type {com.ibm.json.java.OrderedJSONObject} */
      var alnObj = new OrderedJSONObject();
      alnObj.put("value", getString(alnMbo, "VALUE"));
      if (!ignoreDefVal) {
        alnObj.put("description", getString(alnMbo, "DESCRIPTION"));
        if (apiType !== 'exp') {
          putLangField(alnObj, alnMbo, "description_zh", "DESCRIPTION", "ZH");
          putLangField(alnObj, alnMbo, "description_en", "DESCRIPTION", "EN");
        }
        putIfHas(alnObj, alnMbo, "maxvalue", "MAXVALUE");
        putIfNotNull(alnObj, "defaultvalue", getInt(alnMbo, "DEFAULTVALUE"));
        putIfHas(alnObj, alnMbo, "orgid", "ORGID");
        putIfHas(alnObj, alnMbo, "siteid", "SITEID");
      }
      alnArr.add(alnObj);
      alnMbo = alnSet.moveNext();
    }
    if (alnArr.size() > 0) {
      obj.put("alndomain", alnArr);
    }
  } finally {
    __close(alnSet);
  }

  return obj;
}

/**
 * 获取 MBO 字符串值
 * @param {psdi.mbo.MboRemote} mbo
 * @param {java.lang.String} attr
 * @returns {java.lang.String|null}
 */
function getString(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : mbo.getString(attr);
  } catch (e) {
    return null;
  }
}

/**
 * 获取 MBO 整数值
 * @param {psdi.mbo.MboRemote} mbo
 * @param {java.lang.String} attr
 * @returns {number|null}
 */
function getInt(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : mbo.getInt(attr);
  } catch (e) {
    return null;
  }
}

/**
 * 如果 MBO 有值则添加到 JSON 对象
 * @param {com.ibm.json.java.JSONObject} obj
 * @param {psdi.mbo.MboRemote} mbo
 * @param {java.lang.String} jsonKey
 * @param {java.lang.String} attr
 */
function putIfHas(obj, mbo, jsonKey, attr) {
  var val = getString(mbo, attr);
  if (val !== null && val !== "") {
    obj.put(jsonKey, val);
  }
}

/**
 * 如果值非空则添加到 JSON 对象
 * @param {com.ibm.json.java.JSONObject} obj
 * @param {java.lang.String} jsonKey
 * @param {*} val
 */
function putIfNotNull(obj, jsonKey, val) {
  if (val !== null && val !== undefined && val !== "") {
    obj.put(jsonKey, val);
  }
}

/**
 * 添加指定语言的描述字段(多语言表翻译)
 * @param {com.ibm.json.java.JSONObject} obj
 * @param {psdi.mbo.MboRemote} mbo
 * @param {java.lang.String} jsonKey
 * @param {java.lang.String} attr
 * @param {java.lang.String} langCode
 */
function putLangField(obj, mbo, jsonKey, attr, langCode) {
  try {
    var val = mbo.getString(attr, langCode);
    if (val !== null && val !== "") {
      obj.put(jsonKey, val);
    }
  } catch (e) { }
}

/**
 * 关闭 MboSet
 * @param {psdi.mbo.MboSetRemote} set
 */
function __close(set) {
  if (set) {
    try {
      set.cleanup();
      set.close();
    } catch (ignore) { }
  }
}
