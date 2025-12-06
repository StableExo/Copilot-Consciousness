/**
 * DEXScreener Intelligence Analyzer
 * 
 * Consciousness-aware market intelligence layer that processes DEXScreener data
 * and provides actionable insights for TheWarden's autonomous decision-making.
 */

import { DexScreenerClient } from './DexScreenerClient';
import type {
  DexPair,
  MarketIntelligence,
  MarketFilters,
  TokenDiscoveryParams,
  TrendingToken,
  ChainId,
} from './types';

export class DexScreenerIntelligenceAnalyzer {
  private client: DexScreenerClient;
  private knownPairs: Map<string, DexPair> = new Map();
  private lastScanTimestamp: number = 0;

  constructor(client: DexScreenerClient) {
    this.client = client;
  }

  /**
   * Gather comprehensive market intelligence across specified chains
   */
  async gatherMarketIntelligence(
    chains: ChainId[],
    filters?: MarketFilters
  ): Promise<MarketIntelligence> {
    const intelligence: MarketIntelligence = {
      timestamp: Date.now(),
      source: 'dexscreener',
      chains,
      summary: {
        totalPairsScanned: 0,
        newPairsDetected: 0,
        highVolumePairs: 0,
        suspiciousActivity: 0,
      },
      opportunities: [],
      warnings: [],
    };

    try {
      // Get trending/boosted tokens
      const boostedTokens = await this.client.getTopBoostedTokens();
      
      // Analyze each boosted token
      for (const boost of boostedTokens) {
        // Filter by chain if specified
        if (chains.length > 0 && !chains.includes(boost.chainId as ChainId)) {
          continue;
        }

        // Get pair data for this token
        const pairs = await this.client.getPairsByTokens([boost.tokenAddress]);
        
        for (const pair of pairs) {
          intelligence.summary.totalPairsScanned++;

          // Check if this is a new pair (not seen before)
          const pairKey = `${pair.chainId}:${pair.pairAddress}`;
          if (!this.knownPairs.has(pairKey)) {
            this.knownPairs.set(pairKey, pair);
            intelligence.summary.newPairsDetected++;
          }

          // Apply filters
          if (filters) {
            if (filters.minLiquidity && (!pair.liquidity?.usd || pair.liquidity.usd < filters.minLiquidity)) {
              continue;
            }
            if (filters.minVolume24h && pair.volume.h24 < filters.minVolume24h) {
              continue;
            }
            if (filters.minTxnCount && (pair.txns.h24.buys + pair.txns.h24.sells) < filters.minTxnCount) {
              continue;
            }
          }

          // Analyze pair safety
          const safetyAnalysis = await this.client.analyzePairSafety(pair);
          
          if (safetyAnalysis.isSuspicious) {
            intelligence.summary.suspiciousActivity++;
            intelligence.warnings.push({
              type: 'rug_risk',
              pairAddress: pair.pairAddress,
              severity: safetyAnalysis.score < 30 ? 'critical' : 
                        safetyAnalysis.score < 50 ? 'high' : 'medium',
              details: safetyAnalysis.warnings.join('; '),
            });

            if (filters?.excludeScams) {
              continue; // Skip suspicious pairs
            }
          }

          // Check for high volume
          if (pair.volume.h24 > 100000) { // $100k+ daily volume
            intelligence.summary.highVolumePairs++;
          }

          // Score opportunity
          const opportunityScore = this.scoreOpportunity(pair, safetyAnalysis.score);
          
          if (opportunityScore > 70) {
            intelligence.opportunities.push({
              pairAddress: pair.pairAddress,
              chainId: pair.chainId,
              score: opportunityScore,
              reason: this.generateOpportunityReason(pair, safetyAnalysis.score),
              data: pair,
            });
          }

          // Check for manipulation patterns
          const manipulationWarnings = this.detectManipulation(pair);
          intelligence.warnings.push(...manipulationWarnings);
        }
      }

      // Sort opportunities by score
      intelligence.opportunities.sort((a, b) => b.score - a.score);

    } catch (error) {
      console.error('Error gathering market intelligence:', error);
    }

    this.lastScanTimestamp = Date.now();
    return intelligence;
  }

