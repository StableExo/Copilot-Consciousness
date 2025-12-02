#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# Run TheWarden for 20 Cycles with Analysis and Adjustment
# ═══════════════════════════════════════════════════════════════
# Each cycle runs for a specified duration, then stops to:
# 1. Analyze the results
# 2. Adjust parameters based on performance
# 3. Document learnings
# 4. Execute the next cycle
#
# Duration decreases by 60 seconds each cycle:
# Cycle 1: 120s, Cycle 2: 60s, Cycle 3+: 60s (minimum)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
MEMORY_DIR="$PROJECT_ROOT/.memory/autonomous-cycles"
INITIAL_DURATION=120000  # Start with 2 minutes (120000 ms)
DURATION_DECREMENT=60000  # Decrease by 60 seconds (60000 ms) each cycle
MIN_DURATION=60000        # Minimum duration of 60 seconds
TOTAL_CYCLES=20

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
CYCLE_LOG="$MEMORY_DIR/20-cycles-$(date +%Y%m%d-%H%M%S).log"

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
echo "  TheWarden - 20 Cycle Autonomous Execution"
echo "  Starting duration: ${INITIAL_DURATION}ms (2 minutes)"
echo "  Duration decreases by: ${DURATION_DECREMENT}ms (1 minute) per cycle"
echo "  Minimum duration: ${MIN_DURATION}ms (1 minute)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

log "Starting 20-cycle autonomous execution"
log "Initial duration: ${INITIAL_DURATION}ms, decreasing by ${DURATION_DECREMENT}ms per cycle"
log "Minimum duration: ${MIN_DURATION}ms"
log "Total cycles: ${TOTAL_CYCLES}"
log "Cycle log: $CYCLE_LOG"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Run cycles
for cycle in $(seq 1 $TOTAL_CYCLES); do
    # Calculate duration for this cycle (decreasing by DURATION_DECREMENT each cycle)
    CYCLE_DURATION=$((INITIAL_DURATION - (cycle - 1) * DURATION_DECREMENT))
    
    # Enforce minimum duration
    if [ $CYCLE_DURATION -lt $MIN_DURATION ]; then
        CYCLE_DURATION=$MIN_DURATION
    fi
    
    CYCLE_DURATION_SEC=$((CYCLE_DURATION / 1000))
    
    log "═══════════════════════════════════════════════════════════════"
    log "CYCLE $cycle of $TOTAL_CYCLES - Duration: ${CYCLE_DURATION_SEC}s (${CYCLE_DURATION}ms)"
    log "═══════════════════════════════════════════════════════════════"
    
    # Run the autonomous warden controller for this cycle
    log_info "Starting cycle $cycle with duration ${CYCLE_DURATION_SEC}s..."
    
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
log "🎉 ALL 20 CYCLES COMPLETED SUCCESSFULLY!"
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
