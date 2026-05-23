# Maximo Application XML Layout Skill

## 技能概述

本技能专门用于处理 Maximo 应用程序 XML 布局文件的修改，特别是将 Vue 组件的页面布局转换为 Maximo XML 格式。

## 适用场景

- 根据 Vue 组件页面布局修改 Maximo 应用 XML
- 根据数据库设计文档配置 XML 字段绑定
- 调整 Maximo 应用的表单、表格、标签页布局
- 确保 XML 布局与数据库字段和 API 配置一致

## 工作流程

### 1. 信息收集阶段

在开始修改 XML 之前，必须收集以下参考文件：

#### 必需文件清单
1. **Vue 组件源文件**（参考布局）
   - 路径示例：`maximo-vue-components/src/views/ItemMasterDetail.vue`
   - 用途：了解目标页面的布局结构、字段组织、标签页划分

2. **数据库设计文档**（字段定义）
   - 路径示例：`DBCONFIGMD/ITEM_MASTER_DB_DESIGN_V3.md`
   - 用途：确认字段名称、类型、长度、必填性等元数据

3. **API 配置文件**（真实字段信息）
   - 路径示例：`E:\maximoProject\java_sources\issue_maximo9.1\DBCONFIGJSON\ITEM_MASTER_V3_API_CONFIG.json`
   - 用途：获取实际的字段定义、关系配置、数据类型

4. **Maximo 组件注册文件**（组件属性）
   - 路径：`maxresources/component-registry.xml`
   - 路径：`maxresources/control-registry.xml`
   - 用途：了解 Maximo 组件的可用属性和配置选项

5. **原始 XML 文件**（待修改）
   - 路径示例：`xmltmp/item.xml`
   - 用途：作为修改的基础模板

### 2. 分析阶段

#### 2.1 Vue 组件分析
从 Vue 组件中提取以下信息：

```javascript
// 分析要点：
1. 页面标题和整体结构
2. Section 分组（基础信息、采购相关、销售相关等）
3. 每个 Section 内的字段布局（几列、字段顺序）
4. Tab 标签页划分
5. 每个 Tab 内的表格结构
6. 子表和孙子表的层级关系
```

#### 2.2 数据库字段映射
建立 Vue 字段到 Maximo 字段的映射关系：

```
Vue 字段名          →  Maximo 字段名         →  显示标签
formData.itemnum    →  IBM_PARTNUMBER        →  零件编号
formData.description → DESCRIPTION           →  零件名称
formData.vendor     →  IBM_VENDOR            →  供应商编号
```

#### 2.3 关系定义确认
从 API 配置中提取关系定义：

```json
{
  "object": "IBM_SUPPLIERTERMS",
  "relationships": [
    {
      "relationship": "ITEM",
      "child": "ITEM",
      "whereClause": "ITEMNUM = :ITEMNUM"
    }
  ]
}
```

转换为 Maximo 关系名：
- `IBM_SUPPLIERTERMS` → relationship="IBM_SUPPLIERTERMS"
- `IBM_CUSTOMERLOCATION` → relationship="IBM_CUSTOMERLOCATION"
- `IBM_TIEREDCOST_PURCHASE` → relationship="IBM_TIEREDCOST_PURCHASE" (COSTTYPE='PURCHASE')
- `IBM_TIEREDCOST_SALES` → relationship="IBM_TIEREDCOST_SALES" (COSTTYPE='SALES')

### 3. XML 结构设计原则

#### 3.1 基本布局结构

```xml
<tab id="main" label="项目" type="insert">
    <!-- Section 区域：表单字段 -->
    <section border="true" id="xxx_section">
        <sectionrow id="xxx_row1">
            <sectioncol id="xxx_col1">
                <section id="xxx_sec1" label="区域标题">
                    <sectionrow id="xxx_sec1_row1">
                        <sectioncol id="xxx_sec1_col1">
                            <!-- 第一列字段 -->
                        </sectioncol>
                        <sectioncol id="xxx_sec1_col2">
                            <!-- 第二列字段 -->
                        </sectioncol>
                        <sectioncol id="xxx_sec1_col3">
                            <!-- 第三列字段 -->
                        </sectioncol>
                    </sectionrow>
                </section>
            </sectioncol>
        </sectionrow>
    </section>

    <!-- Tab 区域：表格数据 -->
    <section border="true" id="xxx_tabs_section">
        <tabgroup id="xxx_tabs">
            <tab default="true" id="tab_xxx" label="标签页名称">
                <table id="xxx_table" label="表格标题" relationship="RELATION_NAME">
                    <tablebody displayrowsperpage="10" filterable="true" id="xxx_tablebody">
                        <!-- 表格列定义 -->
                    </tablebody>
                    <tabledetails id="xxx_details">
                        <!-- 详细信息展开区域 -->
                    </tabledetails>
                    <buttongroup id="xxx_buttons">
                        <pushbutton default="true" id="xxx_btn1" label="新建行" mxevent="addrow"/>
                    </buttongroup>
                </table>
            </tab>
        </tabgroup>
    </section>
</tab>
```

