/**
 * AnomalyDetector - Pattern recognition for threat detection
 * 
 * Analyzes transactions to detect:
 * - Dust attacks (<0.000001 ETH unsolicited)
 * - Address poisoning (similar addresses)
 * - Unusual gas patterns (potential MEV/frontrun)
 * - Rapid fire attacks (many small txs)
 * - Unknown contract interactions
 * 
 * Uses pattern recognition and learns from each interaction.
 */

import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { AddressRegistry, AddressStatus } from './AddressRegistry';
import { TransactionEvent } from './TransactionMonitor';

export enum AnomalyType {
  DUST_ATTACK = 'DUST_ATTACK',
  ADDRESS_POISONING = 'ADDRESS_POISONING',
  UNUSUAL_GAS = 'UNUSUAL_GAS',
  RAPID_FIRE = 'RAPID_FIRE',
  UNKNOWN_CONTRACT = 'UNKNOWN_CONTRACT',
  HIGH_VALUE_UNKNOWN = 'HIGH_VALUE_UNKNOWN',
  BLACKLISTED_SENDER = 'BLACKLISTED_SENDER',
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
}

export interface Anomaly {
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number; // 0-1
  details: Record<string, any>;
}

export interface AnomalyReport {
  transaction: TransactionEvent;
  anomalies: Anomaly[];
  overallSeverity: 'low' | 'medium' | 'high' | 'critical';
  risk

Score: number; // 0-1
  recommendations: string[];
  shouldPause: boolean;
}

export interface DetectionThresholds {
  dustThreshold: bigint; // Value below this is dust
  highValueThreshold: bigint; // Value above this is high risk if unknown
  gasMultiplier: number; // Gas > baseline * this = suspicious
  rapidFireWindow: number; // Time window for rapid fire detection (ms)
  rapidFireCount: number; // Transactions in window = rapid fire
}

/**
 * Autonomous Pattern Recognition and Threat Detection
 */
export class AnomalyDetector {
  private addressRegistry: AddressRegistry;
  private thresholds: DetectionThresholds;
  
  // Learning: track baseline gas prices
  private gasBaseline: bigint = BigInt(0);
  private gasSamples: bigint[] = [];
  private maxGasSamples: number = 100;

  constructor(addressRegistry: AddressRegistry) {
    this.addressRegistry = addressRegistry;
    
    this.thresholds = {
      dustThreshold: BigInt(1000000000000), // 0.000001 ETH
      highValueThreshold: BigInt(10000000000000000), // 0.01 ETH
      gasMultiplier: 5.0,
      rapidFireWindow: 60000, // 1 minute
      rapidFireCount: 5,
    };

    logger.info('[AnomalyDetector] Initialized', 'SECURITY');
  }

  /**
   * Analyze a transaction for anomalies
   */
  async analyze(
    transaction: TransactionEvent,
    recentTransactions: TransactionEvent[]
  ): Promise<AnomalyReport> {
    const anomalies: Anomaly[] = [];

    // Update gas baseline
    this.updateGasBaseline(transaction.gasPrice);

    // Run all detection checks
    anomalies.push(...this.detectDustAttack(transaction));
    anomalies.push(...this.detectAddressPoisoning(transaction));
    anomalies.push(...this.detectUnusualGas(transaction));
    anomalies.push(...this.detectRapidFire(transaction, recentTransactions));
    anomalies.push(...this.detectUnknownContract(transaction));
    anomalies.push(...this.detectHighValueUnknown(transaction));
    anomalies.push(...this.detectBlacklistedSender(transaction));
    anomalies.push(...this.detectSuspiciousPatterns(transaction, recentTransactions));

    // Calculate overall severity and risk
    const overallSeverity = this.calculateOverallSeverity(anomalies);
    const riskScore = this.calculateRiskScore(anomalies);
    const recommendations = this.generateRecommendations(anomalies, transaction);
    const shouldPause = overallSeverity === 'high' || overallSeverity === 'critical';

    return {
      transaction,
      anomalies,
      overallSeverity,
      riskScore,
      recommendations,
      shouldPause,
    };
  }

