@echo off
TITLE GitTeach // Electron Tracer Launcher

echo 🚀 Launching GitTeach Tracer in Electron...

:: Check for node_modules
IF NOT EXIST "node_modules" (
    echo 📦 installing dependencies...
    call npm install
)

:: Run electron with the tracer flag
call npm start -- --tracer

pause
