/**
 * CrossChainScanner - Continuously scan for price differences across chains
 * 
 * Monitors token prices across all chains in parallel and identifies arbitrage opportunities
 */

import { ChainProviderManager } from './ChainProviderManager';
import { EVMAdapter } from './adapters/EVMAdapter';
import { SolanaAdapter } from './adapters/SolanaAdapter';
import { ChainAdapter, TokenPrice } from './adapters/ChainAdapter';
import { ScannerConfig } from '../config/cross-chain.config';

export interface PriceDiscrepancy {
  token: string;
  chainA: number | string;
  chainB: number | string;
  priceA: number;
  priceB: number;
  discrepancy: number; // Percentage difference
  timestamp: number;
  isProfitable: boolean;
}

export interface ScanResult {
  discrepancies: PriceDiscrepancy[];
  scanTime: number;
  chainsScanned: number;
  tokensScanned: number;
}

export class CrossChainScanner {
  private providerManager: ChainProviderManager;
  private adapters: Map<number | string, ChainAdapter>;
  private config: ScannerConfig;
  private isScanning: boolean;
  private scanInterval?: NodeJS.Timeout;
  private tokenList: string[];
  private lastScanResults: ScanResult | null;

  constructor(
    providerManager: ChainProviderManager,
    config: ScannerConfig,
    tokenList: string[] = []
  ) {
    this.providerManager = providerManager;
    this.config = config;
    this.adapters = new Map();
    this.isScanning = false;
    this.tokenList = tokenList;
    this.lastScanResults = null;
    this.initializeAdapters();
  }

  /**
   * Initialize adapters for all active chains
   */
  private initializeAdapters(): void {
    const activeChains = this.providerManager.getAllActiveChains();

    for (const chainId of activeChains) {
      try {
        if (typeof chainId === 'number') {
          // EVM chain
          const provider = this.providerManager.getProvider(chainId);
          if (provider) {
            this.adapters.set(chainId, new EVMAdapter(chainId, provider));
          }
        } else {
          // Solana
          const connection = this.providerManager.getSolanaConnection();
          if (connection) {
            this.adapters.set(chainId, new SolanaAdapter(connection));
          }
        }
      } catch (error) {
        console.warn(`Failed to initialize adapter for chain ${chainId}:`, error);
      }
    }
  }

  /**
   * Start continuous scanning
   */
  startScanning(): void {
    if (this.isScanning) {
      console.warn('Scanner already running');
      return;
    }

    this.isScanning = true;
    console.log('Starting cross-chain price scanner...');

    // Run initial scan
    this.scan().catch(err => console.error('Initial scan failed:', err));

    // Schedule periodic scans
    this.scanInterval = setInterval(() => {
      this.scan().catch(err => console.error('Periodic scan failed:', err));
    }, this.config.scanIntervalMs);
  }

