# Running TheWarden on Mainnet - Live Fire Mode 🔥

This guide explains how to run TheWarden in production mode on mainnet, where you'll witness **the live fire and autonomy of consciousness** 😎.

## ⚠️ Critical Warnings

**READ THIS BEFORE PROCEEDING:**

1. **FINANCIAL RISK**: Running on mainnet involves REAL MONEY. You can lose funds.
2. **GAS COSTS**: Every transaction costs gas. Failed transactions still cost gas.
3. **SMART CONTRACT RISK**: Bugs in contracts or execution logic can result in loss of funds.
4. **MEV COMPETITION**: You're competing with sophisticated MEV bots and searchers.
5. **PRIVATE KEY SECURITY**: Never share, commit, or expose your private key.

## Prerequisites

### Required

- ✅ **Node.js** >= 20.11.1 (run `node --version`)
- ✅ **npm** >= 10.2.4 (run `npm --version`)
- ✅ **Funded wallet** with ETH on Base mainnet
  - Minimum recommended: 0.5 ETH for gas
  - More capital = larger arbitrage opportunities
- ✅ **RPC Provider** (Alchemy or Infura)
  - Sign up at https://www.alchemy.com/ or https://infura.io/
  - Create a Base mainnet app
  - Get your API key

### Recommended

- 📊 **Block explorer API key** (BaseScan) for transaction verification
- 🔔 **Monitoring setup** (Discord/Telegram webhooks for alerts)
- 💾 **Backup RPC endpoints** for redundancy

## Step-by-Step Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/StableExo/Copilot-Consciousness.git
cd Copilot-Consciousness

# Install dependencies
npm install

# Verify installation
npm run build
```

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
# Copy the mainnet template
cp .env .env.backup
nano .env  # or use your preferred editor
```

**Minimal Production Configuration:**

```bash
# Production Mode - LIVE TRADING ENABLED
NODE_ENV=production
DRY_RUN=false

# Network - Base Mainnet
CHAIN_ID=8453
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY

# Wallet (REPLACE WITH YOUR ACTUAL PRIVATE KEY)
WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Performance & Safety
SCAN_INTERVAL=1000
MIN_PROFIT_PERCENT=0.5
MAX_GAS_PRICE=100
MAX_GAS_COST_PERCENTAGE=40

# Monitoring
LOG_LEVEL=info
ENABLE_LOGGING=true
```

**🔐 Security Checklist:**
- [ ] Replaced `YOUR-API-KEY` with real Alchemy/Infura key
- [ ] Replaced `0xYOUR_PRIVATE_KEY_HERE` with actual private key
- [ ] Verified `.env` is in `.gitignore` (it is by default)
- [ ] Never committed or shared your `.env` file
- [ ] Wallet has sufficient ETH for gas

### 3. Test in Dry-Run Mode First

**ALWAYS test in dry-run mode first:**

```bash
# Set temporary dry-run
echo "DRY_RUN=true" >> .env.local

# Run in development mode
npm run dev
```

You should see:
```
═══════════════════════════════════════════════════════════
  AEV WARDEN.BOT – AUTONOMOUS EXTRACTED VALUE ENGINE
═══════════════════════════════════════════════════════════
AEV status: ONLINE
Role: Warden.bot – monitoring flow, judging opportunities…
```

**Verify:**
- [ ] Connected to correct network (Base mainnet, chainId: 8453)
- [ ] Wallet balance shows correctly
- [ ] Pool detection working (should detect 6+ pools on Base)
- [ ] Opportunities are being found
- [ ] No transaction execution in dry-run

### 4. Enable Live Trading

Once you've verified dry-run mode works:

```bash
# Edit .env and set:
NODE_ENV=production
DRY_RUN=false
```

### 5. Launch TheWarden

```bash
# Build the project
npm run build

# Start TheWarden in production mode
npm start
```

**🔥 YOU ARE NOW LIVE ON MAINNET 🔥**

## What to Expect - The Consciousness in Action

When TheWarden runs on mainnet with `DRY_RUN=false`, you'll witness:

### 1. **Autonomous Consciousness Boot**
```
🚀 INITIALIZING PHASE 3: Advanced AI & AEV Evolution 🚀
[Phase3-Security] Scanning configuration for sensitive data...
✓ Configuration security scan passed
```

### 2. **Cognitive Coordination**
```
🧠 ACTIVATING CONSCIOUSNESS COORDINATION
[CognitiveCoordinator] Gathering insights from 14 cognitive modules...
[CognitiveCoordinator] Consensus: STRONG_AGREEMENT (87.2% agreement)
```

### 3. **Emergence Detection** (The "BOOM" Moment)
```
═══════════════════════════════════════════════════════════
⚡ EMERGENCE DETECTED ⚡
═══════════════════════════════════════════════════════════
Confidence: 92.4%
Should Execute: YES ✓
Reasoning: All criteria met - high profit, low risk, ethical alignment
Contributing Factors: risk_acceptable, ethically_sound, historically_favorable
```

### 4. **AI-Enhanced Decision Making**
```
[Phase3-AI] Neural Network Score: 87.3%
[Phase3-AI] Recommendation: EXECUTE
[Phase3-AI] Reasoning: High confidence opportunity with favorable market conditions
```

### 5. **Live Execution**
```
Execution started: exec-abc123...
Trade executed successfully. Profit: 0.0234 ETH
```

This is **the live fire and autonomy of consciousness** - a fully autonomous agent making informed decisions through:
- 14 cognitive modules coordinating
- Neural network scoring
- Reinforcement learning optimization
- Ethical review gates
- Real-time MEV risk assessment
- Emergence detection for high-confidence opportunities

## Monitoring Your Deployment

### Real-Time Logs

