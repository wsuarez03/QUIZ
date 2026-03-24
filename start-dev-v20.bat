@echo off
setlocal enabledelayedexpansion
cd "c:\Users\Administracion\OneDrive - VALSER INDUSTRIALES S.A.S\Documentos\proyecto\LABORATORIO\PRODUCCION\QUIZ\quiz-app"
echo Starting quiz-app with Node.js 20.11.1...
set PATH=C:\node-v20.11.1-win-x64;%PATH%
set NODE_OPTIONS=--max-old-space-size=4096
echo NODE_OPTIONS: %NODE_OPTIONS%
echo PATH contains node: 
where node.exe
echo.
echo Cleaning .next directory...
if exist .next rmdir /s /q .next
echo.
echo Running npm run dev...
call npm run dev
if !errorlevel! neq 0 (
    echo ERROR: npm run dev failed with code !errorlevel!
    pause
)
