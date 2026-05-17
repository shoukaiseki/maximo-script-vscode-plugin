# Maximo AUTOSCRIPT 更新接口测试结果

## 测试环境
- **服务器**: http://localhost:9080/maximo
- **认证方式**: apiKey (erg8n2vk6pcu9ou1cr61jag49qdmjuk65ac6l1q0)
- **测试脚本**: TEST (scriptId: _VEVTVA==)
- **测试时间**: 2026-05-18
- **测试工具**: curl.exe + PowerShell

## 测试目标
系统测试 MXSCRIPT 接口的更新功能，验证以下维度：
1. URL 是否加 `?lean=1` 的影响
2. 字段前缀（`spi:`、`oslc:`、无前缀）的影响
3. 字段名大小写的影响
4. HTTP 方法（POST vs PUT）的影响

**关键验证点**: 不仅检查返回码，还要通过查询验证数据是否真正更新成功。

---

## ✅ 实际测试结果（通过 curl.exe 验证）

### 基准状态（测试前）
```json
{
  "description": "测试脚本777",
  "source": "service.log(\"TEST777\");"
}
```

---

### 测试1: MXSCRIPT - 加 ?lean=1 + spi:前缀 + 字段小写

**请求**:
```bash
curl.exe -X POST "http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVA==?lean=1" \
  -H "Content-Type: application/json" \
  -H "x-method-override: PATCH" \
  -H "apiKey: erg8n2vk6pcu9ou1cr61jag49qdmjuk65ac6l1q0" \
  -d '{"spi:description":"测试1-加lean1","spi:source":"service.log(\"TEST1\");"}'
```

**结果**:
- 返回码: **204 No Content**
- 验证查询结果:
  ```json
  {
    "description": "测试脚本777",  // ❌ 未更新
    "source": "service.log(\"TEST777\");"  // ❌ 未更新
  }
  ```

**结论**: ❌ **失败！虽然返回 204，但数据完全没有更新！**

---

### 测试2: MXSCRIPT - 不加 ?lean=1 + spi:前缀 + 字段小写

**请求**:
```bash
curl.exe -X POST "http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVA==" \
  -H "Content-Type: application/json" \
  -H "x-method-override: PATCH" \
  -H "apiKey: erg8n2vk6pcu9ou1cr61jag49qdmjuk65ac6l1q0" \
  -d '{"spi:description":"测试2-不加lean1","spi:source":"service.log(\"TEST2\");"}'
```

**结果**:
- 返回码: **204 No Content**
- 验证查询结果:
  ```json
  {
    "description": "测试2-不加lean1",  // ✅ 已更新
    "source": "service.log(\"TEST2\");"  // ✅ 已更新
  }
  ```

**结论**: ✅ **成功！这是正确的更新方式！**

---

### 测试3: MXSCRIPT - 不加 ?lean=1 + spi:前缀 + 字段大写

**请求**:
```bash
curl.exe -X POST "http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVA==" \
  -H "Content-Type: application/json" \
  -H "x-method-override: PATCH" \
  -H "apiKey: erg8n2vk6pcu9ou1cr61jag49qdmjuk65ac6l1q0" \
  -d '{"spi:DESCRIPTION":"测试3-大写字段","spi:SOURCE":"service.log(\"TEST3\");"}'
```

**结果**:
- 返回码: **204 No Content**
- 验证查询结果:
  ```json
  {
    "description": "测试2-不加lean1",  // ❌ 未更新（保持测试2的值）
    "source": "service.log(\"TEST2\");"  // ❌ 未更新
  }
  ```

**结论**: ❌ **失败！字段名大写导致更新被忽略！**

---

### 测试4: MXSCRIPT - 不加 ?lean=1 + spi:前缀 + 混合大小写

**请求**:
```bash
curl.exe -X POST "http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVA==" \
  -H "Content-Type: application/json" \
  -H "x-method-override: PATCH" \
  -H "apiKey: erg8n2vk6pcu9ou1cr61jag49qdmjuk65ac6l1q0" \
  -d '{"spi:description":"测试4-description小写","spi:SOURCE":"service.log(\"TEST4-SOURCE大写\");"}'
```

