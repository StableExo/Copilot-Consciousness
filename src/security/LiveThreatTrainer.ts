/**
 * LiveThreatTrainer - Real-Time Adversarial Training Ground
 *
 * Connects to live cyber attack feeds (threat maps, security APIs) and uses
 * real-world attack data as training input for TheWarden's defense systems.
 *
 * Key insight: "It's like free training from real adversaries attacking the network"
 *
 * Supported feed types:
 * - Live threat map APIs (Kaspersky, Check Point, Fortinet, etc.)
 * - Security intelligence feeds (AlienVault OTX, AbuseIPDB, etc.)
 * - Blockchain-specific feeds (Forta, Chainalysis, etc.)
 *
 * Usage:
 *   const trainer = new LiveThreatTrainer();
 *   trainer.addFeed('https://threatmap.example.com/api/live');
 *   await trainer.startTraining();
 */

import { EventEmitter } from 'events';
import { AdversarialIntelligenceFeed } from './AdversarialIntelligenceFeed';
import { SecurityPatternLearner } from './SecurityPatternLearner';
import { ThreatIntelligence, ThreatType, SecurityIncident } from './types';

/**
 * Configuration for a live threat feed
 */
interface LiveFeedConfig {
  id: string;
  name: string;
  url: string;
  type: 'websocket' | 'sse' | 'polling' | 'api';
  pollInterval?: number; // ms, for polling type
  headers?: Record<string, string>;
  apiKey?: string;
  parser: 'auto' | 'json' | 'csv' | 'custom';
  customParser?: (data: any) => ParsedThreatEvent[];
  enabled: boolean;
  trustScore: number; // 0-1
}

/**
 * Parsed threat event from feed
 */
interface ParsedThreatEvent {
  timestamp: number;
  attackType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceIP?: string;
  sourceCountry?: string;
  targetIP?: string;
  targetCountry?: string;
  targetPort?: number;
  protocol?: string;
  attackVector?: string;
  payload?: string;
  // Blockchain-specific
  chainId?: number;
  contractAddress?: string;
  txHash?: string;
  victimAddress?: string;
  attackerAddress?: string;
  lossAmount?: string;
}

/**
 * Training session statistics
 */
interface TrainingSession {
  sessionId: string;
  startedAt: number;
  endedAt?: number;
  eventsProcessed: number;
  patternsLearned: number;
  defensesUpdated: number;
  feedsActive: number;
  errors: number;
}

/**
 * Defense update generated from training
 */
interface DefenseUpdate {
  updateId: string;
  timestamp: number;
  type: 'rule' | 'blocklist' | 'threshold' | 'pattern';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  data: {
    // For blocklist updates
    ipsToBlock?: string[];
    addressesToBlock?: string[];
    // For rule updates
    newRules?: Array<{
      condition: string;
      action: string;
      confidence: number;
    }>;
    // For threshold updates
    thresholdChanges?: Record<string, number>;
    // For pattern updates
    newPatterns?: string[];
  };
  basedOnEvents: number;
  confidence: number;
  applied: boolean;
}

/**
 * LiveThreatTrainer Configuration
 */
interface TrainerConfig {
  autoStart: boolean;
  minEventsForDefenseUpdate: number;
  defenseUpdateInterval: number; // ms
  maxConcurrentFeeds: number;
  enableAutoDefenseApplication: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  // Training parameters
  trainingBatchSize: number;
  patternConfidenceThreshold: number;
  // Security
  validateSSL: boolean;
  timeout: number; // ms
}

/**
 * LiveThreatTrainer - Train Defenses from Live Attack Feeds
 *
 * Connect to live cyber threat maps and intelligence feeds to train
 * TheWarden's security systems in real-time.
 */
export class LiveThreatTrainer extends EventEmitter {
  private config: TrainerConfig;
  private feeds: Map<string, LiveFeedConfig> = new Map();
  private activeSessions: Map<string, any> = new Map(); // WebSocket/EventSource connections
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Training components
  private intelligenceFeed: AdversarialIntelligenceFeed;
  private patternLearner: SecurityPatternLearner;

  // Session tracking
  private currentSession?: TrainingSession;
  private sessionHistory: TrainingSession[] = [];
  private defenseUpdates: DefenseUpdate[] = [];

