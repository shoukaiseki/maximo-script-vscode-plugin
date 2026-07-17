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
if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
  var _langcode = request.getQueryParam("_langcode");
  // uInfo.setLocale(lang);
  uInfo.setLangCode(_langcode)
  logger.info("------------------_langcode=" + uInfo.getLocale().getLanguage() + ",country=" + uInfo.getLocale().getCountry());
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

    /** @type {psdi.mbo.MboSetRemote} */
    var messageSet = null;
    try {
      messageSet = MXServer.getMXServer().getMboSet("MAXMESSAGES", uInfo);

      if (filterMode === "where") {
        if (whereClause) {
          messageSet.setWhere(whereClause);
        }
        messageSet.reset();
        logger.info("[" + scriptName + "] WHERE过滤: " + whereClause + ", 查询到 " + messageSet.count() + " 条消息");
      } else {
        // gk 模式 - 按 msgGroup + msgKey 逐条查询
        if (!groupKeyList || groupKeyList.length === 0) {
          throw new MXApplicationException("#", "groupKeyList 不能为空");
        }
        logger.info("[" + scriptName + "] GK过滤: " + JSON.stringify(groupKeyList));
      }

      /** @type {com.ibm.json.java.JSONArray} */
      var messages = new JSONArray();

      if (filterMode === "where") {
        // where 模式: 遍历查询结果
        /** @type {psdi.mbo.MboRemote} */
        var msgMbo = messageSet.moveFirst();
        while (msgMbo) {
          var messageObj = buildMessageObject(msgMbo);
          messages.add(messageObj);
          msgMbo = messageSet.moveNext();
        }
      } else {
        // gk 模式: 逐条查询
        for (var i = 0; i < groupKeyList.length; i++) {
          var gk = groupKeyList[i];
          if (!gk.msgGroup || !gk.msgKey) {
            logger.warn("[" + scriptName + "] 跳过无效的 groupKey 条目: " + JSON.stringify(gk));
            continue;
          }
          try {
            /** @type {psdi.mbo.MboSetRemote} */
            var gkSet = MXServer.getMXServer().getMboSet("MAXMESSAGES", uInfo);
            try {
              /** @type {psdi.mbo.SqlFormat} */
              var sqlf = new SqlFormat("msgGroup = :1 and msgKey = :2");
              sqlf.setObject(1, "MAXMESSAGES", "MSGGROUP", gk.msgGroup);
              sqlf.setObject(2, "MAXMESSAGES", "MSGKEY", gk.msgKey);
              gkSet.setWhere(sqlf.format());
              gkSet.reset();

              if (!gkSet.isEmpty()) {
                var gkMbo = gkSet.getMbo(0);
                var messageObj = buildMessageObject(gkMbo);
                messages.add(messageObj);
              } else {
                logger.warn("[" + scriptName + "] 未找到消息: msgGroup=" + gk.msgGroup + ", msgKey=" + gk.msgKey);
              }
            } finally {
              __close(gkSet);
            }
          } catch (e) {
            logger.error("[" + scriptName + "] 查询消息失败: msgGroup=" + gk.msgGroup + ", msgKey=" + gk.msgKey + ", " + e);
          }
        }
      }

      /** @type {com.ibm.json.java.JSONObject} */
      var result = new OrderedJSONObject();
      // result.put("status", "success");
      // result.put("total", messages.size());
      result.put("messages", messages);

      logger.info("[" + scriptName + "] 导出完成, 共 " + messages.size() + " 条消息");
      return JSON.stringify(JSON.parse(service.jsonToString(result)));

    } finally {
      __close(messageSet);
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
    // OPTIONS 位掩码: OK=1, CANCEL=2, CLOSE=4, YES=8, NO=16
    if (optionsVal & 1) { optionsArr.add("ok"); }
    if (optionsVal & 2) { optionsArr.add("cancel"); }
    if (optionsVal & 4) { optionsArr.add("close"); }
    if (optionsVal & 8) { optionsArr.add("yes"); }
    if (optionsVal & 16) { optionsArr.add("no"); }
    obj.put("options", optionsArr);
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
