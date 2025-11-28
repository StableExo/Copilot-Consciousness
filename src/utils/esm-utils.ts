/**
 * ESM Module Entry Point Detection Utility
 *
 * Provides a cross-compatible way to detect if a module is being run as the main entry point.
 * Works in both ESM runtime and CommonJS Jest test environments.
 *
 * Usage:
 *   import { isMainModule } from './utils/esm-utils';
 *   if (isMainModule(import.meta.url, 'main.ts')) {
 *     main();
 *   }
 *
 * Or for simpler cases:
 *   import { isMainModuleByFilename } from './utils/esm-utils';
 *   if (isMainModuleByFilename('my-script.ts')) {
 *     main();
 *   }
 */

/**
 * Check if the current module is being run as the main entry point.
 *
 * This function uses process.argv[1] to detect the entry point, which works
 * in both ESM and CommonJS (Jest) environments without requiring import.meta.
 *
 * @param filename - The base filename to check (e.g., 'main.ts', 'server.ts')
 * @returns true if this module is the main entry point
 */
export function isMainModuleByFilename(filename: string): boolean {
  if (typeof process === 'undefined' || !process.argv[1]) {
    return false;
  }

  const thisFile = process.argv[1];
  const baseName = filename.replace(/\.(ts|js)$/, '');

  // Check for compiled JS in dist folder
  const isDistMain = thisFile.includes('/dist/') && thisFile.endsWith(`${baseName}.js`);

  // Check for TypeScript source (but not test files)
  const isSrcMain = thisFile.endsWith(filename) && !thisFile.includes('__tests__');

  return isDistMain || isSrcMain;
}

/**
 * Check if the current module is the main entry point using import.meta.url.
 *
 * Note: This function can only be used in true ESM environments.
 * For Jest compatibility, use isMainModuleByFilename instead.
 *
 * @param importMetaUrl - The import.meta.url of the calling module
 * @param filename - Optional filename to validate against
 * @returns true if this module is the main entry point
 */
export function isMainModule(importMetaUrl: string, filename?: string): boolean {
  if (typeof process === 'undefined' || !process.argv[1]) {
    return false;
  }

  try {
    // Use URL constructor which is available in both ESM and CommonJS
    const currentFile = new URL(importMetaUrl).pathname;
    const entryFile = process.argv[1];

    if (filename) {
      return currentFile === entryFile && currentFile.endsWith(filename);
    }

    return currentFile === entryFile;
  } catch {
    // Fall back to filename-based detection
    if (filename) {
      return isMainModuleByFilename(filename);
    }
    return false;
  }
}

/**
 * Run a function if this module is the main entry point.
 *
 * @param filename - The base filename to check
 * @param fn - The function to run (typically main())
 */
export function runIfMain(filename: string, fn: () => Promise<void> | void): void {
  if (isMainModuleByFilename(filename)) {
    Promise.resolve(fn()).catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  }
}
