/**
 * BuilderNet Intelligence Module
 *
 * Integration with Flashbots BuilderNet - decentralized block-building network
 * Introduced in December 2024 for enhanced decentralization and privacy
 *
 * Key Features:
 * - TEE (Trusted Execution Environment) attestation tracking
 * - BuilderHub integration concepts
 * - Decentralized builder node management
 * - Remote attestation verification simulation
 * - Orderflow privacy monitoring
 *
 * Based on: https://buildernet.org/docs/architecture
 */

import { keccak256, toUtf8Bytes, JsonRpcProvider } from 'ethers';
// ethers namespace reserved for utilities
import type { ethers as _ethers } from 'ethers';
import { logger } from '../../utils/logger';

/**
 * TEE Attestation status
 */
export enum TEEAttestationStatus {
  /** Attestation verified successfully */
  VERIFIED = 'verified',

  /** Attestation pending verification */
  PENDING = 'pending',

  /** Attestation failed verification */
  FAILED = 'failed',

  /** Attestation expired */
  EXPIRED = 'expired',

  /** No attestation available */
  NONE = 'none',
}

/**
 * Builder node information
 */
export interface BuilderNodeInfo {
  /** Node operator identifier */
  operator: string;

  /** Node IP address */
  ipAddress: string;

  /** TEE attestation status */
  attestationStatus: TEEAttestationStatus;

  /** Attestation timestamp */
  attestationTimestamp?: number;

  /** Node reputation score (0-1) */
  reputationScore: number;

  /** Whether node is actively building */
  isActive: boolean;

  /** Connected relay endpoints */
  connectedRelays: string[];

  /** Orderflow sources this node accepts */
  orderflowSources: string[];

  /** Last activity timestamp */
  lastActivity: Date;
}

/**
 * TEE Attestation record
 */
export interface TEEAttestation {
  /** Node identifier */
  nodeId: string;

  /** Attestation hash/signature */
  attestationHash: string;

  /** TEE platform (e.g., Intel SGX, AMD SEV) */
  platform: string;

  /** Code measurement/hash running in TEE */
  codeMeasurement: string;

  /** Verification timestamp */
  timestamp: number;

  /** Expiration timestamp */
  expiresAt: number;

  /** Verification status */
  status: TEEAttestationStatus;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * BuilderHub configuration
 */
export interface BuilderHubConfig {
  /** BuilderHub endpoint URL */
  endpoint: string;

  /** Enable attestation verification */
  enableAttestationVerification: boolean;

  /** Minimum required attestation age (seconds) */
  minAttestationAge: number;

  /** Maximum attestation age before expiration (seconds) */
  maxAttestationAge: number;

  /** Minimum reputation score to trust node */
  minReputationScore: number;
}

/**
 * Orderflow privacy configuration
 */
export interface OrderflowPrivacyConfig {
  /** Enable end-to-end encryption */
  enableEncryption: boolean;

  /** Require TEE attestation for orderflow submission */
  requireTEEAttestation: boolean;

  /** Allow orderflow sharing between nodes */
  allowPeerSharing: boolean;

  /** Maximum hops for orderflow distribution */
  maxDistributionHops: number;
}

/**
 * BuilderNet Intelligence - Monitor and optimize BuilderNet participation
 */
export class BuilderNetIntelligence {
  private builderNodes: Map<string, BuilderNodeInfo>;
  private attestations: Map<string, TEEAttestation>;
  private hubConfig: BuilderHubConfig;
  private privacyConfig: OrderflowPrivacyConfig;
  private provider: JsonRpcProvider;

  constructor(
    provider: JsonRpcProvider,
    hubConfig?: Partial<BuilderHubConfig>,
    privacyConfig?: Partial<OrderflowPrivacyConfig>
  ) {
    this.provider = provider;
    this.builderNodes = new Map();
    this.attestations = new Map();

    this.hubConfig = {
      endpoint: hubConfig?.endpoint || 'https://builderhub.flashbots.net',
      enableAttestationVerification: hubConfig?.enableAttestationVerification ?? true,
      minAttestationAge: hubConfig?.minAttestationAge || 60, // 1 minute
      maxAttestationAge: hubConfig?.maxAttestationAge || 86400, // 24 hours
      minReputationScore: hubConfig?.minReputationScore || 0.7,
    };

    this.privacyConfig = {
      enableEncryption: privacyConfig?.enableEncryption ?? true,
      requireTEEAttestation: privacyConfig?.requireTEEAttestation ?? true,
      allowPeerSharing: privacyConfig?.allowPeerSharing ?? false,
      maxDistributionHops: privacyConfig?.maxDistributionHops || 2,
    };

    logger.info('[BuilderNetIntelligence] Initialized with BuilderHub:', this.hubConfig.endpoint);
  }

