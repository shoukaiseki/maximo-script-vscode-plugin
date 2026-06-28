/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
load('nashorn:mozilla_compat.js');
importClass(Packages.psdi.server.MXServer);
importClass(Packages.java.time.ZonedDateTime);
importClass(Packages.java.time.format.DateTimeFormatter);
importClass(Packages.java.util.HashMap);
importClass(Packages.java.text.SimpleDateFormat);
importClass(Packages.java.util.TimeZone);
//如果需要JSONObject对key排序,可以使用OrderedJSONObject
/** @type {com.ibm.json.java.OrderedJSONObject} */
OrderedJSONObject = Java.type("com.ibm.json.java.OrderedJSONObject");
/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");
/** @type {com.ibm.json.java.JSONArray} */
JSONArray = Java.type("com.ibm.json.java.JSONArray");

/** @type {com.ibm.tivoli.maximo.script.ScriptUtil} */
ScriptUtil = Java.type("com.ibm.tivoli.maximo.script.ScriptUtil");


try {
  var mxserver = MXServer.getMXServer();
  var msr = mxserver.getMboSet("AUTOSCRIPT", userInfo);
  var reqBody = JSON.parse(requestBody);

  // 验证输入
  if (!reqBody.AUTOSCRIPT) {
    responseBody = JSON.stringify({"code": 400, "message": "缺少脚本名称参数"});
    exit;
  }

  msr.setWhere("AUTOSCRIPT='" + reqBody.AUTOSCRIPT + "'");
  msr.reset();

  var responseBodyStr = "";


  if (!msr.isEmpty()) {
    var tmpMbo = msr.moveFirst();
    var dataMap = getAutoScriptInfo(tmpMbo)

    // 构建返回的JSON对象
    var result = new OrderedJSONObject();
    result.put("code",200);
    result.put("message","success");
    result.put("data",dataMap);

    responseBodyStr = service.jsonToString(result);
  } else {
    responseBodyStr = JSON.stringify({"code": 404, "message": "未找到脚本: " + reqBody.AUTOSCRIPT});
  }

  responseBody = responseBodyStr;

} catch (e) {
  responseBody = JSON.stringify({"code": 500, "message": "导出失败: " + e.message});
}finally{
    _close(msr)
}

