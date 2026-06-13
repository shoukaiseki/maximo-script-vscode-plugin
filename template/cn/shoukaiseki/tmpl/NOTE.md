# 未测试
在 Nashorn 引擎中，通过 `invokeFunction` 调用 JavaScript 函数时，**脚本方法外部无法直接获取传入的参数**，除非你在脚本内部显式地将它们存储到某个可访问的地方。

让我解释一下原因和几种解决方案：

## 为什么无法直接获取？

`invokeFunction` 只是将 Java 对象作为参数传递给 JavaScript 函数，这些参数在函数调用结束后就超出了作用域，不会自动保留在全局环境中。

## 解决方案

### 方案1：在脚本中显式保存参数（推荐）

修改你的 JavaScript 脚本，在函数内部将参数保存到全局变量或对象中：

```javascript
// 定义一个全局对象来存储最后调用的参数
var lastInvokeArgs = null;

function yourFunctionName(arg1, arg2, arg3) {
    // 保存参数到全局变量
    lastInvokeArgs = {
        arg1: arg1,
        arg2: arg2,
        arg3: arg3,
        allArgs: Array.prototype.slice.call(arguments)
    };
    
    // 你的业务逻辑
    return "result";
}
```


然后在 Java 中获取：

```java
Object[] args = context.get("invokeArgs");
Object response = ((Invocable)engine).invokeFunction(functionName, args);

// 获取脚本中保存的参数
Object savedArgs = engine.get("lastInvokeArgs");
```


### 方案2：使用 ScriptObjectMirror 传递上下文

```java
// 创建一个 Map 作为共享上下文
Map<String, Object> sharedContext = new HashMap<>();
engine.put("sharedContext", sharedContext);

Object[] args = context.get("invokeArgs");
Object response = ((Invocable)engine).invokeFunction(functionName, args);

// 从共享上下文中获取参数
Object capturedArgs = sharedContext.get("capturedArgs");
```


JavaScript 脚本：

```javascript
function yourFunctionName(arg1, arg2, arg3) {
    // 将参数保存到共享上下文
    sharedContext.capturedArgs = {
        arg1: arg1,
        arg2: arg2,
        arg3: arg3
    };
    
    return "result";
}
```


### 方案3：包装函数自动捕获参数

创建一个通用的包装器：

```javascript
var functionCallHistory = [];

function captureAndExecute(funcName) {
    var args = Array.prototype.slice.call(arguments, 1);
    var func = this[funcName];
    
    if (typeof func === 'function') {
        // 记录调用历史
        functionCallHistory.push({
            functionName: funcName,
            args: args,
            timestamp: new Date().getTime()
        });
        
        // 执行原函数
        return func.apply(this, args);
    }
}
```


## 最佳实践建议

根据你的项目结构（Maximo 相关的 Java 项目），我建议使用**方案2**，因为：

1. **线程安全**：每个引擎实例有独立的上下文
2. **灵活性**：可以传递任意类型的参数
3. **可维护性**：Java 和 JavaScript 之间的数据交换更清晰

你当前的代码位置应该在 [maximosrc](file://E:\gitwork\maximoi\maximosrc) 目录下的某个脚本执行器中。如果需要查看具体实现或帮你修改代码，请告诉我具体的文件路径。