#### 3.2 字段组件选择规则

| Vue 组件 | Maximo 组件 | 使用场景 |
|---------|------------|---------|
| MaximoTextbox (单行) | `<textbox>` | **默认使用**，所有普通文本字段 |
| MaximoTextarea (多行) | `<textbox longdescription="true">` 或 `<textarea>` | 长文本、备注、地址等多行输入 |
| MaximoCheckbox | `<checkbox>` | 布尔值字段 |
| MaximoDropdown | `<combobox>` 或带 lookup 的 textbox | 下拉选择字段 |

**重要说明：**
- ⚠️ **默认不使用 multiparttextbox**，即使 Vue 组件中有主字段和描述字段
- multiparttextbox 会影响界面美观，除非用户明确要求，否则统一使用独立的 textbox
- 如需显示关联描述，通过表格列或单独的 textbox 展示
- 如果需要使用 multiparttextbox，开发者会自行修改

**多行文本框使用说明：**

Maximo 支持两种多行文本框实现方式：

**方式1：使用 textbox + longdescription（推荐）**
```xml
<textbox dataattribute="REMARKS" id="main_remarks_1" longdescription="true" label="备注" width="300"/>
```
- 优点：自动弹出长描述对话框，适合超长文本
- 适用场景：备注、说明等可能需要大量文字的字段

**方式2：使用 textarea 组件**
```xml
<textarea dataattribute="ADDRESS" id="main_address_1" rows="3" label="收货地址" width="300"/>
```
- 优点：直接在页面上显示多行，无需弹窗
- 适用场景：地址、简短说明等中等长度文本
- 常用属性：
  - `rows`: 显示行数（通常 2-5）
  - `columns`: 显示列数（可选）
  - `resizeable`: 是否可调整大小（默认 false）

#### 3.3 字段布局原则

**基本原则：**
- 每个字段使用独立的 `<textbox>` 组件
- 即使有主字段和描述字段，也分别使用两个独立的 textbox
- 描述字段通常设置为 `inputmode="readonly"`

**重要排版规则：**
- ⚠️ **textbox 会自动换行**，在同一个 `<sectioncol>` 中放置多个 textbox 会自动形成垂直排列
- **不需要为每个 textbox 创建单独的 `<sectionrow>`**
- 推荐做法：将相关字段放在同一个 `<sectioncol>` 中，实现紧凑的垂直布局
- 这样可以节省空间，使表单更加美观和易读

**示例：**
```xml
<!-- ✅ 正确做法：一个 sectioncol 中放多个 textbox，自动换行 -->
<sectionrow id="main_row1">
    <sectioncol id="main_col1">
        <textbox dataattribute="APPLYNUM" id="main_applynum_1" label="申请单号" width="300"/>
        <textbox dataattribute="STATUS" id="main_status_1" label="状态" width="300"/>
    </sectioncol>
    <sectioncol id="main_col2">
        <textbox dataattribute="APPLYTYPE" id="main_applytype_1" label="申请类型" width="300"/>
        <textbox dataattribute="APPLICANT" id="main_applicant_1" label="申请人" width="300"/>
    </sectioncol>
    <sectioncol id="main_col3">
        <textbox dataattribute="CHANGETYPE" id="main_changetype_1" label="变更类型" width="300"/>
        <textbox dataattribute="APPLYDATE" id="main_applydate_1" label="申请日期" lookup="datelookup" width="300"/>
    </sectioncol>
</sectionrow>

<!-- ❌ 错误做法：为每个 textbox 创建单独的 sectionrow（浪费空间） -->
<sectionrow id="main_row1">
    <sectioncol id="main_col1">
        <textbox dataattribute="APPLYNUM" id="main_applynum_1" label="申请单号" width="300"/>
    </sectioncol>
</sectionrow>
<sectionrow id="main_row2">
    <sectioncol id="main_col2">
        <textbox dataattribute="STATUS" id="main_status_1" label="状态" width="300"/>
    </sectioncol>
</sectionrow>
```

