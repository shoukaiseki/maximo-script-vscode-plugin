# 更新日志 (Changelog)

所有重要的项目更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.2.10] - 2026-05-27

### 新增功能

#### Maximo 反射 API 自动生成
- ✨ 新增“自动生成反射API”配置项
  - 位置：maximo配置 → 补全设置 → 启用类型推断下方
  - 默认关闭，需要用户手动开启
  - 开启后自动检测 Java 类型并调用 Maximo 接口获取反射信息

- ✨ 反射数据管理器（ReflectionDataManager）
  - 持久化存储已处理的类名列表（`.maximoScriptClass.json`）
  - 忽略列表管理（`.ignoreMaximoScriptClass.json`）
    - 永久忽略（retryCount = -1）：类不存在时
    - 临时失败（retryCount < 10）：网络错误等可重试情况
    - 达到最大重试次数（retryCount >= 10）：停止重试但保留记录
  - 防抖机制：同一类 5 秒内只请求一次
  - 插件启动时自动初始化，复制初始文件到 javaapi 目录

- ✨ TypeScript 声明文件生成器（DtsGenerator）
  - 将 Maximo 反射 JSON 数据转换为 `.d.ts` 文件
  - Java 类型到 TypeScript 类型映射
    - `java.lang.String` → `string`
    - `int/long/double` → `number`
    - `boolean` → `boolean`
    - `void` → `void`
  - 自动生成 JSDoc 注释
  - 支持命名空间声明
  - 按包名创建目录结构，避免单目录文件过多

- ✨ 后台反射获取机制
  - 异步执行，不阻塞当前补全响应
  - 自动保存 JSON 数据到 `reflection-data` 目录
  - 自动生成 `.d.ts` 文件到 `javaapi` 目录
  - 更新元数据文件
  - 重新加载补全缓存，使新生成的类型立即可用

### 技术实现

- 📦 新增文件
  - `src/reflectionDataManager.ts` - 反射数据管理器
  - `src/dtsGenerator.ts` - .d.ts 文件生成器

- 🔧 修改文件
  - `src/httpRequest.ts`
    - 新增 `fetchClassReflection()` 方法，调用 `SKS_REFLECT_HELPER` 接口
  
  - `src/completionProvider.ts`
    - 添加 `autoGenerateReflectionApi` 配置项
    - 集成 ReflectionDataManager 和 DtsGenerator
    - 实现 `triggerReflectionFetch()` 后台反射获取方法
    - 实现 `saveReflectionJson()` 保存 JSON 数据
    - 实现 `generateDtsFile()` 生成 .d.ts 文件
    - 在 `getReflectionSuggestions()` 中触发后台反射获取
  
  - `webview-ui/src/App.tsx`
    - 添加“自动生成反射API”勾选框
    - 添加配置说明和帮助文本
  
  - `package.json`
    - 添加 `maximoScript.autoGenerateReflectionApi` 配置项定义

### 注意事项

- ⚠️ 该功能依赖 Maximo 系统中已部署 `SKS_REFLECT_HELPER` 脚本
- ⚠️ 默认关闭，不影响现有用户的补全体验
- ⚠️ 后台反射获取失败不会影响当前补全功能
- ⚠️ jscustom 包名的类、custom 和 global 类名会被自动跳过
- ⚠️ **数据存储路径**：
  - `javaapi/` - 存储在项目根目录（以便 VSCode 识别 `.d.ts` 文件）
  - `~/.sks/maximo-script-helper/reflection-data/` - 存储 JSON 原始数据

---

## [1.2.8] - 2026-05-27

### 新增功能

#### MAXAUTH 会话隔离
- ✨ 为 MAXAUTH 认证方式创建专用的 JSESSIONID 缓存
  - 新增 `globalMaxAuthJSESSIONID` 全局变量
  - 与 API Key 的 `globalJSESSIONID` 完全隔离
  - 避免两种认证方式的会话冲突