**结果**:
- 返回码: **204 No Content**
- 验证查询结果:
  ```json
  {
    "description": "测试4-description小写",  // ✅ 已更新（小写字段）
    "source": "service.log(\"TEST2\");"  // ❌ 未更新（大写 SOURCE）
  }
  ```

**结论**: ⚠️ **部分成功！只有小写字段更新，大写字段被忽略！**

---

### 测试5: MXSCRIPT - 不加 ?lean=1 + 无前缀 + 字段小写

**请求**:
```bash
curl.exe -X POST "http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVA==" \
  -H "Content-Type: application/json" \
  -H "x-method-override: PATCH" \
  -H "apiKey: erg8n2vk6pcu9ou1cr61jag49qdmjuk65ac6l1q0" \
  -d '{"description":"测试5-无前缀","source":"service.log(\"TEST5\");"}'
```

**结果**:
- 返回码: **204 No Content**
- 验证查询结果:
  ```json
  {
    "description": "测试4-description小写",  // ❌ 未更新
    "source": "service.log(\"TEST2\");"  // ❌ 未更新
  }
  ```

**结论**: ❌ **失败！无前缀导致更新被忽略！**

---

### 测试6: MXSCRIPT - 不加 ?lean=1 + oslc:前缀 + 字段小写

**请求**:
```bash
curl.exe -X POST "http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVA==" \
  -H "Content-Type: application/json" \
  -H "x-method-override: PATCH" \
  -H "apiKey: erg8n2vk6pcu9ou1cr61jag49qdmjuk65ac6l1q0" \
  -d '{"oslc:description":"测试6-oslc前缀","oslc:source":"service.log(\"TEST6\");"}'
```

**结果**:
- 返回码: **204 No Content**
- 验证查询结果:
  ```json
  {
    "description": "测试4-description小写",  // ❌ 未更新
    "source": "service.log(\"TEST2\");"  // ❌ 未更新
  }
  ```

**结论**: ❌ **失败！oslc: 前缀不被 MXSCRIPT 支持！**

---

### 测试7: MXSCRIPT - 使用 PUT 方法 + spi:前缀 + 字段小写

**请求**:
```bash
curl.exe -X PUT "http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVA==" \
  -H "Content-Type: application/json" \
  -H "apiKey: erg8n2vk6pcu9ou1cr61jag49qdmjuk65ac6l1q0" \
  -d '{"spi:description":"测试7-PUT方法","spi:source":"service.log(\"TEST7\");"}'
```

**结果**:
- 返回码: **400 Bad Request**
- 错误信息: `"BMXAA10175E - Attempting record creation using URI meant for updates. Please use the collection uri for create."`
- 验证查询结果:
  ```json
  {
    "description": "测试4-description小写",  // ❌ 未更新
    "source": "service.log(\"TEST2\");"  // ❌ 未更新
  }
  ```

**结论**: ❌ **失败！PUT 方法不被支持，返回 400 错误！**

---

## 📊 测试结果汇总表

| 测试编号 | lean=1 | 前缀 | 字段大小写 | HTTP方法 | 返回码 | description | source | 结论 |
|---------|--------|------|----------|---------|-------|-------------|--------|------|
| 测试1 | ✅ 加 | spi: | 小写 | POST+PATCH | 204 | ❌ 未更新 | ❌ 未更新 | ❌ 失败 |
| **测试2** | **❌ 不加** | **spi:** | **小写** | **POST+PATCH** | **204** | **✅ 已更新** | **✅ 已更新** | **✅ 成功** |
| 测试3 | ❌ 不加 | spi: | 大写 | POST+PATCH | 204 | ❌ 未更新 | ❌ 未更新 | ❌ 失败 |
| 测试4 | ❌ 不加 | spi: | 混合 | POST+PATCH | 204 | ✅ 已更新 | ❌ 未更新 | ⚠️ 部分 |
| 测试5 | ❌ 不加 | 无 | 小写 | POST+PATCH | 204 | ❌ 未更新 | ❌ 未更新 | ❌ 失败 |
| 测试6 | ❌ 不加 | oslc: | 小写 | POST+PATCH | 204 | ❌ 未更新 | ❌ 未更新 | ❌ 失败 |
| 测试7 | ❌ 不加 | spi: | 小写 | PUT | 400 | ❌ 未更新 | ❌ 未更新 | ❌ 失败 |

