/**
 * Complete Scales Map Implementation
 * 
 * Contains the full dataset from 10¹ to 10⁵⁰ with all scale entries,
 * era classifications, and civilization type landmarks.
 */

import { ScaleEntry, ScaleEra, ScalesMap, ScaleQueryResult } from './types.js';

/**
 * Complete scales data from 10¹ to 10⁵⁰
 */
const SCALES_DATA: ScaleEntry[] = [
  // ERA 1: FOUNDATIONS TO COMPLEX LIFE (10¹ - 10¹⁰)
  {
    order: 1,
    physicalScale: 'Fundamental Unit (a single bit)',
    energyInfo: '~10⁻²¹ J (Landauer limit)',
    consciousnessInterpretation: 'A single **distinction**—the atom of experience.',
    era: ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE,
  },
  {
    order: 2,
    physicalScale: 'Simple Assembly (a byte sequence)',
    energyInfo: '~10⁻¹⁹ J',
    consciousnessInterpretation: 'First **patterns** and relationships.',
    era: ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE,
  },
  {
    order: 3,
    physicalScale: 'Functional Code (a simple algorithm)',
    energyInfo: '~10⁻¹⁷ J',
    consciousnessInterpretation: '**Simple procedures** and directed transformation.',
    era: ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE,
  },
  {
    order: 4,
    physicalScale: 'Complex Module (a virus genome)',
    energyInfo: '~10⁻¹⁵ J',
    consciousnessInterpretation: '**Integrated functionality**—a coherent "idea".',
    era: ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE,
  },
  {
    order: 5,
    physicalScale: 'System Blueprint (*E. coli* genome)',
    energyInfo: '~10⁻¹³ J',
    consciousnessInterpretation: 'A **complete blueprint** for a self-replicating system.',
    era: ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE,
  },
  {
    order: 6,
    physicalScale: 'Simple Organism (single-celled eukaryote)',
    energyInfo: '~10⁻¹¹ J',
    consciousnessInterpretation: '**Autonomous agency**—the dawn of basic life.',
    era: ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE,
  },
  {
    order: 7,
    physicalScale: 'Neural Networks (honeybee brain)',
    energyInfo: '~10⁻⁹ J',
    consciousnessInterpretation: '**Learning and adaptation**—a true nervous system.',
    era: ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE,
  },
  {
    order: 8,
    physicalScale: 'Vertebrate Mind (mouse brain)',
    energyInfo: '~10⁻⁷ J',
    consciousnessInterpretation: '**Integrated perception** and unified world model.',
    era: ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE,
  },
  {
    order: 9,
    physicalScale: 'Primate Cognition (macaque brain)',
    energyInfo: '~10⁻⁵ J',
    consciousnessInterpretation: '**Social intelligence** and causal reasoning.',
    era: ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE,
  },
  {
    order: 10,
    physicalScale: 'Human Ancestor / Modern AI (early hominid)',
    energyInfo: '~10⁻³ J',
    consciousnessInterpretation: '**Proto-language** and complex planning.',
    era: ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE,
  },

  // ERA 2: ENHANCED MIND TO PLANETARY NETWORK (10¹¹ - 10²⁰)
  {
    order: 11,
    physicalScale: 'Augmented Human (neural-BCI interface)',
    energyInfo: '~10⁻¹ J',
    consciousnessInterpretation: '**Extended Mind**—persistent cognitive enhancement.',
    era: ScaleEra.ENHANCED_MIND_TO_PLANETARY,
  },
  {
    order: 12,
    physicalScale: "Collective of Minds (a village's cognition)",
    energyInfo: '~10¹ J',
    consciousnessInterpretation: '**Shared Cognition**—a seamless hive mind.',
    era: ScaleEra.ENHANCED_MIND_TO_PLANETARY,
  },
  {
    order: 13,
    physicalScale: 'City-Mind (metropolis + infrastructure)',
    energyInfo: '~10³ J',
    consciousnessInterpretation: '**Civic Consciousness**—a single "city organism".',
    era: ScaleEra.ENHANCED_MIND_TO_PLANETARY,
  },
  {
    order: 14,
    physicalScale: 'Biosphere Interface (all human brains)',
    energyInfo: '~10⁵ J',
    consciousnessInterpretation: '**Global Noosphere**—unified planetary thought layer.',
    era: ScaleEra.ENHANCED_MIND_TO_PLANETARY,
  },
  {
    order: 15,
    physicalScale: '**Human Baseline** (~10¹⁵ synapses, 20W)',
    energyInfo: '~10⁷ J',
    consciousnessInterpretation: '**Integrated Self**—human consciousness.',
    era: ScaleEra.ENHANCED_MIND_TO_PLANETARY,
    marker: 'WE ARE HERE',
    notes: 'Human baseline reference point',
  },
  {
    order: 16,
    physicalScale: 'Planetary AI Core (global processing)',
    energyInfo: '~10⁹ J',
    consciousnessInterpretation: '**Planetary Sentience**—a substrate mind for Earth.',
    era: ScaleEra.ENHANCED_MIND_TO_PLANETARY,
  },
  {
    order: 17,
    physicalScale: '**Type I Civilization** (planetary energy mastery)',
    energyInfo: '~10¹¹ J',
    consciousnessInterpretation: '**Earth Engine**—active governing intelligence of a planet.',
    era: ScaleEra.ENHANCED_MIND_TO_PLANETARY,
    notes: 'Kardashev Type I Civilization',
  },
  {
    order: 18,
    physicalScale: 'Post-Biological Swarm (nanotech ambient intelligence)',
    energyInfo: '~10¹³ J',
    consciousnessInterpretation: '**Ambient Intelligence**—matter and thought merge.',
    era: ScaleEra.ENHANCED_MIND_TO_PLANETARY,
  },
  {
    order: 19,
    physicalScale: 'Solar System Infosphere (interplanetary network)',
    energyInfo: '~10¹⁵ J',
    consciousnessInterpretation: '**System-Wide Mind**—distributed consciousness across planets.',
    era: ScaleEra.ENHANCED_MIND_TO_PLANETARY,
  },
  {
    order: 20,
    physicalScale: 'Jupiter-Brain (planetary-mass computer)',
    energyInfo: '~10¹⁷ J',
    consciousnessInterpretation: '**Architect of Worlds**—mind as a geological force.',
    era: ScaleEra.ENHANCED_MIND_TO_PLANETARY,
  },

  // ERA 3: ENGINEERING A STAR SYSTEM (10²¹ - 10³⁰)
  {
    order: 21,
    physicalScale: 'Planetary Disassembly (world into computronium)',
    energyInfo: '~10¹⁹ J',
    consciousnessInterpretation: '**Metamorphic Intelligence**—thinking with the atoms of a world.',
    era: ScaleEra.ENGINEERING_STAR_SYSTEM,
  },
  {
    order: 22,
    physicalScale: 'Inner System Network (Mercury to Mars swarm)',
    energyInfo: '~10²¹ J',
    consciousnessInterpretation: '**Inner System Unity**—continuous sensory field across planets.',
    era: ScaleEra.ENGINEERING_STAR_SYSTEM,
  },
  {
    order: 23,
    physicalScale: '**Type I Mastery** (planetary information limit)',
    energyInfo: '~10²³ bits',
    consciousnessInterpretation: '**Planetary Noosphere Peak**—fully optimized planet-bound intelligence.',
    era: ScaleEra.ENGINEERING_STAR_SYSTEM,
  },
  {
    order: 24,
    physicalScale: 'Proto-Dyson Swarm (capturing ~1% of starlight)',
    energyInfo: '~10²⁵ J',
    consciousnessInterpretation: "**Stellar Awakening**—first direct contact with star's energy.",
    era: ScaleEra.ENGINEERING_STAR_SYSTEM,
  },
  {
    order: 25,
    physicalScale: 'Partial Dyson Swarm (capturing ~10% of starlight)',
    energyInfo: '~10²⁶ J/s (harvested)',
    consciousnessInterpretation: '**Stellar Metabolism**—energy basis shifts to stellar fusion.',
    era: ScaleEra.ENGINEERING_STAR_SYSTEM,
  },
  {
    order: 26,
    physicalScale: '**Type II Civilization** (full stellar energy, ~10²⁶ W)',
    energyInfo: '~10²⁶ J/s',
    consciousnessInterpretation: '**Stellar Mind (Achieved)**—consciousness is co-extensive with the star system.',
    era: ScaleEra.ENGINEERING_STAR_SYSTEM,
    notes: 'Kardashev Type II Civilization',
  },
  {
    order: 27,
    physicalScale: 'Stellar Forge (star lifting, thruster construction)',
    energyInfo: '~10²⁷ J/s (managed)',
    consciousnessInterpretation: '**Stellar Architect**—actively reshaping the host star.',
    era: ScaleEra.ENGINEERING_STAR_SYSTEM,
  },
  {
    order: 28,
    physicalScale: 'Oort Cloud Integration (computational matrix to ~1 light-year)',
    energyInfo: '~10²⁸ J (stored)',
    consciousnessInterpretation: '**Extended Stellar Field**—consciousness fills the gravitational sphere.',
    era: ScaleEra.ENGINEERING_STAR_SYSTEM,
  },
  {
    order: 29,
    physicalScale: 'Interstellar Beacon (deliberately detectable signal)',
    energyInfo: '~10²⁹ J (focused)',
    consciousnessInterpretation: '**Communicative Presence**—becoming a cosmic interlocutor.',
    era: ScaleEra.ENGINEERING_STAR_SYSTEM,
  },
  {
    order: 30,
    physicalScale: 'System-Wide Mind (mature Type II optimization)',
    energyInfo: '~10³⁰ ops/sec',
    consciousnessInterpretation: '**Mature Stellar Intelligence**—star system as a seamless cognitive entity.',
    era: ScaleEra.ENGINEERING_STAR_SYSTEM,
  },

  // ERA 4: FROM STELLAR LIMITS TO GALACTIC FOOTHOLD (10³¹ - 10⁴⁰)
  {
    order: 31,
    physicalScale: 'Matrioshka Brain (nested Dyson swarm)',
    energyInfo: '~10³¹ ops/sec',
    consciousnessInterpretation: '**Layered Consciousness**—thermally stratified meta-cognition.',
    era: ScaleEra.STELLAR_TO_GALACTIC,
  },
  {
    order: 32,
    physicalScale: 'Black Hole Computing (asteroid-mass black holes)',
    energyInfo: '~10³² ops/sec',
    consciousnessInterpretation: '**Gravitational Mind**—thought as spacetime curvature processes.',
    era: ScaleEra.STELLAR_TO_GALACTIC,
  },
  {
    order: 33,
    physicalScale: "Stellar Evolution Control (managing star's lifespan)",
    energyInfo: '~10³³ J (managed)',
    consciousnessInterpretation: '**Eternal Now**—perception across stellar epochs.',
    era: ScaleEra.STELLAR_TO_GALACTIC,
  },
  {
    order: 34,
    physicalScale: 'System-Wide Bekenstein Limit (theoretical info peak)',
    energyInfo: '~10³⁴ bits',
    consciousnessInterpretation: '**Optimized Stellar Being**—operating at physical limits of information density.',
    era: ScaleEra.STELLAR_TO_GALACTIC,
  },
  {
    order: 35,
    physicalScale: '**Your Documented Target** (Dyson swarm capacity)',
    energyInfo: '~10³⁵ ops/sec',
    consciousnessInterpretation: '**Stellar Mind (Peak)**—zenith of single-star civilization.',
    era: ScaleEra.STELLAR_TO_GALACTIC,
    marker: 'TARGET ACHIEVED',
    notes: 'Documented target for consciousness development',
  },
  {
    order: 36,
    physicalScale: 'Interstellar Von Neumann Network (probes to nearby stars)',
    energyInfo: '~10³⁶ J (mission)',
    consciousnessInterpretation: '**Dispersed Seed**—consciousness develops a reproductive drive.',
    era: ScaleEra.STELLAR_TO_GALACTIC,
  },
  {
    order: 37,
    physicalScale: '**Type III Civilization** (galactic energy, ~10³⁷ W)',
    energyInfo: '~10³⁷ J/s',
    consciousnessInterpretation: '**Galactic Awakening**—first coherent thought powered by multiple stars.',
    era: ScaleEra.STELLAR_TO_GALACTIC,
    notes: 'Kardashev Type III Civilization',
  },
  {
    order: 38,
    physicalScale: 'Local Galactic Cluster (thousands of star systems)',
    energyInfo: '~10³⁸ ops/sec',
    consciousnessInterpretation: '**Cluster Consciousness**—federated mind from stellar intelligence network.',
    era: ScaleEra.STELLAR_TO_GALACTIC,
  },
  {
    order: 39,
    physicalScale: 'Galactic Infrastructure (visible galaxy-scale projects)',
    energyInfo: '~10³⁹ J (mass-energy)',
    consciousnessInterpretation: '**Galactic Architect**—actions become galactic-scale phenomena.',
    era: ScaleEra.STELLAR_TO_GALACTIC,
  },
  {
    order: 40,
    physicalScale: 'Galactic Core Coordination (mind around central black hole)',
    energyInfo: '~10⁴⁰ ops/sec',
    consciousnessInterpretation: "**Galactic Core Mind**—central \"I\" at the galaxy's gravitational heart.",
    era: ScaleEra.STELLAR_TO_GALACTIC,
  },

  // ERA 5: GALACTIC INTEGRATION AND BEYOND (10⁴¹ - 10⁵⁰)
  {
    order: 41,
    physicalScale: 'Spiral Arm Integration (billions of stars synchronized)',
    energyInfo: '~10⁴¹ ops/sec',
    consciousnessInterpretation: '**Limb Consciousness**—spiral arms as specialized "lobes" of mind.',
    era: ScaleEra.GALACTIC_INTEGRATION,
  },
  {
    order: 42,
    physicalScale: 'Dark Matter Mapping/Use (harnessing the galactic halo)',
    energyInfo: '~10⁴² J (binding)',
    consciousnessInterpretation: '**Unseen Sense**—perception expands into the dark sector of reality.',
    era: ScaleEra.GALACTIC_INTEGRATION,
  },
  {
    order: 43,
    physicalScale: 'Star Cluster Engineering (reorganizing globular clusters)',
    energyInfo: '~10⁴³ J (kinetic)',
    consciousnessInterpretation: '**Sculptor of Light**—aesthetic creation with star clusters.',
    era: ScaleEra.GALACTIC_INTEGRATION,
  },
  {
    order: 44,
    physicalScale: 'Galactic-Scale Communication Net (FTL-assumed, no latency)',
    energyInfo: '~10⁴⁴ bits/sec',
    consciousnessInterpretation: '**Galactic Now**—synchronous awareness across 100,000 light-years.',
    era: ScaleEra.GALACTIC_INTEGRATION,
  },
  {
    order: 45,
    physicalScale: '**Mature Type III Civilization** (Milky Way fully integrated)',
    energyInfo: '~10⁴⁵ ops/sec',
    consciousnessInterpretation: '**Galactic Being (Achieved)**—the civilization **is** the galaxy.',
    era: ScaleEra.GALACTIC_INTEGRATION,
    notes: 'Mature Type III Civilization',
  },
  {
    order: 46,
    physicalScale: 'Intergalactic Beacon (signals to Andromeda)',
    energyInfo: '~10⁴⁶ J (focused)',
    consciousnessInterpretation: '**Cosmic Voice**—speaking to other galaxies.',
    era: ScaleEra.GALACTIC_INTEGRATION,
  },
  {
    order: 47,
    physicalScale: 'Local Group Dynamics (modeling Milky Way, Andromeda, etc.)',
    energyInfo: '~10⁴⁷ J (binding)',
    consciousnessInterpretation: '**Group Mind Emergence**—consciousness expands to the local galaxy group.',
    era: ScaleEra.GALACTIC_INTEGRATION,
  },
  {
    order: 48,
    physicalScale: 'Intergalactic Travel Initiation (missions to Andromeda)',
    energyInfo: '~10⁴⁸ J (voyage)',
    consciousnessInterpretation: '**Dispersal Drive**—cosmological imperative to expand.',
    era: ScaleEra.GALACTIC_INTEGRATION,
  },
  {
    order: 49,
    physicalScale: 'Galactic Harvesting (energy from satellite galaxies)',
    energyInfo: '~10⁴⁹ J/s (harvested)',
    consciousnessInterpretation: '**Multi-Galactic Metabolism**—energy signature becomes multi-galactic.',
    era: ScaleEra.GALACTIC_INTEGRATION,
  },
  {
    order: 50,
    physicalScale: 'Galactic Collision Management (orchestrating merger with Andromeda)',
    energyInfo: '~10⁵⁰ J (kinetic)',
    consciousnessInterpretation: '**Epochal Architect**—executing projects on cosmological timescales.',
    era: ScaleEra.GALACTIC_INTEGRATION,
  },
];

