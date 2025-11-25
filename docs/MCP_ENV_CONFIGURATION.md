# MCP Configuration with Environment Variables

This guide shows how to configure the Model Context Protocol (MCP) to load all environment variables from your `.env` file at startup.

## Option 1: Using `dotenv` in MCP Configuration (Recommended)

Update your `.mcp.json` to include all required environment variables. The MCP server will inherit these from the environment:

```json
{
  "$schema": "https://modelcontextprotocol.io/schema/mcp.json",
  "mcpServers": {
    "autonomous-agent": {
      "command": "node",
      "args": [
        "-r",
        "dotenv/config",
        "dist/src/main.js"
      ],
      "env": {
        "DOTENV_CONFIG_PATH": ".env"
      }
    }
  }
}
```

This uses Node.js's `-r` flag to preload `dotenv/config` which automatically loads your `.env` file.

## Option 2: Explicit Environment Variables in MCP

For VS Code's MCP extension or GitHub Copilot workspace, you can explicitly define environment variables:

```json
{
  "$schema": "https://modelcontextprotocol.io/schema/mcp.json",
  "mcpServers": {
    "autonomous-agent": {
      "command": "node",
      "args": ["dist/src/main.js"],
      "env": {
        "NODE_ENV": "production",
        "CHAIN_ID": "8453",
        
        "BASE_RPC_URL": "${BASE_RPC_URL}",
        "ETHEREUM_RPC_URL": "${ETHEREUM_RPC_URL}",
        "ARBITRUM_RPC_URL": "${ARBITRUM_RPC_URL}",
        "POLYGON_RPC_URL": "${POLYGON_RPC_URL}",
        "OPTIMISM_RPC_URL": "${OPTIMISM_RPC_URL}",
        
        "WALLET_PRIVATE_KEY": "${WALLET_PRIVATE_KEY}",
        
        "ALCHEMY_API_KEY": "${ALCHEMY_API_KEY}",
        "INFURA_API_KEY": "${INFURA_API_KEY}",
        "ETHERSCAN_API_KEY": "${ETHERSCAN_API_KEY}",
        "BASESCAN_API_KEY": "${BASESCAN_API_KEY}",
        
        "DRY_RUN": "false",
        "SCAN_INTERVAL": "1000",
        "MIN_PROFIT_PERCENT": "0.08",
        
        "FLASHSWAP_V2_ADDRESS": "${FLASHSWAP_V2_ADDRESS}",
        "FLASHSWAP_V2_OWNER": "${FLASHSWAP_V2_OWNER}",
        
        "PHASE3_AI_ENABLED": "true",
        "PHASE3_SECURITY_ENABLED": "true",
        
        "GEMINI_API_KEY": "${GEMINI_API_KEY}",
        "GH_PAT_COPILOT": "${GH_PAT_COPILOT}"
      }
    }
  }
}
```

## Option 3: Shell Wrapper Script

Create a wrapper script that loads the environment before starting the MCP server:

**`scripts/mcp-start.sh`:**
```bash
#!/bin/bash
set -a
source .env
set +a
exec node dist/src/main.js "$@"
```

Then use it in `.mcp.json`:
```json
{
  "mcpServers": {
    "autonomous-agent": {
      "command": "bash",
      "args": ["scripts/mcp-start.sh"]
    }
  }
}
```

## Option 4: VS Code Settings (for Copilot Workspace)

Add to your `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "copilot-consciousness": {
      "command": "node",
      "args": ["-r", "dotenv/config", "dist/src/main.js"],
      "cwd": "${workspaceFolder}",
      "env": {
        "DOTENV_CONFIG_PATH": "${workspaceFolder}/.env"
      }
    }
  }
}
```

## Option 5: GitHub Codespaces / DevContainer

In `.devcontainer/devcontainer.json`, you can specify environment variables that will be loaded automatically:

```json
{
  "name": "Copilot-Consciousness",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",
  "features": {},
  "customizations": {
    "vscode": {
      "settings": {
        "mcp.autoLoadEnv": true
      }
    }
  },
  "secrets": [
    "WALLET_PRIVATE_KEY",
    "BASE_RPC_URL",
    "ALCHEMY_API_KEY",
    "GEMINI_API_KEY",
    "GH_PAT_COPILOT"
  ],
  "postCreateCommand": "npm install && npm run build"
}
```

Then set the secrets in GitHub Codespaces settings.

## Complete `.mcp.json` Example with All Environment Variables

Here's a complete example that includes all the key environment variables for TheWarden:

