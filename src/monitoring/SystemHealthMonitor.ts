/**
 * SystemHealthMonitor.ts - Real-time system health monitoring
 * 
 * Features:
 * - Component health status tracking
 * - Performance metrics collection
 * - Anomaly detection
 * - System state validation
 * - Alert generation for critical issues
 * - Recovery action triggering
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import {
  HealthStatus,
  ComponentHealthMetrics,
  SystemHealthReport,
  SystemAlert,
  AnomalyDetectionResult,
  PerformanceMetrics,
  ExecutionEventType
} from '../types/ExecutionTypes';

/**
 * Monitored Component Interface
 */
export interface MonitoredComponent {
  name: string;
  checkHealth(): Promise<HealthStatus>;
  getMetrics?(): Promise<Record<string, number>>;
}

/**
 * Health Check Configuration
 */
export interface HealthCheckConfig {
  interval: number;              // Check interval in ms
  timeout: number;               // Health check timeout
  errorThreshold: number;        // Error rate threshold (0-1)
  degradedThreshold: number;     // Response time threshold for degraded state
  criticalThreshold: number;     // Response time threshold for critical state
  anomalyDetectionWindow: number; // Time window for anomaly detection
  alertRetentionTime: number;    // How long to keep alerts
}

/**
 * System Health Monitor
 */
export class SystemHealthMonitor extends EventEmitter {
  private components: Map<string, MonitoredComponent> = new Map();
  private componentMetrics: Map<string, ComponentHealthMetrics> = new Map();
  private alerts: SystemAlert[] = [];
  private config: HealthCheckConfig;
  private monitoringInterval?: NodeJS.Timeout;
  private startTime: number = Date.now();
  private isRunning: boolean = false;
  
  // Performance tracking
  private performanceHistory: PerformanceMetrics[] = [];
  private executionStats = {
    total: 0,
    successful: 0,
    failed: 0,
    totalProfit: BigInt(0),
    totalGasCost: BigInt(0)
  };

  constructor(config?: Partial<HealthCheckConfig>) {
    super();
    
    this.config = {
      interval: config?.interval || 30000,              // 30 seconds
      timeout: config?.timeout || 5000,                 // 5 seconds
      errorThreshold: config?.errorThreshold || 0.1,    // 10% error rate
      degradedThreshold: config?.degradedThreshold || 2000,  // 2 seconds
      criticalThreshold: config?.criticalThreshold || 5000,  // 5 seconds
      anomalyDetectionWindow: config?.anomalyDetectionWindow || 300000, // 5 minutes
      alertRetentionTime: config?.alertRetentionTime || 86400000 // 24 hours
    };
  }

  /**
   * Register a component for monitoring
   */
  registerComponent(component: MonitoredComponent): void {
    this.components.set(component.name, component);
    
    // Initialize metrics
    this.componentMetrics.set(component.name, {
      componentName: component.name,
      status: HealthStatus.UNKNOWN,
      uptime: 0,
      lastCheck: 0,
      errorRate: 0,
      successRate: 1,
      avgResponseTime: 0,
      metrics: {},
      issues: []
    });
    
    logger.info(`[SystemHealthMonitor] Registered component: ${component.name}`);
  }

