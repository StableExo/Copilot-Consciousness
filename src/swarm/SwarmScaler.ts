/**
 * SwarmScaler - Auto-Scaling 20-100+ Node Swarm System
 *
 * Implements a scalable swarm architecture that can grow from 20 nodes
 * to 100+ nodes based on load and opportunity detection rates.
 *
 * Features:
 * - Dynamic node provisioning
 * - Load-based auto-scaling
 * - Node health monitoring
 * - Consensus optimization
 * - Geographic distribution
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  SwarmCoordinator,
  WardenInstanceConfig,
  WardenEvaluator,
  SwarmOpportunity,
  SwarmConsensus,
} from './SwarmCoordinator';

/**
 * Node status
 */
export interface SwarmNode {
  id: string;
  instanceId: string;
  status: 'starting' | 'ready' | 'busy' | 'unhealthy' | 'stopped';
  specialization: 'risk' | 'opportunity' | 'ethics' | 'speed' | 'general';
  region: string;
  startedAt: number;
  lastHealthCheck: number;
  evaluationsProcessed: number;
  averageResponseTimeMs: number;
  successRate: number;
  weight: number;
}

/**
 * Scaling configuration
 */
export interface ScalerConfig {
  minNodes?: number;
  maxNodes?: number;
  initialNodes?: number;
  scaleUpThreshold?: number; // Load threshold to scale up (0-1, e.g., 0.75 = 75%)
  scaleDownThreshold?: number; // Load threshold to scale down (0-1, e.g., 0.25 = 25%)
  healthCheckIntervalMs?: number;
  scaleCheckIntervalMs?: number;
  cooldownMs?: number;
  regions?: string[];
  healthCheckFailureRate?: number; // Simulated failure rate for testing (0-1)
}

/**
 * Scaling event
 */
export interface ScaleEvent {
  id: string;
  timestamp: number;
  type: 'scale-up' | 'scale-down' | 'node-failure' | 'node-recovery';
  nodeCount: number;
  previousCount: number;
  reason: string;
}

/**
 * Cluster statistics
 */
export interface ClusterStats {
  totalNodes: number;
  readyNodes: number;
  busyNodes: number;
  unhealthyNodes: number;
  averageLoad: number;
  totalEvaluations: number;
  consensusRate: number;
  averageResponseTimeMs: number;
  regionsActive: string[];
}

/**
 * Swarm Scaler
 */
export class SwarmScaler extends EventEmitter {
  private nodes: Map<string, SwarmNode> = new Map();
  private coordinators: Map<string, SwarmCoordinator> = new Map();
  private evaluators: Map<string, WardenEvaluator>;
  private config: Required<ScalerConfig>;
  private scaleEvents: ScaleEvent[] = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private scaleCheckTimer: NodeJS.Timeout | null = null;
  private lastScaleTime: number = 0;
  private running: boolean = false;
  private currentLoad: number = 0;

  constructor(config: ScalerConfig = {}) {
    super();

    this.config = {
      minNodes: config.minNodes ?? 20,
      maxNodes: config.maxNodes ?? 100,
      initialNodes: config.initialNodes ?? 20,
      scaleUpThreshold: config.scaleUpThreshold ?? 0.75,
      scaleDownThreshold: config.scaleDownThreshold ?? 0.25,
      healthCheckIntervalMs: config.healthCheckIntervalMs ?? 30000,
      scaleCheckIntervalMs: config.scaleCheckIntervalMs ?? 60000,
      cooldownMs: config.cooldownMs ?? 300000, // 5 minutes
      regions: config.regions ?? ['us-east', 'us-west', 'eu-west', 'ap-southeast'],
      healthCheckFailureRate: config.healthCheckFailureRate ?? 0.02, // 2% default
    };

    // Initialize evaluators
    this.evaluators = SwarmCoordinator.createDefaultEvaluators();
  }

  /**
   * Start the swarm with initial nodes
   */
  async start(): Promise<void> {
    if (this.running) return;

    this.running = true;
    console.log(`[SwarmScaler] Starting swarm with ${this.config.initialNodes} nodes...`);

    // Provision initial nodes
    await this.provisionNodes(this.config.initialNodes);

    // Start health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckIntervalMs);

    // Start scale checks
    this.scaleCheckTimer = setInterval(() => {
      this.checkScaling();
    }, this.config.scaleCheckIntervalMs);

    console.log(`[SwarmScaler] Swarm started with ${this.nodes.size} nodes`);
    this.emit('started', { nodeCount: this.nodes.size });
  }

