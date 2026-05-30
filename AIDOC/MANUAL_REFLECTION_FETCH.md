# 手动获取反射信息功能

## 📋 功能说明

提供了一个便捷的右键菜单入口，允许用户手动选择 Java 类名并获取其反射信息，自动生成 TypeScript 声明文件（.d.ts）。

## 🚀 使用方法

### 步骤 1：在 JavaScript 文件中选中类名

在编辑器中打开一个 `.js` 文件，选中你想要获取反射信息的 Java 类名。

**支持的格式**：
- `java.util.Base64$Encoder` （内部类，使用 `$` 符号）
- `psdi.mbo.MboRemote` （普通类）
- `com.ibm.tivoli.maximo.script.ScriptService` （完整包名+类名）

**示例**：
```javascript
// 选中以下任意一行中的类名
/** @type {java.util.Base64$Encoder} */
Base64Encoder = Java.type("java.util.Base64$Encoder");

/** @type {java.util.Base64$Decoder} */
Base64Decoder = Java.type("java.util.Base64$Decoder");

var mbo = Java.type("psdi.mbo.MboRemote");
```

### 步骤 2：右键点击选中的文本

在选中的文本上点击鼠标右键，会出现上下文菜单。

### 步骤 3：点击 "Maximo Script: 获取类反射信息"

在菜单中选择 **"Maximo Script: 获取类反射信息"** 选项。

### 步骤 4：等待处理完成

插件会：
1. ✅ 验证选中的类名格式
2. ✅ 连接 Maximo 服务器
3. ✅ 调用反射接口获取类信息
4. ✅ 生成 .d.ts 文件
5. ✅ 保存到 `javaapi` 目录

### 步骤 5：查看生成的文件

成功后会弹出提示：
```
✅ 已成功生成 Encoder.d.ts
[打开文件]
```

点击 **"打开文件"** 按钮可以直接查看生成的 .d.ts 文件。

## 📁 文件保存位置

生成的 .d.ts 文件会保存在**工作区根目录**的 `javaapi` 子目录中。

**示例**：
```
工作区结构：
├── my-project/              ← 工作区根目录
│   ├── scripts/
│   │   └── my-script.js     ← 当前编辑的文件（可以在任何子目录）
│   └── javaapi/             ← 自动创建的目录（在工作区根目录）
│       └── java/
│           └── util/
│               └── Base64/
│                   ├── Encoder.d.ts    ← 生成的文件
│                   └── Decoder.d.ts    ← 生成的文件
```

**路径规则**：
- 类名：`java.util.Base64$Encoder`
- 转换后：`工作区根目录/javaapi/java/util/Base64/Encoder.d.ts`
- 内部类的 `$` 会被转换为文件夹层级

**重要说明**：
- ✅ 无论您在哪个子目录编辑 JS 文件，.d.ts 文件都会统一保存到工作区根目录的 `javaapi` 文件夹
- ✅ 这样 VSCode 可以正确识别所有 .d.ts 文件并提供智能补全
- ❌ 不会在当前 JS 文件所在目录创建 `javaapi` 文件夹

## ⚠️ 注意事项

### 1. 类名格式验证

插件会自动验证选中的文本是否为合法的 Java 类名格式：
- ✅ 合法：`java.util.Base64$Encoder`
- ✅ 合法：`psdi.mbo.MboRemote`
- ❌ 不合法：`e64.Encoder`（包名太短）
- ❌ 不合法：`123.ClassName`（以数字开头）

如果检测到不合法的类名，会弹出警告对话框，您可以选择：
- **仍然尝试**：继续执行（可能失败）
- **取消**：中止操作

### 2. 必须先选中类名

如果没有选中任何文本，会提示：
```
请先选中一个 Java 类名（如：java.util.Base64$Encoder）
```

### 3. 只能在 JavaScript 文件中使用

此功能仅在 `.js` 文件的右键菜单中显示。在其他语言的文件中不会显示该菜单项。

### 4. 需要配置 Maximo 服务器

使用前请确保已在插件配置中设置了正确的 Maximo 服务器地址和认证信息。

## 🔧 技术细节

### 反射接口调用

插件会调用 Maximo 上的增强版反射脚本：
```
POST /maximo/api/script/SKS_REFLECT_HELPER_ENHANCED
{
  "className": "java.util.Base64$Encoder"
}
```

### 返回数据结构

```json
{
  "className": "java.util.Base64$Encoder",
  "superClass": "java.lang.Object",
  "interfaces": [],
  "methods": [
    {
      "name": "encodeToString",
      "returnType": "java.lang.String",
      "parameters": ["[B"],
      "description": "",
      "isStatic": true
    }
  ]
}
```

### 生成的 .d.ts 文件格式

```typescript
declare namespace java.util.Base64 {
    /**
     * Encoder class
     */
    class Encoder extends any {
        /**
         * encodeToString method
         * @param param1 number[] (byte array)
         * @returns string
         */
        static encodeToString(param1: number[]): string;
    }
}
```

## 💡 使用场景

### 场景 1：快速添加新的 Java 类支持

当您需要在脚本中使用一个新的 Java 类，但还没有对应的 .d.ts 文件时：

1. 在代码中写下类名
2. 选中类名
3. 右键 → "获取类反射信息"
4. 自动生成 .d.ts 文件
5. 立即获得智能补全支持

### 场景 2：调试内部类问题

当遇到内部类（如 `Base64$Encoder`）无法正确识别时：

1. 手动选中完整的类名（包含 `$`）
2. 右键获取反射信息
3. 检查生成的 .d.ts 文件是否正确
4. 确认命名空间转换是否正确

### 场景 3：验证类是否存在

不确定某个类是否在 Maximo 环境中可用：

1. 选中类名
2. 尝试获取反射信息
3. 如果失败，说明类不存在或无法加载

## 🐛 常见问题

### Q1: 提示 "无法加载类: XXX"

**原因**：
- 类名拼写错误
- 该类在 Maximo 环境中不存在
- 内部类使用了错误的分隔符（应该用 `$` 而不是 `.`）

**解决**：
- 检查类名拼写
- 确认该类在 Maximo 中可用
- 对于内部类，使用 `$` 符号（如 `Base64$Encoder`）

### Q2: 生成的 .d.ts 文件没有方法

**原因**：
- 反射接口返回空数据
- 类是抽象类或接口，没有公共方法

**解决**：
- 查看输出日志确认反射接口是否成功调用
- 尝试其他类似的类

### Q3: 右键菜单中没有 "获取类反射信息" 选项

**原因**：
- 当前文件不是 JavaScript 文件
- 没有选中任何文本

**解决**：
- 确保在 `.js` 文件中操作
- 先选中要获取反射信息的类名

## 📝 更新日志

- **v1.2.10**：新增手动获取反射信息功能
  - 支持右键菜单快速触发
  - 自动验证类名格式
  - 智能生成 .d.ts 文件
  - 支持内部类（$ 符号）
  - 提供文件打开快捷方式
