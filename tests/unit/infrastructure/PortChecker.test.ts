import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PortChecker } from '../../../src/infrastructure/network/PortChecker';
import { createServer, Server } from 'net';

describe('PortChecker', () => {
  let testServers: Server[] = [];

  afterEach(async () => {
    // Clean up all test servers
    for (const server of testServers) {
      await new Promise<void>((resolve) => {
        if (server.listening) {
          server.close(() => resolve());
        } else {
          resolve();
        }
      });
    }
    testServers = [];
  });

  describe('isPortAvailable', () => {
    it('should return true for available port', async () => {
      const port = 39000; // High port unlikely to be in use
      const available = await PortChecker.isPortAvailable(port);
      expect(available).toBe(true);
    });

    it('should return false for port in use', async () => {
      const port = 39001;

      // Occupy the port
      const server = createServer();
      await new Promise<void>((resolve) => {
        server.listen(port, () => resolve());
      });
      testServers.push(server);

      const available = await PortChecker.isPortAvailable(port);
      expect(available).toBe(false);
    });

    it('should throw error for invalid port number', async () => {
      await expect(PortChecker.isPortAvailable(0)).rejects.toThrow('Invalid port');
      await expect(PortChecker.isPortAvailable(70000)).rejects.toThrow('Invalid port');
      await expect(PortChecker.isPortAvailable(-1)).rejects.toThrow('Invalid port');
    });

    it('should handle port 1024 (first user port)', async () => {
      const available = await PortChecker.isPortAvailable(1024);
      // Should not throw
      expect(typeof available).toBe('boolean');
    });
  });

  describe('checkPorts', () => {
    it('should check multiple ports correctly', async () => {
      const ports = [39002, 39003, 39004];

      // Occupy one port
      const server = createServer();
      await new Promise<void>((resolve) => {
        server.listen(39003, () => resolve());
      });
      testServers.push(server);

      const results = await PortChecker.checkPorts(ports);

      expect(results).toHaveLength(3);
      expect(results[0].port).toBe(39002);
      expect(results[0].available).toBe(true);
      expect(results[1].port).toBe(39003);
      expect(results[1].available).toBe(false);
      expect(results[2].port).toBe(39004);
      expect(results[2].available).toBe(true);
    });

    it('should include reason for unavailable ports', async () => {
      const port = 39005;

      const server = createServer();
      await new Promise<void>((resolve) => {
        server.listen(port, () => resolve());
      });
      testServers.push(server);

      const results = await PortChecker.checkPorts([port]);

      expect(results[0].available).toBe(false);
      expect(results[0].reason).toBeDefined();
      expect(results[0].reason).toContain('already in use');
    });

    it('should handle empty port array', async () => {
      const results = await PortChecker.checkPorts([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('findAvailablePort', () => {
    it('should find next available port in range', async () => {
      const startPort = 39010;
      const endPort = 39020;

      const availablePort = await PortChecker.findAvailablePort(startPort, endPort);

      expect(availablePort).not.toBeNull();
      expect(availablePort).toBeGreaterThanOrEqual(startPort);
      expect(availablePort).toBeLessThanOrEqual(endPort);
    });

    it('should return null if no ports available in range', async () => {
      const startPort = 39030;
      const endPort = 39032;

      // Occupy all ports in range
      for (let port = startPort; port <= endPort; port++) {
        const server = createServer();
        await new Promise<void>((resolve) => {
          server.listen(port, () => resolve());
        });
        testServers.push(server);
      }

      const availablePort = await PortChecker.findAvailablePort(startPort, endPort);
      expect(availablePort).toBeNull();
    });

    it('should use default range if not specified', async () => {
      const port = await PortChecker.findAvailablePort();
      expect(port).not.toBeNull();
      expect(port).toBeGreaterThanOrEqual(1024);
    });

    it('should handle invalid ranges', async () => {
      await expect(PortChecker.findAvailablePort(40000, 30000)).rejects.toThrow(
        'Invalid port range'
      );
    });

    it('should adjust range if below minimum', async () => {
      const port = await PortChecker.findAvailablePort(100, 2000);
      expect(port).not.toBeNull();
      expect(port).toBeGreaterThanOrEqual(1024); // MIN_PORT
    });
  });

  describe('isValidPort', () => {
    it('should validate correct port numbers', () => {
      expect(PortChecker.isValidPort(1)).toBe(true);
      expect(PortChecker.isValidPort(1024)).toBe(true);
      expect(PortChecker.isValidPort(8080)).toBe(true);
      expect(PortChecker.isValidPort(65535)).toBe(true);
    });

    it('should invalidate incorrect port numbers', () => {
      expect(PortChecker.isValidPort(0)).toBe(false);
      expect(PortChecker.isValidPort(-1)).toBe(false);
      expect(PortChecker.isValidPort(65536)).toBe(false);
      expect(PortChecker.isValidPort(100000)).toBe(false);
      expect(PortChecker.isValidPort(3.14)).toBe(false);
      expect(PortChecker.isValidPort(NaN)).toBe(false);
    });
  });

  describe('Port range classification', () => {
    it('should correctly identify system ports', () => {
      expect(PortChecker.isSystemPort(80)).toBe(true);
      expect(PortChecker.isSystemPort(443)).toBe(true);
      expect(PortChecker.isSystemPort(1023)).toBe(true);
      expect(PortChecker.isSystemPort(1024)).toBe(false);
    });

    it('should correctly identify user ports', () => {
      expect(PortChecker.isUserPort(1024)).toBe(true);
      expect(PortChecker.isUserPort(3000)).toBe(true);
      expect(PortChecker.isUserPort(8080)).toBe(true);
      expect(PortChecker.isUserPort(49151)).toBe(true);
      expect(PortChecker.isUserPort(49152)).toBe(false);
      expect(PortChecker.isUserPort(1023)).toBe(false);
    });

    it('should correctly identify dynamic ports', () => {
      expect(PortChecker.isDynamicPort(49152)).toBe(true);
      expect(PortChecker.isDynamicPort(50000)).toBe(true);
      expect(PortChecker.isDynamicPort(65535)).toBe(true);
      expect(PortChecker.isDynamicPort(49151)).toBe(false);
    });

    it('should return correct recommended ranges', () => {
      const ranges = PortChecker.getRecommendedRanges();

      expect(ranges.system.start).toBe(1);
      expect(ranges.system.end).toBe(1023);

      expect(ranges.user.start).toBe(1024);
      expect(ranges.user.end).toBe(49151);

      expect(ranges.dynamic.start).toBe(49152);
      expect(ranges.dynamic.end).toBe(65535);
    });
  });

  describe('waitForPort', () => {
    it('should wait for port to become available', async () => {
      const port = 39040;

      // Occupy port temporarily
      const server = createServer();
      await new Promise<void>((resolve) => {
        server.listen(port, () => resolve());
      });
      testServers.push(server);

      // Start waiting and release port after delay
      const waitPromise = PortChecker.waitForPort(port, 2000, 100);

      setTimeout(() => {
        server.close();
      }, 500);

      const available = await waitPromise;
      expect(available).toBe(true);
    });

    it('should timeout if port never becomes available', async () => {
      const port = 39041;

      // Occupy port
      const server = createServer();
      await new Promise<void>((resolve) => {
        server.listen(port, () => resolve());
      });
      testServers.push(server);

      const available = await PortChecker.waitForPort(port, 500, 100);
      expect(available).toBe(false);
    });

    it('should return true immediately if port already available', async () => {
      const port = 39042;
      const available = await PortChecker.waitForPort(port, 1000, 100);
      expect(available).toBe(true);
    });
  });

  describe('generatePortReport', () => {
    it('should generate comprehensive report', async () => {
      const ports = [39050, 39051, 39052];

      // Occupy middle port
      const server = createServer();
      await new Promise<void>((resolve) => {
        server.listen(39051, () => resolve());
      });
      testServers.push(server);

      const report = await PortChecker.generatePortReport(ports);

      expect(report).toContain('AUTONOMOUS PORT AVAILABILITY REPORT');
      expect(report).toContain('Port 39050');
      expect(report).toContain('Port 39051');
      expect(report).toContain('Port 39052');
      expect(report).toContain('AVAILABLE');
      expect(report).toContain('IN USE');
      expect(report).toContain('Summary');
    });

    it('should show process information in report', async () => {
      const port = 39053;

      const server = createServer();
      await new Promise<void>((resolve) => {
        server.listen(port, () => resolve());
      });
      testServers.push(server);

      const report = await PortChecker.generatePortReport([port]);

      expect(report).toContain('IN USE');
      // Process info may or may not be available depending on platform
      expect(report).toContain('Port 39053');
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid consecutive checks', async () => {
      const port = 39060;

      const results = await Promise.all([
        PortChecker.isPortAvailable(port),
        PortChecker.isPortAvailable(port),
        PortChecker.isPortAvailable(port),
      ]);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(typeof result).toBe('boolean');
      });
    });

    it('should handle checking same port multiple times', async () => {
      const port = 39061;

      const result1 = await PortChecker.isPortAvailable(port);
      const result2 = await PortChecker.isPortAvailable(port);
      const result3 = await PortChecker.isPortAvailable(port);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });
});
