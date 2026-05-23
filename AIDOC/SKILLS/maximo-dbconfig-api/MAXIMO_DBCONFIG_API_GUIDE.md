# Maximo 数据库配置 API - 完整测试指南

## 概述

本文档提供通过 Maximo REST API 进行数据库配置的完整指南，基于实际测试验证（TEST002/TEST003），包含最佳实践、常见错误处理和完整的操作示例。

**测试时间**: 2026-05-18  
**核心发现**: SITEID 和 ORGID 必须使用 SAMEAS 引用标准对象

---

## 目录

1. [核心原则](#核心原则)
2. [API 认证与端点](#api-认证与端点)
3. [创建对象配置](#创建对象配置)
4. [查询对象配置](#查询对象配置)
5. [更新与删除](#更新与删除)
6. [字段配置规范](#字段配置规范)
7. [测试过程与错误处理](#测试过程与错误处理)
8. [最佳实践](#最佳实践)
9. [验证清单](#验证清单)

---

## 核心原则

### 1. SITE 层级对象是主流

在 Maximo 实施过程中，新增 MAXOBJECT 时 `siteorgtype` 基本上都设置为 **SITE**。

### 2. SITEID 和 ORGID 必须使用 SAMEAS

创建 SITE 层级的持久化对象时，**必须**遵循以下规范：

- ✅ SITEID 必须使用 `sameasobject: "SITE"`, `sameasattribute: "SITEID"`
- ✅ ORGID 必须使用 `sameasobject: "ORGANIZATION"`, `sameasattribute: "ORGID"`
- ❌ 不能手动定义 maxtype 和 length

### 3. 配置变更需要应用

所有配置创建后，需要在 Maximo 管理界面执行"应用配置变更"操作，才能将元数据同步到物理数据库。

---

## API 认证与端点

### 认证方式

#### API Key 认证（推荐）
```bash
--header "apiKey: YOUR_API_KEY"
```

#### Session Cookie 认证
```bash
--header "Cookie: JSESSIONID=YOUR_SESSION_ID"
```

### 基础 URL

```
http://localhost:9080/maximo/api/os/MXOBJECTCFG
```

### 通用参数

- `?lean=1` - 返回精简格式（推荐）
- `oslc.pageSize=30` - 每页记录数
- `pageno=1` - 页码
- `oslc.where=条件` - 过滤条件

---

## 创建对象配置

### 基本结构

```json
{
  "objectname": "对象名",
  "entityname": "实体名",
  "description": "描述",
  "persistent": 1,
  "siteorgtype": "SITE",
  "maxattributecfg": [
    // 字段定义数组
  ]
}
```

### 完整示例：创建 TEST003 表

#### 步骤 1: 准备 JSON 配置文件

创建 `test003_create.json` 文件：

```json
{
  "objectname": "TEST003",
  "entityname": "TEST003",
  "description": "业务对象配置测试",
  "persistent": 1,
  "siteorgtype": "SITE",
  "maxattributecfg": [
    {
      "attributename": "SITEID",
      "columnname": "SITEID",
      "sameasobject": "SITE",
      "sameasattribute": "SITEID",
      "required": true,
      "persistent": true,
      "remarks": "站点ID"
    },
    {
      "attributename": "ORGID",
      "columnname": "ORGID",
      "sameasobject": "ORGANIZATION",
      "sameasattribute": "ORGID",
      "required": true,
      "persistent": true,
      "remarks": "组织ID"
    },
    {
      "attributename": "ITEMNUM",
      "columnname": "ITEMNUM",
      "maxtype": "UPPER",
      "length": 30,
      "required": true,
      "persistent": true,
      "remarks": "系统主键"
    },
    {
      "attributename": "ITEMID",
      "columnname": "ITEMID",
      "maxtype": "BIGINT",
      "length": 19,
      "required": true,
      "persistent": true,
      "remarks": "唯一标识（自增）"
    },
    {
      "attributename": "ITEMSETID",
      "columnname": "ITEMSETID",
      "maxtype": "UPPER",
      "length": 8,
      "required": true,
      "persistent": true,
      "remarks": "集合ID"
    },
    {
      "attributename": "STATUS",
      "columnname": "STATUS",
      "maxtype": "UPPER",
      "length": 16,
      "required": true,
      "persistent": true,
      "remarks": "活动/停用"
    },
    {
      "attributename": "STATUSDATE",
      "columnname": "STATUSDATE",
      "maxtype": "DATETIME",
      "length": 10,
      "required": true,
      "persistent": true,
      "remarks": "状态变更日期"
    },
    {
      "attributename": "DESCRIPTION",
      "columnname": "DESCRIPTION",
      "maxtype": "ALN",
      "length": 100,
      "required": false,
      "persistent": true,
      "remarks": "名称"
    },
    {
      "attributename": "DESCRIPTION_LONGDESCRIPTION",
      "columnname": "DESCRIPTION_LONGDESCRIPTION",
      "maxtype": "LONGALN",
      "length": 32000,
      "required": false,
      "persistent": false,
      "remarks": "详细描述"
    },
    {
      "attributename": "ITEMTYPE",
      "columnname": "ITEMTYPE",
      "maxtype": "UPPER",
      "length": 15,
      "required": true,
      "persistent": true,
      "remarks": "类型"
    },
    {
      "attributename": "CLASSSTRUCTUREID",
      "columnname": "CLASSSTRUCTUREID",
      "maxtype": "UPPER",
      "length": 25,
      "required": false,
      "persistent": true,
      "remarks": "分类结构ID"
    },
    {
      "attributename": "COMMODITY",
      "columnname": "COMMODITY",
      "maxtype": "UPPER",
      "length": 8,
      "required": false,
      "persistent": true,
      "remarks": "商品代码"
    },
    {
      "attributename": "COMMODITYGROUP",
      "columnname": "COMMODITYGROUP",
      "maxtype": "UPPER",
      "length": 8,
      "required": false,
      "persistent": true,
      "remarks": "商品组"
    },
    {
      "attributename": "IN19",
      "columnname": "IN19",
      "maxtype": "ALN",
      "length": 10,
      "required": false,
      "persistent": true,
      "remarks": "扩展字段19"
    },
    {
      "attributename": "IN20",
      "columnname": "IN20",
      "maxtype": "ALN",
      "length": 10,
      "required": false,
      "persistent": true,
      "remarks": "扩展字段20"
    },
    {
      "attributename": "IN21",
      "columnname": "IN21",
      "maxtype": "ALN",
      "length": 10,
      "required": false,
      "persistent": true,
      "remarks": "扩展字段21"
    },
    {
      "attributename": "IN22",
      "columnname": "IN22",
      "maxtype": "DATETIME",
      "length": 10,
      "required": false,
      "persistent": true,
      "remarks": "扩展字段22（日期时间）"
    },
    {
      "attributename": "IN23",
      "columnname": "IN23",
      "maxtype": "DECIMAL",
      "length": 15,
      "scale": 2,
      "required": false,
      "persistent": true,
      "remarks": "扩展字段23（小数）"
    },
    {
      "attributename": "IN24",
      "columnname": "IN24",
      "maxtype": "ALN",
      "length": 10,
      "required": false,
      "persistent": true,
      "remarks": "扩展字段24"
    },
    {
      "attributename": "IN25",
      "columnname": "IN25",
      "maxtype": "ALN",
      "length": 10,
      "required": false,
      "persistent": true,
      "remarks": "扩展字段25"
    },
    {
      "attributename": "IN26",
      "columnname": "IN26",
      "maxtype": "ALN",
      "length": 10,
      "required": false,
      "persistent": true,
      "remarks": "扩展字段26"
    },
    {
      "attributename": "IN27",
      "columnname": "IN27",
      "maxtype": "ALN",
      "length": 10,
      "required": false,
      "persistent": true,
      "remarks": "扩展字段27"
    }
  ]
}
```

#### 步骤 2: 执行创建命令

```bash
curl.exe --request POST \
  --url "http://localhost:9080/maximo/api/os/MXOBJECTCFG?lean=1" \
  --header "Accept: */*" \
  --header "Content-Type: application/json" \
  --header "Cookie: JSESSIONID=YOUR_SESSION_ID" \
  --header "apiKey: YOUR_API_KEY" \
  --data-binary "@test003_create.json"
```

**预期响应**: 201 Created，返回新创建的对象配置信息

**重要**: 使用 `--data-binary @filename.json` 避免 PowerShell JSON 转义问题

---

## 查询对象配置

### 查询列表（带过滤）

```bash
curl.exe --request GET \
  --url "http://localhost:9080/maximo/api/os/MXOBJECTCFG/?lean=1&oslc.pageSize=30&pageno=1&oslc.where=objectname=%22TEST003%22" \
  --header "Accept: */*" \
  --header "Cookie: JSESSIONID=YOUR_SESSION_ID" \
  --header "apiKey: YOUR_API_KEY"
```

**响应示例**:
```json
{
  "member": [
    {
      "href": "http://localhost:9080/maximo/api/os/mxobjectcfg/_VEVTVDAwMw--"
    }
  ],
  "href": "http://localhost:9080/maximo/api/os/MXOBJECTCFG",
  "responseInfo": {
    "pagenum": 1
  }
}
```

### 查询详情

从列表响应中获取 Base64 编码的 ID，然后：

```bash
curl.exe --request GET \
  --url "http://localhost:9080/maximo/api/os/MXOBJECTCFG/_VEVTVDAwMw--?lean=1" \
  --header "Accept: */*" \
  --header "Cookie: JSESSIONID=YOUR_SESSION_ID" \
  --header "apiKey: YOUR_API_KEY"
```

**Base64 编码规则**:
- TEST003 → `_VEVTVDAwMw--`
- 格式: `'_' + btoa('TEST003')`

### 验证 SITEID/ORGID 的 SAMEAS 配置

```bash
curl.exe --request GET \
  --url "http://localhost:9080/maximo/api/os/MXOBJECTCFG/_VEVTVDAwMw--?lean=1" \
  --header "Accept: */*" \
  --header "Cookie: JSESSIONID=YOUR_SESSION_ID" \
  --header "apiKey: YOUR_API_KEY" | \
  ConvertFrom-Json | \
  Select-Object -ExpandProperty maxattributecfg | \
  Where-Object {$_.attributename -in @("SITEID", "ORGID")} | \
  Select-Object attributename, sameasobject, sameasattribute | \
  Format-Table -AutoSize
```

**预期输出**:
```
attributename    sameasobject   sameasattribute
-------------    ------------   ---------------
ORGID            ORGANIZATION   ORGID
SITEID           SITE           SITEID
```

---

## 更新与删除

### 更新对象配置

使用 PATCH 方法：

```bash
curl.exe --request POST \
  --url "http://localhost:9080/maximo/api/os/MXOBJECTCFG/_VEVTVDAwMw--" \
  --header "Accept: */*" \
  --header "Content-Type: application/json" \
  --header "x-method-override: PATCH" \
  --header "Cookie: JSESSIONID=YOUR_SESSION_ID" \
  --header "apiKey: YOUR_API_KEY" \
  --data-binary '{"description":"更新后的描述"}'
```

**注意**: 
- 必须使用 `POST + x-method-override: PATCH`
- URL **不能**加 `?lean=1`（会导致静默失败）

### 删除对象配置

```bash
curl.exe --request DELETE \
  --url "http://localhost:9080/maximo/api/os/MXOBJECTCFG/_VEVTVDAwMw--?lean=1" \
  --header "Accept: */*" \
  --header "Cookie: JSESSIONID=YOUR_SESSION_ID" \
  --header "apiKey: YOUR_API_KEY"
```

**预期响应**: 204 No Content（无返回内容）

**注意**: 删除操作只是标记为删除状态（changed='D'），需要执行"应用配置变更"才会真正删除。

---

## 字段配置规范

### 1. 系统必需字段（SITE 层级）

#### SITEID（必须使用 SAMEAS）

```json
{
  "attributename": "SITEID",
  "columnname": "SITEID",
  "sameasobject": "SITE",
  "sameasattribute": "SITEID",
  "required": true,
  "persistent": true,
  "remarks": "站点ID"
}
```

#### ORGID（必须使用 SAMEAS）

```json
{
  "attributename": "ORGID",
  "columnname": "ORGID",
  "sameasobject": "ORGANIZATION",
  "sameasattribute": "ORGID",
  "required": true,
  "persistent": true,
  "remarks": "组织ID"
}
```

**重要**: SITEID 和 ORGID **必须**使用 SAMEAS 引用，不能手动定义 maxtype 和 length。

---

### 2. 常用字段类型

#### 字符型字段

```json
{
  "attributename": "ITEMNUM",
  "columnname": "ITEMNUM",
  "maxtype": "UPPER",
  "length": 30,
  "required": true,
  "persistent": true
}
```

**MAXTYPE 选项**:
- `ALN` - 普通字母数字（最常用）
- `UPPER` - 强制大写
- `LOWER` - 强制小写

---

#### 数值型字段

```json
{
  "attributename": "ITEMID",
  "columnname": "ITEMID",
  "maxtype": "BIGINT",
  "length": 19,
  "required": true,
  "persistent": true
}
```

**MAXTYPE 选项**:
- `INTEGER` - 整型
- `BIGINT` - 大整型
- `DECIMAL` - 小数（需指定 scale）
- `AMOUNT` - 金额

---

#### DECIMAL 类型（需指定 scale）

```json
{
  "attributename": "QUANTITY",
  "columnname": "QUANTITY",
  "maxtype": "DECIMAL",
  "length": 15,
  "scale": 2,
  "required": false,
  "persistent": true
}
```

**注意**: DECIMAL 类型**必须**指定 `scale` 参数。

---

#### 日期时间型字段

```json
{
  "attributename": "STATUSDATE",
  "columnname": "STATUSDATE",
  "maxtype": "DATETIME",
  "length": 10,
  "required": true,
  "persistent": true
}
```

**MAXTYPE 选项**:
- `DATE` - 日期
- `TIME` - 时间
- `DATETIME` - 日期+时间
- `DURATION` - 持续时间

---

#### 长文本字段

```json
{
  "attributename": "DESCRIPTION_LONGDESCRIPTION",
  "columnname": "DESCRIPTION_LONGDESCRIPTION",
  "maxtype": "LONGALN",
  "length": 32000,
  "required": false,
  "persistent": false
}
```

**注意**: LONGALN 类型的 `persistent` 应设置为 `false`。

---

### 3. 使用 SAMEAS 引用标准字段

当字段与标准对象字段含义相同时，推荐使用 SAMEAS：

```json
{
  "attributename": "LOCATION",
  "columnname": "LOCATION",
  "sameasobject": "LOCATIONS",
  "sameasattribute": "LOCATION",
  "required": false,
  "persistent": true
}
```

**优势**:
- ✅ 自动继承标准字段的完整定义
- ✅ 确保类型、长度、验证规则一致
- ✅ 便于维护和升级

---

## 测试过程与错误处理

### 测试案例对比

#### TEST002（不推荐）

- ✅ 配置创建成功
- ❌ SITEID/ORGID 使用手动定义的类型（UPPER, 8）
- ⚠️ 不推荐作为模板

#### TEST003（推荐）✅

- ✅ 配置创建成功
- ✅ SITEID/ORGID 正确使用 SAMEAS 引用
- ✅ 包含21个字段（2个系统字段 + 19个业务字段）
- ✅ 推荐作为标准模板

---

### 常见错误及解决方案

#### 错误 1: JSON 解析错误

**错误信息**: `Unexpected character '\\' on line 1, column 2`

**原因**: PowerShell 中直接在命令行使用 JSON 字符串会导致转义问题

**解决方案**: 使用 JSON 文件并通过 `--data-binary @filename.json` 方式传递

---

#### 错误 2: BMXAA0586E - Site-level objects must have a persistent attribute named SITEID

**原因**: SITE 层级对象缺少 SITEID 字段

**解决方案**: 添加 SITEID 字段并使用 SAMEAS 引用

```json
{
  "attributename": "SITEID",
  "sameasobject": "SITE",
  "sameasattribute": "SITEID",
  "required": true,
  "persistent": true
}
```

---

#### 错误 3: BMXAA0585E - Organization-level objects must have a persistent attribute named ORGID

**原因**: SITE 层级对象缺少 ORGID 字段

**解决方案**: 添加 ORGID 字段并使用 SAMEAS 引用

```json
{
  "attributename": "ORGID",
  "sameasobject": "ORGANIZATION",
  "sameasattribute": "ORGID",
  "required": true,
  "persistent": true
}
```

---

#### 错误 4: BMXAA0687E - Entity Name must be specified when the object is persistent

**原因**: 持久化对象缺少 entityname

**解决方案**: 添加 entityname 字段（通常与 objectname 相同）

```json
{
  "objectname": "TEST003",
  "entityname": "TEST003",
  "persistent": 1
}
```

---

#### 错误 5: BMXAA0711E - A table or view with this name already exists

**原因**: 对象名已存在

**解决方案**: 
1. 使用新的对象名（如 TEST004）
2. 或删除现有配置后重新创建

---

## 最佳实践

### 1. SITEID 和 ORGID 必须使用 SAMEAS

```json
// ✅ 正确
{
  "attributename": "SITEID",
  "sameasobject": "SITE",
  "sameasattribute": "SITEID"
}

// ❌ 错误
{
  "attributename": "SITEID",
  "maxtype": "UPPER",
  "length": 8
}
```

**原因**: 
- SAMEAS 确保字段类型与标准对象完全一致
- 自动继承标准字段的属性（长度、验证规则等）
- 符合 Maximo 最佳实践
- 便于系统维护和升级

---

### 2. 始终使用 JSON 文件

在 PowerShell 中使用 curl.exe 时：
- ❌ 不要直接在命令行中写 JSON 字符串（转义问题）
- ✅ 使用 JSON 文件并通过 `@filename.json` 传递

---

### 3. 命名规范

- **对象名**: 以 `IBM_` 开头，英文大写，长度≤30字符
- **字段名**: 英文大写，简洁缩写，长度≤50字符
- **主键**: XXXNUM 格式（如 ITEMNUM、BIDNUM）
- **测试编号**: 使用 TEST001-TEST999 进行测试

---

### 4. 不同层级对象的配置

#### SYSTEM 层级（系统级对象）

不需要 SITEID 和 ORGID：

```json
{
  "objectname": "IBM_SYSTEM_OBJ",
  "entityname": "IBM_SYSTEM_OBJ",
  "siteorgtype": "SYSTEM",
  "persistent": 1
}
```

#### ORG 层级（组织级对象）

只需要 ORGID：

```json
{
  "objectname": "IBM_ORG_OBJ",
  "entityname": "IBM_ORG_OBJ",
  "siteorgtype": "ORG",
  "persistent": 1,
  "maxattributecfg": [
    {
      "attributename": "ORGID",
      "sameasobject": "ORGANIZATION",
      "sameasattribute": "ORGID",
      "required": true,
      "persistent": true
    }
  ]
}
```

#### SITE 层级（站点级对象）✅ 最常用

必须包含 SITEID 和 ORGID，且都使用 SAMEAS。

---

### 5. 测试流程

1. 创建配置 → 2. 验证配置 → 3. 应用配置变更 → 4. 验证物理表

**应用配置变更**: 需要在 Maximo 管理界面手动执行

---

## 验证清单

创建对象配置后，验证以下项目：

- [ ] objectname 和 entityname 已设置
- [ ] siteorgtype 设置为 SITE（或其他适当值）
- [ ] persistent 设置为 1
- [ ] SITEID 字段已添加且使用 SAMEAS
- [ ] ORGID 字段已添加且使用 SAMEAS
- [ ] 主键字段已定义且 required=true
- [ ] DECIMAL 类型字段已指定 scale
- [ ] LONGALN 类型字段 persistent=false
- [ ] 所有字段都有 remarks 说明
- [ ] 使用 JSON 文件传递配置（避免转义问题）

---

## 下一步操作

### 应用配置变更

⚠️ **重要**: 配置创建后，需要在 Maximo 管理界面执行"应用配置变更"操作：

1. 登录 Maximo 管理员账户
2. 进入"数据库配置"应用程序
3. 点击"应用配置变更"按钮
4. 等待配置应用完成
5. 验证物理表已创建

### 验证物理表

应用配置变更后，可以通过 SQL 查询验证：

```sql
SELECT * FROM TEST003 WHERE 1=0;
```

---

## 参考资源

### 相关文档

- **SKILL 文档**: `.lingma/skills/maximo-dbconfig-api/SKILL.md`
- **原始测试报告**: `TESTDB/TEST/TEST002_TEST_REPORT.md`
- **最佳实践**: `TESTDB/TEST/TEST003_BEST_PRACTICE.md`
- **JSON 模板**: `TESTDB/TEST/test002_create.json`

### Maximo 官方资源

- Maximo 数据字典文档
- Maximo 官方 API 文档
- Maximo 数据库配置指南

---

## 总结

### 核心要点

1. ✅ **SITE 层级对象是主流**: siteorgtype 基本上都设置为 SITE
2. ✅ **SAMEAS 是必须的**: SITEID 和 ORGID 必须使用 SAMEAS 引用
3. ✅ **使用 JSON 文件**: 避免 PowerShell 转义问题
4. ✅ **应用配置变更**: 配置创建后需要手动应用
5. ✅ **测试编号**: 使用 TEST001-TEST999 进行测试

### TEST003 配置总结

- ✅ 配置创建成功
- ✅ 包含21个字段（2个系统字段 + 19个业务字段）
- ✅ SITEID 和 ORGID 正确使用 SAMEAS 引用
- ✅ 符合 Maximo SITE 层级对象规范
- ✅ API 调用流程和错误处理已验证
- ✅ 推荐作为标准模板

### 建议

下次创建新表时，可以直接参考本文档中的 TEST003 JSON 模板，确保：
- SITEID 和 ORGID 使用 SAMEAS 引用
- 使用 JSON 文件传递配置
- 遵循命名规范
- 完成验证清单中的所有项目

---

**最后更新**: 2026-05-18  
**版本**: 1.0  
**基于测试**: TEST002/TEST003
