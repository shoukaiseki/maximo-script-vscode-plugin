# HTTP 请求工具使用指南

## 📖 概述

`httpRequest` 是 Maximo Script Helper 插件提供的全局 HTTP 请求方法，自动处理认证、URL 拼接和错误处理。

---

## 🚀 快速开始

### 1. 导入方法

```typescript
import { httpRequest, httpGet, httpPost, httpPut, httpDelete } from './extension';
```

### 2. 基本用法

```typescript
// GET 请求 - 获取人员信息
const response = await httpGet('os/MXAPIPERSON/1');
console.log(response.data);

// POST 请求 - 创建人员
const response = await httpPost('os/MXAPIPERSON', {
  personid: 'TEST001',
  displayname: 'Test User'
});

// PUT 请求 - 更新人员
const response = await httpPut('os/MXAPIPERSON/1', {
  displayname: 'Updated Name'
});

// DELETE 请求 - 删除人员
const response = await httpDelete('os/MXAPIPERSON/1');
```

---

## 📝 API 文档

### httpRequest(options)

完整的 HTTP 请求方法。

#### 参数

```typescript
interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';  // HTTP 方法，默认 GET
  url: string;                                             // 请求路径（相对或绝对）
  headers?: Record<string, string>;                        // 自定义请求头
  data?: any;                                              // 请求体数据
  noAuth?: boolean;                                        // 是否跳过认证，默认 false
  timeout?: number;                                        // 超时时间（毫秒），默认 10000
}
```

#### 返回值

```typescript
interface HttpResponse {
  status: number;    // HTTP 状态码
  data: any;         // 响应数据
  headers: any;      // 响应头
}
```

#### 示例

```typescript
// 基本用法（自动添加认证）
const response = await httpRequest({
  method: 'GET',
  url: 'os/MXAPIPERSON/1'
});

// 不带认证的请求
const response = await httpRequest({
  method: 'GET',
  url: 'api/common/info',
  noAuth: true
});

// 自定义请求头
const response = await httpRequest({
  method: 'POST',
  url: 'os/MXAPIPERSON',
  headers: {
    'X-Custom-Header': 'custom-value'
  },
  data: {
    personid: 'TEST001',
    displayname: 'Test User'
  }
});

// 自定义超时时间
const response = await httpRequest({
  method: 'GET',
  url: 'os/MXAPIPERSON',
  timeout: 30000  // 30秒超时
});
```

---

### 快捷方法

#### httpGet(url, options?)

GET 请求快捷方法。

```typescript
const response = await httpGet('os/MXAPIPERSON/1');

// 带选项
const response = await httpGet('os/MXAPIPERSON/1', {
  headers: { 'X-Custom': 'value' },
  noAuth: true
});
```

#### httpPost(url, data?, options?)

POST 请求快捷方法。

```typescript
const response = await httpPost('os/MXAPIPERSON', {
  personid: 'TEST001',
  displayname: 'Test User'
});

// 带选项
const response = await httpPost('os/MXAPIPERSON', data, {
  headers: { 'X-Custom': 'value' },
  timeout: 30000
});
```

#### httpPut(url, data?, options?)

PUT 请求快捷方法。

```typescript
const response = await httpPut('os/MXAPIPERSON/1', {
  displayname: 'Updated Name'
});
```

#### httpDelete(url, options?)

DELETE 请求快捷方法。

```typescript
const response = await httpDelete('os/MXAPIPERSON/1');
```

---

## 🔧 URL 处理规则

### 1. 完整 URL（以 http:// 或 https:// 开头）
直接使用，不添加任何前缀。

```typescript
await httpGet('https://example.com/api/test');
// → https://example.com/api/test
```

### 2. 绝对路径（以 / 开头）
直接拼接到服务器 baseUrl。

```typescript
// 假设 serverUrl = 'http://localhost:9080/maximo'
await httpGet('/oslc/os/MXAPIPERSON/1');
// → http://localhost:9080/maximo/oslc/os/MXAPIPERSON/1
```

### 3. 相对路径
根据配置的 `apiType` 自动添加前缀。

