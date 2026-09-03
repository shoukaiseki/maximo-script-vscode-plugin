// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
//CONDITION 条件表达式管理脚本: 查询(list)/导出(export)/导入(deploy), 导出支持精简模式(ignoreDefVal)

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
  logger.info("[" + scriptName + "] _langcode=" + _langcode);
}

// API类型: exp=导出(精简模式由 ignoreDefVal 控制), 其它=管理端查询
/** @type {java.lang.String} */
var apiType = request.getQueryParam("apiType");

// _action: list=分页查询列表, export=全量导出(支持精简模式), deploy=导入(增删改)
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

// _langcode 暂保留(当前多语言列未启用, 仅保留传入参数处理)

// 查询/导出 SELECT(实体字段, 不含 ROWSTAMP)
var CONDITION_SELECT = [
  "c.CONDITIONID", "c.CONDITIONNUM", "c.TYPE", "c.EXPRESSION", "c.CLASSNAME",
  "c.DESCRIPTION", "c.NOCACHING"
].join(", ");
var CONDITION_FROM = " FROM CONDITION c";

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

// ==================== 查询(list): 支持分页 ====================
function doQuery(whereClause) {
  /** @type {java.sql.Connection} */
  var conn = null;
  try {
    conn = getDBConnection();

    /** @type {com.ibm.json.java.JSONArray} */
    var conditions = new JSONArray();
    /** @type {number} */
    var total = 0;

    if (hasPagination) {
      var countSql = "SELECT COUNT(*)" + CONDITION_FROM + " WHERE " + whereClause;
      logger.info("[" + scriptName + "] countSQL: " + countSql);
      var countStmt = conn.prepareStatement(countSql);
      var countRs = countStmt.executeQuery();
      if (countRs.next()) {
        total = countRs.getInt(1);
      }
      countRs.close();
      countStmt.close();
    }

    var sql = "SELECT " + CONDITION_SELECT + CONDITION_FROM +
      " WHERE " + whereClause +
      " ORDER BY c.CONDITIONNUM";
    if (hasPagination) {
      sql += " OFFSET " + ((pageNumInt - 1) * pageSizeInt) + " ROWS FETCH NEXT " + pageSizeInt + " ROWS ONLY";
    }
    logger.info("[" + scriptName + "] 查询SQL: " + sql);

    var pstmt = conn.prepareStatement(sql);
    var rs = pstmt.executeQuery();
    while (rs.next()) {
      conditions.add(buildConditionListObject(rs));
    }
    rs.close();
    pstmt.close();

    /** @type {com.ibm.json.java.JSONObject} */
    var result = new OrderedJSONObject();
    result.put("conditions", conditions);
    if (hasPagination) {
      result.put("total", total);
      result.put("pageNum", pageNumInt);
      result.put("pageSize", pageSizeInt);
    }

    logger.info("[" + scriptName + "] 查询完成, 共 " + conditions.size() + " 条");
    return service.jsonToString(result);
  } finally {
    if (conn) {
      try { conn.close(); } catch (ignore) { }
    }
  }
}

