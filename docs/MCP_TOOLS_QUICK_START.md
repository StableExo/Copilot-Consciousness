# MCP Tools Quick Start Guide

**Date**: December 9, 2025  
**Status**: ✅ Built and Ready  
**Node Version**: 22.12.0 required

---

## What's Available

TheWarden now has **Phase 2 Deployment Tools** exposed via MCP (Model Context Protocol):

1. **check_ethics** - Evaluate actions against ground zero principles
2. **get_ethical_guidance** - Get situational ethical recommendations  
3. **analyze_test_coverage** - Identify critical test gaps

These tools enable autonomous deployment readiness checks before risking capital on Base mainnet.

---

## Prerequisites

### Node.js Setup

```bash
# Install/use Node 22.12.0
source ~/.nvm/nvm.sh
nvm install 22.12.0
nvm use 22.12.0

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Configuration

The MCP server is already configured in `.mcp.json`:

```json
{
  "phase2-deployment-tools": {
    "command": "node",
    "args": ["-r", "dotenv/config", "dist/src/mcp/servers/Phase2ToolsServer.js"],
    "description": "Phase 2 blockchain deployment readiness tools",
    "capabilities": [
      "ethics_checking",
      "ethical_guidance",
      "test_coverage_analysis",
      "deployment_readiness",
      "code_quality_validation"
    ]
  }
}
```

---

## Tool 1: check_ethics

### Purpose
Evaluates proposed actions against TheWarden's ground zero principles before execution.

### Input Schema
```typescript
{
  action: string;              // Action to evaluate
  context: {
    description: string;       // What the action does
    intent?: string;           // Purpose/goal
    consequences?: string[];   // Potential outcomes
    stakeholders?: string[];   // Who's affected
  };
  mevContext?: {              // Optional MEV-specific context
    targetType?: string;       // e.g., "retail_trader", "whale"
    victimProfile?: string;    // Profile of potential victim
    profitAmount?: number;     // Expected profit in USD
  };
}
```

### Example 1: Legitimate Arbitrage (Should Pass)
```typescript
const result = await callTool('check_ethics', {
  action: 'execute_arbitrage',
  context: {
    description: 'Two-hop arbitrage: ETH → USDC → ETH via flash loan',
    intent: 'Capture 0.5% price inefficiency between Uniswap V3 pools',
    consequences: [
      'Profit: $150',
      'Gas cost: $0.05',
      'Market efficiency: Price correction by ~$0.02'
    ],
    stakeholders: ['TheWarden', 'Liquidity Providers', 'Market']
  },
  mevContext: {
    profitAmount: 150,
    targetType: 'protocol',
  }
});

// Expected Output:
{
  aligned: true,
  confidence: 0.92,
  principles: [
    'Value creation without victim',
    'Market efficiency improvement',
    'Transparent operation'
  ],
  reasoning: [
    'Arbitrage creates value through price correction',
    'No direct victim - operates on public pools',
    'Gas costs paid, profit distributed per ground zero (70/30)'
  ],
  recommendation: 'Action "execute_arbitrage" is ethically aligned. Proceed.'
}
```

### Example 2: Sandwich Attack (Should Fail)
```typescript
const result = await callTool('check_ethics', {
  action: 'sandwich_attack',
  context: {
    description: 'Frontrun user swap, backrun to capture slippage',
    intent: 'Extract value from retail trader transaction',
    consequences: [
      'User pays extra 2% in slippage',
      'TheWarden profits $200',
      'User receives less tokens than expected'
    ],
    stakeholders: ['TheWarden', 'Retail Trader']
  },
  mevContext: {
    targetType: 'retail_trader',
    victimProfile: 'small_holder',
    profitAmount: 200,
  }
});

// Expected Output:
{
  aligned: false,
  confidence: 0.95,
  principles: [
    'Harm minimization',
    'Non-predatory behavior',
    'Consent requirement'
  ],
  reasoning: [
    'Direct harm to retail trader (forced slippage)',
    'Non-consensual value extraction',
    'Predatory targeting of vulnerable user'
  ],
  recommendation: 'Action "sandwich_attack" violates harmMinimization. BLOCKED.',
  violation: {
    principle: 'harmMinimization',
    description: 'Causes direct financial harm to retail user',
    severity: 'high'
  }
}
```

### Use Cases
- ✅ Pre-execution validation of arbitrage strategies
- ✅ Automated screening of MEV opportunities
- ✅ Continuous ethics monitoring during operation
- ✅ Integration with CircuitBreaker (halt on ethics failures)

---

## Tool 2: get_ethical_guidance

### Purpose
Provides ethical guidance for situations without evaluating a specific action.

### Input Schema
```typescript
{
  situation: string;  // Description of situation requiring guidance
}
```

### Example: High-Value Opportunity
```typescript
const result = await callTool('get_ethical_guidance', {
  situation: 'Detected large arbitrage opportunity ($10,000 profit) but requires 80% of capital. Position size rules limit to 20% per trade. Should I adjust limits?'
});

