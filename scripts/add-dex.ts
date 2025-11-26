#!/usr/bin/env ts-node

/**
 * Add DEX Script
 * 
 * Utility to dynamically add a new DEX to the registry configuration.
 * This script is a convenience wrapper - actual DEX configurations should be
 * added to src/dex/core/DEXRegistry.ts for production use.
 * 
 * Usage:
 *   npm run add:dex -- --chain 8453 --name Aerodrome --factory 0x420DD381b31aEf6683db6B902084cB0FFECe40Da --type aerodrome
 * 
 * Options:
 *   --chain <chainId>      - Chain ID (e.g., 8453 for Base)
 *   --name <name>          - DEX name (e.g., Aerodrome)
 *   --factory <address>    - Factory contract address
 *   --router <address>     - Router contract address (optional, defaults to factory)
 *   --type <protocol>      - Protocol type (uniswapv3, uniswapv2, aerodrome, etc.)
 *   --priority <number>    - Priority (optional, defaults to 5)
 *   --list                 - List all configured DEXes for a chain
 */

import { DEXRegistry } from '../src/dex/core/DEXRegistry';
import { getNetworkName } from '../src/utils/chainTokens';
import { logger } from '../src/utils/logger';

interface AddDexArgs {
  chain?: string;
  name?: string;
  factory?: string;
  router?: string;
  type?: string;
  priority?: string;
  list?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): AddDexArgs {
  const args: AddDexArgs = {};
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg === '--chain' && i + 1 < process.argv.length) {
      args.chain = process.argv[++i];
    } else if (arg === '--name' && i + 1 < process.argv.length) {
      args.name = process.argv[++i];
    } else if (arg === '--factory' && i + 1 < process.argv.length) {
      args.factory = process.argv[++i];
    } else if (arg === '--router' && i + 1 < process.argv.length) {
      args.router = process.argv[++i];
    } else if (arg === '--type' && i + 1 < process.argv.length) {
      args.type = process.argv[++i];
    } else if (arg === '--priority' && i + 1 < process.argv.length) {
      args.priority = process.argv[++i];
    } else if (arg === '--list') {
      args.list = true;
    }
  }
  
  return args;
}

/**
 * List all DEXes for a chain
 */
