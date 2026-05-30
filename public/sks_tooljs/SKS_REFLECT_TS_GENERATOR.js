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
        if (typeof requestBody === "undefined" || !requestBody) {
            /** @type {psdi.util.MXApplicationException} */
            var MXApplicationException = Java.type("psdi.util.MXApplicationException");
            throw new MXApplicationException("error", "请求体不能为空");
        }
        
        /** @type {Object} */
        var requestData = JSON.parse(requestBody);
        
        /** @type {string} */
        var className = requestData.className;
        
        if (!className) {
            /** @type {psdi.util.MXApplicationException} */
            var MXApplicationException = Java.type("psdi.util.MXApplicationException");
            throw new MXApplicationException("error", "className 参数不能为空");
        }
        
        logger.info("开始反射分析类并生成TypeScript: " + className);
        
        /** @type {string} */
        var tsContent = generateTypeScript(className);
        
        responseBody = tsContent;
        
    } catch (error) {
        logger.error("反射分析失败: " + error.message);
        
        /** @type {Object} */
        var errorData = {
            status: "error",
            message: error.message
        };
        responseBody = JSON.stringify(errorData, null, 4);
    }
}

function javaTypeToTSType(typeName) {
    if (!typeName) return 'any';
    
    if (typeName === 'int' || typeName === 'long' || typeName === 'short' || typeName === 'byte' || 
        typeName === 'float' || typeName === 'double') {
        return 'number';
    }
    if (typeName === 'boolean') {
        return 'boolean';
    }
    if (typeName === 'void') {
        return 'void';
    }
    if (typeName === 'char' || typeName === 'java.lang.String') {
        return 'string';
    }
    
    if (typeName.startsWith('[L') && typeName.endsWith(';')) {
        var innerType = typeName.substring(2, typeName.length - 1);
        return javaTypeToTSType(innerType) + '[]';
    }
    if (typeName === '[B') return 'number[]';
    if (typeName === '[C') return 'string[]';
    if (typeName === '[I') return 'number[]';
    if (typeName.startsWith('[')) return 'any[]';
    
    var parts = typeName.split('.');
    return parts[parts.length - 1];
}

function generateTypeScript(className) {
    /** @type {java.lang.Class} */
    var clazz = null;
    
    try {
        clazz = Class.forName(className);
        logger.info("成功加载类: " + className);
    } catch (classError) {
        logger.error("无法加载类 " + className + ": " + classError.message);
        /** @type {psdi.util.MXApplicationException} */
        var MXApplicationException = Java.type("psdi.util.MXApplicationException");
        throw new MXApplicationException("error", "无法加载类: " + className + " - " + classError.message);
    }
    
    try {
        /** @type {Array} */
        var methods = clazz.getMethods();
        
        /** @type {Array} */
        var methodSignatures = [];
        var seenMethods = new java.util.HashSet();
        
        for (var i = 0; i < methods.length; i++) {
            /** @type {java.lang.reflect.Method} */
            var method = methods[i];
            
            if (!Modifier.isPublic(method.getModifiers())) {
                continue;
            }
            
            /** @type {string} */
            var methodName = method.getName();
            /** @type {string} */
            var returnType = method.getReturnType().getName();
            
            /** @type {Array} */
            var parameters = method.getParameters();
            /** @type {Array} */
            var params = [];
            var paramKeyParts = [];
            
            for (var j = 0; j < parameters.length; j++) {
                /** @type {java.lang.reflect.Parameter} */
                var param = parameters[j];
                var paramTypeName = param.getType().getName();
                var paramName = param.getName();
                var tsParamType = javaTypeToTSType(paramTypeName);
                
                if (!param.isNamePresent()) {
                    paramName = "arg" + j;
                }
                
                params.push(paramName + ": " + tsParamType);
                paramKeyParts.push(paramTypeName);
            }
            
            var methodKey = methodName + "(" + paramKeyParts.join(",") + ")";
            if (!seenMethods.contains(methodKey)) {
                seenMethods.add(methodKey);
                var tsReturnType = javaTypeToTSType(returnType);
                methodSignatures.push("    " + methodName + "(" + params.join(", ") + "): " + tsReturnType + ";");
            }
        }
        
        var parts = className.split("\\.");
        var interfaceName = parts[parts.length - 1];
        parts.pop();
        var namespace = parts.join(".");
        
        var sb = new StringBuilder();
        sb.append("// Auto-generated for " + className + "\n");
        sb.append("declare namespace " + namespace + " {\n");
        sb.append("    interface " + interfaceName + " {\n");
        sb.append(methodSignatures.join("\n"));
        sb.append("\n    }\n");
        sb.append("}\n");
        
        logger.info("成功生成类 " + className + " 的 TypeScript 定义，共 " + methodSignatures.length + " 个方法");
        
        return sb.toString();
        
    } catch (error) {
        logger.error("生成TypeScript失败: " + error.message);
        
        /** @type {psdi.util.MXApplicationException} */
        var MXApplicationException = Java.type("psdi.util.MXApplicationException");
        throw new MXApplicationException("error", "生成TypeScript失败: " + error.message);
    }
}
