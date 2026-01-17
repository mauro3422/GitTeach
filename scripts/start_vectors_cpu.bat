@echo off
title GitTeach Vectors (Nomic - CPU)
color 0D
echo ==================================================
echo       GITTEACH VECTORS (CPU) - PORT 8001
echo ==================================================
echo.

set MODEL_PATH=models\nomic-embed-text-v1.5.Q4_K_M.gguf

if not exist "%MODEL_PATH%" (
    echo [ERROR] Model not found: %MODEL_PATH%
    pause
    exit /b
)

echo [READY] Starting Vector Server (CPU Mode)...
server\llama-server.exe --model "%MODEL_PATH%" --port 8001 --embedding -ngl 0 -c 2048 --threads 2 --parallel 1 -b 1024 -ub 1024
