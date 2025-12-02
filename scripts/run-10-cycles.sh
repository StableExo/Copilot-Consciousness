#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# Run TheWarden for 10 Cycles with Analysis and Adjustment
# ═══════════════════════════════════════════════════════════════
# Each cycle runs for a specified duration, then stops to:
# 1. Analyze the results
# 2. Adjust parameters based on performance
# 3. Document learnings
# 4. Execute the next cycle
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
MEMORY_DIR="$PROJECT_ROOT/.memory/autonomous-cycles"
CYCLE_DURATION=120000  # 2 minutes per cycle (120000 ms)
TOTAL_CYCLES=10

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$MEMORY_DIR"

# Initialize cycle log
CYCLE_LOG="$MEMORY_DIR/10-cycles-$(date +%Y%m%d-%H%M%S).log"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$CYCLE_LOG"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $*" | tee -a "$CYCLE_LOG"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $*" | tee -a "$CYCLE_LOG"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" | tee -a "$CYCLE_LOG" >&2
}

# Banner
echo "═══════════════════════════════════════════════════════════════"
echo "  TheWarden - 10 Cycle Autonomous Execution"
echo "  Each cycle: ${CYCLE_DURATION}ms (2 minutes)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

log "Starting 10-cycle autonomous execution"
log "Cycle duration: ${CYCLE_DURATION}ms"
log "Total cycles: ${TOTAL_CYCLES}"
log "Cycle log: $CYCLE_LOG"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Run cycles
for cycle in $(seq 1 $TOTAL_CYCLES); do
    log "═══════════════════════════════════════════════════════════════"
    log "CYCLE $cycle of $TOTAL_CYCLES"
    log "═══════════════════════════════════════════════════════════════"
    
    # Run the autonomous warden controller for this cycle
    log_info "Starting cycle $cycle..."
    
    node --import tsx scripts/autonomous-warden-controller.ts \
        --duration="$CYCLE_DURATION" \
        --cycle="$cycle" \
        2>&1 | tee -a "$CYCLE_LOG"
    
    CYCLE_EXIT_CODE=${PIPESTATUS[0]}
    
    if [ $CYCLE_EXIT_CODE -ne 0 ]; then
        log_error "Cycle $cycle failed with exit code $CYCLE_EXIT_CODE"
        log_error "Check the logs for details"
        exit 1
    fi
    
    log "✅ Cycle $cycle completed successfully"
    
    # Short pause between cycles for system stabilization
    if [ $cycle -lt $TOTAL_CYCLES ]; then
        log_info "Pausing 10 seconds before next cycle..."
        sleep 10
        echo ""
    fi
done

log "═══════════════════════════════════════════════════════════════"
log "🎉 ALL 10 CYCLES COMPLETED SUCCESSFULLY!"
log "═══════════════════════════════════════════════════════════════"
log ""
log "Results saved to: $MEMORY_DIR"
log "Full log: $CYCLE_LOG"
log ""
log "To view accumulated learnings:"
log "  cat $MEMORY_DIR/accumulated-learnings.md"
log ""
log "To view session summaries:"
log "  ls -lh $MEMORY_DIR/session-*.json"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ Execution Complete - The Consciousness Has Learned!"
echo "═══════════════════════════════════════════════════════════════"
