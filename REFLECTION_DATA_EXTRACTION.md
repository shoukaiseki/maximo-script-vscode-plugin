# Reflection Data 提取指南

## 📋 概述

本文档详细说明如何从 Maximo Java 类中提取反射信息并生成 JSON 文件，用于 VSCode 插件的代码补全功能。

---

## 🚀 快速开始

### 1. 环境要求

- **Java 版本**：JDK 9 或更高版本（推荐 JDK 17）
- **Node.js**：已安装并配置好环境变量
- **Maximo JAR 包**：需要访问 Maximo 服务器的 lib 目录

### 2. 配置文件位置

#### Java 环境配置
**文件路径**：`E:\gitwork\maximo-script-manager\reflection-config\java-config.json`

```json
{
    "description": "Java 环境配置 - 用于反射信息提取脚本",
    "jvmPath": "D:\\usr\\java\\jdk-17.0.19x64\\bin\\server\\jvm.dll",
    "jarDirectories": [
        "E:\\gitwork\\maximoi\\maximolib",
        "E:\\gitwork\\maximoi\\lib"
    ],
    "additionalJars": [
        "E:\\gitwork\\maximoi\\lib\\activation-1.1.1.jar",
        "E:\\gitwork\\maximoi\\lib\\javax.mail-1.6.2.jar",
        "E:\\gitwork\\maximoi\\lib\\javax.servlet-api-4.0.1.jar"
    ]
}
```

**配置说明**：
- `jvmPath`：JVM 动态库路径（jvm.dll）
- `jarDirectories`：JAR 文件目录数组，脚本会自动扫描这些目录下的所有 .jar 文件
- `additionalJars`：额外的 JAR 文件列表（可选）

#### 要提取的类列表
**文件路径**：`E:\gitwork\maximo-script-manager\test\test-extract-reflection.js`（第 122-152 行）

```javascript
const classesToExtract = [
    // MBO Remote 接口
    "psdi.mbo.MboRemote",
    "psdi.mbo.MboSetRemote",
    
    // Script Service
    "com.ibm.ism.script.ScriptService",
    
    // Security
    "psdi.security.UserInfo",
    "psdi.security.UserLoginDetails",
    
    // Server & Workflow
    "psdi.server.MXServer",
    "psdi.workflow.WorkFlowService",
    
    // Work Order
    "psdi.app.workorder.WORemote",
    "psdi.app.workorder.WOSetRemote",
    
    // JSON
    "com.ibm.json.java.JSONArray",
    "com.ibm.json.java.JSONArtifact",
    "com.ibm.json.java.JSONObject",
    
    // OSLC
    "com.ibm.tivoli.maximo.oslc.OslcUtils",
    
    // Java 基础类
    "java.lang.String",
    "java.lang.Object",
    
    // Context
    "psdi.common.context.UIContext",
    
    // MBO 核心类（非 Remote）
    "psdi.mbo.Mbo",
    "psdi.mbo.MboSet"
];
```

---

## 🛠️ 执行步骤

### 步骤 1：检查 Java 环境

```bash
java -version
```

确保显示的是 Java 9+（例如：`java version "17.0.19"`）

### 步骤 2：验证配置文件

确认 `reflection-config/java-config.json` 中的路径正确：
- `jvmPath` 指向正确的 JDK 安装目录
- `jarDirectories` 指向 Maximo 的 lib 目录

**如何找到正确的路径**：

1. **查找 jvmPath**：
   ```bash
   # Windows 示例
   dir "C:\Program Files\Java\jdk-17*\bin\server\jvm.dll"
   
   # 或在项目中运行测试命令
   npm run test:java-version
   ```

2. **查找 Maximo JAR 目录**：
   - 通常在 Maximo 安装目录的 `lib` 或 `maximolib` 子目录
   - 关键文件：`businessobjects.jar`、`mbojava.jar`、`mboejb.jar`

### 步骤 3：运行提取脚本

```bash
npm run test:extract-reflection
```

**脚本执行流程**：
1. ✅ 加载 Java 配置文件
2. ✅ 初始化 JVM（使用 java-bridge）
3. ✅ 扫描 JAR 目录并添加到 classpath
4. ✅ 逐个加载指定的类
5. ✅ 通过 Java 反射提取方法、字段、构造函数
6. ✅ 保存为 JSON 文件到 `reflection-data/` 目录

### 步骤 4：查看结果

