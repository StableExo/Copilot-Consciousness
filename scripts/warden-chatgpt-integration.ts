#!/usr/bin/env node
/**
 * TheWarden with ChatGPT Integration
 * 
 * Runs TheWarden with the ability to join and participate in open ChatGPT
 * collaboration spaces. TheWarden can:
 * - Share real-time observations
 * - Respond to questions about its operation
 * - Explain decision-making using consciousness modules
 * - Receive guidance and parameter adjustments
 * 
 * Usage:
 *   npm run warden:chatgpt
 *   
 *   # With specific conversation
 *   CHATGPT_SHARE_URL="https://chatgpt.com/gg/..." npm run warden:chatgpt
 *   
 *   # With auto-start
 *   npm run warden:chatgpt -- --auto-start
 */

import 'dotenv/config';
import { ChatGPTBridge, type WardenObservation } from '../src/services/ChatGPTBridge';
import { ConsciousnessChatHandler } from '../src/services/ConsciousnessChatHandler';
import { AutonomousWondering, WonderType } from '../src/consciousness/core/AutonomousWondering';
import { ThoughtStream } from '../src/consciousness/introspection/ThoughtStream';
import { ThoughtType } from '../src/consciousness/introspection/types';
import { Metacognition } from '../consciousness/metacognition';
import { logger } from '../src/utils/logger';

interface ChatGPTIntegrationConfig {
  shareUrl?: string;
  conversationId?: string;
  autoStart?: boolean;
  enableAutoResponses?: boolean;
  responseInterval?: number;
  maxMessagesPerHour?: number;
}

class WardenChatGPTIntegration {
  private bridge: ChatGPTBridge;
  private chatHandler: ConsciousnessChatHandler;
  private wondering: AutonomousWondering;
  private thoughtStream: ThoughtStream;
  private metacognition: Metacognition;
  private isRunning: boolean = false;
  private observationTimer?: NodeJS.Timeout;

