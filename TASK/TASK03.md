# maximo-AUTOSCRIPT更新接口
按照以下测试后的结果,将 .lingma/skills/maximo-autoscript-api/SKILL.md 更新下
## 正确的方式
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
## 错误的方式1

```
http://localhost:9080/maximo/api/os/MXSCRIPT/_VEVTVA==?lean=1
```
不能加lean,加了之后实际返回204,但是实际数据没更新



## 错误的方式2
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



# 测试
​test-autoscript-api.http​ 这个测试你也重新测下,使用
/os/MXAPIAUTOSCRIPT?lean=1&oslc.select=autoscript,description,source&oslc.where=autoscript="TEST" &lean=1 接口查询结果
主要测更新
对/api或者/oslc,/MXAPIAUTOSCRIPT 或者 /MXSCRIPT 
加不加&lean=1,以及字段名大小写 
还有加不加 spi: 或者 oslc:的情况, 多个维度都测下,
更新完之后要重新查询,是否更新成功
脚本名就用TEST测试,这个可以随便改,
结果更新到这个文档,这个文档以前只测试返回码成功而已,并没有对数据是否成功验证


# 5
工具箱的初始化脚本功能写下,将 public\maximo-developer-resources 中的全部导入,最后 public\maximo-developer-resources 要打包到插件中

可以参考 E:\gitwork\maximo-script-manager\toolbox.html 中工具箱的初始化脚本功能

另外也加个删除工具脚本的标签,功能按照 E:\gitwork\maximo-script-manager\toolbox.html 工具箱的清除脚本功能来做


# 6

现在是初始化把脚本导进去了,但是你这代码真的跟  E:\gitwork\maximo-script-manager\ 中的差太多了,让你照那个项目逻辑抄,你也没搞明白,别以交任务的心态去做事,做事要好好做,你先读懂,仔细看,逻辑要搞清楚,1:1复刻功能,要做笔记就写到AITMP目录中,把导入单个脚本写一个方法,功能都一样的,就是把脚本通过接口新建/更新到maxiom中,方法开头是先查询脚本存在不存在,不存在就新增,存在就更新,简简单单那的事,
然后其它都调他,多点参数而已


# 7
_deploySingleFileInternal 方法中,读取json文件,然后再读取脚本文件(具体参考 E:\gitwork\maximo-script-manager\toolbox.js deploySingleFile方法)
调再 _deployScript 接口啊