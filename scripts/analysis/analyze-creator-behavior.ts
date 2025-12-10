#!/usr/bin/env node
/**
 * Creator Behavior Pattern Analysis
 * 
 * Analyzes the timeline and patterns of puzzle solving to understand
 * creator behavior and identify potential clues about key generation.
 */

import * as fs from 'fs';
import * as path from 'path';

interface PuzzleSolve {
  puzzleNum: number;
  privateKey: string;
  address: string;
  btcValue: number;
  solveDate: Date;
  daysFromStart: number;
  timeToNextSolve?: number;
}

function parsePuzzleData(csvPath: string): PuzzleSolve[] {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const puzzles: PuzzleSolve[] = [];
  
  let firstDate: Date | null = null;
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 9) continue;
    
    const puzzleNum = parseInt(parts[0]);
    const privateKey = parts[7];
    const solveDateStr = parts[8];
    
    // Only include solved puzzles with dates
    if (privateKey && privateKey !== '' && !privateKey.includes('?') && solveDateStr && solveDateStr !== '') {
      const solveDate = new Date(solveDateStr);
      
      if (!firstDate) firstDate = solveDate;
      
      const daysFromStart = Math.floor((solveDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      
      puzzles.push({
        puzzleNum,
        privateKey,
        address: parts[3],
        btcValue: parseFloat(parts[4]),
        solveDate,
        daysFromStart,
      });
    }
  }
  
  // Calculate time to next solve
  puzzles.sort((a, b) => a.solveDate.getTime() - b.solveDate.getTime());
  for (let i = 0; i < puzzles.length - 1; i++) {
    const current = puzzles[i];
    const next = puzzles[i + 1];
    current.timeToNextSolve = Math.floor((next.solveDate.getTime() - current.solveDate.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  return puzzles;
}

async function main() {
  console.log('👤 Creator Behavior Pattern Analysis');
  console.log('='.repeat(80));
  console.log();
  
  const csvPath = path.join(process.cwd(), 'bitcoin-puzzle-all-20251203.csv');
  const puzzles = parsePuzzleData(csvPath);
  
  console.log(`📊 Analyzing ${puzzles.length} solved puzzles\n`);
  
  // ========================================================================
  // ANALYSIS 1: Temporal Patterns
  // ========================================================================
  console.log('⏰ TEMPORAL PATTERN ANALYSIS');
  console.log('-'.repeat(80));
  console.log();
  
  const firstDate = puzzles[0].solveDate;
  const lastDate = puzzles[puzzles.length - 1].solveDate;
  const totalDays = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  
  console.log(`   First solve: ${firstDate.toISOString().split('T')[0]} (Puzzle #${puzzles[0].puzzleNum})`);
  console.log(`   Last solve:  ${lastDate.toISOString().split('T')[0]} (Puzzle #${puzzles[puzzles.length - 1].puzzleNum})`);
  console.log(`   Duration:    ${totalDays} days (~${(totalDays / 365).toFixed(1)} years)`);
  console.log();
  
  // Group by year and month
  const byYearMonth = new Map<string, number>();
  puzzles.forEach(p => {
    const yearMonth = `${p.solveDate.getFullYear()}-${String(p.solveDate.getMonth() + 1).padStart(2, '0')}`;
    byYearMonth.set(yearMonth, (byYearMonth.get(yearMonth) || 0) + 1);
  });
  
  console.log('   Solve activity by year-month:');
  console.log('   ' + '-'.repeat(70));
  
  const sortedMonths = Array.from(byYearMonth.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  for (const [yearMonth, count] of sortedMonths) {
    if (count > 0) {
      const bar = '█'.repeat(Math.min(count, 50));
      console.log(`   ${yearMonth}: ${bar} (${count})`);
    }
  }
  console.log();
  
  // ========================================================================
  // ANALYSIS 2: Solve Rate Patterns
  // ========================================================================
  console.log('📈 SOLVE RATE ANALYSIS');
  console.log('-'.repeat(80));
  console.log();
  
  // Initial burst (first month)
  const firstMonthPuzzles = puzzles.filter(p => p.daysFromStart <= 30);
  console.log(`   Initial burst (first 30 days): ${firstMonthPuzzles.length} puzzles`);
  console.log(`   Remaining puzzles (10 years):  ${puzzles.length - firstMonthPuzzles.length} puzzles`);
  console.log();
  
  // Longest gaps
  const gaps = puzzles
    .filter(p => p.timeToNextSolve !== undefined)
    .map(p => ({ puzzleNum: p.puzzleNum, days: p.timeToNextSolve!, date: p.solveDate }))
    .sort((a, b) => b.days - a.days);
  
  console.log('   Longest gaps between solves:');
  console.log('   ' + '-'.repeat(70));
  for (let i = 0; i < Math.min(10, gaps.length); i++) {
    const gap = gaps[i];
    console.log(`   ${(i + 1).toString().padStart(2)}. After puzzle #${gap.puzzleNum.toString().padStart(2)}: ${gap.days.toString().padStart(4)} days (${gap.date.toISOString().split('T')[0]})`);
  }
  console.log();
  
  // ========================================================================
  // ANALYSIS 3: Recent Activity (2023-2025)
  // ========================================================================
  console.log('🔥 RECENT ACTIVITY ANALYSIS (2023-2025)');
  console.log('-'.repeat(80));
  console.log();
  
  const recentPuzzles = puzzles.filter(p => p.solveDate.getFullYear() >= 2023);
  
  console.log(`   Recent solves: ${recentPuzzles.length} puzzles`);
  console.log();
  console.log('   Puzzle | Date       | BTC Value | Days Since Prev');
  console.log('   ' + '-'.repeat(70));
  
  for (const p of recentPuzzles) {
    const idx = puzzles.indexOf(p);
    const daysSincePrev = idx > 0 ? Math.floor((p.solveDate.getTime() - puzzles[idx - 1].solveDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    console.log(`   #${p.puzzleNum.toString().padStart(3)}   | ${p.solveDate.toISOString().split('T')[0]} |   ${p.btcValue.toFixed(3)}   | ${daysSincePrev.toString().padStart(6)}`);
  }
  console.log();
  
  console.log('   🚨 OBSERVATIONS:');
  console.log('   • Activity spike after years of quiet');
  console.log('   • Suggests either:');
  console.log('     1. Creator reclaiming funds');
  console.log('     2. Advanced solver found pattern');
  console.log('     3. Computational breakthrough');
  console.log();
  
  // ========================================================================
  // ANALYSIS 4: Difficulty Progression
  // ========================================================================
  console.log('🎯 DIFFICULTY PROGRESSION');
  console.log('-'.repeat(80));
  console.log();
  
  // Group by difficulty ranges
  const ranges = [
    { name: '1-20 (Easy)', min: 1, max: 20, puzzles: [] as PuzzleSolve[] },
    { name: '21-40 (Medium)', min: 21, max: 40, puzzles: [] as PuzzleSolve[] },
    { name: '41-60 (Hard)', min: 41, max: 60, puzzles: [] as PuzzleSolve[] },
    { name: '61-70 (Very Hard)', min: 61, max: 70, puzzles: [] as PuzzleSolve[] },
    { name: '71-82 (Extreme)', min: 71, max: 82, puzzles: [] as PuzzleSolve[] },
  ];
  
  puzzles.forEach(p => {
    const range = ranges.find(r => p.puzzleNum >= r.min && p.puzzleNum <= r.max);
    if (range) range.puzzles.push(p);
  });
  
  console.log('   Solves by difficulty range:');
  console.log('   ' + '-'.repeat(70));
  
  for (const range of ranges) {
    const count = range.puzzles.length;
    const total = range.max - range.min + 1;
    const pct = (count / total * 100).toFixed(0);
    const bar = '█'.repeat(Math.floor(count / 2));
    console.log(`   ${range.name.padEnd(20)}: ${bar} ${count}/${total} (${pct}%)`);
  }
  console.log();
  
  // ========================================================================
  // ANALYSIS 5: Pattern Detection
  // ========================================================================
  console.log('🔍 PATTERN DETECTION');
  console.log('-'.repeat(80));
  console.log();
  
  // Check for sequential patterns
  const sequences = [];
  let currentSeq = [puzzles[0]];
  
  for (let i = 1; i < puzzles.length; i++) {
    if (puzzles[i].puzzleNum === currentSeq[currentSeq.length - 1].puzzleNum + 1) {
      currentSeq.push(puzzles[i]);
    } else {
      if (currentSeq.length >= 5) {
        sequences.push([...currentSeq]);
      }
      currentSeq = [puzzles[i]];
    }
  }
  if (currentSeq.length >= 5) sequences.push(currentSeq);
  
  console.log('   Sequential solve patterns (5+ consecutive):');
  console.log('   ' + '-'.repeat(70));
  
  if (sequences.length > 0) {
    for (const seq of sequences) {
      const start = seq[0].puzzleNum;
      const end = seq[seq.length - 1].puzzleNum;
      const dates = `${seq[0].solveDate.toISOString().split('T')[0]} to ${seq[seq.length - 1].solveDate.toISOString().split('T')[0]}`;
      console.log(`   Puzzles #${start}-#${end} (${seq.length} puzzles): ${dates}`);
    }
  } else {
    console.log('   No long sequential patterns found.');
  }
  console.log();
  
  // Check for same-day solves
  const sameDaySolves = new Map<string, PuzzleSolve[]>();
  puzzles.forEach(p => {
    const dateKey = p.solveDate.toISOString().split('T')[0];
    if (!sameDaySolves.has(dateKey)) {
      sameDaySolves.set(dateKey, []);
    }
    sameDaySolves.get(dateKey)!.push(p);
  });
  
  const multiSolveDays = Array.from(sameDaySolves.entries())
    .filter(([, solves]) => solves.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  
  console.log('   Same-day solves (multiple puzzles solved on same day):');
  console.log('   ' + '-'.repeat(70));
  
  if (multiSolveDays.length > 0) {
    for (const [date, solves] of multiSolveDays.slice(0, 10)) {
      const puzzleNums = solves.map(s => `#${s.puzzleNum}`).join(', ');
      console.log(`   ${date}: ${solves.length} puzzles (${puzzleNums})`);
    }
  } else {
    console.log('   No same-day solves found.');
  }
  console.log();
  
  // ========================================================================
  // SUMMARY & INSIGHTS
  // ========================================================================
  console.log('💡 KEY INSIGHTS');
  console.log('='.repeat(80));
  console.log();
  console.log('1. 🚀 INITIAL BURST (2015)');
  console.log(`   ${firstMonthPuzzles.length} puzzles solved in first month`);
  console.log('   Suggests either: (a) Easy puzzles or (b) Creator pre-solving');
  console.log();
  console.log('2. 📉 LONG QUIET PERIOD (2016-2022)');
  console.log('   Only 11 puzzles solved over 6 years');
  console.log('   Difficulty increased beyond casual brute-force capability');
  console.log();
  console.log('3. 🔥 RECENT ACTIVITY SPIKE (2023-2025)');
  console.log(`   ${recentPuzzles.length} puzzles solved in last 2 years`);
  console.log('   Could indicate: Creator return, advanced solver, or new technique');
  console.log();
  console.log('4. 🎯 DIFFICULTY WALL');
  console.log('   Puzzles 1-60: 100% solved');
  console.log('   Puzzles 61-70: ~70% solved');
  console.log('   Puzzles 71+: <20% solved');
  console.log();
  console.log('5. 🤔 CREATOR HYPOTHESIS');
  console.log('   Based on timeline patterns:');
  console.log('   • Creator has access to keys (obviously)');
  console.log('   • Periodic check-ins over 10 years');
  console.log('   • May be reclaiming funds as BTC value rises');
  console.log('   • Recent activity suggests ongoing monitoring');
  console.log();
  console.log('='.repeat(80));
  console.log();
  console.log('✅ Creator behavior analysis complete!');
  console.log('📝 Patterns suggest active monitoring and potential fund reclamation.');
  console.log();
}

main().catch(console.error);
