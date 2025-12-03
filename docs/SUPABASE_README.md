# Supabase Integration for Copilot-Consciousness

Complete PostgreSQL-based cloud data storage for consciousness states, memories, and arbitrage execution history.

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| [**Migration Plan**](./SUPABASE_MIGRATION_PLAN.md) | Complete architecture, schema design, and migration strategy (30KB) |
| [**Setup Guide**](./SUPABASE_SETUP_GUIDE.md) | Step-by-step setup for new users |
| [**CLI Guide**](./SUPABASE_CLI_GUIDE.md) | Local development, migrations, and type generation |

## 🚀 Quick Start

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Create Supabase Project

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your API keys from Settings > API

### 3. Configure Environment

```bash
# .env
USE_SUPABASE=true
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_REALTIME_ENABLED=true
```

### 4. Run Migrations

**Option A: Supabase Dashboard**
1. Go to SQL Editor
2. Copy and paste each migration file:
   - `src/infrastructure/supabase/migrations/001_initial_schema.sql`
   - `src/infrastructure/supabase/migrations/002_add_indexes.sql`
   - `src/infrastructure/supabase/migrations/003_rls_policies.sql`
3. Click "Run" for each

**Option B: Supabase CLI**
```bash
supabase link --project-ref your-project-id
cp src/infrastructure/supabase/migrations/*.sql supabase/migrations/
supabase db push
```

### 5. Install SDK

```bash
npm install @supabase/supabase-js
```

### 6. Generate Types

```bash
npm run supabase:types
```

## 📦 What's Included

### Database Schema (9 Tables)

| Table | Purpose |
|-------|---------|
| `consciousness_states` | Complete consciousness snapshots |
| `thoughts` | Individual thoughts with context |
| `semantic_memories` | Structured knowledge (full-text search) |
| `episodic_memories` | Experience-based memories |
| `arbitrage_executions` | Execution history with metrics |
| `market_patterns` | Detected patterns |
| `sessions` | Session tracking |
| `autonomous_goals` | Goal management |
| `learning_events` | Learning and adaptation |

### Services

- **ConsciousnessStateService**: Save/retrieve consciousness states
- **MemoryService**: Semantic & episodic memory management
- **Enhanced Client**: Retry logic, error handling, connection management

### Features

✅ **PostgreSQL Backend**: Powerful relational database  
✅ **Full-Text Search**: Search memories by content  
✅ **Real-Time Subscriptions**: Live data updates  
✅ **Row Level Security**: Granular access control  
✅ **Type Safety**: Auto-generated TypeScript types  
✅ **Automatic Retries**: Exponential backoff with jitter  
✅ **Error Handling**: Structured errors with context  
✅ **CLI Integration**: Local development and migrations  
✅ **Comprehensive Docs**: 50KB+ of documentation  

## 💡 Usage Examples

### Save Consciousness State

```typescript
import { consciousnessStateService } from '@/infrastructure/supabase/services/consciousness';

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

### Save Memories

```typescript
import { memoryService } from '@/infrastructure/supabase/services/memory';

// Semantic memory
await memoryService.saveSemanticMemory({
  memoryId: 'memory-001',
  content: 'Supabase provides PostgreSQL-based backend',
  timestamp: Date.now(),
  category: 'technical',
  tags: ['supabase', 'database'],
  importance: 5,
});

// Episodic memory
await memoryService.saveEpisodicMemory({
  episodeId: 'episode-001',
  timestamp: Date.now(),
  type: 'learning',
  description: 'Successfully integrated Supabase',
  context: { duration: '2 hours' },
  success: true,
  importance: 8,
});
```

### Search Memories

```typescript
// Full-text search
const results = await memoryService.searchSemanticMemories('consciousness learning');

// Get by category
const technical = await memoryService.getSemanticMemoriesByCategory('technical');

// Get by tags
const tagged = await memoryService.getSemanticMemoriesByTags(['supabase', 'database']);
```

### Real-Time Subscriptions

```typescript
import { supabase } from '@/infrastructure/supabase/client';

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
      console.log('New state:', payload.new);
    }
  )
  .subscribe();
```

### Error Handling with Retries

```typescript
import { getEnhancedSupabaseClient } from '@/infrastructure/supabase/client-enhanced';

const client = getEnhancedSupabaseClient(true);

// Automatic retries on transient errors
const data = await client.withRetry(
  () => supabase.from('memories').select('*').eq('id', '123'),
  'fetch_memory'
);
```

## 🛠️ NPM Scripts

```bash
# Type generation
npm run supabase:types        # From remote project
npm run supabase:types:local  # From local database