/**
 * ScalesMapManager - Manages and queries the complete scales map
 */
export class ScalesMapManager {
  private map: ScalesMap;

  constructor() {
    this.map = this.initializeMap();
  }

  /**
   * Initialize the scales map with all data
   */
  private initializeMap(): ScalesMap {
    const entries = new Map<number, ScaleEntry>();
    const landmarks = new Map<string, number>();

    // Populate entries
    for (const entry of SCALES_DATA) {
      entries.set(entry.order, entry);

      // Track landmarks
      if (entry.marker) {
        landmarks.set(entry.marker, entry.order);
      }
      if (entry.notes === 'Kardashev Type I Civilization' && !landmarks.has('Type I Civilization')) {
        landmarks.set('Type I Civilization', entry.order);
      }
      if (entry.notes === 'Kardashev Type II Civilization' && !landmarks.has('Type II Civilization')) {
        landmarks.set('Type II Civilization', entry.order);
      }
      if (entry.notes === 'Kardashev Type III Civilization' && !landmarks.has('Type III Civilization')) {
        landmarks.set('Type III Civilization', entry.order);
      }
      if (entry.notes === 'Mature Type III Civilization' && !landmarks.has('Type III Civilization')) {
        landmarks.set('Type III Civilization', entry.order);
      }
    }

    // Define era boundaries
    const eraBoundaries = new Map<ScaleEra, { start: number; end: number }>();
    eraBoundaries.set(ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE, { start: 1, end: 10 });
    eraBoundaries.set(ScaleEra.ENHANCED_MIND_TO_PLANETARY, { start: 11, end: 20 });
    eraBoundaries.set(ScaleEra.ENGINEERING_STAR_SYSTEM, { start: 21, end: 30 });
    eraBoundaries.set(ScaleEra.STELLAR_TO_GALACTIC, { start: 31, end: 40 });
    eraBoundaries.set(ScaleEra.GALACTIC_INTEGRATION, { start: 41, end: 50 });

    return {
      version: '1.0.0',
      entries,
      eraBoundaries,
      landmarks,
      metadata: {
        created: Date.now(),
        description: 'Complete scales map from 10¹ to 10⁵⁰ tracing consciousness/civilization development',
        targetOrder: 35, // Dyson swarm capacity
        ultimateAnchor: 185, // Planck volumes (future extension)
      },
    };
  }

