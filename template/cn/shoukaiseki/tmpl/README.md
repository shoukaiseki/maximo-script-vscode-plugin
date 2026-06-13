# Maximo 自动化脚本模板

Maximo Nashorn JavaScript 自动化脚本模板集，用于快速创建各类启动点脚本。

## 模板一览

| 模板文件 | 启动点类型 | 命名规则 | 说明 |
|---|---|---|---|
| `SKS_TMPL_APPBEAN.js` | APPBEAN | `APPBEAN.应用名` | 应用Bean脚本，直接调用方法 |
| `SKS_TMPL_DATABEAN.js` | DATABEAN | `DATABEAN.应用名.beanid` | 数据Bean脚本，直接调用方法 |
| `SKS_TMPL_OBJECT.INIT.js` | OBJECT | `对象名.INIT` | 对象初始化脚本 |
| `SKS_TMPL_OPTION.js` | OBJECT | 自定义 | 操作选项脚本（运行操作） |
| `SKS_TMPL_FLD_VALIDATE.js` | ATTRIBUTE | `对象名.字段名.VALIDATE` | 字段验证脚本 |
| `SKS_TMPL_LOOKUP.js` | ATTRIBUTE | `对象名.字段名.LIST` | 检索列表脚本 |
| `SKS_TMPL_WF_ACTION.js` | ACTION | 自定义 | 工作流操作脚本 |

---

## 详细说明

### 1. SKS_TMPL_APPBEAN.js — 应用Bean脚本

**启动点类型**: 无启动点（interface=1）

**命名规则**: `APPBEAN.应用名`（如 `APPBEAN.IBM_ADDITEMAPPLY`）

**特点**:
- 直接通过方法名调用，**无任何隐式变量**（mbo、service 等不可用）
- 所有函数第一个参数为 `dbctx`（DataBeanContext）
- 需通过 `dbctx` 获取 mbo、clientsession 等对象
- 日志记录器需通过 `initLogger(dbctx)` 延迟初始化（因为脚本加载时无 dbctx）

**AUTOSCRIPT 配置要点**:
- `interface`: 1（必须）
- `launchPoints`: []（空数组，无需启动点）

**可用函数示例**:
- `initializeApp(dbctx)` — 应用初始化
- `MKITEM(dbctx)` — 自定义业务操作
- `setFocus(dbctx)` — 设置焦点
- `selectrecord(dbctx)` — 选择记录

---

### 2. SKS_TMPL_DATABEAN.js — 数据Bean脚本

**启动点类型**: 无启动点（interface=1）

**命名规则**: `DATABEAN.应用名.beanid`（如 `DATABEAN.IBM_ADDITEMAPPLY.RESULTS_SHOWLIST`）

**特点**:
- 与 APPBEAN 类似，直接通过方法名调用，**无隐式变量**
- 所有函数第一个参数为 `dbctx`（DataBeanContext）
- 需要额外配置 variables（beanapp、beanid）来绑定到具体的 DataBean

**AUTOSCRIPT 配置要点**:
- `interface`: 1（必须）
- `launchPoints`: []（空数组）
- `variables`: 需配置 `beanapp`（应用名）和 `beanid`（Bean的ID）

**可用函数示例**:
- `initialize(dbctx)` — Bean 初始化
- `test(dbctx)` — 测试方法
- `addrow(dbctx)` — 添加行

---

### 3. SKS_TMPL_OBJECT.INIT.js — 对象初始化脚本

**启动点类型**: OBJECT

**命名规则**: `对象名.INIT`（如 `ITEM.INIT`）

**特点**:
- 对象打开时触发，可用于控制字段只读、设置默认值等
- **有隐式变量**: `mbo`、`service`、`clientsession`、`webclientsession` 等
- 可使用 `mbo.setFieldFlag()` 控制字段属性
- 可使用 `mbo.getMboSet()` 操作关联子表

**AUTOSCRIPT 配置要点**:
- `interface`: 0
- `launchPoints`:
  - `launchpointtype`: "OBJECT"
  - `eventtype`: "初始化值"（对应 objectevent=1, MboInit）
  - `objectname`: 目标对象名

**启动点事件映射（OBJECT 类型）**:

| eventtype | 中文 | objectevent 位标志 | 说明 |
|---|---|---|---|
| 0 | 初始化值 | &1=1 (MboInit) | 对象初始化时触发 |
| 1 | 验证应用程序 | &1024=1024 (MboAppValidate) | 应用验证时触发 |
| 2 | 允许创建对象 | &2048=2048 (MboCanAdd) | 判断是否允许新增 |
| 3 | 允许删除对象 | &4096=4096 (MboCanDelete) | 判断是否允许删除 |
| 4 | 保存 | 位2/4/8组合 | 保存操作（配合 evcontext） |

**保存上下文（evcontext，eventtype=4 时有效）**:

| evcontext | 中文 | 位标志 |
|---|---|---|
| 0 | 保存前 | 位2(Add)/4(Update)/8(Delete) |
| 1 | 保存后 | 位16(AddPostSave)/32(UpdatePostSave)/64(DeletePostSave) |
| 2 | 落实后 | 位128(AddPostCommit)/256(UpdatePostCommit)/512(DeletePostCommit) |

---

### 4. SKS_TMPL_OPTION.js — 操作选项脚本

**启动点类型**: OBJECT

**命名规则**: 自定义（如 `IBM_ADDITEMAPPLY_TOCLOSE`）

**特点**:
- 绑定到应用程序的工具栏按钮/菜单选项
- **有隐式变量**: `mbo`、`service`、`clientsession` 等
- 通过 `clientsession.showMessageBox()` 弹窗提示
- 通过 `mbo` 操作当前记录

