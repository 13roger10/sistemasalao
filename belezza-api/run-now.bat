@echo off
cd /d "%~dp0"
set "JAVA_HOME=%~dp0tools\jdk-21.0.4"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo JAVA_HOME=%JAVA_HOME%
echo.
echo Verificando Java...
java -version
echo.
echo Iniciando Backend...
call mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
pause
