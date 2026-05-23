# Maximo 开发快速参考

## 🎯 常用组件速查

### 表单组件

```vue
<!-- 单行文本框 -->
<MaximoTextbox v-model="value" label="字段名" :required="true" />

<!-- 多行文本框 -->
<MaximoMultilineTextbox v-model="value" label="备注" height="80px" />

<!-- 多部分文本框 -->
<MaximoMultipartTextbox v-model="{ first: '', second: '' }" label="范围" />

<!-- 带查找图标 -->
<MaximoTextbox 
  v-model="value" 
  label="字段" 
  :show-icon="true"
  icon-src="/images/img_lookup.gif"
  @icon-click="handleLookup"
/>
```

### 布局组件

```vue
<MaximoSection title="区域标题">
  <table class="tdtblw">
    <MaximoSectionRow>
      <MaximoSectionCol>
        <!-- 第一列 -->
      </MaximoSectionCol>
      <MaximoSectionCol>
        <!-- 第二列 -->
      </MaximoSectionCol>
      <MaximoSectionCol>
        <!-- 第三列(可选) -->
      </MaximoSectionCol>
    </MaximoSectionRow>
  </table>
</MaximoSection>
```

### 表格组件

```vue
<MaximoTable
  v-model="selectedRowIndex"
  :columns="columns"
  :data="tableData"
  title="列表标题"
  :total-records="total"
  :current-page="page"
  :page-size="pageSize"
  :toolbar-actions="toolbarActions"
  :primary-action="primaryAction"
  :show-action-column="true"
  :row-actions="rowActions"
  @row-click="handleRowClick"
  @toolbar-action="handleToolbarAction"
  @primary-action="handlePrimaryAction"
  @page-change="handlePageChange"
  @row-action="handleRowAction"
/>
```

### 按钮组件

```vue
<!-- 单个按钮 -->
<MaximoButton label="保存" :default="true" @click="save" />

<!-- 按钮组 -->
<MaximoButtonGroup align="right">
  <MaximoButton label="保存" :default="true" @click="save" />
  <MaximoButton label="取消" @click="cancel" />
</MaximoButtonGroup>
```

---

## 🔧 常用配置

### 表格列配置

```javascript
const columns = [
  { key: 'select', label: '', width: '50px' },
  { key: 'code', label: '编码', width: '120px' },
  { key: 'name', label: '名称', width: '200px' },
  { key: 'status', label: '状态', width: '100px' }
]
```

### 工具栏按钮配置

```javascript
const toolbarActions = [
  {
    title: '新增',
    icon: '/images/nav_icon_insertkey.gif',
    action: 'new'
  },
  {
    title: '删除',
    icon: '/images/btn_garbage.gif',
    action: 'delete'
  }
]
```

### 行内操作配置

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

---

## 📝 常用代码片段

### 列表页模板

```vue
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MaximoTable from '../components/MaximoTable.vue'

const router = useRouter()

const columns = [/* 列配置 */]
const tableData = ref([/* 数据 */])
const selectedRowIndex = ref(null)
const toolbarActions = [/* 按钮配置 */]

const handleRowClick = ({ row }) => {
  router.push({ path: '/detail', query: { id: row.id } })
}

const handleToolbarAction = ({ action }) => {
  if (action === 'new') router.push('/detail')
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">页面标题</h1>
    <MaximoTable
      v-model="selectedRowIndex"
      :columns="columns"
      :data="tableData"
      title="列表标题"
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
.page-container { padding: 20px; }
.page-title {
  color: #161616;
  font-size: 28px;
  margin-bottom: 30px;
  border-bottom: 2px solid #0F62FE;
  padding-bottom: 10px;
}
</style>
```

### 详情页模板

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

const formData = ref({ field1: '', field2: '' })

onMounted(() => {
  const id = route.query.id
  if (id) loadDetail(id)
})

const validateForm = () => {
  if (!formData.value.field1) {
    alert('字段1不能为空')
    return false
  }
  return true
}

const handleSave = async () => {
  if (!validateForm()) return
  // TODO: 调用 API 保存
  alert('保存成功')
  router.back()
}

const handleCancel = () => router.back()
</script>

<template>
  <div class="detail-page">
    <h1 class="page-title">详情页面</h1>
    
    <MaximoSection title="基本信息">
      <table class="tdtblw">
        <MaximoSectionRow>
          <MaximoSectionCol>
            <MaximoTextbox v-model="formData.field1" label="字段1" :required="true" />
          </MaximoSectionCol>
          <MaximoSectionCol>
            <MaximoTextbox v-model="formData.field2" label="字段2" />
          </MaximoSectionCol>
        </MaximoSectionRow>
      </table>
    </MaximoSection>
    
    <MaximoButtonGroup align="right">
      <MaximoButton label="保存" :default="true" @click="handleSave" />
      <MaximoButton label="取消" @click="handleCancel" />
    </MaximoButtonGroup>
  </div>
</template>

