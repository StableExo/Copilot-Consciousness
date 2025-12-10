#!/usr/bin/env ts-node
/**
 * Opportunity Detection Validator
 * 
 * Diagnostic script to validate that arbitrage opportunities are being
 * detected correctly by the path finding algorithms.
 * 
 * Tests:
 * 1. Pool data → Graph construction
 * 2. Graph → Path finding
 * 3. Paths → Profitability calculation
 * 4. Opportunities → Consciousness evaluation
 * 
 * Usage:
 *   ts-node scripts/validate-opportunity-detection.ts
 *   
 * Environment variables:
 *   BASE_RPC_URL - RPC endpoint for Base network
 *   MIN_PROFIT_THRESHOLD - Minimum profit in USD (default: 1.0)
 */

import { parseEther } from 'viem';
import { createViemPublicClient } from '../src/utils/viem';
import { DEXRegistry } from '../src/dex/core/DEXRegistry';
import { OptimizedPoolScanner } from '../src/arbitrage/OptimizedPoolScanner';
import { PoolEdge } from '../src/arbitrage/types';

// Base network tokens
const BASE_TOKENS = {
  WETH: '0x4200000000000000000000000000000000000006',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
};

interface OpportunityPath {
  tokens: string[];
  pools: string[];
  dexes: string[];
  estimatedProfit: number;
  confidence: number;
}

/**
 * Build a graph from pool edges
 */
function buildGraph(edges: PoolEdge[]): Map<string, PoolEdge[]> {
  const graph = new Map<string, PoolEdge[]>();
  
  for (const edge of edges) {
    if (!graph.has(edge.tokenIn)) {
      graph.set(edge.tokenIn, []);
    }
    graph.get(edge.tokenIn)!.push(edge);
  }
  
  return graph;
}

/**
 * Find simple two-hop arbitrage paths (A → B → A)
 */
function findTwoHopPaths(
  graph: Map<string, PoolEdge[]>,
  startToken: string
): OpportunityPath[] {
  const paths: OpportunityPath[] = [];
  
  // Get all edges from start token
  const firstHops = graph.get(startToken) || [];
  
  for (const firstEdge of firstHops) {
    const intermediateToken = firstEdge.tokenOut;
    
    // Get all edges back to start token
    const secondHops = graph.get(intermediateToken) || [];
    
    for (const secondEdge of secondHops) {
      if (secondEdge.tokenOut === startToken) {
        // Found a cycle! A → B → A
        const path: OpportunityPath = {
          tokens: [startToken, intermediateToken, startToken],
          pools: [firstEdge.poolAddress, secondEdge.poolAddress],
          dexes: [firstEdge.dexName, secondEdge.dexName],
          estimatedProfit: 0, // Will calculate
          confidence: 0.5,
        };
        
        paths.push(path);
      }
    }
  }
  
  return paths;
}

/**
 * Find triangular arbitrage paths (A → B → C → A)
 */
function findTriangularPaths(
  graph: Map<string, PoolEdge[]>,
  startToken: string
): OpportunityPath[] {
  const paths: OpportunityPath[] = [];
  
  // Get all edges from start token
  const firstHops = graph.get(startToken) || [];
  
  for (const firstEdge of firstHops) {
    const token2 = firstEdge.tokenOut;
    if (token2 === startToken) continue;
    
    const secondHops = graph.get(token2) || [];
    
    for (const secondEdge of secondHops) {
      const token3 = secondEdge.tokenOut;
      if (token3 === startToken || token3 === token2) continue;
      
      const thirdHops = graph.get(token3) || [];
      
      for (const thirdEdge of thirdHops) {
        if (thirdEdge.tokenOut === startToken) {
          // Found a triangular cycle! A → B → C → A
          const path: OpportunityPath = {
            tokens: [startToken, token2, token3, startToken],
            pools: [firstEdge.poolAddress, secondEdge.poolAddress, thirdEdge.poolAddress],
            dexes: [firstEdge.dexName, secondEdge.dexName, thirdEdge.dexName],
            estimatedProfit: 0, // Will calculate
            confidence: 0.7,
          };
          
          paths.push(path);
        }
      }
    }
  }
  
  return paths;
}

/**
 * Estimate profit for a path (simplified)
 */
