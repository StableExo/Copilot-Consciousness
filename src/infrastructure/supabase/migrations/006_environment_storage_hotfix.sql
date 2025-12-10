-- Hotfix for 006_environment_storage.sql
-- This adds missing columns to existing environment_configs and environment_secrets tables
-- Run this BEFORE running the full 006_environment_storage.sql migration
-- This script is idempotent and can be run multiple times safely

-- Add missing columns to environment_configs
DO $$ 
BEGIN
  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_configs' AND column_name = 'category'
  ) THEN
    ALTER TABLE environment_configs ADD COLUMN category TEXT;
    RAISE NOTICE 'Added category column to environment_configs';
  ELSE
    RAISE NOTICE 'category column already exists in environment_configs';
  END IF;
  
  -- Add is_required column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_configs' AND column_name = 'is_required'
  ) THEN
    ALTER TABLE environment_configs ADD COLUMN is_required BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_required column to environment_configs';
  ELSE
    RAISE NOTICE 'is_required column already exists in environment_configs';
  END IF;
  
  -- Add value_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_configs' AND column_name = 'value_type'
  ) THEN
    ALTER TABLE environment_configs ADD COLUMN value_type TEXT DEFAULT 'string';
    RAISE NOTICE 'Added value_type column to environment_configs';
  ELSE
    RAISE NOTICE 'value_type column already exists in environment_configs';
  END IF;
  
  -- Add validation_regex column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_configs' AND column_name = 'validation_regex'
  ) THEN
    ALTER TABLE environment_configs ADD COLUMN validation_regex TEXT;
    RAISE NOTICE 'Added validation_regex column to environment_configs';
  ELSE
    RAISE NOTICE 'validation_regex column already exists in environment_configs';
  END IF;
END $$;

-- Add missing columns to environment_secrets
DO $$ 
BEGIN
  -- Add category column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_secrets' AND column_name = 'category'
  ) THEN
    ALTER TABLE environment_secrets ADD COLUMN category TEXT;
    RAISE NOTICE 'Added category column to environment_secrets';
  ELSE
    RAISE NOTICE 'category column already exists in environment_secrets';
  END IF;
  
  -- Add encryption_key_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_secrets' AND column_name = 'encryption_key_id'
  ) THEN
    ALTER TABLE environment_secrets ADD COLUMN encryption_key_id TEXT;
    RAISE NOTICE 'Added encryption_key_id column to environment_secrets';
  ELSE
    RAISE NOTICE 'encryption_key_id column already exists in environment_secrets';
  END IF;
  
  -- Add allowed_services column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_secrets' AND column_name = 'allowed_services'
  ) THEN
    ALTER TABLE environment_secrets ADD COLUMN allowed_services TEXT[] DEFAULT '{}';
    RAISE NOTICE 'Added allowed_services column to environment_secrets';
  ELSE
    RAISE NOTICE 'allowed_services column already exists in environment_secrets';
  END IF;
  
  -- Add last_accessed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_secrets' AND column_name = 'last_accessed_at'
  ) THEN
    ALTER TABLE environment_secrets ADD COLUMN last_accessed_at TIMESTAMPTZ;
    RAISE NOTICE 'Added last_accessed_at column to environment_secrets';
  ELSE
    RAISE NOTICE 'last_accessed_at column already exists in environment_secrets';
  END IF;
  
  -- Add access_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'environment_secrets' AND column_name = 'access_count'
  ) THEN
    ALTER TABLE environment_secrets ADD COLUMN access_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added access_count column to environment_secrets';
  ELSE
    RAISE NOTICE 'access_count column already exists in environment_secrets';
  END IF;
END $$;

-- Now create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_environment_configs_category ON environment_configs(category);
CREATE INDEX IF NOT EXISTS idx_environment_configs_is_required ON environment_configs(is_required);
CREATE INDEX IF NOT EXISTS idx_environment_secrets_category ON environment_secrets(category);
CREATE INDEX IF NOT EXISTS idx_environment_secrets_config_id ON environment_secrets(config_id);

-- Success message
SELECT 'Hotfix applied successfully! All missing columns and indexes have been added.' AS status;
