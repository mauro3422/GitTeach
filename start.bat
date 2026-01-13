@echo off
title GitTeach Launcher
color 0A

:MENU
cls
echo ==================================================
echo       GITTEACH - CONTROLS
echo ==================================================
echo.
echo [1] START ALL (Server + App) - Recommended for first run
echo [2] APP ONLY  (Electon)      - If server is already running
echo [3] BRAIN ONLY (Server)      - LFM 2.5 Server only
echo [4] KILL ALL                 - Stop background processes
echo [5] EXIT
echo.
set /p op="Select option: "

if "%op%"=="1" goto START_ALL
if "%op%"=="2" goto APP_ONLY
if "%op%"=="3" goto SERVER_ONLY
if "%op%"=="4" goto KILL_ALL
if "%op%"=="5" exit

goto MENU

:START_ALL
echo.
echo [1/2] Limpiando...
taskkill /F /IM llama-server.exe /T 2>nul
taskkill /F /IM electron.exe /T 2>nul
echo.
echo [2/2] Iniciando Brain...
start "GitTeach Brain (LFM 2.5)" /MIN server\llama-server.exe --model "models\LFM2.5-1.2B-Instruct-Q8_0.gguf" --port 8000 --host 0.0.0.0 --n-gpu-layers 999 --ctx-size 8192 --chat-template chatml
timeout /t 3 /nobreak >nul
echo.
echo [3/3] Iniciando App...
npm start
goto MENU

:APP_ONLY
echo.
echo Iniciando Solo App...
npm start
goto MENU

:SERVER_ONLY
echo.
echo Iniciando Solo Server...
start "GitTeach Brain (LFM 2.5)" server\llama-server.exe --model "models\LFM2.5-1.2B-Instruct-Q8_0.gguf" --port 8000 --host 0.0.0.0 --n-gpu-layers 999 --ctx-size 8192 --chat-template chatml
goto MENU

:KILL_ALL
taskkill /F /IM llama-server.exe /T 2>nul
taskkill /F /IM electron.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
echo Cleaned.
pause
goto MENU
