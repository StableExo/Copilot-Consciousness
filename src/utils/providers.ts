import { ethers, JsonRpcProvider } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

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

// Export a getter for backward compatibility
export const provider = new Proxy({} as JsonRpcProvider, {
  get(target, prop) {
    return getProvider()[prop as keyof JsonRpcProvider];
  }
});
