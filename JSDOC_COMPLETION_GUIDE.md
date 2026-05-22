# JDK 反射与 JSDoc 智能补全功能使用指南

## 概述

本插件现已支持基于 **JSDoc 类型注释**和**返回值类型推断**的智能代码补全功能，为 Maximo 自动化脚本开发提供准确的、基于实际 Java 类定义的方法提示。

## 核心功能

### 1. 隐式变量自动识别

Maximo 脚本环境中有一些默认可用的变量，无需声明即可使用：

| 变量名 | 类型 | 说明 |
|--------|------|------|
| `mbo` | `psdi.mbo.MboRemote` | 当前 MBO 对象 |
| `mboset` | `psdi.mbo.MboSetRemote` | 当前 MBO 集合 |
| `service` | `com.ibm.ism.script.ScriptService` | 脚本服务 |
| `userInfo` | `psdi.security.UserInfo` | 用户信息 |

**示例：**
```javascript
// 直接输入 mbo. 即可获得 MboRemote 的方法补全
mbo.getString("assetnum");
mbo.setValue("description", "Test");
```

---

### 2. JSDoc 类型注释

通过 JSDoc 注释为变量指定类型，获得精确的方法补全。

#### 格式 1：标准多行注释（变量在下一行）

```javascript
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// 现在输入 assetMbo. 会显示 MboRemote 的所有方法
assetMbo.getString("assetnum");
assetMbo.getInt("priority");
```

#### 格式 2：单行注释（变量在同一行）

```javascript
/** @type {psdi.mbo.MboSetRemote} */ var locationSet;
locationSet.moveFirst();
locationSet.count();
```

#### 格式 3：多变量声明

```javascript
/** @type {psdi.mbo.MboRemote} */ var asset1, asset2;
asset1.getString("assetnum");
asset2.getInt("priority");
```

---

### 3. 表达式映射（高级功能）

可以直接为方法调用结果指定类型，支持正则占位符。

#### 精确表达式映射

```javascript
/** @type {psdi.mbo.MboRemote} b3.getMbo(0) */
// 输入 b3.getMbo(0). 会提供 MboRemote 的方法补全
b3.getMbo(0).getString("assetnum");
```

#### 正则占位符 `\d`（匹配数字）

```javascript
/** @type {psdi.mbo.MboRemote} b3.getMbo(\d) */
// 输入 b3.getMbo(1). 或 b3.getMbo(99). 都会提供 MboRemote 的方法补全
b3.getMbo(1).getString("assetnum");
b3.getMbo(99).setValue("description", "Test");
```

#### 正则占位符 `\w`（匹配单词字符）

```javascript
/** @type {psdi.mbo.MboSetRemote} service.getMboSet(\w) */
// 输入 service.getMboSet("LOCATIONS"). 会提供 MboSetRemote 的方法补全
service.getMboSet("LOCATIONS").moveFirst();
```

#### 通配符 `.*`（匹配任意字符串）

```javascript
/** @type {java.lang.String} mbo.getString(.*) */
// 输入 mbo.getString("assetnum"). 会提供 String 的方法补全
mbo.getString("assetnum");
```

**支持的占位符：**
- `\d` - 匹配一个或多个数字
- `\w` - 匹配一个或多个单词字符
- `.*` - 匹配任意字符串
- `\s` - 匹配空白字符

---

### 4. 返回值类型推断（链式调用支持）

插件会自动分析变量赋值语句，推断返回值的类型，支持链式调用。

**示例：**
```javascript
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// 插件推断 locationSet 的类型为 MboSetRemote（因为 getMboSet 返回 MboSetRemote）
var locationSet = assetMbo.getMboSet("LOCATIONS");

// 输入 locationSet. 会显示 MboSetRemote 的方法
locationSet.moveFirst();
locationSet.count();

// 插件推断 firstLocation 的类型为 MboRemote（因为 moveFirst 返回 MboRemote）
var firstLocation = locationSet.moveFirst();

// 输入 firstLocation. 会显示 MboRemote 的方法
firstLocation.getString("location");
firstLocation.setValue("description", "Updated");
```

**支持的方法返回值映射：**

