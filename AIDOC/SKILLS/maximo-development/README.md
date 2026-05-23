# Maximo 开发技能

这是一个用于 Maximo Vue 项目开发的 Lingma 技能,帮助开发者快速创建符合 Maximo 设计规范的页面、表单、表格和查询功能。

## 📁 文件结构

```
maximo-development/
├── SKILL.md              # 主技能文件 - 核心开发指南
├── API_REFERENCE.md      # API 参考文档 - 组件详细说明
├── EXAMPLES.md           # 示例代码 - 完整实现示例
├── WORKFLOW.md           # 工作流程 - 开发步骤和检查清单
└── README.md             # 本文件 - 使用说明
```

## 🎯 使用场景

当您需要:
- ✅ 创建 Maximo 风格的列表页面
- ✅ 开发表单详情页面
- ✅ 实现数据查询功能
- ✅ 配置表格和分页
- ✅ 添加主子表关系
- ✅ 实现业务逻辑和数据交互

## 📖 文档说明

### 1. SKILL.md - 核心开发指南
**何时使用:** 开始新页面开发时首先阅读

**包含内容:**
- 项目结构说明
- 核心组件库介绍
- 页面开发流程(列表页/详情页)
- 查询功能实现
- 业务逻辑规范
- 样式规范
- 常见问题解答

**快速导航:**
- 表单组件 → 查看 "核心组件库 > 表单组件"
- 表格配置 → 查看 "核心组件库 > 表格组件"
- 列表页开发 → 查看 "页面开发流程 > 列表页开发"
- 详情页开发 → 查看 "页面开发流程 > 详情页开发"

### 2. API_REFERENCE.md - API 参考文档
**何时使用:** 需要了解组件详细 API 时查阅

**包含内容:**
- 所有组件的 Props 详细说明
- 所有组件的 Events 说明
- 完整的代码示例
- 样式变量(颜色、尺寸、字体)
- 路由配置方法
- 数据交互模式
- 工具函数

**快速查找:**
- MaximoTextbox API → 搜索 "MaximoTextbox"
- MaximoTable API → 搜索 "MaximoTable"
- 颜色变量 → 搜索 "样式变量 > 颜色"
- 路由跳转 → 搜索 "路由配置"

### 3. EXAMPLES.md - 示例代码
**何时使用:** 需要完整代码示例时参考

**包含内容:**
- 示例 1: 简单列表页
- 示例 2: 带查询的列表页
- 示例 3: 表单详情页
- 示例 4: 主子表详情页
- 示例 5: 带查找功能的表单
- 示例 6: 多标签页

**学习建议:**
1. 从示例 1 开始,理解基本结构
2. 根据需要选择对应的示例参考
3. 复制代码并根据实际需求修改
4. 对比不同示例学习最佳实践

### 4. WORKFLOW.md - 工作流程
**何时使用:** 按照标准流程开发时遵循

**包含内容:**
- 完整的 10 阶段开发流程
- 每个阶段的详细步骤
- 快速开发检查清单
- 常见问题解决方案
- 最佳实践总结

**开发流程:**
1. 需求分析 → 明确功能和数据结构
2. 创建路由 → 配置页面访问路径
3. 创建列表页 → 实现数据展示
4. 创建详情页 → 实现表单编辑
5. 集成 API → 连接后端接口
6. 添加查询 → 实现筛选功能
7. 实现分页 → 处理大数据量
8. 添加子表 → 实现主子表关系
9. 测试调试 → 确保功能正常
10. 代码优化 → 提升代码质量

## 🚀 快速开始

### 场景 1: 创建新的列表页

**步骤:**
1. 阅读 `SKILL.md` 中的 "页面开发流程 > 列表页开发"
2. 参考 `EXAMPLES.md` 中的 "示例 1: 简单列表页"
3. 按照 `WORKFLOW.md` 中的 "阶段 3: 创建列表页" 执行
4. 查阅 `API_REFERENCE.md` 了解 MaximoTable 组件 API

**关键代码:**
```vue
<MaximoTable
  v-model="selectedRowIndex"
  :columns="columns"
  :data="tableData"
  :toolbar-actions="toolbarActions"
  @row-click="handleRowClick"
/>
```

### 场景 2: 创建带查询的列表页

**步骤:**
1. 阅读 `SKILL.md` 中的 "查询功能实现"
2. 参考 `EXAMPLES.md` 中的 "示例 2: 带查询的列表页"
3. 按照 `WORKFLOW.md` 中的 "阶段 6: 添加查询功能" 执行

**关键代码:**
```vue
<MaximoSection title="查询条件">
  <MaximoTextbox v-model="queryForm.field" label="字段" />
  <MaximoButton label="查询" @click="handleQuery" />
</MaximoSection>
```

### 场景 3: 创建详情编辑页

**步骤:**
1. 阅读 `SKILL.md` 中的 "页面开发流程 > 详情页开发"
2. 参考 `EXAMPLES.md` 中的 "示例 3: 表单详情页"
3. 按照 `WORKFLOW.md` 中的 "阶段 4: 创建详情页" 执行
4. 查阅 `API_REFERENCE.md` 了解表单组件 API

