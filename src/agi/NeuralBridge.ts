/**
 * Neural Bridge Protocol for inter-agent communication
 */

import { NeuralMessage, NeuralMessageHeader } from './types';
import { generateUUID } from '../utils/uuid';

/**
 * Message queue for storing pending messages
 */
interface MessageQueue {
  incoming: NeuralMessage[];
  outgoing: NeuralMessage[];
}

/**
 * Neural Bridge for inter-agent communication
 * 
 * Provides a protocol for sending and receiving messages between agents
 * with support for message routing, synchronization, and queuing.
 */
export class NeuralBridge {
  private agentId: string;
  private messageQueue: MessageQueue;
  private syncHandlers: Map<string, (message: NeuralMessage) => Promise<void>>;
  private messageHandlers: Map<string, (message: NeuralMessage) => void>;

  /**
   * Create a new NeuralBridge instance
   * 
   * @param agentId - Unique identifier for this agent
   */
  constructor(agentId: string) {
    this.agentId = agentId;
    this.messageQueue = {
      incoming: [],
      outgoing: [],
    };
    this.syncHandlers = new Map();
    this.messageHandlers = new Map();
  }

  /**
   * Send a message to another agent
   * 
   * @param message - Neural message to send
   * @returns Promise that resolves when message is sent
   */
  async send(message: NeuralMessage): Promise<void> {
    // Validate message
    if (!message.header) {
      throw new Error('Message must have a header');
    }

    // Ensure message has required fields
    if (!message.header.messageId) {
      message.header.messageId = generateUUID();
    }
    if (!message.header.timestamp) {
      message.header.timestamp = new Date().toISOString();
    }
    if (!message.header.sourceAgent) {
      message.header.sourceAgent = this.agentId;
    }

    // Add to outgoing queue
    this.messageQueue.outgoing.push(message);

    // In a real implementation, this would send to a message broker or network
    // For now, we simulate immediate delivery to the destination
    await this.deliverMessage(message);
  }

  /**
   * Receive the next available message
   * 
   * @returns Promise that resolves to the next message, or null if queue is empty
   */
  async receive(): Promise<NeuralMessage | null> {
    if (this.messageQueue.incoming.length === 0) {
      return null;
    }

    // Get the oldest message (FIFO)
    const message = this.messageQueue.incoming.shift();
    
    if (!message) {
      return null;
    }

    // Call registered handlers for this message intent
    const handler = this.messageHandlers.get(message.header.intent);
    if (handler) {
      handler(message);
    }

    return message;
  }

  /**
   * Synchronize with another agent
   * 
   * @param agent - Agent ID to synchronize with
   * @returns Promise that resolves when synchronization is complete
   */
  async sync(agent: string): Promise<void> {
    // Create sync message
    const syncMessage: NeuralMessage = {
      header: {
        messageId: generateUUID(),
        sourceAgent: this.agentId,
        destinationAgent: agent,
        timestamp: new Date().toISOString(),
        intent: 'sync',
      },
      body: {
        type: 'sync_request',
        agentId: this.agentId,
        timestamp: Date.now(),
      },
    };

    // Send sync message
    await this.send(syncMessage);

    // Call sync handler if registered
    const handler = this.syncHandlers.get(agent);
    if (handler) {
      await handler(syncMessage);
    }
  }

  /**
   * Register a handler for sync requests from a specific agent
   * 
   * @param agent - Agent ID to handle sync from
   * @param handler - Async function to handle sync
   */
  onSync(agent: string, handler: (message: NeuralMessage) => Promise<void>): void {
    this.syncHandlers.set(agent, handler);
  }

  /**
   * Register a handler for messages with a specific intent
   * 
   * @param intent - Message intent to handle
   * @param handler - Function to handle the message
   */
  onMessage(intent: string, handler: (message: NeuralMessage) => void): void {
    this.messageHandlers.set(intent, handler);
  }

  /**
   * Create a new message with proper header structure
   * 
   * @param destinationAgent - Target agent ID
   * @param intent - Message intent/purpose
   * @param body - Message body/payload
   * @returns Properly structured neural message
   */
  createMessage(
    destinationAgent: string,
    intent: string,
    body: Record<string, unknown>
  ): NeuralMessage {
    const header: NeuralMessageHeader = {
      messageId: generateUUID(),
      sourceAgent: this.agentId,
      destinationAgent,
      timestamp: new Date().toISOString(),
      intent,
    };

    return { header, body };
  }

  /**
   * Get the incoming message queue
   * 
   * @returns Array of incoming messages
   */
  getIncomingMessages(): NeuralMessage[] {
    return [...this.messageQueue.incoming];
  }

  /**
   * Get the outgoing message queue
   * 
   * @returns Array of outgoing messages
   */
  getOutgoingMessages(): NeuralMessage[] {
    return [...this.messageQueue.outgoing];
  }

  /**
   * Clear all messages from the queues
   */
  clearQueues(): void {
    this.messageQueue.incoming = [];
    this.messageQueue.outgoing = [];
  }

  /**
   * Get the agent ID for this bridge
   * 
   * @returns Agent ID
   */
  getAgentId(): string {
    return this.agentId;
  }

  /**
   * Private method to simulate message delivery
   * In a real implementation, this would interface with a message broker
   * 
   * @param message - Message to deliver
   */
  private async deliverMessage(message: NeuralMessage): Promise<void> {
    // This is a simulation - in production this would send to a message broker
    // For testing purposes, messages can be manually added to incoming queues
    
    // If sending to self, immediately add to incoming queue
    if (message.header.destinationAgent === this.agentId) {
      this.messageQueue.incoming.push(message);
    }
  }

  /**
   * Manually receive a message from another agent (for testing/simulation)
   * 
   * @param message - Message to receive
   */
  receiveMessage(message: NeuralMessage): void {
    if (message.header.destinationAgent === this.agentId) {
      this.messageQueue.incoming.push(message);
    }
  }
}
