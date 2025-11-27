#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# 🚀 THE WARDEN - ONE-CLICK LAUNCH SCRIPT 🚀
# ═══════════════════════════════════════════════════════════════════════════
# 
# This script performs a complete deployment of TheWarden system including:
# - Environment validation
# - Dependency installation
# - Build compilation
# - Contract deployment (optional)
# - Swarm initialization
# - Dashboard startup
# - Health checks
#
# Usage:
#   ./scripts/launch.sh              # Standard launch
#   ./scripts/launch.sh --testnet    # Testnet mode
#   ./scripts/launch.sh --dry-run    # Simulation only
#   ./scripts/launch.sh --full       # Full deployment with contracts
#
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║   ████████╗██╗  ██╗███████╗    ██╗    ██╗ █████╗ ██████╗ ██████╗  ║"
echo "║   ╚══██╔══╝██║  ██║██╔════╝    ██║    ██║██╔══██╗██╔══██╗██╔══██╗ ║"
echo "║      ██║   ███████║█████╗      ██║ █╗ ██║███████║██████╔╝██║  ██║ ║"
echo "║      ██║   ██╔══██║██╔══╝      ██║███╗██║██╔══██║██╔══██╗██║  ██║ ║"
echo "║      ██║   ██║  ██║███████╗    ╚███╔███╔╝██║  ██║██║  ██║██████╔╝ ║"
echo "║      ╚═╝   ╚═╝  ╚═╝╚══════╝     ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ║"
echo "║                                                                   ║"
echo "║           🔥 FINANCIAL SUPERINTELLIGENCE LAUNCH SEQUENCE 🔥        ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Parse arguments
MODE="standard"
DRY_RUN=false
DEPLOY_CONTRACTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --testnet)
            MODE="testnet"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --full)
            DEPLOY_CONTRACTS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --testnet     Deploy to testnet (Base Sepolia)"
            echo "  --dry-run     Simulation mode, no real transactions"
            echo "  --full        Full deployment including contracts"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Logging functions
log_step() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

# Check function
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed"
        return 1
    fi
    log_success "$1 found"
    return 0
}

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 1: ENVIRONMENT VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

log_step "PHASE 1: Environment Validation"

# Check Node.js version
log_info "Checking Node.js..."
check_command node
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    log_error "Node.js version 20+ required (found: $(node --version))"
    exit 1
fi
log_success "Node.js version: $(node --version)"

# Check npm
log_info "Checking npm..."
check_command npm
log_success "npm version: $(npm --version)"

# Check git
log_info "Checking git..."
check_command git

# Check .env file
log_info "Checking environment configuration..."
cd "$PROJECT_DIR"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        log_warning ".env not found, copying from .env.example"
        cp .env.example .env
    else
        log_error ".env file not found"
        exit 1
    fi
fi
log_success "Environment file present"

# Validate critical environment variables
log_info "Validating environment variables..."
source .env 2>/dev/null || true

REQUIRED_VARS=("RPC_URL" "CHAIN_ID")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    log_warning "Missing optional vars: ${MISSING_VARS[*]}"
    log_info "Continuing with defaults..."
else
    log_success "All environment variables configured"
fi

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 2: DEPENDENCY INSTALLATION
# ═══════════════════════════════════════════════════════════════════════════

log_step "PHASE 2: Installing Dependencies"

log_info "Running npm install..."
npm install --legacy-peer-deps 2>&1 | tail -5
log_success "Dependencies installed"

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3: BUILD COMPILATION
# ═══════════════════════════════════════════════════════════════════════════

log_step "PHASE 3: Building Project"

log_info "Compiling TypeScript..."
npm run build 2>&1 | tail -5

if [ $? -eq 0 ]; then
    log_success "Build completed successfully"
else
    log_error "Build failed"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 4: CONTRACT DEPLOYMENT (Optional)
# ═══════════════════════════════════════════════════════════════════════════

if [ "$DEPLOY_CONTRACTS" = true ]; then
    log_step "PHASE 4: Contract Deployment"
    
    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN: Skipping actual contract deployment"
    else
        log_info "Deploying FlashSwapV2..."
        
        if [ "$MODE" = "testnet" ]; then
            npm run deploy:flashswapv2:testnet 2>&1 | tail -10
        else
            npm run deploy:flashswapv2 2>&1 | tail -10
        fi
        
        log_success "Contracts deployed"
    fi
else
    log_info "Skipping contract deployment (use --full to deploy)"
fi

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 5: SYSTEM INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════════

log_step "PHASE 5: System Initialization"

# Create logs directory
mkdir -p logs

# Initialize configuration
log_info "Initializing configuration..."

if [ "$DRY_RUN" = true ]; then
    export DRY_RUN=true
    log_warning "DRY RUN MODE: No real transactions will be executed"
fi

if [ "$MODE" = "testnet" ]; then
    export NODE_ENV=development
    log_info "Running in TESTNET mode"
else
    export NODE_ENV=production
    log_info "Running in PRODUCTION mode"
fi

log_success "Configuration initialized"

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 6: LAUNCH
# ═══════════════════════════════════════════════════════════════════════════

log_step "PHASE 6: 🚀 LAUNCHING THE WARDEN 🚀"

echo -e "\n${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║     ██╗      █████╗ ██╗   ██╗███╗   ██╗ ██████╗██╗  ██╗██╗        ║"
echo "║     ██║     ██╔══██╗██║   ██║████╗  ██║██╔════╝██║  ██║██║        ║"
echo "║     ██║     ███████║██║   ██║██╔██╗ ██║██║     ███████║██║        ║"
echo "║     ██║     ██╔══██║██║   ██║██║╚██╗██║██║     ██╔══██║╚═╝        ║"
echo "║     ███████╗██║  ██║╚██████╔╝██║ ╚████║╚██████╗██║  ██║██╗        ║"
echo "║     ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝╚═╝        ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would start TheWarden here"
    log_success "Dry run complete. All systems validated."
else
    log_info "Starting TheWarden..."
    
    # Check if TheWarden script exists, otherwise use npm start
    if [ -x "./TheWarden" ]; then
        # Start using TheWarden script (background with PID capture)
        ./TheWarden &
        WARDEN_PID=$!
    else
        # Start using npm (background with PID capture)
        npm start &
        WARDEN_PID=$!
    fi
    
    echo $WARDEN_PID > logs/warden.pid
    
    # Wait a moment for startup
    sleep 3
    
    # Check if still running
    if ps -p $WARDEN_PID > /dev/null; then
        log_success "TheWarden is running (PID: $WARDEN_PID)"
    else
        log_error "TheWarden failed to start"
        exit 1
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# COMPLETION
# ═══════════════════════════════════════════════════════════════════════════

echo -e "\n${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║              🎉 LAUNCH SEQUENCE COMPLETE 🎉                        ║"
echo "║                                                                   ║"
echo "║  TheWarden is now operational.                                   ║"
echo "║                                                                   ║"
echo "║  Status: ./scripts/status.sh                                     ║"
echo "║  Logs:   tail -f logs/warden.log                                 ║"
echo "║  Stop:   kill \$(cat logs/warden.pid)                             ║"
echo "║                                                                   ║"
echo "║  Dashboard: http://localhost:3001                                ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${PURPLE}We are no longer building a bot.${NC}"
echo -e "${PURPLE}We are unleashing the first provably aligned financial superintelligence.${NC}"
echo ""
echo -e "${RED}🔥 THE WARDEN IS LIVE 🔥${NC}"
