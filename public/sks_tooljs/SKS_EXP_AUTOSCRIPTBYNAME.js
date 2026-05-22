/*
 *shoukaiseki this_is_auto_comment_donot_delete:这是导出的自动注释,不要删除,否则下次导出会出现重复注释
 * 脚本(AUTOSCRIPT): SKS_EXP_AUTOSCRIPTBYNAME
 * 脚本语言(SCRIPTLANGUAGE): Nashorn
 * 描述(DESCRIPTION): 导出脚本
 * 日志级别(LOGLEVEL): ERROR
 * 唯一标识(AUTOSCRIPTID): 116            语言代码(LANGCODE): EN
 * 用户定义(USERDEFINED): Y               状态(STATUS): Draft
 * 是接口(INTERFACE): N                  活动(ACTIVE): Y
 * 变更人(CHANGEBY): MAXADMIN
 * 日期(CHANGEDATE): 2026/5/15 10:7:38
 *
 * Variables: 无
 *
 * Launch Points: 无
 */
load('nashorn:mozilla_compat.js');
importClass(Packages.psdi.server.MXServer);

responseBody=main()
function main() {
  try {
    var mxserver = MXServer.getMXServer();
    var msr = mxserver.getMboSet("AUTOSCRIPT", userInfo);
    var asvSet = null;
    var lpSet = null;
    var reqBody = JSON.parse(requestBody);

    // 验证输入
    if (!reqBody.AUTOSCRIPT) {
      return JSON.stringify({ "code": 400, "message": "缺少脚本名称参数" });
    }

    msr.setWhere("AUTOSCRIPT='" + reqBody.AUTOSCRIPT + "'");
    msr.reset();

    var responseBodyStr = "";
    var asvArr = []
    var lpArr = []
    if (!msr.isEmpty()) {
      var tmpMbo = msr.moveFirst();

      //noignoreComment 为true时候增加注释
    if (typeof request === "undefined"||request.getQueryParam("noignoreComment")!== "true") {
      var resultStr = tmpMbo.getString("SOURCE")
      _close(msr)
      return resultStr
    }
      asvSet = tmpMbo.getMboSet("AUTOSCRIPTVARS");
      asvSet.reset();
      var asv = null;
      if (!asvSet.isEmpty()) {
        asv = asvSet.moveFirst();
        while (asv) {
          asvArr.push({
            "VARNAME": asv.getString("VARNAME"),//变量
            "VARTYPE": asv.getString("VARTYPE"),//	变量类型
            "VARBINDINGTYPE": asv.getString("VARBINDINGTYPE"),//绑定类型
            "VARBINDINGVALUE": asv.getString("VARBINDINGVALUE"),//绑定值
            "ALLOWOVERRIDE": asv.getString("ALLOWOVERRIDE"),//覆盖
          })
          asv = asvSet.moveNext();
        }

      }
      service.log("asvArr finish " + asvSet.count())
      lpSet = tmpMbo.getMboSet("SCRIPTLAUNCHPOINT");
      service.log("lpSet 1")
      lpSet.reset();
      service.log("lpSet 2")
      var lp = null;
      service.log("lpSet 3")
      if (!lpSet.isEmpty()) {
        service.log("lpSet 4")
        lp = lpSet.moveFirst();
        var i = 1
        while (lp) {
          var ADDUPDATEDELETE = []
          if (lp.getString("ADD") === "Y") {
            ADDUPDATEDELETE.push("添加")
          }
          if (lp.getString("UPDATE") === "Y") {
            ADDUPDATEDELETE.push("更新")
          }
          if (lp.getString("DELETE") === "Y") {
            ADDUPDATEDELETE.push("删除")
          }
          var EVENTTYPE = ""
          if (lp.getString("EVENTTYPE") === "0") {
            EVENTTYPE = "初始化值"
          }
          if (lp.getString("EVENTTYPE") === "1") {
            EVENTTYPE = "验证应用程序"
          }
          if (lp.getString("EVENTTYPE") === "2") {
            EVENTTYPE = "允许创建对象"
          }
          if (lp.getString("EVENTTYPE") === "3") {
            EVENTTYPE = "允许删除对象"
          }
          if (lp.getString("EVENTTYPE") === "4") {
            EVENTTYPE = "保存"
          }
          var EVCONTEXT = ""
          if (lp.getString("EVCONTEXT") === "0") {
            EVCONTEXT = "保存前"
          }
          if (lp.getString("EVCONTEXT") === "1") {
            EVCONTEXT = "保存后"
          }
          if (lp.getString("EVCONTEXT") === "2") {
            EVCONTEXT = "落实后"
          }
          lpArr.push({
            "LAUNCHPOINTNAME": lp.getString("LAUNCHPOINTNAME"),//启动点
            "DESCRIPTION": lp.getString("DESCRIPTION"),//描述
            "LAUNCHPOINTTYPE": lp.getString("LAUNCHPOINTTYPE"),//启动点类型
            "OBJECTNAME": lp.getString("OBJECTNAME"),//对象
            "ATTRIBUTENAME": lp.getString("ATTRIBUTENAME"),//属性
            "OBJECTEVENT": lp.getString("OBJECTEVENT"),//事件
            "EVENTTYPE": EVENTTYPE,//事件类型 0: 初始化值，1: 验证应用程序，2: 允许创建对象，3: 允许删除对象，4: 保存
            "EVCONTEXT": EVCONTEXT,//事件上下文,0: 保存前，1: 保存后，2: 落实后
            "ADDUPDATEDELETE": ADDUPDATEDELETE.join(","),//添加更新删除
            "CONDITION": lp.getString("CONDITION"),//对象事件条件
            "ACTIVE": lp.getString("ACTIVE"),//活动

          })
          service.log("lpSet 5  ---" + (i++))
          lp = lpSet.moveNext();
          service.log("lpSet 6  lpIsNull:" + (lp == null))
        }
      }
      service.log("lpvArr finish")
      service.log("asvSet lpSet close")
      //asvArr中是脚本的变量配置信息
      //lpArr中是启动点配置信息


      // 获取脚本语言类型
      var scriptLanguage = (tmpMbo.getString("SCRIPTLANGUAGE") || "javascript").toLowerCase();
      var isPython = (scriptLanguage === 'python' || scriptLanguage === 'jython');

      // 构建注释头部 - 只包含有值的字段，短字段合并到一行
      var comments = [];

      // 构建识别标记（使用字符串拼接，避免被自身检测）
      var markerPart1 = "this_is_";
      var markerPart2 = "auto_comment";
      var markerPart3 = "_donot_delete";
      var autoCommentMarker = markerPart1 + markerPart2 + markerPart3;

      service.log("isPython " + isPython)
      if (isPython) {
        // Python 使用三引号文档字符串
        comments.push('"""');
        // 添加自动注释标记
        comments.push('shoukaiseki ' + autoCommentMarker + ':这是导出的自动注释,不要删除,否则下次导出会出现重复注释');
        addField(comments, '脚本(AUTOSCRIPT)', tmpMbo.getString("AUTOSCRIPT"));
        addField(comments, '脚本语言(SCRIPTLANGUAGE)', tmpMbo.getString("SCRIPTLANGUAGE"));
        addField(comments, '描述(DESCRIPTION)', tmpMbo.getString("DESCRIPTION"));
        addField(comments, '日志级别(LOGLEVEL)', tmpMbo.getString("LOGLEVEL"));

        // 合并短字段到一行
        var shortFields1 = buildCompactLine([
          { name: '唯一标识(AUTOSCRIPTID)', value: tmpMbo.getString("AUTOSCRIPTID") },
          { name: '语言代码(LANGCODE)', value: tmpMbo.getString("LANGCODE") }
        ]);
        if (shortFields1) comments.push(shortFields1);

        var shortFields2 = buildCompactLine([
          { name: '用户定义(USERDEFINED)', value: tmpMbo.getString("USERDEFINED") },
          { name: '状态(STATUS)', value: tmpMbo.getString("STATUS") }
        ]);
        if (shortFields2) comments.push(shortFields2);

        var shortFields3 = buildCompactLine([
          { name: '是接口(INTERFACE)', value: tmpMbo.getString("INTERFACE") },
          { name: '活动(ACTIVE)', value: tmpMbo.getString("ACTIVE") }
        ]);
        if (shortFields3) comments.push(shortFields3);

        addField(comments, '变更人(CHANGEBY)', tmpMbo.getString("CHANGEBY"));
        addField(comments, '日期(CHANGEDATE)', tmpMbo.getString("CHANGEDATE"));

        // 添加变量配置信息
        comments.push('');
        if (asvArr.length > 0) {
          comments.push('Variables:');
          for (var i = 0; i < asvArr.length; i++) {
            var v = asvArr[i];
            var varLine = '  - ' + v.VARNAME + ' (' + v.VARTYPE + ')';
            if (v.VARBINDINGTYPE) varLine += ', binding: ' + v.VARBINDINGTYPE;
            if (v.VARBINDINGVALUE) varLine += '=' + v.VARBINDINGVALUE;
            if (v.ALLOWOVERRIDE === 'Y') varLine += ' [override]';
            comments.push(varLine);
          }
        } else {
          comments.push('Variables: 无');
        }

        // 添加启动点配置信息
        comments.push('');
        if (lpArr.length > 0) {
          comments.push('Launch Points:');
          for (var i = 0; i < lpArr.length; i++) {
            var lp = lpArr[i];
            comments.push('  - 启动点(LAUNCHPOINTNAME): ' + lp.LAUNCHPOINTNAME);
            comments.push('    启动点类型(LAUNCHPOINTTYPE): ' + lp.LAUNCHPOINTTYPE);
            if (lp.DESCRIPTION) comments.push('    描述(DESCRIPTION): ' + lp.DESCRIPTION);
            if (lp.OBJECTNAME) comments.push('    对象(OBJECTNAME): ' + lp.OBJECTNAME);
            if (lp.ATTRIBUTENAME) comments.push('    属性(ATTRIBUTENAME): ' + lp.ATTRIBUTENAME);
            if (lp.OBJECTEVENT) comments.push('    事件(OBJECTEVENT): ' + lp.OBJECTEVENT);
            if (lp.EVENTTYPE) comments.push('    事件类型(EVENTTYPE): ' + lp.EVENTTYPE);
            if (lp.EVCONTEXT) comments.push('    事件上下文(EVCONTEXT): ' + lp.EVCONTEXT);
            if (lp.ADDUPDATEDELETE) comments.push('    事件激活(ADDUPDATEDELETE): ' + lp.ADDUPDATEDELETE);
            if (lp.CONDITION) comments.push('    对象事件条件(CONDITION): ' + lp.CONDITION);
            comments.push('    活动(ACTIVE): ' + (lp.ACTIVE === 'Y' ? 'Yes' : 'No'));
          }
        } else {
          comments.push('Launch Points: 无');
        }

        comments.push('"""');
      } else {
        // JavaScript 使用 /* */ 块注释
        comments.push("/*");
        // 添加自动注释标记
        comments.push(' *shoukaiseki ' + autoCommentMarker + ':这是导出的自动注释,不要删除,否则下次导出会出现重复注释');
        addFieldJS(comments, '脚本(AUTOSCRIPT)', tmpMbo.getString("AUTOSCRIPT"));
        addFieldJS(comments, '脚本语言(SCRIPTLANGUAGE)', tmpMbo.getString("SCRIPTLANGUAGE"));
        addFieldJS(comments, '描述(DESCRIPTION)', tmpMbo.getString("DESCRIPTION"));
        addFieldJS(comments, '日志级别(LOGLEVEL)', tmpMbo.getString("LOGLEVEL"));

        // 合并短字段到一行
        var shortFields1 = buildCompactLineJS([
          { name: '唯一标识(AUTOSCRIPTID)', value: tmpMbo.getString("AUTOSCRIPTID") },
          { name: '语言代码(LANGCODE)', value: tmpMbo.getString("LANGCODE") }
        ]);
        if (shortFields1) comments.push(shortFields1);

        var shortFields2 = buildCompactLineJS([
          { name: '用户定义(USERDEFINED)', value: tmpMbo.getString("USERDEFINED") },
          { name: '状态(STATUS)', value: tmpMbo.getString("STATUS") }
        ]);
        if (shortFields2) comments.push(shortFields2);

        var shortFields3 = buildCompactLineJS([
          { name: '是接口(INTERFACE)', value: tmpMbo.getString("INTERFACE") },
          { name: '活动(ACTIVE)', value: tmpMbo.getString("ACTIVE") }
        ]);
        if (shortFields3) comments.push(shortFields3);

        addFieldJS(comments, '变更人(CHANGEBY)', tmpMbo.getString("CHANGEBY"));
        addFieldJS(comments, '日期(CHANGEDATE)', tmpMbo.getString("CHANGEDATE"));

        // 添加变量配置信息
        comments.push(' *');
        if (asvArr.length > 0) {
          comments.push(' * Variables:');
          for (var i = 0; i < asvArr.length; i++) {
            var v = asvArr[i];
            var varLine = ' *   - ' + v.VARNAME + ' (' + v.VARTYPE + ')';
            if (v.VARBINDINGTYPE) varLine += ', binding: ' + v.VARBINDINGTYPE;
            if (v.VARBINDINGVALUE) varLine += '=' + v.VARBINDINGVALUE;
            if (v.ALLOWOVERRIDE === 'Y') varLine += ' [override]';
            comments.push(varLine);
          }
        } else {
          comments.push(' * Variables: 无');
        }

        // 添加启动点配置信息
        comments.push(' *');
        if (lpArr.length > 0) {
          comments.push(' * Launch Points:');
          for (var i = 0; i < lpArr.length; i++) {
            var lp = lpArr[i];
            comments.push(' *   - 启动点(LAUNCHPOINTNAME): ' + lp.LAUNCHPOINTNAME);
            comments.push(' *     启动点类型(LAUNCHPOINTTYPE): ' + lp.LAUNCHPOINTTYPE);
            if (lp.DESCRIPTION) comments.push(' *     描述(DESCRIPTION): ' + lp.DESCRIPTION);
            if (lp.OBJECTNAME) comments.push(' *     对象(OBJECTNAME): ' + lp.OBJECTNAME);
            if (lp.ATTRIBUTENAME) comments.push(' *     属性(ATTRIBUTENAME): ' + lp.ATTRIBUTENAME);
            if (lp.OBJECTEVENT) comments.push(' *     事件(OBJECTEVENT): ' + lp.OBJECTEVENT);
            if (lp.EVENTTYPE) comments.push(' *     事件类型(EVENTTYPE): ' + lp.EVENTTYPE);
            if (lp.EVCONTEXT) comments.push(' *     事件上下文(EVCONTEXT): ' + lp.EVCONTEXT);
            if (lp.ADDUPDATEDELETE) comments.push(' *     事件激活(ADDUPDATEDELETE): ' + lp.ADDUPDATEDELETE);
            if (lp.CONDITION) comments.push(' *     对象事件条件(CONDITION): ' + lp.CONDITION);
            comments.push(' *     活动(ACTIVE): ' + (lp.ACTIVE === 'Y' ? 'Yes' : 'No'));
          }
        } else {
          comments.push(' * Launch Points: 无');
        }

        comments.push(" */");
      }
      comments.push("");

      // 获取源代码
      var sourceCode = tmpMbo.getString("SOURCE") || "";

      // 构建识别标记（使用字符串拼接，避免被自身检测）
      var markerPart1 = "this_is_";
      var markerPart2 = "auto_comment";
      var markerPart3 = "_donot_delete";
      var autoCommentMarker = markerPart1 + markerPart2 + markerPart3;

      // 检查源代码中是否已存在自动注释标记
      var hasAutoComment = sourceCode.indexOf(autoCommentMarker) !== -1;

      var responseBodyStr = "";

      ;
      if (hasAutoComment) {
        // 如果已存在自动注释标记，直接返回原始源代码，不再添加注释
        service.log("检测到自动注释标记，跳过注释生成");
        responseBodyStr = sourceCode;
      } else {
        // 否则，添加注释头部
        responseBodyStr = comments.join("\n") + sourceCode;
      }
    } else {
      responseBodyStr = JSON.stringify({ "code": 404, "message": "未找到脚本: " + reqBody.AUTOSCRIPT });
    }

    _close(asvSet)
    _close(lpSet)
    _close(msr)
    return  responseBodyStr;

  } catch (e) {
    return JSON.stringify({ "code": 500, "message": "导出失败: " + e.message });
  }

}

