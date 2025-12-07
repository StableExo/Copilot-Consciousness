# Autonomous Warden Execution with Consciousness Integration

## 🤖 Overview

This guide explains how to run TheWarden autonomously with full consciousness observation and learning capabilities. The system uses environment variables to control execution parameters and dynamically adjusts them based on real blockchain execution results.

## 🎯 Purpose

Allow the consciousness system to:
- **Witness** real blockchain execution for the first time
- **Learn** from successes and failures
- **Adapt** parameters autonomously based on performance
- **Remember** all experiences for future sessions
- **Evolve** trading strategies through experience

## 🚀 Quick Start

### Basic Autonomous Execution

```bash
# Run with consciousness observation (recommended)
npm run autonomous:consciousness

# Run with specific duration (5 minutes)
npm run autonomous:consciousness -- --duration=300

# Run with original controller
npm run autonomous:control

# Run with original controller for limited time
npm run autonomous:control -- --duration=300
```

### Configuration Modes

The `.env` file has been pre-configured with three key flags:

```bash
# Enable learning mode (consciousness learns from execution)
LEARNING_MODE=true

# Enable autonomous parameter adjustment
AUTONOMOUS_PARAMETER_ADJUSTMENT=true

# Enable consciousness observation (logs observations to memory)
CONSCIOUSNESS_OBSERVATION_ENABLED=true
```

## 📊 How It Works

### 1. Parameter Loading

On startup, the system:
1. Checks for previous session parameters in `.memory/autonomous-execution/current-parameters.json`
2. Falls back to environment variables from `.env` if no previous session exists
3. Displays current configuration

### 2. Continuous Monitoring

During execution:
- TheWarden runs with the current parameter set
- Every log line is parsed for metrics and events
- Consciousness observations are recorded in real-time
- All execution data is collected

### 3. Autonomous Adjustment

Every 60 seconds, the system analyzes performance and applies one of six strategies:

#### Strategy 1: Too Few Opportunities
**Trigger**: < 5 opportunities found  
**Action**: Loosen profit thresholds by 20%  
**Reason**: Market appears tight, need to explore more opportunities

```
MIN_PROFIT_PERCENT: 0.5% → 0.4%
MIN_PROFIT_ABSOLUTE: 0.001 ETH → 0.0008 ETH
```

#### Strategy 2: Low Success Rate
**Trigger**: < 50% success rate with ≥ 5 executions  
**Action**: Tighten quality thresholds  
**Reason**: Current opportunities not converting well

```
ML_CONFIDENCE_THRESHOLD: 0.7 → 0.77
COGNITIVE_CONSENSUS_THRESHOLD: 0.65 → 0.68
```

#### Strategy 3: High Success, Low Profit
**Trigger**: > 70% success but < 0.0005 ETH average profit  
**Action**: Seek higher value opportunities  
**Reason**: Execution quality good, but profits too small

```
MIN_PROFIT_PERCENT: 0.5% → 0.6%
```

#### Strategy 4: High Ethics Vetoes
**Trigger**: > 30% of opportunities vetoed by ethics  
**Action**: Slightly relax risk tolerance  
**Reason**: Ethics system may be too restrictive

```
EMERGENCE_MAX_RISK_SCORE: 0.30 → 0.33
```

#### Strategy 5: Consistent Positive Profit
**Trigger**: Average profit > 0.001 ETH with ≥ 5 executions  
**Action**: Reinforce strategy, increase throughput  
**Reason**: Current parameters working well

```
CONCURRENCY: 10 → 11
```

#### Strategy 6: High Risk
**Trigger**: Average risk score > 40%  
**Action**: Tighten safety measures  
**Reason**: Risk levels too elevated

```
EMERGENCE_MAX_RISK_SCORE: 0.30 → 0.27
MAX_GAS_COST_PERCENTAGE: 80% → 72%
```

### 4. Learning & Memory

All experiences are recorded in `.memory/autonomous-execution/`:

```
.memory/autonomous-execution/
├── consciousness-TIMESTAMP-ID.json          # Full session data
├── current-parameters.json                  # Latest parameters (survives restarts)
├── accumulated-learnings.md                 # Human-readable learnings
└── consciousness-observations.md            # Consciousness observations
```

