# 1


```
/** @type {java.lang.String} */

var a=mbo.getString("String")

a.toU
```

如果是 E:\gitwork\oracle-vscode-java插件(oracle提供的java补全插件)

在 a.toU 之后,还是能正确提供String类型包含 toU 方法的补全建议

但是我们这个插件现在只能在输入 . 之后才能获取到正确的String类型补全建议,按Esc取消建议之后,再输入就没有正确类型的代码建议了



# 2
增加
```
E:\gitwork\oracle-vscode-java\snippets\server.json
```
的补全效果, 我们也使用json进行配置,增加 jsDoc 可以生成 /** @type {java.lang.String} */ 这种快捷定义类型的代码