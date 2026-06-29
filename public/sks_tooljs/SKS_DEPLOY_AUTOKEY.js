/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");
/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");

/** @type {psdi.util.logging.MaximoLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true, printModel: false })
main();

function main() {
    try {
        // 验证请求体是否存在
        if (typeof requestBody === "undefined" || !requestBody) {
            throw new MXApplicationException("#", "请求体(requestBody)不能为空");
        }

        // 解析请求体
        /** @type {java.lang.Object} */
        var requestData = JSON.parse(requestBody);

        // 支持单个对象或数组
        /** @type {Array} */
        var autokeysArray;

        if (Array.isArray(requestData)) {
            // 如果直接传入数组
            autokeysArray = requestData;
        } else if (requestData.autokeys && Array.isArray(requestData.autokeys)) {
            // 如果传入 {autokeys: [...]}
            autokeysArray = requestData.autokeys;
        } else {
            // 如果传入单个对象，转换为数组
            autokeysArray = [requestData];
        }

        if (!autokeysArray || autokeysArray.length === 0) {
            throw new MXApplicationException("#", "没有提供自动键定义数据");
        }

        logger.info("开始批量导入 " + autokeysArray.length + " 个自动键定义");

        // 批量处理自动键定义
        /** @type {Array} */
        var resultList = [];

        for (var i = 0; i < autokeysArray.length; i++) {
            /** @type {java.lang.Object} */
            var autokeyData = autokeysArray[i];

            try {
                // 保存或更新自动键定义
                saveOrUpdateAutokey(autokeyData, i + 1);

                // 记录成功
                resultList.push({
                    autokeyname: autokeyData.autokeyname || autokeyData.autokeynum || "未知",
                    status: "SUCCESS",
                    message: "自动键定义保存成功"
                });

            } catch (error) {
                /** @type {java.lang.String} */
                var errorMsg = error.message || String(error) || "未知错误";
                logger.error("处理第 " + (i + 1) + " 个自动键定义失败: " + errorMsg, error);

                /** @type {java.lang.String} */
                var errorKey = error.getErrorGroup() || "";

                // 根据异常类型判断结果状态
                if (errorKey === "_deleteAll_success") {
                    // 批量删除成功
                    resultList.push({
                        autokeyname: autokeyData.autokeyname || autokeyData.autokeynum || "未知",
                        status: "SUCCESS",
                        message: errorMsg
                    });
                } else if (errorKey === "_deleteAll_notfound" || errorKey === "_delete_notfound") {
                    // 删除但未找到记录 - 也视为成功（反正最终结果就是不存在）
                    resultList.push({
                        autokeyname: autokeyData.autokeyname || autokeyData.autokeynum || "未知",
                        status: "SUCCESS",
                        message: "自动键不存在，无需删除"
                    });
                } else if (errorKey === "_already_exists") {
                    // 已存在，忽略 - 视为成功
                    resultList.push({
                        autokeyname: autokeyData.autokeyname || autokeyData.autokeynum || "未知",
                        status: "SUCCESS",
                        message: "自动键已存在，忽略"
                    });
                } else {
                    // 其他错误
                    resultList.push({
                        autokeyname: autokeyData.autokeyname || autokeyData.autokeynum || "未知",
                        status: "FAILED",
                        message: errorMsg
                    });
                }
            }
        }

        // 统计结果
        /** @type {java.lang.Integer} */
        var successCount = 0;
        /** @type {java.lang.Integer} */
        var failedCount = 0;

        for (var j = 0; j < resultList.length; j++) {
            if (resultList[j].status === "SUCCESS") {
                successCount++;
            } else {
                failedCount++;
            }
        }

        logger.info("批量导入完成: 成功 " + successCount + " 个, 失败 " + failedCount + " 个");

        // 返回成功响应
        /** @type {java.lang.Object} */
        var responseData = {
            status: "success",
            message: "批量导入完成",
            summary: {
                total: autokeysArray.length,
                success: successCount,
                failed: failedCount
            },
            result: resultList
        };
        responseBody = JSON.stringify(responseData, null, 4);

    } catch (error) {
        /** @type {java.lang.String} */
        var errorMsg = error.message || String(error) || "未知错误";
        logger.error("批量导入自动键定义失败: " + errorMsg, error);

        /** @type {Object} */
        var errorData = {
            status: "error",
            message: errorMsg
        };
        responseBody = JSON.stringify(errorData, null, 4);
    }
}

