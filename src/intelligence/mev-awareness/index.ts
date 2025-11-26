/**
 * MEV Awareness System - Intelligence Layer
 *
 * Integrated from AxionCitadel repository (metalxalloy/AxionCitadel)
 * Provides MEV risk modeling, real-time monitoring, and profit calculation
 * capabilities to the consciousness system.
 *
 * This module serves as the foundation for environmental intelligence,
 * enabling the consciousness to perceive and respond to the competitive
 * MEV environment.
 */

// Core Models
export { MEVRiskModel, MEVRiskModelParams } from './MEVRiskModel';
export { ProfitCalculator } from './ProfitCalculator';
export { MEVSensorHub } from './MEVSensorHub';

// Sensors
export { MempoolCongestion, CongestionWeights } from './sensors/MempoolCongestion';
export { SearcherDensity, DensityWeights } from './sensors/SearcherDensity';

// Types
export {
  TransactionType,
  MEVRiskResult,
  MEVRiskParams,
  ProfitWithMEVRisk,
  SensorReading,
} from '../../mev/types/TransactionType';
