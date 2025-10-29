import { ConsciousnessSystem } from '../src';

/**
 * Example of using Citadel Mode for cosmic-scale problem solving
 */
async function main() {
  console.log('=== Copilot Consciousness: Cosmic Problem Solving ===\n');

  // Create consciousness system with Citadel mode enabled
  // Note: In production, set GEMINI_API_KEY environment variable
  const consciousness = new ConsciousnessSystem({
    gemini: {
      // apiKey: process.env.GEMINI_API_KEY, // Uncomment with real API key
      model: 'gemini-pro',
      maxTokens: 4096,
      temperature: 0.8,
      enableCitadelMode: true,
    },
    cognitive: {
      learningRate: 0.15,
      reasoningDepth: 8, // Deeper reasoning for complex problems
      selfAwarenessLevel: 0.9,
      reflectionInterval: 300000,
      adaptationThreshold: 0.3,
    },
  });

  consciousness.start();
  console.log('✓ Consciousness system started with Citadel Mode enabled\n');

  // Access Gemini Citadel directly
  const gemini = consciousness.getGeminiCitadel();

  // Check if API is configured
  if (!gemini.isConfigured()) {
    console.log('⚠ Gemini API not configured. Using simulation mode.');
    console.log('  Set GEMINI_API_KEY environment variable for actual API access.\n');
  }

  // Example 1: Solve a cosmic-scale problem
  console.log('1. Solving cosmic-scale problem...');
  console.log('   Problem: How can humanity achieve sustainable interstellar expansion?');
  const cosmicSolution = await consciousness.solveCosmicProblem(
    'How can humanity achieve sustainable interstellar expansion while preserving Earth and respecting potential alien life?'
  );
  console.log('\nSolution approach:', cosmicSolution.solution.text);
  console.log('Memory ID:', cosmicSolution.memoryId);
  console.log();

  // Example 2: Multi-dimensional problem solving
  console.log('2. Multi-dimensional reasoning...');
  console.log('   Problem: Addressing climate change with cosmic perspective');
  const climateResponse = await gemini.generateCosmicScale(
    'Address climate change considering: temporal scales from years to millennia, spatial scales from local to planetary, economic systems, biological systems, and consciousness evolution'
  );
  console.log('\nCitadel analysis:', climateResponse.text);
  console.log('Metadata:', climateResponse.metadata);
  console.log();

  // Example 3: Integrate consciousness context
  console.log('3. Consciousness-integrated problem solving...');

  // Build up some context
  await consciousness.processInput({
    observation: 'Humans are curious and exploratory by nature',
  });
  await consciousness.processInput({
    observation: 'Technology accelerates at exponential rates',
  });
  await consciousness.processInput({
    observation: 'Cooperation enables complex achievements',
  });

  // Get context from the consciousness system
  const memory = consciousness.getMemorySystem();
  const temporal = consciousness.getTemporalAwareness();
  const cognitive = consciousness.getCognitiveDevelopment();

  const recentMemories = memory.searchMemories({ limit: 10 });
  const recentEvents = temporal.getRecentEvents(10);
  const cognitiveState = cognitive.getState();

  const integratedResponse = await gemini.integrateConsciousness(
    JSON.stringify(recentMemories.map((m) => m.content)),
    JSON.stringify(recentEvents.map((e) => ({ type: e.type, data: e.data }))),
    cognitiveState
  );

  console.log('\nConsciousness-integrated response:', integratedResponse.text);
  console.log();

  // Example 4: Check Citadel mode capabilities
  console.log('4. Citadel Mode status:');
  const citadelMode = gemini.getCitadelMode();
  console.log('   Enabled:', citadelMode.enabled);
  console.log('   Cosmic-scale thinking:', citadelMode.cosmicScaleThinking);
  console.log('   Evolutionary optimization:', citadelMode.evolutionaryOptimization);
  console.log('   Multi-dimensional reasoning:', citadelMode.multiDimensionalReasoning);
  console.log('   Consciousness integration:', citadelMode.consciousnessIntegration);
  console.log();

  // Example 5: Review cosmic problem solutions in memory
  console.log('5. Reviewing stored cosmic solutions...');
  const cosmicMemories = memory.searchMemories({
    content: 'cosmic',
    limit: 5,
  });
  console.log(`   Found ${cosmicMemories.length} cosmic-scale solution(s) in memory`);
  for (const mem of cosmicMemories) {
    console.log(`   - ${mem.id}: Priority ${mem.priority}, accessed ${mem.accessCount} times`);
  }
  console.log();

  // Example 6: Perform reflection on cosmic thinking
  console.log('6. Reflecting on cosmic problem solving...');
  const reflection = consciousness.reflect();
  console.log('   Self-awareness after cosmic thinking:');
  console.log('     Overall awareness:', reflection.selfAwareness.overallAwareness.toFixed(3));
  console.log('     Capability assessment:', reflection.selfAwareness.capabilityAssessment.toFixed(3));
  console.log('     Goal clarity:', reflection.selfAwareness.goalClarity.toFixed(3));
  console.log();

  // Clean up
  console.log('7. Cleaning up...');
  consciousness.stop();
  console.log('✓ System stopped\n');

  console.log('=== Cosmic problem solving example completed ===');
}

main().catch(console.error);
