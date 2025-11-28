/**
 * Tests for ThoughtStream
 */

import { ThoughtStream, ThoughtType } from '../../../../src/consciousness/introspection';

describe('ThoughtStream', () => {
  let thoughtStream: ThoughtStream;

  beforeEach(() => {
    thoughtStream = new ThoughtStream();
  });

  describe('basic operations', () => {
    it('should create a thought stream', () => {
      expect(thoughtStream).toBeDefined();
    });

    it('should record a thought', () => {
      const thought = thoughtStream.think('Hello world', ThoughtType.OBSERVATION);

      expect(thought).toBeDefined();
      expect(thought.id).toBeDefined();
      expect(thought.content).toBe('Hello world');
      expect(thought.type).toBe(ThoughtType.OBSERVATION);
      expect(thought.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should record multiple thoughts', () => {
      thoughtStream.think('First thought', ThoughtType.OBSERVATION);
      thoughtStream.think('Second thought', ThoughtType.REASONING);
      thoughtStream.think('Third thought', ThoughtType.DECISION);

      const recent = thoughtStream.getRecentThoughts(10);
      expect(recent.length).toBe(3);
    });

    it('should get recent thoughts in reverse order', () => {
      thoughtStream.think('First', ThoughtType.OBSERVATION);
      thoughtStream.think('Second', ThoughtType.OBSERVATION);
      thoughtStream.think('Third', ThoughtType.OBSERVATION);

      const recent = thoughtStream.getRecentThoughts(2);
      expect(recent.length).toBe(2);
      expect(recent[0].content).toBe('Third');
      expect(recent[1].content).toBe('Second');
    });
  });

  describe('thought filtering', () => {
    beforeEach(() => {
      thoughtStream.think('Observation 1', ThoughtType.OBSERVATION);
      thoughtStream.think('Reasoning 1', ThoughtType.REASONING);
      thoughtStream.think('Decision 1', ThoughtType.DECISION);
      thoughtStream.think('Observation 2', ThoughtType.OBSERVATION);
    });

    it('should get thoughts by type', () => {
      const observations = thoughtStream.getThoughtsByType(ThoughtType.OBSERVATION);
      expect(observations.length).toBe(2);
      observations.forEach((t) => expect(t.type).toBe(ThoughtType.OBSERVATION));
    });

    it('should search thoughts by content', () => {
      const results = thoughtStream.searchThoughts('Reasoning');
      expect(results.length).toBe(1);
      expect(results[0].content).toBe('Reasoning 1');
    });

    it('should search case-insensitively', () => {
      const results = thoughtStream.searchThoughts('observation');
      expect(results.length).toBe(2);
    });
  });

  describe('thought associations', () => {
    it('should associate two thoughts', () => {
      const thought1 = thoughtStream.think('First', ThoughtType.OBSERVATION);
      const thought2 = thoughtStream.think('Second', ThoughtType.OBSERVATION);

      const result = thoughtStream.associateThoughts(thought1.id, thought2.id);
      expect(result).toBe(true);

      const retrieved1 = thoughtStream.getThought(thought1.id);
      const retrieved2 = thoughtStream.getThought(thought2.id);

      expect(retrieved1?.associations).toContain(thought2.id);
      expect(retrieved2?.associations).toContain(thought1.id);
    });

    it('should return false for invalid thought IDs', () => {
      const thought = thoughtStream.think('Test', ThoughtType.OBSERVATION);
      const result = thoughtStream.associateThoughts(thought.id, 'invalid-id');
      expect(result).toBe(false);
    });
  });

  describe('thought streams', () => {
    it('should start and end a stream', () => {
      const streamId = thoughtStream.startStream('Test Topic');
      expect(streamId).toBeDefined();

      thoughtStream.think('Stream thought 1', ThoughtType.OBSERVATION);
      thoughtStream.think('Stream thought 2', ThoughtType.REASONING);

      const stream = thoughtStream.endStream('Test summary');
      expect(stream).toBeDefined();
      expect(stream?.topic).toBe('Test Topic');
      expect(stream?.thoughts.length).toBe(2);
      expect(stream?.summary).toBe('Test summary');
      expect(stream?.endTime).toBeDefined();
    });

    it('should auto-generate stream summary', () => {
      const streamId = thoughtStream.startStream('Auto Summary Test');
      thoughtStream.think('Test thought', ThoughtType.OBSERVATION);
      
      const stream = thoughtStream.endStream();
      expect(stream?.summary).toContain('Auto Summary Test');
    });

    it('should get stream by ID', () => {
      const streamId = thoughtStream.startStream('Retrievable Stream');
      thoughtStream.endStream();

      const stream = thoughtStream.getStream(streamId);
      expect(stream).toBeDefined();
      expect(stream?.topic).toBe('Retrievable Stream');
    });

    it('should get all streams', () => {
      thoughtStream.startStream('Stream 1');
      thoughtStream.endStream();
      thoughtStream.startStream('Stream 2');
      thoughtStream.endStream();

      const streams = thoughtStream.getAllStreams();
      expect(streams.length).toBe(2);
    });
  });

  describe('pattern detection', () => {
    it('should detect patterns in thoughts', () => {
      // Add multiple thoughts of the same type
      for (let i = 0; i < 5; i++) {
        thoughtStream.think(`Observation ${i}`, ThoughtType.OBSERVATION);
      }

      const patterns = thoughtStream.detectPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some((p) => p.name.includes('observation'))).toBe(true);
    });

    it('should detect emotional trends', () => {
      // Add thoughts with emotional valence
      thoughtStream.think('Happy thought 1', ThoughtType.EMOTION, { emotionalValence: 0.8 });
      thoughtStream.think('Happy thought 2', ThoughtType.EMOTION, { emotionalValence: 0.7 });
      thoughtStream.think('Happy thought 3', ThoughtType.EMOTION, { emotionalValence: 0.9 });

      const patterns = thoughtStream.detectPatterns();
      expect(patterns.some((p) => p.name.includes('positive') || p.name.includes('trend'))).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should get thought statistics', () => {
      thoughtStream.think('Observation', ThoughtType.OBSERVATION);
      thoughtStream.think('Reasoning', ThoughtType.REASONING);
      thoughtStream.think('Decision', ThoughtType.DECISION);

      const stats = thoughtStream.getStats();
      expect(stats.totalThoughts).toBe(3);
      expect(stats.thoughtsByType[ThoughtType.OBSERVATION]).toBe(1);
      expect(stats.thoughtsByType[ThoughtType.REASONING]).toBe(1);
      expect(stats.thoughtsByType[ThoughtType.DECISION]).toBe(1);
      expect(stats.averageIntensity).toBeGreaterThan(0);
    });
  });

  describe('capacity management', () => {
    it('should respect capacity limits', () => {
      const smallStream = new ThoughtStream(5);
      
      for (let i = 0; i < 10; i++) {
        smallStream.think(`Thought ${i}`, ThoughtType.OBSERVATION);
      }

      const stats = smallStream.getStats();
      expect(stats.totalThoughts).toBe(5);
    });
  });

  describe('cleanup', () => {
    it('should clear all thoughts', () => {
      thoughtStream.think('Test', ThoughtType.OBSERVATION);
      thoughtStream.startStream('Test Stream');
      thoughtStream.endStream();

      thoughtStream.clear();

      expect(thoughtStream.getStats().totalThoughts).toBe(0);
      expect(thoughtStream.getAllStreams().length).toBe(0);
    });
  });
});