function getAutoScriptInfo(scriptMbo) {
  var asvArr=new JSONArray()
  var lpArr=new JSONArray()
  var tmpMbo=scriptMbo
  var asvSet=null;
  var lpSet=null;
  try{
    // 获取AUTOSCRIPTVARS子表信息
    asvSet=tmpMbo.getMboSet("AUTOSCRIPTVARS");
    asvSet.reset();
    var asv=null;
    if(!asvSet.isEmpty()){
      asv = asvSet.moveFirst();
      while (asv){
        /** @type {com.ibm.json.java.OrderedJSONObject} */
        var varObj = new OrderedJSONObject();
        varObj.put("varname", asv.getString("VARNAME"));
        varObj.put("vartype", asv.getString("VARTYPE"));
        varObj.put("varbindingtype", asv.getString("VARBINDINGTYPE"));
        varObj.put("varbindingvalue", asv.getString("VARBINDINGVALUE"));
        varObj.put("allowoverride", asv.getString("ALLOWOVERRIDE"));
        asvArr.add(varObj);
        asv=asvSet.moveNext();
      }
    }
    service.log("asvArr finish "+asvSet.count())

    // 获取SCRIPTLAUNCHPOINT子表信息
    lpSet=tmpMbo.getMboSet("SCRIPTLAUNCHPOINT");
    lpSet.reset();
    var lp=null;
    if(!lpSet.isEmpty()){
      lp = lpSet.moveFirst();
      while (lp){
        var ADDUPDATEDELETE=[]
        if(lp.getString("ADD")==="Y"){
          ADDUPDATEDELETE.push("添加")
        }
        if(lp.getString("UPDATE")==="Y"){
          ADDUPDATEDELETE.push("更新")
        }
        if(lp.getString("DELETE")==="Y"){
          ADDUPDATEDELETE.push("删除")
        }
        var EVENTTYPE=""
        var EVCONTEXT = ""
        if(lp.getString("LAUNCHPOINTTYPE")==="OBJECT"){
          if (lp.getString("EVENTTYPE") === "0") {
            EVENTTYPE = "初始化值"
          }
          if (lp.getString("EVENTTYPE") === "1") {
            EVENTTYPE = "验证应用程序"
          }
          if (lp.getString("EVENTTYPE") === "2") {
            EVENTTYPE = "允许创建对象"
          }
          if (lp.getString("EVENTTYPE") === "3") {
            EVENTTYPE = "允许删除对象"
          }
          if (lp.getString("EVENTTYPE") === "4") {
            EVENTTYPE = "保存"
          }
          if (lp.getString("EVCONTEXT") === "0") {
            EVCONTEXT = "保存前"
          }
          if (lp.getString("EVCONTEXT") === "1") {
            EVCONTEXT = "保存后"
          }
          if (lp.getString("EVCONTEXT") === "2") {
            EVCONTEXT = "落实后"
          }
        }else{
          var objectevent=lp.getInt("OBJECTEVENT")
          if (objectevent === 0) {
            EVENTTYPE = "验证"
          }
          if ((objectevent & 1) === 1) {
            EVENTTYPE = "运行操作"
          }
          if ((objectevent & 2) === 2) {
            EVENTTYPE = "初始化值"
          }
          if ((objectevent & 8) === 8) {
            EVENTTYPE = "初始化访问限制"
          }
          if ((objectevent & 64) === 64) {
            EVENTTYPE = "检索列表"
          }
        }

        
        /** @type {com.ibm.json.java.OrderedJSONObject} */
        var lpObj = new OrderedJSONObject();
         
        //自己加的字段，用于前端显示
        lpObj.put("launchpointname", lp.getString("LAUNCHPOINTNAME"));
        lpObj.put("description", lp.getString("DESCRIPTION"));
        lpObj.put("objectname", lp.getString("OBJECTNAME"));
        lpObj.put("attributename", lp.getString("ATTRIBUTENAME"));
        lpObj.put("launchpointtype", lp.getString("LAUNCHPOINTTYPE"));
        lpObj.put("objectevent", ScriptUtil.getValueFromMaxType(lp.getMboValue("OBJECTEVENT").getMaxType()));
        lpObj.put("attributeevent", ScriptUtil.getValueFromMaxType(lp.getMboValue("ATTRIBUTEEVENT").getMaxType()));
        lpObj.put("sks:eventtype", EVENTTYPE);
        lpObj.put("eventtype", ScriptUtil.getValueFromMaxType(lp.getMboValue("EVENTTYPE").getMaxType()));
        lpObj.put("sks:evcontext", EVCONTEXT);
        lpObj.put("evcontext", ScriptUtil.getValueFromMaxType(lp.getMboValue("EVCONTEXT").getMaxType()));
        lpObj.put("sks:addupdatedelete", ADDUPDATEDELETE.join(","));
        //系统虚拟属性,要加上,否则导入时启动点不对
        lpObj.put("add", ScriptUtil.getValueFromMaxType(lp.getMboValue("ADD").getMaxType()));
        lpObj.put("update", ScriptUtil.getValueFromMaxType(lp.getMboValue("UPDATE").getMaxType()));
        lpObj.put("delete", ScriptUtil.getValueFromMaxType(lp.getMboValue("DELETE").getMaxType()));

        lpObj.put("condition", lp.getString("CONDITION"));
        lpObj.put("active", ScriptUtil.getValueFromMaxType(lp.getMboValue("ACTIVE").getMaxType()));

        lpArr.add(lpObj);
        lp = lpSet.moveNext();
      }
    }
    service.log("lpvArr finish")

    // 使用Map存储所有字段
    /** @type {com.ibm.json.java.OrderedJSONObject} */
    var dataMap = new OrderedJSONObject();

    // AUTOSCRIPT主表字段
    dataMap.put("autoscript", tmpMbo.getString("AUTOSCRIPT"));
    dataMap.put("description", tmpMbo.getString("DESCRIPTION"));
    dataMap.put("scriptlanguage", tmpMbo.getString("SCRIPTLANGUAGE"));
    dataMap.put("loglevel", tmpMbo.getString("LOGLEVEL"));
    dataMap.put("interface", tmpMbo.getInt("INTERFACE"));
    dataMap.put("active", tmpMbo.getInt("ACTIVE"));

    //附加的字段,先判断字段存不存在
    if(tmpMbo.getThisMboSet().getMboSetInfo().getAttribute("IBM_PACKAGEPATH")!=null){
      dataMap.put("ibm_packagepath", tmpMbo.getString("IBM_PACKAGEPATH"));
    }

    // 子表信息
    dataMap.put("variables", asvArr);
    dataMap.put("launchPoints", lpArr);

    dataMap.put("status", tmpMbo.getString("STATUS"));
    dataMap.put("scheduledstatus", tmpMbo.getString("SCHEDULEDSTATUS"));
    dataMap.put("comments", tmpMbo.getString("COMMENTS"));
    dataMap.put("ownerid", tmpMbo.getString("OWNERID"));
    dataMap.put("ownername", tmpMbo.getString("OWNERNAME"));
    dataMap.put("ownerphone", tmpMbo.getString("OWNERPHONE"));
    dataMap.put("owneremail", tmpMbo.getString("OWNEREMAIL"));
    dataMap.put("createdbyid", tmpMbo.getString("CREATEDBYID"));
    dataMap.put("orgid", tmpMbo.getString("ORGID"));
    dataMap.put("siteid", tmpMbo.getString("SITEID"));
    dataMap.put("action", tmpMbo.getString("ACTION"));
    dataMap.put("version", tmpMbo.getString("VERSION"));
    dataMap.put("category", tmpMbo.getString("CATEGORY"));
    dataMap.put("owner", tmpMbo.getString("OWNER"));
    dataMap.put("hasld", tmpMbo.getInt("HASLD"));
    dataMap.put("langcode", tmpMbo.getString("LANGCODE"));
    dataMap.put("userdefined", tmpMbo.getInt("USERDEFINED"));
    dataMap.put("createdbyphone", tmpMbo.getString("CREATEDBYPHONE"));
    dataMap.put("createdbyname", tmpMbo.getString("CREATEDBYNAME"));
    dataMap.put("createdbyemail", tmpMbo.getString("CREATEDBYEMAIL"));
    dataMap.put("autoscriptid", tmpMbo.getLong("AUTOSCRIPTID"));
    dataMap.put("createdby", tmpMbo.getString("CREATEDBY"));
    dataMap.put("changeby", tmpMbo.getString("CHANGEBY"));
    dataMap.put("statusdate", formatDateTime(tmpMbo.getDate("STATUSDATE")));
    dataMap.put("changedate", formatDateTime(tmpMbo.getDate("CHANGEDATE")));



    return dataMap;

  } catch (e) {
    logger.error("Error: " + e);
    throw e;
  }finally{
    _close(asvSet)
    _close(lpSet)
  }

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

function _close(set){
    if (set) {
        try {
            set.cleanup()
        } catch (ignore) { }
        try {
            set.close()
        } catch (ignore) { }
    }
}


// eslint-disable-next-line no-unused-vars
var scriptConfig = {
  autoscript: "SKS_EXP_AUTOSCRIPTBYNAME",
  description: "导出脚本.",
  version: "1.0.2",
  active: true,
  logLevel: "ERROR"
};