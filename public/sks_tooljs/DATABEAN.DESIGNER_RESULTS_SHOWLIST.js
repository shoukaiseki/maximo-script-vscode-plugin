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
var scriptName="DATABEAN_DESIGNER_RESULTS_SHOWLIST"//service.getScriptName()
/** RemoveProfileCache.getName() —— "丢掉用户 Profile 缓存"用的 Maximo 缓存名(见 psdi.security.RemoveProfileCache) */
var PROFILE_CACHE_NAME="RMVPROF"
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
loggerMX.info("["+scriptName+"]------------------load------------------");

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
/** @type {com.ibm.json.java.JSONArray} */
JSONArray = Java.type("com.ibm.json.java.JSONArray");
/** @type {com.ibm.json.java.JSONObject} */
JSONObject = Java.type("com.ibm.json.java.JSONObject");


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
    logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true ,printModel:true})
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

    /** @type {psdi.webclient.system.controller.AppInstance} */
    var appInstance = dbctx.getAppInstance();
    /** @type {psdi.webclient.system.beans.DataBean} */
    var appBean = appInstance.getAppBean();
    /** @type {psdi.mbo.MboRemote} */
    var mbo = appBean.getMbo();
    // appBean.setQbe("APPLYNUM", "1003");
    // appBean.reset()
    logger.info("[" + scriptName + "] initializeApp")
}



/**
 * 刷新应用缓存
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function refreshmaxapp(dbctx){
    initLogger(dbctx);
    logger.debug("[" + scriptName + "] reloadcache")
    logger.info("[" + scriptName + "] reloadcache")
    logger.warn("[" + scriptName + "] reloadcache")
    logger.error("[" + scriptName + "] reloadcache")
    var mbo = dbctx.getMbo()
    logger.info("[" + scriptName + "] mbo= " + mbo)
    logger.info("[" + scriptName + "] dbctx.getEvent().getType()= " + dbctx.getEvent().getType())
    if(!mbo){
        var appInstance = dbctx.getAppInstance()
        logger.info("[" + scriptName + "] appInstance= " + appInstance)
        var appBean = appInstance.getAppBean()
        logger.info("[" + scriptName + "] appBean= " + appBean)
        mbo = appBean.getMbo()
        logger.info("[" + scriptName + "] mbo= " + mbo)
        var appName=mbo.getString("app")
        logger.info("[" + scriptName + "] appName= " + appName)
    }
    var name = mbo.getString("app")
    logger.info("[" + scriptName + "] reloadcache " + name)
    try {
        /** @type {psdi.webclient.system.session.WebClientSessionFactory} */
        WebClientSessionFactory = Java.type("psdi.webclient.system.session.WebClientSessionFactory");
        /** @type {psdi.webclient.system.runtime.WebClientRuntime} */
        WebClientRuntime = Java.type("psdi.webclient.system.runtime.WebClientRuntime");//53
        var wcsf = WebClientSessionFactory.getWebClientSessionFactory();
        var wcs=dbctx.getEvent().getWebClientSession()
        // var wcs = wcsf.createSession(request.getHttpServletRequest(), request.getHttpServletResponse());
        var wcr = WebClientRuntime.getWebClientRuntime();
        if (name.equalsIgnoreCase("replibrary")) {
            wcr.getLibraryDescriptor(name, wcs);
        } else {
            /** @type {psdi.webclient.system.controller.LabelCacheMgr} */
            LabelCacheMgr = Java.type("psdi.webclient.system.controller.LabelCacheMgr");//58
            System = Java.type("java.lang.System")
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
        logger.error("\x1b[35;40m[" + scriptName + "] refreshApp end\x1b[0m")
    } catch (e) {
        logger.warn(e)
        logger.warn("[" + scriptName + "] refreshApp error,正常现象", e)
    }

}

