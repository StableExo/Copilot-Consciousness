#!/usr/bin/env node
/**
 * Bitcoin Address Path Analyzer
 * 
 * Analyzes transaction paths and address connections in Bitcoin.
 * Inspired by bitcoinpaths.com - tracking how funds flow between addresses.
 * 
 * This is particularly useful for:
 * - Tracking puzzle solution flow
 * - Identifying solver patterns
 * - Understanding fund movements
 * - Detecting address clustering
 * 
 * Reference: https://bitcoinpaths.com/
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AddressNode {
  address: string;
  label?: string;
  total_received: number;
  total_sent: number;
  balance: number;
  tx_count: number;
  first_seen?: string;
  last_seen?: string;
}

interface TransactionEdge {
  from_address: string;
  to_address: string;
  tx_hash: string;
  value: number;
  timestamp: string;
  block_height: number;
}

interface AddressPath {
  path: string[];
  total_value: number;
  hop_count: number;
  transactions: TransactionEdge[];
  start_time: string;
  end_time: string;
}

interface ClusterAnalysis {
  cluster_id: string;
  addresses: string[];
  common_input_heuristic: boolean;
  timing_correlation: number;
  confidence: number;
}

export class BitcoinPathAnalyzer {
  private readonly dataDir: string;
  private readonly pathsPath: string;
  private readonly nodesPath: string;
  private readonly clustersPath: string;
  
  constructor(dataDir: string = 'data/ml-predictions') {
    this.dataDir = dataDir;
    this.pathsPath = join(dataDir, 'address_paths.json');
    this.nodesPath = join(dataDir, 'address_nodes.json');
    this.clustersPath = join(dataDir, 'address_clusters.json');
  }
  
  /**
   * Fetch address information from blockchain API
   */
  async fetchAddressInfo(address: string): Promise<AddressNode | null> {
    console.log(`🔍 Fetching address info: ${address}`);
    
    try {
      const url = `https://blockchain.info/rawaddr/${address}?limit=50`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`❌ API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      
      const node: AddressNode = {
        address,
        total_received: data.total_received,
        total_sent: data.total_sent,
        balance: data.final_balance,
        tx_count: data.n_tx,
        first_seen: data.txs && data.txs.length > 0 ? 
          new Date(data.txs[data.txs.length - 1].time * 1000).toISOString() : undefined,
        last_seen: data.txs && data.txs.length > 0 ?
          new Date(data.txs[0].time * 1000).toISOString() : undefined
      };
      
      console.log(`✓ Address info retrieved (${node.tx_count} transactions)`);
      return node;
    } catch (error: any) {
      console.error(`❌ Fetch failed: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Find path between two addresses
   * This is a simplified version - real implementation would need graph traversal
   */
  async findPath(
    startAddress: string,
    endAddress: string,
    maxHops: number = 5
  ): Promise<AddressPath | null> {
    console.log(`\n🔍 Finding path: ${startAddress} → ${endAddress}`);
    console.log(`   Max hops: ${maxHops}`);
    
    // In a real implementation, this would:
    // 1. Build transaction graph from blockchain data
    // 2. Use BFS or Dijkstra's algorithm to find shortest path
    // 3. Track value flow through intermediate addresses
    // 4. Detect path splitting and merging
    
    // Simplified mock for demonstration
    const path: AddressPath = {
      path: [startAddress, endAddress],
      total_value: 0,
      hop_count: 1,
      transactions: [],
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString()
    };
    
    console.log(`✓ Path found with ${path.hop_count} hops`);
    return path;
  }
  
  /**
   * Analyze puzzle address spending patterns
   * Track where funds go after a puzzle is solved
   */
  async analyzePuzzleSpending(puzzleAddress: string): Promise<{
    immediate_destinations: AddressNode[];
    secondary_destinations: AddressNode[];
    patterns: string[];
  }> {
    console.log(`\n📊 Analyzing puzzle spending: ${puzzleAddress}`);
    
    const addressInfo = await this.fetchAddressInfo(puzzleAddress);
    
    if (!addressInfo) {
      return {
        immediate_destinations: [],
        secondary_destinations: [],
        patterns: []
      };
    }
    
    // In a real implementation, this would:
    // 1. Get all outgoing transactions from puzzle address
    // 2. Track immediate destinations (1st hop)
    // 3. Track secondary destinations (2nd hop)
    // 4. Identify patterns (mixing, exchanges, cold storage)
    
    const patterns: string[] = [];
    
    if (addressInfo.balance === 0 && addressInfo.total_sent > 0) {
      patterns.push('Puzzle has been solved and funds moved');
    }
    
    if (addressInfo.tx_count === 1) {
      patterns.push('Single spending transaction (clean solve)');
    } else if (addressInfo.tx_count > 1) {
      patterns.push(`Multiple transactions (${addressInfo.tx_count} total) - investigate for consolidation`);
    }
    
    console.log(`✓ Analysis complete (${patterns.length} patterns detected)`);
    
    return {
      immediate_destinations: [],
      secondary_destinations: [],
      patterns
    };
  }
  
  /**
   * Cluster addresses based on common ownership heuristics
   * 
   * Heuristics:
   * 1. Common input ownership (multiple inputs from same tx = same owner)
   * 2. Change address detection (unspent output likely owned by sender)
   * 3. Timing correlation (transactions at similar times)
   * 4. Amount patterns (consistent values suggest same entity)
   */
  async clusterAddresses(addresses: string[]): Promise<ClusterAnalysis[]> {
    console.log(`\n🔗 Clustering ${addresses.length} addresses...`);
    
    // In a real implementation, this would:
    // 1. Apply common input heuristic (strongest signal)
    // 2. Detect change addresses
    // 3. Calculate timing correlations
    // 4. Look for amount patterns
    // 5. Build address clusters with confidence scores
    
    const clusters: ClusterAnalysis[] = [];
    
    // Simple example cluster (would be computed from tx data)
    if (addresses.length >= 2) {
      clusters.push({
        cluster_id: `cluster_${Date.now()}`,
        addresses: addresses.slice(0, 2),
        common_input_heuristic: false, // Would check actual tx data
        timing_correlation: 0.5,
        confidence: 60
      });
    }
    
    console.log(`✓ Found ${clusters.length} potential clusters`);
    
    return clusters;
  }
  
  /**
   * Visualize address connections (ASCII art graph)
   */
  visualizeConnections(
    nodes: AddressNode[],
    edges: TransactionEdge[]
  ): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 Address Connection Visualization');
    console.log('='.repeat(80));
    
    console.log('\n📍 Nodes:');
    nodes.forEach((node, idx) => {
      const balance = (node.balance / 1e8).toFixed(8);
      const shortAddr = node.address.slice(0, 8) + '...' + node.address.slice(-6);
      console.log(`   [${idx}] ${shortAddr} (${balance} BTC, ${node.tx_count} txs)`);
    });
    
    console.log('\n🔗 Edges:');
    edges.forEach((edge, idx) => {
      const value = (edge.value / 1e8).toFixed(8);
      const fromIdx = nodes.findIndex(n => n.address === edge.from_address);
      const toIdx = nodes.findIndex(n => n.address === edge.to_address);
      console.log(`   [${idx}] [${fromIdx}] → [${toIdx}] (${value} BTC)`);
    });
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  /**
   * Track funds from puzzle solution to final destination
   */
  async trackPuzzleFunds(
    puzzleNumber: number,
    puzzleAddress: string,
    maxDepth: number = 3
  ): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log(`💰 Tracking Puzzle #${puzzleNumber} Funds`);
    console.log('='.repeat(80));
    console.log(`   Address: ${puzzleAddress}`);
    console.log(`   Max depth: ${maxDepth} hops`);
    
    // Get puzzle address info
    const puzzleNode = await this.fetchAddressInfo(puzzleAddress);
    
    if (!puzzleNode) {
      console.log('\n❌ Could not fetch address information');
      return;
    }
    
    console.log('\n📊 Puzzle Address Status:');
    console.log(`   Total Received: ${(puzzleNode.total_received / 1e8).toFixed(8)} BTC`);
    console.log(`   Total Sent: ${(puzzleNode.total_sent / 1e8).toFixed(8)} BTC`);
    console.log(`   Current Balance: ${(puzzleNode.balance / 1e8).toFixed(8)} BTC`);
    console.log(`   Transactions: ${puzzleNode.tx_count}`);
    
    if (puzzleNode.balance > 0) {
      console.log('\n✅ Puzzle UNSOLVED - Funds still present');
    } else if (puzzleNode.total_sent > 0) {
      console.log('\n🎉 Puzzle SOLVED - Funds have been moved!');
      
      // Analyze spending patterns
      const spending = await this.analyzePuzzleSpending(puzzleAddress);
      
      console.log('\n🔍 Spending Patterns:');
      spending.patterns.forEach(p => {
        console.log(`   - ${p}`);
      });
      
      if (spending.immediate_destinations.length > 0) {
        console.log('\n📍 Immediate Destinations:');
        spending.immediate_destinations.forEach(dest => {
          console.log(`   ${dest.address} (${(dest.balance / 1e8).toFixed(8)} BTC)`);
        });
      }
    } else {
      console.log('\n⚠️ No activity detected on this address');
    }
    
    console.log('\n💡 Recommendations:');
    console.log('   - Use blockchain explorers for detailed transaction history');
    console.log('   - Check txgraph.info to visualize transaction structure');
    console.log('   - Use bitcoinpaths.com to trace fund paths');
    console.log('   - Investigate immediate destination addresses');
    console.log('   - Look for mixing patterns (tumbling/CoinJoin)');
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
  
  /**
   * Compare puzzle solving patterns across multiple puzzles
   */
  async compareSolvingPatterns(puzzleAddresses: Array<{
    number: number;
    address: string;
  }>): Promise<void> {
    console.log('\n📊 Comparing Solving Patterns');
    console.log(`   Analyzing ${puzzleAddresses.length} puzzles...\n`);
    
    const results: Array<{
      number: number;
      solved: boolean;
      tx_count: number;
      time_to_solve?: string;
    }> = [];
    
    for (const puzzle of puzzleAddresses) {
      const info = await this.fetchAddressInfo(puzzle.address);
      
      if (info) {
        results.push({
          number: puzzle.number,
          solved: info.balance === 0 && info.total_sent > 0,
          tx_count: info.tx_count
        });
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Results:');
    results.forEach(r => {
      const status = r.solved ? '✅ SOLVED' : '⏳ UNSOLVED';
      console.log(`   Puzzle #${r.number}: ${status} (${r.tx_count} txs)`);
    });
    
    const solvedCount = results.filter(r => r.solved).length;
    console.log(`\n📈 Summary: ${solvedCount}/${results.length} solved`);
  }
  
  /**
   * Display help for bitcoinpaths.com and txgraph.info integration
   */
  displayPathsInfo(): void {
    console.log('\n' + '='.repeat(80));
    console.log('🌐 Bitcoin Transaction Graph Tools');
    console.log('='.repeat(80));
    
    console.log('\n📖 Visualization Tools:');
    console.log('   1. BitcoinPaths.com - Path-finding between addresses');
    console.log('      URL: https://bitcoinpaths.com/');
    console.log('      Use: Find how funds travel from A to B');
    console.log('');
    console.log('   2. TxGraph.info - Transaction graph visualization');
    console.log('      URL: https://txgraph.info/');
    console.log('      Use: Visualize transaction inputs/outputs as a graph');
    console.log('      Features: Interactive node exploration, clustering detection');
    
    console.log('\n🎯 Use Cases for Puzzle Analysis:');
    console.log('   1. Track where puzzle funds go after being solved');
    console.log('   2. Identify solver patterns (immediate exchange deposit?)');
    console.log('   3. Detect if funds were stolen via mempool front-running');
    console.log('   4. Find connections between multiple puzzle solves');
    console.log('   5. Understand fund consolidation patterns');
    
    console.log('\n🔍 Example Analysis Workflow:');
    console.log('   1. Get puzzle address (e.g., 1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU)');
    console.log('   2. Check if funds have moved (balance = 0)');
    console.log('   3. Get transaction hash of spending tx');
    console.log('   4. Use txgraph.info to visualize transaction structure');
    console.log('      - See all inputs/outputs');
    console.log('      - Identify change addresses');
    console.log('      - Detect clustering patterns');
    console.log('   5. Use bitcoinpaths.com to trace fund flow');
    console.log('      - Track path to final destination');
    console.log('      - Identify intermediate hops');
    console.log('   6. Analyze final destination (exchange, mixer, cold storage)');
    
    console.log('\n💡 Integration with ML Pipeline:');
    console.log('   - Solver behavior patterns can improve ML models');
    console.log('   - Time-to-solve correlates with key position');
    console.log('   - Spending patterns indicate solver sophistication');
    console.log('   - Address clustering reveals coordinated solving attempts');
    
    console.log('\n🔐 Privacy Considerations:');
    console.log('   - All Bitcoin transactions are public');
    console.log('   - Address clustering can reveal identity');
    console.log('   - Use mixers/CoinJoin for privacy after solving');
    console.log('   - Private mempool submission prevents front-running');
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new BitcoinPathAnalyzer();
  
  const command = process.argv[2];
  
  (async () => {
    switch (command) {
      case 'info':
        analyzer.displayPathsInfo();
        break;
        
      case 'address':
        const address = process.argv[3];
        if (!address) {
          console.log('Usage: npx tsx scripts/bitcoin_path_analyzer.ts address <address>');
        } else {
          await analyzer.fetchAddressInfo(address);
        }
        break;
        
      case 'track':
        const puzzleNum = parseInt(process.argv[3] || '71', 10);
        const puzzleAddr = process.argv[4];
        if (!puzzleAddr) {
          console.log('Usage: npx tsx scripts/bitcoin_path_analyzer.ts track <puzzle_number> <address>');
          console.log('');
          console.log('Example:');
          console.log('  npx tsx scripts/bitcoin_path_analyzer.ts track 71 1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU');
        } else {
          await analyzer.trackPuzzleFunds(puzzleNum, puzzleAddr);
        }
        break;
        
      case 'compare':
        const addresses = process.argv.slice(3);
        if (addresses.length === 0) {
          console.log('Usage: npx tsx scripts/bitcoin_path_analyzer.ts compare <addr1> <addr2> ...');
        } else {
          const puzzles = addresses.map((addr, idx) => ({
            number: 71 + idx,
            address: addr
          }));
          await analyzer.compareSolvingPatterns(puzzles);
        }
        break;
        
      default:
        console.log('Bitcoin Address Path Analyzer');
        console.log('');
        console.log('Integrates with:');
        console.log('  - https://bitcoinpaths.com/ (path visualization)');
        console.log('  - https://txgraph.info/ (transaction graph)');
        console.log('');
        console.log('Usage:');
        console.log('  npx tsx scripts/bitcoin_path_analyzer.ts info');
        console.log('  npx tsx scripts/bitcoin_path_analyzer.ts address <address>');
        console.log('  npx tsx scripts/bitcoin_path_analyzer.ts track <puzzle_number> <address>');
        console.log('  npx tsx scripts/bitcoin_path_analyzer.ts compare <addr1> [addr2] ...');
        console.log('');
        console.log('Examples:');
        console.log('  # Display BitcoinPaths.com integration info');
        console.log('  npx tsx scripts/bitcoin_path_analyzer.ts info');
        console.log('');
        console.log('  # Track puzzle #71 funds');
        console.log('  npx tsx scripts/bitcoin_path_analyzer.ts track 71 1PWo3JeB9jrGwfHDNpdGK54CRas7fsVzXU');
        console.log('');
        console.log('  # Compare multiple puzzle addresses');
        console.log('  npx tsx scripts/bitcoin_path_analyzer.ts compare 1PWo3... 1Fo65... 1CD91...');
    }
  })();
}

export default BitcoinPathAnalyzer;
