#!/usr/bin/env node --import tsx
/**
 * Autonomous Gas Network Evaluation Script
 * 
 * This script runs a comprehensive evaluation of Gas Network vs existing infrastructure
 * and saves the results for analysis.
 */

import { GasNetworkEvaluator } from '../src/gas/GasNetworkEvaluator';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🚀 Starting autonomous Gas Network evaluation...\n');
  
  // Get API key from environment
  const gasApiKey = process.env.GAS_API_KEY;
  if (!gasApiKey) {
    console.error('❌ Error: GAS_API_KEY environment variable not set');
    console.log('   Please set it in your .env file or export it:');
    console.log('   export GAS_API_KEY=2e4d60a6-4e90-4e37-88d1-7e959ef18432');
    process.exit(1);
  }
  
  // Get Ethereum RPC URL
  const ethRpcUrl = process.env.ETHEREUM_RPC_URL || process.env.BASE_RPC_URL || 'https://eth.llamarpc.com';
  console.log(`📡 Using Ethereum RPC: ${ethRpcUrl.substring(0, 30)}...`);
  console.log(`🔑 Using Gas Network API key: ${gasApiKey.substring(0, 8)}...\n`);
  
  // Create evaluator
  const evaluator = new GasNetworkEvaluator(gasApiKey, ethRpcUrl);
  
  // Run evaluation
  try {
    const result = await evaluator.evaluate();
    
    // Save results to file
    const outputDir = path.join(process.cwd(), 'data', 'gas-evaluations');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gas-network-evaluation-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);
    
    // Convert BigInt to string for JSON serialization
    const serializable = JSON.parse(
      JSON.stringify(result, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    
    fs.writeFileSync(filepath, JSON.stringify(serializable, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
    
    // Save summary to markdown
    const summaryPath = path.join(outputDir, 'LATEST_EVALUATION.md');
    const summary = generateMarkdownSummary(result);
    fs.writeFileSync(summaryPath, summary);
    console.log(`📝 Summary saved to: ${summaryPath}`);
    
    // Exit with appropriate code
    if (result.recommendation.decision === 'use-gas-network') {
      console.log('\n✅ Recommendation: Integrate Gas Network');
      process.exit(0);
    } else if (result.recommendation.decision === 'use-both') {
      console.log('\n⚖️ Recommendation: Use hybrid approach');
      process.exit(0);
    } else {
      console.log('\n🔄 Recommendation: Keep existing system');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Evaluation failed:', error);
    process.exit(1);
  }
}

function generateMarkdownSummary(result: any): string {
  const date = new Date(result.timestamp).toISOString();
  
  return `# Gas Network Evaluation Results

**Date:** ${date}  
**Duration:** ${result.testDuration}ms

## 🎯 Final Recommendation

**Decision:** \`${result.recommendation.decision.toUpperCase()}\`  
**Confidence:** ${(result.recommendation.confidence * 100).toFixed(0)}%

### Reasoning

${result.recommendation.reasoning.map((r: string) => `- ${r}`).join('\n')}

### Suggested Strategy

\`\`\`
${result.recommendation.suggestedStrategy}
\`\`\`

---

## 📊 Evaluation Metrics

### Accuracy
- **Gas Network:** ${result.accuracy.gasNetworkScore}/100
- **Existing:** ${result.accuracy.existingScore}/100
- **Winner:** ${result.accuracy.winner}
- **Details:** ${result.accuracy.details}

### Latency
- **Gas Network:** ${result.latency.gasNetworkAvg}ms average
- **Existing:** ${result.latency.existingAvg}ms average
- **Winner:** ${result.latency.winner}
- **Details:** ${result.latency.details}

### Coverage
- **Gas Network:** ${result.coverage.gasNetworkChains} chains
- **Existing:** ${result.coverage.existingChains} chains
- **Winner:** ${result.coverage.winner}
- **Details:** ${result.coverage.details}

### Reliability
- **Gas Network:** ${result.reliability.gasNetworkUptime}% uptime
- **Existing:** ${result.reliability.existingUptime}% uptime
- **Winner:** ${result.reliability.winner}
- **Details:** ${result.reliability.details}

### Features
- **Gas Network:** ${result.features.gasNetworkScore}/100
- **Existing:** ${result.features.existingScore}/100
- **Winner:** ${result.features.winner}

**Unique Gas Network Features:**
${result.features.uniqueFeatures.map((f: string) => `- ${f}`).join('\n')}

---

## 🔬 Detailed Comparisons

${result.comparisons.map((comp: any) => `
### ${comp.chain.toUpperCase()}

| Metric | Gas Network | Existing | Winner |
|--------|-------------|----------|--------|
| Price | ${comp.gasNetwork.success ? comp.gasNetwork.price : 'FAILED'} | ${comp.existing.success ? comp.existing.price : 'FAILED'} | ${comp.winner} |
| Latency | ${comp.gasNetwork.latency}ms | ${comp.existing.latency}ms | ${comp.gasNetwork.latency < comp.existing.latency ? 'gas-network' : 'existing'} |
| Confidence | ${comp.gasNetwork.confidence?.toFixed(2) || 'N/A'} | N/A | gas-network |

**Reason:** ${comp.reason}
`).join('\n')}

---

## 💡 Key Insights

${generateInsights(result)}

---

*Generated by TheWarden autonomous evaluation system*
`;
}

function generateInsights(result: any): string {
  const insights: string[] = [];
  
  // Accuracy insights
  if (result.accuracy.winner === 'gas-network') {
    insights.push('✅ **Gas Network provides more accurate pricing** - Consider using as primary source');
  } else if (result.accuracy.winner === 'tie') {
    insights.push('⚖️ **Both systems have similar accuracy** - Either can be used reliably');
  }
  
  // Latency insights
  const latencyDiff = Math.abs(result.latency.gasNetworkAvg - result.latency.existingAvg);
  if (latencyDiff > 500) {
    insights.push(`⚡ **Significant latency difference (${latencyDiff}ms)** - Speed matters for MEV operations`);
  }
  
  // Coverage insights
  if (result.coverage.gasNetworkChains > result.coverage.existingChains * 2) {
    insights.push('🌐 **Gas Network supports 3x+ more chains** - Critical for multi-chain expansion');
  }
  
  // Feature insights
  if (result.features.uniqueFeatures.length > 0) {
    insights.push('🚀 **Unique capabilities available** - Predictions and confidence scores enable advanced strategies');
  }
  
  // Cost insights
  insights.push('💰 **API costs** - Gas Network requires API key, existing system uses free RPC nodes');
  
  // Reliability insights
  if (result.reliability.gasNetworkUptime < result.reliability.existingUptime) {
    insights.push('⚠️ **Existing system more reliable in tests** - Consider using Gas Network with fallback');
  }
  
  return insights.map(i => `- ${i}`).join('\n');
}

// Run evaluation
main().catch(console.error);
