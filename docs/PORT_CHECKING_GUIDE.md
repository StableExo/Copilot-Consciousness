# Autonomous Port Checking System

## Overview

TheWarden now includes a comprehensive autonomous port checking system that validates service port availability before startup, automatically resolves conflicts, and provides detailed reporting.

## Features

✅ **Pre-Startup Validation** - Check all ports before services start
✅ **Automatic Conflict Resolution** - Find alternative ports when conflicts detected  
✅ **Process Detection** - Identify which process is using a port
✅ **Intelligent Fallback** - Configurable fallback port ranges
✅ **Health Monitoring** - Continuous port availability checking
✅ **Detailed Reporting** - Comprehensive status reports with process information
✅ **CLI Tool** - Command-line interface for manual checks
✅ **Cross-Platform** - Works on Linux, macOS, and Windows

## Quick Start

### Check All Services

```bash
npm run check:ports
```

This will check all registered services and display their port status.

### Check Specific Port

```bash
npm run check:ports -- --port 3000
```

### Find Available Port

```bash
npm run check:ports -- --find 3000
```

Finds the next available port starting from 3000.

### List All Services

```bash
npm run check:ports -- --list
```

Shows all registered services and their configured ports.

### Auto-Resolve Conflicts

```bash
npm run check:ports -- --auto-resolve
```

Automatically assigns alternative ports to services with conflicts.

### Kill Process on Port

```bash
npm run check:ports -- --kill 3000
```

Terminates the process using port 3000 (requires appropriate permissions).

## Programmatic Usage

### Basic Port Check

```typescript
import { PortChecker } from './src/infrastructure/network';

// Check if port is available
const available = await PortChecker.isPortAvailable(3000);
console.log(`Port 3000 is ${available ? 'available' : 'in use'}`);

// Find next available port
const port = await PortChecker.findAvailablePort(3000, 3100);
console.log(`Found available port: ${port}`);

// Get process using port
const processInfo = await PortChecker.getProcessUsingPort(3000);
if (processInfo) {
  console.log(`Port 3000 used by ${processInfo.name} (PID: ${processInfo.pid})`);
}
```

### Service Registry

```typescript
import { ServiceRegistry } from './src/infrastructure/network';

const registry = ServiceRegistry.getInstance();

// Register a new service
registry.registerService({
  name: 'my-service',
  port: 4000,
  fallbackRange: { start: 4000, end: 4010 },
  required: true,
});

// Check all services
const statusMap = await registry.checkAllServices();
for (const [name, status] of statusMap) {
  console.log(`${name}: ${status.available ? 'Available' : 'In Use'}`);
}

// Generate comprehensive report
const report = await registry.generateStatusReport();
console.log(report);
```

### Autonomous Port Checker

```typescript
import { AutonomousPortChecker } from './src/infrastructure/network';

// Create checker with options
const checker = new AutonomousPortChecker({
  autoResolve: true,       // Automatically find alternative ports
  throwOnConflict: false,  // Don't throw errors, just report
  verbose: true,           // Print detailed output
  killConflicting: false,  // Don't kill conflicting processes
});

// Run port check
const report = await checker.checkPorts();

console.log(`All available: ${report.allAvailable}`);
console.log(`Conflicts found: ${report.conflictsFound}`);
console.log(`Conflicts resolved: ${report.conflictsResolved}`);

// Quick boolean check
const allClear = await checker.quickCheck();

// Start health monitoring
const intervalId = checker.startHealthCheck(30000); // Check every 30 seconds
```

### Pre-Startup Integration

```typescript
import { checkPortsBeforeStart } from './src/infrastructure/network';

async function startServer() {
  // Check ports before starting services
  const report = await checkPortsBeforeStart({
    autoResolve: true,
    verbose: true,
  });

  if (!report.allAvailable && report.conflictsResolved === 0) {
    console.error('Cannot start: Port conflicts detected');
    process.exit(1);
  }

  // Start your services here...
}
```

## Registered Services

The following services are registered by default:

| Service | Default Port | Fallback Range | Required |
|---------|-------------|----------------|----------|
| api-server | 3000 | 3000-3010 | ✅ Yes |
| dashboard | 3000 | 3000-3010 | No |
| collaboration | 3001 | 3001-3020 | No |
| mcp-memory | 3002 | 3002-3010 | No |
| mcp-ethics | 3003 | 3003-3010 | No |
| mcp-consciousness | 3004 | 3004-3010 | No |
| websocket | 3005 | 3005-3015 | No |
| health-check | 3100 | 3100-3110 | No |
| metrics | 9090 | 9090-9100 | No |

## Configuration

Ports can be configured via environment variables:

```bash
# Main API Server
PORT=3000

# Dashboard
DASHBOARD_PORT=3000

# Collaboration Interface
COLLAB_PORT=3001

# MCP Servers
MCP_MEMORY_PORT=3002
MCP_ETHICS_PORT=3003
MCP_CONSCIOUSNESS_PORT=3004

# WebSocket Server
WEBSOCKET_PORT=3005

# Health Check
HEALTH_CHECK_PORT=3100

# Metrics/Prometheus
METRICS_PORT=9090
```

## Port Ranges

The system recognizes three port ranges:

- **System Ports** (1-1023): Require root/admin privileges
- **User Ports** (1024-49151): Recommended for applications  
- **Dynamic Ports** (49152-65535): Ephemeral ports assigned by OS

## Conflict Resolution Strategies

When a port conflict is detected, the system can:

1. **Find Alternative Port**: Search fallback range for available port
2. **Kill Conflicting Process**: Terminate process using the port (optional)
3. **Report and Continue**: Document conflict and allow manual resolution
4. **Fail Fast**: Throw error and halt startup (for required services)

