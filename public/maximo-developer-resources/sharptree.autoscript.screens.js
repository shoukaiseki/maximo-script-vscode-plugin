// @ts-nocheck
/* eslint-disable no-undef */
/// <reference path="@javaapi/global.d.ts" />
scriptName=service.getScriptName()
/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());
var sksLogAnsiUtils=service.invokeScript("SKS_LOG_ANSI_UTILS");
loggerMX.error("[SHARPTREE.AUTOSCRIPT.SCREENS]----------1");
/** @type {jscustom.AnsiLogger} */
var logger =sksLogAnsiUtils.newAnsiLogger({logger:loggerMX, ansiOpen:true})
logger.setLevel(Level.INFO);
logger.info("[SHARPTREE.AUTOSCRIPT.SCREENS]----------------Starting execution of script " + service.getScriptName());
logger.info("[SHARPTREE.AUTOSCRIPT.SCREENS]-------------webclientsession=" + service.webclientsession())

RESTRequest = Java.type("com.ibm.tivoli.oslc.RESTRequest");

/** @type {psdi.util.MXSession} */
MXSession = Java.type("psdi.util.MXSession");

if(request.getQueryParam("_langcode")!=='undefined'&&request.getQueryParam("_langcode")){
    var _langcode = request.getQueryParam("_langcode");
    // uInfo.setLocale(lang);
    userInfo.setLangCode(_langcode.toLowerCase())
    if(userInfo.getLocale()){
        logger.error("\x1b[35;40m[SHARPTREE.AUTOSCRIPT.SCREENS]------------------没有错误,只为一直显示_langcode=" + userInfo.getLangCode() + ",locale.language=" + userInfo.getLocale().getLanguage() + ",country=" + userInfo.getLocale().getCountry() + "\x1b[0m");
    }
}

RuntimeException = Java.type("java.lang.RuntimeException");
System.out.println("----------------Starting execution of script " + service.getScriptName());

URLDecoder = Java.type("java.net.URLDecoder");
StandardCharsets = Java.type("java.nio.charset.StandardCharsets");

MboConstants = Java.type("psdi.mbo.MboConstants");
SqlFormat = Java.type("psdi.mbo.SqlFormat");
MXServer = Java.type("psdi.server.MXServer");

MXException = Java.type("psdi.util.MXException");
MXAccessException = Java.type("psdi.util.MXAccessException");
MXApplicationException = Java.type("psdi.util.MXApplicationException");
/** @type {java.lang.System} */
System = Java.type("java.lang.System");//59

try {
    PresentationLoader = Java.type("psdi.webclient.system.controller.PresentationLoader");
    WebClientSessionFactory = Java.type("psdi.webclient.system.session.WebClientSessionFactory");
    /** @type {psdi.webclient.system.runtime.WebClientRuntime} */
    WebClientRuntime = Java.type("psdi.webclient.system.runtime.WebClientRuntime");//53
    /** @type {psdi.webclient.system.controller.IdProperty} */
    IdProperty = Java.type("psdi.webclient.system.controller.IdProperty");//51
    /** @type {psdi.webclient.system.controller.LabelCacheMgr} */
    LabelCacheMgr = Java.type("psdi.webclient.system.controller.LabelCacheMgr");//58
} catch (ignored) {
    logger.error("[SHARPTREE.AUTOSCRIPT.SCREENS]",ignored);
}


// MAS removed support for legacy JDOM, switch to JDOM2 and then fall back to legacy JDOM for older versions.
try {
    Element = Java.type("org.jdom2.Element");
    SAXBuilder = Java.type("org.jdom2.input.SAXBuilder");
    Format = Java.type("org.jdom2.output.Format");
    XMLOutputter = Java.type("org.jdom2.output.XMLOutputter");
} catch (error) {
    if (error instanceof Java.type("java.lang.ClassNotFoundException") || error instanceof Java.type("java.lang.RuntimeException")) {
        Element = Java.type("org.jdom.Element");
        SAXBuilder = Java.type("org.jdom.input.SAXBuilder");
        Format = Java.type("org.jdom.output.Format");
        XMLOutputter = Java.type("org.jdom.output.XMLOutputter");
    } else {
        // if some other error is occurring throw the error to the user.
        throw error;
    }
}

StringReader = Java.type("java.io.StringReader");
StringWriter = Java.type("java.io.StringWriter");
logger.setLevel(Level.INFO);

function ImportAppScript(xml){
    logger.info("[SHARPTREE.AUTOSCRIPT.SCREENS]  ImportAppScript")
    this.xml = xml;
    this.currentAppID = null;
}


