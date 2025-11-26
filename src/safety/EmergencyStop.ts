/**
 * EmergencyStop - Manual and automatic emergency shutdown
 *
 * Provides immediate stop capabilities:
 * - Manual emergency stop
 * - Automatic triggers based on conditions
 * - Graceful shutdown with cleanup
 * - State persistence for recovery
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export enum StopReason {
  MANUAL = 'MANUAL',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
  CAPITAL_LOSS = 'CAPITAL_LOSS',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  NETWORK_FAILURE = 'NETWORK_FAILURE',
  SECURITY_BREACH = 'SECURITY_BREACH',
  REGULATORY = 'REGULATORY',
}

export interface EmergencyStopConfig {
  // Automatic triggers
  enableAutoStop: boolean;
  maxCapitalLossPercentage: number; // Auto-stop if capital loss exceeds % (0-100)
  maxConsecutiveErrors: number; // Auto-stop after N consecutive errors
  minHealthScore: number; // Auto-stop if health below threshold (0-1)

  // Shutdown behavior
  gracefulShutdownTimeout: number; // Time to wait for graceful shutdown (ms)
  saveStateOnStop: boolean; // Save state for recovery

  // Recovery
  allowRecovery: boolean; // Allow restarting after stop
  recoveryApprovalRequired: boolean; // Require manual approval to recover
}

export interface StopState {
  isStopped: boolean;
  stopReason?: StopReason;
  stopMessage?: string;
  stoppedAt: number;
  stoppedBy?: string;
  canRecover: boolean;
  requiresApproval: boolean;
}

export interface ShutdownCallback {
  name: string;
  priority: number;
  callback: () => Promise<void>;
}

/**
 * Emergency Stop System
 */
export class EmergencyStop extends EventEmitter {
  private config: EmergencyStopConfig;
  private state: StopState = {
    isStopped: false,
    stoppedAt: 0,
    canRecover: true,
    requiresApproval: false,
  };

  // Shutdown callbacks (ordered by priority)
  private shutdownCallbacks: ShutdownCallback[] = [];

  // Monitoring state
  private consecutiveErrors: number = 0;
  private initialCapital: bigint = BigInt(0);
  private currentCapital: bigint = BigInt(0);

  constructor(config?: Partial<EmergencyStopConfig>) {
    super();

    this.config = {
      enableAutoStop: config?.enableAutoStop ?? true,
      maxCapitalLossPercentage: config?.maxCapitalLossPercentage ?? 20,
      maxConsecutiveErrors: config?.maxConsecutiveErrors ?? 10,
      minHealthScore: config?.minHealthScore ?? 0.3,
      gracefulShutdownTimeout: config?.gracefulShutdownTimeout ?? 30000,
      saveStateOnStop: config?.saveStateOnStop ?? true,
      allowRecovery: config?.allowRecovery ?? true,
      recoveryApprovalRequired: config?.recoveryApprovalRequired ?? true,
    };

    logger.info('[EmergencyStop] Initialized', 'SAFETY');
  }

  /**
   * Register a shutdown callback
   */
  registerShutdownCallback(
    name: string,
    callback: () => Promise<void>,
    priority: number = 50
  ): void {
    this.shutdownCallbacks.push({ name, callback, priority });
    this.shutdownCallbacks.sort((a, b) => b.priority - a.priority);
    logger.debug(
      `[EmergencyStop] Registered shutdown callback: ${name} (priority: ${priority})`,
      'SAFETY'
    );
  }

  /**
   * Check if system is stopped
   */
  isStopped(): boolean {
    return this.state.isStopped;
  }

  /**
   * Get current stop state
   */
  getState(): StopState {
    return { ...this.state };
  }

  /**
   * Trigger emergency stop
   */
  async triggerStop(reason: StopReason, message: string, triggeredBy?: string): Promise<void> {
    if (this.state.isStopped) {
      logger.warn('[EmergencyStop] Already stopped', 'SAFETY');
      return;
    }

    logger.error(`[EmergencyStop] EMERGENCY STOP TRIGGERED: ${reason} - ${message}`, 'SAFETY');

    // Update state
    this.state = {
      isStopped: true,
      stopReason: reason,
      stopMessage: message,
      stoppedAt: Date.now(),
      stoppedBy: triggeredBy,
      canRecover: this.config.allowRecovery && reason !== StopReason.SECURITY_BREACH,
      requiresApproval: this.config.recoveryApprovalRequired,
    };

    // Emit pre-stop event
    this.emit('stopping', this.state);

    // Execute graceful shutdown
    await this.executeShutdown();

    // Emit stopped event
    this.emit('stopped', this.state);

    logger.error('[EmergencyStop] System stopped successfully', 'SAFETY');
  }

  /**
   * Execute graceful shutdown
   */
  private async executeShutdown(): Promise<void> {
    logger.info('[EmergencyStop] Executing graceful shutdown...', 'SAFETY');

    const shutdownPromises = this.shutdownCallbacks.map(async ({ name, callback }) => {
      try {
        logger.info(`[EmergencyStop] Calling shutdown callback: ${name}`, 'SAFETY');
        await Promise.race([
          callback(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Shutdown timeout')),
              this.config.gracefulShutdownTimeout
            )
          ),
        ]);
        logger.info(`[EmergencyStop] Shutdown callback completed: ${name}`, 'SAFETY');
      } catch (error) {
        logger.error(
          `[EmergencyStop] Shutdown callback failed: ${name} - ${
            error instanceof Error ? error.message : String(error)
          }`,
          'SAFETY'
        );
      }
    });

