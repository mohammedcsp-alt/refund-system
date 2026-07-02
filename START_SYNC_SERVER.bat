@echo off
echo ============================================
echo  خادم المزامنة (متعدد الأجهزة عبر الشبكة)
echo  Sync Server (Multi-device over LAN)
echo ============================================
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js first from: https://nodejs.org
    pause
    exit /b 1
)

cd /d "%~dp0sync-server"
if not exist node_modules (
    echo Installing dependencies for the first time...
    call npm install
)

echo.
echo ============================================
echo Starting sync server...
echo On THIS PC open:    http://localhost:3500
echo On OTHER PCs open:  http://YOUR-LAN-IP:3500
echo    (find YOUR-LAN-IP by running "ipconfig" and reading IPv4 Address)
echo ============================================
echo.

node server.js
pause