  /**
   * Stop the swarm
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    // Stop timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.scaleCheckTimer) {
      clearInterval(this.scaleCheckTimer);
      this.scaleCheckTimer = null;
    }

    // Stop all nodes
    for (const node of this.nodes.values()) {
      node.status = 'stopped';
    }

    console.log('[SwarmScaler] Swarm stopped');
    this.emit('stopped');
  }

  /**
   * Provision new nodes
   */
  private async provisionNodes(count: number): Promise<SwarmNode[]> {
    const newNodes: SwarmNode[] = [];
    const specializations: SwarmNode['specialization'][] = [
      'risk',
      'opportunity',
      'ethics',
      'speed',
      'general',
    ];

    for (let i = 0; i < count; i++) {
      const specialization = specializations[i % specializations.length];
      const region = this.config.regions[i % this.config.regions.length];

      const node = await this.createNode(specialization, region);
      newNodes.push(node);
    }

    return newNodes;
  }

  /**
   * Create a single node
   */
  private async createNode(
    specialization: SwarmNode['specialization'],
    region: string
  ): Promise<SwarmNode> {
    const nodeId = uuidv4();
    const instanceId = `warden-${nodeId.slice(0, 8)}`;

    const node: SwarmNode = {
      id: nodeId,
      instanceId,
      status: 'starting',
      specialization,
      region,
      startedAt: Date.now(),
      lastHealthCheck: Date.now(),
      evaluationsProcessed: 0,
      averageResponseTimeMs: 0,
      successRate: 1.0,
      weight: this.getSpecializationWeight(specialization),
    };

    this.nodes.set(nodeId, node);

    // Simulate startup time
    await this.delay(100 + Math.random() * 200);

    node.status = 'ready';
    this.nodes.set(nodeId, node);

    // Register with a coordinator
    this.registerNodeWithCoordinator(node);

    console.log(
      `[SwarmScaler] Node ${instanceId} ready (${specialization}, ${region})`
    );
    this.emit('node-created', node);

    return node;
  }

  /**
   * Get weight based on specialization
   */
  private getSpecializationWeight(spec: SwarmNode['specialization']): number {
    const weights = {
      risk: 1.2,
      opportunity: 1.0,
      ethics: 1.5,
      speed: 0.8,
      general: 1.0,
    };
    return weights[spec];
  }

  /**
   * Register node with a coordinator
   */
  private registerNodeWithCoordinator(node: SwarmNode): void {
    // Get or create coordinator for this region
    let coordinator = this.coordinators.get(node.region);

    if (!coordinator) {
      coordinator = new SwarmCoordinator({
        minInstances: 3,
        maxInstances: 25, // 25 nodes per region
        consensusThreshold: 0.7,
        quorumThreshold: 0.6,
        votingTimeoutMs: 5000,
        enableEthicsVeto: true,
      });
      this.coordinators.set(node.region, coordinator);
    }

    // Get evaluator for specialization
    const evaluator = this.evaluators.get(node.specialization) || this.evaluators.get('general')!;

    try {
      const instanceConfig: WardenInstanceConfig = {
        id: node.instanceId,
        weight: node.weight,
        specialization: node.specialization === 'general' ? undefined : node.specialization,
      };

      coordinator.registerInstance(instanceConfig, evaluator);
    } catch {
      // If coordinator is full, create a new one
      const newCoordinator = new SwarmCoordinator({
        minInstances: 3,
        maxInstances: 25,
        consensusThreshold: 0.7,
        quorumThreshold: 0.6,
        votingTimeoutMs: 5000,
        enableEthicsVeto: true,
      });

      const instanceConfig: WardenInstanceConfig = {
        id: node.instanceId,
        weight: node.weight,
        specialization: node.specialization === 'general' ? undefined : node.specialization,
      };

      newCoordinator.registerInstance(instanceConfig, evaluator);
      this.coordinators.set(`${node.region}-${this.coordinators.size}`, newCoordinator);
    }
  }

