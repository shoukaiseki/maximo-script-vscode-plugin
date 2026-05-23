---
name: maximo-autoscript-api
description: Maximo 自动化脚本 API 调用技能，用于通过 OSLC REST API 管理 Maximo 自动化脚本（AutoScript）。当需要查询、创建、更新或删除自动化脚本时使用此技能。
---

# Maximo 自动化脚本 API 调用技能

## 概述

本技能提供通过 OSLC REST API 管理 Maximo 自动化脚本的完整指南，支持 Maximo 7.6 和 9.1 版本。

## 认证方式

### Basic Authentication (MAXAUTH)

将 `username:password` 进行 Base64 编码后作为 MAXAUTH 请求头：

```
MAXAUTH: bWF4YWRtaW46MTIzNDU2
```

示例：`maxadmin:123456` → `bWF4YWRtaW46MTIzNDU2`

### Session ID

```
Cookie: JSESSIONID=xxx; SOLONID=xxx
```

## API 端点

### Maximo 7.6

| 操作 | 端点 |
|------|------|
| 查询列表 | `GET /oslc/os/AUTOSCRIPT` |
| 查询详情 | `GET /oslc/os/AUTOSCRIPT/{scriptId}` |
| 创建脚本 | `POST /oslc/os/AUTOSCRIPT` |
| 更新脚本 | `PUT /oslc/os/AUTOSCRIPT/{scriptId}` |
| 删除脚本 | `DELETE /oslc/os/AUTOSCRIPT/{scriptId}` |

### Maximo 9.1

#### 方式一：MXAPIAUTOSCRIPT（传统 OSLC 接口）

| 操作 | 端点 |
|------|------|
| 查询列表 | `GET /oslc/os/MXAPIAUTOSCRIPT` |
| 查询详情 | `GET /oslc/os/MXAPIAUTOSCRIPT/{scriptId}` |
| 创建脚本 | `POST /oslc/os/MXAPIAUTOSCRIPT` |
| 更新脚本 | `POST /oslc/os/MXAPIAUTOSCRIPT/{scriptId}` (使用 x-method-override: PATCH) |
| 删除脚本 | `DELETE /oslc/os/MXAPIAUTOSCRIPT/{scriptId}` |

**特点**: 需要使用 `spi:` 前缀

#### 方式二：MXSCRIPT（新 REST API 接口 - 推荐）

| 操作 | 端点 |
|------|------|
| 查询列表 | `GET /api/os/MXSCRIPT?lean=1` |
| 查询详情 | `GET /api/os/MXSCRIPT/{scriptId}?lean=1` |
| 创建脚本 | `POST /api/os/MXSCRIPT?lean=1` |
| 更新脚本 | `POST /api/os/MXSCRIPT/{scriptId}` (使用 x-method-override: PATCH, **不能加 ?lean=1**) |
| 删除脚本 | `DELETE /api/os/MXSCRIPT/{scriptId}?lean=1` |

**特点**: 
- URL 参数必须包含 `lean=1`
- 请求 body **不需要**字段前缀（直接使用属性名）
- scriptId 需要 Base64 编码：`'_' + btoa(scriptName)`
- 例如: TEST01 -> _VEVTVDAx
- 更简洁的 API 设计

## Script ID 生成规则

脚本 ID 是脚本名称的 Base64 编码，前面加下划线：

```javascript
const scriptId = '_' + btoa(scriptName);
// 例如: TEST -> _VEVTVA==
// 例如: MY_SCRIPT -> TVlfU0NSSVBUCg==
```

## 字段前缀差异

### Maximo 7.6 (oslc 前缀)

```json
{
  "oslc:autoscript": "SCRIPT_NAME",
  "oslc:description": "脚本描述",
  "oslc:scriptlanguage": "nashorn",
  "oslc:source": "脚本内容",
  "oslc:active": true
}
```

### Maximo 9.1 - MXAPIAUTOSCRIPT (spi 前缀)

```json
{
  "spi:autoscript": "SCRIPT_NAME",
  "spi:description": "脚本描述",
  "spi:scriptlanguage": "nashorn",
  "spi:source": "脚本内容",
  "spi:active": true,
  "spi:status": "Active"
}
```

### Maximo 9.1 - MXSCRIPT (无前缀 - 推荐)

