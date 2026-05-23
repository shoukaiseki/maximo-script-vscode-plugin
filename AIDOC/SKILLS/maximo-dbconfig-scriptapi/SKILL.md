---
name: maximo-dbconfig-scriptapi
description: Maximo 数据库配置脚本 API 技能,用于通过 SHARPTREE.AUTOSCRIPT.LIBRARY API 管理 Maximo 数据字典元数据。当需要通过编程方式创建、更新或删除业务对象配置时使用此技能。
---

# Maximo 数据库配置脚本 API 技能

## 概述

本技能指导如何使用 `SHARPTREE.AUTOSCRIPT.LIBRARY` Autoscript 提供的 REST API 接口来管理 Maximo 数据库配置(MAXOBJECTCFG)。相比 OSLC API,这个接口支持更多的配置选项,更加灵活和强大。

**核心优势**:
- ✅ 支持完整的 MAXOBJECTCFG 属性配置
- ✅ 完全支持子表操作(attributes、indexes、relationships)
- ✅ 可以动态添加/删除字段
- ✅ 支持批量操作(一次处理多个对象)
- ✅ 索引和关系管理

---

## API 端点与新增参数

### 基础端点

```
POST http://<server>:<port>/maximo/api/script/SHARPTREE.AUTOSCRIPT.LIBRARY?develop=true
```

### 新增控制参数

API 支持两个额外的查询参数，用于精细控制配置部署：

| 参数 | 说明 | 使用场景 |
|------|------|----------|
| `ignoreRelationships=true` | 忽略 relationships 配置 | 只创建表结构和字段，不创建关系 |
| `ignoreAttributes=true` | 忽略 attributes 配置 | 只创建关系，不修改字段 |

**典型使用流程**：

1. **第一步**：创建表结构（忽略关系）
   ```
   POST /maximo/api/script/SHARPTREE.AUTOSCRIPT.LIBRARY?develop=true&ignoreRelationships=true
   ```

2. **第二步**：创建关系（表已存在）
   ```
   POST /maximo/api/script/SHARPTREE.AUTOSCRIPT.LIBRARY?develop=true&ignoreAttributes=true
   ```

这样可以避免"子对象不存在"的错误，实现分步部署。

### 必需请求头

```
Content-Type: application/json
apiKey: <your-api-key>
Cookie: JSESSIONID=<session-id>
```

### 开发模式

URL 中的 `?develop=true` 参数启用开发模式,提供更详细的错误信息。在生产环境中应移除此参数。

---

## 数据结构

### 顶层结构

```json
{
  "maxObjects": [
    {
      "object": "对象名称",
      "description": "描述",
      "persistent": true,
      "addRowstamp": true,
      "attributes": [],
      "indexes": [],
      "relationships": []
    }
  ]
}
```

---

## MaxObject 属性详解

### 基本属性

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `object` | String | ✅ | - | 对象名称(唯一标识) |
| `description` | String | ❌ | "" | 对象描述 |
| `service` | String | ❌ | null | 服务名称 |
| `entity` | String | ❌ | null | 实体名称 |
| `className` | String | ❌ | null | Java 类名 |
| `extendsObject` | String | ❌ | null | 继承的对象名称 |
| `level` | String | ❌ | null | 层级类型(SITEORGTYPE) |
| `triggerRoot` | String | ❌ | null | 触发器根对象 |
| `textDirection` | String | ❌ | null | 文本方向 |
| `mainObject` | Boolean | ❌ | false | 是否为主对象 |
| `persistent` | Boolean | ❌ | true | 是否持久化(有对应数据库表) |
| `storagePartition` | String | ❌ | null | 存储分区 |
| `uniqueColumn` | String | ❌ | null | 唯一列名 |
| `languageTable` | String | ❌ | null | 语言表名 |
| `languageColumn` | String | ❌ | null | 语言列名 |
| `alternateIndex` | String | ❌ | null | 备用索引名 |
| `addRowstamp` | Boolean | ❌ | true | 是否添加 ROWSTAMP 列 |
| `textSearchEnabled` | Boolean | ❌ | false | 是否启用文本搜索 |
| `view` | Boolean | ❌ | false | 是否为视图 |
| `viewWhere` | String | ❌ | null | 视图 WHERE 条件 |
| `joinToObject` | String | ❌ | null | 连接到的对象 |
| `automaticallySelect` | Boolean | ❌ | true | 是否自动选择 |
| `viewSelect` | String | ❌ | null | 视图 SELECT 语句 |
| `viewFrom` | String | ❌ | null | 视图 FROM 子句 |
| `auditEnabled` | Boolean | ❌ | false | 是否启用审计 |
| `auditTable` | String | ❌ | null | 审计表名 |
| `eAuditFilter` | String | ❌ | null | 电子审计过滤器 |
| `eSignatureFilter` | String | ❌ | null | 电子签名过滤器 |

