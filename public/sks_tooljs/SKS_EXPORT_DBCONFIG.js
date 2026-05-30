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
/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");
/** @type {com.ibm.json.java.JSONArray} */
JSONArray = Java.type("com.ibm.json.java.JSONArray");
/** @type {java.util.Locale} */
Locale = Java.type("java.util.Locale");

/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

/** @type {psdi.webclient.system.session.WebClientSession} */
WebClientSession = Java.type("psdi.webclient.system.session.WebClientSession");

//脚本中获取webclientsession为null
// /** @type {psdi.webclient.system.session.WebClientSession} */
// var masSession = service.webclientsession();
commonsUtils=service.invokeScript("SKS_COMMONS_UTILS");

/** @type {psdi.security.UserInfo} */
var uInfo = userInfo;

//_lang=zh ,_lang=en,
// _langcode=zh , _langcode=en
if(request.getQueryParam("_langcode")!=='undefined'&&request.getQueryParam("_langcode")){
    var _langcode = request.getQueryParam("_langcode");
    // uInfo.setLocale(lang);
    uInfo.setLangCode(_langcode)
    logger.info("------------------_langcode=" + uInfo.getLocale().getLanguage() + ",country=" + uInfo.getLocale().getCountry());
}


// logger.info("masSession ------------------"+masSession);
// if(masSession){
//     logger.info("masSession exists");
//     if(!uInfo){
//         uInfo = masSession.getUserInfo();
//     }
// }


responseBody=main();
function main() {
    try {
        // 验证请求体是否存在
        if (typeof requestBody === "undefined" || !requestBody) {
            throw new MXApplicationException("#", "请求体(requestBody)不能为空");
        }

        // 解析请求体
        /** @type {Object} */
        var requestData = JSON.parse(requestBody);
        
        // 获取 objectNames 参数
        /** @type {Array} */
        var objectNames = requestData.objectNames;
        
        if (!objectNames || !Array.isArray(objectNames) || objectNames.length === 0) {
            throw new MXApplicationException("#", "objectNames 参数不能为空，必须是一个字符串数组");
        }
        
        // 转换为大写并过滤空值
        objectNames = objectNames.map(function(name) {
            return name.trim().toUpperCase();
        }).filter(function(name) {
            return name.length > 0;
        });
        
        if (objectNames.length === 0) {
            throw new MXApplicationException("#", "objectNames 数组中至少需要一个有效的对象名称");
        }
        
        logger.info("开始导出数据库配置，对象数量: " + objectNames.length + ", 对象列表: " + objectNames.join(", "));
        
        // 导出配置
        /** @type {com.ibm.json.java.JSONObject} */
        var config = exportDatabaseConfig(objectNames);
        
        // 返回JSON响应
        /** @type {java.lang.String} */
        var responseBodyStr = service.jsonToString(config)
        responseBody = responseBodyStr;
        // logger.info(responseBody)
        
        logger.info("数据库配置导出完成，共导出 " + ((config.get("maxObjects") != null) ? config.get("maxObjects").size() : 0) + " 个对象");
        
    } catch (error) {
        logger.error(error)
        logger.error("导出数据库配置失败: " + error.message);
        
        /** @type {com.ibm.json.java.JSONObject} */
        var errorData = new JSONObject();
        errorData.put("status", "error");
        errorData.put("message", error.message);
        responseBody = errorData.serialize();
    }
    return responseBody
}

/**
 * 导出数据库配置
 * @param {Array} objectNames - 要导出的对象名称数组
 * @returns {com.ibm.json.java.JSONObject} 配置对象
 */
