#!/bin/bash
# Quick Start Guide - Blockchain Deployment
# 
# This script guides you through the essential steps to get TheWarden
# ready for blockchain deployment.

set -e  # Exit on error

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🚀 TheWarden Blockchain Deployment Quick Start"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v)
REQUIRED_VERSION="v22.12.0"

echo "📋 Checking prerequisites..."
echo ""

if [[ "$NODE_VERSION" == "$REQUIRED_VERSION"* ]]; then
    echo "✅ Node.js: $NODE_VERSION (Required: $REQUIRED_VERSION+)"
else
    echo "❌ Node.js: $NODE_VERSION (Required: $REQUIRED_VERSION+)"
    echo ""
    echo "   Please upgrade Node.js:"
    echo "   $ nvm install 22.12.0"
    echo "   $ nvm use 22.12.0"
    echo ""
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed"
    echo ""
    echo "   Installing dependencies..."
    npm install
    echo ""
fi

echo "✅ Dependencies installed"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found"
    echo ""
    echo "   Creating .env from template..."
    cp .env.example .env
    echo ""
    echo "✅ Created .env file"
    echo ""
    echo "   ⚠️  IMPORTANT: Edit .env and configure:"
    echo "   - BASE_RPC_URL (get from https://www.alchemy.com/)"
    echo "   - WALLET_PRIVATE_KEY (your wallet's private key)"
    echo "   - TITHE_WALLET_ADDRESS (receives 70% of profits)"
    echo ""
    echo "   Run this script again after configuring .env"
    exit 0
else
    echo "✅ .env file exists"
    echo ""
fi

# Run deployment status check
echo "🔍 Checking deployment status..."
echo ""
npx tsx scripts/verify-deployment-status.ts

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  📚 Next Steps"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "1. Configure .env with your RPC URL, wallet, and tithe address"
echo "2. Run tests: npm test"
echo "3. Run TheWarden in dry-run mode: npm run dev"
echo "4. Deploy to testnet: See docs/BLOCKCHAIN_DEPLOYMENT_STATUS.md"
echo ""
echo "For detailed guidance, read:"
echo "  - docs/BLOCKCHAIN_DEPLOYMENT_STATUS.md"
echo "  - docs/MAINNET_DEPLOYMENT.md"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
