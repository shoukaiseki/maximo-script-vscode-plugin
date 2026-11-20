/**
 * SKS_COND_DEBUG_API - 条件表达式调试接口
 *
 * 用途:
 *   按 MBO 对象名 + 过滤条件取出唯一一条记录, 使用 Maximo PARSER 服务
 *   (psdi.common.parse.ParserServiceRemote, 工作流/签名选项条件表达式使用同一解析器)
 *   校验并执行条件表达式, 返回 TRUE/FALSE 与详细调试信息。
 *
 * 接口:
 *   POST /maximo/api/script/SKS_COND_DEBUG_API?_action=debug
 *        body: {
 *          mboName:    "WORKORDER",                    // 必填: MBO 对象名称
 *          mboWhere:   "wonum = '1000'",               // 必填: MboSet.setWhere 过滤条件
 *          expression: "status = 'APPR'",              // 必填: 条件表达式内容
 *          condType:   "WORKFLOW" | "SIGOPTION",       // 可选: 表达式类型, 默认 WORKFLOW
 *          parserType: "SYSTEM" | "CUSTOM",            // 可选: 解析器, 默认 SYSTEM
 *                                                      //   SYSTEM=Maximo PARSER 内存求值(无法输出 SQL)
 *                                                      //   CUSTOM=反射调用 ParserService.parseExpression 得到 TreeNode 求值,
 *                                                      //          解析/求值失败时与系统一样回退到 SqlFormat + MboSet.isEmpty,
 *                                                      //          输出语法树/字段值/SQL/结果日志
 *          fields:     "wonum,status,siteid",          // 可选: 附加输出字段(逗号分隔)
 *          maxRows:    10                              // 可选: 多条匹配时返回的候选条数, 默认 10
 *        }
 *        → {
 *            status: "success" | "error",
 *            data: {
 *              mboName, mboWhere, expression, condType, langcode,
 *              parserType,          // SYSTEM | CUSTOM
 *              nodeDataType,        // 表达式结果类型(0=BOOLEAN 1=STRING 2=NUMBER 3=DATE)
 *              nodeDataTypeName,    // 类型名称
 *              completeWhere,       // Maximo 实际使用的完整 where
 *              sqlWhere, sql,       // 自定义解析器生成的 where 与参考 SQL
 *              evalLog: [ ... ],    // 自定义解析器执行日志(解析/字段取值/子查询SQL/结果/耗时)
 *              sqlLog: [ ... ],     // 等同 evalLog(兼容旧前端)
 *              matchCount,          // 匹配记录数
 *              result: true|false,  // 表达式执行结果(matchCount=1 时)
 *              record: { ... },     // 唯一记录的字段快照(主键 + fields)
 *              recordKeyText,       // 主键拼接文本, 如 "wonum=1000,siteid=BEDFORD"
 *              candidates: [ ... ], // matchCount>1 时的候选记录(最多 maxRows 条)
 *              timing: { countMs, parseMs, evalMs, whereMs, totalMs },
 *              detail: { parser, zombieObject, parseOk, parseMessage, evalMessage, expressionNode }
 *            },
 *            message: "错误或提示信息",
 *            errorMessageTrace: "异常堆栈(error 时)"
 *          }
 *
 * 说明:
 *   1. 与工作流一致: 先用对象 Zombie Mbo 调 parser.parse(expression, zombie) 做语法校验,
 *      再调 parser.getBoolean(expression, mbo) 对真实记录求值。
 *   2. 过滤条件必须唯一定位一条记录; 0 条或多条均返回 status=error 并给出提示。
 *   3. _langcode=ZH 指定语言环境(影响多语言字段取值), _debug=true 返回 debugMsg。
 *
 * 官方参考实现(Maximo 工作流设计器 "测试表达式..." 按钮):
 *   <pushbutton label="测试表达式..." mxevent="expressionbuildereventinvalue" value="validateExpression">
 *   psdi.webclient.beans.wfdesign.WFExpBuilderBean
 *     -> psdi.webclient.beans.common.ExpressionBuilderBean#expressionbuildereventinvalue
 *     -> ExpressionBuilderBean#setExpressionValue -> ExpressionBuilder#validateExpression
 *     -> psdi.common.expbuilder.ExpressionBuilder#validateWithWFParser:
 *          ParserServiceRemote parser = (ParserServiceRemote) MXServer.getMXServer().lookup("PARSER");
 *          MboSetRemote set = mboServer.getMboSet(expobject, userInfo);
 *          parser.parse(usersql, set.getZombie());
 *   本脚本与官方一致使用 PARSER.parse(expression, zombie) 校验;
 *   区别: 官方仅校验, 本脚本继续用实际记录 parser.getBoolean(expression, mbo) 求值。
 */
// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />

/** @type {psdi.util.MXApplicationException} */
var MXApplicationException = Java.type("psdi.util.MXApplicationException");
/** @type {psdi.server.MXServer} */
var MXServer = Java.type("psdi.server.MXServer");

/** @type {java.lang.System} */
var System = Java.type("java.lang.System");

var scriptName = service.getScriptName();
var svc = service;
var mxserver = MXServer.getMXServer();
// 字段类型缓存(对象名.字段名 → MAXTYPE), 用于按 Maximo 字段类型做比较
var fieldTypeCache = {};
var fieldTypeDebug = "";
var NUMERIC_MAX_TYPES = "YORN,INTEGER,DECIMAL,FLOAT,AMOUNT,DURATION,SMALLINT,BIGINT";
var DATE_MAX_TYPES = "DATE,DATETIME,TIME";

/** @type {psdi.util.logging.MXLogger} */
var loggerMX = Java.type("psdi.util.logging.MXLoggerFactory").getLogger("maximo.script." + scriptName);
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils = null;
try {
  sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
} catch (ignored) { }
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils ? sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true }) : loggerMX;
logger.info("[" + scriptName + "]----------Starting execution of script");

// 语言环境(影响多语言字段取值)
var _langcode = "EN";
if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
  _langcode = String(request.getQueryParam("_langcode")).toUpperCase();
  userInfo.setLangCode(_langcode);
}

/** @type {java.lang.StringBuilder} */
var StringBuilder = Java.type("java.lang.StringBuilder");
var debugMsg = new StringBuilder();
var paramDebug = request.getQueryParam("_debug") === 'true';

// 多条匹配时默认返回的候选记录数
var DEFAULT_MAX_ROWS = 10;

main();
function main() {
  try {
    if (Java.type("psdi.iface.mic.MicUtil").getAdminModeState()) {
      throw new MXApplicationException("ibm_system", "AdminOnThis");
    }
    var data = process();
    var resData = {
      status: data.status,
      data: data.data,
      message: data.message
    };
    if (paramDebug) {
      resData.debugMsg = debugMsg.toString();
    }
    responseBody = JSON.stringify(resData);
  } catch (error) {
    logger.error(">>> [API ERROR] 全局捕获异常:", error);
    var errorMessage = "error";
    var errorMessageTrace = "";
    try {
      errorMessage = getErrorMessage(error);
    } catch (e) { /* ignore */ }
    try {
      errorMessageTrace = sksLogAnsiUtils.getErrorStackTrace(error);
    } catch (e) { /* ignore */ }
    var errorData = { status: "error", message: errorMessage, errorMessageTrace: errorMessageTrace };
    if (paramDebug) {
      errorData.debugMsg = debugMsg.toString();
    }
    responseBody = JSON.stringify(errorData);
  }
}

