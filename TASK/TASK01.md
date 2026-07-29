# Maximo Script VSCode 插件开发任务汇总

---

# TASK01 - 基础补全与反射功能

## 1
将当前的补全方式 使用 JSDoc 类型注释启用智能补全 

## 2

连接配置加个测试连接按钮,访问以下接口,url使用配置中的 http://localhost:9080/maximo 和MAXAUTH
``
curl --request GET \
  --url 'http://localhost:9080/maximo/oslc/os/MXAPIPERSON/_TUFYQURNSU4=?lean=1' \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Connection: keep-alive' \
  --header 'Cookie: JSESSIONID=0000swJjLlz8F6z7doPybSGNHX_:bca813df-34f0-4b6c-841a-9762ccbd61be' \
  --header 'MAXAUTH:  bWF4YWRtaW46MTIzNDU2' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0'
```
返回信息
```
{
	"email_collectionref": "http://localhost:9080/maximo/oslc/os/MXAPIPERSON/_TUFYQURNSU4=/email",
	"personuid": 3,
	"status_description": "活动",
	"transemailelection_description": "始终通知",
	"timezone": "Asia/Shanghai",
	"loctoservreq": true,
	"timezone_description": "亚洲/上海 (UTC+8)",
	"language": "ZH",
	"phone_collectionref": "http://localhost:9080/maximo/oslc/os/MXAPIPERSON/_TUFYQURNSU4=/phone",
	"locale": "zh_CN",
	"transemailelection": "ALWAYS",
	"wfmailelection": "ALWAYS",
	"statusdate": "2004-04-14T11:58:32+08:00",
	"_rowstamp": "1080707",
	"languserupdated": false,
	"statusiface": false,
	"locale_description": "简体中文",
	"acceptingwfmail": true,
	"displayname": "MAXADMIN",
	"wfmailelection_description": "始终通知",
	"personid": "MAXADMIN",
	"sms_collectionref": "http://localhost:9080/maximo/oslc/os/MXAPIPERSON/_TUFYQURNSU4=/sms",
	"href": "http://localhost:9080/maximo/oslc/os/MXAPIPERSON/_TUFYQURNSU4=",
	"status": "ACTIVE"
}
```
测试后显示 displayname


## 3
增加反射补全功能,在vscode下面增加下拉选择类似的功能,选择全部补全或者反射补全方式


## 4
使用jdk8的编译class,这样高版本低版本的都能用
D:\usr\java\jdk1.8.0_491x64

### Java 反射功能实现说明

#### 预编译方案
- **源文件**: `src/ReflectHelper.java`
- **编译输出**: `src/ReflectHelper.class` (JDK 8 编译，major version: 52)
- **打包位置**: `dist/ReflectHelper.class` (通过 webpack copy-webpack-plugin 自动复制)

#### 编译命令
```bash
D:\usr\java\jdk1.8.0_491x64\bin\javac -source 1.8 -target 1.8 src/ReflectHelper.java
```

#### 优势
- ✅ 兼容性：Java 8 编译的 class 文件可以在 Java 8+ 所有版本运行
- ✅ 性能：无需动态编译，直接执行
- ✅ 稳定性：避免运行时编译错误
- ✅ 包体积：只包含 class 文件，不包含编译逻辑

---

# TASK02 - HTTP请求、工具箱与补全模式

## 1
再加个全局请求方法
```
async function httpRequest({ method, url, headers = {}, data, noAuth = false } = {}) 

/**
如果noAuth=true,header不添加 MAXAUTH/apiKey

url只传入 os/MAXPERSON 即可


 */
