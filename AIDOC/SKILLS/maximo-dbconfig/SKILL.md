---
name: maximo-dbconfig
description: Maximo 数据库配置技能，用于正确配置 Maximo 数据字典元数据。当需要创建新业务对象、定义字段属性或建立对象关系时使用此技能。
---

# Maximo 数据库配置技能

## 概述

Maximo 的数据库配置体系基于三张核心元数据表：MAXOBJECT（对象定义）、MAXATTRIBUTE（字段定义）和 MAXRELATIONSHIP（对象关系）。配置变更通过 CFG 暂存表管理，需执行"应用配置变更"才能生效到物理数据库。

## 核心元数据表

### 1. MAXOBJECT - 对象/实体定义

**用途**: 定义 Maximo 中的业务对象（MBO），对应底层物理表或视图。

**关键字段**:
- `OBJECTNAME`: 对象唯一内部名称（如 ASSET、WORKORDER）
- `DESCRIPTION`: 对象描述信息
- `SITEORGTYPE`: 对象层级（SYSTEM/SITE/ORG），决定是否需要 SITEID/ORGID
- `PERSISTENT`: 是否为持久化对象（对应物理表）
- `ISAUDITENABLED`: 是否启用审计
- `HASLD`: 是否拥有长描述字段

**配置示例**:
```sql
-- 创建新的业务对象
INSERT INTO MAXOBJECT (OBJECTNAME, DESCRIPTION, SITEORGTYPE, PERSISTENT, ISAUDITENABLED, HASLD)
VALUES ('IBM_SUPPINVITE', '供应商邀请', 'SITE', 1, 0, 0);
```

### 2. MAXATTRIBUTE - 字段/属性定义

**用途**: 定义对象的具体字段，包括数据类型、长度、值域引用等。

**关键字段**:
- `OBJECTNAME`: 所属对象名
- `ATTRIBUTENAME`: 字段内部名
- `COLUMNNAME`: 底层数据库物理列名
- `MAXTYPE`: 数据类型（详见下方 MAXTYPE 完整类型清单）
- `LENGTH`: 字段长度
- `SCALE`: 小数位数（仅 DECIMAL/AMOUNT/FLOAT 类型需要）
- `SAMEASOBJECT`: 参照的源对象（用于类型继承）
- `SAMEASATTRIBUTE`: 参照的源字段（用于类型继承）
- `REQUIRED`: 是否必填
- `PERSISTENT`: 是否持久化到数据库
- `DOMAINID`: 关联的值域名称

**字段长度选择原则**:
- **不确定长度的文本字段**: 统一使用 **50** 作为默认长度
  - 示例: 名称、代码、编号等不确定的字符串 → `ALN(50)` 或 `UPPER(50)`
- **确定长度的字段**: 根据实际需求设置
  - 示例: 电话号码 → `ALN(30)`, 地址 → `ALN(255)`, 备注 → `ALN(255)`
- **长文本**: 超过 255 字符时使用 `ALN(500)` 或更大

### MAXTYPE 完整类型清单

#### 一、数值型（NUMERIC）

| MAXTYPE | 说明 | 常用场景 |
|---------|------|----------|
| INTEGER | 整型 | 计数、序号 |
| SMALLINT | 小整型 | 小范围整数 |
| BIGINT | 大整型 | 大型ID、主键 |
| DECIMAL | 带精度的小数 | 数量、比例（需指定 SCALE） |
| FLOAT | 浮点数 | 科学计算 |
| AMOUNT | 金额（含币种语义） | 价格、成本、费用 |

#### 二、字符型（ALPHANUMERIC）

| MAXTYPE | 说明 | 常用场景 |
|---------|------|----------|
| ALN | 普通字母数字（最常用） | 编码、名称、描述 |
| UPPER | 强制大写字母数字 | 标准化编码、状态码 |
| LOWER | 强制小写字母数字 | 邮箱、URL |
| GL | 总账科目专用格式 | 财务科目 |

#### 三、日期时间型（DATETIME）

| MAXTYPE | 说明 | 常用场景 |
|---------|------|----------|
| DATE | 日期（无时间） | 生效日期、到期日 |
| TIME | 时间（无日期） | 工作时间点 |
| DATETIME | 日期 + 时间 | 创建时间、修改时间 |
| DURATION | 持续时间（以小时为单位） | 工时、工期 |

#### 四、布尔 / 标志型

