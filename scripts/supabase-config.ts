/**
 * Supabase Configuration Helper
 * Supports both legacy (anon/service_role) and new (publishable/secret) API key formats
 */

import dotenv from 'dotenv';

dotenv.config();

export interface SupabaseConfig {
  url: string;
  key: string;
  keyType: 'publishable' | 'anon' | 'secret' | 'service_role';
}

/**
 * Get Supabase configuration with automatic key format detection
 * Prioritizes new publishable/secret key format, falls back to legacy anon/service_role
 */
export function getSupabaseConfig(useSecret = false): SupabaseConfig {
  const url = process.env.SUPABASE_URL;
  
  if (!url) {
    throw new Error('SUPABASE_URL environment variable is not set');
  }

  // Try new key format first
  if (useSecret) {
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (secretKey) {
      return { url, key: secretKey, keyType: 'secret' };
    }
    
    // Fall back to legacy service_role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;
    if (serviceRoleKey) {
      return { url, key: serviceRoleKey, keyType: 'service_role' };
    }
    
    throw new Error('Neither SUPABASE_SECRET_KEY nor SUPABASE_SERVICE_KEY is set');
  } else {
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (publishableKey) {
      return { url, key: publishableKey, keyType: 'publishable' };
    }
    
    // Fall back to legacy anon key
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (anonKey) {
      return { url, key: anonKey, keyType: 'anon' };
    }
    
    throw new Error('Neither SUPABASE_PUBLISHABLE_KEY nor SUPABASE_ANON_KEY is set');
  }
}

/**
 * Get Supabase MCP URL from environment
 */
export function getSupabaseMcpUrl(): string {
  const mcpUrl = process.env.SUPABASE_MCP_URL;
  
  if (!mcpUrl) {
    throw new Error('SUPABASE_MCP_URL environment variable is not set');
  }
  
  return mcpUrl;
}
