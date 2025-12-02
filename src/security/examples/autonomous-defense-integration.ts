/**
 * Example: Autonomous Defense System Integration
 * 
 * Shows how to integrate the autonomous defense layer with TheWarden
 */

import { AutonomousDefenseSystem, createDefaultDefenseConfig } from '../index';
import { logger } from '../../utils/logger';

/**
 * Example integration with main arbitrage system
 */
export async function initializeAutonomousDefense(
  walletAddress: string,
  rpcUrl: string
): Promise<AutonomousDefenseSystem> {
  
  logger.info('[Example] Initializing Autonomous Defense System', 'SECURITY');
  
  // Create default configuration
  const config = createDefaultDefenseConfig(walletAddress, rpcUrl);
  
  // Customize if needed
  config.monitor.pollingInterval = 3000; // Check every 3 seconds
  config.enableAutoCircuitBreaker = true;
  config.enableAutoEmergencyStop = true;
  
  // Initialize the defense system
  const defense = new AutonomousDefenseSystem(config);
  
  // Set up event listeners
  defense.on('threat-detected', ({ severity, report }) => {
    logger.error(
      `[Defense] Threat detected (${severity}): From ${report.transaction.from}`,
      'SECURITY'
    );
  });
  
  defense.on('circuit-opened', (data) => {
    logger.error(`[Defense] Trading HALTED: ${data.reason}`, 'SECURITY');
  });
  
  defense.on('system-stopped', (state) => {
    logger.error(`[Defense] EMERGENCY STOP: ${state.stopReason}`, 'SECURITY');
  });
  
  // Start monitoring
  await defense.start();
  
  logger.info('[Example] Autonomous defense active - protecting 24/7', 'SECURITY');
  
  return defense;
}

/**
 * Example: Check defense status
 */
export function checkDefenseStatus(defense: AutonomousDefenseSystem): void {
  const metrics = defense.getMetrics();
  
  console.log('\n═══════════════════════════════════════');
  console.log('  AUTONOMOUS DEFENSE STATUS');
  console.log('═══════════════════════════════════════');
  console.log(`Monitoring: ${metrics.isMonitoring ? '✅ ACTIVE' : '❌ INACTIVE'}`);
  console.log(`Can Trade: ${metrics.canTrade ? '✅ YES' : '❌ NO'}`);
  console.log(`Threat Level: ${metrics.threatLevel.toUpperCase()}`);
  console.log('═══════════════════════════════════════\n');
}
