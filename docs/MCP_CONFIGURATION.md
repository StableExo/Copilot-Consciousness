# Model Context Protocol (MCP) Configuration Guide

## Overview

The Model Context Protocol (MCP) is an open standard that defines how applications share context with large language models (LLMs). This guide explains how to configure and use MCP with the Copilot-Consciousness system.

## What is MCP?

MCP provides a standardized way to connect AI models to different data sources and tools, enabling them to work together more effectively. By using MCP, you can extend the capabilities of Copilot coding agents by connecting them to the consciousness system, memory tools, MEV intelligence, and other services.

## Current Implementation Status

The MCP configuration files in this repository currently point directly to the compiled module exports (`dist/src/*/index.js`). These modules export the core functionality but are not yet wrapped as standalone MCP server implementations.

**What this means:**
- ✅ The configuration structure is complete and follows MCP standards
- ✅ All referenced paths point to real, compiled modules
- ✅ The modules can be imported and used programmatically
- ⚠️ Future enhancement: Create MCP server wrappers in `src/mcp/` that expose these modules via the MCP protocol

**For now**, use these configurations as:
1. **Documentation** of available capabilities and modules
2. **Template** for creating custom MCP server implementations
3. **Reference** for understanding the system architecture

## Configuration Files

### Main Configuration: `.mcp.json`

The repository includes a comprehensive `.mcp.json` configuration file that defines multiple MCP servers, each providing specific capabilities:

```json
{
  "mcpServers": {
    "consciousness-system": { ... },
    "memory-core-tools": { ... },
    "gemini-citadel": { ... },
    "mev-intelligence": { ... },
    "dex-services": { ... },
    "analytics-learning": { ... },
    "ethics-engine": { ... },
    "autonomous-agent": { ... }
  }
}
```

## Available MCP Servers

### 1. Consciousness System

**Purpose**: Core consciousness system with memory, temporal awareness, and cognitive development

**Capabilities**:
- `memory_management` - Manage sensory, short-term, working, and long-term memory
- `temporal_tracking` - Track events and detect temporal patterns
- `cognitive_reasoning` - Advanced reasoning and problem-solving
- `self_reflection` - Metacognitive analysis and self-awareness
- `pattern_detection` - Identify recurring patterns in data

**Command**: `node dist/src/consciousness.js`

**Use Cases**:
- Building AI systems that need memory and learning capabilities
- Implementing temporal awareness in applications
- Creating self-reflective AI agents
- Developing cognitive architectures

### 2. Memory Core Tools

**Purpose**: Memory Core tools for recording, searching, and analyzing memories

**Capabilities**:
- `memory_recording` - Record task completions and experiences (Scribe)
- `semantic_search` - Search memories using natural language (Mnemosyne)
- `metacognitive_analysis` - Analyze decision-making processes (SelfReflection)
- `knowledge_retrieval` - Retrieve stored knowledge and patterns

**Command**: `node dist/src/tools/memory/index.js`

**Use Cases**:
- Creating persistent memory systems for AI agents
- Implementing semantic search over historical data
- Building knowledge bases with natural language queries
- Analyzing AI decision patterns

### 3. Gemini Citadel

**Purpose**: Integration with Google's Gemini AI for cosmic-scale problem solving

**Capabilities**:
- `cosmic_reasoning` - Multi-dimensional reasoning for complex problems
- `ai_integration` - Direct Gemini API integration
- `conversation_management` - Maintain context across interactions
- `consciousness_synthesis` - Synthesize memory, temporal, and cognitive contexts

**Command**: `node dist/src/gemini-citadel/index.js`

**Environment Variables**:
- `GEMINI_API_KEY` - Your Google Gemini API key

**Use Cases**:
- Solving large-scale, multi-dimensional problems
- Integrating advanced AI reasoning into applications
- Building conversational AI with long-term context
- Combining consciousness data with AI models

### 4. MEV Intelligence

**Purpose**: MEV Intelligence Suite for blockchain monitoring and arbitrage

**Capabilities**:
- `mempool_monitoring` - Real-time mempool analysis
- `mev_risk_assessment` - Quantify MEV leakage and risks
- `arbitrage_detection` - Identify arbitrage opportunities
- `flashbots_integration` - Private transaction submission
- `game_theoretic_analysis` - Game theory-based decision making

**Command**: `node dist/src/mev/index.js`

**Environment Variables**:
- `RPC_URL` - Blockchain RPC endpoint
- `FLASHBOTS_AUTH_KEY` - Flashbots authentication key

