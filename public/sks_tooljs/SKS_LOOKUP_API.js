// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// 通用 Lookup 数据接口(供 maximo-manager-panel 的 SKsLookupDialog 组件使用)
//
// 入参(body, JSON):
//   lookup          lookup 名称(可选, 用于解析对象)
//   objectname      查询对象名(可选, 为空时按 lookup 解析: MAXLOOKUPMAP -> 同名对象)
//   relationship    关系名(可选, 需同时传 parentObject + parentKeys/parentWhere)
//   parentObject    关系父对象名(可选)
//   parentKeys      定位父记录的字段/值对象(可选, 如 {"wonum":"1001","siteid":"BEDFORD"})
//   parentWhere     定位父记录的 where(可选)
//   where           列表过滤条件(与 Maximo lookup 的 where 一致)
//   orderby         排序(如 "assetnum desc")
//   columns         需要返回的列, 元素为字段名或 {dataattribute,label,width,sortable,filterable}
//   keyword         关键字(对字符型字段做 like 模糊搜索)
//   keywordColumns  关键字搜索字段(可选, 默认取 columns 中的字符型字段)
//   pageNum         页码(从 1 开始, 也可用 URL 参数 pageNum)
//   pageSize        每页条数(也可用 URL 参数 pageSize)
//
// 出参: {"status":"success","data":{lookup,objectname,columns,rows,total,pageNum,pageSize},"message":"..."}
//       失败: {"status":"error","message":"错误信息"}
//
// URL 参数: _langcode(ZH/EN), _debug(true 时返回 debugMsg)

// load('nashorn:mozilla_compat.js');
// importPackage(java.io);
// importPackage(java.sql);

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");

/** @type {java.util.HashMap} */
HashMap = Java.type("java.util.HashMap");

/** @type {com.ibm.json.java.JSONArray} */
JSONArray = Java.type("com.ibm.json.java.JSONArray");
/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");
/** @type {com.ibm.json.java.OrderedJSONObject} */
OrderedJSONObject = Java.type("com.ibm.json.java.OrderedJSONObject");

/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");
var scriptName = service.getScriptName()

/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
logger.info("[" + scriptName + "]----------------Starting execution of script " + service.getScriptName());
logger.info("[" + scriptName + "]-------------webclientsession=" + service.webclientsession())

/** @type {psdi.security.UserInfo} */
var uInfo = userInfo;

//如果是多语言的表,通过下面方式设置语言环境的数据
var _langcode = "EN";
if (queryParam("_langcode")) {
  _langcode = queryParam("_langcode").toUpperCase();
  uInfo.setLangCode(_langcode);
  logger.info("[" + scriptName + "] _langcode=" + _langcode + ", langCode=" + uInfo.getLocale().getLanguage());
}

/** @type {java.lang.StringBuilder} */
StringBuilder = Java.type("java.lang.StringBuilder");
/** @type {java.lang.StringBuilder} */
var debugMsg = new StringBuilder();
// 调试参数,设置为true,则会返回debugMsg
var paramDebug = false

if (queryParam("_debug")) {
  paramDebug = queryParam("_debug") === 'true';
  logger.info("\x1b[35;40m[" + scriptName + "]------------------paramDebug=" + paramDebug + "\x1b[0m");
}

//参数中不要包含以下参数,这些是maximo中在用的: action,distinct,maxsso,template,collectioncount,localref,relatedref

/** @type {java.lang.String} */
var requestBodyTmp = requestBody

/** @type {psdi.security.UserInfo} */
var userInfoTmp = userInfo

/** @type {com.ibm.tivoli.maximo.oslc.provider.OslcRequest} */
var requestTmp = request

/** @type {java.util.HashMap} */
var responseHeadersTmp = responseHeaders

/** @type {java.lang.String} */
var httpMethodTmp = httpMethod

