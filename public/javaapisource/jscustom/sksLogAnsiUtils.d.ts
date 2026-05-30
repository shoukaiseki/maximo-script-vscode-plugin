/// <reference path="./AnsiLogger.d.ts" />

declare namespace jscustom {
    /**
     * SKS ANSI 日志工具函数命名空间
     */
    namespace sksLogAnsiUtils {
        /**
         * 根据 ANSI 代码格式化消息
         * @param msg 要格式化的消息
         * @param ansiCode ANSI 颜色代码（如 "31" 表示红色）
         * @returns 格式化后的消息字符串
         */
        function formatMsgByAnsiCode(msg: string, ansiCode: string): string;
        
        /**
         * 根据日志级别格式化消息
         * @param msg 要格式化的消息
         * @param levelStr 日志级别字符串（ERROR/WARN/INFO/DEBUG）
         * @param ansiOpen 是否启用 ANSI 格式化，默认为 false
         * @returns 格式化后的消息字符串
         */
        function formatMsgByLevel(msg: string, levelStr: string, ansiOpen?: boolean): string;
        
        /**
         * 创建新的 AnsiLogger 实例
         * @param config 配置对象
         * @returns AnsiLogger 实例
         */
        function newAnsiLogger(config: jscustom.AnsiLoggerConfig): jscustom.AnsiLogger;
    }
}
