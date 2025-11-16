/**
 * ExecutionMetrics - Transaction and Execution Monitoring
 * 
 * Comprehensive metrics tracking for arbitrage executions:
 * - Transaction lifecycle events
 * - Success/failure rates
 * - Gas usage statistics
 * - Profit tracking
 * - Nonce management metrics
 */

export enum ExecutionEventType {
  SIMULATION_ATTEMPT = 'SIMULATION_ATTEMPT',
  SIMULATION_SUCCESS = 'SIMULATION_SUCCESS',
  SIMULATION_FAILED = 'SIMULATION_FAILED',
  TX_SUBMITTED = 'TX_SUBMITTED',
  TX_CONFIRMED = 'TX_CONFIRMED',
  TX_FAILED = 'TX_FAILED',
  TX_REVERTED = 'TX_REVERTED',
  NONCE_INCREMENTED = 'NONCE_INCREMENTED',
  NONCE_RESYNC = 'NONCE_RESYNC',
  OPPORTUNITY_FOUND = 'OPPORTUNITY_FOUND',
  OPPORTUNITY_EXECUTED = 'OPPORTUNITY_EXECUTED'
}

export interface ExecutionEvent {
  timestamp: number;
  type: ExecutionEventType;
  executionId?: string;
  txHash?: string;
  details: Record<string, any>;
}

export interface ExecutionStats {
  totalOpportunities: number;
  simulationAttempts: number;
  simulationSuccesses: number;
  simulationFailures: number;
  transactionsSubmitted: number;
  transactionsConfirmed: number;
  transactionsFailed: number;
  transactionsReverted: number;
  totalGasUsed: bigint;
  totalProfitEth: number;
  nonceResyncs: number;
  averageConfirmationTime: number;
}

export class ExecutionMetrics {
  private events: ExecutionEvent[] = [];
  private maxEvents: number;
  private stats: ExecutionStats;
  
  constructor(maxEvents: number = 10000) {
    this.maxEvents = maxEvents;
    this.stats = {
      totalOpportunities: 0,
      simulationAttempts: 0,
      simulationSuccesses: 0,
      simulationFailures: 0,
      transactionsSubmitted: 0,
      transactionsConfirmed: 0,
      transactionsFailed: 0,
      transactionsReverted: 0,
      totalGasUsed: BigInt(0),
      totalProfitEth: 0,
      nonceResyncs: 0,
      averageConfirmationTime: 0
    };
  }
  
  /**
   * Record an execution event
   */
  recordEvent(type: ExecutionEventType, details: Record<string, any> = {}): void {
    const event: ExecutionEvent = {
      timestamp: Date.now(),
      type,
      details
    };
    
    // Add to events log
    this.events.push(event);
    
    // Trim if exceeds max
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    
    // Update stats
    this.updateStats(type, details);
    
    // Log event
    this.logEvent(event);
  }
  
  /**
   * Update statistics based on event
   */
  private updateStats(type: ExecutionEventType, details: Record<string, any>): void {
    switch (type) {
      case ExecutionEventType.OPPORTUNITY_FOUND:
        this.stats.totalOpportunities++;
        break;
      
      case ExecutionEventType.SIMULATION_ATTEMPT:
        this.stats.simulationAttempts++;
        break;
      
      case ExecutionEventType.SIMULATION_SUCCESS:
        this.stats.simulationSuccesses++;
        break;
      
      case ExecutionEventType.SIMULATION_FAILED:
        this.stats.simulationFailures++;
        break;
      
      case ExecutionEventType.TX_SUBMITTED:
        this.stats.transactionsSubmitted++;
        break;
      
      case ExecutionEventType.TX_CONFIRMED:
        this.stats.transactionsConfirmed++;
        if (details.gasUsed) {
          this.stats.totalGasUsed += BigInt(details.gasUsed);
        }
        if (details.profit) {
          this.stats.totalProfitEth += Number(details.profit);
        }
        break;
      
      case ExecutionEventType.TX_FAILED:
        this.stats.transactionsFailed++;
        break;
      
      case ExecutionEventType.TX_REVERTED:
        this.stats.transactionsReverted++;
        break;
      
      case ExecutionEventType.NONCE_RESYNC:
        this.stats.nonceResyncs++;
        break;
    }
  }
  
  /**
   * Log event with structured formatting
   */
  private logEvent(event: ExecutionEvent): void {
    const emoji = this.getEventEmoji(event.type);
    const severity = this.getEventSeverity(event.type);
    
    const logMessage = `${emoji} [ExecutionMetrics] [${severity}] ${event.type}`;
    
    switch (severity) {
      case 'ERROR':
        console.error(logMessage, event.details);
        break;
      case 'WARN':
        console.warn(logMessage, event.details);
        break;
      case 'INFO':
        console.log(logMessage, event.details);
        break;
      default:
        console.debug(logMessage, event.details);
    }
  }
  
