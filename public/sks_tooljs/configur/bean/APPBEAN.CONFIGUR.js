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
var scriptName = "APPBEAN.CONFIGUR"//service.getScriptName()
/** @type {java.lang.System} */
System = Java.type("java.lang.System");
/** @type {org.apache.log4j.Level} */
Level = Java.type("org.apache.log4j.Level");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {psdi.util.logging.MXLogger} */
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + scriptName);
/** @type {psdi.util.MXApplicationException} */
MXApplicationException = Java.type("psdi.util.MXApplicationException");//8
loggerMX.info("[" + scriptName + "]----------");

/** @type {jscustom.AnsiLogger} */
var logger = null
/** @type {jscustom.sksLogAnsiUtils} */
var sksLogAnsiUtils = null


/**
 * 初始化日志记录器
 *
 * 参数可以是任何"带 invokeScript(name) 方法"的对象:
 *  - bean 脚本里传 dbctx(psdi.webclient.system.beans.DataBeanContext)
 *  - 接口脚本(ScriptRouteHandler)里传 service(ScriptService)
 * 两者都有 invokeScript(String), 所以这里统一收口, 让下面的核心逻辑可以被两边复用。
 *
 * @param {Object} invoker - dbctx 或 service
 */
function initLogger(invoker) {
  if (logger != null) {
    return
  }
  sksLogAnsiUtils = invoker.invokeScript("SKS_LOG_ANSI_UTILS");
  logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true })
  // logger.setLevel(Level.INFO);

  logger.info("[" + scriptName + "] initialize")
}

/**
 * 初始化应用
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function initializeApp(dbctx) {
  initLogger(dbctx);
  /** @type {psdi.webclient.system.session.WebClientSession} */
  var clientsession = dbctx.webclientsession();
  // clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", "APPBEAN.initializeApp触发了!!!", 1);
  // clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warnning", new MXApplicationException("ibm_rl","createpoSuccessNoOrder").getMessage(msr), 0);
  /**
   { "msgGroup": "ibm_system", "msgKey": "option_ok", "value": "操作成功", "displayMethod": "TEXT", "options": ["close"], "prefix": "BMXZZ", "suffix": "E" },
      displayMethod = TEXT 和 STATUS 都是绿色
  STATUS常用在显示固定值,比如列表过滤器,下载显示的按钮名称
   */
  //右上角绿色成功提示
  clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("ibm_system", "option_ok"));

  logger.info("[" + scriptName + "] initializeApp")
}


