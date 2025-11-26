/**
 * MEV Calculator Bridge
 *
 * Bridges TypeScript to Python MEV calculator with caching
 */

import { spawn } from 'child_process';
import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({
  name: 'MEVCalculatorBridge',
  level: process.env.LOG_LEVEL || 'info',
});

export interface MEVRiskResult {
  riskScore: number;
  estimatedLeakage: number;
  mempoolCongestion: number;
  searcherDensity: number;
}

export interface TransactionParams {
  value: number;
  gasPrice: number;
  txType: 'arbitrage' | 'liquidity_provision' | 'flash_loan' | 'front_runnable';
}

/**
 * MEVCalculatorBridge provides async interface to Python MEV calculator
 */
export class MEVCalculatorBridge {
  private redis?: Redis;
  private cacheEnabled: boolean;
  private cacheTTL: number;
  private pythonPath: string;
  private scriptPath: string;

  constructor(redis?: Redis, cacheEnabled: boolean = true, cacheTTL: number = 60) {
    this.redis = redis;
    this.cacheEnabled = cacheEnabled && !!redis;
    this.cacheTTL = cacheTTL;
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.scriptPath =
      process.env.MEV_CALCULATOR_SCRIPT ||
      '/home/runner/work/Copilot-Consciousness/Copilot-Consciousness/src/mev/profit_calculator/profit_calculator.py';
  }

  /**
   * Calculate MEV risk for a transaction
   */
  async calculateRisk(params: TransactionParams): Promise<MEVRiskResult> {
    // Check cache first
    if (this.cacheEnabled && this.redis) {
      const cached = await this.getFromCache(params);
      if (cached) {
        logger.debug('Returning cached MEV risk calculation');
        return cached;
      }
    }

    // Call Python calculator
    const result = await this.callPythonCalculator(params);

    // Cache result
    if (this.cacheEnabled && this.redis) {
      await this.saveToCache(params, result);
    }

    return result;
  }

  /**
   * Call Python MEV calculator via subprocess
   */
  private async callPythonCalculator(params: TransactionParams): Promise<MEVRiskResult> {
    return new Promise((resolve, reject) => {
      const pythonArgs = [
        this.scriptPath,
        '--value',
        params.value.toString(),
        '--gas-price',
        params.gasPrice.toString(),
        '--tx-type',
        params.txType,
        '--json',
      ];

      const pythonProcess = spawn(this.pythonPath, pythonArgs);

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          logger.error(`Python process exited with code ${code}: ${stderr}`);
          reject(new Error(`MEV calculator failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve({
            riskScore: result.risk_score || 0,
            estimatedLeakage: result.estimated_leakage || 0,
            mempoolCongestion: result.mempool_congestion || 0,
            searcherDensity: result.searcher_density || 0,
          });
        } catch (error) {
          logger.error(`Failed to parse Python output: ${error}`);
          reject(new Error(`Failed to parse MEV calculator output: ${error}`));
        }
      });

      pythonProcess.on('error', (error) => {
        logger.error(`Failed to spawn Python process: ${error}`);
        reject(error);
      });

      // Set timeout
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('MEV calculator timed out'));
      }, 10000);

      pythonProcess.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  /**
   * Get cached result
   */
  private async getFromCache(params: TransactionParams): Promise<MEVRiskResult | null> {
    if (!this.redis) return null;

    try {
      const key = this.getCacheKey(params);
      const cached = await this.redis.get(key);

      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn(`Cache read error: ${error}`);
    }

    return null;
  }

  /**
   * Save result to cache
   */
  private async saveToCache(params: TransactionParams, result: MEVRiskResult): Promise<void> {
    if (!this.redis) return;

    try {
      const key = this.getCacheKey(params);
      await this.redis.setex(key, this.cacheTTL, JSON.stringify(result));
    } catch (error) {
      logger.warn(`Cache write error: ${error}`);
    }
  }

  /**
   * Generate cache key from params
   */
  private getCacheKey(params: TransactionParams): string {
    return `mev:risk:${params.txType}:${params.value}:${params.gasPrice}`;
  }

  /**
   * Clear cache for specific params or all
   */
  async clearCache(params?: TransactionParams): Promise<void> {
    if (!this.redis) return;

    try {
      if (params) {
        const key = this.getCacheKey(params);
        await this.redis.del(key);
      } else {
        const keys = await this.redis.keys('mev:risk:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      logger.warn(`Cache clear error: ${error}`);
    }
  }

  /**
   * Warmup cache with common transaction types
   */
  async warmupCache(values: number[], gasPrices: number[]): Promise<void> {
    const txTypes: TransactionParams['txType'][] = [
      'arbitrage',
      'liquidity_provision',
      'flash_loan',
      'front_runnable',
    ];

    const promises: Promise<MEVRiskResult>[] = [];

    for (const value of values) {
      for (const gasPrice of gasPrices) {
        for (const txType of txTypes) {
          promises.push(this.calculateRisk({ value, gasPrice, txType }));
        }
      }
    }

    await Promise.all(promises);
    logger.info(`Warmed up cache with ${promises.length} calculations`);
  }
}

// Export singleton instance (can be configured later)
export const mevCalculatorBridge = new MEVCalculatorBridge();
