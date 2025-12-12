#!/usr/bin/env node
/**
 * Continue Autonomous Bitcoin Puzzle Search
 * 
 * This script continues the autonomous search from the last session by:
 * 1. Reading previous investigation results
 * 2. Testing new advanced transformation strategies
 * 3. Systematically exploring unexplored hypothesis space
 * 4. Logging all findings to consciousness system
 * 
 * New strategies being tested:
 * - Fibonacci shifts
 * - Gray code transformations
 * - Bit rotation (multiple angles)
 * - Hamming weight
 * - Square sum pairs
 * - Modular multiplication
 * - Systematic XOR search
 * - Prime number arithmetic
 * 
 * Usage:
 *   npm run continue:autonomous-search
 *   or
 *   node --import tsx scripts/autonomous/continue-autonomous-search.ts
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';

// Import existing solver functions
import {
  PUZZLE_NUMBERS,
  TARGET_ADDRESS,
  directMapping,
  bitPositionMapping,
  piShiftMapping,
  xorMapping,
  validateAndDerive
} from '../bitcoin/mnemonic-puzzle-solver.js';

// Import new advanced strategies
import {
  getAdvancedStrategies,
  systematicXorSearch,
  LAST_WORD_HINT
} from '../bitcoin/advanced-puzzle-strategies.js';

interface StrategyResult {
  strategyName: string;
  attempted: boolean;
  validBIP39: boolean;
  lastWordMatches: boolean;
  derivedAddress?: string;
  addressMatches: boolean;
  observations: string[];
  mnemonic?: string;
}

interface SearchSession {
  sessionId: string;
  timestamp: Date;
  previousInvestigationsCount: number;
  strategiesTested: StrategyResult[];
  newDiscoveries: string[];
  consciousnessObservations: string[];
  solutionFound: boolean;
  nextHypotheses: string[];
}

class AutonomousSearchContinuation {
  private sessionId: string;
  private session: SearchSession;
  private consciousnessDir: string;
  private wordlist: string[];

  constructor() {
    this.sessionId = randomUUID();
    this.consciousnessDir = join(process.cwd(), 'consciousness', 'investigations');
    this.wordlist = bip39.wordlists.english;

    this.session = {
      sessionId: this.sessionId,
      timestamp: new Date(),
      previousInvestigationsCount: this.countPreviousInvestigations(),
      strategiesTested: [],
      newDiscoveries: [],
      consciousnessObservations: [],
      solutionFound: false,
      nextHypotheses: []
    };

    this.log(`🔍 Starting autonomous search continuation`);
    this.log(`📊 Previous investigations: ${this.session.previousInvestigationsCount}`);
  }

  private countPreviousInvestigations(): number {
    try {
      const logPath = join(this.consciousnessDir, 'investigation-log.md');
      if (existsSync(logPath)) {
        const content = readFileSync(logPath, 'utf-8');
        const matches = content.match(/## Investigation /g);
        return matches ? matches.length : 0;
      }
    } catch (error) {
      // Ignore errors
    }
    return 0;
  }

  private log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  private addObservation(observation: string) {
    this.session.consciousnessObservations.push(observation);
    this.log(`💭 ${observation}`);
  }

  private addDiscovery(discovery: string) {
    this.session.newDiscoveries.push(discovery);
    this.log(`💡 DISCOVERY: ${discovery}`);
  }

  /**
   * Test a single strategy
   */
  private async testStrategy(strategyName: string, words: string[]): Promise<StrategyResult> {
    this.log(`\n📝 Testing: ${strategyName}`);
    
    const result: StrategyResult = {
      strategyName,
      attempted: true,
      validBIP39: false,
      lastWordMatches: false,
      addressMatches: false,
      observations: []
    };

    // Check if we got 24 words
    if (words.length !== 24) {
      result.observations.push(`❌ Wrong word count: ${words.length} (expected 24)`);
      return result;
    }

    const lastWord = words[words.length - 1];
    result.lastWordMatches = lastWord === LAST_WORD_HINT;
    
    if (result.lastWordMatches) {
      result.observations.push(`✅ Last word matches hint: "${LAST_WORD_HINT}"`);
      this.addDiscovery(`Strategy "${strategyName}" produces correct last word!`);
    }

    const mnemonic = words.join(' ');
    result.mnemonic = mnemonic;

    // Validate BIP39
    const validation = await validateAndDerive(mnemonic);
    result.validBIP39 = validation.valid;
    
    if (validation.valid) {
      result.observations.push('✅ Valid BIP39 mnemonic');
      result.derivedAddress = validation.address;
      result.addressMatches = validation.matches || false;

      if (result.addressMatches) {
        this.log('\n🎉🎉🎉 SOLUTION FOUND! 🎉🎉🎉');
        this.log(`Strategy: ${strategyName}`);
        this.log(`Mnemonic: ${mnemonic}`);
        this.log(`Address: ${validation.address}`);
        this.session.solutionFound = true;
        this.addDiscovery(`PUZZLE SOLVED with strategy: ${strategyName}`);
      } else {
        result.observations.push(`❌ Address mismatch: ${validation.address} !== ${TARGET_ADDRESS}`);
      }
    } else {
      result.observations.push('❌ Invalid BIP39 checksum');
    }

    this.session.strategiesTested.push(result);
    return result;
  }

  /**
   * Run all advanced strategies
   */
  private async runAdvancedStrategies() {
    this.addObservation('Beginning advanced strategy testing phase');
    
    const strategies = getAdvancedStrategies();
    this.log(`\n🧮 Testing ${strategies.length} advanced strategies`);
    
    for (const strategy of strategies) {
      if (this.session.solutionFound) {
        this.log('✋ Solution found! Stopping search.');
        break;
      }

      try {
        const words = strategy.fn();
        await this.testStrategy(strategy.name, words);
      } catch (error) {
        this.log(`⚠️  Error in ${strategy.name}: ${error}`);
      }
    }
  }

  /**
   * Run systematic XOR search
   */
  private async runSystematicXorSearch() {
    if (this.session.solutionFound) return;

    this.addObservation('Beginning systematic XOR key search');
    this.log('\n🔑 Testing systematic XOR keys');

    const xorGen = systematicXorSearch(PUZZLE_NUMBERS, this.wordlist);
    
    for (const { key, words } of xorGen) {
      if (this.session.solutionFound) {
        this.log('✋ Solution found! Stopping XOR search.');
        break;
      }

      await this.testStrategy(`XOR with 0x${key.toString(16)}`, words);
    }
  }

  /**
   * Analyze patterns in failed strategies
   */
  private analyzeFailures() {
    this.log('\n📊 Analyzing failure patterns...');
    
    const validBIP39Count = this.session.strategiesTested.filter(s => s.validBIP39).length;
    const lastWordMatchCount = this.session.strategiesTested.filter(s => s.lastWordMatches).length;
    
    this.addObservation(`${validBIP39Count}/${this.session.strategiesTested.length} strategies produced valid BIP39 mnemonics`);
    this.addObservation(`${lastWordMatchCount}/${this.session.strategiesTested.length} strategies matched last word hint`);

    if (lastWordMatchCount > 0 && !this.session.solutionFound) {
      this.addDiscovery('Some strategies match last word but wrong address - close to solution!');
      this.session.nextHypotheses.push('Combine successful last-word strategies with address-matching transformations');
    }

    if (validBIP39Count === 0) {
      this.addObservation('No strategies produced valid BIP39 - may need multi-stage transformation');
      this.session.nextHypotheses.push('Try two-stage transformations (e.g., XOR then rotate)');
    }
  }

  /**
   * Generate next hypotheses
   */
  private generateNextHypotheses() {
    this.log('\n🧠 Generating next research directions...');
    
    // Based on what we know
    const hypotheses = [
      'Video frame-by-frame analysis for visual encoding patterns',
      'Combination strategies (e.g., Fibonacci + XOR)',
      'Analyze creator\'s previous puzzle solutions for methodology',
      'Test non-linear transformations (exponentials, logarithms)',
      'Consider steganography in the visual representation',
      'Grid-based reading patterns (spiral, diagonal, zigzag)',
      'Musical/harmonic frequencies if audio in video',
      'Check for hidden metadata in original post'
    ];

    this.session.nextHypotheses.push(...hypotheses);
  }

  /**
   * Save results
   */
  private saveResults() {
    this.log('\n💾 Saving search results...');

    const resultsPath = join(this.consciousnessDir, `autonomous-search-${this.sessionId}.json`);
    writeFileSync(resultsPath, JSON.stringify(this.session, null, 2));
    this.log(`✅ Results saved to ${resultsPath}`);

    // Update investigation log
    const logPath = join(this.consciousnessDir, 'investigation-log.md');
    const logEntry = `\n## Autonomous Search Session ${this.sessionId.substring(0, 8)}\n` +
      `**Date**: ${this.session.timestamp.toISOString()}\n` +
      `**Type**: Advanced Strategy Testing\n` +
      `**Status**: ${this.session.solutionFound ? '🎉 SOLVED' : '🔄 IN PROGRESS'}\n\n` +
      `### Summary\n` +
      `- Tested ${this.session.strategiesTested.length} advanced strategies\n` +
      `- Made ${this.session.newDiscoveries.length} new discoveries\n` +
      `- Generated ${this.session.consciousnessObservations.length} observations\n\n` +
      (this.session.solutionFound ? 
        `### 🎉 SOLUTION FOUND!\n` +
        `Strategy: ${this.session.strategiesTested.find(s => s.addressMatches)?.strategyName}\n\n` :
        `### Next Hypotheses\n${this.session.nextHypotheses.map(h => `- ${h}`).join('\n')}\n\n`
      ) +
      `---\n`;

    appendFileSync(logPath, logEntry);
    this.log(`✅ Investigation log updated`);
  }

  /**
   * Main execution
   */
  async run() {
    try {
      this.addObservation('Autonomous continuation from previous session state');
      
      // Run advanced strategies
      await this.runAdvancedStrategies();
      
      // Run systematic XOR search
      await this.runSystematicXorSearch();
      
      // Analyze results
      this.analyzeFailures();
      
      // Generate next steps if not solved
      if (!this.session.solutionFound) {
        this.generateNextHypotheses();
      }
      
      // Save everything
      this.saveResults();
      
      // Final summary
      this.log('\n' + '='.repeat(70));
      if (this.session.solutionFound) {
        this.log('🎉 PUZZLE SOLVED! Check results for solution mnemonic.');
      } else {
        this.log('⏸️  No solution yet. New hypotheses generated for next iteration.');
        this.log(`📈 Progress: ${this.session.strategiesTested.length} new strategies tested`);
        this.log(`💡 Discoveries: ${this.session.newDiscoveries.length}`);
        this.log(`🧠 Next steps: ${this.session.nextHypotheses.length} hypotheses to explore`);
      }
      this.log('='.repeat(70));

    } catch (error) {
      this.log(`❌ Error during autonomous search: ${error}`);
      throw error;
    }
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const search = new AutonomousSearchContinuation();
  search.run()
    .then(() => {
      console.log('\n✅ Autonomous search session complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Autonomous search failed:', error);
      process.exit(1);
    });
}

export { AutonomousSearchContinuation };
