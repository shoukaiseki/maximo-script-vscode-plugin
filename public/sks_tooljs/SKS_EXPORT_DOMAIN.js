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
if (typeof request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
  _langcode = request.getQueryParam("_langcode").toUpperCase();
  uInfo.setLangCode(_langcode);
  logger.info("[" + scriptName + "] _langcode=" + _langcode + ", langCode=" + uInfo.getLocale().getLanguage());
}

// API类型: exp=导出(仅返回 _langcode 指定语言的描述), 其它=管理端查询(额外返回 description_zh/en)
var apiType = request.getQueryParam("apiType");

// _action: list=仅查询 MAXDOMAIN 主记录列表, export=完整导出(含 ALNDOMAIN 子记录, 默认)
var action = request.getQueryParam("_action") || "export";
if (action !== "export" && action !== "list") {
  action = "export";
}

// 精简模式(ignoreDefVal): 省略空值或与默认值相同的属性, 非默认值仍导出, 简化JSON
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

logger.info("[" + scriptName + "]----------------requestBody=" + typeof requestBody)

// MAXDOMAIN 上的域值子表关系名(根据 MAXRELATIONSHIP 确认)
var DOMAIN_VALUE_REL = {
  "ALN": "ALNDOMAINVALUE",
  "SYNONYM": "SYNONYMDOMAIN",
  "NUMERIC": "NUMDOMAINVALUE",
  "NUMRANGE": "RANGEDOMSEGMENT",
  "CROSSOVER": "MAXTABLEDOMAINFORCROSSOVER",
  "TABLE": "MAXTABLEDOMAIN"
};

// 导出 JSON 中域值子记录的键名
var DOMAIN_VALUE_KEY = {
  "ALN": "alndomain",
  "SYNONYM": "synonymdomain",
  "NUMERIC": "numericdomain",
  "NUMRANGE": "numrangedomain",
  "CROSSOVER": "tabledomain",
  "TABLE": "tabledomain"
};

// 域值子记录构建函数映射
var DOMAIN_VALUE_BUILDER = {
  "ALN": buildAlnValue,
  "SYNONYM": buildSynonymValue,
  "NUMERIC": buildNumericValue,
  "NUMRANGE": buildNumRangeValue,
  "CROSSOVER": buildTableValue,
  "TABLE": buildTableValue
};

responseBody = main();

function main() {
  try {
    logger.info("[" + scriptName + "]----------------requestBody=" + requestBody)
    if (typeof requestBody === "undefined" || !requestBody) {
      throw new MXApplicationException("#", "请求体(requestBody)不能为空");
    }

    /** @type {Object} */
    var requestData = JSON.parse(requestBody);

    // 仅支持 where 过滤, 为空时导出全部
    var whereClause = requestData.where || "1=1";
    // MAXDOMAIN 查询会 right outer join 语言表 L_MAXDOMAIN(含 DESCRIPTION 列),
    // 裸 DESCRIPTION 会产生列歧义(SQLCODE=-203/42702), 改写为同时匹配两个表
    whereClause = qualifyDescriptionWhere(whereClause);

    /** @type {psdi.mbo.MboSetRemote} */
    var domainSet = null;
    try {
      domainSet = MXServer.getMXServer().getMboSet("MAXDOMAIN", uInfo);
      domainSet.setWhere(whereClause);
      domainSet.setOrderBy("domaintype, domainid")
      domainSet.reset();

      var total = domainSet.count();
      logger.info("[" + scriptName + "] action=" + action + ", 过滤条件: " + whereClause + ", 共 " + total + " 条");

      /** @type {com.ibm.json.java.JSONArray} */
      var domains = new JSONArray();

      var mbo = domainSet.moveFirst();
      var idx = 0;
      while (mbo) {
        var domainObj = action === "list" ? buildDomainListObject(mbo) : buildDomainObject(mbo);
        if (hasPagination) {
          // 内存分页
          if (idx >= (pageNumInt - 1) * pageSizeInt && idx < pageNumInt * pageSizeInt) {
            domains.add(domainObj);
          }
          idx++;
        } else {
          domains.add(domainObj);
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

      logger.info("[" + scriptName + "] " + action + " 完成, 共 " + domains.size() + " 条");
      return service.jsonToString(result);
    } finally {
      __close(domainSet);
    }
  } catch (error) {
    logger.error("[" + scriptName + "] 导出域定义失败: " , error);
    /** @type {com.ibm.json.java.JSONObject} */
    var errorData = new JSONObject();
    errorData.put("status", "error");
    errorData.put("message", error.message ? error.message : error.toString());
    return errorData.serialize();
  }
}

/**
 * 处理 where 子句中 DESCRIPTION 列的歧义问题
 * Maximo 查询 MAXDOMAIN 时会 right outer join 语言表 L_MAXDOMAIN(该表也有 DESCRIPTION 列),
 * 若 where 中使用裸 DESCRIPTION(如 UPPER(DESCRIPTION) LIKE ...), DB2 报 SQLCODE=-203 列歧义。
 * 改为同时匹配 L_MAXDOMAIN.DESCRIPTION 与 MAXDOMAIN.DESCRIPTION。
 * @param {string} whereClause - 原始 where 条件
 * @returns {string} 处理后的 where 条件
 */
function qualifyDescriptionWhere(whereClause) {
  if (!whereClause || whereClause === "1=1") return whereClause;
  // UPPER(DESCRIPTION) LIKE UPPER('...') / UPPER(DESCRIPTION) = UPPER('...')
  whereClause = whereClause.replace(/UPPER\(\s*DESCRIPTION\s*\)\s*(LIKE|=|<>|!=)\s*UPPER\(\s*'([^']*)'\s*\)/gi, function (m, op, val) {
    return "(UPPER(L_MAXDOMAIN.DESCRIPTION) " + op + " UPPER('" + val + "') OR UPPER(MAXDOMAIN.DESCRIPTION) " + op + " UPPER('" + val + "'))";
  });
  // 裸 DESCRIPTION LIKE '...' / DESCRIPTION = '...'
  whereClause = whereClause.replace(/\bDESCRIPTION\b\s*(LIKE|=|<>|!=)\s*'([^']*)'/gi, function (m, op, val) {
    return "(L_MAXDOMAIN.DESCRIPTION " + op + " '" + val + "' OR MAXDOMAIN.DESCRIPTION " + op + " '" + val + "')";
  });
  return whereClause;
}

