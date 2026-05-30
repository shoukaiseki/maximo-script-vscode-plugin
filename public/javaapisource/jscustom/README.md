# SKS_LOG_ANSI_UTILS 类型定义

## 概述

本目录包含 `SKS_LOG_ANSI_UTILS.js` 脚本的类型定义文件，用于在 Maximo JavaScript 环境中提供 IntelliSense 代码提示和类型检查。

## 文件说明

### 1. AnsiLoggerConfig.d.ts
定义 `AnsiLogger` 的配置接口：
```typescript
interface AnsiLoggerConfig {
    logger: psdi.util.logging.MXLogger;  // Maximo 日志记录器实例
    ansiOpen?: boolean;                       // 是否启用 ANSI 颜色代码（默认 false）
}
```

### 2. AnsiLogger.d.ts
定义支持 ANSI 颜色代码的日志记录器类：
```typescript
class AnsiLogger {
    logger: psdi.util.logging.MXLogger;
    ansiOpen: boolean;
    
    constructor(config: jscustom.AnsiLoggerConfig);
    setLevel(level: any): void;
    debug(msg: string, error?: any): void;
    info(msg: string, error?: any): void;
    warn(msg: string, error?: any): void;
    error(msg: string, error?: any): void;
}
```

### 3. sksLogAnsiUtils.d.ts
定义工具函数命名空间：
```typescript
namespace sksLogAnsiUtils {
    function formatMsgByAnsiCode(msg: string, ansiCode: string): string;
    function formatMsgByLevel(msg: string, levelStr: string, ansiOpen?: boolean): string;
    function newAnsiLogger(config: jscustom.AnsiLoggerConfig): jscustom.AnsiLogger;
}
```

## 使用方法

### 1. 在 JavaScript 文件中引用类型定义

在您的 JavaScript 文件顶部添加以下引用：
```javascript
/// <reference path="/javaapi/global.d.ts" />
```

### 2. 获取工具函数

通过 Maximo 服务调用获取工具函数：
```javascript
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
```

### 3. 创建 AnsiLogger 实例

使用完整的命名空间路径进行类型断言：
```javascript
// 创建 Maximo 日志记录器
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
var loggerMX = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

// 创建 AnsiLogger 实例（推荐方式）
/** @type {jscustom.AnsiLogger} */
var logger = sksLogAnsiUtils.newAnsiLogger({
    logger: loggerMX,
    ansiOpen: true
});

// 使用日志方法
logger.debug("调试信息");
logger.info("普通信息");
logger.warn("警告信息");
logger.error("错误信息");
```

### 4. 使用工具函数

```javascript
// 根据 ANSI 代码格式化消息
var redMsg = sksLogAnsiUtils.formatMsgByAnsiCode("红色文本", "31");

// 根据日志级别格式化消息
var errorMsg = sksLogAnsiUtils.formatMsgByLevel("错误信息", "ERROR", true);
```

## 注意事项

### ⚠️ 重要：解决类型提示失效问题

如果遇到类型提示不工作或"标识符重复"错误，请按照以下步骤操作：

#### 步骤 1：重启 TypeScript 服务器
在 VS Code 中执行命令：
1. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
2. 输入并选择："TypeScript: Restart TS Server"

#### 步骤 2：清除 TypeScript 缓存（如果步骤 1 无效）
1. **完全关闭 VS Code**
2. 删除 TypeScript 缓存文件夹：
   - Windows: 删除 `%APPDATA%\Code\User\workspaceStorage` 中对应当前项目的文件夹
   - Mac: 删除 `~/Library/Application Support/Code/User/workspaceStorage` 中的对应文件夹
   - Linux: 删除 `~/.config/Code/User/workspaceStorage` 中的对应文件夹
3. **重新打开 VS Code**

#### 步骤 3：验证配置
确保以下配置文件正确：
- `javaapi/global.d.ts` - 包含对所有 `.d.ts` 文件的引用
- `tsconfig.json` - 正确配置 `typeRoots` 和 `types`
- `.vscode/settings.json` - 启用 JavaScript 类型检查

### 其他注意事项

1. **必须使用完整命名空间路径**：在进行类型断言时，必须使用 `jscustom.AnsiLogger` 而不是简短的 `AnsiLogger`。

2. **避免重复声明**：不要在 `.d.ts` 文件中使用 `export` 语法，应使用 `declare namespace` 确保类型挂载到全局命名空间。

3. **符号链接问题**：本项目中 `javaapi` 目录是符号链接，可能导致类型重复加载。如果遇到问题，请严格按照上述步骤清除缓存。

4. **ANSI 颜色代码**：
   - 31: 红色
   - 32: 绿色
   - 33: 黄色
   - 34: 蓝色
   - 35: 品红
   - 36: 青色
   - 37: 白色

## 示例代码

完整示例请参考：
- `masscript/cn/shoukaiseki/test/TEST_SKS_LOG_ANSI_UTILS.js`
- `masscript/cn/shoukaiseki/tools/SKS_LOG_ANSI_UTILS.js`

## 故障排查

### 问题 1：类型提示不工作
**解决方案**：
1. 确认 JS 文件头部有 `/// <reference path="/javaapi/global.d.ts" />`
2. 重启 TypeScript 服务器
3. 检查 `tsconfig.json` 配置是否正确

### 问题 2：出现"标识符重复"错误
**解决方案**：
1. 检查是否有多个地方定义了相同的类型
2. 清除 TypeScript 缓存（见上方步骤 2）
3. 确认没有在同一命名空间中重复声明

### 问题 3：找不到类型定义
**解决方案**：
1. 确认 `global.d.ts` 中包含了对相应 `.d.ts` 文件的引用
2. 检查文件路径是否正确
3. 重启 VS Code
