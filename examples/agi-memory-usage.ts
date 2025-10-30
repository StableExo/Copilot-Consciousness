/**
 * Example: Using AGI-aligned Memory Core and Neural Bridge
 * 
 * This example demonstrates how to use the new AGI-aligned memory components
 * including MemoryCore with FAISS integration and NeuralBridge for inter-agent communication.
 */

import {
  MemoryCore,
  NeuralBridge,
  AGIMemoryEntry,
  EmotionalContext,
  Priority,
  MemoryType,
} from '../src/agi';

/**
 * Example 1: Basic Memory Core Usage
 */
async function basicMemoryCoreExample() {
  console.log('=== Example 1: Basic Memory Core Usage ===\n');

  // Create a memory core instance
  const memoryCore = new MemoryCore();

  // Define emotional context
  const emotionalContext: EmotionalContext = {
    primaryEmotion: 'curious',
    intensity: 0.7,
    valence: 0.5,
    arousal: 0.6,
    timestamp: new Date(),
  };

  // Create and store a memory
  const memory: AGIMemoryEntry = {
    id: 'memory-001',
    timestamp: new Date().toISOString(),
    type: MemoryType.SEMANTIC,
    content: 'The sky is blue during the day',
    associations: [],
    emotionalContext,
    source: 'observation',
    priority: Priority.MEDIUM,
  };

  await memoryCore.store(memory);
  console.log('Stored memory:', memory.id);

  // Retrieve the memory
  const retrieved = memoryCore.getMemory('memory-001');
  console.log('Retrieved memory:', retrieved?.content);

  // Search for memories
  const searchResults = await memoryCore.search('sky', 5);
  console.log('Search results for "sky":', searchResults.length, 'found');
  console.log('\n');
}

/**
 * Example 2: Working with Multiple Memory Types
 */
async function multipleMemoryTypesExample() {
  console.log('=== Example 2: Multiple Memory Types ===\n');

  const memoryCore = new MemoryCore();

  // Create memories of different types
  const memories: AGIMemoryEntry[] = [
    {
      id: 'episodic-001',
      timestamp: new Date().toISOString(),
      type: MemoryType.EPISODIC,
      content: 'Watched the sunrise at 6:30 AM',
      associations: [],
      emotionalContext: {
        primaryEmotion: 'peaceful',
        intensity: 0.8,
        valence: 0.9,
        arousal: 0.3,
        timestamp: new Date(),
      },
      source: 'experience',
      priority: Priority.HIGH,
    },
    {
      id: 'semantic-001',
      timestamp: new Date().toISOString(),
      type: MemoryType.SEMANTIC,
      content: 'The Earth revolves around the Sun',
      associations: [],
      emotionalContext: {
        primaryEmotion: 'neutral',
        intensity: 0.3,
        valence: 0.0,
        arousal: 0.2,
        timestamp: new Date(),
      },
      source: 'knowledge',
      priority: Priority.MEDIUM,
    },
    {
      id: 'procedural-001',
      timestamp: new Date().toISOString(),
      type: MemoryType.PROCEDURAL,
      content: 'Steps to brew coffee: heat water, add grounds, pour, steep',
      associations: [],
      emotionalContext: {
        primaryEmotion: 'focused',
        intensity: 0.6,
        valence: 0.4,
        arousal: 0.5,
        timestamp: new Date(),
      },
      source: 'skill',
      priority: Priority.LOW,
    },
  ];

  // Store all memories
  for (const memory of memories) {
    await memoryCore.store(memory);
    console.log(`Stored ${memory.type} memory:`, memory.id);
  }

  console.log(`\nTotal memories stored: ${memoryCore.getSize()}`);
  console.log('\n');
}

/**
 * Example 3: Memory Associations
 */
async function memoryAssociationsExample() {
  console.log('=== Example 3: Memory Associations ===\n');

  const memoryCore = new MemoryCore();

  const emotionalContext: EmotionalContext = {
    primaryEmotion: 'analytical',
    intensity: 0.7,
    valence: 0.3,
    arousal: 0.6,
    timestamp: new Date(),
  };

  // Create associated memories
  const memory1: AGIMemoryEntry = {
    id: 'assoc-001',
    timestamp: new Date().toISOString(),
    type: MemoryType.SEMANTIC,
    content: 'Water freezes at 0°C',
    associations: ['assoc-002'],
    emotionalContext,
    source: 'knowledge',
    priority: Priority.MEDIUM,
  };

  const memory2: AGIMemoryEntry = {
    id: 'assoc-002',
    timestamp: new Date().toISOString(),
    type: MemoryType.SEMANTIC,
    content: 'Ice is solid water',
    associations: ['assoc-001'],
    emotionalContext,
    source: 'knowledge',
    priority: Priority.MEDIUM,
  };

  await memoryCore.store(memory1);
  await memoryCore.store(memory2);

  console.log('Created associated memories:');
  console.log('Memory 1:', memory1.content);
  console.log('Memory 1 associations:', memory1.associations);
  console.log('Memory 2:', memory2.content);
  console.log('Memory 2 associations:', memory2.associations);
  console.log('\n');
}

