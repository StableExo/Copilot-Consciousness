/**
 * Warden Bootstrap
 *
 * Provides a streamlined bootstrap class for TheWarden that:
 * - Combines initialization from initializer.ts and Phase3Initializer.ts
 * - Encapsulates the startup sequence
 * - Provides clean lifecycle management (start, stop)
 *
 * This module consolidates the initialization logic that was previously
 * spread across main.ts to provide a cleaner architecture.
 *
 * Usage:
 * ```typescript
 * import { WardenBootstrap } from './core/bootstrap';
 *
 * const warden = new WardenBootstrap();
 * await warden.initialize();
 * await warden.start();
 * // ... on shutdown
 * await warden.shutdown();
 * ```
 */

import { EventEmitter } from 'events';
import { formatEther, parseEther } from 'ethers';
import { logger } from '../utils/logger';
import { validateAndLogConfig, ValidatedConfig } from '../utils/configValidator';
import { initializeComponents, shutdownComponents, InitializedComponents } from './initializer';
import {
  initializePhase3Components,
  shutdownPhase3Components,
  Phase3Components,
  getPhase3Status,
} from './Phase3Initializer';
import {
  loadPhase3Config,
  validatePhase3Config,
  getPhase3ConfigSummary,
} from '../config/phase3.config';
import { ArbitrageConsciousness } from '../consciousness/ArbitrageConsciousness';
import { CognitiveCoordinator } from '../consciousness/coordination/CognitiveCoordinator';
import { EmergenceDetector } from '../consciousness/coordination/EmergenceDetector';
import { DashboardServer } from '../dashboard/DashboardServer';
import { GasAnalytics } from '../gas/GasAnalytics';
import { CrossChainAnalytics } from '../chains/CrossChainAnalytics';
import { DashboardConfig } from '../dashboard/types';
import { getScanTokens, getNetworkName, getTokensByChainId } from '../utils/chainTokens';
import { SensoryMemory } from '../consciousness/sensory_memory';
import { TemporalAwarenessFramework } from '../consciousness/temporal_awareness';
import { PerceptionStream } from '../services/PerceptionStream';
import { ArbitragePath } from '../arbitrage/types';

/**
 * Statistics tracked by WardenBootstrap
 */
export interface WardenStats {
  startTime: number;
  cyclesCompleted: number;
  opportunitiesFound: number;
  tradesExecuted: number;
  totalProfit: bigint;
  errors: number;
}

/**
 * WardenBootstrap - Unified initialization and lifecycle management
 *
 * Consolidates all initialization logic into a single class with clear phases:
 * 1. Configuration validation
 * 2. Core component initialization (provider, wallet, orchestrators)
 * 3. Phase 3 AI/ML component initialization
 * 4. Consciousness coordination initialization
 * 5. Dashboard and monitoring setup
 */
export class WardenBootstrap extends EventEmitter {
  private config?: ValidatedConfig;
  private components?: InitializedComponents;
  private phase3Components?: Phase3Components;
  private consciousness?: ArbitrageConsciousness;
  private cognitiveCoordinator?: CognitiveCoordinator;
  private emergenceDetector?: EmergenceDetector;
  private dashboardServer?: DashboardServer;
  private perceptionStream?: PerceptionStream;
  private scanInterval?: NodeJS.Timeout;
  private isRunning = false;
  private shuttingDown = false;

  private stats: WardenStats = {
    startTime: Date.now(),
    cyclesCompleted: 0,
    opportunitiesFound: 0,
    tradesExecuted: 0,
    totalProfit: BigInt(0),
    errors: 0,
  };

