// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
load("nashorn:mozilla_compat.js");
importPackage(Packages.javax.management);
importPackage(Packages.java.lang.management);
//直接调用方法的脚本,无任何隐式变量可以使用
var scriptName="APPBEAN.AUTOSCRIPT"//service.getScriptName()
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
loggerMX.info("["+scriptName+"]------------------load------------------");

/** @type {psdi.mbo.MboConstants} */
MboConstants = Java.type("psdi.mbo.MboConstants");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");//13

/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");//67

/** @type {psdi.util.MXSession} */
MXSession = Java.type("psdi.util.MXSession");

/** @type {java.text.SimpleDateFormat} */
SimpleDateFormat = Java.type("java.text.SimpleDateFormat");

/** @type {jscustom.AnsiLogger} */
var logger=null


/**
 * 初始化日志记录器,在bean脚本中,每次都需要调用该方法以初始化logger
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function initLogger(dbctx){
    java.lang.System.out.println("[" + scriptName + "] initLogger")
    if(logger!=null){
        return
    }
    var sksLogAnsiUtils = dbctx.invokeScript("SKS_LOG_ANSI_UTILS");
    logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true ,printModel:false})
    // logger = loggerMX

    // logger.setLevel(Level.INFO);

    logger.debug("[" + scriptName + "] initLogger")
    logger.info("[" + scriptName + "] initLogger")
    logger.warn("[" + scriptName + "] initLogger")
    logger.error("[" + scriptName + "] initLogger")
}

/**
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function initializeApp(dbctx){
    initLogger(dbctx);
    // var clientsession = dbctx.webclientsession();
    // clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "APPBEAN.initializeApp!!!", 1);

    // /** @type {psdi.webclient.system.controller.AppInstance} */
    // var appInstance = dbctx.getAppInstance();
    // /** @type {psdi.webclient.system.beans.DataBean} */
    // var appBean = appInstance.getAppBean();
    // /** @type {psdi.mbo.MboRemote} */
    // var mbo = appBean.getMbo();
    // appBean.setQbe("APPLYNUM", "1003");
    // appBean.reset()
    logger.info("[" + scriptName + "] initializeApp")
}

function SAVE(dbctx){
    initLogger(dbctx);
    logger.info("[" + scriptName + "] save")
    /** @type {psdi.webclient.system.controller.AppInstance} */
    var appInstance = dbctx.getAppInstance();
    /** @type {psdi.webclient.system.beans.DataBean} */
    var appBean = appInstance.getAppBean();
    /** @type {psdi.mbo.MboRemote} */
    var mbo = appBean.getMbo();
    if(!mbo){
        return
    }
    if(!(mbo.toBeUpdated()||mbo.toBeAdded())){
        return
    }
    logger.info("[" + scriptName + "] 保存自动化脚本历史记录")
    var historySet=null
    try {
        historySet = mbo.getMboSet("!IBM_AUTOSCRIPT_HISTORY", "IBM_AUTOSCRIPT_HISTORY", "1=2")
        if(!historySet.isEmpty()){
            return
        }
        versionAutoAdd(mbo)
        var scriptHistory = historySet.add()
        dbctx.invokeScript("AUTOSCRIPT_UTILS","copyScriptToHistory",[dbctx,mbo, scriptHistory])
        scriptHistory.setValue("ALIASNAME", "_backup_", MboConstants.NOACCESSCHECK);
        historySet.save()
        logger.info("\x1b[32m" + "备份成功" + "\x1b[0m")
    }catch(e){
        logger.error("[" + scriptName + "] SAVE",e)
    }finally{
        _close(historySet)
    }
    // appBean.fireDataChangedEvent()
}

