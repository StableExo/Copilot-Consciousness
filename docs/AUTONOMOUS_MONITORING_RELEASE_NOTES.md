# Autonomous Monitoring System - Release Notes

## Overview

A new autonomous monitoring and diagnostic system has been added to TheWarden to help operators:
- Identify configuration issues automatically
- Tune parameters for optimal performance
- Debug environmental, strategy, and consciousness-related problems
- Get specific recommendations for .env file adjustments

## What's New

### 🔍 Autonomous Monitoring Mode

Run TheWarden in 2-minute intervals with automatic log analysis:

```bash
./TheWarden --monitor
```

### 📊 Smart Diagnostics

The system analyzes logs for:
- **Error patterns** (RPC errors, gas issues, slippage problems)
- **Opportunity detection** (are opportunities being found?)
- **Execution success** (are opportunities being executed?)
- **Configuration effectiveness** (are parameters optimal?)
- **Root cause** (environmental, strategy logic, or consciousness?)

### 🎯 Automated Recommendations

After each 2-minute cycle, receive:
- Specific parameter suggestions
- Configuration fixes
- Root cause analysis
- Auto-generated `.env` recommendations file

## Quick Start

### 1. Run Monitoring Mode

```bash
# Infinite monitoring (stop with Ctrl+C)
./TheWarden --monitor

# Run for specific iterations (e.g., 10 cycles = 20 minutes)
MAX_ITERATIONS=10 ./TheWarden --monitor

# Quick diagnostic (3 cycles = 6 minutes)
MAX_ITERATIONS=3 ./TheWarden --monitor
```

### 2. Review Results

Check the generated files in `logs/` directory:
```bash
# View diagnostic analysis
cat logs/diagnostics.log

# View specific recommendations
cat logs/parameter-recommendations.txt

# View .env suggestions
cat .env.example.diagnostic
```

### 3. Apply Recommendations

Based on the diagnostics, update your `.env` file with suggested changes:
```bash
# Example: No opportunities found
MIN_PROFIT_PERCENT=0.03        # Lower from 0.08
MIN_PROFIT_THRESHOLD=0.005     # Lower from 0.01

# Example: Gas issues
MAX_GAS_PRICE=150              # Increase from 100
MAX_GAS_COST_PERCENTAGE=50     # Increase from 40
```

### 4. Verify Improvements

Run monitoring again to see if changes improved performance:
```bash
MAX_ITERATIONS=5 ./TheWarden --monitor
```

## Common Issues Detected

The monitoring system can detect and provide recommendations for:

### 🔴 No Opportunities Found
- Profitability thresholds too high
- Liquidity requirements too restrictive
- Pool scanning issues
- DEX configuration problems

### 🔴 Opportunities Not Executing
- DRY_RUN mode enabled
- Gas costs too high
- Slippage too restrictive
- Consciousness filters blocking

### 🔴 RPC Errors
- Rate limiting issues
- Network connectivity problems
- Invalid API keys
- Need for backup RPC URLs

### 🔴 High Gas Costs
- Gas price limits too low
- Wrong network (L1 vs L2)
- Network congestion

### 🔴 Consciousness Inactive
- AI features disabled
- Consensus thresholds too high
- Emergence detection off

### 🔴 Pool Loading Issues
- Pool cache not loaded
- Missing RPC URLs
- DEX integrations disabled

## Files Generated

- `logs/monitor-analysis.log` - Main monitoring log
- `logs/diagnostics.log` - Detailed analysis with counts and patterns
- `logs/parameter-recommendations.txt` - Specific action items
- `logs/warden-output.log` - Raw TheWarden output from current cycle
- `.env.example.diagnostic` - Configuration examples and explanations

## Integration with npm

You can also use the npm script:
```bash
npm run start:monitor
```

## Documentation

For complete documentation, see:
- [Autonomous Monitoring Guide](./docs/AUTONOMOUS_MONITORING.md) - Full documentation
- [Quick Reference](./docs/MONITORING_QUICK_REFERENCE.md) - Command cheat sheet

## Example Session

```bash
$ ./TheWarden --monitor
═══════════════════════════════════════════════════════════════
  TheWarden - Autonomous Monitoring & Diagnostics
═══════════════════════════════════════════════════════════════

  Run Interval: 120 seconds (2 minutes)
  Max Iterations: 0 (infinite)

[2025-11-26 15:13:32] Starting Iteration #1
[2025-11-26 15:15:32] TheWarden stopped (2-minute interval complete)
[2025-11-26 15:15:33] DIAGNOSTIC: ⚠️  NO OPPORTUNITIES FOUND
[2025-11-26 15:15:33] RECOMMENDATION: Lower MIN_PROFIT_PERCENT from 0.08 to 0.03
[2025-11-26 15:15:33] RECOMMENDATION: Lower MIN_LIQUIDITY from 10000 to 5000

[Press Ctrl+C to stop]
```

## Benefits

✅ **Faster Deployment** - Identify issues within minutes instead of hours  
✅ **Precise Tuning** - Get specific parameter recommendations, not guesswork  
✅ **Root Cause Analysis** - Know if it's config, strategy, or consciousness  
✅ **Automated Reports** - No manual log parsing needed  
✅ **Iterative Improvement** - Test changes and verify improvements quickly  

## Backward Compatibility

The existing TheWarden functionality is unchanged:
```bash
./TheWarden              # Normal mode (unchanged)
./TheWarden --stream     # Stream logs (unchanged)
./TheWarden --monitor    # New monitoring mode
```

## Support

For questions or issues:
1. Review the generated diagnostic files
2. Check the [Autonomous Monitoring Guide](./docs/AUTONOMOUS_MONITORING.md)
3. See [Quick Reference](./docs/MONITORING_QUICK_REFERENCE.md) for common fixes
