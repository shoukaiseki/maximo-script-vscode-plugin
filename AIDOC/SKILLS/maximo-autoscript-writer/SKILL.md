---
name: maximo-autoscript-writer
description: Maximo 自动化脚本编写专家，提供完整的脚本模板、代码生成和最佳实践指导
version: 1.0.0
tags: [maximo, autoscript, script-writing, code-generation, nashorn, python]
---

# Maximo 自动化脚本编写专家

## 概述

这个 SKILL 专注于帮助用户编写高质量的 Maximo 自动化脚本。它提供：
- 完整的脚本模板和结构
- 智能代码生成（支持 Python/Jython 和 JavaScript/Nashorn）
- JSDoc 类型注解支持（增强 IDE 智能提示）
- 数据库操作最佳实践
- 错误处理和日志记录规范

## 核心能力

### 1. 脚本模板生成

根据启动点类型生成标准脚本模板：

#### OBJECT 启动点模板（JavaScript）

```javascript
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");
/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");

/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

main();

function main() {
    try {
        // 添加前逻辑
        if (onadd) {
            handleAdd();
        }
        
        // 更新前逻辑
        if (onupdate) {
            handleUpdate();
        }
        
        // 删除前逻辑
        if (ondelete) {
            handleDelete();
        }
        
    } catch (error) {
        logger.error("脚本执行失败: " + error.message);
        /** @type {psdi.util.MXApplicationException} */
        var MXApplicationException = Java.type("psdi.util.MXApplicationException");
        throw new MXApplicationException("error", "脚本执行失败");
    }
}

/**
 * 处理添加操作
 */
function handleAdd() {
    // TODO: 实现添加逻辑
    logger.info("处理资产添加");
}

/**
 * 处理更新操作
 */
function handleUpdate() {
    // TODO: 实现更新逻辑
    logger.info("处理资产更新");
}

/**
 * 处理删除操作
 */
function handleDelete() {
    // TODO: 实现删除逻辑
    logger.info("处理资产删除");
}
```

#### ATTRIBUTE 启动点模板（JavaScript）

```javascript
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck

/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");

/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

main();

function main() {
    try {
        /** @type {string} */
        var newValue = value;
        /** @type {string} */
        var oldValue = oldValue;
        
        logger.info("属性值变更: " + newValue + " (旧值: " + oldValue + ")");
        
        // 验证新值
        validateValue(newValue, oldValue);
        
    } catch (error) {
        logger.error("属性验证失败: " + error.message);
        /** @type {psdi.util.MXApplicationException} */
        var MXApplicationException = Java.type("psdi.util.MXApplicationException");
        throw new MXApplicationException("error", "属性验证失败");
    }
}

/**
 * 验证属性值
 * @param {string} newValue - 新值
 * @param {string} oldValue - 旧值
 */
function validateValue(newValue, oldValue) {
    // TODO: 实现验证逻辑
    if (!newValue) {
        /** @type {psdi.util.MXApplicationException} */
        var MXApplicationException = Java.type("psdi.util.MXApplicationException");
        throw new MXApplicationException("error", "值不能为空");
    }
}
```

#### ACTION 启动点模板（JavaScript）

```javascript
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");
/** @type {psdi.mbo.SqlFormat} */
SqlFormat = Java.type("psdi.mbo.SqlFormat");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");

/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

main();

function main() {
    try {
        logger.info("执行操作: " + service.getScriptName());
        
        // 执行业务逻辑
        executeAction();
        
        // 返回成功响应
        responseBody = JSON.stringify({
            status: "success",
            message: "操作执行成功"
        }, null, 4);
        
    } catch (error) {
        logger.error("操作执行失败: " + error.message);
        
        responseBody = JSON.stringify({
            status: "error",
            message: error.message
        }, null, 4);
    }
}

/**
 * 执行具体操作
 */
function executeAction() {
    // TODO: 实现操作逻辑
}
```

### 2. 数据库操作模式

#### 查询数据

