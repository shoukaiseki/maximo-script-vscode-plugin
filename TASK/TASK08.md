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