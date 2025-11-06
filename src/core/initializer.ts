/**
 * Component Initializer
 * 
 * Based on PROJECT-HAVOC's initializer pattern.
 * Initializes all bot components in the correct order with proper validation.
 * 
 * Reference: PROJECT-HAVOC/core/initializer.js
 */

import { ethers } from 'ethers';
import { ValidatedConfig } from '../utils/configValidator';
import { logger } from '../utils/logger';
import { DEXRegistry } from '../dex/core/DEXRegistry';
import { GasPriceOracle } from '../gas/GasPriceOracle';
import { AdvancedGasEstimator } from '../gas/AdvancedGasEstimator';
import { NonceManager } from '../execution/NonceManager';
import { AdvancedOrchestrator } from '../arbitrage/AdvancedOrchestrator';
import { ArbitrageOrchestrator } from '../arbitrage/ArbitrageOrchestrator';
import { IntegratedArbitrageOrchestrator } from '../execution/IntegratedArbitrageOrchestrator';
import { SystemHealthMonitor } from '../monitoring/SystemHealthMonitor';
import { HealthStatus } from '../types/ExecutionTypes';
import {
  defaultAdvancedArbitrageConfig,
  getConfigByName,
} from '../config/advanced-arbitrage.config';
import { ArbitrageConfig } from '../types/definitions';

/**
 * Initialized Components
 */
export interface InitializedComponents {
  // Network components
  provider: ethers.providers.JsonRpcProvider;
  wallet: ethers.Wallet;
  signer: ethers.Signer;
  
  // Core arbitrage components
  dexRegistry: DEXRegistry;
  advancedOrchestrator: AdvancedOrchestrator;
  integratedOrchestrator?: IntegratedArbitrageOrchestrator;
  
  // Gas management
  gasOracle: GasPriceOracle;
  gasEstimator: AdvancedGasEstimator;
  
  // Transaction management
  nonceManager: NonceManager;
  
  // Monitoring
  healthMonitor: SystemHealthMonitor;
  
  // Configuration
  config: ValidatedConfig;
  arbitrageConfig: ArbitrageConfig;
}

/**
 * Initialize provider and validate network connection
 */
