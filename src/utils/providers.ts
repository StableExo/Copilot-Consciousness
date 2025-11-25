import { JsonRpcProvider } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

/** Default fallback RPC URL for local development when no environment variable is configured */
const DEFAULT_LOCAL_RPC_URL = 'http://localhost:8545';

let _provider: JsonRpcProvider | null = null;

/**
 * Get the provider instance, creating it lazily on first access
 */
export function getProvider(): JsonRpcProvider {
  if (!_provider) {
    const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.BASE_RPC_URL;
    if (!rpcUrl) {
      // In a real application, you might have a fallback or a more robust config system
      console.error('RPC URL not found. Please set ETHEREUM_RPC_URL or BASE_RPC_URL in your .env file');
      throw new Error('RPC URL is required');
    }
    _provider = new JsonRpcProvider(rpcUrl);
  }
  return _provider;
}

/**
 * Export a lazily-initialized provider for backward compatibility.
 * 
 * Note: This creates the provider instance on first import. For scenarios
 * where the RPC URL might not be configured at import time, use getProvider()
 * instead for deferred initialization.
 * 
 * The previous Proxy-based approach was incompatible with ethers v6 because
 * methods like provider.on() verify that 'this' is an instance of AbstractProvider,
 * which fails when called through a Proxy.
 */
function initializeProvider(): JsonRpcProvider {
  const rpcUrl = process.env.ETHEREUM_RPC_URL || process.env.BASE_RPC_URL;
  if (!rpcUrl) {
    // Return a provider with a placeholder URL that will fail on actual use
    // This allows the module to load even when env vars aren't set (e.g., during testing)
    console.warn(
      'Warning: RPC URL not configured. Please set ETHEREUM_RPC_URL or BASE_RPC_URL in your .env file. ' +
      `Provider will use fallback URL (${DEFAULT_LOCAL_RPC_URL}) which will fail on actual blockchain calls.`
    );
    return new JsonRpcProvider(DEFAULT_LOCAL_RPC_URL);
  }
  return new JsonRpcProvider(rpcUrl);
}

// Export the actual provider instance (not a Proxy) for backward compatibility
export const provider: JsonRpcProvider = initializeProvider();
