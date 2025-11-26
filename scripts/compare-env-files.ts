#!/usr/bin/env ts-node
/**
 * .env File Comparison Tool
 * 
 * Compares your .env file with .env.example to:
 * 1. Identify missing variables in your .env
 * 2. Identify extra variables not in .env.example
 * 3. Check for placeholder values that need to be updated
 * 4. Verify critical security settings
 * 
 * Usage: ts-node scripts/compare-env-files.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface EnvVariable {
  key: string;
  value: string;
  lineNumber: number;
}

interface ComparisonResult {
  missing: string[];
  extra: string[];
  placeholders: Array<{ key: string; value: string }>;
  criticalIssues: Array<{ key: string; issue: string }>;
  recommendations: string[];
}

/**
 * Parse .env file into key-value pairs
 */
function parseEnvFile(filePath: string): Map<string, EnvVariable> {
  const envVars = new Map<string, EnvVariable>();
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') {
      return;
    }
    
    // Parse KEY=VALUE
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      envVars.set(key, {
        key,
        value,
        lineNumber: index + 1,
      });
    }
  });
  
  return envVars;
}

/**
 * Check if a value is a placeholder
 */
function isPlaceholder(value: string): boolean {
  const placeholders = [
    'YOUR-API-KEY',
    'YOUR_API_KEY',
    'your-api-key',
    'your_api_key',
    'YOUR-',
    'your-',
    'ask_operator',
    'your-password',
    'your-email',
    'your-chat-id',
    'your-discord',
    'your-telegram',
    'your_gemini',
    'your_github',
    'your_openai',
    'your_org_id',
  ];
  
  return placeholders.some(placeholder => value.toLowerCase().includes(placeholder.toLowerCase()));
}

/**
 * Check critical security settings
 */
function checkCriticalSettings(envVars: Map<string, EnvVariable>): Array<{ key: string; issue: string }> {
  const issues: Array<{ key: string; issue: string }> = [];
  
  // Check NODE_ENV
  const nodeEnv = envVars.get('NODE_ENV');
  if (nodeEnv && nodeEnv.value === 'development') {
    issues.push({
      key: 'NODE_ENV',
      issue: 'Set to "development" - should be "production" for live trading',
    });
  }
  
  // Check DRY_RUN
  const dryRun = envVars.get('DRY_RUN');
  if (dryRun && dryRun.value === 'true') {
    issues.push({
      key: 'DRY_RUN',
      issue: 'Set to "true" - no real transactions will execute. Set to "false" for live trading.',
    });
  }
  
  // Check CORS_ORIGIN
  const corsOrigin = envVars.get('CORS_ORIGIN');
  if (corsOrigin && corsOrigin.value === '*') {
    issues.push({
      key: 'CORS_ORIGIN',
      issue: 'Set to "*" - allows any origin. Specify your domain(s) for production.',
    });
  }
  
  // Check JWT_SECRET length
  const jwtSecret = envVars.get('JWT_SECRET');
  if (jwtSecret && jwtSecret.value.length < 64) {
    issues.push({
      key: 'JWT_SECRET',
      issue: `Too short (${jwtSecret.value.length} chars). Should be at least 128 characters for security.`,
    });
  }
  
  // Check WALLET_PRIVATE_KEY
  const privateKey = envVars.get('WALLET_PRIVATE_KEY');
  if (privateKey && isPlaceholder(privateKey.value)) {
    issues.push({
      key: 'WALLET_PRIVATE_KEY',
      issue: 'Still set to placeholder. Must be a real private key for live trading.',
    });
  }
  
  // Check GRAFANA_PASSWORD
  const grafanaPass = envVars.get('GRAFANA_PASSWORD');
  if (grafanaPass && (grafanaPass.value === 'admin' || grafanaPass.value === 'Mrcookie1!')) {
    issues.push({
      key: 'GRAFANA_PASSWORD',
      issue: 'Using default password. Change for security.',
    });
  }
  
  return issues;
}

/**
 * Generate recommendations
 */
function generateRecommendations(
  missingVars: string[],
  placeholders: Array<{ key: string; value: string }>,
  criticalIssues: Array<{ key: string; issue: string }>
): string[] {
  const recommendations: string[] = [];
  
  if (missingVars.length > 0) {
    recommendations.push(
      `⚠️  Missing ${missingVars.length} variables. Add them to your .env file.`
    );
  }
  
  if (placeholders.length > 0) {
    recommendations.push(
      `🔑 ${placeholders.length} placeholder values detected. Replace with actual values.`
    );
  }
  
  if (criticalIssues.length > 0) {
    recommendations.push(
      `🚨 ${criticalIssues.length} critical security issues found. Address before production deployment.`
    );
  }
  
  recommendations.push('✅ Run "npm run validate-env" to validate your configuration.');
  recommendations.push('📖 Review ENV_PRODUCTION_READINESS_REVIEW.md for detailed security guidance.');
  
  return recommendations;
}

/**
 * Main comparison function
 */
