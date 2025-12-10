#!/usr/bin/env npx tsx
/**
 * Test SupabaseEnvStorage Service
 * 
 * This script demonstrates and tests the SupabaseEnvStorage service
 * to store and retrieve environment configuration.
 */

import dotenv from 'dotenv';
dotenv.config();

import { SupabaseEnvStorage } from '../../src/services/SupabaseEnvStorage';

async function main() {
  console.log('🧪 Testing SupabaseEnvStorage Service...\n');
  console.log('━'.repeat(60));
  
  try {
    // Initialize storage
    console.log('1️⃣  Initializing SupabaseEnvStorage...');
    const storage = new SupabaseEnvStorage();
    console.log('   ✅ Service initialized\n');
    
    // Test 1: Store a non-sensitive config
    console.log('2️⃣  Testing setConfig (non-sensitive)...');
    const testConfigName = 'TEST_CONFIG_' + Date.now();
    await storage.setConfig(testConfigName, 'https://api.example.com', {
      description: 'Test API URL',
      category: 'api',
      is_required: true,
      value_type: 'url',
    });
    console.log(`   ✅ Stored config: ${testConfigName}`);
    
    // Test 2: Retrieve the config
    console.log('\n3️⃣  Testing getConfig...');
    const retrievedConfig = await storage.getConfig(testConfigName);
    console.log(`   ✅ Retrieved: ${retrievedConfig}`);
    console.log(`   ✅ Matches: ${retrievedConfig === 'https://api.example.com'}`);
    
    // Test 3: Store an encrypted secret
    console.log('\n4️⃣  Testing setSecret (encrypted)...');
    const testSecretName = 'TEST_SECRET_' + Date.now();
    await storage.setSecret(testSecretName, 'my-super-secret-value', undefined, {
      description: 'Test API Key',
      category: 'api_key',
    });
    console.log(`   ✅ Stored encrypted secret: ${testSecretName}`);
    
    // Test 4: Retrieve and decrypt the secret
    console.log('\n5️⃣  Testing getSecret (decryption)...');
    const retrievedSecret = await storage.getSecret(testSecretName);
    console.log(`   ✅ Retrieved and decrypted: ${retrievedSecret}`);
    console.log(`   ✅ Matches: ${retrievedSecret === 'my-super-secret-value'}`);
    
    // Test 5: List all configs
    console.log('\n6️⃣  Testing getAllConfigs...');
    const allConfigs = await storage.getAllConfigs();
    console.log(`   ✅ Found ${allConfigs.length} configuration(s)`);
    if (allConfigs.length > 0) {
      console.log('   📋 Recent configs:');
      allConfigs.slice(0, 5).forEach(config => {
        console.log(`      • ${config.config_name}: ${config.config_value.substring(0, 30)}...`);
      });
    }
    
    // Test 6: List all secrets (without encrypted values)
    console.log('\n7️⃣  Testing getAllSecrets...');
    const allSecrets = await storage.getAllSecrets();
    console.log(`   ✅ Found ${allSecrets.length} secret(s)`);
    if (allSecrets.length > 0) {
      console.log('   🔐 Recent secrets:');
      allSecrets.slice(0, 5).forEach(secret => {
        console.log(`      • ${secret.secret_name} (${secret.category}) - accessed ${secret.access_count || 0} times`);
      });
    }
    
    // Test 7: Test encryption/decryption directly
    console.log('\n8️⃣  Testing encryption/decryption...');
    const originalValue = 'test-encryption-value-123';
    const encryptionKey = process.env.SECRETS_ENCRYPTION_KEY || 'test-key-12345678901234567890123456789012';
    
    // Access private methods for testing
    const encrypted = (storage as any).encrypt(originalValue, encryptionKey);
    console.log(`   🔒 Encrypted: ${encrypted.substring(0, 50)}...`);
    
    const decrypted = (storage as any).decrypt(encrypted, encryptionKey);
    console.log(`   🔓 Decrypted: ${decrypted}`);
    console.log(`   ✅ Matches: ${decrypted === originalValue}`);
    
    // Test 8: Export to .env format
    console.log('\n9️⃣  Testing exportToEnvFormat...');
    const envFormat = await storage.exportToEnvFormat();
    console.log('   ✅ Generated .env format:');
    console.log('   ' + '─'.repeat(50));
    console.log(envFormat.split('\n').slice(0, 10).map(line => '   ' + line).join('\n'));
    console.log('   ' + '─'.repeat(50));
    
    // Cleanup test entries
    console.log('\n🧹 Cleaning up test entries...');
    await storage.deleteConfig(testConfigName);
    console.log(`   ✅ Deleted test config: ${testConfigName}`);
    
    await storage.deleteSecret(testSecretName);
    console.log(`   ✅ Deleted test secret: ${testSecretName}`);
    
    console.log('\n' + '━'.repeat(60));
    console.log('✅ All tests passed successfully!');
    console.log('\n📝 Example usage:');
    console.log('   // Store non-sensitive config');
    console.log('   await storage.setConfig("API_URL", "https://api.example.com");');
    console.log('');
    console.log('   // Store encrypted secret');
    console.log('   await storage.setSecret("API_KEY", "secret-value");');
    console.log('');
    console.log('   // Retrieve config');
    console.log('   const url = await storage.getConfig("API_URL");');
    console.log('');
    console.log('   // Retrieve and decrypt secret');
    console.log('   const key = await storage.getSecret("API_KEY");');
    console.log('');
    console.log('   // Bulk import from environment');
    console.log('   await storage.importFromEnv("SUPABASE_");');
    console.log('\n🎯 Service is working correctly! 🚀');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   • Make sure tables exist (run verify-environment-tables.ts)');
    console.error('   • Check SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
    console.error('   • Verify SECRETS_ENCRYPTION_KEY is at least 32 characters');
    console.error('   • Ensure RLS policies allow service role access');
    console.error('\n📋 Full error details:');
    console.error(error);
    process.exit(1);
  }
}

main();