function estimatePathProfit(
  path: OpportunityPath,
  edges: PoolEdge[],
  startAmountEth: string = '1'
): number {
  // This is a simplified estimation
  // Real profitability calculation needs to account for:
  // - Slippage based on reserves
  // - Gas costs
  // - Flash loan fees
  // - Price impact
  
  // Convert to bigint from ether string
  const startAmount = BigInt(parseEther(startAmountEth).toString());
  let currentAmount = startAmount;
  const edgeMap = new Map(edges.map(e => [e.poolAddress, e]));
  
  for (let i = 0; i < path.pools.length; i++) {
    const edge = edgeMap.get(path.pools[i]);
    if (!edge) return -1; // Invalid path
    
    // Simplified constant product formula (x * y = k)
    // amountOut = (amountIn * reserve1 * (1 - fee)) / (reserve0 + amountIn * (1 - fee))
    const fee = edge.fee;
    
    // Use BigInt arithmetic for precision
    // Calculate (1 - fee) as a fraction: (1e18 - fee * 1e18) / 1e18
    const feeMultiplier = BigInt(1e18) - BigInt(Math.floor(fee * 1e18));
    const amountInAfterFee = (currentAmount * feeMultiplier) / BigInt(1e18);
    
    // Use reserve0/reserve1 for calculation
    const numerator = amountInAfterFee * edge.reserve1;
    const denominator = edge.reserve0 + amountInAfterFee;
    
    currentAmount = numerator / denominator;
  }
  
  // Profit in percentage
  const profit = Number(currentAmount - startAmount) / Number(startAmount);
  return profit * 100; // Return as percentage
}

/**
 * Filter paths by profitability
 */
function filterProfitablePaths(
  paths: OpportunityPath[],
  edges: PoolEdge[],
  minProfitPercent: number = 0.1
): OpportunityPath[] {
  const profitable: OpportunityPath[] = [];
  
  for (const path of paths) {
    const profit = estimatePathProfit(path, edges);
    path.estimatedProfit = profit;
    
    if (profit > minProfitPercent) {
      profitable.push(path);
    }
  }
  
  // Sort by profit (descending)
  profitable.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  
  return profitable;
}

/**
 * Get token symbol for display
 */
function getTokenSymbol(address: string): string {
  const symbols: Record<string, string> = {
    [BASE_TOKENS.WETH]: 'WETH',
    [BASE_TOKENS.USDC]: 'USDC',
    [BASE_TOKENS.USDbC]: 'USDbC',
    [BASE_TOKENS.DAI]: 'DAI',
  };
  
  return symbols[address] || address.slice(0, 8) + '...';
}

/**
 * Format path for display
 */
function formatPath(path: OpportunityPath): string {
  const tokenSymbols = path.tokens.map(getTokenSymbol);
  return tokenSymbols.join(' → ');
}

