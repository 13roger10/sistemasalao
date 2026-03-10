@echo off
echo ========================================
echo    Belezza API - Compilacao Limpa
echo ========================================
echo.

cd /d "%~dp0"

REM Forcar Java 21 (ignorar qualquer outro Java instalado)
set "JAVA_HOME=%~dp0tools\jdk-21.0.4"
set "MAVEN_HOME=%~dp0tools\apache-maven-3.9.6"
set "PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%"

echo [OK] JAVA_HOME: %JAVA_HOME%
echo.

echo Limpando compilacao anterior...
"%MAVEN_HOME%\bin\mvn.cmd" clean -q
echo.

echo Compilando e iniciando Spring Boot...
echo (Aguarde a compilacao completa)
echo.

"%MAVEN_HOME%\bin\mvn.cmd" spring-boot:run -Dspring-boot.run.profiles=local -DskipTests

pause
