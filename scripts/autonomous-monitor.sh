#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# TheWarden Autonomous Monitoring & Diagnostic Script
# ═══════════════════════════════════════════════════════════════
# This script runs TheWarden in 2-minute intervals, analyzes logs,
# and provides diagnostic insights and parameter adjustment suggestions
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
WARDEN_LOG="$LOG_DIR/warden-output.log"
MONITOR_LOG="$LOG_DIR/monitor-analysis.log"
DIAGNOSTICS_LOG="$LOG_DIR/diagnostics.log"
RECOMMENDATIONS_FILE="$LOG_DIR/parameter-recommendations.txt"
PID_FILE="$LOG_DIR/warden-monitor.pid"

# Runtime parameters
RUN_INTERVAL=120  # 2 minutes in seconds
MAX_ITERATIONS=${MAX_ITERATIONS:-0}  # 0 = infinite
ITERATION_COUNT=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$MONITOR_LOG"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" | tee -a "$MONITOR_LOG" >&2
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $*" | tee -a "$MONITOR_LOG"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $*" | tee -a "$MONITOR_LOG"
}

log_diagnostic() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] DIAGNOSTIC:${NC} $*" | tee -a "$DIAGNOSTICS_LOG"
}

log_recommendation() {
    echo -e "${MAGENTA}[$(date +'%Y-%m-%d %H:%M:%S')] RECOMMENDATION:${NC} $*" | tee -a "$RECOMMENDATIONS_FILE"
}

# Create directories
mkdir -p "$LOG_DIR"

# Cleanup function
cleanup() {
    log_warn "Received shutdown signal, cleaning up..."
    if [ -f "$PID_FILE" ]; then
        rm -f "$PID_FILE"
    fi
    log "Cleanup complete"
    exit 0
}

trap cleanup SIGINT SIGTERM SIGHUP

# Banner
echo "═══════════════════════════════════════════════════════════════"
echo "  TheWarden - Autonomous Monitoring & Diagnostics"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Run Interval: ${RUN_INTERVAL} seconds (2 minutes)"
echo "  Max Iterations: ${MAX_ITERATIONS} (0 = infinite)"
echo "  Log Directory: ${LOG_DIR}"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check prerequisites
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    log_error ".env file not found!"
    log_error "Please create .env from .env.example and configure it"
    exit 1
fi

cd "$PROJECT_ROOT"

# Load environment
set -a
source .env
set +a

# Store PID
echo $$ > "$PID_FILE"

# Initialize logs
log "Starting autonomous monitoring session"
log "Session started at $(date)"
echo "═══════════════════════════════════════════════════════════════" > "$DIAGNOSTICS_LOG"
echo "TheWarden Diagnostic Session - $(date)" >> "$DIAGNOSTICS_LOG"
echo "═══════════════════════════════════════════════════════════════" >> "$DIAGNOSTICS_LOG"
echo "" >> "$DIAGNOSTICS_LOG"

echo "═══════════════════════════════════════════════════════════════" > "$RECOMMENDATIONS_FILE"
echo "Parameter Recommendations - $(date)" >> "$RECOMMENDATIONS_FILE"
echo "═══════════════════════════════════════════════════════════════" >> "$RECOMMENDATIONS_FILE"
echo "" >> "$RECOMMENDATIONS_FILE"