- ✨ 智能会话选择机制
  - 根据 `authType` 自动选择正确的 JSESSIONID
  - 支持 `authTypeIn` 参数覆盖（强制使用指定认证方式）
  - XML 推送强制使用 MAXAUTH 认证（`authTypeIn: 'maxauth'`）

- ✨ 增强的 Cookie 管理
  - 请求时根据认证类型设置对应的 JSESSIONID Cookie
  - 响应时根据认证类型缓存对应的 JSESSIONID
  - `clearJSESSIONID()` 同时清除两种认证的会话信息

### 改进优化

#### HTML 渲染参数化控制
- 🔧 `sendMessageToWebview` 方法添加 `useHtml` 参数
  - 默认值为 `false`，向后兼容
  - 只有明确需要的地方才启用 HTML 渲染
  - 不影响其他调用该方法的地方

- 🔧 双重消息格式策略
  - **HTML 版本**：用于前端 Webview 显示（支持 `<br>`、`<b>` 等标签）
  - **纯文本版本**：用于 VSCode 原生通知（不支持 HTML）
  - 错误提示在两种场景下都能正确显示格式化内容

#### XML 推送优化
- 🔧 强制使用 MAXAUTH 认证
  - XML 推送必须使用 MAXAUTH 授权方式
  - 添加 `noAuth: true` 避免重复认证头
  - 通过 `authTypeIn: 'maxauth'` 强制指定认证类型

- 🔧 改进错误消息格式
  - 提供清晰的故障排查指引
  - 提示用户需要使用 MAXAUTH 授权方式
  - 提示清除 Cookie 缓存的操作步骤

#### 用户体验优化
- 🔧 认证类型选项优化
  - API Key 标注为"推荐默认"
  - 帮助用户理解不同认证方式的适用场景

- 🔧 日志增强
  - 显示当前使用的认证类型（便于调试）
  - 区分 MAXAUTH 和 API Key 的会话缓存状态

### 问题修复

#### 脚本导入功能修复
- 🐛 修复导入脚本时变量信息和启动点没有导入的问题
  - **问题描述**：导入脚本时，JSON 配置文件中的变量信息（variables）和启动点（launchPoints）未被正确处理
  - **根本原因**：部署逻辑中未完整处理所有自定义字段的转换和传递
  - **解决方案**：完善 `_deployScript` 方法中的字段遍历逻辑
    - 确保所有非特殊字段都正确添加 `spi:` 前缀
    - 正确处理 `launchPoints` 数组的嵌套结构转换
    - 保留所有原始配置信息并传递给 Maximo API
  - **影响范围**：单个脚本部署和批量脚本导入功能

### 技术实现

- 📦 修改文件
  - `src/httpRequest.ts`
    - 新增 `globalMaxAuthJSESSIONID` 全局变量
    - 修改请求拦截器，根据 `authType` 选择 JSESSIONID
    - 修改响应处理，根据 `authType` 缓存 JSESSIONID
    - 修改 `clearJSESSIONID()` 函数，清除所有会话
    - 支持 `authTypeIn` 参数覆盖认证类型
    - MAXAUTH 认证直接设置 `MAXAUTH` 请求头
  
  - `src/configPanel.ts`
    - 修改 `sendMessageToWebview` 方法签名，添加 `useHtml` 参数
    - XML 推送添加前置配置检查（服务器地址、MAXAUTH）
    - 实现双重消息格式（HTML + 纯文本）
    - 强制使用 MAXAUTH 认证（`authTypeIn: 'maxauth'`）
    - 添加 `noAuth: true` 避免重复认证
  
  - `webview-ui/src/App.tsx`
    - 修改 `pushXmlError` 消息处理逻辑
    - 根据 `useHtml` 参数决定是否直接使用 HTML 格式
    - 移除额外的包装文本（避免重复显示）

### 注意事项

- ⚠️ MAXAUTH 和 API Key 的会话完全隔离，互不干扰
- ⚠️ XML 推送必须使用 MAXAUTH 认证方式
- ⚠️ 切换环境或点击"测试连接"时会清除所有会话信息
- ⚠️ `useHtml` 参数默认为 `false`，确保向后兼容性