```

## 2
httpRequest 方法改下,名字改成 httpRequestToMaximo

### response返回时
如果cookie中包含JSESSIONID,则缓存为全局变量

### request 请求时

如果存在全局缓存 JESSIONID,则将JSESSIONID信息添加到cookie,例如
```
Cookie: 	JSESSIONID=0000TtX4Wm71j9LBavNNSZLhvhN:bca813df-34f0-4b6c-841a-9762ccbd61be
```

如果 noAuth=false,

认证方式为 apiKey,就在header添加 apiKey ,否则就在header添加 MAXAUTH

如果 noAuth=true,
不在header添加apiKey或者MAXAUTH


## 3

<!-- ```
连接配置
补全设置
关于
```
你改成
```
连接配置
补全设置
其它配置
关于
```
然后把 enableHttpLog 的配置选项 放到其它配置里面 -->


## 4
导航菜单加个工具箱菜单

工具箱内使用标签页展示,标签页有

初始化脚本,导入脚本 这两个

功能实现参考 E:\gitwork\maximo-script-manager\ 项目中的工具箱功能

连接请求方式使用 httpRequestToMaximo 方法,不要对httpRequest.ts进行更改,据我分析 httpRequestToMaximo 能够满足这些需求

重要提示: 不要着急,慢慢来,分析仔细,提供完美的完成任务


## 5

补全模式当前有"默认模式","反射模式",增加一个 "VSCode模式",放到最顶端
```
VSCode模式
默认模式
反射模式
```
VSCode模式就相当于"把补全配置中的启用代码补全功能勾选框取消勾选"

然后 把补全配置中的启用代码补全功能勾选框取消掉,描述改为启用VSCode模式后取消插件补全方式

保存配置的按钮都取消掉,改为更改任何配置后即时保存


## 6
你这理解能力,真是蠢
右下角不是有个补全模式了,你还在补全配置里面加,补全配置里面你写个说明:如果要关闭插件补全模式,在右下角更改配置模式为VSCode就行了(具体怎么提示的你自己润色下)

## 7
右下角补全模式加了 VSCode模式没有?



## 8
工具箱菜单现在没内容

工具箱内使用标签页展示,标签页有

初始化脚本,导入脚本 这两个

功能实现参考 E:\gitwork\maximo-script-manager\ 项目中的工具箱功能

连接请求方式使用 httpRequestToMaximo 方法,不要对httpRequest.ts进行更改,据我分析 httpRequestToMaximo 能够满足这些需求

重要提示: 不要着急,慢慢来,分析仔细,提供完美的完成任务



## 9

curl --request POST \
  --url 'http://localhost:9080/maximo/api/os/MXAPIPERSON/_TUFYQURNSU4=?lean=1' \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'Cookie: JSESSIONID=0000aLF9hIOeyUbKTsv92Nwv80W:bca813df-34f0-4b6c-841a-9762ccbd61be' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --header 'apiKey: erg8n2vk6pcu9ou1cr61jag49qdmjuk65ac6l1q0' \
  --header 'x-method-override: PATCH' \
  --data '{
  "spi:autoscript": "TEST",
  "spi:description": "测试脚本",
  "spi:scriptlanguage": "nashorn",
  "spi:active": 1,
  "spi:source": "/*\n *shoukaiseki this_is_auto_comment_donot_delete:这是导出的自动注释,不要删除,否则下次导出会出现重复注释\n * 脚本(AUTOSCRIPT): TEST\n * 脚本语言(SCRIPTLANGUAGE): javascript\n * 描述(DESCRIPTION): 测试脚本3\n * 日志级别(LOGLEVEL): ERROR\n * 唯一标识(AUTOSCRIPTID): 6              语言代码(LANGCODE): EN\n * 用户定义(USERDEFINED): Y               状态(STATUS): Draft\n * 是接口(INTERFACE): N                  活动(ACTIVE): Y\n * 变更人(CHANGEBY): MAXADMIN\n * 日期(CHANGEDATE): 2026/5/15 20:15:56\n *\n * Variables: 无\n *\n * Launch Points: 无\n */\n/*\n * AUTOSCRIPT: TEST\n * SCRIPTLANGUAGE: Nashorn\n * DESCRIPTION: 测试脚本\n * LOGLEVEL: DEBUG\n * AUTOSCRIPTID: 103                  LANGCODE: ZH\n * USERDEFINED: Y STATUS: 草稿\n * INTERFACE: N                       ACTIVE: Y\n * CREATEDBY: MAXADMIN\n * CHANGEBY: MAXADMIN\n * OWNER: MAXADMIN\n * CREATEDDATE: 2026-04-25 16:29:45\n * CHANGEDATE: 2026-04-25 21:05 :29\n */\nload('\''nashorn:mozilla_compat.js'\'');\n\n\nservice.log(\"TEST222\"); \n\n //省略一堆代码\nresponseBody = '\''{\\n'\'' +\n               '\''\\t{\"userName\":\"admin\",\\n'\'' +\n               '\''\\t \"description\": \"管理员\"}\\n'\'' +\n               '\''}'\'';",
  "spi:changedate": "2026-05-15T20:15:56+08:00",
  "spi:createdbyemail": "",
  "spi:changeby": "MAXADMIN",
  "spi:ownerid": "",
  "spi:comments": "",
  "spi:launchpoints": [],
  "spi:userdefined": 1,
  "spi:ownerphone": "",
  "spi:status": "Draft",
  "spi:owner": "MAXADMIN",
  "spi:interface": 0,
  "spi:category": "",
  "spi:statusdate": "2026-05-13T12:29:34+08:00",
  "spi:createdbyname": "",
  "spi:createdbyphone": "",
  "spi:createdbyid": "",
  "spi:createdby": "MAXADMIN",
  "spi:loglevel": "ERROR",
  "spi:orgid": "",
  "spi:variables": [],
  "spi:hasld": 0,
  "spi:scheduledstatus": "",
  "spi:langcode": "EN",
  "spi:siteid": "",
  "spi:ownername": "",
  "spi:action": "",
  "spi:version": "1.1.1",
  "spi:owneremail": ""
}'

---

# TASK03 - AUTOSCRIPT更新接口与工具箱导入导出

## maximo-AUTOSCRIPT更新接口
按照以下测试后的结果,将 .lingma/skills/maximo-autoscript-api/SKILL.md 更新下
### 正确的方式
```
curl --request POST \
  --url http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVA== \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'Cookie: JSESSIONID=00002y1nVl8mdV1AkZKyPTOfGZk:bca813df-34f0-4b6c-841a-9762ccbd61be' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --header 'apiKey: erg8n2vk6pcu9ou1cr61jag49qdmjuk65ac6l1q0' \
  --header 'x-method-override: PATCH' \
  --data '{
  "spi:changedate": "2026-05-15T20:15:56+08:00",
  "spi:createdbyemail": "",
  "spi:changeby": "MAXADMIN",
  "spi:ownerid": "",
  "spi:active": 1,
  "spi:comments": "",
  "spi:launchpoints": [],
  "spi:userdefined": 1,
  "spi:ownerphone": "",
  "spi:status": "Draft",
  "spi:owner": "MAXADMIN",
  "spi:scriptlanguage": "javascript",
  "spi:interface": 0,
  "spi:category": "",
  "spi:statusdate": "2026-05-13T12:29:34+08:00",
  "spi:createdbyname": "",
  "spi:createdbyphone": "",
  "spi:createdbyid": "",
  "spi:createdby": "MAXADMIN",
  "spi:loglevel": "ERROR",
  "spi:orgid": "",
  "spi:variables": [],
  "spi:hasld": 0,
  "spi:scheduledstatus": "",
  "spi:langcode": "EN",
  "spi:siteid": "",
  "spi:ownername": "",
  "spi:action": "",
  "spi:version": "1.1.1",
  "spi:owneremail": "",
  "spi:autoscript": "TEST",
  "spi:description": "测试脚本666",
  "spi:source": "load('\''nashorn:mozilla_compat.js'\'');\n\n\nservice.log(\"TEST666\"); \n\n //省略一堆代码\nresponseBody = '\''{\\n'\'' +\n               '\''\\t{\"userName\":\"admin\",\\n'\'' +\n               '\''\\t \"description\": \"管理员\"}\\n'\'' +\n               '\''}'\'';"
}'
```
### 错误的方式1

```
http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVA==?lean=1
```
不能加lean,加了之后实际返回204,但是实际数据没更新



### 错误的方式2
只展示关键字段
```
  {
  "spi:description": "测试脚本666",
  "spi:SOURCE": "load('\''nashorn:mozilla_compat.js'\'');\n\n\nservice.log(\"TEST666\"); \n\n //省略一堆代码\nresponseBody = '\''{\\n'\'' +\n               '\''\\t{\"userName\":\"admin\",\\n'\'' +\n               '\''\\t \"description\": \"管理员\"}\\n'\'' +\n               '\''}'\'';"
}
```
"spi:SOURCE"中的字段名不能大写

结果只更新了description字段,source字段没有更新

```
  {
  "spi:DESCRIPTION": "测试脚本666",
  "spi:source": "load('\''nashorn:mozilla_compat.js'\'');\n\n\nservice.log(\"TEST666\"); \n\n //省略一堆代码\nresponseBody = '\''{\\n'\'' +\n               '\''\\t{\"userName\":\"admin\",\\n'\'' +\n               '\''\\t \"description\": \"管理员\"}\\n'\'' +\n               '\''}'\'';"
}
```
"spi:DESCRIPTION"中的字段名不能大写

结果只更新了source字段,description字段没有更新

你改新建接口干嘛?我有跟你说过新建的验证结果吗?你真是瞎搞
我已经恢复 .lingma/skills/maximo-autoscript-api/SKILL.md 文件
你重新改下



### 测试
​test-autoscript-api.http​ 这个测试你也重新测下,使用
/os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript,description,source&oslc.where=autoscript="TEST" &lean=1 接口查询结果
主要测更新
对/api或者/oslc,/MXAPIAUTOSCRIPT 或者 /MXSCRIPT 
加不加&lean=1,以及字段名大小写 
还有加不加 spi: 或者 oslc:的情况, 多个维度都测下,
更新完之后要重新查询,是否更新成功
脚本名就用TEST测试,这个可以随便改,
结果更新到这个文档,这个文档以前只测试返回码成功而已,并没有对数据是否成功验证


## 5
工具箱的初始化脚本功能写下,将 public\maximo-developer-resources 中的全部导入,最后 public\maximo-developer-resources 要打包到插件中

可以参考 E:\gitwork\maximo-script-manager\toolbox.html 中工具箱的初始化脚本功能

另外也加个删除工具脚本的标签,功能按照 E:\gitwork\maximo-script-manager\toolbox.html 工具箱的清除脚本功能来做


## 6

现在是初始化把脚本导进去了,但是你这代码真的跟  E:\gitwork\maximo-script-manager\ 中的差太多了,让你照那个项目逻辑抄,你也没搞明白,别以交任务的心态去做事,做事要好好做,你先读懂,仔细看,逻辑要搞清楚,1:1复刻功能,要做笔记就写到AITMP目录中,把导入单个脚本写一个方法,功能都一样的,就是把脚本通过接口新建/更新到maxiom中,方法开头是先查询脚本存在不存在,不存在就新增,存在就更新,简简单单那的事,
然后其它都调他,多点参数而已


## 7
_deploySingleFileInternal 方法中,读取json文件,然后再读取脚本文件(具体参考 E:\gitwork\maximo-script-manager\toolbox.js deploySingleFile方法)
调再 _deployScript 接口啊

## 导出脚本

工具箱中再增加个导出标签,标签内增加导出按钮功能逻辑参考
E:\gitwork\maximo-script-manager\toolbox.js 目录搜索 startExtract


是我搞错了,应该是参考 E:\gitwork\maximo-script-manager\renderer.js exportAllScripts 的导出方法,

(不要使用 E:\gitwork\maximo-script-manager\toolbox.js 的 startExtract 方式)


## 9
其它配置中增加一个脚本存放目录,默认为项目下的 "masscript" 目录(下面就以masscript为例)

脚本查询列表中加个pull按钮,点击后判断当前项目的 masscript 目录中是否存在 脚本名.json 文件,如果有提示是否覆盖

确认后,使用 exportAllScripts 的功能,将 脚本名.json 脚本名.js/py 两个文件保存到 masscript目录中


## 10
vscode的代码编辑框增加一个右键菜单"推送到maximo",使用 pushScriptToMaximo 方法将脚本内容通过接口更新到maximo

只传2个属性即可,文件名作为 autoscript,文件内容作为source

其它方法不要改动



## 11

推送到maximo之前先调用保存历史记录,保存历史记录失败只给日志输出,接着继续执行推送
```
curl --request POST \
  --url http://localhost:9080/maximo/api/script/SKS_AUTOSCRIPT_HISTORY_SAVE \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'Cookie: JSESSIONID=0000I0bSqgJUZP8O9HKqKHzreqw:ab7f4ee0-4b39-4f2c-9213-d1469e0f6ca5' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --header 'apiKey: i98u21udk65m0p1t2ng6ikvbse27pd884reh44t7' \
  --data '{
  "source": "//",
  "autoscript": "autoscript",
  "version": "1.0.1",
  "aliasname": "别名",
  "hostname": "主机名"

}
'
```
在连接配置加一个 aliasname 持久化存储的配置,在历史记录时候设置该值(如果为空就传空字符)
hostname 传送本机主机名

version: 获取逻辑,检查是否存在脚本同名的json文件,有的话获取version字段, 获取version最后一个.后面的字符是不是数字,如果是数字就+1,之后拼接回字符串,并且写回json文件中

切记,该try的时候使用try

代码中多谢注释,跟你说的功能描述也要写到注视中
如果version存在,推送脚本的时候也加上version字段

---

# TASK04 - 日志管理、XML推送与环境配置

## 1
自动化脚本表增加一个packagePath字段,用于 maximo script vscode plugin拉取脚本时根据包名创建目录	

之前这个功能忘记了?

## 2
​App.tsx 822-822​ 这下面增加说明"使用工具箱导入功能,导入https://gitee.com/shoukaiseki/maximo-script-vscode-plugin/tree/master/sks_tooljs下的所有脚本


## 3
maximo配置中左侧导航栏增加一个日志菜单

日志页面设置两个标签页,一个显示日志,一个设置日志级别

设置日志级别配置进行持久化存储,存储到 ~/.sks/maximo-script-helper/ 目录下

table方式进行配置(最后加个空行直接可以添加),日志级别下拉选择,再加个勾选框,加个忽略设置属性(json中加个字段)

还可以进行json源码编辑,

查询后可以进行本地缓存过滤,再加一列设置级别,一列重新加载(查询这个日志名称的级别更新到行中)

设置日志级别标签页加个说明: 当前有效,不会更新 MAXLOGGER 表的信息

### 设置日志级别请求如下
```
curl --request POST \
  --url 'script/SKS_LOGGER_LEVEL_UPDATE' \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Accept-Language: ZH' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'Cookie: JSESSIONID=0000qdY-cDiwhkfvn-gecLp4jM7:9d84fa42-ccf2-42b8-a2b0-abc0aa3b5ce2' \
  --header 'MAXAUTH: bWF4YWRtaW46MTIzNDU2' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --data '{
  "loggers": [

    { "loggerName": "maximo.script", "level": "WARN" },
    { "loggerName": "maximo.script.TEST01", "level": "DEBUG" }
    
  ]
}'
```

 返回信息
```
{
	"success": true,
	"message": "MXLogger 日志级别已成功修改",
	"result": [
		{
			"loggerName": "maximo.script",
			"level": "WARN",
			"status": "SUCCESS"
		},
		{
			"loggerName": "maximo.script.TEST01",
			"level": "DEBUG",
			"status": "SUCCESS"
		}
	]
}
```
### 查询所有日志名称级别 脚本接口
如果 loggers为空则会查询所有
```
curl --request POST \
  --url script/SKS_LOGGER_LEVEL_QUERY \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Accept-Language: ZH' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'Cookie: JSESSIONID=0000sQXAnoxoD8MhTmbpv0IRWpn:9d84fa42-ccf2-42b8-a2b0-abc0aa3b5ce2' \
  --header 'MAXAUTH: bWF4YWRtaW46MTIzNDU2' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --data '{
  "loggers": [

    { "loggerName": "maximo.script"},
    { "loggerName": "maximo.script.TEST01" }
    
  ]
}'
```
返回信息
```
{
	"success": true,
	"message": "OK",
	"result": [
		{
			"loggerName": "maximo.script",
			"level": "WARN"
		},
		{
			"loggerName": "maximo.script.TEST01",
			"level": "DEBUG"
		}
	]
}
```

## 4
日志级别配置中的 "重新加载此日志器的级别" 按钮放到 日志级别查询,再加一列更改日志级别

日志级别查询table展示
```
    日志器名称      日志级别        更改日志级别           操作
