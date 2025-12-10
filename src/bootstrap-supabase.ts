/**
 * Bootstrap for TheWarden with Supabase Environment Loading
 * 
 * This file should be used as the entry point when you want to load
 * environment variables from Supabase before starting TheWarden.
 * 
 * Usage:
 * ```bash
 * # Instead of: npm start (which runs src/main.ts)
 * # Use: node --import tsx src/bootstrap-supabase.ts
 * ```
 * 
 * Or add to package.json:
 * ```json
 * "scripts": {
 *   "start:supabase": "node --import tsx src/bootstrap-supabase.ts"
 * }
 * ```
 */

// Step 1: Load .env file first (for Supabase credentials)
import 'dotenv/config';

import { loadEnvFromSupabase } from './utils/supabaseEnvLoader';
import { logger } from './utils/logger';

/**
 * Bootstrap TheWarden with Supabase environment loading
 */
async function bootstrap() {
  try {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('🚀 BOOTSTRAP: Loading configuration from Supabase');
    logger.info('═══════════════════════════════════════════════════════════');

    // Check if Supabase is enabled
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (!useSupabase) {
      logger.info('Supabase disabled (USE_SUPABASE=false), using .env file only');
      logger.info('To enable Supabase: set USE_SUPABASE=true in .env');
    } else {
      // Load environment from Supabase
      const result = await loadEnvFromSupabase({
        environment: process.env.NODE_ENV || 'production',
        loadSecrets: true, // Load encrypted secrets
        merge: true, // Merge with existing .env
        override: false, // Don't override local .env (local takes precedence)
        required: [
          // List critical variables that must be present
          'RPC_URL',
          'PRIVATE_KEY',
          'CHAIN_ID',
        ],
      });

      if (!result.success) {
        logger.error('═══════════════════════════════════════════════════════════');
        logger.error('❌ BOOTSTRAP FAILED: Environment loading errors');
        logger.error('═══════════════════════════════════════════════════════════');
        
        if (result.errors.length > 0) {
          logger.error('Errors:');
          result.errors.forEach(err => logger.error(`  - ${err}`));
        }
        
        if (result.missingRequired.length > 0) {
          logger.error('Missing required variables:');
          result.missingRequired.forEach(v => logger.error(`  - ${v}`));
        }
        
        logger.error('═══════════════════════════════════════════════════════════');
        process.exit(1);
      }

      logger.info('✅ Environment loaded successfully from Supabase');
      logger.info(`   Configurations: ${result.configsLoaded}`);
      logger.info(`   Secrets: ${result.secretsLoaded}`);
      logger.info('═══════════════════════════════════════════════════════════');
    }

    // Step 2: Import and start TheWarden main application
    logger.info('Starting TheWarden main application...');
    const { main } = await import('./main');
    await main();

  } catch (error) {
    logger.error('═══════════════════════════════════════════════════════════');
    logger.error('❌ BOOTSTRAP FATAL ERROR');
    logger.error('═══════════════════════════════════════════════════════════');
    logger.error(error);
    process.exit(1);
  }
}

// Run bootstrap
bootstrap().catch((error) => {
  console.error('Unhandled bootstrap error:', error);
  process.exit(1);
});
