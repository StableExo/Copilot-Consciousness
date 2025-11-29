import { createPublicClient, http } from 'viem';
import type { PublicClient, HttpTransport, Chain } from 'viem';
import { base, mainnet } from 'viem/chains';

// NOTE: Bun automatically loads .env files

/** Default fallback RPC URL for local development when no environment variable is configured */
const DEFAULT_LOCAL_RPC_URL = 'http://localhost:8545';

/**
 * Type for the public client - matches what createPublicClient returns with http transport
 */
type ViemPublicClient = PublicClient<HttpTransport, Chain>;

let _publicClient: ViemPublicClient | null = null;

/**
 * Get the chain configuration based on RPC URL
 */
function getChainFromRpcUrl(rpcUrl: string): Chain {
  // Default to Base if BASE_RPC_URL is set, otherwise mainnet
  if (process.env.BASE_RPC_URL && rpcUrl === process.env.BASE_RPC_URL) {
    return base;
  }
  return mainnet;
}

/**
 * Get the public client instance, creating it lazily on first access
 */
export function getPublicClient(): ViemPublicClient {
  if (!_publicClient) {
    const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.BASE_RPC_URL;
    if (!rpcUrl) {
      // In a real application, you might have a fallback or a more robust config system
      console.error(
        'RPC URL not found. Please set ETHEREUM_RPC_URL or BASE_RPC_URL in your .env file'
      );
      throw new Error('RPC URL is required');
    }
    _publicClient = createPublicClient({
      chain: getChainFromRpcUrl(rpcUrl),
      transport: http(rpcUrl),
    });
  }
  return _publicClient;
}

/**
 * Export a lazily-initialized public client for backward compatibility.
 *
 * Note: This creates the client instance on first import. For scenarios
 * where the RPC URL might not be configured at import time, use getPublicClient()
 * instead for deferred initialization.
 */
function initializePublicClient(): ViemPublicClient {
  const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.BASE_RPC_URL;
  if (!rpcUrl) {
    // Return a client with a placeholder URL that will fail on actual use
    // This allows the module to load even when env vars aren't set (e.g., during testing)
    console.warn(
      'Warning: RPC URL not configured. Please set ETHEREUM_RPC_URL or BASE_RPC_URL in your .env file. ' +
        `Client will use fallback URL (${DEFAULT_LOCAL_RPC_URL}) which will fail on actual blockchain calls.`
    );
    return createPublicClient({
      chain: mainnet,
      transport: http(DEFAULT_LOCAL_RPC_URL),
    });
  }
  return createPublicClient({
    chain: getChainFromRpcUrl(rpcUrl),
    transport: http(rpcUrl),
  });
}

// Export the actual public client instance for backward compatibility
export const publicClient: ViemPublicClient = initializePublicClient();

/**
 * @deprecated Use `publicClient` instead. This alias exists only for backward compatibility
 * during the ethers.js to viem migration and will be removed in a future version.
 */
export const provider = publicClient;

/**
 * @deprecated Use `getPublicClient()` instead. This alias exists only for backward compatibility
 * during the ethers.js to viem migration and will be removed in a future version.
 */
export const getProvider = getPublicClient;
