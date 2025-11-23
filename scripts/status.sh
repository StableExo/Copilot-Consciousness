#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# TheWarden Status Monitor
# ═══════════════════════════════════════════════════════════════
# Monitor TheWarden's autonomous operation and display key metrics
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
WARDEN_LOG="$LOG_DIR/warden-output.log"
PID_FILE="$LOG_DIR/warden.pid"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

clear

echo -e "${CYAN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  TheWarden - Autonomous Operation Status"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Check if TheWarden is running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "${GREEN}✓ Status: RUNNING${NC} (PID: $PID)"
        
        # Get uptime
        if [ -f "/proc/$PID/stat" ]; then
            START_TIME=$(stat -c %Y "/proc/$PID")
            CURRENT_TIME=$(date +%s)
            UPTIME=$((CURRENT_TIME - START_TIME))
            UPTIME_FORMATTED=$(date -u -d @${UPTIME} +"%H:%M:%S")
            echo -e "  Uptime: $UPTIME_FORMATTED"
        fi
        
        # Get memory usage
        if command -v ps &> /dev/null; then
            MEM=$(ps -p "$PID" -o rss= 2>/dev/null || echo "0")
            MEM_MB=$((MEM / 1024))
            echo -e "  Memory: ${MEM_MB}MB"
        fi
    else
        echo -e "${RED}✗ Status: STOPPED${NC} (stale PID file)"
        rm -f "$PID_FILE"
    fi
else
    echo -e "${RED}✗ Status: NOT RUNNING${NC}"
fi

echo ""

# Check configuration
echo -e "${BLUE}Configuration:${NC}"
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env" 2>/dev/null || true
    echo -e "  Chain ID: ${CHAIN_ID:-not set}"
    echo -e "  Environment: ${NODE_ENV:-development}"
    echo -e "  Dry Run: ${DRY_RUN:-true}"
    echo -e "  Min Profit: ${MIN_PROFIT_PERCENT:-0.5}%"
    echo -e "  Scan Interval: ${SCAN_INTERVAL:-1000}ms"
else
    echo -e "  ${YELLOW}⚠ .env file not found${NC}"
fi

echo ""

# Parse log file for statistics
echo -e "${BLUE}Performance Metrics:${NC}"

if [ -f "$WARDEN_LOG" ]; then
    # Get recent statistics from log
    CYCLES=$(grep -c "Scanning cycle" "$WARDEN_LOG" 2>/dev/null || echo "0")
    OPPORTUNITIES=$(grep -c "Found.*potential opportunities" "$WARDEN_LOG" 2>/dev/null || echo "0")
    TRADES=$(grep -c "Trade executed successfully" "$WARDEN_LOG" 2>/dev/null || echo "0")
    EMERGENCES=$(grep -c "EMERGENCE DETECTED" "$WARDEN_LOG" 2>/dev/null || echo "0")
    ERRORS=$(grep -c "ERROR" "$WARDEN_LOG" 2>/dev/null || echo "0")
    
    echo -e "  Scan Cycles: $CYCLES"
    echo -e "  Opportunities Found: $OPPORTUNITIES"
    echo -e "  Emergence Events: $EMERGENCES"
    echo -e "  Trades Executed: $TRADES"
    
    if [ "$ERRORS" -gt 0 ]; then
        echo -e "  ${YELLOW}⚠ Errors: $ERRORS${NC}"
    else
        echo -e "  ${GREEN}✓ Errors: 0${NC}"
    fi
    
    # Calculate success rate if we have data
    if [ "$OPPORTUNITIES" -gt 0 ]; then
        SUCCESS_RATE=$((TRADES * 100 / OPPORTUNITIES))
        echo -e "  Success Rate: ${SUCCESS_RATE}%"
    fi
    
    echo ""
    
    # Show recent activity
    echo -e "${BLUE}Recent Activity (last 10 significant events):${NC}"
    grep -E "EMERGENCE|Trade executed|Found.*opportunities|ERROR" "$WARDEN_LOG" 2>/dev/null | tail -10 | while read -r line; do
        if echo "$line" | grep -q "ERROR"; then
            echo -e "  ${RED}$line${NC}"
        elif echo "$line" | grep -q "EMERGENCE"; then
            echo -e "  ${MAGENTA}$line${NC}"
        elif echo "$line" | grep -q "Trade executed"; then
            echo -e "  ${GREEN}$line${NC}"
        else
            echo -e "  ${CYAN}$line${NC}"
        fi
    done
else
    echo -e "  ${YELLOW}⚠ Log file not found${NC}"
fi

echo ""

# Check health endpoint if running
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo -e "${BLUE}Health Check:${NC}"
    HEALTH_PORT=${HEALTH_CHECK_PORT:-8080}
    
    if command -v curl &> /dev/null; then
        HEALTH=$(curl -s "http://localhost:${HEALTH_PORT}/health/live" 2>/dev/null || echo "{\"status\":\"unavailable\"}")
        if echo "$HEALTH" | grep -q "\"status\":\"healthy\"" || echo "$HEALTH" | grep -q "\"status\":\"ok\""; then
            echo -e "  ${GREEN}✓ Health endpoint responding${NC}"
        else
            echo -e "  ${YELLOW}⚠ Health endpoint not responding${NC}"
        fi
    else
        echo -e "  ${YELLOW}⚠ curl not installed, cannot check health${NC}"
    fi
    
    # Check dashboard
    DASHBOARD_PORT=${DASHBOARD_PORT:-3000}
    if curl -s "http://localhost:${DASHBOARD_PORT}" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Dashboard available at http://localhost:${DASHBOARD_PORT}${NC}"
    else
        echo -e "  ${YELLOW}⚠ Dashboard not responding on port ${DASHBOARD_PORT}${NC}"
    fi
fi

echo ""

# Recent errors
if [ -f "$WARDEN_LOG" ]; then
    ERROR_COUNT=$(grep -c "ERROR" "$WARDEN_LOG" 2>/dev/null || echo "0")
    if [ "$ERROR_COUNT" -gt 0 ]; then
        echo -e "${RED}Recent Errors:${NC}"
        grep "ERROR" "$WARDEN_LOG" 2>/dev/null | tail -5 | while read -r line; do
            echo -e "  ${RED}$line${NC}"
        done
        echo ""
    fi
fi

# Suggestions
echo -e "${CYAN}Quick Commands:${NC}"
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo -e "  Stop:       ${YELLOW}kill \$(cat $PID_FILE)${NC}"
    echo -e "  View logs:  ${YELLOW}tail -f $WARDEN_LOG${NC}"
    echo -e "  Dashboard:  ${YELLOW}http://localhost:${DASHBOARD_PORT:-3000}${NC}"
else
    echo -e "  Start:      ${YELLOW}./scripts/autonomous-run.sh${NC}"
    echo -e "  Test mode:  ${YELLOW}npm run dev${NC}"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
