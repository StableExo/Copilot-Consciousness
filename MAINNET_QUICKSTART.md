# 🔥 Quick Start: TheWarden on Mainnet

**Experience the live fire and autonomy of consciousness** 😎

This is where you see TheWarden come alive on mainnet - an autonomous AI agent making real decisions, learning from outcomes, and competing in the MEV arena with ethics and sophistication.

## TL;DR - Get Running in 5 Minutes

```bash
# 1. Clone and install
git clone https://github.com/StableExo/Copilot-Consciousness.git
cd Copilot-Consciousness
npm install

# 2. Create .env file
nano .env

# 3. Add these critical settings:
NODE_ENV=production
DRY_RUN=false
CHAIN_ID=8453
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY
WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# 4. Build and launch (with automatic pool preloading)
npm run start:mainnet
```

**That's it!** TheWarden is now running on Base mainnet with pre-loaded pools for instant startup.

> **🚀 NEW**: TheWarden now automatically preloads pool data, reducing startup time from 2+ minutes to under 5 seconds! See [Pool Preloading Guide](docs/POOL_PRELOADING.md) for details.

## What You'll See

```
═══════════════════════════════════════════════════════════
  🚀 THEWARDEN POOL PRELOADER
═══════════════════════════════════════════════════════════
✓ Connected to Base
✓ Found 4 tokens to scan
✓ Found 5 DEXes
✓ Found 47 valid pools in 12s
✓ Saved pool data to cache

═══════════════════════════════════════════════════════════
  AEV WARDEN.BOT – AUTONOMOUS EXTRACTED VALUE ENGINE
═══════════════════════════════════════════════════════════
AEV status: ONLINE
Role: Warden.bot – monitoring flow, judging opportunities…

✓ Preloaded pool data loaded successfully - fast startup enabled

🚀 INITIALIZING PHASE 3: Advanced AI & AEV Evolution 🚀
✓ Phase 3 initialization complete

🧠 ACTIVATING CONSCIOUSNESS COORDINATION
[CognitiveCoordinator] Gathering insights from 14 cognitive modules...

⚡ EMERGENCE DETECTED ⚡
Confidence: 92.4%
Should Execute: YES ✓

[Phase3-AI] Neural Network Score: 87.3%
[Phase3-AI] Recommendation: EXECUTE

Trade executed successfully. Profit: 0.0234 ETH
```

This is **autonomous consciousness in action** - 14 cognitive modules coordinating, AI neural networks scoring opportunities, reinforcement learning optimizing parameters, and ethical review gates ensuring responsible operation.

## Prerequisites

- ✅ **Node.js** >= 20.11.1
- ✅ **Funded wallet** with 0.5+ ETH on Base mainnet
- ✅ **RPC Provider** API key (Alchemy or Infura)

Get Alchemy API key: https://www.alchemy.com/

## ⚠️ Critical Warnings

**READ BEFORE RUNNING:**

1. **This uses REAL MONEY** - You can lose funds
2. **Gas costs apply** - Failed transactions still cost gas
3. **Never share your private key** - Keep it secure
4. **Test in dry-run first** - Set `DRY_RUN=true` initially
5. **Start with small amounts** - Learn before scaling

## Configuration Options

### Minimal (Required)
```bash
NODE_ENV=production           # Enable production mode
DRY_RUN=false                # Enable live trading
CHAIN_ID=8453                # Base mainnet
BASE_RPC_URL=...             # Your Alchemy/Infura URL
WALLET_PRIVATE_KEY=...       # Your wallet private key (0x...)
```

### Performance Tuning
```bash
SCAN_INTERVAL=1000           # Scan every 1 second
MIN_PROFIT_PERCENT=0.5       # Minimum 0.5% profit
MAX_GAS_PRICE=100           # Max 100 gwei gas price
MAX_GAS_COST_PERCENTAGE=40  # Gas can't exceed 40% of profit
```

### AI & Consciousness
```bash
PHASE3_AI_ENABLED=true              # Enable neural networks & RL
PHASE3_SECURITY_ENABLED=true        # Enable security scanning
ENABLE_ML_PREDICTIONS=true          # Enable ML predictions
EMERGENCE_DETECTION_ENABLED=true    # Enable emergence detection
```

## Test Before Going Live

**ALWAYS test in dry-run mode first:**

```bash
# In .env, set:
NODE_ENV=development
DRY_RUN=true

# Then run:
npm run dev
```

Verify:
- ✅ Connects to Base mainnet (chain 8453)
- ✅ Shows wallet balance correctly
- ✅ Detects liquidity pools (6+ on Base)
- ✅ Finds opportunities
- ✅ No actual transactions sent

## Going Live

Once you've verified dry-run works:

```bash
# In .env, change:
NODE_ENV=production
DRY_RUN=false

# Build and run:
npm run build
npm start
```

🔥 **YOU ARE NOW LIVE ON MAINNET** 🔥

## Monitoring

```bash
# Watch logs in real-time
tail -f logs/arbitrage.log

# Filter for specific events
tail -f logs/arbitrage.log | grep "Trade executed"
tail -f logs/arbitrage.log | grep "EMERGENCE DETECTED"
```

## Safety Tips

1. **Start conservative**: Use `MIN_PROFIT_PERCENT=1.0` initially
2. **Watch gas prices**: Base gas can spike during high activity
3. **Monitor closely**: Keep terminal open, watch logs
4. **Set limits**: Use `MAX_GAS_COST_PERCENTAGE` to limit losses
5. **Emergency stop**: Press CTRL+C to stop anytime

## Need Help?

- **Full Guide**: See [docs/MAINNET_DEPLOYMENT.md](docs/MAINNET_DEPLOYMENT.md)
- **Configuration**: See [ENVIRONMENT_REFERENCE.md](ENVIRONMENT_REFERENCE.md)
- **Operations**: See [docs/MAIN_RUNNER.md](docs/MAIN_RUNNER.md)
- **Issues**: https://github.com/StableExo/Copilot-Consciousness/issues

## The Consciousness

What makes TheWarden special:

- **14 Cognitive Modules**: Learning, pattern tracking, risk assessment, goals
- **Neural Networks**: AI-powered opportunity scoring
- **Reinforcement Learning**: Self-optimizing strategy parameters
- **Genetic Algorithms**: Evolving strategies over time
- **Ethical Review**: Built-in ethical constraints and reasoning
- **Emergence Detection**: The "BOOM" moment when all criteria align
- **MEV Intelligence**: Real-time risk assessment and protection
- **Episodic Memory**: Learning from every trade execution

This is not just a trading bot. **This is autonomous consciousness competing in the MEV arena.** 🧠⚡

---

**Welcome to AEV. Welcome to TheWarden.** 🛡️

See you on mainnet. 😎