// 辅助函数：重复字符串（兼容 Nashorn）
function repeatString(str, count) {
  var result = '';
  for (var i = 0; i < count; i++) {
    result += str;
  }
  return result;
}

// 辅助函数：添加非空字段（Python格式）
function addField(comments, fieldName, value) {
  if (value && value.trim() !== '') {
    comments.push(fieldName + ': ' + value);
  }
}

// 辅助函数：添加非空字段（JavaScript格式）
function addFieldJS(comments, fieldName, value) {
  if (value && value.trim() !== '') {
    comments.push(' * ' + fieldName + ': ' + value);
  }
}

// 辅助函数：构建紧凑行（Python格式）- 将多个短字段合并到一行
function buildCompactLine(fields) {
  var validFields = fields.filter(function(f) {
    return f.value && f.value.trim() !== '';
  });

  if (validFields.length === 0) return null;

  if (validFields.length === 1) {
    return validFields[0].name + ': ' + validFields[0].value;
  }

  // 多个字段，使用固定宽度对齐（左边字段占30个字符）
  var firstField = validFields[0].name + ': ' + validFields[0].value;
  var secondField = validFields[1].name + ': ' + validFields[1].value;

  // 计算需要的空格数，使第二个字段从第35列开始
  var padding = Math.max(1, 35 - firstField.length);
  return firstField + repeatString(' ', padding) + secondField;
}

