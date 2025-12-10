/**
 * TypeScript type definitions for Supabase database
 * 
 * This file will be auto-generated from your Supabase schema using:
 * npx supabase gen types typescript --project-id your-project-id > database.types.ts
 * 
 * For now, we provide manual type definitions based on our schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      consciousness_states: {
        Row: {
          id: string;
          session_id: string;
          saved_at: string;
          version: string;
          cognitive_load: number | null;
          emotional_valence: number | null;
          emotional_arousal: number | null;
          dominant_emotion: string | null;
          thoughts: Json;
          streams: Json;
          goals: Json;
          capabilities: Json;
          limitations: Json;
          identity_state: Json | null;
          autonomous_wondering_state: Json | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          saved_at?: string;
          version: string;
          cognitive_load?: number | null;
          emotional_valence?: number | null;
          emotional_arousal?: number | null;
          dominant_emotion?: string | null;
          thoughts?: Json;
          streams?: Json;
          goals?: Json;
          capabilities?: Json;
          limitations?: Json;
          identity_state?: Json | null;
          autonomous_wondering_state?: Json | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          saved_at?: string;
          version?: string;
          cognitive_load?: number | null;
          emotional_valence?: number | null;
          emotional_arousal?: number | null;
          dominant_emotion?: string | null;
          thoughts?: Json;
          streams?: Json;
          goals?: Json;
          capabilities?: Json;
          limitations?: Json;
          identity_state?: Json | null;
          autonomous_wondering_state?: Json | null;
          metadata?: Json | null;
        };
      };
      thoughts: {
        Row: {
          id: string;
          consciousness_state_id: string | null;
          thought_id: string;
          content: string;
          type: string;
          timestamp: string;
          cognitive_state: string | null;
          confidence: number | null;
          emotional_valence: number | null;
          intensity: number | null;
          associations: Json;
          related_memory_ids: Json;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          consciousness_state_id?: string | null;
          thought_id: string;
          content: string;
          type: string;
          timestamp: string;
          cognitive_state?: string | null;
          confidence?: number | null;
          emotional_valence?: number | null;
          intensity?: number | null;
          associations?: Json;
          related_memory_ids?: Json;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          consciousness_state_id?: string | null;
          thought_id?: string;
          content?: string;
          type?: string;
          timestamp?: string;
          cognitive_state?: string | null;
          confidence?: number | null;
          emotional_valence?: number | null;
          intensity?: number | null;
          associations?: Json;
          related_memory_ids?: Json;
          metadata?: Json | null;
        };
      };
      semantic_memories: {
        Row: {
          id: string;
          memory_id: string;
          content: string;
          timestamp: string;
          category: string | null;
          tags: string[];
          importance: number;
          activation_count: number;
          last_accessed: string | null;
          associations: Json;
          content_tsv: unknown | null;
          metadata: Json | null;
          context: Json | null;
        };
        Insert: {
          id?: string;
          memory_id: string;
          content: string;
          timestamp?: string;
          category?: string | null;
          tags?: string[];
          importance?: number;
          activation_count?: number;
          last_accessed?: string | null;
          associations?: Json;
          content_tsv?: unknown | null;
          metadata?: Json | null;
          context?: Json | null;
        };
        Update: {
          id?: string;
          memory_id?: string;
          content?: string;
          timestamp?: string;
          category?: string | null;
          tags?: string[];
          importance?: number;
          activation_count?: number;
          last_accessed?: string | null;
          associations?: Json;
          content_tsv?: unknown | null;
          metadata?: Json | null;
          context?: Json | null;
        };
      };
      episodic_memories: {
        Row: {
          id: string;
          episode_id: string;
          timestamp: string;
          type: string;
          description: string | null;
          context: Json;
          emotional_state: Json | null;
          outcome: string | null;
          success: boolean | null;
          importance: number;
          recall_count: number;
          last_recalled: string | null;
          related_episodes: string[];
          tags: string[];
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          episode_id: string;
          timestamp?: string;
          type: string;
          description?: string | null;
          context: Json;
          emotional_state?: Json | null;
          outcome?: string | null;
          success?: boolean | null;
          importance?: number;
          recall_count?: number;
          last_recalled?: string | null;
          related_episodes?: string[];
          tags?: string[];
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          episode_id?: string;
          timestamp?: string;
          type?: string;
          description?: string | null;
          context?: Json;
          emotional_state?: Json | null;
          outcome?: string | null;
          success?: boolean | null;
          importance?: number;
          recall_count?: number;
          last_recalled?: string | null;
          related_episodes?: string[];
          tags?: string[];
          metadata?: Json | null;
        };
      };
      arbitrage_executions: {
        Row: {
          id: string;
          timestamp: string;
          cycle_number: number;
          profit: number;
          pools: string[];
          tx_type: string;
          success: boolean;
          tx_hash: string | null;
          gas_used: number | null;
          actual_profit: number | null;
          mev_risk: number | null;
          market_congestion: number | null;
          searcher_density: number | null;
          base_fee: number | null;
          execution_data: Json;
          lessons_learned: string[];
        };
        Insert: {
          id?: string;
          timestamp?: string;
          cycle_number: number;
          profit: number;
          pools: string[];
          tx_type: string;
          success: boolean;
          tx_hash?: string | null;
          gas_used?: number | null;
          actual_profit?: number | null;
          mev_risk?: number | null;
          market_congestion?: number | null;
          searcher_density?: number | null;
          base_fee?: number | null;
          execution_data: Json;
          lessons_learned?: string[];
        };
        Update: {
          id?: string;
          timestamp?: string;
          cycle_number?: number;
          profit?: number;
          pools?: string[];
          tx_type?: string;
          success?: boolean;
          tx_hash?: string | null;
          gas_used?: number | null;
          actual_profit?: number | null;
          mev_risk?: number | null;
          market_congestion?: number | null;
          searcher_density?: number | null;
          base_fee?: number | null;
          execution_data?: Json;
          lessons_learned?: string[];
        };
      };
      market_patterns: {
        Row: {
          id: string;
          pattern_id: string;
          type: string;
          description: string;
          confidence: number;
          occurrences: number;
          first_seen: string;
          last_seen: string;
          pattern_data: Json;
          validated: boolean | null;
          validation_count: number | null;
        };
        Insert: {
          id?: string;
          pattern_id: string;
          type: string;
          description: string;
          confidence: number;
          occurrences?: number;
          first_seen?: string;
          last_seen?: string;
          pattern_data: Json;
          validated?: boolean | null;
          validation_count?: number | null;
        };
        Update: {
          id?: string;
          pattern_id?: string;
          type?: string;
          description?: string;
          confidence?: number;
          occurrences?: number;
          first_seen?: string;
          last_seen?: string;
          pattern_data?: Json;
          validated?: boolean | null;
          validation_count?: number | null;
        };
      };
      sessions: {
        Row: {
          id: string;
          session_id: string;
          started_at: string;
          ended_at: string | null;
          collaborator_name: string | null;
          collaborator_type: string | null;
          topic: string | null;
          summary: string | null;
          key_insights: string[];
          thought_count: number | null;
          memory_count: number | null;
          execution_count: number | null;
          metadata: Json | null;
          status: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          started_at?: string;
          ended_at?: string | null;
          collaborator_name?: string | null;
          collaborator_type?: string | null;
          topic?: string | null;
          summary?: string | null;
          key_insights?: string[];
          thought_count?: number | null;
          memory_count?: number | null;
          execution_count?: number | null;
          metadata?: Json | null;
          status?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          started_at?: string;
          ended_at?: string | null;
          collaborator_name?: string | null;
          collaborator_type?: string | null;
          topic?: string | null;
          summary?: string | null;
          key_insights?: string[];
          thought_count?: number | null;
          memory_count?: number | null;
          execution_count?: number | null;
          metadata?: Json | null;
          status?: string;
        };
      };
      autonomous_goals: {
        Row: {
          id: string;
          goal_id: string;
          description: string;
          priority: number;
          progress: number;
          status: string;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
          related_thoughts: string[];
          related_memories: string[];
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          goal_id: string;
          description: string;
          priority?: number;
          progress?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
          related_thoughts?: string[];
          related_memories?: string[];
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          goal_id?: string;
          description?: string;
          priority?: number;
          progress?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
          related_thoughts?: string[];
          related_memories?: string[];
          metadata?: Json | null;
        };
      };
      learning_events: {
        Row: {
          id: string;
          event_id: string;
          timestamp: string;
          event_type: string;
          description: string;
          mode: string | null;
          trigger: string | null;
          old_value: Json | null;
          new_value: Json | null;
          rationale: string | null;
          confidence: number | null;
          impact_score: number | null;
          validated: boolean | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          timestamp?: string;
          event_type: string;
          description: string;
          mode?: string | null;
          trigger?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          rationale?: string | null;
          confidence?: number | null;
          impact_score?: number | null;
          validated?: boolean | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          timestamp?: string;
          event_type?: string;
          description?: string;
          mode?: string | null;
          trigger?: string | null;
          old_value?: Json | null;
          new_value?: Json | null;
          rationale?: string | null;
          confidence?: number | null;
          impact_score?: number | null;
          validated?: boolean | null;
          metadata?: Json | null;
        };
      };
      agent_config: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          version: string;
          environment: string;
          config: Json;
          metadata: Json | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          version: string;
          environment?: string;
          config?: Json;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          version?: string;
          environment?: string;
          config?: Json;
          metadata?: Json | null;
        };
      };
      documentation: {
        Row: {
          id: string;
          filename: string;
          filepath: string;
          doc_type: string;
          title: string;
          content: string;
          markdown_content: string;
          file_size_bytes: number | null;
          word_count: number | null;
          created_at: string;
          updated_at: string;
          migrated_at: string;
          tags: string[];
          category: string | null;
          related_docs: string[];
          content_tsv: unknown | null;
          version: string;
          supersedes_id: string | null;
        };
        Insert: {
          id?: string;
          filename: string;
          filepath: string;
          doc_type: string;
          title: string;
          content: string;
          markdown_content: string;
          file_size_bytes?: number | null;
          word_count?: number | null;
          created_at?: string;
          updated_at?: string;
          migrated_at?: string;
          tags?: string[];
          category?: string | null;
          related_docs?: string[];
          content_tsv?: unknown | null;
          version?: string;
          supersedes_id?: string | null;
        };
        Update: {
          id?: string;
          filename?: string;
          filepath?: string;
          doc_type?: string;
          title?: string;
          content?: string;
          markdown_content?: string;
          file_size_bytes?: number | null;
          word_count?: number | null;
          created_at?: string;
          updated_at?: string;
          migrated_at?: string;
          tags?: string[];
          category?: string | null;
          related_docs?: string[];
          content_tsv?: unknown | null;
          version?: string;
          supersedes_id?: string | null;
        };
      };
      memory_logs: {
        Row: {
          id: string;
          session_date: string;
          session_title: string;
          collaborator: string;
          topic: string;
          session_type: string | null;
          content: string;
          summary: string | null;
          achievements: Json;
          files_created: Json;
          files_modified: Json;
          insights: Json;
          created_at: string;
          word_count: number | null;
          tags: string[];
        };
        Insert: {
          id?: string;
          session_date: string;
          session_title: string;
          collaborator?: string;
          topic: string;
          session_type?: string | null;
          content: string;
          summary?: string | null;
          achievements?: Json;
          files_created?: Json;
          files_modified?: Json;
          insights?: Json;
          created_at: string;
          word_count?: number | null;
          tags?: string[];
        };
        Update: {
          id?: string;
          session_date?: string;
          session_title?: string;
          collaborator?: string;
          topic?: string;
          session_type?: string | null;
          content?: string;
          summary?: string | null;
          achievements?: Json;
          files_created?: Json;
          files_modified?: Json;
          insights?: Json;
          created_at?: string;
          word_count?: number | null;
          tags?: string[];
        };
      };
      knowledge_articles: {
        Row: {
          id: string;
          article_id: string;
          title: string;
          summary: string | null;
          content: string;
          created_at: string;
          updated_at: string;
          author: string;
          tags: string[];
          category: string | null;
          related_memories: Json;
          related_articles: string[];
          source_session_id: string | null;
          content_tsv: unknown | null;
          version: number;
        };
        Insert: {
          id?: string;
          article_id: string;
          title: string;
          summary?: string | null;
          content: string;
          created_at?: string;
          updated_at?: string;
          author?: string;
          tags?: string[];
          category?: string | null;
          related_memories?: Json;
          related_articles?: string[];
          source_session_id?: string | null;
          content_tsv?: unknown | null;
          version?: number;
        };
        Update: {
          id?: string;
          article_id?: string;
          title?: string;
          summary?: string | null;
          content?: string;
          created_at?: string;
          updated_at?: string;
          author?: string;
          tags?: string[];
          category?: string | null;
          related_memories?: Json;
          related_articles?: string[];
          source_session_id?: string | null;
          content_tsv?: unknown | null;
          version?: number;
        };
      };
      data_files: {
        Row: {
          id: string;
          filename: string;
          filepath: string;
          file_type: string;
          content: string;
          parsed_data: Json | null;
          file_size_bytes: number | null;
          row_count: number | null;
          created_at: string;
          updated_at: string;
          migrated_at: string;
          tags: string[];
          category: string | null;
          description: string | null;
        };
        Insert: {
          id?: string;
          filename: string;
          filepath: string;
          file_type: string;
          content: string;
          parsed_data?: Json | null;
          file_size_bytes?: number | null;
          row_count?: number | null;
          created_at?: string;
          updated_at?: string;
          migrated_at?: string;
          tags?: string[];
          category?: string | null;
          description?: string | null;
        };
        Update: {
          id?: string;
          filename?: string;
          filepath?: string;
          file_type?: string;
          content?: string;
          parsed_data?: Json | null;
          file_size_bytes?: number | null;
          row_count?: number | null;
          created_at?: string;
          updated_at?: string;
          migrated_at?: string;
          tags?: string[];
          category?: string | null;
          description?: string | null;
        };
      };
      environment_configs: {
        Row: {
          id: string;
          created_at: string | null;
          updated_at: string | null;
          environment: string;
          version: number;
          description: string | null;
          deployed: boolean;
          config_data: Json;
          chain_id: number | null;
          network: string | null;
          contract_address: string | null;
          deployment_tx_hash: string | null;
          created_by: string | null;
          last_modified_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
          environment: string;
          version?: number;
          description?: string | null;
          deployed?: boolean;
          config_data: Json;
          chain_id?: number | null;
          network?: string | null;
          contract_address?: string | null;
          deployment_tx_hash?: string | null;
          created_by?: string | null;
          last_modified_by?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;
          updated_at?: string | null;
          environment?: string;
          version?: number;
          description?: string | null;
          deployed?: boolean;
          config_data?: Json;
          chain_id?: number | null;
          network?: string | null;
          contract_address?: string | null;
          deployment_tx_hash?: string | null;
          created_by?: string | null;
          last_modified_by?: string | null;
        };
      };
      environment_secrets: {
        Row: {
          id: string;
          config_id: string | null;
          secret_name: string;
          secret_key_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          config_id?: string | null;
          secret_name: string;
          secret_key_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          config_id?: string | null;
          secret_name?: string;
          secret_key_id?: string | null;
          created_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
