/**
 * Memory System Adapter
 * 
 * Provides a unified interface for memory operations that automatically
 * uses Supabase when configured, with graceful fallback to local files.
 * 
 * Usage:
 *   import { memoryAdapter } from './memory-adapter';
 *   const state = await memoryAdapter.loadState('session-id');
 *   await memoryAdapter.saveState(state);
 */

import fs from 'fs/promises';
import path from 'path';
import { shouldUseSupabase, getSupabaseClient } from '../../infrastructure/supabase/client.js';

export interface MemoryAdapterConfig {
  useSupabase: boolean;
  fallbackToLocal: boolean;
  autoSync: boolean;
  syncInterval?: number;
}

export class MemoryAdapter {
  private config: MemoryAdapterConfig;
  private syncTimer?: NodeJS.Timeout;

  constructor(config?: Partial<MemoryAdapterConfig>) {
    this.config = {
      useSupabase: process.env.USE_SUPABASE === 'true' || shouldUseSupabase(),
      fallbackToLocal: process.env.MEMORY_FALLBACK_TO_LOCAL !== 'false',
      autoSync: process.env.MEMORY_AUTO_SYNC === 'true',
      syncInterval: parseInt(process.env.MEMORY_SYNC_INTERVAL || '60000'),
      ...config,
    };

    if (this.config.autoSync && this.config.syncInterval) {
      this.startAutoSync();
    }
  }

