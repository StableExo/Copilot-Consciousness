/**
 * Example: Using Strategic Intelligence Components
 * 
 * Demonstrates integration of AxionCitadel strategic intelligence
 * with the Copilot-Consciousness system
 */

import { ConsciousnessSystem } from '../consciousness/ConsciousnessSystem';
import { StrategicBlackBoxLogger, DecisionOutcome } from '../intelligence/strategic';
import { EnhancedMEVSensorHub } from '../intelligence/strategic';

async function demonstrateStrategicIntelligence() {
  console.log('=== Strategic Intelligence Integration Demo ===\n');
  
  // Initialize consciousness system
  const consciousness = new ConsciousnessSystem({
    memory: {
      shortTermCapacity: 200,
      workingMemoryCapacity: 9,
    },
    cognitive: {
      learningRate: 0.15,
      selfAwarenessLevel: 0.8,
    },
  });
  
  // Initialize strategic components
  const logger = new StrategicBlackBoxLogger('logs/strategic');
  const sensorHub = EnhancedMEVSensorHub.getInstance();
  
  // Start the consciousness system
  consciousness.start();
  
  // Start environmental monitoring
  sensorHub.start();
  console.log('✓ Environmental monitoring started\n');
  
  // Simulate a consciousness decision with outcome tracking
  console.log('--- Conscious Knowledge Loop Cycle ---\n');
  
  // 1. SENSE: Get environmental context
  const threat = sensorHub.threatAssessment;
  console.log('1. SENSE - Threat Level:', threat?.level);
  console.log('   Confidence:', threat?.confidence);
  console.log('   Recommended Action:', threat?.recommendedAction);
  
  // 2. SIMULATE: Predict outcomes
  const prediction = {
    quality: 0.85,
    resourcesRequired: 150,
    processingTime: 500,
  };
  console.log('\n2. SIMULATE - Predicted Quality:', prediction.quality);
  console.log('   Resources Required:', prediction.resourcesRequired);
  
  // 3. STRATEGIZE: Make decision considering ethics
  const decision = {
    id: 'demo-decision-001',
    type: 'reasoning',
    strategy: 'cognitive-analysis',
  };
  console.log('\n3. STRATEGIZE - Decision:', decision.strategy);
  
  // 4. ACT: Execute with consciousness system
  const startTime = Date.now();
  const result = await consciousness.think(
    'How can we optimize learning while maintaining ethical boundaries?'
  );
  const actualProcessingTime = Date.now() - startTime;
  
  console.log('\n4. ACT - Processing Time:', actualProcessingTime, 'ms');
  console.log('   Confidence:', result.confidence);
  
  // 5. LEARN: Log outcome for analysis
  const outcome: DecisionOutcome = {
    timestamp: new Date().toISOString(),
    decisionId: decision.id,
    decisionType: decision.type,
    strategy: decision.strategy,
    
    // Resources
    resourcesAllocated: prediction.resourcesRequired,
    processingTime: actualProcessingTime,
    cognitiveLoad: 0.7,
    
    // Performance
    confidenceLevel: result.confidence,
    predictedQuality: prediction.quality,
    actualQuality: result.confidence, // Use confidence as quality proxy
    
    // Context
    contextComplexity: 0.6,
    memoryAccess: 5,
    temporalRelevance: 0.8,
    
    // Outcomes
    expectedOutcome: { type: 'reasoning', quality: 'high' },
    actualOutcome: result,
    deviationScore: Math.abs(prediction.quality - result.confidence),
    
    // Learning signals
    isNovel: false,
    requiresAdaptation: Math.abs(prediction.quality - result.confidence) > 0.1,
    status: 'success',
  };
  
  logger.logDecisionOutcome(outcome);
  console.log('\n5. LEARN - Outcome logged');
  console.log('   Quality Deviation:', outcome.deviationScore.toFixed(3));
  console.log('   Requires Adaptation:', outcome.requiresAdaptation);
  
  // 6. EVOLVE: Analyze patterns and adapt
  const analysis = logger.analyzeRecentDecisions(10);
  console.log('\n6. EVOLVE - Recent Performance:');
  console.log('   Success Rate:', analysis.successRate.toFixed(1) + '%');
  console.log('   Average Deviation:', analysis.averageDeviation.toFixed(3));
  console.log('   Adaptation Triggers:', analysis.adaptationTriggers);
  console.log('   Novel Experiences:', analysis.novelExperiences);
  
  // Demonstrate multiple decision cycles
  console.log('\n\n=== Running Multiple Decision Cycles ===\n');
  
  for (let i = 0; i < 5; i++) {
    const cycleStart = Date.now();
    
    // Vary the problems to simulate different scenarios
    const problems = [
      'What is the most efficient path forward?',
      'How should we balance short-term and long-term goals?',
      'What patterns can we identify in recent decisions?',
      'How can we improve decision quality?',
      'What ethical constraints should guide this choice?',
    ];
    
    const cycleResult = await consciousness.think(problems[i]);
    const cycleTime = Date.now() - cycleStart;
    
    // Log each cycle
    const cycleOutcome: DecisionOutcome = {
      timestamp: new Date().toISOString(),
      decisionId: `cycle-${i + 1}`,
      decisionType: 'reasoning',
      strategy: 'iterative-improvement',
      resourcesAllocated: 100 + (i * 20),
      processingTime: cycleTime,
      cognitiveLoad: 0.5 + (Math.random() * 0.3),
      confidenceLevel: cycleResult.confidence,
      predictedQuality: 0.7 + (i * 0.05),
      actualQuality: cycleResult.confidence,
      contextComplexity: 0.4 + (Math.random() * 0.4),
      memoryAccess: 3 + i,
      temporalRelevance: 0.6 + (Math.random() * 0.3),
      expectedOutcome: {},
      actualOutcome: cycleResult,
      deviationScore: Math.abs((0.7 + (i * 0.05)) - cycleResult.confidence),
      isNovel: i === 4, // Last one is novel
      requiresAdaptation: Math.random() > 0.7,
      status: 'success',
    };
    
    logger.logDecisionOutcome(cycleOutcome);
    
    console.log(`Cycle ${i + 1}/${5} - Quality: ${cycleResult.confidence.toFixed(3)}, ` +
                `Time: ${cycleTime}ms`);
  }
  
  // Final analysis
  const finalAnalysis = logger.analyzeRecentDecisions(10);
  console.log('\n=== Final Performance Analysis ===');
  console.log('Total Decisions:', finalAnalysis.totalDecisions);
  console.log('Success Rate:', finalAnalysis.successRate.toFixed(1) + '%');
  console.log('Average Deviation:', finalAnalysis.averageDeviation.toFixed(3));
  console.log('Adaptation Triggers:', finalAnalysis.adaptationTriggers);
  console.log('Novel Experiences:', finalAnalysis.novelExperiences);
  
  // Check environmental status
  const finalStatus = sensorHub.getStatus();
  console.log('\n=== Environmental Status ===');
  console.log('Monitoring Active:', finalStatus.isMonitoring);
  if (finalStatus.threat) {
    console.log('Threat Level:', finalStatus.threat.level);
    console.log('Indicators:', finalStatus.threat.indicators.join(', '));
  }
  
  // Cleanup
  sensorHub.stop();
  consciousness.stop();
  
  console.log('\n✓ Strategic Intelligence demonstration complete\n');
}

// Run the demonstration
demonstrateStrategicIntelligence().catch(console.error);
