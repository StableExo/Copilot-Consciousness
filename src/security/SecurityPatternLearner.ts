/**
 * SecurityPatternLearner - Security Pattern Learning
 *
 * Phase 3: Enhanced Security
 *
 * This component learns from security incidents to improve threat detection
 * and suggest mitigations. It identifies patterns in attacks and vulnerabilities
 * to proactively strengthen defenses.
 *
 * Core capabilities:
 * - Pattern recognition in security incidents
 * - Incident correlation and clustering
 * - Mitigation suggestion based on historical data
 * - Vulnerability trend analysis
 *
 * Integration with TheWarden/AEV:
 * - Learns from ThreatResponseEngine incidents
 * - Suggests improvements to IntrusionDetectionService
 * - Feeds insights to SecurityManager
 * - Enhances ArbitrageConsciousness risk awareness
 */

import { EventEmitter } from 'events';
import { SecurityIncident, MitigationSuggestion, SecurityPattern, ThreatType } from './types';
// ThreatEvent, ResponseAction reserved for threat response features
import type { ThreatEvent as _ThreatEvent, ResponseAction as _ResponseAction } from './types';

interface PatternLearnerConfig {
  minOccurrencesForPattern: number;
  patternTimeWindow: number; // ms
  enableAutomaticLearning: boolean;
  suggestionConfidenceThreshold: number;
}

interface IncidentCluster {
  clusterId: string;
  threatType: ThreatType;
  incidents: string[]; // incident IDs
  pattern: SecurityPattern;
  avgSeverity: number;
  totalImpact: number;
}

/**
 * Security Pattern Learning System
 */
export class SecurityPatternLearner extends EventEmitter {
  private config: PatternLearnerConfig;
  private incidents: Map<string, SecurityIncident> = new Map();
  private patterns: Map<string, SecurityPattern> = new Map();
  private clusters: Map<string, IncidentCluster> = new Map();
  private suggestions: Map<string, MitigationSuggestion> = new Map();
  private learningCount: number = 0;

  constructor(config?: Partial<PatternLearnerConfig>) {
    super();

    this.config = {
      minOccurrencesForPattern: config?.minOccurrencesForPattern ?? 3,
      patternTimeWindow: config?.patternTimeWindow ?? 86400000, // 24 hours
      enableAutomaticLearning: config?.enableAutomaticLearning ?? true,
      suggestionConfidenceThreshold: config?.suggestionConfidenceThreshold ?? 0.7,
    };

    console.log(
      '[SecurityPatternLearner] Initialized with automatic learning:',
      this.config.enableAutomaticLearning
    );
  }

  /**
   * Record security incident for learning
   *
   * Primary integration point - called after incidents are handled
   *
   * @param incident Security incident to learn from
   */
  async recordIncident(incident: SecurityIncident): Promise<void> {
    console.log(
      `[SecurityPatternLearner] Recording incident: ${incident.incidentId} (${incident.type})`
    );

    // Store incident
    this.incidents.set(incident.incidentId, incident);

    // Trim old incidents
    this.trimOldIncidents();

    // Learn if automatic learning is enabled
    if (this.config.enableAutomaticLearning) {
      await this.learnFromIncident(incident);
    }

    this.learningCount++;

    this.emit('incidentRecorded', {
      incidentId: incident.incidentId,
      type: incident.type,
      patternsDetected: this.patterns.size,
    });
  }

  /**
   * Learn from incident
   */
  private async learnFromIncident(incident: SecurityIncident): Promise<void> {
    // Extract patterns from incident
    await this.extractPatterns(incident);

    // Cluster similar incidents
    await this.clusterIncidents();

    // Generate mitigation suggestions
    await this.suggestMitigations();

    this.emit('learningComplete', {
      incidentId: incident.incidentId,
      newPatterns: this.patterns.size,
      suggestions: this.suggestions.size,
    });
  }

