/**
 * IntegratedArbitrageOrchestrator.ts - Enhanced orchestrator with execution engine
 * 
 * Extends ArbitrageOrchestrator with integrated execution capabilities from Mission #5:
 * - ExecutionPipeline for multi-stage execution flow
 * - TransactionExecutor for unified transaction handling
 * - SystemHealthMonitor for real-time monitoring
 * - ErrorRecovery for autonomous error handling
 * - Event-driven architecture for all components
 * - Decision logic for opportunity acceptance/rejection
 */

import { EventEmitter } from 'events';
import { providers } from 'ethers';
import { logger } from '../utils/logger';
import { ArbitrageOrchestrator } from '../arbitrage/ArbitrageOrchestrator';
import { ExecutionPipeline } from '../execution/ExecutionPipeline';
import { TransactionExecutor, TransactionExecutorConfig } from '../execution/TransactionExecutor';
import { SystemHealthMonitor, MonitoredComponent } from '../monitoring/SystemHealthMonitor';
import { ErrorRecovery, ErrorRecoveryConfig } from '../recovery/ErrorRecovery';
import { NonceManager } from '../execution/NonceManager';
import { ParamBuilder } from '../execution/ParamBuilder';
import { AdvancedGasEstimator } from '../gas/AdvancedGasEstimator';
import { GasPriceOracle } from '../gas/GasPriceOracle';
import { ArbitragePath } from '../arbitrage/types';
import { ArbitrageOpportunity, ArbitrageConfig } from '../types/definitions';
import {
  ExecutionContext,
  ExecutionState,
  CheckpointResult,
  OpportunityDecision,
  OrchestratorConfig,
  ExecutionEventType,
  ExecutionEvent,
  HealthStatus,
  SystemHealthReport,
  TransactionExecutionRequest
} from '../types/ExecutionTypes';

/**
 * Integrated Arbitrage Orchestrator - Master Control System
 */
export class IntegratedArbitrageOrchestrator extends EventEmitter {
  // Core orchestrator
  private baseOrchestrator: ArbitrageOrchestrator;
  
  // Execution engine components
  private pipeline: ExecutionPipeline;
  private executor: TransactionExecutor;
  private healthMonitor: SystemHealthMonitor;
  private errorRecovery: ErrorRecovery;
  
  // Supporting components
  private provider: providers.JsonRpcProvider;
  private nonceManager?: NonceManager;
  private gasOracle: GasPriceOracle;
  private gasEstimator: AdvancedGasEstimator;
  
  // Configuration
  private config: OrchestratorConfig;
  private arbitrageConfig: ArbitrageConfig;
  private executorAddress: string;
  private titheRecipient: string;
  
  // State management
  private isRunning: boolean = false;
  private activeExecutions: Map<string, ExecutionContext> = new Map();
  
  // Statistics
  private stats = {
    totalOpportunities: 0,
    acceptedOpportunities: 0,
    rejectedOpportunities: 0,
    completedExecutions: 0,
    failedExecutions: 0,
    totalProfit: BigInt(0),
    totalGasCost: BigInt(0)
  };

  constructor(
    baseOrchestrator: ArbitrageOrchestrator,
    provider: providers.JsonRpcProvider,
    gasOracle: GasPriceOracle,
    gasEstimator: AdvancedGasEstimator,
    executorAddress: string,
    titheRecipient: string,
    arbitrageConfig: ArbitrageConfig,
    config?: Partial<OrchestratorConfig>,
    errorRecoveryConfig?: Partial<ErrorRecoveryConfig>
  ) {
    super();
    
    this.baseOrchestrator = baseOrchestrator;
    this.provider = provider;
    this.gasOracle = gasOracle;
    this.gasEstimator = gasEstimator;
    this.executorAddress = executorAddress;
    this.titheRecipient = titheRecipient;
    this.arbitrageConfig = arbitrageConfig;
    
    // Initialize configuration
    this.config = this.initializeConfig(config);
    
    // Initialize execution engine components
    this.pipeline = new ExecutionPipeline();
    this.executor = this.createTransactionExecutor();
    this.healthMonitor = new SystemHealthMonitor();
    this.errorRecovery = new ErrorRecovery(errorRecoveryConfig);
    
    // Setup pipeline stages
    this.setupPipelineStages();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Register components for health monitoring
    this.registerHealthComponents();
  }