/**
 * 构建域定义列表 JSON 对象(仅 MAXDOMAIN 主记录, 不含 ALNDOMAIN 子记录)
 * @param {psdi.mbo.MboRemote} domainMbo - MAXDOMAIN MBO
 * @returns {com.ibm.json.java.JSONObject}
 */
function buildDomainListObject(domainMbo) {
  /** @type {com.ibm.json.java.OrderedJSONObject} */
  var obj = new OrderedJSONObject();

  obj.put("domainid", getString(domainMbo, "DOMAINID"));
  obj.put("domaintype", getString(domainMbo, "DOMAINTYPE"));
  putIfNotDef(obj, "description", getString(domainMbo, "DESCRIPTION"));
  if (apiType !== 'exp') {
    putLangField(obj, domainMbo, "description_zh", "DESCRIPTION", "ZH");
    putLangField(obj, domainMbo, "description_en", "DESCRIPTION", "EN");
  }
  putIfNotDef(obj, "maxtype", getString(domainMbo, "MAXTYPE"));
  putIfNotDef(obj, "length", getInt(domainMbo, "LENGTH"));
  // scale 仅数字域/数字范围域需要
  var domainType = getString(domainMbo, "DOMAINTYPE");
  if (domainType === "NUMERIC" || domainType === "NUMRANGE") {
    putIfNotDef(obj, "scale", getInt(domainMbo, "SCALE"));
  }
  putIfNotDef(obj, "internal", getInt(domainMbo, "INTERNAL"), 0);
  putIfNotDef(obj, "nevercache", getInt(domainMbo, "NEVERCACHE"), 0);

  return obj;
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

  // 可选字段: 精简模式(ignoreDefVal)下省略空值或与默认值相同的属性, 非默认值仍导出
  putIfNotDef(obj, "description", getString(domainMbo, "DESCRIPTION"));
  // 非导出模式额外返回多语言描述(备份查看用)
  if (apiType !== 'exp') {
    putLangField(obj, domainMbo, "description_zh", "DESCRIPTION", "ZH");
    putLangField(obj, domainMbo, "description_en", "DESCRIPTION", "EN");
  }
  putIfNotDef(obj, "maxtype", getString(domainMbo, "MAXTYPE"));
  putIfNotDef(obj, "length", getInt(domainMbo, "LENGTH"));
  // scale 仅数字域/数字范围域需要
  var domainType = getString(domainMbo, "DOMAINTYPE");
  if (domainType === "NUMERIC" || domainType === "NUMRANGE") {
    putIfNotDef(obj, "scale", getInt(domainMbo, "SCALE"));
  }
  putIfNotDef(obj, "internal", getInt(domainMbo, "INTERNAL"), 0);
  putIfNotDef(obj, "nevercache", getInt(domainMbo, "NEVERCACHE"), 0);

  // 按 domaintype 读取对应的域值子表(ALN/SYNONYM/NUMERIC/NUMRANGE/CROSSOVER/TABLE)
  var relName = DOMAIN_VALUE_REL[domainType];
  if (relName) {
    var valueArr = buildDomainValues(domainMbo, relName, domainType);
    if (valueArr.size() > 0) {
      obj.put(DOMAIN_VALUE_KEY[domainType], valueArr);
    }
  }

  return obj;
}

