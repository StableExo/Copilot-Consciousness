/**
 * MEVSensorHub - Coordinates MEV sensor readings for risk assessment
 *
 * This hub is ported from AxionCitadel's mev_risk_arb/core/sensor_hub.py and serves
 * as the central coordination point for MEV (Maximal Extractable Value) risk monitoring.
 *
 * The hub aggregates data from multiple sensors to provide a comprehensive view of
 * the current MEV risk landscape:
 *
 * - **MempoolCongestionSensor**: Monitors pending transaction queue depth and gas prices
 *   to estimate network congestion levels that affect execution timing and costs.
 *
 * - **SearcherDensitySensor**: Tracks MEV searcher activity patterns to estimate
 *   competition levels for profitable opportunities.
 *
 * ## Architecture
 *
 * The sensor hub runs a background update loop that periodically polls all sensors
 * and caches the latest readings. This approach ensures:
 *
 * 1. **Low latency access**: Consumers get instant access to cached sensor data
 * 2. **Consistent readings**: All sensor values are from the same time slice
 * 3. **Decoupled updates**: Sensor polling doesn't block trading operations
 *
 * ## Usage
 *
 * @example
 * ```typescript
 * import { MEVSensorHub } from './sensors/MEVSensorHub';
 * import { JsonRpcProvider } from 'ethers';
 *
 * // Initialize with provider and optional update interval (default 5s)
 * const provider = new JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/key');
 * const sensorHub = new MEVSensorHub(provider, 3000); // 3-second updates
 *
 * // Start the background update loop
 * sensorHub.start();
 *
 * // Get current risk parameters for opportunity evaluation
 * const riskParams = sensorHub.getRiskParams();
 * console.log(`Congestion: ${riskParams.mempoolCongestion.toFixed(4)}`);
 * console.log(`Searcher Density: ${riskParams.searcherDensity.toFixed(4)}`);
 *
 * // Force immediate update when fresh data is critical
 * await sensorHub.forceUpdate();
 *
 * // Check sensor health
 * if (sensorHub.getUpdateAge() > 10000) {
 *   console.warn('Sensor data is stale!');
 * }
 *
 * // Cleanup when done
 * sensorHub.stop();
 * ```
 *
 * ## Integration with Consciousness System
 *
 * The MEVSensorHub feeds into ArbitrageConsciousness to provide real-time market
 * context for decision-making. The risk parameters influence:
 *
 * - Opportunity scoring and ranking
 * - Execution timing decisions
 * - Gas price bidding strategies
 * - Whether to attempt execution at all
 *
 * @see MempoolCongestionSensor for mempool monitoring details
 * @see SearcherDensitySensor for searcher activity tracking
 * @see ArbitrageConsciousness for integration with the cognitive layer
 *
 * @module sensors
 */

import { Provider } from 'ethers';
import { MempoolCongestionSensor } from './MempoolCongestionSensor';
import { SearcherDensitySensor } from './SearcherDensitySensor';
import { MEVRiskParams } from '../types/TransactionType';

/**
 * Coordinates MEV sensor readings for real-time risk assessment.
 *
 * Provides a unified interface for accessing MEV risk metrics from multiple
 * sensors, with automatic background updates and health monitoring.
 *
 * @fires MEVSensorHub#error - When sensor updates fail
 * @extends EventEmitter (implicit via sensor callbacks)
 */
export class MEVSensorHub {
  /** Sensor for mempool congestion monitoring */
  private congestionSensor: MempoolCongestionSensor;

  /** Sensor for MEV searcher activity tracking */
  private densitySensor: SearcherDensitySensor;

  /** Update interval in milliseconds */
  private updateInterval: number;

  /** Whether the sensor update loop is running */
  private isRunning: boolean = false;

  /** Timer handle for the update loop */
  private intervalHandle?: NodeJS.Timeout;

  /** Cached latest sensor readings */
  private lastUpdate: MEVRiskParams;

  /**
   * Creates a new MEVSensorHub instance.
   *
   * @param provider - Ethers.js provider for blockchain data access
   * @param updateInterval - Milliseconds between sensor updates (default: 5000)
   *
   * @example
   * ```typescript
   * const provider = new JsonRpcProvider(process.env.BASE_RPC_URL);
   * const hub = new MEVSensorHub(provider);
   * hub.start();
   * ```
   */
  constructor(
    provider: Provider,
    updateInterval: number = 5000 // 5 seconds default
  ) {
    this.congestionSensor = new MempoolCongestionSensor(provider);
    this.densitySensor = new SearcherDensitySensor(provider);
    this.updateInterval = updateInterval;
    this.lastUpdate = {
      mempoolCongestion: 0.0,
      searcherDensity: 0.0,
      timestamp: 0,
    };
  }

