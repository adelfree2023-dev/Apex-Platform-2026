# deploy-all.ps1 - Master Deployment Script for Apex Platform
# Usage: .\deploy-all.ps1

param(
    [string]$server = "34.186.7.87",
    [string]$user = "dell",
    [string]$keyPath = "C:\Users\Dell\.ssh\gcp_key_new",
    [string]$remotePath = "~/Apex-Platform-2026/packages/core"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 ========================================" -ForegroundColor Cyan
Write-Host "   APEX PLATFORM - MASTER DEPLOYMENT" -ForegroundColor Cyan
Write-Host "   Server: $server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Build locally
Write-Host "`n[1/5] 🔧 Building Core locally..." -ForegroundColor Yellow
Set-Location "C:\Users\Dell\Desktop\Apex-Platform-2026\packages\core"
npm run build
if (-not (Test-Path "dist/main.js")) {
    Write-Host "❌ Build failed: dist/main.js not found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green

# Step 2: Clean server
Write-Host "`n[2/5] 🧹 Cleaning server environment..." -ForegroundColor Yellow
ssh -i $keyPath -o StrictHostKeyChecking=no "$user@$server" "pkill -f 'node' || true; cd $remotePath; rm -rf dist"
Write-Host "✅ Server cleaned" -ForegroundColor Green

# Step 3: Transfer files
Write-Host "`n[3/5] 📦 Transferring build artifacts..." -ForegroundColor Yellow
scp -i $keyPath -o StrictHostKeyChecking=no -r dist "$user@$server`:$remotePath/"
scp -i $keyPath -o StrictHostKeyChecking=no package.json package-lock.json "$user@$server`:$remotePath/"
Write-Host "✅ Files transferred" -ForegroundColor Green

# Step 4: Install production dependencies
Write-Host "`n[4/5] ⚙️ Installing production dependencies on server..." -ForegroundColor Yellow
ssh -i $keyPath -o StrictHostKeyChecking=no "$user@$server" "cd $remotePath; npm ci --production --silent"
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Step 5: Start with PM2
Write-Host "`n[5/5] 🚀 Starting application with PM2..." -ForegroundColor Yellow
ssh -i $keyPath -o StrictHostKeyChecking=no "$user@$server" "cd $remotePath; pm2 delete apex-core 2>/dev/null || true; pm2 start dist/main.js --name apex-core --env production; pm2 save"
Write-Host "✅ Application started" -ForegroundColor Green

# Verification
Write-Host "`n🔍 Verifying deployment..." -ForegroundColor Cyan
Start-Sleep -Seconds 5
$healthCheck = ssh -i $keyPath -o StrictHostKeyChecking=no "$user@$server" "curl -s http://localhost:3001/api/app/health"
Write-Host "Health Check Response: $healthCheck" -ForegroundColor White

Write-Host "`n🎉 ========================================" -ForegroundColor Green
Write-Host "   DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "   API: http://$server`:3001/api/docs" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