/**刷新所有应用权限
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function refreshallauth(dbctx){
    initLogger(dbctx);
    var userInfo = dbctx.getUserInfo()
    var securityService = MXServer.getMXServer().lookup("SECURITY");
    // 获取 Profile
    var profile = securityService.getProfile(userInfo);
    profile.dumpAppAuth();//刷新所有应用权限
    var clientsession = dbctx.webclientsession();
    clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "----应用权限已刷新OK----" , 1);
}

/**
 * 刷新应用权限(安全组授权后不用重新登录即时生效)
 *
 * 实现依据(psdi.security.Profile / psdi.security.SecurityService 源码):
 *  1. 定向刷新(轻量):
 *     Profile.addApp(app,userInfo) = constructAppAuthOneApp(app,null,null,null) + refreshSecurityCache(userInfo),
 *     重建该应用的 apps/appOptions(APPLICATIONAUTH 是实时查库,不是缓存),
 *     MAXAPPS 保存后 MaxAppsSet.fireEventsAfterDBCommit() 用的就是这个方法;
 *     Profile.updateAppMaps(app,userInfo) = loadAppMaps + refreshSecurityCache,
 *     重载该应用的 menuMaps/toolMaps/queryMaps/searchMaps/appInfo,
 *     MAXMENU 保存后 MaxMenuSet.fireEventsAfterDBCommit() 用的就是这个方法。
 *     注意 loadAppMaps 内部走 SignatureService.getUserAuthForApp(),依赖 profile.getAppOptions(app),
 *     所以必须先 addApp 再 updateAppMaps,顺序反了会把该应用的菜单/工具栏映射写成空。
 *  2. 全量重建(彻底,等价于重新登录):
 *     Profile 是按用户缓存在 SecurityService.SecurityInfo 里的,登录时由 Profile.constructProfile()
 *     调 constructAppAuthAll() 把 MAXAPPS × APPLICATIONAUTH 的授权全部读一遍;之后只会读缓存,
 *     改了"用户所属安全组"或"取消授权"时定向刷新根本不生效。
 *     所以这里丢掉该用户的 Profile 缓存(去掉缓存后下一次 getProfile() 就会重建),再取一次 Profile 逼它
 *     按最新 GROUPUSER/MAXGROUP/APPLICATIONAUTH 重建。
 *     ⚠ 必须走 SecurityService.clearProfileCache(userid):它内部是
 *       reloadMaximoCache(RemoveProfileCache.getInstance().getName(),userid,true),
 *       而 getInstance() 会触发 RemoveProfileCache 静态块里的 MXServer.addToMaximoCache("RMVPROF",...)。
 *       如果这个类在本 JVM 里从没被加载过,直接 reloadMaximoCache("RMVPROF",...) 会因为缓存名不存在
 *       只打一条 BMXAA6449I 就静默返回(Profile 根本没重建,identityHash 不变)。
 *  3. 清 WebClient 会话级缓存:userApps/moduleMap/sysOptionMap/reportsMap,并 setMenusCached(false)。
 *  4. 让浏览器整页重载:左侧导航菜单是浏览器端缓存的(menus.js 把菜单 JSON 存 localStorage:
 *     menucache_用户_语言;只有 components/menucache.jsp 在"整页渲染"时才会根据
 *     wcs.getMenusCached()==false 重新生成),只清服务端缓存不整页重载,导航栏还是旧菜单。
 *  0. 先重载 SIGNATURE 缓存:新增的签名选项(MAXSIGOPTION)、菜单(MAXMENU)、应用(MAXAPPS)、
 *     模块(MAXMODULES)都缓存在这里,Maximo 自己保存这些表时也是 reloadMaximoCache("SIGNATURE",true)
 *     (见 MaxAppsSet/MaxMenuSet/MaxModulesSet/SigOptionSet/SigOptFlagSet.fireEventsAfterDBCommit),
 *     不重载的话本 JVM 里看不到新增的签名选项。
 *
 * 注意:app 取 MAXAPPS.APP 原值,不要 toUpperCase(),应用标识就是它的原始大小写(如 replibrary 为小写),
 *      Profile.constructAppAuthOneApp() 只在 isValidApp() 为假时才转大写。
 *      只刷新"当前登录用户"的 Profile:如果是给别的用户/别的组授权,那个用户要重新登录(或另清其 Profile 缓存)。
 *      授权记录必须已保存提交,否则重建 Profile 也读不到。
 *      如果新增的签名选项是"应用XML里的按钮/字段",那是应用描述符(MAXPRESENTATION)的事,
 *      还要点同目录的"刷新应用"(refreshmaxapp)或重开应用,refreshauth 只负责权限相关缓存。
 *
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function refreshauth(dbctx){
    initLogger(dbctx);
    //是否重载 SIGNATURE 缓存(新增/修改签名选项、菜单、应用、模块后必须重载,否则本 JVM 读不到)
    var RELOAD_SIGNATURE = true;
    //刷新后是否让浏览器整页重载(菜单/导航栏是浏览器 localStorage 缓存的,重载后才会重建)
    var RELOAD_PAGE = true;
    /** @type {psdi.webclient.system.session.WebClientSession} */
    var clientsession = dbctx.webclientsession();
    if(!clientsession){
        logger.warn("[" + scriptName + "] refreshauth 取不到 WebClientSession,刷新中止");
        return;
    }
    try {
        var mbo = getAppMbo(dbctx);
        if(!mbo){
            logger.warn("[" + scriptName + "] refreshauth 取不到 MAXAPPS 记录,刷新中止");
            clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warning", "----取不到应用信息,应用权限刷新失败----", 1);
            return;
        }
        var app = mbo.getString("APP");
        var userInfo = dbctx.getUserInfo();
        var userName = userInfo.getUserName();
        logger.info("[" + scriptName + "] refreshauth app=" + app + ", user=" + userName);

        /** @type {psdi.security.SecurityService} */
        var securityService = MXServer.getMXServer().lookup("SECURITY");
        /** @type {psdi.security.Profile} */
        var profile = securityService.getProfile(userInfo);
        logAuthState("before", profile, app);

        //0.重载 SIGNATURE 缓存:签名选项/菜单/应用/模块的定义都在这个缓存里,
        //  新增签名选项(MAXSIGOPTION)后不重载,应用里和安全组的应用选项列表里都不会出现它
        if(RELOAD_SIGNATURE){
            try {
                MXServer.getMXServer().reloadMaximoCache("SIGNATURE", true);
                logger.info("[" + scriptName + "] refreshauth 已重载 SIGNATURE 缓存");
            } catch (e) {
                logger.warn("[" + scriptName + "] refreshauth 重载 SIGNATURE 缓存失败", e);
            }
        }

        //1.定向刷新:重建该应用的应用权限(apps/appOptions)与菜单/工具栏/查询/搜索/应用信息映射
        //  说明:loadAppMaps()/SignatureService.getUserAuthForApp() 都用 app.toUpperCase() 去查签名缓存,
        //       所以只有大写应用标识能刷新成功;非大写(如 MAXAPPS 里的 replibrary 等库/特殊行)调用它
        //       只会往 menuMaps 里写一个空映射,反而把原有菜单缓存清掉,直接跳过。
        try {
            profile.addApp(app, userInfo);
            if(app === app.toUpperCase()){
                profile.updateAppMaps(app, userInfo);
            } else {
                logger.info("[" + scriptName + "] refreshauth 应用标识非大写,跳过 updateAppMaps, app=" + app);
            }
            logAuthState("patched", profile, app);
        } catch (e) {
            logger.warn("[" + scriptName + "] refreshauth 定向刷新失败,继续做全量重建", e);
        }

        //2.全量重建 Profile:丢掉该用户的 Profile 缓存后立刻重新取一次,等价于"重新登录"但不真登出
        //  覆盖:新增/取消授权、改了用户所属安全组、GL/站点/库房等其它 Profile 数据变更
        var profileHashBefore = java.lang.System.identityHashCode(profile);
        dropProfileCache(securityService, userName);
        try {
            profile = securityService.getProfile(userInfo);
            logAuthState("rebuilt", profile, app);
            if(java.lang.System.identityHashCode(profile) === profileHashBefore){
                logger.warn("[" + scriptName + "] refreshauth Profile 未被重建(identityHash 未变),"
                    + "说明 Profile 缓存没被清掉;请在日志里搜 RMVPROF/BMXAA6449I 确认");
            }
        } catch (e) {
            logger.warn("[" + scriptName + "] refreshauth 全量重建 Profile 失败,保留定向刷新结果", e);
        }

        //3.清理当前会话和设计器会话(designmode)里缓存的权限与菜单
        clearSessionAuthCache(clientsession);
        //  注意:getDesignModeWebClientSession() 在会话不存在时会顺手新建一个会话,
        //       所以先用 hasDesignModeWebClientSession() 判断
        if(clientsession.hasDesignModeWebClientSession()){
            clearSessionAuthCache(clientsession.getDesignModeWebClientSession());
        }

        //3.1 诊断:对比"已授权选项"(APPLICATIONAUTH->Profile.apps)与"签名定义"(SIGNATURE 缓存里的 MAXSIGOPTION),
        //    只有定义了又授权了,应用里才会出现该选项
        logSigOptionState(app, profile);

        //4.整页重载,让浏览器重新拉一次菜单缓存(menucache.jsp)
        if(RELOAD_PAGE && reloadCurrentPage(dbctx, clientsession)){
            logger.info("[" + scriptName + "] refreshauth 已请求浏览器整页重载,app=" + app);
        } else {
            clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warning", "----应用权限已刷新OK,请按 F5 刷新页面----", 1);
        }
    } catch (e) {
        logger.error("[" + scriptName + "] refreshauth error", e);
        try {
            clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warning", "----应用权限刷新失败,请查看日志----", 1);
        } catch (ignore) { }
    }
}

