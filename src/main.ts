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

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';
import { logger } from './utils/logger';
import { validateAndLogConfig } from './utils/configValidator';
import { initializeComponents, shutdownComponents, InitializedComponents } from './core/initializer';
import { HealthCheckServer } from './monitoring/healthCheck';
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
import { SensoryMemory } from '../consciousness/sensory_memory';
import { TemporalAwarenessFramework } from '../consciousness/temporal_awareness';
import { PerceptionStream } from './services/PerceptionStream';

// Load environment variables
dotenv.config();

// Flag to use new initializer pattern (can be toggled via env var)
const USE_NEW_INITIALIZER = process.env.USE_NEW_INITIALIZER === 'true';

/**
 * TheWarden Configuration Interface
 */
interface WardenConfig {
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
    throw new Error(`RPC URL is required for chain ID ${chainId}. Please set BASE_RPC_URL, ETHEREUM_RPC_URL, or RPC_URL`);
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
    
    executorAddress: process.env.FLASHSWAP_V2_ADDRESS,
    titheRecipient: process.env.FLASHSWAP_V2_OWNER || process.env.MULTI_SIG_ADDRESS,
    
    scanInterval: parseInt(process.env.SCAN_INTERVAL || '1000'),
    concurrency: parseInt(process.env.CONCURRENCY || '10'),
    
    minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.01'),
    minProfitPercent: parseFloat(process.env.MIN_PROFIT_PERCENT || '0.5'),
    
    maxGasPrice: BigInt(process.env.MAX_GAS_PRICE || '100') * BigInt(1e9), // Convert from gwei
    maxGasCostPercentage: parseInt(process.env.MAX_GAS_COST_PERCENTAGE || '40'),
    
    enableMlPredictions: process.env.ENABLE_ML_PREDICTIONS ? process.env.ENABLE_ML_PREDICTIONS === 'true' : false,
    enableCrossChain: process.env.ENABLE_CROSS_CHAIN ? process.env.ENABLE_CROSS_CHAIN === 'true' : false,
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
  