---

## [1.2.7] - 2026-05-27

### 新增功能

#### 环境管理功能
- ✨ 多环境配置管理
  - 环境名称输入框（支持新增和修改环境）
  - "切换环境"按钮（弹出对话框选择已有环境）
  - "保存环境"按钮（将当前配置保存到 envs.json）
  - 当前环境名称显示（Label 中加粗显示）

- ✨ 环境选择对话框
  - 模态对话框设计（半透明背景遮罩）
  - 环境列表展示（每个环境一行）
  - 当前环境高亮显示（蓝色边框 + 浅色背景）
  - 每个环境有"加载"和"删除"两个按钮
  - 点击背景或关闭按钮可关闭对话框

- ✨ 删除环境功能
  - 自定义确认对话框（div 形式，非原生 confirm）
  - 红色警告样式
  - 二次确认防止误删
  - 删除后自动刷新环境列表

- ✨ 密码显示/隐藏功能
  - MaxAuth 输入框添加眼睛图标按钮
  - API Key 输入框添加眼睛图标按钮
  - 点击图标切换明文/密文显示
  - 👁️ 表示显示，🙈 表示隐藏

### 改进优化

- 🔧 环境配置持久化
  - 切换环境后自动更新 VSCode 配置（envnum）
  - 重新加载窗口后自动恢复最后使用的环境
  - 从 envs.json 加载环境详细配置
  - 保存环境时自动刷新前端环境列表

- 🔧 UI 交互优化
  - 环境名称输入不自动保存（需手动点击保存按钮）
  - 避免频繁写入 envs.json
  - 其他字段仍保持自动保存

### 技术实现

- 📦 新增文件
  - `src/envConfig.ts` - 环境配置管理模块
  - 配置文件路径：`~/.sks/maximo-script-helper/envs.json`

- 🔧 修改文件
  - `package.json` - 添加 envnum 配置项
  - `src/configPanel.ts` - 环境加载、保存、删除逻辑
  - `webview-ui/src/App.tsx` - 环境选择器 UI、删除确认对话框、密码显示切换

---

## [1.2.5] - 2026-05-25

### 新增功能

#### Maximo 日志级别管理
- ✨ 新增日志管理菜单（左侧导航栏）
  - **日志级别查询**标签页
    - 查询所有日志器当前级别
    - 表格展示：日志器名称、当前级别、更改级别、操作
    - 支持下拉框直接修改单个日志器级别（实时更新到 Maximo）
    - 支持重新加载单个日志器
    - 支持搜索过滤
  - **日志级别配置**标签页
    - 可编辑表格（添加/删除行）
    - JSON 源码编辑模式
    - 🚀 更新到 Maximo 按钮（调用 API 批量更新）
    - 💾 保存到本地按钮（持久化到配置文件）

- ✨ 后端 API 集成
  - `_loadLoggerConfig()` - 加载本地配置
  - `_saveLoggerConfig()` - 保存配置到本地
  - `_queryLoggerLevel()` - 调用 `SKS_LOGGER_LEVEL_QUERY` API
  - `_updateLoggerLevel()` - 调用 `SKS_LOGGER_LEVEL_UPDATE` API
  - `_getLoggerConfigPath()` - 获取配置文件路径

- ✨ 本地配置持久化
  - 配置文件路径：`~/.sks/maximo-script-helper/logger-config.json`
  - 自动创建目录
  - JSON 格式读写
  - 重启后保留配置

#### 域（Domain）导入功能
- ✨ 新增 SKS_DEPLOY_DOMAIN API 接口文档
  - 支持批量创建或更新 Maximo 域
  - 支持 ALN、NUMERIC、SYNONYM 等多种域类型
  - 支持删除操作（`_delete: true`）
  - 幂等性保证，多次执行不会产生重复数据

