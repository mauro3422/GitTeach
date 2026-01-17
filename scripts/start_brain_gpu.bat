@echo off
title GitTeach Brain (LFM 2.5 - GPU)
color 0B
echo ==================================================
echo       GITTEACH BRAIN (GPU) - PORT 8000
echo ==================================================
echo.

set MODEL_PATH=models\LFM2.5-1.2B-Instruct-Q8_0.gguf

if not exist "%MODEL_PATH%" (
    echo [ERROR] Model not found: %MODEL_PATH%
    pause
    exit /b
)

echo [READY] Starting Brain Server...
server\llama-server.exe --model "%MODEL_PATH%" --port 8000 --host 0.0.0.0 --n-gpu-layers 999 --ctx-size 81920 --parallel 4 -cb --chat-template chatml
