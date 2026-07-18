/// <reference path="./AnsiLogger.d.ts" />

declare namespace jscustom {
  /**
   * SKS ANSI 日志工具函数命名空间
   */
  class sksLogAnsiUtils {
    /**
     * 根据 ANSI 代码格式化消息
     * @param msg 要格式化的消息
     * @param ansiCode ANSI 颜色代码（如 "31" 表示红色）
     * @returns 格式化后的消息字符串
     */
    formatMsgByAnsiCode(msg: string, ansiCode: string): string;

    /**
     * 根据日志级别格式化消息
     * @param msg 要格式化的消息
     * @param levelStr 日志级别字符串（ERROR/WARN/INFO/DEBUG）
     * @param  ansiOpen 是否启用 ANSI 格式化，默认为 false
     * @returns 格式化后的消息字符串
     */
    formatMsgByLevel(msg: string, levelStr: string, ansiOpen?: boolean): string;

    /**
     * 创建新的 AnsiLogger 实例
     * @param config 配置对象
     * @returns AnsiLogger 实例
     */
    newAnsiLogger(config: jscustom.AnsiLoggerConfig): jscustom.AnsiLogger;

    /**
     * 抛出错误
     * @param e 错误对象
     */
    throwError(e: any): void;

    /**
     * 非Java错误,或MX错误,抛出,在调用该方法后通常自定义抛出信息
     *         sksLogAnsiUtils.notJavaErrorOrIsMXErrorToThrow(e)
     *         throw new MXApplicationException("#","单元格数值解析异常 row=" + row.getRowNum() + ", col=" + colIndex + ": " + e.toString())
     * @param {*} error
     */
    notJavaErrorOrIsMXErrorToThrow(e: any): void;

/**
 *  获取错误堆栈跟踪
    var sksLogAnsiUtils = service.invokeScript("SKS_LOG_ANSI_UTILS");
    sksLogAnsiUtils.getErrorStackTrace(error)
 * @param {*} error 
 * @returns  错误堆栈跟踪字符串
 */
    getErrorStackTrace(error): string;
  }
}