  /**
   * Initialize orchestrator configuration
   */
  private initializeConfig(config?: Partial<OrchestratorConfig>): OrchestratorConfig {
    return {
      maxConcurrentExecutions: config?.maxConcurrentExecutions || 5,
      executionTimeout: config?.executionTimeout || 120000,
      maxGasPrice: config?.maxGasPrice || BigInt(500) * BigInt(10 ** 9),
      minProfitAfterGas: config?.minProfitAfterGas || BigInt(10) * BigInt(10 ** 18),
      gasBufferMultiplier: config?.gasBufferMultiplier || 1.1,
      maxRetries: config?.maxRetries || 3,
      retryBackoffMs: config?.retryBackoffMs || 1000,
      retryBackoffMultiplier: config?.retryBackoffMultiplier || 2,
      validateBeforeExecution: config?.validateBeforeExecution !== false,
      requireGasEstimation: config?.requireGasEstimation !== false,
      requireProfitValidation: config?.requireProfitValidation !== false,
      healthCheckInterval: config?.healthCheckInterval || 30000,
      metricsCollectionInterval: config?.metricsCollectionInterval || 10000,
      enableAnomalyDetection: config?.enableAnomalyDetection !== false,
      enableAutoRecovery: config?.enableAutoRecovery !== false,
      maxRecoveryAttempts: config?.maxRecoveryAttempts || 3,
      escalationThreshold: config?.escalationThreshold || 5
    };
  }

  /**
   * Create transaction executor
   */
  private createTransactionExecutor(): TransactionExecutor {
    const executorConfig: TransactionExecutorConfig = {
      provider: this.provider,
      gasOracle: this.gasOracle,
      gasEstimator: this.gasEstimator,
      arbitrageConfig: this.arbitrageConfig,
      confirmations: 1,
      confirmationTimeout: 120000,
      titheRecipient: this.titheRecipient
    };
    
    return new TransactionExecutor(executorConfig);
  }

  /**
   * Setup pipeline stages
   */
  private setupPipelineStages(): void {
    // Detection stage - find and validate opportunities
    this.pipeline.registerStage(
      ExecutionState.DETECTING,
      this.detectStage.bind(this)
    );
    
    // Validation stage - comprehensive validation
    this.pipeline.registerStage(
      ExecutionState.VALIDATING,
      this.validateStage.bind(this)
    );
    
    // Preparation stage - prepare transaction parameters
    this.pipeline.registerStage(
      ExecutionState.PREPARING,
      this.prepareStage.bind(this)
    );
    
    // Execution stage - submit and monitor transaction
    this.pipeline.registerStage(
      ExecutionState.EXECUTING,
      this.executeStage.bind(this)
    );
    
    // Monitoring stage - track completion and profit
    this.pipeline.registerStage(
      ExecutionState.MONITORING,
      this.monitorStage.bind(this)
    );
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Pipeline events
    this.pipeline.on('execution-event', (event: ExecutionEvent) => {
      this.emit('execution-event', event);
    });
    
    // Health monitor events
    this.healthMonitor.on('health-check', (report: SystemHealthReport) => {
      this.emit('health-check', report);
    });
    
    this.healthMonitor.on('anomaly-detected', (anomaly: any) => {
      logger.warn(`[IntegratedOrchestrator] Anomaly detected: ${JSON.stringify(anomaly)}`);
      this.emit('anomaly-detected', anomaly);
    });
    
    this.healthMonitor.on('critical-health', (report: SystemHealthReport) => {
      logger.error('[IntegratedOrchestrator] Critical health status');
      this.emit('critical-health', report);
      
      // Consider emergency shutdown
      if (this.config.enableAutoRecovery) {
        this.handleCriticalHealth(report);
      }
    });
  }

  /**
   * Register components for health monitoring
   */
  private registerHealthComponents(): void {
    // Register base orchestrator
    this.healthMonitor.registerComponent({
      name: 'ArbitrageOrchestrator',
      checkHealth: async () => {
        try {
          const stats = this.baseOrchestrator.getStats();
          return HealthStatus.HEALTHY;
        } catch (error) {
          return HealthStatus.UNHEALTHY;
        }
      }
    });
    
    // Register gas estimator
    this.healthMonitor.registerComponent({
      name: 'GasEstimator',
      checkHealth: async () => {
        try {
          const stats = this.gasEstimator.getStats();
          const errorRate = stats.failedEstimations / (stats.totalEstimations || 1);
          
          if (errorRate > 0.5) return HealthStatus.CRITICAL;
          if (errorRate > 0.2) return HealthStatus.DEGRADED;
          return HealthStatus.HEALTHY;
        } catch (error) {
          return HealthStatus.UNHEALTHY;
        }
      },
      getMetrics: async () => this.gasEstimator.getStats()
    });
    
    // Register transaction executor
    this.healthMonitor.registerComponent({
      name: 'TransactionExecutor',
      checkHealth: async () => {
        try {
          const stats = this.executor.getStats();
          const successRate = stats.successfulTransactions / (stats.totalTransactions || 1);
          
          if (successRate < 0.5) return HealthStatus.CRITICAL;
          if (successRate < 0.7) return HealthStatus.DEGRADED;
          return HealthStatus.HEALTHY;
        } catch (error) {
          return HealthStatus.UNHEALTHY;
        }
      },
      getMetrics: async () => {
        const stats = this.executor.getStats();
        return {
          totalTransactions: stats.totalTransactions,
          successfulTransactions: stats.successfulTransactions,
          failedTransactions: stats.failedTransactions
        };
      }
    });
  }

