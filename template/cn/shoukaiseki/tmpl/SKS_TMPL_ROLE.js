// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// load('nashorn:mozilla_compat.js');
//-------------------------------------------
// 直接调用方法的脚本,无任何隐式变量可以使用
var scriptName="${sks_scriptName}"//service.getScriptName()
/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8
loggerMX.info("["+scriptName+"]----------");

/** @type {jscustom.AnsiLogger} */
var logger=null
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils = null


/**
 * 初始化日志记录器,在通用脚本中,每次都需要调用该方法以初始化logger
 * @param {com.ibm.tivoli.maximo.script.ScriptService} service - 脚本服务
 */
function initLogger(service){
    if(logger!=null){
        return
    }
    sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
    logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
// logger.setLevel(Level.INFO);

    logger.info("[" + scriptName + "] initialize")
}


/**
 * 
 * @param {com.ibm.tivoli.maximo.script.ScriptRoleContext} src 
 */
function evalToPerson(src){
    initLogger(src)
    /** @type {psdi.mbo.MboRemote} */
    var mbo = src.getMbo()
    /** @type {psdi.common.role.MaxRole} */
    var maxRole = src.getMaxRole()
    var parameter = maxRole.getString("PARAMETER");
    logger.info("[" + scriptName + "] evalToPerson. parameter=" + parameter)

    //只能是人员组(PersonGroup)或者人员(PersonRemote)
    personSet=mbo.getMboSet("$EMXPERSONGROUP","PERSONGROUP","persongroup='MAXADMIN'")
    personGroup = personSet.moveFirst()
    src.setPersonOrGroupMbo(personGroup)
}

/**
 * 
 * @param {com.ibm.tivoli.maximo.script.ScriptRoleContext} src 
 */
function evalToEmail(src){
    initLogger(src)

}


/**
 *  
 * 角色脚本,没多大作用
 * 
 * 角色中配置定制类,类名为 com.ibm.tivoli.maximo.script.ScriptCustomRole
 * 获取角色的person集合是在psdi.common.role.MaxRole中调用
 * 
 * 
{
  "description": "角色脚本",
  "sks:autoscript:remark": "脚本名必须MAXROLE.开头",
  "sks:autoscript:suggested": "脚本命名:MAXROLE.<角色表MAXROLE字段值>",
  "autoscript": "SKS_TMPL_ROLE",
  "launchPoints": [],
  "sks:interface:remark": "interface的值一定要=1,如果之前是0,pull脚本之后,使用工具箱中的导入功能,导入会更改interface的值",
  "interface": 1,
  "scriptlanguage": "JavaScript",
  "langcode": "ZH",
  "createdby": "MAXADMIN",
  "owner": "MAXADMIN",
  "active": 1,
  "version": "1.0.1",
  "ibm_packagepath": "ibm.maxrole",
  "loglevel": "ERROR",
  "userdefined": 1,
  "status": "Draft"
} 
 */
