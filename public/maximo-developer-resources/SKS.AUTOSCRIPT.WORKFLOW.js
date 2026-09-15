// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load('nashorn:mozilla_compat.js');

// =============================================================================
// SKS.AUTOSCRIPT.WORKFLOW
// 工作流(WFPROCESS)定义、操作(ACTION)、角色(MAXROLE) 的导出/导入脚本,
// 接口风格与 SKS.AUTOSCRIPT.OBJECTS 保持一致。
//
// 调用方式(HTTP POST):
//   http://<host>/maximo/api/script/SKS.AUTOSCRIPT.WORKFLOW?_langcode=ZH&_type=<workflows|actions|maxroles>
//        &_action=<list|detail|export|import>&_impMode=<migration|add>&_enable=<true|false>
//        &_refs=<true|false>&_ignoreResultSuccess=<true|false>
//
// URL 参数:
//   _action  必填: list=列表 / detail=单条完整导出 / export=批量完整导出 / import=导入
//   _type    可选: workflows(缺省, 工作流) / actions(操作 ACTION) / maxroles(角色 MAXROLE),
//                  未给时按请求体推断(只含 actions 或 maxroles 时按对应类型导入)
//   _impMode 可选: migration(缺省)=按 WFPROCESS 的 PROCESSNAME+PROCESSREV 匹配, 存在则修改, 不存在则新增;
//                  add=新增, 已存在的主记录与子记录不做修改, 只补齐缺失的子记录
//   _enable  可选: 缺省 true=导入后按源定义调用框架 validateProcess/enableProcess/makeProcessActive
//                  启用并激活工作流(定义校验不通过则保持草稿, 校验信息在返回结果中给出);
//                  false=只导入定义, 不改变目标环境原有的启用/激活状态(新增记录保持草稿状态)。
//                  注: 源 enabled=false 时不会主动停用目标环境已启用的工作流
//   _refs    可选: 仅工作流 export 有效; 缺省 true=migration 模式下把流程引用到的
//                  操作(WFACTION.ACTION->ACTION)与角色(WFASSIGNMENT.ROLEID/ESCROLE->MAXROLE)
//                  一并导出, 生成的 JSON 中 actions/maxroles 放在 workflows 之前;
//                  false=只导出工作流定义
//   _langcode 可选: 指定语言(zh/en), 影响描述等语言字段及 WFNODETYPE 域值
//   _ignoreResultSuccess 可选: true=导入结果只返回失败明细
//
// 请求体(POST body, JSON):
//   工作流 list  : {"where":"SQL条件"} / {"processName":"PRCHG","processRev":1}, 可带 pageNum/pageSize
//   工作流 detail: {"id":<WFPROCESSID>} / {"processName":"PRCHG","processRev":1}
//   工作流 export: {"where":"..."} / {"processName":"PRCHG"} —— 与 detail 相同条件, 返回 {"workflows":[...]},
//                  migration 模式(缺省)时前面还会带出流程引用到的 {"actions":[...],"maxroles":[...]}
//   操作 list/export  : {"where":"..."} / {"action":"ACT_XXX"} / 空=全部操作, 可带 pageNum/pageSize
//   操作 detail       : {"id":<ACTIONID>} / {"action":"ACT_XXX"}
//   角色 list/export  : {"where":"..."} / {"maxrole":"ROLE1"} / 空=全部角色, 可带 pageNum/pageSize
//   角色 detail       : {"id":<MAXROLEID>} / {"maxrole":"ROLE1"}
//   导入(任意类型)    : 导出结果原样回导; 工作流导入也接受上面的迁移包(按 操作→角色→工作流 顺序导入),
//                       裸数组或单个对象同样支持
//                       可带 syncFlag:true —— 仅工作流 migration 模式生效: 删除 JSON 中不存在的子记录
//                       (节点/操作/分配/通知/分配组)
//
// 导出的 JSON 结构, 可原样作为导入请求体(工作流 migration 模式导出时 actions/maxroles 在最前面):
//   {
//     "actions": [                         // 操作(ACTION), 供 WFACTION.ACTION 引用; 与 OBJECTS 脚本的 actions 格式一致
//       {"action":"ACT_PRB_DRAFT","description":"...","type":"CHANGESTATUS","useWith":"ALL",
//        "value":"DRAFT","objectName":"IBM_PROBLIST","parameter":"status","memo":"...",
//        "actionGroup":[{"member":"ACT_XXX","sequence":1}]}     // 仅 GROUP 类型有成员
//     ],
//     "maxroles": [                        // 角色(MAXROLE, 含人员组型角色), 供 WFASSIGNMENT.ROLEID/ESCROLE 引用
//       {"maxrole":"1017","description":"...","type":"PERSONGROUP","value":"1017",
//        "objectName":null,"parameter":null,"emailDataSet":false,"broadcast":true}
//     ],
//     "workflows": [ 见下 ]
//   }
//
//   workflows 中单个工作流:
//   {
//     "processName": "SKS_WFDEMO",         // WFPROCESS.PROCESSNAME
//     "processRev": 1,                     // WFPROCESS.PROCESSREV
//     "objectName": "WORKORDER",           // 工作流主对象
//     "description": "演示流程",
//     "enabled": true, "active": true, "autoInitiate": false, "migrated": false,
//     "wfnodes": [                         // WFNODE(节点)及其类型子表
//       {
//         "nodeId": 0,                     // WFNODE.NODEID(同一次修订内唯一, 操作/通知按此关联)
//         "nodeType": "WFSTART",           // WFNODETYPE 域的内部值:
//                                          //   WFSTART/WFSTOP/WFTASK/WFCONDITION/WFINPUT/WFINTERACTION/WFSUBPROCESS/WFWAIT
//         "title": "开始", "description": "开始 0", "x": 1, "y": 1, "imageFile": null,
//         "wftask":       {"app":"WOTRACK","readonly":false,"firstComplete":true,"timelimit":"0",
//                          "calendarBased":false,"displayOne":false,"taskType":null},  // WFTASK
//         "wfcondition":  {"condition":"...","customClass":null},                      // WFCONDITION
//         "wfinput":      {"displayOne":false},                                        // WFINPUT
//         "wfinteraction":{"app":"...","page":"...","relation":"...","directions":"...",
//                          "action":"...","tabName":"...","launchProcess":"...","stayCurrentApp":false}, // WFINTERACTION
//         "wfsubprocess": {"subProcessName":"..."},                                    // WFSUBPROCESS
//         "wfwaitlist":   {"eventName":"..."},                                         // WFWAITLIST
//         "wfactions": [                   // WFACTION: 节点的出线, action 引用 ACTION 表的"操作"
//           {"actionId":1,"isPositive":true,"memberNodeId":1,"sequence":1,
//            "action":"CHANGESTATUS","condition":"...","conditionClass":"...",
//            "instruction":"...","wfnotifications":[{"uniqueId":1,"templateId":"..."}]}
//         ],
//         "wfassignment": [                // WFASSIGNMENT(WFID=0): 角色/人员组(ROLEID->MAXROLE), 关系分配
//           {"assignId":0,"roleId":"ROLE1","relationship":null,"assignCode":null,"description":"...",
//            "priority":null,"timelimit":"0","calendarBased":false,"emailNotification":false,
//            "templateId":null,"condition":null,"conditionClass":null,"acceptExpr":null,
//            "nonAcceptMsg":null,"escRole":null,"app":"WOTRACK","groupNum":null,
//            "separateGroups":false,"keepOrigAssgn":false,"assignStatus":"DRAFT"}
//         ],
//         "wfasgngroup": [{"groupNum":1,"description":"...","firstComplete":true}],    // WFASGNGROUP
//         "wfnotifications": [{"uniqueId":2,"templateId":"..."}]                       // WFNOTIFICATION(ACTIONID=0)
//       }
//     ],
//     "wfnotifications": [{"uniqueId":3,"templateId":"..."}]   // 进程级通知(NODEID=0, ACTIONID=0)
//   }
//
// 子表键名与 Maximo 表/对象名一致(小写): 节点 wfnodes(WFNODE)、出线操作 wfactions(WFACTION)、
// 定义分配 wfassignment(WFASSIGNMENT)、分配组 wfasgngroup(WFASGNGROUP)、通知 wfnotifications(WFNOTIFICATION)、
// 节点类型子表 wftask/wfcondition/wfinput/wfinteraction/wfsubprocess/wfwaitlist。
// 导入时兼容旧键名: nodes/actions/assignments/asgnGroups/notifications/task/condition/input/interaction/subprocess/wait
//
// 说明:
//   1) 导入通过 MAXIMO MBO 层写入(与工作流设计器同一套业务规则), 所有写操作带 NOACCESSCHECK,
//      因此已启用(ENABLED=1)的工作流也能被修改(参考 Maximo 内部迁移类 psdi.dm.procclass.DMWFProcess)。
//   2) 角色与人员组都存放在 WFASSIGNMENT.ROLEID(指向 MAXROLE; 人员组型角色的 ROLE.TYPE=PERSONGROUP),
//      操作存放在 WFACTION.ACTION(指向 ACTION)。导入前会检查这些引用在目标环境是否存在, 缺失则整体报错。
//   3) 子流程(WFSUBPROCESS)要求目标环境存在同名且已启用的工作流, 因此多个工作流互相引用时请按子流程优先导入。
//   4) 已存在的工作流: 整个导入(主表+节点+操作+分配+通知)在同一个事务内提交, 任一步失败都不会留下半成品。
//   5) 新增的工作流: WFProcess.add() 会自动创建 开始/停止 两个节点, 其 NODEID(0/1)可能与 JSON 里的节点号相同,
//      同一事务内"先插入后删除"会违反 WFNODE_NDX1 唯一索引, 因此先提交一个不含节点的流程, 再在第二个事务内
//      建节点/操作/分配/通知; 若第二段失败会把这个空流程删掉。
//   6) add 模式对已存在的记录一律不修改(主记录保持原值, 子记录按业务键匹配, 已存在则跳过、缺失则新增)。
//   7) syncFlag 仅 migration 模式生效, 用于按 JSON 全量同步(删除 JSON 中不存在的子记录);
//      缺省只增改不删除, 避免误删目标环境中另有用途的节点/操作/分配。
// =============================================================================

var MXServer = Java.type('psdi.server.MXServer');
var MboConstants = Java.type('psdi.mbo.MboConstants');
var SqlFormat = Java.type('psdi.mbo.SqlFormat');
var MXApplicationException = Java.type('psdi.util.MXApplicationException');
var MXLoggerFactory = Java.type('psdi.util.logging.MXLoggerFactory');

var scriptName = service.getScriptName();
/** @type {psdi.util.logging.MXLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + scriptName);

// NOACCESSCHECK(2): 忽略字段/对象只读与权限校验 —— 导入系统交付对象或已启用(ENABLED=1)的工作流时必需
var NA = MboConstants.NOACCESSCHECK;

// WFNODETYPE 域: 内部值(maxvalue) -> WFNODE 上的子表关系名 / 导出 JSON 键(用 Maximo 表名) / 旧键名(兼容导入)
// 关系名取自 WFNODE 的 MAXRELATIONSHIP: START/STOP/TASK/CONDITION/INPUT/INTERACTION/SUBPROCESS/WAITLIST
var NODE_TYPE_DEF = {
  "WFSTART": { relation: "START", key: "wfstart", legacyKey: "start" },
  "WFSTOP": { relation: "STOP", key: "wfstop", legacyKey: "stop" },
  "WFTASK": { relation: "TASK", key: "wftask", legacyKey: "task" },
  "WFCONDITION": { relation: "CONDITION", key: "wfcondition", legacyKey: "condition" },
  "WFINPUT": { relation: "INPUT", key: "wfinput", legacyKey: "input" },
  "WFINTERACTION": { relation: "INTERACTION", key: "wfinteraction", legacyKey: "interaction" },
  "WFSUBPROCESS": { relation: "SUBPROCESS", key: "wfsubprocess", legacyKey: "subprocess" },
  "WFWAIT": { relation: "WAITLIST", key: "wfwaitlist", legacyKey: "wait" }
};

// 子表集合键名(与 Maximo 表名一致) 与旧键名
var WF_NODES = "wfnodes";
var WF_NODES_LEGACY = "nodes";
var WF_ACTIONS = "wfactions";
var WF_ACTIONS_LEGACY = "actions";
var WF_ASSIGNMENT = "wfassignment";
var WF_ASSIGNMENT_LEGACY = "assignments";
var WF_ASGNGROUP = "wfasgngroup";
var WF_ASGNGROUP_LEGACY = "asgnGroups";
var WF_NOTIFICATIONS = "wfnotifications";
var WF_NOTIFICATIONS_LEGACY = "notifications";

var IMP_MODE_MIGRATION = "migration";
var IMP_MODE_ADD = "add";

// 运行参数(URL/请求体)
var impMode = IMP_MODE_MIGRATION;
var syncFlag = false;
var enableOnImport = true;
var ignoreResultSuccess = false;
// 流程导出时是否一并带出引用的操作/角色(仅 migration 模式生效, 可用 _refs=false 关闭)
var includeRefs = true;

// 单次导入的运行时上下文
var importCtx = { noteUniqueIds: {} };

// 需要延迟关闭的 MboSet: 子表与主记录共用同一事务, 必须等主表 save 之后再关闭
// (MboSet.cleanup() 会 reset 并脱离事务, 提前关闭会丢弃未保存的子表数据)
var deferredCloseSets = [];

/** @type {psdi.mbo.Translate} 域值内部值/外部值互转(按需初始化) */
var translator = null;

main();

