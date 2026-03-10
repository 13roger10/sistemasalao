# Script para iniciar o Backend Java
$env:JAVA_HOME = "c:\Users\Rogerio Martins\Nova pasta\Belezza.ai\belezza-api\tools\jdk-21.0.4"
$jarPath = "c:\Users\Rogerio Martins\Nova pasta\Belezza.ai\belezza-api\target\belezza-api-1.0.0-SNAPSHOT.jar"

Write-Host "Iniciando Backend Java na porta 8080..." -ForegroundColor Green
& "$env:JAVA_HOME\bin\java.exe" -jar $jarPath --spring.profiles.active=test