// ==================== 导出(export): 全量, 支持精简模式 ====================
function doExport(whereClause) {
  /** @type {java.sql.Connection} */
  var conn = null;
  try {
    conn = getDBConnection();

    var sql = "SELECT " + CONDITION_SELECT + CONDITION_FROM +
      " WHERE " + whereClause +
      " ORDER BY c.CONDITIONNUM";
    logger.info("[" + scriptName + "] 导出SQL: " + sql);

    var pstmt = conn.prepareStatement(sql);
    var rs = pstmt.executeQuery();

    /** @type {com.ibm.json.java.JSONArray} */
    var conditions = new JSONArray();
    while (rs.next()) {
      conditions.add(buildConditionExportObject(rs));
    }
    rs.close();
    pstmt.close();

    /** @type {com.ibm.json.java.JSONObject} */
    var result = new OrderedJSONObject();
    result.put("conditions", conditions);
    if (hasPagination) {
      var countSql = "SELECT COUNT(*)" + CONDITION_FROM + " WHERE " + whereClause;
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

    logger.info("[" + scriptName + "] 导出完成, 共 " + conditions.size() + " 条");
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
  var conditionsArray;
  if (Array.isArray(requestData)) {
    conditionsArray = requestData;
  } else if (requestData.conditions && Array.isArray(requestData.conditions)) {
    conditionsArray = requestData.conditions;
  } else {
    conditionsArray = [requestData];
  }

  if (!conditionsArray || conditionsArray.length === 0) {
    throw new MXApplicationException("#", "没有提供条件数据");
  }

  logger.info("[" + scriptName + "] 开始批量导入 " + conditionsArray.length + " 个条件");

  /** @type {Array} */
  var resultList = [];

  for (var i = 0; i < conditionsArray.length; i++) {
    /** @type {Object} */
    var condData = conditionsArray[i];
    try {
      saveOrUpdateCondition(condData, i + 1);
      resultList.push({
        conditionnum: condData.conditionnum || "未知",
        status: "SUCCESS",
        message: "条件保存成功"
      });
    } catch (error) {
      logger.error("[" + scriptName + "] 处理第 " + (i + 1) + " 个条件失败: ", error);
      resultList.push({
        conditionnum: condData.conditionnum || "未知",
        status: "FAILED",
        message: error.message ? error.message : error.toString()
      });
    }
  }

  var successCount = 0;
  var failedCount = 0;
  for (var j = 0; j < resultList.length; j++) {
    if (resultList[j].status === "SUCCESS") {
      successCount++;
    } else {
      failedCount++;
    }
  }

  logger.info("[" + scriptName + "] 批量导入完成: 成功 " + successCount + " 个, 失败 " + failedCount + " 个");

  /** @type {Object} */
  var responseData = {
    status: "success",
    message: "批量导入完成",
    summary: {
      total: conditionsArray.length,
      success: successCount,
      failed: failedCount
    },
    result: resultList
  };
  return JSON.stringify(responseData, null, 4);
}

/**
 * 保存或更新单个条件(CONDITION)
 * 唯一键: CONDITIONNUM
 * @param {Object} condData - 条件数据
 * @param {number} index - 序号(用于错误提示)
 */
function saveOrUpdateCondition(condData, index) {
  /** @type {java.lang.String} */
  var conditionnum = condData.conditionnum;
  if (!conditionnum) {
    throw new MXApplicationException("#", "第 " + index + " 个条件的 conditionnum(条件名称)不能为空");
  }

  /** @type {psdi.mbo.MboSetRemote} */
  var condSet = null;
  try {
    condSet = MXServer.getMXServer().getMboSet("CONDITION", uInfo);

    /** @type {psdi.mbo.SqlFormat} */
    var sqlf = new SqlFormat("conditionnum = :1");
    sqlf.setObject(1, "CONDITION", "CONDITIONNUM", conditionnum);
    condSet.setWhere(sqlf.format());
    condSet.reset();
    logger.info("[" + scriptName + "] 查询条件: " + conditionnum + ", where=" + condSet.getCompleteWhere());

    /** @type {psdi.mbo.MboRemote} */
    var condMbo;

    if (condSet.isEmpty()) {
      if (condData._delete) {
        __mboSetClose(condSet);
        return;
      }
      logger.info("[" + scriptName + "] 创建新条件: " + conditionnum);
      condMbo = condSet.add();
      condMbo.setValue("CONDITIONNUM", conditionnum);
    } else {
      condMbo = condSet.getMbo(0);
      if (condData._delete) {
        logger.info("[" + scriptName + "] 删除条件: " + conditionnum);
        condMbo.delete();
        condSet.save();
        __mboSetClose(condSet);
        return;
      }
    }

    // 字段设置(TYPE/EXPRESSION/CLASSNAME 字符串, NOCACHING 整数0允许)
    setIfDef(condMbo, "TYPE", condData.type);
    setIfDef(condMbo, "EXPRESSION", condData.expression);
    setIfDef(condMbo, "CLASSNAME", condData.classname);
    setIfDef(condMbo, "NOCACHING", condData.nocaching);

    // 描述多语言写入
    saveDescription(condMbo, condData);

    condSet.save();
    logger.info("[" + scriptName + "] 条件保存成功: CONDITIONNUM=" + conditionnum);
  } catch (error) {
    logger.error("[" + scriptName + "] 保存 CONDITION 失败: ", error);
    throw new MXApplicationException("#", "保存条件失败: " + (error.message ? error.message : error.toString()));
  } finally {
    __mboSetClose(condSet);
  }
}

/**
 * 描述写入: 单语言(多语言列未启用), 支持 description / en_description 两种入参
 * @param {psdi.mbo.MboRemote} condMbo - CONDITION 记录
 * @param {Object} condData - 条件数据
 */
function saveDescription(condMbo, condData) {
  if (typeof condData.en_description !== 'undefined' && condData.en_description !== null && condData.en_description !== "") {
    setIfDef(condMbo, "DESCRIPTION", condData.en_description);
  } else {
    setIfDef(condMbo, "DESCRIPTION", condData.description);
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
  if (requestData.conditionnum) {
    conditions.push(buildFieldCondition("c.CONDITIONNUM", requestData.conditionnum));
  }
  if (requestData.description) {
    conditions.push(buildFieldCondition("c.DESCRIPTION", requestData.description));
  }
  if (requestData.type) {
    conditions.push(buildFieldCondition("c.TYPE", requestData.type));
  }
  if (requestData.expression) {
    conditions.push(buildFieldCondition("c.EXPRESSION", requestData.expression));
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

/** 列表记录: 实体字段展示 */
function buildConditionListObject(rs) {
  var obj = new OrderedJSONObject();
  putIfNotDef(obj, "conditionid", getLongFromRS(rs, "CONDITIONID"));
  putIfNotDef(obj, "conditionnum", getStringFromRS(rs, "CONDITIONNUM"));
  putIfNotDef(obj, "type", getStringFromRS(rs, "TYPE"));
  putIfNotDef(obj, "expression", getStringFromRS(rs, "EXPRESSION"));
  putIfNotDef(obj, "classname", getStringFromRS(rs, "CLASSNAME"));
  putIfNotDef(obj, "description", getStringFromRS(rs, "DESCRIPTION"));
  putIfNotDef(obj, "nocaching", getIntFromRS(rs, "NOCACHING"), 0);
  return obj;
}

/** 导出记录(真实数据): 实体字段, 精简模式省略空值/默认值 */
function buildConditionExportObject(rs) {
  var obj = new OrderedJSONObject();
  putIfNotDef(obj, "conditionnum", getStringFromRS(rs, "CONDITIONNUM"));
  putIfNotDef(obj, "type", getStringFromRS(rs, "TYPE"));
  putIfNotDef(obj, "expression", getStringFromRS(rs, "EXPRESSION"));
  putIfNotDef(obj, "classname", getStringFromRS(rs, "CLASSNAME"));
  putIfNotDef(obj, "description", getStringFromRS(rs, "DESCRIPTION"));
  putIfNotDef(obj, "nocaching", getIntFromRS(rs, "NOCACHING"), 0);
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
    mbo.setValueNull(attr, 2);
    return;
  }
  if (typeof val === 'string' && val === "") {
    mbo.setValue(attr, "", 2);
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