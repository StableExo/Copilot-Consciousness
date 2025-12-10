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

### Application Services

| Service | Default Port | Fallback Range | Required | Protocol |
|---------|-------------|----------------|----------|----------|
| api-server | 3000 | 3000-3010 | ✅ Yes | HTTP |
| dashboard | 3000 | 3000-3010 | No | HTTP |
| collaboration | 3001 | 3001-3020 | No | HTTP |
| mcp-memory | 3002 | 3002-3010 | No | HTTP |
| mcp-ethics | 3003 | 3003-3010 | No | HTTP |
| mcp-consciousness | 3004 | 3004-3010 | No | HTTP |
| websocket | 3005 | 3005-3015 | No | WebSocket |
| health-check | 3100 | 3100-3110 | No | HTTP |

### Web Services (HTTP/HTTPS)

| Service | Default Port | Fallback Range | Required | Protocol |
|---------|-------------|----------------|----------|----------|
| http | 80 | 8080-8090 | No | HTTP |
| https | 443 | 8443-8453 | No | HTTPS/TLS |

> **Note**: The port checker works for ALL TCP-based protocols including HTTP, HTTPS, WebSocket, etc. 
> The protocol type is just for documentation - the underlying mechanism checks TCP port availability.

### Infrastructure Services

| Service | Default Port | Fallback Range | Required | Protocol |
|---------|-------------|----------------|----------|----------|
| grafana | 3010 | 3010-3020 | No | HTTP |
| rabbitmq | 5672 | 5672-5680 | No | AMQP |
| rabbitmq-mgmt | 15672 | 15672-15680 | No | HTTP |
| redis | 6379 | 6379-6390 | No | Redis |
| postgres | 5432 | 5432-5440 | No | PostgreSQL |
| consul | 8500 | 8500-8510 | No | HTTP |
| jaeger | 16686 | 16686-16696 | No | HTTP |
| metrics | 9090 | 9090-9100 | No | HTTP |

## Configuration

Ports can be configured via environment variables:

```bash
# ═══════════════════════════════════════════════════════════════
# APPLICATION SERVICES
# ═══════════════════════════════════════════════════════════════

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

# ═══════════════════════════════════════════════════════════════
# WEB SERVICES (HTTP/HTTPS)
# ═══════════════════════════════════════════════════════════════

# HTTP Port (Standard: 80, Alternative: 8080+)
HTTP_PORT=80

# HTTPS Port (Standard: 443, Alternative: 8443+)
HTTPS_PORT=443

# ═══════════════════════════════════════════════════════════════
# INFRASTRUCTURE SERVICES
# ═══════════════════════════════════════════════════════════════

# Grafana Monitoring
GRAFANA_PORT=3010

# RabbitMQ Message Queue
RABBITMQ_PORT=5672
RABBITMQ_MGMT_PORT=15672

# Redis Cache
REDIS_PORT=6379

# PostgreSQL Database
POSTGRES_PORT=5432

# Consul Service Discovery
CONSUL_PORT=8500

# Jaeger Tracing UI
JAEGER_UI_PORT=16686

# Prometheus Metrics
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

## Frequently Asked Questions (FAQ)

### Q: Does the port checker check HTTP and HTTPS ports?

**A: Yes!** The port checker checks **all TCP ports**, including HTTP (port 80), HTTPS (port 443), and any other TCP-based protocol.

**How it works:**
- The port checker uses Node.js `net.createServer()` to attempt binding to a port
- This checks TCP port availability at the transport layer
- HTTP, HTTPS, WebSocket, and other application protocols all run on TCP
- If port 80 (HTTP) or 443 (HTTPS) is in use, the checker will detect it

**Example:**
```bash
# Check if HTTP port is available
npm run check:ports -- --port 80

# Check if HTTPS port is available
npm run check:ports -- --port 443

# Check all registered services (including http and https)
npm run check:ports
```

**Protocol Independence:**
The port checker doesn't care what protocol uses the port. It simply checks if the TCP port is available for binding. Whether it's HTTP, HTTPS, FTP, SSH, or any other TCP-based service - the checker works the same way.

### Q: I see "api-server" and "dashboard" both using port 3000. How is that possible?

**A: They can't both use the same port simultaneously.** Here's what's happening:

1. **Default Configuration**: Both services have port 3000 as their *default* in the config
2. **Actual Usage**: Only ONE service can bind to port 3000 at a time
3. **Automatic Resolution**: When `--auto-resolve` is used, one service gets port 3000, the other gets an alternative (like 3002)

**Recommendation:** Configure services to use different default ports in `.env`:
```bash
PORT=3000              # API Server
DASHBOARD_PORT=3001    # Dashboard (different port)
```

### Q: Why doesn't the port checker show ports like 5672 (RabbitMQ) or 6379 (Redis)?

**A: These infrastructure services were added in the latest update!**

Previously, the port checker only monitored application-specific ports (3000-9090). Now it includes:

**Newly Added Infrastructure Ports:**
- HTTP (80) & HTTPS (443) ← Web servers/load balancers
- Grafana (3010) ← Monitoring dashboard
- RabbitMQ (5672, 15672) ← Message queue
- Redis (6379) ← Cache
- PostgreSQL (5432) ← Database  
- Consul (8500) ← Service discovery
- Jaeger (16686) ← Distributed tracing

**Total Services Monitored: 18** (up from 9)

To see all registered services:
```bash
npm run check:ports -- --list
```

### Q: How do I check ports for Docker containers?

**A: Docker containers use port mapping.** Example from `docker-compose.yml`:

```yaml
nginx:
  ports:
    - "80:80"      # Host port 80 maps to container port 80
    - "443:443"    # Host port 443 maps to container port 443
