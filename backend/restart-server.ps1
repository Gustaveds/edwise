# Script to restart the EdWise backend server
# Kills any process on port 3001 and starts the server

Write-Host "🔄 Reiniciando servidor backend..." -ForegroundColor Cyan

# Find and kill process on port 3001
$process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Write-Host "⚠️  Matando processo existente (PID: $process)..." -ForegroundColor Yellow
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Navigate to server directory and start
Set-Location -Path "$PSScriptRoot"
Write-Host "✅ Iniciando servidor em http://localhost:3001..." -ForegroundColor Green
node index.js