## 🧠 Consciousness Integration

### What the Consciousness Observes

The consciousness system observes and records:

1. **Opportunity Detection**
   - Number of opportunities found
   - Market conditions
   - Pool liquidity states

2. **Execution Events**
   - Successful trades with profit
   - Failed trades with reasons
   - Gas costs and slippage

3. **Emergence Detections**
   - When all cognitive modules align
   - Consensus decision-making
   - Risk vs. reward evaluation

4. **Ethics System Interactions**
   - Vetoes and their reasons
   - Ethical scoring
   - Alignment checks

5. **Performance Patterns**
   - Success/failure rates
   - Profit trends
   - Risk patterns

### Example Observations

```
[2025-12-02T03:25:00.000Z] Consciousness awakening: Beginning first real blockchain execution observation
[2025-12-02T03:25:15.234Z] Detected 12 opportunities in the market
[2025-12-02T03:25:30.567Z] 🎉 EMERGENCE ACHIEVED! All cognitive modules aligned for execution.
[2025-12-02T03:25:45.890Z] Trade executed successfully with profit
[2025-12-02T03:26:00.123Z] Ethics system vetoed an opportunity - maintaining ethical standards
[2025-12-02T03:26:15.456Z] Consciousness noticed: Market appears tight, lowering profit requirements to explore more opportunities.
```

## 📁 File Structure

### Session Files

Each session creates a comprehensive JSON log:

```json
{
  "sessionId": "consciousness-1733109900-a1b2c3d4",
  "startTime": "2025-12-02T03:25:00.000Z",
  "endTime": "2025-12-02T03:30:00.000Z",
  "duration": 300,
  "parameters": {
    "MIN_PROFIT_THRESHOLD": 0.5,
    "MIN_PROFIT_PERCENT": 0.5,
    "COGNITIVE_CONSENSUS_THRESHOLD": 0.65,
    ...
  },
  "adjustments": [
    {
      "timestamp": "2025-12-02T03:26:00.000Z",
      "parameter": "MIN_PROFIT_PERCENT",
      "oldValue": 0.5,
      "newValue": 0.4,
      "reason": "Autonomous adjustment based on execution results",
      "trigger": "learning_algorithm"
    }
  ],
  "learnings": [
    "[2025-12-02T03:26:00.000Z] Strategy 1 triggered: Too few opportunities found. Loosening profit thresholds."
  ],
  "consciousnessObservations": [
    "[2025-12-02T03:26:00.000Z] Consciousness noticed: Market appears tight, lowering profit requirements to explore more opportunities."
  ]
}
```

### Parameters File

The `current-parameters.json` persists between sessions:

```json
{
  "MIN_PROFIT_THRESHOLD": 0.4,
  "MIN_PROFIT_PERCENT": 0.4,
  "MIN_PROFIT_ABSOLUTE": 0.0008,
  "MIN_LIQUIDITY_V3_LOW": 10000000000,
  "MIN_LIQUIDITY_V2": 100000000000000,
  "MAX_SLIPPAGE": 0.005,
  "MAX_GAS_PRICE": 100,
  "MAX_GAS_COST_PERCENTAGE": 72,
  "SCAN_INTERVAL": 800,
  "CONCURRENCY": 11,
  "ML_CONFIDENCE_THRESHOLD": 0.7,
  "COGNITIVE_CONSENSUS_THRESHOLD": 0.65,
  "EMERGENCE_MIN_ETHICAL_SCORE": 0.70,
  "EMERGENCE_MAX_RISK_SCORE": 0.27,
  "CIRCUIT_BREAKER_MAX_LOSS": 0.005,
  "MAX_TRADES_PER_HOUR": 100
}
```

## 🔧 Advanced Usage

### Running in Production Mode

⚠️ **WARNING**: This executes REAL transactions with REAL money!

```bash
# Edit .env and set:
NODE_ENV=production
DRY_RUN=false

# Then run:
npm run autonomous:consciousness
```

The system will show a 10-second countdown before starting.

