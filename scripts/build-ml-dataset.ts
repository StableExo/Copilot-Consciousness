#!/usr/bin/env node
/**
 * ML Dataset Builder
 * 
 * Combines positive examples (82 solved puzzles) with negative examples
 * (LBC DIO scanned keys) to create balanced training dataset for ML model.
 * 
 * Outputs:
 * - Training set (70%)
 * - Validation set (15%)
 * - Test set (15%)
 */

import * as fs from 'fs';
import * as path from 'path';

interface PositiveExample {
  puzzleNum: number;
  privateKeyHex: string;
  address: string;
  btcValue: number;
  solveDate: string | null;
  positionInRange: number; // Percentage within range (0-100)
  label: 1; // Positive class
}

interface NegativeExample {
  privateKeyHex: string;
  privateKeyDecimal: string;
  address: string;
  dioId: number;
  label: 0; // Negative class
}

interface MLDataset {
  positives: PositiveExample[];
  negatives: NegativeExample[];
  total: number;
  ratio: string;
  split: {
    train: number;
    validation: number;
    test: number;
  };
}

/**
 * Load positive examples from puzzle CSV
 */
function loadPositiveExamples(csvPath: string): PositiveExample[] {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const positives: PositiveExample[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 9) continue;
    
    const puzzleNum = parseInt(parts[0]);
    const rangeMin = BigInt('0x' + parts[1]);
    const rangeMax = BigInt('0x' + parts[2]);
    const privateKeyHex = parts[7];
    const solveDate = parts[8] === '' ? null : parts[8];
    
    if (privateKeyHex && privateKeyHex !== '' && !privateKeyHex.includes('?')) {
      const keyValue = BigInt('0x' + privateKeyHex);
      const rangeSize = rangeMax - rangeMin + BigInt(1);
      const position = keyValue - rangeMin;
      const positionPercent = Number((position * BigInt(10000)) / rangeSize) / 100;
      
      positives.push({
        puzzleNum,
        privateKeyHex,
        address: parts[3],
        btcValue: parseFloat(parts[4]),
        solveDate,
        positionInRange: positionPercent,
        label: 1,
      });
    }
  }
  
  return positives;
}

/**
 * Load negative examples from DIO scraper output
 */
function loadNegativeExamples(jsonPath: string): NegativeExample[] {
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const scannedKeys = JSON.parse(jsonContent);
  
  return scannedKeys.map((key: any) => ({
    privateKeyHex: key.privateKeyHex,
    privateKeyDecimal: key.privateKeyDecimal,
    address: key.addressCompressed,
    dioId: key.dioId,
    label: 0,
  }));
}

/**
 * Balance dataset by sampling negatives to match positives ratio
 */
function balanceDataset(
  positives: PositiveExample[],
  negatives: NegativeExample[],
  negativeRatio: number = 10
): { positives: PositiveExample[]; negatives: NegativeExample[] } {
  // Target: negativeRatio negatives per positive
  const targetNegatives = positives.length * negativeRatio;
  
  if (negatives.length <= targetNegatives) {
    console.log(`ℹ️  Using all ${negatives.length} negative examples`);
    return { positives, negatives };
  }
  
  // Random sampling without replacement
  const shuffled = [...negatives].sort(() => Math.random() - 0.5);
  const sampled = shuffled.slice(0, targetNegatives);
  
  console.log(`ℹ️  Sampled ${sampled.length} from ${negatives.length} negative examples`);
  return { positives, negatives: sampled };
}

/**
 * Split dataset into train/validation/test sets
 */
function splitDataset<T>(
  data: T[],
  trainRatio: number = 0.7,
  valRatio: number = 0.15
): { train: T[]; validation: T[]; test: T[] } {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  
  const trainSize = Math.floor(shuffled.length * trainRatio);
  const valSize = Math.floor(shuffled.length * valRatio);
  
  return {
    train: shuffled.slice(0, trainSize),
    validation: shuffled.slice(trainSize, trainSize + valSize),
    test: shuffled.slice(trainSize + valSize),
  };
}

/**
 * Main dataset building function
 */
