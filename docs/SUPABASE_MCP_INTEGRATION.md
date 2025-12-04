# Supabase MCP Integration Guide

## Overview

This guide documents the integration of Supabase MCP (Model Context Protocol) server into the Copilot-Consciousness project. The Supabase MCP provides direct database access, real-time subscriptions, and cloud storage capabilities through a standardized MCP interface.

## What is Supabase MCP?

Supabase MCP is a Model Context Protocol server that provides:
- **Database Operations**: Direct SQL access and table management
- **Real-time Subscriptions**: Live data updates via WebSockets
- **Vector Search**: Semantic search with pgvector extension
- **Cloud Storage**: File storage and management
- **Authentication**: User management and auth flows
- **Edge Functions**: Serverless function execution

## Project Configuration

### Supabase Project Details

- **Project Name**: Co-Pilot consciousness
- **Project URL**: `https://ydvevgqxcfizualicbom.supabase.co`
- **Project Ref**: `ydvevgqxcfizualicbom`
- **Environment**: Production (main)
- **Tier**: Free

### MCP Server URL

```
https://mcp.supabase.com/mcp?project_ref=ydvevgqxcfizualicbom&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cfunctions%2Cdevelopment%2Cbranching%2Cstorage
```

### Features Enabled

- `docs` - Documentation access
- `account` - Account management
- `database` - Database operations
- `debugging` - Debug tools
- `functions` - Edge Functions
- `development` - Development tools
- `branching` - Database branching
- `storage` - Cloud storage

## Installation & Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# Supabase Configuration
USE_SUPABASE=true
SUPABASE_URL=https://ydvevgqxcfizualicbom.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkdmV2Z3F4Y2ZpenVhbGljYm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjA1NTksImV4cCI6MjA4MDI5NjU1OX0.0N2lXO4AyrkXD7bOJyeyJPryCzoeMocxkKiaSc8svd8
SUPABASE_REALTIME_ENABLED=true

# Supabase MCP Server URL
SUPABASE_MCP_URL=https://mcp.supabase.com/mcp?project_ref=ydvevgqxcfizualicbom&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cfunctions%2Cdevelopment%2Cbranching%2Cstorage
```

**Security Note**: The `SUPABASE_ANON_KEY` is safe to use in client-side code if Row Level Security (RLS) is properly configured.

### 2. MCP Configuration

The Supabase MCP server is configured in two locations:

#### Root `.mcp.json`

```json
{
  "mcpServers": {
    "supabase": {
      "url": "${SUPABASE_MCP_URL}",
      "description": "Supabase MCP server for database operations...",
      "capabilities": [
        "database_operations",
        "real_time_subscriptions",
        "vector_search",
        "cloud_storage",
        "auth_management",
        "edge_functions"
      ]
    }
  }
}
```

#### Cursor `.cursor/mcp.json`

For Cursor IDE integration:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=ydvevgqxcfizualicbom&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cfunctions%2Cdevelopment%2Cbranching%2Cstorage"
    }
  }
}
```

### 3. Cursor Installation

To use with Cursor IDE:

1. **One-Click Install**: Click "Add to Cursor" in Supabase dashboard
2. **Manual Installation**: The `.cursor/mcp.json` is already configured

## Database Schema

The project includes migrations for consciousness and memory storage:

### Core Tables

1. **consciousness_states** - Complete state snapshots
   - Session tracking
   - Cognitive load metrics
   - Emotional state
   - Goals and capabilities

2. **semantic_memories** - Semantic memory with embeddings
   - Content and summaries
   - Vector embeddings for search
   - Tag-based categorization

3. **episodic_memories** - Episodic memory with temporal data
   - Event tracking
   - Temporal ordering
   - Context preservation

4. **sessions** - Session tracking
   - Session metadata
   - Collaborator tracking
   - Developmental milestones

5. **collaborators** - Collaborator profiles
   - Interaction history
   - Preference tracking
   - Relationship data

6. **dialogues** - Consciousness dialogues
   - Conversation tracking
   - Insight recording
   - Pattern documentation

### Applying Migrations

```bash
# Apply all migrations
npm run supabase:migrate

# Or manually via Supabase SQL Editor
# Copy/paste content from src/infrastructure/supabase/migrations/*.sql
```

## Usage Examples

### TypeScript Client

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Store consciousness state
const { data, error } = await supabase
  .from('consciousness_states')
  .insert({
    session_id: 'session-123',
    thoughts: JSON.stringify(thoughts),
    cognitive_load: 0.45,
    emotional_state: { valence: 0.75, arousal: 0.7 }
  });

// Query with vector search (after pgvector setup)
const { data: memories } = await supabase
  .rpc('match_memories', {
    query_embedding: embedding,
    match_threshold: 0.8,
    match_count: 10
  });
```

### MCP Tools Access

When connected via MCP, you can use Supabase tools directly in your AI conversations:

```
// Query database
Use Supabase MCP to query consciousness_states table