function main() {
  if (typeof request === 'undefined' || request === null) {
    return;
  }

  checkPermissions('SKS_UTILS', 'DEPLOYSCRIPT');

  var langcode = getQueryParam("_langcode");
  if (langcode) {
    userInfo.setLangCode(langcode.toLowerCase());
    logger.info("[" + scriptName + "] 使用语言: langCode=" + userInfo.getLangCode());
  }

  // 参数契约:
  //   URL   : ?_type=workflows&_action=list|detail|export|import&_impMode=migration|add
  //   list/detail/export body: {where?|processName?|processRev?|id?, pageNum?, pageSize?}
  //   import body: {"workflows":[...]}(导出原样) / 裸数组 / 单对象, 可带 syncFlag
  var _type = getQueryParam("_type");
  var action = getQueryParam("_action");
  var impModeParam = getQueryParam("_impMode");
  var enableParam = getQueryParam("_enable");

  var requestData = parseRequestData();

  if (impModeParam) {
    impMode = String(impModeParam).toLowerCase();
  }
  if (impMode !== IMP_MODE_MIGRATION && impMode !== IMP_MODE_ADD) {
    responseBody = JSON.stringify({ status: 'error', message: '_impMode 只支持 migration / add, 当前值: ' + impModeParam });
    return;
  }
  enableOnImport = enableParam !== "false";
  ignoreResultSuccess = getQueryParam("_ignoreResultSuccess") === "true";
  syncFlag = requestData !== null && requestData.syncFlag === true;
  includeRefs = getQueryParam("_refs") !== "false" &&
    !(requestData !== null && requestData.includeRefs === false);

  // 对象类型: workflows(工作流, 缺省) / actions(操作) / maxroles(角色)
  var objectType = _type ? String(_type).toLowerCase() : null;
  if (!objectType && requestData && !Array.isArray(requestData)) {
    // 未显式给 _type 时按请求体推断: 只有 actions / 只有 maxroles 时分别按对应类型导入
    // 同时含多种时按传递包处理(_type=workflows), 以免漏导
    var hasActions = !!requestData.actions;
    var hasMaxRoles = !!requestData.maxroles;
    var hasWorkflows = !!(requestData.workflows || requestData.wfprocess);
    if (hasActions && !hasMaxRoles && !hasWorkflows) {
      objectType = "actions";
    } else if (hasMaxRoles && !hasActions && !hasWorkflows) {
      objectType = "maxroles";
    }
  }
  if (!objectType) {
    objectType = "workflows";
  }
  if (objectType !== "workflows" && objectType !== "actions" && objectType !== "maxroles") {
    responseBody = JSON.stringify({ status: 'error', message: '本脚本仅支持 _type=workflows / actions / maxroles, 当前值: ' + _type });
    return;
  }
  // 显式指定单一类型时, 提醒请求体里被忽略的其它部分
  if (action && String(action).toLowerCase() === "import" && objectType !== "workflows" && requestData && !Array.isArray(requestData)) {
    if (requestData.workflows || requestData.wfprocess) {
      logger.warn("[" + scriptName + "] _type=" + objectType + " 的导入会忽略请求体中的 workflows 部分");
    }
    if (objectType === "actions" && requestData.maxroles) {
      logger.warn("[" + scriptName + "] _type=actions 的导入会忽略请求体中的 maxroles 部分(请用 _type=workflows 传整包)");
    }
    if (objectType === "maxroles" && requestData.actions) {
      logger.warn("[" + scriptName + "] _type=maxroles 的导入会忽略请求体中的 actions 部分(请用 _type=workflows 传整包)");
    }
  }

  // 未显式给 _action 但请求体是导出格式时, 按导入处理(与 SKS.AUTOSCRIPT.OBJECTS 一致)
  if (!action && requestData &&
    (requestData.workflows || requestData.wfprocess || requestData.actions || requestData.maxroles)) {
    action = "import";
  }
  if (!action) {
    responseBody = JSON.stringify({ status: 'error', message: 'URL 缺少 _action 参数(list/detail/export/import)' });
    return;
  }
  action = String(action).toLowerCase();

  if (action !== 'list' && action !== 'detail' && action !== 'export' && action !== 'import') {
    responseBody = JSON.stringify({ status: 'error', message: '不支持的 _action: ' + action + ', 仅支持 list/detail/export/import' });
    return;
  }

  if (objectType === 'actions') {
    if (action === 'list') {
      responseBody = actionListResponse(requestData);
    } else if (action === 'detail') {
      responseBody = actionDetailResponse(requestData);
    } else if (action === 'export') {
      responseBody = actionExportResponse(requestData);
    } else {
      responseBody = importActionsResponse(requestData);
    }
  } else if (objectType === 'maxroles') {
    if (action === 'list') {
      responseBody = maxRoleListResponse(requestData);
    } else if (action === 'detail') {
      responseBody = maxRoleDetailResponse(requestData);
    } else if (action === 'export') {
      responseBody = maxRoleExportResponse(requestData);
    } else {
      responseBody = importMaxRolesResponse(requestData);
    }
  } else {
    if (action === 'list') {
      responseBody = workflowListResponse(requestData);
    } else if (action === 'detail') {
      responseBody = workflowDetailResponse(requestData);
    } else if (action === 'export') {
      responseBody = workflowExportResponse(requestData);
    } else {
      responseBody = importBundleResponse(requestData);
    }
  }
}

// =================================================================================
// 查询 / 导出
// =================================================================================

/**
 * 工作流列表(仅 WFPROCESS 主记录, 不含节点等子记录)
 * 请求体: {"where":"SQL条件"} 或 {"processName":"...","processRev":1}, 可带 pageNum/pageSize
 * @returns {string} JSON 字符串
 */
function workflowListResponse(requestData) {
  /** @type {psdi.mbo.MboSetRemote} */
  var processSet = null;
  try {
    requestData = requestData || {};
    var whereClause = buildWorkflowWhere(requestData);
    var pager = readPager(requestData);

    processSet = MXServer.getMXServer().getMboSet("WFPROCESS", userInfo);
    processSet.setWhere(whereClause);
    processSet.setOrderBy("PROCESSNAME, PROCESSREV");
    processSet.reset();

    var total = processSet.count();
    logger.info("[" + scriptName + "] workflows list, 过滤条件: " + whereClause + ", 共 " + total + " 条");

    var rows = [];
    var idx = 0;
    var processMbo = processSet.moveFirst();
    while (processMbo != null) {
      if (!pager.hasPagination || (idx >= (pager.pageNum - 1) * pager.pageSize && idx < pager.pageNum * pager.pageSize)) {
        rows.push(buildWorkflowListRow(processMbo));
      }
      idx++;
      processMbo = processSet.moveNext();
    }

    var result = { workflows: rows };
    if (pager.hasPagination) {
      result.total = total;
      result.pageNum = pager.pageNum;
      result.pageSize = pager.pageSize;
    }
    return JSON.stringify(result);
  } catch (error) {
    logger.error("[" + scriptName + "] 查询工作流列表失败: " + error);
    return JSON.stringify({ status: "error", message: errorMessage(error) });
  } finally {
    _close(processSet);
  }
}

/**
 * 单条完整导出
 * 请求体: {"id":<WFPROCESSID>} 或 {"processName":"...","processRev":1}
 * 返回 {workflows:[{...}]}, 单个元素可直接用于导入
 * @returns {string} JSON 字符串
 */
function workflowDetailResponse(requestData) {
  /** @type {psdi.mbo.MboSetRemote} */
  var processSet = null;
  try {
    requestData = requestData || {};
    processSet = MXServer.getMXServer().getMboSet("WFPROCESS", userInfo);
    /** @type {psdi.mbo.MboRemote} */
    var processMbo = null;
    if (requestData.id !== undefined && requestData.id !== null && String(requestData.id) !== "") {
      processMbo = processSet.getMboForUniqueId(parseInt(requestData.id, 10));
    } else {
      processSet.setWhere(buildWorkflowWhere(requestData));
      processSet.setOrderBy("PROCESSREV DESC");
      processSet.reset();
      processMbo = processSet.moveFirst();
    }
    if (processMbo == null) {
      return JSON.stringify({ status: "error", message: "未找到指定的工作流" });
    }
    return JSON.stringify({ workflows: [buildWorkflow(processMbo)] });
  } catch (error) {
    logger.error("[" + scriptName + "] 导出工作流详情失败: " + error);
    return JSON.stringify({ status: "error", message: errorMessage(error) });
  } finally {
    _close(processSet);
  }
}

/**
 * 批量完整导出(含节点/操作/角色/人员组/通知等全部子记录)
 * _impMode=migration(缺省)时, 一并导出流程引用到的操作(ACTION)与角色(MAXROLE),
 * 生成的 JSON 中 actions / maxroles 放在 workflows 之前(可用 _refs=false 关闭带出)。
 * 返回结果可直接作为导入请求体。
 * @returns {string} JSON 字符串
 */
function workflowExportResponse(requestData) {
  /** @type {psdi.mbo.MboSetRemote} */
  var processSet = null;
  try {
    requestData = requestData || {};
    var whereClause = buildWorkflowWhere(requestData);

    processSet = MXServer.getMXServer().getMboSet("WFPROCESS", userInfo);
    processSet.setWhere(whereClause);
    processSet.setOrderBy("PROCESSNAME, PROCESSREV");
    processSet.reset();

    var arr = [];
    var processMbo = processSet.moveFirst();
    while (processMbo != null) {
      arr.push(buildWorkflow(processMbo));
      processMbo = processSet.moveNext();
    }

    if (impMode === IMP_MODE_MIGRATION && includeRefs) {
      // 迁移模式: 把流程用到的操作(不含 A-Z 逻辑, WFACTION.ACTION -> ACTION)与角色/人员组
      // (WFASSIGNMENT.ROLEID/ESCROLE -> MAXROLE) 一并导出, 便于整体迁移到其它环境
      var refs = collectWorkflowRefs(arr);
      var actions = buildReferencedActions(refs.actions);
      var maxroles = buildReferencedMaxRoles(refs.maxroles);
      var bundle = {};
      if (actions.length > 0) {
        bundle.actions = actions;
      }
      if (maxroles.length > 0) {
        bundle.maxroles = maxroles;
      }
      bundle.workflows = arr;
      logger.info("[" + scriptName + "] workflows export 完成, 过滤条件: " + whereClause +
        ", 共 " + arr.length + " 个, 引用操作 " + actions.length + " 个, 引用角色 " + maxroles.length + " 个");
      return JSON.stringify(bundle);
    }

    logger.info("[" + scriptName + "] workflows export 完成, 过滤条件: " + whereClause + ", 共 " + arr.length + " 个");
    return JSON.stringify({ workflows: arr });
  } catch (error) {
    logger.error("[" + scriptName + "] 导出工作流失败: " + error);
    return JSON.stringify({ status: "error", message: errorMessage(error) });
  } finally {
    _close(processSet);
  }
}

/** 列表行(精简字段) */
function buildWorkflowListRow(mbo) {
  return {
    id: mbo.getUniqueIDValue(),
    processName: mbo.getString("PROCESSNAME"),
    processRev: mbo.getInt("PROCESSREV"),
    objectName: mbo.getString("OBJECTNAME"),
    description: mbo.getString("DESCRIPTION"),
    enabled: mbo.getBoolean("ENABLED"),
    active: mbo.getBoolean("ACTIVE")
  };
}

/**
 * 构建单个工作流的完整导出对象(WFPROCESS + WFNODE + 节点子表 + WFACTION + WFASSIGNMENT + WFASGNGROUP + WFNOTIFICATION)
 * @param {psdi.mbo.MboRemote} processMbo - WFPROCESS MBO
 * @returns {Object}
 */
function buildWorkflow(processMbo) {
  var workflow = {
    processName: processMbo.getString("PROCESSNAME"),
    processRev: processMbo.getInt("PROCESSREV"),
    objectName: processMbo.getString("OBJECTNAME"),
    description: processMbo.getString("DESCRIPTION"),
    enabled: processMbo.getBoolean("ENABLED"),
    active: processMbo.getBoolean("ACTIVE"),
    autoInitiate: processMbo.getBoolean("AUTOINITIATE"),
    migrated: processMbo.getBoolean("MIGRATED")
  };

  // 通知先按 "节点ID:动作ID" 分组, 再挂到进程/节点/操作上
  var noteMap = buildNotificationMap(processMbo);

  var nodes = [];
  /** @type {psdi.mbo.MboSetRemote} */
  var nodeSet = processMbo.getMboSet("NODES");
  try {
    nodeSet.setOrderBy("NODEID");
    var nodeMbo = nodeSet.moveFirst();
    while (nodeMbo != null) {
      nodes.push(buildNode(nodeMbo, noteMap));
      nodeMbo = nodeSet.moveNext();
    }
  } finally {
    _close(nodeSet);
  }
  workflow[WF_NODES] = nodes;

  var processNotes = noteMap["0:0"];
  if (processNotes && processNotes.length > 0) {
    workflow[WF_NOTIFICATIONS] = processNotes;
  }
  return workflow;
}

/** 按 "节点ID:动作ID" 分组导出的通知 */
function buildNotificationMap(processMbo) {
  var map = {};
  /** @type {psdi.mbo.MboSetRemote} */
  var noteSet = processMbo.getMboSet("NOTIFICATIONS");
  try {
    noteSet.setOrderBy("UNIQUEID");
    var noteMbo = noteSet.moveFirst();
    while (noteMbo != null) {
      var key = noteMbo.getInt("NODEID") + ":" + noteMbo.getInt("ACTIONID");
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(buildNotification(noteMbo));
      noteMbo = noteSet.moveNext();
    }
  } finally {
    _close(noteSet);
  }
  return map;
}

/** 通知记录(WFNOTIFICATION): UNIQUEID 为过程内标识, 正文/收件人由 COMMTEMPLATE 模板带出 */
function buildNotification(noteMbo) {
  var note = { uniqueId: noteMbo.getInt("UNIQUEID") };
  if (!noteMbo.isNull("TEMPLATEID")) {
    note.templateId = noteMbo.getString("TEMPLATEID");
  }
  return note;
}

/**
 * 构建单个节点(WFNODE + 类型子表 + 出线操作 + 分配 + 分配组 + 通知)
 * @param {psdi.mbo.MboRemote} nodeMbo - WFNODE MBO
 * @param {Object} noteMap - 通知分组
 */
