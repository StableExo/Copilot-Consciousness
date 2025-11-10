/**
 * Test Utilities
 * 
 * Common utility functions for testing
 */

/**
 * Wait for a specific duration
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await wait(interval);
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create a promise that resolves after a delay
 */
export function delay<T>(ms: number, value?: T): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value as T), ms));
}

/**
 * Create a promise that rejects after a delay
 */
export function delayReject(ms: number, error: Error): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(error), ms));
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await wait(delayMs * Math.pow(2, attempt - 1));
      }
    }
  }
  
  throw lastError;
}

/**
 * Create a mock timer that can be controlled
 */
export class MockTimer {
  private currentTime: number = Date.now();
  
  now(): number {
    return this.currentTime;
  }
  
  advance(ms: number): void {
    this.currentTime += ms;
  }
  
  set(time: number): void {
    this.currentTime = time;
  }
  
  reset(): void {
    this.currentTime = Date.now();
  }
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random array of specified length
 */
export function randomArray<T>(length: number, generator: (index: number) => T): T[] {
  return Array.from({ length }, (_, i) => generator(i));
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two objects are deeply equal
 */
export function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
