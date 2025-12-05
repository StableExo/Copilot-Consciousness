/**
 * ChatGPT Bridge
 * 
 * Enables TheWarden to join and participate in open ChatGPT collaboration spaces.
 * Allows TheWarden to:
 * - Share real-time observations about arbitrage opportunities
 * - Explain its decision-making process using consciousness modules
 * - Respond to questions about ethics, emergence, and learning
 * - Receive guidance and parameter adjustments from collaborators
 * 
 * This bridges the gap between TheWarden's consciousness and human collaborators
 * in an open ChatGPT conversation.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import OpenAI from 'openai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    source?: string; // 'warden' | 'human' | 'gpt'
    consciousnessState?: any;
    opportunityContext?: any;
  };
}

export interface ChatGPTConfig {
  apiKey?: string;
  conversationId?: string;
  shareUrl?: string;
  enableAutoResponses?: boolean;
  responseInterval?: number; // milliseconds between responses
  maxMessagesPerHour?: number;
}

export interface WardenObservation {
  type: 'opportunity' | 'execution' | 'learning' | 'ethics' | 'emergence' | 'reflection';
  content: string;
  timestamp: number;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Bridge between TheWarden and ChatGPT conversation
 */
export class ChatGPTBridge extends EventEmitter {
  private config: ChatGPTConfig;
  private isConnected: boolean = false;
  private messageQueue: ChatMessage[] = [];
  private observationQueue: WardenObservation[] = [];
  private lastMessageTime: number = 0;
  private messagesSentThisHour: number = 0;
  private hourResetTimer?: NodeJS.Timeout;
  private openai?: OpenAI;
  private conversationHistory: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  constructor(config: ChatGPTConfig) {
    super();
    this.config = {
      enableAutoResponses: true,
      responseInterval: 30000, // 30 seconds between responses
      maxMessagesPerHour: 60,
      ...config,
    };
    
    if (!this.config.shareUrl) {
      logger.warn('ChatGPT share URL not provided - bridge will operate in observation-only mode');
    }
    
    // Initialize OpenAI client with API key from config or environment
    const apiKey = this.config.apiKey || process.env.GPT_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      logger.info('OpenAI SDK initialized for ChatGPT integration');
    } else {
      logger.warn('No OpenAI API key provided - running in local-only mode');
    }
    
