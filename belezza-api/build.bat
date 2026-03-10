@echo off
setlocal
set "JAVA_HOME=%~dp0tools\jdk-21.0.4"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "%~dp0"
java -cp ".mvn\wrapper\maven-wrapper.jar" org.apache.maven.wrapper.MavenWrapperMain %*
endlocal
