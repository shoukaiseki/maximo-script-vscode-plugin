// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load('nashorn:mozilla_compat.js');
var MXServer = Java.type('psdi.server.MXServer');

var MboConstants = Java.type('psdi.mbo.MboConstants');
var SqlFormat = Java.type('psdi.mbo.SqlFormat');

// JSON 类型(必须在 main() 调用前完成赋值, 不能放到文件后部)
var SksJsonArray = Java.type("com.ibm.json.java.JSONArray");
var SksJsonObject = Java.type("com.ibm.json.java.JSONObject");
var SksOrderedJsonObject = Java.type("com.ibm.json.java.OrderedJSONObject");

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

// 域值子记录构建函数映射(函数声明会被提升, 此处可直接引用)
var DOMAIN_VALUE_BUILDER = {
  "ALN": buildAlnValue,
  "SYNONYM": buildSynonymValue,
  "NUMERIC": buildNumericValue,
  "NUMRANGE": buildNumRangeValue,
  "CROSSOVER": buildTableValue,
  "TABLE": buildTableValue
};

MXApplicationException = Java.type("psdi.util.MXApplicationException");
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
MXServer = Java.type("psdi.server.MXServer");
var scriptName = service.getScriptName();
/**  @type {psdi.util.logging.MXLogger}*/
var logger = MXLoggerFactory.getLogger("maximo.script."+scriptName);

if (request.getQueryParam("_langcode") !== 'undefined' && request.getQueryParam("_langcode")) {
  //_langcode=zh
  var _langcode = request.getQueryParam("_langcode");
  // uInfo.setLocale(lang);
  userInfo.setLangCode(_langcode.toLowerCase())
  if (userInfo.getLocale()) {
    logger.error("\x1b[35;40m[" + scriptName + "]------------------没有错误,只为一直显示_langcode=" + userInfo.getLangCode() + ",locale.language=" + userInfo.getLocale().getLanguage() + ",country=" + userInfo.getLocale().getCountry() + "\x1b[0m");
  }
}


// 运行参数:
//   URL 查询参数: _type(domains/actions/integrationobjects/...), _action(list/detail/export/import),
//                 _langcode, ignoreDefVal, _ignoreResultSuccess
//   POST body:
//     list/detail/export = 查询条件 {id? | where?, pageNum?, pageSize?, apiType?}
//     import            = 导出格式纯数据 {"domains":[...]} / {"integrationobjects":[...]} / {"actions":[...]},
//                         可带 syncFlag:true; 也接受裸数组/单对象
//   body 中不放 _type/_action(Maximo REST 保留名), 导出结果可直接复制到 APIPost 作为导入请求体
// 精简模式(ignoreDefVal): 省略空值或与默认值相同的属性, 非默认值仍导出, 简化JSON
var ignoreDefVal = false;
if (request.getQueryParam("ignoreDefVal") === "true") {
  ignoreDefVal = true;
}

// 业务类型与动作: 统一从 URL 查询参数 _type/_action 读取
var objectTypeParam = request.getQueryParam("_type");
var actionParam = request.getQueryParam("_action");

// API类型: exp=导出(仅返回 _langcode 指定语言的描述), 其它=管理端查询(额外返回 description_zh/en)
var apiType = null;

// 导入同步开关(请求体 syncFlag): true=按 JSON 全量同步(执行多余/标记记录的删除); 其它=仅新增/更新, 不做任何删除
var syncFlag = false;

// 导入结果是否忽略成功明细(只返回失败明细)
var _ignoreResultSuccess = false;
if (request.getQueryParam("_ignoreResultSuccess") === "true") {
  _ignoreResultSuccess = true;
}

// @ts-nocheck
main();

function main() {
  if (typeof request !== 'undefined' && request !== null) {
    checkPermissions('SKS_UTILS', 'DEPLOYSCRIPT');

    // 参数契约:
    //   URL:  ?_type=domains|integrationobjects|actions|...&_action=list|detail|export|import
    //   list/detail/export body: {where?|id?, pageNum?, pageSize?, apiType?}
    //   import body: 导出格式纯数据 {domains:[...]} / {integrationobjects:[...]} / {actions:[...]}, 可带 syncFlag
    //   syncFlag=true 时导入按 JSON 全量同步(删除多余记录/_delete 标记记录), 缺省或 false 仅新增/更新不删除
    //   其它 URL 查询参数: _langcode, ignoreDefVal, _ignoreResultSuccess
    var requestData = parseRequestData();

    // 导入 body 直接使用导出格式, 键名即类型; URL 未显式给 _type/_action 时据此推断(导入场景)
    var wrapperTypeMap = { domains: 'domains', integrationobjects: 'integrationobjects', actions: 'actions' };
    var objectType = objectTypeParam;
    var action = actionParam;
    var inferredType = null;
    for (var wrapperKey in wrapperTypeMap) {
      if (requestData[wrapperKey]) {
        inferredType = wrapperTypeMap[wrapperKey];
        break;
      }
    }
    if (!objectType) {
      objectType = inferredType;
    }
    if (!action && inferredType) {
      action = 'import';
    }

    // apiType 从请求体读取(ignoreDefVal 在顶部从 URL 读取)
    apiType = requestData.apiType;
    // syncFlag 从请求体读取(仅布尔 true 生效, 数组/单对象裸传时为 undefined -> 不删除)
    syncFlag = requestData.syncFlag === true;

    var response = {
      status: 'success',
    };

    if (!objectType) {
      response.status = 'error';
      response.message = 'URL 缺少 _type 参数(domains/actions/integrationobjects/...)';
      responseBody = JSON.stringify(response);
      return;
    }
    objectType = objectType.toLowerCase();
    if (!action) {
      response.status = 'error';
      response.message = 'URL 缺少 _action 参数(list/detail/export/import)';
      responseBody = JSON.stringify(response);
      return;
    }

    if (action == 'list') {
      if (objectType === 'domains') {
        responseBody = domainListResponse(requestData);
        return;
      } else if (objectType === 'integrationobjects') {
        responseBody = intObjectListResponse(requestData);
        return;
      } else if (objectType === 'messages') {
        response.data = getMessages();
      } else if (objectType === 'actions') {
        response.data = getActions();
      } else if (objectType === 'properties') {
        response.data = getProperties();
      } else if (objectType === 'crontasks') {
        response.data = getCronTasks();
      } else if (objectType === 'escalations') {
        response.data = getEscalations();
      } else if (objectType === 'loggers') {
        response.data = getLoggers();
      } else if (objectType === 'queries') {
        response.data = getQueries();
      }
    } else if (action == 'detail') {
      var id = requestData.id;
      if (id != null) {
        if (objectType === 'messages') {
          response.data = getMessage(id);
        } else if (objectType === 'actions') {
          response.data = getAction(id);
        } else if (objectType === 'properties') {
          response.data = getProperty(id);
        } else if (objectType === 'domains') {
          response.data = getDomain(id);
        } else if (objectType === 'crontasks') {
          response.data = getCronTask(id);
        } else if (objectType === 'escalations') {
          response.data = getEscalation(id);
        } else if (objectType === 'loggers') {
          response.data = getLogger(id);
        } else if (objectType === 'integrationobjects') {
          response.data = getIntObject(id);
        } else if (objectType === 'queries') {
          response.data = getQuery(id);
        }
      } else {
        response.status = 'error';
        response.message = '请求体缺少 detail 所需的 id 参数';
      }
    } else if (action == 'export') {
      var exportId = requestData.id;
      if (exportId != null) {
        // 单条导出(按唯一ID)
        if (objectType === 'messages') {
          response.data = getMessage(exportId);
        } else if (objectType === 'actions') {
          response.data = getAction(exportId);
        } else if (objectType === 'properties') {
          response.data = getProperty(exportId);
        } else if (objectType === 'domains') {
          response.data = getDomain(exportId);
        } else if (objectType === 'crontasks') {
          response.data = getCronTask(exportId);
        } else if (objectType === 'escalations') {
          response.data = getEscalation(exportId);
        } else if (objectType === 'loggers') {
          response.data = getLogger(exportId);
        } else if (objectType === 'integrationobjects') {
          response.data = getIntObject(exportId);
        } else if (objectType === 'queries') {
          response.data = getQuery(exportId);
        }
        // 单条导出也包装成与批量导出一致的纯数据格式, 可直接作为导入请求体
        if (objectType === 'integrationobjects') {
          responseBody = JSON.stringify({ integrationobjects: [response.data] });
        } else if (objectType === 'domains') {
          responseBody = JSON.stringify({ domains: [response.data] });
        } else if (objectType === 'actions') {
          responseBody = JSON.stringify({ actions: [response.data] });
        } else {
          responseBody = JSON.stringify(response);
        }
        return
      } else {
        // 批量导出(按请求体 where), 目前仅 domains / integrationobjects 支持
        if (objectType === 'domains') {
          responseBody = domainExportResponse(requestData);
          return;
        } else if (objectType === 'integrationobjects') {
          responseBody = intObjectExportResponse(requestData);
          return;
        } else {
          response.status = 'error';
          response.message = '批量导出仅支持 domains / integrationobjects, 单条导出请传 id';
        }
      }
    } else if (action == 'import') {
      // 批量导入: domains=域定义(迁移自 SKS_DEPLOY_DOMAIN), actions=操作, integrationobjects=对象结构
      if (objectType === 'domains') {
        responseBody = importDomains(requestData);
        return;
      } else if (objectType === 'actions') {
        responseBody = importActions(requestData);
        return;
      } else if (objectType === 'integrationobjects') {
        responseBody = importIntObjects(requestData);
        return;
      } else {
        response.status = 'error';
        response.message = '导入仅支持 types: domains, actions, integrationobjects';
      }
    } else {
      response.status = 'error';
      response.message = '不支持的 action: ' + action;
    }
    responseBody = JSON.stringify(response);
  }
}

/**
 * 解析 POST 请求体(JSON), 必填
 * @returns {Object}
 */
function parseRequestData() {
  try {
    if (typeof requestBody === 'undefined' || !requestBody) {
      throw new MXApplicationException('#', '请求体(requestBody)不能为空');
    }
    var data = JSON.parse(requestBody);
    if (data === null || typeof data !== 'object') {
      throw new MXApplicationException('#', '请求体(requestBody)必须是 JSON 对象');
    }
    return data;
  } catch (error) {
    if (error instanceof MXApplicationException) {
      throw error;
    }
    throw new MXApplicationException('#', '请求体(requestBody) JSON 解析失败: ' + error);
  }
}

function getActions() {
  var actionSet = MXServer.getMXServer().getMboSet('ACTION', userInfo);
  try {
    actionSet.setOrderBy('ACTION');
    actionSet.setFlag(MboConstants.DISCARDABLE, true);
    var actionMbo = actionSet.moveFirst();
    var actions = [];
    while (actionMbo != null) {
      var action = {
        id: actionMbo.getUniqueIDValue(),
        label: actionMbo.getString('ACTION'),
        description: actionMbo.getString('DESCRIPTION'),
      };

      actions.push(action);
      actionMbo = actionSet.moveNext();
    }
    return actions;
  } finally {
    _close(actionSet);
  }
}

function getAction(id) {
  var actionSet = MXServer.getMXServer().getMboSet('ACTION', userInfo);
  try {
    var actionMbo = actionSet.getMboForUniqueId(id);

    if (actionMbo != null) {
      var action = {
        action: actionMbo.getString('ACTION'),
        description: actionMbo.getString('DESCRIPTION'),
        type: actionMbo.getString('TYPE'),
        useWith: actionMbo.getString('USEWITH'),
      };

      if (!actionMbo.isNull('SENDERSYSID')) {
        action.senderSysId = actionMbo.getString('SENDERSYSID');
      }

      if (action.type === 'CUSTOM') {
        if (!actionMbo.isNull('VALUE')) {
          action.value = actionMbo.getString('VALUE');
        }
      } else if (!actionMbo.isNull('VALUE2')) {
        action.value = actionMbo.getString('VALUE2');
      }

      if (action.type !== 'GROUP') {
        if (!actionMbo.isNull('OBJECTNAME')) {
          action.objectName = actionMbo.getString('OBJECTNAME');
        }

        if (!actionMbo.isNull('PARAMETER')) {
          action.parameter = actionMbo.getString('PARAMETER');
        }
      }

      if (action.type === 'CHANGESTATUS' && !actionMbo.isNull('MEMO')) {
        action.memo = actionMbo.getString('MEMO');
      }

      var actionGroupSet = actionMbo.getMboSet('ACTION_MEMBERS');
      var actionGroupMbo = actionGroupSet.moveFirst();

      if (actionGroupMbo != null) {
        action.actionGroup = [];
      }

      while (actionGroupMbo != null) {
        var group = {
          member: actionGroupMbo.getString('MEMBER'),
          sequence: actionGroupMbo.getInt('SEQUENCE'),
        };

        action.actionGroup.push(group);
        actionGroupMbo = actionGroupSet.moveNext();
      }

      return action;
    }
  } finally {
    _close(actionSet);
  }
}

function getQueries() {
  var querySet = MXServer.getMXServer().getMboSet('QUERY', userInfo);
  try {
    querySet.setOrderBy('APP, CLAUSENAME, OWNER');
    querySet.setFlag(MboConstants.DISCARDABLE, true);
    var queryMbo = querySet.moveFirst();
    var queries = [];
    while (queryMbo != null) {
      var query = {
        id: queryMbo.getUniqueIDValue(),
        label: queryMbo.getString('APP') + ': ' + queryMbo.getString('CLAUSENAME'),
        description: queryMbo.getString('DESCRIPTION'),
      };

      queries.push(query);
      queryMbo = querySet.moveNext();
    }
    return queries;
  } finally {
    _close(querySet);
  }
}

function getQuery(id) {
  var querySet = MXServer.getMXServer().getMboSet('QUERY', userInfo);
  try {
    var queryMbo = querySet.getMboForUniqueId(id);

    if (queryMbo != null) {
      var query = {
        app: queryMbo.getString('APP'),
        clause: queryMbo.getString('CLAUSE'),
        clauseName: queryMbo.getString('CLAUSENAME'),
        description: queryMbo.getString('DESCRIPTION'),
        isPublic: queryMbo.getBoolean('ISPUBLIC'),
        isUserList: queryMbo.getBoolean('ISUSERLIST'),
        owner: queryMbo.getString('OWNER'),
      };

      if (!queryMbo.isNull('INTOBJECTNAME')) {
        query.intObjectName = queryMbo.getString('INTOBJECTNAME');
      }

      if (!queryMbo.isNull('NOTES')) {
        query.notes = queryMbo.getString('NOTES');
      }

      if (!queryMbo.isNull('PRIORITY')) {
        query.priority = queryMbo.getInt('PRIORITY');
      }

      return query;
    }
  } finally {
    _close(querySet);
  }
}

function getIntObjects() {
  var maxIntObjectSet = MXServer.getMXServer().getMboSet('MAXINTOBJECT', userInfo);
  try {
    maxIntObjectSet.setOrderBy('intobjectname');
    maxIntObjectSet.setFlag(MboConstants.DISCARDABLE, true);
    var maxIntObject = maxIntObjectSet.moveFirst();
    var integrationObjects = [];
    while (maxIntObject != null) {
      var intObject = {
        id: maxIntObject.getUniqueIDValue(),
        label: maxIntObject.getString('INTOBJECTNAME'),
        description: maxIntObject.getString('DESCRIPTION'),
      };

      integrationObjects.push(intObject);
      maxIntObject = maxIntObjectSet.moveNext();
    }
    return integrationObjects;
  } finally {
    _close(maxIntObjectSet);
  }
}

