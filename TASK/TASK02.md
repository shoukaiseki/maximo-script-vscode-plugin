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

```
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
然后把 enableHttpLog 的配置选项 放到其它配置里面