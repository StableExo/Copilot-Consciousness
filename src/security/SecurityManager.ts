/**
 * Central Security Manager
 * Orchestrates all security components
 */

import Redis from 'ioredis';
import { JWTService } from './auth/JWTService';
import { PasswordService } from './auth/PasswordService';
import { RBACService } from './auth/RBACService';
import { APIKeyService } from './auth/APIKeyService';
import { TwoFactorService } from './two-factor/TwoFactorService';
import { RateLimitService } from './rate-limiting/RateLimitService';
import { IPWhitelistService } from './ip-whitelist/IPWhitelistService';
import { AuditLogger, AuditLogConfig } from './audit/AuditLogger';
import { IntrusionDetectionService, IDSConfig } from './intrusion-detection/IntrusionDetectionService';
import { SecretsManager, SecretsConfig } from './secrets/SecretsManager';
import { MultiSigWalletService, MultiSigConfig } from './wallet/MultiSigWalletService';
import { SecurityMiddleware } from './middleware/authMiddleware';
import { AuthConfig } from './auth/types';

export interface SecurityConfig {
  auth: AuthConfig;
  twoFactor: {
    issuer: string;
    window: number;
  };
  audit: AuditLogConfig;
  ids: IDSConfig;
  secrets: SecretsConfig;
  multiSig?: MultiSigConfig;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
}

export class SecurityManager {
  // Core Services
  private redis: Redis;
  public jwtService: JWTService;
  public passwordService: PasswordService;
  public rbacService: RBACService;
  public apiKeyService: APIKeyService;
  public twoFactorService: TwoFactorService;
  public rateLimitService: RateLimitService;
  public ipWhitelistService: IPWhitelistService;
  public auditLogger: AuditLogger;
  public idsService: IntrusionDetectionService;
  public secretsManager: SecretsManager;
  public multiSigService?: MultiSigWalletService;
  
  // Middleware
  public middleware: SecurityMiddleware;

  constructor(config: SecurityConfig) {
    // Initialize Redis
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    // Initialize services
    this.jwtService = new JWTService(config.auth);
    this.passwordService = new PasswordService(config.auth);
    this.rbacService = new RBACService();
    this.apiKeyService = new APIKeyService(config.auth);
    this.twoFactorService = new TwoFactorService(config.twoFactor);
    this.rateLimitService = new RateLimitService(this.redis);
    this.ipWhitelistService = new IPWhitelistService();
    this.auditLogger = new AuditLogger(config.audit);
    this.idsService = new IntrusionDetectionService(this.redis, config.ids);
    this.secretsManager = new SecretsManager(config.secrets);

    // Initialize multi-sig if configured
    if (config.multiSig) {
      this.multiSigService = new MultiSigWalletService(config.multiSig);
    }

    // Initialize middleware
    this.middleware = new SecurityMiddleware(
      this.jwtService,
      this.apiKeyService,
      this.rbacService,
      this.rateLimitService,
      this.ipWhitelistService,
      this.idsService,
      this.auditLogger
    );

    // Configure default rate limits
    this.configureDefaultRateLimits();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Configure default rate limits
   */
  private configureDefaultRateLimits(): void {
    // API endpoints
    this.rateLimitService.configureLimit('api', {
      windowMs: 60000, // 1 minute
      maxRequests: 60,
      keyPrefix: 'ratelimit'
    });

    // Authentication endpoints (more restrictive)
    this.rateLimitService.configureLimit('auth', {
      windowMs: 300000, // 5 minutes
      maxRequests: 5,
      keyPrefix: 'ratelimit'
    });

    // Trading endpoints (higher limits for bots)
    this.rateLimitService.configureLimit('trading', {
      windowMs: 1000, // 1 second
      maxRequests: 10,
      keyPrefix: 'ratelimit'
    });

    // Dashboard endpoints
    this.rateLimitService.configureLimit('dashboard', {
      windowMs: 10000, // 10 seconds
      maxRequests: 100,
      keyPrefix: 'ratelimit'
    });
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    // Audit events
    this.auditLogger.on('audit-event', (event) => {
      console.log('[AUDIT]', event.type, event.severity);
    });

    // Intrusion alerts
    this.idsService.on('threat-detected', (alert) => {
      console.error('[SECURITY THREAT]', alert.type, alert.level, alert.ip);
      
      // Could trigger additional actions:
      // - Send notification
      // - Update WAF rules
      // - Alert security team
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<string, boolean>;
  }> {
    const services: Record<string, boolean> = {};

    // Check Redis
    try {
      await this.redis.ping();
      services.redis = true;
    } catch {
      services.redis = false;
    }

    // Check audit log integrity
    const auditIntegrity = this.auditLogger.verifyIntegrity();
    services.auditLog = auditIntegrity.valid;

    // Check multi-sig if configured
    if (this.multiSigService) {
      try {
        services.multiSig = await this.multiSigService.verifySafeConfig();
      } catch {
        services.multiSig = false;
      }
    }

    const healthy = Object.values(services).every(v => v);

    return { healthy, services };
  }

  /**
   * Get security statistics
   */
  getStatistics(): {
    audit: ReturnType<AuditLogger['getStatistics']>;
    threats: any[];
  } {
    return {
      audit: this.auditLogger.getStatistics(),
      threats: this.idsService.getRecentAlerts(50)
    };
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    console.log('[Security] Shutting down...');
    
    // Close Redis connection
    await this.redis.quit();
    
    // Clean up old audit logs
    this.auditLogger.cleanupOldLogs();
    
    console.log('[Security] Shutdown complete');
  }
}

/**
 * Create default security configuration
 */
export function createDefaultSecurityConfig(): SecurityConfig {
  return {
    auth: {
      jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
      jwtExpiresIn: '24h',
      apiKeyPrefix: 'arb',
      bcryptRounds: 12,
      sessionTimeout: 86400000 // 24 hours
    },
    twoFactor: {
      issuer: 'Arbitrage Bot',
      window: 2
    },
    audit: {
      retentionDays: 2555, // ~7 years
      enableEncryption: true,
      encryptionKey: process.env.AUDIT_ENCRYPTION_KEY
    },
    ids: {
      bruteForceThreshold: 5,
      bruteForceWindowMs: 300000, // 5 minutes
      autoBlockEnabled: true,
      autoBlockDurationMs: 3600000 // 1 hour
    },
    secrets: {
      provider: 'LOCAL_ENCRYPTED' as const,
      encryptionKey: process.env.SECRETS_ENCRYPTION_KEY
    } as SecretsConfig,
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    }
  };
}
