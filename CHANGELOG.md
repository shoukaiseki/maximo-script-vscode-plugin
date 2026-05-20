# 更新日志 (Changelog)

所有重要的项目更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