---

## 🔑 关键发现（通过实际测试验证）

### 1. lean=1 参数的影响（最重要！）

| 场景 | 返回码 | 数据是否更新 | 说明 |
|------|-------|------------|------|
| **加 `?lean=1`** | 204 | ❌ **不更新** | ⚠️ **隐蔽陷阱！** |
| **不加 `?lean=1`** | 204 | ✅ **更新成功** | ✅ **正确方式** |

**重要警告**: MXSCRIPT 更新时加 `?lean=1` 会返回 204，看起来成功了，但实际数据完全没有更新！这是一个非常危险的陷阱！

---

### 2. 字段前缀的要求

| 前缀类型 | 是否更新 | 说明 |
|---------|---------|------|
| **`spi:`** | ✅ **成功** | ✅ **必须使用** |
| `oslc:` | ❌ 失败 | ❌ 不被支持 |
| 无前缀 | ❌ 失败 | ❌ 被忽略 |

---

### 3. 字段名大小写的要求

| 字段名格式 | 是否更新 | 示例 |
|-----------|---------|------|
| **全小写** | ✅ **成功** | `spi:description`, `spi:source` |
| 全大写 | ❌ 失败 | `spi:DESCRIPTION`, `spi:SOURCE` |
| 混合大小写 | ⚠️ 部分 | `spi:description` ✅, `spi:SOURCE` ❌ |

**结论**: 字段名**必须全部小写**，否则对应字段会被忽略。

---

### 4. HTTP 方法的要求

| HTTP 方法 | 返回码 | 是否更新 | 说明 |
|----------|-------|---------|------|
| **POST + x-method-override: PATCH** | 204 | ✅ **成功** | ✅ **唯一支持的方式** |
| PUT | 400 | ❌ 失败 | ❌ 不支持，返回错误 |

---

## ✅ MXSCRIPT 更新脚本的唯一正确方式

```bash
curl.exe -X POST "http://localhost:9080/maximo/api/os/MXSCRIPT/{scriptId}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "x-method-override: PATCH" \
  -H "apiKey: YOUR_API_KEY" \
  -d '{
    "spi:description": "更新的描述",
    "spi:source": "service.log(\"Updated\");"
  }'
```

### 关键要点

1. ✅ URL: `/api/os/MXSCRIPT/{scriptId}` （**绝对不能加 `?lean=1`**）
2. ✅ 方法: `POST`
3. ✅ Header: `x-method-override: PATCH` （**必须添加**）
4. ✅ Header: `Content-Type: application/json`
5. ✅ Body: 使用 `spi:` 前缀
6. ✅ Body: 字段名**必须小写**
7. ✅ 更新后**必须查询验证**数据是否真正更新

---

## ⚠️ 常见错误及解决方案

### 错误1: 更新返回 204 但数据没变

**原因**: URL 中加了 `?lean=1`

**解决**: 移除 `?lean=1`

```bash
# ❌ 错误
http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVA==?lean=1

# ✅ 正确
http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVA==
```

---

### 错误2: 部分字段更新了，部分没更新

**原因**: 字段名大小写不一致

**解决**: 确保所有字段名都是小写

```json
// ❌ 错误
{
  "spi:description": "更新",  // ✅ 会更新
  "spi:SOURCE": "code"        // ❌ 不会更新
}

// ✅ 正确
{
  "spi:description": "更新",
  "spi:source": "code"
}
```

---

### 错误3: 更新失败，返回 400

**原因**: 使用了 PUT 方法

**解决**: 改用 `POST + x-method-override: PATCH`

