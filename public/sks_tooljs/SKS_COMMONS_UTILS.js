// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// commonsUtils=service.invokeScript("SKS_COMMONS_UTILS");
// load('nashorn:mozilla_compat.js');
/** @type {psdi.mbo.MboRemote} */
MboRemote = Java.type("psdi.mbo.MboRemote");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");
/** @type {com.ibm.tivoli.maximo.script.ScriptUtil} */
var ScriptUtil = Java.type("com.ibm.tivoli.maximo.script.ScriptUtil");
/** @type {psdi.util.MXFormat} */
var MXFormat = Java.type("psdi.util.MXFormat");

/** @type {psdi.iface.mos.ConversionUtil} */
ConversionUtil = Java.type("psdi.iface.mos.ConversionUtil");

var scriptName = "SKS_COMMONS_UTILS"

/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

/**
 * 获取应用名称,通常用于子表获取appName
 var appName = service.invokeScript("SKS_COMMONS_UTILS", "getAppNameByMbo", [mbo]);
 * @param {*} mbo
 * @param {*} frequency
 * @returns
 */
function getAppNameByMbo(mbo, frequency) {
  // 防止无限递归，设置最大递归深度
  var maxDepth = 5;
  var currentDepth = (typeof frequency === "undefined" || frequency == null) ? 0 : frequency;

  if (currentDepth >= maxDepth) {
    return "";
  }

  if (mbo == null) {
    return "";
  }

  // 获取当前MBO的应用名称
  var app = mbo.getThisMboSet().getApp();

  // 如果当前应用名称有效，直接返回
  if (app != null && app !== "") {
    return app;
  }

  // 如果当前没有应用名称，尝试从父级获取
  var parent = mbo.getOwner();
  if (parent != null) {
    // 递归调用，深度+1
    return getAppNameByMbo(parent, currentDepth + 1);
  }

  // 没有父级且当前也没有应用名称，返回null
  return "";
}

/**
 * 获取MBO的布尔值
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.Boolean} 属性值
 */
function getMboBooleanValue(service, mbo, attributeName) {
  if (mbo.isNull(attributeName)) {
    return null
  }
  return mbo.getBoolean(attributeName);
}


/**
 * 获取MBO的整数值
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.Integer} 属性值
 */
function getMboIntValue(service, mbo, attributeName) {
  if (mbo.isNull(attributeName)) {
    return null
  }
  return mbo.getInt(attributeName);
}



/**
 * 获取MBO的长整型值
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.Long} 属性值
 */
function getMboLongValue(service, mbo, attributeName) {
  if (mbo.isNull(attributeName)) {
    return null
  }
  return mbo.getLong(attributeName);
}

/**
 * 获取MBO的字符串值,允许null
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.String} 属性值
 */
function getMboStringValue(service, mbo, attributeName) {

  logger.debug("getMboStringValue")
  if (mbo.isNull(attributeName)) {
    return null
  }
  return mbo.getString(attributeName);
}

/**
 * 获取MBO的日期值字符串，格式为yyyy-MM-dd HH:mm:ss
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.String} 属性值
 */
function getMboDateTimeToString(service, mbo, attributeName) {
  logger.debug("getMboStringValue")
  if (mbo.isNull(attributeName)) {
    return null
  }
  var d = mbo.getDate(attributeName);
  var df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
  df.setTimeZone(TimeZone.getDefault());
  return df.format(d);
}
/**
 * 获取MBO的日期值字符串，格式为yyyy-MM-dd
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.String} 属性值
 */
function getMboDateToString(service, mbo, attributeName) {
  logger.debug("getMboStringValue")
  if (mbo.isNull(attributeName)) {
    return null
  }
  return MXFormat.dateToSQLString(mbo.getDate(attributeName))
}

/**
 * 获取MBO的日期值
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.String} 属性值
 */
function getMboDateValue(service, mbo, attributeName) {
  return formatDateTime(mbo.getDate(attributeName))
}

// 辅助函数：格式化日期时间
function formatDateTime(date) {
  try {

    // 1. 创建 SimpleDateFormat 实例
    // 注意：X 模式在 Java 7+ 支持，XXX 表示 +08:00 格式
    var sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX");

    // 2. 重要：设置时区
    // 如果不设置，会使用 JVM 默认时区，可能导致偏移量不符合预期
    sdf.setTimeZone(TimeZone.getTimeZone("GMT+8"));

    //2026-05-16T05:48:25+08:00
    // 使用 ISO 8601
    // 3. 执行格式化
    return sdf.format(date);

  } catch (e) {
    return null; // 出错时返回原值
  }
}

/**
 * 获取MBO的属性值，自动转换为Java类型,不适合转json时候使用
 * 
 * 因为时间格式对应ibm的JSONObject转换成json会异常,使用JSON.stringify转换会忽略掉
 *                          
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 服务对象
 * @param {psdi.mbo.MboRemotea} mbo - MBO对象
 * @param {java.lang.String} attributeName - 属性名称
 * @returns {java.lang.Object} 属性值
 */
