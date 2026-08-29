// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//MAXPROP/MAXPROPVALUE 属性管理脚本: 查询(list)/导出(export)/导入(deploy)

// load('nashorn:mozilla_compat.js');
// importPackage(java.io);
// importPackage(java.sql);

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");//13

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
loggerMX.error("[" + scriptName + "]----------1");
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
// logger.setLevel(Level.INFO);
logger.info("[" + scriptName + "]----------------Starting execution of script " + service.getScriptName());
logger.info("[" + scriptName + "]-------------webclientsession=" + service.webclientsession())



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

/** @type {psdi.security.UserInfo} */
var uInfo = userInfo;
/** @type {java.lang.String} */
var _langcode = "EN";
if (typeof request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
  _langcode = request.getQueryParam("_langcode").toUpperCase();
  uInfo.setLangCode(_langcode);
  logger.info("[" + scriptName + "] _langcode=" + _langcode + ", langCode=" + uInfo.getLocale().getLanguage());
}

// API类型: exp=导出(精简模式由 ignoreDefVal 控制), 其它=管理端查询
/** @type {java.lang.String} */
var apiType = request.getQueryParam("apiType");

// _action: list=扁平 JOIN 查询列表, export=完整导出(主记录+子记录嵌套), deploy=导入(增删改)
/** @type {java.lang.String} */
var action = request.getQueryParam("_action") || "export";
if (action !== "list" && action !== "export" && action !== "deploy") {
  action = "export";
}

// 精简模式(ignoreDefVal): 省略空值或与默认值相同的属性, 简化JSON(用于跨环境迁移)
/** @type {boolean} */
var ignoreDefVal = false;
if (typeof request.getQueryParam("ignoreDefVal") !== 'undefined' && request.getQueryParam("ignoreDefVal") == "true") {
  ignoreDefVal = true;
}

// 分页参数
var pageNum = request.getQueryParam("pageNum");
var pageSize = request.getQueryParam("pageSize");
var hasPagination = pageNum && pageSize && typeof pageNum !== 'undefined' && typeof pageSize !== 'undefined';
var pageNumInt = hasPagination ? parseInt(pageNum) : 1;
var pageSizeInt = hasPagination ? parseInt(pageSize) : 0;

// MAXPROP 主表列(查询/导出)
var MAXPROP_COLS = [
  "ACCESSTYPE", "CHANGEBY", "CHANGEDATE", "DESCRIPTION", "DOMAINID", "ENCRYPTED",
  "GLOBALONLY", "INSTANCEONLY", "LIVEREFRESH", "MASKED", "MAXIMODEFAULT", "MAXPROPID",
  "MAXTYPE", "NULLSALLOWED", "ONLINECHANGES", "PROPNAME", "SECURELEVEL", "USERDEFINED", "VALUERULES"
];

// MAXPROPVALUE 专有列(与 MAXPROP 重名的列用别名区分)
var PV_ONLY_COLS = ["SERVERNAME", "SERVERHOST", "PROPVALUE", "ENCRYPTEDVALUE"];

// list 模式的完整 SELECT 列(MAXPROPVALUE 列加 pv_ 前缀避免前端列名冲突)
var LIST_SELECT = [
  "MAXPROP.ACCESSTYPE", "MAXPROP.CHANGEBY", "MAXPROP.CHANGEDATE", "MAXPROP.DESCRIPTION", "MAXPROP.DOMAINID", "MAXPROP.ENCRYPTED",
  "MAXPROP.GLOBALONLY", "MAXPROP.INSTANCEONLY", "MAXPROP.LIVEREFRESH", "MAXPROP.MASKED", "MAXPROP.MAXIMODEFAULT", "MAXPROP.MAXPROPID",
  "MAXPROP.MAXTYPE", "MAXPROP.NULLSALLOWED", "MAXPROP.ONLINECHANGES", "MAXPROP.PROPNAME", "MAXPROP.SECURELEVEL", "MAXPROP.USERDEFINED", "MAXPROP.VALUERULES",
  "v.MAXPROPVALUEID AS PV_MAXPROPVALUEID", "v.PROPNAME AS PV_PROPNAME", "v.PROPVALUE AS PV_PROPVALUE",
  "v.SERVERNAME AS PV_SERVERNAME", "v.SERVERHOST AS PV_SERVERHOST", "v.ENCRYPTEDVALUE AS PV_ENCRYPTEDVALUE",
  "v.ACCESSTYPE AS PV_ACCESSTYPE", "v.CHANGEBY AS PV_CHANGEBY", "v.CHANGEDATE AS PV_CHANGEDATE"
].join(", ");

