@echo off
echo ============================================
echo  تثبيت الخادم (متعدد المستخدمين عبر الشبكة)
echo  Install Server (Multi-user over network)
echo ============================================
echo.
echo 1. Download and install Node.js from: https://nodejs.org
echo 2. Then run this script again
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js first from: https://nodejs.org
    pause
    exit /b 1
)

echo Node.js found! Installing backend dependencies...
cd /d "%~dp0backend"
npm install

echo.
echo Installing frontend dependencies...
cd /d "%~dp0frontend"
npm install

echo.
echo ============================================
echo Starting the server...
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo ============================================
echo.

start "Backend Server" cmd /k "cd /d "%~dp0backend" && npm start"
timeout /t 3
start "Frontend Dev" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Server started! Open http://localhost:3000 in your browser
pause