ImportAppScript.prototype.constructor = ImportAppScript;
ImportAppScript.prototype.importApp = function(app,saveLabels) {
    var xml=this.xml
    //maximo9.1
    PresentationParser=Java.type("psdi.webclient.system.controller.PresentationParser");
    /** @type {psdi.webclient.system.controller.PresentationParser} */
    var pp = new PresentationParser(xml);
    this.currentAppID = pp.getApplication();
    logger.info('[SHARPTREE.AUTOSCRIPT.SCREENS] ImportAppScript.currentAppID=' + this.currentAppID )
    if (pp.getTrimmedXML().indexOf("<systemlib") < 0) {
        //应用xml
        /** @type {psdi.mbo.MboSetRemote} */
        var maxAppsSet = MXServer.getMXServer().getMboSet("MAXAPPS",userInfo);
        /** @type {psdi.mbo.MboRemote} */
        var app = maxAppsSet.moveFirst();

        var exists = false;
        for (exists = false; app != null; app = maxAppsSet.moveNext()) {
            var compAppId = app.getString("app");
            if (compAppId.equalsIgnoreCase(this.currentAppID)) {
                exists = true;
                logger.info("[SHARPTREE.AUTOSCRIPT.SCREENS]  ImportAppScript.应用存在")
                break;
            }
        }

        if (!exists) {
            throw new MXApplicationException("designer", "noapp", [ this.currentAppID.toUpperCase() ]);
        }

    } else if (MXServer.isBotcInstalled() && this.currentAppID != null && (this.currentAppID.equalsIgnoreCase("library") || this.currentAppID.equalsIgnoreCase("lookups") || this.currentAppID.equalsIgnoreCase("menus"))) {
        throw new MXApplicationException("botc", "nosystempresentataions");
    }
    //系统xml 或者 应用xml存在
        var labels = pp.getLabels();
        this.saveXML( this.currentAppID, pp.getTrimmedXML());
        if (saveLabels) {
            this.saveLabels( this.currentAppID, labels);
        }

        this.refreshApp(this.currentAppID);
        if (this.currentAppID.equalsIgnoreCase("REPLIBRARY")) {
            if (logger.isDebugEnabled()) {
                logger.debug("*** Telling the server to reload REPLIBRARY cache");
            }

            if (WebClientRuntime.isMTEnabled()) {
                try {
                    WebClientRuntime.getWebClientRuntime().getPresentationCache().reload("REPLIBRARY_" + MXServer.getTenantContext());
                } catch (e) {
                    e.printStackTrace();
                }
            }

            MXServer.getMXServer().reloadMaximoCache("PRESENTATION", this.currentAppID, true);
        } else {
            if (logger.isDebugEnabled()) {
                logger.debug("*** Telling the server to reload SYSTEM cache");
            }

            MXServer.getMXServer().reloadMaximoCache("PRESENTATION", true);
        }

        logger.info("Successfully imported " + this.currentAppID.toUpperCase() + " application");

}

ImportAppScript.prototype.saveXML = function(appID, xml) {
    logger.info("[SHARPTREE.AUTOSCRIPT.SCREENS]  ImportAppScript.saveXML")
            try {
            /** @type {psdi.mbo.MboSetRemote} */
            var mboset = MXServer.getMXServer().getMboSet("MAXPRESENTATION", userInfo);
            mboset.resetQbe();
            mboset.setQbeExactMatch(true);
            mboset.setQbe("app", appID);
            mboset.reset();
            /** @type {psdi.mbo.MboRemote} */
            var mbo = null;
            if (mboset.isEmpty()) {
                mbo = mboset.add();
                mbo.setValue("app", appID, 9);
            } else {
                mbo = mboset.getMbo(0);
            }

            mbo.setValue("presentation", xml);
            mboset.save();
            /** @type {WebClientRuntime} */
            var wcr = WebClientRuntime.getWebClientRuntime();
            wcr.setAppXML(appID, xml);
        } catch (var7) {
            var params = new Array("Unable to save xml definition:  IO Error");
            throw new MXApplicationException("importApp", "generic", params);
        }
        logger.info("[SHARPTREE.AUTOSCRIPT.SCREENS]  ImportAppScript.saveXML end")

}
ImportAppScript.prototype.saveLabels = function(appID, labels) {
    logger.info("[SHARPTREE.AUTOSCRIPT.SCREENS]  ImportAppScript.saveLabels")
            try {
            var mboset = MXServer.getMXServer().getMboSet("MAXLABELS", userInfo);
            mboset.resetQbe();
            mboset.setQbeExactMatch(true);
            mboset.setQbe("app", appID);
            mboset.reset();
            mboset.setLogLargFetchResultDisabled(true);
            var index = 0;

            while(true) {
                /** @type {psdi.mbo.MboRemote} */
                var mbo = mboset.getMbo(index);
                if (mbo == null) {
                    for (var entry in labels.entrySet()) {
                        /** @type {psdi.webclient.system.controller.IdProperty} */
                        var l = (entry.getKey());
                        /** @type {java.lang.String} */
                        var v = (entry.getValue());
                        var syscache = LabelCacheMgr.getSystemLabelCache(MXServer.getMXServer());
                        var sysValue = syscache.getString(l.getId(), l.getProperty());
                        if (!v.equals(sysValue)) {

                            var mbo = mboset.add();
                            mbo.setValue("app", appID, 9);
                            mbo.setValue("id", l.getId());
                            mbo.setValue("property", l.getProperty());
                            mbo.setValue("value", v);
                        }
                    }

                    mboset.save();
                    return;
                }

                var existingLabel = new IdProperty(mbo.getString("id"), mbo.getString("property"));
                var newValue = labels.get(existingLabel);
                if (newValue == null) {
                    mbo.delete();
                } else {
                    mbo.setValue("app", appID, 11);
                    mbo.setValue("id", existingLabel.getId(), 11);
                    mbo.setValue("property", existingLabel.getProperty(), 11);
                    mbo.setValue("value", newValue, 11);
                }

                labels.remove(existingLabel);
                ++index;
            }
                System.out.println("\x1b[35;40m[SHARPTREE.AUTOSCRIPT.SCREENS] saveLabels end\x1b[0m")
        } catch (x) {
            System.out.println("Unable to save presentation labels: " + x);
            var params = new Array("Unable to save presentation labels: IO Error");
            throw new MXApplicationException("importApp", "generic", params);
        }

}

