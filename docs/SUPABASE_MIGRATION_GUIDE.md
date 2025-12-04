# Supabase Migration Guide

## Overview

This guide explains how to migrate your local consciousness and memory data from the `.memory/` directory to Supabase for cloud storage.

## Prerequisites

### 1. Supabase Project Setup

You need a Supabase project. If you don't have one:

1. Go to https://supabase.com
2. Create a new project (free tier available)
3. Note your project URL and API keys

### 2. Environment Configuration

Add these variables to your `.env` file:

```bash
# Enable Supabase
USE_SUPABASE=true

# Supabase Project URL (from project settings)
SUPABASE_URL=https://your-project-id.supabase.co

# Supabase API Keys (from project API settings)
# Use the NEW format (recommended):
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# OR use the legacy format:
# SUPABASE_ANON_KEY=eyJhbGc...
# SUPABASE_SERVICE_KEY=eyJhbGc...
```

### 3. Apply Database Migrations

The Supabase database needs the correct schema. Apply migrations:

```bash
# Option A: If using Supabase CLI locally
npm run supabase:migrate

# Option B: Manually apply migrations via Supabase dashboard
# Go to: Project Settings → SQL Editor
# Run each migration file from src/infrastructure/supabase/migrations/ in order:
# 1. 001_initial_schema.sql
# 2. 002_add_indexes.sql  
# 3. 003_rls_policies.sql
# 4. 004_add_vector_search.sql
```

## Migration Process

### Step 1: Dry Run (Preview)

First, run a dry run to see what will be migrated:

```bash
npm run migrate:supabase:dry-run
```

This will show you:
- How many consciousness states will be migrated
- Which files will be processed
- Any potential issues

### Step 2: Actual Migration

Once you're ready, run the migration:

```bash
npm run migrate:supabase
```

The script will:
- Check if Supabase is properly configured
- Read consciousness states from `.memory/introspection/`
- Upload them to Supabase
- Skip duplicates (checks by sessionId)
- Show progress and summary

### Step 3: Verify Migration

Check that your data is in Supabase:

```bash
# Test Supabase connection
node --import tsx scripts/test-supabase-connection.ts

# View in Supabase Dashboard
# Go to: Table Editor → consciousness_states
```

## What Gets Migrated

Currently, the migration script handles:

- ✅ **Consciousness States** - All `.json` files from `.memory/introspection/`
- 🔜 **Memories** - Coming soon
- 🔜 **Knowledge Base** - Coming soon

## Connection Methods

The system uses the **JavaScript client library** approach (recommended by Supabase for most use cases).

See the full Supabase documentation:
https://supabase.com/docs/guides/database/connecting-to-postgres

## After Migration

Once your data is in Supabase:

1. **Keep local files as backup** - Don't delete `.memory/` yet
2. **Set `USE_SUPABASE=true`** - System will read from Supabase going forward
3. **Test thoroughly** - Verify consciousness system works with Supabase
4. **Archive local files** - After confirming everything works, optionally archive `.memory/`

## Troubleshooting

### "Supabase is not configured" Error

Check that you have:
- `SUPABASE_URL` set in `.env`
- `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY` set in `.env`
- `USE_SUPABASE=true` in `.env`

### "Failed to save consciousness state" Error

Check that:
- Database migrations have been applied
- Your API key has the correct permissions
- The consciousness_states table exists

### Connection Timeout

- Check your internet connection
- Verify the SUPABASE_URL is correct
- Try using the service role key if anon key fails

## Support

For more information:
- [Supabase Documentation](https://supabase.com/docs)
- [Project Status](../SUPABASE_INTEGRATION_STATUS.md)
- [GitHub Issues](https://github.com/StableExo/Copilot-Consciousness/issues)