// 默认每页条数 / 单页最大条数
var DEFAULT_PAGE_SIZE = 20
var MAX_PAGE_SIZE = 200
// 可用于关键字 like 模糊搜索的字段类型(MAXATTRIBUTE.MAXTYPE)
var TEXT_TYPES = ["ALN", "UPPER", "LOWER", "LONGALN", "GL", "SYNONYM", "CLOB"]
// 未指定 columns 时, 自动取前 N 个持久化字段
var DEFAULT_COLUMN_COUNT = 20

//成功时
var successData = {}

main()
function main() {

  try {
    // 管理模式下不允许执行脚本，抛出异常
    if (Java.type("psdi.iface.mic.MicUtil").getAdminModeState()) {
      throw new MXApplicationException("ibm_system", "AdminOnThis")
    }
    successData = process()
    var resData = {
      "status": "success",
      "data": successData,
      "message": "Script executed successfully"
    }

    if (paramDebug) {
      resData.debugMsg = debugMsg.toString();
    }

    //返回的设置到responseBody变量,String类型或者 byte[]类型
    responseBody = JSON.stringify(resData);
  } catch (error) {
    logger.info("[" + scriptName + "]----------------responseBodyTmp error.");
    logger.error(">>> [API ERROR] 全局捕获异常:", error)
    var errorMessage = "error"
    try {
      errorMessage = sksLogAnsiUtils.getErrorStackTrace(error)
      debugPrint(errorMessage);
    } catch (e) { service.log_error(">>> [API ERROR] 获取异常堆栈:") }

    var errorData = { "status": "error", "message": errorMessage }
    if (paramDebug) {
      errorData.debugMsg = debugMsg.toString();
    }
    responseBody = JSON.stringify(errorData);
  } finally {
    logger.info("[" + scriptName + "]----------------responseBodyTmp finally");
    logger.info("[" + scriptName + "]----------------responseBodyTmp=" + responseBody + ".");
    addLog()
  }

}

/**
 * 查询 lookup 列表数据
 * @returns {Object} {lookup, objectname, columns, rows, total, pageNum, pageSize}
 */
function process() {
  /** @type {Object} */
  var reqData = parseRequestData();
  /** @type {string} */
  var lookup = strValue(reqData.lookup);
  /** @type {number} */
  var pageNum = toInt(reqData.pageNum || queryParam("pageNum"), 1);
  /** @type {number} */
  var pageSize = toInt(reqData.pageSize || queryParam("pageSize"), DEFAULT_PAGE_SIZE);
  if (pageNum <= 0) {
    pageNum = 1
  }
  if (pageSize <= 0) {
    pageSize = DEFAULT_PAGE_SIZE
  }
  if (pageSize > MAX_PAGE_SIZE) {
    pageSize = MAX_PAGE_SIZE
  }

  /** @type {psdi.mbo.MboSetRemote} */
  var mboSet = null
  /** @type {psdi.mbo.MboSetRemote} */
  var parentSet = null
  try {
    /** @type {string} */
    var objectname = resolveObjectName(reqData, lookup);
    /** @type {Object} */
    var opened = openMboSet(reqData, objectname);
    mboSet = opened.mboSet;
    parentSet = opened.parentSet;
    if (opened.objectname) {
      objectname = opened.objectname;
    }

    // 对象属性信息: 列校验 / 列描述 / 关键字字段类型
    /** @type {Object} */
    var attrInfo = loadAttributeInfo(objectname);
    /** @type {Array} */
    var columns = fillColumns(normalizeColumns(reqData.columns), attrInfo, objectname);

    /** @type {string} */
    var whereClause = buildWhereClause(reqData, columns, attrInfo);
    if (whereClause) {
      mboSet.setWhere(whereClause);
    }
    /** @type {string} */
    var orderby = sanitizeOrderBy(reqData.orderby);
    if (orderby) {
      mboSet.setOrderBy(orderby);
    }
    mboSet.reset();

    /** @type {number} */
    var total = mboSet.count();
    debugPrint("objectname=" + objectname + ", where=" + (whereClause || "") + ", orderby=" + orderby + ", total=" + total);

    /** @type {number} */
    var offset = (pageNum - 1) * pageSize;
    /** @type {Array} */
    var rows = [];
    /** @type {psdi.mbo.MboRemote} */
    var mbo = total > 0 ? mboSet.moveFirst() : null;
    /** @type {number} */
    var idx = 0;
    while (mbo) {
      if (idx >= offset) {
        rows.push(buildRow(mbo, columns));
        if (rows.length >= pageSize) {
          break;
        }
      }
      idx++;
      mbo = mboSet.moveNext();
    }
    debugPrint("pageNum=" + pageNum + ", pageSize=" + pageSize + ", rows=" + rows.length);

    return {
      "lookup": lookup,
      "objectname": objectname,
      "columns": columns,
      "rows": rows,
      "total": total,
      "pageNum": pageNum,
      "pageSize": pageSize
    };
  } finally {
    _close(mboSet)
    _close(parentSet)
  }
}

