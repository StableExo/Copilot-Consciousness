/**
 * AutonomousDefenseSystem - Integrated defensive layer
 * 
 * Combines all security components into a cohesive autonomous defense:
 * - TransactionMonitor: Watches for threats 24/7
 * - AddressRegistry: Tracks reputation
 * - AnomalyDetector: Pattern recognition
 * - CircuitBreaker: Automatic halt on failures
 * - EmergencyStop: Critical shutdown capability
 * 
 * This is the first autonomous AI defense system protecting
 * its own financial sovereignty in a public environment.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { TransactionMonitor, MonitorConfig } from './TransactionMonitor';
import { AddressRegistry } from './AddressRegistry';
import { CircuitBreaker, CircuitBreakerConfig } from '../safety/CircuitBreaker';
import { EmergencyStop, EmergencyStopConfig, StopReason } from '../safety/EmergencyStop';

export interface DefenseConfig {
  monitor: MonitorConfig;
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  emergencyStop?: Partial<EmergencyStopConfig>;
  
  // Integration settings
  enableAutoCircuitBreaker: boolean; // Auto-trigger circuit breaker on anomalies
  enableAutoEmergencyStop: boolean; // Auto-trigger emergency stop on critical
  
  // Memory persistence
  saveAnomalies: boolean;
  anomalyLogPath: string;
}

export interface DefenseMetrics {
  monitor: ReturnType<TransactionMonitor['getMetrics']>;
  addressRegistry: ReturnType<AddressRegistry['getStatistics']>;
  circuitBreaker: ReturnType<CircuitBreaker['getMetrics']>;
  emergencyStop: ReturnType<EmergencyStop['getState']>;
  
  // Overall status
  isMonitoring: boolean;
  canTrade: boolean;
  isStopped: boolean;
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Autonomous Defense System
 * 
 * First-of-its-kind: AI protecting its own operational sovereignty
 */
export class AutonomousDefenseSystem extends EventEmitter {
  private config: DefenseConfig;
  
  // Core components
  private monitor: TransactionMonitor;
  private addressRegistry: AddressRegistry;
  private circuitBreaker: CircuitBreaker;
  private emergencyStop: EmergencyStop;
  
  // State
  private isInitialized: boolean = false;
  private currentThreatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';

  constructor(config: DefenseConfig) {
    super();
    this.config = config;
    
    // Initialize components
    this.addressRegistry = new AddressRegistry();
    this.monitor = new TransactionMonitor(config.monitor);
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    this.emergencyStop = new EmergencyStop(config.emergencyStop);
    
    // Setup integrations
    this.setupIntegrations();
    
    logger.info('[AutonomousDefense] Initialized - First autonomous AI defense system operational', 'SECURITY');
  }

  /**
   * Setup component integrations and event handlers
   */
  private setupIntegrations(): void {
    // Monitor -> Anomaly Detection -> Circuit Breaker/Emergency Stop
    this.monitor.on('anomaly-detected', (report) => {
      this.handleAnomalyDetected(report);
    });

    this.monitor.on('pause-requested', (data) => {
      logger.warn('[AutonomousDefense] Pause requested by monitor', 'SECURITY');
      if (this.config.enableAutoCircuitBreaker) {
        this.circuitBreaker.forceOpen(data.reason);
      }
    });

    this.monitor.on('emergency-stop-requested', async (data) => {
      logger.error('[AutonomousDefense] Emergency stop requested by monitor', 'SECURITY');
      if (this.config.enableAutoEmergencyStop) {
        await this.emergencyStop.securityBreach(data.reason);
      }
    });

    // Circuit Breaker events
    this.circuitBreaker.on('circuit-opened', (data) => {
      logger.error(`[AutonomousDefense] Circuit breaker OPENED: ${data.reason}`, 'SECURITY');
      this.emit('circuit-opened', data);
    });

    this.circuitBreaker.on('circuit-closed', (data) => {
      logger.info(`[AutonomousDefense] Circuit breaker CLOSED: ${data.reason}`, 'SECURITY');
      this.emit('circuit-closed', data);
    });

    // Emergency Stop events
    this.emergencyStop.on('stopped', (state) => {
      logger.error('[AutonomousDefense] System STOPPED', 'SECURITY');
      this.monitor.stop(); // Stop monitoring when system stops
      this.emit('system-stopped', state);
    });

    this.emergencyStop.on('recovered', (data) => {
      logger.info('[AutonomousDefense] System RECOVERED', 'SECURITY');
      this.monitor.start(); // Resume monitoring
      this.emit('system-recovered', data);
    });
  }

