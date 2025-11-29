/**
 * Validation Utilities
 *
 * Integrated from AxionCitadel - Production-tested validation utilities
 * for addresses, RPC URLs, and data parsing.
 *
 * Migrated to viem for better TypeScript support and smaller bundle size.
 */

import { getAddress, isAddress } from 'viem';
import { logger } from '../logger';

/**
 * Validates and normalizes an Ethereum address
 */
export function validateAndNormalizeAddress(
  rawAddress: string | undefined | null,
  contextName: string,
  isRequired: boolean = false
): string | null {
  const addressString = String(rawAddress || '').trim();

  if (!addressString) {
    if (isRequired) {
      const errorMsg = `[ValidationUtils] CRITICAL: Required address ${contextName} is missing or empty.`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
    return null;
  }

  try {
    const cleanAddress = addressString.replace(/^['"]+|['"]+$/g, '');

    if (!isAddress(cleanAddress)) {
      const errorMsg = `[ValidationUtils] ${contextName}: Invalid address format "${cleanAddress}".`;
      if (isRequired) {
        logger.error(`CRITICAL: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      logger.warn(errorMsg);
      return null;
    }

    return getAddress(cleanAddress);
  } catch (error: any) {
    const errorMsg = `[ValidationUtils] ${contextName}: Validation error for "${rawAddress}" - ${error.message}`;
    if (isRequired) {
      logger.error(`CRITICAL: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    logger.warn(errorMsg);
    return null;
  }
}

/**
 * Validates a private key format
 */
export function validatePrivateKey(
  rawKey: string | undefined | null,
  contextName: string
): string | null {
  const keyString = String(rawKey || '')
    .trim()
    .replace(/^0x/, '');

  const valid = /^[a-fA-F0-9]{64}$/.test(keyString);

  if (!valid && keyString) {
    logger.warn(
      `[ValidationUtils PK] Invalid PK format for ${contextName}. It should be a 64-character hex string.`
    );
  }

  return valid ? keyString : null;
}

/**
 * Validates and parses RPC URLs from a comma-separated string
 */
export function validateRpcUrls(rawUrls: string | undefined | null, contextName: string): string[] {
  const urlsString = String(rawUrls || '').trim();

  if (!urlsString) {
    const errorMsg = `[ValidationUtils] CRITICAL ${contextName}: RPC URL(s) string is empty.`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  const urls = urlsString
    .split(',')
    .map((url) => url.trim())
    .filter((url) => {
      if (!url) return false;

      const isValidFormat = /^(https?|wss?):\/\/.+/i.test(url);
      if (!isValidFormat) {
        logger.warn(`[ValidationUtils] ${contextName}: Invalid URL format skipped: "${url}"`);
        return false;
      }
      return true;
    });

  if (urls.length === 0) {
    const errorMsg = `[ValidationUtils] CRITICAL ${contextName}: No valid RPC URLs found.`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  return urls;
}

/**
 * Safely parses a string to BigInt with fallback
 */
export function safeParseBigInt(
  valueStr: string | number | bigint | undefined | null,
  contextName: string,
  defaultValue: bigint = 0n
): bigint {
  try {
    const s = String(valueStr || '').trim();
    if (!s) {
      return defaultValue;
    }
    if (s.includes('.')) {
      throw new Error('Decimal in BigInt string not allowed.');
    }
    return BigInt(s);
  } catch (e: any) {
    logger.warn(
      `[ValidationUtils Parse BigInt] ${contextName}: Failed to parse "${valueStr}" as BigInt: ${e.message}. Using default: ${defaultValue}`
    );
    return defaultValue;
  }
}

/**
 * Safely parses a value to integer with fallback
 */
export function safeParseInt(
  valueStr: string | number | undefined | null,
  contextName: string,
  defaultValue: number = 0
): number {
  if (valueStr === undefined || valueStr === null || String(valueStr).trim() === '') {
    return defaultValue;
  }

  const n = parseInt(String(valueStr).trim(), 10);
  if (isNaN(n)) {
    logger.warn(
      `[ValidationUtils Parse Int] ${contextName}: Failed to parse "${valueStr}" as integer. Using default: ${defaultValue}`
    );
    return defaultValue;
  }

  return n;
}

/**
 * Safely parses a value to float with fallback
 */
export function safeParseFloat(
  value: string | number | undefined | null,
  varName: string,
  defaultValue: number
): number {
  if (value === undefined || value === null || String(value).trim() === '') {
    return defaultValue;
  }

  const num = parseFloat(String(value));
  if (isNaN(num)) {
    logger.warn(
      `[ValidationUtils] Invalid float value for ${varName}: "${value}". Using default: ${defaultValue}.`
    );
    return defaultValue;
  }

  return num;
}

/**
 * Parses a boolean value from string
 */
export function parseBoolean(
  valueStr: string | boolean | undefined | null,
  defaultValue: boolean = false
): boolean {
  if (typeof valueStr === 'boolean') return valueStr;
  if (valueStr === undefined || valueStr === null) return defaultValue;

  const s = String(valueStr || '')
    .trim()
    .toLowerCase();

  if (s === 'true') return true;
  if (s === 'false') return false;

  return defaultValue;
}

export default {
  validateAndNormalizeAddress,
  validatePrivateKey,
  validateRpcUrls,
  safeParseBigInt,
  safeParseInt,
  safeParseFloat,
  parseBoolean,
};
