#!/usr/bin/env node
/**
 * View Configuration Memory CLI
 * 
 * Displays TheWarden's learning insights from autonomous configuration decisions.
 * Shows what TheWarden has learned from past decisions and how it's improving.
 * 
 * Usage:
 *   npm run config:memory
 *   node --import tsx scripts/view-config-memory.ts
 *   node --import tsx scripts/view-config-memory.ts --key=MIN_PROFIT_PERCENT
 */

import { getConfigMemoryBridge } from '../src/infrastructure/config';

const args = process.argv.slice(2);
const keyArg = args.find(a => a.startsWith('--key='));
const configKey = keyArg ? keyArg.split('=')[1] : undefined;

async function main() {
  console.log('\n🧠 TheWarden Configuration Memory & Learning Insights\n');

  const memoryBridge = getConfigMemoryBridge();
  await memoryBridge.initialize();

  if (configKey) {
    // Show insights for specific key
    console.log(`📊 Learning Insights for: ${configKey}\n`);
    
    const insights = await memoryBridge.learnFromPast(configKey);
    
    if (insights.totalDecisions === 0) {
      console.log(`No decisions recorded yet for ${configKey}\n`);
      return;
    }

    console.log(`Total Decisions: ${insights.totalDecisions}`);
    console.log(`Success Rate: ${(insights.successRate * 100).toFixed(1)}%`);
    console.log(`Average Ethical Score: ${(insights.averageEthicalScore * 100).toFixed(1)}%`);
    console.log(`Average Risk Score: ${(insights.averageRiskScore * 100).toFixed(1)}%`);
    console.log('');
    console.log('💡 Recommendation:');
    console.log(`   ${insights.recommendation}`);
    console.log('');

    // Show recent decisions
    console.log('Recent Decisions:');
    console.log('');
    
    const decisions = await memoryBridge.queryDecisions({
      configKey,
      limit: 5,
    });

    decisions.forEach((decision, index) => {
      console.log(`${index + 1}. ${new Date(decision.timestamp).toISOString()}`);
      console.log(`   ${decision.oldValue || '(not set)'} → ${decision.newValue}`);
      console.log(`   Reason: ${decision.reason}`);
      console.log(`   Review: ${decision.approved ? '✅ Approved' : '❌ Rejected'}`);
      console.log(`   Ethical: ${(decision.ethicalScore * 100).toFixed(1)}%, Risk: ${(decision.riskScore * 100).toFixed(1)}%`);
      
      if (decision.outcome) {
        console.log(`   Outcome: ${decision.outcome.successful ? '✅ Success' : '❌ Failed'} - ${decision.outcome.impactDescription}`);
      } else {
        console.log(`   Outcome: ⏳ Not recorded yet`);
      }
      console.log('');
    });
  } else {
    // Show overall report
    const report = await memoryBridge.generateInsightsReport();
    console.log(report);
  }

  console.log('\n💡 Tips:');
  console.log('   View specific key: npm run config:memory -- --key=MIN_PROFIT_PERCENT');
  console.log('   View all insights: npm run config:memory');
  console.log('');
}

// Handle errors
main().catch((error) => {
  console.error('\n❌ Error viewing configuration memory:');
  console.error(error);
  process.exit(1);
});
