import * as vscode from 'vscode';
import * as fs from 'fs';

// 全局 JSESSIONID 缓存
let globalJSESSIONID: string | null = null;
// MAXAUTH 认证方式的专用 JSESSIONID 缓存
let globalMaxAuthJSESSIONID: string | null = null;

/**
 * 限制日志输出长度
 * @param data 要输出的数据
 * @param maxLength 最大长度，默认 200
 * @returns true 表示未超出限制，false 表示已截断
 */
function limitLogOutput(data: any, maxLength: number = 200): { truncated: boolean, data: string } {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  
  if (str.length <= maxLength) {
    return {truncated: false, data: str};
  } else {
    const truncated = str.substring(0, maxLength) + `...(${str.length}个字)`;
    return {truncated: true, data: truncated};
  }
}

/**
 * 初始化 Axios 全局拦截器
 * @param logger VSCode 日志通道，用于记录日志
 */
export function initializeAxiosInterceptors(logger: vscode.LogOutputChannel) {
  try {
    const axios = require('axios');
    
    // 完全禁用 TLS 证书验证（仅用于开发环境）
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    logger.info('[Axios] 已配置忽略 HTTPS 证书验证（仅用于开发环境）');
    
    // 配置请求拦截器
    if (!(axios.interceptors.request as any)._maximoScriptHelperConfigured) {
      axios.interceptors.request.use(
        (config: any) => {
          // 在发送请求之前做些什么
          const logMessage = `[Axios Request] ${config.method?.toUpperCase()} ${config.url}`;
          if(logger.logLevel!==vscode.LogLevel.Debug&&logger.logLevel!==vscode.LogLevel.Trace){
              console.info(logMessage);
              logger.info(logMessage);
          }

          
          // 生成 IntelliJ IDEA HTTP Client 格式的请求
          try {
            // 检查是否启用了 HTTP 请求日志保存
            const vscodeConfig = vscode.workspace.getConfiguration('maximoScript');
            const enableHttpLog = vscodeConfig.get('enableHttpLog', false);
            
          // 添加通用请求头
          config.headers['X-Requested-With'] = 'Maximo-Script-Helper';


            
            const method = config.method?.toUpperCase() || 'GET';
            const url = config.url || config.baseURL || '';
            
            let httpContent = `### ${method} ${url}\n`;
            httpContent += `${method} ${url}\n`;
            
            // 添加 headers（过滤掉一些自动添加的头）
            const skipHeaders = ['user-agent', 'content-length', 'host', 'accept-encoding', 'connection'];
            Object.entries(config.headers || {}).forEach(([key, value]) => {
              const lowerKey = key.toLowerCase();
              if (!skipHeaders.includes(lowerKey)) {
                httpContent += `${key}: ${value}\n`;
              }
            });


          console.log(httpContent);
          logger.debug(httpContent);


            if (!enableHttpLog) {
              // 如果未启用，跳过文件生成
              return config;
            }
            
            // 添加空行和 body
            httpContent += '\n';
            if (config.data) {
              if (typeof config.data === 'string') {
                httpContent += config.data;
              } else {
                httpContent += JSON.stringify(config.data, null, 2);
              }
            }
            
            // 保存到临时文件
            const fs = require('fs');
            const path = require('path');
            const tmpDir = path.join(require('os').tmpdir(), 'maximo-script-helper');
            
            // 确保目录存在
            if (!fs.existsSync(tmpDir)) {
              fs.mkdirSync(tmpDir, { recursive: true });
            }
            
            // 生成文件名（使用时间戳避免冲突）
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `request-${config.method?.toUpperCase()}-${timestamp}.http`;
            const filePath = path.join(tmpDir, fileName);
            
            // 写入文件
            fs.writeFileSync(filePath, httpContent, 'utf-8');
            
            console.log(`[HTTP Client File] 已保存: ${filePath}`);
            logger.info(`[HTTP Client File] 已保存: ${filePath}`);
            
            // 可选：在 VSCode 中打开文件（取消注释以启用）
            // vscode.workspace.openTextDocument(filePath).then(doc => {
            //   vscode.window.showTextDocument(doc);
            // });
          } catch (error: any) {
            console.error('[HTTP Client File] 生成失败:', error.message);
          }
          
          
          return config;
        },
        (error: any) => {
          // 对请求错误做些什么
          const errorMessage = `[Axios Request Error] ${error.message}`;
          console.error(errorMessage);
          logger.error(errorMessage);
          return Promise.reject(error);
        }
      );
      
      // 标记为已配置，避免重复配置
      (axios.interceptors.request as any)._maximoScriptHelperConfigured = true;
      
      const initLog = '[Axios] 全局请求拦截器已配置';
      console.log(initLog);
      logger.info(initLog);
    }
    
    // 配置响应拦截器
    if (!(axios.interceptors.response as any)._maximoScriptHelperConfigured) {
      axios.interceptors.response.use(
        (response: any) => {
          // 对响应数据做点什么
          const logMessage = `[Axios Response] ${response.status} ${response.config.url}`;
          console.log(logMessage);
          logger.info(logMessage);
          const { truncated, data } = limitLogOutput(response.data);
          console.log(data)
          logger.info(data);
          return response;
        },
        (error: any) => {
          // 对响应错误做点什么
          let errorMessage = '[Axios Response Error] ';
          const { truncated, data } = limitLogOutput(error);
          console.log(data)
          logger.info(data);
          
          if (error.response) {
            errorMessage += `${error.response.status}: ${error.response.statusText}`;
            console.error(errorMessage);
            logger.error(errorMessage);
            if (error.response.data && error.response.data.errorMsg) {
              const detailMsg = `  详情: ${error.response.data.errorMsg}`;
              logger.error(detailMsg);
            }
          } else if (error.request) {
            errorMessage += 'No response received';
            console.error(errorMessage);
            logger.error(errorMessage);
          } else {
            errorMessage += error.message;
            console.error(errorMessage);
            logger.error(errorMessage);
          }
          
          return Promise.reject(error);
        }
      );
      
      // 标记为已配置，避免重复配置
      (axios.interceptors.response as any)._maximoScriptHelperConfigured = true;
      
      const initLog = '[Axios] 全局响应拦截器已配置';
      console.log(initLog);
      logger.info(initLog);
    }
  } catch (error: any) {
    const errorMsg = `[Axios Init] 初始化拦截器失败: ${error.message}`;
    console.error(errorMsg);
    logger.error(errorMsg);
  }
}

