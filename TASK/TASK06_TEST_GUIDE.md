# TASK06 功能测试指南

## 功能概述

本次更新添加了"通过本地反射获取类反射信息"功能，与原有的"通过maximo接口获取类反射信息"功能并行工作。

## 主要变更

### 1. 右键菜单更新
- **原菜单**: "Maximo Script: 获取类反射信息"
- **新菜单**: 
  - "Maximo Script: 通过maximo接口获取类反射信息"（原有功能）
  - "Maximo Script: 通过本地反射获取类反射信息"（新增功能）

### 2. 技术实现
- 创建了 `LocalReflectHelper.java`，使用 JDK 8 编译
- 实现了 `fetchClassReflectionLocal` 函数
- 两种方式的返回数据格式完全一致

## 测试步骤

### 前置条件

1. **配置 JDK 路径**
   - 打开 VSCode 设置
   - 搜索 `maximoScript.jdkPath`
   - 设置为您的 JDK 8 安装路径，例如：`D:\usr\java\jdk1.8.0_491x64`

2. **配置 JAR 包目录**（可选，如果需要访问 Maximo 特定类）
   - 打开 VSCode 设置
   - 搜索 `maximoScript.jarDirectories`
   - 添加包含 Maximo JAR 包的目录列表

### 测试场景 1：测试标准 Java 类

1. 打开任意 JavaScript 文件
2. 选中一个 Java 类名，例如：`java.lang.String`
3. 右键点击选中的文本
4. 选择 **"Maximo Script: 通过本地反射获取类反射信息"**
5. 等待进度条完成
6. 检查输出：
   - 查看日志通道 "Maximo Script Helper"
   - 确认生成了 `.d.ts` 文件
   - 确认更新了 `global.d.ts`

### 测试场景 2：测试内部类

1. 在 JavaScript 文件中选中：`java.util.Base64$Encoder`
2. 右键选择 **"Maximo Script: 通过本地反射获取类反射信息"**
3. 验证是否正确识别内部类并生成类型定义

### 测试场景 3：对比两种方式

1. 选中同一个类名（如：`java.lang.String`）
2. 先使用 **"通过maximo接口获取类反射信息"**，记录结果
3. 再使用 **"通过本地反射获取类反射信息"**，记录结果
4. 对比两种方式生成的 `.d.ts` 文件内容是否一致

### 测试场景 4：错误处理

1. 选中一个不存在的类名，例如：`com.example.NonExistentClass`
2. 右键选择 **"通过本地反射获取类反射信息"**
3. 验证是否正确显示错误提示

## 预期结果

### 成功情况
- ✅ 显示进度通知："正在通过本地反射获取信息: xxx"
- ✅ 日志中显示执行了 Java 命令
- ✅ 在 `~/.sks/maximo-script-helper/reflection-data/` 目录下生成 JSON 文件
- ✅ 在工作区 `javaapi/` 目录下生成 `.d.ts` 文件
- ✅ 自动更新 `javaapi/global.d.ts`，添加新的 reference
- ✅ 弹出成功提示："✅ 已成功获取并生成 Xxx.d.ts（本地反射）"

### 失败情况
- ❌ 如果未配置 JDK 路径，显示错误："未配置 JDK 路径，请在配置面板中设置"
- ❌ 如果类不存在，显示错误："Class not found: xxx"
- ❌ 如果 Java 执行失败，显示错误："本地反射执行失败: xxx"

## 常见问题

### Q1: 提示 "未配置 JDK 路径"
**解决方案**: 
1. 打开 VSCode 设置 (Ctrl + ,)
2. 搜索 `maximoScript.jdkPath`
3. 设置为 JDK 8 的安装路径

### Q2: 找不到某些 Maximo 特定的类
**解决方案**:
1. 在设置中配置 `maximoScript.jarDirectories`
2. 添加包含 Maximo JAR 包的目录，例如：
   ```json
   [
     "D:/maximo/lib",
     "D:/maximo/applications/maximo/lib"
   ]
   ```

### Q3: 生成的 .d.ts 文件为空或方法很少
**可能原因**:
- 该类没有公共方法
- classpath 配置不正确，无法加载完整的类层次结构

### Q4: 中文乱码问题
**解决方案**:
- LocalReflectHelper.java 已使用 UTF-8 编码编译
- 确保系统默认编码支持中文

## 调试技巧

### 查看日志
1. 按 `Ctrl+Shift+P`
2. 输入 "Maximo Script: 查看日志"
3. 查看详细的执行日志

### 手动测试 Java 类
```bash
cd e:\gitwork\maximo-script-vscode-plugin\dist
java -cp ".;LocalReflectHelper.class" LocalReflectHelper java.lang.String
```

### 检查生成的文件
- JSON 数据: `~/.sks/maximo-script-helper/reflection-data/`
- TypeScript 定义: `<workspace>/javaapi/`
- 全局引用: `<workspace>/javaapi/global.d.ts`

## 注意事项

1. **JDK 版本要求**: 必须使用 JDK 8，因为 Maximo 基于 JDK 8
2. **classpath 顺序**: LocalReflectHelper.class 所在目录必须在 classpath 的最前面
3. **内部类表示**: 使用 `$` 符号表示内部类，如 `java.util.Base64$Encoder`
4. **性能考虑**: 本地反射比 Maximo 接口更快，但需要正确配置 classpath

## 下一步

如果测试通过，可以考虑：
1. 发布新版本到 VSCode 扩展市场
2. 更新 README.md 和 HELP.md 文档
3. 添加更多示例和最佳实践
