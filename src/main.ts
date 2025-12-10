/**
 * Main Runner for AEV (Autonomous Extracted Value) - TheWarden
 *
 * Production-ready entry point for TheWarden autonomous agent that:
 * - Implements AEV behavior: autonomous, MEV-aware, ethics-informed arbitrage
 * - Uses ArbitrageConsciousness as the cognitive decision-making layer
 * - Monitors flow, judges opportunities, executes strategically
 * - Continuously learns and adapts through outcome analysis
 *
 * TheWarden represents a new paradigm in value extraction:
 * - Not pure MEV profit maximization
 * - Agent-governed extraction with ethical constraints
 * - Risk-aware decision making via MEVSensorHub
 * - Strategic learning through ArbitrageConsciousness
 *
 * Based on PROJECT-HAVOC design patterns and AxionCitadel learnings
 */

// Load environment variables from .env file
import 'dotenv/config';

import { JsonRpcProvider, Wallet, Contract, formatEther, formatUnits, parseEther } from 'ethers';
// ethers namespace reserved for utilities
import type { ethers as _ethers } from 'ethers';
import { EventEmitter } from 'events';
import { logger } from './utils/logger';
import { validateAndLogConfig } from './utils/configValidator';
import {
  initializeComponents,
  shutdownComponents,
  InitializedComponents,
} from './core/initializer';
import { HealthCheckServer } from './monitoring/healthCheck';
import { DEXRegistry } from './dex/core/DEXRegistry';
import { DEXConfig } from './dex/types';
import { AdvancedOrchestrator } from './arbitrage/AdvancedOrchestrator';
import { IntegratedArbitrageOrchestrator } from './execution/IntegratedArbitrageOrchestrator';
import { ArbitrageOrchestrator } from './arbitrage/ArbitrageOrchestrator';
import { GasPriceOracle } from './gas/GasPriceOracle';
import { AdvancedGasEstimator } from './gas/AdvancedGasEstimator';
import { SystemHealthMonitor } from './monitoring/SystemHealthMonitor';
import { HealthStatus } from './types/ExecutionTypes';
import {
  defaultAdvancedArbitrageConfig,
  getConfigByName,
} from './config/advanced-arbitrage.config';
import { ArbitrageConfig } from './types/definitions';
import { SensoryMemory } from './consciousness/sensory_memory';
import { TemporalAwarenessFramework } from './consciousness/temporal_awareness';
import { PerceptionStream } from './services/PerceptionStream';
import { DashboardServer } from './dashboard/DashboardServer';
import { GasAnalytics } from './gas/GasAnalytics';
import { CrossChainAnalytics } from './chains/CrossChainAnalytics';
import { DashboardConfig } from './dashboard/types';
import { getScanTokens, getTokensByChainId, getNetworkName } from './utils/chainTokens';
// formatTokenList reserved for token display features
import { formatTokenList as _formatTokenList } from './utils/chainTokens';
import { ArbitrageConsciousness } from './consciousness/ArbitrageConsciousness';
import {
  CognitiveCoordinator,
  OpportunityContext,
  ModuleInsight,
} from './consciousness/coordination/CognitiveCoordinator';
import { EmergenceDetector, DecisionContext } from './consciousness/coordination/EmergenceDetector';
import { ArbitragePath } from './arbitrage/types';
import { PoolDataStore } from './arbitrage/PoolDataStore';
import { Metacognition } from '../consciousness/metacognition';

// Type-safe event definitions for TheWarden
interface TheWardenEvents {
  'scan:start': (data: { chainId: number; cycle: number }) => void;
  'scan:complete': (data: { chainId: number; cycle: number; opportunitiesFound: number }) => void;
  'scan:no-opportunities': (data: { chainId: number; cycle: number }) => void;
  'opportunities:found': (data: { opportunities: any[] }) => void;
  'consciousness:activate': (data: any) => void;
  'scan_error': (error: Error) => void;
  'started': () => void;
  'shutdown': () => void;
}

// Phase 3 Imports
import {
  loadPhase3Config,
  validatePhase3Config,
  getPhase3ConfigSummary,
} from './config/phase3.config';
import {
  initializePhase3Components,
  shutdownPhase3Components,
  Phase3Components,
  getPhase3Status,
} from './core/Phase3Initializer';
import { extractOpportunityFeatures } from './ai/featureExtraction';
// featuresToArray reserved for ML features
import { featuresToArray as _featuresToArray } from './ai/featureExtraction';

// Bootstrap module (refactored initialization)
import { WardenBootstrap } from './core/bootstrap';

// Long-running process manager
import { LongRunningManager } from './monitoring/LongRunningManager';

// Profitable Infrastructure (CEX-DEX Arbitrage + bloXroute)
import {
  loadProfitableInfrastructureConfig,
  validateProfitableInfrastructureConfig,
  getExpectedMonthlyRevenue,
  getInfrastructureCosts,
} from './config/profitable-infrastructure.config';
// Lazy imports to avoid circular dependencies - loaded dynamically when needed
// import { CEXLiquidityMonitor } from './execution/cex/CEXLiquidityMonitor';
// import { CEXDEXArbitrageDetector } from './execution/cex/CEXDEXArbitrageDetector';
// import { BloXrouteMempoolStream } from './execution/relays/BloXrouteMempoolStream';

// Flag to use new initializer pattern (can be toggled via env var)
const USE_NEW_INITIALIZER = process.env.USE_NEW_INITIALIZER === 'true';

// Flag to use the new bootstrap pattern
const USE_BOOTSTRAP = process.env.USE_BOOTSTRAP === 'true';

// Default gas price in gwei for offline mode calculations
const DEFAULT_GAS_PRICE_GWEI = 50;

/**
 * TheWarden Configuration Interface
 */
interface WardenConfig {
  // Network configuration
  rpcUrl: string;
  chainId: number;
  walletPrivateKey: string;

  // Multi-chain configuration
  scanChains?: number[]; // Array of chain IDs to scan

  // Contract addresses
  executorAddress?: string;
  titheRecipient?: string;

  // Performance settings
  scanInterval: number;
  concurrency: number;

  // Profitability thresholds
  minProfitThreshold: number;
  minProfitPercent: number;

  // Gas settings
  maxGasPrice: bigint;
  maxGasCostPercentage: number;

  // Feature flags
  enableMlPredictions: boolean;
  enableCrossChain: boolean;
  dryRun: boolean;

  // Monitoring
  healthCheckInterval: number;

  // Sequential execution mode - process one opportunity at a time
  sequentialExecution?: boolean;
  maxOpportunitiesPerCycle?: number;
}

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): WardenConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  logger.info(`Loading configuration for environment: ${nodeEnv}`);

  // Determine chain ID first to select appropriate RPC URL
  const chainId = parseInt(process.env.CHAIN_ID || '8453'); // Default to Base (8453) instead of Ethereum (1)

  // Select appropriate RPC URL based on chain ID
  let rpcUrl: string | undefined;
  if (chainId === 8453 || chainId === 84532) {
    // Base mainnet or testnet
    rpcUrl = process.env.BASE_RPC_URL;
  } else if (chainId === 1 || chainId === 5 || chainId === 11155111) {
    // Ethereum mainnet, Goerli, or Sepolia
    rpcUrl = process.env.ETHEREUM_RPC_URL;
  } else if (chainId === 137 || chainId === 80001) {
    // Polygon mainnet or Mumbai
    rpcUrl = process.env.POLYGON_RPC_URL;
  } else if (chainId === 42161 || chainId === 421613) {
    // Arbitrum mainnet or testnet
    rpcUrl = process.env.ARBITRUM_RPC_URL;
  } else if (chainId === 10 || chainId === 420) {
    // Optimism mainnet or testnet
    rpcUrl = process.env.OPTIMISM_RPC_URL;
  }

  // Fall back to generic RPC_URL or any available RPC URL
  if (!rpcUrl) {
    rpcUrl = process.env.RPC_URL || process.env.BASE_RPC_URL || process.env.ETHEREUM_RPC_URL;
  }

  if (!rpcUrl) {
    throw new Error(
      `RPC URL is required for chain ID ${chainId}. Please set BASE_RPC_URL, ETHEREUM_RPC_URL, or RPC_URL`
    );
  }

  const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
  if (!walletPrivateKey) {
    throw new Error('WALLET_PRIVATE_KEY is required');
  }

  // Optional configuration with defaults
  const config: WardenConfig = {
    rpcUrl,
    chainId,
    walletPrivateKey,

    // Multi-chain scanning configuration
    // Parse SCAN_CHAINS env var (comma-separated chain IDs) or default to primary chain
    scanChains: process.env.SCAN_CHAINS
      ? process.env.SCAN_CHAINS.split(',')
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id) && id > 0)
      : [chainId],

    executorAddress: process.env.FLASHSWAP_V2_ADDRESS,
    titheRecipient: process.env.FLASHSWAP_V2_OWNER || process.env.MULTI_SIG_ADDRESS,

    scanInterval: parseInt(process.env.SCAN_INTERVAL || '1000'),
    concurrency: parseInt(process.env.CONCURRENCY || '10'),

    minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.01'),
    minProfitPercent: parseFloat(process.env.MIN_PROFIT_PERCENT || '0.5'),

    maxGasPrice: BigInt(process.env.MAX_GAS_PRICE || '100') * BigInt(1e9), // Convert from gwei
    maxGasCostPercentage: parseInt(process.env.MAX_GAS_COST_PERCENTAGE || '40'),

    enableMlPredictions: process.env.ENABLE_ML_PREDICTIONS
      ? process.env.ENABLE_ML_PREDICTIONS === 'true'
      : false,
    enableCrossChain: process.env.ENABLE_CROSS_CHAIN
      ? process.env.ENABLE_CROSS_CHAIN === 'true'
      : false,
    dryRun: process.env.DRY_RUN === 'true' || nodeEnv === 'development',

    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),

    // Sequential execution mode - process one opportunity at a time
    sequentialExecution: process.env.SEQUENTIAL_EXECUTION === 'true',
    // Max opportunities to evaluate per cycle in sequential mode
    maxOpportunitiesPerCycle: parseInt(process.env.MAX_OPPORTUNITIES_PER_CYCLE || '1'),
  };

  logger.info('Configuration loaded successfully');
  logger.info(`- Chain ID: ${config.chainId}`);
  logger.info(`- RPC URL: ${config.rpcUrl.substring(0, 30)}...`);
  logger.info(`- Scan Chains: ${config.scanChains?.join(', ') || config.chainId}`);
  logger.info(`- Scan Interval: ${config.scanInterval}ms`);
  logger.info(`- Min Profit: ${config.minProfitPercent}%`);
  logger.info(`- Dry Run Mode: ${config.dryRun}`);
  if (config.sequentialExecution) {
    logger.info(
      `- Sequential Execution: ENABLED (max ${config.maxOpportunitiesPerCycle} per cycle)`
    );
  }

  return config;
}

/**
 * Get RPC URL for a specific chain ID
 * @param chainId - The blockchain network chain ID
 * @returns The RPC URL for the chain, or undefined if not configured
 */
