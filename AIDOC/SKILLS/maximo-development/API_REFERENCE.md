# Maximo 组件 API 参考

## 表单组件

### MaximoTextbox

**Props:**

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| modelValue | String/Number | '' | 否 | 绑定值(v-model) |
| label | String | - | 是 | 标签文本 |
| required | Boolean | false | 否 | 是否显示必填标识 |
| readonly | Boolean | false | 否 | 是否只读 |
| placeholder | String | '' | 否 | 占位符文本 |
| width | String | '16.1ch' | 否 | 输入框宽度 |
| inputType | String | 'text' | 否 | 输入类型: text/password/date/time |
| showIcon | Boolean | false | 否 | 是否显示右侧图标 |
| iconSrc | String | '' | 否 | 图标路径 |
| iconAlt | String | '' | 否 | 图标 alt 文本 |

**Events:**

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:modelValue | value | 值变化时触发 |
| input | value | 输入时触发 |
| change | value | 失去焦点时触发 |
| icon-click | - | 图标点击时触发 |

**示例:**
```vue
<MaximoTextbox
  v-model="value"
  label="用户名"
  :required="true"
  :show-icon="true"
  icon-src="/images/img_lookup.gif"
  @icon-click="handleLookup"
/>
```

---

### MaximoMultilineTextbox

**Props:**

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| modelValue | String | '' | 否 | 绑定值 |
| label | String | - | 是 | 标签文本 |
| required | Boolean | false | 否 | 是否必填 |
| readonly | Boolean | false | 否 | 是否只读 |
| placeholder | String | '' | 否 | 占位符 |
| width | String | '1000px' | 否 | 文本域宽度 |
| height | String | '80px' | 否 | 文本域高度 |

**Events:**

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:modelValue | value | 值变化 |
| input | value | 输入事件 |
| change | value | 变更事件 |

---

### MaximoMultipartTextbox

**Props:**

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| modelValue | Object | { first: '', second: '' } | 否 | 绑定值(对象) |
| label | String | - | 是 | 标签文本 |
| required | Boolean | false | 否 | 是否必填 |
| readonly | Boolean | false | 否 | 是否只读 |
| firstPlaceholder | String | '' | 否 | 第一个输入框占位符 |
| secondPlaceholder | String | '' | 否 | 第二个输入框占位符 |
| partWidth | String | '16.1ch' | 否 | 每个输入框宽度 |

**数据格式:**
```javascript
{
  first: '第一个值',
  second: '第二个值'
}
```

---

## 布局组件

### MaximoSection

**Props:**

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| title | String | - | 是 | 区域标题 |
| collapsible | Boolean | false | 否 | 是否可折叠 |
| collapsed | Boolean | false | 否 | 是否折叠状态 |

**Slots:**

| 插槽名 | 说明 |
|--------|------|
| default | 区域内容 |

**示例:**
```vue
<MaximoSection title="基本信息">
  <table class="tdtblw">
    <!-- 表单内容 -->
  </table>
</MaximoSection>
```

---

### MaximoSectionRow

表示表格中的一行,必须放在 `<table class="tdtblw">` 内。

**示例:**
```vue
<MaximoSectionRow>
  <MaximoSectionCol>
    <!-- 第一列内容 -->
  </MaximoSectionCol>
  <MaximoSectionCol>
    <!-- 第二列内容 -->
  </MaximoSectionCol>
</MaximoSectionRow>
```

---

### MaximoSectionCol

表示表格中的一个单元格,通常包含一个表单组件。

**注意:** 每行最多 3 列

---

## 表格组件

### MaximoTable

**Props:**

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| modelValue | Number | null | 否 | 选中行索引(v-model) |
| columns | Array | [] | 是 | 列配置数组 |
| data | Array | [] | 是 | 表格数据数组 |
| title | String | '表格(table)' | 否 | 表格标题 |
| showToolbar | Boolean | true | 否 | 是否显示工具栏 |
| showFooter | Boolean | true | 否 | 是否显示底部 |
| showRecordCount | Boolean | true | 否 | 是否显示记录数 |
| totalRecords | Number | 0 | 否 | 总记录数 |
| pageSize | Number | 5 | 否 | 每页记录数 |
| currentPage | Number | 1 | 否 | 当前页码 |
| toolbarActions | Array | [] | 否 | 工具栏按钮配置 |
| primaryAction | Object | null | 否 | 主要操作按钮 |
| customActionsFirst | Boolean | false | 否 | 自定义按钮是否在默认按钮之前 |
| showActionColumn | Boolean | false | 否 | 是否显示操作列 |
| rowActions | Array | [] | 否 | 行内操作按钮配置 |

