/**
 * DEX Consciousness Integration Example
 * 
 * Demonstrates the integration of DEX monitoring with the consciousness system,
 * including memory system hooks and emotional context.
 */

import { ConsciousnessSystem } from '../src/consciousness';
import { 
  BalancerValidator,
  CurveValidator,
  SushiSwapValidator,
  OneInchValidator,
  DEXMemoryHookImpl,
  DEXEvent,
  DEXEventType,
} from '../src/dex';
import { EmotionalContext } from '../src/consciousness/types/memory';
import { defaultConfig } from '../src/config';

async function main() {
  console.log('=== DEX Consciousness Integration Example ===\n');

  // Initialize consciousness system
  const consciousness = new ConsciousnessSystem(defaultConfig);
  consciousness.start();

  // Get memory system
  const memorySystem = consciousness.getMemorySystem();

  // Initialize DEX memory hook
  const dexMemoryHook = new DEXMemoryHookImpl(memorySystem);

  // Initialize validators
  const validators = [
    new BalancerValidator(),
    new CurveValidator(),
    new SushiSwapValidator(),
    new OneInchValidator(),
  ];

  // Register event handlers to record DEX events in memory
  validators.forEach(validator => {
    validator.onEvent((event: DEXEvent) => {
      console.log(`📊 DEX Event: ${event.dexName} - ${event.type}`);
      
      // Record in memory system
      const memoryId = dexMemoryHook.recordEvent(event);
      console.log(`  └─ Stored in memory: ${memoryId}`);
    });
  });

  // Simulate DEX monitoring
  console.log('\n🔍 Checking DEX Status...\n');
  
  for (const validator of validators) {
    try {
      const status = await validator.checkStatus();
      
      console.log(`\n${status.dexName}:`);
      console.log(`  Health: ${status.isHealthy ? '✅' : '❌'}`);
      console.log(`  Components: ${status.components.length}`);
      
      status.components.forEach(component => {
        console.log(`    - ${component.name}: ${component.status}`);
      });

      if (status.errors && status.errors.length > 0) {
        console.log(`  Errors: ${status.errors.length}`);
      }

      // Create emotional context based on health status
      const emotionalContext: EmotionalContext = {
        primaryEmotion: status.isHealthy ? 'confident' : 'concerned',
        intensity: status.isHealthy ? 0.7 : 0.8,
        valence: status.isHealthy ? 0.8 : -0.3,
        arousal: 0.5,
        timestamp: new Date(),
      };

      // Create a synthetic event for demonstration
      const event: DEXEvent = {
        id: `event-${Date.now()}`,
        type: status.isHealthy ? DEXEventType.LIQUIDITY_CHANGE : DEXEventType.ERROR,
        dexName: status.dexName,
        timestamp: Date.now(),
        data: {
          status,
          components: status.components,
        },
        emotionalContext,
      };

      // Record the event
      dexMemoryHook.recordEvent(event);

    } catch (error) {
      console.log(`\n${validator.getDEXName()}: ❌ Error`);
      console.log(`  ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Demonstrate memory search
  console.log('\n\n📚 Searching Memory for DEX Events...\n');

  const allDexEvents = dexMemoryHook.searchEvents({});
  console.log(`Total DEX events in memory: ${allDexEvents.length}`);

  // Search by specific DEX
  const balancerEvents = dexMemoryHook.searchEvents({ dexName: 'Balancer' });
  console.log(`Balancer events: ${balancerEvents.length}`);

  // Search by event type
  const errorEvents = dexMemoryHook.searchEvents({ type: DEXEventType.ERROR });
  console.log(`Error events: ${errorEvents.length}`);

  // Show memory statistics
  console.log('\n📊 Memory System Statistics:\n');
  const stats = memorySystem.getStats();
  console.log(`Total memories: ${stats.total}`);
  console.log(`By type:`);
  Object.entries(stats.byType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`  - ${type}: ${count}`);
    }
  });

  // Demonstrate consciousness reflection
  console.log('\n🧠 Consciousness Reflection:\n');
  const reflection = consciousness.reflect();
  console.log('Self-awareness:', reflection.selfAwareness);
  console.log('Memory stats:', reflection.memoryStats);
  console.log('Patterns detected:', reflection.patterns.length);

  // Clean up
  consciousness.stop();
  console.log('\n✅ Example completed successfully!');
}

// Run the example
if (require.main === module) {
  main().catch(error => {
    console.error('Error running example:', error);
    process.exit(1);
  });
}

export { main };
