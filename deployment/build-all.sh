#!/bin/bash
# Build all Docker images for the arbitrage bot services

set -e

VERSION=${1:-latest}
REGISTRY=${2:-arbitrage-bot}

echo "🏗️  Building all services..."
echo "Version: $VERSION"
echo "Registry: $REGISTRY"
echo ""

SERVICES=("scanner" "pathfinding" "ml" "execution" "analytics" "bridge" "dashboard")

for service in "${SERVICES[@]}"; do
    echo "📦 Building $service..."
    docker build \
        -f docker/Dockerfile.$service \
        -t $REGISTRY/$service:$VERSION \
        -t $REGISTRY/$service:latest \
        .
    echo "✅ Built $service"
    echo ""
done

echo "🎉 All services built successfully!"
echo ""
echo "To push images to registry:"
echo "  docker push $REGISTRY/scanner:$VERSION"
echo "  docker push $REGISTRY/pathfinding:$VERSION"
echo "  # ... etc"
echo ""
echo "Or use the push script:"
echo "  ./deployment/push-all.sh $VERSION $REGISTRY"