- ✨ HELP.md 添加详细的域导入使用说明
  - 完整的 JSON 请求体示例
  - 字段说明表格
  - cURL 命令示例
  - 注意事项和最佳实践

### 改进

#### TypeScript 错误修复
- 🔧 修复 httpRequest.ts 中的类型错误
  - **问题 1**：绑定模式参数在实现签名中不能为可选参数 (ts(2463))
    - 将解构赋值从函数参数移到函数体内
    - 保持 HttpRequestOptions 接口的可选参数定义
  - **问题 2**：增强错误消息解析
    - 支持解析 `Error.message` 格式
    - 支持解析 `oslc:Error.oslc:message` 格式
    - 提供更详细的服务器错误信息

#### 推送错误消息传递优化
- 🔧 完善脚本和 XML 推送的错误处理
  - 修改返回类型为 `{ success: boolean; errorMessage?: string }`
  - 在所有错误情况下发送 Webview 消息
  - 前端显示错误提示（红色警告框，5秒后自动消失）
  - VSCode 通知弹窗显示详细错误信息

- 🔧 ConfigPanel 静态方法增强
  - 添加 `sendMessageToWebview()` 静态方法
  - pushScriptToMaximo 和 pushXmlToMaximo 支持向前端发送消息
  - 消息类型：`pushScriptError`、`pushXmlError`、`pushXmlSuccess`

- 🔧 extension.ts 调用方更新
  - 使用新的返回值格式处理推送结果
  - 提取 errorMessage 并显示给用户
  - 改进错误提示信息

- 🔧 App.tsx 前端消息监听
  - 添加 pushScriptError 消息处理
  - 添加 pushXmlError 消息处理
  - 添加 pushXmlSuccess 消息处理
  - 使用 connectionResult 状态显示错误信息

#### 用户体验优化
- 🔧 智能数据更新策略
  - **问题**：单个日志器更新后表格数据丢失
  - **原因**：查询单个时返回 1 条记录，但代码替换了整个列表
  - **解决**：根据返回记录数判断查询类型
    - 返回记录数 >= 当前列表数 → 查询所有，替换整个列表
    - 返回记录数 < 当前列表数 → 查询单个，只更新对应项
  - **效果**：表格数据不再丢失，保持完整性

- 🔧 Loading 状态管理优化
  - 更新成功后延迟 500ms 重新查询该日志器
  - 确保显示最新的级别信息
  - Loading 状态在重新查询完成后关闭
  - 避免按钮长时间只读

- 🔧 实时反馈机制
  - 下拉框选择后立即调用 API 更新
  - 显示成功/失败提示消息
  - 自动刷新对应行的数据

#### 界面设计
- 🎨 表格布局优化
  - 日志器名称列
  - 日志级别列（带颜色标识徽章）
  - 更改日志级别列（下拉选择框）
  - 操作列（重新加载按钮）

- 🎨 按钮设计
  - 🚀 更新到 Maximo（主要操作，蓝色）
  - 💾 保存到本地（次要操作，绿色）
  - 🔄 重新加载（小按钮）
  - 📝 JSON 模式切换
  - ➕ 添加行

### 技术实现

#### 前端组件（React）
- **LogManager.tsx** - 主组件
  - 双标签页切换（查询 / 配置）
  - 状态管理
  
- **LogViewer.tsx** - 日志级别查询
  - 查询所有日志器
  - 表格展示和搜索
  - 下拉框实时更新
  - 智能数据更新逻辑
  
- **LogLevelConfig.tsx** - 日志级别配置
  - 可编辑表格
  - JSON 源码编辑
  - 批量更新到 Maximo
  - 保存到本地

#### 样式优化
- 🎨 响应式表格设计
- 🎨 颜色标识徽章（DEBUG/INFO/WARN/ERROR）
- 🎨 工具栏布局
- 🎨 消息提示样式

### 文档更新
- 📝 HELP.md 添加 Skills 文档链接
- 📝 HELP.md 添加域导入功能详细说明
- 📝 tmp/LOG_FEATURE_IMPLEMENTATION.md - 实施步骤文档
- 📝 tmp/LOG_FEATURE_TEST.md - 测试指南

