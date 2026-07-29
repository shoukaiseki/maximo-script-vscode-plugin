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

          var sql = buildMessageSQL(completeWhere);
          logger.info("[" + scriptName + "] GK SQL: " + sql);
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
          var sql = buildMessageSQL(conditions.join(" OR "));
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
      }

      /** @type {com.ibm.json.java.JSONObject} */
      var result = new OrderedJSONObject();
      result.put("messages", messages);

      logger.info("[" + scriptName + "] 导出完成, 共 " + messages.size() + " 条消息");
      return JSON.stringify(JSON.parse(service.jsonToString(result)));

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
 * 构建消息查询SQL,根据语言参数决定是否LEFT JOIN L_MAXMESSAGES
 * @param {string} baseWhere - WHERE 条件
 * @returns {string} 完整 SQL
 */
function buildMessageSQL(baseWhere) {
  // 非EN语言: LEFT JOIN 获取该语言的翻译
  if (typeof _langcode !== 'undefined' && _langcode !== 'EN') {
    return "SELECT MAXMESSAGES.*, L_MAXMESSAGES.value as L_VALUE" +
           " FROM MAXMESSAGES" +
           " LEFT JOIN L_MAXMESSAGES ON (L_MAXMESSAGES.OWNERID = MAXMESSAGES.MAXMESSAGESID AND L_MAXMESSAGES.LANGCODE = '" + _langcode + "')" +
           " WHERE " + baseWhere;
  }
  // EN语言: 直接取 MAXMESSAGES 原值
  return "SELECT * FROM MAXMESSAGES WHERE " + baseWhere;
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

  // 必填字段 - value 根据导出语言取值
  obj.put("msgGroup", getStringFromRS(rs, "MSGGROUP"));
  obj.put("msgKey", getStringFromRS(rs, "MSGKEY"));
  if (typeof _langcode !== 'undefined' && _langcode !== 'EN') {
    // 非EN语言: 取翻译值,无翻译时回退到原值
    var transVal = getStringFromRS(rs, "L_VALUE");
    obj.put("value", transVal !== null ? transVal : getStringFromRS(rs, "VALUE"));
  } else {
    // EN语言: 取原值
    obj.put("value", getStringFromRS(rs, "VALUE"));
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
