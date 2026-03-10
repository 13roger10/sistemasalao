@echo off
echo ========================================
echo Limpando processos Node.js e cache...
echo ========================================

REM Matar todos os processos Node
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Remover cache do Next.js
rmdir /s /q ".next" >nul 2>&1
timeout /t 1 /nobreak >nul

echo.
echo ========================================
echo Iniciando servidor Next.js...
echo ========================================
echo.

REM Iniciar servidor
npm run dev