```
"重新加载此日志器的级别" 按钮放到操作
更改日志级别为下拉,默认跟"日志级别"列相同,更改日志级别之后,直接调用接口更新maximo的日志级别


## 5
日志级别查询中修改单个的别清空整个列表啊,返回的信息中只有一条记录器级别信息,遍历整个列表的list,更新记录器名称相同的那条记录即可



## 6
编辑器打开xml文件加个右键菜单, 应用xml推送到maximo,与js不同的处理逻辑

xml文件是直接调用
```
POST /maximo/api/script/SHARPTREE.AUTOSCRIPT.SCREENS
```
文件内容放到body里面


## 7

maximo Script配置 -> 工具箱 -> 导出脚本,选择目录后,目录持久化保存

maximo Script配置 -> 连接配置 服务器地址上面增加 环境选项(字段名为envnum)  下拉切换环境 这个选项进行持久化保存 

然后不同的环境配置存储到 ~/.sks/maximo-script-helper/envs.json 文件中(只保存连接配置的信息)


### 环境选项逻辑
1. 环境选项可以输入,也可以下拉, 右边加个加载按钮
2. 如果当前环境名称对应的选项不存在,加载按钮只读
3. 默认环境选项是从vscode配置中读取
4. 环境选项默认值为 default,页面初始化时 整个 "连接配置" 页面显示 vscode的配置存储的配置信息,同时加载 envs.json进页面缓存(字段名为envsCache)
5. 点击最下面的 保存配置 按钮之后,vscode配置进行保存, 再根据envnum的值,查找envsCache中是否有envnum相同的记录,如果有则更新,没有则新增,envsCache更新之后,同时将envsCache保存到 envs.json 文件中
6. 加载按钮点击后,将envsCache对应的信息设置到连接配置页面中的其它字段中


保存配置按钮上面加个 红色提示 ,类似需要保存提醒的字样, 在页面有信息变更的时候显示 ,保存之后消失


## 8
怎么保存到连接 envs.json 文件?如果没有 就在加载右边加个保存按钮

两个按钮都显示


环境选项怎么没有下拉功能?我要的是能下拉也能输入


这样太丑了,下拉去掉吧,加载按钮 缓存 "切换环境"按钮,点击后弹出对话框,对话框显示当前所有环境列表,一列放加载按钮,点击后实现加载环境的功能

你又删掉输入框干嘛?我怎么新增环境?,怎么显示当前是哪个环境?
你能不能有点脑子?让啥啥不行,坑人第一名



## 9

```
2026-05-27 21:33:45.910 [info] [EnvConfig] 环境配置已保存到 envs.json: localhost
2026-05-27 21:33:51.708 [info] [ConfigPanel] 收到消息: saveConfig
2026-05-27 21:33:51.709 [info] [SaveConfig] 开始保存配置...
2026-05-27 21:33:51.709 [info] [SaveConfig] enableHttpLog: true, 类型: boolean
2026-05-27 21:33:51.709 [info] [SaveConfig] localApiPath: e:\gitwork\maximo-script-manager\reflection-data
2026-05-27 21:33:51.709 [info] [SaveConfig] scriptStoragePath: masscript
2026-05-27 21:33:51.709 [info] [SaveConfig] aliasName: leo
2026-05-27 21:33:51.813 [info] [21:33:51] [INFO] ✅ 已加载 36 个API类数据
2026-05-27 21:33:51.890 [info] [SaveConfig] 保存后读取 enableHttpLog: true
2026-05-27 21:33:51.890 [info] [SaveConfig] 保存后读取 localApiPath: e:\gitwork\maximo-script-manager\reflection-data
2026-05-27 21:33:51.890 [info] [SaveConfig] 保存后读取 scriptStoragePath: masscript
2026-05-27 21:33:51.890 [info] [EnvConfig] 环境配置已保存到 envs.json: localhos
2026-05-27 21:33:52.853 [info] [ConfigPanel] 收到消息: saveConfig
2026-05-27 21:33:52.853 [info] [SaveConfig] 开始保存配置...
2026-05-27 21:33:52.853 [info] [SaveConfig] enableHttpLog: true, 类型: boolean
2026-05-27 21:33:52.853 [info] [SaveConfig] localApiPath: e:\gitwork\maximo-script-manager\reflection-data
2026-05-27 21:33:52.853 [info] [SaveConfig] scriptStoragePath: masscript
2026-05-27 21:33:52.853 [info] [SaveConfig] aliasName: leo
2026-05-27 21:33:52.960 [info] [21:33:52] [INFO] ✅ 已加载 36 个API类数据
2026-05-27 21:33:53.103 [info] [SaveConfig] 保存后读取 enableHttpLog: true
2026-05-27 21:33:53.103 [info] [SaveConfig] 保存后读取 localApiPath: e:\gitwork\maximo-script-manager\reflection-data
2026-05-27 21:33:53.103 [info] [SaveConfig] 保存后读取 scriptStoragePath: masscript
2026-05-27 21:33:53.103 [info] [EnvConfig] 环境配置已保存到 envs.json: localhosl
```
这是干嘛,我输入一个字符保存一次

把环境输入框的监听取消掉,不需要自动触发,我会手动点击保存按钮的


## 10 
## 环境切换使用帮助
配置文件位于 C:\Users\jiang\.sks\maximo-script-helper\envs.json (修改后不会即时生效)

环境配置只对连接配置有效,环境名称尽量使用英文和一些常规符号(-_等)

输入连接之后,再输入环境名称,点击保存可以保存为新环境配置

环境名称修改之后再保存又会创建一个新的环境配置,

点击切换环境之后点击加载可以切换新的环境,同时会保存到vscode配置中

上面的说明美化下更新到 HELP.md 

---

# TASK05 - 反射API自动生成与语言配置

## 1
"maximo配置"中 "补全设置"页下的 "启用类型推断" 下面加个勾选框  "自动生成反射api"(需要maximo接口才会生效) 

要做持久化存储,下文就以 jsonapi和tsapi 简称 reflection-data(存放通过java反射获取的的json文件) 目录的功能和 javaapi(存放通过java反射获取的的d.ts文件)的功能

本次功能所讲的反射是指通过maximo接口获取的反射信息

jsonapi和tsapi 两个功能如下
### maximoScriptClass 存储
#### .maximoScriptClass.json   
存储已存在的api文件的类
#### .ignoreMaximoScriptClass.json
存储获取失败的类名和次数,重试次数为-1,则表示永久忽略获取反射
同一个类反射获取失败10次则也进行忽略,10次之后次数不设置为-1,保留失败次数可查看

获取成功的反射数据后将删除掉 .ignoreMaximoScriptClass.json 中的类名


```
{
	"status": "error",
	"message": "error#无法加载类: com.ibm.tivoli.maximo.script.ScriptService1 - com.ibm.tivoli.maximo.script.ScriptService1"
}
```
通过反射获取失败后返回的json是status=error 的属于不存在的类,可以直接忽略,重试次数次数设为-1


### 插件启动逻辑
1. 插件启动时检查javaapi目录是否存在,不存在则新建,同时新建后将插件public/javaapisource下的所有目录和文件复制过去,进入第2步
2. 检查javaapi目录是否存在.maximoScriptClass.json 的文件,如果存在则进入第3步
  如果不存在则创建内容是 空的数组 保存到.maximoScriptClass.json 和 .ignoreMaximoScriptClass.json,进入第3步

3. 将javaapi/.maximoScriptClass.json 加载到缓存

### 自动生成反射api文件逻辑
1. 开启后自动识别当前js脚本下的java类型,如果缓存中存在则不做处理,如果包名是 jscustom 开头的也不做处理,类名为 custom 和 global 的也不做处理
2. 如果缓存中不存在则通过maximo反射接口获取(后台处理,同一个5秒之内别触发多次)

## 重要提示
1. 创建javaapi目录下的文件可参考 E:\gitwork\maximo-script-manager\test\extract-and-generate-ts.js
      需要更新 javaapi/global.d.ts 的文件,这里就使用reflection-data中jsonapi的数据进行处理成 d.ts 文件,避免多次请求maximo接口

2. reflection-data存储时也按照包名创建相应的目录,避免单个目录文件太多

3. E:\gitwork\maximo-script-vscode-plugin\javaapi\jscustom\AnsiLogger.d.ts 这个类的代码建议是正常能够提示的,参考这个文件的方式生成对应类的 d.ts 文件

4. 先把实现步骤保存到 AITMP目录下之后再直接开始完成交给你的任务,我先去吃饭了,你一定要在半个小时只能不要停止工作



## maximo反射接口如下
```
curl --request POST \
  --url script/SKS_REFLECT_HELPER \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --header 'apiKey: rvndme5p247ttca2048a1l0oedhbloh11d0qdc6j' \
  --data '{
    "className": "com.ibm.tivoli.maximo.script.ScriptService"
}'

