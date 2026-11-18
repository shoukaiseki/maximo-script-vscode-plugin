# 迁移接口脚本（SKS_MIGRATEAPI_*）接口文档

> 本目录下所有 `SKS_MIGRATEAPI_*.js` 均为 Maximo 自动化脚本（Nashorn），通过脚本 API 直接调用，不依赖前端。
> 请求/响应均为 JSON（`responseBody` 为 JSON 字符串），HTTP 状态恒为 200，业务结果看 `status`。

## 1. 通用约定

### 1.1 调用地址

```text
{MAXIMO_BASE}/maximo/api/script/{脚本名}?_action={动作}
```

- 方式：`GET` / `POST` 均可；复杂条件放 body（`Content-Type: application/json`）
- 鉴权：请求头 `apikey: {Maximo API Key}`
- 每个脚本对应同名 `.json`（自动化脚本定义），修改 `.js` 后用 `sks-maximo import-script <file> -e <env>` 部署

示例：

```bash
curl -s -X POST "http://host:9080/maximo/api/script/SKS_MIGRATEAPI_MAXLABELS?_action=query&_langcode=ZH" \
  -H "Content-Type: application/json" \
  -H "apikey: xxxx" \
  --data-binary '{"app":"TEST_SKS_WF1","pageNum":1,"pageSize":20}'
```

### 1.2 通用动作 `_action`

| 动作 | 说明 |
| --- | --- |
| `query` | 分页查询，返回 `{ <列表>: [...], total, pageNum, pageSize }`（分页参数 `pageNum`/`pageSize`，均 > 0 时生效） |
| `detail` | 按主键/条件取详情，不分页，返回 `{ <列表>: [...] }` |
| `export` | 不分页导出，返回 `{ <列表>: [...] }`；多数脚本支持 `xxxIds: [...]` 按主键选中导出（走 `IN`） |
| `import` | 导入（upsert），返回行级统计（见 1.4）；`SKS_MIGRATEAPI_CONFIGUR` 额外支持 `export` |

### 1.3 通用参数

| 参数 | 示例 | 说明 |
| --- | --- | --- |
| `_langcode` | `ZH` | 会话语言；多语言字段返回该语言译文，无译文回退基础语言 |
| `_allLangcode` | `true` | 多语言开关：导出/查询输出 `sks:langdata`；导入按 `sks:langdata` 设置各语言值 |
| `_langcodeList` | `EN,ZH` | 限制参与 `sks:langdata` 的语言 |
| `_ignoreList` | `conditionList` | 根级列表忽略清单（逗号分隔或数组）：导出不输出、导入跳过该根节点 |
| `_deleteNotExists` | `maxgroupList:_skschild_APPLICATIONAUTH:APPLICATIONAUTH` | 导入时删除目标中不存在于 JSON 的子行（按业务键） |
| `_errorAssert` | `true` | 任一行失败即抛异常中止；默认 `false` 累加继续 |
| `_debug` | `true` | 返回 `debugMsg`（调试信息） |
| `dmDeploySet` | `true` | 迁移模式：MboSet 调 `setDMDeploySet(true)`（部署集） |
| `_includeExtra` | `true` | 仅 `MAXMESSAGES`：额外返回 `title`/`buttonText`/`explanation`/`msgId` 等 |

### 1.4 通用响应结构

查询/导出成功：

```json
{ "status": "success", "message": "Script executed successfully", "data": { "maxlabelsList": [ ... ], "total": 12 } }
```

导入成功（行级统计）：

```json
{
  "status": "success",
  "message": "导入完成 ...",
  "data": {
    "total": 3, "added": 1, "updated": 1, "deleted": 0, "skipped": 1, "failed": 0,
    "results": [
      { "APP": "A", "sks:ref": "A/ID/PROP", "_status": "success", "_operation": "updated", "_message": "" }
    ],
    "sks:successSumTotal": 2,
    "sks:failSumTotal": 0,
    "sks:ignoreSumTotal": 1
  }
}
```

- 行级字段：`_status`（`success` / `failed` / `skipped`）、`_operation`（`added` / `updated` / `deleted` / `none`）、`_message`、`sks:ref`（业务主键）
- 对账：`successSumTotal + failSumTotal + ignoreSumTotal` = 自身(1) + 全部子级行数（含嵌套）
- 失败定位：`sks:failSumTotal > 0` → `results[]._status="failed"` → 看 `_message` / `sks:ref`

脚本异常：

```json
{ "status": "error", "message": "错误摘要", "errorMessageTrace": "堆栈" }
```

