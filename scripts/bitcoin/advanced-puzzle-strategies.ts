/**
 * Advanced Bitcoin Mnemonic Puzzle Strategies
 * 
 * These are more sophisticated transformation strategies based on:
 * - Video hints (pi shifts, magic constant 130)
 * - Fibonacci sequences
 * - Gray code transformations
 * - Systematic XOR key search
 * - Bit rotation and manipulation
 * 
 * Purpose: Continue autonomous search with unexplored hypothesis space
 */

import * as bip39 from 'bip39';

const PUZZLE_NUMBERS = [
  512, 128, 256, 64, 32, 16, 8, 4, 2, 1,
  1024, 2048, 4096, 8192, 16384, 32768,
  65536, 131072, 262144, 524288, 1048576,
  2097152, 4194304, 8388608
];

const TARGET_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
const LAST_WORD_HINT = 'track';

/**
 * Strategy 7: Fibonacci Shift Mapping
 * Use fibonacci sequence to shift indices
 */
export function fibonacciShiftMapping(numbers: number[], wordlist: string[]): string[] {
  // Generate fibonacci sequence up to 24 elements
  const fib = [1, 1];
  while (fib.length < 24) {
    fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
  }
  
  return numbers.map((num, idx) => {
    const shift = fib[idx % fib.length];
    const index = (num + shift) % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 8: Gray Code Transformation
 * Convert binary numbers to Gray code then use as indices
 */
export function grayCodeMapping(numbers: number[], wordlist: string[]): string[] {
  const toGrayCode = (n: number): number => {
    return n ^ (n >>> 1);
  };
  
  return numbers.map(num => {
    const gray = toGrayCode(num);
    const index = gray % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 9: Bit Rotation
 * Rotate bits left/right by varying amounts
 */
export function bitRotationMapping(numbers: number[], wordlist: string[], rotateBy: number = 3): string[] {
  const rotateBits = (n: number, rot: number, bits: number = 24): number => {
    const mask = (1 << bits) - 1;
    rot = rot % bits;
    return ((n << rot) | (n >>> (bits - rot))) & mask;
  };
  
  return numbers.map(num => {
    const rotated = rotateBits(num, rotateBy);
    const index = rotated % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 10: Hamming Weight (Population Count)
 * Use number of set bits as transformation factor
 */
export function hammingWeightMapping(numbers: number[], wordlist: string[]): string[] {
  const popCount = (n: number): number => {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>>= 1;
    }
    return count;
  };
  
  return numbers.map((num, idx) => {
    const weight = popCount(num);
    const index = (num + weight * idx) % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 11: Square Sum Pairs (Magic Constant 130 hint)
 * Sum squares of adjacent numbers
 */
export function squareSumMapping(numbers: number[], wordlist: string[]): string[] {
  const words: string[] = [];
  
  for (let i = 0; i < numbers.length; i += 2) {
    if (i + 1 < numbers.length) {
      // Square each number and sum
      const sum = (numbers[i] * numbers[i]) + (numbers[i + 1] * numbers[i + 1]);
      const index = sum % wordlist.length;
      words.push(wordlist[index]);
    }
  }
  
  return words;
}

/**
 * Strategy 12: Modular Multiplication
 * Multiply by prime constants
 */
export function modularMultiplicationMapping(numbers: number[], wordlist: string[], multiplier: number = 31): string[] {
  return numbers.map(num => {
    const product = (num * multiplier) % wordlist.length;
    return wordlist[product];
  });
}

/**
 * Strategy 13: Bit Complement
 * Complement bits (invert) within 24-bit range
 */
export function bitComplementMapping(numbers: number[], wordlist: string[]): string[] {
  const complement = (n: number, bits: number = 24): number => {
    const mask = (1 << bits) - 1;
    return (~n) & mask;
  };
  
  return numbers.map(num => {
    const comp = complement(num);
    const index = comp % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 14: Interleave with Sequence
 * Interleave numbers with ascending/descending sequence
 */
export function interleaveSequenceMapping(numbers: number[], wordlist: string[]): string[] {
  return numbers.map((num, idx) => {
    // Interleave with position-based offset
    const offset = idx * 83; // Prime number offset
    const index = (num + offset) % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 15: Systematic XOR Search
 * Try XOR with range of common magic numbers
 */
export function* systematicXorSearch(numbers: number[], wordlist: string[]): Generator<{key: number, words: string[]}> {
  // Common magic numbers to try
  const magicNumbers = [
    0, 1, 2, 7, 13, 17, 31, 42, 64, 128, 256, 512, 1024,
    0xFF, 0xDEAD, 0xBEEF, 0xCAFE, 0x1337, 0x2048
  ];
  
  for (const key of magicNumbers) {
    const words = numbers.map(num => {
      const xored = num ^ key;
      const index = xored % wordlist.length;
      return wordlist[index];
    });
    
    yield { key, words };
  }
}

/**
 * Strategy 16: Powers of Two Index Modulo
 * Since all are powers of 2, use exponent % 2048
 */
export function powerOfTwoModulo(numbers: number[], wordlist: string[]): string[] {
  return numbers.map(num => {
    const exponent = Math.log2(num);
    const index = Math.floor(exponent) % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 17: Cumulative XOR Chain
 * XOR each number with cumulative result
 */
export function cumulativeXorMapping(numbers: number[], wordlist: string[]): string[] {
  let accumulator = 0;
  
  return numbers.map(num => {
    accumulator ^= num;
    const index = accumulator % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 18: Reverse Order with Transform
 * Use numbers in reverse order with transformation
 */
export function reverseOrderMapping(numbers: number[], wordlist: string[]): string[] {
  const reversed = [...numbers].reverse();
  return reversed.map(num => {
    const index = num % wordlist.length;
    return wordlist[index];
  });
}

/**
 * Strategy 19: Diagonal Sum Pattern
 * Based on hint about "diagonal reading"
 */
export function diagonalSumMapping(numbers: number[], wordlist: string[]): string[] {
  // Treat as 8x3 grid and sum diagonals
  const words: string[] = [];
  
  for (let i = 0; i < numbers.length; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const diagonalOffset = row + col;
    const index = (numbers[i] + diagonalOffset) % wordlist.length;
    words.push(wordlist[index]);
  }
  
  return words;
}

/**
 * Strategy 20: Prime Number Modular Arithmetic
 * Use prime-based transformations
 */
export function primeModularMapping(numbers: number[], wordlist: string[]): string[] {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89];
  
  return numbers.map((num, idx) => {
    const prime = primes[idx % primes.length];
    const transformed = (num * prime) % wordlist.length;
    return wordlist[transformed];
  });
}

/**
 * Get all new advanced strategies
 */
export function getAdvancedStrategies() {
  const wordlist = bip39.wordlists.english;
  
  return [
    {
      name: 'Fibonacci Shift',
      fn: () => fibonacciShiftMapping(PUZZLE_NUMBERS, wordlist)
    },
    {
      name: 'Gray Code Transformation',
      fn: () => grayCodeMapping(PUZZLE_NUMBERS, wordlist)
    },
    {
      name: 'Bit Rotation (3 bits)',
      fn: () => bitRotationMapping(PUZZLE_NUMBERS, wordlist, 3)
    },
    {
      name: 'Bit Rotation (5 bits)',
      fn: () => bitRotationMapping(PUZZLE_NUMBERS, wordlist, 5)
    },
    {
      name: 'Hamming Weight',
      fn: () => hammingWeightMapping(PUZZLE_NUMBERS, wordlist)
    },
    {
      name: 'Square Sum Pairs',
      fn: () => squareSumMapping(PUZZLE_NUMBERS, wordlist)
    },
    {
      name: 'Modular Multiplication (31)',
      fn: () => modularMultiplicationMapping(PUZZLE_NUMBERS, wordlist, 31)
    },
    {
      name: 'Modular Multiplication (37)',
      fn: () => modularMultiplicationMapping(PUZZLE_NUMBERS, wordlist, 37)
    },
    {
      name: 'Bit Complement',
      fn: () => bitComplementMapping(PUZZLE_NUMBERS, wordlist)
    },
    {
      name: 'Interleave Sequence',
      fn: () => interleaveSequenceMapping(PUZZLE_NUMBERS, wordlist)
    },
    {
      name: 'Power of Two Modulo',
      fn: () => powerOfTwoModulo(PUZZLE_NUMBERS, wordlist)
    },
    {
      name: 'Cumulative XOR Chain',
      fn: () => cumulativeXorMapping(PUZZLE_NUMBERS, wordlist)
    },
    {
      name: 'Reverse Order',
      fn: () => reverseOrderMapping(PUZZLE_NUMBERS, wordlist)
    },
    {
      name: 'Diagonal Sum Pattern',
      fn: () => diagonalSumMapping(PUZZLE_NUMBERS, wordlist)
    },
    {
      name: 'Prime Modular Arithmetic',
      fn: () => primeModularMapping(PUZZLE_NUMBERS, wordlist)
    }
  ];
}

/**
 * Export all strategies and constants
 */
export {
  PUZZLE_NUMBERS,
  TARGET_ADDRESS,
  LAST_WORD_HINT
};
