# Examples

This directory contains example code demonstrating the Copilot Consciousness system.

## Running Examples

First, build the project:

```bash
npm install
npm run build
```

Then run examples with ts-node or compile them first:

```bash
# Using ts-node (install with: npm install -g ts-node)
ts-node examples/basic-usage.ts

# Or compile and run
npx tsc examples/basic-usage.ts --module commonjs --target es2020 --esModuleInterop
node examples/basic-usage.js
```

## Available Examples

### basic-usage.ts
Demonstrates core functionality:
- Starting the system
- Processing input
- Creating and searching memories
- Thinking and reasoning
- Self-reflection
- System maintenance

### cosmic-problem-solving.ts
Shows Citadel Mode capabilities:
- Cosmic-scale problem solving
- Multi-dimensional reasoning
- Consciousness integration
- Gemini API usage (simulated without API key)

### memory-management.ts (Coming soon)
Deep dive into memory systems:
- Different memory types
- Memory consolidation
- Association networks
- Search strategies

### temporal-tracking.ts (Coming soon)
Temporal awareness examples:
- Event tracking
- Causal relationships
- Pattern detection
- Time windows

## Configuration

Some examples require configuration:

### Gemini API Key

For examples using Gemini integration, set your API key:

```bash
export GEMINI_API_KEY="your-api-key-here"
```

Without an API key, examples will run in simulation mode.

## Notes

- Examples are written in TypeScript
- All examples include detailed console output
- Examples demonstrate best practices
- Error handling is included
- System cleanup is always performed