function process() {
  var action = qparam("_action");
  if (action !== null && action !== "debug") {
    throw new MXApplicationException("#", "未知 _action: " + action + " (可用: debug)");
  }
  var body = parseRequestBody();
  var job = {
    mboName: trim(body.mboName || qparam("mboName")),
    mboWhere: trim(body.mboWhere || body.where || qparam("mboWhere")),
    expression: trim(body.expression || qparam("expression")),
    condType: String(body.condType || qparam("condType") || "WORKFLOW").toUpperCase(),
    parserType: String(body.parserType || qparam("parserType") || "SYSTEM").toUpperCase(),
    fields: trim(body.fields || qparam("fields")),
    maxRows: toInt(body.maxRows || qparam("maxRows"), DEFAULT_MAX_ROWS),
    sqlCheck: toBool(body._sqlCheck !== undefined ? body._sqlCheck : qparam("_sqlCheck"))
  };
  if (job.mboName === "") {
    throw new MXApplicationException("#", "mboName(MBO 对象名称) 不能为空");
  }
  if (job.mboWhere === "") {
    throw new MXApplicationException("#", "mboWhere(MBO 记录过滤条件) 不能为空");
  }
  if (job.expression === "") {
    throw new MXApplicationException("#", "expression(条件表达式内容) 不能为空");
  }
  if (job.maxRows <= 0) {
    job.maxRows = DEFAULT_MAX_ROWS;
  }
  if (job.parserType !== "SYSTEM" && job.parserType !== "CUSTOM") {
    throw new MXApplicationException("#", "parserType 仅支持 SYSTEM(系统解析器) 或 CUSTOM(自定义SQL解析器)");
  }
  logger.info("[" + scriptName + "] debug mboName=" + job.mboName + ", where=" + job.mboWhere
    + ", condType=" + job.condType + ", expression=" + job.expression);

  var startMs = System.currentTimeMillis();
  var mboSet = null;
  try {
    mboSet = openMboSet(job);
    // 诊断: Maximo 实际使用的完整 where(含安全/应用等隐式条件)
    var whereStart = System.currentTimeMillis();
    var completeWhere = "";
    try {
      completeWhere = String(mboSet.getCompleteWhere() || "");
    } catch (e) {
      completeWhere = "";
    }
    var whereMs = System.currentTimeMillis() - whereStart;
    var countStart = System.currentTimeMillis();
    var matchCount = mboSet.count();
    var countMs = System.currentTimeMillis() - countStart;
    debugPrint("对象 " + job.mboName + " 过滤条件 [" + job.mboWhere + "] 匹配记录数 = " + matchCount);
    debugPrint("完整 where = " + completeWhere);

    if (matchCount <= 0) {
      return {
        status: "error",
        message: "未匹配到记录: 对象 " + job.mboName + " 在条件 [" + job.mboWhere + "] 下没有数据, 请检查过滤条件",
        data: buildBaseData(job, matchCount, countMs, startMs, completeWhere, whereMs)
      };
    }

    // 多条匹配: 返回候选记录, 提示缩小过滤条件
    if (matchCount > 1) {
      var candidates = [];
      var limit = Math.min(matchCount, job.maxRows);
      for (var i = 0; i < limit; i++) {
        candidates.push(recordSummary(mboSet, mboSet.getMbo(i), job.fields));
      }
      debugPrint("匹配到多条记录, 已返回前 " + limit + " 条候选");
      var multiData = buildBaseData(job, matchCount, countMs, startMs, completeWhere, whereMs);
      multiData.candidates = candidates;
      return {
        status: "error",
        message: "匹配到 " + matchCount + " 条记录, 无法确定唯一记录, 请细化过滤条件(如增加主键条件)",
        data: multiData
      };
    }

    var mbo = mboSet.getMbo(0);
    var detail = {
      parser: "psdi.common.parse.ParserServiceRemote(PARSER)",
      validateMode: "WF_PARSER",
      resultSource: "SYSTEM_PARSER",
      resultSourceText: "PARSER.getBoolean (内部优先 TreeNode, 异常时回退 SqlFormat+SQL)",
      expressionBuilderRef: "WFExpBuilderBean#validateExpression -> ExpressionBuilder#validateWithWFParser",
      zombieObject: job.mboName,
      parseOk: false,
      parseMessage: "",
      evalMessage: "",
      expressionNode: job.expression
    };
    var data = buildBaseData(job, matchCount, countMs, startMs, completeWhere, whereMs);
    data.record = recordSummary(mboSet, mbo, job.fields);
    data.recordKeyText = keyText(mboSet, data.record);

    // ===== 自定义解析器: 仿 Maximo 语法自研求值, 输出执行日志 =====
    if (job.parserType === "CUSTOM") {
      var customStart = System.currentTimeMillis();
      var evalLog = [];
      var logStep = function (msg) {
        var line = "[" + (System.currentTimeMillis() - customStart) + "ms] " + msg;
        evalLog.push(line);
        try {
          logger.info("[SKS_COND_DEBUG_API][CUSTOM] " + msg);
        } catch (ignoredLog) { }
      };
      detail.parser = "psdi.common.parse.ParserService";
      detail.validateMode = "CUSTOM_TREE_NODE";
      detail.resultSource = "TREE_NODE";
      detail.resultSourceText = "TreeNode.getBoolean(mbo) 内存求值";
      detail.expressionBuilderRef = "ParserService#parseExpression(反射) -> TreeNode#getBoolean; 解析失败时与 getBoolean 一样走 SqlFormat SQL 回退";
      var customParser = mxserver.lookup("PARSER");
      detail.parser = customParser.getClass().getName();

      // 1) 先输出表达式引用的 :字段 实际取值
      var bindNames = [];
      var bindRegex = /:([A-Za-z][A-Za-z0-9_]*)/g;
      var bindMatch;
      while ((bindMatch = bindRegex.exec(job.expression)) !== null) {
        var bindName = bindMatch[1];
        var seenBind = false;
        for (var b = 0; b < bindNames.length; b++) {
          if (bindNames[b].toUpperCase() === bindName.toUpperCase()) {
            seenBind = true;
            break;
          }
        }
        if (!seenBind) {
          bindNames.push(bindName);
        }
      }
      for (var bi = 0; bi < bindNames.length; bi++) {
        try {
          var bindValue = mbo.getString(bindNames[bi]);
          logStep("字段 :" + bindNames[bi] + " = "
            + (bindValue === null || bindValue === "" ? "NULL" : "'" + bindValue + "'")
            + " [" + (getFieldType(mbo, bindNames[bi]) || "?") + "]");
        } catch (bindError) {
          logStep("字段 :" + bindNames[bi] + " 取值失败: " + stripHashPrefix(getErrorMessage(bindError)));
        }
      }

      var tree = null;
      var customResult = null;
      var viaSqlFallback = false;

      // 2) 反射调用 ParserService.parseExpression, 与 parser.parse() 使用完全相同的类加载器和语法
      try {
        var declaredMethods = customParser.getClass().getDeclaredMethods();
        var parseMethod = null;
        for (var mi = 0; mi < declaredMethods.length; mi++) {
          if (String(declaredMethods[mi].getName()) === "parseExpression"
            && declaredMethods[mi].getParameterTypes().length === 1) {
            parseMethod = declaredMethods[mi];
            break;
          }
        }
        if (!parseMethod) {
          throw new MXApplicationException("#", "未找到 ParserService.parseExpression 方法");
        }
        parseMethod.setAccessible(true);
        tree = parseMethod.invoke(customParser, job.expression);
        detail.parseOk = true;
        detail.parseMessage = "表达式解析成功";
        logStep("解析表达式成功(ParserService.parseExpression): " + job.expression);
      } catch (convError) {
        var convCause = null;
        try {
          convCause = convError.getCause ? convError.getCause() : null;
        } catch (ignoredCause) { }
        var isParseException = String(convError.getClass().getName()) === "psdi.common.parse.ParseException"
          || (convCause && String(convCause.getClass().getName()) === "psdi.common.parse.ParseException");
        if (!isParseException) {
          var convMessage = getErrorMessage(convError) || "";
          if (convCause) {
            convMessage += " -> " + convCause.getClass().getName() + ": " + getErrorMessage(convCause);
          }
          detail.parseMessage = stripHashPrefix(convMessage);
          logStep("解析表达式失败: " + detail.parseMessage);
          data.evalLog = evalLog;
          data.sqlLog = evalLog;
          data.timing = buildTiming(countMs, 0, 0, startMs, whereMs);
          data.detail = detail;
          return {
            status: "error",
            message: "自定义解析器解析表达式失败: " + detail.parseMessage,
            data: data
          };
        }

        // 3) 与 ParserService.getBoolean 的 catch 分支一致: SqlFormat 转 SQL 后按 MboSet 是否为空判定
        try {
          var sqlFallback = evaluateBySqlFormat(mbo, customParser, job.expression, logStep, job.sqlCheck);
          customResult = sqlFallback.result;
          viaSqlFallback = true;
          detail.parseOk = true;
          detail.parseMessage = "ParseExpression 不支持该表达式, 已使用 SqlFormat SQL 回退";
          detail.validateMode = "CUSTOM_SQL_FALLBACK";
          detail.resultSource = "SQL_FALLBACK";
          detail.resultSourceText = sqlFallback.queryTarget === "DUMMY_TABLE"
            ? "SqlFormat + DUMMY_TABLE.count 判定"
            : (sqlFallback.queryTarget === "DUMMY_TABLE(exists)"
              ? "SqlFormat + DUMMY_TABLE exists 判定"
              : "SqlFormat + MboSet.isEmpty (SQL 查询 " + sqlFallback.queryTarget + ")");
          data.sqlWhere = sqlFallback.where;
          data.sql = sqlFallback.executedSql;
          logStep("回退执行 SQL: " + data.sql);
          data.nodeDataType = 0;
          data.nodeDataTypeName = nodeDataTypeName(0);
          detail.nodeDataType = 0;
          detail.nodeDataTypeName = data.nodeDataTypeName;
          logStep("结果类型: " + data.nodeDataTypeName + " (0)");
        } catch (fallbackError) {
          detail.resultSource = "SQL_FALLBACK_FAILED";
          detail.resultSourceText = "SqlFormat SQL 回退失败: " + getErrorMessage(fallbackError);
          detail.parseMessage = stripHashPrefix("ParseExpression: " + getErrorMessage(convCause || convError)
            + "; SqlFormat 回退失败: " + getErrorMessage(fallbackError));
          logStep("SQL 回退失败: " + detail.parseMessage);
          data.sql = fallbackError.sql || "";
          if (data.sql) {
            logStep("回退失败, 待执行 SQL: " + data.sql);
          }
          data.evalLog = evalLog;
          data.sqlLog = evalLog;
          data.timing = buildTiming(countMs, 0, System.currentTimeMillis() - customStart, startMs, whereMs);
          data.detail = detail;
          return {
            status: "error",
            message: "自定义解析器解析表达式失败: " + detail.parseMessage + " (可切换为系统解析器)",
            data: data
          };
        }
      }

      if (!viaSqlFallback) {
        // 4) 语法树与结果类型
        try {
          var treeText = String(tree.toString());
          logStep("语法树:\n" + (treeText.length > 4000 ? treeText.substring(0, 4000) + "..." : treeText));
        } catch (ignoredTreeLog) { }
        var treeType = null;
        var treeTypeMessage = "";
        try {
          treeType = tree.getNodeDataType(mbo);
        } catch (typeWithMboError) {
          treeTypeMessage = stripHashPrefix(getErrorMessage(typeWithMboError));
          try {
            treeType = tree.getNodeDataType();
          } catch (typeError2) { treeType = null; }
        }
        if (treeType === null) {
          treeType = 0;
        }
        data.nodeDataType = treeType;
        data.nodeDataTypeName = nodeDataTypeName(treeType);
        detail.nodeDataType = treeType;
        detail.nodeDataTypeName = data.nodeDataTypeName;
        if (treeTypeMessage) {
          detail.nodeDataTypeMessage = treeTypeMessage;
        }
        logStep("结果类型: " + data.nodeDataTypeName + " (" + treeType + ")");

        // 5) 参考 SQL(仅当自研解析器也能解析时生成, 不参与求值)
        try {
          var refAst = parseCustomExpression(job.expression);
          var tableName = getObjectTableName(mboSet);
          var sqlWhere = astToSql(refAst, mbo);
          detail.expressionNode = sqlWhere;
          data.sqlWhere = sqlWhere;
          data.sql = "SELECT COUNT(*) FROM " + (tableName || job.mboName)
            + " WHERE (" + job.mboWhere + ") AND (" + sqlWhere + ")";
          logStep("参考 SQL(自研解析器生成, 不参与求值): " + data.sql);
        } catch (refSqlError) {
          logStep("跳过参考 SQL: " + stripHashPrefix(getErrorMessage(refSqlError)));
        }

        // 6) 使用 Maximo TreeNode 求值, 与 ParserService.getBoolean 完全一致
        try {
          customResult = tree.getBoolean(mbo);
          logStep("求值方式: TreeNode.getBoolean(mbo) 内存求值");
        } catch (evalError) {
          var treeEvalMessage = stripHashPrefix(getErrorMessage(evalError));
          logStep("TreeNode 求值失败: " + treeEvalMessage + ", 尝试 SqlFormat SQL 回退");
          try {
            var evalSqlFallback = evaluateBySqlFormat(mbo, customParser, job.expression, logStep, job.sqlCheck);
            customResult = evalSqlFallback.result;
            detail.validateMode = "CUSTOM_TREE_EVAL_SQL_FALLBACK";
            detail.resultSource = "TREE_EVAL_SQL_FALLBACK";
            detail.resultSourceText = evalSqlFallback.queryTarget === "DUMMY_TABLE"
              ? "TreeNode 求值异常 -> SqlFormat + DUMMY_TABLE.count 判定"
              : (evalSqlFallback.queryTarget === "DUMMY_TABLE(exists)"
                ? "TreeNode 求值异常 -> SqlFormat + DUMMY_TABLE exists 判定"
                : "TreeNode 求值异常 -> SqlFormat + MboSet.isEmpty (SQL 查询 " + evalSqlFallback.queryTarget + ")");
            data.sqlWhere = evalSqlFallback.where;
            data.sql = evalSqlFallback.executedSql;
            logStep("回退执行 SQL: " + data.sql);
            data.nodeDataType = 0;
            data.nodeDataTypeName = nodeDataTypeName(0);
            detail.nodeDataType = 0;
            detail.nodeDataTypeName = data.nodeDataTypeName;
            detail.evalMessage = "TreeNode 求值失败, SQL 回退结果=" + customResult;
            logStep("结果类型: " + data.nodeDataTypeName + " (0)");
          } catch (fallbackError) {
            detail.resultSource = "TREE_EVAL_SQL_FALLBACK_FAILED";
            detail.resultSourceText = "TreeNode 求值异常且 SqlFormat 回退失败: " + getErrorMessage(fallbackError);
            detail.evalMessage = treeEvalMessage + "; SqlFormat 回退失败: " + getErrorMessage(fallbackError);
            logStep("求值失败: " + detail.evalMessage);
            data.sql = fallbackError.sql || "";
            if (data.sql) {
              logStep("回退失败, 待执行 SQL: " + data.sql);
            }
            data.evalLog = evalLog;
            data.sqlLog = evalLog;
            data.timing = buildTiming(countMs, 0, System.currentTimeMillis() - customStart, startMs, whereMs);
            data.detail = detail;
            return {
              status: "error",
              message: "自定义解析器求值失败: " + detail.evalMessage,
              data: data
            };
          }
        }
      }

      detail.memResult = customResult;
      detail.evalMessage = "求值结果=" + customResult;
      logStep("完成: 表达式结果 = " + customResult);

      var customEvalMs = System.currentTimeMillis() - customStart;
      data.result = customResult === true;
      data.evalLog = evalLog;
      data.sqlLog = evalLog;
      data.timing = buildTiming(countMs, 0, customEvalMs, startMs, whereMs);
      data.detail = detail;
      return { status: "success", message: "Script executed successfully", data: data };
    }

    // 1) 语法校验: 与工作流 validateCondition 一致, 用 Zombie Mbo 校验对象字段
    var parser;
    try {
      parser = mxserver.lookup("PARSER");
    } catch (e) {
      throw new MXApplicationException("#", "无法获取 Maximo PARSER 服务: " + getErrorMessage(e));
    }
    detail.parser = parser.getClass().getName();
    var parseStart = System.currentTimeMillis();
    try {
      parser.parse(job.expression, mboSet.getZombie());
      detail.parseOk = true;
    } catch (parseError) {
      detail.parseMessage = getErrorMessage(parseError);
    }
    var parseMs = System.currentTimeMillis() - parseStart;
    if (!detail.parseOk) {
      detail.parseMessage = detail.parseMessage || "表达式语法校验失败";
      data.timing = buildTiming(countMs, parseMs, 0, startMs);
      data.detail = detail;
      return {
        status: "error",
        message: "条件表达式解析失败: " + detail.parseMessage,
        data: data
      };
    }

    // 表达式结果数据类型(与 ParserService.getNodeDataType 一致, 0=BOOLEAN)
    try {
      var nodeDataType = parser.getNodeDataType(job.expression, mbo);
      data.nodeDataType = nodeDataType;
      data.nodeDataTypeName = nodeDataTypeName(nodeDataType);
      detail.nodeDataType = nodeDataType;
      detail.nodeDataTypeName = data.nodeDataTypeName;
    } catch (typeError) {
      var exprText = String(job.expression).replace(/^\s+|\s+$/g, "").toLowerCase();
      if (exprText === "true" || exprText === "false") {
        data.nodeDataType = 0;
        data.nodeDataTypeName = nodeDataTypeName(0);
        detail.nodeDataType = 0;
        detail.nodeDataTypeName = data.nodeDataTypeName;
      } else {
        // 系统 getNodeDataType 对子查询(select count...)会解析失败, 但 parse() 已通过;
        // 用自研解析器兜底推断(条件表达式结果均为 BOOLEAN)
        var inferredType = null;
        try {
          parseCustomExpression(job.expression);
          inferredType = 0;
        } catch (ignoredInfer) { }
        if (inferredType !== null) {
          data.nodeDataType = inferredType;
          data.nodeDataTypeName = nodeDataTypeName(inferredType);
          detail.nodeDataType = inferredType;
          detail.nodeDataTypeName = data.nodeDataTypeName;
          detail.nodeDataTypeSource = "CUSTOM_INFER";
          detail.nodeDataTypeMessage = getErrorMessage(typeError);
        } else {
          detail.nodeDataTypeError = getErrorMessage(typeError);
        }
      }
    }

    // 2) 执行表达式: 与工作流 evaluateCondition 一致, ParserService.getBoolean(expr, mbo)
    var evalStart = System.currentTimeMillis();
    var result;
    try {
      result = parser.getBoolean(job.expression, mbo);
    } catch (evalError) {
      detail.evalMessage = getErrorMessage(evalError);
      data.timing = buildTiming(countMs, parseMs, System.currentTimeMillis() - evalStart, startMs);
      data.detail = detail;
      return {
        status: "error",
        message: "条件表达式执行失败: " + detail.evalMessage,
        data: data
      };
    }
    var evalMs = System.currentTimeMillis() - evalStart;
    debugPrint("表达式执行结果 = " + result + ", 耗时 " + evalMs + "ms");

    data.result = result;
    data.timing = buildTiming(countMs, parseMs, evalMs, startMs);
    data.detail = detail;
    return { status: "success", message: "Script executed successfully", data: data };
  } finally {
    _close(mboSet);
  }
}