ImportAppScript.prototype.refreshApp = function(name) {
    try{
        var wcsf = WebClientSessionFactory.getWebClientSessionFactory();
        var wcs = wcsf.createSession(request.getHttpServletRequest(), request.getHttpServletResponse());
        var wcr = WebClientRuntime.getWebClientRuntime();
        if (name.equalsIgnoreCase("replibrary")) {
            wcr.getLibraryDescriptor(name, wcs);
        } else {
            LabelCacheMgr.clearCache(name, wcs);
            LabelCacheMgr.clearSystemCache(wcs);
            if (wcr.removeAppDescriptor(name) != null) {
                System.out.println("Refreshed application \"" + name + "\".");
            } else if (wcr.removeLibraryDescriptor(name) != null) {
                wcr.getLibraryDescriptor(name, wcs);
                System.out.println("Refreshed library \"" + name + "\".");
            } else if (wcr.removeAppXML(name) != null) {
                System.out.println("Refreshed application \"" + name + "\".");
            } else {
                System.out.println("Refresh not necessary for \"" + name.toUpperCase() + "\" application.");
            }
        }
        logger.error("\x1b[35;40m[SHARPTREE.AUTOSCRIPT.SCREENS] refreshApp end\x1b[0m")
    }catch(e){
        logger.warn("[SHARPTREE.AUTOSCRIPT.SCREENS] refreshApp error,正常现象,api调用肯定异常,MAXAUTH调用也经常会异常",e)
    }


}

main();
function main() {
    if (typeof httpMethod !== "undefined") {
        var response = {};
        try {
            checkPermissions("SHARPTREE_UTILS", "DEPLOYSCRIPT");

            if (httpMethod.toLowerCase() === "get") {
                var screenName = getRequestScreentName();
                if (typeof screenName === "undefined" || screenName === null || !screenName) {
                    // If nothing is requested then return a list of all screens.
                    var presentationSet;
                    try {
                        presentationSet = MXServer.getMXServer().getMboSet("MAXPRESENTATION", userInfo);

                        var presentations = [];
                        var presentation = presentationSet.getMbo(0);

                        while (presentation) {
                            presentations.push(presentation.getString("APP"));
                            presentationSet.remove(0);
                            presentation = presentationSet.getMbo(0);
                        }

                        response.status = "success";
                        response.screenNames = presentations;
                        responseBody = JSON.stringify(response);
                    } catch (error) {
                        logger.error("[SHARPTREE.AUTOSCRIPT.SCREENS]",error);
                    } finally {
                        _close(presentationSet);
                    }
                } else {
                    response.status = "success";
                    response.presentation = extractScreen(screenName);
                    responseBody = JSON.stringify(response);
                }
                return;
            } else if (httpMethod.toLowerCase() === "post" && typeof requestBody !== "undefined") {
                var screen = new SAXBuilder().build(new StringReader(requestBody));
                var metadata = screen.getRootElement().getChild("metadata");
                var app = screen.getRootElement().getAttributeValue("id");

                if (metadata) {
                    var controlGroups = metadata.getChildren("ctrlgroup");

                    // remove any existing control groups
                    resetControlGroups(screen.getRootElement().getAttributeValue("id"));
                    if (controlGroups) {
                        controlGroups.forEach(function (controlGroupInfo) {
                            createGroupIfNotExists(controlGroupInfo.getChild("group"));
                            createOrUpdateSigOption(controlGroupInfo.getChild("sigoption"));

                            controlConditions = controlGroupInfo.getChildren("ctrlcondition");

                            if (controlConditions) {
                                controlConditions.forEach(function (controlCondition) {
                                    var conditionInfo = controlCondition.getChild("condition");

                                    if (conditionInfo) {
                                        createOrUpdateCondition(conditionInfo);
                                    }
                                });
                            }

                            // add the control groups defined by the application.
                            createControlGroup(controlGroupInfo);
                        });
                    }
                    //Remove the meta data from the XML so the Maximo screen parser doesn't process it.
                    screen.getRootElement().removeChild("metadata");
                }

                var writer = new StringWriter();

                new XMLOutputter(Format.getPrettyFormat()).output(screen, writer);

                if (typeof PresentationLoader !== "undefined" && typeof WebClientSessionFactory !== "undefined") {
                    // var loader = new PresentationLoader();
                    // var wcsf = WebClientSessionFactory.getWebClientSessionFactory();
                    // var wcs = wcsf.createSession(request.getHttpServletRequest(), request.getHttpServletResponse());

                    logger.info("[SHARPTREE.AUTOSCRIPT.SCREENS]request.getMXSession()=" + request.getMXSession());
                    // var loader = new PresentationLoader();
                    // var wcsf = WebClientSessionFactory.getWebClientSessionFactory();
                    // var wcs = wcsf.createSession(request.getHttpServletRequest(), request.getHttpServletResponse());
                    // loader.importApp(wcs, writer.toString());

                    // logger.info("-------------webclientsession="+service.webclientsession())
                    // //wcs = service.webclientsession()
                    // if (wcs.getMXSession() == null) {
                    //     logger.error("wcs.MXSession is null");
                    //     var session = request.getHttpServletRequest().getSession();
                    //     var mxSession = session.getAttribute("MXSession");
                    //     logger.info("mxSession=" + mxSession);
                    //     if (mxSession == null) {
                    //         mxSession = request.getMXSession();
                    //         if (mxSession == null) {
                    //             mxSession = MXSession.getNewSession();
                    //             logger.info("newSession=" + mxSession);
                    //         }
                    //         session.setAttribute("MXSession", mxSession);
                    //     }
                    //     logger.error("wcs.MXSession is null");
                    // }


                    logger.info("Importing application " + app + " through PresentationLoader.");
                    var importAppScript = new ImportAppScript(writer.toString());
                    importAppScript.importApp(app,true)
                } else {
                    var maxPresentationSet;
                    try {
                        maxPresentationSet = MXServer.getMXServer().getMboSet("MAXPRESENTATION", userInfo);

                        // Query to see if the option has already been assigned to the group.
                        var sqlFormat = new SqlFormat("app = :1 ");
                        sqlFormat.setObject(1, "MAXPRESENTATION", "APP", app);

                        maxPresentationSet.setWhere(sqlFormat.format());
                        maxPresentation = maxPresentationSet.moveFirst();
                        if (maxPresentation) {
                            maxPresentation.setValue("PRESENTATION", writer.toString());
                            maxPresentationSet.save();
                        } else {
                            throw new MXApplicationException("designer", "noapp", Java.to([app.toUpperCase()], "java.lang.String[]"));
                        }
                    } catch (error) {
                        logger.error(error);
                    } finally {
                        _close(maxPresentationSet);
                    }
                }
                response.status = "success";
                responseBody = JSON.stringify(response);
            } else {
                throw new MXApplicationException("only_get_supported", "Only the HTTP GET method is supported when extracting automation scripts.");
            }
        } catch (error) {
            if (error instanceof MXApplicationException){
                throw error;
            }
            logger.error("----------");
            logger.error(error);
            response.status = "error";
            // ensure the error is logged to the Maximo logs
            Java.type("java.lang.System").out.println(error);
            if (error instanceof ScreenError) {
                response.message = error.message;
                response.reason = error.reason;
            } else if (error instanceof SyntaxError) {
                response.reason = "syntax_error";
                response.message = error.message;
            } else if (error instanceof Error) {
                response.message = error.message;
            } else if (error instanceof MXException) {
                throw error;
                response.reason = error.getErrorGroup() + "_" + error.getErrorKey();
                response.message = error.getMessage();
            } else if (error instanceof RuntimeException) {
                if (error.getCause() instanceof MXException) {
                    throw error.getCause();
                    response.reason = error.getCause().getErrorGroup() + "_" + error.getCause().getErrorKey();
                    response.message = error.getCause().getMessage();
                } else {
                    response.reason = "runtime_exception";
                    response.message = error.getMessage();
                }
            } else {
                response.cause = error;
            }
            // logger.error(error);

            if (response.status == "error") {
                logger.error("----------"+response.message);
                throw new MXApplicationException("", response.message)
            }
            if (typeof httpMethod !== "undefined") {
                responseBody = JSON.stringify(response);
            }



            return;
        }
    }
}

