/**
 * PortChecker - Autonomous Port Availability and Conflict Detection
 * 
 * Provides utilities to:
 * - Check if ports are available before starting services
 * - Find next available port in a range
 * - Identify processes using ports
 * - Validate port configurations
 * - Generate port usage reports
 */

import { createServer, Server } from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PortCheckResult {
  port: number;
  available: boolean;
  process?: string;
  pid?: number;
  reason?: string;
}

export interface PortRange {
  start: number;
  end: number;
  preferred?: number;
}

export interface ServicePort {
  name: string;
  port: number;
  fallbackRange?: PortRange;
  required: boolean;
}

export class PortChecker {
  private static readonly MIN_PORT = 1024;
  private static readonly MAX_PORT = 65535;
  private static readonly SYSTEM_PORTS_END = 1023;
  private static readonly USER_PORTS_START = 1024;
  private static readonly DYNAMIC_PORTS_START = 49152;

  /**
   * Check if a specific port is available
   */
  static async isPortAvailable(port: number): Promise<boolean> {
    // Validate port number
    if (!this.isValidPort(port)) {
      throw new Error(`Invalid port number: ${port}. Must be between 1 and 65535.`);
    }

    return new Promise((resolve) => {
      const server: Server = createServer();

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
          resolve(false);
        } else {
          resolve(false);
        }
      });

      server.once('listening', () => {
        server.close(() => {
          resolve(true);
        });
      });

