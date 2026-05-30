# 1
"maximo配置"中 "补全设置"页下的 "启用类型推断" 下面加个勾选框  "自动生成反射api"(需要maximo接口才会生效) 

要做持久化存储,下文就以 jsonapi和tsapi 简称 reflection-data(存放通过java反射获取的的json文件) 目录的功能和 javaapi(存放通过java反射获取的的d.ts文件)的功能

本次功能所讲的反射是指通过maximo接口获取的反射信息

jsonapi和tsapi 两个功能如下
### maximoScriptClass 存储
#### .maximoScriptClass.json   
存储已存在的api文件的类
#### .ignoreMaximoScriptClass.json
存储获取失败的类名和次数,重试次数为-1,则表示永久忽略获取反射
同一个类反射获取失败10次则也进行忽略,10次之后次数不设置为-1,保留失败次数可查看

获取成功的反射数据后将删除掉 .ignoreMaximoScriptClass.json 中的类名


```
{
	"status": "error",
	"message": "error#无法加载类: com.ibm.tivoli.maximo.script.ScriptService1 - com.ibm.tivoli.maximo.script.ScriptService1"
}
```
通过反射获取失败后返回的json是status=error 的属于不存在的类,可以直接忽略,重试次数次数设为-1


### 插件启动逻辑
1. 插件启动时检查javaapi目录是否存在,不存在则新建,同时新建后将插件public/javaapisource下的所有目录和文件复制过去,进入第2步
2. 检查javaapi目录是否存在.maximoScriptClass.json 的文件,如果存在则进入第3步
  如果不存在则创建内容是 空的数组 保存到.maximoScriptClass.json 和 .ignoreMaximoScriptClass.json,进入第3步

3. 将javaapi/.maximoScriptClass.json 加载到缓存

### 自动生成反射api文件逻辑
1. 开启后自动识别当前js脚本下的java类型,如果缓存中存在则不做处理,如果包名是 jscustom 开头的也不做处理,类名为 custom 和 global 的也不做处理
2. 如果缓存中不存在则通过maximo反射接口获取(后台处理,同一个5秒之内别触发多次)

## 重要提示
1. 创建javaapi目录下的文件可参考 E:\gitwork\maximo-script-manager\test\extract-and-generate-ts.js
      需要更新 javaapi/global.d.ts 的文件,这里就使用reflection-data中jsonapi的数据进行处理成 d.ts 文件,避免多次请求maximo接口

2. reflection-data存储时也按照包名创建相应的目录,避免单个目录文件太多

3. E:\gitwork\maximo-script-vscode-plugin\javaapi\jscustom\AnsiLogger.d.ts 这个类的代码建议是正常能够提示的,参考这个文件的方式生成对应类的 d.ts 文件

4. 先把实现步骤保存到 AITMP目录下之后再直接开始完成交给你的任务,我先去吃饭了,你一定要在半个小时只能不要停止工作



## maximo反射接口如下
```
curl --request POST \
  --url script/SKS_REFLECT_HELPER \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --header 'apiKey: rvndme5p247ttca2048a1l0oedhbloh11d0qdc6j' \
  --data '{
    "className": "com.ibm.tivoli.maximo.script.ScriptService"
}'

```


# 2
Maximo配置中 连接配置 登录配置 右边增加一个 langcode 语言下拉框,下拉框需要有搜索功能