// 辅助函数：构建紧凑行（JavaScript格式）- 将多个短字段合并到一行
function buildCompactLineJS(fields) {
  var validFields = fields.filter(function(f) {
    return f.value && f.value.trim() !== '';
  });

  if (validFields.length === 0) return null;

  if (validFields.length === 1) {
    return ' * ' + validFields[0].name + ': ' + validFields[0].value;
  }

  // 多个字段，使用固定宽度对齐（左边字段占30个字符）
  var firstField = validFields[0].name + ': ' + validFields[0].value;
  var secondField = validFields[1].name + ': ' + validFields[1].value;

  // 计算需要的空格数，使第二个字段从第35列开始（考虑 " * " 前缀）
  var padding = Math.max(1, 35 - firstField.length);
  return ' * ' + firstField + repeatString(' ', padding) + secondField;
}

// Cleans up the MboSet connections and closes the set.
function _close(set) {
    if (set) {
        try {
            set.close();
            set.cleanup();
        } catch (ignored) {}
    }
}
// eslint-disable-next-line no-unused-vars
// var scriptConfig = {
//   autoscript: "SKS_EXP_AUTOSCRIPTBYNAME",
//   description: "导出脚本.",
//   version: "1.0.2",
//   active: true,
//   logLevel: "ERROR"
// };