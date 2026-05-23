# 日志管理功能测试指南

## ✅ 已完成的功能

### 前端 (React Webview)
- [x] 左侧导航栏添加"日志"菜单
- [x] 日志查看标签页
  - 日志列表显示（带颜色标识）
  - 搜索过滤功能
  - 自动刷新选项
  - 清空日志按钮
- [x] 日志级别配置标签页
  - 可编辑表格（日志名称、级别、忽略）
  - 添加/删除行
  - 下拉选择日志级别
  - JSON 源码编辑模式
  - 查询所有日志级别
  - 重新加载单个日志器
  - 批量保存配置
  - 本地持久化存储

### 后端 (TypeScript Extension)
- [x] 消息处理（loadLoggerConfig, saveLoggerConfig, queryLoggerLevel, updateLoggerLevel）
- [x] API 调用封装
  - SKS_LOGGER_LEVEL_QUERY
  - SKS_LOGGER_LEVEL_UPDATE
- [x] 本地配置持久化
  - 路径：`~/.sks/maximo-script-helper/logger-config.json`
  - 自动创建目录
  - JSON 格式读写

---

## 🧪 测试步骤

### 1. 启动调试
```bash
# 按 F5 启动调试
# 或运行命令：npm run compile
```

### 2. 打开配置面板
- 点击右下角 "Maximo配置"
- 或运行命令：`Maximo Script: Show Config`

### 3. 测试日志菜单
- 在左侧导航栏找到并点击 **"日志"**
- 确认显示两个标签页：
  - 📋 日志查看
  - ⚙️ 日志级别配置

### 4. 测试日志查看
- 切换到"日志查看"标签页
- 应该看到模拟的日志数据
- 测试搜索功能
- 测试清空按钮

### 5. 测试日志级别配置

#### 5.1 表格模式
1. 切换到"日志级别配置"标签页
2. 点击"➕ 添加行"或直接点击底部的"+ 点击添加新行"
3. 输入日志名称，例如：`maximo.script`
4. 选择日志级别：DEBUG/INFO/WARN/ERROR
5. 勾选"忽略"复选框（可选）
6. 点击"🔍 查询所有"按钮
   - 应该调用 API 查询所有日志器
7. 点击某行的"🔄"按钮
   - 应该重新加载该日志器的级别
8. 点击"💾 保存配置"按钮
   - 应该更新服务器上的日志级别
   - 同时保存到本地配置文件

#### 5.2 JSON 模式
1. 点击"📝 JSON 模式"按钮
2. 应该看到当前配置的 JSON 格式
3. 编辑 JSON 内容
4. 再次点击"📋 表格模式"
   - 应该解析 JSON 并更新表格

#### 5.3 本地持久化
1. 添加几个日志器配置
2. 点击"💾 保存配置"
3. 关闭配置面板
4. 重新打开配置面板
5. 切换到"日志级别配置"
6. 应该看到之前保存的配置

---

## 📂 配置文件位置

### Windows
```
C:\Users\<用户名>\.sks\maximo-script-helper\logger-config.json
```

### Linux/Mac
```
~/.sks/maximo-script-helper/logger-config.json
```

### 文件格式示例
```json
[
  {
    "loggerName": "maximo.script",
    "level": "WARN",
    "ignore": false
  },
  {
    "loggerName": "maximo.script.TEST01",
    "level": "DEBUG",
    "ignore": false
  }
]
```

---

## 🔌 API 接口

### 查询日志级别
```
POST script/SKS_LOGGER_LEVEL_QUERY
Content-Type: application/json

{
  "loggers": [
    { "loggerName": "maximo.script" },
    { "loggerName": "maximo.script.TEST01" }
  ]
}
// loggers 为空数组则查询所有
```

**响应：**
```json
{
  "success": true,
  "message": "OK",
  "result": [
    {
      "loggerName": "maximo.script",
      "level": "WARN"
    }
  ]
}
```

### 更新日志级别
```
POST script/SKS_LOGGER_LEVEL_UPDATE
Content-Type: application/json

{
  "loggers": [
    { "loggerName": "maximo.script", "level": "WARN" },
    { "loggerName": "maximo.script.TEST01", "level": "DEBUG" }
  ]
}
```

**响应：**
```json
{
  "success": true,
  "message": "MXLogger 日志级别已成功修改",
  "result": [
    {
      "loggerName": "maximo.script",
      "level": "WARN",
      "status": "SUCCESS"
    }
  ]
}
```

---

## ⚠️ 注意事项

1. **临时生效**：当前设置仅临时有效，重启 Maximo 后会恢复，不会更新 MAXLOGGER 表
2. **API 依赖**：需要 Maximo 系统中已部署 `SKS_LOGGER_LEVEL_QUERY` 和 `SKS_LOGGER_LEVEL_UPDATE` 脚本
3. **网络连接**：查询和保存功能需要连接到 Maximo 服务器
4. **权限要求**：需要有足够的权限调用这些 API

---

## 🐛 已知问题

1. 日志查看功能目前是模拟数据，需要从后端实时推送日志
2. 自动刷新功能尚未实现（UI 已有但未连接后端）

---

*创建时间：2026-05-23*
*版本：1.2.4*
