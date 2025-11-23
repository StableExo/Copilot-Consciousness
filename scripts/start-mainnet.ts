#!/usr/bin/env ts-node
/**
 * TheWarden Mainnet Launch Script
 * 
 * This script validates configuration and starts TheWarden in mainnet/production mode.
 * It performs critical safety checks before allowing live trading with real capital.
 * 
 * ⚠️  WARNING: This will execute REAL transactions with REAL money on mainnet!
 * 
 * Prerequisites:
 * - Valid .env file with production settings
 * - NODE_ENV=production
 * - DRY_RUN=false
 * - Sufficient wallet balance for gas and trades
 * - FlashSwapV2 contract deployed (if using flash loans)
 * 
 * Safety Features:
 * - Pre-flight configuration validation
 * - Balance checks
 * - Explicit user confirmation required
 * - Production readiness checklist
 */

import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { ethers } from 'ethers';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config();

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment configuration for mainnet
 */
function validateMainnetConfig(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Critical checks - must pass
  const criticalChecks = [
    { name: 'NODE_ENV', value: process.env.NODE_ENV, expected: 'production' },
    { name: 'DRY_RUN', value: process.env.DRY_RUN, expected: 'false' },
    { name: 'WALLET_PRIVATE_KEY', value: process.env.WALLET_PRIVATE_KEY, required: true },
  ];

  for (const check of criticalChecks) {
    if (check.required && !check.value) {
      result.errors.push(`❌ ${check.name} is not set`);
      result.valid = false;
    } else if (check.expected && check.value !== check.expected) {
      result.errors.push(`❌ ${check.name}=${check.value} (expected: ${check.expected})`);
      result.valid = false;
    }
  }

  // RPC URL check (at least one must be set)
  const rpcUrls = [
    process.env.BASE_RPC_URL,
    process.env.ETHEREUM_RPC_URL,
    process.env.RPC_URL,
  ];

  if (!rpcUrls.some(url => url && url.length > 0)) {
    result.errors.push('❌ No RPC URL configured. Set BASE_RPC_URL, ETHEREUM_RPC_URL, or RPC_URL');
    result.valid = false;
  }

  // Check for placeholder values
  const placeholderPatterns = [
    'YOUR-API-KEY',
    'your-password',
    'your_private_key',
    'your-secure-password',
    'YOUR_PRIVATE_KEY',
    'YOUR_ACTUAL_PRIVATE_KEY',
  ];

  const envVarsToCheck = [
    { name: 'BASE_RPC_URL', value: process.env.BASE_RPC_URL },
    { name: 'WALLET_PRIVATE_KEY', value: process.env.WALLET_PRIVATE_KEY },
    { name: 'JWT_SECRET', value: process.env.JWT_SECRET },
  ];

  for (const envVar of envVarsToCheck) {
    if (envVar.value) {
      for (const pattern of placeholderPatterns) {
        if (envVar.value.includes(pattern)) {
          result.errors.push(`❌ ${envVar.name} contains placeholder value: ${pattern}`);
          result.valid = false;
        }
      }
    }
  }

  // Security warnings
  if (process.env.CORS_ORIGIN === '*') {
    result.warnings.push('⚠️  CORS_ORIGIN is set to "*" (allows all origins)');
  }

  if (process.env.LOG_LEVEL === 'debug') {
    result.warnings.push('⚠️  LOG_LEVEL is set to "debug" (verbose logging may impact performance)');
  }

  // Recommended settings
  const recommendedChecks = [
    { name: 'ENABLE_PRIVATE_RPC', value: process.env.ENABLE_PRIVATE_RPC, recommended: 'true', reason: 'to protect from MEV' },
    { name: 'MIN_PROFIT_THRESHOLD', value: process.env.MIN_PROFIT_THRESHOLD, reason: 'to ensure profitable trades' },
  ];

  for (const check of recommendedChecks) {
    if (!check.value) {
      result.warnings.push(`⚠️  ${check.name} not set (recommended ${check.reason})`);
    } else if (check.recommended && check.value !== check.recommended) {
      result.warnings.push(`⚠️  ${check.name}=${check.value} (recommended: ${check.recommended} ${check.reason})`);
    }
  }

  return result;
}

/**
 * Check wallet balance
 */
