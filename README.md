# Maximo Script Helper - VSCode 插件

Maximo自动化脚本开发助手，为VSCode提供智能代码补全、语法提示等功能。

## 功能特性

- ✨ **智能代码补全**：支持Maximo常用对象的API自动补全
- 📝 **JSDoc 类型注释**：通过 `/** @type {ClassName} */` 获得精确的类型提示
- 🔗 **链式调用支持**：自动推断方法返回值类型，支持复杂链式调用
- 🔄 **多版本支持**：兼容Maximo 7.6和9.1
- 💡 **实时提示**：方法说明和参数提示
- 🚀 **高性能缓存**：智能缓存机制，提升补全速度
- ⚙️ **灵活配置**：可启用/禁用 JSDoc 解析和类型推断功能
- 🎯 **JavaScript 专属优化**：针对 JavaScript 语言深度优化的补全体验
- 📦 **脚本管理工具箱**：批量导出、拉取、部署 Maximo 自动化脚本
- 📊 **版本管理**：自动追踪脚本版本历史，支持版本号递增
- 🏷️ **包路径支持**：根据 IBM_PACKAGEPATH 自动创建目录结构
- 🔍 **反射 API 自动生成**：自动扫描 Java 类并生成 TypeScript 声明文件
- 👆 **手动获取反射**：右键点击类名即可快速获取反射信息
- 👤 **用户信息查询**：查看当前用户的详细信息和可用应用程序
- 🌐 **智能语言参数**：自动为所有请求添加 langcode 参数
- 🔄 **本地反射降级**：Maximo 接口失败时自动切换到本地 JAR 反射
- 🛡️ **Push/Pull 版本检查**：推送和拉取脚本时自动对比服务器与本地版本号，防止误覆盖
- 📦 **导出应用XML**：批量导出所有应用的 Presentation XML
- 🗄️ **导出MAXOBJECT**：批量导出数据库对象配置（DBCONFIG JSON）
- 🛠️ **项目初始化**：一键初始化当前工作区的 TypeScript 配置
- 🔧 **修复XML重复ID**：右键菜单快速修复应用XML中重复的 id 属性
- ⬇️ **Pull 应用XML**：右键菜单拉取 Maximo 应用 XML 并自动备份原文件
- 🔄 **修复应用xml推送**：右键菜单获取 SCREENS 脚本源代码并推送修复
- ✏️ **创建脚本**：右键菜单弹出对话框创建新脚本，支持多种脚本类型和启动点配置
- 📥 **导入脚本**：右键 JSON 文件导入脚本到 Maximo，支持创建和更新脚本

## 安装

### 方式一：从市场安装（待发布）
```bash
# 在VSCode扩展市场搜索 "Maximo Script Helper"
```

### 方式二：本地安装
```bash
# 1. 进入插件目录
cd maximo-script-vscode-plugin

# 2. 安装依赖
npm install

# 3. 编译插件
npm run compile

# 4. 打包插件
npm run package

# 5. 在VSCode中安装生成的 .vsix 文件
```

## 配置

### 打开配置面板

1. 点击状态栏的 **Maximo配置** 按钮
2. 或按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
3. 输入 `Maximo Script: 打开配置`
4. 或直接运行命令：`maximoScript.showConfig`

### 配置项说明

#### 连接配置
- **服务器地址**：Maximo服务器的完整URL（例如：http://localhost:9080/maximo）
- **认证方式**：支持 MAXAUTH 或 API Key 两种认证方式
- **API 类型**：选择 OSLC 或 REST API
- **Maximo版本**：选择您的Maximo版本（7.6 或 9.1）
- **别名（Alias Name）**：用于推送脚本时保存历史记录
- **脚本存放目录**：配置拉取脚本的存储根目录（默认为 masscript）

#### 补全设置
- **启用代码补全**：开启/关闭智能补全功能
- **启用 JSDoc 类型注释解析**：从 `/** @type {ClassName} */` 注释中提取变量类型
- **启用返回值类型推断**：支持链式调用的类型推导
- **本地API数据目录**：指向包含 JSON API 反射数据的目录

### 获取MAXAUTH

```javascript
// 在浏览器控制台执行
btoa('maxadmin:123456')
// 返回：bWF4YWRtaW46MTIzNDU2
```

## 使用方法

### 代码补全