function getValueAutoType(service, mbo, attributeName) {
  //Date,DateTime
  return ScriptUtil.getValueFromMaxType(mbo.getMboValue(attributeName).getMaxType())
}


/**
 * 根据MaxType类型码获取字段值 (与MboJSONStructure方案一相同的转换策略)
 * 
 * 转换策略与MboJSONStructure compact模式保持一致:
 *   - 字符串类型: getString() -> 直接返回字符串
 *   - 日期类型: getDate() -> ConversionUtil.dateToString() -> ISO 8601字符串
 *   - 整数类型: getLong() -> 直接返回数字(long)
 *   - 小数类型: getDouble() -> 直接返回数字(double)
 *   - 布尔类型: getBoolean() -> 直接返回布尔值
 *   - 加密类型: getString() -> MXCipher加密 -> DatatypeConverter Base64编码
 *   - BLOB类型: getBytes() -> DatatypeConverter Base64编码
 * 
 * MaxType类型码对照表:
 *   0-2,13-14,17: ALN/UPPER/LOWER等字符串类型
 *   3-5: DATETIME/DATE/TIME日期类型
 *   6-7,19: INTEGER/BIGINT/SMALLINT整数类型
 *   8-11: DECIMAL/AMOUNT/FLOAT等小数类型
 *   12: YORN布尔类型
 *   15: CRYPTO加密类型
 *   18: BLOB二进制类型
 * 
 * @param {psdi.mbo.MboRemote} mbo - MBO对象
 * @param {string} attrName - 属性名
 * @returns {*} - 字段值(字符串/数字/布尔/Base64字符串)
 */
function getValueByMaxType(service, mbo, attrName) {
  try {
    var mboValueInfo = mbo.getThisMboSet().getMboSetInfo().getAttribute(attrName);
    var maxType = mboValueInfo.getTypeAsInt();
    switch (maxType) {
      case 0:
      case 1:
      case 2:
      case 13:
      case 14:
      case 17:
        return mbo.getString(attrName);
      case 3:
      case 4:
      case 5:
        if (mbo.isNull(attrName)) {
          return null;
        }
        var dateVal = mbo.getDate(attrName);
        return ConversionUtil.dateToString(dateVal);
      case 6:
      case 7:
      case 19:
        return mbo.getLong(attrName);
      case 8:
      case 9:
      case 10:
      case 11:
        return mbo.getDouble(attrName);
      case 12:
        return mbo.getBoolean(attrName);
      case 15:
        var clearTextVal = mbo.getString(attrName);
        if (clearTextVal == null) {
          return null;
        }
        var encData = MXServer.getMXServer().getMXCipher().encData(clearTextVal);
        return DatatypeConverter.printBase64Binary(encData);
      case 18:
        var bytes = mbo.getBytes(attrName);
        if (bytes == null) {
          return null;
        }
        return DatatypeConverter.printBase64Binary(bytes);
      default:
        return mbo.getString(attrName);
    }
  } catch (e) {
    logger.error("[" + scriptName + "] getValueByMaxType error for " + attrName + ": " + e);
    return null;
  }
}



/**
 * 解析多种格式的日期字符串为Date对象
 * 支持: yyyy年M月d日, yyyy/MM/dd, yyyy-MM-dd, yyyyMMdd, Excel序列号(数字)
 * @param {string} dateStr - 日期字符串
 * @returns {java.util.Date}
 */
function parseDateString(dateStr) {
  if (!dateStr) return null;
  // 1. 中文格式: yyyy年M月d日
  try { return new java.text.SimpleDateFormat("yyyy年M月d日").parse(dateStr); } catch (e) { }
  // 2. 标准横杠格式: yyyy-MM-dd
  try { return new java.text.SimpleDateFormat("yyyy-MM-dd").parse(dateStr); } catch (e) { }
  // 3. 斜杠格式: yyyy/MM/dd
  try { return new java.text.SimpleDateFormat("yyyy/MM/dd").parse(dateStr); } catch (e) { }
  // 4. 无分隔符: yyyyMMdd
  try { return new java.text.SimpleDateFormat("yyyyMMdd").parse(dateStr); } catch (e) { }
  // 5. Excel序列号(纯数字, 如 46171)
  try {
    var serialNum = java.lang.Double.parseDouble(dateStr);
    if (serialNum > 1 && serialNum < 100000) {
      var msPerDay = 86400000;
      var baseDate = new java.text.SimpleDateFormat("yyyy-MM-dd").parse("1899-12-30");
      var msOffset = Math.round(serialNum * msPerDay);
      return new java.util.Date(baseDate.getTime() + msOffset);
    }
  } catch (e) { }
  //{ "msgGroup": "ibm_common", "msgKey": "canNotParseDate", "value": "无法解析日期: {0}", "displayMethod": "MSGBOX", "options": ["close"], "msgIdPrefix": "BMXAA", "msgIdSuffix": "W" }
  throw new MXApplicationException("ibm_common", "canNotParseDate"[dateStr]);
}

