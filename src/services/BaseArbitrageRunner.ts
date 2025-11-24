/**
 * BaseArbitrageRunner - Enhanced Bot Runner for Base WETH/USDC Strategy
 * 
 * Inspired by AxionCitadel's BotCycleService with improvements:
 * - Configurable cycle intervals for L2 optimization
 * - MEV-aware execution timing
 * - Graceful shutdown and error handling
 * - Integration with consciousness memory system
 */

import { EventEmitter } from 'events';
import { ethers, JsonRpcProvider, Provider, formatEther } from 'ethers';
import { ProfitCalculator, TransactionType } from '../mev/profit_calculator/ProfitCalculator';
import { MEVSensorHub } from '../mev/sensors/MEVSensorHub';
import { NonceManager } from '../execution/NonceManager';
import { SimulationService, SimulationConfig } from './SimulationService';
import { ExecutionMetrics, ExecutionEventType } from './ExecutionMetrics';
import { FlashLoanExecutor, FlashLoanArbitrageParams } from './FlashLoanExecutor';
import { MultiDexPathBuilder, ArbitragePath } from './MultiDexPathBuilder';
import { PoolDataFetcher, PoolConfig } from './PoolDataFetcher';
import { StrategyRLAgent } from '../ai/StrategyRLAgent';
import { OpportunityNNScorer } from '../ai/OpportunityNNScorer';
import { StrategyEvolutionEngine } from '../ai/StrategyEvolutionEngine';
import { 
  ExecutionEpisode, 
  ExecutionState, 
  ExecutionAction, 
  ExecutionOutcome, 
  MEVContext,
  StrategyParameters,
  OpportunityFeatures
} from '../ai/types';

interface BaseArbitrageConfig {
  // Network configuration
  rpcUrl: string;
  chainId: number;
  privateKey: string;
  
  // Contract addresses
  flashSwapAddress: string;
  wethAddress: string;
  usdcAddress: string;
  
  // Strategy parameters
  minProfitThresholdEth: number;
  maxGasPriceGwei: number;
  cycleIntervalMs: number;
  
  // MEV protection
  enableMevProtection: boolean;
  mevRiskThreshold: number;
  
  // Execution controls
  stopOnFirstExecution: boolean;
  maxConcurrentCycles: number;
  cycleTimeoutMs: number;
  
  // Nonce and transaction management
  maxConcurrentTx?: number;
  txRetryAttempts?: number;
  
  // Simulation configuration
  requireSimulation?: boolean;
  maxGasLimit?: bigint;
  simulationTimeout?: number;
  
  // Pool scanning
  targetPools: Array<{
    address: string;
    dex: string;
    fee: number;
  }>;
  
  // Aave configuration
  aavePoolAddress?: string;
  
  // Execution mode
  enableFlashLoans?: boolean;
  enableMultiDex?: boolean;
  
  // AI/ML configuration
  enableML?: boolean;
  enableStrategyEvolution?: boolean;
  mlConfig?: {
    rlAgent?: {
      learningRate?: number;
      discountFactor?: number;
      explorationRate?: number;
    };
    nnScorer?: {
      hiddenLayerSize?: number;
      minConfidenceScore?: number;
      executionThreshold?: number;
    };
    evolution?: {
      populationSize?: number;
      mutationRate?: number;
    };
  };
}

interface OpportunityResult {
  found: boolean;
  profit?: number;
  gasEstimate?: bigint;
  mevRisk?: number;
  pools?: any[];
  executionRecommended: boolean;
}

export class BaseArbitrageRunner extends EventEmitter {
  private config: BaseArbitrageConfig;
  private provider: Provider;
  private wallet: ethers.Wallet;
  private nonceManager: NonceManager | null = null;
  private simulationService: SimulationService | null = null;
  private executionMetrics: ExecutionMetrics;
  private profitCalculator: ProfitCalculator;
  private mevSensorHub: MEVSensorHub;
  
  // Live-fire execution components
  private flashLoanExecutor: FlashLoanExecutor | null = null;
  private pathBuilder: MultiDexPathBuilder | null = null;
  private poolDataFetcher: PoolDataFetcher | null = null;
  
  // AI/ML components
  private rlAgent: StrategyRLAgent | null = null;
  private nnScorer: OpportunityNNScorer | null = null;
  private evolutionEngine: StrategyEvolutionEngine | null = null;
  
  private isRunning: boolean = false;
  private isCycleRunning: boolean = false;
  private cycleInterval: NodeJS.Timeout | null = null;
  private cycleCount: number = 0;
  
