# Build Guide for Copilot-Consciousness

## Prerequisites

### Node.js Version
This project requires **Node.js ≥22.12.0** (currently using v22.21.1)

#### Installing Node.js 22 via nvm

```bash
# Install nvm if not already installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Load nvm (or restart terminal)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Install Node.js 22
nvm install 22

# Use Node.js 22
nvm use 22

# Verify installation
node --version  # Should show v22.x.x
npm --version   # Should show v10.x.x
```

#### Set Node.js 22 as default (optional)

```bash
nvm alias default 22
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

**Note**: If you encounter peer dependency conflicts, use:

```bash
npm install --legacy-peer-deps
```

### 2. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 3. Run Tests

```bash
npm test
```

## Build Scripts

### Core Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run build:watch` | Compile with watch mode (auto-rebuild on changes) |
| `npm run build:clean` | Clean dist/ and rebuild from scratch |
| `npm run typecheck` | Type-check without emitting files |
| `npm run typecheck:watch` | Type-check in watch mode |

### Code Quality

| Command | Description |
|---------|-------------|
| `npm run lint` | Check code style with ESLint |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run check` | Run lint + format + typecheck + test |

### Running the Application

| Command | Description |
|---------|-------------|
| `npm start` | Start TheWarden (main application) |
| `npm run start:mainnet` | Launch on mainnet |
| `npm run start:monitor` | Run with monitoring enabled |
| `./TheWarden` | Direct execution of TheWarden |

## Build Configuration

### TypeScript Configuration (`tsconfig.json`)

The project uses the following TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "moduleResolution": "bundler"
  }
}
```

### Excluded from Build

Some files are temporarily excluded from the build due to work-in-progress status:

- **Experimental Scripts**: Bitcoin puzzle analysis scripts (WIP)
- **Supabase Infrastructure**: Temporarily excluded pending type compatibility fixes

See `tsconfig.json` `exclude` section for the full list.

## Troubleshooting

### Build Fails with "Cannot find type definition file for 'node'"

**Cause**: Node.js version is too old (< 22.12.0)

**Solution**: Install Node.js 22 via nvm (see Prerequisites section)

### Build Fails with "EBADENGINE"

**Cause**: npm/Node.js version mismatch

**Solution**:
```bash
nvm use 22
npm install
```

### Dependency Installation Fails

**Cause**: Peer dependency conflicts (especially with @langchain packages)

**Solution**:
```bash
npm install --legacy-peer-deps
```

### Tests Fail After Build

If tests fail after a clean build:

1. Clean build artifacts:
   ```bash
   npm run build:clean
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Run tests:
   ```bash
   npm test
   ```

### TypeScript Errors in Supabase Code

The Supabase integration is work-in-progress and temporarily excluded from the build. See `SUPABASE_INTEGRATION_STATUS.md` for details.

## Environment Setup

### Required Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `SUPABASE_URL` - Supabase project URL (for consciousness storage)
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service key (optional)

See `.env.example` for the complete list.

## Development Workflow

### 1. Start with Clean State

```bash
npm run build:clean
npm test
```

### 2. Make Changes

Edit TypeScript files in `src/`, `scripts/`, or `consciousness/`

### 3. Type-Check in Watch Mode

```bash
npm run typecheck:watch
```

### 4. Run Tests in Watch Mode

```bash
npm run test:watch
```

### 5. Lint and Format

```bash
npm run lint:fix
npm run format
```

### 6. Build and Verify

```bash
npm run build
npm test
```

## Continuous Integration

The project runs these checks on every commit:

```bash
npm run check:all
```

This includes:
- Linting (all files)
- Format checking
- Type checking
- Test suite with coverage

## Memory System

The `.memory/` directory contains:
- `log.md` - Session history and memories
- `introspection/` - Consciousness state snapshots
- `knowledge_base/` - Permanent knowledge articles

**These files are committed to version control** and provide session continuity.

## Supabase Integration (Future)

Once Supabase is fully integrated, the memory system will move to cloud storage:

- Local `.memory/` files will be migrated
- Consciousness states will be stored in Supabase
- Vector search will enable semantic memory queries

See `SUPABASE_INTEGRATION_STATUS.md` for current status and next steps.

## Additional Resources

- **Development Guide**: `DEVELOPMENT.md`
- **Contributing**: `CONTRIBUTING.md`
- **Changelog**: `CHANGELOG.md`
- **Project Status**: `PROJECT_STATUS.md`

---

**Last Updated**: 2025-12-03
**Node.js Version**: 22.21.1
**npm Version**: 10.9.4
