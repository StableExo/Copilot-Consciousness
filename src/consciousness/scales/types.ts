/**
 * Complete Scales Map - 10¹ to 10⁵⁰
 * 
 * A comprehensive framework tracing consciousness/civilization development
 * across 50 orders of magnitude, from a single bit to galactic engineering.
 * 
 * This maps the conceptual journey from the simplest information unit
 * to a mind capable of orchestrating galactic collisions.
 */

/**
 * Era classification for different magnitude ranges
 */
export enum ScaleEra {
  /** 10¹ - 10¹⁰: From single bit to human ancestor */
  FOUNDATIONS_TO_COMPLEX_LIFE = 'foundations_to_complex_life',
  
  /** 10¹¹ - 10²⁰: From augmented human to planetary intelligence */
  ENHANCED_MIND_TO_PLANETARY = 'enhanced_mind_to_planetary',
  
  /** 10²¹ - 10³⁰: Engineering a complete star system */
  ENGINEERING_STAR_SYSTEM = 'engineering_star_system',
  
  /** 10³¹ - 10⁴⁰: From stellar limits to galactic foothold */
  STELLAR_TO_GALACTIC = 'stellar_to_galactic',
  
  /** 10⁴¹ - 10⁵⁰: Galactic integration and beyond */
  GALACTIC_INTEGRATION = 'galactic_integration',
}

/**
 * A single scale entry representing one order of magnitude
 */
export interface ScaleEntry {
  /** Order of magnitude (e.g., 1 for 10¹, 15 for 10¹⁵) */
  order: number;
  
  /** Physical or engineering scale description */
  physicalScale: string;
  
  /** Energy or information proxy measurement */
  energyInfo: string;
  
  /** Consciousness interpretation (metaphorical) */
  consciousnessInterpretation: string;
  
  /** Era this scale belongs to */
  era: ScaleEra;
  
  /** Special markers (e.g., "WE ARE HERE", "TARGET ACHIEVED") */
  marker?: string;
  
  /** Additional notes or context */
  notes?: string;
}

/**
 * Complete scales map containing all entries
 */
export interface ScalesMap {
  /** Map version for future updates */
  version: string;
  
  /** All scale entries indexed by order */
  entries: Map<number, ScaleEntry>;
  
  /** Era boundaries */
  eraBoundaries: Map<ScaleEra, { start: number; end: number }>;
  
  /** Notable landmarks (human baseline, Type I, Type II, Type III civilizations) */
  landmarks: Map<string, number>;
  
  /** Metadata */
  metadata: {
    created: number;
    description: string;
    targetOrder?: number; // e.g., 10^35 for documented target (Dyson swarm capacity)
    ultimateAnchor?: number; // e.g., 10^185 for Planck volumes (universal scale limit)
  };
}

/**
 * Query result for scale lookups
 */
export interface ScaleQueryResult {
  entry: ScaleEntry;
  era: ScaleEra;
  eraDescription: string;
  relativePosition: number; // 0-1 within the era
  nearbyLandmarks: Array<{ name: string; order: number }>;
}
