# 说明
## 方案评测
### 方案一-可使用-建议
MboJSONStructure Compact模式 - 推荐方案
FIELD_26 BLOB类型,应该是字节base64加密的字符串
FIELD_28 CRYPTO类型,应该是加密后字节进行base64处理的字符串

### 方案二-可使用-不建议
MboJSONStructure 非Compact模式(完整格式)

方案一模式扩展,启用了Compact模式(完整格式)

### 方案三-可使用-建议
MboJSONStructure 指定字段模式

方案一模式扩展,增加自定义需要显示的字段名

### 方案四-可使用
OslcMboJsonSerializer方式

遵循OSLC(Open Services for Lifecycle Collaboration)标准

需要有 OslcRequest ,只能在接口中使用
```
var mboSer = new OslcMboJsonSerializer("*", request);
```
### 方案五
手动遍历属性构建JSONObject


## 返回数据
```
{
	"方案3_MboJSONStructure_SpecificFields": {
		"TEST_TYPE": {
			"FIELD_01": "ALN测试文本",
			"FIELD_02": 12345,
			"FIELD_10": "2026-06-27T19:13:13+08:00",
			"FIELD_06": 1234.56,
			"FIELD_14": 99.99
		}
	},
	"方案1_MboJSONStructure_Compact": {
		"TEST_TYPE": {
			"TEST_TYPEID": 33,
			"FIELD_01": "ALN测试文本",
			"FIELD_02": 12345,
			"FIELD_03": "UPPER_TEXT",
			"FIELD_04": 3600,
			"FIELD_05": 7200,
			"FIELD_06": 1234.56,
			"FIELD_07": "ALN描述文本",
			"FIELD_08": "WILDCARD_VAL",
			"FIELD_09": 7890.12,
			"FIELD_10": "2026-06-27T19:13:13+08:00",
			"FIELD_11": "2026-06-27T19:13:13+08:00",
			"FIELD_12": true,
			"FIELD_13": false,
			"FIELD_14": 99.99,
			"FIELD_15": 888,
			"FIELD_16": 9999999999,
			"FIELD_17": "2026-06-27T00:00:00+08:00",
			"FIELD_18": 55.55,
			"FIELD_19": "01-001-001-001",
			"FIELD_22": "2026-06-27T00:00:00+08:00",
			"FIELD_23": 8888888888,
			"FIELD_24": "CLOB大文本内容测试",
			"FIELD_25": "第二个CLOB大文本内容测试",
			"FIELD_26": "QkxPQua1i+ivleS6jOi/m+WItuaVsOaNrg==",
			"FIELD_28": "Y1d9n+IIH3RV7x1Kxhiv/Vy0D84XJyorwfMdQt/T5CA=",
			"FIELD_29": 3.14159,
			"FIELD_30": "1970-01-01T13:30:00+08:00",
			"FIELD_31": 123,
			"FIELD_32": "lowercase_text",
			"HASLD": false
		}
	},
	"方案4_OslcMboJsonSerializer": {
		"test_typeid": 33,
		"field_22": "2026-06-27T00:00:00+08:00",
		"field_01": "ALN测试文本",
		"field_23": 8888888888,
		"field_02": 12345,
		"field_24": "CLOB大文本内容测试",
		"field_03": "UPPER_TEXT",
		"field_25": "第二个CLOB大文本内容测试",
		"field_04": 3600,
		"field_26": "QkxPQua1i+ivleS6jOi/m+WItuaVsOaNrg==",
		"field_05": 7200,
		"field_27": "",
		"field_06": 1234.56,
		"field_28": "Y1d9n+IIH3RV7x1Kxhiv/Vy0D84XJyorwfMdQt/T5CA=",
		"field_07": "ALN描述文本",
		"field_29": 3.14159,
		"field_08": "WILDCARD_VAL",
		"field_09": 7890.12,
		"href": null,
		"field_30": "1970-01-01T13:30:00+08:00",
		"field_31": 123,
		"field_10": "2026-06-27T19:13:13+08:00",
		"field_32": "lowercase_text",
		"field_11": "2026-06-27T19:13:13+08:00",
		"field_12": true,
		"field_13": false,
		"field_14": 99.99,
		"field_15": 888,
		"field_16": 9999999999,
		"field_17": "2026-06-27T00:00:00+08:00",
		"field_18": 55.55,
		"field_19": "01-001-001-001",
		"hasld": false
	},
	"方案5_Manual_Iteration": {
		"FIELD_01": "ALN测试文本",
		"FIELD_23": 8888888888,
		"FIELD_02": 12345,
		"FIELD_24": "CLOB大文本内容测试",
		"FIELD_22": 1782489600000,
		"FIELD_09": 7890.12,
		"FIELD_07": "ALN描述文本",
		"FIELD_29": 3.14159,
		"FIELD_08": "WILDCARD_VAL",
		"FIELD_05": 7200,
		"FIELD_27": "加密扩展测试值",
		"FIELD_06": 1234.56,
		"FIELD_28": "加密测试值",
		"FIELD_03": "UPPER_TEXT",
		"FIELD_25": "第二个CLOB大文本内容测试",
		"FIELD_04": 3600,
		"FIELD_26": "QkxPQua1i+ivleS6jOi/m+WItuaVsOaNrg==",
		"FIELD_12": true,
		"FIELD_13": false,
		"FIELD_10": 1782558793506,
		"FIELD_32": "lowercase_text",
		"FIELD_11": 1782558793507,
		"FIELD_30": 19800000,
		"FIELD_31": 123,
		"FIELD_18": 55.55,
		"FIELD_19": "01-001-001-001",
		"FIELD_16": 9999999999,
		"FIELD_17": 1782489600000,
		"FIELD_14": 99.99,
		"FIELD_15": 888
	},
	"方案6_MboJSONStructure_MboSet": {
		"TEST_TYPEMboSet": {
			"rsStart": 0,
			"rsCount": 0,
			"rsTotal": 0,
			"TEST_TYPE": []
		}
	},
	"方案2_MboJSONStructure_Full": {
		"TEST_TYPE": {
			"Attributes": {
				"TEST_TYPEID": {
					"content": 33,
					"resourceid": true
				},
				"FIELD_01": {
					"content": "ALN测试文本"
				},
				"FIELD_02": {
					"content": 12345
				},
				"FIELD_03": {
					"content": "UPPER_TEXT"
				},
				"FIELD_04": {
					"content": 3600
				},
				"FIELD_05": {
					"content": 7200
				},
				"FIELD_06": {
					"content": 1234.56
				},
				"FIELD_07": {
					"content": "ALN描述文本"
				},
				"FIELD_08": {
					"content": "WILDCARD_VAL"
				},
				"FIELD_09": {
					"content": 7890.12
				},
				"FIELD_10": {
					"content": "2026-06-27T19:13:13+08:00"
				},
				"FIELD_11": {
					"content": "2026-06-27T19:13:13+08:00"
				},
				"FIELD_12": {
					"content": true
				},
				"FIELD_13": {
					"content": false
				},
				"FIELD_14": {
					"content": 99.99
				},
				"FIELD_15": {
					"content": 888
				},
				"FIELD_16": {
					"content": 9999999999
				},
				"FIELD_17": {
					"content": "2026-06-27T00:00:00+08:00"
				},
				"FIELD_18": {
					"content": 55.55
				},
				"FIELD_19": {
					"content": "01-001-001-001"
				},
				"FIELD_22": {
					"content": "2026-06-27T00:00:00+08:00"
				},
				"FIELD_23": {
					"content": 8888888888
				},
				"FIELD_24": {
					"content": "CLOB大文本内容测试"
				},
				"FIELD_25": {
					"content": "第二个CLOB大文本内容测试"
				},
				"FIELD_26": {
					"content": "QkxPQua1i+ivleS6jOi/m+WItuaVsOaNrg=="
				},
				"FIELD_28": {
					"content": "Y1d9n+IIH3RV7x1Kxhiv/Vy0D84XJyorwfMdQt/T5CA="
				},
				"FIELD_29": {
					"content": 3.14159
				},
				"FIELD_30": {
					"content": "1970-01-01T13:30:00+08:00"
				},
				"FIELD_31": {
					"content": 123
				},
				"FIELD_32": {
					"content": "lowercase_text"
				},
				"HASLD": {
					"content": false
				}
			}
		}
	},
	"message": "所有序列化方案执行完成",
	"status": "success"
}
```