/**
 * 重新载入"对象/视图"的字段与 SQL 定义
 *
 * 作用与"数据库配置"中 MAXOBJECTCFG 的 objectname 字段(psdi.app.configure.FldMaxObjectCfgObjectName)的
 * action 方法完全相同(源码):
 * <pre>
 *   public void action() throws MXException, RemoteException {
 *      super.action();
 *      if (!this.getMboValue().isNull()) {
 *         MboRemote mbo = this.getMboValue().getMbo();
 *         ((MaxObjectCfgRemote)mbo).setupTableOrView("objectname");
 *         if (mbo.getBoolean("isview")) {
 *            ((MaxObjectCfgRemote)mbo).loadCreateView();
 *         } else {
 *            ((MaxObjectCfgRemote)mbo).loadCreateTable();
 *         }
 *      }
 *   }
 * </pre>
 *
 * 使用场景:
 *  - 手动用 SQL 在数据库中创建的 表 / 视图, 在 Maximo 中新增这个同名对象时,
 *    会自动识别 native 视图/表, 写入 imported / isview / entityname 等标志,
 *    并自动导入字段(MAXATTRIBUTECFG)与视图 SQL(MAXVIEWCFG/MAXVIEWCOLUMNCFG)等信息
 *  - 当数据库中的视图/表被修改(新增列、修改视图 SQL)之后,
 *    可通过按钮触发本方法, 重新读取数据库定义, 更新已添加的字段和 SQL 语句等信息
 *
 * 点击按钮后会更新的内容(与源码逐行对应):
 *  <pre>
 *  FldMaxObjectCfgObjectName.action()
 *    |-- super.action()  (FldSetViewChangedMboValue.action)  -> MAXOBJECTCFG.viewchanged = A
 *    |-- MaxObjectCfg.setupTableOrView("objectname")
 *    |     -> imported / isview / entityname / persistent / addrowstamp /
 *        storagetype / storagetypedesc / classname / textsearchenabled / trigroot 等标志
 *    '-- isview ? MaxObjectCfg.loadCreateView() : MaxObjectCfg.loadCreateTable()
 *          loadCreateView()  : 先清空 MAXTABLECFG, 重建 MAXVIEWCFG(viewselect/viewfrom/viewwhere/
 *                              autoselect 直接从 user_views / syscat.views / information_schema 读取),
 *                              删除全部 MAXATTRIBUTECFG 行后按原生视图列重建,
 *                              再重建 MAXVIEWCOLUMNCFG; 同时回写 MAXOBJECTCFG 的 viewselect/viewfrom/viewwhere
 *          loadCreateTable() : 先清空 MAXVIEWCFG, 重建 MAXTABLECFG,
 *                              再按原生列 MAXATTRIBUTECFG(仅"追加"数据库中存在而配置里没有的列)
 *  最后 补全 MAXTYPE(见 fixEmptyMaxType), 再 AppBean.save() ->
 *        保存上述所有表, 并在校验时 setChanged() 重新计算 changed / viewchanged
 *  </pre>
 *
 * 注意:
 *  - 需要在"数据库配置"应用中选中对象后再触发(取当前主 Mbo = MAXOBJECTCFG)
 *  - 本方法只处理"修改/更新"场景, 与 FldMaxObjectCfgObjectName.action() 分工如下:
 *      changed == 'I'(本次会话新增) -> 直接跳过。这条记录在界面上是新建的,
 *        FldMaxObjectCfgObjectName.action() 已经执行过
 *        setupTableOrView("objectname") + loadCreateView()/loadCreateTable(),
 *        再执行一次只会往 MAXTABLECFG/MAXVIEWCFG/MAXATTRIBUTECFG 里重复写数据
 *      changed == 'R'(已标记删除)   -> 跳过
 *      其他(已存在记录)             -> 走本文件 setupTableOrViewByMbo() 的"更新"逻辑
 *  - 已存在记录不能调用 MaxObjectCfg.setupTableOrView("objectname"):
 *    它内部第一件事是 setValueNull("entityname") 再 setValue("entityname", objectname),
 *    值虽然没变, 但 MboValue.previousValue 与 currentValue 已不相等, entityname
 *    被判定为"已修改"; 保存时 MaxObjectCfg.appValidate() 会执行
 *    getMboValue("entityname").validate(10L) -> FldMaxObjectCfgEntityName.validate(),
 *    它到 MAXOBJECT / MAXOBJECTCFG 里按 entityname 查重, 而本对象自己的行早已存在,
 *    于是抛 BMXAA0711E "A table or view with this name already exists."
 *    (应用名是 "CONFIGUR" 只会跳过内存里的重复循环, 上面那两条 SQL 查询照样执行)
 *  - 而 MaxObjectCfg.setupTableOrView() 内部第一行就是 if (changed == 'I'),
 *    对已存在记录本来就是空执行(no-op), 所以也不能靠它来更新。
 *    于是对已存在记录: 由 JS 复刻 setupTableOrView 中与"更新"有关的标志位逻辑
 *    (applyObjectCfgFlags(), 不含 objectname 分支里对 entityname 的重置) +
 *    直接调用 public 的 loadCreateView()/loadCreateTable()
 *    (这两个方法本身没有 changed == 'I' 判断, 可以安全地对已存在对象执行)
 *  - 只需要保存主 MboSet: 子表是通过 mbo.getMboSet(关系名) 打开的,
 *    Mbo.getMboSet() 内部 ms.setMXTransaction(this.mySet.getMXTransaction()),
 *    MboSet.setMXTransaction() 会 txn.add(this) 把子表注册进主表同一个事务,
 *    所以 mboSet.save() 会把 MAXTABLECFG / MAXVIEWCFG / MAXATTRIBUTECFG / MAXVIEWCOLUMNCFG 一起提交
 *  - 说明(源码决定的边界, 不是本脚本能覆盖的):
 *      1) MAXSYSINDEXES / MAXSYSKEYS(索引) 不在 loadCreateView/loadCreateTable 里, 本脚本不会重建
 *      2) 本次只刷新"配置", 真正生效还需在"数据库配置"里执行"应用配置更改"(Apply Configuration
 *         Changes), 由它写入 MAXOBJECT/MAXATTRIBUTE 并重载 DD 缓存
 *
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 */
function setupTableOrViewFunc(dbctx) {
  initLogger(dbctx);
  logger.info("\x1B[32m[" + scriptName + "] setupTableOrViewFunc begin\x1B[0m")
  /**
   * 管理模式下不允许执行
   {
      "msgGroup": "ibm_system",
      "msgKey": "AdminOnThis",
      "value": "管理方式已开启,页面初始化程序受到影响,NEW/INIT等脚本无法执行,<br/>请在先回启动中心,等待管理方式关闭之后重新进入应用",
      "displayMethod": "MSGBOX",
      "options": ["close"],
      "prefix": "BMXZZ",
      "suffix": "E"
  },
   */
  if (Java.type("psdi.iface.mic.MicUtil").getAdminModeState()) {
    throw new MXApplicationException("ibm_system", "AdminOnThis")
  }
  /** @type {psdi.webclient.system.session.WebClientSession} */
  var clientsession = dbctx.webclientsession();
  /** @type {psdi.webclient.system.beans.AppBean} 数据库配置应用的主 Bean */
  var appBean = dbctx.getAppInstance().getAppBean();
  /** @type {psdi.mbo.MboRemote} 当前选中的 MAXOBJECTCFG 对象 */
  var mbo = getMainMbo(dbctx);
  if (!mbo) {
    throw new MXApplicationException("#", "error,can't find mbo")
  }

  var objectname = mbo.getString("objectname")
  if (!objectname || objectname === "") {
    clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warning", "请先填写对象名称(objectname)", 1)
    return
  }
  var changed = mbo.getString("changed")

  // 1. 新增的记录不理会:
  //    changed == 'I' 说明这条 MAXOBJECTCFG 是本会话在界面上新建的,
  //    FldMaxObjectCfgObjectName.action() 已经调用过 setupTableOrView("objectname") +
  //    loadCreateView()/loadCreateTable(), 这里再执行一次只会重复写数据
  if (changed === "I") {
    logger.info("[" + scriptName + "] setupTableOrViewFunc skip objectname=" + objectname + ", changed=I(新增由字段自动设置)")
    clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warning",
      "对象 [" + objectname + "] 是新增记录, 已由字段自动设置, 无需重新载入", 1)
    return
  }

  // 2. 已标记删除的对象不允许重新载入定义
  if (mbo.toBeDeleted() || changed === "R") {
    clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warning",
      "对象 [" + objectname + "] 已标记为删除, 不能重新载入定义", 1)
    return
  }

  logger.info("[" + scriptName + "] setupTableOrViewFunc begin objectname=" + objectname
    + ", changed=" + changed
    + ", imported=" + mbo.getBoolean("imported")
    + ", isview=" + mbo.getBoolean("isview")
    + ", entityname=" + mbo.getString("entityname")
    + ", persistent=" + mbo.getBoolean("persistent"))

  // 3. 交给核心逻辑 setupTableOrViewByMbo: 重建内存中的结构定义 -> 保存 -> 返回详细报告
  //    返回 {appended, fixed, unfixed, buildError, appendError, saveError, errors, ...}
  //
  //    ！！这一段绝对不能把异常抛到外面:
  //    事件处理方法一旦往外抛异常, 页面收到的是一个残缺/错误的响应,
  //    Maximo 前端会认为会话已经不可用, 直接把浏览器踢回登录页(表现为"点一下按钮就回到登录页")。
  //    核心逻辑内部已经把每一步单独 try 住, 这里再兜一层。
  var report = null
  try {
    report = setupTableOrViewByMbo(dbctx, mbo, false, false, appBean)
  } catch (e) {
    report = newReport(objectname)
    report.saveError = "" + e
    report.errors.push("setupTableOrViewByMbo: " + e)
    logger.error("[" + scriptName + "] setupTableOrViewFunc error objectname=" + objectname, e)
    sksLogAnsiUtils.throwError(e)
  }

  // 4. 保存(等价于界面上的"保存"按钮)
  //    appBean.save() -> AppBean.save() -> mboSetRemote.save()
  //      - 子表(MAXTABLECFG/MAXVIEWCFG/MAXATTRIBUTECFG/MAXVIEWCOLUMNCFG)已被注册进同一个事务, 会一起提交
  //      - 保存时 Mbo.validate() -> MaxObjectCfg.appValidate() -> setChanged() 重算 changed/viewchanged
  //      - 最后 fireStructureChangedEvent() 刷新结构
  //    即使上面重建/补列时抛了异常, 这一步也要执行: 新加的 MAXATTRIBUTECFG 行不保存就白加了
  //
  //    ！！这里刻意不再调用 appBean.reloadTable() / refreshTable():
  //    DataBean.save() 内部已经做过 invalidateTableData() + moveTo() + setCurrentRecordData(),
  //    框架自己就会把最新数据带回页面, 手工再来一次是重复的;
  //    reloadTable() 会立刻触发 structureChangedEvent() 重排页面结构,
  //    而此刻 mxevent 处理器还没结束、响应还在生成, 在这个时点改页面结构容易演变成
  //    SRVE8115W(Cannot set status. Response already committed)
  //    + 会话被回收 -> 浏览器直接被踢回登录页(见 Maximo 日志里的 BMXAA4189E / LabelCacheMgr NPE)。
  try {
    logger.info("[" + scriptName + "] setupTableOrViewFunc before save objectname=" + objectname)
    // 不能只调 appBean.save():
    //   AppBean.save() 内部只是 this.mboSetRemote.save()(主表 MAXOBJECTCFG 那个集合),
    //   脚本里通过 mbo.getMboSet("MAXATTRIBUTECFG") 新加的行不一定跟着主表事务一起提交,
    //   而且主/子表一旦带 NOSAVE(8) 标志, save() 只会打一条 warn 就 return(不抛异常)。
    //   实测症状: 行在内存里(日志里 fixEmptyMaxType 能修到它们)、save 前后日志都在、不报错,
    //   但数据库里就是没有 -> 属性页看不到新字段。
    //   saveObjectCfg 内部 = appBean.save() + 清 NOSAVE + 子表兜底 save(), 这里直接复用它。
    saveObjectCfg(mbo, appBean, report)
    logger.info("[" + scriptName + "] setupTableOrViewFunc after save objectname=" + objectname
      + ", diag=" + JSON.stringify(report.diag))
  } catch (e) {
    report.saveError = "" + e
    logger.error("[" + scriptName + "] setupTableOrViewFunc save error objectname=" + objectname, e)
  }

  // 5. 汇总提示
  var warn = []
  if (report.skipped != null) {
    warn.push("已跳过(" + report.skipped + ")")
  }
  if (report.buildError != null) {
    warn.push("重建结构定义时报错(" + report.buildError + "), 已改用兜底方式补齐字段")
  }
  if (report.appendError != null) {
    warn.push("追加缺失字段时报错(" + report.appendError + ")")
  }
  if (report.saveError != null) {
    warn.push("保存时报错(" + report.saveError + "), 数据可能没有落库")
  }
  if (report.errors.length > 0) {
    warn.push("其他错误(" + report.errors.join("; ") + ")")
  }
  if (report.unfixed != null && report.unfixed.length > 0) {
    warn.push("下面这些字段的原生类型无法映射到 MAXTYPE, 请在\"属性\"页手工设置: " + report.unfixed.join(", "))
  }

  logger.info("[" + scriptName + "] setupTableOrViewFunc ok objectname=" + objectname
    + ", changed=" + mbo.getString("changed")
    + ", productAppended=" + report.productAppended.join("|")
    + ", appended=" + report.appended.join("|")
    + ", maxTypeFixed=" + report.fixed.join("|"))

  // 6. 提示信息本身也不能让异常冒出去(否则同样会把页面变成错误响应)
  try {
    if (warn.length > 0) {
      clientsession.showMessageBox(clientsession.getCurrentEvent(), "Warning",
        "对象 [" + objectname + "] 已重新载入, 新增字段 "
        + (report.productAppended.length + report.appended.length)
        + " 个(产品补 " + report.productAppended.length + ", 兜底补 " + report.appended.length + "), 补齐 MAXTYPE "
        + report.fixed.length + " 个; " + warn.join("; "), 1)
    } else {
      clientsession.showMessageBox(clientsession.getCurrentEvent(), new MXApplicationException("ibm_system", "option_ok"))
    }
  } catch (e) {
    logger.error("[" + scriptName + "] setupTableOrViewFunc showMessageBox error objectname=" + objectname, e)
  }
}

/**
 * 重新载入"对象/视图"的结构定义(只改内存, 不提交)
 *
 * 这是"修改/更新"场景的逻辑, 由下面两部分组成(对应源码里被 changed == 'I' 挡住、
 * 只能由 JS 自己复刻的那些逻辑):
 * <pre>
 *   1) MaxObjectCfg.setupTableOrView(attributename) 中与"更新"有关的标志位部分
 *      (见 applyObjectCfgFlags)
 *   2) if (isview) { loadCreateView(); } else { loadCreateTable(); }
 * </pre>
 *
 * 为什么不用 mbo.setupTableOrView(...):
 *  - "objectname" 分支会把 entityname 标记成"已修改", 保存时触发 BMXAA0711E
 *  - "entityname" 分支虽然不碰 entityname, 但它整个方法体被 changed == 'I' 包住,
 *    对已存在记录是空执行
 *  - loadCreateView() / loadCreateTable() 是 public 且没有 changed == 'I' 判断,
 *    可以直接对已存在对象调用
 *
 * 本函数不依赖 UI 上下文, 只要求传入的对象带 invokeScript(name):
 *  - bean 脚本(setupTableOrViewFunc) 传 dbctx, 并用 appBean 保存
 *  - 接口脚本(TEST_CONFIGURE_API) 传 service, 核心逻辑内部用 mbo 自己的 MboSet 保存
 * 这样"重载对象结构"这一套逻辑两边可以完全复用, 不用维护两份。
 *
 * @param {Object} invoker - 带 invokeScript(name) 的对象(dbctx 或 service)
 * @param {psdi.mbo.MboRemote} mbo - 当前选中的 MAXOBJECTCFG 对象
 * @param {boolean} doSave - 是否在本函数内直接保存
 * @param {boolean} doShowMessageBox - 是否由本函数弹提示(目前只用于接口脚本场景)
 * @param {psdi.webclient.system.beans.AppBean} [appBean] - UI 上下文, 有则用它保存
 * @return {Object} report, 见 newReport()
 */