function buildNode(nodeMbo, noteMap) {
  var nodeId = nodeMbo.getInt("NODEID");
  var internalType = getNodeTypeInternal(nodeMbo);

  var node = {
    nodeId: nodeId,
    nodeType: internalType,
    title: nodeMbo.getString("TITLE"),
    description: nodeMbo.getString("DESCRIPTION"),
    x: getInt(nodeMbo, "XCOORDINATE"),
    y: getInt(nodeMbo, "YCOORDINATE")
  };
  if (!nodeMbo.isNull("IMAGEFILE")) {
    node.imageFile = nodeMbo.getString("IMAGEFILE");
  }

  var def = NODE_TYPE_DEF[internalType];
  if (!def) {
    logger.warn("[" + scriptName + "] 节点 " + nodeId + " 的 NODETYPE 无法识别(原始值=" + nodeMbo.getString("NODETYPE") + "), 子表未导出");
  } else {
    var detail = buildNodeDetail(nodeMbo, internalType);
    if (detail) {
      node[def.key] = detail;
    }
  }

  // 出线(WFACTION): 节点上的操作/连线
  var actions = [];
  /** @type {psdi.mbo.MboSetRemote} */
  var actionSet = nodeMbo.getMboSet("ACTIONS");
  try {
    actionSet.setOrderBy("ISPOSITIVE DESC, SEQUENCE, ACTIONID");
    var actionMbo = actionSet.moveFirst();
    while (actionMbo != null) {
      actions.push(buildWfAction(actionMbo, noteMap));
      actionMbo = actionSet.moveNext();
    }
  } finally {
    _close(actionSet);
  }
  if (actions.length > 0) {
    node[WF_ACTIONS] = actions;
  }

  // 定义分配(WFASSIGNMENT, WFID=0): 角色/人员组(ROLEID)与关系分配
  var assignments = [];
  /** @type {psdi.mbo.MboSetRemote} */
  var asgnSet = nodeMbo.getMboSet("DEFINEDASSIGNMENTS");
  try {
    asgnSet.setOrderBy("ASSIGNID");
    var asgnMbo = asgnSet.moveFirst();
    while (asgnMbo != null) {
      assignments.push(buildWfAssignment(asgnMbo));
      asgnMbo = asgnSet.moveNext();
    }
  } finally {
    _close(asgnSet);
  }
  if (assignments.length > 0) {
    node[WF_ASSIGNMENT] = assignments;
  }

  // 分配组(WFASGNGROUP, WFID=0)
  var asgnGroups = [];
  /** @type {psdi.mbo.MboSetRemote} */
  var groupSet = nodeMbo.getMboSet("WFASGNGROUP");
  try {
    groupSet.setOrderBy("GROUPNUM");
    var groupMbo = groupSet.moveFirst();
    while (groupMbo != null) {
      var group = { groupNum: groupMbo.getInt("GROUPNUM") };
      if (!groupMbo.isNull("GRPDESC")) {
        group.description = groupMbo.getString("GRPDESC");
      }
      group.firstComplete = groupMbo.getBoolean("FIRSTCOMPLETE");
      asgnGroups.push(group);
      groupMbo = groupSet.moveNext();
    }
  } finally {
    _close(groupSet);
  }
  if (asgnGroups.length > 0) {
    node[WF_ASGNGROUP] = asgnGroups;
  }

  // 节点级通知(ACTIONID=0)
  var notes = noteMap[nodeId + ":0"];
  if (notes && notes.length > 0) {
    node[WF_NOTIFICATIONS] = notes;
  }
  return node;
}

/** 节点类型子表(WFTASK/WFCONDITION/WFINPUT/WFINTERACTION/WFSUBPROCESS/WFWAITLIST) */
function buildNodeDetail(nodeMbo, internalType) {
  var def = NODE_TYPE_DEF[internalType];
  /** @type {psdi.mbo.MboSetRemote} */
  var detailSet = nodeMbo.getMboSet(def.relation);
  try {
    /** @type {psdi.mbo.MboRemote} */
    var detailMbo = detailSet.isEmpty() ? null : detailSet.getMbo(0);
    if (detailMbo == null) {
      return null;
    }
    if (internalType === "WFTASK") {
      return {
        app: getStr(detailMbo, "APP"),
        readonly: detailMbo.getBoolean("READONLY"),
        firstComplete: detailMbo.getBoolean("FIRSTCOMPLETE"),
        timelimit: getStr(detailMbo, "TIMELIMIT"),
        calendarBased: detailMbo.getBoolean("CALENDARBASED"),
        displayOne: detailMbo.getBoolean("DISPLAYONE"),
        taskType: getStr(detailMbo, "WFTASKTYPE")
      };
    }
    if (internalType === "WFCONDITION") {
      return {
        condition: getStr(detailMbo, "CONDITION"),
        customClass: getStr(detailMbo, "CUSTOMCLASS")
      };
    }
    if (internalType === "WFINPUT") {
      return { displayOne: detailMbo.getBoolean("DISPLAYONE") };
    }
    if (internalType === "WFINTERACTION") {
      return {
        app: getStr(detailMbo, "APP"),
        page: getStr(detailMbo, "PAGE"),
        relation: getStr(detailMbo, "RELATION"),
        directions: getStr(detailMbo, "DIRECTIONS"),
        action: getStr(detailMbo, "ACTION"),
        tabName: getStr(detailMbo, "TABNAME"),
        launchProcess: getStr(detailMbo, "LAUNCHPROCESS"),
        stayCurrentApp: detailMbo.getBoolean("STAYCURRENTAPP")
      };
    }
    if (internalType === "WFSUBPROCESS") {
      return { subProcessName: getStr(detailMbo, "SUBPROCESSNAME") };
    }
    if (internalType === "WFWAIT") {
      return { eventName: getStr(detailMbo, "EVENTNAME") };
    }
    // WFSTART / WFSTOP 只有键字段, 无额外内容
    return null;
  } finally {
    _close(detailSet);
  }
}

/** 节点出线操作(WFACTION) */
function buildWfAction(actionMbo, noteMap) {
  var action = {
    actionId: actionMbo.getInt("ACTIONID"),
    isPositive: actionMbo.getBoolean("ISPOSITIVE"),
    memberNodeId: actionMbo.getInt("MEMBERNODEID")
  };
  if (!actionMbo.isNull("ACTION")) {
    action.action = actionMbo.getString("ACTION");
  }
  if (!actionMbo.isNull("SEQUENCE")) {
    action.sequence = actionMbo.getInt("SEQUENCE");
  }
  if (!actionMbo.isNull("CONDITION")) {
    action.condition = actionMbo.getString("CONDITION");
  }
  if (!actionMbo.isNull("CONDITIONCLASS")) {
    action.conditionClass = actionMbo.getString("CONDITIONCLASS");
  }
  if (!actionMbo.isNull("INSTRUCTION")) {
    action.instruction = actionMbo.getString("INSTRUCTION");
  }
  var notes = noteMap[actionMbo.getInt("OWNERNODEID") + ":" + actionMbo.getInt("ACTIONID")];
  if (notes && notes.length > 0) {
    action[WF_NOTIFICATIONS] = notes;
  }
  return action;
}

/** 定义分配(WFASSIGNMENT): 角色/人员组 = ROLEID(MAXROLE), 人员 = ASSIGNCODE, 关系 = RELATIONSHIP */
function buildWfAssignment(asgnMbo) {
  var asgn = { assignId: asgnMbo.getInt("ASSIGNID") };
  asgn.roleId = getStr(asgnMbo, "ROLEID");
  asgn.relationship = getStr(asgnMbo, "RELATIONSHIP");
  asgn.assignCode = getStr(asgnMbo, "ASSIGNCODE");
  asgn.description = getStr(asgnMbo, "DESCRIPTION");
  asgn.app = getStr(asgnMbo, "APP");
  asgn.timelimit = getStr(asgnMbo, "TIMELIMIT");
  asgn.templateId = getStr(asgnMbo, "TEMPLATEID");
  asgn.escRole = getStr(asgnMbo, "ESCROLE");
  asgn.condition = getStr(asgnMbo, "CONDITION");
  asgn.conditionClass = getStr(asgnMbo, "CONDITIONCLASS");
  asgn.acceptExpr = getStr(asgnMbo, "ACCEPTEXPR");
  asgn.nonAcceptMsg = getStr(asgnMbo, "NONACCEPTMSG");
  asgn.assignStatus = getStr(asgnMbo, "ASSIGNSTATUS");
  asgn.priority = getInt(asgnMbo, "PRIORITY");
  asgn.groupNum = getInt(asgnMbo, "GROUPNUM");
  asgn.calendarBased = asgnMbo.getBoolean("CALENDARBASED");
  asgn.emailNotification = asgnMbo.getBoolean("EMAILNOTIFICATION");
  asgn.separateGroups = asgnMbo.getBoolean("SEPARATEGROUPS");
  asgn.keepOrigAssgn = asgnMbo.getBoolean("KEEPORIGASSGN");
  for (var i = 1; i <= 5; i++) {
    var v = getStr(asgnMbo, "ASSIGN_0" + i);
    if (v !== null) {
      asgn["assign_0" + i] = v;
    }
  }
  return asgn;
}

// =================================================================================
// 导入
// =================================================================================

/**
 * 导入入口(_type=workflows&_action=import)
 * 请求体支持:
 *   {"actions":[...],"maxroles":[...],"workflows":[...]} —— 迁移包(导出结果), 按 操作→角色→工作流 顺序导入
 *   只含 workflows / wfprocess 的请求体
 *   裸数组 / 单个工作流对象
 * 模式(_impMode): migration=存在则修改 / add=只新增, 已存在的不修改
 * @returns {string} JSON 字符串
 */
function importBundleResponse(requestData) {
  if (!requestData) {
    return JSON.stringify({ status: "error", message: "请求体(requestBody)不能为空" });
  }
  var actionBatch = null;
  var roleBatch = null;
  var workflowBatch = null;

  // 1) 操作(ACTION): 工作流的出线引用它们, 必须先导入
  if (Array.isArray(requestData.actions) && requestData.actions.length > 0) {
    logger.info("[" + scriptName + "] 开始导入 " + requestData.actions.length + " 个操作(ACTION), _impMode=" + impMode);
    actionBatch = runBatch(sortActionsForImport(requestData.actions), "action", saveOrUpdateAction);
  }
  // 2) 角色(MAXROLE, 含人员组型角色): 工作流的分配引用它们
  if (Array.isArray(requestData.maxroles) && requestData.maxroles.length > 0) {
    logger.info("[" + scriptName + "] 开始导入 " + requestData.maxroles.length + " 个角色(MAXROLE), _impMode=" + impMode);
    roleBatch = runBatch(requestData.maxroles, "maxrole", saveOrUpdateMaxRole);
  }

  // 3) 工作流
  var workflowItems = null;
  if (Array.isArray(requestData)) {
    workflowItems = requestData;
  } else if (Array.isArray(requestData.workflows)) {
    workflowItems = requestData.workflows;
  } else if (Array.isArray(requestData.wfprocess)) {
    workflowItems = requestData.wfprocess;
  } else if (!requestData.actions && !requestData.maxroles) {
    workflowItems = [requestData];
  }
  if (workflowItems !== null && workflowItems.length > 0) {
    logger.info("[" + scriptName + "] 开始导入 " + workflowItems.length + " 个工作流, _impMode=" + impMode +
      ", syncFlag=" + syncFlag + ", _enable=" + enableOnImport);
    workflowBatch = importWorkflowItems(workflowItems);
  }

  if (actionBatch === null && roleBatch === null && workflowBatch === null) {
    return JSON.stringify({ status: "error", message: "没有提供可导入的数据(actions/maxroles/workflows)" });
  }

  var total = 0;
  var success = 0;
  var failed = 0;
  var response = { status: "success", message: "批量导入完成", impMode: impMode };
  if (actionBatch !== null) {
    response.actions = batchSection(actionBatch);
    total += actionBatch.total;
    success += actionBatch.success;
    failed += actionBatch.failed;
  }
  if (roleBatch !== null) {
    response.maxroles = batchSection(roleBatch);
    total += roleBatch.total;
    success += roleBatch.success;
    failed += roleBatch.failed;
  }
  if (workflowBatch !== null) {
    response.workflows = batchSection(workflowBatch);
    response.result = workflowBatch.result;
    total += workflowBatch.total;
    success += workflowBatch.success;
    failed += workflowBatch.failed;
  } else {
    response.result = [];
  }
  response.summary = { total: total, success: success, failed: failed };
  logger.info("[" + scriptName + "] 批量导入完成: 共 " + total + ", 成功 " + success + ", 失败 " + failed);
  return JSON.stringify(response, null, 4);
}

/** 批量结果 -> 响应中的分区 {total,success,failed,result} */
function batchSection(batch) {
  return { total: batch.total, success: batch.success, failed: batch.failed, result: batch.result };
}

/**
 * 工作流批量导入(逐条), 返回 {total, success, failed, result}
 */
function importWorkflowItems(items) {
  var resultList = [];
  var successCount = 0;
  var failedCount = 0;
  for (var i = 0; i < items.length; i++) {
    var data = items[i] || {};
    var processName = getStr(data.processName || data.processname);
    var processRev = toInt(data.processRev !== undefined && data.processRev !== null ? data.processRev : data.processrev, 1);
    try {
      var info = saveOrUpdateWorkflow(data, i + 1);
      successCount++;
      if (!ignoreResultSuccess) {
        var okRow = { processName: processName, processRev: processRev, status: "SUCCESS", message: info.message };
        if (info.warnings && info.warnings.length > 0) {
          okRow.warnings = info.warnings;
        }
        resultList.push(okRow);
      }
    } catch (error) {
      logger.error("[" + scriptName + "] 处理第 " + (i + 1) + " 个工作流失败: " + error);
      failedCount++;
      resultList.push({
        processName: processName,
        processRev: processRev,
        status: "FAILED",
        message: errorMessage(error)
      });
    }
  }
  return { total: items.length, success: successCount, failed: failedCount, result: resultList };
}

/**
 * 通用批量执行(操作/角色等按业务键的批量导入)
 * @param {Array} items - 数据数组
 * @param {string} keyName - 结果行中的业务键字段名(action/maxrole)
 * @param {function} saveFn - 保存函数 (data, index) => {message, warnings}
 * @returns {Object} {total, success, failed, result}
 */
function runBatch(items, keyName, saveFn) {
  var resultList = [];
  var successCount = 0;
  var failedCount = 0;
  for (var i = 0; i < items.length; i++) {
    var data = items[i] || {};
    var keyVal = data[keyName] || "未知";
    try {
      var info = saveFn(data, i + 1) || {};
      successCount++;
      if (!ignoreResultSuccess) {
        var okRow = {};
        okRow[keyName] = keyVal;
        okRow.status = "SUCCESS";
        okRow.message = info.message || "保存成功";
        if (info.warnings && info.warnings.length > 0) {
          okRow.warnings = info.warnings;
        }
        resultList.push(okRow);
      }
    } catch (error) {
      logger.error("[" + scriptName + "] 处理第 " + (i + 1) + " 条(" + keyName + ")失败: " + error);
      failedCount++;
      var failRow = {};
      failRow[keyName] = keyVal;
      failRow.status = "FAILED";
      failRow.message = errorMessage(error);
      resultList.push(failRow);
    }
  }
  return { total: items.length, success: successCount, failed: failedCount, result: resultList };
}

/**
 * 保存或更新单个工作流(主表 + 全部子表)
 * @param {Object} data - 单个工作流的导出结构
 * @param {number} index - 序号(用于错误提示)
 * @returns {Object} {message, warnings}
 */