  /**
   * Get emoji for event type
   */
  private getEventEmoji(type: ExecutionEventType): string {
    const emojiMap: Record<ExecutionEventType, string> = {
      [ExecutionEventType.SIMULATION_ATTEMPT]: '🔬',
      [ExecutionEventType.SIMULATION_SUCCESS]: '✅',
      [ExecutionEventType.SIMULATION_FAILED]: '❌',
      [ExecutionEventType.TX_SUBMITTED]: '📤',
      [ExecutionEventType.TX_CONFIRMED]: '✔️',
      [ExecutionEventType.TX_FAILED]: '💥',
      [ExecutionEventType.TX_REVERTED]: '🔄',
      [ExecutionEventType.NONCE_INCREMENTED]: '➕',
      [ExecutionEventType.NONCE_RESYNC]: '🔁',
      [ExecutionEventType.OPPORTUNITY_FOUND]: '💡',
      [ExecutionEventType.OPPORTUNITY_EXECUTED]: '⚡'
    };
    return emojiMap[type] || '📊';
  }
  
  /**
   * Get severity level for event type
   */
  private getEventSeverity(type: ExecutionEventType): string {
    const errorEvents = [
      ExecutionEventType.SIMULATION_FAILED,
      ExecutionEventType.TX_FAILED,
      ExecutionEventType.TX_REVERTED
    ];
    
    const warnEvents = [
      ExecutionEventType.NONCE_RESYNC
    ];
    
    if (errorEvents.includes(type)) return 'ERROR';
    if (warnEvents.includes(type)) return 'WARN';
    return 'INFO';
  }
  
  /**
   * Get current statistics
   */
  getStats(): ExecutionStats {
    return { ...this.stats };
  }
  
  /**
   * Get recent events
   */
  getRecentEvents(count: number = 100): ExecutionEvent[] {
    return this.events.slice(-count);
  }
  
  /**
   * Get events by type
   */
  getEventsByType(type: ExecutionEventType): ExecutionEvent[] {
    return this.events.filter(e => e.type === type);
  }
  
  /**
   * Get success rate for simulations
   */
  getSimulationSuccessRate(): number {
    if (this.stats.simulationAttempts === 0) return 0;
    return (this.stats.simulationSuccesses / this.stats.simulationAttempts) * 100;
  }
  
  /**
   * Get success rate for transactions
   */
  getTransactionSuccessRate(): number {
    if (this.stats.transactionsSubmitted === 0) return 0;
    return (this.stats.transactionsConfirmed / this.stats.transactionsSubmitted) * 100;
  }
  
  /**
   * Print summary report
   */
  printSummary(): void {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║        Execution Metrics Summary Report            ║');
    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║ Opportunities Found:        ${String(this.stats.totalOpportunities).padStart(18)} ║`);
    console.log(`║ Simulations Attempted:      ${String(this.stats.simulationAttempts).padStart(18)} ║`);
    console.log(`║ Simulation Success Rate:    ${String(this.getSimulationSuccessRate().toFixed(2) + '%').padStart(18)} ║`);
    console.log('╟──────────────────────────────────────────────────────╢');
    console.log(`║ Transactions Submitted:     ${String(this.stats.transactionsSubmitted).padStart(18)} ║`);
    console.log(`║ Transactions Confirmed:     ${String(this.stats.transactionsConfirmed).padStart(18)} ║`);
    console.log(`║ Transaction Success Rate:   ${String(this.getTransactionSuccessRate().toFixed(2) + '%').padStart(18)} ║`);
    console.log('╟──────────────────────────────────────────────────────╢');
    console.log(`║ Total Gas Used:             ${String(this.stats.totalGasUsed.toString()).padStart(18)} ║`);
    console.log(`║ Total Profit (ETH):         ${String(this.stats.totalProfitEth.toFixed(4)).padStart(18)} ║`);
    console.log(`║ Nonce Resyncs:              ${String(this.stats.nonceResyncs).padStart(18)} ║`);
    console.log('╚══════════════════════════════════════════════════════╝\n');
  }
  
  /**
   * Reset all metrics
   */
  reset(): void {
    this.events = [];
    this.stats = {
      totalOpportunities: 0,
      simulationAttempts: 0,
      simulationSuccesses: 0,
      simulationFailures: 0,
      transactionsSubmitted: 0,
      transactionsConfirmed: 0,
      transactionsFailed: 0,
      transactionsReverted: 0,
      totalGasUsed: BigInt(0),
      totalProfitEth: 0,
      nonceResyncs: 0,
      averageConfirmationTime: 0
    };
    console.log('[ExecutionMetrics] Metrics reset');
  }
}
