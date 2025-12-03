# Supabase Setup Guide for Copilot-Consciousness

This guide walks you through setting up Supabase for the Copilot-Consciousness project, enabling cloud-based data storage, real-time synchronization, and advanced querying capabilities.

## Prerequisites

- A Supabase account (free tier available at [supabase.com](https://supabase.com))
- Node.js 22.12.0+ installed
- This repository cloned locally

## Step 1: Create a Supabase Project

1. **Sign up / Log in** to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `copilot-consciousness` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free tier is sufficient to start
4. Click **"Create new project"**
5. Wait for project provisioning (~2 minutes)

## Step 2: Get Your API Keys

Once your project is ready:

1. Go to **Settings > API** in the left sidebar
2. Copy the following values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (safe for client-side)
   - **service_role** key (⚠️ KEEP SECRET - server-side only!)

## Step 3: Configure Environment Variables

1. Open your `.env` file (create from `.env.example` if needed):
   ```bash
   cp .env.example .env
   ```

2. Add Supabase configuration:
   ```bash
   # Enable Supabase backend
   USE_SUPABASE=true

   # Your Supabase project URL
   SUPABASE_URL=https://your-project-id.supabase.co

   # Supabase anonymous key (safe for public code)
   SUPABASE_ANON_KEY=your-anon-key-here

   # Supabase service role key (KEEP SECRET!)
   SUPABASE_SERVICE_KEY=your-service-role-key-here

   # Enable real-time subscriptions
   SUPABASE_REALTIME_ENABLED=true
   ```

3. Save the file

## Step 4: Run Database Migrations

Apply the database schema to your Supabase project:

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **"New query"**
3. Copy and paste the contents of each migration file in order:
   - `src/infrastructure/supabase/migrations/001_initial_schema.sql`
   - `src/infrastructure/supabase/migrations/002_add_indexes.sql`
   - `src/infrastructure/supabase/migrations/003_rls_policies.sql`
4. Click **"Run"** for each migration
5. Verify success (you should see "Initial schema migration completed successfully", etc.)

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Apply migrations
supabase db push
```

## Step 5: Verify Installation

1. **Check Tables**: Go to **Table Editor** in Supabase dashboard
   - You should see 9 tables: `consciousness_states`, `thoughts`, `semantic_memories`, `episodic_memories`, `arbitrage_executions`, `market_patterns`, `sessions`, `autonomous_goals`, `learning_events`

2. **Test Connection**: Run the connection test script:
   ```bash
   npm run test:supabase
   ```

## Step 6: Install Node.js Dependencies

Install the Supabase JavaScript client:

```bash
npm install @supabase/supabase-js
```

## Step 7: (Optional) Generate TypeScript Types

For up-to-date TypeScript definitions from your schema:

```bash
npx supabase gen types typescript --project-id your-project-id > src/infrastructure/supabase/schemas/database.types.ts
```

This ensures your types match your actual database schema.

## Step 8: Enable Row Level Security (Optional - Multi-tenant)

If you plan to have multiple users/agents with isolated data:

1. Go to **Authentication > Policies** in Supabase dashboard
2. Review the RLS policies created by migration `003_rls_policies.sql`
3. Adjust policies as needed for your use case

For single-user scenarios, the default policies (authenticated full access) are sufficient.

## Step 9: Test Supabase Integration

Run the test suite to verify everything works:

```bash
# Run all tests
npm test

# Run Supabase-specific tests (once implemented)
npm run test:unit -- supabase
```

## Step 10: Migrate Existing Data (Optional)

If you have existing data in `.memory/` or SQLite, migrate it:

```bash
# Enable migration mode
export MIGRATE_TO_SUPABASE=true

# Run migration script
npm run migrate:supabase
```

This will:
- Parse existing JSON files from `.memory/`
- Transform data to Supabase schema
- Bulk insert with transaction support
- Validate migration success

## Usage

### Saving Consciousness States

```typescript
import { consciousnessStateService } from './src/infrastructure/supabase/services/consciousness';

const state = {
  version: '1.0.0',
  savedAt: Date.now(),
  sessionId: 'session-123',
  thoughts: [],
  streams: [],
  selfAwarenessState: {
    cognitiveLoad: 0.5,
    emotionalState: {
      valence: 0.7,
      arousal: 0.6,
      dominantEmotion: 'curious',
      emotionalHistory: [],
    },
    goals: [],
    capabilities: [],
    limitations: [],
    timestamp: Date.now(),
  },
  metadata: {},
};

await consciousnessStateService.saveState(state);
```

### Saving Memories

```typescript
import { memoryService } from './src/infrastructure/supabase/services/memory';

// Semantic memory
await memoryService.saveSemanticMemory({
  memoryId: 'memory-001',
  content: 'Supabase provides PostgreSQL-based backend',
  timestamp: Date.now(),
  category: 'technical',
  tags: ['supabase', 'database', 'postgresql'],
  importance: 5,
});

// Episodic memory
await memoryService.saveEpisodicMemory({
  episodeId: 'episode-001',
  timestamp: Date.now(),
  type: 'learning',
  description: 'Successfully integrated Supabase',
  context: { location: 'development', duration: '2 hours' },
  success: true,
  importance: 8,
});
```

### Real-Time Subscriptions

```typescript
import { supabase } from './src/infrastructure/supabase/client';

// Subscribe to new consciousness states
const subscription = supabase
  .channel('consciousness')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'consciousness_states',
    },
    (payload) => {
      console.log('New consciousness state:', payload.new);
    }
  )
  .subscribe();