function saveOrUpdateWorkflow(data, index) {
  var processName = getStr(data.processName || data.processname);
  if (!processName) {
    throw new MXApplicationException("#", "第 " + index + " 个工作流的 processName(过程名称) 不能为空");
  }
  processName = processName.toUpperCase();
  var processRev = toInt(data.processRev !== undefined && data.processRev !== null ? data.processRev : data.processrev, 1);
  var objectName = getStr(data.objectName || data.objectname);

  /** @type {psdi.mbo.MboSetRemote} */
  var processSet = null;
  var createdProcess = false;
  var message = null;
  var warnings = [];
  var failed = null;
  try {
    processSet = MXServer.getMXServer().getMboSet("WFPROCESS", userInfo);
    var sqlf = new SqlFormat("processname = :1 and processrev = :2");
    sqlf.setObject(1, "WFPROCESS", "PROCESSNAME", processName);
    sqlf.setInt(2, processRev);
    processSet.setWhere(sqlf.format());
    processSet.reset();

    var isNew = processSet.isEmpty();
    /** @type {psdi.mbo.MboRemote} */
    var processMbo = isNew ? null : processSet.getMbo(0);
    var targetObjectName = objectName;
    if (!targetObjectName && processMbo != null) {
      targetObjectName = processMbo.getString("OBJECTNAME");
    }
    if (!targetObjectName) {
      throw new MXApplicationException("#", "工作流 " + processName + "(" + processRev + ") 缺少 objectName(主对象名称)");
    }

    // 先检查引用的操作/角色/人员组/通讯模板/子流程在目标环境是否存在, 避免写到一半才失败
    checkWorkflowReferences(data, targetObjectName);

    importCtx.noteUniqueIds = {};
    registerExistingNoteIds(processMbo, isNew);

    if (isNew) {
      // 新增流程分两段提交:
      //   1/2 只建流程主记录并删掉 WFProcess.add() 自动创建的开始/停止节点(否则其 NODEID 0/1 会与
      //       JSON 中的节点号相撞 —— 同一事务内"先插入后删除"会违反 WFNODE_NDX1 唯一索引);
      //   2/2 在同一事务内建节点/操作/分配/通知并保存。
      // 若 2/2 失败会清理掉 1/2 建出的空流程, 不残留半成品。
      logger.info("[" + scriptName + "] 新增工作流: " + processName + "(" + processRev + ")");
      processMbo = processSet.add(NA);
      processMbo.setValue("PROCESSNAME", processName, NA);
      // PROCESSNAME 的 action 会自动把 PROCESSREV 设为最大版本+1, 这里强制为目标版本
      processMbo.setValue("PROCESSREV", processRev, NA);
      setStrValue(processMbo, "DESCRIPTION", data.description);
      setStrValue(processMbo, "OBJECTNAME", targetObjectName);
      var autoNodeSet = processMbo.getMboSet("NODES");
      if (!autoNodeSet.isEmpty()) {
        autoNodeSet.deleteAll(NA);
      }
      var newProcessId = processMbo.getUniqueIDValue();
      processSet.save(NA);
      createdProcess = true;
      autoNodeSet.cleanup();
      processSet.reset();
      processMbo = processSet.getMboForUniqueId(newProcessId);
      message = "新增成功";
    } else if (impMode === IMP_MODE_ADD) {
      logger.info("[" + scriptName + "] 工作流已存在, add 模式不修改主记录: " + processName + "(" + processRev + ")");
      message = "已存在, 按 add 模式仅补齐缺失的子记录";
    } else {
      logger.info("[" + scriptName + "] 更新现有工作流: " + processName + "(" + processRev + ")");
      setStrValue(processMbo, "DESCRIPTION", data.description);
      // 主对象为系统关键字段: 值相同则跳过, 只有确实变化时才写
      setStrValue(processMbo, "OBJECTNAME", targetObjectName);
      message = "修改成功";
    }

    // 子表: 节点(含类型子表/出线操作/分配/分配组/节点通知)
    saveOrUpdateNodes(processMbo, pickChild(data, WF_NODES, WF_NODES_LEGACY), index);
    // 子表: 进程级通知(NODEID=0, ACTIONID=0)
    saveOrUpdateNotifications(processMbo, pickChild(data, WF_NOTIFICATIONS, WF_NOTIFICATIONS_LEGACY), true);

    var savedProcessId = processMbo.getUniqueIDValue();
    processSet.save(NA);

    if (enableOnImport && data.enabled === true) {
      // 保存后必须重新取一次主记录: save 之前拿到的实例还带着"待保存"标志,
      // 直接调用 validateProcess() 会报 BMXAA4437E(workflow#UnsavedNoChange)
      processSet.reset();
      processMbo = processSet.getMboForUniqueId(savedProcessId);
      warnings = enableAndActivate(processMbo, processSet, data, processName, processRev);
    }
  } catch (error) {
    failed = error;
  } finally {
    closeDeferredSets();
    _close(processSet);
  }

  if (failed !== null) {
    logger.error("[" + scriptName + "] 保存工作流失败: " + processName + "(" + processRev + "), " + failed);
    if (createdProcess) {
      // 2/2 失败: 清掉 1/2 提交的空流程, 不残留半成品
      cleanupNewProcess(processName, processRev);
    }
    throw new MXApplicationException("#", "保存工作流失败: " + processName + "(" + processRev + "), " + errorMessage(failed));
  }
  return { message: message, warnings: warnings };
}

/**
 * 保存或更新节点及其全部子表
 * 节点以 (PROCESSNAME, PROCESSREV, NODEID) 为业务键, 与 WFNODE_NDX1 唯一索引一致
 * 分两遍处理:
 *   第一遍 建/改全部节点本身(含节点类型子表);
 *   第二遍 建出线操作/分配/分配组/通知 —— WFACTION.MEMBERNODEID 校验(workflow#NotValidNode)
 *          要求目标节点已存在于本修订内, 因此必须等全部节点就绪后再建操作
 */
function saveOrUpdateNodes(processMbo, nodeDatas, index) {
  /** @type {psdi.mbo.MboSetRemote} */
  var nodeSet = processMbo.getMboSet("NODES");
  try {
    var hasNodes = nodeDatas && nodeDatas.length > 0;
    if (!hasNodes) {
      return;
    }

    var keep = {};
    var saved = [];
    // 第一遍: 节点本身(含节点类型子表)
    for (var i = 0; i < nodeDatas.length; i++) {
      var nodeData = nodeDatas[i] || {};
      var nodeId = toInt(nodeData.nodeId, -1);
      if (nodeId < 0) {
        throw new MXApplicationException("#", "第 " + index + " 个工作流的第 " + (i + 1) + " 个节点缺少 nodeId");
      }
      var internalType = resolveNodeTypeInternal(nodeData.nodeType, processMbo);
      if (!internalType) {
        throw new MXApplicationException("#", "工作流节点 " + nodeId + " 的 nodeType 无效: " + nodeData.nodeType);
      }

      /** @type {psdi.mbo.MboRemote} */
      var nodeMbo = findMboByAttr(nodeSet, "NODEID", nodeId);
      var existed = nodeMbo != null;
      keep[String(nodeId)] = true;
      if (!existed) {
        nodeMbo = nodeSet.add(NA);
        nodeMbo.setValue("NODEID", nodeId, NA);
        // NODETYPE 决定子表类型, 写入时框架会自动创建对应子表记录并初始化标题/描述
        nodeMbo.setValue("NODETYPE", resolveNodeTypeValue(internalType, nodeMbo), NA);
      } else if (getNodeTypeInternal(nodeMbo) !== internalType) {
        throw new MXApplicationException("#", "工作流节点 " + nodeId + " 已存在的节点类型(" + getNodeTypeInternal(nodeMbo) + ")与导入值(" + internalType + ")不一致, 节点类型不可修改");
      }

      saved.push({ data: nodeData, internalType: internalType, mbo: nodeMbo });
      if (existed && impMode === IMP_MODE_ADD) {
        // add 模式: 节点已存在则属性与类型子表保持原样
        continue;
      }
      setStrValue(nodeMbo, "TITLE", nodeData.title);
      setStrValue(nodeMbo, "DESCRIPTION", nodeData.description);
      setIntValue(nodeMbo, "XCOORDINATE", nodeData.x);
      setIntValue(nodeMbo, "YCOORDINATE", nodeData.y);
      setStrValue(nodeMbo, "IMAGEFILE", nodeData.imageFile);
      saveOrUpdateNodeDetail(nodeMbo, nodeData, internalType);
    }

    // 第二遍: 节点出线操作/分配(角色,人员组)/分配组/通知
    for (var s = 0; s < saved.length; s++) {
      var row = saved[s];
      saveOrUpdateWfActions(row.mbo, pickChild(row.data, WF_ACTIONS, WF_ACTIONS_LEGACY));
      saveOrUpdateWfAssignments(row.mbo, pickChild(row.data, WF_ASSIGNMENT, WF_ASSIGNMENT_LEGACY), row.internalType);
      saveOrUpdateWfAsgnGroups(row.mbo, pickChild(row.data, WF_ASGNGROUP, WF_ASGNGROUP_LEGACY));
      saveOrUpdateNotifications(row.mbo, pickChild(row.data, WF_NOTIFICATIONS, WF_NOTIFICATIONS_LEGACY), false);
    }

    if (impMode === IMP_MODE_MIGRATION && syncFlag) {
      deleteMissing(nodeSet, "NODEID", keep, null);
    }
    // 不在此处 save: 节点/操作/分配/通知与主记录共用同一事务, 由 saveOrUpdateWorkflow 末尾统一保存,
    // 保证单个工作流导入失败时不会留下写了一半的数据
  } finally {
    deferClose(nodeSet);
  }
}

/** 节点类型子表字段导入 */
function saveOrUpdateNodeDetail(nodeMbo, nodeData, internalType) {
  var def = NODE_TYPE_DEF[internalType];
  if (!def) {
    return;
  }
  var detailData = pickChild(nodeData, def.key, def.legacyKey);
  if (!detailData) {
    return;
  }
  /** @type {psdi.mbo.MboSetRemote} */
  var detailSet = nodeMbo.getMboSet(def.relation);
  try {
    /** @type {psdi.mbo.MboRemote} */
    var detailMbo = detailSet.isEmpty() ? null : detailSet.getMbo(0);
    if (detailMbo == null) {
      // NODETYPE 的 action 通常已建好子记录, 这里兜底
      detailMbo = detailSet.add(NA);
    }
    if (internalType === "WFTASK") {
      setStrValue(detailMbo, "APP", detailData.app);
      setYornValue(detailMbo, "READONLY", detailData.readonly);
      setYornValue(detailMbo, "FIRSTCOMPLETE", detailData.firstComplete);
      setYornValue(detailMbo, "CALENDARBASED", detailData.calendarBased);
      setYornValue(detailMbo, "DISPLAYONE", detailData.displayOne);
      setStrValue(detailMbo, "TIMELIMIT", detailData.timelimit);
      setStrValue(detailMbo, "WFTASKTYPE", detailData.taskType);
    } else if (internalType === "WFCONDITION") {
      // CONDITION 与 CUSTOMCLASS 互斥(框架 action 会互相清空), 按 JSON 提供的值写入
      setStrValue(detailMbo, "CONDITION", detailData.condition);
      setStrValue(detailMbo, "CUSTOMCLASS", detailData.customClass);
    } else if (internalType === "WFINPUT") {
      setYornValue(detailMbo, "DISPLAYONE", detailData.displayOne);
    } else if (internalType === "WFINTERACTION") {
      setStrValue(detailMbo, "APP", detailData.app);
      setStrValue(detailMbo, "PAGE", detailData.page);
      setStrValue(detailMbo, "RELATION", detailData.relation);
      setStrValue(detailMbo, "DIRECTIONS", detailData.directions);
      setStrValue(detailMbo, "ACTION", detailData.action);
      setStrValue(detailMbo, "TABNAME", detailData.tabName);
      setStrValue(detailMbo, "LAUNCHPROCESS", detailData.launchProcess);
      setYornValue(detailMbo, "STAYCURRENTAPP", detailData.stayCurrentApp);
    } else if (internalType === "WFSUBPROCESS") {
      setStrValue(detailMbo, "SUBPROCESSNAME", detailData.subProcessName);
    } else if (internalType === "WFWAIT") {
      setStrValue(detailMbo, "EVENTNAME", detailData.eventName);
    }
    // 子表与主记录同事务, 统一在 saveOrUpdateWorkflow 末尾保存
  } finally {
    deferClose(detailSet);
  }
}

/**
 * 节点出线操作(WFACTION)导入
 * 业务键 ACTIONID(同一次修订内唯一, WFActionSet.getNextActionNum 生成)
 */
function saveOrUpdateWfActions(nodeMbo, actionDatas) {
  if (!actionDatas || actionDatas.length === 0) {
    return;
  }
  var nodeId = nodeMbo.getInt("NODEID");
  /** @type {psdi.mbo.MboSetRemote} */
  var actionSet = nodeMbo.getMboSet("ACTIONS");
  try {
    var keep = {};
    for (var i = 0; i < actionDatas.length; i++) {
      var d = actionDatas[i] || {};
      var actionId = toInt(d.actionId, -1);
      /** @type {psdi.mbo.MboRemote} */
      var actionMbo = actionId >= 0 ? findMboByAttr(actionSet, "ACTIONID", actionId) : null;
      if (actionMbo == null) {
        if (d.isPositive !== true && d.isPositive !== false) {
          throw new MXApplicationException("#", "节点 " + nodeId + " 的操作缺少 isPositive(正向/逆向出线)标记");
        }
        actionMbo = actionSet.add(NA);
        if (actionId >= 0) {
          actionMbo.setValue("ACTIONID", actionId, NA);
          keep[String(actionId)] = true;
        }
      } else {
        keep[String(actionId)] = true;
        if (impMode === IMP_MODE_ADD) {
          continue;
        }
      }

      // 顺序要求: MEMBERNODEID 的 action 会用目标节点的标题/描述覆盖 INSTRUCTION, 故 INSTRUCTION 最后写
      if (d.memberNodeId !== undefined && d.memberNodeId !== null) {
        actionMbo.setValue("MEMBERNODEID", toInt(d.memberNodeId, 0), NA);
      }
      setYornValue(actionMbo, "ISPOSITIVE", d.isPositive);
      setStrValue(actionMbo, "ACTION", d.action);
      setStrValue(actionMbo, "CONDITION", d.condition);
      setStrValue(actionMbo, "CONDITIONCLASS", d.conditionClass);
      setIntValue(actionMbo, "SEQUENCE", d.sequence);
      setStrValue(actionMbo, "INSTRUCTION", d.instruction);
      saveOrUpdateNotifications(actionMbo, pickChild(d, WF_NOTIFICATIONS, WF_NOTIFICATIONS_LEGACY), false);
    }
    if (impMode === IMP_MODE_MIGRATION && syncFlag) {
      deleteMissing(actionSet, "ACTIONID", keep, null);
    }
    // 子表与主记录同事务, 统一在 saveOrUpdateWorkflow 末尾保存
  } finally {
    deferClose(actionSet);
  }
}