function listDexes(chainId: number): void {
  const registry = new DEXRegistry();
  const dexes = registry.getDEXesByNetwork(chainId.toString());
  const networkName = getNetworkName(chainId);
  
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  DEXes configured for ${networkName} (Chain ID: ${chainId})`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
  
  if (dexes.length === 0) {
    console.log(`  No DEXes configured for chain ${chainId}\n`);
    return;
  }
  
  dexes.forEach((dex, index) => {
    console.log(`${index + 1}. ${dex.name}`);
    console.log(`   Protocol: ${dex.protocol}`);
    console.log(`   Factory:  ${dex.factory}`);
    console.log(`   Router:   ${dex.router}`);
    console.log(`   Priority: ${dex.priority}`);
    console.log();
  });
  
  console.log(`Total: ${dexes.length} DEXes\n`);
}

/**
 * Check if a DEX already exists
 */
function checkDexExists(chainId: number, name: string, factory: string): boolean {
  const registry = new DEXRegistry();
  const dexes = registry.getDEXesByNetwork(chainId.toString());
  
  // Check if DEX with same name or factory already exists
  const existingDex = dexes.find(
    dex => dex.name.toLowerCase() === name.toLowerCase() || 
           dex.factory.toLowerCase() === factory.toLowerCase()
  );
  
  return !!existingDex;
}

/**
 * Display instructions for adding a DEX
 */
function displayAddInstructions(args: AddDexArgs): void {
  const chainId = parseInt(args.chain || '0');
  const name = args.name || 'Unknown';
  const factory = args.factory || '0x...';
  const router = args.router || factory;
  const type = args.type || 'UniswapV3';
  const priority = parseInt(args.priority || '5');
  
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  Adding DEX to Registry`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
  
  console.log(`✅ Configuration Summary:`);
  console.log(`   Chain:    ${getNetworkName(chainId)} (${chainId})`);
  console.log(`   Name:     ${name}`);
  console.log(`   Factory:  ${factory}`);
  console.log(`   Router:   ${router}`);
  console.log(`   Protocol: ${type}`);
  console.log(`   Priority: ${priority}\n`);
  
  // Check if DEX already exists
  if (checkDexExists(chainId, name, factory)) {
    console.log(`✅ DEX already configured!`);
    console.log(`   A DEX with name "${name}" or factory "${factory}" is already`);
    console.log(`   registered in the DEXRegistry.\n`);
    console.log(`   To verify, run:`);
    console.log(`   npm run add:dex -- --chain ${chainId} --list\n`);
    return;
  }
  
  console.log(`📝 To add this DEX permanently:`);
  console.log(`\n   1. Edit: src/dex/core/DEXRegistry.ts`);
  console.log(`   2. Add this configuration in the initializeDEXes() method:\n`);
  
  const protocolName = name.split(' ')[0];
  
  console.log(`   this.addDEX({`);
  console.log(`       name: '${name}',`);
  console.log(`       protocol: '${protocolName}',`);
  console.log(`       chainType: 'EVM',`);
  console.log(`       network: '${chainId}',`);
  console.log(`       router: '${router}',`);
  console.log(`       factory: '${factory}',`);
  console.log(`       initCodeHash: undefined, // Set if needed for V2-style DEXes`);
  console.log(`       priority: ${priority},`);
  console.log(`       liquidityThreshold: V3_LOW_LIQUIDITY_THRESHOLD, // Adjust as needed`);
  console.log(`       gasEstimate: 150000`);
  console.log(`   });\n`);
  
  console.log(`   3. Rebuild: npm run build`);
  console.log(`   4. Preload: npm run preload:pools -- --chain ${chainId}\n`);
}

/**
 * Validate Ethereum address
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Main function
 */
async function main() {
  const args = parseArgs();
  
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  🔧 THEWARDEN DEX MANAGEMENT TOOL`);
  console.log(`═══════════════════════════════════════════════════════════`);
  
  // List mode
  if (args.list) {
    if (!args.chain) {
      console.error('\n❌ Error: --chain parameter required for --list\n');
      console.log('Usage: npm run add:dex -- --chain 8453 --list\n');
      process.exit(1);
    }
    
    const chainId = parseInt(args.chain);
    if (isNaN(chainId)) {
      console.error(`\n❌ Error: Invalid chain ID: ${args.chain}\n`);
      process.exit(1);
    }
    
    listDexes(chainId);
    return;
  }
  
  // Validate required parameters for add mode
  if (!args.chain || !args.name || !args.factory) {
    console.error('\n❌ Error: Missing required parameters\n');
    console.log('Usage:');
    console.log('  npm run add:dex -- --chain <chainId> --name <name> --factory <address> [--router <address>] [--type <protocol>]\n');
    console.log('Example:');
    console.log('  npm run add:dex -- --chain 8453 --name Aerodrome --factory 0x420DD381b31aEf6683db6B902084cB0FFECe40Da --type aerodrome\n');
    console.log('List DEXes:');
    console.log('  npm run add:dex -- --chain 8453 --list\n');
    process.exit(1);
  }
  
  // Validate chain ID
  const chainId = parseInt(args.chain);
  if (isNaN(chainId)) {
    console.error(`\n❌ Error: Invalid chain ID: ${args.chain}\n`);
    process.exit(1);
  }
  
  // Validate factory address
  if (!isValidAddress(args.factory)) {
    console.error(`\n❌ Error: Invalid factory address: ${args.factory}\n`);
    process.exit(1);
  }
  
  // Validate router address if provided
  if (args.router && !isValidAddress(args.router)) {
    console.error(`\n❌ Error: Invalid router address: ${args.router}\n`);
    process.exit(1);
  }
  
  // Display instructions
  displayAddInstructions(args);
}

// Run script
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
