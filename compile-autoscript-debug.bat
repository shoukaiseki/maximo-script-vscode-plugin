@echo off
REM ============================================================
REM Build cn.shoukaiseki.autoscript debug driver -> resources\sks-autoscript-debug.jar
REM Deps from local Maximo install: E:\maximoProject\issue\maximo
REM ============================================================
setlocal
set JDK=D:\usr\java\jdk-17.0.19x64
set MAXIMO=E:\maximoProject\issue\maximo
set SRC=%~dp0java\src\main\java
set OUT=%~dp0java\build\classes
set JAR_OUT=%~dp0resources\sks-autoscript-debug.jar

set CP=%MAXIMO%\businessobjects.jar;%MAXIMO%\lib\jython.jar;%MAXIMO%\lib\jackson-databind-2.15.1.jar;%MAXIMO%\lib\jackson-core-2.15.1.jar;%MAXIMO%\lib\jackson-annotations-2.15.1.jar;%MAXIMO%\lib\nashorn-core-15.6.jar

if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%" >nul 2>&1

echo Compiling...
"%JDK%\bin\javac" -encoding UTF-8 -source 17 -target 17 -proc:none -cp "%CP%" -d "%OUT%" %SRC%\cn\shoukaiseki\autoscript\*.java
if errorlevel 1 (
  echo COMPILE FAILED
  exit /b 1
)
echo Compile OK.

echo 1.0.1>"%OUT%\sks-autoscript-debug-version.txt"

echo Packaging jar...
"%JDK%\bin\jar" --create --file "%JAR_OUT%" -C "%OUT%" .
if errorlevel 1 (
  echo PACKAGE FAILED
  exit /b 1
)
echo DONE: %JAR_OUT%
endlocal