function getIntObject(id) {
  var maxIntObjectSet = MXServer.getMXServer().getMboSet('MAXINTOBJECT', userInfo);
  try {
    var maxIntObject = maxIntObjectSet.getMboForUniqueId(id);

    if (maxIntObject != null) {
      return buildIntObject(maxIntObject);
    }
  } finally {
    _close(maxIntObjectSet);
  }
}

/**
 * 构建单个对象结构(MAXINTOBJECT)的完整导出对象
 * @param {psdi.mbo.MboRemote} maxIntObject - MAXINTOBJECT MBO
 * @returns {Object}
 */
function buildIntObject(maxIntObject) {
  var intObject = {
    intObjectName: maxIntObject.getString('INTOBJECTNAME'),
    description: maxIntObject.getString('DESCRIPTION'),
    useWith: maxIntObject.getString('USEWITH'),
  };

  if (maxIntObject.getBoolean('QUERYONLY')) {
    intObject.queryOnly = true;
  }

  if (maxIntObject.getBoolean('FLATSUPPORTED')) {
    intObject.flatSupported = true;
  }

  if (maxIntObject.getBoolean('LOADQUERYFROMAPP')) {
    intObject.loadQueryFromApp = true;
  }

  if (maxIntObject.getBoolean('USEOSSECURITY')) {
    intObject.useOSSecurity = true;
  }

  if (maxIntObject.getBoolean('SELFREFERENCING')) {
    intObject.selfReferencing = true;
  }

  if (!maxIntObject.isNull('AUTHAPP')) {
    intObject.authApp = maxIntObject.getString('AUTHAPP');
  }

  if (!maxIntObject.isNull('DEFCLASS')) {
    intObject.defClass = maxIntObject.getString('DEFCLASS');
  }

  if (!maxIntObject.isNull('PROCCLASS')) {
    intObject.procClass = maxIntObject.getString('PROCCLASS');
  }

  if (!maxIntObject.isNull('SEARCHATTRS')) {
    intObject.searchAttrs = maxIntObject.getString('SEARCHATTRS');
  }

  if (!maxIntObject.isNull('RESTRICTWHERE')) {
    intObject.restrictWhere = maxIntObject.getString('RESTRICTWHERE');
  }

  if (!maxIntObject.isNull('MODULE')) {
    intObject.module = maxIntObject.getString('MODULE');
  }

  if (_attributeExists('MAXINTOBJECT', 'AUTOPAGINGTHRESHOLD') && !maxIntObject.getInt('AUTOPAGINGTHRESHOLD') != -1) {
    intObject.autoPagingThreshold = maxIntObject.getInt('AUTOPAGINGTHRESHOLD');
  }

  var maxIntObjDetailSet = maxIntObject.getMboSet('MAXINTOBJDETAIL');
  var maxIntObjDetail = maxIntObjDetailSet.moveFirst();
  if (maxIntObjDetail != null) {
    intObject.maxIntObjDetail = [];
  }

  while (maxIntObjDetail != null) {
    var intObjDetail = {
      objectName: maxIntObjDetail.getString('OBJECTNAME'),
    };

    if (!maxIntObjDetail.isNull('ALTKEY')) {
      intObjDetail.altKey = maxIntObjDetail.getString('ALTKEY');
    }

    if (maxIntObjDetail.getBoolean('EXCLUDEBYDEFAULT')) {
      intObjDetail.excludeByDefault = true;
    }

    if (maxIntObjDetail.getBoolean('SKIPKEYUPDATE')) {
      intObjDetail.skipKeyUpdate = true;
    }

    if (!maxIntObjDetail.getBoolean('EXCLUDEPARENTKEY')) {
      intObjDetail.excludeParentKey = false;
    }

    if (!maxIntObjDetail.getBoolean('DELETEONCREATE')) {
      intObjDetail.deleteOnCreate = false;
    }

    if (maxIntObjDetail.getBoolean('PROPAGATEEVENT')) {
      intObjDetail.propagateEvent = true;
    }

    if (maxIntObjDetail.getBoolean('INVOKEEXECUTE')) {
      intObjDetail.invokeExecute = true;
    }

    if (!maxIntObjDetail.isNull('FDRESOURCE')) {
      intObjDetail.fdResource = maxIntObjDetail.getString('FDRESOURCE');
    }

    if (!maxIntObjDetail.isNull('PARENTOBJNAME')) {
      intObjDetail.parentObjName = maxIntObjDetail.getString('PARENTOBJNAME');
    } else if (!maxIntObjDetail.isNull('PARENTOBJID')) {
      // PARENTOBJNAME 为非持久化字段, 新加载的行为空; 按持久化 PARENTOBJID 在明细集中反查父明细名
      // 用 getMbo(index) 而非 findMboByAttr, 避免移动外层正在遍历的游标
      var parentIdForLookup = String(maxIntObjDetail.getInt('PARENTOBJID'));
      for (var pi = 0; pi < maxIntObjDetailSet.count(); pi++) {
        var parentDetailMbo = maxIntObjDetailSet.getMbo(pi);
        if (String(parentDetailMbo.getInt('OBJECTID')) === parentIdForLookup) {
          intObjDetail.parentObjName = parentDetailMbo.getString('OBJECTNAME');
          break;
        }
      }
    }

    if (!maxIntObjDetail.isNull('RELATION')) {
      intObjDetail.relation = maxIntObjDetail.getString('RELATION');
    }

    if (!maxIntObjDetail.isNull('OBJECTORDER')) {
      intObjDetail.objectOrder = maxIntObjDetail.getInt('OBJECTORDER');
    }

    var maxIntObjColsSet = maxIntObjDetail.getMboSet('MAXINTOBJCOLS');
    var maxIntObjCols = maxIntObjColsSet.moveFirst();

    if (maxIntObjCols != null) {
      intObjDetail.maxIntObjCols = [];
    }

    while (maxIntObjCols != null) {
      var intObjCol = {
        name: maxIntObjCols.getString('NAME'),
        intObjFldType: maxIntObjCols.getString('INTOBJFLDTYPE'),
      };

      intObjDetail.maxIntObjCols.push(intObjCol);
      maxIntObjCols = maxIntObjColsSet.moveNext();
    }

    var maxIntObjAliasSet = maxIntObjDetail.getMboSet('MAXINTOBJALIAS');
    var maxIntObjAlias = maxIntObjAliasSet.moveFirst();

    if (maxIntObjAlias != null) {
      intObjDetail.maxIntObjAlias = [];
    }

    while (maxIntObjAlias != null) {
      var intObjAlias = {
        name: maxIntObjAlias.getString('NAME'),
        aliasName: maxIntObjAlias.getString('ALIASNAME'),
      };

      intObjDetail.maxIntObjAlias.push(intObjAlias);
      maxIntObjAlias = maxIntObjAliasSet.moveNext();
    }

    sqlFormat = new SqlFormat('AUTHAPP=:1 and OBJECTNAME=:2')
    sqlFormat.setString(1, maxIntObject.getString('AUTHAPP'))
    sqlFormat.setString(2, maxIntObjDetail.getString('OBJECTNAME'))
    var objectAppAuthSet = maxIntObjDetail.getMboSet('$objectappauth', 'OBJECTAPPAUTH', sqlFormat.format());
    var objectAppAuth = objectAppAuthSet.moveFirst();

    if (objectAppAuth != null) {
      intObjDetail.objectAppAuth = [];
    }
    while (objectAppAuth != null) {
      var objAppAuth = {
        context: objectAppAuth.getString('CONTEXT'),
        description: objectAppAuth.getString('DESCRIPTION'),
        objectName: objectAppAuth.getString('OBJECTNAME'),
        authApp: objectAppAuth.getString('AUTHAPP'),
      };
      intObjDetail.objectAppAuth.push(objAppAuth);
      objectAppAuth = objectAppAuthSet.moveNext();
    }

    intObject.maxIntObjDetail.push(intObjDetail);
    maxIntObjDetail = maxIntObjDetailSet.moveNext();
  }

  var sigOptionSet = maxIntObject.getMboSet('SIGOPTION');
  var sigOption = sigOptionSet.moveFirst();

  if (sigOption != null) {
    intObject.sigOption = [];
  }

  while (sigOption != null) {
    var option = {
      optionName: sigOption.getString('OPTIONNAME'),
      description: sigOption.getString('DESCRIPTION'),
    };

    if (!sigOption.isNull('ALSOGRANTS')) {
      option.alsoGrants = sigOption.getString('ALSOGRANTS');
    }

    if (!sigOption.isNull('ALSOREVOKES')) {
      option.alsoRevokes = sigOption.getString('ALSOREVOKES');
    }

    if (!sigOption.isNull('PREREQUISITE')) {
      option.prerequisite = sigOption.getString('PREREQUISITE');
    }

    if (sigOption.getBoolean('ESIGENABLED')) {
      option.esigEnabled = true;
    }

    if (!sigOption.getBoolean('VISIBLE')) {
      option.esigEnabled = false;
    }

    intObject.sigOption.push(option);
    sigOption = sigOptionSet.moveNext();
  }

  var osOSLCActionSet = maxIntObject.getMboSet('OSOSLCACTION');
  var osOSLCAction = osOSLCActionSet.moveFirst();

  if (osOSLCAction != null) {
    intObject.osOSLCAction = [];
  }

  while (osOSLCAction != null) {
    var action = {
      name: osOSLCAction.getString('NAME'),
      description: osOSLCAction.getString('DESCRIPTION'),
      implType: osOSLCAction.getString('IMPLTYPE'),
    };

    switch (action.implType) {
      case 'system':
        action.systemName = osOSLCAction.getString('SYSTEMNAME');
        break;
      case 'script':
        action.scriptName = osOSLCAction.getString('SCRIPTNAME');
        break;
      case 'workflow':
        action.processName = osOSLCAction.getString('PROCESSNAME');
        break;
      case 'wsmethod':
        action.methodName = osOSLCAction.getString('METHODNAME');
        break;
    }

    if (!osOSLCAction.isNull('OPTIONNAME')) {
      action.optionName = osOSLCAction.getString('OPTIONNAME');
    }

    if (!osOSLCAction.isNull('COLLECTION')) {
      action.collection = osOSLCAction.getString('COLLECTION');
    }

    intObject.osOSLCAction.push(action);

    osOSLCAction = osOSLCActionSet.moveNext();
  }

  var oslcQuerySet = maxIntObject.getMboSet('OSLCQUERY');
  var oslcQuery = oslcQuerySet.moveFirst();

  if (oslcQuery != null) {
    intObject.oslcQuery = [];
  }

  while (oslcQuery != null) {
    var query = {
      queryType: oslcQuery.getString('QUERYTYPE'),
    };

    switch (query.queryType) {
      case 'appclause':
        query.app = oslcQuery.getString('APP');
        query.clauseName = oslcQuery.getString('CLAUSENAME');

        break;
      case 'method':
        query.method = oslcQuery.getString('METHOD');
        query.description = oslcQuery.getString('DESCRIPTION');
        break;
      case 'osclause':
        query.clauseName = oslcQuery.getString('CLAUSENAME');
        query.description = oslcQuery.getString('DESCRIPTION');
        query.clause = oslcQuery.getString('CLAUSE');
        query.isPublic = oslcQuery.getBoolean('ISPUBLIC');
        break;
      case 'script':
        query.script = oslcQuery.getString('SCRIPT');
        break;
    }

    intObject.oslcQuery.push(query);
    oslcQuery = oslcQuerySet.moveNext();
  }

  var queryTemplateSet = maxIntObject.getMboSet('QUERYTEMPLATE');

  var queryTemplate = queryTemplateSet.moveFirst();

  if (queryTemplate != null) {
    intObject.queryTemplate = [];
  }

  while (queryTemplate != null) {
    var template = {
      templateName: queryTemplate.getString('TEMPLATENAME'),
      description: queryTemplate.getString('DESCRIPTION'),
    };

    if (!queryTemplate.isNull('PAGESIZE')) {
      template.pageSize = queryTemplate.getInt('PAGESIZE');
    }

    if (!queryTemplate.isNull('ROLE')) {
      template.role = queryTemplate.getString('ROLE');
    }
    if (!queryTemplate.isNull('SEARCHATTRIBUTES')) {
      template.searchAttributes = queryTemplate.getString('SEARCHATTRIBUTES');
    }
    if (!queryTemplate.isNull('TIMELINEATTRIBUTE')) {
      template.timelineAttributes = queryTemplate.getString('TIMELINEATTRIBUTE');
    }
    if (!queryTemplate.getBoolean('ISPUBLIC')) {
      template.isPublic = false;
    }

    var queryTemplateAttrSet = queryTemplate.getMboSet('QUERYTEMPLATEATTR');
    var queryTemplateAttr = queryTemplateAttrSet.moveFirst();

    if (queryTemplateAttr != null) {
      template.queryTemplateAttr = [];
    }

    while (queryTemplateAttr != null) {
      var attr = {
        selectAttrName: queryTemplateAttr.getString('SELECTATTRNAME'),
      };

      if (!queryTemplateAttr.isNull('TITLE')) {
        attr.title = queryTemplateAttr.getString('TITLE');
      }
      if (!queryTemplateAttr.isNull('SELECTORDER')) {
        attr.selectOrder = queryTemplateAttr.getInt('SELECTORDER');
      }
      if (!queryTemplateAttr.isNull('ALIAS')) {
        attr.alias = queryTemplateAttr.getString('ALIAS');
      }
      if (queryTemplateAttr.getBoolean('SORTBYON')) {
        attr.sortByOn = true;
      }
      if (queryTemplateAttr.getBoolean('ASCENDING')) {
        attr.ascending = true;
      }
      if (!queryTemplateAttr.isNull('SORTBYORDER')) {
        attr.sortByOrder = queryTemplateAttr.getInt('SORTBYORDER');
      }
      template.queryTemplateAttr.push(attr);
      queryTemplateAttr = queryTemplateAttrSet.moveNext();
    }

    intObject.queryTemplate.push(template);
    queryTemplate = queryTemplateSet.moveNext();
  }

  return intObject;
}

function getLoggers() {
  var maxLoggerSet = MXServer.getMXServer().getMboSet('MAXLOGGER', userInfo);
  try {
    maxLoggerSet.setOrderBy('logger');
    maxLoggerSet.setFlag(MboConstants.DISCARDABLE, true);
    var maxLogger = maxLoggerSet.moveFirst();
    var loggers = [];
    while (maxLogger != null) {
      var logger = {
        id: maxLogger.getUniqueIDValue(),
        label: maxLogger.getString('LOGGER'),
        description: maxLogger.getString('LOGKEY'),
      };

      loggers.push(logger);

      maxLogger = maxLoggerSet.moveNext();
    }
    return loggers;
  } finally {
    _close(maxLoggerSet);
  }
}

function getLogger(id) {
  var maxLoggerSet = MXServer.getMXServer().getMboSet('MAXLOGGER', userInfo);
  try {
    var maxLogger = maxLoggerSet.getMboForUniqueId(id);

    if (maxLogger != null) {
      var logger = {
        logger: maxLogger.getString('LOGGER'),
        logKey: maxLogger.getString('LOGKEY'),
        logLevel: maxLogger.getString('LOGLEVEL'),
        active: maxLogger.getBoolean('ACTIVE'),
      };

      var parentLogger = maxLogger.getMboSet('$parentlogger', 'MAXLOGGER', 'maxloggerid=:parentloggerid').moveFirst();

      if (parentLogger != null) {
        logger.parentLogger = parentLogger.getString('LOGGER');
      }

      if (!maxLogger.isNull('APPENDERS')) {
        logger.appenders = maxLogger.getString('APPENDERS');
      }

      return logger;
    }
  } finally {
    _close(maxLoggerSet);
  }
}

