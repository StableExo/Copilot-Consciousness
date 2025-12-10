#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# Quick Start Script for Autonomous Warden with Live Collaboration
# ═══════════════════════════════════════════════════════════════
# This script helps you get started with autonomous execution
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Banner
echo ""
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🤖 AUTONOMOUS WARDEN - QUICK START${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check Node.js version
echo -e "${BLUE}Checking Node.js version...${NC}"
NODE_VERSION=$(node --version)
echo "  Node.js: $NODE_VERSION"

if [[ ! "$NODE_VERSION" =~ ^v22\. ]]; then
    echo -e "${RED}  ⚠️  Node.js 22+ required. Current: $NODE_VERSION${NC}"
    echo -e "${YELLOW}  Run: nvm use 22${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Node.js version OK${NC}"
echo ""

# Check if .env exists
echo -e "${BLUE}Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}  ⚠️  .env file not found!${NC}"
    echo -e "${YELLOW}  Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}  ⚠️  Please edit .env with your configuration${NC}"
    echo -e "${YELLOW}  Required: WALLET_PRIVATE_KEY, BASE_RPC_URL${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ .env file exists${NC}"
echo ""

# Check critical env vars
echo -e "${BLUE}Validating critical configuration...${NC}"
source .env

MISSING_VARS=()

if [[ -z "${WALLET_PRIVATE_KEY:-}" ]] || [[ "${WALLET_PRIVATE_KEY}" == *"YOUR"* ]]; then
    MISSING_VARS+=("WALLET_PRIVATE_KEY")
fi

if [[ -z "${BASE_RPC_URL:-}" ]] || [[ "${BASE_RPC_URL}" == *"YOUR"* ]]; then
    MISSING_VARS+=("BASE_RPC_URL")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}  ⚠️  Missing configuration: ${MISSING_VARS[*]}${NC}"
    echo -e "${YELLOW}  Please edit .env and set these values${NC}"
    exit 1
fi

echo -e "${GREEN}  ✓ Configuration valid${NC}"
echo ""

# Check if dependencies are installed
echo -e "${BLUE}Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  Installing dependencies...${NC}"
    npm install
fi
echo -e "${GREEN}  ✓ Dependencies installed${NC}"
echo ""

# Check if pools are preloaded
echo -e "${BLUE}Checking pool cache...${NC}"
POOL_CACHE=".memory/pool-cache/base-8453.json"
if [ ! -f "$POOL_CACHE" ]; then
    echo -e "${YELLOW}  No pool cache found, preloading...${NC}"
    echo -e "${CYAN}  This may take 1-2 minutes...${NC}"
    npm run preload:pools
    echo -e "${GREEN}  ✓ Pools preloaded${NC}"
else
    echo -e "${GREEN}  ✓ Pool cache exists${NC}"
fi
echo ""

# Display configuration
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Current Configuration${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "  Chain ID: ${GREEN}${CHAIN_ID:-8453}${NC}"
echo -e "  Network: ${GREEN}$([ "${CHAIN_ID:-8453}" == "8453" ] && echo "Base Mainnet" || echo "Unknown")${NC}"
echo -e "  Dry Run: ${GREEN}${DRY_RUN:-true}${NC} $([ "${DRY_RUN:-true}" == "true" ] && echo "(Simulation Mode)" || echo -e "${RED}(LIVE TRADING!)${NC}")"
echo -e "  Learning Mode: ${GREEN}${LEARNING_MODE:-true}${NC}"
echo -e "  Min Profit: ${GREEN}${MIN_PROFIT_PERCENT:-0.5}%${NC}"
echo -e "  Max Slippage: ${GREEN}${MAX_SLIPPAGE:-0.005}${NC} (0.5%)"
echo -e "  Scan Interval: ${GREEN}${SCAN_INTERVAL:-800}ms${NC}"
echo ""

# Safety warning if not dry run
if [[ "${DRY_RUN:-true}" != "true" ]]; then
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ⚠️  WARNING: LIVE TRADING MODE${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  This will execute REAL transactions with REAL money!${NC}"
    echo -e "${YELLOW}  Press Ctrl+C within 10 seconds to abort...${NC}"
    echo ""
    for i in {10..1}; do
        echo -ne "\r  Starting in ${CYAN}$i${NC} seconds... "
        sleep 1
    done
    echo ""
    echo ""
fi

# Show menu
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Choose Your Launch Mode${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}1)${NC} 🎮 ${CYAN}Live Collaboration Interface${NC} (Recommended)"
echo "   → Web interface at http://localhost:3001"
echo "   → Real-time parameter control"
echo "   → Visual metrics dashboard"
echo "   → Start/stop TheWarden with buttons"
echo ""
echo -e "${GREEN}2)${NC} 🤖 ${CYAN}Autonomous Controller${NC} (CLI)"
echo "   → Command-line interface"
echo "   → Auto-adjusts parameters"
echo "   → Logs to terminal"
echo ""
echo -e "${GREEN}3)${NC} 🚀 ${CYAN}Direct TheWarden${NC}"
echo "   → Standard execution"
echo "   → No parameter automation"
echo ""
echo -e "${GREEN}4)${NC} 📊 ${CYAN}Monitor Mode${NC}"
echo "   → 2-minute cycles with analysis"
echo "   → Diagnostic information"
echo ""
echo -e "${YELLOW}0)${NC} Exit"
echo ""

read -p "Select mode [1-4, 0]: " MODE

case $MODE in
    1)
        echo ""
        echo -e "${GREEN}Starting Live Collaboration Interface...${NC}"
        echo -e "${CYAN}Opening web interface at http://localhost:3001${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        echo ""
        sleep 2
        npm run warden:collab:auto
        ;;
    2)
        echo ""
        echo -e "${GREEN}Starting Autonomous Controller...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        echo ""
        read -p "Run for specific duration? (seconds, or Enter for continuous): " DURATION
        if [ -n "$DURATION" ]; then
            npm run autonomous:control -- --duration=$DURATION
        else
            npm run autonomous:control
        fi
        ;;
    3)
        echo ""
        echo -e "${GREEN}Starting TheWarden directly...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        echo ""
        ./TheWarden
        ;;
    4)
        echo ""
        echo -e "${GREEN}Starting Monitor Mode...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        echo ""
        ./TheWarden --monitor
        ;;
    0)
        echo ""
        echo -e "${CYAN}Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo ""
        echo -e "${RED}Invalid selection${NC}"
        exit 1
        ;;
esac