langcode 做持久化保存,vscode保存,同时保存到不同环境中, 不同环境下当前没有这个属性,为空则设置为 en,语言选项如下,显示第二列,选择后保存第一列的数据
```
AA,Afar
AE,Avestan
AF,Afrikaans
AM,Amharic
AR,عربية
AS,Assamese
AY,Aymara
AZ,Azerbaijani
BA,Bashkir
BE,Belarusian
BG,български
BH,Bihari
BI,Bislama
BN,Bengali
BO,Tibetan
BR,Breton
BS,Bosnian
CA,Catalan
CE,Chechen
CH,Chamorro
CO,Corsican
CS,Čeština
CU,Church Slavic
CV,Chuvash
CY,Welsh
DA,Dansk
DE,Deutsch
DZ,Dzongkha
EL,Ελληνικά
EN,English
EO,Esperanto
ES,Español
ET,Eesti
EU,Basque
FA,Persian
FI,Suomi
FJ,Fijian
FO,Føroyska
FR,Français
FY,Frisian
GA,Irish
GD,Gaelic (Scots)
GL,Gallegan
GN,Guarani
GU,Gujarati
GV,Manx
HE,עברית
HI,हिन्दी
HO,Hiri Motu
HR,Hrvatski
HU,Magyar
HY,Armenian
HZ,Herero
IA,Interlingua (International Auxiliary Language Association)
ID,Indonesian
IE,Interlingue
IK,Inupiaq
IS,Íslenska
IT,Italiano
IU,Inuktitut
JA,日本語
JW,Javanese
KA,ქართული
KI,Kikuyu
KJ,Kuanyama
KK,Kazakh
KL,Kalaallisut
KM,Khmer
KN,Kannada
KO,한국어
KS,Kashmiri
KU,Kurdish
KV,Komi
KW,Cornish
KY,Kirghiz
LA,Latin
LB,Letzeburgesch
LN,Lingala
LO,Lao
LT,Lietuvių
LV,Latviešu
MG,Malagasy
MH,Marshall
MI,Maori
MK,македонски
ML,Malayalam
MN,Mongolian
MO,Moldavian
MR,Marathi
MS,Malay
MT,Maltese
MY,Burmese
NA,Nauru
NB,Norwegian Bokmal
ND,"Ndebele, North"
NE,Nepali
NG,Ndonga
NL,Nederlands
NN,Norwegian Nynorsk
NO,Norsk
NR,"Ndebele, South"
NV,Navajo
NY,Chichewa; Nyanja
OC,Occitan (post 1500); Provencal
OM,Oromo
OR,Oriya
OS,Ossetian; Ossetic
PA,ਪੰਜਾਬੀ
PI,Pali
PL,Polski
PS,Pushto
PT,Português
QU,Quechua
RM,Raeto-Romance
RN,Rundi
RO,Română
RU,Pyccкий
RW,Kinyarwanda
SA,Sanskrit
SC,Sardinian
SD,Sindhi
SE,Northern Sami
SG,Sango
SI,Sinhalese
SK,Slovenčina
SL,Slovenščina
SM,Samoan
SN,Shona
SO,Somali
SQ,Albanian
SR,Srpski
SS,Swati
ST,"Sotho, Southern"
SU,Sundanese
SV,Svenska
SW,Swahili
TA,Tamil
TE,Telugu
TG,Tajik
TH,ภาษาไทย
TK,Turkmen
TL,Tagalog
TN,Tswana
TR,Türkçe
TS,Tsonga
TT,Tatar
TW,Twi
TY,Tahitian
UG,Uighur
UK,Українська
UR,Urdu
UZ,Uzbek
VI,Vietnamese
VO,Volapuk
WO,Wolof
XH,Xhosa
YI,Yiddish
ZA,Zhuang
ZH,简体中文
ZU,Zulu
ZHT,繁體中文
```


# 4