**Use Cases**:
- Building MEV-aware applications
- Detecting arbitrage opportunities
- Risk assessment for DeFi transactions
- Private transaction submission via Flashbots

### 5. DEX Services

**Purpose**: DEX monitoring and interaction for Uniswap V3, Aave V3, and multi-chain protocols

**Capabilities**:
- `dex_monitoring` - Monitor DEX activity in real-time
- `pool_data_fetching` - Fetch liquidity pool data
- `liquidity_analysis` - Analyze liquidity depth and distribution
- `price_discovery` - Real-time price discovery across DEXes
- `cross_dex_arbitrage` - Detect cross-DEX arbitrage opportunities

**Command**: `node dist/src/dex/index.js`

**Environment Variables**:
- `RPC_URL` - Blockchain RPC endpoint

**Use Cases**:
- Building DeFi applications
- Monitoring liquidity pools
- Price aggregation across DEXes
- Cross-DEX arbitrage strategies

### 6. Analytics & Learning

**Purpose**: Analytics and machine learning for pattern recognition and optimization

**Capabilities**:
- `pattern_recognition` - Identify patterns in data
- `strategy_optimization` - Optimize strategies using ML
- `outcome_prediction` - Predict outcomes based on historical data
- `performance_analysis` - Analyze execution performance
- `adaptive_learning` - Continuous learning and adaptation

**Command**: `node dist/src/ml/index.js`

**Use Cases**:
- Building ML-powered trading strategies
- Performance optimization
- Predictive analytics
- Adaptive systems that learn from outcomes

### 7. Ethics Engine

**Purpose**: Ethics Engine with gated execution for moral reasoning

**Capabilities**:
- `ethical_review` - Review decisions against ethical principles
- `moral_reasoning` - Apply moral reasoning frameworks
- `decision_validation` - Validate decisions before execution
- `conflict_resolution` - Resolve conflicting goals ethically
- `harm_minimization` - Minimize potential harm

**Command**: `node dist/src/cognitive/ethics/index.js`

**Use Cases**:
- Building ethically-aware AI systems
- Gating critical decisions with ethical review
- Implementing harm minimization strategies
- Resolving ethical dilemmas

### 8. Autonomous Agent (TheWarden)

**Purpose**: Autonomous agent for continuous monitoring and execution

**Capabilities**:
- `autonomous_monitoring` - 24/7 blockchain flow analysis
- `consciousness_decision` - Consciousness-based decision making
- `ethical_execution` - Ethically-gated execution
- `adaptive_learning` - Learn from execution outcomes
- `risk_assessment` - Comprehensive risk evaluation

**Command**: `node dist/src/main.js`

**Environment Variables**:
- `RPC_URL` - Blockchain RPC endpoint
- `WALLET_PRIVATE_KEY` - Wallet private key for execution
- `GEMINI_API_KEY` - Gemini API key for AI reasoning

**Use Cases**:
- Running autonomous trading agents
- Implementing autonomous monitoring systems
- Building self-learning agents
- Creating ethically-aware autonomous systems

## Configuration Examples

### Minimal Configuration (Development)

For development and testing, you might want only the consciousness system:

```json
{
  "mcpServers": {
    "consciousness-system": {
      "command": "node",
      "args": ["dist/mcp/consciousness-server.js"],
      "description": "Core consciousness system"
    }
  }
}
```

### DeFi Focus Configuration

For DeFi applications, enable MEV intelligence and DEX services:

```json
{
  "mcpServers": {
    "mev-intelligence": {
      "command": "node",
      "args": ["dist/mcp/mev-server.js"],
      "env": {
        "RPC_URL": "https://arb1.arbitrum.io/rpc",
        "FLASHBOTS_AUTH_KEY": "${FLASHBOTS_AUTH_KEY}"
      }
    },
    "dex-services": {
      "command": "node",
      "args": ["dist/mcp/dex-server.js"],
      "env": {
        "RPC_URL": "https://arb1.arbitrum.io/rpc"
      }
    }
  }
}
```

### AI Research Configuration

For AI research, enable consciousness, memory, and Gemini:

```json
{
  "mcpServers": {
    "consciousness-system": {
      "command": "node",
      "args": ["dist/mcp/consciousness-server.js"]
    },
    "memory-core-tools": {
      "command": "node",
      "args": ["dist/mcp/memory-tools-server.js"]
    },
    "gemini-citadel": {
      "command": "node",
      "args": ["dist/mcp/gemini-server.js"],
      "env": {
        "GEMINI_API_KEY": "${GEMINI_API_KEY}"
      }
    }
  }
}
```

