// Maximo Script Helper - 测试示例
// 此文件用于测试 JSDoc 类型注释和智能补全功能
//
// 使用前请配置本地 API 数据目录：
// 1. 下载 reflection-data: https://gitee.com/shoukaiseki/maximo-script-editor/tree/master/reflection-data
// 2. 在配置面板中设置该目录路径

// ========================================
// 测试1: 隐式变量（无需声明即可使用）
// ========================================

// 输入 mbo. 应该显示 MboRemote 的方法
mbo.getString("assetnum");
mbo.setValue("description", "Test");

// 输入 mboset. 应该显示 MboSetRemote 的方法
mboset.moveFirst();
mboset.count();

// 输入 service. 应该显示 ScriptService 的方法
service.log("Test message");

// 输入 userInfo. 应该显示 UserInfo 的方法
userInfo.getUserName();

// ========================================
// 测试2: JSDoc 类型注释 - 标准格式
// ========================================

/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// 输入 assetMbo. 应该显示 MboRemote 的方法
assetMbo.getString("assetnum");
assetMbo.getInt("priority");
assetMbo.getMboSet("LOCATIONS");

/** @type {psdi.mbo.MboSetRemote} */
var locationSet = assetMbo.getMboSet("LOCATIONS");

// 输入 locationSet. 应该显示 MboSetRemote 的方法
locationSet.moveFirst();
locationSet.count();
locationSet.setWhere("siteid='BEDFORD'");

// ========================================
// 测试3: JSDoc 类型注释 - 单行格式
// ========================================

/** @type {psdi.mbo.MboRemote} */ var woMbo;
woMbo.getString("wonum");
woMbo.setValue("status", "APPR");

// ========================================
// 测试4: JSDoc 类型注释 - 多变量声明
// ========================================

/** @type {psdi.mbo.MboRemote} */ var asset1, asset2;
asset1.getString("assetnum");
asset2.getInt("priority");

// ========================================
// 测试5: JSDoc 表达式映射 - 精确匹配
// ========================================

/** @type {psdi.mbo.MboRemote} b3.getMbo(0) */
// 输入 b3.getMbo(0). 应该显示 MboRemote 的方法
b3.getMbo(0).getString("assetnum");
b3.getMbo(0).setValue("description", "Test");

// ========================================
// 测试6: JSDoc 表达式映射 - 正则占位符 \d
// ========================================

/** @type {psdi.mbo.MboRemote} b3.getMbo(\d) */
// 输入 b3.getMbo(1). 或 b3.getMbo(99). 都应该显示 MboRemote 的方法
b3.getMbo(1).getString("assetnum");
b3.getMbo(99).setValue("description", "Test");

// ========================================
// 测试7: JSDoc 表达式映射 - 正则占位符 \w
// ========================================

/** @type {psdi.mbo.MboSetRemote} service.getMboSet(\w) */
// 输入 service.getMboSet("LOCATIONS"). 应该显示 MboSetRemote 的方法
service.getMboSet("LOCATIONS").moveFirst();
service.getMboSet("ASSET").count();

// ========================================
// 测试8: JSDoc 表达式映射 - 通配符 .*
// ========================================

/** @type {java.lang.String} mbo.getString(.*) */
// 输入 mbo.getString("assetnum"). 应该显示 String 的方法
// 注意：String 类需要额外的 reflection-data 文件
mbo.getString("assetnum");

// ========================================
// 测试9: 返回值类型推断 - 链式调用
// ========================================

/** @type {psdi.mbo.MboRemote} */
var parentMbo = mbo;

// 推断 locationSet 的类型为 MboSetRemote（因为 getMboSet 返回 MboSetRemote）
var locationSet2 = parentMbo.getMboSet("LOCATIONS");

// 输入 locationSet2. 应该显示 MboSetRemote 的方法
locationSet2.moveFirst();
locationSet2.count();

// 推断 firstLocation 的类型为 MboRemote（因为 moveFirst 返回 MboRemote）
var firstLocation = locationSet2.moveFirst();

// 输入 firstLocation. 应该显示 MboRemote 的方法
firstLocation.getString("location");
firstLocation.setValue("description", "Updated");

// ========================================
// 测试10: 复杂链式调用
// ========================================

/** @type {psdi.mbo.MboRemote} */
var workOrder = mbo;

// 多层链式调用
var laborSet = workOrder.getMboSet("LABOR");
var firstLabor = laborSet.moveFirst();

// 输入 firstLabor. 应该显示 MboRemote 的方法
firstLabor.getString("laborcode");
firstLabor.getInt("regularhrs");

// ========================================
// 测试11: 实际业务场景示例
// ========================================

/** @type {psdi.mbo.MboRemote} */
var asset = mbo;

// 获取资产编号
var assetNum = asset.getString("assetnum");
service.log("处理资产: " + assetNum);

// 获取关联的位置集合
/** @type {psdi.mbo.MboSetRemote} */
var locations = asset.getMboSet("LOCATIONS");

// 遍历位置
locations.moveFirst();
while (!locations.isEmpty()) {
    var loc = locations.getCurrentRow();
    if (loc != null) {
        var locId = loc.getString("location");
        service.log("位置: " + locId);
    }
    locations.moveNext();
}