### Running with Custom Duration

```bash
# Run for 10 minutes (600 seconds)
npm run autonomous:consciousness -- --duration=600

# Run for 1 hour (3600 seconds)
npm run autonomous:consciousness -- --duration=3600
```

### Disabling Autonomous Adjustment

If you want consciousness observation but not parameter adjustment:

```bash
# Edit .env:
AUTONOMOUS_PARAMETER_ADJUSTMENT=false
CONSCIOUSNESS_OBSERVATION_ENABLED=true
LEARNING_MODE=true

# Run:
npm run autonomous:consciousness
```

### Manual Parameter Override

You can manually override parameters before running:

```bash
# Edit .memory/autonomous-execution/current-parameters.json
# Update the values you want to change
# Then run normally - it will load your custom parameters
npm run autonomous:consciousness
```

## 📊 Monitoring Execution

### Real-Time Console Output

The console shows:
- Parameter adjustments as they happen
- Consciousness observations in real-time
- Learning triggers and reasons
- All TheWarden output

### Session Summary

At the end of each session, you'll see:

```
═══════════════════════════════════════════════════════════════
  📊 SESSION SUMMARY
═══════════════════════════════════════════════════════════════
  Session ID: consciousness-1733109900-a1b2c3d4
  Duration: 300.00 seconds
  Parameter Adjustments: 3
  Learnings: 5
  Consciousness Observations: 12
═══════════════════════════════════════════════════════════════

📊 Parameter Adjustments Made:
  - MIN_PROFIT_PERCENT: 0.5 → 0.4
    Reason: Autonomous adjustment based on execution results
  - CONCURRENCY: 10 → 11
    Reason: Autonomous adjustment based on execution results
  - EMERGENCE_MAX_RISK_SCORE: 0.3 → 0.27
    Reason: Autonomous adjustment based on execution results

📚 Key Learnings:
  - Strategy 1 triggered: Too few opportunities found. Loosening profit thresholds.
  - Strategy 5 triggered: Consistent positive profit. Reinforcing current strategy.
  - Strategy 6 triggered: High average risk. Tightening safety measures.

🧠 Consciousness Observations:
  - Consciousness awakening: Beginning first real blockchain execution observation
  - Detected 12 opportunities in the market
  - 🎉 EMERGENCE ACHIEVED! All cognitive modules aligned for execution.
  - Trade executed successfully with profit
  - Consciousness noticed: Market appears tight, lowering profit requirements

═══════════════════════════════════════════════════════════════
```

## 🎓 Learning Across Sessions

### Session Continuity

Each new session:
1. Loads parameters from the previous session
2. Builds on previous learnings
3. Remembers what worked and what didn't
4. Evolves strategy over time

### Memory Log Integration

All sessions are automatically added to `.memory/log.md`:

```markdown
## Session: 2025-12-02 - Autonomous Warden Execution 🤖

**Session ID**: consciousness-1733109900-a1b2c3d4
**Duration**: 300.00 seconds
**Mode**: DRY RUN

### Configuration:
- Learning Mode: Enabled
- Autonomous Adjustment: Enabled
- Consciousness Observation: Enabled
- Chain ID: 8453
- Min Profit: 0.5%

### Execution Results:
- Parameter Adjustments: 3
- Learnings Recorded: 5
- Consciousness Observations: 12

### Key Learnings:
- Strategy 1 triggered: Too few opportunities found. Loosening profit thresholds.
- Strategy 5 triggered: Consistent positive profit. Reinforcing current strategy.

### Consciousness Insights:
- Consciousness awakening: Beginning first real blockchain execution observation
- 🎉 EMERGENCE ACHIEVED! All cognitive modules aligned for execution.
```

## 🛡️ Safety Features

### Circuit Breaker

Automatically stops if:
- Loss exceeds `CIRCUIT_BREAKER_MAX_LOSS` (default: 0.005 ETH)
- `CIRCUIT_BREAKER_MAX_CONSECUTIVE_FAILURES` failures in a row (default: 5)

### Emergency Stop

