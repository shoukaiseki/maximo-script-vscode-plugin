/// <reference path="./AnsiLoggerConfig.d.ts" />
//SKS_LOG_ANSI_UTILS 自动化脚本的方法定义

declare namespace jscustom {
    /**
     * 支持 ANSI 颜色代码的日志记录器类
     */
    class AnsiLogger {
        /** Maximo 日志记录器实例 */
        logger: psdi.util.logging.MXLogger;
        
        /** 是否启用 ANSI 颜色代码 */
        ansiOpen: boolean;
        
        /**
         * 构造函数
         * @param config 配置对象，包含 logger 和 ansiOpen 选项
         */
        constructor(config: jscustom.AnsiLoggerConfig);
        
        /**
         * 设置日志级别
         * @param level 日志级别
         */
        setLevel(level: any): void;
        
        /**
         * 输出调试级别日志
         * @param msg 日志消息
         * @param error 可选的错误对象
         */
        debug(msg: string, error?: any): void;
        
        /**
         * 输出信息级别日志
         * @param msg 日志消息
         * @param error 可选的错误对象
         */
        info(msg: string, error?: any): void;
        
        /**
         * 输出警告级别日志
         * @param msg 日志消息
         * @param error 可选的错误对象
         */
        warn(msg: string, error?: any): void;
        
        /**
         * 输出错误级别日志
         * @param msg 日志消息
         * @param error 可选的错误对象
         */
        error(msg: string, error?: any): void;
        
        /**
         * 检查是否启用了调试级别日志
         * @returns 如果启用了调试级别则返回 true
         */
        isDebugEnabled(): boolean;
        
        /**
         * 检查是否启用了信息级别日志
         * @returns 如果启用了信息级别则返回 true
         */
        isInfoEnabled(): boolean;
        
        /**
         * 检查是否启用了警告级别日志
         * @returns 如果启用了警告级别则返回 true
         */
        isWarnEnabled(): boolean;
        
        /**
         * 检查是否启用了错误级别日志
         * @returns 如果启用了错误级别则返回 true
         */
        isErrorEnabled(): boolean;
        
        /**
         * 检查是否启用了跟踪级别日志
         * @returns 如果启用了跟踪级别则返回 true
         */
        isTraceEnabled(): boolean;

        /**
         * 获取日志记录器实例
         * @returns 日志记录器实例
         */
        getLogger(): psdi.util.logging.MXLogger;
    }
}