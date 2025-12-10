#!/usr/bin/env node
/**
 * Bitcoin Address Encoding Utilities
 * 
 * Utilities for converting between different Bitcoin key/address formats.
 * Integrates knowledge from:
 * - https://www.purplemath.com/modules/numbbase.htm (Number base conversion)
 * - https://en.bitcoin.it/wiki/Base58Check_encoding (Bitcoin Base58Check)
 * 
 * Features:
 * - Hex to Base58 address conversion
 * - Private key format validation
 * - Address type detection (P2PKH, P2SH, Bech32)
 * - Checksum verification
 * - Puzzle key range validation
 * 
 * Helpful for verifying BitCrack outputs and understanding address formats.
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';

// Base58 alphabet (Bitcoin's version - no 0, O, I, l to avoid confusion)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Convert hexadecimal string to Base58
 * Using the algorithm described in Bitcoin Wiki
 */
export function hexToBase58(hex: string): string {
  // Remove 0x prefix if present
  hex = hex.replace(/^0x/, '');
  
  // Convert hex to BigInt
  let num = BigInt(`0x${hex}`);
  
  if (num === 0n) {
    return BASE58_ALPHABET[0];
  }
  
  let result = '';
  const base = BigInt(58);
  
  // Convert to base 58
  while (num > 0n) {
    const remainder = Number(num % base);
    result = BASE58_ALPHABET[remainder] + result;
    num = num / base;
  }
  
  // Handle leading zeros in hex (should map to '1' in Base58)
  for (let i = 0; i < hex.length && hex[i] === '0'; i += 2) {
    result = BASE58_ALPHABET[0] + result;
  }
  
  return result;
}

/**
 * Convert Base58 to hexadecimal
 */
export function base58ToHex(base58: string): string {
  let num = 0n;
  const base = BigInt(58);
  
  for (const char of base58) {
    const digit = BASE58_ALPHABET.indexOf(char);
    if (digit === -1) {
      throw new Error(`Invalid Base58 character: ${char}`);
    }
    num = num * base + BigInt(digit);
  }
  
  // Convert to hex
  let hex = num.toString(16);
  
  // Add leading zeros for each leading '1' in base58
  for (const char of base58) {
    if (char !== BASE58_ALPHABET[0]) break;
    hex = '00' + hex;
  }
  
  return hex.toUpperCase();
}

/**
 * SHA-256 hash
 */
function sha256(buffer: Buffer): Buffer {
  return createHash('sha256').update(buffer).digest();
}

/**
 * Double SHA-256 hash (used in Bitcoin)
 */
function hash256(buffer: Buffer): Buffer {
  return sha256(sha256(buffer));
}

/**
 * RIPEMD-160 hash
 */
function ripemd160(buffer: Buffer): Buffer {
  return createHash('ripemd160').update(buffer).digest();
}

/**
 * Convert private key (hex) to WIF (Wallet Import Format)
 * 
 * WIF Format:
 * 1. Add version byte (0x80 for mainnet)
 * 2. Add private key bytes
 * 3. Add compression flag (0x01 for compressed)
 * 4. Calculate checksum (first 4 bytes of double SHA-256)
 * 5. Encode in Base58
 */
export function privateKeyToWIF(privateKeyHex: string, compressed: boolean = true): string {
  // Remove 0x prefix if present
  privateKeyHex = privateKeyHex.replace(/^0x/, '');
  
  // Ensure 32 bytes (64 hex chars)
  privateKeyHex = privateKeyHex.padStart(64, '0');
  
  // Build payload: version + private key + compression flag
  let payload = '80' + privateKeyHex;
  if (compressed) {
    payload += '01';
  }
  
  // Convert to buffer
  const payloadBuffer = Buffer.from(payload, 'hex');
  
  // Calculate checksum
  const checksum = hash256(payloadBuffer).slice(0, 4);
  
  // Combine payload + checksum
  const result = Buffer.concat([payloadBuffer, checksum]);
  
  // Encode in Base58
  return hexToBase58(result.toString('hex'));
}

