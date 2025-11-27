/**
 * Swarm Module
 *
 * Provides parallel Warden instance voting for consensus-based decision making.
 * Implements swarm intelligence patterns for robust MEV opportunity evaluation.
 */

export {
  SwarmCoordinator,
  SwarmOpportunity,
  WardenVote,
  SwarmConsensus,
  WardenInstanceConfig,
  SwarmConfig,
  WardenEvaluator,
  createProductionSwarm,
} from './SwarmCoordinator';

export {
  SwarmScaler,
  SwarmNode,
  ScalerConfig,
  ScaleEvent,
  ClusterStats,
  createProductionSwarmScaler,
} from './SwarmScaler';