/**
 * 取当前操作的应用(MAXAPPS)记录,优先级:事件行 > 上下文 mbo > 应用Bean当前记录,
 * 取第一个带非空 APP 字段的记录(MAXAPPS 记录才有 APP 字段)。
 * 说明:bean 事件是在 WebClientSession.defaultHandler() 里分发的,那里构造 DataBeanContext 时 mbo 传的是 null
 *      (new DataBeanContext(scriptName,(String)null,(Mbo)null,app,bean,event,(MboSetRemote)null)),
 *      所以必须回退到事件行 / appBean(DesignerAppBean 继承 AppBean)的 mbo。
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 * @returns {psdi.mbo.MboRemote} MAXAPPS mbo,取不到返回 null
 */
function getAppMbo(dbctx){
    var candidates = [];
    //1.事件所在的表行:tablecol 事件的 row 就是被点击的那一行,
    //  取值方式与 Maximo 自身 SystemEventHandler.WFACTION() 里 dataBean.getMbo(originalEvent.getRow()) 一致
    try {
        var event = dbctx.getEvent();
        var eventDataBean = dbctx.getDataBean();
        if(event && eventDataBean && event.getRow() >= 0){
            candidates.push(eventDataBean.getMbo(event.getRow()));
        }
    } catch (e) {
        logger.debug("[" + scriptName + "] getAppMbo event row skip: " + e);
    }
    //2.上下文 mbo 和 应用Bean(DesignerAppBean) 的当前记录(都是 MAXAPPS 记录)
    try {
        candidates.push(dbctx.getMbo());
    } catch (e) {
        logger.debug("[" + scriptName + "] getAppMbo getMbo skip: " + e);
    }
    try {
        var appInstance = dbctx.getAppInstance();
        var appBean = appInstance ? appInstance.getAppBean() : null;
        candidates.push(appBean ? appBean.getMbo() : null);
    } catch (e) {
        logger.warn("[" + scriptName + "] getAppMbo getAppBean skip", e);
    }
    for (var i = 0; i < candidates.length; i++) {
        var mbo = candidates[i];
        if(!mbo){
            continue;
        }
        try {
            //MAXAPPS 记录才有 APP 字段,取到非空值即可用
            if(mbo.getString("APP")){
                logger.debug("[" + scriptName + "] getAppMbo hit[" + i + "] " + mbo.getName() + "=" + mbo.getString("APP"));
                return mbo;
            }
        } catch (e) {
            logger.debug("[" + scriptName + "] getAppMbo candidate[" + i + "] skip: " + e);
        }
    }
    return null;
}

