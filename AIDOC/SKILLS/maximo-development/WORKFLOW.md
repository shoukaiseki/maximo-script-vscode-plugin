# Maximo 开发工作流程

## 完整开发流程

### 阶段 1: 需求分析

**目标:** 明确页面功能和数据结构

**步骤:**
1. 确定页面类型(列表页/详情页/弹窗)
2. 列出所有字段及其属性(必填、只读、类型)
3. 确定查询条件
4. 确定操作按钮
5. 确定主子表关系

**输出:**
- 页面原型图或草图
- 字段清单
- 业务流程说明

---

### 阶段 2: 创建路由

**位置:** `src/router/index.js`

**步骤:**
1. 导入页面组件
2. 添加路由配置
3. 测试路由是否可访问

**示例:**
```javascript
import YourPage from '../views/YourPage.vue'

const routes = [
  {
    path: '/your-page',
    name: 'YourPage',
    component: YourPage
  }
]
```

**验证:**
```bash
npm run dev
# 访问 http://localhost:5173/your-page
```

---

### 阶段 3: 创建列表页

**位置:** `src/views/YourList.vue`

**步骤:**

#### 3.1 定义列配置
```javascript
const columns = [
  { key: 'select', label: '', width: '50px' },
  { key: 'field1', label: '字段1', width: '150px' },
  { key: 'field2', label: '字段2', width: '200px' }
]
```

#### 3.2 准备测试数据
```javascript
const tableData = ref([
  {
    select: '',
    field1: '值1',
    field2: '值2'
  }
])
```

#### 3.3 配置工具栏按钮
```javascript
const toolbarActions = [
  {
    title: '新增',
    icon: '/images/nav_icon_insertkey.gif',
    action: 'new'
  }
]
```

#### 3.4 实现事件处理
```javascript
const handleRowClick = ({ row }) => {
  router.push({
    path: '/detail',
    query: { id: row.id }
  })
}

const handleToolbarAction = ({ action }) => {
  if (action === 'new') {
    router.push('/detail')
  }
}
```

#### 3.5 编写模板
```vue
<template>
  <div class="page-container">
    <h1 class="page-title">页面标题</h1>
    
    <!-- 可选: 查询条件 -->
    <MaximoSection title="查询条件" v-if="hasQuery">
      <!-- 查询表单 -->
    </MaximoSection>
    
    <!-- 表格 -->
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
```

#### 3.6 添加样式
```vue
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

### 阶段 4: 创建详情页

**位置:** `src/views/YourDetail.vue`

**步骤:**

#### 4.1 定义表单数据
```javascript
const formData = ref({
  field1: '',
  field2: '',
  field3: ''
})
```

#### 4.2 加载数据
```javascript
onMounted(() => {
  const id = route.query.id
  if (id) {
    // TODO: 调用 API 加载数据
    loadDetail(id)
  }
})
```

#### 4.3 实现表单验证
```javascript
const validateForm = () => {
  const errors = []
  
  if (!formData.value.field1) {
    errors.push('字段1不能为空')
  }
  
  if (errors.length > 0) {
    alert(errors.join('\n'))
    return false
  }
  
  return true
}
```

#### 4.4 实现保存逻辑
```javascript
const handleSave = async () => {
  if (!validateForm()) return
  
  try {
    // TODO: 调用 API 保存
    await saveData(formData.value)
    alert('保存成功')
    router.back()
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败')
  }
}
```

#### 4.5 编写模板
```vue
<template>
  <div class="detail-page">
    <h1 class="page-title">{{ isEdit ? '编辑' : '新增' }}</h1>
    
    <MaximoSection title="基本信息">
      <table class="tdtblw">
        <MaximoSectionRow>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="formData.field1"
              label="字段1"
              :required="true"
            />
          </MaximoSectionCol>
          <MaximoSectionCol>
            <MaximoTextbox
              v-model="formData.field2"
              label="字段2"
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
```

---

### 阶段 5: 集成 API

**步骤:**

#### 5.1 创建 API 模块
```javascript
// src/api/yourApi.js
export const getList = (params) => {
  return fetch('/api/your-list', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  }).then(res => res.json())
}

export const getDetail = (id) => {
  return fetch(`/api/your-detail/${id}`).then(res => res.json())
}

export const saveData = (data) => {
  return fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json())
}

export const deleteData = (id) => {
  return fetch(`/api/delete/${id}`, {
    method: 'DELETE'
  }).then(res => res.json())
}
```

#### 5.2 在页面中调用
```javascript
import { getList, getDetail, saveData } from '../api/yourApi'

