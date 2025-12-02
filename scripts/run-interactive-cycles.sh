#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# Interactive Cycle Runner Launcher
# ═══════════════════════════════════════════════════════════════
# Launches TheWarden in interactive cycle mode with 1-minute
# cycles and collaborative parameter adjustment pauses.
#
# This script ensures proper environment setup and runs the
# TypeScript interactive cycle runner using tsx.
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Interactive Cycle Runner${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Change to project directory
cd "$PROJECT_ROOT"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo "Please create .env from .env.example and configure it"
    echo ""
    echo "Quick setup:"
    echo "  cp .env.example .env"
    echo "  nano .env  # Edit with your configuration"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Display mode information
echo -e "${BLUE}Configuration:${NC}"
echo "  Chain ID: ${CHAIN_ID:-Not Set}"
echo "  Dry Run: ${DRY_RUN:-true}"
echo "  Scan Interval: ${SCAN_INTERVAL:-800}ms"
echo ""

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo -e "${RED}ERROR: Node.js 22 or higher is required${NC}"
    echo "Current version: $(node --version)"
    echo ""
    echo "Install Node.js 22 with:"
    echo "  sudo n 22.12.0"
    exit 1
fi

echo -e "${GREEN}✅ Environment validated${NC}"
echo ""
echo -e "${YELLOW}Starting Interactive Cycle Runner...${NC}"
echo ""
echo "This will run TheWarden in 1-minute cycles with pauses for analysis."
echo "After each cycle, you'll be able to:"
echo "  • Review metrics and insights"
echo "  • Adjust parameters"
echo "  • Add notes and observations"
echo "  • Continue or stop the session"
echo ""
echo "Press Ctrl+C at any time to stop gracefully."
echo ""

# Run the interactive cycle runner using tsx
exec node --import tsx "$SCRIPT_DIR/interactive-cycle-runner.ts"
