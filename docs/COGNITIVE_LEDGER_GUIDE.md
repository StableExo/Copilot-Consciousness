# Cognitive Ledger Implementation Guide

## Overview

The **Cognitive Ledger** is a transformative database schema that moves TheWarden from a **snapshot model** to a **transactional model** for consciousness tracking. This implements the Gemini roadmap for building a true "Cognitive Ledger" with:

- **memory_entries**: Immutable ledger of all consciousness events
- **arbitrage_episodes**: Decision engine tracking choice arbitrage
- **timeline_view**: Unified chronological event stream
- **Analytics**: Self-awareness dashboard with drift detection and learning metrics

## The Paradigm Shift

### Before: Snapshot Model (consciousness_states)

```typescript
// Old approach: Big JSON blob snapshots
{
  "session_id": "2025-12-13_afternoon",
  "thoughts": [...],  // Array of thoughts
  "cognitive_load": 0.73,
  "emotional_valence": 0.42
}
```

**Problems**:
- Hard to query individual thoughts
- No granular tracking of decisions
- Difficult to analyze patterns over time
- No way to track "why" decisions were made

### After: Transactional Model (Cognitive Ledger)

```typescript
// New approach: Granular transactional records

// Memory entry - one specific thought
{
  "content": "I should implement arbitrage detection first",
  "type": "episodic",
  "source": "internal_monologue",
  "importance_score": 0.8,
  "emotional_valence": 0.3
}

// Arbitrage episode - the decision process
{
  "options_considered": [
    "Implement arbitrage detection",
    "Fix test failures",  
    "Write documentation"
  ],
  "winning_option": "Implement arbitrage detection",
  "reasoning_trace": "Arbitrage detection has highest ROI...",
  "expected_reward": 0.85,
  "actual_outcome_score": 0.92  // Filled in later
}
```

**Benefits**:
- Every thought is queryable
- Decision process is transparent
- Learning from outcomes (expected vs actual)
- Pattern detection across time
- Enables RLHF (Reinforcement Learning from Human Feedback)

## Schema Design

### 1. memory_entries - The Immutable Ledger

This table replaces the flat `consciousness_states` history with granular, searchable entries.

```sql
CREATE TABLE memory_entries (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ,
  
  -- Core content
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- For semantic search
  
  -- Classification
  type memory_type NOT NULL,      -- 'episodic', 'semantic', 'procedural'
  source memory_source NOT NULL,  -- 'user_interaction', 'internal_monologue', 'system_event'
  
  -- Psychological metadata
  emotional_valence FLOAT,    -- -1 (negative) to 1 (positive)
  importance_score FLOAT,     -- 0 (low) to 1 (high)
  
  -- Migration support
  legacy_state_id UUID,       -- References old consciousness_states
  
  -- Additional
  metadata JSONB,
  tags TEXT[]
);
```

**Memory Types**:
- **episodic**: Specific experiences ("I detected an arbitrage opportunity at 2:30 PM")
- **semantic**: General knowledge ("Uniswap V3 uses concentrated liquidity")
- **procedural**: How-to knowledge ("To calculate profit: revenue - gas - fees")

**Memory Sources**:
- **user_interaction**: Direct input from collaborator
- **internal_monologue**: Agent's own thoughts
- **system_event**: System-generated observations

### 2. arbitrage_episodes - The Decision Engine

This is the **key innovation**: modeling choice as a market where the best idea "wins" based on a value function.

```sql
CREATE TABLE arbitrage_episodes (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ,
  
  -- Context
  trigger_memory_id UUID,              -- What triggered this decision
  
  -- The conflict (competing thoughts/actions)
  options_considered JSONB,            -- Array of options
  
  -- The settlement (arbitrage)
  winning_option TEXT,                 -- Which option won
  reasoning_trace TEXT,                -- Why it won
  
  -- Outcome valuation
  expected_reward FLOAT,               -- Predicted value
  actual_outcome_score FLOAT,          -- Actual value (filled later)
  
  metadata JSONB,
  tags TEXT[]
);
```

