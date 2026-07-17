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
var scriptName = "APPBEAN.IBM_AUTOSCRIPT_HISTORY"//service.getScriptName()
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
loggerMX.info("[" + scriptName + "]------------------load------------------");

/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8

/** @type {java.util.ArrayList} */
ArrayList = Java.type("java.util.ArrayList")

/** @type {psdi.util.MXException} */
MXException = Java.type("psdi.util.MXException");

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");//13

/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");//67

/** @type {psdi.util.MXSession} */
MXSession = Java.type("psdi.util.MXSession");


/** @type {jscustom.AnsiLogger} */
var logger = null


/**
 * 初始化日志记录器,在bean脚本中,每次都需要调用该方法以初始化logger
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function initLogger(dbctx) {
    java.lang.System.out.println("[" + scriptName + "] initLogger")
    if (logger != null) {
        return
    }
    var sksLogAnsiUtils = dbctx.invokeScript("SKS_LOG_ANSI_UTILS");
    logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true, printModel: false })
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
function initializeApp(dbctx) {
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

function longExportExcel(dbctx) {
    initLogger(dbctx);

    /** @type {psdi.webclient.system.controller.AppInstance} */
    var appInstance = dbctx.getAppInstance();
    /** @type {psdi.webclient.system.session.WebClientSession} */
    var clientsession = dbctx.webclientsession();
    /** @type {psdi.webclient.system.beans.DataBean} */
    var appBean = appInstance.getAppBean();
    /** @type {javax.servlet.http.HttpSession} */
    var httpSession = clientsession.getHttpSession();
    logger.info("[" + scriptName + "] longExportExcel")

    // Phase 3: 导出已完成，点击对话框按钮后执行下载
    var downloadUrl = httpSession.getAttribute("_export_download_url");
    if (downloadUrl != null) {
        httpSession.removeAttribute("_export_download_url");
        appInstance.openURL(downloadUrl, true);
        logger.info("[" + scriptName + "] longExportExcel openURL: " + downloadUrl);
        return true;
    }

    // Phase 1: 开始导出
    var event = clientsession.getCurrentEvent();
    var msgRet = event.getMessageReturn();
    
    // 首次调用（没有对话框返回值）
    if (msgRet < 0) {
        // 开始计时
        var startTime = java.lang.System.currentTimeMillis();
        var filename=exportExcel(dbctx)
        

        var targetUrl = "/maximo/tabledownload?filename=" + filename;

        // 计算耗时
        var endTime = java.lang.System.currentTimeMillis();
        var duration = endTime - startTime;
        logger.info("[" + scriptName + "] export duration: " + duration + "ms");

        // 判断是否需要弹出确认框
        if (duration > 3000) {
            httpSession.setAttribute("_export_download_url", targetUrl);
            //消息按钮用ok, yes并不会再次触发脚本
            /** @type {psdi.util.MXApplicationYesNoCancelException} */
            var MXApplicationYesNoCancelException = Java.type("psdi.util.MXApplicationYesNoCancelException");
            throw new MXApplicationYesNoCancelException("__export_confirm", "ibm_system", "expExcelFile",["NONE"]);
        } else {
            // 耗时小于3秒，直接下载
            appInstance.openURL(targetUrl, true);
        }

        return true;
    }

    // Phase 2: 用户点击了对话框按钮（YES/NO/OK/CANCEL）
    // 任意按键都执行下载
    logger.info("[" + scriptName + "] dialog returned: " + msgRet);
    var pendingUrl = httpSession.getAttribute("_export_download_url");
    if (pendingUrl != null) {
        httpSession.removeAttribute("_export_download_url");
        appInstance.openURL(pendingUrl, true);
    }

    return true;
}