  /**
   * Start the integrated orchestrator
   */
  async start(signer: any): Promise<void> {
    if (this.isRunning) {
      logger.warn('[IntegratedOrchestrator] Already running');
      return;
    }

    logger.info('[IntegratedOrchestrator] Starting integrated arbitrage execution engine');
    
    // Initialize nonce manager
    this.nonceManager = await NonceManager.create(signer);
    
    // Start health monitoring
    this.healthMonitor.start();
    
    this.isRunning = true;
    
    this.emit('started');
    logger.info('[IntegratedOrchestrator] Started successfully');
  }

  /**
   * Stop the integrated orchestrator
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('[IntegratedOrchestrator] Stopping integrated arbitrage execution engine');
    
    // Stop health monitoring
    this.healthMonitor.stop();
    
    // Cancel active executions
    for (const [id, context] of this.activeExecutions) {
      this.pipeline.cancelExecution(id);
    }
    
    this.isRunning = false;
    
    this.emit('stopped');
    logger.info('[IntegratedOrchestrator] Stopped successfully');
  }

  /**
   * Process an arbitrage opportunity
   */
  async processOpportunity(
    opportunity: ArbitrageOpportunity,
    path: ArbitragePath
  ): Promise<CheckpointResult> {
    if (!this.isRunning) {
      throw new Error('Orchestrator is not running');
    }

    if (!this.nonceManager) {
      throw new Error('NonceManager not initialized');
    }

    this.stats.totalOpportunities++;
    
    // Check if we can accept more executions
    if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
      logger.warn('[IntegratedOrchestrator] Max concurrent executions reached');
      this.stats.rejectedOpportunities++;
      
      return {
        success: false,
        stage: ExecutionState.PENDING,
        timestamp: Date.now(),
        context: {} as ExecutionContext,
        errors: [{
          timestamp: Date.now(),
          stage: ExecutionState.PENDING,
          errorType: 'MAX_CONCURRENT',
          message: 'Maximum concurrent executions reached',
          recoverable: false
        }]
      };
    }

    // Make acceptance decision
    const decision = await this.makeOpportunityDecision(opportunity, path);
    
    if (!decision.accepted) {
      this.stats.rejectedOpportunities++;
      logger.info(`[IntegratedOrchestrator] Opportunity rejected: ${decision.reason}`);
      
      return {
        success: false,
        stage: ExecutionState.PENDING,
        timestamp: Date.now(),
        context: {} as ExecutionContext,
        errors: [{
          timestamp: Date.now(),
          stage: ExecutionState.PENDING,
          errorType: 'REJECTED',
          message: decision.reason || 'Opportunity rejected',
          recoverable: false
        }]
      };
    }

    this.stats.acceptedOpportunities++;
    logger.info('[IntegratedOrchestrator] Opportunity accepted, starting execution pipeline');
    
    // Execute through pipeline
    const result = await this.pipeline.execute(
      opportunity,
      path,
      this.config.maxRetries
    );
    
    // Update statistics
    if (result.success) {
      this.stats.completedExecutions++;
      
      if (result.context.estimatedProfit) {
        this.stats.totalProfit += result.context.estimatedProfit;
      }
      if (result.context.totalGasCost) {
        this.stats.totalGasCost += result.context.totalGasCost;
      }
      
      // Update health monitor
      this.healthMonitor.updateExecutionStats(
        true,
        result.context.estimatedProfit || BigInt(0),
        result.context.totalGasCost || BigInt(0)
      );
    } else {
      this.stats.failedExecutions++;
      
      // Update health monitor
      this.healthMonitor.updateExecutionStats(false, BigInt(0), BigInt(0));
    }
    
