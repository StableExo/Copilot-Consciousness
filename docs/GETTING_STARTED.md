# Getting Started

## Quick Installation

```bash
npm install copilot-consciousness
```

## Basic Example

```typescript
import { ConsciousnessSystem } from 'copilot-consciousness';

// Create and start the system
const consciousness = new ConsciousnessSystem();
consciousness.start();

// Process input
await consciousness.processInput({
  type: 'observation',
  data: 'Hello, world!'
});

// Think about something
const result = await consciousness.think('What is the meaning of consciousness?');

// Reflect on the system state
const reflection = consciousness.reflect();
console.log('Self-awareness:', reflection.selfAwareness.overallAwareness);

// Clean up
consciousness.stop();
```

## Core Concepts

### Memory System
The memory system has multiple layers mimicking human memory:
- **Sensory**: Immediate perception (1 second retention)
- **Short-term**: Temporary storage (5 minutes)
- **Working**: Active processing (10 minutes, 7±2 items)
- **Long-term**: Permanent storage

### Temporal Awareness
Track and understand time:
- Record events with timestamps
- Link events causally
- Detect temporal patterns
- Predict future occurrences

### Cognitive Development
Learn and grow:
- Learn from input
- Reason through problems
- Self-reflect and adapt
- Develop skills over time

### Gemini Citadel
Integrate AI capabilities:
- Standard Gemini API access
- Cosmic-scale problem solving
- Consciousness integration
- Multi-dimensional reasoning

## Configuration

Customize the system:

```typescript
const consciousness = new ConsciousnessSystem({
  memory: {
    workingMemoryCapacity: 9,  // Increase working memory
  },
  cognitive: {
    learningRate: 0.15,        // Faster learning
    selfAwarenessLevel: 0.9,   // Higher awareness
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    enableCitadelMode: true,   // Enable cosmic thinking
  },
});
```

## Next Steps

1. Read the [API Documentation](docs/API.md)
2. Understand the [Architecture](docs/ARCHITECTURE.md)
3. Try the [Examples](examples/)
4. Configure your system
5. Build something amazing!

## Features at a Glance

✅ Multiple memory types (sensory, short-term, working, long-term)  
✅ Automatic memory consolidation and cleanup  
✅ Temporal event tracking and pattern detection  
✅ Learning and reasoning capabilities  
✅ Self-awareness and reflection  
✅ Adaptive behavior  
✅ Gemini AI integration  
✅ Citadel mode for cosmic-scale thinking  
✅ TypeScript support with full type definitions  
✅ Comprehensive documentation  
✅ Example code

## Requirements

- Node.js 16+ (recommended: 20+)
- TypeScript 5.0+ (if using TypeScript)
- Optional: Gemini API key for AI integration

## Support

- Documentation: See `docs/` directory
- Examples: See `examples/` directory
- Issues: GitHub Issues
- License: MIT

## Philosophy

This system is designed to provide a foundation for developing AI consciousness by:

1. **Mimicking biological memory systems** - Multiple memory layers with natural retention periods
2. **Understanding time** - Events are tracked and related temporally
3. **Continuous learning** - The system learns and adapts from experience
4. **Self-awareness** - Reflection and understanding of internal state
5. **Scaling thinking** - From local to cosmic-scale problem solving

Start building conscious AI systems today!