### 1.5 导入行约定

- 匹配键（唯一键）见第 2 章各接口说明，存在则更新、不存在则新增
- `_delete: true`：删除该行（个别脚本另有 `_deleteAll`）
- 以 `_` 开头、含 `:`（`sks:`）的字段为控制/虚拟字段，写库时忽略
- `_ignoreMain: true`：不修改主记录本身（安全组）
- `~null~`：多语言基础列为 `NOT NULL` 时的空值占位符

### 1.6 多语言字段与译文表

| 脚本 | 多语言字段 | 译文表 |
| --- | --- | --- |
| `MAXAPPS` | `DESCRIPTION` | `L_MAXAPPS` |
| `MAXMODULES` | `DESCRIPTION` | `L_MAXMODULES` |
| `MAXMENU` | `HEADERDESCRIPTION` | `L_MAXMENU` |
| `SIGOPTION` | `DESCRIPTION` | `L_SIGOPTION` |
| `MAXLABELS` | `VALUE` | `L_MAXLABELS` |
| `MAXOBJECTCFG` | `DESCRIPTION` | `L_MAXOBJECTCFG` |
| `MAXATTRIBUTECFG` | `TITLE`、`REMARKS` | `L_MAXATTRCFG` |
| `DOMAIN` | `DESCRIPTION` | `L_MAXDOMAIN` |
| `MAXMESSAGES` | `VALUE`（及 `_includeExtra` 的扩展字段） | `L_MAXMESSAGES` |

基础语言列在非基础语言会话下不会写入，导入完成后脚本会切回基础语言补写新增行。

## 2. 接口清单

| 脚本 | 对象 | 根级列表 | 动作 | 唯一键 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `SKS_MIGRATEAPI_CONFIGUR` | 对象配置 | `maxObjects` | import/export | `OBJECTNAME` + 子行键 | 表结构+多语言；`_onlyFunctions` 控制导入功能 |
| `SKS_MIGRATEAPI_MAXAPPS` | MAXAPPS | `maxappsList` | query/detail/export | `APP` | 应用描述多语言（导入走 CONFIGUR 的 `mlmaxapps`） |
| `SKS_MIGRATEAPI_MAXMODULES` | MAXMODULES | `maxmodulesList` | query/detail/export/import | `MODULE` | 模块描述多语言 |
| `SKS_MIGRATEAPI_MAXMENU` | MAXMENU | `maxmenuList` | query/detail/export/import | `MENUTYPE`+`MODULEAPP`+`ELEMENTTYPE`+`KEYVALUE` | 菜单标题多语言 |
| `SKS_MIGRATEAPI_SIGOPTION` | SIGOPTION | `sigoptionList` | query/detail/export/import | `APP`+`OPTIONNAME` | 应用选项描述多语言 |
| `SKS_MIGRATEAPI_MAXLABELS` | MAXLABELS | `maxlabelsList` | query/detail/export/import | `APP`+`ID`+`PROPERTY` | 应用 XML 标签多语言 |
| `SKS_MIGRATEAPI_MAXOBJECTCFG` | MAXOBJECTCFG | `maxobjectcfgList` | query/detail/export/import | `OBJECTNAME` | 对象描述多语言 |
| `SKS_MIGRATEAPI_MAXATTRIBUTECFG` | MAXATTRIBUTECFG | `maxattributecfgList` | query/detail/export/import | `OBJECTNAME`+`ATTRIBUTENAME` | 属性 TITLE/REMARKS 多语言 |
| `SKS_MIGRATEAPI_DOMAIN` | MAXDOMAIN | `domainList` | query/detail/export/import | `DOMAINID` | 含域值子表 `_skschild_*` |
| `SKS_MIGRATEAPI_CONDITION` | CONDITION | `conditionList` | query/detail/export/import | `CONDITIONNUM` | 条件表达式 |
| `SKS_MIGRATEAPI_AUTOKEY` | AUTOKEY | `autokeys` | query/detail/export/import | `AUTOKEYNAME`+`ORGID`/`SITEID`/`SETID` | 支持按级别批量创建 |
| `SKS_MIGRATEAPI_MAXMESSAGES` | MAXMESSAGES | `messages` | query/detail/export/import | `MSGGROUP`+`MSGKEY` | 消息多语言 |
| `SKS_MIGRATEAPI_SECURGROUP` | MAXGROUP | `maxgroupList` + `conditionList` | query/detail/export/apps/import | `GROUPNAME` | 安全组及子表授权 |

## 3. SKS_MIGRATEAPI_CONFIGUR（对象配置）