/**
 * Example 4: Neural Bridge - Inter-Agent Communication
 */
async function neuralBridgeExample() {
  console.log('=== Example 4: Neural Bridge Communication ===\n');

  // Create two agents with neural bridges
  const agent1Bridge = new NeuralBridge('agent-alpha');
  const agent2Bridge = new NeuralBridge('agent-beta');

  console.log('Created bridges for:', agent1Bridge.getAgentId(), 'and', agent2Bridge.getAgentId());

  // Agent 1 creates and sends a message to Agent 2
  const message = agent1Bridge.createMessage(
    'agent-beta',
    'greeting',
    {
      text: 'Hello Agent Beta, how are you?',
      timestamp: Date.now(),
    }
  );

  console.log('\nAgent Alpha sending message...');
  await agent1Bridge.send(message);

  // Simulate message delivery (in real system, this would be handled by message broker)
  agent2Bridge.receiveMessage(message);

  // Agent 2 receives the message
  const receivedMessage = await agent2Bridge.receive();
  console.log('Agent Beta received message from:', receivedMessage?.header.sourceAgent);
  console.log('Message content:', receivedMessage?.body.text);

  // Agent 2 sends a response
  const response = agent2Bridge.createMessage(
    'agent-alpha',
    'response',
    {
      text: 'Hello Agent Alpha! I am functioning optimally.',
      inReplyTo: message.header.messageId,
      timestamp: Date.now(),
    }
  );

  console.log('\nAgent Beta sending response...');
  await agent2Bridge.send(response);

  // Simulate delivery back to Agent 1
  agent1Bridge.receiveMessage(response);

  const receivedResponse = await agent1Bridge.receive();
  console.log('Agent Alpha received response from:', receivedResponse?.header.sourceAgent);
  console.log('Response content:', receivedResponse?.body.text);
  console.log('\n');
}

/**
 * Example 5: Synchronization Between Agents
 */
async function agentSyncExample() {
  console.log('=== Example 5: Agent Synchronization ===\n');

  const agent1Bridge = new NeuralBridge('agent-1');
  const agent2Bridge = new NeuralBridge('agent-2');

  // Register sync handler for agent 2
  agent2Bridge.onSync('agent-1', async (message) => {
    console.log('Agent 2 received sync request from:', message.header.sourceAgent);
    console.log('Sync timestamp:', message.body.timestamp);
  });

  // Agent 1 initiates sync with Agent 2
  console.log('Agent 1 initiating sync with Agent 2...');
  await agent1Bridge.sync('agent-2');

  console.log('Synchronization completed');
  console.log('\n');
}

/**
 * Example 6: Message Handlers
 */
async function messageHandlersExample() {
  console.log('=== Example 6: Message Handlers ===\n');

  const bridge = new NeuralBridge('agent-handler');

  // Register handler for specific message intent
  bridge.onMessage('task-request', (message) => {
    console.log('Received task request:', message.body.task);
    console.log('Priority:', message.body.priority);
  });

  // Create and deliver a task request message
  const taskMessage = bridge.createMessage(
    'agent-handler',
    'task-request',
    {
      task: 'Process incoming data stream',
      priority: 'high',
      deadline: Date.now() + 3600000,
    }
  );

  bridge.receiveMessage(taskMessage);
  await bridge.receive(); // This will trigger the handler

  console.log('\n');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  AGI-Aligned Memory Core and Neural Bridge Demo  ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  await basicMemoryCoreExample();
  await multipleMemoryTypesExample();
  await memoryAssociationsExample();
  await neuralBridgeExample();
  await agentSyncExample();
  await messageHandlersExample();

  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║             All Examples Completed!               ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  basicMemoryCoreExample,
  multipleMemoryTypesExample,
  memoryAssociationsExample,
  neuralBridgeExample,
  agentSyncExample,
  messageHandlersExample,
  runAllExamples,
};
