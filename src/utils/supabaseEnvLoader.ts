/**
 * Supabase Environment Loader
 * 
 * Loads environment variables from Supabase database before application starts.
 * This allows centralized configuration management across deployments.
 * 
 * Usage:
 * ```typescript
 * import { loadEnvFromSupabase } from './utils/supabaseEnvLoader';
 * await loadEnvFromSupabase();
 * ```
 */

import { SupabaseEnvStorage } from '../services/SupabaseEnvStorage';
import { logger } from './logger';

export interface EnvLoadOptions {
  /**
   * Environment name to load (e.g., 'production', 'staging', 'development')
   */
  environment?: string;
  
  /**
   * Category filter (e.g., 'blockchain', 'api', 'database')
   */
  category?: string;
  
  /**
   * Whether to merge with existing process.env (default: true)
   */
  merge?: boolean;
  
  /**
   * Whether to override existing env vars (default: false)
   * If false, only sets variables that don't exist in process.env
   */
  override?: boolean;
  
  /**
   * List of required variables that must be present
   */
  required?: string[];
  
  /**
   * Whether to load secrets (requires encryption key)
   */
  loadSecrets?: boolean;
  
  /**
   * Encryption key for secrets (defaults to SECRETS_ENCRYPTION_KEY env var)
   */
  encryptionKey?: string;
}

export interface LoadedEnvResult {
  success: boolean;
  configsLoaded: number;
  secretsLoaded: number;
  errors: string[];
  missingRequired: string[];
}

/**
 * Load environment variables from Supabase
 */
export async function loadEnvFromSupabase(
  options: EnvLoadOptions = {}
): Promise<LoadedEnvResult> {
  const {
    environment = process.env.NODE_ENV || 'development',
    category,
    merge = true,
    override = false,
    required = [],
    loadSecrets = false,
    encryptionKey,
  } = options;

  const result: LoadedEnvResult = {
    success: false,
    configsLoaded: 0,
    secretsLoaded: 0,
    errors: [],
    missingRequired: [],
  };

  try {
    // Check if Supabase is enabled
    const useSupabase = process.env.USE_SUPABASE === 'true';
    if (!useSupabase) {
      logger.info('Supabase environment loading disabled (USE_SUPABASE=false)');
      result.success = true;
      return result;
    }

    // Check if Supabase credentials are available
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      result.errors.push('Supabase credentials not found in environment');
      logger.warn('Cannot load from Supabase: missing SUPABASE_URL or SUPABASE_ANON_KEY');
      return result;
    }

    logger.info(`Loading environment from Supabase (environment: ${environment})`);

    // Initialize Supabase storage
    const storage = new SupabaseEnvStorage({
      encryptionKey: encryptionKey,
    });

    // Load configurations
    const configs = await storage.getAllConfigs(category);
    logger.info(`Found ${configs.length} configurations in Supabase`);

    // Apply configurations to process.env
    for (const config of configs) {
      const key = config.config_name;
      const value = config.config_value;

      // Check if we should set this variable
      const shouldSet =
        merge && (override || !process.env[key]);

      if (shouldSet) {
        process.env[key] = value;
        result.configsLoaded++;
        logger.debug(`Loaded config: ${key}`);
      } else if (process.env[key]) {
        logger.debug(`Skipped config: ${key} (already exists, override=false)`);
      }
    }

    // Load secrets if requested
    if (loadSecrets) {
      const effectiveEncryptionKey = encryptionKey || process.env.SECRETS_ENCRYPTION_KEY;
      
      if (!effectiveEncryptionKey) {
        result.errors.push('Cannot load secrets: encryption key not provided');
        logger.warn('Skipping secrets: no encryption key available');
      } else {
        try {
          const secrets = await storage.getAllSecrets(category);
          logger.info(`Found ${secrets.length} secrets in Supabase`);

          for (const secret of secrets) {
            const key = secret.secret_name;
            
            try {
              const value = await storage.getSecret(key, effectiveEncryptionKey);
              
              if (value) {
                const shouldSet = merge && (override || !process.env[key]);
                
                if (shouldSet) {
                  process.env[key] = value;
                  result.secretsLoaded++;
                  logger.debug(`Loaded secret: ${key}`);
                }
              }
            } catch (error) {
              result.errors.push(`Failed to decrypt secret ${key}: ${error}`);
              logger.error(`Failed to decrypt secret ${key}:`, error);
            }
          }
        } catch (error) {
          result.errors.push(`Failed to load secrets: ${error}`);
          logger.error('Failed to load secrets:', error);
        }
      }
    }

    // Check required variables
    for (const requiredVar of required) {
      if (!process.env[requiredVar]) {
        result.missingRequired.push(requiredVar);
        result.errors.push(`Required variable missing: ${requiredVar}`);
      }
    }

    // Determine success
    result.success = result.errors.length === 0 && result.missingRequired.length === 0;

    // Log summary
    logger.info(`Environment loading ${result.success ? 'succeeded' : 'completed with errors'}`);
    logger.info(`  Configs loaded: ${result.configsLoaded}`);
    logger.info(`  Secrets loaded: ${result.secretsLoaded}`);
    
    if (result.errors.length > 0) {
      logger.warn(`  Errors: ${result.errors.length}`);
    }
    
    if (result.missingRequired.length > 0) {
      logger.error(`  Missing required: ${result.missingRequired.join(', ')}`);
    }

    return result;

  } catch (error) {
    result.errors.push(`Unexpected error: ${error}`);
    logger.error('Failed to load environment from Supabase:', error);
    return result;
  }
}

