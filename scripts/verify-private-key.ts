#!/usr/bin/env node

/**
 * Private Key Verification Tool
 *
 * Verifies your private key format is correct without exposing the full key
 */

import { Wallet } from 'ethers';
import dotenv from 'dotenv';

// Load environment
dotenv.config();

console.log('═══════════════════════════════════════════════════════════');
console.log('  PRIVATE KEY VERIFICATION TOOL');
console.log('═══════════════════════════════════════════════════════════\n');

const privateKey = process.env.WALLET_PRIVATE_KEY;

if (!privateKey) {
  console.log('❌ No WALLET_PRIVATE_KEY found in .env file\n');
  console.log('   Please add your private key to .env:\n');
  console.log('   WALLET_PRIVATE_KEY=0x...\n');
  process.exit(1);
}

console.log('🔍 Checking your private key...\n');

// Check basic format
const hasPrefix = privateKey.startsWith('0x');
const keyWithoutPrefix = hasPrefix ? privateKey.slice(2) : privateKey;
const length = keyWithoutPrefix.length;
const isHex = /^[0-9a-fA-F]+$/.test(keyWithoutPrefix);
const isPlaceholder =
  privateKey.includes('YOUR') || privateKey.includes('PRIVATE_KEY_HERE');

console.log('Format Checks:');
console.log(
  `  Has 0x prefix: ${hasPrefix ? '✅ Yes' : '⚠️  No (works but recommended)'}`
);
console.log(
  `  Length: ${length === 64 ? '✅' : '❌'} ${length} characters ${length === 64 ? '(correct)' : '(must be 64)'}`
);
console.log(
  `  Valid hex: ${isHex ? '✅' : '❌'} ${isHex ? '(correct)' : '(contains invalid characters)'}`
);
console.log(
  `  Is placeholder: ${isPlaceholder ? '❌ Still has placeholder text!' : '✅ Real key'}`
);
console.log();

// If it looks like a placeholder, stop here
if (isPlaceholder) {
  console.log('❌ PLACEHOLDER DETECTED\n');
  console.log('   Your .env still contains placeholder text.');
  console.log('   Please replace with your actual private key.\n');
  process.exit(1);
}

// Try to create a wallet
try {
  const wallet = new Wallet(privateKey);

  console.log('✅ PRIVATE KEY IS VALID!\n');
  console.log('Wallet Information:');
  console.log(`  Address: ${wallet.address}`);
  console.log(`  Private Key (first 6): ${privateKey.substring(0, 8)}...`);
  console.log(
    `  Private Key (last 4): ...${privateKey.substring(privateKey.length - 4)}`
  );
  console.log();

  console.log('🔒 Security Reminder:');
  console.log('   ✓ Never share your private key');
  console.log('   ✓ Never commit .env to git');
  console.log('   ✓ Keep backups in a secure location');
  console.log();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ✅ Ready to run on mainnet!');
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(0);
} catch (error) {
  console.log('❌ INVALID PRIVATE KEY\n');
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.log(`   Error: ${errorMessage}\n`);

  // Provide helpful hints based on the error
  if (errorMessage.includes('odd-length')) {
    console.log('   💡 Hint: Your private key has an odd number of characters.');
    console.log(
      '      It must be exactly 64 hex characters (without 0x prefix).'
    );
    console.log('      Current length: ' + keyWithoutPrefix.length);
  } else if (errorMessage.includes('invalid hexlify')) {
    console.log('   💡 Hint: Your private key contains invalid characters.');
    console.log('      Only use: 0-9 and a-f (or A-F)');
  }

  console.log();
  process.exit(1);
}