测试连接旁边加个 查看用户语言信息按钮,调用下面接口
```
curl --request POST \
  --url 'script/SKS_CURRENT_USER_INFO?develop=true&_langcode=ZH_cn' \
  --header 'Accept: */*' \
  --header 'Accept-Encoding: gzip, deflate, br' \
  --header 'Connection: keep-alive' \
  --header 'User-Agent: PostmanRuntime-ApipostRuntime/1.1.0' \
  --header 'apiKey: rvndme5p247ttca2048a1l0oedhbloh11d0qdc6j'
```
返回信息如下
```
{
	"data": {
		"userInfo": {
			"langcode": "ZH_CN",
			"localeLanguage": "en",
			"displayname": "MAXADMIN",
			"personId": "MAXADMIN",
			"localeCountry": "US",
			"locale": "en_US",
			"userName": "MAXADMIN"
		},
		"peruser": {
			"ACCEPTINGWFMAIL": true,
			"ADDRESSLINE1": "",
			"ADDRESSLINE2": "",
			"ADDRESSLINE3": "",
			"BILLTOADDRESS": "",
			"BIRTHDATE": null,
			"CALTYPE": "",
			"CITY": "",
			"CLASSSTRUCTUREID": "",
			"COUNTRY": "",
			"COUNTY": "",
			"DELEGATE": "",
			"DELEGATEFROMDATE": null,
			"DELEGATETODATE": null,
			"DEPARTMENT": "",
			"DEVICECLASS": 0,
			"DFLTAPP": "",
			"DISPLAYNAME": "超级管理员",
			"DROPPOINT": "",
			"EMPLOYEETYPE": "",
			"EXTERNALREFID": "",
			"FIRSTNAME": "",
			"HIREDATE": null,
			"IM_ID": "",
			"JOBCODE": "",
			"LANGUAGE": "",
			"LANGUSERUPDATED": true,
			"LASTEVALDATE": null,
			"LASTNAME": "",
			"LOCALE": "",
			"LOCATION": "",
			"LOCATIONORG": "",
			"LOCATIONSITE": "",
			"LOCTOSERVREQ": true,
			"NEXTEVALDATE": null,
			"OWNERGROUP": "",
			"OWNERSYSID": "",
			"PCARDEXPDATE": "",
			"PCARDNUM": "",
			"PCARDTYPE": "",
			"PCARDVERIFICATION": "",
			"PERSONID": "MAXADMIN",
			"PERSONUID": 3,
			"POSTALCODE": "",
			"PRIMARYEMAIL": "",
			"PRIMARYPHONE": "",
			"PRIMARYSMS": "",
			"REGIONDISTRICT": "",
			"SADDRESSCODE": "",
			"SENDERSYSID": "",
			"SHIPTOADDRESS": "",
			"SOURCESYSID": "",
			"STATEPROVINCE": "",
			"STATUS": "ACTIVE",
			"STATUSDATE": "2004-04-14T11:58:32+08:00",
			"SUPERVISOR": "",
			"TERMINATIONDATE": null,
			"TIMEZONE": "",
			"TITLE": "",
			"TRANSEMAILELECTION": "ALWAYS",
			"USERNOTFTYPE": "",
			"VIP": 0,
			"WFMAILELECTION": "ALWAYS",
			"WOPRIORITY": 0,
			"MAXUSER": [
				{
					"APIKEYADMIN": false,
					"CHANGEBY": "MAXADMIN",
					"CHANGEDATE": "2026-05-30T18:38:39+08:00",
					"COGNOSSYNCSTATUS": "notenabled",
					"CREATEDBY": "",
					"CREATEDDATE": "2026-05-07T04:42:00+08:00",
					"DATABASEUSERID": "",
					"DEFAULTREPFAC": "",
					"DEFAULTREPFACSITEID": "",
					"DEFSITE": "ISUZUSET",
					"DEFSTOREROOM": "",
					"EMAILPSWD": false,
					"EXPIRESAT": null,
					"FAILEDLOGINS": 0,
					"FORCEEXPIRATION": false,
					"IBMID": "",
					"IDPADMIN": false,
					"INACTIVESITES": true,
					"INACTIVITYTIMEOUT": "",
					"IOTROLE": "NO_ACCESS",
					"ISAUTHORIZED": 0,
					"ISCONSULTANT": false,
					"ISLOCKED": false,
					"LICMETRICTYPE": "",
					"LOGINID": "maxadmin",
					"MASERRORCODE": "",
					"MASISSUER": "",
					"MASSYNCSTATUS": 1,
					"MAXUSERID": 1,
					"MEMO": "",
					"OWNER": "local",
					"PASSWORDCHECK": "",
					"PASSWORDINPUT": "",
					"PWEXPIRATION": null,
					"PWHINTANSWER": "QxKJtULQ3/OZkaarxH/TNA==",
					"PWHINTQUESTION": "",
					"QUERYWITHSITE": true,
					"SCREENREADER": false,
					"SIDENAV": 0,
					"STATUS": "ACTIVE",
					"STOREROOMSITE": "",
					"SYNCPROFILE": false,
					"SYSTEMADMIN": false,
					"SYSUSER": true,
					"TRIRIGAACCESS": "NO_ACCESS",
					"TYPE": "TYPE 1",
					"USERID": "MAXADMIN"
				}
			],
			"maximoId": 3,
			"objectName": "PERSON"
		}
	},
	"status": "success"
}
```
点击后弹出窗口显示接口返回的一些重要的信息, 你可以调用 db2 mcp工具查询字段描述