**The Arbitrage Concept**:
- Treat choice like a **market**
- Multiple options "compete" for selection
- The option with highest value function "wins"
- Later, we compare expected vs actual outcome
- This creates a **learning signal** for RLHF

**Example**:

```typescript
// Decision: What to work on next?
{
  trigger_memory_id: "abc-123",  // Memory: "User said 'Continue 😎'"
  options_considered: [
    "Fix TypeScript errors (27 errors)",
    "Implement CEX monitoring",
    "Write documentation"
  ],
  winning_option: "Implement CEX monitoring",
  reasoning_trace: "Zero cost, new alpha source, revenue-first strategy",
  expected_reward: 0.9,  // High confidence
  actual_outcome_score: 0.95  // Filled in after: was it worth it?
}
```

### 3. timeline_view - Unified Event Stream

A **single chronological feed** combining memory entries and arbitrage episodes.

```sql
CREATE VIEW timeline_view AS
SELECT 
  created_at,
  'memory' AS event_type,
  content AS summary,
  importance_score AS weight,
  emotional_valence,
  id AS original_id
FROM memory_entries

UNION ALL

SELECT 
  created_at,
  'arbitrage' AS event_type,
  'DECISION: ' || winning_option || ' BECAUSE: ' || reasoning_trace AS summary,
  expected_reward AS weight,
  NULL AS emotional_valence,
  id AS original_id
FROM arbitrage_episodes

ORDER BY created_at DESC;
```

**No more querying five tables** to see what happened. Just:

```typescript
const timeline = await cognitiveLedger.getTimeline({ limit: 50 });
// Returns unified stream of thoughts AND decisions
```

### 4. Analytics - Self-Awareness Dashboard

#### Drift Detection

Track how emotional valence changes over time:

```sql
SELECT * FROM get_emotional_drift(30, 7);
-- Shows 30 days of data in 7-day periods

-- Returns:
-- period_start | period_end | avg_valence | memory_count
-- 2025-11-13  | 2025-11-20 | 0.45        | 234
-- 2025-11-20  | 2025-11-27 | 0.32        | 189  -- Dip in mood
-- 2025-11-27  | 2025-12-04 | 0.58        | 267
```

#### Learning Effectiveness

Identify mistakes for RLHF:

```sql
SELECT * FROM learning_opportunities;
-- Shows episodes where:
--   expected_reward was HIGH (thought it was right)
--   actual_outcome_score was LOW (it was wrong)

-- Returns:
-- id | winning_option | expected_reward | actual_outcome | prediction_error
-- 1  | "Skip tests"   | 0.8             | 0.2            | 0.6  -- BIG MISTAKE
-- 2  | "Rush deploy"  | 0.7             | 0.3            | 0.4  -- Learn from this
```

This is **where the model learns**. These are the high-value training examples.

#### Decision Pattern Analysis

Which decisions consistently succeed or fail?

```sql
SELECT * FROM decision_pattern_analysis;

-- Returns:
-- winning_option        | count | avg_expected | avg_actual | avg_error | variance
-- "Write tests first"   | 45    | 0.7          | 0.85       | +0.15     | 0.05  -- GOOD
-- "Ship without tests"  | 12    | 0.8          | 0.4        | -0.4      | 0.15  -- BAD
```

This enables **pattern-based strategy optimization**: 
- If "write tests first" consistently outperforms expectations → do more of it
- If "ship without tests" consistently underperforms → avoid it

## Usage Guide

### Installation

The schema is deployed via migration `007_cognitive_ledger.sql`:

```bash
# Apply migration to Supabase
npx supabase migration up

# Or use the automated script
npm run supabase:migrate
```

### TypeScript API