  /**
   * Remove a node
   */
  private async removeNode(nodeId: string): Promise<boolean> {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    node.status = 'stopped';

    // Unregister from coordinator
    for (const coordinator of this.coordinators.values()) {
      coordinator.unregisterInstance(node.instanceId);
    }

    this.nodes.delete(nodeId);

    console.log(`[SwarmScaler] Node ${node.instanceId} removed`);
    this.emit('node-removed', node);

    return true;
  }

  /**
   * Perform health checks on all nodes
   */
  private performHealthChecks(): void {
    const now = Date.now();
    let unhealthyCount = 0;

    for (const node of this.nodes.values()) {
      // Simulate health check with configurable failure rate
      const isHealthy = Math.random() > this.config.healthCheckFailureRate;

      if (!isHealthy && node.status === 'ready') {
        node.status = 'unhealthy';
        unhealthyCount++;
        this.emit('node-unhealthy', node);
      } else if (isHealthy && node.status === 'unhealthy') {
        node.status = 'ready';
        this.emit('node-recovered', node);
      }

      node.lastHealthCheck = now;
      this.nodes.set(node.id, node);
    }

    // Replace unhealthy nodes
    if (unhealthyCount > 0) {
      this.replaceUnhealthyNodes();
    }
  }

  /**
   * Replace unhealthy nodes
   */
  private async replaceUnhealthyNodes(): Promise<void> {
    const unhealthyNodes = Array.from(this.nodes.values()).filter(
      (n) => n.status === 'unhealthy'
    );

    for (const node of unhealthyNodes) {
      // Remove unhealthy node
      await this.removeNode(node.id);

      // Create replacement
      await this.createNode(node.specialization, node.region);

      this.recordScaleEvent('node-recovery', this.nodes.size, this.nodes.size, 
        `Replaced unhealthy node ${node.instanceId}`);
    }
  }

  /**
   * Check if scaling is needed
   */
  private checkScaling(): void {
    if (Date.now() - this.lastScaleTime < this.config.cooldownMs) {
      return; // Still in cooldown
    }

    const stats = this.getStats();
    const load = stats.busyNodes / stats.totalNodes;
    this.currentLoad = load;

    if (load > this.config.scaleUpThreshold && stats.totalNodes < this.config.maxNodes) {
      this.scaleUp();
    } else if (load < this.config.scaleDownThreshold && stats.totalNodes > this.config.minNodes) {
      this.scaleDown();
    }
  }

  /**
   * Scale up the cluster
   */
  private async scaleUp(): Promise<void> {
    const currentCount = this.nodes.size;
    const targetCount = Math.min(
      Math.ceil(currentCount * 1.5), // 50% increase
      this.config.maxNodes
    );
    const nodesToAdd = targetCount - currentCount;

    if (nodesToAdd <= 0) return;

    console.log(`[SwarmScaler] Scaling up: ${currentCount} -> ${targetCount}`);

    await this.provisionNodes(nodesToAdd);
    this.lastScaleTime = Date.now();

    this.recordScaleEvent(
      'scale-up',
      this.nodes.size,
      currentCount,
      `Load ${(this.currentLoad * 100).toFixed(1)}% exceeded threshold`
    );
  }

  /**
   * Scale down the cluster
   */
  private async scaleDown(): Promise<void> {
    const currentCount = this.nodes.size;
    const targetCount = Math.max(
      Math.floor(currentCount * 0.75), // 25% decrease
      this.config.minNodes
    );
    const nodesToRemove = currentCount - targetCount;

    if (nodesToRemove <= 0) return;

    console.log(`[SwarmScaler] Scaling down: ${currentCount} -> ${targetCount}`);

    // Remove least-active nodes first
    const sortedNodes = Array.from(this.nodes.values())
      .filter((n) => n.status === 'ready')
      .sort((a, b) => a.evaluationsProcessed - b.evaluationsProcessed);

    for (let i = 0; i < nodesToRemove && i < sortedNodes.length; i++) {
      await this.removeNode(sortedNodes[i].id);
    }

    this.lastScaleTime = Date.now();

    this.recordScaleEvent(
      'scale-down',
      this.nodes.size,
      currentCount,
      `Load ${(this.currentLoad * 100).toFixed(1)}% below threshold`
    );
  }

