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
    
    // 配置 Axios 忽略 HTTPS 证书验证（用于开发环境）
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    axios.defaults.httpsAgent = httpsAgent;
    
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