/**
 * Convert WIF to private key hex
 */
export function wifToPrivateKey(wif: string): { privateKey: string; compressed: boolean } {
  // Decode Base58
  const decoded = Buffer.from(base58ToHex(wif), 'hex');
  
  // Verify minimum length (1 + 32 + 4 = 37 for uncompressed, +1 for compressed)
  if (decoded.length !== 37 && decoded.length !== 38) {
    throw new Error('Invalid WIF length');
  }
  
  // Extract components
  const version = decoded[0];
  const payload = decoded.slice(0, -4);
  const checksum = decoded.slice(-4);
  
  // Verify version
  if (version !== 0x80) {
    throw new Error(`Invalid WIF version: ${version.toString(16)}`);
  }
  
  // Verify checksum
  const calculatedChecksum = hash256(payload).slice(0, 4);
  if (!checksum.equals(calculatedChecksum)) {
    throw new Error('Invalid WIF checksum');
  }
  
  // Extract private key
  const compressed = decoded.length === 38;
  const privateKeyEnd = compressed ? -5 : -4;
  const privateKey = decoded.slice(1, privateKeyEnd).toString('hex').toUpperCase();
  
  return { privateKey, compressed };
}

/**
 * Get public key from private key (simplified - requires secp256k1 in production)
 * This is a placeholder - real implementation needs elliptic curve cryptography
 */
export function privateKeyToPublicKey(privateKeyHex: string, compressed: boolean = true): string {
  // In a real implementation, this would:
  // 1. Multiply private key by generator point G on secp256k1 curve
  // 2. Return compressed (33 bytes) or uncompressed (65 bytes) public key
  
  // Placeholder warning
  console.warn('⚠️ privateKeyToPublicKey requires secp256k1 implementation');
  console.warn('   Install: npm install secp256k1');
  console.warn('   This is a placeholder that returns fake data');
  
  // Return placeholder (would be real public key)
  if (compressed) {
    return '02' + privateKeyHex.slice(0, 62).padStart(62, '0');
  } else {
    return '04' + privateKeyHex.padStart(128, '0').slice(0, 128);
  }
}

/**
 * Convert public key to Bitcoin address (P2PKH)
 * 
 * P2PKH Address Generation:
 * 1. Calculate SHA-256 hash of public key
 * 2. Calculate RIPEMD-160 hash of result
 * 3. Add version byte (0x00 for mainnet P2PKH)
 * 4. Calculate checksum (first 4 bytes of double SHA-256)
 * 5. Encode in Base58Check
 */
export function publicKeyToAddress(publicKeyHex: string): string {
  const publicKeyBuffer = Buffer.from(publicKeyHex, 'hex');
  
  // Step 1 & 2: SHA-256 then RIPEMD-160
  const hash = ripemd160(sha256(publicKeyBuffer));
  
  // Step 3: Add version byte
  const version = Buffer.from([0x00]); // Mainnet P2PKH
  const payload = Buffer.concat([version, hash]);
  
  // Step 4: Calculate checksum
  const checksum = hash256(payload).slice(0, 4);
  
  // Step 5: Combine and encode
  const result = Buffer.concat([payload, checksum]);
  return hexToBase58(result.toString('hex'));
}

/**
 * Validate Bitcoin address checksum
 */
export function validateAddress(address: string): boolean {
  try {
    const decoded = Buffer.from(base58ToHex(address), 'hex');
    
    if (decoded.length !== 25) {
      return false; // Standard address is 25 bytes
    }
    
    const payload = decoded.slice(0, -4);
    const checksum = decoded.slice(-4);
    const calculatedChecksum = hash256(payload).slice(0, 4);
    
    return checksum.equals(calculatedChecksum);
  } catch {
    return false;
  }
}

/**
 * Detect address type
 */
