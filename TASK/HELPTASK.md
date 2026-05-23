# 使用帮助文档
目前只支持js格式的脚本,python格式的未测试,支持有限
## 启用日志
点下"日志"(如果没有,打开一个js文件就可以看见),筛选器右边选择"Maximo Script Helper",日志级别调为"跟踪",就能看到插件日志了

## 插件配置
在右下角点击"Maximo配置"->"其它配置"->勾选"启用 HTTP 请求日志保存"

"连接配置"->服务器地址要带maximo路径,例如: http://localhost:9080/maximo


登陆方式如果是MAXAUTH,进浏览器开发者工具,执行 atob("maxadmin:密码"),获得base64加密的结果,使用这个即可

API KEY 方式的话,在maximo导航项中搜索API,进入"API KEY"应用,创建一个即可

Maximo版本就选9.1(7.6的没测试,要是选了7.6,很抱歉,坑的就是你),接口方式选择 API方式,因为OSLC方式可能会出现请求体过大报错"Error: Parse Error: Header overflow"

然后点测试连接,如果出现错误,右下角"日志"查看"输出"中的插件日志,会有url和http文件,你再postman之类的试下,开启maximo中相应的功能即可

连接成功后,点击"工具箱"->"初始化脚本",将一些功能脚本导入到maximo系统中


## 补全设置
### 本地 API 文档路径
下载 https://gitee.com/shoukaiseki/maximo-script-editor/tree/master/reflection-data 下面的json文件,放到一个目录,选择该目录即可
### jdk路径
如果启用反射模式代码补全,需要配置该信息

选择jdk17路径,例如:d:\usr\java\jdk-17.0.19x64

jar包配置,你将jar放到一个目录下,那就选择jar目录即可,如果你要单个jar的选择,也是可以的

需要这些jar包
```
javax.xml.bind_2.2.0.v201105210648.jar
activation-1.1.1.jar
javax.mail-1.6.2.jar
javax.servlet-api-4.0.1.jar

slf4j-simple-2.0.13.jar
asm-7.3.1.jar
asm-analysis-7.3.1.jar
asm-commons-7.3.1.jar
asm-tree-7.3.1.jar
asm-util-7.3.1.jar
batik-util-1.17.jar
beans.jar
businessobjects.jar
commonweb.jar
decompiler.cmd
icu4j.jar
jena-2.6.3-patched.jar
json4j.jar
log4j-1.2-api-2.25.3.jar
log4j-api-2.25.3.jar
log4j-core-2.25.3.jar
log4j-web-2.25.3.jar
maximo_client.jar
maximo_registry.jar
mboejb.jar
mbojava.jar
nashorn-core-15.6.jar
oslcquery.jar
slf4j-api-2.0.11.jar
slf4j-log4j12-1.6.4.jar
```
### jsDoc解析
开启反射模式时有效
```js
// 示例1: 单变量类型声明
/** @type {psdi.mbo.MboRemote} */
var assetMbo = mbo;

// 现在输入 assetMbo. 会显示 MboRemote 的方法
assetMbo.getString("assetnum");
assetMbo.setValue("description", "测试");
mbo.che
// 示例2: 多变量同时声明（用逗号分隔）
/** @type {psdi.mbo.MboSetRemote} */
var locationSet, worklogSet;
```
详见 https://gitee.com/shoukaiseki/maximo-script-vscode-plugin/blob/master/sks_demo/demo.js 中的注解方式

## 手动调用接口
下载 https://gitee.com/shoukaiseki/maximo-script-vscode-plugin/tree/master/public/deploy-db-json 下的两个json文件

