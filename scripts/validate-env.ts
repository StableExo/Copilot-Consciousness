#!/usr/bin/env ts-node
/**
 * Environment Configuration Validator
 * 
 * Validates all environment variables and tests connections
 * to ensure the arbitrage bot is properly configured before launch.
 * 
 * Usage:
 *   npm run validate-env
 *   or
 *   ts-node scripts/validate-env.ts
 */

import * as dotenv from 'dotenv';
import { ethers, JsonRpcProvider } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface ValidationResult {
  name: string;
  category: 'CRITICAL' | 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  value?: string;
}

interface NetworkConfig {
    name: string;
    chainId: number;
}

const networkDetails: Record<string, NetworkConfig> = {
  ETHEREUM_RPC_URL: { name: 'mainnet', chainId: 1 },
  POLYGON_RPC_URL: { name: 'matic', chainId: 137 },
  ARBITRUM_RPC_URL: { name: 'arbitrum', chainId: 42161 },
  BASE_RPC_URL: { name: 'base', chainId: 8453 },
  OPTIMISM_RPC_URL: { name: 'optimism', chainId: 10 },
};

const results: ValidationResult[] = [];
let criticalFailures = 0;
let warnings = 0;

// Helper functions
function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function addResult(
  name: string,
  category: ValidationResult['category'],
  status: ValidationResult['status'],
  message: string,
  value?: string
) {
  results.push({ name, category, status, message, value });
  
  if (status === 'fail' && (category === 'CRITICAL' || category === 'REQUIRED')) {
    criticalFailures++;
  }
  if (status === 'warn') {
    warnings++;
  }
}

// Validation functions
async function validateRpcUrl(name: string, category: ValidationResult['category']): Promise<void> {
  const url = process.env[name];
  
  if (!url) {
    addResult(name, category, category === 'CRITICAL' ? 'fail' : 'warn', 
      `Not set - ${category === 'CRITICAL' ? 'REQUIRED' : 'recommended'}`);
    return;
  }

  // Check URL format
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    addResult(name, category, 'fail', 'Invalid URL format - must start with http:// or https://');
    return;
  }

  // Test connection
  try {
    const network = networkDetails[name];
    const provider = new JsonRpcProvider(url, network);
    const blockNumber = await Promise.race([
      provider.getBlockNumber(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);
    
    addResult(name, category, 'pass', `Connected successfully (Block: ${blockNumber})`, url.substring(0, 50) + '...');
  } catch (error: any) {
    addResult(name, category, 'fail', `Connection failed: ${error.message}`);
  }
}

async function validateWsUrl(name: string, category: ValidationResult['category']): Promise<void> {
  const url = process.env[name];
  
  if (!url) {
    addResult(name, category, 'warn', 'Not set - WebSocket monitoring will be disabled');
    return;
  }

  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    addResult(name, category, 'fail', 'Invalid WebSocket URL - must start with ws:// or wss://');
    return;
  }

  addResult(name, category, 'pass', 'WebSocket URL format valid', url.substring(0, 50) + '...');
}

function validatePrivateKey(): void {
  const key = process.env.WALLET_PRIVATE_KEY;
  
  if (!key) {
    addResult('WALLET_PRIVATE_KEY', 'CRITICAL', 'fail', 'Not set - REQUIRED for execution');
    return;
  }

  // Check format
  if (!key.startsWith('0x')) {
    addResult('WALLET_PRIVATE_KEY', 'CRITICAL', 'fail', 'Invalid format - must start with 0x');
    return;
  }

  if (key.length !== 66) {
    addResult('WALLET_PRIVATE_KEY', 'CRITICAL', 'fail', `Invalid length - must be 66 characters (got ${key.length})`);
    return;
  }

  // Validate hex
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    addResult('WALLET_PRIVATE_KEY', 'CRITICAL', 'fail', 'Invalid format - must be valid hex');
    return;
  }

  // Derive address to validate key
  try {
    const wallet = new ethers.Wallet(key);
    addResult('WALLET_PRIVATE_KEY', 'CRITICAL', 'pass', `Valid key (Address: ${wallet.address})`, '0x****...' + key.slice(-4));
  } catch (error: any) {
    addResult('WALLET_PRIVATE_KEY', 'CRITICAL', 'fail', `Invalid key: ${error.message}`);
  }
}

