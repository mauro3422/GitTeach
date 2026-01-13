@echo off
title GitTeach Launcher
color 0A

echo ==================================================
echo       GITTEACH - LAUNCHER (v1.0)
echo ==================================================

:: 1. Limpieza de Procesos Previos
echo.
echo [1/3] Limpiando procesos huerfanos...
taskkill /F /IM llama-server.exe /T 2>nul
taskkill /F /IM electron.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
echo Procesos limpios.

:: 2. Iniciar Servidor de IA (Segundo Plano)
echo.
echo [2/3] Iniciando LFM 2.5 Server (Port 8000)...
if not exist "server\llama-server.exe" (
    echo [ERROR] No se encuentra server\llama-server.exe
    pause
    exit /b
)

:: Lanzamos en una nueva ventana minimizada para que no moleste pero se vea si hay errores
start "GitTeach Brain (LFM 2.5)" /MIN server\llama-server.exe --model "models\LFM2.5-1.2B-Instruct-Q8_0.gguf" --port 8000 --host 0.0.0.0 --n-gpu-layers 999 --ctx-size 8192 --chat-template chatml

:: Esperar un poco a que cargue (opcional, la app reintenta)
timeout /t 3 /nobreak >nul

:: 3. Iniciar Aplicacion Electron
echo.
echo [3/3] Iniciando App...
npm start

echo.
echo App cerrada. Apagando servidor de IA...
taskkill /F /IM llama-server.exe /T >nul
echo Bye!
timeout /t 2 >nul
