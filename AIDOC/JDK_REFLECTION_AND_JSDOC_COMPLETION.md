# Maximo 脚本 VSCode 插件 - JDK 反射补全与 JSDoc 智能补全实现指南

## 概述

本文档详细说明如何在 VSCode 插件中实现基于 **JDK 反射**和 **JSDoc 类型注释**的智能代码补全功能。该功能允许开发者在编写 Maximo 自动化脚本时，获得准确的、基于实际 Java 类定义的方法提示。

---

## 核心架构

### 1. 补全流程概览

```
用户输入触发点 (.) 
    ↓
解析上下文（获取变量名或表达式）
    ↓
查找变量类型
    ├─ JSDoc 类型注释 (@type)
    ├─ 隐式变量映射 (mbo, service, etc.)
    └─ 返回值类型推断 (链式调用)
    ↓
根据类型获取方法列表
    ├─ 第1层：实时 JDK 反射（通过 java-bridge）
    ├─ 第2层：预加载的 reflection-data JSON 缓存
    └─ 第3层：降级到常用 API 静态列表
    ↓
生成 Monaco/VSCode 补全建议项
```

### 2. 关键技术组件

| 组件 | 作用 | 文件位置 |
|------|------|----------|
| **JSDoc 解析器** | 从代码注释中提取变量类型声明 | `renderer.js:parseJSDocTypes()` |
| **隐式变量映射** | 定义 Maximo 脚本中的默认可用变量 | `renderer.js:implicitVariableTypes` |
| **返回值类型映射** | 支持链式调用的类型推断 | `renderer.js:methodReturnTypeMap` |
| **Java Bridge** | 主进程与 JVM 通信，执行实时反射 | `main.js:get-java-class-methods` |
| **Reflection Data** | 预加载的 JSON 格式类方法缓存 | `reflection-data/*.json` |
| **补全提供者** | 注册 Monaco/VSCode 补全事件 | `renderer.js:registerMaximoCompletions()` |

---

## 详细实现步骤

### 步骤 1：定义隐式变量类型映射

Maximo 脚本环境中有一些默认可用的变量，需要预先定义它们的类型：

```javascript
// renderer.js 或 extension.ts
const implicitVariableTypes = {
  'mbo': 'psdi.mbo.MboRemote',
  'mboset': 'psdi.mbo.MboSetRemote',
  'service': 'com.ibm.ism.script.ScriptService',
  'userInfo': 'psdi.security.UserInfo',
};
```

**说明：**
- 这些变量无需声明即可在脚本中使用
- 当用户输入 `mbo.` 时，应自动提供 `MboRemote` 类的方法补全

---

### 步骤 2：实现 JSDoc 类型注释解析器

支持以下 JSDoc 格式：

#### 格式 1：标准多行注释（下一行声明变量）
```javascript
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;
```

#### 格式 2：单行注释（变量在注释后）
```javascript
/** @type {psdi.mbo.MboSetRemote} */ var locationSet;
```

#### 格式 3：多变量声明
```javascript
/** @type {psdi.app.workorder.WORemote} */ var woMbo, workOrder;
```

#### 格式 4：表达式映射（支持方法调用）
```javascript
/** @type {psdi.mbo.MboRemote} b3.getMbo(0) */
// 当输入 b3.getMbo(0). 时，会提供 MboRemote 的方法补全

/** @type {psdi.mbo.MboRemote} b3.getMbo(\d) */
// 使用正则占位符 \d 匹配任意数字参数
// 当输入 b3.getMbo(1). 或 b3.getMbo(99). 时，都会提供 MboRemote 的方法补全
```

**支持的占位符：**
- `\d` - 匹配一个或多个数字（如 `b3.getMbo(\d)` 可匹配 `b3.getMbo(0)`、`b3.getMbo(123)`）
- `\w` - 匹配一个或多个单词字符（如 `service.getProperty(\w)` 可匹配 `service.getProperty("key")`）
- `.*` - 匹配任意字符串（如 `mbo.getString(.*)` 可匹配任何参数）
- `\s` - 匹配空白字符

**解析逻辑伪代码：**

