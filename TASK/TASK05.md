# 1
"maximo配置"中 "补全设置"页下的 "启用类型推断" 下面加个勾选框  "自动生成反射api"(需要maximo接口才会生效) 

要做持久化存储,下文就以 jsonapi和tsapi 简称 reflection-data(存放通过java反射获取的的json文件) 目录的功能和 javaapi(存放通过java反射获取的的d.ts文件)的功能


jsonapi和tsapi 两个功能如下
1.
1. 插件启动时检查javaapi目录是否存在,不存在则新建,同时新建后将插件public/javaapisource下的所有目录和文件复制过去,
2. 检查javaapi目录是否存在.cacheClassjson 的文件,如果不存在则创建内容是空的json数组
3. 将javaapi/.cacheClassjson 加载到缓存
4. 开启后自动识别当前js脚本下的java类型,


 

判断缓存中是否

判断各自对应的 reflection-data 配置目录和 当前项目的javaapi 目录是否存在对应的文件,如果存在,则不做任何处理

然后通过下面的接口


```
curl --request POST \
  --url script/SKS_REFLECT_TS_GENERATOR \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'Cookie: JSESSIONID=0000ZhjlX5W_ofmSa9ZQOzRpmKy:4cc7249a-59e6-485a-baa0-c8ea67e49ee9' \
  --header 'MAXAUTH: bWF4YWRtaW46MTIzNDU2' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --data '{
    "className": "com.ibm.tivoli.maximo.script.ScriptService"
}'
```


```
curl --request POST \
  --url script/SKS_REFLECT_HELPER \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'Cookie: JSESSIONID=0000ZhjlX5W_ofmSa9ZQOzRpmKy:4cc7249a-59e6-485a-baa0-c8ea67e49ee9' \
  --header 'MAXAUTH: bWF4YWRtaW46MTIzNDU2' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --header 'apiKey: erg8n2vk6pcu9ou1cr61jag49qdmjuk65ac6l1q0' \
  --data '{
    "className": "com.ibm.tivoli.maximo.script.ScriptService"
}'
```