---
name: maximo-development
description: Maximo Vue 组件开发技能,用于创建 Maximo 风格的页面、表单、表格和查询功能。当用户需要开发 Maximo 业务页面、创建表单组件、配置表格查询或实现业务逻辑时使用此技能。
---

# Maximo 开发技能

## 快速开始

Maximo Vue 项目基于 Vue 3 + Vite,使用 Composition API 开发。所有组件遵循 Maximo UI 设计规范。

### 项目结构

```
maximo-vue-components/
├── src/
│   ├── components/     # Maximo UI 组件
│   ├── views/          # 业务页面
│   ├── router/         # 路由配置
│   └── style.css       # 全局样式
├── public/
│   └── images/         # 图标资源
└── package.json
```

## 核心组件库

### 1. 表单组件

#### MaximoTextbox - 单行文本框
```vue
<MaximoTextbox
  v-model="value"
  label="字段名"
  :required="true"
  :readonly="false"
  :show-icon="true"
  icon-src="/images/img_lookup.gif"
  @icon-click="handleLookup"
/>
```

**关键特性:**
- 支持必填标识(红色星号)
- 支持只读状态
- 支持右侧图标按钮(查找、菜单、日期等)
- 输入框高度 40px,边框颜色 #c6c6c6
- 标签右对齐,最小宽度 200px

#### MaximoMultilineTextbox - 多行文本框
```vue
<MaximoMultilineTextbox
  v-model="multilineValue"
  label="备注"
  width="100%"
  height="100px"
/>
```

#### MaximoMultipartTextbox - 多部分文本框
```vue
<MaximoMultipartTextbox
  v-model="multipartValue"
  label="编码范围"
  :required="true"
/>
<!-- multipartValue 格式: { first: '', second: '' } -->
```

### 2. 布局组件

#### MaximoSection - 区域容器
```vue
<MaximoSection title="基本信息">
  <table class="tdtblw">
    <MaximoSectionRow>
      <MaximoSectionCol>
        <MaximoTextbox v-model="field1" label="字段1" />
      </MaximoSectionCol>
      <MaximoSectionCol>
        <MaximoTextbox v-model="field2" label="字段2" />
      </MaximoSectionCol>
    </MaximoSectionRow>
  </table>
</MaximoSection>
```

**布局规则:**
- 使用 `<table class="tdtblw">` 包裹
- 每行最多 3 列 (`MaximoSectionCol`)
- 列之间自动对齐

### 3. 表格组件

#### MaximoTable - 数据表格
```vue
<MaximoTable
  v-model="selectedRowIndex"
  :columns="columns"
  :data="tableData"
  title="列表标题"
  :total-records="total"
  :current-page="currentPage"
  :page-size="pageSize"
  :toolbar-actions="toolbarActions"
  :primary-action="primaryAction"
  :show-action-column="true"
  :row-actions="rowActions"
  @row-click="handleRowClick"
  @toolbar-action="handleToolbarAction"
  @primary-action="handlePrimaryAction"
  @row-action="handleRowAction"
  @page-change="handlePageChange"
/>
```

**列配置示例:**
```javascript
const columns = [
  { key: 'select', label: '', width: '50px' },
  { key: 'code', label: '编码', width: '120px' },
  { key: 'name', label: '名称', width: '200px' },
  { key: 'status', label: '状态', width: '100px' }
]
```

**工具栏按钮配置:**
```javascript
const toolbarActions = [
  {
    title: '新增',
    icon: '/images/nav_icon_insert.gif',
    action: 'new'
  },
  {
    title: '删除',
    icon: '/images/btn_garbage.gif',
    action: 'delete'
  }
]
```

**行内操作按钮:**
```javascript
const rowActions = [
  {
    title: '编辑',
    icon: '/images/icon_details.gif',
    action: 'edit'
  },
  {
    title: '删除',
    icon: '/images/btn_garbage.gif',
    action: 'delete'
  }
]
```

### 4. 按钮组件