/**
 * 保存或更新自动键定义到AUTOKEY表
 * @param {Object} autokeyData - 自动键定义数据对象
 * @param {number} index - 当前处理的索引（用于错误提示）
 */
function saveOrUpdateAutokey(autokeyData, index) {
    // 提取必填字段（支持 autokeyname 或 autokeynum 两种字段名）
    /** @type {java.lang.String} */
    var autokeyname = autokeyData.autokeyname || autokeyData.autokeynum;
    // 验证必填字段
    if (!autokeyname) {
        throw new MXApplicationException("#", "第 " + index + " 个自动键定义的 autokeyname（自动键名称）不能为空");
    }

    // 提取可选字段，并将 undefined 转换为 null
    /** @type {java.lang.String} */
    var siteid = (autokeyData.siteid !== undefined ? autokeyData.siteid : autokeyData.siteId) || null;
    /** @type {java.lang.String} */
    var orgid = (autokeyData.orgid !== undefined ? autokeyData.orgid : autokeyData.orgId) || null;
    /** @type {java.lang.String} */
    var setid = (autokeyData.setid !== undefined ? autokeyData.setid : autokeyData.setId) || null;
    /** @type {java.lang.Integer} */
    var seed = autokeyData.seed;
    /** @type {java.lang.String} */
    var prefix = autokeyData.prefix;
    /** @type {java.lang.String} */
    var langcode = autokeyData.langcode || autokeyData.langCode || null;
    /** @type {java.lang.String} */
    var siteorgtype = autokeyData.siteorgtype || autokeyData.siteOrgType || null;

    /** @type {psdi.mbo.MboSetRemote} */
    var autokeySet = null;
    /** @type {psdi.mbo.MboSetRemote} */
    var parentSet = null;

    try {
        // 如果提供了 SITEORGTYPE，按照源代码的逻辑批量创建
        if (siteorgtype && !autokeyData._delete) {
            createAutokeyBySiteOrgType(autokeyname, siteorgtype, seed, prefix, langcode, index);
            
            // 如果同时提供了 siteid，还需要为指定站点创建站点级自动键
            if (siteid) {
                logger.info("同时为指定站点 " + siteid + " 创建站点级自动键");
                createSingleAutokey(autokeyname, siteid, null, null, seed, prefix, langcode);
            }
            
            return;
        }

        // 直接从 MXServer 获取 AUTOKEY 集合
        autokeySet = MXServer.getMXServer().getMboSet("AUTOKEY", MXServer.getMXServer().getSystemUserInfo());

        // 如果提供了 siteid 但没有 orgid，需要从站点获取组织
        if (siteid && !orgid) {
            parentSet = MXServer.getMXServer().getMboSet("SITE", MXServer.getMXServer().getSystemUserInfo());
            var siteSqlf = new SqlFormat("siteid = :1");
            siteSqlf.setObject(1, "SITE", "SITEID", siteid);
            parentSet.setWhere(siteSqlf.format());
            parentSet.reset();

            if (!parentSet.isEmpty()) {
                var siteMbo = parentSet.getMbo(0);
                orgid = siteMbo.getString("ORGID");
                logger.info("从站点 " + siteid + " 获取到组织: " + orgid);
            }
            __mboSetClose(parentSet);
            parentSet = null;
        }

        // 处理删除操作
        if (autokeyData._delete) {
            // 如果 _deleteAll 也为 true，删除所有同名自动键（不区分级别）
            if (autokeyData._deleteAll) {
                logger.info("删除所有同名自动键: autokeyname=" + autokeyname);
                autokeySet.setWhere("autokeyname = :1");
                var deleteAllSqlf = new SqlFormat("autokeyname = :1");
                deleteAllSqlf.setObject(1, "AUTOKEY", "AUTOKEYNAME", autokeyname);
                autokeySet.setWhere(deleteAllSqlf.format());
                autokeySet.reset();
                
                /** @type {java.lang.Integer} */
                var deleteAllCount = 0;
                var deleteAllMbo = autokeySet.moveFirst();
                while (deleteAllMbo) {
                    logger.info("删除自动键: AUTOKEYNAME=" + autokeyname + 
                                ", SITEID=" + (deleteAllMbo.getString("SITEID") || "null") +
                                ", ORGID=" + (deleteAllMbo.getString("ORGID") || "null") +
                                ", SETID=" + (deleteAllMbo.getString("SETID") || "null"));
                    deleteAllMbo.delete();
                    deleteAllCount++;
                    deleteAllMbo = autokeySet.moveNext();
                }
                
                if (deleteAllCount > 0) {
                    autokeySet.save();
                    logger.info("已删除 " + deleteAllCount + " 个同名自动键: " + autokeyname);
                }
                __mboSetClose(autokeySet);
                return;
            }
            
            // 构建删除查询条件 - 按优先级：siteid > orgid > setid
            /** @type {java.lang.String} */
            var whereClause = "autokeyname = :1";
            /** @type {psdi.mbo.SqlFormat} */
            var sqlf = new SqlFormat(whereClause);
            sqlf.setObject(1, "AUTOKEY", "AUTOKEYNAME", autokeyname);
            
            if (siteid) {
                // siteid 优先
                whereClause = "autokeyname = :1 and siteid = :2";
                sqlf = new SqlFormat(whereClause);
                sqlf.setObject(1, "AUTOKEY", "AUTOKEYNAME", autokeyname);
                sqlf.setObject(2, "AUTOKEY", "SITEID", siteid);
            } else if (orgid) {
                // orgid 其次
                whereClause = "autokeyname = :1 and orgid = :2";
                sqlf = new SqlFormat(whereClause);
                sqlf.setObject(1, "AUTOKEY", "AUTOKEYNAME", autokeyname);
                sqlf.setObject(2, "AUTOKEY", "ORGID", orgid);
            } else if (setid) {
                // setid 最后
                whereClause = "autokeyname = :1 and setid = :2";
                sqlf = new SqlFormat(whereClause);
                sqlf.setObject(1, "AUTOKEY", "AUTOKEYNAME", autokeyname);
                sqlf.setObject(2, "AUTOKEY", "SETID", setid);
            }

            logger.info("删除自动键查询: " + whereClause + ", autokeyname=" + autokeyname);
            
            autokeySet.setWhere(sqlf.format());
            autokeySet.reset();

            /** @type {java.lang.Integer} */
            var deleteCount = 0;
            var autokeyMbo = autokeySet.moveFirst();
            while (autokeyMbo) {
                logger.info("删除自动键: AUTOKEYNAME=" + autokeyname +
                            ", SITEID=" + (siteid || "null") +
                            ", ORGID=" + (orgid || "null") +
                            ", SETID=" + (setid || "null"));
                autokeyMbo.delete();
                deleteCount++;
                autokeyMbo = autokeySet.moveNext();
            }

            if (deleteCount > 0) {
                autokeySet.save();
                logger.info("已删除 " + deleteCount + " 个自动键: " + autokeyname);
            } else {
                logger.info("没有找到要删除的自动键: " + autokeyname);
            }
            __mboSetClose(autokeySet);
            return;
        }

        // 处理 _deleteAll 功能：删除所有同名自动键（如果没有进入上面的 _delete 分支）
        if (autokeyData._deleteAll) {
            autokeySet.setWhere("autokeyname = :1");
            var sqlfDel = new SqlFormat("autokeyname = :1");
            sqlfDel.setObject(1, "AUTOKEY", "AUTOKEYNAME", autokeyname);
            autokeySet.setWhere(sqlfDel.format());
            autokeySet.reset();

            /** @type {java.lang.Integer} */
            var deleteCount = 0;
            autokeyMbo = autokeySet.moveFirst();
            while (autokeyMbo) {
                var delSiteid = autokeyMbo.getString("SITEID");
                var delOrgid = autokeyMbo.getString("ORGID");
                var delSetid = autokeyMbo.getString("SETID");
                logger.info("删除自动键: AUTOKEYNAME=" + autokeyname +
                            ", SITEID=" + (delSiteid || "null") +
                            ", ORGID=" + (delOrgid || "null") +
                            ", SETID=" + (delSetid || "null"));
                autokeyMbo.delete();
                deleteCount++;
                autokeyMbo = autokeySet.moveNext();
            }

            autokeySet.save();
            __mboSetClose(autokeySet);

            if (deleteCount > 0) {
                logger.info("已删除 " + deleteCount + " 个同名自动键: " + autokeyname);
                throw new MXApplicationException("_deleteAll_success", "已删除 " + deleteCount + " 个同名自动键");
            } else {
                logger.info("没有找到同名自动键: " + autokeyname);
                throw new MXApplicationException("_deleteAll_notfound", "没有找到同名自动键");
            }
        }

        // 查找或创建自动键（findOrCreateAutokey 会保存记录）
        logger.info("准备创建/更新自动键: AUTOKEYNAME=" + autokeyname + ", siteid=" + siteid + ", orgid=" + orgid + ", setid=" + setid);
        var autokeyMbo = findOrCreateAutokey(autokeySet, autokeyname, siteid, orgid, setid);
        if (autokeyMbo) {
            logger.info("自动键 MBO 获取成功: " + autokeyMbo.getString("AUTOKEYNAME"));
            
            // 如果需要更新其他字段（seed, prefix, langcode），需要再次保存
            var needUpdate = false;
            if (seed !== undefined && seed !== null) { needUpdate = true; }
            if (prefix !== undefined && prefix !== null && prefix !== 'undefined') { needUpdate = true; }
            if (langcode !== undefined && langcode !== null && langcode !== 'undefined') { needUpdate = true; }
            
            if (needUpdate) {
                logger.info("需要更新额外字段: seed=" + seed + ", prefix=" + prefix + ", langcode=" + langcode);
                updateAutokeyFields(autokeyMbo, seed, prefix, langcode);
                // 重新获取 saveSet 并保存
                var updateSaveSet = autokeyMbo.getThisMboSet();
                updateSaveSet.save();
                logger.info("额外字段更新并保存成功");
            }
        } else {
            logger.error("无法获取或创建自动键 MBO");
        }

        logger.info("自动键定义保存成功: AUTOKEYNAME=" + autokeyname +
                    ", SITEID=" + (siteid || "null") +
                    ", ORGID=" + (orgid || "null") +
                    ", SETID=" + (setid || "null"));

    } catch (error) {
        /** @type {java.lang.String} */
        var errorMsg = error.message || String(error) || "未知错误";
        logger.error("保存AUTOKEY表失败: " + errorMsg, error);
        throw new MXApplicationException("#", "保存自动键定义失败: " + errorMsg);
    } finally {
        __mboSetClose(autokeySet);
        __mboSetClose(parentSet);
    }
}