function getCronTasks() {
  var cronTaskDefSet = MXServer.getMXServer().getMboSet('CRONTASKDEF', userInfo);
  try {
    cronTaskDefSet.setOrderBy('CRONTASKNAME');
    cronTaskDefSet.setFlag(MboConstants.DISCARDABLE, true);
    var cronTaskDef = cronTaskDefSet.moveFirst();
    var cronTasks = [];
    while (cronTaskDef != null) {
      var cronTask = {
        id: cronTaskDef.getUniqueIDValue(),
        label: cronTaskDef.getString('CRONTASKNAME'),
        description: cronTaskDef.getString('DESCRIPTION'),
      };

      cronTasks.push(cronTask);

      cronTaskDef = cronTaskDefSet.moveNext();
    }
    return cronTasks;
  } finally {
    _close(cronTaskDefSet);
  }
}

function getCronTask(id) {
  var cronTaskDefSet = MXServer.getMXServer().getMboSet('CRONTASKDEF', userInfo);
  try {
    var cronTaskDef = cronTaskDefSet.getMboForUniqueId(id);
    if (cronTaskDef != null) {
      var cronTask = {
        cronTaskName: cronTaskDef.getString('CRONTASKNAME'),
        description: cronTaskDef.getString('DESCRIPTION'),
        className: cronTaskDef.getString('CLASSNAME'),
        accessLevel: cronTaskDef.getString('ACCESSLEVEL'),
      };

      var cronTaskInstanceSet = cronTaskDef.getMboSet('CRONTASKINSTANCE');

      var cronTaskInstance = cronTaskInstanceSet.moveFirst();

      if (cronTaskInstance != null) {
        cronTask.cronTaskInstance = [];
      }
      while (cronTaskInstance != null) {
        var instance = {
          instanceName: cronTaskInstance.getString('INSTANCENAME'),
          description: cronTaskInstance.getString('DESCRIPTION'),
          schedule: cronTaskInstance.getString('SCHEDULE'),
          active: cronTaskInstance.getBoolean('ACTIVE'),
          keepHistory: cronTaskInstance.getBoolean('KEEPHISTORY'),
          runAsUserId: cronTaskInstance.getString('RUNASUSERID'),
          maxHistory: cronTaskInstance.getInt('MAXHISTORY'),
        };

        var cronTaskParamsSet = cronTaskInstance.getMboSet('PARAMETER');
        var cronTaskParam = cronTaskParamsSet.moveFirst();
        if (cronTaskParam != null) {
          instance.cronTaskParam = [];
        }
        while (cronTaskParam != null) {
          var param = {
            parameter: cronTaskParam.getString('PARAMETER'),
            value: cronTaskParam.getString('VALUE'),
          };
          instance.cronTaskParam.push(param);
          cronTaskParam = cronTaskParamsSet.moveNext();
        }

        cronTask.cronTaskInstance.push(instance);

        cronTaskInstance = cronTaskInstanceSet.moveNext();
      }
      return cronTask;
    }
  } finally {
    _close(cronTaskDefSet);
  }
}

function getEscalations() {
  var escalationSet = MXServer.getMXServer().getMboSet('ESCALATION', userInfo);
  try {
    escalationSet.setOrderBy('ESCALATION');
    escalationSet.setFlag(MboConstants.DISCARDABLE, true);
    var escalationMbo = escalationSet.moveFirst();
    var escalations = [];
    while (escalationMbo != null) {
      var escalation = {
        id: escalationMbo.getUniqueIDValue(),
        label: escalationMbo.getString('ESCALATION'),
        description: escalationMbo.getString('DESCRIPTION'),
      };

      escalations.push(escalation);
      escalationMbo = escalationSet.moveNext();
    }
    return escalations;
  } finally {
    _close(escalationSet);
  }
}

function getEscalation(id) {
  var escalationSet = MXServer.getMXServer().getMboSet('ESCALATION', userInfo);
  try {
    var escalationMbo = escalationSet.getMboForUniqueId(id);
    if (escalationMbo != null) {
      var escalation = {
        escalation: escalationMbo.getString('ESCALATION'),
        description: escalationMbo.getString('DESCRIPTION'),
        objectName: escalationMbo.getString('OBJECTNAME'),
        condition: escalationMbo.getString('CONDITION'),
        active: escalationMbo.getBoolean('ACTIVE'),
        schedule: escalationMbo.getString('SCHEDULE'),
        cronTaskName: escalationMbo.getString('CRONTASKNAME'),
        instanceName: escalationMbo.getString('INSTANCENAME'),
        escStatusFlag: escalationMbo.getBoolean('ESCSTATUSFLAG'),
      };

      if (!escalationMbo.isNull('ESCCALENDAR')) {
        escalation.escCalendar = escalationMbo.getString('ESCCALENDAR');
      }

      if (!escalationMbo.isNull('ESCSHIFT')) {
        escalation.escShift = escalationMbo.getString('ESCSHIFT');
      }

      if (!escalationMbo.isNull('ESCCALORGID')) {
        escalation.escCalOrgId = escalationMbo.getString('ESCCALORGID');
      }

      if (!escalationMbo.isNull('SLANUM')) {
        escalation.slaNum = escalationMbo.getString('SLANUM');
      }

      if (!escalationMbo.isNull('LANGCODE')) {
        escalation.langCode = escalationMbo.getString('LANGCODE');
      }

      if (!escalationMbo.isNull('ORGID')) {
        escalation.orgId = escalationMbo.getString('ORGID');
      }

      if (!escalationMbo.isNull('SITEID')) {
        escalation.siteId = escalationMbo.getString('SITEID');
      }

      var escRefPointSet = escalationMbo.getMboSet('ESCREFPOINT');
      var escRefPointMbo = escRefPointSet.moveFirst();

      if (escRefPointMbo != null) {
        escalation.escRefPoint = [];
      }

      while (escRefPointMbo != null) {
        var refPoint = {
          refPointNum: escRefPointMbo.getInt('REFPOINTNUM'),
          eventAttribute: escRefPointMbo.getString('EVENTATTRIBUTE'),
          elapsedInterval: escRefPointMbo.getDouble('ELAPSEDINTERVAL'),
          intervalUom: escRefPointMbo.getString('INTERVALUOM'),
          repeat: escRefPointMbo.getBoolean('REPEAT'),
        };

        var escNotificationSet = escRefPointMbo.getMboSet('ESCNOTIFICATION');
        var escNotificationMbo = escNotificationSet.moveFirst();

        if (escNotificationMbo != null) {
          refPoint.escNotification = [];
        }

        while (escNotificationMbo != null) {
          var notification = {
            templateId: escNotificationMbo.getString('TEMPLATEID'),
          };
          refPoint.escNotification.push(notification);
          escNotificationMbo = escNotificationSet.moveNext();
        }

        escalation.escRefPoint.push(refPoint);
        escRefPointMbo = escRefPointSet.moveNext();
      }

      return escalation;
    }
  } finally {
    _close(escalationSet);
  }
}

function getDomains() {
  var maxDomainSet = MXServer.getMXServer().getMboSet('MAXDOMAIN', userInfo);
  try {
    maxDomainSet.setOrderBy('DOMAINID');
    maxDomainSet.setFlag(MboConstants.DISCARDABLE, true);
    var maxDomain = maxDomainSet.moveFirst();
    var domains = [];
    while (maxDomain != null) {
      var domain = {
        id: maxDomain.getUniqueIDValue(),
        label: maxDomain.getString('DOMAINID') + ' (' + maxDomain.getString('DOMAINTYPE') + ')',
        description: maxDomain.getString('DESCRIPTION'),
      };

      domains.push(domain);

      maxDomain = maxDomainSet.moveNext();
    }
    return domains;
  } finally {
    _close(maxDomainSet);
  }
}

function getDomain(id) {
  var maxDomainSet = MXServer.getMXServer().getMboSet('MAXDOMAIN', userInfo);
  try {
    var maxDomain = maxDomainSet.getMboForUniqueId(id);
    if (maxDomain != null) {
      var domain = {
        domainId: maxDomain.getString('DOMAINID'),
        domainType: maxDomain.getString('DOMAINTYPE'),
        description: maxDomain.getString('DESCRIPTION'),
      };

      if (!maxDomain.isNull('MAXTYPE')) {
        domain.maxType = maxDomain.getString('MAXTYPE');
      }

      if (!maxDomain.isNull('LENGTH')) {
        domain.length = maxDomain.getInt('LENGTH');
      }

      if (!maxDomain.isNull('SCALE')) {
        domain.scale = maxDomain.getInt('SCALE');
      }

      switch (domain.domainType) {
        case 'ALN':
          domain.alnDomain = [];
          var aldDomainSet = maxDomain.getMboSet('ALNDOMAINVALUE');
          var aldDomain = aldDomainSet.moveFirst();
          while (aldDomain != null) {
            var value = {
              value: aldDomain.getString('VALUE'),
              description: aldDomain.getString('DESCRIPTION'),
            };

            if (!aldDomain.isNull('ORGID')) {
              value.orgId = aldDomain.getString('ORGID');
            }

            if (!aldDomain.isNull('SITEID')) {
              value.siteId = aldDomain.getString('SITEID');
            }

            var aldDomainValCondSet = aldDomain.getMboSet('MAXDOMVALCOND');

            var aldDomainValCond = aldDomainValCondSet.moveFirst();

            if (aldDomainValCond != null) {
              value.maxDomValCond = [];
            }

            while (aldDomainValCond != null) {
              var condValue = {
                conditionNum: aldDomainValCond.getString('CONDITIONNUM'),
              };

              if (!aldDomainValCond.isNull('OBJECTNAME')) {
                condValue.objectName = aldDomainValCond.getString('OBJECTNAME');
              }

              value.maxDomValCond.push(condValue);

              aldDomainValCond = aldDomainValCondSet.moveNext();
            }

            domain.alnDomain.push(value);
            aldDomain = aldDomainSet.moveNext();
          }

          break;
        case 'NUMERIC':
          domain.numericDomain = [];
          var numericDomainSet = maxDomain.getMboSet('NUMDOMAINVALUE');
          var numericDomain = numericDomainSet.moveFirst();
          while (numericDomain != null) {
            var numericValue = {
              value: numericDomain.getString('VALUE'),
              description: numericDomain.getString('DESCRIPTION'),
            };

            if (!numericDomain.isNull('ORGID')) {
              numericValue.orgId = numericDomain.getString('ORGID');
            }

            if (!numericDomain.isNull('SITEID')) {
              numericValue.siteId = numericDomain.getString('SITEID');
            }

            numericDomainValCondSet = numericDomain.getMboSet('MAXDOMVALCOND');

            numericDomainValCond = numericDomainValCondSet.moveFirst();

            if (numericDomainValCond != null) {
              numericValue.maxDomValCond = [];
            }

            while (numericDomainValCond != null) {
              var numericCondValue = {
                conditionNum: numericDomainValCond.getString('CONDITIONNUM'),
              };

              if (!numericDomainValCond.isNull('OBJECTNAME')) {
                numericCondValue.objectName = numericDomainValCond.getString('OBJECTNAME');
              }

              numericValue.maxDomValCond.push(numericCondValue);

              numericDomainValCond = numericDomainValCondSet.moveNext();
            }

            domain.numericDomain.push(numericValue);
            numericDomain = numericDomainSet.moveNext();
          }

          break;
        case 'NUMRANGE':
          domain.numRangeDomain = [];
          var numRangeDomainSet = maxDomain.getMboSet('RANGEDOMSEGMENT');
          var numRangeDomain = numRangeDomainSet.moveFirst();
          while (numRangeDomain != null) {
            var numRangeValue = {
              rangeSegment: numRangeDomain.getString('RANGESEGMENT'),
              rangeMinimum: numRangeDomain.getString('RANGEMINIMUM'),
              rangeMaximum: numRangeDomain.getString('RANGEMAXIMUM'),
              rangeInterval: numRangeDomain.getString('RANGEINTERVAL'),
            };

            if (!numRangeDomain.isNull('ORGID')) {
              numRangeValue.orgId = numRangeDomain.getString('ORGID');
            }

            if (!numRangeDomain.isNull('SITEID')) {
              numRangeValue.siteId = numRangeDomain.getString('SITEID');
            }

            domain.numRangeDomain.push(numRangeValue);
            numRangeDomain = numRangeDomainSet.moveNext();
          }
          break;
        case 'SYNONYM':
          domain.synonymDomain = [];
          var synonymDomainSet = maxDomain.getMboSet('SYNONYMDOMAIN');
          var synonymDomain = synonymDomainSet.moveFirst();
          while (synonymDomain != null) {
            var synonymValue = {
              value: synonymDomain.getString('VALUE'),
              maxValue: synonymDomain.getString('MAXVALUE'),
              description: synonymDomain.getString('DESCRIPTION'),
              defaults: synonymDomain.getBoolean('DEFAULTS'),
            };

            if (!synonymDomain.isNull('ORGID')) {
              synonymValue.orgId = synonymDomain.getString('ORGID');
            }

            if (!synonymDomain.isNull('SITEID')) {
              synonymValue.siteId = synonymDomain.getString('SITEID');
            }

            var synonymDomainValCondSet = synonymDomain.getMboSet('MAXDOMVALCOND');

            var synonymDomainValCond = synonymDomainValCondSet.moveFirst();

            if (synonymDomainValCond != null) {
              synonymValue.maxDomValCond = [];
            }

            while (synonymDomainValCond != null) {
              var synonymCondValue = {
                conditionNum: synonymDomainValCond.getString('CONDITIONNUM'),
              };

              if (!synonymDomainValConnd.isNull('OBJECTNAME')) {
                synonymCondValue.objectName = synonymDomainValCond.getString('OBJECTNAME');
              }

              synonymValue.maxDomValCond.push(synonymCondValue);

              synonymDomainValCond = synonymDomainValCondSet.moveNext();
            }

            domain.synonymDomain.push(synonymValue);
            synonymDomain = synonymDomainSet.moveNext();
          }

          break;
        case 'TABLE':
          domain.tableDomain = [];
          var maxTableDomainSet = maxDomain.getMboSet('MAXTABLEDOMAIN');
          var maxTableDomain = maxTableDomainSet.moveFirst();
          while (maxTableDomain != null) {
            var tableDomainValue = {
              objectName: maxTableDomain.getString('OBJECTNAME'),
            };

            if (!maxTableDomain.isNull('VALIDTNWHERECLAUSE')) {
              tableDomainValue.validtnWhereClause = maxTableDomain.getString('VALIDTNWHERECLAUSE');
            }

            if (!maxTableDomain.isNull('LISTWHERECLAUSE')) {
              tableDomainValue.listWhereClause = maxTableDomain.getString('LISTWHERECLAUSE');
            }

            if (!maxTableDomain.isNull('ERRORRESOURCBUNDLE')) {
              tableDomainValue.errorResourceBundle = maxTableDomain.getString('ERRORRESOURCBUNDLE');
            }

            if (!maxTableDomain.isNull('ERRORACCESSKEY')) {
              tableDomainValue.errorAccessKey = maxTableDomain.getString('ERRORACCESSKEY');
            }

            if (!maxTableDomain.isNull('ORGID')) {
              tableDomainValue.orgId = maxTableDomain.getString('ORGID');
            }

            if (!maxTableDomain.isNull('SITEID')) {
              tableDomainValue.siteId = maxTableDomain.getString('SITEID');
            }

            domain.tableDomain.push(tableDomainValue);
            maxTableDomain = maxTableDomainSet.moveNext();
          }

          break;
        case 'CROSSOVER':
          domain.crossoverDomain = [];
          var crossoverDomainSet = maxDomain.getMboSet('MAXTABLEDOMAIN');
          var crossoverDomain = crossoverDomainSet.moveFirst();
          while (crossoverDomain != null) {
            var crossoverDomainValue = {
              objectName: crossoverDomain.getString('OBJECTNAME'),
            };

            if (!crossoverDomain.isNull('VALIDTNWHERECLAUSE')) {
              crossoverDomainValue.validtnWhereClause = crossoverDomain.getString('VALIDTNWHERECLAUSE');
            }

            if (!crossoverDomain.isNull('LISTWHERECLAUSE')) {
              crossoverDomainValue.listWhereClause = crossoverDomain.getString('LISTWHERECLAUSE');
            }

            if (!crossoverDomain.isNull('ERRORRESOURCBUNDLE')) {
              crossoverDomainValue.errorResourceBundle = crossoverDomain.getString('ERRORRESOURCBUNDLE');
            }

            if (!crossoverDomain.isNull('ERRORACCESSKEY')) {
              crossoverDomainValue.errorAccessKey = crossoverDomain.getString('ERRORACCESSKEY');
            }

            if (!crossoverDomain.isNull('ORGID')) {
              crossoverDomainValue.orgId = crossoverDomain.getString('ORGID');
            }

            if (!crossoverDomain.isNull('SITEID')) {
              crossoverDomainValue.siteId = crossoverDomain.getString('SITEID');
            }

            var crossoverDomainFieldsSet = crossoverDomain.getMboSet('CROSSOVERDOMAIN');
            var crossoverDomainField = crossoverDomainFieldsSet.moveFirst();

            if (crossoverDomainField != null) {
              crossoverDomainValue.crossoverFields = [];
            }

            while (crossoverDomainField != null) {
              var field = {
                sourceField: crossoverDomainField.getString('SOURCEFIELD'),
                destField: crossoverDomainField.getString('DESTFIELD'),
              };

              if (crossoverDomainField.getBoolean('COPYEVENIFSRCNULL')) {
                field.copyEvenIfSrcNull = true;
              }

              if (crossoverDomainField.getBoolean('COPYONLYIFDESTNULL')) {
                field.copyOnlyIfDestNull = true;
              }

              if (!crossoverDomainField.isNull('SOURCECONDITION')) {
                field.sourceCondition = crossoverDomainField.getString('SOURCECONDITION');
              }

              if (!crossoverDomainField.isNull('DESTCONDITION')) {
                field.destCondition = crossoverDomainField.getString('DESTCONDITION');
              }

              if (!crossoverDomainField.isNull('SEQUENCE')) {
                field.sequence = crossoverDomainField.getInt('SEQUENCE');
              }
              crossoverDomainValue.crossoverFields.push(field);
              crossoverDomainField = crossoverDomainFieldsSet.moveNext();
            }

            domain.crossoverDomain.push(crossoverDomainValue);
            crossoverDomain = crossoverDomainSet.moveNext();
          }
          break;
      }

      return domain;
    }
  } finally {
    _close(maxDomainSet);
  }
}