### 特殊属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `delete` | Boolean | 设置为 `true` 时删除该对象 |

---

## Attribute 属性详解

### 基本属性

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `attribute` | String | ✅ | - | 字段名称(唯一标识) |
| `description` | String | ✅ | - | 字段描述(REMARKS) |
| `title` | String | ✅ | - | 字段标题 |
| `type` | String | ❌ | null | 数据类型(ALN, INTEGER, DATE, DECIMAL, etc.) |
| `length` | Integer | ❌ | - | 字段长度 |
| `scale` | Integer | ❌ | - | 小数位数(用于 DECIMAL 类型) |
| `class` | String | ❌ | null | Java 类名 |
| `required` | Boolean | ❌ | false | 是否必填 |
| `defaultValue` | String | ❌ | null | 默认值 |
| `domain` | String | ❌ | null | 域 ID |
| `alias` | String | ❌ | null | 别名 |
| `persistent` | Boolean | ❌ | true | 是否持久化 |
| `mustBe` | Boolean | ❌ | false | MUSTBE 标志 |
| `column` | String | ❌ | null | 数据库列名 |
| `sameAsObject` | String | ❌ | null | 引用对象名称 |
| `sameAsAttribute` | String | ❌ | null | 引用字段名称 |
| `canAutonumber` | Boolean | ❌ | false | 是否可自动编号 |
| `autonumber` | String | ❌ | null | 自动编号序列名 |
| `searchType` | String | ❌ | null | 搜索类型 |
| `localizable` | Boolean | ❌ | false | 是否可本地化 |
| `textDirection` | String | ❌ | null | 文本方向 |
| `positive` | Boolean | ❌ | false | 是否必须为正数 |
| `longDescriptionOwner` | Boolean | ❌ | false | 是否为长描述所有者 |
| `sequenceName` | String | ❌ | null | 序列名称 |

### 特殊属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `delete` | Boolean | 设置为 `true` 时删除该字段 |
| `maximoDefault` | String | Maximo 默认值表达式，支持系统变量如 `%SYSDATE%`(当前时间) 和 `&PERSONID&`(当前用户ID) |

### sameAs 引用字段的注意事项

**重要规则**：当字段设置了 `sameAsObject` 和 `sameAsAttribute` 时，**不应该再指定 `type` 和 `length`**。

原因：
- 系统会自动从等同对象继承字段类型和长度
- 手动指定 `type` 和 `length` 可能会覆盖正确的类型定义，导致冲突
- 保持配置简洁，让系统自动处理类型继承

**正确示例**：
```json
{
  "attribute": "SITEID",
  "description": "站点ID",
  "title": "站点",
  "sameAsObject": "SITE",
  "sameAsAttribute": "SITEID",
  "required": true,
  "persistent": true
}
```

**错误示例**（不要这样做）：
```json
{
  "attribute": "SITEID",
  "description": "站点ID",
  "title": "站点",
  "type": "UPPER",      // ❌ 不应该指定
  "length": 8,          // ❌ 不应该指定
  "sameAsObject": "SITE",
  "sameAsAttribute": "SITEID"
}
```

### 文本字段搜索类型

对于所有 `UPPER` 和 `ALN` 类型的字段，建议设置 `searchType: "WILDCARD"` 以支持通配符搜索：

```json
{
  "attribute": "PARTNUM",
  "description": "零件编号",
  "title": "零件编号",
  "type": "UPPER",
  "length": 50,
  "searchType": "WILDCARD"
}
```

### SITEID 和 ORGID 的特殊要求

对于 SITE 层级对象，必须在 attributes 数组中包含 SITEID 和 ORGID 字段，并使用 SAMEAS 引用：

```json
{
  "attribute": "SITEID",
  "description": "Site ID",
  "title": "Site",
  "sameAsObject": "SITE",
  "sameAsAttribute": "SITEID",
  "required": true,
  "persistent": true
},
{
  "attribute": "ORGID",
  "description": "Organization ID",
  "title": "Organization",
  "sameAsObject": "ORGANIZATION",
  "sameAsAttribute": "ORGID",
  "required": true,
  "persistent": true
}
```

**注意**：不要为这些字段指定 `type` 和 `length`，系统会自动从 SITE 和 ORGANIZATION 对象继承。

### 审计字段配置规范

每个表都应该包含以下审计字段：

