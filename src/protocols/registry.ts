/**
 * Protocol Registry - Central registry for protocol adapters
 *
 * Integrated from AxionCitadel's protocol management system.
 * Provides unified access to all supported DEX protocols.
 *
 * Re-exports and extends functionality from src/config/registry/protocol-registry.ts
 */

export {
  ProtocolType,
  ProtocolConfig,
  ProtocolRegistry,
  protocolRegistry,
} from '../config/registry/protocol-registry';

// Re-export related utilities
export { TokenPrecisionManager } from '../config/registry/token-precision';

export {
  KNOWN_ADDRESSES,
  getChainAddresses,
  getWETHAddress,
} from '../config/registry/known-addresses';

export { DynamicPoolManager, PoolManifest, Pool } from '../config/registry/dynamic-pool-manifest';