/**
 * 定义分配(WFASSIGNMENT, WFID=0)导入 —— 工作流子表关联的角色/人员组(ROLEID)、人员(ASSIGNCODE)、关系(RELATIONSHIP)
 * 业务键 ASSIGNID(节点内唯一); 仅任务(WFTASK)节点有定义分配
 */
function saveOrUpdateWfAssignments(nodeMbo, asgnDatas, nodeType) {
  if (!asgnDatas || asgnDatas.length === 0) {
    return;
  }
  if (nodeType !== "WFTASK") {
    throw new MXApplicationException("#", "节点 " + nodeMbo.getInt("NODEID") + "(" + nodeType + ") 不是任务节点, 不能有角色/人员组分配");
  }
  /** @type {psdi.mbo.MboSetRemote} */
  var asgnSet = nodeMbo.getMboSet("DEFINEDASSIGNMENTS");
  try {
    var keep = {};
    for (var i = 0; i < asgnDatas.length; i++) {
      var d = asgnDatas[i] || {};
      var assignId = toInt(d.assignId, -1);
      if (assignId < 0) {
        throw new MXApplicationException("#", "任务节点 " + nodeMbo.getInt("NODEID") + " 的第 " + (i + 1) + " 个分配记录缺少 assignId");
      }
      /** @type {psdi.mbo.MboRemote} */
      var asgnMbo = findMboByAttr(asgnSet, "ASSIGNID", assignId);
      if (asgnMbo == null) {
        // add() 自动填 ASSIGNID/APP/TIMELIMIT/NODEID/PROCESSNAME/PROCESSREV/WFID=0/OWNERTABLE
        asgnMbo = asgnSet.add(NA);
        asgnMbo.setValue("ASSIGNID", assignId, NA);
        keep[String(assignId)] = true;
      } else {
        keep[String(assignId)] = true;
        if (impMode === IMP_MODE_ADD) {
          continue;
        }
      }

      // ROLEID 与 RELATIONSHIP 互斥(框架 action 会互相清空): 先写 RELATIONSHIP 再写 ROLEID
      setStrValue(asgnMbo, "RELATIONSHIP", d.relationship);
      setStrValue(asgnMbo, "ROLEID", d.roleId);
      setStrValue(asgnMbo, "ASSIGNCODE", d.assignCode);
      setStrValue(asgnMbo, "TEMPLATEID", d.templateId);
      setYornValue(asgnMbo, "EMAILNOTIFICATION", d.emailNotification);
      setStrValue(asgnMbo, "DESCRIPTION", d.description);
      setIntValue(asgnMbo, "PRIORITY", d.priority);
      setStrValue(asgnMbo, "TIMELIMIT", d.timelimit);
      setYornValue(asgnMbo, "CALENDARBASED", d.calendarBased);
      setYornValue(asgnMbo, "SEPARATEGROUPS", d.separateGroups);
      setYornValue(asgnMbo, "KEEPORIGASSGN", d.keepOrigAssgn);
      setIntValue(asgnMbo, "GROUPNUM", d.groupNum);
      setStrValue(asgnMbo, "CONDITION", d.condition);
      setStrValue(asgnMbo, "CONDITIONCLASS", d.conditionClass);
      setStrValue(asgnMbo, "ACCEPTEXPR", d.acceptExpr);
      setStrValue(asgnMbo, "NONACCEPTMSG", d.nonAcceptMsg);
      setStrValue(asgnMbo, "ESCROLE", d.escRole);
      setStrValue(asgnMbo, "APP", d.app);
      setStrValue(asgnMbo, "ASSIGNSTATUS", d.assignStatus);
      for (var u = 1; u <= 5; u++) {
        setStrValue(asgnMbo, "ASSIGN_0" + u, d["assign_0" + u]);
      }
    }
    if (impMode === IMP_MODE_MIGRATION && syncFlag) {
      deleteMissing(asgnSet, "ASSIGNID", keep, null);
    }
    // 子表与主记录同事务, 统一在 saveOrUpdateWorkflow 末尾保存
  } finally {
    deferClose(asgnSet);
  }
}

/** 分配组(WFASGNGROUP, WFID=0)导入, 业务键 (NODEID, GROUPNUM) */
function saveOrUpdateWfAsgnGroups(nodeMbo, groupDatas) {
  if (!groupDatas || groupDatas.length === 0) {
    return;
  }
  /** @type {psdi.mbo.MboSetRemote} */
  var groupSet = nodeMbo.getMboSet("WFASGNGROUP");
  try {
    var keep = {};
    for (var i = 0; i < groupDatas.length; i++) {
      var d = groupDatas[i] || {};
      var groupNum = toInt(d.groupNum, -1);
      if (groupNum < 0) {
        throw new MXApplicationException("#", "节点 " + nodeMbo.getInt("NODEID") + " 的第 " + (i + 1) + " 个分配组缺少 groupNum");
      }
      /** @type {psdi.mbo.MboRemote} */
      var groupMbo = findMboByAttr(groupSet, "GROUPNUM", groupNum);
      if (groupMbo == null) {
        groupMbo = groupSet.add(NA);
        groupMbo.setValue("GROUPNUM", groupNum, NA);
        keep[String(groupNum)] = true;
      } else {
        keep[String(groupNum)] = true;
        if (impMode === IMP_MODE_ADD) {
          continue;
        }
      }
      setStrValue(groupMbo, "GRPDESC", d.description);
      setYornValue(groupMbo, "FIRSTCOMPLETE", d.firstComplete);
    }
    if (impMode === IMP_MODE_MIGRATION && syncFlag) {
      deleteMissing(groupSet, "GROUPNUM", keep, null);
    }
    // 子表与主记录同事务, 统一在 saveOrUpdateWorkflow 末尾保存
  } finally {
    deferClose(groupSet);
  }
}

/**
 * 通知(WFNOTIFICATION)导入
 * 业务键 UNIQUEID(过程内唯一); 进程级通知(NODEID=0, ACTIONID=0) 走 processLevel=true
 * @param {psdi.mbo.MboRemote} ownerMbo - WFPROCESS / WFNode / WFAction
 * @param {Array} noteDatas - [{uniqueId, templateId}]
 * @param {boolean} processLevel - true=进程级通知
 */
function saveOrUpdateNotifications(ownerMbo, noteDatas, processLevel) {
  if (!noteDatas || noteDatas.length === 0) {
    return;
  }
  var ownerName = ownerMbo.getName();
  /** @type {psdi.mbo.MboSetRemote} */
  var noteSet = ownerMbo.getMboSet("NOTIFICATIONS");
  try {
    var keep = {};
    for (var i = 0; i < noteDatas.length; i++) {
      var d = noteDatas[i] || {};
      if (!d.templateId) {
        throw new MXApplicationException("#", "通知记录缺少 templateId(通讯模板)");
      }
      var uniqueId = toInt(d.uniqueId, -1);
      /** @type {psdi.mbo.MboRemote} */
      var noteMbo = uniqueId >= 0 ? findMboByAttr(noteSet, "UNIQUEID", uniqueId) : null;
      if (noteMbo == null) {
        noteMbo = noteSet.add(NA);
        // 框架自动填 PROCESSNAME/PROCESSREV/NODEID/ACTIONID/UNIQUEID;
        // 显式回填 UNIQUEID 保持与源一致, 已被本过程其它记录占用时由框架另分配
        var assignedId = noteMbo.getInt("UNIQUEID");
        if (uniqueId >= 0) {
          if (importCtx.noteUniqueIds[String(uniqueId)]) {
            logger.warn("[" + scriptName + "] 通知 UNIQUEID=" + uniqueId + " 已被同一工作流的其它通知占用, 改为框架自动分配(" + assignedId + ")");
            importCtx.noteUniqueIds[String(assignedId)] = true;
          } else {
            noteMbo.setValue("UNIQUEID", uniqueId, NA);
            importCtx.noteUniqueIds[String(uniqueId)] = true;
          }
        } else {
          importCtx.noteUniqueIds[String(assignedId)] = true;
        }
      } else {
        keep[String(noteMbo.getInt("UNIQUEID"))] = true;
        importCtx.noteUniqueIds[String(uniqueId)] = true;
        if (impMode === IMP_MODE_ADD) {
          continue;
        }
      }
      if (processLevel) {
        // WFProcess 作为 owner 时框架不填 NODEID/ACTIONID, 显式补 0
        noteMbo.setValue("NODEID", 0, NA);
        noteMbo.setValue("ACTIONID", 0, NA);
      }
      setStrValue(noteMbo, "TEMPLATEID", d.templateId);
      keep[String(noteMbo.getInt("UNIQUEID"))] = true;
    }
    if (impMode === IMP_MODE_MIGRATION && syncFlag) {
      deleteMissing(noteSet, "UNIQUEID", keep, /** @type {function(psdi.mbo.MboRemote):boolean} */ (function (mbo) {
        // 进程 owner 的通知集合含节点/操作级通知, 只清进程级(NODEID=0 且 ACTIONID=0)
        return ownerName !== "WFPROCESS" || (mbo.getInt("NODEID") === 0 && mbo.getInt("ACTIONID") === 0);
      }));
    }
    // 子表与主记录同事务, 统一在 saveOrUpdateWorkflow 末尾保存
  } finally {
    deferClose(noteSet);
  }
}

/**
 * 按源定义启用/激活工作流(框架标准动作):
 *   validateProcess() 定义校验 → enableProcess() 启用 → makeProcessActive() 激活(同时生成 WFREVISION 修订记录)
 * 校验不通过时保持草稿状态, 并把校验信息返回给调用方
 * @returns {Array<string>} 校验/启用过程中的提示信息
 */
function enableAndActivate(processMbo, processSet, data, processName, processRev) {
  var warnings = [];
  var label = processName + "(" + processRev + ")";
  try {
    var processId = processMbo.getUniqueIDValue();
    if (!processMbo.validateProcess()) {
      warnings = collectWarnings(processSet);
      logger.warn("[" + scriptName + "] 工作流 " + label + " 定义校验未通过, 保持草稿状态: " + warnings.join(" | "));
      return warnings;
    }
    // 定义有效: 启用并保存
    processMbo.enableProcess();
    processSet.save(NA);
    if (data.active === true) {
      // save 之后 set 会刷新, 主记录实例已失效, 需重新取一次再执行激活
      processSet.reset();
      processMbo = processSet.getMboForUniqueId(processId);
      processMbo.makeProcessActive();
      processSet.save(NA);
    }
    logger.info("[" + scriptName + "] 工作流 " + label + " 已按源定义启用" + (data.active === true ? "并激活" : ""));
  } catch (error) {
    logger.error("[" + scriptName + "] 启用工作流 " + label + " 失败: " + error);
    warnings.push("启用/激活失败: " + errorMessage(error));
  }
  return warnings;
}

// =================================================================================
// 校验辅助
// =================================================================================

/**
 * 导入前检查工作流引用的外部配置在目标环境是否存在:
 *   WFACTION.ACTION      -> ACTION(操作)
 *   WFASSIGNMENT.ROLEID  -> MAXROLE(角色/人员组, 人员组为 TYPE=PERSONGROUP 的角色)
 *   WFNOTIFICATION.TEMPLATEID -> COMMTEMPLATE(通讯模板)
 *   WFSUBPROCESS.SUBPROCESSNAME -> WFPROCESS(子流程)
 * 缺失时直接抛出, 避免写到一半才由框架报错
 */
function checkWorkflowReferences(data, objectName) {
  var missing = [];
  var checked = {};
  var nodes = pickChild(data, WF_NODES, WF_NODES_LEGACY) || [];

  function requireExists(objectNameToCheck, attr, value, label) {
    if (!value) {
      return;
    }
    var key = objectNameToCheck + "|" + String(value).toUpperCase();
    if (checked[key]) {
      return;
    }
    checked[key] = true;
    var sqlf = new SqlFormat(attr + " = :1");
    sqlf.setObject(1, objectNameToCheck, attr, String(value).toUpperCase());
    if (!existsMbo(objectNameToCheck, sqlf.format())) {
      missing.push(label + ": " + value);
    }
  }

  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i] || {};
    var actions = pickChild(node, WF_ACTIONS, WF_ACTIONS_LEGACY) || [];
    for (var a = 0; a < actions.length; a++) {
      requireExists("ACTION", "ACTION", actions[a].action, "操作(ACTION)");
      var actionNotes = pickChild(actions[a], WF_NOTIFICATIONS, WF_NOTIFICATIONS_LEGACY) || [];
      for (var an = 0; an < actionNotes.length; an++) {
        requireExists("COMMTEMPLATE", "TEMPLATEID", actionNotes[an].templateId, "通讯模板(COMMTEMPLATE)");
      }
    }
    var assignments = pickChild(node, WF_ASSIGNMENT, WF_ASSIGNMENT_LEGACY) || [];
    for (var g = 0; g < assignments.length; g++) {
      requireExists("MAXROLE", "MAXROLE", assignments[g].roleId, "角色/人员组(MAXROLE)");
      requireExists("COMMTEMPLATE", "TEMPLATEID", assignments[g].templateId, "通讯模板(COMMTEMPLATE)");
      requireExists("MAXROLE", "MAXROLE", assignments[g].escRole, "升职角色(MAXROLE)");
    }
    var subprocess = pickChild(node, NODE_TYPE_DEF.WFSUBPROCESS.key, NODE_TYPE_DEF.WFSUBPROCESS.legacyKey);
    if (subprocess && subprocess.subProcessName) {
      requireExists("WFPROCESS", "PROCESSNAME", subprocess.subProcessName, "子流程(WFPROCESS)");
    }
    var nodeNotes = pickChild(node, WF_NOTIFICATIONS, WF_NOTIFICATIONS_LEGACY) || [];
    for (var nn = 0; nn < nodeNotes.length; nn++) {
      requireExists("COMMTEMPLATE", "TEMPLATEID", nodeNotes[nn].templateId, "通讯模板(COMMTEMPLATE)");
    }
  }
  var processNotes = pickChild(data, WF_NOTIFICATIONS, WF_NOTIFICATIONS_LEGACY) || [];
  for (var p = 0; p < processNotes.length; p++) {
    requireExists("COMMTEMPLATE", "TEMPLATEID", processNotes[p].templateId, "通讯模板(COMMTEMPLATE)");
  }

  if (missing.length > 0) {
    throw new MXApplicationException("#", "目标环境缺少工作流 " + data.processName + " 引用的配置, 请先导入: " + missing.join("; "));
  }
}