### 注意事项
- ⚠️ 日志级别设置仅临时生效，重启 Maximo 后会恢复
- ⚠️ 不会更新 MAXLOGGER 表的信息
- ⚠️ 需要 Maximo 系统中已部署相关脚本接口
- ⚠️ 需要有足够的权限调用这些 API

---

## [1.2.4] - 2026-05-21

### 新增功能

#### 初始化工具脚本增强
- ✨ 支持从多个目录扫描脚本配置文件
  - **主目录**：`public/maximo-developer-resources`
  - **工具目录**：`public/sks_tools`
  - 自动合并两个目录下的所有 JSON 配置文件
- ✨ 动态读取脚本配置
  - 不再硬编码脚本列表
  - 从 JSON 文件中提取 `autoscript` 和 `description`
  - 根据 JSON 文件名推导对应的 `.js` 文件
- ✨ 智能部署流程
  - 显示每个目录找到的配置文件数量
  - 跳过不存在的目录（友好提示）
  - 记录每个脚本的来源目录
  - 显示部署进度和统计信息

### 改进

#### 代码优化
- 🔧 重构脚本初始化逻辑
  - 使用 `ScriptInfo` 接口统一管理脚本信息
  - 添加 `sourceDir` 字段追踪脚本来源
  - 支持灵活扩展更多扫描目录
- 🔧 完善错误处理
  - 捕获 JSON 解析失败的文件
  - 记录警告但不中断流程
  - 提供详细的调试日志

#### 打包配置
- 📦 忽略备份文件
  - 在 `.vscodeignore` 中添加 `public/maximo-developer-resources_bak01.7z`
  - 减小 VSIX 包体积

---

## [1.2.3] - 2026-05-21

### 新增功能

#### 代码片段（Snippets）支持
- ✨ 新增 13 个 Maximo 专用代码片段
  - **JSDoc 类型注释片段**（6个）：
    - `jsdocstr` - 快速生成 String 类型注释
    - `jsdocmbo` - 快速生成 MboRemote 类型注释
    - `jsdocmboset` - 快速生成 MboSetRemote 类型注释
    - `jsdocservice` - 快速生成 ScriptService 类型注释
    - `jsdocuser` - 快速生成 UserInfo 类型注释
    - `jdoctype` - 自定义类型注释（可编辑类名）
    - `varjsdoc` - 一键生成带 JSDoc 的变量声明
  - **Maximo API 常用片段**（7个）：
    - `slog` / `serr` - 日志记录
    - `mgetstr` / `msetval` / `mgetset` - MBO 操作
    - `mmovefirst` / `mcount` - MBO Set 操作
    - `ifmbo` - null 检查
    - `trylog` - 带日志的 try-catch
- 📝 创建代码片段使用文档：`AIDOC/SNIPPETS_GUIDE.md`

### 改进

#### 智能补全增强
- 🔧 修复输入部分方法名后补全消失的问题
  - **问题场景**：输入 `a.toU` 后按 Esc 取消，再次触发补全时无法识别类型
  - **根本原因**：正则表达式只能匹配以 `.` 结尾的情况，无法处理已输入部分方法名的场景
  - **解决方案**：改进正则表达式，支持捕获用户已输入的方法名前缀
  - **修改前**：`/([\w$]+(?:\.\s*[\w$]+\s*\([^)]*\))*)\.\s*$/`
  - **修改后**：`/([\w$]+(?:\.\s*[\w$]+\s*\([^)]*\))*)\.\s*([\w]*)$/`
  - **效果**：现在可以正确识别 `triggerPrefix`（对象表达式）和 `inputSuffix`（已输入的方法名前缀）
- 🔧 添加详细的补全调试日志
  - 显示用户输入的后缀
  - 显示匹配的补全项数量
  - 显示匹配特定前缀的方法列表（最多5个）
  - 便于排查补全问题

