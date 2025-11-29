# Development Guide

This guide will help you set up your development environment and understand the development workflow for AEV - TheWarden.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Code Style](#code-style)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

1. **Node.js** `>=22.12.0`
   ```bash
   # Install nvm (Node Version Manager)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
   
   # Install and use the correct Node version
   nvm install
   nvm use
   ```

2. **npm** `>=10.9.0` (comes with Node.js)

3. **Git**
   ```bash
   git --version
   ```

4. **Code Editor** (recommended: VSCode with extensions)
   - TypeScript
   - ESLint
   - Prettier
   - Solidity (if working with smart contracts)

### Optional Tools

- **Hardhat** - For smart contract development
- **Slither** - For smart contract security analysis
- **Docker** - For containerized development

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/StableExo/Copilot-Consciousness.git
cd Copilot-Consciousness
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Required Environment Variables:**
- `NODE_ENV` - Set to `development` for local development
- `DRY_RUN` - Set to `true` to prevent real transactions
- `CHAIN_ID` - Network chain ID (e.g., 8453 for Base)
- `BASE_RPC_URL` - Your RPC endpoint URL
- `WALLET_PRIVATE_KEY` - Your wallet private key (use test wallet!)

### 4. Build the Project

```bash
npm run build
```

### 5. Run Tests

```bash
npm test
```

## Project Structure

```
├── src/                    # Source code
│   ├── arbitrage/         # Arbitrage detection and execution
│   ├── consciousness/     # AI and learning systems
│   ├── dex/              # DEX integration
│   ├── execution/        # Transaction execution
│   ├── mev/              # MEV intelligence
│   ├── security/         # Security systems
│   ├── tools/            # Utility tools
│   └── main.ts           # Entry point
├── consciousness/         # Consciousness framework
├── tests/                # Test files
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end tests
├── docs/                 # Documentation
├── scripts/             # Utility scripts
├── contracts/           # Smart contracts
├── configs/             # Configuration files
└── dist/                # Compiled output (generated)
```

### Key Directories

- **`src/arbitrage/`** - Core arbitrage logic
  - `PathFinder.ts` - Finds arbitrage opportunities
  - `ProfitabilityCalculator.ts` - Calculates profitability
  - `OptimizedPoolScanner.ts` - Scans for liquidity pools

- **`src/consciousness/`** - AI and learning systems
  - `ArbitrageConsciousness.ts` - Main consciousness system
  - `strategy-engines/` - Strategy optimization
  - `ai-integration/` - AI provider integration

- **`src/dex/`** - DEX integrations
  - `registry/` - DEX registry and configuration
  - `adapters/` - Protocol-specific adapters

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Edit the code in your favorite editor. The project uses TypeScript, so you'll get type checking as you code.

### 3. Watch Mode (Optional)

For continuous compilation during development:

```bash
# Watch TypeScript compilation
npm run build:watch

# Watch tests
npm run test:watch
```

### 4. Format and Lint

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### 5. Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Specific test file
npm test -- path/to/test.test.ts

# With coverage
npm run test:coverage
```

### 6. Build

```bash
npm run build
```

### 7. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance tasks

### 8. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Testing

### Unit Tests

Test individual components in isolation:

```bash
npm run test:unit
```

### Integration Tests

Test component interactions:

```bash
npm run test:integration
```

### E2E Tests

Test complete workflows:

```bash
npm run test:e2e
```

### Writing Tests

Example test structure:

```typescript
import { ProfitabilityCalculator } from '../ProfitabilityCalculator';

describe('ProfitabilityCalculator', () => {
  let calculator: ProfitabilityCalculator;

  beforeEach(() => {
    calculator = new ProfitabilityCalculator({
      gasPrice: 20n,
      minProfitThreshold: 10n,
    });
  });

  describe('calculateProfitability', () => {
    it('should calculate profit correctly', () => {
      const path = createMockPath();
      const result = calculator.calculateProfitability(path);
      
      expect(result.netProfit).toBeGreaterThan(0n);
      expect(result.isProfitable).toBe(true);
    });
  });
});
```

## Debugging

### VSCode Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeArgs": [
        "--inspect-brk",
        "${workspaceFolder}/node_modules/.bin/jest",
        "--runInBand"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Main",
      "program": "${workspaceFolder}/src/main.ts",
      "preLaunchTask": "tsc: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

### Console Logging

Use the project's logger:

```typescript
import { logger } from '../utils/logger';

logger.info('Processing opportunity', { path: opportunity });
logger.debug('Detailed debug info', { data });
logger.error('Error occurred', { error });
```

### Debug Environment Variables

```bash
# Enable debug logging
DEBUG=* npm run dev

# Debug specific namespace
DEBUG=arbitrage:* npm run dev
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Explicit return types for public methods
- Avoid `any` type
- Use meaningful variable names

### Formatting

The project uses Prettier for consistent formatting:

```bash
# Format all files
npm run format

# Check if files are formatted
npm run format:check
```

### Linting

ESLint enforces code quality:

```bash
# Lint code
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Common Tasks

### Adding a New DEX

1. Add DEX configuration to `src/dex/registry/dex-registry.ts`
2. Create adapter in `src/dex/adapters/` (if needed)
3. Update tests
4. Run verification: `npm run verify:dex`

### Adding a New Test

1. Create test file: `*.test.ts`
2. Write tests following existing patterns
3. Run tests: `npm test`
4. Check coverage: `npm run test:coverage`

### Updating Dependencies

```bash
# Check for outdated packages
npm run audit:deps

# Update a specific package
npm update package-name

# Update all packages (be careful!)
npm update

# Audit for security issues
npm run audit:prod
```

### Building for Production

```bash
# Clean build
npm run clean
npm run build

# Run pre-deployment checks
npm run check:all
```

## Troubleshooting

### Node Version Issues

```bash
# Check current version
node --version

# Switch to correct version
nvm use
```

### Build Errors

```bash
# Clean and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Test Failures

```bash
# Run specific test
npm test -- path/to/failing/test.test.ts

# Run with verbose output
npm test -- --verbose

# Run in watch mode for debugging
npm run test:watch
```

### Linting Issues

```bash
# Auto-fix most issues
npm run lint:fix

# Format code
npm run format
```

### Environment Issues

```bash
# Validate environment configuration
npm run validate-env

# Check for missing variables
cat .env | grep -v "^#" | grep "="
```

### RPC Connection Issues

- Check RPC URL is correct
- Verify API key is valid
- Check rate limits
- Try alternative RPC provider

### Memory Issues

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Getting Help

- Check [Documentation Index](DOCUMENTATION_INDEX.md)
- Search [GitHub Issues](https://github.com/StableExo/Copilot-Consciousness/issues)
- Read [Contributing Guide](CONTRIBUTING.md)
- Review existing code and tests for examples

---

**Happy Coding!** 🚀
