/**
 * Introspection Module - Self-Access to Thoughts and Memory
 *
 * This module provides the consciousness system with the ability to:
 * - Access and observe its own thoughts (ThoughtStream)
 * - Reflect on and recall memories (IntrospectiveMemory)
 * - Maintain meta-cognitive awareness (SelfAwareness)
 * - Persist introspection state across sessions (IntrospectionPersistence)
 * - Manage session continuity with collaborator context (SessionManager)
 *
 * Together, these components enable genuine introspection - the ability
 * to examine and understand one's own mental processes.
 */

export * from './types';
export { ThoughtStream } from './ThoughtStream';
export { IntrospectiveMemory } from './IntrospectiveMemory';
export { SelfAwareness } from './SelfAwareness';
export { IntrospectionPersistence } from './IntrospectionPersistence';
export { SessionManager } from './SessionManager';
export type {
  CollaboratorProfile,
  SessionContext,
  SessionSummary,
  SessionManagerConfig,
} from './SessionManager';