  constructor(config: BaseArbitrageConfig) {
    super();
    this.config = config;
    
    // Initialize provider and wallet
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    
    // Initialize MEV components
    this.profitCalculator = new ProfitCalculator();
    this.mevSensorHub = new MEVSensorHub(this.provider);
    
    // Initialize execution metrics
    this.executionMetrics = new ExecutionMetrics();
    
    console.log('[BaseArbitrageRunner] Initialized for Base mainnet');
    console.log(`[BaseArbitrageRunner] Wallet: ${this.wallet.address}`);
    console.log(`[BaseArbitrageRunner] Cycle interval: ${config.cycleIntervalMs}ms`);
  }
  
  /**
   * Initialize NonceManager, SimulationService, and Live-Fire Components
   * Should be called before starting the runner
   */
  async initialize(): Promise<void> {
    console.log('[BaseArbitrageRunner] Initializing advanced components...');
    
    // Initialize NonceManager wrapper around wallet
    this.nonceManager = await NonceManager.create(this.wallet);
    console.log('[BaseArbitrageRunner] ✓ NonceManager initialized');
    
    // Initialize SimulationService
    const simulationConfig: SimulationConfig = {
      requireSimulation: this.config.requireSimulation ?? true,
      maxGasLimit: this.config.maxGasLimit ?? BigInt(1000000),
      minProfitThresholdEth: this.config.minProfitThresholdEth,
      simulationTimeout: this.config.simulationTimeout ?? 10000
    };
    
    this.simulationService = new SimulationService(simulationConfig);
    console.log('[BaseArbitrageRunner] ✓ SimulationService initialized');
    
    // Initialize live-fire execution components if enabled
    if (this.config.enableFlashLoans && this.config.aavePoolAddress) {
      this.flashLoanExecutor = new FlashLoanExecutor({
        flashSwapAddress: this.config.flashSwapAddress,
        aavePoolAddress: this.config.aavePoolAddress,
        provider: this.provider,
        signer: this.nonceManager, // Use NonceManager as signer for nonce safety
      });
      console.log('[BaseArbitrageRunner] ✓ FlashLoanExecutor initialized');
    }
    
    // Initialize multi-DEX path builder if enabled
    if (this.config.enableMultiDex) {
      this.pathBuilder = new MultiDexPathBuilder({
        provider: this.provider,
        minProfitThresholdEth: this.config.minProfitThresholdEth,
        maxSlippageBps: 50, // 0.5% max slippage
        supportedDexs: ['uniswap_v3', 'aerodrome', 'sushiswap'],
      });
      console.log('[BaseArbitrageRunner] ✓ MultiDexPathBuilder initialized');
    }
    
    // Initialize pool data fetcher for real on-chain data
    this.poolDataFetcher = new PoolDataFetcher({
      provider: this.provider,
      cacheDurationMs: 12000, // Cache for 12 seconds (1 block on Base)
    });
    console.log('[BaseArbitrageRunner] ✓ PoolDataFetcher initialized');
    
    // Initialize AI/ML components if enabled
    if (this.config.enableML) {
      // Initialize RL Agent
      this.rlAgent = new StrategyRLAgent(this.config.mlConfig?.rlAgent);
      console.log('[BaseArbitrageRunner] ✓ StrategyRLAgent initialized');
      
      // Initialize NN Scorer
      this.nnScorer = new OpportunityNNScorer(this.config.mlConfig?.nnScorer);
      console.log('[BaseArbitrageRunner] ✓ OpportunityNNScorer initialized');
      
      // Initialize Strategy Evolution Engine if enabled
      if (this.config.enableStrategyEvolution) {
        const baseParams: StrategyParameters = {
          minProfitThreshold: this.config.minProfitThresholdEth,
          mevRiskSensitivity: this.config.mevRiskThreshold,
          maxSlippage: 0.005, // 0.5%
          gasMultiplier: 1.2,
          executionTimeout: this.config.cycleTimeoutMs,
          priorityFeeStrategy: 'moderate',
        };
        
        this.evolutionEngine = new StrategyEvolutionEngine(
          baseParams,
          this.config.mlConfig?.evolution
        );
        console.log('[BaseArbitrageRunner] ✓ StrategyEvolutionEngine initialized');
      }
    }
    
    console.log('[BaseArbitrageRunner] Advanced components initialized successfully');
  }
  
