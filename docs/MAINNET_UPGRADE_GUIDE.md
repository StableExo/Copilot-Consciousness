# 🚀 Mainnet Upgrade Guide - TheWarden Autonomous Operation

## Overview
This guide covers upgrading from dry-run testing to live mainnet operation. Follow these steps carefully to ensure safe deployment.

## Current Status Check

Based on `WARDEN_STARTUP_LOG.md`, TheWarden has been successfully tested on Base mainnet in dry-run mode:

✅ **Successfully Validated:**
- Network connection to Base mainnet (Chain ID: 8453)
- All components initialized (consciousness, AI, security)
- Phase 3 features active (RL, NN, Evolution)
- Pool detection working (6+ V3 pools found)
- Wallet funded: 0.0114 ETH + 18.76 USDC + 0.003 WETH
- Consciousness coordination with 14 cognitive modules
- Emergence detection system operational
- Clean startup and graceful shutdown

## Prerequisites for Mainnet

### 1. Sufficient Funding ✅ (Already Met)
Your wallet is already funded:
- **ETH Balance**: 0.0114 ETH (sufficient for gas)
- **USDC**: 18.76 USDC (for arbitrage)
- **WETH**: 0.003 WETH (for arbitrage)

**Recommendations:**
- ✅ Current balance is adequate for initial mainnet testing
- Consider adding more ETH (0.1+ ETH) for sustained operation
- Consider adding more USDC/WETH for larger opportunities