/**
 * 读取并构建某个域的所有值子记录
 * @param {psdi.mbo.MboRemote} domainMbo - MAXDOMAIN MBO
 * @param {java.lang.String} relName - 子表关系名
 * @param {java.lang.String} domainType - 域类型
 * @returns {com.ibm.json.java.JSONArray}
 */
function buildDomainValues(domainMbo, relName, domainType) {
  /** @type {psdi.mbo.MboSetRemote} */
  var valSet = null;
  /** @type {com.ibm.json.java.JSONArray} */
  var arr = new JSONArray();
  try {
    valSet = domainMbo.getMboSet(relName);
    valSet.reset();
    var valMbo = valSet.moveFirst();
    while (valMbo) {
      var valObj = DOMAIN_VALUE_BUILDER[domainType](valMbo, domainType);
      if (valObj !== null) {
        arr.add(valObj);
      }
      valMbo = valSet.moveNext();
    }
  } finally {
    __close(valSet);
  }
  return arr;
}

/**
 * ALN 域值记录(DOMAINID/VALUE/DESCRIPTION/ORGID/SITEID)
 * @param {psdi.mbo.MboRemote} mbo
 * @returns {com.ibm.json.java.JSONObject}
 */
function buildAlnValue(mbo) {
  /** @type {com.ibm.json.java.OrderedJSONObject} */
  var o = new OrderedJSONObject();
  o.put("value", getString(mbo, "VALUE"));
  putDescFields(o, mbo);
  putIfNotDef(o, "orgid", getString(mbo, "ORGID"));
  putIfNotDef(o, "siteid", getString(mbo, "SITEID"));
  return o;
}

/**
 * SYNONYM 域值记录(MAXVALUE/VALUE/DESCRIPTION/DEFAULTS/ORGID/SITEID)
 * @param {psdi.mbo.MboRemote} mbo
 * @returns {com.ibm.json.java.JSONObject}
 */
function buildSynonymValue(mbo) {
  /** @type {com.ibm.json.java.OrderedJSONObject} */
  var o = new OrderedJSONObject();
  o.put("maxvalue", getString(mbo, "MAXVALUE"));
  o.put("value", getString(mbo, "VALUE"));
  putDescFields(o, mbo);
  putIfNotDef(o, "defaults", getString(mbo, "DEFAULTS"), "0");
  putIfNotDef(o, "orgid", getString(mbo, "ORGID"));
  putIfNotDef(o, "siteid", getString(mbo, "SITEID"));
  return o;
}

/**
 * NUMERIC 域值记录(VALUE/DESCRIPTION/ORGID/SITEID)
 * @param {psdi.mbo.MboRemote} mbo
 * @returns {com.ibm.json.java.JSONObject}
 */
function buildNumericValue(mbo) {
  /** @type {com.ibm.json.java.OrderedJSONObject} */
  var o = new OrderedJSONObject();
  o.put("value", getString(mbo, "VALUE"));
  putDescFields(o, mbo);
  putIfNotDef(o, "orgid", getString(mbo, "ORGID"));
  putIfNotDef(o, "siteid", getString(mbo, "SITEID"));
  return o;
}

/**
 * NUMRANGE 域值记录(RANGESEGMENT/RANGEMINIMUM/RANGEMAXIMUM/RANGEINTERVAL/ORGID/SITEID)
 * @param {psdi.mbo.MboRemote} mbo
 * @returns {com.ibm.json.java.JSONObject}
 */
function buildNumRangeValue(mbo) {
  /** @type {com.ibm.json.java.OrderedJSONObject} */
  var o = new OrderedJSONObject();
  o.put("rangesegment", getInt(mbo, "RANGESEGMENT"));
  putIfNotDef(o, "rangeminimum", getDouble(mbo, "RANGEMINIMUM"));
  putIfNotDef(o, "rangemaximum", getDouble(mbo, "RANGEMAXIMUM"));
  putIfNotDef(o, "rangeinterval", getDouble(mbo, "RANGEINTERVAL"));
  putIfNotDef(o, "orgid", getString(mbo, "ORGID"));
  putIfNotDef(o, "siteid", getString(mbo, "SITEID"));
  return o;
}

/**
 * CROSSOVER 域值记录(SOURCEFIELD/DESTFIELD/条件/序号/ORGID/SITEID)
 * @param {psdi.mbo.MboRemote} mbo
 * @returns {com.ibm.json.java.JSONObject}
 */