/**
 * 丢掉指定用户的 Profile 缓存(下一次 SecurityService.getProfile() 会按最新授权重建,等价于重新登录)
 * 三级处理:
 *  a. SecurityService.clearProfileCache(userid):正规入口,内部等于
 *     reloadMaximoCache(RemoveProfileCache.getInstance().getName(),userid,true),
 *     getInstance() 还会确保 "RMVPROF" 已注册到 MXServer.maximoCache。
 *  b. a 失败时:自己先触发一次 RemoveProfileCache.getInstance() 注册缓存,再 reloadMaximoCache("RMVPROF",...)。
 *  c. 兜底:反射直接调 SecurityService 里包可见的 removeProfile(String)(RemoveProfileCacheImpl.reload(key) 最终就是调它)。
 * @param {psdi.security.SecurityService} securityService - SECURITY 服务
 * @param {string} userName - 用户登录名(userInfo.getUserName())
 */
function dropProfileCache(securityService, userName){
    var cleared = false;
    //a.正规入口
    try {
        securityService.clearProfileCache(userName);
        cleared = true;
        logger.info("[" + scriptName + "] dropProfileCache clearProfileCache(" + userName + ") 已执行");
    } catch (e) {
        logger.warn("[" + scriptName + "] dropProfileCache clearProfileCache 失败,改直接重载 RMVPROF", e);
    }
    //b.兜底:确保缓存已注册后再重载
    if(!cleared){
        try {
            /** @type {psdi.security.RemoveProfileCache} */
            var RemoveProfileCache = Java.type("psdi.security.RemoveProfileCache");
            logger.debug("[" + scriptName + "] dropProfileCache RemoveProfileCache.getInstance()=" + RemoveProfileCache.getInstance());
            MXServer.getMXServer().reloadMaximoCache(PROFILE_CACHE_NAME, userName, true);
            logger.info("[" + scriptName + "] dropProfileCache reloadMaximoCache(" + PROFILE_CACHE_NAME + "," + userName + ") 已执行");
        } catch (e) {
            logger.warn("[" + scriptName + "] dropProfileCache reloadMaximoCache 失败", e);
        }
    }
    //c.兜底:反射调用包可见的 removeProfile(String)
    try {
        var removeProfile = securityService.getClass().getDeclaredMethod("removeProfile", Java.type("java.lang.String").class);
        removeProfile.setAccessible(true);
        removeProfile.invoke(securityService, userName);
        logger.debug("[" + scriptName + "] dropProfileCache 反射 removeProfile(" + userName + ") 已执行");
    } catch (e) {
        logger.debug("[" + scriptName + "] dropProfileCache 反射 removeProfile 跳过: " + e);
    }
}

