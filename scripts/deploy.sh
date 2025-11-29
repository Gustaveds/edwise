#!/bin/bash

# Use separate Docker config for this project (allows multiple logins)
export DOCKER_CONFIG=$HOME/.docker-edwise
export DOCKER_BUILDKIT=0

# Stop script on error
set -e

echo "🚀 Starting deployment process..."

# Create network if it doesn't exist
echo "🌐 Checking network..."
docker network inspect tpr_ia >/dev/null 2>&1 || \
    docker network create tpr_ia

echo "📦 Building images..."
docker-compose build

echo "⬆️ Pushing images to Docker Hub (thiagouni/edwise)..."
docker-compose push

# echo "🔄 Updating services..."
# docker-compose up -d

echo "✅ Build and Push finished successfully!"
