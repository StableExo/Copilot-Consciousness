# Code Improvements for Future PRs

This file documents suggested improvements identified during code reviews that are non-blocking but would enhance code quality.

## From PR #259 Code Review (December 2, 2025)

### Type Safety Improvements

#### Event Listener Types (src/main.ts, lines 2019-2020)
**Current:**
```typescript
const eventListeners: Map<string, (...args: any[]) => void> = new Map();
```

**Suggested Improvement:**
Consider defining specific event types for better type safety:
```typescript
interface TheWardenEvents {
  'scan:start': (data: { chainId: number; cycle: number }) => void;
  'scan:complete': (data: { chainId: number; cycle: number; opportunitiesFound: number }) => void;
  'scan:no-opportunities': (data: { chainId: number; cycle: number }) => void;
  'opportunities:found': (data: { opportunities: any[] }) => void;
  'consciousness:activate': (data: any) => void;
  'scan_error': (error: Error) => void;
  'started': () => void;
  'shutdown': () => void;
}

const eventListeners: Map<keyof TheWardenEvents, TheWardenEvents[keyof TheWardenEvents]> = new Map();
```

**Rationale:** Provides compile-time type checking for event names and data shapes, preventing errors from typos or incorrect data structures.

**Priority:** Low (current code is functional, this is an enhancement)

## From Recent PR Reviews

### PR #258: Metacognition Error Handling
1. Add backup before overwriting corrupted JSON files
2. Add test coverage for corrupted JSON handling

### PR #257: TheWarden Timeout and Event Handling
1. Add test coverage for timeout functionality
2. Improve wsHandler encapsulation (use method instead of exposing property)
3. Fix potential null reference in dashboard event handlers (capture reference in closure)
4. Add test coverage for dashboard event integration
5. Handle case where `paths` could be undefined in scan completion

### PR #256: Dead Code Removal
1. Remove unreachable catch handlers in scanCycle (errors already caught internally)

---

**Note:** These improvements are catalogued here for tracking but do not block the current PR. They can be addressed incrementally in future work.

Last Updated: December 2, 2025