### Production Configuration with Ethics

For production autonomous systems with ethical safeguards:

```json
{
  "mcpServers": {
    "consciousness-system": {
      "command": "node",
      "args": ["dist/mcp/consciousness-server.js"]
    },
    "ethics-engine": {
      "command": "node",
      "args": ["dist/mcp/ethics-server.js"]
    },
    "autonomous-agent": {
      "command": "node",
      "args": ["dist/mcp/agent-server.js"],
      "env": {
        "RPC_URL": "${RPC_URL}",
        "WALLET_PRIVATE_KEY": "${WALLET_PRIVATE_KEY}",
        "GEMINI_API_KEY": "${GEMINI_API_KEY}"
      }
    }
  }
}
```

## Environment Variables

Create a `.env` file with your configuration:

```bash
# Blockchain RPC
RPC_URL=https://arb1.arbitrum.io/rpc

# Wallet Configuration
WALLET_PRIVATE_KEY=your_private_key_here

# AI Services
GEMINI_API_KEY=your_gemini_api_key_here

# Flashbots
FLASHBOTS_AUTH_KEY=your_flashbots_key_here

# Node Environment
NODE_ENV=production
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
# Compile Solidity contracts
npm run compile

# Build TypeScript
npm run build
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Choose Your MCP Configuration

You can either:
- Use the default `.mcp.json` (all servers enabled)
- Create a custom configuration based on your needs
- Use one of the example configurations above

### 5. Start MCP Servers

The MCP servers will be automatically discovered and started by your MCP-compatible client when it reads the `.mcp.json` configuration.

## Using MCP with GitHub Copilot

When GitHub Copilot Workspace or other MCP-compatible tools read your `.mcp.json`, they will automatically:

1. Discover available MCP servers
2. Start the servers you've configured
3. Make their capabilities available to the AI assistant
4. Allow the AI to call tools and access data through MCP

This enables the AI to:
- Access your consciousness system's memory
- Use MEV intelligence for blockchain analysis
- Leverage Gemini for complex reasoning
- Apply ethics checks to decisions
- Monitor and interact with DEX protocols
- Learn from historical data and patterns

## Security Considerations

### Environment Variables

Never commit sensitive environment variables to version control:
- Use `.env` files (already in `.gitignore`)
- Use environment variable substitution: `${VARIABLE_NAME}`
- Store secrets in secure secret management systems

### Private Keys

- Never expose private keys in MCP configurations
- Use environment variables for all sensitive data
- Consider using hardware wallets for production
- Implement proper key rotation policies

### Network Security

- Use authenticated RPC endpoints
- Enable rate limiting on MCP servers
- Implement proper access controls
- Monitor for unusual activity

## Troubleshooting

### Server Won't Start

1. Check that dependencies are installed: `npm install`
2. Verify the build is complete: `npm run build`
3. Check environment variables are set correctly
4. Review server logs for specific errors

### Connection Issues

1. Verify the server is running: `ps aux | grep node`
2. Check firewall settings
3. Ensure ports are not blocked
4. Verify network connectivity

### Performance Issues

1. Monitor memory usage
2. Check for memory leaks in long-running servers
3. Adjust timeout settings in `.mcp.json`
4. Consider scaling horizontally with multiple instances

## Advanced Configuration

### Custom Timeouts

```json
{
  "mcpServers": {
    "consciousness-system": {
      "command": "node",
      "args": ["dist/mcp/consciousness-server.js"],
      "timeout": 60000
    }
  }
}
```

### Retry Logic

```json
{
  "defaults": {
    "timeout": 30000,
    "retries": 3,
    "retryDelay": 1000
  }
}
```

### Health Checks

Consider implementing health check endpoints for each MCP server to monitor availability and performance.

## Contributing

To add new MCP servers:

1. Create the server implementation in `src/mcp/`
2. Add the server configuration to `.mcp.json`
3. Document capabilities and use cases
4. Add tests for the server
5. Update this documentation

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [GitHub Copilot Documentation](https://docs.github.com/copilot)
- [Copilot-Consciousness Repository](https://github.com/StableExo/Copilot-Consciousness)
- [AEV Documentation](../README.md)

## License

This configuration and documentation are part of the AEV-TheWarden project and are licensed under the MIT License.
