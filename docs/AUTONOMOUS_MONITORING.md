# TheWarden Autonomous Monitoring & Diagnostics

## Overview

The autonomous monitoring system allows you to run TheWarden in diagnostic mode with automatic log analysis, issue detection, and parameter adjustment recommendations. This is particularly useful for:

- **Initial deployment** - Understanding if TheWarden is working correctly on mainnet
- **Troubleshooting** - Identifying configuration issues, RPC problems, or strategy logic issues
- **Parameter tuning** - Finding optimal settings for your specific environment
- **Determining issue source** - Whether problems are environmental, strategy logic, or consciousness-related

## Features

### 🔄 Automated Cycle
- Runs TheWarden for **2-minute intervals**
- Automatically stops and analyzes logs
- Provides real-time diagnostic insights
- Generates parameter recommendations

### 🔍 Comprehensive Analysis
The monitoring system analyzes logs for:
- **Error patterns** (RPC errors, gas issues, slippage problems)
- **Opportunity detection** (are opportunities being found?)
- **Execution rate** (are opportunities being executed?)
- **Gas cost issues** (is gas too expensive?)
- **Pool loading** (are DEX pools being detected?)
- **Consciousness activity** (is AI making decisions?)
- **Configuration effectiveness** (current parameter analysis)

### 📊 Diagnostic Categories

#### Environmental Issues
- RPC connectivity and rate limiting
- Network timeouts
- API key problems
- Chain configuration errors

#### Strategy Logic Issues
- Profitability thresholds too restrictive
- Gas cost limits too tight
- Slippage parameters too conservative
- Insufficient liquidity thresholds

#### Consciousness Issues
- AI not evaluating opportunities
- Cognitive modules not reaching consensus
- Emergence detection not triggering
- Ethical filters blocking execution

## Usage

### Basic Usage

Run in monitoring mode (infinite iterations):
```bash
./TheWarden --monitor
```

Or use the diagnostic alias:
```bash
./TheWarden --diagnostic
```

### Limited Iterations

Run for specific number of iterations (e.g., 10 cycles = 20 minutes):
```bash
MAX_ITERATIONS=10 ./TheWarden --monitor
```

Run for quick test (3 cycles = 6 minutes):
```bash
MAX_ITERATIONS=3 ./TheWarden --monitor
```

### Stopping

Press `Ctrl+C` at any time to stop monitoring and generate final recommendations.

## Output Files

The monitoring system creates several files in the `logs/` directory:

### `logs/monitor-analysis.log`
Main monitoring log with all analysis output
```
[2025-11-26 15:13:32] Starting Iteration #1
[2025-11-26 15:15:32] TheWarden stopped (2-minute interval complete)
[2025-11-26 15:15:33] DIAGNOSTIC: Iteration #1 - Log Analysis
```

### `logs/diagnostics.log`
Detailed diagnostic information including:
- Error counts and patterns
- Configuration analysis
- Issue identification
```
DIAGNOSTIC: ⚠️  NO OPPORTUNITIES FOUND in this interval
DIAGNOSTIC: Current Configuration:
DIAGNOSTIC:   MIN_PROFIT_PERCENT: 0.08%
DIAGNOSTIC:   MIN_PROFIT_THRESHOLD: 0.01
```

### `logs/parameter-recommendations.txt`
Specific parameter adjustment recommendations
```
RECOMMENDATION: OPPORTUNITY_ISSUE: No arbitrage opportunities detected
RECOMMENDATION:   Suggested: Lower MIN_PROFIT_PERCENT from 0.08 to 0.03
RECOMMENDATION:   Suggested: Lower MIN_LIQUIDITY from 10000 to 5000
```

### `logs/warden-output.log`
Raw TheWarden output from current iteration

### `.env.example.diagnostic`
Auto-generated `.env` parameter recommendations with explanations

## Common Issues and Recommendations

### Issue: No Opportunities Found

**Symptoms:**
- `OPPORTUNITY_ISSUE` in recommendations
- Zero opportunities detected across multiple iterations

**Likely Causes:**
1. Profitability thresholds too high
2. Insufficient liquidity requirements
3. Pool scanning issues
4. DEX configuration problems

