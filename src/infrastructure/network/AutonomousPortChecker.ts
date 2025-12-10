/**
 * AutonomousPortChecker - Pre-Startup Port Validation System
 * 
 * Automatically validates and resolves port conflicts before services start.
 * Integrates with ServiceRegistry for comprehensive port management.
 * 
 * Features:
 * - Pre-startup validation
 * - Automatic conflict resolution
 * - Health check monitoring
 * - Detailed reporting
 * - Self-healing capabilities
 */

import { PortChecker } from './PortChecker.js';
import { ServiceRegistry, ServiceStatus } from './ServiceRegistry.js';

export interface PortCheckOptions {
  autoResolve?: boolean;
  throwOnConflict?: boolean;
  verbose?: boolean;
  killConflicting?: boolean;
}

export interface PortCheckReport {
  timestamp: number;
  allAvailable: boolean;
  conflictsFound: number;
  conflictsResolved: number;
  services: ServiceStatus[];
  resolutions: Map<string, number>;
  errors: string[];
  warnings: string[];
}

export class AutonomousPortChecker {
  private registry: ServiceRegistry;
  private options: Required<PortCheckOptions>;

  constructor(options: PortCheckOptions = {}) {
    this.registry = ServiceRegistry.getInstance();
    this.options = {
      autoResolve: options.autoResolve ?? true,
      throwOnConflict: options.throwOnConflict ?? false,
      verbose: options.verbose ?? true,
      killConflicting: options.killConflicting ?? false,
    };
  }