function setupTableOrViewByMbo(invoker, mbo, doSave, doShowMessageBox, appBean) {
  initLogger(invoker)
  var report = newReport(mbo == null ? "" : mbo.getString("objectname"))

  var changed = mbo.getString("changed")

  if(!mbo.getBoolean("IMPORTED")){
    logger.info("[" + scriptName + "] setupTableOrViewByMbo skip: IMPORTED=0")
    report.skipped = "IMPORTED=0"
    return report
  }

  // 新增的不理会: 会触发 FldMaxObjectCfgObjectName.action 自动设置
  if (changed === "I") {
    logger.info("[" + scriptName + "] setupTableOrViewByMbo skip: changed=I")
    report.skipped = "changed=I"
    return report
  }
  if (mbo.toBeDeleted() || changed === "R") {
    logger.info("[" + scriptName + "] setupTableOrViewByMbo skip: changed=R")
    report.skipped = "changed=R"
    return report
  }

  // 1. 复刻 setupTableOrView 中针对已存在记录的标志位逻辑
  //    这一步只设置 isview/persistent/imported/addrowstamp/classname 等标志位和只读属性,
  //    失败不致命, 但绝不能拦住后面的"追加缺失列", 所以单独 try 住
  try {
    applyObjectCfgFlags(mbo)
  } catch (e) {
    logger.error("[" + scriptName + "] applyObjectCfgFlags error objectname=" + mbo.getString("objectname"), e)
  }

  // 2. 复刻 loadCreateView() / loadCreateTable(): 重建字段与 SQL
  //    视图: loadCreateView()  从 user_views / syscat.views / information_schema 重新读取视图定义,
  //          重建 MAXVIEWCFG(viewselect/viewfrom/viewwhere/autoselect) 与 MAXATTRIBUTECFG,
  //          重建 MAXVIEWCOLUMNCFG, 并把 viewselect/viewfrom/viewwhere 回写到 MAXOBJECTCFG
  //    表:   loadCreateTable() 重建 MAXTABLECFG 与 MAXATTRIBUTECFG(仅追加数据库里存在而配置中没有的列)
  //
  //    ！！这里必须单独 try 住, 原因是源码里的两个缺陷:
  //     a) MaxObjectCfg.importDB2View() 读 syscat.views.text 后按"遇到的第一个 ' from '"硬切
  //        select/from/where 三段。视图一旦含嵌套子查询(本对象 V_IBM_RLLINE_QTY 就是),
  //        切出来的 viewselect 是截断的、viewfrom/viewwhere 也是错的。
  //     b) 该切分之后紧跟的 MAXATTRIBUTECFG.loadCreateTable(null)(追加缺失列)和
  //        addViewColumns(...)。只要前面任何一步抛异常(例如 selectString 返回 null 时
  //        viewText.toUpperCase() 直接 NPE), 这两步就永远不会执行 ——
  //        表现就是"视图里新增的字段, 属性页上看不到"。
  //    所以第 3 步必须自己再补一次"追加缺失列", 不能指望 loadCreateView() 干完。
  try {
    if (mbo.getBoolean("isview")) {
      mbo.loadCreateView()
    } else {
      mbo.loadCreateTable()
    }
  } catch (e) {
    report.buildError = "" + e
    logger.error("[" + scriptName + "] loadCreateView/loadCreateTable error entityname=" + mbo.getString("entityname")
      + ", isview=" + mbo.getBoolean("isview"), e)
  }

  // 3. 兜底: 把"数据库里有、MAXATTRIBUTECFG 里没有"的列补进来
  //    (相当于把源码里被异常跳过的 loadCreateTable(null) 那一步重新执行一遍;
  //     视图/表改了定义新增的列都靠这一步补齐)
  try {
    var addInfo = appendMissingColumns(mbo)
    report.appended = addInfo.appended
    report.productAppended = addInfo.productAppended
    report.appendError = addInfo.errorMsg
    report.nativeCount = addInfo.nativeCount
  } catch (e) {
    report.appendError = "" + e
    logger.error("[" + scriptName + "] appendMissingColumns error entityname=" + mbo.getString("entityname"), e)
  }

  // 4. 补全 MAXTYPE:
  //    psdi.configure.Util.getMaxType() 没有覆盖全部原生类型(DB2 的 DECFLOAT 就是其一),
  //    未覆盖时它返回空串, MaxAttributeCfgSet.addRowToSet() 会把 MAXTYPE 写成空值,
  //    结果就是"字段导入进来了, 但 MAXTYPE 没有值"
  try {
    var fixInfo = fixEmptyMaxType(mbo)
    report.fixed = fixInfo.fixed
    report.unfixed = fixInfo.unfixed
  } catch (e) {
    logger.error("[" + scriptName + "] fixEmptyMaxType error entityname=" + mbo.getString("entityname"), e)
  }

  // 5. 保存
  //    子表(MAXATTRIBUTECFG 等)通过 mbo.getMboSet(关系名) 打开时会被注册进主表事务,
  //    正常情况下 mboSet.save() 会一起提交; 但脚本场景下未必, 所以内部还会对
  //    MAXATTRIBUTECFG 再单独兜底保存一次(见 saveObjectCfg 的说明)
  if (doSave) {
    saveObjectCfg(mbo, appBean, report)
  }

  logger.info("[" + scriptName + "] setupTableOrViewByMbo done objectname=" + mbo.getString("objectname")
    + ", changed=" + mbo.getString("changed")
    + ", imported=" + mbo.getBoolean("imported")
    + ", isview=" + mbo.getBoolean("isview")
    + ", persistent=" + mbo.getBoolean("persistent")
    + ", productAppended=" + report.productAppended.join("|")
    + ", appended=" + report.appended.join("|")
    + ", nativeCount=" + report.nativeCount
    + ", fixed=" + report.fixed.join("|")
    + ", unfixed=" + report.unfixed.join("|")
    + ", buildError=" + report.buildError
    + ", appendError=" + report.appendError
    + ", saveError=" + report.saveError
    + ", diag=" + JSON.stringify(report.diag))
  return report
}

/**
 * 保存主表, 并兜底把 MAXATTRIBUTECFG 子表单独提交一次
 *
 * 为什么要兜底:
 *  MboSet.save() 提交的是它所属的 MXTransaction, 只有"注册进同一个事务"的集合才会被带上。
 *  子表是通过 mbo.getMboSet(关系名) 打开的, 正常会 setMXTransaction(主表事务) 注册进去;
 *  但在没有 UI 上下文的脚本场景里, 子表可能更早就绑定过自己的 activeTransaction,
 *  此时 MboSet.setMXTransaction() 走的是 else 分支 —— 只是把"旧事务"挂到新事务下,
 *  子表本身仍留在旧事务里, 于是主表 save() 根本不会碰它:
 *  表现就是"行加好了、changed='I'、save() 不报错, 但数据库里就是没有"。
 *  (MboSet.save() 还有个坑: 集合带 NOSAVE(8) 标志时它只打一条 warn 日志就返回, 不抛异常。)
 *
 *  所以这里对 MAXATTRIBUTECFG 再单独 save() 一次: MboSet.save() 内部会
 *  getMXTransaction() 并 commit(), 子表一定在自己那个事务里, 保证落库;
 *  主路径已经保存成功时 toBeSaved() 为 false, 这一步自然跳过, 重复调用是幂等的。
 *
 * @param {psdi.mbo.MboRemote} mbo - MAXOBJECTCFG 对象
 * @param {psdi.webclient.system.beans.AppBean} appBean - UI 上下文, 有则用它保存
 * @param {Object} report - 结果报告(saveError / diag)
 */
function saveObjectCfg(mbo, appBean, report) {
  var parentSet = null
  var attrSet = null
  try {
    parentSet = mbo.getThisMboSet()
    attrSet = mbo.getMboSet("MAXATTRIBUTECFG")
  } catch (e) {
    logger.error("[" + scriptName + "] saveObjectCfg 取 MboSet 失败", e)
  }

  // 诊断信息: 保存前后各集合的状态, 用于定位"加了行却没落库"
  report.diag = {
    parentNoSave: _flagOf(parentSet, 8),
    attrNoSave: _flagOf(attrSet, 8),
    parentToBeSaved: _toBeSavedOf(parentSet),
    attrToBeSavedBefore: _toBeSavedOf(attrSet),
    attrCount: _countOf(attrSet),
    parentNoSaveCleared: false,
    attrNoSaveCleared: false,
    saved: false,
    attrSaved: false
  }

  // NOSAVE(8) 标志必须先清掉再保存。
  // psdi.mbo.MboSet.save(long) 的第一行就是 if (isFlagSet(8L)) { 打一条 "NoSaveSet" 的 warn }
  // 然后直接 return —— 不抛异常、不提交。表现就是"save 前后日志都在、没报错、数据库里却什么都没有"。
  try {
    if (parentSet != null && parentSet.isFlagSet(8)) {
      logger.info("[" + scriptName + "] saveObjectCfg 主表带 NOSAVE 标志, 清除后再保存")
      parentSet.setFlag(8, false)
      report.diag.parentNoSaveCleared = true
    }
  } catch (e) {
    logger.error("[" + scriptName + "] saveObjectCfg 清除主表 NOSAVE 失败", e)
  }
  try {
    if (attrSet != null && attrSet.isFlagSet(8)) {
      logger.info("[" + scriptName + "] saveObjectCfg MAXATTRIBUTECFG 带 NOSAVE 标志, 清除后再保存")
      attrSet.setFlag(8, false)
      report.diag.attrNoSaveCleared = true
    }
  } catch (e) {
    logger.error("[" + scriptName + "] saveObjectCfg 清除 MAXATTRIBUTECFG NOSAVE 失败", e)
  }

  // 主路径
  try {
    logger.info("[" + scriptName + "] saveObjectCfg before save objectname=" + mbo.getString("objectname"))
    if (appBean != null) {
      appBean.save()
    } else {
      parentSet.save()
    }
    report.diag.saved = true
    logger.info("[" + scriptName + "] saveObjectCfg after save objectname=" + mbo.getString("objectname"))
  } catch (e) {
    report.saveError = "" + e
    logger.error("[" + scriptName + "] saveObjectCfg save error objectname=" + mbo.getString("objectname"), e)
  }

  // 兜底: 子表单独提交
  try {
    if (attrSet != null && attrSet.toBeSaved()) {
      logger.info("[" + scriptName + "] saveObjectCfg 兜底保存 MAXATTRIBUTECFG")
      attrSet.save()
      report.diag.attrSaved = true
    }
  } catch (e) {
    report.saveError = (report.saveError == null ? "" : report.saveError + " | ")
      + "MAXATTRIBUTECFG: " + e
    logger.error("[" + scriptName + "] saveObjectCfg 兜底保存 MAXATTRIBUTECFG 失败", e)
  }

  report.diag.attrToBeSavedAfter = _toBeSavedOf(attrSet)
  report.diag.parentToBeSavedAfter = _toBeSavedOf(parentSet)
}