| MAXTYPE | 说明 | 常用场景 |
|---------|------|----------|
| YORN | 仅允许 Y / N | 开关量、是否类字段 |

#### 五、大字段 / 二进制型

| MAXTYPE | 说明 | 常用场景 |
|---------|------|----------|
| CLOB | 字符大对象 | 超大文本内容 |
| BLOB | 二进制大对象 | 附件、图片 |
| CRYPTO | 加密二进制（可逆） | 密码、敏感信息 |
| CRYPTOX | 加密二进制（不可逆） | 单向加密数据 |

**注意**: LONGALN 类型不在标准类型清单中，如有特殊需求请自行处理。

#### 六、重要注意事项

1. **MAXTYPE ≠ 数据库原生类型**
   - Maximo 会在底层自动映射为 Oracle / DB2 / SQL Server 的物理类型
   
2. **不要随意混用 MAXTYPE**
   - ALN(50) 不要改成 UPPER(50) 再改回 ALN(50)
   - DECIMAL(10,2) 不要直接改成 INTEGER
   - 类型变更可能导致数据丢失或配置失败

3. **加密字段一旦创建，不可回退**
   - CRYPTO/CRYPTOX 类型字段需谨慎使用

4. **LONGALN / CLOB / BLOB 不支持普通索引**
   - 这些大字段类型无法创建标准索引
   - 如需搜索功能，考虑使用全文索引或其他方案

**配置示例**:
```sql
-- 创建主键字段
INSERT INTO MAXATTRIBUTE (OBJECTNAME, ATTRIBUTENAME, COLUMNNAME, MAXTYPE, LENGTH, REQUIRED, PERSISTENT)
VALUES ('IBM_SUPPINVITE', 'SINUM', 'SINUM', 'ALN', 30, 1, 1);

-- 创建标准描述字段
INSERT INTO MAXATTRIBUTE (OBJECTNAME, ATTRIBUTENAME, COLUMNNAME, MAXTYPE, LENGTH, REQUIRED, PERSISTENT)
VALUES ('IBM_SUPPINVITE', 'DESCRIPTION', 'DESCRIPTION', 'ALN', 255, 0, 1);

-- 创建带值域的字段
INSERT INTO MAXATTRIBUTE (OBJECTNAME, ATTRIBUTENAME, COLUMNNAME, MAXTYPE, LENGTH, DOMAINID, REQUIRED, PERSISTENT)
VALUES ('IBM_SUPPINVITE', 'STATUS', 'STATUS', 'ALN', 20, 'INVITESTATUS', 1, 1);

-- 使用 SAMEAS 继承标准字段类型
INSERT INTO MAXATTRIBUTE (OBJECTNAME, ATTRIBUTENAME, COLUMNNAME, MAXTYPE, LENGTH, SAMEASOBJECT, SAMEASATTRIBUTE, REQUIRED, PERSISTENT)
VALUES ('IBM_SUPPINVITE', 'CREATEDATE', 'CREATEDATE', 'DATE', NULL, 'MAXIMO', 'CREATEDATE', 0, 1);
```

### 3. MAXRELATIONSHIP - 对象关系定义

**用途**: 定义对象间的关联关系，相当于预定义的 SQL Join 条件。

**关键字段**:
- `PARENT`: 父对象名（源对象）
- `CHILD`: 子对象名（目标对象）
- `NAME`: 关系唯一标识名
- `WHERECLAUSE`: 核心 SQL 条件片段，支持 :parentattr 绑定父对象字段
- `REMARKS`: 关系备注说明

**配置示例**:
```sql
-- 定义主从表关系
INSERT INTO MAXRELATIONSHIP (PARENT, CHILD, NAME, WHERECLAUSE, REMARKS)
VALUES ('IBM_SUPPINVITE', 'IBM_SUPPINVITELINE', 'INVITELINES', 
        'invitenum = :invitenum and siteid = :siteid', 
        '供应商邀请行项目关系');

-- 定义跨对象引用关系
INSERT INTO MAXRELATIONSHIP (PARENT, CHILD, NAME, WHERECLAUSE, REMARKS)
VALUES ('IBM_SUPPINVITE', 'COMPANIES', 'SUPPLIER', 
        'company = :supplierid and siteid = :siteid', 
        '关联供应商公司信息');
```

## 命名规范

### 表名命名规则

