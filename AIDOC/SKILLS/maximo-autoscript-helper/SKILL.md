---
name: maximo-autoscript-helper
description: Maximo 自动化脚本开发助手，提供隐式变量、最佳实践和代码示例
version: 1.0.0
tags: [maximo, autoscript, python, javascript, automation]
---

# Maximo 自动化脚本开发助手

## 概述

这个 SKILL 帮助开发者在 IBM Maximo 9.1 中编写自动化脚本（Autoscript）。它提供了完整的隐式变量参考、最佳实践和代码示例。

## 核心功能

### 1. 隐式变量查询

当用户询问 Maximo 脚本中可用的变量时，提供准确的变量信息：

**常用隐式变量：**
- `mbo` - 当前 MBO 对象 (psdi.mbo.MboRemote)
- `mboset` - 当前 MBO 集合 (psdi.mbo.MboSetRemote)
- `service` - 脚本服务对象 (com.ibm.tivoli.maximo.script.ScriptService)
- `userInfo` - 用户信息对象 (psdi.security.UserInfo)
- `scriptName` - 脚本名称
- `launchPoint` - 启动点名称

**获取组织和站点：**
```python
# 从 userInfo 获取
site = userInfo.getInsertSite()
org = userInfo.getInsertOrg()

# 从 mbo 获取
siteOrg = mbo.getSiteOrg()
site = siteOrg[0]
org = siteOrg[1]
```

**获取 Logger：**
```python
logger = service.getLogger()
logger.info("Log message")
```

**获取 UI 会话：**
```python
ui = service.webclientsession()
```

### 2. 启动点类型识别

根据用户的场景，识别应该使用哪种启动点：

- **OBJECT** - 对象级事件（添加、更新、删除）
- **ATTRIBUTE** - 属性级事件（值改变）
- **ACTION** - 操作按钮触发
- **CUSTOMCONDITION** - 自定义条件表达式
- **NONPERSISTENT** - 非持久 MBO

### 3. 代码生成

根据用户需求生成 Python 或 JavaScript 脚本示例。

## 使用场景

### 场景 1：用户询问可用变量

**用户：** "Maximo 脚本中有哪些可用的隐式变量？"

**响应：**
提供完整的隐式变量列表，包括：
- 核心变量（mbo, mboset, service, userInfo）
- 环境变量（user, app, interactive）
- 属性启动点变量（value, oldValue, mbovalue）
- 如何获取 organization、site、logger、ui

### 场景 2：用户需要编写对象启动点脚本

**用户：** "我想在资产添加时自动设置描述字段"

**响应：**
```python
# OBJECT 启动点脚本 - 在资产添加时自动设置描述
if onadd:
    assetNum = mbo.getString("ASSETNUM")
    if assetNum:
        mbo.setValue("DESCRIPTION", "Asset: " + assetNum)
```

### 场景 3：用户需要编写属性启动点脚本

**用户：** "当状态改变时，我想验证新值"

**响应：**
```python
# ATTRIBUTE 启动点脚本 - 状态字段验证
# 变量: value (新值), oldValue (旧值), mbo

if value == "APPR" and oldValue != "APPR":
    # 检查是否有必要的关联记录
    woSet = mbo.getMboSet("WORKORDER")
    if woSet.count() == 0:
        errorGroup = "workorder"
        errorKey = "noworecord"
        raise Exception(errorGroup, errorKey)
```

### 场景 4：用户需要获取当前用户信息

**用户：** "如何在脚本中获取当前登录用户？"

**响应：**
```python
# 获取当前用户信息
userName = userInfo.getUserName()
displayName = userInfo.getDisplayName()
insertSite = userInfo.getInsertSite()
insertOrg = userInfo.getInsertOrg()

# 记录到日志
service.log("User: " + userName + ", Site: " + insertSite)
```

### 场景 5：用户需要调用 MBO 方法

**用户：** "如何在脚本中创建新的工作订单？"

**响应：**
```python
# 创建新的工作订单
from psdi.server import MXServer

mxServer = MXServer.getMXServer()
woSet = mxServer.getMboSet("WORKORDER", userInfo)
wo = woSet.add()
wo.setValue("DESCRIPTION", "Auto-created WO")
wo.setValue("OWNERGROUP", "SUPPORT")
woSet.save()
```

### 场景 6：用户需要使用 service 对象

**用户：** "service 对象有哪些有用的方法？"

**响应：**
ScriptService 提供的常用方法：
- `service.log(message)` - 记录日志
- `service.getLogger()` - 获取 Logger 对象
- `service.webclientsession()` - 获取 Web 客户端会话
- `service.jsonToString(jsonObject)` - JSON 转字符串
- `service.tojsonobject(jsonString)` - 字符串转 JSON
- `service.closeDialog()` - 关闭对话框
- `service.showMessageBox(group, key, params)` - 显示消息框

## 最佳实践

### 1. 始终检查 null 值

```python
if mbo is not None:
    assetNum = mbo.getString("ASSETNUM")
```