/**
 * 打印指定应用在当前 Profile 上的授权情况,用于排查"刷新后不生效"
 * @param {string} tag - 阶段标记(before/patched/rebuilt)
 * @param {psdi.security.Profile} profile - 用户 Profile
 * @param {string} app - 应用标识
 */
function logAuthState(tag, profile, app){
    try {
        var apps = profile.getApps();
        var options = profile.getAppOptions(app);
        logger.info("[" + scriptName + "] refreshauth " + tag
            + ": profile@" + java.lang.System.identityHashCode(profile)
            + ", apps=" + apps.size()
            + ", contains(" + app + ")=" + apps.contains(app)
            + ", appAuth=" + profile.getAppAuth(app)
            + ", options(" + options.size() + ")=" + options);
    } catch (e) {
        logger.warn("[" + scriptName + "] refreshauth logAuthState " + tag + " error", e);
    }
}

/**
 * 对比"该用户已授权的选项"(APPLICATIONAUTH -> Profile.apps)和"该应用的签名定义"(SIGNATURE 缓存里的 MAXSIGOPTION)
 * 应用里要出现某个选项,必须是"定义里有" + "当前用户被授权",缺一样都不显示
 * @param {string} app - 应用标识
 * @param {psdi.security.Profile} profile - 用户 Profile
 */
function logSigOptionState(app, profile){
    try {
        /** @type {psdi.app.signature.SignatureCache} */
        var sigCache = MXServer.getMXServer().getFromMaximoCache("SIGNATURE");
        var defined = sigCache.getSigoCache(app.toUpperCase()).keySet();
        var granted = profile.getAppOptions(app);
        var missing = new (Java.type("java.util.HashSet"))(granted);
        missing.removeAll(defined);
        logger.info("[" + scriptName + "] refreshauth 签名定义数=" + defined.size() + ", 已授权数=" + granted.size()
            + (missing.isEmpty() ? ", 授权项都在定义里" : ", ⚠ 定义里缺失的授权项=" + missing));
    } catch (e) {
        logger.warn("[" + scriptName + "] refreshauth logSigOptionState error", e);
    }
}