```javascript
/**
 * 查询示例
 */
function queryExample() {
    /** @type {psdi.mbo.MboSetRemote} */
    var assetSet = null;
    
    try {
        assetSet = MXServer.getMXServer().getMboSet("ASSET", userInfo);
        
        // 设置查询条件
        /** @type {psdi.mbo.SqlFormat} */
        var sqlf = new SqlFormat("assetnum = :1 and siteid = :2");
        sqlf.setObject(1, "ASSET", "ASSETNUM", "10001");
        sqlf.setObject(2, "ASSET", "SITEID", "BEDFORD");
        assetSet.setWhere(sqlf.format());
        assetSet.reset();
        
        // 遍历结果
        /** @type {psdi.mbo.MboRemote} */
        var asset = assetSet.moveFirst();
        while (asset) {
            logger.info("资产编号: " + asset.getString("ASSETNUM"));
            asset = assetSet.moveNext();
        }
        
    } finally {
        if (assetSet) {
            assetSet.cleanup();
            assetSet.close();
        }
    }
}
```

#### 创建记录

```javascript
/**
 * 创建记录示例
 */
function createExample() {
    /** @type {psdi.mbo.MboSetRemote} */
    var assetSet = null;
    
    try {
        assetSet = MXServer.getMXServer().getMboSet("ASSET", userInfo);
        
        /** @type {psdi.mbo.MboRemote} */
        var asset = assetSet.add();
        asset.setValue("ASSETNUM", "NEW001");
        asset.setValue("DESCRIPTION", "新资产");
        asset.setValue("SITEID", "BEDFORD");
        
        assetSet.save();
        
        logger.info("资产创建成功: NEW001");
        
    } finally {
        if (assetSet) {
            assetSet.cleanup();
            assetSet.close();
        }
    }
}
```

#### 更新记录

```javascript
/**
 * 更新记录示例
 */
function updateExample() {
    /** @type {psdi.mbo.MboSetRemote} */
    var assetSet = null;
    
    try {
        assetSet = MXServer.getMXServer().getMboSet("ASSET", userInfo);
        
        /** @type {psdi.mbo.SqlFormat} */
        var sqlf = new SqlFormat("assetnum = :1");
        sqlf.setObject(1, "ASSET", "ASSETNUM", "10001");
        assetSet.setWhere(sqlf.format());
        assetSet.reset();
        
        if (!assetSet.isEmpty()) {
            /** @type {psdi.mbo.MboRemote} */
            var asset = assetSet.getMbo(0);
            asset.setValue("DESCRIPTION", "更新的描述");
            assetSet.save();
            
            logger.info("资产更新成功: 10001");
        }
        
    } finally {
        if (assetSet) {
            assetSet.cleanup();
            assetSet.close();
        }
    }
}
```

#### 删除记录

```javascript
/**
 * 删除记录示例
 */
function deleteExample() {
    /** @type {psdi.mbo.MboSetRemote} */
    var assetSet = null;
    
    try {
        assetSet = MXServer.getMXServer().getMboSet("ASSET", userInfo);
        
        /** @type {psdi.mbo.SqlFormat} */
        var sqlf = new SqlFormat("assetnum = :1");
        sqlf.setObject(1, "ASSET", "ASSETNUM", "10001");
        assetSet.setWhere(sqlf.format());
        assetSet.reset();
        
        if (!assetSet.isEmpty()) {
            /** @type {psdi.mbo.MboRemote} */
            var asset = assetSet.getMbo(0);
            asset.delete();
            assetSet.save();
            
            logger.info("资产删除成功: 10001");
        }
        
    } finally {
        if (assetSet) {
            assetSet.cleanup();
            assetSet.close();
        }
    }
}
```

### 3. HTTP 请求处理模板

#### POST 请求（接收数据并存储）