/**
 * 读集合的 NOSAVE(8) 标志, 出错时返回 null
 * @param {psdi.mbo.MboSetRemote} set
 * @return {boolean|null}
 */
function _flagOf(set, flag) {
  if (set == null) {
    return null
  }
  try {
    return set.isFlagSet(flag)
  } catch (e) {
    return null
  }
}

/**
 * 读集合的 toBeSaved(), 出错时返回 null
 * @param {psdi.mbo.MboSetRemote} set
 * @return {boolean|null}
 */
function _toBeSavedOf(set) {
  if (set == null) {
    return null
  }
  try {
    return set.toBeSaved()
  } catch (e) {
    return null
  }
}

/**
 * 读集合里的行数, 出错时返回 null
 * @param {psdi.mbo.MboSetRemote} set
 * @return {number|null}
 */
function _countOf(set) {
  if (set == null) {
    return null
  }
  try {
    var n = 0
    var row = null
    for (var i = 0; (row = set.getMbo(i)) != null; i++) {
      n++
    }
    return n
  } catch (e) {
    return null
  }
}

/**
 * 建一个统一的"重载结果"报告对象, 供 setupTableOrViewFunc / TEST_CONFIGURE_API 共用
 * @param {String} objectname - 对象名
 * @return {Object} {objectname, appended, fixed, unfixed, buildError, appendError, saveError, skipped, errors}
 */
function newReport(objectname) {
  return {
    objectname: objectname,
    /** JS 兜底追加成功的列: ["列名(原生类型 -> MAXTYPE)"] */
    appended: [],
    /** 产品 loadCreateTable(null) 自己补上的列: ["列名"] */
    productAppended: [],
    /** 数据字典里查到的原生列总数; null=没走到那一步, -1=查不到(类型不支持/查询失败) */
    nativeCount: null,
    /** 补齐了 MAXTYPE 的字段: ["字段->MAXTYPE"] */
    fixed: [],
    /** 原生类型无法映射、需要人工设置 MAXTYPE 的字段 */
    unfixed: [],
    /** loadCreateView/loadCreateTable 抛出的异常 */
    buildError: null,
    /** appendMissingColumns 抛出的异常 */
    appendError: null,
    /** 保存时抛出的异常 */
    saveError: null,
    /** 被跳过的原因(changed=I / changed=R), 未跳过时为 null */
    skipped: null,
    /** 保存阶段的诊断信息(各集合的 NOSAVE 标志 / toBeSaved / 行数), 见 saveObjectCfg */
    diag: null,
    /** 其他异常 */
    errors: []
  }
}

/**
 * 复刻 MaxObjectCfg.setupTableOrView(String attributename) 中与"已存在记录"有关的逻辑。
 *
 * 与原方法刻意的差别:
 *  - 去掉最外层的 if (changed.equals("I")) —— 这里处理的本来就是已存在记录
 *  - 去掉 attributename.equalsIgnoreCase("objectname") 分支里的
 *    setValueNull("entityname") / setValue("entityname", objectname):
 *    对已存在对象它只是把 entityname 标记成"已修改", 保存时
 *    MaxObjectCfg.appValidate() -> getMboValue("entityname").validate(10L) ->
 *    FldMaxObjectCfgEntityName.validate() 会去 MAXOBJECT/MAXOBJECTCFG 查重,
 *    本对象自己的行已存在 -> 抛 BMXAA0711E
 *  - 因此不需要 attributename 参数(已存在记录的 isview / entityname 取自记录本身)
 *  - 源码里的 this.util 是包级私有(psdi.configure.Util), JS 拿不到, 所以:
 *      util.dbIn == 3            -> 用 MXServer.getDatabaseProductName() 判断是否 DB2
 *      util.selectString(...)    -> 用 Mbo.getMboSet(name, object, where) 查
 *      util.rowFound(...)        -> 同上, 用 isEmpty() 判断
 *  - 未处理 DB2 联邦表(isNickname): 需要 psdi.configure.Util, JS 拿不到;
 *    普通表/视图不受影响
 *
 * 覆盖: imported / persistent / classname / textsearchenabled / storagetype /
 *      storagetypedesc / storagepartition / viewselect / viewfrom 的取值与只读标志
 *
 * @param {psdi.mbo.MboRemote} mbo - 当前选中的 MAXOBJECTCFG 对象
 */
function applyObjectCfgFlags(mbo) {
  /** 11 = MboConstants.NOVALIDATION(1) | NOACCESSCHECK(2) | NOACTION(8) */
  var FLAG_NO_CHECK = 11
  /** 7 = MboConstants.READONLY (setFieldFlag 用) */
  var FLAG_READONLY = 7
  /** 与源码 tableFields / viewFields 完全一致 */
  var tableFields = ["addrowstamp", "eaudittbname", "eauditenabled", "isaudittable", "storagepartition",
    "storagetype", "storagetypedesc", "textsearchenabled", "restoredata", "langtablename",
    "langcolumnname", "uniquecolumnname", "islangtable", "altixname", "trigroot", "contentattribute"]
  var viewFields = ["viewselect", "viewwhere", "viewfrom", "autoselect", "joinobject"]

  var objectname = mbo.getString("objectname")
  var entityname = mbo.getString("entityname")
  /** @type {psdi.app.configure.ConfigureServiceRemote} */
  var cfgService = getConfigureService()

  if (mbo.getBoolean("isview")) {
    // ---------------- 视图 ----------------
    mbo.setFieldFlag(tableFields, FLAG_READONLY, true)
    mbo.setFieldFlag(viewFields, FLAG_READONLY, false)
    mbo.setFieldFlag("storagepartition", 128, false)
    mbo.setFieldFlag("storagetype", 128, false)
    mbo.setFieldFlag("storagetypedesc", 128, false)
    mbo.setValueNull("storagetype", FLAG_NO_CHECK)
    mbo.setValueNull("storagetypedesc", FLAG_NO_CHECK)
    if (mbo.getBoolean("autoselect")) {
      mbo.setFieldFlag("viewselect", FLAG_READONLY, true)
      mbo.setFieldFlag("viewfrom", FLAG_READONLY, true)
    } else {
      mbo.setFieldFlag("viewselect", FLAG_READONLY, false)
      mbo.setFieldFlag("viewfrom", FLAG_READONLY, false)
    }

    mbo.setValue("persistent", true, FLAG_NO_CHECK)
    if (cfgService.nativeViewExists(entityname)) {
      mbo.setValue("imported", true, FLAG_NO_CHECK)
    } else {
      mbo.setValue("imported", false, FLAG_NO_CHECK)
    }
  } else {
    // ---------------- 表 ----------------
    mbo.setFieldFlag(tableFields, FLAG_READONLY, false)
    mbo.setFieldFlag(viewFields, FLAG_READONLY, true)
    if (mbo.getBoolean("persistent")) {
      mbo.setFieldFlag("storagepartition", 128, true)
      if (mbo.isNull("storagetype")) {
        mbo.setValue("storagetype", 0, FLAG_NO_CHECK)
        var storageTypeDesc = selectString(mbo, "$SKS_STORAGETYPEDESC", "NUMERICDOMAIN",
          "domainid = 'STORAGETYPE' and value = '0'", "description")
        if (storageTypeDesc != null) {
          mbo.setValue("storagetypedesc", storageTypeDesc, FLAG_NO_CHECK)
        }
      }
      mbo.setFieldFlag("storagetype", 128, true)
      mbo.setFieldFlag("storagetypedesc", 128, true)
      mbo.setFieldFlag("storagetype", FLAG_READONLY, false)
      mbo.setFieldFlag("storagetypedesc", FLAG_READONLY, false)
    } else {
      mbo.setFieldFlag("storagepartition", 128, false)
      mbo.setValueNull("storagetype", FLAG_NO_CHECK)
      mbo.setValueNull("storagetypedesc", FLAG_NO_CHECK)
      mbo.setFieldFlag("storagetype", 128, false)
      mbo.setFieldFlag("storagetypedesc", 128, false)
      mbo.setFieldFlag("storagetype", FLAG_READONLY, true)
      mbo.setFieldFlag("storagetypedesc", FLAG_READONLY, true)
    }

    if (!cfgService.nativeTableExists(entityname)) {
      mbo.setValue("imported", false, FLAG_NO_CHECK)
    } else {
      mbo.setValue("imported", true, FLAG_NO_CHECK)
      mbo.setValue("persistent", true, FLAG_NO_CHECK)
      if (isDB2Database()) {
        mbo.setValue("textsearchenabled", false, FLAG_NO_CHECK)
        mbo.setFieldFlag("textsearchenabled", FLAG_READONLY, true)
      }
    }
  }

  // ---- 以下与 setupTableOrView 的后半段一致 ----
  if (!mbo.getBoolean("imported") && !mbo.getBoolean("isview")) {
    mbo.setFieldFlag("persistent", FLAG_READONLY, false)
  } else {
    mbo.setFieldFlag("persistent", FLAG_READONLY, true)
  }

  if (!mbo.getBoolean("persistent")) {
    mbo.setFieldFlag(tableFields, FLAG_READONLY, true)
    mbo.setFieldFlag(viewFields, FLAG_READONLY, true)
    mbo.setValue("classname", "psdi.mbo.custapp.NonPersistentCustomMboSet", FLAG_NO_CHECK)
  } else {
    mbo.setValue("classname", "psdi.mbo.custapp.CustomMboSet", FLAG_NO_CHECK)
  }

  // 源码: select 1 from alndomain where domainid='SEARCHTYPE' and value='TEXT' 查不到时,
  //       textsearchenabled 置为只读
  try {
    var searchTypeTextSet = mbo.getMboSet("$SKS_SEARCHTYPE_TEXT", "ALNDOMAIN",
      "domainid = 'SEARCHTYPE' and value = 'TEXT'")
    if (searchTypeTextSet.isEmpty()) {
      mbo.setFieldFlag("textsearchenabled", FLAG_READONLY, true)
    }
  } catch (e) {
    logger.error("[" + scriptName + "] applyObjectCfgFlags check SEARCHTYPE domain error", e)
    mbo.setFieldFlag("textsearchenabled", FLAG_READONLY, true)
  }

  logger.info("[" + scriptName + "] applyObjectCfgFlags objectname=" + objectname
    + ", entityname=" + entityname
    + ", imported=" + mbo.getBoolean("imported")
    + ", isview=" + mbo.getBoolean("isview")
    + ", persistent=" + mbo.getBoolean("persistent")
    + ", classname=" + mbo.getString("classname"))
}