async function main() {
  console.log('🤖 ML Dataset Builder');
  console.log('='.repeat(80));
  console.log();
  
  const args = process.argv.slice(2);
  const puzzleCsv = args[0] || 'bitcoin-puzzle-all-20251203.csv';
  const negativeJson = args[1] || 'data/negative-examples/negative-examples-1764748394187.json';
  const outputDir = args[2] || 'data/ml-dataset';
  const negativeRatio = args[3] ? parseInt(args[3]) : 10;
  
  console.log('📊 Configuration:');
  console.log(`   Puzzle CSV: ${puzzleCsv}`);
  console.log(`   Negative JSON: ${negativeJson}`);
  console.log(`   Output Directory: ${outputDir}`);
  console.log(`   Negative Ratio: ${negativeRatio}:1`);
  console.log();
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Load data
  console.log('📥 Loading data...');
  const positives = loadPositiveExamples(puzzleCsv);
  const negatives = loadNegativeExamples(negativeJson);
  
  console.log(`   Positives loaded: ${positives.length}`);
  console.log(`   Negatives loaded: ${negatives.length}`);
  console.log();
  
  // Balance dataset
  console.log('⚖️  Balancing dataset...');
  const { positives: balancedPos, negatives: balancedNeg } = balanceDataset(
    positives,
    negatives,
    negativeRatio
  );
  
  const totalExamples = balancedPos.length + balancedNeg.length;
  const ratio = `${balancedPos.length}:${balancedNeg.length}`;
  
  console.log(`   Total examples: ${totalExamples}`);
  console.log(`   Ratio (pos:neg): ${ratio}`);
  console.log();
  
  // Split into train/val/test
  console.log('✂️  Splitting dataset...');
  const posSplit = splitDataset(balancedPos);
  const negSplit = splitDataset(balancedNeg);
  
  const trainSet = [...posSplit.train, ...negSplit.train];
  const valSet = [...posSplit.validation, ...negSplit.validation];
  const testSet = [...posSplit.test, ...negSplit.test];
  
  // Shuffle each set
  trainSet.sort(() => Math.random() - 0.5);
  valSet.sort(() => Math.random() - 0.5);
  testSet.sort(() => Math.random() - 0.5);
  
  console.log(`   Training set: ${trainSet.length} examples`);
  console.log(`   Validation set: ${valSet.length} examples`);
  console.log(`   Test set: ${testSet.length} examples`);
  console.log();
  
  // Save datasets
  console.log('💾 Saving datasets...');
  
  const trainPath = path.join(outputDir, 'train.json');
  const valPath = path.join(outputDir, 'validation.json');
  const testPath = path.join(outputDir, 'test.json');
  const metaPath = path.join(outputDir, 'metadata.json');
  
  fs.writeFileSync(trainPath, JSON.stringify(trainSet, null, 2));
  fs.writeFileSync(valPath, JSON.stringify(valSet, null, 2));
  fs.writeFileSync(testPath, JSON.stringify(testSet, null, 2));
  
  console.log(`   ✅ Train: ${trainPath}`);
  console.log(`   ✅ Validation: ${valPath}`);
  console.log(`   ✅ Test: ${testPath}`);
  console.log();
  
  // Save metadata
  const metadata: MLDataset = {
    positives: balancedPos,
    negatives: balancedNeg,
    total: totalExamples,
    ratio,
    split: {
      train: trainSet.length,
      validation: valSet.length,
      test: testSet.length,
    },
  };
  
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
  console.log(`   ✅ Metadata: ${metaPath}`);
  console.log();
  
  // Generate statistics
  console.log('📊 DATASET STATISTICS');
  console.log('-'.repeat(80));
  console.log();
  console.log(`   Total Examples: ${totalExamples}`);
  console.log(`   Positive Examples: ${balancedPos.length} (${(balancedPos.length / totalExamples * 100).toFixed(1)}%)`);
  console.log(`   Negative Examples: ${balancedNeg.length} (${(balancedNeg.length / totalExamples * 100).toFixed(1)}%)`);
  console.log();
  console.log(`   Training Set: ${trainSet.length} (70.0%)`);
  console.log(`   Validation Set: ${valSet.length} (15.0%)`);
  console.log(`   Test Set: ${testSet.length} (15.0%)`);
  console.log();
  
  // Position distribution analysis (for positives only)
  console.log('   Position Distribution (Positive Examples):');
  const quartiles = [0, 0, 0, 0];
  balancedPos.forEach(p => {
    const q = Math.floor(p.positionInRange / 25);
    quartiles[Math.min(q, 3)]++;
  });
  
  for (let i = 0; i < 4; i++) {
    const pct = (quartiles[i] / balancedPos.length * 100).toFixed(1);
    const range = `${i * 25}-${(i + 1) * 25}%`;
    console.log(`     ${range.padEnd(10)}: ${quartiles[i].toString().padStart(2)} (${pct}%)`);
  }
  console.log();
  
  console.log('✨ SUCCESS! ML Dataset Ready!');
  console.log();
  console.log('Next steps:');
  console.log('  1. Build ML model (binary classifier)');
  console.log('  2. Train on training set');
  console.log('  3. Validate on validation set');
  console.log('  4. Test on test set');
  console.log('  5. Evaluate feasibility for puzzle #71');
  console.log();
  console.log('='.repeat(80));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { loadPositiveExamples, loadNegativeExamples, balanceDataset, splitDataset };
