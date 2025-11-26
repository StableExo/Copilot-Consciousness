/**
 * Types for Phase 3: Enhanced Security
 *
 * Core type definitions for ML-based secret detection, automated threat response,
 * and security pattern learning.
 */

/**
 * Secret scan result
 */
export interface ScanResult {
  timestamp: number;
  scanId: string;

  // Overall result
  hasSensitiveData: boolean;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;

  // Detected secrets
  detectedSecrets: DetectedSecret[];

  // Recommendations
  recommendations: string[];

  // Scan metadata
  scannedContent: string;
  scanDuration: number;
}

/**
 * Detected secret or sensitive data
 */
export interface DetectedSecret {
  type: SecretType;
  location: {
    line?: number;
    column?: number;
    field?: string;
  };
  redactedValue: string; // Partially masked value
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

/**
 * Types of secrets that can be detected
 */
export type SecretType =
  | 'private_key'
  | 'mnemonic'
  | 'api_key'
  | 'password'
  | 'jwt'
  | 'bearer_token'
  | 'aws_key'
  | 'database_url'
  | 'rpc_url'
  | 'webhook_url'
  | 'ssh_key'
  | 'certificate'
  | 'unknown_sensitive';

/**
 * Threat event
 */
export interface ThreatEvent {
  eventId: string;
  timestamp: number;

  // Threat details
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;

  // Source information
  source: {
    ipAddress?: string;
    userAgent?: string;
    userId?: string;
    chainId?: number;
    component?: string;
  };

  // Threat description
  description: string;
  indicators: string[];

  // Context
  context: Record<string, any>;

  // Related events
  relatedEventIds?: string[];
}

/**
 * Types of threats
 */
export type ThreatType =
  | 'unauthorized_access'
  | 'brute_force'
  | 'injection_attempt'
  | 'rate_limit_abuse'
  | 'suspicious_transaction'
  | 'mev_attack'
  | 'frontrun_attempt'
  | 'sandwich_attack'
  | 'flash_loan_attack'
  | 'reentrancy_attempt'
  | 'price_manipulation'
  | 'data_exfiltration'
  | 'malicious_contract'
  | 'phishing_attempt'
  | 'anomalous_behavior';

/**
 * Response action to threat
 */
export interface ResponseAction {
  actionId: string;
  timestamp: number;

  // Action details
  type: ResponseActionType;
  priority: number; // 1-10

  // Target
  target: {
    type: 'user' | 'ip' | 'chain' | 'contract' | 'system';
    identifier: string;
  };

  // Action parameters
  parameters: Record<string, any>;

  // Execution
  executed: boolean;
  executedAt?: number;
  result?: 'success' | 'failure' | 'partial';
  error?: string;

  // Rationale
  reason: string;
}

/**
 * Types of response actions
 */
export type ResponseActionType =
  | 'block_ip'
  | 'ban_user'
  | 'rotate_keys'
  | 'halt_trading'
  | 'isolate_chain'
  | 'increase_scrutiny'
  | 'alert_operator'
  | 'log_extended'
  | 'reject_transaction'
  | 'pause_strategy'
  | 'activate_safeguards'
  | 'throttle_requests';

/**
 * Security incident
 */
export interface SecurityIncident {
  incidentId: string;
  timestamp: number;

  // Incident details
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Involved entities
  threats: ThreatEvent[];
  responses: ResponseAction[];

  // Impact
  impacted: {
    users?: number;
    transactions?: number;
    loss?: number; // in USD
    downtime?: number; // in seconds
  };

  // Resolution
  resolved: boolean;
  resolvedAt?: number;
  resolution?: string;

  // Learning
  lessonLearned?: string;
  preventionSuggestions?: string[];
}

/**
 * Mitigation suggestion
 */
export interface MitigationSuggestion {
  suggestionId: string;
  timestamp: number;

  // Target threat
  targetThreatType: ThreatType;

  // Suggestion
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';

  // Implementation
  implementationSteps: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  expectedImpact: number; // 0-1 scale

  // Evidence
  basedOnIncidents: string[]; // Incident IDs
  confidence: number;
}

/**
 * Security pattern
 */
export interface SecurityPattern {
  patternId: string;
  detectedAt: number;

  // Pattern details
  type: 'attack_pattern' | 'vulnerability_pattern' | 'usage_pattern';
  description: string;

  // Frequency
  occurrences: number;
  firstSeen: number;
  lastSeen: number;

  // Characteristics
  characteristics: Record<string, any>;

  // Associated threats
  associatedThreats: ThreatType[];

  // Risk
  riskScore: number; // 0-1 scale
}

/**
 * Threat intelligence feed entry
 */
export interface ThreatIntelligence {
  entryId: string;
  timestamp: number;

  // Threat details
  threatType: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Indicators of Compromise (IOCs)
  iocs: {
    ips?: string[];
    addresses?: string[];
    txHashes?: string[];
    signatures?: string[];
  };

  // Mitigation
  suggestedMitigations: string[];

  // Source
  source: string;
  confidence: number;
}