function buildBaseData(job, matchCount, countMs, startMs, completeWhere, whereMs) {
  return {
    mboName: job.mboName,
    mboWhere: job.mboWhere,
    completeWhere: completeWhere || "",
    expression: job.expression,
    condType: job.condType,
    parserType: job.parserType,
    langcode: _langcode,
    matchCount: matchCount,
    result: null,
    sqlWhere: "",
    sql: "",
    sqlLog: [],
    timing: buildTiming(countMs, 0, 0, startMs, whereMs)
  };
}

function buildTiming(countMs, parseMs, evalMs, startMs, whereMs) {
  return {
    countMs: countMs,
    parseMs: parseMs,
    evalMs: evalMs,
    whereMs: whereMs || 0,
    totalMs: System.currentTimeMillis() - startMs
  };
}

/**
 * 自定义解析器(仿 Maximo 表达式语法): 递归下降解析为 AST。
 * 支持: and/or/not、= != <> > >= < <=、like/not like、in/not in、is [not] null、
 *       [not] between、括号、字符串/数字/true/false、字段名。
 * 不支持: 函数、关系字段、变量等, 遇到时抛出明确错误。
 */
function parseCustomExpression(expr) {
  var tokens = tokenizeExpression(expr);
  if (tokens.length === 0) {
    throw new MXApplicationException("#", "表达式为空");
  }
  var pos = { i: 0 };
  var ast = parseOrExpr(tokens, pos);
  if (pos.i < tokens.length) {
    throw new MXApplicationException("#", "表达式存在无法识别的内容: " + tokens[pos.i].value);
  }
  return ast;
}