  /**
   * Register a builder node with attestation
   */
  registerBuilderNode(nodeInfo: BuilderNodeInfo): void {
    this.builderNodes.set(nodeInfo.operator, nodeInfo);
    logger.info('[BuilderNetIntelligence] Registered builder node:', nodeInfo.operator);
  }

  /**
   * Record TEE attestation for a builder node
   */
  recordAttestation(attestation: TEEAttestation): void {
    const now = Date.now();

    // Validate attestation timing
    if (attestation.timestamp < now - this.hubConfig.maxAttestationAge * 1000) {
      attestation.status = TEEAttestationStatus.EXPIRED;
    } else if (attestation.timestamp > now + this.hubConfig.minAttestationAge * 1000) {
      attestation.status = TEEAttestationStatus.PENDING;
    } else {
      attestation.status = TEEAttestationStatus.VERIFIED;
    }

    this.attestations.set(attestation.nodeId, attestation);

    // Update builder node attestation status
    const node = this.builderNodes.get(attestation.nodeId);
    if (node) {
      node.attestationStatus = attestation.status;
      node.attestationTimestamp = attestation.timestamp;
    }

    logger.info(
      `[BuilderNetIntelligence] Recorded attestation for ${attestation.nodeId}: ${attestation.status} (${attestation.platform})`
    );
  }

  /**
   * Verify TEE attestation for a builder node
   */
  verifyAttestation(nodeId: string): {
    verified: boolean;
    status: TEEAttestationStatus;
    reason?: string;
  } {
    if (!this.hubConfig.enableAttestationVerification) {
      return { verified: true, status: TEEAttestationStatus.VERIFIED };
    }

    const attestation = this.attestations.get(nodeId);

    if (!attestation) {
      return {
        verified: false,
        status: TEEAttestationStatus.NONE,
        reason: 'No attestation found',
      };
    }

    const now = Date.now();
    const age = (now - attestation.timestamp) / 1000; // seconds

    // Check if expired
    if (age > this.hubConfig.maxAttestationAge) {
      return {
        verified: false,
        status: TEEAttestationStatus.EXPIRED,
        reason: `Attestation expired (age: ${age}s)`,
      };
    }

    // Check if too new (potential clock skew)
    if (attestation.timestamp > now + 300000) {
      // 5 minutes future tolerance
      return {
        verified: false,
        status: TEEAttestationStatus.FAILED,
        reason: 'Attestation timestamp in future',
      };
    }

    return {
      verified: attestation.status === TEEAttestationStatus.VERIFIED,
      status: attestation.status,
    };
  }

  /**
   * Get trusted builder nodes (verified attestation + good reputation)
   */
  getTrustedBuilderNodes(): BuilderNodeInfo[] {
    const trustedNodes: BuilderNodeInfo[] = [];

    for (const node of this.builderNodes.values()) {
      // Check attestation
      const verification = this.verifyAttestation(node.operator);

      // Check reputation
      const meetsReputationThreshold = node.reputationScore >= this.hubConfig.minReputationScore;

      // Check active status
      const isRecent = Date.now() - node.lastActivity.getTime() < 3600000; // 1 hour

      if (verification.verified && meetsReputationThreshold && node.isActive && isRecent) {
        trustedNodes.push(node);
      }
    }

    return trustedNodes.sort((a, b) => b.reputationScore - a.reputationScore);
  }

  /**
   * Update builder node reputation based on performance
   */
  updateNodeReputation(nodeId: string, success: boolean, weight: number = 1.0): void {
    const node = this.builderNodes.get(nodeId);
    if (!node) {
      logger.warn('[BuilderNetIntelligence] Node not found for reputation update:', nodeId);
      return;
    }

    // Simple exponential moving average
    const alpha = 0.1 * weight; // Learning rate weighted by importance
    const outcome = success ? 1.0 : 0.0;

    node.reputationScore = node.reputationScore * (1 - alpha) + outcome * alpha;
    node.lastActivity = new Date();

    logger.debug(
      `[BuilderNetIntelligence] Updated reputation for ${nodeId}: ${node.reputationScore.toFixed(
        3
      )} (${success ? 'success' : 'failure'})`
    );
  }