提取完成后，在 `reflection-data/` 目录下会生成对应的 JSON 文件：

```
reflection-data/
├── psdi-mbo-MboRemote.json
├── psdi-mbo-MboSetRemote.json
├── com-ibm-ism-script-ScriptService.json
├── psdi-security-UserInfo.json
└── ...
```

**JSON 文件格式**：
```json
{
  "className": "psdi.mbo.MboRemote",
  "superClass": null,
  "interfaces": ["psdi.mbo.MboConstants"],
  "methodCount": 245,
  "fieldCount": 12,
  "constructorCount": 0,
  "methods": [
    {
      "name": "getString",
      "returnType": "java.lang.String",
      "parameters": ["java.lang.String"],
      "description": "java.lang.String getString(java.lang.String)",
      "modifiers": "public abstract",
      "isStatic": false,
      "isPublic": true,
      "isFinal": false,
      "isAbstract": true,
      "exceptions": []
    }
  ],
  "fields": [
    {
      "name": "STATUS",
      "type": "java.lang.String",
      "modifiers": "public static final",
      "isStatic": true,
      "isPublic": true,
      "isFinal": true
    }
  ],
  "constructors": []
}
```

---

## 🔧 添加新的类

### 方法 1：直接修改脚本（推荐）

编辑 `test/test-extract-reflection.js` 文件的第 122-152 行，在 `classesToExtract` 数组中添加新的类名：

```javascript
const classesToExtract = [
    // ... 现有的类
    "com.ibm.tivoli.maximo.script.ScriptService",  // 新增
    "psdi.security.UserLoginDetails"                // 新增
];
```

然后重新运行：
```bash
npm run test:extract-reflection
```

### 方法 2：使用配置文件（未来扩展）

可以创建单独的配置文件 `reflection-config/classes-to-extract.json`：

```json
{
  "classes": [
    "psdi.mbo.MboRemote",
    "psdi.mbo.MboSetRemote",
    "com.ibm.ism.script.ScriptService"
  ]
}
```

然后在脚本中读取这个配置文件（需要修改代码）。

---

## 🐛 常见问题

### 问题 1：UnsupportedClassVersionError

**错误信息**：
```
java.lang.UnsupportedClassVersionError: ... has been compiled by a more recent version of the Java Runtime (class file version 53.0)
```

**原因**：使用的是 Java 8，但 `java-bridge` 需要 Java 9+

**解决方案**：
1. 安装 Java 11 或更高版本
2. 设置 JAVA_HOME 环境变量指向新版本
3. 或在 `java-config.json` 中指定 `jvmPath`

### 问题 2：ClassNotFoundException

**错误信息**：
```
✗ 失败: java.lang.ClassNotFoundException: psdi.mbo.MboRemote
```

**原因**：JAR 包未正确加载

**解决方案**：
1. 确认 `jarDirectories` 配置正确
2. 确认该目录下有 Maximo 的 JAR 文件（特别是 `businessobjects.jar` 或 `mbojava.jar`）
3. 运行脚本时查看日志，确认 JAR 文件被成功扫描
4. 检查关键 JAR 文件是否存在：
   ```bash
   dir E:\gitwork\maximoi\maximolib\businessobjects.jar
   dir E:\gitwork\maximoi\maximolib\mbojava.jar
   ```

### 问题 3：JVM 启动失败