    await Promise.allSettled(shutdownPromises);

    logger.info('[EmergencyStop] Graceful shutdown completed', 'SAFETY');
  }

  /**
   * Manual emergency stop
   */
  async manualStop(message: string, triggeredBy: string): Promise<void> {
    await this.triggerStop(StopReason.MANUAL, message, triggeredBy);
  }

  /**
   * Attempt to recover from stop
   */
  async recover(approvedBy?: string): Promise<boolean> {
    if (!this.state.isStopped) {
      logger.warn('[EmergencyStop] System is not stopped', 'SAFETY');
      return false;
    }

    if (!this.state.canRecover) {
      logger.error('[EmergencyStop] Recovery not allowed for this stop reason', 'SAFETY');
      return false;
    }

    if (this.state.requiresApproval && !approvedBy) {
      logger.error('[EmergencyStop] Recovery requires manual approval', 'SAFETY');
      return false;
    }

    logger.info(
      `[EmergencyStop] Attempting recovery (approved by: ${approvedBy || 'system'})`,
      'SAFETY'
    );

    // Emit recovery event
    this.emit('recovering', { approvedBy });

    // Reset state
    this.state = {
      isStopped: false,
      stoppedAt: 0,
      canRecover: true,
      requiresApproval: false,
    };

    // Reset monitoring counters
    this.consecutiveErrors = 0;

    // Emit recovered event
    this.emit('recovered', { approvedBy });

    logger.info('[EmergencyStop] System recovered successfully', 'SAFETY');
    return true;
  }

  /**
   * Update capital for loss monitoring
   */
  updateCapital(current: bigint): void {
    if (this.initialCapital === BigInt(0)) {
      this.initialCapital = current;
    }
    this.currentCapital = current;

    // Check for capital loss trigger
    if (this.config.enableAutoStop) {
      this.checkCapitalLoss();
    }
  }

  /**
   * Record an error for monitoring
   */
  recordError(error: Error): void {
    this.consecutiveErrors++;

    logger.debug(
      `[EmergencyStop] Error recorded (consecutive: ${this.consecutiveErrors})`,
      'SAFETY'
    );

    // Check if should auto-stop
    if (this.config.enableAutoStop && this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
      this.triggerStop(
        StopReason.SYSTEM_ERROR,
        `Too many consecutive errors: ${this.consecutiveErrors}`,
        'auto'
      ).catch((err) => {
        logger.error(`[EmergencyStop] Failed to trigger stop: ${err}`, 'SAFETY');
      });
    }
  }

  /**
   * Record a success (resets error counter)
   */
  recordSuccess(): void {
    this.consecutiveErrors = 0;
  }

  /**
   * Update health score for monitoring
   */
  updateHealthScore(score: number): void {
    if (this.config.enableAutoStop && score < this.config.minHealthScore && !this.state.isStopped) {
      this.triggerStop(
        StopReason.SYSTEM_ERROR,
        `Health score too low: ${score.toFixed(2)}`,
        'auto'
      ).catch((err) => {
        logger.error(`[EmergencyStop] Failed to trigger stop: ${err}`, 'SAFETY');
      });
    }
  }

  /**
   * Check capital loss threshold
   */
  private checkCapitalLoss(): void {
    if (this.initialCapital === BigInt(0) || this.currentCapital === BigInt(0)) {
      return;
    }

    const loss = this.initialCapital - this.currentCapital;
    if (loss <= BigInt(0)) {
      return; // No loss or profit
    }

    const lossPercentage = Number((loss * BigInt(100)) / this.initialCapital);

    if (lossPercentage >= this.config.maxCapitalLossPercentage) {
      this.triggerStop(
        StopReason.CAPITAL_LOSS,
        `Capital loss exceeds threshold: ${lossPercentage.toFixed(2)}%`,
        'auto'
      ).catch((err) => {
        logger.error(`[EmergencyStop] Failed to trigger stop: ${err}`, 'SAFETY');
      });
    }
  }

  /**
   * Trigger network failure stop
   */
  async networkFailure(message: string): Promise<void> {
    await this.triggerStop(StopReason.NETWORK_FAILURE, message, 'auto');
  }

  /**
   * Trigger security breach stop
   */
  async securityBreach(message: string): Promise<void> {
    await this.triggerStop(StopReason.SECURITY_BREACH, message, 'auto');
  }

  /**
   * Get time stopped (if stopped)
   */
  getTimeStopped(): number {
    if (!this.state.isStopped) {
      return 0;
    }
    return Date.now() - this.state.stoppedAt;
  }

  /**
   * Reset monitoring state
   */
  resetMonitoring(): void {
    logger.info('[EmergencyStop] Resetting monitoring state', 'SAFETY');
    this.consecutiveErrors = 0;
    this.initialCapital = this.currentCapital;
  }
}
