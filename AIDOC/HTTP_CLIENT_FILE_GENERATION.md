# IntelliJ IDEA HTTP Client 请求文件自动生成

## 📖 功能说明

当插件发送 HTTP 请求时，会自动生成 **IntelliJ IDEA HTTP Client** 格式的请求文件（`.http` 文件），方便你：

- ✅ 在 IntelliJ IDEA 或 VSCode（需要 REST Client 插件）中直接运行请求
- ✅ 保存和分享 API 请求
- ✅ 调试和测试 Maximo API
- ✅ 作为 API 文档的一部分

---

## 🎯 工作原理

### 1. 自动捕获请求

每次通过 `httpRequest`、`httpGet`、`httpPost` 等方法发送请求时，拦截器会自动捕获请求信息。

### 2. 生成 .http 文件

将请求转换为 IntelliJ IDEA HTTP Client 格式：

```http
### GET http://localhost:9080/maximo/oslc/os/MXAPIPERSON/1
GET http://localhost:9080/maximo/oslc/os/MXAPIPERSON/1
MAXAUTH: bWF4YWRtaW46MTIzNDU2
Accept: application/json
X-Requested-With: Maximo-Script-Helper


```

### 3. 保存到临时目录

文件保存在系统临时目录：
- **Windows**: `C:\Users\{用户名}\AppData\Local\Temp\maximo-script-helper\`
- **macOS/Linux**: `/tmp/maximo-script-helper/`

文件名格式：`request-{时间戳}.http`

例如：`request-2026-05-17T10-30-00-000Z.http`

---

## 📝 生成的文件格式

### GET 请求示例

```http
### GET http://localhost:9080/maximo/oslc/os/MXAPIPERSON/1
GET http://localhost:9080/maximo/oslc/os/MXAPIPERSON/1
MAXAUTH: bWF4YWRtaW46MTIzNDU2
Accept: application/json
Content-Type: application/json


```

### POST 请求示例

```http
### POST http://localhost:9080/maximo/oslc/os/MXAPIPERSON
POST http://localhost:9080/maximo/oslc/os/MXAPIPERSON
MAXAUTH: bWF4YWRtaW46MTIzNDU2
Accept: application/json
Content-Type: application/json

{
  "personid": "TEST001",
  "displayname": "Test User",
  "email": "test@example.com"
}
```

### PUT 请求示例

```http
### PUT http://localhost:9080/maximo/oslc/os/MXAPIPERSON/1
PUT http://localhost:9080/maximo/oslc/os/MXAPIPERSON/1
MAXAUTH: bWF4YWRtaW46MTIzNDU2
Accept: application/json
Content-Type: application/json

{
  "displayname": "Updated Name"
}
```

---

## 🔧 如何使用生成的文件

### 方法 1：在 IntelliJ IDEA 中打开

1. 找到生成的 `.http` 文件
2. 在 IntelliJ IDEA 中打开
3. 点击请求旁边的绿色运行按钮 ▶️
4. 查看响应结果

### 方法 2：在 VSCode 中使用 REST Client 插件

1. 安装 [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) 插件
2. 在 VSCode 中打开 `.http` 文件
3. 点击 "Send Request" 链接
4. 查看响应结果

### 方法 3：手动复制使用

1. 打开 `.http` 文件
2. 复制请求内容
3. 粘贴到你的项目中的 `.http` 文件
4. 根据需要修改参数

---

## ⚙️ 配置选项

### 启用/禁用 HTTP 请求日志保存

默认情况下，HTTP 请求日志文件生成功能是**禁用**的。你可以通过配置来启用或禁用：

#### 方法 1：通过 VSCode 设置界面

1. 打开 VSCode 设置 (`Ctrl+,`)
2. 搜索 `maximoScript.enableHttpLog`
3. 勾选或取消勾选该选项

#### 方法 2：通过 settings.json

在 VSCode 的 `settings.json` 中添加：

```json
{
  "maximoScript.enableHttpLog": true  // 启用 HTTP 请求日志保存
}
```

#### 配置说明

- **默认值**: `false` (禁用)
- **类型**: `boolean`
- **作用**: 控制是否自动生成 IntelliJ IDEA HTTP Client 格式的 `.http` 文件
- **建议**: 
  - 开发调试时：启用 ✅
  - 日常使用时：禁用 ❌ (避免产生大量临时文件)

### 自动在 VSCode 中打开文件

如果你想每次生成后自动在 VSCode 中打开文件，可以修改 `httpRequest.ts`：

```typescript
// 找到这段代码（约第 65 行）
// vscode.workspace.openTextDocument(filePath).then(doc => {
//   vscode.window.showTextDocument(doc);
// });

