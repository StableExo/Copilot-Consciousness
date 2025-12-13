/**
 * Multi-Builder Infrastructure - Type Definitions
 * 
 * Implements multi-builder submission strategy for AEV Alliance:
 * - Submit bundles to multiple MEV-Boost builders in parallel
 * - Track builder performance and reputation
 * - Optimize builder selection based on bundle characteristics
 * - Maximize inclusion probability across Titan, Flashbots, bloXroute
 */

import { NegotiatedBlock } from '../negotiator/types';

/**
 * Supported MEV builders
 */
export enum BuilderName {
  TITAN = 'titan',
  BUILDERNET = 'buildernet',
  FLASHBOTS = 'flashbots',
  BLOXROUTE = 'bloxroute',
  BEAVER = 'beaver',
  RSYNC = 'rsync',
  UNKNOWN = 'unknown',
}

/**
 * Builder endpoint configuration
 */
export interface BuilderEndpoint {
  /** Builder identifier */
  name: BuilderName;
  
  /** Display name */
  displayName: string;
  
  /** MEV-Boost relay URL */
  relayUrl: string;
  
  /** Alternative relay URLs for fallback */
  fallbackUrls?: string[];
  
  /** Average market share (0-1) */
  marketShare: number;
  
  /** Supported capabilities */
  capabilities: BuilderCapability[];
  
  /** Whether this builder is currently active */
  isActive: boolean;
  
  /** Priority (higher = prefer in case of conflicts) */
  priority: number;
  
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Builder capabilities
 */
export enum BuilderCapability {
  STANDARD_BUNDLES = 'standard_bundles',
  MEV_SHARE = 'mev_share',
  PARALLEL_MERGING = 'parallel_merging',
  BUNDLE_SIMULATION = 'bundle_simulation',
  BUNDLE_CANCELLATION = 'bundle_cancellation',
  BUILDER_PREFERENCES = 'builder_preferences',
}

/**
 * Standard MEV-Boost bundle format
 */
export interface StandardBundle {
  /** Array of signed transaction hex strings */
  txs: string[];
  
  /** Target block number */
  blockNumber: number;
  
  /** Optional minimum timestamp */
  minTimestamp?: number;
  
  /** Optional maximum timestamp */
  maxTimestamp?: number;
  
  /** Transaction hashes that can revert */
  revertingTxHashes?: string[];
  
  /** Builder preferences (if supported) */
  privacy?: {
    hints?: string[];
    builders?: string[];
  };
}

/**
 * Bundle submission parameters (v0.1 format)
 */
export interface BundleSubmissionParams {
  version: string;
  
  inclusion: {
    block: number;
    maxBlock?: number;
  };
  
  body: {
    tx: string[];
    canRevert: boolean[];
  };
  
  privacy?: {
    hints?: string[];
    builders?: string[];
  };
  
  validity?: {
    refund?: Array<{
      bodyIdx: number;
      percent: number;
    }>;
  };
}

/**
 * Bundle submission result
 */
export interface BundleSubmissionResult {
  /** Builder that accepted the bundle */
  builder: BuilderName;
  
  /** Whether submission was successful */
  success: boolean;
  
  /** Bundle hash (if successful) */
  bundleHash?: string;
  
  /** Error message (if failed) */
  error?: string;
  
  /** Submission timestamp */
  timestamp: Date;
  
  /** Response time in milliseconds */
  responseTimeMs: number;
}

/**
 * Multi-builder submission results
 */
export interface MultiBuilderSubmissionResult {
  /** Original negotiated block */
  negotiatedBlock: NegotiatedBlock;
  
  /** Total builders attempted */
  buildersAttempted: number;
  
  /** Successful submissions */
  successfulSubmissions: BundleSubmissionResult[];
  
  /** Failed submissions */
  failedSubmissions: BundleSubmissionResult[];
  
  /** Overall success (at least one builder accepted) */
  success: boolean;
  
  /** Combined inclusion probability (0-1) */
  estimatedInclusionProbability: number;
  
  /** Total submission time */
  totalTimeMs: number;
}

/**
 * Builder performance metrics
 */
export interface BuilderMetrics {
  /** Builder name */
  builder: BuilderName;
  