```javascript
function parseJSDocTypes(model) {
  const typeMap = {};
  const lines = model.getLinesContent();
  
  // 正则匹配 JSDoc @type 注释
  const jsdocPattern = /\/\*\*\s*@type\s*\{([^}]+)\}(.*?)\*\//;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const jsdocMatch = line.match(jsdocPattern);
    
    if (jsdocMatch) {
      const className = jsdocMatch[1].trim(); // 提取类型名称
      const afterType = jsdocMatch[2] ? jsdocMatch[2].trim() : ''; // 提取 @type 后面的内容
      
      // 清理末尾的 */
      const cleanAfter = afterType.replace(/\*\/$/, '').trim();
      
      if (cleanAfter && cleanAfter.length > 0) {
        // 检查是否是表达式格式（包含括号和点号）
        // 例如：b3.getMbo(0)、locationSet.moveFirst()
        const expressionPattern = /^[a-zA-Z_$][\w$]*(?:\s*\.\s*[a-zA-Z_$][\w$]*\s*\([^)]*\))+$/;
        
        if (expressionPattern.test(cleanAfter)) {
          // 表达式格式：直接作为键名存储
          // 支持正则占位符：\d, \w, .*, \s
          typeMap[cleanAfter] = className;
          console.log(`[JSDoc] 注册表达式映射: ${cleanAfter} -> ${className}`);
          continue;
        }
        
        // 否则按原来的逻辑处理（多个变量名）
        const varNames = cleanAfter.split(/[,\s]+/).map(v => v.trim()).filter(v => v.length > 0 && /^[a-zA-Z_$][\w$]*$/.test(v));
        
        varNames.forEach(varName => {
          typeMap[varName] = className;
        });
        continue;
      }
      
      // 情况2：变量在下一行
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const varDeclMatch = nextLine.match(/var\s+([a-zA-Z_$][\w$]*(?:\s*,\s*[a-zA-Z_$][\w$]*)*)/);
        
        if (varDeclMatch) {
          const varNames = varDeclMatch[1].split(',').map(v => v.trim());
          varNames.forEach(varName => {
            typeMap[varName] = className;
          });
        }
      }
    }
  }
  
  return typeMap;
}
```

**关键点：**
- 每次补全触发时重新解析，避免累积旧数据
- 支持 `var`、`let`、`const` 多种声明方式
- 返回 `{ variableName: className }` 映射表
- **支持表达式映射**：可以直接为方法调用结果指定类型，如 `b3.getMbo(0) -> MboRemote`
- **支持正则占位符**：使用 `\d`、`\w`、`.*`、`\s` 等占位符匹配不同参数

---

### 步骤 3：实现返回值类型推断（链式调用支持）

当用户输入 `assetMbo.getMboSet("LOCATIONS").` 时，需要推断出 `getMboSet` 返回 `MboSetRemote` 类型。

**实现逻辑：**

```javascript
// 方法返回值类型映射表
const methodReturnTypeMap = {
  // MboRemote 的方法
  'getMboSet': 'psdi.mbo.MboSetRemote',
  'getOwner': 'psdi.mbo.MboRemote',
  'getThisMboSet': 'psdi.mbo.MboSetRemote',
  
  // MboSetRemote 的方法
  'getMbo': 'psdi.mbo.MboRemote',
  'moveFirst': 'psdi.mbo.MboRemote',
  'moveNext': 'psdi.mbo.MboRemote',
  'getCurrentRow': 'psdi.mbo.MboRemote',
  
  // ScriptService 的方法
  'getMboSet': 'psdi.mbo.MboSetRemote',
  'getMbo': 'psdi.mbo.MboRemote',
};

// 分析变量赋值语句，推断类型
function analyzeVariableTypes(model) {
  const inferredTypes = {};
  const lines = model.getLinesContent();
  
  // 匹配赋值语句：varName = expression.method()
  const assignmentPattern = /([a-zA-Z_$][\w$]*)\s*=\s*([a-zA-Z_$][\w$]*)\.(\w+)\(/;
  
  for (const line of lines) {
    const match = line.match(assignmentPattern);
    if (match) {
      const varName = match[1];
      const sourceVar = match[2];
      const methodName = match[3];
      
      // 如果源变量有类型定义，且方法在返回值映射表中
      if (variableTypeMap[sourceVar] && methodReturnTypeMap[methodName]) {
        inferredTypes[varName] = methodReturnTypeMap[methodName];
      }
    }
  }
  
  return inferredTypes;
}
```