/**
 * 解析请求体
 * @returns {Object} 请求体 JSON 对象
 */
function parseRequestData() {
  if (typeof requestBody === "undefined" || !requestBody) {
    throw new MXApplicationException("#", "请求体(requestBody)不能为空");
  }
  /** @type {Object} */
  var data = JSON.parse(String(requestBody));
  if (!data || typeof data !== 'object') {
    throw new MXApplicationException("#", "请求体格式错误, 应为 JSON 对象");
  }
  return data;
}

/**
 * 解析查询对象名: objectname > lookup(MAXLOOKUPMAP / 同名对象)
 * @param {Object} reqData 请求体
 * @param {string} lookup lookup 名称
 * @returns {string} 对象名
 */
function resolveObjectName(reqData, lookup) {
  /** @type {string} */
  var objectname = strValue(reqData.objectname);
  if (objectname && objectExists(objectname)) {
    return objectname.toUpperCase();
  }
  // objectname 传的是关系名时, 转为关系查询
  if (objectname && !strValue(reqData.relationship)) {
    debugPrint("objectname=" + objectname + " 不是对象名, 按关系名处理");
    reqData.relationship = objectname;
  }
  if (lookup) {
    var byLookup = findObjectNameByLookup(lookup);
    if (byLookup) {
      return byLookup;
    }
    var guess = lookup.toUpperCase();
    if (objectExists(guess)) {
      return guess;
    }
  }
  if (objectname) {
    throw new MXApplicationException("#", "对象 " + objectname + " 不存在, 请通过 objectname(relationObject) 指定查询对象");
  }
  throw new MXApplicationException("#", "未指定查询对象: 请传入 objectname(relationObject) 或可解析的 lookup");
}

/**
 * 打开 MboSet(支持关系查询)
 * @param {Object} reqData 请求体
 * @param {string} objectname 对象名
 * @returns {Object} {mboSet, parentSet, objectname}
 */
function openMboSet(reqData, objectname) {
  /** @type {string} */
  var relationship = strValue(reqData.relationship);
  /** @type {string} */
  var parentObject = strValue(reqData.parentObject);
  if (relationship && parentObject) {
    /** @type {psdi.mbo.MboSetRemote} */
    var parentSet = MXServer.getMXServer().getMboSet(parentObject, uInfo);
    try {
      parentSet.setWhere(buildParentWhere(reqData));
      parentSet.reset();
      /** @type {psdi.mbo.MboRemote} */
      var parentMbo = parentSet.count() > 0 ? parentSet.moveFirst() : null;
      if (!parentMbo) {
        throw new MXApplicationException("#", "未找到父记录, 无法按关系 " + relationship + " 查询");
      }
      /** @type {psdi.mbo.MboSetRemote} */
      var relSet = parentMbo.getMboSet(relationship);
      debugPrint("关系查询: " + parentObject + "." + relationship);
      return { "mboSet": relSet, "parentSet": parentSet, "objectname": getMboSetObjectName(relSet, objectname) };
    } catch (e) {
      _close(parentSet)
      throw e
    }
  }
  /** @type {psdi.mbo.MboSetRemote} */
  var mboSet = MXServer.getMXServer().getMboSet(objectname, uInfo);
  return { "mboSet": mboSet, "parentSet": null, "objectname": objectname };
}

