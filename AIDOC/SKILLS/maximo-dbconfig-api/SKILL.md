---
name: maximo-dbconfig-api
description: Maximo 数据库配置 API 技能，用于通过 REST API 管理 Maximo 数据字典元数据。当需要通过 API 创建、查询、更新或删除业务对象配置时使用此技能。
version: 1.0.0
tags: [maximo, database, configuration, api, rest]
---

# Maximo 数据库配置 API 技能

## 概述

本 SKILL 提供通过 Maximo REST API 进行数据库配置操作的完整指南。基于实际测试验证，包含最佳实践和常见错误处理。

**核心原则**: 
- SITE 层级对象（siteorgtype=SITE）是 Maximo 实施中最常用的配置
- SITEID 和 ORGID 必须使用 SAMEAS 引用标准对象
- 所有配置变更需要执行"应用配置变更"才能生效到物理数据库

---

## 认证方式

### API Key 认证（推荐）

```bash
--header "apiKey: YOUR_API_KEY"
```

### Session Cookie 认证

```bash
--header "Cookie: JSESSIONID=YOUR_SESSION_ID"
```

---

## 核心 API 端点

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

### 完整示例：创建零件管理表

```bash
curl.exe --request POST \
  --url "http://localhost:9080/maximo/api/os/MXOBJECTCFG?lean=1" \
  --header "Accept: */*" \
  --header "Content-Type: application/json" \
  --header "Cookie: JSESSIONID=YOUR_SESSION_ID" \
  --header "apiKey: YOUR_API_KEY" \
  --data-binary "@config.json"
```

**config.json**:
```json
{
  "objectname": "TEST003",
  "entityname": "TEST003",
  "description": "零件管理表",
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
      "attributename": "DESCRIPTION",
      "columnname": "DESCRIPTION",
      "maxtype": "ALN",
      "length": 100,
      "required": false,
      "persistent": true,
      "remarks": "描述"
    }
  ]
}
```

**预期响应**: 201 Created，返回新创建的对象配置

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

---

## 更新对象配置

### 使用 PATCH 方法

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
- URL 不能加 `?lean=1`（会导致静默失败）

---

## 删除对象配置

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
- 自动继承标准字段的完整定义
- 确保类型、长度、验证规则一致
- 便于维护和升级

---

## 常见错误及解决方案

### 错误 1: BMXAA0586E - Site-level objects must have a persistent attribute named SITEID

**原因**: SITE 层级对象缺少 SITEID 字段

**解决**: 添加 SITEID 字段并使用 SAMEAS 引用

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

### 错误 2: BMXAA0585E - Organization-level objects must have a persistent attribute named ORGID

**原因**: SITE 层级对象缺少 ORGID 字段

**解决**: 添加 ORGID 字段并使用 SAMEAS 引用

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

### 错误 3: BMXAA0687E - Entity Name must be specified when the object is persistent

**原因**: 持久化对象缺少 entityname

**解决**: 添加 entityname 字段（通常与 objectname 相同）

```json
{
  "objectname": "TEST003",
  "entityname": "TEST003",
  "persistent": 1
}
```

---

### 错误 4: BMXAA0711E - A table or view with this name already exists

**原因**: 对象名已存在

**解决**: 
1. 使用新的对象名（如 TEST004）
2. 或删除现有配置后重新创建

---

### 错误 5: JSON 解析错误

**原因**: PowerShell 中直接传递 JSON 字符串导致转义问题

**解决**: 使用 JSON 文件并通过 `@filename.json` 传递

```bash
curl.exe --data-binary "@config.json" ...
```

---

## 最佳实践

### 1. 始终使用 JSON 文件

在 PowerShell 中使用 curl.exe 时：
- ❌ 不要直接在命令行中写 JSON 字符串
- ✅ 使用 JSON 文件并通过 `@filename.json` 传递

---

### 2. SITEID 和 ORGID 必须使用 SAMEAS

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

---

### 3. 命名规范

- **对象名**: 以 `IBM_` 开头，英文大写，长度≤30字符
- **字段名**: 英文大写，简洁缩写，长度≤50字符
- **主键**: XXXNUM 格式（如 ITEMNUM、BIDNUM）

---

### 4. 测试流程

1. 创建配置 → 2. 验证配置 → 3. 应用配置变更 → 4. 验证物理表

**应用配置变更**: 需要在 Maximo 管理界面手动执行

---

### 5. 使用测试编号

建议使用 TEST001-TEST999 进行测试，避免影响生产数据：
- TEST001, TEST002, TEST003... 依次递增
- 删除配置不会删除物理表，可以重复使用

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

---

## 工具脚本

### PowerShell 验证脚本

```powershell
# 查询对象配置
$objectName = "TEST003"
$encodedId = '_' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($objectName))

curl.exe --request GET `
  --url "http://localhost:9080/maximo/api/os/MXOBJECTCFG/$encodedId?lean=1" `
  --header "Accept: */*" `
  --header "Cookie: JSESSIONID=YOUR_SESSION_ID" `
  --header "apiKey: YOUR_API_KEY" | `
  ConvertFrom-Json | `
  Select-Object -ExpandProperty maxattributecfg | `
  Select-Object attributename, maxtype, sameasobject, sameasattribute, length, required | `
  Format-Table -AutoSize
```

---

## 参考资源

- **测试报告**: `TESTDB/TEST/TEST002_TEST_REPORT.md`
- **最佳实践**: `TESTDB/TEST/TEST003_BEST_PRACTICE.md`
- **JSON 模板**: `TESTDB/TEST/test002_create.json`
- **Maximo 数据字典文档**
- **Maximo 官方 API 文档**

---

## 版本历史

- v1.0.0 (2026-05-18) - 初始版本，基于实际测试验证
  - 包含完整的 CRUD 操作示例
  - 强调 SITEID/ORGID 必须使用 SAMEAS
  - 提供常见错误解决方案
  - 包含最佳实践和验证清单
