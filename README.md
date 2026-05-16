# Maximo Script Helper - VSCode 插件

Maximo自动化脚本开发助手，为VSCode提供智能代码补全、语法提示等功能。

## 功能特性

- ✨ **智能代码补全**：支持Maximo常用对象的API自动补全
- 📝 **JSDoc 类型注释**：通过 `/** @type {ClassName} */` 获得精确的类型提示
- 🔗 **链式调用支持**：自动推断方法返回值类型，支持复杂链式调用
- 🔄 **多版本支持**：兼容Maximo 7.6和9.1
- 💡 **实时提示**：方法说明和参数提示
- 🚀 **高性能缓存**：智能缓存机制，提升补全速度
- ⚙️ **灵活配置**：可启用/禁用 JSDoc 解析和类型推断功能
- 🎯 **JavaScript 专属优化**：针对 JavaScript 语言深度优化的补全体验

## 安装

### 方式一：从市场安装（待发布）
```bash
# 在VSCode扩展市场搜索 "Maximo Script Helper"
```

### 方式二：本地安装
```bash
# 1. 进入插件目录
cd maximo-script-vscode-plugin

# 2. 安装依赖
npm install

# 3. 编译插件
npm run compile

# 4. 打包插件
npm run package

# 5. 在VSCode中安装生成的 .vsix 文件
```

## 配置

### 打开配置面板

1. 点击状态栏的 **Maximo配置** 按钮
2. 或按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)
3. 输入 `Maximo Script: 打开配置`
4. 或直接运行命令：`maximoScript.showConfig`

### 配置项说明

#### 连接配置
- **服务器地址**：Maximo服务器的完整URL（例如：http://localhost:9080/maximo）
- **认证信息**：Base64编码的用户名和密码（格式：username:password）
- **Maximo版本**：选择您的Maximo版本（7.6 或 9.1）

#### 补全设置
- **启用代码补全**：开启/关闭智能补全功能
- **启用 JSDoc 类型注释解析**：从 `/** @type {ClassName} */` 注释中提取变量类型
- **启用返回值类型推断**：支持链式调用的类型推导
- **本地API数据目录**：指向包含 JSON API 反射数据的目录

### 获取MAXAUTH

```javascript
// 在浏览器控制台执行
btoa('maxadmin:123456')
// 返回：bWF4YWRtaW46MTIzNDU2
```

## 使用方法

### 代码补全

插件专为 **JavaScript** 语言优化，在 `.js` 文件中提供智能补全。

#### 1. 隐式变量补全

Maximo 脚本中的默认变量无需声明即可使用：

```javascript
// 输入 mbo. 后会显示MBO相关方法
mbo.getString("assetnum")
mbo.setValue("description", "Test")

// 输入 mboset. 后会显示集合操作方法
mboset.moveFirst()
mboset.count()

// 输入 service. 后会显示可用的方法
service.log("Test message")
service.getMboSet("ASSET", userInfo)
```

#### 2. JSDoc 类型注释补全（新功能）✨

通过 JSDoc 注释为变量指定类型，获得精确的方法补全：

```javascript
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// 现在输入 assetMbo. 会显示 MboRemote 的所有方法
assetMbo.getString("assetnum");
assetMbo.getInt("priority");
```

**支持的格式**：
- 标准多行注释：`/** @type {ClassName} */\nvar variable;`
- 单行注释：`/** @type {ClassName} */ var variable;`
- 多变量声明：`/** @type {ClassName} */ var var1, var2;`
- 表达式映射：`/** @type {ClassName} b3.getMbo(\d) */`

详见：[JSDoc 补全功能使用指南](./JSDOC_COMPLETION_GUIDE.md)

#### 3. 链式调用支持（新功能）✨

插件会自动推断方法返回值类型，支持复杂的链式调用：

```javascript
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// 自动推断 locationSet 为 MboSetRemote
var locationSet = assetMbo.getMboSet("LOCATIONS");

// 输入 locationSet. 会显示 MboSetRemote 的方法
locationSet.moveFirst();
locationSet.count();

// 自动推断 firstLocation 为 MboRemote
var firstLocation = locationSet.moveFirst();
firstLocation.getString("location");
```

#### 4. 本地 API 数据补全