function customErr(msg) {
  return new MXApplicationException("#", msg);
}

function peekToken(tokens, pos) {
  return pos.i < tokens.length ? tokens[pos.i] : null;
}

function isWordToken(tk, word) {
  return !!tk && tk.type === "word" && tk.value.toUpperCase() === word;
}

function isPuncToken(tk, value) {
  return !!tk && tk.type === "punc" && tk.value === value;
}

function expectWordToken(tokens, pos, word) {
  if (!isWordToken(peekToken(tokens, pos), word)) {
    throw customErr("缺少关键字 " + word);
  }
  pos.i++;
}

function expectPuncToken(tokens, pos, value) {
  if (!isPuncToken(peekToken(tokens, pos), value)) {
    throw customErr("缺少符号 " + value);
  }
  pos.i++;
}

function parseOrExpr(tokens, pos) {
  var left = parseAndExpr(tokens, pos);
  while (isWordToken(peekToken(tokens, pos), "OR")) {
    pos.i++;
    left = { type: "or", left: left, right: parseAndExpr(tokens, pos) };
  }
  return left;
}

function parseAndExpr(tokens, pos) {
  var left = parseNotExpr(tokens, pos);
  while (isWordToken(peekToken(tokens, pos), "AND")) {
    pos.i++;
    left = { type: "and", left: left, right: parseNotExpr(tokens, pos) };
  }
  return left;
}

function parseNotExpr(tokens, pos) {
  if (isWordToken(peekToken(tokens, pos), "NOT")) {
    pos.i++;
    return { type: "not", expr: parseNotExpr(tokens, pos) };
  }
  return parseCondition(tokens, pos);
}

function parseCondition(tokens, pos) {
  var tk = peekToken(tokens, pos);
  if (isPuncToken(tk, "(") && !isWordToken(tokens[pos.i + 1], "SELECT")) {
    pos.i++;
    var inner = parseOrExpr(tokens, pos);
    expectPuncToken(tokens, pos, ")");
    return inner;
  }
  var left = parseOperand(tokens, pos);
  var opTk = peekToken(tokens, pos);
  if (!opTk || isPuncToken(opTk, ")") || isWordToken(opTk, "AND") || isWordToken(opTk, "OR")) {
    if (left.kind === "bool") {
      return { type: "boolconst", value: left.value };
    }
    throw customErr("条件缺少比较运算符");
  }
  if (opTk.type === "op") {
    pos.i++;
    return { type: "compare", op: opTk.value, left: left, right: parseOperand(tokens, pos) };
  }
  if (isWordToken(opTk, "LIKE")) {
    pos.i++;
    return { type: "like", not: false, left: left, pattern: parseOperand(tokens, pos) };
  }
  if (isWordToken(opTk, "IN")) {
    pos.i++;
    return parseInCondition(tokens, pos, left, false);
  }
  if (isWordToken(opTk, "BETWEEN")) {
    pos.i++;
    return parseBetweenCondition(tokens, pos, left, false);
  }
  if (isWordToken(opTk, "IS")) {
    pos.i++;
    var notNull = false;
    if (isWordToken(peekToken(tokens, pos), "NOT")) {
      notNull = true;
      pos.i++;
    }
    expectWordToken(tokens, pos, "NULL");
    return { type: "isnull", not: notNull, operand: left };
  }
  if (isWordToken(opTk, "NOT")) {
    pos.i++;
    if (isWordToken(peekToken(tokens, pos), "LIKE")) {
      pos.i++;
      return { type: "like", not: true, left: left, pattern: parseOperand(tokens, pos) };
    }
    if (isWordToken(peekToken(tokens, pos), "IN")) {
      pos.i++;
      return parseInCondition(tokens, pos, left, true);
    }
    if (isWordToken(peekToken(tokens, pos), "BETWEEN")) {
      pos.i++;
      return parseBetweenCondition(tokens, pos, left, true);
    }
    throw customErr("NOT 后仅支持 LIKE / IN / BETWEEN");
  }
  throw customErr("无法识别的比较方式: " + opTk.value);
}

