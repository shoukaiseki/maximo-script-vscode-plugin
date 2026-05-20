/*
 *shoukaiseki this_is_auto_comment_donot_delete:这是导出的自动注释,不要删除,否则下次导出会出现重复注释
 * 脚本(AUTOSCRIPT): SKS_GET_AUTOSCRIPTNAMES
 * 脚本语言(SCRIPTLANGUAGE): Nashorn
 * 描述(DESCRIPTION): 获取所有脚本名
 * 日志级别(LOGLEVEL): ERROR
 * 唯一标识(AUTOSCRIPTID): 114            语言代码(LANGCODE): ZH
 * 用户定义(USERDEFINED): Y               状态(STATUS): Draft
 * 是接口(INTERFACE): N                  活动(ACTIVE): Y
 * 变更人(CHANGEBY): MAXADMIN
 * 日期(CHANGEDATE): 2026/5/15 8:50:18
 *
 * Variables: 无
 *
 * Launch Points: 无
 */
load('nashorn:mozilla_compat.js');
importClass(Packages.psdi.server.MXServer);
var mxserver = MXServer.getMXServer();
var msr=mxserver.getMboSet("AUTOSCRIPT",userInfo);
msr.reset()
var tmpMbo;
resp = [];
if(!msr.isEmpty()){
    tmpMbo = msr.moveFirst();
    while (tmpMbo) {
        resp.push({
            "autoScript": tmpMbo.getString("AUTOSCRIPT"),
            "description": tmpMbo.getString("DESCRIPTION")
        });
        // "scriptLanguage": tmpMbo.getString("SCRIPTLANGUAGE"),
        //     "logLevel": tmpMbo.getString("LOGLEVEL"),
        //     "source": tmpMbo.getString("SOURCE"),
        tmpMbo = msr.moveNext();
    }

}
msr.close()

responseBody = JSON.stringify(resp);