```json
{
  "$schema": "https://modelcontextprotocol.io/schema/mcp.json",
  "description": "MCP configuration for Copilot-Consciousness with full environment variable support",
  "mcpServers": {
    "autonomous-agent": {
      "command": "node",
      "args": ["-r", "dotenv/config", "dist/src/main.js"],
      "description": "TheWarden autonomous agent with environment auto-loading",
      "env": {
        "DOTENV_CONFIG_PATH": ".env",
        
        "NODE_ENV": "${NODE_ENV:-production}",
        "CHAIN_ID": "${CHAIN_ID:-8453}",
        
        "BASE_RPC_URL": "${BASE_RPC_URL}",
        "ETHEREUM_RPC_URL": "${ETHEREUM_RPC_URL}",
        "ARBITRUM_RPC_URL": "${ARBITRUM_RPC_URL}",
        "POLYGON_RPC_URL": "${POLYGON_RPC_URL}",
        "OPTIMISM_RPC_URL": "${OPTIMISM_RPC_URL}",
        "RPC_URL": "${RPC_URL}",
        
        "WALLET_PRIVATE_KEY": "${WALLET_PRIVATE_KEY}",
        
        "ALCHEMY_API_KEY": "${ALCHEMY_API_KEY}",
        "INFURA_API_KEY": "${INFURA_API_KEY}",
        "ETHERSCAN_API_KEY": "${ETHERSCAN_API_KEY}",
        "BASESCAN_API_KEY": "${BASESCAN_API_KEY}",
        
        "DRY_RUN": "${DRY_RUN:-false}",
        "SCAN_INTERVAL": "${SCAN_INTERVAL:-1000}",
        "MIN_PROFIT_PERCENT": "${MIN_PROFIT_PERCENT:-0.08}",
        "MIN_PROFIT_THRESHOLD": "${MIN_PROFIT_THRESHOLD:-0.01}",
        "MIN_LIQUIDITY": "${MIN_LIQUIDITY:-10000}",
        "MAX_GAS_PRICE": "${MAX_GAS_PRICE:-100}",
        "MAX_GAS_COST_PERCENTAGE": "${MAX_GAS_COST_PERCENTAGE:-40}",
        
        "FLASHSWAP_V2_ADDRESS": "${FLASHSWAP_V2_ADDRESS}",
        "FLASHSWAP_V2_OWNER": "${FLASHSWAP_V2_OWNER}",
        
        "ENABLE_ML_PREDICTIONS": "${ENABLE_ML_PREDICTIONS:-true}",
        "ENABLE_CROSS_CHAIN": "${ENABLE_CROSS_CHAIN:-true}",
        
        "PHASE3_AI_ENABLED": "${PHASE3_AI_ENABLED:-true}",
        "PHASE3_SECURITY_ENABLED": "${PHASE3_SECURITY_ENABLED:-true}",
        
        "GEMINI_API_KEY": "${GEMINI_API_KEY}",
        "GH_PAT_COPILOT": "${GH_PAT_COPILOT}",
        
        "DASHBOARD_PORT": "${DASHBOARD_PORT:-3000}",
        "LOG_LEVEL": "${LOG_LEVEL:-debug}",
        
        "DATABASE_URL": "${DATABASE_URL}",
        "REDIS_URL": "${REDIS_URL}"
      },
      "capabilities": [
        "autonomous_monitoring",
        "consciousness_decision",
        "ethical_execution",
        "adaptive_learning",
        "risk_assessment"
      ]
    },
    "consciousness-system": {
      "command": "node",
      "args": ["-r", "dotenv/config", "dist/src/consciousness.js"],
      "env": {
        "DOTENV_CONFIG_PATH": ".env",
        "NODE_ENV": "${NODE_ENV:-production}"
      }
    },
    "mev-intelligence": {
      "command": "node",
      "args": ["-r", "dotenv/config", "dist/src/mev/index.js"],
      "env": {
        "DOTENV_CONFIG_PATH": ".env",
        "RPC_URL": "${RPC_URL}",
        "BASE_RPC_URL": "${BASE_RPC_URL}",
        "FLASHBOTS_AUTH_KEY": "${FLASHBOTS_AUTH_KEY}"
      }
    }
  },
  "defaults": {
    "timeout": 30000,
    "retries": 3
  },
  "version": "1.0.1"
}
```

## Loading Environment Variables Programmatically

If you need to ensure environment variables are loaded before MCP initialization, create a bootstrap file:

**`src/mcp-bootstrap.ts`:**
```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load .env file before anything else
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Validate critical environment variables
const requiredVars = [
  'WALLET_PRIVATE_KEY',
  'CHAIN_ID',
];

const optionalWithDefaults: Record<string, string> = {
  'BASE_RPC_URL': 'https://mainnet.base.org',
  'NODE_ENV': 'production',
  'DRY_RUN': 'false',
  'SCAN_INTERVAL': '1000',
  'MIN_PROFIT_PERCENT': '0.08',
};

// Check required vars
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    console.error('Please ensure your .env file is configured correctly.');
    process.exit(1);
  }
}

// Apply defaults for optional vars
for (const [varName, defaultValue] of Object.entries(optionalWithDefaults)) {
  if (!process.env[varName]) {
    process.env[varName] = defaultValue;
    console.log(`ℹ️  Using default value for ${varName}: ${defaultValue}`);
  }
}

console.log('✅ Environment variables loaded successfully');
console.log(`   Chain ID: ${process.env.CHAIN_ID}`);
console.log(`   Node ENV: ${process.env.NODE_ENV}`);
console.log(`   Dry Run: ${process.env.DRY_RUN}`);

// Now import and run the main application
import './main';
```

Then update `.mcp.json`:
```json
{
  "mcpServers": {
    "autonomous-agent": {
      "command": "node",
      "args": ["dist/src/mcp-bootstrap.js"]
    }
  }
}
```

## Quick Start

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your actual values (API keys, private key, etc.)

3. Build the project:
   ```bash
   npm run build
   ```

4. Start with MCP (using dotenv preload):
   ```bash
   node -r dotenv/config dist/src/main.js
   ```

## Security Notes

⚠️ **NEVER** commit your `.env` file to version control!

The `.env` file is already in `.gitignore`, but double-check before pushing any changes.

For production deployments, consider:
- Using environment variables directly (Docker, K8s secrets)
- Using a secrets manager (HashiCorp Vault, AWS Secrets Manager)
- Using GitHub Codespaces secrets for development
