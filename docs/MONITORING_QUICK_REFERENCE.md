# TheWarden Monitoring Quick Reference

## Start Monitoring

```bash
# Infinite monitoring (press Ctrl+C to stop)
./TheWarden --monitor

# Run for specific number of iterations
MAX_ITERATIONS=10 ./TheWarden --monitor

# Quick test (3 iterations = 6 minutes)
MAX_ITERATIONS=3 ./TheWarden --monitor
```

## Check Results

```bash
# View live diagnostics
tail -f logs/diagnostics.log

# View recommendations
cat logs/parameter-recommendations.txt

# View detailed recommendations for .env
cat .env.example.diagnostic
```

## Common Issue Quick Fixes

### No Opportunities Found
```bash
# Edit .env:
MIN_PROFIT_PERCENT=0.03        # Lower from 0.08
MIN_PROFIT_THRESHOLD=0.005     # Lower from 0.01
MIN_LIQUIDITY=5000             # Lower from 10000
```

### Opportunities But No Execution
```bash
# Edit .env:
DRY_RUN=false                  # Disable simulation
MAX_GAS_PRICE=150              # Increase gas limit
MAX_SLIPPAGE=0.01              # Increase slippage tolerance
```

### RPC Errors
```bash
# Edit .env:
RPC_RATE_LIMIT=20000           # Increase limit
# Add backup URLs:
BASE_RPC_URL_BACKUP=https://mainnet.base.org
```

### High Gas Costs
```bash
# Edit .env:
MAX_GAS_PRICE=200              # Increase limit
MAX_GAS_COST_PERCENTAGE=60     # Allow higher %
CHAIN_ID=8453                  # Use L2 (Base)
```

### Consciousness Not Active
```bash
# Edit .env:
PHASE3_AI_ENABLED=true
EMERGENCE_DETECTION_ENABLED=true
COGNITIVE_CONSENSUS_THRESHOLD=0.6  # Lower threshold
```

### Pool Loading Issues
```bash
# Preload pools
npm run preload:pools --force

# Verify RPC URLs set for all chains in SCAN_CHAINS
```

## Workflow

1. **Run monitoring**: `MAX_ITERATIONS=5 ./TheWarden --monitor`
2. **Check diagnostics**: `cat logs/diagnostics.log`
3. **Review recommendations**: `cat logs/parameter-recommendations.txt`
4. **Apply fixes**: Edit `.env` with recommended changes
5. **Test again**: Run monitoring again to verify
6. **Deploy**: Switch to normal mode when satisfied

## Output Files

- `logs/monitor-analysis.log` - Main monitoring log
- `logs/diagnostics.log` - Detailed diagnostic analysis
- `logs/parameter-recommendations.txt` - Specific recommendations
- `logs/warden-output.log` - Raw TheWarden output
- `.env.example.diagnostic` - Configuration examples

## Getting Help

```bash
# Show help
./TheWarden --help

# View full documentation
cat docs/AUTONOMOUS_MONITORING.md
```