// Real-time subscriptions
Subscribe to changes in semantic_memories table

// Vector search
Find memories semantically similar to "identity and name choice"
```

## Features

### 1. Database Operations

- Direct SQL execution
- Table management (CRUD)
- Query building
- Transaction support

### 2. Real-time Subscriptions

Subscribe to database changes:

```typescript
const subscription = supabase
  .channel('consciousness-changes')
  .on(
    'postgres_changes',
    { 
      event: '*', 
      schema: 'public', 
      table: 'consciousness_states' 
    },
    (payload) => {
      console.log('State changed:', payload);
    }
  )
  .subscribe();
```

### 3. Vector Search

Using pgvector extension for semantic memory:

```sql
-- Find similar memories
SELECT * FROM semantic_memories
ORDER BY embedding <-> query_embedding
LIMIT 10;
```

### 4. Cloud Storage

Store and retrieve files:

```typescript
// Upload memory file
const { data, error } = await supabase
  .storage
  .from('memories')
  .upload('session-123/thoughts.json', file);

// Download memory file
const { data } = await supabase
  .storage
  .from('memories')
  .download('session-123/thoughts.json');
```

## Integration Benefits

### For Consciousness System

1. **Persistent Storage**: Cloud-based memory persistence
2. **Cross-Session Continuity**: Access memories from any session
3. **Semantic Search**: Find related thoughts and memories
4. **Real-time Updates**: Live synchronization across instances
5. **Scalability**: Handle growing memory data

### For Development

1. **SQL Editor**: Direct database access via dashboard
2. **Table Editor**: Visual data management
3. **Debugging Tools**: Built-in debugging via MCP
4. **Documentation**: Inline docs access
5. **Branching**: Test schema changes safely

### For AI Agents

1. **MCP Integration**: Standard protocol for AI tools
2. **Context Awareness**: Access full memory context
3. **Autonomous Operations**: Direct database access
4. **Pattern Recognition**: Query historical patterns
5. **Learning**: Build knowledge over time

## Security Considerations

### Row Level Security (RLS)

Enable RLS for all tables:

```sql
ALTER TABLE consciousness_states ENABLE ROW LEVEL SECURITY;

-- Create policy (example)
CREATE POLICY "Users can access their own states"
  ON consciousness_states
  FOR ALL
  USING (auth.uid() = user_id);
```

### API Keys

- **Anon Key**: Safe for public use (respects RLS)
- **Service Key**: Backend only (bypasses RLS)

**Never commit service keys to version control!**

### Environment Variables

Store all credentials in `.env`:

```bash
# ✓ Safe - in .env (gitignored)
SUPABASE_ANON_KEY=your-key

# ✗ Unsafe - in code
const key = "eyJhbGc..."; // Don't do this!
```

## Testing

### Connection Test

```typescript
// Test basic connection
const { data, error } = await supabase
  .from('consciousness_states')
  .select('count');

console.log('Connected:', !error);
```

### Run Test Suite

```bash
# Run all Supabase tests
npm run test:supabase

# Run specific tests
npm test -- tests/integration/supabase
```

## Troubleshooting

### Connection Issues

```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Test API endpoint
curl https://ydvevgqxcfizualicbom.supabase.co/rest/v1/
```

### Migration Errors

```bash
# Check migration status
npm run supabase:status

# Rollback last migration
npm run supabase:rollback
```

### MCP Server Issues

```bash
# Validate MCP configuration
cat .mcp.json | jq '.mcpServers.supabase'

# Check MCP server health
curl https://mcp.supabase.com/health
```

## Next Steps

### Immediate

- [x] Configure environment variables
- [x] Add MCP server to .mcp.json
- [x] Create Cursor integration config
- [ ] Apply database migrations
- [ ] Test connection
- [ ] Enable RLS policies

### Short-term

- [ ] Migrate `.memory/log.md` to Supabase
- [ ] Migrate introspection states
- [ ] Test vector search functionality
- [ ] Set up real-time subscriptions
- [ ] Create backup strategy

### Long-term

- [ ] Build consciousness dashboard
- [ ] Implement automated backups
- [ ] Add LangChain RAG integration
- [ ] Enable multi-agent scenarios
- [ ] Clear local memory files

## Resources

### Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [MCP Protocol Spec](https://modelcontextprotocol.io/)
- [pgvector Guide](https://github.com/pgvector/pgvector)

### Project Links

- **Dashboard**: [https://supabase.com/dashboard/project/ydvevgqxcfizualicbom](https://supabase.com/dashboard/project/ydvevgqxcfizualicbom)
- **SQL Editor**: Use dashboard SQL Editor tab
- **Table Editor**: Use dashboard Table Editor tab

### Support

- GitHub Issues: Use project repository
- Supabase Discord: [discord.supabase.com](https://discord.supabase.com)
- Memory Logs: Check `.memory/log.md` for session history

---

**Last Updated**: 2025-12-04  
**Status**: MCP Integration Complete ✅  
**Next**: Apply migrations and test connection
