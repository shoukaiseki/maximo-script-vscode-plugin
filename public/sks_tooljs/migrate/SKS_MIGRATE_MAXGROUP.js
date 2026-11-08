// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable no-undef */
// @ts-nocheck
// MAXGROUP (安全组) 主记录迁移脚本, 供 SKS_MIGRATEAPI_SECURGROUP 调用
//
// 调用方式:
//   service.invokeScript("SKS_MIGRATE_MAXGROUP").changeMbo(config, data)
//   service.invokeScript("SKS_MIGRATE_MAXGROUP").getDetail(config, data)
//
// 特殊标记:
//   _ignoreMain: true  不修改主记录本身(不新增/不更新/不删除), 仅校验组是否存在;
//                      存在则返回 success/ignored(附现有记录内容), 调用方继续处理子表授权;
//                      不存在则返回 failed。
//   _delete: true      删除该组主记录(子表授权请显式传入删除数据)
//   _debug: true       返回字段级操作明细 _operations
//
// 主键: GROUPNAME
// 跳过字段: MAXGROUPID(自动编号), ROWSTAMP, LANGCODE(按目标环境处理)

var MXApplicationException = Java.type("psdi.util.MXApplicationException");
var mxserver = Packages.psdi.server.MXServer.getMXServer();
var logger = Packages.log4j.Logger.getLogger("SKS_MIGRATE_MAXGROUP");

var OBJECT_NAME = "MAXGROUP";
var SKIP_FIELDS = ["ROWSTAMP", "LANGCODE"];
var GROUPNAME_PATTERN = /^[A-Za-z0-9_\-]+$/;

var _sksCommonsUtils = null;
var _close = function () {
  _sksCommonsUtils = null;
};

function commons() {
  if (!_sksCommonsUtils) {
    try {
      _sksCommonsUtils = service.invokeScript("SKS_COMMONS_UTILS");
    } catch (ignored) {
      _sksCommonsUtils = null;
    }
  }
  return _sksCommonsUtils;
}

// ---------------------------------------------------------------------------
// 公开接口
// ---------------------------------------------------------------------------

/**
 * 导入单条 MAXGROUP 主记录
 * @param config { _userInfo, _debug, dmDeploySet }
 * @param data   { GROUPNAME, ..., _delete, _ignoreMain, 子表数组键会被自动跳过 }
 */
function changeMbo(config, data) {
  if (!data || typeof data !== "object") {
    throw new MXApplicationException("#", "data 必须为对象");
  }
  config = config || {};
  var groupname = String(data.GROUPNAME || data.groupname || "").trim();
  if (!groupname) {
    return { _status: "failed", _operation: "none", _message: "GROUPNAME 不能为空" };
  }
  if (!GROUPNAME_PATTERN.test(groupname)) {
    return { _status: "failed", _operation: "none", _message: "GROUPNAME 含非法字符: " + groupname };
  }
  var ignoreMain = isTrue(data["_ignoreMain"]);
  var wantDelete = isTrue(data["_delete"]);

  var set = null;
  try {
    set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
    var mboFound = findExisting(set, groupname);
    if (!mboFound) {
      if (ignoreMain) {
        return {
          GROUPNAME: groupname,
          _status: "failed",
          _operation: "ignored",
          _message: "_ignoreMain=true 但组不存在: " + groupname
        };
      }
      if (wantDelete) {
        return { GROUPNAME: groupname, _status: "success", _operation: "none", _message: "记录不存在, 无需删除" };
      }
    } else if (wantDelete) {
      mboFound.delete();
      saveSet(set, config);
      return { GROUPNAME: groupname, _status: "success", _operation: "deleted" };
    }

    if (ignoreMain) {
      // 不修改主记录本身, 返回现有记录供调用方继续处理子表
      var ignored = getDetailByMbo(mboFound);
      ignored._status = "success";
      ignored._operation = "ignored";
      return ignored;
    }

    var mbo = mboFound;
    var operation = "updated";
    if (!mbo) {
      mbo = set.add();
      if (!mbo) {
        throw new MXApplicationException("#", "无法新增 " + OBJECT_NAME + " 记录: " + groupname);
      }
      operation = "added";
      setMboValue(mbo, "GROUPNAME", groupname);
    }

    var ops = [];
    applyFields(mbo, data, ops);
    saveSet(set, config);

    var result = getDetailByMbo(mbo);
    result._status = "success";
    result._operation = operation;
    if (isTrue(config._debug)) {
      result._operations = ops;
    }
    return result;
  } catch (e) {
    logger.error("SKS_MIGRATE_MAXGROUP.changeMbo 失败: " + groupname, e);
    throw e;
  } finally {
    if (set != null) {
      try { set.close(); } catch (eIgnore) { }
    }
  }
}

/**
 * 导出单条主记录(不含子表)
 * @param config { _userInfo }
 * @param data   { GROUPNAME }
 */
