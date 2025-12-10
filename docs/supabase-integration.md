# Supabase Integration Documentation

## Overview

TheWarden uses Supabase as its cloud database backend for persistent storage of consciousness states, memories, arbitrage execution data, and configuration.

## Configuration

### Environment Variables

The following environment variables must be set in your `.env` file:

```bash
# Enable Supabase
USE_SUPABASE=true

# Supabase Project URL
SUPABASE_URL=https://your-project-id.supabase.co

# API Keys
SUPABASE_ANON_KEY=eyJhbGc...          # Anonymous/client key (safe for browser)
SUPABASE_PUBLISHABLE_KEY=sb_publishable_*  # New format publishable key
SUPABASE_API_KEY=sbp_*                # API key for operations
SUPABASE_APP_KEY=sbp_v0_*            # App-level key
SUPABASE_SERVICE_KEY=eyJhbGc...       # Service role key (⚠️ SECRET - backend only!)

# Optional
SUPABASE_REALTIME_ENABLED=true       # Enable real-time subscriptions
SUPABASE_MCP_URL=https://mcp.supabase.com/mcp?project_ref=...

# Database Connection (Pooler)
DATABASE_URL=postgresql://postgres.project-ref:password@aws-0-region.pooler.supabase.com:6543/postgres
```

### Key Types Explained

1. **SUPABASE_ANON_KEY** - Anonymous/client key
   - Safe to use in browser/client-side code
   - Respects Row Level Security (RLS) policies
   - Used by default in `getSupabaseClient()`

2. **SUPABASE_PUBLISHABLE_KEY** - New format publishable key
   - Similar to anon key, for public client access
   - Alternative to anon key (system supports both)

3. **SUPABASE_SERVICE_KEY** - Service role key
   - Full database access, bypasses RLS
   - ⚠️ **MUST BE KEPT SECRET** - backend only
   - Use with `getSupabaseClient(true)`

4. **SUPABASE_API_KEY & SUPABASE_APP_KEY** - Additional keys
   - For specific Supabase API operations
   - Used by certain Supabase features

## Database Schema

TheWarden's Supabase database includes 16 core tables:

### Consciousness & Memory Tables
1. **consciousness_states** - Complete consciousness state snapshots
2. **thoughts** - Individual thoughts with detailed context
3. **semantic_memories** - Structured knowledge with full-text search
4. **episodic_memories** - Event-based memories with context
5. **sessions** - Session tracking and management

### Agent Configuration
6. **agent_config** - Environment variables and configuration for AI agents
7. **autonomous_goals** - Goal tracking and management
8. **learning_events** - Learning and adaptation events

### Trading & Execution
9. **arbitrage_executions** - Arbitrage execution history and results
10. **market_patterns** - Discovered market patterns and strategies

### Documentation & Knowledge
11. **documentation** - Documentation storage with versioning
12. **knowledge_articles** - Structured knowledge articles
13. **memory_logs** - Session memory logs
14. **data_files** - Data file storage and metadata

### Environment Management
15. **environment_configs** - Environment configuration storage
16. **environment_secrets** - Secrets and key references

## Usage

### Basic Client Usage

```typescript
import { getSupabaseClient } from '@/infrastructure/supabase/client';

// Get client with anon key (default)
const supabase = getSupabaseClient();

// Get client with service role key (backend operations)
const supabaseAdmin = getSupabaseClient(true);

// Query data
const { data, error } = await supabase
  .from('consciousness_states')
  .select('*')
  .limit(10);
```

### Using postgres.js (Alternative)

For direct PostgreSQL operations:

```typescript
import { createPostgresJsConnection } from '@/infrastructure/supabase/postgres-js';

const sql = createPostgresJsConnection();

// Execute query
const states = await sql`
  SELECT * FROM consciousness_states
  WHERE session_id = ${sessionId}
  ORDER BY saved_at DESC
  LIMIT 1
`;
```

### Service Helpers

TheWarden includes specialized service modules:

```typescript
import { ConsciousnessService } from '@/infrastructure/supabase/services/consciousness';
import { MemoryService } from '@/infrastructure/supabase/services/memory';

// Use consciousness service
const consciousnessService = new ConsciousnessService();
await consciousnessService.saveState(state);

// Use memory service
const memoryService = new MemoryService();
await memoryService.storeSemanticMemory(memory);
```

## Testing

### Connection Test

Verify your Supabase connection:

```bash
npm run test:supabase:connection
```

This will test:
- Configuration validation
- Connection to Supabase
- Database query execution
- Table access permissions

### Full Test Suite

Run all Supabase tests (requires local Supabase):

```bash
npm run test:supabase
```

## Migrations

Migrations are located in `src/infrastructure/supabase/migrations/`:

1. **001_initial_schema.sql** - Core tables (consciousness, memories, arbitrage)
2. **002_add_indexes.sql** - Performance indexes
3. **003_rls_policies.sql** - Row Level Security policies
4. **004_add_vector_search.sql** - Vector search support
5. **005_documentation_storage.sql** - Documentation tables
6. **006_environment_storage.sql** - Environment configuration tables

### Applying Migrations

Via Supabase CLI:
```bash
npm run supabase:migrate
```

Via Supabase Dashboard:
1. Go to SQL Editor
2. Copy migration file contents
3. Execute SQL

## Connection Pooling

TheWarden uses Supabase's connection pooler (Supavisor) for optimal performance:

- **Pooler Mode** (port 6543): Recommended for application queries
  - Transaction pooling for high concurrency
  - Automatic connection management
  
- **Direct Connection** (port 5432): For migrations and admin tasks
  - Full PostgreSQL protocol support
  - Required for schema changes

## Troubleshooting

### Connection Issues

1. Verify environment variables are set:
   ```bash
   echo $SUPABASE_URL
   echo $USE_SUPABASE
   ```

2. Check if Supabase is enabled:
   ```bash
   npm run test:supabase:connection
   ```

3. Verify network access to Supabase (check firewall/VPN)

### Type Issues

Regenerate TypeScript types:
```bash
npm run supabase:types
```

Or manually update `src/infrastructure/supabase/schemas/database.types.ts`

### Migration Issues

If migrations fail:
1. Use direct connection (port 5432) not pooler (6543)
2. Ensure you have necessary permissions
3. Check for conflicting table/constraint names

## Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Use service role key only in backend** - Never expose in client code
3. **Enable RLS policies** - Protect sensitive data
4. **Rotate keys regularly** - Especially after team changes
5. **Use least privilege** - Use anon key for client, service key only when needed

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [postgres.js Documentation](https://github.com/porsager/postgres)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Support

For issues or questions:
1. Check the connection test: `npm run test:supabase:connection`
2. Review logs in the console
3. Verify Supabase dashboard for service status
4. Check migrations are applied correctly