/**
 * Cleans up the MboSet connections and closes the set.
 * @param {psdi.mbo.MboSet} set the psdi.mbo.MboSet object to close.
 */
function __mboSetClose(set) {
    if (set && set instanceof Java.type("psdi.mbo.MboSet")) {
        try {
            set.cleanup();
            set.close();
        } catch (ignored) {
            /* ignored */
        }
    }
}

/**
 * 根据 SITEORGTYPE 批量创建自动键（参考 MaxAttributeCfg.createAutokeyMbos）
 * @param {java.lang.String} autokeyname - 自动键名称
 * @param {java.lang.String} siteorgtypeExternal - 外部 SITEORGTYPE 值
 * @param {java.lang.Integer} seed - 种子值
 * @param {java.lang.String} prefix - 前缀
 * @param {java.lang.String} langcode - 语言代码
 * @param {number} index - 当前处理的索引（用于错误提示）
 */
function createAutokeyBySiteOrgType(autokeyname, siteorgtypeExternal, seed, prefix, langcode, index) {
    /** @type {psdi.mbo.MboSetRemote} */
    var orgSet = null;
    /** @type {psdi.mbo.MboSetRemote} */
    var setSet = null;

    try {
        // 使用 Translator 将外部值转换为内部值
        /** @type {psdi.mbo.Translate} */
        var translator = MXServer.getMXServer().getMaximoDD().getTranslator();
        /** @type {java.lang.String} */
        var siteorgtype = translator.toInternalString("SITEORGTYPE", siteorgtypeExternal);

        logger.info("批量创建自动键: AUTOKEYNAME=" + autokeyname + ", SITEORGTYPE=" + siteorgtypeExternal + " (内部值=" + siteorgtype + ")");

        // 参考源代码的判断逻辑
        if (siteorgtype.indexOf("SYSTEM") >= 0) {
            // 系统级：创建一个系统级自动键
            logger.info("创建系统级自动键");
            createSingleAutokey(autokeyname, null, null, null, seed, prefix, langcode);

        } else if (siteorgtype !== "ORG" && siteorgtype !== "ORGSITE" &&
                   siteorgtype !== "ORGAPPFILTER" && siteorgtype !== "SITE" &&
                   siteorgtype !== "SITEAPPFILTER") {

            // 不是组织/站点级，检查是否是集合级
            if (siteorgtype.indexOf("ITEMSET") >= 0) {
                // 项目集级：为所有项目集创建自动键
                logger.info("为所有项目集创建自动键");

                /** @type {java.lang.String[]} */
                var setType = ["ITEM"];
                /** @type {java.lang.String} */
                var typeList = translator.toExternalList("SETTYPE", setType);

                setSet = MXServer.getMXServer().getMboSet("SETS", MXServer.getMXServer().getSystemUserInfo());
                setSet.setWhere("settype in (" + typeList + ")");
                setSet.reset();

                /** @type {java.lang.Integer} */
                var count = 0;
                /** @type {psdi.mbo.MboRemote} */
                var setMbo = setSet.moveFirst();
                while (setMbo) {
                    createSingleAutokey(autokeyname, null, null, setMbo.getString("SETID"), seed, prefix, langcode);
                    count++;
                    setMbo = setSet.moveNext();
                }
                logger.info("已为 " + count + " 个项目集创建自动键");

            } else if (siteorgtype.indexOf("COMPANYSET") >= 0) {
                // 公司集级：为所有公司集创建自动键
                logger.info("为所有公司集创建自动键");

                /** @type {java.lang.String[]} */
                var setType = ["COMPANY"];
                /** @type {java.lang.String} */
                var typeList = translator.toExternalList("SETTYPE", setType);

                setSet = MXServer.getMXServer().getMboSet("SETS", MXServer.getMXServer().getSystemUserInfo());
                setSet.setWhere("settype in (" + typeList + ")");
                setSet.reset();

                /** @type {java.lang.Integer} */
                var count = 0;
                /** @type {psdi.mbo.MboRemote} */
                var setMbo = setSet.moveFirst();
                while (setMbo) {
                    createSingleAutokey(autokeyname, null, null, setMbo.getString("SETID"), seed, prefix, langcode);
                    count++;
                    setMbo = setSet.moveNext();
                }
                logger.info("已为 " + count + " 个公司集创建自动键");
            }

        } else {
            // 组织级/站点级：为所有组织创建自动键
            logger.info("为所有组织创建自动键");

            orgSet = MXServer.getMXServer().getMboSet("ORGANIZATION", MXServer.getMXServer().getSystemUserInfo());
            orgSet.setWhere("1=1");
            orgSet.reset();

            /** @type {java.lang.Integer} */
            var count = 0;
            /** @type {psdi.mbo.MboRemote} */
            var orgMbo = orgSet.moveFirst();
            while (orgMbo) {
                createSingleAutokey(autokeyname, null, orgMbo.getString("ORGID"), null, seed, prefix, langcode);
                count++;
                orgMbo = orgSet.moveNext();
            }
            logger.info("已为 " + count + " 个组织创建自动键");
        }

    } catch (error) {
        /** @type {java.lang.String} */
        var errorMsg = error.message || String(error) || "未知错误";
        logger.error("根据 SITEORGTYPE 批量创建自动键失败: " + errorMsg, error);
        throw new MXApplicationException("#", "批量创建自动键失败: " + errorMsg);
    } finally {
        __mboSetClose(orgSet);
        __mboSetClose(setSet);
    }
}

