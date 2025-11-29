#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# THEWARDEN MAINNET LAUNCHER
# ═══════════════════════════════════════════════════════════════
# This script launches TheWarden on mainnet with all safety checks
#
# Uses tsx for direct TypeScript execution - no build step required!
# ═══════════════════════════════════════════════════════════════

set -e  # Exit on error

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🔥 THEWARDEN MAINNET LAUNCHER 🔥"
echo "  (Direct TypeScript execution via tsx)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ ERROR: .env file not found"
    echo ""
    echo "Please create a .env file with your configuration."
    echo "See .env.example or MAINNET_QUICKSTART.md for guidance."
    echo ""
    exit 1
fi

# Load environment
source .env 2>/dev/null || true

# Validate configuration using tsx (direct TypeScript)
echo "🔍 Validating mainnet configuration..."
echo ""
node --import tsx scripts/validate-mainnet-config.ts

VALIDATION_EXIT=$?
if [ $VALIDATION_EXIT -ne 0 ]; then
    echo ""
    echo "❌ Configuration validation failed. Please fix errors above."
    echo ""
    exit 1
fi

echo ""
echo "✅ Configuration validated successfully"
echo ""

# Preload pool data using tsx (skip if valid cache exists)
echo "🔄 Preloading pool data..."
echo ""
POOL_CACHE_STATUS="❌ Not preloaded"
node --import tsx scripts/preload-pools.ts --skip-if-valid
PRELOAD_EXIT=$?
if [ $PRELOAD_EXIT -eq 0 ]; then
    POOL_CACHE_STATUS="✅ Pools preloaded and cached"
else
    echo ""
    echo "⚠️  Pool preload had issues but continuing..."
    echo "   TheWarden will fetch pools from network (slower)"
    POOL_CACHE_STATUS="⚠️  Will fetch from network"
    echo ""
fi

# Safety confirmation (only if running interactively)
if [ -t 0 ]; then
    echo ""
    echo "⚠️  WARNING: You are about to run TheWarden on mainnet"
    echo ""
    echo "   NODE_ENV: $NODE_ENV"
    echo "   DRY_RUN: $DRY_RUN"
    echo "   CHAIN_ID: $CHAIN_ID"
    echo "   Pool Cache: $POOL_CACHE_STATUS"
    echo ""
    echo "   This will execute REAL transactions with REAL money."
    echo ""
    read -p "   Are you sure you want to continue? (yes/no): " -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "❌ Launch cancelled by user"
        echo ""
        exit 0
    fi
fi

echo "═══════════════════════════════════════════════════════════"
echo "  🚀 LAUNCHING THEWARDEN ON MAINNET"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Press CTRL+C to stop TheWarden at any time"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Launch TheWarden using tsx (direct TypeScript execution)
node --import tsx src/main.ts

# Script should not reach here unless TheWarden exits
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  TheWarden has stopped"
echo "═══════════════════════════════════════════════════════════"
echo ""