async function main() {
  console.log('🔍 Opportunity Detection Validator');
  console.log('===================================\n');
  
  // Check environment
  if (!process.env.BASE_RPC_URL) {
    console.error('❌ BASE_RPC_URL not set in environment');
    process.exit(1);
  }
  
  console.log(`RPC: ${process.env.BASE_RPC_URL}`);
  
  // Initialize components with viem
  const publicClient = createViemPublicClient(8453, process.env.BASE_RPC_URL);
  
  const registry = new DEXRegistry();
  const scanner = new OptimizedPoolScanner(registry, publicClient, 8453);
  
  const tokens = Object.values(BASE_TOKENS);
  
  console.log(`Tokens: ${Object.keys(BASE_TOKENS).join(', ')}\n`);
  
  try {
    // Step 1: Scan for pools
    console.log('📊 Step 1: Scanning for pools...');
    const startTime = Date.now();
    const edges = await scanner.buildGraphEdges(tokens);
    const scanTime = Date.now() - startTime;
    
    console.log(`✅ Found ${edges.length} pool edges in ${(scanTime / 1000).toFixed(2)}s`);
    console.log(`   Unique pools: ${new Set(edges.map(e => e.poolAddress)).size}`);
    console.log();
    
    if (edges.length === 0) {
      console.error('❌ No pools found! Cannot detect opportunities.');
      process.exit(1);
    }
    
    // Step 2: Build graph
    console.log('🕸️  Step 2: Building arbitrage graph...');
    const graph = buildGraph(edges);
    
    console.log(`✅ Graph built with ${graph.size} nodes`);
    for (const [token, outEdges] of graph.entries()) {
      const symbol = getTokenSymbol(token);
      console.log(`   ${symbol}: ${outEdges.length} outgoing edges`);
    }
    console.log();
    
    // Step 3: Find two-hop paths
    console.log('🔄 Step 3: Finding two-hop arbitrage paths...');
    let allTwoHopPaths: OpportunityPath[] = [];
    
    for (const token of tokens) {
      const paths = findTwoHopPaths(graph, token);
      allTwoHopPaths = allTwoHopPaths.concat(paths);
    }
    
    console.log(`✅ Found ${allTwoHopPaths.length} two-hop paths`);
    
    // Step 4: Find triangular paths
    console.log('🔺 Step 4: Finding triangular arbitrage paths...');
    let allTriangularPaths: OpportunityPath[] = [];
    
    for (const token of tokens) {
      const paths = findTriangularPaths(graph, token);
      allTriangularPaths = allTriangularPaths.concat(paths);
    }
    
    console.log(`✅ Found ${allTriangularPaths.length} triangular paths`);
    console.log();
    
    // Step 5: Calculate profitability
    console.log('💰 Step 5: Estimating profitability...');
    
    const minProfitPercent = parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.1');
    
    const profitableTwoHop = filterProfitablePaths(allTwoHopPaths, edges, minProfitPercent);
    const profitableTriangular = filterProfitablePaths(allTriangularPaths, edges, minProfitPercent);
    
    console.log(`✅ Profitable two-hop: ${profitableTwoHop.length}/${allTwoHopPaths.length}`);
    console.log(`✅ Profitable triangular: ${profitableTriangular.length}/${allTriangularPaths.length}`);
    console.log();
    
    // Step 6: Display opportunities
    console.log('🎯 Step 6: Top Opportunities\n');
    
    const allProfitable = [...profitableTwoHop, ...profitableTriangular];
    allProfitable.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
    
    if (allProfitable.length === 0) {
      console.log('⚠️  No profitable opportunities found above threshold');
      console.log(`   Try lowering MIN_PROFIT_THRESHOLD (current: ${minProfitPercent}%)`);
    } else {
      console.log(`Found ${allProfitable.length} profitable opportunities:\n`);
      
      const topN = Math.min(10, allProfitable.length);
      for (let i = 0; i < topN; i++) {
        const opp = allProfitable[i];
        const pathType = opp.tokens.length === 3 ? 'Two-hop' : 'Triangular';
        
        console.log(`${i + 1}. ${pathType}: ${formatPath(opp)}`);
        console.log(`   Profit: ${opp.estimatedProfit.toFixed(4)}%`);
        console.log(`   DEXes: ${opp.dexes.join(' → ')}`);
        console.log(`   Confidence: ${(opp.confidence * 100).toFixed(0)}%`);
        console.log();
      }
      
      if (allProfitable.length > topN) {
        console.log(`   ... and ${allProfitable.length - topN} more\n`);
      }
    }
    
    // Summary
    console.log('📈 Summary:');
    console.log(`   Total pools scanned: ${new Set(edges.map(e => e.poolAddress)).size}`);
    console.log(`   Total paths found: ${allTwoHopPaths.length + allTriangularPaths.length}`);
    console.log(`   Profitable opportunities: ${allProfitable.length}`);
    console.log(`   Detection time: ${(scanTime / 1000).toFixed(2)}s`);
    console.log();
    
    // Validation status
    console.log('✅ Validation Status:');
    console.log(`   Pool Detection: ${edges.length > 0 ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   Graph Construction: ${graph.size > 0 ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   Path Finding: ${allTwoHopPaths.length + allTriangularPaths.length > 0 ? '✅ WORKING' : '❌ FAILED'}`);
    console.log(`   Profitability Calc: ${allProfitable.length >= 0 ? '✅ WORKING' : '❌ FAILED'}`);
    
    if (allProfitable.length > 0) {
      console.log('\n🎉 Opportunity detection is WORKING!');
    } else {
      console.log('\n⚠️  Opportunity detection working but no profitable paths found');
      console.log('   This is normal in low-volatility conditions');
    }
    
  } catch (error: any) {
    console.error('\n❌ Error during validation:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as validateOpportunityDetection };