  /**
   * Main entry point: Check all ports before services start
   */
  async checkPorts(): Promise<PortCheckReport> {
    const startTime = Date.now();
    const report: PortCheckReport = {
      timestamp: startTime,
      allAvailable: true,
      conflictsFound: 0,
      conflictsResolved: 0,
      services: [],
      resolutions: new Map(),
      errors: [],
      warnings: [],
    };

    if (this.options.verbose) {
      console.log('\n╔═══════════════════════════════════════════════════════════════╗');
      console.log('║          AUTONOMOUS PORT CHECKER - PRE-STARTUP SCAN           ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    }

    try {
      // Step 1: Check all registered services
      const statusMap = await this.registry.checkAllServices();
      report.services = Array.from(statusMap.values());

      // Count conflicts
      const conflicts = report.services.filter((s) => !s.available);
      report.conflictsFound = conflicts.length;
      report.allAvailable = conflicts.length === 0;

      if (this.options.verbose) {
        console.log(`📊 Services checked: ${report.services.length}`);
        console.log(`✅ Available: ${report.services.length - conflicts.length}`);
        console.log(`❌ Conflicts: ${conflicts.length}`);
        console.log('');
      }

      // Step 2: Handle conflicts
      if (conflicts.length > 0) {
        await this.handleConflicts(conflicts, report);
      }

      // Step 3: Validate required services
      const validation = await this.registry.validateRequiredServices();
      if (!validation.valid) {
        report.errors.push(...validation.issues);

        if (this.options.throwOnConflict) {
          throw new Error(
            `Port validation failed:\n${validation.issues.map((i) => `  - ${i}`).join('\n')}`
          );
        }
      }

      // Step 4: Generate final report
      if (this.options.verbose) {
        await this.printReport(report);
      }

      const duration = Date.now() - startTime;
      if (this.options.verbose) {
        console.log(`\n⏱️  Scan completed in ${duration}ms\n`);
      }
    } catch (error) {
      report.errors.push(
        error instanceof Error ? error.message : 'Unknown error during port check'
      );

      if (this.options.throwOnConflict) {
        throw error;
      }
    }

    return report;
  }

  /**
   * Handle port conflicts with various strategies
   */
  private async handleConflicts(
    conflicts: ServiceStatus[],
    report: PortCheckReport
  ): Promise<void> {
    if (this.options.verbose) {
      console.log('🔧 RESOLVING PORT CONFLICTS:');
      console.log('─────────────────────────────────────────────────────────────');
    }

    for (const conflict of conflicts) {
      const service = this.registry.getService(conflict.name);
      if (!service) continue;

      if (this.options.verbose) {
        console.log(`\n  Service: ${conflict.name}`);
        console.log(`  Port: ${conflict.port}`);
        if (conflict.process && conflict.pid) {
          console.log(`  Blocking process: ${conflict.process} (PID: ${conflict.pid})`);
        }
      }

      // Strategy 1: Kill conflicting process (if enabled and not required)
      if (this.options.killConflicting && !service.required) {
        if (this.options.verbose) {
          console.log(`  🗡️  Attempting to kill conflicting process...`);
        }

        const killed = await PortChecker.killProcessOnPort(conflict.port);
        if (killed) {
          const available = await PortChecker.waitForPort(conflict.port, 2000);
          if (available) {
            report.conflictsResolved++;
            if (this.options.verbose) {
              console.log(`  ✅ Port ${conflict.port} is now available`);
            }
            continue;
          }
        }
      }

      // Strategy 2: Find alternative port (if auto-resolve enabled)
      if (this.options.autoResolve && service.fallbackRange) {
        if (this.options.verbose) {
          console.log(
            `  🔍 Searching for alternative port in range ${service.fallbackRange.start}-${service.fallbackRange.end}...`
          );
        }

        const alternativePort = await PortChecker.findAvailablePort(
          service.fallbackRange.start,
          service.fallbackRange.end
        );

        if (alternativePort) {
          this.registry.updateServicePort(conflict.name, alternativePort);
          report.resolutions.set(conflict.name, alternativePort);
          report.conflictsResolved++;

          if (this.options.verbose) {
            console.log(`  ✅ Resolved: ${conflict.name} → Port ${alternativePort}`);
          }

          // Update environment variable if needed
          this.updateEnvironmentPort(conflict.name, alternativePort);
        } else {
          const msg = `No available ports found for ${conflict.name} in fallback range`;
          report.warnings.push(msg);
          if (this.options.verbose) {
            console.log(`  ⚠️  ${msg}`);
          }
        }
      }
    }

    if (this.options.verbose) {
      console.log('\n─────────────────────────────────────────────────────────────');
      console.log(`Conflicts resolved: ${report.conflictsResolved}/${report.conflictsFound}`);
    }
  }

  /**
   * Update environment variable for service port
   */
  private updateEnvironmentPort(serviceName: string, port: number): void {
    const envVarMap: Record<string, string> = {
      'api-server': 'PORT',
      dashboard: 'DASHBOARD_PORT',
      collaboration: 'COLLAB_PORT',
      'mcp-memory': 'MCP_MEMORY_PORT',
      'mcp-ethics': 'MCP_ETHICS_PORT',
      'mcp-consciousness': 'MCP_CONSCIOUSNESS_PORT',
      websocket: 'WEBSOCKET_PORT',
      'health-check': 'HEALTH_CHECK_PORT',
      metrics: 'METRICS_PORT',
    };

    const envVar = envVarMap[serviceName];
    if (envVar) {
      process.env[envVar] = port.toString();
    }
  }

  /**
   * Print comprehensive report
   */
  private async printReport(report: PortCheckReport): Promise<void> {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    FINAL PORT CHECK REPORT                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Services by status
    const available = report.services.filter((s) => s.available);
    const unavailable = report.services.filter((s) => !s.available);

    if (available.length > 0) {
      console.log('✅ AVAILABLE SERVICES:');
      for (const service of available) {
        console.log(`   ${service.name.padEnd(20)} → Port ${service.port}`);
      }
      console.log('');
    }

    if (unavailable.length > 0) {
      console.log('❌ UNAVAILABLE SERVICES:');
      for (const service of unavailable) {
        console.log(`   ${service.name.padEnd(20)} → Port ${service.port}`);
        if (service.process && service.pid) {
          console.log(`      └─ ${service.process} (PID: ${service.pid})`);
        }
      }
      console.log('');
    }

    // Resolutions
    if (report.resolutions.size > 0) {
      console.log('🔧 PORT RESOLUTIONS:');
      for (const [serviceName, newPort] of report.resolutions) {
        console.log(`   ${serviceName} → Port ${newPort} (automatically assigned)`);
      }
      console.log('');
    }

    // Warnings
    if (report.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      for (const warning of report.warnings) {
        console.log(`   ${warning}`);
      }
      console.log('');
    }

    // Errors
    if (report.errors.length > 0) {
      console.log('🚨 ERRORS:');
      for (const error of report.errors) {
        console.log(`   ${error}`);
      }
      console.log('');
    }

    // Summary
    console.log('─────────────────────────────────────────────────────────────');
    console.log(`Status: ${report.allAvailable ? '✅ ALL CLEAR' : '❌ CONFLICTS DETECTED'}`);
    console.log(`Conflicts: ${report.conflictsFound}`);
    console.log(`Resolved: ${report.conflictsResolved}`);
    console.log('─────────────────────────────────────────────────────────────');
  }

  /**
   * Quick check: just return true/false
   */
  async quickCheck(): Promise<boolean> {
    const originalVerbose = this.options.verbose;
    this.options.verbose = false;

    const report = await this.checkPorts();
    this.options.verbose = originalVerbose;

    return report.allAvailable || report.conflictsResolved === report.conflictsFound;
  }

  /**
   * Health check: periodically verify ports are still available
   */
  startHealthCheck(intervalMs: number = 30000): NodeJS.Timeout {
    return setInterval(async () => {
      const statusMap = await this.registry.checkAllServices();
      const conflicts = Array.from(statusMap.values()).filter((s) => !s.available);

      if (conflicts.length > 0 && this.options.verbose) {
        console.log('\n⚠️  Port health check detected conflicts:');
        for (const conflict of conflicts) {
          console.log(
            `   ${conflict.name}: Port ${conflict.port} is now in use by ${conflict.process || 'unknown process'}`
          );
        }
      }
    }, intervalMs);
  }
}

/**
 * Convenience function: Check ports before starting services
 */
export async function checkPortsBeforeStart(
  options?: PortCheckOptions
): Promise<PortCheckReport> {
  const checker = new AutonomousPortChecker(options);
  return await checker.checkPorts();
}

/**
 * Convenience function: Quick boolean check
 */
export async function arePortsAvailable(): Promise<boolean> {
  const checker = new AutonomousPortChecker({ verbose: false });
  return await checker.quickCheck();
}