```javascript
/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");

/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

main();

function main() {
    try {
        // 验证请求体
        if (typeof requestBody === "undefined" || !requestBody) {
            /** @type {psdi.util.MXApplicationException} */
            var MXApplicationException = Java.type("psdi.util.MXApplicationException");
            throw new MXApplicationException("error", "请求体不能为空");
        }
        
        // 解析请求数据
        /** @type {Object} */
        var requestData = JSON.parse(requestBody);
        
        // 提取字段
        /** @type {string} */
        var field1 = requestData.field1 || "";
        /** @type {string} */
        var field2 = requestData.field2 || "";
        
        // 验证必填字段
        if (!field1) {
            /** @type {psdi.util.MXApplicationException} */
            var MXApplicationException = Java.type("psdi.util.MXApplicationException");
            throw new MXApplicationException("error", "field1 不能为空");
        }
        
        // 处理业务逻辑
        processData(field1, field2);
        
        // 返回成功响应
        /** @type {Object} */
        var responseData = {
            status: "success",
            message: "处理成功",
            data: {
                field1: field1,
                field2: field2
            }
        };
        responseBody = JSON.stringify(responseData, null, 4);
        
    } catch (error) {
        logger.error("处理失败: " + error.message);
        
        /** @type {Object} */
        var errorData = {
            status: "error",
            message: error.message
        };
        responseBody = JSON.stringify(errorData, null, 4);
    }
}

/**
 * 处理数据
 * @param {string} field1 - 字段1
 * @param {string} field2 - 字段2
 */
function processData(field1, field2) {
    // TODO: 实现数据处理逻辑
    logger.info("处理数据: " + field1 + ", " + field2);
}
```

### 4. JSDoc 类型注解规范

为所有变量添加类型注解以启用 IDE 智能提示：

#### Maximo 核心类

```javascript
/** @type {psdi.server.MXServer} */
var mxServer = MXServer.getMXServer();

/** @type {psdi.mbo.MboSetRemote} */
var mboSet = mxServer.getMboSet("ASSET", userInfo);

/** @type {psdi.mbo.MboRemote} */
var mbo = mboSet.getMbo(0);

/** @type {psdi.mbo.SqlFormat} */
var sqlf = new SqlFormat("assetnum = :1");

/** @type {psdi.util.logging.MaximoLogger} */
var logger = service.getLogger();

/** @type {psdi.security.UserInfo} */
var ui = userInfo;
```

#### Java 类

```javascript
/** @type {java.lang.String} */
var str = new String("test");

/** @type {java.util.HashMap} */
var map = new HashMap();

/** @type {java.net.InetAddress} */
var InetAddress = Java.type("java.net.InetAddress");
```

#### 基本类型

```javascript
/** @type {string} */
var text = "hello";

/** @type {number} */
var count = 10;

/** @type {boolean} */
var flag = true;

/** @type {Object} */
var obj = {};

/** @type {Array} */
var arr = [];
```

### 5. 错误处理最佳实践

#### 使用 MXApplicationException（推荐）

**重要：** Maximo 脚本中应使用 `MXApplicationException` 而不是标准的 JavaScript `Error` 对象。这样可以确保异常被 Maximo 框架正确处理，并提供更好的用户体验。

```javascript
/**
 * 标准错误处理模式
 */
function safeOperation() {
    /** @type {psdi.mbo.MboSetRemote} */
    var mboSet = null;
    
    try {
        // 业务逻辑
        mboSet = MXServer.getMXServer().getMboSet("ASSET", userInfo);
        // ... 操作
        
    } catch (error) {
        // 记录错误日志
        logger.error("操作失败: " + error.message);
        
        // 判断错误类型
        if (error instanceof Java.type("psdi.util.MXException")) {
            // Maximo 异常 - 记录详细信息
            logger.error("错误组: " + error.getErrorGroup());
            logger.error("错误键: " + error.getErrorKey());
        }
        
        // 抛出 Maximo 标准异常
        /** @type {psdi.util.MXApplicationException} */
        var MXApplicationException = Java.type("psdi.util.MXApplicationException");
        throw new MXApplicationException("error", "操作失败");
        
    } finally {
        // 清理资源
        if (mboSet) {
            mboSet.cleanup();
            mboSet.close();
        }
    }
}
```

#### 字段验证示例

```javascript
/**
 * 验证必填字段
 */
function validateFields() {
    /** @type {string} */
    var assetNum = mbo.getString("ASSETNUM");
    
    if (!assetNum) {
        /** @type {psdi.util.MXApplicationException} */
        var MXApplicationException = Java.type("psdi.util.MXApplicationException");
        throw new MXApplicationException("error", "资产编号不能为空");
    }
    
    /** @type {string} */
    var siteId = mbo.getString("SITEID");
    if (!siteId) {
        /** @type {psdi.util.MXApplicationException} */
        var MXApplicationException = Java.type("psdi.util.MXApplicationException");
        throw new MXApplicationException("error", "站点不能为空");
    }
}
```

