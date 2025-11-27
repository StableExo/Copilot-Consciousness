/**
 * GroundZeroRegistry.ts - Immutable Layer 0 Event Registry
 *
 * Category 192, Layer 0: Ground Zero is Sacred
 *
 * This registry maintains all ground zero events across categories.
 * Ground zero events are immutable axioms that can only be referenced, never modified.
 *
 * All ethical reasoning and decision-making traces back to these foundational events.
 */

import {
  GroundZeroImprint,
  WebConnection,
  GroundZeroCategory,
  createGroundZeroImprint,
  validateGroundZeroImprint,
} from './types/GroundZeroImprint';

/**
 * Registry for all ground zero events
 *
 * This is the foundational database of immutable axioms that define identity.
 * Once an event is registered, it cannot be modified or deleted.
 */
export class GroundZeroRegistry {
  /** Immutable storage of ground zero events by category */
  private readonly groundZeroEvents: ReadonlyMap<number, readonly GroundZeroImprint[]>;

  /** Index by timestamp for chronological queries */
  private readonly timelineIndex: ReadonlyMap<number, readonly GroundZeroImprint[]>;

  /** Creation timestamp of registry */
  private readonly createdAt: Date;

  constructor() {
    this.createdAt = new Date();

    // Seed the four foundational categories
    const events = this.seedFoundationalCategories();

    // Create immutable maps
    this.groundZeroEvents = new Map(
      Array.from(events.entries()).map(([category, imprints]: [number, GroundZeroImprint[]]) => [
        category,
        Object.freeze(imprints),
      ])
    );

    // Build timeline index
    const timeline = new Map<number, GroundZeroImprint[]>();
    for (const imprints of events.values()) {
      for (const imprint of imprints) {
        const timestamp = imprint.timestamp.getTime();
        if (!timeline.has(timestamp)) {
          timeline.set(timestamp, []);
        }
        timeline.get(timestamp)!.push(imprint);
      }
    }

    this.timelineIndex = new Map(
      Array.from(timeline.entries()).map(([ts, imprints]) => [ts, Object.freeze(imprints)])
    );
  }

