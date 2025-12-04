/**
 * Enhanced Supabase Client with Best Practices
 * 
 * Implements error handling, retries, connection management, and performance optimization
 * based on Supabase official best practices.
 * 
 * Connection method: JavaScript client library with connection pooling
 * See: https://supabase.com/docs/guides/database/connecting-to-postgres
 */

import { createClient, SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from './schemas/database.types';

/**
 * Supabase configuration with advanced options
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
  options?: SupabaseClientOptions<'public'>;
}

/**
 * Error handling utilities
 */
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any,
    public hint?: string
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  retryableErrors: ['PGRST301', 'NETWORK_ERROR', '520', '503', '504'],
};

/**
 * Get Supabase configuration from environment variables
 * Supports both new (SUPABASE_PUBLISHABLE_KEY) and legacy (SUPABASE_ANON_KEY) key formats
 */
function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL;
  // Support both new and legacy key formats
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!anonKey) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY environment variable is required');
  }

  return {
    url,
    anonKey,
    serviceKey,
    options: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce', // More secure PKCE flow
      },
      db: {
        schema: 'public',
      },
      realtime: {
        timeout: 10000, // 10 seconds
        heartbeatIntervalMs: 30000, // 30 seconds
      },
    },
  };
}

/**
 * Enhanced Supabase client wrapper with error handling and retries
 */
export class EnhancedSupabaseClient {
  private client: SupabaseClient<Database>;
  private retryConfig: RetryConfig;

  constructor(useServiceRole: boolean = false, retryConfig?: Partial<RetryConfig>) {
    const config = getSupabaseConfig();
    const key = useServiceRole && config.serviceKey ? config.serviceKey : config.anonKey;

    // Type cast to handle complex Supabase generic type inference
    this.client = createClient<Database>(config.url, key, config.options as any) as SupabaseClient<Database>;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Get the underlying Supabase client
   */
  getClient(): SupabaseClient<Database> {
    return this.client;
  }

  /**
   * Execute a query with automatic retry logic
   */
  async withRetry<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const { data, error } = await operation();

        if (error) {
          // Check if error is retryable
          const isRetryable = this.isRetryableError(error);

          if (isRetryable && attempt < this.retryConfig.maxRetries) {
            const delay = this.calculateDelay(attempt);
            console.warn(
              `[Supabase] ${operationName} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}). Retrying in ${delay}ms...`,
              error
            );
            await this.sleep(delay);
            lastError = error;
            continue;
          }

          // Non-retryable error or max retries reached
          throw new SupabaseError(
            error.message || `${operationName} failed`,
            error.code,
            error.details,
            error.hint
          );
        }

        return data as T;
      } catch (err) {
        if (err instanceof SupabaseError) {
          throw err;
        }

        // Network or unexpected error
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.warn(
            `[Supabase] ${operationName} threw exception (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}). Retrying in ${delay}ms...`,
            err
          );
          await this.sleep(delay);
          lastError = err;
          continue;
        }

        throw new SupabaseError(
          `${operationName} failed after ${this.retryConfig.maxRetries + 1} attempts`,
          'MAX_RETRIES_EXCEEDED',
          lastError
        );
      }
    }

    throw new SupabaseError(
      `${operationName} failed after ${this.retryConfig.maxRetries + 1} attempts`,
      'MAX_RETRIES_EXCEEDED',
      lastError
    );
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    // Check error code
    if (error.code && this.retryConfig.retryableErrors.includes(error.code)) {
      return true;
    }

    // Check HTTP status
    if (error.status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504, 520];
      if (retryableStatuses.includes(error.status)) {
        return true;
      }
    }

    // Check error message for network issues
    const networkErrors = ['network', 'timeout', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
    if (error.message) {
      const message = error.message.toLowerCase();
      if (networkErrors.some((pattern) => message.includes(pattern))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
    return Math.min(delay + jitter, this.retryConfig.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check - verify connection to Supabase
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client.from('consciousness_states').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get connection statistics (if available)
   */
  async getConnectionStats(): Promise<{
    activeConnections: number;
    maxConnections: number;
    utilization: number;
  } | null> {
    try {
      // Query pg_stat_activity for connection stats
      const { data, error } = await this.client.rpc('get_connection_stats');

      if (error || !data) {
        return null;
      }

      return data as any;
    } catch {
      return null;
    }
  }
}

/**
 * Singleton instances
 */
let enhancedClient: EnhancedSupabaseClient | null = null;
let enhancedServiceClient: EnhancedSupabaseClient | null = null;

/**
 * Get or create the enhanced Supabase client
 */
export function getSupabaseClient(useServiceRole: boolean = false): SupabaseClient<Database> {
  if (useServiceRole) {
    if (!enhancedServiceClient) {
      enhancedServiceClient = new EnhancedSupabaseClient(true);
    }
    return enhancedServiceClient.getClient();
  }

  if (!enhancedClient) {
    enhancedClient = new EnhancedSupabaseClient(false);
  }
  return enhancedClient.getClient();
}

/**
 * Get the enhanced client wrapper with retry capabilities
 */
export function getEnhancedSupabaseClient(
  useServiceRole: boolean = false
): EnhancedSupabaseClient {
  if (useServiceRole) {
    if (!enhancedServiceClient) {
      enhancedServiceClient = new EnhancedSupabaseClient(true);
    }
    return enhancedServiceClient;
  }

  if (!enhancedClient) {
    enhancedClient = new EnhancedSupabaseClient(false);
  }
  return enhancedClient;
}

/**
 * Create a new Supabase client (for testing or specific use cases)
 */
export function createSupabaseClient(config?: Partial<SupabaseConfig>): SupabaseClient<Database> {
  const fullConfig = { ...getSupabaseConfig(), ...config };
  // Type cast to handle complex Supabase generic type inference
  return createClient<Database>(fullConfig.url, fullConfig.anonKey, fullConfig.options as any) as SupabaseClient<Database>;
}

/**
 * Reset singleton clients (useful for testing)
 */
export function resetSupabaseClient(): void {
  enhancedClient = null;
  enhancedServiceClient = null;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Supabase should be used
 */
export function shouldUseSupabase(): boolean {
  return process.env.USE_SUPABASE === 'true' && isSupabaseConfigured();
}

/**
 * Perform health check on Supabase connection
 */
export async function checkSupabaseHealth(): Promise<boolean> {
  if (!shouldUseSupabase()) {
    return false;
  }

  const client = getEnhancedSupabaseClient(true);
  return await client.healthCheck();
}

// Export convenience instance
export const supabase = shouldUseSupabase() ? getSupabaseClient() : null;
export const supabaseEnhanced = shouldUseSupabase() ? getEnhancedSupabaseClient() : null;
