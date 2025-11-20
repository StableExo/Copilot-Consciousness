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
  
  /**
   * Enable fast mode for this relay
   * Multiplexes bundles to all builders for faster inclusion
   */
  fastMode?: boolean;
  
  /**
   * Associated beacon node URLs for MEV-Boost relays
   * Used for block validation in MEV-Boost setup
   */
  beaconNodes?: string[];
  
  /**
   * Builder names this relay connects to
   * Used for multi-relay MEV-Boost configurations
   */
  connectedBuilders?: string[];
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
  
  /** Bundle hash (after submission) */
  bundleHash?: string;
}

/**
 * Bundle simulation result from eth_callBundle
 */
export interface BundleSimulationResult {
  /** Whether the simulation was successful */
  success: boolean;
  
  /** Error message if simulation failed */
  error?: string;
  
  /** Simulated bundle hash */
  bundleHash?: string;
  
  /** Gas used by the bundle */
  bundleGasPrice?: string;
  
  /** Coinbase difference (profit to miner) */
  coinbaseDiff?: string;
  
  /** ETH sent to coinbase */
  ethSentToCoinbase?: string;
  
  /** Gas fees paid */
  gasFees?: string;
  
  /** State block number */
  stateBlockNumber?: number;
  
  /** Total gas used */
  totalGasUsed?: number;
  
  /** Individual transaction results */
  results?: Array<{
    /** Transaction hash */
    txHash?: string;
    
    /** Gas used by this transaction */
    gasUsed?: number;
    
    /** Gas price */
    gasPrice?: string;
    
    /** Whether transaction reverted */
    revert?: boolean;
    
    /** Revert reason */
    revertReason?: string;
    
    /** Transaction value */
    value?: string;
  }>;
}

/**
 * Bundle status from Flashbots relay
 */
export interface BundleStatus {
  /** Whether bundle was included */
  isIncluded: boolean;
  
  /** Block number if included */
  blockNumber?: number;
  
  /** Timestamp when included */
  timestamp?: number;
  
  /** Transaction hashes in bundle */
  txHashes?: string[];
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
    
    /** Share transaction hash */
    hash?: boolean;
    
    /** Share default logs (transfer, swap events) */
    default_logs?: boolean;
  };
  
  /** Builders to target (empty = all) */
  builders?: string[];
  
  /** Maximum block number for inclusion */
  maxBlockNumber?: number;
  
  /** Refund configuration */
  refundConfig?: {
    /** Percent of MEV to refund (0-100) */
    percent?: number;
  };
  
  /** 
   * Enable fast mode - multiplexes to all builders for faster inclusion
   * Increases validator incentives and shares with TEE searchers
   * @see https://docs.flashbots.net/flashbots-protect/quick-start
   */
  fastMode?: boolean;
  
  /**
   * Share with Trusted Execution Environment (TEE) searchers
   * TEE searchers get full transaction info (except signatures) with time delay for privacy
   */
  shareTEE?: boolean;
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
  
  /** Total simulations performed */
  totalSimulations?: number;
  
  /** Successful simulations */
  successfulSimulations?: number;
  
  /** Total bundles cancelled */
  totalCancellations?: number;
}

/**
 * Builder reputation tracking
 */
export interface BuilderReputation {
  /** Builder name/identifier */
  builder: string;
  
  /** Number of successful inclusions */
  successCount: number;
  
  /** Number of failed attempts */
  failureCount: number;
  
  /** Average inclusion time (blocks) */
  avgInclusionBlocks: number;
  
  /** Success rate (0-1) */
  successRate: number;
  
  /** Last used timestamp */
  lastUsed: Date;
  
  /** Whether currently active */
  isActive: boolean;
}

/**
 * MEV refund tracking
 */
export interface MEVRefund {
  /** Transaction hash */
  txHash: string;
  
  /** Bundle hash */
  bundleHash?: string;
  
  /** MEV extracted (in wei) */
  mevExtracted: string;
  
  /** Refund amount (in wei) */
  refundAmount: string;
  
  /** Block number */
  blockNumber: number;
  
  /** Timestamp */
  timestamp: number;
}

/**
 * Private transaction options for eth_sendPrivateTransaction
 */