1. **获取 API 数据**：
   - 访问 Gitee 仓库：https://gitee.com/shoukaiseki/maximo-script-editor/tree/master/reflection-data
   - 下载或克隆 `reflection-data` 目录到本地
   - 例如保存到：`E:\maximo-reflection-data`（或其他任意位置）

2. **配置本地 API 目录**：
   - 打开配置面板（点击状态栏的 ⚙️ Maximo配置 按钮）
   - 切换到“补全设置”标签
   - 点击“选择目录”按钮
   - 选择你保存的 `reflection-data` 目录
   - 保存配置

3. **使用离线补全**：
   - 插件会自动加载目录中的所有 JSON 文件
   - 支持智能匹配类名（如 MboRemote、MboSetRemote 等）
   - 提供完整的方法签名和参数提示

4. **已支持的类**：
   - `psdi.mbo.MboRemote` - MBO 远程对象
   - `psdi.mbo.MboSetRemote` - MBO 集合远程对象
   - `com.ibm.ism.script.ScriptService` - 脚本服务
   - `psdi.security.UserInfo` - 用户信息
   - `psdi.app.workorder.WORemote` - 工单远程对象
   - `psdi.app.workorder.WOSetRemote` - 工单集合远程对象
   - `java.lang.String` - Java 字符串类
   - `java.lang.Object` - Java 对象基类
   - 等等...（共 15 个类）
   - 提供完整的方法签名、参数类型和异常信息
   - 无需连接 Maximo 服务器即可使用

5. **如何生成 reflection-data**：
   - 如果你有 Maximo 环境，可以自行提取 API 数据
   - 查看详细说明：[Reflection Data 提取指南](./REFLECTION_DATA_EXTRACTION.md)
   - 支持从 Maximo JAR 包中自动提取所有类的方法信息

3. **支持的 API 文件格式**：
   ```json
   {
     "className": "psdi.mbo.MboRemote",
     "methods": [
       {
         "name": "getString",
         "returnType": "java.lang.String",
         "parameters": ["java.lang.String"],
         "description": "String getString(String)",
         "isPublic": true
       }
     ]
   }
   ```

### 支持的补全对象

- `service` - 脚本服务对象
- `mbo` - MBO对象
- `mboSet` - MBO集合对象
- `userInfo` - 用户信息对象

## 开发

### 项目结构

```
maximo-script-vscode-plugin/
├── src/
│   ├── extension.ts          # 插件入口
│   ├── completionProvider.ts # 代码补全提供者
│   └── configPanel.ts        # 配置面板
├── package.json              # 插件配置
├── tsconfig.json             # TypeScript配置
└── webpack.config.js         # Webpack配置
```

### 开发流程

```bash
# 1. 安装依赖
npm install

# 2. 启动开发模式（自动编译）
npm run watch

# 3. 在VSCode中按 F5 启动调试
```

### 构建发布

```bash
# 生产环境编译
npm run compile

# 打包插件
npm run package

# 发布到市场（需要配置publisher）
npm run publish
```

## 技术栈

- **TypeScript** - 主要开发语言
- **VSCode API** - 插件开发框架
- **Webpack** - 模块打包工具
- **Axios** - HTTP请求库

## 常见问题

### Q: 代码补全不工作？

A: 请检查：
1. 是否在设置中启用了代码补全
2. 是否配置了正确的服务器地址
3. 文件类型是否为 `.js` 或 `.py`

### Q: 如何更新补全数据？

A: 修改配置后会自动刷新缓存，或者重启VSCode

### Q: 支持哪些Maximo版本？

A: 目前支持Maximo 7.6和9.1

## 许可证

MIT License

## 相关资源

- **[Reflection Data 提取指南](./REFLECTION_DATA_EXTRACTION.md)** - 如何从 Maximo JAR 包中提取 API 数据
- **[JSDoc 补全功能使用指南](./JSDOC_COMPLETION_GUIDE.md)** - 详细的 JSDoc 类型注释和智能补全使用说明
- **[快速开始](./QUICK_START.md)** - 5分钟快速上手指南
- **[Gitee 仓库 - reflection-data](https://gitee.com/shoukaiseki/maximo-script-editor/tree/master/reflection-data)** - 下载预生成的 API 数据

## 作者

shoukaiseki

## 反馈与建议

如有问题或建议，请提交Issue。
