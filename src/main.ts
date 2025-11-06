/**
 * Main Runner for AGI Arbitrage Bot
 * 
 * Production-ready entry point that:
 * - Loads configuration and secrets from environment variables
 * - Initializes core arbitrage components (scanner, executor, monitoring)
 * - Handles async startup and graceful shutdown
 * - Runs continuous arbitrage scanning loop
 * - Provides robust error handling and logging
 * 
 * Based on PROJECT-HAVOC design patterns, updated for modern TypeScript
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';
import { logger } from './utils/logger';
import { DEXRegistry } from './dex/core/DEXRegistry';
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

// Load environment variables
dotenv.config();

/**
 * Bot Configuration Interface
 */
interface BotConfig {
  // Network configuration
  rpcUrl: string;
  chainId: number;
  walletPrivateKey: string;
  
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
}

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): BotConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  logger.info(`Loading configuration for environment: ${nodeEnv}`);
  
  // Required configuration
  const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.BASE_RPC_URL;
  if (!rpcUrl) {
    throw new Error('RPC URL is required (ETHEREUM_RPC_URL or BASE_RPC_URL)');
  }
  
  const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
  if (!walletPrivateKey) {
    throw new Error('WALLET_PRIVATE_KEY is required');
  }
  
  // Optional configuration with defaults
  const config: BotConfig = {
    rpcUrl,
    chainId: parseInt(process.env.CHAIN_ID || '1'),
    walletPrivateKey,
    
    executorAddress: process.env.FLASHSWAP_V2_ADDRESS,
    titheRecipient: process.env.FLASHSWAP_V2_OWNER || process.env.MULTI_SIG_ADDRESS,
    
    scanInterval: parseInt(process.env.SCAN_INTERVAL || '1000'),
    concurrency: parseInt(process.env.CONCURRENCY || '10'),
    
    minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.01'),
    minProfitPercent: parseFloat(process.env.MIN_PROFIT_PERCENT || '0.5'),
    
    maxGasPrice: BigInt(process.env.MAX_GAS_PRICE || '100') * BigInt(1e9), // Convert from gwei
    maxGasCostPercentage: parseInt(process.env.MAX_GAS_COST_PERCENTAGE || '40'),
    
    enableMlPredictions: process.env.ENABLE_ML_PREDICTIONS === 'true',
    enableCrossChain: process.env.ENABLE_CROSS_CHAIN === 'true',
    dryRun: process.env.DRY_RUN === 'true' || nodeEnv === 'development',
    
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
  };
  
  logger.info('Configuration loaded successfully');
  logger.info(`- Chain ID: ${config.chainId}`);
  logger.info(`- Scan Interval: ${config.scanInterval}ms`);
  logger.info(`- Min Profit: ${config.minProfitPercent}%`);
  logger.info(`- Dry Run Mode: ${config.dryRun}`);
  
  return config;
}

/**
 * Main Arbitrage Bot Class
 */
class ArbitrageBot extends EventEmitter {
  private config: BotConfig;
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private dexRegistry: DEXRegistry;
  private advancedOrchestrator?: AdvancedOrchestrator;
  private integratedOrchestrator?: IntegratedArbitrageOrchestrator;
  private healthMonitor: SystemHealthMonitor;
  private scanInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private shuttingDown: boolean = false;
  
  // Statistics
  private stats = {
    startTime: Date.now(),
    cyclesCompleted: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    totalProfit: BigInt(0),
    errors: 0,
  };
  
  constructor(config: BotConfig) {
    super();
    this.config = config;
    
    // Initialize provider
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    
    // Initialize wallet
    this.wallet = new ethers.Wallet(config.walletPrivateKey, this.provider);
    
    // Initialize DEX registry
    this.dexRegistry = new DEXRegistry();
    
    // Initialize health monitor
    this.healthMonitor = new SystemHealthMonitor({
      interval: config.healthCheckInterval,
    });
    
    logger.info('Arbitrage bot initialized');
  }
  