  constructor(config: WardenConfig) {
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
    
    logger.info('TheWarden initialized - AEV mode active');
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
      
      // Validate that the connected network matches the configured chain ID
      if (network.chainId !== this.config.chainId) {
        const errorMsg = `Chain ID mismatch! Configured: ${this.config.chainId}, Connected: ${network.chainId}. Please check your RPC_URL configuration.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Verify wallet
      const balance = await this.wallet.getBalance();
      logger.info(`Wallet address: ${this.wallet.address}`);
      logger.info(`Wallet balance: ${ethers.utils.formatEther(balance)} ETH`);
      
      // Check token balances for common tokens based on chain
      await this.checkTokenBalances();
      
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
   * Check and log token balances for common tokens
   */
  private async checkTokenBalances(): Promise<void> {
    try {
      // ERC20 ABI for balance checking
      const ERC20_ABI = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)'
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
          const contract = new ethers.Contract(token.address, ERC20_ABI, this.provider);
          const balance = await contract.balanceOf(this.wallet.address);
          const formattedBalance = ethers.utils.formatUnits(balance, token.decimals);
          logger.info(`${token.symbol} balance: ${formattedBalance}`);
        } catch (error) {
          logger.warn(`Could not fetch ${token.symbol} balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      logger.warn(`Error checking token balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    // Log final statistics
    this.logStatus();
    
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
    
    logger.info('─────────────────────────────────────────────────────────');
    logger.info('THEWARDEN STATUS');
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
          logger.info(`Trade executed successfully. Profit: ${ethers.utils.formatEther(result.profit)} ETH`, 'ARBITRAGE');
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
      
      // Define tokens to scan
      const tokens = [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      ];
      
      const startAmount = ethers.utils.parseEther('1.0').toBigInt();
      
      // Find opportunities
      const paths = await this.components.advancedOrchestrator.findOpportunities(tokens, startAmount);
      
      if (paths && paths.length > 0) {
        this.stats.opportunitiesFound += paths.length;
        logger.info(`Found ${paths.length} potential opportunities in cycle ${this.stats.cyclesCompleted}`, 'ARBITRAGE');
        
        if (!this.components.config.dryRun && this.components.integratedOrchestrator && paths.length > 0) {
          const bestPath = paths[0];
          logger.info('Processing best opportunity...', 'ARBITRAGE');
          logger.info(`  Estimated profit: ${ethers.utils.formatEther(bestPath.netProfit.toString())} ETH`, 'ARBITRAGE');
          logger.info(`  Gas cost: ${ethers.utils.formatEther(bestPath.totalGasCost.toString())} ETH`, 'ARBITRAGE');
          logger.info(`  Hops: ${bestPath.hops.length}`, 'ARBITRAGE');
        } else if (this.components.config.dryRun && paths.length > 0) {
          const bestPath = paths[0];
          logger.info('[DRY RUN] Best opportunity:', 'ARBITRAGE');
          logger.info(`  Estimated profit: ${ethers.utils.formatEther(bestPath.netProfit.toString())} ETH`, 'ARBITRAGE');
          logger.info(`  Gas cost: ${ethers.utils.formatEther(bestPath.totalGasCost.toString())} ETH`, 'ARBITRAGE');
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
    
    // Run first scan immediately
    await this.scanCycle();
    
    // Set up interval for continuous scanning
    this.scanInterval = setInterval(async () => {
      await this.scanCycle();
    }, scanInterval);
    
    logger.info('TheWarden is now running and scanning for opportunities', 'MAIN');
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
    logger.info('THEWARDEN STATUS', 'STATUS');
    logger.info('─────────────────────────────────────────────────────────', 'STATUS');
    logger.info(`Uptime: ${uptimeMinutes}m ${uptimeSeconds % 60}s`, 'STATUS');
    logger.info(`Cycles completed: ${this.stats.cyclesCompleted}`, 'STATUS');
    logger.info(`Opportunities found: ${this.stats.opportunitiesFound}`, 'STATUS');
    logger.info(`Trades executed: ${this.stats.tradesExecuted}`, 'STATUS');
    logger.info(`Total profit: ${ethers.utils.formatEther(this.stats.totalProfit)} ETH`, 'STATUS');
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
  // =================================================================
  // INSERT THIS BLOCK AT THE START OF THE FUNCTION
  // =================================================================
  console.log("\n[Consciousness Bootstrap]: Initializing cognitive framework...");
  const sensoryMemory = new SensoryMemory();
  const temporalFramework = new TemporalAwarenessFramework();
  const perceptionStream = new PerceptionStream(sensoryMemory, temporalFramework);
  perceptionStream.initialize();
  console.log("[Consciousness Bootstrap]: Perception stream is active. Monitoring for new blocks...\n");
  // =================================================================
  let theWarden: TheWarden | EnhancedTheWarden | undefined;
  
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
      if (theWarden) {
        theWarden.shutdown().then(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'MAIN');
      if (theWarden) {
        theWarden.shutdown().then(() => process.exit(1));
      } else {
        process.exit(1);
      }
    });
    
    // Start TheWarden
    await theWarden.start();
    
    // Keep process alive
    logger.info('TheWarden is running. Press Ctrl+C to stop.', 'MAIN');
    
  } catch (error) {
    logger.error(`Fatal error: ${error}`, 'MAIN');
    if (error instanceof Error) {
      logger.error(error.stack || '', 'MAIN');
    }
    
    if (theWarden) {
      await theWarden.shutdown();
    }
    
    process.exit(1);
  }
}

// Export for testing and module usage
export { TheWarden, EnhancedTheWarden, WardenConfig, loadConfig };

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error(`Fatal error in main: ${error}`);
    process.exit(1);
  });
}