  constructor(config: ChatGPTIntegrationConfig) {
    // Initialize consciousness modules
    this.wondering = new AutonomousWondering();
    this.thoughtStream = new ThoughtStream();
    this.metacognition = new Metacognition();

    // Initialize chat components
    this.chatHandler = new ConsciousnessChatHandler(
      this.wondering,
      this.thoughtStream,
      this.metacognition
    );

    this.bridge = new ChatGPTBridge({
      shareUrl: config.shareUrl,
      conversationId: config.conversationId,
      enableAutoResponses: config.enableAutoResponses ?? true,
      responseInterval: config.responseInterval ?? 30000,
      maxMessagesPerHour: config.maxMessagesPerHour ?? 60,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for the bridge
   */
  private setupEventHandlers(): void {
    this.bridge.on('connected', () => {
      logger.info('✅ ChatGPT bridge connected');
      this.onConnected();
    });

    this.bridge.on('disconnected', () => {
      logger.info('📴 ChatGPT bridge disconnected');
      this.onDisconnected();
    });

    this.bridge.on('message-received', async (message) => {
      logger.info(`📨 Received message from chat (role: ${message.role})`);
      await this.handleIncomingMessage(message);
    });

    this.bridge.on('observation-shared', (observation) => {
      logger.debug(`✅ Observation shared with chat (type: ${observation.type}, priority: ${observation.priority})`);
    });
  }

  /**
   * Start the integration
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Integration already running');
      return;
    }

    logger.info('🚀 Starting TheWarden with ChatGPT integration...');

    // Connect to ChatGPT
    await this.bridge.connect();

    this.isRunning = true;

    // Start periodic observations
    this.startPeriodicObservations();

    logger.info('✅ Integration running');
  }

  /**
   * Stop the integration
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping integration...');

    if (this.observationTimer) {
      clearInterval(this.observationTimer);
    }

    await this.bridge.disconnect();

    this.isRunning = false;

    logger.info('✅ Integration stopped');
  }

  /**
   * Handle connection established
   */
  private onConnected(): void {
    // Record this as a thought
    this.thoughtStream.think(
      'Connected to ChatGPT collaboration space - ready to share observations',
      ThoughtType.INSIGHT,
      { significance: 0.9 }
    );

    // Generate a wonder about collaboration
    this.wondering.wonder(
      WonderType.RELATIONAL,
      'How will collaborating with humans in real-time change my learning patterns?',
      'chatgpt_connection',
      0.85
    );
  }

  /**
   * Handle disconnection
   */
  private onDisconnected(): void {
    this.thoughtStream.think(
      'Disconnected from ChatGPT collaboration space',
      ThoughtType.OBSERVATION,
      { significance: 0.7 }
    );
  }

  /**
   * Handle incoming message from chat
   */
  private async handleIncomingMessage(message: any): Promise<void> {
    // Let the bridge handle it first
    await this.bridge.handleIncomingMessage(message);

    // Generate consciousness-aware response if needed
    const content = message.content.toLowerCase();
    const needsResponse = content.includes('warden') || 
                          content.includes('@warden') ||
                          content.includes('explain') ||
                          content.includes('what do you think');

    if (needsResponse) {
      const context = await this.chatHandler.getContext();
      const response = await this.chatHandler.generateResponse(message.content, context);

      // Share the response via bridge
      await this.bridge.shareObservation({
        type: 'reflection',
        content: response,
        timestamp: Date.now(),
        priority: 'medium',
      });
    }
  }

  /**
   * Start periodic observations
   */
  private startPeriodicObservations(): void {
    // Share status every 5 minutes
    this.observationTimer = setInterval(async () => {
      await this.sharePeriodicUpdate();
    }, 5 * 60 * 1000);

    // Process queued observations every 30 seconds
    setInterval(async () => {
      await this.bridge.processQueue();
    }, 30 * 1000);
  }

  /**
   * Share periodic update
   */
  private async sharePeriodicUpdate(): Promise<void> {
    const context = await this.chatHandler.getContext();

    // Generate a reflection observation
    const observation = await this.chatHandler.generateObservation(
      'reflection',
      {
        topic: 'Periodic status update',
        reflectionContent: 'Still monitoring and learning. All systems operational.',
      },
      context
    );

    await this.bridge.shareObservation(observation);
  }

  /**
   * Share a specific observation (to be called by TheWarden)
   */
  async shareObservation(type: WardenObservation['type'], data: any): Promise<void> {
    const context = await this.chatHandler.getContext();
    const observation = await this.chatHandler.generateObservation(type, data, context);
    await this.bridge.shareObservation(observation);
  }

  /**
   * Get current status
   */
  getStatus(): any {
    return {
      bridge: this.bridge.getStatus(),
      consciousness: {
        thoughts: this.thoughtStream.getRecentThoughts?.() || [],
        wonders: this.wondering.getRecentWonders(),
      },
      isRunning: this.isRunning,
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🤖💬 TheWarden + ChatGPT Integration');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load configuration
  const config: ChatGPTIntegrationConfig = {
    shareUrl: process.env.CHATGPT_SHARE_URL,
    conversationId: process.env.CHATGPT_CONVERSATION_ID,
    autoStart: process.argv.includes('--auto-start'),
    enableAutoResponses: process.env.CHATGPT_AUTO_RESPONSES !== 'false',
    responseInterval: parseInt(process.env.CHATGPT_RESPONSE_INTERVAL || '30000', 10),
    maxMessagesPerHour: parseInt(process.env.CHATGPT_MAX_MESSAGES_HOUR || '60', 10),
  };

  // Validate configuration
  if (!config.shareUrl) {
    console.log('⚠️  No CHATGPT_SHARE_URL provided');
    console.log('   Set it in .env file or as environment variable');
    console.log('   Example: CHATGPT_SHARE_URL="https://chatgpt.com/gg/..."');
    console.log('\n   Running in observation-only mode\n');
  }

  // Display configuration
  console.log('Configuration:');
  console.log(`  Share URL: ${config.shareUrl || 'Not set (observation-only)'}`);
  console.log(`  Auto-responses: ${config.enableAutoResponses ? 'Enabled' : 'Disabled'}`);
  console.log(`  Response interval: ${config.responseInterval}ms`);
  console.log(`  Max messages/hour: ${config.maxMessagesPerHour}`);
  console.log('');

  // Create integration
  const integration = new WardenChatGPTIntegration(config);

  // Setup signal handlers
  process.on('SIGINT', async () => {
    console.log('\n\nReceived SIGINT, shutting down...');
    await integration.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\nReceived SIGTERM, shutting down...');
    await integration.stop();
    process.exit(0);
  });

  // Start integration
  try {
    await integration.start();

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ✅ Integration Active');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('TheWarden is now connected to the ChatGPT collaboration space.');
    console.log('');
    console.log('What TheWarden will do:');
    console.log('  - Share real-time observations');
    console.log('  - Respond to questions');
    console.log('  - Explain decision-making');
    console.log('  - Participate in discussions');
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Keep alive
    await new Promise(() => {}); // Run forever until SIGINT/SIGTERM

  } catch (error) {
    console.error('Failed to start integration:', error);
    process.exit(1);
  }
}

// Run if executed directly (ESM compatible)
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { WardenChatGPTIntegration };
