如果创建脚本时候选择相应的模板时,脚本名称上面加上相应的规范/建议命名提示


## 1. 对象启动点 (Object Launch Points)
针对对象级别的操作触发点。

| 功能描述 | 脚本命名规则 |
| :--- | :--- |
| **初始化值** | `对象名.initvalue` |
| **验证对象** | `对象名.validate` |
| **创建对象** | `对象名.add` |
| **保存对象** | `对象名.saved` |
| **删除对象** | `对象名.delete` |
| **复制对象** | `对象名.DUPLICATE` 或 `对象名.AFTERDUPLICATE` |

---

如果脚本起名叫 .SAVE,加了启动点脚本会触发两次,如果对其他表进行add,就会出现重复记录

ASSET.SAVE			//系统固定名称,接口脚本不会执行

ASSET.PRESAVE        // 保存前(常用保存脚本)
ASSET.AFTSAVE       // 保存后,add,update,delete, sql执行后,还未commit
ASSET.AFTTXSAVE   // 落实后,commit之后             TX（Transaction通用简写）

## 2. 属性启动点 (Attribute Launch Points)
针对特定属性的操作触发点。

| 功能描述 | 脚本命名规则 |
| :--- | :--- |
| **初始化访问限制** | `对象名.属性名.initialize` |
| **初始化值** | `对象名.属性名.initvalue` |
| **验证** | `对象名.属性名.validate` |
| **检索列表** | `对象名.属性名.list` |
| **运行操作** | `对象名.属性名.action` |

---

## 3. 操作启动点 (Action Launch Points)

### 3.1 按钮操作
*   **规则：** `对象名.option.签名选项`
    *   *示例：* `WORKORDER.option.WOAPPR`

### 3.2 流程操作
*   **规则：** `对象名.workflow.事件`
    *   *示例：* `WORKORDER.workflow.START`

---

## 4. 条件启动点 (Condition Launch Points)
*   *（此部分原文无具体规则，保留标题）*
	用于隐藏页面绑定签名的使用COND.APPNAME.<自定义>
---

## 5. 定时任务 (Cron Task)
*   **规则：** `对象名.crontask.任务名`
    *   *示例：* `SR.crontask.CLEANUP`

---

## 6. 角色 (Role)
*   **规则：** `流程名.role.角色名`
    *   *示例：* `WFMAIN.role.APPROVER`

---

## 7. 公共脚本 (Common)
*   **规则：** `脚本名.common`
    *   *说明：* 用于存放通用函数或公共逻辑的脚本。

---

## 8. 接口 (API)
*   **规则：** `对象名+api`
    *   *示例：* `MXASSETAPI`

---

## 9. Bean 脚本 (Bean Script)
需要先开启系统属性：`mxe.script.allowbeanscript=1`

### 9.1 AppBean
*   **规则：** `APPBEAN.<app>`
    *   *说明：* `app` 的值为 `MAXAPP.APP` 字段的值。
    *   *示例：* `APPBEAN.WOTRACK`

### 9.2 DataBean
**命名方式：**
1.  `Databean.<custom>` (custom 为自定义名字)  只需要DATABEAN. 开头即可,根据定义的变量匹配
2.  **定义变量：**
    *   `beanid`：Data Source ID  主表是: results_showlist
    *   `beanapp`：MAXAPPS.APP
	
	
### 9.3 /os/结构对象 接口
*   **规则：** `OSIN.<结构对象名称>`
	funcation  beforeProcess()

### 关联关系接口
*   **规则：** `<RS>_<表名>_<关系名>`
关联关系sql表达式中必须 script: 开头+脚本名称
Mbo getMboSet 方法中