## CLI Options

```bash
npm run check:ports -- [options]

OPTIONS:
  --port, -p <port>      Check if specific port is available
  --kill, -k <port>      Kill process using specified port
  --find, -f <start>     Find next available port from start
  --list, -l             List all registered services
  --auto-resolve, -a     Automatically resolve port conflicts
  --quiet, -q            Quiet mode (minimal output)
  --help, -h             Show help message
```

## Example Output

```
╔═══════════════════════════════════════════════════════════════╗
║          AUTONOMOUS PORT CHECKER - PRE-STARTUP SCAN           ║
╚═══════════════════════════════════════════════════════════════╝

📊 Services checked: 9
✅ Available: 7
❌ Conflicts: 2

🔧 RESOLVING PORT CONFLICTS:
─────────────────────────────────────────────────────────────

  Service: api-server
  Port: 3000
  Blocking process: node (PID: 12345)
  🔍 Searching for alternative port in range 3000-3010...
  ✅ Resolved: api-server → Port 3002

  Service: websocket
  Port: 3005
  Blocking process: npm (PID: 12346)
  🔍 Searching for alternative port in range 3005-3015...
  ✅ Resolved: websocket → Port 3006

─────────────────────────────────────────────────────────────
Conflicts resolved: 2/2

╔═══════════════════════════════════════════════════════════════╗
║                    FINAL PORT CHECK REPORT                    ║
╚═══════════════════════════════════════════════════════════════╝

✅ AVAILABLE SERVICES:
   dashboard             → Port 3001
   collaboration         → Port 3002
   mcp-memory            → Port 3003
   mcp-ethics            → Port 3004
   mcp-consciousness     → Port 3005
   health-check          → Port 3100
   metrics               → Port 9090

🔧 PORT RESOLUTIONS:
   api-server → Port 3002 (automatically assigned)
   websocket → Port 3006 (automatically assigned)

─────────────────────────────────────────────────────────────
Status: ✅ ALL CLEAR
Conflicts: 2
Resolved: 2
─────────────────────────────────────────────────────────────

⏱️  Scan completed in 245ms
```

## Testing

Run the port checker tests:

```bash
npm test -- tests/unit/infrastructure/PortChecker.test.ts
```

## Integration with Existing Services

### Dashboard Server

```typescript
import { checkPortsBeforeStart } from './infrastructure/network';

class DashboardServer {
  async start() {
    // Check ports before starting
    await checkPortsBeforeStart({ autoResolve: true });

    // Start dashboard server...
    this.app.listen(this.config.port);
  }
}
```

### Collaboration Interface

```typescript
import { PortChecker } from './infrastructure/network';

class LiveCollaborationInterface {
  private port = parseInt(process.env.COLLAB_PORT || '3001', 10);

  async start() {
    // Verify port is available
    const available = await PortChecker.isPortAvailable(this.port);

    if (!available) {
      // Find alternative
      const altPort = await PortChecker.findAvailablePort(this.port, this.port + 20);
      if (altPort) {
        this.port = altPort;
        console.log(`Using alternative port: ${altPort}`);
      }
    }

    this.server.listen(this.port);
  }
}
```

## Best Practices

1. **Always check ports before starting services**
   - Prevents cryptic "EADDRINUSE" errors
   - Provides clear feedback about conflicts

2. **Configure fallback ranges**
   - Allows automatic conflict resolution
   - Ensures services can start even with conflicts

3. **Use health monitoring in production**
   - Detects if ports become unavailable during runtime
   - Enables proactive issue detection

4. **Mark critical services as required**
   - Ensures essential services have ports available
   - Fails fast if critical ports unavailable

5. **Document custom port ranges**
   - Update this guide when adding new services
   - Keep port assignments organized

## Troubleshooting

### Port Already in Use

```bash
# Check which process is using the port
npm run check:ports -- --port 3000

# Kill the process (if appropriate)
npm run check:ports -- --kill 3000

# Or find alternative port
npm run check:ports -- --find 3000
```

### Permission Denied

On Linux/macOS, ports below 1024 require root privileges:

```bash
# Don't use system ports
# Use ports 1024+ for user applications

# If you must use system ports:
sudo npm start
```

### Multiple Services Same Port

Configure different ports in `.env`:

```bash
PORT=3000
DASHBOARD_PORT=3001
COLLAB_PORT=3002
```

### Port Check Timeout

If port checks hang, a service may be in a bad state:

```bash
# Check system network connections
lsof -i -P -n | grep LISTEN  # macOS/Linux
netstat -ano | findstr LISTENING  # Windows

# Restart the stuck service
```

## Security Considerations

- **Process Killing**: Only kill processes you own
- **System Ports**: Require elevated privileges (avoid if possible)
- **Port Scanning**: May trigger security monitoring on some networks
- **Sensitive Services**: Be careful exposing internal services

## Future Enhancements

- [ ] Docker container port mapping integration
- [ ] Kubernetes service port management
- [ ] Cloud provider load balancer integration
- [ ] Automatic firewall rule updates
- [ ] Port reservation system
- [ ] WebSocket health check integration
- [ ] Metrics export (Prometheus format)

## Support

For issues or questions:
- Check existing services: `npm run check:ports -- --list`
- Generate full report: `npm run check:ports`
- See logs in `logs/port-checker.log`
- Open issue on GitHub with port check output

## Related Documentation

- [Main Runner Documentation](./MAIN_RUNNER.md)
- [Dashboard Server](./DASHBOARD_SETUP.md)
- [MCP Configuration](./MCP_CONFIGURATION.md)
- [Environment Variables](../ENVIRONMENT_REFERENCE.md)