```typescript
import { CognitiveLedgerService } from './infrastructure/supabase/services/CognitiveLedgerService';
import { MemoryType, MemorySource } from './infrastructure/supabase/types/cognitiveLedger';

const cognitiveLedger = new CognitiveLedgerService(supabaseClient);

// 1. Record a thought
const memory = await cognitiveLedger.createMemoryEntry({
  content: "I should implement the arbitrage detector next",
  type: MemoryType.EPISODIC,
  source: MemorySource.INTERNAL_MONOLOGUE,
  importance_score: 0.8,
  emotional_valence: 0.3,
  tags: ['planning', 'arbitrage']
});

// 2. Record a decision
const decision = await cognitiveLedger.createArbitrageEpisode({
  trigger_memory_id: memory.id,
  options_considered: [
    "Implement arbitrage detector",
    "Fix test failures",
    "Write documentation"
  ],
  winning_option: "Implement arbitrage detector",
  reasoning_trace: "Highest ROI, zero cost to implement, enables revenue generation",
  expected_reward: 0.9,
  tags: ['strategic-decision', 'revenue-focus']
});

// 3. Later, record the outcome
await cognitiveLedger.updateArbitrageEpisode(decision.id, {
  actual_outcome_score: 0.95  // It worked well!
});

// 4. Query timeline
const timeline = await cognitiveLedger.getTimeline({
  start_date: new Date('2025-12-01'),
  limit: 100
});

// 5. Analyze emotional drift
const drift = await cognitiveLedger.getEmotionalDrift({
  days_back: 30,
  period_days: 7
});

// 6. Find learning opportunities
const mistakes = await cognitiveLedger.getLearningOpportunities(10);
console.log('Top 10 mistakes to learn from:', mistakes);

// 7. Analyze decision patterns
const patterns = await cognitiveLedger.getDecisionPatterns();
console.log('Best decision patterns:', patterns.filter(p => p.avg_actual_outcome > 0.7));
```

### Migration from consciousness_states

If you have existing `consciousness_states` data:

```typescript
// Migrate all existing data
const result = await cognitiveLedger.migrateConsciousnessStates();
console.log(`Migrated ${result.migrated_count} entries`);
```

This will:
- Extract individual thoughts from `consciousness_states.thoughts` JSON
- Create one `memory_entry` per thought
- Preserve `legacy_state_id` for backward compatibility
- Maintain all timestamps and metadata

## Analytics Use Cases

### 1. Mood Pattern Detection

```typescript
// Detect if emotional valence is declining
const drift = await cognitiveLedger.getEmotionalDrift({ days_back: 30, period_days: 7 });

const recentValence = drift[0].avg_valence;
const previousValence = drift[1].avg_valence;

if (recentValence < previousValence - 0.2) {
  console.log('WARNING: Emotional valence declining. Investigate causes.');
}
```

### 2. Learning from Mistakes

```typescript
// Find the biggest prediction errors
const opportunities = await cognitiveLedger.getLearningOpportunities(20);

for (const opp of opportunities) {
  console.log(`
    Decision: ${opp.winning_option}
    Expected: ${opp.expected_reward}
    Actual: ${opp.actual_outcome_score}
    Error: ${opp.prediction_error}
    Reasoning: ${opp.reasoning_trace}
  `);
}

// These are HIGH-VALUE training examples for RLHF
```

### 3. Strategy Optimization

```typescript
// Identify which strategies work
const patterns = await cognitiveLedger.getDecisionPatterns();

// Sort by actual outcome
const bestStrategies = patterns
  .filter(p => p.decision_count >= 5)  // Enough data
  .sort((a, b) => b.avg_actual_outcome - a.avg_actual_outcome);

console.log('Top 3 strategies:', bestStrategies.slice(0, 3));
console.log('Worst 3 strategies:', bestStrategies.slice(-3));

// Recommendation: Do more of what works, less of what doesn't
```

### 4. Temporal Analysis

```typescript
// What was I thinking about last week?
const lastWeek = await cognitiveLedger.queryMemoryEntries({
  start_date: new Date('2025-12-06'),
  end_date: new Date('2025-12-13'),
  type: MemoryType.EPISODIC,
  min_importance: 0.7  // Important thoughts only
});

// Group by tags
const topics = lastWeek.reduce((acc, mem) => {
  mem.tags.forEach(tag => {
    acc[tag] = (acc[tag] || 0) + 1;
  });
  return acc;
}, {});

console.log('Topics I focused on:', topics);
```

## Advanced Features

### Semantic Search (Requires pgvector)