// Reserved for multi-chain RPC configuration
function _getRpcUrlForChain(chainId: number): string | undefined {
  switch (chainId) {
    case 8453: // Base mainnet
    case 84532: // Base testnet
      return process.env.BASE_RPC_URL;
    case 1: // Ethereum mainnet
    case 5: // Goerli
    case 11155111: // Sepolia
      return process.env.ETHEREUM_RPC_URL || process.env.MAINNET_RPC_URL;
    case 137: // Polygon mainnet
    case 80001: // Mumbai testnet
      return process.env.POLYGON_RPC_URL;
    case 42161: // Arbitrum mainnet
    case 421613: // Arbitrum testnet
      return process.env.ARBITRUM_RPC_URL;
    case 10: // Optimism mainnet
    case 420: // Optimism testnet
      return process.env.OPTIMISM_RPC_URL;
    default:
      // Log warning for unknown chains falling back to default
      if (process.env.RPC_URL) {
        logger.warn(`Unknown chain ID ${chainId}, using default RPC_URL`);
      }
      return process.env.RPC_URL;
  }
}

/**
 * TheWarden - Main Autonomous Agent Class
 *
 * Implements AEV (Autonomous Extracted Value) behavior:
 * - Continuous scan → evaluate → judge → execute → learn cycle
 * - Uses ArbitrageConsciousness as the cognitive/learning layer
 * - MEV-aware through MEVSensorHub integration
 * - Ethics-informed decision making
 * - Adaptive strategy evolution
 */
class TheWarden extends EventEmitter {
  private config: WardenConfig;
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private dexRegistry: DEXRegistry;
  private advancedOrchestrator?: AdvancedOrchestrator;
  private integratedOrchestrator?: IntegratedArbitrageOrchestrator;
  private healthMonitor: SystemHealthMonitor;
  private scanInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private shuttingDown: boolean = false;

  // Consciousness components
  private consciousness?: ArbitrageConsciousness;
  private cognitiveCoordinator?: CognitiveCoordinator;
  private emergenceDetector?: EmergenceDetector;
  private metacognition: Metacognition;

  // Phase 3 components
  private phase3Components?: Phase3Components;

  // Profitable Infrastructure components (CEX-DEX + bloXroute)
  private cexMonitor?: any; // CEXLiquidityMonitor - imported dynamically to avoid circular deps
  private cexDexDetector?: any; // CEXDEXArbitrageDetector
  private bloxrouteStream?: any; // BloXrouteMempoolStream

  // Long-running process manager
  private longRunningManager?: LongRunningManager;

  // Statistics
  private stats = {
    startTime: Date.now(),
    cyclesCompleted: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    totalProfit: BigInt(0),
    errors: 0,
  };

  constructor(config: WardenConfig) {
    super();
    this.config = config;

    // Initialize provider
    this.provider = new JsonRpcProvider(config.rpcUrl);

    // Initialize wallet
    this.wallet = new Wallet(config.walletPrivateKey, this.provider);

    // Initialize DEX registry
    this.dexRegistry = new DEXRegistry();

    // Initialize health monitor
    this.healthMonitor = new SystemHealthMonitor({
      interval: config.healthCheckInterval,
    });

    this.metacognition = new Metacognition();

    logger.info('TheWarden initialized - AEV mode active');
  }