  /**
   * Initialize all components
   *
   * This method orchestrates the complete initialization sequence:
   * 1. Validates configuration from environment
   * 2. Initializes core blockchain components
   * 3. Initializes Phase 3 AI components
   * 4. Sets up consciousness coordination
   * 5. Starts dashboard (optional)
   */
  async initialize(): Promise<void> {
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('  AEV WARDEN.BOT – BOOTSTRAP INITIALIZING');
    logger.info('═══════════════════════════════════════════════════════════');

    try {
      // Phase 1: Configuration Validation
      logger.info('[Bootstrap] Phase 1: Configuration validation...');
      this.config = validateAndLogConfig(logger);
      logger.info('[Bootstrap] ✓ Configuration validated');

      // Phase 2: Core Component Initialization
      logger.info('[Bootstrap] Phase 2: Core components...');
      this.components = await initializeComponents(this.config);
      logger.info('[Bootstrap] ✓ Core components initialized');

      // Phase 3: AI/ML Component Initialization
      logger.info('[Bootstrap] Phase 3: AI/ML components...');
      await this.initializePhase3();
      logger.info('[Bootstrap] ✓ AI/ML components initialized');

      // Phase 4: Consciousness Coordination
      logger.info('[Bootstrap] Phase 4: Consciousness coordination...');
      await this.initializeConsciousness();
      logger.info('[Bootstrap] ✓ Consciousness coordination initialized');

      // Phase 5: Dashboard Setup (optional)
      if (process.env.DISABLE_DASHBOARD !== 'true') {
        logger.info('[Bootstrap] Phase 5: Dashboard...');
        await this.initializeDashboard();
        logger.info('[Bootstrap] ✓ Dashboard initialized');
      }

      // Phase 6: Perception Stream
      logger.info('[Bootstrap] Phase 6: Perception stream...');
      this.initializePerceptionStream();
      logger.info('[Bootstrap] ✓ Perception stream initialized');

      logger.info('═══════════════════════════════════════════════════════════');
      logger.info('[Bootstrap] ✓ All components initialized successfully');
      logger.info('═══════════════════════════════════════════════════════════');

      this.emit('initialized');
    } catch (error) {
      logger.error(`[Bootstrap] Initialization failed: ${error}`);
      throw error;
    }
  }

  /**
   * Initialize Phase 3 AI/ML components
   */
  private async initializePhase3(): Promise<void> {
    const phase3Config = loadPhase3Config();

    // Validate Phase 3 configuration
    const validation = validatePhase3Config(phase3Config);
    if (!validation.valid) {
      logger.warn('[Bootstrap] Phase 3 configuration warnings:');
      validation.errors.forEach((err) => logger.warn(`  - ${err}`));
    }

    // Log configuration summary
    logger.info(getPhase3ConfigSummary(phase3Config));

    // Initialize Phase 3 components
    this.phase3Components = await initializePhase3Components(
      phase3Config,
      this.components?.arbitrageConfig
    );
  }

  /**
   * Initialize consciousness coordination system
   */
  private async initializeConsciousness(): Promise<void> {
    this.consciousness = new ArbitrageConsciousness(0.05, 1000);
    const modules = this.consciousness.getModules();
    this.cognitiveCoordinator = new CognitiveCoordinator(modules);
    this.emergenceDetector = new EmergenceDetector();
    logger.info('[Bootstrap] Consciousness coordination ready - 14 cognitive modules active');
  }

  /**
   * Initialize perception stream
   */
  private initializePerceptionStream(): void {
    const sensoryMemory = new SensoryMemory();
    const temporalFramework = new TemporalAwarenessFramework();
    this.perceptionStream = new PerceptionStream(sensoryMemory, temporalFramework);
    this.perceptionStream.initialize();
  }

  /**
   * Initialize dashboard server
   */
  private async initializeDashboard(): Promise<void> {
    try {
      const gasAnalytics = new GasAnalytics();
      const crossChainAnalytics = new CrossChainAnalytics();

      const dashboardConfig: Partial<DashboardConfig> = {
        port: parseInt(process.env.DASHBOARD_PORT || '3000'),
        enableCors: true,
        updateInterval: parseInt(process.env.UPDATE_INTERVAL || '1000'),
        maxConnections: parseInt(process.env.MAX_CONNECTIONS || '100'),
        alerts: {
          channels: {
            websocket: true,
          },
        },
      };

      this.dashboardServer = new DashboardServer(
        gasAnalytics,
        crossChainAnalytics,
        dashboardConfig
      );

      await this.dashboardServer.start();
    } catch (error) {
      logger.warn(`[Bootstrap] Dashboard initialization failed: ${error}`);
      logger.warn('[Bootstrap] Continuing without dashboard...');
    }
  }

