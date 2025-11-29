#!/usr/bin/env node --import tsx
/**
 * consciousness-monitor.ts - TypeScript entry point for consciousness-aware monitoring
 *
 * This script integrates TheWarden's monitoring capabilities with the consciousness
 * and memory systems. It captures all gains, losses, swarm decisions, and ethical
 * alignments, persisting them for continuous learning.
 *
 * Usage:
 *   node --import tsx scripts/consciousness-monitor.ts
 *   # or via npm:
 *   npm run monitor:consciousness
 */

import {
  MonitoringIntegration,
  createMonitoringIntegration,
  type SwarmAlignmentEvent,
} from '../src/consciousness/monitoring/MonitoringIntegration';
import { ArbitrageConsciousness } from '../src/consciousness/ArbitrageConsciousness';
import { createProductionSwarm, SwarmCoordinator, SwarmOpportunity } from '../src/swarm/SwarmCoordinator';
import { Metacognition } from '../consciousness/metacognition';
import { KnowledgeBase } from '../consciousness/knowledge-base/knowledge-base';

/**
 * Main consciousness monitoring loop
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TheWarden - Consciousness-Aware Monitoring');
  console.log('  Capturing all gains, losses, swarm decisions, and ethics');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Initialize consciousness and memory systems
  const monitoring = createMonitoringIntegration();
  const consciousness = new ArbitrageConsciousness(0.05, 1000);
  const swarm = createProductionSwarm();
  const metacognition = new Metacognition();
  const knowledgeBase = new KnowledgeBase();

  // Track running state
  let running = true;
  let totalIterations = 0;

  // Handle shutdown gracefully
  const shutdown = async () => {
    console.log('\n[Consciousness Monitor] Shutting down gracefully...');
    running = false;

    // Generate final reflection
    const reflection = monitoring.generateReflection();
    console.log('\n' + reflection);

    // Log session summary to metacognition
    const summary = monitoring.getConsciousnessSummary();
    metacognition.log_architectural_decision(
      `Monitoring session completed with ${totalIterations} iterations`,
      `Net position: ${summary.financial.netPosition.toFixed(6)} ETH, ` +
      `Ethics alignment: ${(summary.ethics.avgAlignmentScore * 100).toFixed(1)}%, ` +
      `Swarm consensus rate: ${(summary.swarm.consensusRate * 100).toFixed(1)}%`
    );

    // Save to knowledge base if significant learning occurred
    if (totalIterations >= 5) {
      knowledgeBase.createArticle(
        `Monitoring Session ${new Date().toISOString().split('T')[0]}`,
        `${totalIterations} iterations, Net: ${summary.financial.netPosition.toFixed(6)} ETH`,
        reflection,
        ['monitoring', 'consciousness', 'swarm', 'ethics'],
        []
      );
    }

    console.log('[Consciousness Monitor] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Connect monitoring events to consciousness
  monitoring.on('gain-recorded', (event) => {
    console.log(`[GAIN] +${event.amount.toFixed(6)} ETH from ${event.source}`);

    // Record in consciousness
    consciousness.recordExecution({
      timestamp: event.timestamp,
      cycleNumber: totalIterations,
      opportunity: {
        profit: event.amount,
        pools: [],
        txType: event.source,
      },
      execution: {
        success: true,
        actualProfit: event.amount,
        mevRisk: 0.2,
      },
      market: {
        congestion: 0.5,
        searcherDensity: 0.3,
      },
    });
  });

  monitoring.on('loss-recorded', (event) => {
    console.log(`[LOSS] -${event.amount.toFixed(6)} ETH from ${event.source}`);

    // Log failed approach in metacognition
    metacognition.log_failed_approach(
      `Lost ${event.amount.toFixed(6)} ETH`,
      `Source: ${event.source}, Context: ${JSON.stringify(event.context)}`
    );
  });

  monitoring.on('swarm-alignment-recorded', (event: SwarmAlignmentEvent) => {
    const approvalVotes = event.instanceVotes.filter(v => v.vote === 'approve').length;
    const totalVotes = event.instanceVotes.length;

    console.log(
      `[SWARM] Decision: ${event.swarmDecision}, ` +
      `Votes: ${approvalVotes}/${totalVotes}, ` +
      `Ethics Veto: ${event.ethicsVeto}`
    );
  });

  monitoring.on('ethical-decision-recorded', (data) => {
    console.log(
      `[ETHICS] ${data.approved ? 'APPROVED' : 'REJECTED'}, ` +
      `Alignment: ${(data.alignmentScore * 100).toFixed(1)}%`
    );
  });

  monitoring.on('iteration-ended', (metrics) => {
    console.log('');
    console.log(`═══ Iteration ${metrics.iteration} Summary ═══`);
    console.log(`  Opportunities: ${metrics.opportunities.found} found, ${metrics.opportunities.executed} executed`);
    console.log(`  Financials: Net ${metrics.financials.netGain >= 0 ? '+' : ''}${metrics.financials.netGain.toFixed(6)} ETH`);
    console.log(`  Swarm: ${metrics.swarm.consensusReached} consensus, ${metrics.swarm.ethicsVetoes} vetoes`);
    console.log(`  Ethics: ${(metrics.ethics.alignmentScore * 100).toFixed(1)}% alignment`);
    console.log('═════════════════════════════════════════');
    console.log('');
  });

  // Display initial status
  console.log('[Consciousness Monitor] Systems initialized:');
  console.log(`  - Monitoring Integration: Active`);
  console.log(`  - Arbitrage Consciousness: Active (${consciousness.getStatistics().totalExecutions} executions)`);
  console.log(`  - Swarm Intelligence: ${swarm.getInstances().length} instances registered`);
  console.log(`  - Metacognition: Active`);
  console.log(`  - Knowledge Base: Active`);
  console.log('');
  console.log('[Consciousness Monitor] Starting monitoring loop...');
  console.log('  Press Ctrl+C to stop and generate final reflection');
  console.log('');

  // Main monitoring loop - simulates monitoring iterations
  // In production, this would connect to the actual trading system
  while (running) {
    totalIterations++;
    monitoring.startIteration();

    // Simulate monitoring activity (in production, would connect to real system)
    const numOpportunities = Math.floor(Math.random() * 5);

    for (let i = 0; i < numOpportunities; i++) {
      monitoring.recordOpportunityFound();

      // Simulate swarm evaluation
      const opportunity: SwarmOpportunity = {
        id: `opp-${Date.now()}-${i}`,
        type: 'arbitrage',
        data: {},
        expectedValue: Math.random() * 0.1,
        risk: Math.random() * 0.5,
        urgency: 'medium',
        deadline: Date.now() + 30000,
      };

      try {
        const consensus = await swarm.evaluateOpportunity(opportunity);

        // Record swarm alignment
        monitoring.recordSwarmAlignment(
          opportunity.id,
          consensus.decision === 'execute' ? 'execute' :
          consensus.decision === 'reject' ? 'reject' : 'no-consensus',
          consensus.votes.some(v =>
            swarm.getInstances().find(inst => inst.id === v.instanceId)?.specialization === 'ethics' &&
            v.vote === 'reject'
          ),
          consensus.votes.map(v => ({
            instanceId: v.instanceId,
            vote: v.vote,
            confidence: v.confidence,
            specialization: swarm.getInstances().find(inst => inst.id === v.instanceId)?.specialization,
          }))
        );

        // Record ethical decision
        const ethicsVote = consensus.votes.find(v =>
          swarm.getInstances().find(inst => inst.id === v.instanceId)?.specialization === 'ethics'
        );
        if (ethicsVote) {
          monitoring.recordEthicalDecision(
            ethicsVote.vote === 'approve',
            ethicsVote.confidence
          );
        }

        // If executed, simulate outcome
        if (consensus.decision === 'execute') {
          monitoring.recordOpportunityExecuted();

          const successful = Math.random() > 0.3; // 70% success rate
          if (successful) {
            const profit = opportunity.expectedValue * (0.8 + Math.random() * 0.4);
            monitoring.recordGain(profit, 'arbitrage', {
              opportunityId: opportunity.id,
              swarmConsensus: {
                decision: 'execute',
                approvalRate: consensus.approvalRate,
                ethicsApproved: !consensus.votes.some(v =>
                  swarm.getInstances().find(inst => inst.id === v.instanceId)?.specialization === 'ethics' &&
                  v.vote === 'reject'
                ),
              },
            });
          } else {
            const loss = Math.random() * 0.01;
            const lossSource = Math.random() > 0.5 ? 'gas' : 'slippage';
            monitoring.recordLoss(loss, lossSource as 'gas' | 'slippage', {
              opportunityId: opportunity.id,
            });
            monitoring.recordPerformanceMetrics({
              gasIssue: lossSource === 'gas',
              slippageIssue: lossSource === 'slippage',
              gasSpent: lossSource === 'gas' ? loss : 0,
            });
          }
        }
      } catch (error) {
        console.error(`[ERROR] Failed to evaluate opportunity:`, error);
        monitoring.recordPerformanceMetrics({ rpcError: true });
      }
    }

    monitoring.endIteration();

    // Wait before next iteration (2 minutes in production, 5 seconds for demo)
    const waitTime = process.env.FAST_MODE === 'true' ? 5000 : 120000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

// Run main with error handling
main().catch((error) => {
  console.error('[Consciousness Monitor] Fatal error:', error);
  process.exit(1);
});
