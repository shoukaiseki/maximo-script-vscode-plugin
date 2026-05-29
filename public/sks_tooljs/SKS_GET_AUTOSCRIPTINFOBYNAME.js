/*
 *shoukaiseki this_is_auto_comment_donot_delete:这是导出的自动注释,不要删除,否则下次导出会出现重复注释
 * 脚本(AUTOSCRIPT): SKS_GET_AUTOSCRIPTINFOBYNAME
 * 脚本语言(SCRIPTLANGUAGE): Nashorn
 * 描述(DESCRIPTION): 获取脚本详情
 * 日志级别(LOGLEVEL): ERROR
 * 唯一标识(AUTOSCRIPTID): 116            语言代码(LANGCODE): EN
 * 用户定义(USERDEFINED): Y               状态(STATUS): Draft
 * 是接口(INTERFACE): N                  活动(ACTIVE): Y
 * 变更人(CHANGEBY): MAXADMIN
 * 日期(CHANGEDATE): 2026/5/15 10:7:38
 *
 * Variables: 无
 *
 * Launch Points: 无
 */
load('nashorn:mozilla_compat.js');
importClass(Packages.psdi.server.MXServer);
importClass(Packages.java.time.ZonedDateTime);
importClass(Packages.java.time.format.DateTimeFormatter);
importClass(Packages.java.util.HashMap);
importClass(Packages.java.text.SimpleDateFormat);
importClass(Packages.java.util.TimeZone);
importClass(Packages.com.ibm.json.java.JSONObject);
importClass(Packages.com.ibm.json.java.JSONArray);



