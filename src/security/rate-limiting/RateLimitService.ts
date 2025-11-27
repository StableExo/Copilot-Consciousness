/**
 * Rate Limiting Service - Token Bucket Algorithm with Redis
 */

import Redis from 'ioredis';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimitService {
  private redis: Redis;
  private configs: Map<string, RateLimitConfig>;

  constructor(redis: Redis) {
    this.redis = redis;
    this.configs = new Map();
  }

  /**
   * Configure rate limit for a specific scope
   */
  configureLimit(scope: string, config: RateLimitConfig): void {
    this.configs.set(scope, config);
  }

  /**
   * Check and consume rate limit token
   */
  async checkLimit(scope: string, identifier: string): Promise<RateLimitResult> {
    const config = this.configs.get(scope);
    if (!config) {
      throw new Error(`Rate limit config not found for scope: ${scope}`);
    }

    const key = `${config.keyPrefix}:${scope}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Use Redis sorted set for sliding window
    const multi = this.redis.multi();

    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    multi.zcard(key);

    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration
    multi.expire(key, Math.ceil(config.windowMs / 1000));

    const results = await multi.exec();

    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const count = results[1][1] as number;
    const allowed = count < config.maxRequests;

    const resetTime = now + config.windowMs;
    const remaining = Math.max(0, config.maxRequests - count - 1);

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : config.windowMs,
    };
  }

  /**
   * Get current usage for identifier
   */
  async getUsage(scope: string, identifier: string): Promise<{ count: number; limit: number }> {
    const config = this.configs.get(scope);
    if (!config) {
      throw new Error(`Rate limit config not found for scope: ${scope}`);
    }

    const key = `${config.keyPrefix}:${scope}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean up old entries and count
    await this.redis.zremrangebyscore(key, 0, windowStart);
    const count = await this.redis.zcard(key);

    return {
      count,
      limit: config.maxRequests,
    };
  }

  /**
   * Reset rate limit for identifier
   */
  async resetLimit(scope: string, identifier: string): Promise<void> {
    const config = this.configs.get(scope);
    if (!config) {
      throw new Error(`Rate limit config not found for scope: ${scope}`);
    }

    const key = `${config.keyPrefix}:${scope}:${identifier}`;
    await this.redis.del(key);
  }

  /**
   * Block identifier for specified duration
   */
  async blockIdentifier(scope: string, identifier: string, durationMs: number): Promise<void> {
    const blockKey = `${scope}:blocked:${identifier}`;
    await this.redis.set(blockKey, '1', 'PX', durationMs);
  }

  /**
   * Check if identifier is blocked
   */
  async isBlocked(scope: string, identifier: string): Promise<boolean> {
    const blockKey = `${scope}:blocked:${identifier}`;
    const result = await this.redis.get(blockKey);
    return result !== null;
  }
}