# Local development
npm run supabase:start        # Start local Supabase
npm run supabase:stop         # Stop local Supabase
npm run supabase:status       # Check status
npm run supabase:reset        # Reset and migrate

# Migrations
npm run supabase:migrate      # Push to remote
npm run supabase:diff         # Show schema diff

# Testing
npm run test:supabase         # Run Supabase tests
npm run test:supabase:watch   # Watch mode
```

## 🏗️ Architecture

```
src/infrastructure/supabase/
├── client.ts                  # Basic client
├── client-enhanced.ts         # Enhanced with retries
├── schemas/
│   └── database.types.ts      # TypeScript types
├── services/
│   ├── consciousness.ts       # Consciousness operations
│   └── memory.ts              # Memory operations
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_indexes.sql
│   └── 003_rls_policies.sql
└── realtime/
    └── subscriptions.ts       # Real-time handlers
```

## 🔐 Security

- **Row Level Security (RLS)**: Enabled on all tables
- **Service Role**: Backend operations use service key
- **Anon Key**: Client-side operations use anon key
- **API Keys**: Never commit to version control
- **Environment Variables**: Store keys in `.env`

## 📊 Performance

- **Indexed Queries**: 40+ indexes for optimal performance
- **Full-Text Search**: GIN indexes for text search
- **Connection Pooling**: PgBouncer for connection management
- **Automatic Retries**: Transient error recovery
- **Query Optimization**: Pagination, limits, filters

## 🔄 Migration Strategy

1. **Parallel Run**: Keep existing storage alongside Supabase
2. **Feature Flag**: `USE_SUPABASE=true` to enable
3. **Gradual Migration**: Migrate data incrementally
4. **Validation**: Compare old vs new storage
5. **Rollback Ready**: Easy fallback to file-based storage

## 🌐 Real-Time Features

- **Live Consciousness Updates**: Stream state changes
- **Collaborative Monitoring**: Multiple observers
- **Pattern Detection**: Real-time pattern notifications
- **Execution Alerts**: High-profit execution notifications

## 📈 Monitoring

- **Supabase Dashboard**: Built-in metrics and logs
- **Query Performance**: Slow query identification
- **Connection Stats**: Pool utilization tracking
- **Error Tracking**: Structured error logging

## 💰 Cost Estimation

**Free Tier** (sufficient to start):
- 500MB database storage
- 1GB file storage
- 2GB bandwidth
- 50,000 monthly active users

**Pro Tier** ($25/month):
- 8GB database storage
- 100GB file storage
- 50GB bandwidth
- Daily backups
- No pausing

**Estimated for Copilot-Consciousness**:
- Database: 1-5GB
- Bandwidth: 10GB/month
- Users: 1-10
- **Recommendation**: Start Free, upgrade to Pro when needed

## 🔧 Troubleshooting

### Connection Issues
```bash
# Check health
curl https://your-project-id.supabase.co/rest/v1/

# Verify env vars
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

### Migration Failures
```bash
# Check migration status
supabase migration list

# Repair if needed
supabase migration repair
```

### Type Mismatches
```bash
# Regenerate types
npm run supabase:types
```

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)

## 🤝 Contributing

When adding new tables or modifying schema:

1. Create migration: `supabase migration new feature_name`
2. Write SQL in generated file
3. Test locally: `supabase db reset`
4. Regenerate types: `npm run supabase:types:local`
5. Update services as needed
6. Commit migration file

## ⚡ Next Steps

1. ✅ **Created** - Infrastructure and documentation complete
2. 🔄 **Your Turn** - Create Supabase account and project
3. 🔄 **Your Turn** - Run migrations via dashboard or CLI
4. ⏸️ **Pending** - Install `@supabase/supabase-js` package
5. ⏸️ **Pending** - Test integration with sample data
6. ⏸️ **Pending** - Implement remaining services (arbitrage, sessions)
7. ⏸️ **Pending** - Build data migration scripts
8. ⏸️ **Pending** - Add comprehensive tests

## 📞 Support

- **GitHub Issues**: [Create an issue](https://github.com/StableExo/Copilot-Consciousness/issues)
- **Migration Plan**: See [SUPABASE_MIGRATION_PLAN.md](./SUPABASE_MIGRATION_PLAN.md)
- **Supabase Discord**: [discord.supabase.com](https://discord.supabase.com/)

---

**Built with ❤️ for Copilot-Consciousness**  
**Ready for autonomous data persistence in the cloud! ☁️🧠**
