/**
 * Price Oracle Validator
 * 
 * Implements defensive security patterns learned from LiquidETHV1 Oracle vulnerability
 * (HackerOne Report #3463813):
 * 
 * 1. Rate-of-Change Limits: Prevent sudden price manipulation
 * 2. Bounds Checking: Min/max price validation
 * 3. Timelock Protection: Delay for critical updates
 * 4. Circuit Breaker: Emergency pause functionality
 * 
 * These patterns protect TheWarden from oracle manipulation attacks that could
 * compromise CEX-DEX arbitrage pricing and lead to financial loss.
 */

export interface PriceValidationConfig {
  // Minimum valid price (in base units, e.g., wei)
  minPrice: bigint;
  
  // Maximum valid price (in base units)
  maxPrice: bigint;
  
  // Maximum rate-of-change per update (basis points, 500 = 5%)
  maxRateChangeBps: number;
  
  // Timelock delay for price updates (seconds)
  timelockDelay: number;
  
  // Enable circuit breaker (pause on anomalies)
  circuitBreakerEnabled: boolean;
  
  // Maximum price deviation before circuit breaker triggers (%)
  circuitBreakerThreshold: number;
  
  // Price staleness threshold (seconds)
  maxPriceAge: number;
}

export interface PriceUpdate {
  symbol: string;
  price: bigint;
  source: string;
  timestamp: number;
  signature?: string; // Multi-sig signature (future enhancement)
}

export interface PendingPriceUpdate extends PriceUpdate {
  proposedAt: number;
  executionTime: number; // When update can be executed
  proposer: string;
}

export interface PriceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    oldPrice?: bigint;
    newPrice: bigint;
    changePercent?: number;
    withinBounds: boolean;
    rateChangeValid: boolean;
    timelockRequired: boolean;
    circuitBreakerActive: boolean;
  };
}

/**
 * Price Oracle Validator with defensive security patterns
 */
export class PriceOracleValidator {
  private config: PriceValidationConfig;
  private currentPrices: Map<string, PriceUpdate>;
  private pendingUpdates: Map<string, PendingPriceUpdate>;
  private priceHistory: Map<string, PriceUpdate[]>;
  private circuitBreakerActive: boolean;
  private lastUpdateTime: Map<string, number>;

  constructor(config: Partial<PriceValidationConfig> = {}) {
    this.config = {
      minPrice: BigInt(config.minPrice ?? 1000000000000000n), // 0.001 ETH default
      maxPrice: BigInt(config.maxPrice ?? 100000000000000000000n), // 100 ETH default
      maxRateChangeBps: config.maxRateChangeBps ?? 500, // 5% max change
      timelockDelay: config.timelockDelay ?? 3600, // 1 hour default
      circuitBreakerEnabled: config.circuitBreakerEnabled ?? true,
      circuitBreakerThreshold: config.circuitBreakerThreshold ?? 10, // 10% threshold
      maxPriceAge: config.maxPriceAge ?? 300, // 5 minutes default
    };

    this.currentPrices = new Map();
    this.pendingUpdates = new Map();
    this.priceHistory = new Map();
    this.circuitBreakerActive = false;
    this.lastUpdateTime = new Map();
  }

  /**
   * Validate a price update against all security checks
   * 
   * Implements learnings from LiquidETHV1 vulnerability:
   * - Bounds checking (min/max)
   * - Rate-of-change limits
   * - Circuit breaker detection
   * - Staleness checks
   */
  validatePriceUpdate(update: PriceUpdate): PriceValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if circuit breaker is active
    if (this.circuitBreakerActive) {
      errors.push('Circuit breaker is active - all price updates blocked');
      return {
        valid: false,
        errors,
        warnings,
        metadata: {
          newPrice: update.price,
          withinBounds: false,
          rateChangeValid: false,
          timelockRequired: false,
          circuitBreakerActive: true,
        },
      };
    }

    // 1. BOUNDS CHECKING (Lesson from LiquidETHV1: No min/max bounds)
    const withinBounds = this.checkBounds(update.price);
    if (!withinBounds) {
      errors.push(
        `Price ${update.price} outside allowed range [${this.config.minPrice}, ${this.config.maxPrice}]`
      );
    }

    // Get current price for this symbol
    const currentPrice = this.currentPrices.get(update.symbol);
    
    // 2. RATE-OF-CHANGE VALIDATION (Lesson from LiquidETHV1: No rate limits)
    // Note: Skip rate-of-change check for first price (no previous price to compare)
    let rateChangeValid = true;
    let changePercent: number | undefined;
    
    if (currentPrice) {
      const changeResult = this.checkRateOfChange(currentPrice.price, update.price);
      rateChangeValid = changeResult.valid;
      changePercent = changeResult.changePercent;
      
      if (!rateChangeValid) {
        errors.push(
          `Rate of change ${changePercent.toFixed(2)}% exceeds maximum ${
            this.config.maxRateChangeBps / 100
          }%`
        );
      }

      // 3. CIRCUIT BREAKER CHECK (Lesson from LiquidETHV1: No emergency pause)
      if (
        this.config.circuitBreakerEnabled &&
        Math.abs(changePercent) > this.config.circuitBreakerThreshold
      ) {
        warnings.push(
          `Large price movement detected (${changePercent.toFixed(2)}%), circuit breaker threshold: ${
            this.config.circuitBreakerThreshold
          }%`
        );
        
        // Auto-trigger circuit breaker for extreme movements
        if (Math.abs(changePercent) > this.config.circuitBreakerThreshold * 2) {
          this.triggerCircuitBreaker(`Extreme price movement: ${changePercent.toFixed(2)}%`);
          errors.push('Circuit breaker auto-triggered due to extreme price movement');
        }
      }
    }