function getDetail(config, data) {
  config = config || {};
  var groupname = String((data && (data.GROUPNAME || data.groupname)) || "").trim();
  if (!groupname) {
    throw new MXApplicationException("#", "GROUPNAME 不能为空");
  }
  var set = null;
  try {
    set = mxserver.getMboSet(OBJECT_NAME, config._userInfo);
    var mboFound = findExisting(set, groupname);
    if (!mboFound) {
      return null;
    }
    var result = getDetailByMbo(mboFound);
    result._status = "success";
    result._operation = "none";
    return result;
  } catch (e) {
    logger.error("SKS_MIGRATE_MAXGROUP.getDetail 失败: " + groupname, e);
    throw e;
  } finally {
    if (set != null) {
      try { set.close(); } catch (eIgnore) { }
    }
  }
}

// ---------------------------------------------------------------------------
// 内部方法
// ---------------------------------------------------------------------------

function isTrue(v) {
  return v === true || String(v).toLowerCase() === "true";
}

function findExisting(set, groupname) {
  var it = set.iterator();
  while (it.hasNext()) {
    var m = it.next();
    if (String(m.getString("GROUPNAME") || "").trim() === groupname) {
      return m;
    }
  }
  return null;
}

function applyFields(mbo, data, ops) {
  var uniqueIdName = String(mbo.getUniqueIDName() || "").toUpperCase();
  for (var key in data) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
    if (key.charAt(0) === "_" || key.indexOf(":") >= 0) continue;
    var upper = String(key).toUpperCase();
    if (SKIP_FIELDS.indexOf(upper) >= 0) continue;
    if (upper === uniqueIdName) continue;

    var value = data[key];
    if (value === undefined) continue;
    var field = null;
    try {
      field = mbo.getMboField(upper);
    } catch (eIgnore) {
      field = null;
    }
    if (field == null) continue; // 非本对象属性(如子表数组键 SITEAUTH)跳过

    var oldValue = "";
    try { oldValue = mbo.getString(upper); } catch (eIgnore) { }
    var target = value === null ? "" : String(value);
    if (oldValue === target) continue;

    setMboValue(mbo, upper, value);
    ops.push({ attribute: upper, old: oldValue, value: target });
  }
}

function setMboValue(mbo, attr, value) {
  if (value === null || value === undefined) {
    try { mbo.setValue(attr, ""); } catch (e) { logger.warn(attr + " 置空失败: " + e); }
    return;
  }
  if (value instanceof Array) {
    for (var i = 0; i < value.length; i++) {
      mbo.setValue(attr, value[i]);
    }
    return;
  }
  var util = commons();
  if (util && typeof util.autoMboSetValue === "function") {
    try {
      util.autoMboSetValue(mbo, attr, value, false, false);
      return;
    } catch (e) {
      logger.warn("autoMboSetValue 失败, 回退 setValue: " + attr + " - " + e);
    }
  }
  try {
    mbo.setValue(attr, value);
  } catch (e) {
    if (typeof value === "number") {
      mbo.setValue(attr, Packages.java.lang.Double(value));
    } else {
      throw e;
    }
  }
}

function saveSet(set, config) {
  if (config && isTrue(config.dmDeploySet)) {
    try { set.setDMDeploySet(true); } catch (ignored) { }
  }
  set.save();
}

function getDetailByMbo(mbo) {
  var result = {};
  var uniqueIdName = String(mbo.getUniqueIDName() || "").toUpperCase();
  var fields = resolveMainFields();
  for (var i = 0; i < fields.length; i++) {
    var attr = fields[i];
    if (SKIP_FIELDS.indexOf(attr) >= 0) continue;
    if (attr === uniqueIdName) continue;
    try {
      result[attr] = mbo.getString(attr);
    } catch (e) {
      result[attr] = "";
    }
  }
  try {
    result[uniqueIdName] = mbo.getInt(uniqueIdName);
  } catch (e) { }
  result["sks:ref"] = mbo.getString("GROUPNAME");
  return result;
}

var _mainFields = null;
function resolveMainFields() {
  if (_mainFields) return _mainFields;
  var fields = [];
  try {
    var dd = Packages.psdi.server.MXServer.getMXServer().getMaximoDD();
    var obj = dd.getMboSetInfo(OBJECT_NAME);
    if (obj != null) {
      var attrIt = obj.getAttributes();
      while (attrIt != null && attrIt.hasNext()) {
        var attr = attrIt.next();
        if (attr.isPersistent()) {
          fields.push(String(attr.getName()).toUpperCase());
        }
      }
    }
  } catch (e) {
    logger.warn("resolveMainFields 失败: " + e);
  }
  if (fields.length === 0) {
    fields = ["GROUPNAME", "DESCRIPTION", "PASSWORDDURATION", "PASSWORDWARNING", "INDEPENDENT",
      "AUTHALLSITES", "AUTHALLGLS", "AUTHALLSTOREROOMS", "AUTHLABORALL", "AUTHLABORCREW",
      "AUTHLABORSELF", "AUTHLABORSUPER", "AUTHPERSONGROUP", "SCTEMPLATEID", "NULLREPFAC",
      "AUTHALLREPFACS", "MAXSCHEDREPORT", "DFLTAPP", "ADHOCCREATELIMIT", "REPORTSTOPLIMIT",
      "SIDENAV", "WORKCENTER", "MASISSUER", "HASLD"];
  }
  _mainFields = fields;
  return fields;
}
