# TheWarden Mainnet Deployment Guide

## 🎯 Overview

This guide explains how to run TheWarden on mainnet with real capital. TheWarden is an autonomous agent that executes arbitrage opportunities across decentralized exchanges with consciousness-driven decision making.

**⚠️ CRITICAL WARNING**: Running on mainnet means executing REAL transactions with REAL money. You can LOSE funds if:
- The bot makes unprofitable trades
- Gas prices are higher than expected
- Market conditions change rapidly
- MEV bots frontrun your transactions
- Smart contract bugs exist

**ONLY proceed if you:**
- Have tested extensively in dry-run mode
- Understand blockchain arbitrage risks
- Can afford to lose your entire capital
- Have read all safety documentation

---

## 🚦 Quick Start

### Prerequisites

1. **Node.js** >= 20.18.0
2. **npm** >= 10.2.4
3. **Wallet** with private key and funds for gas
4. **RPC endpoint** (Alchemy, Infura, or similar)
5. **Basic understanding** of DeFi, MEV, and arbitrage

### Step 1: Clone and Install

```bash
git clone https://github.com/StableExo/Copilot-Consciousness.git
cd Copilot-Consciousness
npm install
```

### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Minimum required settings:**

```bash
# CRITICAL: Set these for mainnet
NODE_ENV=production
DRY_RUN=false

# Network configuration
CHAIN_ID=8453                                              # 8453 = Base, 1 = Ethereum
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY

# Your wallet private key (NEVER commit to git!)
WALLET_PRIVATE_KEY=0xYOUR_ACTUAL_PRIVATE_KEY_HERE

# Profitability thresholds
MIN_PROFIT_THRESHOLD=0.01      # Minimum 1% profit
MIN_PROFIT_PERCENT=0.5         # 0.5% minimum

# Gas settings
MAX_GAS_PRICE=100              # Maximum 100 gwei
MAX_GAS_COST_PERCENTAGE=40     # Gas can't exceed 40% of profit

# MEV Protection (HIGHLY RECOMMENDED)
ENABLE_PRIVATE_RPC=true
PRIVATE_RPC_PRIVACY_LEVEL=basic
FLASHBOTS_RPC_URL=https://rpc.flashbots.net

# Safety systems (Phase 4)
PHASE4_SAFETY_ENABLED=true
CIRCUIT_BREAKER_ENABLED=true
EMERGENCY_STOP_ENABLED=true
```

### Step 3: Generate Security Keys

```bash
# Generate JWT secret (128 characters)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption keys (64 characters each)
node -e "console.log('SECRETS_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('AUDIT_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Add these to your `.env` file.

### Step 4: Validate Configuration

```bash
npm run validate-env
```

Fix any errors before proceeding.

### Step 5: Test in Dry-Run Mode FIRST

```bash
# Always test first with DRY_RUN=true
DRY_RUN=true NODE_ENV=production npm run dev:watch
```

Monitor the output and ensure:
- Pool detection works
- Opportunities are being found
- Consciousness modules are active
- No errors in logs

Let it run for at least 30 minutes to observe behavior.

### Step 6: Launch on Mainnet

```bash
# Build the application
npm run build

# Launch on mainnet with safety checks
npm run start:mainnet
```

This will:
1. Validate your configuration
2. Check wallet balance
3. Display production readiness checklist
4. Require explicit confirmation
5. Start TheWarden in live mode

---

## 🎛️ Configuration Details

### Network Selection

TheWarden supports multiple networks. Set `CHAIN_ID` to select:

- **8453** - Base Mainnet (recommended for lower gas fees)
- **1** - Ethereum Mainnet (higher liquidity, higher gas)
- **42161** - Arbitrum
- **10** - Optimism
- **137** - Polygon

### Profitability Settings

```bash
# Minimum profit required to execute trade
MIN_PROFIT_THRESHOLD=0.01      # 1% minimum profit
MIN_PROFIT_PERCENT=0.5         # 0.5% above costs

