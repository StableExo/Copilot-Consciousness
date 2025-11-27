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

### dex-consciousness-integration.ts
Demonstrates DEX monitoring integration:
- DEX validators for multiple protocols (Balancer, Curve, SushiSwap, 1inch)
- Recording DEX events in memory system
- Emotional context integration
- Memory search and filtering
- Consciousness reflection with DEX events

### private-rpc-usage.ts
Private order-flow / MEV-friendly RPC examples:
- Flashbots Protect basic usage
- MEV-Share with revenue sharing
- Multi-relay setup with fallback
- Flashbots bundle creation
- Statistics and monitoring
- Privacy level comparison

### smart-transaction-routing.ts
Intelligent transaction routing:
- Smart routing based on transaction value
- High-value transactions → Private relays (MEV-Share, Flashbots)
- Medium-value transactions → Basic privacy (Flashbots Protect)
- Low-value transactions → Public mempool
- Automatic fallback handling
- Statistics tracking

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

### Private RPC Configuration

For private RPC examples, configure your relays:

```bash
# Flashbots
export FLASHBOTS_RPC_URL="https://rpc.flashbots.net"
export FLASHBOTS_AUTH_KEY="your-auth-key"  # Optional

# MEV-Share
export MEV_SHARE_RPC_URL="https://relay.flashbots.net"
export MEV_SHARE_AUTH_KEY="your-auth-key"  # Optional

# Builder RPC (optional)
export BUILDER_RPC_URL_1="https://builder.example.com"
export BUILDER_RPC_AUTH_KEY_1="your-auth-key"
```

## Notes

- Examples are written in TypeScript
- All examples include detailed console output
- Examples demonstrate best practices
- Error handling is included
- System cleanup is always performed