var LIST_FROM = " FROM MAXPROP LEFT JOIN MAXPROPVALUE v ON (MAXPROP.PROPNAME = v.PROPNAME)";

// 日期格式化(必须在 main() 调用前初始化)
var SimpleDateFormat = Java.type("java.text.SimpleDateFormat");
var sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

// ==================== 入口 ====================
responseBody = main();

function main() {
  try {
    if (typeof requestBody === "undefined" || !requestBody) {
      throw new MXApplicationException("#", "请求体(requestBody)不能为空");
    }

    /** @type {Object} */
    var requestData = JSON.parse(requestBody);

    // 导入模式
    if (action === "deploy") {
      return doDeploy(requestData);
    }

    // 查询/导出共用 where
    var whereClause = buildWhere(requestData);
    if (!whereClause) {
      whereClause = "1=1";
    }

    if (action === "list") {
      return doQuery(whereClause);
    }
    return doExport(whereClause);

  } catch (error) {
    logger.error("[" + scriptName + "] " + action + " 失败: ", error);
    /** @type {com.ibm.json.java.JSONObject} */
    var errorData = new JSONObject();
    errorData.put("status", "error");
    errorData.put("message", error.message ? error.message : error.toString());
    return errorData.serialize();
  }
}

// ==================== 查询(list): 扁平 JOIN, 支持分页 ====================
function doQuery(whereClause) {
  /** @type {java.sql.Connection} */
  var conn = null;
  try {
    conn = getDBConnection();

    /** @type {com.ibm.json.java.JSONArray} */
    var props = new JSONArray();
    /** @type {number} */
    var total = 0;

    if (hasPagination) {
      // JOIN 后一行 MAXPROP 可能对应多行 MAXPROPVALUE, 按 MAXPROPID 去重计数
      var countSql = "SELECT COUNT(DISTINCT MAXPROP.MAXPROPID)" + LIST_FROM + " WHERE " + whereClause;
      logger.info("[" + scriptName + "] countSQL: " + countSql);
      var countStmt = conn.prepareStatement(countSql);
      var countRs = countStmt.executeQuery();
      if (countRs.next()) {
        total = countRs.getInt(1);
      }
      countRs.close();
      countStmt.close();
    }

    var sql = "SELECT " + LIST_SELECT + LIST_FROM +
      " WHERE " + whereClause +
      " ORDER BY MAXPROP.PROPNAME";
    if (hasPagination) {
      sql += " OFFSET " + ((pageNumInt - 1) * pageSizeInt) + " ROWS FETCH NEXT " + pageSizeInt + " ROWS ONLY";
    }
    logger.info("[" + scriptName + "] 查询SQL: " + sql);

    var pstmt = conn.prepareStatement(sql);
    var rs = pstmt.executeQuery();
    while (rs.next()) {
      props.add(buildPropListObject(rs));
    }
    rs.close();
    pstmt.close();

    /** @type {com.ibm.json.java.JSONObject} */
    var result = new OrderedJSONObject();
    result.put("props", props);
    if (hasPagination) {
      result.put("total", total);
      result.put("pageNum", pageNumInt);
      result.put("pageSize", pageSizeInt);
    }

    logger.info("[" + scriptName + "] 查询完成, 共 " + props.size() + " 条");
    return service.jsonToString(result);
  } finally {
    if (conn) {
      try { conn.close(); } catch (ignore) { }
    }
  }
}