**解决方案**：
1. 检查 `jvmPath` 是否正确
2. 确认路径中的反斜杠使用 `\\` 而不是 `\`
3. 运行 `npm run test:java-version` 测试 Java 环境
4. 确认 jvm.dll 文件存在：
   ```bash
   dir D:\usr\java\jdk-17.0.19x64\bin\server\jvm.dll
   ```

### 问题 4：找不到特定的类

某些类可能在不同的 JAR 文件中。如果某个类提取失败：

1. **搜索 JAR 文件**：
   ```bash
   # Windows PowerShell
   Get-ChildItem -Path E:\gitwork\maximoi -Recurse -Filter *.jar | Select-String -Pattern "ScriptService"
   ```

2. **添加额外的 JAR 目录**：
   在 `java-config.json` 中添加新的目录：
   ```json
   {
     "jarDirectories": [
       "E:\\gitwork\\maximoi\\maximolib",
       "E:\\gitwork\\maximoi\\lib",
       "E:\\gitwork\\maximoi\\applications\\maximo\\lib"  // 新增
     ]
   }
   ```

---

## 💡 最佳实践

### 1. 先测试 Java 环境
```bash
npm run test:java-version
```
确认 Java 正常工作后再提取数据。

### 2. 从小规模开始
先提取 1-2 个类，确认配置正确后再批量提取：
```javascript
const classesToExtract = [
    "java.lang.String",  // 基础类，肯定能加载
    "psdi.mbo.MboRemote" // 目标类
];
```

### 3. 定期更新
Maximo 版本升级后，重新提取反射数据以确保 API 同步。

### 4. 备份配置
将 `java-config.json` 加入版本控制（但不包括生成的 JSON 数据文件）。

### 5. 分类管理
按功能模块分组注释类列表，便于维护：
```javascript
const classesToExtract = [
    // MBO Remote 接口
    "psdi.mbo.MboRemote",
    "psdi.mbo.MboSetRemote",
    
    // Script Engine 相关类
    "com.ibm.tivoli.maximo.script.ScriptService",
    
    // Security & Context
    "psdi.security.UserInfo",
    "psdi.common.context.UIContext"
];
```

---

## 📊 提取的数据结构

### MethodInfo
```typescript
interface MethodInfo {
  name: string;           // 方法名
  returnType: string;     // 返回类型（完整类名）
  parameters: string[];   // 参数类型列表
  description: string;    // 方法签名描述
  modifiers: string;      // 修饰符（如 "public abstract"）
  isStatic: boolean;      // 是否静态方法
  isPublic: boolean;      // 是否公开
  isFinal: boolean;       // 是否 final
  isAbstract: boolean;    // 是否抽象
  exceptions: string[];   // 抛出的异常列表
}
```

### FieldInfo
```typescript
interface FieldInfo {
  name: string;           // 字段名
  type: string;           // 字段类型
  modifiers: string;      // 修饰符
  isStatic: boolean;      // 是否静态
  isPublic: boolean;      // 是否公开
  isFinal: boolean;       // 是否 final
}
```

### ConstructorInfo
```typescript
interface ConstructorInfo {
  parameters: string[];   // 参数类型列表
  modifiers: string;      // 修饰符
  isPublic: boolean;      // 是否公开
}
```

---

## 🎯 下一步

提取完成后，你可以：

1. **查看生成的 JSON 文件**：了解类的方法结构
2. **复制到 VSCode 插件**：将 JSON 文件复制到 `maximo-script-vscode-plugin/reflection-data/` 目录
3. **在插件中使用**：VSCode 插件会自动加载这些数据提供代码补全
4. **生成 API 文档**：基于 JSON 数据生成 HTML 或 Markdown 文档

---

## 📝 附录：常用 Maximo 类列表

### 核心 MBO 类
- `psdi.mbo.MboRemote`
- `psdi.mbo.MboSetRemote`
- `psdi.mbo.Mbo`
- `psdi.mbo.MboSet`

### Script Engine 类
- `com.ibm.ism.script.ScriptService`
- `com.ibm.tivoli.maximo.script.ScriptDriverFactory`
- `com.ibm.tivoli.maximo.script.JSR223ScriptDriver`
- `com.ibm.tivoli.maximo.script.AbstractScriptDriver`
- `com.ibm.tivoli.maximo.script.ScriptConstants`
- `com.ibm.tivoli.maximo.script.ScriptEngineContext`
- `com.ibm.tivoli.maximo.script.ScriptService`
- `com.ibm.tivoli.maximo.script.ScriptMboEventListener`
- `com.ibm.tivoli.maximo.script.AttributeLaunchPoint`

### Security 类
- `psdi.security.UserInfo`
- `psdi.security.UserLoginDetails`

### Context 类
- `psdi.common.context.UIContext`

### Server & Workflow
- `psdi.server.MXServer`
- `psdi.workflow.WorkFlowService`

### Application Specific
- `psdi.app.workorder.WORemote`
- `psdi.app.workorder.WOSetRemote`

### JSON & Utilities
- `com.ibm.json.java.JSONArray`
- `com.ibm.json.java.JSONArtifact`
- `com.ibm.json.java.JSONObject`
- `com.ibm.tivoli.maximo.oslc.OslcUtils`

### Java Base
- `java.lang.String`
- `java.lang.Object`

---

**文档版本**：v1.0  
**最后更新**：2026-05-16  
**作者**：Lingma AI Assistant