#### 文档优化
- 📝 README.md 链接指向 Gitee 远程文档
  - Reflection Data 提取指南改为在线版本
  - 用户可以直接访问最新文档
- 📝 JSDOC_COMPLETION_GUIDE.md 添加 reflection-data 下载说明
  - 提供 Gitee 仓库链接
  - 说明如何下载和配置
- 📝 修正 ScriptService 类名
  - 从 `com.ibm.ism.script.ScriptService` 改为 `com.ibm.tivoli.maximo.script.ScriptService`

---

## [1.2.1] - 2026-05-21

### 新增功能

#### 脚本管理工具箱
- ✨ 批量导出所有 Maximo 自动化脚本
  - 支持导出元数据（JSON）和源代码（JS/PY）
  - 自动创建带时间戳的备份目录
  - 显示导出进度和统计信息
- ✨ 拉取单个脚本
  - 根据 `ibm_packagepath` 自动创建目录结构
  - 同时保存 JSON 配置文件和源代码文件
  - 文件存在时提示是否覆盖
- ✨ 查询脚本列表
  - 显示所有 Maximo 自动化脚本
  - 支持快速搜索和过滤
  - 实时刷新功能

#### 版本管理系统
- 📊 推送脚本时自动保存历史记录
  - 调用 `SKS_AUTOSCRIPT_HISTORY_SAVE` API
  - 记录版本号、主机名、别名等信息
  - 失败时仅记录日志，不影响推送流程
- 📊 自动递增版本号
  - 从 JSON 文件中读取当前版本
  - 检查最后一位是否为数字
  - 如果是数字则自动 +1
  - 写回更新后的版本号到 JSON 文件

#### IBM_PACKAGEPATH 支持
- 🏷️ 根据包路径自动创建目录结构
  - 支持点号转斜杠（`com.example.script` → `com/example/script`）
  - 递归创建多级目录
  - 与配置的根目录结合使用

#### 配置项增强
- ⚙️ 添加"别名（Alias Name）"配置
  - 用于推送脚本时保存历史记录
  - 可为空，为空时传空字符串
- ⚙️ 添加"脚本存放目录"配置
  - 自定义拉取脚本的存储根目录
  - 默认为 `masscript`

### 修复问题

#### API 调用修正
- 🐛 拉取单个脚本时使用正确的 API
  - 从 `SKS_GET_AUTOSCRIPTNAMES` 改为 `SKS_GET_AUTOSCRIPTINFOBYNAME`
  - 前者返回数组，后者返回单个脚本详情
- 🐛 工具箱导出脚本时使用正确的 API
  - 获取元数据：`SKS_GET_AUTOSCRIPTINFOBYNAME`
  - 导出源代码：`SKS_EXP_AUTOSCRIPTBYNAME`
- 🐛 修正字段名大小写问题
  - Maximo API 返回小写字段名：`ibm_packagepath`
  - 代码中相应调整为小写

#### HTTP Header 溢出问题
- 🐛 修复部署时的 "Header overflow" 错误
  - **问题原因**：使用 `/oslc/os` 路径时，请求头过大导致解析失败
  - **解决方案**：将接口路径从 `/maximo/oslc/os` 改为 `/maximo/api/os`
  - **影响范围**：所有涉及 MXAPIAUTOSCRIPT 和 MXSCRIPT 的 API 调用
  - **具体修改**：
    - 检查脚本存在性：`os/MXAPIAUTOSCRIPT`
    - 创建新脚本：`os/MXAPIAUTOSCRIPT`
    - 更新脚本：`os/MXSCRIPT/_{base64编码}`
  - **技术说明**：`/api/os` 路径使用更简洁的请求格式，避免 Header 过大

#### 认证头重复设置
- 🐛 删除所有手动设置的认证头
  - `httpRequestToMaximo` 已自动处理认证
  - 避免重复设置导致的冲突
  - 简化代码，提高可维护性