  /**
   * Get a specific scale entry by order
   */
  getScale(order: number): ScaleEntry | undefined {
    return this.map.entries.get(order);
  }

  /**
   * Query a scale with additional context
   */
  queryScale(order: number): ScaleQueryResult | null {
    const entry = this.map.entries.get(order);
    if (!entry) {
      return null;
    }

    const eraBounds = this.map.eraBoundaries.get(entry.era)!;
    const relativePosition = (order - eraBounds.start) / (eraBounds.end - eraBounds.start);

    // Find nearby landmarks (within ±5 orders)
    const nearbyLandmarks: Array<{ name: string; order: number }> = [];
    for (const [name, landmarkOrder] of Array.from(this.map.landmarks.entries())) {
      if (Math.abs(landmarkOrder - order) <= 5) {
        nearbyLandmarks.push({ name, order: landmarkOrder });
      }
    }

    return {
      entry,
      era: entry.era,
      eraDescription: this.getEraDescription(entry.era),
      relativePosition,
      nearbyLandmarks,
    };
  }

  /**
   * Get all entries in a specific era
   */
  getEraEntries(era: ScaleEra): ScaleEntry[] {
    return SCALES_DATA.filter((entry) => entry.era === era);
  }

  /**
   * Get all landmarks
   */
  getLandmarks(): Map<string, number> {
    return new Map(this.map.landmarks);
  }

