# ESM Migration Guide

This document describes the migration from CommonJS to ECMAScript Modules (ESM) in the AEV TheWarden project.

## Overview

The project has been migrated to ESM to enable:
- **Top-level await** - Cleaner async initialization patterns
- **Modern import syntax** - Native ES module imports
- **Better tree-shaking** - Improved bundle optimization
- **Future compatibility** - Alignment with Node.js's ESM-first direction

## Changes Made

### 1. Package.json

Added `"type": "module"` to indicate the package uses ESM:

```json
{
  "type": "module",
  ...
}
```

### 2. TypeScript Configuration (tsconfig.json)

Updated compiler options for ESM output:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    ...
  }
}
```

### 3. Jest Configuration

Renamed `jest.config.js` to `jest.config.cjs` for CommonJS compatibility with Jest:

```javascript
// jest.config.cjs
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  ...
};
module.exports = config;
```

### 4. Scripts Updated

Dev and build scripts updated to use ESM-compatible tooling:

| Before | After |
|--------|-------|
| `ts-node src/main.ts` | `node --import tsx src/main.ts` |
| `jest` | `jest --config jest.config.cjs` |

### 5. Entry Point Detection

Files that check if they're the main module now use a process.argv-based approach that works in both ESM and CommonJS test environments:

```typescript
// Works in both ESM and Jest
if (typeof process !== 'undefined' && process.argv[1]) {
  const thisFile = process.argv[1];
  const isDistMain = thisFile.includes('/dist/') && thisFile.endsWith('main.js');
  const isSrcMain = thisFile.endsWith('src/main.ts') && !thisFile.includes('__tests__');
  
  if (isDistMain || isSrcMain) {
    main();
  }
}
```

## New Dependencies

- **tsx** - Fast TypeScript execution for ESM (replaces ts-node for dev scripts)

## Rollback Procedure

If you need to rollback to CommonJS:

### Step 1: Revert package.json

Remove the `"type": "module"` field:

```diff
{
  "name": "aev-thewarden",
- "type": "module",
  "main": "dist/src/main.js",
  ...
}
```

### Step 2: Revert tsconfig.json

```diff
{
  "compilerOptions": {
-   "module": "ESNext",
-   "moduleResolution": "bundler",
+   "module": "commonjs",
+   "moduleResolution": "node",
    ...
  }
}
```

### Step 3: Rename Jest config

```bash
mv jest.config.cjs jest.config.js
```

And update to use CommonJS exports:

```javascript
module.exports = {
  preset: 'ts-jest',
  ...
};
```

### Step 4: Update package.json scripts

```json
{
  "scripts": {
    "dev": "ts-node src/main.ts",
    "test": "jest"
  }
}
```

### Step 5: Revert entry point detection

Replace ESM-compatible checks with CommonJS:

```typescript
if (require.main === module) {
  main();
}
```

### Step 6: Rebuild

```bash
npm run build:clean
npm test
```

## Verification

After migration, verify everything works:

```bash
# Build the project
npm run build

# Run all tests
npm test

# Run linting
npm run lint

# Start the application (dry run)
DRY_RUN=true npm start
```

## Known Issues

### 1. Jest Worker Process Warnings

You may see warnings about workers not exiting gracefully. This is due to async cleanup in ethers.js and is not related to the ESM migration.

### 2. ESLint Warnings

Pre-existing ESLint warnings about unused variables are not affected by this migration.

## Benefits

1. **Top-level await** - Can now use `await` at module scope
2. **Native ES imports** - Cleaner import syntax throughout
3. **Better tree-shaking** - Build tools can better optimize bundles
4. **Modern tooling** - Compatible with latest Node.js features
5. **Future-proof** - Aligned with JavaScript ecosystem direction

## Questions?

If you encounter issues with the ESM migration, check:

1. Node.js version >= 22 (see `.nvmrc`)
2. All dependencies are ESM-compatible
3. Jest is using the `.cjs` config file