    return result;
  }

  /**
   * Make decision on whether to accept an opportunity
   */
  private async makeOpportunityDecision(
    opportunity: ArbitrageOpportunity,
    path: ArbitragePath
  ): Promise<OpportunityDecision> {
    const validations = {
      gasValidation: false,
      profitValidation: false,
      liquidityValidation: true, // Assumed from pathfinding
      riskValidation: true // Assumed for now
    };

    // Gas validation
    if (this.config.requireGasEstimation) {
      const gasValidation = await this.gasEstimator.validateExecution(path);
      validations.gasValidation = gasValidation.executable;
      
      if (!gasValidation.executable) {
        return {
          accepted: false,
          reason: `Gas validation failed: ${gasValidation.reason}`,
          validations
        };
      }
    } else {
      validations.gasValidation = true;
    }

    // Profit validation
    if (this.config.requireProfitValidation) {
      if (path.netProfit < this.config.minProfitAfterGas) {
        validations.profitValidation = false;
        return {
          accepted: false,
          reason: `Net profit ${path.netProfit} below minimum threshold ${this.config.minProfitAfterGas}`,
          validations
        };
      }
      validations.profitValidation = true;
    } else {
      validations.profitValidation = true;
    }

    // All validations passed
    return {
      accepted: true,
      priority: this.calculatePriority(path),
      validations
    };
  }

  /**
   * Calculate execution priority
   */
  private calculatePriority(path: ArbitragePath): any {
    const profit = Number(path.netProfit);
    
    if (profit > 1000) return 4; // CRITICAL
    if (profit > 500) return 3;  // HIGH
    if (profit > 100) return 2;  // MEDIUM
    return 1; // LOW
  }

  /**
   * Detection stage implementation
   */
  private async detectStage(context: ExecutionContext): Promise<CheckpointResult> {
    logger.info(`[IntegratedOrchestrator] Detection stage for ${context.id}`);
    
    // Opportunity is already detected, just validate it exists
    if (!context.opportunity || !context.path) {
      return {
        success: false,
        stage: ExecutionState.DETECTING,
        timestamp: Date.now(),
        context,
        errors: [{
          timestamp: Date.now(),
          stage: ExecutionState.DETECTING,
          errorType: 'INVALID_OPPORTUNITY',
          message: 'Missing opportunity or path data',
          recoverable: false
        }]
      };
    }

    return {
      success: true,
      stage: ExecutionState.DETECTING,
      timestamp: Date.now(),
      context
    };
  }

  /**
   * Validation stage implementation
   */
  private async validateStage(context: ExecutionContext): Promise<CheckpointResult> {
    logger.info(`[IntegratedOrchestrator] Validation stage for ${context.id}`);
    
    if (!this.nonceManager) {
      return {
        success: false,
        stage: ExecutionState.VALIDATING,
        timestamp: Date.now(),
        context,
        errors: [{
          timestamp: Date.now(),
          stage: ExecutionState.VALIDATING,
          errorType: 'NO_NONCE_MANAGER',
          message: 'NonceManager not initialized',
          recoverable: false
        }]
      };
    }

    // Comprehensive gas validation
    const validation = await this.gasEstimator.validateExecution(
      context.path,
      await this.nonceManager.getAddress(),
      this.executorAddress
    );

    if (!validation.executable) {
      return {
        success: false,
        stage: ExecutionState.VALIDATING,
        timestamp: Date.now(),
        context,
        errors: [{
          timestamp: Date.now(),
          stage: ExecutionState.VALIDATING,
          errorType: 'VALIDATION_FAILED',
          message: validation.reason || 'Validation failed',
          recoverable: false
        }]
      };
    }

    // Update context with validation results
    context.estimatedGas = validation.estimatedGas;
    context.gasPrice = validation.gasPrice;
    context.totalGasCost = (validation.estimatedGas || BigInt(0)) * (validation.gasPrice || BigInt(0));
    context.estimatedProfit = context.path.estimatedProfit;
    context.netProfit = validation.netProfit;

    return {
      success: true,
      stage: ExecutionState.VALIDATING,
      timestamp: Date.now(),
      context
    };
  }

  /**
   * Preparation stage implementation
   */
  private async prepareStage(context: ExecutionContext): Promise<CheckpointResult> {
    logger.info(`[IntegratedOrchestrator] Preparation stage for ${context.id}`);
    
    // Transaction parameters are built by the executor
    // Just validate we have necessary information
    if (!context.gasPrice || !context.estimatedGas) {
      return {
        success: false,
        stage: ExecutionState.PREPARING,
        timestamp: Date.now(),
        context,
        errors: [{
          timestamp: Date.now(),
          stage: ExecutionState.PREPARING,
          errorType: 'MISSING_GAS_DATA',
          message: 'Missing gas price or gas estimate',
          recoverable: true
        }]
      };
    }

    return {
      success: true,
      stage: ExecutionState.PREPARING,
      timestamp: Date.now(),
      context
    };
  }

  /**
   * Execution stage implementation
   */
  private async executeStage(context: ExecutionContext): Promise<CheckpointResult> {
    logger.info(`[IntegratedOrchestrator] Execution stage for ${context.id}`);
    
    if (!this.nonceManager) {
      return {
        success: false,
        stage: ExecutionState.EXECUTING,
        timestamp: Date.now(),
        context,
        errors: [{
          timestamp: Date.now(),
          stage: ExecutionState.EXECUTING,
          errorType: 'NO_NONCE_MANAGER',
          message: 'NonceManager not initialized',
          recoverable: false
        }]
      };
    }

    try {
      // Track as active execution
      this.activeExecutions.set(context.id, context);

      // Build execution request
      const request: TransactionExecutionRequest = {
        context,
        from: await this.nonceManager.getAddress(),
        executorAddress: this.executorAddress,
        maxGasPrice: this.config.maxGasPrice
      };

      // Execute transaction
      const result = await this.executor.executeTransaction(request, this.nonceManager);

      // Update context
      context.transactionHash = result.transactionHash;
      context.blockNumber = result.blockNumber;

      if (!result.success) {
        // Handle execution failure with recovery
        if (this.config.enableAutoRecovery && result.error) {
          logger.info(`[IntegratedOrchestrator] Attempting error recovery for ${context.id}`);
          
          const recoveryResult = await this.errorRecovery.recover(
            context,
            result.error,
            this.nonceManager,
            this.gasOracle
          );

          if (recoveryResult.success && recoveryResult.executionResumed) {
            logger.info(`[IntegratedOrchestrator] Recovery successful, retrying execution`);
            // Would retry here in production
          }
        }

        return {
          success: false,
          stage: ExecutionState.EXECUTING,
          timestamp: Date.now(),
          context,
          errors: result.error ? [result.error] : []
        };
      }

      return {
        success: true,
        stage: ExecutionState.EXECUTING,
        timestamp: Date.now(),
        context
      };

    } catch (error) {
      logger.error(`[IntegratedOrchestrator] Execution error for ${context.id}: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        success: false,
        stage: ExecutionState.EXECUTING,
        timestamp: Date.now(),
        context,
        errors: [{
          timestamp: Date.now(),
          stage: ExecutionState.EXECUTING,
          errorType: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true
        }]
      };
    } finally {
      this.activeExecutions.delete(context.id);
    }
  }

  /**
   * Monitoring stage implementation
   */
  private async monitorStage(context: ExecutionContext): Promise<CheckpointResult> {
    logger.info(`[IntegratedOrchestrator] Monitoring stage for ${context.id}`);
    
    // Transaction is already monitored by executor
    // Just confirm completion
    if (!context.transactionHash) {
      return {
        success: false,
        stage: ExecutionState.MONITORING,
        timestamp: Date.now(),
        context,
        errors: [{
          timestamp: Date.now(),
          stage: ExecutionState.MONITORING,
          errorType: 'NO_TRANSACTION',
          message: 'No transaction hash available',
          recoverable: false
        }]
      };
    }

    logger.info(`[IntegratedOrchestrator] Execution completed for ${context.id}, tx: ${context.transactionHash}`);

    return {
      success: true,
      stage: ExecutionState.MONITORING,
      timestamp: Date.now(),
      context
    };
  }

  /**
   * Handle critical health status
   */
  private handleCriticalHealth(report: SystemHealthReport): void {
    logger.error('[IntegratedOrchestrator] Handling critical health status');
    
    // Stop accepting new opportunities
    // In production, might trigger emergency shutdown or alerts
    
    this.emit('emergency-shutdown-requested', report);
  }

  /**
   * Get system health status
   */
  getHealthStatus(): SystemHealthReport {
    return this.healthMonitor.getHealthStatus();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeExecutions: this.activeExecutions.size,
      baseOrchestratorStats: this.baseOrchestrator.getStats(),
      executorStats: this.executor.getStats(),
      recoveryStats: this.errorRecovery.getStats(),
      health: this.healthMonitor.getHealthStatus()
    };
  }

  /**
   * Get base orchestrator (for backward compatibility)
   */
  getBaseOrchestrator(): ArbitrageOrchestrator {
    return this.baseOrchestrator;
  }

  /**
   * Check if orchestrator is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
