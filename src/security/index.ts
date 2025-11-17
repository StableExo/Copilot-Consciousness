/**
 * Security Module Exports
 * Enterprise-grade security system for distributed arbitrage bot
 */

// Core Security Manager
export { SecurityManager, createDefaultSecurityConfig } from './SecurityManager';
export type { SecurityConfig } from './SecurityManager';

// Authentication
export { JWTService } from './auth/JWTService';
export { PasswordService } from './auth/PasswordService';
export { RBACService } from './auth/RBACService';
export { APIKeyService } from './auth/APIKeyService';
export type { User, JWTPayload, AuthConfig, Permission, RolePermissions } from './auth/types';
export { UserRole, DEFAULT_PERMISSIONS } from './auth/types';

// Two-Factor Authentication
export { TwoFactorService } from './two-factor/TwoFactorService';
export type { TwoFactorSetup, TwoFactorConfig } from './two-factor/TwoFactorService';

// Rate Limiting
export { RateLimitService } from './rate-limiting/RateLimitService';
export type { RateLimitConfig, RateLimitResult } from './rate-limiting/RateLimitService';

// IP Whitelisting
export { IPWhitelistService } from './ip-whitelist/IPWhitelistService';
export type { IPWhitelistEntry, IPCheckResult } from './ip-whitelist/IPWhitelistService';

// Audit Logging
export { AuditLogger } from './audit/AuditLogger';
export { AuditEventType, AuditSeverity } from './audit/AuditLogger';
export type { AuditEvent, AuditLogConfig } from './audit/AuditLogger';

// Intrusion Detection
export { IntrusionDetectionService } from './intrusion-detection/IntrusionDetectionService';
export { ThreatLevel, ThreatType } from './intrusion-detection/IntrusionDetectionService';
export type { ThreatAlert, IDSConfig } from './intrusion-detection/IntrusionDetectionService';

// Secrets Management
export { SecretsManager } from './secrets/SecretsManager';
export { SecretProvider } from './secrets/SecretsManager';
export type { SecretMetadata, RotationPolicy, SecretsConfig } from './secrets/SecretsManager';

// Wallet Security
export { MultiSigWalletService } from './wallet/MultiSigWalletService';
export type { MultiSigConfig, TransactionProposal, SpendingLimit } from './wallet/MultiSigWalletService';
export { HardwareWalletService, createHardwareWallet } from './wallet/HardwareWalletService';
export { HardwareWalletType } from './wallet/HardwareWalletService';
export type { HardwareWalletConfig, SignedTransaction } from './wallet/HardwareWalletService';

// Middleware
export { SecurityMiddleware } from './middleware/authMiddleware';
export type { AuthRequest } from './middleware/authMiddleware';

// Phase 3: Enhanced Security
export { BloodhoundScanner } from './BloodhoundScanner';
export { ThreatResponseEngine } from './ThreatResponseEngine';
export { SecurityPatternLearner } from './SecurityPatternLearner';
export * from './types';