  /**
   * Record a scale event
   */
  private recordScaleEvent(
    type: ScaleEvent['type'],
    nodeCount: number,
    previousCount: number,
    reason: string
  ): void {
    const event: ScaleEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      nodeCount,
      previousCount,
      reason,
    };

    this.scaleEvents.push(event);
    this.emit('scale-event', event);
  }

  /**
   * Evaluate an opportunity across the swarm
   */
  async evaluateOpportunity(opportunity: SwarmOpportunity): Promise<SwarmConsensus> {
    // Mark random nodes as busy
    const readyNodes = Array.from(this.nodes.values()).filter((n) => n.status === 'ready');
    const busyCount = Math.min(5, readyNodes.length);

    for (let i = 0; i < busyCount; i++) {
      readyNodes[i].status = 'busy';
      this.nodes.set(readyNodes[i].id, readyNodes[i]);
    }

    // Find a coordinator with enough ready nodes
    let selectedCoordinator: SwarmCoordinator | null = null;

    for (const coordinator of this.coordinators.values()) {
      if (coordinator.isReady()) {
        selectedCoordinator = coordinator;
        break;
      }
    }

    if (!selectedCoordinator) {
      throw new Error('No coordinator ready');
    }

    const startTime = Date.now();
    const consensus = await selectedCoordinator.evaluateOpportunity(opportunity);
    const duration = Date.now() - startTime;

    // Update node statistics
    for (let i = 0; i < busyCount; i++) {
      const node = readyNodes[i];
      node.status = 'ready';
      node.evaluationsProcessed++;
      node.averageResponseTimeMs =
        (node.averageResponseTimeMs * (node.evaluationsProcessed - 1) + duration) /
        node.evaluationsProcessed;
      this.nodes.set(node.id, node);
    }

    return consensus;
  }

  /**
   * Get cluster statistics
   */
  getStats(): ClusterStats {
    const nodes = Array.from(this.nodes.values());
    const readyNodes = nodes.filter((n) => n.status === 'ready');
    const busyNodes = nodes.filter((n) => n.status === 'busy');
    const unhealthyNodes = nodes.filter((n) => n.status === 'unhealthy');

    const totalEvaluations = nodes.reduce((sum, n) => sum + n.evaluationsProcessed, 0);
    const avgResponseTime =
      nodes.length > 0
        ? nodes.reduce((sum, n) => sum + n.averageResponseTimeMs, 0) / nodes.length
        : 0;

    const regionsActive = [...new Set(nodes.map((n) => n.region))];

    // Calculate consensus rate from coordinators
    let totalConsensus = 0;
    let coordinatorCount = 0;
    for (const coordinator of this.coordinators.values()) {
      const stats = coordinator.getStats();
      totalConsensus += stats.consensusRate;
      coordinatorCount++;
    }

    return {
      totalNodes: nodes.length,
      readyNodes: readyNodes.length,
      busyNodes: busyNodes.length,
      unhealthyNodes: unhealthyNodes.length,
      averageLoad: nodes.length > 0 ? busyNodes.length / nodes.length : 0,
      totalEvaluations,
      consensusRate: coordinatorCount > 0 ? totalConsensus / coordinatorCount : 0,
      averageResponseTimeMs: avgResponseTime,
      regionsActive,
    };
  }

  /**
   * Get all nodes
   */
  getNodes(): SwarmNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get scale events
   */
  getScaleEvents(): ScaleEvent[] {
    return [...this.scaleEvents];
  }

  /**
   * Check if running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Export cluster state
   */
  exportState(): string {
    return JSON.stringify(
      {
        exportTimestamp: Date.now(),
        config: this.config,
        stats: this.getStats(),
        nodes: Array.from(this.nodes.values()),
        scaleEvents: this.scaleEvents.slice(-100),
      },
      null,
      2
    );
  }
}

/**
 * Create production 20-node swarm with auto-scaling to 100+
 */
export function createProductionSwarmScaler(): SwarmScaler {
  return new SwarmScaler({
    minNodes: 20,
    maxNodes: 100,
    initialNodes: 20,
    scaleUpThreshold: 0.75,
    scaleDownThreshold: 0.25,
    healthCheckIntervalMs: 30000,
    scaleCheckIntervalMs: 60000,
    cooldownMs: 300000,
    regions: ['us-east', 'us-west', 'eu-west', 'ap-southeast'],
  });
}