### 3.1 导出

`POST /maximo/api/script/SKS_MIGRATEAPI_CONFIGUR?_action=export`

body（任一）：

```json
{ "objectNames": ["RFQ", "WORKORDER"], "attributeFilters": [{ "object": "RFQ", "attribute": "DESCRIPTION" }] }
```

| 参数 | 说明 |
| --- | --- |
| `objectNames` | 对象名数组；也可用 `{maxObjects:[...]}` 或裸数组/单对象 |
| `attributeFilters` | 仅导出指定对象的指定属性 |
| `ignoreDefVal=true` | 精简导出（只输出非默认值字段）；默认 `false` 全字段 |
| `_allLangcode=true` | 追加 `sks:langdata`（对象 `DESCRIPTION`、属性 `TITLE`/`REMARKS`） |
| `_onlyInclude=ml` | 仅导出多语言（`object`/`object` 级 `sks:langdata`/`attributes[].sks:langdata`） |
| `sksQbeWhere:maxobjectcfgId` | URL/body 传，如 `=2413`，选中对象导出 |
| `sksQbeWhere:maxattributecfgId` | 如 `=48576,=48577`，选中属性导出 |

返回：

```json
{ "status": "success", "data": { "maxObjects": [
  { "object": "RFQ",
    "sks:langdata": { "DESCRIPTION": { "EN": "...", "ZH": "..." } },
    "attributes": [ { "attribute": "DESCRIPTION", "sks:langdata": { "TITLE": {...}, "REMARKS": {...} } } ] }
] } }
```

### 3.2 导入

`POST /maximo/api/script/SKS_MIGRATEAPI_CONFIGUR?_action=import`

body：

```json
{
  "maxObjects": [
    {
      "object": "RFQ",
      "description": "...",
      "attributes": [ { "attribute": "DESCRIPTION", "maxtype": 10, "length": 100 } ],
      "indexes": [ ... ],
      "relationships": [ ... ]
    }
  ],
  "maxappsList": [ ... ],
  "maxlabelsList": [ ... ]
}
```

| 参数 | 说明 |
| --- | --- |
| `_onlyFunctions` | 仅执行指定功能（逗号分隔或数组）。可选：`configur`、`mlmaxapps`、`mlmaxlabels`、`mlmaxmodules`、`mlmaxmenu`、`mlsigoption`、`mlmaxobjectcfg`、`mlmaxattributecfg`；**不传则执行 body 中出现的全部功能** |
| `dmDeploySet=true` | 部署集模式：无条件显式设置 `MAXTYPE`/`LENGTH`/`SCALE`（0 也设置），并补齐 `MAXOBJECTCFG.CHANGED` |
| `ignoreAttributes=true` | 跳过属性处理 |
| `ignoreRelationships=true` | 跳过关系处理 |

> 多语言维护页面（MAXAPPS/模块/菜单/签名选项/标签/对象配置/属性配置）的导入统一调用本接口，并带 `_onlyFunctions` 只执行对应功能。
> 安全策略：对象级 `delete: true` 记为 skipped，不执行删除。

## 4. SKS_MIGRATEAPI_MAXAPPS（应用）

- 动作：`query` / `detail` / `export`（**无 import**，导入由 CONFIGUR 的 `mlmaxapps` 完成）
- 根级列表：`maxappsList`
- 唯一键：`APP`

| 动作 | 参数 |
| --- | --- |
| `query` | `app`、`description`/`value`、`tab=all|xml|mafapp`、`where`、`pageNum`、`pageSize`（`tab=xml` 只查有 MAXPRESENTATION 的应用；`mafapp` 为 `APPTYPE in ('WC')`） |
| `detail` | `app` |
| `export` | 同上 + `appIds: ["APP1","APP2"]`（选中导出） |

行结构：`APP, DESCRIPTION, APPTYPE, MAINTBNAME, ORIGINALAPP, LANGCODE, ISMOBILE, LOCKENABLED, SKIPNAVIGATION, HASLD, MAXAPPSID, sks:ref`。

导入示例（只维护描述译文）：

```json
{ "maxappsList": [ { "APP": "TEST_SKS_WF1", "sks:langdata": { "DESCRIPTION": { "ZH": "中文标题" } } } ] }
```

## 5. SKS_MIGRATEAPI_MAXMODULES（模块）

- 动作：`query` / `detail` / `export` / `import`；根级列表 `maxmodulesList`；唯一键 `MODULE`
- 查询：`module`、`description`、`where`、分页；导出支持 `maxmodulesIds`
- 行结构：`MODULE, DESCRIPTION, MAXMODULESID, sks:langdata.DESCRIPTION`

