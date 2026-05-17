# 工具箱功能实现计划

## 功能概述
在 VSCode 插件的配置面板中添加工具箱页面，包含两个标签页：
1. **初始化脚本** - 一键部署 Maximo 开发工具脚本到服务器
2. **导入脚本** - 将本地脚本文件部署到 Maximo 服务器

## 技术栈
- 前端：React + TypeScript (webview-ui)
- 后端：VSCode Extension API + httpRequestToMaximo
- 通信：postMessage / onDidReceiveMessage

## 实现步骤

### 第一步：React UI 实现
1. 修改 `webview-ui/src/App.tsx`
   - 添加标签页状态管理（activeToolboxTab）
   - 创建"初始化脚本"标签页 UI
   - 创建"导入脚本"标签页 UI
   - 添加输出日志显示区域

2. UI 组件设计：
   ```typescript
   // 初始化脚本标签页
   - 说明文字
   - "开始初始化"按钮
   - 进度条
   - 输出日志区域（可清空）
   
   // 导入脚本标签页
   - 部署模式选择（单文件/目录）
   - 文件/目录选择输入框 + 选择按钮
   - 递归子目录复选框（仅目录模式）
   - "开始导入"按钮
   - 输出日志区域（可清空）
   ```

### 第二步：前端消息处理
1. 添加命令发送函数：
   - `handleInitScripts()` - 发送 initScripts 命令
   - `handleDeployScript(filePath)` - 发送 deployScript 命令
   - `handleSelectFile()` - 发送 selectFileForDeploy 命令
   - `handleSelectDirectory()` - 发送 selectDirectoryForDeploy 命令

2. 添加消息接收处理：
   - `updateToolboxOutput` - 更新输出日志
   - `updateInitProgress` - 更新初始化进度
   - `setFilePath` - 设置选择的文件路径
   - `setDirectoryPath` - 设置选择的目录路径

### 第三步：后端命令处理
1. 修改 `src/configPanel.ts`
   - 在 `onDidReceiveMessage` 中添加新命令处理：
     - `initScripts` - 初始化工具脚本
     - `deployScript` - 导入单个脚本
     - `deployDirectory` - 导入目录下所有脚本
     - `selectFileForDeploy` - 选择要导入的文件
     - `selectDirectoryForDeploy` - 选择要导入的目录

2. 实现核心功能函数：
   - `_initScripts()` - 读取并部署所有工具脚本
   - `_deploySingleFile(filePath)` - 部署单个 JSON 配置文件
   - `_deployDirectory(dirPath, recursive)` - 批量部署目录下的脚本
   - `_selectFileForDeploy()` - 打开文件选择对话框
   - `_selectDirectoryForDeploy()` - 打开目录选择对话框

### 第四步：脚本部署逻辑
1. 脚本文件格式（JSON 配置）：
   ```json
   {
     "AUTOSCRIPT": "SCRIPT_NAME",
     "DESCRIPTION": "脚本描述",
     "SCRIPTLANGUAGE": "javascript",
     "SOURCE": "脚本源代码内容或文件路径"
   }
   ```

2. 部署流程：
   - 读取 JSON 配置文件
   - 解析 AUTOSCRIPT、SCRIPTLANGUAGE 等字段
   - 根据 SCRIPTLANGUAGE 确定脚本扩展名（.js 或 .py）
   - 查找同名的脚本源文件
   - 使用 httpRequestToMaximo 发送 POST 请求到 Maximo API
   - 返回部署结果

3. HTTP API 端点：
   - OSLC: `/oslc/os/script/`
   - REST: `/api/script/`

### 第五步：错误处理和用户体验
1. 添加加载状态（按钮禁用、显示"处理中..."）
2. 实时输出日志（使用 append 方式）
3. 进度条显示（初始化脚本时）
4. 错误提示（清晰的错误信息）
5. 成功提示（部署完成后显示总结）

## 关键注意事项

1. **不要修改 httpRequest.ts** - 使用现有的 `httpRequestToMaximo` 方法
2. **即时保存已实现** - 工具箱不需要保存配置
3. **文件选择** - 使用 VSCode 的 `showOpenDialog` API
4. **日志输出** - 通过 postMessage 实时发送到前端
5. **错误处理** - 每个步骤都要有 try-catch

## 参考项目
E:\gitwork\maximo-script-manager\toolbox.js
- startInitScripts() - 初始化脚本逻辑
- startDeploy() - 导入脚本逻辑
- deploySingleFile() - 单文件部署
- appendToolOutput() - 日志输出

## 预计工作量
- React UI: 200-300 行
- 后端命令处理: 300-400 行
- 总计: 500-700 行新代码

## 测试要点
1. 标签页切换是否正常
2. 文件/目录选择是否工作
3. 脚本部署是否成功
4. 日志输出是否实时显示
5. 错误处理是否友好