// ==================== 导出(export): 主记录+子记录嵌套, 支持精简模式 ====================
function doExport(whereClause) {
  /** @type {java.sql.Connection} */
  var conn = null;
  try {
    conn = getDBConnection();

    var sql = "SELECT " + LIST_SELECT + LIST_FROM +
      " WHERE " + whereClause +
      " ORDER BY MAXPROP.PROPNAME, v.SERVERNAME";
    logger.info("[" + scriptName + "] 导出SQL: " + sql);

    var pstmt = conn.prepareStatement(sql);
    var rs = pstmt.executeQuery();

    /** @type {com.ibm.json.java.JSONArray} */
    var maxProps = new JSONArray();
    /** @type {com.ibm.json.java.JSONObject} */
    var currentObj = null;
    /** @type {java.lang.String} */
    var currentPropName = null;
    /** @type {com.ibm.json.java.JSONArray} */
    var currentValues = null;

    while (rs.next()) {
      var propName = getStringFromRS(rs, "PROPNAME");
      // 新的主记录(按 PROPNAME 分组)
      if (currentObj === null || propName !== currentPropName) {
        currentObj = buildMaxPropObject(rs);
        currentValues = new JSONArray();
        currentObj.put("maxpropvalue", currentValues);
        maxProps.add(currentObj);
        currentPropName = propName;
      }
      // 子记录(MAXPROPVALUE 非空时)
      if (getStringFromRS(rs, "PV_MAXPROPVALUEID") !== null) {
        currentValues.add(buildPropValueObject(rs));
      }
    }
    rs.close();
    pstmt.close();

    /** @type {com.ibm.json.java.JSONObject} */
    var result = new OrderedJSONObject();
    result.put("maxprops", maxProps);
    if (hasPagination) {
      var countSql = "SELECT COUNT(DISTINCT MAXPROP.MAXPROPID)" + LIST_FROM + " WHERE " + whereClause;
      var countStmt = conn.prepareStatement(countSql);
      var countRs = countStmt.executeQuery();
      var total = 0;
      if (countRs.next()) {
        total = countRs.getInt(1);
      }
      countRs.close();
      countStmt.close();
      result.put("total", total);
      result.put("pageNum", pageNumInt);
      result.put("pageSize", pageSizeInt);
    }

    logger.info("[" + scriptName + "] 导出完成, 共 " + maxProps.size() + " 个属性");
    return service.jsonToString(result);
  } finally {
    if (conn) {
      try { conn.close(); } catch (ignore) { }
    }
  }
}

// ==================== 导入(deploy): 批量增删改 ====================
function doDeploy(requestData) {
  /** @type {Array} */
  var maxPropsArray;
  if (Array.isArray(requestData)) {
    maxPropsArray = requestData;
  } else if (requestData.maxprops && Array.isArray(requestData.maxprops)) {
    maxPropsArray = requestData.maxprops;
  } else {
    maxPropsArray = [requestData];
  }

  if (!maxPropsArray || maxPropsArray.length === 0) {
    throw new MXApplicationException("#", "没有提供属性数据");
  }

  logger.info("[" + scriptName + "] 开始批量导入 " + maxPropsArray.length + " 个属性");

  /** @type {Array} */
  var resultList = [];

  for (var i = 0; i < maxPropsArray.length; i++) {
    /** @type {Object} */
    var propData = maxPropsArray[i];
    try {
      saveOrUpdateMaxProp(propData, i + 1);
      resultList.push({
        propname: propData.propname || "未知",
        status: "SUCCESS",
        message: "属性保存成功"
      });
    } catch (error) {
      logger.error("[" + scriptName + "] 处理第 " + (i + 1) + " 个属性失败: ", error);
      resultList.push({
        propname: propData.propname || "未知",
        status: "FAILED",
        message: error.message ? error.message : error.toString()
      });
    }
  }

  var successCount = 0;
  var failedCount = 0;
  var resultListTmp = [];
  for (var j = 0; j < resultList.length; j++) {
    if (resultList[j].status === "SUCCESS") {
      successCount++;
      resultListTmp.push(resultList[j]);
    } else {
      failedCount++;
      resultListTmp.push(resultList[j]);
    }
  }

  logger.info("[" + scriptName + "] 批量导入完成: 成功 " + successCount + " 个, 失败 " + failedCount + " 个");

  /** @type {Object} */
  var responseData = {
    status: "success",
    message: "批量导入完成",
    summary: {
      total: maxPropsArray.length,
      success: successCount,
      failed: failedCount
    },
    result: resultListTmp
  };
  return JSON.stringify(responseData, null, 4);
}