function resetControlGroups(app) {
    var ctrlGroupSet;
    try {
        ctrlGroupSet = MXServer.getMXServer().getMboSet("CTRLGROUP", userInfo);

        var sqlf = new SqlFormat("app = :1");

        sqlf.setObject(1, "CTRLGROUP", "APP", app);

        ctrlGroupSet.setWhere(sqlf.format());

        ctrlGroupSet.deleteAll();
        ctrlGroupSet.save();
    } catch (error) {
        logger.error(error);
    } finally {
        _close(ctrlGroupSet);
    }
}

function createControlGroup(ctrlGroupInfo) {
    var ctrlGroupSet;
    try {
        ctrlGroupSet = MXServer.getMXServer().getMboSet("CTRLGROUP", userInfo);

        var ctrlGroup = ctrlGroupSet.add();
        ctrlGroup.setValue("GROUPNAME", ctrlGroupInfo.getAttributeValue("groupname"));
        ctrlGroup.setValue("OPTIONNAME", ctrlGroupInfo.getAttributeValue("optionname"), MboConstants.NOACCESSCHECK);
        ctrlGroup.setValue("APP", ctrlGroupInfo.getAttributeValue("app"), MboConstants.NOACCESSCHECK);

        // This normally relies on being part of a set that is attached to the application.
        // Since we are confident that the values being added are correct, allow no-validation.
        ctrlGroup.setValue("GROUPSEQ", ctrlGroupInfo.getAttributeValue("groupseq"), MboConstants.NOVALIDATION);

        var ctrlConditionSet = ctrlGroup.getMboSet("CTRLCONDITION");
        var controlConditions = ctrlGroupInfo.getChildren("ctrlcondition");
        if (controlConditions) {
            controlConditions.forEach(function (controlConditionInfo) {
                ctrlCondition = ctrlConditionSet.add();
                ctrlCondition.setValue("CONDITIONNUM", controlConditionInfo.getAttributeValue("conditionnum"));
                ctrlCondition.setValue("CONDITIONSEQ", controlConditionInfo.getAttributeValue("conditionseq"));
                ctrlCondition.setValue("REEVALUATE", controlConditionInfo.getAttributeValue("reevaluate"));

                var controlCondProps = controlConditionInfo.getChildren("ctrlcondprop");

                if (controlCondProps) {
                    var ctrlCondPropSet = ctrlCondition.getMboSet("CTRLCONDPROP");
                    controlCondProps.forEach(function (controlCondPropInfo) {
                        var ctrlCondProp = ctrlCondPropSet.add();
                        ctrlCondProp.setValue("CONDITIONRESULT", controlCondPropInfo.getAttributeValue("conditionresult"));
                        ctrlCondProp.setValue("PROPERTY", controlCondPropInfo.getAttributeValue("property"));
                        ctrlCondProp.setValue("PROPERTYVALUE", controlCondPropInfo.getAttributeValue("propertyvalue"));
                    });
                }
            });
        }

        ctrlGroupSet.save();
    } catch (error) {
        logger.error(error);
    } finally {
        _close(ctrlGroupSet);
    }
}

