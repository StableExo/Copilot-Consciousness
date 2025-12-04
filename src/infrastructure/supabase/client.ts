/**
 * Supabase Client Singleton
 * 
 * Provides a configured Supabase client for database operations.
 * Uses environment variables for configuration.
 * 
 * Connection method: JavaScript client library (recommended for client-side apps)
 * See: https://supabase.com/docs/guides/database/connecting-to-postgres
 */

import { createClient, SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from './schemas/database.types';

/**
 * Supabase configuration
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
  options?: SupabaseClientOptions<'public'>;
}

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
      },
      db: {
        schema: 'public',
      },
    },
  };
}

/**
 * Singleton Supabase client instance
 */
let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Get or create the Supabase client
 * 
 * @param useServiceRole - If true, use service role key (for backend operations)
 * @returns Supabase client instance
 */
export function getSupabaseClient(useServiceRole: boolean = false): SupabaseClient<Database> {
  if (!supabaseClient) {
    const config = getSupabaseConfig();
    const key = useServiceRole && config.serviceKey ? config.serviceKey : config.anonKey;
    
    // Type cast to handle complex Supabase generic type inference
    supabaseClient = createClient<Database>(config.url, key, config.options as any) as SupabaseClient<Database>;
  }

  return supabaseClient;
}

/**
 * Create a new Supabase client (for testing or specific use cases)
 * 
 * @param config - Custom configuration
 * @returns New Supabase client instance
 */
export function createSupabaseClient(config?: Partial<SupabaseConfig>): SupabaseClient<Database> {
  const fullConfig = { ...getSupabaseConfig(), ...config };
  // Type cast to handle complex Supabase generic type inference
  return createClient<Database>(fullConfig.url, fullConfig.anonKey, fullConfig.options as any) as SupabaseClient<Database>;
}

/**
 * Reset the singleton client (useful for testing)
 */
export function resetSupabaseClient(): void {
  supabaseClient = null;
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
 * Check if Supabase should be used (based on environment variable)
 */
export function shouldUseSupabase(): boolean {
  return process.env.USE_SUPABASE === 'true' && isSupabaseConfigured();
}

// Export a default client instance for convenience
export const supabase = shouldUseSupabase() ? getSupabaseClient() : null;