**使用场景：**
```javascript
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// 推断 locationSet 的类型为 MboSetRemote
var locationSet = assetMbo.getMboSet("LOCATIONS");

// 现在输入 locationSet. 会显示 MboSetRemote 的方法
locationSet.moveFirst();
```

---

### 步骤 4：表达式到类型的智能匹配

支持复杂表达式的类型匹配，例如：
- `assetMbo` → 直接查表
- `assetMbo.getMboSet("LOCATIONS")` → 推断返回类型
- `woMbo.getOwner()` → 推断返回类型
- `b3.getMbo(0)` → **JSDoc 表达式映射**（优先）
- `b3.getMbo(99)` → **正则占位符匹配**（如 `b3.getMbo(\d)`）

**匹配算法：**

```javascript
function matchExpressionToType(expression, typeMap) {
  if (!expression || !typeMap) {
    return null;
  }
  
  console.log(`[ExpressionMatch] 🔍 尝试匹配表达式: "${expression}"`);
  
  // 第一步：尝试完全匹配（包括 JSDoc 表达式映射）
  if (typeMap[expression]) {
    console.log(`[ExpressionMatch] ✅ 完全匹配成功: ${expression} -> ${typeMap[expression]}`);
    return typeMap[expression];
  }
  
  // 第二步：尝试正则匹配（处理带占位符的表达式）
  // 支持的占位符：\d (数字), \w (单词字符), .* (任意字符串), \s (空白字符)
  for (const [key, type] of Object.entries(typeMap)) {
    // 检查键名是否包含正则占位符
    if (key.includes('\\d') || key.includes('\\w') || key.includes('.*') || key.includes('\\s')) {
      // 将占位符转换为真正的正则表达式
      let pattern = key
        .replace(/\\d/g, '\\d+')   // \d -> \d+ (一个或多个数字)
        .replace(/\\w/g, '\\w+')   // \w -> \w+ (一个或多个单词字符)
        .replace(/\.\*/g, '.*')     // .* -> .* (任意字符串)
        .replace(/\\s/g, '\\s+');   // \s -> \s+ (一个或多个空白字符)
      
      // 转义其他特殊字符（除了我们已经转换的）
      pattern = pattern.replace(/[.+?^${}()|[\]\\]/g, (match) => {
        // 不转义我们已经处理的特殊序列
        if (match === '\\' && pattern.substring(pattern.indexOf(match), pattern.indexOf(match) + 3).match(/\\[dws]/)) {
          return match;
        }
        return match === '.' ? '\\.' : match;
      });
      
      try {
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(expression)) {
          console.log(`[ExpressionMatch] ✅ 正则匹配成功: ${expression} ~ ${key} -> ${type}`);
          return type;
        }
      } catch (e) {
        console.warn(`[ExpressionMatch] ⚠️ 正则表达式构建失败: ${key}`, e.message);
      }
    }
  }
  
  // 第三步：尝试从表达式末尾提取方法调用，使用返回值类型映射
  const methodCallMatch = expression.match(/\.(\w+)\(/);
  if (methodCallMatch) {
    const methodName = methodCallMatch[1];
    if (methodReturnTypeMap[methodName]) {
      console.log(`[ExpressionMatch] ✅ 返回值类型推断: ${methodName} -> ${methodReturnTypeMap[methodName]}`);
      return methodReturnTypeMap[methodName];
    }
  }
  
  console.log(`[ExpressionMatch] ❌ 未找到匹配的类型`);
  return null;
}
```

**使用示例：**

```javascript
// 示例1：精确表达式映射
/** @type {psdi.mbo.MboRemote} b3.getMbo(0) */
b3.getMbo(0).  // ✅ 提供 MboRemote 的方法补全

// 示例2：正则占位符映射
/** @type {psdi.mbo.MboRemote} b3.getMbo(\d) */
b3.getMbo(1).   // ✅ 匹配 \d，提供 MboRemote 的方法补全
b3.getMbo(99).  // ✅ 匹配 \d，提供 MboRemote 的方法补全

// 示例3：多个占位符
/** @type {psdi.mbo.MboSetRemote} service.getMboSet(\w) */
service.getMboSet("LOCATIONS").  // ✅ 匹配 \w，提供 MboSetRemote 的方法补全

// 示例4：通配符
/** @type {java.lang.String} mbo.getString(.*) */
mbo.getString("assetnum").   // ✅ 匹配 .*，提供 String 的方法补全
mbo.getString("description"). // ✅ 匹配 .*，提供 String 的方法补全
```

