feat: 实现创建脚本功能 - 通过 Webview 弹出框选择脚本类型

## 功能概述

实现右键点击资源管理器创建脚本的功能，使用 Webview 弹出框方式，通过标签页区分普通脚本和对象启动点脚本，根据选择的脚本类型自动匹配模板并生成对应的 JS 和 JSON 文件。

## 主要修改

### 新增文件

- [src/createScriptPanel.ts](file:///e:/gitwork/maximo-script-vscode-plugin/src/createScriptPanel.ts) - 创建脚本面板类，处理模板加载、脚本生成和文件写入
- [webview-ui/src/components/CreateScriptModal.tsx](file:///e:/gitwork/maximo-script-vscode-plugin/webview-ui/src/components/CreateScriptModal.tsx) - React 组件，实现标签页切换和脚本创建表单
- [webview-ui/src/createScriptMain.tsx](file:///e:/gitwork/maximo-script-vscode-plugin/webview-ui/src/createScriptMain.tsx) - 创建脚本面板入口文件
- [webview-ui/vite.config.create-script.ts](file:///e:/gitwork/maximo-script-vscode-plugin/webview-ui/vite.config.create-script.ts) - 创建脚本面板的 Vite 构建配置
- [template/cn/shoukaiseki/tmpl/SKS_TMPL_OBJECT.INITZOMBIE.js](file:///e:/gitwork/maximo-script-vscode-plugin/template/cn/shoukaiseki/tmpl/SKS_TMPL_OBJECT.INITZOMBIE.js) - 对象僵尸初始化脚本模板
- [template/cn/shoukaiseki/tmpl/SKS_TMPL_OBJECT.SAVE.js](file:///e:/gitwork/maximo-script-vscode-plugin/template/cn/shoukaiseki/tmpl/SKS_TMPL_OBJECT.SAVE.js) - 对象保存脚本模板

### 修改文件

- [src/extension.ts](file:///e:/gitwork/maximo-script-vscode-plugin/src/extension.ts) - 注册 `createScriptFromTemplateCommand` 命令，使用 CreateScriptPanel 打开 Webview
- [webview-ui/package.json](file:///e:/gitwork/maximo-script-vscode-plugin/webview-ui/package.json) - 添加二次构建命令，支持创建脚本面板的单独构建
- [template/cn/shoukaiseki/tmpl/SKS_TMPL_OBJECT.INIT.js](file:///e:/gitwork/maximo-script-vscode-plugin/template/cn/shoukaiseki/tmpl/SKS_TMPL_OBJECT.INIT.js) - 更新模板内容

## 技术要点

1. **脚本类型分类**：普通脚本（APISCRIPT、CONDITION、DATABEAN 等）、对象启动点脚本（OBJECT.INIT、OBJECT.SAVE 等）、字段启动点脚本（FLD_ACTION、FLD_VALIDATE 等）
2. **对象启动点配置**：支持配置对象名称、字段名称、事件类型（初始化值、验证应用程序、保存等）、保存操作（添加/更新/删除）、事件上下文（保存前/保存后/落实后）、条件表达式
3. **模板匹配**：根据脚本类型自动查找 `SKS_TMPL_{scriptType}.js` 模板文件，不存在时生成默认内容
4. **JSON 生成**：根据脚本类型和启动点配置自动生成完整的 JSON 配置文件，参考 Maximo 导出脚本格式

## 使用方式

右键点击资源管理器中的目录或文件 → 选择"Maximo Script: 从模板创建脚本" → 在弹出的对话框中选择标签页和脚本类型 → 配置启动点（如需要）→ 点击创建

## 参考文档

- [TASK08.md](file:///e:/gitwork/maximo-script-vscode-plugin/TASK/TASK08.md)
- [SKS_GET_AUTOSCRIPTINFOBYNAME.js](file:///E:/gitwork/wushiling/jsproject/masscript/cn/shoukaiseki/tools/SKS_GET_AUTOSCRIPTINFOBYNAME.js)
- [maximo-autoscript-api SKILL](file:///e:/gitwork/maximo-script-vscode-plugin/.lingma/skills/maximo-autoscript-api/SKILL.md)