  /**
   * Extract patterns from incident
   */
  private async extractPatterns(incident: SecurityIncident): Promise<void> {
    // Check if we've seen this threat type before
    const threatTypePattern = `pattern_${incident.type}`;

    const existingPattern = this.patterns.get(threatTypePattern);

    if (existingPattern) {
      // Update existing pattern
      existingPattern.occurrences++;
      existingPattern.lastSeen = incident.timestamp;

      // Update characteristics
      this.updatePatternCharacteristics(existingPattern, incident);

      // Recalculate risk score
      existingPattern.riskScore = this.calculatePatternRiskScore(existingPattern);
    } else {
      // Create new pattern
      const pattern: SecurityPattern = {
        patternId: threatTypePattern,
        detectedAt: incident.timestamp,
        type: 'attack_pattern',
        description: `Recurring ${incident.type.replace(/_/g, ' ')} incidents`,
        occurrences: 1,
        firstSeen: incident.timestamp,
        lastSeen: incident.timestamp,
        characteristics: this.extractCharacteristics(incident),
        associatedThreats: [incident.type],
        riskScore: this.calculateIncidentRisk(incident),
      };

      this.patterns.set(threatTypePattern, pattern);

      this.emit('patternDetected', pattern);
    }

    // Check for temporal patterns
    await this.detectTemporalPatterns(incident);

    // Check for compound attack patterns
    await this.detectCompoundPatterns(incident);
  }

  /**
   * Extract characteristics from incident
   */
  private extractCharacteristics(incident: SecurityIncident): Record<string, any> {
    const characteristics: Record<string, any> = {
      severity: incident.severity,
      threatCount: incident.threats.length,
      responseCount: incident.responses.length,
      resolved: incident.resolved,
    };

    // Extract common attributes from threats
    if (incident.threats.length > 0) {
      const firstThreat = incident.threats[0];

      characteristics.hasIPSource = !!firstThreat.source.ipAddress;
      characteristics.hasUserSource = !!firstThreat.source.userId;
      characteristics.hasChainSource = !!firstThreat.source.chainId;
      characteristics.hasComponent = !!firstThreat.source.component;
    }

    // Impact characteristics
    if (incident.impacted) {
      characteristics.hadLoss = (incident.impacted.loss ?? 0) > 0;
      characteristics.hadDowntime = (incident.impacted.downtime ?? 0) > 0;
      characteristics.impactedUsers = incident.impacted.users ?? 0;
      characteristics.impactedTxs = incident.impacted.transactions ?? 0;
    }

    return characteristics;
  }

  /**
   * Update pattern characteristics with new incident
   */
  private updatePatternCharacteristics(pattern: SecurityPattern, incident: SecurityIncident): void {
    const chars = pattern.characteristics;
    const newChars = this.extractCharacteristics(incident);

    // Running averages
    const n = pattern.occurrences;

    for (const [key, value] of Object.entries(newChars)) {
      if (typeof value === 'number') {
        chars[key] = ((chars[key] ?? 0) * (n - 1) + value) / n;
      } else if (typeof value === 'boolean') {
        chars[key] = ((chars[key] ?? 0) * (n - 1) + (value ? 1 : 0)) / n;
      }
    }
  }

  /**
   * Calculate pattern risk score
   */
  private calculatePatternRiskScore(pattern: SecurityPattern): number {
    let score = 0;

    // Frequency factor
    const occurrenceScore = Math.min(1, pattern.occurrences / 10) * 0.3;
    score += occurrenceScore;

    // Severity factor
    const chars = pattern.characteristics;
    const severityMap = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    const avgSeverity = severityMap[chars.severity as keyof typeof severityMap] ?? 0.5;
    score += avgSeverity * 0.4;

    // Impact factor
    const impactScore = Math.min(
      1,
      (chars.hadLoss ? 0.5 : 0) +
        (chars.hadDowntime ? 0.3 : 0) +
        (chars.impactedUsers > 0 ? 0.2 : 0)
    );
    score += impactScore * 0.3;

    return Math.min(1, score);
  }

  /**
   * Calculate risk from single incident
   */
  private calculateIncidentRisk(incident: SecurityIncident): number {
    const severityMap = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    const baseSeverity = severityMap[incident.severity];

    const impact = incident.impacted;
    let impactMultiplier = 1.0;

    if (impact) {
      if (impact.loss && impact.loss > 1000) impactMultiplier += 0.3;
      if (impact.downtime && impact.downtime > 60) impactMultiplier += 0.2;
      if (impact.users && impact.users > 10) impactMultiplier += 0.1;
    }

    return Math.min(1, baseSeverity * impactMultiplier);
  }

