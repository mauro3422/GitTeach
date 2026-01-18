@echo off
title GitTeach Mappers (LFM 2.5 - CPU)
color 0E
echo ==================================================
echo       GITTEACH MAPPERS (CPU) - PORT 8002
echo ==================================================
echo.

REM Usa el mismo modelo Q8 que GPU para calidad consistente
set MODEL_PATH=models\LFM2.5-1.2B-Instruct-Q8_0.gguf

if not exist "%MODEL_PATH%" (
    echo [ERROR] No LFM model found in models\
    echo        Please download LFM2.5-1.2B-Instruct-Q8_0.gguf
    pause
    exit /b
)

echo [READY] Starting Mapper Server (CPU Mode)...
echo [INFO] Port 8002 - Threads 6 - Parallel 3 - Context 16K

server\llama-server.exe --model "%MODEL_PATH%" --port 8002 --host 127.0.0.1 -ngl 0 --ctx-size 16384 --threads 6 --parallel 3 -cb --chat-template chatml

echo [INFO] Mapper Server stopped.
