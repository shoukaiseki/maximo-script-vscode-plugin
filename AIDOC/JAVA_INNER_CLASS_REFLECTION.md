# Java 内部类反射获取指南

## 📌 问题描述

如何获取 `java.util.Base64` 中的内部类 `Decoder` 和 `Encoder` 的反射信息？

## ✅ 解决方案

### 方法一：直接使用 `$` 符号（推荐）

在调用反射接口时，使用 `$` 符号连接外部类和内部类：

```javascript
// 获取 Decoder 类
className: "java.util.Base64$Decoder"

// 获取 Encoder 类
className: "java.util.Base64$Encoder"
```

**示例请求**：
```json
{
  "className": "java.util.Base64$Decoder"
}
```

### 方法二：使用点号（自动转换）

增强版脚本 `SKS_REFLECT_HELPER_ENHANCED.js` 已支持自动转换：

```javascript
// 输入
className: "java.util.Base64.Decoder"

// 脚本会自动尝试转换为
className: "java.util.Base64$Decoder"
```

**工作原理**：
1. 首先尝试使用原始类名加载
2. 如果失败且类名包含 `.` 但不包含 `$`
3. 自动将最后一个 `.` 替换为 `$`
4. 重新尝试加载

## 🎯 常见内部类示例

| 外部类 | 内部类 | 反射类名 |
|--------|--------|----------|
| `java.util.Base64` | `Decoder` | `java.util.Base64$Decoder` |
| `java.util.Base64` | `Encoder` | `java.util.Base64$Encoder` |
| `java.util.Map` | `Entry` | `java.util.Map$Entry` |
| `java.lang.Thread` | `State` | `java.lang.Thread$State` |

## 📝 TypeScript 声明文件示例

生成的 `.d.ts` 文件会将内部类转换为合法的 TypeScript 命名空间：

**Java 反射返回**：
```javascript
className: "java.util.Base64$Decoder"
```

**生成的 TypeScript**：
```typescript
declare namespace java.util.Base64 {
    /**
     * Decoder class
     */
    class Decoder {
        /**
         * decode method
         * @param param1 string
         * @returns number[] (byte array)
         */
        decode(param1: string): number[];
    }
}
```

**使用方式**：
```typescript
// 在 Maximo 脚本中使用
const decoder = java.util.Base64.getDecoder();
const bytes = decoder.decode("SGVsbG8=");
```

## 🔧 代码实现

### SKS_REFLECT_HELPER_ENHANCED.js 关键代码

```javascript
function getCompleteReflectInfo(className) {
    var clazz = null;
    
    try {
        // 首先尝试直接加载
        clazz = Class.forName(className);
        
    } catch (classError) {
        // 如果失败，尝试作为内部类加载
        if (className.indexOf('.') !== -1 && className.indexOf('$') === -1) {
            var lastDotIndex = className.lastIndexOf('.');
            var possibleInnerClass = className.substring(0, lastDotIndex) + '$' + 
                                     className.substring(lastDotIndex + 1);
            
            logger.info("尝试作为内部类加载: " + possibleInnerClass);
            clazz = Class.forName(possibleInnerClass);
            className = possibleInnerClass;  // 更新类名
        } else {
            throw new MXApplicationException("error", "无法加载类: " + className);
        }
    }
    
    // ... 继续获取方法信息
}
```

## ⚠️ 注意事项

1. **多层内部类**：使用多个 `$` 符号
   - `Outer$Middle$Inner`

2. **匿名内部类**：使用数字后缀
   - `com.example.Class$1`

3. **本地内部类**：也使用 `$` 加数字
   - `com.example.Class$1LocalClass`

4. **性能考虑**：自动转换会增加一次异常捕获，建议直接使用 `$` 符号

## 🚀 最佳实践

**推荐做法**：
```javascript
// ✅ 直接使用 $ 符号
fetchClassReflection("java.util.Base64$Decoder")
```

**不推荐**：
```javascript
// ❌ 依赖自动转换（会有性能损耗）
fetchClassReflection("java.util.Base64.Decoder")
```

## 📚 相关资源

- [Java Reflection API](https://docs.oracle.com/javase/8/docs/api/java/lang/reflect/package-summary.html)
- [Class.forName() 文档](https://docs.oracle.com/javase/8/docs/api/java/lang/Class.html#forName-java.lang.String-)
- [内部类命名规范](https://docs.oracle.com/javase/specs/jls/se8/html/jls-13.html#jls-13.1)