/**
 * 构建父记录定位条件
 * @param {Object} reqData 请求体
 * @returns {string} where 条件
 */
function buildParentWhere(reqData) {
  /** @type {string} */
  var parentWhere = strValue(reqData.parentWhere);
  if (parentWhere) {
    return parentWhere;
  }
  /** @type {Object} */
  var parentKeys = reqData.parentKeys;
  /** @type {Array} */
  var conds = [];
  if (parentKeys && typeof parentKeys === 'object') {
    for (var key in parentKeys) {
      if (parentKeys[key] === null || parentKeys[key] === undefined) {
        continue;
      }
      conds.push(key + " = '" + escapeSql(strValue(parentKeys[key])) + "'");
    }
  }
  if (!conds.length) {
    throw new MXApplicationException("#", "关系查询需要传入 parentKeys 或 parentWhere");
  }
  return conds.join(" and ");
}

/**
 * 取 MboSet 对应的对象名
 * @param {psdi.mbo.MboSetRemote} mboSet MboSet
 * @param {string} defaultValue 默认值
 * @returns {string} 对象名
 */
function getMboSetObjectName(mboSet, defaultValue) {
  try {
    return String(mboSet.getMboSetInfo().getObjectName());
  } catch (e) {
    return defaultValue;
  }
}

/**
 * 判断对象是否存在(MAXOBJECT)
 * @param {string} objectname 对象名
 * @returns {boolean} 是否存在
 */
function objectExists(objectname) {
  /** @type {psdi.mbo.MboSetRemote} */
  var set = null;
  try {
    set = MXServer.getMXServer().getMboSet("MAXOBJECT", uInfo);
    set.setWhere("objectname = '" + escapeSql(String(objectname).toUpperCase()) + "'");
    set.reset();
    return set.count() > 0;
  } catch (e) {
    logger.warn("[" + scriptName + "] 校验对象 " + objectname + " 失败: " + e);
    return false;
  } finally {
    _close(set)
  }
}

/**
 * 按 lookup 名称解析对象名(MAXLOOKUPMAP)
 * @param {string} lookup lookup 名称
 * @returns {string} 对象名, 未找到返回空串
 */
function findObjectNameByLookup(lookup) {
  /** @type {psdi.mbo.MboSetRemote} */
  var set = null;
  try {
    /** @type {string} */
    var value = escapeSql(lookup.toUpperCase());
    set = MXServer.getMXServer().getMboSet("MAXLOOKUPMAP", uInfo);
    set.setWhere("lookupattr = '" + value + "' or source = '" + value + "' or target = '" + value + "'");
    set.reset();
    /** @type {psdi.mbo.MboRemote} */
    var mbo = set.count() > 0 ? set.moveFirst() : null;
    while (mbo) {
      /** @type {string} */
      var target = strValue(mbo.getString("TARGET"));
      if (target && objectExists(target)) {
        debugPrint("lookup=" + lookup + " 按 MAXLOOKUPMAP 解析为对象 " + target);
        return target.toUpperCase();
      }
      mbo = set.moveNext();
    }
  } catch (e) {
    logger.warn("[" + scriptName + "] 按 lookup=" + lookup + " 解析对象失败: " + e);
  } finally {
    _close(set)
  }
  return "";
}

/**
 * 读取对象属性信息
 * @param {string} objectname 对象名
 * @returns {Object} {字段名(大写): {description,title,maxtype,persistent,attributeno}}
 */
