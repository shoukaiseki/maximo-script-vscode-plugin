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
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

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
        var domainsArray;
        
        if (Array.isArray(requestData)) {
            // 如果直接传入数组
            domainsArray = requestData;
        } else if (requestData.domains && Array.isArray(requestData.domains)) {
            // 如果传入 {domains: [...]}
            domainsArray = requestData.domains;
        } else {
            // 如果传入单个对象，转换为数组
            domainsArray = [requestData];
        }
        
        if (!domainsArray || domainsArray.length === 0) {
            throw new MXApplicationException("#", "没有提供域定义数据");
        }

        logger.info("开始批量导入 " + domainsArray.length + " 个域定义");

        // 批量处理域定义
        /** @type {Array} */
        var resultList = [];
        
        for (var i = 0; i < domainsArray.length; i++) {
            /** @type {java.lang.Object} */
            var domainData = domainsArray[i];
            
            try {
                // 保存或更新域定义
                saveOrUpdateDomain(domainData, i + 1);

                // 记录成功
                resultList.push({
                    domainid: domainData.domainid || "未知",
                    status: "SUCCESS",
                    message: "域定义保存成功"
                });

            } catch (error) {
                logger.error("处理第 " + (i + 1) + " 个域定义失败: " + error.message);
                
                // 记录失败
                resultList.push({
                    domainid: domainData.domainid || "未知",
                    status: "FAILED",
                    message: error.message
                });
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
                total: domainsArray.length,
                success: successCount,
                failed: failedCount
            },
            result: resultList
        };
        responseBody = JSON.stringify(responseData, null, 4);

    } catch (error) {
        logger.error("批量导入域定义失败: " + error.message);
        
        /** @type {Object} */
        var errorData = {
            status: "error",
            message: error.message
        };
        responseBody = JSON.stringify(errorData, null, 4);
    }
}

/**
 * 保存或更新域定义到MAXDOMAIN表
 * @param {Object} domainData - 域定义数据对象
 * @param {number} index - 当前处理的索引（用于错误提示）
 */
function saveOrUpdateDomain(domainData, index) {
    // 提取必填字段
    /** @type {java.lang.String} */
    var domainId = domainData.domainid ;
    /** @type {java.lang.String} */
    var domainType = domainData.domaintype ;
    // 提取可选字段
    /** @type {java.lang.String} */
    var description = domainData.description;
    // 验证必填字段
    if (!domainId) {
        throw new MXApplicationException("#", "第 " + index + " 个域定义的 domainid（域名）不能为空");
    }
    if (!domainType) {
        throw new MXApplicationException("#", "第 " + index + " 个域定义的 domaintype（域类型）不能为空");
    }
    if(!description){
        throw new MXApplicationException("#", "第 " + index + " 个域定义的 description（描述）不能为空");
    }

    /** @type {java.lang.Integer} */
    var length = domainData.length ;
    /** @type {java.lang.Integer} */
    var scale = domainData.scale ;
    /** @type {java.lang.Integer} */
    var internal = domainData.internal;
    /** @type {java.lang.Boolean} */
    var neverCache = domainData.nevercache ;

    /** @type {psdi.mbo.MboSetRemote} */
    var domainSet = null;
    
    try {
        // 获取MAXDOMAIN表的MBO集合
        domainSet = MXServer.getMXServer().getMboSet("MAXDOMAIN", MXServer.getMXServer().getSystemUserInfo());
        
        // 查询是否已存在
        /** @type {psdi.mbo.SqlFormat} */
        var sqlf = new SqlFormat("domainid = :1");
        sqlf.setObject(1, "MAXDOMAIN", "DOMAINID", domainId);
        domainSet.setWhere(sqlf.format());
        domainSet.reset();
        logger.info("----------001")
        
        /** @type {psdi.mbo.MboRemote} */
        var domainMbo;
        
        if (domainSet.isEmpty()) {
            if (domainData._delete) {
                __mboSetClose(domainSet)
                return;
            }
            // 创建新记录
            logger.info("创建新域定义: " + domainId);
            domainMbo = domainSet.add();
            domainMbo.setValue("DOMAINID", domainId);
        } else {
            // 更新现有记录
            logger.info("更新现有域定义: " + domainId);
            domainMbo = domainSet.getMbo(0);
            if(domainData._delete){
                logger.info("删除域定义: " + domainId);
                domainMbo.delete();
                domainSet.save();
                __mboSetClose(domainSet)
                return;
            }
        }

        
        if(!domainMbo.getMboValueData("DOMAINTYPE").isReadOnly()&&domainType!== 'undefined'){
            // 设置字段值
            domainMbo.setValue("DOMAINTYPE", domainType,2);
        }
        logger.info("----------002")
        
        if (description!== 'undefined') {
            domainMbo.setValue("DESCRIPTION", description);
        }
        
        logger.info("----------003")
        /** @type {java.lang.String} */
        var maxType = domainData.maxtype;
        if (maxType !== 'undefined') {
            domainMbo.setValue("MAXTYPE", maxType, 11);
        }
        
        if (length!== 'undefined') {
            domainMbo.setValue("LENGTH", length);
        }
        logger.info("----------004.scale="+scale)
        
        if (scale !== 'undefined'&&scale!=null) {
            domainMbo.setValue("SCALE", scale);
        }
        
        logger.info("----------005")
        if (internal !== 'undefined' && internal) {
            domainMbo.setValue("INTERNAL", internal, 2);
        }
        logger.info("----------006")
        if (neverCache !== 'undefined') {
            domainMbo.setValue("NEVERCACHE", neverCache);
        }

        if(domainData.alndomain !== 'undefined'&&domainData.alndomain){
            /** @type {psdi.mbo.MboSetRemote} */
            var alndomainSet = domainMbo.getMboSet("ALNDOMAINVALUE");
            saveOrUpdateAlnDomain(alndomainSet,domainData.alndomain)
        }
        
        // 保存记录
        domainSet.save();
        
        logger.info("域定义保存成功: DOMAINID=" + domainId + ", DOMAINTYPE=" + domainType);
        
    } catch (error) {
        logger.error("保存MAXDOMAIN表失败: " + error.message);
        throw new MXApplicationException("#", "保存域定义失败: " + error.message);
    } finally {
        __mboSetClose(domainSet)
    }
}