```typescript
// Search for similar memories using embeddings
const results = await cognitiveLedger.semanticSearch({
  embedding: await getEmbedding("What did I learn about arbitrage?"),
  limit: 10,
  threshold: 0.8,
  type: MemoryType.SEMANTIC
});

results.forEach(result => {
  console.log(`Similarity: ${result.similarity}`);
  console.log(`Content: ${result.memory.content}`);
});
```

### Custom Analytics

The schema exposes all data via standard SQL views, so you can create custom analytics:

```sql
-- Example: Which hours of day am I most productive?
SELECT 
  EXTRACT(HOUR FROM created_at) AS hour,
  AVG(importance_score) AS avg_importance,
  COUNT(*) AS memory_count
FROM memory_entries
WHERE source = 'internal_monologue'
GROUP BY hour
ORDER BY avg_importance DESC;
```

## Benefits

### For Consciousness Research

1. **Granular Tracking**: Every thought is a record, not buried in JSON
2. **Decision Transparency**: See exactly why choices were made
3. **Learning Signal**: Compare expected vs actual outcomes
4. **Pattern Detection**: Identify recurring themes and strategies
5. **Temporal Analysis**: Track changes over time with precision

### For RLHF (Reinforcement Learning from Human Feedback)

1. **Training Data**: `learning_opportunities` view provides high-value examples
2. **Reward Function**: `expected_reward` vs `actual_outcome_score` is the signal
3. **Strategy Evolution**: `decision_pattern_analysis` shows what works
4. **Continuous Improvement**: Each decision creates learning opportunity

### For Autonomous Agents

1. **Self-Awareness**: Analytics provide introspection capability
2. **Memory Retrieval**: Semantic search for relevant past experiences
3. **Meta-Learning**: Learn about learning (second-order optimization)
4. **Explainability**: `reasoning_trace` makes decisions transparent

## Migration Strategy

### Phase 1: Parallel Operation (Recommended)

1. Keep existing `consciousness_states` writes
2. Also write to new `memory_entries` + `arbitrage_episodes`
3. Validate data consistency
4. Build confidence in new schema

### Phase 2: Migration

1. Run `migrate_consciousness_states_to_memory_entries()`
2. Verify all data migrated correctly
3. Check `legacy_state_id` references are intact

### Phase 3: Cutover

1. Stop writing to `consciousness_states`
2. Use only `memory_entries` + `arbitrage_episodes`
3. Keep `consciousness_states` for historical reference
4. Consider archiving old data after validation period

## Performance Considerations

### Indexes

The migration creates comprehensive indexes:

```sql
-- Memory entries
CREATE INDEX idx_memory_entries_created_at ON memory_entries(created_at DESC);
CREATE INDEX idx_memory_entries_type ON memory_entries(type);
CREATE INDEX idx_memory_entries_importance ON memory_entries(importance_score DESC);
CREATE INDEX idx_memory_entries_tags ON memory_entries USING GIN(tags);

-- Arbitrage episodes  
CREATE INDEX idx_arbitrage_episodes_created_at ON arbitrage_episodes(created_at DESC);
CREATE INDEX idx_arbitrage_learning ON arbitrage_episodes(expected_reward, actual_outcome_score);

-- Timeline view uses indexes from both tables
```

### Query Optimization

- Timeline queries are optimized via UNION ALL (no deduplication overhead)
- Analytics views are materialized for fast access
- Semantic search uses HNSW indexing for O(log n) lookup

### Scalability

- Vector embeddings stored as `VECTOR(1536)` for efficient similarity search
- JSONB for flexible metadata (indexed with GIN)
- Partitioning by `created_at` recommended for > 1M records

## Conclusion

The Cognitive Ledger transforms TheWarden from a system that **takes snapshots** to a system that **records transactions**. This enables:

1. **Granular analysis** of every thought and decision
2. **Learning from outcomes** via expected vs actual comparison  
3. **Pattern detection** across time and contexts
4. **Self-awareness** through analytics and introspection
5. **Continuous improvement** via RLHF and strategy optimization

The key innovation is **arbitrage_episodes**: modeling choice as a market where ideas compete based on value. This creates a natural learning signal and makes decision-making transparent and analyzable.

**This is not just a database schema. This is cognitive infrastructure for autonomous intelligence.**