#### MaximoButton - 单个按钮
```vue
<MaximoButton 
  label="保存" 
  :default="true"
  :disabled="false"
  @click="handleSave" 
/>
```

#### MaximoButtonGroup - 按钮组
```vue
<MaximoButtonGroup align="right">
  <MaximoButton label="保存" :default="true" @click="save" />
  <MaximoButton label="取消" @click="cancel" />
  <MaximoButton label="关闭" @click="close" />
</MaximoButtonGroup>
```

**对齐方式:** `left` | `center` | `right`  
**底部样式:** 添加 `bottom` 属性用于对话框

## 页面开发流程

### 1. 列表页开发

**步骤:**
1. 在 `src/views/` 创建列表页面组件
2. 定义表格列配置和数据
3. 配置工具栏按钮
4. 实现行点击跳转详情页
5. 在 `src/router/index.js` 添加路由

**完整示例:**
```vue
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MaximoTable from '../components/MaximoTable.vue'

const router = useRouter()

// 列配置
const columns = [
  { key: 'select', label: '', width: '50px' },
  { key: 'code', label: '编码', width: '150px' },
  { key: 'name', label: '名称', width: '200px' },
  { key: 'status', label: '状态', width: '100px' }
]

// 数据
const tableData = ref([
  { code: '001', name: '测试1', status: '启用' },
  { code: '002', name: '测试2', status: '禁用' }
])

const selectedRowIndex = ref(null)

// 工具栏按钮
const toolbarActions = [
  {
    title: '新增',
    icon: '/images/nav_icon_insertkey.gif',
    action: 'new'
  }
]

// 行点击 - 跳转详情
const handleRowClick = ({ rowIndex, row }) => {
  router.push({
    path: '/detail',
    query: { id: row.code }
  })
}

// 工具栏操作
const handleToolbarAction = ({ action }) => {
  if (action === 'new') {
    router.push('/detail')
  }
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">列表页面</h1>
    <MaximoTable
      v-model="selectedRowIndex"
      :columns="columns"
      :data="tableData"
      title="数据列表"
      :total-records="tableData.length"
      :current-page="1"
      :page-size="10"
      :toolbar-actions="toolbarActions"
      @row-click="handleRowClick"
      @toolbar-action="handleToolbarAction"
    />
  </div>
</template>

<style scoped>
.page-container {
  padding: 20px;
}
.page-title {
  color: #161616;
  font-size: 28px;
  margin-bottom: 30px;
  border-bottom: 2px solid #0F62FE;
  padding-bottom: 10px;
}
</style>
```

### 2. 详情页开发

**步骤:**
1. 创建详情页面组件
2. 使用 `MaximoSection` 组织表单区域
3. 使用表单组件绑定数据
4. 添加按钮组进行操作
5. 实现保存、取消等逻辑

**完整示例:**
```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MaximoSection from '../components/MaximoSection.vue'
import MaximoSectionRow from '../components/MaximoSectionRow.vue'
import MaximoSectionCol from '../components/MaximoSectionCol.vue'
import MaximoTextbox from '../components/MaximoTextbox.vue'
import MaximoButtonGroup from '../components/MaximoButtonGroup.vue'
import MaximoButton from '../components/MaximoButton.vue'

const route = useRoute()
const router = useRouter()

// 表单数据
const formData = ref({
  code: '',
  name: '',
  description: '',
  status: '草稿'
})

// 加载数据
onMounted(() => {
  const id = route.query.id
  if (id) {
    // TODO: 调用 API 加载数据
    console.log('加载数据:', id)
  }
})

// 保存
const handleSave = () => {
  // TODO: 调用 API 保存
  console.log('保存数据:', formData.value)
  router.back()
}

// 取消
const handleCancel = () => {
  router.back()
}
</script>

<template>
  <div class="detail-page">
    <h1 class="page-title">详情页面</h1>

    <!-- 基本信息 -->
    <MaximoSection title="基本信息">
      <table class="tdtblw">
        <MaximoSectionRow>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="formData.code"
              label="编码"
              :required="true"
              :readonly="true"
            />
          </MaximoSectionCol>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="formData.name"
              label="名称"
              :required="true"
            />
          </MaximoSectionCol>
        </MaximoSectionRow>
        
        <MaximoSectionRow>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="formData.status"
              label="状态"
              :readonly="true"
            />
          </MaximoSectionCol>
        </MaximoSectionRow>
        
        <MaximoSectionRow>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="formData.description"
              label="描述"
              width="100%"
            />
          </MaximoSectionCol>
        </MaximoSectionRow>
      </table>
    </MaximoSection>

    <!-- 操作按钮 -->
    <MaximoButtonGroup align="right">
      <MaximoButton label="保存" :default="true" @click="handleSave" />
      <MaximoButton label="取消" @click="handleCancel" />
    </MaximoButtonGroup>
  </div>
</template>

<style scoped>
.detail-page {
  padding: 20px;
}
.page-title {
  color: #161616;
  font-size: 28px;
  margin-bottom: 30px;
  border-bottom: 2px solid #0F62FE;
  padding-bottom: 10px;
}
</style>
```

