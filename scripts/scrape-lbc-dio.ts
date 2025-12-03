#!/usr/bin/env node
/**
 * LBC DIO Scraper - Sample Negative Examples
 * 
 * Scrapes LBC's DIO database to collect negative examples (failed keys)
 * for ML training. Samples across different ranges for balanced dataset.
 * 
 * Strategy:
 * 1. Sample DIOs from different regions of keyspace
 * 2. Extract private keys and addresses
 * 3. Verify they have no balance (negative examples)
 * 4. Store in structured format for ML training
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

interface ScannedKey {
  privateKeyDecimal: string;
  privateKeyHex: string;
  privateKeyWIF: string;
  addressCompressed: string;
  addressUncompressed: string;
  dioId: number;
  source: 'LBC-DIO';
  verified: boolean;
}

interface SamplingStrategy {
  name: string;
  dioIds: number[];
  expectedKeys: number;
}

/**
 * Sample DIO IDs across the keyspace for diversity
 */
function generateSamplingStrategy(totalSamples: number = 1000): SamplingStrategy {
  const dioIds: number[] = [];
  
  // Strategy: Sample from different magnitude ranges
  const ranges = [
    { name: 'Small', min: 1, max: 1000000, samples: 100 },
    { name: 'Medium', min: 1000000, max: 100000000, samples: 200 },
    { name: 'Large', min: 100000000, max: 10000000000, samples: 300 },
    { name: 'Huge', min: 10000000000, max: 363877617893376, samples: 400 },
  ];
  
  for (const range of ranges) {
    for (let i = 0; i < range.samples; i++) {
      const randomId = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      dioIds.push(randomId);
    }
  }
  
  return {
    name: `Balanced-Sampling-${totalSamples}`,
    dioIds: dioIds.sort((a, b) => a - b),
    expectedKeys: dioIds.length * 20, // ~20 keys per DIO
  };
}

/**
 * Parse a single DIO page to extract key information
 */
function parseDIOPage(html: string, dioId: number): ScannedKey[] {
  const keys: ScannedKey[] = [];
  
  // Extract key information from HTML spans
  // Format: <span title="46576335090352109">5HpHagT65...</span>
  const keyPattern = /<span\s+title="(\d+)">([A-Za-z0-9]+)\s*<\/span>\s*<a href="https:\/\/blockchain\.info\/address\/([A-Za-z0-9]+)">.*?<\/a>\s*<a href="https:\/\/blockchain\.info\/address\/([A-Za-z0-9]+)">/g;
  
  let match;
  while ((match = keyPattern.exec(html)) !== null) {
    const [, decimal, wif, addrCompressed, addrUncompressed] = match;
    
    keys.push({
      privateKeyDecimal: decimal,
      privateKeyHex: BigInt(decimal).toString(16).padStart(64, '0'),
      privateKeyWIF: wif,
      addressCompressed: addrCompressed,
      addressUncompressed: addrUncompressed,
      dioId,
      source: 'LBC-DIO',
      verified: false, // Would need blockchain API call to verify
    });
  }
  
  return keys;
}

/**
 * Fetch a single DIO page
 */
async function fetchDIO(dioId: number): Promise<string | null> {
  try {
    const url = `https://lbc.cryptoguru.org/dio/${dioId}`;
    const { stdout } = await exec(`curl -s "${url}"`);
    return stdout;
  } catch (error) {
    console.error(`Error fetching DIO ${dioId}:`, error);
    return null;
  }
}

/**
 * Main scraping function
 */