  /**
   * Start the arbitrage bot runner
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[BaseArbitrageRunner] Already running');
      return;
    }
    
    this.isRunning = true;
    console.log('[BaseArbitrageRunner] Starting arbitrage runner...');
    
    // Initialize advanced components (NonceManager, Simulation Service)
    await this.initialize();
    
    // Verify network connection
    await this.verifyNetwork();
    
    // Initialize MEV sensors
    await this.mevSensorHub.start();
    
    // Run initial cycle immediately
    await this.runCycle();
    
    // Set up recurring cycles if not stopping on first execution
    if (!this.config.stopOnFirstExecution) {
      this.cycleInterval = setInterval(() => {
        this.runCycle().catch((error) => {
          console.error('[BaseArbitrageRunner] Error in cycle interval:', error);
          this.emit('cycleError', error);
        });
      }, this.config.cycleIntervalMs);
      
      console.log('[BaseArbitrageRunner] Recurring cycles scheduled');
    }
    
    this.emit('started');
  }
  
  /**
   * Stop the arbitrage bot runner
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    console.log('[BaseArbitrageRunner] Stopping arbitrage runner...');
    this.isRunning = false;
    
    // Clear cycle interval
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }
    
    // Wait for current cycle to complete
    let waitCount = 0;
    while (this.isCycleRunning && waitCount < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      waitCount++;
    }
    
    // Stop MEV sensors
    await this.mevSensorHub.stop();
    
    console.log('[BaseArbitrageRunner] Stopped');
    
    // Print final execution metrics summary
    console.log('\n[BaseArbitrageRunner] Final Execution Metrics:');
    this.executionMetrics.printSummary();
    
    this.emit('stopped');
  }
  
  /**
   * Run a single arbitrage detection and execution cycle
   */
  private async runCycle(): Promise<void> {
    // Prevent concurrent cycle execution
    if (this.isCycleRunning) {
      console.log('[BaseArbitrageRunner] Cycle already running, skipping...');
      return;
    }
    
    this.isCycleRunning = true;
    this.cycleCount++;
    
    const cycleStartTime = Date.now();
    console.log(`\n[BaseArbitrageRunner] === Cycle #${this.cycleCount} Starting ===`);
    
    try {
      // Wrap in timeout to prevent hanging
      await Promise.race([
        this.executeCycle(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cycle timeout')), this.config.cycleTimeoutMs)
        )
      ]);
    } catch (error: any) {
      console.error('[BaseArbitrageRunner] Cycle error:', error);
      this.emit('cycleError', { cycleNumber: this.cycleCount, error });
    } finally {
      const cycleDuration = Date.now() - cycleStartTime;
      console.log(`[BaseArbitrageRunner] === Cycle #${this.cycleCount} Complete (${cycleDuration}ms) ===\n`);
      
      this.isCycleRunning = false;
      this.emit('cycleComplete', { cycleNumber: this.cycleCount, duration: cycleDuration });
    }
  }
  
  /**
   * Execute the core cycle logic
   */
  private async executeCycle(): Promise<void> {
    // 1. Get current MEV conditions
    const mevConditions = await this.getMevConditions();
    console.log('[BaseArbitrageRunner] MEV Conditions:', mevConditions);
    
    // 2. Scan for opportunities
    const opportunity = await this.scanForOpportunities();
    
    if (!opportunity.found) {
      console.log('[BaseArbitrageRunner] No profitable opportunities found');
      return;
    }
    
    console.log('[BaseArbitrageRunner] Opportunity found!');
    console.log(`  Profit: ${opportunity.profit} ETH`);
    console.log(`  MEV Risk: ${opportunity.mevRisk}`);
    console.log(`  Execution recommended: ${opportunity.executionRecommended}`);
    
    // 3. Check if execution is recommended based on MEV risk
    if (!opportunity.executionRecommended) {
      console.log('[BaseArbitrageRunner] Skipping execution due to high MEV risk');
      this.emit('opportunitySkipped', { reason: 'MEV_RISK_TOO_HIGH', opportunity });
      return;
    }
    
    // 4. Execute the arbitrage (if profitable and safe)
    if (this.shouldExecute(opportunity)) {
      await this.executeArbitrage(opportunity);
    }
  }
  
  /**
   * Get current MEV conditions from sensor hub
   */
  private async getMevConditions(): Promise<any> {
    const congestion = this.mevSensorHub.getCongestion();
    const searcherDensity = this.mevSensorHub.getDensity();
    
    return {
      congestion: congestion || 0,
      searcherDensity: searcherDensity || 0,
      timestamp: Date.now()
    };
  }
  