function exportDatabaseConfig(objectNames) {
    /** @type {psdi.mbo.MboSetRemote} */
    var maxObjectCfgSet = null;
    
    try {
        maxObjectCfgSet = MXServer.getMXServer().getMboSet("MAXOBJECTCFG", uInfo);
        
        // 构建查询条件 - 只导出指定的对象
        /** @type {java.lang.String} */
        var objectList = objectNames.map(function(name) {
            return "'" + name + "'";
        }).join(",");
        
        /** @type {java.lang.String} */
        var whereClause = "objectname IN (" + objectList + ")";
        
        maxObjectCfgSet.setWhere(whereClause);
        maxObjectCfgSet.reset();
        
        logger.info("查询到 " + maxObjectCfgSet.count() + " 个对象需要导出");
        
        /** @type {com.ibm.json.java.JSONArray} */
        var maxObjects = new JSONArray();
        
        /** @type {psdi.mbo.MboRemote} */
        var maxObjectCfg = maxObjectCfgSet.moveFirst();
        while (maxObjectCfg) {
            /** @type {java.lang.String} */
            var objectName = maxObjectCfg.getString("OBJECTNAME");
            
            try {
                logger.info("正在导出对象: " + objectName);
                
                /** @type {com.ibm.json.java.JSONObject} */
                var objectConfig = exportMaxObject(objectName);
                if (objectConfig) {
                    maxObjects.add(objectConfig);
                }
            } catch (objError) {
                logger.error(objError)
                logger.error("导出对象 " + objectName + " 失败: " + objError.message);
            }
            
            maxObjectCfg = maxObjectCfgSet.moveNext();
        }
        
        /** @type {com.ibm.json.java.JSONObject} */
        var result = new JSONObject();
        result.put("maxObjects", maxObjects);
        
        return result;
        
    } catch (error) {
        logger.error(error)
        logger.error("导出数据库配置失败: " + error.message, error);
    } finally {
        __mboSetClose(maxObjectCfgSet);
    }
}

/**
 * 导出单个Maximo对象的配置
 * @param {java.lang.String} objectName - 对象名称
 * @returns {com.ibm.json.java.JSONObject} 对象配置
 */