#### HTTP 请求错误处理

```javascript
function handleHttpRequest() {
    try {
        // 验证请求体
        if (typeof requestBody === "undefined" || !requestBody) {
            /** @type {psdi.util.MXApplicationException} */
            var MXApplicationException = Java.type("psdi.util.MXApplicationException");
            throw new MXApplicationException("error", "请求体不能为空");
        }
        
        // 解析并处理数据
        /** @type {Object} */
        var requestData = JSON.parse(requestBody);
        processData(requestData);
        
    } catch (error) {
        logger.error("HTTP 请求处理失败: " + error.message);
        
        /** @type {psdi.util.MXApplicationException} */
        var MXApplicationException = Java.type("psdi.util.MXApplicationException");
        throw new MXApplicationException("error", "调用外部接口失败");
    }
}
```

#### ❌ 避免的做法

```javascript
// ❌ 不要使用标准 Error 对象
throw new Error("操作失败");

// ❌ 不要直接抛出捕获的异常
throw error;
```

#### ✅ 推荐的做法

```javascript
// ✅ 使用 MXApplicationException
/** @type {psdi.util.MXApplicationException} */
var MXApplicationException = Java.type("psdi.util.MXApplicationException");
throw new MXApplicationException("error", "操作失败");
```

### 6. 日志记录规范

```javascript
// 获取 Logger
/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

// 不同级别的日志
logger.debug("调试信息");
logger.info("一般信息");
logger.warn("警告信息");
logger.error("错误信息");

// 带上下文的日志
logger.info("资产操作: ASSETNUM=" + assetNum + ", SITEID=" + siteId);
```

### 7. 避免使用的变量名

**重要：** Maximo 有一些内置变量，在编写脚本时应避免使用这些名称作为自定义变量名：

#### HTTP 启动点内置变量
- `response` - HTTP 响应对象（**不要用作自定义变量名**）
- `request` - HTTP 请求对象
- `requestBody` - 请求体字符串
- `responseBody` - 响应体字符串（用于设置返回值）
- `httpMethod` - HTTP 方法（GET, POST, PUT, DELETE）

#### 正确的做法

```javascript
// ❌ 错误 - 不要使用 response 作为变量名
var response = {
    status: "success",
    message: "操作成功"
};

// ✅ 正确 - 使用其他变量名
var responseData = {
    status: "success",
    message: "操作成功"
};
responseBody = JSON.stringify(responseData, null, 4);
```

#### 常见场景示例

```javascript
function main() {
    try {
        // 业务逻辑...
        
        // 构建响应数据（使用 responseData 而不是 response）
        /** @type {Object} */
        var responseData = {
            status: "success",
            message: "处理成功",
            data: resultData
        };
        
        // 设置 responseBody（这是内置变量）
        responseBody = JSON.stringify(responseData, null, 4);
        
    } catch (error) {
        logger.error("处理失败: " + error.message);
        
        /** @type {Object} */
        var errorData = {
            status: "error",
            message: error.message
        };
        responseBody = JSON.stringify(errorData, null, 4);
    }
}
```

## 使用场景

### 场景 1：用户需要创建新的自动化脚本

**用户：** "帮我写一个在资产添加时自动设置字段的脚本"

**响应步骤：**
1. 确认启动点类型（OBJECT - onadd）
2. 生成标准模板
3. 添加具体的业务逻辑
4. 包含 JSDoc 类型注解
5. 添加错误处理和日志

### 场景 2：用户需要调用 REST API 并存储数据

**用户：** "我需要接收 HTTP 请求并将数据存储到自定义表"

**响应步骤：**
1. 使用 HTTP 请求处理模板
2. 解析 requestBody
3. 验证必填字段
4. 使用 MBO 操作存储数据
5. 返回 JSON 响应

### 场景 3：用户需要查询关联数据

**用户：** "如何获取资产的工单列表？"

**响应步骤：**
1. 使用 getMboSet 获取关联集合
2. 设置查询条件（如需要）
3. 遍历结果集
4. 确保资源清理

### 场景 4：用户需要添加类型注解

