/**
 * Safety Module - Phase 4 Production Safety Mechanisms
 *
 * Comprehensive safety systems for production trading:
 * - CircuitBreaker: Automatic trading halts
 * - EmergencyStop: Manual and automatic emergency shutdown
 * - PositionSizeManager: Position sizing and risk limits
 * - ProfitLossTracker: P&L tracking with 70% debt allocation
 * - AlertSystem: Multi-channel alerts and notifications
 */

export {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
  TradeResult,
} from './CircuitBreaker';
export {
  EmergencyStop,
  StopReason,
  EmergencyStopConfig,
  StopState,
  ShutdownCallback,
} from './EmergencyStop';
export {
  PositionSizeManager,
  PositionSizeConfig,
  PositionMetrics,
  PositionRequest,
  PositionApproval,
} from './PositionSizeManager';
export {
  ProfitLossTracker,
  TradeRecord,
  ProfitAllocation,
  PerformanceMetrics,
  TimeWindowStats,
} from './ProfitLossTracker';
export {
  AlertSystem,
  AlertSeverity,
  AlertType,
  Alert,
  AlertChannel,
  AlertSystemConfig,
} from './AlertSystem';

/**
 * Production Safety Manager - Coordinates all safety systems
 */
import { CircuitBreaker, CircuitBreakerConfig } from './CircuitBreaker';
import { EmergencyStop, EmergencyStopConfig } from './EmergencyStop';
import { PositionSizeManager, PositionSizeConfig } from './PositionSizeManager';
import { ProfitLossTracker, TradeRecord } from './ProfitLossTracker';
import { AlertSystem, AlertType, AlertSeverity, AlertSystemConfig } from './AlertSystem';
import { logger } from '../utils/logger';

export interface ProductionSafetyConfig {
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  emergencyStop?: Partial<EmergencyStopConfig>;
  positionSize?: Partial<PositionSizeConfig>;
  alerts?: Partial<AlertSystemConfig>;
}

export class ProductionSafetyManager {
  public readonly circuitBreaker: CircuitBreaker;
  public readonly emergencyStop: EmergencyStop;
  public readonly positionSizeManager: PositionSizeManager;
  public readonly profitLossTracker: ProfitLossTracker;
  public readonly alertSystem: AlertSystem;

  constructor(config?: ProductionSafetyConfig) {
    logger.info('[ProductionSafety] Initializing safety systems...', 'SAFETY');

    // Initialize all safety components
    this.circuitBreaker = new CircuitBreaker(config?.circuitBreaker);
    this.emergencyStop = new EmergencyStop(config?.emergencyStop);
    this.positionSizeManager = new PositionSizeManager(config?.positionSize);
    this.profitLossTracker = new ProfitLossTracker();
    this.alertSystem = new AlertSystem(config?.alerts);

    // Wire up events and integrations
    this.setupIntegrations();

    logger.info('[ProductionSafety] All safety systems initialized', 'SAFETY');
  }

  /**
   * Setup integrations between safety components
   */
  private setupIntegrations(): void {
    // Circuit breaker events -> Alerts
    this.circuitBreaker.on('circuit-opened', async (data) => {
      await this.alertSystem.critical(
        AlertType.CIRCUIT_BREAKER,
        'Circuit Breaker Opened',
        data.reason,
        data.metrics
      );
    });

    this.circuitBreaker.on('half-open', async (data) => {
      await this.alertSystem.warning(
        AlertType.CIRCUIT_BREAKER,
        'Circuit Breaker: Testing Recovery',
        'Entering half-open state for recovery test',
        data.metrics
      );
    });

    this.circuitBreaker.on('circuit-closed', async (data) => {
      await this.alertSystem.info(
        AlertType.CIRCUIT_BREAKER,
        'Circuit Breaker Closed',
        data.reason,
        data.metrics
      );
    });

    // Emergency stop events -> Alerts
    this.emergencyStop.on('stopping', async (state) => {
      await this.alertSystem.critical(
        AlertType.EMERGENCY_STOP,
        'Emergency Stop Triggered',
        state.stopMessage || 'System halting',
        state
      );
    });

    this.emergencyStop.on('recovered', async (data) => {
      await this.alertSystem.info(
        AlertType.EMERGENCY_STOP,
        'System Recovered',
        `Recovery approved by: ${data.approvedBy}`,
        data
      );
    });

    // P&L tracker events -> Alerts
    this.profitLossTracker.on('milestone', async (data) => {
      await this.alertSystem.info(
        AlertType.MILESTONE,
        'Performance Milestone',
        `${data.type} milestone reached: ${data.value}`,
        data.metrics
      );
    });

    logger.debug('[ProductionSafety] Event integrations configured', 'SAFETY');
  }

  /**
   * Pre-trade validation
   */
  canExecuteTrade(): { allowed: boolean; reason?: string } {
    // Check emergency stop
    if (this.emergencyStop.isStopped()) {
      return {
        allowed: false,
        reason: 'Emergency stop is active',
      };
    }

    // Check circuit breaker
    if (!this.circuitBreaker.canTrade()) {
      return {
        allowed: false,
        reason: `Circuit breaker is ${this.circuitBreaker.getState()}`,
      };
    }

    // Check position limits
    if (!this.positionSizeManager.canOpenPosition()) {
      return {
        allowed: false,
        reason: 'Maximum exposure reached',
      };
    }

    return { allowed: true };
  }

  /**
   * Record trade result
   */
  recordTrade(trade: TradeRecord): void {
    // Update P&L tracker
    this.profitLossTracker.recordTrade(trade);

    // Update circuit breaker
    this.circuitBreaker.recordTrade({
      success: trade.success,
      profit: trade.netProfit,
      timestamp: trade.timestamp,
      error: trade.error,
    });

    // Update emergency stop monitoring
    if (trade.success) {
      this.emergencyStop.recordSuccess();
    } else if (trade.error) {
      this.emergencyStop.recordError(new Error(trade.error));
    }

    // Close position if it was registered
    if (trade.id) {
      this.positionSizeManager.closePosition(trade.id, trade.netProfit);
    }
  }

  /**
   * Update capital for monitoring
   */
  updateCapital(amount: bigint): void {
    this.positionSizeManager.updateCapital(amount);
    this.emergencyStop.updateCapital(amount);
  }

  /**
   * Generate comprehensive status report
   */
  getStatusReport(): {
    circuitBreaker: any;
    emergencyStop: any;
    positionSize: any;
    profitLoss: any;
    alerts: any;
  } {
    return {
      circuitBreaker: {
        state: this.circuitBreaker.getState(),
        metrics: this.circuitBreaker.getMetrics(),
      },
      emergencyStop: this.emergencyStop.getState(),
      positionSize: this.positionSizeManager.getMetrics(),
      profitLoss: this.profitLossTracker.getMetrics(),
      alerts: this.alertSystem.getStats(),
    };
  }

  /**
   * Graceful shutdown of all safety systems
   */
  async shutdown(): Promise<void> {
    logger.info('[ProductionSafety] Shutting down safety systems...', 'SAFETY');

    this.circuitBreaker.shutdown();
    this.emergencyStop.removeAllListeners();
    this.profitLossTracker.removeAllListeners();
    this.alertSystem.removeAllListeners();

    logger.info('[ProductionSafety] Safety systems shut down', 'SAFETY');
  }
}