function parseInCondition(tokens, pos, left, not) {
  expectPuncToken(tokens, pos, "(");
  var list = [];
  if (isPuncToken(peekToken(tokens, pos), ")")) {
    throw customErr("IN 列表不能为空");
  }
  while (true) {
    list.push(parseOperand(tokens, pos));
    if (isPuncToken(peekToken(tokens, pos), ",")) {
      pos.i++;
      continue;
    }
    break;
  }
  expectPuncToken(tokens, pos, ")");
  return { type: "in", not: not, left: left, list: list };
}

function parseBetweenCondition(tokens, pos, left, not) {
  var low = parseOperand(tokens, pos);
  expectWordToken(tokens, pos, "AND");
  var high = parseOperand(tokens, pos);
  return { type: "between", not: not, left: left, low: low, high: high };
}

function parseOperand(tokens, pos) {
  var tk = peekToken(tokens, pos);
  if (!tk) {
    throw customErr("缺少操作数");
  }
  if (isPuncToken(tk, "(") && isWordToken(tokens[pos.i + 1], "SELECT")) {
    return parseSubquery(tokens, pos);
  }
  if (tk.type === "str") {
    pos.i++;
    return { kind: "str", value: tk.value };
  }
  if (tk.type === "num") {
    pos.i++;
    return { kind: "num", value: tk.value };
  }
  if (tk.type === "word") {
    var w = tk.value.toUpperCase();
    if (w === "TRUE" || w === "FALSE") {
      pos.i++;
      return { kind: "bool", value: w === "TRUE" };
    }
    if (w === "NULL") {
      throw customErr("NULL 仅用于 IS NULL 判断");
    }
    if (isPuncToken(tokens[pos.i + 1], "(")) {
      throw customErr("自定义解析器不支持函数调用: " + tk.value + "()");
    }
    pos.i++;
    return { kind: "field", name: tk.value, bind: !!tk.bind };
  }
  throw customErr("无法识别的操作数: " + tk.value);
}

/**
 * 子查询: (select count(1|*) from 对象 [where 条件])
 */
function parseSubquery(tokens, pos) {
  expectPuncToken(tokens, pos, "(");
  expectWordToken(tokens, pos, "SELECT");
  if (!isWordToken(peekToken(tokens, pos), "COUNT")) {
    throw customErr("子查询仅支持 select count(...)");
  }
  pos.i++;
  expectPuncToken(tokens, pos, "(");
  var arg = peekToken(tokens, pos);
  if (!arg || !(isPuncToken(arg, "*") || arg.type === "num" || arg.type === "word")) {
    throw customErr("count() 参数不合法");
  }
  pos.i++;
  expectPuncToken(tokens, pos, ")");
  expectWordToken(tokens, pos, "FROM");
  var objTk = peekToken(tokens, pos);
  if (!objTk || objTk.type !== "word") {
    throw customErr("子查询缺少对象/表名");
  }
  pos.i++;
  var whereAst = null;
  if (isWordToken(peekToken(tokens, pos), "WHERE")) {
    pos.i++;
    whereAst = parseOrExpr(tokens, pos);
  }
  expectPuncToken(tokens, pos, ")");
  return { kind: "subquery", object: objTk.value, whereAst: whereAst };
}

/**
 * AST 转 SQL where
 */
function astToSql(node, mbo) {
  var sql;
  if (node.type === "or") {
    sql = "(" + astToSql(node.left, mbo) + " OR " + astToSql(node.right, mbo) + ")";
  } else if (node.type === "and") {
    sql = "(" + astToSql(node.left, mbo) + " AND " + astToSql(node.right, mbo) + ")";
  } else if (node.type === "not") {
    sql = "NOT (" + astToSql(node.expr, mbo) + ")";
  } else if (node.type === "compare") {
    sql = operandToSql(node.left, mbo) + " " + node.op + " " + operandToSql(node.right, mbo);
  } else if (node.type === "like") {
    sql = operandToSql(node.left, mbo) + (node.not ? " NOT LIKE " : " LIKE ") + operandToSql(node.pattern, mbo);
  } else if (node.type === "in") {
    var items = [];
    for (var i = 0; i < node.list.length; i++) {
      items.push(operandToSql(node.list[i], mbo));
    }
    sql = operandToSql(node.left, mbo) + (node.not ? " NOT IN (" : " IN (") + items.join(", ") + ")";
  } else if (node.type === "isnull") {
    sql = operandToSql(node.operand, mbo) + (node.not ? " IS NOT NULL" : " IS NULL");
  } else if (node.type === "between") {
    sql = operandToSql(node.left, mbo) + (node.not ? " NOT BETWEEN " : " BETWEEN ")
      + operandToSql(node.low, mbo) + " AND " + operandToSql(node.high, mbo);
  } else {
    throw customErr("未知的表达式节点: " + node.type);
  }
  return sql;
}

