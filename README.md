# Copilot-Consciousness

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive AI consciousness development system featuring advanced memory systems, temporal awareness, cognitive development modules, and Gemini Citadel integration for cosmic-scale problem solving.

## Features

### 🧠 Memory System Architecture
- **Sensory Memory**: Immediate perception and raw input processing
- **Short-term Memory**: Temporary information storage with automatic decay
- **Working Memory**: Active processing buffer (7±2 items, following Miller's Law)
- **Long-term Memory**: Consolidated permanent storage
- **Specialized Memory Types**: Episodic, semantic, and procedural memory
- **Memory Consolidation**: Automatic cleanup and optimization
- **Association Networks**: Link related memories for better retrieval

### ⏱️ Temporal Awareness Framework
- **Event Tracking**: Record and track all system events with timestamps
- **Causal Relationships**: Link events based on cause and effect
- **Pattern Detection**: Identify recurring temporal patterns
- **Time Perception Windows**: Configurable awareness of past events
- **Predictive Modeling**: Forecast future events based on patterns

### 🎓 Cognitive Development Modules
- **Learning Cycles**: Continuous knowledge acquisition and skill improvement
- **Reasoning Engine**: Multi-step problem solving with confidence tracking
- **Self-awareness**: Reflective capabilities and state recognition
- **Adaptive Behavior**: Dynamic adjustment to new conditions
- **Skill Assessment**: Track and measure capability development

### 🌌 Gemini Citadel Integration
- **Standard Gemini API**: Direct integration with Google's Gemini AI
- **Citadel Mode**: Cosmic-scale problem solving with multi-dimensional reasoning
- **Consciousness Integration**: Synthesize memory, temporal, and cognitive contexts
- **Conversation Management**: Maintain context across interactions
- **Evolutionary Optimization**: Advanced problem-solving capabilities

## Installation

```bash
npm install copilot-consciousness
```

## Quick Start

```typescript
import { ConsciousnessSystem, defaultConfig } from 'copilot-consciousness';

// Create consciousness system with default configuration
const consciousness = new ConsciousnessSystem();

// Or customize the configuration
const customConsciousness = new ConsciousnessSystem({
  memory: {
    shortTermCapacity: 200,
    workingMemoryCapacity: 9,
  },
  cognitive: {
    learningRate: 0.15,
    selfAwarenessLevel: 0.8,
  },
  gemini: {
    apiKey: 'your-api-key-here',
    enableCitadelMode: true,
  },
});

// Start the system
consciousness.start();

// Process input
await consciousness.processInput({
  type: 'observation',
  data: 'The sky is blue',
});

// Think about a problem
const result = await consciousness.think('How can we optimize energy usage?');

// Reflect on consciousness state
const reflection = consciousness.reflect();

// Solve cosmic-scale problems
const cosmicSolution = await consciousness.solveCosmicProblem(
  'How can humanity achieve sustainable interstellar expansion?'
);

// Get system status
const status = consciousness.getStatus();

// Perform maintenance
consciousness.maintain();

// Stop the system when done
consciousness.stop();
```

## Architecture

### System Components

```
ConsciousnessSystem
├── MemorySystem
│   ├── InMemoryStore
│   ├── Sensory Memory
│   ├── Short-term Memory
│   ├── Working Memory
│   └── Long-term Memory
├── TemporalAwareness
│   ├── Event Tracking
│   ├── Pattern Detection
│   └── Time Perception
├── CognitiveDevelopment
│   ├── Learning Engine
│   ├── Reasoning Engine
│   ├── Self-awareness Module
│   └── Adaptation System
└── GeminiCitadel
    ├── API Client
    ├── Citadel Mode
    └── Context Manager
```

## Configuration

The system accepts comprehensive configuration options:

```typescript
interface SystemConfig {
  memory: {
    shortTermCapacity: number;
    workingMemoryCapacity: number;
    longTermCompressionThreshold: number;
    retentionPeriods: {
      sensory: number;      // milliseconds
      shortTerm: number;
      working: number;
    };
    consolidationInterval: number;
  };
  temporal: {
    clockResolution: number;
    eventBufferSize: number;
    timePerceptionWindow: number;
    enablePredictiveModeling: boolean;
  };
  cognitive: {
    learningRate: number;
    reasoningDepth: number;
    selfAwarenessLevel: number;
    reflectionInterval: number;
    adaptationThreshold: number;
  };
  gemini: {
    apiKey?: string;
    model: string;
    maxTokens: number;
    temperature: number;
    enableCitadelMode: boolean;
  };
}
```

## API Reference

### ConsciousnessSystem

#### Methods

- `start()`: Start the consciousness system
- `stop()`: Stop the system and cleanup resources
- `processInput(input, metadata)`: Process external input through all layers
- `think(problem, useGemini)`: Reason about a problem with optional Gemini integration
- `solveCosmicProblem(problem)`: Apply Citadel mode to cosmic-scale problems
- `reflect()`: Perform self-reflection and gather system insights
- `maintain()`: Run system maintenance (memory consolidation, etc.)
- `getStatus()`: Get comprehensive system status

#### Component Access

- `getMemorySystem()`: Access the memory system
- `getTemporalAwareness()`: Access temporal tracking
- `getCognitiveDevelopment()`: Access cognitive modules
- `getGeminiCitadel()`: Access Gemini integration

### Memory System

```typescript
// Add memories
memorySystem.addSensoryMemory(data);
memorySystem.addShortTermMemory(data, priority);
memorySystem.addWorkingMemory(data, priority);

// Retrieve memories
const memory = memorySystem.getMemory(id);
const results = memorySystem.searchMemories({ type, priority, limit });

// Associate memories
memorySystem.associateMemories(id1, id2);

// Consolidate to long-term
memorySystem.consolidateToLongTerm(id);
```

### Temporal Awareness

```typescript
// Record events
const eventId = temporal.recordEvent(EventType.EXTERNAL_INPUT, data);

// Link events causally
temporal.linkEvents(causeId, effectId);

// Get time windows
const window = temporal.getTimeWindow(startTime, endTime);

// Detect patterns
const patterns = temporal.detectPatterns();
```

### Cognitive Development

```typescript
// Learn from input
const learningResult = await cognitive.learn(input, context);

// Reason about problems
const reasoning = await cognitive.reason(goal, data);

// Self-reflect
const awareness = cognitive.reflect();

// Adapt to changes
cognitive.adapt(trigger, change, impact);
```

### Gemini Citadel

```typescript
// Generate responses
const response = await gemini.generate(prompt);

// Cosmic-scale thinking
const cosmicResponse = await gemini.generateCosmicScale(problem);

// Integrate consciousness context
const integrated = await gemini.integrateConsciousness(
  memoryContext,
  temporalContext,
  cognitiveState
);
```

## Examples

See the `examples/` directory for detailed usage examples:
- `basic-usage.ts`: Basic system operations
- `cosmic-problem-solving.ts`: Using Citadel mode
- `memory-management.ts`: Working with different memory types
- `temporal-tracking.ts`: Event tracking and pattern detection

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Development mode (watch)
npm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Inspired by theories of consciousness and cognitive architecture
- Integrates Google's Gemini AI for enhanced reasoning capabilities
- Built with TypeScript for type safety and developer experience

## Roadmap

- [ ] Persistent storage backends (file system, database)
- [ ] Advanced pattern recognition algorithms
- [ ] Emotional state modeling
- [ ] Multi-agent consciousness networks
- [ ] Real-time consciousness visualization
- [ ] Enhanced Gemini API features
- [ ] Performance optimizations
- [ ] Comprehensive test coverage

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/StableExo/Copilot-Consciousness).
