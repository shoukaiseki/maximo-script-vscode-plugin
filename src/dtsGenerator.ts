/**
 * DTS 文件生成器 - 独立模块
 * 将 Maximo 反射 JSON 数据转换为 TypeScript 声明文件
 */

/**
 * Java 方法信息接口（来自 Maximo 反射接口 - 增强版）
 */
export interface MethodInfo {
  name: string;
  returnType: string;
  parameters: string[];
  description?: string;
  isStatic?: boolean;  // 新增：是否为静态方法
}

/**
 * Java 反射数据接口（来自 Maximo 反射接口）
 */
export interface ReflectionData {
  className: string;
  superClass?: string | null;
  interfaces?: string[];
  methods: MethodInfo[];
}

/**
 * Java 到 TypeScript 类型映射表
 */
const JAVA_TO_TS_TYPE_MAP: Record<string, string> = {
  // Java 基础类型
  'java.lang.String': 'string',
  'java.lang.Integer': 'number',
  'java.lang.Long': 'number',
  'java.lang.Double': 'number',
  'java.lang.Float': 'number',
  'java.lang.Boolean': 'boolean',
  'java.lang.Object': 'any',
  'java.lang.Class': 'any',
  
  // Java 异常类
  'java.lang.Throwable': 'Error',
  'java.lang.Exception': 'Error',
  'java.lang.RuntimeException': 'Error',
  
  // Java 原始类型
  'void': 'void',
  'int': 'number',
  'long': 'number',
  'double': 'number',
  'float': 'number',
  'boolean': 'boolean',
  'byte': 'number',
  'short': 'number',
  'char': 'string',
  
  // Java 常用类
  'java.util.Date': 'Date',
  'java.util.List': 'Array<any>',
  'java.util.Map': 'Record<string, any>',
  'java.util.Set': 'Set<any>',
  
  // Java 内部数组表示法（JVM 签名）
  '[B': 'number[]',      // byte[]
  '[I': 'number[]',      // int[]
  '[J': 'number[]',      // long[]
  '[D': 'number[]',      // double[]
  '[F': 'number[]',      // float[]
  '[Z': 'boolean[]',     // boolean[]
  '[C': 'string[]',      // char[]
  '[S': 'number[]',      // short[]
};

/**
 * .d.ts 文件生成器
 */
export class DtsGenerator {
  
  /**
   * 简化 Java 类型为 TypeScript 类型
   * @param javaType Java 类型（如：java.lang.String）
   * @returns TypeScript 类型（如：string）
   */
  simplifyJavaType(javaType: string): string {
    // 先查映射表
    if (JAVA_TO_TS_TYPE_MAP[javaType]) {
      return JAVA_TO_TS_TYPE_MAP[javaType];
    }
    
    // 处理 Java 内部数组表示法：[Ljava.lang.Object;
    if (javaType.startsWith('[') && javaType.endsWith(';')) {
      // 提取元素类型
      let elementType = javaType.substring(1, javaType.length - 1);
      // 移除 L 前缀（对象类型）
      if (elementType.startsWith('L')) {
        elementType = elementType.substring(1);
      }
      const tsElementType = this.simplifyJavaType(elementType);
      return `${tsElementType}[]`;
    }
    
    // 如果是标准数组类型（以 [] 结尾）
    if (javaType.endsWith('[]')) {
      const elementType = javaType.slice(0, -2);
      const tsElementType = this.simplifyJavaType(elementType);
      return `${tsElementType}[]`;
    }
    
    // 如果是泛型类型（简单处理）
    if (javaType.includes('<') && javaType.includes('>')) {
      // 暂时返回 any，后续可以增强
      return 'any';
    }
    
    // 默认保持原样（Maximo 自定义类）
    return javaType;
  }
  
  /**
   * 生成方法签名
   * @param method 方法信息
   * @returns 方法签名字符串
   */
  generateMethodSignature(method: MethodInfo): string {
    const params = method.parameters.map(p => this.simplifyJavaType(p)).join(', ');
    const returnType = this.simplifyJavaType(method.returnType);
    return `${returnType} ${method.name}(${params})`;
  }
  
  /**
   * 生成 JSDoc 注释
   * @param method 方法信息
   * @returns JSDoc 注释字符串
   */
  generateJsDoc(method: MethodInfo): string {
    let jsdoc = '        /**\n';
    
    if (method.description) {
      jsdoc += `         * ${method.description}\n`;
    } else {
      jsdoc += `         * ${method.name} method\n`;
    }
    
    // 添加参数说明
    if (method.parameters && method.parameters.length > 0) {
      method.parameters.forEach((param, index) => {
        const paramName = `param${index + 1}`;
        const paramType = this.simplifyJavaType(param);
        jsdoc += `         * @param ${paramName} ${paramType}\n`;
      });
    }
    
    // 添加返回值说明
    if (method.returnType !== 'void') {
      const returnType = this.simplifyJavaType(method.returnType);
      jsdoc += `         * @returns ${returnType}\n`;
    }
    
    jsdoc += '         */\n';
    
    return jsdoc;
  }
  
