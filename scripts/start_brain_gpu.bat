@echo off
REM Pre-cleaning to avoid port collisions (before setting our own title)
taskkill /F /FI "WINDOWTITLE eq GitTeach Brain (LFM 2.5 - GPU)" /T 2>nul

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

REM === LOG ROTATION ===
if exist "logs\ai_brain_gpu.log" (
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
    set timestamp=%datetime:~0,8%_%datetime:~8,6%
    move "logs\ai_brain_gpu.log" "logs\ai_brain_gpu_%timestamp%.log" >nul 2>&1
    echo [LOG] Previous log archived.
)

echo [READY] Starting Brain Server (GPU Mode)...
echo [INFO] Port 8000 - Parallel 4 - Context 48K (12K per slot)
echo [INFO] 8GB VRAM: Model 1.25GB + KV Cache ~2.4GB = OK

REM === MEMORY CALCULATION (8GB VRAM) ===
REM Model Q8_0: ~1.25 GB
REM KV Cache at q8_0 (48K): ~2.4 GB
REM Total: ~3.65 GB (leaves ~4.35 GB headroom)
REM Per slot: 48K / 4 = 12K tokens each

server\llama-server.exe --model "%MODEL_PATH%" --port 8000 --host 127.0.0.1 --n-gpu-layers 999 --ctx-size 49152 --parallel 4 -cb --cache-type-k q8_0 --cache-type-v q8_0 --flash-attn on --chat-template chatml --log-file logs\ai_brain_gpu.log

echo [INFO] Brain Server stopped.
