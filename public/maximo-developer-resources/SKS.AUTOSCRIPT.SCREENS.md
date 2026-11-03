# SKS.AUTOSCRIPT.SCREENS 调用说明

> 面向 VSCode 插件与 AI 的接口契约文档。只要按本文调用，无需读源码即可对接。
> 脚本：`sharptree/autoscript/SKS.AUTOSCRIPT.SCREENS.js`（Maximo 自动化脚本）

## 1. 基本信息

| 项 | 说明 |
| --- | --- |
| 调用地址 | `{MAXIMO_BASE}/api/script/SKS.AUTOSCRIPT.SCREENS` |
| 备用地址 | `{MAXIMO_BASE}/oslc/script/SKS.AUTOSCRIPT.SCREENS`（路径判断规则相同） |
| 请求方式 | `GET` / `POST`，由 `_action` 参数与请求体决定具体功能 |
| 认证 | 与 Maximo 其他 REST 一致：`X-API-Key`（或用 Cookie/Session） |
| 权限 | 当前用户的 `SKS_UTILS` 应用需有 `DEPLOYSCRIPT` 选项，或属于 Maximo 管理员组，否则返回 `no_permission` |
| 请求体 | `_action=importAppInfo` 时必须是 JSON；老方式导入应用 XML 时必须是 XML 文本 |
| 返回体 | JSON 字符串（`responseBody` 直接赋值）；`_action=exportAppZip` 默认返回二进制流 |

脚本内 URL 解析规则（`getRequestScreentName`）：

```
/api/script/SKS.AUTOSCRIPT.SCREENS/<子路径>   -> 子路径 = 应用名
```

## 2. 通用 URL 参数

| 参数 | 值 | 作用 |
| --- | --- | --- |
| `_action` | `exportAppInfo` / `importAppInfo` / `exportAppZip` | 应用信息导入导出（优先于 GET/POST 分支判断） |
| `app` | 应用名（如 `ACTION`） | 导入导出/zip 必填，脚本内部统一转大写 |
| `_langcode` | `ZH`、`EN`… | 设置 `userInfo` 语言，用于返回多语言文案/XML 译文 |
| `ignoreMetadata` | `true` | 导出 XML 时不追加 `metadata`（控制组/权限组）节点，返回原始 XML |
| `_allLangcode` | `true` | 导出时收集**所有启用语言**的字段值，写入行内 `sks:langdata` |
| `_include` | `presentation` / `zip`（逗号分隔） | 导出时是否带大字段：`presentation` 带 XML 文本，`zip` 带 `zipBase64`（仅适合小包） |
| `_format` | `base64` | `exportAppZip` 时改为返回 JSON（`fileName/size/zipBase64`），否则返回二进制流 |
| `_errorAssert` | `true` | 导入时单行失败立即抛出异常并中止；默认 `false`：错误累加，继续处理下一条 |
| `dmDeploySet` | `true` | 迁移模式：各 `SKS_MIGRATE_*` 拿到 MboSet 后调用 `setDMDeploySet(true)` |
| `_apiType` | 自定义字符串 | 透传到 `config._apiType`，仅作标记 |
| `_clenthost` / `_aliasname` | 自定义字符串 | 透传脚本内变量，仅老方式 XML 导入使用 |

## 3. 功能一览

| 场景 | 方法与 URL | 关键参数 | 返回 |
| --- | --- | --- | --- |
| 列出所有应用 XML 名 | `GET /api/script/SKS.AUTOSCRIPT.SCREENS` | 无（可加 `_langcode`） | `{ status, screenNames:[...], screenNamesCount }` |
| 导出单个应用 XML | `GET /api/script/SKS.AUTOSCRIPT.SCREENS/{APP}` | `_langcode`、`ignoreMetadata=true` | `{ status, presentation: "<xml>" }` |
| 导入应用 XML（老方式） | `POST /api/script/SKS.AUTOSCRIPT.SCREENS` | body=XML | `{ status: "success" }` |
| 导出应用信息（新方式） | `GET ...?_action=exportAppInfo&app={APP}` | `_include`、`_allLangcode`、`_langcode` | `{ app, _langcode, _allLangcode, _include, status, maxapps, presentation, mafappdata, sigoptions, maxlabels, menus, appdoctype }` |
| 导入应用信息（新方式） | `POST ...?_action=importAppInfo` | body=导出 JSON；`dmDeploySet`、`_errorAssert` | `{ app, _apiAction:"imp", status, data:{...}, "sks:successSumTotal", "sks:failSumTotal" }` |
| 下载 MAF 应用包 | `GET ...?_action=exportAppZip&app={APP}` | `_format=base64` 可选 | 二进制（`application/octet-stream`）或 `{ fileName, size, zipBase64 }` |