function getProperties() {
  var maxPropSet = MXServer.getMXServer().getMboSet('MAXPROP', userInfo);

  var properties = [];
  try {
    var sqlf = new SqlFormat('propname != :1');
    sqlf.setObject(1, 'MAXPROP', 'PROPNAME', 'mxe.sec.header.Content_Security_Policy');
    maxPropSet.setWhere(sqlf.format());
    maxPropSet.setOrderBy('PROPNAME');

    maxPropSet.setFlag(MboConstants.DISCARDABLE, true);
    var maxProp = maxPropSet.moveFirst();

    while (maxProp != null) {
      var property = {
        id: maxProp.getUniqueIDValue(),
        label: maxProp.getString('PROPNAME'),
        description: maxProp.getString('DESCRIPTION'),
      };

      properties.push(property);

      maxProp = maxPropSet.moveNext();
    }

    return properties;
  } finally {
    _close(maxPropSet);
  }
}

function getProperty(id) {
  if (id != null) {
    var maxPropSet = MXServer.getMXServer().getMboSet('MAXPROP', userInfo);
    try {
      var maxProp = maxPropSet.getMboForUniqueId(id);
      if (maxProp != null) {
        var property = {
          propName: maxProp.getString('PROPNAME'),
          description: maxProp.getString('DESCRIPTION'),
          propValue: maxProp.getString('DISPPROPVALUE'),
          maxPropInstance: [],
        };

        if (!maxProp.isNull('DOMAINID')) {
          property.domainId = maxProp.getString('DOMAINID');
        }

        if (maxProp.getBoolean('ENCRYPTED')) {
          property.encrypted = maxProp.getBoolean('ENCRYPTED');
        }

        if (maxProp.getBoolean('GLOBALONLY')) {
          property.globalOnly = maxProp.getBoolean('GLOBALONLY');
        }

        if (maxProp.getBoolean('INSTANCEONLY')) {
          property.instanceOnly = maxProp.getBoolean('INSTANCEONLY');
        }

        if (!maxProp.getBoolean('LIVEREFRESH')) {
          property.liveRefresh = maxProp.getBoolean('LIVEREFRESH');
        }

        if (maxProp.getBoolean('MASKED')) {
          property.masked = maxProp.getBoolean('MASKED');
        }

        if (!maxProp.getBoolean('NULLSALLOWED')) {
          property.nullsAllowed = maxProp.getBoolean('NULLSALLOWED');
        }

        if (!maxProp.getBoolean('ONLINECHANGES')) {
          property.onlineChanges = maxProp.getBoolean('ONLINECHANGES');
        }

        if (!maxProp.getString('MAXTYPE') !== 'ALN') {
          property.maxType = maxProp.getString('MAXTYPE');
        }

        if (!maxProp.getString('SECURELEVEL') !== 'PUBLIC') {
          property.secureLevel = maxProp.getString('SECURELEVEL');
        }

        if (!maxProp.isNull('MAXIMODEFAULT')) {
          property.maximoDefault = maxProp.getString('MAXIMODEFAULT');
        }

        var maxPropInstanceSet = maxProp.getMboSet('MAXPROPINSTANCE');

        var maxPropInstance = maxPropInstanceSet.moveFirst();

        while (maxPropInstance != null) {
          var instance = {
            serverName: maxPropInstance.getString('SERVERNAME'),
            propValue: maxPropInstance.getString('DISPPROPVALUE'),
            serverHost: maxPropInstance.getString('SERVERHOST'),
          };

          property.maxPropInstance.push(instance);

          maxPropInstance = maxPropInstanceSet.moveNext();
        }

        if (property.maxPropInstance.length === 0) {
          delete property.maxPropInstance;
        }

        return property;
      }
    } finally {
      _close(maxPropSet);
    }
  }
}

function getMessage(id) {
  if (id != null) {
    var maxMessageSet = MXServer.getMXServer().getMboSet('MAXMESSAGES', userInfo);
    try {
      var maxMessage = maxMessageSet.getMboForUniqueId(id);
      if (maxMessage != null) {
        var message = {
          msgGroup: maxMessage.getString('MSGGROUP'),
          msgKey: maxMessage.getString('MSGKEY'),
          msgId: maxMessage.getString('MSGID'),
          value: maxMessage.getString('VALUE'),
          displayMethod: maxMessage.getString('DISPLAYMETHOD'),
          prefix: maxMessage.getString('MSGIDPREFIX'),
          suffix: maxMessage.getString('MSGIDSUFFIX'),
          options: [],
        };

        if (!maxMessage.isNull('EXPLANATION')) {
          message.explanation = maxMessage.getString('EXPLANATION');
        }

        if (!maxMessage.isNull('ADMINRESPONSE')) {
          message.adminResponse = maxMessage.getString('ADMINRESPONSE');
        }

        if (!maxMessage.isNull('SYSTEMACTION')) {
          message.systemAction = maxMessage.getString('SYSTEMACTION');
        }

        message.options = getMessageOptions(maxMessage);

        return message;
      }
    } finally {
      _close(maxMessageSet);
    }
  }
}

function getMessageOptions(maxMessage) {
  var options = [];
  var messageOptions = ['close', 'ok', 'cancel', 'yes', 'no', 'warning', 'stop', 'exclamation'];

  messageOptions.forEach(function (messageOption) {
    if (maxMessage.getBoolean(messageOption)) {
      options.push(messageOption);
    }
  });

  return options;
}

function getMessages() {
  var maxMessageSet = MXServer.getMXServer().getMboSet('MAXMESSAGES', userInfo);

  var messages = [];
  try {
    maxMessageSet.setFlag(MboConstants.READONLY, false);
    maxMessageSet.setFlag(MboConstants.DISCARDABLE, true);
    maxMessageSet.setOrderBy('MSGGROUP, MSGKEY');
    var maxMessage = maxMessageSet.getMbo(0);

    while (maxMessage != null) {
      var message = {
        id: maxMessage.getUniqueIDValue(),
        label: maxMessage.getString('MSGGROUP') + ':' + maxMessage.getString('MSGKEY'),
        description: maxMessage.getString('VALUE'),
      };

      messages.push(message);

      maxMessage = maxMessageSet.moveNext();
    }

    return messages;
  } finally {
    _close(maxMessageSet);
  }
}

function _attributeExists(objectName, attributeName) {
  var msi = MXServer.getMXServer().getMaximoDD().getMboSetInfo(objectName);

  if (msi != null) {
    return msi.getMboValueInfo(attributeName) != null;
  } else {
    return false;
  }
}

function checkPermissions(app, optionName) {
  if (!userInfo) {
    throw new AdminError('no_user_info', 'The userInfo global variable has not been set, therefore the user permissions cannot be verified.');
  }

  var userProfile = MXServer.getMXServer().lookup('SECURITY').getProfile(userInfo);

  if (!userProfile.hasAppOption(app, optionName) && !isInAdminGroup()) {
    throw new AdminError(
      'no_permission',
      'The user ' + userInfo.getUserName() + ' does not have access to the ' + optionName + ' option in the ' + app + ' object structure.'
    );
  }
}

// Determines if the current user is in the administrator group, returns true if the user is, false otherwise.
function isInAdminGroup() {
  var user = userInfo.getUserName();
  service.log_info('Determining if the user ' + user + ' is in the administrator group.');
  var groupUserSet;

  try {
    groupUserSet = MXServer.getMXServer().getMboSet('GROUPUSER', userInfo);

    // Get the ADMINGROUP MAXVAR value.
    var adminGroup = MXServer.getMXServer().lookup('MAXVARS').getString('ADMINGROUP', null);

    // Query for the current user and the found admin group.
    // The current user is determined by the implicity `user` variable.
    sqlFormat = new SqlFormat('userid = :1 and groupname = :2');
    sqlFormat.setObject(1, 'GROUPUSER', 'USERID', user);
    sqlFormat.setObject(2, 'GROUPUSER', 'GROUPNAME', adminGroup);
    groupUserSet.setWhere(sqlFormat.format());

    if (!groupUserSet.isEmpty()) {
      service.log_info('The user ' + user + ' is in the administrator group ' + adminGroup + '.');
      return true;
    } else {
      service.log_info('The user ' + user + ' is not in the administrator group ' + adminGroup + '.');
      return false;
    }
  } finally {
    _close(groupUserSet);
  }
}

function _close(mboSet) {
  try {
    if (mboSet != null && mboSet instanceof Java.type('psdi.mbo.MboSet')) {
      try { mboSet.close(); } catch (ignored) { };
      try { mboSet.cleanup(); } catch (ignored) { };
    }
  } catch (ignored) { }
}

// =================================================================================
// 域定义导出/导入(迁移自 cn/shoukaiseki/tools/SKS_EXPORT_DOMAIN.js 与 SKS_DEPLOY_DOMAIN.js)
// 调用: type=domains & action=list|export|import
//   list/export 请求体: {"where":"SQL条件"} 可带 pageNum/pageSize, 返回 {domains:[...]}
//   import 请求体: 域定义数组 或 {"domains":[...]}
// =================================================================================

/**
 * 域列表查询(仅 MAXDOMAIN 主记录), 兼容 SKS_EXPORT_DOMAIN 的 _action=list 返回格式
 */
function domainListResponse(requestData) {
  return queryDomainData(requestData, true);
}

/**
 * 域完整导出(含各类型域值子记录), 兼容 SKS_EXPORT_DOMAIN 的 _action=export 返回格式
 */
function domainExportResponse(requestData) {
  return queryDomainData(requestData, false);
}

/**
 * 按 where 查询 MAXDOMAIN 并构建导出 JSON
 * @param {Object} requestData - 请求体 {where:"..."}
 * @param {boolean} listOnly - true=仅主记录列表, false=完整导出(含域值子记录)
 * @returns {string} JSON 字符串
 */
function queryDomainData(requestData, listOnly) {
  /** @type {psdi.mbo.MboSetRemote} */
  var domainSet = null;
  try {
    if (!requestData) {
      throw new MXApplicationException("#", "请求体(requestBody)不能为空");
    }

    // 仅支持 where 过滤, 为空时导出全部
    var whereClause = requestData.where || "1=1";
    // MAXDOMAIN 查询会 right outer join 语言表 L_MAXDOMAIN(含 DESCRIPTION 列),
    // 裸 DESCRIPTION 会产生列歧义(SQLCODE=-203/42702), 改写为同时匹配两个表
    whereClause = qualifyDomainDescriptionWhere(whereClause);

    var pager = readPager(requestData);

    domainSet = MXServer.getMXServer().getMboSet("MAXDOMAIN", userInfo);
    domainSet.setWhere(whereClause);
    domainSet.setOrderBy("domaintype, domainid");
    domainSet.reset();

    var total = domainSet.count();
    logger.info("[" + scriptName + "] domains " + (listOnly ? "list" : "export") + ", 过滤条件: " + whereClause + ", 共 " + total + " 条");

    /** @type {com.ibm.json.java.JSONArray} */
    var domains = new SksJsonArray();

    var mbo = domainSet.moveFirst();
    var idx = 0;
    while (mbo) {
      var domainObj = listOnly ? buildDomainListObject(mbo) : buildDomainObject(mbo);
      if (pager.hasPagination) {
        // 内存分页
        if (idx >= (pager.pageNum - 1) * pager.pageSize && idx < pager.pageNum * pager.pageSize) {
          domains.add(domainObj);
        }
        idx++;
      } else {
        domains.add(domainObj);
      }
      mbo = domainSet.moveNext();
    }

    /** @type {com.ibm.json.java.JSONObject} */
    var result = new SksOrderedJsonObject();
    result.put("domains", domains);
    if (pager.hasPagination) {
      result.put("total", total);
      result.put("pageNum", pager.pageNum);
      result.put("pageSize", pager.pageSize);
    }

    return service.jsonToString(result);
  } catch (error) {
    logger.error("[" + scriptName + "] 导出域定义失败: " + error);
    /** @type {com.ibm.json.java.JSONObject} */
    var errorData = new SksJsonObject();
    errorData.put("status", "error");
    errorData.put("message", error && error.message ? error.message : String(error));
    return errorData.serialize();
  } finally {
    _close(domainSet);
  }
}

/**
 * 处理 where 子句中 DESCRIPTION 列的歧义问题(L_MAXDOMAIN 与 MAXDOMAIN 均有 DESCRIPTION)
 */