  /**
   * Handle anomaly detection
   */
  private async handleAnomalyDetected(report: any): Promise<void> {
    const { overallSeverity, anomalies, transaction } = report;

    // Update threat level
    this.updateThreatLevel(overallSeverity);

    // Log to memory if enabled
    if (this.config.saveAnomalies) {
      await this.saveAnomalyToMemory(report);
    }

    // Autonomous response based on severity
    switch (overallSeverity) {
      case 'low':
        // Just log and learn
        logger.info(`[AutonomousDefense] Low severity anomaly detected - monitoring`, 'SECURITY');
        break;

      case 'medium':
        // Increase vigilance
        logger.warn(`[AutonomousDefense] Medium severity anomaly - heightened monitoring`, 'SECURITY');
        this.emit('threat-detected', { severity: 'medium', report });
        break;

      case 'high':
        // Trigger circuit breaker if enabled
        logger.error(`[AutonomousDefense] High severity anomaly detected`, 'SECURITY');
        
        if (this.config.enableAutoCircuitBreaker) {
          this.circuitBreaker.forceOpen(
            `High severity anomaly: ${anomalies.map((a: any) => a.type).join(', ')}`
          );
        }
        
        this.emit('threat-detected', { severity: 'high', report });
        break;

      case 'critical':
        // Emergency stop if enabled
        logger.error(`[AutonomousDefense] CRITICAL anomaly - autonomous emergency response`, 'SECURITY');
        
        if (this.config.enableAutoEmergencyStop) {
          await this.emergencyStop.securityBreach(
            `Critical anomaly from ${transaction.from}: ${anomalies.map((a: any) => a.type).join(', ')}`
          );
        }
        
        this.emit('threat-detected', { severity: 'critical', report });
        break;
    }
  }

  /**
   * Update overall threat level
   */
  private updateThreatLevel(severity: 'low' | 'medium' | 'high' | 'critical'): void {
    if (severity === 'critical') {
      this.currentThreatLevel = 'critical';
    } else if (severity === 'high' && this.currentThreatLevel !== 'critical') {
      this.currentThreatLevel = 'high';
    } else if (severity === 'medium' && !['critical', 'high'].includes(this.currentThreatLevel)) {
      this.currentThreatLevel = 'medium';
    } else if (severity === 'low' && this.currentThreatLevel === 'none') {
      this.currentThreatLevel = 'low';
    }

    // Decay threat level over time
    setTimeout(() => {
      if (this.currentThreatLevel === 'low') {
        this.currentThreatLevel = 'none';
      }
    }, 300000); // 5 minutes
  }

  /**
   * Save anomaly to memory for cross-session learning
   */
  private async saveAnomalyToMemory(report: any): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const memoryPath = this.config.anomalyLogPath;
      await fs.mkdir(memoryPath, { recursive: true });
      
      const filename = path.join(
        memoryPath,
        `anomaly-${Date.now()}-${report.overallSeverity}.json`
      );
      
