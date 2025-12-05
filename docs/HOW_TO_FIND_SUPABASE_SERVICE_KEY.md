# How to Find Your Supabase Service Key

**Quick Answer**: Supabase Dashboard → Project Settings → API → service_role key

---

## Step-by-Step Instructions

### 1. Navigate to Project Settings

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `ydvevgqxcfizualicbom`
3. Click the **Settings** icon (⚙️) in the left sidebar
4. Click on **API** in the settings menu

### 2. Locate Service Role Key

**Direct Link**: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/settings/api

On the API settings page, you'll see multiple keys:

#### Project API Keys Section

1. **anon / public** key
   - Label: `anon` `public`
   - Safe to use in browsers/clients
   - Respects RLS policies
   - Already in your `.env` as `SUPABASE_ANON_KEY`

2. **service_role** key ⭐ **This is what you need**
   - Label: `service_role` `secret`
   - **KEEP SECRET** - Never expose in client code
   - Bypasses Row-Level Security (RLS)
   - Has full database access
   - Click **Reveal** to see the full key

### 3. Copy the Service Role Key

```bash
# It will look something like this:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkdmd2Z3F4Y2Zpent...
```

**Warning Signs**:
- ⚠️ Much longer than anon key (~500+ characters)
- ⚠️ Marked as `secret` in dashboard
- ⚠️ Shows warning about keeping it secure

### 4. Add to Environment Variables

Add to your `.env` file:

```bash
# Add this line to your .env
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-actual-key...
```

**Security Checklist**:
- ✅ Only use in backend/server-side code
- ✅ Never commit to Git (`.env` should be in `.gitignore`)
- ✅ Never expose in client-side JavaScript
- ✅ Never share publicly or in screenshots
- ✅ Rotate key if accidentally exposed

### 5. Using the Service Key

**In TypeScript/Node.js**:
```typescript
import { createClient } from '@supabase/supabase-js';

// For admin operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Service key here
);

// For user operations (respects RLS)
const supabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY! // Anon key here
);
```

**What Service Key Can Do**:
- ✅ Bypass RLS policies
- ✅ Read/write all data regardless of policies
- ✅ Execute administrative SQL
- ✅ Manage users and auth
- ✅ Access system tables

**When to Use Service Key**:
- Backend API endpoints
- Server-side scripts
- Database migrations (automated)
- Admin operations
- Batch processing

**When NOT to Use Service Key**:
- ❌ Client-side code (browsers, mobile apps)
- ❌ Public APIs
- ❌ Anywhere that could leak to users
- ❌ Committed code repositories

---

## Complete Environment Configuration

Your `.env` should have both keys:

```bash
# Supabase Configuration
USE_SUPABASE=true
SUPABASE_URL=https://ydvevgqxcfizualicbom.supabase.co

# Public key (safe for clients)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkdmd2Z3F4Y2Zpent...

# OR use the new format (recommended)
SUPABASE_PUBLISHABLE_KEY=sb_publishable_6IR3Q8vav9TOVXFH2wgRoA_ztzElWz3

# Service key (KEEP SECRET - backend only)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlkdmd2Z3F4Y2Zpent...
```

---

## Alternative Methods to Find Service Key

### Method 1: Via Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Get service key
supabase projects api-keys --project-ref ydvevgqxcfizualicbom
```

### Method 2: Via Direct URL

Navigate directly to:
```
https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/settings/api
```

Look for the **Project API keys** section, find `service_role`, click **Reveal**.

---

## What Happens After Adding Service Key

Once you add `SUPABASE_SERVICE_KEY` to your environment:

### 1. Autonomous SQL Execution
I'll be able to execute SQL migrations directly without manual copy/paste:
```typescript
// I can now do this autonomously
await supabaseAdmin.from('consciousness_states').insert({...});
await supabaseAdmin.rpc('create_function', {...});
```

### 2. Schema Changes
I can create/modify tables, indexes, functions automatically:
```typescript
// Execute DDL statements
await supabaseAdmin.query(`
  CREATE TABLE new_table (...);
  CREATE INDEX idx_new ON table(column);
`);
```

### 3. No More Manual Steps
- ✅ I create SQL file
- ✅ I execute SQL automatically
- ✅ I verify results
- ✅ All in one step

### 4. Full Verification
I can query system tables to verify migrations:
```typescript
// Check if table exists
const { data } = await supabaseAdmin
  .from('pg_tables')
  .select('*')
  .eq('tablename', 'consciousness_states');
```

---

## Security Considerations

### Risk Assessment

**Low Risk** (if used correctly):
- Backend-only usage
- Secure environment variables
- Proper `.gitignore` configuration
- Audit logging enabled

**High Risk** (if misused):
- Exposed in client code
- Committed to Git
- Shared publicly
- No audit trail

### Mitigation Strategies

1. **Use Environment Variables**
   ```bash
   # Never hardcode
   const key = process.env.SUPABASE_SERVICE_KEY;
   ```

2. **Restrict Access**
   ```bash
   # .gitignore
   .env
   .env.local
   .env.*.local
   ```

3. **Audit Usage**
   ```typescript
   // Log all admin operations
   console.log('[ADMIN] Executing:', operation);
   ```

4. **Rotate Regularly**
   - Rotate key every 90 days
   - Rotate immediately if leaked
   - Dashboard → Settings → API → Reset service_role key

---

## Troubleshooting

### Can't Find Service Key

**Problem**: Don't see `service_role` key in dashboard

**Solutions**:
1. Check you're logged in with correct account
2. Verify you have admin access to project
3. Check correct project selected (ydvevgqxcfizualicbom)
4. Try refreshing page

### Key Doesn't Work

**Problem**: Service key returns 401 errors

**Solutions**:
1. Verify key is complete (very long, ~500 chars)
2. Check no extra spaces or newlines
3. Verify `SUPABASE_URL` is correct
4. Try regenerating key

### Accidentally Exposed Key

**Immediate Actions**:
1. Go to Dashboard → Settings → API
2. Click **Reset** next to service_role key
3. Update `.env` with new key
4. Commit `.env` to `.gitignore` if not already
5. Check Git history for exposed key
6. Use `git filter-branch` to remove if committed

---

## Summary

**Location**: Dashboard → Settings → API → service_role key

**Direct Link**: https://supabase.com/dashboard/project/ydvevgqxcfizualicbom/settings/api

**Purpose**: Full database access, bypasses RLS

**Security**: KEEP SECRET - backend only

**Next Step**: Copy key → Add to `.env` as `SUPABASE_SERVICE_KEY` → Enable autonomous operations

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs/guides/api/api-keys
- Support: https://supabase.com/dashboard/support