function qualifyDomainDescriptionWhere(whereClause) {
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
 * 构建域定义列表 JSON 对象(仅 MAXDOMAIN 主记录, 不含域值子记录)
 */
function buildDomainListObject(domainMbo) {
  /** @type {com.ibm.json.java.OrderedJSONObject} */
  var obj = new SksOrderedJsonObject();

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
 * 构建域定义 JSON 对象(与导入格式完全兼容, 含域值子记录)
 */
function buildDomainObject(domainMbo) {
  /** @type {com.ibm.json.java.OrderedJSONObject} */
  var obj = new SksOrderedJsonObject();

  // 必填字段
  obj.put("domainid", getString(domainMbo, "DOMAINID"));
  obj.put("domaintype", getString(domainMbo, "DOMAINTYPE"));

  // 可选字段: 精简模式(ignoreDefVal)下省略空值或与默认值相同的属性
  putIfNotDef(obj, "description", getString(domainMbo, "DESCRIPTION"));
  if (apiType !== 'exp') {
    putLangField(obj, domainMbo, "description_zh", "DESCRIPTION", "ZH");
    putLangField(obj, domainMbo, "description_en", "DESCRIPTION", "EN");
  }
  putIfNotDef(obj, "maxtype", getString(domainMbo, "MAXTYPE"));
  putIfNotDef(obj, "length", getInt(domainMbo, "LENGTH"));
  var domainType = getString(domainMbo, "DOMAINTYPE");
  if (domainType === "NUMERIC" || domainType === "NUMRANGE") {
    putIfNotDef(obj, "scale", getInt(domainMbo, "SCALE"));
  }
  putIfNotDef(obj, "internal", getInt(domainMbo, "INTERNAL"), 0);
  putIfNotDef(obj, "nevercache", getInt(domainMbo, "NEVERCACHE"), 0);

  // 按 domaintype 读取对应的域值子表
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
 */
function buildDomainValues(domainMbo, relName, domainType) {
  /** @type {psdi.mbo.MboSetRemote} */
  var valSet = null;
  /** @type {com.ibm.json.java.JSONArray} */
  var arr = new SksJsonArray();
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
    _close(valSet);
  }
  return arr;
}

/** 域值条件记录 MAXDOMVALCOND(CONDITIONNUM/OBJECTNAME), ALN/SYNONYM/NUMERIC 域值可挂条件 */
function buildMaxDomValCondArr(valueMbo) {
  /** @type {com.ibm.json.java.JSONArray} */
  var arr = new SksJsonArray();
  /** @type {psdi.mbo.MboSetRemote} */
  var condSet = null;
  try {
    condSet = valueMbo.getMboSet("MAXDOMVALCOND");
    condSet.reset();
    var condMbo = condSet.moveFirst();
    while (condMbo) {
      var condObj = new SksOrderedJsonObject();
      condObj.put("conditionnum", getString(condMbo, "CONDITIONNUM"));
      putIfNotDef(condObj, "objectname", getString(condMbo, "OBJECTNAME"));
      arr.add(condObj);
      condMbo = condSet.moveNext();
    }
  } finally {
    _close(condSet);
  }
  return arr;
}

/** 向域值 JSON 挂 maxdomvalcond 数组(有记录才输出) */
function putMaxDomValCond(obj, valueMbo) {
  var arr = buildMaxDomValCondArr(valueMbo);
  if (arr.size() > 0) {
    obj.put("maxdomvalcond", arr);
  }
}

/** ALN 域值记录(VALUE/DESCRIPTION/ORGID/SITEID) */
function buildAlnValue(mbo) {
  var o = new SksOrderedJsonObject();
  o.put("value", getString(mbo, "VALUE"));
  putDescFields(o, mbo);
  putIfNotDef(o, "orgid", getString(mbo, "ORGID"));
  putIfNotDef(o, "siteid", getString(mbo, "SITEID"));
  putMaxDomValCond(o, mbo);
  return o;
}

/** SYNONYM 域值记录(MAXVALUE/VALUE/DESCRIPTION/DEFAULTS/ORGID/SITEID) */
function buildSynonymValue(mbo) {
  var o = new SksOrderedJsonObject();
  o.put("maxvalue", getString(mbo, "MAXVALUE"));
  o.put("value", getString(mbo, "VALUE"));
  putDescFields(o, mbo);
  putIfNotDef(o, "defaults", getString(mbo, "DEFAULTS"), "0");
  putIfNotDef(o, "orgid", getString(mbo, "ORGID"));
  putIfNotDef(o, "siteid", getString(mbo, "SITEID"));
  putMaxDomValCond(o, mbo);
  return o;
}

/** NUMERIC 域值记录(VALUE/DESCRIPTION/ORGID/SITEID) */
function buildNumericValue(mbo) {
  var o = new SksOrderedJsonObject();
  o.put("value", getString(mbo, "VALUE"));
  putDescFields(o, mbo);
  putIfNotDef(o, "orgid", getString(mbo, "ORGID"));
  putIfNotDef(o, "siteid", getString(mbo, "SITEID"));
  putMaxDomValCond(o, mbo);
  return o;
}

/** NUMRANGE 域值记录(RANGESEGMENT/RANGEMINIMUM/RANGEMAXIMUM/RANGEINTERVAL/ORGID/SITEID) */
function buildNumRangeValue(mbo) {
  var o = new SksOrderedJsonObject();
  o.put("rangesegment", getInt(mbo, "RANGESEGMENT"));
  putIfNotDef(o, "rangeminimum", getDouble(mbo, "RANGEMINIMUM"));
  putIfNotDef(o, "rangemaximum", getDouble(mbo, "RANGEMAXIMUM"));
  putIfNotDef(o, "rangeinterval", getDouble(mbo, "RANGEINTERVAL"));
  putIfNotDef(o, "orgid", getString(mbo, "ORGID"));
  putIfNotDef(o, "siteid", getString(mbo, "SITEID"));
  return o;
}

/** CROSSOVER 域映射记录(SOURCEFIELD/DESTFIELD/条件/序号) */
function buildCrossoverValue(mbo) {
  var o = new SksOrderedJsonObject();
  o.put("sourcefield", getString(mbo, "SOURCEFIELD"));
  o.put("destfield", getString(mbo, "DESTFIELD"));
  putIfNotDef(o, "sourcecondition", getString(mbo, "SOURCECONDITION"));
  putIfNotDef(o, "destcondition", getString(mbo, "DESTCONDITION"));
  putIfNotDef(o, "copyevenifsrcnull", getString(mbo, "COPYEVENIFSRCNULL"), "0");
  putIfNotDef(o, "copyonlyifdestnull", getString(mbo, "COPYONLYIFDESTNULL"), "0");
  putIfNotDef(o, "sequence", getInt(mbo, "SEQUENCE"));
  return o;
}

/** TABLE/CROSSOVER 域值记录(OBJECTNAME/WHERE 子句/错误消息), CROSSOVER 含 CROSSOVERDOMAIN 子记录 */
function buildTableValue(mbo, domainType) {
  var o = new SksOrderedJsonObject();
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
    var coArr = new SksJsonArray();
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
      _close(coSet);
    }
    if (coArr.size() > 0) {
      o.put("crossoverdomain", coArr);
    }
  }

  return o;
}

/**
 * 向值记录添加描述及多语言字段
 */
function putDescFields(o, mbo) {
  o.put("description", getString(mbo, "DESCRIPTION"));
  if (apiType !== 'exp') {
    putLangField(o, mbo, "description_zh", "DESCRIPTION", "ZH");
    putLangField(o, mbo, "description_en", "DESCRIPTION", "EN");
  }
}

/** 获取 MBO 字符串值(属性不存在或为空返回 null) */
function getString(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : mbo.getString(attr);
  } catch (e) {
    return null;
  }
}

/** 获取 MBO 整数值 */
function getInt(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : mbo.getInt(attr);
  } catch (e) {
    return null;
  }
}

/** 获取 MBO 浮点数值 */
function getDouble(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : mbo.getDouble(attr);
  } catch (e) {
    return null;
  }
}

/**
 * 添加属性值到 JSON 对象
 * 规则: 空值不导出; 精简模式(ignoreDefVal)下与默认值相同的属性省略
 */
function putIfNotDef(obj, jsonKey, val, defVal) {
  if (val === null || val === undefined || val === "") return;
  if (ignoreDefVal && defVal !== undefined && defVal !== null && String(val) == String(defVal)) return;
  obj.put(jsonKey, val);
}

/** 添加指定语言的描述字段(多语言表翻译) */
function putLangField(obj, mbo, jsonKey, attr, langCode) {
  try {
    var val = mbo.getString(attr, langCode);
    if (val !== null && val !== "") {
      obj.put(jsonKey, val);
    }
  } catch (e) { }
}

/**
 * 批量导入域定义(迁移自 SKS_DEPLOY_DOMAIN)
 * 请求体支持: 数组 / {"domains":[...]} / 单个域定义对象
 * @returns {string} JSON 字符串
 */
function importDomains(requestData) {
  try {
    if (!requestData) {
      throw new MXApplicationException("#", "请求体(requestBody)不能为空");
    }

    // 支持单个对象或数组
    var domainsArray;
    if (Array.isArray(requestData)) {
      domainsArray = requestData;
    } else if (requestData.domains && Array.isArray(requestData.domains)) {
      domainsArray = requestData.domains;
    } else {
      domainsArray = [requestData];
    }

    if (!domainsArray || domainsArray.length === 0) {
      throw new MXApplicationException("#", "没有提供域定义数据");
    }

    logger.info("开始批量导入 " + domainsArray.length + " 个域定义");

    var resultList = [];
    for (var i = 0; i < domainsArray.length; i++) {
      var domainData = domainsArray[i];
      try {
        saveOrUpdateDomain(domainData, i + 1);
        resultList.push({
          domainid: domainData.domainid || "未知",
          status: "SUCCESS",
          message: "域定义保存成功"
        });
      } catch (error) {
        logger.error("处理第 " + (i + 1) + " 个域定义失败: " + error);
        resultList.push({
          domainid: domainData.domainid || "未知",
          status: "FAILED",
          message: error && error.message ? error.message : String(error)
        });
      }
    }

    var successCount = 0;
    var failedCount = 0;
    var resultListTmp = [];
    for (var j = 0; j < resultList.length; j++) {
      if (resultList[j].status === "SUCCESS") {
        successCount++;
        if (!_ignoreResultSuccess) {
          resultListTmp.push(resultList[j]);
        }
      } else {
        failedCount++;
        resultListTmp.push(resultList[j]);
      }
    }

    logger.info("批量导入域定义完成: 成功 " + successCount + " 个, 失败 " + failedCount + " 个");

    var responseData = {
      status: "success",
      message: "批量导入完成",
      summary: {
        total: domainsArray.length,
        success: successCount,
        failed: failedCount
      },
      result: resultListTmp
    };
    return JSON.stringify(responseData, null, 4);
  } catch (error) {
    logger.error("批量导入域定义失败: " + error);
    var errorData = {
      status: "error",
      message: error && error.message ? error.message : String(error)
    };
    return JSON.stringify(errorData, null, 4);
  }
}

/**
 * 保存或更新域定义到 MAXDOMAIN 表(含域值子表)
 */
function saveOrUpdateDomain(domainData, index) {
  var domainId = domainData.domainid;
  var domainType = domainData.domaintype;
  var description = domainData.description;
  if (!domainId) {
    throw new MXApplicationException("#", "第 " + index + " 个域定义的 domainid（域名）不能为空");
  }
  if (!domainType) {
    throw new MXApplicationException("#", "第 " + index + " 个域定义的 domaintype（域类型）不能为空");
  }

  var length = domainData.length;
  var scale = domainData.scale;
  var internal = domainData.internal;
  var neverCache = domainData.nevercache;

  /** @type {psdi.mbo.MboSetRemote} */
  var domainSet = null;
  try {
    domainSet = MXServer.getMXServer().getMboSet("MAXDOMAIN", userInfo);

    var sqlf = new SqlFormat("domainid = :1");
    sqlf.setObject(1, "MAXDOMAIN", "DOMAINID", domainId);
    domainSet.setWhere(sqlf.format());
    domainSet.reset();

    /** @type {psdi.mbo.MboRemote} */
    var domainMbo;

    if (domainSet.isEmpty()) {
      if (domainData._delete) {
        return;
      }
      logger.info("创建新域定义: " + domainId);
      domainMbo = domainSet.add();
      domainMbo.setValue("DOMAINID", domainId);
    } else {
      logger.info("更新现有域定义: " + domainId);
      domainMbo = domainSet.getMbo(0);
      if (domainData._delete) {
        if (syncFlag === true) {
          logger.info("syncFlag=true, 删除域定义: " + domainId);
          domainMbo.delete();
          domainSet.save();
        } else {
          logger.info("syncFlag 非 true, 跳过删除域定义: " + domainId);
        }
        return;
      }
    }

    if (!domainMbo.getMboValueData("DOMAINTYPE").isReadOnly() && typeof domainType !== 'undefined') {
      domainMbo.setValue("DOMAINTYPE", domainType, 2);
    }

    if (typeof description !== 'undefined' && description !== null && description !== "") {
      domainMbo.setValue("DESCRIPTION", description);
    }

    // TABLE/CROSSOVER 类型不设置 MAXTYPE 和 LENGTH
    var isTableType = domainType === "TABLE" || domainType === "CROSSOVER";
    var maxType = domainData.maxtype;
    if (!isTableType && typeof maxType !== 'undefined' && maxType !== null) {
      domainMbo.setValue("MAXTYPE", maxType, 11);
    }

    if (!isTableType && typeof length !== 'undefined') {
      domainMbo.setValue("LENGTH", length, 2);
    }

    if (typeof scale !== 'undefined' && scale != null) {
      if (domainMbo.getString("DOMAINTYPE") === "NUMERIC" || domainMbo.getString("DOMAINTYPE") === "NUMRANGE") {
        domainMbo.setValue("SCALE", scale, 2);
      }
    }

    if (typeof internal !== 'undefined' && internal) {
      domainMbo.setValue("INTERNAL", internal, 2);
    }
    if (typeof neverCache !== 'undefined' && neverCache !== null) {
      domainMbo.setValue("NEVERCACHE", neverCache);
    }

    // 按 domaintype 处理域值子表
    saveOrUpdateDomainValues(domainMbo, domainData, domainType);

    domainSet.save();
    logger.info("域定义保存成功: DOMAINID=" + domainId + ", DOMAINTYPE=" + domainType);
  } catch (error) {
    logger.error("保存MAXDOMAIN表失败: " + error);
    throw new MXApplicationException("#", "保存域定义失败: ", error);
  } finally {
    _close(domainSet);
  }
}

/**
 * 按 domaintype 分发域值子表保存(ALN/SYNONYM/NUMERIC/NUMRANGE/CROSSOVER/TABLE)
 */
function saveOrUpdateDomainValues(domainMbo, domainData, domainType) {
  // ALN
  if (domainData.alndomain) {
    var alnSet = domainMbo.getMboSet("ALNDOMAINVALUE");
    try { saveOrUpdateAlnDomain(alnSet, domainData.alndomain); alnSet.save(); } finally { _close(alnSet); }
  }
  // SYNONYM
  if (domainData.synonymdomain) {
    var synSet = domainMbo.getMboSet("SYNONYMDOMAIN");
    try { saveOrUpdateSynonymDomain(synSet, domainData.synonymdomain); synSet.save(); } finally { _close(synSet); }
  }
  // NUMERIC
  if (domainData.numericdomain) {
    var numSet = domainMbo.getMboSet("NUMDOMAINVALUE");
    try { saveOrUpdateNumericDomain(numSet, domainData.numericdomain); numSet.save(); } finally { _close(numSet); }
  }
  // NUMRANGE
  if (domainData.numrangedomain) {
    var nrSet = domainMbo.getMboSet("RANGEDOMSEGMENT");
    try { saveOrUpdateNumRangeDomain(nrSet, domainData.numrangedomain); nrSet.save(); } finally { _close(nrSet); }
  }
  // TABLE / CROSSOVER (值记录在 MAXTABLEDOMAIN)
  if (domainData.tabledomain) {
    var tbRel = domainType === "CROSSOVER" ? "MAXTABLEDOMAINFORCROSSOVER" : "MAXTABLEDOMAIN";
    var tbSet = domainMbo.getMboSet(tbRel);
    try { saveOrUpdateTableDomain(tbSet, domainData.tabledomain, domainType); tbSet.save(); } finally { _close(tbSet); }
  }
}