**AUTOSCRIPT 配置要点**:
- `interface`: 0
- `launchPoints`:
  - `launchpointtype`: "OBJECT"
  - `eventtype`: "保存"（对应 objectevent 的 Add/Update/Delete 位）
  - `objectname`: 目标对象名

---

### 5. SKS_TMPL_FLD_VALIDATE.js — 字段验证脚本

**启动点类型**: ATTRIBUTE

**命名规则**: `对象名.字段名.VALIDATE`（如 `IBM_ITEM_APPLYLINE.ORDERUNIT.VALIDATE`）

**特点**:
- 字段值变更时触发验证
- **隐式变量丰富**:
  - `mbo` — 当前 MboRemote 对象
  - `mbovalue` — 当前 MboValue 对象
  - `app` — 应用名（string）
  - `mboattr` — MBO属性名（string）
  - `scriptName` — 脚本名（string）
  - `launchPoint` — 启动点名称（string）
  - `mboname` — MBO对象名（string）
  - **与字段名同名的变量** — 当前字段值（通过 `ScriptUtil.getValueFromMaxType` 获取，已转为小写变量名）
- 可抛出 `MXApplicationException` 阻止无效输入

**AUTOSCRIPT 配置要点**:
- `interface`: 0
- `launchPoints`:
  - `launchpointtype`: "ATTRIBUTE"
  - `attributeevent`: "2"（验证，对应 objectevent=0）
  - `attributename`: 目标字段名
  - `objectname`: 目标对象名

**启动点事件映射（ATTRIBUTE 类型）**:

| attributeevent | 中文 | objectevent | 类名 |
|---|---|---|---|
| 2 | 验证 | == 0 | MVAValidate |
| 4 | 运行操作 | &1 == 1 | MVAAction |
| 1 | 初始化值 | &2 == 2 | MVAInit |
| 0 | 初始化访问限制 | &8 == 8 | MVAInitAR |
| 3 | 检索列表 | &64 == 64 | MTDList |

---

### 6. SKS_TMPL_LOOKUP.js — 检索列表脚本

**启动点类型**: ATTRIBUTE

**命名规则**: `对象名.字段名.LIST`（如 `IBM_ITEM_APPLYLINE.IBM_STOREROOM.LIST`）

**特点**:
- 字段查找列表（Lookup）弹出时触发，用于动态过滤查找数据
- **隐式变量**:
  - `listWhere` — 查询条件（string）
  - `listOrder` — 排序条件（string）
  - `srcKeys` — 源字段列表（java.util.List）
  - `targetKeys` — 目标字段列表（java.util.List）
  - `relationObject` — 关联对象名（string）
  - `relationWhere` — 关联条件（string）
- 通过设置 `listWhere`、`listOrder` 等变量控制查找列表的显示内容

**AUTOSCRIPT 配置要点**:
- `interface`: 0
- `launchPoints`:
  - `launchpointtype`: "ATTRIBUTE"
  - `attributeevent`: "3"（检索列表，对应 objectevent=64）
  - `attributename`: 目标字段名
  - `objectname`: 目标对象名

---

### 7. SKS_TMPL_WF_ACTION.js — 工作流操作脚本

**启动点类型**: ACTION

**命名规则**: 自定义（建议 `IBM_WF_` 前缀，如 `IBM_WF_ITEMAPPLYADD_START`）

**特点**:
- 绑定到工作流操作（通过 ACTION 表）
- **隐式变量**:
  - `mbo` — 当前 MboRemote 对象
  - `service` — ScriptService 对象
  - `scriptHome` — 脚本主目录（MboRemote）
  - `scriptName` — 脚本名（来自 ACTION.PARAMETER 第1个参数）
  - `launchPoint` — 启动点名称（来自 ACTION.PARAMETER 第2个参数）
  - `action` — 操作名（来自 ACTION.PARAMETER 第3个参数）
  - `params[0]` — 操作的参数/属性值
  - `params[1]` — WFInstance（工作流实例）
  - `params[2]` — WFAction（工作流操作）
- 使用 `throw new MXApplicationException("workflow", "消息键")` 向用户提示错误（errgroup 必须为 workflow）

**ACTION 表配置**:
- `action`: 操作名
- `class`: `com.ibm.tivoli.maximo.script.ScriptAction`
- `PARAMETER`: `脚本名.启动点名.操作名`（逗号分隔，工作流中第3个参数可自定义）

**AUTOSCRIPT 配置要点**:
- `interface`: 0
- `launchPoints`:
  - `launchpointtype`: "ACTION"
  - `launchpointname`: 与 ACTION.PARAMETER 中第2个参数匹配
  - `objectname`: 目标对象名

---

## 通用说明

### 日志工具
所有模板均使用 `SKS_LOG_ANSI_UTILS` 脚本创建 ANSI 彩色日志记录器：
```javascript
var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
var logger = sksLogAnsiUtils.newAnsiLogger({ logger: loggerMX, ansiOpen: true });
```

### interface 字段
- `interface: 0` — 标准启动点脚本（OBJECT/ATTRIBUTE/ACTION），有隐式变量
- `interface: 1` — 直接调用脚本（APPBEAN/DATABEAN），无隐式变量，通过方法名调用

### 注意事项
- APPBEAN/DATABEAN 脚本中 `logger` 需延迟初始化（在函数内调用 `initLogger(dbctx)`）
- 工作流中弹窗必须使用 `throw new MXApplicationException("workflow", "消息键")`，不能用 `clientsession.showMessageBox()`
- ATTRIBUTE 类型脚本的字段名变量由 Maximo 自动转为小写