```


## 2
Maximo配置中 连接配置 登录配置 右边增加一个 langcode 语言下拉框,下拉框需要有搜索功能

langcode 做持久化保存,vscode保存,同时保存到不同环境中, 不同环境下当前没有这个属性,为空则设置为 en,语言选项如下,显示第二列,选择后保存第一列的数据
```
AA,Afar
AE,Avestan
AF,Afrikaans
AM,Amharic
AR,عربية
AS,Assamese
AY,Aymara
AZ,Azerbaijani
BA,Bashkir
BE,Belarusian
BG,български
BH,Bihari
BI,Bislama
BN,Bengali
BO,Tibetan
BR,Breton
BS,Bosnian
CA,Catalan
CE,Chechen
CH,Chamorro
CO,Corsican
CS,Čeština
CU,Church Slavic
CV,Chuvash
CY,Welsh
DA,Dansk
DE,Deutsch
DZ,Dzongkha
EL,Ελληνικά
EN,English
EO,Esperanto
ES,Español
ET,Eesti
EU,Basque
FA,Persian
FI,Suomi
FJ,Fijian
FO,Føroyska
FR,Français
FY,Frisian
GA,Irish
GD,Gaelic (Scots)
GL,Gallegan
GN,Guarani
GU,Gujarati
GV,Manx
HE,עברית
HI,हिन्दी
HO,Hiri Motu
HR,Hrvatski
HU,Magyar
HY,Armenian
HZ,Herero
IA,Interlingua (International Auxiliary Language Association)
ID,Indonesian
IE,Interlingue
IK,Inupiaq
IS,Íslenska
IT,Italiano
IU,Inuktitut
JA,日本語
JW,Javanese
KA,ქართული
KI,Kikuyu
KJ,Kuanyama
KK,Kazakh
KL,Kalaallisut
KM,Khmer
KN,Kannada
KO,한국어
KS,Kashmiri
KU,Kurdish
KV,Komi
KW,Cornish
KY,Kirghiz
LA,Latin
LB,Letzeburgesch
LN,Lingala
LO,Lao
LT,Lietuvių
LV,Latviešu
MG,Malagasy
MH,Marshall
MI,Maori
MK,македонски
ML,Malayalam
MN,Mongolian
MO,Moldavian
MR,Marathi
MS,Malay
MT,Maltese
MY,Burmese
NA,Nauru
NB,Norwegian Bokmal
ND,"Ndebele, North"
NE,Nepali
NG,Ndonga
NL,Nederlands
NN,Norwegian Nynorsk
NO,Norsk
NR,"Ndebele, South"
NV,Navajo
NY,Chichewa; Nyanja
OC,Occitan (post 1500); Provencal
OM,Oromo
OR,Oriya
OS,Ossetian; Ossetic
PA,ਪੰਜਾਬੀ
PI,Pali
PL,Polski
PS,Pushto
PT,Português
QU,Quechua
RM,Raeto-Romance
RN,Rundi
RO,Română
RU,Pyccкий
RW,Kinyarwanda
SA,Sanskrit
SC,Sardinian
SD,Sindhi
SE,Northern Sami
SG,Sango
SI,Sinhalese
SK,Slovenčina
SL,Slovenščina
SM,Samoan
SN,Shona
SO,Somali
SQ,Albanian
SR,Srpski
SS,Swati
ST,"Sotho, Southern"
SU,Sundanese
SV,Svenska
SW,Swahili
TA,Tamil
TE,Telugu
TG,Tajik
TH,ภาษาไทย
TK,Turkmen
TL,Tagalog
TN,Tswana
TR,Türkçe
TS,Tsonga
TT,Tatar
TW,Twi
TY,Tahitian
UG,Uighur
UK,Українська
UR,Urdu
UZ,Uzbek
VI,Vietnamese
VO,Volapuk
WO,Wolof
XH,Xhosa
YI,Yiddish
ZA,Zhuang
ZH,简体中文
ZU,Zulu
ZHT,繁體中文
```


## 4

测试连接旁边加个 查看用户语言信息按钮,调用下面接口
```
curl --request POST \
  --url 'script/SKS_CURRENT_USER_INFO?develop=true&_langcode=ZH_cn' \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Connection: keep-alive' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --header 'apiKey: rvndme5p247ttca2048a1l0oedhbloh11d0qdc6j'