  /**
   * Start the Warden's main loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('[Bootstrap] Warden is already running');
      return;
    }

    if (!this.components || !this.config) {
      throw new Error('[Bootstrap] Components not initialized. Call initialize() first.');
    }

    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('  AEV WARDEN.BOT – STARTING OPERATIONS');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('AEV status: ONLINE');
    logger.info('Role: Warden.bot – monitoring flow, judging opportunities…');
    logger.info('═══════════════════════════════════════════════════════════');

    // Security scan on startup
    await this.runSecurityScan();

    this.isRunning = true;
    this.stats.startTime = Date.now();
    this.emit('started');

    const scanInterval = this.config.scanInterval || 1000;
    logger.info(`[Bootstrap] Starting scan loop with ${scanInterval}ms interval...`);

    // Run first scan immediately
    await this.scanCycle();

    // Set up interval for continuous scanning
    this.scanInterval = setInterval(async () => {
      await this.scanCycle();
    }, scanInterval);

    logger.info('[Bootstrap] Warden is now running and scanning for opportunities');
  }

  /**
   * Run security scan on configuration
   */
  private async runSecurityScan(): Promise<void> {
    if (!this.phase3Components?.bloodhoundScanner || !this.phase3Components.securityEnabled) {
      return;
    }

    if (!this.config) {
      logger.warn('[Bootstrap] Config not available for security scan');
      return;
    }

    logger.info('[Bootstrap] Running security scan on configuration...');

    try {
      const configScan = await this.phase3Components.bloodhoundScanner.scanConfig({
        rpcUrl: this.config.rpcUrl,
        chainId: this.config.chainId,
        executorAddress: this.config.flashSwapV2Address,
        titheRecipient: this.config.flashSwapV2Owner,
      });

      if (configScan.hasSensitiveData) {
        logger.warn(
          `[Bootstrap] ⚠️  Found ${configScan.detectedSecrets.length} potential secrets in configuration`
        );
        configScan.detectedSecrets.forEach((secret) => {
          logger.warn(`[Bootstrap]   - ${secret.type}: ${secret.redactedValue}`);
          logger.warn(`[Bootstrap]     Recommendation: ${secret.recommendation}`);
        });

        if (configScan.riskLevel === 'critical') {
          logger.error(
            '[Bootstrap] CRITICAL: Configuration contains secrets that should be moved to environment variables!'
          );
        }
      } else {
        logger.info('[Bootstrap] ✓ Configuration security scan passed');
      }
    } catch (error) {
      logger.error(`[Bootstrap] Security scan error: ${error}`);
    }
  }

  /**
   * Main scanning cycle
   */
  private async scanCycle(): Promise<void> {
    if (this.shuttingDown || !this.components) return;

    try {
      this.stats.cyclesCompleted++;

      const tokens = getScanTokens(this.components.config.chainId);

      // Log scan details periodically
      if (this.stats.cyclesCompleted === 1 || this.stats.cyclesCompleted % 10 === 0) {
        const networkName = getNetworkName(this.components.config.chainId);
        const chainTokens = getTokensByChainId(this.components.config.chainId);
        const dexes = this.components.advancedOrchestrator.getDEXesByNetwork(
          this.components.config.chainId.toString()
        );

        logger.info(`[Scan] Cycle ${this.stats.cyclesCompleted} - ${networkName}`);
        logger.info(`[Scan]   Tokens: ${tokens.length} (${Object.keys(chainTokens).join(', ')})`);
        logger.info(`[Scan]   DEXes: ${dexes.length} (${dexes.map((d) => d.name).join(', ')})`);
      }

      const startAmount = parseEther('1.0');
      const paths = await this.components.advancedOrchestrator.findOpportunities(
        tokens,
        startAmount
      );

      if (paths && paths.length > 0) {
        this.stats.opportunitiesFound += paths.length;
        logger.info(
          `[Scan] Found ${paths.length} opportunities in cycle ${this.stats.cyclesCompleted}`
        );

        // Process opportunities
        await this.processOpportunities(paths);
      }

      // Log periodic status
      if (this.stats.cyclesCompleted % 100 === 0) {
        this.logStatus();
      }
    } catch (error) {
      this.stats.errors++;
      logger.error(`[Scan] Cycle error: ${error instanceof Error ? error.message : String(error)}`);
      this.emit('scan_error', error);
    }
  }

  /**
   * Process discovered opportunities
   */
  private async processOpportunities(paths: ArbitragePath[]): Promise<void> {
    if (!this.components) return;

    const bestPath = paths[0];
    const networkName = getNetworkName(this.components.config.chainId);

    if (this.components.config.dryRun) {
      logger.info('[DRY RUN] Best opportunity:');
      logger.info(`  Network: ${networkName}`);
      logger.info(`  Estimated profit: ${formatEther(bestPath.netProfit.toString())} ETH`);
      logger.info(`  Gas cost: ${formatEther(bestPath.totalGasCost.toString())} ETH`);
      logger.info(`  Hops: ${bestPath.hops.length}`);
    } else if (this.components.integratedOrchestrator) {
      logger.info('Processing best opportunity...');
      logger.info(`  Network: ${networkName}`);
      logger.info(`  Estimated profit: ${formatEther(bestPath.netProfit.toString())} ETH`);
      logger.info(`  Gas cost: ${formatEther(bestPath.totalGasCost.toString())} ETH`);
      logger.info(`  Hops: ${bestPath.hops.length}`);
      // Note: Full execution integration would happen here
    }
  }

