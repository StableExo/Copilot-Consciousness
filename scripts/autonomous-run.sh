#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# TheWarden Autonomous Runner
# ═══════════════════════════════════════════════════════════════
# This script runs TheWarden autonomously with proper error handling,
# logging, and restart capabilities for long-running operation.
#
# Uses tsx for direct TypeScript execution - no build step required!
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
RUN_LOG="$LOG_DIR/autonomous-run.log"
WARDEN_LOG="$LOG_DIR/warden-output.log"
PID_FILE="$LOG_DIR/warden.pid"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$RUN_LOG"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" | tee -a "$RUN_LOG" >&2
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $*" | tee -a "$RUN_LOG"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $*" | tee -a "$RUN_LOG"
}

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Cleanup function for graceful shutdown
cleanup() {
    log_warn "Received shutdown signal, cleaning up..."
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            log "Stopping TheWarden (PID: $PID)..."
            kill -SIGTERM "$PID" 2>/dev/null || true
            
            # Wait for graceful shutdown (up to 30 seconds)
            for i in {1..30}; do
                if ! kill -0 "$PID" 2>/dev/null; then
                    log "TheWarden stopped gracefully"
                    break
                fi
                sleep 1
            done
            
            # Force kill if still running
            if kill -0 "$PID" 2>/dev/null; then
                log_warn "Force stopping TheWarden..."
                kill -SIGKILL "$PID" 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    log "Cleanup complete"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM SIGHUP

# Parse command line arguments
STREAM_LOGS=false
SHOW_HELP=false
USE_CACHED_POOLS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --stream|-s)
            STREAM_LOGS=true
            shift
            ;;
        --cached|--preloaded)
            USE_CACHED_POOLS=true
            shift
            ;;
        --live-pools|--live|--no-cache)
            # These flags are now no-ops since live is the default
            # Keep for backward compatibility but they do nothing
            shift
            ;;
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Banner
echo "═══════════════════════════════════════════════════════════════"
echo "  TheWarden - Autonomous Operation Script"
echo "  (Direct TypeScript execution via tsx)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ "$SHOW_HELP" = true ]; then
    echo "Usage: ./TheWarden [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -s, --stream       Stream TheWarden logs to terminal in real-time"
    echo "  --cached           Use preloaded/cached pool data (for development only)"
    echo "  --preloaded        Alias for --cached"
    echo "  --monitor          Run in diagnostic/monitoring mode (2-minute intervals)"
    echo "  --diagnostic       Alias for --monitor"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  STATUS_INTERVAL       Seconds between status updates (default: 60)"
    echo "  MAX_ITERATIONS        Max monitoring iterations (default: 0 = infinite)"
    echo "  USE_PRELOADED_POOLS   Set to 'true' to use cached pool data (dev only)"
    echo "  POOL_CACHE_DURATION   Cache duration in minutes (default: 60)"
    echo ""
    echo "Examples:"
    echo "  ./TheWarden                    Run with LIVE pool data (default)"
    echo "  ./TheWarden --stream           Run with real-time log streaming"
    echo "  ./TheWarden --cached           Use cached pool data (for testing)"
    echo "  ./TheWarden --monitor          Run in diagnostic mode with 2-min intervals"
    echo "  MAX_ITERATIONS=10 ./TheWarden --monitor   Run 10 diagnostic iterations"
    echo ""
    echo "Data modes:"
    echo "  Default (LIVE):        🔴 Fetches real-time pool data from network"
    echo "                         Required for actual trading"
    echo "                         Shows realistic profit opportunities (0.02-0.4 ETH)"
    echo ""
    echo "  Cached (--cached):     Uses preloaded pool data for faster startup"
    echo "                         FOR DEVELOPMENT/TESTING ONLY"
    echo "                         May show unrealistic profits due to stale data"
    echo ""
    echo "Monitoring mode will:"
    echo "  - Run TheWarden for 2 minutes"
    echo "  - Stop and analyze logs"
    echo "  - Provide parameter adjustment recommendations"
    echo "  - Repeat until stopped or MAX_ITERATIONS reached"
    echo ""
    exit 0
fi

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        log_error "TheWarden is already running (PID: $OLD_PID)"
        log_error "Stop it first with: kill $OLD_PID"
        exit 1
    else
        log_warn "Stale PID file found, removing..."
        rm -f "$PID_FILE"
    fi
fi

# Change to project directory
cd "$PROJECT_ROOT"

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_error ".env file not found!"
    log_error "Please create .env from .env.example and configure it"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Validate critical environment variables
REQUIRED_VARS=("WALLET_PRIVATE_KEY" "CHAIN_ID")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    log_error "Missing required environment variables: ${MISSING_VARS[*]}"
    exit 1