function versionAutoAdd(mbo){
    var version = mbo.getString("VERSION");
    if (version.isEmpty()) {
        version = "1.0.1"
    }
    logger.info("[" + scriptName + "] versionAutoAdd version=" + version)
    // 增加版本号（递增最后一个数字）
    var parts = version.split(".");
    try{
        var last = parseInt(parts[parts.length - 1], 10);
        logger.info("[" + scriptName + "] versionAutoAdd last=" + last)
        parts[parts.length - 1] = String(last + 1);
        version = parts.join(".")
    }catch(e){
        logger.error("[" + scriptName + "] versionAutoAdd error",e)
        version = "1.0.1"
    }
    logger.info("[" + scriptName + "] versionAutoAdd newversion=" + version)
    mbo.setValue("VERSION",version ,MboConstants.NOACCESSCHECK);
    mbo.setModified(true)
    logger.info("[" + scriptName + "] versionAutoAdd mboname="+mbo.getName()+", AUTOSCRIPT="+mbo.getString("AUTOSCRIPT")+",mbo.version=" + mbo.getString("VERSION"))
}


// Cleans up the MboSet connections and closes the set.
function _close(set) {
    if (set) {
        try {
            set.cleanup();
            set.close();
        } catch (ignore) { }
    }
}



// function copyScriptToHistory(script, scriptHistory){
//         var scriptInfoDataMap = getAutoScriptInfo(script)
//         var scriptInfoStr = service.jsonToString(scriptInfoDataMap);
//         logger.info("["+scriptName+"]----------------脚本信息: " + scriptInfoStr)
//         scriptHistory.setValue("DESCRIPTION_LONGDESCRIPTION", scriptInfoStr, MboConstants.NOACCESSCHECK);
//         scriptHistory.setValue("HOSTNAME", "MAXADMIN", MboConstants.NOACCESSCHECK);
//         var source = ""
//         if(!script.isNull("SOURCE")){
//             var source = script.getString("SOURCE")
//         }
//         scriptHistory.setValue("SOURCE", source, MboConstants.NOACCESSCHECK);
//         var version="1.0.1"
//         if (!script.isNull("VERSION")) {
//             version = script.getString("VERSION")
//         }
//         scriptHistory.setValue("VERSION", version, MboConstants.NOACCESSCHECK);
//         scriptHistory.setValue("AUTOSCRIPT", script.getString("AUTOSCRIPT"), MboConstants.NOACCESSCHECK);
//         scriptHistory.setValue("ALIASNAME", "_crontask_", MboConstants.NOACCESSCHECK);
// }

// function getAutoScriptInfo(scriptMbo) {
//   var asvArr=new JSONArray()
//   var lpArr=new JSONArray()
//   var tmpMbo=scriptMbo
//   var asvSet=null;
//   var lpSet=null;
//   try{
//     // 获取AUTOSCRIPTVARS子表信息
//     asvSet=tmpMbo.getMboSet("AUTOSCRIPTVARS");
//     asvSet.reset();
//     var asv=null;
//     if(!asvSet.isEmpty()){
//       asv = asvSet.moveFirst();
//       while (asv){
//         var varObj = new JSONObject();
//         varObj.put("varname", asv.getString("VARNAME"));
//         varObj.put("vartype", asv.getString("VARTYPE"));
//         varObj.put("varbindingtype", asv.getString("VARBINDINGTYPE"));
//         varObj.put("varbindingvalue", asv.getString("VARBINDINGVALUE"));
//         varObj.put("allowoverride", asv.getString("ALLOWOVERRIDE"));
//         asvArr.add(varObj);
//         asv=asvSet.moveNext();
//       }
//     }
//     service.log("asvArr finish "+asvSet.count())