export interface PrivateTransactionParams {
  /** Signed transaction hex */
  tx: string;
  
  /** Maximum block number for inclusion (optional) */
  maxBlockNumber?: number;
  
  /** Preferences for transaction processing */
  preferences?: {
    /** Fast mode - multiplex to all builders */
    fast?: boolean;
    
    /** Enable transaction privacy (hide from searchers) */
    privacy?: {
      /** Privacy hints to share */
      hints?: string[];
      
      /** Builders to share with */
      builders?: string[];
    };
  };
}

/**
 * Transaction status from Flashbots Protect Status API
 * @see https://docs.flashbots.net/flashbots-protect/additional-documentation/status-api
 */
export enum TransactionStatus {
  /** Transaction is pending inclusion */
  PENDING = 'PENDING',
  
  /** Transaction was successfully included */
  INCLUDED = 'INCLUDED',
  
  /** Transaction failed */
  FAILED = 'FAILED',
  
  /** Transaction was cancelled */
  CANCELLED = 'CANCELLED',
  
  /** Status unknown */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Transaction status response from Flashbots Protect API
 */
export interface FlashbotsTransactionStatus {
  /** Current status */
  status: TransactionStatus;
  
  /** Transaction hash */
  hash: string;
  
  /** Maximum block number for inclusion */
  maxBlockNumber?: number;
  
  /** Transaction details (only available when INCLUDED) */
  transaction?: {
    from: string;
    to: string;
    gasLimit: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    nonce: string;
    value: string;
  };
  
  /** Block number (if included) */
  blockNumber?: number;
  
  /** Timestamp (if included) */
  timestamp?: number;
}

/**
 * Bundle replacement options using replacementUuid
 */
export interface BundleReplacementOptions {
  /** Unique UUID to identify bundle for replacement/cancellation */
  replacementUuid: string;
  
  /** Whether this is a replacement (true) or cancellation (false) */
  isReplacement: boolean;
}

/**
 * Privacy hint helper types
 */
export enum PrivacyHint {
  /** Share transaction calldata */
  CALLDATA = 'calldata',
  
  /** Share contract address */
  CONTRACT_ADDRESS = 'contract_address',
  
  /** Share function selector */
  FUNCTION_SELECTOR = 'function_selector',
  
  /** Share logs */
  LOGS = 'logs',
  
  /** Share transaction hash */
  HASH = 'hash',
  
  /** Share default logs (Uniswap, Balancer, Curve swaps) */
  DEFAULT_LOGS = 'default_logs',
  
  /** Share transaction hash */
  TX_HASH = 'tx_hash',
}

/**
 * Privacy hint recommendation based on use case
 */
export interface PrivacyHintRecommendation {
  /** Recommended hints */
  hints: PrivacyHint[];
  
  /** Expected refund percentage */
  expectedRefundPercent: number;
  
  /** Privacy level (0-100, higher = more private) */
  privacyScore: number;
  
  /** Explanation */
  reasoning: string;
}

/**
 * Bundle Cache API Types
 * https://docs.flashbots.net/flashbots-protect/additional-documentation/bundle-cache
 */

/**
 * Bundle cache information
 */
export interface BundleCacheInfo {
  /** Unique bundle ID (UUID v4) */
  bundleId: string;
  
  /** Array of raw signed transactions */
  rawTxs: string[];
  
  /** Timestamp when bundle was created */
  createdAt?: Date;
  
  /** Number of transactions in bundle */
  txCount?: number;
}

/**
 * Options for creating a bundle cache
 */
export interface BundleCacheOptions {
  /** Custom bundle ID (if not provided, will be generated) */
  bundleId?: string;
  
  /** Enable fake funds mode (returns 100 ETH balance for testing) */
  fakeFunds?: boolean;
  
  /** Chain ID (default: 1 for mainnet) */
  chainId?: number;
}

/**
 * Result of adding a transaction to bundle cache
 */
export interface BundleCacheAddResult {
  /** Bundle ID */
  bundleId: string;
  
  /** Transaction hash */
  txHash: string;
  
  /** Current transaction count in bundle */
  txCount: number;
  
  /** Success flag */
  success: boolean;
}