```typescript
// 如果 apiType = 'oslc'
await httpGet('os/MXAPIPERSON/1');
// → http://localhost:9080/maximo/oslc/os/MXAPIPERSON/1

// 如果 apiType = 'rest'
await httpGet('os/MXAPIPERSON/1');
// → http://localhost:9080/maximo/api/os/MXAPIPERSON/1
```

---

## 🔐 认证处理

### 自动认证（默认）

根据配置面板中的设置自动添加认证信息：

- **MAXAUTH 模式**：添加 `MAXAUTH` 请求头
- **API Key 模式**：添加 `Authorization: apikey {key}` 请求头

```typescript
// 自动使用配置的认证方式
const response = await httpGet('os/MXAPIPERSON/1');
```

### 跳过认证

设置 `noAuth: true` 跳过认证。

```typescript
// 不添加任何认证头
const response = await httpGet('api/public/info', {
  noAuth: true
});
```

---

## ⚠️ 错误处理

### 捕获错误

```typescript
try {
  const response = await httpGet('os/MXAPIPERSON/1');
  console.log('成功:', response.data);
} catch (error) {
  console.error('失败:', error.message);
  
  // 可能的错误消息：
  // - "未配置服务器地址，请先在配置面板中设置"
  // - "未配置 MAXAUTH 认证信息"
  // - "未配置 API Key"
  // - "HTTP 401: Unauthorized"
  // - "无法连接到服务器，请检查网络和服务器地址"
}
```

### 常见错误

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| 未配置服务器地址 | 未在配置面板设置 serverUrl | 打开配置面板设置服务器地址 |
| 未配置 MAXAUTH 认证信息 | authType=maxauth 但未设置 maxauth | 在配置面板设置 MAXAUTH |
| 未配置 API Key | authType=apikey 但未设置 apiKey | 在配置面板设置 API Key |
| HTTP 401 | 认证失败 | 检查认证信息是否正确 |
| 无法连接到服务器 | 网络问题或服务器地址错误 | 检查网络和服务器地址 |

---

## 💡 最佳实践

### 1. 使用快捷方法

优先使用 `httpGet`、`httpPost` 等快捷方法，代码更简洁。

```typescript
// ✅ 推荐
const response = await httpGet('os/MXAPIPERSON/1');

// ❌ 不推荐（过于冗长）
const response = await httpRequest({
  method: 'GET',
  url: 'os/MXAPIPERSON/1'
});
```

### 2. 统一的错误处理

```typescript
async function fetchPerson(personId: string) {
  try {
    const response = await httpGet(`os/MXAPIPERSON/${personId}`);
    return response.data;
  } catch (error) {
    vscode.window.showErrorMessage(`获取人员信息失败: ${error.message}`);
    throw error;
  }
}
```

### 3. 类型安全

```typescript
interface Person {
  personid: string;
  displayname: string;
  email: string;
}

async function getPerson(personId: string): Promise<Person> {
  const response = await httpGet(`os/MXAPIPERSON/${personId}`);
  return response.data as Person;
}
```

### 4. 批量请求

```typescript
async function fetchMultiplePersons(ids: string[]) {
  const promises = ids.map(id => httpGet(`os/MXAPIPERSON/${id}`));
  const responses = await Promise.all(promises);
  return responses.map(r => r.data);
}
```

---

## 📌 注意事项

1. **配置依赖**：使用前确保已在配置面板中设置了服务器地址和认证信息
2. **API 类型**：URL 前缀取决于配置的 `apiType`（oslc 或 rest）
3. **超时时间**：默认 10 秒，长时间运行的请求需要增加超时时间
4. **拦截器**：所有请求都会经过全局 axios 拦截器，自动记录日志

---

## 🔗 相关资源

- [配置面板使用指南](../README.md#配置面板)
- [Maximo REST API 文档](https://www.ibm.com/docs/en/maximo-management/7.6.1?topic=apis-rest)
- [Maximo OSLC API 文档](https://www.ibm.com/docs/en/maximo-management/7.6.1?topic=apis-oslc)