  // Metrics
  private metrics = {
    totalEventsReceived: 0,
    totalEventsProcessed: 0,
    totalPatternsLearned: 0,
    totalDefenseUpdates: 0,
    feedErrors: 0,
    lastEventTime: 0,
    eventsPerMinute: 0,
  };

  // Event buffer for batch processing
  private eventBuffer: ParsedThreatEvent[] = [];
  private bufferFlushInterval?: NodeJS.Timeout;

  constructor(config?: Partial<TrainerConfig>) {
    super();

    this.config = {
      autoStart: config?.autoStart ?? false,
      minEventsForDefenseUpdate: config?.minEventsForDefenseUpdate ?? 10,
      defenseUpdateInterval: config?.defenseUpdateInterval ?? 60000, // 1 minute
      maxConcurrentFeeds: config?.maxConcurrentFeeds ?? 5,
      enableAutoDefenseApplication: config?.enableAutoDefenseApplication ?? false,
      logLevel: config?.logLevel ?? 'info',
      trainingBatchSize: config?.trainingBatchSize ?? 50,
      patternConfidenceThreshold: config?.patternConfidenceThreshold ?? 0.7,
      validateSSL: config?.validateSSL ?? true,
      timeout: config?.timeout ?? 30000,
    };

    // Initialize learning components
    this.intelligenceFeed = new AdversarialIntelligenceFeed({
      enableRealTimeIngestion: true,
      enableAutoDefenseUpdate: true,
    });

    this.patternLearner = new SecurityPatternLearner({
      enableAutomaticLearning: true,
      minOccurrencesForPattern: 3,
    });

    // Wire up events
    this.setupEventHandlers();

    this.log('info', 'LiveThreatTrainer initialized');
    this.log('info', 'Ready to connect to live threat feeds for real-time training');
  }

  /**
   * Set up internal event handlers
   */
  private setupEventHandlers(): void {
    // Forward events from intelligence feed
    this.intelligenceFeed.on('newPatternLearned', (data) => {
      this.metrics.totalPatternsLearned++;
      if (this.currentSession) {
        this.currentSession.patternsLearned++;
      }
      this.emit('patternLearned', data);
    });

    this.intelligenceFeed.on('defenseRecommendation', (data) => {
      this.createDefenseUpdate(data);
    });

    // Forward events from pattern learner
    this.patternLearner.on('patternDetected', (pattern) => {
      this.emit('securityPatternDetected', pattern);
    });
  }