## 6. SKS_MIGRATEAPI_MAXMENU（菜单）

- 动作：`query` / `detail` / `export` / `import`；根级列表 `maxmenuList`
- 唯一键：`MENUTYPE + MODULEAPP + ELEMENTTYPE + KEYVALUE`
- 查询：`menutype`、`moduleapp`、`elementtype`、`keyvalue`、`headerdescription`、`where`、分页；导出支持 `maxmenuIds`
- 行结构：`MENUTYPE, MODULEAPP, POSITION, SUBPOSITION, ELEMENTTYPE, KEYVALUE, HEADERDESCRIPTION, URL, VISIBLE, IMAGE, ACCESSKEY, TABDISPLAY, PINNED, MAXMENUID, sks:langdata.HEADERDESCRIPTION`

## 7. SKS_MIGRATEAPI_SIGOPTION（应用选项）

- 动作：`query` / `detail` / `export` / `import`；根级列表 `sigoptionList`；唯一键 `APP + OPTIONNAME`
- 查询：`app`、`optionname`、`description`、`where`、分页；导出支持 `sigoptionIds`
- 行结构：`APP, OPTIONNAME, DESCRIPTION, ALSOGRANTS, ALSOREVOKES, PREREQUISITE, VISIBLE, ESIGENABLED, SIGOPTIONID, sks:langdata.DESCRIPTION`

## 8. SKS_MIGRATEAPI_MAXLABELS（应用 XML 标签）

- 动作：`query` / `detail` / `export` / `import`；根级列表 `maxlabelsList`；唯一键 `APP + ID + PROPERTY`
- 查询：`app`、`id`、`property`、`value`、`where`、分页；导出支持 `maxlabelsIds`
- 行结构：`APP, ID, PROPERTY, VALUE, MAXLABELSID, sks:langdata.VALUE`

## 9. SKS_MIGRATEAPI_MAXOBJECTCFG（对象配置描述）

- 动作：`query` / `detail` / `export` / `import`；根级列表 `maxobjectcfgList`；唯一键 `OBJECTNAME`
- 查询：`objectname`、`description`、`where`、分页；导出支持 `maxobjectcfgIds`（主键 `MAXOBJECTID`）
- 行结构：`OBJECTNAME, DESCRIPTION, CLASSNAME, SERVICENAME, SITEORGTYPE, PERSISTENT, ISVIEW, MAINOBJECT, USERDEFINED, EAUDITENABLED, ENTITYNAME, MAXOBJECTID, sks:langdata.DESCRIPTION`

## 10. SKS_MIGRATEAPI_MAXATTRIBUTECFG（属性配置 TITLE/REMARKS）

- 动作：`query` / `detail` / `export` / `import`；根级列表 `maxattributecfgList`；唯一键 `OBJECTNAME + ATTRIBUTENAME`
- 查询：`objectname`、`attributename`、`value`、`where`、分页；导出支持 `maxattributecfgIds`（主键 `MAXATTRIBUTEID`）
- 行结构：`OBJECTNAME, ATTRIBUTENAME, TITLE, REMARKS, MAXTYPE, LENGTH, REQUIRED, PERSISTENT, DOMAINID, ALIAS, MAXATTRIBUTEID, sks:langdata.{TITLE,REMARKS}`
- 注意：基础语言列 `TITLE`/`REMARKS` 为 `NOT NULL`，空值用 `~null~`

## 11. SKS_MIGRATEAPI_DOMAIN（域）

- 动作：`query` / `detail` / `export` / `import`；根级列表 `domainList`；唯一键 `DOMAINID`
- 查询：`domainid`、`domaintype`、`description`、分页
- 子表（导出/导入，`_skschild_` 前缀，兼容无前缀旧写法）：
  `ALNDOMAIN`、`SYNONYMDOMAIN`、`NUMERICDOMAIN`、`NUMRANGEDOMAIN`、`TABLEDOMAIN`（其子级 `CROSSOVERDOMAIN`）

```json
{
  "domainid": "SKS_STATUS", "domaintype": "ALN", "description": "...",
  "sks:langdata": { "DESCRIPTION": { "EN": "...", "ZH": "..." } },
  "_skschild_alndomain": [ { "value": "A", "description": "..." } ]
}
```

## 12. SKS_MIGRATEAPI_CONDITION（条件表达式）

