# 环境管理功能实现进度

## 📅 2026-05-25 最终更新 - 环境选择对话框重构

### ✅ UI 交互优化完成（修正版）

#### 环境选择器设计
- **当前环境显示**：在 label 中用加粗字体显示当前环境名称
- **环境名称输入框**：用户可以输入已有环境名或新环境名（**不自动保存**）
- **切换环境按钮**：点击弹出对话框，从已保存的环境列表中选择
- **保存环境按钮**：将当前配置保存到 envs.json（**手动触发**）

#### 界面布局
```
当前环境: dev
┌─────────────────────────────┬──────────┬──────────┐
│ 输入环境名称                │ 切换环境 │ 保存环境 │
└─────────────────────────────┴──────────┴──────────┘
💡 在输入框中输入环境名称（已有环境或新环境），点击“切换环境”可从列表选择，修改后点击“保存环境”
```

#### 功能说明
1. **新增环境**：
   - 在输入框中输入新的环境名称
   - 填写服务器地址、认证信息等配置
   - 点击“保存环境”按钮
   - 新环境会添加到 envs.json

2. **切换环境**：
   - 点击“切换环境”按钮
   - 弹出对话框显示所有已保存的环境
   - 点击某个环境的“加载”按钮
   - 自动加载该环境的配置到表单

3. **修改环境**：
   - 在输入框中修改环境名称
   - 修改其他配置项
   - 点击“保存环境”按钮
   - 更新 envs.json 中的配置

4. **当前环境显示**：
   - Label 中始终显示当前环境名称（加粗）
   - 方便用户确认当前正在编辑哪个环境

#### 重要修复：移除自动保存
- **问题**：之前环境名称输入框每次输入一个字符都会触发保存，导致频繁写入 envs.json
- **解决**：
  - 创建独立的 `updateEnvnum()` 函数，只更新状态，不自动保存
  - 其他字段仍使用 `updateConfig()` 自动保存
  - 环境名称必须手动点击“保存环境”按钮才会保存
- **效果**：用户可以自由修改环境名称，只有点击保存按钮时才写入文件

#### 新增功能：删除环境
- **UI 设计**：
  - 在环境选择对话框中，每个环境右侧显示两个按钮：“加载”和“删除”
  - “删除”按钮使用红色背景（`var(--vscode-errorForeground)`）以示警告
- **交互流程**：
  1. 点击“切换环境”按钮打开对话框
  2. 找到要删除的环境
  3. 点击该环境的“删除”按钮
  4. **后端弹出确认对话框**（使用 `vscode.window.showWarningMessage`）
  5. 用户选择“删除”或“取消”
  6. 如果确认，后端从 envs.json 中删除配置
  7. 后端发送 `updateEnvList` 消息刷新前端环境列表
  8. 显示成功提示：“环境配置 "xxx" 已删除”
- **安全防护**：
  - 必须通过 VSCode 原生确认对话框二次确认（模态对话框）
  - 删除后自动刷新环境列表，确保 UI 同步
  - 如果环境不存在，显示警告信息
- **技术说明**：
  - VSCode Webview 是沙箱化的，不允许使用 `window.confirm()`
  - 错误信息：`Ignored call to 'confirm()'. The document is sandboxed, and the 'allow-modals' keyword is not set.`
  - 解决方案：使用 `vscode.window.showWarningMessage()` 在后端显示确认对话框

#### 界面布局
```
当前环境: dev
┌─────────────────────────────┬──────────┬──────────┐
│ 输入环境名称                │ 切换环境 │ 保存环境 │
└─────────────────────────────┴──────────┴──────────┘
💡 在输入框中输入环境名称（已有环境或新环境），点击“切换环境”可从列表选择，修改后点击“保存环境”
```

#### 功能说明
1. **新增环境**：
   - 在输入框中输入新的环境名称
   - 填写服务器地址、认证信息等配置
   - 点击“保存环境”按钮
   - 新环境会添加到 envs.json

2. **切换环境**：
   - 点击“切换环境”按钮
   - 弹出对话框显示所有已保存的环境
   - 点击某个环境的“加载”按钮
   - 自动加载该环境的配置到表单

3. **修改环境**：
   - 在输入框中修改环境名称
   - 修改其他配置项
   - 点击“保存环境”按钮
   - 更新 envs.json 中的配置

