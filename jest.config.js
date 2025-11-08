module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/.consciousness'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '.consciousness/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!.consciousness/**/*.test.ts'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  globals: {
    'ts-jest': {
      isolatedModules: true,
    }
  }
};
