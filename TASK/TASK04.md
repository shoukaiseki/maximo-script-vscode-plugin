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