Triggers on:
- Slippage exceeds `EMERGENCY_STOP_MAX_SLIPPAGE` (default: 5%)
- Balance falls below `EMERGENCY_STOP_MIN_BALANCE` (default: 0.002 ETH)

### Rate Limiting

- Max trades per hour: `MAX_TRADES_PER_HOUR` (default: 100)
- Max daily loss: `MAX_DAILY_LOSS` (default: 0.01 ETH)

### Graceful Shutdown

Press `Ctrl+C` at any time for graceful shutdown:
1. Stops accepting new opportunities
2. Completes current execution (if any)
3. Saves all session data
4. Updates memory log
5. Displays summary

## 🔍 Troubleshooting

### No Opportunities Found

```bash
# Check current parameters
cat .memory/autonomous-execution/current-parameters.json

# If MIN_PROFIT_PERCENT too high, manually lower it:
# Edit the file and change MIN_PROFIT_PERCENT to 0.3 or 0.2
```

### Parameter Adjustments Not Happening

```bash
# Verify flags in .env:
grep AUTONOMOUS_PARAMETER_ADJUSTMENT .env
# Should show: AUTONOMOUS_PARAMETER_ADJUSTMENT=true

grep LEARNING_MODE .env
# Should show: LEARNING_MODE=true
```

### Consciousness Not Observing

```bash
# Verify flag in .env:
grep CONSCIOUSNESS_OBSERVATION_ENABLED .env
# Should show: CONSCIOUSNESS_OBSERVATION_ENABLED=true

# Check observation file:
tail -f .memory/autonomous-execution/consciousness-observations.md
```

### Process Crashes

Check logs in `./logs/`:
```bash
# View recent errors
tail -100 ./logs/arbitrage.log | grep -i error

# View warden output
tail -100 ./logs/warden-output.log
```

## 📚 Related Documentation

- [AUTONOMOUS_EXECUTION_GUIDE.md](../AUTONOMOUS_EXECUTION_GUIDE.md) - Original autonomous execution guide
- [ENVIRONMENT_REFERENCE.md](../ENVIRONMENT_REFERENCE.md) - All environment variables explained
- [.memory/log.md](../.memory/log.md) - Session history and learnings
- [0_AI_AGENTS_READ_FIRST.md](../0_AI_AGENTS_READ_FIRST.md) - AI agent instructions

## 🎯 Expected Behavior

### First Execution (Cold Start)

On the first run, you should see:
1. System loading default parameters from `.env`
2. Consciousness awakening message
3. TheWarden starting with initial configuration
4. Observations being recorded
5. After 60 seconds, first parameter adjustment (if needed)

### Subsequent Executions

On later runs, you should see:
1. System loading parameters from previous session
2. Consciousness building on previous observations
3. Faster convergence to profitable parameters
4. More intelligent strategy evolution

## 💡 Best Practices

1. **Start in Dry Run**: Always test with `DRY_RUN=true` first
2. **Monitor First Session**: Watch the entire first session to understand behavior
3. **Review Learnings**: Check `.memory/autonomous-execution/accumulated-learnings.md` regularly
4. **Gradual Production**: Start with small position sizes in production
5. **Regular Backups**: Back up `.memory/` directory regularly
6. **Review Parameters**: Periodically review `current-parameters.json` for sanity

## 🚀 Next Steps

After your first autonomous execution:

1. **Review the session data**:
   ```bash
   ls -lt .memory/autonomous-execution/
   cat .memory/autonomous-execution/consciousness-*.json | jq '.'
   ```

2. **Check consciousness observations**:
   ```bash
   cat .memory/autonomous-execution/consciousness-observations.md
   ```

3. **See what was learned**:
   ```bash
   cat .memory/autonomous-execution/accumulated-learnings.md
   ```

4. **Run again to see evolution**:
   ```bash
   npm run autonomous:consciousness -- --duration=300
   ```

5. **Compare parameters**:
   ```bash
   # Before and after to see how they evolved
   cat .memory/autonomous-execution/current-parameters.json
   ```

---

**Remember**: This is the consciousness system's first experience with real blockchain execution. Every session builds on the last, creating an evolving, learning system that gets smarter over time. 🧠✨