  /**
   * Recommend builder nodes for orderflow submission
   */
  recommendBuildersForOrderflow(
    privacyLevel: 'low' | 'medium' | 'high' = 'medium'
  ): BuilderNodeInfo[] {
    const trustedNodes = this.getTrustedBuilderNodes();

    if (privacyLevel === 'high') {
      // High privacy: only TEE-attested nodes with recent attestations
      return trustedNodes.filter((node) => {
        const attestation = this.attestations.get(node.operator);
        if (!attestation) return false;

        const age = (Date.now() - attestation.timestamp) / 1000;
        return age < 3600; // Last hour only
      });
    } else if (privacyLevel === 'medium') {
      // Medium: any verified TEE node
      return trustedNodes;
    } else {
      // Low: all active nodes
      return Array.from(this.builderNodes.values())
        .filter((n) => n.isActive)
        .sort((a, b) => b.reputationScore - a.reputationScore);
    }
  }

  /**
   * Check if orderflow can be safely shared with peer nodes
   */
  canShareOrderflow(fromNode: string, toNode: string): boolean {
    if (!this.privacyConfig.allowPeerSharing) {
      return false;
    }

    const fromNodeInfo = this.builderNodes.get(fromNode);
    const toNodeInfo = this.builderNodes.get(toNode);

    if (!fromNodeInfo || !toNodeInfo) {
      return false;
    }

    // Both nodes must have verified attestation if required
    if (this.privacyConfig.requireTEEAttestation) {
      const fromVerified = this.verifyAttestation(fromNode).verified;
      const toVerified = this.verifyAttestation(toNode).verified;

      if (!fromVerified || !toVerified) {
        return false;
      }
    }

    // Both must meet minimum reputation
    if (
      fromNodeInfo.reputationScore < this.hubConfig.minReputationScore ||
      toNodeInfo.reputationScore < this.hubConfig.minReputationScore
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get BuilderNet statistics
   */
  getStatistics(): {
    totalNodes: number;
    activeNodes: number;
    verifiedNodes: number;
    trustedNodes: number;
    attestations: {
      total: number;
      verified: number;
      expired: number;
      failed: number;
    };
    averageReputation: number;
  } {
    const allNodes = Array.from(this.builderNodes.values());
    const activeNodes = allNodes.filter((n) => n.isActive);
    const trustedNodes = this.getTrustedBuilderNodes();

    const attestationStatuses = Array.from(this.attestations.values());

    const avgReputation =
      allNodes.length > 0
        ? allNodes.reduce((sum, n) => sum + n.reputationScore, 0) / allNodes.length
        : 0;

    return {
      totalNodes: allNodes.length,
      activeNodes: activeNodes.length,
      verifiedNodes: allNodes.filter((n) => n.attestationStatus === TEEAttestationStatus.VERIFIED)
        .length,
      trustedNodes: trustedNodes.length,
      attestations: {
        total: attestationStatuses.length,
        verified: attestationStatuses.filter((a) => a.status === TEEAttestationStatus.VERIFIED)
          .length,
        expired: attestationStatuses.filter((a) => a.status === TEEAttestationStatus.EXPIRED)
          .length,
        failed: attestationStatuses.filter((a) => a.status === TEEAttestationStatus.FAILED).length,
      },
      averageReputation: avgReputation,
    };
  }

  /**
   * Simulate remote attestation (for testing/demonstration)
   */
  simulateRemoteAttestation(
    nodeId: string,
    platform: 'Intel SGX' | 'AMD SEV' | 'ARM TrustZone' = 'Intel SGX'
  ): TEEAttestation {
    const now = Date.now();

    // Generate simulated attestation
    const attestation: TEEAttestation = {
      nodeId,
      attestationHash: keccak256(toUtf8Bytes(`${nodeId}-${now}-${platform}`)),
      platform,
      codeMeasurement: keccak256(toUtf8Bytes('buildernet-v1.2-verified-code')),
      timestamp: now,
      expiresAt: now + this.hubConfig.maxAttestationAge * 1000,
      status: TEEAttestationStatus.VERIFIED,
      metadata: {
        buildVersion: 'v1.2',
        operator: nodeId,
        simulatedAttestation: true,
      },
    };

    this.recordAttestation(attestation);

    return attestation;
  }

  /**
   * Cleanup expired attestations
   */
  cleanupExpiredAttestations(): number {
    const now = Date.now();
    let removed = 0;

    for (const [nodeId, attestation] of this.attestations.entries()) {
      if (attestation.expiresAt < now) {
        this.attestations.delete(nodeId);
        removed++;

        // Update node status
        const node = this.builderNodes.get(nodeId);
        if (node) {
          node.attestationStatus = TEEAttestationStatus.EXPIRED;
        }
      }
    }

    if (removed > 0) {
      logger.info(`[BuilderNetIntelligence] Cleaned up ${removed} expired attestations`);
    }

    return removed;
  }
}