#### Base64 编码问题
- 🐛 修复推送脚本时的 Base64 编码错误
  - 从 `atob()`（浏览器 API）改为 `Buffer.from().toString('base64')`
  - `atob` 是解码函数，应该用编码函数
  - Node.js 环境中应使用 Buffer API

#### 代码重构
- 🐛 统一推送逻辑
  - 删除 `extension.ts` 中重复的 `pushScriptToMaximo` 函数
  - 统一使用 `configPanel.ts` 中的静态方法
  - 避免代码重复和维护困难
- 🐛 优化版本号管理
  - `_saveScriptHistoryStatic` 直接返回更新后的版本号
  - 避免重复读取 JSON 文件
  - 减少 I/O 操作，提高性能

### 改进

#### HTTP 请求模块优化
- 🔧 简化 URL 拼接逻辑
  - 使用相对路径，让 `httpRequestToMaximo` 自动拼接
  - 例如：`script/SKS_GET_AUTOSCRIPTINFOBYNAME`
  - 而不是：`${serverUrl}/oslc/script/SKS_GET_AUTOSCRIPTINFOBYNAME`
- 🔧 统一认证头处理方式
  - 所有 API 调用都不再手动设置认证头
  - 由 `httpRequestToMaximo` 统一管理

#### 日志输出完善
- 📝 添加详细的调试信息
  - 记录 API 调用的完整响应数据
  - 显示版本号获取和更新过程
  - 记录目录创建和文件保存操作
- 📝 改进错误提示
  - 显示完整的响应数据结构
  - 提供更具体的错误原因
  - 便于问题排查

---

## [1.1.1] - 2026-05-17

### 新增功能

- ✨ 完善 Maximo 9.1 MXSCRIPT API 支持
  - 更新接口使用 `POST + x-method-override: PATCH` 方法
  - 更新时 URL **不能加** `?lean=1`（避免静默失败）
  - Body 必须使用 `spi:` 前缀
  - 字段名必须小写（如 `spi:description`）

### 修复问题

- 🐛 修正 SKILL.md 文档中 MXSCRIPT 更新接口的说明
- 🐛 优化 .vscodeignore 配置，排除不必要的开发文件
- 🐛 删除 webview-ui 目录下的重复嵌套目录

### 改进

- 📝 更新自动化脚本 API 调用技能文档
- 🔧 优化插件打包流程，减小 VSIX 文件大小

---

## [1.1.0] - 之前版本

### 主要功能

- ✨ React Webview UI 重构
  - 从 HTML 迁移到 React + TypeScript
  - 更现代化的用户界面
  - 更好的交互体验
- ✨ 智能代码补全和 JSDoc 类型注释支持
  - 支持 `/** @type {ClassName} */` 语法
  - 精确的类型推断和方法补全
- ✨ 链式调用类型推断
  - 自动推断方法返回值类型
  - 支持复杂的链式调用场景
- ✨ 本地 API 数据离线补全
  - 支持加载 JSON 格式的 API 反射数据
  - 无需连接 Maximo 服务器即可使用
- ✨ Maximo 7.6 和 9.1 多版本支持
  - 兼容不同版本的 Maximo
  - 自动适配 API 差异

---

## 版本说明

### 版本号格式

采用语义化版本格式：**主版本号.次版本号.修订号**

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

### 更新类型标识

- ✨ **新增功能**：添加了新的功能特性
- 🐛 **修复问题**：修复了已知的问题或 bug
- 🔧 **改进优化**：对现有功能的优化和改进
- 📝 **文档更新**：更新了文档或注释
- ⚙️ **配置变更**：修改了配置项或默认值
- 🗑️ **删除功能**：移除了旧的功能或代码

---

## 相关链接

- [GitHub Releases](https://github.com/shoukaiseki/maximo-script-vscode-plugin/releases)
- [Gitee 仓库](https://gitee.com/shoukaiseki/maximo-script-editor)
- [VSCode 扩展市场](https://marketplace.visualstudio.com/items?itemName=shoukaiseki.maximo-script-helper)