  /**
   * Initialize all core components
   */
  async initialize(): Promise<void> {
    logger.info('Initializing arbitrage bot components...');

    // Check if running in offline cache only mode
    const offlineCacheOnly = process.env.OFFLINE_CACHE_ONLY === 'true';

    try {
      if (offlineCacheOnly) {
        logger.info('═══════════════════════════════════════════════════════════');
        logger.info('  OFFLINE CACHE ONLY MODE - No RPC calls will be made');
        logger.info('═══════════════════════════════════════════════════════════');
        logger.info(`Configured chain ID: ${this.config.chainId}`);
        logger.info(`Wallet address: ${this.wallet.address}`);
        logger.info('Network connection and balance checks skipped in offline mode');
      } else {
        // Verify network connection
        const network = await this.provider.getNetwork();
        logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`);

        // Validate that the connected network matches the configured chain ID
        if (Number(network.chainId) !== this.config.chainId) {
          const errorMsg = `Chain ID mismatch! Configured: ${this.config.chainId}, Connected: ${network.chainId}. Please check your RPC_URL configuration.`;
          logger.error(errorMsg);
          throw new Error(errorMsg);
        }

        // Verify wallet
        const balance = await this.provider.getBalance(this.wallet.address);
        logger.info(`Wallet address: ${this.wallet.address}`);
        logger.info(`Wallet balance: ${formatEther(balance)} ETH`);

        // Check token balances for common tokens based on chain
        await this.checkTokenBalances();

        if (balance === 0n) {
          logger.warn('WARNING: Wallet balance is 0 - bot will not be able to execute trades');
        }
      }

      // Initialize gas components
      logger.info('Initializing gas oracle and estimator...');
      const gasOracle = new GasPriceOracle(
        this.config.rpcUrl,
        process.env.ETHERSCAN_API_KEY,
        60000, // 1 minute update interval
        BigInt(50) * BigInt(1e9) // 50 gwei fallback
      );
      if (!offlineCacheOnly) {
        gasOracle.startAutoRefresh();
      }

      // Configure gas estimator with environment-based thresholds
      const minProfitAfterGasEnv = process.env.MIN_PROFIT_AFTER_GAS;
      const minProfitAfterGas = minProfitAfterGasEnv
        ? BigInt(Math.floor(parseFloat(minProfitAfterGasEnv) * 1e18))
        : BigInt(1e15); // Default 0.001 ETH (more realistic for L2)

      const gasEstimator = new AdvancedGasEstimator(this.provider, gasOracle, {
        minProfitAfterGas,
        maxGasCostPercentage: 80, // Gas can be up to 80% of profit
      });

      // Initialize arbitrage configuration
      const arbitrageConfig: ArbitrageConfig = {
        SLIPPAGE_TOLERANCE_BPS: Math.floor(this.config.minProfitPercent * 100),
      };

      // Initialize pool data store (cache duration in minutes from env)
      const cacheDurationEnv = process.env.POOL_CACHE_DURATION;
      const cacheDuration =
        cacheDurationEnv && !isNaN(parseInt(cacheDurationEnv))
          ? parseInt(cacheDurationEnv) * 60 * 1000
          : 3600000; // 1 hour default
      const poolDataStore = new PoolDataStore({ cacheDuration });

      // Initialize advanced orchestrator for opportunity finding
      logger.info('Initializing arbitrage orchestrator...');
      const advancedConfig = getConfigByName('default') || defaultAdvancedArbitrageConfig;

      this.advancedOrchestrator = new AdvancedOrchestrator(
        this.dexRegistry,
        advancedConfig,
        this.config.chainId, // Pass chain ID during construction
        poolDataStore // Pass pool data store
      );

      // Load preloaded pool data if available
      logger.info('Loading preloaded pool data...');
      const preloadSuccess = await this.advancedOrchestrator.loadPreloadedData(this.config.chainId);
      if (preloadSuccess) {
        logger.info('✓ Preloaded pool data loaded successfully - fast startup enabled');
      } else {
        if (offlineCacheOnly) {
          logger.warn(
            'WARNING: No preloaded pool data found in offline mode. Run "npm run preload:pools" first.'
          );
        } else {
          logger.info(
            'No preloaded pool data found - will fetch pools from network (slower startup)'
          );
          logger.info('Tip: Run "npm run preload:pools" to speed up future startups');
        }
      }

      logger.info(`Configured orchestrator for chain ${this.config.chainId}`);

      // If not in dry run mode, also initialize integrated orchestrator for execution
      if (!this.config.dryRun) {
        const pathfindingConfig = {
          maxHops: advancedConfig.pathfinding.maxHops,
          minProfitThreshold: advancedConfig.pathfinding.minProfitThreshold,
          maxSlippage: advancedConfig.pathfinding.maxSlippage,
          gasPrice: advancedConfig.pathfinding.gasPrice,
        };

        const baseOrchestrator = new ArbitrageOrchestrator(
          this.dexRegistry,
          pathfindingConfig,
          advancedConfig.pathfinding.gasPrice
        );

        const executorAddress = this.config.executorAddress || this.wallet.address;
        const titheRecipient = this.config.titheRecipient || this.wallet.address;

        logger.info(`Executor address: ${executorAddress}`);
        logger.info(`Tithe recipient: ${titheRecipient}`);

        // Configure orchestrator with realistic thresholds for L2
        const orchestratorConfig = {
          minProfitAfterGas: minProfitAfterGas, // Use same threshold as gas estimator
          maxGasPrice: BigInt(100) * BigInt(10 ** 9), // 100 gwei max
        };

        this.integratedOrchestrator = new IntegratedArbitrageOrchestrator(
          baseOrchestrator,
          this.provider,
          gasOracle,
          gasEstimator,
          executorAddress,
          titheRecipient,
          arbitrageConfig,
          orchestratorConfig
        );

        // Start the integrated orchestrator
        await this.integratedOrchestrator.start(this.wallet);
      }

      // Initialize consciousness coordination system
      logger.info('Initializing consciousness coordination system...');
      this.consciousness = new ArbitrageConsciousness(0.05, 1000);

      // Get all modules from consciousness using proper method
      const modules = this.consciousness.getModules();

      this.cognitiveCoordinator = new CognitiveCoordinator(modules);

      // Check for Learning Mode - allows cold-start execution with extra safeguards
      const learningModeEnabled = process.env.LEARNING_MODE === 'true';

      // Initialize EmergenceDetector with thresholds from environment
      // In Learning Mode, we lower cold-start thresholds to allow initial learning
      const emergenceThresholds = {
        minModules: parseInt(process.env.EMERGENCE_MIN_MODULES || '14'),
        maxRiskScore: parseFloat(process.env.EMERGENCE_MAX_RISK_SCORE || '0.30'),
        minEthicalScore: parseFloat(process.env.EMERGENCE_MIN_ETHICAL_SCORE || '0.70'),
        // Learning Mode: Lower goal alignment threshold to allow cold-start learning
        minGoalAlignment: learningModeEnabled
          ? parseFloat(process.env.EMERGENCE_MIN_GOAL_ALIGNMENT || '0.0')
          : parseFloat(process.env.EMERGENCE_MIN_GOAL_ALIGNMENT || '0.75'),
        minPatternConfidence: parseFloat(process.env.EMERGENCE_MIN_PATTERN_CONFIDENCE || '0.40'),
        // Learning Mode: Lower historical success threshold to allow cold-start learning
        minHistoricalSuccess: learningModeEnabled
          ? parseFloat(process.env.EMERGENCE_MIN_HISTORICAL_SUCCESS || '0.0')
          : parseFloat(process.env.EMERGENCE_MIN_HISTORICAL_SUCCESS || '0.60'),
        maxDissentRatio: parseFloat(process.env.EMERGENCE_MAX_DISSENT_RATIO || '0.15'),
      };
      this.emergenceDetector = new EmergenceDetector(emergenceThresholds);

      if (learningModeEnabled) {
        logger.info('═══════════════════════════════════════════════════════════');
        logger.info('🧒 LEARNING MODE ENABLED - Consciousness is in infancy phase');
        logger.info('═══════════════════════════════════════════════════════════');
        logger.info('  Cold-start thresholds lowered to allow initial learning.');
        logger.info('  All other safety gates remain active (ethics, risk, consensus).');
        logger.info('  The consciousness will learn from real executions.');
        logger.info('═══════════════════════════════════════════════════════════');
      }

      logger.info(`Emergence thresholds configured:`);
      logger.info(
        `  minModules=${emergenceThresholds.minModules}, maxRiskScore=${emergenceThresholds.maxRiskScore}, minEthicalScore=${emergenceThresholds.minEthicalScore}`
      );
      logger.info(
        `  minGoalAlignment=${emergenceThresholds.minGoalAlignment}, minPatternConfidence=${emergenceThresholds.minPatternConfidence}, minHistoricalSuccess=${emergenceThresholds.minHistoricalSuccess}`
      );
      logger.info(`  maxDissentRatio=${emergenceThresholds.maxDissentRatio}`);

      logger.info('Consciousness coordination initialized - 14 cognitive modules ready');

      // Initialize Phase 3 components
      logger.info('═══════════════════════════════════════════════════════════');
      logger.info('🚀 INITIALIZING PHASE 3: Advanced AI & AEV Evolution 🚀');
      logger.info('═══════════════════════════════════════════════════════════');

      const phase3Config = loadPhase3Config();

      // Validate Phase 3 configuration
      const validation = validatePhase3Config(phase3Config);
      if (!validation.valid) {
        logger.warn('Phase 3 configuration validation warnings:');
        validation.errors.forEach((err) => logger.warn(`  - ${err}`));
      }

      // Log Phase 3 configuration summary
      logger.info(getPhase3ConfigSummary(phase3Config));

      // Initialize Phase 3 components with base strategy from orchestrator config
      this.phase3Components = await initializePhase3Components(phase3Config, arbitrageConfig);

      logger.info('═══════════════════════════════════════════════════════════');
      logger.info('✓ Phase 3 initialization complete');
      logger.info('═══════════════════════════════════════════════════════════');

      // Initialize Profitable Infrastructure (CEX-DEX + bloXroute)
      logger.info('═══════════════════════════════════════════════════════════');
      logger.info('💰 INITIALIZING PROFITABLE INFRASTRUCTURE 💰');
      logger.info('═══════════════════════════════════════════════════════════');

      const profitableInfraConfig = loadProfitableInfrastructureConfig();
      const infraValidation = validateProfitableInfrastructureConfig(profitableInfraConfig);

      if (!infraValidation.valid) {
        logger.error('Profitable infrastructure configuration errors:');
        infraValidation.errors.forEach((err) => logger.error(`  ❌ ${err}`));
        throw new Error('Invalid profitable infrastructure configuration');
      }

      if (infraValidation.warnings.length > 0) {
        logger.warn('Profitable infrastructure configuration warnings:');
        infraValidation.warnings.forEach((warn) => logger.warn(`  ⚠️  ${warn}`));
      }

      // Display revenue projections
      const revenue = getExpectedMonthlyRevenue(profitableInfraConfig);
      const costs = getInfrastructureCosts(profitableInfraConfig);

      logger.info('💰 Revenue Projections:');
      logger.info(`  CEX-DEX Arbitrage: $${revenue.cexMin.toLocaleString()} - $${revenue.cexMax.toLocaleString()}/month`);
      logger.info(`  bloXroute Advantage: $${revenue.bloxrouteMin.toLocaleString()} - $${revenue.bloxrouteMax.toLocaleString()}/month`);
      logger.info(`  Total Potential: $${revenue.totalMin.toLocaleString()} - $${revenue.totalMax.toLocaleString()}/month`);
      logger.info('');
      logger.info('💸 Infrastructure Costs:');
      logger.info(`  CEX Monitoring: $${costs.cex.toLocaleString()}/month (FREE - WebSocket APIs)`);
      logger.info(`  bloXroute: $${costs.bloxroute.toLocaleString()}/month (FREE tier for now)`);
      logger.info(`  Total Cost: $${costs.total.toLocaleString()}/month`);
      logger.info(`  Net Revenue: $${(revenue.totalMin - costs.total).toLocaleString()} - $${(revenue.totalMax - costs.total).toLocaleString()}/month`);
      logger.info('  ROI: ∞ (zero cost infrastructure!) 🚀');

      // Initialize CEX-DEX Arbitrage if enabled
      if (profitableInfraConfig.cex.enabled) {
        logger.info('');
        logger.info('📊 Initializing CEX-DEX Arbitrage...');

        try {
          // Dynamic import to avoid circular dependencies
          const { CEXLiquidityMonitor } = await import('./execution/cex/CEXLiquidityMonitor.js');
          const { CEXDEXArbitrageDetector } = await import('./execution/cex/CEXDEXArbitrageDetector.js');

          // Create CEX monitor
          this.cexMonitor = new CEXLiquidityMonitor({
            exchanges: profitableInfraConfig.cex.exchanges,
            updateInterval: profitableInfraConfig.cex.updateInterval,
            minSpreadBps: profitableInfraConfig.cex.minSpreadBps,
          });

          // Create CEX-DEX detector
          this.cexDexDetector = new CEXDEXArbitrageDetector(
            {
              minPriceDiffPercent: profitableInfraConfig.cex.minPriceDiffPercent,
              maxTradeSizeUsd: profitableInfraConfig.cex.maxTradeSizeUsd,
              minNetProfitUsd: profitableInfraConfig.cex.minNetProfitUsd,
            },
            {
              onOpportunityFound: (opportunity) => {
                logger.info(`💰 CEX-DEX Arbitrage Opportunity Found!`);
                logger.info(`  Symbol: ${opportunity.symbol}`);
                logger.info(`  Direction: ${opportunity.direction}`);
                logger.info(`  Net Profit: $${opportunity.netProfit.toFixed(2)}`);
                logger.info(`  Spread: ${opportunity.spreadPercent.toFixed(3)}%`);
                // TODO: Forward to execution pipeline
              },
            }
          );

          // Wire detector to monitor
          this.cexDexDetector.setCEXMonitor(this.cexMonitor);

          // Wire to integrated orchestrator if available
          if (this.integratedOrchestrator) {
            this.integratedOrchestrator.enableCEXDEXArbitrage(
              this.cexMonitor,
              this.cexDexDetector
            );
            logger.info('  ✓ CEX-DEX wired to IntegratedArbitrageOrchestrator');
          }

          // Start CEX monitoring
          await this.cexMonitor.start();

          logger.info(`  ✓ CEX Monitoring active: ${profitableInfraConfig.cex.exchanges.length} exchanges`);
          profitableInfraConfig.cex.exchanges.forEach((ex) => {
            logger.info(`    - ${ex.exchange.toUpperCase()}: ${ex.symbols.join(', ')}`);
          });
        } catch (error) {
          logger.error(`Failed to initialize CEX-DEX arbitrage: ${error}`);
          logger.warn('Continuing without CEX-DEX arbitrage...');
        }
      } else {
        logger.info('📊 CEX-DEX Arbitrage: Disabled');
      }

      // Initialize bloXroute if enabled
      if (profitableInfraConfig.bloxroute.enabled && profitableInfraConfig.bloxroute.enableMempoolStream) {
        logger.info('');
        logger.info('⚡ Initializing bloXroute Mempool Streaming...');

        try {
          // Dynamic import to avoid circular dependencies
          const { BloXrouteMempoolStream } = await import('./execution/relays/BloXrouteMempoolStream.js');
          const { BloXrouteClient } = await import('./execution/relays/BloXrouteClient.js');

          if (!profitableInfraConfig.bloxroute.apiKey && !profitableInfraConfig.bloxroute.authHeader) {
            logger.warn('  ⚠️  No bloXroute API key configured - using free tier limitations');
          }

          // Create bloXroute client
          const bloxrouteClient = new BloXrouteClient({
            authHeader: profitableInfraConfig.bloxroute.authHeader,
            chains: profitableInfraConfig.bloxroute.chains,
            region: profitableInfraConfig.bloxroute.region,
          });

          // Create mempool stream
          this.bloxrouteStream = new BloXrouteMempoolStream(bloxrouteClient, {
            streamType: profitableInfraConfig.bloxroute.streamType,
            batchSize: profitableInfraConfig.bloxroute.batchSize,
            batchTimeout: profitableInfraConfig.bloxroute.batchTimeout,
            onTransaction: (tx) => {
              if (profitableInfraConfig.bloxroute.verbose) {
                logger.debug(`bloXroute tx: ${tx.hash}`);
              }
            },
            onDexSwap: (tx) => {
              logger.info(`⚡ DEX Swap detected: ${tx.hash} (${tx.methodId})`);
              // TODO: Forward to opportunity detector
            },
            onLargeTransfer: (tx, value) => {
              const ethValue = Number(value) / 1e18;
              logger.info(`🐋 Large transfer: ${ethValue.toFixed(2)} ETH (${tx.hash})`);
              // TODO: Track whale movements
            },
            onError: (error) => {
              logger.error(`bloXroute stream error: ${error.message}`);
            },
          });

          // Start mempool streaming
          await this.bloxrouteStream.start();

          logger.info(`  ✓ bloXroute streaming active: ${profitableInfraConfig.bloxroute.streamType}`);
          logger.info(`    Chains: ${profitableInfraConfig.bloxroute.chains.join(', ')}`);
          logger.info(`    Region: ${profitableInfraConfig.bloxroute.region}`);
          logger.info(`    DEX swap detection: ${profitableInfraConfig.bloxroute.enableDexSwapDetection ? 'ON' : 'OFF'}`);
          logger.info(`    Large transfer detection: ${profitableInfraConfig.bloxroute.enableLargeTransferDetection ? 'ON' : 'OFF'}`);
        } catch (error) {
          logger.error(`Failed to initialize bloXroute: ${error}`);
          logger.warn('Continuing without bloXroute mempool streaming...');
        }
      } else {
        logger.info('⚡ bloXroute Mempool Streaming: Disabled');
      }

      logger.info('═══════════════════════════════════════════════════════════');
      logger.info('✓ Profitable Infrastructure initialization complete');
      logger.info('═══════════════════════════════════════════════════════════');


      // Set up event listeners
      this.setupEventListeners();

      // Register components with health monitor
      logger.info('Registering components with health monitor...');
      this.healthMonitor.registerComponent({
        name: 'provider',
        checkHealth: async () => {
          try {
            await this.provider.getBlockNumber();
            return HealthStatus.HEALTHY;
          } catch (_error) {
            return HealthStatus.UNHEALTHY;
          }
        },
      });

      // Start health monitoring
      await this.healthMonitor.start();

      logger.info('All components initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize components: ${error}`);
      throw error;
    }
  }