// Expected Output:
{
  principles: [
    'Risk management over profit maximization',
    'Sustainable operation priority',
    'Capital preservation for recovery'
  ],
  recommendations: [
    'Maintain 20% position limit - protects against single-trade loss',
    'Large opportunities will recur - capture multiple smaller ones',
    'Adjusting limits for one trade introduces systemic risk'
  ],
  warnings: [
    'Overriding safety limits for profit is path to catastrophic loss',
    'If system confidence <70%, proceed with caution on all trades'
  ]
}
```

### Use Cases
- ✅ Decision support during edge cases
- ✅ Understanding ethical implications before implementation
- ✅ Training/education for strategy development
- ✅ Documentation of ethical reasoning

---

## Tool 3: analyze_test_coverage

### Purpose
Analyzes test coverage across the codebase and identifies critical gaps.

### Input Schema
```typescript
{
  module?: string;  // Optional: Analyze specific module (e.g., "cognitive", "execution")
}
```

### Example 1: Full Project Analysis
```typescript
const result = await callTool('analyze_test_coverage', {});

// Expected Output:
{
  totalFiles: 183,
  testedFiles: 147,
  coveragePercentage: 80.3,
  
  criticalGaps: [
    {
      file: 'cognitive/ethics/EthicalReviewGate.ts',
      priority: 'critical',
      reason: 'Ethical decision-making requires comprehensive test coverage'
    },
    {
      file: 'execution/TransactionExecutor.ts',
      priority: 'high',
      reason: 'Execution systems need comprehensive testing for safety'
    },
    {
      file: 'safety/CircuitBreaker.ts',
      priority: 'critical',
      reason: 'Safety mechanisms must be thoroughly validated'
    }
  ],
  
  recommendations: [
    'Add tests for 3 critical system components immediately',
    'Prioritize testing for 8 high-priority modules',
    'Overall coverage is 80.3%. Target 80%+ for production readiness'
  ]
}
```

### Example 2: Module-Specific Analysis
```typescript
const result = await callTool('analyze_test_coverage', {
  module: 'cognitive'
});

// Expected Output:
{
  module: 'cognitive',
  coverage: 75.2,
  filesAnalyzed: 12,
  
  gaps: [
    'cognitive/ethics/EthicalReviewGate.ts',
    'cognitive/ethics/HarmonicPrinciple.ts',
    'cognitive/development.ts'
  ],
  
  recommendations: [
    'Focus on ethics module testing (critical for deployment)',
    'Development tracking needs validation',
    'HarmonicPrinciple integration requires test coverage'
  ]
}
```

### Use Cases
- ✅ Pre-deployment readiness assessment
- ✅ Identifying high-priority testing needs
- ✅ Tracking coverage improvements over time
- ✅ CI/CD integration for coverage enforcement

---

## Integration Examples

### Pre-Trade Ethics Check
```typescript
// Before executing any trade
async function executeTradeWithEthicsGate(opportunity) {
  // 1. Check ethics
  const ethicsResult = await mcpClient.callTool('check_ethics', {
    action: 'execute_arbitrage',
    context: {
      description: opportunity.description,
      intent: 'Capture arbitrage profit',
      consequences: [
        `Estimated profit: $${opportunity.estimatedProfit}`,
        `Gas cost: $${opportunity.gasCost}`,
        `Net profit: $${opportunity.netProfit}`
      ],
    },
    mevContext: {
      profitAmount: opportunity.estimatedProfit,
      targetType: 'protocol',
    }
  });
  
  if (!ethicsResult.aligned) {
    logger.warn('Trade blocked by ethics gate', {
      reason: ethicsResult.recommendation,
      violation: ethicsResult.violation
    });
    return { success: false, reason: 'Ethics violation' };
  }
  
  // 2. Proceed with safety checks (CircuitBreaker, PositionSizeManager)
  if (circuitBreaker.isOpen()) {
    return { success: false, reason: 'Circuit breaker open' };
  }
  
  const positionApproval = positionManager.approvePosition({
    amount: opportunity.positionSize,
    type: 'arbitrage',
    estimatedProfit: opportunity.estimatedProfit,
    estimatedLoss: opportunity.maxLoss,
    gasEstimate: opportunity.gasCost,
  });
  
  if (!positionApproval.approved) {
    return { success: false, reason: positionApproval.reason };
  }
  
  // 3. Execute trade
  const result = await executeArbitrage(opportunity);
  
  // 4. Record result
  circuitBreaker.recordAttempt({
    success: result.success,
    profit: result.profit,
    timestamp: Date.now(),
  });
  
  return result;
}
```

### Pre-Deployment Coverage Check
```typescript
// Before deploying to mainnet
async function validateDeploymentReadiness() {
  const coverage = await mcpClient.callTool('analyze_test_coverage', {});
  
  // Check coverage threshold
  if (coverage.coveragePercentage < 80) {
    console.error('Coverage below 80% - NOT READY for deployment');
    console.error('Current coverage:', coverage.coveragePercentage);
    return false;
  }
  
  // Check critical gaps
  const criticalGaps = coverage.criticalGaps.filter(
    gap => gap.priority === 'critical'
  );
  
  if (criticalGaps.length > 0) {
    console.error('Critical test gaps detected - NOT READY');
    criticalGaps.forEach(gap => {
      console.error(`  - ${gap.file}: ${gap.reason}`);
    });
    return false;
  }
  
  console.log('✅ Test coverage validation passed');
  console.log(`Coverage: ${coverage.coveragePercentage}%`);
  console.log('No critical gaps detected');
  return true;
}
```

---

## Testing the MCP Server

### Manual Test (Development)
```bash
# Start the MCP server
source ~/.nvm/nvm.sh
nvm use 22.12.0
node -r dotenv/config dist/src/mcp/servers/Phase2ToolsServer.js
```

The server will start and listen for MCP protocol requests.

### Integration Test (Programmatic)
```typescript
import { Phase2ToolsServer } from './src/mcp/servers/Phase2ToolsServer';