/**
 * 同步域值条件子记录 MAXDOMVALCOND(查找键 VALUEID+CONDITIONNUM+OBJECTNAME)
 * 数据键: maxdomvalcond: [{conditionnum, objectname?, _delete?}]
 * syncFlag=true: 全量同步 —— 删除 _delete 标记记录及 JSON 中不存在的多余旧记录(显式传空数组=清空全部)
 * syncFlag=false: 仅新增/更新, 不做任何删除; 未提供该键(undefined)时完全不动
 */
function saveOrUpdateMaxDomValCond(valueMbo, condDatas) {
  // 未提供 maxdomvalcond 键: 不动既有条件
  if (typeof condDatas === 'undefined' || condDatas === null) {
    return;
  }

  /** @type {psdi.mbo.MboSetRemote} */
  var condSet = valueMbo.getMboSet("MAXDOMVALCOND");
  try {
    condSet.reset();

    // 显式提供空数组且 syncFlag=true: 清空该域值下全部条件
    if (!Array.isArray(condDatas) || condDatas.length === 0) {
      if (syncFlag === true) {
        var delAll = condSet.moveFirst();
        while (delAll) {
          var nextAll = condSet.moveNext();
          delAll.delete();
          delAll = nextAll;
        }
        logger.info("syncFlag=true, 已清空域值下全部 MAXDOMVALCOND 记录");
      }
      return;
    }

    var matchedKeys = {};
    for (var i = 0; i < condDatas.length; i++) {
      var cd = condDatas[i];
      var conditionnum = cd.conditionnum;
      if (!conditionnum) {
        logger.warn("第 " + (i + 1) + " 条 MAXDOMVALCOND 记录缺少 conditionnum, 跳过");
        continue;
      }
      var objectname = cd.objectname || "";
      var key = conditionnum + "||" + objectname;

      // 按 CONDITIONNUM + OBJECTNAME 查找(OBJECTNAME 可空, null 与空串视为相同)
      var condMbo = condSet.moveFirst();
      while (condMbo) {
        var dbObj = condMbo.getString("OBJECTNAME");
        if (condMbo.getString("CONDITIONNUM") == conditionnum && (dbObj === null ? "" : dbObj) == objectname) {
          break;
        }
        condMbo = condSet.moveNext();
      }

      if (cd._delete) {
        if (syncFlag === true) {
          if (condMbo) {
            condMbo.delete();
            logger.info("已删除 MAXDOMVALCOND 记录: " + key);
          }
        } else {
          logger.info("syncFlag 非 true, 跳过删除 MAXDOMVALCOND 记录: " + key);
        }
      } else {
        if (!condMbo) {
          condMbo = condSet.add();
          // 关系新增不会自动带出键字段, DOMAINID/VALUEID 必填需显式赋值
          // VALUEID 规则: ALN/NUMERIC=DOMAINID|VALUE, SYNONYM=DOMAINID|MAXVALUE|VALUE
          var newDomainId = valueMbo.getString("DOMAINID");
          var newValueId = valueMbo.getString("VALUEID");
          if (!newValueId) {
            var newMaxValue = getString(valueMbo, "MAXVALUE");
            newValueId = newDomainId + "|" + (newMaxValue ? newMaxValue + "|" : "") + valueMbo.getString("VALUE");
          }
          condMbo.setValue("DOMAINID", newDomainId, MboConstants.NOACCESSCHECK);
          condMbo.setValue("VALUEID", newValueId, MboConstants.NOACCESSCHECK);
          condMbo.setValue("CONDITIONNUM", conditionnum);
          // OBJECTNAME 是联合主键一部分, 仅新增时可写(可空), 已存在记录只读不可更新
          condMbo.setValue("OBJECTNAME", objectname);
        }
        matchedKeys[key] = true;
        logger.info("已保存 MAXDOMVALCOND 记录: " + key);
      }
    }

    // syncFlag=true: 删除 JSON 中未包含的多余旧条件记录
    if (syncFlag === true) {
      var oldMbo = condSet.moveFirst();
      while (oldMbo) {
        var nextMbo = condSet.moveNext();
        var oldObj = oldMbo.getString("OBJECTNAME");
        var oldKey = oldMbo.getString("CONDITIONNUM") + "||" + (oldObj === null ? "" : oldObj);
        if (!matchedKeys[oldKey]) {
          oldMbo.delete();
          logger.info("同步删除多余 MAXDOMVALCOND 记录: " + oldKey);
        }
        oldMbo = nextMbo;
      }
    }
    // 显式保存: 本集合会在父集 save 前被 close/cleanup, 不先 save 新增/删除不会落库
    condSet.save();
  } finally {
    _close(condSet);
  }
}

/** 保存或更新 ALNDOMAIN 子记录(主键 VALUE) */
function saveOrUpdateAlnDomain(alndomainSet, alndomainDatas) {
  if (!alndomainDatas || !Array.isArray(alndomainDatas) || alndomainDatas.length === 0) {
    logger.info("没有 ALNDOMAIN 数据需要处理");
    return;
  }
  logger.info("开始处理 " + alndomainDatas.length + " 条 ALNDOMAIN 记录");
  for (var i = 0; i < alndomainDatas.length; i++) {
    var alnData = alndomainDatas[i];
    try {
      var value = alnData.value;
      var description = alnData.description;
      if (!value) {
        logger.warn("第 " + (i + 1) + " 条 ALNDOMAIN 记录的 value 为空，跳过");
        continue;
      }
      if (alnData._delete && syncFlag !== true) {
        logger.info("syncFlag 非 true, 跳过删除 ALNDOMAIN 记录: VALUE=" + value);
        continue;
      }
      var alnMbo = alndomainSet.moveFirst();
      while (alnMbo) {
        if (alnMbo.getString("VALUE") == value) {
          break;
        }
        alnMbo = alndomainSet.moveNext();
      }
      if (alnData._delete) {
        if (alnMbo != null) {
          alnMbo.delete();
          logger.info("已删除 ALNDOMAIN 记录: VALUE=" + value);
        }
      } else {
        if (!alnMbo) {
          alnMbo = alndomainSet.add();
          alnMbo.setValue("VALUE", alnData.value);
        }
        if (typeof description !== 'undefined' && description) {
          alnMbo.setValue("DESCRIPTION", description);
        }
        if (typeof alnData.maxvalue !== 'undefined' && alnData.maxvalue) {
          alnMbo.setValue("MAXVALUE", alnData.maxvalue);
        }
        if (alnData.defaultvalue !== 'undefined' && alnData.defaultvalue) {
          alnMbo.setValue("DEFAULTVALUE", alnData.defaultvalue);
        }
        if (typeof alnData.orgid !== 'undefined' && alnData.orgid) {
          alnMbo.setValue("ORGID", alnData.orgid);
        }
        if (typeof alnData.siteid !== 'undefined' && alnData.siteid) {
          alnMbo.setValue("SITEID", alnData.siteid);
        }
        // 同步域值条件子记录 MAXDOMVALCOND
        saveOrUpdateMaxDomValCond(alnMbo, alnData.maxdomvalcond);
        logger.info("已保存 ALNDOMAIN 记录: VALUE=" + value);
      }
    } catch (error) {
      logger.error("处理第 " + (i + 1) + " 条 ALNDOMAIN 记录失败: " + error);
    }
  }
  logger.info("ALNDOMAIN 记录处理完成");
}

/** 保存或更新 SYNONYMDOMAIN 子记录(主键 MAXVALUE+VALUE) */
function saveOrUpdateSynonymDomain(synonymdomainSet, datas) {
  if (!datas || !Array.isArray(datas) || datas.length === 0) {
    logger.info("没有 SYNONYMDOMAIN 数据需要处理");
    return;
  }
  logger.info("开始处理 " + datas.length + " 条 SYNONYMDOMAIN 记录");
  for (var i = 0; i < datas.length; i++) {
    var data = datas[i];
    try {
      var maxvalue = data.maxvalue;
      var value = data.value;
      if (!maxvalue || !value) {
        logger.warn("第 " + (i + 1) + " 条 SYNONYMDOMAIN 记录的 maxvalue/value 不能为空，跳过");
        continue;
      }
      if (data._delete && syncFlag !== true) {
        logger.info("syncFlag 非 true, 跳过删除 SYNONYMDOMAIN 记录: " + maxvalue + "/" + value);
        continue;
      }
      var synMbo = synonymdomainSet.moveFirst();
      while (synMbo) {
        if (synMbo.getString("MAXVALUE") == maxvalue && synMbo.getString("VALUE") == value) {
          break;
        }
        synMbo = synonymdomainSet.moveNext();
      }
      if (data._delete) {
        if (synMbo != null) {
          synMbo.delete();
          logger.info("已删除 SYNONYMDOMAIN 记录: " + maxvalue + "/" + value);
        }
      } else {
        if (!synMbo) {
          synMbo = synonymdomainSet.add();
          synMbo.setValue("MAXVALUE", maxvalue);
          synMbo.setValue("VALUE", value);
        }
        if (data.description) { synMbo.setValue("DESCRIPTION", data.description); }
        if (data.defaults) { synMbo.setValue("DEFAULTS", data.defaults); }
        if (data.orgid) { synMbo.setValue("ORGID", data.orgid); }
        if (data.siteid) { synMbo.setValue("SITEID", data.siteid); }
        // 同步域值条件子记录 MAXDOMVALCOND
        saveOrUpdateMaxDomValCond(synMbo, data.maxdomvalcond);
        logger.info("已保存 SYNONYMDOMAIN 记录: " + maxvalue + "/" + value);
      }
    } catch (error) {
      logger.error("处理第 " + (i + 1) + " 条 SYNONYMDOMAIN 记录失败: " + error);
    }
  }
  logger.info("SYNONYMDOMAIN 记录处理完成");
}

/** 保存或更新 NUMERICDOMAIN 子记录(主键 VALUE) */
function saveOrUpdateNumericDomain(numericdomainSet, datas) {
  if (!datas || !Array.isArray(datas) || datas.length === 0) {
    logger.info("没有 NUMERICDOMAIN 数据需要处理");
    return;
  }
  logger.info("开始处理 " + datas.length + " 条 NUMERICDOMAIN 记录");
  for (var i = 0; i < datas.length; i++) {
    var data = datas[i];
    try {
      var value = data.value;
      if (value === undefined || value === null || value === "") {
        logger.warn("第 " + (i + 1) + " 条 NUMERICDOMAIN 记录的 value 不能为空，跳过");
        continue;
      }
      if (data._delete && syncFlag !== true) {
        logger.info("syncFlag 非 true, 跳过删除 NUMERICDOMAIN 记录: VALUE=" + value);
        continue;
      }
      var numMbo = numericdomainSet.moveFirst();
      while (numMbo) {
        if (String(numMbo.getString("VALUE")) == String(value)) {
          break;
        }
        numMbo = numericdomainSet.moveNext();
      }
      if (data._delete) {
        if (numMbo != null) {
          numMbo.delete();
          logger.info("已删除 NUMERICDOMAIN 记录: VALUE=" + value);
        }
      } else {
        if (!numMbo) {
          numMbo = numericdomainSet.add();
          numMbo.setValue("VALUE", value);
        }
        if (data.description) { numMbo.setValue("DESCRIPTION", data.description); }
        if (data.orgid) { numMbo.setValue("ORGID", data.orgid); }
        if (data.siteid) { numMbo.setValue("SITEID", data.siteid); }
        // 同步域值条件子记录 MAXDOMVALCOND
        saveOrUpdateMaxDomValCond(numMbo, data.maxdomvalcond);
        logger.info("已保存 NUMERICDOMAIN 记录: VALUE=" + value);
      }
    } catch (error) {
      logger.error("处理第 " + (i + 1) + " 条 NUMERICDOMAIN 记录失败: " + error);
    }
  }
  logger.info("NUMERICDOMAIN 记录处理完成");
}

/** 保存或更新 NUMRANGEDOMAIN 子记录(主键 RANGESEGMENT) */
function saveOrUpdateNumRangeDomain(numrangedomainSet, datas) {
  if (!datas || !Array.isArray(datas) || datas.length === 0) {
    logger.info("没有 NUMRANGEDOMAIN 数据需要处理");
    return;
  }
  logger.info("开始处理 " + datas.length + " 条 NUMRANGEDOMAIN 记录");
  for (var i = 0; i < datas.length; i++) {
    var data = datas[i];
    try {
      var rangesegment = data.rangesegment;
      if (rangesegment === undefined || rangesegment === null || rangesegment === "") {
        logger.warn("第 " + (i + 1) + " 条 NUMRANGEDOMAIN 记录的 rangesegment 不能为空，跳过");
        continue;
      }
      if (data._delete && syncFlag !== true) {
        logger.info("syncFlag 非 true, 跳过删除 NUMRANGEDOMAIN 记录: RANGESEGMENT=" + rangesegment);
        continue;
      }
      var nrMbo = numrangedomainSet.moveFirst();
      while (nrMbo) {
        if (String(nrMbo.getInt("RANGESEGMENT")) == String(rangesegment)) {
          break;
        }
        nrMbo = numrangedomainSet.moveNext();
      }
      if (data._delete) {
        if (nrMbo != null) {
          nrMbo.delete();
          logger.info("已删除 NUMRANGEDOMAIN 记录: RANGESEGMENT=" + rangesegment);
        }
      } else {
        if (!nrMbo) {
          nrMbo = numrangedomainSet.add();
          nrMbo.setValue("RANGESEGMENT", rangesegment);
        }
        if (data.rangeminimum !== undefined && data.rangeminimum !== null) { nrMbo.setValue("RANGEMINIMUM", data.rangeminimum); }
        if (data.rangemaximum !== undefined && data.rangemaximum !== null) { nrMbo.setValue("RANGEMAXIMUM", data.rangemaximum); }
        if (data.rangeinterval !== undefined && data.rangeinterval !== null) { nrMbo.setValue("RANGEINTERVAL", data.rangeinterval); }
        if (data.orgid) { nrMbo.setValue("ORGID", data.orgid); }
        if (data.siteid) { nrMbo.setValue("SITEID", data.siteid); }
        logger.info("已保存 NUMRANGEDOMAIN 记录: RANGESEGMENT=" + rangesegment);
      }
    } catch (error) {
      logger.error("处理第 " + (i + 1) + " 条 NUMRANGEDOMAIN 记录失败: " + error);
    }
  }
  logger.info("NUMRANGEDOMAIN 记录处理完成");
}

/** 保存或更新 MAXTABLEDOMAIN(TABLE/CROSSOVER) 子记录, CROSSOVER 含 CROSSOVERDOMAIN 子记录 */
function saveOrUpdateTableDomain(tabledomainSet, datas, domainType) {
  if (!datas || !Array.isArray(datas) || datas.length === 0) {
    logger.info("没有 MAXTABLEDOMAIN 数据需要处理");
    return;
  }
  logger.info("开始处理 " + datas.length + " 条 MAXTABLEDOMAIN 记录");
  for (var i = 0; i < datas.length; i++) {
    var data = datas[i];
    try {
      var objectname = data.objectname;
      if (!objectname) {
        logger.warn("第 " + (i + 1) + " 条 MAXTABLEDOMAIN 记录的 objectname 不能为空，跳过");
        continue;
      }
      if (data._delete && syncFlag !== true) {
        logger.info("syncFlag 非 true, 跳过删除 MAXTABLEDOMAIN 记录: OBJECTNAME=" + objectname);
        continue;
      }
      var tbMbo = tabledomainSet.moveFirst();
      while (tbMbo) {
        if (tbMbo.getString("OBJECTNAME") == objectname) {
          break;
        }
        tbMbo = tabledomainSet.moveNext();
      }
      if (data._delete) {
        if (tbMbo != null) {
          tbMbo.delete();
          logger.info("已删除 MAXTABLEDOMAIN 记录: OBJECTNAME=" + objectname);
        }
        continue;
      }
      if (!tbMbo) {
        tbMbo = tabledomainSet.add();
        tbMbo.setValue("OBJECTNAME", objectname);
      }
      if (data.validtnwhereclause) { tbMbo.setValue("VALIDTNWHERECLAUSE", data.validtnwhereclause); }
      if (data.listwhereclause) { tbMbo.setValue("LISTWHERECLAUSE", data.listwhereclause); }
      if (data.errorresourcbundle) { tbMbo.setValue("ERRORRESOURCBUNDLE", data.errorresourcbundle); }
      if (data.erroraccesskey) { tbMbo.setValue("ERRORACCESSKEY", data.erroraccesskey); }
      if (data.orgid) { tbMbo.setValue("ORGID", data.orgid); }
      if (data.siteid) { tbMbo.setValue("SITEID", data.siteid); }
      logger.info("已保存 MAXTABLEDOMAIN 记录: OBJECTNAME=" + objectname);
      // CROSSOVER 类型: 处理 MAXTABLEDOMAIN 下的 CROSSOVERDOMAIN 子记录
      if (domainType === "CROSSOVER" && data.crossoverdomain) {
        var coSet = tbMbo.getMboSet("CROSSOVERDOMAIN");
        // 显式保存: 本集合会在父集 save 前被 close/cleanup, 不先 save 新增/删除不会落库
        try { saveOrUpdateCrossoverDomain(coSet, data.crossoverdomain); coSet.save(); } finally { _close(coSet); }
      }
    } catch (error) {
      logger.error("处理第 " + (i + 1) + " 条 MAXTABLEDOMAIN 记录失败: " + error);
    }
  }
  logger.info("MAXTABLEDOMAIN 记录处理完成");
}

