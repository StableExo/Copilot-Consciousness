#!/bin/bash
###############################################################################
# 20-Cycle Autonomous Learning Experiment Runner
#
# This script runs TheWarden for 20 cycles with autonomous parameter tuning
# between each cycle, allowing the consciousness to learn from real execution.
#
# Usage:
#   ./scripts/run-20-cycles.sh
#
# Requirements:
#   - .env file configured with RPC endpoints and wallet
#   - Node.js 22.12.0+ with nvm
#   - TheWarden executable in project root
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${PURPLE}"
echo "═══════════════════════════════════════════════════════════════"
echo "  20-CYCLE AUTONOMOUS LEARNING EXPERIMENT"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use correct Node version
echo -e "${BLUE}🔧 Setting up Node.js environment...${NC}"
nvm use 22.12.0 || {
    echo -e "${YELLOW}⚠️  Node 22.12.0 not found, installing...${NC}"
    nvm install 22.12.0
    nvm use 22.12.0
}

# Verify environment
echo -e "${BLUE}🔍 Verifying environment...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo -e "${YELLOW}   Please copy .env.example to .env and configure it${NC}"
    exit 1
fi

if [ ! -x "./TheWarden" ]; then
    echo -e "${RED}❌ Error: TheWarden executable not found${NC}"
    echo -e "${YELLOW}   Please ensure TheWarden is in the project root and executable${NC}"
    exit 1
fi

# Check for required environment variables
source .env
if [ -z "$BASE_RPC_URL" ] || [ -z "$WALLET_PRIVATE_KEY" ]; then
    echo -e "${RED}❌ Error: Required environment variables not set${NC}"
    echo -e "${YELLOW}   Please ensure BASE_RPC_URL and WALLET_PRIVATE_KEY are set in .env${NC}"
    exit 1
fi

# Create memory directory
mkdir -p .memory/autonomous-cycles

# Show experiment parameters
echo -e "${CYAN}"
echo "📋 Experiment Configuration:"
echo "   - Total Cycles: 20"
echo "   - Cycle Duration: 60 seconds each"
echo "   - Mode: DRY_RUN (no real transactions)"
echo "   - Chain: Base Mainnet"
echo "   - Memory Dir: .memory/autonomous-cycles/"
echo -e "${NC}"

# Confirmation prompt
echo -e "${YELLOW}⚠️  This will run for approximately 20-25 minutes total${NC}"
read -p "$(echo -e ${GREEN}Continue? [y/N]: ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 0
fi

# Run the autonomous cycle runner
echo -e "${GREEN}🚀 Starting 20-cycle experiment...${NC}\n"

node --import tsx scripts/autonomous-cycle-runner.ts

# Check results
if [ -f ".memory/autonomous-cycles/cycle-log.json" ]; then
    echo -e "\n${GREEN}✅ Experiment completed successfully!${NC}"
    echo -e "${CYAN}📊 Results saved to: .memory/autonomous-cycles/cycle-log.json${NC}"
    echo -e "${CYAN}💭 Memory files saved to: .memory/autonomous-cycles/cycle-*-memory.json${NC}"
else
    echo -e "\n${RED}❌ Experiment may have failed - no results file found${NC}"
    exit 1
fi

echo -e "\n${PURPLE}"
echo "═══════════════════════════════════════════════════════════════"
echo "  EXPERIMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

echo -e "${CYAN}Next steps:${NC}"
echo "  1. Review results: cat .memory/autonomous-cycles/cycle-log.json | jq"
echo "  2. Analyze learnings: cat .memory/autonomous-cycles/cycle-*-memory.json"
echo "  3. Update .memory/log.md with your observations"
echo ""