说明：

- 列表接口会排除一批已知导入会报错的应用（`ACTUALCI`、`CHANGE`、`INCIDENT`、`PROBLEM`、`RELEASE` 等），插件不要假设它等于 `MAXAPPS` 全量。
- `GET /{APP}` 返回的 XML 会按 `_langcode` 合并 `MAXLABELS` 译文（`formatXMLByLangCode`）；默认再追加 `metadata`（`ctrlgroup`/`sigoption`/`condition`），加 `ignoreMetadata=true` 则原样返回。
- `POST` 老方式会解析 XML 中的 `metadata`，重建控制组/条件/签名选项，再用 `PresentationLoader` 或直接写 `MAXPRESENTATION.PRESENTATION`。

## 4. exportAppInfo 返回结构

`MIGRATE_OBJECTS` 固定 7 个 key，顺序与返回一致：

| key | 对象 | 返回形态 | 说明 |
| --- | --- | --- | --- |
| `maxapps` | MAXAPPS | 对象或 `null` | 主对象，保留 `APP` |
| `presentation` | MAXPRESENTATION | 对象或 `null` | 默认只有 `MAXPRESENTATIONID`、`sks:XML_SIZE`；`_include=presentation` 时含 `PRESENTATION` 文本 |
| `mafappdata` | MAFAPPDATA | 对象或 `null` | 默认只有元信息 + `sks:ZIP_SIZE`；`_include=zip` 时含 `zipBase64` |
| `sigoptions` | SIGOPTION | 数组 | 含子数组 `flags`（SIGOPTFLAG），已删除 `APP` |
| `maxlabels` | MAXLABELS | 数组 | 已删除 `APP` |
| `menus` | MAXMENU | 数组 | 已删除 `MODULEAPP` |
| `appdoctype` | APPDOCTYPE | 数组 | 已删除 `APP` |

约定：

- 子表删除应用字段，导入时统一由 `body.app` 注入 —— 因此导出 JSON 可以改 `app` 后直接复制到另一个应用。
- 每个导出行都带随机 `sks:uuid`（由 SCREENS 统一生成），导入结果会原样带回同值，用于对上导出行。
- `_allLangcode=true` 时，启用多语言的字段还会多一个 `sks:langdata`：

```json
{ "VALUE": "保存", "sks:langdata": { "VALUE": { "EN": "Save", "ZH": "保存" } } }
```

- 虚拟字段统一 `sks:` 前缀（如 `sks:XML_SIZE`、`sks:ZIP_SIZE`、`sks:uuid`、`sks:langdata`），导入时全部忽略，不是真实列。

## 5. importAppInfo 请求体

```json
{
  "app": "ITEM_ITEM",
  "maxapps": { "APP": "ITEM_ITEM", "DESCRIPTION": "..." },
  "presentation": { "PRESENTATION": "<xml>", "_status": "success" },
  "mafappdata": null,
  "sigoptions": [ { "OPTIONNAME": "SAVE", "flags": [ ... ] } ],
  "maxlabels": [ ... ],
  "menus": [ ... ],
  "appdoctype": [ ... ]
}
```

