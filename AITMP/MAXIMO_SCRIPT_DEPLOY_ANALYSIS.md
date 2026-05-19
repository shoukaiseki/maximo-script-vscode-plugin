# Maximo 脚本部署逻辑分析

## 参考项目：E:\gitwork\maximo-script-manager

### 核心方法：bootstrapScript

位置：main.js 第 1714-1845 行

#### 完整流程

1. **检查脚本是否存在**
   ```javascript
   // 查询脚本
   const checkUrl = `${serverUrl}/oslc/os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript&oslc.where=autoscript="${upperScriptName}"`;
   const checkResult = await httpRequest({ method: 'GET', url: checkUrl, headers });
   
   // 判断是否存在
   if (checkResult.status === 200 && checkResult.data) {
     const memberCount = checkResult.data.member ? checkResult.data.member.length : 0;
     if (memberCount === 1) {
       scriptExists = true;
       scriptHref = checkResult.data.member[0].href;  // 获取脚本的 href
     }
   }
   ```

2. **决定使用创建还是更新**
   ```javascript
   if (scriptExists && scriptHref) {
     // 更新现有脚本
     deployUrl = scriptHref;  // 使用脚本的 href
     deployHeaders['Content-Type'] = 'application/merge-patch+json';
     deployHeaders['x-method-override'] = 'PATCH';
   } else {
     // 创建新脚本
     deployUrl = `${serverUrl}/oslc/os/AUTOSCRIPT?lean=1`;  // 或 MXSCRIPT
   }
   ```

3. **构建请求体**
   ```javascript
   const prefix = isMaximo91 ? 'spi:' : 'oslc:';
   
   const deployScript = {};
   deployScript[prefix + 'autoscript'] = upperScriptName;
   deployScript[prefix + 'description'] = description || autoScriptName;
   deployScript[prefix + 'scriptlanguage'] = 'nashorn';
   deployScript[prefix + 'active'] = true;
   deployScript[prefix + 'source'] = normalizedContent;
   ```

4. **发送请求**
   ```javascript
   const deployResult = await httpRequest({
     method: deployMethod,  // POST 或 PATCH
     url: deployUrl,
     headers: deployHeaders,
     data: deployScript
   });
   ```

5. **执行脚本（仅 install 脚本）**
   ```javascript
   if (autoScriptName.toLowerCase() === 'sharptree.autoscript.install') {
     const execUrl = `${serverUrl}/oslc/script/${autoScriptName.toLowerCase()}`;
     const execResult = await httpRequest({
       method: 'POST',
       url: execUrl,
       headers: { 'Content-Type': 'application/json' }
     });
   }
   ```

### 关键点总结

1. **统一的部署方法**：所有脚本都通过同一个方法部署，只是参数不同
2. **先查后改**：每次部署前都先查询脚本是否存在
3. **存在则更新，不存在则创建**：根据查询结果决定使用哪个端点
4. **使用前缀**：Maximo 9.1 使用 `spi:`，7.6 使用 `oslc:`
5. **更新时使用 href**：如果脚本存在，使用查询返回的 href 进行更新
6. **使用 PATCH 方法**：更新时使用 `POST + x-method-override: PATCH`

### 需要重构的地方

当前代码问题：
1. ❌ 初始化脚本和部署其他脚本的逻辑重复
2. ❌ 没有提取统一的部署方法
3. ❌ 代码冗余，难以维护

应该改为：
1. ✅ 提取一个通用的 `deployScript()` 方法
2. ✅ 所有脚本部署都调用这个方法
3. ✅ 只传入不同的参数（脚本名、描述、内容等）