**Recommended Actions:**
```bash
# In your .env file, adjust:
MIN_PROFIT_PERCENT=0.03          # Lower from 0.08
MIN_PROFIT_THRESHOLD=0.005       # Lower from 0.01
MIN_LIQUIDITY=5000               # Lower from 10000
SCAN_CHAINS=8453,1,42161,10     # Ensure multiple chains
```

### Issue: Opportunities Found But Not Executed

**Symptoms:**
- `EXECUTION_ISSUE` in recommendations
- Opportunities detected but execution count is 0

**Likely Causes:**
1. `DRY_RUN=true` (simulation mode)
2. Gas costs exceeding profit
3. Slippage too restrictive
4. Consciousness filtering

**Recommended Actions:**
```bash
# In your .env file:
DRY_RUN=false                    # Enable real execution
MAX_GAS_PRICE=150                # Increase from 100 gwei
MAX_GAS_COST_PERCENTAGE=50       # Increase from 40%
MAX_SLIPPAGE=0.01                # Increase from 0.005 (1% vs 0.5%)
```

### Issue: High RPC Error Rate

**Symptoms:**
- `RPC_ISSUE` in recommendations
- Frequent connection timeouts or rate limit errors

**Likely Causes:**
1. RPC provider rate limiting
2. Network connectivity issues
3. Invalid or expired API keys
4. Free tier limitations

**Recommended Actions:**
```bash
# In your .env file:
# Add backup RPC URLs
ETHEREUM_RPC_URL_BACKUP=https://eth-mainnet.public.blastapi.io
BASE_RPC_URL_BACKUP=https://mainnet.base.org

# Increase rate limits
RPC_RATE_LIMIT=20000             # Increase from 10000

# Consider premium RPC providers:
# - Alchemy Pro tier
# - Infura paid plan
# - QuickNode
```

### Issue: Gas Costs Too High

**Symptoms:**
- `GAS_ISSUE` in recommendations
- Frequent gas-related rejections

**Likely Causes:**
1. Network congestion
2. Gas limits too conservative
3. Wrong chain (high gas on L1)

**Recommended Actions:**
```bash
# In your .env file:
MAX_GAS_PRICE=200                # Increase for faster execution
MAX_GAS_COST_PERCENTAGE=60       # Allow higher gas percentage
CHAIN_ID=8453                    # Use L2 (Base) for lower gas
SCAN_CHAINS=8453,42161,10        # Focus on L2 chains
```

### Issue: Consciousness Not Active

**Symptoms:**
- `CONSCIOUSNESS_ISSUE` in recommendations
- No consciousness-related log entries
- Opportunities found but no cognitive evaluation

**Likely Causes:**
1. AI features disabled
2. Emergence detection disabled
3. Consensus thresholds too high

**Recommended Actions:**
```bash
# In your .env file:
PHASE3_AI_ENABLED=true
EMERGENCE_DETECTION_ENABLED=true
COGNITIVE_CONSENSUS_THRESHOLD=0.6     # Lower from 0.7
EMERGENCE_MIN_ETHICAL_SCORE=0.60      # Lower from 0.70
```

### Issue: Pool Loading Problems

**Symptoms:**
- `POOL_ISSUE` in recommendations
- No pool activity in logs
- Empty DEX pool lists

**Likely Causes:**
1. Pool cache not loaded
2. RPC URLs not configured for all chains
3. DEX integrations disabled

**Recommended Actions:**
```bash
# Run pool preloading
npm run preload:pools --force

# Verify RPC URLs in .env for all SCAN_CHAINS
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY

# Enable DEX integrations
ENABLE_UNISWAP_V2=true
ENABLE_UNISWAP_V3=true
ENABLE_SUSHISWAP=true
```

## Interpreting Results

### Healthy Operation

A well-configured TheWarden should show:
- ✅ Opportunities found (>0 per 2-minute interval)
- ✅ Some executions (if profitable and DRY_RUN=false)
- ✅ Pool activity in logs
- ✅ Consciousness evaluation entries
- ✅ Low error count (<5 per interval)
- ✅ No RPC errors

### Configuration Needed

Signs you need to adjust parameters:
- ⚠️ Opportunities found: 0 (thresholds too high)
- ⚠️ Gas issues: >3 (gas limits too low)
- ⚠️ RPC errors: >5 (RPC problems)
- ⚠️ Execution rate: 0% (various issues)

### Critical Issues

Indicators of serious problems:
- ❌ No pool activity at all
- ❌ Constant RPC failures
- ❌ Build or startup errors
- ❌ Missing configuration values