  /**
   * Gracefully shutdown the Warden
   */
  async shutdown(): Promise<void> {
    if (this.shuttingDown) {
      logger.warn('[Bootstrap] Shutdown already in progress');
      return;
    }

    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('  AEV WARDEN.BOT – SHUTTING DOWN');
    logger.info('═══════════════════════════════════════════════════════════');

    this.shuttingDown = true;

    // Stop scanning
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
    }

    // Stop dashboard
    if (this.dashboardServer) {
      await this.dashboardServer.stop();
      logger.info('[Bootstrap] ✓ Dashboard stopped');
    }

    // Shutdown Phase 3 components
    if (this.phase3Components) {
      await shutdownPhase3Components(this.phase3Components);
      logger.info('[Bootstrap] ✓ Phase 3 components stopped');
    }

    // Shutdown core components
    if (this.components) {
      await shutdownComponents(this.components);
      logger.info('[Bootstrap] ✓ Core components stopped');
    }

    // Log final status
    this.logStatus();

    this.isRunning = false;
    this.emit('shutdown');

    logger.info('[Bootstrap] ✓ Shutdown complete');
  }

  /**
   * Log current status
   */
  private logStatus(): void {
    const uptime = Date.now() - this.stats.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);

    logger.info('─────────────────────────────────────────────────────────');
    logger.info('WARDEN STATUS');
    logger.info('─────────────────────────────────────────────────────────');
    logger.info(`Uptime: ${uptimeMinutes}m ${uptimeSeconds % 60}s`);
    logger.info(`Cycles completed: ${this.stats.cyclesCompleted}`);
    logger.info(`Opportunities found: ${this.stats.opportunitiesFound}`);
    logger.info(`Trades executed: ${this.stats.tradesExecuted}`);
    logger.info(`Total profit: ${formatEther(this.stats.totalProfit)} ETH`);
    logger.info(`Errors: ${this.stats.errors}`);

    // Phase 3 Status
    if (this.phase3Components) {
      const phase3Status = getPhase3Status(this.phase3Components);
      logger.info('─────────────────────────────────────────────────────────');
      logger.info('PHASE 3 STATUS');
      logger.info('─────────────────────────────────────────────────────────');

      if (phase3Status.ai.enabled) {
        logger.info('AI Components: ENABLED');
        if (phase3Status.ai.rlAgent) {
          logger.info(
            `  RL Agent: ${phase3Status.ai.rlAgent.episodeCount} episodes, ${
              phase3Status.ai.rlAgent.totalReward?.toFixed(2) || 0
            } total reward`
          );
        }
        if (phase3Status.ai.nnScorer) {
          logger.info(
            `  NN Scorer: ${phase3Status.ai.nnScorer.trainingExamples} examples, ${(
              (phase3Status.ai.nnScorer.accuracy || 0) * 100
            ).toFixed(1)}% accuracy`
          );
        }
      }

      if (phase3Status.crossChain.enabled) {
        logger.info('Cross-Chain Intelligence: ENABLED');
      }

      if (phase3Status.security.enabled) {
        logger.info('Security Components: ENABLED');
        logger.info(`  Security Patterns: ${phase3Status.security.patterns || 0}`);
      }
    }

    logger.info('─────────────────────────────────────────────────────────');
  }

  /**
   * Get current statistics
   */
  getStats(): WardenStats & { uptime: number; isRunning: boolean } {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      isRunning: this.isRunning,
    };
  }

  /**
   * Get initialized components (for external access if needed)
   */
  getComponents(): InitializedComponents | undefined {
    return this.components;
  }

  /**
   * Get Phase 3 components
   */
  getPhase3Components(): Phase3Components | undefined {
    return this.phase3Components;
  }

  /**
   * Get consciousness instance
   */
  getConsciousness(): ArbitrageConsciousness | undefined {
    return this.consciousness;
  }
}

/**
 * Export for convenience
 */
export { InitializedComponents, Phase3Components };
