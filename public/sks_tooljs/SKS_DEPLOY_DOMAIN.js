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
var sksLogAnsiUtils = null;
try {
    sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
} catch (e) { }
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils ? sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true, printModel: false }) : loggerMX;

//_lang=zh ,_lang=en,
// _langcode=zh , _langcode=en
if(typeof request.getQueryParam("_langcode")!=='undefined'&&request.getQueryParam("_langcode")){
    var _langcode = request.getQueryParam("_langcode");
    // uInfo.setLocale(lang);
    userInfo.setLangCode(_langcode)
    logger.info("------------------_langcode=" + userInfo.getLocale().getLanguage() + ",country=" + userInfo.getLocale().getCountry());
}
var _ignoreResultSuccess=false;
if(typeof request.getQueryParam("_ignoreResultSuccess")!=='undefined'&&request.getQueryParam("_ignoreResultSuccess")){
    _ignoreResultSuccess = request.getQueryParam("_ignoreResultSuccess")==="true";
}
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
                logger.error("处理第 " + (i + 1) + " 个域定义失败: ", error);
                
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
        
        var resultListTmp=[]
        for (var j = 0; j < resultList.length; j++) {
            if (resultList[j].status === "SUCCESS") {
                successCount++;
                if(!_ignoreResultSuccess){
                    resultListTmp.push(resultList[j]);
                }
            } else {
                failedCount++;
                    resultListTmp.push(resultList[j]);
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
            result: resultListTmp
        };
        responseBody = JSON.stringify(responseData, null, 4);

    } catch (error) {
        logger.error("批量导入域定义失败: ", error);
        
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
    // if(!description){
    //     throw new MXApplicationException("#", "第 " + index + " 个域定义的 description（描述）不能为空");
    // }

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
        domainSet = MXServer.getMXServer().getMboSet("MAXDOMAIN", userInfo);
        
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

        
        if(!domainMbo.getMboValueData("DOMAINTYPE").isReadOnly()&&typeof domainType !== 'undefined'){
            // 设置字段值
            domainMbo.setValue("DOMAINTYPE", domainType,2);
        }
        logger.info("----------002")
        
        if (typeof description!== 'undefined'&&description!==null&&description!=="") {
            domainMbo.setValue("DESCRIPTION", description);
        }
        
        logger.info("----------003")
        // TABLE/CROSSOVER 类型不设置 MAXTYPE 和 LENGTH
        var isTableType = domainType === "TABLE" || domainType === "CROSSOVER";
        /** @type {java.lang.String} */
        var maxType = domainData.maxtype;
        if (!isTableType && typeof maxType !== 'undefined' && maxType !== null) {
            domainMbo.setValue("MAXTYPE", maxType, 11);
        }
        
        if (!isTableType && typeof length!== 'undefined') {
            domainMbo.setValue("LENGTH", length,2);
        }
        logger.info("----------004.scale="+scale)
        
        if (typeof scale !== 'undefined'&&scale!=null) {
            if(domainMbo.getString("DOMAINTYPE")==="NUMERIC"||domainMbo.getString("DOMAINTYPE")==="NUMRANGE"){
                domainMbo.setValue("SCALE", scale,2);
            }
        }
        
        logger.info("----------005")
        if (typeof internal !== 'undefined' && internal) {
            domainMbo.setValue("INTERNAL", internal, 2);
        }
        logger.info("----------neverCache="+neverCache)
        if (typeof neverCache !== 'undefined' && neverCache !== null) {
            domainMbo.setValue("NEVERCACHE", neverCache);
        }

        // 按 domaintype 处理域值子表
        saveOrUpdateDomainValues(domainMbo, domainData, domainType);
        
        // 保存记录
        domainSet.save();
        
        logger.info("域定义保存成功: DOMAINID=" + domainId + ", DOMAINTYPE=" + domainType);
        
    } catch (error) {
        logger.error("保存MAXDOMAIN表失败: " , error);
        throw new MXApplicationException("#", "保存域定义失败: " , error);
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
            if (typeof description !== 'undefined' && description) {
                alnMbo.setValue("DESCRIPTION", description);
            }

            // 设置可选字段
            if (typeof alnData.maxvalue !== 'undefined' && alnData.maxvalue) {
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
            logger.error("处理第 " + (i + 1) + " 条 ALNDOMAIN 记录失败: " , error);
            // 继续处理下一条记录
        }
    }

    logger.info("ALNDOMAIN 记录处理完成");
}

/**
 * 按 domaintype 分发域值子表保存(支持 ALN/SYNONYM/NUMERIC/NUMRANGE/CROSSOVER/TABLE)
 * @param {psdi.mbo.MboRemote} domainMbo - MAXDOMAIN MBO
 * @param {Object} domainData - 域定义数据
 * @param {java.lang.String} domainType - 域类型
 */
