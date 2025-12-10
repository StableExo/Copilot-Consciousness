/**
 * ServiceRegistry - Central Configuration for All Service Ports
 * 
 * Manages port configuration for all services in TheWarden system:
 * - API Server
 * - Dashboard
 * - Collaboration Interface
 * - MCP Servers
 * - WebSocket Servers
 * - Health Check Endpoints
 */

import { PortChecker, PortRange, ServicePort } from './PortChecker.js';

export interface ServiceConfig {
  services: ServicePort[];
  autoResolveConflicts: boolean;
  healthCheckInterval: number;
}

export interface ServiceStatus {
  name: string;
  port: number;
  available: boolean;
  running: boolean;
  process?: string;
  pid?: number;
}

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, ServicePort>;
  private config: ServiceConfig;

  private constructor() {
    this.services = new Map();
    this.config = {
      services: [],
      autoResolveConflicts: true,
      healthCheckInterval: 30000, // 30 seconds
    };

    this.initializeServices();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Initialize all known services from environment and defaults
   */
  private initializeServices(): void {
    const services: ServicePort[] = [
      // Main API Server
      {
        name: 'api-server',
        port: parseInt(process.env.PORT || '3000', 10),
        fallbackRange: { start: 3000, end: 3010 },
        required: true,
      },
      // Dashboard Server
      {
        name: 'dashboard',
        port: parseInt(process.env.DASHBOARD_PORT || '3000', 10),
        fallbackRange: { start: 3000, end: 3010 },
        required: false,
      },
      // Collaboration Interface
      {
        name: 'collaboration',
        port: parseInt(process.env.COLLAB_PORT || '3001', 10),
        fallbackRange: { start: 3001, end: 3020 },
        required: false,
      },
      // MCP Memory Tools Server
      {
        name: 'mcp-memory',
        port: parseInt(process.env.MCP_MEMORY_PORT || '3002', 10),
        fallbackRange: { start: 3002, end: 3010 },
        required: false,
      },
      // MCP Ethics Server
      {
        name: 'mcp-ethics',
        port: parseInt(process.env.MCP_ETHICS_PORT || '3003', 10),
        fallbackRange: { start: 3003, end: 3010 },
        required: false,
      },
      // MCP Consciousness Server
      {
        name: 'mcp-consciousness',
        port: parseInt(process.env.MCP_CONSCIOUSNESS_PORT || '3004', 10),
        fallbackRange: { start: 3004, end: 3010 },
        required: false,
      },
      // WebSocket Server
      {
        name: 'websocket',
        port: parseInt(process.env.WEBSOCKET_PORT || '3005', 10),
        fallbackRange: { start: 3005, end: 3015 },
        required: false,
      },
      // Health Check Endpoint
      {
        name: 'health-check',
        port: parseInt(process.env.HEALTH_CHECK_PORT || '3100', 10),
        fallbackRange: { start: 3100, end: 3110 },
        required: false,
      },
      // Metrics/Prometheus
      {
        name: 'metrics',
        port: parseInt(process.env.METRICS_PORT || '9090', 10),
        fallbackRange: { start: 9090, end: 9100 },
        required: false,
      },
    ];

    for (const service of services) {
      this.services.set(service.name, service);
    }

    this.config.services = services;
  }

  /**
   * Register a new service
   */
  registerService(service: ServicePort): void {
    this.services.set(service.name, service);
    this.config.services.push(service);
  }

  /**
   * Get service configuration by name
   */
  getService(name: string): ServicePort | undefined {
    return this.services.get(name);
  }

  /**
   * Get all registered services
   */
  getAllServices(): ServicePort[] {
    return Array.from(this.services.values());
  }

  /**
   * Check availability of all registered services
   */
  async checkAllServices(): Promise<Map<string, ServiceStatus>> {
    const statusMap = new Map<string, ServiceStatus>();

    for (const service of this.services.values()) {
      const available = await PortChecker.isPortAvailable(service.port);
      const status: ServiceStatus = {
        name: service.name,
        port: service.port,
        available,
        running: !available, // If not available, likely running
      };

      if (!available) {
        const processInfo = await PortChecker.getProcessUsingPort(service.port);
        if (processInfo) {
          status.process = processInfo.name;
          status.pid = processInfo.pid;
        }
      }

      statusMap.set(service.name, status);
    }

    return statusMap;
  }

  /**
   * Resolve port conflicts automatically
   */
  async resolveConflicts(): Promise<Map<string, number>> {
    const resolutions = new Map<string, number>();

    for (const service of this.services.values()) {
      const available = await PortChecker.isPortAvailable(service.port);

      if (!available && service.fallbackRange) {
        // Find alternative port in fallback range
        const alternativePort = await PortChecker.findAvailablePort(
          service.fallbackRange.start,
          service.fallbackRange.end
        );

        if (alternativePort) {
          resolutions.set(service.name, alternativePort);
          // Update service configuration
          service.port = alternativePort;
        } else if (service.required) {
          throw new Error(
            `Required service '${service.name}' has no available ports in range ${service.fallbackRange.start}-${service.fallbackRange.end}`
          );
        }
      }
    }

    return resolutions;
  }

  /**
   * Validate all required services can start
   */
  async validateRequiredServices(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    for (const service of this.services.values()) {
      if (!service.required) continue;

      const available = await PortChecker.isPortAvailable(service.port);

      if (!available) {
        const processInfo = await PortChecker.getProcessUsingPort(service.port);
        const processDetails = processInfo
          ? ` (used by ${processInfo.name}, PID: ${processInfo.pid})`
          : '';
        issues.push(
          `Required service '${service.name}' cannot bind to port ${service.port}${processDetails}`
        );
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Generate comprehensive status report
   */
  async generateStatusReport(): Promise<string> {
    const statusMap = await this.checkAllServices();
    const lines: string[] = [];

    lines.push('╔═══════════════════════════════════════════════════════════════╗');
    lines.push('║            THEWARDEN SERVICE REGISTRY STATUS REPORT           ║');
    lines.push('╚═══════════════════════════════════════════════════════════════╝');
    lines.push('');

    // Group by status
    const available: ServiceStatus[] = [];
    const running: ServiceStatus[] = [];

    for (const status of statusMap.values()) {
      if (status.available) {
        available.push(status);
      } else {
        running.push(status);
      }
    }

    // Show running services
    if (running.length > 0) {
      lines.push('🟢 RUNNING SERVICES:');
      lines.push('─────────────────────────────────────────────────────────────');
      for (const status of running) {
        lines.push(`  ${status.name.padEnd(20)} → Port ${status.port}`);
        if (status.process && status.pid) {
          lines.push(`    └─ Process: ${status.process} (PID: ${status.pid})`);
        }
      }
      lines.push('');
    }

    // Show available ports
    if (available.length > 0) {
      lines.push('⚪ AVAILABLE PORTS:');
      lines.push('─────────────────────────────────────────────────────────────');
      for (const status of available) {
        const requiredBadge = this.services.get(status.name)?.required ? ' [REQUIRED]' : '';
        lines.push(`  ${status.name.padEnd(20)} → Port ${status.port}${requiredBadge}`);
      }
      lines.push('');
    }

    // Summary
    lines.push('─────────────────────────────────────────────────────────────');
    lines.push(`Total Services: ${statusMap.size}`);
    lines.push(`Running: ${running.length}`);
    lines.push(`Available: ${available.length}`);
    lines.push('─────────────────────────────────────────────────────────────');

    // Validation
    const validation = await this.validateRequiredServices();
    if (!validation.valid) {
      lines.push('');
      lines.push('⚠️  VALIDATION ISSUES:');
      for (const issue of validation.issues) {
        lines.push(`  ❌ ${issue}`);
      }
    } else {
      lines.push('');
      lines.push('✅ All required services can start successfully');
    }

    return lines.join('\n');
  }

  /**
   * Get ports that need to be available
   */
  getRequiredPorts(): number[] {
    return this.config.services.filter((s) => s.required).map((s) => s.port);
  }

  /**
   * Get all configured ports
   */
  getAllPorts(): number[] {
    return this.config.services.map((s) => s.port);
  }

  /**
   * Update service port
   */
  updateServicePort(serviceName: string, newPort: number): boolean {
    const service = this.services.get(serviceName);
    if (!service) {
      return false;
    }

    service.port = newPort;
    return true;
  }
}

// Export singleton instance
export const serviceRegistry = ServiceRegistry.getInstance();