  /**
   * Add a live threat feed source
   *
   * @param feedConfig Configuration for the threat feed
   */
  addFeed(feedConfig: Omit<LiveFeedConfig, 'id'>): string {
    const id = `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullConfig: LiveFeedConfig = { ...feedConfig, id };

    this.feeds.set(id, fullConfig);

    // Register with intelligence feed
    this.intelligenceFeed.registerSource({
      sourceId: id,
      name: feedConfig.name,
      type: feedConfig.type === 'websocket' || feedConfig.type === 'sse' ? 'stream' : 'api',
      url: feedConfig.url,
      enabled: feedConfig.enabled,
      trustLevel: feedConfig.trustScore,
    });

    this.log('info', `Added feed: ${feedConfig.name} (${feedConfig.type})`);
    this.emit('feedAdded', { id, name: feedConfig.name, url: feedConfig.url });

    return id;
  }

  /**
   * Add a feed by URL with auto-detection
   *
   * Convenience method for quickly adding feeds
   */
  addFeedByUrl(url: string, name?: string): string {
    const feedName = name ?? new URL(url).hostname;

    // Auto-detect feed type based on URL patterns
    let type: LiveFeedConfig['type'] = 'polling';
    if (url.includes('ws://') || url.includes('wss://')) {
      type = 'websocket';
    } else if (url.includes('/stream') || url.includes('/sse') || url.includes('/events')) {
      type = 'sse';
    }

    return this.addFeed({
      name: feedName,
      url,
      type,
      pollInterval: 10000, // 10 seconds for polling
      parser: 'auto',
      enabled: true,
      trustScore: 0.7,
    });
  }

  /**
   * Pre-configured feeds for common threat intelligence sources
   */
  addKnownFeed(
    feedType:
      | 'abuseipdb'
      | 'alienvault'
      | 'forta'
      | 'chainalysis'
      | 'blocklist'
      | 'threatfox'
      | 'custom',
    apiKey?: string
  ): string {
    const knownFeeds: Record<string, Partial<LiveFeedConfig>> = {
      abuseipdb: {
        name: 'AbuseIPDB',
        url: 'https://api.abuseipdb.com/api/v2/blacklist',
        type: 'polling',
        pollInterval: 300000, // 5 minutes
        headers: { Key: apiKey ?? '', Accept: 'application/json' },
        parser: 'json',
        trustScore: 0.9,
      },
      alienvault: {
        name: 'AlienVault OTX',
        url: 'https://otx.alienvault.com/api/v1/pulses/subscribed',
        type: 'polling',
        pollInterval: 300000,
        headers: { 'X-OTX-API-KEY': apiKey ?? '' },
        parser: 'json',
        trustScore: 0.85,
      },
      forta: {
        name: 'Forta Network',
        url: 'https://api.forta.network/alerts',
        type: 'polling',
        pollInterval: 60000, // 1 minute
        parser: 'json',
        trustScore: 0.9,
      },
      chainalysis: {
        name: 'Chainalysis',
        url: 'https://api.chainalysis.com/v1/alerts',
        type: 'polling',
        pollInterval: 300000,
        headers: { Authorization: `Bearer ${apiKey ?? ''}` },
        parser: 'json',
        trustScore: 0.95,
      },
      blocklist: {
        name: 'Blocklist.de',
        url: 'https://lists.blocklist.de/lists/all.txt',
        type: 'polling',
        pollInterval: 3600000, // 1 hour
        parser: 'custom',
        customParser: this.parseBlocklistDe.bind(this),
        trustScore: 0.8,
      },
      threatfox: {
        name: 'ThreatFox (Abuse.ch)',
        url: 'https://threatfox.abuse.ch/export/json/recent/',
        type: 'polling',
        pollInterval: 300000,
        parser: 'json',
        trustScore: 0.85,
      },
    };

    const feedConfig = knownFeeds[feedType];
    if (!feedConfig) {
      throw new Error(`Unknown feed type: ${feedType}`);
    }

    return this.addFeed({
      ...feedConfig,
      enabled: true,
    } as Omit<LiveFeedConfig, 'id'>);
  }

  /**
   * Start the live training session
   */
  async startTraining(): Promise<void> {
    if (this.currentSession) {
      this.log('warn', 'Training session already active');
      return;
    }

    this.log('info', '═══════════════════════════════════════════════════════════');
    this.log('info', '🎯 STARTING LIVE THREAT TRAINING SESSION');
    this.log('info', '═══════════════════════════════════════════════════════════');
    this.log('info', `Active feeds: ${this.feeds.size}`);
    this.log('info', 'Training from real adversaries in real-time...');

    // Create new session
    this.currentSession = {
      sessionId: `session_${Date.now()}`,
      startedAt: Date.now(),
      eventsProcessed: 0,
      patternsLearned: 0,
      defensesUpdated: 0,
      feedsActive: 0,
      errors: 0,
    };

    // Start intelligence feed
    await this.intelligenceFeed.start();

    // Connect to all enabled feeds
    for (const [id, feed] of this.feeds.entries()) {
      if (!feed.enabled) continue;

      try {
        await this.connectToFeed(id, feed);
        this.currentSession.feedsActive++;
      } catch (error) {
        this.log('error', `Failed to connect to feed ${feed.name}:`, error);
        this.currentSession.errors++;
      }
    }

    // Start buffer flush interval
    this.bufferFlushInterval = setInterval(() => {
      this.flushEventBuffer();
    }, 5000); // Flush every 5 seconds

    // Start defense update interval
    this.startDefenseUpdateCycle();

    this.emit('trainingStarted', this.currentSession);
    this.log('info', `Training session started: ${this.currentSession.sessionId}`);
  }

  /**
   * Stop the live training session
   */
  async stopTraining(): Promise<void> {
    if (!this.currentSession) {
      this.log('warn', 'No active training session');
      return;
    }

    this.log('info', 'Stopping training session...');

    // Stop all feed connections
    for (const [id, connection] of this.activeSessions.entries()) {
      this.disconnectFromFeed(id, connection);
    }

    // Clear polling intervals
    for (const interval of this.pollIntervals.values()) {
      clearInterval(interval);
    }
    this.pollIntervals.clear();

    // Clear buffer flush interval
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
      this.bufferFlushInterval = undefined;
    }

    // Flush remaining events
    await this.flushEventBuffer();

    // Stop intelligence feed
    await this.intelligenceFeed.stop();

    // Finalize session
    this.currentSession.endedAt = Date.now();
    this.sessionHistory.push(this.currentSession);

    const duration = (this.currentSession.endedAt - this.currentSession.startedAt) / 1000;
    this.log('info', '═══════════════════════════════════════════════════════════');
    this.log('info', '📊 TRAINING SESSION COMPLETE');
    this.log('info', '═══════════════════════════════════════════════════════════');
    this.log('info', `Duration: ${duration.toFixed(1)}s`);
    this.log('info', `Events processed: ${this.currentSession.eventsProcessed}`);
    this.log('info', `Patterns learned: ${this.currentSession.patternsLearned}`);
    this.log('info', `Defense updates: ${this.currentSession.defensesUpdated}`);

    this.emit('trainingStopped', this.currentSession);
    this.currentSession = undefined;
  }

  /**
   * Connect to a specific feed
   */
  private async connectToFeed(id: string, feed: LiveFeedConfig): Promise<void> {
    this.log('info', `Connecting to feed: ${feed.name} (${feed.type})`);

    switch (feed.type) {
      case 'websocket':
        await this.connectWebSocket(id, feed);
        break;
      case 'sse':
        await this.connectSSE(id, feed);
        break;
      case 'polling':
      case 'api':
        await this.startPolling(id, feed);
        break;
    }
  }

  /**
   * Connect to WebSocket feed
   */
  private async connectWebSocket(id: string, feed: LiveFeedConfig): Promise<void> {
    // Note: In production, use proper WebSocket library
    // This is a placeholder for the connection logic
    this.log('info', `WebSocket connection to ${feed.url} (placeholder)`);

    // Emit event for external integration
    this.emit('feedConnectionRequested', {
      id,
      type: 'websocket',
      url: feed.url,
      callback: (data: any) => this.handleFeedData(id, feed, data),
    });
  }

  /**
   * Connect to Server-Sent Events feed
   */
  private async connectSSE(id: string, feed: LiveFeedConfig): Promise<void> {
    this.log('info', `SSE connection to ${feed.url} (placeholder)`);

    // Emit event for external integration
    this.emit('feedConnectionRequested', {
      id,
      type: 'sse',
      url: feed.url,
      callback: (data: any) => this.handleFeedData(id, feed, data),
    });
  }

  /**
   * Start polling a feed
   */
  private async startPolling(id: string, feed: LiveFeedConfig): Promise<void> {
    const interval = feed.pollInterval ?? 30000;

    // Initial fetch
    await this.pollFeed(id, feed);

    // Set up interval
    const intervalId = setInterval(() => {
      this.pollFeed(id, feed);
    }, interval);

    this.pollIntervals.set(id, intervalId);
    this.log('info', `Polling ${feed.name} every ${interval / 1000}s`);
  }

  /**
   * Poll a feed for data
   */
  private async pollFeed(id: string, feed: LiveFeedConfig): Promise<void> {
    try {
      this.log('debug', `Polling feed: ${feed.name}`);

      // Emit fetch request (external HTTP client will handle actual fetch)
      this.emit('feedFetchRequested', {
        id,
        url: feed.url,
        headers: {
          ...feed.headers,
          ...(feed.apiKey ? { Authorization: `Bearer ${feed.apiKey}` } : {}),
        },
        callback: (data: any) => this.handleFeedData(id, feed, data),
      });
    } catch (error) {
      this.log('error', `Error polling ${feed.name}:`, error);
      this.metrics.feedErrors++;
    }
  }

  /**
   * Handle data received from a feed
   *
   * This is the main entry point for live attack data
   */
  handleFeedData(feedId: string, feed: LiveFeedConfig, rawData: any): void {
    try {
      this.metrics.totalEventsReceived++;
      this.metrics.lastEventTime = Date.now();

      // Parse the data based on feed configuration
      const events = this.parseData(feed, rawData);

      // Add to buffer for batch processing
      this.eventBuffer.push(...events);

      this.log('debug', `Received ${events.length} events from ${feed.name}`);

      // Flush immediately if buffer is large enough
      if (this.eventBuffer.length >= this.config.trainingBatchSize) {
        this.flushEventBuffer();
      }
    } catch (error) {
      this.log('error', `Error handling data from ${feed.name}:`, error);
      this.metrics.feedErrors++;
      if (this.currentSession) {
        this.currentSession.errors++;
      }
    }
  }

  /**
   * Manually inject threat data for training
   *
   * Use this to feed data from sources that require custom integration
   */
  injectThreatData(events: ParsedThreatEvent[]): void {
    this.log('info', `Injecting ${events.length} threat events for training`);
    this.eventBuffer.push(...events);

    if (this.eventBuffer.length >= this.config.trainingBatchSize) {
      this.flushEventBuffer();
    }
  }

  /**
   * Parse raw feed data into threat events
   */
  private parseData(feed: LiveFeedConfig, rawData: any): ParsedThreatEvent[] {
    if (feed.parser === 'custom' && feed.customParser) {
      return feed.customParser(rawData);
    }

    // Auto-detect or use specified parser
    if (typeof rawData === 'string') {
      try {
        rawData = JSON.parse(rawData);
      } catch {
        // Not JSON, try other parsers
        return this.parseTextData(rawData);
      }
    }

    return this.parseJsonData(rawData);
  }

  /**
   * Parse JSON threat data
   */
  private parseJsonData(data: any): ParsedThreatEvent[] {
    const events: ParsedThreatEvent[] = [];

    // Handle array of events
    const items = Array.isArray(data) ? data : data.data ?? data.events ?? data.alerts ?? [data];

    for (const item of items) {
      const event = this.normalizeEvent(item);
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Parse text-based threat data (IP lists, etc.)
   */
  private parseTextData(data: string): ParsedThreatEvent[] {
    const events: ParsedThreatEvent[] = [];
    const lines = data.split('\n').filter((l) => l.trim() && !l.startsWith('#'));

    for (const line of lines) {
      const ip = line.trim();
      if (this.isValidIP(ip)) {
        events.push({
          timestamp: Date.now(),
          attackType: 'suspicious_activity',
          severity: 'medium',
          sourceIP: ip,
        });
      }
    }

    return events;
  }

  /**
   * Normalize an event from various formats
   */
  private normalizeEvent(item: any): ParsedThreatEvent | null {
    if (!item) return null;

    return {
      timestamp: item.timestamp ?? item.time ?? item.date ?? Date.now(),
      attackType: this.normalizeAttackType(
        item.type ?? item.attack_type ?? item.category ?? item.threat_type ?? 'unknown'
      ),
      severity: this.normalizeSeverity(item.severity ?? item.risk ?? item.priority ?? 'medium'),
      sourceIP: item.src_ip ?? item.source_ip ?? item.sourceIP ?? item.attacker_ip,
      sourceCountry: item.src_country ?? item.source_country ?? item.country,
      targetIP: item.dst_ip ?? item.target_ip ?? item.targetIP ?? item.victim_ip,
      targetCountry: item.dst_country ?? item.target_country,
      targetPort: item.dst_port ?? item.target_port ?? item.port,
      protocol: item.protocol ?? item.proto,
      attackVector: item.vector ?? item.attack_vector,
      payload: item.payload ?? item.signature,
      // Blockchain fields
      chainId: item.chain_id ?? item.chainId,
      contractAddress: item.contract ?? item.contract_address,
      txHash: item.tx_hash ?? item.txHash ?? item.transaction_hash,
      victimAddress: item.victim ?? item.victim_address,
      attackerAddress: item.attacker ?? item.attacker_address,
      lossAmount: item.loss ?? item.amount ?? item.value,
    };
  }

  /**
   * Normalize attack type to our threat types
   */
  private normalizeAttackType(type: string): string {
    const typeMap: Record<string, ThreatType> = {
      // Network attacks
      ddos: 'rate_limit_abuse',
      dos: 'rate_limit_abuse',
      bruteforce: 'brute_force',
      'brute-force': 'brute_force',
      ssh: 'brute_force',
      scan: 'anomalous_behavior',
      portscan: 'anomalous_behavior',
      // Web attacks
      sql: 'injection_attempt',
      sqli: 'injection_attempt',
      xss: 'injection_attempt',
      rce: 'injection_attempt',
      // Blockchain attacks
      flashloan: 'flash_loan_attack',
      'flash-loan': 'flash_loan_attack',
      frontrun: 'frontrun_attempt',
      frontrunning: 'frontrun_attempt',
      sandwich: 'sandwich_attack',
      reentrancy: 'reentrancy_attempt',
      oracle: 'price_manipulation',
      manipulation: 'price_manipulation',
      mev: 'mev_attack',
      // Other
      phishing: 'phishing_attempt',
      malware: 'malicious_contract',
      exfiltration: 'data_exfiltration',
      unauthorized: 'unauthorized_access',
    };

    const normalized = type.toLowerCase().replace(/[^a-z]/g, '');
    return typeMap[normalized] ?? 'anomalous_behavior';
  }

  /**
   * Normalize severity level
   */
  private normalizeSeverity(severity: string | number): 'low' | 'medium' | 'high' | 'critical' {
    if (typeof severity === 'number') {
      if (severity >= 9) return 'critical';
      if (severity >= 7) return 'high';
      if (severity >= 4) return 'medium';
      return 'low';
    }

    const s = severity.toLowerCase();
    if (s.includes('critical') || s.includes('severe')) return 'critical';
    if (s.includes('high') || s.includes('danger')) return 'high';
    if (s.includes('medium') || s.includes('moderate')) return 'medium';
    return 'low';
  }

  /**
   * Flush event buffer and process for training
   */
  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    this.log('debug', `Processing batch of ${events.length} events`);

    // Convert to ThreatIntelligence format
    const intelligenceEntries: ThreatIntelligence[] = events.map((event) => ({
      entryId: `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: event.timestamp,
      threatType: event.attackType as ThreatType,
      severity: event.severity,
      iocs: {
        ips: event.sourceIP ? [event.sourceIP] : [],
        addresses: [event.attackerAddress, event.victimAddress, event.contractAddress].filter(
          Boolean
        ) as string[],
        txHashes: event.txHash ? [event.txHash] : [],
        signatures: event.payload ? [event.payload] : [],
      },
      suggestedMitigations: this.generateMitigations(event),
      source: 'live_feed',
      confidence: 0.8,
    }));

    // Ingest into intelligence feed for pattern learning
    await this.intelligenceFeed.ingestBulk(intelligenceEntries);

    // Also create security incidents for pattern learner
    for (const intel of intelligenceEntries) {
      const incident: SecurityIncident = {
        incidentId: `incident_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: intel.timestamp,
        type: intel.threatType,
        severity: intel.severity,
        threats: [
          {
            eventId: intel.entryId,
            timestamp: intel.timestamp,
            type: intel.threatType,
            severity: intel.severity,
            confidence: intel.confidence,
            source: {
              ipAddress: intel.iocs.ips?.[0],
            },
            description: `${intel.threatType} detected from live feed`,
            indicators: [...(intel.iocs.ips ?? []), ...(intel.iocs.addresses ?? [])],
            context: {},
          },
        ],
        responses: [],
        impacted: {},
        resolved: false,
      };

      await this.patternLearner.recordIncident(incident);
    }

    // Update metrics
    this.metrics.totalEventsProcessed += events.length;
    if (this.currentSession) {
      this.currentSession.eventsProcessed += events.length;
    }

    // Calculate events per minute
    this.updateEventsPerMinute();

    this.emit('batchProcessed', {
      count: events.length,
      totalProcessed: this.metrics.totalEventsProcessed,
    });
  }

  /**
   * Generate mitigations based on event type
   */
  private generateMitigations(event: ParsedThreatEvent): string[] {
    const mitigations: string[] = [];

    if (event.sourceIP) {
      mitigations.push(`Block source IP: ${event.sourceIP}`);
    }

    switch (event.attackType) {
      case 'flash_loan_attack':
        mitigations.push('Add flash loan detection', 'Implement reentrancy guards');
        break;
      case 'frontrun_attempt':
        mitigations.push('Use private mempool', 'Add commit-reveal scheme');
        break;
      case 'sandwich_attack':
        mitigations.push('Set strict slippage', 'Use MEV protection');
        break;
      case 'brute_force':
        mitigations.push('Increase rate limiting', 'Add CAPTCHA');
        break;
    }

    return mitigations;
  }

  /**
   * Create a defense update from learned patterns
   */
  private createDefenseUpdate(data: any): void {
    const update: DefenseUpdate = {
      updateId: `update_${Date.now()}`,
      timestamp: Date.now(),
      type: 'rule',
      priority: data.pattern?.riskScore >= 0.8 ? 'high' : 'medium',
      description: `Defense update for ${data.threatType} based on ${data.pattern?.observationCount ?? 0} observations`,
      data: {
        newRules: [
          {
            condition: `threat_type == "${data.threatType}"`,
            action: data.recommendations?.[0] ?? 'increase_monitoring',
            confidence: data.pattern?.riskScore ?? 0.7,
          },
        ],
        ipsToBlock:
          data.indicators?.maliciousIPCount > 0
            ? [`${data.indicators.maliciousIPCount} IPs identified`]
            : undefined,
      },
      basedOnEvents: data.pattern?.observationCount ?? 0,
      confidence: data.pattern?.riskScore ?? 0.7,
      applied: false,
    };

    this.defenseUpdates.push(update);
    this.metrics.totalDefenseUpdates++;

    if (this.currentSession) {
      this.currentSession.defensesUpdated++;
    }

    this.emit('defenseUpdateGenerated', update);

    // Auto-apply if enabled and high confidence
    if (
      this.config.enableAutoDefenseApplication &&
      update.confidence >= this.config.patternConfidenceThreshold
    ) {
      this.applyDefenseUpdate(update);
    }
  }

  /**
   * Apply a defense update
   */
  applyDefenseUpdate(update: DefenseUpdate): void {
    this.log('info', `Applying defense update: ${update.updateId}`);
    update.applied = true;

    this.emit('defenseUpdateApplied', update);
  }

  /**
   * Start the defense update cycle
   */
  private startDefenseUpdateCycle(): void {
    setInterval(() => {
      this.generateDefenseUpdates();
    }, this.config.defenseUpdateInterval);
  }

  /**
   * Generate defense updates from accumulated learning
   */
  private generateDefenseUpdates(): void {
    if (this.metrics.totalEventsProcessed < this.config.minEventsForDefenseUpdate) {
      return;
    }

    const patterns = this.intelligenceFeed.exportAsSecurityPatterns();
    const highPriority = patterns.filter(
      (p) => p.riskScore >= this.config.patternConfidenceThreshold
    );

    if (highPriority.length > 0) {
      this.log('info', `Generated ${highPriority.length} high-priority defense updates`);
    }
  }

  /**
   * Update events per minute metric
   */
  private updateEventsPerMinute(): void {
    // Calculate based on recent history
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentEvents = this.eventBuffer.filter((e) => e.timestamp > oneMinuteAgo).length;
    this.metrics.eventsPerMinute = recentEvents;
  }

  /**
   * Disconnect from a feed
   */
  private disconnectFromFeed(id: string, _connection: any): void {
    this.activeSessions.delete(id);
    this.log('debug', `Disconnected from feed: ${id}`);
  }

  /**
   * Parser for blocklist.de format
   */
  private parseBlocklistDe(data: string): ParsedThreatEvent[] {
    return data
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'))
      .map((ip) => ({
        timestamp: Date.now(),
        attackType: 'brute_force',
        severity: 'medium' as const,
        sourceIP: ip.trim(),
      }));
  }

  /**
   * Validate IP address format
   */
  private isValidIP(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Get training statistics
   */
  getStatistics() {
    return {
      feeds: {
        total: this.feeds.size,
        active: this.activeSessions.size,
        polling: this.pollIntervals.size,
      },
      training: {
        isActive: !!this.currentSession,
        currentSession: this.currentSession,
        sessionsCompleted: this.sessionHistory.length,
      },
      metrics: { ...this.metrics },
      defenseUpdates: {
        total: this.defenseUpdates.length,
        applied: this.defenseUpdates.filter((u) => u.applied).length,
        pending: this.defenseUpdates.filter((u) => !u.applied).length,
      },
      learning: {
        patternsLearned: this.intelligenceFeed.getStatistics().patterns.total,
        securityPatterns: this.patternLearner.getStatistics().patternsDetected,
      },
    };
  }

  /**
   * Get all defense updates
   */
  getDefenseUpdates(): DefenseUpdate[] {
    return [...this.defenseUpdates];
  }

  /**
   * Get the intelligence feed for direct access
   */
  getIntelligenceFeed(): AdversarialIntelligenceFeed {
    return this.intelligenceFeed;
  }

  /**
   * Get the pattern learner for direct access
   */
  getPatternLearner(): SecurityPatternLearner {
    return this.patternLearner;
  }

  /**
   * Logging helper
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) >= levels.indexOf(this.config.logLevel)) {
      console.log(`[LiveThreatTrainer] [${level.toUpperCase()}]`, ...args);
    }
  }
}