async function main() {
  console.log('🔧 LBC DIO Scraper - Building ML Dataset');
  console.log('='.repeat(80));
  console.log();
  
  const args = process.argv.slice(2);
  const sampleSize = args[0] ? parseInt(args[0]) : 50; // Default: 50 DIOs for testing
  const outputDir = args[1] || './data/negative-examples';
  
  console.log(`📊 Configuration:`);
  console.log(`   Sample Size: ${sampleSize} DIOs`);
  console.log(`   Expected Keys: ~${sampleSize * 20} negative examples`);
  console.log(`   Output Directory: ${outputDir}`);
  console.log();
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ Created output directory: ${outputDir}`);
  }
  
  // Generate sampling strategy
  console.log('🎯 Generating sampling strategy...');
  const strategy = generateSamplingStrategy(sampleSize);
  console.log(`   Strategy: ${strategy.name}`);
  console.log(`   DIOs to fetch: ${strategy.dioIds.length}`);
  console.log();
  
  // Fetch and parse DIOs
  console.log('🌐 Fetching DIOs from LBC...');
  console.log('   (This may take a few minutes depending on sample size)');
  console.log();
  
  const allKeys: ScannedKey[] = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < Math.min(sampleSize, strategy.dioIds.length); i++) {
    const dioId = strategy.dioIds[i];
    
    if ((i + 1) % 10 === 0) {
      console.log(`   Progress: ${i + 1}/${sampleSize} DIOs fetched (${successCount} successful)`);
    }
    
    const html = await fetchDIO(dioId);
    if (html) {
      const keys = parseDIOPage(html, dioId);
      allKeys.push(...keys);
      successCount++;
    } else {
      failCount++;
    }
    
    // Rate limiting - be nice to the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log();
  console.log(`✅ Fetching complete!`);
  console.log(`   Successful: ${successCount} DIOs`);
  console.log(`   Failed: ${failCount} DIOs`);
  console.log(`   Keys collected: ${allKeys.length}`);
  console.log();
  
  // Save to JSON
  const jsonPath = path.join(outputDir, `negative-examples-${Date.now()}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(allKeys, null, 2));
  console.log(`💾 Saved JSON: ${jsonPath}`);
  
  // Save to CSV for easy analysis
  const csvPath = path.join(outputDir, `negative-examples-${Date.now()}.csv`);
  const csvHeader = 'decimal,hex,wif,address_compressed,address_uncompressed,dio_id,source\n';
  const csvRows = allKeys.map(k => 
    `${k.privateKeyDecimal},${k.privateKeyHex},${k.privateKeyWIF},${k.addressCompressed},${k.addressUncompressed},${k.dioId},${k.source}`
  ).join('\n');
  fs.writeFileSync(csvPath, csvHeader + csvRows);
  console.log(`💾 Saved CSV: ${csvPath}`);
  
  // Generate statistics
  console.log();
  console.log('📊 DATASET STATISTICS');
  console.log('-'.repeat(80));
  console.log(`   Total Keys: ${allKeys.length}`);
  console.log(`   Unique DIOs: ${new Set(allKeys.map(k => k.dioId)).size}`);
  console.log(`   Keys per DIO (avg): ${(allKeys.length / successCount).toFixed(1)}`);
  console.log();
  
  // Key range analysis
  const keyValues = allKeys.map(k => BigInt(k.privateKeyDecimal));
  const minKey = keyValues.reduce((min, val) => val < min ? val : min, keyValues[0]);
  const maxKey = keyValues.reduce((max, val) => val > max ? val : max, keyValues[0]);
  
  console.log(`   Key Range:`);
  console.log(`   Min: ${minKey.toString()}`);
  console.log(`   Max: ${maxKey.toString()}`);
  console.log();
  
  console.log('✨ SUCCESS!');
  console.log();
  console.log('Next steps:');
  console.log('  1. Run with larger sample: ./LBC -c 1000 (for 1000 DIOs)');
  console.log('  2. Combine with positive examples (82 solved keys)');
  console.log('  3. Build ML model with balanced dataset');
  console.log('  4. Test prediction accuracy');
  console.log();
  console.log('='.repeat(80));
}

// Run if called directly (ES module compatible check)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { fetchDIO, parseDIOPage, generateSamplingStrategy, ScannedKey };
