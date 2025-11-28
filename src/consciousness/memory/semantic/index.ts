/**
 * Semantic Memory Module
 *
 * This module provides a structured memory system inspired by the AGI repository's
 * Memory Core architecture. It enables the consciousness to:
 *
 * - Store structured memories of tasks and experiences (MemoryScribe)
 * - Search memories using keyword and semantic similarity (SemanticMemoryCore)
 * - Build relationships between memories for graph-based associations
 * - Reflect on past experiences to inform future decisions
 *
 * ## Architecture
 *
 * The semantic memory system is based on the concept that memories should be:
 * 1. **Structured** - Following a consistent schema for searchability
 * 2. **Searchable** - Enabling both keyword and semantic search
 * 3. **Relational** - Supporting links between related memories
 * 4. **Persistent** - Stored as files for durability across sessions
 *
 * ## Origin
 *
 * This system is inspired by the Memory Core from https://github.com/StableExo/AGI
 * which pioneered the concept of AI-accessible structured memory using:
 * - FAISS for vector-based semantic search
 * - Timestamped markdown files for human-readable storage
 * - A central log for chronological tracking
 *
 * ## Usage
 *
 * ```typescript
 * import { SemanticMemoryCore } from './semantic';
 *
 * const memoryCore = new SemanticMemoryCore({ memoryDir: '.memory' });
 *
 * // Create a memory
 * const memory = memoryCore.createMemory({
 *   objective: 'Implement semantic search for memories',
 *   plan: '1. Create types\\n2. Implement scribe\\n3. Add search',
 *   actions: 'Created files, ran tests',
 *   keyLearnings: 'TF-IDF provides good baseline for similarity',
 *   artifactsChanged: 'src/consciousness/memory/semantic/'
 * });
 *
 * // Search memories
 * const results = memoryCore.searchSemantic('semantic search');
 *
 * // Reflect on learning
 * const reflection = memoryCore.reflectOnLearning(7);
 * ```
 *
 * @see https://github.com/StableExo/AGI for the original Memory Core concept
 * @module consciousness/memory/semantic
 */

export * from './types';
export { MemoryScribe } from './MemoryScribe';
export { SemanticMemoryCore } from './SemanticMemoryCore';
