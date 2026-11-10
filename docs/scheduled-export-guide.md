# 计划导出任务配置说明

计划导出按任务列表依次执行：先配置"基础导出目录"，再添加任务并逐个设置参数，最后点击"开始执行"。

## 一、通用字段 {#general}

- **导出功能**：选择任务类型，任务行下方会自动展开该功能特有的参数（行详情）。
- **目录**：相对"基础导出目录"，支持变量 `${envName}`、`${timestamp}`、`${datetimeEN}`、`${langcode}`。
- **语言**：导出使用的语言代码（如 `EN`、`ZH`）。
- **压缩**：任务完成后把该任务目录打包为同名 zip。
- **线程数**：并发导出数量，过大可能增加服务器压力。
- **启用**：取消勾选则跳过该任务。

## 二、目录变量 {#path-vars}

| 变量 | 含义 | 示例 |
| --- | --- | --- |
| `${envName}` | 当前环境名称 | `loction` |
| `${timestamp}` | 毫秒时间戳 | `1722300000000` |
| `${datetimeEN}` | 日期时间 `yyyyMMdd_HHmmss` | `20260730_001009` |
| `${langcode}` | 语言代码 | `ZH`、`EN` |

## 三、各功能的行详情参数 {#function-params}

- **导出 MAXOBJECT**：精简模式（忽略默认值字段）。
- **导出消息**：单文件行数（默认 5000）、精简模式。
- **导出域**：精简模式。
- **导出条件表达式 / 导出对象结构**：`where` 条件，默认 `1=1`；对象结构支持精简模式。
- **导出应用XML**：忽略 metadata、导出 zip（只有存在 MAFAPPDATA 应用包时才生成 zip）。
- **导出脚本**：线程数、压缩。

## 四、过滤脚本编写说明 {#filter-script}

### 适用任务

适用任务：应用XML、MAXOBJECT、对象结构、导出脚本。这些任务会先通过接口获取清单，再把清单交给本地脚本处理；脚本返回的新清单即为实际导出范围。

### 填写方式

- 填绝对路径，或相对当前工作区根目录的路径。
- 也可点"选择文件"选择 `.js` / `.cjs` 文件。
- 留空表示不过滤。

### 脚本契约

CommonJS 模块，必须导出函数，入参为清单，返回新数组：

```js
// filter-apps.js
module.exports = function (list, ctx) {
  ctx.log('收到 ' + list.length + ' 条');
  return list.filter(function (item) {
    return true; // 返回 true 表示保留
  });
};
```

- 必须返回数组；返回非数组、脚本抛异常、文件不存在都会让该任务失败并中止（不会静默导出全量）。
- 也支持 `module.exports.default`（ES 默认导出风格）。

### 清单内容

- **应用XML**：字符串数组，如 `['ACTION', 'ITEM']`。
- **导出脚本**：脚本名字符串数组，如 `['SKS.AUTOSCRIPT.DEBUG']`。
- **MAXOBJECT**：对象数组，名称字段为 `objectName` / `OBJECTNAME`。
- **对象结构**：`integrationobjects` 数组，名称字段为 `intObjectName` / `INTOBJECTNAME`。

注意：应用XML 与导出脚本的清单是字符串数组，MAXOBJECT 与对象结构是对象数组，不能直接对对象元素调用 `toLowerCase()`。

### ctx 上下文

| 字段 | 说明 |
| --- | --- |
| `type` | `extractAppXml` / `extractMaxobject` / `extractIntObject` / `extractScript` |
| `language` | 当前任务语言代码 |
| `taskIndex` | 任务在启用列表中的序号 |
| `scriptPath` | 过滤脚本的绝对路径 |
| `log(msg)` | 输出日志到执行日志 |

### 引用其他本地脚本

过滤脚本是普通 CommonJS 模块，可以用 `require` 引入同目录、子目录或上级目录的其他脚本，路径相对**脚本自身所在文件**解析，可省略 `.js` 后缀。

第一步，写一个被复用的工具脚本：

```js
// lib/name-utils.js
function nameOf(item) {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    return item.objectName || item.OBJECTNAME
      || item.intObjectName || item.INTOBJECTNAME || '';
  }
  return String(item);
}

module.exports = { nameOf };
```

第二步，在过滤脚本中引用它（也可以引用 JSON 配置、上级目录脚本）：

```js
// maxobject.filter.js
const { nameOf } = require('./lib/name-utils');
const rules = require('./rules.json');

module.exports = function (list, ctx) {
  ctx.log('收到 ' + list.length + ' 条');
  return list.filter(function (item) {
    var name = nameOf(item).toLowerCase();
    return rules.prefixes.some(function (p) {
      return name.indexOf(p) === 0;
    });
  });
};
```

配套的配置文件：

```json
{
  "prefixes": ["ibm_", "sks_"]
}
```

说明：

- 被引用的脚本必须使用 `module.exports` 导出（`exports.name = ...` 同样可行）。
- 也会从脚本所在目录逐级向上查找 `node_modules`，因此可以引用项目内安装的依赖。
- 修改过滤脚本或被它 `require` 的脚本后无需重启插件，下次执行会重新加载。

### 示例：只保留系统应用

```js
module.exports = function (list, ctx) {
  var kept = list.filter(function (name) {
    return String(name).toLowerCase().indexOf('ibm_') === 0;
  });
  ctx.log('过滤掉 ' + (list.length - kept.length) + ' 个非系统应用');
  return kept;
};
```

### 示例：只导出指定前缀的脚本

```js
module.exports = function (list, ctx) {
  var prefixes = ['sks.', 'ibm_'];
  return list.filter(function (name) {
    var lower = String(name).toLowerCase();
    return prefixes.some(function (p) { return lower.indexOf(p) === 0; });
  });
};
```

### 测试

任务行的"测试"按钮会按当前任务参数（语言、`where` 等）拉取清单并执行脚本，弹窗中显示清单总数、保留数、被过滤数及示例名称，不会写入任何文件，便于先验证脚本再执行导出。

### 常见错误

- `xxx.toLowerCase is not a function`：对对象元素直接调用了字符串方法，请先用字段（`objectName` 等）取名称。
- `过滤脚本未导出函数`：脚本没有 `module.exports = function(list, ctx) {...}`。
- `过滤脚本返回值不是数组`：返回值不是数组，或返回了 `undefined`。
- `过滤脚本不存在`：路径填错，相对路径是按当前工作区根目录解析的。