4. **当前环境显示**：
   - Label 中始终显示当前环境名称（加粗）
   - 方便用户确认当前正在编辑哪个环境

#### 交互流程
```
用户操作流程：
1. 点击"切换环境"按钮
   ↓
2. 弹出环境选择对话框
   ↓
3. 浏览环境列表（如有多个环境可滚动查看）
   ↓
4. 点击某个环境的"加载"按钮
   ↓
5. 自动加载该环境配置到表单
   ↓
6. 对话框自动关闭
   ↓
7. 表单显示新环境配置，标记为有变更
   ↓
8. 用户修改后点击"保存"按钮
   ↓
9. 配置保存到 envs.json
```

#### 代码改动
- **App.tsx**：
  - 添加 `showEnvDialog` 状态
  - 简化主界面环境选择器为单个按钮
  - 在文件末尾添加环境选择对话框组件（92行）
  - 编译成功 ✓

---

## 📋 功能需求（来自 TASK04.md）

### 核心功能
1. **导出脚本目录持久化** ✅ 已完成
2. **环境选项（envnum）管理** ⏳ 待实现

---

## ✅ 已完成：导出脚本目录持久化

### 实现内容

#### 1. package.json 配置
- ✅ 添加 `maximoScript.exportDirectory` 配置项
- 类型：string
- 默认值：""
- 描述：导出脚本目录（用于存储导出的 Maximo 脚本，持久化保存）

#### 2. 后端实现（configPanel.ts）
- ✅ `_selectDirectoryForExtract()` - 选择目录时自动保存到 VSCode 配置
  - 使用 `config.update('exportDirectory', exportPath, vscode.ConfigurationTarget.Global)`
  - 显示成功提示消息
  
- ✅ `_sendInitialConfig()` - 初始化时加载导出目录配置
  - 添加 `exportDirectory: config.get('exportDirectory', '')`
  
- ✅ `_saveConfig()` - 保存配置时包含导出目录
  - 添加 `await config.update('exportDirectory', data.exportDirectory || '', ...)`

#### 3. 前端实现（webview-ui/src/App.tsx）
- ✅ ConfigData 接口添加 `exportDirectory: string` 字段
- ✅ 初始状态添加 `exportDirectory: ''`
- ✅ loadConfig 消息处理 - 加载配置时同时设置 extractDirectoryPath
- ✅ setExtractDirectoryPath 消息处理 - 更新状态时同时更新 config.exportDirectory

### 工作流程
```
用户选择导出目录
    ↓
后端保存到 VSCode 配置 (maximoScript.exportDirectory)
    ↓
后端发送 setExtractDirectoryPath 消息到前端
    ↓
前端更新 extractDirectoryPath 状态 + config.exportDirectory
    ↓
关闭并重新打开配置面板
    ↓
后端发送 loadConfig 消息（包含 exportDirectory）
    ↓
前端设置 config 和 extractDirectoryPath
    ↓
✅ 导出目录正确显示并持久化
```

### 测试验证
- ✅ 选择目录后保存到 VSCode 配置
- ✅ 重新打开配置面板，导出目录正确显示
- ✅ 日志输出：`[ExportDirectory] 导出目录已保存: e:\tmp_backup\maximo-script-backup\dev`

---

## ⏳ 进行中：环境管理功能（envnum）

### 阶段 1 & 2：基础数据结构和后端逻辑 ✅ 已完成

#### 1. 创建环境配置管理模块
- ✅ 创建 `src/envConfig.ts` 文件
- ✅ 定义 `EnvironmentConfig` 接口
- ✅ 实现以下方法：
  - `loadEnvironments()` - 加载所有环境配置
  - `saveEnvironments()` - 保存所有环境配置
  - `findEnvironment()` - 根据环境名称查找配置
  - `upsertEnvironment()` - 添加或更新环境配置
  - `deleteEnvironment()` - 删除环境配置
  - `getEnvironmentNames()` - 获取所有环境名称列表
- ✅ 配置文件路径：`~/.sks/maximo-script-helper/envs.json`

#### 2. package.json 配置
- ✅ 添加 `maximoScript.envnum` 配置项
- 类型：string
- 默认值："default"
- 描述：当前环境名称（用于切换不同的 Maximo 服务器配置）