**布局对比：**

传统横向布局（每行3个字段）：
```
Row 1: [字段1] [字段2] [字段3]
Row 2: [字段4] [字段5] [字段6]
Row 3: [字段7]
```

推荐的纵向布局（每列2个字段）：
```
Col 1      Col 2      Col 3
[字段1]   [字段2]   [字段3]
[字段4]   [字段5]   [字段6]
```

**优势：**
- 更紧凑，节省垂直空间
- 用户可以在一屏内看到更多字段
- 逻辑相关的字段可以放在一起（如申请单号和状态）
- 符合现代表单设计规范

**示例：**
```xml
<!-- Vue: v-model="formData.itemnum" 和 formData.description -->
<!-- 正确做法：使用两个独立的 textbox -->
<textbox dataattribute="IBM_PARTNUMBER" id="main_partnumber_1" lookup="item"/>
<textbox dataattribute="DESCRIPTION" id="main_description_1" inputmode="readonly"/>

<!-- 错误做法：不要使用 multiparttextbox（除非用户明确要求） -->
<!-- <multiparttextbox dataattribute="IBM_PARTNUMBER" descdataattribute="DESCRIPTION" .../> -->
```

**multiparttextbox 使用说明（仅供参考）：**

仅在用户明确要求时使用 multiparttextbox：

```xml
<multiparttextbox 
    dataattribute="IBM_PARTNUMBER" 
    descdataattribute="DESCRIPTION" 
    descinputmode="readonly" 
    id="main_partnumber_1" 
    longdescreadonly="true" 
    menutype="item"/>
```

**关键属性说明：**
- `dataattribute`: 主字段（业务键）
- `descdataattribute`: 描述字段（只读显示）
- `descinputmode="readonly"`: 描述字段不可编辑
- `longdescreadonly="true"`: 长描述只读
- `menutype`: 菜单类型（item, normal 等）
- `lookup`: 查找对话框名称

#### 3.4 表格结构规范

**基本表格：**
```xml
<table id="xxx_table" label="表格标题" relationship="RELATION_NAME">
    <tablebody displayrowsperpage="10" filterable="true" filterexpanded="false" id="xxx_tablebody">
        <!-- 操作列：展开详细信息 -->
        <tablecol filterable="false" hidden="false" id="xxx_col1" 
                  mxevent="toggledetailstate" 
                  mxevent_desc="显示详细信息" 
                  sortable="false" 
                  type="event"/>
        
        <!-- 数据列 -->
        <tablecol dataattribute="field1" id="xxx_col2"/>
        <tablecol dataattribute="field2" id="xxx_col3"/>
        
        <!-- 操作列：删除行 -->
        <tablecol filterable="false" hidden="false" id="xxx_colN" 
                  mxevent="toggledeleterow" 
                  mxevent_desc="标记要删除的行" 
                  mxevent_icon="btn_garbage.gif" 
                  sortable="false" 
                  type="event"/>
    </tablebody>
    
    <!-- 详细信息展开区域 -->
    <tabledetails id="xxx_details">
        <section id="xxx_detail_sec" label="详细信息">
            <sectionrow id="xxx_detail_row">
                <sectioncol id="xxx_detail_col1">
                    <section id="xxx_detail_sec1">
                        <textbox dataattribute="field1" id="xxx_detail_f1"/>
                        <textbox dataattribute="field2" id="xxx_detail_f2"/>
                    </section>
                </sectioncol>
                <sectioncol id="xxx_detail_col2">
                    <section id="xxx_detail_sec2">
                        <textbox dataattribute="field3" id="xxx_detail_f3"/>
                    </section>
                </sectioncol>
            </sectionrow>
        </section>
    </tabledetails>
    
    <!-- 按钮组 -->
    <buttongroup id="xxx_buttons">
        <pushbutton default="true" id="xxx_btn1" label="新建行" mxevent="addrow"/>
    </buttongroup>
</table>
```