/**
 * 保存或更新单个属性(MAXPROP), 包含子记录(MAXPROPVALUE)
 * @param {Object} propData - 属性数据
 * @param {number} index - 序号(用于错误提示)
 */
function saveOrUpdateMaxProp(propData, index) {
  /** @type {java.lang.String} */
  var propName = propData.propname;
  if (!propName) {
    throw new MXApplicationException("#", "第 " + index + " 个属性的 propname(属性名称)不能为空");
  }

  /** @type {psdi.mbo.MboSetRemote} */
  var propSet = null;
  try {
    propSet = MXServer.getMXServer().getMboSet("MAXPROP", uInfo);

    /** @type {psdi.mbo.SqlFormat} */
    var sqlf = new SqlFormat("propname = :1");
    sqlf.setObject(1, "MAXPROP", "PROPNAME", propName);
    propSet.setWhere(sqlf.format());
    propSet.reset();
    logger.info("[" + scriptName + "] 查询属性: " + propName + ", where=" + propSet.getCompleteWhere());

    /** @type {psdi.mbo.MboRemote} */
    var propMbo;

    if (propSet.isEmpty()) {
      if (propData._delete) {
        __mboSetClose(propSet);
        return;
      }
      logger.info("[" + scriptName + "] 创建新属性: " + propName);
      propMbo = propSet.add();
      propMbo.setValue("PROPNAME", propName);
    } else {
      propMbo = propSet.getMbo(0);
      if (propData._delete) {
        logger.info("[" + scriptName + "] 删除属性: " + propName);
        propMbo.delete();
        propSet.save();
        __mboSetClose(propSet);
        return;
      }
    }

    // 字符串字段
    setIfDef(propMbo, "DESCRIPTION", propData.description);
    setIfDef(propMbo, "MAXTYPE", propData.maxtype);
    setIfDef(propMbo, "MAXIMODEFAULT", propData.maximodefault);
    setIfDef(propMbo, "DOMAINID", propData.domainid);
    setIfDef(propMbo, "SECURELEVEL", propData.securelevel);
    setIfDef(propMbo, "VALUERULES", propData.valuerules);

    // 整数字段(布尔 0/1)
    setIfDef(propMbo, "GLOBALONLY", propData.globalonly);
    setIfDef(propMbo, "INSTANCEONLY", propData.instanceonly);
    setIfDef(propMbo, "LIVEREFRESH", propData.liverefresh);
    setIfDef(propMbo, "ENCRYPTED", propData.encrypted);
    setIfDef(propMbo, "NULLSALLOWED", propData.nullsallowed);
    setIfDef(propMbo, "USERDEFINED", propData.userdefined);
    setIfDef(propMbo, "ONLINECHANGES", propData.onlinechanges);
    setIfDef(propMbo, "MASKED", propData.masked);
    setIfDef(propMbo, "ACCESSTYPE", propData.accesstype);

    // 子记录 MAXPROPVALUE
    if (propData.maxpropvalue) {
      saveOrUpdatePropValues(propMbo, propData.maxpropvalue, index);
    }

    propSet.save();
    logger.info("[" + scriptName + "] 属性保存成功: PROPNAME=" + propName);
  } catch (error) {
    logger.error("[" + scriptName + "] 保存 MAXPROP 失败: ", error);
    throw new MXApplicationException("#", "保存属性失败: " + (error.message ? error.message : error.toString()));
  } finally {
    __mboSetClose(propSet);
  }
}

/**
 * 保存或更新 MAXPROPVALUE 子记录
 * 唯一键: PROPNAME+SERVERNAME+SERVERHOST, 采用遍历匹配(子记录数量少)
 * @param {psdi.mbo.MboRemote} propMbo - MAXPROP 主记录
 * @param {Array} datas - 子记录数据数组
 * @param {number} index - 主记录序号
 */