function compareEnvFiles(): ComparisonResult {
  const rootDir = path.resolve(__dirname, '..');
  const examplePath = path.join(rootDir, '.env.example');
  const envPath = path.join(rootDir, '.env');
  
  console.log('═'.repeat(80));
  console.log('  .ENV FILE COMPARISON TOOL');
  console.log('═'.repeat(80));
  console.log();
  
  // Parse files
  console.log('📄 Parsing .env.example...');
  const exampleVars = parseEnvFile(examplePath);
  console.log(`   Found ${exampleVars.size} variables in .env.example`);
  
  if (!fs.existsSync(envPath)) {
    console.log('\n❌ ERROR: .env file not found!');
    console.log('   Create one by copying .env.example:');
    console.log('   $ cp .env.example .env');
    process.exit(1);
  }
  
  console.log('📄 Parsing your .env...');
  const envVars = parseEnvFile(envPath);
  console.log(`   Found ${envVars.size} variables in your .env\n`);
  
  // Compare
  const result: ComparisonResult = {
    missing: [],
    extra: [],
    placeholders: [],
    criticalIssues: [],
    recommendations: [],
  };
  
  // Find missing variables
  exampleVars.forEach((value, key) => {
    if (!envVars.has(key)) {
      result.missing.push(key);
    }
  });
  
  // Find extra variables
  envVars.forEach((value, key) => {
    if (!exampleVars.has(key)) {
      result.extra.push(key);
    }
  });
  
  // Find placeholders
  envVars.forEach((envVar) => {
    if (isPlaceholder(envVar.value)) {
      result.placeholders.push({
        key: envVar.key,
        value: envVar.value,
      });
    }
  });
  
  // Check critical settings
  result.criticalIssues = checkCriticalSettings(envVars);
  
  // Generate recommendations
  result.recommendations = generateRecommendations(
    result.missing,
    result.placeholders,
    result.criticalIssues
  );
  
  return result;
}

/**
 * Print results
 */
function printResults(result: ComparisonResult) {
  console.log('═'.repeat(80));
  console.log('  COMPARISON RESULTS');
  console.log('═'.repeat(80));
  console.log();
  
  // Missing variables
  if (result.missing.length > 0) {
    console.log(`❌ MISSING VARIABLES (${result.missing.length})`);
    console.log('   These variables exist in .env.example but not in your .env:\n');
    result.missing.sort().forEach((key) => {
      console.log(`   • ${key}`);
    });
    console.log();
  } else {
    console.log('✅ NO MISSING VARIABLES\n');
  }
  
  // Extra variables
  if (result.extra.length > 0) {
    console.log(`ℹ️  EXTRA VARIABLES (${result.extra.length})`);
    console.log('   These variables exist in your .env but not in .env.example:\n');
    result.extra.sort().forEach((key) => {
      console.log(`   • ${key}`);
    });
    console.log('   (These may be custom additions or outdated variables)\n');
  } else {
    console.log('✅ NO EXTRA VARIABLES\n');
  }
  
  // Placeholders
  if (result.placeholders.length > 0) {
    console.log(`🔑 PLACEHOLDER VALUES (${result.placeholders.length})`);
    console.log('   These variables still have placeholder values:\n');
    result.placeholders.forEach(({ key, value }) => {
      const displayValue = value.length > 40 ? value.substring(0, 40) + '...' : value;
      console.log(`   • ${key} = ${displayValue}`);
    });
    console.log();
  } else {
    console.log('✅ NO PLACEHOLDER VALUES\n');
  }
  
  // Critical issues
  if (result.criticalIssues.length > 0) {
    console.log(`🚨 CRITICAL SECURITY ISSUES (${result.criticalIssues.length})`);
    console.log();
    result.criticalIssues.forEach(({ key, issue }) => {
      console.log(`   ⚠️  ${key}`);
      console.log(`      ${issue}`);
      console.log();
    });
  } else {
    console.log('✅ NO CRITICAL SECURITY ISSUES\n');
  }
  
  // Recommendations
  console.log('═'.repeat(80));
  console.log('  RECOMMENDATIONS');
  console.log('═'.repeat(80));
  console.log();
  result.recommendations.forEach((rec) => {
    console.log(`   ${rec}`);
  });
  console.log();
  
  // Summary
  console.log('═'.repeat(80));
  console.log('  SUMMARY');
  console.log('═'.repeat(80));
  console.log();
  
  const totalIssues = result.missing.length + result.placeholders.length + result.criticalIssues.length;
  
  if (totalIssues === 0) {
    console.log('   ✅ Your .env file looks good!');
    console.log('   ✅ All variables are present and configured.');
    console.log('   ✅ No critical security issues detected.');
  } else {
    console.log(`   ⚠️  Found ${totalIssues} issues that need attention:`);
    console.log(`      • ${result.missing.length} missing variables`);
    console.log(`      • ${result.placeholders.length} placeholder values`);
    console.log(`      • ${result.criticalIssues.length} critical security issues`);
    console.log();
    console.log('   📝 Review the details above and update your .env file accordingly.');
  }
  
  console.log();
  console.log('═'.repeat(80));
  console.log();
}

/**
 * Main entry point
 */
if (require.main === module) {
  try {
    const result = compareEnvFiles();
    printResults(result);
    
    // Exit with error code if there are issues
    const totalIssues = result.missing.length + result.placeholders.length + result.criticalIssues.length;
    process.exit(totalIssues > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ ERROR:', error instanceof Error ? error.message : String(error));
    console.error();
    process.exit(1);
  }
}

export { compareEnvFiles, ComparisonResult };