| 方法名 | 返回类型 |
|--------|----------|
| `getMboSet` | `psdi.mbo.MboSetRemote` |
| `getOwner` | `psdi.mbo.MboRemote` |
| `getThisMboSet` | `psdi.mbo.MboSetRemote` |
| `getMbo` | `psdi.mbo.MboRemote` |
| `moveFirst` | `psdi.mbo.MboRemote` |
| `moveNext` | `psdi.mbo.MboRemote` |
| `getCurrentRow` | `psdi.mbo.MboRemote` |

---

### 5. 三层降级策略

插件采用三层降级策略确保始终提供补全建议：

#### 第1层：实时 JDK 反射（预留接口）
- 未来可通过 Java Bridge 实时从 Maximo JAR 文件中反射获取方法
- 目前暂未实现，预留接口供后续扩展

#### 第2层：预加载的 JSON 缓存
- 从 `reflection-data` 目录加载预先生成的 API 数据
- 包含完整的方法签名、参数类型、返回类型等信息
- 已提供示例文件：
  - `psdi-mbo-MboRemote.json`
  - `psdi-mbo-MboSetRemote.json`

#### 第3层：常用 API 静态列表
- 如果前两层都失败，使用硬编码的常用 API 列表
- 涵盖最常用的方法和属性

---

## 配置说明

### 启用/禁用功能

在 VSCode 设置中（或通过配置面板）可以控制以下选项：

1. **启用代码补全** (`maximoScript.enableCompletion`)
   - 默认：`true`
   - 总开关，控制是否启用所有补全功能

2. **启用 JSDoc 类型注释解析** (`maximoScript.enableJSDocParsing`)
   - 默认：`true`
   - 控制是否解析 `/** @type {ClassName} */` 注释

3. **启用返回值类型推断** (`maximoScript.enableTypeInference`)
   - 默认：`true`
   - 控制是否支持链式调用的类型推断

4. **本地API数据目录** (`maximoScript.localApiPath`)
   - 默认：空
   - 指向包含 JSON API 反射数据的目录

### 配置方式

#### 方式 1：通过配置面板
1. 点击状态栏的 **Maximo配置** 按钮
2. 切换到 **补全设置** 标签页
3. 勾选/取消相应的选项
4. 点击 **保存配置**

#### 方式 2：通过 settings.json
```json
{
  "maximoScript.enableCompletion": true,
  "maximoScript.enableJSDocParsing": true,
  "maximoScript.enableTypeInference": true,
  "maximoScript.localApiPath": "E:\\gitwork\\maximo-script-manager\\maximo-script-vscode-plugin\\reflection-data"
}
```

---

## 使用示例

完整的测试示例请参考 `test-example.js` 文件。

### 基本用法

```javascript
// 1. 使用隐式变量
mbo.getString("assetnum");

// 2. 使用 JSDoc 注释
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;
assetMbo.setValue("description", "Test");

// 3. 使用链式调用
var locationSet = assetMbo.getMboSet("LOCATIONS");
locationSet.moveFirst();
```

### 高级用法

```javascript
// 1. 表达式映射
/** @type {psdi.mbo.MboRemote} b3.getMbo(\d) */
b3.getMbo(0).getString("assetnum");

// 2. 复杂链式调用
/** @type {psdi.mbo.MboRemote} */
var workOrder = mbo;

var laborSet = workOrder.getMboSet("LABOR");
var firstLabor = laborSet.moveFirst();
firstLabor.getString("laborcode");
```

---

### 添加自定义 API 数据

如果需要为其他 Java 类添加补全支持，可以：

1. **从 Gitee 仓库获取**：
   - 访问：https://gitee.com/shoukaiseki/maximo-script-editor/tree/master/reflection-data
   - 下载或克隆整个 `reflection-data` 目录

2. **或者手动创建 JSON 文件**：
   - 在你选择的目录下创建新的 JSON 文件
   - 按照下面的格式编写

### JSON 文件格式

```json
{
  "className": "psdi.mbo.MboRemote",
  "superClass": null,
  "interfaces": ["psdi.mbo.MboConstants"],
  "methods": [
    {
      "name": "getString",
      "returnType": "java.lang.String",
      "parameters": ["java.lang.String"],
      "description": "获取字符串属性值",
      "modifiers": "public abstract",
      "isStatic": false,
      "isPublic": true
    }
  ]
}
```