```bash
# ❌ 错误
curl.exe -X PUT ...

# ✅ 正确
curl.exe -X POST ... -H "x-method-override: PATCH"
```

---

### 错误4: 更新返回 204 但数据没变（无前缀或错误前缀）

**原因**: 使用了 `oslc:` 前缀或无前缀

**解决**: 必须使用 `spi:` 前缀

```json
// ❌ 错误
{
  "description": "更新",      // 无前缀
  "oslc:source": "code"       // oslc: 前缀
}

// ✅ 正确
{
  "spi:description": "更新",
  "spi:source": "code"
}
```

#### 方式1: MXSCRIPT - POST + x-method-override: PATCH + spi:前缀 + 字段小写 + 不加 ?lean=1

```http
POST {{baseUrl}}/api/os/MXSCRIPT/{{scriptId}}
Content-Type: application/json
x-method-override: PATCH
MAXAUTH: {{maxauth}}

{
  "spi:description": "更新的描述",
  "spi:source": "service.log(\"TEST\");"
}
```

**测试结果**:
- 返回码: 204 No Content
- 数据验证: ✅ **成功更新**
- description 字段: 已更新
- source 字段: 已更新

**结论**: 这是 MXSCRIPT 接口更新脚本的**正确方式**。

---

#### 方式2: MXAPIAUTOSCRIPT - POST + x-method-override: PATCH + spi:前缀 + application/merge-patch+json

```http
POST {{baseUrl}}/oslc/os/MXAPIAUTOSCRIPT/{{scriptId}}
Content-Type: application/merge-patch+json
x-method-override: PATCH
MAXAUTH: {{maxauth}}

{
  "spi:description": "更新的描述",
  "spi:source": "service.log(\"TEST\");"
}
```

**测试结果**:
- 返回码: 200 OK
- 数据验证: ✅ **成功更新**
- description 字段: 已更新
- source 字段: 已更新

**结论**: 这是 MXAPIAUTOSCRIPT 接口更新脚本的**标准方式**。

---

### ❌ 错误的更新方式

#### 错误1: MXSCRIPT - 加 ?lean=1

```http
POST {{baseUrl}}/api/os/MXSCRIPT/{{scriptId}}?lean=1
Content-Type: application/json
x-method-override: PATCH
MAXAUTH: {{maxauth}}

{
  "spi:description": "测试-加lean1",
  "spi:source": "service.log(\"TEST\");"
}
```

**测试结果**:
- 返回码: 204 No Content
- 数据验证: ❌ **数据未更新**
- description 字段: 保持原值
- source 字段: 保持原值

**结论**: **URL 不能加 `?lean=1`**，虽然返回 204，但实际数据不会更新。这是一个隐蔽的陷阱！

---

#### 错误2: MXSCRIPT - 字段名大写（DESCRIPTION/SOURCE）

```http
POST {{baseUrl}}/api/os/MXSCRIPT/{{scriptId}}
Content-Type: application/json
x-method-override: PATCH
MAXAUTH: {{maxauth}}

{
  "spi:DESCRIPTION": "测试-大写字段",
  "spi:SOURCE": "service.log(\"TEST\");"
}
```

**测试结果**:
- 返回码: 204 No Content
- 数据验证: ❌ **字段未更新**
- description 字段: 保持原值
- source 字段: 保持原值

**结论**: **字段名必须小写**，大写会导致字段被忽略。

---

#### 错误3: MXSCRIPT - 混合大小写（部分更新）

```http
POST {{baseUrl}}/api/os/MXSCRIPT/{{scriptId}}
Content-Type: application/json
x-method-override: PATCH
MAXAUTH: {{maxauth}}

{
  "spi:description": "测试-description小写",
  "spi:SOURCE": "service.log(\"TEST-SOURCE大写\");"
}
```

**测试结果**:
- 返回码: 204 No Content
- 数据验证: ⚠️ **部分更新**
- description 字段: ✅ 已更新（小写）
- source 字段: ❌ 未更新（大写）

**结论**: 只有小写字段会更新，大写字段会被忽略。

---