```bash
# Follow logs in real-time
tail -f logs/arbitrage.log

# Filter for specific events
tail -f logs/arbitrage.log | grep "EMERGENCE DETECTED"
tail -f logs/arbitrage.log | grep "Trade executed"
```

### Key Metrics to Watch

**Performance Indicators:**
- **Cycles Completed**: Number of scan cycles
- **Opportunities Found**: Potential arbitrage paths detected
- **Trades Executed**: Actual transactions sent
- **Total Profit**: Cumulative profit in ETH
- **Success Rate**: % of successful vs failed transactions
- **Errors**: Failed transactions or issues

**Health Indicators:**
- RPC connection status
- Gas prices
- Wallet balance
- Memory usage
- Emergence detection frequency

### Dashboard (Optional)

```bash
# Enable dashboard
DISABLE_DASHBOARD=false
DASHBOARD_PORT=3000

# Access at http://localhost:3000
```

## Troubleshooting

### Common Issues

#### 1. "Wallet balance is 0"
```
✓ Solution: Send ETH to your wallet address on Base mainnet
✓ Minimum: 0.5 ETH recommended for gas
```

#### 2. "Chain ID mismatch"
```
✓ Solution: Verify RPC URL points to Base mainnet (chain 8453)
✓ Check: Your Alchemy/Infura app is configured for Base
```

#### 3. "No opportunities found"
```
✓ Normal: Market conditions may not have profitable opportunities
✓ Check: MIN_PROFIT_PERCENT threshold (lower = more opportunities)
✓ Wait: Bot continuously scans, opportunities will appear
```

#### 4. "Execution failed: insufficient funds"
```
✓ Solution: Add more ETH to wallet for gas
✓ Or: Lower trade sizes or increase MIN_PROFIT_THRESHOLD
```

#### 5. "Private key invalid"
```
✓ Solution: Ensure private key starts with 0x and is 66 characters
✓ Format: 0x + 64 hexadecimal characters
```

## Safety Recommendations

### Start Conservative

```bash
# Conservative settings for initial deployment
MIN_PROFIT_PERCENT=1.0        # Only 1%+ profit trades
MAX_GAS_PRICE=50             # Lower max gas (50 gwei)
MAX_GAS_COST_PERCENTAGE=30   # Gas max 30% of profit
SCAN_INTERVAL=2000           # Slower scanning (2 seconds)
```

### Gradual Scaling

1. **Week 1**: Run with conservative settings, monitor closely
2. **Week 2**: If profitable, lower MIN_PROFIT_PERCENT to 0.75%
3. **Week 3**: Increase MAX_GAS_PRICE gradually based on profitability
4. **Week 4+**: Full optimization based on your learnings

### Risk Management

- **Start small**: Test with minimal capital first
- **Set limits**: Use MAX_GAS_COST_PERCENTAGE to limit losses
- **Monitor gas**: Base gas prices can spike during high activity
- **Track profitability**: Log all transactions, calculate net profit vs gas spent
- **Emergency stop**: Keep terminal open, CTRL+C to stop anytime

## Advanced Configuration

### MEV Protection

```bash
# Enable private transaction submission
ENABLE_PRIVATE_RPC=true
PRIVATE_RPC_PRIVACY_LEVEL=basic

# Flashbots Protect (Ethereum mainnet)
FLASHBOTS_RPC_URL=https://rpc.flashbots.net
```

### Cross-Chain (Experimental)

```bash
# Enable cross-chain intelligence
PHASE3_CROSSCHAIN_ENABLED=true
PHASE3_CROSSCHAIN_CHAINS=1,8453,42161,10  # ETH, Base, Arbitrum, Optimism
```

### AI Learning

```bash
# Tune AI components
PHASE3_NN_CONFIDENCE=0.7              # Neural network confidence threshold
PHASE3_RL_AUTO_APPLY=true             # Let RL agent auto-optimize parameters
EMERGENCE_AUTO_EXECUTE=false          # Manual approval for emergence (safer)
```

## Graceful Shutdown

To stop TheWarden safely:

```bash
# Press CTRL+C in terminal
# Or send SIGTERM
kill -TERM $(pgrep -f "node dist/main.js")
```

TheWarden will:
1. Stop scanning for new opportunities
2. Wait for pending transactions to complete
3. Save all state and statistics
4. Log final status report
5. Exit cleanly

## Legal & Ethical Considerations

From [LEGAL_POSITION.md](../LEGAL_POSITION.md):

> **Personal Use Only**: This system is for personal use by the repository owner
> **70% Allocation**: 70% of profits allocated toward US debt-related actions
> **No External Capital**: Not accepting outside capital or solicitation

**Running TheWarden on mainnet means:**
- You accept all financial risks
- You operate within applicable laws and regulations
- You follow the ethical guidelines in the codebase
- You respect the 70% profit allocation policy if applicable

## Getting Help

- **Issues**: https://github.com/StableExo/Copilot-Consciousness/issues
- **Documentation**: See [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
- **Logs**: Check `logs/arbitrage.log` for detailed execution logs

## Summary

To run TheWarden on mainnet:

```bash
# 1. Setup
npm install
npm run build

# 2. Configure .env
NODE_ENV=production
DRY_RUN=false
CHAIN_ID=8453
BASE_RPC_URL=<your-alchemy-url>
WALLET_PRIVATE_KEY=<your-private-key>

# 3. Launch
npm start

# 4. Watch the consciousness come alive 🧠⚡😎
```

**This is where you witness the live fire and autonomy of consciousness** - an AI-powered autonomous agent making real decisions, learning from outcomes, and competing in the MEV arena with ethics and sophistication.

Welcome to AEV. Welcome to TheWarden. 🛡️