// 取消注释：
vscode.workspace.openTextDocument(filePath).then(doc => {
  vscode.window.showTextDocument(doc);
});
```

### 自定义保存目录

修改临时目录路径：

```typescript
// 找到这段代码（约第 50 行）
const tmpDir = path.join(require('os').tmpdir(), 'maximo-script-helper');

// 改为你想要的目录，例如：
const tmpDir = 'E:\\maximo-http-requests';
```

---

## 💡 使用场景

### 场景 1：调试 API 请求

当你遇到 API 问题时：
1. 通过插件发送请求
2. 查看生成的 `.http` 文件
3. 在 IDE 中单独运行该请求进行调试
4. 修改参数后重新测试

### 场景 2：分享 API 示例

想与同事分享某个 API 的用法：
1. 发送请求生成 `.http` 文件
2. 将文件发送给同事
3. 同事可以直接在 IDE 中运行

### 场景 3：创建 API 文档

为项目创建 API 文档：
1. 收集所有生成的 `.http` 文件
2. 整理到项目的 `docs/api/` 目录
3. 作为可执行的 API 文档

### 场景 4：回归测试

保存重要的 API 请求用于回归测试：
1. 将关键的 `.http` 文件保存到版本控制
2. 需要时直接运行验证 API 是否正常

---

## 📂 文件管理

### 清理旧文件

临时目录会积累很多文件，建议定期清理：

```powershell
# Windows PowerShell - 删除 7 天前的文件
Get-ChildItem "$env:TEMP\maximo-script-helper\*.http" | 
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | 
  Remove-Item
```

```bash
# macOS/Linux - 删除 7 天前的文件
find /tmp/maximo-script-helper -name "*.http" -mtime +7 -delete
```

### 批量导出

如果想保留某些请求：

```powershell
# 复制到指定目录
Copy-Item "$env:TEMP\maximo-script-helper\*.http" "E:\maximo-api-examples\"
```

---

## ⚠️ 注意事项

1. **敏感信息**：生成的文件包含认证信息（MAXAUTH/API Key），不要随意分享
2. **文件大小**：频繁请求会产生大量文件，建议定期清理
3. **性能影响**：生成文件有轻微的性能开销，但在可接受范围内
4. **编码问题**：文件使用 UTF-8 编码，确保你的编辑器支持

---

## 🔗 相关资源

- [IntelliJ IDEA HTTP Client 文档](https://www.jetbrains.com/help/idea/http-client-in-product-code-editor.html)
- [VSCode REST Client 插件](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
- [Maximo REST API 文档](https://www.ibm.com/docs/en/maximo-management/7.6.1?topic=apis-rest)

---

## 🎉 示例工作流程

```typescript
// 1. 在你的代码中发送请求
import { httpGet } from './extension';

const response = await httpGet('os/MXAPIPERSON/1');

// 2. 查看输出通道日志
// [HTTP Client File] 已保存: C:\Users\jiang\AppData\Local\Temp\maximo-script-helper\request-2026-05-17T10-30-00-000Z.http

// 3. 打开该文件
// 在 IntelliJ IDEA 或 VSCode 中打开

// 4. 运行请求并查看结果
// 点击运行按钮，查看响应
```

现在每次发送请求都会自动生成可执行的 `.http` 文件了！🚀