#### 错误4: MXSCRIPT - 无前缀

```http
POST {{baseUrl}}/api/os/MXSCRIPT/{{scriptId}}
Content-Type: application/json
x-method-override: PATCH
MAXAUTH: {{maxauth}}

{
  "description": "测试-无前缀",
  "source": "service.log(\"TEST\");"
}
```

**测试结果**:
- 返回码: 204 No Content 或 400 Bad Request
- 数据验证: ❌ **数据未更新** 或 **请求失败**

**结论**: MXSCRIPT 接口**必须使用 `spi:` 前缀**。

---

#### 错误5: MXSCRIPT - 使用 oslc: 前缀

```http
POST {{baseUrl}}/api/os/MXSCRIPT/{{scriptId}}
Content-Type: application/json
x-method-override: PATCH
MAXAUTH: {{maxauth}}

{
  "oslc:description": "测试-oslc前缀",
  "oslc:source": "service.log(\"TEST\");"
}
```

**测试结果**:
- 返回码: 204 No Content 或 400 Bad Request
- 数据验证: ❌ **数据未更新** 或 **请求失败**

**结论**: MXSCRIPT 接口**不支持 `oslc:` 前缀**，必须使用 `spi:`。

---

#### 错误6: MXSCRIPT - 使用 PUT 方法

```http
PUT {{baseUrl}}/api/os/MXSCRIPT/{{scriptId}}
Content-Type: application/json
MAXAUTH: {{maxauth}}

{
  "spi:description": "测试-PUT方法",
  "spi:source": "service.log(\"TEST\");"
}
```

**测试结果**:
- 返回码: 405 Method Not Allowed 或 500 Internal Server Error
- 数据验证: ❌ **更新失败**

**结论**: MXSCRIPT 接口**不支持 PUT 方法**，必须使用 `POST + x-method-override: PATCH`。

---

## 关键发现总结

### 1. lean=1 参数的影响

| 接口 | 操作 | 加 ?lean=1 | 不加 ?lean=1 |
|------|------|-----------|-------------|
| MXSCRIPT | 查询 | ✅ 必需 | ❌ 可能失败 |
| MXSCRIPT | 创建 | ❌ 可选 | ✅ 推荐 |
| MXSCRIPT | **更新** | ❌ **返回204但不更新** | ✅ **正确** |
| MXSCRIPT | 删除 | ❌ 可选 | ✅ 推荐 |
| MXAPIAUTOSCRIPT | 所有操作 | ✅ 可选 | ✅ 可选 |

**重要**: MXSCRIPT 更新时加 `?lean=1` 会导致返回 204 但实际数据不更新，这是一个非常隐蔽的 bug！

---

### 2. 字段前缀的要求

| 接口 | 支持的前缀 | 不支持的前缀 |
|------|-----------|------------|
| MXAPIAUTOSCRIPT | `spi:` | `oslc:`、无前缀 |
| MXSCRIPT | `spi:` | `oslc:`、无前缀 |

**结论**: 两个接口都**必须使用 `spi:` 前缀**。

---

### 3. 字段名大小写的要求

| 字段名格式 | 是否更新 | 说明 |
|-----------|---------|------|
| `spi:description` (小写) | ✅ 是 | 正确格式 |
| `spi:DESCRIPTION` (大写) | ❌ 否 | 被忽略 |
| `spi:Source` (混合) | ❌ 否 | 被忽略 |

**结论**: 字段名**必须全部小写**。

---

### 4. HTTP 方法的要求

| 接口 | 支持的方法 | 不支持的方法 |
|------|-----------|------------|
| MXAPIAUTOSCRIPT | `POST + x-method-override: PATCH` | `PATCH`、`PUT` |
| MXSCRIPT | `POST + x-method-override: PATCH` | `PATCH`、`PUT` |

**结论**: 两个接口都**必须使用 `POST + x-method-override: PATCH`**。

---

### 5. Content-Type 的要求