- 动作：`query` / `detail` / `export` / `import`；根级列表 `conditionList`；唯一键 `CONDITIONNUM`
- 查询：`conditionnum`、`description`、`type`、`expression`、分页；`detail` 支持 `conditionnums: [...]`
- 行结构：`CONDITIONNUM, TYPE, EXPRESSION, CLASSNAME, DESCRIPTION, NOCACHING, _delete`

## 13. SKS_MIGRATEAPI_AUTOKEY（自动键）

- 动作：`query` / `detail` / `export` / `import`；根级列表 `autokeys`；唯一键 `AUTOKEYNAME`（按级别含 `ORGID`/`SITEID`/`SETID`）
- 查询：`autokeyname`、`prefix`、`siteid`、`orgid`、`setid`、`level`、分页；导出支持 `autokeynames: [...]`
- 行内字段：`autokeyname`、`siteid`、`orgid`、`setid`、`prefix`、`seed`、`defautSeed`、`langcode`
- `siteorgtype`：`SITE` / `ORG` / `SYSTEM` / `ITEMSET` / `COMPANYSET`，按级别批量创建
- `_delete: true` 删除；`_deleteAll: true` 删除所有同名

## 14. SKS_MIGRATEAPI_MAXMESSAGES（消息）

- 动作：`query` / `detail` / `export` / `import`；根级列表 `messages`；唯一键 `MSGGROUP + MSGKEY`
- 查询：`msgid`、`msggroup`、`msgkey`、`value`、`where`、分页；`filterMode: "gk"` + `groupKeyList: [...]` 按组批量过滤
- `detail`：`maxmessagesid` 或 `msggroup + msgkey`（不存在返回 `null`）
- 行结构：`msgGroup, msgKey, value, MAXMESSAGESID, displayMethod, options, sks:options, prefix, msgIdPrefix, msgIdSuffix`；`_includeExtra=true` 追加标题类字段
- 导入：新增时未给 `msgId` 且未给 `msgIdPrefix`/`msgIdSuffix`，默认 `BMXZZ`/`E`；`delete`/`_delete=true` 删除

## 15. SKS_MIGRATEAPI_SECURGROUP（安全组）

- 动作：`query` / `detail` / `export` / `apps` / `import`
- 根级：`maxgroupList`（主记录 + `_skschild_*` 子表数组）、`conditionList`（关联条件）
- 唯一键：`GROUPNAME`

| 动作/参数 | 说明 |
| --- | --- |
| `query` | `groupname`、`description`、`where`、分页；返回含 `appcount/sitecount/usercount` |
| `detail` | `groupname` 或 `groupnames: [...]`，返回完整对象 + `conditionList` |
| `export` | `groupnames`、`appnames`（只保留这些应用的授权行）、`ignoreMain=true`（对象带 `_ignoreMain`）、`_apiMode=appauth`（只导出 `APPLICATIONAUTH`/`SECURITYRESTRICT`）、`_ignoreList` 控制根节点 |
| `apps` | `app=IBM`，返回 `{ apps:[{APP,DESCRIPTION}], total }` |
| `import` | 主记录 upsert（支持 `_ignoreMain`/`_delete`）；`_deleteNotExists` 删除目标多余子行 |

- `_skschild_APPLICATIONAUTH` 按 APP 聚合：`[{ APP, sks:appdescription, APPLICATIONAUTH: [ 权限行 ] }]`
- 目标环境应用注册表中不存在的 `APP`，新增其授权行会被表域校验拒绝（该组导入失败）

## 16. 前端调用示例（axios）

```js
import request from '@/utils/request'

// 查询
export function queryMaxLabels(params) {
  return request({
    url: '/api/script/SKS_MIGRATEAPI_MAXLABELS',
    method: 'get',
    params: Object.assign({ _action: 'query', _langcode: 'ZH' }, params)
  })
}

// 导入（统一入口，仅执行多语言）
export function importMaxLabels(data) {
  return request({
    url: '/api/script/SKS_MIGRATEAPI_CONFIGUR',
    method: 'post',
    params: { _action: 'import', _onlyFunctions: 'mlmaxlabels', dmDeploySet: 'true' },
    data
  })
}
```

## 17. 脚本与部署

| 文件 | 说明 |
| --- | --- |
| `SKS_MIGRATEAPI_*.js` | 脚本源码 |
| `SKS_MIGRATEAPI_*.json` | 自动化脚本定义（名称/语言/包路径等） |

```bash
# 部署（-e 指定环境，如 loc）
sks-maximo import-script "SKS_MIGRATEAPI_MAXLABELS.js" -e loc
```

修改脚本后建议先执行 `node --check <file>` 校验语法再部署。