/**
 * 取"数据库配置"服务
 * 等价于源码里的 ((ConfigureService)this.getMboServer()) /
 * (ConfigureServiceRemote)MXServer.getMXServer().lookup("CONFIGURE")
 * @return {psdi.app.configure.ConfigureServiceRemote}
 */
function getConfigureService() {
  return Java.type("psdi.server.MXServer").getMXServer().lookup("CONFIGURE")
}

/**
 * 当前数据库是否为 DB2
 * 源码里用的是 util.dbIn == 3, Util 是包级私有拿不到, 这里用数据库产品名判断
 * @return {boolean}
 */
function isDB2Database() {
  return getDbIn() === 3
}

/**
 * 当前数据库类型, 与 psdi.configure.Util.dbIn 的取值保持一致
 *  1 = Oracle, 2 = SQLServer, 3 = DB2
 * @return {number} 识别不出来时返回 0
 */
function getDbIn() {
  try {
    var productName = String(Java.type("psdi.server.MXServer").getMXServer().getDatabaseProductName()).toUpperCase()
    if (productName.indexOf("DB2") >= 0) {
      return 3
    }
    if (productName.indexOf("ORACLE") >= 0) {
      return 1
    }
    if (productName.indexOf("SQL SERVER") >= 0 || productName.indexOf("MICROSOFT") >= 0) {
      return 2
    }
  } catch (e) {
    logger.error("[" + scriptName + "] getDbIn error", e)
  }
  return 0
}

/**
 * 查单值, 等价于 psdi.configure.Util.selectString()(Util 包级私有, JS 拿不到)
 * @param {psdi.mbo.MboRemote} mbo - 宿主 Mbo
 * @param {String} setName - 临时 MboSet 名称, 需唯一
 * @param {String} objectName - 对象名
 * @param {String} where - where 条件
 * @param {String} field - 要取的字段
 * @return {String} 查不到返回 null
 */
function selectString(mbo, setName, objectName, where, field) {
  try {
    var row = mbo.getMboSet(setName, objectName, where).getMbo(0)
    return row == null ? null : row.getString(field)
  } catch (e) {
    logger.error("[" + scriptName + "] selectString error objectName=" + objectName + ", where=" + where, e)
    return null
  }
}


/**
 * 补充映射表: 数据库原生类型 -> Maximo MAXTYPE
 *
 * 为什么需要它:
 *  MaxAttributeCfgSet.getNativeColumns() 是拿 psdi.configure.Util.getMaxType() 把原生类型
 *  翻译成 MAXTYPE 的, 而这个方法没有覆盖全部原生类型(DB2 的 DECFLOAT 就是其中一个),
 *  未覆盖时返回的是空串而不是 null, addRowToSet() 里 if (maxtype != null) 又拦不住空串,
 *  于是 MAXTYPE 被写成空值 —— 表现就是"字段新增了, 但 MAXTYPE 没有设置值"。
 *
 * 这里按数据库类型补一份映射, 只对 MAXTYPE 为空的行生效, 不会覆盖 Maximo 自己翻译好的值。
 *
 * 每个条目可以是:
 *  "原生类型": "MAXTYPE"                     -> 只补 MAXTYPE, length/scale 保留导入时的值
 *  "原生类型": {maxtype, length, scale}      -> 同时纠正 length/scale
 *                                              (原生类型本身没有 scale 语义时用, 例如 DECFLOAT)
 *
 * DECFLOAT 的说明: DB2 的 DECFLOAT 是"十进制浮点", Maximo 没有对应类型。
 *  这里默认映射成 DECIMAL(31,2), 与同一个视图里的 II_LOCQTY / V_STOREAVAILQTY /
 *  V_ALLAVAILQTY 这些数量列(DECIMAL 31,2)保持一致。
 *  如果业务上更需要"浮点"语义, 把 DECFLOAT 那一项改成 "FLOAT" 即可
 *  (FLOAT 在 DB2 上按 double precision 处理, length/scale 无意义)。
 */
var NATIVE_TYPE_FIX = {
  /** 1 = Oracle */
  1: {
    "NCHAR": "ALN",
    "NVARCHAR2": "ALN",
    "ROWID": "ALN",
    "UROWID": "ALN",
    "RAW": "BLOB",
    "LONG RAW": "BLOB",
    "BINARY_FLOAT": "FLOAT",
    "BINARY_DOUBLE": "FLOAT",
    "TIMESTAMP": "DATETIME",
    "XMLTYPE": "CLOB"
  },
  /** 2 = SQLServer */
  2: {
    "NCHAR": "ALN",
    "NVARCHAR": "ALN",
    "UNIQUEIDENTIFIER": "ALN",
    "SYSNAME": "ALN",
    "REAL": "FLOAT",
    "MONEY": "DECIMAL",
    "SMALLMONEY": "DECIMAL",
    "BIT": "YORN",
    "BINARY": "BLOB",
    "VARBINARY": "BLOB",
    "NTEXT": "CLOB",
    "XML": "CLOB",
    "DATE": "DATETIME",
    "TIME": "DATETIME"
  },
  /** 3 = DB2 */
  3: {
    "DECFLOAT": { maxtype: "DECIMAL", length: 31, scale: 2 },
    // DB2 的 syscat.columns.typename 对 CHAR(n) 返回的是 "CHARACTER" 而不是 "CHAR",
    // 而源码 getMaxType() 判的是 equalsIgnoreCase("CHAR"), 匹配不上 -> MAXTYPE 会是空值
    "CHARACTER": "ALN",
    "GRAPHIC": "ALN",
    "LONG VARGRAPHIC": "ALN",
    "DBCLOB": "CLOB",
    "BINARY": "BLOB",
    "VARBINARY": "BLOB",
    "REAL": "FLOAT",
    "XML": "CLOB"
  }
}

/**
 * 取一张原生表/视图的"列名 -> 原生类型"
 *
 * 等价于 MaxAttributeCfgSet.getNativeColumns() 里读数据字典的那一段 SQL:
 *  Oracle    : user_tab_columns
 *  SQLServer : dbo.syscolumns / dbo.sysobjects / dbo.systypes
 *  DB2       : syscat.columns
 * 连接和源码完全一样, 走 MboSet.getMboServer() 返回的 MboServerInterface:
 *   this.getUserInfo().getConnectionKey()
 *   this.getMboServer().getDBConnection(conKey)
 *   this.getMboServer().freeDBConnection(conKey)   // 只 free, 不 close
 * (MboServerInterface.getDBConnection / freeDBConnection 是接口方法, 一定存在)
 *
 * @param {psdi.mbo.MboSetRemote} attrSet - MAXATTRIBUTECFG 子表(提供 UserInfo / MboServer)
 * @param {String} entityname - 原生表/视图名
 * @return {Object} 大写列名 -> 大写原生类型, 取不到时返回空对象
 */
