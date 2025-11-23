/**
 * CircuitBreaker - Automatic trading halt mechanism
 * 
 * Monitors system health and trading performance, automatically halting
 * trading when dangerous conditions are detected:
 * - Consecutive failures exceed threshold
 * - Loss rate exceeds acceptable limit
 * - System health degrades
 * - Manual trigger activated
 * 
 * Follows the Circuit Breaker pattern: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation, trades allowed
  OPEN = 'OPEN',         // Circuit tripped, no trades allowed
  HALF_OPEN = 'HALF_OPEN' // Testing if system recovered
}

export interface CircuitBreakerConfig {
  // Failure thresholds
  failureThreshold: number;           // Number of consecutive failures before opening
  failureRateThreshold: number;       // Failure rate (0-1) threshold over time window
  
  // Loss thresholds
  maxConsecutiveLosses: number;       // Max consecutive losing trades
  maxLossAmount: bigint;              // Max total loss before opening (wei)
  maxLossPercentage: number;          // Max loss as percentage of capital (0-100)
  
  // Timing
  timeWindow: number;                 // Time window for failure rate calculation (ms)
  cooldownPeriod: number;             // Time to wait before attempting recovery (ms)
  halfOpenTimeout: number;            // Time in half-open before auto-closing (ms)
  
  // Recovery
  successThresholdToClose: number;    // Successful trades needed in half-open to close
  
  // System health
  minHealthScore: number;             // Minimum health score (0-1) to allow trading
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  consecutiveFailures: number;
  consecutiveLosses: number;
  totalProfit: bigint;
  totalLoss: bigint;
  netProfit: bigint;
  failureRate: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  openedAt: number;
  openCount: number;
  timeInOpen: number;
}

export interface TradeResult {
  success: boolean;
  profit: bigint;
  timestamp: number;
  error?: string;
}

/**
 * Circuit Breaker for Production Safety
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private config: CircuitBreakerConfig;
  
  // Metrics tracking
  private metrics: CircuitBreakerMetrics = {
    state: CircuitState.CLOSED,
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    consecutiveFailures: 0,
    consecutiveLosses: 0,
    totalProfit: BigInt(0),
    totalLoss: BigInt(0),
    netProfit: BigInt(0),
    failureRate: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0,
    openedAt: 0,
    openCount: 0,
    timeInOpen: 0
  };
  
  // Trade history for failure rate calculation
  private tradeHistory: TradeResult[] = [];
  
  // Timers
  private cooldownTimer?: NodeJS.Timeout;
  private halfOpenTimer?: NodeJS.Timeout;
  
  // State for half-open recovery
  private halfOpenSuccesses: number = 0;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    super();
    
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      failureRateThreshold: config?.failureRateThreshold ?? 0.5,
      maxConsecutiveLosses: config?.maxConsecutiveLosses ?? 3,
      maxLossAmount: config?.maxLossAmount ?? BigInt(1e18), // 1 ETH default
      maxLossPercentage: config?.maxLossPercentage ?? 10,
      timeWindow: config?.timeWindow ?? 300000, // 5 minutes
      cooldownPeriod: config?.cooldownPeriod ?? 60000, // 1 minute
      halfOpenTimeout: config?.halfOpenTimeout ?? 30000, // 30 seconds
      successThresholdToClose: config?.successThresholdToClose ?? 2,
      minHealthScore: config?.minHealthScore ?? 0.7
    };
    
    logger.info('[CircuitBreaker] Initialized', 'SAFETY');
  }

  /**
   * Check if trading is allowed
   */
  canTrade(): boolean {
    return this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return {
      ...this.metrics,
      state: this.state,
      failureRate: this.calculateFailureRate(),
      netProfit: this.metrics.totalProfit - this.metrics.totalLoss,
      timeInOpen: this.state === CircuitState.OPEN ? 
        Date.now() - this.metrics.openedAt : this.metrics.timeInOpen
    };
  }

  /**
   * Record a trade attempt result
   */
  recordTrade(result: TradeResult): void {
    this.metrics.totalAttempts++;
    
    // Add to history
    this.tradeHistory.push(result);
    this.cleanupOldHistory();
    
    if (result.success) {
      this.handleSuccess(result);
    } else {
      this.handleFailure(result);
    }
    
    // Check if circuit should open
    this.checkThresholds();
  }

  /**
   * Handle successful trade
   */
  private handleSuccess(result: TradeResult): void {
    this.metrics.successfulAttempts++;
    this.metrics.consecutiveFailures = 0;
    this.metrics.lastSuccessTime = result.timestamp;
    
    if (result.profit > BigInt(0)) {
      this.metrics.totalProfit += result.profit;
      this.metrics.consecutiveLosses = 0;
      logger.debug(`[CircuitBreaker] Profitable trade recorded: ${result.profit}`, 'SAFETY');
    } else if (result.profit < BigInt(0)) {
      this.metrics.totalLoss += -result.profit;
      this.metrics.consecutiveLosses++;
      logger.debug(`[CircuitBreaker] Loss recorded: ${result.profit}`, 'SAFETY');
    }
    
    // Handle half-open state
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses++;
      logger.info(
        `[CircuitBreaker] Success in HALF_OPEN (${this.halfOpenSuccesses}/${this.config.successThresholdToClose})`,
        'SAFETY'
      );
      
      if (this.halfOpenSuccesses >= this.config.successThresholdToClose) {
        this.closeCircuit('Recovery threshold reached');
      }
    }
  }

  /**
   * Handle failed trade
   */
  private handleFailure(result: TradeResult): void {
    this.metrics.failedAttempts++;
    this.metrics.consecutiveFailures++;
    this.metrics.lastFailureTime = result.timestamp;
    
    logger.warn(
      `[CircuitBreaker] Trade failure recorded (consecutive: ${this.metrics.consecutiveFailures})`,
      'SAFETY'
    );
    
    // Reset half-open successes on failure
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses = 0;
      logger.warn('[CircuitBreaker] Failure in HALF_OPEN, resetting recovery', 'SAFETY');
      this.openCircuit('Failure during recovery attempt');
    }
  }

  /**
   * Check if any thresholds are exceeded
   */
  private checkThresholds(): void {
    if (this.state === CircuitState.OPEN) {
      return; // Already open
    }
    
    // Check consecutive failures
    if (this.metrics.consecutiveFailures >= this.config.failureThreshold) {
      this.openCircuit(`Consecutive failures: ${this.metrics.consecutiveFailures}`);
      return;
    }
    
    // Check failure rate
    const failureRate = this.calculateFailureRate();
    if (failureRate >= this.config.failureRateThreshold) {
      this.openCircuit(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
      return;
    }
    
    // Check consecutive losses
    if (this.metrics.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      this.openCircuit(`Consecutive losses: ${this.metrics.consecutiveLosses}`);
      return;
    }
    
    // Check total loss amount
    const netLoss = this.metrics.totalLoss - this.metrics.totalProfit;
    if (netLoss > this.config.maxLossAmount) {
      this.openCircuit(`Max loss exceeded: ${netLoss} wei`);
      return;
    }
  }

  /**
   * Calculate current failure rate within time window
   */
  private calculateFailureRate(): number {
    if (this.tradeHistory.length === 0) {
      return 0;
    }
    
    const failures = this.tradeHistory.filter(t => !t.success).length;
    return failures / this.tradeHistory.length;
  }

  /**
   * Clean up old trade history outside time window
   */
  private cleanupOldHistory(): void {
    const cutoff = Date.now() - this.config.timeWindow;
    this.tradeHistory = this.tradeHistory.filter(t => t.timestamp > cutoff);
  }

  /**
   * Open the circuit (halt trading)
   */
  private openCircuit(reason: string): void {
    if (this.state === CircuitState.OPEN) {
      return;
    }
    
    const previousState = this.state;
    this.state = CircuitState.OPEN;
    this.metrics.openedAt = Date.now();
    this.metrics.openCount++;
    
    logger.error(`[CircuitBreaker] Circuit OPENED: ${reason}`, 'SAFETY');
    
    // Clear any existing timers
    this.clearTimers();
    
    // Start cooldown period
    this.cooldownTimer = setTimeout(() => {
      this.enterHalfOpen();
    }, this.config.cooldownPeriod);
    
    // Emit event
    this.emit('circuit-opened', {
      reason,
      metrics: this.getMetrics(),
      previousState
    });
  }

  /**
   * Enter half-open state (testing recovery)
   */
  private enterHalfOpen(): void {
    if (this.state !== CircuitState.OPEN) {
      return;
    }
    
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenSuccesses = 0;
    this.metrics.timeInOpen += Date.now() - this.metrics.openedAt;
    
    logger.info('[CircuitBreaker] Entering HALF_OPEN state for recovery test', 'SAFETY');
    
    // Set timeout for half-open state
    this.halfOpenTimer = setTimeout(() => {
      if (this.state === CircuitState.HALF_OPEN) {
        logger.warn('[CircuitBreaker] HALF_OPEN timeout, re-opening circuit', 'SAFETY');
        this.openCircuit('Half-open timeout without sufficient successes');
      }
    }, this.config.halfOpenTimeout);
    
    // Emit event
    this.emit('half-open', {
      metrics: this.getMetrics()
    });
  }

  /**
   * Close the circuit (resume trading)
   */
  private closeCircuit(reason: string): void {
    if (this.state === CircuitState.CLOSED) {
      return;
    }
    
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    
    // Update time in open if we were open
    if (previousState === CircuitState.OPEN) {
      this.metrics.timeInOpen += Date.now() - this.metrics.openedAt;
    }
    
    // Reset consecutive counters
    this.metrics.consecutiveFailures = 0;
    this.metrics.consecutiveLosses = 0;
    this.halfOpenSuccesses = 0;
    
    logger.info(`[CircuitBreaker] Circuit CLOSED: ${reason}`, 'SAFETY');
    
    // Clear timers
    this.clearTimers();
    
    // Emit event
    this.emit('circuit-closed', {
      reason,
      metrics: this.getMetrics(),
      previousState
    });
  }

  /**
   * Manually open the circuit (emergency stop)
   */
  forceOpen(reason: string): void {
    logger.warn(`[CircuitBreaker] Manual circuit open: ${reason}`, 'SAFETY');
    this.openCircuit(`MANUAL: ${reason}`);
  }

  /**
   * Manually close the circuit (override)
   */
  forceClose(reason: string): void {
    logger.warn(`[CircuitBreaker] Manual circuit close: ${reason}`, 'SAFETY');
    this.closeCircuit(`MANUAL: ${reason}`);
  }

  /**
   * Update system health score
   */
  updateHealthScore(score: number): void {
    if (score < this.config.minHealthScore && this.state === CircuitState.CLOSED) {
      this.openCircuit(`Low health score: ${score.toFixed(2)}`);
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    logger.info('[CircuitBreaker] Resetting metrics', 'SAFETY');
    
    this.metrics = {
      state: this.state,
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      consecutiveFailures: 0,
      consecutiveLosses: 0,
      totalProfit: BigInt(0),
      totalLoss: BigInt(0),
      netProfit: BigInt(0),
      failureRate: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      openedAt: this.state === CircuitState.OPEN ? Date.now() : 0,
      openCount: 0,
      timeInOpen: 0
    };
    
    this.tradeHistory = [];
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = undefined;
    }
    if (this.halfOpenTimer) {
      clearTimeout(this.halfOpenTimer);
      this.halfOpenTimer = undefined;
    }
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    logger.info('[CircuitBreaker] Shutting down', 'SAFETY');
    this.clearTimers();
    this.removeAllListeners();
  }
}
