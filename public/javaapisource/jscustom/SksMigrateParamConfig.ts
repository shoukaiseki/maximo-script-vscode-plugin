/// <reference path="./AnsiLoggerConfig.d.ts" />
//SKS_LOG_ANSI_UTILS 自动化脚本的方法定义

declare namespace jscustom {
    /**
     * 迁移脚本参数中的主参数
     */
    class SksMigrateParamConfig {

      //ScriptService对象,用于调用其它脚本和userInfo
      service: com.ibm.tivoli.maximo.script.ScriptService;

      //根据指定语言代码更改后langcode的userInfo
      _userInfo: psdi.security.UserInfo;

      //前端指定的语言代码
      _langcode: java.lang.String;

      //接口操作类型: imp/add/export
      _apiAction: java.lang.String;

      //接口模式: none作为通用,导入情况下: migrate/none
      _apiMode: java.lang.String;

      //备用
      _apiType: java.lang.String;
    
      //延迟关闭的MboSet数组,默认会传入一个空数组进去,方法调用完之后统一添加到全局缓存
      _deferredCloseSets: Array<psdi.mbo.MboSet>;

      //true: 返回信息中包含所有多语言信息,如果为true,则会在获取行detail中返回 sks:langdataList[{"langcode":"EN","description":"..."}]  字段,
      //如果可以同时更新多语言信息
      _allLangcode: boolean

      //该参数包含所有支持的语言代码,都是大写,例如: ["EN","ZH","JA"] 
      _langcodeList:Array<java.lang.String> 
    }
}