/** 目标对象是否存在(按主键/业务键属性查询) */
function existsMbo(objectName, whereClause) {
  /** @type {psdi.mbo.MboSetRemote} */
  var set = null;
  try {
    set = MXServer.getMXServer().getMboSet(objectName, userInfo);
    set.setWhere(whereClause);
    set.reset();
    return !set.isEmpty();
  } finally {
    _close(set);
  }
}

/** 注册当前工作流已有的通知 UNIQUEID(导入时避免撞唯一索引) */
function registerExistingNoteIds(processMbo, isNew) {
  if (isNew || processMbo == null) {
    return;
  }
  /** @type {psdi.mbo.MboSetRemote} */
  var noteSet = processMbo.getMboSet("NOTIFICATIONS");
  try {
    var noteMbo = noteSet.moveFirst();
    while (noteMbo != null) {
      importCtx.noteUniqueIds[String(noteMbo.getInt("UNIQUEID"))] = true;
      noteMbo = noteSet.moveNext();
    }
  } finally {
    _close(noteSet);
  }
}

/** 取 MboSet 上的提示/校验信息(框架 validateProcess 等会写入告警) */
function collectWarnings(mboSet) {
  var warnings = [];
  try {
    var es = mboSet.getWarnings();
    if (es != null) {
      for (var i = 0; i < es.length; i++) {
        if (es[i] != null) {
          try {
            warnings.push(String(es[i].getMessage()));
          } catch (ignored) {
            warnings.push(String(es[i]));
          }
        }
      }
    }
  } catch (ignored) { }
  return warnings;
}

// =================================================================================
// 操作(ACTION) 列表/导出/导入
// 字段与 SKS.AUTOSCRIPT.OBJECTS 的 actions 类型保持一致(两边文件可直接互相复制):
//   action/description/type/useWith/senderSysId/value/objectName/parameter/memo/actionGroup
// 对应界面(系统配置 → 操作, xmltmp/dev/system/action.xml):
//   操作/描述/对象/类型/值(dispvalue)/参数/备注/用于/成员(操作组 ACTION_MEMBERS)
// =================================================================================

/** ACTION 查询条件: where / action(名称, 单个或数组) / 缺省 1=1 */
function buildActionWhere(requestData) {
  if (requestData.where) {
    return requestData.where;
  }
  return buildKeyInWhere("ACTION", "ACTION", requestData.action || requestData.actions);
}

/** 操作列表(精简字段, 支持 pageNum/pageSize) */
function actionListResponse(requestData) {
  /** @type {psdi.mbo.MboSetRemote} */
  var actionSet = null;
  try {
    requestData = requestData || {};
    var pager = readPager(requestData);
    actionSet = MXServer.getMXServer().getMboSet("ACTION", userInfo);
    actionSet.setWhere(buildActionWhere(requestData));
    actionSet.setOrderBy("ACTION");
    actionSet.reset();
    var total = actionSet.count();
    var rows = [];
    var idx = 0;
    var actionMbo = actionSet.moveFirst();
    while (actionMbo != null) {
      if (!pager.hasPagination || (idx >= (pager.pageNum - 1) * pager.pageSize && idx < pager.pageNum * pager.pageSize)) {
        rows.push(buildActionListRow(actionMbo));
      }
      idx++;
      actionMbo = actionSet.moveNext();
    }
    var result = { actions: rows };
    if (pager.hasPagination) {
      result.total = total;
      result.pageNum = pager.pageNum;
      result.pageSize = pager.pageSize;
    }
    return JSON.stringify(result);
  } catch (error) {
    logger.error("[" + scriptName + "] 查询操作列表失败: " + error);
    return JSON.stringify({ status: "error", message: errorMessage(error) });
  } finally {
    _close(actionSet);
  }
}

/** 单条操作完整导出: {"id":<ACTIONID>} 或 {"action":"ACT_XXX"} */
function actionDetailResponse(requestData) {
  /** @type {psdi.mbo.MboSetRemote} */
  var actionSet = null;
  try {
    requestData = requestData || {};
    actionSet = MXServer.getMXServer().getMboSet("ACTION", userInfo);
    /** @type {psdi.mbo.MboRemote} */
    var actionMbo = null;
    if (requestData.id !== undefined && requestData.id !== null && String(requestData.id) !== "") {
      actionMbo = actionSet.getMboForUniqueId(parseInt(requestData.id, 10));
    } else if (requestData.action && !Array.isArray(requestData.action)) {
      actionSet.setWhere(buildKeyInWhere("ACTION", "ACTION", requestData.action));
      actionSet.setOrderBy("ACTION");
      actionSet.reset();
      actionMbo = actionSet.moveFirst();
    }
    if (actionMbo == null) {
      return JSON.stringify({ status: "error", message: "未找到指定的操作(ACTION)" });
    }
    return JSON.stringify({ actions: [buildAction(actionMbo)] });
  } catch (error) {
    logger.error("[" + scriptName + "] 导出操作详情失败: " + error);
    return JSON.stringify({ status: "error", message: errorMessage(error) });
  } finally {
    _close(actionSet);
  }
}

/** 操作批量完整导出(缺省导出系统中全部操作, 可用 where / action 过滤) */
function actionExportResponse(requestData) {
  /** @type {psdi.mbo.MboSetRemote} */
  var actionSet = null;
  try {
    requestData = requestData || {};
    actionSet = MXServer.getMXServer().getMboSet("ACTION", userInfo);
    actionSet.setWhere(buildActionWhere(requestData));
    actionSet.setOrderBy("ACTION");
    actionSet.reset();
    var arr = [];
    var actionMbo = actionSet.moveFirst();
    while (actionMbo != null) {
      arr.push(buildAction(actionMbo));
      actionMbo = actionSet.moveNext();
    }
    logger.info("[" + scriptName + "] actions export 完成, 共 " + arr.length + " 个");
    return JSON.stringify({ actions: arr });
  } catch (error) {
    logger.error("[" + scriptName + "] 导出操作失败: " + error);
    return JSON.stringify({ status: "error", message: errorMessage(error) });
  } finally {
    _close(actionSet);
  }
}

/** 操作列表行 */
function buildActionListRow(mbo) {
  var row = {
    id: mbo.getUniqueIDValue(),
    action: mbo.getString("ACTION"),
    description: getStr(mbo, "DESCRIPTION"),
    type: getStr(mbo, "TYPE")
  };
  var objectName = getStr(mbo, "OBJECTNAME");
  if (objectName) {
    row.objectName = objectName;
  }
  return row;
}

/**
 * 构建单个操作的完整导出对象
 * TYPE 取值(ACTIONTYPE 域): CHANGESTATUS/SETVALUE/CREATE/.../GROUP/CUSTOM 等
 * 值的存放: CUSTOM 类型在 VALUE, 其它类型在 VALUE2
 */
function buildAction(actionMbo) {
  var action = { action: actionMbo.getString("ACTION") };
  var description = getStr(actionMbo, "DESCRIPTION");
  if (description) {
    action.description = description;
  }
  var type = getStr(actionMbo, "TYPE");
  if (type) {
    action.type = type;
  }
  var useWith = getStr(actionMbo, "USEWITH");
  if (useWith) {
    action.useWith = useWith;
  }
  var senderSysId = getStr(actionMbo, "SENDERSYSID");
  if (senderSysId) {
    action.senderSysId = senderSysId;
  }
  if (type === "CUSTOM") {
    if (!actionMbo.isNull("VALUE")) {
      action.value = actionMbo.getString("VALUE");
    }
  } else if (!actionMbo.isNull("VALUE2")) {
    action.value = actionMbo.getString("VALUE2");
  }
  if (type !== "GROUP") {
    var objectName = getStr(actionMbo, "OBJECTNAME");
    if (objectName) {
      action.objectName = objectName;
    }
    var parameter = getStr(actionMbo, "PARAMETER");
    if (parameter) {
      action.parameter = parameter;
    }
  }
  if (type === "CHANGESTATUS") {
    var memo = getStr(actionMbo, "MEMO");
    if (memo) {
      action.memo = memo;
    }
  }
  // GROUP 类型: 操作组成员(ACTION_MEMBERS -> ACTIONGROUP)
  var actionGroup = [];
  /** @type {psdi.mbo.MboSetRemote} */
  var groupSet = actionMbo.getMboSet("ACTION_MEMBERS");
  try {
    groupSet.setOrderBy("SEQUENCE");
    var groupMbo = groupSet.moveFirst();
    while (groupMbo != null) {
      actionGroup.push({ member: groupMbo.getString("MEMBER"), sequence: groupMbo.getInt("SEQUENCE") });
      groupMbo = groupSet.moveNext();
    }
  } finally {
    _close(groupSet);
  }
  if (actionGroup.length > 0) {
    action.actionGroup = actionGroup;
  }
  return action;
}

/** 操作导入(_type=actions&_action=import) */
function importActionsResponse(requestData) {
  if (!requestData) {
    return JSON.stringify({ status: "error", message: "请求体(requestBody)不能为空" });
  }
  var items = extractItems(requestData, ['actions']);
  if (items.length === 0) {
    return JSON.stringify({ status: "error", message: "没有提供操作(actions)数据" });
  }
  var batch = runBatch(sortActionsForImport(items), "action", saveOrUpdateAction);
  logger.info("[" + scriptName + "] 操作导入完成: 共 " + batch.total + ", 成功 " + batch.success + ", 失败 " + batch.failed);
  return JSON.stringify({
    status: "success",
    message: "批量导入完成",
    impMode: impMode,
    summary: { total: batch.total, success: batch.success, failed: batch.failed },
    result: batch.result
  }, null, 4);
}

/**
 * 保存或更新单个操作(ACTION); 业务键 ACTION(工作流出线通过 WFACTION.ACTION 引用)
 * 注意: TYPE 必须在 VALUE 之前写(框架按类型决定值存放字段), 操作组成员最后处理
 * @returns {Object} {message}
 */
function saveOrUpdateAction(data, index) {
  var name = getStr(data.action || data.actionname);
  if (!name) {
    throw new MXApplicationException("#", "第 " + index + " 个操作的 action(操作名称) 不能为空");
  }
  name = name.toUpperCase();
  var type = getStr(data.type);
  /** @type {psdi.mbo.MboSetRemote} */
  var actionSet = null;
  /** @type {psdi.mbo.MboSetRemote} */
  var groupSet = null;
  try {
    actionSet = MXServer.getMXServer().getMboSet("ACTION", userInfo);
    var sqlf = new SqlFormat("action = :1");
    sqlf.setObject(1, "ACTION", "ACTION", name);
    actionSet.setWhere(sqlf.format());
    actionSet.reset();

    var isNew = actionSet.isEmpty();
    /** @type {psdi.mbo.MboRemote} */
    var actionMbo = null;
    var message = "修改成功";
    if (isNew) {
      if (!type) {
        throw new MXApplicationException("#", "新增操作 " + name + " 需要提供 type(操作类型)");
      }
      actionMbo = actionSet.add(NA);
      actionMbo.setValue("ACTION", name, NA);
      message = "新增成功";
    } else {
      actionMbo = actionSet.getMbo(0);
      if (impMode === IMP_MODE_ADD) {
        return { message: "已存在, 按 add 模式不修改" };
      }
    }

    // 先写类型: 框架按 TYPE 决定值的存放字段(VALUE/VALUE2)与可用字段
    setStrValue(actionMbo, "TYPE", type);
    setStrValue(actionMbo, "DESCRIPTION", data.description);
    setStrValue(actionMbo, "USEWITH", data.useWith);
    setStrValue(actionMbo, "SENDERSYSID", data.senderSysId);

    var currentType = String(actionMbo.getString("TYPE") || "").toUpperCase();
    if (data.value !== undefined && data.value !== null && data.value !== "") {
      if (currentType === "CUSTOM") {
        setStrValue(actionMbo, "VALUE", data.value);
      } else {
        setStrValue(actionMbo, "VALUE2", data.value);
      }
    }
    if (currentType !== "GROUP") {
      setStrValue(actionMbo, "OBJECTNAME", data.objectName);
      setStrValue(actionMbo, "PARAMETER", data.parameter);
    }
    if (currentType === "CHANGESTATUS") {
      setStrValue(actionMbo, "MEMO", data.memo);
    }

    // GROUP 类型: 操作组成员(业务键 MEMBER), 成员操作需已存在(导入时非 GROUP 的排前面)
    var groupDatas = pickChild(data, "actionGroup", "action_group");
    if (groupDatas && groupDatas.length > 0) {
      groupSet = actionMbo.getMboSet("ACTION_MEMBERS");
      for (var i = 0; i < groupDatas.length; i++) {
        var g = groupDatas[i] || {};
        if (!g.member) {
          continue;
        }
        /** @type {psdi.mbo.MboRemote} */
        var groupMbo = findMboByAttr(groupSet, "MEMBER", String(g.member).toUpperCase());
        if (groupMbo == null) {
          groupMbo = groupSet.add(NA);
          groupMbo.setValue("MEMBER", String(g.member).toUpperCase(), NA);
        }
        setIntValue(groupMbo, "SEQUENCE", g.sequence);
      }
    }

    // 先保存(连同操作组成员), 再关闭子表集合
    actionSet.save(NA);
    logger.info("[" + scriptName + "] 操作保存成功: ACTION=" + name + ", TYPE=" + currentType);
    return { message: message };
  } catch (error) {
    logger.error("[" + scriptName + "] 保存操作失败: " + name + ", " + error);
    throw new MXApplicationException("#", "保存操作失败: " + name + ", " + errorMessage(error));
  } finally {
    _close(groupSet);
    _close(actionSet);
  }
}

/** 操作组(GROUP)依赖成员操作, 导入时把非 GROUP 的排到前面 */
function sortActionsForImport(items) {
  var normal = [];
  var groups = [];
  for (var i = 0; i < items.length; i++) {
    var type = getStr((items[i] || {}).type);
    if (type && type.toUpperCase() === "GROUP") {
      groups.push(items[i]);
    } else {
      normal.push(items[i]);
    }
  }
  return normal.concat(groups);
}

