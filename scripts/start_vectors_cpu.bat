@echo off
REM Pre-cleaning to avoid port collisions (before setting our own title)
taskkill /F /FI "WINDOWTITLE eq GitTeach Vectors (Nomic)" /T 2>nul

title GitTeach Vectors (Nomic)
color 0D
echo ==================================================
echo       GITTEACH VECTORS (NOMIC) - PORT 8001
echo ==================================================
echo.

set MODEL_PATH=models\nomic-embed-text-v1.5.Q4_K_M.gguf

if not exist "%MODEL_PATH%" (
    echo [ERROR] No Embedding model found in models\
    echo        Please download nomic-embed-text-v1.5.Q4_K_M.gguf
    pause
    exit /b
)

REM === LOG ROTATION ===
REM Archive previous log with timestamp if exists
if exist "logs\ai_vectors_cpu.log" (
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
    set timestamp=%datetime:~0,8%_%datetime:~8,6%
    move "logs\ai_vectors_cpu.log" "logs\ai_vectors_cpu_%timestamp%.log" >nul 2>&1
    echo [LOG] Previous log archived.
)

echo [READY] Starting Vector Server (CPU Mode)...
server\llama-server.exe --model "%MODEL_PATH%" --port 8001 --host 127.0.0.1 --embedding -ngl 0 -c 2048 --threads 2 --parallel 2 -b 1024 -ub 1024 --log-file logs\ai_vectors_cpu.log
