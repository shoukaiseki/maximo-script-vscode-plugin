// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

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

/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");

/** @type {java.text.SimpleDateFormat} */
SimpleDateFormat = Java.type("java.text.SimpleDateFormat");

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
loggerMX.error("[" + scriptName + "]----------1");
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true });
logger.info("[" + scriptName + "]----------------Starting execution of script " + scriptName);

/** @type {psdi.security.UserInfo} */
var uInfo = userInfo;
var _langcode="EN"
if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
  _langcode = request.getQueryParam("_langcode").toUpperCase();
  // uInfo.setLocale(lang);
  uInfo.setLangCode(_langcode)
  logger.info("------------------_langcode=" +_langcode+",uInfo.langCode="+ uInfo.getLocale().getLanguage() + ",country=" + uInfo.getLocale().getCountry());
}
//忽略默认字段,导出时候忽略导入时候一些默认的字段,简化json,适合于单表迁移,复制表信息
var ignoreDefVal = false
if (request.getQueryParam("ignoreDefVal") !== 'undefined' && request.getQueryParam("ignoreDefVal") == "true") {
  ignoreDefVal = true
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
    var filterMode = requestData.filterMode || "where";
    var whereClause = requestData.where || "";
    var groupKeyList = requestData.groupKeyList || [];

    // 如果传入了字段搜索参数, 自动构建 WHERE 条件
    // VALUE字段特殊处理: 分页模式有 LEFT JOIN L_MAXMESSAGES, 需同时搜索EN和ZH的value
    var valueSearchVal = null;
    if (!whereClause) {
      var searchFields = {};
      if (requestData.msgid) searchFields["MSGID"] = requestData.msgid;
      if (requestData.msggroup) searchFields["MSGGROUP"] = requestData.msggroup;
      if (requestData.msgkey) searchFields["MSGKEY"] = requestData.msgkey;
      if (hasPagination) {
        // 分页模式: VALUE 在 SQL 层面同时搜索两表, 不传给 MboSet
        if (requestData.value) valueSearchVal = requestData.value;
      } else {
        if (requestData.value) searchFields["VALUE"] = requestData.value;
      }
      whereClause = buildWhereFromFields(searchFields);
    }

    // 无任何条件时查全部
    if (!whereClause) {
      whereClause = "1=1";
    }

    if (filterMode !== "where" && filterMode !== "gk") {
      throw new MXApplicationException("#", "filterMode 必须是 'where' 或 'gk'");
    }

    /** @type {java.sql.Connection} */
    var conn = null;
    try {
      conn = MXServer.getMXServer().getDBManager().getConnection(MXServer.getMXServer().getSystemUserInfo().getConnectionKey());

      /** @type {com.ibm.json.java.JSONArray} */
      var messages = new JSONArray();

      if (filterMode === "where") {
        // where 模式: 用 MboSet 解析 where 条件, 再用 SQL 查询(避免 5000行限制)
        var messageSet = null;
        try {
          messageSet = MXServer.getMXServer().getMboSet("MAXMESSAGES", uInfo);
          if (whereClause) {
            messageSet.setWhere(whereClause);
          }
          messageSet.reset();
          var completeWhere = messageSet.getCompleteWhere();
          if (!completeWhere || completeWhere === "") {
            completeWhere = "1=1";
          }
          logger.info("[" + scriptName + "] WHERE过滤: " + whereClause + ", SQL: " + completeWhere);

          // 分页模式且 VALUE 搜索时, 构建同时搜索 EN 和 ZH 的 SQL WHERE
          var sqlWhere = completeWhere;
          if (hasPagination && valueSearchVal) {
            var enCond = buildFieldCondition("MAXMESSAGES.VALUE", valueSearchVal);
            var zhCond = buildFieldCondition("L_MAXMESSAGES.VALUE", valueSearchVal);
            var valueOrClause = "(" + enCond + " OR " + zhCond + ")";
            if (sqlWhere && sqlWhere !== "1=1") {
              sqlWhere = "(" + sqlWhere + ") AND " + valueOrClause;
            } else {
              sqlWhere = valueOrClause;
            }
          }

          // 总数查询
          var total = 0;
          if (hasPagination) {
            var countSql;
            if (hasPagination && valueSearchVal) {
              // 总数查询也要 JOIN L_MAXMESSAGES, 否则计数会偏少
              countSql = "SELECT COUNT(*) FROM MAXMESSAGES LEFT JOIN L_MAXMESSAGES ON (L_MAXMESSAGES.OWNERID = MAXMESSAGES.MAXMESSAGESID AND L_MAXMESSAGES.LANGCODE = 'ZH') WHERE " + sqlWhere;
            } else {
              countSql = "SELECT COUNT(*) FROM MAXMESSAGES WHERE " + completeWhere;
            }
            var countStmt = conn.prepareStatement(countSql);
            var countRs = countStmt.executeQuery();
            if (countRs.next()) {
              total = countRs.getInt(1);
            }
            countRs.close();
            countStmt.close();
          }

          var sql = buildMessageSQL(sqlWhere, hasPagination, pageNumInt, pageSizeInt);
          logger.info("[" + scriptName + "] SQL: " + sql);
          var pstmt = conn.prepareStatement(sql);
          var rs = pstmt.executeQuery();
          while (rs.next()) {
            var messageObj = buildMessageObjectFromRS(rs);
            messages.add(messageObj);
          }
          rs.close();
          pstmt.close();
        } finally {
          if (messageSet) {
            messageSet.cleanup();
            messageSet.close();
          }
        }

        /** @type {com.ibm.json.java.JSONObject} */
        var result = new OrderedJSONObject();
        result.put("messages", messages);
        if (hasPagination) {
          result.put("total", total);
          result.put("pageNum", pageNumInt);
          result.put("pageSize", pageSizeInt);
        }

        logger.info("[" + scriptName + "] 导出完成, 共 " + messages.size() + " 条消息");
        return JSON.stringify(JSON.parse(service.jsonToString(result)));
      } else {
        // gk 模式 - 按 msgGroup + msgKey 批量查询
        if (!groupKeyList || groupKeyList.length === 0) {
          throw new MXApplicationException("#", "groupKeyList 不能为空");
        }
        logger.info("[" + scriptName + "] GK过滤: " + JSON.stringify(groupKeyList));

        var conditions = [];
        for (var i = 0; i < groupKeyList.length; i++) {
          var gk = groupKeyList[i];
          if (!gk.msgGroup || !gk.msgKey) {
            logger.warn("[" + scriptName + "] 跳过无效的 groupKey 条目: " + JSON.stringify(gk));
            continue;
          }
          var sqlf = new SqlFormat("(msgGroup = :1 and msgKey = :2)");
          sqlf.setObject(1, "MAXMESSAGES", "MSGGROUP", gk.msgGroup);
          sqlf.setObject(2, "MAXMESSAGES", "MSGKEY", gk.msgKey);
          conditions.push(sqlf.format());
        }

        if (conditions.length > 0) {
          var sql = buildMessageSQL(conditions.join(" OR "), false);
          logger.info("[" + scriptName + "] GK SQL: " + sql);
          var pstmt = conn.prepareStatement(sql);
          var rs = pstmt.executeQuery();
          while (rs.next()) {
            var messageObj = buildMessageObjectFromRS(rs);
            messages.add(messageObj);
          }
          rs.close();
          pstmt.close();
        }

        /** @type {com.ibm.json.java.JSONObject} */
        var result = new OrderedJSONObject();
        result.put("messages", messages);

        logger.info("[" + scriptName + "] 导出完成, 共 " + messages.size() + " 条消息");
        return JSON.stringify(JSON.parse(service.jsonToString(result)));
      }

    } finally {
      if (conn) {
        try { conn.close(); } catch (ignore) { }
      }
    }

  } catch (error) {
    logger.error("[" + scriptName + "] 导出消息失败: " + error);
    /** @type {com.ibm.json.java.JSONObject} */
    var errorData = new JSONObject();
    errorData.put("status", "error");
    errorData.put("message", error.message ? error.message : error.toString());
    return JSON.stringify(JSON.parse(errorData.serialize()));
  }
}

