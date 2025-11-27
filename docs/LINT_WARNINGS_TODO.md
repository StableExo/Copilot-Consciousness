# Linter Warnings Cleanup TODO

This document tracks ESLint warnings that should be addressed in a future cleanup effort.

**Generated:** 2025-11-27  
**Total Warnings:** ~297 warnings across ~133 files  
**Errors:** 0

## Summary by Category

### 1. Unused Variables (`@typescript-eslint/no-unused-vars`)

The majority of warnings are unused variables. These fall into several sub-categories:

#### Unused Imports (~50+ occurrences)
- `ethers` imported but not used in many files
- Various type imports that are no longer needed

**Fix Strategy:** Remove unused imports or use `// eslint-disable-next-line` if intentionally kept for documentation.

#### Unused Error Variables in Catch Blocks (~20+ occurrences)
```typescript
// Current (warning)
} catch (error) {
  // Ignore errors
}

// Fixed (no warning)
} catch (_error) {
  // Ignore errors
}
```

**Fix Strategy:** Prefix unused error variables with underscore `_error`.

#### Unused Function Parameters (~30+ occurrences)
Parameters that are required by interface but not used in implementation.

**Fix Strategy:** Prefix with underscore `_param` or use `// eslint-disable-next-line`.

#### Unused Destructured Variables (~10+ occurrences)
```typescript
// Current (warning)
const { used, unused } = obj;

// Fixed (no warning)  
const { used, unused: _unused } = obj;
```

### 2. Common Files with Multiple Warnings

Files that should be prioritized for cleanup:

| File | Warnings | Notes |
|------|----------|-------|
| `src/utils/logger.ts` | 3 | Unused error vars in catch blocks |
| `src/utils/configValidator.ts` | 2 | Unused error vars in catch blocks |
| `src/simulation/SwapSimulator.ts` | 3 | Unused imports and vars |
| `src/mev/sensors/MEVSensorHub.ts` | Multiple | Various unused vars |
| `src/consciousness/modules/*.ts` | Multiple | Unused context params |

### 3. Test Files

Many test files have unused variable warnings that are less critical:
- `src/**/__tests__/*.ts`
- `tests/**/*.ts`

**Fix Strategy:** Address test file warnings after production code is clean.

## Quick Fixes

### Auto-fixable with ESLint
Run `npm run lint:fix` to auto-fix some warnings (formatting-related).

### Manual Fixes Needed

1. **Remove unused imports:**
   ```bash
   # Find files with unused 'ethers' import
   grep -r "import { ethers" src/ --include="*.ts" | head -20
   ```

2. **Prefix unused error variables:**
   ```bash
   # Find catch blocks with unused error
   grep -rn "catch (error)" src/ --include="*.ts" | head -20
   ```

## Recommended Approach

1. **Phase 1:** Fix core utility files (`src/utils/*.ts`)
2. **Phase 2:** Fix service files (`src/services/*.ts`)
3. **Phase 3:** Fix consciousness modules (`src/consciousness/*.ts`)
4. **Phase 4:** Fix test files (`tests/**/*.ts`, `src/**/__tests__/*.ts`)

## Commands

```bash
# Run lint and see all warnings
npm run lint

# Run lint with auto-fix
npm run lint:fix

# Run lint on specific directory
npx eslint src/utils --ext .ts

# Count warnings by type
npm run lint 2>&1 | grep "warning" | sed 's/.*warning//' | sort | uniq -c | sort -rn
```

## Notes

- All warnings are `@typescript-eslint/no-unused-vars`
- No actual errors - code compiles and runs correctly
- Warnings don't affect functionality, only code cleanliness
- Some unused imports may be intentional (for type documentation)
