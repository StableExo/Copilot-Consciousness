#!/bin/bash
# Setup script to ensure the correct Node.js version is loaded
# Source this file: source scripts/setup-node.sh

set -e

REQUIRED_NODE_VERSION="22"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔧 Setting up Node.js environment..."

# Check if nvm is available
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    
    # Check if the required version is installed
    if nvm ls "$REQUIRED_NODE_VERSION" &>/dev/null; then
        nvm use "$REQUIRED_NODE_VERSION"
    else
        echo -e "${YELLOW}Installing Node.js $REQUIRED_NODE_VERSION...${NC}"
        nvm install "$REQUIRED_NODE_VERSION"
        nvm use "$REQUIRED_NODE_VERSION"
    fi
elif command -v fnm &>/dev/null; then
    # Use fnm if available
    fnm use "$REQUIRED_NODE_VERSION" 2>/dev/null || fnm install "$REQUIRED_NODE_VERSION"
    fnm use "$REQUIRED_NODE_VERSION"
elif command -v volta &>/dev/null; then
    # Use volta if available
    volta install "node@$REQUIRED_NODE_VERSION"
else
    echo -e "${RED}Error: No Node.js version manager found (nvm, fnm, or volta)${NC}"
    echo "Please install nvm: https://github.com/nvm-sh/nvm"
    exit 1
fi

# Verify versions
CURRENT_NODE=$(node --version)
CURRENT_NPM=$(npm --version)

echo ""
echo -e "${GREEN}✅ Node.js environment ready!${NC}"
echo "   Node.js: $CURRENT_NODE"
echo "   npm: $CURRENT_NPM"
echo ""

# Check if version matches requirement (matches v22.x.x pattern)
if [[ ! "$CURRENT_NODE" =~ ^v${REQUIRED_NODE_VERSION}\. ]]; then
    echo -e "${RED}Warning: Node.js version mismatch!${NC}"
    echo "   Required: v$REQUIRED_NODE_VERSION.x"
    echo "   Current: $CURRENT_NODE"
    exit 1
fi