function buildCrossoverValue(mbo) {
  /** @type {com.ibm.json.java.OrderedJSONObject} */
  var o = new OrderedJSONObject();
  o.put("sourcefield", getString(mbo, "SOURCEFIELD"));
  o.put("destfield", getString(mbo, "DESTFIELD"));
  putIfNotDef(o, "sourcecondition", getString(mbo, "SOURCECONDITION"));
  putIfNotDef(o, "destcondition", getString(mbo, "DESTCONDITION"));
  putIfNotDef(o, "copyevenifsrcnull", getString(mbo, "COPYEVENIFSRCNULL"), "0");
  putIfNotDef(o, "copyonlyifdestnull", getString(mbo, "COPYONLYIFDESTNULL"), "0");
  putIfNotDef(o, "sequence", getInt(mbo, "SEQUENCE"));
  putIfNotDef(o, "orgid", getString(mbo, "ORGID"));
  putIfNotDef(o, "siteid", getString(mbo, "SITEID"));
  return o;
}

/**
 * TABLE/CROSSOVER 域值记录(OBJECTNAME/WHERE 子句/错误消息/ORGID/SITEID)
 * CROSSOVER 类型: MAXTABLEDOMAIN 下还有 CROSSOVERDOMAIN 子记录
 * @param {psdi.mbo.MboRemote} mbo - MAXTABLEDOMAIN MBO
 * @param {java.lang.String} domainType - 域类型
 * @returns {com.ibm.json.java.JSONObject}
 */
function buildTableValue(mbo, domainType) {
  /** @type {com.ibm.json.java.OrderedJSONObject} */
  var o = new OrderedJSONObject();
  o.put("objectname", getString(mbo, "OBJECTNAME"));
  putIfNotDef(o, "validtnwhereclause", getString(mbo, "VALIDTNWHERECLAUSE"));
  putIfNotDef(o, "listwhereclause", getString(mbo, "LISTWHERECLAUSE"));
  putIfNotDef(o, "errorresourcbundle", getString(mbo, "ERRORRESOURCBUNDLE"));
  putIfNotDef(o, "erroraccesskey", getString(mbo, "ERRORACCESSKEY"));
  putIfNotDef(o, "orgid", getString(mbo, "ORGID"));
  putIfNotDef(o, "siteid", getString(mbo, "SITEID"));

  // CROSSOVER 类型: MAXTABLEDOMAIN 下还有 CROSSOVERDOMAIN 子记录
  if (domainType === "CROSSOVER") {
    /** @type {com.ibm.json.java.JSONArray} */
    var coArr = new JSONArray();
    /** @type {psdi.mbo.MboSetRemote} */
    var coSet = null;
    try {
      coSet = mbo.getMboSet("CROSSOVERDOMAIN");
      coSet.reset();
      var coMbo = coSet.moveFirst();
      while (coMbo) {
        coArr.add(buildCrossoverValue(coMbo));
        coMbo = coSet.moveNext();
      }
    } finally {
      __close(coSet);
    }
    if (coArr.size() > 0) {
      o.put("crossoverdomain", coArr);
    }
  }

  return o;
}

/**
 * 向值记录添加描述及多语言字段
 * @param {com.ibm.json.java.JSONObject} o
 * @param {psdi.mbo.MboRemote} mbo
 */
function putDescFields(o, mbo) {
  o.put("description", getString(mbo, "DESCRIPTION"));
  if (apiType !== 'exp') {
    putLangField(o, mbo, "description_zh", "DESCRIPTION", "ZH");
    putLangField(o, mbo, "description_en", "DESCRIPTION", "EN");
  }
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
 * 获取 MBO 浮点数值
 * @param {psdi.mbo.MboRemote} mbo
 * @param {java.lang.String} attr
 * @returns {number|null}
 */
function getDouble(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : mbo.getDouble(attr);
  } catch (e) {
    return null;
  }
}

/**
 * 添加属性值到 JSON 对象
 * 规则: 空值(null/undefined/"")不导出; 精简模式(ignoreDefVal)下与默认值相同的属性不导出, 非默认值仍导出
 * @param {com.ibm.json.java.JSONObject} obj
 * @param {java.lang.String} jsonKey
 * @param {*} val - 属性值
 * @param {*} defVal - 默认值(可选), 精简模式下等于该值的属性省略
 */
function putIfNotDef(obj, jsonKey, val, defVal) {
  if (val === null || val === undefined || val === "") return;
  if (ignoreDefVal && defVal !== undefined && defVal !== null && String(val) == String(defVal)) return;
  obj.put(jsonKey, val);
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
