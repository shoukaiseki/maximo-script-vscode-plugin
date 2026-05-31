# 1

选择包名类名之后,当前有右键菜单 "Maximo Script: 获取类反射信息" ,将其改名为 "Maximo Script: 通过maximo接口获取类反射信息" ,只改菜单名称

现在加一个选项, "Maximo Script: 通过本地反射获取类反射信息"


两者除了获取json方式不同外,其他处理逻辑一样

```
接口是通过 script/SKS_REFLECT_HELPER_ENHANCED 获取json

本地反射是通过 java 执行获取json
```



根据 ReflectHelper.java 类创建一个新的类,满足与 调用 script/SKS_REFLECT_HELPER_ENHANCED 返回相同的json数据

记得用jdk8(D:\usr\java\jdk1.8.0_491x64)编译,运行加载的jar包跟运行 ReflectHelper.class时候一致就行

# 2
"d:\usr\java\jdk-17.0.19x64\bin\java" -cp "e:\gitwork\maximo-script-vscode-plugin\dist;E:\gitwork\maximoi\lib;E:\gitwork\maximoi\maximolib"



你这怎么干的活? 
JAR 目录配置（用于实时反射） :这个jar存放的目录,
添加单个 JAR 文件 : 这是单个jar的配置

执行的时候目录下的jar和单个jar下的所有项 都得在 -cp中,你好歹看下之前的反射代码喽,别偷懒 



# 3
OK了,手动触发本地反射OK了


Maximo配置->补全设置中的 "自动生成反射API"勾选框下面加个 "自动通过本地jar生成反射API"

当前自动生成javaapi和jsonapi时,是调用maximo接口,

如果调用maximo接口获取失败,则判断是否勾选 "自动通过本地jar生成反射API", 如果勾选了就 使用刚新增的右键菜单 "Maximo Script: 通过本地反射获取类反射信息" 的功能, 

两则都失败才算获取失败,失败次数+1

