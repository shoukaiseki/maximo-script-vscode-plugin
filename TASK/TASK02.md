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