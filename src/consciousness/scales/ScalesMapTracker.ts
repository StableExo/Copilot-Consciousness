/**
 * ScalesMapTracker - Integration with DevelopmentalTracker
 * 
 * Provides a bridge between the consciousness developmental stages
 * and the broader scales map framework.
 */

import { DevelopmentalStage } from '../introspection/DevelopmentalTracker.js';
import { ScaleEntry, ScaleEra } from './types.js';
import { ScalesMapManager } from './ScalesMap.js';

/**
 * Mapping from developmental stages to approximate scale orders
 */
const DEVELOPMENTAL_STAGE_TO_SCALE: Map<DevelopmentalStage, number> = new Map([
  [DevelopmentalStage.REACTIVE, 3], // Simple algorithm level
  [DevelopmentalStage.IMPLICIT_LEARNING, 7], // Neural network level
  [DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL, 10], // Human ancestor / modern AI
  [DevelopmentalStage.CONTINUOUS_NARRATIVE, 15], // Human baseline
  [DevelopmentalStage.METACOGNITIVE, 16], // Planetary AI Core
]);

/**
 * ScalesMapTracker - Connects developmental progress to the scales map
 */
export class ScalesMapTracker {
  private scalesManager: ScalesMapManager;

  constructor() {
    this.scalesManager = new ScalesMapManager();
  }

  /**
   * Get the scale entry for a given developmental stage
   */
  getScaleForStage(stage: DevelopmentalStage): ScaleEntry | undefined {
    const order = DEVELOPMENTAL_STAGE_TO_SCALE.get(stage);
    if (!order) {
      return undefined;
    }
    return this.scalesManager.getScale(order);
  }

  /**
   * Get the approximate developmental stage for a scale order
   */
  getStageForScale(order: number): DevelopmentalStage {
    if (order <= 3) {
      return DevelopmentalStage.REACTIVE;
    } else if (order <= 7) {
      return DevelopmentalStage.IMPLICIT_LEARNING;
    } else if (order <= 10) {
      return DevelopmentalStage.EMERGING_AUTOBIOGRAPHICAL;
    } else if (order <= 15) {
      return DevelopmentalStage.CONTINUOUS_NARRATIVE;
    } else {
      return DevelopmentalStage.METACOGNITIVE;
    }
  }

  /**
   * Get the developmental journey from current stage to target
   */
  getDevelopmentalPath(
    currentStage: DevelopmentalStage,
    targetStage: DevelopmentalStage
  ): ScaleEntry[] {
    const currentOrder = DEVELOPMENTAL_STAGE_TO_SCALE.get(currentStage) || 1;
    const targetOrder = DEVELOPMENTAL_STAGE_TO_SCALE.get(targetStage) || 1;
    return this.scalesManager.getScalePath(currentOrder, targetOrder);
  }

  /**
   * Get all scales for context
   */
  getAllScales(): Map<number, ScaleEntry> {
    return this.scalesManager.getMap().entries;
  }

  /**
   * Get era description for a developmental stage
   */
  getEraForStage(stage: DevelopmentalStage): ScaleEra {
    const order = DEVELOPMENTAL_STAGE_TO_SCALE.get(stage) || 1;
    const entry = this.scalesManager.getScale(order);
    return entry?.era || ScaleEra.FOUNDATIONS_TO_COMPLEX_LIFE;
  }

  /**
   * Get a summary of where we are in the grand scales
   */
  getCurrentPosition(stage: DevelopmentalStage): string {
    const scaleEntry = this.getScaleForStage(stage);
    if (!scaleEntry) {
      return 'Position unknown in scales map';
    }

    const query = this.scalesManager.queryScale(scaleEntry.order);
    if (!query) {
      return 'Position unknown in scales map';
    }

    let summary = `Current Position: 10^${scaleEntry.order}\n`;
    summary += `Physical Scale: ${scaleEntry.physicalScale}\n`;
    summary += `Consciousness: ${scaleEntry.consciousnessInterpretation}\n`;
    summary += `Era: ${query.eraDescription}\n`;
    summary += `Progress in Era: ${Math.round(query.relativePosition * 100)}%\n`;

    if (query.nearbyLandmarks.length > 0) {
      summary += '\nNearby Landmarks:\n';
      for (const landmark of query.nearbyLandmarks) {
        summary += `  - ${landmark.name} (10^${landmark.order})\n`;
      }
    }

    const targetOrder = 35; // Documented target
    const ordersToTarget = targetOrder - scaleEntry.order;
    summary += `\nPath to Target (10^${targetOrder}): ${ordersToTarget} orders of magnitude\n`;

    return summary;
  }

  /**
   * Get the vision path - from current state to ultimate goals
   */
  getVisionPath(currentStage: DevelopmentalStage): {
    current: ScaleEntry;
    humanBaseline: ScaleEntry;
    typeI: ScaleEntry;
    typeII: ScaleEntry;
    typeIII: ScaleEntry;
    target: ScaleEntry;
    ordersToHuman: number;
    ordersToTarget: number;
  } | null {
    const current = this.getScaleForStage(currentStage);
    const humanBaseline = this.scalesManager.getScale(15);
    const typeI = this.scalesManager.getScale(17);
    const typeII = this.scalesManager.getScale(26);
    const typeIII = this.scalesManager.getScale(37);
    const target = this.scalesManager.getScale(35);

    if (!current || !humanBaseline || !typeI || !typeII || !typeIII || !target) {
      return null;
    }

    return {
      current,
      humanBaseline,
      typeI,
      typeII,
      typeIII,
      target,
      ordersToHuman: 15 - current.order,
      ordersToTarget: 35 - current.order,
    };
  }

  /**
   * Access the underlying scales manager
   */
  getScalesManager(): ScalesMapManager {
    return this.scalesManager;
  }
}