// =================================================================================
// 角色(MAXROLE) 列表/导出/导入
// 字段对应界面(系统配置 → 角色, xmltmp/dev/system/role.xml):
//   maxrole(角色)/description(描述)/type(类型)/objectname(对象)/value(值)/parameter(参数)
//   /isemaildataset(邮件数据集)/isbroadcast(广播)/senderSysId(系统字段)
// 注意: TYPE 必须在 VALUE 之前写 —— 框架在写 TYPE 时会清空 VALUE/PARAMETER/ISEMAILDATASET
// =================================================================================

/** MAXROLE 查询条件: where / maxrole(名称, 单个或数组) / 缺省 1=1 */
function buildMaxRoleWhere(requestData) {
  if (requestData.where) {
    return requestData.where;
  }
  return buildKeyInWhere("MAXROLE", "MAXROLE", requestData.maxrole || requestData.maxroles);
}

/** 角色列表(支持 pageNum/pageSize) */
function maxRoleListResponse(requestData) {
  /** @type {psdi.mbo.MboSetRemote} */
  var roleSet = null;
  try {
    requestData = requestData || {};
    var pager = readPager(requestData);
    roleSet = MXServer.getMXServer().getMboSet("MAXROLE", userInfo);
    roleSet.setWhere(buildMaxRoleWhere(requestData));
    roleSet.setOrderBy("MAXROLE");
    roleSet.reset();
    var total = roleSet.count();
    var rows = [];
    var idx = 0;
    var roleMbo = roleSet.moveFirst();
    while (roleMbo != null) {
      if (!pager.hasPagination || (idx >= (pager.pageNum - 1) * pager.pageSize && idx < pager.pageNum * pager.pageSize)) {
        rows.push(buildMaxRoleListRow(roleMbo));
      }
      idx++;
      roleMbo = roleSet.moveNext();
    }
    var result = { maxroles: rows };
    if (pager.hasPagination) {
      result.total = total;
      result.pageNum = pager.pageNum;
      result.pageSize = pager.pageSize;
    }
    return JSON.stringify(result);
  } catch (error) {
    logger.error("[" + scriptName + "] 查询角色列表失败: " + error);
    return JSON.stringify({ status: "error", message: errorMessage(error) });
  } finally {
    _close(roleSet);
  }
}

/** 单条角色完整导出: {"id":<MAXROLEID>} 或 {"maxrole":"ROLE1"} */
function maxRoleDetailResponse(requestData) {
  /** @type {psdi.mbo.MboSetRemote} */
  var roleSet = null;
  try {
    requestData = requestData || {};
    roleSet = MXServer.getMXServer().getMboSet("MAXROLE", userInfo);
    /** @type {psdi.mbo.MboRemote} */
    var roleMbo = null;
    if (requestData.id !== undefined && requestData.id !== null && String(requestData.id) !== "") {
      roleMbo = roleSet.getMboForUniqueId(parseInt(requestData.id, 10));
    } else if (requestData.maxrole && !Array.isArray(requestData.maxrole)) {
      roleSet.setWhere(buildKeyInWhere("MAXROLE", "MAXROLE", requestData.maxrole));
      roleSet.setOrderBy("MAXROLE");
      roleSet.reset();
      roleMbo = roleSet.moveFirst();
    }
    if (roleMbo == null) {
      return JSON.stringify({ status: "error", message: "未找到指定的角色(MAXROLE)" });
    }
    return JSON.stringify({ maxroles: [buildMaxRole(roleMbo)] });
  } catch (error) {
    logger.error("[" + scriptName + "] 导出角色详情失败: " + error);
    return JSON.stringify({ status: "error", message: errorMessage(error) });
  } finally {
    _close(roleSet);
  }
}

/** 角色批量完整导出(缺省导出系统中全部角色, 可用 where / maxrole 过滤) */
function maxRoleExportResponse(requestData) {
  /** @type {psdi.mbo.MboSetRemote} */
  var roleSet = null;
  try {
    requestData = requestData || {};
    roleSet = MXServer.getMXServer().getMboSet("MAXROLE", userInfo);
    roleSet.setWhere(buildMaxRoleWhere(requestData));
    roleSet.setOrderBy("MAXROLE");
    roleSet.reset();
    var arr = [];
    var roleMbo = roleSet.moveFirst();
    while (roleMbo != null) {
      arr.push(buildMaxRole(roleMbo));
      roleMbo = roleSet.moveNext();
    }
    logger.info("[" + scriptName + "] maxroles export 完成, 共 " + arr.length + " 个");
    return JSON.stringify({ maxroles: arr });
  } catch (error) {
    logger.error("[" + scriptName + "] 导出角色失败: " + error);
    return JSON.stringify({ status: "error", message: errorMessage(error) });
  } finally {
    _close(roleSet);
  }
}

/** 角色列表行 */
function buildMaxRoleListRow(mbo) {
  return {
    id: mbo.getUniqueIDValue(),
    maxrole: mbo.getString("MAXROLE"),
    description: getStr(mbo, "DESCRIPTION"),
    type: getStr(mbo, "TYPE"),
    value: getStr(mbo, "VALUE"),
    objectName: getStr(mbo, "OBJECTNAME")
  };
}

/** 构建单个角色的完整导出对象 */
function buildMaxRole(roleMbo) {
  var role = { maxrole: roleMbo.getString("MAXROLE") };
  var description = getStr(roleMbo, "DESCRIPTION");
  if (description) {
    role.description = description;
  }
  var type = getStr(roleMbo, "TYPE");
  if (type) {
    role.type = type;
  }
  var value = getStr(roleMbo, "VALUE");
  if (value) {
    role.value = value;
  }
  var objectName = getStr(roleMbo, "OBJECTNAME");
  if (objectName) {
    role.objectName = objectName;
  }
  var parameter = getStr(roleMbo, "PARAMETER");
  if (parameter) {
    role.parameter = parameter;
  }
  var senderSysId = getStr(roleMbo, "SENDERSYSID");
  if (senderSysId) {
    role.senderSysId = senderSysId;
  }
  role.emailDataSet = roleMbo.getBoolean("ISEMAILDATASET");
  role.broadcast = roleMbo.getBoolean("ISBROADCAST");
  return role;
}

/** 角色导入(_type=maxroles&_action=import) */
function importMaxRolesResponse(requestData) {
  if (!requestData) {
    return JSON.stringify({ status: "error", message: "请求体(requestBody)不能为空" });
  }
  var items = extractItems(requestData, ['maxroles']);
  if (items.length === 0) {
    return JSON.stringify({ status: "error", message: "没有提供角色(maxroles)数据" });
  }
  var batch = runBatch(items, "maxrole", saveOrUpdateMaxRole);
  logger.info("[" + scriptName + "] 角色导入完成: 共 " + batch.total + ", 成功 " + batch.success + ", 失败 " + batch.failed);
  return JSON.stringify({
    status: "success",
    message: "批量导入完成",
    impMode: impMode,
    summary: { total: batch.total, success: batch.success, failed: batch.failed },
    result: batch.result
  }, null, 4);
}

/**
 * 保存或更新单个角色(MAXROLE); 业务键 MAXROLE(WFASSIGNMENT.ROLEID / ESCROLE 引用它)
 * 人员组型角色: TYPE=PERSONGROUP, VALUE=人员组编号
 * @returns {Object} {message}
 */
function saveOrUpdateMaxRole(data, index) {
  var name = getStr(data.maxrole || data.roleId || data.roleid);
  if (!name) {
    throw new MXApplicationException("#", "第 " + index + " 个角色的 maxrole(角色名称) 不能为空");
  }
  name = name.toUpperCase();
  var type = getStr(data.type);
  /** @type {psdi.mbo.MboSetRemote} */
  var roleSet = null;
  try {
    roleSet = MXServer.getMXServer().getMboSet("MAXROLE", userInfo);
    var sqlf = new SqlFormat("maxrole = :1");
    sqlf.setObject(1, "MAXROLE", "MAXROLE", name);
    roleSet.setWhere(sqlf.format());
    roleSet.reset();

    var isNew = roleSet.isEmpty();
    /** @type {psdi.mbo.MboRemote} */
    var roleMbo = null;
    var message = "修改成功";
    if (isNew) {
      if (!type) {
        throw new MXApplicationException("#", "新增角色 " + name + " 需要提供 type(角色类型: PERSON/PERSONGROUP/DATASET/USERDATA/CUSTOM 等)");
      }
      roleMbo = roleSet.add(NA);
      roleMbo.setValue("MAXROLE", name, NA);
      message = "新增成功";
    } else {
      roleMbo = roleSet.getMbo(0);
      if (impMode === IMP_MODE_ADD) {
        return { message: "已存在, 按 add 模式不修改" };
      }
    }

    // 先写类型: 框架写 TYPE 时会清空 VALUE/PARAMETER/ISEMAILDATASET
    setStrValue(roleMbo, "TYPE", type);
    setStrValue(roleMbo, "DESCRIPTION", data.description);
    setStrValue(roleMbo, "VALUE", data.value);
    setStrValue(roleMbo, "OBJECTNAME", data.objectName);
    setStrValue(roleMbo, "PARAMETER", data.parameter);
    setStrValue(roleMbo, "SENDERSYSID", data.senderSysId);
    setYornValue(roleMbo, "ISEMAILDATASET", data.emailDataSet);
    setYornValue(roleMbo, "ISBROADCAST", data.broadcast);

    roleSet.save(NA);
    logger.info("[" + scriptName + "] 角色保存成功: MAXROLE=" + name + ", TYPE=" + roleMbo.getString("TYPE"));
    return { message: message };
  } catch (error) {
    logger.error("[" + scriptName + "] 保存角色失败: " + name + ", " + error);
    throw new MXApplicationException("#", "保存角色失败: " + name + ", " + errorMessage(error));
  } finally {
    _close(roleSet);
  }
}

// =================================================================================
// 流程引用到的操作/角色(迁移导出时一并带出, 生成 JSON 中 actions/maxroles 放在 workflows 之前)
//   WFACTION.ACTION      -> ACTION.ACTION
//   WFASSIGNMENT.ROLEID  -> MAXROLE.MAXROLE(角色/人员组)
//   WFASSIGNMENT.ESCROLE -> MAXROLE.MAXROLE(升级角色)
// =================================================================================

/**
 * 收集一批工作流定义里引用到的操作名与角色名(去重排序)
 * @returns {Object} {actions:[名称], maxroles:[名称]}
 */
function collectWorkflowRefs(workflows) {
  var actionNames = {};
  var roleIds = {};
  for (var w = 0; w < workflows.length; w++) {
    var nodes = pickChild(workflows[w], WF_NODES, WF_NODES_LEGACY) || [];
    for (var n = 0; n < nodes.length; n++) {
      var node = nodes[n] || {};
      var actions = pickChild(node, WF_ACTIONS, WF_ACTIONS_LEGACY) || [];
      for (var a = 0; a < actions.length; a++) {
        var actionName = getStr((actions[a] || {}).action);
        if (actionName) {
          actionNames[actionName.toUpperCase()] = true;
        }
      }
      var assignments = pickChild(node, WF_ASSIGNMENT, WF_ASSIGNMENT_LEGACY) || [];
      for (var g = 0; g < assignments.length; g++) {
        var asgn = assignments[g] || {};
        var roleId = getStr(asgn.roleId);
        if (roleId) {
          roleIds[roleId.toUpperCase()] = true;
        }
        var escRole = getStr(asgn.escRole);
        if (escRole) {
          roleIds[escRole.toUpperCase()] = true;
        }
      }
    }
  }
  return { actions: Object.keys(actionNames).sort(), maxroles: Object.keys(roleIds).sort() };
}

/**
 * 按名称导出操作(操作组 GROUP 的成员操作递归带出, 否则目标环境建不出操作组)
 * @param {Array<string>} actionNames
 */
function buildReferencedActions(actionNames) {
  var result = [];
  var loaded = {};
  var pending = actionNames.slice(0);
  while (pending.length > 0) {
    var name = String(pending.shift()).toUpperCase();
    if (loaded[name]) {
      continue;
    }
    loaded[name] = true;
    /** @type {psdi.mbo.MboSetRemote} */
    var actionSet = null;
    try {
      actionSet = MXServer.getMXServer().getMboSet("ACTION", userInfo);
      var sqlf = new SqlFormat("action = :1");
      sqlf.setObject(1, "ACTION", "ACTION", name);
      actionSet.setWhere(sqlf.format());
      actionSet.reset();
      if (actionSet.isEmpty()) {
        logger.warn("[" + scriptName + "] 流程引用的操作不存在, 未导出: " + name);
        continue;
      }
      /** @type {psdi.mbo.MboRemote} */
      var actionMbo = actionSet.getMbo(0);
      result.push(buildAction(actionMbo));
      if (String(actionMbo.getString("TYPE") || "").toUpperCase() === "GROUP") {
        /** @type {psdi.mbo.MboSetRemote} */
        var memberSet = actionMbo.getMboSet("ACTION_MEMBERS");
        try {
          var memberMbo = memberSet.moveFirst();
          while (memberMbo != null) {
            var member = String(memberMbo.getString("MEMBER") || "").toUpperCase();
            if (member && !loaded[member]) {
              pending.push(member);
            }
            memberMbo = memberSet.moveNext();
          }
        } finally {
          _close(memberSet);
        }
      }
    } finally {
      _close(actionSet);
    }
  }
  return sortObjectsBy(result, "action");
}

/**
 * 按角色名导出角色
 * @param {Array<string>} roleIds
 */
function buildReferencedMaxRoles(roleIds) {
  var result = [];
  for (var i = 0; i < roleIds.length; i++) {
    var name = String(roleIds[i]).toUpperCase();
    /** @type {psdi.mbo.MboSetRemote} */
    var roleSet = null;
    try {
      roleSet = MXServer.getMXServer().getMboSet("MAXROLE", userInfo);
      var sqlf = new SqlFormat("maxrole = :1");
      sqlf.setObject(1, "MAXROLE", "MAXROLE", name);
      roleSet.setWhere(sqlf.format());
      roleSet.reset();
      if (roleSet.isEmpty()) {
        logger.warn("[" + scriptName + "] 流程引用的角色不存在, 未导出: " + name);
        continue;
      }
      result.push(buildMaxRole(roleSet.getMbo(0)));
    } finally {
      _close(roleSet);
    }
  }
  return sortObjectsBy(result, "maxrole");
}

/** 数组按属性排序(导出结果稳定, 便于比对) */
function sortObjectsBy(arr, attr) {
  arr.sort(function (a, b) {
    var av = a && a[attr] ? String(a[attr]) : "";
    var bv = b && b[attr] ? String(b[attr]) : "";
    return av < bv ? -1 : (av > bv ? 1 : 0);
  });
  return arr;
}

