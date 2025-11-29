/**
 * AdversarialIntelligenceFeed - Real-World Threat Learning
 *
 * Phase 3+: Advanced Security Intelligence
 *
 * This component learns from real-world adversarial attacks by ingesting
 * threat intelligence data from external sources. The insight is that
 * actual cyber attacks provide "free training data" from real adversaries.
 *
 * Key insight from user: "It's like free training from real adversaries
 * attacking the network" - referencing live cybersecurity threat maps.
 *
 * Core capabilities:
 * - Ingest threat intelligence from multiple sources
 * - Extract attack patterns and signatures from real attacks
 * - Correlate external threats with internal system behavior
 * - Proactive defense posture based on live threat landscape
 * - Transfer learning from observed attack patterns
 *
 * Integration with TheWarden/AEV:
 * - Feeds SecurityPatternLearner with real-world attack patterns
 * - Enhances ThreatResponseEngine with proactive rules
 * - Updates MEVAttackFuzzer scenarios with actual attack vectors
 * - Informs ArbitrageConsciousness of emerging threats
 */

import { EventEmitter } from 'events';
import { ThreatType, ThreatIntelligence, SecurityPattern } from './types';

/**
 * External threat feed source configuration
 */
interface ThreatFeedSource {
  sourceId: string;
  name: string;
  type: 'api' | 'webhook' | 'stream' | 'manual';
  url?: string;
  apiKey?: string;
  updateInterval?: number; // ms
  enabled: boolean;
  trustLevel: number; // 0-1 confidence in source accuracy
  lastFetch?: number;
  fetchCount: number;
  errorCount: number;
}

/**
 * Observed attack pattern from real-world data
 */
interface ObservedAttackPattern {
  patternId: string;
  firstObserved: number;
  lastObserved: number;
  observationCount: number;

  // Attack classification
  attackType: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sophistication: 'basic' | 'intermediate' | 'advanced' | 'apt';

  // Attack characteristics
  characteristics: {
    // Geographic data
    originCountries?: string[];
    targetRegions?: string[];

    // Temporal patterns
    peakHours?: number[]; // UTC hours when attacks peak
    peakDays?: number[]; // Day of week (0-6)

    // Technical indicators
    commonPorts?: number[];
    protocols?: string[];
    payloadPatterns?: string[];

    // Blockchain-specific
    targetChains?: number[];
    targetProtocols?: string[];
    targetFunctions?: string[];
    gasPatterns?: {
      avgGasPrice?: bigint;
      priorityFeeRange?: [number, number];
    };

    // MEV-specific
    flashLoanProviders?: string[];
    sandwichPatterns?: string[];
    frontrunningSignatures?: string[];
  };

  // Attack vectors
  attackVectors: string[];

  // Known indicators
  indicators: {
    maliciousIPs: Set<string>;
    maliciousAddresses: Set<string>;
    maliciousTxPatterns: string[];
    maliciousContracts: Set<string>;
  };

  // Defense recommendations
  recommendedDefenses: string[];

  // Risk assessment
  riskScore: number;
  prevalence: number; // How common is this attack type (0-1)

  // Source attribution
  sources: string[];
}

/**
 * Aggregated threat landscape
 */
interface ThreatLandscape {
  lastUpdated: number;
  totalObservations: number;
  activeThreatCount: number;

  // Threat distribution
  threatsByType: Map<ThreatType, number>;
  threatsBySeverity: Map<string, number>;

  // Trending threats (increasing in frequency)
  trendingThreats: Array<{
    threatType: ThreatType;
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
  }>;

  // Geographic hotspots
  topAttackOrigins: Array<{ country: string; count: number }>;

  // Active campaigns
  activeCampaigns: Array<{
    campaignId: string;
    threatType: ThreatType;
    targetSector: string;
    estimatedActors: number;
    startDate: number;
  }>;
}

/**
 * Configuration for AdversarialIntelligenceFeed
 */