#### 3. configPanel.ts 后端逻辑
- ✅ 导入 envConfig 模块
- ✅ 修改 `_sendInitialConfig()` 方法
  - 加载环境列表：`envConfig.getEnvironmentNames()`
  - 获取当前环境名：`config.get('envnum', 'default')`
  - 发送 `envnum` 和 `envList` 到前端
  
- ✅ 添加 `_loadEnvironmentConfig()` 方法
  - 根据 envnum 查找环境配置
  - 发送 `loadEnvironmentConfig` 消息到前端
  - 错误处理和提示
  
- ✅ 修改 `_saveConfig()` 方法
  - 保存 `envnum` 到 VSCode 配置
  - 构建 `EnvironmentConfig` 对象
  - 调用 `envConfig.upsertEnvironment()` 保存到 envs.json
  - 日志记录和错误处理

### 阶段 3：前端 UI ✅ 已完成

#### 1. ConfigData 接口扩展
- ✅ 添加 `envnum: string` 字段
- ✅ 添加 `envList: string[]` 字段

#### 2. 状态管理
- ✅ 初始状态添加 `envnum: 'default'`
- ✅ 初始状态添加 `envList: []`
- ✅ 添加 `envsCache` 状态（用于缓存环境配置）
- ✅ 添加 `hasChanges` 状态（是否有未保存的变更）

#### 3. 配置变化检测
- ✅ 修改 `updateConfig` 函数 - 任何配置更新时标记 `hasChanges = true`
- ✅ 修改 `handleSave` 函数 - 保存后清除 `hasChanges = false`

#### 4. 环境选择器 UI
- ✅ 在“连接配置”页面顶部添加环境选项
- ✅ 使用 `<input list="env-list">` + `<datalist>` 实现 combobox
- ✅ 支持手动输入和下拉选择
- ✅ **智能按钮切换**：
  - 当环境存在于 envList 时，显示“加载”按钮
  - 当环境不存在时，显示“保存环境”按钮（蓝色高亮）
  - 点击“保存环境”直接调用 saveConfig，将当前配置保存为新环境
- ✅ 动态提示文本：
  - 环境存在时：`环境 "xxx" 已存在，点击“加载”可应用该环境的配置`
  - 环境不存在时：`环境 "xxx" 不存在，点击“保存环境”可将当前配置保存为新环境`
  - 环境名为空时：`默认环境名为 "default"，可以自定义其他环境名称`

#### 5. 保存提醒 UI
- ✅ 在保存配置按钮上方显示红色警告框
- ✅ 当 `hasChanges === true` 时显示
- ✅ 使用 VSCode 主题变量（errorForeground, inputValidation-errorBackground, inputValidation-errorBorder）
- ✅ 显示文本：“⚠️ 有未保存的配置变更”

#### 6. 消息处理
- ✅ 添加 `loadEnvironmentConfig` 消息处理
  - 接收后端发送的环境配置数据
  - 更新 config 中的连接配置字段（serverUrl, authType, maxauth, apiKey, apiType, version, completionMode）
  - 标记 `hasChanges = true`
  - 控制台日志记录

### 需求详情

#### 1. UI 界面
- [ ] 在"连接配置"页面的服务器地址上方添加环境选项
- [ ] 支持下拉选择和手动输入（combobox）
- [ ] 右侧添加"加载"按钮
- [ ] 保存配置按钮上方显示红色提示（有变更时显示，保存后消失）

#### 2. 数据存储
- [ ] 环境配置保存到 `~/.sks/maximo-script-helper/envs.json`
- [ ] 只保存连接配置信息：
  - serverUrl
  - authType
  - maxauth
  - apiKey
  - apiType
  - version
  - completionMode
  - （其他连接相关配置）

#### 3. 功能逻辑
- [ ] 默认环境名为 "default"
- [ ] 页面初始化时：
  - 从 VSCode 配置读取当前配置
  - 加载 envs.json 到页面缓存（envsCache）
- [ ] 如果当前环境名不存在于 envsCache，加载按钮禁用
- [ ] 点击"保存配置"时：
  - 更新 VSCode 配置
  - 根据 envnum 查找 envsCache
  - 如果存在则更新，不存在则新增
  - 保存 envsCache 到 envs.json
