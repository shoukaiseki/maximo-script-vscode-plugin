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