**列配置格式:**
```javascript
{
  key: 'fieldName',      // 字段名
  label: '列标题',        // 列标题
  width: '120px'         // 列宽度(可选)
}
```

**工具栏按钮配置:**
```javascript
{
  title: '按钮提示',      // tooltip 文本
  icon: '/path/to/icon', // 图标路径
  action: 'action-name', // 动作标识
  disabled: false        // 是否禁用(可选)
}
```

**行内操作按钮配置:**
```javascript
{
  title: '操作名称',
  icon: '/path/to/icon',
  action: 'action-name'
}
```

**Events:**

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:modelValue | rowIndex (Number) | 选中行变化 |
| row-click | { rowIndex, row } | 行点击事件 |
| toolbar-action | { action, index } | 工具栏按钮点击 |
| primary-action | - | 主要操作按钮点击 |
| page-change | page (Number) | 分页变化 |
| row-action | { action, rowIndex, row } | 行内操作按钮点击 |

**完整示例:**
```vue
<MaximoTable
  v-model="selectedRowIndex"
  :columns="[
    { key: 'code', label: '编码', width: '120px' },
    { key: 'name', label: '名称', width: '200px' }
  ]"
  :data="tableData"
  title="数据列表"
  :total-records="100"
  :current-page="1"
  :page-size="10"
  :toolbar-actions="[
    {
      title: '新增',
      icon: '/images/nav_icon_insertkey.gif',
      action: 'new'
    }
  ]"
  :primary-action="{ label: '查询', action: 'query' }"
  :show-action-column="true"
  :row-actions="[
    {
      title: '编辑',
      icon: '/images/icon_details.gif',
      action: 'edit'
    }
  ]"
  @row-click="handleRowClick"
  @toolbar-action="handleToolbarAction"
  @primary-action="handlePrimaryAction"
  @page-change="handlePageChange"
  @row-action="handleRowAction"
/>
```

---

## 按钮组件

### MaximoButton

**Props:**

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| label | String | '' | 否 | 按钮文本 |
| type | String | 'button' | 否 | 按钮类型: button/submit/reset |
| default | Boolean | false | 否 | 是否为主要按钮(蓝色背景) |
| disabled | Boolean | false | 否 | 是否禁用 |
| title | String | '' | 否 | 按钮 tooltip |
| customClass | String | '' | 否 | 自定义类名 |

**Events:**

| 事件名 | 参数 | 说明 |
|--------|------|------|
| click | event | 点击事件 |

**Slots:**

| 插槽名 | 说明 |
|--------|------|
| default | 按钮内容(可选,用于自定义 HTML) |

**示例:**
```vue
<!-- 使用 label -->
<MaximoButton label="保存" :default="true" @click="save" />

<!-- 使用 slot -->
<MaximoButton @click="handler">
  <span style="font-weight: bold;">自定义内容</span>
</MaximoButton>
```

---

### MaximoButtonGroup

**Props:**

| 属性 | 类型 | 默认值 | 必填 | 说明 |
|------|------|--------|------|------|
| align | String | 'right' | 否 | 对齐方式: left/center/right |
| bottom | Boolean | false | 否 | 是否为底部按钮组 |
| invisible | Boolean | false | 否 | 是否隐藏容器样式 |
| customClass | String | '' | 否 | 自定义类名 |

**Slots:**

| 插槽名 | 说明 |
|--------|------|
| default | 放置 MaximoButton 组件 |

**示例:**
```vue
<MaximoButtonGroup align="right">
  <MaximoButton label="保存" :default="true" @click="save" />
  <MaximoButton label="取消" @click="cancel" />
  <MaximoButton label="关闭" @click="close" />
</MaximoButtonGroup>
```

---

## 样式变量

### 颜色

| 用途 | 颜色值 |
|------|--------|
| 主题蓝 | #0f62fe |
| 悬停蓝 | #0353e9 |
| 边框灰 | #c6c6c6 |
| 背景灰 | #f5f5f5 |
| 选中行灰 | #e0e0e0 |
| 悬停行灰 | #f5f5f5 |
| 文字黑 | #161616 |
| 必填红 | #da1e28 |