/**
 * 创建单个自动键（内部辅助函数）
 * @param {java.lang.String} autokeyname - 自动键名称
 * @param {java.lang.String} siteid - 站点ID
 * @param {java.lang.String} orgid - 组织ID
 * @param {java.lang.String} setid - 集合ID
 * @param {java.lang.Integer} seed - 种子值
 * @param {java.lang.String} prefix - 前缀
 * @param {java.lang.String} langcode - 语言代码
 */
function createSingleAutokey(autokeyname, siteid, orgid, setid, seed, prefix, langcode) {
    // 确保参数中的 undefined 被转换为 null
    siteid = (siteid !== undefined) ? siteid : null;
    orgid = (orgid !== undefined) ? orgid : null;
    setid = (setid !== undefined) ? setid : null;
    
    /** @type {psdi.mbo.MboSetRemote} */
    var parentSet = null;
    /** @type {psdi.mbo.MboSetRemote} */
    var autokeySet = null;

    try {
        // 直接从 MXServer 获取 AUTOKEY 集合，避免父 MBO 的继承限制
        autokeySet = MXServer.getMXServer().getMboSet("AUTOKEY", MXServer.getMXServer().getSystemUserInfo());
        
        if (!autokeySet) {
            throw new Error("无法获取 AUTOKEY MboSet");
        }

        // 如果提供了 siteid 但没有 orgid，需要从站点获取组织
        if (siteid && !orgid) {
            parentSet = MXServer.getMXServer().getMboSet("SITE", MXServer.getMXServer().getSystemUserInfo());
            var siteSqlf = new SqlFormat("siteid = :1");
            siteSqlf.setObject(1, "SITE", "SITEID", siteid);
            parentSet.setWhere(siteSqlf.format());
            parentSet.reset();

            if (!parentSet.isEmpty()) {
                var siteMbo = parentSet.getMbo(0);
                orgid = siteMbo.getString("ORGID");
                logger.info("从站点 " + siteid + " 获取到组织: " + orgid);
            }
            __mboSetClose(parentSet);
            parentSet = null;
        }

        // 查找或创建自动键
        var autokeyMbo = findOrCreateAutokey(autokeySet, autokeyname, siteid, orgid, setid);
        if (!autokeyMbo) {
            throw new Error("无法创建或获取自动键");
        }
        
        updateAutokeyFields(autokeyMbo, seed, prefix, langcode);
        autokeySet.save();

        logger.info("创建自动键成功: AUTOKEYNAME=" + autokeyname +
                    ", SITEID=" + (siteid || "null") +
                    ", ORGID=" + (orgid || "null") +
                    ", SETID=" + (setid || "null"));

    } catch (error) {
        /** @type {java.lang.String} */
        var errorMsg = error.message || String(error) || "未知错误";
        logger.error("创建单个自动键失败: " + errorMsg, error);
        throw error;
    } finally {
        __mboSetClose(autokeySet);
        __mboSetClose(parentSet);
    }
}

