# run_tracer_electron.ps1
# Launches the GitTeach Tracer in Electron mode

Write-Host "🚀 Launching GitTeach Tracer in Electron..." -ForegroundColor Cyan

# Ensure dependencies are installed
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..."
    npm install
}

# Run electron with the tracer flag
# Use --no-sandbox if running in certain restricted environments
npm start -- --tracer
