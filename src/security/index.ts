/**
 * Security Module Exports
 *
 * Consolidated security system for distributed arbitrage bot including:
 * - Authentication & Authorization (auth, two-factor)
 * - Security Services (rate limiting, IP whitelist, intrusion detection)
 * - Secrets Management (vault integration)
 * - Wallet Security (multi-sig, hardware wallet)
 * - Production Safety (circuit breaker, emergency stop, position management)
 * - Error Recovery (transaction recovery, nonce sync, gas adjustment)
 * - Phase 3 Enhanced Security (Bloodhound, ThreatResponse, PatternLearning)
 *
 * This module consolidates:
 * - src/security/ - Core security services
 * - src/safety/ - Production safety mechanisms
 * - src/recovery/ - Error recovery systems
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
export type {
  IPWhitelistEntry,
  IPCheckResult,
  IPWhitelistConfig,
} from './ip-whitelist/IPWhitelistService';

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
export type {
  MultiSigConfig,
  TransactionProposal,
  SpendingLimit,
} from './wallet/MultiSigWalletService';
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
export { BundleSimulator, ThreatType as BundleThreatType } from './BundleSimulator';
export type { BundleThreatAssessment, SimulationConfig } from './BundleSimulator';

// Phase 3+: Adversarial Intelligence & Live Training
export { AdversarialIntelligenceFeed } from './AdversarialIntelligenceFeed';
export { LiveThreatTrainer } from './LiveThreatTrainer';

export * from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Re-exports from Safety Module (consolidated from src/safety/)
// ═══════════════════════════════════════════════════════════════════════════

export {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerMetrics,
  TradeResult,
} from '../safety/CircuitBreaker';
export type { CircuitBreakerConfig } from '../safety/CircuitBreaker';

export { EmergencyStop, StopReason, StopState } from '../safety/EmergencyStop';
export type { EmergencyStopConfig, ShutdownCallback } from '../safety/EmergencyStop';

export {
  PositionSizeManager,
  PositionMetrics,
  PositionRequest,
  PositionApproval,
} from '../safety/PositionSizeManager';
export type { PositionSizeConfig } from '../safety/PositionSizeManager';

export {
  ProfitLossTracker,
  TradeRecord,
  ProfitAllocation,
  PerformanceMetrics,
  TimeWindowStats,
} from '../safety/ProfitLossTracker';

export { AlertSystem, AlertSeverity, AlertType, Alert, AlertChannel } from '../safety/AlertSystem';
export type { AlertSystemConfig } from '../safety/AlertSystem';

export { ProductionSafetyManager } from '../safety';
export type { ProductionSafetyConfig } from '../safety';

// ═══════════════════════════════════════════════════════════════════════════
// Re-exports from Recovery Module (consolidated from src/recovery/)
// ═══════════════════════════════════════════════════════════════════════════

export { ErrorRecovery } from '../recovery/ErrorRecovery';
export type { ErrorRecoveryConfig } from '../recovery/ErrorRecovery';

// Phase 3: Advanced Security Features (already exported above at lines 78-86)

// Autonomous Defense System (Phase 3.2) - First-of-its-kind AI self-protection
export { TransactionMonitor } from './TransactionMonitor';
export { AddressRegistry, AddressStatus } from './AddressRegistry';
export { AnomalyDetector, AnomalyType } from './AnomalyDetector';
export { AutonomousDefenseSystem, createDefaultDefenseConfig } from './AutonomousDefenseSystem';
export type { MonitorConfig, TransactionEvent, MonitorMetrics } from './TransactionMonitor';
export type { AddressRecord, RegistryStatistics } from './AddressRegistry';
export type { Anomaly, AnomalyReport, DetectionThresholds } from './AnomalyDetector';
export type { DefenseConfig, DefenseMetrics } from './AutonomousDefenseSystem';
