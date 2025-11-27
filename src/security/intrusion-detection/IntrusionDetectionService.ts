/**
 * Intrusion Detection System (IDS)
 * Detects brute force, SQL injection, XSS, and unusual activity
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';

export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ThreatType {
  BRUTE_FORCE = 'BRUTE_FORCE',
  SQL_INJECTION = 'SQL_INJECTION',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
  CREDENTIAL_STUFFING = 'CREDENTIAL_STUFFING',
  RATE_LIMIT_ABUSE = 'RATE_LIMIT_ABUSE',
}

export interface ThreatAlert {
  id: string;
  timestamp: Date;
  type: ThreatType;
  level: ThreatLevel;
  ip: string;
  userId?: string;
  details: Record<string, any>;
  blocked: boolean;
}

export interface IDSConfig {
  bruteForceThreshold: number;
  bruteForceWindowMs: number;
  autoBlockEnabled: boolean;
  autoBlockDurationMs: number;
}

export class IntrusionDetectionService extends EventEmitter {
  private redis: Redis;
  private config: IDSConfig;
  private sqlInjectionPatterns: RegExp[];
  private xssPatterns: RegExp[];
  private pathTraversalPatterns: RegExp[];
  private alerts: ThreatAlert[];

  constructor(redis: Redis, config: IDSConfig) {
    super();
    this.redis = redis;
    this.config = config;
    this.alerts = [];

    // SQL Injection patterns
    this.sqlInjectionPatterns = [
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bSELECT\b.*\bFROM\b)/i,
      /(\bINSERT\b.*\bINTO\b)/i,
      /(\bDELETE\b.*\bFROM\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(\bUPDATE\b.*\bSET\b)/i,
      /(--|#|\/\*|\*\/)/,
      /(\bOR\b\s+\d+\s*=\s*\d+)/i,
      /('.*\bOR\b.*')/i,
    ];

    // XSS patterns
    this.xssPatterns = [
      /<script[^>]*>.*?<\/script>/i,
      /<iframe[^>]*>/i,
      /javascript:/i,
      /onerror\s*=/i,
      /onload\s*=/i,
      /onclick\s*=/i,
      /<img[^>]*onerror/i,
      /eval\(/i,
      /alert\(/i,
    ];

    // Path traversal patterns
    this.pathTraversalPatterns = [/\.\.\//, /\.\.\\/, /%2e%2e%2f/i, /%2e%2e\//i, /\.\.%2f/i];
  }

  /**
   * Detect brute force attack
   */
  async detectBruteForce(ip: string, userId?: string): Promise<ThreatAlert | null> {
    const key = `ids:brute_force:${ip}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.pexpire(key, this.config.bruteForceWindowMs);
    }

    if (count >= this.config.bruteForceThreshold) {
      const alert = this.createAlert(ThreatType.BRUTE_FORCE, ThreatLevel.HIGH, ip, userId, {
        attempts: count,
        windowMs: this.config.bruteForceWindowMs,
      });

      if (this.config.autoBlockEnabled) {
        await this.blockIP(ip, this.config.autoBlockDurationMs);
        alert.blocked = true;
      }

      return alert;
    }

    return null;
  }

  /**
   * Detect SQL injection attempt
   */
  detectSQLInjection(input: string, ip: string, userId?: string): ThreatAlert | null {
    for (const pattern of this.sqlInjectionPatterns) {
      if (pattern.test(input)) {
        return this.createAlert(ThreatType.SQL_INJECTION, ThreatLevel.CRITICAL, ip, userId, {
          input: input.substring(0, 100),
          pattern: pattern.source,
        });
      }
    }
    return null;
  }

  /**
   * Detect XSS attempt
   */
  detectXSS(input: string, ip: string, userId?: string): ThreatAlert | null {
    for (const pattern of this.xssPatterns) {
      if (pattern.test(input)) {
        return this.createAlert(ThreatType.XSS_ATTEMPT, ThreatLevel.CRITICAL, ip, userId, {
          input: input.substring(0, 100),
          pattern: pattern.source,
        });
      }
    }
    return null;
  }

  /**
   * Detect path traversal attempt
   */
  detectPathTraversal(input: string, ip: string, userId?: string): ThreatAlert | null {
    for (const pattern of this.pathTraversalPatterns) {
      if (pattern.test(input)) {
        return this.createAlert(ThreatType.PATH_TRAVERSAL, ThreatLevel.HIGH, ip, userId, {
          input: input.substring(0, 100),
          pattern: pattern.source,
        });
      }
    }
    return null;
  }

  /**
   * Analyze request for threats
   */
  async analyzeRequest(data: {
    ip: string;
    userId?: string;
    path: string;
    query?: Record<string, any>;
    body?: Record<string, any>;
    headers?: Record<string, string>;
  }): Promise<ThreatAlert[]> {
    const threats: ThreatAlert[] = [];

    // Check all input fields
    const inputs = [
      data.path,
      ...Object.values(data.query || {}),
      ...Object.values(data.body || {}),
    ].map((v) => String(v));

    for (const input of inputs) {
      const sqlThreat = this.detectSQLInjection(input, data.ip, data.userId);
      if (sqlThreat) threats.push(sqlThreat);

      const xssThreat = this.detectXSS(input, data.ip, data.userId);
      if (xssThreat) threats.push(xssThreat);

      const pathThreat = this.detectPathTraversal(input, data.ip, data.userId);
      if (pathThreat) threats.push(pathThreat);
    }

    // Check for unusual activity patterns
    const unusualActivity = await this.detectUnusualActivity(data);
    if (unusualActivity) {
      threats.push(unusualActivity);
    }

    // Auto-block on critical threats
    if (threats.some((t) => t.level === ThreatLevel.CRITICAL) && this.config.autoBlockEnabled) {
      await this.blockIP(data.ip, this.config.autoBlockDurationMs);
      threats.forEach((t) => (t.blocked = true));
    }

    return threats;
  }

  /**
   * Detect unusual activity patterns
   */
  private async detectUnusualActivity(data: {
    ip: string;
    userId?: string;
    path: string;
  }): Promise<ThreatAlert | null> {
    // Track request patterns
    const patternKey = `ids:pattern:${data.ip}`;
    const count = await this.redis.incr(patternKey);
    await this.redis.expire(patternKey, 60);

    // More than 100 requests per minute is suspicious
    if (count > 100) {
      return this.createAlert(
        ThreatType.UNUSUAL_ACTIVITY,
        ThreatLevel.MEDIUM,
        data.ip,
        data.userId,
        {
          requestsPerMinute: count,
        }
      );
    }

    return null;
  }

  /**
   * Block IP address
   */
  private async blockIP(ip: string, durationMs: number): Promise<void> {
    const blockKey = `ids:blocked:${ip}`;
    await this.redis.set(blockKey, '1', 'PX', durationMs);
  }

  /**
   * Check if IP is blocked
   */
  async isBlocked(ip: string): Promise<boolean> {
    const blockKey = `ids:blocked:${ip}`;
    const result = await this.redis.get(blockKey);
    return result !== null;
  }

  /**
   * Create threat alert
   */
  private createAlert(
    type: ThreatType,
    level: ThreatLevel,
    ip: string,
    userId: string | undefined,
    details: Record<string, any>
  ): ThreatAlert {
    const alert: ThreatAlert = {
      id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      level,
      ip,
      userId,
      details,
      blocked: false,
    };

    this.alerts.push(alert);
    this.emit('threat-detected', alert);

    return alert;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 100): ThreatAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get alerts for IP
   */
  getAlertsForIP(ip: string): ThreatAlert[] {
    return this.alerts.filter((a) => a.ip === ip);
  }

  /**
   * Clear alerts older than specified hours
   */
  clearOldAlerts(hours: number): void {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    this.alerts = this.alerts.filter((a) => a.timestamp >= cutoff);
  }
}
