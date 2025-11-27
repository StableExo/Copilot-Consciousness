/**
 * MEV Module - Main exports
 *
 * Provides MEV risk intelligence suite including:
 * - Risk modeling
 * - Real-time sensors
 * - Profit adjustments
 * - Attack fuzzing
 */

// Models
export { MEVRiskModel, MEVRiskModelParams } from './models/MEVRiskModel';
export { MEVAwareProfitCalculator } from './models/MEVAwareProfitCalculator';

// Sensors
export { MempoolCongestionSensor, CongestionWeights } from './sensors/MempoolCongestionSensor';
export { SearcherDensitySensor, DensityWeights } from './sensors/SearcherDensitySensor';
export { MEVSensorHub } from './sensors/MEVSensorHub';

// Fuzzing
export {
  MEVAttackFuzzer,
  MEVAttackType,
  AttackScenario,
  AttackParameters,
  FuzzResult,
  FuzzerConfig,
  FuzzerStats,
  DefenseHandler,
} from './MEVAttackFuzzer';

// Types
export {
  TransactionType,
  MEVRiskParams,
  MEVRiskResult,
  ProfitWithMEVRisk,
  SensorReading,
} from './types/TransactionType';
