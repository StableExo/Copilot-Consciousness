/**
 * AlertSystem - Multi-channel alert and notification system
 * 
 * Provides critical alerts through multiple channels:
 * - Console logging
 * - Webhook notifications
 * - Event emission for integration
 * - Alert prioritization and throttling
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum AlertType {
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
  EMERGENCY_STOP = 'EMERGENCY_STOP',
  CAPITAL_LOSS = 'CAPITAL_LOSS',
  POSITION_LIMIT = 'POSITION_LIMIT',
  SYSTEM_HEALTH = 'SYSTEM_HEALTH',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SECURITY = 'SECURITY',
  PERFORMANCE = 'PERFORMANCE',
  MILESTONE = 'MILESTONE'
}

export interface Alert {
  id: string;
  timestamp: number;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
}

export interface AlertChannel {
  name: string;
  enabled: boolean;
  minSeverity: AlertSeverity;
  handler: (alert: Alert) => Promise<void>;
}

export interface AlertSystemConfig {
  // Throttling
  enableThrottling: boolean;
  throttleWindowMs: number;         // Time window for throttling
  maxAlertsPerWindow: number;       // Max alerts per window per type
  
  // Channels
  enableConsole: boolean;
  enableWebhooks: boolean;
  webhookUrls?: string[];
  
  // Filtering
  minSeverityForNotification: AlertSeverity;
  
  // Storage
  maxStoredAlerts: number;          // Max alerts to keep in memory
  alertRetentionMs: number;         // How long to keep old alerts
}

/**
 * Alert System for Critical Notifications
 */
export class AlertSystem extends EventEmitter {
  private config: AlertSystemConfig;
  private alerts: Alert[] = [];
  private channels: Map<string, AlertChannel> = new Map();
  
  // Throttling state
  private alertCounts: Map<string, { count: number; windowStart: number }> = new Map();
  
  // Severity levels (for comparison)
  private readonly severityLevels = {
    [AlertSeverity.INFO]: 0,
    [AlertSeverity.WARNING]: 1,
    [AlertSeverity.ERROR]: 2,
    [AlertSeverity.CRITICAL]: 3
  };

  constructor(config?: Partial<AlertSystemConfig>) {
    super();
    
    this.config = {
      enableThrottling: config?.enableThrottling ?? true,
      throttleWindowMs: config?.throttleWindowMs ?? 60000, // 1 minute
      maxAlertsPerWindow: config?.maxAlertsPerWindow ?? 10,
      enableConsole: config?.enableConsole ?? true,
      enableWebhooks: config?.enableWebhooks ?? true,
      webhookUrls: config?.webhookUrls ?? [],
      minSeverityForNotification: config?.minSeverityForNotification ?? AlertSeverity.WARNING,
      maxStoredAlerts: config?.maxStoredAlerts ?? 1000,
      alertRetentionMs: config?.alertRetentionMs ?? 86400000 // 24 hours
    };
    
    // Setup default channels
    this.setupDefaultChannels();
    
    logger.info('[AlertSystem] Initialized', 'ALERTS');
  }

  /**
   * Setup default notification channels
   */
  private setupDefaultChannels(): void {
    // Console channel
    if (this.config.enableConsole) {
      this.registerChannel({
        name: 'console',
        enabled: true,
        minSeverity: AlertSeverity.INFO,
        handler: async (alert) => {
          const color = this.getSeverityColor(alert.severity);
          console.log(`\n${color}[${alert.severity}] ${alert.title}${'\x1b[0m'}`);
          console.log(`  ${alert.message}`);
          if (alert.metadata) {
            console.log(`  Metadata:`, alert.metadata);
          }
        }
      });
    }
    
    // Webhook channel
    if (this.config.enableWebhooks && this.config.webhookUrls && this.config.webhookUrls.length > 0) {
      this.registerChannel({
        name: 'webhook',
        enabled: true,
        minSeverity: this.config.minSeverityForNotification,
        handler: async (alert) => {
          await this.sendWebhooks(alert);
        }
      });
    }
  }

  /**
   * Register a custom alert channel
   */
  registerChannel(channel: AlertChannel): void {
    this.channels.set(channel.name, channel);
    logger.debug(`[AlertSystem] Registered channel: ${channel.name}`, 'ALERTS');
  }

  /**
   * Send an alert
   */
  async sendAlert(
    severity: AlertSeverity,
    type: AlertType,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<Alert> {
    // Check throttling
    if (this.config.enableThrottling && this.shouldThrottle(type)) {
      logger.debug(`[AlertSystem] Alert throttled: ${type}`, 'ALERTS');
      throw new Error(`Alert throttled: ${type}`);
    }
    
    // Create alert
    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: Date.now(),
      severity,
      type,
      title,
      message,
      metadata,
      acknowledged: false
    };
    
    // Store alert
    this.alerts.push(alert);
    this.cleanupOldAlerts();
    
    // Update throttling counter
    if (this.config.enableThrottling) {
      this.updateThrottleCount(type);
    }
    
    // Log the alert
    logger.info(
      `[AlertSystem] Alert sent: [${severity}] ${type} - ${title}`,
      'ALERTS'
    );
    
    // Emit alert event
    this.emit('alert', alert);
    
    // Send through channels
    await this.distributeAlert(alert);
    
    return alert;
  }