  /** Total bundles submitted */
  totalSubmissions: number;
  
  /** Successful submissions */
  successfulSubmissions: number;
  
  /** Bundles that got included on-chain */
  inclusionsOnChain: number;
  
  /** Success rate (0-1) */
  successRate: number;
  
  /** Inclusion rate (0-1) */
  inclusionRate: number;
  
  /** Average response time (ms) */
  avgResponseTimeMs: number;
  
  /** Total value submitted (USD) */
  totalValueSubmitted: number;
  
  /** Total value captured on-chain (USD) */
  totalValueCaptured: number;
  
  /** Last submission timestamp */
  lastSubmission?: Date;
  
  /** Last inclusion timestamp */
  lastInclusion?: Date;
  
  /** Current reputation score (0-1) */
  reputationScore: number;
  
  /** Whether builder is currently active */
  isActive: boolean;
}

/**
 * Builder selection strategy
 */
export enum BuilderSelectionStrategy {
  /** Submit to all active builders */
  ALL = 'all',
  
  /** Submit to top N builders by market share */
  TOP_N = 'top_n',
  
  /** Submit based on bundle value thresholds */
  VALUE_BASED = 'value_based',
  
  /** Submit based on historical performance */
  PERFORMANCE_BASED = 'performance_based',
  
  /** Adaptive selection using ML */
  ADAPTIVE = 'adaptive',
}

/**
 * Configuration for multi-builder manager
 */
export interface MultiBuilderConfig {
  /** Builder selection strategy */
  selectionStrategy: BuilderSelectionStrategy;
  
  /** Number of builders to use (for TOP_N strategy) */
  topN?: number;
  
  /** Value thresholds for value-based selection */
  valueThresholds?: {
    low: number; // USD
    medium: number; // USD
    high: number; // USD
  };
  
  /** Minimum builder success rate to use */
  minBuilderSuccessRate: number;
  
  /** Enable parallel submission */
  enableParallelSubmission: boolean;
  
  /** Timeout for bundle submission (ms) */
  submissionTimeoutMs: number;
  
  /** Enable performance tracking */
  enablePerformanceTracking: boolean;
  
  /** Performance window (blocks) */
  performanceWindowBlocks: number;
}

/**
 * Bundle conversion options
 */
export interface BundleConversionOptions {
  /** Target block number */
  targetBlock: number;
  
  /** Chain ID */
  chainId: number;
  
  /** Signer for bundle signature */
  signerPrivateKey: string;
  
  /** Builder preferences */
  preferredBuilders?: BuilderName[];
  
  /** Allow transaction reverts */
  allowReverts?: boolean;
}

/**
 * Builder API client interface
 */
export interface IBuilderClient {
  /** Builder name */
  readonly builderName: BuilderName;
  
  /** Submit bundle to builder */
  submitBundle(bundle: StandardBundle): Promise<BundleSubmissionResult>;
  
  /** Simulate bundle execution (if supported) */
  simulateBundle?(bundle: StandardBundle): Promise<SimulationResult>;
  
  /** Get bundle statistics */
  getBundleStats?(bundleHash: string): Promise<BundleStats>;
  
  /** Cancel bundle (if supported) */
  cancelBundle?(bundleHash: string): Promise<boolean>;
  
  /** Check if builder is healthy */
  healthCheck(): Promise<boolean>;
}

/**
 * Bundle simulation result
 */
export interface SimulationResult {
  /** Whether simulation was successful */
  success: boolean;
  
  /** Estimated gas used */
  gasUsed?: number;
  
  /** Estimated profit (wei) */
  profit?: bigint;
  
  /** State changes */
  stateChanges?: unknown[];
  
  /** Error message (if failed) */
  error?: string;
}

/**
 * Bundle statistics
 */
export interface BundleStats {
  /** Bundle hash */
  bundleHash: string;
  
  /** Whether bundle was included */
  isIncluded: boolean;
  
  /** Block number (if included) */
  blockNumber?: number;
  
  /** Transaction hashes (if included) */
  txHashes?: string[];
  
  /** Actual profit (wei) */
  actualProfit?: bigint;
  
  /** Builder that included it */
  includedBy?: BuilderName;
}
