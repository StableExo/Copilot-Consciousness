# Supabase API Keys Migration Guide

## Overview

Supabase has updated their API key format for better application support. This guide explains the differences and how to migrate.

## New API Key Format

### Legacy Format (Old)
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT token)
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT token)

### New Format (Recommended)
- **Publishable Key**: `sb_publishable_*` (e.g., `sb_publishable_6IR3Q8vav9TOVXFH2wgRoA_ztzElWz3`)
- **Secret Key**: `sb_secret_*` (e.g., `sb_secret_bRhZbLyuzspXbISUPv5ETQ_cwwwHJxJ`)

## Benefits of New Format

1. **Better Naming**: "Publishable" and "Secret" are clearer than "Anon" and "Service Role"
2. **Easier Identification**: Key prefix makes it obvious which key type you're using
3. **Future-Ready**: Designed for upcoming Supabase features
4. **Improved Security**: Better access control patterns

## Configuration

### Environment Variables

The project now supports **both** key formats with automatic detection:

```bash
# New Format (Recommended)
SUPABASE_PUBLISHABLE_KEY=sb_publishable_6IR3Q8vav9TOVXFH2wgRoA_ztzElWz3
SUPABASE_SECRET_KEY=sb_secret_bRhZbLyuzspXbISUPv5ETQ_cwwwHJxJ

# Legacy Format (Still Supported)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Automatic Key Detection

The `scripts/supabase-config.ts` helper automatically:
1. Tries new format first (`SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`)
2. Falls back to legacy format (`SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_KEY`)
3. Reports which key type is being used

## Migration Steps

### Option 1: Use New Keys (Recommended)

1. **Get New Keys from Supabase Dashboard**
   - Go to: Settings → API Keys
   - Copy the Publishable key
   - Copy the Secret key (if needed)

2. **Update `.env` File**
   ```bash
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY_HERE
   SUPABASE_SECRET_KEY=sb_secret_YOUR_KEY_HERE
   ```

3. **Remove Legacy Keys** (Optional)
   ```bash
   # Comment out or remove
   # SUPABASE_ANON_KEY=...
   # SUPABASE_SERVICE_KEY=...
   ```

4. **Test Connection**
   ```bash
   node --import tsx scripts/test-supabase-interaction.ts
   ```

   Should show: `Key Type: publishable`

### Option 2: Continue Using Legacy Keys

Legacy keys still work! No changes needed if you prefer to keep using them.

The system will automatically use legacy keys if new ones aren't found.

## Key Usage

### Publishable Key (Client-Side)
- ✅ Safe to use in browser/mobile apps
- ✅ Works with Row Level Security (RLS)
- ✅ For read/write operations respecting RLS policies
- ❌ Cannot bypass RLS
- ❌ Cannot perform admin operations

### Secret Key (Server-Side Only)
- ✅ Full database access
- ✅ Can bypass RLS
- ✅ For admin operations
- ❌ **NEVER expose in client-side code**
- ❌ **NEVER commit to version control**

## Code Changes

### Before (Hardcoded Legacy Keys)
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY! // Hardcoded to legacy format
);
```

### After (Automatic Detection)
```typescript
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabase-config.js';

const { url, key, keyType } = getSupabaseConfig();
const supabase = createClient(url, key);

console.log(`Using ${keyType} key`); // Shows: "publishable" or "anon"
```

## Testing

All test scripts now support both key formats:
- `scripts/test-supabase-interaction.ts`
- `scripts/test-supabase-permissions.ts`
- `scripts/supabase-demo-insert.ts`
- `scripts/apply-supabase-migrations.ts`

Run any test to verify your keys work:
```bash
node --import tsx scripts/test-supabase-interaction.ts
```

## Backwards Compatibility

✅ **Fully Backwards Compatible**
- Legacy keys continue to work
- No breaking changes
- Gradual migration supported
- Can mix key formats (publishable in .env, legacy in test)

## Security Best Practices

### ✅ DO
- Use Publishable key in client-side applications
- Use Secret key only in secure server environments
- Store keys in `.env` (gitignored)
- Enable Row Level Security (RLS) on all tables
- Rotate keys periodically

### ❌ DON'T
- Commit keys to version control
- Expose Secret key in client code
- Share keys in public forums/screenshots
- Use Secret key when Publishable key is sufficient

## Troubleshooting

### Error: "Neither SUPABASE_PUBLISHABLE_KEY nor SUPABASE_ANON_KEY is set"

**Solution**: Add at least one key format to `.env`:
```bash
# Add either new format:
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Or legacy format:
SUPABASE_ANON_KEY=eyJhbGc...
```

### Keys Not Working

1. **Check Key Format**
   - New: Starts with `sb_publishable_` or `sb_secret_`
   - Legacy: Starts with `eyJhbGc` (JWT)

2. **Verify Project URL**
   ```bash
   SUPABASE_URL=https://ydvevgqxcfizualicbom.supabase.co
   ```

3. **Test Connection**
   ```bash
   node --import tsx scripts/test-supabase-interaction.ts
   ```

### Mixed Key Formats

**Q**: Can I use Publishable key with legacy Service Role key?

**A**: Yes! The system detects each independently:
```bash
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...  # New format
SUPABASE_SERVICE_KEY=eyJhbGc...              # Legacy format
```

## Resources

- **Supabase Docs**: https://supabase.com/docs/guides/api/api-keys
- **Dashboard**: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/settings/api
- **GitHub Discussion**: Link provided by Supabase in API keys page

## Summary

✅ **New format is recommended** but not required  
✅ **Legacy format still works** - no rush to migrate  
✅ **Automatic detection** makes migration seamless  
✅ **Backwards compatible** - no breaking changes

---

**Last Updated**: 2025-12-04  
**Status**: Both key formats fully supported