    // 4. STALENESS CHECK
    const now = Date.now();
    const age = (now - update.timestamp) / 1000; // seconds
    
    if (age > this.config.maxPriceAge) {
      warnings.push(`Price data is stale (${age.toFixed(0)}s old, max: ${this.config.maxPriceAge}s)`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        oldPrice: currentPrice?.price,
        newPrice: update.price,
        changePercent,
        withinBounds,
        rateChangeValid,
        timelockRequired: this.config.timelockDelay > 0,
        circuitBreakerActive: this.circuitBreakerActive,
      },
    };
  }

  /**
   * Propose a price update (for timelock pattern)
   * 
   * Implements lesson from LiquidETHV1: No timelock = users can't exit
   */
  proposePriceUpdate(update: PriceUpdate, proposer: string): {
    success: boolean;
    executionTime?: number;
    errors: string[];
  } {
    // Validate the proposed price
    const validation = this.validatePriceUpdate(update);
    
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // Calculate execution time (now + timelock delay)
    const executionTime = Date.now() + this.config.timelockDelay * 1000;

    // Create pending update
    const pendingUpdate: PendingPriceUpdate = {
      ...update,
      proposedAt: Date.now(),
      executionTime,
      proposer,
    };

    this.pendingUpdates.set(update.symbol, pendingUpdate);

    return {
      success: true,
      executionTime,
      errors: [],
    };
  }

  /**
   * Execute a pending price update (after timelock)
   */
  executePendingUpdate(symbol: string): {
    success: boolean;
    errors: string[];
  } {
    const pending = this.pendingUpdates.get(symbol);
    
    if (!pending) {
      return {
        success: false,
        errors: [`No pending update found for ${symbol}`],
      };
    }

    // Check if timelock has elapsed
    const now = Date.now();
    if (now < pending.executionTime) {
      const remainingSeconds = Math.ceil((pending.executionTime - now) / 1000);
      return {
        success: false,
        errors: [`Timelock active - ${remainingSeconds}s remaining`],
      };
    }

    // Re-validate at execution time (prices may have changed)
    const validation = this.validatePriceUpdate(pending);
    
    if (!validation.valid) {
      // Clear the pending update if no longer valid
      this.pendingUpdates.delete(symbol);
      return {
        success: false,
        errors: [`Update no longer valid: ${validation.errors.join(', ')}`],
      };
    }

    // Execute the update
    this.currentPrices.set(symbol, pending);
    this.lastUpdateTime.set(symbol, now);
    
    // Add to history
    const history = this.priceHistory.get(symbol) || [];
    history.push(pending);
    
    // Keep last 100 entries
    if (history.length > 100) {
      history.shift();
    }
    this.priceHistory.set(symbol, history);

    // Clear pending update
    this.pendingUpdates.delete(symbol);

    return {
      success: true,
      errors: [],
    };
  }

  /**
   * Get current price for a symbol
   */
  getCurrentPrice(symbol: string): PriceUpdate | undefined {
    return this.currentPrices.get(symbol);
  }

  /**
   * Get pending update for a symbol
   */
  getPendingUpdate(symbol: string): PendingPriceUpdate | undefined {
    return this.pendingUpdates.get(symbol);
  }

  /**
   * Check if price is within configured bounds
   */
  private checkBounds(price: bigint): boolean {
    return price >= this.config.minPrice && price <= this.config.maxPrice;
  }

  /**
   * Check rate-of-change limits
   */
  private checkRateOfChange(
    oldPrice: bigint,
    newPrice: bigint
  ): { valid: boolean; changePercent: number } {
    // Calculate percentage change
    const priceDiff = newPrice - oldPrice;
    const changePercent = Number((priceDiff * 10000n) / oldPrice) / 100;

    // Check if within allowed rate-of-change
    const maxChange = this.config.maxRateChangeBps / 100;
    const valid = Math.abs(changePercent) <= maxChange;

    return { valid, changePercent };
  }

  /**
   * Trigger circuit breaker (emergency pause)
   * 
   * Implements lesson from LiquidETHV1: No emergency stop mechanism
   */
  triggerCircuitBreaker(reason: string): void {
    if (!this.config.circuitBreakerEnabled) {
      return;
    }

    this.circuitBreakerActive = true;
    console.error(`[CIRCUIT BREAKER] Triggered: ${reason}`);
    
    // Emit event for monitoring systems
    // In production, this would trigger alerts, notifications, etc.
  }

  /**
   * Reset circuit breaker (requires manual intervention)
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerActive = false;
    console.log('[CIRCUIT BREAKER] Reset');
  }

  /**
   * Check if circuit breaker is active
   */
  isCircuitBreakerActive(): boolean {
    return this.circuitBreakerActive;
  }

  /**
   * Get price history for a symbol
   */
  getPriceHistory(symbol: string): PriceUpdate[] {
    return this.priceHistory.get(symbol) || [];
  }

  /**
   * Check if price is stale
   */
  isPriceStale(symbol: string): boolean {
    const lastUpdate = this.lastUpdateTime.get(symbol);
    if (!lastUpdate) {
      return true;
    }

    const age = (Date.now() - lastUpdate) / 1000;
    return age > this.config.maxPriceAge;
  }

  /**
   * Get statistics for monitoring
   */
  getStats(): {
    symbolsTracked: number;
    pendingUpdates: number;
    circuitBreakerActive: boolean;
    stalePrices: string[];
  } {
    const stalePrices: string[] = [];
    
    for (const [symbol] of this.currentPrices) {
      if (this.isPriceStale(symbol)) {
        stalePrices.push(symbol);
      }
    }

    return {
      symbolsTracked: this.currentPrices.size,
      pendingUpdates: this.pendingUpdates.size,
      circuitBreakerActive: this.circuitBreakerActive,
      stalePrices,
    };
  }
}