  /**
   * 生成方法声明
   * @param method 方法信息
   * @returns 方法声明字符串
   */
  generateMethodDeclaration(method: MethodInfo): string {
    let declaration = '';
    
    // 添加 JSDoc
    declaration += this.generateJsDoc(method);
    
    // 添加静态修饰符（如果 isStatic 为 true）
    if (method.isStatic) {
      declaration += '        static ';
    } else {
      declaration += '        ';  // 非静态方法也需要缩进
    }
    
    // 生成方法签名
    const params = method.parameters.map((p, i) => {
      const paramName = `param${i + 1}`;
      const paramType = this.simplifyJavaType(p);
      return `${paramName}: ${paramType}`;
    }).join(', ');
    
    const returnType = this.simplifyJavaType(method.returnType);
    declaration += `${method.name}(${params}): ${returnType};\n`;
    
    return declaration;
  }
  
  /**
   * 解析类名，提取包名和简单类名
   * 支持内部类（如：java.util.Base64$Decoder -> java.util.Base64.Decoder）
   * @param className 完整类名（如：com.ibm.tivoli.maximo.script.ScriptService 或 java.util.Base64$Decoder）
   * @returns { packageName, simpleClassName }
   */
  parseClassName(className: string): { packageName: string; simpleClassName: string } {
    // 将内部类的 $ 替换为 . （TypeScript 不支持 $ 在类名中）
    const normalizedClassName = className.replace(/\$/g, '.');
    
    const lastDotIndex = normalizedClassName.lastIndexOf('.');
    
    if (lastDotIndex === -1) {
      return {
        packageName: '',
        simpleClassName: normalizedClassName
      };
    }
    
    return {
      packageName: normalizedClassName.substring(0, lastDotIndex),
      simpleClassName: normalizedClassName.substring(lastDotIndex + 1)
    };
  }
  
  /**
   * 生成完整的 .d.ts 文件内容
   * @param reflectionData 反射数据
   * @returns .d.ts 文件内容字符串
   */
  generateDtsContent(reflectionData: ReflectionData): string {
    const { className, superClass, interfaces, methods } = reflectionData;
    const { packageName, simpleClassName } = this.parseClassName(className);
    
    console.log(`[DtsGenerator] 生成 ${className} 的 .d.ts 文件`);
    console.log(`[DtsGenerator] 方法数量: ${methods ? methods.length : 0}`);
    
    if (!methods || methods.length === 0) {
      console.warn(`[DtsGenerator] ⚠️ 警告: ${className} 没有方法数据！`);
      console.log(`[DtsGenerator] 反射数据结构:`, JSON.stringify(reflectionData, null, 2));
    }
    
    let content = '// Auto-generated by Maximo Script Helper\n';
    content += `// Source: ${className}\n`;
    content += `// Generated at: ${new Date().toISOString()}\n\n`;
    
    // 如果有包名，生成命名空间
    if (packageName) {
      content += `declare namespace ${packageName} {\n`;
    }
    
    // 类声明开始
    const indent = packageName ? '    ' : '';
    content += `${indent}/**\n`;
    content += `${indent} * ${simpleClassName} class\n`;
    
    if (superClass) {
      content += `${indent} * @extends ${this.simplifyJavaType(superClass)}\n`;
    }
    
    if (interfaces && interfaces.length > 0) {
      content += `${indent} * @implements ${interfaces.map(i => this.simplifyJavaType(i)).join(', ')}\n`;
    }
    
    content += `${indent} */\n`;
    content += `${indent}class ${simpleClassName}`;
    
    // 继承关系
    if (superClass) {
      content += ` extends ${this.simplifyJavaType(superClass)}`;
    }
    
    content += ` {\n`;
    
    // 生成所有方法（Maximo 反射接口只返回公共方法）
    const allMethods = methods || [];
    
    if (allMethods.length === 0) {
      content += `${indent}    // No public methods available\n`;
    } else {
      for (const method of allMethods) {
        content += this.generateMethodDeclaration(method);
        content += '\n';
      }
    }
    
    content += `${indent}}\n`;
    
    // 闭合命名空间
    if (packageName) {
      content += `}\n`;
    }
    
    return content;
  }
  
  /**
   * 根据类名计算文件路径（相对于 javaapi 目录）
   * @param className 完整类名
   * @returns 文件路径（如：com/ibm/tivoli/maximo/script/ScriptService.d.ts）
   */
  calculateFilePath(className: string): string {
    const { packageName, simpleClassName } = this.parseClassName(className);
    
    if (!packageName) {
      return `${simpleClassName}.d.ts`;
    }
    
    // 将包名中的点号替换为斜杠
    const packagePath = packageName.replace(/\./g, '/');
    return `${packagePath}/${simpleClassName}.d.ts`;
  }
  
  /**
   * 根据类名计算 JSON 文件路径（相对于 reflection-data 目录）
   * @param className 完整类名
   * @returns 文件路径（如：com/ibm/tivoli/maximo/script/ScriptService.json）
   */
  calculateJsonFilePath(className: string): string {
    const { packageName, simpleClassName } = this.parseClassName(className);
    
    if (!packageName) {
      return `${simpleClassName}.json`;
    }
    
    // 将包名中的点号替换为斜杠
    const packagePath = packageName.replace(/\./g, '/');
    return `${packagePath}/${simpleClassName}.json`;
  }
}
