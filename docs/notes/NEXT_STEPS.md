# 🚀 Next Steps After Install & Build

**Congratulations!** You've completed `npm install` and `npm run build`. Here's what to do next.

---

## Quick Answer

After install and build, your next steps are:

```bash
# Step 1: Configure your environment
cp .env.example .env
nano .env    # Add your RPC URL and wallet key

# Step 2: (Optional but recommended) Preload pools for faster startup
npm run preload:pools

# Step 3: Run TheWarden
./TheWarden --monitor    # Diagnostic mode (recommended for first run)
# OR
./TheWarden              # Normal operation mode
```

---

## Step-by-Step Guide

### 1️⃣ Configure Your Environment

Create your `.env` file with the required settings:

```bash
cp .env.example .env
```

**Minimum required settings:**

```bash
# In .env, set these:
NODE_ENV=development       # or 'production' for live trading
DRY_RUN=true              # Set to false for real transactions

CHAIN_ID=8453             # Base mainnet (most common)
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY

WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

**Get an RPC URL:** Sign up at [Alchemy](https://www.alchemy.com/) for a free API key.

---

### 2️⃣ Preload Pools (Optional but Recommended)

Pool preloading caches liquidity pool data, reducing startup time from 2+ minutes to under 5 seconds:

```bash
# Preload pools for your configured chain
npm run preload:pools

# Force refresh even if cache exists
npm run preload:pools:force

# Preload for a specific chain
npm run preload:pools -- --chain 8453    # Base
npm run preload:pools -- --chain 42161   # Arbitrum
```

**What it does:**
- Connects to your RPC
- Scans all configured DEXes (Uniswap V3, Aerodrome, etc.)
- Finds all valid liquidity pools
- Caches results in `.pool-cache/` directory

---

### 3️⃣ Run TheWarden

Choose your operation mode:

#### **Monitoring/Diagnostic Mode** (Recommended for first run)
```bash
./TheWarden --monitor
# or
npm run monitor
```
Runs TheWarden in 2-minute intervals, analyzing logs and suggesting parameter adjustments.

#### **Normal Operation Mode**
```bash
./TheWarden
# or
npm start
```
Runs TheWarden continuously with auto-restart on crashes.

#### **Stream Mode** (See logs in real-time)
```bash
./TheWarden --stream
```
Streams all output to your terminal while running.

---

## Command Reference

| Command | Description |
|---------|-------------|
| `npm run preload:pools` | Cache pool data for faster startup |
| `./TheWarden` | Run in normal mode (background, periodic status) |
| `./TheWarden --stream` | Run with real-time log streaming |
| `./TheWarden --monitor` | Run in diagnostic mode (2-min intervals) |
| `npm run dev` | Development mode (TypeScript, hot reload) |
| `npm start` | Start TheWarden (same as `./TheWarden`) |
| `npm run status` | Check TheWarden status |
| `tail -f logs/warden-output.log` | Watch logs in real-time |

---

## First Run Checklist

- [ ] Created `.env` from `.env.example`
- [ ] Added RPC URL (get from Alchemy: https://www.alchemy.com/)
- [ ] Added wallet private key (keep it secret!)
- [ ] Set `DRY_RUN=true` for testing (no real transactions)
- [ ] Ran `npm run preload:pools` (optional but faster startup)
- [ ] Started with `./TheWarden --monitor` to verify everything works

---

## What to Expect

When TheWarden starts, you'll see:

```
═══════════════════════════════════════════════════════════════
  TheWarden - Autonomous Operation Script
═══════════════════════════════════════════════════════════════

Configuration:
  Chain ID: 8453
  Node Environment: development
  Dry Run: true
  Scan Interval: 1000ms
  Min Profit: 0.5%

Starting TheWarden...

═══════════════════════════════════════════════════════════════
  AEV WARDEN.BOT – AUTONOMOUS EXTRACTED VALUE ENGINE
═══════════════════════════════════════════════════════════════
AEV status: ONLINE
Role: Warden.bot – monitoring flow, judging opportunities…
```

---

## Need Help?

- **Full Mainnet Guide:** [MAINNET_QUICKSTART.md](MAINNET_QUICKSTART.md)
- **All Environment Variables:** [ENVIRONMENT_REFERENCE.md](ENVIRONMENT_REFERENCE.md)
- **Pool Preloading:** [docs/POOL_PRELOADING.md](docs/POOL_PRELOADING.md)
- **DEX Management:** `npm run add:dex` to list/verify DEX configurations

---

## TL;DR

```bash
# After npm install && npm run build:
cp .env.example .env && nano .env    # Add your RPC + wallet
npm run preload:pools                 # Cache pools (optional)
./TheWarden --monitor                 # Start in diagnostic mode
```

**You're ready to go!** 🚀