# Function to analyze logs
analyze_logs() {
    local iteration=$1
    local log_file=$2
    
    log_diagnostic "═══════════════════════════════════════════════════════════════"
    log_diagnostic "Iteration #${iteration} - Log Analysis"
    log_diagnostic "═══════════════════════════════════════════════════════════════"
    
    if [ ! -f "$log_file" ]; then
        log_diagnostic "No log file found yet"
        return
    fi
    
    # Extract last 2 minutes of logs for analysis
    local analysis_window=$(tail -500 "$log_file")
    
    # Count various log types
    local error_count=$(echo "$analysis_window" | grep -ic "error" 2>/dev/null || echo "0")
    local warning_count=$(echo "$analysis_window" | grep -ic "warning\|warn" 2>/dev/null || echo "0")
    local opportunity_count=$(echo "$analysis_window" | grep -ic "opportunity\|arbitrage.*found" 2>/dev/null || echo "0")
    local execution_count=$(echo "$analysis_window" | grep -ic "executing.*arbitrage\|transaction.*sent" 2>/dev/null || echo "0")
    local profit_count=$(echo "$analysis_window" | grep -ic "profit" 2>/dev/null || echo "0")
    local gas_count=$(echo "$analysis_window" | grep -ic "gas.*too.*high\|gas.*exceeded" 2>/dev/null || echo "0")
    local slippage_count=$(echo "$analysis_window" | grep -ic "slippage" 2>/dev/null || echo "0")
    local rpc_error_count=$(echo "$analysis_window" | grep -ic "rpc.*error\|connection.*failed\|timeout" 2>/dev/null || echo "0")
    local consciousness_count=$(echo "$analysis_window" | grep -ic "consciousness\|cognitive\|emergence" 2>/dev/null || echo "0")
    local pool_count=$(echo "$analysis_window" | grep -ic "pool.*detected\|pool.*loaded" 2>/dev/null || echo "0")
    
    # Ensure all counts are integers (remove any whitespace/newlines)
    error_count=$(echo "$error_count" | tr -d '\n\r ')
    warning_count=$(echo "$warning_count" | tr -d '\n\r ')
    opportunity_count=$(echo "$opportunity_count" | tr -d '\n\r ')
    execution_count=$(echo "$execution_count" | tr -d '\n\r ')
    profit_count=$(echo "$profit_count" | tr -d '\n\r ')
    gas_count=$(echo "$gas_count" | tr -d '\n\r ')
    slippage_count=$(echo "$slippage_count" | tr -d '\n\r ')
    rpc_error_count=$(echo "$rpc_error_count" | tr -d '\n\r ')
    consciousness_count=$(echo "$consciousness_count" | tr -d '\n\r ')
    pool_count=$(echo "$pool_count" | tr -d '\n\r ')
    
    # Display analysis
    log_diagnostic "Counts:"
    log_diagnostic "  - Errors: ${error_count}"
    log_diagnostic "  - Warnings: ${warning_count}"
    log_diagnostic "  - Opportunities Found: ${opportunity_count}"
    log_diagnostic "  - Executions: ${execution_count}"
    log_diagnostic "  - Profitable Mentions: ${profit_count}"
    log_diagnostic "  - Gas Issues: ${gas_count}"
    log_diagnostic "  - Slippage Issues: ${slippage_count}"
    log_diagnostic "  - RPC Errors: ${rpc_error_count}"
    log_diagnostic "  - Consciousness Activity: ${consciousness_count}"
    log_diagnostic "  - Pool Activity: ${pool_count}"
    
    # Check for common error patterns
    log_diagnostic ""
    log_diagnostic "Error Pattern Analysis:"
    
    if [ $rpc_error_count -gt 5 ]; then
        log_diagnostic "  ⚠️  HIGH RPC ERROR RATE detected (${rpc_error_count} errors)"
        log_recommendation "RPC_ISSUE: Consider switching to a different RPC provider or checking network connectivity"
        log_recommendation "  Suggested: Increase RPC_RATE_LIMIT or add backup RPC URLs"
    fi
    
    if [ $gas_count -gt 3 ]; then
        log_diagnostic "  ⚠️  FREQUENT GAS ISSUES detected (${gas_count} occurrences)"
        log_recommendation "GAS_ISSUE: Gas prices may be too restrictive"
        log_recommendation "  Suggested: Increase MAX_GAS_PRICE from ${MAX_GAS_PRICE:-100} gwei"
        log_recommendation "  Suggested: Increase MAX_GAS_COST_PERCENTAGE from ${MAX_GAS_COST_PERCENTAGE:-40}%"
    fi
    
    if [ $opportunity_count -eq 0 ]; then
        log_diagnostic "  ⚠️  NO OPPORTUNITIES FOUND in this interval"
        log_recommendation "OPPORTUNITY_ISSUE: No arbitrage opportunities detected"
        log_recommendation "  Possible causes:"
        log_recommendation "    1. MIN_PROFIT_THRESHOLD (${MIN_PROFIT_THRESHOLD:-0.01}) or MIN_PROFIT_PERCENT (${MIN_PROFIT_PERCENT:-0.5}%) too high"
        log_recommendation "    2. Insufficient liquidity - MIN_LIQUIDITY currently ${MIN_LIQUIDITY:-10000}"
        log_recommendation "    3. Pool scanning issue - check SCAN_CHAINS (${SCAN_CHAINS:-not set})"
        log_recommendation "    4. DEX configuration - verify DEX integrations are enabled"
    elif [ $opportunity_count -gt 0 ] && [ $execution_count -eq 0 ]; then
        log_diagnostic "  ⚠️  OPPORTUNITIES FOUND BUT NOT EXECUTED (${opportunity_count} found, ${execution_count} executed)"
        log_recommendation "EXECUTION_ISSUE: Opportunities found but not executing"
        log_recommendation "  Possible causes:"
        log_recommendation "    1. DRY_RUN mode enabled (${DRY_RUN:-not set})"
        log_recommendation "    2. Gas costs exceeding profit"
        log_recommendation "    3. Slippage constraints too tight (MAX_SLIPPAGE: ${MAX_SLIPPAGE:-0.005})"
        log_recommendation "    4. Consciousness/ethical filters blocking execution"
    fi
    
    if [ $slippage_count -gt 2 ]; then
        log_diagnostic "  ⚠️  SLIPPAGE ISSUES detected (${slippage_count} occurrences)"
        log_recommendation "SLIPPAGE_ISSUE: Frequent slippage problems"
        log_recommendation "  Suggested: Increase MAX_SLIPPAGE from ${MAX_SLIPPAGE:-0.005} (0.5%)"
        log_recommendation "  Suggested: Consider using private RPC (ENABLE_PRIVATE_RPC: ${ENABLE_PRIVATE_RPC:-false})"
    fi
    
    if [ $consciousness_count -eq 0 ] && [ $opportunity_count -gt 0 ]; then
        log_diagnostic "  ⚠️  CONSCIOUSNESS NOT ACTIVE despite opportunities"
        log_recommendation "CONSCIOUSNESS_ISSUE: AI consciousness may not be evaluating opportunities"
        log_recommendation "  Check: PHASE3_AI_ENABLED (${PHASE3_AI_ENABLED:-not set})"
        log_recommendation "  Check: EMERGENCE_DETECTION_ENABLED (${EMERGENCE_DETECTION_ENABLED:-not set})"
    fi
    
    if [ $pool_count -eq 0 ]; then
        log_diagnostic "  ⚠️  NO POOL ACTIVITY detected"
        log_recommendation "POOL_ISSUE: Pools may not be loading correctly"
        log_recommendation "  Actions:"
        log_recommendation "    1. Run: npm run preload:pools --force"
        log_recommendation "    2. Check RPC URLs for chains: ${SCAN_CHAINS:-8453}"
        log_recommendation "    3. Verify DEX integrations enabled"
    fi
    
    # Extract and log specific errors
    log_diagnostic ""
    log_diagnostic "Recent Errors:"
    echo "$analysis_window" | grep -i "error" | tail -5 | while read -r line; do
        log_diagnostic "  ${line}"
    done
    
    # Configuration summary
    log_diagnostic ""
    log_diagnostic "Current Configuration:"
    log_diagnostic "  NODE_ENV: ${NODE_ENV:-development}"
    log_diagnostic "  DRY_RUN: ${DRY_RUN:-true}"
    log_diagnostic "  CHAIN_ID: ${CHAIN_ID:-not set}"
    log_diagnostic "  SCAN_CHAINS: ${SCAN_CHAINS:-not set}"
    log_diagnostic "  MIN_PROFIT_PERCENT: ${MIN_PROFIT_PERCENT:-0.5}%"
    log_diagnostic "  MIN_PROFIT_THRESHOLD: ${MIN_PROFIT_THRESHOLD:-0.01}"
    log_diagnostic "  MAX_GAS_PRICE: ${MAX_GAS_PRICE:-100} gwei"
    log_diagnostic "  SCAN_INTERVAL: ${SCAN_INTERVAL:-1000}ms"
    log_diagnostic ""
}

