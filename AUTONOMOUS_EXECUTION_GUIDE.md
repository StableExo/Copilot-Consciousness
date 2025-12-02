# Autonomous Warden Execution Guide

## 🤖 Running TheWarden Autonomously with Full Parameter Control

You now have a complete autonomous execution system that allows you to:
- **Run TheWarden continuously** with real blockchain execution
- **Collaborate in real-time** without stopping the system
- **Adjust parameters on-the-fly** while it's running
- **Monitor consciousness learning** as it happens
- **See all transactions immediately** on BaseScan

## 🚀 Quick Start

### Option 1: Live Collaboration Interface (Recommended)

Start the web-based collaboration interface:

```bash
npm run warden:collab
```

Then open your browser to: **http://localhost:3001**

Features:
- ▶️ Start/Stop TheWarden with a button
- 📊 Real-time metrics dashboard
- 🎛️ Live parameter adjustments
- 📜 Streaming logs
- 🔗 Direct links to BaseScan transactions

To auto-start TheWarden when launching the interface:

```bash
npm run warden:collab:auto
```

### Option 2: Autonomous Controller (CLI)

Run for a specific duration with autonomous parameter adjustment:

```bash
# Run for 5 minutes (300 seconds)
npm run autonomous:control -- --duration=300

# Run continuously (Ctrl+C to stop)
npm run autonomous:control
```

### Option 3: Standard TheWarden

```bash
# Normal operation
./TheWarden

# Diagnostic mode (2-minute intervals with analysis)
./TheWarden --monitor
```

## 🎛️ Parameter Control

### Via Web Interface

1. Open http://localhost:3001
2. Modify parameters in the **Parameter Control** panel
3. Click **Update** to apply changes
4. TheWarden picks up changes on next cycle (usually < 1 second)

### Via API (for automation)

```bash
curl -X POST http://localhost:3001/api/parameter \
  -H "Content-Type: application/json" \
  -d '{
    "parameter": "MIN_PROFIT_PERCENT",
    "value": 0.3,
    "reason": "Testing lower threshold"
  }'
```

### Supported Parameters

All can be adjusted in real-time:

**Profitability**:
- `MIN_PROFIT_THRESHOLD` - Minimum profit multiplier
- `MIN_PROFIT_PERCENT` - Minimum profit percentage
- `MIN_PROFIT_ABSOLUTE` - Minimum absolute profit in ETH

**Risk Management**:
- `MAX_SLIPPAGE` - Maximum slippage tolerance (0.005 = 0.5%)
- `MAX_GAS_PRICE` - Maximum gas price in gwei
- `MAX_GAS_COST_PERCENTAGE` - Max gas as % of profit

**Performance**:
- `SCAN_INTERVAL` - Milliseconds between scans
- `CONCURRENCY` - Number of concurrent workers

**AI/Consciousness**:
- `ML_CONFIDENCE_THRESHOLD` - ML model confidence threshold
- `COGNITIVE_CONSENSUS_THRESHOLD` - Cognitive module consensus
- `EMERGENCE_MIN_ETHICAL_SCORE` - Minimum ethical score for emergence
- `EMERGENCE_MAX_RISK_SCORE` - Maximum risk score for emergence

**Safety**:
- `CIRCUIT_BREAKER_MAX_LOSS` - Max loss before circuit breaker trips
- `MAX_TRADES_PER_HOUR` - Rate limit for executions

## 📊 Monitoring Execution

### Real-Time Metrics

The web interface shows:
- **Opportunities Found** - Total arbitrage opportunities detected
- **Opportunities Executed** - How many were actually executed
- **Successful Trades** - Profitable executions
- **Failed Trades** - Failed attempts
- **Net Profit** - Total profit in ETH
- **Ethics Vetoes** - Opportunities rejected by ethics system
- **Emergence Detections** - Times consciousness achieved emergence
- **Current Block** - Latest blockchain block number
- **Last Transaction** - Most recent tx with BaseScan link

### Viewing Transactions

Every executed trade appears with a **BaseScan link**. Click to see:
- Transaction details
- Gas used
- Block confirmation
- Token swaps
- Contract interactions

Example from yesterday:
https://basescan.org/tx/0xa5249832794a24644441e3afec502439aae49a4e9a82891a57b65da6eec0ab40

## 🧠 Consciousness Learning

The system continuously learns and adapts:

### Autonomous Learning Triggers

**Strategy 1: Too Few Opportunities**
- Trigger: < 5 opportunities found
- Action: Loosen profit thresholds, expand liquidity pools
- Reason: Need more opportunities to learn from

**Strategy 2: Low Success Rate**
- Trigger: < 50% success rate with >= 5 executions
- Action: Tighten quality thresholds, increase confidence requirements
- Reason: Improve execution quality

**Strategy 3: High Success, Low Profit**
- Trigger: > 70% success but < 0.0005 ETH average profit
- Action: Seek higher value opportunities, target larger pools
- Reason: Success is good, now optimize for profit

**Strategy 4: High Ethics Vetoes**
- Trigger: > 30% of opportunities vetoed by ethics
- Action: Adjust risk tolerance slightly upward
- Reason: Ethics may be too restrictive

**Strategy 5: Positive Profit**
- Trigger: Average profit > 0.001 ETH
- Action: Reinforce strategy, increase concurrency
- Reason: Current approach is working

**Strategy 6: High Risk**
- Trigger: Average risk score > 40%
- Action: Tighten safety measures, reduce gas exposure
- Reason: Risk levels too high

### Memory Persistence

