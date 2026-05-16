import java.lang.reflect.*;
import java.util.*;

public class ReflectHelper {
    public static void main(String[] args) {
        if (args.length < 2) {
            System.err.println("Usage: java ReflectHelper <className> <classpath>");
            System.exit(1);
        }
        
        String className = args[0];
        String classpath = args[1];
        
        try {
            Class<?> clazz = Class.forName(className);
            Method[] methods = clazz.getMethods();
            
            System.out.println("{");
            System.out.println("  \"className\": \"" + className + "\",");
            System.out.println("  \"methods\": [");
            
            List<String> methodList = new ArrayList<>();
            for (Method method : methods) {
                if (!Modifier.isPublic(method.getModifiers())) {
                    continue;
                }
                
                StringBuilder sb = new StringBuilder();
                sb.append("    {");
                sb.append("\"name\": \"" + method.getName() + "\",");
                sb.append("\"returnType\": \"" + method.getReturnType().getSimpleName() + "\",");
                
                Class<?>[] paramTypes = method.getParameterTypes();
                sb.append("\"parameters\": [");
                for (int i = 0; i < paramTypes.length; i++) {
                    if (i > 0) sb.append(", ");
                    sb.append("\"" + paramTypes[i].getSimpleName() + "\"");
                }
                sb.append("],");
                
                sb.append("\"description\": \"\"");
                sb.append("}");
                
                methodList.add(sb.toString());
            }
            
            System.out.println(String.join(",\n", methodList));
            System.out.println("  ]");
            System.out.println("}");
            
        } catch (ClassNotFoundException e) {
            System.err.println("{\"error\": \"Class not found: " + className + "\"}");
            System.exit(1);
        } catch (Exception e) {
            System.err.println("{\"error\": \"" + e.getMessage() + "\"}");
            System.exit(1);
        }
    }
}
