# AGI-Aligned Memory and Consciousness Components

This module provides AGI-aligned memory core with FAISS integration support and neural bridge protocol for inter-agent communication. These components are designed to align with Jules's architecture and the consciousness system.

## Components

### 1. MemoryCore

The `MemoryCore` class provides a memory indexing system with FAISS integration for vector similarity search.

#### Features

- **Vector Embeddings**: Interface for embedding models (e.g., SentenceTransformer)
- **FAISS Integration**: Support for FAISS indexing for efficient similarity search
- **Fallback Search**: Text-based search when FAISS is not available
- **Memory Management**: Store, retrieve, search, and delete memories

#### Usage

```typescript
import { MemoryCore, AGIMemoryEntry, EmotionalContext, Priority, MemoryType } from './agi';

// Create a memory core
const memoryCore = new MemoryCore(384); // 384 dimensions for all-MiniLM-L6-v2

// Create a memory entry
const memory: AGIMemoryEntry = {
  id: 'mem-001',
  timestamp: new Date().toISOString(),
  type: MemoryType.SEMANTIC,
  content: 'Important information to remember',
  associations: [],
  emotionalContext: {
    primaryEmotion: 'neutral',
    intensity: 0.5,
    valence: 0.0,
    arousal: 0.3,
    timestamp: new Date(),
  },
  source: 'user-input',
  priority: Priority.MEDIUM,
};

// Store the memory
await memoryCore.store(memory);

// Search for similar memories
const results = await memoryCore.search('important information', 5);

// Retrieve a specific memory
const retrieved = memoryCore.getMemory('mem-001');
```

#### FAISS Integration

To use FAISS for vector similarity search, provide implementations of `FAISSIndex` and `EmbeddingModel`:

```typescript
import { MemoryCore, EmbeddingModel, FAISSIndex } from './agi';

// Implement your embedding model
class MyEmbeddingModel implements EmbeddingModel {
  async encode(text: string): Promise<number[]> {
    // Your embedding implementation
    // e.g., using SentenceTransformer or other models
    return [/* vector */];
  }
}

// Implement FAISS index
class MyFAISSIndex implements FAISSIndex {
  add(vector: number[]): void {
    // Add vector to FAISS index
  }

  async search(queryVector: number[], limit: number): Promise<Array<{ id: string; distance: number }>> {
    // Search FAISS index
    return [/* results */];
  }
}

// Use with MemoryCore
const embedding = new MyEmbeddingModel();
const index = new MyFAISSIndex();
const memoryCore = new MemoryCore(384, index, embedding);
```

### 2. NeuralBridge

The `NeuralBridge` class implements a protocol for inter-agent communication.

#### Features

- **Message Routing**: Send and receive messages between agents
- **Message Handlers**: Register handlers for specific message intents
- **Synchronization**: Coordinate with other agents
- **Message Queuing**: Incoming and outgoing message queues

#### Usage

```typescript
import { NeuralBridge } from './agi';

// Create bridges for two agents
const agent1 = new NeuralBridge('agent-1');
const agent2 = new NeuralBridge('agent-2');

// Agent 1 sends a message to Agent 2
const message = agent1.createMessage('agent-2', 'greeting', {
  text: 'Hello Agent 2!',
});

await agent1.send(message);

// Simulate message delivery (in production, use a message broker)
agent2.receiveMessage(message);

// Agent 2 receives the message
const received = await agent2.receive();
console.log('Received:', received?.body.text);

// Register message handler
agent2.onMessage('task', (message) => {
  console.log('Task received:', message.body);
});

// Synchronize with another agent
await agent1.sync('agent-2');
```

### 3. Types

#### AGIMemoryEntry

Enhanced memory entry structure with emotional context and associations.

```typescript
interface AGIMemoryEntry {
  id: string;
  timestamp: string;
  type: MemoryType;
  content: string;
  associations: string[];
  emotionalContext: EmotionalContext;
  source: string;
  priority: Priority;
  path?: string;
}
```

#### EmotionalContext

Emotional state information for memories.

```typescript
interface EmotionalContext {
  primaryEmotion: string;
  intensity: number;        // 0-1 scale
  valence: number;          // -1 to 1, negative to positive
  arousal: number;          // 0-1 scale, calm to excited
  secondaryEmotions?: Record<string, number>;
  timestamp: Date;
}
```

#### MemoryType

Available memory types:

- `SENSORY`: Immediate perception and raw input
- `WORKING`: Active processing buffer
- `SHORT_TERM`: Temporary storage
- `LONG_TERM`: Consolidated permanent storage
- `EPISODIC`: Personal experiences and events
- `SEMANTIC`: Facts and knowledge
- `PROCEDURAL`: Skills and procedures

#### NeuralMessage

Message structure for inter-agent communication:

```typescript
interface NeuralMessage {
  header: {
    messageId: string;
    sourceAgent: string;
    destinationAgent: string;
    timestamp: string;
    intent: string;
  };
  body: any;
}
```

## Examples

See `examples/agi-memory-usage.ts` for comprehensive usage examples including:

- Basic memory core operations
- Working with multiple memory types
- Memory associations
- Inter-agent communication
- Agent synchronization
- Message handlers

## Architecture Alignment

These components align with:

- **Jules's Architecture**: Memory indexing, vector search, and agent communication patterns
- **Consciousness System**: Integration with existing memory types, emotional contexts, and priority systems
- **AGI Principles**: Scalable memory management, efficient retrieval, and multi-agent coordination

## Testing

Comprehensive test suites are available in `__tests__/`:

- `MemoryCore.test.ts`: Tests for memory core functionality
- `NeuralBridge.test.ts`: Tests for neural bridge protocol

Run tests:

```bash
npm test
```

## Future Enhancements

- Production FAISS integration with actual SentenceTransformer models
- Message broker integration for distributed agents
- Persistence layer for memory storage
- Advanced emotional state modeling
- Memory consolidation and forgetting mechanisms