function createOrUpdateCondition(conditionInfo) {
    if (conditionInfo) {
        var conditionSet;
        try {
            conditionSet = MXServer.getMXServer().getMboSet("CONDITION", userInfo);
            var sqlf = new SqlFormat("conditionnum = :1");
            sqlf.setObject(1, "CONDITION", "CONDITIONNUM", conditionInfo.getAttributeValue("conditionnum"));
            conditionSet.setWhere(sqlf.format());

            var condition;

            if (conditionSet.isEmpty()) {
                condition = conditionSet.add();
                condition.setValue("CONDITIONNUM", conditionInfo.getAttributeValue("conditionnum"));
            } else {
                condition = conditionSet.moveFirst();
            }
            condition.setValue("DESCRIPTION", conditionInfo.getAttributeValue("description"));
            condition.setValue("TYPE", conditionInfo.getAttributeValue("type"));
            condition.setValue("EXPRESSION", conditionInfo.getAttributeValue("expression"));
            condition.setValue("CLASSNAME", conditionInfo.getAttributeValue("classname"), MboConstants.NOACCESSCHECK);
            condition.setValue("NOCACHING", conditionInfo.getAttributeValue("nocaching"));

            conditionSet.save();
        } catch (error) {
            logger.error(error);
        } finally {
            _close(conditionSet);
        }
    }
}

function createOrUpdateSigOption(sigOptionInfo) {
    logger.info("["+scriptName+"]"+ "createOrUpdateSigOption")
    if (sigOptionInfo) {
        var sigOptionSet;
        try {
            sigOptionSet = MXServer.getMXServer().getMboSet("SIGOPTION", userInfo);
            var sqlf = new SqlFormat("optionname = :1 and app = :2");
            sqlf.setObject(1, "SIGOPTION", "OPTIONNAME", sigOptionInfo.getAttributeValue("optionname"));
            sqlf.setObject(2, "SIGOPTION", "APP", sigOptionInfo.getAttributeValue("app"));

            var sqlWhere = sqlf.format()
            sigOptionSet.setWhere(sqlWhere);
            sigOptionSet.reset()
            logger.info("[" + scriptName + "]" + " createOrUpdateSigOption.sql=" + sqlWhere)
            var sigOption;
            var sigOptFlag;
            var sigOptFlagSet;
            if (sigOptionSet.isEmpty()) {
                sigOption = sigOptionSet.add();
                sigOption.setValue("APP", sigOptionInfo.getAttributeValue("app"));
                sigOption.setValue("OPTIONNAME", sigOptionInfo.getAttributeValue("optionname"));
                sigOption.setValue("DESCRIPTION", sigOptionInfo.getAttributeValue("description"));
                sigOption.setValue("ESIGENABLED", sigOptionInfo.getAttributeValue("esigenabled"));
                sigOption.setValue("VISIBLE", sigOptionInfo.getAttributeValue("visible"));
                sigOption.setValue("ALSOGRANTS", sigOptionInfo.getAttributeValue("alsogrants"));
                sigOption.setValue("ALSOREVOKES", sigOptionInfo.getAttributeValue("alsorevokes"));
                sigOption.setValue("PREREQUISITE", sigOptionInfo.getAttributeValue("prerequisite"));
                sigOption.setValue("LANGCODE", sigOptionInfo.getAttributeValue("langcode"));

                sigoptFlagInfo = sigOptionInfo.getChild("sigoptflag");
                if (sigoptFlagInfo) {
                    sigOptFlag = sigOption.getMboSet("SIGOPTFLAG").add();
                    sigOptFlag.setValue("APP", sigoptFlagInfo.getAttributeValue("app"));
                    sigOptFlag.setValue("OPTIONNAME", sigoptFlagInfo.getAttributeValue("optionname"));
                    sigOptFlag.setValue("FLAGNAME", sigoptFlagInfo.getAttributeValue("flagname"));
                    sigOptFlag.setValue("VALUE", sigoptFlagInfo.getAttributeValue("value"));
                }
                sigOptionSet.save();
            } else {
                sigOption = sigOptionSet.moveFirst();
                sigOption.setValue("DESCRIPTION", sigOptionInfo.getAttributeValue("description"));
                sigOption.setValue("ESIGENABLED", sigOptionInfo.getAttributeValue("esigenabled"));
                sigOption.setValue("VISIBLE", sigOptionInfo.getAttributeValue("visible"));
                sigOption.setValue("ALSOGRANTS", sigOptionInfo.getAttributeValue("alsogrants"));
                sigOption.setValue("ALSOREVOKES", sigOptionInfo.getAttributeValue("alsorevokes"));
                sigOption.setValue("PREREQUISITE", sigOptionInfo.getAttributeValue("prerequisite"));

                sigoptFlagInfo = sigOptionInfo.getChild("sigoptflag");
                if (sigoptFlagInfo) {
                    sigOptFlagSet = sigOption.getMboSet("SIGOPTFLAG");
                    if (!sigOptFlagSet.isEmpty()) {
                        sigOptFlag = sigOptFlagSet.moveFirst();
                        sigOptFlag.setValue("FLAGNAME", sigoptFlagInfo.getAttributeValue("flagname"));
                        sigOptFlag.setValue("VALUE", sigoptFlagInfo.getAttributeValue("value"));
                    } else {
                        sigOptFlag = sigOption.getMboSet("SIGOPTFLAG").add();
                        sigOptFlag.setValue("APP", sigoptFlagInfo.getAttributeValue("app"));
                        sigOptFlag.setValue("OPTIONNAME", sigoptFlagInfo.getAttributeValue("optionname"));
                        sigOptFlag.setValue("FLAGNAME", sigoptFlagInfo.getAttributeValue("flagname"));
                        sigOptFlag.setValue("VALUE", sigoptFlagInfo.getAttributeValue("value"));
                    }
                } else {
                    sigOptFlagSet = sigOption.getMboSet("SIGOPTFLAG");
                    if (!sigOptFlagSet.isEmpty()) {
                        sigOptFlagSet.deleteAll();
                    }
                }
                sigOptionSet.save();
            }
        } catch (error) {
            logger.error(error);
        } finally {
            _close(sigOptionSet);
        }
    }
}

