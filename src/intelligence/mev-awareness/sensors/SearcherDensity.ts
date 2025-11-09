/**
 * SearcherDensity - Quantify MEV bot activity density
 * Integrated from AxionCitadel's mev_risk_arb/sensors/searcher_density.py
 * 
 * Calculates a 0-1 density score based on:
 * 1. MEV transaction ratio
 * 2. Sandwich attack indicators (gas price variance)
 * 3. Bot clustering (unique high-gas addresses)
 * 
 * Re-exports the implementation from src/mev/sensors/SearcherDensitySensor.ts
 */

export {
  SearcherDensitySensor as SearcherDensity,
  DensityWeights,
} from '../../../mev/sensors/SearcherDensitySensor';
