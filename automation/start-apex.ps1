# start-apex.ps1 - Local Development Startup Script
# Usage: .\start-apex.ps1

Write-Host "🚀 ========================================" -ForegroundColor Cyan
Write-Host "   APEX PLATFORM - LOCAL DEV STARTUP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$projectRoot = "C:\Users\Dell\Desktop\Apex-Platform-2026"

# Check if ports are available
$ports = @(3000, 3001, 8080)
foreach ($port in $ports) {
    $inUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($inUse) {
        Write-Host "⚠️ Port $port is in use. Attempting to free..." -ForegroundColor Yellow
        Stop-Process -Id (Get-NetTCPConnection -LocalPort $port).OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

# Start Core API (Port 3001)
Write-Host "`n[1/3] 🔧 Starting Core API on port 3001..." -ForegroundColor Yellow
$coreProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\packages\core'; npm run start:dev" -PassThru
Write-Host "✅ Core API started (PID: $($coreProcess.Id))" -ForegroundColor Green

# Start Storefront (Port 3000)
Write-Host "`n[2/3] 🛍️ Starting Storefront on port 3000..." -ForegroundColor Yellow
$storefrontProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\packages\storefront'; npm run dev" -PassThru
Write-Host "✅ Storefront started (PID: $($storefrontProcess.Id))" -ForegroundColor Green

# Placeholder for Admin Panel (Port 8080)
Write-Host "`n[3/3] 📊 Admin Panel (Port 8080) - Not yet configured" -ForegroundColor Gray

Write-Host "`n🎉 ========================================" -ForegroundColor Green
Write-Host "   ALL SERVICES STARTED!" -ForegroundColor Green
Write-Host "   Core API:    http://localhost:3001/api/docs" -ForegroundColor White
Write-Host "   Storefront:  http://localhost:3000" -ForegroundColor White
Write-Host "   Admin:       http://localhost:8080 (pending)" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Green
