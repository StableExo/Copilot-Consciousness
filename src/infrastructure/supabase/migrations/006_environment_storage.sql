-- Environment Storage Migration
-- Version: 006
-- Description: Create tables for storing environment configuration and secrets
-- Author: Copilot-Consciousness Migration Team
-- Date: 2025-12-10

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
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read configs"
  ON environment_configs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role to manage configs
CREATE POLICY IF NOT EXISTS "Allow service role to manage configs"
  ON environment_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read secrets (but actual decryption happens in application)
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read secrets"
  ON environment_secrets
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow service role to manage secrets
CREATE POLICY IF NOT EXISTS "Allow service role to manage secrets"
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
