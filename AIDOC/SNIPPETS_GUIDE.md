# Maximo 脚本代码片段使用指南

本插件提供了丰富的代码片段（Snippets），帮助你快速编写 Maximo 自动化脚本。

## JSDoc 类型注释片段

### 快速生成类型注释

| 快捷输入 | 生成内容 | 说明 |
|---------|---------|------|
| `jsdocstr` | `/** @type {java.lang.String} */` | String 类型 |
| `jsdocmbo` | `/** @type {psdi.mbo.MboRemote} */` | MboRemote 类型 |
| `jsdocmboset` | `/** @type {psdi.mbo.MboSetRemote} */` | MboSetRemote 类型 |
| `jsdocservice` | `/** @type {com.ibm.ism.script.ScriptService} */` | ScriptService 类型 |
| `jsdocuser` | `/** @type {psdi.security.UserInfo} */` | UserInfo 类型 |
| `jdoctype` | `/** @type {className} */` | 自定义类型（可编辑） |

### 使用方法

1. 在 JavaScript 文件中输入快捷前缀（如 `jsdocstr`）
2. 按 `Tab` 或 `Enter` 键
3. 自动生成完整的 JSDoc 类型注释

### 示例

```javascript
// 输入 jsdocstr，按 Tab
/** @type {java.lang.String} */

// 输入 varjsdoc，按 Tab
/** @type {psdi.mbo.MboRemote} */
var variableName = mbo;
```

## Maximo API 常用片段

### 日志记录

| 快捷输入 | 生成内容 |
|---------|---------|
| `slog` | `service.log("message");` |
| `serr` | `service.error("message");` |

### MBO 操作

| 快捷输入 | 生成内容 |
|---------|---------|
| `mgetstr` | `mbo.getString("attribute")` |
| `msetval` | `mbo.setValue("attribute", value);` |
| `mgetset` | `mbo.getMboSet("relationship")` |

### MBO Set 操作

| 快捷输入 | 生成内容 |
|---------|---------|
| `mmovefirst` | `mboset.moveFirst()` |
| `mcount` | `mboset.count()` |

### 控制结构

| 快捷输入 | 生成内容 |
|---------|---------|
| `ifmbo` | `if (mbo != null) { ... }` |
| `trylog` | `try { ... } catch (e) { service.log("Error: " + e); }` |

## 完整示例

```javascript
// 1. 使用 varjsdoc 快速声明带类型的变量
// 输入: varjsdoc → Tab
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// 2. 使用 mgetstr 获取属性值
// 输入: mgetstr → Tab
var assetNum = mbo.getString("assetnum");

// 3. 使用 slog 记录日志
// 输入: slog → Tab
service.log("Asset Number: " + assetNum);

// 4. 使用 trylog 添加异常处理
// 输入: trylog → Tab
try {
    assetMbo.setValue("description", "Updated");
} catch (e) {
    service.log("Error: " + e);
}
```

## 自定义片段

如果需要添加自定义片段，可以编辑 `snippets/maximo-js.json` 文件。

### 片段格式

```json
{
  "片段名称": {
    "prefix": ["快捷输入1", "快捷输入2"],
    "body": [
      "第一行代码",
      "第二行代码",
      "$0"
    ],
    "description": "片段描述"
  }
}
```

### 占位符说明

- `$1`, `$2`, `$3` - 按 Tab 键依次跳转的光标位置
- `$0` - 最终光标位置
- `${1:defaultValue}` - 带默认值的占位符

## 提示

- 代码片段只在 `.js` 文件中可用
- 输入快捷前缀后，VSCode 会自动显示建议
- 可以使用 IntelliSense 查看片段的详细说明