function loadAttributeInfo(objectname) {
  /** @type {Object} */
  var info = {};
  /** @type {psdi.mbo.MboSetRemote} */
  var set = null;
  try {
    set = MXServer.getMXServer().getMboSet("MAXATTRIBUTE", uInfo);
    set.setWhere("objectname = '" + escapeSql(objectname) + "'");
    set.reset();
    /** @type {psdi.mbo.MboRemote} */
    var mbo = set.count() > 0 ? set.moveFirst() : null;
    while (mbo) {
      /** @type {string} */
      var attr = strValue(mbo.getString("ATTRIBUTE"));
      if (attr) {
        info[attr.toUpperCase()] = {
          "description": getMboString(mbo, "DESCRIPTION"),
          "title": getMboString(mbo, "TITLE"),
          "maxtype": getMboString(mbo, "MAXTYPE").toUpperCase(),
          "persistent": getMboBoolean(mbo, "PERSISTENT"),
          "attributeno": getMboInt(mbo, "ATTRIBUTENO")
        };
      }
      mbo = set.moveNext();
    }
  } catch (e) {
    logger.warn("[" + scriptName + "] 读取 " + objectname + " 的属性信息失败: " + e);
  } finally {
    _close(set)
  }
  return info;
}

/**
 * 规范化请求中的列定义
 * @param {Array|string} columns 列定义
 * @returns {Array} [{dataattribute,label,width,sortable,filterable}]
 */
function normalizeColumns(columns) {
  /** @type {Array} */
  var result = [];
  /** @type {Array} */
  var list = [];
  if (typeof columns === 'string') {
    list = columns.split(',');
  } else if (columns && columns.length) {
    list = columns;
  }
  for (var i = 0; i < list.length; i++) {
    /** @type {Object|string} */
    var col = list[i];
    if (!col) {
      continue;
    }
    if (typeof col === 'string') {
      var name = strValue(col);
      if (name) {
        result.push({ "dataattribute": name, "label": "", "width": "", "sortable": true, "filterable": true, "key": false });
      }
      continue;
    }
    /** @type {string} */
    var dataattribute = strValue(col.dataattribute || col.a || col.attr || col.attribute);
    if (!dataattribute) {
      continue;
    }
    result.push({
      "dataattribute": dataattribute,
      "label": strValue(col.label || col.l),
      "width": col.width || col.w || "",
      "sortable": col.sortable !== false && col.s !== false,
      "filterable": col.filterable !== false && col.f !== false,
      "key": col.key === true || col.k === true
    });
  }
  return result;
}

/**
 * 补齐/校验列: 未指定列时取对象前 N 个持久化字段, 指定列时剔除无效字段并补描述
 * @param {Array} columns 列定义
 * @param {Object} attrInfo 属性信息
 * @param {string} objectname 对象名
 * @returns {Array} 列定义
 */
function fillColumns(columns, attrInfo, objectname) {
  /** @type {Array} */
  var result = [];
  if (!columns.length) {
    /** @type {Array} */
    var all = [];
    for (var key in attrInfo) {
      /** @type {Object} */
      var a = attrInfo[key];
      if (!a.persistent) {
        continue;
      }
      if (a.maxtype === 'CLOB' || a.maxtype === 'BLOB' || /_LONGDESCRIPTION$/.test(key)) {
        continue;
      }
      all.push({
        "dataattribute": key,
        "label": a.description || a.title || key,
        "width": "",
        "sortable": true,
        "filterable": true,
        "key": false,
        "attributeno": a.attributeno
      });
    }
    all.sort(function (x, y) { return (x.attributeno || 0) - (y.attributeno || 0); });
    result = all.slice(0, DEFAULT_COLUMN_COUNT);
    for (var i = 0; i < result.length; i++) {
      delete result[i].attributeno;
    }
    debugPrint("未指定 columns, 自动取 " + objectname + " 的 " + result.length + " 个字段");
    return result;
  }

  for (var j = 0; j < columns.length; j++) {
    /** @type {Object} */
    var col = columns[j];
    /** @type {string} */
    var attr = col.dataattribute;
    /** @type {Object} */
    var info = attrInfo[attr.toUpperCase()];
    // 关系路径字段(如 PARENT.CLASSIFICATIONID)不做校验
    if (!info && attr.indexOf('.') === -1 && attrInfo && Object.keys(attrInfo).length > 0) {
      debugPrint("对象 " + objectname + " 上不存在字段 " + attr + ", 已忽略");
      continue;
    }
    result.push({
      "dataattribute": attr,
      "label": col.label || (info ? (info.description || info.title) : '') || attr,
      "width": col.width,
      "sortable": col.sortable !== false,
      "filterable": col.filterable !== false,
      "key": col.key === true
    });
  }
  return result;
}

