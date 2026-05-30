// javaapi/global.d.ts

/**
 * Maximo HTTP 启动点隐式变量声明
 */

/** HTTP 请求对象 */
declare var request: com.ibm.tivoli.maximo.oslc.provider.OslcRequest;

/** HTTP 请求体字符串 */
declare var requestBody: string;

/** HTTP 响应体字符串（用于设置返回值） */
declare var responseBody: string;

/** HTTP 方法 (GET, POST, PUT, DELETE) */
declare var httpMethod: string;

/**
 * Maximo OBJECT 启动点隐式变量声明
 */

/** 当前 MBO 对象 */
declare var mbo: psdi.mbo.MboRemote;

/** 是否在添加操作中 */
declare var onadd: boolean;

/** 是否在更新操作中 */
declare var onupdate: boolean;

/** 是否在删除操作中 */
declare var ondelete: boolean;

/** 用户信息 */
declare var userInfo: psdi.security.UserInfo;

/** 服务对象 */
declare var service: com.ibm.tivoli.maximo.script.ScriptService;

/**
 * Maximo ATTRIBUTE 启动点隐式变量声明
 */

/** 属性的新值 */
declare var value: any;

/** 属性的旧值 */
declare var oldValue: any;

/**
 * Java 常用类型声明
 */
declare namespace java {
    namespace lang {
        class String {
            constructor(value: string);
            toString(): string;
        }
        
        class Integer {
            constructor(value: number);
            intValue(): number;
        }
        
        class Boolean {
            constructor(value: boolean);
            booleanValue(): boolean;
        }
        
        class Class<T> {
            getName(): string;
            getSimpleName(): string;
            getPackage(): Package;
        }
        
        interface Package {
            getName(): string;
        }
    }
}

/**
 * Maximo 核心类型声明
 */
declare namespace psdi {
    namespace mbo {
        interface MboRemote {
            getString(attribute: string): string;
            getInt(attribute: string): number;
            setValue(attribute: string, value: any): void;
            setValue(attribute: string, value: any, accessModifier: number): void;
            delete(): void;
            getThisMboSet(): MboSetRemote;
            getOwner(): MboRemote;
            getMboValueData(attribute: string): MboValueData;
        }
        
        interface MboSetRemote {
            add(): MboRemote;
            getMbo(index: number): MboRemote;
            moveFirst(): MboRemote;
            moveNext(): MboRemote;
            isEmpty(): boolean;
            count(): number;
            setWhere(whereClause: string): void;
            reset(): void;
            save(): void;
            cleanup(): void;
            close(): void;
        }
        
        interface MboValueData {
            isReadOnly(): boolean;
        }
        
        class SqlFormat {
            constructor(sql: string);
            setObject(position: number, objectName: string, attributeName: string, value: any): void;
            format(): string;
        }
    }
    
    namespace server {
        class MXServer {
            static getMXServer(): MXServer;
            getMboSet(objectName: string, userInfo: psdi.security.UserInfo): psdi.mbo.MboSetRemote;
            getSystemUserInfo(): psdi.security.UserInfo;
        }
    }
    
    namespace security {
        interface UserInfo {
            getUserName(): string;
            getInsertSite(): string;
            getInsertOrg(): string;
        }
    }
    
    namespace util {
        namespace logging {
            class MXLoggerFactory {
                static getLogger(name: string): MaximoLogger;
            }
            
            interface MaximoLogger {
                debug(message: string): void;
                info(message: string): void;
                warn(message: string): void;
                error(message: string): void;
            }
        }
        
        class MXApplicationException extends Error {
            constructor(errorGroup: string, errorKey: string);
        }
    }
}

/**
 * Nashorn Java 互操作
 */
interface Java {
    type(className: string): any;
}

declare var Java: Java;