```
返回信息如下
```
{
	"data": {
		"userInfo": {
			"langcode": "ZH_CN",
			"localeLanguage": "en",
			"displayname": "MAXADMIN",
			"personId": "MAXADMIN",
			"localeCountry": "US",
			"locale": "en_US",
			"userName": "MAXADMIN"
		},
		"peruser": {
			... PERUSER 字段 ...
		}
	},
	"status": "success"
}
```
点击后弹出窗口显示接口返回的一些重要的信息, 你可以调用 db2 mcp工具查询字段描述

```
select
       OBJECTNAME,ATTRIBUTENAME,MAXATTRIBUTE.TITLE,l.TITLE as L_TITLE
from MAXATTRIBUTE
left join L_MAXATTRIBUTE as l on (MAXATTRIBUTEID=l.OWNERID and l.LANGCODE='ZH')
where OBJECTNAME in ('MAXUSER','person') ;
```



## 5
查看用户语言信息 对话框 增加显示 maxapps 信息,显示列表信息
```
{
	"data": {
		"maxapps": [
			{
				"APP": "AUTOSCRIPT",
				"APPTYPE": "RUN",
				"DESCRIPTION": "Automation Scripts",
				"MAINTBNAME": "AUTOSCRIPT"
			},
			...
		],
		"userInfo": { ... },
		"peruser": { ... }
	},
	"status": "success"
}
```

---

# TASK06 - 本地反射获取功能

## 1

选择包名类名之后,当前有右键菜单 "Maximo Script: 获取类反射信息" ,将其改名为 "Maximo Script: 通过maximo接口获取类反射信息" ,只改菜单名称

现在加一个选项, "Maximo Script: 通过本地反射获取类反射信息"


两者除了获取json方式不同外,其他处理逻辑一样

```
接口是通过 script/SKS_REFLECT_HELPER_ENHANCED 获取json