### 2. 使用 try-except 处理异常

```python
try:
    # 你的代码
    mbo.setValue("STATUS", "APPR")
except Exception as e:
    service.log("Error: " + str(e))
    errorGroup = "system"
    errorKey = "error"
    raise
```

### 3. 避免在循环中查询数据库

```python
# 不好 - 在循环中查询
for i in range(count):
    relatedSet = mbo.getMboSet("RELATED")
    
# 好 - 在循环外查询一次
relatedSet = mbo.getMboSet("RELATED")
for i in range(count):
    # 使用 relatedSet
```

### 4. 使用适当的日志级别

```python
logger = service.getLogger()
logger.debug("Debug information")
logger.info("Normal operation")
logger.warn("Warning condition")
logger.error("Error occurred")
```

### 5. 清理资源

```python
# 如果创建了 MBOSet，确保清理
try:
    tempSet = mxServer.getMboSet("TEMP", userInfo)
    # 使用 tempSet
finally:
    tempSet.cleanup()
```

## 常见错误和解决方案

### 错误 1：AttributeError: 'NoneType' object has no attribute 'getString'

**原因：** mbo 为 null
**解决：** 检查 mbo 是否为 null

```python
if mbo is not None:
    value = mbo.getString("ATTR")
```

### 错误 2：变量未定义

**原因：** 使用了不存在的隐式变量
**解决：** 确认变量在当前启动点类型中可用

### 错误 3：无法获取 organization/site

**原因：** organization 和 site 不是直接注入的变量
**解决：** 通过 userInfo 或 mbo 获取

```python
site = userInfo.getInsertSite()
org = userInfo.getInsertOrg()
```

## 语言支持

### Python (Jython)

Maximo 9.1 默认支持 Python 2.7 (Jython)

```python
# Python 示例
from psdi.server import MXServer

mxServer = MXServer.getMXServer()
assetSet = mxServer.getMboSet("ASSET", userInfo)
```

### JavaScript (Nashorn)

Maximo 9.1 支持 JavaScript (Nashorn 引擎)

```javascript
// JavaScript 示例
var MXServer = Java.type("psdi.server.MXServer");
var mxServer = MXServer.getMXServer();
var assetSet = mxServer.getMboSet("ASSET", userInfo);
```

## 调试技巧

### 1. 使用日志输出

```python
logger = service.getLogger()
logger.debug("Variable value: " + str(variable))
```

### 2. 使用 AutoScript 测试工具

在 Maximo 应用程序中使用 "测试脚本" 功能。

### 3. 检查脚本日志

查看 `maximo.script.{scriptName}` 日志文件。

## 参考资源

- **完整隐式变量文档**：`TASK/Maximo_Autoscript_Implicit_Variables.md`
- **完整方法参考手册**：`TASK/Maximo_Autoscript_Methods_Reference.md` (500+ 个方法)
- Maximo 官方文档
- ScriptService API 文档
- MBO API 文档

### 主要类的方法摘要

#### AppInstance（应用实例）
```python
# 从 ui.getCurrentApp() 获取
app = ui.getCurrentApp()

# 常用方法
hasAccess = app.hasSigOptionAccess("SAVE")  # 检查权限
allowEdits = app.allowPageEdits()  # 是否允许编辑
app.openURL("http://example.com", True)  # 打开 URL
redirectUrl = app.getRedirectURL()  # 获取重定向 URL
isMobile = app.isMobile()  # 是否移动设备
```

#### WFInstanceRemote（工作流实例）
```python
# 在工作流启动点中作为 wfinstance 变量可用
controlledMbo = wfinstance.getControlledMbo()  # 获取受控对象
wfinstance.completeWorkflowAssignment(assignmentId, actionId, memo)  # 完成分配
wfinstance.applyWorkflowAction(actionId)  # 应用工作流动作
wfinstance.stopWorkflow(reason)  # 停止工作流
isStopping = wfinstance.atStoppingPoint()  # 是否在停止点
```

#### EventMessage（事件消息）
```python
# 在事件脚本中作为 event 变量可用
eventName = event.getEventName()  # 获取事件名称
eventObj = event.getEventObject()  # 获取事件对象
txnId = event.getTxnId()  # 获取事务ID
```

#### MboValue（MBO 值对象）
```python
# 在属性启动点中作为 mbovalue 变量可用
strValue = mbovalue.getString()  # 获取字符串值
intValue = mbovalue.getInt()  # 获取整数值
mbovalue.setValue("New Value")  # 设置值
mbovalue.validate()  # 验证值
isModified = mbovalue.isModified()  # 是否已修改
```

#### MXTransaction（事务对象）
```python
# 手动获取
from psdi.server import MXServer
mxServer = MXServer.getMXServer()
tx = mxServer.getTransaction()

# 常用方法
tx.save()  # 保存事务
tx.commit()  # 提交事务
tx.rollback()  # 回滚事务
```

## 版本历史

- v1.0.0 (2026-05-16) - 初始版本，基于 Maximo 9.1