  /**
   * Detect temporal patterns (attacks at specific times)
   */
  private async detectTemporalPatterns(incident: SecurityIncident): Promise<void> {
    const hour = new Date(incident.timestamp).getHours();
    const dayOfWeek = new Date(incident.timestamp).getDay();

    const temporalPatternId = `temporal_${incident.type}_h${hour}_d${dayOfWeek}`;

    const existingPattern = this.patterns.get(temporalPatternId);

    if (existingPattern) {
      existingPattern.occurrences++;
      existingPattern.lastSeen = incident.timestamp;
      existingPattern.riskScore = this.calculatePatternRiskScore(existingPattern);
    } else if (this.shouldCreateTemporalPattern(incident.type, hour, dayOfWeek)) {
      const pattern: SecurityPattern = {
        patternId: temporalPatternId,
        detectedAt: incident.timestamp,
        type: 'attack_pattern',
        description: `${incident.type} incidents occurring at hour ${hour} on day ${dayOfWeek}`,
        occurrences: 1,
        firstSeen: incident.timestamp,
        lastSeen: incident.timestamp,
        characteristics: {
          hour,
          dayOfWeek,
          temporal: true,
        },
        associatedThreats: [incident.type],
        riskScore: 0.3,
      };

      this.patterns.set(temporalPatternId, pattern);
    }
  }

  /**
   * Check if temporal pattern should be created
   */
  private shouldCreateTemporalPattern(type: ThreatType, hour: number, dayOfWeek: number): boolean {
    // Count incidents of this type at this time
    let count = 0;

    for (const incident of this.incidents.values()) {
      if (incident.type !== type) continue;

      const incidentHour = new Date(incident.timestamp).getHours();
      const incidentDay = new Date(incident.timestamp).getDay();

      if (incidentHour === hour && incidentDay === dayOfWeek) {
        count++;
      }
    }

    return count >= this.config.minOccurrencesForPattern;
  }

  /**
   * Detect compound attack patterns (multiple threat types together)
   */
  private async detectCompoundPatterns(incident: SecurityIncident): Promise<void> {
    if (incident.threats.length < 2) return;

    // Extract unique threat types in this incident
    const threatTypes = [...new Set(incident.threats.map((t) => t.type))];

    if (threatTypes.length < 2) return;

    // Create compound pattern ID
    const sortedTypes = threatTypes.sort();
    const compoundPatternId = `compound_${sortedTypes.join('_')}`;

    const existingPattern = this.patterns.get(compoundPatternId);

    if (existingPattern) {
      existingPattern.occurrences++;
      existingPattern.lastSeen = incident.timestamp;
      existingPattern.riskScore = this.calculatePatternRiskScore(existingPattern);
    } else {
      const pattern: SecurityPattern = {
        patternId: compoundPatternId,
        detectedAt: incident.timestamp,
        type: 'attack_pattern',
        description: `Compound attack involving: ${sortedTypes
          .map((t) => t.replace(/_/g, ' '))
          .join(', ')}`,
        occurrences: 1,
        firstSeen: incident.timestamp,
        lastSeen: incident.timestamp,
        characteristics: {
          compound: true,
          threatCount: threatTypes.length,
        },
        associatedThreats: threatTypes,
        riskScore: 0.7, // Compound attacks are inherently riskier
      };

      this.patterns.set(compoundPatternId, pattern);

      this.emit('compoundPatternDetected', pattern);
    }
  }

  /**
   * Cluster similar incidents
   */
  private async clusterIncidents(): Promise<void> {
    // Group incidents by threat type
    const incidentsByType = new Map<ThreatType, SecurityIncident[]>();

    for (const incident of this.incidents.values()) {
      const existing = incidentsByType.get(incident.type) ?? [];
      existing.push(incident);
      incidentsByType.set(incident.type, existing);
    }

    // Create/update clusters
    for (const [threatType, incidents] of incidentsByType.entries()) {
      if (incidents.length < this.config.minOccurrencesForPattern) continue;

      const clusterId = `cluster_${threatType}`;
      const pattern = this.patterns.get(`pattern_${threatType}`);

      if (!pattern) continue;

      // Calculate cluster metrics
      const severityMap = { low: 1, medium: 2, high: 3, critical: 4 };
      const avgSeverity =
        incidents.reduce((sum, inc) => sum + (severityMap[inc.severity] ?? 2), 0) /
        incidents.length;

      const totalImpact = incidents.reduce((sum, inc) => sum + (inc.impacted?.loss ?? 0), 0);

      const cluster: IncidentCluster = {
        clusterId,
        threatType,
        incidents: incidents.map((inc) => inc.incidentId),
        pattern,
        avgSeverity,
        totalImpact,
      };

      this.clusters.set(clusterId, cluster);
    }
  }

