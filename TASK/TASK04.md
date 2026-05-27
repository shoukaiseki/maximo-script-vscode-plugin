# 1
自动化脚本表增加一个packagePath字段,用于 maximo script vscode plugin拉取脚本时根据包名创建目录	

之前这个功能忘记了?

# 2
​App.tsx 822-822​ 这下面增加说明"使用工具箱导入功能,导入https://gitee.com/shoukaiseki/maximo-script-vscode-plugin/tree/master/sks_tooljs下的所有脚本


# 3
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

# 4
日志级别配置中的 "重新加载此日志器的级别" 按钮放到 日志级别查询,再加一列更改日志级别

日志级别查询table展示
```
    日志器名称      日志级别        更改日志级别           操作
```
"重新加载此日志器的级别" 按钮放到操作
更改日志级别为下拉,默认跟"日志级别"列相同,更改日志级别之后,直接调用接口更新maximo的日志级别


# 5
日志级别查询中修改单个的别清空整个列表啊,返回的信息中只有一条记录器级别信息,遍历整个列表的list,更新记录器名称相同的那条记录即可



# 6
编辑器打开xml文件加个右键菜单, 应用xml推送到maximo,与js不同的处理逻辑

xml文件是直接调用
```
POST /maximo/api/script/SHARPTREE.AUTOSCRIPT.SCREENS
```
文件内容放到body里面


# 7

maximo Script配置 -> 工具箱 -> 导出脚本,选择目录后,目录持久化保存

maximo Script配置 -> 连接配置 服务器地址上面增加 环境选项(字段名为envnum)  下拉切换环境 这个选项进行持久化保存 

然后不同的环境配置存储到 ~/.sks/maximo-script-helper/envs.json 文件中(只保存连接配置的信息)


## 环境选项逻辑
1. 环境选项可以输入,也可以下拉, 右边加个加载按钮
2. 如果当前环境名称对应的选项不存在,加载按钮只读
3. 默认环境选项是从vscode配置中读取
4. 环境选项默认值为 default,页面初始化时 整个 "连接配置" 页面显示 vscode的配置存储的配置信息,同时加载 envs.json进页面缓存(字段名为envsCache)
5. 点击最下面的 保存配置 按钮之后,vscode配置进行保存, 再根据envnum的值,查找envsCache中是否有envnum相同的记录,如果有则更新,没有则新增,envsCache更新之后,同时将envsCache保存到 envs.json 文件中
6. 加载按钮点击后,将envsCache对应的信息设置到连接配置页面中的其它字段中


保存配置按钮上面加个 红色提示 ,类似需要保存提醒的字样, 在页面有信息变更的时候显示 ,保存之后消失


# 8
怎么保存到连接 envs.json 文件?如果没有 就在加载右边加个保存按钮

两个按钮都显示


环境选项怎么没有下拉功能?我要的是能下拉也能输入


这样太丑了,下拉去掉吧,加载按钮 缓存 "切换环境"按钮,点击后弹出对话框,对话框显示当前所有环境列表,一列放加载按钮,点击后实现加载环境的功能

你又删掉输入框干嘛?我怎么新增环境?,怎么显示当前是哪个环境?
你能不能有点脑子?让啥啥不行,坑人第一名



# 9

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


# 10 
## 环境切换使用帮助
配置文件位于 C:\Users\jiang\.sks\maximo-script-helper\envs.json (修改后不会即时生效)

环境配置只对连接配置有效,环境名称尽量使用英文和一些常规符号(-_等)

输入连接之后,再输入环境名称,点击保存可以保存为新环境配置

环境名称修改之后再保存又会创建一个新的环境配置,

点击切换环境之后点击加载可以切换新的环境,同时会保存到vscode配置中

上面的说明美化下更新到 HELP.md 