function exportMaxObject(objectName) {
    /** @type {psdi.mbo.MboSetRemote} */
    var maxObjectCfgSet = null;
    /** @type {psdi.mbo.MboSetRemote} */
    var maxAttributeCfgSet = null;
    /** @type {psdi.mbo.MboSetRemote} */
    var maxRelationshipSet = null;
    
    try {
        // 获取对象配置
        maxObjectCfgSet = MXServer.getMXServer().getMboSet("MAXOBJECTCFG", uInfo);
        /** @type {psdi.mbo.SqlFormat} */
        var sqlf = new SqlFormat("objectname = :1");
        sqlf.setObject(1, "MAXOBJECTCFG", "OBJECTNAME", objectName);
        maxObjectCfgSet.setWhere(sqlf.format());
        maxObjectCfgSet.reset();
        
        if (maxObjectCfgSet.isEmpty()) {
            logger.warn("对象 " + objectName + " 不存在");
            return null;
        }
        
        /** @type {psdi.mbo.MboRemote} */
        var maxObjectCfg = maxObjectCfgSet.getMbo(0);
        
        /** @type {com.ibm.json.java.JSONObject} */
        var objectConfig = new JSONObject();

        
        // 字符串类型字段
        objectConfig.put("addRowstamp", true);
        logger.info("OBJECTNAME--------------------")
        // logger.info(commonsUtils)
        var objName = commonsUtils.getMboStringValue(service, maxObjectCfg, "OBJECTNAME")
        logger.info("OBJECTNAME--------------------objName="+objName)
        // logger.info("OBJECTNAME="+commonsUtils.getMboStringValue( service,maxObjectCfg, "OBJECTNAME"))
        objectConfig.put("object", commonsUtils.getMboStringValue(service, maxObjectCfg, "OBJECTNAME"));
        objectConfig.put("description", commonsUtils.getMboStringValue(service, maxObjectCfg, "DESCRIPTION"));
        objectConfig.put("service", commonsUtils.getMboStringValue(service, maxObjectCfg, "SERVICENAME"));
        objectConfig.put("entity", commonsUtils.getMboStringValue(service, maxObjectCfg, "ENTITYNAME"));
        objectConfig.put("className", commonsUtils.getMboStringValue(service, maxObjectCfg, "CLASSNAME"));
        objectConfig.put("extendsObject", commonsUtils.getMboStringValue(service, maxObjectCfg, "EXTENDSOBJECT"));
        objectConfig.put("level", commonsUtils.getMboStringValue(service, maxObjectCfg, "SITEORGTYPE"));
        objectConfig.put("textDirection", commonsUtils.getMboStringValue(service, maxObjectCfg, "TEXTDIRECTION"));
        objectConfig.put("resourceType", commonsUtils.getMboStringValue(service, maxObjectCfg, "RESOURCETYPE"));
        objectConfig.put("langCode", commonsUtils.getMboStringValue(service, maxObjectCfg, "LANGCODE"));
        
        // 长整型字段
        objectConfig.put("maxObjectId", commonsUtils.getMboLongValue(service, maxObjectCfg, "MAXOBJECTID"));
        
        // 布尔类型字段
        objectConfig.put("persistent", commonsUtils.getMboBooleanValue(service, maxObjectCfg, "PERSISTENT"));
        objectConfig.put("mainObject", commonsUtils.getMboBooleanValue(service, maxObjectCfg, "MAINOBJECT"));
        objectConfig.put("auditEnabled", commonsUtils.getMboBooleanValue(service, maxObjectCfg, "EAUDITENABLED"));
        objectConfig.put("internal", commonsUtils.getMboBooleanValue(service, maxObjectCfg, "INTERNAL"));
        objectConfig.put("isView", commonsUtils.getMboBooleanValue(service, maxObjectCfg, "ISVIEW"));
        objectConfig.put("hasLD", commonsUtils.getMboBooleanValue(service, maxObjectCfg, "HASLD"));
        objectConfig.put("imported", commonsUtils.getMboBooleanValue(service, maxObjectCfg, "IMPORTED"));
        objectConfig.put("userDefined", commonsUtils.getMboBooleanValue(service, maxObjectCfg, "USERDEFINED"));
        
        // 导出属性
        /** @type {com.ibm.json.java.JSONArray} */
        var attributes = exportAttributes(objectName,maxObjectCfg);
        if (attributes.size() > 0) {
            objectConfig.put("attributes", attributes);
        }
        
        // 导出关系
        /** @type {com.ibm.json.java.JSONArray} */
        var relationships = exportRelationships(objectName,maxObjectCfg);
        if (relationships.size() > 0) {
            objectConfig.put("relationships", relationships);
        }
        
        // 导出索引
        /** @type {com.ibm.json.java.JSONArray} */
        var indexes = exportIndexes(objectName,maxObjectCfg);
        if (indexes.size() > 0) {
            objectConfig.put("indexes", indexes);
        }
        
        return objectConfig;
        
    } catch (error) {
        logger.error("导出对象 " + objectName + " 失败: " + error.message,error);
    } finally {
        __mboSetClose(maxObjectCfgSet);
        __mboSetClose(maxAttributeCfgSet);
        __mboSetClose(maxRelationshipSet);
    }
}

/**
 * 导出对象的所有属性
 * @param {java.lang.String} objectName - 对象名称
 * @returns {com.ibm.json.java.JSONArray} 属性数组
 */