function getNativeColumnTypes(attrSet, entityname) {
  var types = {}
  var cols = getNativeColumnInfo(attrSet, entityname)
  if (cols == null) {
    return types
  }
  for (var i = 0; i < cols.length; i++) {
    types[String(cols[i].name).toUpperCase()] = String(cols[i].nativeType).toUpperCase()
  }
  return types
}

/**
 * 取一张原生表/视图的完整列清单(列名/原生类型/长度/scale/是否可空/默认值)
 *
 * SQL 与 MaxAttributeCfgSet.getNativeColumns() 里读数据字典那一段逐一对应:
 *  Oracle    : user_tab_columns
 *  SQLServer : dbo.syscolumns / dbo.sysobjects / dbo.systypes
 *  DB2       : syscat.columns
 * 连接方式也完全一样, 走 MboSet.getMboServer() 返回的 MboServerInterface:
 *   this.getUserInfo().getConnectionKey()
 *   this.getMboServer().getDBConnection(conKey)
 *   this.getMboServer().freeDBConnection(conKey)   // 只 free, 不 close
 * (MboServerInterface.getDBConnection / freeDBConnection 是接口方法, 一定存在)
 *
 * 用途: appendMissingColumns() 的 JS 兜底分支用它判断"哪些列在 MAXATTRIBUTECFG 里还没有"。
 *
 * @param {psdi.mbo.MboSetRemote} attrSet - MAXATTRIBUTECFG 子表(提供 UserInfo / MboServer)
 * @param {String} entityname - 原生表/视图名
 * @return {Array} [{name, nativeType, length, scale, nulls, defaultValue}];
 *                 数据库类型不支持或查询失败时返回 null(调用方要据此跳过兜底逻辑)
 */
function getNativeColumnInfo(attrSet, entityname) {
  if (!entityname) {
    return null
  }
  var dbIn = getDbIn()
  var sql = null
  var param = entityname
  if (dbIn === 1) {
    // 与源码一致: char_length 作字符长度, data_length 作字节长度
    sql = "select column_name, data_type, char_length, data_length, data_scale, nullable, data_default"
      + " from user_tab_columns where table_name = ? order by column_id"
  } else if (dbIn === 2) {
    sql = "select sc.name, st.name, 0, sc.length, sc.scale, sc.isnullable, sc.cdefault"
      + " from dbo.syscolumns sc, dbo.sysobjects so, dbo.systypes st"
      + " where sc.id = so.id and so.name = ? and st.xusertype = sc.xusertype order by sc.colid"
    param = String(entityname).toLowerCase()
  } else if (dbIn === 3) {
    sql = "select colname, typename, 0, length, scale, nulls, default"
      + " from syscat.columns where tabname = ? and tabschema = current schema order by colno"
  } else {
    logger.info("[" + scriptName + "] getNativeColumnInfo 无法识别的数据库类型, 跳过")
    return null
  }

  var list = []
  var mboServer = null
  var conKey = null
  var ps = null
  var rs = null
  try {
    /** 与 MaxAttributeCfgSet 里的 this.getMboServer() 是同一个对象 */
    mboServer = attrSet.getMboServer()
    conKey = attrSet.getUserInfo().getConnectionKey()
    var con = mboServer.getDBConnection(conKey)
    ps = con.prepareStatement(sql)
    ps.setString(1, param)
    rs = ps.executeQuery()
    while (rs.next()) {
      var name = rs.getString(1)
      var nativeType = rs.getString(2)
      if (name == null || nativeType == null) {
        continue
      }
      var charlength = rs.getInt(3)
      var datalength = rs.getInt(4)
      var scale = rs.getInt(5)
      var nullableTemp = rs.getString(6)
      var defaultTemp = rs.getString(7)

      // 与源码的判定保持一致: Oracle/DB2 看 'N' 表示 not null, SQLServer 看 '0'
      var nulls = true
      if (dbIn === 2) {
        if (nullableTemp != null && nullableTemp === "0") {
          nulls = false
        }
      } else {
        if (nullableTemp != null && nullableTemp === "N") {
          nulls = false
        }
      }
      // SQLServer 的默认值源码是另查 information_schema 的, 这里不取(由产品逻辑负责)
      var defaultValue = (dbIn === 2) ? null : defaultTemp

      list.push({
        name: String(name),
        nativeType: String(nativeType),
        length: charlength > 0 ? charlength : datalength,
        scale: scale,
        nulls: nulls,
        defaultValue: defaultValue
      })
    }
  } catch (e) {
    logger.error("[" + scriptName + "] getNativeColumnInfo error entityname=" + entityname, e)
    return null
  } finally {
    _closeOnly(rs)
    _closeOnly(ps)
    try {
      if (mboServer != null && conKey != null) {
        mboServer.freeDBConnection(conKey)
      }
    } catch (ignored) { }
  }
  return list
}

/**
 * 诊断用: 返回对象的原生列清单(列名:原生类型), 供接口脚本调用
 *
 * 与 getNativeColumnInfo() 的区别: 这里只需要一个带 invokeScript 的 invoker 和一个 Mbo,
 * 内部自己取 MAXATTRIBUTECFG 子表, 方便从 TEST_CONFIGURE_API 这类接口脚本里直接调用,
 * 用来回答"视图里到底有哪些列、MAXATTRIBUTECFG 里到底缺了哪几列"。
 *
 * @param {Object} invoker - 带 invokeScript(name) 的对象(dbctx 或 service)
 * @param {psdi.mbo.MboRemote} mbo - MAXOBJECTCFG 对象
 * @return {Object} {entityname, count, columns: ["列名:原生类型"]}, count=-1 表示数据字典查不到
 */
function diagNativeColumns(invoker, mbo) {
  initLogger(invoker)
  var entityname = mbo.getString("entityname")
  if (!entityname || entityname === "") {
    entityname = mbo.getString("objectname")
  }
  var attrSet = mbo.getMboSet("MAXATTRIBUTECFG")
  var cols = getNativeColumnInfo(attrSet, entityname)
  var columns = []
  if (cols != null) {
    for (var i = 0; i < cols.length; i++) {
      columns.push(cols[i].name + ":" + cols[i].nativeType)
    }
  }
  return { entityname: entityname, count: cols == null ? -1 : cols.length, columns: columns }
}

/**
 * 查补充映射表
 * @param {String} nativeType - 原生类型(大小写不敏感, 允许带精度, 例如 TIMESTAMP(6))
 * @param {number} dbIn - 数据库类型
 * @return {Object} {maxtype, length, scale}, 没有补充映射时返回 null
 */
function getFixMaxType(nativeType, dbIn) {
  if (!nativeType) {
    return null
  }
  var type = String(nativeType).toUpperCase()
  // 去掉精度后缀, TIMESTAMP(6) -> TIMESTAMP
  var idx = type.indexOf("(")
  if (idx >= 0) {
    type = type.substring(0, idx).replace(/^\s+|\s+$/g, "")
  }

  var table = NATIVE_TYPE_FIX[dbIn]
  if (!table || !Object.prototype.hasOwnProperty.call(table, type)) {
    return null
  }
  var fix = table[type]
  if (typeof fix === "string") {
    return { maxtype: fix, length: 0, scale: null }
  }
  return fix
}

/**
 * 复刻 psdi.configure.Util.getMaxType(String) 的翻译规则
 *
 * 为什么要在 JS 里复刻一份:
 *  appendMissingColumns() 的兜底分支是自己往 MAXATTRIBUTECFG 里加行的,
 *  加行时必须自己算出 MAXTYPE, 而 psdi.configure.Util 是包级私有类(package-private), JS 拿不到。
 *  下面每个分支都和源码里的判断一一对应, 源码没覆盖的类型这里同样返回空串(不是 null)。
 *
 * 注意: 解析顺序是 NATIVE_TYPE_FIX 优先(见 resolveMaxType), 所以这里的规则
 *       只负责"源码本来就能翻译、但没轮到它执行"的那些类型。
 *
 * @param {String} nativeType - 原生类型
 * @param {number} dbIn - 1=Oracle, 2=SQLServer, 3=DB2
 * @return {String} MAXTYPE, 未覆盖时返回 ""
 */
function baseMaxType(nativeType, dbIn) {
  if (nativeType == null) {
    return ""
  }
  var type = String(nativeType).toUpperCase()
  if (type === "") {
    return ""
  }

  if (dbIn === 1) {
    // Oracle
    if (type === "VARCHAR2" || type === "VARCHAR") return "ALN"
    if (type === "DATE") return "DATETIME"
    if (type === "NUMBER") return "DECIMAL"
    if (type === "FLOAT") return "FLOAT"
    if (type === "LONG") return "ALN"
    if (type === "CLOB") return "CLOB"
    if (type === "BLOB") return "BLOB"
    return ""
  }

  if (dbIn === 2) {
    // SQLServer
    if (type === "VARCHAR" || type === "TEXT" || type === "VARCHAR(MAX)" || type === "CHAR") return "ALN"
    if (type === "DATETIME" || type === "DATETIME2" || type === "SMALLDATETIME" || type === "TIMESTAMP") return "DATETIME"
    if (type === "DECIMAL" || type === "NUMERIC") return "DECIMAL"
    if (type === "FLOAT") return "FLOAT"
    if (type === "INT") return "INTEGER"
    if (type === "SMALLINT") return "SMALLINT"
    if (type === "TINYINT") return "SMALLINT"
    if (type === "BIGINT") return "BIGINT"
    if (type === "IMAGE") return "BLOB"
    if (type === "VARBINRY(MAX)") return "BLOB"
    return ""
  }

  if (dbIn === 3) {
    // DB2
    if (type.indexOf("VARCHAR") === 0) return "ALN"
    if (type === "VARGRAPHIC") return "ALN"
    if (type === "LONG VARCHAR") return "ALN"
    if (type === "CHAR") return "ALN"
    if (type === "DATE") return "DATE"
    if (type === "TIME") return "TIME"
    if (type === "TIMESTAMP") return "DATETIME"
    if (type === "DECIMAL") return "DECIMAL"
    if (type === "INTEGER") return "INTEGER"
    if (type === "SMALLINT") return "INTEGER"
    if (type === "BIGINT") return "BIGINT"
    if (type === "DOUBLE") return "FLOAT"
    if (type === "FLOAT") return "FLOAT"
    if (type === "DOUBLE PRECISION") return "FLOAT"
    if (type.indexOf("CLOB") === 0) return "CLOB"
    if (type === "BLOB") return "BLOB"
    return ""
  }

  return ""
}

