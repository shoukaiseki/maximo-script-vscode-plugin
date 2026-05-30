# 1
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