- `app` 必填，是**目标应用**；`maxapps.APP` 与子表的 `APP`/`MODULEAPP`/`APPID` 会被强制覆盖为它。
- 可只传部分 key（只传 `maxlabels` 就只导入标签）。
- 行内可加 `"_delete": true` 表示删除该行（各 `changeMbo` 自行支持）。
- `presentation.PRESENTATION` 有值才写 XML；无值且 `MAXPRESENTATION` 无记录时写入默认空模板（`id` 为小写应用名）：
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <systemlib  id="<app 小写>" version="7.1.0.0" xsi:nonamespaceschemalocation="../../../applications/maximo/properties/systemlib.xsd">
  </systemlib>
  ```
  已有记录但导入内容无 XML 时不覆盖原 XML。`mafappdata` 的 zip 字节码字段为 `zipBase64`。

## 6. importAppInfo 返回结构（重点）

```json
{
  "app": "ACTION",
  "_apiAction": "imp",
  "status": "success",
  "data": {
    "maxapps": [ { "_status": "success", "_operation": "updated", "_apiAction": "imp",
                   "sks:objectName": "MAXAPPS", "sks:uuid": "c0c8...",
                   "sks:uniqueID": "110", "sks:uniqueIDName": "MAXAPPSID",
                   "sks:ref": "ACTION",
                   "sks:successTotal": 1, "sks:failTotal": 0,
                   "sks:successSumTotal": 1, "sks:failSumTotal": 0 } ],
    "sigoptions": [ { "...同上...", "flags": [ ... ] } ],
    "maxlabels": [ ... ],
    "menus": [ ... ],
    "appdoctype": [ ... ]
  },
  "sks:successSumTotal": 60,
  "sks:failSumTotal": 0
}
```

每行字段：

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `_status` | string | `success` / `failed` / `skipped` |
| `_operation` | string | `added` / `updated` / `deleted` |
| `_message` | string | 失败原因（失败时） |
| `_apiAction` | string | `imp` / `add` / `export` |
| `sks:ref` | string | 业务主键值（原 `_id`，如 `ACTION/NEXT`） |
| `sks:uniqueID` | string | `mbo.getUniqueIDValue()`（DB 主键，纯 JDBC 写入的大字段对象为空串） |
| `sks:uniqueIDName` | string | `mbo.getUniqueIDName()`（如 `SIGOPTIONID`） |
| `sks:objectName` | string | Maximo 对象名（如 `SIGOPTION`） |
| `sks:uuid` | string | 导出时写入的 uuid；缺失时新生成 |
| `sks:successTotal` / `sks:failTotal` | number | **本层级**（不含嵌套子数组）成功/失败数 |
| `sks:successSumTotal` / `sks:failSumTotal` | number | **递归**含子数组（如 `flags`）的成功/失败数 |
| `sks:currentCacheUseError` | object | 仅失败时出现：`{ ind1, ind2, ind3, ind4 }`，含义见下 |
| `flags` | array | 仅 SIGOPTION 有，子记录同样带上述 `sks:` 字段 |

`currentCacheUseError` 约定（与 `SKS.AUTOSCRIPT.LIBRARY.js` 一致）：

- `ind1`：出错对象名，如 ` objectName=MAXLABELS`
- `ind2`：出错字段名，如 ` attrName=VALUE`
- `ind3`：错误信息
- `ind4`：备用

前端展示建议：按对象分组（`data` 的 key）→ 行 → 子数组（`flags`）；根级汇总直接用 `sks:successSumTotal` / `sks:failSumTotal`。

## 7. 调用示例

### 7.1 curl

```bash
# 导出应用信息（不含大字段）
curl -s -H "X-API-Key: <key>" \
  "http://<host>:<port>/maximo/api/script/SKS.AUTOSCRIPT.SCREENS?_action=exportAppInfo&app=ACTION&_langcode=ZH"

# 导出（带 XML 文本 + 所有语言）
curl -s -H "X-API-Key: <key>" \
  "http://<host>:<port>/maximo/api/script/SKS.AUTOSCRIPT.SCREENS?_action=exportAppInfo&app=ACTION&_include=presentation&_allLangcode=true"

# 导入（请求体为导出的 JSON，注意 UTF-8 无 BOM）
curl -s -X POST -H "Content-Type: application/json" -H "X-API-Key: <key>" \
  --data-binary @ACTION.json \
  "http://<host>:<port>/maximo/api/script/SKS.AUTOSCRIPT.SCREENS?_action=importAppInfo&dmDeploySet=true"

# 下载 MAF 应用包
curl -s -H "X-API-Key: <key>" -o ACTION.zip \
  "http://<host>:<port>/maximo/api/script/SKS.AUTOSCRIPT.SCREENS?_action=exportAppZip&app=ACTION"
```

### 7.2 前端 axios（面板现有写法）

```js
// 导出
request({ url: '/api/script/SKS.AUTOSCRIPT.SCREENS', method: 'get',
  params: { _action: 'exportAppInfo', app, _langcode: 'ZH', _allLangcode: 'true' } })

// 导入（payload 即导出的 JSON，app 用 payload.app）
request({ url: '/api/script/SKS.AUTOSCRIPT.SCREENS', method: 'post',
  params: { _action: 'importAppInfo', _langcode: 'ZH', dmDeploySet: 'true' },
  data: payload })