将使用postman调用以下接口,data根据json文件的内容粘贴即可
```
curl --request POST \
  --url 'http://localhost:9080/maximo/api/script/SHARPTREE.AUTOSCRIPT.LIBRARY?develop=true&ignoreRelationships=true&ignoreAttributes=true' \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'apiKey: <your apikey>' \
  --data '{
  "maxObjects": [
    {
      "object": "AUTOSCRIPT",
      "internal": false,
      "ignoreObjectMain": true,
      "attributes": [
        {"attribute": "IBM_PACKAGEPATH", "description": "maximo script vscode plugin中使用,会根据该字段包路径创建层级目录", "title": "包路径", "type": "ALN", "length": 200, "required": false, "persistent": true, "searchType": "WILDCARD"}
      ]
    },
    {
      "object": "AUTOSCRIPT",
      "internal": true,
      "ignoreObjectMain": true
    }
  ]
}
'
```

#### AUTOSCRIPT_PACKAGEPATH_API_CONFIG.json
这个是在ATUSCRIPT增加一个 packgePath 字段,类似于java的包名称,会在下面查询脚本中pull服务器脚本功能使用到

脚本中首先将 AUTOSCRIPT 内部定义值改为 false,这样就能添加字段(不然系统表添加不了字段),然后再改为true,

ignoreObjectMain为true是也会更改 internal 属性,该功能就是为了修改 internal 用的
#### IBM_AUTOSCRIPT_HISTORY_API_CONFIG.json
这个是增加一个 IBM_AUTOSCRIPT_HISTORY 的表,用于存放历史脚本记录

详见 https://gitee.com/shoukaiseki/maximo-script-vscode-plugin/blob/master/public/README.md



## 

## 工具箱
### 导出脚本
选择一个目录作为脚本备份目录,会导出maximo系统中所有的脚本进行备份

每个脚本会生成一个js,json的文件,json主要存放AUTOSCRIPT的表属性信息(不包含SOURCE),js主要存放SOURCE内容

### 导入脚本
导出脚本格式的脚本进行导入

备份时会在你选择的目录下生成一个 autoscript_backup_+<yyyyMMdd>_HHmmss 的目录
### 清楚脚本
将系统中一些脚本删除掉,谨慎操作,一定要先进行导出脚本备份

json配置文件如下
```json
[
    "sharptree.autoscript.admin",
    "sharptree.autoscript.deploy",
    "sharptree.autoscript.extract",
    "sharptree.autoscript.form",
    "sharptree.autoscript.install",
    "sharptree.autoscript.library",
    "sharptree.autoscript.logging",
    "sharptree.autoscript.report",
    "sharptree.autoscript.screens",
    "SHARPTREE.AUTOSCRIPT.DEPLOY.HISTORY",
    "sharptree.autoscript.store",
    "TEST01"
]
```


## 脚本pull和push
首先在 其它配置里面的 脚本存放目录(默认masscript,下文中masscript代表你配置的实际目录)

其它配置里面的别名 用于push脚本时,历史记录中的别名字段,区分是推送的人

脚本pull时候会生成在当前项目下的masscript目录中
### pull
Maximo配置->查询脚本

先点击一下查询脚本,就可以过滤搜素(缓存搜索方式)

点击你想要pull的脚本右边的pull按钮
 
根据脚本中 IBM_PACKAGEPATH属性(例如cn.shoukaiseki.test)

会在 masscript 目录下创建 cn/shoukaiseki/test 目录,并将脚本存储在该目录,文件名即为 <脚本名(AUTOSCRIPT字段值)>.js 和 <脚本名(AUTOSCRIPT字段值)>.json

内容格式跟导出脚本的一致


### push
在脚本编辑框点击右键,选择 "Maximo Script:推送到 Maximo"

他会先查找 脚本同名的json文件,获取json中的版本号,

版本号要以 1.0.1 方式命名,会获取最后一个逗号后面的数字,进行+1,回写到json文件中,

首先根据json的配置信息,插入到历史记录表中(会调用/maximo/api/script/SKS_AUTOSCRIPT_HISTORY_SAVE接口脚本)

再更新AUTOSCRIPT的 SOURCE和VERSION字段值