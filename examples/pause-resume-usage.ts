/**
 * Example: Using Pause/Resume in Consciousness System
 * 
 * This example demonstrates various use cases for the pause/resume functionality
 */

import {
  ConsciousnessCore,
  PauseConditionType,
  ResumeConditionType,
  PauseInteractionMode,
} from '../src/consciousness/core';
import { MemoryConfig } from '../src/types';

// Example 1: Basic Pause and Resume
async function basicPauseResume() {
  const memoryConfig: MemoryConfig = {
    shortTermCapacity: 100,
    workingMemoryCapacity: 50,
    retentionPeriods: {
      sensory: 1000,
      shortTerm: 60000,
      working: 300000,
    },
    longTermCompressionThreshold: 5,
    consolidationInterval: 60000,
  };

  const core = new ConsciousnessCore(memoryConfig, {
    interactionMode: PauseInteractionMode.READ_ONLY,
    persistStateToDisk: true,
    statePath: '.memory/pause_state',
  });

  console.log('System active:', core.isActive());

  // Pause immediately
  await core.pause({
    type: PauseConditionType.IMMEDIATE,
    message: 'User requested diagnostic pause',
  });

  console.log('System paused:', core.isPaused());

  // Check status while paused
  const status = core.getPauseStatus();
  console.log('Pause status:', status);

  // Resume
  await core.resume({
    type: ResumeConditionType.MANUAL,
    message: 'Diagnostics complete',
  });

  console.log('System active:', core.isActive());

  core.cleanup();
}

// Example 2: Conditional Pause - After Task Completion
async function conditionalPauseAfterTask() {
  const memoryConfig: MemoryConfig = {
    shortTermCapacity: 100,
    workingMemoryCapacity: 50,
    retentionPeriods: {
      sensory: 1000,
      shortTerm: 60000,
      working: 300000,
    },
    longTermCompressionThreshold: 5,
    consolidationInterval: 60000,
  };

  const core = new ConsciousnessCore(memoryConfig);

  // Request pause after current task
  await core.pause({
    type: PauseConditionType.AFTER_CURRENT_TASK,
    message: 'Pause after current test run completes',
  });

  console.log('Pause requested, waiting for task...');

  // Simulate task execution
  setTimeout(() => {
    console.log('Task completed, triggering pause...');
    const manager = core.getPauseResumeManager();
    manager.triggerTaskComplete();
    
    console.log('System now paused:', core.isPaused());
  }, 2000);
}

// Example 3: Auto-Resume After Duration
async function autoResumeAfterDuration() {
  const memoryConfig: MemoryConfig = {
    shortTermCapacity: 100,
    workingMemoryCapacity: 50,
    retentionPeriods: {
      sensory: 1000,
      shortTerm: 60000,
      working: 300000,
    },
    longTermCompressionThreshold: 5,
    consolidationInterval: 60000,
  };

  const core = new ConsciousnessCore(memoryConfig, {
    maxPauseDuration: 5000, // Auto-resume after 5 seconds
  });

  console.log('Pausing with auto-resume in 5 seconds...');
  
  await core.pause({
    type: PauseConditionType.IMMEDIATE,
    message: 'Temporary pause for maintenance',
  });

  console.log('System paused:', core.isPaused());

  // System will automatically resume after 5 seconds
  setTimeout(() => {
    console.log('System active:', core.isActive());
    core.cleanup();
  }, 6000);
}