interface AdversarialIntelligenceConfig {
  enableRealTimeIngestion: boolean;
  defaultUpdateInterval: number; // ms
  maxPatternsRetained: number;
  patternExpiryDays: number;
  minObservationsForPattern: number;
  enableAutoDefenseUpdate: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * AdversarialIntelligenceFeed - Learn from Real Adversaries
 *
 * Converts live threat data into training data for defense systems
 */
export class AdversarialIntelligenceFeed extends EventEmitter {
  private config: AdversarialIntelligenceConfig;
  private sources: Map<string, ThreatFeedSource> = new Map();
  private patterns: Map<string, ObservedAttackPattern> = new Map();
  private rawIntelligence: ThreatIntelligence[] = [];
  private landscape: ThreatLandscape;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  // Learning metrics
  private metrics = {
    totalIntelligenceIngested: 0,
    patternsLearned: 0,
    defensesGenerated: 0,
    lastIngestionTime: 0,
    ingestionRate: 0, // per hour
  };

  constructor(config?: Partial<AdversarialIntelligenceConfig>) {
    super();

    this.config = {
      enableRealTimeIngestion: config?.enableRealTimeIngestion ?? true,
      defaultUpdateInterval: config?.defaultUpdateInterval ?? 300000, // 5 minutes
      maxPatternsRetained: config?.maxPatternsRetained ?? 10000,
      patternExpiryDays: config?.patternExpiryDays ?? 30,
      minObservationsForPattern: config?.minObservationsForPattern ?? 3,
      enableAutoDefenseUpdate: config?.enableAutoDefenseUpdate ?? true,
      logLevel: config?.logLevel ?? 'info',
    };

    this.landscape = this.initializeLandscape();

    this.log('info', 'AdversarialIntelligenceFeed initialized');
    this.log('info', 'Real-time ingestion:', this.config.enableRealTimeIngestion);
  }

  /**
   * Initialize empty threat landscape
   */
  private initializeLandscape(): ThreatLandscape {
    return {
      lastUpdated: Date.now(),
      totalObservations: 0,
      activeThreatCount: 0,
      threatsByType: new Map(),
      threatsBySeverity: new Map(),
      trendingThreats: [],
      topAttackOrigins: [],
      activeCampaigns: [],
    };
  }

  /**
   * Register a threat intelligence source
   */
  registerSource(source: Omit<ThreatFeedSource, 'fetchCount' | 'errorCount'>): void {
    const fullSource: ThreatFeedSource = {
      ...source,
      fetchCount: 0,
      errorCount: 0,
    };

    this.sources.set(source.sourceId, fullSource);
    this.log('info', `Registered threat source: ${source.name} (${source.type})`);

    this.emit('sourceRegistered', { sourceId: source.sourceId, name: source.name });
  }

  /**
   * Start ingesting threat intelligence
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('warn', 'AdversarialIntelligenceFeed already running');
      return;
    }

    this.isRunning = true;
    this.log('info', 'Starting threat intelligence ingestion...');

    // Set up periodic fetches for each source
    for (const [sourceId, source] of this.sources.entries()) {
      if (!source.enabled) continue;

      if (source.type === 'api' || source.type === 'stream') {
        const interval = source.updateInterval ?? this.config.defaultUpdateInterval;

        // Initial fetch
        await this.fetchFromSource(sourceId);

        // Set up periodic fetch
        const intervalId = setInterval(() => {
          this.fetchFromSource(sourceId);
        }, interval);

        this.updateIntervals.set(sourceId, intervalId);
      }
    }

    this.emit('started');
    this.log('info', `Started with ${this.sources.size} sources`);
  }

  /**
   * Stop ingesting threat intelligence
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Clear all intervals
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();

    this.emit('stopped');
    this.log('info', 'Stopped threat intelligence ingestion');
  }

  /**
   * Fetch intelligence from a specific source
   */
  private async fetchFromSource(sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) return;

    try {
      this.log('debug', `Fetching from source: ${source.name}`);

      // In production, this would make actual API calls
      // For now, we'll emit an event for external integration
      this.emit('fetchRequested', {
        sourceId,
        sourceName: source.name,
        sourceType: source.type,
        url: source.url,
      });

      source.fetchCount++;
      source.lastFetch = Date.now();
    } catch (error) {
      source.errorCount++;
      this.log('error', `Error fetching from ${source.name}:`, error);
      this.emit('fetchError', { sourceId, error });
    }
  }

