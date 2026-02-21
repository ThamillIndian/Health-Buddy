@echo off
REM Chronic Health Buddy - Quick Start Script

echo.
echo ============================================
echo   Chronic Health Buddy - ONE DAY BUILD
echo ============================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

echo [1/4] Setting up backend...
cd backend

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt >nul 2>&1

echo Backend setup complete!
echo.

REM Start backend
echo [2/4] Starting backend server...
echo Starting FastAPI on http://localhost:8000
echo Press Ctrl+C to stop.
echo.
start python -m uvicorn app.main:app --reload

timeout /t 3 /nobreak

REM Go to frontend
cd ..\frontend

echo [3/4] Installing frontend dependencies...
if not exist node_modules (
    call npm install >nul 2>&1
)

echo [4/4] Starting frontend server...
echo Frontend will start on http://localhost:3000
echo Press Ctrl+C to stop.
echo.

call npm run dev

pause
