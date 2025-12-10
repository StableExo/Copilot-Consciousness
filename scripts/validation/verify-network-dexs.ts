#!/usr/bin/env node
/**
 * Verification script for network and DEX integrations
 * Verifies that all expected networks have the expected number of DEXes
 */

import { DEXRegistry } from '../src/dex/core/DEXRegistry.js';
import type { DEXConfig } from '../src/dex/types.js';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface NetworkConfig {
  name: string;
  minDexes: number;
}

function main(): void {
  log('\n═══════════════════════════════════════════════════════', 'blue');
  log('  NETWORK & DEX INTEGRATION VERIFICATION', 'bold');
  log('═══════════════════════════════════════════════════════\n', 'blue');

  const registry = new DEXRegistry();
  const allDexes = registry.getAllDEXes();

  log(`Total DEXes Registered: ${allDexes.length}\n`, 'bold');

  // Expected network configurations
  const expectedNetworks: Record<string, NetworkConfig> = {
    '1': { name: 'Ethereum', minDexes: 10 },
    '8453': { name: 'Base', minDexes: 10 },
    '42161': { name: 'Arbitrum', minDexes: 10 },
    '10': { name: 'Optimism', minDexes: 10 },
    '56': { name: 'BSC', minDexes: 10 },
    '81457': { name: 'Blast', minDexes: 10 },
    '137': { name: 'Polygon', minDexes: 10 },
    'mainnet-beta': { name: 'Solana', minDexes: 10 },
  };

  let allPassed = true;

  // Count DEXes per network
  const dexesByNetwork: Record<string, DEXConfig[]> = {};
  for (const dex of allDexes) {
    if (!dexesByNetwork[dex.network]) {
      dexesByNetwork[dex.network] = [];
    }
    dexesByNetwork[dex.network].push(dex);
  }

  // Check each expected network
  log('Network Coverage:\n', 'bold');
  for (const [networkId, config] of Object.entries(expectedNetworks)) {
    const dexes = dexesByNetwork[networkId] || [];
    const count = dexes.length;
    const status = count >= config.minDexes ? '✓' : '✗';
    const color: keyof typeof colors = count >= config.minDexes ? 'green' : 'red';

    log(`${status} ${config.name} (${networkId}): ${count} DEXes`, color);

    if (count < config.minDexes) {
      log(`   Expected at least ${config.minDexes}, got ${count}`, 'yellow');
      allPassed = false;
    }

    // List DEXes for this network
    if (dexes.length > 0) {
      dexes.forEach((dex, idx) => {
        log(`   ${idx + 1}. ${dex.name}`, 'reset');
      });
    }
    log(''); // Empty line
  }

  // Summary
  log('═══════════════════════════════════════════════════════', 'blue');
  if (allPassed) {
    log('✅ ALL NETWORKS VERIFIED', 'green');
    log(`   ✓ ${Object.keys(expectedNetworks).length} networks configured`, 'green');
    log(`   ✓ ${allDexes.length} total DEXes registered`, 'green');
    log(`   ✓ All networks meet minimum DEX requirements`, 'green');
  } else {
    log('⚠️  VERIFICATION FAILED', 'red');
    log('   Some networks do not meet minimum DEX requirements', 'yellow');
  }
  log('═══════════════════════════════════════════════════════\n', 'blue');

  // Additional networks found
  const additionalNetworks = Object.keys(dexesByNetwork).filter(
    (id) => !expectedNetworks[id]
  );

  if (additionalNetworks.length > 0) {
    log('Additional Networks Found:', 'yellow');
    for (const networkId of additionalNetworks) {
      const dexes = dexesByNetwork[networkId];
      log(`  • Network ${networkId}: ${dexes.length} DEXes`, 'yellow');
    }
    log('');
  }

  process.exit(allPassed ? 0 : 1);
}

main();