//     // 获取SCRIPTLAUNCHPOINT子表信息
//     lpSet=tmpMbo.getMboSet("SCRIPTLAUNCHPOINT");
//     lpSet.reset();
//     var lp=null;
//     if(!lpSet.isEmpty()){
//       lp = lpSet.moveFirst();
//       while (lp){
//         var ADDUPDATEDELETE=[]
//         if(lp.getString("ADD")==="Y"){
//           ADDUPDATEDELETE.push("添加")
//         }
//         if(lp.getString("UPDATE")==="Y"){
//           ADDUPDATEDELETE.push("更新")
//         }
//         if(lp.getString("DELETE")==="Y"){
//           ADDUPDATEDELETE.push("删除")
//         }
//         var EVENTTYPE=""
//         var EVCONTEXT = ""
//         if(lp.getString("LAUNCHPOINTTYPE")==="OBJECT"){
//           if (lp.getString("EVENTTYPE") === "0") {
//             EVENTTYPE = "初始化值"
//           }
//           if (lp.getString("EVENTTYPE") === "1") {
//             EVENTTYPE = "验证应用程序"
//           }
//           if (lp.getString("EVENTTYPE") === "2") {
//             EVENTTYPE = "允许创建对象"
//           }
//           if (lp.getString("EVENTTYPE") === "3") {
//             EVENTTYPE = "允许删除对象"
//           }
//           if (lp.getString("EVENTTYPE") === "4") {
//             EVENTTYPE = "保存"
//           }
//           if (lp.getString("EVCONTEXT") === "0") {
//             EVCONTEXT = "保存前"
//           }
//           if (lp.getString("EVCONTEXT") === "1") {
//             EVCONTEXT = "保存后"
//           }
//           if (lp.getString("EVCONTEXT") === "2") {
//             EVCONTEXT = "落实后"
//           }
//         }else{
//           var objectevent=lp.getInt("OBJECTEVENT")
//           if (objectevent === 0) {
//             EVENTTYPE = "验证"
//           }
//           if ((objectevent & 1) === 1) {
//             EVENTTYPE = "运行操作"
//           }
//           if ((objectevent & 2) === 2) {
//             EVENTTYPE = "初始化值"
//           }
//           if ((objectevent & 8) === 8) {
//             EVENTTYPE = "初始化访问限制"
//           }
//           if ((objectevent & 64) === 64) {
//             EVENTTYPE = "检索列表"
//           }
//         }

        
//         var lpObj = new JSONObject();
         
//         //自己加的字段，用于前端显示
//         lpObj.put("sks:eventtype", EVENTTYPE);
//         lpObj.put("sks:evcontext", EVCONTEXT);
//         lpObj.put("sks:addupdatedelete", ADDUPDATEDELETE.join(","));
//         //系统虚拟属性,要加上,否则导入时启动点不对
//         lpObj.put("add", ScriptUtil.getValueFromMaxType(lp.getMboValue("ADD").getMaxType()));
//         lpObj.put("update", ScriptUtil.getValueFromMaxType(lp.getMboValue("UPDATE").getMaxType()));
//         lpObj.put("delete", ScriptUtil.getValueFromMaxType(lp.getMboValue("DELETE").getMaxType()));
//         lpObj.put("attributeevent", ScriptUtil.getValueFromMaxType(lp.getMboValue("ATTRIBUTEEVENT").getMaxType()));
//         lpObj.put("eventtype", ScriptUtil.getValueFromMaxType(lp.getMboValue("EVENTTYPE").getMaxType()));
//         lpObj.put("evcontext", ScriptUtil.getValueFromMaxType(lp.getMboValue("EVCONTEXT").getMaxType()));

//         lpObj.put("launchpointname", lp.getString("LAUNCHPOINTNAME"));
//         lpObj.put("description", lp.getString("DESCRIPTION"));
//         lpObj.put("launchpointtype", lp.getString("LAUNCHPOINTTYPE"));
//         lpObj.put("objectname", lp.getString("OBJECTNAME"));
//         lpObj.put("attributename", lp.getString("ATTRIBUTENAME"));
//         lpObj.put("objectevent", ScriptUtil.getValueFromMaxType(lp.getMboValue("OBJECTEVENT").getMaxType()));
//         lpObj.put("condition", lp.getString("CONDITION"));
//         lpObj.put("active", ScriptUtil.getValueFromMaxType(lp.getMboValue("ACTIVE").getMaxType()));

//         lpArr.add(lpObj);
//         lp = lpSet.moveNext();
//       }
//     }
//     service.log("lpvArr finish")

//     // 使用Map存储所有字段
//     var dataMap = new JSONObject();