# Function to generate env recommendations
generate_env_recommendations() {
    log ""
    log "Generating .env.example recommendations..."
    
    # Append recommendations to .env.example
    cat >> "$PROJECT_ROOT/.env.example.diagnostic" << 'EOF'

# ═══════════════════════════════════════════════════════════════
# DIAGNOSTIC RECOMMENDATIONS - Auto-generated
# ═══════════════════════════════════════════════════════════════
# Generated by autonomous-monitor.sh
# Review these suggestions and adjust your .env file accordingly
# ═══════════════════════════════════════════════════════════════

# Common Issue: No opportunities found
# If you're seeing "No opportunities found" frequently:
#   - Lower MIN_PROFIT_PERCENT from 0.08 to 0.03 or 0.05
#   - Lower MIN_PROFIT_THRESHOLD from 0.01 to 0.005
#   - Lower MIN_LIQUIDITY from 10000 to 5000
#   - Verify SCAN_CHAINS includes active chains: 8453,1,42161,10

# Common Issue: High gas costs blocking execution
# If opportunities found but gas costs are too high:
#   - Increase MAX_GAS_PRICE (currently 100 gwei, try 150-200 for faster execution)
#   - Increase MAX_GAS_COST_PERCENTAGE (currently 40%, try 50-60%)
#   - Consider L2 chains with lower gas (Base: 8453, Arbitrum: 42161)

# Common Issue: RPC errors and timeouts
# If you're seeing frequent RPC errors:
#   - Add backup RPC URLs (ETHEREUM_RPC_URL_BACKUP, BASE_RPC_URL_BACKUP, etc.)
#   - Increase RPC_RATE_LIMIT if hitting rate limits
#   - Consider premium RPC providers (Alchemy, Infura Pro)

# Common Issue: Slippage causing failures
# If transactions failing due to slippage:
#   - Increase MAX_SLIPPAGE from 0.005 (0.5%) to 0.01 (1%)
#   - Enable private RPC to avoid front-running: ENABLE_PRIVATE_RPC=true
#   - Use Flashbots on Ethereum: PRIVATE_RPC_PRIVACY_LEVEL=basic

# Common Issue: Consciousness/AI not evaluating
# If AI consciousness seems inactive:
#   - Verify PHASE3_AI_ENABLED=true
#   - Verify EMERGENCE_DETECTION_ENABLED=true
#   - Check COGNITIVE_CONSENSUS_THRESHOLD (0.7 = 70% agreement needed)
#   - Lower threshold to 0.5 or 0.6 for more aggressive execution

# Strategy Logic Tuning
# Fine-tune based on your observations:
#   SCAN_INTERVAL=500          # Faster scanning (default: 1000ms)
#   CONCURRENCY=20             # More parallel workers (default: 10)
#   TARGET_THROUGHPUT=20000    # Higher throughput target

EOF
    
    log "Recommendations written to: .env.example.diagnostic"
}

