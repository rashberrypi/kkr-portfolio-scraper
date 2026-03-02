#!/bin/bash
set -e

echo "🚀 KKR Scraper - Optimized Setup"

# 1. Kill the zombie process on 8080 (Fixes EACCES)
echo "🔍 Clearing port 8080..."
# Using a more robust Git Bash friendly way to kill the port
PID=$(netstat -ano | grep :8080 | awk '{print $5}' | sort -u | head -n 1)
if [ ! -z "$PID" ] && [ "$PID" -gt 0 ]; then
    taskkill //F //PID $PID 2>/dev/null || true
fi


# 2. Run local install (Updates package-lock.json if you added new imports)
echo "📦 Updating local dependencies..."
npm install --prefer-offline



# 3. Start Docker (Building only if files changed)
echo "🆙 Starting Docker containers..."
docker-compose up -d --build



# 4. Wait for API Health
echo "⏳ Waiting for API to be healthy..."
until curl -s -I http://localhost:8080/health | grep "200 OK" > /dev/null; do
    printf '.'
    sleep 2
done



echo -e "\n✅ App is live! Triggering KKR Sync..."
curl -X POST http://localhost:8080/scraper/sync/kkr

echo ""
echo "🎉 Development environment is ready!"
echo "• Swagger UI: http://localhost:8080/api"
echo "• Health:     http://localhost:8080/health"

echo "📜 Attaching to logs (Press Ctrl+C to stop viewing, container will keep running)..."
docker-compose logs -f app

