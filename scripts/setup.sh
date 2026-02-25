#!/bin/bash
set -e

# 1. Environment Setup
echo "🚀 KKR Scraper - Local Development Setup"
export NODE_TLS_REJECT_UNAUTHORIZED=0

# 2. Sync Dependencies
echo "📦 Installing npm dependencies..."
npm install

# 3. Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker."
    exit 1
fi

# 4. Start Infrastructure (Without deleting data)
echo "📦 Starting Docker containers..."
# This starts MongoDB and builds your NestJS app
docker-compose up --build -d

# 5. Wait for API to be ready
echo "⏳ Waiting for API to be healthy..."
until $(curl --output /dev/null --silent --head --fail http://localhost:3000/health); do
    printf '.'
    sleep 2
done

echo -e "\n✅ API is live!"

# 6. Trigger Sync (Only if you want it to run on every start)
echo "🔄 Triggering KKR Sync..."
curl -X POST http://localhost:3000/scraper/sync/kkr

echo ""
echo "🎉 Development environment is ready!"
echo "• Swagger UI: http://localhost:3000/api"
echo "• Health:     http://localhost:3000/health"