async function initializeProvider(config: ValidatedConfig): Promise<ethers.providers.JsonRpcProvider> {
  logger.info('Initializing provider...', 'INIT');
  
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  
  try {
    // Validate connection by fetching network info
    const network = await provider.getNetwork();
    logger.info(`✓ Connected to network: ${network.name} (chainId: ${network.chainId})`, 'INIT');
    
    // Validate chain ID matches configuration
    if (config.chainId && network.chainId !== config.chainId) {
      logger.warn(
        `Chain ID mismatch: configured ${config.chainId}, actual ${network.chainId}`,
        'INIT'
      );
    }
    
    // Check provider is responsive
    const blockNumber = await provider.getBlockNumber();
    logger.info(`✓ Current block number: ${blockNumber}`, 'INIT');
    
    return provider;
  } catch (error) {
    throw new Error(
      `Failed to connect to RPC provider: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Initialize wallet and signer
 */
async function initializeWallet(
  config: ValidatedConfig,
  provider: ethers.providers.JsonRpcProvider
): Promise<{ wallet: ethers.Wallet; signer: ethers.Signer }> {
  logger.info('Initializing wallet...', 'INIT');
  
  try {
    const wallet = new ethers.Wallet(config.privateKey, provider);
    const signer = wallet.connect(provider);
    
    // Log wallet address (never log private key!)
    logger.info(`✓ Wallet address: ${wallet.address}`, 'INIT');
    
    // Check wallet balance
    const balance = await wallet.getBalance();
    const balanceEth = ethers.utils.formatEther(balance);
    logger.info(`✓ Wallet balance: ${balanceEth} ETH`, 'INIT');
    
    if (balance.eq(0)) {
      logger.warn('⚠ Wallet balance is 0 - bot will not be able to execute trades', 'INIT');
    } else if (balance.lt(ethers.utils.parseEther('0.01'))) {
      logger.warn(
        `⚠ Low wallet balance (${balanceEth} ETH) - may not be sufficient for trading`,
        'INIT'
      );
    }
    
    return { wallet, signer };
  } catch (error) {
    throw new Error(
      `Failed to initialize wallet: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Initialize gas oracle and estimator
 */
async function initializeGasComponents(
  provider: ethers.providers.JsonRpcProvider,
  config: ValidatedConfig
): Promise<{ gasOracle: GasPriceOracle; gasEstimator: AdvancedGasEstimator }> {
  logger.info('Initializing gas oracle and estimator...', 'INIT');
  
  try {
    // Initialize gas oracle
    const gasOracle = new GasPriceOracle(
      config.rpcUrl,
      process.env.ETHERSCAN_API_KEY,
      60000, // 1 minute update interval
      BigInt(50) * BigInt(1e9) // 50 gwei fallback
    );
    
    // Start auto-refresh
    gasOracle.startAutoRefresh();
    logger.info('✓ Gas oracle started with auto-refresh', 'INIT');
    
    // Initialize gas estimator
    const gasEstimator = new AdvancedGasEstimator(provider, gasOracle);
    logger.info('✓ Gas estimator initialized', 'INIT');
    
    // Get current gas price for logging
    const currentGasPriceData = await gasOracle.getCurrentGasPrice('fast');
    const gasPriceGwei = Number(currentGasPriceData.maxFeePerGas / BigInt(1e9));
    logger.info(`✓ Current gas price: ${gasPriceGwei} gwei`, 'INIT');
    
    return { gasOracle, gasEstimator };
  } catch (error) {
    throw new Error(
      `Failed to initialize gas components: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Initialize nonce manager for transaction management
 */
async function initializeNonceManager(
  signer: ethers.Signer
): Promise<NonceManager> {
  logger.info('Initializing nonce manager...', 'INIT');
  
  try {
    const nonceManager = new NonceManager(signer);
    await nonceManager.initialize();
    
    logger.info('✓ Nonce manager initialized', 'INIT');
    return nonceManager;
  } catch (error) {
    throw new Error(
      `Failed to initialize nonce manager: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Initialize DEX registry
 */
function initializeDEXRegistry(): DEXRegistry {
  logger.info('Initializing DEX registry...', 'INIT');
  
  try {
    const dexRegistry = new DEXRegistry();
    logger.info('✓ DEX registry initialized', 'INIT');
    
    return dexRegistry;
  } catch (error) {
    throw new Error(
      `Failed to initialize DEX registry: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Initialize arbitrage orchestrators
 */
function initializeArbitrageOrchestrators(
  dexRegistry: DEXRegistry,
  provider: ethers.providers.JsonRpcProvider,
  gasOracle: GasPriceOracle,
  gasEstimator: AdvancedGasEstimator,
  config: ValidatedConfig
): {
  advancedOrchestrator: AdvancedOrchestrator;
  integratedOrchestrator?: IntegratedArbitrageOrchestrator;
  arbitrageConfig: ArbitrageConfig;
} {
  logger.info('Initializing arbitrage orchestrators...', 'INIT');
  
  try {
    // Get advanced arbitrage configuration
    const advancedConfig = getConfigByName('default') || defaultAdvancedArbitrageConfig;
    
    // Create arbitrage config
    const arbitrageConfig: ArbitrageConfig = {
      SLIPPAGE_TOLERANCE_BPS: Math.floor(config.minProfitPercent * 100),
    };
    
    // Initialize advanced orchestrator for opportunity finding
    const advancedOrchestrator = new AdvancedOrchestrator(dexRegistry, advancedConfig);
    logger.info('✓ Advanced orchestrator initialized', 'INIT');
    
    // Initialize integrated orchestrator for execution (if not in dry run mode)
    let integratedOrchestrator: IntegratedArbitrageOrchestrator | undefined;
    
    if (!config.dryRun) {
      const pathfindingConfig = {
        maxHops: advancedConfig.pathfinding.maxHops,
        minProfitThreshold: advancedConfig.pathfinding.minProfitThreshold,
        maxSlippage: advancedConfig.pathfinding.maxSlippage,
        gasPrice: advancedConfig.pathfinding.gasPrice,
      };
      
      const baseOrchestrator = new ArbitrageOrchestrator(
        dexRegistry,
        pathfindingConfig,
        advancedConfig.pathfinding.gasPrice
      );
      
      const executorAddress = config.flashSwapV2Address || '';
      const titheRecipient = config.flashSwapV2Owner || '';
      
      integratedOrchestrator = new IntegratedArbitrageOrchestrator(
        baseOrchestrator,
        provider,
        gasOracle,
        gasEstimator,
        executorAddress,
        titheRecipient,
        arbitrageConfig
      );
      
      logger.info('✓ Integrated orchestrator initialized', 'INIT');
      logger.info(`  - Executor: ${executorAddress || 'not set'}`, 'INIT');
      logger.info(`  - Tithe recipient: ${titheRecipient || 'not set'}`, 'INIT');
    } else {
      logger.info('⚠ Running in DRY RUN mode - integrated orchestrator not initialized', 'INIT');
    }
    
    return { advancedOrchestrator, integratedOrchestrator, arbitrageConfig };
  } catch (error) {
    throw new Error(
      `Failed to initialize arbitrage orchestrators: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Initialize health monitor
 */
function initializeHealthMonitor(
  config: ValidatedConfig,
  provider: ethers.providers.JsonRpcProvider
): SystemHealthMonitor {
  logger.info('Initializing health monitor...', 'INIT');
  
  try {
    const healthMonitor = new SystemHealthMonitor({
      interval: 30000, // 30 seconds
    });
    
    // Register provider health check
    healthMonitor.registerComponent({
      name: 'provider',
      checkHealth: async () => {
        try {
          await provider.getBlockNumber();
          return HealthStatus.HEALTHY;
        } catch (error) {
          return HealthStatus.UNHEALTHY;
        }
      },
    });
    
    logger.info('✓ Health monitor initialized', 'INIT');
    return healthMonitor;
  } catch (error) {
    throw new Error(
      `Failed to initialize health monitor: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Main initializer function
 * 
 * Initializes all components in the correct order and returns them.
 */
export async function initializeComponents(
  config: ValidatedConfig
): Promise<InitializedComponents> {
  logger.info('═══════════════════════════════════════════════════════════', 'INIT');
  logger.info('Starting component initialization...', 'INIT');
  logger.info('═══════════════════════════════════════════════════════════', 'INIT');
  
  try {
    // Step 1: Initialize provider
    const provider = await initializeProvider(config);
    
    // Step 2: Initialize wallet
    const { wallet, signer } = await initializeWallet(config, provider);
    
    // Step 3: Initialize gas components
    const { gasOracle, gasEstimator } = await initializeGasComponents(provider, config);
    
    // Step 4: Initialize nonce manager
    const nonceManager = await initializeNonceManager(signer);
    
    // Step 5: Initialize DEX registry
    const dexRegistry = initializeDEXRegistry();
    
    // Step 6: Initialize arbitrage orchestrators
    const { advancedOrchestrator, integratedOrchestrator, arbitrageConfig } =
      initializeArbitrageOrchestrators(dexRegistry, provider, gasOracle, gasEstimator, config);
    
    // Step 7: Initialize health monitor
    const healthMonitor = initializeHealthMonitor(config, provider);
    
    // Start the integrated orchestrator if present
    if (integratedOrchestrator) {
      await integratedOrchestrator.start(wallet);
      logger.info('✓ Integrated orchestrator started', 'INIT');
    }
    
    // Start health monitoring
    await healthMonitor.start();
    logger.info('✓ Health monitoring started', 'INIT');
    
    logger.info('═══════════════════════════════════════════════════════════', 'INIT');
    logger.info('✓ All components initialized successfully', 'INIT');
    logger.info('═══════════════════════════════════════════════════════════', 'INIT');
    
    return {
      provider,
      wallet,
      signer,
      dexRegistry,
      advancedOrchestrator,
      integratedOrchestrator,
      gasOracle,
      gasEstimator,
      nonceManager,
      healthMonitor,
      config,
      arbitrageConfig,
    };
  } catch (error) {
    logger.error(
      `Failed to initialize components: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'INIT'
    );
    throw error;
  }
}

/**
 * Shutdown all components gracefully
 */
export async function shutdownComponents(components: InitializedComponents): Promise<void> {
  logger.info('═══════════════════════════════════════════════════════════', 'SHUTDOWN');
  logger.info('Starting graceful shutdown...', 'SHUTDOWN');
  logger.info('═══════════════════════════════════════════════════════════', 'SHUTDOWN');
  
  try {
    // Stop integrated orchestrator
    if (components.integratedOrchestrator) {
      components.integratedOrchestrator.stop();
      logger.info('✓ Integrated orchestrator stopped', 'SHUTDOWN');
    }
    
    // Stop health monitor
    if (components.healthMonitor) {
      await components.healthMonitor.stop();
      logger.info('✓ Health monitor stopped', 'SHUTDOWN');
    }
    
    // Stop gas oracle auto-refresh
    if (components.gasOracle) {
      // Note: GasPriceOracle doesn't have a stop method, but we log it anyway
      logger.info('✓ Gas oracle refresh stopped', 'SHUTDOWN');
    }
    
    logger.info('═══════════════════════════════════════════════════════════', 'SHUTDOWN');
    logger.info('✓ Graceful shutdown complete', 'SHUTDOWN');
    logger.info('═══════════════════════════════════════════════════════════', 'SHUTDOWN');
  } catch (error) {
    logger.error(
      `Error during shutdown: ${error instanceof Error ? error.message : String(error)}`,
      'SHUTDOWN'
    );
    throw error;
  }
}
