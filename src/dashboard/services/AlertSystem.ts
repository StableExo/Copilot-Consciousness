/**
 * AlertSystem - Multi-channel notification system
 * 
 * Supports WebSocket, Email, Telegram, and Discord notifications
 * with configurable thresholds and alert management
 */

import { EventEmitter } from 'events';
import { Alert, AlertConfig, DashboardMetrics } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AlertSystem extends EventEmitter {
  private config: AlertConfig;
  private alerts: Alert[];
  private maxAlertHistory: number;
  private emailService?: any; // Will be implemented with nodemailer
  private lastMetrics?: DashboardMetrics;

  constructor(config: AlertConfig, maxAlertHistory: number = 1000) {
    super();
    this.config = config;
    this.alerts = [];
    this.maxAlertHistory = maxAlertHistory;
  }

  /**
   * Update alert configuration
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check metrics against thresholds and trigger alerts
   */
  checkMetrics(metrics: DashboardMetrics): void {
    this.lastMetrics = metrics;

    // Check profit threshold
    if (this.config.profitThreshold !== undefined) {
      const profit = parseFloat(metrics.netProfit) / 1e18;
      if (profit > this.config.profitThreshold) {
        this.createAlert({
          type: 'success',
          title: 'Profit Threshold Exceeded',
          message: `Net profit of ${profit.toFixed(4)} ETH exceeds threshold of ${this.config.profitThreshold} ETH`,
          metadata: { profit, threshold: this.config.profitThreshold }
        });
      }
    }

    // Check loss threshold
    if (this.config.lossThreshold !== undefined) {
      const loss = parseFloat(metrics.totalLoss) / 1e18;
      if (loss > this.config.lossThreshold) {
        this.createAlert({
          type: 'warning',
          title: 'Loss Threshold Exceeded',
          message: `Total loss of ${loss.toFixed(4)} ETH exceeds threshold of ${this.config.lossThreshold} ETH`,
          metadata: { loss, threshold: this.config.lossThreshold }
        });
      }
    }

    // Check gas threshold
    if (this.config.gasThreshold !== undefined) {
      const gasAvg = parseFloat(metrics.averageGasCost) / 1e18;
      if (gasAvg > this.config.gasThreshold) {
        this.createAlert({
          type: 'warning',
          title: 'High Gas Costs',
          message: `Average gas cost of ${gasAvg.toFixed(6)} ETH exceeds threshold of ${this.config.gasThreshold} ETH`,
          metadata: { gasAvg, threshold: this.config.gasThreshold }
        });
      }
    }

    // Check success rate threshold
    if (this.config.successRateThreshold !== undefined) {
      if (metrics.successRate < this.config.successRateThreshold) {
        this.createAlert({
          type: 'error',
          title: 'Low Success Rate',
          message: `Success rate of ${metrics.successRate.toFixed(2)}% is below threshold of ${this.config.successRateThreshold}%`,
          metadata: { successRate: metrics.successRate, threshold: this.config.successRateThreshold }
        });
      }
    }

    // Check high error rate
    if (metrics.errorRate > 0.1) { // More than 10% error rate
      this.createAlert({
        type: 'error',
        title: 'High Error Rate Detected',
        message: `Error rate of ${(metrics.errorRate * 100).toFixed(2)}% detected`,
        metadata: { errorRate: metrics.errorRate }
      });
    }
  }

  /**
   * Create and dispatch an alert
   */
  createAlert(alertData: Omit<Alert, 'id' | 'timestamp'>): Alert {
    const alert: Alert = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...alertData
    };

    this.alerts.push(alert);

    // Maintain max history
    if (this.alerts.length > this.maxAlertHistory) {
      this.alerts.shift();
    }

    // Dispatch alert through configured channels
    this.dispatchAlert(alert);

    return alert;
  }

  /**
   * Dispatch alert through all configured channels
   */
  private async dispatchAlert(alert: Alert): Promise<void> {
    // WebSocket (emit event)
    if (this.config.channels.websocket) {
      this.emit('alert', alert);
    }

    // Email
    if (this.config.channels.email?.enabled) {
      await this.sendEmailAlert(alert);
    }

    // Telegram
    if (this.config.channels.telegram?.enabled) {
      await this.sendTelegramAlert(alert);
    }

    // Discord
    if (this.config.channels.discord?.enabled) {
      await this.sendDiscordAlert(alert);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    // Email implementation would use nodemailer
    // For now, just log
    console.log(`[Email Alert] ${alert.type.toUpperCase()}: ${alert.title} - ${alert.message}`);
    
    // Actual implementation would be:
    // if (this.emailService) {
    //   await this.emailService.sendMail({
    //     to: this.config.channels.email?.recipients.join(','),
    //     subject: `[${alert.type.toUpperCase()}] ${alert.title}`,
    //     text: alert.message,
    //     html: this.formatAlertEmail(alert)
    //   });
    // }
  }

  /**
   * Send Telegram alert
   */
  private async sendTelegramAlert(alert: Alert): Promise<void> {
    const telegram = this.config.channels.telegram;
    if (!telegram?.botToken || !telegram?.chatId) {
      return;
    }

    try {
      const axios = require('axios');
      const message = `🚨 *${alert.type.toUpperCase()}*: ${alert.title}\n\n${alert.message}`;
      
      await axios.post(`https://api.telegram.org/bot${telegram.botToken}/sendMessage`, {
        chat_id: telegram.chatId,
        text: message,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Failed to send Telegram alert:', error);
    }
  }

  /**
   * Send Discord alert
   */
  private async sendDiscordAlert(alert: Alert): Promise<void> {
    const discord = this.config.channels.discord;
    if (!discord?.webhookUrl) {
      return;
    }

    try {
      const axios = require('axios');
      const color = this.getDiscordColor(alert.type);
      
      await axios.post(discord.webhookUrl, {
        embeds: [{
          title: alert.title,
          description: alert.message,
          color: color,
          timestamp: new Date(alert.timestamp).toISOString(),
          fields: alert.metadata ? Object.entries(alert.metadata).map(([key, value]) => ({
            name: key,
            value: String(value),
            inline: true
          })) : []
        }]
      });
    } catch (error) {
      console.error('Failed to send Discord alert:', error);
    }
  }

  /**
   * Get Discord embed color based on alert type
   */
  private getDiscordColor(type: Alert['type']): number {
    const colors = {
      info: 0x3498db,    // Blue
      warning: 0xf39c12, // Orange
      error: 0xe74c3c,   // Red
      success: 0x2ecc71  // Green
    };
    return colors[type];
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 50): Alert[] {
    return this.alerts.slice(-limit).reverse();
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: Alert['type']): Alert[] {
    return this.alerts.filter(a => a.type === type);
  }

  /**
   * Clear alert history
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    byType: Record<Alert['type'], number>;
    lastHour: number;
  } {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    return {
      total: this.alerts.length,
      byType: {
        info: this.alerts.filter(a => a.type === 'info').length,
        warning: this.alerts.filter(a => a.type === 'warning').length,
        error: this.alerts.filter(a => a.type === 'error').length,
        success: this.alerts.filter(a => a.type === 'success').length
      },
      lastHour: this.alerts.filter(a => a.timestamp > oneHourAgo).length
    };
  }
}
