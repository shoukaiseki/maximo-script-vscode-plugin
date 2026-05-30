/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
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