/**
 * Maximo HTTP 请求工具
 * 提供统一的 API 请求方法，自动处理认证和 URL 拼接
 */

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  data?: any;
  noAuth?: boolean;
  timeout?: number;
  // 可选的配置覆盖（用于测试等场景，避免先保存配置）
  serverUrl?: string;
  authTypeIn?: string;
  maxauth?: string;
  apiKey?: string;
  apiType?: string;
  logger?: vscode.LogOutputChannel;
}

export interface HttpResponse {
  status: number;
  data: any;
  headers: any;
}

/**
 * Maximo HTTP 请求方法（带 JSESSIONID 管理和认证）
 * @param options 请求配置
 * @returns Promise<HttpResponse>
 * 
 * @example
 * ```typescript
 * // 基本用法（自动添加认证）
 * const response = await httpRequestToMaximo({
 *   method: 'GET',
 *   url: 'os/MXAPIPERSON/1'
 * });
 * 
 * // 不带认证的请求
 * const response = await httpRequestToMaximo({
 *   method: 'GET',
 *   url: 'api/common/info',
 *   noAuth: true
 * });
 * 
 * // POST 请求
 * const response = await httpRequestToMaximo({
 *   method: 'POST',
 *   url: 'os/MXAPIPERSON',
 *   data: { personid: 'TEST001', displayname: 'Test User' }
 * });
 * ```
 * 
 */