export function detectAddressType(address: string): string {
  if (address.startsWith('1')) {
    return 'P2PKH (Pay to Public Key Hash)';
  } else if (address.startsWith('3')) {
    return 'P2SH (Pay to Script Hash)';
  } else if (address.startsWith('bc1')) {
    return 'Bech32 (Native SegWit)';
  } else {
    return 'Unknown';
  }
}

/**
 * Validate private key is in correct range for a puzzle
 */
export function validatePuzzleKey(privateKeyHex: string, puzzleNumber: number): boolean {
  const key = BigInt(`0x${privateKeyHex}`);
  const min = BigInt(2) ** BigInt(puzzleNumber - 1);
  const max = BigInt(2) ** BigInt(puzzleNumber);
  
  return key >= min && key < max;
}

/**
 * Calculate position of key within puzzle range (0-100%)
 */
export function calculateKeyPosition(privateKeyHex: string, puzzleNumber: number): number {
  const key = BigInt(`0x${privateKeyHex}`);
  const min = BigInt(2) ** BigInt(puzzleNumber - 1);
  const max = BigInt(2) ** BigInt(puzzleNumber);
  const rangeSize = max - min;
  const position = key - min;
  
  return Number((position * 10000n) / rangeSize) / 100; // 2 decimal precision
}

/**
 * Display encoding information for educational purposes
 */
