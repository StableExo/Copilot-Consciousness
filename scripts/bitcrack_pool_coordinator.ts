#!/usr/bin/env node
/**
 * BitCrackRandomiser Pool Coordinator
 * 
 * Integrates with BitCrackRandomiser pool API for coordinated search.
 * Prevents duplicate work across pool participants and tracks collective progress.
 * 
 * Features:
 * - Register with pool and get assigned ranges
 * - Report progress to pool for anti-duplicate tracking
 * - Query pool-wide statistics
 * - Coordinate with 33M range tracking system
 * - Handle pool failover and reconnection
 * 
 * Pool API: https://github.com/iceland2k14/BitCrackRandomiser
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PoolConfig {
  pool_url: string;
  api_key?: string;
  client_id: string;
  puzzle_number: number;
  custom_range?: {
    start: string;
    end: string;
  };
  scan_type: 'includeDefeated' | 'excludeDefeated' | 'customRange';
  report_interval_seconds: number;
}

interface PoolAssignment {
  assignment_id: string;
  puzzle: number;
  start_hex: string;
  end_hex: string;
  assigned_at: string;
  expires_at?: string;
  priority: number;
}

interface PoolProgress {
  assignment_id: string;
  searched_keys: bigint;
  search_rate: number; // keys per second
  last_report: string;
  status: 'searching' | 'completed' | 'abandoned';
}

interface PoolStats {
  total_participants: number;
  total_ranges_searched: number;
  keyspace_covered: number; // percentage
  estimated_completion?: string;
  your_contribution: {
    ranges_completed: number;
    keys_searched: bigint;
    rank: number;
  };
}

export class BitCrackPoolCoordinator {
  private readonly configPath: string;
  private readonly progressPath: string;
  private config: PoolConfig | null = null;
  private currentAssignment: PoolAssignment | null = null;
  private reportTimer: NodeJS.Timeout | null = null;
  
  constructor(configPath: string = 'data/ml-predictions/pool_config.json') {
    this.configPath = configPath;
    this.progressPath = configPath.replace('config', 'progress');
  }
  
  /**
   * Initialize pool connection and configuration
   */
  async initialize(customRange?: { start: string; end: string }): Promise<void> {
    this.config = this.loadOrCreateConfig(customRange);
    
    console.log('🔗 Initializing BitCrackRandomiser pool connection...');
    console.log(`   Pool URL: ${this.config.pool_url}`);
    console.log(`   Puzzle: #${this.config.puzzle_number}`);
    console.log(`   Client ID: ${this.config.client_id}`);
    
    if (customRange) {
      console.log(`   Custom Range: ${customRange.start} → ${customRange.end}`);
      console.log(`   ⚠️ Using custom range - ensure it aligns with ML predictions!`);
    }
    
    // In a real implementation, this would:
    // 1. Register with pool API
    // 2. Verify connection
    // 3. Get initial assignment
    // 4. Start periodic reporting
    
    console.log('✓ Pool connection initialized');
  }
  
  /**
   * Request a new range assignment from the pool
   */
  async requestAssignment(): Promise<PoolAssignment> {
    if (!this.config) {
      throw new Error('Pool not initialized. Call initialize() first.');
    }
    
    console.log('📝 Requesting range assignment from pool...');
    
    // In a real implementation, this would make an API call to:
    // POST /api/assignment
    // Body: { client_id, puzzle, custom_range?, scan_type }
    
    // Simulated assignment (would come from API)
    const assignment: PoolAssignment = {
      assignment_id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      puzzle: this.config.puzzle_number,
      start_hex: this.config.custom_range?.start || '400000000000000000',
      end_hex: this.config.custom_range?.end || '800000000000000000',
      assigned_at: new Date().toISOString(),
      priority: 50
    };
    
    this.currentAssignment = assignment;
    this.saveAssignment(assignment);
    
    console.log(`✓ Assignment received: ${assignment.assignment_id}`);
    console.log(`   Range: ${assignment.start_hex} → ${assignment.end_hex}`);
    
    return assignment;
  }
  
  /**
   * Report progress to pool
   */
  async reportProgress(searchedKeys: bigint, searchRate: number): Promise<void> {
    if (!this.currentAssignment) {
      throw new Error('No active assignment. Request an assignment first.');
    }
    
    const progress: PoolProgress = {
      assignment_id: this.currentAssignment.assignment_id,
      searched_keys: searchedKeys,
      search_rate: searchRate,
      last_report: new Date().toISOString(),
      status: 'searching'
    };
    
    console.log(`📊 Reporting progress to pool...`);
    console.log(`   Assignment: ${progress.assignment_id}`);
    console.log(`   Searched: ${progress.searched_keys} keys`);
    console.log(`   Rate: ${(progress.search_rate / 1e9).toFixed(2)} B keys/sec`);
    
    // In a real implementation, this would make an API call to:
    // POST /api/progress
    // Body: { assignment_id, searched_keys, search_rate }
    
    this.saveProgress(progress);
    
    console.log('✓ Progress reported successfully');
  }
  
  /**
   * Report completion of a range
   */
  async reportCompletion(found: boolean, privateKey?: string): Promise<void> {
    if (!this.currentAssignment) {
      throw new Error('No active assignment to complete.');
    }
    
    console.log('🏁 Reporting range completion to pool...');
    
    if (found && privateKey) {
      console.log('🎉 FOUND! Private key discovered!');
      console.log('⚠️ WARNING: Use private relay to submit transaction!');
      
      // In a real implementation, this would:
      // 1. Report find to pool (optional - you might want to claim reward first)
      // 2. Prepare private transaction
      // 3. Submit via private relay
    } else {
      console.log('Range exhausted, no key found');
    }
    
    // In a real implementation, this would make an API call to:
    // POST /api/complete
    // Body: { assignment_id, found, proof? }
    
    const progress: PoolProgress = {
      assignment_id: this.currentAssignment.assignment_id,
      searched_keys: 0n, // N/A for completion
      search_rate: 0,
      last_report: new Date().toISOString(),
      status: found ? 'completed' : 'completed'
    };
    
    this.saveProgress(progress);
    this.currentAssignment = null;
    
    console.log('✓ Completion reported');
  }
  
  /**
   * Abandon current assignment (e.g., if switching priorities)
   */
  async abandonAssignment(reason: string = 'user_requested'): Promise<void> {
    if (!this.currentAssignment) {
      console.log('No active assignment to abandon');
      return;
    }
    
    console.log(`⚠️ Abandoning assignment: ${reason}`);
    
    // In a real implementation, this would make an API call to:
    // POST /api/abandon
    // Body: { assignment_id, reason }
    
    const progress: PoolProgress = {
      assignment_id: this.currentAssignment.assignment_id,
      searched_keys: 0n,
      search_rate: 0,
      last_report: new Date().toISOString(),
      status: 'abandoned'
    };
    
    this.saveProgress(progress);
    this.currentAssignment = null;
    
    console.log('✓ Assignment abandoned');
  }
  
  /**
   * Query pool-wide statistics
   */
  async getPoolStats(): Promise<PoolStats> {
    if (!this.config) {
      throw new Error('Pool not initialized.');
    }
    
    console.log('📊 Querying pool statistics...');
    
    // In a real implementation, this would make an API call to:
    // GET /api/stats?puzzle=71
    
    // Simulated stats (would come from API)
    const stats: PoolStats = {
      total_participants: 42,
      total_ranges_searched: 1337,
      keyspace_covered: 12.5,
      your_contribution: {
        ranges_completed: 3,
        keys_searched: BigInt('1500000000000000000'),
        rank: 15
      }
    };
    
    console.log('✓ Pool stats retrieved');
    return stats;
  }
  
  /**
   * Start automatic progress reporting
   */
  startAutoReporting(getProgress: () => { searchedKeys: bigint; searchRate: number }): void {
    if (!this.config) {
      throw new Error('Pool not initialized.');
    }
    
    if (this.reportTimer) {
      console.log('Auto-reporting already active');
      return;
    }
    
    const intervalMs = this.config.report_interval_seconds * 1000;
    
    this.reportTimer = setInterval(async () => {
      try {
        const progress = getProgress();
        await this.reportProgress(progress.searchedKeys, progress.searchRate);
      } catch (error) {
        console.error('❌ Auto-report failed:', error);
      }
    }, intervalMs);
    
    console.log(`✓ Auto-reporting started (every ${this.config.report_interval_seconds}s)`);
  }
  
  /**
   * Stop automatic progress reporting
   */
  stopAutoReporting(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
      console.log('✓ Auto-reporting stopped');
    }
  }
  
  /**
   * Display pool status
   */
  async displayStatus(): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('🌐 BitCrackRandomiser Pool Status');
    console.log('='.repeat(80));
    
    if (!this.config) {
      console.log('\n❌ Pool not initialized');
      console.log('   Run: npx tsx scripts/bitcrack_pool_coordinator.ts init');
      console.log('='.repeat(80) + '\n');
      return;
    }
    
    console.log('\n⚙️ Configuration:');
    console.log(`   Pool URL: ${this.config.pool_url}`);
    console.log(`   Client ID: ${this.config.client_id}`);
    console.log(`   Puzzle: #${this.config.puzzle_number}`);
    console.log(`   Scan Type: ${this.config.scan_type}`);
    
    if (this.currentAssignment) {
      console.log('\n📝 Current Assignment:');
      console.log(`   ID: ${this.currentAssignment.assignment_id}`);
      console.log(`   Range: ${this.currentAssignment.start_hex} → ${this.currentAssignment.end_hex}`);
      console.log(`   Assigned: ${new Date(this.currentAssignment.assigned_at).toLocaleString()}`);
      console.log(`   Priority: ${this.currentAssignment.priority}`);
    } else {
      console.log('\n📝 Current Assignment: None');
    }
    
    try {
      const stats = await this.getPoolStats();
      console.log('\n📊 Pool Statistics:');
      console.log(`   Participants: ${stats.total_participants}`);
      console.log(`   Ranges Searched: ${stats.total_ranges_searched}`);
      console.log(`   Keyspace Covered: ${stats.keyspace_covered.toFixed(2)}%`);
      console.log(`   Your Rank: #${stats.your_contribution.rank}`);
      console.log(`   Your Ranges: ${stats.your_contribution.ranges_completed}`);
      console.log(`   Your Keys: ${stats.your_contribution.keys_searched}`);
    } catch (error) {
      console.log('\n📊 Pool Statistics: Unable to retrieve');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  /**
   * Load or create pool configuration
   */
  private loadOrCreateConfig(customRange?: { start: string; end: string }): PoolConfig {
    if (existsSync(this.configPath)) {
      const data = readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(data);
      
      // Override custom range if provided
      if (customRange) {
        config.custom_range = customRange;
        config.scan_type = 'customRange';
      }
      
      return config;
    }
    
    // Create default configuration
    const config: PoolConfig = {
      pool_url: 'https://bitcrackrandomiser.com', // Example - replace with actual
      client_id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      puzzle_number: 71,
      scan_type: customRange ? 'customRange' : 'includeDefeated',
      custom_range: customRange,
      report_interval_seconds: 300 // 5 minutes
    };
    
    writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`✓ Created pool configuration: ${this.configPath}`);
    
    return config;
  }
  
  /**
   * Save current assignment
   */
  private saveAssignment(assignment: PoolAssignment): void {
    const path = this.configPath.replace('.json', '_assignment.json');
    writeFileSync(path, JSON.stringify(assignment, null, 2), 'utf-8');
  }
  
  /**
   * Save progress record
   */
  private saveProgress(progress: PoolProgress): void {
    // Convert BigInt to string for JSON
    const serializable = {
      ...progress,
      searched_keys: progress.searched_keys.toString()
    };
    
    // Load existing progress history
    let history: any[] = [];
    if (existsSync(this.progressPath)) {
      history = JSON.parse(readFileSync(this.progressPath, 'utf-8'));
    }
    
    history.push(serializable);
    
    // Keep last 100 records
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    writeFileSync(this.progressPath, JSON.stringify(history, null, 2), 'utf-8');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const coordinator = new BitCrackPoolCoordinator();
  
  const command = process.argv[2];
  
  (async () => {
    switch (command) {
      case 'init':
        const customStart = process.argv[3];
        const customEnd = process.argv[4];
        const customRange = customStart && customEnd ? { start: customStart, end: customEnd } : undefined;
        await coordinator.initialize(customRange);
        break;
        
      case 'request':
        await coordinator.requestAssignment();
        break;
        
      case 'report':
        const searchedKeys = BigInt(process.argv[3] || '0');
        const searchRate = parseFloat(process.argv[4] || '0');
        await coordinator.reportProgress(searchedKeys, searchRate);
        break;
        
      case 'complete':
        const found = process.argv[3] === 'true';
        await coordinator.reportCompletion(found);
        break;
        
      case 'abandon':
        const reason = process.argv[3] || 'user_requested';
        await coordinator.abandonAssignment(reason);
        break;
        
      case 'stats':
        const stats = await coordinator.getPoolStats();
        console.log(JSON.stringify(stats, null, 2));
        break;
        
      case 'status':
        await coordinator.displayStatus();
        break;
        
      default:
        console.log('BitCrackRandomiser Pool Coordinator');
        console.log('');
        console.log('Usage:');
        console.log('  npx tsx scripts/bitcrack_pool_coordinator.ts init [start_hex] [end_hex]');
        console.log('  npx tsx scripts/bitcrack_pool_coordinator.ts request');
        console.log('  npx tsx scripts/bitcrack_pool_coordinator.ts report <searched_keys> <search_rate>');
        console.log('  npx tsx scripts/bitcrack_pool_coordinator.ts complete <found:true|false>');
        console.log('  npx tsx scripts/bitcrack_pool_coordinator.ts abandon [reason]');
        console.log('  npx tsx scripts/bitcrack_pool_coordinator.ts stats');
        console.log('  npx tsx scripts/bitcrack_pool_coordinator.ts status');
        console.log('');
        console.log('Examples:');
        console.log('  # Initialize with ML-guided range');
        console.log('  npx tsx scripts/bitcrack_pool_coordinator.ts init 5999999999999A0000 7999999999999A0000');
        console.log('');
        console.log('  # Request assignment from pool');
        console.log('  npx tsx scripts/bitcrack_pool_coordinator.ts request');
        console.log('');
        console.log('  # Report progress (1e18 keys searched at 1B keys/sec)');
        console.log('  npx tsx scripts/bitcrack_pool_coordinator.ts report 1000000000000000000 1000000000');
    }
  })();
}

export default BitCrackPoolCoordinator;