export async function httpRequestToMaximo(options: HttpRequestOptions): Promise<HttpResponse> {
  const {
    method = 'GET',
    url,
    headers = {},
    data,
    noAuth = false,
    timeout = 10000,
    authTypeIn = '',
    logger,
  } = options;
  try {
    const axios = require('axios');
    const config = vscode.workspace.getConfiguration('maximoScript');
    
    var authType = authTypeIn;
    // 获取服务器配置（优先使用传入的参数，否则从配置中读取）
    const serverUrl =(config.get('serverUrl', '') as string);
    if(!authType){
      authType = (config.get('authType', 'maxauth') as string);
    }
    const maxauth = (config.get('maxauth', '') as string);
    const apiKey = (config.get('apiKey', '') as string);
    const apiType =  (config.get('apiType', 'oslc') as string);
    const langcode = (config.get('langcode', '') as string);  // 语言代码
    
    if (!serverUrl) {
      throw new Error('未配置服务器地址，请先在配置面板中设置');
    }
    
    // 构建完整 URL
    const baseUrl = serverUrl.replace(/\/$/, ''); // 移除末尾斜杠
    
    // 根据 API 类型确定前缀
    let apiUrl: string;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // 如果已经是完整 URL，直接使用
      apiUrl = url;
    } else if (url.startsWith('/')) {
      // 如果以 / 开头，直接拼接到 baseUrl
      apiUrl = `${baseUrl}${url}`;
    } else {
      // 相对路径，根据 API 类型添加前缀
      const prefix = apiType === 'oslc' ? '/oslc/' : '/api/';
      apiUrl = `${baseUrl}${prefix}${url}`;
    }
    
    // 构建请求头
    const requestHeaders: Record<string, string> = {
      ...headers
    };
    
    // 添加 JSESSIONID 到 Cookie（如果存在）
    // 根据认证类型选择不同的 JSESSIONID
    const currentJSESSIONID = authType === 'maxauth' ? globalMaxAuthJSESSIONID : globalJSESSIONID;
    if (currentJSESSIONID) {
      requestHeaders['Cookie'] = `JSESSIONID=${currentJSESSIONID}`;
      console.log(`[HTTP Request] 使用缓存的 JSESSIONID (${authType})`);
    }
    
    // 添加认证信息（除非 noAuth=true）
    if (authTypeIn === 'maxauth'){
        requestHeaders['MAXAUTH'] = maxauth;
    }else if (!noAuth) {
      if (authType === 'apikey') {
        if (!apiKey) {
          throw new Error('未配置 API Key');
        }
        requestHeaders['apiKey'] = apiKey;
      } else {
        // 默认使用 MAXAUTH
        if (!maxauth) {
          throw new Error('未配置 MAXAUTH 认证信息');
        }
        requestHeaders['MAXAUTH'] = maxauth;
      }
    }
    if(!requestHeaders['Accept']){
        requestHeaders['Accept'] = 'application/json';
    }
    if(!requestHeaders['Content-Type']){
      requestHeaders['Content-Type'] = 'application/json';
    }

    // 处理 langcode 参数
    if (langcode && langcode.trim() !== '') {
      // 先设置两个变量 #前=apiUrl #后=''
      let beforeHash = apiUrl;
      let afterHash = '';
      
      // 先顺序查找#字符,如果存在,将#之前的赋值给[#前],将 #和后面的部分赋值给 [#后]
      const hashIndex = apiUrl.indexOf('#');
      if (hashIndex !== -1) {
        beforeHash = apiUrl.substring(0, hashIndex);
        afterHash = apiUrl.substring(hashIndex);  // 包含 # 字符
      }
      
      // 再判断是否存在?,存在就在?后面插入_langcode参数,不存在就加上?和_langcode参数信息
      const queryIndex = beforeHash.indexOf('?');
      if (queryIndex !== -1) {
        // 已存在查询参数，在 ? 后面插入 _langcode
        beforeHash = beforeHash.substring(0, queryIndex + 1) + '_langcode=' + langcode + '&' + beforeHash.substring(queryIndex + 1);
      } else {
        // 不存在查询参数，加上 ? 和 _langcode 参数
        beforeHash = beforeHash + '?_langcode=' + langcode;
      }
      
      // 重新组合 URL
      apiUrl = beforeHash + afterHash;
    }
    
    // console.log(`[HTTP Request] ${method} ${apiUrl}`);
    console.log(`[HTTP Request] Auth Type: ${noAuth ? 'No Auth' : authType}`);
    console.log(`[HTTP Request] URL: ${apiUrl}`);
    console.log(`[HTTP Request] Method: ${method}`);
    console.log(`[HTTP Request] Timeout: ${timeout}`);
    console.log(`[HTTP Request] Headers:`, JSON.stringify(requestHeaders, null, 2));
    
    // 发送请求
    console.log('[HTTP Request] 开始发送请求...');
    const startTime = Date.now();
    const response = await axios({
      method: method.toLowerCase(),
      url: apiUrl,
      headers: requestHeaders,
      data: data,
      timeout: timeout
    });
    const endTime = Date.now();
    console.log(`[HTTP Response] 状态码: ${response.status}, 耗时: ${endTime - startTime}ms`);
    console.log(`[HTTP Response] 响应头:`, JSON.stringify(response.headers, null, 2));
    
    // 检查响应中是否包含 JSESSIONID，如果有则缓存
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      const jsessionMatch = Array.isArray(setCookie) 
        ? setCookie.join('; ').match(/JSESSIONID=([^;]+)/)
        : setCookie.match(/JSESSIONID=([^;]+)/);
      
      if (jsessionMatch && jsessionMatch[1]) {
        if(authType === 'maxauth'){
        globalMaxAuthJSESSIONID = jsessionMatch[1];
        console.log(`[HTTP Response] 缓存 JSESSIONID: ${globalMaxAuthJSESSIONID}`);
        }else{
        globalJSESSIONID = jsessionMatch[1];
        console.log(`[HTTP Response] 缓存 JSESSIONID: ${globalJSESSIONID}`);
        }
      }
    }
    if(!(response.status>=200 && response.status<300)){
      if(logger!=null)logger.error('[HTTP Response Error] 非 2xx 状态码:', response);
      console.error('[HTTP Response Error] 非 2xx 状态码:', response);
    }
    
    return {
      status: response.status,
      data: response.data,
      headers: response.headers
    };
    
  } catch (error: any) {
    let errorMessage = '请求失败';
    
    console.error('[HTTP Request Error] 错误对象:', error);
    console.error('[HTTP Request Error] 错误消息:', error.message);
    console.error('[HTTP Request Error] 错误代码:', error.code);
    
    if (error.response) {
      // 服务器返回错误状态码
      errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
      if (error.response.data && error.response.data.errorMsg) {
        errorMessage += ` - ${error.response.data.errorMsg}`;
      }
      console.error('[HTTP Request Error] 响应数据:', error.response.data);
      if(error.response.data){
        if(error.response.data['Error']&&error.response.data['Error']['message']){
          throw new Error(error.response.data['Error']['message']);
        }
        if(error.response.data['oslc:Error']&&error.response.data['oslc:Error']['oslc:message']){
          throw new Error(error.response.data['oslc:Error']['oslc:message']);
        }
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      errorMessage = '无法连接到服务器，请检查网络和服务器地址';
      console.error('[HTTP Request Error] 请求对象存在但无响应');
      console.error('[HTTP Request Error] 请求配置:', error.request);
    } else {
      // 其他错误
      errorMessage = error.message || '未知错误';
      console.error('[HTTP Request Error] 错误设置阶段:', error.message);
    }
    
    console.error('[HTTP Request Error]', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * 清除全局 JSESSIONID Cookie
 */
export function clearJSESSIONID(): void {
  globalJSESSIONID = null;
  globalMaxAuthJSESSIONID = null;
  console.log('[HTTP Request] 已清除所有 JSESSIONID Cookie (包括 MAXAUTH 专用)');
}


/**
 * 检查响应是否包含错误
 * @param deployResult 响应结果
 * @returns 是否包含错误
 */
export function checkResponseHasError(deployResult: any,logger: vscode.LogOutputChannel|null,logName=''): { hasError: boolean, errorMsg: string, successMsg: string } {
  var hasError = false;
  var errorMsg = '';
  if(logger!=null){
    logger.debug(`[${logName}] 检查响应是否包含错误\n`, JSON.stringify(deployResult, null, 2));
  }
  if (deployResult.data && deployResult.data.status && deployResult.data.status === 'error') {
    if (logger != null) {
      logger.warn(`[${logName}] ❌ 包含错误\n`, JSON.stringify(deployResult.data, null, 2));
    }
    hasError = true;
    errorMsg = `${deployResult.data.status} ${JSON.stringify(deployResult.data.message|| deployResult.data.errorMsg)}`
    return { hasError: true, errorMsg: errorMsg, successMsg: '' };
  }
  if (deployResult.status === 200 || deployResult.status === 201 || deployResult.status === 204) {
    if (logger != null) {
      logger.info(`[${logName}] ✅ 成功\n`, JSON.stringify(deployResult.data, null, 2));
    }
    return { hasError: false, errorMsg: '', successMsg: '' }
  } else {
    if (logger != null) {
      logger.warn(`[${logName}] ❌ 包含错误\n`, JSON.stringify(deployResult.data, null, 2));
    }
    const errorMsg = ` ${deployResult.status} ${JSON.stringify(deployResult.data)}`;
    return { hasError: true, errorMsg: errorMsg, successMsg: '' };
  }


  return { hasError: hasError, errorMsg: errorMsg, successMsg: '' }
}

/**
 * 调用 Maximo 反射接口获取类的详细信息
 * @param className 完整的类名（如：com.ibm.tivoli.maximo.script.ScriptService）
 * @param logger VSCode 日志通道
 * @returns 反射数据对象
 */
export async function fetchClassReflection(
  className: string,
  logger: vscode.LogOutputChannel
): Promise<any> {
  try {
    logger.info(`[maximoReflection] 开始获取类反射信息: ${className}`);
    
    const result = await httpRequestToMaximo({
      url: 'script/SKS_REFLECT_HELPER_ENHANCED',  // 使用增强版脚本
      method: 'POST',
      data: { className },
      logger
    });
    
    if (result.data) {
      logger.info(`[maximoReflection] ✅ 成功获取类反射信息: ${className}`);
      return result.data;
    } else {
      logger.warn(`[maximoReflection] ⚠️ 反射接口返回空数据: ${className}`);
      return { status: 'error', message: '反射接口返回空数据' };
    }
  } catch (error: any) {
    logger.error(`[maximoReflection] ❌ 获取类反射信息失败: ${className} - ${error.message}`);
    throw error;
  }
}

/**
 * 通过本地 Java 反射获取类的详细信息
 * @param className 完整的类名
 * @param logger VSCode 日志通道
 * @returns 反射数据对象
 */
export async function fetchClassReflectionLocal(
  className: string,
  logger: vscode.LogOutputChannel
): Promise<any> {
  try {
    logger.info(`[localReflection] 开始通过本地反射获取类信息: ${className}`);
    
    const { exec } = require('child_process');
    const path = require('path');
    const os = require('os');
    
    // 获取配置
    const config = vscode.workspace.getConfiguration('maximoScript');
    const jdkPath = config.get('jdkPath', '') as string;
    const jarDirectories = config.get('jarDirectories', []) as string[];
    const additionalJars = config.get('additionalJars', []) as string[];
    
    if (!jdkPath) {
      throw new Error('未配置 JDK 路径，请在配置面板中设置');
    }
    
    // LocalReflectHelper.class 的路径
    const helperDir = __dirname;  // .class 文件所在目录
    
    // 构建 Java 命令
    const javaCmd = path.join(jdkPath, 'bin', 'java');
    
    // 构建 classpath：包含 LocalReflectHelper.class 所在目录、JAR 目录中的所有 .jar 文件和单个 JAR 文件
    const classpathParts: string[] = [helperDir];
    
    // 添加 JAR 目录中的所有 .jar 文件
    if (jarDirectories && jarDirectories.length > 0) {
      for (const dir of jarDirectories) {
        try {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              if (file.endsWith('.jar')) {
                classpathParts.push(path.join(dir, file));
              }
            }
          }
        } catch (e: any) {
          logger.warn(`[localReflection] ⚠️ 读取目录失败: ${dir} - ${e.message}`);
        }
      }
    }
    
    // 添加单个 JAR 文件
    if (additionalJars && additionalJars.length > 0) {
      for (const jar of additionalJars) {
        if (fs.existsSync(jar)) {
          classpathParts.push(jar);
        } else {
          logger.warn(`[localReflection] ⚠️ JAR 文件不存在: ${jar}`);
        }
      }
    }
    
    const fullClasspath = classpathParts.join(path.delimiter);
    
    logger.info(`[localReflection] Classpath 包含 ${classpathParts.length} 个部分`);
    logger.info(`[localReflection]   - LocalReflectHelper.class 目录: ${helperDir}`);
    if (jarDirectories && jarDirectories.length > 0) {
      logger.info(`[localReflection]   - JAR 目录数: ${jarDirectories.length}`);
    }
    if (additionalJars && additionalJars.length > 0) {
      logger.info(`[localReflection]   - 单个 JAR 文件数: ${additionalJars.length}`);
    }
    logger.info(`[localReflection] 💡 提示：如果执行超时，请检查是否配置了过多不必要的 JAR 包`);
    
    const cmd = `"${javaCmd}" -cp "${fullClasspath}" LocalReflectHelper "${className}"`;
    
    logger.info(`[localReflection] 执行命令: ${cmd}`);
    
    return new Promise((resolve, reject) => {
      // 增加超时时间到 60 秒，因为加载大量 JAR 包可能需要更多时间
      exec(cmd, { timeout: 60000, maxBuffer: 10 * 1024 * 1024 }, (error: any, stdout: string, stderr: string) => {
        if (error) {
          logger.error(`[localReflection] ❌ 执行 Java 命令失败: ${error.message}`);
          if (error.killed) {
            logger.error(`[localReflection] ⏱️ 命令执行超时（60秒），请检查 classpath 是否包含过多 JAR 文件`);
            reject(new Error(`本地反射执行超时（60秒），建议减少 JAR 包数量或优化 classpath`));
          } else {
            reject(new Error(`本地反射执行失败: ${error.message}`));
          }
          return;
        }
        
        if (stderr) {
          logger.warn(`[localReflection] ⚠️ Java 命令警告: ${stderr}`);
        }
        
        try {
          // 解析 JSON 输出
          const jsonData = JSON.parse(stdout);
          
          // 检查是否有 error 字段（LocalReflectHelper 的错误格式）
          if (jsonData.error) {
            logger.error(`[localReflection] ❌ 反射失败: ${jsonData.error}`);
            resolve({ status: 'error', message: jsonData.error });
          } else {
            // 成功，直接返回数据
            logger.info(`[localReflection] ✅ 成功获取类反射信息: ${className}`);
            resolve(jsonData);
          }
        } catch (parseError: any) {
          logger.error(`[localReflection] ❌ JSON 解析失败: ${parseError.message}`);
          logger.error(`[localReflection] 原始输出: ${stdout}`);
          reject(new Error(`JSON 解析失败: ${parseError.message}`));
        }
      });
    });
  } catch (error: any) {
    logger.error(`[localReflection] ❌ 获取类反射信息失败: ${className} - ${error.message}`);
    throw error;
  }
}