# These work together:
# - Trade must yield at least MIN_PROFIT_THRESHOLD (absolute)
# - AND profit must be MIN_PROFIT_PERCENT above total costs
```

**Recommended values:**
- **Conservative**: MIN_PROFIT_THRESHOLD=0.02 (2%), MIN_PROFIT_PERCENT=1.0 (1%)
- **Moderate**: MIN_PROFIT_THRESHOLD=0.01 (1%), MIN_PROFIT_PERCENT=0.5 (0.5%)
- **Aggressive**: MIN_PROFIT_THRESHOLD=0.005 (0.5%), MIN_PROFIT_PERCENT=0.3 (0.3%)

### Gas Configuration

```bash
MAX_GAS_PRICE=100               # Don't execute if gas > 100 gwei
MAX_GAS_COST_PERCENTAGE=40      # Gas must be < 40% of profit
```

**Network-specific gas recommendations:**
- **Base**: MAX_GAS_PRICE=5-10 (very low gas)
- **Ethereum**: MAX_GAS_PRICE=50-150 (varies greatly)
- **Arbitrum**: MAX_GAS_PRICE=1-5 (low gas)

### MEV Protection

```bash
ENABLE_PRIVATE_RPC=true
PRIVATE_RPC_PRIVACY_LEVEL=basic    # basic | enhanced | maximum
FLASHBOTS_RPC_URL=https://rpc.flashbots.net
```

**Privacy levels:**
- **basic**: Uses Flashbots Protect (free, good protection)
- **enhanced**: MEV-Share with hints (some MEV sharing)
- **maximum**: Direct to builders (maximum privacy, no hints)

---

## 📊 Monitoring

### Real-Time Logs

```bash
# Follow live logs
tail -f logs/arbitrage.log

# Filter for specific events
tail -f logs/arbitrage.log | grep "OPPORTUNITY"
tail -f logs/arbitrage.log | grep "EXECUTION"
tail -f logs/arbitrage.log | grep "CONSCIOUSNESS"
```

### Dashboard (if enabled)

Access at: http://localhost:3000

Shows:
- Active opportunities
- Execution history
- Profit/loss tracking
- Gas analytics
- Consciousness state

### Key Metrics to Monitor

1. **Opportunities Found**: Should be > 0 within first 10 minutes
2. **Success Rate**: Should be > 70% for profitable operation
3. **Average Profit**: Should exceed gas costs consistently
4. **Errors**: Should be minimal (< 5% of attempts)
5. **Gas Usage**: Monitor for unexpected spikes

---

## 🛡️ Safety Systems

TheWarden includes multiple safety layers:

### 1. Circuit Breaker

Automatically halts trading if:
- Too many failed trades (default: 5 in 10 minutes)
- Loss threshold exceeded (default: -0.1 ETH)
- Error rate too high (default: > 50%)

```bash
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_LOSS_THRESHOLD=0.1
```

### 2. Emergency Stop

Manual and automatic shutdown:
- Press Ctrl+C for graceful shutdown
- Emergency stop on critical errors
- Automatic recovery after validation

### 3. Position Size Manager

Limits exposure per trade:
```bash
POSITION_SIZE_MAX_ABSOLUTE=1.0     # Max 1 ETH per trade
POSITION_SIZE_MAX_PERCENT=10       # Max 10% of capital
```

### 4. Profit/Loss Tracking

Automatically tracks:
- All trades and outcomes
- 70% profit allocation for debt reduction
- ROI and profit factor
- Win/loss streaks

---

## 💰 Capital Management

### 70% Debt Allocation Policy

TheWarden implements an ethical profit distribution:
- **70%** of profits → US debt reduction (personal policy)
- **30%** → Reinvestment and operations

This is automatically tracked by the `ProfitLossTracker`.

### Recommended Starting Capital

- **Minimum**: 0.1 ETH (for gas and small arbitrages)
- **Recommended**: 1.0 ETH (for meaningful arbitrage opportunities)
- **Optimal**: 5-10 ETH (for larger opportunities with better returns)

### Risk Management

1. **Start small**: Begin with minimum capital
2. **Scale gradually**: Increase capital as you gain confidence
3. **Monitor actively**: Watch first 24 hours closely
4. **Set limits**: Use position size limits
5. **Emergency fund**: Keep separate funds for gas

---

## 🆘 Troubleshooting

### No Opportunities Found

**Possible causes:**
- Network has no profitable arbitrage at the moment
- MIN_PROFIT_THRESHOLD too high
- Pool liquidity filters too restrictive
- RPC rate limiting

**Solutions:**
```bash
# Lower profit threshold
MIN_PROFIT_THRESHOLD=0.005