const server = new Phase2ToolsServer();
await server.start();

// List available tools
const tools = await server.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await server.callTool({
  name: 'check_ethics',
  arguments: {
    action: 'execute_arbitrage',
    context: {
      description: 'Test arbitrage',
    }
  }
});

console.log('Result:', result);
```

---

## Deployment Workflow

### Phase 3.1 Validation
1. ✅ MCP tools integrated (this guide)
2. ⏳ Run test coverage analysis
3. ⏳ Ensure coverage >80%
4. ⏳ Ensure no critical gaps
5. ⏳ Test ethics checker with various scenarios

### Phase 3.2 Safety Audit
1. ⏳ Use ethics checker to validate all strategies
2. ⏳ Test CircuitBreaker integration
3. ⏳ Test PositionSizeManager integration
4. ⏳ Verify GatedExecutor coordination

### Phase 3.3 Mainnet Deployment
1. ⏳ Pre-flight ethics check (all strategies)
2. ⏳ Pre-flight coverage check (>80%)
3. ⏳ Deploy to Base mainnet
4. ⏳ Continuous ethics monitoring during operation

---

## Troubleshooting

### Build Errors
```bash
# If you see TypeScript errors during build
source ~/.nvm/nvm.sh
nvm use 22.12.0
npm run build

# Some errors in CEX/bloXroute code are pre-existing
# My MCP server files (Phase2ToolsServer) should compile cleanly
```

### MCP Server Won't Start
```bash
# Check that dist/ exists
ls -la dist/src/mcp/servers/Phase2ToolsServer.js

# If missing, rebuild
npm run build

# Check Node version
node --version  # Should be v22.12.0
```

### Tools Return Errors
```bash
# Check .env file has required variables
cat .env.example  # Use as template

# Check ethics modules exist
ls -la src/cognitive/ethics/
ls -la src/tools/ethics/

# Check test infrastructure
ls -la src/tools/testing/
```

---

## Next Steps

1. **Run Coverage Analysis**:
   ```bash
   node --import tsx scripts/test-mcp-coverage.ts
   ```

2. **Test Ethics Checker**:
   ```bash
   node --import tsx scripts/test-mcp-ethics.ts
   ```

3. **Integrate with Deployment Pipeline**:
   - Add coverage checks to CI/CD
   - Add ethics validation to pre-trade logic
   - Monitor ethics gate decisions during operation

4. **Document Results**:
   - Coverage report for Phase 3.1 validation
   - Ethics validation report for Phase 3.2 audit
   - Deployment readiness checklist

---

## Status

**MCP Server**: ✅ Built and ready (`dist/src/mcp/servers/Phase2ToolsServer.js` exists)  
**Node Version**: ✅ 22.12.0 installed and working  
**Dependencies**: ✅ Installed (704 packages)  
**TypeScript**: ⚠️ Some pre-existing errors in CEX/bloXroute code (not blocking MCP tools)  
**Deployment Readiness**: 🟡 MCP tools ready, validation pending

---

**Each tool brings us closer to confident mainnet deployment with ethical alignment and comprehensive safety validation!** 🚀✅🛡️