## 查询功能实现

### 1. 简单查询

在列表页添加查询条件区域:

```vue
<MaximoSection title="查询条件">
  <table class="tdtblw">
    <MaximoSectionRow>
      <MaximoSectionCol>
        <MaximoTextbox
          v-model="queryForm.code"
          label="编码"
          placeholder="请输入编码"
        />
      </MaximoSectionCol>
      <MaximoSectionCol>
        <MaximoTextbox
          v-model="queryForm.name"
          label="名称"
          placeholder="请输入名称"
        />
      </MaximoSectionCol>
    </MaximoSectionRow>
  </table>
  
  <MaximoButtonGroup align="right">
    <MaximoButton label="查询" :default="true" @click="handleQuery" />
    <MaximoButton label="重置" @click="handleReset" />
  </MaximoButtonGroup>
</MaximoSection>
```

**查询逻辑:**
```javascript
const queryForm = ref({
  code: '',
  name: ''
})

const handleQuery = () => {
  // TODO: 调用 API 查询
  console.log('查询条件:', queryForm.value)
  // 刷新表格数据
  loadTableData()
}

const handleReset = () => {
  queryForm.value = {
    code: '',
    name: ''
  }
  loadTableData()
}
```

### 2. 高级查询

使用 MaximoTable 的筛选功能:

```javascript
const toolbarActions = [
  {
    title: '打开筛选',
    icon: '/images/tablebtn_filter_off.gif',
    action: 'open-filter'
  },
  {
    title: '清除筛选',
    icon: '/images/qf_clear_disabled.gif',
    disabled: false,
    action: 'clear-filter'
  }
]

const handleToolbarAction = ({ action }) => {
  if (action === 'open-filter') {
    // 打开筛选对话框
    showFilterDialog = true
  } else if (action === 'clear-filter') {
    // 清除筛选条件
    filterConditions.value = {}
    loadTableData()
  }
}
```

## 业务逻辑规范

### 1. 数据加载

```javascript
import { ref, onMounted } from 'vue'

const tableData = ref([])
const loading = ref(false)

// 加载表格数据
const loadTableData = async () => {
  loading.value = true
  try {
    // TODO: 替换为实际 API 调用
    // const response = await fetch('/api/data')
    // tableData.value = await response.json()
    
    // 模拟数据
    tableData.value = [
      { id: 1, name: '测试1' },
      { id: 2, name: '测试2' }
    ]
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTableData()
})
```

### 2. 表单验证

```javascript
const validateForm = () => {
  const errors = []
  
  if (!formData.value.code) {
    errors.push('编码不能为空')
  }
  
  if (!formData.value.name) {
    errors.push('名称不能为空')
  }
  
  if (errors.length > 0) {
    alert(errors.join('\n'))
    return false
  }
  
  return true
}

const handleSave = () => {
  if (!validateForm()) {
    return
  }
  
  // 保存逻辑
}
```

### 3. 路由跳转