  /**
   * Scan pools for arbitrage opportunities using real on-chain data
   */
  private async scanForOpportunities(): Promise<OpportunityResult> {
    console.log('[BaseArbitrageRunner] Scanning pools for opportunities...');
    
    try {
      // Ensure pool data fetcher is initialized
      if (!this.poolDataFetcher) {
        console.warn('[BaseArbitrageRunner] PoolDataFetcher not initialized');
        return { found: false, executionRecommended: false };
      }
      
      // Fetch real pool data from on-chain
      const poolConfigs: PoolConfig[] = this.config.targetPools.map((pool) => ({
        address: pool.address,
        dex: pool.dex,
        fee: pool.fee,
      }));
      
      const poolData = await this.poolDataFetcher.fetchPools(poolConfigs);
      
      if (poolData.length < 2) {
        console.log('[BaseArbitrageRunner] Insufficient pool data fetched');
        return { found: false, executionRecommended: false };
      }
      
      console.log(`[BaseArbitrageRunner] Fetched ${poolData.length} pools with real data`);
      
      // Use multi-DEX path builder if enabled and available
      if (this.config.enableMultiDex && this.pathBuilder) {
        return await this.scanWithMultiDex(poolData);
      } else {
        // Fallback to simple spatial arbitrage
        return await this.scanSimpleSpatial(poolData);
      }
      
    } catch (error: any) {
      console.error('[BaseArbitrageRunner] Error scanning opportunities:', error.message);
      return { found: false, executionRecommended: false };
    }
  }
  
  /**
   * Scan for opportunities using multi-DEX path builder
   */
  private async scanWithMultiDex(poolData: any[]): Promise<OpportunityResult> {
    if (!this.pathBuilder) {
      return { found: false, executionRecommended: false };
    }
    
    console.log('[BaseArbitrageRunner] Using MultiDexPathBuilder for advanced opportunity detection...');
    
    // Find opportunities using spatial and triangular engines
    const opportunities = await this.pathBuilder.findOpportunities(poolData);
    
    if (opportunities.length === 0) {
      console.log('[BaseArbitrageRunner] No multi-DEX opportunities found');
      return { found: false, executionRecommended: false };
    }
    
    console.log(`[BaseArbitrageRunner] Found ${opportunities.length} opportunities`);
    
    // Sort by net profit (descending)
    opportunities.sort((a, b) => {
      const profitA = b.netProfit || 0;
      const profitB = a.netProfit || 0;
      return profitB - profitA;
    });
    
    // Take the best opportunity
    const bestOpp = opportunities[0];
    const netProfit = bestOpp.netProfit || 0;
    const mevRisk = bestOpp.riskScore || 0;
    
    // Build executable path
    const poolMap = new Map(poolData.map((p) => [p.address, p]));
    const path = this.pathBuilder.buildPath(bestOpp, poolMap);
    
    if (!path) {
      console.warn('[BaseArbitrageRunner] Failed to build executable path');
      return { found: false, executionRecommended: false };
    }
    
    // Use ML scoring if enabled
    let mlScore = 1.0;
    let mlRecommendation: 'execute' | 'skip' | 'uncertain' = 'execute';
    
    if (this.nnScorer && this.config.enableML) {
      const features = this.extractOpportunityFeatures(bestOpp, mevRisk, path);
      const scoringResult = await this.nnScorer.scoreWithDetails(features);
      mlScore = scoringResult.score;
      mlRecommendation = scoringResult.recommendation;
      
      console.log(`[BaseArbitrageRunner] ML Score: ${(mlScore * 100).toFixed(1)}% - ${mlRecommendation}`);
      console.log(`[BaseArbitrageRunner] ML Reasoning: ${scoringResult.reasoning}`);
    }
    
    // Record opportunity found
    this.executionMetrics.recordEvent(ExecutionEventType.OPPORTUNITY_FOUND, {
      type: bestOpp.arbType,
      grossProfit: bestOpp.grossProfit,
      netProfit,
      mevRisk,
      pathSteps: bestOpp.path.length,
      mlScore,
      mlRecommendation,
    });
    
    // Determine execution recommendation (combine traditional and ML signals)
    const traditionalRecommendation = netProfit >= this.config.minProfitThresholdEth && mevRisk < this.config.mevRiskThreshold;
    const executionRecommended = this.config.enableML 
      ? traditionalRecommendation && mlRecommendation === 'execute'
      : traditionalRecommendation;
    
    return {
      found: true,
      profit: netProfit,
      gasEstimate: path.gasEstimate,
      mevRisk: mevRisk,
      pools: bestOpp.path.map((step: any) => ({ pool: step.poolAddress })),
      executionRecommended,
      arbitragePath: path, // Store the built path for execution
      mlScore,
      mlRecommendation,
    } as any;
  }
  