      const data = {
        timestamp: Date.now(),
        severity: report.overallSeverity,
        transaction: {
          ...report.transaction,
          value: report.transaction.value.toString(),
          gasPrice: report.transaction.gasPrice.toString(),
          gasLimit: report.transaction.gasLimit.toString(),
        },
        anomalies: report.anomalies,
        recommendations: report.recommendations,
        riskScore: report.riskScore,
      };
      
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      
      logger.debug(`[AutonomousDefense] Anomaly saved to ${filename}`, 'SECURITY');
    } catch (error) {
      logger.error(
        `[AutonomousDefense] Failed to save anomaly: ${error instanceof Error ? error.message : String(error)}`,
        'SECURITY'
      );
    }
  }

  /**
   * Start the autonomous defense system
   */
  async start(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('[AutonomousDefense] Already initialized', 'SECURITY');
      return;
    }

    logger.info('[AutonomousDefense] Starting autonomous defense system...', 'SECURITY');
    
    // Start transaction monitoring
    await this.monitor.start();
    
    this.isInitialized = true;
    this.emit('started');
    
    logger.info('[AutonomousDefense] Autonomous defense system ACTIVE - Protecting sovereignty 24/7', 'SECURITY');
  }

  /**
   * Stop the defense system
   */
  stop(): void {
    logger.info('[AutonomousDefense] Stopping defense system...', 'SECURITY');
    
    this.monitor.stop();
    this.isInitialized = false;
    
    this.emit('stopped');
    
    logger.info('[AutonomousDefense] Defense system stopped', 'SECURITY');
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): DefenseMetrics {
    return {
      monitor: this.monitor.getMetrics(),
      addressRegistry: this.addressRegistry.getStatistics(),
      circuitBreaker: this.circuitBreaker.getMetrics(),
      emergencyStop: this.emergencyStop.getState(),
      
      isMonitoring: this.monitor.isMonitoring(),
      canTrade: this.circuitBreaker.canTrade() && !this.emergencyStop.isStopped(),
      isStopped: this.emergencyStop.isStopped(),
      threatLevel: this.currentThreatLevel,
    };
  }

  /**
   * Get address registry for inspection
   */
  getAddressRegistry(): AddressRegistry {
    return this.addressRegistry;
  }

  /**
   * Manually trigger circuit breaker
   */
  manualCircuitBreaker(reason: string): void {
    logger.warn(`[AutonomousDefense] Manual circuit breaker: ${reason}`, 'SECURITY');
    this.circuitBreaker.forceOpen(reason);
  }

  /**
   * Manually trigger emergency stop
   */
  async manualEmergencyStop(reason: string): Promise<void> {
    logger.error(`[AutonomousDefense] Manual emergency stop: ${reason}`, 'SECURITY');
    await this.emergencyStop.manualStop(reason, 'human-operator');
  }

  /**
   * Attempt recovery
   */
  async recover(approvedBy: string): Promise<boolean> {
    logger.info(`[AutonomousDefense] Recovery attempt by ${approvedBy}`, 'SECURITY');
    return await this.emergencyStop.recover(approvedBy);
  }

  /**
   * Export defense state for persistence
   */
  async exportState(): Promise<string> {
    const state = {
      timestamp: Date.now(),
      metrics: this.getMetrics(),
      addressRegistry: this.addressRegistry.export(),
      threatLevel: this.currentThreatLevel,
    };

    return JSON.stringify(state, null, 2);
  }

  /**
   * Health check
   */
  healthCheck(): {
    healthy: boolean;
    components: Record<string, boolean>;
    threatLevel: string;
  } {
    return {
      healthy: this.isInitialized && !this.emergencyStop.isStopped(),
      components: {
        monitor: this.monitor.isMonitoring(),
        circuitBreaker: this.circuitBreaker.canTrade(),
        emergencyStop: !this.emergencyStop.isStopped(),
      },
      threatLevel: this.currentThreatLevel,
    };
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('[AutonomousDefense] Shutting down...', 'SECURITY');
    
    // Export final state
    const finalState = await this.exportState();
    logger.info('[AutonomousDefense] Final state exported', 'SECURITY');
    
    // Stop components
    this.monitor.shutdown();
    this.circuitBreaker.shutdown();
    
    // Clean up
    this.removeAllListeners();
    
    logger.info('[AutonomousDefense] Shutdown complete', 'SECURITY');
  }
}

/**
 * Create default defense configuration
 */
export function createDefaultDefenseConfig(walletAddress: string, rpcUrl: string): DefenseConfig {
  return {
    monitor: {
      walletAddress,
      rpcUrl,
      pollingInterval: 5000, // Check every 5 seconds
      lookbackBlocks: 100, // Look back 100 blocks on startup
      dustThreshold: BigInt(1000000000000), // 0.000001 ETH
      unusualGasMultiplier: 5.0,
      enableAutoResponse: true,
      pauseOnHighSeverity: true,
    },
    circuitBreaker: {
      failureThreshold: 5,
      maxLossAmount: BigInt(5000000000000000), // 0.005 ETH
      cooldownPeriod: 300000, // 5 minutes
    },
    emergencyStop: {
      enableAutoStop: true,
      maxCapitalLossPercentage: 20,
      maxConsecutiveErrors: 10,
    },
    enableAutoCircuitBreaker: true,
    enableAutoEmergencyStop: true,
    saveAnomalies: true,
    anomalyLogPath: './.memory/security-events/',
  };
}