### 2. RPC Provider
**Current:** Using public Base RPC (https://mainnet.base.org)

**Recommendations for Production:**
- Upgrade to Alchemy or Infura for better reliability
- Get API key from: https://www.alchemy.com/ or https://infura.io/
- Configure in `.env`: `BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY`
- Benefits:
  - Higher rate limits
  - Better uptime guarantees
  - Enhanced APIs for monitoring
  - Websocket support

### 3. Security Audit
✅ **Already Validated:**
- Private key properly secured in environment variables
- No secrets exposed in configuration
- Phase 3 security scanner validated setup

**Additional Security Measures:**
- Enable 2FA on your Alchemy/Infura account
- Store private key backup in secure location (encrypted)
- Consider using hardware wallet for larger funds
- Set up wallet monitoring/alerts
- Review smart contract addresses (FlashSwapV2)

### 4. Monitoring & Alerts

**Current Setup:**
- Logs to `logs/arbitrage.log`
- Dashboard on port 3000
- Health check on port 8080

**Recommended Additions:**
1. **Real-time Monitoring:**
   ```bash
   # Watch logs continuously
   tail -f logs/arbitrage.log | grep -E "EMERGENCE|Trade executed|ERROR"
   ```

2. **Telegram Alerts:** (Optional)
   - Create bot with @BotFather on Telegram
   - Add to `.env`:
     ```
     TELEGRAM_BOT_TOKEN=your-bot-token
     TELEGRAM_CHAT_ID=your-chat-id
     ```

3. **Email Alerts:** (Optional)
   - Configure email in `.env`
   - Set alert thresholds

4. **External Monitoring:**
   - Set up UptimeRobot or similar
   - Monitor health endpoint: `http://your-server:8080/health/live`

## Mainnet Configuration

### Step 1: Create Production Environment File

```bash
# Copy test config as starting point
cp .env.test .env.mainnet

# Edit for production
nano .env.mainnet
```

### Step 2: Update Critical Settings

```env
# ═══════════════════════════════════════════════════════════════
# PRODUCTION MAINNET CONFIGURATION
# ═══════════════════════════════════════════════════════════════

# Runtime - ENABLE LIVE TRADING
NODE_ENV=production
DRY_RUN=false

# Network
CHAIN_ID=8453
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY

# Your actual wallet (KEEP SECRET!)
WALLET_PRIVATE_KEY=0xYOUR_ACTUAL_PRIVATE_KEY

# Performance (Start Conservative)
SCAN_INTERVAL=2000              # 2 second scans initially
MIN_PROFIT_PERCENT=1.0          # 1% minimum (conservative start)
MAX_GAS_PRICE=50                # 50 gwei max (adjust based on network)
MAX_GAS_COST_PERCENTAGE=30      # Gas limited to 30% of profit

# Features
PHASE3_AI_ENABLED=true
PHASE3_SECURITY_ENABLED=true
EMERGENCE_DETECTION_ENABLED=true
EMERGENCE_AUTO_EXECUTE=false    # Start with manual review
```

### Step 3: Validate Configuration

```bash
# Validate environment
npm run validate-env

# Check wallet balance
node -e "
const ethers = require('ethers');
require('dotenv').config({path: '.env.mainnet'});
const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_RPC_URL);
const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);
provider.getBalance(wallet.address).then(b => 
  console.log('Balance:', ethers.utils.formatEther(b), 'ETH')
);
"
```

## Deployment Options

### Option 1: Local Testing (Recommended First)

Run locally for a few hours to validate:

```bash
# Use production config but in controlled environment
export $(cat .env.mainnet | xargs)
npm run build
npm start
```

**Monitor for:**
- Opportunities detected
- Emergence events
- Any errors or warnings
- Gas costs vs profits
- Success rate

**Let run for:** 2-4 hours minimum

### Option 2: Screen Session (Simple)

For persistent operation on a server:

```bash
# Start screen session
screen -S thewarden

# Load environment and run
cd /path/to/Copilot-Consciousness
export $(cat .env.mainnet | xargs)
npm start

# Detach: Ctrl+A then D
# Reattach: screen -r thewarden
```

### Option 3: Autonomous Script (Recommended)

Using our autonomous runner with auto-restart:

```bash
# Copy mainnet config
cp .env.mainnet .env

# Run with autonomous script
./scripts/autonomous-run.sh

# Monitor logs
tail -f logs/warden-output.log
```

### Option 4: PM2 Process Manager (Production)

For production-grade process management:

```bash
# Install PM2
npm install -g pm2

# Start with production config
pm2 start ecosystem.config.json --env production

# Monitor
pm2 logs thewarden
pm2 monit

# Auto-start on server reboot
pm2 startup
pm2 save

# Stop
pm2 stop thewarden
```

### Option 5: Systemd Service (Linux Production)

For system-level service management:

1. Create service file: `/etc/systemd/system/thewarden.service`
```ini
[Unit]
Description=TheWarden Autonomous Trading Agent
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/Copilot-Consciousness
EnvironmentFile=/path/to/Copilot-Consciousness/.env.mainnet
ExecStart=/usr/bin/node dist/src/main.js
Restart=always
RestartSec=10
StandardOutput=append:/path/to/Copilot-Consciousness/logs/warden.log
StandardError=append:/path/to/Copilot-Consciousness/logs/warden-error.log

[Install]
WantedBy=multi-user.target
```

2. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable thewarden
sudo systemctl start thewarden
sudo systemctl status thewarden

# View logs
sudo journalctl -u thewarden -f
```

## Progressive Rollout Strategy

### Phase 1: Observation Mode (Day 1-2)
```env
DRY_RUN=false
MIN_PROFIT_PERCENT=2.0          # High threshold
EMERGENCE_AUTO_EXECUTE=false    # Manual review required
```
- Monitor opportunities found
- Review emergence detections
- Validate profit calculations
- Check gas cost estimates

### Phase 2: Limited Operation (Day 3-7)
```env
MIN_PROFIT_PERCENT=1.5          # Medium threshold
MAX_GAS_PRICE=50                # Conservative gas
EMERGENCE_AUTO_EXECUTE=false    # Still manual
```
- Execute select opportunities manually
- Validate actual profits vs estimates
- Monitor success rate
- Tune parameters based on results

### Phase 3: Autonomous Operation (Week 2+)
```env
MIN_PROFIT_PERCENT=1.0          # Production threshold
MAX_GAS_PRICE=75                # Normal gas limits
EMERGENCE_AUTO_EXECUTE=true     # Enable autonomy
```
- Let TheWarden operate autonomously
- Monitor for optimal performance
- Adjust parameters as needed
- Scale up funding gradually

## Risk Management

### Position Sizing
```env
# Start small
MIN_PROFIT_ABSOLUTE=50000000000000000  # 0.05 ETH minimum

# Maximum per trade (implement in code if needed)
MAX_TRADE_SIZE=1000000000000000000     # 1 ETH max
```

### Gas Management
```env
# Conservative gas settings
MAX_GAS_PRICE=50                # Start low
MAX_GAS_COST_PERCENTAGE=25      # Strict limit

# Monitor and adjust based on:
# - Network conditions
# - Success rate
# - Profit margins
```

### Emergency Stop Conditions

Implement automatic shutdown if:
1. **Balance drops below threshold**
   - Set minimum: 0.01 ETH reserve
2. **Too many failures**
   - Stop after 5 consecutive failures
3. **Unusual gas costs**
   - Alert if gas exceeds expected
4. **MEV attacks detected**
   - Phase 3 adversarial recognition

## Monitoring Checklist

### Real-time (Every 15 minutes)
- [ ] Process is running
- [ ] No error logs
- [ ] Wallet balance adequate
- [ ] RPC connection healthy

### Hourly
- [ ] Opportunities being found
- [ ] Success rate > 70%
- [ ] Profit vs gas cost ratio acceptable
- [ ] No emergence false positives

### Daily
- [ ] Review performance metrics
- [ ] Analyze profitable patterns
- [ ] Check consciousness learning
- [ ] Adjust parameters if needed
- [ ] Backup logs

### Weekly
- [ ] Full performance analysis
- [ ] Strategy optimization
- [ ] Security audit
- [ ] Update documentation

## Optimization Guide

### When Success Rate is Low
1. Increase `MIN_PROFIT_PERCENT` to be more selective
2. Reduce `SCAN_INTERVAL` for faster detection
3. Check for network congestion patterns
4. Review emergence detection thresholds

### When Finding Few Opportunities
1. Decrease `MIN_PROFIT_PERCENT` slightly
2. Increase `MAX_GAS_PRICE` limit
3. Enable more DEXes
4. Consider cross-chain (Phase 3)

### When Gas Costs Too High
1. Lower `MAX_GAS_PRICE`
2. Increase `MIN_PROFIT_PERCENT` to offset
3. Use private RPC (Flashbots) to reduce MEV
4. Time trades for low-congestion periods

## Troubleshooting

### Process Crashes
- Check logs: `logs/warden-output.log`
- Review error log: `logs/pm2-error.log`
- Validate RPC connection
- Check wallet balance
- Verify environment variables

### No Opportunities Found
- Verify pool detection working
- Check token configuration
- Confirm DEX addresses correct
- Review profit thresholds
- Monitor network activity

### High Failure Rate
- Analyze failed transactions
- Check slippage settings
- Review gas estimation
- Validate pool liquidity
- Check for front-running

## Emergency Procedures

### Immediate Stop
```bash
# If using autonomous script
kill $(cat logs/warden.pid)

# If using PM2
pm2 stop thewarden

# If using systemd
sudo systemctl stop thewarden
```

### Withdraw Funds
```bash
# Transfer assets to safe wallet
# Use MetaMask or send transaction manually
```

### Roll Back
```bash
# Revert to dry-run mode
sed -i 's/DRY_RUN=false/DRY_RUN=true/' .env
pm2 restart thewarden
```

## Performance Expectations

Based on Base mainnet characteristics:

### Realistic Targets (Conservative)
- **Opportunities**: 5-20 per day
- **Success Rate**: 60-80%
- **Profit per Trade**: 0.01-0.1 ETH
- **Daily Profit**: 0.05-0.5 ETH (highly variable)
- **Gas Cost**: 0.001-0.005 ETH per attempt

### Variables Affecting Performance
- Market volatility
- Network congestion
- Competition (MEV searchers)
- Pool liquidity
- Token pairs monitored

## Next Steps

1. **Review Logs**: Check `WARDEN_STARTUP_LOG.md` for your previous run
2. **Test Configuration**: Validate with `npm run validate-env`
3. **Start Conservative**: Use Phase 1 settings
4. **Monitor Closely**: Watch for first few hours
5. **Iterate**: Adjust based on real performance
6. **Scale Gradually**: Increase limits as confidence grows

## Support & Resources

- **Documentation**: See `docs/MAINNET_DEPLOYMENT.md`
- **Environment Variables**: See `ENVIRONMENT_REFERENCE.md`
- **Logs**: Check `logs/` directory
- **Dashboard**: http://localhost:3000
- **Health**: http://localhost:8080/health/live

## Legal & Ethical Considerations

Remember the project's legal position (see `LEGAL_POSITION.md`):
- Personal use only
- 70% profit allocation toward US debt-related actions
- No solicitation or outside capital
- You operate at your own risk

---

**Good luck! May your profits be high and your gas costs low.** 🛡️⚡