1. **新建业务表**: 以 `IBM_` 开头，英文大写，无下划线，简洁缩写，长度≤30字符
   - 示例: `IBM_SUPPINVITE`, `IBM_BID`, `IBM_BIDLINE`, `IBM_ST`, `IBM_BIDNOTICE`

2. **系统已有表**: 沿用原名，不加前缀，长度≤30字符
   - 示例: `COMPANIES`, `RFQ`, `RFQTERM`, `RFQSTATUS`, `QUOTATIONLINE`

3. **明细表**: 主表名 + LINE，长度≤30字符
   - 示例: `IBM_BIDLINE`, `IBM_STLINE`

4. **重要原则**:
   - ✅ 所有新建表必须以 `IBM_` 开头
   - ❌ 不要创建不带 `IBM_` 前缀的新表

### 字段名命名规则

1. **通用规则**: 英文大写，无下划线，简洁缩写，长度≤50字符

2. **编号主键**: XXXNUM 格式
   - 示例: `SINUM`, `BIDNUM`, `STNUM`, `BNNUM`

3. **外键字段**: 直接引用对方主键名
   - 示例: `RFQNUM`, `BIDNUM`, `STNUM`

4. **标准字段**:
   - 描述: `DESCRIPTION`
   - 创建人: `CREATEBY`, `CREATOR`
   - 修改人: `CHANGEBY`
   - 创建日期: `CREATEDATE`
   - 修改日期: `CHANGEDATE`
   - 状态: `STATUS`

5. **已有表新增字段**: 以 `IBM_` 开头，英文大写，长度≤50字符
   - 示例: `IBM_SINUM`, `IBM_PARTNUMBER`, `IBM_VENDOR`
   - **重要**: 对系统已有表（如 ITEM、ASSET 等）新增字段时，必须加 `IBM_` 前缀

6. **新建表字段**: 直接使用简洁名称，无需 `IBM_` 前缀
   - 示例: `SUPPLIERTERMID`, `ITEMNUM`, `CUSTOMERNAME`
   - **说明**: 因为表名已有 `IBM_` 前缀，字段名可以简洁

## 配置流程

### 1. 设计阶段

1. 确定业务对象名称和层级（SYSTEM/SITE/ORG）
2. 设计字段列表，遵循命名规范
3. 确定字段数据类型和长度
4. 识别需要关联的其他对象
5. 规划值域（Domain）需求

### 2. 配置阶段

1. 在 MAXOBJECTCFG 中创建对象定义
2. 在 MAXATTRIBUTECFG 中创建字段定义
3. 在 MAXRELATIONSHIPCFG 中创建关系定义
4. 验证配置完整性

### 3. 发布阶段

1. 进入管理模式（Admin Mode）
2. 备份数据库
3. 执行"应用配置变更"（Config DB）
4. 验证物理表结构创建成功
5. 退出管理模式

## 最佳实践

### 1. 利用 SAMEAS 规范

自定义字段若业务含义与标准字段相同，务必使用 SAMEASOBJECT/ATTRIBUTE 指向标准字段：

```sql
-- 推荐：使用 SAMEAS 继承标准字段
INSERT INTO MAXATTRIBUTE (OBJECTNAME, ATTRIBUTENAME, COLUMNNAME, MAXTYPE, LENGTH, 
                         SAMEASOBJECT, SAMEASATTRIBUTE, REQUIRED, PERSISTENT)
VALUES ('IBM_CUSTOMOBJ', 'LOCATION', 'LOCATION', 'ALN', 20, 
        'LOCATIONS', 'LOCATION', 0, 1);

-- 不推荐：手动定义相同类型的字段
INSERT INTO MAXATTRIBUTE (OBJECTNAME, ATTRIBUTENAME, COLUMNNAME, MAXTYPE, LENGTH, REQUIRED, PERSISTENT)
VALUES ('IBM_CUSTOMOBJ', 'LOCATION', 'LOCATION', 'ALN', 20, 0, 1);
```

### 2. 关系性能优化

- WHERECLAUSE 中的关联字段必须有索引
- 避免过于复杂的多表嵌套关系
- 确保 :fieldname 绑定符准确对应父对象属性名

```sql
-- 良好的关系定义（确保子表有相应索引）
INSERT INTO MAXRELATIONSHIP (PARENT, CHILD, NAME, WHERECLAUSE)
VALUES ('WORKORDER', 'ASSET', 'ASSETINFO', 
        'assetnum = :assetnum and siteid = :siteid');
```

