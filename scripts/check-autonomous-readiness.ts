#!/usr/bin/env node
/**
 * Check Autonomous Readiness CLI
 * 
 * Standalone script to check if TheWarden is ready for autonomous operation.
 * 
 * Usage:
 *   npm run check:readiness
 *   node --import tsx scripts/check-autonomous-readiness.ts
 *   node --import tsx scripts/check-autonomous-readiness.ts --wait
 */

import 'dotenv/config';
import { AutonomousReadinessChecker } from '../src/infrastructure/readiness/AutonomousReadinessChecker';
import { MemoryAdapter } from '../src/memory/MemoryAdapter';

const args = process.argv.slice(2);
const shouldWait = args.includes('--wait') || args.includes('-w');
const maxAttempts = parseInt(args.find(a => a.startsWith('--attempts='))?.split('=')[1] || '5');
const delayMs = parseInt(args.find(a => a.startsWith('--delay='))?.split('=')[1] || '2000');

async function main() {
  console.log('\n🔍 TheWarden Autonomous Readiness Check\n');

  // Create readiness checker
  const checker = new AutonomousReadinessChecker({
    requiredEnvVars: [
      'CHAIN_ID',
      'WALLET_PRIVATE_KEY',
    ],
    checkSupabase: true,
    checkNetwork: true,
    checkMemory: true,
    networkTimeout: 10000,
  });

  // Initialize memory adapter
  const memoryAdapter = new MemoryAdapter();
  checker.setMemoryAdapter(memoryAdapter);

  let result;

  if (shouldWait) {
    console.log(`⏳ Will retry up to ${maxAttempts} times with ${delayMs}ms delay\n`);
    result = await checker.waitForReady(maxAttempts, delayMs);
  } else {
    result = await checker.check();
  }

  // Print detailed report
  console.log('\n');
  console.log(AutonomousReadinessChecker.formatReport(result));

  // Exit with appropriate code
  if (result.ready) {
    console.log('\n✅ System is READY for autonomous operation!');
    console.log('   You can now start TheWarden with:');
    console.log('   npm run start:supabase');
    console.log('   or');
    console.log('   npm run start:autonomous\n');
    process.exit(0);
  } else {
    console.log('\n❌ System is NOT READY for autonomous operation.');
    console.log('   Please address the issues above before starting.\n');
    process.exit(1);
  }
}

// Handle errors
main().catch((error) => {
  console.error('\n❌ Fatal error during readiness check:');
  console.error(error);
  process.exit(1);
});