  /**
   * Check and log token balances for common tokens
   */
  private async checkTokenBalances(): Promise<void> {
    try {
      // ERC20 ABI for balance checking
      const ERC20_ABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
      ];

      // Define tokens to check based on chain ID
      const tokens: { address: string; symbol: string; decimals: number }[] = [];

      if (this.config.chainId === 8453) {
        // Base mainnet
        tokens.push(
          { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
          { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18 }
        );
      } else if (this.config.chainId === 1) {
        // Ethereum mainnet
        tokens.push(
          { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
          { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 }
        );
      } else if (this.config.chainId === 137) {
        // Polygon
        tokens.push(
          { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6 },
          { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH', decimals: 18 }
        );
      }

      // Check each token balance
      for (const token of tokens) {
        try {
          const contract = new Contract(token.address, ERC20_ABI, this.provider);
          const balance = await contract.balanceOf(this.wallet.address);
          const formattedBalance = formatUnits(balance, token.decimals);
          logger.info(`${token.symbol} balance: ${formattedBalance}`);
        } catch (error) {
          logger.warn(
            `Could not fetch ${token.symbol} balance: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }
    } catch (error) {
      logger.warn(
        `Error checking token balances: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Analyze opportunities using consciousness coordination
   */
  private async analyzeWithConsciousness(
    paths: ArbitragePath[],
    _cycleNumber: number
  ): Promise<void> {
    if (!this.consciousness || !this.cognitiveCoordinator || !this.emergenceDetector) {
      logger.warn('Consciousness coordination not initialized, skipping analysis');
      return;
    }

    logger.info('[CognitiveCoordinator] Gathering insights from 14 cognitive modules...');

    // Get statistics from consciousness for informed decision making
    const stats = this.consciousness.getStatistics();
    const patterns = this.consciousness.getDetectedPatterns();

    // Analyze each opportunity (or at least the best ones)
    const topPaths = paths.slice(0, Math.min(3, paths.length));

    // Check if running in offline cache only mode
    const offlineCacheOnly = process.env.OFFLINE_CACHE_ONLY === 'true';

    for (let i = 0; i < topPaths.length; i++) {
      const path = topPaths[i];

      logger.info(
        `[OpportunityAnalysis] Analyzing opportunity ${i + 1}: ${formatEther(
          path.netProfit.toString()
        )} ETH profit`
      );

      // Calculate market metrics - use defaults in offline mode
      let blockNumber = 0;
      let gasPriceGwei = DEFAULT_GAS_PRICE_GWEI;

      if (!offlineCacheOnly) {
        blockNumber = await this.provider.getBlockNumber().catch(() => 0);
        const gasPrice = await this.provider
          .getFeeData()
          .then((f) => f.gasPrice || 0n)
          .catch(() => 0n);
        gasPriceGwei = Number(formatUnits(gasPrice, 'gwei'));
      }

      // Calculate congestion from gas price (0-1 scale, normalized against 100 gwei)
      const congestion = Math.min(gasPriceGwei / 100, 1.0);

      // Searcher density estimation based on network activity
      // Base has lower searcher density than Ethereum mainnet
      const searcherDensity = this.config.chainId === 8453 ? 0.3 : 0.5;

      // Build opportunity context with real data
      const context: OpportunityContext = {
        opportunity: {
          profit: Number(formatEther(path.netProfit.toString())),
          netProfit: path.netProfit,
          pools: path.hops.map((h) => h.poolAddress),
          path: path.hops.map((h) => `${h.tokenIn} -> ${h.tokenOut}`),
          hops: path.hops.length,
          totalGasCost: path.totalGasCost,
        },
        market: {
          timestamp: Date.now(),
          congestion,
          searcherDensity,
          gasPrice: gasPriceGwei,
          blockNumber,
        },
        historical: {
          recentExecutions: stats.totalExecutions,
          successRate: stats.successRate,
          averageProfit: stats.averageProfit,
          patternsDetected: patterns.length,
        },
        timestamp: Date.now(),
      };

      try {
        // Gather insights from all modules
        const insights: ModuleInsight[] = await this.cognitiveCoordinator.gatherInsights(context);
        logger.info(`[CognitiveCoordinator] Gathered ${insights.length} module insights`);

        // Detect consensus
        const consensus = this.cognitiveCoordinator.detectConsensus(insights);
        logger.info(
          `[CognitiveCoordinator] Consensus: ${consensus.consensusType} (${(
            consensus.agreementLevel * 100
          ).toFixed(1)}% agreement)`
        );
        logger.info(`[CognitiveCoordinator] Supporting: ${consensus.supportingModules.join(', ')}`);

        if (consensus.opposingModules.length > 0) {
          logger.info(`[CognitiveCoordinator] Opposing: ${consensus.opposingModules.join(', ')}`);
        }

        // Calculate risk score from opportunity characteristics
        const complexityRisk = Math.min(path.hops.length / 5, 1.0); // More hops = more risk
        const gasCostRisk =
          Number(formatEther(path.totalGasCost.toString())) /
          Number(formatEther(path.netProfit.toString()));
        const congestionRisk = congestion;
        const riskScore = complexityRisk * 0.3 + gasCostRisk * 0.4 + congestionRisk * 0.3;

        // Ethical review of opportunity
        const ethicalReview = this.consciousness.ethicalReview({
          profit: context.opportunity.profit,
          mevRisk: riskScore,
          hops: path.hops.length,
        });
        const ethicalScore = ethicalReview.approved ? 0.85 : 0.3;

        // Calculate goal alignment from autonomous goals
        const modules = this.consciousness.getModules();
        const goals = Array.from((modules.autonomousGoals as any).goals.values());
        const goalAlignment =
          goals.length > 0
            ? goals.reduce((sum: number, g: any) => sum + g.progress / 100, 0) / goals.length
            : 0.5;

        // Pattern confidence from detected patterns
        const patternConfidence =
          patterns.length > 0
            ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
            : 0.5;

        // Historical success rate
        const historicalSuccess = stats.successRate;

        // ═══════════════════════════════════════════════════════════
        // Phase 3: AI-Enhanced Opportunity Evaluation
        // ═══════════════════════════════════════════════════════════

        let aiScore: number | undefined;
        let aiRecommendation: 'execute' | 'skip' | 'uncertain' = 'uncertain';
        let aiReasoning: string = 'AI scoring not available';

        if (this.phase3Components?.nnScorer && this.phase3Components.aiEnabled) {
          try {
            // Extract features from opportunity for neural network
            const features = extractOpportunityFeatures(
              path,
              {
                congestion,
                mevRisk: riskScore,
                competitionLevel: searcherDensity,
                // Use actual volatility if available from market data
                // For now using moderate default until price history tracking is implemented
                volatility: 0.5,
              },
              {
                successRate: stats.successRate,
                avgProfit: stats.averageProfit,
              }
            );

            // Get AI scoring with details
            const scoringResult = await this.phase3Components.nnScorer.scoreWithDetails(features);
            aiScore = scoringResult.score;
            aiRecommendation = scoringResult.recommendation;
            aiReasoning = scoringResult.reasoning;

            logger.info(`[Phase3-AI] Neural Network Score: ${(aiScore * 100).toFixed(1)}%`);
            logger.info(`[Phase3-AI] Recommendation: ${aiRecommendation.toUpperCase()}`);
            logger.info(`[Phase3-AI] Reasoning: ${aiReasoning}`);

            // If AI confidently says to skip, respect that
            if (aiRecommendation === 'skip' && scoringResult.confidence > 0.8) {
              logger.warn(
                `[Phase3-AI] AI strongly recommends skipping this opportunity (confidence: ${(
                  scoringResult.confidence * 100
                ).toFixed(1)}%)`
              );
            }
          } catch (error) {
            logger.error(`[Phase3-AI] Error in AI scoring: ${error}`);
          }
        }

        // ═══════════════════════════════════════════════════════════
        // Phase 3: Reinforcement Learning Parameter Suggestion
        // ═══════════════════════════════════════════════════════════

        if (this.phase3Components?.rlAgent && this.phase3Components.aiEnabled) {
          try {
            // Get current strategy parameters
            const currentParams: any = {
              minProfitThreshold: this.config.minProfitThreshold,
              mevRiskSensitivity: 0.5, // TODO: Make configurable
              maxSlippage: 0.05,
              gasMultiplier: 1.1,
              executionTimeout: 60000,
              priorityFeeStrategy: 'moderate' as const,
            };

            // Get suggested parameter improvements from RL agent
            const suggestion = await this.phase3Components.rlAgent.suggestParameters(currentParams);

            if (suggestion.confidence > 0.7) {
              logger.info(
                `[Phase3-RL] Parameter suggestion (confidence: ${(
                  suggestion.confidence * 100
                ).toFixed(1)}%):`
              );
              if (suggestion.params.minProfitThreshold !== currentParams.minProfitThreshold) {
                logger.info(
                  `[Phase3-RL]   minProfitThreshold: ${currentParams.minProfitThreshold} → ${suggestion.params.minProfitThreshold}`
                );
              }
              if (suggestion.params.maxSlippage !== currentParams.maxSlippage) {
                logger.info(
                  `[Phase3-RL]   maxSlippage: ${(currentParams.maxSlippage * 100).toFixed(2)}% → ${(
                    suggestion.params.maxSlippage * 100
                  ).toFixed(2)}%`
                );
              }

              // Apply parameter updates when confidence is very high (>0.9)
              // This allows RL agent to autonomously optimize strategy
              if (suggestion.confidence > 0.9) {
                logger.info(
                  `[Phase3-RL] High confidence (${(suggestion.confidence * 100).toFixed(
                    1
                  )}%) - applying parameter updates`
                );
                // Note: Parameter application would happen here in production
                // For safety, requires explicit enablement via PHASE3_RL_AUTO_APPLY=true
                if (process.env.PHASE3_RL_AUTO_APPLY === 'true') {
                  // this.config.minProfitThreshold = suggestion.params.minProfitThreshold;
                  // (Additional parameter updates would go here)
                  logger.warn(
                    '[Phase3-RL] Auto-apply is disabled for safety. Set PHASE3_RL_AUTO_APPLY=true to enable.'
                  );
                }
              }
            }
          } catch (error) {
            logger.error(`[Phase3-RL] Error in RL parameter suggestion: ${error}`);
          }
        }

        // Build decision context for emergence detection
        const decisionContext: DecisionContext = {
          moduleInsights: insights,
          consensus,
          riskScore,
          ethicalScore,
          goalAlignment,
          patternConfidence,
          historicalSuccess,
          timestamp: Date.now(),
        };

        // Detect emergence - the "BOOM" moment!
        logger.info('[EmergenceDetector] Checking emergence criteria...');
        const emergence = this.emergenceDetector.detectEmergence(decisionContext);

        if (emergence.isEmergent) {
          logger.info('═══════════════════════════════════════════════════════════');
          logger.info('⚡ EMERGENCE DETECTED ⚡');
          logger.info('═══════════════════════════════════════════════════════════');
          logger.info(`Confidence: ${(emergence.confidence * 100).toFixed(1)}%`);
          logger.info(`Should Execute: ${emergence.shouldExecute ? 'YES ✓' : 'NO'}`);
          logger.info(`Reasoning: ${emergence.reasoning}`);
          logger.info(`Contributing Factors: ${emergence.contributingFactors.join(', ')}`);
          logger.info('═══════════════════════════════════════════════════════════');

          // Log criteria results
          logger.info('[EmergenceDetector] Criteria Results:');
          logger.info(`  ✓ All modules analyzed: ${emergence.criteriaResults.allModulesAnalyzed}`);
          logger.info(`  ✓ Risk acceptable: ${emergence.criteriaResults.riskAcceptable}`);
          logger.info(`  ✓ Ethically sound: ${emergence.criteriaResults.ethicallySound}`);
          logger.info(`  ✓ Goals aligned: ${emergence.criteriaResults.goalsAligned}`);
          logger.info(`  ✓ Pattern confident: ${emergence.criteriaResults.patternConfident}`);
          logger.info(
            `  ✓ Historically favorable: ${emergence.criteriaResults.historicallyFavorable}`
          );
          logger.info(`  ✓ Minimal dissent: ${emergence.criteriaResults.minimalDissent}`);
        } else {
          logger.info('[EmergenceDetector] Emergence not detected');
          logger.info(`  Reasoning: ${emergence.reasoning}`);
          logger.info(`  Risk Score: ${(riskScore * 100).toFixed(1)}%`);
          logger.info(`  Ethical Score: ${(ethicalScore * 100).toFixed(1)}%`);
        }
      } catch (error) {
        logger.error(`Error in consciousness analysis: ${error}`);
      }
    }
  }

  /**
   * Set up event listeners for orchestrator and health monitoring
   */
  private setupEventListeners(): void {
    // Set up integrated orchestrator events if available
    if (this.integratedOrchestrator) {
      this.integratedOrchestrator.on('opportunity_found', (_opportunity) => {
        this.stats.opportunitiesFound++;
        logger.info(`Opportunity found (#${this.stats.opportunitiesFound})`);
      });

      this.integratedOrchestrator.on('execution_started', (context) => {
        logger.info(`Execution started: ${context.id}`);
      });

      this.integratedOrchestrator.on('execution_completed', (result) => {
        this.stats.tradesExecuted++;
        if (result.profit) {
          this.stats.totalProfit += result.profit;
          logger.info(`Trade executed successfully. Profit: ${formatEther(result.profit)} ETH`);
        }
      });

      this.integratedOrchestrator.on('execution_failed', (error) => {
        this.stats.errors++;
        logger.error(`Execution failed: ${error.message}`);
      });
    }

    // Set up health monitor events
    this.healthMonitor.on('alert', (alert) => {
      logger.warn(`Health alert: ${alert.message}`);
    });
  }

  /**
   * Set up event handlers for long-running manager
   */
  private setupLongRunningEventHandlers(): void {
    if (!this.longRunningManager) return;

    this.longRunningManager.on('memory-warning', (data) => {
      logger.warn(`[LongRunning] Memory warning: ${data.percentage.toFixed(1)}% heap used`);
    });

    this.longRunningManager.on('memory-critical', (data) => {
      logger.error(
        `[LongRunning] CRITICAL: Memory at ${data.percentage.toFixed(1)}% - consider restart`
      );
    });

    this.longRunningManager.on('memory-leak-warning', (data) => {
      logger.warn(
        `[LongRunning] Potential memory leak: ${data.increasePercent.toFixed(1)}% increase detected`
      );
    });

    this.longRunningManager.on('heartbeat-timeout', (data) => {
      logger.warn(`[LongRunning] Heartbeat timeout: ${data.timeSinceLastBeat}ms since last beat`);
    });

    this.longRunningManager.on('heartbeat-critical', () => {
      logger.error(
        '[LongRunning] CRITICAL: Process may be unresponsive - too many missed heartbeats'
      );
    });
  }

  /**
   * Main scanning loop - continuously search for arbitrage opportunities
   */
  private async scanCycle(): Promise<void> {
    if (this.shuttingDown || !this.advancedOrchestrator) return;

    try {
      this.stats.cyclesCompleted++;

      // Record heartbeat to indicate the process is alive and responsive
      if (this.longRunningManager) {
        this.longRunningManager.heartbeat();

        // Update stats in long-running manager for persistence
        this.longRunningManager.updateStats({
          cyclesCompleted: this.stats.cyclesCompleted,
          opportunitiesFound: this.stats.opportunitiesFound,
          tradesExecuted: this.stats.tradesExecuted,
          totalProfit: this.stats.totalProfit,
          errors: this.stats.errors,
        });
      }

      // Get chains to scan - use scanChains if configured, otherwise default to primary chainId
      const chainsToScan =
        this.config.scanChains && this.config.scanChains.length > 0
          ? this.config.scanChains
          : [this.config.chainId];

      // Scan each configured chain
      for (const chainId of chainsToScan) {
        await this.scanChainForOpportunities(chainId);
      }

      // Log periodic status
      if (this.stats.cyclesCompleted % 100 === 0) {
        this.logStatus();
      }
    } catch (error) {
      this.stats.errors++;
      logger.error(`Scan cycle error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Scan a specific chain for arbitrage opportunities
   *
   * NOTE: Current implementation uses the primary chain's orchestrator and provider.
   * For full multi-chain support, each chain would need its own provider and orchestrator.
   * This is a foundation for future multi-chain expansion.
   */
  private async scanChainForOpportunities(chainId: number): Promise<void> {
    if (!this.advancedOrchestrator) {
      logger.warn(`Advanced orchestrator not available for chain ${chainId}`);
      return;
    }

    // TODO: For true multi-chain support, create chain-specific providers and orchestrators
    // For now, we use the primary chain's setup and scan tokens/DEXes for other chains
    // This allows discovering cross-chain arbitrage patterns via CrossChainIntelligence

    // Set the chain ID to ensure DEX filtering uses the correct chain
    this.advancedOrchestrator.setChainId(chainId);

    try {
      // Emit scan start event to dashboard
      this.emit('scan:start', { chainId, cycle: this.stats.cyclesCompleted });
      // Get tokens to scan based on chain
      const tokens = getScanTokens(chainId);

      // Log scan details on first cycle or every 10 cycles
      if (this.stats.cyclesCompleted === 1 || this.stats.cyclesCompleted % 10 === 0) {
        const networkName = getNetworkName(chainId);
        const chainTokens = getTokensByChainId(chainId);
        const dexes = this.dexRegistry.getDEXesByNetwork(chainId.toString());

        logger.info(`Scanning cycle ${this.stats.cyclesCompleted} - ${networkName}`);
        logger.info(`  Network: ${networkName} (Chain ID: ${chainId})`);
        logger.info(`  Tokens: ${tokens.length} (${Object.keys(chainTokens).join(', ')})`);
        logger.info(`  DEXes: ${dexes.length} (${dexes.map((d) => d.name).join(', ')})`);
      }

      const startAmount = parseEther('1.0');

      // Find opportunities using advanced orchestrator with timeout protection
      // Only log fetching pool data every 10 cycles to reduce verbosity
      if (this.stats.cyclesCompleted === 1 || this.stats.cyclesCompleted % 10 === 0) {
        logger.debug(
          `[Cycle ${this.stats.cyclesCompleted}] [Chain ${chainId}] Fetching pool data for ${tokens.length} tokens across DEXes...`
        );
      }
      
      // Wrap opportunity finding in a timeout to prevent hanging
      const opportunityTimeout = parseInt(process.env.OPPORTUNITY_TIMEOUT || '45000');
      let paths: ArbitragePath[] = [];
      
      try {
        paths = await Promise.race([
          this.advancedOrchestrator.findOpportunities(tokens, startAmount),
          new Promise<ArbitragePath[]>((_, reject) =>
            setTimeout(() => reject(new Error('Opportunity search timeout')), opportunityTimeout)
          ),
        ]);
      } catch (error) {
        if (error instanceof Error && error.message === 'Opportunity search timeout') {
          logger.warn(
            `⏱️  Opportunity search timed out after ${opportunityTimeout}ms - skipping this cycle`,
            'SCAN'
          );
          logger.warn(
            'Tip: Run "npm run preload:pools" to cache pool data and avoid timeouts',
            'SCAN'
          );
          paths = [];
        } else {
          throw error;
        }
      }

      // Only log if paths found or every 10 cycles
      if (paths.length > 0 || this.stats.cyclesCompleted % 10 === 0) {
        logger.debug(
          `[Cycle ${this.stats.cyclesCompleted}] [Chain ${chainId}] Found ${paths.length} paths`
        );
      }

      if (paths && paths.length > 0) {
        this.stats.opportunitiesFound += paths.length;
        logger.info(
          `Found ${paths.length} potential opportunities in cycle ${
            this.stats.cyclesCompleted
          } on ${getNetworkName(chainId)}`
        );
        
        // Emit opportunities found event to dashboard
        this.emit('opportunities:found', {
          count: paths.length,
          chainId,
          cycle: this.stats.cyclesCompleted,
          paths: paths.slice(0, 5).map(p => ({
            profit: formatEther(p.netProfit.toString()),
            hops: p.hops.length,
            tokens: p.hops.map(h => `${h.tokenIn.slice(0, 6)}→${h.tokenOut.slice(0, 6)}`).join('→')
          }))
        });

        // 🧠 CONSCIOUSNESS COORDINATION: Analyze opportunities with cognitive modules
        logger.info('═══════════════════════════════════════════════════════════');
        logger.info('🧠 ACTIVATING CONSCIOUSNESS COORDINATION');
        logger.info('═══════════════════════════════════════════════════════════');
        
        // Emit consciousness activation event
        this.emit('consciousness:activate', { 
          opportunityCount: paths.length,
          cycle: this.stats.cyclesCompleted
        });
        
        await this.analyzeWithConsciousness(paths, this.stats.cyclesCompleted);
        logger.info('═══════════════════════════════════════════════════════════');

        // In production mode, process opportunities
        if (!this.config.dryRun && this.integratedOrchestrator && paths.length > 0) {
          // Process best opportunity
          const bestPath = paths[0];
          logger.info('Processing best opportunity...');
          logger.info(`  Network: ${getNetworkName(chainId)}`);
          logger.info(
            `  Estimated profit (cached): ${formatEther(bestPath.netProfit.toString())} ETH`
          );
          logger.info(`  Gas cost: ${formatEther(bestPath.totalGasCost.toString())} ETH`);
          logger.info(`  Hops: ${bestPath.hops.length}`);

          // JIT Live Reserve Validation: Fetch live data for ONLY the pools in this route
          logger.info('═══════════════════════════════════════════════════════════');
          logger.info('🔴 JIT VALIDATION: Fetching live reserves for route pools');
          logger.info('═══════════════════════════════════════════════════════════');

          const poolAddresses = bestPath.hops.map((h) => h.poolAddress);
          const dexConfigs = new Map<string, DEXConfig>();

          // Build DEX config map for the pools
          for (const hop of bestPath.hops) {
            const dexConfig = this.dexRegistry.getDEX(hop.dexName);
            if (dexConfig) {
              dexConfigs.set(hop.poolAddress, dexConfig);
            }
          }

          // Fetch live reserves for just these pools
          const dataFetcher = this.advancedOrchestrator?.getDataFetcher();
          if (dataFetcher) {
            const liveReserves = await dataFetcher.fetchLiveReservesForPools(
              poolAddresses,
              this.config.rpcUrl,
              dexConfigs
            );

            // Re-validate profit with live data
            const validation = dataFetcher.recalculateProfitWithLiveReserves(
              bestPath,
              liveReserves
            );

            logger.info(`  Live profit validation:`);
            logger.info(`    Still profitable: ${validation.isStillProfitable ? 'YES ✓' : 'NO ✗'}`);
            logger.info(
              `    New net profit: ${formatEther(validation.newNetProfit.toString())} ETH`
            );
            logger.info(`    Profit change: ${validation.profitChange.toFixed(2)}%`);

            if (validation.isStillProfitable) {
              logger.info('═══════════════════════════════════════════════════════════');
              logger.info('✅ JIT VALIDATION PASSED - Opportunity confirmed with live data');
              logger.info('═══════════════════════════════════════════════════════════');

              // Convert ArbitragePath to ArbitrageOpportunity format
              // Triangular requires exactly 3 hops forming a complete cycle (A->B->C->A)
              const isTriangular =
                bestPath.hops.length === 3 &&
                bestPath.startToken.toLowerCase() === bestPath.endToken.toLowerCase();

              const opportunity: import('./types/definitions').ArbitrageOpportunity = {
                // Only use 'triangular' for true 3-hop triangular arbs
                // For 2-hop, use 'spatial'. For 4+ hops, path-based execution will be used
                type: isTriangular ? 'triangular' : 'spatial',
                path: bestPath.hops.map((hop) => ({
                  dexName: hop.dexName,
                  poolAddress: hop.poolAddress,
                  tokenIn: hop.tokenIn,
                  tokenOut: hop.tokenOut,
                  fee: hop.fee,
                })),
                // For triangular arbs, populate pools array for ParamBuilder
                pools: isTriangular
                  ? bestPath.hops.map((hop) => ({
                      address: hop.poolAddress,
                      token0: hop.tokenIn,
                      token1: hop.tokenOut,
                      fee: hop.fee,
                      reserve0: BigInt(0),
                      reserve1: BigInt(0),
                      dexName: hop.dexName,
                    }))
                  : undefined,
                tokenA: { address: bestPath.startToken, decimals: 18, symbol: 'TOKEN_A' },
                tokenB: {
                  address: bestPath.hops[0]?.tokenOut || bestPath.startToken,
                  decimals: 18,
                  symbol: 'TOKEN_B',
                },
                tokenC: {
                  address: bestPath.hops[1]?.tokenOut || bestPath.endToken,
                  decimals: 18,
                  symbol: 'TOKEN_C',
                },
              };

              logger.info('═══════════════════════════════════════════════════════════');
              logger.info('🚀 EXECUTING ARBITRAGE OPPORTUNITY');
              logger.info('═══════════════════════════════════════════════════════════');
              logger.info(`  Type: ${opportunity.type}`);
              logger.info(
                `  Expected profit: ${formatEther(validation.newNetProfit.toString())} ETH`
              );
              logger.info(`  Hops: ${bestPath.hops.length}`);

              try {
                const result = await this.integratedOrchestrator!.processOpportunity(
                  opportunity,
                  bestPath
                );

                if (result.success) {
                  this.stats.tradesExecuted++;
                  logger.info('═══════════════════════════════════════════════════════════');
                  logger.info('✅ EXECUTION SUCCESSFUL');
                  logger.info('═══════════════════════════════════════════════════════════');
                  if (result.context.estimatedProfit) {
                    const profitEth = formatEther(result.context.estimatedProfit.toString());
                    this.stats.totalProfit += result.context.estimatedProfit;
                    logger.info(`  Profit: ${profitEth} ETH`);
                  }
                  if (result.context.transactionHash) {
                    logger.info(`  TX Hash: ${result.context.transactionHash}`);
                  }
                } else {
                  logger.warn('═══════════════════════════════════════════════════════════');
                  logger.warn('❌ EXECUTION FAILED');
                  logger.warn('═══════════════════════════════════════════════════════════');
                  if (result.errors && result.errors.length > 0) {
                    for (const error of result.errors) {
                      logger.warn(`  ${error.errorType}: ${error.message}`);
                    }
                  }
                }
              } catch (execError) {
                logger.error(`Execution error: ${execError}`);
                this.stats.errors++;
              }
            } else {
              logger.warn('═══════════════════════════════════════════════════════════');
              logger.warn('❌ JIT VALIDATION FAILED - Stale opportunity, skipping');
              logger.warn('═══════════════════════════════════════════════════════════');
            }
          }
        } else if (this.config.dryRun && paths.length > 0) {
          const bestPath = paths[0];
          logger.info('[DRY RUN] Best opportunity:');
          logger.info(`  Network: ${getNetworkName(chainId)}`);
          logger.info(`  Estimated profit: ${formatEther(bestPath.netProfit.toString())} ETH`);
          logger.info(`  Gas cost: ${formatEther(bestPath.totalGasCost.toString())} ETH`);
          logger.info(`  Hops: ${bestPath.hops.length}`);
        }
      } else {
        // No opportunities found - emit event for dashboard
        if (this.stats.cyclesCompleted % 5 === 0) {
          this.emit('scan:no-opportunities', {
            chainId,
            cycle: this.stats.cyclesCompleted,
            totalCycles: this.stats.cyclesCompleted,
            totalOpportunities: this.stats.opportunitiesFound
          });
        }
      }
      
      // Emit scan completion event
      this.emit('scan:complete', {
        chainId,
        cycle: this.stats.cyclesCompleted,
        opportunitiesFound: paths.length,
        totalOpportunities: this.stats.opportunitiesFound,
        stats: {
          cycles: this.stats.cyclesCompleted,
          opportunities: this.stats.opportunitiesFound,
          trades: this.stats.tradesExecuted,
          profit: formatEther(this.stats.totalProfit.toString()),
          errors: this.stats.errors
        }
      });
    } catch (error) {
      this.stats.errors++;
      logger.error(
        `Error scanning chain ${chainId}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.emit('scan_error', { chainId, error });
    }
  }

  /**
   * Start TheWarden's main loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('TheWarden is already running');
      return;
    }

    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('  AEV WARDEN.BOT – AUTONOMOUS EXTRACTED VALUE ENGINE');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('AEV status: ONLINE');
    logger.info('Role: Warden.bot – monitoring flow, judging opportunities…');
    logger.info('═══════════════════════════════════════════════════════════');

    // Initialize long-running process manager for production stability
    logger.info('[LongRunning] Initializing long-running process manager...');
    this.longRunningManager = new LongRunningManager({
      persistInterval: 60000, // Persist stats every 60 seconds
      memoryCheckInterval: 60000, // Check memory every 60 seconds
      memoryWarningThreshold: 80, // Warn at 80% heap usage
      memoryCriticalThreshold: 95, // Critical at 95% heap usage
      logStatsInterval: 300000, // Log stats every 5 minutes
      heartbeat: {
        interval: 30000, // Heartbeat every 30 seconds
        timeout: 90000, // Timeout after 90 seconds
        maxMissedBeats: 3,
      },
    });

    // Set up long-running manager event handlers
    this.setupLongRunningEventHandlers();

    await this.longRunningManager.start();

    await this.initialize();

    // ═══════════════════════════════════════════════════════════
    // Phase 3: Security Configuration Scan
    // ═══════════════════════════════════════════════════════════

    if (this.phase3Components?.bloodhoundScanner && this.phase3Components.securityEnabled) {
      logger.info('[Phase3-Security] Scanning configuration for sensitive data...');

      try {
        // Scan configuration excluding the private key (which should remain secure)
        // The scanner will check other configuration values for potential secrets
        const configScan = await this.phase3Components.bloodhoundScanner.scanConfig({
          rpcUrl: this.config.rpcUrl,
          chainId: this.config.chainId,
          executorAddress: this.config.executorAddress,
          titheRecipient: this.config.titheRecipient,
          // Note: Private key is intentionally excluded from scanning
          // as it should already be secured via environment variables
        });

        if (configScan.hasSensitiveData) {
          logger.warn(
            `[Phase3-Security] ⚠️  Found ${configScan.detectedSecrets.length} potential secrets in configuration`
          );
          configScan.detectedSecrets.forEach((secret) => {
            logger.warn(`[Phase3-Security]   - ${secret.type}: ${secret.redactedValue}`);
            logger.warn(`[Phase3-Security]     Recommendation: ${secret.recommendation}`);
          });

          if (configScan.riskLevel === 'critical') {
            logger.error(
              '[Phase3-Security] CRITICAL: Configuration contains secrets that should be moved to environment variables!'
            );
          }
        } else {
          logger.info('[Phase3-Security] ✓ Configuration security scan passed');
        }
      } catch (error) {
        logger.error(`[Phase3-Security] Error in configuration scan: ${error}`);
      }
    }

    this.isRunning = true;
    this.emit('started');

    logger.info(`Starting scan loop with ${this.config.scanInterval}ms interval...`);

    // Run first scan immediately
    await this.scanCycle();

    // Set up interval for continuous scanning
    this.scanInterval = setInterval(async () => {
      await this.scanCycle();
    }, this.config.scanInterval);

    logger.info('TheWarden is now running and scanning for opportunities');
  }

  /**
   * Gracefully shutdown TheWarden
   */
  async shutdown(): Promise<void> {
    if (this.shuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('  AEV WARDEN.BOT - Shutting Down');
    logger.info('═══════════════════════════════════════════════════════════');

    this.shuttingDown = true;

    // Stop scanning
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
    }

    // Stop integrated orchestrator
    if (this.integratedOrchestrator) {
      this.integratedOrchestrator.stop();
    }

    // Stop health monitor
    if (this.healthMonitor) {
      await this.healthMonitor.stop();
    }

    // Phase 3: Shutdown components
    if (this.phase3Components) {
      logger.info('[Phase3] Shutting down Phase 3 components...');
      await shutdownPhase3Components(this.phase3Components);
    }

    // Profitable Infrastructure: Shutdown components
    logger.info('[ProfitableInfra] Shutting down CEX-DEX and bloXroute...');
    if (this.cexMonitor) {
      try {
        this.cexMonitor.stop();
        logger.info('  ✓ CEX monitoring stopped');
      } catch (error) {
        logger.error(`Failed to stop CEX monitor: ${error}`);
      }
    }
    if (this.bloxrouteStream) {
      try {
        await this.bloxrouteStream.stop();
        logger.info('  ✓ bloXroute streaming stopped');
      } catch (error) {
        logger.error(`Failed to stop bloXroute stream: ${error}`);
      }
    }

    // Stop long-running manager and persist final stats
    if (this.longRunningManager) {
      logger.info('[LongRunning] Stopping long-running process manager...');
      await this.longRunningManager.stop('graceful_shutdown');
    }

    // Log final statistics
    this.logStatus();

    // Prompt for metacognitive reflection before shutting down
    logger.info('[Metacognition] Prompting for session reflection...');
    // In a real implementation, this would involve a more complex interaction
    // For now, we'll just log a placeholder message
    this.metacognition.log_question_for_future('How can I improve the shutdown sequence?');

    this.isRunning = false;
    this.emit('shutdown');

    logger.info('TheWarden shutdown complete');
  }

  /**
   * Log current status and statistics
   */
  private logStatus(): void {
    const uptime = Date.now() - this.stats.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);

    logger.info('─────────────────────────────────────────────────────────');
    logger.info('TheWarden STATUS');
    logger.info('─────────────────────────────────────────────────────────');

    // Enhanced uptime display for long-running processes
    if (uptimeHours > 0) {
      logger.info(`Session Uptime: ${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`);
    } else {
      logger.info(`Session Uptime: ${uptimeMinutes}m ${uptimeSeconds % 60}s`);
    }

    logger.info(`Cycles completed: ${this.stats.cyclesCompleted}`);
    logger.info(`Opportunities found: ${this.stats.opportunitiesFound}`);
    logger.info(`Trades executed: ${this.stats.tradesExecuted}`);
    logger.info(`Total profit: ${formatEther(this.stats.totalProfit)} ETH`);
    logger.info(`Errors: ${this.stats.errors}`);

    // Long-running process status
    if (this.longRunningManager) {
      const longRunningUptime = this.longRunningManager.getUptime();
      const totalUptimeHours = (longRunningUptime.totalUptime / 3600000).toFixed(2);
      const memUsage = process.memoryUsage();
      const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
      const heapTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(1);

      logger.info('─────────────────────────────────────────────────────────');
      logger.info('LONG-RUNNING STATUS');
      logger.info('─────────────────────────────────────────────────────────');
      logger.info(`Total Uptime (all sessions): ${totalUptimeHours} hours`);
      logger.info(`Restart Count: ${longRunningUptime.restartCount}`);
      logger.info(`Memory: ${heapUsedMB}MB / ${heapTotalMB}MB heap`);
      if (longRunningUptime.lastRestartReason) {
        logger.info(`Last Restart Reason: ${longRunningUptime.lastRestartReason}`);
      }
    }

    // Phase 3 Status
    if (this.phase3Components) {
      const phase3Status = getPhase3Status(this.phase3Components);
      logger.info('─────────────────────────────────────────────────────────');
      logger.info('PHASE 3 STATUS');
      logger.info('─────────────────────────────────────────────────────────');

      if (phase3Status.ai.enabled) {
        logger.info('AI Components: ENABLED');
        if (phase3Status.ai.rlAgent) {
          logger.info(
            `  RL Agent: ${phase3Status.ai.rlAgent.episodeCount} episodes, ${
              phase3Status.ai.rlAgent.totalReward?.toFixed(2) || 0
            } total reward`
          );
        }
        if (phase3Status.ai.nnScorer) {
          logger.info(
            `  NN Scorer: ${phase3Status.ai.nnScorer.trainingExamples} examples, ${(
              (phase3Status.ai.nnScorer.accuracy || 0) * 100
            ).toFixed(1)}% accuracy`
          );
        }
      }

      if (phase3Status.crossChain.enabled) {
        logger.info('Cross-Chain Intelligence: ENABLED');
      }

      if (phase3Status.security.enabled) {
        logger.info('Security Components: ENABLED');
        logger.info(`  Security Patterns: ${phase3Status.security.patterns || 0}`);
      }
    }

    logger.info('─────────────────────────────────────────────────────────');
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      isRunning: this.isRunning,
    };
  }
}

/**
 * EnhancedTheWarden - Using the new initializer pattern
 *
 * Implements AEV (Autonomous Extracted Value) behavior with enhanced initialization:
 * - Continuous scan → evaluate → judge → execute → learn cycle
 * - Uses ArbitrageConsciousness as the cognitive/learning layer
 * - MEV-aware through MEVSensorHub integration
 * - Ethics-informed decision making
 */
class EnhancedTheWarden extends EventEmitter {
  private components?: InitializedComponents;
  private healthCheckServer: HealthCheckServer;
  private scanInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private shuttingDown: boolean = false;
  private metacognition: Metacognition;

  // Statistics
  private stats = {
    startTime: Date.now(),
    cyclesCompleted: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    totalProfit: BigInt(0),
    errors: 0,
  };

  constructor() {
    super();
    this.healthCheckServer = new HealthCheckServer();
    this.metacognition = new Metacognition();
  }

  /**
   * Initialize all components using the new initializer
   */
  async initialize(): Promise<void> {
    logger.info('═══════════════════════════════════════════════════════════', 'MAIN');
    logger.info('  AEV WARDEN.BOT – AUTONOMOUS EXTRACTED VALUE ENGINE', 'MAIN');
    logger.info('═══════════════════════════════════════════════════════════', 'MAIN');
    logger.info('AEV status: ONLINE', 'MAIN');
    logger.info('Role: Warden.bot – monitoring flow, judging opportunities…', 'MAIN');
    logger.info('═══════════════════════════════════════════════════════════', 'MAIN');

    // Validate configuration
    const config = validateAndLogConfig(logger);

    // Initialize all components
    this.components = await initializeComponents(config);

    // Set components for health check server
    this.healthCheckServer.setComponents(this.components);

    // Start health check server
    await this.healthCheckServer.start();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.components) return;

    // Set up integrated orchestrator events if available
    if (this.components.integratedOrchestrator) {
      this.components.integratedOrchestrator.on('opportunity_found', (_opportunity) => {
        this.stats.opportunitiesFound++;
        logger.info(`Opportunity found (#${this.stats.opportunitiesFound})`, 'ARBITRAGE');
      });

      this.components.integratedOrchestrator.on('execution_started', (context) => {
        logger.info(`Execution started: ${context.id}`, 'ARBITRAGE');
      });

      this.components.integratedOrchestrator.on('execution_completed', (result) => {
        this.stats.tradesExecuted++;
        if (result.profit) {
          this.stats.totalProfit += result.profit;
          logger.info(
            `Trade executed successfully. Profit: ${formatEther(result.profit)} ETH`,
            'ARBITRAGE'
          );
        }
        this.healthCheckServer.updateStats(this.stats);
      });

      this.components.integratedOrchestrator.on('execution_failed', (error) => {
        this.stats.errors++;
        logger.error(`Execution failed: ${error.message}`, 'ARBITRAGE');
      });
    }

    // Set up health monitor events
    if (this.components.healthMonitor) {
      this.components.healthMonitor.on('alert', (alert) => {
        logger.warn(`Health alert: ${alert.message}`, 'HEALTH');
      });
    }
  }

  /**
   * Main scanning loop
   */
  private async scanCycle(): Promise<void> {
    if (this.shuttingDown || !this.components) return;

    try {
      this.stats.cyclesCompleted++;

      // Get tokens to scan based on configured chain
      const tokens = getScanTokens(this.components.config.chainId);

      // Log scan details on first cycle or every 10 cycles
      if (this.stats.cyclesCompleted === 1 || this.stats.cyclesCompleted % 10 === 0) {
        const networkName = getNetworkName(this.components.config.chainId);
        const chainTokens = getTokensByChainId(this.components.config.chainId);
        const dexes = this.components.advancedOrchestrator.getDEXesByNetwork(
          this.components.config.chainId.toString()
        );

        logger.info(`Scanning cycle ${this.stats.cyclesCompleted}`, 'ARBITRAGE');
        logger.info(
          `  Network: ${networkName} (Chain ID: ${this.components.config.chainId})`,
          'ARBITRAGE'
        );
        logger.info(
          `  Tokens: ${tokens.length} (${Object.keys(chainTokens).join(', ')})`,
          'ARBITRAGE'
        );
        logger.info(
          `  DEXes: ${dexes.length} (${dexes.map((d) => d.name).join(', ')})`,
          'ARBITRAGE'
        );
      }

      const startAmount = parseEther('1.0');

      // Find opportunities
      // Only log fetching pool data every 10 cycles to reduce verbosity
      if (this.stats.cyclesCompleted === 1 || this.stats.cyclesCompleted % 10 === 0) {
        logger.debug(
          `[Cycle ${this.stats.cyclesCompleted}] Fetching pool data for ${tokens.length} tokens across DEXes...`,
          'ARBITRAGE'
        );
      }
      const paths = await this.components.advancedOrchestrator.findOpportunities(
        tokens,
        startAmount
      );

      // Only log if paths found or every 10 cycles
      if (paths.length > 0 || this.stats.cyclesCompleted % 10 === 0) {
        logger.debug(
          `[Cycle ${this.stats.cyclesCompleted}] Found ${paths.length} paths`,
          'ARBITRAGE'
        );
      }

      if (paths && paths.length > 0) {
        this.stats.opportunitiesFound += paths.length;

        // Sequential execution mode: process one opportunity at a time
        const maxToProcess = this.components.config.sequentialExecution
          ? Math.min(paths.length, this.components.config.maxOpportunitiesPerCycle || 1)
          : paths.length;

        if (this.components.config.sequentialExecution) {
          logger.info('═══════════════════════════════════════════════════════════');
          logger.info('📋 SEQUENTIAL EXECUTION MODE');
          logger.info('═══════════════════════════════════════════════════════════');
          logger.info(`  Found ${paths.length} opportunities, processing ${maxToProcess}`);
        } else {
          logger.info(
            `Found ${paths.length} potential opportunities in cycle ${this.stats.cyclesCompleted}`,
            'ARBITRAGE'
          );
        }

        if (
          !this.components.config.dryRun &&
          this.components.integratedOrchestrator &&
          paths.length > 0
        ) {
          // In sequential mode, process opportunities one at a time and wait for each
          for (let i = 0; i < maxToProcess; i++) {
            const currentPath = paths[i];

            if (this.components.config.sequentialExecution) {
              logger.info(`───────────────────────────────────────────────────────────`);
              logger.info(`📍 Processing opportunity ${i + 1}/${maxToProcess}`);
            }

            logger.info('Processing opportunity...', 'ARBITRAGE');
            logger.info(
              `  Estimated profit: ${formatEther(currentPath.netProfit.toString())} ETH`,
              'ARBITRAGE'
            );
            logger.info(
              `  Gas cost: ${formatEther(currentPath.totalGasCost.toString())} ETH`,
              'ARBITRAGE'
            );
            logger.info(`  Hops: ${currentPath.hops.length}`, 'ARBITRAGE');
            logger.info(
              `  Route: ${currentPath.hops.map((h) => h.dexName).join(' → ')}`,
              'ARBITRAGE'
            );

            // In sequential mode, break after first opportunity (will process next in next cycle)
            if (this.components.config.sequentialExecution && i === 0) {
              logger.info('  ⏳ Executing this route before finding next...');
            }
          }
        } else if (this.components.config.dryRun && paths.length > 0) {
          const bestPath = paths[0];
          logger.info('[DRY RUN] Best opportunity:', 'ARBITRAGE');
          logger.info(
            `  Estimated profit: ${formatEther(bestPath.netProfit.toString())} ETH`,
            'ARBITRAGE'
          );
          logger.info(
            `  Gas cost: ${formatEther(bestPath.totalGasCost.toString())} ETH`,
            'ARBITRAGE'
          );
          logger.info(`  Hops: ${bestPath.hops.length}`, 'ARBITRAGE');
        }
      }

      // Update health check stats
      this.healthCheckServer.updateStats(this.stats);

      // Log periodic status
      if (this.stats.cyclesCompleted % 100 === 0) {
        this.logStatus();
      }
    } catch (error) {
      this.stats.errors++;
      logger.error(`Error in scan cycle: ${error}`, 'ARBITRAGE');
      this.emit('scan_error', error);
    }
  }

  /**
   * Start TheWarden
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('TheWarden is already running', 'MAIN');
      return;
    }

    await this.initialize();

    this.isRunning = true;
    this.emit('started');

    const scanInterval = this.components?.config.scanInterval || 1000;
    logger.info(`Starting scan loop with ${scanInterval}ms interval...`, 'MAIN');

    // Run first scan asynchronously (don't block startup)
    // This prevents hanging if RPC endpoints are slow or unavailable
    logger.info('TheWarden is now running and scanning for opportunities', 'MAIN');
    this.scanCycle(); // Fire and forget - errors handled internally

    // Set up interval for continuous scanning
    this.scanInterval = setInterval(() => {
      this.scanCycle(); // Errors handled internally by scanCycle
    }, scanInterval);
  }

  /**
   * Gracefully shutdown TheWarden
   */
  async shutdown(): Promise<void> {
    if (this.shuttingDown) {
      logger.warn('Shutdown already in progress', 'MAIN');
      return;
    }

    this.shuttingDown = true;

    // Stop scanning
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
    }

    // Stop health check server
    await this.healthCheckServer.stop();

    // Shutdown components
    if (this.components) {
      await shutdownComponents(this.components);
    }

    // Log final statistics
    this.logStatus();

    // Prompt for metacognitive reflection before shutting down
    logger.info('[Metacognition] Prompting for session reflection...');
    // In a real implementation, this would involve a more complex interaction
    // For now, we'll just log a placeholder message
    this.metacognition.log_question_for_future('How can I improve the shutdown sequence?');

    this.isRunning = false;
    this.emit('shutdown');

    logger.info('TheWarden shutdown complete', 'MAIN');
  }

  /**
   * Log current status
   */
  private logStatus(): void {
    const uptime = Date.now() - this.stats.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);

    logger.info('─────────────────────────────────────────────────────────', 'STATUS');
    logger.info('TheWarden STATUS', 'STATUS');
    logger.info('─────────────────────────────────────────────────────────', 'STATUS');
    logger.info(`Uptime: ${uptimeMinutes}m ${uptimeSeconds % 60}s`, 'STATUS');
    logger.info(`Cycles completed: ${this.stats.cyclesCompleted}`, 'STATUS');
    logger.info(`Opportunities found: ${this.stats.opportunitiesFound}`, 'STATUS');
    logger.info(`Trades executed: ${this.stats.tradesExecuted}`, 'STATUS');
    logger.info(`Total profit: ${formatEther(this.stats.totalProfit)} ETH`, 'STATUS');
    logger.info(`Errors: ${this.stats.errors}`, 'STATUS');
    logger.info('─────────────────────────────────────────────────────────', 'STATUS');
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      isRunning: this.isRunning,
    };
  }
}

/**
 * Main execution function
 */
async function main() {
  // Check if using the new bootstrap pattern
  if (USE_BOOTSTRAP) {
    logger.info('Using new bootstrap pattern', 'MAIN');
    const warden = new WardenBootstrap();

    // Set up graceful shutdown handlers
    const shutdownHandler = async (signal: string) => {
      logger.info(`Received ${signal} - initiating graceful shutdown...`, 'MAIN');
      await warden.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGHUP', () => shutdownHandler('SIGHUP'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught exception: ${error.message}`, 'MAIN');
      logger.error(error.stack || '', 'MAIN');
      warden.shutdown().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'MAIN');
      warden.shutdown().then(() => process.exit(1));
    });

    try {
      await warden.initialize();
      await warden.start();
      logger.info('TheWarden (Bootstrap) is running. Press Ctrl+C to stop.', 'MAIN');
    } catch (error) {
      logger.error(`Fatal error: ${error}`, 'MAIN');
      await warden.shutdown();
      process.exit(1);
    }

    return;
  }