/**
 * 查找或创建单个自动键（避免重复创建）
 * 注意：autokeySet 应该直接从 MXServer 获取，避免父 MBO 的继承限制
 * @param {psdi.mbo.MboSetRemote} autokeySet - AUTOKEY MBO 集合
 * @param {java.lang.String} autokeyname - 自动键名称
 * @param {java.lang.String} siteid - 站点ID
 * @param {java.lang.String} orgid - 组织ID
 * @param {java.lang.String} setid - 集合ID
 * @returns {psdi.mbo.MboRemote} 自动键 MBO 或 null
 */
/**
 * 查找或创建自动键
 * @param {psdi.mbo.MboSetRemote} autokeySet - 自动键 MboSet
 * @param {java.lang.String} autokeyname - 自动键名称
 * @param {java.lang.String} siteid - 站点ID
 * @param {java.lang.String} orgid - 组织ID
 * @param {java.lang.String} setid - 集合ID
 * @returns {psdi.mbo.MboRemote} 自动键 MBO
 */
function findOrCreateAutokey(autokeySet, autokeyname, siteid, orgid, setid) {
    /** @type {psdi.mbo.MboRemote} */
    var autokeyMbo = null;
    /** @type {psdi.mbo.MboRemote} */
    var ownerMbo = null;
    /** @type {psdi.mbo.MboSetRemote} */
    var ownerSet = null;
    /** @type {psdi.mbo.MboSetRemote} */
    var parentAutokeySet = null;

    try {
        // 构建查询条件
        /** @type {java.lang.String} */
        var whereClause = "autokeyname = :1";
        
        /** @type {psdi.mbo.SqlFormat} */
        var sqlf = new SqlFormat(whereClause);
        sqlf.setObject(1, "AUTOKEY", "AUTOKEYNAME", autokeyname);

        if (siteid) {
            whereClause = "autokeyname = :1 and siteid = :2";
            sqlf = new SqlFormat(whereClause);
            sqlf.setObject(1, "AUTOKEY", "AUTOKEYNAME", autokeyname);
            sqlf.setObject(2, "AUTOKEY", "SITEID", siteid);
        } else if (orgid) {
            whereClause = "autokeyname = :1 and orgid = :2";
            sqlf = new SqlFormat(whereClause);
            sqlf.setObject(1, "AUTOKEY", "AUTOKEYNAME", autokeyname);
            sqlf.setObject(2, "AUTOKEY", "ORGID", orgid);
        } else if (setid) {
            whereClause = "autokeyname = :1 and setid = :2";
            sqlf = new SqlFormat(whereClause);
            sqlf.setObject(1, "AUTOKEY", "AUTOKEYNAME", autokeyname);
            sqlf.setObject(2, "AUTOKEY", "SETID", setid);
        }

        logger.info("查询自动键: whereClause=" + whereClause + ", autokeyname=" + autokeyname);

        autokeySet.setWhere(sqlf.format());
        autokeySet.reset();

        logger.info("自动键集合是否为空: " + autokeySet.isEmpty());

        if (!autokeySet.isEmpty()) {
            // 已存在，返回现有记录
            logger.info("自动键已存在，更新: AUTOKEYNAME=" + autokeyname);
            autokeyMbo = autokeySet.getMbo(0);
            // 保存现有记录
            autokeySet.save();
        } else {
            // 不存在，创建新记录
            logger.info("创建新自动键: AUTOKEYNAME=" + autokeyname);
            
            // 通过父 MBO 获取 AUTOKEY 关系来创建新记录
            if (siteid) {
                // 站点级 - 通过 SITE MBO 创建
                ownerSet = MXServer.getMXServer().getMboSet("SITE", MXServer.getMXServer().getSystemUserInfo());
                var siteSqlf = new SqlFormat("siteid = :1");
                siteSqlf.setObject(1, "SITE", "SITEID", siteid);
                ownerSet.setWhere(siteSqlf.format());
                ownerSet.reset();
                if (!ownerSet.isEmpty()) {
                    ownerMbo = ownerSet.getMbo(0);
                }
            } else if (orgid) {
                // 组织级 - 通过 ORGANIZATION MBO 创建
                ownerSet = MXServer.getMXServer().getMboSet("ORGANIZATION", MXServer.getMXServer().getSystemUserInfo());
                var orgSqlf = new SqlFormat("orgid = :1");
                orgSqlf.setObject(1, "ORGANIZATION", "ORGID", orgid);
                ownerSet.setWhere(orgSqlf.format());
                ownerSet.reset();
                if (!ownerSet.isEmpty()) {
                    ownerMbo = ownerSet.getMbo(0);
                }
            } else if (setid) {
                // 集合级 - 通过 SETS MBO 创建
                ownerSet = MXServer.getMXServer().getMboSet("SETS", MXServer.getMXServer().getSystemUserInfo());
                var setSqlf = new SqlFormat("setid = :1");
                setSqlf.setObject(1, "SETS", "SETID", setid);
                ownerSet.setWhere(setSqlf.format());
                ownerSet.reset();
                if (!ownerSet.isEmpty()) {
                    ownerMbo = ownerSet.getMbo(0);
                }
            } else {
                // 系统级 - 通过任意 ORGANIZATION MBO 创建
                ownerSet = MXServer.getMXServer().getMboSet("ORGANIZATION", MXServer.getMXServer().getSystemUserInfo());
                ownerSet.setWhere("1=1");
                ownerSet.reset();
                if (!ownerSet.isEmpty()) {
                    ownerMbo = ownerSet.getMbo(0);
                }
            }
            
            if (!ownerMbo) {
                throw new Error("无法获取父 MBO 来创建自动键");
            }
            
            // 通过父 MBO 的 AUTOKEY 关系创建新记录
            parentAutokeySet = ownerMbo.getMboSet("AUTOKEY");
            
            // 尝试创建记录
            try {
                autokeyMbo = parentAutokeySet.add();
            } catch (e) {
                logger.warn("通过父 MBO 创建失败，尝试直接创建: " + (e.message || String(e)));
                // 如果失败，清除 where 条件后直接添加
                autokeySet.setWhere("");
                autokeySet.reset();
                autokeyMbo = autokeySet.add();
            }
            
            if (!autokeyMbo) {
                throw new Error("创建自动键失败: add() 返回 null");
            }
            
            // 设置 AUTOKEYNAME（必需）
            autokeyMbo.setValue("AUTOKEYNAME", autokeyname, 11);
            logger.info("已设置 AUTOKEYNAME = " + autokeyname);
            
            // 根据级别设置字段
            if (siteid) {
                // 站点级 - 父 MBO 已设置 siteid 和 orgid
                autokeyMbo.setValue("SITEID", siteid, 11);
                logger.info("已设置 SITEID = " + siteid);
                if (orgid) {
                    autokeyMbo.setValue("ORGID", orgid, 11);
                    logger.info("已设置 ORGID = " + orgid);
                }
            } else if (orgid) {
                // 组织级 - 父 MBO 已设置 orgid，需要清除 siteid
                autokeyMbo.setValue("ORGID", orgid, 11);
                logger.info("已设置 ORGID = " + orgid);
                autokeyMbo.setValueNull("SITEID");
                logger.info("已清除 SITEID");
            } else if (setid) {
                // 集合级 - 父 MBO 已设置 setid，需要清除 orgid 和 siteid
                autokeyMbo.setValue("SETID", setid, 11);
                logger.info("已设置 SETID = " + setid);
                autokeyMbo.setValueNull("ORGID");
                autokeyMbo.setValueNull("SITEID");
                logger.info("已清除 ORGID 和 SITEID");
            } else {
                // 系统级 - 清除所有继承的字段
                autokeyMbo.setValueNull("ORGID");
                autokeyMbo.setValueNull("SITEID");
                autokeyMbo.setValueNull("SETID");
                logger.info("已清除所有级别字段 (系统级)");
            }
            
            // 保存记录 - 使用 parentAutokeySet
            logger.info("准备保存自动键记录...");
            parentAutokeySet.save();
            logger.info("自动键记录保存成功");
            
            // 验证保存
            logger.info("验证保存: autokeyname=" + autokeyMbo.getString("AUTOKEYNAME") + 
                        ", siteid=" + (autokeyMbo.getString("SITEID") || "null") +
                        ", orgid=" + (autokeyMbo.getString("ORGID") || "null") +
                        ", setid=" + (autokeyMbo.getString("SETID") || "null"));
        }
        
        return autokeyMbo;
        
    } finally {
        // 清理资源 - 注意：关闭 ownerSet 会自动关闭 parentAutokeySet
        if (ownerSet) {
            __mboSetClose(ownerSet);
        }
    }
}

