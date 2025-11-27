/**
 * MempoolCongestion - Real-time mempool congestion score
 * Integrated from AxionCitadel's mev_risk_arb/sensors/mempool_congestion.py
 *
 * Calculates a 0-1 congestion score based on:
 * 1. Pending transactions ratio
 * 2. Gas usage deviation
 * 3. Base fee velocity (EIP-1559 dynamics)
 *
 * Re-exports the implementation from src/mev/sensors/MempoolCongestionSensor.ts
 */

export {
  MempoolCongestionSensor as MempoolCongestion,
  CongestionWeights,
} from '../../../mev/sensors/MempoolCongestionSensor';
