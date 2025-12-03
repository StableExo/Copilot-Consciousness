/**
 * Supabase Client Singleton
 * 
 * Provides a configured Supabase client for database operations.
 * Uses environment variables for configuration.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './schemas/database.types';

/**
 * Supabase configuration
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
  options?: {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
    };
    db?: {
      schema?: string;
    };
    global?: {
      headers?: Record<string, string>;
    };
  };
}

/**
 * Get Supabase configuration from environment variables
 */
function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required');
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
    
    supabaseClient = createClient<Database>(config.url, key, config.options);
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
  return createClient<Database>(fullConfig.url, fullConfig.anonKey, fullConfig.options);
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