本地反射是通过 java 执行获取json
```



根据 ReflectHelper.java 类创建一个新的类,满足与 调用 script/SKS_REFLECT_HELPER_ENHANCED 返回相同的json数据

记得用jdk8(D:\usr\java\jdk1.8.0_491x64)编译,运行加载的jar包跟运行 ReflectHelper.class时候一致就行

## 2
"d:\usr\java\jdk-17.0.19x64\bin\java" -cp "e:\gitwork\maximo-script-vscode-plugin\dist;E:\gitwork\maximoi\lib;E:\gitwork\maximoi\maximolib"



你这怎么干的活? 
JAR 目录配置（用于实时反射） :这个jar存放的目录,
添加单个 JAR 文件 : 这是单个jar的配置

执行的时候目录下的jar和单个jar下的所有项 都得在 -cp中,你好歹看下之前的反射代码喽,别偷懒 



## 3
OK了,手动触发本地反射OK了


Maximo配置->补全设置中的 "自动生成反射API"勾选框下面加个 "自动通过本地jar生成反射API"

当前自动生成javaapi和jsonapi时,是调用maximo接口,

如果调用maximo接口获取失败,则判断是否勾选 "自动通过本地jar生成反射API", 如果勾选了就 使用刚新增的右键菜单 "Maximo Script: 通过本地反射获取类反射信息" 的功能, 

两则都失败才算获取失败,失败次数+1


---

# TASK06 功能测试指南

## 功能概述

本次更新添加了"通过本地反射获取类反射信息"功能，与原有的"通过maximo接口获取类反射信息"功能并行工作。

## 主要变更

### 1. 右键菜单更新
- **原菜单**: "Maximo Script: 获取类反射信息"
- **新菜单**: 
  - "Maximo Script: 通过maximo接口获取类反射信息"（原有功能）
  - "Maximo Script: 通过本地反射获取类反射信息"（新增功能）

### 2. 技术实现
- 创建了 `LocalReflectHelper.java`，使用 JDK 8 编译
- 实现了 `fetchClassReflectionLocal` 函数
- 两种方式的返回数据格式完全一致

## 测试步骤

### 前置条件

1. **配置 JDK 路径**
   - 打开 VSCode 设置
   - 搜索 `maximoScript.jdkPath`
   - 设置为您的 JDK 8 安装路径，例如：`D:\usr\java\jdk1.8.0_491x64`

2. **配置 JAR 包目录**（可选，如果需要访问 Maximo 特定类）
   - 打开 VSCode 设置
   - 搜索 `maximoScript.jarDirectories`
   - 添加包含 Maximo JAR 包的目录列表

### 测试场景 1：测试标准 Java 类

1. 打开任意 JavaScript 文件
2. 选中一个 Java 类名，例如：`java.lang.String`
3. 右键点击选中的文本
4. 选择 **"Maximo Script: 通过本地反射获取类反射信息"**
5. 等待进度条完成
6. 检查输出：
   - 查看日志通道 "Maximo Script Helper"
   - 确认生成了 `.d.ts` 文件
   - 确认更新了 `global.d.ts`

### 测试场景 2：测试内部类

1. 在 JavaScript 文件中选中：`java.util.Base64$Encoder`
2. 右键选择 **"Maximo Script: 通过本地反射获取类反射信息"**
3. 验证是否正确识别内部类并生成类型定义

### 测试场景 3：对比两种方式

1. 选中同一个类名（如：`java.lang.String`）
2. 先使用 **"通过maximo接口获取类反射信息"**，记录结果
3. 再使用 **"通过本地反射获取类反射信息"**，记录结果
4. 对比两种方式生成的 `.d.ts` 文件内容是否一致

### 测试场景 4：错误处理

1. 选中一个不存在的类名，例如：`com.example.NonExistentClass`
2. 右键选择 **"通过本地反射获取类反射信息"**
3. 验证是否正确显示错误提示

## 预期结果

### 成功情况
- ✅ 显示进度通知："正在通过本地反射获取信息: xxx"
- ✅ 日志中显示执行了 Java 命令
- ✅ 在 `~/.sks/maximo-script-helper/reflection-data/` 目录下生成 JSON 文件
- ✅ 在工作区 `javaapi/` 目录下生成 `.d.ts` 文件
- ✅ 自动更新 `javaapi/global.d.ts`，添加新的 reference
- ✅ 弹出成功提示："✅ 已成功获取并生成 Xxx.d.ts（本地反射）"

### 失败情况
- ❌ 如果未配置 JDK 路径，显示错误："未配置 JDK 路径，请在配置面板中设置"
- ❌ 如果类不存在，显示错误："Class not found: xxx"
- ❌ 如果 Java 执行失败，显示错误："本地反射执行失败: xxx"

## 常见问题

### Q1: 提示 "未配置 JDK 路径"
**解决方案**: 
1. 打开 VSCode 设置 (Ctrl + ,)
2. 搜索 `maximoScript.jdkPath`
3. 设置为 JDK 8 的安装路径

### Q2: 找不到某些 Maximo 特定的类
**解决方案**:
1. 在设置中配置 `maximoScript.jarDirectories`
2. 添加包含 Maximo JAR 包的目录，例如：
   ```json
   [
     "D:/maximo/lib",
     "D:/maximo/applications/maximo/lib"
   ]
   ```

### Q3: 生成的 .d.ts 文件为空或方法很少
**可能原因**:
- 该类没有公共方法
- classpath 配置不正确，无法加载完整的类层次结构

### Q4: 中文乱码问题
**解决方案**:
- LocalReflectHelper.java 已使用 UTF-8 编码编译
- 确保系统默认编码支持中文

## 调试技巧

### 查看日志
1. 按 `Ctrl+Shift+P`
2. 输入 "Maximo Script: 查看日志"
3. 查看详细的执行日志

### 手动测试 Java 类
```bash
cd e:\gitwork\maximo-script-vscode-plugin\dist
java -cp ".;LocalReflectHelper.class" LocalReflectHelper java.lang.String
```

### 检查生成的文件
- JSON 数据: `~/.sks/maximo-script-helper/reflection-data/`
- TypeScript 定义: `<workspace>/javaapi/`
- 全局引用: `<workspace>/javaapi/global.d.ts`

## 注意事项

1. **JDK 版本要求**: 必须使用 JDK 8，因为 Maximo 基于 JDK 8
2. **classpath 顺序**: LocalReflectHelper.class 所在目录必须在 classpath 的最前面
3. **内部类表示**: 使用 `$` 符号表示内部类，如 `java.util.Base64$Encoder`
4. **性能考虑**: 本地反射比 Maximo 接口更快，但需要正确配置 classpath

## 下一步

如果测试通过，可以考虑：
1. 发布新版本到 VSCode 扩展市场
2. 更新 README.md 和 HELP.md 文档
3. 添加更多示例和最佳实践

---

# TASK07 - XML推送认证与导出目录配置

## 1
Maximo配置中 连接配置 登录配置  langcode 语言下拉框,下面增加一个 勾选框("Maximo Script: 推送 XML 到 Maximo"始终使用MAXAUTH认证方式)

做持久化保存,vscode保存,同时保存到不同环境中, 不同环境下当前没有这个属性,为空则设置为 true


其他你先不要改,先看代码再改,我有对文件做过改动


## 2

maximo配置->工具箱->导出脚本

导出脚本按钮左边加个勾选框"不自动生成导出目录",做持久化存储

再在导出脚本功能加个按照包名进行创建目录和存储脚本的功能(跟pull单个脚本一样,根据脚本的packgePath创建目录)



## 3


将自动生成带时间戳的子目录（如：autoscript_backup_20260523_143025） "不自动生成导出目录（直接保存到选择的目录）"勾选框是这个功能

将直接保存到选择的目录，脚本按包名结构组织: 这个功能永久生效

是我说错了

未勾选"不自动生成导出目录（直接保存到选择的目录）"
```
 - autoscript_backup_20260523_143025
    - com/
        └─ example/
        └─ script/
            ├─ SCRIPT_A.js
            └─ SCRIPT_A.json
    - org/
        └─ maximo/
        └─ autoscript/
            ├─ SCRIPT_B.js
            └─ SCRIPT_B.json