function validateApiKey(name: string, category: ValidationResult['category']): void {
  const key = process.env[name];
  
  if (!key) {
    addResult(name, category, category === 'REQUIRED' ? 'fail' : 'warn', 'Not set');
    return;
  }

  if (key === 'your-api-key-here' || key === 'YOUR-API-KEY') {
    addResult(name, category, 'warn', 'Placeholder value detected - replace with real API key');
    return;
  }

  addResult(name, category, 'pass', 'API key set', key.substring(0, 10) + '...');
}

function validateString(name: string, category: ValidationResult['category'], description: string): void {
  const value = process.env[name];
  
  if (!value) {
    addResult(name, category, category === 'CRITICAL' ? 'fail' : 'warn', `Not set - ${description}`);
    return;
  }

  addResult(name, category, 'pass', description, value);
}

function validateNumber(name: string, category: ValidationResult['category'], min?: number, max?: number): void {
  const value = process.env[name];
  
  if (!value) {
    addResult(name, category, 'warn', 'Not set - using defaults');
    return;
  }

  const num = parseFloat(value);
  if (isNaN(num)) {
    addResult(name, category, 'fail', `Invalid number: ${value}`);
    return;
  }

  if (min !== undefined && num < min) {
    addResult(name, category, 'warn', `Value ${num} is below recommended minimum ${min}`);
    return;
  }

  if (max !== undefined && num > max) {
    addResult(name, category, 'warn', `Value ${num} exceeds recommended maximum ${max}`);
    return;
  }

  addResult(name, category, 'pass', `Valid: ${num}`);
}

function validateBoolean(name: string, category: ValidationResult['category']): void {
  const value = process.env[name];
  
  if (!value) {
    addResult(name, category, 'skip', 'Not set - using default');
    return;
  }

  if (value !== 'true' && value !== 'false') {
    addResult(name, category, 'warn', `Invalid boolean - should be 'true' or 'false', got: ${value}`);
    return;
  }

  addResult(name, category, 'pass', `Set to: ${value}`);
}

async function validateDatabaseConnection(): Promise<void> {
  const host = process.env.TIMESCALEDB_HOST || process.env.POSTGRES_HOST;
  
  if (!host) {
    addResult('DATABASE', 'OPTIONAL', 'skip', 'Not configured - distributed mode disabled');
    return;
  }

  // Note: Actual connection test would require pg library
  // For now, just validate the configuration exists
  const required = ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'];
  const missing = required.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    addResult('DATABASE', 'OPTIONAL', 'warn', `Incomplete config - missing: ${missing.join(', ')}`);
    return;
  }

  addResult('DATABASE', 'OPTIONAL', 'pass', 'Configuration complete (connection not tested)');
}

async function validateRedisConnection(): Promise<void> {
  const host = process.env.REDIS_HOST;
  
  if (!host) {
    addResult('REDIS', 'OPTIONAL', 'skip', 'Not configured - caching disabled');
    return;
  }

  addResult('REDIS', 'OPTIONAL', 'pass', `Configured at ${host}:${process.env.REDIS_PORT || 6379}`);
}

async function validateRabbitMQConnection(): Promise<void> {
  const url = process.env.RABBITMQ_URL;
  
  if (!url) {
    addResult('RABBITMQ', 'OPTIONAL', 'skip', 'Not configured - message queue disabled');
    return;
  }

  if (!url.startsWith('amqp://')) {
    addResult('RABBITMQ', 'OPTIONAL', 'fail', 'Invalid URL - must start with amqp://');
    return;
  }

  addResult('RABBITMQ', 'OPTIONAL', 'pass', 'URL format valid');
}