fi

# Check for placeholder values in critical settings
if [[ "$WALLET_PRIVATE_KEY" == *"YOUR_PRIVATE_KEY_HERE"* ]] || [[ "$WALLET_PRIVATE_KEY" == *"YOUR-"* ]]; then
    log_error "═══════════════════════════════════════════════════════════════"
    log_error "CONFIGURATION ERROR: WALLET_PRIVATE_KEY has placeholder value"
    log_error "═══════════════════════════════════════════════════════════════"
    log_error "Please edit your .env file and set a real private key."
    log_error "Your private key should be a 64-character hex string (with 0x prefix)."
    log_error "═══════════════════════════════════════════════════════════════"
    exit 1
fi

# Validate private key format (should be 0x followed by 64 hex characters)
if [[ ! "$WALLET_PRIVATE_KEY" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
    log_error "═══════════════════════════════════════════════════════════════"
    log_error "CONFIGURATION ERROR: Invalid WALLET_PRIVATE_KEY format"
    log_error "═══════════════════════════════════════════════════════════════"
    log_error "Private key must be '0x' followed by exactly 64 hex characters."
    log_error "Current value length: ${#WALLET_PRIVATE_KEY} characters"
    log_error "═══════════════════════════════════════════════════════════════"
    exit 1
fi

# Validate RPC URL based on chain
case "$CHAIN_ID" in
    8453|84532)
        if [ -z "${BASE_RPC_URL:-}" ]; then
            log_error "BASE_RPC_URL is required for Base network (CHAIN_ID=$CHAIN_ID)"
            exit 1
        fi
        if [[ "$BASE_RPC_URL" == *"YOUR-API-KEY"* ]] || [[ "$BASE_RPC_URL" == *"YOUR_"* ]]; then
            log_error "═══════════════════════════════════════════════════════════════"
            log_error "CONFIGURATION ERROR: BASE_RPC_URL has placeholder value"
            log_error "═══════════════════════════════════════════════════════════════"
            log_error "Please edit your .env file and set a real RPC URL."
            log_error "Get one from: https://www.alchemy.com/ or https://infura.io/"
            log_error "═══════════════════════════════════════════════════════════════"
            exit 1
        fi
        ;;
    1|5|11155111)
        if [ -z "${ETHEREUM_RPC_URL:-}" ]; then
            log_error "ETHEREUM_RPC_URL is required for Ethereum network (CHAIN_ID=$CHAIN_ID)"
            exit 1
        fi
        if [[ "$ETHEREUM_RPC_URL" == *"YOUR-API-KEY"* ]] || [[ "$ETHEREUM_RPC_URL" == *"YOUR_"* ]]; then
            log_error "═══════════════════════════════════════════════════════════════"
            log_error "CONFIGURATION ERROR: ETHEREUM_RPC_URL has placeholder value"
            log_error "═══════════════════════════════════════════════════════════════"
            log_error "Please edit your .env file and set a real RPC URL."
            log_error "Get one from: https://www.alchemy.com/ or https://infura.io/"
            log_error "═══════════════════════════════════════════════════════════════"
            exit 1
        fi
        ;;
esac

# Display configuration
log "═══════════════════════════════════════════════════════════════"
log "Configuration:"
log "  Chain ID: $CHAIN_ID"
log "  Node Environment: ${NODE_ENV:-development}"
log "  Dry Run: ${DRY_RUN:-true}"
log "  Scan Interval: ${SCAN_INTERVAL:-1000}ms"
log "  Min Profit: ${MIN_PROFIT_PERCENT:-0.5}%"
log "  Log Directory: $LOG_DIR"
log "  Execution Mode: Direct TypeScript (tsx)"
log "═══════════════════════════════════════════════════════════════"

# No build needed - tsx runs TypeScript directly!
log_info "Using tsx for direct TypeScript execution - no build step required"

# Warning for production mode
if [ "${NODE_ENV:-development}" = "production" ] && [ "${DRY_RUN:-true}" = "false" ]; then
    log_warn "═══════════════════════════════════════════════════════════════"
    log_warn "  ⚠️  WARNING: RUNNING IN PRODUCTION MODE (REAL TRANSACTIONS)"
    log_warn "═══════════════════════════════════════════════════════════════"
    log_warn "This will execute REAL transactions with REAL money!"
    log_warn "Press Ctrl+C within 10 seconds to abort..."
    log_warn "═══════════════════════════════════════════════════════════════"
    
    for i in {10..1}; do
        echo -ne "\rStarting in $i seconds... "
        sleep 1
    done
    echo ""
fi