<style scoped>
.detail-page { padding: 20px; }
.page-title {
  color: #161616;
  font-size: 28px;
  margin-bottom: 30px;
  border-bottom: 2px solid #0F62FE;
  padding-bottom: 10px;
}
</style>
```

### 查询功能

```vue
<script setup>
const queryForm = ref({ field1: '', field2: '' })

const handleQuery = () => {
  // TODO: 调用 API 查询
  loadTableData()
}

const handleReset = () => {
  queryForm.value = { field1: '', field2: '' }
  loadTableData()
}
</script>

<template>
  <MaximoSection title="查询条件">
    <table class="tdtblw">
      <MaximoSectionRow>
        <MaximoSectionCol>
          <MaximoTextbox v-model="queryForm.field1" label="字段1" />
        </MaximoSectionCol>
        <MaximoSectionCol>
          <MaximoTextbox v-model="queryForm.field2" label="字段2" />
        </MaximoSectionCol>
      </MaximoSectionRow>
    </table>
    
    <MaximoButtonGroup align="right">
      <MaximoButton label="查询" :default="true" @click="handleQuery" />
      <MaximoButton label="重置" @click="handleReset" />
    </MaximoButtonGroup>
  </MaximoSection>
</template>
```

---

## 🎨 样式变量

### 颜色

| 用途 | 值 |
|------|-----|
| 主题蓝 | `#0f62fe` |
| 悬停蓝 | `#0353e9` |
| 边框灰 | `#c6c6c6` |
| 背景灰 | `#f5f5f5` |
| 选中行 | `#e0e0e0` |
| 文字黑 | `#161616` |
| 必填红 | `#da1e28` |

### 尺寸

| 用途 | 值 |
|------|-----|
| 输入框高度 | `40px` |
| 图标按钮 | `40x40px` |
| 图标大小 | `22x22px` |
| 标签最小宽 | `200px` |
| 按钮间距 | `8px` |
| 选中行边框 | `4px` |

---

## 🖼️ 常用图标

| 图标 | 路径 | 用途 |
|------|------|------|
| 新建 | `/images/nav_icon_insertkey.gif` | 新增按钮 |
| 删除 | `/images/btn_garbage.gif` | 删除按钮 |
| 查找 | `/images/img_lookup.gif` | 查找按钮 |
| 菜单 | `/images/img_menu.gif` | 下拉菜单 |
| 日期 | `/images/img_date.gif` | 日期选择 |
| 筛选 | `/images/tablebtn_filter_off.gif` | 筛选按钮 |
| 下载 | `/images/tablebtn_download.gif` | 下载按钮 |
| 详情 | `/images/icon_details.gif` | 查看详情 |

---

## 🔀 路由跳转

```javascript
import { useRouter } from 'vue-router'
const router = useRouter()

// 普通跳转
router.push('/path')

// 带参数
router.push({ path: '/detail', query: { id: 123 } })

// 返回
router.back()

// 替换
router.replace('/new-path')
```

获取参数:
```javascript
import { useRoute } from 'vue-router'
const route = useRoute()
const id = route.query.id
```

---

## 📦 数据交互

### 加载列表

```javascript
const loadTableData = async () => {
  try {
    const response = await fetch('/api/list')
    tableData.value = await response.json()
  } catch (error) {
    console.error('加载失败:', error)
  }
}
```

### 加载详情

```javascript
const loadDetail = async (id) => {
  try {
    const response = await fetch(`/api/detail/${id}`)
    formData.value = await response.json()
  } catch (error) {
    console.error('加载失败:', error)
  }
}
```

### 保存数据

```javascript
const handleSave = async () => {
  try {
    await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value)
    })
    alert('保存成功')
    router.back()
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败')
  }
}
```

---

## ✅ 检查清单

### 列表页
- [ ] 路由配置
- [ ] 列配置
- [ ] 测试数据
- [ ] 工具栏按钮
- [ ] 行点击事件
- [ ] 页面标题

### 详情页
- [ ] 路由配置
- [ ] 表单数据
- [ ] 数据加载
- [ ] 表单验证
- [ ] 保存逻辑
- [ ] 取消逻辑
- [ ] 必填标识
- [ ] 只读设置

### 查询功能
- [ ] 查询表单
- [ ] 查询方法
- [ ] 重置方法
- [ ] 集成加载

### 分页功能
- [ ] 分页变量
- [ ] 分页配置
- [ ] 分页切换
- [ ] 数据加载

---

## 🐛 常见问题

### Q: 页面空白?
**A:** 检查路由配置和控制台错误

### Q: 数据不显示?
**A:** 检查列配置 key 是否匹配数据字段

### Q: 样式错乱?
**A:** 确认使用 `<table class="tdtblw">`

### Q: 按钮不响应?
**A:** 检查 `@click` 绑定和方法定义

### Q: 验证不生效?
**A:** 确认在保存前调用验证方法

---

## 📚 完整文档

详细文档请查看:
- **SKILL.md** - 核心开发指南
- **API_REFERENCE.md** - API 详细说明
- **EXAMPLES.md** - 完整代码示例
- **WORKFLOW.md** - 开发工作流程

---

**提示:** 将此文件加入书签或打印出来,方便日常开发时快速查阅!
