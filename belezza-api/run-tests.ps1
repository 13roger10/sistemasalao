# PowerShell script to run tests on Belezza API
# This script sets the necessary environment variables and runs Maven tests

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Belezza API - Test Runner" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Set Maven options
$env:MAVEN_OPTS = "-Dmaven.multiModuleProjectDirectory=$PWD"

# Get the base directory
$baseDir = $PSScriptRoot

Write-Host "Current Directory: $baseDir" -ForegroundColor Yellow
Write-Host "Maven Options: $env:MAVEN_OPTS" -ForegroundColor Yellow
Write-Host ""

# Check if mvnw.cmd exists
if (-Not (Test-Path "$baseDir\mvnw.cmd")) {
    Write-Host "ERROR: mvnw.cmd not found!" -ForegroundColor Red
    exit 1
}

# Menu
Write-Host "Select an option:" -ForegroundColor Green
Write-Host "1. Compile only"
Write-Host "2. Run unit tests"
Write-Host "3. Run integration tests"
Write-Host "4. Run all tests"
Write-Host "5. Clean and compile"
Write-Host "6. Generate coverage report"
Write-Host "7. Run security scan (OWASP)"
Write-Host "8. Exit"
Write-Host ""

$choice = Read-Host "Enter your choice (1-8)"

switch ($choice) {
    "1" {
        Write-Host "`nCompiling..." -ForegroundColor Cyan
        & "$baseDir\mvnw.cmd" compile
    }
    "2" {
        Write-Host "`nRunning unit tests..." -ForegroundColor Cyan
        & "$baseDir\mvnw.cmd" test
    }
    "3" {
        Write-Host "`nRunning integration tests..." -ForegroundColor Cyan
        & "$baseDir\mvnw.cmd" verify -DskipUnitTests
    }
    "4" {
        Write-Host "`nRunning all tests..." -ForegroundColor Cyan
        & "$baseDir\mvnw.cmd" verify
    }
    "5" {
        Write-Host "`nCleaning and compiling..." -ForegroundColor Cyan
        & "$baseDir\mvnw.cmd" clean compile
    }
    "6" {
        Write-Host "`nGenerating coverage report..." -ForegroundColor Cyan
        & "$baseDir\mvnw.cmd" clean test
        Write-Host "`nOpening coverage report..." -ForegroundColor Green
        Start-Process "$baseDir\target\site\jacoco\index.html"
    }
    "7" {
        Write-Host "`nRunning OWASP Dependency Check..." -ForegroundColor Cyan
        & "$baseDir\mvnw.cmd" dependency-check:check
        Write-Host "`nOpening security report..." -ForegroundColor Green
        Start-Process "$baseDir\target\dependency-check-report.html"
    }
    "8" {
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Invalid choice!" -ForegroundColor Red
        exit 1
    }
}

# Check exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=====================================" -ForegroundColor Green
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Green
} else {
    Write-Host "`n=====================================" -ForegroundColor Red
    Write-Host "FAILED! Exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Red
    exit $LASTEXITCODE
}
