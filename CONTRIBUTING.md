# Contributing to AEV - TheWarden

Thank you for your interest in contributing to **AEV (Autonomous Extracted Value) - TheWarden**! This document provides guidelines for contributing to this project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing Guidelines](#testing-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Documentation](#documentation)

## 🤝 Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## 🚀 Getting Started

### Prerequisites

- Node.js `^20.11.1` (use [nvm](https://github.com/nvm-sh/nvm))
- npm `^10.2.4`
- Git
- Basic understanding of TypeScript and Solidity

### Setting Up Your Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Copilot-Consciousness.git
   cd Copilot-Consciousness
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Build the project**:
   ```bash
   npm run build
   ```

6. **Run tests**:
   ```bash
   npm test
   ```

## 💻 Development Setup

### Using the Correct Node Version

```bash
# Install the required Node.js version
nvm install

# Use the required Node.js version
nvm use
```

### Development Workflow

```bash
# Watch mode for TypeScript compilation
npm run build:watch

# Watch mode for tests
npm run test:watch

# Lint your code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 🔧 Making Changes

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/new-dex-integration`)
- `fix/` - Bug fixes (e.g., `fix/pool-detection`)
- `docs/` - Documentation updates (e.g., `docs/update-readme`)
- `refactor/` - Code refactoring (e.g., `refactor/memory-system`)
- `test/` - Test additions/fixes (e.g., `test/add-unit-tests`)

### Code Changes Checklist

Before submitting your changes, ensure:

- [ ] Code follows the project's style guidelines
- [ ] All tests pass (`npm test`)
- [ ] New tests added for new functionality
- [ ] Code is properly documented
- [ ] Build succeeds without errors (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] No console.log statements (unless in scripts)
- [ ] No sensitive data (keys, passwords) in code

## 🧪 Testing Guidelines

### Test Structure

- Unit tests: `src/**/__tests__/*.test.ts`
- Integration tests: `tests/integration/**/*.test.ts`
- E2E tests: `tests/e2e/**/*.test.ts`

### Writing Tests

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = setupTestData();
      
      // Act
      const result = componentMethod(input);
      
      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Running Specific Tests

```bash
# Run specific test file
npm test -- path/to/test.test.ts

# Run tests matching pattern
npm test -- --testPathPattern="arbitrage"

# Run tests with coverage
npm run test:coverage
```

## 📝 Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(dex): add support for Aerodrome Finance on Base

- Integrate Aerodrome pools with factory contract
- Add volatility and stable pool support
- Update DEX registry with Aerodrome configuration

Closes #123
```

```
fix(arbitrage): correct profit calculation for flash loans

The flash loan fee was not being properly accounted for in
multi-hop arbitrage calculations.

Fixes #456
```

## 🔄 Pull Request Process

### Before Submitting

1. **Update your fork**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run the full test suite**:
   ```bash
   npm run check
   ```

3. **Update documentation** if needed

### PR Template

When creating a PR, include:

- **Description**: What does this PR do?
- **Motivation**: Why is this change needed?
- **Testing**: How was this tested?
- **Screenshots**: (if applicable)
- **Related Issues**: Closes #XXX

### PR Review Process

1. At least one maintainer review required
2. All CI checks must pass
3. No merge conflicts
4. Code coverage should not decrease

## 🎨 Code Style

### TypeScript

- Use TypeScript strict mode
- Explicit return types for public methods
- Avoid `any` type (use `unknown` when necessary)
- Prefer `const` over `let`
- Use meaningful variable names

### Example

```typescript
interface UserConfig {
  maxRetries: number;
  timeout: number;
}

export class ServiceManager {
  private config: UserConfig;

  constructor(config: UserConfig) {
    this.config = config;
  }

  public async processRequest(data: string): Promise<Result> {
    // Implementation
  }
}
```

### ESLint & Prettier

The project uses ESLint and Prettier for code formatting:

```bash
# Check formatting
npm run format:check

# Auto-fix formatting
npm run format

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

## 📚 Documentation

### Documentation Guidelines

- Update README.md for user-facing changes
- Update technical docs in `docs/` for architecture changes
- Add JSDoc comments for public APIs
- Include examples in documentation

### JSDoc Example

```typescript
/**
 * Calculates arbitrage profitability after accounting for all costs.
 * 
 * @param path - The arbitrage path to evaluate
 * @param gasPrice - Current gas price in gwei
 * @param flashLoanFee - Flash loan fee percentage (e.g., 0.0009 for 0.09%)
 * @returns Profitability analysis with net profit and ROI
 * 
 * @example
 * ```typescript
 * const result = calculateProfitability(path, 20, 0.0009);
 * console.log(`Net profit: ${result.netProfit} USD`);
 * ```
 */
export function calculateProfitability(
  path: ArbitragePath,
  gasPrice: number,
  flashLoanFee: number
): ProfitabilityResult {
  // Implementation
}
```

## 🔒 Security

### Security Guidelines

- Never commit private keys or secrets
- Use environment variables for sensitive data
- Report security vulnerabilities privately to maintainers
- Follow secure coding practices

### Reporting Security Issues

**Do not** create public issues for security vulnerabilities. Instead, email the maintainer directly at [maintainer email].

## ❓ Questions?

If you have questions:

1. Check the [Documentation Index](DOCUMENTATION_INDEX.md)
2. Search existing [GitHub Issues](https://github.com/StableExo/Copilot-Consciousness/issues)
3. Create a new issue with the `question` label

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Your contributions help make TheWarden better for everyone. We appreciate your time and effort!

---

**Happy Contributing!** 🚀