# Set data mode environment variables based on CLI flags
# LIVE DATA IS NOW THE DEFAULT - only set USE_PRELOADED_POOLS if --cached flag is used
if [ "$USE_CACHED_POOLS" = true ]; then
    export USE_PRELOADED_POOLS=true
    log "═══════════════════════════════════════════════════════════════"
    log "📦 CACHED DATA MODE (Development Only)"
    log "═══════════════════════════════════════════════════════════════"
    log "  - Using preloaded pool data for faster startup"
    log "  - ⚠️  May show unrealistic profits due to stale data"
    log "  - For production trading, run without --cached flag"
    log "═══════════════════════════════════════════════════════════════"
else
    log "═══════════════════════════════════════════════════════════════"
    log "🔴 LIVE DATA MODE (Default)"
    log "═══════════════════════════════════════════════════════════════"
    log "  - Pool data will be fetched directly from network"
    log "  - Real-time, accurate profit calculations"
    log "  - Expect realistic profit opportunities (0.02-0.4 ETH)"
    log "═══════════════════════════════════════════════════════════════"
fi

# Start TheWarden
log "Starting TheWarden..."
log "Output will be logged to: $WARDEN_LOG"
log "Press Ctrl+C to stop"
log ""

# Handle log streaming mode vs background mode
if [ "$STREAM_LOGS" = true ]; then
    log "Running in STREAM mode - logs will appear below"
    log "═══════════════════════════════════════════════════════════════"
    
    # Run TheWarden with output to both log file and terminal using tsx
    node --import tsx src/main.ts 2>&1 | tee -a "$WARDEN_LOG" &
    TEE_PID=$!
    # Get the Node.js PID (parent of tee in the pipeline)
    sleep 1
    NODE_PID=$(pgrep -P $$ node 2>/dev/null | head -1)
    if [ -n "$NODE_PID" ]; then
        echo "$NODE_PID" > "$PID_FILE"
    else
        echo "$TEE_PID" > "$PID_FILE"
    fi
    
    # Wait for the process
    wait "$TEE_PID"
    
    # Clean up
    rm -f "$PID_FILE"
    log "TheWarden stopped"
    exit 0
else
    # Run TheWarden and capture PID using tsx
    node --import tsx src/main.ts >> "$WARDEN_LOG" 2>&1 &
    WARDEN_PID=$!
    echo "$WARDEN_PID" > "$PID_FILE"
    
    log "TheWarden started (PID: $WARDEN_PID)"
    log "Monitor logs with: tail -f $WARDEN_LOG"
    log "Or restart with: ./TheWarden --stream"
    log ""
fi

# Monitor the process
log "Monitoring TheWarden (will restart on crash unless manually stopped)..."
log ""

# Status update interval (in seconds, default 60 = 1 minute)
STATUS_INTERVAL=${STATUS_INTERVAL:-60}
CHECKS_PER_STATUS=$((STATUS_INTERVAL / 5))
# Track start time for uptime calculation
WARDEN_START_TIME=$(date +%s)

# Track counts incrementally to avoid expensive grep on large logs
LAST_OPP_COUNT=0
LAST_ERR_COUNT=0
CHECK_COUNT=0

# Track consecutive failures to detect configuration issues
CONSECUTIVE_FAILURES=0
MAX_CONSECUTIVE_FAILURES=3
LAST_START_TIME=$(date +%s)
MIN_RUNTIME_SECONDS=30  # If process dies within this time, it's likely a config issue

