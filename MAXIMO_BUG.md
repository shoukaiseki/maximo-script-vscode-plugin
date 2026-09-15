# maximo bug

## 版本 maximo 9.1.356



### 对象结构数据问题

原来的 PARENTOBJID值是3,没有对应的父级,修复语句如下

```sql
update MAXINTOBJDETAIL set PARENTOBJID=(select OBJECTID from MAXINTOBJDETAIL where INTOBJECTNAME='DMEXPGROUP' and OBJECTNAME='EXPGROUP') where INTOBJECTNAME='DMEXPGROUP' and RELATION='EXPAHQTOSLCREF';
```

会报这个错误,竟然是通过对象结构缓存获取的父级objectName,父级为空,获取失败了

```

2026-09-15T16:56:42.596993004Z [mas-liberty] java.lang.NullPointerException: Cannot read field "parentInfo" because "this" is null
2026-09-15T16:56:42.596998568Z [mas-liberty] at psdi.iface.mos.MosDetailInfo.getParentObjName(MosDetailInfo.java:287)
2026-09-15T16:56:42.597003788Z [mas-liberty] at psdi.iface.app.intobject.FldParentObjName.initValue(FldParentObjName.java:72)
2026-09-15T16:56:42.597007900Z [mas-liberty] at psdi.mbo.MboValue.initValue(MboValue.java:455)
2026-09-15T16:56:42.597012102Z [mas-liberty] at psdi.mbo.MboValue.getString(MboValue.java:609)
2026-09-15T16:56:42.597015931Z [mas-liberty] at psdi.mbo.Mbo.getString(Mbo.java:2110)
2026-09-15T16:56:42.597037233Z [mas-liberty] at org.openjdk.nashorn.internal.scripts.Script$Recompilation$14744$16097A$\^eval\_.buildIntObject(<eval>:601)
2026-09-15T16:56:42.597041330Z [mas-liberty] at org.openjdk.nashorn.internal.scripts.Script$Recompilation$14743$97323A$\^eval\_.intObjectExportResponse(<eval>:2950)
```
