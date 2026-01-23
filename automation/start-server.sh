#!/bin/bash
# start-server.sh - Production Server Startup Script (PM2)
# Usage: bash start-server.sh

echo "🚀 ========================================"
echo "   APEX PLATFORM - SERVER STARTUP"
echo "========================================"

PROJECT_DIR=~/Apex-Platform-2026/packages/core

# Navigate to project
cd $PROJECT_DIR || { echo "❌ Project directory not found"; exit 1; }

# Stop existing processes
echo "[1/3] 🧹 Stopping existing processes..."
pm2 delete apex-core 2>/dev/null || true
pkill -f 'node dist/main.js' 2>/dev/null || true
echo "✅ Processes stopped"

# Start with PM2
echo "[2/3] 🚀 Starting Core API with PM2..."
pm2 start dist/main.js --name apex-core --env production
pm2 save
echo "✅ Core API started"

# Health check
echo "[3/3] 🔍 Verifying health..."
sleep 5
curl -s http://localhost:3001/api/app/health || echo "⚠️ Health check failed"

echo ""
echo "🎉 ========================================"
echo "   SERVER STARTUP COMPLETE!"
echo "   API: http://localhost:3001/api/docs"
echo "   Logs: pm2 logs apex-core"
echo "========================================"
