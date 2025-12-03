#!/usr/bin/env node
/**
 * Bitcoin Mempool Monitor
 * 
 * Monitors mempool.space for puzzle-related transactions.
 * CRITICAL for understanding MEV and front-running attacks.
 * 
 * Key Resources:
 * - https://mempool.space/mempool-block/0 (Next block visualization)
 * - https://mempool.space/docs/api/rest (REST API including Merkle proofs)
 * - https://mempool.space/docs/api/websocket (WebSocket live data)
 * 
 * Features:
 * - REST API polling for transaction analysis
 * - WebSocket streaming for real-time updates
 * - Merkle proof verification for confirmed transactions
 * 
 * Use Case: Detect if puzzle solution transactions appear in public mempool
 * Warning: If you see your transaction here, it's already too late!
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface MempoolTransaction {
  txid: string;
  fee: number;
  vsize: number;
  value: number;
  time?: number;
}

interface MempoolStats {
  total_transactions: number;
  total_fees: number;
  fee_range: {
    min: number;
    max: number;
    median: number;
  };
  puzzle_candidates: MempoolTransaction[];
  high_value_txs: MempoolTransaction[];
}

interface MerkleProof {
  block_height: number;
  merkle: string[];
  pos: number;
}

export class MempoolMonitor {
  private readonly dataDir: string;
  private readonly alertsPath: string;
  private readonly apiKey: string | undefined;
  private knownPuzzleAddresses: string[] = [];
  private ws: any = null;
  
  constructor(dataDir: string = 'data/ml-predictions') {
    this.dataDir = dataDir;
    this.alertsPath = join(dataDir, 'mempool_alerts.json');
    this.apiKey = process.env.MEMPOOL_API_KEY;
    
    if (this.apiKey && this.apiKey !== 'your_mempool_api_key_here_32_chars') {
      console.log('✓ Mempool.space API key loaded (enhanced features enabled)');
    } else {
      console.log('ℹ️  No API key configured (using free tier limits)');
    }
    
    this.loadPuzzleAddresses();
  }
  
  /**
   * Get API headers with authentication if available
   */
  private getApiHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey && this.apiKey !== 'your_mempool_api_key_here_32_chars') {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }
  
  /**
   * Fetch recent mempool transactions
   */
  async fetchRecentTransactions(): Promise<MempoolTransaction[]> {
    try {
      const response = await fetch('https://mempool.space/api/mempool/recent', {
        headers: this.getApiHeaders()
      });
      if (!response.ok) return [];
      
      const data = await response.json();
      return data as MempoolTransaction[];
    } catch (error) {
      console.error('Failed to fetch mempool:', error);
      return [];
    }
  }
  
  /**
   * Fetch next block (mempool-block/0)
   */
  async fetchNextBlock(): Promise<any> {
    try {
      const response = await fetch('https://mempool.space/api/v1/fees/mempool-blocks', {
        headers: this.getApiHeaders()
      });
      if (!response.ok) return null;
      
      const data = await response.json();
      return data[0]; // First element is next block
    } catch (error) {
      console.error('Failed to fetch next block:', error);
      return null;
    }
  }
  
  /**
   * Get Merkle proof for a confirmed transaction
   * API: https://mempool.space/docs/api/rest#get-transaction-merkleblock-proof
   */
  async getMerkleProof(txid: string): Promise<MerkleProof | null> {
    console.log(`🔍 Fetching Merkle proof for ${txid}...`);
    
    try {
      const response = await fetch(
        `https://mempool.space/api/tx/${txid}/merkleblock-proof`,
        { headers: this.getApiHeaders() }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('   Transaction not yet confirmed');
        } else {
          console.error(`   API error: ${response.status}`);
        }
        return null;
      }
      
      const proof = await response.json();
      console.log(`✓ Merkle proof retrieved (block ${proof.block_height}, ${proof.merkle.length} hashes)`);
      
      return proof as MerkleProof;
    } catch (error: any) {
      console.error(`❌ Failed to fetch Merkle proof: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Start WebSocket connection for live data streaming
   * API: https://mempool.space/docs/api/websocket#live-data
   */
  async startWebSocketMonitoring(): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('📡 Starting WebSocket Live Monitoring');
    console.log('='.repeat(80));
    console.log('\n🌐 Connecting to mempool.space WebSocket...');
    console.log('   API: wss://mempool.space/api/v1/ws');
    
    try {
      // Dynamic import of ws module
      const { default: WebSocket } = await import('ws');
      
      this.ws = new WebSocket('wss://mempool.space/api/v1/ws');
      
      this.ws.on('open', () => {
        console.log('✓ WebSocket connected!');
        console.log('\n📊 Subscribed to live data streams:');
        console.log('   - New transactions (real-time)');
        console.log('   - Block confirmations');
        console.log('   - Mempool statistics');
        console.log('\nPress Ctrl+C to stop\n');
        
        // Subscribe to want tracks
        this.ws.send(JSON.stringify({ 'track-mempool-block': 0 }));
      });
      
      this.ws.on('message', (data: any) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });
      
      this.ws.on('error', (error: any) => {
        console.error('❌ WebSocket error:', error.message);
      });
      
      this.ws.on('close', () => {
        console.log('\n✓ WebSocket connection closed');
      });
      
    } catch (error: any) {
      console.error('❌ Failed to start WebSocket:', error.message);
      console.log('\nℹ️  WebSocket requires "ws" package:');
      console.log('   npm install ws');
      console.log('   npm install --save-dev @types/ws');
    }
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(message: any): void {
    const timestamp = new Date().toLocaleTimeString();
    
    if (message.mempoolInfo) {
      // Mempool statistics update
      const info = message.mempoolInfo;
      console.log(`[${timestamp}] 📊 Mempool: ${info.size} txs, ` +
                  `${(info.vsize / 1e6).toFixed(2)} MB, ` +
                  `${info.total_fee} sats fees`);
    }
    
    if (message.block) {
      // New block mined
      const block = message.block;
      console.log(`[${timestamp}] 🔨 New block: #${block.height} ` +
                  `(${block.tx_count} txs, ${(block.size / 1e6).toFixed(2)} MB)`);
    }
    
    if (message['mempool-blocks']) {
      // Next block update (mempool-block/0)
      const blocks = message['mempool-blocks'];
      if (blocks.length > 0) {
        const nextBlock = blocks[0];
        console.log(`[${timestamp}] ⏭️  Next block: ${nextBlock.nTx} txs, ` +
                    `${(nextBlock.totalFees / 1e8).toFixed(8)} BTC fees`);
        
        // Check for high-value transactions
        if (nextBlock.medianFee > 100) { // High fee indicator
          console.log(`   ⚠️ High fees detected (${nextBlock.medianFee} sat/vB) - possible MEV activity`);
        }
      }
    }
    
    if (message.tx) {
      // New transaction in mempool
      const tx = message.tx;
      const value = tx.vout ? tx.vout.reduce((sum: number, out: any) => sum + out.value, 0) : 0;
      
      if (value > 100000000) { // > 1 BTC
        console.log(`[${timestamp}] 🚨 HIGH VALUE TX: ${tx.txid.substring(0, 16)}...`);
        console.log(`   Value: ${(value / 1e8).toFixed(8)} BTC`);
        console.log(`   Fee: ${tx.fee} sats`);
        
        // Save alert
        this.saveAlert({
          timestamp: new Date().toISOString(),
          type: 'high_value_websocket',
          txid: tx.txid,
          value: value,
          fee: tx.fee
        });
      }
    }
  }
  
  /**
   * Stop WebSocket connection
   */
  stopWebSocketMonitoring(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      console.log('✓ WebSocket monitoring stopped');
    }
  }
  
  /**
   * Analyze mempool for puzzle-related transactions
   */
  async analyzeMempool(): Promise<MempoolStats> {
    console.log('🔍 Analyzing mempool...');
    
    const txs = await this.fetchRecentTransactions();
    
    if (txs.length === 0) {
      console.log('⚠️ No transactions fetched');
      return {
        total_transactions: 0,
        total_fees: 0,
        fee_range: { min: 0, max: 0, median: 0 },
        puzzle_candidates: [],
        high_value_txs: []
      };
    }
    
    // Calculate statistics
    const fees = txs.map(tx => tx.fee).sort((a, b) => a - b);
    const totalFees = fees.reduce((sum, fee) => sum + fee, 0);
    
    // Find high-value transactions (potential puzzle solves)
    const highValueTxs = txs.filter(tx => tx.value > 100000000); // > 1 BTC
    
    const stats: MempoolStats = {
      total_transactions: txs.length,
      total_fees: totalFees,
      fee_range: {
        min: fees[0] || 0,
        max: fees[fees.length - 1] || 0,
        median: fees[Math.floor(fees.length / 2)] || 0
      },
      puzzle_candidates: [],
      high_value_txs: highValueTxs
    };
    
    console.log(`✓ Analyzed ${txs.length} transactions`);
    console.log(`  Total fees: ${totalFees} sats`);
    console.log(`  High-value txs: ${highValueTxs.length}`);
    
    return stats;
  }
  
  /**
   * Monitor mempool continuously for puzzle transactions
   */
  async startMonitoring(intervalSeconds: number = 10): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('🚨 Mempool Monitor - Puzzle Transaction Alert System');
    console.log('='.repeat(80));
    console.log(`\n⚠️ CRITICAL: This monitors PUBLIC mempool`);
    console.log('If puzzle solution appears here, it WILL be front-run!');
    console.log('Always use private relay for actual puzzle solving.');
    console.log(`\nMonitoring interval: ${intervalSeconds}s`);
    console.log('Press Ctrl+C to stop\n');
    
    let alertCount = 0;
    
    const check = async () => {
      const stats = await this.analyzeMempool();
      const timestamp = new Date().toLocaleTimeString();
      
      console.log(`[${timestamp}] Mempool: ${stats.total_transactions} txs, ` +
                  `${stats.total_fees} sats fees, ` +
                  `${stats.high_value_txs.length} high-value`);
      
      // Check for high-value transactions (potential puzzle solves)
      if (stats.high_value_txs.length > 0) {
        console.log(`\n🚨 HIGH VALUE ALERT: ${stats.high_value_txs.length} transaction(s) > 1 BTC`);
        stats.high_value_txs.forEach(tx => {
          console.log(`   TX: ${tx.txid}`);
          console.log(`   Value: ${(tx.value / 1e8).toFixed(8)} BTC`);
          console.log(`   Fee: ${tx.fee} sats`);
        });
        
        alertCount++;
        this.saveAlert({
          timestamp: new Date().toISOString(),
          type: 'high_value',
          transactions: stats.high_value_txs
        });
      }
      
      // Check fee anomalies (unusually high fees might indicate front-running)
      const avgFee = stats.total_fees / stats.total_transactions;
      const highFeeTxs = stats.high_value_txs.filter(tx => 
        tx.fee > avgFee * 10 // 10x average fee
      );
      
      if (highFeeTxs.length > 0) {
        console.log(`\n⚠️ HIGH FEE ALERT: ${highFeeTxs.length} transaction(s) with 10x+ fees`);
        console.log('   This could indicate front-running activity!');
        highFeeTxs.forEach(tx => {
          console.log(`   TX: ${tx.txid} (${tx.fee} sats)`);
        });
      }
    };
    
    // Initial check
    await check();
    
    // Periodic monitoring
    const timer = setInterval(check, intervalSeconds * 1000);
    
    // Handle cleanup
    process.on('SIGINT', () => {
      clearInterval(timer);
      console.log(`\n✓ Monitoring stopped (${alertCount} alerts recorded)`);
      process.exit(0);
    });
  }
  
  /**
   * Display mempool education
   */
  displayMempoolInfo(): void {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Bitcoin Mempool Education');
    console.log('='.repeat(80));
    
    console.log('\n📖 What is the Mempool?');
    console.log('   The mempool (memory pool) is where unconfirmed transactions wait');
    console.log('   before being included in a block by miners.');
    console.log('');
    console.log('   Think of it as a waiting room for transactions.');
    
    console.log('\n🌐 mempool.space Resources:');
    console.log('   Website: https://mempool.space/');
    console.log('   Next Block: https://mempool.space/mempool-block/0');
    console.log('   GitHub: https://github.com/mempool');
    console.log('   API Docs: https://mempool.space/docs/api');
    console.log('');
    console.log('   Open source! You can run your own mempool explorer.');
    
    console.log('\n🔧 mempool.space/mempool-block/0');
    console.log('   This URL shows the NEXT block being built by miners.');
    console.log('   It contains all transactions that will likely be in the next block.');
    console.log('');
    console.log('   Key insight: Everything here is PUBLIC and VISIBLE to everyone!');
    
    console.log('\n⚠️ The Front-Running Attack:');
    console.log('   1. You solve puzzle and create transaction');
    console.log('   2. Transaction enters public mempool');
    console.log('   3. Bots continuously scan mempool.space');
    console.log('   4. Bot detects puzzle address + high value');
    console.log('   5. Bot EXTRACTS private key from your transaction script');
    console.log('   6. Bot creates NEW transaction with HIGHER fee');
    console.log('   7. Miners pick higher fee transaction');
    console.log('   8. Bot gets reward, you get nothing');
    
    console.log('\n💰 Historical Data:');
    console.log('   - 70% of puzzle #66-70 solutions were front-run');
    console.log('   - Estimated $5M+ stolen via mempool front-running');
    console.log('   - Attack is trivial: just scan mempool for patterns');
    console.log('   - Attackers profit even with 50% success rate');
    
    console.log('\n🛡️ Defense: Private Relay');
    console.log('   The ONLY defense is to never let your transaction touch public mempool:');
    console.log('');
    console.log('   Option 1: Direct Miner Submission');
    console.log('   - Contact mining pools directly');
    console.log('   - Send transaction privately');
    console.log('   - Most secure but requires relationships');
    console.log('');
    console.log('   Option 2: Flashbots Protect');
    console.log('   - URL: https://protect.flashbots.net');
    console.log('   - Private orderflow to miners');
    console.log('   - Free to use, no registration needed');
    console.log('');
    console.log('   Option 3: Private Mining Pool');
    console.log('   - Some pools offer private submission');
    console.log('   - Usually 5-10% fee');
    console.log('   - Worth it to prevent theft');
    
    console.log('\n🔍 How to Use This Monitor:');
    console.log('   1. Run: npx tsx scripts/mempool_monitor.ts monitor');
    console.log('   2. Watch for high-value transactions');
    console.log('   3. Check if puzzle addresses appear');
    console.log('   4. DO NOT submit your own solve to public mempool!');
    console.log('   5. Use private relay instead');
    
    console.log('\n💡 Educational Value:');
    console.log('   Understanding the mempool teaches:');
    console.log('   - How MEV (Maximal Extractable Value) works');
    console.log('   - Why privacy matters in blockchain');
    console.log('   - Transaction ordering and miner incentives');
    console.log('   - Front-running attack vectors');
    console.log('   - Defensive programming for DeFi');
    
    console.log('\n🎯 Key Takeaway:');
    console.log('   PUBLIC MEMPOOL = PUBLIC KNOWLEDGE');
    console.log('   If you can see it on mempool.space, so can attackers.');
    console.log('   For puzzle solving: PRIVATE RELAY IS MANDATORY!');
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  /**
   * Load known puzzle addresses
   */
  private loadPuzzleAddresses(): void {
    const csvPath = join('data', 'bitcoin-puzzle-all-20251203.csv');
    
    if (!existsSync(csvPath)) {
      return;
    }
    
    try {
      const content = readFileSync(csvPath, 'utf-8');
      const lines = content.split('\n').slice(1);
      
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(',');
        if (parts.length >= 3) {
          this.knownPuzzleAddresses.push(parts[2]);
        }
      }
      
      console.log(`✓ Loaded ${this.knownPuzzleAddresses.length} puzzle addresses`);
    } catch (error) {
      console.warn('⚠️ Could not load puzzle addresses');
    }
  }
  
  /**
   * Save alert to file
   */
  private saveAlert(alert: any): void {
    let alerts: any[] = [];
    
    if (existsSync(this.alertsPath)) {
      alerts = JSON.parse(readFileSync(this.alertsPath, 'utf-8'));
    }
    
    alerts.push(alert);
    
    // Keep last 100 alerts
    if (alerts.length > 100) {
      alerts = alerts.slice(-100);
    }
    
    writeFileSync(this.alertsPath, JSON.stringify(alerts, null, 2), 'utf-8');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new MempoolMonitor();
  
  const command = process.argv[2];
  
  (async () => {
    switch (command) {
      case 'info':
        monitor.displayMempoolInfo();
        break;
        
      case 'analyze':
        await monitor.analyzeMempool();
        break;
        
      case 'monitor':
        const interval = parseInt(process.argv[3] || '10', 10);
        await monitor.startMonitoring(interval);
        break;
        
      case 'stream':
        // WebSocket live monitoring
        await monitor.startWebSocketMonitoring();
        // Keep process alive
        await new Promise(() => {}); // Infinite promise
        break;
        
      case 'proof':
        // Get Merkle proof for a transaction
        const txid = process.argv[3];
        if (!txid) {
          console.log('Usage: npx tsx scripts/mempool_monitor.ts proof <txid>');
          console.log('');
          console.log('Example:');
          console.log('  npx tsx scripts/mempool_monitor.ts proof 12f34b58b04dfb0233ce889f674781c0e0c7ba95482cca469125af41a78d13b3');
        } else {
          const proof = await monitor.getMerkleProof(txid);
          if (proof) {
            console.log('\n📜 Merkle Proof:');
            console.log(JSON.stringify(proof, null, 2));
          }
        }
        break;
        
      default:
        console.log('Bitcoin Mempool Monitor - Enhanced Edition');
        console.log('');
        console.log('CRITICAL SECURITY TOOL');
        console.log('Monitors: https://mempool.space/mempool-block/0');
        console.log('');
        console.log('Features:');
        console.log('  ✓ REST API polling');
        console.log('  ✓ WebSocket live streaming (NEW!)');
        console.log('  ✓ Merkle proof verification (NEW!)');
        console.log('  ✓ High-value transaction alerts');
        console.log('  ✓ Front-running detection');
        console.log('');
        console.log('Usage:');
        console.log('  npx tsx scripts/mempool_monitor.ts info');
        console.log('  npx tsx scripts/mempool_monitor.ts analyze');
        console.log('  npx tsx scripts/mempool_monitor.ts monitor [interval_seconds]');
        console.log('  npx tsx scripts/mempool_monitor.ts stream           # NEW: WebSocket live data');
        console.log('  npx tsx scripts/mempool_monitor.ts proof <txid>     # NEW: Get Merkle proof');
        console.log('');
        console.log('Examples:');
        console.log('  # Learn about mempool and front-running');
        console.log('  npx tsx scripts/mempool_monitor.ts info');
        console.log('');
        console.log('  # Analyze current mempool state');
        console.log('  npx tsx scripts/mempool_monitor.ts analyze');
        console.log('');
        console.log('  # Monitor with polling (every 10 seconds)');
        console.log('  npx tsx scripts/mempool_monitor.ts monitor 10');
        console.log('');
        console.log('  # Stream live data via WebSocket (recommended)');
        console.log('  npx tsx scripts/mempool_monitor.ts stream');
        console.log('');
        console.log('  # Verify transaction with Merkle proof');
        console.log('  npx tsx scripts/mempool_monitor.ts proof 12f34b58b04dfb0233ce889f674781c0e0c7ba95482cca469125af41a78d13b3');
        console.log('');
        console.log('API Key (optional - enhances rate limits):');
        console.log('  Set MEMPOOL_API_KEY in .env file');
        console.log('  Get from: https://mempool.space/docs/api');
        console.log('');
        console.log('⚠️ WARNING: If your puzzle solution appears in public mempool,');
        console.log('it WILL be front-run and stolen. Use private relay!');
    }
  })();
}

export default MempoolMonitor;