/** 保存或更新 CROSSOVERDOMAIN(交叉域映射)子记录(主键 SOURCEFIELD+DESTFIELD) */
function saveOrUpdateCrossoverDomain(crossoverdomainSet, datas) {
  if (!datas || !Array.isArray(datas) || datas.length === 0) {
    logger.info("没有 CROSSOVERDOMAIN 数据需要处理");
    return;
  }
  logger.info("开始处理 " + datas.length + " 条 CROSSOVERDOMAIN 记录");
  for (var i = 0; i < datas.length; i++) {
    var data = datas[i];
    try {
      var sourcefield = data.sourcefield;
      var destfield = data.destfield;
      if (!sourcefield || !destfield) {
        logger.warn("第 " + (i + 1) + " 条 CROSSOVERDOMAIN 记录的 sourcefield/destfield 不能为空，跳过");
        continue;
      }
      if (data._delete && syncFlag !== true) {
        logger.info("syncFlag 非 true, 跳过删除 CROSSOVERDOMAIN 记录: " + sourcefield + "->" + destfield);
        continue;
      }
      var coMbo = crossoverdomainSet.moveFirst();
      while (coMbo) {
        if (coMbo.getString("SOURCEFIELD") == sourcefield && coMbo.getString("DESTFIELD") == destfield) {
          break;
        }
        coMbo = crossoverdomainSet.moveNext();
      }
      if (data._delete) {
        if (coMbo != null) {
          coMbo.delete();
          logger.info("已删除 CROSSOVERDOMAIN 记录: " + sourcefield + "->" + destfield);
        }
      } else {
        if (!coMbo) {
          coMbo = crossoverdomainSet.add();
          coMbo.setValue("SOURCEFIELD", sourcefield);
          coMbo.setValue("DESTFIELD", destfield);
        }
        if (data.sourcecondition) { coMbo.setValue("SOURCECONDITION", data.sourcecondition); }
        if (data.destcondition) { coMbo.setValue("DESTCONDITION", data.destcondition); }
        if (data.copyevenifsrcnull) { coMbo.setValue("COPYEVENIFSRCNULL", data.copyevenifsrcnull); }
        if (data.copyonlyifdestnull) { coMbo.setValue("COPYONLYIFDESTNULL", data.copyonlyifdestnull); }
        if (data.sequence !== undefined && data.sequence !== null) { coMbo.setValue("SEQUENCE", data.sequence); }
        logger.info("已保存 CROSSOVERDOMAIN 记录: " + sourcefield + "->" + destfield);
      }
    } catch (error) {
      logger.error("处理第 " + (i + 1) + " 条 CROSSOVERDOMAIN 记录失败: " + error);
    }
  }
  logger.info("CROSSOVERDOMAIN 记录处理完成");
}

// =================================================================================
// 操作(ACTION)批量导入
// 请求体支持: 数组 / {"actions":[...]} / 单个对象, 导出格式同 getAction
// =================================================================================

function importActions(requestData) {
  var items = extractItems(requestData, 'actions');
  if (items.length === 0) {
    throw new MXApplicationException("#", "没有提供操作(ACTION)数据");
  }
  logger.info("开始批量导入 " + items.length + " 个操作(ACTION)");
  return runBatchImport(items, 'action', function (data, index) {
    var name = data.action;
    if (!name) {
      throw new MXApplicationException("#", "第 " + index + " 个操作的 action（操作名称）不能为空");
    }
    saveOrUpdateAction(data, name);
  });
}

/**
 * 保存或更新单个 ACTION(GROUP 类型含 ACTION_MEMBERS 成员)
 */
function saveOrUpdateAction(data, name) {
  /** @type {psdi.mbo.MboSetRemote} */
  var actionSet = null;
  try {
    actionSet = MXServer.getMXServer().getMboSet("ACTION", userInfo);
    var sqlf = new SqlFormat("action = :1");
    sqlf.setObject(1, "ACTION", "ACTION", name);
    actionSet.setWhere(sqlf.format());
    actionSet.reset();

    /** @type {psdi.mbo.MboRemote} */
    var actionMbo;
    if (actionSet.isEmpty()) {
      if (data._delete) {
        return;
      }
      logger.info("创建新操作: " + name);
      actionMbo = actionSet.add();
      actionMbo.setValue("ACTION", name);
    } else {
      actionMbo = actionSet.getMbo(0);
      if (data._delete) {
        logger.info("删除操作: " + name);
        actionMbo.delete();
        actionSet.save();
        return;
      }
      logger.info("更新现有操作: " + name);
    }

    if (data.description) {
      actionMbo.setValue("DESCRIPTION", data.description);
    }
    // TYPE 新建后通常只读, 仅可写时设置
    if (data.type && !actionMbo.getMboValueData("TYPE").isReadOnly()) {
      actionMbo.setValue("TYPE", data.type, 2);
    }
    setStrValue(actionMbo, "USEWITH", data.useWith);
    setStrValue(actionMbo, "SENDERSYSID", data.senderSysId);

    var type = String(actionMbo.getString("TYPE") || "").toUpperCase();
    // CUSTOM 类型值在 VALUE, 其它类型在 VALUE2
    if (data.value !== undefined && data.value !== null && data.value !== "") {
      if (type === "CUSTOM") {
        actionMbo.setValue("VALUE", data.value);
      } else {
        actionMbo.setValue("VALUE2", data.value);
      }
    }
    if (type !== "GROUP") {
      setStrValue(actionMbo, "OBJECTNAME", data.objectName);
      setStrValue(actionMbo, "PARAMETER", data.parameter);
    }
    if (type === "CHANGESTATUS") {
      setStrValue(actionMbo, "MEMO", data.memo);
    }

    // GROUP 类型: 组成员 ACTION_MEMBERS
    if (data.actionGroup && Array.isArray(data.actionGroup) && data.actionGroup.length > 0) {
      var groupSet = actionMbo.getMboSet("ACTION_MEMBERS");
      try {
        for (var i = 0; i < data.actionGroup.length; i++) {
          var g = data.actionGroup[i];
          if (!g.member) {
            logger.warn("第 " + (i + 1) + " 个组成员的 member 为空，跳过");
            continue;
          }
          var gm = findMboByAttr(groupSet, "MEMBER", g.member);
          if (g._delete) {
            if (gm != null) {
              gm.delete();
              logger.info("已删除操作组成员: " + g.member);
            }
          } else {
            if (!gm) {
              gm = groupSet.add();
              gm.setValue("MEMBER", g.member);
            }
            if (g.sequence !== undefined && g.sequence !== null) {
              gm.setValue("SEQUENCE", g.sequence);
            }
          }
        }
        groupSet.save();
      } finally {
        _close(groupSet);
      }
    }

    actionSet.save();
    logger.info("操作保存成功: ACTION=" + name + ", TYPE=" + type);
  } catch (error) {
    logger.error("保存 ACTION 失败: " + name + ", " + error);
    throw new MXApplicationException("#", "保存操作失败: " + name + ", " + (error.message || String(error)));
  } finally {
    _close(actionSet);
  }
}

// =================================================================================
// 对象结构(MAXINTOBJECT)批量查询/导出/导入
// =================================================================================

/**
 * 对象结构列表查询(内存分页), 返回 {integrationobjects:[行], total, pageNum, pageSize}
 */
function intObjectListResponse(requestData) {
  /** @type {psdi.mbo.MboSetRemote} */
  var maxIntObjectSet = null;
  try {
    if (!requestData) {
      throw new MXApplicationException("#", "请求体(requestBody)不能为空");
    }
    var whereClause = qualifyIntObjectDescriptionWhere(requestData.where || "1=1");
    var pager = readPager(requestData);

    maxIntObjectSet = MXServer.getMXServer().getMboSet("MAXINTOBJECT", userInfo);
    maxIntObjectSet.setWhere(whereClause);
    maxIntObjectSet.setOrderBy("INTOBJECTNAME");
    maxIntObjectSet.reset();

    var total = maxIntObjectSet.count();
    logger.info("[" + scriptName + "] integrationobjects list, 过滤条件: " + whereClause + ", 共 " + total + " 条");

    var rows = [];
    var mbo = maxIntObjectSet.moveFirst();
    var idx = 0;
    while (mbo) {
      if (!pager.hasPagination || (idx >= (pager.pageNum - 1) * pager.pageSize && idx < pager.pageNum * pager.pageSize)) {
        rows.push(buildIntObjectListRow(mbo));
      }
      idx++;
      mbo = maxIntObjectSet.moveNext();
    }

    var result = { integrationobjects: rows };
    if (pager.hasPagination) {
      result.total = total;
      result.pageNum = pager.pageNum;
      result.pageSize = pager.pageSize;
    }
    return JSON.stringify(result);
  } catch (error) {
    logger.error("[" + scriptName + "] 查询对象结构列表失败: " + error);
    return JSON.stringify({ status: "error", message: error.message ? error.message : error.toString() });
  } finally {
    _close(maxIntObjectSet);
  }
}

/**
 * 对象结构批量完整导出(含 MAXINTOBJDETAIL/COLS/ALIAS 等全部子记录), 返回 {integrationobjects:[...]}
 */
function intObjectExportResponse(requestData) {
  /** @type {psdi.mbo.MboSetRemote} */
  var maxIntObjectSet = null;
  try {
    if (!requestData) {
      throw new MXApplicationException("#", "请求体(requestBody)不能为空");
    }
    var whereClause = qualifyIntObjectDescriptionWhere(requestData.where || "1=1");

    maxIntObjectSet = MXServer.getMXServer().getMboSet("MAXINTOBJECT", userInfo);
    maxIntObjectSet.setWhere(whereClause);
    maxIntObjectSet.setOrderBy("INTOBJECTNAME");
    maxIntObjectSet.reset();

    var arr = [];
    var mbo = maxIntObjectSet.moveFirst();
    while (mbo) {
      arr.push(buildIntObject(mbo));
      mbo = maxIntObjectSet.moveNext();
    }
    logger.info("[" + scriptName + "] integrationobjects export 完成, 共 " + arr.length + " 个");
    return JSON.stringify({ integrationobjects: arr });
  } catch (error) {
    logger.error("[" + scriptName + "] 导出对象结构失败: " + error);
    return JSON.stringify({ status: "error", message: error.message ? error.message : error.toString() });
  } finally {
    _close(maxIntObjectSet);
  }
}

/**
 * 列表行(精简字段)
 */
function buildIntObjectListRow(mbo) {
  var row = {
    id: mbo.getUniqueIDValue(),
    intobjectname: mbo.getString("INTOBJECTNAME"),
    description: mbo.getString("DESCRIPTION"),
    usewith: mbo.getString("USEWITH")
  };
  if (mbo.getBoolean("QUERYONLY")) {
    row.queryonly = true;
  }
  if (mbo.getBoolean("FLATSUPPORTED")) {
    row.flatsupported = true;
  }
  if (mbo.getBoolean("LOADQUERYFROMAPP")) {
    row.loadqueryfromapp = true;
  }
  if (!mbo.isNull("AUTHAPP")) {
    row.authapp = mbo.getString("AUTHAPP");
  }
  if (!mbo.isNull("MODULE")) {
    row.module = mbo.getString("MODULE");
  }
  if (apiType !== 'exp') {
    jsPutLangField(row, "description_zh", mbo, "DESCRIPTION", "ZH");
    jsPutLangField(row, "description_en", mbo, "DESCRIPTION", "EN");
  }
  return row;
}

/** 处理 where 中 DESCRIPTION 列歧义(L_MAXINTOBJECT 与 MAXINTOBJECT 均有 DESCRIPTION) */
function qualifyIntObjectDescriptionWhere(whereClause) {
  if (!whereClause || whereClause === "1=1") return whereClause;
  whereClause = whereClause.replace(/UPPER\(\s*DESCRIPTION\s*\)\s*(LIKE|=|<>|!=)\s*UPPER\(\s*'([^']*)'\s*\)/gi, function (m, op, val) {
    return "(UPPER(L_MAXINTOBJECT.DESCRIPTION) " + op + " UPPER('" + val + "') OR UPPER(MAXINTOBJECT.DESCRIPTION) " + op + " UPPER('" + val + "'))";
  });
  whereClause = whereClause.replace(/\bDESCRIPTION\b\s*(LIKE|=|<>|!=)\s*'([^']*)'/gi, function (m, op, val) {
    return "(L_MAXINTOBJECT.DESCRIPTION " + op + " '" + val + "' OR MAXINTOBJECT.DESCRIPTION " + op + " '" + val + "')";
  });
  return whereClause;
}

/**
 * 对象结构批量导入
 * 请求体支持: 数组 / {"integrationobjects":[...]} / 单个对象, 导出格式同 buildIntObject
 */
function importIntObjects(requestData) {
  var items = extractItems(requestData, 'integrationobjects');
  if (items.length === 0) {
    throw new MXApplicationException("#", "没有提供对象结构(MAXINTOBJECT)数据");
  }
  logger.info("开始批量导入 " + items.length + " 个对象结构");
  return runBatchImport(items, 'intobjectname', function (data, index) {
    var name = data.intObjectName || data.intobjectname;
    if (!name) {
      throw new MXApplicationException("#", "第 " + index + " 个对象结构的 intObjectName（对象结构名称）不能为空");
    }
    saveOrUpdateIntObject(data, name);
  });
}

/**
 * 保存或更新单个对象结构(MAXINTOBJECT + MAXINTOBJDETAIL + MAXINTOBJCOLS + MAXINTOBJALIAS)
 */
