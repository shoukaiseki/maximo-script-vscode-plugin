# 01
帮我加个功能,编辑器打开xml文件加个右键菜单, 修复应用xml的id属性

## 点击后处理逻辑
每个元素都有个id,如果出现重复的,将后面的id进行随机生成一个新的id,完成之后提示修复多少个重复的id,不处理没有id属性的元素

特别注意: 要保留原有xml中注释的内容



# 02
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

# 03
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


# 04
工具箱中的 导出MAXOBJECT 标签下增加一个启用精简/完整开关,进行持久化存储

开启精简模式后 SKS_EXPORT_DBCONFIG接口中增加参数 ignoreDefVal=true


# 05
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




# 06
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


# 07
脚本类型放第一行

## 对象启动点中
 - 如果所选的脚本类型需要启动点配置对象和属性的,脚本名输入之后,根据.进行分割,将[0]设置到对象名称,[1]设置到属性名称
 - 如果所选的脚本类型需要启动点配置对象的,脚本名输入之后,根据.进行分割,将[0]设置到对象名称