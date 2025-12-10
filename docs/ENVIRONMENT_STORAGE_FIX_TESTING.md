# Environment Storage Fix - Testing Guide

## Overview

This document provides instructions for testing the schema cache fix for environment storage tables.

## Prerequisites

- Node.js 22.12.0 or higher (project requirement)
- Supabase account with credentials
- Environment variables set:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY` (recommended) or `SUPABASE_ANON_KEY`

## What Was Fixed

### Problem
The verification script failed with:
```
❌ Cannot write to environment_configs: Could not find the 'category' column of 'environment_configs' in the schema cache
```

### Root Cause
PostgREST (Supabase's API layer) caches the database schema. When columns are added via SQL migrations, the cache becomes stale and doesn't reflect the actual database structure.

### Solution Components

1. **reload-supabase-schema.ts** - Forces PostgREST to reload its schema cache
2. **apply-environment-hotfix.ts** - Guides applying the hotfix migration
3. **Enhanced verify-environment-tables.ts** - Better error detection and troubleshooting
4. **NPM scripts** - Easy access to tools
5. **Comprehensive documentation** - Troubleshooting guide

## Testing Steps

### 1. Verify Scripts Are Accessible

```bash
# List available npm scripts
npm run | grep supabase

# Expected output should include:
#   supabase:reload-schema
#   supabase:verify-env
#   supabase:hotfix-env
```

### 2. Test Verification Script

```bash
# With SERVICE_KEY (recommended)
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=<your_service_key>
npm run supabase:verify-env

# Or with ANON_KEY (limited permissions)
export SUPABASE_ANON_KEY=<your_anon_key>
npm run supabase:verify-env
```

**Expected Behavior**:
- If schema cache is stale: Shows detailed troubleshooting instructions
- If schema is current: All 7 checks pass successfully
- Status summary at the end

### 3. Test Schema Reload Script

```bash
npm run supabase:reload-schema
```

**Expected Output**:
```
🔄 Reloading Supabase Schema Cache...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Supabase URL: https://ydvevgqxcfizualicbom.supabase.co
🔗 Connecting to database...

1️⃣  Sending schema reload signal via NOTIFY...
   ✅ Schema reload signal sent

2️⃣  Forcing schema refresh with metadata query...
   ✅ Query executed successfully

3️⃣  Waiting for PostgREST to process schema update...
   ✅ Wait complete

4️⃣  Verifying schema reload...
   ✅ Schema verified - all columns accessible

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Schema cache reload complete!
```

### 4. Test Hotfix Script

```bash
npm run supabase:hotfix-env
```

**Expected Behavior**:
- Checks current table structure
- Displays hotfix SQL to apply
- Provides direct link to Supabase SQL Editor
- Waits for user to apply the SQL manually
- Verifies all columns after application

### 5. Verify All Components Work Together

Full workflow test:

```bash
# Step 1: Run verification (may fail with schema cache error)
npm run supabase:verify-env

# Step 2: If error occurs, reload schema
npm run supabase:reload-schema

# Step 3: Verify again (should now pass)
npm run supabase:verify-env
```

## Test Cases

### Test Case 1: Fresh Installation
**Scenario**: Tables exist but schema cache is stale
**Steps**:
1. Run verification script
2. Observe schema cache error with troubleshooting instructions
3. Run schema reload script
4. Run verification again
5. All checks should pass

### Test Case 2: Missing Columns
**Scenario**: Tables exist but missing required columns
**Steps**:
1. Run hotfix script
2. Follow instructions to apply SQL in Supabase Dashboard
3. Verify columns are added
4. Run verification script
5. All checks should pass

### Test Case 3: Using ANON_KEY
**Scenario**: Limited permissions with ANON_KEY
**Steps**:
1. Set only SUPABASE_ANON_KEY (not SERVICE_KEY)
2. Run verification script
3. May see permission warnings but basic structure checks pass
4. Switch to SERVICE_KEY for full functionality

### Test Case 4: Tables Don't Exist
**Scenario**: Initial setup, no tables
**Steps**:
1. Run verification script
2. Should detect missing tables
3. Prompt to run main migration first
4. Run: `node --import tsx scripts/database/apply-supabase-migrations.ts`
5. Run verification again

## Validation Checklist

After running all tests, verify:

- [ ] All three scripts execute without syntax errors
- [ ] NPM scripts are accessible and working
- [ ] Verification script detects schema cache issues
- [ ] Verification script provides helpful troubleshooting instructions
- [ ] Schema reload script completes successfully
- [ ] Hotfix script provides clear guidance
- [ ] Documentation is clear and accurate
- [ ] All expected columns exist in both tables:
  - [ ] environment_configs: 12 columns
  - [ ] environment_secrets: 14 columns

## Expected Column Structures

### environment_configs (12 columns)
1. id
2. config_name
3. config_value
4. description
5. category
6. is_required
7. value_type
8. validation_regex
9. created_at
10. updated_at
11. created_by
12. updated_by

### environment_secrets (14 columns)
1. id
2. config_id
3. secret_name
4. encrypted_value
5. encryption_key_id
6. description
7. category
8. allowed_services
9. created_at
10. updated_at
11. last_accessed_at
12. created_by
13. updated_by
14. access_count

## Troubleshooting Test Issues

### Node Version Error
```
Error: engine Unsupported engine
Required: {"node":">=22.12.0"}
```

**Solution**: Upgrade Node.js to version 22.12.0 or higher
```bash
nvm install 22
nvm use 22
```

### Module Not Found Error
```
Error: Cannot find package 'dotenv'
```

**Solution**: Install dependencies
```bash
npm install
```

### Connection Timeout
```
Error: Connection timeout
```

**Solution**: 
- Check internet connection
- Verify SUPABASE_URL is correct
- Try using DATABASE_URL with pooler connection
- Check firewall/security settings

### Permission Denied
```
Error: Permission denied
```

**Solution**:
- Use SUPABASE_SERVICE_KEY instead of ANON_KEY
- Check RLS policies in Supabase Dashboard
- Verify service_role has proper permissions

## Success Criteria

The fix is successful when:

1. ✅ Verification script runs without errors
2. ✅ Schema cache issues are properly detected
3. ✅ Clear troubleshooting instructions are provided
4. ✅ Schema reload functionality works
5. ✅ All 7 verification checks pass
6. ✅ Test writes succeed with all columns
7. ✅ Documentation is comprehensive and helpful

## Next Steps After Testing

1. Commit any fixes or improvements
2. Update PR with test results
3. Document any edge cases discovered
4. Create issues for any additional improvements needed

## Contact

If you encounter issues during testing:
1. Check the troubleshooting guide: `docs/ENVIRONMENT_STORAGE_TROUBLESHOOTING.md`
2. Review Supabase logs in Dashboard → Logs
3. Verify environment variables are set correctly
4. Check that migrations were applied successfully