## Advanced Configuration

### Custom Interval

The default 2-minute interval can be adjusted by editing the script:
```bash
# In scripts/autonomous-monitor.sh
RUN_INTERVAL=300  # 5 minutes instead of 2
```

### Custom Analysis

You can extend the analysis by adding patterns to the `analyze_logs()` function in `scripts/autonomous-monitor.sh`.

### Integration with CI/CD

Run monitoring in CI/CD pipelines:
```bash
# Run 3 iterations and check exit code
MAX_ITERATIONS=3 ./TheWarden --monitor
if [ $? -eq 0 ]; then
  echo "Monitoring passed"
fi
```

## Best Practices

### Initial Deployment

1. **Start with monitoring mode**
   ```bash
   MAX_ITERATIONS=5 ./TheWarden --monitor
   ```

2. **Review diagnostics** in `logs/diagnostics.log`

3. **Apply recommendations** from `logs/parameter-recommendations.txt`

4. **Re-run monitoring** to verify improvements

5. **Switch to normal mode** when satisfied
   ```bash
   ./TheWarden
   ```

### Troubleshooting Workflow

1. **Run monitoring for 30 minutes** (15 iterations)
   ```bash
   MAX_ITERATIONS=15 ./TheWarden --monitor
   ```

2. **Check recommendation categories**:
   - RPC_ISSUE → Fix connectivity
   - GAS_ISSUE → Adjust gas parameters
   - OPPORTUNITY_ISSUE → Lower thresholds
   - EXECUTION_ISSUE → Check DRY_RUN and filters
   - CONSCIOUSNESS_ISSUE → Enable AI features
   - POOL_ISSUE → Run preload:pools

3. **Apply changes incrementally** (one category at a time)

4. **Validate each change** with another monitoring run

### Production Monitoring

For ongoing production monitoring:
```bash
# Run infinite monitoring
./TheWarden --monitor

# Or use a cronjob for periodic checks
0 */6 * * * cd /path/to/project && MAX_ITERATIONS=3 ./TheWarden --monitor
```

## Troubleshooting the Monitoring System

### Monitoring Script Won't Start

```bash
# Ensure script is executable
chmod +x scripts/autonomous-monitor.sh

# Check for syntax errors
bash -n scripts/autonomous-monitor.sh

# Check .env exists
ls -la .env
```

### Build Not Found

```bash
# Build the project
npm run build

# Verify build output
ls -la dist/src/main.js
```

### Logs Not Generated

```bash
# Check logs directory exists and is writable
mkdir -p logs
chmod 755 logs

# Check disk space
df -h
```

## FAQ

**Q: How long should I run monitoring mode?**  
A: Start with 5-10 iterations (10-20 minutes) to identify major issues. For comprehensive tuning, run 15-30 iterations (30-60 minutes).

**Q: Will this execute real transactions?**  
A: It respects your `DRY_RUN` setting. Set `DRY_RUN=true` for safe testing, `DRY_RUN=false` for real execution.

**Q: Can I adjust the 2-minute interval?**  
A: Yes, edit `RUN_INTERVAL` in `scripts/autonomous-monitor.sh`. Longer intervals (5-10 minutes) may provide more data per iteration.

**Q: What if I see "No issues detected"?**  
A: Great! Your configuration is likely optimal. Switch to normal mode: `./TheWarden`

**Q: How do I know if it's my config vs. the strategy logic?**  
A: The monitoring system categorizes issues:
- `RPC_ISSUE`, `GAS_ISSUE`, `POOL_ISSUE` = Environmental/config
- `OPPORTUNITY_ISSUE`, `EXECUTION_ISSUE` = Strategy parameters
- `CONSCIOUSNESS_ISSUE` = AI/consciousness configuration

**Q: Can I run this on testnet?**  
A: Yes! Set `CHAIN_ID` to a testnet (e.g., 84532 for Base Sepolia) in your `.env` file.

## Support

For issues or questions:
1. Review `logs/diagnostics.log` for detailed analysis
2. Check `logs/parameter-recommendations.txt` for specific suggestions
3. Consult `.env.example.diagnostic` for configuration examples
4. See the main [README.md](../README.md) for project documentation
5. Review [MAINNET_QUICKSTART.md](../MAINNET_QUICKSTART.md) for deployment guidance
