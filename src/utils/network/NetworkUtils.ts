/**
 * Network Utilities
 * 
 * Integrated from AxionCitadel - Production-tested network utilities
 * with retry logic and exponential backoff.
 */

import { logger } from '../logger';

/**
 * Utility function to introduce a delay
 */
export const delay = (ms: number): Promise<void> => 
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps an async function call with retry logic and exponential backoff
 * @param fetchFn The async function to call
 * @param identifier A string identifying the operation for logging
 * @param maxRetries Maximum number of retry attempts
 * @param initialDelayMs Initial delay in milliseconds before the first retry
 * @returns Resolves with the result of fetchFn or rejects if all retries fail
 */
export async function safeFetchWrapper<T>(
  fetchFn: () => Promise<T>,
  identifier: string,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let currentDelay = initialDelayMs;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const result = await fetchFn();
      return result;
    } catch (error: any) {
      logger.warn(
        `[safeFetchWrapper] Attempt ${attempt} failed for ${identifier}. Error: ${error.message}`
      );
      
      if (attempt > maxRetries) {
        logger.error(
          `[safeFetchWrapper] Max retries (${maxRetries}) reached for ${identifier}. Operation failed.`
        );
        throw new Error(
          `Operation '${identifier}' failed after ${maxRetries} retries: ${error.message}`
        );
      }

      // Calculate delay with exponential backoff and jitter
      const jitter = Math.random() * currentDelay * 0.2; // +/- 10% jitter
      const waitTime = currentDelay + (Math.random() < 0.5 ? -jitter : jitter);

      logger.info(
        `[safeFetchWrapper] Retrying ${identifier} in ${(waitTime / 1000).toFixed(2)}s... (Attempt ${attempt + 1})`
      );
      await delay(waitTime);

      // Increase delay for the next potential retry
      currentDelay *= 2;
    }
  }
  
  throw new Error(`Operation '${identifier}' failed unexpectedly after all retries.`);
}

export default {
  safeFetchWrapper,
  delay,
};