/**
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function exportExcel(dbctx) {
    initLogger(dbctx);

    /** @type {psdi.webclient.system.controller.AppInstance} */
    var appInstance = dbctx.getAppInstance()

    /** @type {psdi.webclient.system.session.WebClientSession} */
    var clientsession = dbctx.webclientsession();
    /** @type {psdi.webclient.system.beans.DataBean} */
    var appBean = appInstance.getAppBean();
    // var dataBean = appInstance.getDataBean();
    // var dataBean = appInstance.getDataBean("results_showlist");
    var dataBean = appBean.getResultsBean();
    /** @type {psdi.mbo.MboSetRemote} */
    var mboSet = dataBean.getMboSet();
    /** @type {psdi.security.UserInfo} */
    var userInfo = clientsession.getUserInfo();

    /** @type {com.ibm.tivoli.maximo.export.excel.ExcelExportWriter} */
    var ExcelExportWriter = Java.type("com.ibm.tivoli.maximo.export.excel.ExcelExportWriter");
    /** @type {com.ibm.tivoli.maximo.export.ExportContext} */
    var ExportContext = Java.type("com.ibm.tivoli.maximo.export.ExportContext");
    /** @type {com.ibm.tivoli.maximo.export.ExportCellStyle} */
    var ExportCellStyle = Java.type("com.ibm.tivoli.maximo.export.ExportCellStyle");
    /** @type {psdi.iface.mic.MicUtil} */
    var MicUtil = Java.type("psdi.iface.mic.MicUtil");
    /** @type {java.io.File} */
    var File = Java.type("java.io.File");
    /** @type {java.io.FileOutputStream} */
    var FileOutputStream = Java.type("java.io.FileOutputStream");
    /** @type {java.io.ByteArrayOutputStream} */
    var ByteArrayOutputStream = Java.type("java.io.ByteArrayOutputStream");

    var os = new ByteArrayOutputStream();
    var ctx = new ExportContext(userInfo);
    var writer = new ExcelExportWriter("XSSF");

    writer.beginDocument("脚本历史记录", os);

    var headerStyle = new ExportCellStyle();
    headerStyle.setBold(true);

    var titleStyle = new ExportCellStyle();
    titleStyle.setBold(true);

    for (var i = 0; i < 9; i++) {
        writer.beginRow();
        writer.endRow();
    }

    writer.beginRow();
    writer.emitCell(0, "脚本历史记录导出", 0, titleStyle, ctx);
    writer.endRow();

    writer.beginRow();
    writer.emitCell(0, "ID", 0, headerStyle, ctx);
    writer.emitCell(1, "脚本名称", 0, headerStyle, ctx);
    writer.emitCell(2, "别名", 0, headerStyle, ctx);
    writer.emitCell(3, "版本", 0, headerStyle, ctx);
    writer.emitCell(4, "主机名", 0, headerStyle, ctx);
    writer.emitCell(5, "创建人", 0, headerStyle, ctx);
    writer.emitCell(6, "创建时间", 0, headerStyle, ctx);
    writer.endRow();

    mboSet.reset();
    logger.info("[" + scriptName + "] exportExcel mboSet.count=" + mboSet.count())
    var mbo
    var rowNum = 0;
    for (mbo = mboSet.moveFirst(); mbo != null; mbo = mboSet.moveNext()) {
        rowNum++;
        logger.info("[" + scriptName + "] exportExcel rowNum=" + rowNum + ", mbo=" + mbo.getString("IBM_AUTOSCRIPT_HISTORYID"));
        writer.beginRow();
        writer.emitCell(0, mbo.getString("IBM_AUTOSCRIPT_HISTORYID"), 0, null, ctx);
        writer.emitCell(1, mbo.getString("AUTOSCRIPT"), 0, null, ctx);
        writer.emitCell(2, mbo.getString("ALIASNAME"), 0, null, ctx);
        writer.emitCell(3, mbo.getString("VERSION"), 0, null, ctx);
        writer.emitCell(4, mbo.getString("HOSTNAME"), 0, null, ctx);
        writer.emitCell(5, mbo.getString("CREATEPERSON"), 0, null, ctx);
        writer.emitCell(6, mbo.getString("CREATETIME"), 0, null, ctx);
        writer.endRow();
        // if(rowNum > 100){
        //     break
        // }
    }

    writer.endDocument();

    var tempDir = new File(MicUtil.getMeaGlobalDir(), "tabledownload");
    logger.info("[" + scriptName + "] exportExcel tempDir=" + tempDir)
    if (!tempDir.exists()) {
        tempDir.mkdir();
    }

    var filename = "autoscriptHistory_" + java.lang.System.currentTimeMillis() + ".xlsx";
    var filePath = new File(tempDir, filename);
    var fos = new FileOutputStream(filePath);
    fos.write(os.toByteArray());
    fos.close();

    /** @type {javax.servlet.http.HttpSession} */
    var httpSession = clientsession.getHttpSession();
    var existingList = httpSession.getAttribute("tbldownloadfilename");
    if (existingList == null) {
        existingList = new ArrayList();
    }
    existingList.add(filename);
    httpSession.setAttribute("tbldownloadfilename", existingList);

    // var downloadUrl = "/maximo/tabledownload?filename=" + filename;
    // clientsession.getCurrentApp().openURL(downloadUrl, true);
    // clientsession.showMessageBox(clientsession.getCurrentEvent(),
    //     "提示", "正在后台导出文件，完成后请再次点击「导出excel」按钮下载", 1);
    // appInstance.openURL(downloadUrl, true);
    // logger.info("[" + scriptName + "] exportExcel success, downloadUrl=" + downloadUrl);
    return filename;

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