```

**To check Docker-mapped ports:**
```bash
# Check if host port 80 is available (before starting container)
npm run check:ports -- --port 80

# Check if host port 443 is available
npm run check:ports -- --port 443

# Check all infrastructure ports before docker-compose up
npm run check:ports
```

**If a container is already running:**
```bash
# See which process (Docker) is using the port
npm run check:ports -- --port 80

# Output: Port 80 is IN USE
#         Process: docker-proxy (PID: 12345)
```

### Q: What's the difference between checking port 80 vs 8080?

**A:**

**Port 80 (HTTP)**:
- Standard HTTP port
- Requires root/admin privileges to bind
- Used by web servers (nginx, apache, etc.)
- Browsers connect to `http://example.com` on port 80 by default

**Port 8080 (Alternative HTTP)**:
- Common alternative for HTTP
- Does NOT require elevated privileges
- Used for development, proxies, alternate services
- Browsers must specify: `http://example.com:8080`

**When to use each:**
- **Production**: Port 80 (with proper permissions or reverse proxy)
- **Development**: Port 8080 or higher (no sudo required)
- **Multiple services**: Use 8080, 8081, 8082, etc.

**Port Checker handles both:**
```bash
npm run check:ports -- --port 80    # Checks standard HTTP
npm run check:ports -- --port 8080  # Checks alternative HTTP
```

### Q: Can I check UDP ports?

**A: No, currently only TCP ports are supported.**

The port checker uses `net.createServer()` which only works with TCP. UDP requires different checking methods.

**TCP Services (Supported):**
- HTTP, HTTPS, WebSocket, FTP, SSH, SMTP, PostgreSQL, Redis, RabbitMQ, etc.

**UDP Services (Not Supported):**
- DNS queries, SNMP, DHCP, VoIP (some), gaming protocols (some)

**For UDP port checking**, use system tools:
```bash
# Linux/macOS
ss -ulnp | grep <port>
netstat -ulnp | grep <port>

# Windows
netstat -ano -p UDP | findstr <port>
```

### Q: The script shows "Port 3000 is AVAILABLE" but my service won't start. Why?

**Possible causes:**

1. **Timing Issue**: Port was available during check but got taken before service started
   - Solution: Use `--auto-resolve` to reserve ports atomically
   
2. **Firewall Blocking**: Port check works but firewall blocks actual binding
   - Solution: Check firewall rules with `ufw status` (Linux) or Windows Firewall
   
3. **Permission Issue**: Port <1024 requires root/admin
   - Solution: Use `sudo` or choose port ≥1024
   
4. **Wrong Interface**: Service binds to specific IP, checker tests all interfaces
   - Solution: Check if service binds to `0.0.0.0` (all) vs `127.0.0.1` (localhost)

5. **SELinux/AppArmor**: Security policy blocks port binding
   - Solution: Check SELinux with `sestatus` or AppArmor logs

### Q: How often should I run port checks?

**Recommendations:**

**During Development:**
```bash
# Before starting services
npm run check:ports
npm start
```

**In CI/CD Pipeline:**
```bash
# Before integration tests
npm run check:ports
npm run test:integration
```

**Production Deployment:**
```bash
# Before service restart
npm run check:ports -- --auto-resolve
systemctl restart thewarden
```

**Continuous Monitoring:**
```typescript
// In application code
const checker = new AutonomousPortChecker();
checker.startHealthCheck(300 00); // Check every 5 minutes
```

### Q: Can I add custom ports to the checker?

**A: Yes!** Register custom services:

```typescript
import { ServiceRegistry } from './src/infrastructure/network';

const registry = ServiceRegistry.getInstance();

// Add custom service
registry.registerService({
  name: 'my-custom-service',
  port: 4000,
  fallbackRange: { start: 4000, end: 4010 },
  required: false,
});

// Now it appears in all checks
const report = await registry.generateStatusReport();
```

Or via environment variable:
```bash
# .env
MY_CUSTOM_PORT=4000
```

Then update `ServiceRegistry.ts` to read it.

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
