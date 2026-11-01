# TASK03 应用信息导出（脚本接口调用说明）

> 目标：导出应用时通过 Maximo 脚本 `SKS.AUTOSCRIPT.SCREENS` 调用接口，先保存 `<应用名>.json`，再根据 JSON 内容按需生成 `<应用名>.xml` / `<应用名>.zip`。

## 1. 接口地址与通用约定

| 项 | 值 |
| --- | --- |
| 基础地址 | 由插件配置 `maximoScript.serverUrl`（如 `http://host:9080/maximo`） |
| 脚本路径 | `/maximo/api/script/SKS.AUTOSCRIPT.SCREENS`（兼容 `/oslc/script/...`） |
| 认证 | 与 Maximo REST 一致，`X-API-Key`（或 Cookie/Session） |
| 权限 | 用户需有 `SKS_UTILS.DEPLOYSCRIPT` 选项或属于管理员组 |
| 返回 | JSON 字符串；`_action=exportAppZip` 返回二进制流 |

## 2. 导出流程

### Step 1：导出应用信息 JSON

```
GET {serverUrl}/api/script/SKS.AUTOSCRIPT.SCREENS
    ?_action=exportAppInfo
    &app=<APP>              // 必填，脚本内部转大写
    &_langcode=ZH           // 期望语言
    &_include=presentation  // 必须带上，否则 JSON 中没有 XML 文本
                            // 可选再带 allLangcode=true（_allLangcode）导出全部语言
```

- `_include` 为逗号分隔：`presentation` 返回 XML 文本，`zip` 返回 `zipBase64`（仅适合小包；大包走 Step 3）。
- 响应需要去 BOM/空白后 `JSON.parse`；若返回被包装为 `{code,data}`，取 `data`。
- 保存文件：`<APP>.json`，UTF-8（无 BOM）、2 空格缩进。

响应结构（关键部分）：

```json
{
  "app": "ACTION",
  "_langcode": "ZH",
  "status": "success",
  "maxapps": { ...MAXAPPS 行..., "sks:uuid": "..." },
  "presentation": {
    "MAXPRESENTATIONID": 20117,
    "sks:XML_SIZE": 123456,
    "PRESENTATION": "<application ...>",   // 仅 _include=presentation 时存在
    "sks:uuid": "..."
  },
  "mafappdata": null,        // MAF 应用时是对象；无则 null
  "sigoptions": [ ... ],
  "maxlabels": [ ... ],
  "menus": [ ... ],
  "appdoctype": [ ... ]
}
```

### Step 2：生成 `<APP>.xml`（按 JSON 判断）

判断条件：`data.presentation` 不为 `null` 且 `data.presentation.PRESENTATION` 是非空字符串。

- 有值 → 把 `PRESENTATION` 原样写入 `<APP>.xml`（UTF-8）。
- 无 `presentation`、或 `PRESENTATION` 为空 → 跳过，不生成 xml（该应用没有应用 XML）。

注意：`presentation` 只有 `MAXPRESENTATIONID`、`sks:XML_SIZE` 而没 `PRESENTATION` 时，说明导出时没带 `_include=presentation`，此时应重新带参数请求，而不是生成空 xml。

### Step 3：生成 `<APP>.zip`（MAF 应用）

判断条件（两个都要满足）：

1. `data.mafappdata` 不为 `null`（导出 JSON 里存在 MAFAPPDATA 元信息，说明该应用带 MAF 应用包；也可用 `maxapps.APPTYPE = 'WC'` 辅助判断）；
2. 插件设置中「导出 zip」开关已启用。

满足则下载二进制包：

```
GET {serverUrl}/api/script/SKS.AUTOSCRIPT.SCREENS
    ?_action=exportAppZip
    &app=<APP>
```

- 以 `responseType: arraybuffer（Node 端直接 Buffer）` 读取响应体，写入 `<APP>.zip`。
- 若返回 4xx/错误 JSON（应用没有 MAFAPPDATA zip 数据），跳过并给出提示，不影响 json/xml 结果。
- 备选：`&_format=base64` 返回 `{ fileName, size, zipBase64 }`，用 base64 解码后保存（适合小包）。

## 3. 文件命名与目录

| 文件 | 来源 | 命名 |
| --- | --- | --- |
| 应用信息 | `_action=exportAppInfo` 响应 | `<APP>.json` |
| 应用 XML | `data.presentation.PRESENTATION` | `<APP>.xml` |
| MAF 应用包 | `_action=exportAppZip` 二进制 | `<APP>.zip` |

- `<APP>` 使用后端返回的 `data.app`（已大写），三者同名不同扩展名。
- 输出目录：插件当前配置的导出目录（未配置时用当前工作区根目录）。
- 覆盖策略：同名文件已存在时，建议先备份到 `~/.sks/maxbackup/...` 再覆盖（与现有 Pull 逻辑一致），或提示用户确认。

## 4. 接口参数速查

| 参数 | 说明 |
| --- | --- |
| `_action` | `exportAppInfo` / `exportAppZip` |
| `app` | 应用名，必填 |
| `_langcode` | 期望语言（如 `ZH`） |
| `_include` | `presentation` / `zip`，逗号分隔；导出 xml 必须带 `presentation` |
| `_allLangcode=true` | 导出所有启用语言，行内附带 `sks:langdata` |
| `_format=base64` | zip 以 base64 JSON 返回（可选） |
| `dmDeploySet=true` | 迁移模式（导出一般不需要；导入时用） |

## 5. 判定逻辑汇总（伪代码）

```
data = GET exportAppInfo(app, include=presentation)
writeFile(`${app}.json`, JSON.stringify(data, null, 2))

if (data.presentation && data.presentation.PRESENTATION) {
    writeFile(`${app}.xml`, data.presentation.PRESENTATION)
} else {
    // 没有应用 XML，跳过
}

if (data.mafappdata && zipEnabled) {
    try {
        buf = GET exportAppZip(app)          // arraybuffer
        writeFile(`${app}.zip`, buf)
    } catch (e) {
        // 没有 zip 数据或下载失败，提示即可，不影响 json/xml
    }
}
```

## 6. 失败处理

- 导出接口返回 `status !== "success"` 或 HTTP 非 200：提示错误信息，不写任何文件。
- JSON 解析失败（常见：响应带 BOM）：先 `trim` 去掉 `\uFEFF` 再解析。
- `exportAppZip` 返回 `zip_not_found`：说明应用没有 MAFAPPDATA 字节码，跳过 zip。
- 所有请求统一走插件的 `httpRequestToMaximo({ url, method })`，便于复用超时与日志。
