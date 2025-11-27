/**
 * DEX Integration Types
 *
 * Standard types and interfaces for DEX monitoring and integration
 */

import { EmotionalContext } from '../consciousness/types/memory';

/**
 * DEX configuration interface
 */
export type ChainType = 'EVM' | 'Solana';

export interface DEXConfig {
  name: string;
  protocol: string;
  chainType: ChainType;
  network: string; // e.g., '1' for EVM, 'mainnet-beta' for Solana
  router: string;
  factory: string;
  initCodeHash?: string;
  priority: number;
  liquidityThreshold: bigint;
  gasEstimate?: number;
}

/**
 * DEX event types
 */
export enum DEXEventType {
  SWAP = 'swap',
  ADD_LIQUIDITY = 'add_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
  POOL_CREATED = 'pool_created',
  PRICE_CHANGE = 'price_change',
  LIQUIDITY_CHANGE = 'liquidity_change',
  ERROR = 'error',
  VALIDATOR_SUCCESS = 'validator_success',
  VALIDATOR_FAILURE = 'validator_failure',
}

/**
 * DEX event data
 */
export interface DEXEvent {
  id: string;
  type: DEXEventType;
  dexName: string;
  timestamp: number;
  data: unknown;
  emotionalContext?: EmotionalContext;
  metadata?: Record<string, unknown>;
}

/**
 * Validator status result
 */
export interface ValidatorStatus {
  isHealthy: boolean;
  timestamp: number;
  dexName: string;
  components: ComponentStatus[];
  errors?: string[];
}

/**
 * Component status within a DEX
 */
export interface ComponentStatus {
  name: string;
  status: 'active' | 'inactive' | 'error';
  details?: Record<string, unknown>;
}

/**
 * Base interface for DEX validators
 */
export interface DEXValidator {
  /**
   * Check the health status of the DEX
   */
  checkStatus(): Promise<ValidatorStatus>;

  /**
   * Get the DEX name
   */
  getDEXName(): string;

  /**
   * Register a callback for DEX events
   */
  onEvent(callback: (event: DEXEvent) => void): void;
}

/**
 * Memory system hook interface for DEX events
 */
export interface DEXMemoryHook {
  /**
   * Record a DEX event in memory
   */
  recordEvent(event: DEXEvent): string;

  /**
   * Search for DEX events in memory
   */
  searchEvents(filter: {
    dexName?: string;
    type?: DEXEventType;
    timeRange?: { start: number; end: number };
  }): DEXEvent[];
}