/**
 * 原生类型 -> MAXTYPE(合并"源码规则"与"补充映射表")
 *
 * 顺序: NATIVE_TYPE_FIX 优先(它带 length/scale, 能纠正 DECFLOAT 这类源码翻译不了的),
 *       再落到 baseMaxType()。
 *
 * @param {String} nativeType - 原生类型
 * @param {number} dbIn - 数据库类型
 * @return {Object} {maxtype, length, scale}; length=0 表示"沿用导入时的长度", scale=null 表示"沿用导入时的 scale";
 *                  两边都翻译不出来时返回 null
 */
function resolveMaxType(nativeType, dbIn) {
  var fix = getFixMaxType(nativeType, dbIn)
  if (fix != null) {
    return fix
  }
  var base = baseMaxType(nativeType, dbIn)
  if (base === "") {
    return null
  }
  return { maxtype: base, length: 0, scale: null }
}

/**
 * 补全 MAXATTRIBUTECFG 里 MAXTYPE 为空的行
 *
 * 触发场景: 见 NATIVE_TYPE_FIX 上面的说明。loadCreateView() / loadCreateTable() 导入原生列之后,
 * 原生类型在 Util.getMaxType() 里没有分支的那些列, MAXTYPE 会是空的, 这里按列名回数据库
 * 数据字典查原生类型, 再按 resolveMaxType()(补充映射表 + 源码规则)补上(只补空值, 不动已有值)。
 *
 * 注意:
 *  - 只改内存, 不保存; 保存由调用方 setupTableOrViewFunc 里的 appBean.save() 负责
 *  - 列名取 columnname(没有时退回 attributename), 与 MaxAttributeCfgSet.columnExists 的判定一致
 *  - 用 11 = NOVALIDATION(1)|NOACCESSCHECK(2)|NOACTION(8) 写值, 与 addRowToSet 一致,
 *    这样不会触发 MAXTYPE 的 action()(否则它会用 DUMMY_TABLE 的默认值把 length/scale 冲掉)
 *
 * @param {psdi.mbo.MboRemote} mbo - 当前选中的 MAXOBJECTCFG 对象
 * @return {Object} {fixed: ["字段->类型"], unfixed: ["字段(原生类型)"]}
 */
function fixEmptyMaxType(mbo) {
  var result = { fixed: [], unfixed: [] }

  var entityname = mbo.getString("entityname")
  if (!entityname || entityname === "") {
    entityname = mbo.getString("objectname")
  }
  var dbIn = getDbIn()

  var attrSet = null
  try {
    attrSet = mbo.getMboSet("MAXATTRIBUTECFG")
  } catch (e) {
    logger.error("[" + scriptName + "] fixEmptyMaxType 取 MAXATTRIBUTECFG 失败", e)
    return result
  }
  if (attrSet == null) {
    return result
  }

  /** 原生列类型, 用到时才查(避免每次点按钮都多一次数据字典查询) */
  var nativeTypes = null
  var row = null
  // 循环写法和 MaxObjectCfg.loadCreateView() 里遍历 attrSet.getMbo(xx) 完全一致
  for (var i = 0; (row = attrSet.getMbo(i)) != null; i++) {
    if (row.toBeDeleted()) {
      continue
    }
    var cur = row.getString("maxtype")
    if (!row.isNull("maxtype") && cur != null && cur !== "") {
      continue
    }

    if (nativeTypes == null) {
      nativeTypes = getNativeColumnTypes(attrSet, entityname)
    }

    var attrName = row.getString("attributename")
    var colName = row.getString("columnname")
    var nativeType = colName ? nativeTypes[String(colName).toUpperCase()] : null
    if (nativeType == null && attrName) {
      nativeType = nativeTypes[String(attrName).toUpperCase()]
    }
    if (nativeType == null) {
      nativeType = ""
    }

    var fix = resolveMaxType(nativeType, dbIn)
    if (fix == null) {
      result.unfixed.push(attrName + "(" + nativeType + ")")
      continue
    }

    row.setValue("maxtype", fix.maxtype, 11)
    if (fix.length > 0) {
      row.setValue("length", fix.length, 11)
    }
    if (fix.scale != null) {
      row.setValue("scale", fix.scale, 11)
    }
    result.fixed.push(attrName + "->" + fix.maxtype)
    logger.info("[" + scriptName + "] fixEmptyMaxType " + attrName + ": " + nativeType + " -> " + fix.maxtype)
  }

  if (result.fixed.length > 0 || result.unfixed.length > 0) {
    logger.info("[" + scriptName + "] fixEmptyMaxType entityname=" + entityname
      + ", fixed=" + result.fixed.join(",")
      + ", unfixed=" + result.unfixed.join(","))
  }
  return result
}

/**
 * 追加"数据库里存在、MAXATTRIBUTECFG 里没有"的列
 * —— 相当于把源码里被异常跳过的 MaxAttributeCfgSetRemote.loadCreateTable(null) 那一步
 *    重新执行一遍, 而且保证它一定会被执行。
 *
 * 为什么必须单独做一次:
 *  源码 MaxObjectCfg.loadCreateView() 里"导入视图"分支的顺序是
 *    importDB2View() -> ((MaxAttributeCfgSetRemote)attrSet).loadCreateTable(null) -> addViewColumns(...)
 *  其中 importDB2View() 读 syscat.views.text 后按"遇到的第一个 ' from '"硬切 SQL, 视图一旦含
 *  嵌套子查询就会切错; 并且 selectString 返回 null 时它会在 try 外面直接 viewText.toUpperCase() 抛 NPE。
 *  只要这一步抛异常, 后面的 loadCreateTable(null) 就永远不会执行 ——
 *  结果就是"视图里新增的列"进不了 MAXATTRIBUTECFG, 属性页上自然看不到。
 *
 * 分两步:
 *  A. 先调产品自己的 attrSet.loadCreateTable(null)
 *     (psdi.app.configure.MaxAttributeCfgSetRemote 接口方法, JS 一定调得到;
 *      内部走 MaxAttributeCfgSet.getNativeColumns() 读数据字典, 只补没有的列, 可以重复调用)
 *  B. 再用数据字典与 MAXATTRIBUTECFG 对比一次, 把 A 之后仍然缺的列自己加进来
 *     (只对 imported == true 的对象做, 非导入对象的列本来就不是从数据库来的)
 *
 * 只加行, 不删行、不改已有行; 保存由调用方负责。
 *
 * @param {psdi.mbo.MboRemote} mbo - 当前选中的 MAXOBJECTCFG 对象
 * @return {Object} {appended: ["列名(原生类型 -> MAXTYPE)"], productAppended: ["列名"],
 *                   errorMsg: String|null, nativeCount: 原生列总数|null|-1}
 */
