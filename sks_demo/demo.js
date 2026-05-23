/* eslint-disable indent */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

// @ts-nocheck
// ============================================
// Maximo 脚本编辑器 - 智能代码补全示例
// ============================================

// 📝 使用 JSDoc 类型注释启用智能补全
// 在变量声明前添加 @type 注释，编辑器会自动识别类型并提供方法提示

/**  @type {psdi.mbo.MboRemote} a2,b2*/
/**  @type {psdi.mbo.MboSetRemote} b3️*/
/**  @type {psdi.mbo.MboRemote} b3.getMbo(0)*/
/**  @type {psdi.mbo.MboRemote} b3.getMbo(\d)*/
b3.getMbo(0)



// 示例1: 单变量类型声明
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// 现在输入 assetMbo. 会显示 MboRemote 的方法
assetMbo.getString("assetnum");
assetMbo.setValue("description", "测试");
mbo.che
// 示例2: 多变量同时声明（用逗号分隔）
/** @type {psdi.mbo.MboSetRemote} */
var locationSet, worklogSet;

locationSet = assetMbo.getMboSet("LOCATIONS");
worklogSet = assetMbo.getMboSet("WORKLOG");

// 输入 locationSet. 或 worklogSet. 会显示 MboSetRemote 的方法
locationSet.moveFirst();
locationSet.count();

// 示例3: service 对象（隐式变量，无需声明）
// 输入 service. 会显示 ScriptService 的方法
service.log("这是一条日志");
service.error("错误组", "错误键");
service.getLogger("loggerName");
// 示例4: 获取关联集合
/** @type {psdi.mbo.MboSetRemote} */
var relatedSet = assetMbo.getMboSet("RELATED_ASSETS");

relatedSet.setWhere("status = 'ACTIVE'");
relatedSet.moveFirst();

// 💡 提示:
// - 模式1 (全部方法): 显示所有 Maximo API 方法
// - 模式2 (常用API): 只显示最常用的方法
// - 模式3 (Java反射): 动态从 Maximo JAR 加载真实方法列表
//
// 🔧 可用的内置变量:
// - mbo: 当前 MBO 对象 (MboRemote)
// - mboset: 当前 MBO 集合 (MboSetRemote)  
// - service: 脚本服务对象 (ScriptService)
// - userInfo: 用户信息对象 (UserInfo)
// - appName: 应用名称
// - webUrl: 服务地址