**用户：** "为我的脚本添加 JSDoc 类型注解"

**响应步骤：**
1. 识别所有变量
2. 确定变量类型
3. 添加相应的 `/** @type {...} */` 注释
4. 特别关注 Maximo 对象类型

## 代码检查清单

在交付脚本前，确保：

- [ ] 添加了 `@ts-nocheck` 和 eslint 禁用注释
- [ ] 所有 Java 类都有类型注解
- [ ] 所有 Maximo 对象都有类型注解
- [ ] 使用了 try-catch-finally 错误处理
- [ ] 在 finally 块中清理了 MboSet 资源
- [ ] 添加了适当的日志记录
- [ ] 验证了必填字段
- [ ] 返回了标准的 JSON 响应格式
- [ ] 函数有 JSDoc 注释说明参数和返回值
- [ ] **避免使用 `response` 作为变量名**（这是 Maximo 的内置变量）
- [ ] **使用 `MXApplicationException` 而不是 `Error`**（Maximo 标准异常处理方式）

## 常见模式库

### 模式 1：获取当前用户和组织

```javascript
/** @type {string} */
var userName = userInfo.getUserName();
/** @type {string} */
var insertSite = userInfo.getInsertSite();
/** @type {string} */
var insertOrg = userInfo.getInsertOrg();
```

### 模式 2：调用其他脚本

```javascript
/**
 * 调用其他自动化脚本
 * @param {string} scriptName - 脚本名称
 * @returns {Object} 脚本返回的上下文
 */
function invokeScript(scriptName) {
    /** @type {com.ibm.tivoli.maximo.script.ScriptInfo} */
    var ScriptInfo = Java.type("com.ibm.tivoli.maximo.script.ScriptInfo");
    /** @type {com.ibm.tivoli.maximo.script.ScriptCache} */
    var ScriptCache = Java.type("com.ibm.tivoli.maximo.script.ScriptCache");
    /** @type {com.ibm.tivoli.maximo.script.ScriptDriverFactory} */
    var ScriptDriverFactory = Java.type("com.ibm.tivoli.maximo.script.ScriptDriverFactory");
    /** @type {java.util.HashMap} */
    var HashMap = Java.type("java.util.HashMap");
    
    var scriptInfo = ScriptCache.getInstance().getScriptInfo(scriptName);
    if (!scriptInfo) {
        throw new Error("脚本不存在: " + scriptName);
    }
    
    var context = new HashMap();
    ScriptDriverFactory.getInstance().getScriptDriver(scriptName).runScript(scriptName, context);
    return context;
}
```

### 模式 3：获取主机名

```javascript
/**
 * 获取主机名
 * @returns {string} 主机名
 */
function getHostname() {
    try {
        /** @type {java.net.InetAddress} */
        var InetAddress = Java.type("java.net.InetAddress");
        return InetAddress.getLocalHost().getHostName();
    } catch (error) {
        logger.warn("无法获取主机名: " + error.message);
        return "unknown";
    }
}
```

### 模式 4：SHA256 哈希计算

```javascript
/** @type {java.security.MessageDigest} */
var MessageDigest = Java.type("java.security.MessageDigest");
/** @type {java.security.MessageDigest} */
var sha256 = MessageDigest.getInstance("SHA-256");

/**
 * 计算 SHA256 哈希
 * @param {string} value - 要哈希的值
 * @returns {string} 十六进制哈希字符串
 */
function sha256Hex(value) {
    try {
        return toHex(sha256.digest(value.getBytes("utf8")));
    } catch (error) {
        logger.error(error.message);
        return "";
    }
}

/**
 * 字节数组转十六进制
 * @param {Array} value - 字节数组
 * @returns {string} 十六进制字符串
 */
function toHex(value) {
    /** @type {java.lang.StringBuilder} */
    var StringBuilder = Java.type("java.lang.StringBuilder");
    /** @type {java.lang.String} */
    var String = Java.type("java.lang.String");
    
    var result = new StringBuilder();
    for (var j = 0; j < value.length; j++) {
        result.append(String.format("%02x", value[j]));
    }
    return result.toString();
}
```

## 版本历史

- v1.0.0 (2026-05-20) - 初始版本，专注于 Maximo 自动化脚本编写