/**
 * 让浏览器整页重载当前应用(等于用户按 F5)
 * 说明:服务端 common/response.jsp 会把 appInstance.getRedirectURL() 输出成 <redirect>,
 *      客户端 async.js 的 processXHR() 收到后执行 document.location=url,即整页重载;
 *      只有整页渲染时 components/menucache.jsp 才会按 wcs.getMenusCached()==false 重建菜单缓存
 *      (menucache_用户_语言 存在浏览器 localStorage 里),所以刷新权限后必须重载一次。
 *      URL 格式抄 WebClientSession.gotoApplink():<上下文>/ui/?event=loadapp&value=应用&uisessionid=xxx,
 *      setRedirectURL() 内部会自动补一次性 csrftoken。
 *      注意:客户端 processXHR() 里赋值 location 前把 warnExit 置 false,整页重载不会弹"未保存数据"提示,
 *      所以点"刷新应用权限"前请先保存当前数据。
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 * @param {psdi.webclient.system.session.WebClientSession} clientsession - WebClient会话
 * @returns {boolean} 是否已请求重载
 */
function reloadCurrentPage(dbctx, clientsession){
    try {
        /** @type {psdi.webclient.system.controller.AppInstance} */
        var appInstance = dbctx.getAppInstance();
        if(!appInstance){
            return false;
        }
        var url = clientsession.getMaximoRequestContextURL() + "/ui/?event=loadapp&value="
            + appInstance.getId() + "&" + clientsession.getUISessionUrlParameter();
        appInstance.setRedirectURL(url);
        logger.info("[" + scriptName + "] reloadCurrentPage url=" + url);
        return true;
    } catch (e) {
        logger.warn("[" + scriptName + "] reloadCurrentPage 构造重载URL失败,请手工按 F5 刷新页面", e);
        return false;
    }
}

/**
 * 清理 WebClient 会话里缓存的权限与菜单数据
 * clearModuleMap()/setMenusCached(false) 是公开方法,其它字段没有清空接口,用反射置空
 * (WebClientSession.close() 里也是把 userApps/moduleMap/maxAppsSet/sysOptionMap/reportsMap 置空)
 * @param {psdi.webclient.system.session.WebClientSession} wcs - WebClient会话,可为 null(非设计模式没有设计器会话)
 */
function clearSessionAuthCache(wcs){
    if(!wcs){
        return;
    }
    try {
        wcs.clearModuleMap();//moduleMap=null,左侧导航下次按新权限重新生成
        wcs.setMenusCached(false);//标记菜单缓存失效,下次请求重新构建
    } catch (e) {
        logger.warn("[" + scriptName + "] clearSessionAuthCache clearModuleMap error", e);
    }
    var fields = ["userApps", "sysOptionMap", "reportsMap", "maxAppsSet"];
    for (var i = 0; i < fields.length; i++) {
        try {
            var field = wcs.getClass().getDeclaredField(fields[i]);
            field.setAccessible(true);
            field.set(wcs, null);
        } catch (e) {
            logger.debug("[" + scriptName + "] clearSessionAuthCache " + fields[i] + " skip: " + e);
        }
    }
}

