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
import { ethers } from 'ethers';
import { ProfitCalculator, TransactionType } from '../mev/profit_calculator/ProfitCalculator';
import { MEVSensorHub } from '../mev/sensors/MEVSensorHub';

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
  
  // Pool scanning
  targetPools: Array<{
    address: string;
    dex: string;
    fee: number;
  }>;
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
  private provider: ethers.providers.Provider;
  private wallet: ethers.Wallet;
  private profitCalculator: ProfitCalculator;
  private mevSensorHub: MEVSensorHub;
  
  private isRunning: boolean = false;
  private isCycleRunning: boolean = false;
  private cycleInterval: NodeJS.Timeout | null = null;
  private cycleCount: number = 0;
  
  constructor(config: BaseArbitrageConfig) {
    super();
    this.config = config;
    
    // Initialize provider and wallet
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    
    // Initialize MEV components
    this.profitCalculator = new ProfitCalculator();
    this.mevSensorHub = new MEVSensorHub(this.provider);
    
    console.log('[BaseArbitrageRunner] Initialized for Base mainnet');
    console.log(`[BaseArbitrageRunner] Wallet: ${this.wallet.address}`);
    console.log(`[BaseArbitrageRunner] Cycle interval: ${config.cycleIntervalMs}ms`);
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
   * Scan pools for arbitrage opportunities
   */
  private async scanForOpportunities(): Promise<OpportunityResult> {
    console.log('[BaseArbitrageRunner] Scanning pools for opportunities...');
    
    try {
      // Get current prices from target pools
      const poolPrices = await this.fetchPoolPrices();
      
      if (poolPrices.length < 2) {
        return { found: false, executionRecommended: false };
      }
      
      // Find price discrepancies
      const bestOpportunity = this.findBestOpportunity(poolPrices);
      
      if (!bestOpportunity) {
        return { found: false, executionRecommended: false };
      }
      
      // Calculate MEV-adjusted profit
      const mevRisk = await this.calculateMevRisk(bestOpportunity);
      const netProfit = bestOpportunity.grossProfit - (bestOpportunity.grossProfit * mevRisk);
      
      return {
        found: true,
        profit: netProfit,
        gasEstimate: bestOpportunity.gasEstimate,
        mevRisk: mevRisk,
        pools: bestOpportunity.pools,
        executionRecommended: netProfit >= this.config.minProfitThresholdEth && mevRisk < this.config.mevRiskThreshold
      };
      
    } catch (error) {
      console.error('[BaseArbitrageRunner] Error scanning opportunities:', error);
      return { found: false, executionRecommended: false };
    }
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
   * Execute an arbitrage opportunity
   */
  private async executeArbitrage(opportunity: OpportunityResult): Promise<void> {
    console.log('[BaseArbitrageRunner] Executing arbitrage...');
    
    try {
      // In production, would:
      // 1. Build transaction parameters
      // 2. Estimate gas with safety margin
      // 3. Sign and submit transaction
      // 4. Monitor for confirmation
      // 5. Record results in consciousness memory
      
      this.emit('executionStarted', opportunity);
      
      // Placeholder for actual execution
      console.log('[BaseArbitrageRunner] Execution placeholder - would submit transaction here');
      
      // Simulate execution result
      const result = {
        success: true,
        profit: opportunity.profit,
        txHash: '0x...',
        gasUsed: opportunity.gasEstimate
      };
      
      this.emit('executionComplete', result);
      
      // Store in consciousness memory for learning
      this.recordExecution(result);
      
    } catch (error) {
      console.error('[BaseArbitrageRunner] Execution failed:', error);
      this.emit('executionFailed', { opportunity, error });
    }
  }
  
  /**
   * Record execution in consciousness memory system
   */
  private recordExecution(result: any): void {
    // Integration point with consciousness memory system
    // Would store execution data for learning and pattern detection
    console.log('[BaseArbitrageRunner] Recording execution in consciousness memory');
    
    this.emit('memoryRecorded', {
      type: 'arbitrage_execution',
      timestamp: Date.now(),
      cycleNumber: this.cycleCount,
      result
    });
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
    console.log(`[BaseArbitrageRunner] Wallet balance: ${ethers.utils.formatEther(balance)} ETH`);
    
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
      }
    };
  }
}