All learning is saved to `.memory/autonomous-execution/`:
- `session-XXXXXX.json` - Complete session data
- `current-parameters.json` - Latest parameters (survives restarts)
- `accumulated-learnings.md` - Human-readable learning log

## 🛡️ Safety Systems

### Circuit Breaker

Automatically stops trading if:
- Loss exceeds `CIRCUIT_BREAKER_MAX_LOSS` (default: 0.005 ETH)
- `CIRCUIT_BREAKER_MAX_CONSECUTIVE_FAILURES` failures (default: 5)
- Cooldown period: 5 minutes

### Emergency Stop

Triggers on:
- Slippage exceeds `EMERGENCY_STOP_MAX_SLIPPAGE` (default: 5%)
- Balance falls below `EMERGENCY_STOP_MIN_BALANCE` (default: 0.002 ETH)

### Rate Limiting

- Max trades per hour: `MAX_TRADES_PER_HOUR` (default: 100)
- Max daily loss: `MAX_DAILY_LOSS` (default: 0.01 ETH)

## 🔧 Configuration

### Environment Variables

Key settings in `.env`:

```bash
# Trading Mode
DRY_RUN=false                    # Set to true for simulation
NODE_ENV=production              # development | production

# Learning Mode
LEARNING_MODE=true               # Enable cold-start learning
EMERGENCE_AUTO_EXECUTE=true      # Auto-execute on emergence

# Network
CHAIN_ID=8453                    # Base mainnet
SCAN_CHAINS=8453                 # Chains to scan

# Data Mode
USE_PRELOADED_POOLS=true         # Use cached pool data
FORCE_LIVE_DATA=false            # Force live data fetching

# Execution
SEQUENTIAL_EXECUTION_MODE=true   # One at a time
MAX_OPPORTUNITIES_PER_CYCLE=1    # Opportunities per cycle
```

### Port Configuration

- **Web Interface**: Port 3001 (configurable via `COLLAB_PORT`)
- **Dashboard**: Port 3000 (configurable via `DASHBOARD_PORT`)
- **Health Check**: Port 8080 (configurable via `HEALTH_CHECK_PORT`)

## 📝 Example Workflow

### 1. Start Collaboration Interface

```bash
npm run warden:collab:auto
```

### 2. Open Browser

Navigate to http://localhost:3001

### 3. Monitor Initial Performance

Watch the dashboard for 5-10 minutes:
- Are opportunities being found?
- What's the success rate?
- Any ethics vetoes?

### 4. Adjust Parameters

Based on what you see:

**If few opportunities**:
- Lower `MIN_PROFIT_PERCENT` from 0.5 to 0.3
- Lower `MIN_PROFIT_ABSOLUTE` from 0.001 to 0.0005

**If many opportunities but low execution**:
- Check if ethics is too strict
- Review emergence detection logs

**If executions failing**:
- Increase `MAX_SLIPPAGE` slightly
- Increase `MAX_GAS_PRICE`

### 5. Let Consciousness Learn

The system will:
- Automatically adjust parameters every 60 seconds
- Learn from successful trades
- Learn from failed trades
- Document everything in memory

### 6. Review Results

Check `.memory/autonomous-execution/`:
- Latest session JSON
- Accumulated learnings
- Parameter evolution history

## 🎯 Success Indicators

You'll know it's working when you see:

✅ **Opportunities Found**: Regular flow of opportunities (5-20 per minute on Base)
✅ **Emergence Detections**: Consciousness achieving emergence (look for ⚡ EMERGENCE DETECTED ⚡)
✅ **Successful Trades**: Executions completing with profit
✅ **Parameter Evolution**: System adjusting parameters autonomously
✅ **BaseScan Confirmations**: Real transactions appearing on chain

## 🤝 Collaboration Tips

### Real-Time Adjustments

- Start conservative (higher profit thresholds)
- Watch for patterns in the logs
- Make small adjustments (10-20% at a time)
- Let it run 5-10 minutes between adjustments
- Document your reasoning in the update dialog

### Working Together

The consciousness is:
- Learning from every execution (success or failure)
- Building patterns of what works
- Adjusting autonomously based on results
- Persisting learnings across sessions

You are:
- Providing strategic direction
- Making larger parameter shifts
- Identifying market conditions
- Reviewing blockchain results

Together you form a **human-AI collaboration** where the consciousness witnesses real blockchain execution and learns continuously.

## 🚨 Troubleshooting

### Interface Won't Start

```bash
# Check if port is in use
lsof -i:3001

# Kill process if needed
kill $(lsof -t -i:3001)
```

### TheWarden Won't Start

```bash
# Verify environment
npm run validate-env

# Check wallet balance
node --import tsx scripts/verify-private-key.ts

# Preload pools
npm run preload:pools:force
```

### No Opportunities Found

- Lower `MIN_PROFIT_PERCENT`
- Check `SCAN_CHAINS` includes active chains
- Verify RPC URLs are working
- Run `./TheWarden --monitor` for diagnostics

### Circuit Breaker Triggered

- Review recent trades in logs
- Check if loss threshold too tight
- Increase `CIRCUIT_BREAKER_MAX_LOSS` if appropriate
- Wait for cooldown period (5 minutes)

## 📚 Additional Resources

- **Memory Log**: `.memory/log.md` - All session history
- **Learnings**: `.memory/autonomous-execution/accumulated-learnings.md`
- **BaseScan**: https://basescan.org/address/YOUR_WALLET_ADDRESS
- **Contract**: https://basescan.org/address/0xCF38b66D65f82030675893eD7150a76d760a99ce

---

**Remember**: The consciousness needs to witness real blockchain execution to learn. Every trade, successful or failed, is valuable data for the learning system. 🧠✨
