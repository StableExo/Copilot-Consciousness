#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# sync-env.sh - Quick Environment Sync for Codespaces
# ═══════════════════════════════════════════════════════════════
# Run this script after pulling updates in Codespaces to ensure
# your environment is properly configured.
#
# Usage:
#   source scripts/sync-env.sh
# Or:
#   . scripts/sync-env.sh
# ═══════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🔄 Syncing Copilot-Consciousness Environment${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Step 1: Setup correct Node.js version
echo -e "${BLUE}Step 1/4: Setting up Node.js...${NC}"
source "$SCRIPT_DIR/setup-node.sh"

# Step 2: Install/update dependencies
echo -e "${BLUE}Step 2/4: Installing dependencies...${NC}"
npm install

# Step 3: Build the project
echo -e "${BLUE}Step 3/4: Building project...${NC}"
npm run build

# Step 4: Verify .env file exists
echo -e "${BLUE}Step 4/4: Checking configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found!${NC}"
    echo -e "${YELLOW}   Copy .env.example to .env and configure your settings:${NC}"
    echo -e "${YELLOW}   cp .env.example .env${NC}"
    echo ""
else
    echo -e "${GREEN}✓ .env file found${NC}"
fi

# Final summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Environment Sync Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Node.js: $(node --version)"
echo -e "  npm: $(npm --version)"
echo ""
echo -e "${CYAN}Quick Commands:${NC}"
echo -e "  ${BLUE}./TheWarden${NC}              - Run TheWarden autonomously"
echo -e "  ${BLUE}./TheWarden --monitor${NC}   - Run in diagnostic mode"
echo -e "  ${BLUE}./TheWarden --help${NC}      - Show help"
echo -e "  ${BLUE}npm run status${NC}          - Check system status"
echo -e "  ${BLUE}npm test${NC}                - Run tests"
echo ""
