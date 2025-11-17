# Level 1: Production Main Runner

This implementation provides a production-ready main runner for the arbitrage bot based on the PROJECT-HAVOC prototype, adapted for TypeScript.

## New Components

### 1. Enhanced Logger (`src/utils/logger.ts`)

A production-grade logging system with:
- Multiple log levels (DEBUG, INFO, WARN, ERROR)
- Colorized console output
- Timestamp formatting
- Module/component tags
- Optional file logging support
- Performance metric logging

**Usage:**
```typescript
import { logger } from './utils/logger';

logger.info('Bot started successfully');
logger.warn('Low balance detected', 'WALLET');
logger.error('Failed to execute trade', 'EXECUTION');
logger.debug('Processing opportunity', 'ARBITRAGE');
logger.metric('gas_price', 50, 'gwei');
```

**Configuration:**
- `LOG_LEVEL`: Set log level (DEBUG, INFO, WARN, ERROR)
- `LOG_COLORS`: Enable/disable colors (default: true)
- `LOG_FILE`: Enable file logging (default: false)
- `LOG_DIR`: Directory for log files (default: ./logs)

### 2. Config Validator (`src/utils/configValidator.ts`)

Validates all environment variables with descriptive error messages:
- RPC URLs (BASE_RPC_URL, ETHEREUM_RPC_URL)
- Wallet private key (format and validity)
- Contract addresses (FlashSwapV2)
- Numeric values (MIN_PROFIT_THRESHOLD, MAX_GAS_PRICE, etc.)
- Boolean flags
- BigInt values

**Usage:**
```typescript
import { validateConfig, validateAndLogConfig } from './utils/configValidator';

// Validate and get config
const config = validateConfig();

// Validate and log
const config = validateAndLogConfig(logger);
```

**Features:**
- Throws `ConfigValidationError` with detailed messages
- Validates Ethereum addresses
- Checks private key format and validity
- Range checks for numeric values
- Sensible defaults for optional values

### 3. Core Initializer (`src/core/initializer.ts`)

Initializes all bot components in the correct order, following PROJECT-HAVOC pattern:

**Initialization Order:**
1. Provider (validates network connection)
2. Wallet/Signer (checks balance)
3. Gas Oracle & Estimator
4. Nonce Manager (transaction management)
5. DEX Registry
6. Arbitrage Orchestrators
7. Health Monitor

**Usage:**
```typescript
import { initializeComponents, shutdownComponents } from './core/initializer';
import { validateConfig } from './utils/configValidator';

// Initialize
const config = validateConfig();
const components = await initializeComponents(config);

// Use components
const { provider, wallet, advancedOrchestrator, healthMonitor } = components;

// Shutdown
await shutdownComponents(components);
```

**Features:**
- Detailed logging at each step
- Proper error handling
- Health check registration
- Automatic orchestrator startup
- Graceful shutdown

### 4. Health Check Server (`src/monitoring/healthCheck.ts`)

Express HTTP server providing health and metrics endpoints:

**Endpoints:**
- `GET /health` - System health status (port 3001)
- `GET /metrics` - Performance metrics
- `GET /` - Service information

**Usage:**
```typescript
import { HealthCheckServer } from './monitoring/healthCheck';

const healthServer = new HealthCheckServer();
healthServer.setComponents(components);
await healthServer.start();

// Update stats
healthServer.updateStats({
  cyclesCompleted: 100,
  opportunitiesFound: 10,
  tradesExecuted: 2,
});

// Shutdown
await healthServer.stop();
```

**Configuration:**
- `HEALTH_CHECK_PORT`: Port for health server (default: 3001)

### 5. Enhanced Main Runner (`src/main.ts`)

Two initialization patterns available:

#### Legacy Pattern (Default)
Uses the original initialization method.

#### New Pattern (Recommended)
Uses the new initializer and health check server.

**Enable New Pattern:**
```bash
export USE_NEW_INITIALIZER=true
```

