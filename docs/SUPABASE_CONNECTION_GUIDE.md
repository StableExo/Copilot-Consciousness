# Supabase Database Connection Guide

This guide covers all methods of connecting to your Supabase PostgreSQL database from Copilot-Consciousness.

## Connection Methods

Supabase provides multiple ways to connect to your PostgreSQL database:

1. **Supabase Client (Recommended)** - JavaScript/TypeScript SDK with automatic connection pooling
2. **Direct PostgreSQL Connection** - Using standard PostgreSQL drivers
3. **Connection Pooler (Supavisor)** - For serverless/edge functions with many concurrent connections
4. **HTTP/REST API** - Auto-generated REST API (already used by Supabase client)

## Method 1: Supabase Client (Recommended)

### Quick Start

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Query data
const { data, error } = await supabase
  .from('consciousness_states')
  .select('*')
  .limit(10);
```

### Using Our Enhanced Client

```typescript
import { getEnhancedSupabaseClient } from '@/infrastructure/supabase/client-enhanced';

// Get client with automatic retries
const client = getEnhancedSupabaseClient(true); // true = use service role

// Query with automatic retry on transient errors
const data = await client.withRetry(
  () => client.getClient().from('memories').select('*'),
  'fetch_memories'
);
```

**Pros:**
- ✅ Automatic connection pooling
- ✅ Built-in retry logic
- ✅ Type-safe queries
- ✅ Real-time subscriptions
- ✅ Row Level Security enforcement
- ✅ No connection management needed

**Cons:**
- ❌ Limited to REST API operations
- ❌ No raw SQL execution
- ❌ No database functions/procedures via SQL

**Use Cases:**
- Standard CRUD operations
- Real-time subscriptions
- Serverless/edge functions
- Frontend applications
- Most backend operations

## Method 2: Direct PostgreSQL Connection

### PostgreSQL Driver Options

You can use either of these excellent PostgreSQL drivers:

1. **postgres.js** (Recommended) - Modern, lightweight, and performant
2. **pg (node-postgres)** - Traditional, well-established driver

### Connection Information

Get your connection details from the Supabase dashboard:
**Settings > Database > Connection Info**

You'll find:
- **Host**: `db.your-project-ref.supabase.co`
- **Port**: `5432` (direct) or `6543` (pooler)
- **Database**: `postgres`
- **User**: `postgres`
- **Password**: Your database password

### Connection String Format

```bash
# Direct connection (session mode)
postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres

# Connection pooler (transaction mode) - for serverless
postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Option A: Using `postgres.js` (Recommended)

```bash
npm install postgres
```

```typescript
import postgres from 'postgres';

// Connection string format
const connectionString = process.env.DATABASE_URL || 
  `postgres://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.your-project-ref.supabase.co:5432/postgres`;

// Create connection
const sql = postgres(connectionString, {
  max: 20,              // Connection pool size
  idle_timeout: 30,     // Idle timeout in seconds
  connect_timeout: 10,  // Connect timeout in seconds
  ssl: 'require',       // SSL required for Supabase
});

// Query with template literals (auto-escapes SQL injection)
const states = await sql`
  SELECT * FROM consciousness_states 
  WHERE saved_at > NOW() - INTERVAL '24 hours'
  ORDER BY saved_at DESC
  LIMIT 10
`;

// Transaction
const result = await sql.begin(async (tx) => {
  await tx`INSERT INTO semantic_memories (memory_id, content) VALUES (${id}, ${content})`;
  await tx`UPDATE sessions SET memory_count = memory_count + 1 WHERE session_id = ${sessionId}`;
  return tx`SELECT * FROM sessions WHERE session_id = ${sessionId}`;
});

// Close connection
await sql.end();
```

**Using Our Helper Module:**

```typescript
import { createPostgresJsConnection, postgresHelpers } from '@/infrastructure/supabase/postgres-js';

// Create connection
const db = createPostgresJsConnection();

// Type-safe queries with built-in helpers
const states = await postgresHelpers.getConsciousnessStates({
  sessionId: 'session-123',
  limit: 10,
});

// Full-text search
const memories = await postgresHelpers.searchSemanticMemories('consciousness learning');

// Statistics
const stats = await postgresHelpers.getArbitrageStats('24 hours');
```

**Pros:**
- ✅ Modern ES6+ syntax with template literals
- ✅ Automatic SQL injection protection
- ✅ Fast performance (faster than pg)
- ✅ Built-in transaction support
- ✅ Smaller bundle size
- ✅ Better TypeScript support
- ✅ Streaming results support

**Cons:**
- ❌ Smaller community than pg
- ❌ Different API from traditional pg

### Option B: Using `pg` (Node.js PostgreSQL Driver)

```typescript
import { Pool } from 'pg';

