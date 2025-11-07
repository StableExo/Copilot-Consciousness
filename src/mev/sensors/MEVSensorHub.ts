/**
 * MEVSensorHub - Coordinates MEV sensor readings
 * Ported from AxionCitadel's mev_risk_arb/core/sensor_hub.py
 * 
 * Periodically updates sensor readings in background thread
 */

import { ethers } from 'ethers';
import { MempoolCongestionSensor } from './MempoolCongestionSensor';
import { SearcherDensitySensor } from './SearcherDensitySensor';
import { MEVRiskParams } from '../types/TransactionType';

export class MEVSensorHub {
  private congestionSensor: MempoolCongestionSensor;
  private densitySensor: SearcherDensitySensor;
  private updateInterval: number;
  private isRunning: boolean = false;
  private intervalHandle?: NodeJS.Timeout;
  private lastUpdate: MEVRiskParams;

  constructor(
    provider: ethers.providers.Provider,
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
   * Start the sensor update loop
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
   * Stop the sensor update loop
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
   * Update sensor readings
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
   * Get latest risk parameters
   */
  getRiskParams(): MEVRiskParams {
    return { ...this.lastUpdate };
  }

  /**
   * Get current mempool congestion
   */
  getCongestion(): number {
    return this.lastUpdate.mempoolCongestion;
  }

  /**
   * Get current searcher density
   */
  getDensity(): number {
    return this.lastUpdate.searcherDensity;
  }

  /**
   * Force immediate sensor update
   */
  async forceUpdate(): Promise<MEVRiskParams> {
    await this.updateSensors();
    return this.getRiskParams();
  }

  /**
   * Check if sensors are running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get age of last update in milliseconds
   */
  getUpdateAge(): number {
    return Date.now() - this.lastUpdate.timestamp;
  }
}
