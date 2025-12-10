#!/usr/bin/env node
/**
 * Dataset Status Analyzer
 * 
 * Analyzes the current state of the Bitcoin puzzle dataset and provides
 * insights for ML model development.
 */

import * as fs from 'fs';

interface PuzzleData {
  bits: number;
  rangeMin: string;
  rangeMax: string;
  address: string;
  btcValue: number;
  hash160: string;
  publicKey: string;
  privateKey: string;
  solveDate: string;
}

function loadDataset(csvPath: string): PuzzleData[] {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const data: PuzzleData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 9) continue;
    
    data.push({
      bits: parseInt(parts[0]),
      rangeMin: parts[1],
      rangeMax: parts[2],
      address: parts[3],
      btcValue: parseFloat(parts[4]),
      hash160: parts[5],
      publicKey: parts[6],
      privateKey: parts[7],
      solveDate: parts[8],
    });
  }
  
  return data;
}

function analyzeDataset(data: PuzzleData[]) {
  const solved = data.filter(p => 
    p.privateKey !== '' && 
    !p.privateKey.includes('?') &&
    p.privateKey !== '0'.repeat(64)
  );
  
  const unsolved = data.filter(p =>
    p.privateKey === '' ||
    p.privateKey.includes('?') ||
    p.privateKey === '0'.repeat(64)
  );
  
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    BITCOIN PUZZLE DATASET STATUS                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  
  console.log('📊 OVERALL STATISTICS');
  console.log('─'.repeat(80));
  console.log(`   Total Puzzles:    ${data.length}`);
  console.log(`   Solved:           ${solved.length} (${(solved.length / data.length * 100).toFixed(1)}%)`);
  console.log(`   Unsolved:         ${unsolved.length} (${(unsolved.length / data.length * 100).toFixed(1)}%)`);
  console.log();
  
  console.log('✅ SOLVED PUZZLES');
  console.log('─'.repeat(80));
  console.log(`   Total: ${solved.length}`);
  console.log(`   Difficulty Range: #${Math.min(...solved.map(p => p.bits))} to #${Math.max(...solved.map(p => p.bits))}`);
  console.log();
  console.log('   Solved by Year:');
  
  const byYear = new Map<string, number>();
  for (const p of solved) {
    if (p.solveDate) {
      const year = p.solveDate.split('-')[0];
      byYear.set(year, (byYear.get(year) || 0) + 1);
    }
  }
  
  for (const [year, count] of Array.from(byYear.entries()).sort()) {
    console.log(`     ${year}: ${count} puzzles`);
  }
  console.log();
  
  console.log('❓ UNSOLVED PUZZLES');
  console.log('─'.repeat(80));
  console.log(`   Total: ${unsolved.length}`);
  console.log(`   Difficulty Range: #${Math.min(...unsolved.map(p => p.bits))} to #${Math.max(...unsolved.map(p => p.bits))}`);
  console.log();
  console.log('   Key Unsolved Targets:');
  const keyTargets = unsolved.filter(p => 
    [71, 72, 73, 74, 75, 76, 77, 78, 79, 80].includes(p.bits)
  ).sort((a, b) => a.bits - b.bits);
  
  for (const p of keyTargets.slice(0, 5)) {
    console.log(`     Puzzle #${p.bits}: ${p.address} (${p.btcValue} BTC)`);
  }
  console.log();
  
  console.log('🎯 ML MODEL READINESS');
  console.log('─'.repeat(80));
  console.log(`   Training Examples Available: ${solved.length}`);
  console.log(`   Validation Possible: ${solved.length >= 30 ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   Cross-Validation Recommended: ${solved.length >= 50 ? 'YES ✅' : 'MARGINAL ⚠️'}`);
  console.log();
  
  if (solved.length < 100) {
    console.log('   ⚠️  WARNING: Limited training data (${solved.length} examples)');
    console.log('      - ML models may overfit');
    console.log('      - Pattern detection may be weak');
    console.log('      - Confidence intervals will be wide');
  } else {
    console.log('   ✅ Sufficient training data for robust ML models');
  }
  console.log();
  
  console.log('📈 DATASET RECOMMENDATIONS');
  console.log('─'.repeat(80));
  console.log('   1. Current dataset is adequate for ML exploration');
  console.log('   2. No immediate updates needed from blockchain data');
  console.log('   3. Focus on feature engineering and model architecture');
  console.log('   4. Monitor for newly solved puzzles periodically');
  console.log();
  
  console.log('🚀 NEXT STEPS FOR ML MODEL');
  console.log('─'.repeat(80));
  console.log('   1. Begin ML model architecture design');
  console.log('   2. Define features from existing solved puzzles');
  console.log('   3. Implement training pipeline');
  console.log('   4. Evaluate model performance');
  console.log('   5. Make predictions for unsolved puzzles');
  console.log();
  console.log('═'.repeat(80));
}

async function main() {
  const csvPath = process.argv[2] || 'bitcoin-puzzle-all-20251203.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Dataset not found: ${csvPath}`);
    process.exit(1);
  }
  
  const data = loadDataset(csvPath);
  analyzeDataset(data);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
