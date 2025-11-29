/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/consciousness', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'consciousness/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!consciousness/**/*.test.ts'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }]
  },
  // Note: forceExit is used because some third-party libraries (e.g., event emitters,
  // internal timers in testing utilities) may not clean up fully. The primary timer leaks
  // in CircuitBreaker and SwarmCoordinator have been fixed with proper cleanup.
  forceExit: true,
};

module.exports = config;
