/**
 * Simple In-Memory Cache
 * 
 * Integrated from AxionCitadel - Production-tested caching utility
 * with TTL support and async function wrapping.
 */

import { logger } from '../logger';

const cacheStore = new Map<string, any>();
const functionSig = '[SimpleCache]';

/**
 * Retrieves a value from the cache
 */
export function get<T>(key: string): T | undefined {
  return cacheStore.get(key);
}

/**
 * Stores a value in the cache
 * @param key The cache key
 * @param value The value to cache
 * @param ttlSeconds Time-to-live in seconds (0 or undefined = no TTL)
 */
export function set<T>(key: string, value: T, ttlSeconds?: number): void {
  cacheStore.set(key, value);
  
  if (ttlSeconds && ttlSeconds > 0) {
    setTimeout(() => {
      const currentValue = cacheStore.get(key);
      if (currentValue === value) {
        cacheStore.delete(key);
      }
    }, ttlSeconds * 1000);
  }
}

/**
 * Deletes a value from the cache
 * @returns True if an element existed and was removed
 */
export function del(key: string): boolean {
  return cacheStore.delete(key);
}

/**
 * Clears all entries from the cache
 */
export function clear(): void {
  logger.info(`${functionSig} CLEAR all cache entries.`);
  cacheStore.clear();
}

/**
 * Checks if a key exists in the cache
 */
export function has(key: string): boolean {
  return cacheStore.has(key);
}

/**
 * A wrapper function to cache the result of an async function
 * @param key The cache key
 * @param fn The async function to execute and cache
 * @param ttlSeconds Time-to-live in seconds
 * @returns The result from the cache or the function
 */
export async function wrap<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds?: number
): Promise<T> {
  const cachedValue = get<T>(key);
  
  if (cachedValue !== undefined) {
    return cachedValue;
  }
  
  const result = await fn();
  set(key, result, ttlSeconds);
  return result;
}

export default {
  get,
  set,
  del,
  clear,
  has,
  wrap,
};