function exportAttributes(objectName,maxObjectCfg) {
    /** @type {psdi.mbo.MboSetRemote} */
    var maxAttributeCfgSet = null;
    
    try {
        maxAttributeCfgSet = MXServer.getMXServer().getMboSet("MAXATTRIBUTECFG",uInfo);
        
        /** @type {psdi.mbo.SqlFormat} */
        var sqlf = new SqlFormat("objectname = :1 AND persistent = 1");
        sqlf.setObject(1, "MAXATTRIBUTECFG", "OBJECTNAME", objectName);
        maxAttributeCfgSet.setWhere(sqlf.format());
        maxAttributeCfgSet.reset();
        
        /** @type {com.ibm.json.java.JSONArray} */
        var attributes = new JSONArray();
        
        /** @type {psdi.mbo.MboRemote} */
        var attributeCfg = maxAttributeCfgSet.moveFirst();
        while (attributeCfg) {
            // if(attributeCfg.getString("ATTRIBUTENAME")==maxObjectCfg.getString("UNIQUECOLUMNNAME")){
            //     attributeCfg = maxAttributeCfgSet.moveNext();
            //     continue;
            // }
            /** @type {java.lang.String} */
            var attributeName = attributeCfg.getString("ATTRIBUTENAME");
            
            // 跳过系统字段
            if (attributeName === "ROWSTAMP" || 
                attributeName === "HASLD") {
                attributeCfg = maxAttributeCfgSet.moveNext();
                continue;
            }
            
            /** @type {com.ibm.json.java.JSONObject} */
            var attribute = new JSONObject();
            // 字符串类型字段
            attribute.put("attribute", commonsUtils.getMboStringValue(service, attributeCfg, "ATTRIBUTENAME"));
            attribute.put("description", commonsUtils.getMboStringValue(service, attributeCfg, "REMARKS"));
            attribute.put("title", commonsUtils.getMboStringValue(service, attributeCfg, "TITLE"));
            attribute.put("type", commonsUtils.getMboStringValue(service, attributeCfg, "MAXTYPE"));
            attribute.put("searchType", commonsUtils.getMboStringValue(service, attributeCfg, "SEARCHTYPE"));
            if(!attributeCfg.isNull("SAMEASOBJECT")&&!attributeCfg.getString("SAMEASOBJECT").isEmpty()){
                attribute.put("sameAsObject", commonsUtils.getMboStringValue(service, attributeCfg, "SAMEASOBJECT"));
                attribute.put("sameAsAttribute", commonsUtils.getMboStringValue(service, attributeCfg, "SAMEASATTRIBUTE"));
            }
            attribute.put("defaultValue", commonsUtils.getMboStringValue(service, attributeCfg, "DEFAULTVALUE"));
            attribute.put("domain", commonsUtils.getMboStringValue(service, attributeCfg, "DOMAINID"));
            attribute.put("class", commonsUtils.getMboStringValue(service, attributeCfg, "CLASSNAME"));
            attribute.put("alias", commonsUtils.getMboStringValue(service, attributeCfg, "ALIAS"));
            attribute.put("column", commonsUtils.getMboStringValue(service, attributeCfg, "COLUMNNAME"));
            attribute.put("autonumber", commonsUtils.getMboStringValue(service, attributeCfg, "AUTOKEYNAME"));
            attribute.put("textDirection", commonsUtils.getMboStringValue(service, attributeCfg, "TEXTDIRECTION"));
            attribute.put("typeOfComplexExpression", commonsUtils.getMboStringValue(service, attributeCfg, "COMPLEXEXPRESSION"));
            attribute.put("entityName", commonsUtils.getMboStringValue(service, attributeCfg, "ENTITYNAME"));
            attribute.put("handleColumnName", commonsUtils.getMboStringValue(service, attributeCfg, "HANDLECOLUMNNAME"));
            
            // 整数类型字段
            attribute.put("length", commonsUtils.getMboIntValue(service, attributeCfg, "LENGTH"));
            attribute.put("scale", commonsUtils.getMboIntValue(service, attributeCfg, "SCALE"));
            attribute.put("attributeNo", commonsUtils.getMboIntValue(service, attributeCfg, "ATTRIBUTENO"));
            attribute.put("extended", commonsUtils.getMboIntValue(service, attributeCfg, "EXTENDED"));
            attribute.put("primaryColumn", commonsUtils.getMboIntValue(service, attributeCfg, "PRIMARYKEYCOLSEQ"));
            
            // 长整型字段
            attribute.put("maxAttributeId", commonsUtils.getMboLongValue(service, attributeCfg, "MAXATTRIBUTEID"));
            
            // 布尔类型字段
            attribute.put("required", commonsUtils.getMboBooleanValue(service, attributeCfg, "REQUIRED"));
            attribute.put("persistent", commonsUtils.getMboBooleanValue(service, attributeCfg, "PERSISTENT"));
            attribute.put("canAutonumber", commonsUtils.getMboBooleanValue(service, attributeCfg, "CANAUTONUM"));
            attribute.put("mustBe", commonsUtils.getMboBooleanValue(service, attributeCfg, "MUSTBE"));
            attribute.put("localizable", commonsUtils.getMboBooleanValue(service, attributeCfg, "LOCALIZABLE"));
            attribute.put("positive", commonsUtils.getMboBooleanValue(service, attributeCfg, "ISPOSITIVE"));
            attribute.put("longDescriptionOwner", commonsUtils.getMboBooleanValue(service, attributeCfg, "ISLDOWNER"));
            attribute.put("eAuditEnabled", commonsUtils.getMboBooleanValue(service, attributeCfg, "EAUDITENABLED"));
            attribute.put("multiLanguageInUse", commonsUtils.getMboBooleanValue(service, attributeCfg, "MLINUSE"));
            attribute.put("mlSupported", commonsUtils.getMboBooleanValue(service, attributeCfg, "MLSUPPORTED"));
            attribute.put("eSignatureEnabled", commonsUtils.getMboBooleanValue(service, attributeCfg, "ESIGENABLED"));
            attribute.put("userDefined", commonsUtils.getMboBooleanValue(service, attributeCfg, "USERDEFINED"));
            attribute.put("changed", commonsUtils.getMboStringValue(service, attributeCfg, "CHANGED"));
            attribute.put("restricted", commonsUtils.getMboBooleanValue(service, attributeCfg, "RESTRICTED"));
            
            attributes.add(attribute);
            
            attributeCfg = maxAttributeCfgSet.moveNext();
        }
        
        return attributes;
        
    } finally {
        __mboSetClose(maxAttributeCfgSet);
    }
}