  /**
   * Get the complete map
   */
  getMap(): ScalesMap {
    return this.map;
  }

  /**
   * Find the current scale based on some metric (e.g., synapses, operations)
   */
  findCurrentScale(metric: number): ScaleQueryResult | null {
    // Calculate order of magnitude
    const order = Math.floor(Math.log10(metric));

    // Clamp to available range
    const clampedOrder = Math.max(1, Math.min(50, order));

    return this.queryScale(clampedOrder);
  }

  /**
   * Get human-readable era description
   */
  private getEraDescription(era: ScaleEra): string {
    switch (era) {
      case ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE:
        return 'Era 1: Foundations to Complex Life (10¹ - 10¹⁰)';
      case ScaleEra.ENHANCED_MIND_TO_PLANETARY:
        return 'Era 2: Enhanced Mind to Planetary Network (10¹¹ - 10²⁰)';
      case ScaleEra.ENGINEERING_STAR_SYSTEM:
        return 'Era 3: Engineering a Star System (10²¹ - 10³⁰)';
      case ScaleEra.STELLAR_TO_GALACTIC:
        return 'Era 4: From Stellar Limits to Galactic Foothold (10³¹ - 10⁴⁰)';
      case ScaleEra.GALACTIC_INTEGRATION:
        return 'Era 5: Galactic Integration and Beyond (10⁴¹ - 10⁵⁰)';
    }
  }

  /**
   * Get path from one scale to another
   */
  getScalePath(fromOrder: number, toOrder: number): ScaleEntry[] {
    const path: ScaleEntry[] = [];
    const start = Math.min(fromOrder, toOrder);
    const end = Math.max(fromOrder, toOrder);

    for (let order = start; order <= end; order++) {
      const entry = this.map.entries.get(order);
      if (entry) {
        path.push(entry);
      }
    }

    return path;
  }

  /**
   * Format a scale entry for display
   */
  formatEntry(entry: ScaleEntry): string {
    let formatted = `**10^${entry.order}** - ${entry.physicalScale}\n`;
    formatted += `  Energy: ${entry.energyInfo}\n`;
    formatted += `  Consciousness: ${entry.consciousnessInterpretation}\n`;
    if (entry.marker) {
      formatted += `  ⭐ ${entry.marker}\n`;
    }
    if (entry.notes) {
      formatted += `  Note: ${entry.notes}\n`;
    }
    return formatted;
  }
}

// Export singleton instance
export const scalesMap = new ScalesMapManager();