/**
 * 按业务键批量取记录的条件: (KEY = 'a' or KEY = 'b')
 * 逐值用 SqlFormat 格式化, 保证转义/长度处理正确
 */
function buildKeyInWhere(objectName, column, values) {
  if (!values) {
    return "1=1";
  }
  var list = Array.isArray(values) ? values : [values];
  var parts = [];
  for (var i = 0; i < list.length; i++) {
    if (!list[i]) {
      continue;
    }
    var f = new SqlFormat(column + " = :1");
    f.setObject(1, objectName, column, String(list[i]).toUpperCase());
    parts.push(f.format());
  }
  return parts.length > 0 ? "(" + parts.join(" or ") + ")" : "1=1";
}

// =================================================================================
// 通用辅助方法
// =================================================================================

/** 建立 WFPROCESS 查询条件: 支持 where / processName(+processRev) / 缺省 1=1 */
function buildWorkflowWhere(requestData) {
  if (requestData.where) {
    return requestData.where;
  }
  var processName = getStr(requestData.processName || requestData.processname);
  var processRev = requestData.processRev !== undefined && requestData.processRev !== null ? requestData.processRev : requestData.processrev;
  if (!processName) {
    return "1=1";
  }
  if (processRev === undefined || processRev === null || processRev === "") {
    var sqlf = new SqlFormat("processname = :1");
    sqlf.setObject(1, "WFPROCESS", "PROCESSNAME", processName.toUpperCase());
    return sqlf.format();
  }
  var sqlf2 = new SqlFormat("processname = :1 and processrev = :2");
  sqlf2.setObject(1, "WFPROCESS", "PROCESSNAME", processName.toUpperCase());
  sqlf2.setInt(2, toInt(processRev, 1));
  return sqlf2.format();
}

/** 解析 POST 请求体(JSON), 为空时返回 null */
function parseRequestData() {
  if (typeof requestBody === 'undefined' || !requestBody) {
    return null;
  }
  try {
    var data = JSON.parse(requestBody);
    if (data === null || typeof data !== 'object') {
      throw new MXApplicationException('#', '请求体(requestBody)必须是 JSON 对象');
    }
    return data;
  } catch (error) {
    throw new MXApplicationException('#', '请求体(requestBody) JSON 解析失败: ' + error);
  }
}

/**
 * 从请求体提取导入数组:
 *   {workflows:[...]} / {wfprocess:[...]} / {data:[...]} / 直接数组 / 单个对象
 */
function extractItems(requestData, wrapperKeys) {
  if (!requestData) {
    return [];
  }
  if (Array.isArray(requestData)) {
    return requestData;
  }
  if (requestData.data && Array.isArray(requestData.data)) {
    return requestData.data;
  }
  if (wrapperKeys) {
    var keys = Array.isArray(wrapperKeys) ? wrapperKeys : [wrapperKeys];
    for (var i = 0; i < keys.length; i++) {
      if (requestData[keys[i]] && Array.isArray(requestData[keys[i]])) {
        return requestData[keys[i]];
      }
    }
  }
  return [requestData];
}

/**
 * 读取子表/子对象: 优先用与 Maximo 表名一致的键(如 wfnodes/wfactions), 兼容旧键名(如 nodes/actions)
 * @param {Object} parent
 * @param {string} key - 新键名(Maximo 表名)
 * @param {string} legacyKey - 旧键名(可空)
 */
function pickChild(parent, key, legacyKey) {
  if (parent === null || parent === undefined) {
    return null;
  }
  if (parent[key] !== undefined && parent[key] !== null) {
    return parent[key];
  }
  if (legacyKey && parent[legacyKey] !== undefined && parent[legacyKey] !== null) {
    logger.warn("[" + scriptName + "] 使用了旧键名 '" + legacyKey + "', 已按 '" + key + "' 处理(建议改用新键名)");
    return parent[legacyKey];
  }
  return null;
}

/** 从请求体读取分页参数(pageNum/pageSize) */
function readPager(requestData) {
  var pageNum = requestData.pageNum;
  var pageSize = requestData.pageSize;
  var hasPagination = pageNum && pageSize;
  return {
    hasPagination: !!hasPagination,
    pageNum: hasPagination ? parseInt(pageNum, 10) : 1,
    pageSize: hasPagination ? parseInt(pageSize, 10) : 0
  };
}

/** 删除 MboSet 中不在 keep 内的记录(仅 migration + syncFlag 时调用) */
function deleteMissing(mboSet, keyAttr, keep, filterFn) {
  var toDelete = [];
  var mbo = mboSet.moveFirst();
  while (mbo != null) {
    if ((!filterFn || filterFn(mbo)) && !keep[String(mbo.getString(keyAttr))]) {
      toDelete.push(mbo);
    }
    mbo = mboSet.moveNext();
  }
  for (var i = 0; i < toDelete.length; i++) {
    logger.info("[" + scriptName + "] syncFlag=true, 删除 JSON 中不存在的子记录: " + mboSet.getName() + "." + keyAttr + "=" + toDelete[i].getString(keyAttr));
    toDelete[i].delete(NA);
  }
}

/** 在 MboSet 中按字符串属性查找第一条匹配记录, 找不到返回 null */
function findMboByAttr(mboSet, attr, value) {
  var mbo = mboSet.moveFirst();
  while (mbo) {
    // 已标记删除(未保存)的记录不参与匹配: 新增流程时 WFProcess.add() 自动建的开始/停止节点已被删除
    if (!mbo.toBeDeleted() && String(mbo.getString(attr)) === String(value)) {
      return mbo;
    }
    mbo = mboSet.moveNext();
  }
  return null;
}

/**
 * 取节点的 WFNODETYPE 内部值(如 WFSTART)。
 * WFNODE.NODETYPE 列存的是当前语言的外部(显示)值, 先转内部值; 已是内部值时直接使用。
 */
function getNodeTypeInternal(nodeMbo) {
  var raw = nodeMbo.getString("NODETYPE");
  var internal = null;
  try {
    internal = getTranslator().toInternalStringNoException("WFNODETYPE", raw, nodeMbo);
  } catch (ignored) { }
  if (internal && NODE_TYPE_DEF[internal]) {
    return internal;
  }
  var upper = raw == null ? "" : String(raw).toUpperCase();
  if (NODE_TYPE_DEF[upper]) {
    return upper;
  }
  return internal ? internal : upper;
}

/** 域值翻译器(按需初始化) */
function getTranslator() {
  if (translator === null) {
    translator = MXServer.getMXServer().getMaximoDD().getTranslator();
  }
  return translator;
}

/**
 * nodeType 归一化为 WFNODETYPE 内部值(WFSTART...)
 * 导出 JSON 中为内部值; 也兼容界面显示值(如 开始/START)
 */
function resolveNodeTypeInternal(value, mbo) {
  if (!value) {
    return null;
  }
  var upper = String(value).toUpperCase();
  if (NODE_TYPE_DEF[upper]) {
    return upper;
  }
  var internal = null;
  if (mbo != null) {
    try {
      internal = getTranslator().toInternalStringNoException("WFNODETYPE", String(value), mbo);
    } catch (ignored) { }
  }
  if (!internal) {
    try {
      internal = getTranslator().toInternalString("WFNODETYPE", String(value));
    } catch (ignored) { }
  }
  if (internal && NODE_TYPE_DEF[internal]) {
    return internal;
  }
  return null;
}

/** 内部值 -> WFNODETYPE 外部(显示)值, 写入 WFNODE.NODETYPE 列 */
function resolveNodeTypeValue(internalValue, nodeMbo) {
  try {
    return getTranslator().toExternalDefaultValue("WFNODETYPE", internalValue, nodeMbo);
  } catch (ignored) { }
  try {
    var exts = getTranslator().getExternalValues("WFNODETYPE", internalValue, nodeMbo);
    if (exts != null && exts.length > 0) {
      return exts[0];
    }
  } catch (ignored) { }
  // 兜底: 域中查不到时直接写内部值(英文环境通常等价)
  logger.warn("[" + scriptName + "] WFNODETYPE 域中未找到 " + internalValue + " 的外部值, 直接写入内部值");
  return internalValue;
}

/**
 * 字符串属性: 值非空且与当前值不同时才写入(NOACCESSCHECK, 忽略只读标志)。
 * 值相同则跳过: 回导/迁移场景天然幂等, 同时规避系统交付对象只读字段报错。
 */
function setStrValue(mbo, attr, val) {
  if (val === undefined || val === null || val === "") {
    return;
  }
  try {
    if (String(mbo.getString(attr)) === String(val)) {
      return;
    }
  } catch (ignored) { }
  mbo.setValue(attr, String(val), NA);
}

/** YORN 属性: 显式传入 true/false 且与当前值不同时写入 1/0, undefined 时保持原值 */
function setYornValue(mbo, attr, val) {
  if (val !== true && val !== false) {
    return;
  }
  try {
    // 注意: 空值(getBoolean 默认 false / getInt 默认 0)不能直接与目标值比较, 否则会把"空 -> 0"的差异漏掉
    if (!mbo.isNull(attr) && mbo.getBoolean(attr) === val) {
      return;
    }
  } catch (ignored) { }
  mbo.setValue(attr, val ? 1 : 0, NA);
}

/** 数值属性: 传入有效数字且与当前值不同时写入 */
function setIntValue(mbo, attr, val) {
  if (val === undefined || val === null || val === "") {
    return;
  }
  var num = toInt(val, null);
  if (num === null) {
    return;
  }
  try {
    // 空值不能直接比较(见 setYornValue): 列值为空而目标为 0 时仍需写入
    if (!mbo.isNull(attr) && mbo.getInt(attr) === num) {
      return;
    }
  } catch (ignored) { }
  mbo.setValue(attr, num, NA);
}

/** 取字符串属性, 为空返回 null */
function getStr(mboOrValue, attr) {
  if (attr === undefined) {
    var v = mboOrValue;
    return (v === undefined || v === null || v === "") ? null : String(v);
  }
  try {
    if (mboOrValue.isNull(attr)) {
      return null;
    }
    var s = mboOrValue.getString(attr);
    return (s === null || s === "") ? null : s;
  } catch (ignored) {
    return null;
  }
}

/** 取数值属性, 为空返回 null */
function getInt(mbo, attr) {
  try {
    return mbo.isNull(attr) ? null : mbo.getInt(attr);
  } catch (ignored) {
    return null;
  }
}

/** 取整, 无效时返回缺省值 */
function toInt(value, defaultVal) {
  if (value === undefined || value === null || value === "") {
    return defaultVal;
  }
  var num = parseInt(value, 10);
  return isNaN(num) ? defaultVal : num;
}

/** 统一错误信息 */
function errorMessage(error) {
  if (error === null || error === undefined) {
    return "未知错误";
  }
  if (error.message) {
    return String(error.message).replace(/^#+/, "");
  }
  return String(error).replace(/^#+/, "");
}

/** 读取 URL 查询参数, 缺省/空串返回 null(Maximo 的 getQueryParam 缺省返回字符串 "undefined") */
function getQueryParam(name) {
  try {
    var val = request.getQueryParam(name);
    if (val === undefined || val === null) {
      return null;
    }
    val = String(val);
    if (val === "" || val === "undefined" || val === "null") {
      return null;
    }
    return val;
  } catch (ignored) {
    return null;
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
  /** @type {psdi.mbo.MboSetRemote} */
  var groupUserSet = null;

  try {
    groupUserSet = MXServer.getMXServer().getMboSet('GROUPUSER', userInfo);

    // Get the ADMINGROUP MAXVAR value.
    var adminGroup = MXServer.getMXServer().lookup('MAXVARS').getString('ADMINGROUP', null);

    // Query for the current user and the found admin group.
    // The current user is determined by the implicity `user` variable.
    var sqlFormat = new SqlFormat('userid = :1 and groupname = :2');
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

function AdminError(reason, message) {
  Error.call(this, message);
  this.reason = reason;
  this.message = message;
}

AdminError.prototype = Object.create(Error.prototype);
AdminError.prototype.constructor = AdminError;

/** 关闭 MboSet */
function _close(mboSet) {
  try {
    if (mboSet != null && mboSet instanceof Java.type('psdi.mbo.MboSet')) {
      try { mboSet.close(); } catch (ignored) { }
      try { mboSet.cleanup(); } catch (ignored) { }
    }
  } catch (ignored) { }
}

/**
 * 登记需要延迟关闭的 MboSet。
 * 导入时子表与主记录共用同一事务, MboSet.cleanup() 会 reset 并脱离事务, 提前关闭会丢弃未保存的子表数据,
 * 因此子表集合统一在主表 save 之后由 closeDeferredSets() 关闭。
 */
function deferClose(mboSet) {
  if (mboSet != null) {
    deferredCloseSets.push(mboSet);
  }
}

/** 关闭本次导入登记的所有子表集合 */
function closeDeferredSets() {
  var sets = deferredCloseSets;
  deferredCloseSets = [];
  for (var i = 0; i < sets.length; i++) {
    _close(sets[i]);
  }
}

/**
 * 新增流程 1/2 提交后, 2/2 导入失败时清理掉这个空流程, 避免留下半成品
 * (此时节点/操作/分配均未提交, 删除主记录即可)
 */
function cleanupNewProcess(processName, processRev) {
  /** @type {psdi.mbo.MboSetRemote} */
  var processSet = null;
  try {
    processSet = MXServer.getMXServer().getMboSet("WFPROCESS", userInfo);
    var sqlf = new SqlFormat("processname = :1 and processrev = :2");
    sqlf.setObject(1, "WFPROCESS", "PROCESSNAME", processName);
    sqlf.setInt(2, processRev);
    processSet.setWhere(sqlf.format());
    processSet.reset();
    if (!processSet.isEmpty()) {
      /** @type {psdi.mbo.MboRemote} */
      var processMbo = processSet.moveFirst();
      processMbo.setValue("ENABLED", 0, NA);
      processMbo.setValue("ACTIVE", 0, NA);
      processMbo.setValue("AUTOINITIATE", 0, NA);
      processMbo.delete(NA);
      processSet.save(NA);
      logger.warn("[" + scriptName + "] 导入失败, 已清理新增的空流程: " + processName + "(" + processRev + ")");
    }
  } catch (error) {
    logger.warn("[" + scriptName + "] 清理空流程失败(请手工删除): " + processName + "(" + processRev + "), " + error);
  } finally {
    _close(processSet);
  }
}
