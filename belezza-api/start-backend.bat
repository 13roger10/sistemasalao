@echo off
echo ========================================
echo    Belezza API - Backend Startup
echo ========================================
echo.

cd /d "%~dp0"

REM Configurar Java 21 embutido
set "JAVA_HOME=%~dp0tools\jdk-21.0.4"
set "MAVEN_HOME=%~dp0tools\apache-maven-3.9.6"
set "PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%"

echo JAVA_HOME: %JAVA_HOME%
echo MAVEN_HOME: %MAVEN_HOME%
echo.

echo Verificando Java...
java -version
echo.

echo Iniciando Spring Boot (profile: local)...
echo Aguarde a compilacao e inicializacao...
echo.

"%MAVEN_HOME%\bin\mvn.cmd" spring-boot:run -Dspring-boot.run.profiles=local -DskipTests

pause
