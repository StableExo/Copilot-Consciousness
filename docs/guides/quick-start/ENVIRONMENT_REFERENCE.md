# Environment Variables & Configuration Reference

**Quick Reference Guide for Copilot-Consciousness**  
**Read this at startup to understand all available configuration options**  
**Last Updated:** 2025-11-23 | **Version:** 3.0.0

---

## 📋 Quick Navigation

- [Critical Variables](#critical-variables) - Must be set
- [Blockchain & RPC](#blockchain--rpc-configuration) - Network connectivity
- [Wallet & Security](#wallet--security) - Private keys and auth
- [Infrastructure](#infrastructure-services) - Database, cache, messaging
- [Performance Tuning](#performance--execution-settings) - Gas, profit, concurrency
- [AI & Consciousness](#ai--consciousness-configuration) - AI providers and consciousness system
- [MEV Protection](#mev--private-transaction-settings) - Flashbots and private RPCs
- [Feature Flags](#feature-flags) - Enable/disable components
- [Monitoring & Alerts](#monitoring--alerts) - Logging, dashboards, notifications
- [Advanced Features](#advanced-features-phase-3) - Phase 3 AI, cross-chain, security

---

## 🔴 Critical Variables

**These MUST be set for the system to function:**

| Variable | Purpose | Example | Default |
|----------|---------|---------|---------|
| `NODE_ENV` | Runtime environment | `production`, `development`, `test` | `development` |
| `WALLET_PRIVATE_KEY` | Transaction signing key | `0x...` (64 hex chars) | ❌ REQUIRED |
| `BASE_RPC_URL` | Primary blockchain RPC | `https://base-mainnet.g.alchemy.com/v2/KEY` | ❌ REQUIRED |
| `JWT_SECRET` | Auth token signing | 128+ hex characters | ❌ REQUIRED |
| `SECRETS_ENCRYPTION_KEY` | Data encryption | 64 hex chars (32 bytes) | ❌ REQUIRED |
| `AUDIT_ENCRYPTION_KEY` | Audit log encryption | 64 hex chars (32 bytes) | ❌ REQUIRED |

---

## 🌐 Blockchain & RPC Configuration

### Primary Networks

| Variable | Network | Format | Required |
|----------|---------|--------|----------|
| `ETHEREUM_RPC_URL` | Ethereum Mainnet | `https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY` | Optional |
| `BASE_RPC_URL` | Base Network | `https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY` | ✅ Yes |
| `ARBITRUM_RPC_URL` | Arbitrum | `https://arb-mainnet.g.alchemy.com/v2/YOUR-API-KEY` | Optional |
| `OPTIMISM_RPC_URL` | Optimism | `https://opt-mainnet.g.alchemy.com/v2/YOUR-API-KEY` | Optional |
| `POLYGON_RPC_URL` | Polygon | `https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY` | Optional |
| `MAINNET_RPC_URL` | Alias for Ethereum | Same as `ETHEREUM_RPC_URL` | Optional |
| `L2_RPC_URL` | Generic L2 fallback | Any Layer 2 RPC URL | Optional |
| `RPC_URL` | Generic fallback | Any RPC URL | Optional |

### Backup RPC Endpoints

| Variable | Purpose | Example |
|----------|---------|---------|
| `ETHEREUM_RPC_URL_BACKUP` | Ethereum failover | `https://eth-mainnet.public.blastapi.io` |
| `ARBITRUM_RPC_URL_BACKUP` | Arbitrum failover | `https://arb1.arbitrum.io/rpc` |
| `POLYGON_RPC_URL_BACKUP` | Polygon failover | `https://polygon-rpc.com` |
| `OPTIMISM_RPC_URL_BACKUP` | Optimism failover | `https://mainnet.optimism.io` |
| `BASE_RPC_URL_BACKUP` | Base failover | `https://mainnet.base.org` |

### WebSocket Endpoints

| Variable | Purpose | Format |
|----------|---------|--------|
| `INFURA_WS_URL` | Infura WebSocket | `wss://mainnet.infura.io/ws/v3/YOUR-PROJECT-ID` |
| `ALCHEMY_WS_URL` | Alchemy WebSocket | `wss://eth-mainnet.alchemyapi.io/v2/YOUR-API-KEY` |
| `SOLANA_WS_URL` | Solana WebSocket | `wss://api.mainnet-beta.solana.com` |

### Enhanced APIs

| Variable | Purpose | Provider |
|----------|---------|----------|
| `ALCHEMY_API_KEY` | Enhanced APIs (Token, NFT, Trace) | Alchemy |

### Blockchain Explorers

| Variable | Network | Where to Get |
|----------|---------|--------------|
| `ETHERSCAN_API_KEY` | Ethereum | https://etherscan.io/myapikey |
| `BASESCAN_API_KEY` | Base | https://basescan.org/myapikey |
| `ARBISCAN_API_KEY` | Arbitrum | https://arbiscan.io/myapikey |
| `OPTIMISTIC_ETHERSCAN_API_KEY` | Optimism | https://optimistic.etherscan.io/myapikey |
| `POLYGONSCAN_API_KEY` | Polygon | https://polygonscan.com/myapikey |

### Network Configuration

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `CHAIN_ID` | Primary chain ID | `8453` | `1`=Ethereum, `8453`=Base, `42161`=Arbitrum |
| `FORKING` | Enable Hardhat forking | `false` | For local testing |
| `HARDHAT_NETWORK` | Hardhat network mode | `hardhat` | `hardhat`, `localhost`, `mainnet` |
| `HARDHAT_FORK_ENABLED` | Enable fork mode | `false` | Boolean |
| `HARDHAT_FORK_BLOCK_NUMBER` | Block to fork from | `228000000` | Number |
| `HARDHAT_CHAIN_ID` | Hardhat chain ID | `31337` | For local dev |

---

## 💰 Wallet & Security

### Wallet Configuration

| Variable | Purpose | Format | Security |
|----------|---------|--------|----------|
| `WALLET_PRIVATE_KEY` | Bot wallet key | `0x` + 64 hex chars | 🔴 CRITICAL |
| `FLASHSWAP_V2_ADDRESS` | FlashSwap contract | `0x` + 40 hex chars | Medium |
| `FLASHSWAP_V2_OWNER` | Contract owner | `0x` + 40 hex chars | Medium |
| `MULTI_SIG_ADDRESS` | Multi-sig wallet | `0x` + 40 hex chars | Optional |
| `MULTI_SIG_THRESHOLD` | Required signatures | `2` | Optional |

### Security & Encryption

| Variable | Purpose | Generation | Required |
|----------|---------|------------|----------|
| `JWT_SECRET` | JWT signing | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | ✅ Yes |
| `SECRETS_ENCRYPTION_KEY` | Data encryption | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | ✅ Yes |
| `AUDIT_ENCRYPTION_KEY` | Audit encryption | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | ✅ Yes |
| `CORS_ORIGIN` | CORS policy | `https://yourdomain.com` or `*` | ✅ Yes |
| `REQUIRE_2FA` | Enforce 2FA | `true`, `false` | Optional |
| `SESSION_TIMEOUT` | Session duration (ms) | `3600000` | Optional |
| `RATE_LIMIT_PER_IP` | Rate limit per IP | `100` | Optional |

---

## 🗄️ Infrastructure Services

### PostgreSQL / TimescaleDB

**Note:** Port 5432 is the standard PostgreSQL port used for direct TCP connections. This port must be accessible for database tools (psql, pgAdmin) and direct connections. HTTPS-based APIs (like Supabase) work without requiring direct port access.

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `TIMESCALEDB_HOST` | Database host | `localhost` | For distributed mode |
| `TIMESCALEDB_PORT` | Database port | `5432` | For distributed mode |
| `TIMESCALEDB_DATABASE` | Database name | `arbitrage` | For distributed mode |
| `TIMESCALEDB_USER` | DB username | `arbitrage` | For distributed mode |
| `TIMESCALEDB_PASSWORD` | DB password | Strong password | For distributed mode |
| `POSTGRES_HOST` | PostgreSQL host | `localhost` | Alternative |
| `POSTGRES_PORT` | PostgreSQL port | `5432` | Alternative |
| `POSTGRES_USER` | PostgreSQL user | `arbitrage` | Alternative |
| `POSTGRES_PASSWORD` | PostgreSQL password | Strong password | Alternative |
| `POSTGRES_DB` | Database name | `arbitrage` | Alternative |
| `DATABASE_URL` | Full connection string | `postgresql://user:pass@host:5432/db` | Alternative |
| `TIMESERIES_CONNECTION_STRING` | TimeSeries DB | `postgresql://user:pass@host:5432/db` | For ML features |

### Redis

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `REDIS_HOST` | Redis host | `localhost` | For distributed mode |
| `REDIS_PORT` | Redis port | `6379` | For distributed mode |
| `REDIS_PASSWORD` | Redis password | Strong password | For distributed mode |
| `REDIS_URL` | Full Redis URL | `redis://:password@localhost:6379` | Alternative |

### RabbitMQ

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `RABBITMQ_HOST` | RabbitMQ host | `localhost` | For distributed mode |
| `RABBITMQ_PORT` | RabbitMQ port | `5672` | For distributed mode |
| `RABBITMQ_USERNAME` | RabbitMQ user | `arbitrage` | For distributed mode |
| `RABBITMQ_PASSWORD` | RabbitMQ password | Strong password | For distributed mode |
| `RABBITMQ_URL` | Full RabbitMQ URL | `amqp://user:pass@localhost:5672` | Alternative |

### Service Discovery

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `CONSUL_URL` | Consul endpoint | `http://localhost:8500` | For distributed mode |

---

## ⚡ Performance & Execution Settings

### Profitability Thresholds

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `MIN_PROFIT_THRESHOLD` | Minimum profit % | `0.01` | 1% = `0.01` |
| `MIN_PROFIT_PERCENT` | Alternative min profit | `0.5` | 0.5% |
| `MIN_PROFIT_ABSOLUTE` | Min profit in wei | `100000000000000000` | 0.1 ETH |
| `ALERT_PROFIT_THRESHOLD` | Alert threshold | `1.0` | 1 ETH |
| `ALERT_LOSS_THRESHOLD` | Loss alert | `0.5` | 0.5 ETH |

### Gas Configuration

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `MAX_GAS_PRICE` | Max gas in gwei | `100` | Adjust for network |
| `MAX_GAS_COST_PERCENTAGE` | Max gas % of profit | `40` | Gas ≤ 40% profit |
| `REPORT_GAS` | Enable gas reporting | `false` | For testing |
| `ALERT_GAS_THRESHOLD` | Gas alert threshold | `0.1` | 0.1 ETH |

### Slippage

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `MAX_SLIPPAGE` | Max slippage | `0.005` | 0.5% |
| `MAX_SLIPPAGE_PERCENT` | Alternative slippage | `1.0` | 1% |

### Liquidity Filters

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `MIN_LIQUIDITY` | Min pool liquidity (wei) | `100000000000000000000` | 100 tokens |

### Scanning & Concurrency

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `SCAN_INTERVAL` | Time between scans (ms) | `1000` | 1 second |
| `CONCURRENCY` | Concurrent workers | `10` | Tune for resources |
| `TARGET_THROUGHPUT` | Target ops/sec | `10000` | Performance target |

### Transaction Settings

| Variable | Purpose | Default | Options |
|----------|---------|---------|---------|
| `TX_TIMEOUT` | Transaction timeout (ms) | `60000` | 60 seconds |
| `TX_RETRY_COUNT` | Retry attempts | `3` | Number |
| `TX_PRIORITY` | Transaction priority | `medium` | `low`, `medium`, `high`, `instant` |
| `TX_MAX_PENDING` | Max pending txs | `5` | Number |
| `NONCE_MANAGEMENT` | Nonce handling | `auto` | `auto`, `manual` |

### Rate Limiting

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `RPC_RATE_LIMIT` | RPC requests/min | `10000` | Per RPC endpoint |
| `API_RATE_LIMIT` | API requests/min | `1000` | Dashboard API |
| `WEBSOCKET_RATE_LIMIT` | WS messages/sec | `100` | WebSocket limit |

---

## 🤖 AI & Consciousness Configuration

### AI Provider System (Universal Multi-Provider)

| Variable | Purpose | Default | Where to Get |
|----------|---------|---------|--------------|
| `GEMINI_API_KEY` | Google Gemini AI | - | https://makersuite.google.com/app/apikey |
| `GEMINI_MODEL` | Gemini model | `gemini-pro` | - |
| `GEMINI_CITADEL_MODE` | Citadel mode | `false` | - |
| `GITHUB_COPILOT_API_KEY` | GitHub Copilot | - | https://github.com/settings/copilot |
| `GITHUB_COPILOT_MODEL` | Copilot model | `gpt-4` | - |
| `GITHUB_COPILOT_ENDPOINT` | Copilot API | `https://api.githubcopilot.com/chat/completions` | - |
| `OPENAI_API_KEY` | OpenAI API | - | https://platform.openai.com/api-keys |
| `OPENAI_MODEL` | OpenAI model | `gpt-4` | `gpt-4`, `gpt-3.5-turbo` |
| `OPENAI_ORGANIZATION` | OpenAI org ID | - | Optional |

### AI Provider Configuration

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `AI_PROVIDER_FALLBACK_CHAIN` | Fallback order | `gemini,copilot,openai,local` | Comma-separated |
| `AI_PROVIDER_RETRY_ATTEMPTS` | Retry count | `2` | Number |
| `AI_PROVIDER_RETRY_DELAY` | Retry delay (ms) | `1000` | Milliseconds |
| `AI_PROVIDER_TIMEOUT` | Request timeout (ms) | `30000` | 30 seconds |
| `AI_CITADEL_MODE_ENABLED` | Enable Citadel | `false` | For all providers |
| `AI_CITADEL_TEMPERATURE` | Citadel temp | `0.7` | 0.0-1.0 |
| `AI_CITADEL_MAX_TOKENS` | Max tokens | `2048` | Number |

### Cognitive Coordination (14-Module Orchestration)

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `COGNITIVE_CONSENSUS_THRESHOLD` | Agreement required | `0.7` | 70% |
| `COGNITIVE_CRITICAL_MODULES` | Critical modules | `riskAssessor,opportunityScorer,autonomousGoals` | Comma-separated |
| `WEIGHT_LEARNING_ENGINE` | Module weight | `0.8` | 0.0-1.0 |
| `WEIGHT_PATTERN_TRACKER` | Module weight | `0.9` | 0.0-1.0 |
| `WEIGHT_HISTORICAL_ANALYZER` | Module weight | `0.85` | 0.0-1.0 |
| `WEIGHT_SPATIAL_REASONING` | Module weight | `0.75` | 0.0-1.0 |
| `WEIGHT_MULTIPATH_EXPLORER` | Module weight | `0.7` | 0.0-1.0 |
| `WEIGHT_OPPORTUNITY_SCORER` | Module weight | `1.0` | Critical |
| `WEIGHT_PATTERN_RECOGNITION` | Module weight | `0.9` | 0.0-1.0 |
| `WEIGHT_RISK_ASSESSOR` | Module weight | `1.0` | Critical |
| `WEIGHT_RISK_CALIBRATOR` | Module weight | `0.85` | 0.0-1.0 |
| `WEIGHT_THRESHOLD_MANAGER` | Module weight | `0.9` | 0.0-1.0 |
| `WEIGHT_AUTONOMOUS_GOALS` | Module weight | `0.95` | Critical |
| `WEIGHT_OPERATIONAL_PLAYBOOK` | Module weight | `0.8` | 0.0-1.0 |
| `WEIGHT_ARCHITECTURAL_PRINCIPLES` | Module weight | `0.75` | 0.0-1.0 |
| `WEIGHT_EVOLUTION_TRACKER` | Module weight | `0.7` | 0.0-1.0 |

### Emergence Detection ("BOOM" Moment)

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `EMERGENCE_MIN_MODULES` | Min modules | `14` | All modules |
| `EMERGENCE_MAX_RISK_SCORE` | Max risk | `0.30` | 30% |
| `EMERGENCE_MIN_ETHICAL_SCORE` | Min ethics | `0.70` | 70% |
| `EMERGENCE_MIN_GOAL_ALIGNMENT` | Min alignment | `0.75` | 75% |
| `EMERGENCE_MIN_PATTERN_CONFIDENCE` | Min confidence | `0.70` | 70% |
| `EMERGENCE_MIN_HISTORICAL_SUCCESS` | Min success | `0.60` | 60% |
| `EMERGENCE_MAX_DISSENT_RATIO` | Max dissent | `0.15` | 15% |
| `EMERGENCE_DETECTION_ENABLED` | Enable detection | `true` | Boolean |
| `EMERGENCE_AUTO_EXECUTE` | Auto-execute | `false` | ⚠️ Use with caution |
| `EMERGENCE_HISTORY_SIZE` | History size | `1000` | Records |
| `EMERGENCE_LOG_ALL` | Log all detections | `true` | Boolean |

### Memory Consolidation (Sleep-like Processing)

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `MEMORY_IMPORTANCE_THRESHOLD` | Min importance | `0.5` | 0.0-1.0 |
| `MEMORY_ACCESS_COUNT_THRESHOLD` | Min access | `2` | Number |
| `MEMORY_MIN_AGE_MS` | Min age | `60000` | 1 minute |
| `MEMORY_CONSOLIDATION_INTERVAL_MS` | Interval | `3600000` | 1 hour |
| `MEMORY_SHORT_TERM_CAPACITY` | Short-term size | `100` | Items |
| `MEMORY_WORKING_CAPACITY` | Working memory | `7` | Miller's Law |
| `MEMORY_MAX_LONG_TERM` | Long-term max | `10000` | Items |
| `MEMORY_PRUNE_CUTOFF` | Prune threshold | `0.3` | Relevance |
| `MEMORY_PRUNE_ENABLED` | Enable pruning | `true` | Boolean |
| `MEMORY_PRESERVE_LONG_TERM` | Preserve LTM | `true` | Boolean |
| `MEMORY_ASSOCIATION_ENABLED` | Build associations | `true` | Boolean |
| `MEMORY_ASSOCIATION_THRESHOLD` | Min strength | `0.3` | 0.0-1.0 |
| `MEMORY_BACKGROUND_ENABLED` | Background consolidation | `true` | Boolean |
| `MEMORY_BACKGROUND_ON_STARTUP` | Run on startup | `false` | Boolean |

### Legacy Consciousness (Pre-3.1.0)

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `COGNITIVE_LEARNING_RATE` | Learning rate | `0.1` | 0.0-1.0 |
| `COGNITIVE_SELF_AWARENESS` | Self-awareness | `0.7` | 0.0-1.0 |

---

## 🔒 MEV & Private Transaction Settings

### Private RPC Configuration

| Variable | Purpose | Default | Options |
|----------|---------|---------|---------|
| `ENABLE_PRIVATE_RPC` | Enable private txs | `true` | `true`, `false` |
| `PRIVATE_RPC_PRIVACY_LEVEL` | Privacy level | `basic` | `none`, `basic`, `enhanced`, `maximum` |
| `FLASHBOTS_RPC_URL` | Flashbots endpoint | `https://rpc.flashbots.net` | URL |
| `FLASHBOTS_AUTH_KEY` | Flashbots auth | - | Optional |
| `MEV_SHARE_RPC_URL` | MEV-Share endpoint | `https://relay.flashbots.net` | URL |
| `MEV_SHARE_AUTH_KEY` | MEV-Share auth | - | Optional |
| `BUILDER_RPC_URL_1` | Builder RPC | - | Optional |
| `BUILDER_RPC_AUTH_KEY_1` | Builder auth | - | Optional |
| `PRIVATE_RPC_TIMEOUT` | Timeout (ms) | `30000` | 30 seconds |
| `PRIVATE_RPC_FALLBACK` | Fallback to public | `true` | Boolean |
| `PRIVATE_RPC_FAST_MODE` | Multi-relay submit | `false` | Boolean |

### MEV-Share Hints

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `MEV_SHARE_HINT_CALLDATA` | Share calldata | `false` | Boolean |
| `MEV_SHARE_HINT_CONTRACT` | Share contract | `false` | Boolean |
| `MEV_SHARE_HINT_FUNCTION` | Share function | `false` | Boolean |
| `MEV_SHARE_HINT_LOGS` | Share logs | `false` | Boolean |

### MEV Risk Configuration

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `MEV_RISK_BASE` | Base risk (ETH) | `0.001` | 0.001 ETH |
| `MEV_VALUE_SENSITIVITY` | Value impact | `0.15` | 0.0-1.0 |
| `MEV_CONGESTION_FACTOR` | Congestion impact | `0.3` | 0.0-1.0 |
| `MEV_SEARCHER_DENSITY` | Competition level | `0.25` | 0.0-1.0 |
| `SENSOR_UPDATE_INTERVAL` | Sensor update (ms) | `5000` | 5 seconds |
| `MEMPOOL_MONITORING_ENABLED` | Monitor mempool | `true` | Boolean |
| `SEARCHER_DETECTION_ENABLED` | Detect searchers | `true` | Boolean |
| `MEV_PROFIT_ADJUSTMENT` | Adjust for MEV | `true` | Boolean |
| `MEV_RISK_THRESHOLD` | Max acceptable risk | `0.05` | 5% of value |

---

## 🎯 Feature Flags

### Core Features

| Variable | Purpose | Default | Options |
|----------|---------|---------|---------|
| `DRY_RUN` | Simulation mode | `true` | `true`, `false` |
| `OFFLINE_CACHE_ONLY` | Use only cached pool data, no RPC calls | `false` | `true`, `false` |
| `USE_NEW_INITIALIZER` | New init system | `false` | `true`, `false` |
| `ENABLE_ML_PREDICTIONS` | ML predictions | `true` | `true`, `false` |
| `ENABLE_CROSS_CHAIN` | Cross-chain arb | `true` | `true`, `false` |
| `ENABLE_LAYER2` | Layer 2 support | `true` | `true`, `false` |

### DEX Configuration

| Variable | Purpose | Default | Options |
|----------|---------|---------|---------|
| `ENABLE_UNISWAP_V2` | Uniswap V2 | `true` | `true`, `false` |
| `ENABLE_UNISWAP_V3` | Uniswap V3 | `true` | `true`, `false` |
| `ENABLE_SUSHISWAP` | SushiSwap | `true` | `true`, `false` |
| `ENABLE_PANCAKESWAP` | PancakeSwap | `false` | `true`, `false` |
| `ENABLE_CURVE` | Curve | `true` | `true`, `false` |
| `ENABLE_BALANCER` | Balancer | `true` | `true`, `false` |

### ML Configuration

| Variable | Purpose | Default | Options |
|----------|---------|---------|---------|
| `ML_DATA_COLLECTION_ENABLED` | Collect ML data | `true` | `true`, `false` |
| `ML_DATA_INTERVAL` | Collection interval (ms) | `60000` | 1 minute |
| `ML_LSTM_ENABLED` | LSTM model | `true` | `true`, `false` |
| `ML_SCORER_ENABLED` | ML scoring | `true` | `true`, `false` |
| `ML_VOLATILITY_ENABLED` | Volatility analysis | `true` | `true`, `false` |
| `ML_CONFIDENCE_THRESHOLD` | Min confidence | `0.7` | 0.0-1.0 |
| `ML_USE_GPU` | Use GPU | `false` | `true`, `false` |
| `ML_MODELS_PATH` | Model directory | `./models` | Path |

---

## 📊 Monitoring & Alerts

### Logging Configuration

| Variable | Purpose | Default | Options |
|----------|---------|---------|---------|
| `ENABLE_LOGGING` | Master logging switch | `true` | `true`, `false` |
| `LOG_LEVEL` | Verbosity | `info` | `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | Output format | `json` | `json`, `pretty` |
| `LOG_FILE_PATH` | Log file location | `./logs/arbitrage.log` | Path |
| `LOG_FILE` | Enable file logging | `true` | `true`, `false` |
| `LOG_DIR` | Log directory | `./logs` | Path |
| `LOG_COLORS` | Colored output | `true` | `true`, `false` |
| `LOG_MAX_FILES` | Max log files | `10` | Number |
| `LOG_MAX_SIZE` | Max file size | `10m` | Size |
| `PINO_PRETTY_ENABLED` | Pretty printing | `true` | Boolean |
| `DEBUG` | Debug mode | `false` | `true`, `false` |

### Dashboard & API

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `DASHBOARD_PORT` | Dashboard port | `3000` | Port number |
| `PORT` | Default service port | `3000` | Port number |
| `UPDATE_INTERVAL` | Update interval (ms) | `1000` | 1 second |
| `MAX_CONNECTIONS` | Max connections | `100` | Number |
| `ALERT_SUCCESS_RATE_THRESHOLD` | Success rate alert | `90` | 90% |

### Health Checks

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `HEALTH_CHECK_PORT` | Health check port | `8080` | Port number |
| `HEALTH_CHECK_INTERVAL` | Check interval (ms) | `30000` | 30 seconds |
| `LIVENESS_PROBE_PATH` | Liveness path | `/health/live` | Path |
| `READINESS_PROBE_PATH` | Readiness path | `/health/ready` | Path |

### Monitoring Stack

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `PROMETHEUS_PORT` | Prometheus port | `9090` | Port number |
| `GRAFANA_PORT` | Grafana port | `3010` | Port number |
| `GRAFANA_PASSWORD` | Grafana password | `admin` | ⚠️ Change in production |
| `JAEGER_PORT` | Jaeger port | `16686` | Port number |

### Alert Channels

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `EMAIL_ENABLED` | Enable email alerts | `false` | Optional |
| `EMAIL_RECIPIENTS` | Email addresses | `your-email@example.com` | If email enabled |
| `TELEGRAM_BOT_TOKEN` | Telegram bot | `your-token` | Optional |
| `TELEGRAM_CHAT_ID` | Telegram chat | `your-chat-id` | If Telegram enabled |
| `DISCORD_WEBHOOK_URL` | Discord webhook | `https://discord.com/api/webhooks/...` | Optional |
| `SENTRY_DSN` | Sentry error tracking | `https://...` | Optional |
| `SENTRY_ENVIRONMENT` | Sentry environment | `production` | Optional |

---

## 🚀 Advanced Features (Phase 3)

### Phase 3 Global Settings

| Variable | Purpose | Default | Options |
|----------|---------|---------|---------|
| `PHASE3_AI_ENABLED` | Enable Phase 3 AI | `true` | `true`, `false` |
| `PHASE3_CROSSCHAIN_ENABLED` | Enable cross-chain | `false` | `true`, `false` |
| `PHASE3_SECURITY_ENABLED` | Enhanced security | `true` | `true`, `false` |

### Reinforcement Learning Agent

| Variable | Purpose | Default | Range |
|----------|---------|---------|-------|
| `PHASE3_RL_LEARNING_RATE` | Learning rate | `0.1` | 0.0-1.0 |
| `PHASE3_RL_DISCOUNT_FACTOR` | Future reward discount | `0.95` | 0.0-1.0 |
| `PHASE3_RL_EXPLORATION_RATE` | Exploration rate | `0.3` | 0.0-1.0 |
| `PHASE3_RL_MIN_EXPLORATION` | Min exploration | `0.05` | 0.0-1.0 |
| `PHASE3_RL_EXPLORATION_DECAY` | Exploration decay | `0.995` | 0.0-1.0 |
| `PHASE3_RL_REPLAY_BUFFER_SIZE` | Buffer size | `10000` | Number |
| `PHASE3_RL_BATCH_SIZE` | Training batch size | `32` | Number |

### Neural Network Scorer

| Variable | Purpose | Default | Range |
|----------|---------|---------|-------|
| `PHASE3_NN_HIDDEN_LAYER_SIZE` | Hidden neurons | `16` | Number |
| `PHASE3_NN_LEARNING_RATE` | Learning rate | `0.01` | 0.0-1.0 |
| `PHASE3_NN_MOMENTUM` | Gradient momentum | `0.9` | 0.0-1.0 |
| `PHASE3_NN_CONFIDENCE` | Min confidence | `0.7` | 0.0-1.0 |
| `PHASE3_NN_BATCH_SIZE` | Training batch | `32` | Number |

### Genetic Algorithm Evolution

| Variable | Purpose | Default | Range |
|----------|---------|---------|-------|
| `PHASE3_EVOLUTION_POPULATION_SIZE` | Population size | `20` | Number |
| `PHASE3_EVOLUTION_GENERATION_SIZE` | Generation size | `5` | Number |
| `PHASE3_EVOLUTION_MUTATION_RATE` | Mutation rate | `0.3` | 0.0-1.0 |
| `PHASE3_EVOLUTION_CROSSOVER_RATE` | Crossover rate | `0.5` | 0.0-1.0 |
| `PHASE3_EVOLUTION_ELITISM_COUNT` | Top performers | `2` | Number |
| `PHASE3_EVOLUTION_MIN_GENERATIONS` | Min generations | `10` | Number |

### Cross-Chain Intelligence

| Variable | Purpose | Default | Range |
|----------|---------|---------|-------|
| `PHASE3_CROSSCHAIN_CHAINS` | Supported chains | `1,8453,42161,10` | Chain IDs |
| `PHASE3_CROSSCHAIN_UPDATE_INTERVAL` | Update interval (ms) | `15000` | 15 seconds |
| `PHASE3_CROSSCHAIN_MIN_DIVERGENCE` | Min price divergence | `0.005` | 0.5% |
| `PHASE3_CROSSCHAIN_MAX_BRIDGING_TIME` | Max bridge time (s) | `600` | 10 minutes |
| `PHASE3_CROSSCHAIN_MIN_PROFIT` | Min profit (ETH) | `0.01` | Number |

### Enhanced Security (Bloodhound Scanner)

| Variable | Purpose | Default | Options |
|----------|---------|---------|---------|
| `PHASE3_BLOODHOUND_ML_SCORING` | ML scoring | `true` | `true`, `false` |
| `PHASE3_BLOODHOUND_MIN_CONFIDENCE` | Min confidence | `0.7` | 0.0-1.0 |
| `PHASE3_BLOODHOUND_SCAN_DEPTH` | Scan depth | `deep` | `shallow`, `deep` |
| `PHASE3_BLOODHOUND_REDACTION` | Redaction mode | `smart` | `full`, `partial`, `smart` |
| `PHASE3_SECURITY_AUTO_RESPOND` | Auto-respond | `true` | `true`, `false` |
| `PHASE3_SECURITY_RESPONSE_DELAY` | Validation delay (ms) | `1000` | Milliseconds |
| `PHASE3_SECURITY_REQUIRE_APPROVAL` | Require approval | `false` | `true`, `false` |
| `PHASE3_SECURITY_MIN_OCCURRENCES` | Min pattern occurrences | `3` | Number |
| `PHASE3_SECURITY_PATTERN_WINDOW` | Pattern window (ms) | `86400000` | 24 hours |
| `PHASE3_SECURITY_AUTO_LEARNING` | Auto learning | `true` | `true`, `false` |

### Consciousness Deepening

| Variable | Purpose | Default | Options |
|----------|---------|---------|---------|
| `PHASE3_EPISODIC_MEMORY` | Episodic memory | `true` | `true`, `false` |
| `PHASE3_MAX_EPISODES` | Max episodes | `5000` | Number |
| `PHASE3_EPISODE_RETENTION_DAYS` | Retention days | `30` | Days |
| `PHASE3_ADVERSARIAL_RECOGNITION` | Adversarial learning | `true` | `true`, `false` |
| `PHASE3_ADVERSARIAL_MIN_OCCURRENCES` | Min occurrences | `3` | Number |
| `PHASE3_SELF_REFLECTION` | Self-reflection | `true` | `true`, `false` |
| `PHASE3_REFLECTION_INTERVAL` | Reflection interval (ms) | `3600000` | 1 hour |
| `PHASE3_REFLECTION_MIN_EPISODES` | Min episodes | `10` | Number |
| `PHASE3_CONSCIOUSNESS_LEARNING_RATE` | Learning rate | `0.05` | 0.0-1.0 |
| `PHASE3_CONSCIOUSNESS_MAX_HISTORY` | Max history | `1000` | Number |

---

## 🐍 Python & ML Environment

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `PYTHON_PATH` | Python interpreter | `python3` | Path to Python |
| `MEV_CALCULATOR_SCRIPT` | MEV calculator path | `./mev/calculators/mev_calculator.py` | Script path |

---

## 🧪 Testing & Development

| Variable | Purpose | Default | Notes |
|----------|---------|---------|-------|
| `NODE_ENV` | Environment | `development` | `development`, `test`, `production` |
| `DRY_RUN` | Simulation mode | `true` | No real transactions |
| `FORKING` | Hardhat forking | `false` | For testing |
| `REPORT_GAS` | Gas reporting | `false` | For testing |
| `DEBUG` | Debug mode | `false` | Verbose logging |

---

## 📝 Quick Reference: Environment Modes

### Development Mode
```bash
NODE_ENV=development
DRY_RUN=true
LOG_LEVEL=debug
CORS_ORIGIN=*
DEBUG=true
```

### Staging Mode
```bash
NODE_ENV=staging
DRY_RUN=true
LOG_LEVEL=info
CORS_ORIGIN=https://staging.yourdomain.com
DEBUG=false
```

### Production Mode
```bash
NODE_ENV=production
DRY_RUN=false
LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com
DEBUG=false
```

---

## 🔍 Variable Validation

### Check if Variable is Set
```bash
echo $WALLET_PRIVATE_KEY  # Should show value
```

### Validate All Variables
```bash
npm run validate-env
```

### Test RPC Connectivity
```bash
curl -X POST $ETHEREUM_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## 📚 Related Documentation

- [.env.example](../.env.example) - Template with all variables
- [GITHUB_SECRETS_AND_VARIABLES.md](./GITHUB_SECRETS_AND_VARIABLES.md) - GitHub Actions secrets guide
- [ENV_PRODUCTION_READINESS_REVIEW.md](./ENV_PRODUCTION_READINESS_REVIEW.md) - Production readiness review
- [MEV_SETUP_GUIDE.md](./MEV_SETUP_GUIDE.md) - MEV integration setup
- [PHASE3_ROADMAP.md](./PHASE3_ROADMAP.md) - Phase 3 features

---

## 💡 Pro Tips

1. **Start with .env.example**: Copy `.env.example` to `.env` and fill in values
2. **Use environment-specific files**: `.env.development`, `.env.production`
3. **Validate early**: Run `npm run validate-env` before starting
4. **Test in dry-run**: Always test with `DRY_RUN=true` first
5. **Monitor logs**: Check `LOG_LEVEL` and `LOG_FILE_PATH` settings
6. **Secure secrets**: Never commit `.env` file to version control
7. **Rotate credentials**: Change passwords and keys regularly
8. **Use backups**: Configure backup RPC endpoints for resilience

---

**🎯 Summary:**
- **280+ environment variables** available for configuration
- **9 major categories**: Blockchain, Wallet, Infrastructure, Performance, AI, MEV, Features, Monitoring, Advanced
- **Multiple modes**: Development, Staging, Production
- **Comprehensive coverage**: From basic RPC to advanced Phase 3 AI features

---

*This is your startup reference document. Read it each session to understand what's available and how to configure the system.*

**Last Updated:** 2025-11-23 | **Version:** 3.0.0
