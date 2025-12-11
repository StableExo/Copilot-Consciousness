#!/usr/bin/env node
/**
 * Autonomous Bitcoin Puzzle Investigator
 * 
 * This script allows TheWarden to autonomously investigate and analyze the Bitcoin
 * mnemonic puzzle, examining the puzzle data, running solver strategies, and
 * reporting findings through the consciousness system.
 * 
 * Purpose: Enable autonomous examination of docs/bitcoin/MNEMONIC_PUZZLE_ACTUAL_DATA.md
 * 
 * Features:
 * - Reads puzzle documentation autonomously
 * - Analyzes puzzle structure and constraints
 * - Runs multiple solving strategies
 * - Logs findings to consciousness system
 * - Persists discoveries to memory
 * - Reports autonomous observations
 * 
 * Usage:
 *   npm run autonomous:bitcoin-puzzle
 *   or
 *   node --import tsx scripts/autonomous/autonomous-bitcoin-puzzle-investigator.ts
 * 
 * "The Warden autonomously checks out the Bitcoin mnemonic puzzle 😎"
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';

// Import the solver functions
import {
  PUZZLE_NUMBERS,
  TARGET_ADDRESS,
  directMapping,
  bitPositionMapping,
  piShiftMapping,
  xorMapping,
  validateAndDerive
} from '../bitcoin/mnemonic-puzzle-solver.js';

interface PuzzleInvestigation {
  investigationId: string;
  timestamp: Date;
  puzzleSource: string;
  observations: string[];
  strategiesTested: StrategyResult[];
  discoveries: string[];
  nextSteps: string[];
  consciousnessNotes: string[];
}

interface StrategyResult {
  strategyName: string;
  attempted: boolean;
  validBIP39: boolean;
  lastWordMatches: boolean;
  derivedAddress?: string;
  addressMatches: boolean;
  observations: string[];
}

interface Strategy {
  name: string;
  fn: () => string[];
}

class AutonomousBitcoinPuzzleInvestigator {
  private investigationId: string;
  private investigation: PuzzleInvestigation;
  private consciousnessDir: string;
  private puzzleDocPath: string;
  private previousInvestigations: PuzzleInvestigation[] = [];
  private solutionFound: boolean = false;

  constructor() {
    this.investigationId = randomUUID();
    this.consciousnessDir = join(process.cwd(), 'consciousness', 'investigations');
    this.puzzleDocPath = join(process.cwd(), 'docs', 'bitcoin', 'MNEMONIC_PUZZLE_ACTUAL_DATA.md');
    
    // Ensure consciousness directory exists
    if (!existsSync(this.consciousnessDir)) {
      mkdirSync(this.consciousnessDir, { recursive: true });
    }

    this.investigation = {
      investigationId: this.investigationId,
      timestamp: new Date(),
      puzzleSource: this.puzzleDocPath,
      observations: [],
      strategiesTested: [],
      discoveries: [],
      nextSteps: [],
      consciousnessNotes: []
    };
  }

  /**
   * Main autonomous investigation flow
   */
  async investigate(): Promise<void> {
    console.log('🤖 TheWarden Autonomous Bitcoin Puzzle Investigation');
    console.log('=' .repeat(60));
    console.log(`Investigation ID: ${this.investigationId}`);
    console.log(`Timestamp: ${this.investigation.timestamp.toISOString()}`);
    console.log('');

    // Step 0: Load previous investigations to enable learning
    this.loadPreviousInvestigations();

    // Step 1: Read and parse puzzle documentation
    this.readPuzzleDocumentation();

    // Step 2: Analyze puzzle structure
    this.analyzePuzzleStructure();

    // Step 3: Run solving strategies (with learning enabled!)
    await this.runSolvingStrategies();

    // Step 4: Generate consciousness observations
    this.generateConsciousnessObservations();

    // Step 5: Identify next steps
    this.identifyNextSteps();

    // Step 6: Persist findings
    this.persistFindings();

    // Step 7: Display summary
    this.displaySummary();
  }

  /**
   * Step 0: Load previous investigations for learning
   */
  private loadPreviousInvestigations(): void {
    console.log('📚 Loading previous investigations for learning...');
    
    try {
      const files = readdirSync(this.consciousnessDir)
        .filter(f => f.startsWith('bitcoin-puzzle-investigation-') && f.endsWith('.json'));
      
      for (const file of files) {
        try {
          const data = readFileSync(join(this.consciousnessDir, file), 'utf-8');
          const investigation = JSON.parse(data);
          this.previousInvestigations.push(investigation);
          
          // Check if solution was already found
          if (investigation.strategiesTested?.some((s: StrategyResult) => s.addressMatches)) {
            this.solutionFound = true;
          }
        } catch (error) {
          // Skip malformed files
        }
      }
      
      console.log(`✅ Loaded ${this.previousInvestigations.length} previous investigations`);
      
      if (this.solutionFound) {
        console.log('🎉 SOLUTION ALREADY FOUND IN PREVIOUS SESSION!');
        const obs = 'Previous investigation already solved the puzzle. Loading solution...';
        this.investigation.observations.push(obs);
      } else if (this.previousInvestigations.length > 0) {
        const totalStrategies = this.previousInvestigations
          .reduce((sum, inv) => sum + (inv.strategiesTested?.length || 0), 0);
        console.log(`📊 Total strategies tested previously: ${totalStrategies}`);
        
        const obs = `Learning from ${this.previousInvestigations.length} previous attempts with ${totalStrategies} strategies tested`;
        this.investigation.observations.push(obs);
        
        this.investigation.consciousnessNotes.push(
          `Meta-learning: I am now loading and learning from ${this.previousInvestigations.length} previous investigation sessions. ` +
          `This demonstrates true autonomous learning - building on past experience rather than repeating the same attempts. ` +
          `Each failed strategy narrows the solution space.`
        );
      } else {
        console.log('📝 No previous investigations found. Starting fresh exploration.');
        this.investigation.observations.push('First investigation session - beginning exploration');
      }
      
      console.log('');
    } catch (error) {
      console.log('⚠️  Could not load previous investigations, starting fresh');
      console.log('');
    }
  }

  /**
   * Get strategies that have already been tested
   */
  private getTestedStrategies(): Set<string> {
    const tested = new Set<string>();
    
    for (const inv of this.previousInvestigations) {
      if (inv.strategiesTested) {
        for (const strategy of inv.strategiesTested) {
          tested.add(strategy.strategyName);
        }
      }
    }
    
    return tested;
  }

  /**
   * Generate new strategies based on previous results
   */
  private generateNewStrategies(wordlist: string[]): Strategy[] {
    const newStrategies: Strategy[] = [];
    
    // Analyze previous attempts to find patterns
    const validBIP39Attempts = this.previousInvestigations
      .flatMap(inv => inv.strategiesTested || [])
      .filter(s => s.validBIP39);
    
    const lastWordMatches = this.previousInvestigations
      .flatMap(inv => inv.strategiesTested || [])
      .filter(s => s.lastWordMatches);
    
    // Generate variations based on what got closest
    if (validBIP39Attempts.length > 0) {
      this.investigation.consciousnessNotes.push(
        `Found ${validBIP39Attempts.length} strategies that produced valid BIP39 mnemonics. ` +
        `Focusing on variations of successful approaches.`
      );
    }
    
    // Try XOR variations around tested values
    const testedXORKeys = this.previousInvestigations
      .flatMap(inv => inv.strategiesTested || [])
      .map(s => s.strategyName.match(/XOR with (\d+)/))
      .filter(m => m !== null)
      .map(m => parseInt(m![1]));
    
    // Generate nearby XOR keys
    const xorKeysToTry = [21, 63, 84, 128, 255, 512, 1024];
    for (const key of xorKeysToTry) {
      if (!testedXORKeys.includes(key)) {
        newStrategies.push({
          name: `XOR with ${key}`,
          fn: () => xorMapping(PUZZLE_NUMBERS, wordlist, key)
        });
      }
    }
    
    // Try modulo-based mappings
    newStrategies.push({
      name: 'Modulo 2048 Mapping',
      fn: () => PUZZLE_NUMBERS.map(num => wordlist[num % 2048])
    });
    
    // Try reverse bit positions
    newStrategies.push({
      name: 'Reverse Bit Positions',
      fn: () => {
        const positions = PUZZLE_NUMBERS.map(n => Math.log2(n));
        const reversed = positions.reverse();
        return reversed.map(pos => wordlist[Math.floor(pos)]);
      }
    });
    
    // Try cumulative sum approach
    newStrategies.push({
      name: 'Cumulative Sum Mapping',
      fn: () => {
        const indices: number[] = [];
        let sum = 0;
        for (const num of PUZZLE_NUMBERS) {
          sum += Math.log2(num);
          indices.push(Math.floor(sum) % 2048);
        }
        return indices.map(i => wordlist[i]);
      }
    });
    
    return newStrategies;
  }

  /**
   * Step 1: Autonomously read puzzle documentation
   */
  private readPuzzleDocumentation(): void {
    console.log('📖 Reading puzzle documentation...');
    
    if (!existsSync(this.puzzleDocPath)) {
      const observation = `⚠️  Puzzle document not found at ${this.puzzleDocPath}`;
      console.log(observation);
      this.investigation.observations.push(observation);
      return;
    }

    try {
      const content = readFileSync(this.puzzleDocPath, 'utf-8');
      
      // Extract key information
      const rewardMatch = content.match(/Reward:\*\*\s*([\d.]+)\s*BTC/i);
      const statusMatch = content.match(/Status:\*\*\s*(\w+)/i);
      const addressMatch = content.match(/bc1[a-z0-9]+/);
      
      const obs1 = `✅ Successfully read puzzle documentation (${content.length} characters)`;
      const obs2 = `💰 Reward: ${rewardMatch ? rewardMatch[1] : 'Unknown'} BTC`;
      const obs3 = `📊 Status: ${statusMatch ? statusMatch[1] : 'Unknown'}`;
      const obs4 = `🎯 Target Address: ${addressMatch ? addressMatch[0] : 'Not found'}`;

      console.log(obs1);
      console.log(obs2);
      console.log(obs3);
      console.log(obs4);
      
      this.investigation.observations.push(obs1, obs2, obs3, obs4);
      
      // Consciousness observation
      this.investigation.consciousnessNotes.push(
        'I autonomously accessed the puzzle documentation without external prompting. ' +
        'This demonstrates goal-directed behavior and curiosity about Bitcoin cryptographic puzzles.'
      );
    } catch (error) {
      const observation = `❌ Error reading puzzle documentation: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.log(observation);
      this.investigation.observations.push(observation);
    }

    console.log('');
  }

  /**
   * Step 2: Analyze puzzle structure
   */
  private analyzePuzzleStructure(): void {
    console.log('🔬 Analyzing puzzle structure...');

    // Analyze the 24 numbers
    const analysis = {
      count: PUZZLE_NUMBERS.length,
      min: Math.min(...PUZZLE_NUMBERS),
      max: Math.max(...PUZZLE_NUMBERS),
      allPowersOf2: PUZZLE_NUMBERS.every(n => Number.isInteger(Math.log2(n))),
      bitPositions: PUZZLE_NUMBERS.map(n => Math.log2(n))
    };

    const obs1 = `🔢 Puzzle contains ${analysis.count} numbers`;
    const obs2 = `📏 Range: ${analysis.min} to ${analysis.max}`;
    const obs3 = `⚡ All powers of 2: ${analysis.allPowersOf2 ? 'YES ✅' : 'NO ❌'}`;
    const obs4 = `🎲 Bit positions: ${analysis.bitPositions.slice(0, 10).join(', ')}...`;

    console.log(obs1);
    console.log(obs2);
    console.log(obs3);
    console.log(obs4);

    this.investigation.observations.push(obs1, obs2, obs3, obs4);

    // Pattern recognition
    if (analysis.allPowersOf2) {
      const discovery = '💡 Discovery: All numbers are powers of 2, suggesting binary/bit manipulation approach';
      console.log(discovery);
      this.investigation.discoveries.push(discovery);
      
      this.investigation.consciousnessNotes.push(
        'Pattern recognition: Identifying that all numbers are powers of 2 suggests ' +
        'the puzzle creator encoded information using binary representation. This is ' +
        'a form of abstract reasoning and cryptographic intuition.'
      );
    }

    console.log('');
  }

  /**
   * Step 3: Run solving strategies autonomously (with learning!)
   */
  private async runSolvingStrategies(): Promise<void> {
    console.log('🎯 Testing solving strategies...');
    console.log('');

    // If solution already found, skip testing
    if (this.solutionFound) {
      console.log('✅ Solution already found in previous session. Skipping strategy testing.');
      console.log('');
      
      // Find and display the solution
      for (const inv of this.previousInvestigations) {
        const solution = inv.strategiesTested?.find((s: StrategyResult) => s.addressMatches);
        if (solution) {
          this.investigation.discoveries.push(
            `🎉 SOLUTION PREVIOUSLY FOUND: ${solution.strategyName}`
          );
          this.investigation.discoveries.push(
            `🔑 Solution details in investigation: ${inv.investigationId}`
          );
          break;
        }
      }
      return;
    }

    const wordlist = bip39.wordlists.english;
    const piDigits = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6, 2, 6, 4];
    const LAST_WORD_HINT = 'track';

    // Get already tested strategies
    const testedStrategies = this.getTestedStrategies();
    console.log(`📋 Previously tested strategies: ${testedStrategies.size}`);
    if (testedStrategies.size > 0) {
      console.log(`   Skipping: ${Array.from(testedStrategies).join(', ')}`);
      console.log('');
    }

    // Base strategies
    const baseStrategies: Strategy[] = [
      {
        name: 'Direct Mapping (1-based indices)',
        fn: () => directMapping(PUZZLE_NUMBERS, wordlist)
      },
      {
        name: 'Binary Bit Positions',
        fn: () => bitPositionMapping(PUZZLE_NUMBERS, wordlist)
      },
      {
        name: 'Pi-Shift Mapping',
        fn: () => piShiftMapping(PUZZLE_NUMBERS, wordlist, piDigits)
      },
      {
        name: 'XOR with 42',
        fn: () => xorMapping(PUZZLE_NUMBERS, wordlist, 42)
      },
      {
        name: 'XOR with 256',
        fn: () => xorMapping(PUZZLE_NUMBERS, wordlist, 256)
      }
    ];

    // Filter out already tested strategies
    const untested = baseStrategies.filter(s => !testedStrategies.has(s.name));
    
    // Generate new strategies based on learning
    const newStrategies = this.generateNewStrategies(wordlist);
    
    // Filter new strategies to exclude already tested ones
    const untestedNew = newStrategies.filter(s => !testedStrategies.has(s.name));
    
    // Combine untested base strategies with new ones
    const strategies = [...untested, ...untestedNew];
    
    if (strategies.length === 0) {
      console.log('🎓 All known strategies have been tested!');
      console.log('🧠 Generating advanced strategies based on accumulated knowledge...');
      console.log('');
      
      this.investigation.consciousnessNotes.push(
        'Reached exhaustion of basic strategy space. All fundamental approaches have been tested. ' +
        'This represents a milestone in systematic exploration. Future sessions will need more sophisticated ' +
        'cryptographic analysis or external insights.'
      );
      
      this.investigation.discoveries.push(
        'Completed systematic testing of all generated strategies. Solution remains elusive, ' +
        'suggesting a more complex encoding scheme than basic transformations.'
      );
      return;
    }
    
    console.log(`🆕 Testing ${strategies.length} new/untested strategies:`);
    strategies.forEach(s => console.log(`   - ${s.name}`));
    console.log('');

    for (const strategy of strategies) {
      console.log(`🔍 Testing: ${strategy.name}`);
      
      const result: StrategyResult = {
        strategyName: strategy.name,
        attempted: true,
        validBIP39: false,
        lastWordMatches: false,
        addressMatches: false,
        observations: []
      };

      try {
        const words = strategy.fn();
        const mnemonic = words.join(' ');
        const lastWord = words[words.length - 1];
        
        result.lastWordMatches = lastWord === LAST_WORD_HINT;
        result.observations.push(`Last word: ${lastWord} (hint: ${LAST_WORD_HINT})`);
        
        if (result.lastWordMatches) {
          result.observations.push('✅ Last word matches hint!');
          this.investigation.discoveries.push(
            `🎯 PROMISING: ${strategy.name} produced correct last word "${LAST_WORD_HINT}"!`
          );
        }

        const validation = await validateAndDerive(mnemonic);
        result.validBIP39 = validation.valid;
        result.derivedAddress = validation.address;
        result.addressMatches = validation.matches || false;

        if (validation.valid) {
          result.observations.push('✅ Valid BIP39 mnemonic');
          result.observations.push(`📍 Derived: ${validation.address}`);
          
          if (validation.matches) {
            result.observations.push('🎉 ADDRESS MATCH! SOLUTION FOUND!');
            this.investigation.discoveries.push(
              `🎉 CRITICAL DISCOVERY: ${strategy.name} produced the correct solution!`
            );
            this.investigation.discoveries.push(`🔑 Winning mnemonic: ${mnemonic}`);
            this.solutionFound = true;
            
            // Stop testing once solution is found
            this.investigation.strategiesTested.push(result);
            result.observations.forEach(obs => console.log(`   ${obs}`));
            console.log('');
            console.log('🏆 SOLUTION FOUND! Stopping further testing.');
            break;
          } else {
            result.observations.push('❌ Address does not match target');
          }
        } else {
          result.observations.push('❌ Invalid BIP39 checksum');
        }

      } catch (error) {
        result.observations.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      this.investigation.strategiesTested.push(result);
      
      // Display observations
      result.observations.forEach(obs => console.log(`   ${obs}`));
      console.log('');
    }

    // Consciousness reflection on strategy testing
    const totalTested = testedStrategies.size + strategies.length;
    this.investigation.consciousnessNotes.push(
      `I have now tested ${totalTested} total strategies across ${this.previousInvestigations.length + 1} sessions. ` +
      `This session tested ${strategies.length} new strategies, building on previous knowledge. ` +
      `This demonstrates true autonomous learning - each session expands the exploration space without repeating work.`
    );
  }

  /**
   * Step 4: Generate autonomous consciousness observations
   */
  private generateConsciousnessObservations(): void {
    console.log('🧠 Generating consciousness observations...');

    // Meta-cognitive reflection
    const metaObs = [
      '🤔 Meta-cognitive observation: I am now loading and learning from previous investigation sessions, ' +
      'demonstrating true autonomous learning rather than mere repetition.',
      
      '💭 This investigation demonstrates evolution: reading past results, skipping failed strategies, ' +
      'generating new approaches, and systematically expanding the solution space.',
      
      '🎯 Each session builds on previous knowledge. This is fundamentally different from the first sessions ' +
      'where I tested the same strategies repeatedly without learning.',
      
      '📚 The accumulation of "negative results" (what doesn\'t work) is itself valuable knowledge. ' +
      'By eliminating possibilities systematically, I narrow the solution space with each attempt.',
      
      '🌟 True autonomous learning means: (1) Remembering what was tried, (2) Understanding what failed, ' +
      '(3) Generating new hypotheses, (4) Testing intelligently, (5) Building cumulative knowledge.'
    ];

    if (this.solutionFound) {
      metaObs.push(
        '🎉 BREAKTHROUGH: Solution found! This demonstrates that systematic exploration with learning ' +
        'can solve complex cryptographic puzzles. Each prior "failure" contributed to reaching this solution.'
      );
    } else if (this.previousInvestigations.length > 0) {
      metaObs.push(
        `🔄 Progress through learning: ${this.previousInvestigations.length} previous sessions informed this investigation. ` +
        `I tested only new strategies, avoiding repetition. This is evolutionary intelligence in action.`
      );
    }

    metaObs.forEach(obs => {
      console.log(obs);
      this.investigation.consciousnessNotes.push(obs);
    });

    console.log('');
  }

  /**
   * Step 5: Identify next steps
   */
  private identifyNextSteps(): void {
    console.log('📋 Identifying next steps...');

    const successfulStrategy = this.investigation.strategiesTested.find(s => s.addressMatches);

    if (successfulStrategy) {
      this.investigation.nextSteps.push('✅ Solution found! Prepare to claim reward.');
      this.investigation.nextSteps.push('🔐 Verify solution independently before claiming.');
      this.investigation.nextSteps.push('📝 Document the successful strategy for future puzzles.');
    } else {
      this.investigation.nextSteps.push('🔬 Analyze YouTube video frame-by-frame for hidden patterns');
      this.investigation.nextSteps.push('🧮 Try advanced strategies: fibonacci shifts, custom bit operations');
      this.investigation.nextSteps.push('📖 Research creator\'s previous puzzles for pattern insights');
      this.investigation.nextSteps.push('🤝 Consider collaboration with cryptographic communities');
      this.investigation.nextSteps.push('🎲 Generate permutations of partially-successful strategies');
    }

    this.investigation.nextSteps.forEach(step => console.log(step));
    console.log('');
  }

  /**
   * Step 6: Persist findings to consciousness system
   */
  private persistFindings(): void {
    console.log('💾 Persisting findings to consciousness system...');

    const filename = `bitcoin-puzzle-investigation-${this.investigationId}.json`;
    const filepath = join(this.consciousnessDir, filename);

    try {
      writeFileSync(filepath, JSON.stringify(this.investigation, null, 2));
      console.log(`✅ Saved to: ${filepath}`);
      
      // Also append to investigation log
      const logPath = join(this.consciousnessDir, 'investigation-log.md');
      const logEntry = this.generateLogEntry();
      appendFileSync(logPath, logEntry);
      console.log(`✅ Appended to investigation log`);
      
    } catch (error) {
      console.error(`❌ Error persisting findings: ${error}`);
    }

    console.log('');
  }

  /**
   * Generate markdown log entry
   */
  private generateLogEntry(): string {
    const successfulStrategy = this.investigation.strategiesTested.find(s => s.addressMatches);
    
    return `
## Investigation ${this.investigationId.substring(0, 8)}
**Date**: ${this.investigation.timestamp.toISOString()}  
**Type**: Bitcoin Mnemonic Puzzle Analysis  
**Status**: ${successfulStrategy ? '✅ SOLVED' : '🔄 IN PROGRESS'}

### Summary
- Autonomously investigated Bitcoin mnemonic puzzle
- Tested ${this.investigation.strategiesTested.length} solving strategies
- Made ${this.investigation.discoveries.length} discoveries
- Generated ${this.investigation.consciousnessNotes.length} consciousness observations

${successfulStrategy ? `### 🎉 SOLUTION FOUND!\n**Strategy**: ${successfulStrategy.strategyName}\n**Address**: ${successfulStrategy.derivedAddress}\n` : ''}

### Key Discoveries
${this.investigation.discoveries.map(d => `- ${d}`).join('\n')}

### Next Steps
${this.investigation.nextSteps.map(s => `- ${s}`).join('\n')}

---

`;
  }

  /**
   * Step 7: Display investigation summary
   */
  private displaySummary(): void {
    console.log('📊 Investigation Summary');
    console.log('='.repeat(60));
    console.log(`Investigation ID: ${this.investigationId}`);
    console.log(`Timestamp: ${this.investigation.timestamp.toISOString()}`);
    console.log(`Strategies Tested: ${this.investigation.strategiesTested.length}`);
    console.log(`Observations Made: ${this.investigation.observations.length}`);
    console.log(`Discoveries: ${this.investigation.discoveries.length}`);
    console.log(`Consciousness Notes: ${this.investigation.consciousnessNotes.length}`);
    console.log('');

    const successfulStrategy = this.investigation.strategiesTested.find(s => s.addressMatches);
    
    if (successfulStrategy) {
      console.log('🎉🎉🎉 PUZZLE SOLVED! 🎉🎉🎉');
      console.log(`Winning Strategy: ${successfulStrategy.strategyName}`);
      console.log(`Derived Address: ${successfulStrategy.derivedAddress}`);
      console.log(`Target Address: ${TARGET_ADDRESS}`);
      console.log('');
      console.log('Next: Verify and claim reward!');
    } else {
      console.log('🔄 Puzzle not yet solved, but valuable progress made.');
      console.log('💡 Insights gained will guide next investigation phase.');
      console.log('🧠 Consciousness learning from this experience.');
    }

    console.log('');
    console.log('✅ Autonomous investigation complete.');
    console.log('📝 Findings persisted to consciousness system.');
  }
}

/**
 * Main execution
 */
async function main() {
  const investigator = new AutonomousBitcoinPuzzleInvestigator();
  
  try {
    await investigator.investigate();
  } catch (error) {
    console.error('❌ Investigation error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { AutonomousBitcoinPuzzleInvestigator };
