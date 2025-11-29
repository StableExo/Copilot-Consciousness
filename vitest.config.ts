import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Include patterns - same as previous Jest config
    include: [
      'src/**/__tests__/**/*.ts',
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'consciousness/**/__tests__/**/*.ts',
      'consciousness/**/*.test.ts',
      'consciousness/**/*.spec.ts',
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
    ],

    // Exclude patterns
    exclude: ['node_modules', 'dist', 'coverage'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts', 'consciousness/**/*.ts'],
      exclude: ['**/*.d.ts', '**/*.test.ts', '**/*.spec.ts', '**/__tests__/**'],
    },

    // Global test timeout (30 seconds)
    testTimeout: 30000,

    // Hook timeout
    hookTimeout: 30000,

    // Verbose output
    reporters: ['verbose'],

    // Allow globals like describe, it, expect without imports
    globals: true,

    // Pool configuration for better isolation
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
      },
    },
  },
});