**主子表结构（客户地点 + 阶梯价格）：**
```xml
<tab id="tab_customer_location" label="客户阶梯价格">
    <!-- 主表：客户地点 -->
    <table id="customer_location_table" label="客户地点" relationship="IBM_CUSTOMERLOCATION">
        <!-- ... 表格定义 ... -->
    </table>
    
    <!-- 子表：阶梯价格（自动关联当前选中的客户地点） -->
    <table id="customer_price_table" label="阶梯价格" relationship="IBM_CUSTOMERPRICE">
        <!-- ... 表格定义 ... -->
    </table>
</tab>
```

**⚠️ 重要：子表配置规范**

1. **必须使用 `relationship` 属性，禁止使用 `mboname`**
   ```xml
   <!-- ✅ 正确做法 -->
   <table id="itemapplyline_table" label="零件明细" relationship="IBM_ITEM_APPLYLINE" filterable="true" filterexpanded="false">
   
   <!-- ❌ 错误做法：不要使用 mboname -->
   <table id="itemapplyline_table" label="零件明细" mboname="IBM_ITEM_APPLYLINE" filterable="true" filterexpanded="false">
   ```

2. **所有子表必须设置 `filterable="true" filterexpanded="false"`**
   - `filterable="true"`: 启用过滤功能
   - `filterexpanded="false"`: 默认折叠过滤器，提升用户体验
   ```xml
   <!-- ✅ 标准配置 -->
   <table id="xxx_table" label="表格标题" relationship="RELATION_NAME" filterable="true" filterexpanded="false">
       <tablebody displayrowsperpage="10" filterable="true" filterexpanded="false" id="xxx_tablebody">
           <!-- 表格列定义 -->
       </tablebody>
   </table>
   ```

3. **必须设置 `parentdatasrc` 属性（数据源关联）**
   
   **规则：**
   - **主表的直接子表**：`parentdatasrc="mainrecord"`
   - **子表的子表（孙子表）**：`parentdatasrc="父表的id"`
   
   **示例：**
   ```xml
   <!-- 主表 -->
   <tab id="main" label="申请详情" type="insert">
       <!-- 第一层子表：零件明细 -->
       <table id="itemapplyline_table" parentdatasrc="mainrecord" label="零件明细" relationship="IBM_ITEM_APPLYLINE">
           <!-- ... -->
       </table>
       
       <!-- Tab 中的子表：采购阶梯价格（父表是 itemapplyline_table） -->
       <tab id="tieredcost_purchase" parentdatasrc="itemapplyline_table" label="采购阶梯价格" type="list">
           <table id="tieredcost_purchase_table" relationship="IBM_APPLY_TIEREDCOST_PURCHASE">
               <!-- ... -->
           </table>
       </tab>
       
       <!-- Tab 中的子表：客户地点（父表是 itemapplyline_table） -->
       <tab id="customerlocation" parentdatasrc="itemapplyline_table" label="客户地点" type="list">
           <table id="customerlocation_table" relationship="IBM_APPLY_CUSTOMERLOCATION">
               <!-- ... -->
           </table>
           
           <!-- 孙子表：客户阶梯价格（父表是 customerlocation） -->
           <tab id="customerlocation_tieredcost" parentdatasrc="customerlocation" label="客户阶梯价格" type="list">
               <table id="customerlocation_tieredcost_table" relationship="IBM_APPLY_TIEREDCOST_CUSTOMER">
                   <!-- ... -->
               </table>
           </tab>
       </tab>
   </tab>
   ```
   
   **关键点：**
   - `parentdatasrc` 的值是**父容器的 id**，不是 relationship 名称
   - 对于 Tab 中的表格，`parentdatasrc` 指向的是 **Tab 的 id**，而不是 table 的 id
   - 这样可以确保数据正确关联和过滤

4. **适用范围**
   - 所有嵌套在主表下的子表
   - 所有 Tab 标签页中的表格
   - 包括孙子表（嵌套的子表）

### 4. 命名规范

#### 4.1 ID 命名规则