```

### 7.3 获取当前语言 XML

```js
request({ url: '/api/script/SKS.AUTOSCRIPT.SCREENS/' + encodeURIComponent(app),
  method: 'get', params: { _langcode: 'ZH', ignoreMetadata: 'true' } })
```

## 8. 导入结果判定（插件/前端实现要点）

1. 响应体可能带 BOM 或空白，先 `trim` 再 `JSON.parse`。
2. 成功判定优先看根级 `status === "success"`；无 `status` 时按行判定（所有 `_status` 非 `failed` 即成功）。
3. 失败排查顺序：根级 `sks:failSumTotal > 0` → 找到 `_status=failed` 的行 → 用 `sks:uuid` 对应导出 JSON 中的同一行 → 看 `sks:currentCacheUseError`。
4. `_errorAssert=true` 时接口会直接抛异常（HTTP 500），此时用 Maximo 日志 `maximo.script.SKS.AUTOSCRIPT.SCREENS` 定位。

## 9. 与 SKS_MIGRATE_* 脚本的契约

SCREENS 通过 `service.invokeScript(scriptName)` 调用各对象脚本，**所有方法首参都是 `config`**（`jscustom.SksMigrateParamConfig`）：

```js
invokeMigrate("SKS_MIGRATE_SIGOPTION", "getDetail", config, mbo);   // -> 行对象
invokeMigrate("SKS_MIGRATE_SIGOPTION", "importApp", config, rows, app); // -> 结果行数组
```

### 9.1 必备方法

| 方法 | 入参 | 返回 |
| --- | --- | --- |
| `getDetail(config, mbo)` | MBO | 行对象：业务字段 + `sks:ref` + `_status`；`_allLangcode=true` 时含 `sks:langdata` |
| `exportApp(config, app, opts)` | 应用名 | 行数组（JDBC `SELECT *`，跳过 `ROWSTAMP`） |
| `exportZip(config, app)` | 应用名 | `{ fileName, bytes, size }`（仅 `SKS_MIGRATE_MAFAPPDATA`） |
| `importApp(config, rows, app)` | 行数组 | 逐行调用 `changeMbo` 的结果数组 |
| `changeMbo(config, data)` | 单行 | `{ _status, _operation, _message?, _apiAction, "sks:ref", "sks:uniqueID", "sks:uniqueIDName", "sks:objectName", "sks:uuid", "sks:currentCacheUseError"? }` |
| `getScriptSigoption(config)` | - | `{ sigoptions: [] }`（预留） |
| `_close(mboSet, config)` | MboSet | `config` 存在时延迟关闭，否则立即关闭 |

### 9.2 config 字段

| 字段 | 说明 |
| --- | --- |
| `service` | 当前脚本 service |
| `_userInfo` | `userInfo` |
| `_langcode` | 当前语言代码 |
| `_app` | 当前应用 |
| `_apiAction` | `export` / `imp` / `add` |
| `_apiMode` | `none` / `migrate` |
| `_apiType` | 请求参数 `_apiType` |
| `_deferredCloseSets` | 延迟关闭的 MboSet 数组 |
| `_allLangcode` / `_langcodeList` | 是否导出所有语言 / 启用语言列表（`LANGUAGE.ENABLED=1`） |
| `_errorAssert` | `true` 时单行失败抛异常 |
| `dmDeploySet` | `true` 时 MboSet 调 `setDMDeploySet(true)` |
| `_include` / `_includePresentation` / `_includeZip` | 导出大字段开关 |

### 9.3 写脚本注意事项

- 顶层 Java 类型必须 `var` 声明；`main();` 必须放文件末尾（`service.invokeScript` 是独立作用域）。
- 主键定位用 `KEY_CANDIDATES`（按候选顺序取第一组在数据中齐全的字段）；`SqlFormat.setObject(i, OBJECT_NAME, FIELD, value)`。
- 写入用 `mbo.setValue(field, value, MboConstants.NOACCESSCHECK)`，不存在字段忽略。
- `applyFields` 必须跳过 `_` 开头、含 `:`（`sks:`）的键，以及 `flags`。
- MboSet 一律经 `_close(set, config)` 关闭。
- 大字段对象（`MAXPRESENTATION`、`MAFAPPDATA`）在新增大字段时仍走 JDBC（CLOB/BLOB），但读写主表行可用 MBO。