  /**
   * Ingest threat intelligence data
   *
   * Primary integration point - called when threat data is received
   * This is where "free training from real adversaries" happens
   */
  async ingestIntelligence(intelligence: ThreatIntelligence, sourceId?: string): Promise<void> {
    this.log('debug', `Ingesting intelligence: ${intelligence.entryId}`);

    // Store raw intelligence
    this.rawIntelligence.push(intelligence);
    if (this.rawIntelligence.length > this.config.maxPatternsRetained * 10) {
      this.rawIntelligence = this.rawIntelligence.slice(-this.config.maxPatternsRetained * 5);
    }

    // Extract and update patterns
    await this.extractPatterns(intelligence, sourceId);

    // Update threat landscape
    this.updateLandscape(intelligence);

    // Update metrics
    this.metrics.totalIntelligenceIngested++;
    this.metrics.lastIngestionTime = Date.now();

    this.emit('intelligenceIngested', {
      entryId: intelligence.entryId,
      threatType: intelligence.threatType,
      severity: intelligence.severity,
    });

    // Auto-generate defenses if enabled
    if (this.config.enableAutoDefenseUpdate) {
      await this.generateDefenseRecommendations(intelligence);
    }
  }

  /**
   * Ingest bulk threat data (e.g., from live threat map feeds)
   */
  async ingestBulk(
    intelligenceArray: ThreatIntelligence[],
    sourceId?: string
  ): Promise<{ ingested: number; patterns: number }> {
    this.log('info', `Bulk ingesting ${intelligenceArray.length} intelligence entries`);

    const startPatterns = this.patterns.size;

    for (const intel of intelligenceArray) {
      await this.ingestIntelligence(intel, sourceId);
    }

    const newPatterns = this.patterns.size - startPatterns;

    this.emit('bulkIngestionComplete', {
      ingested: intelligenceArray.length,
      newPatterns,
      totalPatterns: this.patterns.size,
    });

    return {
      ingested: intelligenceArray.length,
      patterns: newPatterns,
    };
  }

  /**
   * Extract attack patterns from intelligence
   *
   * This is where we learn from real adversaries
   */
  private async extractPatterns(
    intelligence: ThreatIntelligence,
    sourceId?: string
  ): Promise<void> {
    const patternId = `pattern_${intelligence.threatType}_${this.hashIndicators(intelligence.iocs)}`;

    let pattern = this.patterns.get(patternId);

    if (pattern) {
      // Update existing pattern
      pattern.observationCount++;
      pattern.lastObserved = intelligence.timestamp;

      // Update indicators
      intelligence.iocs.ips?.forEach((ip) => pattern!.indicators.maliciousIPs.add(ip));
      intelligence.iocs.addresses?.forEach((addr) =>
        pattern!.indicators.maliciousAddresses.add(addr.toLowerCase())
      );

      // Recalculate risk score based on frequency
      pattern.riskScore = this.calculatePatternRisk(pattern);
      pattern.prevalence = Math.min(1.0, pattern.observationCount / 100);

      if (sourceId && !pattern.sources.includes(sourceId)) {
        pattern.sources.push(sourceId);
      }
    } else {
      // Create new pattern from observed attack
      pattern = this.createPatternFromIntelligence(intelligence, sourceId);
      this.patterns.set(patternId, pattern);

      this.metrics.patternsLearned++;

      this.emit('newPatternLearned', {
        patternId,
        attackType: pattern.attackType,
        sophistication: pattern.sophistication,
      });
    }

    // Prune old patterns
    this.pruneExpiredPatterns();
  }