**请求格式**:
- URL: `POST /api/os/MXSCRIPT?lean=1`
- Header: `Content-Type: application/json`, `MAXAUTH: {base64编码}`
- Body: 直接使用属性名，**不需要**任何前缀

```json
{
  "autoscript": "SCRIPT_NAME",
  "description": "脚本描述",
  "scriptlanguage": "nashorn",
  "source": "脚本内容",
  "active": true,
  "status": "Active"
}
```

**完整 cURL 示例**:
```bash
curl --request POST \
  --url 'http://localhost:9080/maximo/api/os/MXSCRIPT?lean=1' \
  --header 'Content-Type: application/json' \
  --header 'MAXAUTH: bWF4YWRtaW46MTIzNDU2' \
  --data '{
    "autoscript": "test01",
    "description": "测试脚本",
    "scriptlanguage": "nashorn",
    "active": true,
    "status": "Active",
    "source": "service.log(\"111\")"
  }'
```

**JavaScript Fetch 示例**:
```javascript
fetch('http://localhost:9080/maximo/api/os/MXSCRIPT?lean=1', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'MAXAUTH': 'bWF4YWRtaW46MTIzNDU2'
  },
  body: JSON.stringify({
    autoscript: 'test01',
    description: '测试脚本',
    scriptlanguage: 'nashorn',
    active: true,
    status: 'Active',
    source: 'service.log("111")'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

**Axios 示例**:
```javascript
const axios = require('axios');

axios.post('http://localhost:9080/maximo/api/os/MXSCRIPT?lean=1', {
  autoscript: 'test01',
  description: '测试脚本',
  scriptlanguage: 'nashorn',
  active: true,
  status: 'Active',
  source: 'service.log("111")'
}, {
  headers: {
    'Content-Type': 'application/json',
    'MAXAUTH': 'bWF4YWRtaW46MTIzNDU2'
  }
})
.then(response => console.log(response.data))
.catch(error => console.error(error));
```

> **重要**: MXSCRIPT 接口的请求 body 直接使用属性名，**不需要**任何前缀，且 URL 必须包含 `?lean=1`

## 常用操作示例

### 1. 查询脚本列表

**Maximo 7.6:**
```http
GET http://localhost:7001/maximo/oslc/os/AUTOSCRIPT?lean=1&oslc.select=autoscript,description&oslc.where=autoscript="TEST"
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2
```

**Maximo 9.1 - MXAPIAUTOSCRIPT:**
```http
GET http://localhost:9080/maximo/oslc/os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript,description&oslc.where=autoscript="TEST"
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2
```

**Maximo 9.1 - MXSCRIPT (推荐):**
```http
GET http://localhost:9080/maximo/api/os/MXSCRIPT?lean=1&oslc.where=autoscript="TEST"
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2
```

响应示例：
```json
{
  "member": [
    {
      "href": "http://localhost/maximo/oslc/os/AUTOSCRIPT/_VEVTVA==",
      "oslc:autoscript": "TEST",
      "oslc:description": "测试脚本"
    }
  ]
}
```

### 2. 查询脚本详情

**Maximo 7.6:**
```http
GET http://localhost:7001/maximo/oslc/os/AUTOSCRIPT/_VEVTVA==
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2
```

**Maximo 9.1 - MXAPIAUTOSCRIPT:**
```http
GET http://localhost:9080/maximo/oslc/os/MXAPIAUTOSCRIPT/_VEVTVA==
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2
```

**Maximo 9.1 - MXSCRIPT (推荐):**
```http
GET http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVDAx?lean=1
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2
```

> **注意**: MXSCRIPT 接口使用 Base64 编码的 scriptId，格式: `'_' + btoa(scriptName)`

响应示例（9.1）：
```json
{
  "spi:autoscript": "TEST",
  "spi:description": "测试脚本",
  "spi:scriptlanguage": "nashorn",
  "spi:source": "service.log(\"Hello\");",
  "spi:active": true,
  "spi:status": "Active"
}
```

### 3. 创建新脚本

**Maximo 7.6:**
```http
POST http://localhost:7001/maximo/oslc/os/AUTOSCRIPT
Content-Type: application/json
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2

{
  "oslc:autoscript": "NEW_SCRIPT",
  "oslc:description": "新脚本",
  "oslc:scriptlanguage": "nashorn",
  "oslc:source": "service.log(\"Hello World\");",
  "oslc:active": true
}
```

**Maximo 9.1 - MXAPIAUTOSCRIPT:**
```http
POST http://localhost:9080/maximo/oslc/os/MXAPIAUTOSCRIPT
Content-Type: application/json
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2

