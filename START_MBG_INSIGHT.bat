@echo off
setlocal

title MBG Insight Launcher

REM =========================================================
REM MBG INSIGHT - BACKEND + FRONTEND LAUNCHER
REM Letakkan file BAT ini di folder utama MBG-INSIGHT
REM =========================================================

cd /d "%~dp0"

set "ROOT=%CD%"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"
set "PYTHON="

echo.
echo ==============================================
echo          MENJALANKAN MBG INSIGHT
echo ==============================================
echo.

REM =========================================================
REM CARI PYTHON VIRTUAL ENVIRONMENT SECARA OTOMATIS
REM =========================================================

if exist "%ROOT%\.venv312\Scripts\python.exe" (
    set "PYTHON=%ROOT%\.venv312\Scripts\python.exe"
)

if not defined PYTHON if exist "%BACKEND%\.venv312\Scripts\python.exe" (
    set "PYTHON=%BACKEND%\.venv312\Scripts\python.exe"
)

if not defined PYTHON if exist "%ROOT%\.venv\Scripts\python.exe" (
    set "PYTHON=%ROOT%\.venv\Scripts\python.exe"
)

if not defined PYTHON if exist "%BACKEND%\.venv\Scripts\python.exe" (
    set "PYTHON=%BACKEND%\.venv\Scripts\python.exe"
)

REM =========================================================
REM CEK VIRTUAL ENVIRONMENT
REM =========================================================

if not defined PYTHON (
    echo [ERROR] Virtual environment Python tidak ditemukan.
    echo.
    echo Lokasi yang diperiksa:
    echo %ROOT%\.venv312
    echo %BACKEND%\.venv312
    echo %ROOT%\.venv
    echo %BACKEND%\.venv
    echo.
    echo Jalankan kembali virtual environment atau periksa lokasi folder venv.
    echo.
    pause
    exit /b 1
)

echo [OK] Python ditemukan:
echo %PYTHON%
echo.

REM =========================================================
REM CEK BACKEND
REM =========================================================

if not exist "%BACKEND%\main.py" (
    echo [ERROR] backend\main.py tidak ditemukan.
    echo Lokasi:
    echo %BACKEND%\main.py
    echo.
    pause
    exit /b 1
)

REM =========================================================
REM CEK FRONTEND
REM =========================================================

if not exist "%FRONTEND%\package.json" (
    echo [ERROR] frontend\package.json tidak ditemukan.
    echo Lokasi:
    echo %FRONTEND%\package.json
    echo.
    pause
    exit /b 1
)

REM =========================================================
REM JALANKAN BACKEND FASTAPI
REM =========================================================

echo [1/3] Menjalankan Backend FastAPI...

start "MBG Insight - Backend" /D "%BACKEND%" cmd /k ""%PYTHON%" -m uvicorn main:app --host 127.0.0.1 --port 8000"

REM =========================================================
REM TUNGGU BACKEND MULAI
REM =========================================================

timeout /t 5 /nobreak >nul

REM =========================================================
REM JALANKAN FRONTEND
REM =========================================================

echo [2/3] Menjalankan Frontend ReactJS / Vite...

start "MBG Insight - Frontend" /D "%FRONTEND%" cmd /k "npm run dev"

REM =========================================================
REM TUNGGU FRONTEND MULAI
REM =========================================================

echo [3/3] Menunggu aplikasi siap...

timeout /t 8 /nobreak >nul

REM =========================================================
REM BUKA BROWSER
REM =========================================================

start "" "http://localhost:5173"

echo.
echo ==============================================
echo          MBG INSIGHT DIJALANKAN
echo ==============================================
echo.
echo Backend  : http://127.0.0.1:8000
echo Frontend : http://localhost:5173
echo.
echo JANGAN TUTUP jendela:
echo - MBG Insight - Backend
echo - MBG Insight - Frontend
echo.
echo Selama dashboard masih digunakan.
echo ==============================================
echo.

endlocal
exit