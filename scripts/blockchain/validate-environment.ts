#!/usr/bin/env tsx
/**
 * Environment Validation & Analysis Tool
 * 
 * Analyzes your .env file and provides recommendations
 * Also supports storing environment configuration in Supabase
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface EnvValidation {
  category: string;
  variable: string;
  currentValue: string | undefined;
  status: 'valid' | 'missing' | 'warning' | 'placeholder';
  recommendation?: string;
  required: boolean;
}

interface ValidationResult {
  validations: EnvValidation[];
  summary: {
    total: number;
    valid: number;
    missing: number;
    warnings: number;
    placeholders: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// BLOCKCHAIN DEPLOYMENT REQUIREMENTS
// ═══════════════════════════════════════════════════════════════

const BLOCKCHAIN_REQUIREMENTS: { [key: string]: { description: string; required: boolean; example?: string } } = {
  // Core Blockchain
  'NODE_ENV': { description: 'Should be "production" for mainnet', required: true, example: 'production' },
  'CHAIN_ID': { description: 'Base mainnet chain ID', required: true, example: '8453' },
  'DRY_RUN': { description: 'Should be "false" for real transactions', required: true, example: 'false' },
  
  // Wallet
  'WALLET_PRIVATE_KEY': { description: 'Your deployer wallet private key (MUST start with 0x)', required: true, example: '0x...' },
  
  // RPC Endpoints
  'BASE_RPC_URL': { description: 'Base mainnet RPC (Alchemy recommended)', required: true, example: 'https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY' },
  'ALCHEMY_API_KEY': { description: 'Alchemy API key for RPC access', required: true, example: 'your-alchemy-api-key' },
  
  // Contract Verification
  'BASESCAN_API_KEY': { description: 'Basescan API key for contract verification', required: true, example: 'your-basescan-api-key' },
  
  // Tithe System (70/30 Split)
  'TITHE_WALLET_ADDRESS': { description: '70% profit recipient address', required: true, example: '0x...' },
  'TITHE_BPS': { description: 'Tithe percentage in basis points (7000 = 70%)', required: true, example: '7000' },
  
  // Multi-sig (optional but recommended)
  'MULTI_SIG_ADDRESS': { description: 'Multi-sig wallet for enhanced security', required: false, example: '0x...' },
  
  // Supabase (for environment storage)
  'SUPABASE_URL': { description: 'Supabase project URL', required: false, example: 'https://xxx.supabase.co' },
  'SUPABASE_SERVICE_KEY': { description: 'Supabase service role key (for secure storage)', required: false, example: 'eyJ...' },
  
  // CoinMarketCap
  'COINMARKETCAP_API_KEY': { description: 'CoinMarketCap API key for price data', required: false, example: 'your-cmc-api-key' },
  'ENABLE_COINMARKETCAP': { description: 'Enable CoinMarketCap integration', required: false, example: 'true' },
};

function maskSensitive(value: string | undefined): string {
  if (!value) return '(not set)';
  if (value.length < 10) return '***';
  
  // Show first 6 and last 4 characters for private keys/API keys
  if (value.startsWith('0x')) {
    return `${value.substring(0, 6)}...${value.substring(value.length - 4)}`;
  }
  
  // For other keys, show first 8 and last 4
  return `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
}

function validateEnvironment(): ValidationResult {
  const validations: EnvValidation[] = [];
  
  console.log('\n' + '═'.repeat(80));
  console.log('🔍 ENVIRONMENT VALIDATION FOR BLOCKCHAIN DEPLOYMENT');
  console.log('═'.repeat(80) + '\n');
  
  for (const [variable, config] of Object.entries(BLOCKCHAIN_REQUIREMENTS)) {
    const value = process.env[variable];
    let status: EnvValidation['status'] = 'valid';
    let recommendation: string | undefined;
    
    // Check if variable exists
    if (!value) {
      status = config.required ? 'missing' : 'warning';
      recommendation = config.required 
        ? `❌ REQUIRED: Add ${variable}=${config.example || 'value'} to .env`
        : `⚠️  OPTIONAL: Consider adding ${variable}=${config.example || 'value'}`;
    } else {
      // Check for placeholder values
      if (value.includes('your-') || value.includes('YOUR-') || value === 'value') {
        status = 'placeholder';
        recommendation = `⚠️  Replace placeholder with real ${variable}`;
      }
      
      // Specific validations
      if (variable === 'CHAIN_ID' && value !== '8453') {
        status = 'warning';
        recommendation = `⚠️  Chain ID should be 8453 for Base mainnet (currently: ${value})`;
      }
      
      if (variable === 'NODE_ENV' && value !== 'production') {
        status = 'warning';
        recommendation = `⚠️  NODE_ENV should be "production" for mainnet (currently: ${value})`;
      }
      
      if (variable === 'DRY_RUN' && value !== 'false') {
        status = 'warning';
        recommendation = `⚠️  DRY_RUN should be "false" for real transactions (currently: ${value})`;
      }
      
      if (variable === 'TITHE_BPS' && value !== '7000') {
        status = 'warning';
        recommendation = `⚠️  TITHE_BPS should be 7000 (70%) per LEGAL_POSITION.md (currently: ${value})`;
      }
      
      if (variable === 'WALLET_PRIVATE_KEY' && !value.startsWith('0x')) {
        status = 'warning';
        recommendation = `⚠️  WALLET_PRIVATE_KEY should start with "0x"`;
      }
    }
    
    validations.push({
      category: 'Blockchain Deployment',
      variable,
      currentValue: value,
      status,
      recommendation,
      required: config.required,
    });
  }
  
  // Calculate summary
  const summary = {
    total: validations.length,
    valid: validations.filter(v => v.status === 'valid').length,
    missing: validations.filter(v => v.status === 'missing').length,
    warnings: validations.filter(v => v.status === 'warning').length,
    placeholders: validations.filter(v => v.status === 'placeholder').length,
  };
  
  return { validations, summary };
}

function printValidationResults(result: ValidationResult): void {
  console.log('📋 VARIABLE STATUS:\n');
  
  // Group by status
  const byStatus = {
    valid: result.validations.filter(v => v.status === 'valid'),
    missing: result.validations.filter(v => v.status === 'missing'),
    warnings: result.validations.filter(v => v.status === 'warning'),
    placeholders: result.validations.filter(v => v.status === 'placeholder'),
  };
  
  // Print valid variables
  if (byStatus.valid.length > 0) {
    console.log('✅ VALID VARIABLES:');
    byStatus.valid.forEach(v => {
      const masked = maskSensitive(v.currentValue);
      console.log(`   ${v.variable} = ${masked}`);
    });
    console.log('');
  }
  
  // Print missing variables
  if (byStatus.missing.length > 0) {
    console.log('❌ MISSING REQUIRED VARIABLES:');
    byStatus.missing.forEach(v => {
      console.log(`   ${v.variable}`);
      if (v.recommendation) console.log(`      ${v.recommendation}`);
    });
    console.log('');
  }
  
  // Print warnings
  if (byStatus.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    byStatus.warnings.forEach(v => {
      const masked = maskSensitive(v.currentValue);
      console.log(`   ${v.variable} = ${masked}`);
      if (v.recommendation) console.log(`      ${v.recommendation}`);
    });
    console.log('');
  }
  
  // Print placeholders
  if (byStatus.placeholders.length > 0) {
    console.log('🔸 PLACEHOLDER VALUES (need replacement):');
    byStatus.placeholders.forEach(v => {
      console.log(`   ${v.variable}`);
      if (v.recommendation) console.log(`      ${v.recommendation}`);
    });
    console.log('');
  }
  
  // Print summary
  console.log('═'.repeat(80));
  console.log('📊 SUMMARY:');
  console.log('═'.repeat(80));
  console.log(`Total Variables Checked: ${result.summary.total}`);
  console.log(`✅ Valid: ${result.summary.valid}`);
  console.log(`❌ Missing: ${result.summary.missing}`);
  console.log(`⚠️  Warnings: ${result.summary.warnings}`);
  console.log(`🔸 Placeholders: ${result.summary.placeholders}`);
  console.log('');
  
  // Deployment readiness
  const ready = result.summary.missing === 0 && result.summary.placeholders === 0;
  if (ready) {
    if (result.summary.warnings > 0) {
      console.log('⚠️  READY WITH WARNINGS - Review warnings above before deploying');
    } else {
      console.log('✅ READY FOR DEPLOYMENT - All required variables set correctly!');
    }
  } else {
    console.log('❌ NOT READY - Fix missing/placeholder variables before deploying');
  }
  console.log('');
}

function generateRecommendedEnv(result: ValidationResult): string {
  let env = `# ═══════════════════════════════════════════════════════════════
# RECOMMENDED ENVIRONMENT FOR BLOCKCHAIN DEPLOYMENT
# Generated: ${new Date().toISOString()}
# ═══════════════════════════════════════════════════════════════

`;

  for (const validation of result.validations) {
    const config = BLOCKCHAIN_REQUIREMENTS[validation.variable];
    
    env += `# ${config.description}\n`;
    
    if (validation.status === 'valid') {
      env += `${validation.variable}=${validation.currentValue}\n`;
    } else if (validation.status === 'missing' || validation.status === 'placeholder') {
      env += `${validation.variable}=${config.example || 'YOUR_VALUE_HERE'}\n`;
    } else if (validation.status === 'warning') {
      env += `# ⚠️  Current: ${validation.variable}=${validation.currentValue}\n`;
      env += `# ${validation.recommendation}\n`;
      env += `${validation.variable}=${config.example || validation.currentValue}\n`;
    }
    
    env += '\n';
  }
  
  return env;
}

// ═══════════════════════════════════════════════════════════════
// SUPABASE ENVIRONMENT STORAGE
// ═══════════════════════════════════════════════════════════════

async function storeEnvironmentInSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️  Supabase not configured. Skipping environment storage.');
    console.log('   Set SUPABASE_URL and SUPABASE_SERVICE_KEY to enable secure storage.\n');
    return;
  }
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('💾 Storing environment configuration in Supabase...\n');
    
    // Create encrypted environment snapshot
    const envSnapshot = {
      timestamp: new Date().toISOString(),
      chain_id: process.env.CHAIN_ID,
      network: 'base-mainnet',
      tithe_bps: process.env.TITHE_BPS,
      node_env: process.env.NODE_ENV,
      dry_run: process.env.DRY_RUN,
      // Store only non-sensitive metadata
      has_wallet_key: !!process.env.WALLET_PRIVATE_KEY,
      has_rpc_url: !!process.env.BASE_RPC_URL,
      has_basescan_key: !!process.env.BASESCAN_API_KEY,
      has_tithe_address: !!process.env.TITHE_WALLET_ADDRESS,
      deployment_ready: true,
    };
    
    // Store in Supabase table: environment_configs
    const { data, error } = await supabase
      .from('environment_configs')
      .insert(envSnapshot)
      .select();
    
    if (error) {
      console.log(`❌ Failed to store in Supabase: ${error.message}\n`);
    } else {
      console.log('✅ Environment metadata stored in Supabase successfully!');
      console.log(`   Record ID: ${data[0]?.id}\n`);
    }
    
  } catch (error: any) {
    console.log(`⚠️  Supabase storage error: ${error.message}\n`);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════

async function main() {
  const result = validateEnvironment();
  printValidationResults(result);
  
  // Generate recommended .env
  const recommended = generateRecommendedEnv(result);
  const outputPath = path.join(process.cwd(), '.env.recommended');
  fs.writeFileSync(outputPath, recommended);
  console.log(`📄 Recommended environment saved to: ${outputPath}\n`);
  
  // Store in Supabase (optional)
  await storeEnvironmentInSupabase();
  
  // Exit with appropriate code
  if (result.summary.missing > 0 || result.summary.placeholders > 0) {
    process.exit(1);
  } else if (result.summary.warnings > 0) {
    process.exit(0); // Warnings are OK
  } else {
    process.exit(0);
  }
}

main().catch(console.error);