  /**
   * Initialize all core components
   */
  async initialize(): Promise<void> {
    logger.info('Initializing arbitrage bot components...');
    
    try {
      // Verify network connection
      const network = await this.provider.getNetwork();
      logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
      
      // Verify wallet
      const balance = await this.wallet.getBalance();
      logger.info(`Wallet address: ${this.wallet.address}`);
      logger.info(`Wallet balance: ${ethers.utils.formatEther(balance)} ETH`);
      
      if (balance.eq(0)) {
        logger.warn('WARNING: Wallet balance is 0 - bot will not be able to execute trades');
      }
      
      // Initialize gas components
      logger.info('Initializing gas oracle and estimator...');
      const gasOracle = new GasPriceOracle(
        this.config.rpcUrl,
        process.env.ETHERSCAN_API_KEY,
        60000, // 1 minute update interval
        BigInt(50) * BigInt(1e9) // 50 gwei fallback
      );
      gasOracle.startAutoRefresh();
      
      const gasEstimator = new AdvancedGasEstimator(this.provider, gasOracle);
      
      // Initialize arbitrage configuration
      const arbitrageConfig: ArbitrageConfig = {
        SLIPPAGE_TOLERANCE_BPS: Math.floor(this.config.minProfitPercent * 100),
      };
      
      // Initialize advanced orchestrator for opportunity finding
      logger.info('Initializing arbitrage orchestrator...');
      const advancedConfig = getConfigByName('default') || defaultAdvancedArbitrageConfig;
      
      this.advancedOrchestrator = new AdvancedOrchestrator(
        this.dexRegistry,
        advancedConfig
      );
      
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
        
        this.integratedOrchestrator = new IntegratedArbitrageOrchestrator(
          baseOrchestrator,
          this.provider,
          gasOracle,
          gasEstimator,
          executorAddress,
          titheRecipient,
          arbitrageConfig
        );
        
        // Start the integrated orchestrator
        await this.integratedOrchestrator.start(this.wallet);
      }
      
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
          } catch (error) {
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
          logger.info(`Trade executed successfully. Profit: ${ethers.utils.formatEther(result.profit)} ETH`);
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
   * Main scanning loop - continuously search for arbitrage opportunities
   */
  private async scanCycle(): Promise<void> {
    if (this.shuttingDown || !this.advancedOrchestrator) return;
    
    try {
      this.stats.cyclesCompleted++;
      
      // Define tokens to scan (could be loaded from config)
      const tokens = [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      ];
      
      const startAmount = ethers.utils.parseEther('1.0').toBigInt();
      
      // Find opportunities using advanced orchestrator
      const paths = await this.advancedOrchestrator.findOpportunities(tokens, startAmount);
      
      if (paths && paths.length > 0) {
        this.stats.opportunitiesFound += paths.length;
        logger.info(`Found ${paths.length} potential opportunities in cycle ${this.stats.cyclesCompleted}`);
        
        // In production mode, process opportunities
        if (!this.config.dryRun && this.integratedOrchestrator && paths.length > 0) {
          // Process best opportunity
          const bestPath = paths[0];
          logger.info('Processing best opportunity...');
          logger.info(`  Estimated profit: ${ethers.utils.formatEther(bestPath.netProfit.toString())} ETH`);
          logger.info(`  Gas cost: ${ethers.utils.formatEther(bestPath.totalGasCost.toString())} ETH`);
          logger.info(`  Hops: ${bestPath.hops.length}`);
          
          // For now, we just log the opportunity
          // Full execution integration would require converting ArbitragePath to ArbitrageOpportunity
          // and calling integratedOrchestrator.processOpportunity()
        } else if (this.config.dryRun && paths.length > 0) {
          const bestPath = paths[0];
          logger.info('[DRY RUN] Best opportunity:');
          logger.info(`  Estimated profit: ${ethers.utils.formatEther(bestPath.netProfit.toString())} ETH`);
          logger.info(`  Gas cost: ${ethers.utils.formatEther(bestPath.totalGasCost.toString())} ETH`);
          logger.info(`  Hops: ${bestPath.hops.length}`);
        }
      }
      
      // Log periodic status
      if (this.stats.cyclesCompleted % 100 === 0) {
        this.logStatus();
      }
    } catch (error) {
      this.stats.errors++;
      logger.error(`Error in scan cycle: ${error}`);
      
      // Emit error event for external monitoring
      this.emit('scan_error', error);
    }
  }
  
  /**
   * Start the bot's main loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot is already running');
      return;
    }
    
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('  AGI ARBITRAGE BOT - Starting');
    logger.info('═══════════════════════════════════════════════════════════');
    
    await this.initialize();
    
    this.isRunning = true;
    this.emit('started');
    
    logger.info(`Starting scan loop with ${this.config.scanInterval}ms interval...`);
    
    // Run first scan immediately
    await this.scanCycle();
    
    // Set up interval for continuous scanning
    this.scanInterval = setInterval(async () => {
      await this.scanCycle();
    }, this.config.scanInterval);
    
    logger.info('Bot is now running and scanning for opportunities');
  }
  
  /**
   * Gracefully shutdown the bot
   */
  async shutdown(): Promise<void> {
    if (this.shuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }
    
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('  AGI ARBITRAGE BOT - Shutting Down');
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
    
    // Log final statistics
    this.logStatus();
    
    this.isRunning = false;
    this.emit('shutdown');
    
    logger.info('Bot shutdown complete');
  }
  
  /**
   * Log current bot status and statistics
   */
  private logStatus(): void {
    const uptime = Date.now() - this.stats.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    
    logger.info('─────────────────────────────────────────────────────────');
    logger.info('BOT STATUS');
    logger.info('─────────────────────────────────────────────────────────');
    logger.info(`Uptime: ${uptimeMinutes}m ${uptimeSeconds % 60}s`);
    logger.info(`Cycles completed: ${this.stats.cyclesCompleted}`);
    logger.info(`Opportunities found: ${this.stats.opportunitiesFound}`);
    logger.info(`Trades executed: ${this.stats.tradesExecuted}`);
    logger.info(`Total profit: ${ethers.utils.formatEther(this.stats.totalProfit)} ETH`);
    logger.info(`Errors: ${this.stats.errors}`);
    logger.info('─────────────────────────────────────────────────────────');
  }
  
  /**
   * Get current bot statistics
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
  let bot: ArbitrageBot | undefined;
  
  try {
    // Load configuration
    const config = loadConfig();
    
    // Create bot instance
    bot = new ArbitrageBot(config);
    
    // Set up graceful shutdown handlers
    const shutdownHandler = async (signal: string) => {
      logger.info(`Received ${signal} - initiating graceful shutdown...`);
      if (bot) {
        await bot.shutdown();
      }
      process.exit(0);
    };
    
    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGHUP', () => shutdownHandler('SIGHUP'));
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught exception: ${error.message}`);
      logger.error(error.stack || '');
      if (bot) {
        bot.shutdown().then(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
      if (bot) {
        bot.shutdown().then(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });
    
    // Start the bot
    await bot.start();
    
    // Keep process alive
    logger.info('Bot is running. Press Ctrl+C to stop.');
    
  } catch (error) {
    logger.error(`Fatal error: ${error}`);
    if (error instanceof Error) {
      logger.error(error.stack || '');
    }
    
    if (bot) {
      await bot.shutdown();
    }
    
    process.exit(1);
  }
}

// Export for testing and module usage
export { ArbitrageBot, BotConfig, loadConfig };

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error(`Fatal error in main: ${error}`);
    process.exit(1);
  });
}
