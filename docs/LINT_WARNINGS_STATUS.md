# Linter Warnings Status

This document tracks ESLint warnings status. Most warnings are `@typescript-eslint/no-unused-vars` which don't affect functionality.

**Last Updated:** November 27, 2025  
**Total Warnings:** ~290 warnings across ~130 files  
**Errors:** 0  
**Status:** ✅ Acceptable - All warnings are non-blocking

## Summary

The warnings are primarily unused variables, which fall into these categories:

### 1. Unused Imports (~50+ occurrences)
- `ethers` imported but not used in some files
- Various type imports kept for documentation purposes

### 2. Unused Catch Variables (~20+ occurrences)
Variables in catch blocks that could be prefixed with `_`:
```typescript
} catch (error) {  // warning
} catch (_error) { // no warning
```

### 3. Unused Function Parameters (~30+ occurrences)
Parameters required by interfaces but not used in implementations.

### 4. Unused Destructured Variables (~10+ occurrences)
Variables destructured but not used in the current implementation.

## Fix Strategy

These warnings are intentionally left as-is because:
1. They don't affect runtime behavior
2. They may be used in future development
3. Fixing them adds maintenance overhead
4. Some are kept for documentation/type clarity

## Commands

```bash
# Run lint and see all warnings
npm run lint

# Run lint with auto-fix (formatting only)
npm run lint:fix
```

## Notes

- All warnings are `@typescript-eslint/no-unused-vars`
- No actual errors - code compiles and runs correctly
- 1330 tests pass successfully
- Warnings don't affect functionality, only code cleanliness