/**
 * 构建 where 条件(业务 where + 关键字模糊搜索)
 * @param {Object} reqData 请求体
 * @param {Array} columns 列定义
 * @param {Object} attrInfo 属性信息
 * @returns {string} where 条件
 */
function buildWhereClause(reqData, columns, attrInfo) {
  /** @type {Array} */
  var parts = [];
  /** @type {string} */
  var userWhere = strValue(reqData.where);
  if (userWhere) {
    parts.push("(" + userWhere + ")");
  }
  /** @type {string} */
  var keyword = strValue(reqData.keyword);
  if (keyword) {
    /** @type {Array} */
    var fields = keywordFields(reqData, columns, attrInfo);
    if (fields.length) {
      /** @type {Array} */
      var conds = [];
      /** @type {string} */
      var value = escapeSql(keyword);
      for (var i = 0; i < fields.length; i++) {
        conds.push("UPPER(" + fields[i] + ") LIKE UPPER('%" + value + "%')");
      }
      parts.push("(" + conds.join(" OR ") + ")");
    } else {
      logger.warn("[" + scriptName + "] 没有可用于关键字搜索的字符型字段, 已忽略 keyword=" + keyword);
    }
  }
  return parts.join(" and ");
}

/**
 * 取关键字搜索字段(默认取列中的字符型字段)
 * @param {Object} reqData 请求体
 * @param {Array} columns 列定义
 * @param {Object} attrInfo 属性信息
 * @returns {Array} 字段名数组
 */
function keywordFields(reqData, columns, attrInfo) {
  /** @type {Array} */
  var result = [];
  /** @type {Array} */
  var source = [];
  if (reqData.keywordColumns && reqData.keywordColumns.length) {
    source = reqData.keywordColumns;
  } else {
    for (var i = 0; i < columns.length; i++) {
      source.push(columns[i].dataattribute);
    }
  }
  for (var j = 0; j < source.length; j++) {
    /** @type {string} */
    var attr = strValue(source[j]);
    if (!attr || attr.indexOf('.') > -1) {
      continue;
    }
    if (isTextColumn(attr, attrInfo)) {
      result.push(attr);
    }
  }
  return result;
}

/**
 * 是否为字符型字段
 * @param {string} attr 字段名
 * @param {Object} attrInfo 属性信息
 * @returns {boolean} 是否字符型
 */
function isTextColumn(attr, attrInfo) {
  /** @type {Object} */
  var info = attrInfo[attr.toUpperCase()];
  if (!info) {
    return false;
  }
  if (!info.maxtype) {
    return true;
  }
  for (var i = 0; i < TEXT_TYPES.length; i++) {
    if (info.maxtype === TEXT_TYPES[i]) {
      return true;
    }
  }
  return false;
}

/**
 * 排序字段安全检查
 * @param {string} orderby 排序
 * @returns {string} 排序(非法时返回空串)
 */
function sanitizeOrderBy(orderby) {
  /** @type {string} */
  var value = strValue(orderby);
  if (!value) {
    return "";
  }
  if (!/^[A-Za-z0-9_.,() ]+$/.test(value)) {
    logger.warn("[" + scriptName + "] orderby 含非法字符, 已忽略: " + value);
    return "";
  }
  return value;
}

/**
 * 按列定义构建行数据
 * @param {psdi.mbo.MboRemote} mbo MBO
 * @param {Array} columns 列定义
 * @returns {Object} 行数据
 */