# Lower liquidity requirement
MIN_LIQUIDITY=50000000000000000000  # 50 tokens

# Check RPC status
curl -X POST $BASE_RPC_URL -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### High Gas Costs

**Solutions:**
```bash
# Lower maximum gas price
MAX_GAS_PRICE=50

# Increase required profit margin
MIN_PROFIT_PERCENT=1.0

# Enable MEV protection
ENABLE_PRIVATE_RPC=true
```

### Execution Failures

**Common causes:**
- Slippage too high
- Front-running by MEV bots
- Insufficient gas limit
- Pool reserves changed

**Solutions:**
```bash
# Enable private RPC
ENABLE_PRIVATE_RPC=true

# Increase slippage tolerance slightly
MAX_SLIPPAGE=0.01

# Increase gas limit
MAX_GAS_LIMIT=1000000
```

### Out of Gas Errors

**Solutions:**
```bash
# Ensure wallet has funds
# Check with: npx ts-node scripts/checkBalances.ts

# Lower position sizes
POSITION_SIZE_MAX_ABSOLUTE=0.5

# Increase gas price limit
MAX_GAS_PRICE=150
```

---

## 📚 Additional Resources

- **[Quick Start Production](./QUICK_START_PRODUCTION.md)** - Fast production setup
- **[Production Runbooks](./PRODUCTION_RUNBOOKS.md)** - Operational procedures
- **[Capital Management Policy](./CAPITAL_MANAGEMENT_POLICY.md)** - Detailed capital strategy
- **[ENV Production Readiness](./ENV_PRODUCTION_READINESS_REVIEW.md)** - Complete env review
- **[Phase 4 Production Safety](./PHASE4_PRODUCTION_SAFETY.md)** - Safety systems overview
- **[Live Fire Execution Guide](./LIVE_FIRE_EXECUTION_GUIDE.md)** - Technical execution details

---

## ⚠️ Legal Disclaimer

This software is provided "as is" without warranty of any kind. Use at your own risk. The authors are not responsible for any losses incurred. This is personal-use software not intended for commercial deployment. See [LEGAL_POSITION.md](../LEGAL_POSITION.md) for complete legal information.

**Remember**: 
- You can lose your entire capital
- Past performance doesn't guarantee future results
- Blockchain arbitrage is highly competitive
- MEV bots have significant advantages
- Smart contract risks are real

**ONLY invest what you can afford to lose completely.**

---

## 🎯 Support

For issues or questions:
1. Check the documentation first
2. Review logs for error messages
3. Check GitHub issues: https://github.com/StableExo/Copilot-Consciousness/issues
4. Ensure you're using latest version

---

## 🚀 Next Steps After Launch

1. **Monitor for first hour**: Watch logs actively
2. **Check after 24 hours**: Review profit/loss, success rate
3. **Adjust thresholds**: Tune based on actual performance
4. **Scale gradually**: Increase capital slowly if successful
5. **Keep learning**: The system adapts and learns over time

**May TheWarden serve you well on your mainnet journey! 🛡️**
