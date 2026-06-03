// javaapi/global.d.ts

/**
 * Maximo HTTP 启动点隐式变量声明
 */

/** HTTP 请求对象 */
declare var request: com.ibm.tivoli.maximo.oslc.provider.OslcRequest;

/** HTTP 请求体字符串 */
declare var requestBody: string;

/** HTTP 响应体字符串（用于设置返回值） */
declare var responseBody: string;

/** HTTP 方法 (GET, POST, PUT, DELETE) */
declare var httpMethod: string;

/**
 * Maximo OBJECT 启动点隐式变量声明
 */

/** 当前 MBO 对象 */
declare var mbo: psdi.mbo.MboRemote;

/** 是否在添加操作中 */
declare var onadd: boolean;

/** 是否在更新操作中 */
declare var onupdate: boolean;

/** 是否在删除操作中 */
declare var ondelete: boolean;

/** 用户信息 */
declare var userInfo: psdi.security.UserInfo;

/** 服务对象 */
declare var service: com.ibm.tivoli.maximo.script.ScriptService;

/**
 * Maximo ATTRIBUTE 启动点隐式变量声明
 */

/** 属性的新值 */
declare var value: any;

/** 属性的旧值 */
declare var oldValue: any;

var mbovalue: psdi.mbo.MboValue;

//不推荐使用,子表获取会为null
//推荐使用以下方式获取
// var appName = service.invokeScript("COMMON.UTILS", "getAppNameByMbo", [mbo]);
var app: string

/** MBO 属性名称 */
var mboattr: string

/** 脚本名称 */
var scriptName: string

/** 启动点名称 */
var launchPoint: string

/** MBO 名称 */
var mboname: string


/**
 * Nashorn Java 互操作
 */
interface Java {
    type(className: string): any;
}

declare var Java: Java;