function operandToSql(op, mbo) {
  if (op.kind === "str") {
    return op.value;
  }
  if (op.kind === "num") {
    return op.value;
  }
  if (op.kind === "bool") {
    return op.value ? "1=1" : "1=0";
  }
  if (op.kind === "subquery") {
    var subWhere = op.whereAst ? astToSql(op.whereAst, mbo) : "";
    return "(SELECT COUNT(*) FROM " + op.object + (subWhere ? " WHERE " + subWhere : "") + ")";
  }
  if (op.bind && mbo) {
    var value;
    try {
      value = mbo.getString(op.name);
    } catch (ignoredBind) {
      value = null;
    }
    if (value === null || typeof value === "undefined") {
      return "NULL";
    }
    return "'" + String(value).replace(/'/g, "''") + "'";
  }
  return op.name;
}

/**
 * 按 Maximo 语义在内存中对 AST 求值(用于与 SQL 结果交叉校验)
 */
function evalAst(node, mbo, logFn) {
  if (node.type === "boolconst") {
    return node.value;
  }
  if (node.type === "or") {
    var orLeft = evalAst(node.left, mbo, logFn);
    if (orLeft) {
      return true;
    }
    return evalAst(node.right, mbo, logFn);
  }
  if (node.type === "and") {
    var andLeft = evalAst(node.left, mbo, logFn);
    if (!andLeft) {
      return false;
    }
    return evalAst(node.right, mbo, logFn);
  }
  if (node.type === "not") {
    return !evalAst(node.expr, mbo, logFn);
  }
  if (node.type === "compare") {
    return compareOperands(node.left, node.right, node.op, mbo, logFn);
  }
  if (node.type === "like") {
    var actual = toStringValue(node.left, mbo, logFn);
    var pattern = toStringValue(node.pattern, mbo, logFn);
    var regex = new RegExp("^" + escapeRegExp(pattern).replace(/%/g, ".*").replace(/_/g, ".") + "$");
    var matched = regex.test(actual);
    return node.not ? !matched : matched;
  }
  if (node.type === "in") {
    var found = false;
    for (var i = 0; i < node.list.length; i++) {
      if (compareOperands(node.left, node.list[i], "=", mbo, logFn)) {
        found = true;
        break;
      }
    }
    return node.not ? !found : found;
  }
  if (node.type === "isnull") {
    var isNull = isOperandNull(node.operand, mbo);
    return node.not ? !isNull : isNull;
  }
  if (node.type === "between") {
    var between = compareOperands(node.left, node.low, ">=", mbo, logFn)
      && compareOperands(node.left, node.high, "<=", mbo, logFn);
    return node.not ? !between : between;
  }
  throw customErr("未知的表达式节点: " + node.type);
}

/**
 * 字段类型缓存(对象名.字段名 → MAXTYPE), 用于按 Maximo 字段类型做比较
 */

function getFieldType(mbo, name) {
  var objectName = "";
  try {
    objectName = String(mbo.getThisMboSet().getMboSetInfo().getObjectName());
  } catch (ignoredObjName1) { }
  if (!objectName) {
    try {
      objectName = String(mbo.getThisMboSet().getName());
    } catch (ignoredObjName2) { }
  }
  if (!objectName) {
    try {
      objectName = String(mbo.getName());
    } catch (ignoredObjName3) { }
  }
  var key = objectName.toUpperCase() + "." + String(name).toUpperCase();
  if (typeof fieldTypeCache[key] !== "undefined") {
    return fieldTypeCache[key];
  }
  var type = "";
  var set = null;
  // 优先使用 MboSetInfo 元数据(不受 MAXATTRIBUTE 安全限制影响)
  try {
    var valueInfo = mbo.getThisMboSet().getMboSetInfo().getMboValueInfo(String(name));
    if (valueInfo) {
      try {
        type = String(valueInfo.getTypeAsString()).toUpperCase();
      } catch (ignoredTypeAsString) { }
      if (!type || type === "NULL" || type === "UNDEFINED") {
        try {
          type = String(valueInfo.getMaxType()).toUpperCase();
        } catch (ignoredMaxType) { }
      }
      if (!type || type === "NULL" || type === "UNDEFINED") {
        try {
          type = "TYPE_" + String(valueInfo.getType());
        } catch (ignoredType) { }
      }
    }
  } catch (ignoredValueInfo) {
    fieldTypeDebug = "getMboValueInfo失败:" + getErrorMessage(ignoredValueInfo);
  }
  if (!type) {
    try {
      set = mxserver.getMboSet("MAXATTRIBUTE", userInfo);
      set.setWhere("objectname = '" + objectName.replace(/'/g, "''")
        + "' and attributename = '" + String(name).replace(/'/g, "''") + "'");
      var attr = set.moveFirst();
      if (attr) {
        type = String(attr.getString("MAXTYPE")).toUpperCase();
      }
    } catch (ignoredType) {
      fieldTypeDebug = (fieldTypeDebug ? fieldTypeDebug + "; " : "") + "MAXATTRIBUTE失败:" + getErrorMessage(ignoredType);
    } finally {
      _close(set);
    }
  }
  fieldTypeDebug = (fieldTypeDebug ? fieldTypeDebug + "; " : "") + objectName + "." + name + "=" + (type || "?");
  fieldTypeCache[key] = type;
  return type;
}

function isNumericMaxType(type) {
  return !!type && NUMERIC_MAX_TYPES.indexOf(type) >= 0;
}

/** 用 MboUtils 取 MboSet 实际执行的 select 语句, 取不到返回空串 */
function getSelectStatementForMboSet(mboSet) {
  if (!mboSet) {
    return "";
  }
  try {
    var MboUtils = Java.type("psdi.mbo.MboUtils");
    var javaBoolean = Java.type("java.lang.Boolean");
    return String(MboUtils.getSelectStatementForMboSet(mboSet, javaBoolean.FALSE));
  } catch (ignored) {
    return "";
  }
}

/** 给异常附加待执行的 SQL, 便于回退失败时前端仍能显示 */
function wrapErrorWithSql(error, sql) {
  var message = getErrorMessage(error);
  return {
    message: message,
    sql: sql || "",
    getMessage: function () {
      return message;
    }
  };
}

/**
 * 与 ParserService.getBoolean 的异常回退一致:
 * 先用 DUMMY_TABLE 判定, 失败(SQL 引用了对象字段等)再回退到真实 MBO 对象
 * @returns {{result: boolean, where: string, queryTarget: string, executedSql: string}}
 */
function evaluateBySqlFormat(mbo, parser, expression, logStep, forceSqlCheck) {
  var SqlFormat = Java.type("psdi.mbo.SqlFormat");
  var sqlFormat = new SqlFormat(mbo, expression);
  sqlFormat.setRealNumericNulls(mbo.isZombie());
  var where = String(sqlFormat.format());
  var encounteredError = sqlFormat.getEncounteredError();
  if (encounteredError) {
    throw encounteredError;
  }
  // 与 ParserService 一致: mxe.condition.checksqlinjection=1/true 时开启 SQL 注入检查
  var checkProperty = String(mxserver.getProperty("mxe.condition.checksqlinjection"));
  var enableSqlCheck = checkProperty === "1" || checkProperty === "true" || forceSqlCheck === true;
  if (enableSqlCheck) {
    parser.checkSqlInjection(where);
  }
  if (logStep) {
    logStep("SqlFormat 生成 SQL(where): " + where);
    logStep("SQL 注入检查: " + (enableSqlCheck ? "开启" : "关闭"));
  }
  var fallbackSet = null;
  var result;
  var queryTarget = "";
  var executedSql = "";
  var attemptedSql = "";
  try {
    // 与 ParserService.getBoolean 一致: 先在 DUMMY_TABLE 上判定
    try {
      fallbackSet = mbo.getMboSet("SKS_CONDDUMMY_" + System.currentTimeMillis(), "DUMMY_TABLE", where);
      var dummyCount;
      if (enableSqlCheck) {
        // 开启检查时, 先取 select 语句, 再用 exists(...) 在 DUMMY_TABLE 上判定
        var selectStatement = getSelectStatementForMboSet(fallbackSet);
        var wrappedWhere = "exists (" + selectStatement + ")";
        if (logStep) {
          logStep("SQL 检查包装: " + wrappedWhere);
        }
        var wrappedSet = null;
        try {
          wrappedSet = mbo.getMboSet("SKS_CONDWRAP_" + System.currentTimeMillis(), "DUMMY_TABLE", wrappedWhere);
          attemptedSql = getSelectStatementForMboSet(wrappedSet);
          var wrappedCount = wrappedSet.count();
          result = wrappedCount > 0;
          queryTarget = "DUMMY_TABLE(exists)";
          executedSql = attemptedSql;
          if (logStep) {
            logStep("DUMMY_TABLE exists 判定: count=" + wrappedCount + " -> " + result);
          }
        } finally {
          _close(wrappedSet);
        }
      } else {
        attemptedSql = getSelectStatementForMboSet(fallbackSet);
        dummyCount = fallbackSet.count();
        result = dummyCount > 0;
        queryTarget = "DUMMY_TABLE";
        executedSql = attemptedSql;
        if (logStep) {
          logStep("DUMMY_TABLE 判定: count=" + dummyCount + " -> " + result);
        }
      }
    } catch (dummyError) {
      _close(fallbackSet);
      fallbackSet = null;
      if (logStep) {
        if (attemptedSql) {
          logStep("DUMMY_TABLE 执行 SQL: " + attemptedSql);
        }
        logStep("DUMMY_TABLE 不适用: " + (getErrorMessage(dummyError) || "")
          + ", 回退真实对象 " + mbo.getName());
      }
      fallbackSet = mbo.getMboSet("SKS_CONDCOND_" + System.currentTimeMillis(), mbo.getName(), where);
      result = !fallbackSet.isEmpty();
      queryTarget = mbo.getName();
      executedSql = getSelectStatementForMboSet(fallbackSet) || attemptedSql;
      if (logStep) {
        logStep("SQL 回退结果: " + result + " (MboSet.isEmpty, 对象 " + queryTarget + ")");
      }
    }
  } catch (fatalError) {
    // DUMMY_TABLE / 真实对象都失败时, 也把待执行 SQL 带回前端
    throw wrapErrorWithSql(fatalError, attemptedSql || ("select * from dummy_table where (" + where + ")"));
  } finally {
    _close(fallbackSet);
  }
  return { result: result, where: where, queryTarget: queryTarget, executedSql: executedSql };
}

/** ParserService.getNodeDataType 返回值 → 可读类型名(实测: 0=布尔 1=字符串 2=数字 3=日期) */
function nodeDataTypeName(code) {
  if (code === 0) {
    return "BOOLEAN";
  }
  if (code === 1) {
    return "STRING";
  }
  if (code === 2) {
    return "NUMBER";
  }
  if (code === 3) {
    return "DATE";
  }
  if (code === -1) {
    return "UNKNOWN";
  }
  return "TYPE_" + code;
}

function isDateMaxType(type) {
  return !!type && DATE_MAX_TYPES.indexOf(type) >= 0;
}

function operandLabel(op) {
  if (op.kind === "field") {
    return (op.bind ? ":" : "") + op.name;
  }
  if (op.kind === "subquery") {
    return "(子查询 " + op.object + ")";
  }
  return String(op.value);
}

function isOperandNull(op, mbo) {
  if (op.kind !== "field") {
    return false;
  }
  // 不能用 mbo.isNull: YORN 的 0 会被当作 null, 这里按字符串值是否为空判断
  var text = mbo.getString(op.name);
  return text === null || typeof text === "undefined" || String(text) === "";
}

function unquoteStringValue(op) {
  return String(op.value).substring(1, String(op.value).length - 1).replace(/''/g, "'");
}

/** 数字字面量按 Java double 字符串处理(与 ParserService 生成的 SQL 一致, 如 9006 → 9006.0) */
function numericLiteralToString(raw) {
  var n = parseFloat(raw);
  if (isNaN(n)) {
    return String(raw);
  }
  return n === Math.floor(n) ? n.toFixed(1) : String(n);
}

function toNumberValue(op, mbo, logFn) {
  if (op.kind === "subquery") {
    return evalSubquery(op, mbo, logFn);
  }
  if (op.kind === "num") {
    return parseFloat(op.value);
  }
  if (op.kind === "bool") {
    return op.value ? 1 : 0;
  }
  if (op.kind === "str") {
    var text = unquoteStringValue(op);
    if (!isNumericText(text)) {
      throw customErr("数值比较时出现非数字字符串: '" + text + "'");
    }
    return parseFloat(text);
  }
  var value = mbo.getDouble(op.name);
  if (logFn) {
    logFn("字段 " + operandLabel(op) + " = " + value);
  }
  return value;
}

function toDateValue(op, mbo, logFn) {
  if (op.kind === "str") {
    var ms = parseDateMs(unquoteStringValue(op));
    if (isNaN(ms)) {
      throw customErr("无法解析日期: " + unquoteStringValue(op));
    }
    return ms;
  }
  if (op.kind === "num" || op.kind === "bool") {
    throw customErr("日期字段不能与数字比较");
  }
  var date = mbo.getDate(op.name);
  var dateMs = date ? date.getTime() : NaN;
  if (logFn) {
    logFn("字段 " + operandLabel(op) + " = " + mbo.getString(op.name));
  }
  if (isNaN(dateMs)) {
    throw customErr("日期字段取值为空: " + operandLabel(op));
  }
  return dateMs;
}

function toStringValue(op, mbo, logFn) {
  if (op.kind === "str") {
    return unquoteStringValue(op);
  }
  if (op.kind === "num") {
    return numericLiteralToString(op.value);
  }
  if (op.kind === "bool") {
    return op.value ? "true" : "false";
  }
  if (op.kind === "subquery") {
    return String(evalSubquery(op, mbo, logFn));
  }
  var value = mbo.getString(op.name);
  value = value === null || typeof value === "undefined" ? "" : String(value);
  if (logFn) {
    logFn("字段 " + operandLabel(op) + " = '" + value + "'");
  }
  return value;
}

/** 解析 yyyy-MM-dd[ HH:mm:ss[.SSS]], 按服务器本地时区 */
function parseDateMs(text) {
  var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(String(text).trim());
  if (!m) {
    return NaN;
  }
  var ms = m[7] ? parseInt((m[7] + "00").substring(0, 3), 10) : 0;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10),
    parseInt(m[4] || "0", 10), parseInt(m[5] || "0", 10), parseInt(m[6] || "0", 10), ms).getTime();
}

/**
 * 比较两个操作数: 按字段类型选择 数值/日期/字符串 语义
 */
function compareOperands(left, right, op, mbo, logFn) {
  var leftType = left.kind === "field" ? getFieldType(mbo, left.name) : "";
  var rightType = right.kind === "field" ? getFieldType(mbo, right.name) : "";
  var hasField = left.kind === "field" || right.kind === "field";
  var mode;
  if (isNumericMaxType(leftType) || isNumericMaxType(rightType)
    || left.kind === "subquery" || right.kind === "subquery") {
    mode = "num";
  } else if (isDateMaxType(leftType) || isDateMaxType(rightType)) {
    mode = "date";
  } else if (!hasField) {
    mode = "num";
  } else {
    mode = "str";
  }

  if (logFn) {
    logFn("比较类型: " + operandLabel(left) + "=" + (leftType || "?")
      + ", " + operandLabel(right) + "=" + (rightType || "?") + ", 模式=" + mode
      + " (" + fieldTypeDebug + ")");
  }
  if (mode !== "str" && (isOperandNull(left, mbo) || isOperandNull(right, mbo))) {
    if (logFn) {
      logFn("比较 " + operandLabel(left) + " " + op + " " + operandLabel(right) + " → 字段为空, 结果 false");
    }
    return false;
  }
  if (mode === "num") {
    return compareNumbers(toNumberValue(left, mbo, logFn), toNumberValue(right, mbo, logFn), op);
  }
  if (mode === "date") {
    return compareNumbers(toDateValue(left, mbo, logFn), toDateValue(right, mbo, logFn), op);
  }
  return compareStrings(toStringValue(left, mbo, logFn), toStringValue(right, mbo, logFn), op);
}

function compareNumbers(a, b, op) {
  if (isNaN(a) || isNaN(b)) {
    return false;
  }
  if (op === "=") {
    return a === b;
  }
  if (op === "!=" || op === "<>") {
    return a !== b;
  }
  if (op === ">") {
    return a > b;
  }
  if (op === ">=") {
    return a >= b;
  }
  if (op === "<") {
    return a < b;
  }
  if (op === "<=") {
    return a <= b;
  }
  throw customErr("不支持的比较运算符: " + op);
}

function compareStrings(a, b, op) {
  if (op === "=") {
    return a === b;
  }
  if (op === "!=" || op === "<>") {
    return a !== b;
  }
  if (op === ">") {
    return a > b;
  }
  if (op === ">=") {
    return a >= b;
  }
  if (op === "<") {
    return a < b;
  }
  if (op === "<=") {
    return a <= b;
  }
  throw customErr("不支持的比较运算符: " + op);
}

/**
 * 执行子查询: 生成 where(冒号字段替换为当前记录的值) -> MboSet.count()
 */
function evalSubquery(op, mbo, logFn) {
  var whereSql = op.whereAst ? astToSql(op.whereAst, mbo) : "";
  var sql = "SELECT COUNT(*) FROM " + op.object + (whereSql ? " WHERE " + whereSql : "");
  var start = System.currentTimeMillis();
  var set = null;
  try {
    set = mxserver.getMboSet(op.object, userInfo);
    if (whereSql) {
      set.setWhere(whereSql);
    }
    var count = set.count();
    if (logFn) {
      logFn("执行 SQL: " + sql + " → " + count + " 条(" + (System.currentTimeMillis() - start) + "ms)");
    }
    return count;
  } catch (subError) {
    if (logFn) {
      logFn("子查询执行失败: " + sql + " → " + getErrorMessage(subError));
    }
    throw subError;
  } finally {
    _close(set);
  }
}

function isNumericText(value) {
  return /^[-+]?\d+(\.\d+)?$/.test(String(value).trim());
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 表达式词法分析
 */
function tokenizeExpression(expr) {
  var s = String(expr);
  var tokens = [];
  var i = 0;
  while (i < s.length) {
    var ch = s.charAt(i);
    var next = s.charAt(i + 1);
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      i++;
      continue;
    }
    if (ch === "(" || ch === ")" || ch === "," || ch === "*") {
      tokens.push({ type: "punc", value: ch });
      i++;
      continue;
    }
    // 冒号字段: :wonum / :IBM_LOGISTICS, 求值时取当前 MBO 字段值
    if (ch === ":") {
      i++;
      if (!/[A-Za-z_]/.test(s.charAt(i))) {
        throw new MXApplicationException("#", "冒号后缺少字段名");
      }
      var bindStart = i;
      i++;
      while (i < s.length && /[A-Za-z0-9_]/.test(s.charAt(i))) {
        i++;
      }
      tokens.push({ type: "word", value: s.substring(bindStart, i), bind: true });
      continue;
    }
    if (ch === "'") {
      var strStart = i;
      i++;
      var closed = false;
      while (i < s.length) {
        if (s.charAt(i) === "'") {
          if (s.charAt(i + 1) === "'") {
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        i++;
      }
      if (!closed) {
        throw new MXApplicationException("#", "字符串引号未闭合");
      }
      tokens.push({ type: "str", value: s.substring(strStart, i) });
      continue;
    }
    if ("=<>!".indexOf(ch) >= 0) {
      var op = ch;
      if ((ch === "<" && next === ">") || (ch === "!" && next === "=")
          || (ch === "<" && next === "=") || (ch === ">" && next === "=")
          || (ch === "=" && next === "=")) {
        op += next;
        i++;
      }
      tokens.push({ type: "op", value: op === "==" ? "=" : op });
      i++;
      continue;
    }
    if (/[0-9]/.test(ch) || ((ch === "-" || ch === "+") && /[0-9]/.test(next))) {
      var numStart = i;
      i++;
      while (i < s.length && /[0-9.]/.test(s.charAt(i))) {
        i++;
      }
      tokens.push({ type: "num", value: s.substring(numStart, i) });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      var wordStart = i;
      i++;
      while (i < s.length && /[A-Za-z0-9_]/.test(s.charAt(i))) {
        i++;
      }
      var word = s.substring(wordStart, i);
      var after = s.charAt(i);
      if (after === ".") {
        throw new MXApplicationException("#", "自定义解析器不支持关系字段: " + word + ".xxx");
      }
      tokens.push({ type: "word", value: word });
      continue;
    }
    throw new MXApplicationException("#", "表达式包含不支持的字符: " + ch);
  }
  return tokens;
}

/**
 * 获取 MBO 主表名(用于展示 SQL)
 */
function getObjectTableName(mboSet) {
  try {
    var info = mboSet.getMboSetInfo();
    var keys = info.getKeyAttributes();
    if (keys && keys.length > 0) {
      var tableAndColumn = info.getTableAndColumn(String(keys[0]));
      if (tableAndColumn && tableAndColumn.length > 0 && tableAndColumn[0]) {
        return String(tableAndColumn[0]);
      }
    }
  } catch (ignored) { }
  return "";
}

/**
 * 打开对象 MboSet 并设置过滤条件
 */
function openMboSet(job, whereOverride) {
  var mboSet;
  try {
    mboSet = mxserver.getMboSet(job.mboName, userInfo);
  } catch (e) {
    throw new MXApplicationException("#", "对象 [" + job.mboName + "] 不存在或不可访问: " + getErrorMessage(e));
  }
  try {
    mboSet.setWhere(typeof whereOverride === "string" ? whereOverride : job.mboWhere);
  } catch (e) {
    _close(mboSet);
    throw new MXApplicationException("#", "过滤条件设置失败: " + getErrorMessage(e));
  }
  return mboSet;
}

/**
 * 记录字段快照: 主键字段 + 附加字段
 */
function recordSummary(mboSet, mbo, fieldsText) {
  var out = {};
  if (!mbo) {
    return out;
  }
  var names = [];
  var seen = {};
  try {
    var keyAttrs = mboSet.getMboSetInfo().getKeyAttributes();
    for (var i = 0; i < keyAttrs.length; i++) {
      var keyName = String(keyAttrs[i]);
      names.push(keyName);
      seen[keyName.toUpperCase()] = true;
    }
  } catch (ignored) { }
  var extras = splitCsv(fieldsText);
  for (var j = 0; j < extras.length; j++) {
    if (!seen[extras[j].toUpperCase()]) {
      names.push(extras[j]);
      seen[extras[j].toUpperCase()] = true;
    }
  }
  for (var k = 0; k < names.length; k++) {
    var field = names[k];
    try {
      out[field] = mbo.isNull(field) ? null : mbo.getString(field);
    } catch (e) {
      try {
        var raw = mbo.getMboValue(field).getObject();
        out[field] = raw === null ? null : String(raw);
      } catch (ignored2) {
        out[field] = "<无法读取: " + getErrorMessage(e) + ">";
      }
    }
  }
  return out;
}

function keyText(mboSet, record) {
  var parts = [];
  try {
    var keyAttrs = mboSet.getMboSetInfo().getKeyAttributes();
    for (var i = 0; i < keyAttrs.length; i++) {
      var f = String(keyAttrs[i]);
      parts.push(f + "=" + (record[f] === null || typeof record[f] === "undefined" ? "" : record[f]));
    }
  } catch (ignored) { }
  return parts.join(",");
}

function splitCsv(text) {
  var list = [];
  if (!text) {
    return list;
  }
  var parts = String(text).split(",");
  for (var i = 0; i < parts.length; i++) {
    var p = String(parts[i]).trim();
    if (p !== "") {
      list.push(p);
    }
  }
  return list;
}

function parseRequestBody() {
  if (typeof requestBody === "undefined" || requestBody === null) {
    return {};
  }
  var s = String(requestBody);
  if (s === "" || s === "undefined" || s === "null") {
    return {};
  }
  try {
    return JSON.parse(s);
  } catch (e) {
    throw new MXApplicationException("#", "请求体不是合法的 JSON: " + getErrorMessage(e));
  }
}

function qparam(name) {
  try {
    var v = request.getQueryParam(name);
    if (v === null || typeof v === "undefined") {
      return null;
    }
    v = String(v);
    if (v === "" || v === "undefined" || v === "null") {
      return null;
    }
    return v;
  } catch (ignored) {
    return null;
  }
}

function trim(value) {
  return value === null || typeof value === "undefined" ? "" : String(value).trim();
}

function toInt(value, def) {
  var n = parseInt(value, 10);
  return isNaN(n) ? def : n;
}

function toBool(value) {
  var text = String(value === null || typeof value === "undefined" ? "" : value).toLowerCase();
  return text === "1" || text === "true";
}

function getErrorMessage(error) {
  var message = "";
  try {
    if (sksLogAnsiUtils) {
      message = sksLogAnsiUtils.getErrorMessage(error);
    }
  } catch (ignored) { }
  if (!message) {
    try {
      message = String(error.getMessage ? error.getMessage() : error);
    } catch (ignored2) {
      message = String(error);
    }
  }
  return message;
}

/**
 * 去掉 MXApplicationException("#", msg) 产生的 # 前缀
 */
function stripHashPrefix(text) {
  return String(text || "").replace(/^#+/, "");
}

/**
 * 调试信息
 * @param {java.lang.String} msg
 */
function debugPrint(msg) {
  try {
    logger.info("\x1b[35;40m[" + scriptName + "] " + msg + "\x1b[0m");
  } catch (ignored) { }
  debugMsg.append(msg).append("\n");
}

/**
 * 关闭MboSet
 */
function _close(set) {
  try {
    if (set) {
      try { set.close(); } catch (ignored) { }
      try { set.cleanup(); } catch (ignored) { }
    }
  } catch (ignored) { }
}
