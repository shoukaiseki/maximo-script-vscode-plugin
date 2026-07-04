// @ts-check
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />
// commonsUtils=service.invokeScript("SKS_COMMONS_UTILS");
// load('nashorn:mozilla_compat.js');

/**
 * Maximo配置 -> 补全设置 勾选"自动生成反射API"

 * 用于测试生成 javaapi目录下的ts文件,用于vscode自带的补全
 * 
 * 打开之后,修改这个文件就可以慢慢生成 javaapi目录下的ts文件
 * 修改之后都会触发 */

/** @type {psdi.mbo.MboRemote} */
MboRemote = Java.type("psdi.mbo.MboRemote");//1

/** @type {psdi.mbo.Mbo} */
Mbo = Java.type("psdi.mbo.Mbo");//2

/** @type {psdi.mbo.MboSet} */
MboSet = Java.type("psdi.mbo.MboSet");//3

/** @type {com.ibm.tivoli.maximo.script.ScriptService} */
ScriptService = Java.type("com.ibm.tivoli.maximo.script.ScriptService");//4

/** @type {psdi.security.UserInfo} */
UserInfo = Java.type("psdi.security.UserInfo");//5

/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");//6

/** @type {psdi.util.logging.MXLogger} */
MXLogger = Java.type("psdi.util.logging.MXLogger");//7

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");//9

/** @type {java.math.BigDecimal} */
BigDecimal = Java.type("java.math.BigDecimal");//10

/** @type {java.util.List} */
List = Java.type("java.util.List");//11

/** @type {psdi.mbo.MboSetRemote} */
MboSetRemote = Java.type("psdi.mbo.MboSetRemote");//12

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");//13

/** @type {psdi.workflow.WorkFlowService} */
WorkFlowService = Java.type("psdi.workflow.WorkFlowService");//14

/** @type {psdi.app.workorder.WORemote} */
WORemote = Java.type("psdi.app.workorder.WORemote");//15

/** @type {psdi.app.workorder.WOSetRemote} */
WOSetRemote = Java.type("psdi.app.workorder.WOSetRemote");//16

/** @type {com.ibm.json.java.JSONArray} */
JSONArray = Java.type("com.ibm.json.java.JSONArray");//17

/** @type {com.ibm.json.java.JSONArtifact} */
JSONArtifact = Java.type("com.ibm.json.java.JSONArtifact");//18

//JSONObject对key排序---没用
/** @type {java.util.LinkedHashMap} */
LinkedHashMap = Java.type("java.util.LinkedHashMap");

//如果需要JSONObject对key排序,可以使用OrderedJSONObject
/** @type {com.ibm.json.java.OrderedJSONObject} */
OrderedJSONObject = Java.type("com.ibm.json.java.OrderedJSONObject");

/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");//19

/** @type {com.ibm.tivoli.maximo.oslc.OslcUtils} */
OslcUtils = Java.type("com.ibm.tivoli.maximo.oslc.OslcUtils");//20

/** @type {java.lang.String} */
String = Java.type("java.lang.String");//21

/** @type {java.lang.Object} */
Object = Java.type("java.lang.Object");//22

/** @type {psdi.security.UserLoginDetails} */
UserLoginDetails = Java.type("psdi.security.UserLoginDetails");//23

/** @type {psdi.common.context.UIContext} */
UIContext = Java.type("psdi.common.context.UIContext");//24

/** @type {com.ibm.tivoli.maximo.oslc.provider.OslcRequest} */
OslcRequest = Java.type("com.ibm.tivoli.maximo.oslc.provider.OslcRequest");//25


/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");//26

/** @type {javax.servlet.http.HttpServletRequest} */
HttpServletRequest = Java.type("javax.servlet.http.HttpServletRequest");//27

/** @type {javax.servlet.http.HttpServletResponse} */
HttpServletResponse = Java.type("javax.servlet.http.HttpServletResponse");//28

/** @type {java.text.SimpleDateFormat} */
SimpleDateFormat = Java.type("java.text.SimpleDateFormat");//29

/** @type {psdi.server.MXServer} */
MXServerPackages = Java.type("psdi.server.MXServer");//30

/** @type {java.time.ZonedDateTime} */
ZonedDateTime = Java.type("java.time.ZonedDateTime");//31

/** @type {java.time.format.DateTimeFormatter} */
DateTimeFormatter = Java.type("java.time.format.DateTimeFormatter");//32

/** @type {java.util.HashMap} */
HashMap = Java.type("java.util.HashMap");//33

/** @type {java.util.TimeZone} */
TimeZone = Java.type("java.util.TimeZone");//34

/** @type {java.io.IOException} */
IOException = Java.type("java.io.IOException");//35