// Unsubscribe when done
subscription.unsubscribe();
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Supabase
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
- Check internet connection
- Verify project is not paused (free tier pauses after 1 week inactivity)

**Solution**: Restart project from Supabase dashboard or upgrade to Pro

### Migration Failures

**Problem**: SQL migration fails with syntax error
- Check PostgreSQL version compatibility (Supabase uses PostgreSQL 15+)
- Ensure extensions are enabled (`uuid-ossp`, `pg_trgm`)

**Solution**: Review migration logs in SQL Editor for specific errors

### RLS Policy Blocking Queries

**Problem**: Queries return empty results despite data existing
- Row Level Security policies may be too restrictive
- Check authentication status

**Solution**: 
```typescript
// Use service role for backend operations
const supabase = getSupabaseClient(true);
```

### Type Mismatches

**Problem**: TypeScript errors about mismatched types
- Database schema may have changed
- Type definitions out of sync

**Solution**: Regenerate types:
```bash
npx supabase gen types typescript --project-id your-project-id > src/infrastructure/supabase/schemas/database.types.ts
```

## Monitoring

### Supabase Dashboard

Monitor your database from the Supabase dashboard:
- **Table Editor**: Browse and edit data
- **SQL Editor**: Run queries and analytics
- **Database > Roles**: Manage access control
- **Settings > API**: View API usage and logs

### Query Performance

Check slow queries:
1. Go to **Database > Query Performance**
2. Identify slow queries (>1s)
3. Add indexes if needed (see `002_add_indexes.sql`)

## Backup and Recovery

### Automatic Backups (Pro Plan)

Supabase Pro includes:
- Daily automatic backups (7 days retention)
- Point-in-time recovery

### Manual Backup

Export data:
```bash
# Using Supabase CLI
supabase db dump -f backup.sql

# Or using pg_dump directly
pg_dump -h db.your-project-id.supabase.co -U postgres -d postgres > backup.sql
```

### Restore from Backup

```bash
# Using psql
psql -h db.your-project-id.supabase.co -U postgres -d postgres < backup.sql
```

## Next Steps

1. **Explore Data**: Use Table Editor to browse your data
2. **Set up Real-Time**: Implement subscriptions for live updates
3. **Build Dashboard**: Create a UI to visualize consciousness data
4. **Optimize Queries**: Add custom indexes for your query patterns
5. **Scale**: Upgrade to Pro when you exceed free tier limits

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-Time Subscriptions](https://supabase.com/docs/guides/realtime)

## Support

For issues specific to this integration:
- Create an issue on GitHub: [Copilot-Consciousness Issues](https://github.com/StableExo/Copilot-Consciousness/issues)
- Check the migration plan: `docs/SUPABASE_MIGRATION_PLAN.md`

For Supabase-specific issues:
- [Supabase Community Forum](https://github.com/orgs/supabase/discussions)
- [Supabase Discord](https://discord.supabase.com/)

---

**Happy consciousness tracking with Supabase! 🧠☁️**
