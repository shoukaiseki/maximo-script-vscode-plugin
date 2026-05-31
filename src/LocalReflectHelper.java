import java.lang.reflect.*;
import java.util.*;
import java.io.File;
import java.net.URL;
import java.net.URLClassLoader;

/**
 * 本地反射辅助类
 * 通过 Java 反射获取类的详细信息，返回与 SKS_REFLECT_HELPER_ENHANCED 相同的 JSON 格式
 * 
 * 编译命令（使用 JDK 8）：
 * javac -cp "D:/usr/java/jdk1.8.0_491x64/lib/tools.jar" LocalReflectHelper.java
 * 
 * 运行命令：
 * java -cp ".;maximo_client.jar;mboejb.jar;mbojava.jar;businessobjects.jar;commonweb.jar" LocalReflectHelper <className> <classpath>
 */
public class LocalReflectHelper {
    
    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: java LocalReflectHelper <className> [classpath]");
            System.exit(1);
        }
        
        String className = args[0];
        String classpath = args.length > 1 ? args[1] : "";
        
        try {
            // 加载类
            Class<?> clazz;
            if (!classpath.isEmpty()) {
                // 如果有 classpath，使用自定义类加载器
                String[] paths = classpath.split(File.pathSeparator);
                URL[] urls = new URL[paths.length];
                for (int i = 0; i < paths.length; i++) {
                    urls[i] = new File(paths[i]).toURI().toURL();
                }
                URLClassLoader classLoader = new URLClassLoader(urls, LocalReflectHelper.class.getClassLoader());
                clazz = classLoader.loadClass(className);
            } else {
                // 使用默认类加载器
                clazz = Class.forName(className);
            }
            
            // 构建 JSON 响应（手动构建，不依赖外部库）
            // 注意：返回格式与 SKS_REFLECT_HELPER_ENHANCED 一致
            StringBuilder json = new StringBuilder();
            json.append("{\n");
            json.append("  \"className\": \"").append(escapeJson(className)).append("\",\n");
            
            // 获取父类
            Class<?> superClass = clazz.getSuperclass();
            if (superClass != null && !superClass.getName().equals("java.lang.Object")) {
                json.append("    \"superClass\": \"").append(escapeJson(superClass.getName())).append("\",\n");
            } else {
                json.append("    \"superClass\": null,\n");
            }
            
            // 获取接口
            Class<?>[] interfaces = clazz.getInterfaces();
            json.append("    \"interfaces\": [");
            for (int i = 0; i < interfaces.length; i++) {
                if (i > 0) json.append(", ");
                json.append("\"").append(escapeJson(interfaces[i].getName())).append("\"");
            }
            json.append("],\n");
            
            // 获取方法
            Method[] methods = clazz.getMethods();
            json.append("    \"methods\": [\n");
            
            boolean firstMethod = true;
            for (Method method : methods) {
                // 只处理 public 方法
                if (!Modifier.isPublic(method.getModifiers())) {
                    continue;
                }
                
                if (!firstMethod) {
                    json.append(",\n");
                }
                firstMethod = false;
                
                json.append("      {\n");
                json.append("        \"name\": \"").append(escapeJson(method.getName())).append("\",\n");
                
                // 返回类型
                json.append("        \"returnType\": \"").append(escapeJson(method.getReturnType().getName())).append("\",\n");
                
                // 参数列表
                json.append("        \"parameters\": [");
                Class<?>[] paramTypes = method.getParameterTypes();
                for (int i = 0; i < paramTypes.length; i++) {
                    if (i > 0) json.append(", ");
                    json.append("\"").append(escapeJson(paramTypes[i].getName())).append("\"");
                }
                json.append("],\n");
                
                // 是否为静态方法
                json.append("        \"isStatic\": ").append(Modifier.isStatic(method.getModifiers())).append(",\n");
                
                // 描述（暂时为空）
                json.append("        \"description\": \"\"\n");
                json.append("      }");
            }
            
            json.append("\n    ]\n");
            json.append("}\n");
            
            // 输出 JSON
            System.out.println(json.toString());
            
        } catch (ClassNotFoundException e) {
            System.err.println("{\"error\": \"Class not found: " + escapeJson(className) + "\"}");
            System.exit(1);
        } catch (Exception e) {
            System.err.println("{\"error\": \"" + escapeJson(e.getMessage()) + "\"}");
            System.exit(1);
        }
    }
    
    /**
     * 转义 JSON 字符串中的特殊字符
     */
    private static String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
}