---

### 步骤 5：集成 JDK 反射获取方法列表

这是最核心的部分，分为三层降级策略：

#### 第1层：实时 JDK 反射（优先）

通过 Electron IPC 调用主进程的 `get-java-class-methods` 接口，实时从 Maximo JAR 文件中反射获取方法。

**渲染进程代码（renderer.js 或 extension.ts）：**

```javascript
async function getReflectionSuggestions(range, triggerPrefix, typeMap) {
  const className = typeMap[triggerPrefix];
  
  if (!className) {
    console.warn(`[Reflection] 未找到 ${triggerPrefix} 的类型定义`);
    return [];
  }
  
  try {
    // 调用主进程获取方法列表
    const result = await window.electronAPI.getJavaClassMethods(className);
    
    if (result.success && result.methods) {
      console.log(`[Reflection] ✅ 成功获取 ${result.methods.length} 个方法（实时反射）`);
      
      // 将 Java 方法转换为 VSCode/Monaco 补全项
      const suggestions = result.methods.map(method => {
        // 构建完整签名：方法名(参数类型1, 参数类型2)
        const paramsStr = method.parameters.length > 0
          ? `(${method.parameters.join(', ')})`
          : '()';
        
        return {
          label: `${method.name}${paramsStr} → ${method.returnType} [反射]`,
          kind: monaco.languages.CompletionItemKind.Method,
          insertText: `${method.name}(${method.parameters.map((p, i) => `\${${i + 1}:${p}}`).join(', ')})`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          filterText: method.name,  // 过滤时使用不含签名的名称
          documentation: {
            value: [
              `**来源: [反射]**`,
              '',
              `**方法签名:**`,
              `\`\`\`${method.returnType} ${method.name}(${method.parameters.join(', ')})\`\`\``,
              '',
              method.description || '',
              '',
              `**返回类型:** ${method.returnType}`,
              method.parameters.length > 0 ? `**参数:** ${method.parameters.join(', ')}` : '**参数:** 无'
            ].join('\n')
          },
          detail: `${method.returnType} ${method.name}(${method.parameters.join(', ')})`,
          range: range
        };
      });
      
      return suggestions;
    } else {
      console.warn(`[Reflection] ⚠️ 实时反射失败:`, result.error);
    }
  } catch (e) {
    console.warn('[Reflection] ⚠️ 实时反射异常:', e.message);
  }
  
  // 降级到第2层
  return getReflectionFromCache(className, range);
}
```

**主进程代码（main.js）：**

```javascript
ipcMain.handle('get-java-class-methods', async (event, className) => {
  try {
    console.log(`[JavaBridge] 获取类方法: ${className}`);
    
    // 确保 Java 环境已初始化
    if (!javaBridge) {
      await initializeJavaBridge();
    }
    
    // 通过 JNI 调用 Java 反射 API
    const methods = await javaBridge.getClassMethods(className);
    
    return { success: true, methods };
  } catch (e) {
    console.error(`[JavaBridge] 获取类方法失败:`, e.message);
    return { success: false, error: e.message };
  }
});
```

**Java Bridge 实现要点：**
- 使用 `node-java` 或 `javacall` 库建立 Node.js 与 JVM 的连接
- 加载 Maximo JAR 文件（位于 `lib/m9` 目录）
- 使用 `Class.forName()` 加载类
- 使用 `Class.getMethods()` 获取所有公共方法
- 提取方法名、参数类型、返回类型、修饰符等信息

---

#### 第2层：预加载的 reflection-data JSON 缓存

如果实时反射失败，从预加载的 JSON 文件中读取方法列表。

**JSON 文件格式示例（reflection-data/psdi-mbo-MboRemote.json）：**

```json
{
  "className": "psdi.mbo.MboRemote",
  "methods": [
    {
      "name": "getString",
      "returnType": "java.lang.String",
      "parameters": ["java.lang.String"],
      "description": "Get string attribute value",
      "modifiers": "public abstract",
      "isStatic": false,
      "isPublic": true
    },
    {
      "name": "setValue",
      "returnType": "void",
      "parameters": ["java.lang.String", "java.lang.Object"],
      "description": "Set attribute value",
      "modifiers": "public abstract",
      "isStatic": false,
      "isPublic": true
    }
  ]
}
```

**缓存读取代码：**

```javascript
function getReflectionFromCache(className, range) {
  // 从预加载的缓存中查找
  const cacheKey = className.replace(/\./g, '-');
  const cacheFile = `reflection-data/${cacheKey}.json`;
  
  if (reflectionDataCache[cacheKey]) {
    console.log(`[Reflection] ✅ 使用缓存数据: ${className}`);
    
    const methods = reflectionDataCache[cacheKey].methods || [];
    const suggestions = methods.map(method => {
      const paramsStr = method.parameters.length > 0
        ? `(${method.parameters.join(', ')})`
        : '()';
      
      return {
        label: `${method.name}${paramsStr} → ${method.returnType} [缓存]`,
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: `${method.name}(${method.parameters.map((p, i) => `\${${i + 1}:${p}}`).join(', ')})`,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        filterText: method.name,
        documentation: {
          value: [
            `**来源: [缓存]**`,
            '',
            `**方法签名:**`,
            `\`\`\`${method.returnType} ${method.name}(${method.parameters.join(', ')})\`\`\``,
            '',
            method.description || ''
          ].join('\n')
        },
        detail: `${method.returnType} ${method.name}(${method.parameters.join(', ')})`,
        range: range
      };
    });
    
    return suggestions;
  }
  
  // 降级到第3层
  console.warn(`[Reflection] ⚠️ 缓存中未找到 ${className}，使用常用 API`);
  return getCommonAPISuggestions(className, range);
}
```

**预加载逻辑（应用启动时）：**

```javascript
// main.js - 应用启动时预加载
app.whenReady().then(async () => {
  await preloadReflectionData();
});