- [ ] 点击"加载"按钮时：
  - 将 envsCache 中对应环境的配置填充到表单
  - 更新所有连接配置字段

#### 4. 保存提醒
- [ ] 保存配置按钮上方显示红色提示文字
- [ ] 监听配置变化（任何字段修改）
- [ ] 有变更时显示提示
- [ ] 保存成功后隐藏提示

### 需要修改的文件

#### 后端文件
1. **src/configPanel.ts**
   - 添加环境配置管理方法
   - 添加 envs.json 读写逻辑
   - 修改 _sendInitialConfig 发送环境列表
   - 添加加载环境配置的消息处理
   - 修改 _saveConfig 保存环境配置

2. **package.json**
   - 添加 `maximoScript.envnum` 配置项（可选，主要用于记住上次选择的环境）

#### 前端文件
1. **webview-ui/src/App.tsx**
   - 添加 envnum 状态
   - 添加 envsCache 状态（环境配置缓存）
   - 添加 hasChanges 状态（是否有未保存的变更）
   - 添加环境选择 UI（combobox + 加载按钮）
   - 添加保存提醒 UI
   - 添加环境切换和加载逻辑
   - 监听配置变化标记 hasChanges

2. **webview-ui/src/App.css**
   - 添加保存提醒样式（红色提示）
   - 添加环境选择器样式

### 实现步骤规划

#### 阶段 1：基础数据结构
1. 创建环境配置接口定义
2. 实现 envs.json 读写工具方法
3. 添加 envnum 配置项到 package.json

#### 阶段 2：后端逻辑
1. 实现加载 envs.json 的方法
2. 实现保存 envs.json 的方法
3. 修改 _sendInitialConfig 发送环境列表
4. 添加加载环境配置的消息处理
5. 修改 _saveConfig 保存环境配置

#### 阶段 3：前端 UI
1. 添加环境选择器组件（combobox）
2. 添加加载按钮
3. 添加保存提醒提示
4. 实现环境切换逻辑
5. 实现配置变化检测

#### 阶段 4：集成测试
1. 测试环境创建和保存
2. 测试环境加载
3. 测试环境切换
4. 测试保存提醒功能
5. 测试持久化（重启后保留）

### 技术难点
1. **Combobox 实现**：VSCode Webview 中没有原生的 combobox，需要自定义实现（input + datalist 或自定义下拉）
2. **配置变化检测**：需要深度比较配置对象，检测是否有任何字段变化
3. **数据同步**：确保前端 envsCache 和后端 envs.json 保持同步
4. **错误处理**：envs.json 文件不存在、解析失败等情况的处理

### 预计工作量
- 后端实现：约 200-300 行代码
- 前端实现：约 150-200 行代码
- 样式调整：约 50 行 CSS
- 测试调试：约 1-2 小时

---

## 📝 备注

- ✅ 导出目录持久化功能已于 2026-05-27 完成并测试通过
- ✅ 环境管理功能（阶段 1-3）已于 2026-05-27 完成代码实现
- ⏳ 待测试：需要编译并测试完整功能
- ⏳ 待优化：envsCache 的前端缓存逻辑（目前后端未发送完整的 envsCache 数据）

### 已实现的功能清单

#### 后端 (TypeScript)
1. ✅ `src/envConfig.ts` - 环境配置管理模块
2. ✅ `package.json` - 添加 envnum 配置项
3. ✅ `src/configPanel.ts` - 环境配置的加载、保存和消息处理

#### 前端 (React + TypeScript)
1. ✅ `webview-ui/src/App.tsx` - 环境选择器 UI 和状态管理
2. ✅ 配置变化检测和保存提醒
3. ✅ 环境配置的加载和应用

### 下一步工作

1. **编译项目**
   ```bash
   npm run compile
   cd webview-ui && npm run build
   ```

2. **测试功能**
   - 测试环境创建和保存
   - 测试环境加载
   - 测试环境切换
   - 测试保存提醒功能
   - 测试持久化（重启后保留）

3. **可能的优化**
   - 添加环境删除功能
   - 添加环境复制功能
   - 改进 envsCache 的前端缓存策略
   - 添加环境配置的导入/导出功能

---

*最后更新：2026-05-27 21:30*
