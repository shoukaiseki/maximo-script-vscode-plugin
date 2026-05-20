# 推送到 Maximo 功能测试指南

## 功能概述

在 VSCode JavaScript 编辑器中添加了右键菜单"推送到 Maximo"功能，可以将当前编辑的脚本文件快速更新到 Maximo 服务器。

## 实现细节

### 1. 命令注册
- **命令 ID**: `maximoScript.pushToMaximo`
- **命令标题**: "Maximo Script: 推送到 Maximo"
- **激活条件**: 仅在 JavaScript 文件中显示

### 2. 菜单位置
- 编辑器右键菜单 (editor/context)
- 分组: navigation@1（位于菜单顶部）

### 3. 功能流程

```
用户右键点击 JavaScript 文件
    ↓
选择"推送到 Maximo"
    ↓
获取文件名（不含扩展名）作为 autoscript
    ↓
获取文件内容作为 source
    ↓
检查脚本是否在 Maximo 中存在
    ↓
如果存在 → 使用 PATCH 方法更新脚本
    ↓
显示成功/失败消息
```

### 4. API 调用细节

**检查脚本是否存在:**
```
GET /oslc/os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript&oslc.where=autoscript="{scriptName}"
```

**更新脚本:**
```
POST /oslc/os/MXSCRIPT/_{base64(scriptName)}
Headers:
  - Content-Type: application/json
  - x-method-override: PATCH
  - MAXAUTH: {maxauth} 或 apiKey: {apiKey}
Body:
{
  "spi:autoscript": "{scriptName}",
  "spi:source": "{source}"
}
```

## 测试步骤

### 前置条件
1. 已配置 Maximo 服务器地址
2. 已配置认证信息（MAXAUTH 或 API Key）
3. Maximo 中已存在同名脚本

### 测试用例 1: 成功推送
1. 打开一个 JavaScript 文件（例如：TESTSCRIPT.js）
2. 确保 Maximo 中存在名为 TESTSCRIPT 的脚本
3. 右键点击编辑器，选择"推送到 Maximo"
4. 观察进度通知
5. 验证是否显示成功消息："✅ 脚本已成功推送到 Maximo: TESTSCRIPT"

### 测试用例 2: 脚本不存在
1. 打开一个 JavaScript 文件（例如：NEWSCRIPT.js）
2. 确保 Maximo 中不存在名为 NEWSCRIPT 的脚本
3. 右键点击编辑器，选择"推送到 Maximo"
4. 验证是否显示错误消息："脚本 "NEWSCRIPT" 不存在于 Maximo 中，请先创建或导入该脚本"

### 测试用例 3: 未配置服务器
1. 清除 Maximo 服务器配置
2. 打开任意 JavaScript 文件
3. 右键点击编辑器，选择"推送到 Maximo"
4. 验证是否显示错误消息："未配置服务器地址，请先在配置面板中设置"

### 测试用例 4: 非 JavaScript 文件
1. 打开一个非 JavaScript 文件（例如：test.txt）
2. 右键点击编辑器
3. 验证"推送到 Maximo"选项不显示

## 注意事项

1. **仅支持更新**: 此功能只能更新已存在的脚本，不能创建新脚本
2. **文件名即脚本名**: 使用文件名（不含扩展名）作为 Maximo 中的 autoscript 名称
3. **只推送必要字段**: 只推送 `autoscript` 和 `source` 两个字段
4. **换行符处理**: 自动将 Windows 换行符 (\r\n) 转换为 Unix 换行符 (\n)

## 相关文件

- `package.json`: 命令和菜单配置
- `src/extension.ts`: 命令实现和 pushScriptToMaximo 函数
- `src/httpRequest.ts`: HTTP 请求工具

## 日志查看

推送过程的详细日志可以在输出面板中查看：
1. 打开输出面板 (Ctrl+Shift+U)
2. 选择 "Maximo Script Helper"
3. 查看以 `[PushToMaximo]` 开头的日志条目