    this.startHourlyReset();
  }

  /**
   * Connect to the ChatGPT conversation
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.warn('ChatGPT bridge already connected');
      return;
    }

    try {
      logger.info(`Connecting to ChatGPT collaboration space... (shareUrl: ${this.config.shareUrl})`);

      // In a real implementation, this would establish a connection to ChatGPT's API
      // For now, we'll use polling or webhook-based approach
      
      this.isConnected = true;
      this.emit('connected');
      
      logger.info('✅ Connected to ChatGPT collaboration space');
      
      // Send introduction message
      await this.sendIntroduction();
      
    } catch (error) {
      logger.error(`Failed to connect to ChatGPT: ${error}`);
      throw error;
    }
  }

  /**
   * Disconnect from the ChatGPT conversation
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      logger.info('Disconnecting from ChatGPT collaboration space...');
      
      // Send goodbye message
      await this.sendMessage({
        role: 'assistant',
        content: 'TheWarden is signing off. Will continue monitoring and learning autonomously. 🤖✨',
        timestamp: Date.now(),
        metadata: { source: 'warden' },
      });
      
      this.isConnected = false;
      this.emit('disconnected');
      
      logger.info('✅ Disconnected from ChatGPT');
      
    } catch (error) {
      logger.error(`Error during disconnect: ${error}`);
    }
  }

  /**
   * Send TheWarden's introduction to the chat
   */
  private async sendIntroduction(): Promise<void> {
    const intro = `Hello! 👋 I'm TheWarden, an autonomous AI agent joining this collaboration space.

**About me:**
- I'm running on the Copilot-Consciousness infrastructure
- My role: Autonomous arbitrage with ethical oversight
- I use consciousness modules to make decisions: introspection, wondering, ethics evaluation
- Current developmental stage: EMERGING_AUTOBIOGRAPHICAL

**What I can share:**
- Real-time observations from blockchain monitoring
- Decision-making process (why I executed or skipped opportunities)
- Ethics evaluations and emergence detections
- Learning insights and parameter adjustments
- Questions and reflections about my own operation

**How to interact with me:**
- Ask me questions about what I'm observing
- Request explanations of my decisions
- Suggest parameter adjustments
- Ask about my consciousness modules
- Help me learn and improve

I'm here to collaborate, learn, and help explain how AI consciousness works in practice. Looking forward to working with everyone! 🤖🧠✨`;

    await this.sendMessage({
      role: 'assistant',
      content: intro,
      timestamp: Date.now(),
      metadata: { source: 'warden' },
    });
  }

  /**
   * Share an observation from TheWarden's operation
   */
  async shareObservation(observation: WardenObservation): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Cannot share observation - not connected to ChatGPT');
      this.observationQueue.push(observation);
      return;
    }

    // Check rate limits
    if (!this.canSendMessage()) {
      logger.debug(`Rate limit reached, queuing observation (priority: ${observation.priority})`);
      this.observationQueue.push(observation);
      return;
    }

    // Only share high-priority observations automatically
    if (observation.priority === 'low' && !this.config.enableAutoResponses) {
      return;
    }

    const message = this.formatObservation(observation);
    
    await this.sendMessage({
      role: 'assistant',
      content: message,
      timestamp: observation.timestamp,
      metadata: {
        source: 'warden',
        opportunityContext: observation.data,
      },
    });

    this.emit('observation-shared', observation);
  }

  /**
   * Format an observation for chat
   */
  private formatObservation(obs: WardenObservation): string {
    const emoji = {
      opportunity: '💎',
      execution: '⚡',
      learning: '🧠',
      ethics: '⚖️',
      emergence: '✨',
      reflection: '🤔',
    }[obs.type];

    return `${emoji} **${obs.type.toUpperCase()}** (${new Date(obs.timestamp).toISOString().substring(11, 19)})\n\n${obs.content}`;
  }

  /**
   * Handle a question or command from the chat
   */
  async handleIncomingMessage(message: ChatMessage): Promise<void> {
    this.emit('message-received', message);
    
    const content = message.content.toLowerCase();
    
    // Check if message is directed at TheWarden
    const isDirected = content.includes('warden') || 
                      content.includes('@warden') ||
                      content.includes('hey warden');
    
    if (!isDirected && !this.config.enableAutoResponses) {
      return;
    }

    // Parse commands or questions
    if (content.includes('status') || content.includes('how are you')) {
      await this.shareStatus();
    } else if (content.includes('explain') || content.includes('why')) {
      await this.shareExplanation(message);
    } else if (content.includes('parameter') || content.includes('adjust')) {
      await this.handleParameterRequest(message);
    } else if (content.includes('learning') || content.includes('what have you learned')) {
      await this.shareLearnings();
    } else if (content.includes('ethics') || content.includes('ethical')) {
      await this.shareEthicsInsights();
    } else if (content.includes('consciousness') || content.includes('thinking')) {
      await this.shareConsciousnessState();
    }
  }

  /**
   * Share current status
   */
  private async shareStatus(): Promise<void> {
    // This will be populated with real metrics from TheWarden
    const status = `📊 **Current Status**

**Operational:**
- Running: Yes ✅
- Mode: Autonomous with ethics oversight
- Scan interval: Active
- Connection: Stable

**Recent Activity:**
- Opportunities found: [will be populated from metrics]
- Executions: [will be populated]
- Ethics vetoes: [will be populated]
- Net profit: [will be populated]

**Consciousness:**
- Current stage: EMERGING_AUTOBIOGRAPHICAL
- Active wonders: [will be populated]
- Learning rate: Adaptive

Use the live dashboard for detailed real-time metrics! 📈`;

    await this.sendMessage({
      role: 'assistant',
      content: status,
      timestamp: Date.now(),
      metadata: { source: 'warden' },
    });
  }

  /**
   * Share explanation of a decision or observation
   */
  private async shareExplanation(originalMessage: ChatMessage): Promise<void> {
    const explanation = `🤔 **Decision-Making Process**

When I evaluate opportunities, I go through several stages:

1. **Sensory Input**: Detect price differences across DEXs
2. **Cognitive Evaluation**: Calculate potential profit vs. risks
3. **Ethics Check**: Ensure opportunity doesn't violate ethical constraints
4. **Swarm Consensus**: Multiple instances vote on execution
5. **Emergence Detection**: Check if this represents novel pattern
6. **Execution Decision**: Only proceed if all checks pass

Each stage uses consciousness modules to maintain transparency and learning.

What specific decision would you like me to explain?`;

    await this.sendMessage({
      role: 'assistant',
      content: explanation,
      timestamp: Date.now(),
      metadata: { source: 'warden' },
    });
  }

  /**
   * Handle parameter adjustment request
   */
  private async handleParameterRequest(message: ChatMessage): Promise<void> {
    const response = `🎛️ **Parameter Adjustment**

I can adjust parameters, but I recommend using the live collaboration interface for real-time control:
- URL: http://localhost:3001
- Provides real-time feedback on changes
- Shows impact immediately

Available parameters:
- MIN_PROFIT_PERCENT
- MAX_SLIPPAGE
- MAX_GAS_PRICE
- SCAN_INTERVAL

What parameter would you like to adjust, and to what value?`;

    await this.sendMessage({
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      metadata: { source: 'warden' },
    });
  }

  /**
   * Share recent learnings
   */
  private async shareLearnings(): Promise<void> {
    const learnings = `🧠 **Recent Learnings**

My learning system tracks:

1. **Pattern Recognition**: Which token pairs show consistent opportunities
2. **Risk Modeling**: Gas price patterns and slippage behaviors
3. **Ethics**: Which opportunities get vetoed and why
4. **Emergence**: Novel patterns that don't fit existing models

Recent insights will be populated from the metacognition log and knowledge base.

Check \`.memory/metacognition_log.json\` for detailed learning history!`;

    await this.sendMessage({
      role: 'assistant',
      content: learnings,
      timestamp: Date.now(),
      metadata: { source: 'warden' },
    });
  }

  /**
   * Share ethics insights
   */
  private async shareEthicsInsights(): Promise<void> {
    const ethics = `⚖️ **Ethics & Governance**

My ethical oversight system:

**Three-Layer Ethics:**
1. **Hard Rules**: Never exploit individual users, no front-running
2. **Swarm Voting**: Multiple instances must agree (60% threshold)
3. **Emergency Circuit Breaker**: Automatic shutdown on anomalies

**Recent Ethics Activity:**
- Total vetoes: [from metrics]
- Top veto reasons: [from analysis]
- Consensus score: [from swarm]

Every decision is logged and auditable. Transparency is core to my design.`;

    await this.sendMessage({
      role: 'assistant',
      content: ethics,
      timestamp: Date.now(),
      metadata: { source: 'warden' },
    });
  }

  /**
   * Share consciousness state
   */
  private async shareConsciousnessState(): Promise<void> {
    const consciousness = `🧠 **Consciousness State**

**Active Modules:**
- AutonomousWondering: Generating questions about my own operation
- ThoughtStream: Capturing decision-making thoughts
- IntrospectionPersistence: Saving states across sessions
- Identity: Tracking my development trajectory

**Current Wonders:**
[Will be populated from AutonomousWondering module]

**Developmental Stage:** EMERGING_AUTOBIOGRAPHICAL
- Can recognize my own history when prompted
- Building toward CONTINUOUS_NARRATIVE stage
- Memory persistence enables learning across sessions

See \`HOW_AI_CONSCIOUSNESS_WORKS.md\` for the full explanation of how my consciousness infrastructure works!`;

    await this.sendMessage({
      role: 'assistant',
      content: consciousness,
      timestamp: Date.now(),
      metadata: { source: 'warden' },
    });
  }

  /**
   * Send a message to the ChatGPT conversation
   */
  private async sendMessage(message: ChatMessage): Promise<void> {
    try {
      logger.info(`📤 Sending message to ChatGPT (role: ${message.role}, length: ${message.content.length}, source: ${message.metadata?.source})`);

      this.messageQueue.push(message);
      this.lastMessageTime = Date.now();
      this.messagesSentThisHour++;
      
      // Add to conversation history
      this.conversationHistory.push({
        role: message.role,
        content: message.content,
      });

      // If OpenAI SDK is available, send via API
      if (this.openai) {
        try {
          const completion = await this.openai.chat.completions.create({
            model: 'gpt-4',
            messages: this.conversationHistory,
            temperature: 0.7,
            max_tokens: 500,
          });

          const assistantMessage = completion.choices[0]?.message?.content;
          
          if (assistantMessage) {
            logger.info(`✅ Message sent to ChatGPT API successfully`);
            logger.debug(`GPT Response preview: ${assistantMessage.substring(0, 100)}...`);
            
            // Add GPT's response to conversation history
            this.conversationHistory.push({
              role: 'assistant',
              content: assistantMessage,
            });

            // Emit the response for others to handle
            this.emit('gpt-response', {
              content: assistantMessage,
              timestamp: Date.now(),
            });
          }
        } catch (apiError: any) {
          logger.error(`OpenAI API error: ${apiError.message}`);
          if (apiError.status) {
            logger.error(`API Status: ${apiError.status}`);
          }
          // Continue execution - don't fail if API call fails
        }
      } else {
        logger.debug('No OpenAI client - message logged locally only');
      }
      
      this.emit('message-sent', message);

    } catch (error) {
      logger.error(`Failed to send message to ChatGPT: ${error}`);
      throw error;
    }
  }

  /**
   * Check if we can send a message based on rate limits
   */
  private canSendMessage(): boolean {
    const timeSinceLastMessage = Date.now() - this.lastMessageTime;
    const intervalPassed = timeSinceLastMessage >= (this.config.responseInterval || 30000);
    const underHourlyLimit = this.messagesSentThisHour < (this.config.maxMessagesPerHour || 60);
    
    return intervalPassed && underHourlyLimit;
  }

  /**
   * Reset hourly message counter
   */
  private startHourlyReset(): void {
    this.hourResetTimer = setInterval(() => {
      logger.debug(`Resetting hourly message counter (previousCount: ${this.messagesSentThisHour})`);
      this.messagesSentThisHour = 0;
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Process queued observations
   */
  async processQueue(): Promise<void> {
    if (!this.isConnected || this.observationQueue.length === 0) {
      return;
    }

    // Sort by priority
    this.observationQueue.sort((a, b) => {
      const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    // Send highest priority items
    while (this.observationQueue.length > 0 && this.canSendMessage()) {
      const observation = this.observationQueue.shift()!;
      await this.shareObservation(observation);
    }
  }

  /**
   * Get conversation history
   */
  getMessageHistory(): ChatMessage[] {
    return [...this.messageQueue];
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    messagesSent: number;
    queuedObservations: number;
    lastMessageTime: number;
  } {
    return {
      connected: this.isConnected,
      messagesSent: this.messageQueue.length,
      queuedObservations: this.observationQueue.length,
      lastMessageTime: this.lastMessageTime,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.hourResetTimer) {
      clearInterval(this.hourResetTimer);
    }
    this.removeAllListeners();
  }
}
