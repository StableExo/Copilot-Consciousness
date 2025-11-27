/**
 * Immutable Audit Logging Service
 * Provides append-only logs with cryptographic hashing
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

export enum AuditEventType {
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_FAILED = 'auth.failed',
  AUTH_2FA_ENABLED = 'auth.2fa.enabled',
  AUTH_2FA_DISABLED = 'auth.2fa.disabled',
  API_KEY_CREATED = 'api.key.created',
  API_KEY_REVOKED = 'api.key.revoked',
  WALLET_TRANSACTION = 'wallet.transaction',
  WALLET_SIGNATURE = 'wallet.signature',
  ARBITRAGE_EXECUTED = 'arbitrage.executed',
  ARBITRAGE_FAILED = 'arbitrage.failed',
  CONFIG_CHANGED = 'config.changed',
  RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  IP_BLOCKED = 'security.ip_blocked',
  INTRUSION_DETECTED = 'security.intrusion_detected',
  SYSTEM_ERROR = 'system.error',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  type: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  username?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details: Record<string, any>;
  previousHash: string;
  hash: string;
}

export interface AuditLogConfig {
  retentionDays: number;
  enableEncryption: boolean;
  encryptionKey?: string;
}

export class AuditLogger extends EventEmitter {
  private logs: AuditEvent[];
  private config: AuditLogConfig;
  private lastHash: string;

  constructor(config: AuditLogConfig) {
    super();
    this.config = config;
    this.logs = [];
    this.lastHash = 'genesis';
  }

  /**
   * Log audit event
   */
  log(
    type: AuditEventType,
    severity: AuditSeverity,
    details: Record<string, any>,
    context?: {
      userId?: string;
      username?: string;
      ip?: string;
      userAgent?: string;
      resource?: string;
      action?: string;
    }
  ): AuditEvent {
    const event: Omit<AuditEvent, 'hash'> = {
      id: this.generateId(),
      timestamp: new Date(),
      type,
      severity,
      ...context,
      details,
      previousHash: this.lastHash,
    };

    // Calculate hash
    const hash = this.calculateHash(event);
    const auditEvent: AuditEvent = { ...event, hash };

    this.logs.push(auditEvent);
    this.lastHash = hash;

    // Emit event for real-time monitoring
    this.emit('audit-event', auditEvent);

    return auditEvent;
  }

  /**
   * Verify audit log chain integrity
   */
  verifyIntegrity(): { valid: boolean; corruptedIndex?: number } {
    let previousHash = 'genesis';

    for (let i = 0; i < this.logs.length; i++) {
      const event = this.logs[i];

      // Check previous hash matches
      if (event.previousHash !== previousHash) {
        return { valid: false, corruptedIndex: i };
      }

      // Recalculate hash
      const { hash: _, ...eventWithoutHash } = event;
      const calculatedHash = this.calculateHash(eventWithoutHash);

      if (calculatedHash !== event.hash) {
        return { valid: false, corruptedIndex: i };
      }

      previousHash = event.hash;
    }

    return { valid: true };
  }

  /**
   * Get audit logs with filters
   */
  query(filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    type?: AuditEventType;
    severity?: AuditSeverity;
    limit?: number;
  }): AuditEvent[] {
    let results = [...this.logs];

    if (filters.startDate) {
      results = results.filter((e) => e.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      results = results.filter((e) => e.timestamp <= filters.endDate!);
    }

    if (filters.userId) {
      results = results.filter((e) => e.userId === filters.userId);
    }

    if (filters.type) {
      results = results.filter((e) => e.type === filters.type);
    }

    if (filters.severity) {
      results = results.filter((e) => e.severity === filters.severity);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Get statistics
   */
  getStatistics(timeframeHours: number = 24): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    uniqueUsers: number;
  } {
    const cutoff = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
    const recentLogs = this.logs.filter((e) => e.timestamp >= cutoff);

    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const uniqueUsers = new Set<string>();

    for (const event of recentLogs) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      if (event.userId) {
        uniqueUsers.add(event.userId);
      }
    }

    return {
      totalEvents: recentLogs.length,
      eventsByType,
      eventsBySeverity,
      uniqueUsers: uniqueUsers.size,
    };
  }

  /**
   * Calculate hash for event
   */
  private calculateHash(event: Omit<AuditEvent, 'hash'>): string {
    const { id, timestamp, type, severity, userId, details, previousHash } = event;
    const data = JSON.stringify({
      id,
      timestamp: timestamp.toISOString(),
      type,
      severity,
      userId,
      details,
      previousHash,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate unique event ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Clean up old logs (respecting retention policy)
   */
  cleanupOldLogs(): number {
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    const initialLength = this.logs.length;

    this.logs = this.logs.filter((e) => e.timestamp >= cutoffDate);

    return initialLength - this.logs.length;
  }

  /**
   * Export logs for archival
   */
  exportLogs(startDate?: Date, endDate?: Date): AuditEvent[] {
    return this.query({ startDate, endDate });
  }
}