function createGroupIfNotExists(groupInfo) {
    if (groupInfo) {
        var groupSet;
        try {
            groupSet = MXServer.getMXServer().getMboSet("MAXGROUP", userInfo);
            var sqlf = new SqlFormat("groupname = :1");
            sqlf.setObject(1, "MAXGROUP", "GROUPNAME", groupInfo.getAttributeValue("groupname"));

            groupSet.setWhere(sqlf.format());
            if (groupSet.isEmpty()) {
                var group = groupSet.add();
                group.setValue("GROUPNAME", groupInfo.getAttributeValue("groupname"));
                group.setValue("DESCRIPTION", groupInfo.getAttributeValue("description"));
                group.setValue("PASSWORDDURATION", groupInfo.getAttributeValue("passwordduration"));
                group.setValue("PASSWORDWARNING", groupInfo.getAttributeValue("passwordwarning"));
                group.setValue("INDEPENDENT", groupInfo.getAttributeValue("independent"));
                group.setValue("AUTHALLSITES", groupInfo.getAttributeValue("authallsites"));
                group.setValue("AUTHALLGLS", groupInfo.getAttributeValue("authallgls"));
                group.setValue("AUTHALLSTOREROOMS", groupInfo.getAttributeValue("authallstorerooms"));
                group.setValue("AUTHLABORALL", groupInfo.getAttributeValue("authlaborall"));
                group.setValue("AUTHLABORCREW", groupInfo.getAttributeValue("authlaborcrew"));
                group.setValue("AUTHLABORSELF", groupInfo.getAttributeValue("authlaborself"));
                group.setValue("AUTHLABORSUPER", groupInfo.getAttributeValue("authlaborsuper"));
                group.setValue("LANGCODE", groupInfo.getAttributeValue("langcode"));
                group.setValue(
                    "SCTEMPLATEID",
                    scTemplateExists(groupInfo.getAttributeValue("sctemplateid")) ? groupInfo.getAttributeValue("sctemplateid") : ""
                );
                group.setValue("AUTHPERSONGROUP", groupInfo.getAttributeValue("authpersongroup"));
                group.setValue("NULLREPFAC", groupInfo.getAttributeValue("nullrepfac"));
                group.setValue("AUTHALLREPFACS", groupInfo.getAttributeValue("authallrepfacs"));
                group.setValue("MAXSCHEDREPORT", groupInfo.getAttributeValue("maxschedreport"));
                group.setValue("DFLTAPP", groupInfo.getAttributeValue("dfltapp"));
                group.setValue("ADHOCCREATELIMIT", groupInfo.getAttributeValue("adhoccreatelimit"));
                group.setValue("REPORTSTOPLIMIT", groupInfo.getAttributeValue("reportstoplimit"));
                group.setValue("SIDENAV", groupInfo.getAttributeValue("sidenav"));
                group.setValue("WORKCENTER", groupInfo.getAttributeValue("workcenter"));

                groupSet.save();
            }
        } catch (error) {
            logger.error(error);
        } finally {
            _close(groupSet);
        }
    }
}

function scTemplateExists(templateId) {
    if (templateId && templateId != "") {
        var sctemplateSet;
        try {
            sctemplateSet = MXServer.getMXServer().getMboSet("SCTEMPLATE", userInfo);
            var sqlf = new SqlFormat("groupname = :1");
            sqlf.setObject(1, "SCTEMPLATE", "SCTEMPLATEID", templateId);
            sctemplateSet.setWhere(sqlf.format());

            return !sctemplateSet.exists();
        } catch (error) {
            logger.error(error);
        } finally {
            _close(sctemplateSet);
        }
    }
}

function extractScreen(screenName) {
    var maxpresentationSet;
    try {
        maxpresentationSet = MXServer.getMXServer().getMboSet("MAXPRESENTATION", userInfo);
        var sqlf = new SqlFormat("app = :1");
        sqlf.setObject(1, "MAXPRESENTATION", "APP", screenName);

        maxpresentationSet.setWhere(sqlf.format());

        if (!maxpresentationSet.isEmpty()) {
            var maxpresentation = maxpresentationSet.moveFirst();
            return addConditionalExpressionsMetaData(maxpresentation.getString("PRESENTATION"), screenName);
        } else {
            throw new ScreenError("screen_not_found", "The screen definition for " + screenName + " was not found.");
        }
    } catch (error) {
    } finally {
        _close(maxpresentationSet);
    }
}

function addConditionalExpressionsMetaData(xml, screenName) {
    var screen = new SAXBuilder().build(new StringReader(xml));

    var controlGroupSet;

    try {
        controlGroupSet = MXServer.getMXServer().getMboSet("CTRLGROUP", userInfo);
        var sqlf = new SqlFormat("app = :1");
        sqlf.setObject(1, "CTRLGROUP", "APP", screenName);

        controlGroupSet.setWhere(sqlf.format());

        if (!controlGroupSet.isEmpty()) {
            controlGroup = controlGroupSet.moveFirst();
            var presentation = screen.getRootElement();
            var metadata = new Element("metadata");
            while (controlGroup) {
                metadata.addContent(getControlGroup(controlGroup));
                controlGroup = controlGroupSet.moveNext();
            }
            presentation.addContent(0, metadata);
            var writer = new StringWriter();
            var outputter = new XMLOutputter(Format.getPrettyFormat());
            outputter.output(screen, writer);

            return writer.toString();
        } else {
            return xml;
        }
    } catch (error) {
        logger.error(error);
    } finally {
        _close(controlGroupSet);
    }
}