插件专为 **JavaScript** 语言优化，在 `.js` 文件中提供智能补全。

#### 1. 隐式变量补全

Maximo 脚本中的默认变量无需声明即可使用：

```javascript
// 输入 mbo. 后会显示MBO相关方法
mbo.getString("assetnum")
mbo.setValue("description", "Test")

// 输入 mboset. 后会显示集合操作方法
mboset.moveFirst()
mboset.count()

// 输入 service. 后会显示可用的方法
service.log("Test message")
service.getMboSet("ASSET", userInfo)
```

#### 2. JSDoc 类型注释补全（新功能）✨

通过 JSDoc 注释为变量指定类型，获得精确的方法补全：

```javascript
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// 现在输入 assetMbo. 会显示 MboRemote 的所有方法
assetMbo.getString("assetnum");
assetMbo.getInt("priority");
```

**支持的格式**：
- 标准多行注释：`/** @type {ClassName} */\nvar variable;`
- 单行注释：`/** @type {ClassName} */ var variable;`
- 多变量声明：`/** @type {ClassName} */ var var1, var2;`
- 表达式映射：`/** @type {ClassName} b3.getMbo(\d) */`

详见：[JSDoc 补全功能使用指南](https://gitee.com/shoukaiseki/maximo-script-vscode-plugin/blob/master/JSDOC_COMPLETION_GUIDE.md)

#### 3. 链式调用支持（新功能）✨

插件会自动推断方法返回值类型，支持复杂的链式调用：

```javascript
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// 自动推断 locationSet 为 MboSetRemote
var locationSet = assetMbo.getMboSet("LOCATIONS");

// 输入 locationSet. 会显示 MboSetRemote 的方法
locationSet.moveFirst();
locationSet.count();

// 自动推断 firstLocation 为 MboRemote
var firstLocation = locationSet.moveFirst();
firstLocation.getString("location");
```

#### 4. 本地 API 数据补全

1. **获取 API 数据**：
   - 访问 Gitee 仓库：https://gitee.com/shoukaiseki/maximo-script-editor/tree/master/reflection-data
   - 下载或克隆 `reflection-data` 目录到本地
   - 例如保存到：`E:\maximo-reflection-data`（或其他任意位置）

2. **配置本地 API 目录**：
   - 打开配置面板（点击状态栏的 ⚙️ Maximo配置 按钮）
   - 切换到“补全设置”标签
   - 点击“选择目录”按钮
   - 选择你保存的 `reflection-data` 目录
   - 保存配置

3. **使用离线补全**：
   - 插件会自动加载目录中的所有 JSON 文件
   - 支持智能匹配类名（如 MboRemote、MboSetRemote 等）
   - 提供完整的方法签名和参数提示

4. **已支持的类**：
   - `psdi.mbo.MboRemote` - MBO 远程对象
   - `psdi.mbo.MboSetRemote` - MBO 集合远程对象
   - `com.ibm.ism.script.ScriptService` - 脚本服务
   - `psdi.security.UserInfo` - 用户信息
   - `psdi.app.workorder.WORemote` - 工单远程对象
   - `psdi.app.workorder.WOSetRemote` - 工单集合远程对象
   - `java.lang.String` - Java 字符串类
   - `java.lang.Object` - Java 对象基类
   - 等等...（共 15 个类）
   - 提供完整的方法签名、参数类型和异常信息
   - 无需连接 Maximo 服务器即可使用

5. **如何生成 reflection-data**：
   - 如果你有 Maximo 环境，可以自行提取 API 数据
   - 查看详细说明：[Reflection Data 提取指南](https://gitee.com/shoukaiseki/maximo-script-editor/blob/master/REFLECTION_EXTRACT_GUIDE.md)
   - 支持从 Maximo JAR 包中自动提取所有类的方法信息

6. **支持的 API 文件格式**：
   ```json
   {
     "className": "psdi.mbo.MboRemote",
     "methods": [
       {
         "name": "getString",
         "returnType": "java.lang.String",
         "parameters": ["java.lang.String"],
         "description": "String getString(String)",
         "isPublic": true
       }
     ]
   }
   ```

### ✨ 反射 API 自动生成（新功能）

插件支持自动扫描 JavaScript 文件中的 Java 类名，并调用 Maximo 接口获取反射信息，自动生成 TypeScript 声明文件。

#### 开启自动生成

1. 打开配置面板 → “补全设置”
2. 勾选 **“自动生成反射API”**
3. 确保 Maximo 系统中已部署 `SKS_REFLECT_HELPER_ENHANCED` 脚本

#### 自动工作流程

```javascript
// 1. 在 JS 文件中写下 Java 类名
/** @type {psdi.mbo.MboRemote} */
var mbo = service.getMboSet("ASSET", userInfo).moveFirst();

// 2. 插件自动检测并后台获取反射信息
// 3. 自动生成 .d.ts 文件到 javaapi 目录
// 4. 更新 global.d.ts 添加引用
// 5. 下次输入 mbo. 时获得精确的智能补全
```

#### 手动获取反射（推荐）

对于特定的 Java 类，您可以手动触发反射获取：

**步骤：**
1. 在 `.js` 文件中选中 Java 类名（如：`java.util.Base64$Encoder`）
2. 右键点击选中的文本
3. 选择以下任一选项：
   - **“Maximo Script: 通过maximo接口获取类反射信息”** - 调用 Maximo 接口
   - **“Maximo Script: 通过本地反射获取类反射信息”** - 使用本地 JAR 包反射
4. 等待处理完成
5. 自动生成 `.d.ts` 文件到工作区根目录的 `javaapi` 文件夹

**示例：**
```javascript
// 选中这一行中的类名
/** @type {java.util.Base64$Encoder} */
Base64Encoder = Java.type("java.util.Base64$Encoder");

// 右键 → “通过maximo接口获取类反射信息” 或 “通过本地反射获取类反射信息”
// 自动生成：javaapi/java/util/Base64/Encoder.d.ts
```

**优势：**
- ✅ 无视忽略列表，强制获取任何类
- ✅ 立即生成，不等待后台扫描
- ✅ 适合调试和快速添加新类

#### 生成的文件结构

```
工作区根目录/
└── javaapi/                    ← 自动生成
    ├── global.d.ts            ← 主索引文件（自动更新）
    ├── .maximoScriptClass.json ← 缓存记录
    └── java/
        └── util/
            └── Base64/
                ├── Encoder.d.ts    ← 生成的声明文件
                └── Decoder.d.ts    ← 生成的声明文件
```

#### 支持的 Java 包名

插件支持所有合法的 Java 包名，包括：
- ✅ `cn.shoukaiseki.*` （中国域名）
- ✅ `io.netty.*` （输入输出）
- ✅ `com.ibm.*` （商业组织）
- ✅ `org.apache.*` （非营利组织）
- ✅ `java.util.*` （Java 标准库）
- ✅ `psdi.mbo.*` （Maximo 核心）
- ✅ 内部类：`java.util.Base64$Encoder`

#### 注意事项

- ⚠️ 需要配置 Maximo 服务器地址和认证信息
- ⚠️ Maximo 系统中必须部署 `SKS_REFLECT_HELPER_ENHANCED` 脚本
- ⚠️ 首次获取可能需要几秒钟时间
- ⚠️ 生成的文件保存在工作区根目录的 `javaapi` 文件夹

### 脚本管理工具箱

打开配置面板后，切换到“工具箱”标签页，可以使用以下功能：

#### 1. 批量导出脚本

- 点击“导出所有脚本”按钮
- 选择导出目录
- 插件会自动导出所有脚本的元数据（JSON）和源代码（JS/PY）
- 导出目录会以时间戳命名（例如：`autoscript_backup_20260521_013000`）

#### 2. 拉取单个脚本

- 在脚本列表中点击“拉取”按钮
- 插件会根据 `ibm_packagepath` 字段自动创建目录结构
- 同时保存 JSON 配置文件和源代码文件
- 如果文件已存在，会提示是否覆盖
- **版本检查**：服务器版本低于本地时，生成服务器版本文件供对比，不覆盖本地文件

#### 3. 推送脚本到 Maximo

- 在编辑器中打开 JavaScript 文件
- 右键点击编辑器 → “推送到 Maximo”
- 插件会：
  1. **版本检查**：对比服务器与本地版本号，服务器版本高于本地时阻止推送
  2. 自动保存历史记录（包含版本号、主机名、别名）
  3. 递增版本号（从 JSON 文件中读取并 +1）
  4. 将脚本推送到 Maximo 服务器

#### 4. 查询脚本列表

- 点击“刷新”按钮
- 显示所有 Maximo 自动化脚本的列表
- 支持快速搜索和过滤

#### 5. 导出应用XML

- 点击“导出应用XML”标签页
- 选择导出目录（自动持久化保存）
- 可选是否自动生成带时间戳的备份目录
- 点击“导出”按钮，调用 SCREENS 脚本批量导出所有应用的 Presentation XML
- 每个应用保存为 `{APP_NAME}.xml` 文件

#### 6. 初始化当前项目

- 点击“初始化当前项目”标签页
- 点击“初始化”按钮，从插件模板复制 TypeScript 配置到当前工作区
- 已存在的配置文件不会被覆盖
- 点击“查看配置模板”可打开插件的 public/config 目录

#### 7. 脚本来源说明

本插件的部分工具脚本来源于 **Sharptree Maximo Script Deploy** 扩展：

- **来源项目**：[Sharptree Maximo Script Deploy](https://marketplace.visualstudio.com/items?itemName=sharptree.maximo-script-deploy)
- **包含的脚本**：
  - `SHARPTREE.AUTOSCRIPT.STORE` - Sharptree 自动化脚本存储
  - `SHARPTREE.AUTOSCRIPT.EXTRACT` - Sharptree 自动化脚本提取
  - `SHARPTREE.AUTOSCRIPT.LOGGING` - Sharptree 日志流式传输
  - `SHARPTREE.AUTOSCRIPT.DEPLOY` - Sharptree 自动化脚本部署
  - `SHARPTREE.AUTOSCRIPT.SCREENS` - Sharptree 屏幕脚本
  - `SHARPTREE.AUTOSCRIPT.FORM` - Sharptree 表单脚本
  - `SHARPTREE.AUTOSCRIPT.LIBRARY` - Sharptree 部署库脚本
  - `SHARPTREE.AUTOSCRIPT.ADMIN` - Sharptree 管理脚本

这些脚本提供了强大的 Maximo 自动化脚本管理功能，感谢 Sharptree 团队的贡献！

### 支持的补全对象

- `service` - 脚本服务对象
- `mbo` - MBO对象
- `mboSet` - MBO集合对象
- `userInfo` - 用户信息对象

## 开发

### 项目结构

```
maximo-script-vscode-plugin/
├── src/
│   ├── extension.ts          # 插件入口
│   ├── completionProvider.ts # 代码补全提供者
│   └── configPanel.ts        # 配置面板
├── package.json              # 插件配置
├── tsconfig.json             # TypeScript配置
└── webpack.config.js         # Webpack配置
```

### 开发流程

```bash
# 1. 安装依赖
npm install

# 2. 启动开发模式（自动编译）
npm run watch

# 3. 在VSCode中按 F5 启动调试
```

### 构建发布

```bash
# 生产环境编译
npm run compile

# 打包插件
npm run package

# 发布到市场（需要配置publisher）
npm run publish
```

## 技术栈

- **TypeScript** - 主要开发语言
- **VSCode API** - 插件开发框架
- **Webpack** - 模块打包工具
- **Axios** - HTTP请求库

## 常见问题

### Q: 代码补全不工作？

A: 请检查：
1. 是否在设置中启用了代码补全
2. 是否配置了正确的服务器地址
3. 文件类型是否为 `.js` 或 `.py`

### Q: 如何更新补全数据？

A: 修改配置后会自动刷新缓存，或者重启VSCode

### Q: 支持哪些Maximo版本？

A: 目前支持Maximo 7.6和9.1

## 许可证

MIT License

## 相关资源

- **[Reflection Data 提取指南](https://gitee.com/shoukaiseki/maximo-script-editor/blob/master/REFLECTION_EXTRACT_GUIDE.md)** - 如何从 Maximo JAR 包中提取 API 数据
- **[JSDoc 补全功能使用指南](https://gitee.com/shoukaiseki/maximo-script-vscode-plugin/blob/master/JSDOC_COMPLETION_GUIDE.md)** - 详细的 JSDoc 类型注释和智能补全使用说明
- **[快速开始](./QUICK_START.md)** - 5分钟快速上手指南
- **[Gitee 仓库 - Maximo Script Editor](https://gitee.com/shoukaiseki/maximo-script-editor)** - Reflection Data JSON 生成工具和预生成的 API 数据

## 版本更新历史

### v1.4.18 (2026-07-11)

**修复**：
- 🐛 修复 JSON 配置中 `loglevel` 属性大小写错误
- 🐛 修复字段启动点脚本选择时 `eventtype` 未自动设置的问题

**新增功能**：
- ✨ 模板变量替换功能，支持 `${sks_scriptName}` 自动替换为脚本名
- ✨ 新增 COMMON_FUNC 通用函数脚本类型，自动设置 `interface=1`

**优化**：
- 🔧 脚本名称、启动点、对象名称、属性名称输入后自动转大写
- 🔧 精简生成的 JSON 配置，移除不必要的空字段

### v1.4.16 (2026-07-11)

**新增功能**：
- ✨ 新增「创建脚本」右键菜单功能
  - 在资源管理器中右键点击目录或文件，选择 "Maximo Script: 创建脚本"
  - 弹出对话框，通过标签页选择普通脚本、对象启动点脚本、字段启动点脚本等
  - 根据选择的脚本类型自动匹配模板文件（`SKS_TMPL_{scriptType}.js`）
  - 脚本名称按 `.` 分割自动填充对象名称和属性名称
  - 添加 `ibm_packagepath` 输入框，自动根据目录位置生成包名
  - AppBean/DataBean 脚本自动设置 `interface=1`，其他类型 `interface=0`
  - 创建成功后弹出提示，支持打开 JS/JSON 文件

- ✨ 新增「导入脚本」右键菜单功能（仅对 JSON 文件显示）
  - 读取 JSON 文件中的 `autoscript` 字段获取脚本名
  - 弹出确认对话框，确认后开始导入
  - 先调用历史记录保存接口（`SKS_AUTOSCRIPT_HISTORY_SAVE`）
  - 检查脚本是否存在：存在则更新，不存在则创建新脚本
  - 支持导入启动点、变量等完整配置
  - 导入成功或失败弹窗通知

### v1.4.10 (2026-06-25)

**新增功能**：
- ✨ 新增「修复应用xml推送」右键菜单功能
  - 在 XML 文件中右键点击，选择 "Maximo Script: 修复应用xml推送"
  - 通过 `SKS_EXP_AUTOSCRIPTBYNAME` 获取 `SHARPTREE.AUTOSCRIPT.SCREENS` 脚本源代码
  - 通过 `MXAPIAUTOSCRIPT` PATCH 接口推送修复脚本
  - 显示进度提示，成功或失败弹窗通知

---

### v1.4.5 (2026-06-25)

**新增功能**：
- ✨ 工具箱新增「导出MAXOBJECT」标签页，批量导出数据库对象配置（DBCONFIG JSON）
  - 支持配置文件过滤（onlyInclude、includeMaxobjects、ignoreMaxobjects）
  - 多线程并发导出（默认5个并发）
  - 导出目录独立持久化配置
  - **新增精简/完整模式开关**：开启精简模式后导出时忽略默认值字段（传递 ignoreDefVal=true）
- ✨ 新增「Pull 应用 XML」右键菜单
  - 支持编辑器和资源管理器右键菜单
  - 解析 presentation id 并与文件名对比校验
  - 自动备份原文件到 `~/.sks/maxbackup/maxappxmlbackup/maxappxml/`
  - 用从 Maximo 获取的内容覆盖原文件

---

### v1.4.3 (2026-05-20)

**新增功能**：
- ✨ 新增「修复应用XML重复ID」右键菜单，自动检测并修复 XML 文件中重复的 id 属性，保留注释内容

---

### v1.4.2 (2026-06-10)

**新增功能**：
- ✨ 工具箱新增“初始化当前项目”标签页，一键初始化 TypeScript 配置
- ✨ 工具箱新增“导出应用XML”标签页，批量导出所有应用的 Presentation XML
- ✨ 新增 `exportXmlDirectory` 独立持久化配置项，与导出脚本目录分离

**改进优化**：
- 🔧 工具箱标签页布局优化，支持多行显示且单个标签不换行
- 🐛 修复初始化项目配置时跳过文件通知未弹出的问题

---

### v1.4.0 (2026-06-08)

**新增功能**：
- ✨ Push/Pull 版本检查
  - 推送脚本前自动对比服务器与本地版本号
  - 服务器版本高于本地时：拉取服务器脚本供查看，阻止推送避免覆盖
  - 拉取脚本时服务器版本低于本地：生成服务器版本文件供对比，不覆盖本地文件
  - 左下角状态栏显示警告，点击可打开服务器版本文件
  - 同时弹出右下角错误提示

---

### v1.3.9 (2026-06-05)

**新增功能**：
- ✨ 导出脚本功能增强
  - 新增“自动生成带时间戳的子目录”配置项
  - 按 `ibm_packagepath` 字段自动创建包名目录结构（永久生效）
  - 支持两种导出模式：
    • 未勾选：创建时间戳子目录 + 按包名组织
    • 勾选：直接保存到选择的目录 + 按包名组织

**修复问题**：
- 🐛 修复导出脚本时无法识别 `ibm_packagepath` 字段的问题
  - 优先使用 `ibm_packagepath`，兼容 `PACKAGEPATH`
  - 添加空值检查，确保字段存在且不为空字符串

---

### v1.3.7 (2026-06-03)

**问题修复**：
- 🐛 修复清除脚本时 JSON 文件路径传递问题
  - React State 异步更新导致数据丢失
  - 后端直接传递 `jsonPath` 参数,避免依赖 state
  - 前端优先使用参数值,fallback 到 state
- 🐛 修复确认对话框重复弹出的问题
  - React `useEffect` 中事件监听器重复添加
  - 使用相同函数引用进行添加和移除
  - 确保组件重新渲染时正确清理旧监听器

---

### v1.3.6 (2026-05-25)

**问题修复**：
- 🐛 修复工具箱导入带启动点的脚本时的错误
  - 使用工具箱的“导入脚本”功能时，过滤 `launchpoints` 中的虚拟字段
  - 忽略 `eventtype` 等不应该发送到 Maximo 的字段
  - 忽略 `sks:` 开头的自定义字段
  - 确保只保留有效的启动点配置信息

---

### v1.3.5 (2026-05-25)

**新增功能**：
- ✨ XML 推送认证配置
  - 新增"推送 XML 到 Maximo 时始终使用 MAXAUTH 认证方式"配置项
  - 支持 VSCode 配置和环境配置双重持久化
  - 不同环境可独立配置，新环境默认值为 true
  - 提供清晰的帮助文本说明

**改进优化**：
- 🔧 XML 推送逻辑优化
  - 根据配置动态选择认证方式（MAXAUTH 或当前认证）
  - 简化导出后提示，只显示"打开源代码文件"选项
  - 扩展脚本语言类型映射，支持更多命名格式
    - 新增：ECMAScript、JavaScript、JS、Nashorn、MBR 等
    - 统一映射到 .js 扩展名

---

### v1.3.3 (2026-05-25)

**新增功能**：
- ✨ 本地反射获取功能
  - 新增右键菜单“通过本地反射获取类反射信息”
  - 使用 JDK 8 编译 LocalReflectHelper.java
  - 返回与 SKS_REFLECT_HELPER_ENHANCED 相同的 JSON 格式
  - 支持 jarDirectories 和 additionalJars 两种配置方式
  - 正确遍历 JAR 目录中的所有 .jar 文件

- ✨ 自动生成反射 API 降级策略
  - 在“自动生成反射API”下方新增“自动通过本地jar生成反射API”配置项
  - 当 Maximo 接口调用失败时，自动尝试本地反射作为降级方案
  - 两种方式都失败才计入失败次数
  - 日志清楚显示数据来源（Maximo接口 或 本地JAR）

**修复问题**：
- 🐛 修复 classpath 构建逻辑
  - 正确遍历 jarDirectories 目录中的所有 .jar 文件
  - 添加 additionalJars 中的单个 JAR 文件
  - 参考 completionProvider.ts 的 buildClasspath() 方法
- 🐛 修复程序无法正常退出问题
  - 添加 System.exit(0) 确保 JVM 正常退出
  - 避免程序挂起或死循环
- 🐛 优化超时处理
  - 增加超时时间从 30 秒到 60 秒
  - 增加 maxBuffer 到 10MB
  - 区分超时错误和其他错误类型

**改进优化**：
- 🔧 完善错误处理和日志输出
  - 详细的 classpath 构建日志
  - JAR 包配置优化提示
  - 清晰的错误分类和解决建议
- 🔧 重命名右键菜单项
  - “获取类反射信息” → “通过maximo接口获取类反射信息”
  - 更清晰地说明功能来源

---

### v1.3.2 (2026-05-30)

**新增功能**：
- ✨ 用户信息查询增强
  - 测试连接改用 `SKS_CURRENT_USER_INFO` 接口
  - 显示详细用户信息：用户名、人员ID、语言代码、区域设置
  - 添加“查看用户语言信息”按钮，弹窗展示完整信息
  - 包含四个部分：用户基本信息、人员详细信息、用户账户信息、可用应用程序
  - MaxApps 表格形式展示，支持滚动查看

- ✨ 智能 langcode 参数注入
  - 所有 HTTP 请求自动根据配置添加 `_langcode` 参数
  - 正确处理 URL 中的锚点（#）和查询参数（?）
  - 只在设置了语言代码时才添加参数
  - 从 VSCode 全局配置中读取 langcode 值

**改进优化**：
- 🔧 统一接口调用
  - 测试连接和查看用户信息使用同一接口
  - 减少维护成本，保持一致性

- 🔧 URL 处理逻辑模块化
  - 将 langcode 参数处理集中在 httpRequest.ts
  - 无需在每个调用处单独处理

---

### v1.2.1 (2026-05-21)

**新增功能**：
- ✨ 脚本管理工具箱
  - 批量导出所有 Maximo 自动化脚本
  - 拉取单个脚本并自动创建包路径目录结构
  - 查询脚本列表并支持搜索过滤
- 📊 版本管理系统
  - 推送脚本时自动保存历史记录（SKS_AUTOSCRIPT_HISTORY_SAVE）
  - 自动递增版本号（从 JSON 文件读取并 +1）
  - 记录主机名、别名等信息
- 🏷️ IBM_PACKAGEPATH 支持
  - 根据 `ibm_packagepath` 字段自动创建目录结构
  - 支持点号转斜杠（例如：`com.example.script` → `com/example/script`）
- ⚙️ 配置项增强
  - 添加“别名（Alias Name）”配置，用于历史记录
  - 添加“脚本存放目录”配置，自定义存储根目录

**修复问题**：
- 🐛 修正 API 调用错误
  - 拉取脚本时使用正确的 API：`SKS_GET_AUTOSCRIPTINFOBYNAME`
  - 工具箱导出时使用正确的 API 和字段名（小写 `ibm_packagepath`）
- 🐛 删除重复的认证头设置
  - `httpRequestToMaximo` 已自动处理认证，无需在调用处重复设置
- 🐛 Base64 编码问题
  - 使用 `Buffer.from().toString('base64')` 替代浏览器 API `atob()`
- 🐛 代码重构
  - 统一推送逻辑，删除重复的 `pushScriptToMaximo` 函数
  - 优化版本号管理，避免重复读取 JSON 文件

**改进**：
- 🔧 优化 HTTP 请求模块
  - 简化 URL 拼接逻辑
  - 统一认证头处理方式
- 📝 完善日志输出
  - 添加详细的调试信息
  - 改进错误提示，显示完整响应数据

---

### v1.1.1 (2026-05-17)

**新增功能**：
- ✨ 完善 Maximo 9.1 MXSCRIPT API 支持
  - 更新接口使用 `POST + x-method-override: PATCH` 方法
  - 更新时 URL **不能加** `?lean=1`（避免静默失败）
  - Body 必须使用 `spi:` 前缀
  - 字段名必须小写（如 `spi:description`）

**修复问题**：
- 🐛 修正 SKILL.md 文档中 MXSCRIPT 更新接口的说明
- 🐛 优化 .vscodeignore 配置，排除不必要的开发文件
- 🐛 删除 webview-ui 目录下的重复嵌套目录

**改进**：
- 📝 更新自动化脚本 API 调用技能文档
- 🔧 优化插件打包流程，减小 VSIX 文件大小

---

### v1.1.0 (之前版本)

**主要功能**：
- ✨ React Webview UI 重构
- ✨ 智能代码补全和 JSDoc 类型注释支持
- ✨ 链式调用类型推断
- ✨ 本地 API 数据离线补全
- ✨ Maximo 7.6 和 9.1 多版本支持

---

## 作者

shoukaiseki

## 反馈与建议

如有问题或建议，请提交Issue。
