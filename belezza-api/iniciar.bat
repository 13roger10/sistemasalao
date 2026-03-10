@echo off
echo ========================================
echo    Belezza API - Iniciando Backend
echo ========================================
echo.

cd /d "%~dp0"

REM Forcar Java 21 (ignorar qualquer outro Java instalado)
set "JAVA_HOME=%~dp0tools\jdk-21.0.4"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo [OK] JAVA_HOME configurado: %JAVA_HOME%
echo.

REM Verificar versao do Java
echo Verificando Java...
"%JAVA_HOME%\bin\java.exe" -version
echo.

REM Usar Maven embutido com Java 21
echo Iniciando Spring Boot...
echo (Primeira execucao pode demorar para baixar dependencias)
echo.

"%~dp0tools\apache-maven-3.9.6\bin\mvn.cmd" spring-boot:run -Dspring-boot.run.profiles=local -DskipTests

pause
