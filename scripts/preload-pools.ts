/**
 * Pool Preloader Script
 * 
 * Fetches and caches all pool data for configured chains before TheWarden starts.
 * This eliminates the need to scan pools on every restart, dramatically reducing startup time.
 */

import { ethers, JsonRpcProvider } from 'ethers';
import dotenv from 'dotenv';
import { DEXRegistry } from '../src/dex/core/DEXRegistry';
import { MultiHopDataFetcher } from '../src/arbitrage/MultiHopDataFetcher';
import { PoolDataStore } from '../src/arbitrage/PoolDataStore';
import { getScanTokens, getNetworkName } from '../src/utils/chainTokens';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

interface PreloadConfig {
  chainIds: number[];
  rpcUrls: Map<number, string>;
  cacheDuration?: number; // milliseconds
}

/**
 * Get RPC URL for a specific chain ID
 */
function getRpcUrlForChain(chainId: number): string | undefined {
  switch (chainId) {
    case 8453: // Base mainnet
    case 84532: // Base testnet
      return process.env.BASE_RPC_URL;
    case 1: // Ethereum mainnet
    case 5: // Goerli
    case 11155111: // Sepolia
      return process.env.ETHEREUM_RPC_URL || process.env.MAINNET_RPC_URL;
    case 137: // Polygon mainnet
    case 80001: // Mumbai testnet
      return process.env.POLYGON_RPC_URL;
    case 42161: // Arbitrum mainnet
    case 421613: // Arbitrum testnet
      return process.env.ARBITRUM_RPC_URL;
    case 10: // Optimism mainnet
    case 420: // Optimism testnet
      return process.env.OPTIMISM_RPC_URL;
    default:
      return process.env.RPC_URL;
  }
}

/**
 * Load configuration from environment
 */
function loadConfig(): PreloadConfig {
  const primaryChainId = parseInt(process.env.CHAIN_ID || '8453');
  
  // Parse SCAN_CHAINS or default to primary chain
  const chainIds = process.env.SCAN_CHAINS
    ? process.env.SCAN_CHAINS.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0)
    : [primaryChainId];

  // Build RPC URL map
  const rpcUrls = new Map<number, string>();
  for (const chainId of chainIds) {
    const rpcUrl = getRpcUrlForChain(chainId);
    if (rpcUrl) {
      rpcUrls.set(chainId, rpcUrl);
    } else {
      logger.warn(`No RPC URL configured for chain ${chainId}`, 'PRELOAD');
    }
  }

  // Cache duration: 1 hour by default, configurable via env
  const cacheDuration = process.env.POOL_CACHE_DURATION 
    ? parseInt(process.env.POOL_CACHE_DURATION) * 1000 
    : 3600000;

  return {
    chainIds,
    rpcUrls,
    cacheDuration,
  };
}

/**
 * Preload pools for a specific chain
 */
async function preloadChain(
  chainId: number,
  rpcUrl: string,
  registry: DEXRegistry,
  poolStore: PoolDataStore
): Promise<void> {
  const networkName = getNetworkName(chainId);
  
  logger.info('═══════════════════════════════════════════════════════════', 'PRELOAD');
  logger.info(`Preloading pools for ${networkName} (Chain ID: ${chainId})`, 'PRELOAD');
  logger.info('═══════════════════════════════════════════════════════════', 'PRELOAD');

  try {
    // Create provider for this chain
    const provider = new JsonRpcProvider(rpcUrl);
    
    // Verify connection
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== chainId) {
      throw new Error(`Chain ID mismatch: expected ${chainId}, got ${network.chainId}`);
    }
    logger.info(`✓ Connected to ${networkName}`, 'PRELOAD');

    // Get tokens to scan
    const tokens = getScanTokens(chainId);
    logger.info(`✓ Found ${tokens.length} tokens to scan`, 'PRELOAD');

    // Get DEXes for this chain
    const dexes = registry.getDEXesByNetwork(chainId.toString());
    logger.info(`✓ Found ${dexes.length} DEXes: ${dexes.map(d => d.name).join(', ')}`, 'PRELOAD');

    // Create data fetcher
    const dataFetcher = new MultiHopDataFetcher(registry, chainId);

    // Fetch all pool data
    logger.info('Fetching pool data... (this may take 1-2 minutes)', 'PRELOAD');
    const startTime = Date.now();
    const pools = await dataFetcher.buildGraphEdges(tokens);
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    logger.info(`✓ Found ${pools.length} valid pools in ${elapsedSeconds}s`, 'PRELOAD');

    // Save to cache
    await poolStore.saveToDisk(chainId, pools);
    logger.info(`✓ Saved pool data to cache`, 'PRELOAD');

    // Display summary
    const poolsByDex = new Map<string, number>();
    for (const pool of pools) {
      const count = poolsByDex.get(pool.dexName) || 0;
      poolsByDex.set(pool.dexName, count + 1);
    }

    logger.info('\nPool Summary:', 'PRELOAD');
    for (const [dexName, count] of Array.from(poolsByDex.entries()).sort((a, b) => b[1] - a[1])) {
      logger.info(`  ${dexName}: ${count} pools`, 'PRELOAD');
    }

    logger.info('\n✅ Pool preload complete for ' + networkName, 'PRELOAD');
  } catch (error) {
    logger.error(`❌ Failed to preload pools for chain ${chainId}: ${error instanceof Error ? error.message : String(error)}`, 'PRELOAD');
    throw error;
  }
}