```

勾选了
```
  - com/
    └─ example/
       └─ script/
          ├─ SCRIPT_A.js
          └─ SCRIPT_A.json
  - org/
    └─ maximo/
       └─ autoscript/
          ├─ SCRIPT_B.js
          └─ SCRIPT_B.json
```



---

# TASK08 - XML修复、MAXOBJECT导出、创建脚本

## 01
帮我加个功能,编辑器打开xml文件加个右键菜单, 修复应用xml的id属性

### 点击后处理逻辑
每个元素都有个id,如果出现重复的,将后面的id进行随机生成一个新的id,完成之后提示修复多少个重复的id,不处理没有id属性的元素

特别注意: 要保留原有xml中注释的内容



## 02
工具箱加个导出MAXOBJECT标签页,配置导出目录,跟导出应用xml和导出脚本一样的目录自动生成功能  持久化保存"选择导出目录"和"不自动生成导出目录（直接保存到选择的目录）"勾选框


导出MAXOBJECT

获取所有MAX对象接口
```
curl --request GET \
  --url 'api/script/SKS_GET_MAXOBJECTNAMES?_langcode=zh'
```

返回结果如下
```
[
	{
		"_rownum": 1,
		"objectName": "BIMFILTERLIST",
		"description": "过滤器表的条目"
	},
	{
		"_rownum": 2,
		"objectName": "APPTBOOKASSIGNMENTS",
		"description": "预约薄分配"
	},
	{
		"_rownum": 3,
		"objectName": "APPTBOOKCHANGESTATUS",
		"description": "非持久性 APPTBOOK 变更状态表"
	}
]
```

不过获取列表之后还得读取全局导出对象配置文件(~/目录下,配置名称你自己取个好的),不存在则复制 template\plguin\exp_maxobject_config.json 创建一个新的,(工具箱标签页中加个打开配置文件的按钮)

导出时后,启用多线程进行导出

导出接口如下,参数是ObjectName,一次只导出一个MAXOBJECT,然后验证返回的字符串是不是json,是的话保存到文件,文件名为 DBCONFIG_${objectName}.json
```
curl --request POST \
  --url 'api/script/SKS_EXPORT_DBCONFIG?_langcode=zh' \
  --header 'apiKey: vj7fr5r8nt0ju0g06u7chq5ac1p475to80pcr0s1' \
  --data '{
	"objectNames": ["ITEM"]
}'
```

## 03
右键点击资源管理器中的xml文件名的时候,加个右键菜单,pull应用xml
然后读取文件内容,解析 文件中 presentation 元素的 id 属性
```
<presentation id="ibm_crl" ismobile="false" mboname="IBM_RLLINE" version="6.0.0">
```
如果属性值跟文件名不同,则提示 "文件名跟id属性值不同,是否继续?"

提示框加个取消按钮,取消则不处理,确定则继续处理

使用工具箱中导出应用xml的接口功能,导出单个应用xml,应用名称取 id属性值

获取xml内容之后,更改原来的文件复制到 ~/.sks/maxbackup/maxappxmlbackup/maxappxml/<应用名称>_<yyyyMMdd_HHmmssSSS>.xml

之后再将接口获取的xml内容写入当时右键点击的文件中


## 04
工具箱中的 导出MAXOBJECT 标签下增加一个启用精简/完整开关,进行持久化存储

开启精简模式后 SKS_EXPORT_DBCONFIG接口中增加参数 ignoreDefVal=true


## 05
新增 修复应用xml推送 功能,在xml编辑时候,点击右键菜单显示

功能是先通过脚本接口获取 SHARPTREE.AUTOSCRIPT.SCREENS 脚本,

只获取脚本内容不进行保存,然后通过以下接口推送脚本

```
curl --request POST \
  --url api/os/MXAPIAUTOSCRIPT/_U0hBUlBUUkVFLkFVVE9TQ1JJUFQuU0NSRUVOUw== \
  --header 'Accept: */*' \
  --header 'x-method-override: PATCH' \
  --data '{

  "description": "Sharptree Screens Script",
  "autoscript": "SHARPTREE.AUTOSCRIPT.SCREENS",
  "ibm_packagepath": "sharptree.autoscript",
  "loglevel": "ERROR",
  "source": <获取到的脚本内容>
}'
```

提示成功或者失败即可



## 06
还是用另一种方式吧,不要选择模板,
而是根据选择的类型,默认使用模板中的js生成
根据选择的脚本类型生成对应的json内容

参考模板: template\cn\shoukaiseki\tmpl  

参考页面: E:\devwork\ideawork\maximo91_soloncode\xmltmp\dev\autoscript.xml
maximo中有些脚本有多步,我们就一步填写完所有进行创建

参考maximo中保存脚本的方式: E:\maximoProject\java_sources\imaximob 下搜索AutoScript.java maximo页面中对话框的一些Bean类处理逻辑也可以在该目录下搜索

参考json导出脚本: E:\gitwork\wushiling\jsproject\masscript\cn\shoukaiseki\tools\SKS_GET_AUTOSCRIPTINFOBYNAME.js

参考SKILL E:\gitwork\maximo-script-vscode-plugin\.lingma\skills\maximo-autoscript-api\SKILL.md
参考其它脚本: E:\gitwork\wushiling\jsproject\masscript\ibm 目录下


## 07
脚本类型放第一行

### 对象启动点中
 - 如果所选的脚本类型需要启动点配置对象和属性的,脚本名输入之后,根据.进行分割,将[0]设置到对象名称,[1]设置到属性名称
 - 如果所选的脚本类型需要启动点配置对象的,脚本名输入之后,根据.进行分割,将[0]设置到对象名称

---

# TASK08A - 创建脚本功能实现汇总

feat: 实现创建脚本功能 - 通过 Webview 弹出框选择脚本类型

## 功能概述

实现右键点击资源管理器创建脚本的功能，使用 Webview 弹出框方式，通过标签页区分普通脚本和对象启动点脚本，根据选择的脚本类型自动匹配模板并生成对应的 JS 和 JSON 文件。

## 主要修改

### 新增文件

- [src/createScriptPanel.ts](file:///e:/gitwork/maximo-script-vscode-plugin/src/createScriptPanel.ts) - 创建脚本面板类，处理模板加载、脚本生成和文件写入
- [webview-ui/src/components/CreateScriptModal.tsx](file:///e:/gitwork/maximo-script-vscode-plugin/webview-ui/src/components/CreateScriptModal.tsx) - React 组件，实现标签页切换和脚本创建表单
- [webview-ui/src/createScriptMain.tsx](file:///e:/gitwork/maximo-script-vscode-plugin/webview-ui/src/createScriptMain.tsx) - 创建脚本面板入口文件
- [webview-ui/vite.config.create-script.ts](file:///e:/gitwork/maximo-script-vscode-plugin/webview-ui/vite.config.create-script.ts) - 创建脚本面板的 Vite 构建配置
- [template/cn/shoukaiseki/tmpl/SKS_TMPL_OBJECT.INITZOMBIE.js](file:///e:/gitwork/maximo-script-vscode-plugin/template/cn/shoukaiseki/tmpl/SKS_TMPL_OBJECT.INITZOMBIE.js) - 对象僵尸初始化脚本模板
- [template/cn/shoukaiseki/tmpl/SKS_TMPL_OBJECT.SAVE.js](file:///e:/gitwork/maximo-script-vscode-plugin/template/cn/shoukaiseki/tmpl/SKS_TMPL_OBJECT.SAVE.js) - 对象保存脚本模板

### 修改文件

- [src/extension.ts](file:///e:/gitwork/maximo-script-vscode-plugin/src/extension.ts) - 注册 `createScriptFromTemplateCommand` 命令，使用 CreateScriptPanel 打开 Webview
- [webview-ui/package.json](file:///e:/gitwork/maximo-script-vscode-plugin/webview-ui/package.json) - 添加二次构建命令，支持创建脚本面板的单独构建
- [template/cn/shoukaiseki/tmpl/SKS_TMPL_OBJECT.INIT.js](file:///e:/gitwork/maximo-script-vscode-plugin/template/cn/shoukaiseki/tmpl/SKS_TMPL_OBJECT.INIT.js) - 更新模板内容

## 技术要点

1. **脚本类型分类**：普通脚本（APISCRIPT、CONDITION、DATABEAN 等）、对象启动点脚本（OBJECT.INIT、OBJECT.SAVE 等）、字段启动点脚本（FLD_ACTION、FLD_VALIDATE 等）
2. **对象启动点配置**：支持配置对象名称、字段名称、事件类型（初始化值、验证应用程序、保存等）、保存操作（添加/更新/删除）、事件上下文（保存前/保存后/落实后）、条件表达式
3. **模板匹配**：根据脚本类型自动查找 `SKS_TMPL_{scriptType}.js` 模板文件，不存在时生成默认内容
4. **JSON 生成**：根据脚本类型和启动点配置自动生成完整的 JSON 配置文件，参考 Maximo 导出脚本格式

## 使用方式

右键点击资源管理器中的目录或文件 → 选择"Maximo Script: 从模板创建脚本" → 在弹出的对话框中选择标签页和脚本类型 → 配置启动点（如需要）→ 点击创建

## 参考文档

- [TASK08.md](file:///e:/gitwork/maximo-script-vscode-plugin/TASK/TASK08.md)
- [SKS_GET_AUTOSCRIPTINFOBYNAME.js](file:///E:/gitwork/wushiling/jsproject/masscript/cn/shoukaiseki/tools/SKS_GET_AUTOSCRIPTINFOBYNAME.js)
- [maximo-autoscript-api SKILL](file:///e:/gitwork/maximo-script-vscode-plugin/.lingma/skills/maximo-autoscript-api/SKILL.md)

---

# TASK09 - 脚本命名规范

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
