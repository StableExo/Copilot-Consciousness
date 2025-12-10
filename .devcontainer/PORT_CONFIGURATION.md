# Codespaces Port Configuration

## Overview
This document explains the port configuration for GitHub Codespaces in this repository.

## Configured Ports

### Web-based UIs (HTTPS)
- **3000**: Dashboard - Main web dashboard for monitoring
- **3001**: Red Team Dashboard - Security testing dashboard  
- **3010**: Grafana - Data visualization and monitoring UI
- **8080**: Health Check - System health monitoring endpoint
- **8500**: Consul UI - Service discovery and configuration UI
- **9090**: Prometheus UI - Metrics and monitoring UI
- **15672**: RabbitMQ Management UI - Message queue administration UI

### Database/Binary Protocol Ports (HTTP)
- **5432**: PostgreSQL/TimescaleDB - Time-series database
- **5672**: RabbitMQ - Message queue (AMQP protocol)
- **6379**: Redis - In-memory cache

## Security Configuration

All ports are configured with:
- **visibility: "private"** - Requires authentication to access
- Appropriate protocol settings (HTTP for binary protocols, HTTPS for web UIs)
- Auto-forward behaviors (notify, silent, or ignore)

## Known Issues

### Port 3 Issue
If you see a "Port 3" appearing in Codespaces with address `http://127.0.0.1:3/`, this is a Codespaces auto-detection bug that can occur when:
- The devcontainer configuration is incomplete
- Codespaces incorrectly parses port numbers from configuration files
- A container rebuild is needed after configuration changes

**Solution**: Rebuild the devcontainer using the command palette:
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Select "Codespaces: Rebuild Container"
3. Wait for the rebuild to complete

The port configuration in `devcontainer.json` has been updated to prevent this issue by:
- Explicitly defining all ports with complete configuration
- Setting all ports to private visibility
- Providing proper labels and protocols for each port

## How to Verify Configuration

After rebuilding, you should see the following ports in the Ports panel:
- All ports listed above with their correct labels
- No "Port 3" or other unexpected ports
- All ports marked as "Private" visibility

## Rebuilding the Container

When `devcontainer.json` changes, GitHub Codespaces will prompt you to rebuild. Always rebuild to ensure the new port configuration takes effect.

## References
- [GitHub Codespaces Port Forwarding](https://docs.github.com/en/codespaces/developing-in-codespaces/forwarding-ports-in-your-codespace)
- [Dev Container Port Attributes](https://containers.dev/implementors/json_reference/#port-attributes)