# Main monitoring loop
while true; do
    ITERATION_COUNT=$((ITERATION_COUNT + 1))
    
    log "═══════════════════════════════════════════════════════════════"
    log "Starting Iteration #${ITERATION_COUNT}"
    log "═══════════════════════════════════════════════════════════════"
    
    # Clear the log for this iteration
    > "$WARDEN_LOG"
    
    # Start TheWarden
    log "Starting TheWarden..."
    log "Will run for ${RUN_INTERVAL} seconds..."
    
    # Run TheWarden in background
    if [ -f "$PROJECT_ROOT/dist/src/main.js" ]; then
        timeout ${RUN_INTERVAL}s node "$PROJECT_ROOT/dist/src/main.js" >> "$WARDEN_LOG" 2>&1 || true
    else
        log_error "Build not found. Building project..."
        npm run build
        timeout ${RUN_INTERVAL}s node "$PROJECT_ROOT/dist/src/main.js" >> "$WARDEN_LOG" 2>&1 || true
    fi
    
    log "TheWarden stopped (2-minute interval complete)"
    
    # Analyze logs
    analyze_logs "$ITERATION_COUNT" "$WARDEN_LOG"
    
    # Check if we should stop
    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION_COUNT -ge $MAX_ITERATIONS ]; then
        log ""
        log "═══════════════════════════════════════════════════════════════"
        log "Maximum iterations reached (${MAX_ITERATIONS})"
        log "═══════════════════════════════════════════════════════════════"
        break
    fi
    
    # Brief pause before next iteration
    log ""
    log "Waiting 5 seconds before next iteration..."
    sleep 5
done

# Generate final recommendations
generate_env_recommendations

# Summary
log ""
log "═══════════════════════════════════════════════════════════════"
log "Monitoring Session Complete"
log "═══════════════════════════════════════════════════════════════"
log "Total Iterations: ${ITERATION_COUNT}"
log "Logs saved to:"
log "  - Monitor Log: ${MONITOR_LOG}"
log "  - Diagnostics: ${DIAGNOSTICS_LOG}"
log "  - Recommendations: ${RECOMMENDATIONS_FILE}"
log "  - .env Recommendations: .env.example.diagnostic"
log "═══════════════════════════════════════════════════════════════"

cleanup