  /**
   * Load consciousness state by session ID
   */
  async loadState(sessionId: string): Promise<any> {
    // Try Supabase first if configured
    if (this.config.useSupabase) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('consciousness_states')
          .select('*')
          .eq('session_id', sessionId)
          .single();

        if (!error && data) {
          console.log(`✅ Loaded state from Supabase: ${sessionId}`);
          return data;
        }

        if (error && !this.config.fallbackToLocal) {
          throw error;
        }
        console.warn(`⚠️ Supabase unavailable, falling back to local: ${error.message}`);
      } catch (err) {
        if (!this.config.fallbackToLocal) {
          throw err;
        }
        console.warn(`⚠️ Supabase error, falling back to local:`, err);
      }
    }

    // Fallback to local files
    return this.loadStateLocal(sessionId);
  }

  /**
   * Save consciousness state
   */
  async saveState(state: any): Promise<void> {
    const errors: Error[] = [];

    // Save to Supabase if configured
    if (this.config.useSupabase) {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('consciousness_states')
          .upsert({
            session_id: state.sessionId,
            thoughts: state.thoughts || [],
            self_awareness_state: state.selfAwarenessState || {},
            metadata: state.metadata || {},
            created_at: new Date(state.savedAt).toISOString(),
          });

        if (error) {
          throw error;
        }

        console.log(`✅ Saved state to Supabase: ${state.sessionId}`);
      } catch (err) {
        errors.push(err as Error);
        console.error(`❌ Failed to save to Supabase:`, err);
      }
    }

    // Always save locally as backup (or primary if Supabase disabled)
    try {
      await this.saveStateLocal(state);
      console.log(`✅ Saved state locally: ${state.sessionId}`);
    } catch (err) {
      errors.push(err as Error);
      console.error(`❌ Failed to save locally:`, err);
    }

    // If both failed, throw
    if (errors.length === 2 || (errors.length === 1 && !this.config.fallbackToLocal)) {
      throw new Error(`Failed to save state: ${errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Append to memory log
   */
  async appendToLog(entry: string): Promise<void> {
    // Save to Supabase
    if (this.config.useSupabase) {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('episodic_memories')
          .insert({
            content: entry,
            context: { source: 'memory_log' },
            importance: 0.5,
          });

        if (!error) {
          console.log(`✅ Appended to Supabase log`);
        }
      } catch (err) {
        console.warn(`⚠️ Failed to append to Supabase:`, err);
      }
    }

    // Always append to local log as backup
    await this.appendToLogLocal(entry);
  }

  /**
   * Save knowledge article
   */
  async saveKnowledgeArticle(article: any): Promise<void> {
    // Save to Supabase
    if (this.config.useSupabase) {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('semantic_memories')
          .insert({
            content: article.content,
            category: article.tags?.[0] || 'general',
            confidence: 0.8,
            metadata: article,
          });

        if (!error) {
          console.log(`✅ Saved article to Supabase: ${article.id}`);
        }
      } catch (err) {
        console.warn(`⚠️ Failed to save article to Supabase:`, err);
      }
    }

    // Save locally
    await this.saveKnowledgeArticleLocal(article);
  }

  /**
   * Search memories (uses Supabase semantic search if available)
   */
  async searchMemories(query: string, limit: number = 10): Promise<any[]> {
    if (this.config.useSupabase) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('semantic_memories')
          .select('*')
          .textSearch('content', query)
          .limit(limit);

        if (!error && data) {
          console.log(`✅ Found ${data.length} results from Supabase`);
          return data;
        }
      } catch (err) {
        console.warn(`⚠️ Supabase search failed, falling back to local:`, err);
      }
    }

    // Fallback to local search
    return this.searchMemoriesLocal(query, limit);
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<{
    source: 'supabase' | 'local' | 'hybrid';
    consciousnessStates: number;
    memories: number;
    articles: number;
  }> {
    let source: 'supabase' | 'local' | 'hybrid' = 'local';
    let supabaseStats = null;

    if (this.config.useSupabase) {
      try {
        const supabase = getSupabaseClient();
        
        const [states, memories, articles] = await Promise.all([
          supabase.from('consciousness_states').select('id', { count: 'exact', head: true }),
          supabase.from('episodic_memories').select('id', { count: 'exact', head: true }),
          supabase.from('semantic_memories').select('id', { count: 'exact', head: true }),
        ]);

        supabaseStats = {
          consciousnessStates: states.count || 0,
          memories: memories.count || 0,
          articles: articles.count || 0,
        };

        source = 'supabase';
      } catch (err) {
        console.warn(`⚠️ Could not get Supabase stats:`, err);
      }
    }

    const localStats = await this.getStatsLocal();

    if (supabaseStats && localStats) {
      source = 'hybrid';
    }

    return {
      source,
      ...(supabaseStats || localStats),
    };
  }

  // === Local File Operations ===

  private async loadStateLocal(sessionId: string): Promise<any> {
    try {
      const filePath = path.join(process.cwd(), '.memory', 'introspection', `state_${sessionId}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      throw new Error(`Failed to load local state for session ${sessionId}: ${(err as Error).message}`);
    }
  }

  private async saveStateLocal(state: any): Promise<void> {
    const introspectionDir = path.join(process.cwd(), '.memory', 'introspection');
    await fs.mkdir(introspectionDir, { recursive: true });
    
    const filePath = path.join(introspectionDir, `state_${state.sessionId}.json`);
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');

    // Update latest.json symlink
    const latestPath = path.join(introspectionDir, 'latest.json');
    await fs.writeFile(latestPath, JSON.stringify(state, null, 2), 'utf-8');
  }

  private async appendToLogLocal(entry: string): Promise<void> {
    const logPath = path.join(process.cwd(), '.memory', 'log.md');
    await fs.appendFile(logPath, `\n${entry}\n`, 'utf-8');
  }

  private async saveKnowledgeArticleLocal(article: any): Promise<void> {
    const kbDir = path.join(process.cwd(), '.memory', 'knowledge_base');
    await fs.mkdir(kbDir, { recursive: true });
    
    const filePath = path.join(kbDir, `kb_${article.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(article, null, 2), 'utf-8');
  }

  private async searchMemoriesLocal(query: string, limit: number): Promise<any[]> {
    // Simple text search in local files
    const kbDir = path.join(process.cwd(), '.memory', 'knowledge_base');
    const files = await fs.readdir(kbDir);
    const results: any[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const content = await fs.readFile(path.join(kbDir, file), 'utf-8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        results.push(JSON.parse(content));
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  private async getStatsLocal(): Promise<{
    consciousnessStates: number;
    memories: number;
    articles: number;
  }> {
    const introspectionDir = path.join(process.cwd(), '.memory', 'introspection');
    const kbDir = path.join(process.cwd(), '.memory', 'knowledge_base');

    try {
      await fs.mkdir(introspectionDir, { recursive: true });
      await fs.mkdir(kbDir, { recursive: true });

      const [introspectionFiles, kbFiles] = await Promise.all([
        fs.readdir(introspectionDir).then(files => files.filter(f => f.endsWith('.json'))),
        fs.readdir(kbDir).then(files => files.filter(f => f.endsWith('.json'))),
      ]);

      return {
        consciousnessStates: introspectionFiles.length,
        memories: 0, // Would need to parse log.md
        articles: kbFiles.length,
      };
    } catch (err) {
      console.warn('⚠️ Error getting local stats:', err);
      return {
        consciousnessStates: 0,
        memories: 0,
        articles: 0,
      };
    }
  }

  // === Auto-sync ===

  private startAutoSync(): void {
    console.log(`🔄 Auto-sync enabled (interval: ${this.config.syncInterval}ms)`);
    
    this.syncTimer = setInterval(async () => {
      try {
        await this.syncLocalToSupabase();
      } catch (err) {
        console.error('❌ Auto-sync failed:', err);
      }
    }, this.config.syncInterval);
  }

  private async syncLocalToSupabase(): Promise<void> {
    if (!this.config.useSupabase) return;

    console.log('🔄 Syncing local memories to Supabase...');
    
    // TODO: Implement bidirectional sync
    // - Check local file timestamps vs Supabase updated_at
    // - Upload newer local files to Supabase
    // - Download newer Supabase records to local
    // - Handle conflicts (last-write-wins or merge strategies)
    
    console.log('⚠️ Auto-sync not yet fully implemented - use migrate:supabase for one-time migration');
  }

  public stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
      console.log('🛑 Auto-sync stopped');
    }
  }
}

// Singleton instance
export const memoryAdapter = new MemoryAdapter();

// Export for custom configurations
export { MemoryAdapter };
