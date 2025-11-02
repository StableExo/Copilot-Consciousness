#!/bin/bash
# Push all Docker images to registry

set -e

VERSION=${1:-latest}
REGISTRY=${2:-arbitrage-bot}

echo "🚀 Pushing all images to registry..."
echo "Version: $VERSION"
echo "Registry: $REGISTRY"
echo ""

SERVICES=("scanner" "pathfinding" "ml" "execution" "analytics" "bridge" "dashboard")

for service in "${SERVICES[@]}"; do
    echo "📤 Pushing $service..."
    docker push $REGISTRY/$service:$VERSION
    if [ "$VERSION" != "latest" ]; then
        docker push $REGISTRY/$service:latest
    fi
    echo "✅ Pushed $service"
    echo ""
done

echo "🎉 All images pushed successfully!"