## 建表json

```
{
  "maxObjects": [
    {
      "object": "TEST_TYPE",
      "description": "测试字段类型表",
      "attributes": [
        {
          "searchType": "NONE",
          "length": 46,
          "description": "类型01",
          "scale": 0,
          "positive": false,
          "title": "类型01",
          "type": "ALN",
          "required": false,
          "attribute": "FIELD_01"
        },
        {
          "searchType": "EXACT",
          "length": 32,
          "description": "类型02",
          "scale": 0,
          "positive": false,
          "title": "类型02",
          "type": "INTEGER",
          "required": false,
          "attribute": "FIELD_02"
        },
        {
          "searchType": "NONE",
          "length": 64,
          "description": "类型03",
          "scale": 0,
          "positive": false,
          "title": "类型03",
          "type": "UPPER",
          "required": false,
          "attribute": "FIELD_03"
        },
        {
          "searchType": "EXACT",
          "length": 8,
          "description": "类型04",
          "scale": 0,
          "positive": false,
          "title": "类型04",
          "type": "DURATION",
          "required": false,
          "attribute": "FIELD_04"
        },
        {
          "searchType": "EXACT",
          "length": 8,
          "description": "类型05",
          "scale": 0,
          "positive": false,
          "title": "类型05",
          "type": "DURATION",
          "required": false,
          "attribute": "FIELD_05"
        },
        {
          "searchType": "EXACT",
          "length": 10,
          "description": "类型06",
          "scale": 2,
          "positive": false,
          "title": "类型06",
          "type": "AMOUNT",
          "required": false,
          "attribute": "FIELD_06"
        },
        {
          "searchType": "NONE",
          "length": 200,
          "description": "类型07",
          "scale": 0,
          "positive": false,
          "title": "类型07",
          "type": "ALN",
          "required": false,
          "attribute": "FIELD_07"
        },
        {
          "searchType": "WILDCARD",
          "length": 64,
          "description": "类型08",
          "scale": 0,
          "positive": false,
          "title": "类型08",
          "type": "UPPER",
          "required": false,
          "attribute": "FIELD_08"
        },
        {
          "searchType": "EXACT",
          "length": 10,
          "description": "类型09",
          "scale": 2,
          "positive": false,
          "title": "类型09",
          "type": "AMOUNT",
          "required": false,
          "attribute": "FIELD_09"
        },
        {
          "searchType": "EXACT",
          "length": 10,
          "description": "类型10",
          "scale": 0,
          "positive": false,
          "title": "类型10",
          "type": "DATETIME",
          "required": false,
          "attribute": "FIELD_10"
        },
        {
          "searchType": "EXACT",
          "length": 10,
          "description": "类型11",
          "scale": 0,
          "positive": false,
          "title": "类型11",
          "type": "DATETIME",
          "required": false,
          "attribute": "FIELD_11"
        },
        {
          "searchType": "NONE",
          "length": 1,
          "description": "类型12",
          "scale": 0,
          "positive": false,
          "title": "类型12",
          "type": "YORN",
          "required": false,
          "attribute": "FIELD_12"
        },
        {
          "searchType": "NONE",
          "length": 1,
          "description": "类型13",
          "scale": 0,
          "positive": false,
          "title": "类型13",
          "type": "YORN",
          "required": false,
          "attribute": "FIELD_13"
        },
        {
          "searchType": "EXACT",
          "length": 15,
          "description": "类型14",
          "scale": 2,
          "positive": false,
          "title": "类型14",
          "type": "DECIMAL",
          "required": false,
          "attribute": "FIELD_14"
        },
        {
          "searchType": "EXACT",
          "length": 12,
          "description": "类型15",
          "scale": 0,
          "positive": false,
          "title": "类型15",
          "type": "INTEGER",
          "required": false,
          "attribute": "FIELD_15"
        },
        {
          "searchType": "EXACT",
          "length": 19,
          "description": "类型16",
          "scale": 0,
          "positive": false,
          "title": "类型16",
          "type": "BIGINT",
          "required": false,
          "attribute": "FIELD_16"
        },
        {
          "searchType": "EXACT",
          "length": 4,
          "description": "类型17",
          "scale": 0,
          "positive": false,
          "title": "类型17",
          "type": "DATE",
          "required": false,
          "attribute": "FIELD_17"
        },
        {
          "searchType": "EXACT",
          "length": 15,
          "description": "类型18",
          "scale": 2,
          "positive": false,
          "title": "类型18",
          "type": "DECIMAL",
          "required": false,
          "attribute": "FIELD_18"
        },
        {
          "searchType": "WILDCARD",
          "length": 110,
          "description": "类型19",
          "scale": 0,
          "positive": false,
          "title": "类型19",
          "type": "ALN",
          "required": false,
          "attribute": "FIELD_19"
        },
        {
          "searchType": "EXACT",
          "length": 4,
          "description": "类型22",
          "scale": 0,
          "positive": false,
          "title": "类型22",
          "type": "DATE",
          "required": false,
          "attribute": "FIELD_22"
        },
        {
          "searchType": "EXACT",
          "length": 19,
          "description": "类型23",
          "scale": 0,
          "positive": false,
          "title": "类型23",
          "type": "BIGINT",
          "required": false,
          "attribute": "FIELD_23"
        },
        {
          "searchType": "NONE",
          "length": 999999,
          "description": "类型24",
          "scale": 0,
          "positive": false,
          "title": "类型24",
          "type": "CLOB",
          "required": false,
          "attribute": "FIELD_24"
        },
        {
          "searchType": "NONE",
          "length": 999999,
          "description": "类型25",
          "scale": 0,
          "positive": false,
          "title": "类型25",
          "type": "CLOB",
          "required": false,
          "attribute": "FIELD_25"
        },
        {
          "searchType": "NONE",
          "length": 999999,
          "description": "类型26",
          "scale": 0,
          "positive": false,
          "title": "类型26",
          "type": "BLOB",
          "required": false,
          "attribute": "FIELD_26"
        },
        {
          "searchType": "EXACT",
          "length": 128,
          "description": "类型27",
          "scale": 0,
          "positive": false,
          "title": "类型27",
          "type": "CRYPTOX",
          "required": false,
          "attribute": "FIELD_27"
        },
        {
          "searchType": "EXACT",
          "length": 128,
          "description": "类型28",
          "scale": 0,
          "positive": false,
          "title": "类型28",
          "type": "CRYPTO",
          "required": false,
          "attribute": "FIELD_28"
        },
        {
          "searchType": "EXACT",
          "length": 15,
          "description": "类型29",
          "scale": 4,
          "positive": false,
          "title": "类型29",
          "type": "FLOAT",
          "required": false,
          "attribute": "FIELD_29"
        },
        {
          "searchType": "EXACT",
          "length": 4,
          "description": "类型30",
          "scale": 0,
          "positive": false,
          "title": "类型30",
          "type": "TIME",
          "required": false,
          "attribute": "FIELD_30"
        },
        {
          "searchType": "EXACT",
          "length": 6,
          "description": "类型31",
          "scale": 0,
          "positive": false,
          "title": "类型31",
          "type": "SMALLINT",
          "required": false,
          "attribute": "FIELD_31"
        },
        {
          "searchType": "WILDCARD",
          "length": 100,
          "description": "类型32",
          "scale": 0,
          "positive": false,
          "title": "类型32",
          "type": "LOWER",
          "required": false,
          "attribute": "FIELD_32"
        }
      ]
    }
  ]
}
```