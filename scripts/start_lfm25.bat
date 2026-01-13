@echo off
title LFM 2.5 Server (Vulkan GPU)
color 0B

:: Navigate to project root
cd /d %~dp0..

echo ============================================
echo          LFM 2.5 SERVER - VULKAN GPU
echo ============================================
echo.

set MODEL_PATH=..\models\LFM2.5-1.2B-Instruct-Q8_0.gguf
set PORT=8000

if not exist "%MODEL_PATH%" (
    echo [ERROR] Model not found at: %MODEL_PATH%
    pause
    exit /b 1
)

if not exist "server\llama-server.exe" (
    echo [ERROR] llama-server.exe not found in server/ directory!
    pause
    exit /b 1
)

echo Starting LFM 2.5...
echo Model: %MODEL_PATH%
echo Port: %PORT%
echo GPU: Vulkan (All layers)
echo.

cd server
.\llama-server.exe --model "%MODEL_PATH%" --port %PORT% --host 0.0.0.0 --n-gpu-layers 999 --ctx-size 8192 --chat-template chatml

pause
