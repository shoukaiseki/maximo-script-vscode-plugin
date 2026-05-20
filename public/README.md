# 说明

## deploy-db-json
### AUTOSCRIPT_PACKAGEPATH_API_CONFIG.json 	
自动化脚本表增加一个packagePath字段,用于 maximo script vscode plugin拉取脚本时根据包名创建目录	


### IBM_AUTOSCRIPT_HISTORY_API_CONFIG.json
保存脚本历史记录

如果创建表时出现失败,
是因为CLOB字段会默认使用 clob(1g),有的db2版本不支持这样创建
```sql
 create table ibm_autoscript_history (
	 ibm_autoscript_historyid bigint not null PRIMARY KEY ,
	 description vargraphic (50),
	 hasld integer not null,
	 source clob(1g) logged,
	 version vargraphic (20),
	 createtime timestamp,
	 createperson vargraphic (100),
	 rowstamp bigint not null
 )
 in MAXDATA index in MAXINDEX ;
```
先将source改成 aln类型配好库

再在数据库后台修改source类型,必须先删除SOURCE字段再增加
```sql
alter table IBM_AUTOSCRIPT_HISTORY drop column SOURCE;
call sysproc.admin_cmd('reorg table IBM_AUTOSCRIPT_HISTORY');


alter table IBM_AUTOSCRIPT_HISTORY add SOURCE CLOB;
call sysproc.admin_cmd('reorg table IBM_AUTOSCRIPT_HISTORY');

```

接着更新数据库配置表
```

update MAXATTRIBUTECFG set MAXTYPE='CLOB',LENGTH=999999  where OBJECTNAME='IBM_AUTOSCRIPT_HISTORY' and ATTRIBUTENAME='SOURCE';
update MAXATTRIBUTE set MAXTYPE='CLOB',LENGTH=999999  where OBJECTNAME='IBM_AUTOSCRIPT_HISTORY' and ATTRIBUTENAME='SOURCE';


select MAXTYPE,LENGTH from MAXATTRIBUTECFG where OBJECTNAME='IBM_AUTOSCRIPT_HISTORY' and ATTRIBUTENAME='SOURCE';
select MAXTYPE,LENGTH from MAXATTRIBUTE where OBJECTNAME='IBM_AUTOSCRIPT_HISTORY' and ATTRIBUTENAME='SOURCE';

```

再在应用程序设计器,scriptlanguage下面增加 IBM_PACKAGEPATH 属性,长度60
```
<textbox dataattribute="scriptlanguage" id="main_grid2_attr1_2" lookup="scriptengines"/>
<textbox dataattribute="IBM_PACKAGEPATH" id="1779285828009" size="60"/>
```