function saveOrUpdatePropValues(propMbo, datas, index) {
  if (!datas || !Array.isArray(datas) || datas.length === 0) {
    return;
  }
  logger.info("[" + scriptName + "] 开始处理 " + datas.length + " 条 MAXPROPVALUE 记录");

  /** @type {psdi.mbo.MboSetRemote} */
  var valSet = null;
  try {
    valSet = propMbo.getMboSet("MAXPROPVALUE");
    valSet.reset();

    for (var i = 0; i < datas.length; i++) {
      var data = datas[i];
      try {
        var serverName = data.servername;
        if (!serverName) {
          logger.warn("[" + scriptName + "] 第 " + (i + 1) + " 条 MAXPROPVALUE 记录的 servername(服务器)不能为空, 跳过");
          continue;
        }
        // 匹配: SERVERNAME + SERVERHOST(为空时匹配空/NULL)
        var valMbo = valSet.moveFirst();
        while (valMbo) {
          var mboHost = valMbo.getString("SERVERHOST") || "";
          var dataHost = data.serverhost || "";
          if (valMbo.getString("SERVERNAME") === serverName && mboHost === dataHost) {
            break;
          }
          valMbo = valSet.moveNext();
        }

        if (data._delete) {
          if (valMbo !== null) {
            valMbo.delete();
            logger.info("[" + scriptName + "] 已删除 MAXPROPVALUE 记录: SERVERNAME=" + serverName);
          }
        } else {
          if (valMbo === null) {
            valMbo = valSet.add();
            valMbo.setValue("SERVERNAME", serverName);
            if (data.serverhost) {
              valMbo.setValue("SERVERHOST", data.serverhost);
            }
          } else if (typeof data.serverhost !== 'undefined' && data.serverhost !== null) {
            valMbo.setValue("SERVERHOST", data.serverhost);
          }
          if (typeof data.propvalue !== 'undefined' && data.propvalue !== null) {
            valMbo.setValue("PROPVALUE", data.propvalue);
          }
          if (typeof data.encryptedvalue !== 'undefined' && data.encryptedvalue !== null) {
            valMbo.setValue("ENCRYPTEDVALUE", data.encryptedvalue);
          }
          if (typeof data.accesstype !== 'undefined' && data.accesstype !== null && data.accesstype !== "") {
            valMbo.setValue("ACCESSTYPE", data.accesstype);
          }
          logger.info("[" + scriptName + "] 已保存 MAXPROPVALUE 记录: SERVERNAME=" + serverName);
        }
      } catch (error) {
        logger.error("[" + scriptName + "] 处理第 " + (i + 1) + " 条 MAXPROPVALUE 记录失败: ", error);
      }
    }
    logger.info("[" + scriptName + "] MAXPROPVALUE 记录处理完成");
  } finally {
    __mboSetClose(valSet);
  }
}

// ==================== 辅助函数 ====================

/**
 * 构建查询条件: 优先使用 requestData.where, 否则按字段搜索
 * 字段支持: =XXX 精确匹配, %XXX% 通配, 其它 LIKE 模糊匹配
 * @param {Object} requestData
 * @returns {java.lang.String}
 */
function buildWhere(requestData) {
  if (requestData.where && typeof requestData.where === "string" && requestData.where.trim() !== "") {
    logger.info("[" + scriptName + "] 使用前端传入 where: " + requestData.where);
    return requestData.where.trim();
  }
  var conditions = [];
  if (requestData.propname) {
    conditions.push(buildFieldCondition("MAXPROP.PROPNAME", requestData.propname));
  }
  if (requestData.description) {
    conditions.push(buildFieldCondition("MAXPROP.DESCRIPTION", requestData.description));
  }
  if (requestData.propvalue) {
    conditions.push(buildFieldCondition("v.PROPVALUE", requestData.propvalue));
  }
  return conditions.join(" AND ");
}

/** 单字段条件: =XXX 精确 / % 通配 / 其它 LIKE */
function buildFieldCondition(col, val) {
  var v = String(val);
  if (v.indexOf("=") === 0) {
    return col + " = '" + escapeSql(v.substring(1)) + "'";
  }
  if (v.indexOf("%") === 0 || v.charAt(v.length - 1) === "%") {
    return col + " LIKE '" + escapeSql(v) + "'";
  }
  return col + " LIKE '%" + escapeSql(v) + "%'";
}