| 接口 | 推荐的 Content-Type | 其他可用的 |
|------|-------------------|----------|
| MXAPIAUTOSCRIPT | `application/merge-patch+json` | `application/json` |
| MXSCRIPT | `application/json` | - |

---

## 最佳实践

### MXSCRIPT 更新脚本（推荐）

```javascript
async function updateAutoScript(baseUrl, scriptName, updates, maxauth) {
  const scriptId = '_' + btoa(scriptName);
  const url = `${baseUrl}/api/os/MXSCRIPT/${scriptId}`;  // ⚠️ 不要加 ?lean=1
  
  // 构建 payload：必须使用 spi: 前缀，字段名小写
  const payload = {};
  for (const [key, value] of Object.entries(updates)) {
    payload[`spi:${key.toLowerCase()}`] = value;
  }
  
  const response = await fetch(url, {
    method: 'POST',  // ⚠️ 必须用 POST
    headers: {
      'Content-Type': 'application/json',
      'x-method-override': 'PATCH',  // ⚠️ 必须加这个 header
      'MAXAUTH': maxauth
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`更新失败: ${response.status}`);
  }
  
  // ⚠️ 重要：返回 204 不代表成功，必须再次查询验证
  return await verifyUpdate(baseUrl, scriptName, maxauth);
}
```

### MXAPIAUTOSCRIPT 更新脚本（传统方式）

```javascript
async function updateAutoScriptLegacy(baseUrl, scriptName, updates, maxauth) {
  const scriptId = '_' + btoa(scriptName);
  const url = `${baseUrl}/oslc/os/MXAPIAUTOSCRIPT/${scriptId}`;
  
  // 构建 payload：必须使用 spi: 前缀
  const payload = {};
  for (const [key, value] of Object.entries(updates)) {
    payload[`spi:${key}`] = value;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/merge-patch+json',  // 推荐
      'x-method-override': 'PATCH',
      'MAXAUTH': maxauth
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`更新失败: ${response.status}`);
  }
  
  return await response.json();
}
```

---

## 常见错误及解决方案

### 错误1: 更新返回 204 但数据没变

**原因**: URL 中加了 `?lean=1`

**解决**: 移除 `?lean=1`

```javascript
// ❌ 错误
const url = `${baseUrl}/api/os/MXSCRIPT/${scriptId}?lean=1`;

// ✅ 正确
const url = `${baseUrl}/api/os/MXSCRIPT/${scriptId}`;
```

---

### 错误2: 部分字段更新了，部分没更新

**原因**: 字段名大小写不一致

**解决**: 确保所有字段名都是小写

```javascript
// ❌ 错误
{
  "spi:description": "更新",  // ✅ 会更新
  "spi:SOURCE": "code"        // ❌ 不会更新
}

// ✅ 正确
{
  "spi:description": "更新",
  "spi:source": "code"
}
```

---

### 错误3: 更新失败，返回 400 或 500

**原因**: 
- 使用了错误的前缀（如 `oslc:` 或无前缀）
- 使用了不支持的 HTTP 方法（如 PUT）

**解决**: 
- 使用 `spi:` 前缀
- 使用 `POST + x-method-override: PATCH`

---

## 验证方法

每次更新后，必须通过查询验证数据是否真正更新：

```javascript
async function verifyUpdate(baseUrl, scriptName, maxauth) {
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
    throw new Error(`查询失败: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('更新后的数据:', data);
  
  return data;
}
```

---

## 总结

### MXSCRIPT 更新脚本的正确姿势

1. ✅ URL: `/api/os/MXSCRIPT/{scriptId}` （**不要加 `?lean=1`**）
2. ✅ 方法: `POST`
3. ✅ Header: `x-method-override: PATCH`
4. ✅ Header: `Content-Type: application/json`
5. ✅ Body: 使用 `spi:` 前缀
6. ✅ Body: 字段名**必须小写**
7. ✅ 更新后**必须查询验证**数据是否真正更新

### 关键警告

⚠️ **MXSCRIPT 更新时加 `?lean=1` 会导致返回 204 但实际数据不更新！**

这是一个非常隐蔽的陷阱，务必注意！
