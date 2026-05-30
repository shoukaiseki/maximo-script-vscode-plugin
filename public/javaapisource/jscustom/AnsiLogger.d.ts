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
    }
}
