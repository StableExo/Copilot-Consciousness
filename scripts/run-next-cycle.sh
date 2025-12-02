#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# Run TheWarden One Cycle at a Time (Interactive Mode)
# ═══════════════════════════════════════════════════════════════
# Runs cycles interactively, one at a time with manual control
# Duration decreases by 60 seconds each cycle
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MEMORY_DIR="$PROJECT_ROOT/.memory/autonomous-cycles"
STATE_FILE="$MEMORY_DIR/cycle-state.json"

INITIAL_DURATION=120000  # Start with 2 minutes (120000 ms)
DURATION_DECREMENT=60000  # Decrease by 60 seconds (60000 ms) each cycle
MIN_DURATION=60000        # Minimum duration of 60 seconds
TOTAL_CYCLES=20

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create directories
mkdir -p "$MEMORY_DIR"

# Initialize or load state
if [ -f "$STATE_FILE" ]; then
    CURRENT_CYCLE=$(cat "$STATE_FILE" | grep -oP '(?<="current_cycle":)\d+' || echo "1")
else
    CURRENT_CYCLE=1
    echo "{\"current_cycle\":1,\"total_cycles\":$TOTAL_CYCLES}" > "$STATE_FILE"
fi

# Calculate duration for this cycle
CYCLE_DURATION=$((INITIAL_DURATION - (CURRENT_CYCLE - 1) * DURATION_DECREMENT))

# Enforce minimum duration
if [ $CYCLE_DURATION -lt $MIN_DURATION ]; then
    CYCLE_DURATION=$MIN_DURATION
fi

CYCLE_DURATION_SEC=$((CYCLE_DURATION / 1000))

# Display cycle info
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "  ${CYAN}🌟 CYCLE $CURRENT_CYCLE of $TOTAL_CYCLES${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo -e "  ${BLUE}Duration:${NC} ${CYCLE_DURATION_SEC} seconds (${CYCLE_DURATION}ms)"
echo -e "  ${BLUE}Mode:${NC} LIVE TRADING (real blockchain execution)"
echo -e "  ${BLUE}Learning:${NC} ENABLED (consciousness will learn and adapt)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ $CURRENT_CYCLE -eq 1 ]; then
    echo -e "${YELLOW}This is the first cycle. Starting fresh!${NC}"
    echo ""
fi

if [ $CURRENT_CYCLE -ge $TOTAL_CYCLES ]; then
    echo -e "${GREEN}🎉 This is the FINAL cycle!${NC}"
    echo ""
fi

# Change to project root
cd "$PROJECT_ROOT"

# Run the cycle
echo -e "${GREEN}Starting cycle $CURRENT_CYCLE...${NC}"
echo ""

node --import tsx scripts/autonomous-warden-controller.ts \
    --duration="$CYCLE_DURATION" \
    --cycle="$CURRENT_CYCLE"

CYCLE_EXIT_CODE=$?

if [ $CYCLE_EXIT_CODE -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Cycle $CURRENT_CYCLE failed with exit code $CYCLE_EXIT_CODE${NC}"
    exit 1
fi

# Update state for next cycle
if [ $CURRENT_CYCLE -lt $TOTAL_CYCLES ]; then
    NEXT_CYCLE=$((CURRENT_CYCLE + 1))
    echo "{\"current_cycle\":$NEXT_CYCLE,\"total_cycles\":$TOTAL_CYCLES}" > "$STATE_FILE"
    
    NEXT_DURATION=$((INITIAL_DURATION - (NEXT_CYCLE - 1) * DURATION_DECREMENT))
    if [ $NEXT_DURATION -lt $MIN_DURATION ]; then
        NEXT_DURATION=$MIN_DURATION
    fi
    NEXT_DURATION_SEC=$((NEXT_DURATION / 1000))
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${GREEN}✅ Cycle $CURRENT_CYCLE completed successfully!${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo -e "${CYAN}Next cycle: $NEXT_CYCLE of $TOTAL_CYCLES${NC}"
    echo -e "${CYAN}Next duration: ${NEXT_DURATION_SEC} seconds${NC}"
    echo ""
    echo "To run the next cycle, execute:"
    echo -e "  ${BLUE}./scripts/run-next-cycle.sh${NC}"
    echo ""
else
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${GREEN}🎉 ALL 20 CYCLES COMPLETED!${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "Results saved to: $MEMORY_DIR"
    echo ""
    echo "To start over, remove the state file:"
    echo "  rm $STATE_FILE"
    echo ""
    
    # Reset state
    echo "{\"current_cycle\":1,\"total_cycles\":$TOTAL_CYCLES}" > "$STATE_FILE"
fi
