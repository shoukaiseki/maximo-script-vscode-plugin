/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />

var scriptName="SKS_MAXVARS_MANAGE";
Thread = Java.type("java.lang.Thread");

// eslint-disable-next-line no-global-assign
Date = Java.type("java.util.Date");

System = Java.type("java.lang.System");

// eslint-disable-next-line no-global-assign
File = Java.type("java.io.File");

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");

RandomAccessFile = Java.type("java.io.RandomAccessFile");

/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");

/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
var loggerMX = MXLoggerFactory.getLogger(scriptName);//使用根目录记录器
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })


if(request.getQueryParam("_langcode")!=='undefined'&&request.getQueryParam("_langcode")){
    //_langcode=zh
    var _langcode = request.getQueryParam("_langcode");
    // uInfo.setLocale(lang);
    userInfo.setLangCode(_langcode.toLowerCase())
    if(userInfo.getLocale()){
        logger.error("\x1b[35;40m["+scriptName+"]------------------没有错误,只为一直显示_langcode=" + userInfo.getLangCode() + ",locale.language=" + userInfo.getLocale().getLanguage() + ",country=" + userInfo.getLocale().getCountry() + "\x1b[0m");
    }
}

main();

function main() {
    if (typeof request === "undefined" || !request) {
        responseBody = JSON.stringify({ "status": "error", "message": "该脚本仅支持通过 Web 请求调用。" });
        return;
    }
    /** @type {psdi.server.MaxVarServiceRemote} */
    var maxvarServ = MXServer.getMXServer().lookup("MAXVARS");
    var config = JSON.parse(requestBody);

    var maxvars = MXServer.getMXServer().getMboSet("MAXVARS", userInfo);
    var sqlFormat = new SqlFormat("VARNAME=:1");

    var data=[]
    for(var i=0;i<config.length;i++){
        var item = config[i];
        if(item._ignore) continue;
        maxvarServ.put(item.varname, null, item.varvalue);
        var varType = maxvarServ.getMaxVarType(item.varname);
        var varOut={}
        varOut["varname="] = item.varname;
        varOut["vartype="] = varType;
        try{
            // if(typeof item.varvalue === 'string'){
            //     varOut["varvalue"] = item.varvalue;
            // }
            sqlFormat.setString(1, item.varname);
            maxvars.setWhere(sqlFormat.format());
            maxvars.reset()
            var maxvar = maxvars.moveFirst()
            if(maxvar){
                maxvar.setValue("VARVALUE",item.varvalue)
                maxvars.save()
            }
            varOut["varvalue"] = maxvarServ.getString(item.varname, null);
        }catch(e){
            try{
                // logger.error(e)
                var errorTrack=sksLogAnsiUtils.getErrorStackTrace(e);
                logger.warn("\x1b[31m[" + scriptName + "] \n" + errorTrack + "\x1b[0m")
                if(e instanceof java.lang.ClassCastException){
                    varOut["varerror"] = e.message;
                    varOut["varerrormsg"] = "提醒:值必须是字符串,因为设置之后会缓存,"
                        + "而读取的时候都是获取的String类型,所以非String类型会报类型转换错误";
                }else{
                    varOut["vartrack"] = errorTrack;
                }
            }catch(e2){
                logger.error(e2)
                varOut["varerror"] = e.message;
            }
        }
       data.push(varOut) ;
    }
    _close(maxvars);
    responseBody = JSON.stringify({ "status": "success", "message": "配置已成功更新","data": data });
}

function _close(set){
    try {
        if(!set)return;
        try { set.cleanup()} catch (ignore) { }
        try { set.close()} catch (ignore) { }
    } catch (ignore) { }

}

/**
 
 */
// curl --request POST \
//   --url 'http://localhost:9080/maximo/api/script/SKS_MAXVARS_MANAGE?develop=true&_langcode=ZH' \
//   --header 'Accept: */*' \
//   --header 'Accept-Encoding: gzip, deflate, br' \
//   --header 'Connection: keep-alive' \
//   --header 'Content-Type: application/json' \
//   --header 'Cookie: JSESSIONID=0000thZ4PDa1rnaW1fwy2nKIr1f:2e8b6054-1f9c-4a48-b5ae-f5d578c3ecc8' \
//   --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
//   --header 'apiKey: kufl9t6i501qh2gci7h10ak00prp68gomu2b2r2c' \
//   --data '
// [
//     {

//       "varname": "CONFIGURING",
//       "varvalue": "N"
//     },
//     {
//         "_ignore": true,
//         "_ignore_desc": "_ignore属性为true,会忽略更新"
//     }
// ]'