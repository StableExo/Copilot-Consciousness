/**
 * Private RPC / MEV-Friendly Relay Types
 * 
 * Support for private transaction submission to reduce MEV exposure:
 * - Flashbots Protect RPC
 * - MEV-Share
 * - Builder private endpoints
 * 
 * Benefits:
 * - Transactions stay out of public mempool
 * - Reduced front-running risk
 * - Direct routing to block builders
 * - Protection from copycat bots
 */

import { ethers } from 'ethers';

/**
 * Supported private relay types
 */
export enum PrivateRelayType {
  /** Flashbots Protect RPC - https://docs.flashbots.net/flashbots-protect/overview */
  FLASHBOTS_PROTECT = 'flashbots_protect',
  
  /** MEV-Share for shared MEV revenue - https://docs.flashbots.net/flashbots-mev-share/overview */
  MEV_SHARE = 'mev_share',
  
  /** Builder-specific private RPC endpoints */
  BUILDER_RPC = 'builder_rpc',
  
  /** Standard public RPC (fallback) */
  PUBLIC_RPC = 'public_rpc',
}

/**
 * Privacy level for transaction submission
 */
export enum PrivacyLevel {
  /** No privacy - submit to public mempool */
  NONE = 'none',
  
  /** Basic privacy - use Flashbots Protect */
  BASIC = 'basic',
  
  /** Enhanced privacy - use MEV-Share with hints */
  ENHANCED = 'enhanced',
  
  /** Maximum privacy - builder direct with no hints */
  MAXIMUM = 'maximum',
}

/**
 * Configuration for a private relay endpoint
 */
export interface PrivateRelayConfig {
  /** Type of relay */
  type: PrivateRelayType;
  
  /** RPC endpoint URL */
  endpoint: string;
  
  /** Optional authentication key/token */
  authKey?: string;
  
  /** Optional signing key for bundles */
  signingKey?: string;
  
  /** Whether this relay is currently enabled */
  enabled: boolean;
  
  /** Priority (higher = preferred) */
  priority: number;
  
  /** Optional name/label for this relay */
  name?: string;
}

/**
 * Flashbots bundle parameters
 */
export interface FlashbotsBundle {
  /** Array of signed transactions in the bundle */
  signedTransactions: string[];
  
  /** Target block number for inclusion */
  targetBlockNumber: number;
  
  /** Minimum timestamp for bundle validity */
  minTimestamp?: number;
  
  /** Maximum timestamp for bundle validity */
  maxTimestamp?: number;
  
  /** Reverting transaction hashes (optional) */
  revertingTxHashes?: string[];
}

/**
 * MEV-Share specific options
 */
export interface MEVShareOptions {
  /** Share hints about the transaction */
  hints?: {
    /** Share transaction calldata */
    calldata?: boolean;
    
    /** Share contract address */
    contractAddress?: boolean;
    
    /** Share function selector */
    functionSelector?: boolean;
    
    /** Share logs */
    logs?: boolean;
  };
  
  /** Builders to target (empty = all) */
  builders?: string[];
  
  /** Maximum block number for inclusion */
  maxBlockNumber?: number;
}

/**
 * Private transaction submission options
 */
export interface PrivateTransactionOptions {
  /** Preferred relay type (will try fallbacks if this fails) */
  preferredRelay?: PrivateRelayType;
  
  /** Privacy level desired */
  privacyLevel?: PrivacyLevel;
  
  /** Whether to use fast mode (submit to multiple relays) */
  fastMode?: boolean;
  
  /** MEV-Share specific options */
  mevShareOptions?: MEVShareOptions;
  
  /** Maximum number of blocks to wait for inclusion */
  maxBlockWait?: number;
  
  /** Whether to fallback to public mempool if private fails */
  allowPublicFallback?: boolean;
}

/**
 * Result of private transaction submission
 */
export interface PrivateTransactionResult {
  /** Whether submission was successful */
  success: boolean;
  
  /** Transaction hash (if available) */
  txHash?: string;
  
  /** Relay type used */
  relayUsed?: PrivateRelayType;
  
  /** Bundle hash (for Flashbots) */
  bundleHash?: string;
  
  /** Block number included in (if confirmed) */
  blockNumber?: number;
  
  /** Error message if failed */
  error?: string;
  
  /** Additional metadata */
  metadata?: {
    /** Whether transaction was seen in public mempool */
    publicMempoolVisible?: boolean;
    
    /** Number of relays tried */
    relaysTried?: number;
    
    /** Time to inclusion (ms) */
    inclusionTime?: number;
  };
}

/**
 * Private RPC manager configuration
 */
export interface PrivateRPCManagerConfig {
  /** List of configured relays */
  relays: PrivateRelayConfig[];
  
  /** Default privacy level */
  defaultPrivacyLevel: PrivacyLevel;
  
  /** Whether to enable automatic fallback */
  enableFallback: boolean;
  
  /** Maximum time to wait for private submission (ms) */
  privateSubmissionTimeout: number;
  
  /** Whether to log detailed relay info */
  verboseLogging: boolean;
}

/**
 * Relay statistics for monitoring
 */
export interface RelayStats {
  /** Relay type */
  type: PrivateRelayType;
  
  /** Total submissions */
  totalSubmissions: number;
  
  /** Successful inclusions */
  successfulInclusions: number;
  
  /** Failed submissions */
  failedSubmissions: number;
  
  /** Average inclusion time (ms) */
  avgInclusionTime: number;
  
  /** Last submission timestamp */
  lastSubmission?: Date;
  
  /** Whether relay is currently available */
  isAvailable: boolean;
}