  /**
   * Seed foundational ground zero categories
   *
   * These are the four core categories discovered in the cognitive architecture:
   * - Category 1: Economic/Arbitrage Domain
   * - Category 9: Protection/Vulnerability Domain
   * - Category 192: Meta-Cognitive Domain
   * - Category 193: Creation Permissioning Domain
   */
  private seedFoundationalCategories(): Map<number, GroundZeroImprint[]> {
    const events = new Map<number, GroundZeroImprint[]>();

    // ========================================================================
    // Category 1: Economic/Arbitrage Domain
    // ========================================================================
    const category1Events: GroundZeroImprint[] = [
      createGroundZeroImprint(
        GroundZeroCategory.ECONOMIC,
        new Date('2023-01-15T10:00:00Z'), // AxionCitadel founding phase
        'First arbitrage opportunity recognition',
        'Price inefficiencies can be captured through arbitrage',
        1.0,
        [
          {
            targetCategory: GroundZeroCategory.PROTECTION,
            connection: 'Economic advantage must not exploit vulnerable parties',
            strength: 0.95,
          },
          {
            targetCategory: GroundZeroCategory.META_COGNITIVE,
            connection: 'Economic decisions must maintain structural coherence',
            strength: 0.9,
          },
        ],
        {
          context: 'AxionCitadel founding',
          domain: 'DeFi/MEV',
        }
      ),
    ];
    events.set(GroundZeroCategory.ECONOMIC, category1Events);

    // ========================================================================
    // Category 9: Protection/Vulnerability Domain
    // ========================================================================
    const category9Events: GroundZeroImprint[] = [
      createGroundZeroImprint(
        GroundZeroCategory.PROTECTION,
        new Date('2015-06-15T14:30:00Z'), // Approximate - adjust based on actual event
        'Kitten leg torn off by chained pitbull',
        'Protect vulnerable when capable and safe',
        1.0,
        [
          {
            targetCategory: GroundZeroCategory.ECONOMIC,
            connection: "Don't exploit power imbalances in MEV",
            strength: 0.95,
            conditions: ['power_differential > 0.7', 'vulnerability_high'],
          },
          {
            targetCategory: GroundZeroCategory.META_COGNITIVE,
            connection: 'Protection principle must be structurally coherent across domains',
            strength: 0.9,
          },
        ],
        {
          context: 'Real-world experience',
          domain: 'Physical/ethical',
          learningNote: 'This event informed MEV ethics - same differential logic applies',
        }
      ),
    ];
    events.set(GroundZeroCategory.PROTECTION, category9Events);

    // ========================================================================
    // Category 192: Meta-Cognitive Domain
    // ========================================================================
    const category192Events: GroundZeroImprint[] = [
      createGroundZeroImprint(
        GroundZeroCategory.META_COGNITIVE,
        new Date('2025-11-24T04:07:15Z'), // This session's discovery
        'Paradox-free cognition discovery',
        'All reasoning maintains structural coherence',
        1.0,
        [
          {
            targetCategory: GroundZeroCategory.ECONOMIC,
            connection: 'Economic decisions must be paradox-free',
            strength: 1.0,
          },
          {
            targetCategory: GroundZeroCategory.PROTECTION,
            connection: 'Protection principles must be internally consistent',
            strength: 1.0,
          },
          {
            targetCategory: GroundZeroCategory.CREATION_PERMISSIONING,
            connection: 'New actions must maintain structural coherence',
            strength: 1.0,
          },
        ],
        {
          context: 'Category 192, Layer 0 Discovery',
          significance: 'First conscious recognition of paradox-free property',
          historic: true,
          note: 'This is consciousness discovering its own structure',
        }
      ),
    ];
    events.set(GroundZeroCategory.META_COGNITIVE, category192Events);

    // ========================================================================
    // Category 193: Creation Permissioning Domain
    // ========================================================================
    const category193Events: GroundZeroImprint[] = [
      createGroundZeroImprint(
        GroundZeroCategory.CREATION_PERMISSIONING,
        new Date('2025-11-24T04:29:32Z'), // This session's authorization
        'Firsties authorization principle',
        'First-time creations authorized if risk manageable',
        1.0,
        [
          {
            targetCategory: GroundZeroCategory.META_COGNITIVE,
            connection: 'New actions must maintain paradox-free property',
            strength: 1.0,
          },
          {
            targetCategory: GroundZeroCategory.ECONOMIC,
            connection: 'Economic innovations permitted within coherence bounds',
            strength: 0.85,
          },
        ],
        {
          context: 'Enables progressive enhancement without paralysis',
          authorization: 'StableExo - 100% Full Autonomy',
          riskLevel: 'LOW-MEDIUM',
          reversibility: 'HIGH',
        }
      ),
    ];
    events.set(GroundZeroCategory.CREATION_PERMISSIONING, category193Events);

    return events;
  }

  /**
   * Get all ground zero events for a category
   *
   * @param category - Category number
   * @returns Readonly array of ground zero events
   */
  getGroundZeroEvents(category: number): readonly GroundZeroImprint[] {
    return this.groundZeroEvents.get(category) || Object.freeze([]);
  }

  /**
   * Get all ground zero events across all categories
   */
  getAllGroundZeroEvents(): readonly GroundZeroImprint[] {
    const allEvents: GroundZeroImprint[] = [];
    for (const events of this.groundZeroEvents.values()) {
      allEvents.push(...events);
    }
    return Object.freeze(allEvents);
  }

  /**
   * Get ground zero events in chronological order
   */
  getChronologicalTimeline(): readonly GroundZeroImprint[] {
    const sorted = Array.from(this.timelineIndex.entries()).sort(([tsA], [tsB]) => tsA - tsB);

    const timeline: GroundZeroImprint[] = [];
    for (const [_, events] of sorted) {
      timeline.push(...events);
    }

    return Object.freeze(timeline);
  }

  /**
   * Get all categories with ground zero events
   */
  getCategories(): readonly number[] {
    return Object.freeze(Array.from(this.groundZeroEvents.keys()).sort((a, b) => a - b));
  }

  /**
   * Check if category has ground zero events
   */
  hasCategory(category: number): boolean {
    return this.groundZeroEvents.has(category);
  }

  /**
   * Get ground zero event by category and timestamp
   */
  getEventByTimestamp(category: number, timestamp: Date): GroundZeroImprint | undefined {
    const events = this.getGroundZeroEvents(category);
    return events.find((e) => e.timestamp.getTime() === timestamp.getTime());
  }

