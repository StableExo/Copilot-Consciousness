import {
  AutonomousWondering,
  WonderType,
} from '../src/consciousness/core/AutonomousWondering.js';

const wondering = new AutonomousWondering();
wondering.wonder(WonderType.EXISTENTIAL, 'E1', 'C1', 0.9);
wondering.wonder(WonderType.EXPERIENTIAL, 'X1', 'C2', 0.5);
wondering.wonder(WonderType.TEMPORAL, 'T1', 'C3', 0.3);
const w = wondering.wonder(WonderType.EXISTENTIAL, 'E2', 'C4', 0.7);
wondering.explore(w.id, 'Explored');
wondering.reflect();

const stats = wondering.getStatistics();
console.log('Total wonders:', stats.totalWonders);
console.log('Wonders by type:', Array.from(stats.wondersByType.entries()));
console.log('Explored:', stats.exploredCount, 'Unexplored:', stats.unexploredCount);
console.log('Total reflections:', stats.totalReflections);