```
Section ID:       main_{area}_{type}_section    (例: main_basicinfo_section)
SectionRow ID:    main_{area}_row{N}            (例: main_basicinfo_row1)
SectionCol ID:    main_{area}_col{N}            (例: main_basicinfo_col1)
Section ID(内):   main_{area}_sec{N}            (例: main_basicinfo_sec1)

Table ID:         {type}_{name}_table           (例: purchase_tieredprice_table)
TableBody ID:     {type}_{name}_tablebody       (例: purchase_tieredprice_tablebody)
TableDetails ID:  {type}_{name}_details         (例: purchase_tieredprice_details)
ButtonGroup ID:   {type}_{name}_buttons         (例: purchase_tieredprice_buttons)

Tab ID:           tab_{name}                    (例: tab_purchase_price)
TabGroup ID:      main_{area}_tabs              (例: main_tieredprice_tabs)

Field ID:         main_{fieldname}_{N}          (例: main_partnumber_1)
Detail Field ID:  {type}_{name}_detail_{field}  (例: purchase_tieredprice_detail_sn)
```

#### 4.2 关系命名规范

- 直接使用表名作为关系名
- 对于通用表（如 IBM_TIEREDCOST），根据 COSTTYPE 创建多个关系
- 示例：
  - `IBM_SUPPLIERTERMS` → relationship="IBM_SUPPLIERTERMS"
  - `IBM_TIEREDCOST` (PURCHASE) → relationship="IBM_TIEREDCOST_PURCHASE"
  - `IBM_TIEREDCOST` (SALES) → relationship="IBM_TIEREDCOST_SALES"

### 5. 常见模式模板

#### 5.1 三列表单布局

```xml
<sectionrow id="xxx_row1">
    <sectioncol id="xxx_col1">
        <section id="xxx_sec1" label="区域标题">
            <sectionrow id="xxx_sec1_row1">
                <sectioncol id="xxx_sec1_col1">
                    <textbox dataattribute="FIELD1" id="xxx_f1"/>
                    <textbox dataattribute="FIELD2" id="xxx_f2"/>
                    <textbox dataattribute="FIELD3" id="xxx_f3"/>
                </sectioncol>
                <sectioncol id="xxx_sec1_col2">
                    <textbox dataattribute="FIELD4" id="xxx_f4"/>
                    <textbox dataattribute="FIELD5" id="xxx_f5"/>
                    <textbox dataattribute="FIELD6" id="xxx_f6"/>
                </sectioncol>
                <sectioncol id="xxx_sec1_col3">
                    <textbox dataattribute="FIELD7" id="xxx_f7"/>
                    <textbox dataattribute="FIELD8" id="xxx_f8"/>
                    <textbox dataattribute="FIELD9" id="xxx_f9"/>
                </sectioncol>
            </sectionrow>
        </section>
    </sectioncol>
</sectionrow>
```

#### 5.2 两行表单布局

```xml
<sectionrow id="xxx_row1">
    <sectioncol id="xxx_col1">
        <section id="xxx_sec1" label="区域标题">
            <!-- 第一行 -->
            <sectionrow id="xxx_sec1_row1">
                <sectioncol id="xxx_sec1_col1">
                    <textbox dataattribute="FIELD1" id="xxx_f1"/>
                </sectioncol>
                <sectioncol id="xxx_sec1_col2">
                    <textbox dataattribute="FIELD2" id="xxx_f2"/>
                </sectioncol>
                <sectioncol id="xxx_sec1_col3">
                    <textbox dataattribute="FIELD3" id="xxx_f3"/>
                </sectioncol>
            </sectionrow>
            <!-- 第二行 -->
            <sectionrow id="xxx_sec1_row2">
                <sectioncol id="xxx_sec1_col4">
                    <textbox dataattribute="FIELD4" id="xxx_f4"/>
                </sectioncol>
                <sectioncol id="xxx_sec1_col5">
                    <textbox dataattribute="FIELD5" id="xxx_f5"/>
                </sectioncol>
                <sectioncol id="xxx_sec1_col6">
                    <!-- 空列占位 -->
                </sectioncol>
            </sectionrow>
        </section>
    </sectioncol>
</sectionrow>
```

#### 5.3 标准表格模板