  /**
   * Unregister a component
   */
  unregisterComponent(name: string): void {
    this.components.delete(name);
    this.componentMetrics.delete(name);
    logger.info(`[SystemHealthMonitor] Unregistered component: ${name}`);
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[SystemHealthMonitor] Already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    
    logger.info('[SystemHealthMonitor] Starting health monitoring');
    
    // Initial health check
    this.performHealthCheck().catch(error => {
      logger.error('[SystemHealthMonitor] Initial health check failed:', error);
    });
    
    // Schedule periodic checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        logger.error('[SystemHealthMonitor] Health check failed:', error);
      });
    }, this.config.interval);
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    logger.info('[SystemHealthMonitor] Stopped health monitoring');
  }

  /**
   * Perform health check on all components
   */
  private async performHealthCheck(): Promise<void> {
    logger.debug('[SystemHealthMonitor] Performing health check');
    
    const checkPromises = Array.from(this.components.entries()).map(
      ([name, component]) => this.checkComponentHealth(name, component)
    );
    
    await Promise.allSettled(checkPromises);
    
    // Detect anomalies
    const anomalies = await this.detectAnomalies();
    if (anomalies.length > 0) {
      this.handleAnomalies(anomalies);
    }
    
    // Clean up old alerts
    this.cleanupAlerts();
    
    // Generate health report
    const report = this.generateHealthReport();
    
    // Emit health check event
    this.emit('health-check', report);
    
    // Check for critical conditions
    if (report.overallStatus === HealthStatus.CRITICAL) {
      this.emit('critical-health', report);
      this.createAlert('CRITICAL', 'System', 'System health is critical');
    }
  }

  /**
   * Check health of a single component
   */
  private async checkComponentHealth(
    name: string,
    component: MonitoredComponent
  ): Promise<void> {
    const startTime = Date.now();
    const metrics = this.componentMetrics.get(name);
    
    if (!metrics) {
      return;
    }

    try {
      // Check health with timeout
      const status = await Promise.race([
        component.checkHealth(),
        new Promise<HealthStatus>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), this.config.timeout)
        )
      ]);

      const responseTime = Date.now() - startTime;
      
      // Update metrics
      metrics.status = status;
      metrics.lastCheck = Date.now();
      metrics.avgResponseTime = (metrics.avgResponseTime * 0.8) + (responseTime * 0.2); // EMA
      metrics.uptime = Date.now() - this.startTime;
      
      // Get component-specific metrics if available
      if (component.getMetrics) {
        try {
          const customMetrics = await component.getMetrics();
          metrics.metrics = customMetrics;
        } catch (error) {
          logger.error(`[SystemHealthMonitor] Failed to get metrics for ${name}:`, error);
        }
      }
      
      // Clear issues if healthy
      if (status === HealthStatus.HEALTHY) {
        metrics.issues = [];
      }
      
      // Add issues based on response time
      if (responseTime > this.config.criticalThreshold) {
        metrics.issues.push(`Response time (${responseTime}ms) exceeds critical threshold`);
      } else if (responseTime > this.config.degradedThreshold) {
        metrics.issues.push(`Response time (${responseTime}ms) exceeds degraded threshold`);
      }
      
    } catch (error) {
      logger.error(`[SystemHealthMonitor] Health check failed for ${name}:`, error);
      
      // Update error metrics
      metrics.status = HealthStatus.UNHEALTHY;
      metrics.lastCheck = Date.now();
      metrics.errorRate = Math.min(1, metrics.errorRate + 0.1);
      metrics.successRate = Math.max(0, 1 - metrics.errorRate);
      metrics.issues.push(error instanceof Error ? error.message : 'Health check failed');
      
      // Create alert for unhealthy component
      this.createAlert('ERROR', name, `Component health check failed: ${error}`);
    }
  }

  /**
   * Detect anomalies in system behavior
   */
  private async detectAnomalies(): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];
    
    // Check each component for anomalies
    for (const [name, metrics] of this.componentMetrics.entries()) {
      // High error rate anomaly
      if (metrics.errorRate > this.config.errorThreshold) {
        anomalies.push({
          detected: true,
          anomalyType: 'HIGH_ERROR_RATE',
          severity: metrics.errorRate > 0.5 ? 'CRITICAL' : 'HIGH',
          description: `Component ${name} has error rate of ${(metrics.errorRate * 100).toFixed(2)}%`,
          affectedComponent: name,
          suggestedAction: 'Investigate component failures and consider recovery actions',
          metrics: { errorRate: metrics.errorRate }
        });
      }
      
      // High response time anomaly
      if (metrics.avgResponseTime > this.config.criticalThreshold) {
        anomalies.push({
          detected: true,
          anomalyType: 'HIGH_RESPONSE_TIME',
          severity: 'HIGH',
          description: `Component ${name} has average response time of ${metrics.avgResponseTime.toFixed(2)}ms`,
          affectedComponent: name,
          suggestedAction: 'Check component performance and system resources',
          metrics: { avgResponseTime: metrics.avgResponseTime }
        });
      }
    }
    
    // Check performance trends
    if (this.performanceHistory.length >= 5) {
      const recent = this.performanceHistory.slice(-5);
      const avgSuccessRate = recent.reduce((sum, p) => sum + p.successRate, 0) / recent.length;
      
      if (avgSuccessRate < 0.5) {
        anomalies.push({
          detected: true,
          anomalyType: 'LOW_SUCCESS_RATE',
          severity: 'CRITICAL',
          description: `System success rate dropped to ${(avgSuccessRate * 100).toFixed(2)}%`,
          affectedComponent: 'System',
          suggestedAction: 'Investigate system-wide issues and consider emergency shutdown',
          metrics: { successRate: avgSuccessRate }
        });
      }
    }
    
    return anomalies;
  }

  /**
   * Handle detected anomalies
   */
  private handleAnomalies(anomalies: AnomalyDetectionResult[]): void {
    for (const anomaly of anomalies) {
      logger.warn(`[SystemHealthMonitor] Anomaly detected: ${anomaly.description}`);
      
      // Create alert
      this.createAlert(
        anomaly.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        anomaly.affectedComponent,
        anomaly.description,
        { ...anomaly }
      );
      
      // Emit anomaly event
      this.emit('anomaly-detected', anomaly);
      
      // Emit event type for integration
      this.emit(ExecutionEventType.ANOMALY_DETECTED, anomaly);
    }
  }

  /**
   * Generate system health report
   */
  generateHealthReport(): SystemHealthReport {
    const components = Array.from(this.componentMetrics.values());
    
    // Determine overall status
    let overallStatus = HealthStatus.HEALTHY;
    
    for (const component of components) {
      if (component.status === HealthStatus.CRITICAL) {
        overallStatus = HealthStatus.CRITICAL;
        break;
      }
      if (component.status === HealthStatus.UNHEALTHY && overallStatus !== HealthStatus.CRITICAL) {
        overallStatus = HealthStatus.UNHEALTHY;
      } else if (component.status === HealthStatus.DEGRADED && overallStatus === HealthStatus.HEALTHY) {
        overallStatus = HealthStatus.DEGRADED;
      }
    }
    
    return {
      timestamp: Date.now(),
      overallStatus,
      components,
      activeExecutions: 0, // Would be tracked by pipeline
      totalExecutions: this.executionStats.total,
      successfulExecutions: this.executionStats.successful,
      failedExecutions: this.executionStats.failed,
      totalProfit: this.executionStats.totalProfit,
      totalGasCost: this.executionStats.totalGasCost,
      alerts: this.alerts.filter(a => !a.acknowledged)
    };
  }

  /**
   * Create a system alert
   */
  private createAlert(
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL',
    component: string,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const alert: SystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      severity,
      component,
      message,
      timestamp: Date.now(),
      acknowledged: false,
      metadata
    };
    
    this.alerts.push(alert);
    
    logger.info(`[SystemHealthMonitor] Alert created: [${severity}] ${component}: ${message}`);
    
    // Emit alert event
    this.emit('alert', alert);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logger.info(`[SystemHealthMonitor] Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * Clean up old alerts
   */
  private cleanupAlerts(): void {
    const cutoff = Date.now() - this.config.alertRetentionTime;
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }

  /**
   * Update execution statistics
   */
  updateExecutionStats(success: boolean, profit: bigint, gasCost: bigint): void {
    this.executionStats.total++;
    
    if (success) {
      this.executionStats.successful++;
      this.executionStats.totalProfit += profit;
    } else {
      this.executionStats.failed++;
    }
    
    this.executionStats.totalGasCost += gasCost;
    
    // Update performance history
    const metrics: PerformanceMetrics = {
      avgExecutionTime: 0, // Would be tracked separately
      avgGasUsed: this.executionStats.totalGasCost / BigInt(this.executionStats.total || 1),
      avgProfit: this.executionStats.totalProfit / BigInt(this.executionStats.successful || 1),
      successRate: this.executionStats.successful / this.executionStats.total,
      totalExecutions: this.executionStats.total,
      profitableExecutions: this.executionStats.successful,
      totalProfit: this.executionStats.totalProfit,
      totalGasCost: this.executionStats.totalGasCost,
      netProfit: this.executionStats.totalProfit - this.executionStats.totalGasCost,
      roi: Number((this.executionStats.totalProfit * BigInt(100)) / (this.executionStats.totalGasCost || BigInt(1)))
    };
    
    this.performanceHistory.push(metrics);
    
    // Keep only recent history (last 100 entries)
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus(): SystemHealthReport {
    return this.generateHealthReport();
  }

  /**
   * Get component metrics
   */
  getComponentMetrics(name: string): ComponentHealthMetrics | undefined {
    return this.componentMetrics.get(name);
  }

  /**
   * Get all alerts
   */
  getAlerts(unacknowledgedOnly: boolean = false): SystemAlert[] {
    if (unacknowledgedOnly) {
      return this.alerts.filter(a => !a.acknowledged);
    }
    return [...this.alerts];
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics | null {
    if (this.performanceHistory.length === 0) {
      return null;
    }
    return this.performanceHistory[this.performanceHistory.length - 1];
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit?: number): PerformanceMetrics[] {
    if (limit) {
      return this.performanceHistory.slice(-limit);
    }
    return [...this.performanceHistory];
  }

  /**
   * Check if system is healthy
   */
  isHealthy(): boolean {
    const report = this.generateHealthReport();
    return report.overallStatus === HealthStatus.HEALTHY || 
           report.overallStatus === HealthStatus.DEGRADED;
  }
}
