# 快速开始 - JSDoc 智能补全功能

## 5分钟快速上手

### 步骤 1：安装插件

```bash
cd maximo-script-vscode-plugin
npm install
npm run compile
```

在 VSCode 中加载插件（按 F5 或从扩展面板加载）。

---

### 步骤 2：获取并配置本地 API 数据目录

1. **下载 API 数据**：
   - 访问：https://gitee.com/shoukaiseki/maximo-script-editor/tree/master/reflection-data
   - 下载或克隆 `reflection-data` 目录到本地任意位置
   - 例如：`E:\maximo-reflection-data`

2. **配置插件**：
   - 点击状态栏的 **Maximo配置** 按钮
   - 切换到 **补全设置** 标签页
   - 在“本地API数据目录”中选择你保存的 `reflection-data` 目录
   - 点击 **保存配置**

**注意**：该目录包含 15 个 Maximo 常用类的 API 数据，无需额外创建。

---

### 步骤 3：创建测试文件

在项目根目录创建 `test.js` 文件，输入以下内容：

```javascript
// 测试1: 隐式变量（无需声明）
mbo.getString("assetnum");

// 测试2: JSDoc 类型注释
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// 将光标移到 assetMbo. 后面，查看补全建议
assetMbo.

// 测试3: 链式调用
var locationSet = assetMbo.getMboSet("LOCATIONS");

// 将光标移到 locationSet. 后面，查看补全建议
locationSet.
```

---

### 步骤 4：测试补全功能

#### 测试隐式变量

1. 在 `test.js` 中输入 `mbo.`
2. 应该看到 MboRemote 的方法列表
3. 选择 `getString` 方法

#### 测试 JSDoc 注释

1. 输入以下代码：
   ```javascript
   /** @type {psdi.mbo.MboRemote} */
   var myMbo = mbo;
   ```
2. 在下一行输入 `myMbo.`
3. 应该看到 MboRemote 的方法列表
4. 注意补全项后面的 `[缓存]` 标识

#### 测试链式调用

1. 输入以下代码：
   ```javascript
   /** @type {psdi.mbo.MboRemote} */
   var assetMbo = mbo;
   
   var locSet = assetMbo.getMboSet("LOCATIONS");
   ```
2. 在下一行输入 `locSet.`
3. 应该看到 MboSetRemote 的方法列表（自动推断类型）

---

## 常见问题

### Q1: 没有看到补全建议？

**检查清单**：
- ✅ 是否启用了代码补全功能？（配置面板 → 补全设置）
- ✅ 是否正确配置了本地 API 数据目录？
- ✅ `reflection-data` 目录中是否有 JSON 文件？
- ✅ 文件语言是否为 JavaScript？

**解决方法**：
1. 打开命令面板（Ctrl+Shift+P）
2. 执行 **Developer: Reload Window**
3. 重新测试

---

### Q2: JSDoc 注释不生效？

**确保格式正确**：
```javascript
// ✅ 正确格式
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// ❌ 错误格式（缺少星号）
/* @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// ❌ 错误格式（缺少花括号）
/** @type psdi.mbo.MboRemote */
var assetMbo = mbo;
```

---

### Q3: 如何查看日志？

1. 打开输出面板（Ctrl+Shift+U）
2. 在下拉菜单中选择 **Log (Extension Host)**
3. 查找以 `[Completion]`、`[JSDoc]`、`[ExpressionMatch]` 开头的日志

---

## 更多示例

查看完整的测试示例文件：
- `test-example.js` - 包含 12 个测试场景

查看详细的使用指南：
- `JSDOC_COMPLETION_GUIDE.md` - 完整的功能文档

---

## 下一步

- 📖 阅读 [JSDoc 补全功能使用指南](./JSDOC_COMPLETION_GUIDE.md)
- 🔧 查看 [配置说明](./README.md#配置)
- 💡 浏览 [实施总结](./TASK/IMPLEMENTATION_SUMMARY.md)
- 🛠️ 学习 [Reflection Data 提取指南](./REFLECTION_DATA_EXTRACTION.md) - 如何自行生成 API 数据

---

**祝您使用愉快！** 🎉