// Example 4: Event Monitoring During Pause/Resume
async function eventMonitoring() {
  const memoryConfig: MemoryConfig = {
    shortTermCapacity: 100,
    workingMemoryCapacity: 50,
    retentionPeriods: {
      sensory: 1000,
      shortTerm: 60000,
      working: 300000,
    },
    longTermCompressionThreshold: 5,
    consolidationInterval: 60000,
  };

  const core = new ConsciousnessCore(memoryConfig);
  const manager = core.getPauseResumeManager();

  // Set up event listeners
  manager.on('pause:started', ({ reason, timestamp }) => {
    console.log(`[${new Date(timestamp).toISOString()}] Pause started: ${reason}`);
  });

  manager.on('pause:completed', ({ timestamp }) => {
    console.log(`[${new Date(timestamp).toISOString()}] Pause completed`);
  });

  manager.on('resume:started', ({ reason, pauseDuration }) => {
    console.log(`Resume started: ${reason}`);
    console.log(`Was paused for ${pauseDuration}ms`);
  });

  manager.on('resume:completed', ({ pauseDuration }) => {
    console.log(`Resume completed. Total pause: ${pauseDuration}ms`);
  });

  // Execute pause/resume cycle
  await core.pause({
    type: PauseConditionType.IMMEDIATE,
    message: 'Testing event monitoring',
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await core.resume({
    type: ResumeConditionType.MANUAL,
  });

  core.cleanup();
}

// Example 5: Queue Mode - Collecting Input During Pause
async function queueMode() {
  const memoryConfig: MemoryConfig = {
    shortTermCapacity: 100,
    workingMemoryCapacity: 50,
    retentionPeriods: {
      sensory: 1000,
      shortTerm: 60000,
      working: 300000,
    },
    longTermCompressionThreshold: 5,
    consolidationInterval: 60000,
  };

  const core = new ConsciousnessCore(memoryConfig, {
    interactionMode: PauseInteractionMode.QUEUE,
  });

  const manager = core.getPauseResumeManager();

  // Pause and queue inputs
  await core.pause({
    type: PauseConditionType.IMMEDIATE,
    message: 'Collecting requirements',
  });

  console.log('System paused, queuing inputs...');

  // Queue multiple inputs
  manager.queueInput({
    type: 'requirement',
    description: 'Add user authentication',
  });

  manager.queueInput({
    type: 'requirement',
    description: 'Implement data validation',
  });

  manager.queueInput({
    type: 'requirement',
    description: 'Add error logging',
  });

  console.log('Queued inputs:', manager.getQueuedInputs().length);

  // Resume and process queue
  manager.on('resume:processing_queue', (count) => {
    console.log(`Processing ${count} queued inputs...`);
    const queued = manager.getQueuedInputs();
    queued.forEach((input: any) => {
      console.log('Processing:', input.description);
    });
  });

  await core.resume({
    type: ResumeConditionType.MANUAL,
  });

  core.cleanup();
}

// Example 6: Milestone-Based Pause
async function milestonePause() {
  const memoryConfig: MemoryConfig = {
    shortTermCapacity: 100,
    workingMemoryCapacity: 50,
    retentionPeriods: {
      sensory: 1000,
      shortTerm: 60000,
      working: 300000,
    },
    longTermCompressionThreshold: 5,
    consolidationInterval: 60000,
  };

  const core = new ConsciousnessCore(memoryConfig);
  const manager = core.getPauseResumeManager();

  // Request pause at milestone
  await core.pause({
    type: PauseConditionType.ON_MILESTONE,
    milestone: 'tests_complete',
  });

  console.log('Waiting for tests to complete...');

  // Simulate test execution
  setTimeout(() => {
    console.log('Tests completed!');
    manager.triggerMilestone('tests_complete');
    
    console.log('System paused at milestone:', core.isPaused());
  }, 3000);
}

// Example 7: Error-Triggered Pause
async function errorPause() {
  const memoryConfig: MemoryConfig = {
    shortTermCapacity: 100,
    workingMemoryCapacity: 50,
    retentionPeriods: {
      sensory: 1000,
      shortTerm: 60000,
      working: 300000,
    },
    longTermCompressionThreshold: 5,
    consolidationInterval: 60000,
  };

  const core = new ConsciousnessCore(memoryConfig);

  try {
    // Simulate critical error condition
    const errorCount = 5;
    if (errorCount > 3) {
      await core.pause({
        type: PauseConditionType.ON_ERROR,
        message: `Critical: ${errorCount} RPC errors detected`,
        errorThreshold: 3,
      });

      console.log('System paused due to error threshold');
      
      const status = core.getPauseStatus();
      console.log('Pause reason:', status.pauseReason);
    }
  } catch (error) {
    console.error('Error handling failed:', error);
  }

  core.cleanup();
}

// Example 8: Scheduled Pause and Resume
async function scheduledPauseResume() {
  const memoryConfig: MemoryConfig = {
    shortTermCapacity: 100,
    workingMemoryCapacity: 50,
    retentionPeriods: {
      sensory: 1000,
      shortTerm: 60000,
      working: 300000,
    },
    longTermCompressionThreshold: 5,
    consolidationInterval: 60000,
  };

  const core = new ConsciousnessCore(memoryConfig);

  // Schedule pause for 2 seconds from now
  const pauseTime = Date.now() + 2000;
  await core.pause({
    type: PauseConditionType.SCHEDULED,
    timestamp: pauseTime,
    message: 'Scheduled maintenance window',
  });

  console.log('Pause scheduled for', new Date(pauseTime).toISOString());

  // Schedule resume for 5 seconds from now
  await new Promise((resolve) => setTimeout(resolve, 2500));
  
  const resumeTime = Date.now() + 2000;
  await core.resume({
    type: ResumeConditionType.SCHEDULED,
    timestamp: resumeTime,
  });

  console.log('Resume scheduled for', new Date(resumeTime).toISOString());
}

// Run examples (uncomment to test)
// basicPauseResume();
// conditionalPauseAfterTask();
// autoResumeAfterDuration();
// eventMonitoring();
// queueMode();
// milestonePause();
// errorPause();
// scheduledPauseResume();

export {
  basicPauseResume,
  conditionalPauseAfterTask,
  autoResumeAfterDuration,
  eventMonitoring,
  queueMode,
  milestonePause,
  errorPause,
  scheduledPauseResume,
};