// Main validation function
async function validateEnvironment(): Promise<void> {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     COPILOT-CONSCIOUSNESS ENVIRONMENT VALIDATOR            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝\n', 'cyan');
  
  log('📋 Validating environment configuration...\n', 'blue');

  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    log('⚠️  WARNING: .env file not found!', 'yellow');
    log('   Create one by copying .env.example:\n', 'yellow');
    log('   cp .env.example .env\n', 'yellow');
  }

  // CRITICAL - Bot won't run without these
  log('🔴 CRITICAL Variables (Bot won\'t run without these):', 'red');
  log('─────────────────────────────────────────────────────────────\n');
  
  await validateRpcUrl('BASE_RPC_URL', 'CRITICAL');
  validatePrivateKey();
  validateString('NODE_ENV', 'CRITICAL', 'Runtime environment');
  
  // REQUIRED - Core functionality
  log('\n🟠 REQUIRED Variables (Core functionality):', 'yellow');
  log('─────────────────────────────────────────────────────────────\n');
  
  validateApiKey('ETHERSCAN_API_KEY', 'REQUIRED');
  
  // RECOMMENDED - Multi-chain support
  log('\n🟡 RECOMMENDED Variables (Multi-chain support):', 'yellow');
  log('─────────────────────────────────────────────────────────────\n');
  
  await validateRpcUrl('ETHEREUM_RPC_URL', 'RECOMMENDED');
  await validateRpcUrl('POLYGON_RPC_URL', 'RECOMMENDED');
  await validateRpcUrl('ARBITRUM_RPC_URL', 'RECOMMENDED');
  await validateRpcUrl('OPTIMISM_RPC_URL', 'RECOMMENDED');
  
  // WebSocket endpoints
  log('\n🌐 WebSocket Endpoints (Real-time monitoring):', 'cyan');
  log('─────────────────────────────────────────────────────────────\n');
  
  await validateWsUrl('INFURA_WS_URL', 'RECOMMENDED');
  await validateWsUrl('ALCHEMY_WS_URL', 'RECOMMENDED');
  
  // Performance tuning
  log('\n⚙️  Performance Configuration:', 'cyan');
  log('─────────────────────────────────────────────────────────────\n');
  
  validateNumber('SCAN_INTERVAL', 'OPTIONAL', 100, 10000);
  validateNumber('CONCURRENCY', 'OPTIONAL', 1, 100);
  validateNumber('MIN_PROFIT_THRESHOLD', 'OPTIONAL', 0.001, 100);
  validateNumber('MAX_SLIPPAGE', 'OPTIONAL', 0, 0.1);
  validateNumber('MAX_GAS_PRICE', 'OPTIONAL', 1, 1000);
  
  // Feature flags
  log('\n🎯 Feature Flags:', 'cyan');
  log('─────────────────────────────────────────────────────────────\n');
  
  validateBoolean('ENABLE_ML_PREDICTIONS', 'OPTIONAL');
  validateBoolean('ENABLE_CROSS_CHAIN', 'OPTIONAL');
  validateBoolean('ENABLE_LAYER2', 'OPTIONAL');
  
  // Infrastructure (distributed mode)
  log('\n🏗️  Infrastructure (Distributed Mode):', 'cyan');
  log('─────────────────────────────────────────────────────────────\n');
  
  await validateDatabaseConnection();
  await validateRedisConnection();
  await validateRabbitMQConnection();
  
  // AI Configuration
  log('\n🤖 AI Consciousness (Optional):', 'cyan');
  log('─────────────────────────────────────────────────────────────\n');
  
  validateApiKey('GEMINI_API_KEY', 'OPTIONAL');
  
  // Generate report
  generateReport();
}

function generateReport(): void {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                      VALIDATION REPORT                     ║', 'cyan');
  log('╚══════════════════════════════════════��═════════════════════╝\n', 'cyan');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  log(`✅ Passed:  ${passed}`, 'green');
  log(`❌ Failed:  ${failed}`, 'red');
  log(`⚠️  Warnings: ${warned}`, 'yellow');
  log(`⏭️  Skipped: ${skipped}\n`, 'blue');

  // Show failures
  const failures = results.filter(r => r.status === 'fail');
  if (failures.length > 0) {
    log('❌ FAILURES:', 'red');
    log('─────────────────────────────────────────────────────────────', 'red');
    failures.forEach(f => {
      log(`  ${f.name} (${f.category}): ${f.message}`, 'red');
    });
    log('');
  }

  // Show warnings
  const warns = results.filter(r => r.status === 'warn');
  if (warns.length > 0) {
    log('⚠️  WARNINGS:', 'yellow');
    log('─────────────────────────────────────────────────────────────', 'yellow');
    warns.forEach(w => {
      log(`  ${w.name} (${w.category}): ${w.message}`, 'yellow');
    });
    log('');
  }

  // Final verdict
  log('═════════════════════════════════════════════════════════════\n', 'cyan');
  
  if (criticalFailures > 0) {
    log('🛑 CRITICAL FAILURES DETECTED!', 'red');
    log('   Fix these issues before running the bot.\n', 'red');
    process.exit(1);
  } else if (warnings > 0) {
    log('⚠️  WARNINGS DETECTED', 'yellow');
    log('   Bot can run, but some features may be limited.\n', 'yellow');
    log('✅ Core configuration is valid!\n', 'green');
    process.exit(0);
  } else {
    log('✅ ALL CHECKS PASSED!', 'green');
    log('   Environment is fully configured and ready.\n', 'green');
    process.exit(0);
  }
}

// Run validation
validateEnvironment().catch(error => {
  log(`\n❌ Validation error: ${error.message}`, 'red');
  process.exit(1);
});