  /**
   * Create a new pattern from intelligence
   */
  private createPatternFromIntelligence(
    intel: ThreatIntelligence,
    sourceId?: string
  ): ObservedAttackPattern {
    const hour = new Date(intel.timestamp).getUTCHours();
    const day = new Date(intel.timestamp).getUTCDay();

    return {
      patternId: `pattern_${intel.threatType}_${Date.now()}`,
      firstObserved: intel.timestamp,
      lastObserved: intel.timestamp,
      observationCount: 1,

      attackType: intel.threatType,
      severity: intel.severity,
      sophistication: this.inferSophistication(intel),

      characteristics: {
        peakHours: [hour],
        peakDays: [day],
        commonPorts: [],
        protocols: [],
        payloadPatterns: intel.iocs.signatures ?? [],
        targetChains: [],
        targetProtocols: [],
        targetFunctions: [],
      },

      attackVectors: this.inferAttackVectors(intel),

      indicators: {
        maliciousIPs: new Set(intel.iocs.ips ?? []),
        maliciousAddresses: new Set((intel.iocs.addresses ?? []).map((a) => a.toLowerCase())),
        maliciousTxPatterns: intel.iocs.txHashes ?? [],
        maliciousContracts: new Set(),
      },

      recommendedDefenses: intel.suggestedMitigations,
      riskScore: this.severityToScore(intel.severity) * intel.confidence,
      prevalence: 0.01, // Initial low prevalence

      sources: sourceId ? [sourceId] : [intel.source],
    };
  }

  /**
   * Infer attack sophistication from intelligence
   */
  private inferSophistication(
    intel: ThreatIntelligence
  ): 'basic' | 'intermediate' | 'advanced' | 'apt' {
    const indicators = intel.iocs;
    const indicatorCount =
      (indicators.ips?.length ?? 0) +
      (indicators.addresses?.length ?? 0) +
      (indicators.signatures?.length ?? 0);

    // APT indicators
    if (intel.severity === 'critical' && indicatorCount > 10 && intel.confidence > 0.9) {
      return 'apt';
    }

    // Advanced attack indicators - critical severity OR high with many indicators
    if (intel.severity === 'critical' || (intel.severity === 'high' && indicatorCount > 5)) {
      return 'advanced';
    }

    // Intermediate
    if (indicatorCount > 2 || intel.severity === 'medium' || intel.severity === 'high') {
      return 'intermediate';
    }

    return 'basic';
  }

  /**
   * Infer attack vectors from threat type
   */
  private inferAttackVectors(intel: ThreatIntelligence): string[] {
    const vectorMap: Partial<Record<ThreatType, string[]>> = {
      flash_loan_attack: ['flash_loan', 'smart_contract', 'liquidity_manipulation'],
      frontrun_attempt: ['mempool_monitoring', 'transaction_ordering', 'gas_manipulation'],
      sandwich_attack: ['mempool_monitoring', 'transaction_ordering', 'price_manipulation'],
      reentrancy_attempt: ['callback_exploit', 'state_manipulation', 'recursive_call'],
      price_manipulation: ['oracle_manipulation', 'liquidity_attack', 'wash_trading'],
      unauthorized_access: ['credential_theft', 'session_hijacking', 'privilege_escalation'],
      brute_force: ['password_guessing', 'credential_stuffing', 'dictionary_attack'],
      injection_attempt: ['sql_injection', 'command_injection', 'xss'],
      data_exfiltration: ['data_theft', 'insider_threat', 'api_abuse'],
      mev_attack: ['transaction_reordering', 'block_manipulation', 'sequencer_exploit'],
    };

    return vectorMap[intel.threatType] ?? ['unknown_vector'];
  }

  /**
   * Calculate pattern risk score
   */
  private calculatePatternRisk(pattern: ObservedAttackPattern): number {
    let score = 0;

    // Severity base
    score += this.severityToScore(pattern.severity) * 0.3;

    // Frequency factor
    const frequencyScore = Math.min(1.0, pattern.observationCount / 50);
    score += frequencyScore * 0.3;

    // Sophistication factor
    const sophMap = { basic: 0.2, intermediate: 0.4, advanced: 0.7, apt: 1.0 };
    score += sophMap[pattern.sophistication] * 0.2;

    // Recency factor (more recent = higher risk)
    const daysSinceLastSeen = (Date.now() - pattern.lastObserved) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceLastSeen / 30);
    score += recencyScore * 0.2;

