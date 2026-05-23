# Maximo AutoScript API 测试结果

## 测试环境
- Maximo 版本: 9.1
- 测试时间: 2026-05-16
- 认证方式: MAXAUTH (Basic Authentication)

## 测试结果总结

### ✅ MXAPIAUTOSCRIPT（传统 OSLC 接口）- 全部通过

| 测试项 | 端点 | 状态码 | 结果 | 备注 |
|--------|------|--------|------|------|
| 查询列表 | GET /oslc/os/MXAPIAUTOSCRIPT?lean=1 | 200 | ✅ 成功 | 返回脚本列表 |
| 查询详情 | GET /oslc/os/MXAPIAUTOSCRIPT/{scriptId} | 200 | ✅ 成功 | scriptId 需 Base64 编码 |
| 创建脚本 | POST /oslc/os/MXAPIAUTOSCRIPT | 201 | ✅ 成功 | 使用 spi: 前缀 |
| 更新脚本 | POST /oslc/os/MXAPIAUTOSCRIPT/{scriptId} | 200 | ✅ 成功 | 需 x-method-override: PATCH |
| 删除脚本 | DELETE /oslc/os/MXAPIAUTOSCRIPT/{scriptId} | 204 | ✅ 成功 | 无返回内容 |

**关键要点**:
- ✅ 所有操作都正常工作
- ✅ 需要使用 `spi:` 前缀
- ✅ scriptId 需要 Base64 编码（例如: TEST -> _VEVTVA--）
- ✅ 更新时必须使用 `POST + x-method-override: PATCH`

---

### ✅ MXSCRIPT（新 REST API 接口）- 全部通过

| 测试项 | 端点 | 状态码 | 结果 | 备注 |
|--------|------|--------|------|------|
| 查询列表 | GET /api/os/MXSCRIPT?lean=1 | 200 | ✅ 成功 | 返回脚本列表 |
| 查询详情 | GET /api/os/MXSCRIPT/{scriptId}?lean=1 | 200 | ✅ 成功 | scriptId 需 Base64 编码 |
| 创建脚本 | POST /api/os/MXSCRIPT?lean=1 | 201 | ✅ 成功 | 无需前缀，直接使用属性名 |
| 更新脚本 | POST /api/os/MXSCRIPT/{scriptId} | 204 | ✅ 成功 | 需 x-method-override: PATCH，**URL 不能加 ?lean=1** |
| 删除脚本 | DELETE /api/os/MXSCRIPT/{scriptId}?lean=1 | 204 | ✅ 成功 | 无返回内容 |

**关键要点**:
- ✅ 查询/创建/删除时正常工作
- ⚠️ **更新时必须使用 `spi:` 前缀**（与 MXAPIAUTOSCRIPT 相同）
- ⚠️ **更新时 URL 不能加 `?lean=1`**（会导致返回 204 但数据不更新）
- ⚠️ **更新时必须使用 `POST + x-method-override: PATCH`**（不支持 PUT）
- ⚠️ **更新时字段名必须小写**（如 `spi:description`，不能是 `spi:DESCRIPTION`）
- ✅ scriptId 需要 Base64 编码（例如: TEST01 -> _VEVTVDAx）

---

## 结论与建议

### 当前可用的接口

1. **MXAPIAUTOSCRIPT（推荐用于生产）**
   - ✅ 所有 CRUD 操作都正常工作
   - ✅ 稳定可靠
   - ⚠️ 需要使用 spi: 前缀和 Base64 编码的 scriptId

2. **MXSCRIPT（推荐用于查询/创建/删除，更新需谨慎）**
   - ✅ 查询/创建/删除操作正常工作
   - ⚠️ **更新操作有特殊要求**：
     - 必须使用 `POST + x-method-override: PATCH`
     - **URL 不能加 `?lean=1`**（会导致静默失败）
     - 必须使用 `spi:` 前缀
     - 字段名必须小写
   - ⚠️ 需要使用 Base64 编码的 scriptId
   - 详见：`TEST/AUTOSCRIPT_UPDATE_TEST_RESULTS.md`（完整测试报告）

### 建议

1. **短期方案**: 两种接口都可以使用，推荐 MXSCRIPT（更简洁）。

2. **重要发现**: 
   - MXSCRIPT 接口的路径参数**必须**使用 Base64 编码的 scriptId
   - 格式: `'_' + btoa(scriptName)`
   - 例如: TEST01 -> _VEVTVDAx
   - 之前测试失败是因为直接使用了脚本名称而不是 Base64 编码

3. **SKILL.md 已修正**:
   - ✅ MXSCRIPT 的所有示例都已更新为使用 Base64 编码的 scriptId
   - ✅ 明确标注了 scriptId 的生成规则
   - ✅ 提供了完整的 cURL、Fetch、Axios 示例



---

## 测试文件

- HTTP 测试文件: `test-autoscript-api.http`
- JSON 测试数据:
  - `test-create-script.json`
  - `test-create-spi.json`
  - `test-update-spi.json`
  - `test-update-mxscript.json`