/**
 * 构建消息查询SQL
 * 当有分页参数时始终LEFT JOIN L_MAXMESSAGES(ZH)返回中英文双值
 * 无分页时按 _langcode 参数决定是否JOIN(兼容旧调用)
 * @param {string} baseWhere - WHERE 条件
 * @param {boolean} hasPagination - 是否有分页
 * @param {number} pageNum - 页码
 * @param {number} pageSize - 每页条数
 * @returns {string} 完整 SQL
 */
function buildMessageSQL(baseWhere, hasPagination, pageNum, pageSize) {
  var sql;
  if (hasPagination) {
    // 分页模式: 始终LEFT JOIN L_MAXMESSAGES(ZH), 返回中英文双值
    sql = "SELECT MAXMESSAGES.*, L_MAXMESSAGES.value as L_VALUE" +
           " FROM MAXMESSAGES" +
           " LEFT JOIN L_MAXMESSAGES ON (L_MAXMESSAGES.OWNERID = MAXMESSAGES.MAXMESSAGESID AND L_MAXMESSAGES.LANGCODE = 'ZH')" +
           " WHERE " + baseWhere +
           " ORDER BY MAXMESSAGES.MSGGROUP, MAXMESSAGES.MSGKEY" +
           " OFFSET " + ((pageNum - 1) * pageSize) + " ROWS FETCH NEXT " + pageSize + " ROWS ONLY";
  } else if (typeof _langcode !== 'undefined' && _langcode !== 'EN') {
    // 非EN语言: LEFT JOIN 获取该语言的翻译
    // WHERE 中的 VALUE 要加 MAXMESSAGES. 前缀, 否则有 LEFT JOIN 时 VALUE 歧义
    var qualifiedWhere = baseWhere.replace(/\bVALUE\b/g, "MAXMESSAGES.VALUE");
    sql = "SELECT MAXMESSAGES.*, L_MAXMESSAGES.value as L_VALUE" +
           " FROM MAXMESSAGES" +
           " LEFT JOIN L_MAXMESSAGES ON (L_MAXMESSAGES.OWNERID = MAXMESSAGES.MAXMESSAGESID AND L_MAXMESSAGES.LANGCODE = '" + _langcode + "')" +
           " WHERE " + qualifiedWhere;
  } else {
    // EN语言: 直接取 MAXMESSAGES 原值
    sql = "SELECT * FROM MAXMESSAGES WHERE " + baseWhere;
  }
  return sql;
}

