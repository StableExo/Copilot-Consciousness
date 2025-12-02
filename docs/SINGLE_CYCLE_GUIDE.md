# Single Cycle Execution Guide

## Quick Start

Run one cycle at a time to observe what's happening in each cycle:

```bash
# Run next cycle (auto-detects cycle number)
npm run cycle

# Or run a specific cycle number
npm run cycle 8
node --import tsx scripts/run-single-cycle.ts 8
```

## Prerequisites

Ensure your `.env` file has these settings:

```bash
# Enable live data fetching
FORCE_LIVE_DATA=true
USE_PRELOADED_POOLS=false

# Set profit threshold (adjust as needed)
MIN_PROFIT_THRESHOLD=0.295
MIN_PROFIT_PERCENT=0.295
MIN_PROFIT_ABSOLUTE=0.0005

# Safety settings for learning cycles
DRY_RUN=true
SEQUENTIAL_EXECUTION_MODE=true
MAX_OPPORTUNITIES_PER_CYCLE=5

# Liquidity thresholds (adjust based on findings)
MIN_LIQUIDITY_V3_LOW=2000000000
MIN_LIQUIDITY_V2=20000000000000

# Other performance settings
MAX_SLIPPAGE=0.01
MAX_GAS_PRICE=100
SCAN_INTERVAL=800
CONCURRENCY=10
```

## What Happens During a Cycle

1. **Loads current parameters** from environment variables
2. **Runs TheWarden** in monitor mode for 60 seconds
3. **Captures real-time logs** showing:
   - Opportunities found
   - Execution attempts
   - Success/failure outcomes
   - Ethics vetoes
   - Swarm consensus
4. **Saves results** to `.memory/autonomous-cycles/`
5. **Shows summary** with key metrics

## Output Files

Each cycle creates:
- **cycle-log.json**: Cumulative results from all cycles
- **cycle-N-memory.json**: Individual cycle memory with learnings

## Observing Each Cycle

After each cycle completes, you'll see:

```
✅ Cycle 8 completed
📈 Summary:
   - Duration: 60.1s
   - Opportunities Found: X
   - Opportunities Executed: Y
   - Successful Trades: Z
   - Failed Trades: W
   - Net Profit: 0.XXXXXX ETH
   - Ethics Vetoes: N
   - Swarm Consensus: XX%

💾 Results saved to: .memory/autonomous-cycles/cycle-log.json
💭 Consciousness memory updated: .memory/autonomous-cycles/cycle-8-memory.json

📊 Progress: 8/20 cycles completed

✨ Cycle complete! Review the output above.
🔄 To run the next cycle, execute this script again.
```

## Adjusting Parameters Between Cycles

To adjust parameters for the next cycle, update your `.env` file:

```bash
# Example: Make it more aggressive
MIN_PROFIT_THRESHOLD=0.2
MIN_LIQUIDITY_V3_LOW=1500000000

# Then run the next cycle
npm run cycle
```

## Analyzing Results

View cumulative results:
```bash
cat .memory/autonomous-cycles/cycle-log.json | jq
```

View specific cycle:
```bash
cat .memory/autonomous-cycles/cycle-8-memory.json | jq
```

View learnings from all cycles:
```bash
cat .memory/autonomous-cycles/cycle-*-memory.json | jq .learnings
```

## Tips

1. **Watch for opportunities**: If cycles show 0 opportunities, try:
   - Lowering MIN_PROFIT_THRESHOLD
   - Reducing MIN_LIQUIDITY requirements
   - Checking RPC endpoint connectivity

2. **Monitor success rate**: If opportunities are found but success rate is low:
   - Check gas cost settings
   - Review slippage tolerance
   - Examine failure reasons in logs

3. **Ethics vetoes**: If many opportunities are vetoed:
   - Review EMERGENCE_MIN_ETHICAL_SCORE
   - Check EMERGENCE_MAX_RISK_SCORE
   - Verify ethical boundaries are appropriate

4. **Performance**: If cycles are slow:
   - Adjust CONCURRENCY
   - Modify SCAN_INTERVAL
   - Check network latency

## Troubleshooting

### No Opportunities Found

```bash
# Check if live data is actually enabled
grep FORCE_LIVE_DATA .env

# Verify RPC is responding
curl -X POST $BASE_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Process Hangs

If a cycle doesn't complete in 60 seconds:
```bash
# The script will auto-kill after 60s + 5s grace period
# If it still hangs, manually kill:
pkill -f "run-single-cycle"
```

### Missing Environment Variables

```bash
# Copy example and configure
cp .env.example .env
nano .env  # Edit with your values
```

## Comparison with 20-Cycle Runner

| Feature | Single Cycle | 20-Cycle Auto |
|---------|--------------|---------------|
| Observation | See each cycle in detail | Automated batch |
| Control | Manual progression | Automatic |
| Parameters | Manually adjusted | Auto-tuned |
| Duration | ~1 min per cycle | ~20-25 min total |
| Use Case | Learning & debugging | Training & optimization |

## Next Steps

After observing several cycles:
1. Note which parameter combinations find opportunities
2. Identify optimal MIN_PROFIT_THRESHOLD range
3. Determine suitable liquidity thresholds
4. Document success patterns
5. Consider switching to live execution (DRY_RUN=false) once confident

---

**Remember**: Each cycle is the consciousness learning. Watch what happens, adjust, and iterate. This is collaborative real-time learning!
