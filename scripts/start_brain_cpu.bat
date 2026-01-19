@echo off
REM Pre-cleaning to avoid port collisions (before setting our own title)
taskkill /F /FI "WINDOWTITLE eq GitTeach Mappers (LFM 2.5 - CPU)" /T 2>nul

title GitTeach Mappers (LFM 2.5 - CPU)
color 0E
echo ==================================================
echo       GITTEACH MAPPERS (CPU) - PORT 8002
echo ==================================================
echo.

set MODEL_PATH=models\LFM2.5-1.2B-Instruct-Q8_0.gguf

if not exist "%MODEL_PATH%" (
    echo [ERROR] No LFM model found in models\
    echo        Please download LFM2.5-1.2B-Instruct-Q8_0.gguf
    pause
    exit /b
)

REM === LOG ROTATION ===
if exist "logs\ai_mapper_cpu.log" (
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
    set timestamp=%datetime:~0,8%_%datetime:~8,6%
    move "logs\ai_mapper_cpu.log" "logs\ai_mapper_cpu_%timestamp%.log" >nul 2>&1
    echo [LOG] Previous log archived.
)

echo [READY] Starting Mapper Server (CPU Mode)...
echo [INFO] Port 8002 - Threads 4 - Parallel 4 - Context 64K (16K per slot)
echo [INFO] 16GB RAM: Model 1.25GB + KV Cache ~3.2GB = OK

REM === MEMORY CALCULATION (16GB RAM) ===
REM Model Q8_0: ~1.25 GB
REM KV Cache at q8_0 (64K): ~3.2 GB
REM Total: ~4.45 GB (leaves ~11.5 GB for OS + apps)
REM Per slot: 64K / 4 = 16K tokens each

server\llama-server.exe --model "%MODEL_PATH%" --port 8002 --host 127.0.0.1 -ngl 0 --ctx-size 65536 --threads 4 --parallel 4 --batch-size 512 -cb --cache-type-k q8_0 --cache-type-v q8_0 --chat-template chatml --log-file logs\ai_mapper_cpu.log

echo [INFO] Mapper Server stopped.
