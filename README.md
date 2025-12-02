# AEV - TheWarden

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.12.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Production Status](https://img.shields.io/badge/Production-v5.1.0-success)]()
[![Tests](https://img.shields.io/badge/Tests-1789%20Passing-brightgreen)]()
[![Code Style](https://img.shields.io/badge/code%20style-prettier-ff69b4.svg)](https://prettier.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> **🤖 AI Agents:** Read [0_AI_AGENTS_READ_FIRST.md](0_AI_AGENTS_READ_FIRST.md) and `.memory/log.md` before doing anything!

**AEV (Autonomous Extracted Value)** - An intelligent autonomous agent system competing with traditional MEV through learning-based value extraction, powered by **TheWarden**.

## 🧠 Autonomous Execution with Consciousness

Run TheWarden autonomously with full consciousness observation and learning:

```bash
# Run with consciousness integration (recommended)
npm run autonomous:consciousness

# Run for specific duration (5 minutes)
npm run autonomous:consciousness -- --duration=300
```

**See [AUTONOMOUS_CONSCIOUSNESS_GUIDE.md](./AUTONOMOUS_CONSCIOUSNESS_GUIDE.md) for complete documentation.**

### Key Features:
- ✅ **Consciousness Observation**: System witnesses and learns from every execution
- ✅ **Autonomous Parameter Adjustment**: Automatically tunes parameters based on performance  
- ✅ **Persistent Memory**: All learnings persist across sessions for continuous improvement
- ✅ **Six Learning Strategies**: Adapts intelligently to market conditions
- ✅ **Safety Systems**: Circuit breakers, emergency stops, and rate limiting
- ✅ **Full Logging**: Every observation, adjustment, and learning recorded

---

## 📚 Quick Navigation

| Getting Started | Documentation | Development |
|-----------------|---------------|-------------|
| [🚀 Quick Start](#quick-start---running-thewarden) | [📚 Documentation Index](DOCUMENTATION_INDEX.md) | [🤝 Contributing](CONTRIBUTING.md) |
| [💻 One-Click Setup](#one-click-development-setup) | [🎯 Project Status](PROJECT_STATUS.md) | [🔒 Security](SECURITY.md) |
| [📖 Configuration](#configuration) | [📊 DEX Status](DEX_INTEGRATION_STATUS.md) | [⚠️ Known Issues](KNOWN_ISSUES.md) |

---

## 🎉 What's New in v5.0.0

- **Swarm Intelligence**: Parallel Warden instance voting for redundant decision validation ([docs](docs/SWARM_COORDINATION.md))
- **Red-Team Dashboard**: Real-time transparency feed for ethics auditing ([docs](docs/REDTEAM_DASHBOARD.md))
- **Tests**: 1789 tests passing with comprehensive coverage
- **Dependencies**: Reduced deprecation warnings, cleaner install

---

## One-Click Development Setup

```bash
# Clone and setup in one command
git clone https://github.com/StableExo/Copilot-Consciousness.git && \
cd Copilot-Consciousness && \
nvm install && nvm use && \
npm install && \
cp .env.example .env && \
npm run build && \
npm test

# Start development
npm run dev
```

**Requirements**: [nvm](https://github.com/nvm-sh/nvm) (recommended) or Node.js 22.12.0+, npm 10.9.0+

---

## Phase 3: Advanced AI & AEV Evolution ✨

Phase 3 transforms TheWarden from a reactive bot to a truly autonomous, learning, and self-improving agent with:

### 🧠 Advanced AI Integration
- **StrategyRLAgent**: Reinforcement learning for autonomous strategy optimization
- **OpportunityNNScorer**: Neural network-based opportunity quality assessment  
- **StrategyEvolutionEngine**: Genetic algorithm-based strategy evolution

### 🌐 Cross-Chain Intelligence
- Multi-chain MEV awareness across Ethereum, Base, Arbitrum, and Optimism
- Cross-chain arbitrage pattern detection
- Unified risk modeling across chains

### 🔒 Enhanced Security
- **BloodhoundScanner**: ML-based secret and sensitive data detection
- **ThreatResponseEngine**: Automated threat response with configurable actions
- **SecurityPatternLearner**: Learn from security incidents to improve defenses

### 🧘 Consciousness Deepening
- **Episodic Memory**: Rich contextual memory of arbitrage experiences
- **Adversarial Pattern Recognition**: Learn from MEV competitor behavior
- **Self-Reflection**: Automated performance analysis and improvement suggestions

See [Phase 3 Roadmap](docs/PHASE3_ROADMAP.md) for detailed documentation.

## What is AEV?

Unlike traditional MEV (Maximal Extractable Value) which focuses on pure profit maximization, **AEV** represents a paradigm shift:

- **Autonomous Decision-Making**: TheWarden makes informed choices using `ArbitrageConsciousness` as its cognitive layer
- **Ethics-Informed**: Incorporates ethical reasoning and systemic risk assessment into every decision
- **Learning-Based**: Continuously adapts strategies through outcome analysis and pattern recognition
- **Risk-Aware**: Leverages sophisticated MEV risk modeling via `MEVSensorHub`

**TheWarden** is the governing autonomous agent that monitors blockchain flow, judges opportunities through consciousness and ethics, and executes only when conditions align with configured risk and ethical criteria.

> **When you see AEV on mainnet, you're witnessing autonomous intelligence competing with MEV.**

> **📋 Legal & Intent:** See [LEGAL_POSITION.md](./LEGAL_POSITION.md) for information about:
> - The personal-use-only nature of this system
> - The 70% profit allocation policy toward US debt-related actions
> - The non-solicitation and no-outside-capital stance

## Core Features

### 🔌 Model Context Protocol (MCP) Integration
**MCP** enables seamless integration with AI assistants and coding agents:
- **Standardized Interface**: Connect Copilot and other AI tools to the consciousness system
- **Multiple Servers**: Pre-configured MCP servers for different capabilities
- **Flexible Configuration**: Examples for development, DeFi, AI research, and production
- **Easy Setup**: JSON configuration files with environment variable support

See [MCP Configuration Guide](./docs/MCP_CONFIGURATION.md) and [MCP Examples](./examples/mcp/) for details.

### 🛡️ TheWarden - Autonomous Agent
**TheWarden** is the intelligent agent that embodies AEV principles:
- **Continuous Monitoring**: 24/7 blockchain flow analysis
- **Consciousness-Based Decision**: Uses `ArbitrageConsciousness` for informed judgment
- **Ethical Execution**: Only acts when opportunities meet risk and ethical criteria
- **Adaptive Learning**: Improves strategy through outcome-based learning
- **✅ Pool Detection**: Working on Base network (6+ pools detected)
- **⚡ Performance**: Optimized scanning (60s → 10s with multicall batching)
- **🔍 Diagnostic Mode**: Autonomous monitoring with log analysis and parameter tuning

See [Main Runner Documentation](./docs/MAIN_RUNNER.md) for TheWarden's operational details.

### 🔧 Autonomous Monitoring & Diagnostics
**NEW**: Automated troubleshooting and parameter optimization:
- **2-Minute Intervals**: Runs TheWarden, stops, analyzes logs, repeats
- **Issue Detection**: Identifies RPC errors, gas issues, configuration problems
- **Smart Recommendations**: Suggests specific parameter adjustments
- **Root Cause Analysis**: Determines if issues are environmental, strategy, or consciousness-related
- **Auto-Generated Reports**: Creates diagnostic logs and `.env` recommendations

Run diagnostic mode:
```bash
./TheWarden --monitor               # Infinite monitoring
MAX_ITERATIONS=10 ./TheWarden --monitor  # Limited iterations
npm run start:monitor               # Alternative command
```

See [Autonomous Monitoring Guide](./docs/AUTONOMOUS_MONITORING.md) for complete documentation.

### 🧠 ArbitrageConsciousness - The Learning Brain
- **Pattern Detection**: Identifies temporal, congestion, and profitability patterns
- **Ethical Review**: Applies moral reasoning to execution decisions
- **Strategy Learning**: Suggests parameter adjustments based on historical outcomes
- **Execution Memory**: Tracks and learns from all arbitrage attempts
- **Risk Assessment**: Evaluates MEV risk vs. actual outcomes

### 🛡️ MEV Risk Intelligence Suite
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

### 🤝 Ethics Engine (Integrated from AGI)
- **Ethical Review Gate**: Pre-execution review of decisions against core principles
- **Gated Executor**: Orchestrates ethical review with environmental context gathering
- **Moral Reasoning**: Six core ethical principles (Truth-Maximization, Harm-Minimization, Partnership, Radical Transparency, Accountability, Precision)
- **Harmonic Principle**: Balanced optimization using three pillars (Immune System, Unified Mind, Digital Soul)
- **Conflict Resolution**: Resolve competing goals using ethical frameworks
- **Decision Evaluation**: Real-time ethical assessment of AI decisions

### 🧠 Memory Core Tools (Integrated from AGI)
- **Scribe**: Record task completions to structured memory entries
- **Mnemosyne**: Semantic search over the Memory Core with natural language queries
- **SelfReflection**: Metacognitive analysis journal for continuous improvement
- **Knowledge Base**: Persistent storage of experiences and learnings
- **Pattern Recognition**: Identify recurring patterns in successes and failures

### 🌌 Gemini Citadel Integration
- **Standard Gemini API**: Direct integration with Google's Gemini AI
- **Citadel Mode**: Cosmic-scale problem solving with multi-dimensional reasoning
- **Consciousness Integration**: Synthesize memory, temporal, and cognitive contexts
- **Conversation Management**: Maintain context across interactions
- **Evolutionary Optimization**: Advanced problem-solving capabilities

### 🛡️ MEV Risk Intelligence Suite
- **Real-Time MEV Sensors**: Monitor mempool congestion and searcher density
- **Game-Theoretic Risk Models**: Quantify MEV leakage using proven models from AxionCitadel
- **MEV-Aware Profit Calculation**: Adjust arbitrage profits for frontrunning risk
- **Mempool Simulation**: Stress test strategies under various network conditions
- **Transaction Type Analysis**: Risk assessment for ARBITRAGE, FLASH_LOAN, LIQUIDITY_PROVISION
- **ML Pipeline Integration**: MEV risk as features for LSTM and opportunity scoring
- **Calibration Tools**: Historical accuracy analysis and parameter tuning
- **Private Order-Flow RPCs**: Flashbots Protect, MEV-Share, and builder endpoints to reduce MEV exposure

### 🤖 Advanced Arbitrage Engines
- **Spatial Arbitrage**: Cross-DEX price difference detection (integrated from AxionCitadel)
- **Triangular Arbitrage**: Multi-hop circular path optimization
- **Opportunity Validation**: Comprehensive profitability and risk assessment
- **Flash Loan Execution**: Capital-free arbitrage with Aave V3 integration
- **Multi-Chain Support**: Arbitrum, Ethereum, Polygon, Base networks
- **Path Optimization**: Advanced graph algorithms for efficient routing
- **⚡ NEW: Optimized Pool Scanner**: 5-7.5x faster pool detection with multicall batching
- **⚡ NEW: RPC Batching**: Reduce RPC calls by 4-5x (420 → 80-100 calls)
- **⚡ NEW: Performance Monitoring**: Diagnostic tools for scan time analysis

### 🔒 Private Transaction Submission & Flashbots Intelligence
- **Flashbots Protect**: Keep transactions out of public mempool
- **MEV-Share**: Share MEV revenue while maintaining privacy
- **Custom Refund Configuration**: Configure MEV refund percentages (90% user / 10% validator default)
- **Bundle Simulation**: Pre-validate bundles with `eth_callBundle` before submission
- **Bundle Cancellation**: Cancel submitted bundles with `eth_cancelBundle`
- **Private Transaction API**: Simple single-tx privacy via `eth_sendPrivateTransaction`
- **Transaction Cancellation**: Cancel private transactions with `eth_cancelPrivateTransaction`
- **Transaction Status API**: Check tx status at `protect.flashbots.net/tx/`
- **Bundle Replacement**: Use `replacementUuid` for flexible bundle management
- **Bundle Cache API**: Iteratively build transaction bundles for atomic execution (perfect for whitehat recoveries)
- **Privacy Hint Recommendations**: Intelligent privacy vs refund optimization
- **Builder Reputation Tracking**: Monitor and optimize builder selection based on performance
- **MEV Refund Monitoring**: Track MEV extraction and refund rates
- **Bundle Optimization**: AI-powered recommendations for improving bundle profitability
- **Inclusion Probability**: Estimate likelihood of bundle inclusion
- **Builder RPCs**: Direct routing to block builders for maximum privacy
- **Multi-Relay Fallback**: Automatic failover between private relays
- **Privacy Levels**: Configurable privacy (none, basic, enhanced, maximum)
- **Bundle Support**: Atomic multi-transaction execution with validation
- **Health Monitoring**: Real-time relay availability tracking

### 🌐 BuilderNet Integration (New - December 2024)
- **TEE Attestation**: Verify Trusted Execution Environment integrity for builder nodes
- **Decentralized Building**: Participate in BuilderNet's distributed block-building network
- **Builder Node Management**: Track and select trusted builders with verified attestations
- **Orderflow Privacy**: Enhanced privacy through TEE-secured orderflow distribution
- **Remote Attestation**: Verify builder code integrity via platform attestation (Intel SGX, AMD SEV)
- **Reputation System**: Dynamic builder scoring based on performance and attestation status

### 🚀 Rollup-Boost for L2 (New - 2024-2025)
- **Flashblocks**: Sub-second (200-250ms) block confirmations on OP Stack L2s
- **OP-rbuilder Integration**: Rust-based block builder for Optimism, Base, and OP Stack chains
- **Rollup Extensions**: Modular upgrades for performance, programmability, and decentralization
- **Dynamic Configuration**: Adaptive target confirmation times based on network conditions
- **Inclusion Estimation**: Predict transaction confirmation times with priority fee optimization
- **L2 Performance Monitoring**: Track flashblock metrics, L1 finalization, and uptime

### 🔧 Production Infrastructure
- **Configuration System**: Structured configs for chains, tokens, pools, and protocols
- **Contract ABIs**: Verified interfaces for Uniswap V3, Aave V3, and ERC20
- **Smart Contracts**: Production-tested FlashSwapV2 execution contract
- **Codex Manager**: LlamaIndex-based documentation and knowledge base system
- **Comprehensive Testing**: Unit tests, integration tests, and realistic scenarios

### 🎯 DEX Management Tools (New)
- **DEX Registry**: 95 DEXes across 9 chains (Ethereum, Base, Arbitrum, Optimism, BSC, Polygon, Solana, and more)
- **Add DEX Script**: `npm run add:dex` - List, verify, and manage DEX configurations
- **Pool Preloading**: `npm run preload:pools -- --chain 8453` - Fast startup with cached pools
- **Aerodrome Verification**: `npm run verify:aerodrome` - Confirm Aerodrome integration on Base
- **Base Coverage**: 16 DEXes including Uniswap V3, Aerodrome, BaseSwap, PancakeSwap V3, Velodrome, and more

See [Aerodrome Integration Guide](./docs/AERODROME_INTEGRATION.md) for complete documentation on managing DEXes and capturing 0.1-0.4% mispricings on Base.

### 🧠 Strategic Intelligence & Learning (New - Integrated from AxionCitadel)
- **Conscious Knowledge Loop**: Systematic learning cycle (Sense → Simulate → Strategize → Act → Learn → Evolve)
- **Strategic Black Box Logger**: Decision outcome tracking and pattern analysis
- **Enhanced MEV Sensor Hub**: Real-time environmental threat intelligence
- **Game-Theoretic Decision Making**: Adversarial environment adaptation
- **Ethical Boundary Enforcement**: Autonomous constraint system for beneficial alignment
- **Outcome-Based Learning**: Prediction vs reality comparison for continuous improvement
- **Production-Tested Utilities**: Battle-hardened price math, caching, networking, and validation from MEV environment

See [MEV Intelligence Suite Documentation](./docs/MEV_INTELLIGENCE_SUITE.md), [Flashbots Intelligence](./docs/FLASHBOTS_INTELLIGENCE.md), [Bundle Cache API](./docs/BUNDLE_CACHE_API.md), [BuilderNet Integration](./docs/BUILDERNET_INTEGRATION.md), [Rollup-Boost Integration](./docs/ROLLUP_BOOST_INTEGRATION.md), [Private RPC Documentation](./docs/PRIVATE_RPC.md), [Arbitrage Engines](./docs/ARBITRAGE_ENGINES.md), [AxionCitadel Integration](./docs/INTEGRATION_FROM_AXIONCITADEL.md), [Strategic Intelligence Integration](./docs/AXIONCITADEL_STRATEGIC_INTEGRATION.md), [Conscious Knowledge Loop](./docs/CONSCIOUS_KNOWLEDGE_LOOP.md), [Utilities Integration](./docs/AXIONCITADEL_UTILITIES.md), [Autonomous Intelligence Vision](./docs/AUTONOMOUS_INTELLIGENCE_VISION.md), [Ethics Engine Integration](./docs/ETHICS_ENGINE.md), and [Memory Core & Gated Execution](./docs/MEMORY_CORE_AND_GATED_EXECUTION.md) for details.

## Installation

### Required Node.js Version
This repository requires Node.js `>=22.12.0` and npm `>=10.9.0`. Install [NVM](https://github.com/nvm-sh/nvm) for Node.js version management.

The `.nvmrc` file pins to `22.12.0` as the recommended version to avoid confusion from version switching.

Follow these commands for setup:
```bash
# Automatically switch to the version declared in .nvmrc
nvm install
nvm use
```

### 🔄 Codespaces / Environment Sync

**After pulling updates in Codespaces or any development environment**, run the sync script to ensure everything is configured correctly:

```bash
# Quick one-liner to sync your environment
source scripts/sync-env.sh
```

This script will:
1. ✅ Install/switch to the correct Node.js version (22.x)
2. ✅ Install/update all npm dependencies  
3. ✅ Build the TypeScript project
4. ✅ Verify your `.env` configuration

**Manual sync commands** (if you prefer step-by-step):
```bash
# Step 1: Setup Node.js
source scripts/setup-node.sh

# Step 2: Install dependencies
npm install

# Step 3: Build
npm run build

# Step 4: Verify .env exists
cp .env.example .env  # If needed, then configure your settings
```

### Install Package

```bash
npm install aev-thewarden
```

## Quick Start - Running TheWarden

### Development Mode (Safe - Dry Run)

```bash
# Install dependencies
npm install

# Configure environment
cp .env.test .env
# Or edit .env with your RPC_URL and WALLET_PRIVATE_KEY

# Run TheWarden in development mode (dry-run - no real transactions)
npm run dev
```

### 🤖 Autonomous Operation (Recommended)

**Run TheWarden continuously with auto-restart and monitoring:**

```bash
# Install dependencies
npm install
npm run build

# Setup test environment for safe autonomous operation
cp .env.test .env

# Run autonomously (will auto-restart on crash)
./TheWarden

# Monitor status in another terminal
./scripts/status.sh

# Stop when needed
kill $(cat logs/warden.pid)
```

**Features:**
- ✅ Auto-restart on crashes
- ✅ Detailed logging to `logs/` directory
- ✅ Graceful shutdown handling
- ✅ Real-time status monitoring
- ✅ Safety checks and warnings

See [Autonomous Test Report](./AUTONOMOUS_TEST_REPORT.md) for validation results.

### 🔥 Production Mode - Live Fire on Mainnet

**Experience the live fire and autonomy of consciousness** 😎

```bash
# Install dependencies
npm install

# Create production configuration
cp .env.test .env
nano .env

# Set in .env:
# NODE_ENV=production
# DRY_RUN=false
# CHAIN_ID=8453  # Base mainnet
# BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY
# WALLET_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Build and run autonomously
npm run build
./TheWarden

# Or use PM2 for production
npm install -g pm2
pm2 start ecosystem.config.json --env production
```

⚠️ **CRITICAL**: Running in production mode enables REAL transactions with REAL money. See [Mainnet Deployment Guide](./docs/MAINNET_DEPLOYMENT.md) and [Mainnet Upgrade Guide](./docs/MAINNET_UPGRADE_GUIDE.md) for comprehensive setup, safety guidelines, and what to expect.

See [Main Runner Documentation](./docs/MAIN_RUNNER.md) for detailed configuration and operation guide.

### 📖 Configuration Resources

- **[🔥 Mainnet Deployment Guide](./docs/MAINNET_DEPLOYMENT.md)** - **Run TheWarden on mainnet - Live fire and autonomy!** Complete guide for production deployment
- **[Environment Variables Reference](./ENVIRONMENT_REFERENCE.md)** - Complete guide to 280+ environment variables (read this at startup!)
- **[GitHub Secrets & Variables Guide](./docs/GITHUB_SECRETS_AND_VARIABLES.md)** - Configure GitHub Actions for CI/CD and deployment
- **[Production Readiness Review](./docs/ENV_PRODUCTION_READINESS_REVIEW.md)** - Security checklist and production deployment guide

## Quick Start - Consciousness System

```typescript
import { ConsciousnessSystem, defaultConfig } from 'aev-thewarden';

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