async function preloadReflectionData() {
  const fs = require('fs').promises;
  const path = require('path');
  
  const reflectionDir = path.join(__dirname, 'reflection-data');
  const files = await fs.readdir(reflectionDir);
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(reflectionDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      const cacheKey = file.replace('.json', '');
      reflectionDataCache[cacheKey] = data;
      
      console.log(`[Preload] 已加载: ${file}`);
    }
  }
  
  console.log(`[Preload] 共加载 ${Object.keys(reflectionDataCache).length} 个类的反射数据`);
}
```

---

#### 第3层：降级到常用 API 静态列表

如果前两层都失败，使用硬编码的常用 API 列表作为兜底。

```javascript
function getCommonAPISuggestions(className, range) {
  const commonMethods = {
    'psdi.mbo.MboRemote': [
      { name: 'getString', returnType: 'String', params: ['String'] },
      { name: 'getInt', returnType: 'int', params: ['String'] },
      { name: 'setValue', returnType: 'void', params: ['String', 'Object'] },
      { name: 'getMboSet', returnType: 'MboSetRemote', params: ['String'] },
      // ... 更多常用方法
    ],
    'psdi.mbo.MboSetRemote': [
      { name: 'moveFirst', returnType: 'MboRemote', params: [] },
      { name: 'moveNext', returnType: 'MboRemote', params: [] },
      { name: 'count', returnType: 'int', params: [] },
      // ... 更多常用方法
    ]
  };
  
  const methods = commonMethods[className] || [];
  
  return methods.map(method => {
    const paramsStr = method.params.length > 0
      ? `(${method.params.join(', ')})`
      : '()';
    
    return {
      label: `${method.name}${paramsStr} → ${method.returnType} [常用API]`,
      kind: monaco.languages.CompletionItemKind.Method,
      insertText: `${method.name}(${method.params.map((p, i) => `\${${i + 1}}`).join(', ')})`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      filterText: method.name,
      documentation: `常用 API - ${method.name}`,
      detail: `${method.returnType} ${method.name}(${method.params.join(', ')})`,
      range: range
    };
  });
}
```

---

### 步骤 6：注册补全提供者

在 VSCode 插件中注册 JavaScript 和 Python 语言的补全提供者。

**extension.ts 示例：**

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // JavaScript 语言选择器
  const jsSelector: vscode.DocumentSelector = {
    language: 'javascript',
    scheme: 'file'
  };
  
  // Python 语言选择器
  const pySelector: vscode.DocumentSelector = {
    language: 'python',
    scheme: 'file'
  };
  
  // 创建补全提供者
  const completionProvider = new MaximoCompletionProvider();
  
  // 注册补全提供者（触发字符：. 和 (）
  const jsCompletion = vscode.languages.registerCompletionItemProvider(
    jsSelector,
    completionProvider,
    '.',
    '('
  );
  
  const pyCompletion = vscode.languages.registerCompletionItemProvider(
    pySelector,
    completionProvider,
    '.',
    '('
  );
  
  context.subscriptions.push(jsCompletion, pyCompletion);
}

class MaximoCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.CompletionItem[] | vscode.CompletionList {
    // 1. 获取触发前缀
    const linePrefix = document.lineAt(position).text.substr(0, position.character);
    const prefixMatch = linePrefix.match(/([\w$]+(?:\.[\w$]+\([^)]*\))*)\.\s*$/);
    const triggerPrefix = prefixMatch ? prefixMatch[1] : null;
    
    if (!triggerPrefix) {
      return [];
    }
    
    // 2. 解析 JSDoc 类型注释
    const jsdocTypes = this.parseJSDocTypes(document);
    
    // 3. 合并类型映射表
    const variableTypeMap = {
      ...implicitVariableTypes,
      ...jsdocTypes
    };
    
    // 4. 匹配表达式到类型
    const matchedType = this.matchExpressionToType(triggerPrefix, variableTypeMap);
    
    if (!matchedType) {
      return [];
    }
    
    // 5. 获取反射建议（三层降级）
    return this.getReflectionSuggestions(matchedType, position);
  }
  
  private parseJSDocTypes(document: vscode.TextDocument): Record<string, string> {
    // 实现 JSDoc 解析逻辑（参考步骤 2）
    const typeMap: Record<string, string> = {};
    const text = document.getText();
    const lines = text.split('\n');
    
    const jsdocPattern = /\/\*\*\s*@type\s*\{([^}]+)\}(.*?)\*\//;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const jsdocMatch = line.match(jsdocPattern);
      
      if (jsdocMatch) {
        const className = jsdocMatch[1].trim();
        const afterType = jsdocMatch[2] ? jsdocMatch[2].trim() : '';
        
        if (afterType) {
          // 变量在同一行
          const varNames = afterType.split(',').map(v => v.trim());
          varNames.forEach(varName => {
            typeMap[varName] = className;
          });
        } else if (i + 1 < lines.length) {
          // 变量在下一行
          const nextLine = lines[i + 1];
          const varDeclMatch = nextLine.match(/var\s+([a-zA-Z_$][\w$]*(?:\s*,\s*[a-zA-Z_$][\w$]*)*)/);
          
          if (varDeclMatch) {
            const varNames = varDeclMatch[1].split(',').map(v => v.trim());
            varNames.forEach(varName => {
              typeMap[varName] = className;
            });
          }
        }
      }
    }
    
    return typeMap;
  }
  
  private async getReflectionSuggestions(
    className: string,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    // 第1层：尝试实时反射
    try {
      const result = await vscode.commands.executeCommand('maximoScript.getClassMethods', className);
      
      if (result.success && result.methods) {
        return result.methods.map((method: any) => {
          const item = new vscode.CompletionItem(
            `${method.name}(...)`,
            vscode.CompletionItemKind.Method
          );
          
          item.detail = `${method.returnType} ${method.name}(${method.parameters.join(', ')})`;
          item.documentation = new vscode.MarkdownString(
            `**来源: [反射]**\n\n` +
            `\`\`\`java\n${method.returnType} ${method.name}(${method.parameters.join(', ')})\n\`\`\``
          );
          
          // 插入文本（使用 snippet）
          const params = method.parameters.map((p: string, i: number) => `\${${i + 1}:${p}}`).join(', ');
          item.insertText = new vscode.SnippetString(`${method.name}(${params})`);
          
          return item;
        });
      }
    } catch (e) {
      console.warn('[Reflection] 实时反射失败:', e);
    }
    
    // 第2层：使用缓存
    // 第3层：使用常用 API
    
    return [];
  }
}
```

---

## 配置界面设计

### 左侧功能选项菜单栏

```
┌──────────────────────┐
│ 📦 Maximo 脚本助手   │
├──────────────────────┤
│ ⚙️  服务器配置       │
│ 🔄 补全设置          │
│ 📚 反射数据管理      │
│ 🔧 Java 环境配置     │
│ 📊 日志查看          │
└──────────────────────┘
```

### 右侧配置内容

#### 1. 服务器配置
- Maximo 服务器地址
- 用户名/密码或 API Key
- Maximo 版本（7.6 / 9.1）
- 测试连接按钮

#### 2. 补全设置
- 补全模式选择：
  - 全部方法（反射）
  - 常用 API
  - 混合模式
- 触发字符配置（默认：`.`、`(`）
- 启用/禁用 JSDoc 解析
- 启用/禁用返回值类型推断

#### 3. 反射数据管理
- 预加载的类列表
- 手动刷新缓存按钮
- 导出/导入反射数据

#### 4. Java 环境配置
- JVM 路径
- Maximo JAR 目录
- 额外 JAR 文件
- 测试 Java 连接按钮

---

## 性能优化建议

### 1. 缓存策略
- **内存缓存**：已加载的类方法缓存在内存中，避免重复反射
- **磁盘缓存**：预加载的 reflection-data JSON 文件
- **TTL 过期**：设置缓存过期时间，定期刷新

### 2. 懒加载
- 只在用户首次触发某类的补全时才进行反射
- 后台线程预加载常用类（MboRemote、MboSetRemote 等）

### 3. 防抖处理
- 补全请求添加防抖（debounce），避免频繁触发
- 延迟 300ms 后再发送反射请求

### 4. 并发控制
- 限制同时进行的反射请求数量（最多 3 个）
- 队列管理 pending 请求

---

## 调试技巧

### 1. 控制台日志
```javascript
console.log('[JSDoc] 解析到的类型映射:', typeMap);
console.log('[Reflection] 触发前缀:', triggerPrefix);
console.log('[Reflection] 匹配到的类型:', matchedType);
console.log('[Reflection] 获取到的方法数:', methods.length);
```

### 2. 断点调试
- 在 `parseJSDocTypes` 函数入口打断点
- 检查 `variableTypeMap` 的内容
- 验证 `matchExpressionToType` 的返回值

### 3. 测试用例
```javascript
// 测试 JSDoc 解析
/** @type {psdi.mbo.MboRemote} */
var testMbo = mbo;

// 应该提供 MboRemote 的方法
testMbo.

// 测试链式调用
var locationSet = testMbo.getMboSet("LOCATIONS");

// 应该提供 MboSetRemote 的方法
locationSet.
```

---

## 常见问题与解决方案

### Q1: JSDoc 注释不生效？
**原因：**
- 注释格式不正确
- 变量声明不在注释的下一行
- 解析正则表达式有误

**解决：**
- 确保使用 `/** @type {xxx} */` 格式
- 检查 `parseJSDocTypes` 函数的日志输出
- 使用在线正则测试工具验证正则表达式

### Q2: 实时反射失败？
**原因：**
- Java 环境未正确配置
- Maximo JAR 文件缺失
- JVM 启动失败

**解决：**
- 检查 Java 配置界面中的 JVM 路径
- 确认 `lib/m9` 目录下有必要的 JAR 文件
- 查看主进程日志中的错误信息

### Q3: 补全建议太多，难以筛选？
**解决：**
- 启用 `filterText` 字段，确保过滤时使用简洁的方法名
- 在 label 中添加来源标识（[反射]、[缓存]、[常用API]）
- 提供补全模式切换功能

---

## 总结

实现基于 JDK 反射和 JSDoc 的智能补全需要以下关键步骤：

1. **定义隐式变量映射** - 让编辑器知道 Maximo 脚本中的默认变量
2. **解析 JSDoc 注释** - 从代码注释中提取变量类型声明
3. **推断返回值类型** - 支持链式调用的类型推导
4. **三层降级策略** - 实时反射 → JSON 缓存 → 常用 API
5. **注册补全提供者** - 在 VSCode 中注册 JavaScript/Python 补全
6. **性能优化** - 缓存、懒加载、防抖、并发控制

通过以上步骤，可以为 Maximo 脚本开发者提供准确、智能的代码补全体验，大幅提升开发效率。
