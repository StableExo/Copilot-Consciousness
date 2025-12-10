-- Environment Storage Migration
-- Version: 006
-- Description: Create tables for storing environment configuration and secrets
-- Author: Copilot-Consciousness Migration Team
-- Date: 2025-12-10

-- ============================================================================
-- BACKUP AND RENAME OLD TABLES (IF THEY EXIST WITH DIFFERENT SCHEMA)
-- ============================================================================

-- Check if old environment_configs table exists with different schema (config_data column)
-- If so, rename it to preserve data before creating new schema
DO $$
BEGIN
  -- Check if old table exists with config_data column (old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'environment_configs'
      AND column_name = 'config_data'
  ) THEN
    -- Rename old table to preserve data
    ALTER TABLE IF EXISTS environment_configs RENAME TO environment_configs_old_backup;
    RAISE NOTICE 'Renamed old environment_configs table to environment_configs_old_backup';
  END IF;
  
  -- Check if old environment_secrets table exists with different schema
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'environment_secrets'
      AND column_name = 'secret_key_id'  -- Old column name
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'environment_secrets'
      AND column_name = 'encryption_key_id'  -- New column name
  ) THEN
    -- Rename old table to preserve data
    ALTER TABLE IF EXISTS environment_secrets RENAME TO environment_secrets_old_backup;
    RAISE NOTICE 'Renamed old environment_secrets table to environment_secrets_old_backup';
  END IF;
END $$;

-- ============================================================================
-- ENVIRONMENT CONFIGURATION TABLES
-- ============================================================================

-- 1. environment_configs: Store non-sensitive environment configuration
CREATE TABLE IF NOT EXISTS environment_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Configuration identification
  config_name TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  
  -- Metadata
  description TEXT,
  category TEXT, -- 'database', 'api', 'blockchain', 'service', 'feature_flag'
  is_required BOOLEAN DEFAULT false,
  
  -- Validation
  value_type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'json', 'url'
  validation_regex TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Audit trail
  created_by TEXT,
  updated_by TEXT
);

-- Add missing columns to environment_configs (handles tables from incomplete migrations)
DO $$ 
BEGIN
  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_configs' AND column_name = 'category'
  ) THEN
    ALTER TABLE environment_configs ADD COLUMN category TEXT;
  END IF;
  
  -- Add is_required column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_configs' AND column_name = 'is_required'
  ) THEN
    ALTER TABLE environment_configs ADD COLUMN is_required BOOLEAN DEFAULT false;
  END IF;
  
  -- Add value_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_configs' AND column_name = 'value_type'
  ) THEN
    ALTER TABLE environment_configs ADD COLUMN value_type TEXT DEFAULT 'string';
  END IF;
  
  -- Add validation_regex column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_configs' AND column_name = 'validation_regex'
  ) THEN
    ALTER TABLE environment_configs ADD COLUMN validation_regex TEXT;
  END IF;
END $$;

-- 2. environment_secrets: Store encrypted sensitive configuration
CREATE TABLE IF NOT EXISTS environment_secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Configuration reference
  config_id UUID REFERENCES environment_configs(id) ON DELETE CASCADE,
  
  -- Secret identification
  secret_name TEXT NOT NULL UNIQUE,
  
  -- Encrypted value (use Supabase Vault or application-level encryption)
  encrypted_value TEXT NOT NULL,
  encryption_key_id TEXT, -- Reference to encryption key (if using key management)
  
  -- Metadata
  description TEXT,
  category TEXT, -- 'api_key', 'private_key', 'password', 'token', 'credential'
  
  -- Access control
  allowed_services TEXT[] DEFAULT '{}', -- Which services can access this secret
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  
  -- Audit trail
  created_by TEXT,
  updated_by TEXT,
  access_count INTEGER DEFAULT 0
);

-- Add missing columns to environment_secrets (handles tables from incomplete migrations)
DO $$ 
BEGIN
  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_secrets' AND column_name = 'category'
  ) THEN
    ALTER TABLE environment_secrets ADD COLUMN category TEXT;
  END IF;
  
  -- Add encryption_key_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_secrets' AND column_name = 'encryption_key_id'
  ) THEN
    ALTER TABLE environment_secrets ADD COLUMN encryption_key_id TEXT;
  END IF;
  
  -- Add allowed_services column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_secrets' AND column_name = 'allowed_services'
  ) THEN
    ALTER TABLE environment_secrets ADD COLUMN allowed_services TEXT[] DEFAULT '{}';
  END IF;
  
  -- Add last_accessed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_secrets' AND column_name = 'last_accessed_at'
  ) THEN
    ALTER TABLE environment_secrets ADD COLUMN last_accessed_at TIMESTAMPTZ;
  END IF;
  
  -- Add access_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_secrets' AND column_name = 'access_count'
  ) THEN
    ALTER TABLE environment_secrets ADD COLUMN access_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_environment_configs_category ON environment_configs(category);
CREATE INDEX IF NOT EXISTS idx_environment_configs_is_required ON environment_configs(is_required);
CREATE INDEX IF NOT EXISTS idx_environment_secrets_category ON environment_secrets(category);
CREATE INDEX IF NOT EXISTS idx_environment_secrets_config_id ON environment_secrets(config_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE environment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_secrets ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read configs
DROP POLICY IF EXISTS "Allow authenticated users to read configs" ON environment_configs;
CREATE POLICY "Allow authenticated users to read configs"
  ON environment_configs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role to manage configs
DROP POLICY IF EXISTS "Allow service role to manage configs" ON environment_configs;
CREATE POLICY "Allow service role to manage configs"
  ON environment_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read secrets (but actual decryption happens in application)
DROP POLICY IF EXISTS "Allow authenticated users to read secrets" ON environment_secrets;
CREATE POLICY "Allow authenticated users to read secrets"
  ON environment_secrets
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role to manage secrets
DROP POLICY IF EXISTS "Allow service role to manage secrets" ON environment_secrets;
CREATE POLICY "Allow service role to manage secrets"
  ON environment_secrets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_environment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_environment_configs_updated_at ON environment_configs;
CREATE TRIGGER update_environment_configs_updated_at
  BEFORE UPDATE ON environment_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_environment_updated_at();

DROP TRIGGER IF EXISTS update_environment_secrets_updated_at ON environment_secrets;
CREATE TRIGGER update_environment_secrets_updated_at
  BEFORE UPDATE ON environment_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_environment_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE environment_configs IS 'Stores non-sensitive environment configuration values';
COMMENT ON TABLE environment_secrets IS 'Stores encrypted sensitive configuration and secrets';
COMMENT ON COLUMN environment_configs.config_name IS 'Unique name of the configuration variable (e.g., SUPABASE_URL)';
COMMENT ON COLUMN environment_configs.config_value IS 'The configuration value';
COMMENT ON COLUMN environment_secrets.encrypted_value IS 'Encrypted secret value - decrypt in application layer';
COMMENT ON COLUMN environment_secrets.encryption_key_id IS 'Reference to the encryption key used';