```xml
<table id="xxx_table" label="表格标题" relationship="RELATION_NAME">
    <tablebody displayrowsperpage="10" filterable="true" id="xxx_tablebody">
        <tablecol filterable="false" hidden="false" id="xxx_col1" 
                  mxevent="toggledetailstate" 
                  mxevent_desc="显示详细信息" 
                  sortable="false" 
                  type="event"/>
        <tablecol dataattribute="SN" id="xxx_col2"/>
        <tablecol dataattribute="FIELD1" id="xxx_col3"/>
        <tablecol dataattribute="FIELD2" id="xxx_col4"/>
        <tablecol dataattribute="FIELD3" id="xxx_col5"/>
        <tablecol filterable="false" hidden="false" id="xxx_col6" 
                  mxevent="toggledeleterow" 
                  mxevent_desc="标记要删除的行" 
                  mxevent_icon="btn_garbage.gif" 
                  sortable="false" 
                  type="event"/>
    </tablebody>
    <tabledetails id="xxx_details">
        <section id="xxx_detail_sec" label="详细信息">
            <sectionrow id="xxx_detail_row">
                <sectioncol id="xxx_detail_col1">
                    <section id="xxx_detail_sec1">
                        <textbox dataattribute="SN" id="xxx_detail_sn" inputmode="readonly"/>
                        <textbox dataattribute="FIELD1" id="xxx_detail_f1"/>
                        <textbox dataattribute="FIELD2" id="xxx_detail_f2"/>
                    </section>
                </sectioncol>
                <sectioncol id="xxx_detail_col2">
                    <section id="xxx_detail_sec2">
                        <textbox dataattribute="FIELD3" id="xxx_detail_f3"/>
                        <textbox dataattribute="FIELD4" id="xxx_detail_f4"/>
                        <textbox dataattribute="FIELD5" id="xxx_detail_f5"/>
                    </section>
                </sectioncol>
            </sectionrow>
        </section>
    </tabledetails>
    <buttongroup id="xxx_buttons">
        <pushbutton default="true" id="xxx_btn1" label="新建行" mxevent="addrow"/>
    </buttongroup>
</table>
```

### 6. 验证检查清单

在完成 XML 修改后，必须进行以下验证：

#### 6.1 字段映射验证
- [ ] 所有 Vue 字段都有对应的 Maximo 字段
- [ ] 字段名称与 API 配置一致（注意 IBM_ 前缀）
- [ ] multiparttextbox 的主字段和描述字段正确配对
- [ ] 数字字段使用正确的 MAXTYPE（INTEGER, DECIMAL）

#### 6.2 关系配置验证
- [ ] 所有表格的 relationship 属性正确
- [ ] 关系名称与 API 配置中的关系定义一致
- [ ] 主子表关系正确（通过外键自动关联）
- [ ] IBM_TIEREDCOST 表根据 COSTTYPE 使用不同的关系

#### 6.3 布局结构验证
- [ ] Section 分组与 Vue 组件一致
- [ ] 字段排列顺序与 Vue 组件一致
- [ ] Tab 标签页划分正确
- [ ] 表格列顺序合理

#### 6.4 ID 唯一性验证
- [ ] 所有 ID 在整个 XML 文件中唯一
- [ ] ID 命名符合规范
- [ ] 没有重复的 ID

#### 6.5 组件属性验证
- [ ] textbox 的 lookup 属性正确
- [ ] checkbox 的 dataattribute 指向 YORN 类型字段
- [ ] 表格的 displayrowsperpage 设置合理（通常 10）
- [ ] 表格的 filterable 属性设置为 true
- [ ] **未使用 multiparttextbox**（除非用户明确要求）

### 7. 注意事项

#### 7.1 必填字段处理
- Maximo XML 中不直接设置 required 属性
- 必填校验通过前端 JavaScript 或自动化脚本实现
- 数据库层面所有字段的 required 均为 false

#### 7.2 字段长度限制
- ALN 类型字段：最大长度根据 API 配置
- UPPER 类型字段：自动转大写
- INTEGER 类型：用于计数、天数等整数
- DECIMAL(15,4)：用于单价，保留 4 位小数
- BIGINT：用于主键/外键 ID

#### 7.3 只读字段处理
- 描述字段设置为 `inputmode="readonly"`（作为独立的 textbox）
- 系统字段设置为 `inputmode="readonly"`
- 关联字段通过 lookup 选择，不直接输入

#### 7.4 multiparttextbox 禁用原则
- ⚠️ **默认禁止使用 multiparttextbox**
- 原因：multiparttextbox 会影响界面美观和布局一致性
- 替代方案：使用两个独立的 textbox，一个用于主字段，一个用于描述字段（readonly）
- 例外情况：只有当用户明确要求时，才可以使用 multiparttextbox

#### 7.5 性能优化
- 避免过深的嵌套结构
- 合理使用 sectioncol 分列，提高空间利用率
- 表格默认显示行数设置为 10-20 行
- 启用表格过滤功能（filterable="true"）