/**刷新应用权限
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function refreshauth_bak(dbctx){
    initLogger(dbctx);
    var mbo = dbctx.getMbo()
    if(!mbo){
        var appInstance = dbctx.getAppInstance()
        logger.info("[" + scriptName + "] appInstance= " + appInstance)
        var appBean = appInstance.getAppBean()
        logger.info("[" + scriptName + "] appBean= " + appBean)
        mbo = appBean.getMbo()
        logger.info("[" + scriptName + "] mbo= " + mbo)
        var appName=mbo.getString("app")
        logger.info("[" + scriptName + "] appName= " + appName)
    }
    var appMbo =  mbo
    var app = appMbo.getString("APP");
    var userInfo = dbctx.getUserInfo()
    
    var variableName = mbo;
    /** @type {psdi.security.SecurityService} */
    var securityService = MXServer.getMXServer().lookup("SECURITY");
    // 获取 Profile
    /** @type {psdi.security.Profile} */
    var profile = securityService.getProfile(userInfo);
    // profile.dumpAppAuth();//刷新所有应用权限
    //刷新应用权限
    profile.updateAppMaps(app,userInfo)

    // /** @type {java.util.TreeMap<java.lang.Integer, java.util.Hashtable<string, string>>} */
    // var appMenu=profile.getAppMenu(app, userInfo);
    // JSONObject = Java.type("com.ibm.json.java.JSONObject");

    // var moduleMapJS = javaMapToJS(appMenu);
    // logger.info("[" + scriptName + "]-------------getAppMenu keys=" + JSON.stringify((moduleMapJS)));

    // appMenu=profile.getAppTools(app,userInfo)
    // moduleMapJS = javaMapToJS(appMenu);
    // logger.info("[" + scriptName + "]-------------getAppTools keys=" + JSON.stringify((moduleMapJS)));

    // appMenu=profile.getAppSearch(app,userInfo)
    // moduleMapJS = javaMapToJS(appMenu);
    // logger.info("[" + scriptName + "]-------------getAppSearch keys=" + JSON.stringify((moduleMapJS)));


    var clientsession = dbctx.webclientsession();
    clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "----应用权限已刷新OK----" , 1);

    // 通过反射调用 private/protected 方法 constructAppAuthOneApp
    var profileClass = profile.getClass();
    var methods = profileClass.getDeclaredMethods();
    var targetMethod = null;
    for (var i = 0; i < methods.length; i++) {
        if (methods[i].getName() === "constructAppAuthOneApp") {
            targetMethod = methods[i];
            break;
        }
    }
    if (targetMethod != null) {
        targetMethod.setAccessible(true);
        targetMethod.invoke(profile, app, appMbo, null, null);
        logger.info("[" + scriptName + "] constructAppAuthOneApp invoked for app=" + app);
    } else {
        logger.warn("[" + scriptName + "] constructAppAuthOneApp method not found");
    }

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

/**
 * 判断 Java 对象是否为 Map 类型（通过检查接口方法）
 * @param {Object} obj
 * @returns {boolean}
 */
function isJavaMap(obj) {
    try {
        return typeof obj.keySet === "function" && typeof obj.get === "function";
    } catch(e) {
        return false;
    }
}

/**
 * 判断 Java 对象是否为 List/Collection 类型
 * @param {Object} obj
 * @returns {boolean}
 */
function isJavaList(obj) {
    try {
        var cls = obj.getClass().getName();
        return cls.indexOf("List") !== -1 || cls.indexOf("Vector") !== -1 || cls.indexOf("Array") !== -1;
    } catch(e) {
        return false;
    }
}

/**
 * 将 Java Map 转换为 JS 对象（支持 TreeMap、Hashtable 等所有 Map 实现）
 * @param {java.util.Map} javaMap
 * @returns {Object}
 */
function javaMapToJS(javaMap) {
    var result = {};
    var keys = javaMap.keySet().iterator();
    while (keys.hasNext()) {
        var key = keys.next();
        var value = javaMap.get(key);
        if (value != null && isJavaMap(value)) {
            result["" + key] = javaMapToJS(value);
        } else if (value != null && isJavaList(value)) {
            result["" + key] = Java.from(value);
        } else {
            result["" + key] = value;
        }
    }
    return result;
}

/**
  1.安全组授权后权限刷新
 2.用于vscode插件等方式push的xml文件,刷新应用(不一定有效)
 
 DESIGNER 应用程序设计器,随便找个应用导出(例如ITEM),然后在导出的url上将targetid改成dedesigner
  maximo/ui/item.xml?event=exportxml&designmode=true&targetid=designer

  主表列中增加以下按钮
<tablecol mxevent="refreshauth" mxevent_desc="刷新应用权限" mxevent_icon="listab_refresh.gif"  id="results_showlist_tablebody_8"  type="event"/>
<tablecol mxevent="refreshmaxapp" mxevent_desc="刷新应用" mxevent_icon="listab_refresh.gif"  id="results_showlist_tablebody_9"  type="event"/>


放到table里面
<table>
<tablebody>
</tablebody>
<buttongroup id="resultsButtongroup">
    <pushbutton disabledonclick="true" id="results_btn_po_bottom" label="重载所有应用权限" mxevent="refreshallauth"/>
</buttongroup>
</table>
 */