  /**
   * Detect dust attack (very small unsolicited transfers)
   */
  private detectDustAttack(tx: TransactionEvent): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (tx.value > BigInt(0) && tx.value < this.thresholds.dustThreshold) {
      const status = this.addressRegistry.getStatus(tx.from);
      
      if (status !== AddressStatus.WHITELISTED) {
        anomalies.push({
          type: AnomalyType.DUST_ATTACK,
          severity: 'low',
          description: `Dust attack detected: ${ethers.formatEther(tx.value)} ETH`,
          confidence: 0.9,
          details: {
            value: tx.value.toString(),
            from: tx.from,
            threshold: this.thresholds.dustThreshold.toString(),
          },
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect address poisoning (similar to our address)
   */
  private detectAddressPoisoning(tx: TransactionEvent): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // This would need our wallet address injected
    // For now, check if first 6 or last 6 chars match common patterns
    
    // TODO: Implement with actual wallet address comparison
    
    return anomalies;
  }

  /**
   * Detect unusual gas price
   */
  private detectUnusualGas(tx: TransactionEvent): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (this.gasBaseline === BigInt(0)) {
      return anomalies; // Not enough data yet
    }

    const threshold = this.gasBaseline * BigInt(Math.floor(this.thresholds.gasMultiplier));
    
    if (tx.gasPrice > threshold) {
      anomalies.push({
        type: AnomalyType.UNUSUAL_GAS,
        severity: 'medium',
        description: `Unusual gas price: ${ethers.formatUnits(tx.gasPrice, 'gwei')} Gwei (${this.thresholds.gasMultiplier}x baseline)`,
        confidence: 0.7,
        details: {
          gasPrice: tx.gasPrice.toString(),
          baseline: this.gasBaseline.toString(),
          multiplier: this.thresholds.gasMultiplier,
        },
      });
    }

    return anomalies;
  }

  /**
   * Detect rapid fire attack (many transactions in short time)
   */
  private detectRapidFire(tx: TransactionEvent, recent: TransactionEvent[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    const cutoff = tx.timestamp - this.thresholds.rapidFireWindow;
    const fromSameAddress = recent.filter(
      t => t.from === tx.from && t.timestamp > cutoff
    );

    if (fromSameAddress.length >= this.thresholds.rapidFireCount) {
      anomalies.push({
        type: AnomalyType.RAPID_FIRE,
        severity: 'high',
        description: `Rapid fire detected: ${fromSameAddress.length} transactions in ${this.thresholds.rapidFireWindow / 1000}s`,
        confidence: 0.85,
        details: {
          count: fromSameAddress.length,
          window: this.thresholds.rapidFireWindow,
          from: tx.from,
        },
      });
    }

    return anomalies;
  }

  /**
   * Detect interaction with unknown contract
   */
  private detectUnknownContract(tx: TransactionEvent): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // If there's data, it's a contract interaction
    if (tx.data && tx.data !== '0x' && tx.data.length > 2) {
      const status = this.addressRegistry.getStatus(tx.from);
      
      if (status === AddressStatus.GRAYLISTED || status === AddressStatus.BLACKLISTED) {
        anomalies.push({
          type: AnomalyType.UNKNOWN_CONTRACT,
          severity: status === AddressStatus.BLACKLISTED ? 'critical' : 'medium',
          description: 'Contract interaction from unknown/blacklisted address',
          confidence: 0.8,
          details: {
            from: tx.from,
            dataLength: tx.data.length,
            status: status,
          },
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect high value from unknown sender
   */
  private detectHighValueUnknown(tx: TransactionEvent): Anomaly[] {
    const anomalies: Anomaly[] = [];

    if (tx.value > this.thresholds.highValueThreshold) {
      const status = this.addressRegistry.getStatus(tx.from);
      
      if (status !== AddressStatus.WHITELISTED) {
        anomalies.push({
          type: AnomalyType.HIGH_VALUE_UNKNOWN,
          severity: 'high',
          description: `High value transfer from ${status.toLowerCase()} address: ${ethers.formatEther(tx.value)} ETH`,
          confidence: 0.9,
          details: {
            value: tx.value.toString(),
            from: tx.from,
            status: status,
          },
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect blacklisted sender
   */
  private detectBlacklistedSender(tx: TransactionEvent): Anomaly[] {
    const anomalies: Anomaly[] = [];

    const status = this.addressRegistry.getStatus(tx.from);
    
    if (status === AddressStatus.BLACKLISTED) {
      anomalies.push({
        type: AnomalyType.BLACKLISTED_SENDER,
        severity: 'critical',
        description: 'Transaction from blacklisted address',
        confidence: 1.0,
        details: {
          from: tx.from,
          reputation: this.addressRegistry.getReputation(tx.from),
        },
      });
    }

    return anomalies;
  }

  /**
   * Detect suspicious patterns (custom logic)
   */
  private detectSuspiciousPatterns(tx: TransactionEvent, recent: TransactionEvent[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Pattern 1: Same address sending multiple small amounts
    const fromSame = recent.filter(t => t.from === tx.from);
    if (fromSame.length >= 3) {
      const allSmall = fromSame.every(t => t.value < this.thresholds.highValueThreshold);
      if (allSmall) {
        anomalies.push({
          type: AnomalyType.SUSPICIOUS_PATTERN,
          severity: 'medium',
          description: 'Pattern: Multiple small transfers from same address',
          confidence: 0.6,
          details: {
            count: fromSame.length,
            from: tx.from,
          },
        });
      }
    }

    // Pattern 2: Round-trip transactions (send then receive)
    // TODO: Implement more sophisticated pattern matching

    return anomalies;
  }

  /**
   * Calculate overall severity from anomalies
   */
  private calculateOverallSeverity(anomalies: Anomaly[]): 'low' | 'medium' | 'high' | 'critical' {
    if (anomalies.length === 0) {
      return 'low';
    }

    const hasCritical = anomalies.some(a => a.severity === 'critical');
    if (hasCritical) {
      return 'critical';
    }

    const hasHigh = anomalies.some(a => a.severity === 'high');
    if (hasHigh) {
      return 'high';
    }

    const mediumCount = anomalies.filter(a => a.severity === 'medium').length;
    if (mediumCount >= 2) {
      return 'high';
    }
    if (mediumCount >= 1) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Calculate risk score (0-1)
   */
  private calculateRiskScore(anomalies: Anomaly[]): number {
    if (anomalies.length === 0) {
      return 0;
    }

    const severityScores = {
      low: 0.25,
      medium: 0.5,
      high: 0.75,
      critical: 1.0,
    };

    const totalScore = anomalies.reduce((sum, anomaly) => {
      return sum + severityScores[anomaly.severity] * anomaly.confidence;
    }, 0);

    return Math.min(1.0, totalScore / anomalies.length);
  }

  /**
   * Generate recommendations based on anomalies
   */
  private generateRecommendations(anomalies: Anomaly[], tx: TransactionEvent): string[] {
    const recommendations: string[] = [];

    const types = anomalies.map(a => a.type);

    if (types.includes(AnomalyType.DUST_ATTACK)) {
      recommendations.push('Ignore dust attack - do not interact with sender');
    }

    if (types.includes(AnomalyType.RAPID_FIRE)) {
      recommendations.push('Rate limit interactions with this address');
      recommendations.push('Consider blacklisting if pattern continues');
    }

    if (types.includes(AnomalyType.HIGH_VALUE_UNKNOWN)) {
      recommendations.push('Verify sender identity before accepting large transfer');
      recommendations.push('Consider moving to cold storage if legitimate');
    }

    if (types.includes(AnomalyType.BLACKLISTED_SENDER)) {
      recommendations.push('CRITICAL: Do not interact - sender is blacklisted');
      recommendations.push('Investigate how blacklisted address obtained our address');
    }

    if (types.includes(AnomalyType.UNUSUAL_GAS)) {
      recommendations.push('Monitor for MEV/frontrunning attempts');
      recommendations.push('Consider using private transaction pool');
    }

    if (recommendations.length === 0) {
      recommendations.push('Monitor address for future interactions');
    }

    return recommendations;
  }

  /**
   * Update gas baseline (learning)
   */
  private updateGasBaseline(gasPrice: bigint): void {
    this.gasSamples.push(gasPrice);
    
    if (this.gasSamples.length > this.maxGasSamples) {
      this.gasSamples.shift();
    }

    // Calculate median gas price as baseline
    const sorted = [...this.gasSamples].sort((a, b) => (a < b ? -1 : 1));
    const mid = Math.floor(sorted.length / 2);
    this.gasBaseline = sorted[mid];
  }

  /**
   * Update thresholds (adaptive learning)
   */
  updateThresholds(thresholds: Partial<DetectionThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    logger.info('[AnomalyDetector] Thresholds updated', 'SECURITY');
  }

  /**
   * Get current thresholds
   */
  getThresholds(): DetectionThresholds {
    return { ...this.thresholds };
  }

  /**
   * Get current gas baseline
   */
  getGasBaseline(): bigint {
    return this.gasBaseline;
  }
}