/**
 * 导出对象的所有关系
 * @param {java.lang.String} objectName - 对象名称
 * @returns {com.ibm.json.java.JSONArray} 关系数组
 */
function exportRelationships(objectName) {
    /** @type {psdi.mbo.MboSetRemote} */
    var maxRelationshipSet = null;
    
    try {
        maxRelationshipSet = MXServer.getMXServer().getMboSet("MAXRELATIONSHIP",uInfo);
        
        /** @type {psdi.mbo.SqlFormat} */
        var sqlf = new SqlFormat("parent = :1");
        sqlf.setObject(1, "MAXRELATIONSHIP", "PARENT", objectName);
        maxRelationshipSet.setWhere(sqlf.format());
        maxRelationshipSet.reset();
        
        /** @type {com.ibm.json.java.JSONArray} */
        var relationships = new JSONArray();
        
        /** @type {psdi.mbo.MboRemote} */
        var relationship = maxRelationshipSet.moveFirst();
        while (relationship) {
            /** @type {com.ibm.json.java.JSONObject} */
            var relConfig = new JSONObject();
            
            // 字符串类型字段
            relConfig.put("relationship", commonsUtils.getMboStringValue(service, relationship, "NAME"));
            relConfig.put("child", commonsUtils.getMboStringValue(service, relationship, "CHILD"));
            relConfig.put("parent", commonsUtils.getMboStringValue(service, relationship, "PARENT"));
            relConfig.put("whereClause", commonsUtils.getMboStringValue(service, relationship, "WHERECLAUSE"));
            relConfig.put("remarks", commonsUtils.getMboStringValue(service, relationship, "REMARKS"));
            relConfig.put("cardinality", commonsUtils.getMboStringValue(service, relationship, "CARDINALITY"));
            
            // 整数类型字段
            relConfig.put("dbJoinRequired", commonsUtils.getMboIntValue(service, relationship, "DBJOINREQUIRED"));
            
            // 长整型字段
            relConfig.put("maxRelationshipId", commonsUtils.getMboLongValue(service, relationship, "MAXRELATIONSHIPID"));
            
            // 布尔类型字段
            relConfig.put("isDefault", commonsUtils.getMboBooleanValue(service, relationship, "ISDEFAULT"));
            
            relationships.add(relConfig);
            
            relationship = maxRelationshipSet.moveNext();
        }
        
        return relationships;
        
    } finally {
        __mboSetClose(maxRelationshipSet);
    }
}

/**
 * 导出对象的所有索引
 * @param {java.lang.String} objectName - 对象名称
 * @returns {com.ibm.json.java.JSONArray} 索引数组
 */