function getControlGroup(controlGroup) {
    var ctrlgroup = new Element("ctrlgroup");
    ctrlgroup.setAttribute("groupname", controlGroup.getString("GROUPNAME"));
    ctrlgroup.setAttribute("optionname", controlGroup.getString("OPTIONNAME"));
    ctrlgroup.setAttribute("app", controlGroup.getString("APP"));
    ctrlgroup.setAttribute("groupseq", controlGroup.getString("GROUPSEQ"));

    var sigoption = new Element("sigoption");
    sigoption.setAttribute("optionname", controlGroup.getString("SIGOPTION.OPTIONNAME"));
    sigoption.setAttribute("app", controlGroup.getString("SIGOPTION.APP"));
    sigoption.setAttribute("description", controlGroup.getString("SIGOPTION.DESCRIPTION"));
    sigoption.setAttribute("esigenabled", controlGroup.getString("SIGOPTION.ESIGENABLED"));
    sigoption.setAttribute("visible", controlGroup.getString("SIGOPTION.VISIBLE"));
    sigoption.setAttribute("alsogrants", controlGroup.getString("SIGOPTION.ALSOGRANTS"));
    sigoption.setAttribute("alsorevokes", controlGroup.getString("SIGOPTION.ALSOREVOKES"));
    sigoption.setAttribute("prerequisite", controlGroup.getString("SIGOPTION.PREREQUISITE"));
    sigoption.setAttribute("langcode", controlGroup.getString("SIGOPTION.LANGCODE"));

    if (!controlGroup.isNull("SIGOPTION.SIGOPTFLAG.OPTIONNAME")) {
        var sigoptFlag = new Element("sigoptflag");
        sigoptFlag.setAttribute("optionname", controlGroup.getString("SIGOPTION.SIGOPTFLAG.OPTIONNAME"));
        sigoptFlag.setAttribute("app", controlGroup.getString("SIGOPTION.SIGOPTFLAG.APP"));
        sigoptFlag.setAttribute("flagname", controlGroup.getString("SIGOPTION.SIGOPTFLAG.FLAGNAME"));
        sigoptFlag.setAttribute("value", controlGroup.getString("SIGOPTION.SIGOPTFLAG.VALUE"));

        sigoption.addContent(sigoptFlag);
    }
    ctrlgroup.addContent(sigoption);

    var group = new Element("group");
    group.setAttribute("groupname", controlGroup.getString("MAXGROUP.GROUPNAME"));
    group.setAttribute("description", controlGroup.getString("MAXGROUP.DESCRIPTION"));
    group.setAttribute("passwordduration", controlGroup.getString("MAXGROUP.PASSWORDDURATION"));
    group.setAttribute("passwordwarning", controlGroup.getString("MAXGROUP.PASSWORDWARNING"));
    group.setAttribute("independent", controlGroup.getString("MAXGROUP.INDEPENDENT"));
    group.setAttribute("authallsites", controlGroup.getString("MAXGROUP.AUTHALLSITES"));
    group.setAttribute("authallgls", controlGroup.getString("MAXGROUP.AUTHALLGLS"));
    group.setAttribute("authallstorerooms", controlGroup.getString("MAXGROUP.AUTHALLSTOREROOMS"));
    group.setAttribute("authlaborall", controlGroup.getString("MAXGROUP.AUTHLABORALL"));
    group.setAttribute("authlaborcrew", controlGroup.getString("MAXGROUP.AUTHLABORCREW"));
    group.setAttribute("authlaborself", controlGroup.getString("MAXGROUP.AUTHLABORSELF"));
    group.setAttribute("authlaborsuper", controlGroup.getString("MAXGROUP.AUTHLABORSUPER"));
    group.setAttribute("langcode", controlGroup.getString("MAXGROUP.LANGCODE"));
    group.setAttribute("sctemplateid", controlGroup.getString("MAXGROUP.SCTEMPLATEID"));
    group.setAttribute("authpersongroup", controlGroup.getString("MAXGROUP.AUTHPERSONGROUP"));
    group.setAttribute("nullrepfac", controlGroup.getString("MAXGROUP.NULLREPFAC"));
    group.setAttribute("authallrepfacs", controlGroup.getString("MAXGROUP.AUTHALLREPFACS"));
    group.setAttribute("maxschedreport", controlGroup.getString("MAXGROUP.MAXSCHEDREPORT"));
    group.setAttribute("dfltapp", controlGroup.getString("MAXGROUP.DFLTAPP"));
    group.setAttribute("adhoccreatelimit", controlGroup.getString("MAXGROUP.ADHOCCREATELIMIT"));
    group.setAttribute("reportstoplimit", controlGroup.getString("MAXGROUP.REPORTSTOPLIMIT"));
    group.setAttribute("sidenav", controlGroup.getString("MAXGROUP.SIDENAV"));
    group.setAttribute("workcenter", controlGroup.getString("MAXGROUP.WORKCENTER"));

    ctrlgroup.addContent(group);

    controlConditionSet = controlGroup.getMboSet("CTRLCONDITION");
    if (!controlConditionSet.isEmpty()) {
        controlCondition = controlConditionSet.moveFirst();

        while (controlCondition) {
            var ctrlcondition = new Element("ctrlcondition");
            ctrlcondition.setAttribute("conditionnum", controlCondition.getString("CONDITIONNUM"));
            ctrlcondition.setAttribute("conditionseq", controlCondition.getString("CONDITIONSEQ"));
            ctrlcondition.setAttribute("reevaluate", controlCondition.getString("REEVALUATE"));

            var condition = new Element("condition");
            condition.setAttribute("conditionnum", controlCondition.getString("CONDITIONNUM"));
            condition.setAttribute("type", controlCondition.getString("CONDITION.TYPE"));
            condition.setAttribute("expression", controlCondition.getString("CONDITION.EXPRESSION"));
            condition.setAttribute("classname", controlCondition.getString("CONDITION.CLASSNAME"));
            condition.setAttribute("description", controlCondition.getString("CONDITION.DESCRIPTION"));
            condition.setAttribute("nocaching", controlCondition.getString("CONDITION.NOCACHING"));

            ctrlcondition.addContent(condition);

            controlCondPropSet = controlCondition.getMboSet("CTRLCONDPROP");
            if (!controlCondPropSet.isEmpty()) {
                var controlCondProp = controlCondPropSet.moveFirst();

                while (controlCondProp) {
                    var ctrlcondprop = new Element("ctrlcondprop");
                    ctrlcondprop.setAttribute("property", controlCondProp.getString("PROPERTY"));
                    ctrlcondprop.setAttribute("propertyvalue", controlCondProp.getString("PROPERTYVALUE"));
                    ctrlcondprop.setAttribute("conditionresult", controlCondProp.getString("CONDITIONRESULT"));

                    ctrlcondition.addContent(ctrlcondprop);

                    controlCondProp = controlCondPropSet.moveNext();
                }
            }
            ctrlgroup.addContent(ctrlcondition);
            controlCondition = controlConditionSet.moveNext();
        }
    }

    return ctrlgroup;
}

