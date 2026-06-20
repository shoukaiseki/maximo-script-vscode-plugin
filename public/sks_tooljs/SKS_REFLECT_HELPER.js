/* eslint-disable no-redeclare */
/* eslint-disable indent */
/* eslint-disable quotes */
/* eslint-disable no-undef */
// @ts-nocheck
/// <reference path="@javaapi/global.d.ts" />

/** @type {psdi.server.MXServer} */
MXServer = Java.type("psdi.server.MXServer");
/** @type {psdi.util.logging.MXLoggerFactory} */
MXLoggerFactory = Java.type("psdi.util.logging.MXLoggerFactory");
/** @type {java.lang.reflect.Method} */
var Method = Java.type("java.lang.reflect.Method");
/** @type {java.lang.reflect.Modifier} */
var Modifier = Java.type("java.lang.reflect.Modifier");
/** @type {java.util.ArrayList} */
var ArrayList = Java.type("java.util.ArrayList");
/** @type {java.lang.StringBuilder} */
var StringBuilder = Java.type("java.lang.StringBuilder");
/** @type {java.lang.Class} */
var Class = Java.type("java.lang.Class");

/** @type {psdi.util.logging.MaximoLogger} */
var logger = MXLoggerFactory.getLogger("maximo.script." + service.getScriptName());

main();

function main() {
    try {
        // 验证请求体
        if (typeof requestBody === "undefined" || !requestBody) {
            /** @type {psdi.util.MXApplicationException} */
            var MXApplicationException = Java.type("psdi.util.MXApplicationException");
            throw new MXApplicationException("error", "请求体不能为空");
        }
        
        // 解析请求数据
        /** @type {Object} */
        var requestData = JSON.parse(requestBody);
        
        /** @type {string} */
        var className = requestData.className;
        
        if (!className) {
            /** @type {psdi.util.MXApplicationException} */
            var MXApplicationException = Java.type("psdi.util.MXApplicationException");
            throw new MXApplicationException("error", "className 参数不能为空");
        }
        
        logger.info("开始反射分析类: " + className);
        
        // 获取类的方法信息
        /** @type {Object} */
        var result = getReflectInfo(className);
        
        // 返回成功响应
        responseBody = JSON.stringify(result, null, 4);
        
    } catch (error) {
        logger.warn("反射分析失败: " + error.message);
        
        /** @type {Object} */
        var errorData = {
            status: "error",
            message: error.message
        };
        responseBody = JSON.stringify(errorData, null, 4);
    }
}

/**
 * 获取类的反射信息
 * @param {string} className - 完整的类名
 * @returns {Object} 包含类名和方法列表的对象
 */
function getReflectInfo(className) {
    /** @type {java.lang.Class} */
    var clazz = null;
    
    try {
        // 首先尝试使用 Class.forName 加载类（可以加载未初始化的类）
        clazz = Class.forName(className);
        logger.info("成功加载类: " + className);
        
    } catch (classError) {
        logger.warn("无法加载类 " + className + ": " + classError.message);
        /** @type {psdi.util.MXApplicationException} */
        var MXApplicationException = Java.type("psdi.util.MXApplicationException");
        throw new MXApplicationException("error", "无法加载类: " + className + " - " + classError.message);
    }
    
    try {
        // 获取所有公共方法（包括继承的方法）
        /** @type {Array} */
        var methods = clazz.getMethods();
        
        /** @type {Array} */
        var methodList = [];
        
        for (var i = 0; i < methods.length; i++) {
            /** @type {java.lang.reflect.Method} */
            var method = methods[i];
            
            // 只处理公共方法
            if (!Modifier.isPublic(method.getModifiers())) {
                continue;
            }
            
            /** @type {string} */
            var methodName = method.getName();
            /** @type {string} */
            var returnType = method.getReturnType().getName();
            
            // 获取参数类型
            /** @type {Array} */
            var paramTypes = method.getParameterTypes();
            /** @type {Array} */
            var parameters = [];
            
            for (var j = 0; j < paramTypes.length; j++) {
                parameters.push(paramTypes[j].getName());
            }
            
            /** @type {Object} */
            var methodInfo = {
                name: methodName,
                returnType: returnType,
                parameters: parameters,
                description: ""
            };
            
            methodList.push(methodInfo);
        }
        
        logger.info("成功获取类 " + className + " 的 " + methodList.length + " 个公共方法");
        
        return {
            className: className,
            methods: methodList
        };
        
    } catch (error) {
        logger.warn("获取类信息失败: " + error.message);
        
        /** @type {psdi.util.MXApplicationException} */
        var MXApplicationException = Java.type("psdi.util.MXApplicationException");
        throw new MXApplicationException("error", "获取类信息失败: " + error.message);
    }
}