  /**
   * Discover new token launches
   */
  async discoverNewTokens(params: TokenDiscoveryParams): Promise<TrendingToken[]> {
    const results: TrendingToken[] = [];
    
    try {
      // Search for new pairs (this would need proper API support)
      // For now, we'll use boosted tokens as a proxy
      const boosts = await this.client.getLatestTokenBoosts();
      
      for (const boost of boosts) {
        if (params.chains && !params.chains.includes(boost.chainId as ChainId)) {
          continue;
        }

        const pairs = await this.client.getPairsByTokens([boost.tokenAddress]);
        
        for (const pair of pairs) {
          // Apply filters
          if (params.minLiquidity && (!pair.liquidity?.usd || pair.liquidity.usd < params.minLiquidity)) {
            continue;
          }
          if (params.minVolume && pair.volume.h24 < params.minVolume) {
            continue;
          }
          if (params.maxAgeHours && pair.pairCreatedAt) {
            const ageHours = (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60);
            if (ageHours > params.maxAgeHours) {
              continue;
            }
          }

          // Score the token
          const score = this.scoreTrendingToken(pair);
          const reasons = this.generateTrendingReasons(pair);

          results.push({
            pair,
            score,
            reasons,
          });
        }
      }

      // Sort by score or specified field
      results.sort((a, b) => {
        switch (params.sortBy) {
          case 'liquidity':
            return (b.pair.liquidity?.usd || 0) - (a.pair.liquidity?.usd || 0);
          case 'volume':
            return b.pair.volume.h24 - a.pair.volume.h24;
          case 'priceChange':
            return b.pair.priceChange.h24 - a.pair.priceChange.h24;
          case 'age':
            return (b.pair.pairCreatedAt || 0) - (a.pair.pairCreatedAt || 0);
          default:
            return b.score - a.score;
        }
      });

    } catch (error) {
      console.error('Error discovering new tokens:', error);
    }

    return results;
  }

  /**
   * Cross-validate DEXScreener data with TheWarden's own pool data
   */
  async crossValidate(
    wardenPoolData: { address: string; chain: string; reserves: [bigint, bigint] }
  ): Promise<{
    isValid: boolean;
    discrepancy?: number;
    recommendation: string;
  }> {
    try {
      const dexPair = await this.client.getPairByAddress(
        wardenPoolData.chain as ChainId,
        wardenPoolData.address
      );

      if (!dexPair) {
        return {
          isValid: false,
          recommendation: 'Pair not found on DEXScreener - use with caution',
        };
      }

      // Compare liquidity (basic validation)
      // This would need more sophisticated comparison in production
      const dexLiquidity = dexPair.liquidity?.usd || 0;
      const discrepancy = Math.abs(dexLiquidity - 0); // Placeholder - would need actual comparison

      return {
        isValid: true,
        discrepancy,
        recommendation: discrepancy < 0.05 ? 
          'Data matches - safe to proceed' :
          'Significant discrepancy detected - investigate further',
      };
    } catch (error) {
      return {
        isValid: false,
        recommendation: 'Error validating - proceed with caution',
      };
    }
  }

  /**
   * Score an opportunity based on multiple factors
   */
  private scoreOpportunity(pair: DexPair, safetyScore: number): number {
    let score = 0;

    // Safety component (40% weight)
    score += (safetyScore / 100) * 40;

    // Liquidity component (25% weight)
    if (pair.liquidity?.usd) {
      const liquidityScore = Math.min(pair.liquidity.usd / 100000, 1); // Max at $100k
      score += liquidityScore * 25;
    }

    // Volume component (20% weight)
    const volumeScore = Math.min(pair.volume.h24 / 50000, 1); // Max at $50k
    score += volumeScore * 20;

    // Activity component (15% weight)
    const txCount = pair.txns.h24.buys + pair.txns.h24.sells;
    const activityScore = Math.min(txCount / 1000, 1); // Max at 1000 txns
    score += activityScore * 15;

    return Math.round(score);
  }

