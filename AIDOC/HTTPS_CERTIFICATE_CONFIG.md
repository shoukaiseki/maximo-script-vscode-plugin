# HTTPS 证书忽略配置说明

## 问题背景

在开发环境中，Maximo 服务器可能使用自签名证书或内部 CA 签发的证书，导致 Node.js 的 HTTPS 请求因证书验证失败而被拒绝。

## 解决方案

已在 `src/httpRequest.ts` 中配置 Axios 忽略 HTTPS 证书验证。

### 实现代码

```typescript
export function initializeAxiosInterceptors(logger: vscode.LogOutputChannel) {
  try {
    const axios = require('axios');
    const https = require('https');
    
    // 1) 全局关闭证书验证
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      keepAlive: true
    });
    axios.defaults.httpsAgent = httpsAgent;
    // 兜底：覆盖全局 agent，使未显式指定 agent 的 HTTPS 请求也忽略证书
    https.globalAgent.options.rejectUnauthorized = false;

    // 2) 请求拦截器兜底：确保每个请求都带上忽略证书的 httpsAgent
    axios.interceptors.request.use((config) => {
      if (!config.httpsAgent) { config.httpsAgent = httpsAgent; }
      return config;
    });
    
    logger.info('[Axios] 已配置忽略 HTTPS 证书验证（仅用于开发环境）');
    
    // ... 其他拦截器配置
  }
}
```

### 工作原理

1. **创建 HTTPS Agent**：使用 Node.js 的 `https.Agent` 类创建自定义代理
2. **设置 rejectUnauthorized: false**：禁用证书验证
3. **应用到 Axios 全局默认值**：所有通过 Axios 发出的 HTTPS 请求都会使用此配置

### 影响范围

- ✅ 所有通过 `httpRequestToMaximo` 函数发出的请求
- ✅ 包括脚本部署、查询、删除等所有 API 调用
- ✅ 自动应用于整个插件生命周期

## ⚠️ 关键：VSCode 设置会导致证书忽略失效（必读）

### 现象

即使上面代码全部配置正确，并且已用**纯 Node 进程验证有效**，但在 **VSCode 扩展宿主** 里请求自签名证书服务器时，仍可能报错：

```
unable to verify the first certificate
[Axios Response Error] No response received
```

### 根本原因

VSCode 默认：

- `http.proxySupport = "override"`（默认值）
- `http.fetchAdditionalSupport = true`（默认开启）

这两项会让 VSCode **在扩展宿主中注入自己的网络栈/代理处理**，接管扩展发起的 HTTPS 请求，改用 VSCode 自身的证书校验（系统证书库），从而**完全绕过扩展代码里的 `httpsAgent.rejectUnauthorized:false`**。

> 典型识别特征：axios 的 `config.adapter='http'`、`config.httpsAgent.options.rejectUnauthorized=false` 都已正确，纯 Node 直连同一服务器成功，但在扩展宿主内依旧被证书校验拦截。

### 解决方案（必须）

在 VSCode **用户设置 / 工作区设置** 中加入以下两项，并**重启 VSCode**：

```jsonc
"http.proxySupport": "off",
"http.fetchAdditionalSupport": false
```

设置后请求即恢复正常。

### 请求侧的防御性配置

在 `httpRequestToMaximo` 的 axios 请求中显式指定，避免被代理/适配器接管：

```typescript
const response = await axios({
  method: method.toLowerCase(),
  url: apiUrl,
  headers: requestHeaders,
  data: data,
  timeout: timeout,
  adapter: 'http',   // 强制 http 适配器（Node 下才会读取 httpsAgent）
  proxy: false,      // 关闭代理自动探测（proxy-from-env 会读 HTTPS_PROXY/ALL_PROXY）
  httpsAgent: httpsAgent
});
```

### 诊断日志

插件内置了一次性诊断日志，便于定位此类问题：

```
[Axios Diag] node=..., typeofFetch=..., typeofXHR=..., axios.defaults.adapter=..., config.adapter=..., hasHttpsAgent=..., agentRejectUnauthorized=...
[Axios Diag Env] HTTPS_PROXY=...; HTTP_PROXY=...; ALL_PROXY=...; NO_PROXY=...; electron=...; NODE_OPTIONS=...; NODE_EXTRA_CA_CERTS=...; execPath=...
[Axios Diag Probe] 原生 https 请求成功 status=... / 失败 code=...
```

说明：`[Axios Diag Probe]` 用**原生 https（绕过 axios）** 直接请求同一地址 —— 若它成功而 axios 失败，说明问题在 axios 层；若它也失败，说明是扩展宿主的 TLS/网络注入问题（即本节所述的 VSCode 设置）。

## 安全注意事项

⚠️ **重要警告**：

1. **仅用于开发环境**：此配置会禁用 HTTPS 证书验证，使连接容易受到中间人攻击
2. **不要在生产环境使用**：生产环境应该使用有效的 SSL/TLS 证书
3. **日志提示**：插件启动时会在日志中明确提示此配置已启用

### 最佳实践

**开发环境**：
- 可以使用此配置快速连接到本地或测试环境的 Maximo 服务器
- 适用于使用自签名证书的内部服务器

**生产环境**：
- 应该使用由受信任 CA 签发的有效证书
- 如果需要支持自签名证书，建议将证书添加到系统的信任存储中，而不是禁用验证

## 替代方案

如果不想全局禁用证书验证，可以考虑以下方案：

### 方案 1：添加证书到信任存储

```bash
# Windows: 将证书导入受信任的根证书颁发机构
certutil -addstore root your-certificate.cer
```

### 方案 2：使用环境变量（临时）

```bash
# 设置环境变量跳过证书验证（不推荐）
set NODE_TLS_REJECT_UNAUTHORIZED=0
```

### 方案 3：针对特定请求配置

如果只需要在某些请求中忽略证书，可以在 `httpRequestToMaximo` 中添加参数控制：

```typescript
// 在 HttpRequestOptions 接口中添加
export interface HttpRequestOptions {
  // ... 其他属性
  skipCertificateCheck?: boolean;
}

// 在请求时动态创建 Agent
if (options.skipCertificateCheck) {
  const https = require('https');
  config.httpsAgent = new https.Agent({ rejectUnauthorized: false });
}
```

## 相关文件

- `src/httpRequest.ts`: HTTPS Agent 配置位置
- `src/extension.ts`: 调用 `initializeAxiosInterceptors` 初始化

## 日志查看

插件启动后，可以在输出面板中看到相关日志：

```
[Axios] 已配置忽略 HTTPS 证书验证（仅用于开发环境）
```

查看步骤：
1. 打开输出面板 (Ctrl+Shift+U)
2. 选择 "Maximo Script Helper"
3. 查找上述日志消息