/**
 * 遍历打印所有组件信息(对应 Java 版 bianliPrint, 递归前缀 qianzui+qianzui 翻倍).
  // var cont = appBean ? appBean.getCreator() : null;
  // logger.info("[" + scriptName + "] ===== appBean.getCreator() 子树 =====");
  // printComponentInfo(cont, "-");
 * 
 * @param {any} base 当前组件
 * @param {string} qianzui 打印的前缀,推荐使用 ---
 */
function printComponentInfo(base, qianzui) {
  if (base != null) {
    logger.info("[" + scriptName + "] bianliPrint." + qianzui + "=" + base);
    var children = null;
    try { children = base.getChildren(); } catch (e) { children = null; }
    if (children != null) {
      for (var i = 0; i < children.length; i++) {
        printComponentInfo(children[i], qianzui + (i + 1));
      }
    }
  }
}

/**
 * 在整个应用里查找 id 组件.
 * 
  var pushbutton = findComponentFromApp(appInstance, "1780382003239");
  logger.info("[" + scriptName + "] pushbutton=" + pushbutton);
  if (pushbutton) {
    logger.info("[" + scriptName + "] pushbutton=" + pushbutton.getClass());
    // pushbutton.render()
    // pushbutton.sigOptionCheckForLookups();
    // pushbutton.setProperty("label", "213");
  }
 * 
 * 采用与 printComponentInfo 相同的遍历范围(已验证能覆盖所有组件):
 *   1) appBean.getCreator() 子树;
 *   2) 遍历 getPageStack() 里每个 page, 对 page.getDataBean().getCreator() 子树.
 * 每个 creator 子树用 findComponentByCompId 递归匹配 xml中的组件id, 找到即返回.
 * @param {any} appInstance AppInstance
 * @param {string} compId   组件 id (如 "main")
 * @return {any} 找到的组件, 找不到返回 null
 */
function findComponentFromApp(appInstance, compId) {
  if (appInstance == null) {
    return null;
  }
  // 1) appBean.getCreator() 子树
  var appBean = null;
  try { appBean = appInstance.getAppBean(); } catch (eb) { appBean = null; }
  var appCreator = null;
  try { appCreator = appBean ? appBean.getCreator() : null; } catch (e0) { appCreator = null; }
  if (appCreator != null) {
    var found = findComponentByCompId(appCreator, compId);
    if (found != null) {
      return found;
    }
  }

  // 2) 遍历 pageStack, 对每个 page 的 DataBean.getCreator() 子树查找
  var pageStack = null;
  try { pageStack = appInstance.getPageStack(); } catch (e1) { pageStack = null; }
  if (pageStack != null) {
    var size = pageStack.size();
    for (var i = 0; i < size; i++) {
      /** @type {psdi.webclient.system.controller.PageInstance} */
      var page = pageStack.get(i);
      var pdb = null;
      try { pdb = page.getDataBean(); } catch (ed) { pdb = null; }
      if (pdb != null) {
        var creator = null;
        try { creator = pdb.getCreator(); } catch (ec) { creator = null; }
        if (creator != null) {
          var found2 = findComponentByCompId(creator, compId);
          if (found2 != null) {
            return found2;
          }
        }
      }
    }
  }
  return null;
}

/**
 * 从任意根节点(AppInstance/ControlInstance/ComponentInstance)递归查找
 * descriptor id 等于 compId 的组件.
 * 注意: AppInstance/PageInstance 本身没有 findComponentByDescriptorId 方法,
 * 只能靠 getChildren() 递归. 匹配的是设计态 id( XML 里的 id 属性 ),
 * 用 getDescriptor().getProperty("id") 取得, 而非 getId()(渲染态,可能带行标记).
 * @param {any} node 当前节点
 * @param {string} compId 要查找的 descriptor id (如 "results_showlist")
 * @return {any} 匹配到的组件, 找不到返回 null
 */
function findComponentByCompId(node, compId) {
  if (node == null) {
    return null;
  }
  // 判断当前节点是否匹配
  try {
    if (compId === node.getId()) {
      return node
    }
  } catch (ignored) { }

  // 递归子节点
  try {
    var children = node.getChildren ? node.getChildren() : null;
    if (children != null) {
      for (var i = 0; i < children.length; i++) {
        var found = findComponentByCompId(children[i], compId);
        if (found != null) {
          return found;
        }
      }
    }
  } catch (ignored2) { }
  return null;
}



/**
 * 清除字符串前后空格及特殊空白字符
 *
 * 除常规空白字符(空格/制表符/换行等)外，还会清除中文全角空格(\u3000)、
 * 不间断空格(\u00A0)等 Unicode 空白字符。
 *
 * 调用示例：
 *   var str = service.invokeScript("COMMON.UTILS", "trimAll", [rawStr]);
 *   var str = trimAll(mbo.getString("DESCRIPTION"));
 *
 * @param {string} str - 输入字符串
 * @returns {string} 清除前后空白后的字符串，null/undefined 返回空字符串
 */
function trimAll(str) {
  if (str === null || typeof str === "undefined") {
    return "";
  }
  return String(str).replace(/^[\s\u3000\u00A0\u2000-\u200A\u202F\u205F\uFEFF]+|[\s\u3000\u00A0\u2000-\u200A\u202F\u205F\uFEFF]+$/g, "");
}

