# 1
## 增加功能
工具箱增加消息导出,可配置目录和ignoreDefVal(简化json)勾选框,压缩勾选框,以及单个文件行数(根据分页查询导出多个文件)

再在maximo配置左侧菜单加个计划导出菜单,界面如下


### 页面规划
配置主导出目录全局:  E:/tmp/msh-masbackup/${envName}
<开始执行按钮>
序号        导出功能        目录                                语言  压缩   导出线程数   是否启用  
 1       导出MAXOBJECT   maxobject_backup$${timestamp}_zh       ZH    √       10         √
 2       导出MAXOBJECT   maxobject_backup{datetimeEN}_en        EN    √       10         √

#### 页面变量
envName     环境名称
timestamp   时间戳
datetimeEN  日期时间格式化成yyyyMMdd_HHmmss

#### 其它说明
1.保存到~/.sks/maximo-script-helper 目录下,你像个配置名称
2.序号自动,按照索引显示
3.语言使用下拉框,使用连接配置的下拉一样
4.按照顺序执行导出,导出配置和导出目录按照计划中的目录
5.如果没有的选项则忽略
6.导出功能使用下拉选项
7.导出时顺序执行导出功能

导出进度你帮我设计下,可以直观查看导出进度,是不是可以用进度条+日志的方式?

##### 示例
比如当前时间2026年7月30日00:09:54, datetimeEN格式化成 20260730_001009
当前环境是 loction
导出目录,比如2,变量替换后导出到 E:/tmp/msh-masbackup/loction/maxobject_backup20260730_001009_zh




导出接口脚本: E:/gitwork/wushiling/jsproject/masscript/cn/shoukaiseki/tools/SKS_EXPORT_MESSAGES.js



#2


这是导出domain的接口,工具箱增加 导出domain 标签页,导出计划也增加这个选项
```
curl --request POST \
  --url '/api/script/SKS_EXPORT_DOMAIN?_langcode=ZH?_action=export' \
  --header 'Accept: */*' \
  --header 'Content-Type: application/json' \
  --header 'apiKey: xxxxxxxx' \
  --data '{
	
}'
```