  /**
   * Generate mitigation suggestions
   *
   * Primary output - called by SecurityManager
   */
  async suggestMitigations(): Promise<MitigationSuggestion[]> {
    const suggestions: MitigationSuggestion[] = [];

    // Generate suggestions from clusters
    for (const cluster of this.clusters.values()) {
      if (cluster.incidents.length < this.config.minOccurrencesForPattern) continue;

      const suggestion = this.createMitigationSuggestion(cluster);

      if (suggestion.confidence >= this.config.suggestionConfidenceThreshold) {
        suggestions.push(suggestion);
        this.suggestions.set(suggestion.suggestionId, suggestion);
      }
    }

    // Generate suggestions from high-risk patterns
    for (const pattern of this.patterns.values()) {
      if (pattern.riskScore >= 0.7 && pattern.occurrences >= this.config.minOccurrencesForPattern) {
        const suggestion = this.createPatternMitigationSuggestion(pattern);

        if (suggestion.confidence >= this.config.suggestionConfidenceThreshold) {
          suggestions.push(suggestion);
          this.suggestions.set(suggestion.suggestionId, suggestion);
        }
      }
    }

    return suggestions.sort((a, b) => {
      // Sort by priority then confidence
      const priorityMap = { low: 1, medium: 2, high: 3 };
      const aPriority = priorityMap[a.priority];
      const bPriority = priorityMap[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return b.confidence - a.confidence;
    });
  }

  /**
   * Create mitigation suggestion from cluster
   */
  private createMitigationSuggestion(cluster: IncidentCluster): MitigationSuggestion {
    const suggestionId = `suggestion_${cluster.clusterId}_${Date.now()}`;

    // Determine priority based on frequency and impact
    let priority: 'low' | 'medium' | 'high' = 'low';
    if (cluster.avgSeverity >= 3 || cluster.totalImpact > 10000) {
      priority = 'high';
    } else if (cluster.avgSeverity >= 2 || cluster.incidents.length >= 5) {
      priority = 'medium';
    }

    // Generate mitigation steps based on threat type
    const steps = this.generateMitigationSteps(cluster.threatType, cluster.pattern);

    // Calculate confidence based on sample size and consistency
    const confidence = Math.min(
      1.0,
      0.5 + cluster.incidents.length / 20 + cluster.pattern.riskScore * 0.3
    );

    // Estimate impact
    const expectedImpact = Math.min(
      1.0,
      cluster.pattern.riskScore * (cluster.incidents.length / 10)
    );

    return {
      suggestionId,
      timestamp: Date.now(),
      targetThreatType: cluster.threatType,
      title: `Mitigate recurring ${cluster.threatType.replace(/_/g, ' ')} attacks`,
      description: `Based on ${
        cluster.incidents.length
      } incidents with ${cluster.avgSeverity.toFixed(
        1
      )} avg severity and $${cluster.totalImpact.toFixed(0)} total impact`,
      priority,
      implementationSteps: steps,
      estimatedEffort: this.estimateEffort(steps.length, cluster.threatType),
      expectedImpact,
      basedOnIncidents: cluster.incidents,
      confidence,
    };
  }

  /**
   * Create mitigation suggestion from pattern
   */
  private createPatternMitigationSuggestion(pattern: SecurityPattern): MitigationSuggestion {
    const suggestionId = `suggestion_pattern_${pattern.patternId}_${Date.now()}`;

    const priority = pattern.riskScore >= 0.8 ? 'high' : 'medium';

    const steps = pattern.associatedThreats.flatMap((threat) =>
      this.generateMitigationSteps(threat, pattern)
    );

    const confidence = Math.min(1.0, 0.4 + pattern.occurrences / 15 + pattern.riskScore * 0.4);

    return {
      suggestionId,
      timestamp: Date.now(),
      targetThreatType: pattern.associatedThreats[0],
      title: `Address ${pattern.type.replace(/_/g, ' ')}: ${pattern.description}`,
      description: `Pattern detected ${pattern.occurrences} times with ${(
        pattern.riskScore * 100
      ).toFixed(0)}% risk score`,
      priority,
      implementationSteps: steps,
      estimatedEffort: this.estimateEffort(steps.length, pattern.associatedThreats[0]),
      expectedImpact: pattern.riskScore,
      basedOnIncidents: [],
      confidence,
    };
  }

  /**
   * Generate mitigation steps for threat type
   */
  private generateMitigationSteps(threatType: ThreatType, pattern: SecurityPattern): string[] {
    const steps: string[] = [];

    // Threat-specific mitigations
    const mitigationMap: Partial<Record<ThreatType, string[]>> = {
      flash_loan_attack: [
        'Implement reentrancy guards on all external calls',
        'Add flash loan detection in transaction validation',
        'Require minimum block delay between related transactions',
        'Monitor for abnormal capital movements',
      ],
      frontrun_attempt: [
        'Use private transaction pools (e.g., Flashbots)',
        'Implement commit-reveal schemes for sensitive operations',
        'Add randomized delays to transaction submission',
        'Monitor mempool for front-running patterns',
      ],
      sandwich_attack: [
        'Set strict slippage limits',
        'Use MEV-protected RPC endpoints',
        'Implement dynamic gas pricing to compete',
        'Add sandwich detection in pre-execution validation',
      ],
      unauthorized_access: [
        'Enable multi-factor authentication',
        'Implement IP whitelisting',
        'Add geographic access controls',
        'Review and tighten RBAC policies',
      ],
      brute_force: [
        'Implement progressive rate limiting',
        'Add CAPTCHA after failed attempts',
        'Temporary IP bans after threshold',
        'Monitor for distributed brute force patterns',
      ],
      rate_limit_abuse: [
        'Reduce rate limits for affected endpoints',
        'Implement token bucket algorithm',
        'Add request fingerprinting',
        'Deploy CDN with DDoS protection',
      ],
    };

    const specificSteps = mitigationMap[threatType] ?? [
      `Analyze ${threatType.replace(/_/g, ' ')} pattern characteristics`,
      'Implement threat-specific detection rules',
      'Add automated response actions',
      'Increase monitoring and logging',
    ];

    steps.push(...specificSteps);

    // Add pattern-specific recommendations
    if (pattern.characteristics.temporal) {
      steps.push(
        `Increase security during high-risk time periods (hour ${pattern.characteristics.hour})`
      );
    }

    if (pattern.characteristics.compound) {
      steps.push('Implement multi-stage attack detection');
      steps.push('Coordinate responses across threat vectors');
    }

    return steps;
  }

  /**
   * Estimate implementation effort
   */
  private estimateEffort(stepCount: number, threatType: ThreatType): 'low' | 'medium' | 'high' {
    // Complex threats require more effort
    const complexThreats: ThreatType[] = [
      'flash_loan_attack',
      'reentrancy_attempt',
      'price_manipulation',
      'data_exfiltration',
    ];

    if (complexThreats.includes(threatType)) {
      return 'high';
    }

    if (stepCount > 4) {
      return 'high';
    } else if (stepCount > 2) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Trim old incidents to manage memory
   */
  private trimOldIncidents(): void {
    const cutoff = Date.now() - this.config.patternTimeWindow;

    for (const [id, incident] of this.incidents.entries()) {
      if (incident.timestamp < cutoff) {
        this.incidents.delete(id);
      }
    }
  }

  /**
   * Get detected patterns
   */
  getPatterns(): SecurityPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get incident clusters
   */
  getClusters(): IncidentCluster[] {
    return Array.from(this.clusters.values());
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      incidentsRecorded: this.incidents.size,
      patternsDetected: this.patterns.size,
      clustersFormed: this.clusters.size,
      suggestionsGenerated: this.suggestions.size,
      learningIterations: this.learningCount,
    };
  }
}
