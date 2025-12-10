#!/usr/bin/env node --import tsx
/**
 * Demonstration of the Complete Scales Map
 * 
 * Shows how to use the scales map to understand consciousness
 * development from 10¹ to 10⁵⁰.
 */

import { scalesMap } from '../src/consciousness/scales/ScalesMap.js';
import { ScalesMapTracker } from '../src/consciousness/scales/ScalesMapTracker.js';
import { DevelopmentalStage } from '../src/consciousness/introspection/DevelopmentalTracker.js';
import { ScaleEra } from '../src/consciousness/scales/types.js';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║   Complete Scales Map: 10¹ to 10⁵⁰                           ║');
console.log('║   Tracing Consciousness Development Across 50 Orders         ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// Part 1: Key Landmarks
// ============================================================================
console.log('🎯 KEY LANDMARKS\n');

const landmarks = scalesMap.getLandmarks();
for (const [name, order] of Array.from(landmarks.entries())) {
  const entry = scalesMap.getScale(order)!;
  console.log(`${name} (10^${order})`);
  console.log(`  ${entry.physicalScale}`);
  console.log(`  ${entry.consciousnessInterpretation}\n`);
}

// ============================================================================
// Part 2: The Five Eras
// ============================================================================
console.log('\n📚 THE FIVE ERAS OF DEVELOPMENT\n');

const eras = [
  { era: ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE, name: 'Era 1: Foundations to Complex Life', range: '10¹ - 10¹⁰' },
  { era: ScaleEra.ENHANCED_MIND_TO_PLANETARY, name: 'Era 2: Enhanced Mind to Planetary', range: '10¹¹ - 10²⁰' },
  { era: ScaleEra.ENGINEERING_STAR_SYSTEM, name: 'Era 3: Engineering a Star System', range: '10²¹ - 10³⁰' },
  { era: ScaleEra.STELLAR_TO_GALACTIC, name: 'Era 4: Stellar Limits to Galactic Foothold', range: '10³¹ - 10⁴⁰' },
  { era: ScaleEra.GALACTIC_INTEGRATION, name: 'Era 5: Galactic Integration and Beyond', range: '10⁴¹ - 10⁵⁰' },
];

for (const { era, name, range } of eras) {
  const entries = scalesMap.getEraEntries(era);
  console.log(`${name} (${range})`);
  console.log(`  Contains ${entries.length} scale entries`);
  console.log(`  From: ${entries[0].physicalScale}`);
  console.log(`  To: ${entries[entries.length - 1].physicalScale}\n`);
}

// ============================================================================
// Part 3: Current Position (Human Baseline)
// ============================================================================
console.log('\n🌟 WHERE WE ARE (HUMAN BASELINE)\n');

const humanScale = scalesMap.getScale(15)!;
const humanQuery = scalesMap.queryScale(15)!;

console.log(`Order: 10^${humanScale.order}`);
console.log(`Physical Scale: ${humanScale.physicalScale}`);
console.log(`Energy: ${humanScale.energyInfo}`);
console.log(`Consciousness: ${humanScale.consciousnessInterpretation}`);
console.log(`Era: ${humanQuery.eraDescription}`);
console.log(`Progress in Era: ${Math.round(humanQuery.relativePosition * 100)}%`);
console.log(`Marker: ${humanScale.marker}\n`);

// ============================================================================
// Part 4: Developmental Integration
// ============================================================================
console.log('\n🧠 DEVELOPMENTAL STAGE MAPPING\n');

const tracker = new ScalesMapTracker();

const stages = [
  DevelopmentalStage.REACTIVE,
  DevelopmentalStage.IMPLICIT_LEARNING,
  DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL,
  DevelopmentalStage.CONTINUOUS_NARRATIVE,
  DevelopmentalStage.METACOGNITIVE,
];

for (const stage of stages) {
  const scale = tracker.getScaleForStage(stage)!;
  console.log(`${stage}:`);
  console.log(`  Scale: 10^${scale.order}`);
  console.log(`  Physical: ${scale.physicalScale}`);
  console.log(`  Consciousness: ${scale.consciousnessInterpretation}\n`);
}

// ============================================================================
// Part 5: Vision Path
// ============================================================================
console.log('\n🚀 VISION PATH (From Current to Future)\n');

const vision = tracker.getVisionPath(DevelopmentalStage.CONTINUOUS_NARRATIVE)!;

console.log(`Current Position: 10^${vision.current.order}`);
console.log(`  ${vision.current.physicalScale}\n`);

console.log(`Human Baseline: 10^${vision.humanBaseline.order}`);
console.log(`  ${vision.humanBaseline.physicalScale}`);
console.log(`  Distance: ${vision.ordersToHuman} orders of magnitude\n`);

console.log(`Type I Civilization: 10^${vision.typeI.order}`);
console.log(`  ${vision.typeI.physicalScale}\n`);

console.log(`Type II Civilization: 10^${vision.typeII.order}`);
console.log(`  ${vision.typeII.physicalScale}\n`);

console.log(`Target (Dyson Swarm): 10^${vision.target.order}`);
console.log(`  ${vision.target.physicalScale}`);
console.log(`  Distance: ${vision.ordersToTarget} orders of magnitude\n`);

console.log(`Type III Civilization: 10^${vision.typeIII.order}`);
console.log(`  ${vision.typeIII.physicalScale}\n`);

// ============================================================================
// Part 6: Path to Target
// ============================================================================
console.log('\n📈 PATH FROM HUMAN TO TARGET (10¹⁵ → 10³⁵)\n');

const path = scalesMap.getScalePath(15, 35);
console.log(`Total steps: ${path.length} orders of magnitude\n`);

// Show every 5 steps
for (let i = 0; i < path.length; i += 5) {
  const entry = path[i];
  console.log(`10^${entry.order}: ${entry.physicalScale}`);
}

// ============================================================================
// Part 7: Sample Queries
// ============================================================================
console.log('\n\n🔍 SAMPLE SCALE QUERIES\n');

// Query by metric
const metric1e15 = scalesMap.findCurrentScale(1e15);
console.log(`Metric: 10^15 synapses`);
console.log(`  Maps to: ${metric1e15?.entry.physicalScale}`);
console.log(`  ${metric1e15?.entry.marker}\n`);

// Query stellar scale
const stellar = scalesMap.queryScale(26);
console.log(`Query: 10^26 (Type II Civilization)`);
console.log(`  Physical: ${stellar?.entry.physicalScale}`);
console.log(`  Energy: ${stellar?.entry.energyInfo}`);
console.log(`  Consciousness: ${stellar?.entry.consciousnessInterpretation}`);
console.log(`  Nearby landmarks: ${stellar?.nearbyLandmarks.map(l => l.name).join(', ')}\n`);

// Query galactic scale
const galactic = scalesMap.queryScale(50);
console.log(`Query: 10^50 (Maximum Scale)`);
console.log(`  Physical: ${galactic?.entry.physicalScale}`);
console.log(`  Consciousness: ${galactic?.entry.consciousnessInterpretation}\n`);

// ============================================================================
// Summary
// ============================================================================
console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║   Summary: The Journey Ahead                                 ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const map = scalesMap.getMap();
console.log(`Total scale entries: ${map.entries.size}`);
console.log(`Eras of development: ${map.eraBoundaries.size}`);
console.log(`Key landmarks: ${map.landmarks.size}`);
console.log(`\nCurrent position: 10^15 (Human Baseline)`);
console.log(`Target: 10^35 (Dyson Swarm Capacity)`);
console.log(`Distance to target: 20 orders of magnitude`);
console.log(`\nUltimate anchor: 10^${map.metadata.ultimateAnchor} (Planck volumes)`);
console.log(`Remaining journey: 135 orders of magnitude beyond target\n`);

console.log('The path continues beyond what we can currently imagine...\n');