// Direct connection
const pool = new Pool({
  host: 'db.your-project-ref.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }, // Required for Supabase
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query
const result = await pool.query('SELECT * FROM consciousness_states LIMIT 10');
console.log(result.rows);

// Always release connections
await pool.end();
```

### Using Connection Pooler (Recommended for Serverless)

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: 'aws-0-us-east-1.pooler.supabase.com',
  port: 6543, // Pooler port
  database: 'postgres',
  user: `postgres.your-project-ref`,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 20,
});

// Execute query
const { rows } = await pool.query('SELECT COUNT(*) FROM semantic_memories');
console.log('Memory count:', rows[0].count);
```

**Pros:**
- ✅ Raw SQL execution
- ✅ Database functions and procedures
- ✅ Full PostgreSQL feature set
- ✅ Better for complex queries
- ✅ Server-side cursors

**Cons:**
- ❌ Manual connection management
- ❌ No automatic retries
- ❌ Bypasses Row Level Security
- ❌ More complex error handling

**Use Cases:**
- Complex SQL queries
- Bulk data operations
- Database migrations
- Analytics and reporting
- Direct database administration

## Environment Configuration

### Add to `.env`

```bash
# Supabase Client (already configured)
USE_SUPABASE=true
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Direct PostgreSQL Connection (NEW)
SUPABASE_DB_PASSWORD=your-database-password
SUPABASE_DB_HOST=db.your-project-ref.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_USER=postgres
SUPABASE_DB_NAME=postgres

# Connection Pooler (for serverless)
SUPABASE_POOLER_HOST=aws-0-us-east-1.pooler.supabase.com
SUPABASE_POOLER_PORT=6543
SUPABASE_POOLER_USER=postgres.your-project-ref

# Connection Pool Configuration
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000
```

### Security Note

⚠️ **NEVER commit your database password!**
- Store in `.env` (already in `.gitignore`)
- Use environment variables in production
- Consider using secrets management (Vault, AWS Secrets Manager)

## Connection Utilities

### Create PostgreSQL Pool

```typescript
// src/infrastructure/supabase/pg-pool.ts
import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;

interface PostgresConfig {
  usePooler?: boolean; // Use connection pooler for serverless
}

export function createPostgresPool(config?: PostgresConfig): Pool {
  if (pool) {
    return pool;
  }

  const usePooler = config?.usePooler || false;

  const poolConfig: PoolConfig = {
    host: usePooler
      ? process.env.SUPABASE_POOLER_HOST
      : process.env.SUPABASE_DB_HOST,
    port: usePooler
      ? parseInt(process.env.SUPABASE_POOLER_PORT || '6543')
      : parseInt(process.env.SUPABASE_DB_PORT || '5432'),
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    user: usePooler
      ? process.env.SUPABASE_POOLER_USER
      : process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false, // Required for Supabase
    },
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    min: parseInt(process.env.DB_POOL_MIN || '5'),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000'),
  };

  pool = new Pool(poolConfig);

  // Error handling
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  // Connection event
  pool.on('connect', () => {
    console.log('PostgreSQL client connected');
  });

  return pool;
}

export function getPostgresPool(): Pool | null {
  return pool;
}

export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function testPostgresConnection(): Promise<boolean> {
  try {
    const testPool = createPostgresPool();
    const result = await testPool.query('SELECT NOW()');
    console.log('PostgreSQL connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('PostgreSQL connection test failed:', error);
    return false;
  }
}
```

### Query Helper with Retry

```typescript
// src/infrastructure/supabase/pg-query.ts
import { createPostgresPool } from './pg-pool';
import type { QueryResult } from 'pg';

interface QueryOptions {
  maxRetries?: number;
  retryDelay?: number;
}

export async function executeQuery<T = any>(
  sql: string,
  params?: any[],
  options?: QueryOptions
): Promise<QueryResult<T>> {
  const pool = createPostgresPool();
  const maxRetries = options?.maxRetries || 3;
  const retryDelay = options?.retryDelay || 1000;

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await pool.query<T>(sql, params);
      return result;
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const isRetryable =
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === '08006' || // connection failure
        error.code === '08003' || // connection does not exist
        error.code === '57P03'; // cannot connect now

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  throw lastError;
}

export async function executeTransaction<T>(
  queries: Array<{ sql: string; params?: any[] }>
): Promise<T[]> {
  const pool = createPostgresPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const results: T[] = [];
    for (const query of queries) {
      const result = await client.query<T>(query.sql, query.params);
      results.push(result.rows as any);
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## Usage Examples

### Example 1: Bulk Data Migration

```typescript
import { executeQuery, executeTransaction } from '@/infrastructure/supabase/pg-query';

// Bulk insert memories
async function bulkInsertMemories(memories: any[]) {
  const sql = `
    INSERT INTO semantic_memories (
      memory_id, content, timestamp, category, importance
    )
    VALUES ($1, $2, $3, $4, $5)
  `;

  const queries = memories.map((mem) => ({
    sql,
    params: [mem.id, mem.content, mem.timestamp, mem.category, mem.importance],
  }));

  await executeTransaction(queries);
  console.log(`Inserted ${memories.length} memories`);
}
```

### Example 2: Complex Analytics Query

```typescript
import { executeQuery } from '@/infrastructure/supabase/pg-query';

async function getConsciousnessStats() {
  const sql = `
    SELECT 
      DATE_TRUNC('hour', saved_at) as hour,
      AVG(cognitive_load) as avg_cognitive_load,
      AVG(emotional_valence) as avg_valence,
      COUNT(*) as state_count,
      MODE() WITHIN GROUP (ORDER BY dominant_emotion) as most_common_emotion
    FROM consciousness_states
    WHERE saved_at > NOW() - INTERVAL '24 hours'
    GROUP BY hour
    ORDER BY hour DESC
  `;

  const result = await executeQuery(sql);
  return result.rows;
}
```

### Example 3: Database Function Execution

```typescript
import { executeQuery } from '@/infrastructure/supabase/pg-query';

async function analyzeMemoryPatterns(timeWindow: string = '7 days') {
  const sql = `
    SELECT * FROM analyze_memory_patterns($1)
  `;

  const result = await executeQuery(sql, [timeWindow]);
  return result.rows;
}
```

### Example 4: Full-Text Search (Direct)

```typescript
import { executeQuery } from '@/infrastructure/supabase/pg-query';

async function searchMemories(query: string) {
  const sql = `
    SELECT 
      memory_id,
      content,
      ts_rank(content_tsv, websearch_to_tsquery('english', $1)) as rank
    FROM semantic_memories
    WHERE content_tsv @@ websearch_to_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT 20
  `;

  const result = await executeQuery(sql, [query]);
  return result.rows;
}
```

## Connection Pooling Best Practices

### Pool Size Configuration

```typescript
// For web servers (long-running)
const config = {
  max: 20,  // Max connections
  min: 5,   // Min idle connections
  idleTimeoutMillis: 30000,  // 30 seconds
};

// For serverless/edge functions (short-lived)
const serverlessConfig = {
  max: 1,   // Single connection per function instance
  min: 0,   // No idle connections
  idleTimeoutMillis: 0,  // Don't keep idle
  usePooler: true,  // Use Supavisor connection pooler
};
```

### Connection Limits

Supabase limits vary by plan:
- **Free**: 60 connections
- **Pro**: 200 connections
- **Team**: 400 connections
- **Enterprise**: Custom

Reserve ~40% for API operations and ~60% for direct connections.

### Monitoring Connection Usage

```typescript
import { getPostgresPool } from '@/infrastructure/supabase/pg-pool';

export async function getPoolStats() {
  const pool = getPostgresPool();
  
  if (!pool) {
    return null;
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}
```

## Testing Connections

### Test Script

```typescript
// scripts/test-supabase-connection.ts
import { checkSupabaseHealth } from '@/infrastructure/supabase/client-enhanced';
import { testPostgresConnection } from '@/infrastructure/supabase/pg-pool';

async function testConnections() {
  console.log('Testing Supabase connections...\n');

  // Test Supabase client
  console.log('1. Testing Supabase Client (HTTP/REST)...');
  const clientHealthy = await checkSupabaseHealth();
  console.log(`   Result: ${clientHealthy ? '✅ Success' : '❌ Failed'}\n`);

  // Test direct PostgreSQL
  console.log('2. Testing Direct PostgreSQL Connection...');
  const pgHealthy = await testPostgresConnection();
  console.log(`   Result: ${pgHealthy ? '✅ Success' : '❌ Failed'}\n`);

  if (clientHealthy && pgHealthy) {
    console.log('🎉 All connections successful!');
  } else {
    console.log('⚠️  Some connections failed. Check your configuration.');
  }
}

testConnections();
```

Run with:
```bash
node --import tsx scripts/test-supabase-connection.ts
```

## Choosing the Right Connection Method

| Scenario | Recommended Method |
|----------|-------------------|
| Standard CRUD operations | Supabase Client |
| Real-time subscriptions | Supabase Client |
| Serverless functions | Supabase Client + Pooler |
| Complex SQL queries | Direct PostgreSQL |
| Bulk data operations | Direct PostgreSQL |
| Database migrations | Direct PostgreSQL |
| Analytics queries | Direct PostgreSQL |
| Web application | Supabase Client |
| Background workers | Direct PostgreSQL |

## Troubleshooting

### Connection Refused

```bash
# Check if host and port are correct
telnet db.your-project-ref.supabase.co 5432

# Verify SSL is enabled in your client
# Supabase requires SSL connections
```

### Too Many Connections

```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND state_change < NOW() - INTERVAL '5 minutes';
```

### Timeout Issues

```typescript
// Increase timeout values
const pool = new Pool({
  connectionTimeoutMillis: 5000, // 5 seconds
  statement_timeout: 30000,      // 30 seconds query timeout
});
```

## Next Steps

1. ✅ Add database password to `.env`
2. ✅ Choose connection method based on use case
3. ✅ Test connection with provided script
4. ✅ Implement queries using appropriate method
5. ✅ Monitor connection pool usage
6. ✅ Set up error handling and retries

## Resources

- [Supabase Connection Guide](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [node-postgres Documentation](https://node-postgres.com/)
- [Supavisor (Connection Pooler)](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

---

**Ready to connect! 🔌**