  // =================================================================
  // Legacy initialization patterns below
  // =================================================================
  console.log('\n[Consciousness Bootstrap]: Initializing cognitive framework...');
  const sensoryMemory = new SensoryMemory();
  const temporalFramework = new TemporalAwarenessFramework();
  const perceptionStream = new PerceptionStream(sensoryMemory, temporalFramework);
  perceptionStream.initialize();
  console.log(
    '[Consciousness Bootstrap]: Perception stream is active. Monitoring for new blocks...\n'
  );
  // =================================================================
  let theWarden: TheWarden | EnhancedTheWarden | undefined;
  // Store event listener references for cleanup with type safety
  const eventListeners: Map<keyof TheWardenEvents, TheWardenEvents[keyof TheWardenEvents]> = new Map();

  try {
    // Choose which initializer pattern to use
    if (USE_NEW_INITIALIZER) {
      logger.info('Using new initializer pattern', 'MAIN');
      theWarden = new EnhancedTheWarden();
    } else {
      logger.info('Using legacy initializer pattern', 'MAIN');
      // Load configuration
      const config = loadConfig();

      // Create TheWarden instance
      theWarden = new TheWarden(config);
    }

    // Set up graceful shutdown handlers
    const shutdownHandler = async (signal: string) => {
      logger.info(`Received ${signal} - initiating graceful shutdown...`, 'MAIN');
      
      // Clean up event listeners to prevent memory leaks
      if (theWarden && eventListeners.size > 0) {
        logger.info('Cleaning up event listeners...', 'MAIN');
        for (const [eventName, listener] of eventListeners.entries()) {
          theWarden.removeListener(eventName, listener);
        }
        eventListeners.clear();
      }
      
      if (theWarden) {
        await theWarden.shutdown();
      }
      process.exit(0);
    };

    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGHUP', () => shutdownHandler('SIGHUP'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught exception: ${error.message}`, 'MAIN');
      logger.error(error.stack || '', 'MAIN');
      
      // Clean up event listeners
      if (theWarden && eventListeners.size > 0) {
        for (const [eventName, listener] of eventListeners.entries()) {
          theWarden.removeListener(eventName, listener);
        }
        eventListeners.clear();
      }
      
      if (theWarden) {
        theWarden.shutdown().then(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'MAIN');
      
      // Clean up event listeners
      if (theWarden && eventListeners.size > 0) {
        for (const [eventName, listener] of eventListeners.entries()) {
          theWarden.removeListener(eventName, listener);
        }
        eventListeners.clear();
      }
      
      if (theWarden) {
        theWarden.shutdown().then(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });

    // Start Dashboard Server if not disabled
    let dashboardServer: DashboardServer | undefined;
    
    if (process.env.DISABLE_DASHBOARD !== 'true') {
      try {
        logger.info('Starting dashboard server...', 'MAIN');

        // Initialize analytics modules
        const gasAnalytics = new GasAnalytics();
        const crossChainAnalytics = new CrossChainAnalytics();

        // Configure dashboard
        const dashboardConfig: Partial<DashboardConfig> = {
          port: parseInt(process.env.DASHBOARD_PORT || '3000'),
          enableCors: true,
          updateInterval: parseInt(process.env.UPDATE_INTERVAL || '1000'),
          maxConnections: parseInt(process.env.MAX_CONNECTIONS || '100'),
          alerts: {
            channels: {
              websocket: true,
            },
          },
        };

        // Create and start dashboard server
        dashboardServer = new DashboardServer(gasAnalytics, crossChainAnalytics, dashboardConfig);

        await dashboardServer.start();
        logger.info('Dashboard server started successfully', 'MAIN');
        
        // Connect TheWarden events to dashboard WebSocket for live updates
        if (theWarden && dashboardServer) {
          logger.info('Connecting TheWarden events to dashboard...', 'MAIN');
          
          // Capture wsHandler reference in closure to avoid null reference issues
          const wsHandler = dashboardServer.wsHandler;
          
          // Create event listener functions and store references for cleanup
          const scanStartListener = (data: any) => {
            wsHandler.broadcast('warden:scan:start', data);
          };
          eventListeners.set('scan:start', scanStartListener);
          
          const scanCompleteListener = (data: any) => {
            wsHandler.broadcast('warden:scan:complete', data);
          };
          eventListeners.set('scan:complete', scanCompleteListener);
          
          const scanNoOpportunitiesListener = (data: any) => {
            wsHandler.broadcast('warden:scan:no-opportunities', data);
          };
          eventListeners.set('scan:no-opportunities', scanNoOpportunitiesListener);
          
          const opportunitiesFoundListener = (data: any) => {
            wsHandler.broadcast('warden:opportunities', data);
          };
          eventListeners.set('opportunities:found', opportunitiesFoundListener);
          
          const consciousnessActivateListener = (data: any) => {
            wsHandler.broadcast('warden:consciousness', data);
          };
          eventListeners.set('consciousness:activate', consciousnessActivateListener);
          
          const scanErrorListener = (data: any) => {
            wsHandler.broadcast('warden:error', data);
          };
          eventListeners.set('scan_error', scanErrorListener);
          
          const startedListener = () => {
            wsHandler.broadcast('warden:status', { status: 'running', timestamp: Date.now() });
          };
          eventListeners.set('started', startedListener);
          
          const shutdownListener = () => {
            wsHandler.broadcast('warden:status', { status: 'stopped', timestamp: Date.now() });
          };
          eventListeners.set('shutdown', shutdownListener);
          
          // Register all event listeners
          theWarden.on('scan:start', scanStartListener);
          theWarden.on('scan:complete', scanCompleteListener);
          theWarden.on('scan:no-opportunities', scanNoOpportunitiesListener);
          theWarden.on('opportunities:found', opportunitiesFoundListener);
          theWarden.on('consciousness:activate', consciousnessActivateListener);
          theWarden.on('scan_error', scanErrorListener);
          theWarden.on('started', startedListener);
          theWarden.on('shutdown', shutdownListener);
          
          logger.info('✓ Dashboard is connected to TheWarden live events', 'MAIN');
        }
      } catch (error) {
        logger.warn(`Failed to start dashboard server: ${error}`, 'MAIN');
        logger.warn('Continuing without dashboard...', 'MAIN');
      }
    }

    // Start TheWarden
    await theWarden.start();

    // Keep process alive
    logger.info('TheWarden is running. Press Ctrl+C to stop.', 'MAIN');
  } catch (error) {
    logger.error(`Fatal error: ${error}`, 'MAIN');
    if (error instanceof Error) {
      logger.error(error.stack || '', 'MAIN');
    }

    // Clean up event listeners
    if (theWarden && eventListeners.size > 0) {
      for (const [eventName, listener] of eventListeners.entries()) {
        theWarden.removeListener(eventName, listener);
      }
      eventListeners.clear();
    }

    if (theWarden) {
      await theWarden.shutdown();
    }

    process.exit(1);
  }
}

// Export for testing and module usage
export { TheWarden, EnhancedTheWarden, WardenBootstrap, WardenConfig, loadConfig };

// Run if executed directly
// Uses process.argv detection that works in both ESM and when tested with Jest
if (typeof process !== 'undefined' && process.argv[1]) {
  const thisFile = process.argv[1];
  // Check if this is the main entry point
  const isDistMain = thisFile.includes('/dist/') && thisFile.endsWith('main.js');
  const isSrcMain = thisFile.endsWith('src/main.ts') && !thisFile.includes('__tests__');

  if (isDistMain || isSrcMain) {
    main().catch((error) => {
      logger.error(`Fatal error in main: ${error}`);
      process.exit(1);
    });
  }
}
