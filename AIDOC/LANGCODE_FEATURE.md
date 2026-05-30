# Langcode 语言配置功能说明

## 功能概述

在 Maximo Script Helper 插件的配置面板中，新增了 **Langcode（语言代码）** 下拉框，用于设置 Maximo 界面显示语言。

## 使用位置

**配置面板 → 连接配置 → 语言 (Langcode)**

位于"接口方式"选项下方。

## 功能特性

### 1. 支持的语言

插件支持所有标准的 ISO 639-1 语言代码，包括：

- **常用语言**：
  - EN - English（英语）- 默认值
  - ZH - 简体中文
  - ZHT - 繁體中文
  - JA - 日本語
  - KO - 한국어
  - FR - Français
  - DE - Deutsch
  - ES - Español
  - PT - Português
  - RU - Pyccкий
  - AR - عربية
  - 等等...

- **完整列表**：共支持 170+ 种语言

### 2. 持久化保存

Langcode 配置会保存到两个地方：

1. **VSCode 全局配置**：保存在 VSCode 的 settings.json 中
   - 配置键：`maximoScript.langcode`
   - 作用域：Global

2. **环境配置文件**：保存在 `~/.sks/maximo-script-helper/envs.json` 中
   - 每个环境可以有不同的语言设置
   - 切换环境时自动加载对应的语言配置

### 3. 默认值

- 如果未设置或为空，默认值为 `en`（English）
- 新建环境时，如果没有指定 langcode，也会使用默认值 `en`

## 使用步骤

### 方法一：通过下拉框选择

1. 打开配置面板（点击 VSCode 左侧活动栏的 Maximo 图标）
2. 切换到 **"连接配置"** 标签页
3. 找到 **"语言 (Langcode)"** 下拉框
4. 从列表中选择需要的语言
5. 点击 **"保存环境"** 按钮保存配置

### 方法二：手动输入环境名称并保存

1. 在"当前环境"输入框中输入环境名称（如：`dev`、`test`、`prod`）
2. 配置其他连接参数（服务器地址、认证信息等）
3. 选择语言
4. 点击 **"保存环境"** 按钮

### 方法三：切换已有环境

1. 点击 **"切换环境"** 按钮
2. 从列表中选择已保存的环境
3. 系统会自动加载该环境的语言配置

## 数据存储结构

### envs.json 示例

```json
[
  {
    "envnum": "dev",
    "serverUrl": "http://dev-server:9080/maximo",
    "authType": "apikey",
    "apiKey": "your-api-key",
    "apiType": "oslc",
    "version": "7.6",
    "completionMode": "vscode",
    "langcode": "ZH"
  },
  {
    "envnum": "prod",
    "serverUrl": "http://prod-server:9080/maximo",
    "authType": "maxauth",
    "maxauth": "base64-encoded-credentials",
    "apiType": "rest",
    "version": "9.1",
    "completionMode": "plugin",
    "langcode": "EN"
  }
]
```

### VSCode settings.json 示例

```json
{
  "maximoScript.serverUrl": "http://dev-server:9080/maximo",
  "maximoScript.authType": "apikey",
  "maximoScript.apiKey": "your-api-key",
  "maximoScript.apiType": "oslc",
  "maximoScript.version": "7.6",
  "maximoScript.completionMode": "vscode",
  "maximoScript.envnum": "dev",
  "maximoScript.langcode": "ZH"
}
```

## 应用场景

### 场景一：多语言环境管理

如果您需要连接不同语言的 Maximo 服务器：

- **开发环境**：使用中文界面（ZH）
- **测试环境**：使用英文界面（EN）
- **生产环境**：使用日文界面（JA）

可以为每个环境设置不同的 langcode，切换环境时自动应用对应的语言。

### 场景二：团队协作

团队成员可以使用不同的语言偏好：

- 中国团队成员：设置为 ZH（简体中文）
- 日本团队成员：设置为 JA（日本語）
- 国际团队成员：设置为 EN（English）

每个人的 VSCode 配置独立，互不影响。

### 场景三：临时切换语言

如果需要临时查看英文界面的错误信息或文档：

1. 快速切换到 EN 语言
2. 执行相关操作
3. 再切换回原来的语言

## 注意事项

1. **语言代码格式**：
   - 使用大写的 ISO 639-1 代码（如：EN、ZH、JA）
   - 繁体中文使用特殊代码：ZHT

2. **默认行为**：
   - 如果 langcode 为空或未设置，系统会自动使用 `en`
   - 不会影响已有的环境配置（向后兼容）

3. **与 Maximo 服务器的关系**：
   - 此配置主要用于插件内部的 API 调用
   - 某些 API 可能需要 langcode 参数来返回对应语言的错误信息或描述

4. **搜索功能**：
   - 语言下拉框支持浏览器原生的搜索功能
   - 在下拉框中直接输入语言名称或代码即可快速定位

## 技术实现

### 前端（React + TypeScript）

- 文件：`webview-ui/src/App.tsx`
- 定义了 170+ 种语言的选项列表
- 使用原生 `<select>` 元素，支持浏览器内置搜索

### 后端（TypeScript）

- 配置文件：`src/configPanel.ts`
  - `_saveConfig()`：保存 langcode 到 VSCode 配置和 envs.json
  - `_sendInitialConfig()`：加载 langcode 并发送到前端
  - `_loadEnvironmentConfig()`：加载指定环境的 langcode

- 环境配置：`src/envConfig.ts`
  - `EnvironmentConfig` 接口新增 `langcode: string` 字段
  - 所有环境操作函数自动支持 langcode

## 版本历史

- **v1.3.1**：首次引入 langcode 语言配置功能
  - 支持 170+ 种语言
  - 持久化保存到 VSCode 配置和环境配置文件
  - 默认值为 `en`

## 常见问题

### Q1: 为什么我的语言设置没有生效？

**A**: 请确保：
1. 选择了语言后点击了"保存环境"按钮
2. 检查 VSCode 配置中是否有 `maximoScript.langcode` 字段
3. 如果使用环境配置，检查 `envs.json` 中是否包含 `langcode` 字段

### Q2: 可以自定义语言列表吗？

**A**: 目前不支持自定义。如果需要添加新的语言，可以修改 `App.tsx` 中的 `languageOptions` 数组。

### Q3: langcode 会影响哪些功能？

**A**: 目前主要用于：
- API 请求时的语言参数传递
- 错误信息的语言显示
- 未来可能扩展到更多需要多语言支持的场景

### Q4: 切换环境后语言会变吗？

**A**: 会的。每个环境可以有自己的 langcode 设置，切换环境时会加载该环境的语言配置。

## 相关文档

- [Maximo Script Helper 使用指南](../HELP.md)
- [环境配置管理](../README.md#环境管理)
- [CHANGELOG](../CHANGELOG.md)