```
select
       OBJECTNAME,ATTRIBUTENAME,MAXATTRIBUTE.TITLE,l.TITLE as L_TITLE
from MAXATTRIBUTE
left join L_MAXATTRIBUTE as l on (MAXATTRIBUTEID=l.OWNERID and l.LANGCODE='ZH')
where OBJECTNAME in ('MAXUSER','person') ;
```



# 5
查看用户语言信息 对话框 增加显示 maxapps 信息,显示列表信息
```
{
	"data": {
		"maxapps": [
			{
				"APP": "AUTOSCRIPT",
				"APPTYPE": "RUN",
				"CUSTAPPTYPE": "",
				"DESCRIPTION": "Automation Scripts",
				"HASLD": false,
				"ISMOBILE": false,
				"LANGCODE": "EN",
				"LOCKENABLED": false,
				"MAINTBNAME": "AUTOSCRIPT",
				"MAXAPPSID": 182,
				"ORDERBY": "",
				"ORIGINALAPP": "",
				"RESTRICTIONS": "",
				"SKIPNAVIGATION": false
			},
			{
				"APP": "CONFIGUR",
				"APPTYPE": "RUN",
				"CUSTAPPTYPE": "",
				"DESCRIPTION": "Database Configuration",
				"HASLD": false,
				"ISMOBILE": false,
				"LANGCODE": "EN",
				"LOCKENABLED": false,
				"MAINTBNAME": "MAXOBJECTCFG",
				"MAXAPPSID": 18,
				"ORDERBY": "",
				"ORIGINALAPP": "",
				"RESTRICTIONS": "",
				"SKIPNAVIGATION": false
			},
			{
				"APP": "DESIGNER",
				"APPTYPE": "RUN",
				"CUSTAPPTYPE": "",
				"DESCRIPTION": "Application Designer",
				"HASLD": false,
				"ISMOBILE": false,
				"LANGCODE": "EN",
				"LOCKENABLED": false,
				"MAINTBNAME": "MAXAPPS",
				"MAXAPPSID": 128,
				"ORDERBY": "",
				"ORIGINALAPP": "",
				"RESTRICTIONS": "app not in ('STARTCNTR','DESIGNER','ECOMMADAPT','COGNOSHOME') and apptype not in ('OS', 'APP', 'WC', 'MAS')",
				"SKIPNAVIGATION": false
			},
			{
				"APP": "SECURGROUP",
				"APPTYPE": "RUN",
				"CUSTAPPTYPE": "",
				"DESCRIPTION": "Security Groups (Manage)",
				"HASLD": false,
				"ISMOBILE": false,
				"LANGCODE": "EN",
				"LOCKENABLED": false,
				"MAINTBNAME": "MAXGROUP",
				"MAXAPPSID": 109,
				"ORDERBY": "",
				"ORIGINALAPP": "",
				"RESTRICTIONS": "",
				"SKIPNAVIGATION": false
			},
			{
				"APP": "USER",
				"APPTYPE": "RUN",
				"CUSTAPPTYPE": "",
				"DESCRIPTION": "Users (Manage)",
				"HASLD": false,
				"ISMOBILE": false,
				"LANGCODE": "EN",
				"LOCKENABLED": false,
				"MAINTBNAME": "MAXUSER",
				"MAXAPPSID": 114,
				"ORDERBY": "",
				"ORIGINALAPP": "",
				"RESTRICTIONS": "",
				"SKIPNAVIGATION": false
			}
		],
		"userInfo": {
			"langcode": "ZH_CN",
			"localeLanguage": "en",
			"displayname": "MAXADMIN",
			"personId": "MAXADMIN",
			"localeCountry": "US",
			"locale": "en_US",
			"userName": "MAXADMIN"
		},
		"peruser": {
			"ACCEPTINGWFMAIL": true,
			"ADDRESSLINE1": "",
			"ADDRESSLINE2": "",
			"ADDRESSLINE3": "",
			"BILLTOADDRESS": "",
			"BIRTHDATE": null,
			"CALTYPE": "",
			"CITY": "",
			"CLASSSTRUCTUREID": "",
			"COUNTRY": "",
			"COUNTY": "",
			"DELEGATE": "",
			"DELEGATEFROMDATE": null,
			"DELEGATETODATE": null,
			"DEPARTMENT": "",
			"DEVICECLASS": 0,
			"DFLTAPP": "",
			"DISPLAYNAME": "超级管理员",
			"DROPPOINT": "",
			"EMPLOYEETYPE": "",
			"EXTERNALREFID": "",
			"FIRSTNAME": "",
			"HIREDATE": null,
			"IM_ID": "",
			"JOBCODE": "",
			"LANGUAGE": "",
			"LANGUSERUPDATED": true,
			"LASTEVALDATE": null,
			"LASTNAME": "",
			"LOCALE": "",
			"LOCATION": "",
			"LOCATIONORG": "",
			"LOCATIONSITE": "",
			"LOCTOSERVREQ": true,
			"NEXTEVALDATE": null,
			"OWNERGROUP": "",
			"OWNERSYSID": "",
			"PCARDEXPDATE": "",
			"PCARDNUM": "",
			"PCARDTYPE": "",
			"PCARDVERIFICATION": "",
			"PERSONID": "MAXADMIN",
			"PERSONUID": 3,
			"POSTALCODE": "",
			"PRIMARYEMAIL": "",
			"PRIMARYPHONE": "",
			"PRIMARYSMS": "",
			"REGIONDISTRICT": "",
			"SADDRESSCODE": "",
			"SENDERSYSID": "",
			"SHIPTOADDRESS": "",
			"SOURCESYSID": "",
			"STATEPROVINCE": "",
			"STATUS": "ACTIVE",
			"STATUSDATE": "2004-04-14T11:58:32+08:00",
			"SUPERVISOR": "",
			"TERMINATIONDATE": null,
			"TIMEZONE": "",
			"TITLE": "",
			"TRANSEMAILELECTION": "ALWAYS",
			"USERNOTFTYPE": "",
			"VIP": 0,
			"WFMAILELECTION": "ALWAYS",
			"WOPRIORITY": 0,
			"MAXUSER": [
				{
					"APIKEYADMIN": false,
					"CHANGEBY": "MAXADMIN",
					"CHANGEDATE": "2026-05-30T18:38:39+08:00",
					"COGNOSSYNCSTATUS": "notenabled",
					"CREATEDBY": "",
					"CREATEDDATE": "2026-05-07T04:42:00+08:00",
					"DATABASEUSERID": "",
					"DEFAULTREPFAC": "",
					"DEFAULTREPFACSITEID": "",
					"DEFSITE": "ISUZUSET",
					"DEFSTOREROOM": "",
					"EMAILPSWD": false,
					"EXPIRESAT": null,
					"FAILEDLOGINS": 0,
					"FORCEEXPIRATION": false,
					"IBMID": "",
					"IDPADMIN": false,
					"INACTIVESITES": true,
					"INACTIVITYTIMEOUT": "",
					"IOTROLE": "NO_ACCESS",
					"ISAUTHORIZED": 0,
					"ISCONSULTANT": false,
					"ISLOCKED": false,
					"LICMETRICTYPE": "",
					"LOGINID": "maxadmin",
					"MASERRORCODE": "",
					"MASISSUER": "",
					"MASSYNCSTATUS": 1,
					"MAXUSERID": 1,
					"MEMO": "",
					"OWNER": "local",
					"PASSWORDCHECK": "",
					"PASSWORDINPUT": "",
					"PWEXPIRATION": null,
					"PWHINTANSWER": "QxKJtULQ3/OZkaarxH/TNA==",
					"PWHINTQUESTION": "",
					"QUERYWITHSITE": true,
					"SCREENREADER": false,
					"SIDENAV": 0,
					"STATUS": "ACTIVE",
					"STOREROOMSITE": "",
					"SYNCPROFILE": false,
					"SYSTEMADMIN": false,
					"SYSUSER": true,
					"TRIRIGAACCESS": "NO_ACCESS",
					"TYPE": "TYPE 1",
					"USERID": "MAXADMIN"
				}
			],
			"maximoId": 3,
			"objectName": "PERSON"
		}
	},
	"status": "success"
}
```