  /**
   * Scan for simple spatial arbitrage opportunities (fallback)
   */
  private async scanSimpleSpatial(poolData: any[]): Promise<OpportunityResult> {
    console.log('[BaseArbitrageRunner] Using simple spatial arbitrage detection...');
    
    // Find price discrepancies
    const bestOpportunity = this.findBestOpportunity(poolData);
    
    if (!bestOpportunity) {
      return { found: false, executionRecommended: false };
    }
    
    // Calculate MEV-adjusted profit
    const mevRisk = await this.calculateMevRisk(bestOpportunity);
    const netProfit = bestOpportunity.grossProfit - (bestOpportunity.grossProfit * mevRisk);
    
    // Record opportunity found
    this.executionMetrics.recordEvent(ExecutionEventType.OPPORTUNITY_FOUND, {
      grossProfit: bestOpportunity.grossProfit,
      netProfit,
      mevRisk,
      pools: bestOpportunity.pools.length
    });
    
    return {
      found: true,
      profit: netProfit,
      gasEstimate: bestOpportunity.gasEstimate,
      mevRisk: mevRisk,
      pools: bestOpportunity.pools,
      executionRecommended: netProfit >= this.config.minProfitThresholdEth && mevRisk < this.config.mevRiskThreshold
    };
  }
  
  /**
   * Fetch current prices from configured pools
   */
  private async fetchPoolPrices(): Promise<any[]> {
    // This is a placeholder - in production, would query actual pool contracts
    console.log(`[BaseArbitrageRunner] Fetching prices for ${this.config.targetPools.length} pools...`);
    
    // Simulate price fetching
    const prices = this.config.targetPools.map(pool => ({
      pool: pool.address,
      dex: pool.dex,
      price: 0, // Would fetch real price from contract
      liquidity: 0, // Would fetch real liquidity
      fee: pool.fee
    }));
    
    return prices;
  }
  
  /**
   * Find best arbitrage opportunity from price data
   */
  private findBestOpportunity(poolPrices: any[]): any | null {
    // Simplified opportunity detection
    // In production, would use spatial arbitrage engine from existing codebase
    
    let bestOpportunity: any = null;
    let maxProfit = 0;
    
    for (let i = 0; i < poolPrices.length; i++) {
      for (let j = i + 1; j < poolPrices.length; j++) {
        const priceDiff = Math.abs(poolPrices[i].price - poolPrices[j].price);
        const grossProfit = priceDiff - (poolPrices[i].fee + poolPrices[j].fee);
        
        if (grossProfit > maxProfit) {
          maxProfit = grossProfit;
          bestOpportunity = {
            grossProfit,
            pools: [poolPrices[i], poolPrices[j]],
            gasEstimate: 300000n // Estimated gas for flash swap
          };
        }
      }
    }
    
    return bestOpportunity;
  }
  
  /**
   * Calculate MEV risk for an opportunity
   */
  private async calculateMevRisk(opportunity: any): Promise<number> {
    const congestion = this.mevSensorHub.getCongestion();
    const searcherDensity = this.mevSensorHub.getDensity();
    
    const profitResult = this.profitCalculator.calculateProfit(
      opportunity.grossProfit,
      0.05, // Estimated gas cost
      opportunity.grossProfit,
      TransactionType.ARBITRAGE,
      congestion || 0
    );
    
    return profitResult.mevRisk;
  }
  
  /**
   * Determine if opportunity should be executed
   */
  private shouldExecute(opportunity: OpportunityResult): boolean {
    if (!opportunity.profit) return false;
    
    // Check profit threshold
    if (opportunity.profit < this.config.minProfitThresholdEth) {
      console.log('[BaseArbitrageRunner] Profit below threshold');
      return false;
    }
    
    // Check MEV risk
    if (this.config.enableMevProtection && (opportunity.mevRisk || 0) > this.config.mevRiskThreshold) {
      console.log('[BaseArbitrageRunner] MEV risk too high');
      return false;
    }
    
    // Check gas price
    // Would implement gas price check here
    
    return true;
  }
  
