/**
 * Supabase Environment Storage Service
 * 
 * Provides a secure way to store and retrieve environment configuration
 * and secrets from Supabase database.
 * 
 * Features:
 * - Non-sensitive config storage in environment_configs table
 * - Encrypted secrets storage in environment_secrets table
 * - Application-level encryption using crypto module
 * - Type-safe interfaces for configuration management
 * 
 * Usage:
 * ```typescript
 * const storage = new SupabaseEnvStorage();
 * await storage.setConfig('API_URL', 'https://api.example.com');
 * const apiUrl = await storage.getConfig('API_URL');
 * 
 * await storage.setSecret('API_KEY', 'secret-value', 'my-encryption-key');
 * const apiKey = await storage.getSecret('API_KEY', 'my-encryption-key');
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface EnvironmentConfig {
  id: string;
  config_name: string;
  config_value: string;
  description?: string;
  category?: 'database' | 'api' | 'blockchain' | 'service' | 'feature_flag';
  is_required?: boolean;
  value_type?: 'string' | 'number' | 'boolean' | 'json' | 'url';
  validation_regex?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface EnvironmentSecret {
  id: string;
  config_id?: string;
  secret_name: string;
  encrypted_value: string;
  encryption_key_id?: string;
  description?: string;
  category?: 'api_key' | 'private_key' | 'password' | 'token' | 'credential';
  allowed_services?: string[];
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
  created_by?: string;
  updated_by?: string;
  access_count?: number;
}

export interface SupabaseEnvStorageOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  encryptionKey?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class SupabaseEnvStorage {
  private supabase: SupabaseClient;
  private defaultEncryptionKey: string;

  constructor(options?: SupabaseEnvStorageOptions) {
    const supabaseUrl = options?.supabaseUrl || process.env.SUPABASE_URL;
    const supabaseKey = options?.supabaseKey || process.env.SUPABASE_ANON_KEY;
    const encryptionKey = options?.encryptionKey || process.env.SECRETS_ENCRYPTION_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key are required. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.defaultEncryptionKey = encryptionKey;
  }

  // ==========================================================================
  // CONFIGURATION METHODS (Non-sensitive)
  // ==========================================================================

  /**
   * Set a non-sensitive configuration value
   */
  async setConfig(
    name: string,
    value: string,
    metadata?: Partial<Omit<EnvironmentConfig, 'id' | 'config_name' | 'config_value' | 'created_at' | 'updated_at'>>
  ): Promise<EnvironmentConfig> {
    const { data, error } = await this.supabase
      .from('environment_configs')
      .upsert({
        config_name: name,
        config_value: value,
        ...metadata,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to set config ${name}: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a non-sensitive configuration value
   */
  async getConfig(name: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('environment_configs')
      .select('config_value')
      .eq('config_name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to get config ${name}: ${error.message}`);
    }

    return data?.config_value || null;
  }

  /**
   * Get all configuration entries
   */
  async getAllConfigs(category?: string): Promise<EnvironmentConfig[]> {
    let query = this.supabase.from('environment_configs').select('*');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('config_name');

    if (error) {
      throw new Error(`Failed to get configs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Delete a configuration entry
   */
  async deleteConfig(name: string): Promise<void> {
    const { error } = await this.supabase
      .from('environment_configs')
      .delete()
      .eq('config_name', name);

    if (error) {
      throw new Error(`Failed to delete config ${name}: ${error.message}`);
    }
  }

  // ==========================================================================
  // SECRET METHODS (Sensitive, encrypted)
  // ==========================================================================

  /**
   * Encrypt a value using AES-256-CBC
   */
  private encrypt(text: string, key: string): string {
    if (!key || key.length < 32) {
      throw new Error('Encryption key must be at least 32 characters');
    }

    const algorithm = 'aes-256-cbc';
    const keyBuffer = Buffer.from(key.slice(0, 32), 'utf8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a value using AES-256-CBC
   */
  private decrypt(encryptedText: string, key: string): string {
    if (!key || key.length < 32) {
      throw new Error('Decryption key must be at least 32 characters');
    }

    const algorithm = 'aes-256-cbc';
    const keyBuffer = Buffer.from(key.slice(0, 32), 'utf8');
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Set an encrypted secret value
   */
  async setSecret(
    name: string,
    value: string,
    encryptionKey?: string,
    metadata?: Partial<Omit<EnvironmentSecret, 'id' | 'secret_name' | 'encrypted_value' | 'created_at' | 'updated_at'>>
  ): Promise<EnvironmentSecret> {
    const key = encryptionKey || this.defaultEncryptionKey;
    if (!key) {
      throw new Error('Encryption key is required. Provide it as parameter or set SECRETS_ENCRYPTION_KEY environment variable.');
    }

    const encryptedValue = this.encrypt(value, key);

    const { data, error } = await this.supabase
      .from('environment_secrets')
      .upsert({
        secret_name: name,
        encrypted_value: encryptedValue,
        encryption_key_id: metadata?.encryption_key_id || 'default',
        ...metadata,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to set secret ${name}: ${error.message}`);
    }

    return data;
  }

  /**
   * Get and decrypt a secret value
   */
  async getSecret(name: string, encryptionKey?: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('environment_secrets')
      .select('encrypted_value')
      .eq('secret_name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to get secret ${name}: ${error.message}`);
    }

    if (!data?.encrypted_value) {
      return null;
    }

    const key = encryptionKey || this.defaultEncryptionKey;
    if (!key) {
      throw new Error('Decryption key is required. Provide it as parameter or set SECRETS_ENCRYPTION_KEY environment variable.');
    }

    try {
      // Update last accessed timestamp
      await this.supabase
        .from('environment_secrets')
        .update({
          last_accessed_at: new Date().toISOString(),
          access_count: (data as any).access_count + 1 || 1,
        })
        .eq('secret_name', name);

      return this.decrypt(data.encrypted_value, key);
    } catch (decryptError) {
      throw new Error(`Failed to decrypt secret ${name}: ${(decryptError as Error).message}`);
    }
  }

  /**
   * Get all secret entries (without decrypting values)
   */
  async getAllSecrets(category?: string): Promise<Omit<EnvironmentSecret, 'encrypted_value'>[]> {
    let query = this.supabase
      .from('environment_secrets')
      .select('id, secret_name, description, category, allowed_services, created_at, updated_at, last_accessed_at, access_count');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('secret_name');

    if (error) {
      throw new Error(`Failed to get secrets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Delete a secret entry
   */
  async deleteSecret(name: string): Promise<void> {
    const { error } = await this.supabase
      .from('environment_secrets')
      .delete()
      .eq('secret_name', name);

    if (error) {
      throw new Error(`Failed to delete secret ${name}: ${error.message}`);
    }
  }

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  /**
   * Bulk import configuration from environment variables
   */
  async importFromEnv(prefix: string = '', category?: string): Promise<{ configs: number; secrets: number }> {
    let configCount = 0;
    let secretCount = 0;

    // List of common secret patterns (case-insensitive)
    const secretPatterns = [
      'KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'PRIVATE', 'CREDENTIAL',
      'API_KEY', 'AUTH', 'PASS', 'PWD'
    ];

    for (const [key, value] of Object.entries(process.env)) {
      if (prefix && !key.startsWith(prefix)) {
        continue;
      }

      if (!value) {
        continue;
      }

      const isSecret = secretPatterns.some(pattern => 
        key.toUpperCase().includes(pattern)
      );

      if (isSecret) {
        await this.setSecret(key, value, undefined, { category: category as any });
        secretCount++;
      } else {
        await this.setConfig(key, value, { category: category as any });
        configCount++;
      }
    }

    return { configs: configCount, secrets: secretCount };
  }

  /**
   * Export all configuration to environment format
   */
  async exportToEnvFormat(): Promise<string> {
    const configs = await this.getAllConfigs();
    const secrets = await this.getAllSecrets();

    let envContent = '# Configuration exported from Supabase\n\n';

    // Add configs
    envContent += '# Non-sensitive Configuration\n';
    for (const config of configs) {
      if (config.description) {
        envContent += `# ${config.description}\n`;
      }
      envContent += `${config.config_name}=${config.config_value}\n`;
    }

    // Add secret placeholders
    envContent += '\n# Secrets (encrypted - use getSecret() to retrieve)\n';
    for (const secret of secrets) {
      if (secret.description) {
        envContent += `# ${secret.description}\n`;
      }
      envContent += `${secret.secret_name}=<encrypted>\n`;
    }

    return envContent;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a SupabaseEnvStorage instance
 */
export function createSupabaseEnvStorage(options?: SupabaseEnvStorageOptions): SupabaseEnvStorage {
  return new SupabaseEnvStorage(options);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default SupabaseEnvStorage;