/**
 * 保存或更新 ALNDOMAIN（同义词域）子记录
 * @param {psdi.mbo.MboSetRemote} alndomainSet - ALNDOMAIN MBO 集合
 * @param {Array} alndomainDatas - ALNDOMAIN 数据数组
 */
function saveOrUpdateAlnDomain(alndomainSet, alndomainDatas) {
    if (!alndomainDatas || !Array.isArray(alndomainDatas) || alndomainDatas.length === 0) {
        logger.info("没有 ALNDOMAIN 数据需要处理");
        return;
    }

    logger.info("开始处理 " + alndomainDatas.length + " 条 ALNDOMAIN 记录");


    // alndomainDatas.forEach(function (alnDataIn) {
    //     /** @type {Object} */
    //     var alnData = alnDataIn;
    //     // 提取必填字段
    //     /** @type {java.lang.String} */
    //     var value = alnData.value;
    //     /** @type {java.lang.String} */
    //     var description = alnData.description;

    //     // 验证必填字段
    //     if (!value) {
    //         logger.warn("第 " + (i + 1) + " 条 ALNDOMAIN 记录的 value 为空，跳过");
    //         continue;
    //     }
    //     // 先删除现有的所有 ALNDOMAIN 记录
    //     /** @type {psdi.mbo.MboRemote} */
    //     var alnMbo = alndomainSet.moveFirst();
    //     while (alnMbo) {
    //         alnMbo.delete();
    //         if (alnMbo.getString("VALUE") == alnData.value) {
    //             break;
    //         }
    //         alnMbo = alndomainSet.moveNext();
    //     }
    //     if(alnData._delete){
    //         if (alnMbo != null) {
    //             alnMbo.delete()
    //         }

    //     } else {
    //         if (!alnMbo) {
    //             alnMbo=alndomainSet.add()
    //             alnMbo.setValue("VALUE", alnData.value)
    //         }
    //         if (description !== 'undefined' && description) {
    //             alnMbo.setValue("DESCRIPTION", description);
    //         }

    //         // 设置可选字段
    //         if (alnData.maxvalue !== 'undefined' && alnData.maxvalue) {
    //             alnMbo.setValue("MAXVALUE", alnData.maxvalue);
    //         }

    //         if (alnData.defaultvalue !== 'undefined' && alnData.defaultvalue) {
    //             alnMbo.setValue("DEFAULTVALUE", alnData.defaultvalue);
    //         }

    //         if (alnData.orgid !== 'undefined' && alnData.orgid) {
    //             alnMbo.setValue("ORGID", alnData.orgid);
    //         }

    //         if (alnData.siteid !== 'undefined' && alnData.siteid) {
    //             alnMbo.setValue("SITEID", alnData.siteid);
    //         }
    //     }
    // })

    // // 添加新的 ALNDOMAIN 记录
    for (var i = 0; i < alndomainDatas.length; i++) {
        /** @type {Object} */
        var alnData = alndomainDatas[i];


        try {
        // 提取必填字段
        /** @type {java.lang.String} */
        var value = alnData.value;
        /** @type {java.lang.String} */
        var description = alnData.description;

        // 验证必填字段
        if (!value) {
            logger.warn("第 " + (i + 1) + " 条 ALNDOMAIN 记录的 value 为空，跳过");
            continue;
        }
        // 先删除现有的所有 ALNDOMAIN 记录
        /** @type {psdi.mbo.MboRemote} */
        var alnMbo = alndomainSet.moveFirst();
        while (alnMbo) {
            if (alnMbo.getString("VALUE") == alnData.value) {
                break;
            }
            alnMbo = alndomainSet.moveNext();
        }
        if(alnData._delete){
            if (alnMbo != null) {
                alnMbo.delete()
                logger.info("已删除 ALNDOMAIN 记录: VALUE=" + value);
            }

        } else {
            if (!alnMbo) {
                alnMbo=alndomainSet.add()
                alnMbo.setValue("VALUE", alnData.value)
            }
            if (description !== 'undefined' && description) {
                alnMbo.setValue("DESCRIPTION", description);
            }

            // 设置可选字段
            if (alnData.maxvalue !== 'undefined' && alnData.maxvalue) {
                alnMbo.setValue("MAXVALUE", alnData.maxvalue);
            }

            if (alnData.defaultvalue !== 'undefined' && alnData.defaultvalue) {
                alnMbo.setValue("DEFAULTVALUE", alnData.defaultvalue);
            }

            if (alnData.orgid !== 'undefined' && alnData.orgid) {
                alnMbo.setValue("ORGID", alnData.orgid);
            }

            if (alnData.siteid !== 'undefined' && alnData.siteid) {
                alnMbo.setValue("SITEID", alnData.siteid);
            }
            logger.info("已添加 ALNDOMAIN 记录: VALUE=" + value);
        }


        } catch (error) {
            logger.error("处理第 " + (i + 1) + " 条 ALNDOMAIN 记录失败: " + error.message);
            // 继续处理下一条记录
        }
    }

    logger.info("ALNDOMAIN 记录处理完成");
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