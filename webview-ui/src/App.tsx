import React, { useState, useEffect } from 'react';
import './App.css';
import LogManager from './components/LogManager';

declare global {
  interface Window {
    acquireVsCodeApi: () => any;
  }
}

interface ConfigData {
  serverUrl: string;
  authType: string;
  maxauth: string;
  apiKey: string;
  apiType: string;
  version: string;
  completionMode: string;
  localApiPath: string;
  enableJSDocParsing: boolean;
  enableTypeInference: boolean;
  autoGenerateReflectionApi: boolean;  // 自动生成反射API
  autoGenerateReflectionApiLocal: boolean;  // 自动通过本地jar生成反射API（降级方案）
  enableHttpLog: boolean;
  jdkPath: string;
  jarDirectories: string[];
  additionalJars: string[];
  scriptStoragePath: string;
  aliasName: string;
  exportDirectory: string;
  exportXmlDirectory: string;
  envnum: string;
  envList: string[];
  langcode: string;  // 语言代码
  pushXmlAlwaysUseMaxauth: boolean;  // 推送 XML 时始终使用 MAXAUTH 认证方式
  debugPort?: number;  // 脚本调试端口（脚本调试使用, 默认 9229）
  debugHostname?: string;  // 脚本调试主机名（可选），留空按服务器地址解析
  autoCreateExportDir: boolean;  // 导出脚本时自动生成带时间戳的目录
  maxobjectSimpleMode: boolean;  // MAXOBJECT 导出精简模式（忽略默认值）
  exportMaxobjectDirectory: string;
  extractThreadCount: number;  // 导出脚本线程数
  extractXmlThreadCount: number;  // 导出应用XML线程数
  extractMaxobjectThreadCount: number;  // 导出MAXOBJECT线程数
  extractZipEnabled: boolean;  // 导出脚本完成后打包ZIP
  extractXmlZipEnabled: boolean;  // 导出应用XML完成后打包ZIP
  extractMaxobjectZipEnabled: boolean;  // 导出MAXOBJECT完成后打包ZIP
  exportMessageDirectory: string;  // 消息导出目录
  exportMessageThreadCount: number;  // 消息导出线程数
  exportMessageZipEnabled: boolean;  // 消息导出打包ZIP
  exportMessagePageSize: number;  // 消息导出单文件行数
  exportMessageIgnoreDefVal: boolean;  // 消息导出忽略默认值
  exportDomainDirectory: string;  // 域导出目录
  exportConditionDirectory: string;  // 条件表达式导出目录
  exportConditionWhere: string;  // 条件表达式导出 where 过滤条件
  exportDomainThreadCount: number;  // 域导出线程数
  exportDomainZipEnabled: boolean;  // 域导出打包ZIP
  exportDomainPageSize: number;  // 域导出单文件行数
  exportDomainIgnoreDefVal: boolean;  // 域导出忽略默认值
  scheduledExportBaseDir: string;  // 计划导出基础目录
}

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState('connection');
  const [activeToolboxTab, setActiveToolboxTab] = useState('init'); // 'init', 'clear', 'deploy', 'extract', 'extractXml' or 'initProject'
  const [connectionResult, setConnectionResult] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });
  const [toolboxOutput, setToolboxOutput] = useState<string>('');
  const [deployFilePath, setDeployFilePath] = useState<string>('');
  const [deployDirectoryPath, setDeployDirectoryPath] = useState<string>('');
  const [deployMode, setDeployMode] = useState<'file' | 'directory'>('file');
  const [deployRecursive, setDeployRecursive] = useState<boolean>(true);
  const [isInitRunning, setIsInitRunning] = useState<boolean>(false);
  const [isClearRunning, setIsClearRunning] = useState<boolean>(false);
  const [isDeployRunning, setIsDeployRunning] = useState<boolean>(false);
  const [isExtractRunning, setIsExtractRunning] = useState<boolean>(false);
  const [extractDirectoryPath, setExtractDirectoryPath] = useState<string>('');
  const [extractXmlDirectoryPath, setExtractXmlDirectoryPath] = useState<string>('');
  const [isExtractXmlRunning, setIsExtractXmlRunning] = useState<boolean>(false);
  const [extractMaxobjectDirectoryPath, setExtractMaxobjectDirectoryPath] = useState<string>('');
  const [isExtractMaxobjectRunning, setIsExtractMaxobjectRunning] = useState<boolean>(false);
  const [extractMessageDirectoryPath, setExtractMessageDirectoryPath] = useState<string>('');
  const [isExtractMessageRunning, setIsExtractMessageRunning] = useState<boolean>(false);
  const [extractDomainDirectoryPath, setExtractDomainDirectoryPath] = useState<string>('');
  const [isExtractDomainRunning, setIsExtractDomainRunning] = useState<boolean>(false);
  const [extractConditionDirectoryPath, setExtractConditionDirectoryPath] = useState<string>('');
  const [isExtractConditionRunning, setIsExtractConditionRunning] = useState<boolean>(false);
  const [extractConditionWhere, setExtractConditionWhere] = useState<string>('1=1');
  const [scheduledExportPlan, setScheduledExportPlan] = useState<any>({ baseDir: '', tasks: [] });
  const [isScheduledExportRunning, setIsScheduledExportRunning] = useState<boolean>(false);
  const [scheduledExportProgress, setScheduledExportProgress] = useState<{ current: number; total: number; statusText: string }>({ current: 0, total: 0, statusText: '' });
  const [scheduledExportTaskProgress, setScheduledExportTaskProgress] = useState<Record<number, { current: number; total: number; statusText: string }>>({});
  const [scheduledExportLog, setScheduledExportLog] = useState<string>('');
  const [deleteJsonPath, setDeleteJsonPath] = useState<string>('');
  const [scriptList, setScriptList] = useState<any[]>([]);
  const [isQueryingScripts, setIsQueryingScripts] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [config, setConfig] = useState<ConfigData>({
    serverUrl: '',
    authType: 'maxauth',
    maxauth: '',
    apiKey: '',
    apiType: 'oslc',
    version: '7.6',
    completionMode: 'vscode',
    localApiPath: '',
    enableJSDocParsing: true,
    enableTypeInference: true,
    autoGenerateReflectionApi: false,
    autoGenerateReflectionApiLocal: false,
    enableHttpLog: false,
    jdkPath: '',
    jarDirectories: [],
    additionalJars: [],
    scriptStoragePath: 'masscript',
    aliasName: '',
    exportDirectory: '',
    exportXmlDirectory: '',
    envnum: 'default',
    envList: [],
    langcode: '',  // 语言代码，空字符串表示未设置
    pushXmlAlwaysUseMaxauth: true,  // 推送 XML 时始终使用 MAXAUTH 认证方式，默认为 true
    debugPort: 9229,  // 脚本调试端口，默认 9229
    debugHostname: '',  // 脚本调试主机名（可选），留空按服务器地址解析
    autoCreateExportDir: true,  // 默认自动生成导出目录
    maxobjectSimpleMode: false,  // MAXOBJECT 导出精简模式（忽略默认值）
    exportMaxobjectDirectory: '',
    extractThreadCount: 5,
    extractXmlThreadCount: 5,
    extractMaxobjectThreadCount: 5,
    extractZipEnabled: false,
    extractXmlZipEnabled: false,
    extractMaxobjectZipEnabled: false,
    exportMessageDirectory: '',
    exportMessageThreadCount: 5,
    exportMessageZipEnabled: true,
    exportMessagePageSize: 5000,
    exportMessageIgnoreDefVal: false,
    exportDomainDirectory: '',
    exportConditionDirectory: '',
    exportConditionWhere: '1=1',
    exportDomainThreadCount: 5,
    exportDomainZipEnabled: true,
    exportDomainPageSize: 50000,
    exportDomainIgnoreDefVal: false,
    scheduledExportBaseDir: '',
  });
  
  // 环境配置缓存
  const [envsCache, setEnvsCache] = useState<Record<string, Partial<ConfigData>>>({});
  // 是否有未保存的变更
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  // 是否显示环境选择对话框
  const [showEnvDialog, setShowEnvDialog] = useState<boolean>(false);
  // 是否显示删除确认对话框
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  // 待删除的环境名称
  const [envToDelete, setEnvToDelete] = useState<string>('');
  // 密码显示状态
  const [showMaxauth, setShowMaxauth] = useState<boolean>(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<boolean>(false);  // 手动停用调试驱动的二次确认
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  // 用户信息弹窗状态
  const [showUserInfoDialog, setShowUserInfoDialog] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  // 语言选项列表 (code, name)
  const languageOptions: Array<{ code: string; name: string }> = [
    { code: 'AA', name: 'Afar' },
    { code: 'AE', name: 'Avestan' },
    { code: 'AF', name: 'Afrikaans' },
    { code: 'AM', name: 'Amharic' },
    { code: 'AR', name: 'عربية' },
    { code: 'AS', name: 'Assamese' },
    { code: 'AY', name: 'Aymara' },
    { code: 'AZ', name: 'Azerbaijani' },
    { code: 'BA', name: 'Bashkir' },
    { code: 'BE', name: 'Belarusian' },
    { code: 'BG', name: 'български' },
    { code: 'BH', name: 'Bihari' },
    { code: 'BI', name: 'Bislama' },
    { code: 'BN', name: 'Bengali' },
    { code: 'BO', name: 'Tibetan' },
    { code: 'BR', name: 'Breton' },
    { code: 'BS', name: 'Bosnian' },
    { code: 'CA', name: 'Catalan' },
    { code: 'CE', name: 'Chechen' },
    { code: 'CH', name: 'Chamorro' },
    { code: 'CO', name: 'Corsican' },
    { code: 'CS', name: 'Čeština' },
    { code: 'CU', name: 'Church Slavic' },
    { code: 'CV', name: 'Chuvash' },
    { code: 'CY', name: 'Welsh' },
    { code: 'DA', name: 'Dansk' },
    { code: 'DE', name: 'Deutsch' },
    { code: 'DZ', name: 'Dzongkha' },
    { code: 'EL', name: 'Ελληνικά' },
    { code: 'EN', name: 'English' },
    { code: 'EO', name: 'Esperanto' },
    { code: 'ES', name: 'Español' },
    { code: 'ET', name: 'Eesti' },
    { code: 'EU', name: 'Basque' },
    { code: 'FA', name: 'Persian' },
    { code: 'FI', name: 'Suomi' },
    { code: 'FJ', name: 'Fijian' },
    { code: 'FO', name: 'Føroyska' },
    { code: 'FR', name: 'Français' },
    { code: 'FY', name: 'Frisian' },
    { code: 'GA', name: 'Irish' },
    { code: 'GD', name: 'Gaelic (Scots)' },
    { code: 'GL', name: 'Gallegan' },
    { code: 'GN', name: 'Guarani' },
    { code: 'GU', name: 'Gujarati' },
    { code: 'GV', name: 'Manx' },
    { code: 'HE', name: 'עברית' },
    { code: 'HI', name: 'हिन्दी' },
    { code: 'HO', name: 'Hiri Motu' },
    { code: 'HR', name: 'Hrvatski' },
    { code: 'HU', name: 'Magyar' },
    { code: 'HY', name: 'Armenian' },
    { code: 'HZ', name: 'Herero' },
    { code: 'IA', name: 'Interlingua (International Auxiliary Language Association)' },
    { code: 'ID', name: 'Indonesian' },
    { code: 'IE', name: 'Interlingue' },
    { code: 'IK', name: 'Inupiaq' },
    { code: 'IS', name: 'Íslenska' },
    { code: 'IT', name: 'Italiano' },
    { code: 'IU', name: 'Inuktitut' },
    { code: 'JA', name: '日本語' },
    { code: 'JW', name: 'Javanese' },
    { code: 'KA', name: 'ქართული' },
    { code: 'KI', name: 'Kikuyu' },
    { code: 'KJ', name: 'Kuanyama' },
    { code: 'KK', name: 'Kazakh' },
    { code: 'KL', name: 'Kalaallisut' },
    { code: 'KM', name: 'Khmer' },
    { code: 'KN', name: 'Kannada' },
    { code: 'KO', name: '한국어' },
    { code: 'KS', name: 'Kashmiri' },
    { code: 'KU', name: 'Kurdish' },
    { code: 'KV', name: 'Komi' },
    { code: 'KW', name: 'Cornish' },
    { code: 'KY', name: 'Kirghiz' },
    { code: 'LA', name: 'Latin' },
    { code: 'LB', name: 'Letzeburgesch' },
    { code: 'LN', name: 'Lingala' },
    { code: 'LO', name: 'Lao' },
    { code: 'LT', name: 'Lietuvių' },
    { code: 'LV', name: 'Latviešu' },
    { code: 'MG', name: 'Malagasy' },
    { code: 'MH', name: 'Marshall' },
    { code: 'MI', name: 'Maori' },
    { code: 'MK', name: 'македонски' },
    { code: 'ML', name: 'Malayalam' },
    { code: 'MN', name: 'Mongolian' },
    { code: 'MO', name: 'Moldavian' },
    { code: 'MR', name: 'Marathi' },
    { code: 'MS', name: 'Malay' },
    { code: 'MT', name: 'Maltese' },
    { code: 'MY', name: 'Burmese' },
    { code: 'NA', name: 'Nauru' },
    { code: 'NB', name: 'Norwegian Bokmal' },
    { code: 'ND', name: 'Ndebele, North' },
    { code: 'NE', name: 'Nepali' },
    { code: 'NG', name: 'Ndonga' },
    { code: 'NL', name: 'Nederlands' },
    { code: 'NN', name: 'Norwegian Nynorsk' },
    { code: 'NO', name: 'Norsk' },
    { code: 'NR', name: 'Ndebele, South' },
    { code: 'NV', name: 'Navajo' },
    { code: 'NY', name: 'Chichewa; Nyanja' },
    { code: 'OC', name: 'Occitan (post 1500); Provencal' },
    { code: 'OM', name: 'Oromo' },
    { code: 'OR', name: 'Oriya' },
    { code: 'OS', name: 'Ossetian; Ossetic' },
    { code: 'PA', name: 'ਪੰਜਾਬੀ' },
    { code: 'PI', name: 'Pali' },
    { code: 'PL', name: 'Polski' },
    { code: 'PS', name: 'Pushto' },
    { code: 'PT', name: 'Português' },
    { code: 'QU', name: 'Quechua' },
    { code: 'RM', name: 'Raeto-Romance' },
    { code: 'RN', name: 'Rundi' },
    { code: 'RO', name: 'Română' },
    { code: 'RU', name: 'Pyccкий' },
    { code: 'RW', name: 'Kinyarwanda' },
    { code: 'SA', name: 'Sanskrit' },
    { code: 'SC', name: 'Sardinian' },
    { code: 'SD', name: 'Sindhi' },
    { code: 'SE', name: 'Northern Sami' },
    { code: 'SG', name: 'Sango' },
    { code: 'SI', name: 'Sinhalese' },
    { code: 'SK', name: 'Slovenčina' },
    { code: 'SL', name: 'Slovenščina' },
    { code: 'SM', name: 'Samoan' },
    { code: 'SN', name: 'Shona' },
    { code: 'SO', name: 'Somali' },
    { code: 'SQ', name: 'Albanian' },
    { code: 'SR', name: 'Srpski' },
    { code: 'SS', name: 'Swati' },
    { code: 'ST', name: 'Sotho, Southern' },
    { code: 'SU', name: 'Sundanese' },
    { code: 'SV', name: 'Svenska' },
    { code: 'SW', name: 'Swahili' },
    { code: 'TA', name: 'Tamil' },
    { code: 'TE', name: 'Telugu' },
    { code: 'TG', name: 'Tajik' },
    { code: 'TH', name: 'ภาษาไทย' },
    { code: 'TK', name: 'Turkmen' },
    { code: 'TL', name: 'Tagalog' },
    { code: 'TN', name: 'Tswana' },
    { code: 'TR', name: 'Türkçe' },
    { code: 'TS', name: 'Tsonga' },
    { code: 'TT', name: 'Tatar' },
    { code: 'TW', name: 'Twi' },
    { code: 'TY', name: 'Tahitian' },
    { code: 'UG', name: 'Uighur' },
    { code: 'UK', name: 'Українська' },
    { code: 'UR', name: 'Urdu' },
    { code: 'UZ', name: 'Uzbek' },
    { code: 'VI', name: 'Vietnamese' },
    { code: 'VO', name: 'Volapuk' },
    { code: 'WO', name: 'Wolof' },
    { code: 'XH', name: 'Xhosa' },
    { code: 'YI', name: 'Yiddish' },
    { code: 'ZA', name: 'Zhuang' },
    { code: 'ZH', name: '简体中文' },
    { code: 'ZU', name: 'Zulu' },
    { code: 'ZHT', name: '繁體中文' }
  ];

  // 使用 useRef 确保只获取一次 VSCode API
  const vscodeRef = React.useRef<any>(null);
  
  const getVsCodeApi = () => {
    if (!vscodeRef.current) {
      vscodeRef.current = window.acquireVsCodeApi();
    }
    return vscodeRef.current;
  };

  useEffect(() => {
    // 通知扩展主机 React 已准备好
    getVsCodeApi().postMessage({ command: 'webviewReady' });
    console.log('[React Webview] 已发送 ready 信号');
    
    // 监听来自扩展的消息
    window.addEventListener('message', event => {
      const message = event.data;
      console.log('[React Webview] 收到消息:', message);
      
      switch (message.command) {
        case 'loadConfig':
          // 加载初始配置
          console.log('[React Webview] 加载配置:', message.data);
          setConfig(message.data);
          // 同时设置导出目录路径
          if (message.data.exportDirectory) {
            setExtractDirectoryPath(message.data.exportDirectory);
          }
          if (message.data.exportXmlDirectory) {
            setExtractXmlDirectoryPath(message.data.exportXmlDirectory);
          }
          if (message.data.exportMaxobjectDirectory) {
            setExtractMaxobjectDirectoryPath(message.data.exportMaxobjectDirectory);
          }
          if (message.data.exportMessageDirectory) {
            setExtractMessageDirectoryPath(message.data.exportMessageDirectory);
          }
          if (message.data.exportDomainDirectory) {
            setExtractDomainDirectoryPath(message.data.exportDomainDirectory);
          }
          if (message.data.exportConditionDirectory) {
            setExtractConditionDirectoryPath(message.data.exportConditionDirectory);
          }
          if (message.data.exportConditionWhere) {
            setExtractConditionWhere(message.data.exportConditionWhere);
          }
          // 加载计划导出配置
          getVsCodeApi().postMessage({ command: 'loadScheduledExportConfig' });
          break;
        case 'setDirectoryPath':
          setConfig(prev => ({ ...prev, localApiPath: message.path }));
          break;
        case 'setJdkPath':
          setConfig(prev => ({ ...prev, jdkPath: message.path }));
          break;
        case 'setSingleJarPath':
          // 设置单个 JAR 文件的输入框
          const singleJarInput = document.getElementById('singleJarInput') as HTMLInputElement;
          if (singleJarInput) {
            singleJarInput.value = message.path;
          }
          break;
        case 'updateJarDirectoriesList':
          // 这个命令在旧版中使用，现在通过保存配置来更新
          break;
        case 'updateAdditionalJarsList':
          // 这个命令在旧版中使用，现在通过保存配置来更新
          break;
        case 'connectionResult':
          // 处理连接测试结果
          setConnectionResult({ type: message.type, text: message.text });
          // 3秒后自动清除结果
          setTimeout(() => setConnectionResult({ type: null, text: '' }), 5000);
          break;
        case 'pushScriptError':
          // 处理脚本推送错误
          setConnectionResult({ type: 'error', text: `脚本推送失败: ${message.error}` });
          setTimeout(() => setConnectionResult({ type: null, text: '' }), 5000);
          console.error('[React Webview] 脚本推送错误:', message.error);
          break;
        case 'pushXmlError':
          // 处理 XML 推送错误
          // 如果 useHtml 为 true，直接使用 HTML 格式；否则添加前缀
          const errorText = message.useHtml ? message.error : `XML 推送失败: ${message.error}`;
          setConnectionResult({ type: 'error', text: errorText });
          setTimeout(() => setConnectionResult({ type: null, text: '' }), 5000);
          console.error('[React Webview] XML 推送错误:', message.error);
          break;
        case 'pushXmlSuccess':
          // 处理 XML 推送成功
          setConnectionResult({ type: 'success', text: message.message || 'XML 推送成功' });
          setTimeout(() => setConnectionResult({ type: null, text: '' }), 5000);
          console.log('[React Webview] XML 推送成功:', message.message);
          break;
        case 'updateToolboxOutput':
          // 更新工具箱输出日志
          setToolboxOutput(prev => prev + message.text + '\n');
          break;
        case 'clearToolboxOutput':
          // 清空工具箱输出
          setToolboxOutput('');
          break;
        case 'setDeployFilePath':
          // 设置部署文件路径
          setDeployFilePath(message.path);
          break;
        case 'setDeployDirectoryPath':
          // 设置部署目录路径
          setDeployDirectoryPath(message.path);
          break;
        case 'setDeleteJsonPath':
          // 设置删除脚本 JSON 文件路径
          console.log('[App] 收到 setDeleteJsonPath 消息:', message.path);
          console.log('[App] 当前的 deleteJsonPath:', deleteJsonPath);
          setDeleteJsonPath(message.path);
          console.log('[App] 已调用 setDeleteJsonPath，新值应该是:', message.path);
          break;
        case 'setExtractDirectoryPath':
          // 设置导出目录路径
          setExtractDirectoryPath(message.path);
          // 同时更新 config 中的 exportDirectory
          setConfig(prev => ({ ...prev, exportDirectory: message.path }));
          break;
        case 'loadEnvironmentConfig':
          // 加载环境配置到表单
          console.log('[React Webview] 加载环境配置:', message.data);
          const envData = message.data;
          setConfig(prev => ({
            ...prev,
            envnum: envData.envnum || prev.envnum,  // 更新环境名称
            serverUrl: envData.serverUrl || '',
            authType: envData.authType || 'maxauth',
            maxauth: envData.maxauth || '',
            apiKey: envData.apiKey || '',
            apiType: envData.apiType || 'oslc',
            version: envData.version || '7.6',
            completionMode: envData.completionMode || 'vscode',
            langcode: envData.langcode || '',  // 语言代码，空字符串表示未设置
            pushXmlAlwaysUseMaxauth: envData.pushXmlAlwaysUseMaxauth !== undefined ? envData.pushXmlAlwaysUseMaxauth : true,  // 推送 XML 时始终使用 MAXAUTH，默认为 true
            debugPort: envData.debugPort !== undefined ? envData.debugPort : 9229,  // 脚本调试端口
            debugHostname: envData.debugHostname || ''  // 脚本调试主机名（可选）
          }));
          setHasChanges(true); // 标记有未保存的变更
          break;
        case 'updateEnvList':
          // 更新环境列表（删除环境后）
          console.log('[React Webview] 更新环境列表:', message.envList);
          setConfig(prev => ({
            ...prev,
            envList: message.envList || []
          }));
          break;
        case 'initScriptsComplete':
          // 初始化脚本完成
          setIsInitRunning(false);
          break;
        case 'clearScriptsComplete':
          // 清除脚本完成
          setIsClearRunning(false);
          break;
        case 'executeClearScripts':
          // 后端确认后，执行清除操作，使用后端传递的 jsonPath
          executeClearScripts(message.jsonPath);
          break;
        case 'deployScriptComplete':
          // 部署脚本完成
          setIsDeployRunning(false);
          break;
        case 'extractScriptsComplete':
          // 导出脚本完成
          setIsExtractRunning(false);
          break;
        case 'setExtractXmlDirectoryPath':
          // 设置导出应用XML目录路径
          setExtractXmlDirectoryPath(message.path);
          // 同时更新 config 中的 exportXmlDirectory
          setConfig(prev => ({ ...prev, exportXmlDirectory: message.path }));
          break;
        case 'extractAppXmlComplete':
          // 导出应用XML完成
          setIsExtractXmlRunning(false);
          break;
        case 'setExtractMaxobjectDirectoryPath':
          // 设置导出MAXOBJECT目录路径
          setExtractMaxobjectDirectoryPath(message.path);
          setConfig(prev => ({ ...prev, exportMaxobjectDirectory: message.path }));
          break;
        case 'extractMaxobjectComplete':
          // 导出MAXOBJECT完成
          setIsExtractMaxobjectRunning(false);
          break;
        case 'setExtractMessageDirectoryPath':
          // 设置消息导出目录路径
          setExtractMessageDirectoryPath(message.path);
          setConfig(prev => ({ ...prev, exportMessageDirectory: message.path }));
          break;
        case 'extractMessageComplete':
          // 消息导出完成
          setIsExtractMessageRunning(false);
          break;
        case 'setExtractDomainDirectoryPath':
          // 设置域导出目录路径
          setExtractDomainDirectoryPath(message.path);
          setConfig(prev => ({ ...prev, exportDomainDirectory: message.path }));
          break;
        case 'extractDomainComplete':
          // 域导出完成
          setIsExtractDomainRunning(false);
          break;
        case 'setExtractConditionDirectoryPath':
          // 设置条件表达式导出目录路径
          setExtractConditionDirectoryPath(message.path);
          setConfig(prev => ({ ...prev, exportConditionDirectory: message.path }));
          break;
        case 'extractConditionComplete':
          // 条件表达式导出完成
          setIsExtractConditionRunning(false);
          break;
        case 'loadScheduledExportConfig':
          // 加载计划导出配置
          if (message.config) {
            setScheduledExportPlan(message.config);
          }
          break;
        case 'updateScheduledExportLog':
          // 更新计划导出日志
          setScheduledExportLog(prev => prev + message.text + '\n');
          break;
        case 'updateScheduledExportProgress':
          // 更新计划导出进度
          setScheduledExportProgress({ current: message.current, total: message.total, statusText: message.statusText });
          break;
        case 'updateScheduledTaskProgress':
          // 更新计划导出单个任务进度
          setScheduledExportTaskProgress(prev => ({
            ...prev,
            [message.taskIndex]: { current: message.current, total: message.total, statusText: message.statusText }
          }));
          break;
        case 'scheduledExportComplete':
          // 计划导出完成
          setIsScheduledExportRunning(false);
          setScheduledExportTaskProgress({});
          break;
        case 'setScriptList':
          // 设置脚本列表
          setScriptList(message.scripts || []);
          setIsQueryingScripts(false);
          break;
        case 'showUserInfo':
          // 显示用户信息
          setUserInfo(message.data);
          setShowUserInfoDialog(true);
          break;
        case 'showMessage':
          // 显示消息（来自后端的提示）
          if (message.type === 'success') {
            getVsCodeApi().postMessage({ command: 'showInfo', message: message.text });
          } else if (message.type === 'error') {
            getVsCodeApi().postMessage({ command: 'showWarning', message: message.text });
          }
          break;
      }
    });
  }, []);

  // 即时保存配置
  const saveConfig = (newConfig: ConfigData) => {
    getVsCodeApi().postMessage({
      command: 'saveConfig',
      data: newConfig
    });
  };

  // 更新配置并自动保存（用于其他字段）
  const updateConfig = (updates: Partial<ConfigData>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setHasChanges(true); // 标记有未保存的变更
    saveConfig(newConfig);
  };

  // 仅更新环境名称，不自动保存（需要手动点击保存按钮）
  const updateEnvnum = (value: string) => {
    setConfig(prev => ({ ...prev, envnum: value }));
    setHasChanges(true); // 标记有未保存的变更
  };

  // 删除环境
  const handleDeleteEnvironment = (envName: string) => {
    console.log('[App] 点击删除环境按钮:', envName);
    setEnvToDelete(envName);
    setShowDeleteConfirm(true);
  };

  // 确认删除
  const confirmDelete = () => {
    console.log('[App] 用户确认删除环境:', envToDelete);
    getVsCodeApi().postMessage({
      command: 'deleteEnvironment',
      envnum: envToDelete
    });
    setShowDeleteConfirm(false);
    setEnvToDelete('');
  };

  // 取消删除
  const cancelDelete = () => {
    console.log('[App] 用户取消删除');
    setShowDeleteConfirm(false);
    setEnvToDelete('');
  };

  const handleSave = () => {
    getVsCodeApi().postMessage({
      command: 'saveConfig',
      data: config
    });
    setHasChanges(false); // 清除变化标记
    alert('配置已保存！');
  };

  const handleTestConnection = () => {
    getVsCodeApi().postMessage({
      command: 'testConnection',
      data: config
    });
  };

  // 查看用户语言信息
  const handleViewUserInfo = () => {
    getVsCodeApi().postMessage({
      command: 'viewUserInfo',
      data: config
    });
  };

  // 工具箱 - 初始化脚本
  const handleInitScripts = () => {
    setIsInitRunning(true);
    setToolboxOutput(''); // 清空之前的输出
    getVsCodeApi().postMessage({
      command: 'initScripts'
    });
  };

  // 工具箱 - 清空输出
  const handleClearToolboxOutput = () => {
    setToolboxOutput('');
  };

  // 工具箱 - 清除工具脚本
  const handleClearScripts = () => {
    console.log('[App] handleClearScripts 被调用');
    console.log('[App] deleteJsonPath:', deleteJsonPath);
    console.log('[App] isInitRunning:', isInitRunning);
    console.log('[App] isClearRunning:', isClearRunning);
    console.log('[App] isDeployRunning:', isDeployRunning);
    
    if (!deleteJsonPath) {
      // 使用 VSCode 的通知而不是 alert
      getVsCodeApi().postMessage({
        command: 'showWarning',
        message: '请先选择要删除的脚本列表 JSON 文件'
      });
      return;
    }
    
    // 请求后端显示确认对话框
    getVsCodeApi().postMessage({
      command: 'confirmClearScripts',
      jsonPath: deleteJsonPath
    });
  };

  // 处理确认后的清除操作
  const executeClearScripts = (jsonPath?: string) => {
    setIsClearRunning(true);
    setToolboxOutput(''); // 清空之前的输出
    getVsCodeApi().postMessage({
      command: 'clearScripts',
      jsonPath: jsonPath || deleteJsonPath  // 优先使用参数，如果没有则使用 state
    });
  };

  // 使用 useEffect 添加原生 DOM 事件监听器
  React.useEffect(() => {
    console.log('[App] useEffect 执行，设置按钮事件监听器');
    
    const clearButton = document.getElementById('clearScriptsButton');
    
    // 定义事件处理函数
    const handleClick = (e: Event) => {
      console.log('[App] clearScriptsButton 被点击（原生事件）');
      e.preventDefault();
      e.stopPropagation();
      handleClearScripts();
    };
    
    if (clearButton) {
      console.log('[App] 找到 clearScriptsButton');
      // 先移除旧的事件监听器（如果存在）
      clearButton.removeEventListener('click', handleClick);
      // 添加新的事件监听器
      clearButton.addEventListener('click', handleClick);
    } else {
      console.log('[App] 未找到 clearScriptsButton');
    }
    
    // 清理函数
    return () => {
      if (clearButton) {
        // 正确移除事件监听器
        clearButton.removeEventListener('click', handleClick);
      }
    };
  }, [deleteJsonPath, isInitRunning, isClearRunning, isDeployRunning]);

  // 工具箱 - 选择删除脚本 JSON 文件
  const handleSelectDeleteJson = () => {
    getVsCodeApi().postMessage({
      command: 'selectDeleteJson'
    });
  };

  // 工具箱 - 选择部署文件
  const handleSelectDeployFile = () => {
    getVsCodeApi().postMessage({
      command: 'selectFileForDeploy'
    });
  };

  // 工具箱 - 选择部署目录
  const handleSelectDeployDirectory = () => {
    getVsCodeApi().postMessage({
      command: 'selectDirectoryForDeploy'
    });
  };

  // 工具箱 - 开始部署
  const handleStartDeploy = () => {
    if (deployMode === 'file') {
      if (!deployFilePath) {
        alert('请先选择要部署的文件');
        return;
      }
      setIsDeployRunning(true);
      setToolboxOutput('');
      getVsCodeApi().postMessage({
        command: 'deployScript',
        filePath: deployFilePath
      });
    } else {
      if (!deployDirectoryPath) {
        alert('请先选择要部署的目录');
        return;
      }
      setIsDeployRunning(true);
      setToolboxOutput('');
      getVsCodeApi().postMessage({
        command: 'deployDirectory',
        directoryPath: deployDirectoryPath,
        recursive: deployRecursive
      });
    }
  };

  // 工具箱 - 选择导出目录
  const handleSelectExtractDirectory = () => {
    getVsCodeApi().postMessage({
      command: 'selectDirectoryForExtract'
    });
  };

  // 工具箱 - 开始导出
  const handleStartExtract = () => {
    if (!extractDirectoryPath) {
      getVsCodeApi().postMessage({
        command: 'showWarning',
        message: '请先选择导出目录'
      });
      return;
    }
    setIsExtractRunning(true);
    setToolboxOutput('');
    getVsCodeApi().postMessage({
      command: 'extractScripts',
      directoryPath: extractDirectoryPath,
      autoCreateExportDir: config.autoCreateExportDir
    });
  };

  // 工具箱 - 选择导出应用XML目录
  const handleSelectExtractXmlDirectory = () => {
    getVsCodeApi().postMessage({
      command: 'selectDirectoryForExtractXml'
    });
  };

  // 工具箱 - 开始导出应用XML
  const handleStartExtractXml = () => {
    if (!extractXmlDirectoryPath) {
      getVsCodeApi().postMessage({
        command: 'showWarning',
        message: '请先选择导出目录'
      });
      return;
    }
    setIsExtractXmlRunning(true);
    setToolboxOutput('');
    getVsCodeApi().postMessage({
      command: 'extractAppXml',
      directoryPath: extractXmlDirectoryPath,
      autoCreateExportDir: config.autoCreateExportDir
    });
  };

  // 工具箱 - 选择导出MAXOBJECT目录
  const handleSelectExtractMaxobjectDirectory = () => {
    getVsCodeApi().postMessage({
      command: 'selectDirectoryForExtractMaxobject'
    });
  };

  // 工具箱 - 打开MAXOBJECT配置文件
  const handleOpenMaxobjectConfig = () => {
    getVsCodeApi().postMessage({
      command: 'openMaxobjectConfig'
    });
  };

  // 工具箱 - 开始导出MAXOBJECT
  const handleStartExtractMaxobject = () => {
    if (!extractMaxobjectDirectoryPath) {
      getVsCodeApi().postMessage({
        command: 'showWarning',
        message: '请先选择导出目录'
      });
      return;
    }
    setIsExtractMaxobjectRunning(true);
    setToolboxOutput('');
    getVsCodeApi().postMessage({
      command: 'extractMaxobject',
      directoryPath: extractMaxobjectDirectoryPath,
      autoCreateExportDir: config.autoCreateExportDir
    });
  };

  // 工具箱 - 选择消息导出目录
  const handleSelectExtractMessageDirectory = () => {
    getVsCodeApi().postMessage({
      command: 'selectDirectoryForExtractMessage'
    });
  };

  // 工具箱 - 开始导出消息
  const handleStartExtractMessage = () => {
    if (!extractMessageDirectoryPath) {
      getVsCodeApi().postMessage({
        command: 'showWarning',
        message: '请先选择导出目录'
      });
      return;
    }
    setIsExtractMessageRunning(true);
    setToolboxOutput('');
    getVsCodeApi().postMessage({
      command: 'extractMessage',
      directoryPath: extractMessageDirectoryPath,
      autoCreateExportDir: config.autoCreateExportDir
    });
  };

  // 工具箱 - 选择域导出目录
  const handleSelectExtractDomainDirectory = () => {
    getVsCodeApi().postMessage({
      command: 'selectDirectoryForExtractDomain'
    });
  };

  // 工具箱 - 开始导出域
  const handleStartExtractDomain = () => {
    if (!extractDomainDirectoryPath) {
      getVsCodeApi().postMessage({
        command: 'showWarning',
        message: '请先选择导出目录'
      });
      return;
    }
    setIsExtractDomainRunning(true);
    setToolboxOutput('');
    getVsCodeApi().postMessage({
      command: 'extractDomain',
      directoryPath: extractDomainDirectoryPath,
      autoCreateExportDir: config.autoCreateExportDir
    });
  };

  // 工具箱 - 选择条件表达式导出目录
  const handleSelectExtractConditionDirectory = () => {
    getVsCodeApi().postMessage({
      command: 'selectDirectoryForExtractCondition'
    });
  };

  // 工具箱 - 开始导出条件表达式
  const handleStartExtractCondition = () => {
    if (!extractConditionDirectoryPath) {
      getVsCodeApi().postMessage({
        command: 'showWarning',
        message: '请先选择导出目录'
      });
      return;
    }
    setIsExtractConditionRunning(true);
    setToolboxOutput('');
    getVsCodeApi().postMessage({
      command: 'extractCondition',
      directoryPath: extractConditionDirectoryPath,
      where: extractConditionWhere,
      autoCreateExportDir: config.autoCreateExportDir
    });
  };
  // 工具箱 - 添加计划导出任务
  const handleAddScheduledTask = () => {
    const newTasks = [...(scheduledExportPlan.tasks || [])];
    const maxId = newTasks.reduce((max: number, t: any) => Math.max(max, t.id || 0), 0);
    newTasks.push({
      id: maxId + 1,
      exportFunction: 'extractMaxobject',
      directory: 'maxobject_backup_${datetimeEN}_${langcode}',
      language: 'ZH',
      compress: true,
      threadCount: 10,
      pageSize: 5000,
      ignoreDefVal: false,
      enabled: true
    });
    setScheduledExportPlan({ ...scheduledExportPlan, tasks: newTasks });
  };

  // 工具箱 - 保存计划导出配置
  const handleSaveScheduledExportConfig = () => {
    getVsCodeApi().postMessage({
      command: 'saveScheduledExportConfig',
      config: scheduledExportPlan
    });
  };

  // 工具箱 - 开始执行计划导出
  const handleStartScheduledExport = () => {
    setIsScheduledExportRunning(true);
    setScheduledExportLog('');
    setScheduledExportProgress({ current: 0, total: 0, statusText: '' });
    setScheduledExportTaskProgress({});
    getVsCodeApi().postMessage({
      command: 'executeScheduledExport',
      config: scheduledExportPlan
    });
  };

  // 查询脚本
  const handleQueryScripts = () => {
    setIsQueryingScripts(true);
    setScriptList([]);
    getVsCodeApi().postMessage({
      command: 'queryScripts'
    });
  };

  // 过滤脚本列表（基于缓存数据）
  const filteredScriptList = scriptList.filter(script => {
    if (!searchKeyword) return true;
    const keyword = searchKeyword.toLowerCase();
    const autoscript = (script.AUTOSCRIPT || '').toLowerCase();
    const description = (script.DESCRIPTION || '').toLowerCase();
    return autoscript.includes(keyword) || description.includes(keyword);
  });

  // Pull 单个脚本
  const handlePullScript = (scriptName: string) => {
    getVsCodeApi().postMessage({
      command: 'pullScript',
      scriptName: scriptName,
      storagePath: config.scriptStoragePath
    });
  };

  // 添加 JAR 目录
  const handleAddJarDirectory = () => {
    const jarDirInput = document.getElementById('jarDirectoryInput') as HTMLInputElement;
    const path = jarDirInput?.value.trim();
    
    if (!path) {
      alert('请输入 JAR 目录路径');
      return;
    }
    
    getVsCodeApi().postMessage({
      command: 'addJarDirectory',
      path: path
    });
    
    if (jarDirInput) {
      jarDirInput.value = '';
    }
  };

  // 删除 JAR 目录
  const handleRemoveJarDirectory = (index: number) => {
    getVsCodeApi().postMessage({
      command: 'removeJarDirectory',
      index: index
    });
  };

  // 选择单个 JAR 文件
  const handleSelectSingleJar = () => {
    getVsCodeApi().postMessage({ command: 'selectSingleJar' });
  };

  // 添加单个 JAR 文件
  const handleAddSingleJar = () => {
    const singleJarInput = document.getElementById('singleJarInput') as HTMLInputElement;
    const jarPath = singleJarInput?.value.trim();
    
    if (!jarPath) {
      alert('请输入 JAR 文件路径');
      return;
    }
    
    getVsCodeApi().postMessage({
      command: 'addSingleJar',
      path: jarPath
    });
    
    if (singleJarInput) {
      singleJarInput.value = '';
    }
  };

  const menuItems = [
    { id: 'connection', label: '连接配置' },
    { id: 'completion', label: '补全设置' },
    { id: 'other', label: '其它配置' },
    { id: 'toolbox', label: '工具箱' },
    { id: 'scheduledExport', label: '计划导出' },
    { id: 'queryScripts', label: '查询脚本' },
    { id: 'logger', label: '日志' },
    { id: 'import', label: '导入' },
    { id: 'about', label: '关于' }
  ];

  return (
    <div className="container">
      <div className="sidebar">
        {menuItems.map(item => (
          <div
            key={item.id}
            className={`menu-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => setActiveSection(item.id)}
          >
            {item.label}
          </div>
        ))}
      </div>

      <div className="content">
        {activeSection === 'connection' && (
          <div className="section active">
            <h2>连接配置</h2>
            
            {/* 环境选择器 */}
            <div className="form-group">
              <label>当前环境: <strong>{config.envnum || 'default'}</strong></label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* 环境名称输入框 - 用于新增或修改环境名 */}
                <input
                  type="text"
                  value={config.envnum}
                  onChange={(e) => updateEnvnum(e.target.value)}
                  placeholder="输入环境名称"
                  style={{ flex: 1 }}
                  autoComplete="off"
                  title="输入环境名称，可以是已有环境或新环境"
                />
                {/* 切换环境按钮 - 从已有环境中选择 */}
                <button
                  onClick={() => setShowEnvDialog(true)}
                  style={{ 
                    padding: '6px 12px',
                    cursor: 'pointer',
                    backgroundColor: 'var(--vscode-button-background)',
                    color: 'var(--vscode-button-foreground)',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                  title="从已保存的环境中选择"
                >
                  切换环境
                </button>
                {/* 保存环境按钮 */}
                <button
                  onClick={() => {
                    if (config.envnum) {
                      getVsCodeApi().postMessage({
                        command: 'saveConfig',
                        data: config
                      });
                      setHasChanges(false);
                    }
                  }}
                  disabled={!config.envnum}
                  title="将当前配置保存为环境"
                  style={{ 
                    padding: '6px 12px', 
                    cursor: config.envnum ? 'pointer' : 'not-allowed',
                    backgroundColor: 'var(--vscode-button-background)',
                    color: 'var(--vscode-button-foreground)',
                    opacity: config.envnum ? 1 : 0.5,
                    border: 'none',
                    borderRadius: '4px'
                  }}
                >
                  保存环境
                </button>
              </div>
              <small style={{ color: 'var(--vscode-descriptionForeground)' }}>
                💡 在输入框中输入环境名称（已有环境或新环境），点击“切换环境”可从列表选择，修改后点击“保存环境”
              </small>
            </div>
            
            <div className="form-group">
              <label>服务器地址</label>
              <input
                type="text"
                value={config.serverUrl}
                onChange={(e) => updateConfig({ serverUrl: e.target.value })}
                placeholder="http://localhost:9080/maximo"
              />
            </div>

            <div className="form-group">
              <label>登录方式</label>
              <select
                value={config.authType}
                onChange={(e) => updateConfig({ authType: e.target.value })}
              >
                <option value="maxauth">MAXAUTH (Base64认证)</option>
                <option value="apikey">API Key(推荐默认)</option>
              </select>
            </div>

            {config.authType === 'maxauth' && (
              <div className="form-group">
                <label>认证信息 (MAXAUTH)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type={showMaxauth ? 'text' : 'password'}
                    value={config.maxauth}
                    onChange={(e) => updateConfig({ maxauth: e.target.value })}
                    placeholder="Base64编码的用户名:密码"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => setShowMaxauth(!showMaxauth)}
                    style={{
                      padding: '4px 8px',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--vscode-input-border)',
                      borderRadius: '4px',
                      color: 'var(--vscode-foreground)',
                      fontSize: '16px',
                      lineHeight: 1,
                      minWidth: '32px'
                    }}
                    title={showMaxauth ? '隐藏' : '显示'}
                  >
                    {showMaxauth ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            {config.authType === 'apikey' && (
              <div className="form-group">
                <label>API Key</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => updateConfig({ apiKey: e.target.value })}
                    placeholder="输入您的 API Key"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      padding: '4px 8px',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--vscode-input-border)',
                      borderRadius: '4px',
                      color: 'var(--vscode-foreground)',
                      fontSize: '16px',
                      lineHeight: 1,
                      minWidth: '32px'
                    }}
                    title={showApiKey ? '隐藏' : '显示'}
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Maximo版本</label>
              <select
                value={config.version}
                onChange={(e) => updateConfig({ version: e.target.value })}
              >
                <option value="7.6">7.6</option>
                <option value="9.1">9.1</option>
              </select>
            </div>

            <div className="form-group">
              <label>接口方式</label>
              <select
                value={config.apiType}
                onChange={(e) => updateConfig({ apiType: e.target.value })}
              >
                <option value="oslc">OSLC API (/oslc)</option>
                <option value="rest">REST API (/api)</option>
              </select>
            </div>

            <div className="form-group">
              <label>语言 (Langcode)</label>
              <select
                value={config.langcode || ''}
                onChange={(e) => updateConfig({ langcode: e.target.value })}
                style={{ width: '100%' }}
              >
                <option value="">（未设置）</option>
                {languageOptions.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.code})
                  </option>
                ))}
              </select>
              <small style={{ color: 'var(--vscode-descriptionForeground)' }}>
                💡 选择 Maximo 界面显示语言，默认为 English (EN)，留空则使用服务器默认语言
              </small>
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="pushXmlAlwaysUseMaxauth"
                  checked={config.pushXmlAlwaysUseMaxauth !== false}  // 默认为 true
                  onChange={(e) => updateConfig({ pushXmlAlwaysUseMaxauth: e.target.checked })}
                />
                <label htmlFor="pushXmlAlwaysUseMaxauth" style={{ margin: 0 }}>推送 XML 到 Maximo 时始终使用 MAXAUTH 认证方式</label>
              </div>
              <div className="help-text">
                开启后，推送 XML 文件时将强制使用 MAXAUTH 认证，避免 API Key 权限不足导致的问题（推荐开启）
              </div>
            </div>

            {/* ── 脚本调试 (Debug) 分区 ── */}
            <div style={{
              marginTop: '20px',
              borderTop: '1px dashed var(--vscode-panel-border)',
              paddingTop: '12px'
            }}>
              <div style={{
                color: 'var(--vscode-textLink-foreground)',
                fontWeight: 'bold',
                marginBottom: '10px',
                fontSize: '13px'
              }}>
                🔧 脚本调试 (Debug)
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="debugPort" style={{ margin: 0 }}>脚本调试端口</label>
                  <a
                    href="#"
                    title="查看脚本调试说明文档"
                    style={{ fontSize: '12px', color: 'var(--vscode-textLink-foreground)' }}
                    onClick={(e) => {
                      e.preventDefault();
                      getVsCodeApi().postMessage({ command: 'openDebugHelp' });
                    }}
                  >
                    查看说明
                  </a>
                </div>
                <input
                  type="number"
                  id="debugPort"
                  value={config.debugPort ?? 9229}
                  onChange={(e) => updateConfig({ debugPort: parseInt(e.target.value || '9229', 10) })}
                />
                <div className="help-text">
                  调试器监听端口，需与服务器属性 sks.autoscript.debug.port 一致（默认 9229）
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="debugHostname">调试主机名（可选）</label>
                <input
                  type="text"
                  id="debugHostname"
                  placeholder="留空按服务器地址解析；端口转发填 127.0.0.1"
                  value={config.debugHostname || ''}
                  onChange={(e) => updateConfig({ debugHostname: e.target.value })}
                />
                <div className="help-text">
                  OCP/SSH 端口转发场景填 127.0.0.1，如 oc port-forward svc/... 30471:30471
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--vscode-button-secondaryBackground)',
                      color: 'var(--vscode-button-secondaryForeground)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (!confirmDeactivate) {
                        setConfirmDeactivate(true);
                        setTimeout(() => setConfirmDeactivate(false), 3000);
                      } else {
                        setConfirmDeactivate(false);
                        getVsCodeApi().postMessage({ command: 'debugManualDeactivate' });
                      }
                    }}
                  >
                    {confirmDeactivate ? '再次点击确认停用' : '手动停用调试驱动'}
                  </button>
                  <small style={{ color: 'var(--vscode-descriptionForeground)' }}>
                    特殊情况手动调用接口停用驱动（POST script/SKS.AUTOSCRIPT.DEBUG, 请求体 deactivate=true）
                  </small>
                </div>
              </div>
            </div>

            {connectionResult.type && (
              <div style={{ 
                padding: '10px', 
                marginBottom: '15px', 
                borderRadius: '4px',
                background: connectionResult.type === 'success' ? 'var(--vscode-terminal-ansiGreen)' : 'var(--vscode-terminal-ansiRed)',
                color: 'white'
              }}>
                {connectionResult.type === 'success' ? '✅ ' : '❌ '}
                <span dangerouslySetInnerHTML={{ __html: connectionResult.text }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleTestConnection} style={{ flex: 1 }}>测试连接</button>
              <button onClick={handleViewUserInfo} style={{ flex: 1, backgroundColor: 'var(--vscode-button-secondaryBackground)', color: 'var(--vscode-button-secondaryForeground)' }}>查看用户语言信息</button>
            </div>
          </div>
        )}

        {activeSection === 'completion' && (
          <div className="section active">
            <h2>补全设置</h2>
            
            <div className="form-group">
              <div style={{ 
                padding: '15px', 
                background: 'var(--vscode-textBlockQuote-background)',
                borderLeft: '4px solid var(--vscode-textLink-foreground)',
                borderRadius: '4px'
              }}>
                <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>💡 如何关闭插件补全？</p>
                <p style={{ margin: '0 0 10px 0' }}>
                  如果您想使用 VSCode 内置的智能感知而不是插件提供的补全，请点击编辑器右下角的<strong>"补全模式"</strong>状态栏项，将其切换为<strong>"VSCode 模式"</strong>。
                </p>
                <p style={{ margin: 0, fontSize: '0.9em', opacity: 0.8 }}>
                  切换后，插件将不再提供代码补全建议，您可以完全依赖 VSCode 的原生补全功能。
                </p>
              </div>
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="enableJSDocParsing"
                  checked={config.enableJSDocParsing}
                  onChange={(e) => updateConfig({ enableJSDocParsing: e.target.checked })}
                />
                <label htmlFor="enableJSDocParsing" style={{ margin: 0 }}>启用 JSDoc 解析</label>
              </div>
              <div className="help-text">
                从 JSDoc 注释中提取类型信息和文档
              </div>
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="enableTypeInference"
                  checked={config.enableTypeInference}
                  onChange={(e) => updateConfig({ enableTypeInference: e.target.checked })}
                />
                <label htmlFor="enableTypeInference" style={{ margin: 0 }}>启用类型推断</label>
              </div>
              <div className="help-text">
                自动推断变量和函数的类型
              </div>
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="autoGenerateReflectionApi"
                  checked={config.autoGenerateReflectionApi || false}
                  onChange={(e) => updateConfig({ autoGenerateReflectionApi: e.target.checked })}
                />
                <label htmlFor="autoGenerateReflectionApi" style={{ margin: 0 }}>自动生成反射API</label>
              </div>
              <div className="help-text">
                开启后，当检测到 Java 类型时，会自动调用 Maximo 接口获取反射信息并生成本地类型定义文件
                （需要 Maximo 系统中已部署 SKS_REFLECT_HELPER 脚本）
              </div>
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="autoGenerateReflectionApiLocal"
                  checked={config.autoGenerateReflectionApiLocal || false}
                  onChange={(e) => updateConfig({ autoGenerateReflectionApiLocal: e.target.checked })}
                />
                <label htmlFor="autoGenerateReflectionApiLocal" style={{ margin: 0 }}>自动通过本地jar生成反射API</label>
              </div>
              <div className="help-text">
                当 Maximo 接口失败时作为降级方案，使用本地 JAR 包反射获取类信息
                （需要配置 JDK 路径和 JAR 包目录）
              </div>
            </div>

            <div className="form-group">
              <label>本地 API 文档路径(弃用)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={config.localApiPath}
                  disabled={true}
                  onChange={(e) => updateConfig({ localApiPath: e.target.value })}
                  placeholder="选择包含 API 文档的目录"
                  style={{ flex: 1 }}
                />
              </div>
              <div className="help-text">
                用于加载本地 Maximo API 文档以提供更准确的补全建议
              </div>
            </div>

            <div className="form-group">
              <label>JDK 安装路径</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={config.jdkPath}
                  onChange={(e) => updateConfig({ jdkPath: e.target.value })}
                  placeholder="例如: C:\\Program Files\\Java\\jdk-11"
                  style={{ flex: 1 }}
                />
                <button 
                  onClick={() => {
                    getVsCodeApi().postMessage({ command: 'selectJdk' });
                  }}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  选择 JDK
                </button>
              </div>
              <div className="help-text">
                用于反射获取 Java 类的详细信息（可选）
              </div>
            </div>

            <div className="form-group">
              <label>JAR 目录配置（用于实时反射）</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <input 
                  type="text" 
                  id="jarDirectoryInput" 
                  placeholder="例如: E:/maximo/lib" 
                  style={{ flex: 1 }}
                />
                <button onClick={handleAddJarDirectory} style={{ whiteSpace: 'nowrap' }}>➕ 添加目录</button>
              </div>
              <div style={{ background: 'var(--vscode-input-background)', padding: '10px', borderRadius: '4px', minHeight: '50px' }}>
                {config.jarDirectories.length === 0 ? (
                  <div style={{ color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' }}>暂无配置的 JAR 目录</div>
                ) : (
                  config.jarDirectories.map((dir, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--vscode-panel-border)' }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={dir}>{dir}</span>
                      <button onClick={() => handleRemoveJarDirectory(index)} style={{ marginLeft: '10px', padding: '2px 8px', cursor: 'pointer' }}>❌ 删除</button>
                    </div>
                  ))
                )}
              </div>
              <div className="help-text">添加 Maximo JAR 文件所在目录，插件将尝试通过 Java 反射获取真实的 API 信息</div>
            </div>

            <div className="form-group">
              <label>添加单个 JAR 文件</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <input 
                  type="text" 
                  id="singleJarInput" 
                  placeholder="例如: E:/maximo/lib/businessobject.jar" 
                  style={{ flex: 1 }}
                />
                <button onClick={handleSelectSingleJar} style={{ whiteSpace: 'nowrap' }}>📁 选择文件</button>
                <button onClick={handleAddSingleJar} style={{ whiteSpace: 'nowrap' }}>➕ 添加</button>
              </div>
              <div style={{ background: 'var(--vscode-input-background)', padding: '10px', borderRadius: '4px', minHeight: '50px' }}>
                {config.additionalJars.length === 0 ? (
                  <div style={{ color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' }}>暂无添加的 JAR 文件</div>
                ) : (
                  config.additionalJars.map((jar, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--vscode-panel-border)' }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={jar}>{jar}</span>
                      <button onClick={() => handleRemoveJarDirectory(index)} style={{ marginLeft: '10px', padding: '2px 8px', cursor: 'pointer' }}>❌ 删除</button>
                    </div>
                  ))
                )}
              </div>
              <div className="help-text">添加单个 JAR 文件，用于精确控制需要反射的 JAR 文件</div>
            </div>

            {/* 保存提醒 */}
            {hasChanges && (
              <div style={{ 
                color: 'var(--vscode-errorForeground)', 
                backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
                border: '1px solid var(--vscode-inputValidation-errorBorder)',
                padding: '8px 12px',
                borderRadius: '4px',
                marginBottom: '12px',
                fontSize: '13px'
              }}>
                ⚠️ 有未保存的配置变更
              </div>
            )}

            <button onClick={handleSave}>保存配置</button>
          </div>
        )}

        {activeSection === 'other' && (
          <div className="section active">
            <h2>其它配置</h2>
            
            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="enableHttpLog"
                  checked={config.enableHttpLog}
                  onChange={(e) => updateConfig({ enableHttpLog: e.target.checked })}
                />
                <label htmlFor="enableHttpLog" style={{ margin: 0 }}>启用 HTTP 请求日志保存</label>
              </div>
              <div className="help-text">
                自动生成 IntelliJ IDEA HTTP Client 格式的 .http 文件到临时目录（开发调试时使用）
              </div>
            </div>

            <div className="form-group">
              <label>脚本存放目录</label>
              <input
                type="text"
                value={config.scriptStoragePath}
                onChange={(e) => updateConfig({ scriptStoragePath: e.target.value })}
                placeholder="masscript"
              />
              <div className="help-text">
                用于存储从 Maximo 导出的脚本文件，默认为项目根目录下的 masscript 文件夹
              </div>
            </div>

            <div className="form-group">
              <label>别名（Alias Name）</label>
              <input
                type="text"
                value={config.aliasName}
                onChange={(e) => updateConfig({ aliasName: e.target.value })}
                placeholder="请输入别名"
              />
              <div className="help-text">
                用于推送脚本时保存历史记录的别名字段
              </div>
            </div>
          </div>
        )}

        {activeSection === 'toolbox' && (
          <div className="section active">
            <h2>工具箱</h2>
            
            {/* 标签页导航 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px', borderBottom: '2px solid var(--vscode-panel-border)', paddingBottom: '10px' }}>
              <button
                onClick={() => setActiveToolboxTab('init')}
                style={{
                  padding: '6px 10px',
                  whiteSpace: 'nowrap',
                  background: activeToolboxTab === 'init' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'init' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'init' ? 'bold' : 'normal'
                }}
              >
                🚀 初始化脚本
              </button>
              <button
                onClick={() => setActiveToolboxTab('clear')}
                style={{
                  padding: '6px 10px',
                  whiteSpace: 'nowrap',
                  background: activeToolboxTab === 'clear' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'clear' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'clear' ? 'bold' : 'normal'
                }}
              >
                🗑️ 清理脚本
              </button>
              <button
                onClick={() => setActiveToolboxTab('deploy')}
                style={{
                  padding: '6px 10px',
                  whiteSpace: 'nowrap',
                  background: activeToolboxTab === 'deploy' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'deploy' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'deploy' ? 'bold' : 'normal'
                }}
              >
                📤 导入脚本
              </button>
              <button
                onClick={() => setActiveToolboxTab('extract')}
                style={{
                  padding: '6px 10px',
                  whiteSpace: 'nowrap',
                  background: activeToolboxTab === 'extract' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'extract' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'extract' ? 'bold' : 'normal'
                }}
              >
                📥 导出脚本
              </button>
              <button
                onClick={() => setActiveToolboxTab('extractXml')}
                style={{
                  padding: '6px 10px',
                  whiteSpace: 'nowrap',
                  background: activeToolboxTab === 'extractXml' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'extractXml' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'extractXml' ? 'bold' : 'normal'
                }}
              >
                📦 导出应用XML
              </button>
              <button
                onClick={() => setActiveToolboxTab('extractMaxobject')}
                style={{
                  padding: '6px 10px',
                  whiteSpace: 'nowrap',
                  background: activeToolboxTab === 'extractMaxobject' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'extractMaxobject' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'extractMaxobject' ? 'bold' : 'normal'
                }}
              >
                🗄️ 导出MAXOBJECT
              </button>
              <button
                onClick={() => setActiveToolboxTab('extractMessage')}
                style={{
                  padding: '6px 10px',
                  whiteSpace: 'nowrap',
                  background: activeToolboxTab === 'extractMessage' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'extractMessage' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'extractMessage' ? 'bold' : 'normal'
                }}
              >
                💬 导出消息
              </button>
              <button
                onClick={() => setActiveToolboxTab('extractDomain')}
                style={{
                  padding: '6px 10px',
                  whiteSpace: 'nowrap',
                  background: activeToolboxTab === 'extractDomain' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'extractDomain' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'extractDomain' ? 'bold' : 'normal'
                }}
              >
                🏷️ 导出域
              </button>
              <button
                onClick={() => setActiveToolboxTab('extractCondition')}
                style={{
                  padding: '6px 10px',
                  whiteSpace: 'nowrap',
                  background: activeToolboxTab === 'extractCondition' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'extractCondition' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'extractCondition' ? 'bold' : 'normal'
                }}
              >
                🧪 条件表达式管理器导出
              </button>
              <button
                onClick={() => setActiveToolboxTab('initProject')}
                style={{
                  padding: '6px 10px',
                  whiteSpace: 'nowrap',
                  background: activeToolboxTab === 'initProject' ? 'var(--vscode-button-background)' : 'transparent',
                  color: activeToolboxTab === 'initProject' ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: activeToolboxTab === 'initProject' ? 'bold' : 'normal'
                }}
              >
                🛠️ 初始化当前项目
              </button>
            </div>

            {/* 初始化当前项目标签页 */}
            {activeToolboxTab === 'initProject' && (
              <div>
                <div style={{ 
                  padding: '15px', 
                  background: 'var(--vscode-textBlockQuote-background)',
                  borderLeft: '4px solid var(--vscode-terminal-ansiGreen)',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>🛠️ 初始化当前项目 TypeScript 配置</p>
                  <p style={{ margin: '0 0 10px 0' }}>
                    为当前工作区初始化 TypeScript 开发环境配置文件（如 <code>tsconfig.json</code>、<code>.vscode/settings.json</code> 等）。
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--vscode-descriptionForeground)' }}>
                    💡 <strong>说明：</strong>如果项目中已存在相关配置文件，将<strong>跳过</strong>（不会覆盖或修改）；仅当配置文件不存在时才会自动创建。
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  <button 
                    onClick={() => {
                      getVsCodeApi().postMessage({ command: 'initProject' });
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    🛠️ 初始化项目配置
                  </button>
                  <button 
                    onClick={() => {
                      getVsCodeApi().postMessage({ command: 'openConfigDir' });
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      cursor: 'pointer',
                      background: 'var(--vscode-button-secondaryBackground)',
                      color: 'var(--vscode-button-secondaryForeground)',
                      border: 'none',
                      borderRadius: '4px'
                    }}
                  >
                    📂 查看配置模板
                  </button>
                </div>

                <div style={{ 
                  padding: '15px',
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '0.95em' }}>📋 配置模板目录结构</p>
                  <pre style={{ 
                    margin: 0,
                    padding: '10px',
                    background: 'var(--vscode-textCodeBlock-background)',
                    borderRadius: '4px',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontSize: '0.9em'
                  }}>
{`public/config/
├── .vscode/
│   └── settings.json    # VSCode 编辑器配置
└── tsconfig.json        # TypeScript 编译配置`}
                  </pre>
                </div>
              </div>
            )}

            {/* 初始化脚本标签页 */}
            {activeToolboxTab === 'init' && (
              <div>
                <div style={{ 
                  padding: '15px', 
                  background: 'var(--vscode-textBlockQuote-background)',
                  borderLeft: '4px solid var(--vscode-textLink-foreground)',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>🚀 初始化工具脚本</p>
                  <p style={{ margin: 0 }}>
                    一键部署所有 Maximo 开发工具脚本到服务器，包括：自动脚本安装、提取、日志查看等工具。
                  </p>
                </div>

                <button 
                  onClick={handleInitScripts}
                  disabled={isInitRunning || isClearRunning || isDeployRunning}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '20px',
                    opacity: (isInitRunning || isClearRunning || isDeployRunning) ? 0.6 : 1,
                    cursor: (isInitRunning || isClearRunning || isDeployRunning) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isInitRunning ? '⏳ 正在初始化...' : '🚀 开始初始化'}
                </button>

                {/* 输出日志区域 */}
                <div style={{ 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  padding: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>📋 部署进度</span>
                    <button 
                      onClick={handleClearToolboxOutput}
                      style={{ padding: '4px 12px', fontSize: '0.9em' }}
                    >
                      清空
                    </button>
                  </div>
                  <pre style={{ 
                    margin: 0,
                    padding: '10px',
                    background: 'var(--vscode-textCodeBlock-background)',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontSize: '0.9em'
                  }}>
                    {toolboxOutput || '准备就绪，点击“开始初始化”按钮...'}
                  </pre>
                </div>
              </div>
            )}

            {/* 清除脚本标签页 */}
            {activeToolboxTab === 'clear' && (
              <div>
                <div style={{ 
                  padding: '15px', 
                  background: 'var(--vscode-textBlockQuote-background)',
                  borderLeft: '4px solid var(--vscode-errorForeground)',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: 'var(--vscode-errorForeground)' }}>⚠️ 警告：危险操作</p>
                  <p style={{ margin: '0 0 10px 0' }}>
                    此功能将从 Maximo 服务器上删除指定的自动化脚本。
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--vscode-descriptionForeground)' }}>
                    📌 <strong>使用说明：</strong><br/>
                    1. 准备一个 JSON 文件，包含要删除的脚本名称列表<br/>
                    2. JSON 格式：<code>["script1", "script2", "script3"]</code><br/>
                    3. 示例：demo/delete.json<br/>
                    4. 点击“选择 JSON 文件”按钮选择文件<br/>
                    5. 点击“开始清除”按钮执行删除
                  </p>
                </div>

                {/* JSON 文件选择 */}
                <div className="form-group">
                  <label>选择脚本列表 JSON 文件：</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={deleteJsonPath}
                      readOnly
                      placeholder="选择包含脚本名称列表的 JSON 文件"
                      style={{ flex: 1 }}
                    />
                    <button onClick={handleSelectDeleteJson} style={{ whiteSpace: 'nowrap' }}>📄 选择文件</button>
                  </div>
                </div>

                <button 
                  id="clearScriptsButton"
                  disabled={!deleteJsonPath || isInitRunning || isClearRunning || isDeployRunning}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '10px',
                    background: !deleteJsonPath ? 'var(--vscode-disabledForeground)' : '#c42b1c',
                    color: 'white',
                    opacity: (!deleteJsonPath || isInitRunning || isClearRunning || isDeployRunning) ? 0.6 : 1,
                    cursor: (!deleteJsonPath || isInitRunning || isClearRunning || isDeployRunning) ? 'not-allowed' : 'pointer',
                    position: 'relative',
                    zIndex: 100
                  }}
                >
                  {!deleteJsonPath ? '⚠️ 请先选择 JSON 文件' : (isClearRunning ? '⏳ 正在清除...' : '🗑️ 开始清除')}
                </button>

                {/* 调试信息 */}
                <div style={{ 
                  padding: '10px', 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontSize: '0.85em'
                }}>
                  <strong>🔍 调试信息：</strong><br/>
                  deleteJsonPath: {deleteJsonPath || '(空)'}<br/>
                  isInitRunning: {isInitRunning.toString()}<br/>
                  isClearRunning: {isClearRunning.toString()}<br/>
                  isDeployRunning: {isDeployRunning.toString()}<br/>
                  disabled: {(!deleteJsonPath || isInitRunning || isClearRunning || isDeployRunning).toString()}
                </div>

                {/* 输出日志区域 */}
                <div style={{ 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  padding: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>📋 清除进度</span>
                    <button 
                      onClick={handleClearToolboxOutput}
                      style={{ padding: '4px 12px', fontSize: '0.9em' }}
                    >
                      清空
                    </button>
                  </div>
                  <pre style={{ 
                    margin: 0,
                    padding: '10px',
                    background: 'var(--vscode-textCodeBlock-background)',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontSize: '0.9em'
                  }}>
                    {toolboxOutput || '准备就绪，请选择 JSON 文件并点击“开始清除”按钮...'}
                  </pre>
                </div>
              </div>
            )}

            {/* 导入脚本标签页 */}
            {activeToolboxTab === 'deploy' && (
              <div>
                <div style={{ 
                  padding: '15px', 
                  background: 'var(--vscode-textBlockQuote-background)',
                  borderLeft: '4px solid var(--vscode-textLink-foreground)',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>📤 导入脚本</p>
                  <p style={{ margin: 0 }}>
                    将本地的脚本配置文件（JSON格式）部署到 Maximo 服务器。支持单文件和批量目录部署。
                  </p>
                </div>

                {/* 部署模式选择 */}
                <div className="form-group">
                  <label>部署模式：</label>
                  <select
                    value={deployMode}
                    onChange={(e) => setDeployMode(e.target.value as 'file' | 'directory')}
                  >
                    <option value="file">单个文件</option>
                    <option value="directory">整个目录</option>
                  </select>
                </div>

                {/* 文件选择 */}
                {deployMode === 'file' && (
                  <div className="form-group">
                    <label>选择文件：</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={deployFilePath}
                        readOnly
                        placeholder="选择要部署的 JSON 配置文件"
                        style={{ flex: 1 }}
                      />
                      <button onClick={handleSelectDeployFile} style={{ whiteSpace: 'nowrap' }}>
                        📄 选择文件
                      </button>
                    </div>
                  </div>
                )}

                {/* 目录选择 */}
                {deployMode === 'directory' && (
                  <div>
                    <div className="form-group">
                      <label>选择目录：</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                          type="text"
                          value={deployDirectoryPath}
                          readOnly
                          placeholder="选择包含 JSON 配置文件的目录"
                          style={{ flex: 1 }}
                        />
                        <button onClick={handleSelectDeployDirectory} style={{ whiteSpace: 'nowrap' }}>
                          📁 选择目录
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="checkbox-group">
                        <input
                          type="checkbox"
                          id="deployRecursive"
                          checked={deployRecursive}
                          onChange={(e) => setDeployRecursive(e.target.checked)}
                        />
                        <label htmlFor="deployRecursive" style={{ margin: 0 }}>递归子目录</label>
                      </div>
                      <div className="help-text">
                        同时部署子目录中的脚本配置文件
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleStartDeploy}
                  disabled={isDeployRunning}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '20px',
                    opacity: isDeployRunning ? 0.6 : 1,
                    cursor: isDeployRunning ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isDeployRunning ? '⏳ 正在导入...' : '📤 开始导入'}
                </button>

                {/* 输出日志区域 */}
                <div style={{ 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  padding: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>📋 输出信息</span>
                    <button 
                      onClick={handleClearToolboxOutput}
                      style={{ padding: '4px 12px', fontSize: '0.9em' }}
                    >
                      清空
                    </button>
                  </div>
                  <pre style={{ 
                    margin: 0,
                    padding: '10px',
                    background: 'var(--vscode-textCodeBlock-background)',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontSize: '0.9em'
                  }}>
                    {toolboxOutput || '准备就绪，点击“开始导入”按钮...'}
                  </pre>
                </div>
              </div>
            )}

            {/* 导出脚本标签页 */}
            {activeToolboxTab === 'extract' && (
              <div>
                <div style={{ 
                  padding: '15px', 
                  background: 'var(--vscode-textBlockQuote-background)',
                  borderLeft: '4px solid var(--vscode-button-background)',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>📥 导出 Maximo 脚本</p>
                  <p style={{ margin: '0 0 10px 0' }}>
                    此功能将从 Maximo 服务器上获取所有自动化脚本，并保存到本地目录。
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--vscode-descriptionForeground)' }}>
                    📌 <strong>使用说明：</strong><br/>
                    1. 选择要保存脚本的本地目录<br/>
                    2. 点击“开始导出”按钮<br/>
                    3. 等待导出完成，所有脚本将保存为 .js 或 .py 文件
                  </p>
                </div>

                {/* 导出目录选择 */}
                <div className="form-group">
                  <label>选择导出目录：</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={extractDirectoryPath}
                      readOnly
                      placeholder="选择要保存脚本的目录"
                      style={{ flex: 1 }}
                    />
                    <button onClick={handleSelectExtractDirectory} style={{ whiteSpace: 'nowrap' }}>📁 选择目录</button>
                  </div>
                </div>

                {/* 选项配置 */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!config.autoCreateExportDir}
                      onChange={(e) => updateConfig({ autoCreateExportDir: !e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>不自动生成导出目录（直接保存到选择的目录）</span>
                  </label>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                    {!config.autoCreateExportDir 
                      ? '✅ 直接保存到选择的目录，按包名结构组织（如：com/example/）'
                      : '⚠️ 将创建时间戳子目录 + 按包名结构组织（如：autoscript_backup_20260523_143025/com/example/）'}
                  </p>
                </div>

                {/* 并发线程数配置 */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🔄 导出线程数：</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.extractThreadCount}
                      onChange={(e) => updateConfig({ extractThreadCount: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
                      style={{ width: '80px', textAlign: 'center' }}
                    />
                  </label>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                    并发导出脚本数（范围 1~20，推荐 5~10）
                  </p>
                </div>

                {/* 打包ZIP选项 */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.extractZipEnabled}
                      onChange={(e) => updateConfig({ extractZipEnabled: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>📦 导出完成后自动打包为ZIP</span>
                  </label>
                </div>

                <button 
                  onClick={handleStartExtract}
                  disabled={!extractDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '20px',
                    opacity: (!extractDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning) ? 0.6 : 1,
                    cursor: (!extractDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {!extractDirectoryPath ? '⚠️ 请先选择导出目录' : (isExtractRunning ? '⏳ 正在导出...' : '📥 开始导出')}
                </button>

                {/* 输出日志区域 */}
                <div style={{ 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  padding: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>📋 输出信息</span>
                    <button 
                      onClick={handleClearToolboxOutput}
                      style={{ padding: '4px 12px', fontSize: '0.9em' }}
                    >
                      清空
                    </button>
                  </div>
                  <pre style={{ 
                    margin: 0,
                    padding: '10px',
                    background: 'var(--vscode-textCodeBlock-background)',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontSize: '0.9em'
                  }}>
                    {toolboxOutput || '准备就绪，请选择导出目录并点击“开始导出”按钮...'}
                  </pre>
                </div>
              </div>
            )}

            {/* 导出应用XML标签页 */}
            {activeToolboxTab === 'extractXml' && (
              <div>
                <div style={{ 
                  padding: '15px', 
                  background: 'var(--vscode-textBlockQuote-background)',
                  borderLeft: '4px solid var(--vscode-terminal-ansiYellow)',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>📦 导出 Maximo 应用 XML</p>
                  <p style={{ margin: '0 0 10px 0' }}>
                    此功能将从 Maximo 服务器导出应用界面配置（Presentation XML），保存到本地目录。
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--vscode-descriptionForeground)' }}>
                    📌 <strong>使用说明：</strong><br/>
                    1. 选择要保存 XML 的本地目录<br/>
                    2. 可选勾选“生成备份目录”以创建带时间戳的子目录<br/>
                    3. 点击“开始导出”按钮<br/>
                    4. 等待导出完成，所有应用配置将保存为 .xml 文件
                  </p>
                </div>

                {/* 导出目录选择 */}
                <div className="form-group">
                  <label>选择导出目录：</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={extractXmlDirectoryPath}
                      readOnly
                      placeholder="选择要保存应用 XML 的目录"
                      style={{ flex: 1 }}
                    />
                    <button onClick={handleSelectExtractXmlDirectory} style={{ whiteSpace: 'nowrap' }}>📁 选择目录</button>
                  </div>
                </div>

                {/* 选项配置 */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!config.autoCreateExportDir}
                      onChange={(e) => updateConfig({ autoCreateExportDir: !e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>不自动生成导出目录（直接保存到选择的目录）</span>
                  </label>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                    {!config.autoCreateExportDir 
                      ? '✅ 直接保存到选择的目录'
                      : '⚠️ 将创建时间戳子目录（如：app_xml_backup_20260523_143025/）'}
                  </p>
                </div>

                {/* 并发线程数配置 */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🔄 导出线程数：</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.extractXmlThreadCount}
                      onChange={(e) => updateConfig({ extractXmlThreadCount: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
                      style={{ width: '80px', textAlign: 'center' }}
                    />
                  </label>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                    并发导出应用XML数（范围 1~20，推荐 5~10）
                  </p>
                </div>

                {/* 打包ZIP选项 */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.extractXmlZipEnabled}
                      onChange={(e) => updateConfig({ extractXmlZipEnabled: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>📦 导出完成后自动打包为ZIP</span>
                  </label>
                </div>

                <button 
                  onClick={handleStartExtractXml}
                  disabled={!extractXmlDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '20px',
                    opacity: (!extractXmlDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning) ? 0.6 : 1,
                    cursor: (!extractXmlDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {!extractXmlDirectoryPath ? '⚠️ 请先选择导出目录' : (isExtractXmlRunning ? '⏳ 正在导出...' : '📦 开始导出')}
                </button>

                {/* 输出日志区域 */}
                <div style={{ 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  padding: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>📋 输出信息</span>
                    <button 
                      onClick={handleClearToolboxOutput}
                      style={{ padding: '4px 12px', fontSize: '0.9em' }}
                    >
                      清空
                    </button>
                  </div>
                  <pre style={{ 
                    margin: 0,
                    padding: '10px',
                    background: 'var(--vscode-textCodeBlock-background)',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontSize: '0.9em'
                  }}>
                    {toolboxOutput || '准备就绪，请选择导出目录并点击“开始导出”按钮...'}
                  </pre>
                </div>
              </div>
            )}

            {/* 导出MAXOBJECT标签页 */}
            {activeToolboxTab === 'extractMaxobject' && (
              <div>
                <div style={{ 
                  padding: '15px', 
                  background: 'var(--vscode-textBlockQuote-background)',
                  borderLeft: '4px solid var(--vscode-terminal-ansiCyan)',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>🗄️ 导出 MAXOBJECT</p>
                  <p style={{ margin: '0 0 10px 0' }}>
                    此功能将从 Maximo 服务器导出数据库对象配置（DBCONFIG），保存为 JSON 文件到本地目录。
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--vscode-descriptionForeground)' }}>
                    📌 <strong>使用说明：</strong><br/>
                    1. 选择要保存 JSON 的本地目录<br/>
                    2. 可选勾选“不自动生成导出目录”<br/>
                    3. 点击“打开配置文件”可编辑导出过滤配置<br/>
                    4. 点击“开始导出”按钮，使用多线程并发导出
                  </p>
                </div>

                {/* 导出目录选择 */}
                <div className="form-group">
                  <label>选择导出目录：</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={extractMaxobjectDirectoryPath}
                      readOnly
                      placeholder="选择要保存 MAXOBJECT JSON 的目录"
                      style={{ flex: 1 }}
                    />
                    <button onClick={handleSelectExtractMaxobjectDirectory} style={{ whiteSpace: 'nowrap' }}>📁 选择目录</button>
                  </div>
                </div>

                {/* 选项配置 */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!config.autoCreateExportDir}
                      onChange={(e) => updateConfig({ autoCreateExportDir: !e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>不自动生成导出目录（直接保存到选择的目录）</span>
                  </label>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                    {!config.autoCreateExportDir 
                      ? '✅ 直接保存到选择的目录'
                      : '⚠️ 将创建时间戳子目录（如：maxobject_backup_20260523_143025/）'}
                  </p>
                </div>

                {/* 并发线程数配置 */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🔄 导出线程数：</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.extractMaxobjectThreadCount}
                      onChange={(e) => updateConfig({ extractMaxobjectThreadCount: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
                      style={{ width: '80px', textAlign: 'center' }}
                    />
                  </label>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                    并发导出MAXOBJECT数（范围 1~20，推荐 5~10）
                  </p>
                </div>

                {/* 打包ZIP选项 */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.extractMaxobjectZipEnabled}
                      onChange={(e) => updateConfig({ extractMaxobjectZipEnabled: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>📦 导出完成后自动打包为ZIP</span>
                  </label>
                </div>

                {/* 精简/完整模式开关 */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.maxobjectSimpleMode}
                      onChange={(e) => updateConfig({ maxobjectSimpleMode: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>🔧 精简模式（开启后导出时忽略默认值字段）</span>
                  </label>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                    {config.maxobjectSimpleMode 
                      ? '✅ 精简模式已开启，导出时将忽略默认值字段'
                      : '💡 完整模式（默认），导出时将包含所有字段'}
                  </p>
                </div>

                {/* 打开配置文件按钮 */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <button 
                    onClick={handleOpenMaxobjectConfig}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: 'var(--vscode-button-secondaryBackground)',
                      color: 'var(--vscode-button-secondaryForeground)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    📝 打开导出配置文件
                  </button>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                    编辑配置文件可设置 onlyInclude、includeMaxobjects、ignoreMaxobjects 等过滤选项
                  </p>
                </div>

                <button 
                  onClick={handleStartExtractMaxobject}
                  disabled={!extractMaxobjectDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning || isExtractMaxobjectRunning}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '20px',
                    opacity: (!extractMaxobjectDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning || isExtractMaxobjectRunning) ? 0.6 : 1,
                    cursor: (!extractMaxobjectDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning || isExtractMaxobjectRunning) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {!extractMaxobjectDirectoryPath ? '⚠️ 请先选择导出目录' : (isExtractMaxobjectRunning ? '⏳ 正在导出...' : '🗄️ 开始导出')}
                </button>

                {/* 输出日志区域 */}
                <div style={{ 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  padding: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold' }}>📋 输出信息</span>
                    <button 
                      onClick={handleClearToolboxOutput}
                      style={{ padding: '4px 12px', fontSize: '0.9em' }}
                    >
                      清空
                    </button>
                  </div>
                  <pre style={{ 
                    margin: 0,
                    padding: '10px',
                    background: 'var(--vscode-textCodeBlock-background)',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    fontSize: '0.9em'
                  }}>
                    {toolboxOutput || '准备就绪，请选择导出目录并点击“开始导出”按钮...'}
                  </pre>
                </div>
             </div>
            )}

        {/* 消息导出标签页 */}
        {activeToolboxTab === 'extractMessage' && (
          <div>
            <div style={{ 
              padding: '15px', 
              background: 'var(--vscode-textBlockQuote-background)',
              borderLeft: '4px solid var(--vscode-terminal-ansiCyan)',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>💬 导出 MAXMESSAGES 消息</p>
              <p style={{ margin: '0 0 10px 0' }}>
                此功能将通过 SKS_EXPORT_MESSAGES 接口从 Maximo 服务器导出消息（MAXMESSAGES），支持分页导出为多个 JSON 文件。
              </p>
              <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--vscode-descriptionForeground)' }}>
                📌 <strong>使用说明：</strong><br/>
                1. 选择要保存消息 JSON 的本地目录<br/>
                2. 设置单文件行数（分页大小），根据分页查询导出多个文件<br/>
                3. 可选勾选忽略默认值（简化 JSON）<br/>
                4. 点击"开始导出"按钮
              </p>
            </div>

            {/* 导出目录选择 */}
            <div className="form-group">
              <label>选择导出目录：</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={extractMessageDirectoryPath}
                  readOnly
                  placeholder="选择要保存消息 JSON 的目录"
                  style={{ flex: 1 }}
                />
                <button onClick={handleSelectExtractMessageDirectory} style={{ whiteSpace: 'nowrap' }}>📁 选择目录</button>
              </div>
            </div>

            {/* 分页大小配置 */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📄 单文件行数（分页大小）：</span>
                <input
                  type="number"
                  min="100"
                  max="50000"
                  value={config.exportMessagePageSize}
                  onChange={(e) => updateConfig({ exportMessagePageSize: Math.max(100, Math.min(50000, parseInt(e.target.value) || 5000)) })}
                  style={{ width: '100px', textAlign: 'center' }}
                />
              </label>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                每个 JSON 文件包含的消息条数（范围 100~50000，根据导出结果分页生成多个文件）
              </p>
            </div>

            {/* 忽略默认值选项 */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.exportMessageIgnoreDefVal}
                  onChange={(e) => updateConfig({ exportMessageIgnoreDefVal: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span>🔧 忽略默认值（简化 JSON）</span>
              </label>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                {config.exportMessageIgnoreDefVal 
                  ? '✅ 精简模式已开启，导出时将忽略默认值字段'
                  : '💡 完整模式（默认），导出时将包含所有字段'}
              </p>
            </div>

            {/* 并发线程数配置 */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔄 导出线程数：</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.exportMessageThreadCount}
                  onChange={(e) => updateConfig({ exportMessageThreadCount: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
                  style={{ width: '80px', textAlign: 'center' }}
                />
              </label>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                并发导出页数（范围 1~20，推荐 5~10）
              </p>
            </div>

            {/* 打包ZIP选项 */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.exportMessageZipEnabled}
                  onChange={(e) => updateConfig({ exportMessageZipEnabled: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span>📦 导出完成后自动打包为ZIP</span>
              </label>
            </div>

            <button 
              onClick={handleStartExtractMessage}
              disabled={!extractMessageDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning || isExtractMaxobjectRunning || isExtractMessageRunning}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '20px',
                opacity: (!extractMessageDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning || isExtractMaxobjectRunning || isExtractMessageRunning) ? 0.6 : 1,
                cursor: (!extractMessageDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning || isExtractMaxobjectRunning || isExtractMessageRunning) ? 'not-allowed' : 'pointer'
              }}
            >
              {!extractMessageDirectoryPath ? '⚠️ 请先选择导出目录' : (isExtractMessageRunning ? '⏳ 正在导出...' : '💬 开始导出')}
            </button>

            {/* 输出日志区域 */}
            <div style={{ 
              background: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              padding: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>📋 输出信息</span>
                <button 
                  onClick={handleClearToolboxOutput}
                  style={{ padding: '4px 12px', fontSize: '0.9em' }}
                >
                  清空
                </button>
              </div>
              <pre style={{ 
                margin: 0,
                padding: '10px',
                background: 'var(--vscode-textCodeBlock-background)',
                borderRadius: '4px',
                maxHeight: '300px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontSize: '0.9em'
              }}>
                {toolboxOutput || '准备就绪，请选择导出目录并点击"开始导出"按钮...'}
              </pre>
            </div>
          </div>
        )}

        {/* 导出域标签页 */}
        {activeToolboxTab === 'extractDomain' && (
          <div>
            <div style={{ 
              padding: '15px', 
              background: 'var(--vscode-textBlockQuote-background)',
              borderLeft: '4px solid var(--vscode-terminal-ansiCyan)',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>🏷️ 导出 MAXDOMAIN 域定义</p>
              <p style={{ margin: '0 0 10px 0' }}>
                此功能将通过 SKS_EXPORT_DOMAIN 接口从 Maximo 服务器导出域定义（MAXDOMAIN），支持分页导出为多个 JSON 文件，兼容 SKS_DEPLOY_DOMAIN 导入。
              </p>
              <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--vscode-descriptionForeground)' }}>
                📌 <strong>使用说明：</strong><br/>
                1. 选择要保存域 JSON 的本地目录<br/>
                2. 设置单文件行数（分页大小），根据分页查询导出多个文件<br/>
                3. 可选勾选忽略默认值（简化 JSON）<br/>
                4. 点击"开始导出"按钮
              </p>
            </div>

            {/* 导出目录选择 */}
            <div className="form-group">
              <label>选择导出目录：</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={extractDomainDirectoryPath}
                  readOnly
                  placeholder="选择要保存域 JSON 的目录"
                  style={{ flex: 1 }}
                />
                <button onClick={handleSelectExtractDomainDirectory} style={{ whiteSpace: 'nowrap' }}>📁 选择目录</button>
              </div>
            </div>

            {/* 分页大小配置 */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📄 单文件行数（分页大小）：</span>
                <input
                  type="number"
                  min="100"
                  max="50000"
                  value={config.exportDomainPageSize}
                  onChange={(e) => updateConfig({ exportDomainPageSize: Math.max(100, Math.min(50000, parseInt(e.target.value) || 50000)) })}
                  style={{ width: '100px', textAlign: 'center' }}
                />
              </label>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                每个 JSON 文件包含的域定义条数（范围 100~50000，根据导出结果分页生成多个文件）
              </p>
            </div>

            {/* 忽略默认值选项 */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.exportDomainIgnoreDefVal}
                  onChange={(e) => updateConfig({ exportDomainIgnoreDefVal: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span>🔧 忽略默认值（简化 JSON）</span>
              </label>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                {config.exportDomainIgnoreDefVal 
                  ? '✅ 精简模式已开启，导出时将忽略默认值字段'
                  : '💡 完整模式（默认），导出时将包含所有字段'}
              </p>
            </div>

            {/* 并发线程数配置 */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔄 导出线程数：</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.exportDomainThreadCount}
                  onChange={(e) => updateConfig({ exportDomainThreadCount: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) })}
                  style={{ width: '80px', textAlign: 'center' }}
                />
              </label>
              <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                并发导出页数（范围 1~20，推荐 5~10）
              </p>
            </div>

            {/* 打包ZIP选项 */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={config.exportDomainZipEnabled}
                  onChange={(e) => updateConfig({ exportDomainZipEnabled: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <span>📦 导出完成后自动打包为ZIP</span>
              </label>
            </div>

            <button 
              onClick={handleStartExtractDomain}
              disabled={!extractDomainDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning || isExtractMaxobjectRunning || isExtractMessageRunning || isExtractDomainRunning}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '20px',
                opacity: (!extractDomainDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning || isExtractMaxobjectRunning || isExtractMessageRunning || isExtractDomainRunning) ? 0.6 : 1,
                cursor: (!extractDomainDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning || isExtractMaxobjectRunning || isExtractMessageRunning || isExtractDomainRunning) ? 'not-allowed' : 'pointer'
              }}
            >
              {!extractDomainDirectoryPath ? '⚠️ 请先选择导出目录' : (isExtractDomainRunning ? '⏳ 正在导出...' : '🏷️ 开始导出')}
            </button>

            {/* 输出日志区域 */}
            <div style={{ 
              background: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              padding: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>📋 输出信息</span>
                <button 
                  onClick={handleClearToolboxOutput}
                  style={{ padding: '4px 12px', fontSize: '0.9em' }}
                >
                  清空
                </button>
              </div>
              <pre style={{ 
                margin: 0,
                padding: '10px',
                background: 'var(--vscode-textCodeBlock-background)',
                borderRadius: '4px',
                maxHeight: '300px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontSize: '0.9em'
              }}>
                {toolboxOutput || '准备就绪，请选择导出目录并点击"开始导出"按钮...'}
              </pre>
            </div>
          </div>
        )}
        {/* 条件表达式管理器导出标签页 */}
        {activeToolboxTab === 'extractCondition' && (
          <div>
            <div style={{ 
              padding: '15px', 
              background: 'var(--vscode-textBlockQuote-background)',
              borderLeft: '4px solid var(--vscode-terminal-ansiMagenta)',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>🧪 条件表达式管理器导出</p>
              <p style={{ margin: '0 0 10px 0' }}>
                此功能将通过 SKS_CONDITION_MANAGE 接口从 Maximo 服务器导出条件表达式（CONDITION），支持自定义 where 过滤条件。
              </p>
              <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--vscode-descriptionForeground)' }}>
                📌 <strong>使用说明：</strong><br/>
                1. 选择要保存条件表达式 JSON 的本地目录<br/>
                2. 输入 where 过滤条件（SQL 表达式），默认 1=1 导出全部<br/>
                3. 点击"开始导出"按钮，结果为单个 conditions.json 文件，可直接用于 SKS_CONDITION_MANAGE 导入
              </p>
            </div>

            {/* 导出目录选择 */}
            <div className="form-group">
              <label>选择导出目录：</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={extractConditionDirectoryPath}
                  readOnly
                  placeholder="选择要保存条件表达式 JSON 的目录"
                  style={{ flex: 1 }}
                />
                <button onClick={handleSelectExtractConditionDirectory} style={{ whiteSpace: 'nowrap' }}>📁 选择目录</button>
              </div>
            </div>

            {/* where 条件配置（多行文本框） */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: 'var(--vscode-foreground)' }}>
                🔍 where 过滤条件（SQL 表达式）：
              </label>
              <textarea
                value={extractConditionWhere}
                onChange={(e) => {
                  setExtractConditionWhere(e.target.value);
                  updateConfig({ exportConditionWhere: e.target.value });
                }}
                rows={4}
                placeholder="例如: 1=1 或 CONDITIONNUM LIKE 'IBM%'"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '4px',
                  background: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'monospace'
                }}
              />
              <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                支持多行 SQL 表达式，默认 1=1 导出全部条件
              </p>
            </div>

            <button 
              onClick={handleStartExtractCondition}
              disabled={!extractConditionDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning || isExtractMaxobjectRunning || isExtractMessageRunning || isExtractDomainRunning || isExtractConditionRunning}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '20px',
                opacity: (!extractConditionDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning || isExtractMaxobjectRunning || isExtractMessageRunning || isExtractDomainRunning || isExtractConditionRunning) ? 0.6 : 1,
                cursor: (!extractConditionDirectoryPath || isInitRunning || isClearRunning || isDeployRunning || isExtractRunning || isExtractXmlRunning || isExtractMaxobjectRunning || isExtractMessageRunning || isExtractDomainRunning || isExtractConditionRunning) ? 'not-allowed' : 'pointer'
              }}
            >
              {!extractConditionDirectoryPath ? '⚠️ 请先选择导出目录' : (isExtractConditionRunning ? '⏳ 正在导出...' : '🧪 开始导出')}
            </button>

            {/* 输出日志区域 */}
            <div style={{ 
              background: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              padding: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>📋 输出信息</span>
                <button 
                  onClick={handleClearToolboxOutput}
                  style={{ padding: '4px 12px', fontSize: '0.9em' }}
                >
                  清空
                </button>
              </div>
              <pre style={{ 
                margin: 0,
                padding: '10px',
                background: 'var(--vscode-textCodeBlock-background)',
                borderRadius: '4px',
                maxHeight: '300px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontSize: '0.9em'
              }}>
                {toolboxOutput || '准备就绪，请选择导出目录并点击"开始导出"按钮...'}
              </pre>
            </div>
          </div>
        )}          </div>
        )}

        {/* 计划导出页面 */}
        {activeSection === 'scheduledExport' && (
          <div className="section active">
            <h2>📅 计划导出</h2>
            <div style={{ 
              padding: '15px', 
              background: 'var(--vscode-textBlockQuote-background)',
              borderLeft: '4px solid var(--vscode-terminal-ansiGreen)',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 10px 0' }}>
                配置多组导出任务，按顺序执行计划导出。支持变量替换 $&#123;envName&#125;（环境名称）、$&#123;timestamp&#125;（时间戳）、$&#123;datetimeEN&#125;（日期时间格式 yyyyMMdd_HHmmss）。
              </p>
              <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--vscode-descriptionForeground)' }}>
                📌 <strong>使用说明：</strong><br/>
                1. 设置基础导出目录（支持 $&#123;envName&#125; 变量）<br/>
                2. 添加导出任务，配置导出功能、目录、语言等<br/>
                3. 勾选需要执行的任务<br/>
                4. 点击"开始执行"按钮，按顺序执行导出<br/>
                5. 配置会自动保存在 ~/.sks/maximo-script-helper/ 目录下
              </p>
            </div>

            {/* 基础导出目录 */}
            <div className="form-group">
              <label>📁 基础导出目录：</label>
              <input
                type="text"
                value={scheduledExportPlan.baseDir || ''}
                onChange={(e) => {
                  const newPlan = { ...scheduledExportPlan, baseDir: e.target.value };
                  setScheduledExportPlan(newPlan);
                }}
                placeholder="E:/tmp/msh-masbackup/$&#123;envName&#125;"
                style={{ width: '100%' }}
              />
              <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                支持变量: $&#123;envName&#125; - 环境名称, $&#123;timestamp&#125; - 时间戳, $&#123;datetimeEN&#125; - yyyyMMdd_HHmmss
              </p>
            </div>

            {/* 任务列表表格 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>📋 导出任务列表</span>
                <div>
                  <button 
                    onClick={handleAddScheduledTask}
                    style={{ marginRight: '8px', padding: '4px 12px', cursor: 'pointer' }}
                  >
                    ➕ 添加任务
                  </button>
                  <button 
                    onClick={handleSaveScheduledExportConfig}
                    style={{ padding: '4px 12px', cursor: 'pointer', background: 'var(--vscode-button-secondaryBackground)', color: 'var(--vscode-button-secondaryForeground)', border: 'none', borderRadius: '4px' }}
                  >
                    💾 保存配置
                  </button>
                </div>
              </div>

              {/* 表头 */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '40px 150px 1fr 80px 120px 60px 80px 60px 50px',
                gap: '4px',
                padding: '8px 4px',
                background: 'var(--vscode-editor-background)',
                borderBottom: '2px solid var(--vscode-panel-border)',
                fontWeight: 'bold',
                fontSize: '0.9em'
              }}>
                <span style={{ textAlign: 'center' }}>序号</span>
                <span>导出功能</span>
                <span>目录</span>
                <span style={{ textAlign: 'center' }}>语言</span>
                <span style={{ textAlign: 'center' }}>模块配置</span>
                <span style={{ textAlign: 'center' }}>压缩</span>
                <span style={{ textAlign: 'center' }}>线程数</span>
                <span style={{ textAlign: 'center' }}>启用</span>
                <span style={{ textAlign: 'center' }}>删除</span>
              </div>

              {/* 任务行 */}
              {(scheduledExportPlan.tasks || []).map((task: any, index: number) => {
                const taskProgress = scheduledExportTaskProgress[index];
                return (
                <div key={task.id || index}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '40px 150px 1fr 80px 120px 60px 80px 60px 50px',
                  gap: '4px',
                  padding: '6px 4px',
                  borderBottom: '1px solid var(--vscode-panel-border)',
                  alignItems: 'center',
                  fontSize: '0.85em',
                  background: task.enabled ? 'transparent' : 'var(--vscode-inputValidation-warningBackground)'
                }}>
                  <span style={{ textAlign: 'center' }}>{index + 1}</span>
                  <select
                    value={task.exportFunction || ''}
                    onChange={(e) => {
                      const newTasks = [...(scheduledExportPlan.tasks || [])];
                      newTasks[index] = { ...newTasks[index], exportFunction: e.target.value };
                      setScheduledExportPlan({ ...scheduledExportPlan, tasks: newTasks });
                    }}
                    style={{ width: '100%', fontSize: '0.85em' }}
                    disabled={isScheduledExportRunning}
                  >
                    <option value="extractMaxobject">导出 MAXOBJECT</option>
                    <option value="extractMessage">导出消息</option>
                    <option value="extractDomain">导出域</option>
                    <option value="extractCondition">导出条件表达式</option>
                    <option value="extractScript">导出脚本</option>
                    <option value="extractAppXml">导出应用XML</option>
                  </select>
                  <input
                    type="text"
                    value={task.directory || ''}
                    onChange={(e) => {
                      const newTasks = [...(scheduledExportPlan.tasks || [])];
                      newTasks[index] = { ...newTasks[index], directory: e.target.value };
                      setScheduledExportPlan({ ...scheduledExportPlan, tasks: newTasks });
                    }}
                    placeholder="maxobject_backup_$&#123;datetimeEN&#125;_$&#123;lang&#125;"
                    style={{ width: '100%', fontSize: '0.85em' }}
                    disabled={isScheduledExportRunning}
                  />
                  <select
                    value={task.language || 'EN'}
                    onChange={(e) => {
                      const newTasks = [...(scheduledExportPlan.tasks || [])];
                      newTasks[index] = { ...newTasks[index], language: e.target.value };
                      setScheduledExportPlan({ ...scheduledExportPlan, tasks: newTasks });
                    }}
                    style={{ width: '100%', fontSize: '0.85em' }}
                    disabled={isScheduledExportRunning}
                  >
                    {languageOptions.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.code} - {lang.name}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'stretch' }}>
                    {task.exportFunction === 'extractMaxobject' ? (
                      <label style={{ fontSize: '0.75em', color: 'var(--vscode-descriptionForeground)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={task.ignoreDefVal || false}
                          onChange={(e) => {
                            const newTasks = [...(scheduledExportPlan.tasks || [])];
                            newTasks[index] = { ...newTasks[index], ignoreDefVal: e.target.checked };
                            setScheduledExportPlan({ ...scheduledExportPlan, tasks: newTasks });
                          }}
                          disabled={isScheduledExportRunning}
                        />
                        精简模式
                      </label>
                    ) : task.exportFunction === 'extractCondition' ? (
                      <input
                        type="text"
                        value={task.where !== undefined && task.where !== '' ? task.where : '1=1'}
                        onChange={(e) => {
                          const newTasks = [...(scheduledExportPlan.tasks || [])];
                          newTasks[index] = { ...newTasks[index], where: e.target.value };
                          setScheduledExportPlan({ ...scheduledExportPlan, tasks: newTasks });
                        }}
                        placeholder="where，如 1=1"
                        style={{ width: '100%', fontSize: '0.85em', boxSizing: 'border-box' }}
                        disabled={isScheduledExportRunning}
                      />
                    ) : task.exportFunction === 'extractMessage' || task.exportFunction === 'extractDomain' ? (
                      <>
                        <span style={{ fontSize: '0.75em', color: 'var(--vscode-descriptionForeground)', whiteSpace: 'nowrap' }}>单文件行数</span>
                        <input
                          type="number"
                          min="100"
                          max="50000"
                          step="100"
                          value={task.pageSize !== undefined ? task.pageSize : 5000}
                          onChange={(e) => {
                            const newTasks = [...(scheduledExportPlan.tasks || [])];
                            newTasks[index] = { ...newTasks[index], pageSize: Math.max(100, Math.min(50000, parseInt(e.target.value) || 5000)) };
                            setScheduledExportPlan({ ...scheduledExportPlan, tasks: newTasks });
                          }}
                          style={{ width: '100%', fontSize: '0.85em', boxSizing: 'border-box' }}
                          disabled={isScheduledExportRunning}
                        />
                        <label style={{ fontSize: '0.75em', color: 'var(--vscode-descriptionForeground)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', marginTop: '2px' }}>
                          <input
                            type="checkbox"
                            checked={task.ignoreDefVal || false}
                            onChange={(e) => {
                              const newTasks = [...(scheduledExportPlan.tasks || [])];
                              newTasks[index] = { ...newTasks[index], ignoreDefVal: e.target.checked };
                              setScheduledExportPlan({ ...scheduledExportPlan, tasks: newTasks });
                            }}
                            disabled={isScheduledExportRunning}
                          />
                          精简模式
                        </label>
                      </>
                    ) : (
                      <span style={{ textAlign: 'center', color: 'var(--vscode-descriptionForeground)', fontSize: '0.85em', alignSelf: 'center' }}>-</span>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={task.compress || false}
                    onChange={(e) => {
                      const newTasks = [...(scheduledExportPlan.tasks || [])];
                      newTasks[index] = { ...newTasks[index], compress: e.target.checked };
                      setScheduledExportPlan({ ...scheduledExportPlan, tasks: newTasks });
                    }}
                    style={{ justifySelf: 'center', cursor: 'pointer' }}
                    disabled={isScheduledExportRunning}
                  />
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={task.threadCount || 5}
                    onChange={(e) => {
                      const newTasks = [...(scheduledExportPlan.tasks || [])];
                      newTasks[index] = { ...newTasks[index], threadCount: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)) };
                      setScheduledExportPlan({ ...scheduledExportPlan, tasks: newTasks });
                    }}
                    style={{ width: '60px', textAlign: 'center', fontSize: '0.85em', justifySelf: 'center' }}
                    disabled={isScheduledExportRunning}
                  />
                  <input
                    type="checkbox"
                    checked={task.enabled !== false}
                    onChange={(e) => {
                      const newTasks = [...(scheduledExportPlan.tasks || [])];
                      newTasks[index] = { ...newTasks[index], enabled: e.target.checked };
                      setScheduledExportPlan({ ...scheduledExportPlan, tasks: newTasks });
                    }}
                    style={{ justifySelf: 'center', cursor: 'pointer' }}
                  />
                  <button
                    onClick={() => {
                      const newTasks = (scheduledExportPlan.tasks || []).filter((_: any, i: number) => i !== index);
                      setScheduledExportPlan({ ...scheduledExportPlan, tasks: newTasks });
                    }}
                    style={{ 
                      justifySelf: 'center',
                      padding: '2px 6px',
                      fontSize: '0.85em',
                      cursor: isScheduledExportRunning ? 'not-allowed' : 'pointer',
                      background: 'transparent',
                      border: '1px solid var(--vscode-panel-border)',
                      borderRadius: '3px',
                      color: 'var(--vscode-errorForeground)'
                    }}
                    disabled={isScheduledExportRunning}
                  >
                    ✕
                  </button>
                </div>
                {/* 单个任务进度条 */}
                {isScheduledExportRunning && taskProgress && taskProgress.total > 0 && (
                  <div style={{ padding: '2px 8px 6px 8px', borderBottom: '1px solid var(--vscode-panel-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '0.75em', color: 'var(--vscode-descriptionForeground)' }}>
                      <span>{taskProgress.statusText || ''}</span>
                      <span>{taskProgress.current} / {taskProgress.total}</span>
                    </div>
                    <div style={{ 
                      width: '100%',
                      height: '8px',
                      background: 'var(--vscode-textCodeBlock-background)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${(taskProgress.current / taskProgress.total) * 100}%`,
                        height: '100%',
                        background: 'var(--vscode-terminal-ansiGreen)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}
                </div>
                );
              })}

              {(scheduledExportPlan.tasks || []).length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }}>
                  暂无任务，点击"添加任务"按钮添加
                </div>
              )}
            </div>

            {/* 变量说明 */}
            <div style={{ 
              padding: '10px',
              background: 'var(--vscode-textBlockQuote-background)',
              borderRadius: '4px',
              marginBottom: '20px',
              fontSize: '0.85em'
            }}>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>📌 变量说明:</p>
              <p style={{ margin: '0 0 3px 0' }}>$&#123;envName&#125; - 环境名称（如：loction）</p>
              <p style={{ margin: '0 0 3px 0' }}>$&#123;timestamp&#125; - 时间戳（如：1722300000000）</p>
              <p style={{ margin: '0 0 3px 0' }}>$&#123;datetimeEN&#125; - 日期时间格式 yyyyMMdd_HHmmss（如：20260730_001009）</p>
              <p style={{ margin: '0' }}>$&#123;langcode&#125; - 语言代码（如：ZH, EN）</p>
            </div>

            {/* 开始执行按钮 */}
            <button 
              onClick={handleStartScheduledExport}
              disabled={isScheduledExportRunning || (scheduledExportPlan.tasks || []).length === 0}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '20px',
                opacity: (isScheduledExportRunning || (scheduledExportPlan.tasks || []).length === 0) ? 0.6 : 1,
                cursor: (isScheduledExportRunning || (scheduledExportPlan.tasks || []).length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {isScheduledExportRunning ? '⏳ 正在执行...' : '▶️ 开始执行'}
            </button>

            {/* 进度条 */}
            {isScheduledExportRunning && scheduledExportProgress.total > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9em' }}>
                  <span>📊 导出进度</span>
                  <span>{scheduledExportProgress.current} / {scheduledExportProgress.total}</span>
                </div>
                <div style={{ 
                  width: '100%',
                  height: '20px',
                  background: 'var(--vscode-textCodeBlock-background)',
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${(scheduledExportProgress.current / scheduledExportProgress.total) * 100}%`,
                    height: '100%',
                    background: 'var(--vscode-terminal-ansiGreen)',
                    borderRadius: '10px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: 'var(--vscode-descriptionForeground)' }}>
                  {scheduledExportProgress.statusText || ''}
                </p>
              </div>
            )}

            {/* 输出日志区域 */}
            <div style={{ 
              background: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              padding: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>📋 导出日志</span>
                <button 
                  onClick={() => setScheduledExportLog('')}
                  style={{ padding: '4px 12px', fontSize: '0.9em' }}
                >
                  清空
                </button>
              </div>
              <pre style={{ 
                margin: 0,
                padding: '10px',
                background: 'var(--vscode-textCodeBlock-background)',
                borderRadius: '4px',
                maxHeight: '300px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontSize: '0.9em'
              }}>
                {scheduledExportLog || '准备就绪，请配置导出任务并点击"开始执行"按钮...'}
              </pre>
            </div>
          </div>
        )}

        {/* 查询脚本页面 */}
        {activeSection === 'queryScripts' && (
          <div className="section active">
            <h2>查询脚本</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <button 
                onClick={handleQueryScripts}
                disabled={isQueryingScripts}
                style={{
                  padding: '10px 20px',
                  marginRight: '10px',
                  opacity: isQueryingScripts ? 0.6 : 1,
                  cursor: isQueryingScripts ? 'not-allowed' : 'pointer'
                }}
              >
                {isQueryingScripts ? '⏳ 正在查询...' : '🔍 查询所有脚本'}
              </button>
              
              {scriptList.length > 0 && (
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索脚本名称或描述..."
                  style={{
                    padding: '10px',
                    width: '300px',
                    marginLeft: '10px'
                  }}
                />
              )}
            </div>

            {/* 显示统计信息 */}
            {scriptList.length > 0 && (
              <div style={{ 
                marginBottom: '15px',
                fontSize: '0.9em',
                color: 'var(--vscode-descriptionForeground)'
              }}>
                共 {scriptList.length} 个脚本{searchKeyword ? `，找到 ${filteredScriptList.length} 个匹配结果` : ''}
              </div>
            )}

            {/* 脚本列表表格 */}
            {filteredScriptList.length > 0 && (
              <div style={{ 
                overflowX: 'auto',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px'
              }}>
                <table style={{ 
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9em'
                }}>
                  <thead>
                    <tr style={{ 
                      background: 'var(--vscode-editor-background)',
                      borderBottom: '2px solid var(--vscode-panel-border)'
                    }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>脚本名称</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>描述</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', width: '100px' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScriptList.map((script, index) => (
                      <tr 
                        key={index}
                        style={{ 
                          borderBottom: '1px solid var(--vscode-panel-border)',
                          background: index % 2 === 0 ? 'transparent' : 'var(--vscode-editor-background)'
                        }}
                      >
                        <td style={{ padding: '8px 10px' }}>{script.AUTOSCRIPT || '-'}</td>
                        <td style={{ padding: '8px 10px' }}>{script.DESCRIPTION || '-'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            onClick={() => handlePullScript(script.AUTOSCRIPT)}
                            style={{
                              padding: '4px 12px',
                              fontSize: '0.85em',
                              cursor: 'pointer'
                            }}
                          >
                            📥 Pull
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {scriptList.length > 0 && filteredScriptList.length === 0 && (
              <div style={{ 
                padding: '40px',
                textAlign: 'center',
                color: 'var(--vscode-descriptionForeground)'
              }}>
                <p>没有找到匹配的脚本</p>
              </div>
            )}

            {scriptList.length === 0 && !isQueryingScripts && (
              <div style={{ 
                padding: '40px',
                textAlign: 'center',
                color: 'var(--vscode-descriptionForeground)'
              }}>
                <p>点击“查询所有脚本”按钮获取脚本列表</p>
              </div>
            )}
          </div>
        )}

        {activeSection === 'about' && (
          <div className="section active">
            <h2>关于</h2>
            <p><strong>Maximo Script Helper</strong></p>
            <p>版本：1.0.0</p>
            <p>作者：shoukaiseki</p>
          </div>
        )}

        {activeSection === 'import' && (
          <div className="section active">
            <h2>导入</h2>
            <p>使用 <strong>Node.js</strong> 的模块进行导入（批量部署 Maximo 配置）。</p>
            <p>
              maximo请求模块：
              <a href="https://gitee.com/shoukaiseki/maximo-helper-box/tree/master/maximo_request" target="_blank" rel="noopener noreferrer">
                https://gitee.com/shoukaiseki/maximo-helper-box/tree/master/maximo_request
              </a>
            </p>
            <p>
              示例：
              <a href="https://gitee.com/shoukaiseki/maximo-helper-box/tree/master/maximo_request_demo" target="_blank" rel="noopener noreferrer">
                https://gitee.com/shoukaiseki/maximo-helper-box/tree/master/maximo_request_demo
              </a>
            </p>

            <h3>安装</h3>
            <pre><code>npm install -g sks-maximo-utils</code></pre>
            <p>项目中引用：</p>
            <pre><code>npm install sks-maximo-utils</code></pre>

            <h3>初始化配置</h3>
            <p>首次运行自动生成配置文件（位于 <code>~/.sks/nodeutils/config.json</code>），也可执行：</p>
            <pre><code>sks-maximo</code></pre>

            <h3>脚本中使用</h3>
            <p>执行时通过命令行参数指定环境（如：<code>node 脚本.js loc</code>）：</p>
            <pre><code>{`import {
  importMaxObject,
  importMaxPresentation,
  importMaxDomain,
  importMaxAutoKey,
  importMaxScript,
  importMaxAppInfo
} from 'sks-maximo-utils';

// 导入自动化脚本（fileName 为 JSON 配置，同目录需有同名 .js 文件）
importMaxScript({ fileName: 'scripts/TEST.json' });

// 导入对象配置
importMaxObject({ fileName: 'DBCONFIGJSON/test.json', logname: '测试' });`}</code></pre>

            <h3>运行示例</h3>
            <p>克隆仓库后进入 demo 目录执行：</p>
            <pre><code>cd maximo_request_demo
node demo01.js loc</code></pre>
            <p>PowerShell 批量部署多个环境：</p>
            <pre><code>node demo01.js loc; node demo01.js hd; node demo01.js dev</code></pre>
          </div>
        )}

        {activeSection === 'logger' && (
          <div className="section active">
            <LogManager vscode={getVsCodeApi()} />
          </div>
        )}
      </div>

      {/* 环境选择对话框 */}
      {showEnvDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowEnvDialog(false)}>
          <div 
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '6px',
              padding: '20px',
              minWidth: '400px',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 15px 0' }}>选择环境</h3>
            
            {config.envList.length === 0 ? (
              <p style={{ color: 'var(--vscode-descriptionForeground)' }}>暂无已保存的环境</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {config.envList.map(env => (
                  <div 
                    key={env}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px',
                      backgroundColor: env === config.envnum ? 'var(--vscode-list-activeSelectionBackground)' : 'var(--vscode-list-hoverBackground)',
                      borderRadius: '4px',
                      border: env === config.envnum ? '1px solid var(--vscode-focusBorder)' : '1px solid transparent'
                    }}
                  >
                    <span style={{ fontWeight: env === config.envnum ? 'bold' : 'normal' }}>
                      {env} {env === config.envnum && '(当前)'}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {/* 加载按钮 */}
                      <button
                        onClick={() => {
                          getVsCodeApi().postMessage({
                            command: 'loadEnvironmentConfig',
                            envnum: env
                          });
                          setShowEnvDialog(false);
                        }}
                        style={{
                          padding: '4px 12px',
                          cursor: 'pointer',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '4px'
                        }}
                      >
                        加载
                      </button>
                      {/* 删除按钮 */}
                      <button
                        onClick={() => handleDeleteEnvironment(env)}
                        style={{
                          padding: '4px 12px',
                          cursor: 'pointer',
                          backgroundColor: 'var(--vscode-errorForeground)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px'
                        }}
                        title="删除此环境"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setShowEnvDialog(false)}
                style={{
                  padding: '6px 16px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }} onClick={cancelDelete}>
          <div 
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '6px',
              padding: '24px',
              minWidth: '400px',
              maxWidth: '500px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', color: 'var(--vscode-errorForeground)' }}>⚠️ 确认删除</h3>
            <p style={{ margin: '0 0 24px 0', lineHeight: '1.6' }}>
              确定要删除环境 <strong>"{envToDelete}"</strong> 吗？
              <br />
              <span style={{ color: 'var(--vscode-descriptionForeground)' }}>此操作不可恢复！</span>
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelDelete}
                style={{
                  padding: '8px 20px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '8px 20px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--vscode-errorForeground)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户信息弹窗 */}
      {showUserInfoDialog && userInfo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1002
        }} onClick={() => setShowUserInfoDialog(false)}>
          <div 
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '6px',
              padding: '24px',
              minWidth: '600px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px 0', borderBottom: '2px solid var(--vscode-panel-border)', paddingBottom: '10px' }}>
              👤 用户语言信息
            </h3>
            
            {/* 用户基本信息 */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--vscode-textLink-foreground)' }}>📋 用户基本信息 (userInfo)</h4>
              <div style={{ 
                background: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
                padding: '15px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><strong>用户名:</strong> {userInfo.userInfo?.userName || '-'}</div>
                  <div><strong>显示名称:</strong> {userInfo.userInfo?.displayname || '-'}</div>
                  <div><strong>人员ID:</strong> {userInfo.userInfo?.personId || '-'}</div>
                  <div><strong>语言代码:</strong> <span style={{ color: 'var(--vscode-terminal-ansiGreen)', fontWeight: 'bold' }}>{userInfo.userInfo?.langcode || '-'}</span></div>
                  <div><strong>区域语言:</strong> {userInfo.userInfo?.localeLanguage || '-'}</div>
                  <div><strong>区域国家:</strong> {userInfo.userInfo?.localeCountry || '-'}</div>
                  <div style={{ gridColumn: '1 / -1' }}><strong>完整区域设置:</strong> {userInfo.userInfo?.locale || '-'}</div>
                </div>
              </div>
            </div>

            {/* 人员详细信息 */}
            {userInfo.peruser && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--vscode-textLink-foreground)' }}>👥 人员详细信息 (PERSON)</h4>
                <div style={{ 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  padding: '15px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><strong>人员ID:</strong> {userInfo.peruser.PERSONID || '-'}</div>
                    <div><strong>显示名称:</strong> {userInfo.peruser.DISPLAYNAME || '-'}</div>
                    <div><strong>名字:</strong> {userInfo.peruser.FIRSTNAME || '-'}</div>
                    <div><strong>姓氏:</strong> {userInfo.peruser.LASTNAME || '-'}</div>
                    <div><strong>部门:</strong> {userInfo.peruser.DEPARTMENT || '-'}</div>
                    <div><strong>职务代码:</strong> {userInfo.peruser.JOBCODE || '-'}</div>
                    <div><strong>状态:</strong> {userInfo.peruser.STATUS || '-'}</div>
                    <div><strong>语言代码:</strong> {userInfo.peruser.LANGCODE || '-'}</div>
                    <div><strong>语言:</strong> {userInfo.peruser.LANGUAGE || '-'}</div>
                    <div><strong>区域设置:</strong> {userInfo.peruser.LOCALE || '-'}</div>
                    <div><strong>缺省应用程序:</strong> {userInfo.peruser.DFLTAPP || '-'}</div>
                    <div><strong>电子邮件:</strong> {userInfo.peruser.PRIMARYEMAIL || '-'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* MaxUser 信息 */}
            {userInfo.peruser?.MAXUSER && userInfo.peruser.MAXUSER.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--vscode-textLink-foreground)' }}>🔐 用户账户信息 (MAXUSER)</h4>
                <div style={{ 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  padding: '15px'
                }}>
                  {userInfo.peruser.MAXUSER.map((user: any, index: number) => (
                    <div key={index} style={{ marginBottom: index < userInfo.peruser.MAXUSER.length - 1 ? '15px' : '0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div><strong>用户ID:</strong> {user.USERID || '-'}</div>
                        <div><strong>登录ID:</strong> {user.LOGINID || '-'}</div>
                        <div><strong>状态:</strong> {user.STATUS || '-'}</div>
                        <div><strong>类型:</strong> {user.TYPE || '-'}</div>
                        <div><strong>缺省地点:</strong> {user.DEFSITE || '-'}</div>
                        <div><strong>所有者:</strong> {user.OWNER || '-'}</div>
                        <div><strong>系统管理员:</strong> {user.SYSTEMADMIN ? '✅ 是' : '❌ 否'}</div>
                        <div><strong>系统账号:</strong> {user.SYSUSER ? '✅ 是' : '❌ 否'}</div>
                        <div><strong>已锁定:</strong> {user.ISLOCKED ? '🔒 是' : '🔓 否'}</div>
                        <div><strong>登录失败次数:</strong> {user.FAILEDLOGINS || 0}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MaxApps 应用列表 */}
            {userInfo.maxapps && userInfo.maxapps.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--vscode-textLink-foreground)' }}>📱 可用应用程序 (MaxApps) - 共 {userInfo.maxapps.length} 个</h4>
                <div style={{ 
                  background: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  padding: '15px',
                  maxHeight: '300px',
                  overflow: 'auto'
                }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead>
                      <tr style={{ 
                        borderBottom: '2px solid var(--vscode-panel-border)',
                        position: 'sticky',
                        top: 0,
                        backgroundColor: 'var(--vscode-editor-background)'
                      }}>
                        <th style={{ textAlign: 'left', padding: '8px', fontWeight: 'bold' }}>应用代码</th>
                        <th style={{ textAlign: 'left', padding: '8px', fontWeight: 'bold' }}>应用名称</th>
                        <th style={{ textAlign: 'left', padding: '8px', fontWeight: 'bold' }}>类型</th>
                        <th style={{ textAlign: 'left', padding: '8px', fontWeight: 'bold' }}>主表</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userInfo.maxapps.map((app: any, index: number) => (
                        <tr key={index} style={{ 
                          borderBottom: '1px solid var(--vscode-panel-border)',
                          backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--vscode-list-hoverBackground)'
                        }}>
                          <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 'bold' }}>{app.APP || '-'}</td>
                          <td style={{ padding: '8px' }}>{app.DESCRIPTION || '-'}</td>
                          <td style={{ padding: '8px' }}>{app.APPTYPE || '-'}</td>
                          <td style={{ padding: '8px', fontFamily: 'monospace' }}>{app.MAINTBNAME || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setShowUserInfoDialog(false)}
                style={{
                  padding: '8px 24px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  border: 'none',
                  borderRadius: '4px'
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