//     // AUTOSCRIPT主表字段
//     dataMap.put("autoscript", tmpMbo.getString("AUTOSCRIPT"));
//     dataMap.put("status", tmpMbo.getString("STATUS"));
//     dataMap.put("scheduledstatus", tmpMbo.getString("SCHEDULEDSTATUS"));
//     dataMap.put("comments", tmpMbo.getString("COMMENTS"));
//     dataMap.put("ownerid", tmpMbo.getString("OWNERID"));
//     dataMap.put("ownername", tmpMbo.getString("OWNERNAME"));
//     dataMap.put("ownerphone", tmpMbo.getString("OWNERPHONE"));
//     dataMap.put("owneremail", tmpMbo.getString("OWNEREMAIL"));
//     dataMap.put("createdbyid", tmpMbo.getString("CREATEDBYID"));
//     dataMap.put("description", tmpMbo.getString("DESCRIPTION"));
//     dataMap.put("orgid", tmpMbo.getString("ORGID"));
//     dataMap.put("siteid", tmpMbo.getString("SITEID"));
//     dataMap.put("action", tmpMbo.getString("ACTION"));
//     dataMap.put("version", tmpMbo.getString("VERSION"));
//     dataMap.put("category", tmpMbo.getString("CATEGORY"));
//     dataMap.put("statusdate", formatDateTime(tmpMbo.getDate("STATUSDATE")));
//     dataMap.put("changedate", formatDateTime(tmpMbo.getDate("CHANGEDATE")));
//     dataMap.put("createdbyphone", tmpMbo.getString("CREATEDBYPHONE"));
//     dataMap.put("createdbyname", tmpMbo.getString("CREATEDBYNAME"));
//     dataMap.put("createdbyemail", tmpMbo.getString("CREATEDBYEMAIL"));
//     dataMap.put("owner", tmpMbo.getString("OWNER"));
//     dataMap.put("createdby", tmpMbo.getString("CREATEDBY"));
//     dataMap.put("changeby", tmpMbo.getString("CHANGEBY"));
//     dataMap.put("autoscriptid", tmpMbo.getLong("AUTOSCRIPTID"));
//     dataMap.put("hasld", tmpMbo.getInt("HASLD"));
//     dataMap.put("langcode", tmpMbo.getString("LANGCODE"));
//     dataMap.put("scriptlanguage", tmpMbo.getString("SCRIPTLANGUAGE"));
//     dataMap.put("userdefined", tmpMbo.getInt("USERDEFINED"));
//     dataMap.put("loglevel", tmpMbo.getString("LOGLEVEL"));
//     dataMap.put("interface", tmpMbo.getInt("INTERFACE"));
//     dataMap.put("active", tmpMbo.getInt("ACTIVE"));

//     //附加的字段,先判断字段存不存在
//     if(tmpMbo.getThisMboSet().getMboSetInfo().getAttribute("IBM_PACKAGEPATH")!=null){
//       dataMap.put("ibm_packagepath", tmpMbo.getString("IBM_PACKAGEPATH"));
//     }

//     // 子表信息
//     dataMap.put("variables", asvArr);
//     dataMap.put("launchPoints", lpArr);

//     return dataMap;

//   } catch (e) {
//     logger.error("Error: " + e);
//     throw e;
//   }finally{
//     _close(asvSet)
//     _close(lpSet)
//   }

// }

// // 辅助函数：格式化日期时间
// function formatDateTime(date) {
//   try {

//     // 1. 创建 SimpleDateFormat 实例
//     // 注意：X 模式在 Java 7+ 支持，XXX 表示 +08:00 格式
//     var sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX");

//     // 2. 重要：设置时区
//     // 如果不设置，会使用 JVM 默认时区，可能导致偏移量不符合预期
//     sdf.setTimeZone(TimeZone.getTimeZone("GMT+8"));

//     //2026-05-16T05:48:25+08:00
//     // 使用 ISO 8601
//     // 3. 执行格式化
//     return sdf.format(date);

//   } catch (e) {
//     return null; // 出错时返回原值
//   }
// }