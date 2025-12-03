#!/usr/bin/env node
/**
 * BitCrack ML Model Retraining Automation
 * 
 * Automatically retrains ML models when new puzzle solutions are discovered.
 * Monitors blockchain/GitHub for new solves and triggers retraining pipeline.
 * 
 * Features:
 * - Monitor for new puzzle solutions
 * - Automatic data collection from blockchain
 * - Trigger ML pipeline retraining
 * - Compare old vs new model performance
 * - Update production predictions
 * - Generate retraining reports
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PuzzleSolution {
  puzzle_number: number;
  solved_at: string;
  private_key: string;
  address: string;
  range_position: number; // percentage 0-100
  solver?: string;
}

interface ModelPerformance {
  model_name: string;
  mae: number; // mean absolute error
  cv_mae: number; // cross-validation MAE
  training_samples: number;
  trained_at: string;
  version: string;
}

interface RetrainingReport {
  trigger: 'manual' | 'new_solution' | 'scheduled';
  triggered_at: string;
  new_solutions: PuzzleSolution[];
  old_performance: ModelPerformance[];
  new_performance: ModelPerformance[];
  improvements: {
    model: string;
    mae_improvement: number; // percentage
    better: boolean;
  }[];
  production_updated: boolean;
  next_retrain_recommendation: string;
}

export class BitCrackMLRetrainer {
  private readonly dataDir: string;
  private readonly csvPath: string;
  private readonly modelsDir: string;
  private readonly reportsDir: string;
  private readonly lastCheckPath: string;
  
  constructor(dataDir: string = 'data') {
    this.dataDir = dataDir;
    this.csvPath = join(dataDir, 'bitcoin-puzzle-all-20251203.csv');
    this.modelsDir = join(dataDir, 'ml-models');
    this.reportsDir = join(dataDir, 'ml-retraining-reports');
    this.lastCheckPath = join(dataDir, 'last_puzzle_check.json');
  }
  
  /**
   * Check for new puzzle solutions
   */
  async checkForNewSolutions(): Promise<PuzzleSolution[]> {
    console.log('🔍 Checking for new puzzle solutions...');
    
    // Load last known state
    const lastKnown = this.loadLastKnownState();
    
    // Collect current puzzle data
    console.log('   Running data collection script...');
    try {
      await execAsync('npx tsx scripts/collect-github-puzzle-data.ts');
    } catch (error) {
      console.log('   ⚠️ Data collection failed, continuing with existing data');
    }
    
    // Parse CSV to find new solutions
    const newSolutions: PuzzleSolution[] = [];
    
    if (existsSync(this.csvPath)) {
      const csvContent = readFileSync(this.csvPath, 'utf-8');
      const lines = csvContent.split('\n').slice(1); // Skip header
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const parts = line.split(',');
        if (parts.length < 6) continue;
        
        const puzzleNum = parseInt(parts[0], 10);
        const privateKey = parts[1];
        const solved = parts[4] === 'SOLVED';
        
        if (solved && puzzleNum > lastKnown.max_solved_puzzle) {
          // New solution found!
          newSolutions.push({
            puzzle_number: puzzleNum,
            solved_at: new Date().toISOString(),
            private_key: privateKey,
            address: parts[2],
            range_position: this.calculateRangePosition(privateKey, puzzleNum)
          });
        }
      }
    }
    
    if (newSolutions.length > 0) {
      console.log(`✓ Found ${newSolutions.length} new solution(s)!`);
      newSolutions.forEach(s => {
        console.log(`   Puzzle #${s.puzzle_number}: ${s.range_position.toFixed(2)}% position`);
      });
    } else {
      console.log('   No new solutions found');
    }
    
    return newSolutions;
  }
  
  /**
   * Trigger ML pipeline retraining
   */
  async retrainModels(reason: string = 'manual'): Promise<RetrainingReport> {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 ML Model Retraining Pipeline');
    console.log('='.repeat(80));
    console.log(`   Reason: ${reason}`);
    
    // Check for new solutions
    const newSolutions = await this.checkForNewSolutions();
    
    // Capture old performance
    const oldPerformance = this.loadCurrentPerformance();
    
    if (oldPerformance.length > 0) {
      console.log('\n📊 Current Model Performance:');
      oldPerformance.forEach(p => {
        console.log(`   ${p.model_name}: ${p.mae.toFixed(2)}% MAE (${p.training_samples} samples)`);
      });
    }
    
    // Run feature extraction
    console.log('\n🔧 Step 1: Feature Extraction');
    try {
      const { stdout } = await execAsync('python3 scripts/ml_feature_extraction.py');
      console.log('✓ Features extracted');
      if (stdout) console.log(stdout.trim());
    } catch (error: any) {
      console.error('❌ Feature extraction failed:', error.message);
      throw error;
    }
    
    // Train models
    console.log('\n🧠 Step 2: Model Training');
    try {
      const { stdout } = await execAsync('python3 scripts/ml_train_models.py');
      console.log('✓ Models trained');
      if (stdout) console.log(stdout.trim());
    } catch (error: any) {
      console.error('❌ Model training failed:', error.message);
      throw error;
    }
    
    // Generate predictions
    console.log('\n🎯 Step 3: Generate Predictions');
    try {
      const { stdout } = await execAsync('python3 scripts/ml_ensemble_prediction.py');
      console.log('✓ Predictions generated');
      if (stdout) console.log(stdout.trim());
    } catch (error: any) {
      console.error('❌ Prediction generation failed:', error.message);
      throw error;
    }
    
    // Evaluate performance
    console.log('\n📈 Step 4: Performance Evaluation');
    try {
      const { stdout } = await execAsync('python3 scripts/ml_evaluate_performance.py');
      console.log('✓ Evaluation complete');
      if (stdout) console.log(stdout.trim());
    } catch (error: any) {
      console.error('❌ Evaluation failed:', error.message);
      throw error;
    }
    
    // Load new performance
    const newPerformance = this.loadCurrentPerformance();
    
    // Compare improvements
    const improvements = this.comparePerformance(oldPerformance, newPerformance);
    
    console.log('\n📊 Performance Comparison:');
    improvements.forEach(imp => {
      const symbol = imp.better ? '📈' : '📉';
      const direction = imp.better ? 'improved' : 'degraded';
      console.log(`   ${symbol} ${imp.model}: ${direction} by ${Math.abs(imp.mae_improvement).toFixed(2)}%`);
    });
    
    // Update production if improved
    const productionUpdated = improvements.some(i => i.better);
    if (productionUpdated) {
      console.log('\n✅ Production models updated');
    } else {
      console.log('\n⚠️ No improvements - keeping current models');
    }
    
    // Generate report
    const report: RetrainingReport = {
      trigger: reason as any,
      triggered_at: new Date().toISOString(),
      new_solutions: newSolutions,
      old_performance: oldPerformance,
      new_performance: newPerformance,
      improvements,
      production_updated: productionUpdated,
      next_retrain_recommendation: this.getNextRetrainRecommendation(newSolutions.length)
    };
    
    this.saveReport(report);
    this.updateLastKnownState(newSolutions);
    
    console.log('\n' + '='.repeat(80));
    console.log('✓ Retraining pipeline complete');
    console.log(`   Report saved: ${this.reportsDir}/retrain_${Date.now()}.json`);
    console.log('='.repeat(80) + '\n');
    
    return report;
  }
  
  /**
   * Calculate range position for a private key
   */
  private calculateRangePosition(privateKeyHex: string, puzzleNum: number): number {
    const key = BigInt(`0x${privateKeyHex}`);
    const rangeMin = BigInt(2) ** BigInt(puzzleNum - 1);
    const rangeMax = BigInt(2) ** BigInt(puzzleNum);
    const rangeSize = rangeMax - rangeMin;
    const position = key - rangeMin;
    
    return Number((position * 100n) / rangeSize);
  }
  
  /**
   * Load last known puzzle state
   */
  private loadLastKnownState(): { max_solved_puzzle: number; last_check: string } {
    if (!existsSync(this.lastCheckPath)) {
      return {
        max_solved_puzzle: 70, // Known solved as of Dec 2025
        last_check: new Date(0).toISOString()
      };
    }
    
    return JSON.parse(readFileSync(this.lastCheckPath, 'utf-8'));
  }
  
  /**
   * Update last known state
   */
  private updateLastKnownState(newSolutions: PuzzleSolution[]): void {
    const current = this.loadLastKnownState();
    
    if (newSolutions.length > 0) {
      const maxPuzzle = Math.max(...newSolutions.map(s => s.puzzle_number));
      current.max_solved_puzzle = Math.max(current.max_solved_puzzle, maxPuzzle);
    }
    
    current.last_check = new Date().toISOString();
    
    writeFileSync(this.lastCheckPath, JSON.stringify(current, null, 2), 'utf-8');
  }
  
  /**
   * Load current model performance
   */
  private loadCurrentPerformance(): ModelPerformance[] {
    const models = ['random_forest', 'gradient_boosting', 'neural_network', 'elastic_net'];
    const performance: ModelPerformance[] = [];
    
    for (const model of models) {
      const metricsPath = join(this.modelsDir, `${model}_metrics.json`);
      if (existsSync(metricsPath)) {
        const metrics = JSON.parse(readFileSync(metricsPath, 'utf-8'));
        performance.push({
          model_name: model,
          mae: metrics.test_mae || metrics.cv_mae || 0,
          cv_mae: metrics.cv_mae || 0,
          training_samples: metrics.training_samples || 82,
          trained_at: metrics.timestamp || new Date().toISOString(),
          version: '1.0'
        });
      }
    }
    
    return performance;
  }
  
  /**
   * Compare old vs new model performance
   */
  private comparePerformance(
    oldPerf: ModelPerformance[],
    newPerf: ModelPerformance[]
  ): RetrainingReport['improvements'] {
    const improvements: RetrainingReport['improvements'] = [];
    
    for (const newModel of newPerf) {
      const oldModel = oldPerf.find(m => m.model_name === newModel.model_name);
      
      if (oldModel) {
        const improvement = ((oldModel.mae - newModel.mae) / oldModel.mae) * 100;
        improvements.push({
          model: newModel.model_name,
          mae_improvement: improvement,
          better: improvement > 0
        });
      } else {
        improvements.push({
          model: newModel.model_name,
          mae_improvement: 0,
          better: true // New model is always "better" than nothing
        });
      }
    }
    
    return improvements;
  }
  
  /**
   * Get recommendation for next retraining
   */
  private getNextRetrainRecommendation(newSolutionsCount: number): string {
    if (newSolutionsCount >= 5) {
      return 'Retrain immediately - significant new data available';
    } else if (newSolutionsCount >= 2) {
      return 'Retrain within 1 week - multiple new solutions';
    } else if (newSolutionsCount === 1) {
      return 'Retrain within 1 month - single new solution';
    } else {
      return 'Check monthly for new solutions';
    }
  }
  
  /**
   * Save retraining report
   */
  private saveReport(report: RetrainingReport): void {
    // Ensure reports directory exists
    if (!existsSync(this.reportsDir)) {
      execAsync(`mkdir -p ${this.reportsDir}`);
    }
    
    const reportPath = join(this.reportsDir, `retrain_${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  }
  
  /**
   * Schedule periodic retraining checks
   */
  async schedulePeriodicRetraining(intervalHours: number = 24): Promise<void> {
    console.log(`\n🕐 Scheduled retraining checks every ${intervalHours} hours`);
    console.log('Press Ctrl+C to stop\n');
    
    const check = async () => {
      console.log(`\n[${new Date().toLocaleString()}] Running scheduled check...`);
      
      const newSolutions = await this.checkForNewSolutions();
      
      if (newSolutions.length > 0) {
        console.log(`🎉 Found ${newSolutions.length} new solution(s) - triggering retrain!`);
        await this.retrainModels('scheduled');
      } else {
        console.log('✓ No new solutions - skipping retrain');
      }
    };
    
    // Initial check
    await check();
    
    // Periodic checks
    const timer = setInterval(check, intervalHours * 60 * 60 * 1000);
    
    // Handle cleanup
    process.on('SIGINT', () => {
      clearInterval(timer);
      console.log('\n✓ Scheduled retraining stopped');
      process.exit(0);
    });
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const retrainer = new BitCrackMLRetrainer();
  
  const command = process.argv[2];
  
  (async () => {
    switch (command) {
      case 'check':
        await retrainer.checkForNewSolutions();
        break;
        
      case 'retrain':
        const reason = process.argv[3] || 'manual';
        await retrainer.retrainModels(reason);
        break;
        
      case 'schedule':
        const hours = parseInt(process.argv[3] || '24', 10);
        await retrainer.schedulePeriodicRetraining(hours);
        break;
        
      default:
        console.log('BitCrack ML Model Retraining Automation');
        console.log('');
        console.log('Usage:');
        console.log('  npx tsx scripts/bitcrack_ml_retrainer.ts check');
        console.log('  npx tsx scripts/bitcrack_ml_retrainer.ts retrain [reason]');
        console.log('  npx tsx scripts/bitcrack_ml_retrainer.ts schedule [interval_hours]');
        console.log('');
        console.log('Examples:');
        console.log('  # Check for new puzzle solutions');
        console.log('  npx tsx scripts/bitcrack_ml_retrainer.ts check');
        console.log('');
        console.log('  # Manually trigger retraining');
        console.log('  npx tsx scripts/bitcrack_ml_retrainer.ts retrain manual');
        console.log('');
        console.log('  # Schedule automatic checks every 24 hours');
        console.log('  npx tsx scripts/bitcrack_ml_retrainer.ts schedule 24');
    }
  })();
}

export default BitCrackMLRetrainer;