### 文件命名规则

- 文件名格式：`{className}.json`
- 类名中的 `.` 替换为 `-`
- 例如：`psdi.mbo.MboRemote` → `psdi-mbo-MboRemote.json`

### 重新加载 API 数据

修改 `reflection-data` 目录后，需要重新加载：
1. 打开命令面板（`Ctrl+Shift+P`）
2. 执行 **Developer: Reload Window**
3. 或者重启 VSCode

### 已支持的类列表

Gitee 仓库的 `reflection-data` 已包含以下 15 个类的完整 API 数据：

**下载地址**：https://gitee.com/shoukaiseki/maximo-script-editor/tree/master/reflection-data

**Maximo 核心类**：
- `psdi.mbo.MboRemote` - MBO 远程对象
- `psdi.mbo.MboSetRemote` - MBO 集合远程对象
- `com.ibm.tivoli.maximo.script.ScriptService` - 脚本服务
- `psdi.security.UserInfo` - 用户信息
- `psdi.server.MXServer` - Maximo 服务器
- `psdi.workflow.WorkFlowService` - 工作流服务

**工单相关**：
- `psdi.app.workorder.WORemote` - 工单远程对象
- `psdi.app.workorder.WOSetRemote` - 工单集合远程对象

**JSON 处理**：
- `com.ibm.json.java.JSONObject` - JSON 对象
- `com.ibm.json.java.JSONArray` - JSON 数组
- `com.ibm.json.java.JSONArtifact` - JSON 基类

**Java 标准类**：
- `java.lang.String` - 字符串类
- `java.lang.Object` - 对象基类

**OSLC 相关**：
- `com.ibm.tivoli.maximo.oslc.OslcUtils` - OSLC 工具类

---

## 调试技巧

### 查看日志

插件会在 VSCode 的输出面板中记录详细的日志：

1. 打开输出面板（`Ctrl+Shift+U`）
2. 选择 **Maximo Script Helper** 通道
3. 查看日志输出

### 常见日志信息

```
[Completion] 触发补全，前缀: assetMbo
[JSDoc] 解析到的类型映射: { assetMbo: 'psdi.mbo.MboRemote' }
[ExpressionMatch] 🔍 尝试匹配表达式: "assetMbo"
[ExpressionMatch] ✅ 完全匹配成功: assetMbo -> psdi.mbo.MboRemote
[Reflection] ✅ 使用缓存数据: psdi.mbo.MboRemote
```

### 常见问题

**Q1: JSDoc 注释不生效？**
- 确保注释格式正确：`/** @type {ClassName} */`
- 检查是否启用了 JSDoc 解析功能
- 查看日志确认是否解析到类型映射

**Q2: 链式调用没有补全？**
- 确保启用了返回值类型推断功能
- 检查方法是否在返回值映射表中
- 查看日志确认是否推断出类型

**Q3: 补全建议太多？**
- 可以使用过滤器快速筛选
- 注意补全项后面的来源标识：`[缓存]`、`[常用API]`

---

## 性能优化

### 缓存机制

- **内存缓存**：已加载的类方法缓存在内存中，避免重复读取
- **磁盘缓存**：预加载的 reflection-data JSON 文件
- **补全缓存**：相同对象的补全结果会被缓存

### 建议

- **获取 reflection-data**：
  - 访问 Gitee 仓库：https://gitee.com/shoukaiseki/maximo-script-editor/tree/master/reflection-data
  - 下载或克隆 `reflection-data` 目录到本地
  - 在插件配置中指定该目录路径
  - 包含 15+ 个常用 Maximo 类的完整 API 数据
- 将常用的 API 数据放在 `reflection-data` 目录中
- 避免在大型项目中频繁修改 JSDoc 注释
- 如不需要某些功能，可以在配置中禁用以提升性能

---

## 未来规划

- [ ] 实现实时 JDK 反射（通过 Java Bridge）
- [ ] 添加更多常用类的 API 数据
- [ ] 提供 API 数据管理界面
- [ ] 支持导出/导入反射数据
- [ ] 添加性能监控和优化

---

## 技术支持

如有问题或建议，请提交 Issue 或联系开发者。
