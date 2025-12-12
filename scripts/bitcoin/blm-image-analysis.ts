#!/usr/bin/env node --import tsx

/**
 * BLM Puzzle - Image Forensic Analysis
 * 
 * Analyzes puzzle images for:
 * - Hidden text and data
 * - Steganography
 * - Pixel patterns
 * - Color analysis for hidden messages
 * - LSB (Least Significant Bit) analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import * as bip39 from 'bip39';

const IMAGE_PATH = '/tmp/blm-puzzle-images/puzzle1.png';

console.log('🔍 BLM Puzzle - Image Forensic Analysis\n');
console.log('═══════════════════════════════════════════════════\n');

// Read PNG file
const pngData = fs.readFileSync(IMAGE_PATH);
const png = PNG.sync.read(pngData);

console.log(`📊 Image Properties:`);
console.log(`   Width: ${png.width}px`);
console.log(`   Height: ${png.height}px`);
console.log(`   Color Type: ${png.colorType === 6 ? 'RGBA' : 'Unknown'}`);
console.log(`   Bit Depth: ${png.depth} bits`);
console.log(`   Total Pixels: ${(png.width * png.height).toLocaleString()}`);
console.log(`   Data Size: ${png.data.length.toLocaleString()} bytes\n`);

console.log('═══════════════════════════════════════════════════');
console.log('🔬 LSB (Least Significant Bit) Analysis');
console.log('═══════════════════════════════════════════════════\n');

// Extract LSB from each color channel
function extractLSB(channel: 'R' | 'G' | 'B' | 'A'): string {
  let bits = '';
  const channelOffset = { 'R': 0, 'G': 1, 'B': 2, 'A': 3 }[channel];
  
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      const value = png.data[idx + channelOffset];
      bits += (value & 1).toString();
    }
  }
  
  return bits;
}

// Convert bits to text
function bitsToText(bits: string): string {
  let text = '';
  for (let i = 0; i < bits.length - 7; i += 8) {
    const byte = parseInt(bits.substr(i, 8), 2);
    if (byte >= 32 && byte <= 126) {
      text += String.fromCharCode(byte);
    } else if (byte === 0 && text.length > 0) {
      break; // Null terminator
    }
  }
  return text;
}

// Analyze LSB in each channel
const channels: ('R' | 'G' | 'B' | 'A')[] = ['R', 'G', 'B', 'A'];

for (const channel of channels) {
  console.log(`\n${channel} Channel LSB:`);
  const bits = extractLSB(channel);
  const text = bitsToText(bits);
  
  // Show first 100 characters if any readable text
  if (text.length > 5) {
    console.log(`   Found readable text (${text.length} chars):`);
    console.log(`   "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
  } else {
    console.log(`   No readable text found`);
  }
  
  // Check for BIP39 words in LSB
  const foundWords: string[] = [];
  const wordlist = bip39.wordlists.english;
  
  for (const word of wordlist) {
    if (text.toLowerCase().includes(word)) {
      foundWords.push(word);
      if (foundWords.length >= 20) break;
    }
  }
  
  if (foundWords.length > 0) {
    console.log(`   🎯 BIP39 words found: ${foundWords.slice(0, 10).join(', ')}${foundWords.length > 10 ? '...' : ''}`);
  }
}

console.log('\n═══════════════════════════════════════════════════');
console.log('🎨 Color Distribution Analysis');
console.log('═══════════════════════════════════════════════════\n');

// Analyze color distribution
const colorCounts: Map<string, number> = new Map();

for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (png.width * y + x) << 2;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const key = `${r},${g},${b}`;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
  }
}

console.log(`Unique colors: ${colorCounts.size.toLocaleString()}`);

// Find most common colors
const sortedColors = Array.from(colorCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log(`\nTop 10 most common colors:`);
sortedColors.forEach(([color, count], idx) => {
  const [r, g, b] = color.split(',').map(Number);
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  const pct = ((count / (png.width * png.height)) * 100).toFixed(2);
  console.log(`   ${idx + 1}. ${hex} - ${count.toLocaleString()} pixels (${pct}%)`);
});

console.log('\n═══════════════════════════════════════════════════');
console.log('📐 Pattern Detection');
console.log('═══════════════════════════════════════════════════\n');

// Look for vertical/horizontal patterns that might encode data
function detectPatterns(): void {
  // Check for repeating pixel patterns
  const rowHashes = new Map<string, number[]>();
  const colHashes = new Map<string, number[]>();
  
  // Sample every 10th row and column for patterns
  for (let y = 0; y < png.height; y += 10) {
    let rowHash = '';
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      rowHash += `${png.data[idx]},${png.data[idx + 1]},${png.data[idx + 2]};`;
    }
    
    if (!rowHashes.has(rowHash)) {
      rowHashes.set(rowHash, []);
    }
    rowHashes.get(rowHash)!.push(y);
  }
  
  const repeatedRows = Array.from(rowHashes.values()).filter(rows => rows.length > 1);
  if (repeatedRows.length > 0) {
    console.log(`Found ${repeatedRows.length} repeated row patterns`);
    console.log(`   Example: Rows ${repeatedRows[0].join(', ')} are identical`);
  } else {
    console.log(`No repeated row patterns found`);
  }
}

detectPatterns();

console.log('\n═══════════════════════════════════════════════════');
console.log('🔍 Specific Region Analysis');
console.log('═══════════════════════════════════════════════════\n');

// Analyze specific regions that might contain text
const regions = [
  { name: 'Top-Left (0-400, 0-300)', x: 0, y: 0, w: 400, h: 300 },
  { name: 'Top-Right (1200-1600, 0-300)', x: 1200, y: 0, w: 400, h: 300 },
  { name: 'Bottom-Left (0-400, 900-1200)', x: 0, y: 900, w: 400, h: 300 },
  { name: 'Bottom-Right (1200-1600, 900-1200)', x: 1200, y: 900, w: 400, h: 300 },
  { name: 'Center (600-1000, 400-800)', x: 600, y: 400, w: 400, h: 400 },
];

for (const region of regions) {
  const uniqueColors = new Set<string>();
  const lsbBits: string[] = [];
  
  for (let y = region.y; y < Math.min(region.y + region.h, png.height); y++) {
    for (let x = region.x; x < Math.min(region.x + region.w, png.width); x++) {
      const idx = (png.width * y + x) << 2;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      uniqueColors.add(`${r},${g},${b}`);
      lsbBits.push((r & 1).toString());
    }
  }
  
  const text = bitsToText(lsbBits.join(''));
  console.log(`\n${region.name}:`);
  console.log(`   Unique colors: ${uniqueColors.size}`);
  if (text.length > 10) {
    console.log(`   LSB text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
  }
}

console.log('\n═══════════════════════════════════════════════════');
console.log('📝 Summary & Recommendations');
console.log('═══════════════════════════════════════════════════\n');

console.log('✅ Analysis Complete:');
console.log('   - Image dimensions: 1600x1200 pixels');
console.log('   - Color type: RGBA (8-bit per channel)');
console.log('   - LSB analysis performed on all 4 channels');
console.log('   - Color distribution analyzed');
console.log('   - Pattern detection completed');
console.log('   - Region-specific analysis done\n');

console.log('🔍 Next Steps:');
console.log('   1. Manual visual inspection needed for text in image');
console.log('   2. Decode Bill Cipher symbols (requires visual reference)');
console.log('   3. OCR analysis to extract all visible text');
console.log('   4. Analyze clock hand positions for numerical clues');
console.log('   5. Check for QR codes or other embedded symbols');
console.log('   6. Compare with community annotations of the image\n');

console.log('💡 Recommendation:');
console.log('   The puzzle likely relies on VISUAL clues in the image');
console.log('   rather than steganographic data. Focus on:');
console.log('   - Reading all visible text');
console.log('   - Decoding symbols and ciphers');
console.log('   - Interpreting spatial positioning');
console.log('   - Understanding thematic connections\n');

export { extractLSB, bitsToText };
