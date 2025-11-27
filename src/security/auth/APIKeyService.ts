/**
 * API Key Management Service
 */

import crypto from 'crypto';
import { AuthConfig } from './types';

export interface APIKey {
  id: string;
  userId: string;
  key: string;
  keyHash: string;
  name: string;
  scopes: string[];
  expiresAt?: Date;
  lastUsed?: Date;
  createdAt: Date;
  isActive: boolean;
}

export class APIKeyService {
  private config: AuthConfig;
  private keys: Map<string, APIKey>;

  constructor(config: AuthConfig) {
    this.config = config;
    this.keys = new Map();
  }

  /**
   * Generate new API key
   */
  generateAPIKey(userId: string, name: string, scopes: string[], expiresInDays?: number): APIKey {
    const keyId = crypto.randomBytes(16).toString('hex');
    const keySecret = crypto.randomBytes(32).toString('hex');
    const fullKey = `${this.config.apiKeyPrefix}_${keyId}_${keySecret}`;
    const keyHash = this.hashKey(fullKey);

    const apiKey: APIKey = {
      id: keyId,
      userId,
      key: fullKey,
      keyHash,
      name,
      scopes,
      expiresAt: expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      createdAt: new Date(),
      isActive: true,
    };

    this.keys.set(keyHash, apiKey);
    return apiKey;
  }

  /**
   * Validate API key
   */
  validateAPIKey(key: string): APIKey | null {
    const keyHash = this.hashKey(key);
    const apiKey = this.keys.get(keyHash);

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used
    apiKey.lastUsed = new Date();
    return apiKey;
  }

  /**
   * Revoke API key
   */
  revokeAPIKey(keyId: string): boolean {
    for (const [hash, apiKey] of this.keys.entries()) {
      if (apiKey.id === keyId) {
        apiKey.isActive = false;
        return true;
      }
    }
    return false;
  }

  /**
   * Get all API keys for user
   */
  getUserAPIKeys(userId: string): Omit<APIKey, 'key' | 'keyHash'>[] {
    const userKeys: Omit<APIKey, 'key' | 'keyHash'>[] = [];

    for (const apiKey of this.keys.values()) {
      if (apiKey.userId === userId) {
        const { key, keyHash, ...safeKey } = apiKey;
        userKeys.push(safeKey);
      }
    }

    return userKeys;
  }

  /**
   * Hash API key for storage
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Check if key has required scope
   */
  hasScope(apiKey: APIKey, requiredScope: string): boolean {
    return apiKey.scopes.includes('*') || apiKey.scopes.includes(requiredScope);
  }
}