**CREATEPERSON（创建人）**：
```json
{
  "attribute": "CREATEPERSON",
  "description": "创建人",
  "title": "创建人",
  "sameAsObject": "PERSON",
  "sameAsAttribute": "PERSONID",
  "maximoDefault": "&PERSONID&",
  "searchType": "WILDCARD"
}
```

**CREATETIME（创建时间）**：
```json
{
  "attribute": "CREATETIME",
  "description": "创建时间",
  "title": "创建时间",
  "type": "DATETIME",
  "length": 10,
  "maximoDefault": "%SYSDATE%"
}
```

**注意**：
- CREATEPERSON 使用 `maximoDefault: "&PERSONID&"` 自动填充当前用户ID
- CREATETIME 使用 `maximoDefault: "%SYSDATE%"` 自动填充当前时间
- CREATEPERSON 应该设置 `searchType: "WILDCARD"` 以便搜索
- CREATETIME 类型为 DATETIME，不需要设置 sameAs 引用

---

## Index 属性详解

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `index` | String | ✅ | 索引名称 |
| `columns` | Array | ❌ | 索引包含的字段列表 |
| `unique` | Boolean | ❌ | 是否唯一索引 |
| `clustered` | Boolean | ❌ | 是否聚集索引 |
| `delete` | Boolean | ❌ | 设置为 `true` 时删除该索引 |

---

## Relationship 属性详解

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `relationship` | String | ✅ | 关系名称 |
| `child` | String | ✅* | 子对象名称 |
| `whereClause` | String | ❌ | WHERE 条件 |
| `cardinality` | String | ❌ | 基数(ONE_TO_MANY, MANY_TO_ONE, etc.) |
| `delete` | Boolean | ❌ | 设置为 `true` 时删除该关系 |

*注:如果设置了 `delete=true`,则 `child` 不是必填的。

---

## 使用示例

### 示例 1:创建新对象

```bash
curl --request POST \
  --url 'http://localhost:9080/maximo/api/script/SHARPTREE.AUTOSCRIPT.LIBRARY?develop=true' \
  --header 'Content-Type: application/json' \
  --header 'apiKey: erg8n2vk6pcu9ou1cr61jag49qdmjuk65ac6l1q0' \
  --header 'Cookie: JSESSIONID=0000keD8mRTSpwUCsCbXXCOSuqO:91c32a7f-3901-4ddd-ac1e-80fa1d3cad6f' \
  --data '{
  "maxObjects": [
    {
      "object": "TEST001",
      "description": "My Custom Database Object",
      "persistent": true,
      "addRowstamp": true,
      "attributes": [
        {
          "attribute": "DESCRIPTION",
          "description": "Description of the item",
          "title": "Description",
          "type": "ALN",
          "length": 100
        },
        {
          "attribute": "NAME",
          "description": "Name of the item",
          "title": "Name",
          "type": "ALN",
          "length": 120
        },
        {
          "attribute": "STATUS",
          "description": "Status of the item",
          "title": "Status",
          "type": "ALN",
          "length": 20,
          "defaultValue": "ACTIVE"
        }
      ]
    }
  ]
}'
```

### 示例 2:创建 SITE 层级对象(包含 SITEID 和 ORGID)

```json
{
  "maxObjects": [
    {
      "object": "CUSTOMOBJ",
      "description": "Custom Site-level Object",
      "persistent": true,
      "addRowstamp": true,
      "level": "SITE",
      "attributes": [
        {
          "attribute": "SITEID",
          "description": "Site ID",
          "title": "Site",
          "sameAsObject": "SITE",
          "sameAsAttribute": "SITEID",
          "required": true,
          "persistent": true
        },
        {
          "attribute": "ORGID",
          "description": "Organization ID",
          "title": "Organization",
          "sameAsObject": "ORGANIZATION",
          "sameAsAttribute": "ORGID",
          "required": true,
          "persistent": true
        },
        {
          "attribute": "CREATEPERSON",
          "description": "创建人",
          "title": "创建人",
          "sameAsObject": "PERSON",
          "sameAsAttribute": "PERSONID",
          "maximoDefault": "&PERSONID&",
          "searchType": "WILDCARD"
        },
        {
          "attribute": "CREATETIME",
          "description": "创建时间",
          "title": "创建时间",
          "type": "DATETIME",
          "length": 10,
          "maximoDefault": "%SYSDATE%"
        },
        {
          "attribute": "CUSTOMFIELD",
          "description": "Custom Field",
          "title": "Custom",
          "type": "ALN",
          "length": 100,
          "searchType": "WILDCARD"
        }
      ]
    }
  ]
}
```