/**
 * 根据字段搜索参数构建 WHERE 条件
 * 搜索规则(按开发文档):
 *   =XXX  精确匹配
 *   %XXX  通配符模糊(按原值传LIKE)
 *   纯文本 LIKE '%XXX%' 模糊搜索
 * @param {Object} fields - { DB列名: 搜索值 }
 * @returns {string} WHERE 条件
 */
function buildWhereFromFields(fields) {
  var clauses = [];
  for (var col in fields) {
    var val = fields[col];
    if (!val) continue;
    if (val.startsWith("=")) {
      // 精确匹配
      var exactVal = val.substring(1);
      clauses.push("UPPER(" + col + ") = UPPER('" + escapeSql(exactVal) + "')");
    } else if (val.indexOf("%") >= 0 || val.indexOf("_") >= 0) {
      // 通配符模糊
      clauses.push("UPPER(" + col + ") LIKE UPPER('" + escapeSql(val) + "')");
    } else {
      // 纯文本模糊
      clauses.push("UPPER(" + col + ") LIKE UPPER('%" + escapeSql(val) + "%')");
    }
  }
  return clauses.join(" and ");
}

/**
 * SQL 转义(防止注入)
 * @param {string} str
 * @returns {string}
 */
function escapeSql(str) {
  if (!str) return "";
  return str.replace(/'/g, "''");
}

/**
 * 构建单个字段的搜索条件
 * @param {string} col - 列名(可带表前缀,如 MAXMESSAGES.VALUE)
 * @param {string} val - 搜索值
 * @returns {string} 条件语句
 */
function buildFieldCondition(col, val) {
  if (!val) return null;
  if (val.startsWith("=")) {
    return "UPPER(" + col + ") = UPPER('" + escapeSql(val.substring(1)) + "')";
  } else if (val.indexOf("%") >= 0 || val.indexOf("_") >= 0) {
    return "UPPER(" + col + ") LIKE UPPER('" + escapeSql(val) + "')";
  } else {
    return "UPPER(" + col + ") LIKE UPPER('%" + escapeSql(val) + "%')";
  }
}

/**
 * 构建消息 JSON 对象
 * @param {psdi.mbo.MboRemote} msgMbo
 * @returns {com.ibm.json.java.JSONObject}
 */
function buildMessageObject(msgMbo) {
  /** @type {com.ibm.json.java.OrderedJSONObject} */
  var obj = new OrderedJSONObject();

  // 必填字段
  obj.put("msgGroup", getString(msgMbo, "MSGGROUP"));
  obj.put("msgKey", getString(msgMbo, "MSGKEY"));
  obj.put("value", getString(msgMbo, "VALUE"));
  // 记录ID
  obj.put("MAXMESSAGESID", getString(msgMbo, "MAXMESSAGESID"));
  obj.put("displayMethod", getString(msgMbo, "DISPLAYMETHOD"));

  // options: 整数转字符串数组(与导入格式兼容)
  var optionsVal = getInt(msgMbo, "OPTIONS");
  if (optionsVal !== null) {
    var optionsArr = new JSONArray();
    // OPTIONS 位掩码: CLOSE=1, OK=2, CANCEL=4, YES=8, NO=16
    if (optionsVal & 1) { optionsArr.add("close"); }
    if (optionsVal & 2) { optionsArr.add("ok"); }
    if (optionsVal & 4) { optionsArr.add("cancel"); }
    if (optionsVal & 8) { optionsArr.add("yes"); }
    if (optionsVal & 16) { optionsArr.add("no"); }
    obj.put("options", optionsArr);
    obj.put("sks:options", optionsVal);
  }

  if (!ignoreDefVal) {
    // 可选字符串字段
    putIfHas(obj, msgMbo, "title", "TITLE");
    putIfHas(obj, msgMbo, "buttonText", "BUTTONTEXT");
    putIfHas(obj, msgMbo, "explanation", "EXPLANATION");
    putIfHas(obj, msgMbo, "adminResponse", "ADMINRESPONSE");
    putIfHas(obj, msgMbo, "operatorResponse", "OPERATORRESPONSE");
    putIfHas(obj, msgMbo, "systemAction", "SYSTEMACTION");
    putIfHas(obj, msgMbo, "response", "RESPONSE");
    putIfHas(obj, msgMbo, "msgId", "MSGID");
    // 按钮布尔字段(非持久,通过 getBoolean 取值)
    var ok = msgMbo.getBoolean("OK");
    if (ok) { obj.put("ok", true); }
    var yes = msgMbo.getBoolean("YES");
    if (yes) { obj.put("yes", true); }
    var no = msgMbo.getBoolean("NO");
    if (no) { obj.put("no", true); }
    var cancel = msgMbo.getBoolean("CANCEL");
    if (cancel) { obj.put("cancel", true); }
    var close = msgMbo.getBoolean("CLOSE");
    if (close) { obj.put("close", true); }

    // 图标布尔字段
    var stop = msgMbo.getBoolean("STOP");
    if (stop) { obj.put("stop", true); }
    var warning = msgMbo.getBoolean("WARNING");
    if (warning) { obj.put("warning", true); }
    var exclamation = msgMbo.getBoolean("EXCLAMATION");
    if (exclamation) { obj.put("exclamation", true); }
  } else {
    if (msgMbo.isNull("BUTTONTEXT")) {
      putIfHas(obj, msgMbo, "buttonText", "BUTTONTEXT");
    }
    if (msgMbo.isNull("TITLE")) {
      putIfHas(obj, msgMbo, "title", "TITLE");
    }
    if (msgMbo.isNull("EXPLANATION")) {
      putIfHas(obj, msgMbo, "explanation", "EXPLANATION");
    }
    if (msgMbo.isNull("ADMINRESPONSE")) {
      putIfHas(obj, msgMbo, "adminResponse", "ADMINRESPONSE");
    }
    if (msgMbo.isNull("OPERATORRESPONSE")) {
      putIfHas(obj, msgMbo, "operatorResponse", "OPERATORRESPONSE");
    }
    if (msgMbo.isNull("SYSTEMACTION")) {
      putIfHas(obj, msgMbo, "systemAction", "SYSTEMACTION");
    }
    if (msgMbo.isNull("RESPONSE")) {
      putIfHas(obj, msgMbo, "response", "RESPONSE");
    }

  }


  // 消息标识相关
  putIfHas(obj, msgMbo, "prefix", "PREFIX");
  putIfHas(obj, msgMbo, "msgIdPrefix", "MSGIDPREFIX");
  putIfHas(obj, msgMbo, "msgIdSuffix", "MSGIDSUFFIX");

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
 * 构建消息 JSON 对象(从 ResultSet)
 * @param {java.sql.ResultSet} rs
 * @returns {com.ibm.json.java.JSONObject}
 */
function buildMessageObjectFromRS(rs) {
  /** @type {com.ibm.json.java.OrderedJSONObject} */
  var obj = new OrderedJSONObject();

  // 必填字段
  obj.put("msgGroup", getStringFromRS(rs, "MSGGROUP"));
  obj.put("msgKey", getStringFromRS(rs, "MSGKEY"));
  obj.put("value", getStringFromRS(rs, "VALUE"));
  // 记录ID(前端详情查询用)
  obj.put("MAXMESSAGESID", getStringFromRS(rs, "MAXMESSAGESID"));
  // 始终返回中文翻译值(如果有的话)
  var transVal = getStringFromRS(rs, "L_VALUE");
  if (transVal !== null) {
    obj.put("value_zh", transVal);
  } else if (hasPagination) {
    // 分页模式无翻译时也保留字段为null(前端统一展示)
    obj.put("value_zh", null);
  }
  obj.put("displayMethod", getStringFromRS(rs, "DISPLAYMETHOD"));

  // options: 整数转字符串数组(与导入格式兼容)
  var optionsVal = getIntFromRS(rs, "OPTIONS");
  if (optionsVal !== null) {
    var optionsArr = new JSONArray();
    // OPTIONS 位掩码: CLOSE=1, OK=2, CANCEL=4, YES=8, NO=16
    if (optionsVal & 1) { optionsArr.add("close"); }
    if (optionsVal & 2) { optionsArr.add("ok"); }
    if (optionsVal & 4) { optionsArr.add("cancel"); }
    if (optionsVal & 8) { optionsArr.add("yes"); }
    if (optionsVal & 16) { optionsArr.add("no"); }
    obj.put("options", optionsArr);
    obj.put("sks:options", optionsVal);
  }

  if (!ignoreDefVal) {
    // 可选字符串字段
    putIfHasRS(obj, rs, "title", "TITLE");
    putIfHasRS(obj, rs, "buttonText", "BUTTONTEXT");
    putIfHasRS(obj, rs, "explanation", "EXPLANATION");
    putIfHasRS(obj, rs, "adminResponse", "ADMINRESPONSE");
    putIfHasRS(obj, rs, "operatorResponse", "OPERATORRESPONSE");
    putIfHasRS(obj, rs, "systemAction", "SYSTEMACTION");
    putIfHasRS(obj, rs, "response", "RESPONSE");
    putIfHasRS(obj, rs, "msgId", "MSGID");
    // 按钮布尔字段(从 OPTIONS 位掩码推导,虚拟字段不存在于数据库)
    if (optionsVal !== null) {
      if (optionsVal & 2) { obj.put("ok", true); }
      if (optionsVal & 8) { obj.put("yes", true); }
      if (optionsVal & 16) { obj.put("no", true); }
      if (optionsVal & 4) { obj.put("cancel", true); }
      if (optionsVal & 1) { obj.put("close", true); }
    }
  } else {
    if (getStringFromRS(rs, "BUTTONTEXT") === null) {
      putIfHasRS(obj, rs, "buttonText", "BUTTONTEXT");
    }
    if (getStringFromRS(rs, "TITLE") === null) {
      putIfHasRS(obj, rs, "title", "TITLE");
    }
    if (getStringFromRS(rs, "EXPLANATION") === null) {
      putIfHasRS(obj, rs, "explanation", "EXPLANATION");
    }
    if (getStringFromRS(rs, "ADMINRESPONSE") === null) {
      putIfHasRS(obj, rs, "adminResponse", "ADMINRESPONSE");
    }
    if (getStringFromRS(rs, "OPERATORRESPONSE") === null) {
      putIfHasRS(obj, rs, "operatorResponse", "OPERATORRESPONSE");
    }
    if (getStringFromRS(rs, "SYSTEMACTION") === null) {
      putIfHasRS(obj, rs, "systemAction", "SYSTEMACTION");
    }
    if (getStringFromRS(rs, "RESPONSE") === null) {
      putIfHasRS(obj, rs, "response", "RESPONSE");
    }
  }

  // 消息标识相关
  putIfHasRS(obj, rs, "prefix", "PREFIX");
  putIfHasRS(obj, rs, "msgIdPrefix", "MSGIDPREFIX");
  putIfHasRS(obj, rs, "msgIdSuffix", "MSGIDSUFFIX");

  return obj;
}

/**
 * 获取 ResultSet 字符串值
 * @param {java.sql.ResultSet} rs
 * @param {java.lang.String} col
 * @returns {java.lang.String|null}
 */
function getStringFromRS(rs, col) {
  try {
    var val = rs.getString(col);
    return rs.wasNull() ? null : val;
  } catch (e) {
    return null;
  }
}

/**
 * 获取 ResultSet 整数值
 * @param {java.sql.ResultSet} rs
 * @param {java.lang.String} col
 * @returns {number|null}
 */
function getIntFromRS(rs, col) {
  try {
    var val = rs.getInt(col);
    return rs.wasNull() ? null : val;
  } catch (e) {
    return null;
  }
}

/**
 * 如果 ResultSet 有值则添加到 JSON 对象
 * @param {com.ibm.json.java.JSONObject} obj
 * @param {java.sql.ResultSet} rs
 * @param {java.lang.String} jsonKey
 * @param {java.lang.String} col
 */
function putIfHasRS(obj, rs, jsonKey, col) {
  var val = getStringFromRS(rs, col);
  if (val !== null && val !== "") {
    obj.put(jsonKey, val);
  }
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