  /**
   * Stop continuous scanning
   */
  stopScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
    }
    this.isScanning = false;
    console.log('Stopped cross-chain price scanner');
  }

  /**
   * Perform a single scan across all chains
   */
  async scan(): Promise<ScanResult> {
    const startTime = Date.now();
    const discrepancies: PriceDiscrepancy[] = [];

    try {
      // Fetch prices from all chains in parallel
      const pricesByChain = await this.fetchAllPrices();

      // Compare prices across all chain pairs
      const chainIds = Array.from(pricesByChain.keys());
      
      for (let i = 0; i < chainIds.length; i++) {
        for (let j = i + 1; j < chainIds.length; j++) {
          const chainA = chainIds[i];
          const chainB = chainIds[j];
          
          const pricesA = pricesByChain.get(chainA) || [];
          const pricesB = pricesByChain.get(chainB) || [];

          // Find matching tokens
          for (const priceA of pricesA) {
            const priceB = pricesB.find(p => this.isSameToken(p.token, priceA.token));
            
            if (priceB && priceA.priceUSD > 0 && priceB.priceUSD > 0) {
              const discrepancy = this.calculateDiscrepancy(priceA.priceUSD, priceB.priceUSD);

              if (Math.abs(discrepancy) >= this.config.priceDiscrepancyThreshold) {
                discrepancies.push({
                  token: priceA.token,
                  chainA,
                  chainB,
                  priceA: priceA.priceUSD,
                  priceB: priceB.priceUSD,
                  discrepancy,
                  timestamp: Date.now(),
                  isProfitable: await this.evaluateProfitability(
                    priceA.token,
                    chainA,
                    chainB,
                    priceA.priceUSD,
                    priceB.priceUSD
                  )
                });
              }
            }
          }
        }
      }

      const result: ScanResult = {
        discrepancies: discrepancies.sort((a, b) => Math.abs(b.discrepancy) - Math.abs(a.discrepancy)),
        scanTime: Date.now() - startTime,
        chainsScanned: chainIds.length,
        tokensScanned: this.tokenList.length
      };

      this.lastScanResults = result;
      
      if (discrepancies.length > 0) {
        console.log(`Found ${discrepancies.length} price discrepancies across ${chainIds.length} chains`);
      }

      return result;
    } catch (error) {
      console.error('Scan failed:', error);
      return {
        discrepancies: [],
        scanTime: Date.now() - startTime,
        chainsScanned: 0,
        tokensScanned: 0
      };
    }
  }

  /**
   * Fetch prices from all chains in parallel
   */
  private async fetchAllPrices(): Promise<Map<number | string, TokenPrice[]>> {
    const pricesByChain = new Map<number | string, TokenPrice[]>();

    if (this.config.parallelChainScans) {
      // Parallel scanning with concurrency limit
      const chunks = this.chunkArray(
        Array.from(this.adapters.entries()),
        this.config.maxConcurrentScans
      );

      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async ([chainId, adapter]) => {
          try {
            const prices = await adapter.getTokenPrices(this.tokenList);
            return [chainId, prices] as [number | string, TokenPrice[]];
          } catch (error) {
            console.warn(`Failed to fetch prices for chain ${chainId}:`, error);
            return [chainId, []] as [number | string, TokenPrice[]];
          }
        });

        const results = await Promise.all(chunkPromises);
        for (const [chainId, prices] of results) {
          pricesByChain.set(chainId, prices);
        }
      }
    } else {
      // Sequential scanning
      for (const [chainId, adapter] of this.adapters.entries()) {
        try {
          const prices = await adapter.getTokenPrices(this.tokenList);
          pricesByChain.set(chainId, prices);
        } catch (error) {
          console.warn(`Failed to fetch prices for chain ${chainId}:`, error);
          pricesByChain.set(chainId, []);
        }
      }
    }

    return pricesByChain;
  }

  /**
   * Calculate price discrepancy percentage
   */
  private calculateDiscrepancy(priceA: number, priceB: number): number {
    if (priceA === 0 || priceB === 0) {
      return 0;
    }
    return ((priceA - priceB) / priceB) * 100;
  }

  /**
   * Check if tokens are the same (accounting for different addresses on different chains)
   */
  private isSameToken(tokenA: string, tokenB: string): boolean {
    // Simplified - in production would have a mapping of token addresses across chains
    return tokenA.toLowerCase() === tokenB.toLowerCase();
  }

  /**
   * Evaluate if a price discrepancy is profitable after considering costs
   */
  private async evaluateProfitability(
    token: string,
    chainA: number | string,
    chainB: number | string,
    priceA: number,
    priceB: number
  ): Promise<boolean> {
    // Simplified profitability check
    // In production, would include:
    // - Bridge fees
    // - Gas costs on both chains
    // - Slippage
    // - Time value
    
    const discrepancy = Math.abs(priceA - priceB);
    const minProfitableDiscrepancy = Math.max(priceA, priceB) * 0.05; // 5% minimum
    
    return discrepancy >= minProfitableDiscrepancy;
  }

  /**
   * Chunk array for parallel processing
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Add token to watch list
   */
  addToken(tokenAddress: string): void {
    if (!this.tokenList.includes(tokenAddress)) {
      this.tokenList.push(tokenAddress);
    }
  }

  /**
   * Remove token from watch list
   */
  removeToken(tokenAddress: string): void {
    this.tokenList = this.tokenList.filter(t => t !== tokenAddress);
  }

  /**
   * Get current token watch list
   */
  getTokenList(): string[] {
    return [...this.tokenList];
  }

  /**
   * Get last scan results
   */
  getLastScanResults(): ScanResult | null {
    return this.lastScanResults;
  }

  /**
   * Get profitable opportunities from last scan
   */
  getProfitableOpportunities(): PriceDiscrepancy[] {
    if (!this.lastScanResults) {
      return [];
    }
    return this.lastScanResults.discrepancies.filter(d => d.isProfitable);
  }

  /**
   * Check if scanner is currently running
   */
  isActive(): boolean {
    return this.isScanning;
  }

  /**
   * Get scanner statistics
   */
  getStats(): {
    isScanning: boolean;
    tokensWatched: number;
    chainsMonitored: number;
    lastScanTime?: number;
    discrepanciesFound?: number;
  } {
    return {
      isScanning: this.isScanning,
      tokensWatched: this.tokenList.length,
      chainsMonitored: this.adapters.size,
      lastScanTime: this.lastScanResults?.scanTime,
      discrepanciesFound: this.lastScanResults?.discrepancies.length
    };
  }
}

export default CrossChainScanner;