while true; do
    if ! kill -0 "$WARDEN_PID" 2>/dev/null; then
        log_error "TheWarden process died unexpectedly!"
        
        # Check if this is a manual shutdown
        if [ ! -f "$PID_FILE" ]; then
            log "Manual shutdown detected, exiting..."
            exit 0
        fi
        
        # Check how long the process ran
        CURRENT_TIME=$(date +%s)
        RUNTIME=$((CURRENT_TIME - LAST_START_TIME))
        
        if [ $RUNTIME -lt $MIN_RUNTIME_SECONDS ]; then
            CONSECUTIVE_FAILURES=$((CONSECUTIVE_FAILURES + 1))
            log_warn "Process died after only ${RUNTIME}s (failure #${CONSECUTIVE_FAILURES})"
            
            # Check the log for common errors
            if [ -f "$WARDEN_LOG" ]; then
                if grep -q "ERR_MODULE_NOT_FOUND.*tsx" "$WARDEN_LOG" 2>/dev/null; then
                    log_error "═══════════════════════════════════════════════════════════════"
                    log_error "MISSING DEPENDENCY: tsx package not found"
                    log_error "═══════════════════════════════════════════════════════════════"
                    log_error "Please run: npm install"
                    log_error "═══════════════════════════════════════════════════════════════"
                    rm -f "$PID_FILE"
                    exit 1
                fi
                
                if grep -q "YOUR_PRIVATE_KEY_HERE\|YOUR-API-KEY" "$WARDEN_LOG" 2>/dev/null; then
                    log_error "═══════════════════════════════════════════════════════════════"
                    log_error "CONFIGURATION ERROR: .env file has placeholder values"
                    log_error "═══════════════════════════════════════════════════════════════"
                    log_error "Please edit your .env file and replace placeholder values:"
                    log_error "  - WALLET_PRIVATE_KEY: Your wallet private key (64 hex chars)"
                    log_error "  - BASE_RPC_URL: Your Alchemy/Infura RPC URL"
                    log_error "═══════════════════════════════════════════════════════════════"
                    rm -f "$PID_FILE"
                    exit 1
                fi
                
                if grep -q "INVALID_ARGUMENT\|invalid BytesLike" "$WARDEN_LOG" 2>/dev/null; then
                    log_error "═══════════════════════════════════════════════════════════════"
                    log_error "CONFIGURATION ERROR: Invalid private key format"
                    log_error "═══════════════════════════════════════════════════════════════"
                    log_error "Your WALLET_PRIVATE_KEY in .env is invalid."
                    log_error "It should be a 64-character hex string (with 0x prefix)."
                    log_error "Example: 0x1234567890abcdef..."
                    log_error "═══════════════════════════════════════════════════════════════"
                    rm -f "$PID_FILE"
                    exit 1
                fi
            fi
            
            if [ $CONSECUTIVE_FAILURES -ge $MAX_CONSECUTIVE_FAILURES ]; then
                log_error "═══════════════════════════════════════════════════════════════"
                log_error "TOO MANY CONSECUTIVE FAILURES (${CONSECUTIVE_FAILURES})"
                log_error "═══════════════════════════════════════════════════════════════"
                log_error "TheWarden keeps crashing immediately. This usually means:"
                log_error "  1. Missing dependencies - run: npm install"
                log_error "  2. Invalid .env configuration - check your settings"
                log_error "  3. Wrong Node.js version - requires Node.js 22+"
                log_error ""
                log_error "Check the log file for details:"
                log_error "  cat $WARDEN_LOG"
                log_error "═══════════════════════════════════════════════════════════════"
                rm -f "$PID_FILE"
                exit 1
            fi
        else
            # Process ran for a while, reset failure counter
            CONSECUTIVE_FAILURES=0
        fi
        
        # Wait a bit before restarting
        log_warn "Waiting 10 seconds before restart..."
        sleep 10
        
        # Restart using tsx
        log "Restarting TheWarden..."
        LAST_START_TIME=$(date +%s)
        node --import tsx src/main.ts >> "$WARDEN_LOG" 2>&1 &
        WARDEN_PID=$!
        echo "$WARDEN_PID" > "$PID_FILE"
        log "TheWarden restarted (PID: $WARDEN_PID)"
        CHECK_COUNT=0
        WARDEN_START_TIME=$(date +%s)
    fi
    
    # Periodic status update
    CHECK_COUNT=$((CHECK_COUNT + 1))
    if [ $CHECK_COUNT -ge $CHECKS_PER_STATUS ]; then
        CHECK_COUNT=0
        
        # Calculate uptime from tracked start time
        CURRENT_TIME=$(date +%s)
        UPTIME_SECS=$((CURRENT_TIME - WARDEN_START_TIME))
        UPTIME_MINS=$((UPTIME_SECS / 60))
        UPTIME_HOURS=$((UPTIME_MINS / 60))
        UPTIME_MINS=$((UPTIME_MINS % 60))
        
        # Get memory usage
        MEM_KB=$(ps -p "$WARDEN_PID" -o rss= 2>/dev/null || echo "0")
        MEM_MB=$((MEM_KB / 1024))
        
        # Count opportunities and errors efficiently using tail on recent log entries
        if [ -f "$WARDEN_LOG" ]; then
            # Only search the last 10000 lines for performance
            OPP_COUNT=$(tail -10000 "$WARDEN_LOG" 2>/dev/null | grep -c "Found.*potential opportunities" || echo "0")
            ERR_COUNT=$(tail -10000 "$WARDEN_LOG" 2>/dev/null | grep -c "ERROR" || echo "0")
            log_info "Status: RUNNING | Uptime: ${UPTIME_HOURS}h ${UPTIME_MINS}m | Memory: ${MEM_MB}MB | Opportunities: ${OPP_COUNT} | Errors: ${ERR_COUNT}"
        else
            log_info "Status: RUNNING | Uptime: ${UPTIME_HOURS}h ${UPTIME_MINS}m | Memory: ${MEM_MB}MB"
        fi
    fi
    
    sleep 5
done