  /**
   * Execute an arbitrage opportunity with flashloans or direct execution
   */
  private async executeArbitrage(opportunity: OpportunityResult): Promise<void> {
    const executionId = `exec_${Date.now()}_${this.cycleCount}`;
    console.log(`[BaseArbitrageRunner] [${executionId}] Starting execution pipeline...`);
    
    try {
      // Ensure we have required services
      if (!this.simulationService) {
        throw new Error('SimulationService not initialized');
      }
      if (!this.nonceManager) {
        throw new Error('NonceManager not initialized');
      }
      
      this.emit('executionStarted', { executionId, opportunity });
      
      // Check if we should use flashloan execution
      if (this.config.enableFlashLoans && this.flashLoanExecutor && (opportunity as any).arbitragePath) {
        await this.executeWithFlashLoan(executionId, opportunity);
      } else {
        await this.executeSimple(executionId, opportunity);
      }
      
    } catch (error: any) {
      console.error(`[BaseArbitrageRunner] [${executionId}] ✗ Execution failed:`, error.message);
      
      // Determine error type
      const isRevert = error.message?.toLowerCase().includes('revert');
      const isNonce = error.message?.toLowerCase().includes('nonce');
      
      if (isRevert) {
        this.executionMetrics.recordEvent(ExecutionEventType.TX_REVERTED, {
          executionId,
          error: error.message
        });
      } else {
        this.executionMetrics.recordEvent(ExecutionEventType.TX_FAILED, {
          executionId,
          error: error.message,
          isNonceError: isNonce
        });
      }
      
      this.emit('executionFailed', {
        executionId,
        opportunity,
        error: error.message
      });
      
      // Check if this was a nonce error - NonceManager will handle it automatically
      if (isNonce) {
        console.log(`[BaseArbitrageRunner] [${executionId}] Nonce error detected - NonceManager will auto-resync`);
        this.executionMetrics.recordEvent(ExecutionEventType.NONCE_RESYNC, {
          executionId,
          reason: 'automatic_on_error'
        });
      }
    }
  }
  
  /**
   * Execute arbitrage using Aave flashloan
   */
  private async executeWithFlashLoan(executionId: string, opportunity: OpportunityResult): Promise<void> {
    if (!this.flashLoanExecutor) {
      throw new Error('FlashLoanExecutor not initialized');
    }
    
    const path: ArbitragePath = (opportunity as any).arbitragePath;
    
    console.log(`[BaseArbitrageRunner] [${executionId}] Using Aave flashloan execution`);
    console.log(`  Type: ${path.type}`);
    console.log(`  Borrow: ${formatEther(path.borrowAmount)} ${path.borrowToken}`);
    console.log(`  Steps: ${path.swapSteps.length}`);
    console.log(`  Expected profit: ${path.netProfit} ETH`);
    
    // Prepare flashloan parameters
    const flashLoanParams: FlashLoanArbitrageParams = {
      borrowToken: path.borrowToken,
      borrowAmount: path.borrowAmount,
      swapPath: path.swapSteps,
      expectedProfit: path.netProfit,
      gasEstimate: path.gasEstimate,
    };
    
    // Execute via flashloan
    const result = await this.flashLoanExecutor.execute(flashLoanParams);
    
    if (result.success) {
      console.log(`[BaseArbitrageRunner] [${executionId}] ✓ Flashloan execution successful!`);
      console.log(`  TX Hash: ${result.txHash}`);
      console.log(`  Profit: ${formatEther(result.profit || '0')} ETH`);
      console.log(`  Gas Used: ${result.gasUsed?.toString()}`);
      
      this.executionMetrics.recordEvent(ExecutionEventType.TX_CONFIRMED, {
        executionId,
        txHash: result.txHash,
        gasUsed: result.gasUsed?.toString(),
        profit: formatEther(result.profit || '0'),
      });
      
      this.executionMetrics.recordEvent(ExecutionEventType.OPPORTUNITY_EXECUTED, {
        executionId,
        success: true,
      });
      
      this.emit('executionComplete', {
        executionId,
        result: {
          success: true,
          txHash: result.txHash,
          profit: formatEther(result.profit || '0'),
          gasUsed: result.gasUsed,
        },
      });
      
      this.recordExecution({
        success: true,
        txHash: result.txHash,
        profit: formatEther(result.profit || '0'),
        gasUsed: result.gasUsed,
        opportunity: {
          ...opportunity,
          features: this.config.enableML ? this.extractOpportunityFeatures(
            (opportunity as any).arbitragePath || {},
            opportunity.mevRisk || 0,
            path
          ) : undefined,
        },
      });
    } else {
      throw new Error(result.error || 'Flashloan execution failed');
    }
  }
  
