# Maximo XML 组件参考手册

本文档提供 Maximo XML 布局中常用组件的详细说明、属性定义和使用示例。

## 目录

1. [组件注册表 (component-registry.xml)](#1-组件注册表)
2. [控件注册表 (control-registry.xml)](#2-控件注册表)
3. [页面关键字速查 (页面关键字.xml)](#3-页面关键字速查)
4. [常用组件详解](#4-常用组件详解)

---

## 1. 组件注册表

**文件路径**: `.lingma/skills/maximo-xml-layout/maxresources/component-registry.xml`

### 作用
定义了所有可用的 Maximo UI 组件及其基本属性。

### 主要组件类型

#### 1.1 textbox (文本框)
```xml
<component-descriptor name="textbox">
    <!-- 基本属性 -->
    - dataattribute: 绑定的数据字段
    - id: 组件唯一标识
    - label: 显示标签
    - inputmode: 输入模式 (DEFAULT, READONLY, REQUIRED, PASSWORD, QUERY)
    - lookup: 查找对话框名称
    - menutype: 菜单类型
    - ondatachange: 数据变更事件 (REFRESHTABLE, RESETCHILDREN)
    - hidelabel: 是否隐藏标签 (true/false)
    - width: 宽度
    - required: 是否必填 (通过前端验证实现)
</component-descriptor>
```

**使用示例**:
```xml
<!-- 普通文本框 -->
<textbox dataattribute="IBM_PARTNUMBER" id="main_partnumber_1" label="零件编号"/>

<!-- 带查找的文本框 -->
<textbox dataattribute="IBM_VENDOR" id="main_vendor_1" label="供应商" lookup="vendor"/>

<!-- 只读文本框 -->
<textbox dataattribute="DESCRIPTION" id="main_description_1" label="描述" inputmode="readonly"/>

<!-- 日期文本框 -->
<textbox dataattribute="APPLYDATE" id="main_applydate_1" label="申请日期" lookup="datelookup"/>
```

#### 1.2 checkbox (勾选框)
```xml
<component-descriptor name="checkbox">
    - dataattribute: 绑定的布尔字段 (YORN 类型)
    - id: 组件唯一标识
    - label: 显示标签
    - inputmode: 输入模式
    - defaultvalue: 默认值 (0/1)
</component-descriptor>
```

**使用示例**:
```xml
<checkbox dataattribute="ACTIVE" id="main_active_1" label="激活状态" defaultvalue="1"/>
```

#### 1.3 combobox (下拉框)
```xml
<component-descriptor name="combobox">
    - dataattribute: 绑定的数据字段
    - id: 组件唯一标识
    - label: 显示标签
    - lookup: 查找对话框（用于动态选项）
    - staticdata: 静态数据源
    - required: 是否必填
</component-descriptor>
```

**使用示例**:
```xml
<!-- 静态下拉框 -->
<combobox dataattribute="STATUS" id="main_status_1" label="状态" 
          staticdata="NEW,APPROVED,REJECTED"/>

<!-- 动态下拉框（通过 lookup） -->
<combobox dataattribute="IBM_TYPE" id="main_type_1" label="类型" lookup="valuelookup"/>
```

#### 1.4 multilinetextbox (多行文本框)
```xml
<component-descriptor name="multilinetextbox">
    - dataattribute: 绑定的数据字段
    - id: 组件唯一标识
    - label: 显示标签
    - rows: 行数（高度）
    - columns: 列数（宽度）
    - inputmode: 输入模式
</component-descriptor>
```

**使用示例**:
```xml
<multilinetextbox dataattribute="REMARK" id="main_remark_1" label="备注" rows="4" columns="50"/>
```

#### 1.5 multiparttextbox (复合文本框)
```xml
<component-descriptor name="multiparttextbox">
    - dataattribute: 主字段
    - descdataattribute: 描述字段
    - descinputmode: 描述字段输入模式（通常 readonly）
    - id: 组件唯一标识
    - label: 显示标签
    - lookup: 查找对话框
    - longdescreadonly: 长描述是否只读
    - menutype: 菜单类型
</component-descriptor>
```

**⚠️ 重要说明**:
- **默认不使用 multiparttextbox**，会影响界面美观
- 优先使用两个独立的 textbox
- 仅在用户明确要求时使用

**使用示例**（仅供参考）:
```xml
<multiparttextbox 
    dataattribute="IBM_PARTNUMBER" 
    descdataattribute="DESCRIPTION" 
    descinputmode="readonly" 
    id="main_partnumber_1" 
    label="零件编号"
    lookup="item"/>
```

#### 1.6 radiobuttongroup (单选按钮组)
```xml
<component-descriptor name="radiobuttongroup">
    - dataattribute: 绑定的数据字段
    - id: 组件唯一标识
    - label: 显示标签
    - border: 是否显示边框 (true/false)
    
    子元素:
    <radiobutton id="xxx" label="显示文本" value="实际值"/>
</component-descriptor>
```

**使用示例**:
```xml
<radiobuttongroup dataattribute="PRIORITY" id="main_priority_1" label="优先级" border="true">
    <radiobutton id="priority_1" label="高" value="HIGH"/>
    <radiobutton id="priority_2" label="中" value="MEDIUM"/>
    <radiobutton id="priority_3" label="低" value="LOW"/>
</radiobuttongroup>
```

---

## 2. 控件注册表

**文件路径**: `.lingma/skills/maximo-xml-layout/maxresources/control-registry.xml`

### 作用
定义了控件的行为、渲染方式和高级属性。

### 主要控件类型

#### 2.1 table (表格)
```xml
<control-descriptor name="table">
    - id: 表格唯一标识
    - label: 表格标题
    - mboname: 业务对象名称
    - relationship: 关系名称（用于主子表关联）
    - datasrc: 数据源标识
    - selectmode: 选择模式 (SINGLE, MULTIPLE)
    - inputmode: 输入模式
    - displayrowsperpage: 每页显示行数
    - filterable: 是否可过滤 (true/false)
    - filterexpanded: 过滤器是否展开 (true/false)
    - startempty: 开始是否为空 (true/false)
    
    子元素:
    <tablebody> - 表格主体
    <tabledetails> - 详细信息展开区域
    <buttongroup> - 按钮组
</control-descriptor>
```

**使用示例**:
```xml
<table id="itemapplyline_table" 
       label="零件明细" 
       mboname="IBM_ITEM_APPLYLINE" 
       relationship="IBM_ITEM_APPLYLINE"
       selectmode="multiple">
    <tablebody displayrowsperpage="20" 
               filterable="true" 
               filterexpanded="true" 
               id="itemapplyline_tablebody">
        <!-- 表格列 -->
    </tablebody>
    <tabledetails id="itemapplyline_details">
        <!-- 详细信息 -->
    </tabledetails>
    <buttongroup id="itemapplyline_buttons">
        <pushbutton default="true" id="add_btn" label="新建行" mxevent="addrow"/>
    </buttongroup>
</table>
```

#### 2.2 tablecol (表格列)
```xml
<control-descriptor name="tablecol">
    - id: 列唯一标识
    - dataattribute: 绑定的数据字段
    - label: 列标题
    - type: 列类型 (EVENT, LINK, CHECKBOX)
    - mxevent: 事件名称
    - mxevent_desc: 事件描述
    - mxevent_icon: 事件图标
    - sortable: 是否可排序 (true/false)
    - filterable: 是否可过滤 (true/false)
    - hidden: 是否隐藏 (true/false)
    - showfilterfield: 是否显示过滤字段 (true/false)
    - linkedcontrolid: 链接的控制 ID（用于对话框回填）
    - applink: 跳转的应用程序
    - menutype: 菜单类型
</control-descriptor>
```

**常用列类型**:

**事件列（选择行）**:
```xml
<tablecol filterable="false" 
          hidden="false" 
          id="table_column_select" 
          mxevent="toggleselectrow" 
          mxevent_desc="选择行{0}" 
          sortable="false" 
          type="event"/>
```

**链接列（点击跳转）**:
```xml
<tablecol dataattribute="SN" 
          id="table_column_link" 
          menutype="item" 
          mxevent="selectrecord" 
          mxevent_desc="转到%1" 
          type="link"/>
```

**删除列**:
```xml
<tablecol filterable="false" 
          hidden="false" 
          id="table_column_delete" 
          mxevent="toggledeleterow" 
          mxevent_desc="标记要删除的行" 
          mxevent_icon="btn_garbage.gif" 
          sortable="false" 
          type="event"/>
```

**普通数据列**:
```xml
<tablecol dataattribute="IBM_PARTNUMBER" 
          id="table_column_partnumber" 
          label="零件编号"
          sortable="true"
          filterable="true"/>
```

#### 2.3 section (部分/区域)
```xml
<control-descriptor name="section">
    - id: 区域唯一标识
    - label: 区域标题
    - border: 是否显示边框 (true/false)
    - collapsed: 是否折叠 (true/false)
    - datasrc: 数据源标识
    - mboname: 业务对象名称
    - inputmode: 输入模式
    
    子元素:
    <sectionheader> - 区域标题
    <sectionrow> - 行
    <sectioncol> - 列
</control-descriptor>
```

**使用示例**:
```xml
<section border="true" id="main_basicinfo_section" label="基本信息">
    <sectionrow id="main_basicinfo_row1">
        <sectioncol id="main_basicinfo_col1">
            <section id="main_basicinfo_sec1">
                <sectionrow id="main_basicinfo_sec1_row1">
                    <sectioncol id="main_basicinfo_sec1_col1">
                        <textbox dataattribute="FIELD1" id="main_field1_1"/>
                    </sectioncol>
                    <sectioncol id="main_basicinfo_sec1_col2">
                        <textbox dataattribute="FIELD2" id="main_field2_1"/>
                    </sectioncol>
                </sectionrow>
            </section>
        </sectioncol>
    </sectionrow>
</section>
```

#### 2.4 tab/tabgroup (标签页)
```xml
<control-descriptor name="tab">
    - id: 标签页唯一标识
    - label: 标签页标题
    - type: 标签页类型 (insert, list)
    - default: 是否为默认标签页 (true/false)
    
    注意:
    - type="list": 仅用于主列表标签页
    - type="insert": 用于详情表单标签页
    - 嵌套在详情表单内的子表标签页也使用 type="list"
</control-descriptor>

<control-descriptor name="tabgroup">
    - id: 标签页组唯一标识
    - style: 样式 (form, list)
</control-descriptor>
```

**使用示例**:
```xml
<!-- 主标签页组 -->
<tabgroup id="main_tabs">
    <!-- 列表标签页（type="list"） -->
    <tab id="results" label="列表" type="list">
        <table id="results_table" ...>
            <!-- 列表表格 -->
        </table>
    </tab>
    
    <!-- 详情标签页（type="insert"） -->
    <tab id="main" label="详情" type="insert">
        <section id="main_section">
            <!-- 表单字段 -->
        </section>
        
        <!-- 嵌套的子表区域 -->
        <section id="subtable_section" label="子表">
            <table id="subtable_table" ...>
                <!-- 子表表格 -->
            </table>
            
            <!-- 嵌套标签页组 -->
            <tabgroup id="subtable_tabs" style="form">
                <tab default="true" id="sub_tab1" label="子标签1" type="list">
                    <table id="sub_tab1_table" .../>
                </tab>
                <tab id="sub_tab2" label="子标签2" type="list">
                    <table id="sub_tab2_table" .../>
                </tab>
            </tabgroup>
        </section>
    </tab>
</tabgroup>
```

#### 2.5 buttongroup/pushbutton (按钮组/按钮)
```xml
<control-descriptor name="buttongroup">
    - id: 按钮组唯一标识
    - align: 对齐方式 (CENTER, LEFT, RIGHT)
    - labelalign: 标签对齐方式
    
    子元素:
    <pushbutton> - 普通按钮
    <doclinkuploadbutton> - 文档上传按钮
</control-descriptor>

<control-descriptor name="pushbutton">
    - id: 按钮唯一标识
    - label: 按钮文本
    - mxevent: 事件名称
    - default: 是否为默认按钮 (true/false)
    - image: 按钮图标
</control-descriptor>
```

**常用事件**:
- `mxevent="addrow"`: 添加新行
- `mxevent="deleterow"`: 删除行
- `mxevent="dialogok"`: 对话框确定
- `mxevent="dialogcancel"`: 对话框取消
- `mxevent="INSERT"`: 插入记录
- `mxevent="UPDATE"`: 更新记录
- `mxevent="SAVE"`: 保存

**使用示例**:
```xml
<buttongroup id="main_buttons" align="CENTER">
    <pushbutton default="true" id="save_btn" label="保存" mxevent="SAVE"/>
    <pushbutton id="cancel_btn" label="取消" mxevent="dialogcancel"/>
</buttongroup>

<buttongroup id="table_buttons">
    <pushbutton default="true" id="addrow_btn" label="新建行" mxevent="addrow"/>
</buttongroup>
```

#### 2.6 dialog (对话框)
```xml
<control-descriptor name="dialog">
    - id: 对话框唯一标识（查找时使用 lookup_{id}）
    - label: 对话框标题
    - relationship: 关系名称
    - width: 对话框宽度
    - beanclass: Bean 类名
    
    子元素:
    <table> - 对话框中的表格
    <buttongroup> - 对话框按钮
</control-descriptor>
```

**使用示例**:
```xml
<dialog id="lookup_item" label="选择零件" relationship="ITEM" width="600">
    <table id="lookup_item_table" label="零件列表" inputmode="readonly" selectmode="single">
        <tablebody displayrowsperpage="10" filterable="true" id="lookup_item_tablebody">
            <tablecol filterable="false" id="lookup_item_col1" 
                      mxevent="toggledetailstate" 
                      mxevent_desc="显示详细信息" 
                      sortable="false" 
                      type="event"/>
            <tablecol dataattribute="ITEMNUM" 
                      mxevent_desc="转到%1" 
                      id="lookup_item_col2" 
                      linkedcontrolid="lookup_item_detail_1" 
                      type="link" 
                      sortable="true" 
                      mxevent="selectrecord"/>
            <tablecol dataattribute="DESCRIPTION" 
                      mxevent_desc="转到%1" 
                      id="lookup_item_col3" 
                      linkedcontrolid="lookup_item_detail_2" 
                      type="link" 
                      sortable="true" 
                      mxevent="selectrecord"/>
        </tablebody>
        <tabledetails id="lookup_item_details">
            <section id="lookup_item_detail_sec" label="详细信息">
                <sectionrow id="lookup_item_detail_row">
                    <sectioncol id="lookup_item_detail_col1">
                        <section id="lookup_item_detail_sec1">
                            <textbox dataattribute="ITEMNUM" id="lookup_item_detail_1" inputmode="readonly"/>
                            <textbox dataattribute="DESCRIPTION" id="lookup_item_detail_2" inputmode="readonly"/>
                        </section>
                    </sectioncol>
                </sectionrow>
            </section>
        </tabledetails>
    </table>
    <buttongroup id="lookup_item_buttons">
        <pushbutton default="true" id="lookup_ok_btn" label="确定" mxevent="dialogok"/>
        <pushbutton id="lookup_cancel_btn" label="取消" mxevent="dialogcancel"/>
    </buttongroup>
</dialog>
```

---

## 3. 页面关键字速查

**文件路径**: `maxresources/页面关键字.xml`

### 快速参考模板

#### 3.1 主页面配置
```xml
<presentation 
    apprestrictions="worktype='ORDER'" 
    beanclass="psdi.webclient.system.beans.AppBean" 
    id="app_id" 
    mboname="MAIN_OBJECT" 
    resultstableid="results_showlist"  
    keyattribute="KEY_FIELD" 
    version="7.1.0.0">
</presentation>
```

#### 3.2 Section 布局结构
```xml
<section id="section_id" inputmode="DEFAULT">
    <sectionheader id="header_id"/>
    <sectionrow id="row_id">
        <sectioncol id="col_id">
            <section id="inner_section_id" inputmode="DEFAULT">
                <textbox dataattribute="FIELD" id="textbox_id" inputmode="DEFAULT"/>
            </section>
        </sectioncol>
    </sectionrow>
</section>
```

**Section 属性说明**:
- `border`: 显示边界 (false/true)
- `collapsed`: 折叠显示 (false/true)
- `datasrc`: 数据源标识
- `label`: 标签
- `inputmode`: 输入模式
  - DEFAULT: 缺省
  - PASSWORD: 密码
  - READONLY: 只读
  - REQUIRED: 必需
  - QUERY: 查询

#### 3.3 Table 完整结构
```xml
<table id="table_id" 
       datasrc="datasource_id" 
       description="描述"  
       selectmode="MULTIPLE" 
       inputmode="DEFAULT">
    <tablebody id="tablebody_id">
        <tablecol id="tablecol_id" 
                  type="EVENT" 
                  inputmode="DEFAULT" 
                  ondatachange="REFRESHTABLE" 
                  showfilterfield="true"/>
    </tablebody>
    <tabledetails id="tabledetails_id">
        <!-- 详细信息区域 -->
    </tabledetails>
    <!-- 按钮组 -->
    <buttongroup id="buttongroup_id">
        <pushbutton id="button_id" label="按钮文本" mxevent="EVENT_NAME"/>
    </buttongroup>
</table>
```

**Table 属性说明**:
- `selectmode`: SINGLE (单选), MULTIPLE (多选)
- `inputmode`: DEFAULT, READONLY, REQUIRED, QUERY
- `filterable`: 是否可过滤 (true/false)
- `filterexpanded`: 自动打开过滤器 (true/false)
- `displayrowsperpage`: 每页显示行数

#### 3.4 颜色显示规则
```xml
<!-- 放在 </tablebody> 前面 -->
<displayrule dataattribute="STATUS" id="displayrule1">  
    <exact id="exact1" value="新建" classname="purple"/>  
    <exact id="exact2" value="已批准" classname="blue"/>  
    <exact id="exact3" value="待审批" classname="gold"/>  
    <exact id="exact4" value="已拒绝" classname="red"/>  
</displayrule>

<!-- 范围匹配（仅对 int 类型有效） -->
<displayrule dataattribute="PRIORITY" id="displayrule2">  
    <range classname="rowcolor_priority_high" id="range1" lower="1" upper="3"/>  
    <range classname="rowcolor_priority_medium" id="range2" lower="4" upper="6"/>  
    <range classname="rowcolor_priority_low" id="range3" lower="7" upper="10"/>  
</displayrule>
```

**常用颜色类名**:
- `purple`: 紫色
- `blue`: 蓝色
- `gold`: 金色
- `red`: 红色
- `green`: 绿色
- `orange`: 橙色
- `gray`: 灰色

---

## 4. 常用组件详解

### 4.1 文本框 (textbox) 完整属性

```xml
<textbox
    id="唯一标识" 
    label="显示标签" 
    hidelabel="隐藏标签:false,true"
    dataattribute="绑定字段"
    menutype="菜单类型:item,normal"
    lookup="查找对话框名称"
    detailimage="详细信息图像"
    inputmode="输入模式:DEFAULT,PASSWORD,READONLY,REQUIRED,QUERY" 
    prepend="QBE预先考虑"
    ondatachange="变更事件:REFRESHTABLE,RESETCHILDREN"
    smartfilloff="关闭智能填充:false,true" 
    longdescreadonly="只读详细描述:false,true" 
    applink="转到应用程序"
    displaytype="显示类型"
    datasrc="数据源标识"
    sigoption="签名选项" 
    sigoptiondatasrc="签名数据源标识"
    required="是否必填:true,false"
    width="宽度"
    cssclass="CSS类名"/>
```

### 4.2 表格列 (tablecol) 完整属性

```xml
<tablecol 
    id="唯一标识" 
    label="列标题" 
    labelattributes="标签属性"
    labelsrcid="标签源标识" 
    classname="CSS类名称" 
    showfilterfield="显示过滤器:true,false"
    filterable="可过滤:false,true"
    sortable="可排序:false,true"
    type="类型:EVENT,LINK,CHECKBOX"
    dataattribute="绑定字段"
    linkedcontrolid="链接的控制标识"
    applink="转到应用程序"
    inputmode="输入模式"
    menutype="菜单类型" 
    lookup="查找" 
    ondatachange="变更事件:REFRESHTABLE,RESETCHILDREN"
    smartfilloff="关闭智能填充:false,true" 
    longdescreadonly="只读详细描述:false,true" 
    urlattribute="URL属性"
    mxevent="事件名称"
    mxevent_desc="事件描述" 
    mxevent_icon="事件图标"
    targetid="目标标识" 
    sigoption="签名选项" 
    sigoptiondatasrc="签名数据源标识"
    detailimage="详细信息图像"
    hidden="隐藏:false,true"
    usefieldsizegroup="使用字段大小分组:false,true"/>
```

### 4.3 常用事件 (mxevent)

| 事件名称 | 说明 | 使用场景 |
|---------|------|---------|
| `toggleselectrow` | 切换行选择状态 | 表格选择行列 |
| `selectrecord` | 选择记录 | 链接列，点击跳转到详情 |
| `toggledeleterow` | 标记删除行 | 表格删除列 |
| `toggledetailstate` | 切换详细信息显示 | 表格展开/折叠列 |
| `addrow` | 添加新行 | 表格新建按钮 |
| `deleterow` | 删除行 | 表格删除按钮 |
| `dialogok` | 对话框确定 | 对话框确定按钮 |
| `dialogcancel` | 对话框取消 | 对话框取消按钮 |
| `INSERT` | 插入记录 | 工具栏新建按钮 |
| `UPDATE` | 更新记录 | 工具栏保存按钮 |
| `SAVE` | 保存 | 通用保存按钮 |
| `CANCEL` | 取消 | 取消操作按钮 |

### 4.4 输入模式 (inputmode)

| 模式 | 说明 | 使用场景 |
|------|------|---------|
| `DEFAULT` | 默认模式，可编辑 | 普通输入字段 |
| `READONLY` | 只读模式 | 系统字段、计算字段、描述字段 |
| `REQUIRED` | 必填模式 | 必填字段 |
| `PASSWORD` | 密码模式 | 密码输入 |
| `PASSWORDREADONLY` | 只读密码 | 密码显示 |
| `PASSWORDREQUIRED` | 必填密码 | 必填密码 |
| `QUERY` | 查询模式 | 查询条件字段 |

### 4.5 数据类型与 MAXTYPE 对应

| Vue 类型 | Maximo MAXTYPE | 说明 |
|---------|---------------|------|
| String | ALN | 字母数字，区分大小写 |
| String (大写) | UPPER | 字母数字，自动转大写 |
| Number (整数) | INTEGER | 整数 |
| Number (小数) | DECIMAL(15,4) | 小数，保留4位 |
| Boolean | YORN | 是/否 (0/1) |
| Date | DATE | 日期 |
| DateTime | DATETIME | 日期时间 |
| Long Text | CLOB | 长文本 |
| ID (主键/外键) | BIGINT | 大整数 |

---

## 5. 最佳实践

### 5.1 ID 命名规范

```
格式: {context}_{name}_{type}_{sequence}

示例:
- main_partnumber_1          (主表单-零件编号-第1个)
- results_showlist_column_1  (结果列表-显示列表-第1列)
- itemapplyline_tablebody    (零件明细-表格主体)
- tieredcost_purchase_col_1  (采购阶梯价格-第1列)
```

### 5.2 布局原则

1. **三列布局**: 适合短字段，提高空间利用率
2. **两列布局**: 适合中等长度字段
3. **单列布局**: 适合长字段（备注、描述等）
4. **Section 分组**: 按业务逻辑分组（基本信息、采购信息、销售信息等）

### 5.3 表格设计原则

1. **必选列**: 
   - 选择行列（toggleselectrow）
   - 关键业务字段（如序号、编号）
   - 删除列（toggledeleterow）

2. **可选列**:
   - 展开详细信息列（toggledetailstate）
   - 其他业务字段

3. **列顺序**:
   - 操作列在前（选择、展开）
   - 关键业务字段
   - 辅助信息字段
   - 删除列在最后

4. **详细信息展开**:
   - 放置不常用但重要的字段
   - 避免主表格过宽

### 5.4 性能优化

1. **表格分页**: `displayrowsperpage="10"` 或 `"20"`
2. **启用过滤**: `filterable="true"`
3. **延迟加载**: 嵌套表格使用关系自动过滤
4. **避免过深嵌套**: 最多三层（主表-子表-孙子表）

---

## 6. 常见错误及解决方案

### 6.1 ID 重复
**错误**: 多个组件使用相同的 ID
**解决**: 确保每个 ID 在整个 XML 文件中唯一

### 6.2 关系名称错误
**错误**: relationship 属性使用了不存在的关系名
**解决**: 检查数据库配置中的关系定义

### 6.3 字段名称错误
**错误**: dataattribute 使用了错误的字段名
**解决**: 对照 API 配置文件或数据库设计文档

### 6.4 缺少必要的列
**错误**: 表格缺少选择行或删除列
**解决**: 添加标准的操作列

### 6.5 multiparttextbox 滥用
**错误**: 过度使用 multiparttextbox 影响美观
**解决**: 使用两个独立的 textbox，描述字段设置为 readonly

---

## 7. 参考资料

- **xml  说明**: `.lingma/skills/maximo-xml-layout/maxresources/max-appxml.xml`
- **组件注册表**: `.lingma/skills/maximo-xml-layout/maxresources/component-registry.xml`
- **控件注册表**: `.lingma/skills/maximo-xml-layout/maxresources/control-registry.xml`
- **页面关键字**: `.lingma/skills/maximo-xml-layout/maxresources/页面关键字.xml`
- **SKILL 文档**: `.lingma/skills/maximo-xml-layout/SKILL.md`
- **数据库设计**: `DBCONFIGMD/*.md`
- **API 配置**: `DBCONFIGJSON/*_API_CONFIG.json`

---

## 8. 更新日志

- **v1.0** (2026-05-18): 初始版本，包含常用组件的完整说明
- **v1.1** (2026-05-18): 添加了 multiparttextbox 禁用说明和最佳实践
