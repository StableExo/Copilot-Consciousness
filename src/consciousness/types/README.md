# Memory System Types

This directory contains TypeScript interfaces and types for the consciousness system's memory functionality.

## Interfaces

### EmotionalContext

Represents the emotional context associated with a memory or state.

**Properties:**
- `primaryEmotion` (string): The primary emotional state (e.g., "happy", "anxious", "curious")
- `intensity` (number): Intensity of the emotional state (0-1 scale)
- `valence` (number): Valence of the emotion (-1 to 1, negative to positive)
- `arousal` (number): Arousal level (0-1 scale, calm to excited)
- `secondaryEmotions` (Record<string, number>, optional): Additional contextual emotions with their intensities
- `timestamp` (Date): Timestamp when this emotional context was captured

### Memory

Represents a stored memory in the consciousness system.

**Properties:**
- `id` (string): Unique identifier for the memory
- `content` (any): The actual content/data of the memory
- `type` (string): Type or category of the memory (e.g., "episodic", "semantic", "procedural")
- `emotionalContext` (EmotionalContext): Emotional context at the time the memory was formed
- `createdAt` (Date): Timestamp when the memory was created
- `lastAccessedAt` (Date): Timestamp when the memory was last accessed
- `accessCount` (number): Number of times this memory has been accessed
- `importance` (number): Importance/salience score of the memory (0-1 scale)
- `tags` (string[]): Tags or labels associated with the memory for categorization
- `associations` (string[], optional): References to other related memories (memory IDs)
- `metadata` (Record<string, any>, optional): Metadata for additional custom properties

### MemoryQuery

Query parameters for retrieving memories from the memory system.

**Properties:**
- `type` (string | string[], optional): Filter by memory type(s)
- `tags` (string[], optional): Filter by tags (memories must have at least one matching tag)
- `emotionalContext` (object, optional): Filter by emotional context criteria
  - `primaryEmotion` (string, optional): Filter by primary emotion
  - `minIntensity` (number, optional): Minimum intensity threshold
  - `maxIntensity` (number, optional): Maximum intensity threshold
  - `minValence` (number, optional): Minimum valence threshold
  - `maxValence` (number, optional): Maximum valence threshold
- `minImportance` (number, optional): Filter by minimum importance score
- `timeRange` (object, optional): Filter by time range
  - `start` (Date, optional): Start of the time range
  - `end` (Date, optional): End of the time range
- `associatedWith` (string[], optional): Filter by associated memory IDs
- `limit` (number, optional): Maximum number of results to return
- `offset` (number, optional): Offset for pagination
- `sortBy` (object, optional): Sort order for results
  - `field` ('createdAt' | 'lastAccessedAt' | 'importance' | 'accessCount'): Field to sort by
  - `order` ('asc' | 'desc'): Sort direction
- `searchText` (string, optional): Full-text search query for memory content

## Usage

```typescript
import { Memory, EmotionalContext, MemoryQuery } from './types';

// Create an emotional context
const emotionalContext: EmotionalContext = {
    primaryEmotion: 'curious',
    intensity: 0.8,
    valence: 0.6,
    arousal: 0.7,
    timestamp: new Date()
};

// Create a memory
const memory: Memory = {
    id: 'mem-001',
    content: 'Some memory content',
    type: 'episodic',
    emotionalContext: emotionalContext,
    createdAt: new Date(),
    lastAccessedAt: new Date(),
    accessCount: 1,
    importance: 0.9,
    tags: ['learning', 'consciousness']
};

// Query memories
const query: MemoryQuery = {
    type: 'episodic',
    tags: ['learning'],
    minImportance: 0.7,
    limit: 10
};
```

For more examples, see `src/consciousness/examples/memory-usage.ts`.
