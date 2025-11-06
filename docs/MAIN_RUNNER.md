# AGI Arbitrage Bot - Main Runner

## Overview

The AGI Arbitrage Bot is a production-ready cryptocurrency arbitrage system that continuously scans for and executes profitable trading opportunities across multiple DEXes.

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Valid Ethereum/Base RPC endpoint (Alchemy, Infura, etc.)
- Funded wallet with private key

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file in the project root with the following required variables:

```bash
# Required Configuration
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
# OR
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY

WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

See `.env.example` for all available configuration options.

### Running the Bot

#### Development Mode (Dry Run)

```bash
npm run dev
```

This will run the bot in dry-run mode, scanning for opportunities without executing trades.

#### Production Mode

```bash
npm run build
npm start
```

To enable actual trade execution in production, set:

```bash
NODE_ENV=production
DRY_RUN=false
```

## Configuration Options

### Network Configuration

- `ETHEREUM_RPC_URL` or `BASE_RPC_URL` - RPC endpoint URL (required)
- `CHAIN_ID` - Chain ID (default: 1 for Ethereum mainnet)
- `WALLET_PRIVATE_KEY` - Private key for transaction signing (required)

### Contract Addresses

- `FLASHSWAP_V2_ADDRESS` - FlashSwapV2 contract address (optional)
- `FLASHSWAP_V2_OWNER` - Owner address for profit distribution (optional)
- `MULTI_SIG_ADDRESS` - Alternative recipient address (optional)

### Performance Settings

- `SCAN_INTERVAL` - Milliseconds between scans (default: 1000)
- `CONCURRENCY` - Number of concurrent workers (default: 10)

### Profitability Thresholds

- `MIN_PROFIT_THRESHOLD` - Minimum profit as decimal (default: 0.01)
- `MIN_PROFIT_PERCENT` - Minimum profit percentage (default: 0.5)

### Gas Settings

- `MAX_GAS_PRICE` - Maximum gas price in gwei (default: 100)
- `MAX_GAS_COST_PERCENTAGE` - Max gas cost as % of profit (default: 40)

### Feature Flags

- `ENABLE_ML_PREDICTIONS` - Enable ML-based predictions (default: false)
- `ENABLE_CROSS_CHAIN` - Enable cross-chain arbitrage (default: false)
- `DRY_RUN` - Run without executing trades (default: true in development)

### Monitoring

- `HEALTH_CHECK_INTERVAL` - Health check interval in ms (default: 30000)

## Architecture

### Core Components

1. **ArbitrageBot** - Main orchestrator class
2. **AdvancedOrchestrator** - Opportunity detection and pathfinding
3. **IntegratedArbitrageOrchestrator** - Trade execution engine
4. **SystemHealthMonitor** - Component health monitoring
5. **GasPriceOracle** - Real-time gas price tracking
6. **AdvancedGasEstimator** - Gas cost estimation

### Main Loop

The bot operates in a continuous scanning cycle:

1. **Scan** - Search for arbitrage opportunities across DEXes
2. **Evaluate** - Filter opportunities by profitability and gas costs
3. **Execute** - Execute profitable trades (in production mode)
4. **Monitor** - Track performance and health metrics
5. **Repeat** - Continue scanning at configured interval

### Event System

The bot emits events for monitoring:

- `started` - Bot has started
- `shutdown` - Bot is shutting down
- `scan_error` - Error during scan cycle
- `opportunity_found` - Opportunity detected
- `execution_started` - Trade execution started
- `execution_completed` - Trade executed successfully
- `execution_failed` - Trade execution failed

## Logging

The bot provides comprehensive logging:

- **Startup** - Network connection, wallet balance, component initialization
- **Operations** - Scan cycles, opportunities found, trades executed
- **Errors** - Failures, retries, recovery actions
- **Shutdown** - Final statistics, cleanup completion

### Log Levels

- `[INFO]` - Normal operations
- `[WARN]` - Warnings and alerts
- `[ERROR]` - Errors and failures
- `[DEBUG]` - Detailed debug information

## Statistics

The bot tracks key metrics:

- **Uptime** - Time since bot started
- **Cycles Completed** - Number of scan cycles
- **Opportunities Found** - Total opportunities detected
- **Trades Executed** - Successful trade executions
- **Total Profit** - Cumulative profit in ETH
- **Errors** - Error count

Access statistics via the bot instance:

```typescript
const stats = bot.getStats();
console.log(`Uptime: ${stats.uptime}ms`);
console.log(`Opportunities: ${stats.opportunitiesFound}`);
console.log(`Profit: ${ethers.utils.formatEther(stats.totalProfit)} ETH`);
```

## Shutdown

The bot handles graceful shutdown on:

- `SIGINT` (Ctrl+C)
- `SIGTERM` (Process termination)
- `SIGHUP` (Hang up)

During shutdown:

1. Stops scanning loop
2. Cancels active executions
3. Stops health monitoring
4. Logs final statistics
5. Cleans up resources
6. Exits process

## Error Handling

The bot implements robust error handling:

- **Network Errors** - Automatic retry with exponential backoff
- **RPC Failures** - Provider health monitoring and alerts
- **Execution Errors** - Tracked and logged, cycle continues
- **Uncaught Exceptions** - Graceful shutdown with error logging
- **Unhandled Rejections** - Logged and handled appropriately

## Testing

Run the test suite:

```bash
npm test
```

Run specific tests:

```bash
npm test -- src/__tests__/main.test.ts
```

## Development

### Project Structure

```
src/
├── main.ts                    # Main entry point
├── arbitrage/                 # Arbitrage detection
├── execution/                 # Trade execution
├── monitoring/                # Health monitoring
├── gas/                       # Gas management
├── config/                    # Configuration
└── __tests__/
    └── main.test.ts          # Main runner tests
```

### Module Exports

The main runner exports key components for testing and integration:

```typescript
import { ArbitrageBot, BotConfig, loadConfig } from './main';

// Create custom bot instance
const config: BotConfig = loadConfig();
const bot = new ArbitrageBot(config);

// Start bot programmatically
await bot.start();

// Access statistics
const stats = bot.getStats();

// Shutdown when done
await bot.shutdown();
```

## Security

⚠️ **Important Security Considerations:**

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Protect private keys** - Use environment variables only
3. **Use testnet first** - Test on Goerli/Sepolia before mainnet
4. **Monitor wallet balance** - Set up low-balance alerts
5. **Review transactions** - Enable dry-run mode initially
6. **Secure RPC endpoints** - Use authenticated endpoints
7. **Rate limiting** - Respect RPC provider limits

## Troubleshooting

### Common Issues

**Bot won't start:**
- Check RPC_URL is valid and reachable
- Verify WALLET_PRIVATE_KEY is correctly formatted
- Ensure wallet has sufficient ETH for gas

**No opportunities found:**
- Market conditions may not support arbitrage
- Adjust MIN_PROFIT_THRESHOLD lower
- Increase SCAN_INTERVAL for more coverage
- Verify DEX registry is properly configured

**High error rate:**
- Check RPC provider health
- Reduce CONCURRENCY to lower load
- Verify network connectivity
- Check wallet balance and nonce

**Excessive gas costs:**
- Lower MAX_GAS_PRICE
- Increase MAX_GAS_COST_PERCENTAGE threshold
- Wait for lower network congestion

## Support

For issues and questions:
- Check the [main documentation](../README.md)
- Review [.env.example](./.env.example) for all options
- Check logs for error messages
- Verify configuration is correct

## License

MIT License - See [LICENSE](../LICENSE) for details