// 加载列表
const loadTableData = async () => {
  loading.value = true
  try {
    tableData.value = await getList(queryForm.value)
  } catch (error) {
    console.error('加载失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载详情
const loadDetail = async (id) => {
  try {
    formData.value = await getDetail(id)
  } catch (error) {
    console.error('加载详情失败:', error)
  }
}

// 保存
const handleSave = async () => {
  if (!validateForm()) return
  
  try {
    await saveData(formData.value)
    alert('保存成功')
    router.back()
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败')
  }
}
```

---

### 阶段 6: 添加查询功能

**步骤:**

#### 6.1 定义查询表单
```javascript
const queryForm = ref({
  field1: '',
  field2: ''
})
```

#### 6.2 添加查询区域
```vue
<MaximoSection title="查询条件">
  <table class="tdtblw">
    <MaximoSectionRow>
      <MaximoSectionCol>
        <MaximoTextbox
          v-model="queryForm.field1"
          label="字段1"
          placeholder="请输入"
        />
      </MaximoSectionCol>
      <MaximoSectionCol>
        <MaximoTextbox
          v-model="queryForm.field2"
          label="字段2"
          placeholder="请输入"
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

#### 6.3 实现查询逻辑
```javascript
const handleQuery = () => {
  currentPage.value = 1
  loadTableData()
}

const handleReset = () => {
  queryForm.value = {
    field1: '',
    field2: ''
  }
  currentPage.value = 1
  loadTableData()
}
```

---

### 阶段 7: 实现分页

**步骤:**

#### 7.1 定义分页变量
```javascript
const currentPage = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0)
```

#### 7.2 配置表格分页
```vue
<MaximoTable
  :total-records="totalRecords"
  :current-page="currentPage"
  :page-size="pageSize"
  @page-change="handlePageChange"
/>
```

#### 7.3 实现分页切换
```javascript
const handlePageChange = (page) => {
  currentPage.value = page
  loadTableData()
}
```

#### 7.4 更新加载逻辑
```javascript
const loadTableData = async () => {
  try {
    const result = await getList({
      ...queryForm.value,
      page: currentPage.value,
      pageSize: pageSize.value
    })
    
    tableData.value = result.data
    totalRecords.value = result.total
  } catch (error) {
    console.error('加载失败:', error)
  }
}
```

---

### 阶段 8: 添加子表

**步骤:**

#### 8.1 定义子表配置
```javascript
const detailColumns = [
  { key: 'itemCode', label: '项目编码', width: '120px' },
  { key: 'itemName', label: '项目名称', width: '200px' },
  { key: 'quantity', label: '数量', width: '100px' }
]

const detailData = ref([])
```

#### 8.2 配置子表按钮
```javascript
const detailToolbarActions = [
  {
    title: '新增',
    icon: '/images/nav_icon_insert.gif',
    action: 'add-item'
  }
]

const detailRowActions = [
  {
    title: '删除',
    icon: '/images/btn_garbage.gif',
    action: 'delete-item'
  }
]
```

#### 8.3 添加子表到模板
```vue
<MaximoSection title="明细信息">
  <MaximoTable
    v-model="selectedDetailIndex"
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
```

#### 8.4 实现子表操作
```javascript
const handleDetailToolbarAction = ({ action }) => {
  if (action === 'add-item') {
    // 打开新增对话框
    showItemDialog.value = true
  }
}

const handleDetailRowAction = ({ action, rowIndex }) => {
  if (action === 'delete-item') {
    if (confirm('确定要删除吗?')) {
      detailData.value.splice(rowIndex, 1)
    }
  }
}
```

---

### 阶段 9: 测试与调试

**检查清单:**

#### 功能测试
- [ ] 列表数据正确显示
- [ ] 查询功能正常工作
- [ ] 分页功能正常
- [ ] 行点击跳转正确
- [ ] 新增/编辑页面可访问
- [ ] 表单验证生效
- [ ] 保存功能正常
- [ ] 取消返回正确
- [ ] 删除确认提示
- [ ] 子表操作正常

#### UI 测试
- [ ] 页面标题样式正确
- [ ] 表单对齐整齐
- [ ] 按钮位置正确
- [ ] 表格列宽合适
- [ ] 必填标识显示
- [ ] 只读字段样式正确
- [ ] 响应式布局正常

#### 性能测试
- [ ] 页面加载速度
- [ ] 大数据量表格性能
- [ ] 查询响应时间
- [ ] 无内存泄漏

#### 兼容性测试
- [ ] Chrome 浏览器
- [ ] Firefox 浏览器
- [ ] Edge 浏览器
- [ ] 不同屏幕尺寸

---

### 阶段 10: 代码优化

**优化建议:**

#### 1. 提取公共逻辑
```javascript
// src/composables/useTable.js
export function useTable(apiFunction) {
  const tableData = ref([])
  const loading = ref(false)
  
  const loadData = async (params) => {
    loading.value = true
    try {
      tableData.value = await apiFunction(params)
    } catch (error) {
      console.error('加载失败:', error)
    } finally {
      loading.value = false
    }
  }
  
  return {
    tableData,
    loading,
    loadData
  }
}
```

#### 2. 统一错误处理
```javascript
// src/utils/errorHandler.js
export const handleError = (error, message = '操作失败') => {
  console.error(error)
  alert(message)
}
```

#### 3. 添加加载状态
```vue
<template>
  <div v-if="loading" class="loading">加载中...</div>
  <MaximoTable v-else ... />
</template>
```

#### 4. 代码注释
```javascript
/**
 * 加载表格数据
 * @param {Object} params - 查询参数
 */
const loadTableData = async (params) => {
  // 实现逻辑
}
```

---

## 快速开发检查清单

### 列表页
- [ ] 创建路由
- [ ] 定义列配置
- [ ] 准备测试数据
- [ ] 配置工具栏按钮
- [ ] 实现行点击事件
- [ ] 实现工具栏操作
- [ ] 添加页面标题
- [ ] 测试路由跳转

### 详情页
- [ ] 创建路由
- [ ] 定义表单数据
- [ ] 实现数据加载
- [ ] 实现表单验证
- [ ] 实现保存逻辑
- [ ] 实现取消逻辑
- [ ] 添加所有字段
- [ ] 设置必填/只读属性
- [ ] 添加按钮组
- [ ] 测试保存功能

### 查询功能
- [ ] 定义查询表单
- [ ] 添加查询区域
- [ ] 实现查询方法
- [ ] 实现重置方法
- [ ] 集成到列表加载
- [ ] 测试查询结果

### 分页功能
- [ ] 定义分页变量
- [ ] 配置表格分页
- [ ] 实现分页切换
- [ ] 更新加载逻辑
- [ ] 测试分页效果

### 子表功能
- [ ] 定义子表配置
- [ ] 准备子表数据
- [ ] 配置子表按钮
- [ ] 实现子表操作
- [ ] 关联主表保存
- [ ] 测试子表功能

---

## 常见问题解决

### Q1: 页面空白
**原因:** 路由配置错误或组件导入失败  
**解决:** 
1. 检查路由配置
2. 检查控制台错误
3. 确认组件文件存在

### Q2: 数据不显示
**原因:** 数据格式错误或 API 调用失败  
**解决:**
1. 检查控制台网络请求
2. 打印数据确认格式
3. 检查列配置 key 是否匹配

### Q3: 样式错乱
**原因:** 缺少必要的类名或结构  
**解决:**
1. 检查是否使用 `<table class="tdtblw">`
2. 检查组件嵌套是否正确
3. 对比示例页面结构

### Q4: 按钮不响应
**原因:** 事件未绑定或方法未定义  
**解决:**
1. 检查 `@click` 绑定
2. 检查方法是否在 setup 中定义
3. 检查控制台是否有错误

### Q5: 表单验证不生效
**原因:** 验证逻辑未调用或条件错误  
**解决:**
1. 确认在保存前调用验证
2. 检查验证条件是否正确
3. 打印表单数据确认值

---

## 最佳实践总结

### 1. 保持组件简洁
- 每个组件只做一件事
- 复杂逻辑提取为 composable
- 重复代码提取为工具函数

### 2. 统一命名规范
- 变量使用 camelCase
- 组件使用 PascalCase
- 方法使用 handle 前缀

### 3. 合理使用注释
- 复杂逻辑添加注释
- API 调用说明参数
- 关键业务逻辑说明

### 4. 错误处理完善
- API 调用使用 try-catch
- 用户友好的错误提示
- 记录关键错误日志

### 5. 代码复用
- 公共组件封装
- 通用逻辑提取
- 样式类统一管理

### 6. 性能优化
- 避免不必要的重渲染
- 大列表使用虚拟滚动
- 图片懒加载

### 7. 可维护性
- 清晰的目录结构
- 合理的文件拆分
- 详细的文档说明

---

## 下一步学习

1. **阅读现有代码**: 查看 `src/views/` 下的页面实现
2. **参考文档**: 阅读 API_REFERENCE.md 了解组件 API
3. **实践练习**: 按照 EXAMPLES.md 的示例动手实现
4. **问题反馈**: 遇到问题及时记录和解决
5. **持续优化**: 不断重构和改进代码质量