/**
 * 清理 MboSet
 */
function __mboSetClose(set) {
    if (set && set instanceof Java.type("psdi.mbo.MboSet")) {
        try {
            set.cleanup();
            set.close();
        } catch (ignored) {
            /* ignored */
        }
    }
}

/**
 * 更新自动键字段
 * @param {psdi.mbo.MboRemote} autokeyMbo - 自动键 MBO
 * @param {java.lang.Integer} seed - 种子值
 * @param {java.lang.String} prefix - 前缀
 * @param {java.lang.String} langcode - 语言代码
 */
function updateAutokeyFields(autokeyMbo, seed, prefix, langcode) {
    if (seed !== null && seed !== undefined && seed !== 'undefined') {
        autokeyMbo.setValue("SEED", seed);
    }
    if (prefix && prefix !== 'undefined') {
        autokeyMbo.setValue("PREFIX", prefix);
    }
    if (langcode && langcode !== 'undefined') {
        autokeyMbo.setValue("LANGCODE", langcode);
    } else {
        // 如果没有提供 langcode，检查是否为空，如果为空则设置默认值
        try {
            if (autokeyMbo.isNull("LANGCODE")) {
                autokeyMbo.setValue("LANGCODE", "ZH");
            }
        } catch (e) {
            // 如果 isNull 出错，忽略
            logger.warn("检查 LANGCODE 是否为空时出错: " + (e.message || String(e)));
        }
    }
}

/**
## AUTOKEY不同级别查询的sql 
### 系统级别
```
select * from AUTOKEY where orgid is null and siteid is null and setid is null
```
### 集合级别
siteid in 里面是所有SETS表中的公司集合和项目集
```
select * from AUTOKEY where orgid is null and siteid is null and (setid in ('ITEMSET' ,'COMPSET' ))
```
### ORG级别
orgid是组织ID
```
select * from AUTOKEY where orgid =  'ISUZU'  and siteid is null
```
### site级别
orgid是组织ID
siteid是站点ID

插入时候如果orgid为空,则获取siteid所属的orgid
```
select * from AUTOKEY where orgid =  'SKSORG'  and siteid =  'SKS'
```

 */