/**
 * Main preload function
 */
async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  🚀 THEWARDEN POOL PRELOADER');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Load configuration
    const config = loadConfig();
    
    if (config.rpcUrls.size === 0) {
      throw new Error('No RPC URLs configured. Please check your .env file.');
    }

    logger.info(`Chains to preload: ${config.chainIds.map(id => getNetworkName(id)).join(', ')}`, 'PRELOAD');
    logger.info(`Cache duration: ${(config.cacheDuration || 3600000) / 60000} minutes\n`, 'PRELOAD');

    // Check if cache already exists and is valid
    const poolStore = new PoolDataStore({ cacheDuration: config.cacheDuration });
    const existingStats = await poolStore.getCacheStats();

    if (existingStats.length > 0) {
      logger.info('Existing cache found:', 'PRELOAD');
      for (const stat of existingStats) {
        const status = stat.isValid ? '✓ VALID' : '✗ STALE';
        logger.info(`  ${getNetworkName(stat.chainId)}: ${stat.poolCount} pools (${stat.ageMinutes}m old) ${status}`, 'PRELOAD');
      }
      
      // Check if all required chains have valid caches
      const allChainsValid = config.chainIds.every(chainId => {
        const stat = existingStats.find(s => s.chainId === chainId);
        return stat && stat.isValid;
      });

      if (allChainsValid && process.argv.includes('--skip-if-valid')) {
        logger.info('\n✅ All caches are valid. Skipping preload.\n', 'PRELOAD');
        // Exit successfully without prompting
        process.exit(0);
      }
      
      if (!process.argv.includes('--force') && !process.argv.includes('--skip-if-valid')) {
        // Only prompt if running in interactive terminal
        if (process.stdin.isTTY) {
          console.log('\nPress Enter to continue with reload, or Ctrl+C to cancel...');
          await new Promise<void>(resolve => {
            const handler = () => {
              process.stdin.removeListener('data', handler);
              resolve();
            };
            process.stdin.once('data', handler);
          });
        }
      }
      
      console.log(''); // Empty line for formatting
    }

    // Initialize DEX registry
    const registry = new DEXRegistry();

    // Preload each chain
    for (const chainId of config.chainIds) {
      const rpcUrl = config.rpcUrls.get(chainId);
      if (!rpcUrl) {
        logger.warn(`Skipping chain ${chainId} - no RPC URL configured`, 'PRELOAD');
        continue;
      }

      await preloadChain(chainId, rpcUrl, registry, poolStore);
      console.log(''); // Empty line between chains
    }

    // Display final summary
    const finalStats = await poolStore.getCacheStats();
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✅ PRELOAD COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nCached Pools:');
    for (const stat of finalStats) {
      console.log(`  ${getNetworkName(stat.chainId)}: ${stat.poolCount} pools`);
    }
    console.log('\n' + `Cache valid for: ${(config.cacheDuration || 3600000) / 60000} minutes`);
    console.log('Location: .pool-cache/\n');
    console.log('🚀 TheWarden is ready to start with preloaded pools!');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Preload failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run preloader
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { preloadChain, loadConfig };
