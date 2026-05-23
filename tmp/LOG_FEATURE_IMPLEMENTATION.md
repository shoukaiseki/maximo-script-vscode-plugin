# Maximo 日志管理功能实施步骤

## 📋 需求概述

在 Maximo 配置面板中增加日志管理功能，包括：
1. 左侧导航栏添加"日志"菜单
2. 日志显示标签页 - 实时查看日志
3. 日志级别设置标签页 - 配置和管理日志级别

---

## 🎯 实施步骤

### 阶段一：前端 UI 开发（Webview React）

#### 1.1 修改 App.tsx
- [ ] 在左侧导航菜单添加"日志"选项
- [ ] 添加路由/状态管理，切换到日志页面
- [ ] 创建日志管理主组件 `LogManager`

#### 1.2 创建日志显示组件
**文件**: `webview-ui/src/components/LogViewer.tsx`
- [ ] 实现日志列表展示
- [ ] 支持日志过滤和搜索
- [ ] 自动刷新功能
- [ ] 日志级别颜色标识

#### 1.3 创建日志级别配置组件
**文件**: `webview-ui/src/components/LogLevelConfig.tsx`
- [ ] 实现可编辑表格
  - [ ] 日志名称列（可输入）
  - [ ] 日志级别下拉选择（DEBUG/INFO/WARN/ERROR）
  - [ ] 忽略设置勾选框
  - [ ] 操作按钮（删除、重新加载）
- [ ] 添加新行功能（最后一行空行直接输入）
- [ ] JSON 源码编辑模式切换
- [ ] 本地缓存和过滤功能
- [ ] 查询所有日志级别按钮
- [ ] 批量保存按钮

#### 1.4 样式优化
**文件**: `webview-ui/src/App.css`
- [ ] 表格样式
- [ ] 按钮样式
- [ ] 响应式布局

---

### 阶段二：后端逻辑开发（TypeScript Extension）

#### 2.1 扩展消息协议
**文件**: `src/configPanel.ts`
- [ ] 定义新的消息类型：
  - `getLoggers` - 获取日志列表
  - `updateLoggerLevel` - 更新日志级别
  - `queryLoggerLevel` - 查询日志级别
  - `saveLoggerConfig` - 保存配置到本地
  - `loadLoggerConfig` - 加载本地配置

#### 2.2 实现 API 调用方法
**文件**: `src/configPanel.ts`
- [ ] `_getLoggers()` - 调用 SKS_LOGGER_LEVEL_QUERY
- [ ] `_updateLoggerLevel()` - 调用 SKS_LOGGER_LEVEL_UPDATE
- [ ] `_saveLoggerConfigToLocal()` - 保存到 ~/.sks/maximo-script-helper/
- [ ] `_loadLoggerConfigFromLocal()` - 从本地加载配置

#### 2.3 持久化存储
**文件**: `src/configPanel.ts`
- [ ] 确定存储路径：`~/.sks/maximo-script-helper/logger-config.json`
- [ ] 实现文件读写逻辑
- [ ] 处理文件不存在的情况
- [ ] JSON 格式验证

#### 2.4 消息处理
**文件**: `src/configPanel.ts` - `_handleMessage()` 方法
- [ ] 添加 case 'getLoggers'
- [ ] 添加 case 'updateLoggerLevel'
- [ ] 添加 case 'queryLoggerLevel'
- [ ] 添加 case 'saveLoggerConfig'
- [ ] 添加 case 'loadLoggerConfig'

---

### 阶段三：前后端联调

#### 3.1 数据流测试
- [ ] 测试查询所有日志级别
- [ ] 测试单个日志级别查询
- [ ] 测试批量更新日志级别
- [ ] 测试配置保存和加载

#### 3.2 UI 交互测试
- [ ] 表格编辑功能
- [ ] 下拉选择功能
- [ ] JSON 编辑模式切换
- [ ] 本地缓存过滤
- [ ] 重新加载单行

#### 3.3 错误处理
- [ ] API 调用失败处理
- [ ] 文件格式错误处理
- [ ] 网络超时处理
- [ ] 用户友好的错误提示

---

### 阶段四：优化和完善

#### 4.1 性能优化
- [ ] 添加防抖查询（避免频繁请求）
- [ ] 优化表格渲染（大数据量）
- [ ] 缓存策略优化

#### 4.2 用户体验
- [ ] 添加加载状态提示
- [ ] 操作成功/失败反馈
- [ ] 键盘快捷键支持
- [ ] 帮助提示信息

#### 4.3 代码质量
- [ ] TypeScript 类型检查
- [ ] 代码注释完善
- [ ] 错误边界处理
- [ ] 日志输出优化

---

## 📁 需要修改的文件清单

### Webview UI (React)
```
webview-ui/src/
├── App.tsx                    # 添加日志菜单和路由
├── App.css                    # 添加样式
└── components/                # 新建目录
    ├── LogManager.tsx         # 日志管理主组件
    ├── LogViewer.tsx          # 日志显示组件
    └── LogLevelConfig.tsx     # 日志级别配置组件
```

### Extension Backend (TypeScript)
```
src/
└── configPanel.ts             # 添加日志管理相关方法和消息处理
```

### 配置文件
```
~/.sks/maximo-script-helper/
└── logger-config.json         # 运行时生成，持久化存储
```

---

## 🔧 技术要点

### 1. React 表格实现
- 使用受控组件管理表格状态
- 动态添加/删除行
- 实时数据绑定

### 2. 本地存储
- 使用 Node.js `fs` 模块读写文件
- 路径：`os.homedir() + '/.sks/maximo-script-helper/'`
- JSON 格式序列化/反序列化

### 3. API 调用
- 复用现有的 `httpRequestToMaximo` 方法
- 统一的错误处理机制
- 认证头自动添加

### 4. 状态管理
- 使用 React useState/useEffect
- 本地缓存与服务器数据同步
- 防抖和节流优化

---

## ⚠️ 注意事项

1. **安全性**：API Key 等敏感信息不要硬编码
2. **兼容性**：确保在不同操作系统上路径正确
3. **容错性**：处理文件不存在、JSON 解析失败等情况
4. **用户体验**：提供清晰的反馈和提示
5. **性能**：避免频繁的网络请求和文件 I/O

---

## ✅ 验收标准

- [ ] 左侧导航栏显示"日志"菜单
- [ ] 可以切换到日志显示页面
- [ ] 可以切换到日志级别配置页面
- [ ] 表格可以正常编辑（添加、删除、修改）
- [ ] 日志级别下拉选择正常工作
- [ ] 查询功能正常（全部查询、单个查询）
- [ ] 保存功能正常（更新到服务器）
- [ ] 本地配置持久化正常（重启后保留）
- [ ] JSON 编辑模式可以切换
- [ ] 错误提示友好且准确
- [ ] 界面美观、响应迅速

---

*创建时间：2026-05-21*
*预计完成时间：待评估*