function buildRow(mbo, columns) {
  /** @type {Object} */
  var row = {};
  for (var i = 0; i < columns.length; i++) {
    /** @type {string} */
    var attr = columns[i].dataattribute;
    row[attr] = readValue(mbo, attr);
  }
  return row;
}

/**
 * 取字段值(字段不存在时返回 null, 不中断列表查询)
 * @param {psdi.mbo.MboRemote} mbo MBO
 * @param {string} attr 字段名
 * @returns {string|null} 字段值
 */
function readValue(mbo, attr) {
  try {
    if (mbo.isNull(attr)) {
      return "";
    }
    return strValue(mbo.getString(attr));
  } catch (e) {
    debugPrint("读取字段 " + attr + " 失败: " + e);
    return null;
  }
}

/**
 * 取 URL 查询参数(未设置时返回空串)
 * @param {string} name 参数名
 * @returns {string} 参数值
 */
function queryParam(name) {
  try {
    /** @type {string} */
    var value = request.getQueryParam(name);
    if (value === null || value === undefined || value === 'undefined' || value === 'null') {
      return "";
    }
    return String(value);
  } catch (e) {
    return "";
  }
}

/**
 * 转字符串(空值返回空串)
 * @param {Object} value 值
 * @returns {string} 字符串
 */
function strValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

/**
 * 转整数
 * @param {Object} value 值
 * @param {number} defaultValue 默认值
 * @returns {number} 整数
 */
function toInt(value, defaultValue) {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }
  /** @type {number} */
  var num = parseInt(String(value), 10);
  if (isNaN(num)) {
    return defaultValue;
  }
  return num;
}

/**
 * SQL 字符串转义
 * @param {string} value 值
 * @returns {string} 转义后的值
 */
function escapeSql(value) {
  return String(value === null || value === undefined ? "" : value).replace(/'/g, "''");
}

/**
 * 安全取 MBO 字符串字段
 * @param {psdi.mbo.MboRemote} mbo MBO
 * @param {string} attr 字段名
 * @returns {string} 字段值
 */
function getMboString(mbo, attr) {
  try {
    return strValue(mbo.getString(attr));
  } catch (e) {
    return "";
  }
}

/**
 * 安全取 MBO 布尔字段
 * @param {psdi.mbo.MboRemote} mbo MBO
 * @param {string} attr 字段名
 * @returns {boolean} 字段值
 */
function getMboBoolean(mbo, attr) {
  try {
    return mbo.getBoolean(attr);
  } catch (e) {
    return false;
  }
}

/**
 * 安全取 MBO 整型字段
 * @param {psdi.mbo.MboRemote} mbo MBO
 * @param {string} attr 字段名
 * @returns {number} 字段值
 */
function getMboInt(mbo, attr) {
  try {
    return mbo.getInt(attr);
  } catch (e) {
    return 0;
  }
}

/**
 * 接口调用日志(lookup 查询量大, 不写 IBM_IFACELOG 表, 仅记录日志)
 */
function addLog() {
  try {
    logger.debug("[" + scriptName + "] addLog: responseBody.length=" + (responseBody ? responseBody.length : 0));
  } catch (ignored) { }
}

/**
 * 调试信息
 * @param {java.lang.String} msg
 * @param {boolean} noln            是否不换行
 */
function debugPrint(msg, noln) {
  logger.info("\x1b[35;40m[" + scriptName + "] " + msg + "\x1b[0m")
  debugMsg.append(msg);
  if (typeof noln === 'undefined' && !noln) {
    debugMsg.append("\n");
  }
}

/**
 * 关闭（有close方法的对象）
 * @param {Object} f 对象
 */
function _closeOnly(f) {
  try {
    if (f) {
      f.close()
    }
  } catch (ignored) { }
}

/**
 * 关闭MboSet
 * @param {psdi.mbo.MboSetRemote} set MboSet
 */
function _close(set) {
  try {
    if (set) {
      try { set.close(); } catch (ignored) { }
      try { set.cleanup(); } catch (ignored) { }
    }
  } catch (ignored) { }
}
