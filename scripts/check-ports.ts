#!/usr/bin/env node
/**
 * Port Checker CLI Tool
 * 
 * Command-line utility for checking port availability
 * 
 * Usage:
 *   npm run check:ports                    - Check all registered services
 *   npm run check:ports -- --port 3000     - Check specific port
 *   npm run check:ports -- --kill 3000     - Kill process on port
 *   npm run check:ports -- --list          - List all services
 *   npm run check:ports -- --find 3000     - Find available port starting from 3000
 */

import { PortChecker } from '../src/infrastructure/network/PortChecker.js';
import { ServiceRegistry } from '../src/infrastructure/network/ServiceRegistry.js';
import { AutonomousPortChecker } from '../src/infrastructure/network/AutonomousPortChecker.js';

interface CLIArgs {
  port?: number;
  kill?: number;
  list?: boolean;
  find?: number;
  help?: boolean;
  quiet?: boolean;
  autoResolve?: boolean;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--port':
      case '-p':
        args.port = parseInt(argv[++i], 10);
        break;
      case '--kill':
      case '-k':
        args.kill = parseInt(argv[++i], 10);
        break;
      case '--find':
      case '-f':
        args.find = parseInt(argv[++i], 10);
        break;
      case '--list':
      case '-l':
        args.list = true;
        break;
      case '--quiet':
      case '-q':
        args.quiet = true;
        break;
      case '--auto-resolve':
      case '-a':
        args.autoResolve = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                   PORT CHECKER CLI TOOL                       ║
╚═══════════════════════════════════════════════════════════════╝

USAGE:
  npm run check:ports [options]

OPTIONS:
  --port, -p <port>      Check if specific port is available
  --kill, -k <port>      Kill process using specified port
  --find, -f <start>     Find next available port from start
  --list, -l             List all registered services
  --auto-resolve, -a     Automatically resolve port conflicts
  --quiet, -q            Quiet mode (minimal output)
  --help, -h             Show this help message

EXAMPLES:
  npm run check:ports
    Check all registered services

  npm run check:ports -- --port 3000
    Check if port 3000 is available

  npm run check:ports -- --kill 3000
    Kill process using port 3000

  npm run check:ports -- --find 3000
    Find next available port starting from 3000

  npm run check:ports -- --list
    List all registered services and their ports

  npm run check:ports -- --auto-resolve
    Check all services and auto-resolve conflicts

For more information, see docs/PORT_CHECKING_GUIDE.md
`);
}

async function checkSpecificPort(port: number): Promise<void> {
  console.log(`\n🔍 Checking port ${port}...\n`);

  const available = await PortChecker.isPortAvailable(port);

  if (available) {
    console.log(`✅ Port ${port} is AVAILABLE\n`);
    process.exit(0);
  } else {
    console.log(`❌ Port ${port} is IN USE\n`);

    const processInfo = await PortChecker.getProcessUsingPort(port);
    if (processInfo) {
      console.log(`   Process: ${processInfo.name}`);
      console.log(`   PID: ${processInfo.pid}\n`);
    }

    process.exit(1);
  }
}

async function killProcessOnPort(port: number): Promise<void> {
  console.log(`\n🗡️  Attempting to kill process on port ${port}...\n`);

  const processInfo = await PortChecker.getProcessUsingPort(port);
  if (!processInfo) {
    console.log(`ℹ️  No process found using port ${port}\n`);
    process.exit(0);
  }

  console.log(`   Found: ${processInfo.name} (PID: ${processInfo.pid})`);

  const killed = await PortChecker.killProcessOnPort(port);

  if (killed) {
    console.log(`   ✅ Process killed successfully\n`);

    // Wait and verify
    const available = await PortChecker.waitForPort(port, 3000);
    if (available) {
      console.log(`   ✅ Port ${port} is now available\n`);
      process.exit(0);
    } else {
      console.log(`   ⚠️  Port ${port} is still in use\n`);
      process.exit(1);
    }
  } else {
    console.log(`   ❌ Failed to kill process (may require elevated permissions)\n`);
    process.exit(1);
  }
}

async function findAvailablePort(startPort: number): Promise<void> {
  console.log(`\n🔍 Finding available port starting from ${startPort}...\n`);

  const availablePort = await PortChecker.findAvailablePort(startPort, startPort + 100);

  if (availablePort) {
    console.log(`✅ Found available port: ${availablePort}\n`);
    process.exit(0);
  } else {
    console.log(`❌ No available ports found in range ${startPort}-${startPort + 100}\n`);
    process.exit(1);
  }
}

async function listServices(): Promise<void> {
  const registry = ServiceRegistry.getInstance();
  const report = await registry.generateStatusReport();
  console.log('\n' + report + '\n');
}

async function checkAllServices(autoResolve: boolean = false): Promise<void> {
  const checker = new AutonomousPortChecker({
    autoResolve,
    verbose: true,
    throwOnConflict: false,
  });

  const report = await checker.checkPorts();

  // Exit code based on result
  if (report.allAvailable || report.conflictsResolved === report.conflictsFound) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  // Help
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Specific port check
  if (args.port !== undefined) {
    await checkSpecificPort(args.port);
    return;
  }

  // Kill process
  if (args.kill !== undefined) {
    await killProcessOnPort(args.kill);
    return;
  }

  // Find available port
  if (args.find !== undefined) {
    await findAvailablePort(args.find);
    return;
  }

  // List services
  if (args.list) {
    await listServices();
    return;
  }

  // Default: Check all services
  await checkAllServices(args.autoResolve);
}

// Run CLI
main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