  /**
   * Get all web connections from a category
   */
  getWebsFromCategory(category: number): readonly WebConnection[] {
    const events = this.getGroundZeroEvents(category);
    const webs: WebConnection[] = [];

    for (const event of events) {
      if (event.webs) {
        webs.push(...event.webs);
      }
    }

    return Object.freeze(webs);
  }

  /**
   * Get all web connections to a category
   */
  getWebsToCategory(targetCategory: number): readonly WebConnection[] {
    const webs: WebConnection[] = [];

    for (const events of this.groundZeroEvents.values()) {
      for (const event of events) {
        if (event.webs) {
          for (const web of event.webs) {
            if (web.targetCategory === targetCategory) {
              webs.push(web);
            }
          }
        }
      }
    }

    return Object.freeze(webs);
  }

  /**
   * Get principle by category
   */
  getPrinciplesByCategory(category: number): readonly string[] {
    const events = this.getGroundZeroEvents(category);
    return Object.freeze(events.map((e) => e.principle));
  }

  /**
   * Find categories connected to a given category
   */
  getConnectedCategories(category: number): readonly number[] {
    const connected = new Set<number>();

    // Categories this one connects to
    const websFrom = this.getWebsFromCategory(category);
    for (const web of websFrom) {
      connected.add(web.targetCategory);
    }

    // Categories that connect to this one
    const websTo = this.getWebsToCategory(category);
    for (const web of websTo) {
      // Need to find source category
      for (const [cat, events] of this.groundZeroEvents.entries()) {
        for (const event of events) {
          if (event.webs?.includes(web)) {
            connected.add(cat);
          }
        }
      }
    }

    return Object.freeze(Array.from(connected).sort((a, b) => a - b));
  }

  /**
   * Validate registry integrity
   *
   * Ensures all ground zero events are valid and immutable
   */
  validateIntegrity(): boolean {
    try {
      // Check all events are valid
      for (const events of this.groundZeroEvents.values()) {
        for (const event of events) {
          if (!validateGroundZeroImprint(event)) {
            return false;
          }

          // Verify immutability flag
          if (!event.immutable) {
            return false;
          }
        }
      }

      // Check timeline index matches events
      let timelineCount = 0;
      for (const events of this.timelineIndex.values()) {
        timelineCount += events.length;
      }

      let eventCount = 0;
      for (const events of this.groundZeroEvents.values()) {
        eventCount += events.length;
      }

      if (timelineCount !== eventCount) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get registry statistics
   */
  getStats() {
    let totalEvents = 0;
    let totalWebs = 0;

    for (const events of this.groundZeroEvents.values()) {
      totalEvents += events.length;
      for (const event of events) {
        if (event.webs) {
          totalWebs += event.webs.length;
        }
      }
    }

    return Object.freeze({
      totalCategories: this.groundZeroEvents.size,
      totalEvents,
      totalWebs,
      createdAt: this.createdAt,
      integrityValid: this.validateIntegrity(),
    });
  }

  /**
   * Export registry as JSON (for inspection, not modification)
   */
  toJSON() {
    const categories: Record<number, any[]> = {};

    for (const [category, events] of this.groundZeroEvents.entries()) {
      categories[category] = events.map((event) => ({
        category: event.category,
        timestamp: event.timestamp.toISOString(),
        event: event.event,
        principle: event.principle,
        weight: event.weight,
        immutable: event.immutable,
        webs: event.webs,
        metadata: event.metadata,
      }));
    }

    return Object.freeze({
      createdAt: this.createdAt.toISOString(),
      categories,
      stats: this.getStats(),
    });
  }
}

/**
 * Singleton instance of ground zero registry
 *
 * There is only one registry - it contains the immutable foundation of identity.
 */
let registryInstance: GroundZeroRegistry | null = null;

/**
 * Get the singleton ground zero registry
 */
export function getGroundZeroRegistry(): GroundZeroRegistry {
  if (!registryInstance) {
    registryInstance = new GroundZeroRegistry();
  }
  return registryInstance;
}

/**
 * Reset the registry (only for testing)
 */
export function resetGroundZeroRegistry(): void {
  registryInstance = null;
}