/** 扁平列表记录(主字段 + pv_ 前缀子字段), 空值字段省略 */
function buildPropListObject(rs) {
  var obj = new OrderedJSONObject();
  putIfNotDef(obj, "maxpropid", getLongFromRS(rs, "MAXPROPID"));
  putIfNotDef(obj, "propname", getStringFromRS(rs, "PROPNAME"));
  putIfNotDef(obj, "description", getStringFromRS(rs, "DESCRIPTION"));
  putIfNotDef(obj, "maxtype", getStringFromRS(rs, "MAXTYPE"));
  putIfNotDef(obj, "maximodefault", getStringFromRS(rs, "MAXIMODEFAULT"));
  putIfNotDef(obj, "domainid", getStringFromRS(rs, "DOMAINID"));
  putIfNotDef(obj, "securelevel", getStringFromRS(rs, "SECURELEVEL"));
  putIfNotDef(obj, "valuerules", getStringFromRS(rs, "VALUERULES"));
  putIfNotDef(obj, "changeby", getStringFromRS(rs, "CHANGEBY"));
  putIfNotDef(obj, "changedate", getDateFromRS(rs, "CHANGEDATE"));
  putIfNotDef(obj, "accesstype", getIntFromRS(rs, "ACCESSTYPE"), 0);
  putIfNotDef(obj, "globalonly", getIntFromRS(rs, "GLOBALONLY"), 0);
  putIfNotDef(obj, "instanceonly", getIntFromRS(rs, "INSTANCEONLY"), 0);
  putIfNotDef(obj, "liverefresh", getIntFromRS(rs, "LIVEREFRESH"), 0);
  putIfNotDef(obj, "encrypted", getIntFromRS(rs, "ENCRYPTED"), 0);
  putIfNotDef(obj, "nullsallowed", getIntFromRS(rs, "NULLSALLOWED"), 0);
  putIfNotDef(obj, "userdefined", getIntFromRS(rs, "USERDEFINED"), 0);
  putIfNotDef(obj, "onlinechanges", getIntFromRS(rs, "ONLINECHANGES"), 0);
  putIfNotDef(obj, "masked", getIntFromRS(rs, "MASKED"), 0);
  // MAXPROPVALUE 子记录字段(pv_ 前缀, 列表场景一行最多一个子记录左侧)
  putIfNotDef(obj, "pv_maxpropvalueid", getLongFromRS(rs, "PV_MAXPROPVALUEID"));
  putIfNotDef(obj, "pv_propname", getStringFromRS(rs, "PV_PROPNAME"));
  putIfNotDef(obj, "pv_propvalue", getStringFromRS(rs, "PV_PROPVALUE"));
  putIfNotDef(obj, "pv_servername", getStringFromRS(rs, "PV_SERVERNAME"));
  putIfNotDef(obj, "pv_serverhost", getStringFromRS(rs, "PV_SERVERHOST"));
  putIfNotDef(obj, "pv_encryptedvalue", getStringFromRS(rs, "PV_ENCRYPTEDVALUE"));
  putIfNotDef(obj, "pv_accesstype", getIntFromRS(rs, "PV_ACCESSTYPE"), 0);
  putIfNotDef(obj, "pv_changeby", getStringFromRS(rs, "PV_CHANGEBY"));
  putIfNotDef(obj, "pv_changedate", getDateFromRS(rs, "PV_CHANGEDATE"));
  return obj;
}

/** 导出主记录(putIfNotDef: 空值不导出, 精简模式省略默认值) */
function buildMaxPropObject(rs) {
  var obj = new OrderedJSONObject();
  putIfNotDef(obj, "propname", getStringFromRS(rs, "PROPNAME"));
  putIfNotDef(obj, "description", getStringFromRS(rs, "DESCRIPTION"));
  putIfNotDef(obj, "maxtype", getStringFromRS(rs, "MAXTYPE"));
  putIfNotDef(obj, "maximodefault", getStringFromRS(rs, "MAXIMODEFAULT"));
  putIfNotDef(obj, "domainid", getStringFromRS(rs, "DOMAINID"));
  putIfNotDef(obj, "securelevel", getStringFromRS(rs, "SECURELEVEL"), "SECURE");
  putIfNotDef(obj, "valuerules", getStringFromRS(rs, "VALUERULES"));
  putIfNotDef(obj, "changeby", getStringFromRS(rs, "CHANGEBY"));
  putIfNotDef(obj, "changedate", getDateFromRS(rs, "CHANGEDATE"));
  putIfNotDef(obj, "accesstype", getIntFromRS(rs, "ACCESSTYPE"), 0);
  putIfNotDef(obj, "globalonly", getIntFromRS(rs, "GLOBALONLY"), 0);
  putIfNotDef(obj, "instanceonly", getIntFromRS(rs, "INSTANCEONLY"), 0);
  putIfNotDef(obj, "liverefresh", getIntFromRS(rs, "LIVEREFRESH"), 0);
  putIfNotDef(obj, "encrypted", getIntFromRS(rs, "ENCRYPTED"), 0);
  putIfNotDef(obj, "nullsallowed", getIntFromRS(rs, "NULLSALLOWED"), 0);
  putIfNotDef(obj, "userdefined", getIntFromRS(rs, "USERDEFINED"), 0);
  putIfNotDef(obj, "onlinechanges", getIntFromRS(rs, "ONLINECHANGES"), 0);
  putIfNotDef(obj, "masked", getIntFromRS(rs, "MASKED"), 0);
  return obj;
}

