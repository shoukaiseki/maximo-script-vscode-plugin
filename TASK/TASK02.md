# 1
再加个全局请求方法
```
async function httpRequest({ method, url, headers = {}, data, noAuth = false } = {}) 

/**
如果noAuth=true,header不添加 MAXAUTH/apiKey

url只传入 os/MAXPERSON 即可


 */
```

# 2
httpRequest 方法改下,名字改成 httpRequestToMaximo

## response返回时
如果cookie中包含JSESSIONID,则缓存为全局变量

## request 请求时

如果存在全局缓存 JESSIONID,则将JSESSIONID信息添加到cookie,例如
```
Cookie: 	JSESSIONID=0000TtX4Wm71j9LBavNNSZLhvhN:bca813df-34f0-4b6c-841a-9762ccbd61be
```

如果 noAuth=false,

认证方式为 apiKey,就在header添加 apiKey ,否则就在header添加 MAXAUTH

如果 noAuth=true,
不在header添加apiKey或者MAXAUTH


# 3

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


# 4
导航菜单加个工具箱菜单

工具箱内使用标签页展示,标签页有

初始化脚本,导入脚本 这两个

功能实现参考 E:\gitwork\maximo-script-manager\ 项目中的工具箱功能

连接请求方式使用 httpRequestToMaximo 方法,不要对httpRequest.ts进行更改,据我分析 httpRequestToMaximo 能够满足这些需求

重要提示: 不要着急,慢慢来,分析仔细,提供完美的完成任务


# 5

补全模式当前有"默认模式","反射模式",增加一个 "VSCode模式",放到最顶端
```
VSCode模式
默认模式
反射模式
```
VSCode模式就相当于"把补全配置中的启用代码补全功能勾选框取消勾选"

然后 把补全配置中的启用代码补全功能勾选框取消掉,描述改为启用VSCode模式后取消插件补全方式

保存配置的按钮都取消掉,改为更改任何配置后即时保存


# 6
你这理解能力,真是蠢
右下角不是有个补全模式了,你还在补全配置里面加,补全配置里面你写个说明:如果要关闭插件补全模式,在右下角更改配置模式为VSCode就行了(具体怎么提示的你自己润色下)

# 7
右下角补全模式加了 VSCode模式没有?



# 8
工具箱菜单现在没内容

工具箱内使用标签页展示,标签页有

初始化脚本,导入脚本 这两个

功能实现参考 E:\gitwork\maximo-script-manager\ 项目中的工具箱功能

连接请求方式使用 httpRequestToMaximo 方法,不要对httpRequest.ts进行更改,据我分析 httpRequestToMaximo 能够满足这些需求

重要提示: 不要着急,慢慢来,分析仔细,提供完美的完成任务



# 9

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