function saveOrUpdateDomainValues(domainMbo, domainData, domainType) {
    // ALN
    if (domainData.alndomain) {
        var alnSet = domainMbo.getMboSet("ALNDOMAINVALUE");
        try { saveOrUpdateAlnDomain(alnSet, domainData.alndomain); } finally { __mboSetClose(alnSet); }
    }
    // SYNONYM
    if (domainData.synonymdomain) {
        var synSet = domainMbo.getMboSet("SYNONYMDOMAIN");
        try { saveOrUpdateSynonymDomain(synSet, domainData.synonymdomain); } finally { __mboSetClose(synSet); }
    }
    // NUMERIC
    if (domainData.numericdomain) {
        var numSet = domainMbo.getMboSet("NUMDOMAINVALUE");
        try { saveOrUpdateNumericDomain(numSet, domainData.numericdomain); } finally { __mboSetClose(numSet); }
    }
    // NUMRANGE
    if (domainData.numrangedomain) {
        var nrSet = domainMbo.getMboSet("RANGEDOMSEGMENT");
        try { saveOrUpdateNumRangeDomain(nrSet, domainData.numrangedomain); } finally { __mboSetClose(nrSet); }
    }
    // TABLE / CROSSOVER (值记录在 MAXTABLEDOMAIN)
    if (domainData.tabledomain) {
        var tbRel = domainType === "CROSSOVER" ? "MAXTABLEDOMAINFORCROSSOVER" : "MAXTABLEDOMAIN";
        var tbSet = domainMbo.getMboSet(tbRel);
        try { saveOrUpdateTableDomain(tbSet, domainData.tabledomain, domainType); } finally { __mboSetClose(tbSet); }
    }
}

/**
 * 保存或更新 SYNONYMDOMAIN(同义词域)子记录
 * 主键: DOMAINID+MAXVALUE+VALUE
 * @param {psdi.mbo.MboSetRemote} synonymdomainSet - SYNONYMDOMAIN MBO 集合
 * @param {Array} datas - SYNONYMDOMAIN 数据数组
 */
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
            // 查找匹配记录
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
                logger.info("已保存 SYNONYMDOMAIN 记录: " + maxvalue + "/" + value);
            }
        } catch (error) {
            logger.error("处理第 " + (i + 1) + " 条 SYNONYMDOMAIN 记录失败: " , error);
        }
    }
    logger.info("SYNONYMDOMAIN 记录处理完成");
}

/**
 * 保存或更新 NUMERICDOMAIN(数值域)子记录
 * 主键: DOMAINID+VALUE
 * @param {psdi.mbo.MboSetRemote} numericdomainSet - NUMERICDOMAIN MBO 集合
 * @param {Array} datas - NUMERICDOMAIN 数据数组
 */
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
            // 查找匹配记录
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
                logger.info("已保存 NUMERICDOMAIN 记录: VALUE=" + value);
            }
        } catch (error) {
            logger.error("处理第 " + (i + 1) + " 条 NUMERICDOMAIN 记录失败: " , error);
        }
    }
    logger.info("NUMERICDOMAIN 记录处理完成");
}

/**
 * 保存或更新 NUMRANGEDOMAIN(数值范围域)子记录
 * 主键: DOMAINID+RANGESEGMENT
 * @param {psdi.mbo.MboSetRemote} numrangedomainSet - NUMRANGEDOMAIN MBO 集合
 * @param {Array} datas - NUMRANGEDOMAIN 数据数组
 */
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
            // 查找匹配记录
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
            logger.error("处理第 " + (i + 1) + " 条 NUMRANGEDOMAIN 记录失败: " , error);
        }
    }
    logger.info("NUMRANGEDOMAIN 记录处理完成");
}

/**
 * 保存或更新 MAXTABLEDOMAIN(TABLE/CROSSOVER 域)子记录
 * CROSSOVER 类型: MAXTABLEDOMAIN 下还有 CROSSOVERDOMAIN 子记录
 * @param {psdi.mbo.MboSetRemote} tabledomainSet - MAXTABLEDOMAIN MBO 集合
 * @param {Array} datas - MAXTABLEDOMAIN 数据数组
 * @param {java.lang.String} domainType - 域类型
 */
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
            // 查找匹配记录
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
            } else {
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
            }
            // CROSSOVER 类型: 处理 MAXTABLEDOMAIN 下的 CROSSOVERDOMAIN 子记录
            if (domainType === "CROSSOVER" && data.crossoverdomain) {
                var coSet = tbMbo.getMboSet("CROSSOVERDOMAIN");
                try { saveOrUpdateCrossoverDomain(coSet, data.crossoverdomain); } finally { __mboSetClose(coSet); }
            }
        } catch (error) {
            logger.error("处理第 " + (i + 1) + " 条 MAXTABLEDOMAIN 记录失败: " , error);
        }
    }
    logger.info("MAXTABLEDOMAIN 记录处理完成");
}

/**
 * 保存或更新 CROSSOVERDOMAIN(交叉域映射)子记录
 * 主键: DOMAINID+SOURCEFIELD+DESTFIELD
 * @param {psdi.mbo.MboSetRemote} crossoverdomainSet - CROSSOVERDOMAIN MBO 集合
 * @param {Array} datas - CROSSOVERDOMAIN 数据数组
 */
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
            // 查找匹配记录
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
                if (data.orgid) { coMbo.setValue("ORGID", data.orgid); }
                if (data.siteid) { coMbo.setValue("SITEID", data.siteid); }
                logger.info("已保存 CROSSOVERDOMAIN 记录: " + sourcefield + "->" + destfield);
            }
        } catch (error) {
            logger.error("处理第 " + (i + 1) + " 条 CROSSOVERDOMAIN 记录失败: ", error);
        }
    }
    logger.info("CROSSOVERDOMAIN 记录处理完成");
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