  /**
   * Execute arbitrage without flashloan (simple direct execution)
   * This is a fallback for when flashloans are disabled
   */
  private async executeSimple(executionId: string, opportunity: OpportunityResult): Promise<void> {
    console.log(`[BaseArbitrageRunner] [${executionId}] Using simple execution (no flashloan)`);
    console.warn(`[BaseArbitrageRunner] [${executionId}] Simple execution is not fully implemented - skipping`);
    
    // This would implement direct swap execution without flashloans
    // For now, we skip this as the focus is on flashloan-based execution
    
    this.emit('executionSkipped', {
      executionId,
      reason: 'Simple execution not implemented',
    });
  }
  
  /**
   * Record execution in consciousness memory system and train ML models
   */
  private async recordExecution(result: any): Promise<void> {
    // Integration point with consciousness memory system
    // Would store execution data for learning and pattern detection
    console.log('[BaseArbitrageRunner] Recording execution in consciousness memory');
    
    this.emit('memoryRecorded', {
      type: 'arbitrage_execution',
      timestamp: Date.now(),
      cycleNumber: this.cycleCount,
      result
    });
    
    // Train ML models if enabled
    if (this.config.enableML && this.nnScorer && this.rlAgent) {
      // Train NN scorer on outcome
      const opportunity = (result as any).opportunity;
      if (opportunity && opportunity.features) {
        await this.nnScorer.trainOnOutcome(
          opportunity.features,
          result.success && parseFloat(result.profit) > 0
        );
      }
      
      // Record episode for RL agent
      const episode = this.createExecutionEpisode(result);
      if (episode) {
        await this.rlAgent.recordEpisode(episode);
      }
    }
  }
  
  /**
   * Extract opportunity features for ML scoring
   */
  private extractOpportunityFeatures(
    opportunity: any, 
    mevRisk: number, 
    path: ArbitragePath
  ): OpportunityFeatures {
    const grossProfit = opportunity.grossProfit || 0;
    const netProfit = opportunity.netProfit || 0;
    const gasEstimate = Number(path.gasEstimate || 0);
    
    return {
      grossProfit,
      netProfit,
      profitMargin: grossProfit > 0 ? netProfit / grossProfit : 0,
      roi: netProfit > 0 ? netProfit / (netProfit + gasEstimate * 0.00002) : 0,
      
      totalLiquidity: opportunity.totalLiquidity || 1000000,
      liquidityRatio: opportunity.liquidityRatio || 1.0,
      poolDepth: opportunity.poolDepth || 500000,
      
      mevRisk,
      competitionLevel: this.mevSensorHub.getDensity() || 0.3,
      blockCongestion: this.mevSensorHub.getCongestion() || 0.5,
      
      hopCount: path.swapSteps?.length || 2,
      pathComplexity: (path.swapSteps?.length || 2) * (opportunity.arbType === 'triangular' ? 1.5 : 1.0),
      gasEstimate,
      
      volatility: 0.05, // Placeholder - would calculate from price history
      priceImpact: opportunity.priceImpact || 0.001,
      timeOfDay: (new Date().getHours() % 24) / 24,
      
      similarPathSuccessRate: 0.6, // Placeholder - would query from memory
      avgHistoricalProfit: 0.05, // Placeholder - would query from memory
    };
  }
  
