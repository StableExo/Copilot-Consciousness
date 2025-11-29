/**
 * Vitest Setup File
 *
 * Global test setup - runs before all tests
 * Provides Jest-compatible globals for migration
 */

import { vi, beforeAll, afterAll } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.ENABLE_LOGGING = 'false';

// Provide Jest-compatible global for gradual migration
// This allows tests using `jest.fn()` to work with `vi.fn()`
// @ts-expect-error - intentionally providing jest compat layer
globalThis.jest = vi;

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Setup global test utilities
beforeAll(() => {
  // Any global setup needed
});

afterAll(() => {
  // Restore console for debugging if needed
  global.console = originalConsole;
});
