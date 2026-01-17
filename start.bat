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
echo [2/4] Verificando modelos...
if not exist "models" mkdir models
if not exist "models\nomic-embed-text-v1.5.Q4_K_M.gguf" (
    echo    - Descargando Nomic Embeddings ^(274MB^)...
    curl -k --ssl-no-revoke -L -o "models\nomic-embed-text-v1.5.Q4_K_M.gguf" "https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf?download=true"
)

echo.
echo [3/4] Iniciando Brain Stack...
call :START_SERVERS_INTERNAL

timeout /t 3 /nobreak >nul
echo.
echo [4/4] Iniciando App...
npm start
goto MENU

:APP_ONLY
echo.
echo Iniciando Solo App...
npm start
goto MENU

:SERVER_ONLY
echo.
echo Iniciando Solo Server Stack (Chat + Vectors)...

if not exist "models" mkdir models
if not exist "models\nomic-embed-text-v1.5.Q4_K_M.gguf" (
    echo    - Descargando Nomic Embeddings...
    curl -k --ssl-no-revoke -L -o "models\nomic-embed-text-v1.5.Q4_K_M.gguf" "https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q4_K_M.gguf?download=true"
)

start "GitTeach Brain (LFM 2.5)" /MIN cmd /k scripts\start_brain_gpu.bat
start "GitTeach Vectors (Nomic)" /MIN cmd /k scripts\start_vectors_cpu.bat

echo.
echo Servidores Iniciados. Presione una tecla para volver al menu...
pause
goto MENU

:KILL_ALL
taskkill /F /IM llama-server.exe /T 2>nul
taskkill /F /IM electron.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
echo Cleaned.
pause
goto MENU