    return Math.min(1.0, score);
  }

  /**
   * Update threat landscape with new intelligence
   */
  private updateLandscape(intel: ThreatIntelligence): void {
    this.landscape.lastUpdated = Date.now();
    this.landscape.totalObservations++;

    // Update threat type distribution
    const currentCount = this.landscape.threatsByType.get(intel.threatType) ?? 0;
    this.landscape.threatsByType.set(intel.threatType, currentCount + 1);

    // Update severity distribution
    const severityCount = this.landscape.threatsBySeverity.get(intel.severity) ?? 0;
    this.landscape.threatsBySeverity.set(intel.severity, severityCount + 1);

    // Recalculate trending threats periodically
    if (this.landscape.totalObservations % 100 === 0) {
      this.calculateTrendingThreats();
    }
  }

  /**
   * Calculate trending threats
   */
  private calculateTrendingThreats(): void {
    const now = Date.now();
    const recentWindow = 24 * 60 * 60 * 1000; // 24 hours
    const olderWindow = 7 * 24 * 60 * 60 * 1000; // 7 days

    const recentCounts = new Map<ThreatType, number>();
    const olderCounts = new Map<ThreatType, number>();

    for (const intel of this.rawIntelligence) {
      const age = now - intel.timestamp;

      if (age < recentWindow) {
        const count = recentCounts.get(intel.threatType) ?? 0;
        recentCounts.set(intel.threatType, count + 1);
      } else if (age < olderWindow) {
        const count = olderCounts.get(intel.threatType) ?? 0;
        olderCounts.set(intel.threatType, count + 1);
      }
    }

    // Calculate trends
    const trends: ThreatLandscape['trendingThreats'] = [];

    for (const [threatType, recentCount] of recentCounts.entries()) {
      const olderCount = olderCounts.get(threatType) ?? 0;
      const normalizedOlder = olderCount / 7; // Average per day

      let trend: 'increasing' | 'decreasing' | 'stable';
      let changePercent = 0;

      if (normalizedOlder === 0) {
        trend = recentCount > 0 ? 'increasing' : 'stable';
        changePercent = 100;
      } else {
        changePercent = ((recentCount - normalizedOlder) / normalizedOlder) * 100;

        if (changePercent > 20) {
          trend = 'increasing';
        } else if (changePercent < -20) {
          trend = 'decreasing';
        } else {
          trend = 'stable';
        }
      }

      trends.push({ threatType, trend, changePercent });
    }

    // Sort by increasing trends first
    this.landscape.trendingThreats = trends
      .sort((a, b) => {
        if (a.trend === 'increasing' && b.trend !== 'increasing') return -1;
        if (b.trend === 'increasing' && a.trend !== 'increasing') return 1;
        return b.changePercent - a.changePercent;
      })
      .slice(0, 10);
  }

  /**
   * Generate defense recommendations based on observed patterns
   */
  private async generateDefenseRecommendations(intel: ThreatIntelligence): Promise<void> {
    const pattern = Array.from(this.patterns.values()).find(
      (p) =>
        p.attackType === intel.threatType &&
        p.observationCount >= this.config.minObservationsForPattern
    );

    if (pattern) {
      this.metrics.defensesGenerated++;

      this.emit('defenseRecommendation', {
        threatType: intel.threatType,
        pattern: {
          observationCount: pattern.observationCount,
          sophistication: pattern.sophistication,
          riskScore: pattern.riskScore,
        },
        recommendations: pattern.recommendedDefenses,
        indicators: {
          maliciousIPCount: pattern.indicators.maliciousIPs.size,
          maliciousAddressCount: pattern.indicators.maliciousAddresses.size,
        },
      });
    }
  }

  /**
   * Export learned patterns for SecurityPatternLearner integration
   */
  exportAsSecurityPatterns(): SecurityPattern[] {
    const patterns: SecurityPattern[] = [];

    for (const observedPattern of this.patterns.values()) {
      if (observedPattern.observationCount < this.config.minObservationsForPattern) {
        continue;
      }

      patterns.push({
        patternId: observedPattern.patternId,
        detectedAt: observedPattern.firstObserved,
        type: 'attack_pattern',
        description: `Real-world ${observedPattern.attackType} attack pattern (${observedPattern.sophistication} sophistication) observed ${observedPattern.observationCount} times`,
        occurrences: observedPattern.observationCount,
        firstSeen: observedPattern.firstObserved,
        lastSeen: observedPattern.lastObserved,
        characteristics: {
          sophistication: observedPattern.sophistication,
          severity: observedPattern.severity,
          attackVectors: observedPattern.attackVectors,
          peakHours: observedPattern.characteristics.peakHours,
          peakDays: observedPattern.characteristics.peakDays,
          knownMaliciousIPs: Array.from(observedPattern.indicators.maliciousIPs).slice(0, 100),
          knownMaliciousAddresses: Array.from(observedPattern.indicators.maliciousAddresses).slice(
            0,
            100
          ),
          sourceCount: observedPattern.sources.length,
        },
        associatedThreats: [observedPattern.attackType],
        riskScore: observedPattern.riskScore,
      });
    }

    return patterns.sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Check if an IP is known malicious
   */
  isKnownMaliciousIP(ip: string): boolean {
    for (const pattern of this.patterns.values()) {
      if (pattern.indicators.maliciousIPs.has(ip)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if an address is known malicious
   */
  isKnownMaliciousAddress(address: string): boolean {
    const normalizedAddress = address.toLowerCase();
    for (const pattern of this.patterns.values()) {
      if (pattern.indicators.maliciousAddresses.has(normalizedAddress)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get attack patterns by type
   */
  getPatternsByType(threatType: ThreatType): ObservedAttackPattern[] {
    return Array.from(this.patterns.values())
      .filter((p) => p.attackType === threatType)
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Get current threat landscape summary
   */
  getLandscape(): ThreatLandscape {
    return { ...this.landscape };
  }

  /**
   * Get all observed patterns
   */
  getPatterns(): ObservedAttackPattern[] {
    return Array.from(this.patterns.values()).sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Get high-priority threats requiring immediate attention
   */
  getHighPriorityThreats(): ObservedAttackPattern[] {
    return Array.from(this.patterns.values())
      .filter(
        (p) => p.riskScore >= 0.7 && p.observationCount >= this.config.minObservationsForPattern
      )
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const sourcesEnabled = Array.from(this.sources.values()).filter((s) => s.enabled).length;

    return {
      sources: {
        total: this.sources.size,
        enabled: sourcesEnabled,
      },
      intelligence: {
        totalIngested: this.metrics.totalIntelligenceIngested,
        rawEntriesRetained: this.rawIntelligence.length,
      },
      patterns: {
        total: this.patterns.size,
        learned: this.metrics.patternsLearned,
        highPriority: this.getHighPriorityThreats().length,
      },
      defenses: {
        generated: this.metrics.defensesGenerated,
      },
      landscape: {
        totalObservations: this.landscape.totalObservations,
        threatTypes: this.landscape.threatsByType.size,
        trendingThreats: this.landscape.trendingThreats.length,
      },
      isRunning: this.isRunning,
    };
  }

  // Helper methods

  private severityToScore(severity: 'low' | 'medium' | 'high' | 'critical'): number {
    const map = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    return map[severity];
  }

  private hashIndicators(iocs: ThreatIntelligence['iocs']): string {
    const str = [...(iocs.ips ?? []), ...(iocs.addresses ?? []), ...(iocs.signatures ?? [])]
      .sort()
      .join('');
    // Simple hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  private pruneExpiredPatterns(): void {
    const expiryTime = Date.now() - this.config.patternExpiryDays * 24 * 60 * 60 * 1000;

    for (const [patternId, pattern] of this.patterns.entries()) {
      if (pattern.lastObserved < expiryTime && pattern.observationCount < 10) {
        this.patterns.delete(patternId);
      }
    }

    // Also limit total patterns
    if (this.patterns.size > this.config.maxPatternsRetained) {
      const sorted = Array.from(this.patterns.entries()).sort(
        ([, a], [, b]) => b.riskScore - a.riskScore
      );

      const toKeep = sorted.slice(0, this.config.maxPatternsRetained);
      this.patterns = new Map(toKeep);
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) >= levels.indexOf(this.config.logLevel)) {
      console.log(`[AdversarialIntelligenceFeed] [${level.toUpperCase()}]`, ...args);
    }
  }
}
