declare namespace jscustom {
    /**
     * AnsiLogger 配置接口
     */
    interface AnsiLoggerConfig {
        /** Maximo 日志记录器实例 */
        logger: psdi.util.logging.MXLogger;
        /** 是否启用 ANSI 颜色代码，默认为 false */
        ansiOpen?: boolean;
        /** 是否开启打印模式，在 mxlogger 无效的时候启用，默认为 false */
        printModel?: boolean;
    }
}