  /**
   * Generate human-readable opportunity reason
   */
  private generateOpportunityReason(pair: DexPair, safetyScore: number): string {
    const reasons: string[] = [];

    if (safetyScore >= 80) reasons.push('High safety score');
    if (pair.liquidity?.usd && pair.liquidity.usd > 50000) reasons.push('Strong liquidity');
    if (pair.volume.h24 > 25000) reasons.push('High volume');
    if (pair.priceChange.h24 > 10 && pair.priceChange.h24 < 50) reasons.push('Positive momentum');
    if (pair.boosts?.active && pair.boosts.active > 0) reasons.push('Active community');

    return reasons.join(', ') || 'Standard opportunity';
  }

  /**
   * Score a trending token
   */
  private scoreTrendingToken(pair: DexPair): number {
    let score = 50; // Base score

    // Recent price momentum
    if (pair.priceChange.h24 > 20) score += 20;
    else if (pair.priceChange.h24 > 10) score += 10;

    // Volume trend
    if (pair.volume.h1 > pair.volume.h6 / 6) score += 10; // Accelerating
    if (pair.volume.h24 > 10000) score += 10;

    // Transaction momentum
    if (pair.txns.h1.buys > pair.txns.h1.sells) score += 5;
    if (pair.txns.m5.buys > pair.txns.m5.sells) score += 5;

    // Community indicators
    if (pair.boosts?.active) score += 10;
    if (pair.info?.socials?.length) score += 5;

    return Math.min(100, score);
  }

  /**
   * Generate trending reasons
   */
  private generateTrendingReasons(pair: DexPair): string[] {
    const reasons: string[] = [];

    if (pair.priceChange.h24 > 20) reasons.push('Strong 24h price increase');
    if (pair.volume.h1 > pair.volume.h6 / 6) reasons.push('Accelerating volume');
    if (pair.txns.h1.buys > pair.txns.h1.sells) reasons.push('Buy pressure');
    if (pair.boosts?.active) reasons.push('Community boosted');
    if (pair.pairCreatedAt && (Date.now() - pair.pairCreatedAt) < 3600000) {
      reasons.push('Fresh launch');
    }

    return reasons;
  }

  /**
   * Detect potential price manipulation patterns
   */
  private detectManipulation(pair: DexPair): Array<MarketIntelligence['warnings'][0]> {
    const warnings: Array<MarketIntelligence['warnings'][0]> = [];

    // Wash trading detection (high volume, low unique transactions)
    if (pair.volume.h24 > 50000 && (pair.txns.h24.buys + pair.txns.h24.sells) < 50) {
      warnings.push({
        type: 'price_manipulation',
        pairAddress: pair.pairAddress,
        severity: 'high',
        details: 'High volume with few transactions - possible wash trading',
      });
    }

    // Pump detection (extreme short-term gains)
    if (pair.priceChange.m5 > 50) {
      warnings.push({
        type: 'high_volatility',
        pairAddress: pair.pairAddress,
        severity: 'high',
        details: 'Extreme 5-minute price spike - possible pump',
      });
    }

    // Dump detection (heavy sell pressure)
    if (pair.txns.h1.sells > pair.txns.h1.buys * 3) {
      warnings.push({
        type: 'high_volatility',
        pairAddress: pair.pairAddress,
        severity: 'medium',
        details: 'Heavy sell pressure detected',
      });
    }

    return warnings;
  }

  /**
   * Get statistics about the analyzer's knowledge
   */
  getStats(): {
    knownPairs: number;
    lastScanTimestamp: number;
    timeSinceLastScan: number;
  } {
    return {
      knownPairs: this.knownPairs.size,
      lastScanTimestamp: this.lastScanTimestamp,
      timeSinceLastScan: Date.now() - this.lastScanTimestamp,
    };
  }

  /**
   * Clear known pairs cache
   */
  clearCache(): void {
    this.knownPairs.clear();
  }
}

export default DexScreenerIntelligenceAnalyzer;