  /**
   * Distribute alert to all enabled channels
   */
  private async distributeAlert(alert: Alert): Promise<void> {
    const promises = Array.from(this.channels.values())
      .filter(channel => 
        channel.enabled && 
        this.severityLevels[alert.severity] >= this.severityLevels[channel.minSeverity]
      )
      .map(async channel => {
        try {
          await channel.handler(alert);
        } catch (error) {
          logger.error(
            `[AlertSystem] Failed to send alert to ${channel.name}: ${error instanceof Error ? error.message : String(error)}`,
            'ALERTS'
          );
        }
      });
    
    await Promise.allSettled(promises);
  }

  /**
   * Send webhooks for an alert
   */
  private async sendWebhooks(alert: Alert): Promise<void> {
    if (!this.config.webhookUrls || this.config.webhookUrls.length === 0) {
      return;
    }
    
    const payload = {
      alert_id: alert.id,
      timestamp: new Date(alert.timestamp).toISOString(),
      severity: alert.severity,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata
    };
    
    const promises = this.config.webhookUrls.map(async url => {
      try {
        // Use dynamic import for node-fetch or axios if available
        // For now, log webhook call (actual HTTP client would be injected in production)
        logger.info(
          `[AlertSystem] Webhook payload prepared for ${url}: ${JSON.stringify(payload)}`,
          'ALERTS'
        );
        
        // In production, this would be:
        // const response = await axios.post(url, payload);
        // or use fetch if available
        
      } catch (error) {
        logger.error(
          `[AlertSystem] Webhook failed for ${url}: ${error instanceof Error ? error.message : String(error)}`,
          'ALERTS'
        );
      }
    });
    
    await Promise.allSettled(promises);
  }

  /**
   * Check if alert should be throttled
   */
  private shouldThrottle(type: AlertType): boolean {
    const key = type.toString();
    const now = Date.now();
    const throttleData = this.alertCounts.get(key);
    
    if (!throttleData) {
      return false;
    }
    
    // Check if we're still in the window
    if (now - throttleData.windowStart > this.config.throttleWindowMs) {
      // Window expired, reset
      this.alertCounts.delete(key);
      return false;
    }
    
    // Check if we've hit the limit
    return throttleData.count >= this.config.maxAlertsPerWindow;
  }

  /**
   * Update throttle count
   */
  private updateThrottleCount(type: AlertType): void {
    const key = type.toString();
    const now = Date.now();
    const throttleData = this.alertCounts.get(key);
    
    if (!throttleData || now - throttleData.windowStart > this.config.throttleWindowMs) {
      this.alertCounts.set(key, { count: 1, windowStart: now });
    } else {
      throttleData.count++;
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    
    if (!alert) {
      return false;
    }
    
    alert.acknowledged = true;
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy;
    
    logger.info(`[AlertSystem] Alert acknowledged: ${alertId} by ${acknowledgedBy}`, 'ALERTS');
    
    this.emit('alert-acknowledged', alert);
    
    return true;
  }

  /**
   * Get all alerts
   */
  getAllAlerts(unacknowledgedOnly: boolean = false): Alert[] {
    if (unacknowledgedOnly) {
      return this.alerts.filter(a => !a.acknowledged);
    }
    return [...this.alerts];
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return this.alerts.filter(a => a.severity === severity);
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: AlertType): Alert[] {
    return this.alerts.filter(a => a.type === type);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): Alert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clean up old alerts
   */
  private cleanupOldAlerts(): void {
    const cutoff = Date.now() - this.config.alertRetentionMs;
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
    
    // Also limit by max count
    if (this.alerts.length > this.config.maxStoredAlerts) {
      this.alerts = this.alerts.slice(-this.config.maxStoredAlerts);
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.INFO:
        return '\x1b[36m'; // Cyan
      case AlertSeverity.WARNING:
        return '\x1b[33m'; // Yellow
      case AlertSeverity.ERROR:
        return '\x1b[31m'; // Red
      case AlertSeverity.CRITICAL:
        return '\x1b[35m'; // Magenta
      default:
        return '\x1b[0m'; // Reset
    }
  }

  /**
   * Convenience methods for common alert types
   */
  async critical(type: AlertType, title: string, message: string, metadata?: Record<string, any>): Promise<Alert> {
    return this.sendAlert(AlertSeverity.CRITICAL, type, title, message, metadata);
  }

  async error(type: AlertType, title: string, message: string, metadata?: Record<string, any>): Promise<Alert> {
    return this.sendAlert(AlertSeverity.ERROR, type, title, message, metadata);
  }

  async warning(type: AlertType, title: string, message: string, metadata?: Record<string, any>): Promise<Alert> {
    return this.sendAlert(AlertSeverity.WARNING, type, title, message, metadata);
  }

  async info(type: AlertType, title: string, message: string, metadata?: Record<string, any>): Promise<Alert> {
    return this.sendAlert(AlertSeverity.INFO, type, title, message, metadata);
  }

  /**
   * Get alert statistics
   */
  getStats(): {
    total: number;
    byLevel: Record<string, number>;
    byType: Record<string, number>;
    unacknowledged: number;
  } {
    const byLevel: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let unacknowledged = 0;
    
    for (const alert of this.alerts) {
      // Count by level
      byLevel[alert.severity] = (byLevel[alert.severity] || 0) + 1;
      
      // Count by type
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      
      // Count unacknowledged
      if (!alert.acknowledged) {
        unacknowledged++;
      }
    }
    
    return {
      total: this.alerts.length,
      byLevel,
      byType,
      unacknowledged
    };
  }

  /**
   * Clear all alerts
   */
  clearAll(): void {
    logger.warn('[AlertSystem] Clearing all alerts', 'ALERTS');
    this.alerts = [];
    this.alertCounts.clear();
  }
}