**Features:**
- Clean startup and shutdown
- Graceful signal handling (SIGINT, SIGTERM)
- Error recovery
- Health monitoring
- Statistics tracking
- Dry run support

## Running the Bot

### Development Mode (Dry Run)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### With New Initializer
```bash
export USE_NEW_INITIALIZER=true
npm run dev
```

## Configuration

Create a `.env` file based on `.env.example`:

**Required:**
- `BASE_RPC_URL` or `ETHEREUM_RPC_URL`
- `WALLET_PRIVATE_KEY`

**Optional:**
- `FLASHSWAP_V2_ADDRESS` - FlashSwapV2 contract address
- `FLASHSWAP_V2_OWNER` - Owner address for profits
- `MIN_PROFIT_THRESHOLD` - Minimum profit (default: 0.01)
- `MIN_PROFIT_PERCENT` - Minimum profit % (default: 0.5)
- `MAX_GAS_PRICE` - Max gas price in gwei (default: 100)
- `SCAN_INTERVAL` - Scan interval in ms (default: 1000)
- `CONCURRENCY` - Worker concurrency (default: 10)
- `DRY_RUN` - Dry run mode (default: true in development)
- `NODE_ENV` - Environment (development/production)

## Health Monitoring

When the bot is running, you can check its health:

```bash
# Health status
curl http://localhost:3001/health

# Metrics
curl http://localhost:3001/metrics
```

**Health Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T18:50:00.000Z",
  "uptime": 300000,
  "components": {
    "provider": { "status": "healthy" },
    "wallet": { "status": "healthy" },
    "gasOracle": { "status": "healthy" }
  }
}
```

**Metrics Response:**
```json
{
  "timestamp": "2025-11-06T18:50:00.000Z",
  "uptime": 300000,
  "system": {
    "memory": {
      "total": 134217728,
      "used": 89478485,
      "free": 44739243,
      "percentUsed": 66.67
    }
  },
  "arbitrage": {
    "cyclesCompleted": 300,
    "opportunitiesFound": 15,
    "tradesExecuted": 2,
    "totalProfit": "0",
    "successRate": 100
  },
  "network": {
    "blockNumber": 18500000,
    "gasPrice": "25 gwei"
  }
}
```

## Testing

Run tests for the new components:

```bash
# All tests
npm test

# Config validator tests
npm test -- src/__tests__/configValidator.test.ts

# Main runner tests
npm test -- src/__tests__/main.test.ts
```

## Architecture

The new architecture follows PROJECT-HAVOC patterns:

```
main.ts
  ├── configValidator (validates env vars)
  ├── initializer (sets up all components)
  │   ├── provider & wallet
  │   ├── gas oracle & estimator
  │   ├── nonce manager
  │   ├── DEX registry
  │   ├── arbitrage orchestrators
  │   └── health monitor
  └── healthCheck (HTTP endpoints)
```

## Next Steps (Level 2)

After Level 1 is complete:
1. Deploy FlashSwapV2 contract to Base Sepolia testnet
2. Test with real network on testnet
3. Verify all components work together
4. Monitor performance and optimize
5. Prepare for mainnet deployment

## Troubleshooting

### Config Validation Errors
If you see config validation errors, check:
- All required environment variables are set
- Private key is 64 hex characters (with or without 0x prefix)
- RPC URLs start with http://, https://, ws://, or wss://
- Addresses are valid Ethereum addresses

### Health Check Server Errors
If health check server fails to start:
- Check port 3001 is not in use
- Set `HEALTH_CHECK_PORT` to a different port
- Disable health check with custom config

### Initialization Errors
If components fail to initialize:
- Check RPC URL is accessible
- Verify wallet has sufficient balance
- Check network connectivity
- Review logs for specific component errors

## Security Notes

- **Never commit .env files** - They contain sensitive keys
- **Use secure RPC providers** - Don't use public endpoints in production
- **Keep private keys secure** - Consider using hardware wallets or key management services
- **Monitor health endpoints** - They may expose system information
- **Rotate API keys regularly** - Especially for production deployments