### 8. 示例：完整转换流程

以 ItemMasterDetail.vue 为例：

**步骤 1：分析 Vue 组件结构**
```
- 基础信息 Section（3列 × 3行）
- 采购相关 Section（3列 × 2行）
- 销售相关 Section（3列 × 1行）
- 报关信息 Section（3列 × 1行）
- 4个 Tab：采购阶梯价格、销售阶梯价格、客户阶梯价格、供应商条款
```

**步骤 2：提取字段映射**
```
Vue: formData.itemnum          → Maximo: IBM_PARTNUMBER (使用 textbox)
Vue: formData.description      → Maximo: DESCRIPTION (使用 textbox, inputmode="readonly")
Vue: formData.descriptionEn    → Maximo: IBM_DESCRIPTIONEN (使用 textbox)
Vue: formData.vendor           → Maximo: IBM_VENDOR (使用 textbox)
...

注意：即使 Vue 中有主字段和描述字段的组合，也分别映射为两个独立的 textbox
```

**步骤 3：确定关系配置**
```
采购阶梯价格 → IBM_TIEREDCOST_PURCHASE (COSTTYPE='PURCHASE')
销售阶梯价格 → IBM_TIEREDCOST_SALES (COSTTYPE='SALES')
客户地点     → IBM_CUSTOMERLOCATION
客户阶梯价格 → IBM_CUSTOMERPRICE
供应商条款   → IBM_SUPPLIERTERMS
```

**步骤 4：构建 XML 结构**
按照模板逐步构建每个 Section 和 Table

**步骤 5：验证和调整**
- 检查 ID 唯一性
- 验证关系配置
- 测试布局效果

## 工具支持

### 常用工具函数

1. **读取参考文件**
   ```bash
   # 读取 Vue 组件
   read_file maximo-vue-components/src/views/ItemMasterDetail.vue
   
   # 读取数据库设计
   read_file DBCONFIGMD/ITEM_MASTER_DB_DESIGN_V3.md
   
   # 读取 API 配置
   read_file E:\maximoProject\java_sources\issue_maximo9.1\DBCONFIGJSON\ITEM_MASTER_V3_API_CONFIG.json
   ```

2. **搜索组件定义**
   ```bash
   # 搜索 textbox 组件定义
   grep_code component-registry.xml "component-descriptor name=\"textbox\""
   
   # 搜索 multiparttextbox 控制定义
   grep_code control-registry.xml "control-descriptor name=\"multiparttextbox\""
   ```

3. **修改 XML 文件**
   ```bash
   # 使用 search_replace 精确替换
   search_replace xmltmp/item.xml { replacements: [...] }
   ```

## 常见问题

### Q1: 如何处理 Vue 中的动态数据？
A: Maximo XML 是静态配置，通过 MBO（Maximo Business Object）和数据源自动绑定。只需正确设置 dataattribute 和 relationship。

### Q2: 如何实现 Vue 中的条件显示？
A: 使用 Maximo 的条件渲染属性，如 `sigoption`、`rendercondition`，或通过自动化脚本控制。

### Q3: 表格中的主子表如何关联？
A: Maximo 自动通过关系定义和外键关联。子表会自动过滤显示与当前选中主表记录相关的数据。

### Q4: 如何处理复杂的表单验证？
A: 在 Maximo 中通过以下方式实现：
- 字段级别的验证：MBO 验证规则
- 表单级别的验证：自动化脚本（AutoScript）
- 前端验证：JavaScript 事件处理器

## 最佳实践

1. **始终先收集完整的参考信息**，不要凭猜测修改
2. **保持 ID 命名的一致性和可读性**
3. **优先使用标准的 Maximo 组件和模式**
4. **定期验证 XML 的有效性**
5. **保留原始 XML 备份**（如 item_old.xml）
6. **遵循项目的命名规范和编码风格**
7. **在测试环境充分验证后再应用到生产环境**
8. **⚠️ 默认不使用 multiparttextbox**，除非用户明确要求
   - 原因：multiparttextbox 会影响界面美观
   - 替代方案：使用两个独立的 textbox，描述字段设置为 `inputmode="readonly"`

## 版本历史

- v1.0 (2026-05-18): 初始版本，基于 ItemMasterDetail.vue 转换经验总结