async function checkWalletBalance(): Promise<void> {
  const chainId = parseInt(process.env.CHAIN_ID || '8453');
  let rpcUrl: string | undefined;

  if (chainId === 8453) {
    rpcUrl = process.env.BASE_RPC_URL;
  } else if (chainId === 1) {
    rpcUrl = process.env.ETHEREUM_RPC_URL;
  } else {
    rpcUrl = process.env.RPC_URL;
  }

  if (!rpcUrl || !process.env.WALLET_PRIVATE_KEY) {
    console.log('⚠️  Cannot check wallet balance: missing RPC URL or private key');
    return;
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);
    const balance = await wallet.getBalance();
    const balanceEth = ethers.utils.formatEther(balance);

    console.log(`\n💰 Wallet Balance Check:`);
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Balance: ${balanceEth} ETH`);

    // Warn if balance is low
    if (balance.lt(ethers.utils.parseEther('0.01'))) {
      console.log(`   ⚠️  WARNING: Balance is very low (< 0.01 ETH)`);
      console.log(`   ⚠️  You may not have enough for gas fees`);
    } else if (balance.lt(ethers.utils.parseEther('0.1'))) {
      console.log(`   ⚠️  Balance is relatively low (< 0.1 ETH)`);
    } else {
      console.log(`   ✅ Balance looks good`);
    }

    // Check network
    const network = await provider.getNetwork();
    console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
  } catch (error) {
    console.log(`⚠️  Error checking wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Display production readiness checklist
 */
function displayReadinessChecklist(): void {
  console.log('\n' + '═'.repeat(70));
  console.log('📋 PRODUCTION READINESS CHECKLIST');
  console.log('═'.repeat(70));
  console.log('\nBefore running on mainnet, ensure you have:');
  console.log('');
  console.log('  Configuration:');
  console.log('  □ Reviewed and updated all .env settings');
  console.log('  □ Set NODE_ENV=production');
  console.log('  □ Set DRY_RUN=false');
  console.log('  □ Configured valid RPC endpoints');
  console.log('  □ Set appropriate profit thresholds');
  console.log('');
  console.log('  Security:');
  console.log('  □ Generated strong JWT_SECRET');
  console.log('  □ Generated SECRETS_ENCRYPTION_KEY');
  console.log('  □ Changed all default passwords');
  console.log('  □ Set CORS_ORIGIN to specific domain (not *)');
  console.log('  □ Enabled ENABLE_PRIVATE_RPC for MEV protection');
  console.log('');
  console.log('  Capital & Risk:');
  console.log('  □ Wallet has sufficient balance for gas');
  console.log('  □ Set appropriate MIN_PROFIT_THRESHOLD');
  console.log('  □ Configured MAX_GAS_PRICE');
  console.log('  □ Reviewed capital management policy');
  console.log('  □ Understand 70% profit allocation to debt reduction');
  console.log('');
  console.log('  Testing:');
  console.log('  □ Tested in DRY_RUN=true mode first');
  console.log('  □ Verified pool detection works');
  console.log('  □ Confirmed consciousness modules are functional');
  console.log('  □ Reviewed logs for any warnings or errors');
  console.log('');
  console.log('  Monitoring:');
  console.log('  □ Know how to check logs: tail -f logs/arbitrage.log');
  console.log('  □ Dashboard accessible if enabled');
  console.log('  □ Alert system configured (optional)');
  console.log('  □ Emergency shutdown procedure understood');
  console.log('');
  console.log('  Documentation:');
  console.log('  □ Read docs/QUICK_START_PRODUCTION.md');
  console.log('  □ Read docs/CAPITAL_MANAGEMENT_POLICY.md');
  console.log('  □ Read docs/PRODUCTION_RUNBOOKS.md');
  console.log('');
  console.log('═'.repeat(70));
}

/**
 * Get user confirmation
 */
function getUserConfirmation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\n⚠️  Type "I UNDERSTAND THE RISKS" to proceed with mainnet launch: ', (answer) => {
      rl.close();
      resolve(answer.trim() === 'I UNDERSTAND THE RISKS');
    });
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 THEWARDEN MAINNET LAUNCH SEQUENCE');
  console.log('═'.repeat(70));
  console.log('\n⚠️  WARNING: You are about to run TheWarden with REAL money on MAINNET!');
  console.log('⚠️  This will execute REAL blockchain transactions.');
  console.log('⚠️  You can LOSE money if the bot makes unprofitable trades.');
  console.log('\n' + '═'.repeat(70));

  // Step 1: Validate configuration
  console.log('\n📋 Step 1: Validating configuration...\n');
  const validation = validateMainnetConfig();

  if (validation.errors.length > 0) {
    console.log('❌ Configuration errors found:\n');
    validation.errors.forEach(error => console.log(`   ${error}`));
    console.log('\n❌ LAUNCH ABORTED: Fix configuration errors and try again.');
    console.log('\nFor help, see:');
    console.log('   - docs/QUICK_START_PRODUCTION.md');
    console.log('   - docs/ENV_PRODUCTION_READINESS_REVIEW.md');
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    console.log('⚠️  Configuration warnings:\n');
    validation.warnings.forEach(warning => console.log(`   ${warning}`));
    console.log('');
  }

  console.log('✅ Configuration validation passed');

  // Step 2: Check wallet balance
  console.log('\n💰 Step 2: Checking wallet balance...');
  await checkWalletBalance();

  // Step 3: Display checklist
  displayReadinessChecklist();

  // Step 4: Get user confirmation
  console.log('\n⚠️  FINAL CONFIRMATION REQUIRED');
  console.log('\nThis is your last chance to abort before going live.');
  console.log('TheWarden will start executing REAL transactions on mainnet.');

  const confirmed = await getUserConfirmation();

  if (!confirmed) {
    console.log('\n❌ Launch cancelled by user.');
    console.log('\nTo test safely first, run: npm run dev (with DRY_RUN=true)');
    process.exit(0);
  }

  // Step 5: Launch
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 LAUNCHING THEWARDEN ON MAINNET');
  console.log('═'.repeat(70));
  console.log('\n✅ All checks passed');
  console.log('✅ User confirmation received');
  console.log('\n🎯 Starting TheWarden in LIVE mode...');
  console.log('\nPress Ctrl+C to stop TheWarden at any time.');
  console.log('Logs will be written to: logs/arbitrage.log');
  console.log('\nMonitor with: tail -f logs/arbitrage.log');
  console.log('\n' + '═'.repeat(70) + '\n');

  // Import and start the main application
  // We use a dynamic import to ensure environment is loaded first
  const { main: startMain } = await import('../src/main');
  await startMain();
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fatal error during mainnet launch:');
    console.error(error);
    process.exit(1);
  });
}
