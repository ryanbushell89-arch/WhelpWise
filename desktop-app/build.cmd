@echo off
setlocal

echo ========================================
echo  Invoicing Lite - Build
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.11+ from https://python.org
    pause & exit /b 1
)

echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/4] Installing dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: pip install failed.
    pause & exit /b 1
)

echo [4/4] Building InvoicingLite.exe...
pyinstaller InvoicingLite.spec --noconfirm
if errorlevel 1 (
    echo ERROR: PyInstaller build failed.
    pause & exit /b 1
)

echo.
echo ========================================
echo  Done! Your exe is at:
echo  %~dp0dist\InvoicingLite.exe
echo ========================================
pause