  /**
   * Starts the background sensor update loop.
   *
   * Begins periodic polling of all sensors at the configured interval.
   * Safe to call multiple times - subsequent calls are no-ops.
   *
   * @remarks
   * The first update runs immediately upon calling start().
   *
   * @example
   * ```typescript
   * hub.start();
   * // Sensors now updating every 5 seconds
   * ```
   */
  start(): void {
    if (this.isRunning) {
      console.warn('MEVSensorHub is already running');
      return;
    }

    this.isRunning = true;
    console.log('MEVSensorHub started');

    // Run immediately
    this.updateSensors();

    // Then run periodically
    this.intervalHandle = setInterval(() => {
      this.updateSensors();
    }, this.updateInterval);
  }

  /**
   * Stops the background sensor update loop.
   *
   * Halts periodic sensor polling. Safe to call multiple times.
   *
   * @remarks
   * Call this before disposing the hub to prevent memory leaks.
   *
   * @example
   * ```typescript
   * hub.stop();
   * // Clean shutdown complete
   * ```
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('MEVSensorHub is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
    console.log('MEVSensorHub stopped');
  }

  /**
   * Updates sensor readings from all sensors.
   *
   * @internal
   * @remarks
   * This method is called automatically by the update loop.
   * Errors are caught and logged to prevent loop termination.
   */
  private async updateSensors(): Promise<void> {
    try {
      const [congestion, density] = await Promise.all([
        this.congestionSensor.getCongestionScore(),
        this.densitySensor.getDensityScore(),
      ]);

      this.lastUpdate = {
        mempoolCongestion: congestion,
        searcherDensity: density,
        timestamp: Date.now(),
      };

      // Optional: Log for debugging
      // console.log(`Hub Update: Congestion=${congestion.toFixed(4)}, Density=${density.toFixed(4)}`);
    } catch (error) {
      console.error('Error in MEVSensorHub update loop:', error);
    }
  }

  /**
   * Gets the latest cached MEV risk parameters.
   *
   * Returns a copy of the current sensor readings. Values are normalized
   * to the range [0.0, 1.0] where higher values indicate higher risk.
   *
   * @returns A copy of the current MEV risk parameters
   *
   * @example
   * ```typescript
   * const params = hub.getRiskParams();
   * if (params.mempoolCongestion > 0.8) {
   *   console.log('High network congestion - consider waiting');
   * }
   * ```
   */
  getRiskParams(): MEVRiskParams {
    return { ...this.lastUpdate };
  }

  /**
   * Gets the current mempool congestion score.
   *
   * @returns Congestion score in range [0.0, 1.0]
   *
   * @remarks
   * - 0.0-0.3: Low congestion, fast confirmations expected
   * - 0.3-0.7: Moderate congestion, variable confirmation times
   * - 0.7-1.0: High congestion, delays and higher gas costs likely
   */
  getCongestion(): number {
    return this.lastUpdate.mempoolCongestion;
  }

  /**
   * Gets the current MEV searcher density score.
   *
   * @returns Density score in range [0.0, 1.0]
   *
   * @remarks
   * - 0.0-0.3: Low competition, good execution chances
   * - 0.3-0.7: Moderate competition, some frontrunning risk
   * - 0.7-1.0: High competition, significant MEV risk
   */
  getDensity(): number {
    return this.lastUpdate.searcherDensity;
  }

  /**
   * Forces an immediate sensor update, bypassing the scheduled interval.
   *
   * Use this when fresh data is critical, such as before executing
   * a high-value opportunity.
   *
   * @returns The updated risk parameters after refresh
   *
   * @example
   * ```typescript
   * // Before executing a large trade
   * const freshParams = await hub.forceUpdate();
   * if (freshParams.searcherDensity < 0.5) {
   *   await executeTrade();
   * }
   * ```
   */
  async forceUpdate(): Promise<MEVRiskParams> {
    await this.updateSensors();
    return this.getRiskParams();
  }

  /**
   * Checks if the sensor update loop is currently active.
   *
   * @returns true if sensors are being updated periodically
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Gets the age of the last sensor update in milliseconds.
   *
   * Use this to detect stale data conditions.
   *
   * @returns Milliseconds since the last successful update
   *
   * @example
   * ```typescript
   * if (hub.getUpdateAge() > 15000) {
   *   console.warn('Sensor data is more than 15 seconds old');
   *   await hub.forceUpdate();
   * }
   * ```
   */
  getUpdateAge(): number {
    return Date.now() - this.lastUpdate.timestamp;
  }
}
