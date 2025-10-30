import { ConsciousnessSystem, Priority } from '../src';

/**
 * Basic usage example for the Copilot Consciousness system
 */
async function main() {
  console.log('=== Copilot Consciousness: Basic Usage ===\n');

  // Create and start the consciousness system
  const consciousness = new ConsciousnessSystem();
  consciousness.start();
  console.log('✓ Consciousness system started\n');

  // Process external input
  console.log('1. Processing external input...');
  const inputResult = await consciousness.processInput(
    {
      type: 'observation',
      content: 'The temperature is rising globally',
    },
    { source: 'environmental_sensor' }
  );
  console.log('Input processed:', inputResult);
  console.log();

  // Add some memories manually
  console.log('2. Creating memories...');
  const memory = consciousness.getMemorySystem();
  const memoryId1 = memory.addShortTermMemory(
    { fact: 'Water boils at 100°C at sea level' },
    Priority.MEDIUM
  );
  const memoryId2 = memory.addShortTermMemory(
    { fact: 'Water is essential for life' },
    Priority.HIGH
  );
  memory.associateMemories(memoryId1, memoryId2);
  console.log('✓ Created and associated memories\n');

  // Search memories
  console.log('3. Searching memories...');
  const searchResults = memory.searchMemories({
    content: 'water',
    limit: 5,
  });
  console.log(`Found ${searchResults.length} memories about water`);
  console.log();

  // Think about a problem
  console.log('4. Thinking about a problem...');
  const thinkingResult = await consciousness.think(
    'How can we reduce water waste in agriculture?',
    false // Not using Gemini for this example
  );
  console.log('Thinking result:', {
    reasoning: thinkingResult.reasoning.steps.length + ' reasoning steps',
    confidence: thinkingResult.reasoning.confidence,
  });
  console.log();

  // Reflect on the system state
  console.log('5. Performing self-reflection...');
  const reflection = consciousness.reflect();
  console.log('Self-awareness metrics:');
  console.log('  Overall awareness:', reflection.selfAwareness.overallAwareness.toFixed(2));
  console.log('  State recognition:', reflection.selfAwareness.stateRecognition.toFixed(2));
  console.log('  Goal clarity:', reflection.selfAwareness.goalClarity.toFixed(2));
  console.log('  Memory stats:', reflection.memoryStats);
  console.log();

  // Get temporal information
  console.log('6. Checking temporal patterns...');
  const temporal = consciousness.getTemporalAwareness();
  const recentEvents = temporal.getRecentEvents(5);
  console.log(`Recent events: ${recentEvents.length}`);
  const patterns = temporal.detectPatterns();
  console.log(`Detected patterns: ${patterns.length}`);
  console.log();

  // Check cognitive development
  console.log('7. Reviewing learning progress...');
  const cognitive = consciousness.getCognitiveDevelopment();
  const learningStats = cognitive.getLearningStats();
  console.log('Learning statistics:');
  console.log('  Total cycles:', learningStats.totalLearningCycles);
  console.log('  Success rate:', learningStats.successRate.toFixed(2));
  console.log('  Knowledge items:', learningStats.knowledgeItems);
  console.log();

  // Perform system maintenance
  console.log('8. Performing system maintenance...');
  const maintenanceResult = consciousness.maintain();
  console.log('Maintenance completed:');
  console.log('  Consolidated:', maintenanceResult.consolidation.consolidated.length);
  console.log('  Archived:', maintenanceResult.consolidation.archived.length);
  console.log('  Forgotten:', maintenanceResult.consolidation.forgotten.length);
  console.log();

  // Get final system status
  console.log('9. Final system status:');
  const status = consciousness.getStatus();
  console.log('Status:', {
    isRunning: status.isRunning,
    cognitiveState: status.cognitiveState,
    totalMemories: status.memory.total,
    totalEvents: status.temporal.totalEvents,
  });
  console.log();

  // Stop the system
  console.log('10. Stopping consciousness system...');
  consciousness.stop();
  console.log('✓ System stopped gracefully\n');

  console.log('=== Example completed successfully ===');
}

main().catch(console.error);