```javascript
import { useRouter } from 'vue-router'

const router = useRouter()

// 跳转到详情页
const goToDetail = (id) => {
  router.push({
    path: '/detail',
    query: { id }
  })
}

// 返回列表
const goBack = () => {
  router.back()
}

// 替换当前路由
const replaceRoute = () => {
  router.replace('/list')
}
```

## 样式规范

### 1. 页面标题
```css
.page-title {
  color: #161616;
  font-size: 28px;
  margin-bottom: 30px;
  border-bottom: 2px solid #0F62FE;
  padding-bottom: 10px;
}
```

### 2. 表单布局
```css
.tdtblw {
  width: 100%;
  border-collapse: collapse;
}
```

### 3. 选中行样式
- 背景色: #e0e0e0
- 左边框: 4px solid #0f62fe

### 4. 主要按钮
- 背景色: #0f62fe
- 文字颜色: 白色
- 悬停: #0353e9

## 图标资源

常用图标路径(放在 `public/images/`):

| 图标 | 用途 | 路径 |
|------|------|------|
| 新建 | nav_icon_insertkey.gif | `/images/nav_icon_insertkey.gif` |
| 删除 | btn_garbage.gif | `/images/btn_garbage.gif` |
| 查找 | img_lookup.gif | `/images/img_lookup.gif` |
| 菜单 | img_menu.gif | `/images/img_menu.gif` |
| 日期 | img_date.gif | `/images/img_date.gif` |
| 筛选 | tablebtn_filter_off.gif | `/images/tablebtn_filter_off.gif` |
| 下载 | tablebtn_download.gif | `/images/tablebtn_download.gif` |
| 详情 | icon_details.gif | `/images/icon_details.gif` |

## 最佳实践

### 1. 组件命名
- 使用 PascalCase: `MaximoTextbox`, `PartsApplicationList`
- 视图文件与路由名称对应

### 2. 数据绑定
- 列表数据使用 `ref([])`
- 表单数据使用 `ref({})`
- 选中行索引使用 `ref(null)`

### 3. 事件处理
- 使用 `handle` 前缀: `handleSave`, `handleClick`
- 行点击传递 `{ rowIndex, row }`
- 工具栏操作传递 `{ action, index }`

### 4. 代码组织
- 按功能分组: 数据定义、方法定义、生命周期
- 相关逻辑放在一起
- 保持方法简洁,单一职责

### 5. 错误处理
- API 调用使用 try-catch
- 表单验证提前返回
- 用户友好的错误提示

## 常见问题

### Q1: 如何添加新路由?
在 `src/router/index.js` 中添加:
```javascript
{
  path: '/your-page',
  name: 'YourPage',
  component: () => import('../views/YourPage.vue')
}
```

### Q2: 如何实现主子表?
使用多个 `MaximoTable`,通过外键关联:
```vue
<MaximoSection title="主表信息">
  <!-- 主表字段 -->
</MaximoSection>

<MaximoSection title="子表明细">
  <MaximoTable ... />
</MaximoSection>
```

### Q3: 如何处理分页?
```javascript
const currentPage = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)

const handlePageChange = (page) => {
  currentPage.value = page
  loadTableData()
}
```

### Q4: 如何实现下拉选择?
目前使用 `MaximoTextbox` + 图标按钮,点击图标打开选择对话框:
```vue
<MaximoTextbox
  v-model="formData.category"
  label="分类"
  :show-icon="true"
  icon-src="/images/img_menu.gif"
  @icon-click="openCategoryDialog"
/>
```

## 参考文档

- [表单组件文档](../../maximo-vue-components/FORM_COMPONENTS.md)
- [按钮组件文档](../../maximo-vue-components/BUTTON_COMPONENTS.md)
- [表格组件文档](../../maximo-vue-components/TABLE_UPDATE.md)

## 示例页面

查看现有页面学习:
- 列表页: `src/views/PartsApplicationList.vue`
- 详情页: `src/views/InquiryDetail.vue`
- 组件演示: `src/views/ComponentsDemo.vue`