function getRequestScreentName() {
    var httpRequest = request.getHttpServletRequest();

    var requestURI = httpRequest.getRequestURI();
    var contextPath = httpRequest.getContextPath();
    var resourceReq = requestURI;

    if (contextPath && contextPath !== "") {
        resourceReq = requestURI.substring(contextPath.length());
    }

    if (!resourceReq.startsWith("/")) {
        resourceReq = "/" + resourceReq;
    }

    var isOSLC = true;

    if (!resourceReq.toLowerCase().startsWith("/oslc/script/" + service.scriptName.toLowerCase())) {
        if (!resourceReq.toLowerCase().startsWith("/api/script/" + service.scriptName.toLowerCase())) {
            return null;
        } else {
            osOSLC = false;
        }
    }

    var baseReqPath = isOSLC ? "/oslc/script/" + service.scriptName : "/api/script/" + service.scriptName;

    var action = resourceReq.substring(baseReqPath.length);

    if (action.startsWith("/")) {
        action = action.substring(1);
    }

    if (!action || action.trim() === "") {
        return null;
    }

    return URLDecoder.decode(action.toLowerCase(), StandardCharsets.UTF_8.name());
}

function checkPermissions(app, optionName) {
    if (!userInfo) {
        throw new ScreenError("no_user_info", "The userInfo global variable has not been set, therefore the user permissions cannot be verified.");
    }

    if (!MXServer.getMXServer().lookup("SECURITY").getProfile(userInfo).hasAppOption(app, optionName) && !isInAdminGroup()) {
        throw new ScreenError(
            "no_permission",
            "The user " + userInfo.getUserName() + " does not have access to the " + optionName + " option in the " + app + " object structure."
        );
    }
}

// Determines if the current user is in the administrator group, returns true if the user is, false otherwise.
function isInAdminGroup() {
    var user = userInfo.getUserName();
    service.log_info("Determining if the user " + user + " is in the administrator group.");
    var groupUserSet;

    try {
        groupUserSet = MXServer.getMXServer().getMboSet("GROUPUSER", MXServer.getMXServer().getSystemUserInfo());

        // Get the ADMINGROUP MAXVAR value.
        var adminGroup = MXServer.getMXServer().lookup("MAXVARS").getString("ADMINGROUP", null);

        // Query for the current user and the found admin group.
        // The current user is determined by the implicity `user` variable.
        sqlFormat = new SqlFormat("userid = :1 and groupname = :2");
        sqlFormat.setObject(1, "GROUPUSER", "USERID", user);
        sqlFormat.setObject(2, "GROUPUSER", "GROUPNAME", adminGroup);
        groupUserSet.setWhere(sqlFormat.format());

        if (!groupUserSet.isEmpty()) {
            service.log_info("The user " + user + " is in the administrator group " + adminGroup + ".");
            return true;
        } else {
            service.log_info("The user " + user + " is not in the administrator group " + adminGroup + ".");
            return false;
        }
    } catch (error) {
        logger.error(error);
    } finally {
        _close(groupUserSet);
    }
}

// Cleans up the MboSet connections and closes the set.
function _close(set) {
    if (set) {
        try {
            set.cleanup();
            set.close();
        } catch (ignore) {}
    }
}

function ScreenError(reason, message) {
    Error.call(this, message);
    this.reason = reason;
    this.message = message;
}

// ConfigurationError derives from Error
ScreenError.prototype = Object.create(Error.prototype);
ScreenError.prototype.constructor = ScreenError;
ScreenError.prototype.element;

// eslint-disable-next-line no-unused-vars
var scriptConfig = {
    autoscript: "SHARPTREE.AUTOSCRIPT.SCREENS",
    description: "Extract screen definitions.",
    version: "1.0.0",
    active: true,
    logLevel: "ERROR"
};