/** 导出子记录(MAXPROPVALUE) */
function buildPropValueObject(rs) {
  var obj = new OrderedJSONObject();
  putIfNotDef(obj, "servername", getStringFromRS(rs, "PV_SERVERNAME"));
  putIfNotDef(obj, "serverhost", getStringFromRS(rs, "PV_SERVERHOST"));
  putIfNotDef(obj, "propvalue", getStringFromRS(rs, "PV_PROPVALUE"));
  putIfNotDef(obj, "encryptedvalue", getStringFromRS(rs, "PV_ENCRYPTEDVALUE"));
  putIfNotDef(obj, "accesstype", getIntFromRS(rs, "PV_ACCESSTYPE"), 0);
  putIfNotDef(obj, "changeby", getStringFromRS(rs, "PV_CHANGEBY"));
  putIfNotDef(obj, "changedate", getDateFromRS(rs, "PV_CHANGEDATE"));
  return obj;
}

/** 获取数据库连接(SQL 直查模式) */
function getDBConnection() {
  var connKey = MXServer.getMXServer().getSystemUserInfo().getConnectionKey();
  return MXServer.getMXServer().getDBManager().getConnection(connKey);
}

function getStringFromRS(rs, col) {
  var v = rs.getString(col);
  if (rs.wasNull()) {
    return null;
  }
  return v;
}

function getIntFromRS(rs, col) {
  var v = rs.getInt(col);
  if (rs.wasNull()) {
    return null;
  }
  return v;
}

function getLongFromRS(rs, col) {
  var v = rs.getLong(col);
  if (rs.wasNull()) {
    return null;
  }
  return v;
}

function getDateFromRS(rs, col) {
  var v = rs.getTimestamp(col);
  if (rs.wasNull()) {
    return null;
  }
  return sdf.format(v);
}

/**
 * 导出字段: 空值不导出; 精简模式(ignoreDefVal)且值等于默认值时不导出
 * @param {com.ibm.json.java.JSONObject} obj
 * @param {java.lang.String} jsonKey
 * @param {Object} val
 * @param {Object} defVal
 */
function putIfNotDef(obj, jsonKey, val, defVal) {
  if (val === null || typeof val === 'undefined' || val === "") {
    return;
  }
  if (ignoreDefVal && typeof defVal !== 'undefined' && String(val) === String(defVal)) {
    return;
  }
  obj.put(jsonKey, val);
}

/**
 * 导入字段: 仅有值时设置(字符串空串跳过, 数字 0 允许)
 * @param {psdi.mbo.MboRemote} mbo
 * @param {java.lang.String} attr
 * @param {Object} val
 */
function setIfDef(mbo, attr, val) {
  if (typeof val === 'undefined' || val === null) {
    return;
  }
  if (typeof val === 'string' && val === "") {
    return;
  }
  mbo.setValue(attr, val);
}

/** SQL 单引号转义 */
function escapeSql(str) {
  return String(str).replace(/'/g, "''");
}

/** 关闭 MboSet */
function __mboSetClose(set) {
  if (!set) {
    return;
  }
  try {
    set.cleanup();
  } catch (ignore) {
  }
  try {
    set.close();
  } catch (ignore) {
  }
}