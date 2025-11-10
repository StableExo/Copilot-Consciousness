/**
 * Jest Setup File
 * 
 * Global test setup - runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.ENABLE_LOGGING = 'false';

// Increase timeout for integration and E2E tests
jest.setTimeout(30000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup global test utilities
beforeAll(() => {
  // Any global setup needed
});

afterAll(() => {
  // Any global cleanup needed
});
