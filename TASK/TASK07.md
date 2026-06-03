# 1
Maximo配置中 连接配置 登录配置  langcode 语言下拉框,下面增加一个 勾选框("Maximo Script: 推送 XML 到 Maximo"始终使用MAXAUTH认证方式)

做持久化保存,vscode保存,同时保存到不同环境中, 不同环境下当前没有这个属性,为空则设置为 true


其他你先不要改,先看代码再改,我有对文件做过改动


# 2

maximo配置->工具箱->导出脚本

导出脚本按钮左边加个勾选框"不自动生成导出目录",做持久化存储

再在导出脚本功能加个按照包名进行创建目录和存储脚本的功能(跟pull单个脚本一样,根据脚本的packgePath创建目录)



# 3


将自动生成带时间戳的子目录（如：autoscript_backup_20260523_143025） "不自动生成导出目录（直接保存到选择的目录）"勾选框是这个功能

将直接保存到选择的目录，脚本按包名结构组织: 这个功能永久生效

是我说错了

未勾选"不自动生成导出目录（直接保存到选择的目录）"
```
 - autoscript_backup_20260523_143025
    - com/
        └─ example/
        └─ script/
            ├─ SCRIPT_A.js
            └─ SCRIPT_A.json
    - org/
        └─ maximo/
        └─ autoscript/
            ├─ SCRIPT_B.js
            └─ SCRIPT_B.json
```

勾选了
```
  - com/
    └─ example/
       └─ script/
          ├─ SCRIPT_A.js
          └─ SCRIPT_A.json
  - org/
    └─ maximo/
       └─ autoscript/
          ├─ SCRIPT_B.js
          └─ SCRIPT_B.json
```