### 尺寸

| 用途 | 尺寸 |
|------|------|
| 输入框高度 | 40px |
| 图标按钮尺寸 | 40x40px |
| 图标尺寸 | 22x22px |
| 标签最小宽度 | 200px |
| 按钮间距 | 8px |
| 选中行左边框 | 4px |

### 字体

| 用途 | 大小 |
|------|------|
| 页面标题 | 28px |
| 区域标题 | 16px |
| 表格表头 | 14px |
| 表格内容 | 13px |
| 标签文字 | 13px |

---

## 路由配置

### 添加新路由

在 `src/router/index.js` 中:

```javascript
import YourComponent from '../views/YourComponent.vue'

const routes = [
  // ... 现有路由
  {
    path: '/your-path',
    name: 'YourRouteName',
    component: YourComponent
  }
]
```

### 路由跳转

```javascript
import { useRouter } from 'vue-router'

const router = useRouter()

// 普通跳转
router.push('/path')

// 带参数
router.push({
  path: '/detail',
  query: { id: 123 }
})

// 命名路由
router.push({
  name: 'DetailPage',
  params: { id: 123 }
})

// 返回
router.back()

// 替换
router.replace('/new-path')
```

### 获取路由参数

```javascript
import { useRoute } from 'vue-router'

const route = useRoute()

// 查询参数
const id = route.query.id

// 路由参数
const id = route.params.id
```

---

## 数据交互模式

### 1. 列表加载

```javascript
const tableData = ref([])
const loading = ref(false)

const loadTableData = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/list')
    tableData.value = await response.json()
  } catch (error) {
    console.error('加载失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTableData()
})
```

### 2. 详情加载

```javascript
const formData = ref({})

const loadDetail = async (id) => {
  try {
    const response = await fetch(`/api/detail/${id}`)
    formData.value = await response.json()
  } catch (error) {
    console.error('加载详情失败:', error)
  }
}

onMounted(() => {
  const id = route.query.id
  if (id) {
    loadDetail(id)
  }
})
```

### 3. 保存数据

```javascript
const handleSave = async () => {
  if (!validateForm()) return
  
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

### 4. 删除数据

```javascript
const handleDelete = async (id) => {
  if (!confirm('确定要删除吗?')) return
  
  try {
    await fetch(`/api/delete/${id}`, {
      method: 'DELETE'
    })
    
    alert('删除成功')
    loadTableData() // 刷新列表
  } catch (error) {
    console.error('删除失败:', error)
  }
}
```

---

## 表单验证

### 基础验证

```javascript
const validateForm = () => {
  const errors = []
  
  if (!formData.value.code?.trim()) {
    errors.push('编码不能为空')
  }
  
  if (!formData.value.name?.trim()) {
    errors.push('名称不能为空')
  }
  
  if (formData.value.age && (formData.value.age < 0 || formData.value.age > 150)) {
    errors.push('年龄必须在 0-150 之间')
  }
  
  if (errors.length > 0) {
    alert(errors.join('\n'))
    return false
  }
  
  return true
}
```

### 正则验证

```javascript
const validators = {
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value) => /^1[3-9]\d{9}$/.test(value),
  number: (value) => /^\d+$/.test(value)
}

const validateField = (field, value, rule) => {
  if (!validators[rule](value)) {
    return `${field} 格式不正确`
  }
  return null
}
```

---

## 常见工具函数

### 日期格式化

```javascript
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

### 防抖函数

```javascript
const debounce = (fn, delay = 300) => {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// 使用
const handleSearch = debounce((keyword) => {
  // 搜索逻辑
}, 500)
```

### 深拷贝

```javascript
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj))
}
```

---

## 调试技巧

### 1. 打印响应式数据

```javascript
import { toRaw } from 'vue'

// 打印原始数据
console.log(toRaw(tableData.value))
```

### 2. Vue DevTools

安装 Vue DevTools 浏览器扩展,可以:
- 查看组件树
- 检查响应式数据
- 追踪事件
- 性能分析

### 3. 网络请求调试

```javascript
// 添加请求日志
const fetchData = async (url) => {
  console.log('请求 URL:', url)
  const start = Date.now()
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    
    console.log('响应时间:', Date.now() - start, 'ms')
    console.log('响应数据:', data)
    
    return data
  } catch (error) {
    console.error('请求失败:', error)
    throw error
  }
}
```