export function displayEncodingInfo(): void {
  console.log('\n' + '='.repeat(80));
  console.log('Bitcoin Address Encoding Information');
  console.log('='.repeat(80));
  
  console.log('\n📚 Number Base Systems:');
  console.log('   Binary (Base 2):      Uses digits 0-1');
  console.log('   Decimal (Base 10):    Uses digits 0-9');
  console.log('   Hexadecimal (Base 16): Uses 0-9, A-F');
  console.log('   Base58 (Bitcoin):     Uses 1-9, A-H, J-N, P-Z, a-k, m-z');
  console.log('                         (Excludes 0, O, I, l to avoid confusion)');
  
  console.log('\n🔐 Private Key Formats:');
  console.log('   Raw Hex:    64 hex characters (256 bits)');
  console.log('               Example: 0000000000000000000000000000000000000000000000000000000000000001');
  console.log('   WIF:        Wallet Import Format (Base58Check encoded)');
  console.log('               Example: KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn');
  
  console.log('\n🏠 Bitcoin Address Types:');
  console.log('   P2PKH:      Starts with "1" (Legacy)');
  console.log('               Example: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  console.log('   P2SH:       Starts with "3" (Script Hash)');
  console.log('               Example: 3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy');
  console.log('   Bech32:     Starts with "bc1" (Native SegWit)');
  console.log('               Example: bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq');
  
  console.log('\n🔄 Conversion Process (Private Key → Address):');
  console.log('   1. Private Key (256-bit number)');
  console.log('   2. × Generator Point G (secp256k1 curve)');
  console.log('   3. = Public Key (X, Y coordinates)');
  console.log('   4. → SHA-256 hash');
  console.log('   5. → RIPEMD-160 hash');
  console.log('   6. → Add version byte + checksum');
  console.log('   7. → Base58Check encode');
  console.log('   8. = Bitcoin Address');
  
  console.log('\n📖 References:');
  console.log('   - Number bases: https://www.purplemath.com/modules/numbbase.htm');
  console.log('   - Base58Check:  https://en.bitcoin.it/wiki/Base58Check_encoding');
  console.log('   - Secp256k1:    https://en.bitcoin.it/wiki/Secp256k1');
  
  console.log('\n' + '='.repeat(80) + '\n');
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'info':
      displayEncodingInfo();
      break;
      
    case 'hex2base58':
      const hex = process.argv[3];
      if (!hex) {
        console.log('Usage: npx tsx scripts/bitcoin_encoding_utils.ts hex2base58 <hex>');
      } else {
        console.log(hexToBase58(hex));
      }
      break;
      
    case 'base582hex':
      const base58 = process.argv[3];
      if (!base58) {
        console.log('Usage: npx tsx scripts/bitcoin_encoding_utils.ts base582hex <base58>');
      } else {
        console.log(base58ToHex(base58));
      }
      break;
      
    case 'key2wif':
      const privKey = process.argv[3];
      const compressed = process.argv[4] !== 'false';
      if (!privKey) {
        console.log('Usage: npx tsx scripts/bitcoin_encoding_utils.ts key2wif <hex_key> [compressed]');
      } else {
        console.log(privateKeyToWIF(privKey, compressed));
      }
      break;
      
    case 'wif2key':
      const wif = process.argv[3];
      if (!wif) {
        console.log('Usage: npx tsx scripts/bitcoin_encoding_utils.ts wif2key <wif>');
      } else {
        const result = wifToPrivateKey(wif);
        console.log(`Private Key: ${result.privateKey}`);
        console.log(`Compressed: ${result.compressed}`);
      }
      break;
      
    case 'validate':
      const address = process.argv[3];
      if (!address) {
        console.log('Usage: npx tsx scripts/bitcoin_encoding_utils.ts validate <address>');
      } else {
        const valid = validateAddress(address);
        const type = detectAddressType(address);
        console.log(`Address: ${address}`);
        console.log(`Type: ${type}`);
        console.log(`Valid: ${valid ? '✓' : '✗'}`);
      }
      break;
      
    case 'position':
      const key = process.argv[3];
      const puzzle = parseInt(process.argv[4] || '71', 10);
      if (!key) {
        console.log('Usage: npx tsx scripts/bitcoin_encoding_utils.ts position <hex_key> [puzzle_number]');
      } else {
        const valid = validatePuzzleKey(key, puzzle);
        const position = calculateKeyPosition(key, puzzle);
        console.log(`Key: ${key}`);
        console.log(`Puzzle: #${puzzle}`);
        console.log(`Valid: ${valid ? '✓' : '✗'}`);
        console.log(`Position: ${position.toFixed(2)}%`);
      }
      break;
      
    default:
      console.log('Bitcoin Address Encoding Utilities');
      console.log('');
      console.log('Usage:');
      console.log('  npx tsx scripts/bitcoin_encoding_utils.ts info');
      console.log('  npx tsx scripts/bitcoin_encoding_utils.ts hex2base58 <hex>');
      console.log('  npx tsx scripts/bitcoin_encoding_utils.ts base582hex <base58>');
      console.log('  npx tsx scripts/bitcoin_encoding_utils.ts key2wif <hex_key> [compressed]');
      console.log('  npx tsx scripts/bitcoin_encoding_utils.ts wif2key <wif>');
      console.log('  npx tsx scripts/bitcoin_encoding_utils.ts validate <address>');
      console.log('  npx tsx scripts/bitcoin_encoding_utils.ts position <hex_key> [puzzle_number]');
      console.log('');
      console.log('Examples:');
      console.log('  # Display encoding information');
      console.log('  npx tsx scripts/bitcoin_encoding_utils.ts info');
      console.log('');
      console.log('  # Convert hex to Base58');
      console.log('  npx tsx scripts/bitcoin_encoding_utils.ts hex2base58 deadbeef');
      console.log('');
      console.log('  # Validate Bitcoin address');
      console.log('  npx tsx scripts/bitcoin_encoding_utils.ts validate 1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU');
      console.log('');
      console.log('  # Calculate key position in puzzle range');
      console.log('  npx tsx scripts/bitcoin_encoding_utils.ts position 6abe1f9b67e114 71');
  }
}

export default {
  hexToBase58,
  base58ToHex,
  privateKeyToWIF,
  wifToPrivateKey,
  privateKeyToPublicKey,
  publicKeyToAddress,
  validateAddress,
  detectAddressType,
  validatePuzzleKey,
  calculateKeyPosition,
  displayEncodingInfo
};
