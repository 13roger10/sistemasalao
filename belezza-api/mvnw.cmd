@REM Maven Wrapper script for Windows
@echo off
setlocal EnableDelayedExpansion

@REM Force Java 21 for compatibility - use embedded JDK
if not defined JAVA_HOME (
    set "JAVA_HOME=%~dp0tools\jdk-21.0.4"
)

set "BASEDIR=%~dp0"
set "BASEDIR=%BASEDIR:~0,-1%"
set "WRAPPER_JAR=%BASEDIR%\.mvn\wrapper\maven-wrapper.jar"
set "WRAPPER_PROPERTIES=%BASEDIR%\.mvn\wrapper\maven-wrapper.properties"

@REM Download Maven Wrapper if not present
if not exist "%WRAPPER_JAR%" (
    echo Downloading Maven Wrapper...
    for /f "tokens=2 delims==" %%a in ('findstr /i "wrapperUrl" "%WRAPPER_PROPERTIES%"') do set WRAPPER_URL=%%a
    powershell -Command "Invoke-WebRequest -Uri '!WRAPPER_URL!' -OutFile '%WRAPPER_JAR%'"
)

@REM Set Maven multi-module directory
set "MAVEN_PROJECTBASEDIR=%BASEDIR%"

@REM Execute Maven
"%JAVA_HOME%\bin\java.exe" %MAVEN_OPTS% "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" -classpath "%WRAPPER_JAR%" org.apache.maven.wrapper.MavenWrapperMain %*

endlocal