/**
 * Load specific environment variable from Supabase
 */
export async function loadEnvVar(
  key: string,
  options: { isSecret?: boolean; encryptionKey?: string } = {}
): Promise<string | null> {
  const { isSecret = false, encryptionKey } = options;

  try {
    const useSupabase = process.env.USE_SUPABASE === 'true';
    if (!useSupabase) {
      return process.env[key] || null;
    }

    const storage = new SupabaseEnvStorage({ encryptionKey });

    if (isSecret) {
      const effectiveEncryptionKey = encryptionKey || process.env.SECRETS_ENCRYPTION_KEY;
      if (!effectiveEncryptionKey) {
        logger.warn(`Cannot load secret ${key}: no encryption key`);
        return null;
      }
      return await storage.getSecret(key, effectiveEncryptionKey);
    } else {
      return await storage.getConfig(key);
    }
  } catch (error) {
    logger.error(`Failed to load ${key} from Supabase:`, error);
    return null;
  }
}

/**
 * Save environment variable to Supabase
 */
export async function saveEnvVar(
  key: string,
  value: string,
  options: {
    isSecret?: boolean;
    encryptionKey?: string;
    category?: string;
    description?: string;
  } = {}
): Promise<boolean> {
  const { isSecret = false, encryptionKey, category, description } = options;

  try {
    const useSupabase = process.env.USE_SUPABASE === 'true';
    if (!useSupabase) {
      logger.warn('Supabase disabled, cannot save variable');
      return false;
    }

    const storage = new SupabaseEnvStorage({ encryptionKey });

    if (isSecret) {
      const effectiveEncryptionKey = encryptionKey || process.env.SECRETS_ENCRYPTION_KEY;
      if (!effectiveEncryptionKey) {
        logger.error(`Cannot save secret ${key}: no encryption key`);
        return false;
      }
      await storage.setSecret(key, value, effectiveEncryptionKey, { category, description });
    } else {
      await storage.setConfig(key, value, { category, description });
    }

    logger.info(`Saved ${isSecret ? 'secret' : 'config'} ${key} to Supabase`);
    return true;
  } catch (error) {
    logger.error(`Failed to save ${key} to Supabase:`, error);
    return false;
  }
}