  /**
   * Create execution episode for RL training
   */
  private createExecutionEpisode(result: any): ExecutionEpisode | null {
    const mevConditions = this.mevSensorHub.getCongestion() || 0;
    const searcherDensity = this.mevSensorHub.getDensity() || 0;
    
    const state: ExecutionState = {
      baseFee: 20, // Would get from provider
      gasPrice: 25, // Would get from provider
      congestion: mevConditions,
      searcherDensity,
      expectedProfit: parseFloat(result.profit || '0'),
      pathComplexity: 2,
      liquidityDepth: 100000,
      recentSuccessRate: 0.6,
      avgProfitPerTx: 0.05,
      recentMEVLoss: 0.01,
    };
    
    const action: ExecutionAction = {
      executed: result.success,
      strategyParams: {
        minProfitThreshold: this.config.minProfitThresholdEth,
        mevRiskSensitivity: this.config.mevRiskThreshold,
        maxSlippage: 0.005,
        gasMultiplier: 1.2,
        executionTimeout: this.config.cycleTimeoutMs,
        priorityFeeStrategy: 'moderate',
      },
      blockDelay: 0,
      priorityFee: 0.001,
    };
    
    const outcome: ExecutionOutcome = {
      success: result.success,
      actualProfit: parseFloat(result.profit || '0'),
      gasUsed: result.gasUsed ? Number(result.gasUsed) : 0,
      mevLoss: 0,
      slippage: 0.001,
      executionTime: 2000,
    };
    
    const mevContext: MEVContext = {
      competitorCount: 5,
      frontrunRisk: 0.2,
      backrunRisk: 0.1,
      sandwichRisk: 0.15,
      blockPosition: 50,
    };
    
    const reward = outcome.success 
      ? outcome.actualProfit - (outcome.gasUsed * 0.00002) - outcome.mevLoss
      : -0.01;
    
    return {
      timestamp: Date.now(),
      episodeId: `episode_${this.cycleCount}_${Date.now()}`,
      state,
      action,
      outcome,
      reward,
      mevContext,
    };
  }
  
  /**
   * Verify network connection and configuration
   */
  private async verifyNetwork(): Promise<void> {
    const network = await this.provider.getNetwork();
    
    if (Number(network.chainId) !== this.config.chainId) {
      throw new Error(`Network mismatch: expected ${this.config.chainId}, got ${network.chainId}`);
    }
    
    const balance = await this.provider.getBalance(this.wallet.address);
    console.log(`[BaseArbitrageRunner] Wallet balance: ${formatEther(balance)} ETH`);
    
    if (balance.isZero()) {
      console.warn('[BaseArbitrageRunner] WARNING: Wallet has zero balance!');
    }
  }
  
  /**
   * Get current runner status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      isCycleRunning: this.isCycleRunning,
      cycleCount: this.cycleCount,
      config: {
        chainId: this.config.chainId,
        cycleIntervalMs: this.config.cycleIntervalMs,
        minProfitThresholdEth: this.config.minProfitThresholdEth,
        mevProtectionEnabled: this.config.enableMevProtection
      },
      metrics: this.executionMetrics.getStats(),
      ml: this.config.enableML ? {
        rlAgentStats: this.rlAgent?.getStatistics(),
        nnScorerStats: this.nnScorer?.getStatistics(),
        evolutionStats: this.evolutionEngine?.getStatistics(),
      } : undefined,
    };
  }
  
  /**
   * Get execution metrics
   */
  getMetrics(): ExecutionMetrics {
    return this.executionMetrics;
  }
  
  /**
   * Get strategy suggestions from RL agent
   * Called periodically to optimize strategy parameters
   */
  async getStrategySuggestions(): Promise<any> {
    if (!this.config.enableML || !this.rlAgent) {
      return null;
    }
    
    const currentParams: StrategyParameters = {
      minProfitThreshold: this.config.minProfitThresholdEth,
      mevRiskSensitivity: this.config.mevRiskThreshold,
      maxSlippage: 0.005,
      gasMultiplier: 1.2,
      executionTimeout: this.config.cycleTimeoutMs,
      priorityFeeStrategy: 'moderate',
    };
    
    const suggestions = await this.rlAgent.suggestParameters(currentParams);
    
    console.log('[BaseArbitrageRunner] Strategy suggestions from RL agent:');
    console.log(`  Confidence: ${(suggestions.confidence * 100).toFixed(1)}%`);
    console.log(`  Expected improvement: ${suggestions.expectedImprovement.toFixed(4)}`);
    console.log(`  Rationale: ${suggestions.rationale}`);
    
    return suggestions;
  }
  
  /**
   * Get evolved strategy variants from evolution engine
   */
  async getStrategyVariants(): Promise<any> {
    if (!this.config.enableML || !this.config.enableStrategyEvolution || !this.evolutionEngine) {
      return null;
    }
    
    const currentParams: StrategyParameters = {
      minProfitThreshold: this.config.minProfitThresholdEth,
      mevRiskSensitivity: this.config.mevRiskThreshold,
      maxSlippage: 0.005,
      gasMultiplier: 1.2,
      executionTimeout: this.config.cycleTimeoutMs,
      priorityFeeStrategy: 'moderate',
    };
    
    const variants = await this.evolutionEngine.proposeVariants(currentParams);
    
    console.log(`[BaseArbitrageRunner] Evolution engine proposed ${variants.length} strategy variants`);
    
    return variants;
  }
}