try {
  var mxserver = MXServer.getMXServer();
  var msr = mxserver.getMboSet("AUTOSCRIPT", userInfo);
  var asvSet=null;
  var lpSet=null;
  var reqBody = JSON.parse(requestBody);

  // 验证输入
  if (!reqBody.AUTOSCRIPT) {
    responseBody = JSON.stringify({"code": 400, "message": "缺少脚本名称参数"});
    exit;
  }

  msr.setWhere("AUTOSCRIPT='" + reqBody.AUTOSCRIPT + "'");
  msr.reset();

  var responseBodyStr = "";

  var asvArr=new JSONArray()
  var lpArr=new JSONArray()


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
      return  sdf.format(date);

    } catch (e) {
      return null; // 出错时返回原值
    }
  }

  if (!msr.isEmpty()) {
    var tmpMbo = msr.moveFirst();

    // 获取AUTOSCRIPTVARS子表信息
    asvSet=tmpMbo.getMboSet("AUTOSCRIPTVARS");
    asvSet.reset();
    var asv=null;
    if(!asvSet.isEmpty()){
      asv = asvSet.moveFirst();
      while (asv){
        var varObj = new JSONObject();
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
        if(lp.getString("EVENTTYPE")==="0"){
          EVENTTYPE="初始化值"
        }
        if(lp.getString("EVENTTYPE")==="1"){
          EVENTTYPE="验证应用程序"
        }
        if(lp.getString("EVENTTYPE")==="2"){
          EVENTTYPE="允许创建对象"
        }
        if(lp.getString("EVENTTYPE")==="3"){
          EVENTTYPE="允许删除对象"
        }
        if(lp.getString("EVENTTYPE")==="4"){
          EVENTTYPE="保存"
        }
        var EVCONTEXT=""
        if(lp.getString("EVCONTEXT")==="0"){
          EVCONTEXT="保存前"
        }
        if(lp.getString("EVCONTEXT")==="1"){
          EVCONTEXT="保存后"
        }
        if(lp.getString("EVCONTEXT")==="2"){
          EVCONTEXT="落实后"
        }
        
        var lpObj = new JSONObject();
        lpObj.put("launchpointname", lp.getString("LAUNCHPOINTNAME"));
        lpObj.put("description", lp.getString("DESCRIPTION"));
        lpObj.put("launchpointtype", lp.getString("LAUNCHPOINTTYPE"));
        lpObj.put("objectname", lp.getString("OBJECTNAME"));
        lpObj.put("attributename", lp.getString("ATTRIBUTENAME"));
        lpObj.put("objectevent", lp.getString("OBJECTEVENT"));
        lpObj.put("eventtype", EVENTTYPE);
        lpObj.put("sks:evcontext", EVCONTEXT);
        lpObj.put("addupdatedelete", ADDUPDATEDELETE.join(","));
        lpObj.put("condition", lp.getString("CONDITION"));
        lpObj.put("attributeevent", lp.getString("ATTRIBUTEEVENT"));
        lpObj.put("active", lp.getString("ACTIVE"));

        lpArr.add(lpObj);
        lp = lpSet.moveNext();
      }
    }
    service.log("lpvArr finish")

    // 使用Map存储所有字段
    var dataMap = new JSONObject();

    // AUTOSCRIPT主表字段
    dataMap.put("autoscript", tmpMbo.getString("AUTOSCRIPT"));
    dataMap.put("status", tmpMbo.getString("STATUS"));
    dataMap.put("scheduledstatus", tmpMbo.getString("SCHEDULEDSTATUS"));
    dataMap.put("comments", tmpMbo.getString("COMMENTS"));
    dataMap.put("ownerid", tmpMbo.getString("OWNERID"));
    dataMap.put("ownername", tmpMbo.getString("OWNERNAME"));
    dataMap.put("ownerphone", tmpMbo.getString("OWNERPHONE"));
    dataMap.put("owneremail", tmpMbo.getString("OWNEREMAIL"));
    dataMap.put("createdbyid", tmpMbo.getString("CREATEDBYID"));
    dataMap.put("description", tmpMbo.getString("DESCRIPTION"));
    dataMap.put("orgid", tmpMbo.getString("ORGID"));
    dataMap.put("siteid", tmpMbo.getString("SITEID"));
    dataMap.put("action", tmpMbo.getString("ACTION"));
    dataMap.put("version", tmpMbo.getString("VERSION"));
    dataMap.put("category", tmpMbo.getString("CATEGORY"));
    dataMap.put("statusdate", formatDateTime(tmpMbo.getDate("STATUSDATE")));
    dataMap.put("changedate", formatDateTime(tmpMbo.getDate("CHANGEDATE")));
    dataMap.put("createdbyphone", tmpMbo.getString("CREATEDBYPHONE"));
    dataMap.put("createdbyname", tmpMbo.getString("CREATEDBYNAME"));
    dataMap.put("createdbyemail", tmpMbo.getString("CREATEDBYEMAIL"));
    dataMap.put("owner", tmpMbo.getString("OWNER"));
    dataMap.put("createdby", tmpMbo.getString("CREATEDBY"));
    dataMap.put("changeby", tmpMbo.getString("CHANGEBY"));
    dataMap.put("autoscriptid", tmpMbo.getLong("AUTOSCRIPTID"));
    dataMap.put("hasld", tmpMbo.getInt("HASLD"));
    dataMap.put("langcode", tmpMbo.getString("LANGCODE"));
    dataMap.put("scriptlanguage", tmpMbo.getString("SCRIPTLANGUAGE"));
    dataMap.put("userdefined", tmpMbo.getInt("USERDEFINED"));
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

    // 构建返回的JSON对象
    var result = new JSONObject();
    result.put("code",200);
    result.put("message","success");
    result.put("data",dataMap);

    responseBodyStr = service.jsonToString(result);
  } else {
    responseBodyStr = JSON.stringify({"code": 404, "message": "未找到脚本: " + reqBody.AUTOSCRIPT});
  }

  try {
    msr.close();
    if(asvSet!=null){
      asvSet.close()
    }
    if (lpSet!=null){
      lpSet.close()
    }
  }  catch (e) {}
  responseBody = responseBodyStr;

} catch (e) {
  responseBody = JSON.stringify({"code": 500, "message": "导出失败: " + e.message});
}
// eslint-disable-next-line no-unused-vars
var scriptConfig = {
  autoscript: "SKS_EXP_AUTOSCRIPTBYNAME",
  description: "导出脚本.",
  version: "1.0.2",
  active: true,
  logLevel: "ERROR"
};