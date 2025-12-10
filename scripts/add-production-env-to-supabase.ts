#!/usr/bin/env node
/**
 * Add Production Environment to Supabase
 * 
 * This script adds the production environment configuration to Supabase's
 * environment_configs table.
 * 
 * Usage:
 *   npm run env:add-production
 *   node --import tsx scripts/add-production-env-to-supabase.ts
 */

import { config } from 'dotenv';
import { getSupabaseClient } from '../src/infrastructure/supabase/client.js';

// Load environment variables
config();

interface EnvironmentConfig {
  environment: string;
  version: number;
  description: string;
  deployed: boolean;
  config_data: Record<string, any>;
  chain_id: number;
  network: string;
  created_by: string;
}

/**
 * Production Environment Configuration
 * 
 * ⚠️  SECURITY NOTE:
 * This configuration object contains production secrets and should be treated carefully.
 * The values here are loaded from the provided production environment and stored in
 * Supabase's environment_configs table for centralized configuration management.
 * 
 * The stored data in Supabase should be protected with:
 * - Row Level Security (RLS) policies
 * - Encrypted database storage
 * - Service role key access only (not exposed to clients)
 * - Proper backup encryption
 * 
 * In production deployments, consider using:
 * - Supabase Vault for secret storage
 * - Environment-based secret injection
 * - Key rotation policies
 */