**关键点**：
- SITEID 和 ORGID 使用 sameAs 引用，不指定 type 和 length
- CREATEPERSON 使用 maximoDefault="&PERSONID&" 自动填充
- CREATETIME 使用 maximoDefault="%SYSDATE%" 自动填充
- 文本字段添加 searchType="WILDCARD" 支持模糊搜索

### 示例 3:更新现有对象(添加字段)

```json
{
  "maxObjects": [
    {
      "object": "TEST001",
      "description": "Updated description",
      "attributes": [
        {
          "attribute": "NEW_FIELD",
          "description": "New field added via API",
          "title": "New Field",
          "type": "INTEGER",
          "required": false
        }
      ]
    }
  ]
}
```

### 示例 4:删除字段

```json
{
  "maxObjects": [
    {
      "object": "TEST001",
      "attributes": [
        {
          "attribute": "OLD_FIELD",
          "delete": true
        }
      ]
    }
  ]
}
```

### 示例 5:删除整个对象

```json
{
  "maxObjects": [
    {
      "object": "TEST001",
      "delete": true
    }
  ]
}
```

### 示例 6:完整配置(包含索引、关系和审计字段)

```json
{
  "maxObjects": [
    {
      "object": "CUSTOMASSET",
      "description": "Custom Asset Object",
      "persistent": true,
      "addRowstamp": true,
      "level": "SITE",
      "extendsObject": "ASSET",
      "attributes": [
        {
          "attribute": "SITEID",
          "description": "Site ID",
          "title": "Site",
          "sameAsObject": "SITE",
          "sameAsAttribute": "SITEID",
          "required": true,
          "persistent": true
        },
        {
          "attribute": "ORGID",
          "description": "Organization ID",
          "title": "Organization",
          "sameAsObject": "ORGANIZATION",
          "sameAsAttribute": "ORGID",
          "required": true,
          "persistent": true
        },
        {
          "attribute": "CREATEPERSON",
          "description": "创建人",
          "title": "创建人",
          "sameAsObject": "PERSON",
          "sameAsAttribute": "PERSONID",
          "maximoDefault": "&PERSONID&",
          "searchType": "WILDCARD"
        },
        {
          "attribute": "CREATETIME",
          "description": "创建时间",
          "title": "创建时间",
          "type": "DATETIME",
          "length": 10,
          "maximoDefault": "%SYSDATE%"
        },
        {
          "attribute": "CUSTOMFIELD1",
          "description": "Custom Field 1",
          "title": "Custom 1",
          "type": "ALN",
          "length": 50,
          "searchType": "WILDCARD"
        },
        {
          "attribute": "CUSTOMFIELD2",
          "description": "Custom Field 2",
          "title": "Custom 2",
          "type": "DECIMAL",
          "length": 15,
          "scale": 2
        }
      ],
      "indexes": [
        {
          "index": "IX_CUSTOMFIELD1",
          "columns": ["CUSTOMFIELD1"],
          "unique": false
        }
      ],
      "relationships": [
        {
          "relationship": "CUSTOMREL",
          "child": "WORKORDER",
          "whereClause": "assetnum = :assetnum and siteid = :siteid"
        }
      ]
    }
  ]
}
```

---

## 与 OSLC API 的对比

| 特性 | Autoscript Library API | OSLC API (MXOBJECTCFG) |
|------|----------------------|----------------------|
| **灵活性** | ⭐⭐⭐⭐⭐ 非常高 | ⭐⭐ 较低 |
| **支持的属性** | 全部 MAXOBJECTCFG 属性 | 仅部分属性 |
| **子表更新** | ✅ 完全支持 | ❌ 受限(只能修改 maxtype/length/scale) |
| **索引管理** | ✅ 支持 | ❌ 不支持 |
| **关系管理** | ✅ 支持 | ❌ 不支持 |
| **批量操作** | ✅ 支持多个对象 | ⚠️ 每次一个对象 |
| **错误处理** | 详细的 JavaScript 错误 | HTTP 状态码 |
| **复杂度** | 中等(需要理解 JS) | 简单(标准 REST) |
| **适用场景** | 开发环境、自动化部署 | 简单的元数据查询 |

---

## 注意事项

### 1. 必填字段验证

对于每个 attribute,以下字段是**必填**的:
- `attribute`:字段名称
- `description`:字段描述
- `title`:字段标题

如果缺少这些字段,API 会抛出错误。

### 2. 只读字段

某些字段在对象创建后变为只读,无法通过 API 修改:
- `OBJECTNAME`(对象名称)
- `PERSISTENT`(持久化标志)
- `ADDROWSTAMP`(行戳标志)
- 某些字段的 `MAXTYPE`(数据类型)