function appendMissingColumns(mbo) {
  var result = { appended: [], productAppended: [], errorMsg: null, nativeCount: null }

  var entityname = mbo.getString("entityname")
  if (!entityname || entityname === "") {
    entityname = mbo.getString("objectname")
  }
  if (!entityname || entityname === "") {
    logger.info("[" + scriptName + "] appendMissingColumns: entityname 为空, 跳过")
    return result
  }

  var attrSet = null
  try {
    attrSet = mbo.getMboSet("MAXATTRIBUTECFG")
  } catch (e) {
    result.errorMsg = "" + e
    logger.error("[" + scriptName + "] appendMissingColumns 取 MAXATTRIBUTECFG 失败", e)
    return result
  }
  if (attrSet == null) {
    result.errorMsg = "MAXATTRIBUTECFG 子表为空"
    return result
  }

  // A. 产品自己的追加逻辑
  //    loadCreateTable(null) 只做"加行", 不加行就说明它认不出该补什么
  //    (视图场景下 MaxObjectCfg.importDB2View() 解析 SQL 抛异常时, 这一步会被整段跳过)
  var namesBeforeProduct = existingColumnNames(attrSet)
  try {
    attrSet.loadCreateTable(null)
    logger.info("[" + scriptName + "] appendMissingColumns: 已调用 MAXATTRIBUTECFG.loadCreateTable(null)")
  } catch (e) {
    result.errorMsg = "" + e
    logger.error("[" + scriptName + "] appendMissingColumns: loadCreateTable(null) 失败, 改用 JS 兜底", e)
  }

  // A2. 记录产品这一步实际补了哪些列, 用于区分"产品补的"与"JS 兜底补的"
  var namesAfterProduct = existingColumnNames(attrSet)
  for (var pk in namesAfterProduct) {
    if (!namesBeforeProduct[pk]) {
      result.productAppended.push(pk)
    }
  }
  if (result.productAppended.length > 0) {
    logger.info("[" + scriptName + "] appendMissingColumns: 产品 loadCreateTable 补列 "
      + result.productAppended.join(","))
  }

  // B. JS 兜底: 数据库里有、配置里没有的列, 自己加一行
  //
  //    ！！这里刻意"不用 imported 做前置拦截":
  //    applyObjectCfgFlags() 里 imported 是最后才写的一个标志位, 它前面任何一步
  //    (setFieldFlag / setValueNull) 抛异常, imported 就还是旧值(很可能是 false),
  //    一旦用它当闸门, 后面这段兜底就永远不执行 —— 表现正是"视图字段没新增"。
  //    而"能不能拿到原生列清单"本身就是更强的证据: getNativeColumnInfo() 能查到列,
  //    说明对象在数据库里真实存在, 补列就是对的; 查不到时它返回 null, 自然跳过。
  var imported = false
  try {
    imported = mbo.getBoolean("imported")
  } catch (ignored) { }
  if (!imported) {
    logger.info("[" + scriptName + "] appendMissingColumns: imported=false, 仍按数据字典比对补列(不阻断)")
  }

  var cols = getNativeColumnInfo(attrSet, entityname)
  if (cols == null) {
    // -1 = 数据字典查不到(数据库类型不支持 / 查询失败), 不是"没有缺失列"
    result.nativeCount = -1
    logger.info("[" + scriptName + "] appendMissingColumns: 拿不到原生列清单, 跳过 JS 兜底")
    return result
  }
  result.nativeCount = cols.length

  var dbIn = getDbIn()
  var existing = existingColumnNames(attrSet)
  for (var i = 0; i < cols.length; i++) {
    var col = cols[i]
    var key = String(col.name).toUpperCase()
    if (existing[key]) {
      continue
    }

    var fix = resolveMaxType(col.nativeType, dbIn)
    var maxtype = (fix == null) ? "" : fix.maxtype
    var length = (fix != null && fix.length > 0) ? fix.length : col.length
    var scale = (fix != null && fix.scale != null) ? fix.scale : col.scale

    try {
      addAttributeCfgRow(attrSet, entityname, col, maxtype, length, scale)
      existing[key] = true
      result.appended.push(col.name + "(" + col.nativeType + " -> "
        + (maxtype === "" ? "原生类型无法识别, MAXTYPE 请手工核对" : maxtype) + ")")
      logger.info("[" + scriptName + "] appendMissingColumns 追加列 " + col.name
        + ": native=" + col.nativeType + ", maxtype=" + maxtype
        + ", length=" + length + ", scale=" + scale + ", required=" + (!col.nulls))
    } catch (e) {
      if (result.errorMsg == null) {
        result.errorMsg = "追加列 " + col.name + " 失败: " + e
      }
      logger.error("[" + scriptName + "] appendMissingColumns 追加列失败 " + col.name, e)
    }
  }

  if (result.appended.length > 0) {
    logger.info("[" + scriptName + "] appendMissingColumns entityname=" + entityname
      + ", appended=" + result.appended.join(","))
  }
  return result
}

/**
 * 收集 MAXATTRIBUTECFG 里已有的列名(统一转大写)
 *
 * 判定口径与 MaxAttributeCfgSet.columnExists() 完全一致: 只看 columnname, 排除已标记删除的行。
 * 只有口径一致, "还缺哪几列"的判断才和产品自己的导入逻辑对得上, 不会加出重复行。
 *
 * @param {psdi.mbo.MboSetRemote} attrSet - MAXATTRIBUTECFG 子表
 * @return {Object} 大写列名 -> true
 */
function existingColumnNames(attrSet) {
  var map = {}
  var row = null
  for (var i = 0; (row = attrSet.getMbo(i)) != null; i++) {
    if (row.toBeDeleted()) {
      continue
    }
    var colName = row.getString("columnname")
    if (colName != null && colName !== "") {
      map[String(colName).toUpperCase()] = true
    }
  }
  return map
}

/**
 * 在 MAXATTRIBUTECFG 里加一行"原生列" —— MaxAttributeCfgSet.addRowToSet(...) 的等价替代
 *
 * addRowToSet(...) 不在 MaxAttributeCfgSetRemote 接口里, 为保险起见这里只用
 * MboSetRemote / MboRemote 接口上一定存在的方法:
 *
 *  - attrSet.addAtEnd(2)                与 MaxAttributeCfgSet.addRowToSet() 里的 addAtEnd(2L) 完全一致
 *                                       (2 = NOACCESSCHECK, 加行时会给 Mbo 置 addedWithNoaccesscheck);
 *                                       加行时框架会调 MaxAttributeCfg.add(), 由它补
 *                                       objectname / localizable / persistent / changed='I' 等
 *  - setValue("attributename", ..., 3)  3 = NOVALIDATION(1)|NOACCESSCHECK(2), 会触发
 *                                       FldMaxAttributeCfgAttributeName.action(),
 *                                       由它补 columnname / remarks / title / alias / searchtype
 *  - 其余字段一律用 11 = NOVALIDATION|NOACCESSCHECK|NOACTION(8) 写, 不触发各自的 action(),
 *    免得像 MAXTYPE 的 action() 那样拿 DUMMY_TABLE 的默认值把 length/scale 冲掉
 *
 * 两个必须留意的点(都由源码 MaxAttributeCfg.add() 决定):
 *  - 视图对象的行, persistent / entityname / columnname 会被设成只读,
 *    所以写 entityname 必须带 NOACCESSCHECK(11 里就有), 否则会抛异常;
 *  - 视图对象的行 add() 不会自动带 entityname, 而 MaxAttributeCfgSet.columnExists()
 *    又要求 entityname 等于对象名, 所以这一句不能省(源码 getNativeColumns() 里也是显式写的)。
 *
 * @param {psdi.mbo.MboSetRemote} attrSet - MAXATTRIBUTECFG 子表
 * @param {String} entityname - 原生表/视图名
 * @param {Object} col - getNativeColumnInfo() 返回的一项
 * @param {String} maxtype - MAXTYPE(空串表示没翻译出来, 留给"属性"页手工设置)
 * @param {number} length - 长度
 * @param {number} scale - scale
 * @return {psdi.mbo.MboRemote} 新增的行
 */
function addAttributeCfgRow(attrSet, entityname, col, maxtype, length, scale) {
  // 与 MaxAttributeCfgSet.addRowToSet() 里的 this.addAtEnd(2L) 一致: 加在末尾, 带 NOACCESSCHECK
  var row = attrSet.addAtEnd(2)
  // 与 addRowToSet() 一致: 导入进来的列要算持久列
  // (视图行 add() 默认给 false 并把该字段设成只读, 这里用 11 覆盖)
  row.setValue("persistent", true, 11)
  row.setValue("attributename", col.name, 3)
  row.setValue("entityname", entityname, 11)
  if (maxtype != null && maxtype !== "") {
    row.setValue("maxtype", maxtype, 11)
  }
  if (length > 0) {
    row.setValue("length", length, 11)
  }
  row.setValue("scale", scale, 11)
  row.setValue("required", !col.nulls, 11)
  if (col.defaultValue != null) {
    row.setValue("defaultvalue", col.defaultValue, 11)
  }
  row.setValue("isldowner", false, 11)
  row.setValue("localizable", false, 11)
  // 导入的列没有 sequence(与 addRowToSet() 里 setFieldFlag("sequencename", 7L, true) 同义)
  try {
    row.setFieldFlag("sequencename", 7, true)
  } catch (ignored) { }
  return row
}

/**
 * 关闭（有close方法的对象）
 */
function _closeOnly(f) {
  try {
    if (f) {
      f.close()
    }
  } catch (ignored) { }
}

/**
 * 关闭MboSet
 */
function _close(set) {
  try {
    if (set) {
      try { set.close(); } catch (ignored) { }
      try { set.cleanup(); } catch (ignored) { }
    }
  } catch (ignored) { }
}


/**
 * 获取mbo
 * @param {psdi.webclient.system.beans.DataBeanContext} dbctx - 数据Bean上下文
 * @return {psdi.mbo.MboRemote}   主Mbo
 */
function getMainMbo(dbctx) {
  logger.info("[" + scriptName + "] getMainMbo")

  /** @type {psdi.webclient.system.controller.AppInstance} */
  var appInstance = dbctx.getAppInstance();
  /** @type {psdi.webclient.system.session.WebClientSession} */
  var clientsession = dbctx.webclientsession();
  /** @type {psdi.webclient.system.beans.DataBean} */
  var appBean = appInstance.getAppBean();
  /** @type {psdi.mbo.MboRemote} */
  var mbo = appBean.getMbo();
  if (!mbo) {
    var appInstance = dbctx.getAppInstance()
    logger.info("[" + scriptName + "] appInstance= " + appInstance)
    var appBean = appInstance.getAppBean()
    logger.info("[" + scriptName + "] appBean= " + appBean)
    //应用主列表按钮的mbo获取
    mbo = appBean.getMbo()
    logger.info("[" + scriptName + "] mbo= " + mbo)
  }
  if (!mbo) {
    throw new MXApplicationException("#", "error,can't find mbo")
  }
  return mbo;
}