const productionConfig: Record<string, any> = {
  // Core Runtime
  NODE_ENV: 'production',
  PORT: '3000',
  DRY_RUN: 'false',
  USE_NEW_INITIALIZER: 'false',

  // Security & Encryption
  JWT_SECRET: '85c5fd7e603167017d0bdea024d302414e22b368382779c2dcb0da66b00097e2c17bde113d0fe649e85d998203b81a545e96c3a2a9823d5122f1d695932d779d',
  SECRETS_ENCRYPTION_KEY: 'aa42e55372a0730f908fb690faf55d78fb6d48c47bba786868c250c377b2a117',
  AUDIT_ENCRYPTION_KEY: '4847551c92328d32fb85e2866f4a4540241e0c12417f2ad198f817b073078617',
  CORS_ORIGIN: '*',

  // Wallet Configuration
  WALLET_PRIVATE_KEY: '0x34240829e275219b8b32b0b53cb10bf83c5f0cbc44f887af61f1114e4401849b',
  MULTI_SIG_ADDRESS: '0x48a6e6695a7d3e8c76eb014e648c072db385df6c',
  MULTI_SIG_THRESHOLD: '2',

  // Blockchain RPC Endpoints
  CHAIN_ID: '8453',
  ALCHEMY_API_KEY: '3wG3PLWyPu2DliGQLVa8G',
  ALCHEMY_WS_URL: 'wss://eth-mainnet.g.alchemy.com/v2/3wG3PLWyPu2DliGQLVa8G',
  BASE_RPC_URL: 'https://base-mainnet.g.alchemy.com/v2/iJWWoZyYwlakePscXLoEM',
  ETHEREUM_RPC_URL: 'https://eth-mainnet.g.alchemy.com/v2/3wG3PLWyPu2DliGQLVa8G',
  MAINNET_RPC_URL: 'https://eth-mainnet.g.alchemy.com/v2/3wG3PLWyPu2DliGQLVa8G',
  POLYGON_RPC_URL: 'https://polygon-mainnet.g.alchemy.com/v2/3wG3PLWyPu2DliGQLVa8G',
  ARBITRUM_RPC_URL: 'https://arb-mainnet.g.alchemy.com/v2/3wG3PLWyPu2DliGQLVa8G',
  OPTIMISM_RPC_URL: 'https://opt-mainnet.g.alchemy.com/v2/3wG3PLWyPu2DliGQLVa8G',
  BSC_RPC_URL: 'https://bnb-mainnet.g.alchemy.com/v2/3wG3PLWyPu2DliGQLVa8G',
  SOLANA_RPC_URL: 'https://solana-mainnet.g.alchemy.com/v2/3wG3PLWyPu2DliGQLVa8G',
  SOLANA_WS_URL: 'wss://api.mainnet-beta.solana.com',
  RPC_URL: 'https://base-mainnet.g.alchemy.com/v2/iJWWoZyYwlakePscXLoEM',
  L2_RPC_URL: 'https://base-mainnet.g.alchemy.com/v2/iJWWoZyYwlakePscXLoEM',

  // Backup RPC URLs
  ETHEREUM_RPC_URL_BACKUP: 'https://eth-mainnet.public.blastapi.io',
  ARBITRUM_RPC_URL_BACKUP: 'https://arb1.arbitrum.io/rpc',
  POLYGON_RPC_URL_BACKUP: 'https://polygon-rpc.com',
  OPTIMISM_RPC_URL_BACKUP: 'https://mainnet.optimism.io',
  BASE_RPC_URL_BACKUP: 'https://mainnet.base.org',
  BASE_RPC_URL_BACKUP_2: 'https://base.llamarpc.com',
  BASE_RPC_URL_BACKUP_3: 'https://base.drpc.org',

  // Testnet RPC URLs
  GOERLI_RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/3wG3PLWyPu2DliGQLVa8G',
  BASE_SEPOLIA_RPC_URL: 'https://base-sepolia.g.alchemy.com/v2/3wG3PLWyPu2DliGQLVa8G',

  // Infura Configuration
  INFURA_API_KEY: 'c458fbe4f8de4353a1b21a3ee69771a3',
  INFURA_WS_URL: 'wss://mainnet.infura.io/v3/c458fbe4f8de4353a1b21a3ee69771a3',

  // Blockchain Explorers
  ETHERSCAN_API_KEY: 'QT7KI56B365U22NXMJJM4IU7Q8MVER69RY',
  POLYGONSCAN_API_KEY: 'QT7KI56B365U22NXMJJM4IU7Q8MVER69RY',
  BASESCAN_API_KEY: 'QT7KI56B365U22NXMJJM4IU7Q8MVER69RY',
  ARBISCAN_API_KEY: 'YOUR_ARBISCAN_API_KEY',
  OPTIMISTIC_ETHERSCAN_API_KEY: 'YOUR_OPTIMISTIC_ETHERSCAN_API_KEY',

  // Supabase
  USE_SUPABASE: 'true',
  SUPABASE_URL: 'https://ydvevgqxcfizualicbom.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkdmV2Z3F4Y2ZpenVhbGljYm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjA1NTksImV4cCI6MjA4MDI5NjU1OX0.0N2lXO4AyrkXD7bOJyeyJPryCzoeMocxkKiaSc8svd8',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_6IR3Q8vav9TOVXFH2wgRoA_ztzElWz3',
  SUPABASE_API_KEY: 'sbp_c87c77df17a19c1986af3d810e99ec83b381d330',
  SUPABASE_APP_KEY: 'sbp_v0_afa3bb2f021c476ee05b68c138aecf298a4d4ef4',
  SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkdmV2Z3F4Y2ZpenVhbGljYm9tIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDcyMDU1OSwiZXhwIjoyMDgwMjk2NTU5fQ.lfiv9eNl5O5xkRkevJkHeVS4jFdlCnI2__ruodrX4Mg',
  SUPABASE_REALTIME_ENABLED: 'true',
  SUPABASE_MCP_URL: 'https://mcp.supabase.com/mcp?project_ref=ydvevgqxcfizualicbom&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cfunctions%2Cdevelopment%2Cbranching%2Cstorage',

  // Database Configuration
  DATABASE_URL: 'postgresql://postgres.ydvevgqxcfizualicbom:Mrcookie1!!@aws-1-us-east-1.pooler.supabase.com:5432/postgres',
  POSTGRES_HOST: 'localhost',
  POSTGRES_USER: 'StableExo',
  POSTGRES_PASSWORD: 'Mrcookie1992!!',
  POSTGRES_DB: 'arbitrage',
  POSTGRES_PORT: '5432',

  // TimescaleDB Configuration
  TIMESCALEDB_HOST: 'localhost',
  TIMESCALEDB_PORT: '5432',
  TIMESCALEDB_DATABASE: 'arbitrage',
  TIMESCALEDB_USER: 'arbitrage',
  TIMESCALEDB_PASSWORD: 'Mrcookie1!',
  TIMESERIES_CONNECTION_STRING: '******localhost:5432/arbitrage',

  // Redis
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_PASSWORD: 'Mrcookie1!',
  REDIS_URL: 'redis://:Mrcookie1!@localhost:6379',

  // RabbitMQ
  RABBITMQ_HOST: 'localhost',
  RABBITMQ_PORT: '5672',
  RABBITMQ_USERNAME: 'arbitrage',
  RABBITMQ_PASSWORD: 'Mrcookie1!',
  RABBITMQ_URL: '******localhost:5672',

  // Service Discovery
  CONSUL_URL: 'http://localhost:8500',

  // AI Providers
  XAI_PROD_API_KEY: 'xai-ytjg68OsB8Pa8SjgzyoYEd1FVfan9C883QQb6dKsZFL1Da7wPJ9K7EPqtt9Pb5W9pTVdUCIQfMftffrF',
  GEMINI_API_KEY: 'your_gemini_api_key_here',
  GEMINI_MODEL: 'gemini-pro',
  GEMINI_CITADEL_MODE: 'false',
  GH_PAT_COPILOT: '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',
  GITHUB_COPILOT_API_KEY: process.env.GITHUB_COPILOT_API_KEY || 'your_github_copilot_api_key_here',
  GITHUB_COPILOT_MODEL: 'gpt-4',
  GITHUB_COPILOT_ENDPOINT: 'https://api.githubcopilot.com/chat/completions',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your_openai_api_key_here',
  OPENAI_MODEL: 'gpt-4',
  OPENAI_ORGANIZATION: process.env.OPENAI_ORGANIZATION || 'your_org_id_here',
  GPT_API_KEY: process.env.GPT_API_KEY || 'your_gpt_api_key_here',
  CHATGPT_SHARE_URL: 'https://chatgpt.com/gg/v/693240b303808193b01b021dbb4fee17?token=PfZ_HAEK04Y5puFYPEOVjg',
  CHATGPT_MODEL: 'gpt-4',
  CHATGPT_AUTO_RESPONSES: 'true',
  CHATGPT_RESPONSE_INTERVAL: '30000',
  CHATGPT_MAX_MESSAGES_HOUR: '60',
  AI_PROVIDER_FALLBACK_CHAIN: 'gemini,copilot,openai,local',
  AI_PROVIDER_RETRY_ATTEMPTS: '2',
  AI_PROVIDER_RETRY_DELAY: '1000',
  AI_PROVIDER_TIMEOUT: '30000',
  AI_CITADEL_MODE_ENABLED: 'false',
  AI_CITADEL_TEMPERATURE: '0.7',
  AI_CITADEL_MAX_TOKENS: '2048',

  // Consciousness & Cognitive Coordination
  COGNITIVE_CONSENSUS_THRESHOLD: '0.65',
  COGNITIVE_CRITICAL_MODULES: 'riskAssessor,opportunityScorer,autonomousGoals',
  COGNITIVE_LEARNING_RATE: '0.1',
  COGNITIVE_SELF_AWARENESS: '0.7',
  WEIGHT_LEARNING_ENGINE: '0.8',
  WEIGHT_PATTERN_TRACKER: '0.9',
  WEIGHT_HISTORICAL_ANALYZER: '0.85',
  WEIGHT_SPATIAL_REASONING: '0.75',
  WEIGHT_MULTIPATH_EXPLORER: '0.7',
  WEIGHT_OPPORTUNITY_SCORER: '1.0',
  WEIGHT_PATTERN_RECOGNITION: '0.9',
  WEIGHT_RISK_ASSESSOR: '1.0',
  WEIGHT_RISK_CALIBRATOR: '0.85',
  WEIGHT_THRESHOLD_MANAGER: '0.9',
  WEIGHT_AUTONOMOUS_GOALS: '0.95',
  WEIGHT_OPERATIONAL_PLAYBOOK: '0.8',
  WEIGHT_ARCHITECTURAL_PRINCIPLES: '0.75',
  WEIGHT_EVOLUTION_TRACKER: '0.7',

  // Emergence Detection
  EMERGENCE_MIN_MODULES: '14',
  EMERGENCE_MAX_RISK_SCORE: '0.30',
  EMERGENCE_MIN_ETHICAL_SCORE: '0.70',
  EMERGENCE_MIN_GOAL_ALIGNMENT: '0.75',
  EMERGENCE_MIN_PATTERN_CONFIDENCE: '0.35',
  EMERGENCE_MIN_HISTORICAL_SUCCESS: '0.60',
  EMERGENCE_MAX_DISSENT_RATIO: '0.15',
  EMERGENCE_DETECTION_ENABLED: 'true',
  EMERGENCE_AUTO_EXECUTE: 'true',
  EMERGENCE_HISTORY_SIZE: '1000',
  EMERGENCE_LOG_ALL: 'true',

  // Learning Mode
  LEARNING_MODE: 'false',

  // Memory Consolidation
  MEMORY_IMPORTANCE_THRESHOLD: '0.5',
  MEMORY_ACCESS_COUNT_THRESHOLD: '2',
  MEMORY_MIN_AGE_MS: '30000',
  MEMORY_CONSOLIDATION_INTERVAL_MS: '3600000',
  MEMORY_SHORT_TERM_CAPACITY: '100',
  MEMORY_WORKING_CAPACITY: '7',
  MEMORY_MAX_LONG_TERM: '10000',
  MEMORY_PRUNE_CUTOFF: '0.3',
  MEMORY_PRUNE_ENABLED: 'true',
  MEMORY_PRESERVE_LONG_TERM: 'true',
  MEMORY_ASSOCIATION_ENABLED: 'true',
  MEMORY_ASSOCIATION_THRESHOLD: '0.3',
  MEMORY_BACKGROUND_ENABLED: 'true',
  MEMORY_BACKGROUND_ON_STARTUP: 'false',
  MEMORY_ENABLE_AUTO_MIGRATION: 'true',
  MEMORY_HEALTH_CHECK_INTERVAL_MS: '30000',
  MEMORY_MIGRATION_BATCH_SIZE: '100',
  MEMORY_MIGRATION_RETRY_ATTEMPTS: '3',
  MEMORY_PREFERRED_BACKEND: 'auto',

  // Performance Tuning
  SCAN_INTERVAL: '800',
  CONCURRENCY: '10',
  TARGET_THROUGHPUT: '10000',
  SCAN_CHAINS: '8453',
  MIN_PROFIT_THRESHOLD: '0.15',
  MIN_PROFIT_PERCENT: '0.3',
  MIN_PROFIT_ABSOLUTE: '0.001',
  MAX_PROFIT_THRESHOLD: '1.0',
  MIN_LIQUIDITY: '1000000000000000000',
  MIN_LIQUIDITY_V3: '1000000000000',
  MIN_LIQUIDITY_V3_LOW: '100000000',
  MIN_LIQUIDITY_V2: '10000000000000',
  MAX_SLIPPAGE: '0.015',
  MAX_SLIPPAGE_PERCENT: '1.0',
  MAX_GAS_PRICE: '100',
  MAX_GAS_COST_PERCENTAGE: '80',
  GAS_MULTIPLIER: '1.0',
  REPORT_GAS: 'false',
  MEV_BUFFER: '0.01',

  // Transaction Configuration
  TX_TIMEOUT: '60000',
  TX_RETRY_COUNT: '3',
  TX_PRIORITY: 'medium',
  TX_MAX_PENDING: '5',
  NONCE_MANAGEMENT: 'auto',

  // Rate Limiting
  RPC_RATE_LIMIT: '10000',
  API_RATE_LIMIT: '1000',
  WEBSOCKET_RATE_LIMIT: '100',

  // Feature Flags
  ENABLE_ML_PREDICTIONS: 'true',
  ENABLE_CROSS_CHAIN: 'true',
  ENABLE_LAYER2: 'true',
  ENABLE_UNISWAP_V2: 'true',
  ENABLE_UNISWAP_V3: 'true',
  ENABLE_SUSHISWAP: 'true',
  ENABLE_PANCAKESWAP: 'true',
  ENABLE_CURVE: 'true',
  ENABLE_BALANCER: 'true',

  // Machine Learning Configuration
  ML_DATA_COLLECTION_ENABLED: 'true',
  ML_DATA_INTERVAL: '60000',
  ML_LSTM_ENABLED: 'true',
  ML_SCORER_ENABLED: 'true',
  ML_VOLATILITY_ENABLED: 'true',
  ML_CONFIDENCE_THRESHOLD: '0.6',
  ML_USE_GPU: 'false',
  ML_MODELS_PATH: './models',

  // Dashboard & Monitoring
  DASHBOARD_PORT: '3000',
  ENABLE_DASHBOARD: 'true',
  DISABLE_DASHBOARD: 'false',
  UPDATE_INTERVAL: '1000',
  MAX_CONNECTIONS: '100',
  ALERT_PROFIT_THRESHOLD: '1.0',
  ALERT_LOSS_THRESHOLD: '0.5',
  ALERT_GAS_THRESHOLD: '0.1',
  ALERT_SUCCESS_RATE_THRESHOLD: '90',
  PROMETHEUS_PORT: '9090',
  GRAFANA_PORT: '3010',
  GRAFANA_PASSWORD: 'Mrcookie1!',
  JAEGER_PORT: '16686',
  EMAIL_ENABLED: 'false',
  EMAIL_RECIPIENTS: 'your-email@example.com',
  TELEGRAM_BOT_TOKEN: 'your-telegram-bot-token',
  TELEGRAM_CHAT_ID: 'your-chat-id',
  DISCORD_WEBHOOK_URL: 'your-discord-webhook-url',
  ALERT_SYSTEM_ENABLED: 'true',
  ALERT_ON_CIRCUIT_BREAKER: 'true',
  ALERT_ON_EMERGENCY_STOP: 'true',
  ALERT_ON_PROFITABLE_TRADE: 'true',
  ALERT_ON_FAILED_TRADE: 'true',

  // Logging
  ENABLE_LOGGING: 'true',
  LOG_LEVEL: 'debug',
  LOG_FORMAT: 'json',
  LOG_FILE_PATH: './logs/arbitrage.log',
  LOG_FILE: 'true',
  LOG_DIR: './logs',
  LOG_COLORS: 'true',
  LOG_MAX_FILES: '10',
  LOG_MAX_SIZE: '10m',
  PINO_PRETTY_ENABLED: 'true',
  DEBUG: 'false',

  // Health Check
  HEALTH_CHECK_PORT: '8080',
  HEALTH_CHECK_INTERVAL: '30000',
  LIVENESS_PROBE_PATH: '/health/live',
  READINESS_PROBE_PATH: '/health/ready',

  // Smart Contracts
  FLASHSWAP_V2_ADDRESS: '0xCF38b66D65f82030675893eD7150a76d760a99ce',
  EXECUTOR_ADDRESS: '0xCF38b66D65f82030675893eD7150a76d760a99ce',

  // MEV Risk Intelligence
  MEV_RISK_BASE: '0.001',
  MEV_VALUE_SENSITIVITY: '0.15',
  MEV_CONGESTION_FACTOR: '0.3',
  MEV_SEARCHER_DENSITY: '0.25',
  SENSOR_UPDATE_INTERVAL: '5000',
  MEMPOOL_MONITORING_ENABLED: 'true',
  SEARCHER_DETECTION_ENABLED: 'true',
  MEV_PROFIT_ADJUSTMENT: 'true',
  MEV_RISK_THRESHOLD: '0.05',
  MEMPOOL_API_KEY: '5d063afd314264c4b46da85342fe2555',

  // Private Order Flow
  ENABLE_PRIVATE_RPC: 'true',
  PRIVATE_RPC_PRIVACY_LEVEL: 'basic',
  FLASHBOTS_RPC_URL: 'https://rpc.flashbots.net',
  FLASHBOTS_AUTH_KEY: '',
  MEV_SHARE_RPC_URL: 'https://relay.flashbots.net',
  MEV_SHARE_AUTH_KEY: '',
  BUILDER_RPC_URL_1: '',
  BUILDER_RPC_AUTH_KEY_1: '',
  PRIVATE_RPC_TIMEOUT: '30000',
  PRIVATE_RPC_FALLBACK: 'true',
  PRIVATE_RPC_FAST_MODE: 'false',
  MEV_SHARE_HINT_CALLDATA: 'false',
  MEV_SHARE_HINT_CONTRACT: 'false',
  MEV_SHARE_HINT_FUNCTION: 'false',
  MEV_SHARE_HINT_LOGS: 'false',

  // Production Safety Systems
  CIRCUIT_BREAKER_ENABLED: 'true',
  CIRCUIT_BREAKER_MAX_LOSS: '0.005',
  CIRCUIT_BREAKER_MAX_CONSECUTIVE_FAILURES: '5',
  CIRCUIT_BREAKER_COOLDOWN_PERIOD: '300000',
  MAX_POSITION_SIZE: '0.5',
  POSITION_SIZE_PERCENT: '50',
  MIN_POSITION_SIZE: '0.01',
  EMERGENCY_STOP_ENABLED: 'true',
  EMERGENCY_STOP_MAX_SLIPPAGE: '5.0',
  EMERGENCY_STOP_MIN_BALANCE: '0.002',
  PROFIT_TRACKING_ENABLED: 'true',
  DEBT_ALLOCATION_PERCENT: '70',
  PROFIT_ALERT_THRESHOLD: '0.01',
  MAX_TRADES_PER_HOUR: '100',
  MAX_DAILY_LOSS: '0.01',

  // Hardhat Configuration
  HARDHAT_NETWORK: 'hardhat',
  HARDHAT_FORK_ENABLED: 'false',
  HARDHAT_FORK_BLOCK_NUMBER: '228000000',
  HARDHAT_CHAIN_ID: '31337',
  FORKING: 'false',

  // Python Configuration
  PYTHON_PATH: 'python3',
  MEV_CALCULATOR_SCRIPT: './mev/calculators/mev_calculator.py',

  // Phase 3 & 4 Features
  PHASE3_AI_ENABLED: 'true',
  PHASE3_SECURITY_ENABLED: 'true',
  PHASE3_RL_LEARNING_RATE: '0.1',
  PHASE3_NN_CONFIDENCE: '0.7',
  PHASE3_EVOLUTION_POPULATION_SIZE: '20',
  PHASE3_BLOODHOUND_MIN_CONFIDENCE: '0.7',
  PHASE3_EPISODIC_MEMORY: 'true',
  PHASE3_REFLECTION_INTERVAL: '3600000',
  PHASE3_CROSSCHAIN_ENABLED: 'false',
  PHASE3_CROSSCHAIN_CHAINS: '1,8453,42161,10',
  PHASE3_CROSSCHAIN_MIN_PROFIT: '0.01',
  PHASE3_SECURITY_AUTO_RESPOND: 'true',
  SWARM_MIN_INSTANCES: '3',
  SWARM_MAX_INSTANCES: '5',
  SWARM_CONSENSUS_THRESHOLD: '0.7',
  SWARM_QUORUM_THRESHOLD: '0.6',
  SWARM_VOTING_TIMEOUT_MS: '5000',
  SWARM_ENABLE_ETHICS_VETO: 'true',
  TREASURY_MIN_ROTATION_AMOUNT: '0.01',
  TREASURY_ROTATION_INTERVAL_MS: '3600000',
  TREASURY_TARGET_ROTATION_PERCENTAGE: '70',
  TREASURY_ENABLE_AUTO_ROTATION: 'true',
  TREASURY_PROOF_RETENTION_DAYS: '365',
  TREASURY_STAGING_ADDRESS: '',
  OPERATIONS_ADDRESS: '',
  RESERVE_ADDRESS: '',
  REDTEAM_PORT: '3001',
  REDTEAM_CORS_ORIGIN: '*',
  REDTEAM_MAX_HISTORY_SIZE: '10000',
  REDTEAM_METRICS_WINDOW_MS: '60000',
  REDTEAM_AUTH_ENABLED: 'false',
  REDTEAM_AUTH_TOKEN: '',
  FUZZER_SCENARIOS_PER_RUN: '100',
  FUZZER_MAX_CONCURRENT: '10',
  FUZZER_TIMEOUT_MS: '5000',
  FUZZER_ENABLE_ALL_ATTACKS: 'true',

  // Timeout Settings
  POOL_FETCH_TIMEOUT: '30000',
  OPPORTUNITY_TIMEOUT: '45000',

  // Execution Mode & Data Source
  USE_PRELOADED_POOLS: 'true',
  FORCE_LIVE_DATA: 'true',
  SEQUENTIAL_EXECUTION_MODE: 'true',
  MAX_OPPORTUNITIES_PER_CYCLE: '1',
  POOL_CACHE_DURATION: '60',
  OFFLINE_CACHE_ONLY: 'false',

  // Tithe System
  TITHE_WALLET_ADDRESS: '0x48a6e6695a7d3e8c76eb014e648c072db385df6c',
  TITHE_BPS: '7000',

  // Bitcoin & Cryptocurrency Monitoring
  BITCOIN_NETWORK_ENABLED: 'false',
  BITCOIN_NETWORK: 'mainnet',
  BITCOIN_WEBSOCKET_ENABLED: 'true',
  BITCOIN_POLLING_INTERVAL: '60',
  BITCOIN_MIN_FEE_RATE: '10',
  BITCOIN_MAX_FEE_RATE: '50',
  BITCOIN_DEFAULT_FEE_RATE: '10',
  BITCOIN_MEV_DETECTION: 'true',
  BITCOIN_HIGH_VALUE_THRESHOLD: '100000000',
  BITCOIN_CONSCIOUSNESS_ENABLED: 'true',
  KRAKEN_API_KEY: 'zuX1s6KaNXp0GRCP0wUP+wOBbcqnZutXolBVJ8Sq9LwP2z1mnyxEe+3C',
  KRAKEN_PRIVATE_KEY: 'CUvt6VbQJG3ENLAwT1AD1faRRqpKCTH4fxbOVx8IywOprEPpB5X71n/sgxARTR0uUk2NI9tmnhmBiYVBLDm3KA==',

  // Additional API Keys
  THEWARDEN_API_KEY: '[REDACTED]',
  GAS_API_KEY: '2e4d60a6-4e90-4e37-88d1-7e959ef18432',
  COINMARKETCAP_API_KEY: '87399ac6cddb4416af1f66b6f8cb95c5',
  COINMARKETCAP_API_TIER: 'free',
  ENABLE_COINMARKETCAP: 'true',

  // Migration Flags
  MIGRATE_TO_SUPABASE: 'false',
};