      server.listen(port, '0.0.0.0');
    });
  }

  /**
   * Check multiple ports and return their status
   */
  static async checkPorts(ports: number[]): Promise<PortCheckResult[]> {
    const results: PortCheckResult[] = [];

    for (const port of ports) {
      try {
        const available = await this.isPortAvailable(port);
        const result: PortCheckResult = { port, available };

        if (!available) {
          const processInfo = await this.getProcessUsingPort(port);
          if (processInfo) {
            result.process = processInfo.name;
            result.pid = processInfo.pid;
          }
          result.reason = 'Port is already in use';
        }

        results.push(result);
      } catch (error) {
        results.push({
          port,
          available: false,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Find the next available port in a range
   */
  static async findAvailablePort(
    startPort: number = this.USER_PORTS_START,
    endPort: number = this.DYNAMIC_PORTS_START
  ): Promise<number | null> {
    if (startPort < this.MIN_PORT) {
      startPort = this.MIN_PORT;
    }
    if (endPort > this.MAX_PORT) {
      endPort = this.MAX_PORT;
    }
    if (startPort > endPort) {
      throw new Error(`Invalid port range: ${startPort} > ${endPort}`);
    }

    for (let port = startPort; port <= endPort; port++) {
      try {
        const available = await this.isPortAvailable(port);
        if (available) {
          return port;
        }
      } catch (error) {
        // Continue to next port
        continue;
      }
    }

    return null;
  }

  /**
   * Get information about the process using a port
   */
  static async getProcessUsingPort(
    port: number
  ): Promise<{ pid: number; name: string } | null> {
    try {
      // Platform-specific command
      const platform = process.platform;
      let command: string;

      if (platform === 'win32') {
        command = `netstat -ano | findstr :${port}`;
      } else if (platform === 'darwin') {
        command = `lsof -i :${port} -t`;
      } else {
        // Linux
        command = `lsof -i :${port} -t`;
      }

      const { stdout } = await execAsync(command);

      if (!stdout.trim()) {
        return null;
      }

      // Extract PID
      let pid: number;
      if (platform === 'win32') {
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        const pidMatch = lastLine.match(/\s+(\d+)\s*$/);
        if (!pidMatch) return null;
        pid = parseInt(pidMatch[1], 10);
      } else {
        pid = parseInt(stdout.trim().split('\n')[0], 10);
      }

      // Get process name
      let processName = 'unknown';
      try {
        let nameCommand: string;
        if (platform === 'win32') {
          nameCommand = `tasklist /FI "PID eq ${pid}" /FO CSV /NH`;
        } else {
          nameCommand = `ps -p ${pid} -o comm=`;
        }

        const { stdout: nameOutput } = await execAsync(nameCommand);
        if (nameOutput.trim()) {
          if (platform === 'win32') {
            const nameMatch = nameOutput.match(/"([^"]+)"/);
            if (nameMatch) {
              processName = nameMatch[1];
            }
          } else {
            processName = nameOutput.trim();
          }
        }
      } catch (error) {
        // Keep default 'unknown'
      }

      return { pid, name: processName };
    } catch (error) {
      // Port likely not in use or lsof not available
      return null;
    }
  }

  /**
   * Validate port number
   */
  static isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= this.MAX_PORT;
  }

  /**
   * Check if port is in system range (requires root/admin)
   */
  static isSystemPort(port: number): boolean {
    return port <= this.SYSTEM_PORTS_END;
  }

  /**
   * Check if port is in user range
   */
  static isUserPort(port: number): boolean {
    return port >= this.USER_PORTS_START && port < this.DYNAMIC_PORTS_START;
  }

  /**
   * Check if port is in dynamic/ephemeral range
   */
  static isDynamicPort(port: number): boolean {
    return port >= this.DYNAMIC_PORTS_START && port <= this.MAX_PORT;
  }

  /**
   * Get recommended port ranges for different purposes
   */
  static getRecommendedRanges(): {
    system: PortRange;
    user: PortRange;
    dynamic: PortRange;
  } {
    return {
      system: { start: 1, end: this.SYSTEM_PORTS_END },
      user: { start: this.USER_PORTS_START, end: this.DYNAMIC_PORTS_START - 1 },
      dynamic: { start: this.DYNAMIC_PORTS_START, end: this.MAX_PORT },
    };
  }

  /**
   * Kill process using a port (requires appropriate permissions)
   */
  static async killProcessOnPort(port: number): Promise<boolean> {
    try {
      const processInfo = await this.getProcessUsingPort(port);
      if (!processInfo) {
        return false;
      }

      const platform = process.platform;
      let command: string;

      if (platform === 'win32') {
        command = `taskkill /PID ${processInfo.pid} /F`;
      } else {
        command = `kill -9 ${processInfo.pid}`;
      }

      await execAsync(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for port to become available (with timeout)
   */
  static async waitForPort(
    port: number,
    timeoutMs: number = 5000,
    intervalMs: number = 100
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const available = await this.isPortAvailable(port);
        if (available) {
          return true;
        }
      } catch (error) {
        // Continue waiting
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return false;
  }

  /**
   * Generate a comprehensive port report
   */
  static async generatePortReport(ports: number[]): Promise<string> {
    const results = await this.checkPorts(ports);
    const lines: string[] = [];

    lines.push('╔═══════════════════════════════════════════════════════════════╗');
    lines.push('║              AUTONOMOUS PORT AVAILABILITY REPORT              ║');
    lines.push('╚═══════════════════════════════════════════════════════════════╝');
    lines.push('');

    for (const result of results) {
      const status = result.available ? '✅ AVAILABLE' : '❌ IN USE';
      lines.push(`Port ${result.port}: ${status}`);

      if (!result.available) {
        if (result.process && result.pid) {
          lines.push(`  └─ Process: ${result.process} (PID: ${result.pid})`);
        }
        if (result.reason) {
          lines.push(`  └─ Reason: ${result.reason}`);
        }
      }
      lines.push('');
    }

    const availableCount = results.filter((r) => r.available).length;
    const inUseCount = results.filter((r) => !r.available).length;

    lines.push('─────────────────────────────────────────────────────────────');
    lines.push(`Summary: ${availableCount} available, ${inUseCount} in use`);
    lines.push('─────────────────────────────────────────────────────────────');

    return lines.join('\n');
  }
}
