/**
 * Tests for NeuralBridge
 */

import { NeuralBridge } from '../NeuralBridge';
import { NeuralMessage } from '../types';

describe('NeuralBridge', () => {
  let bridge: NeuralBridge;

  beforeEach(() => {
    bridge = new NeuralBridge('agent-1');
  });

  describe('constructor', () => {
    it('should create a bridge with an agent ID', () => {
      expect(bridge.getAgentId()).toBe('agent-1');
    });
  });

  describe('createMessage', () => {
    it('should create a properly structured message', () => {
      const message = bridge.createMessage('agent-2', 'test', { data: 'test data' });

      expect(message.header).toBeDefined();
      expect(message.header.sourceAgent).toBe('agent-1');
      expect(message.header.destinationAgent).toBe('agent-2');
      expect(message.header.intent).toBe('test');
      expect(message.header.messageId).toBeDefined();
      expect(message.header.timestamp).toBeDefined();
      expect(message.body).toEqual({ data: 'test data' });
    });
  });

  describe('send', () => {
    it('should send a message', async () => {
      const message = bridge.createMessage('agent-2', 'greeting', { text: 'Hello' });
      
      await bridge.send(message);

      const outgoing = bridge.getOutgoingMessages();
      expect(outgoing).toHaveLength(1);
      expect(outgoing[0]).toEqual(message);
    });

    it('should auto-generate message ID if not provided', async () => {
      const message: NeuralMessage = {
        header: {
          messageId: '',
          sourceAgent: '',
          destinationAgent: 'agent-2',
          timestamp: '',
          intent: 'test',
        },
        body: { test: true },
      };

      await bridge.send(message);

      expect(message.header.messageId).toBeTruthy();
      expect(message.header.timestamp).toBeTruthy();
    });

    it('should deliver message to self if destination is self', async () => {
      const message = bridge.createMessage('agent-1', 'self-message', { data: 'test' });
      
      await bridge.send(message);

      const incoming = bridge.getIncomingMessages();
      expect(incoming).toHaveLength(1);
      expect(incoming[0].header.intent).toBe('self-message');
    });
  });

  describe('receive', () => {
    it('should receive messages from the queue', async () => {
      const message = bridge.createMessage('agent-1', 'incoming', { data: 'test' });
      bridge.receiveMessage(message);

      const received = await bridge.receive();
      
      expect(received).toEqual(message);
      expect(bridge.getIncomingMessages()).toHaveLength(0);
    });

    it('should return null when queue is empty', async () => {
      const received = await bridge.receive();
      expect(received).toBeNull();
    });

    it('should call registered message handler', async () => {
      const handler = jest.fn();
      bridge.onMessage('test-intent', handler);

      const message = bridge.createMessage('agent-1', 'test-intent', { data: 'test' });
      bridge.receiveMessage(message);

      await bridge.receive();
      
      expect(handler).toHaveBeenCalledWith(message);
    });
  });

  describe('sync', () => {
    it('should send a sync message', async () => {
      await bridge.sync('agent-2');

      const outgoing = bridge.getOutgoingMessages();
      expect(outgoing).toHaveLength(1);
      expect(outgoing[0].header.intent).toBe('sync');
      expect(outgoing[0].header.destinationAgent).toBe('agent-2');
    });

    it('should call registered sync handler', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      bridge.onSync('agent-2', handler);

      await bridge.sync('agent-2');

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('onMessage', () => {
    it('should register a message handler', async () => {
      const handler = jest.fn();
      bridge.onMessage('custom-intent', handler);

      const message = bridge.createMessage('agent-1', 'custom-intent', { data: 'test' });
      bridge.receiveMessage(message);

      await bridge.receive();

      expect(handler).toHaveBeenCalledWith(message);
    });
  });

  describe('onSync', () => {
    it('should register a sync handler', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      bridge.onSync('agent-3', handler);

      await bridge.sync('agent-3');

      expect(handler).toHaveBeenCalled();
      const call = handler.mock.calls[0][0];
      expect(call.header.intent).toBe('sync');
    });
  });

  describe('clearQueues', () => {
    it('should clear both incoming and outgoing queues', async () => {
      const message1 = bridge.createMessage('agent-2', 'test', { data: 'test' });
      const message2 = bridge.createMessage('agent-1', 'test', { data: 'test' });
      
      await bridge.send(message1);
      bridge.receiveMessage(message2);

      expect(bridge.getOutgoingMessages()).toHaveLength(1);
      expect(bridge.getIncomingMessages()).toHaveLength(1);

      bridge.clearQueues();

      expect(bridge.getOutgoingMessages()).toHaveLength(0);
      expect(bridge.getIncomingMessages()).toHaveLength(0);
    });
  });

  describe('receiveMessage', () => {
    it('should add message to incoming queue if destination matches', () => {
      const message = bridge.createMessage('agent-1', 'test', { data: 'test' });
      bridge.receiveMessage(message);

      expect(bridge.getIncomingMessages()).toHaveLength(1);
    });

    it('should not add message if destination does not match', () => {
      const otherBridge = new NeuralBridge('agent-2');
      const message = otherBridge.createMessage('agent-3', 'test', { data: 'test' });
      
      bridge.receiveMessage(message);

      expect(bridge.getIncomingMessages()).toHaveLength(0);
    });
  });

  describe('inter-agent communication', () => {
    it('should enable communication between two agents', async () => {
      const bridge1 = new NeuralBridge('agent-1');
      const bridge2 = new NeuralBridge('agent-2');

      // Agent 1 sends message to Agent 2
      const message = bridge1.createMessage('agent-2', 'greeting', { text: 'Hello Agent 2' });
      await bridge1.send(message);

      // Simulate message delivery
      bridge2.receiveMessage(message);

      // Agent 2 receives the message
      const received = await bridge2.receive();
      expect(received).toBeDefined();
      expect(received?.header.sourceAgent).toBe('agent-1');
      expect(received?.body.text).toBe('Hello Agent 2');
    });
  });
});
