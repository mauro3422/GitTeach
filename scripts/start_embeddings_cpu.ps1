# Script para lanzar servidor de Embeddings en CPU (Puerto 8001)
# Uso: ./start_embeddings_cpu.ps1
# Requiere: llama-server.exe en el PATH o carpeta actual y el modelo nomic-embed o similar.

Write-Host "🚀 Iniciando Servidor de Embeddings (CPU Mode)..." -ForegroundColor Cyan
Write-Host "⚠️ Asegúrate de tener 'nomic-embed-text-v1.5.gguf' (o similar) en tu carpeta de modelos." -ForegroundColor Yellow

# Configuración
$ModelPath = "models/nomic-embed-text-v1.5.Q4_K_M.gguf" # Ajusta esto a tu modelo real
$Port = 8001

# Comando
# -ngl 0 : Force 0 layers to GPU (CPU Only)
# -cb : Continuous batching
# --embedding : Enable embedding endpoint
# --port : Set port
$Cmd = "./llama-server.exe -m $ModelPath --port $Port --embedding -ngl 0 -cb -c 2048"

Write-Host "Ejecutando: $Cmd" -ForegroundColor Gray

# Nota: El usuario debe ejecutar esto manualmente, no lo ejecutamos automáticamente por seguridad de rutas.
Write-Host "Copia y pega el siguiente comando si tu exe y modelo están en otro lado:"
Write-Host "./llama-server.exe -m path/to/model.gguf --port 8001 --embedding -ngl 0" -ForegroundColor Green