### 3. 事务处理

所有操作在一个事务中执行。如果任何一步失败,整个操作会回滚。

### 4. 性能考虑

- 创建大量对象时,建议分批进行
- 每次请求最多处理 10-20 个对象
- 避免在单个请求中包含过多的 attributes/indexes/relationships

### 5. 开发模式

URL 中的 `?develop=true` 参数启用开发模式,提供更详细的错误信息。在生产环境中应移除此参数。

---

## 常见错误

### 错误 1:缺少必填字段

```json
{
  "error": "The description property is required for each attribute"
}
```

**解决**:确保每个 attribute 都有 `description` 和 `title` 字段。

### 错误 2:对象已存在

如果尝试创建已存在的对象,系统会自动更新它而不是报错。

### 错误 3:字段类型不兼容

```json
{
  "error": "Cannot change MAXTYPE from ALN to INTEGER"
}
```

**解决**:某些字段类型变更不被允许。需要先删除字段再重新创建。

### 错误 4:缺少 SITEID/ORGID

```json
{
  "error": "BMXAA0586E - Site-level objects must have a persistent attribute named SITEID."
}
```

**解决**:对于 SITE 层级对象,必须在 attributes 数组中包含 SITEID 和 ORGID 字段,并使用 SAMEAS 引用。

---

## 最佳实践

1. **先查询后更新**:在更新对象前,先查询当前配置,避免覆盖重要设置
2. **版本控制**:将对象配置保存在 Git 中,便于追踪变更
3. **测试环境验证**:先在测试环境验证配置,再应用到生产环境
4. **备份配置**:在进行大规模变更前,导出现有配置作为备份
5. **使用模板**:为常用对象类型创建 JSON 模板,提高开发效率
6. **SITEID/ORGID 配置**:对于 SITE 层级对象,始终使用 SAMEAS 引用，不要指定 type 和 length
7. **审计字段**:每个表都添加 CREATEPERSON 和 CREATETIME 字段，使用 maximoDefault 自动填充
8. **搜索优化**:为所有 UPPER 和 ALN 类型字段添加 searchType: "WILDCARD"
9. **sameAs 引用**:引用其他对象字段时，不要指定 type 和 length，让系统自动继承
10. **预留扩展字段**:创建对象时预留足够的扩展字段(IN1-IN30)
11. **分步部署**:使用 ignoreRelationships 和 ignoreAttributes 参数分步部署表和关系
12. **系统表描述保护**:对于 Maximo 系统已有表（如 LOCATIONS、ITEM、WORKORDER 等），**不要修改 description 字段**，只添加新字段。修改系统表的描述可能会影响系统的其他功能或文档。

**如何查询系统表的原始描述**：
```sql
SELECT objectname, description FROM maxobjectcfg WHERE objectname='LOCATIONS'
```

**正确示例**（为系统表添加字段）：
```json
{
  "object": "LOCATIONS",
  "description": "The Locations Table",  // 保持原样，通过 SQL 查询获得
  "attributes": [
    {"attribute": "IBM_STOREROOMCATEGORY", ...}
  ]
}
```

**错误示例**（不要这样做）：
```json
{
  "object": "LOCATIONS",
  "description": "位置表",  // ❌ 不要修改系统表的描述
  "attributes": [...]
}
```

---

## 参考资源

- **源代码位置**:`E:\gitwork\maximo-script-manager\public\maximo-developer-resources\sharptree.autoscript.library.js`
- **相关函数**:
  - `deployMaxObjects()` - 第 2666 行
  - `addOrUpdateMaxObject()` - 第 2684 行
  - `MaxObject` 构造函数 - 第 2040 行
  - `MaxObject.prototype.setMboValues()` - 第 2121 行
- **详细文档**:`TESTDB/AUTOSCRIPT_LIBRARY_DB_API.md`

---

## 总结

Autoscript Library API 提供了比 OSLC API 更强大、更灵活的数据库对象管理能力。它支持:

- ✅ 完整的 MAXOBJECTCFG 属性配置
- ✅ 动态添加/删除字段
- ✅ 索引管理
- ✅ 关系管理
- ✅ 批量操作

**推荐使用场景**:
- 开发环境中的快速原型设计
- CI/CD 管道中的自动化部署
- 复杂的数据库 schema 变更
- 需要精细控制的元数据管理

**不推荐使用场景**:
- 简单的元数据查询(使用 OSLC API 更简单)
- 生产环境的紧急修复(使用 Maximo 管理界面更安全)
