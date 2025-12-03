/**
 * PostgreSQL Connection Pool using postgres.js
 * 
 * Alternative to the pg driver - lightweight, modern, and performant
 * https://github.com/porsager/postgres
 */

import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | null = null;

interface PostgresJsConfig {
  usePooler?: boolean; // Use Supavisor connection pooler
  debug?: boolean;
}

/**
 * Create postgres.js connection
 */
export function createPostgresJsConnection(config?: PostgresJsConfig): ReturnType<typeof postgres> {
  if (sql) {
    return sql;
  }

  const usePooler = config?.usePooler || false;
  const debug = config?.debug || false;

  // Build connection string
  const connectionString = usePooler
    ? `postgres://${process.env.SUPABASE_POOLER_USER}:${process.env.SUPABASE_DB_PASSWORD}@${process.env.SUPABASE_POOLER_HOST}:${process.env.SUPABASE_POOLER_PORT}/${process.env.SUPABASE_DB_NAME || 'postgres'}`
    : `postgres://${process.env.SUPABASE_DB_USER}:${process.env.SUPABASE_DB_PASSWORD}@${process.env.SUPABASE_DB_HOST}:${process.env.SUPABASE_DB_PORT}/${process.env.SUPABASE_DB_NAME || 'postgres'}`;

  sql = postgres(connectionString, {
    // Connection pool settings
    max: usePooler ? 1 : parseInt(process.env.DB_POOL_MAX || '20'),
    idle_timeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30'),
    connect_timeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '10'),
    
    // SSL is required for Supabase
    ssl: 'require',
    
    // Connection settings
    prepare: usePooler ? false : true, // Disable prepared statements for transaction pooler
    
    // Debug mode
    debug: debug ? (connection, query, parameters) => {
      console.log('[postgres.js]', query, parameters);
    } : undefined,
    
    // Transform column names from snake_case to camelCase (optional)
    transform: {
      column: (column: string) => column, // Keep as-is, or use camelCase transformation
      value: (value: any) => value,
      row: (row: any) => row,
    },
    
    // Error handling
    onnotice: (notice) => {
      if (debug) {
        console.warn('[postgres.js] Notice:', notice);
      }
    },
  });

  return sql;
}

/**
 * Get existing postgres.js connection
 */
export function getPostgresJsConnection(): ReturnType<typeof postgres> | null {
  return sql;
}

/**
 * Close postgres.js connection
 */
export async function closePostgresJsConnection(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

/**
 * Test postgres.js connection
 */
export async function testPostgresJsConnection(): Promise<boolean> {
  try {
    const db = createPostgresJsConnection();
    const result = await db`SELECT NOW() as now, version() as version`;
    console.log('postgres.js connection test successful:', result[0]);
    return true;
  } catch (error) {
    console.error('postgres.js connection test failed:', error);
    return false;
  }
}

/**
 * Execute query with automatic retry
 */
export async function executePostgresQuery<T = any>(
  queryFn: (sql: ReturnType<typeof postgres>) => Promise<T>,
  options?: { maxRetries?: number; retryDelay?: number }
): Promise<T> {
  const db = createPostgresJsConnection();
  const maxRetries = options?.maxRetries || 3;
  const retryDelay = options?.retryDelay || 1000;

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await queryFn(db);
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

/**
 * Execute transaction with postgres.js
 */
export async function executePostgresTransaction<T>(
  transactionFn: (sql: ReturnType<typeof postgres>) => Promise<T>
): Promise<T> {
  const db = createPostgresJsConnection();
  
  return await db.begin(async (tx) => {
    return await transactionFn(tx);
  });
}

// Type-safe query helpers
export const postgresHelpers = {
  /**
   * Get consciousness states with filters
   */
  async getConsciousnessStates(filters?: {
    sessionId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const db = createPostgresJsConnection();
    
    return executePostgresQuery(async (sql) => {
      let query = sql`
        SELECT * FROM consciousness_states
        WHERE 1=1
      `;

      if (filters?.sessionId) {
        query = sql`${query} AND session_id = ${filters.sessionId}`;
      }

      if (filters?.startDate) {
        query = sql`${query} AND saved_at >= ${filters.startDate}`;
      }

      if (filters?.endDate) {
        query = sql`${query} AND saved_at <= ${filters.endDate}`;
      }

      query = sql`
        ${query}
        ORDER BY saved_at DESC
        LIMIT ${filters?.limit || 100}
      `;

      return await query;
    });
  },

  /**
   * Search semantic memories with full-text search
   */
  async searchSemanticMemories(searchQuery: string, limit: number = 10) {
    const db = createPostgresJsConnection();

    return executePostgresQuery(async (sql) => {
      return await sql`
        SELECT 
          memory_id,
          content,
          category,
          tags,
          importance,
          ts_rank(content_tsv, websearch_to_tsquery('english', ${searchQuery})) as rank
        FROM semantic_memories
        WHERE content_tsv @@ websearch_to_tsquery('english', ${searchQuery})
        ORDER BY rank DESC, importance DESC
        LIMIT ${limit}
      `;
    });
  },

  /**
   * Get arbitrage execution statistics
   */
  async getArbitrageStats(timeWindow: string = '24 hours') {
    const db = createPostgresJsConnection();

    return executePostgresQuery(async (sql) => {
      return await sql`
        SELECT 
          COUNT(*) as total_executions,
          COUNT(*) FILTER (WHERE success = true) as successful_executions,
          ROUND(AVG(profit), 8) as avg_profit,
          ROUND(SUM(CASE WHEN success THEN actual_profit ELSE 0 END), 8) as total_profit,
          ROUND(AVG(mev_risk), 2) as avg_mev_risk
        FROM arbitrage_executions
        WHERE timestamp > NOW() - INTERVAL ${timeWindow}
      `;
    });
  },

  /**
   * Bulk insert semantic memories
   */
  async bulkInsertSemanticMemories(memories: Array<{
    memory_id: string;
    content: string;
    category?: string;
    tags?: string[];
    importance?: number;
  }>) {
    const db = createPostgresJsConnection();

    return executePostgresTransaction(async (tx) => {
      return await tx`
        INSERT INTO semantic_memories ${tx(memories, 'memory_id', 'content', 'category', 'tags', 'importance')}
        ON CONFLICT (memory_id) DO UPDATE
        SET 
          content = EXCLUDED.content,
          category = EXCLUDED.category,
          tags = EXCLUDED.tags,
          importance = EXCLUDED.importance,
          timestamp = NOW()
        RETURNING *
      `;
    });
  },

  /**
   * Get consciousness statistics for time range
   */
  async getConsciousnessStatistics(startDate: Date, endDate: Date) {
    const db = createPostgresJsConnection();

    return executePostgresQuery(async (sql) => {
      return await sql`
        SELECT 
          DATE_TRUNC('hour', saved_at) as hour,
          ROUND(AVG(cognitive_load)::numeric, 2) as avg_cognitive_load,
          ROUND(AVG(emotional_valence)::numeric, 2) as avg_valence,
          ROUND(AVG(emotional_arousal)::numeric, 2) as avg_arousal,
          MODE() WITHIN GROUP (ORDER BY dominant_emotion) as most_common_emotion,
          COUNT(*) as state_count
        FROM consciousness_states
        WHERE saved_at BETWEEN ${startDate} AND ${endDate}
        GROUP BY hour
        ORDER BY hour DESC
      `;
    });
  },
};
