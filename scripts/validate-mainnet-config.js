#!/usr/bin/env node

/**
 * Mainnet Configuration Validator
 * 
 * Validates that all required configuration is present for mainnet deployment
 */

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment
dotenv.config();

console.log('═══════════════════════════════════════════════════════════');
console.log('  THEWARDEN MAINNET CONFIGURATION VALIDATOR');
console.log('═══════════════════════════════════════════════════════════\n');

let hasErrors = false;
let hasWarnings = false;

// Check critical configuration
const checks = {
  'NODE_ENV': {
    value: process.env.NODE_ENV,
    required: true,
    expected: 'production',
    message: 'Must be "production" for mainnet'
  },
  'DRY_RUN': {
    value: process.env.DRY_RUN,
    required: true,
    expected: 'false',
    message: 'Must be "false" to enable live trading'
  },
  'CHAIN_ID': {
    value: process.env.CHAIN_ID,
    required: true,
    expected: ['8453', '1', '137', '42161', '10'],
    message: 'Valid mainnet chain ID (8453=Base, 1=Ethereum, etc.)'
  },
  'RPC_URL or BASE_RPC_URL': {
    value: process.env.RPC_URL || process.env.BASE_RPC_URL,
    required: true,
    validateFunc: (val) => val && !val.includes('YOUR-API-KEY') && val.startsWith('http'),
    message: 'Valid RPC URL (must not contain placeholder)'
  },
  'WALLET_PRIVATE_KEY': {
    value: process.env.WALLET_PRIVATE_KEY,
    required: true,
    validateFunc: (val) => val && val.startsWith('0x') && val.length === 66 && !val.includes('YOUR'),
    message: 'Valid private key (0x + 64 hex chars, no placeholder)'
  }
};

console.log('🔍 Checking Configuration...\n');

for (const [name, check] of Object.entries(checks)) {
  const isSet = check.value !== undefined && check.value !== '';
  const symbol = isSet ? '✓' : '✗';
  const status = isSet ? 'SET' : 'MISSING';
  
  if (!isSet && check.required) {
    console.log(`${symbol} ${name}: ${status} ❌`);
    console.log(`   Required: ${check.message}\n`);
    hasErrors = true;
    continue;
  }
  
  if (!isSet) {
    console.log(`${symbol} ${name}: ${status} (optional)\n`);
    continue;
  }
  
  // Validate value if check exists
  let isValid = true;
  if (check.expected) {
    if (Array.isArray(check.expected)) {
      isValid = check.expected.includes(check.value);
    } else {
      isValid = check.value === check.expected;
    }
  }
  
  if (check.validateFunc) {
    isValid = check.validateFunc(check.value);
  }
  
  if (!isValid) {
    console.log(`${symbol} ${name}: ${check.value} ⚠️`);
    console.log(`   Warning: ${check.message}\n`);
    hasWarnings = true;
  } else {
    const displayValue = name.includes('PRIVATE_KEY') 
      ? check.value.substring(0, 6) + '...' + check.value.substring(check.value.length - 4)
      : (name.includes('RPC') ? check.value.substring(0, 40) + '...' : check.value);
    console.log(`${symbol} ${name}: ${displayValue} ✅\n`);
  }
}

// Additional checks
console.log('🔧 Additional Configuration...\n');

const additionalChecks = [
  { name: 'MIN_PROFIT_PERCENT', value: process.env.MIN_PROFIT_PERCENT || '0.5' },
  { name: 'MAX_GAS_PRICE', value: process.env.MAX_GAS_PRICE || '100' },
  { name: 'SCAN_INTERVAL', value: process.env.SCAN_INTERVAL || '1000' },
  { name: 'PHASE3_AI_ENABLED', value: process.env.PHASE3_AI_ENABLED || 'true' },
];

for (const check of additionalChecks) {
  console.log(`  ${check.name}: ${check.value}`);
}

console.log('\n═══════════════════════════════════════════════════════════');

if (hasErrors) {
  console.log('❌ CONFIGURATION ERRORS FOUND');
  console.log('   Please fix the errors above before running on mainnet.');
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(1);
}

if (hasWarnings) {
  console.log('⚠️  CONFIGURATION WARNINGS');
  console.log('   Review warnings above. Configuration may work but verify carefully.');
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(0);
}

console.log('✅ CONFIGURATION VALID FOR MAINNET');
console.log('   All required settings are properly configured.');
console.log('   Ready to run: npm start');
console.log('═══════════════════════════════════════════════════════════\n');

// Show the command to run
console.log('🔥 To start TheWarden on mainnet:\n');
console.log('   npm start\n');
console.log('   Or: node dist/src/main.js\n');

process.exit(0);