/** @type {java.io.InputStream} */
InputStream = Java.type("java.io.InputStream");//36

/** @type {java.rmi.RemoteException} */
RemoteException = Java.type("java.rmi.RemoteException");//37

/** @type {java.util.Iterator} */
Iterator = Java.type("java.util.Iterator");//38

/** @type {java.util.Map} */
Map = Java.type("java.util.Map");//39

/** @type {java.util.Map$Entry} */
Entry = Java.type("java.util.Map$Entry");//40

/** @type {java.util.Properties} */
Properties = Java.type("java.util.Properties");//41

/** @type {java.util.Set} */
Set = Java.type("java.util.Set");//42

/** @type {java.io.File} */
File = Java.type("java.io.File");//43

/** @type {java.io.FileInputStream} */
FileInputStream = Java.type("java.io.FileInputStream");//44

/** @type {java.io.OutputStream} */
OutputStream = Java.type("java.io.OutputStream");//45

/** @type {java.util.Base64} */
Base64 = Java.type("java.util.Base64"); //46

/** @type {java.util.Base64.Encoder} */
Base64Encoder = Java.type("java.util.Base64$Encoder");//47

/** @type {java.util.Base64.Decoder} */
Base64Decoder = Java.type("java.util.Base64$Decoder");//48

/** @type {com.ibm.tivoli.maximo.messagehub.MessageHubTXCleanup} */
MessageHubTXCleanup = Java.type("com.ibm.tivoli.maximo.messagehub.MessageHubTXCleanup");//49

/** @type {psdi.webclient.system.controller.PresentationLoader} */
PresentationLoader = Java.type("psdi.webclient.system.controller.PresentationLoader");//50

/** @type {psdi.webclient.system.controller.IdProperty} */
IdProperty = Java.type("psdi.webclient.system.controller.IdProperty");//51

/** @type {java.util.Map} */
Map = Java.type("java.util.Map");//52

/** @type {psdi.webclient.system.runtime.WebClientRuntime} */
WebClientRuntime = Java.type("psdi.webclient.system.runtime.WebClientRuntime");//53

/** @type {psdi.webclient.system.session.WebClientSession} */
WebClientSession = Java.type("psdi.webclient.system.session.WebClientSession");//54

/** @type {psdi.webclient.system.websession.AppServerWebAppSession} */
AppServerWebAppSession = Java.type("psdi.webclient.system.websession.AppServerWebAppSession");//55

/** @type {psdi.webclient.system.websession.BlueIDOIDCWebAppSessionFactory} */
BlueIDOIDCWebAppSessionFactory = Java.type("psdi.webclient.system.websession.BlueIDOIDCWebAppSessionFactory");//56

/** @type {psdi.webclient.system.websession.BueIDOIDCWebAppSession} */
BlueIDOIDCWebAppSession = Java.type("psdi.webclient.system.websession.BueIDOIDCWebAppSession");//57


/** @type {psdi.webclient.system.controller.LabelCacheMgr} */
LabelCacheMgr = Java.type("psdi.webclient.system.controller.LabelCacheMgr");//58

/** @type {java.lang.System} */
System = Java.type("java.lang.System");//59


/** @type {com.ibm.tivoli.maximo.rest.MOSJSONStructure} */
MOSJSONStructure = Java.type("com.ibm.tivoli.maximo.rest.MOSJSONStructure");//60

/** @type {psdi.iface.mos.ObjectStructureCache} */
ObjectStructureCache = Java.type("psdi.iface.mos.ObjectStructureCache");//61

/** @type {psdi.iface.mos.MosDetailInfo} */
MosDetailInfo = Java.type("psdi.iface.mos.MosDetailInfo");//62



/** @type {com.ibm.json.java.OrderedJSONObject} */
OrderedJSONObject = Java.type("com.ibm.json.java.OrderedJSONObject");//63

/** @type {psdi.webclient.system.beans.DataBeanContext} */
DataBeanContext = Java.type("psdi.webclient.system.beans.DataBeanContext")//64

/** @type {psdi.webclient.system.controller.WebClientEvent} */
WebClientEvent = Java.type("psdi.webclient.system.controller.WebClientEvent");//65

/** @type {psdi.webclient.system.controller.AppInstance} */
AppInstance = Java.type("psdi.webclient.system.controller.AppInstance");//66

/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");//67

/** @type {java.util.Date} */
Date = Java.type("java.util.Date");//68

/** @type {com.ibm.tivoli.maximo.script.ScriptUtil} */
ScriptUtil = Java.type("com.ibm.tivoli.maximo.script.ScriptUtil");//69

/** @type {psdi.util.MXMath} */
MXMath = Java.type("psdi.util.MXMath");//70
