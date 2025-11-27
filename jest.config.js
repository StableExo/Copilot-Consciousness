module.exports = {
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
  }
};