### 3. 数据安全操作

- 生产环境操作前必须全库备份
- 开启管理模式下踢出其他用户
- 挂起 Cron Task 防止配置中断
- 避免在生产环境直接修改物理表结构

### 4. 字段变更注意事项

- **不可随意缩减**: 已有数据的字段避免减小长度或更改类型
- **谨慎删除**: 删除持久化字段会物理删列，需确认无历史数据依赖
- **类型转换风险**: ALN 转 INT 等类型变更极易导致数据问题

## 常见问题处理

### Q1: 配置变更后物理表未创建？

检查步骤：
1. 确认已执行"应用配置变更"
2. 查看 MAXOBJECTCFG 中 CHANGED 字段状态
3. 检查应用日志中的错误信息
4. 确认数据库连接权限足够

### Q2: 如何添加新字段到现有对象？

```sql
-- 1. 在暂存表中添加字段定义
INSERT INTO MAXATTRIBUTECFG (OBJECTNAME, ATTRIBUTENAME, COLUMNNAME, MAXTYPE, LENGTH, REQUIRED, PERSISTENT, CHANGED)
VALUES ('EXISTING_OBJ', 'NEW_FIELD', 'NEW_FIELD', 'ALN', 50, 0, 1, 'I');

-- 2. 执行应用配置变更
-- 3. 验证物理列已添加
```

### Q3: 如何处理跨站点对象关系？

确保 WHERECLAUSE 中包含站点过滤：

```sql
INSERT INTO MAXRELATIONSHIP (PARENT, CHILD, NAME, WHERECLAUSE)
VALUES ('SITE_OBJ_A', 'SITE_OBJ_B', 'RELATED_ITEMS', 
        'related_id = :item_id and siteid = :siteid');
```

### Q4: 配置失败后如何清理残留状态？

```sql
-- 检查异常状态的配置
SELECT * FROM MAXOBJECTCFG WHERE CHANGED IN ('I', 'U', 'D');
SELECT * FROM MAXATTRIBUTECFG WHERE CHANGED IN ('I', 'U', 'D');

-- 根据具体情况清理或重新应用配置
```

## 验证清单

配置完成后验证以下项目：

- [ ] 对象定义完整（名称、描述、层级正确）
- [ ] 所有必需字段已定义且类型正确
- [ ] 主键字段标记为 REQUIRED
- [ ] 外键字段与引用对象字段类型一致
- [ ] 关系定义的 WHERECLAUSE 语法正确
- [ ] 所有绑定变量 :fieldname 在父对象中存在
- [ ] 值域 DOMAINID 引用有效
- [ ] SAMEAS 引用路径正确
- [ ] 物理表结构已成功创建
- [ ] 索引已按需要创建

## 参考资源

- Maximo 数据字典文档
- 现有业务对象配置示例
- 数据库性能调优指南
- 安全操作规范要求

## 工具脚本示例

### 批量创建对象配置

```sql
-- 创建对象及其字段的完整配置脚本模板
DECLARE
  v_object_name VARCHAR2(30) := 'IBM_NEWOBJECT';
BEGIN
  -- 1. 创建对象定义
  INSERT INTO MAXOBJECTCFG (OBJECTNAME, DESCRIPTION, SITEORGTYPE, PERSISTENT, CHANGED)
  VALUES (v_object_name, '新业务对象', 'SITE', 1, 'I');
  
  -- 2. 创建主键字段
  INSERT INTO MAXATTRIBUTECFG (OBJECTNAME, ATTRIBUTENAME, COLUMNNAME, MAXTYPE, LENGTH, REQUIRED, PERSISTENT, CHANGED)
  VALUES (v_object_name, 'NEWNUM', 'NEWNUM', 'ALN', 30, 1, 1, 'I');
  
  -- 3. 创建标准字段
  INSERT INTO MAXATTRIBUTECFG (OBJECTNAME, ATTRIBUTENAME, COLUMNNAME, MAXTYPE, LENGTH, REQUIRED, PERSISTENT, CHANGED)
  VALUES (v_object_name, 'DESCRIPTION', 'DESCRIPTION', 'ALN', 255, 0, 1, 'I');
  
  -- 4. 提交配置
  COMMIT;
END;
```

此技能帮助确保 Maximo 数据库配置的规范性、安全性和可维护性。
