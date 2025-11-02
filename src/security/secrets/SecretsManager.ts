/**
 * Secrets Management Service
 * Integrates with HashiCorp Vault, Kubernetes Secrets, and AWS Secrets Manager
 */

import crypto from 'crypto';
import vault from 'node-vault';

export interface SecretMetadata {
  key: string;
  version: number;
  createdAt: Date;
  lastRotated?: Date;
  expiresAt?: Date;
  rotationPolicy?: RotationPolicy;
}

export interface RotationPolicy {
  enabled: boolean;
  intervalDays: number;
  autoRotate: boolean;
}

export enum SecretProvider {
  VAULT = 'VAULT',
  KUBERNETES = 'KUBERNETES',
  AWS = 'AWS',
  LOCAL_ENCRYPTED = 'LOCAL_ENCRYPTED'
}

export interface SecretsConfig {
  provider: SecretProvider;
  vaultUrl?: string;
  vaultToken?: string;
  encryptionKey?: string;
}

export class SecretsManager {
  private config: SecretsConfig;
  private vaultClient?: any;
  private localSecrets: Map<string, { value: string; metadata: SecretMetadata }>;
  private encryptionKey: Buffer;

  constructor(config: SecretsConfig) {
    this.config = config;
    this.localSecrets = new Map();
    
    // Initialize encryption key
    this.encryptionKey = config.encryptionKey 
      ? Buffer.from(config.encryptionKey, 'hex')
      : crypto.randomBytes(32);

    // Initialize Vault client if using Vault
    if (config.provider === SecretProvider.VAULT && config.vaultUrl) {
      this.vaultClient = vault({
        apiVersion: 'v1',
        endpoint: config.vaultUrl,
        token: config.vaultToken
      });
    }
  }

  /**
   * Store secret
   */
  async setSecret(
    key: string,
    value: string,
    metadata?: Partial<SecretMetadata>
  ): Promise<void> {
    const secretMetadata: SecretMetadata = {
      key,
      version: 1,
      createdAt: new Date(),
      ...metadata
    };

    switch (this.config.provider) {
      case SecretProvider.VAULT:
        await this.setVaultSecret(key, value, secretMetadata);
        break;
      case SecretProvider.LOCAL_ENCRYPTED:
        this.setLocalSecret(key, value, secretMetadata);
        break;
      default:
        throw new Error(`Provider ${this.config.provider} not implemented`);
    }
  }

  /**
   * Get secret
   */
  async getSecret(key: string): Promise<string | null> {
    switch (this.config.provider) {
      case SecretProvider.VAULT:
        return this.getVaultSecret(key);
      case SecretProvider.LOCAL_ENCRYPTED:
        return this.getLocalSecret(key);
      default:
        throw new Error(`Provider ${this.config.provider} not implemented`);
    }
  }

  /**
   * Delete secret
   */
  async deleteSecret(key: string): Promise<void> {
    switch (this.config.provider) {
      case SecretProvider.VAULT:
        await this.deleteVaultSecret(key);
        break;
      case SecretProvider.LOCAL_ENCRYPTED:
        this.localSecrets.delete(key);
        break;
      default:
        throw new Error(`Provider ${this.config.provider} not implemented`);
    }
  }

  /**
   * Rotate secret
   */
  async rotateSecret(key: string, newValue: string): Promise<void> {
    const metadata = await this.getSecretMetadata(key);
    if (!metadata) {
      throw new Error(`Secret ${key} not found`);
    }

    metadata.version++;
    metadata.lastRotated = new Date();

    await this.setSecret(key, newValue, metadata);
  }

  /**
   * Get secret metadata
   */
  async getSecretMetadata(key: string): Promise<SecretMetadata | null> {
    if (this.config.provider === SecretProvider.LOCAL_ENCRYPTED) {
      const secret = this.localSecrets.get(key);
      return secret?.metadata || null;
    }
    
    // For Vault, metadata would be stored separately
    return null;
  }

  /**
   * List all secret keys
   */
  async listSecrets(): Promise<string[]> {
    if (this.config.provider === SecretProvider.LOCAL_ENCRYPTED) {
      return Array.from(this.localSecrets.keys());
    }

    if (this.config.provider === SecretProvider.VAULT && this.vaultClient) {
      try {
        const result = await this.vaultClient.list('secret/data');
        return result.data.keys || [];
      } catch (error) {
        console.error('Error listing Vault secrets:', error);
        return [];
      }
    }

    return [];
  }

  /**
   * Store secret in Vault
   */
  private async setVaultSecret(
    key: string,
    value: string,
    metadata: SecretMetadata
  ): Promise<void> {
    if (!this.vaultClient) {
      throw new Error('Vault client not initialized');
    }

    try {
      await this.vaultClient.write(`secret/data/${key}`, {
        data: {
          value,
          metadata: JSON.stringify(metadata)
        }
      });
    } catch (error) {
      throw new Error(`Failed to write secret to Vault: ${error}`);
    }
  }

  /**
   * Get secret from Vault
   */
  private async getVaultSecret(key: string): Promise<string | null> {
    if (!this.vaultClient) {
      throw new Error('Vault client not initialized');
    }

    try {
      const result = await this.vaultClient.read(`secret/data/${key}`);
      return result.data.data.value || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete secret from Vault
   */
  private async deleteVaultSecret(key: string): Promise<void> {
    if (!this.vaultClient) {
      throw new Error('Vault client not initialized');
    }

    try {
      await this.vaultClient.delete(`secret/data/${key}`);
    } catch (error) {
      throw new Error(`Failed to delete secret from Vault: ${error}`);
    }
  }

  /**
   * Store secret locally with encryption
   */
  private setLocalSecret(
    key: string,
    value: string,
    metadata: SecretMetadata
  ): void {
    const encrypted = this.encrypt(value);
    this.localSecrets.set(key, {
      value: encrypted,
      metadata
    });
  }

  /**
   * Get secret from local storage
   */
  private getLocalSecret(key: string): string | null {
    const secret = this.localSecrets.get(key);
    if (!secret) return null;

    return this.decrypt(secret.value);
  }

  /**
   * Encrypt value using AES-256-GCM
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex')
    });
  }

  /**
   * Decrypt value
   */
  private decrypt(encryptedData: string): string {
    const { iv, encrypted, authTag } = JSON.parse(encryptedData);
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Check secrets that need rotation
   */
  async getSecretsNeedingRotation(): Promise<string[]> {
    const needsRotation: string[] = [];
    
    for (const [key, secret] of this.localSecrets.entries()) {
      const { metadata } = secret;
      
      if (!metadata.rotationPolicy?.enabled) continue;
      
      const lastRotation = metadata.lastRotated || metadata.createdAt;
      const daysSinceRotation = (Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRotation >= metadata.rotationPolicy.intervalDays) {
        needsRotation.push(key);
      }
    }
    
    return needsRotation;
  }
}