**关键代码:**
```vue
<MaximoSection title="基本信息">
  <table class="tdtblw">
    <MaximoSectionRow>
      <MaximoSectionCol>
        <MaximoTextbox v-model="formData.field" label="字段" :required="true" />
      </MaximoSectionCol>
    </MaximoSectionRow>
  </table>
</MaximoSection>
```

### 场景 4: 实现主子表

**步骤:**
1. 参考 `EXAMPLES.md` 中的 "示例 4: 主子表详情页"
2. 按照 `WORKFLOW.md` 中的 "阶段 8: 添加子表" 执行
3. 查阅 `API_REFERENCE.md` 了解 MaximoTable 的行内操作配置

**关键代码:**
```vue
<!-- 主表 -->
<MaximoSection title="主表信息">
  <!-- 主表字段 -->
</MaximoSection>

<!-- 子表 -->
<MaximoSection title="子表明细">
  <MaximoTable
    :show-action-column="true"
    :row-actions="rowActions"
    @row-action="handleRowAction"
  />
</MaximoSection>
```

## 💡 使用技巧

### 1. 渐进式学习
- **第 1 天**: 阅读 SKILL.md,了解整体架构
- **第 2 天**: 运行示例 1,理解基本结构
- **第 3 天**: 尝试创建自己的列表页
- **第 4 天**: 学习详情页开发
- **第 5 天**: 掌握查询和分页功能

### 2. 高效查阅
- **找组件用法**: 直接搜索组件名 (如 "MaximoTextbox")
- **找完整示例**: 在 EXAMPLES.md 中查找相似场景
- **找开发步骤**: 在 WORKFLOW.md 中查看对应阶段
- **找 API 细节**: 在 API_REFERENCE.md 中查阅 Props/Events

### 3. 代码复用
- 从 EXAMPLES.md 复制完整代码
- 根据实际需求修改字段名和数据
- 保持代码结构和命名规范一致
- 参考现有页面 (`src/views/`) 的实现

### 4. 问题排查
1. 检查控制台错误信息
2. 对照 WORKFLOW.md 的检查清单
3. 参考 EXAMPLES.md 的正确实现
4. 查阅 API_REFERENCE.md 确认参数
5. 查看常见问题解决部分

## 📋 开发检查清单

在提交代码前,确保完成以下检查:

### 列表页
- [ ] 路由已配置
- [ ] 列配置正确
- [ ] 数据正常显示
- [ ] 行点击跳转正常
- [ ] 工具栏按钮可用
- [ ] 页面标题样式正确

### 详情页
- [ ] 路由已配置
- [ ] 表单字段完整
- [ ] 必填标识正确
- [ ] 只读字段设置
- [ ] 表单验证生效
- [ ] 保存功能正常
- [ ] 取消返回正常

### 查询功能
- [ ] 查询条件区域完整
- [ ] 查询方法实现
- [ ] 重置方法实现
- [ ] 查询结果正确

### 分页功能
- [ ] 分页变量定义
- [ ] 分页切换正常
- [ ] 数据加载正确

## 🔗 相关资源

### 项目文档
- [表单组件文档](../../maximo-vue-components/FORM_COMPONENTS.md)
- [按钮组件文档](../../maximo-vue-components/BUTTON_COMPONENTS.md)
- [表格组件文档](../../maximo-vue-components/TABLE_UPDATE.md)

### 示例页面
- 列表页示例: `src/views/PartsApplicationList.vue`
- 详情页示例: `src/views/InquiryDetail.vue`
- 组件演示: `src/views/ComponentsDemo.vue`

### 在线资源
- Vue 3 官方文档: https://vuejs.org/
- Vue Router 文档: https://router.vuejs.org/
- Vite 文档: https://vitejs.dev/

## 🤝 贡献指南

如果您发现文档错误或需要补充内容:

1. **修正错误**: 直接修改对应的 .md 文件
2. **添加示例**: 在 EXAMPLES.md 中添加新的示例
3. **补充 API**: 在 API_REFERENCE.md 中添加缺失的说明
4. **优化流程**: 在 WORKFLOW.md 中改进开发步骤

## 📞 获取帮助

遇到问题时:

1. **查阅文档**: 按场景查找对应的文档部分
2. **查看示例**: 参考 EXAMPLES.md 中的完整代码
3. **检查清单**: 使用 WORKFLOW.md 的检查清单排查
4. **搜索问题**: 在常见问题部分查找解决方案
5. **团队讨论**: 与团队成员交流经验和技巧

## 📝 版本历史

### v1.0.0 (2026-05-08)
- 初始版本发布
- 包含完整的开发指南
- 提供 6 个完整示例
- 详细的 API 参考文档
- 标准化的工作流程

---

**祝开发顺利!** 🎉

如有任何问题或建议,欢迎反馈和改进。