{
  "spi:autoscript": "NEW_SCRIPT",
  "spi:description": "新脚本",
  "spi:scriptlanguage": "nashorn",
  "spi:source": "service.log(\"Hello World\");",
  "spi:active": true,
  "spi:status": "Active"
}
```

**Maximo 9.1 - MXSCRIPT (推荐):**
```http
POST http://localhost:9080/maximo/api/os/MXSCRIPT?lean=1
Content-Type: application/json
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2

{
  "autoscript": "NEW_SCRIPT",
  "description": "新脚本",
  "scriptlanguage": "nashorn",
  "source": "service.log(\"Hello World\");",
  "active": true,
  "status": "Active"
}
```

> **重要**: MXSCRIPT 接口的 body 参数**不需要**前缀，且 URL 必须包含 `?lean=1`

### 4. 更新脚本

**Maximo 7.6 (PUT):**
```http
PUT http://localhost:7001/maximo/oslc/os/AUTOSCRIPT/_VEVTVA==
Content-Type: application/json
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2

{
  "oslc:autoscript": "TEST",
  "oslc:description": "更新的描述",
  "oslc:scriptlanguage": "nashorn",
  "oslc:source": "service.log(\"Updated\");",
  "oslc:active": true
}
```

**Maximo 9.1 - MXAPIAUTOSCRIPT (POST + x-method-override):**
```http
POST http://localhost:9080/maximo/oslc/os/MXAPIAUTOSCRIPT/_VEVTVA==
Content-Type: application/merge-patch+json
Accept: application/json
x-method-override: PATCH
MAXAUTH: bWF4YWRtaW46MTIzNDU2

{
  "spi:description": "更新的描述",
  "spi:source": "service.log(\"Updated\");"
}
```

> **注意**: Maximo 9.1 MXAPIAUTOSCRIPT 不支持直接的 PATCH 方法，必须使用 `POST + x-method-override: PATCH`

**Maximo 9.1 - MXSCRIPT (推荐):**
```http
POST http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVDAx
Content-Type: application/json
Accept: application/json
x-method-override: PATCH
MAXAUTH: bWF4YWRtaW46MTIzNDU2

{
  "spi:description": "更新的描述",
  "spi:source": "service.log(\"Updated\");"
}
```

> **重要**: 
> 1. **更新时 URL 不能加 `?lean=1`**（加了会导致返回 204 但实际数据不更新）
> 2. 必须使用 `POST + x-method-override: PATCH`
> 3. Body **必须使用 `spi:` 前缀**
> 4. **字段名必须小写**（如 `spi:description`，不能是 `spi:DESCRIPTION` 或 `spi:SOURCE`，否则对应字段不会更新）

### 5. 删除脚本

**Maximo 7.6:**
```http
DELETE http://localhost:7001/maximo/oslc/os/AUTOSCRIPT/_VEVTVA==
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2
```

**Maximo 9.1 - MXAPIAUTOSCRIPT:**
```http
DELETE http://localhost:9080/maximo/oslc/os/MXAPIAUTOSCRIPT/_VEVTVA==
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2
```

**Maximo 9.1 - MXSCRIPT (推荐):**
```http
DELETE http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVDAx?lean=1
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2
```

## 执行脚本

### 通过脚本名称执行

**Maximo 7.6:**
```http
POST http://localhost:7001/maximo/script/sharptree.autoscript.install
Content-Type: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2
```

**Maximo 9.1:**
```http
POST http://localhost:9080/maximo/oslc/script/sharptree.autoscript.install
Content-Type: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2
```

### 通过 sharptree.autoscript.deploy 部署

```http
POST http://localhost:9080/maximo/oslc/script/sharptree.autoscript.deploy
Content-Type: text/plain
Accept: application/json
MAXAUTH: bWF4YWRtaW46MTIzNDU2