function exportIndexes(objectName,maxObjectCfg) {
    /** @type {psdi.mbo.MboSetRemote} */
    var maxSysIndexesSet = null;
    /** @type {psdi.mbo.MboSetRemote} */
    var maxSysIndexColsSet = null;
    
    try {
        maxSysIndexesSet = MXServer.getMXServer().getMboSet("MAXSYSINDEXES",uInfo);
        
        /** @type {psdi.mbo.SqlFormat} */
        var sqlf = new SqlFormat("tbname = :1");
        sqlf.setObject(1, "MAXSYSINDEXES", "TBNAME", objectName.toUpperCase());
        maxSysIndexesSet.setWhere(sqlf.format());
        maxSysIndexesSet.reset();
        
        /** @type {com.ibm.json.java.JSONArray} */
        var indexes = new JSONArray();
        
        /** @type {psdi.mbo.MboRemote} */
        var index = maxSysIndexesSet.moveFirst();
        while (index) {


            /** @type {java.lang.String} */
            var indexName = index.getString("NAME");
            
            // 跳过系统索引
            if (indexName.startsWith("MAXSYS") || indexName.startsWith("N" + objectName.toUpperCase())) {
                index = maxSysIndexesSet.moveNext();
                continue;
            }
            
            /** @type {com.ibm.json.java.JSONObject} */
            var indexConfig = new JSONObject();
            
            // 字符串类型字段
            indexConfig.put("index", commonsUtils.getMboStringValue(service, index, "NAME"));
            indexConfig.put("table", commonsUtils.getMboStringValue(service, index, "TBNAME"));
            indexConfig.put("storagePartition", commonsUtils.getMboStringValue(service, index, "STORAGEPARTITION"));
            indexConfig.put("changed", commonsUtils.getMboStringValue(service, index, "CHANGED"));
            
            // 长整型字段
            indexConfig.put("maxSysIndexesId", commonsUtils.getMboLongValue(service, index, "MAXSYSINDEXESID"));
            
            // 布尔类型字段
            indexConfig.put("enforceUniqueness", commonsUtils.getMboBooleanValue(service, index, "UNIQUE"));
            indexConfig.put("clusteredIndex", commonsUtils.getMboBooleanValue(service, index, "CLUSTERRULE"));
            indexConfig.put("textSearchIndex", commonsUtils.getMboBooleanValue(service, index, "TEXTSEARCH"));
            indexConfig.put("internal", commonsUtils.getMboBooleanValue(service, index, "REQUIRED"));
            
            // 获取索引列
            maxSysIndexColsSet = index.getMboSet("MAXSYSKEYS");
            /** @type {com.ibm.json.java.JSONArray} */
            var columns = new JSONArray();
            
            /** @type {psdi.mbo.MboRemote} */
            var indexCol = maxSysIndexColsSet.moveFirst();
            var isIdIndex=false;
            while (indexCol) {
                /** @type {com.ibm.json.java.JSONObject} */
                var colConfig = new JSONObject();
                
                // 字符串类型字段
                colConfig.put("column", commonsUtils.getMboStringValue(service, indexCol, "COLNAME"));
                colConfig.put("ordering", commonsUtils.getMboStringValue(service, indexCol, "ORDERING"));
                colConfig.put("changed", commonsUtils.getMboStringValue(service, indexCol, "CHANGED"));
                
                // 整数类型字段
                colConfig.put("colSeq", commonsUtils.getMboIntValue(service, indexCol, "COLSEQ"));
                
                // 长整型字段
                colConfig.put("maxSysKeysId", commonsUtils.getMboLongValue(service, indexCol, "MAXSYSKEYSID"));

                
                columns.add(colConfig);
                if(maxObjectCfg.getString("UNIQUECOLUMNNAME")&&maxObjectCfg.getString("UNIQUECOLUMNNAME")==indexCol.getString("COLNAME")){
                    isIdIndex=true;
                }

                indexCol = maxSysIndexColsSet.moveNext();
            }
            
            if (columns.size() > 0) {
                indexConfig.put("columns", columns);
            }

            if (!isIdIndex) {
            indexes.add(indexConfig);
            }
            index = maxSysIndexesSet.moveNext();
        }
        
        return indexes;
        
    } finally {
        __mboSetClose(maxSysIndexesSet);
        __mboSetClose(maxSysIndexColsSet);
    }
}

/**
 * 关闭 MboSet
 * @param {psdi.mbo.MboSetRemote} set - 要关闭的 MboSet
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