function saveOrUpdateIntObject(data, name) {
  /** @type {psdi.mbo.MboSetRemote} */
  var intObjSet = null;
  try {
    intObjSet = MXServer.getMXServer().getMboSet("MAXINTOBJECT", userInfo);
    var sqlf = new SqlFormat("intobjectname = :1");
    sqlf.setObject(1, "MAXINTOBJECT", "INTOBJECTNAME", name);
    intObjSet.setWhere(sqlf.format());
    intObjSet.reset();

    /** @type {psdi.mbo.MboRemote} */
    var intObjMbo;
    if (intObjSet.isEmpty()) {
      if (data._delete) {
        return;
      }
      logger.info("创建新对象结构: " + name);
      intObjMbo = intObjSet.add();
      intObjMbo.setValue("INTOBJECTNAME", name);
    } else {
      intObjMbo = intObjSet.getMbo(0);
      if (data._delete) {
        logger.info("删除对象结构: " + name);
        intObjMbo.delete();
        intObjSet.save();
        return;
      }
      logger.info("更新现有对象结构: " + name);
    }

    setStrValue(intObjMbo, "DESCRIPTION", data.description);
    setStrValue(intObjMbo, "USEWITH", data.useWith);
    setYornValue(intObjMbo, "QUERYONLY", data.queryOnly);
    setYornValue(intObjMbo, "FLATSUPPORTED", data.flatSupported);
    setYornValue(intObjMbo, "LOADQUERYFROMAPP", data.loadQueryFromApp);
    // USEOSSECURITY 为新版字段, 旧版环境 MBO 元数据中不存在时跳过
    if (_attributeExists("MAXINTOBJECT", "USEOSSECURITY")) {
      setYornValue(intObjMbo, "USEOSSECURITY", data.useOsSecurity);
    }
    setYornValue(intObjMbo, "SELFREFERENCING", data.selfReferencing);
    setStrValue(intObjMbo, "AUTHAPP", data.authApp);
    setStrValue(intObjMbo, "DEFCLASS", data.defClass);
    setStrValue(intObjMbo, "PROCCLASS", data.procClass);
    setStrValue(intObjMbo, "SEARCHATTRS", data.searchAttrs);
    setStrValue(intObjMbo, "RESTRICTWHERE", data.restrictWhere);
    setStrValue(intObjMbo, "MODULE", data.module);
    if (_attributeExists("MAXINTOBJECT", "AUTOPAGINGTHRESHOLD") && data.autoPagingThreshold !== undefined && data.autoPagingThreshold !== null && data.autoPagingThreshold !== -1) {
      // 值相同跳过(系统对象该字段可能只读)
      var curAutoPaging = getInt(intObjMbo, "AUTOPAGINGTHRESHOLD");
      if (curAutoPaging === null || curAutoPaging !== data.autoPagingThreshold) {
        intObjMbo.setValue("AUTOPAGINGTHRESHOLD", data.autoPagingThreshold);
      }
    }

    // 子记录: MAXINTOBJDETAIL(含 MAXINTOBJCOLS / MAXINTOBJALIAS)
    if (data.maxIntObjDetail && Array.isArray(data.maxIntObjDetail) && data.maxIntObjDetail.length > 0) {
      var detailSet = intObjMbo.getMboSet("MAXINTOBJDETAIL");
      try {
        // 拓扑排序: 父明细必须先于子明细进入同一 MboSet, 否则新增行设置 PARENTOBJNAME 时找不到父(FldParentObjName.validate)
        var orderedDetails = orderIntObjDetails(data.maxIntObjDetail);
        for (var i = 0; i < orderedDetails.length; i++) {
          saveOrUpdateIntObjDetail(detailSet, orderedDetails[i], i + 1);
        }
        detailSet.save();
      } finally {
        _close(detailSet);
      }
    }

    intObjSet.save();
    logger.info("对象结构保存成功: INTOBJECTNAME=" + name);
  } catch (error) {
    logger.error("保存对象结构失败: " + name + ", " + (error && error.message ? error.message : String(error)));
    throw new MXApplicationException("#", "保存对象结构失败: " + name + ", " + (error.message || String(error)));
  } finally {
    _close(intObjSet);
  }
}

/**
 * 明细数组按 parentObjName 拓扑排序(父先于子)。
 * 父不在数组中(已在库中)时无需等待; 环引用时按原顺序保护, 避免死循环。
 */
function orderIntObjDetails(details) {
  var byName = {};
  for (var i = 0; i < details.length; i++) {
    if (details[i].objectName) {
      byName[String(details[i].objectName).toUpperCase()] = details[i];
    }
  }
  var state = {}; // 1=访问中, 2=已输出
  var ordered = [];
  function visit(d) {
    var key = String(d.objectName).toUpperCase();
    if (state[key] === 2) {
      return;
    }
    if (state[key] === 1) {
      return; // 环保护
    }
    state[key] = 1;
    if (d.parentObjName) {
      var pKey = String(d.parentObjName).toUpperCase();
      if (byName[pKey]) {
        visit(byName[pKey]);
      }
    }
    state[key] = 2;
    ordered.push(d);
  }
  for (var j = 0; j < details.length; j++) {
    visit(details[j]);
  }
  return ordered;
}

/**
 * 清空明细的 NP/EXCLUDE 非持久化临时集(NONPERSISTENTNP/EXCLUDENP)。
 * 这些临时集在新建明细时由框架自动勾选(如 DOCLINKS 的非持久列默认全选),
 * MaxIntObjectDetail.save() 的 npTOpFillUp 会据勾选自动补插 MAXINTOBJCOLS,
 * 与脚本手动新增的列重复导致唯一索引冲突。清空后 npTOpFillUp 空转, 不影响已落库行。
 */
function _clearNpTempSet(detailMbo, relName) {
  var tempSet = null;
  try {
    // 注意: 不能 close/cleanup —— 否则 npTOpFillUp 重新 getMboSet 会重新初始化勾选, 修复失效
    tempSet = detailMbo.getMboSet(relName);
    tempSet.deleteAndRemoveAll();
  } catch (e) {
    logger.warn("清空临时集 " + relName + " 失败: " + (e && e.message ? e.message : String(e)));
  }
}

/**
 * 保存或更新对象结构明细 MAXINTOBJDETAIL(主键 OBJECTNAME), 含字段与别名字记录
 */
function saveOrUpdateIntObjDetail(detailSet, detailData, index) {
  var objectName = detailData.objectName;
  if (!objectName) {
    throw new MXApplicationException("#", "第 " + index + " 个对象结构明细的 objectName 不能为空");
  }
  var detailMbo = findMboByAttr(detailSet, "OBJECTNAME", objectName);
  if (detailData._delete) {
    if (detailMbo != null) {
      detailMbo.delete();
      logger.info("已删除对象结构明细: " + objectName);
    }
    return;
  }
  var isNewDetail = !detailMbo;
  if (isNewDetail) {
    logger.info("新增对象结构明细: " + objectName);
    detailMbo = detailSet.add();
    detailMbo.setValue("OBJECTNAME", objectName);
    // 建立父子层级: PARENTOBJNAME 为非持久化字段, FldParentObjName.action 会在同一明细集中按名字
    // 找到父明细并写持久化的 PARENTOBJID/HIERARCHYPATH; 必须在 RELATION 之前设置(action 会清空 RELATION),
    // 且只有新增行可设(已保存行 validate 抛 cant_change_prntmbo_aftersave); 带 2 忽略 CONFIGURABLE=0 的只读,
    // field class 的 validate/action 仍会执行(2=NOACCESSCHECK 只绕权限不绕校验)
    if (detailData.parentObjName) {
      detailMbo.setValue("PARENTOBJNAME", detailData.parentObjName, 2);
    }
  }

  // 子表保存: setValue 统一带 NOACCESSCHECK(2) 忽略系统交付对象的只读标志
  setStrValue(detailMbo, "ALTKEY", detailData.altKey, 2);
  setYornValue(detailMbo, "EXCLUDEBYDEFAULT", detailData.excludeByDefault, 2);
  setYornValue(detailMbo, "SKIPKEYUPDATE", detailData.skipKeyUpdate, 2);
  setYornValue(detailMbo, "EXCLUDEPARENTKEY", detailData.excludeParentKey, 2);
  setYornValue(detailMbo, "DELETEONCREATE", detailData.deleteOnCreate, 2);
  setYornValue(detailMbo, "PROPAGATEEVENT", detailData.propagateEvent, 2);
  setYornValue(detailMbo, "INVOKEEXECUTE", detailData.invokeExecute, 2);
  setStrValue(detailMbo, "FDRESOURCE", detailData.fdResource, 2);
  setStrValue(detailMbo, "RELATION", detailData.relation, 2);
  // OBJECTORDER 已存在记录上只读, 带 2 强写以保持导入顺序(新增行 FldParentObjName.action 已按同父兄弟自动编号, 通常与 JSON 一致而跳过)
  // PARENTOBJID 为持久化外键, 不在此直写——新增行由 PARENTOBJNAME 的 field action 自动解析写入
  if (detailData.objectOrder !== undefined && detailData.objectOrder !== null) {
    var curOrder = getInt(detailMbo, "OBJECTORDER");
    if (curOrder === null || curOrder !== detailData.objectOrder) {
      detailMbo.setValue("OBJECTORDER", detailData.objectOrder, 2);
    }
  }

  // 子记录: MAXINTOBJCOLS(持久化字段, 主键 NAME)
  if (detailData.maxIntObjCols && Array.isArray(detailData.maxIntObjCols) && detailData.maxIntObjCols.length > 0) {
    var colsSet = detailMbo.getMboSet("MAXINTOBJCOLS");
    try {
      for (var c = 0; c < detailData.maxIntObjCols.length; c++) {
        var colData = detailData.maxIntObjCols[c];
        if (!colData.name) {
          continue;
        }
        var colMbo = findMboByAttr(colsSet, "NAME", colData.name);
        if (colData._delete) {
          if (colMbo != null) {
            colMbo.delete();
          }
        } else {
          if (!colMbo) {
            colMbo = colsSet.add();
            colMbo.setValue("NAME", colData.name);
          }
          // INTOBJFLDTYPE 框架保存时按 isExclude/isNonPersistent 重算, 带 2 写回与导出保持一致
          setStrValue(colMbo, "INTOBJFLDTYPE", colData.intObjFldType, 2);
        }
      }
      // 新建明细时框架自动填充 NONPERSISTENTNP/EXCLUDENP 临时集(如 DOCLINKS 非持久列默认全勾选),
      // detail.save() 的 npTOpFillUp 会把勾选项自动插入 MAXINTOBJCOLS, 与上面手动 add 的行重复 → DB2 -803。
      // 清空临时集, 列全部以本脚本手动写入的 MAXINTOBJCOLS 集为准(空集不会触发自动删除已有行)。
      _clearNpTempSet(detailMbo, "NONPERSISTENTNP");
      _clearNpTempSet(detailMbo, "EXCLUDENP");
      colsSet.save();
    } finally {
      _close(colsSet);
    }
  }

  // 子记录: MAXINTOBJALIAS(字段别名, 主键 NAME)
  if (detailData.maxIntObjAlias && Array.isArray(detailData.maxIntObjAlias) && detailData.maxIntObjAlias.length > 0) {
    var aliasSet = detailMbo.getMboSet("MAXINTOBJALIAS");
    try {
      for (var a = 0; a < detailData.maxIntObjAlias.length; a++) {
        var aliasData = detailData.maxIntObjAlias[a];
        if (!aliasData.name) {
          continue;
        }
        var aliasMbo = findMboByAttr(aliasSet, "NAME", aliasData.name);
        if (aliasData._delete) {
          if (aliasMbo != null) {
            aliasMbo.delete();
          }
        } else {
          if (!aliasMbo) {
            aliasMbo = aliasSet.add();
            aliasMbo.setValue("NAME", aliasData.name);
          }
          setStrValue(aliasMbo, "ALIASNAME", aliasData.aliasName, 2);
        }
      }
      aliasSet.save();
    } finally {
      _close(aliasSet);
    }
  }
}

// =================================================================================
// 通用辅助方法
// =================================================================================

/**
 * 从请求体读取分页参数(pageNum/pageSize)
 */
function readPager(requestData) {
  var pageNum = requestData.pageNum;
  var pageSize = requestData.pageSize;
  var hasPagination = pageNum && pageSize;
  return {
    hasPagination: !!hasPagination,
    pageNum: hasPagination ? parseInt(pageNum) : 1,
    pageSize: hasPagination ? parseInt(pageSize) : 0
  };
}

/**
 * 从请求体提取导入数组:
 *   {data:[...]} / {wrapperKey:[...]} / 直接数组 / 单个对象
 */
function extractItems(requestData, wrapperKey) {
  if (!requestData) {
    throw new MXApplicationException("#", "请求体(requestBody)不能为空");
  }
  if (Array.isArray(requestData)) {
    return requestData;
  }
  if (requestData.data && Array.isArray(requestData.data)) {
    return requestData.data;
  }
  if (wrapperKey && requestData[wrapperKey] && Array.isArray(requestData[wrapperKey])) {
    return requestData[wrapperKey];
  }
  return [requestData];
}

/**
 * 批量导入执行器: 逐条调用 saveFn, 汇总成功/失败结果
 * @param {Array} items - 数据数组
 * @param {string} keyName - 结果行中标识字段名(action/intobjectname)
 * @param {function} saveFn - 保存函数 (data, index)
 * @returns {string} JSON 字符串
 */
function runBatchImport(items, keyName, saveFn) {
  var resultList = [];
  var successCount = 0;
  var failedCount = 0;
  for (var i = 0; i < items.length; i++) {
    var data = items[i];
    var keyVal = (data && (data[keyName] || data.intObjectName || data.intobjectname)) || "未知";
    try {
      saveFn(data, i + 1);
      successCount++;
      if (!_ignoreResultSuccess) {
        var okRow = {};
        okRow[keyName] = keyVal;
        okRow.status = "SUCCESS";
        okRow.message = "保存成功";
        resultList.push(okRow);
      }
    } catch (error) {
      logger.error("处理第 " + (i + 1) + " 条记录失败: ", error);
      failedCount++;
      var failRow = {};
      failRow[keyName] = keyVal;
      failRow.status = "FAILED";
      failRow.message = error.message ? error.message : String(error);
      resultList.push(failRow);
    }
  }
  var responseData = {
    status: "success",
    message: "批量导入完成",
    summary: {
      total: items.length,
      success: successCount,
      failed: failedCount
    },
    result: resultList
  };
  return JSON.stringify(responseData, null, 4);
}

/**
 * 在 MboSet 中按字符串属性查找第一条匹配记录, 找不到返回 null
 */
function findMboByAttr(mboSet, attr, value) {
  var mbo = mboSet.moveFirst();
  while (mbo) {
    if (String(mbo.getString(attr)) == String(value)) {
      return mbo;
    }
    mbo = mboSet.moveNext();
  }
  return null;
}

/**
 * 字符串属性: 值非空且与当前值不同时才写入。
 * 值相同则跳过: 回导/同步场景天然幂等, 同时规避系统交付对象主记录只读字段的 BMXAA0019I。
 * flags=2(NOACCESSCHECK) 时忽略只读标志, 用于子表保存逻辑。
 */
function setStrValue(mbo, attr, val, flags) {
  if (val === undefined || val === null || val === "") {
    return;
  }
  try {
    if (mbo.getString(attr) === String(val)) {
      return;
    }
  } catch (ignoreIgnore) { }
  if (flags === 2) {
    mbo.setValue(attr, val, 2);
  } else {
    mbo.setValue(attr, val);
  }
}

/**
 * YORN 属性: 显式传入 true/false 且与当前值不同时写入 1/0, undefined 时保持原值。
 * 子表字段统一带 NOACCESSCHECK(2) 忽略只读; flags 可覆盖。
 */
function setYornValue(mbo, attr, val, flags) {
  if (val !== true && val !== false) {
    return;
  }
  var target = val ? 1 : 0;
  try {
    var cur = mbo.getString(attr);
    if ((cur === "1" || cur === "Y") && target === 1) {
      return;
    }
    if ((cur === "0" || cur === "N" || cur === "") && target === 0) {
      return;
    }
  } catch (ignoreIgnore) { }
  mbo.setValue(attr, target, flags === undefined ? 2 : flags);
}

/** 向原生 JS 对象写入指定语言的描述字段 */
function jsPutLangField(obj, jsonKey, mbo, attr, langCode) {
  try {
    var val = mbo.getString(attr, langCode);
    if (val !== null && val !== "") {
      obj[jsonKey] = val;
    }
  } catch (e) { }
}