// 直接发送脚本源代码
service.log("Hello from deploy");
```

## JavaScript 调用示例

### 查询脚本

#### MXAPIAUTOSCRIPT 方式
```javascript
async function getAutoScript(baseUrl, scriptName, maxauth) {
  const scriptId = '_' + btoa(scriptName);
  const url = `${baseUrl}/oslc/os/MXAPIAUTOSCRIPT/${scriptId}?lean=1`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'MAXAUTH': maxauth
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}
```

#### MXSCRIPT 方式（推荐）
```javascript
async function getAutoScriptNew(baseUrl, scriptName, maxauth) {
  // scriptId 需要 Base64 编码
  const scriptId = '_' + btoa(scriptName);
  const url = `${baseUrl}/api/os/MXSCRIPT/${scriptId}?lean=1`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'MAXAUTH': maxauth
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}
```

### 创建脚本

#### MXAPIAUTOSCRIPT 方式
```javascript
async function createAutoScript(baseUrl, scriptData, maxauth) {
  const url = `${baseUrl}/oslc/os/MXAPIAUTOSCRIPT`;
  
  const payload = {
    'spi:autoscript': scriptData.name,
    'spi:description': scriptData.description,
    'spi:scriptlanguage': scriptData.language || 'nashorn',
    'spi:source': scriptData.source,
    'spi:active': scriptData.active !== false,
    'spi:status': 'Active'
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'MAXAUTH': maxauth
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}
```

#### MXSCRIPT 方式（推荐）
```javascript
async function createAutoScriptNew(baseUrl, scriptData, maxauth) {
  const url = `${baseUrl}/api/os/MXSCRIPT?lean=1`;
  
  // 直接使用属性名，不需要前缀
  const payload = {
    'autoscript': scriptData.name,
    'description': scriptData.description,
    'scriptlanguage': scriptData.language || 'nashorn',
    'source': scriptData.source,
    'active': scriptData.active !== false,
    'status': 'Active'
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'MAXAUTH': maxauth
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}
```

### 更新脚本

#### MXAPIAUTOSCRIPT 方式
```javascript
async function updateAutoScript(baseUrl, scriptName, updates, maxauth) {
  const scriptId = '_' + btoa(scriptName);
  const url = `${baseUrl}/oslc/os/MXAPIAUTOSCRIPT/${scriptId}`;
  
  // 构建 spi 前缀的更新数据
  const payload = {};
  for (const [key, value] of Object.entries(updates)) {
    payload[`spi:${key}`] = value;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/merge-patch+json',
      'Accept': 'application/json',
      'x-method-override': 'PATCH',
      'MAXAUTH': maxauth
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}
```

#### MXSCRIPT 方式（推荐）
```javascript
async function updateAutoScriptNew(baseUrl, scriptName, updates, maxauth) {
  // scriptId 需要 Base64 编码
  const scriptId = '_' + btoa(scriptName);
  const url = `${baseUrl}/api/os/MXSCRIPT/${scriptId}`;  // 更新时不要加 ?lean=1
  
  // 必须使用 spi: 前缀，且字段名小写
  const payload = {};
  for (const [key, value] of Object.entries(updates)) {
    payload[`spi:${key.toLowerCase()}`] = value;  // 确保字段名小写
  }
  
  const response = await fetch(url, {
    method: 'POST',  // 使用 POST + x-method-override: PATCH
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-method-override': 'PATCH',
      'MAXAUTH': maxauth
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}
```

### 删除脚本

#### MXAPIAUTOSCRIPT 方式
```javascript
async function deleteAutoScript(baseUrl, scriptName, maxauth) {
  const scriptId = '_' + btoa(scriptName);
  const url = `${baseUrl}/oslc/os/MXAPIAUTOSCRIPT/${scriptId}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'MAXAUTH': maxauth
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.status === 204; // 删除成功通常返回 204
}
```

#### MXSCRIPT 方式（推荐）
```javascript
async function deleteAutoScriptNew(baseUrl, scriptName, maxauth) {
  // scriptId 需要 Base64 编码
  const scriptId = '_' + btoa(scriptName);
  const url = `${baseUrl}/api/os/MXSCRIPT/${scriptId}?lean=1`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'MAXAUTH': maxauth
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.status === 204;
}
```

## 常见错误处理

### 501 Method Not Supported

**问题**: 直接使用 PATCH 方法
**解决**: 使用 `POST + x-method-override: PATCH`

```javascript
// 错误写法
fetch(url, { method: 'PATCH', ... })

// 正确写法
fetch(url, { 
  method: 'POST',
  headers: { 'x-method-override': 'PATCH' },
  ...
})
```

### 404 Not Found

**问题**: Script ID 错误或脚本不存在
**解决**: 
1. 检查 scriptId 是否正确生成（Base64 编码）
2. 先查询确认脚本是否存在

```javascript
// 验证 scriptId
const scriptId = '_' + btoa('TEST');
console.log(scriptId); // 应该是 _VEVTVA==
```

### 401 Unauthorized

**问题**: 认证失败
**解决**: 
1. 检查 MAXAUTH 是否有效
2. 确认用户名密码正确
3. 检查 Session ID 是否过期

### 400 Bad Request

**问题**: 请求格式错误
**解决**:
1. 检查 Content-Type 是否正确
2. 确认 JSON 格式合法
3. 验证必填字段是否完整

## 最佳实践

### 1. 始终使用 lean=1

减少返回数据量，提高性能：

```
GET /oslc/os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript,description
```

### 2. 处理换行符

将 `\r\n` 统一转换为 `\n`：

```javascript
const normalizedSource = scriptSource.replace(/\r\n/g, '\n');
```

### 3. 检查脚本是否存在

更新前先查询，避免 404 错误：

```javascript
async function safeUpdateScript(baseUrl, scriptName, updates, maxauth) {
  try {
    // 先查询确认存在
    await getAutoScript(baseUrl, scriptName, maxauth);
    
    // 再执行更新
    return await updateAutoScript(baseUrl, scriptName, updates, maxauth);
  } catch (error) {
    if (error.message.includes('404')) {
      console.error(`脚本 ${scriptName} 不存在`);
      return null;
    }
    throw error;
  }
}
```

### 4. 使用正确的字段前缀

- Maximo 7.6: `oslc:`
- Maximo 9.1 MXAPIAUTOSCRIPT: `spi:`
- **Maximo 9.1 MXSCRIPT: 无前缀（推荐）**

```javascript
// MXAPIAUTOSCRIPT 方式
const prefix = version === '9.1' ? 'spi' : 'oslc';
const payload = {
  [`${prefix}:autoscript`]: scriptName,
  [`${prefix}:description`]: description,
  // ...
};

// MXSCRIPT 方式（推荐 - 更简洁）
const payload = {
  autoscript: scriptName,
  description: description,
  // ... 直接使用属性名
};
```

### 5. 状态码检查

成功的状态码包括 200、201、204：

```javascript
if ([200, 201, 204].includes(response.status)) {
  console.log('操作成功');
} else {
  console.error(`操作失败: ${response.status}`);
}
```

## IntelliJ IDEA HTTP Client 示例

创建 `.http` 文件：

```http
### 环境变量
@baseUrl = http://localhost:9080/maximo
@maxauth = bWF4YWRtaW46MTIzNDU2
@scriptId = _VEVTVA==

### ========== MXAPIAUTOSCRIPT 方式（传统） ==========

### 查询脚本列表
GET {{baseUrl}}/oslc/os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript,description
Accept: application/json
MAXAUTH: {{maxauth}}

### 查询脚本详情
GET {{baseUrl}}/oslc/os/MXAPIAUTOSCRIPT/{{scriptId}}
Accept: application/json
MAXAUTH: {{maxauth}}

### 创建新脚本
POST {{baseUrl}}/oslc/os/MXAPIAUTOSCRIPT
Content-Type: application/json
Accept: application/json
MAXAUTH: {{maxauth}}

{
  "spi:autoscript": "TEST_SCRIPT",
  "spi:description": "测试脚本",
  "spi:scriptlanguage": "nashorn",
  "spi:source": "service.log(\"Hello World\");",
  "spi:active": true,
  "spi:status": "Active"
}

### 更新脚本
POST {{baseUrl}}/oslc/os/MXAPIAUTOSCRIPT/{{scriptId}}
Content-Type: application/merge-patch+json
Accept: application/json
x-method-override: PATCH
MAXAUTH: {{maxauth}}

{
  "spi:description": "更新后的描述",
  "spi:source": "service.log(\"Updated\");"
}

### 删除脚本
DELETE {{baseUrl}}/oslc/os/MXAPIAUTOSCRIPT/{{scriptId}}
Accept: application/json
MAXAUTH: {{maxauth}}

### ========== MXSCRIPT 方式（推荐） ==========

### 查询脚本列表
GET {{baseUrl}}/api/os/MXSCRIPT?lean=1
Accept: application/json
MAXAUTH: {{maxauth}}

### 查询脚本详情
### 注意: scriptId 需要 Base64 编码，例如 TEST01 -> _VEVTVDAx
GET {{baseUrl}}/api/os/MXSCRIPT/_VEVTVDAx?lean=1
Accept: application/json
MAXAUTH: {{maxauth}}

### 创建新脚本
POST {{baseUrl}}/api/os/MXSCRIPT?lean=1
Content-Type: application/json
Accept: application/json
MAXAUTH: {{maxauth}}

{
  "autoscript": "TEST_SCRIPT",
  "description": "测试脚本",
  "scriptlanguage": "nashorn",
  "source": "service.log(\"Hello World\");",
  "active": true,
  "status": "Active"
}

### 更新脚本（使用 POST + x-method-override: PATCH）
### 注意: scriptId 需要 Base64 编码，且 URL 不能加 ?lean=1
POST {{baseUrl}}/api/os/MXSCRIPT/_VEVTVDAx
Content-Type: application/json
Accept: application/json
x-method-override: PATCH
MAXAUTH: {{maxauth}}

{
  "spi:description": "更新后的描述",
  "spi:source": "service.log(\"Updated\");"
}

> **重要**: 
> - 更新时**不要加 `?lean=1`**（会导致返回 204 但实际不更新）
> - 必须使用 `spi:` 前缀
> - 字段名必须小写（如 `spi:description`，不能是 `spi:DESCRIPTION`）

### 删除脚本
### 注意: scriptId 需要 Base64 编码
DELETE {{baseUrl}}/api/os/MXSCRIPT/_VEVTVDAx?lean=1
Accept: application/json
MAXAUTH: {{maxauth}}
```

## 完整工作流程示例

### 场景：部署新的自动化脚本（MXSCRIPT 推荐方式）

```javascript
async function deployAutoScript(config) {
  const { baseUrl, scriptName, description, source, language, maxauth } = config;
  
  try {
    // 1. 检查脚本是否已存在
    let exists = false;
    try {
      await getAutoScriptNew(baseUrl, scriptName, maxauth);
      exists = true;
    } catch (e) {
      // 脚本不存在
    }
    
    if (exists) {
      // 2. 更新现有脚本
      console.log(`更新脚本: ${scriptName}`);
      return await updateAutoScriptNew(baseUrl, scriptName, {
        description,
        source,
        scriptlanguage: language || 'nashorn',
        active: true,
        status: 'Active'
      }, maxauth);
    } else {
      // 3. 创建新脚本
      console.log(`创建脚本: ${scriptName}`);
      return await createAutoScriptNew(baseUrl, {
        name: scriptName,
        description,
        source,
        language: language || 'nashorn',
        active: true
      }, maxauth);
    }
  } catch (error) {
    console.error(`部署失败: ${error.message}`);
    throw error;
  }
}

// 使用示例
deployAutoScript({
  baseUrl: 'http://localhost:9080/maximo',
  scriptName: 'MY_VALIDATION',
  description: '数据验证脚本',
  source: `
    var itemNum = mbo.getString("ITEMNUM");
    if (!itemNum) {
      throw new MXException("物料编号不能为空");
    }
    service.log("验证通过: " + itemNum);
  `,
  language: 'nashorn',
  maxauth: 'bWF4YWRtaW46MTIzNDU2'
});
```

## 相关资源

- Maximo OSLC API 官方文档
- sharptree.autoscript.deploy.js - 部署工具脚本
- sharptree.autoscript.install.js - 安装工具脚本
- Base64 编码工具

## 注意事项

1. **安全性**: 不要在代码中硬编码密码，使用环境变量或配置管理
2. **错误处理**: 始终捕获和处理 API 调用异常
3. **日志记录**: 记录重要的 API 调用和错误信息
4. **幂等性**: 确保重复调用不会产生副作用
5. **版本兼容**: 根据 Maximo 版本选择正确的 API 端点和字段前缀
6. **推荐使用 MXSCRIPT**: Maximo 9.1+ 优先使用 `/api/os/MXSCRIPT` 接口
   - 更新时**必须使用 `POST + x-method-override: PATCH`**
   - **更新时 URL 不能加 `?lean=1`**（会导致返回 204 但实际数据不更新）
   - Body **必须使用 `spi:` 前缀**
   - **字段名必须小写**（如 `spi:description`，不能是 `spi:DESCRIPTION` 或 `spi:SOURCE`，否则对应字段不会更新）

此技能帮助开发者安全、高效地通过 API 管理 Maximo 自动化脚本。
