# Maximo 开发示例

## 示例 1: 简单列表页

### 场景
创建一个简单的数据列表页面,支持查看、新增操作。

### 代码

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
  { key: 'status', label: '状态', width: '100px' },
  { key: 'createTime', label: '创建时间', width: '150px' }
]

// 模拟数据
const tableData = ref([
  {
    select: '',
    code: 'ITEM001',
    name: '测试项目1',
    status: '启用',
    createTime: '2024-01-01'
  },
  {
    select: '',
    code: 'ITEM002',
    name: '测试项目2',
    status: '禁用',
    createTime: '2024-01-02'
  }
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
const handleRowClick = ({ row }) => {
  router.push({
    path: '/item-detail',
    query: { code: row.code }
  })
}

// 工具栏操作
const handleToolbarAction = ({ action }) => {
  if (action === 'new') {
    router.push('/item-detail')
  }
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">项目管理</h1>
    
    <MaximoTable
      v-model="selectedRowIndex"
      :columns="columns"
      :data="tableData"
      title="项目列表"
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

---

## 示例 2: 带查询的列表页

### 场景
列表页增加查询条件区域,支持按条件筛选数据。

### 代码

```vue
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MaximoTable from '../components/MaximoTable.vue'
import MaximoSection from '../components/MaximoSection.vue'
import MaximoSectionRow from '../components/MaximoSectionRow.vue'
import MaximoSectionCol from '../components/MaximoSectionCol.vue'
import MaximoTextbox from '../components/MaximoTextbox.vue'
import MaximoButtonGroup from '../components/MaximoButtonGroup.vue'
import MaximoButton from '../components/MaximoButton.vue'

const router = useRouter()

// 查询条件
const queryForm = ref({
  code: '',
  name: ''
})

// 列配置
const columns = [
  { key: 'select', label: '', width: '50px' },
  { key: 'code', label: '编码', width: '150px' },
  { key: 'name', label: '名称', width: '200px' },
  { key: 'status', label: '状态', width: '100px' }
]

// 表格数据
const tableData = ref([])
const selectedRowIndex = ref(null)

// 工具栏按钮
const toolbarActions = [
  {
    title: '新增',
    icon: '/images/nav_icon_insertkey.gif',
    action: 'new'
  }
]

// 查询
const handleQuery = () => {
  console.log('查询条件:', queryForm.value)
  // TODO: 调用 API 查询
  loadTableData()
}

// 重置
const handleReset = () => {
  queryForm.value = {
    code: '',
    name: ''
  }
  loadTableData()
}

// 加载数据
const loadTableData = () => {
  // TODO: 根据 queryForm 调用 API
  tableData.value = [
    { select: '', code: '001', name: '测试1', status: '启用' }
  ]
}

// 行点击
const handleRowClick = ({ row }) => {
  router.push({
    path: '/detail',
    query: { code: row.code }
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
    <h1 class="page-title">数据管理</h1>
    
    <!-- 查询条件 -->
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
    
    <!-- 数据列表 -->
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

---

## 示例 3: 表单详情页

### 场景
创建编辑页面,包含表单字段和保存功能。

### 代码

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MaximoSection from '../components/MaximoSection.vue'
import MaximoSectionRow from '../components/MaximoSectionRow.vue'
import MaximoSectionCol from '../components/MaximoSectionCol.vue'
import MaximoTextbox from '../components/MaximoTextbox.vue'
import MaximoMultilineTextbox from '../components/MaximoMultilineTextbox.vue'
import MaximoButtonGroup from '../components/MaximoButtonGroup.vue'
import MaximoButton from '../components/MaximoButton.vue'

const route = useRoute()
const router = useRouter()

// 表单数据
const formData = ref({
  code: '',
  name: '',
  description: '',
  status: '草稿',
  createTime: ''
})

// 是否编辑模式
const isEdit = ref(false)

// 加载数据
onMounted(() => {
  const code = route.query.code
  if (code) {
    isEdit.value = true
    // TODO: 调用 API 加载数据
    formData.value = {
      code: code,
      name: '测试名称',
      description: '测试描述',
      status: '启用',
      createTime: '2024-01-01'
    }
  } else {
    isEdit.value = false
    // 新增模式,设置默认值
    formData.value.code = 'AUTO_' + Date.now()
  }
})

// 表单验证
const validateForm = () => {
  const errors = []
  
  if (!formData.value.name?.trim()) {
    errors.push('名称不能为空')
  }
  
  if (errors.length > 0) {
    alert(errors.join('\n'))
    return false
  }
  
  return true
}

// 保存
const handleSave = async () => {
  if (!validateForm()) return
  
  try {
    // TODO: 调用 API 保存
    console.log('保存数据:', formData.value)
    
    alert('保存成功')
    router.back()
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败')
  }
}

// 取消
const handleCancel = () => {
  router.back()
}
</script>

<template>
  <div class="detail-page">
    <h1 class="page-title">{{ isEdit ? '编辑' : '新增' }}</h1>
    
    <!-- 基本信息 -->
    <MaximoSection title="基本信息">
      <table class="tdtblw">
        <MaximoSectionRow>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="formData.code"
              label="编码"
              :required="true"
              :readonly="isEdit"
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
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="formData.createTime"
              label="创建时间"
              :readonly="true"
            />
          </MaximoSectionCol>
        </MaximoSectionRow>
        
        <MaximoSectionRow>
          <MaximoSectionCol>
            <MaximoMultilineTextbox
              v-model="formData.description"
              label="描述"
              width="100%"
              height="80px"
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

---

## 示例 4: 主子表详情页

### 场景
详情页包含主表信息和子表明细表格。

### 代码

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MaximoSection from '../components/MaximoSection.vue'
import MaximoSectionRow from '../components/MaximoSectionRow.vue'
import MaximoSectionCol from '../components/MaximoSectionCol.vue'
import MaximoTextbox from '../components/MaximoTextbox.vue'
import MaximoTable from '../components/MaximoTable.vue'
import MaximoButtonGroup from '../components/MaximoButtonGroup.vue'
import MaximoButton from '../components/MaximoButton.vue'

const route = useRoute()
const router = useRouter()

// 主表数据
const masterData = ref({
  orderNo: '',
  customer: '',
  orderDate: '',
  status: '草稿'
})

// 子表列配置
const detailColumns = [
  { key: 'productCode', label: '产品编码', width: '120px' },
  { key: 'productName', label: '产品名称', width: '200px' },
  { key: 'quantity', label: '数量', width: '100px' },
  { key: 'price', label: '单价', width: '100px' },
  { key: 'amount', label: '金额', width: '100px' }
]

// 子表数据
const detailData = ref([])
const selectedRowIndex = ref(null)

// 子表工具栏按钮
const detailToolbarActions = [
  {
    title: '新增',
    icon: '/images/nav_icon_insert.gif',
    action: 'add-detail'
  }
]

// 子表行内操作
const detailRowActions = [
  {
    title: '删除',
    icon: '/images/btn_garbage.gif',
    action: 'delete-detail'
  }
]

// 加载数据
onMounted(() => {
  const orderNo = route.query.orderNo
  if (orderNo) {
    // TODO: 调用 API 加载主表和子表数据
    masterData.value = {
      orderNo: orderNo,
      customer: '客户A',
      orderDate: '2024-01-01',
      status: '已提交'
    }
    
    detailData.value = [
      {
        productCode: 'P001',
        productName: '产品1',
        quantity: 10,
        price: 100,
        amount: 1000
      }
    ]
  }
})

// 子表工具栏操作
const handleDetailToolbarAction = ({ action }) => {
  if (action === 'add-detail') {
    // TODO: 打开新增子项对话框
    console.log('新增子项')
  }
}

// 子表行内操作
const handleDetailRowAction = ({ action, rowIndex }) => {
  if (action === 'delete-detail') {
    if (confirm('确定要删除吗?')) {
      detailData.value.splice(rowIndex, 1)
    }
  }
}

// 保存
const handleSave = () => {
  // TODO: 调用 API 保存主表和子表
  console.log('主表:', masterData.value)
  console.log('子表:', detailData.value)
  alert('保存成功')
  router.back()
}

// 取消
const handleCancel = () => {
  router.back()
}
</script>

<template>
  <div class="detail-page">
    <h1 class="page-title">订单详情</h1>
    
    <!-- 主表信息 -->
    <MaximoSection title="订单信息">
      <table class="tdtblw">
        <MaximoSectionRow>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="masterData.orderNo"
              label="订单号"
              :readonly="true"
            />
          </MaximoSectionCol>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="masterData.customer"
              label="客户"
              :required="true"
            />
          </MaximoSectionCol>
        </MaximoSectionRow>
        
        <MaximoSectionRow>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="masterData.orderDate"
              label="订单日期"
              :readonly="true"
            />
          </MaximoSectionCol>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="masterData.status"
              label="状态"
              :readonly="true"
            />
          </MaximoSectionCol>
        </MaximoSectionRow>
      </table>
    </MaximoSection>
    
    <!-- 子表明细 -->
    <MaximoSection title="订单明细">
      <MaximoTable
        v-model="selectedRowIndex"
        :columns="detailColumns"
        :data="detailData"
        title="明细列表"
        :total-records="detailData.length"
        :current-page="1"
        :page-size="10"
        :toolbar-actions="detailToolbarActions"
        :show-action-column="true"
        :row-actions="detailRowActions"
        @toolbar-action="handleDetailToolbarAction"
        @row-action="handleDetailRowAction"
      />
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

---

## 示例 5: 带查找功能的表单

### 场景
表单字段需要弹出选择对话框进行选择。

### 代码

```vue
<script setup>
import { ref } from 'vue'
import MaximoSection from '../components/MaximoSection.vue'
import MaximoSectionRow from '../components/MaximoSectionRow.vue'
import MaximoSectionCol from '../components/MaximoSectionCol.vue'
import MaximoTextbox from '../components/MaximoTextbox.vue'
import MaximoButtonGroup from '../components/MaximoButtonGroup.vue'
import MaximoButton from '../components/MaximoButton.vue'

// 表单数据
const formData = ref({
  customerCode: '',
  customerName: '',
  contactPerson: '',
  phone: ''
})

// 打开客户选择对话框
const openCustomerDialog = () => {
  // TODO: 打开选择对话框
  // 这里简化处理,直接赋值
  formData.value.customerCode = 'CUST001'
  formData.value.customerName = '客户A'
  formData.value.contactPerson = '张三'
  formData.value.phone = '13800138000'
}

// 保存
const handleSave = () => {
  console.log('保存:', formData.value)
  alert('保存成功')
}

// 取消
const handleCancel = () => {
  console.log('取消')
}
</script>

<template>
  <div class="form-page">
    <h1 class="page-title">客户信息</h1>
    
    <MaximoSection title="客户信息">
      <table class="tdtblw">
        <MaximoSectionRow>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="formData.customerCode"
              label="客户编码"
              :required="true"
              :readonly="true"
              :show-icon="true"
              icon-src="/images/img_lookup.gif"
              icon-alt="选择客户"
              @icon-click="openCustomerDialog"
            />
          </MaximoSectionCol>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="formData.customerName"
              label="客户名称"
              :readonly="true"
            />
          </MaximoSectionCol>
        </MaximoSectionRow>
        
        <MaximoSectionRow>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="formData.contactPerson"
              label="联系人"
              :readonly="true"
            />
          </MaximoSectionCol>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="formData.phone"
              label="联系电话"
              :readonly="true"
            />
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
.form-page {
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

---

## 示例 6: 多标签页

### 场景
详情页包含多个标签页,每个标签页显示不同的内容。

### 代码

```vue
<script setup>
import { ref } from 'vue'
import MaximoSection from '../components/MaximoSection.vue'
import MaximoSectionRow from '../components/MaximoSectionRow.vue'
import MaximoSectionCol from '../components/MaximoSectionCol.vue'
import MaximoTextbox from '../components/MaximoTextbox.vue'
import MaximoTable from '../components/MaximoTable.vue'
import MaximoButtonGroup from '../components/MaximoButtonGroup.vue'
import MaximoButton from '../components/MaximoButton.vue'

// 当前激活的标签
const activeTab = ref('basic')

// 基本信息
const basicInfo = ref({
  code: '001',
  name: '测试',
  status: '启用'
})

// 日志表格
const logColumns = [
  { key: 'time', label: '时间', width: '150px' },
  { key: 'operator', label: '操作人', width: '100px' },
  { key: 'action', label: '操作', width: '200px' }
]

const logData = ref([
  { time: '2024-01-01 10:00', operator: 'admin', action: '创建' },
  { time: '2024-01-02 11:00', operator: 'user1', action: '修改' }
])

const selectedRowIndex = ref(null)

// 切换标签
const switchTab = (tab) => {
  activeTab.value = tab
}
</script>

<template>
  <div class="detail-page">
    <h1 class="page-title">详细信息</h1>
    
    <!-- 标签导航 -->
    <div class="tab-nav">
      <button 
        :class="['tab-btn', { active: activeTab === 'basic' }]"
        @click="switchTab('basic')"
      >
        基本信息
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'logs' }]"
        @click="switchTab('logs')"
      >
        操作日志
      </button>
    </div>
    
    <!-- 基本信息标签 -->
    <div v-show="activeTab === 'basic'" class="tab-content">
      <MaximoSection title="基本信息">
        <table class="tdtblw">
          <MaximoSectionRow>
            <MaximoSectionCol>
              <MaximoTextbox
                v-model="basicInfo.code"
                label="编码"
                :readonly="true"
              />
            </MaximoSectionCol>
            <MaximoSectionCol>
              <MaximoTextbox
                v-model="basicInfo.name"
                label="名称"
              />
            </MaximoSectionCol>
          </MaximoSectionRow>
          
          <MaximoSectionRow>
            <MaximoSectionCol>
              <MaximoTextbox
                v-model="basicInfo.status"
                label="状态"
                :readonly="true"
              />
            </MaximoSectionCol>
          </MaximoSectionRow>
        </table>
      </MaximoSection>
    </div>
    
    <!-- 操作日志标签 -->
    <div v-show="activeTab === 'logs'" class="tab-content">
      <MaximoSection title="操作日志">
        <MaximoTable
          v-model="selectedRowIndex"
          :columns="logColumns"
          :data="logData"
          title="日志列表"
          :total-records="logData.length"
          :current-page="1"
          :page-size="10"
        />
      </MaximoSection>
    </div>
    
    <MaximoButtonGroup align="right">
      <MaximoButton label="保存" :default="true" />
      <MaximoButton label="关闭" />
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

.tab-nav {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid #c6c6c6;
}

.tab-btn {
  padding: 10px 20px;
  border: 1px solid #c6c6c6;
  border-bottom: none;
  background: #f5f5f5;
  cursor: pointer;
  border-radius: 4px 4px 0 0;
}

.tab-btn.active {
  background: white;
  border-bottom: 1px solid white;
  margin-bottom: -1px;
  font-weight: bold;
}

.tab-content {
  min-height: 200px;
}
</style>
```

---

## 学习建议

1. **从简单开始**: 先实现列表页,再实现详情页
2. **复用组件**: 充分利用现有的 Maximo 组件
3. **参考示例**: 查看 `src/views/` 下的现有页面
4. **逐步完善**: 先实现基本功能,再添加查询、验证等高级功能
5. **保持一致**: 遵循项目的命名规范和代码风格
