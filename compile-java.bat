@echo off
REM 使用 JDK 8 编译 ReflectHelper.java
REM 确保兼容性：Java 8 编译的 class 文件可以在 Java 8+ 所有版本运行

set JDK_PATH=D:\usr\java\jdk1.8.0_491x64
set JAVA_FILE=src\ReflectHelper.java

echo 正在使用 JDK 8 编译 %JAVA_FILE%...
echo JDK 路径: %JDK_PATH%

%JDK_PATH%\bin\javac -source 1.8 -target 1.8 %JAVA_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 编译成功！
    echo 输出文件: src\ReflectHelper.class
    echo.
    echo 请运行 "npm run compile" 来打包插件
) else (
    echo.
    echo ❌ 编译失败！
    exit /b 1
)