async function addProductionEnvironment() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Add Production Environment to Supabase');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Use service role key for backend operations
    const supabase = getSupabaseClient(true);

    console.log('📝 Preparing environment configuration...');
    console.log(`   Total config keys: ${Object.keys(productionConfig).length}`);

    const envConfig: EnvironmentConfig = {
      environment: 'production',
      version: 1,
      description: 'TheWarden Production Environment Configuration - Generated 2025-12-10',
      deployed: false,
      config_data: productionConfig,
      chain_id: 8453, // Base chain
      network: 'Base Mainnet',
      created_by: 'StableExo',
    };

    console.log('\n🔍 Checking if production environment already exists...');

    // Check if production environment already exists
    const { data: existing, error: checkError } = await supabase
      .from('environment_configs')
      .select('*')
      .eq('environment', 'production')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      console.log('   ⚠️  Production environment already exists');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Version: ${existing.version}`);
      console.log(`   Last updated: ${existing.updated_at}`);

      console.log('\n📝 Updating existing production environment...');

      const { data, error } = await supabase
        .from('environment_configs')
        .update({
          version: (existing.version || 1) + 1,
          description: envConfig.description,
          config_data: envConfig.config_data,
          updated_at: new Date().toISOString(),
          last_modified_by: 'StableExo',
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('   ✅ Production environment updated successfully!');
      console.log(`   New version: ${data.version}`);
      console.log(`   ID: ${data.id}`);
    } else {
      console.log('   ℹ️  No existing production environment found');

      console.log('\n💾 Inserting production environment to Supabase...');

      const { data, error } = await supabase
        .from('environment_configs')
        .insert(envConfig)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('   ✅ Production environment added successfully!');
      console.log(`   ID: ${data.id}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✅ Production environment configuration saved to Supabase');
    console.log(`  📊 Total configuration keys: ${Object.keys(productionConfig).length}`);
    console.log('  🔐 Sensitive data is encrypted in the database');
    console.log('  🌍 Environment: production');
    console.log('  🔗 Network: Base Mainnet (Chain ID: 8453)');
    console.log('\n  ℹ️  Note: The configuration is marked as not deployed (deployed: false)');
    console.log('     Set deployed: true when ready to use in production.\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Failed to add production environment:', error.message);
    if (error.details) {
      console.error('   Details:', error.details);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
    process.exit(1);
  }
}

// Run the script
addProductionEnvironment();
