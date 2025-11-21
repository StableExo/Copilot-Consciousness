# MCP Configuration Examples

This directory contains example MCP (Model Context Protocol) configuration files for different use cases.

## Available Examples

### 1. `minimal-dev.mcp.json` - Minimal Development Configuration

Suitable for:
- Local development
- Testing consciousness features
- Learning the system

**Includes**:
- Consciousness system only

**Usage**:
```bash
# Copy to project root
cp examples/mcp/minimal-dev.mcp.json .mcp.json

# Or use directly
export MCP_CONFIG=examples/mcp/minimal-dev.mcp.json
```

### 2. `defi-focus.mcp.json` - DeFi & MEV Configuration

Suitable for:
- DeFi application development
- MEV research and monitoring
- Arbitrage strategy development
- DEX analytics

**Includes**:
- MEV Intelligence Suite
- DEX Services
- Analytics & Learning

**Required Environment Variables**:
```bash
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
FLASHBOTS_AUTH_KEY=your_flashbots_key
```

### 3. `ai-research.mcp.json` - AI Research Configuration

Suitable for:
- AI consciousness research
- Memory systems research
- Cognitive architecture development
- Advanced reasoning experiments

**Includes**:
- Consciousness System
- Memory Core Tools
- Gemini Citadel
- Analytics & Learning

**Required Environment Variables**:
```bash
GEMINI_API_KEY=your_gemini_api_key
```

### 4. `production-full.mcp.json` - Full Production Configuration

Suitable for:
- Production autonomous agents
- Ethical AI systems
- Full-featured deployments
- Complete system integration

**Includes**:
- All MCP servers
- Ethics Engine
- Autonomous Agent (TheWarden)
- Complete monitoring

**Required Environment Variables**:
```bash
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
WALLET_PRIVATE_KEY=your_private_key
GEMINI_API_KEY=your_gemini_api_key
FLASHBOTS_AUTH_KEY=your_flashbots_key
```

## Using These Examples

### Method 1: Copy to Root

```bash
# Choose your configuration
cp examples/mcp/defi-focus.mcp.json .mcp.json

# Configure environment
cp .env.example .env
# Edit .env with your values

# Build and start
npm run build
# MCP servers will be auto-discovered
```

### Method 2: Use Directly

```bash
# Set MCP config path
export MCP_CONFIG_PATH=examples/mcp/ai-research.mcp.json

# Your MCP-compatible client will use this path
```

### Method 3: Customize

```bash
# Copy and modify
cp examples/mcp/production-full.mcp.json my-config.mcp.json

# Edit my-config.mcp.json to add/remove servers
# Use your custom configuration
```

## Configuration Structure

Each MCP configuration follows this structure:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["dist/src/module/index.js"],
      "description": "What this server does",
      "env": {
        "ENV_VAR": "${ENV_VAR}"
      },
      "capabilities": [
        "capability_1",
        "capability_2"
      ]
    }
  },
  "defaults": {
    "timeout": 30000,
    "retries": 3
  }
}
```

## Security Best Practices

1. **Never commit sensitive data**
   - Use environment variables for all secrets
   - Keep `.env` files out of version control
   - Use `${VARIABLE_NAME}` syntax in MCP configs

2. **Use appropriate permissions**
   - Restrict file permissions: `chmod 600 .env`
   - Use separate credentials for development/production
   - Rotate keys regularly

3. **Monitor usage**
   - Enable logging in production
   - Track API usage and costs
   - Set up alerts for unusual activity

## Extending Examples

To create your own configuration:

1. Start with the closest example
2. Add/remove servers as needed
3. Adjust timeouts and retries
4. Configure environment variables
5. Test thoroughly before production use

## Troubleshooting

### Server Not Starting

```bash
# Check that build is complete
npm run build

# Verify server file exists
ls -la dist/mcp/

# Check environment variables
echo $GEMINI_API_KEY
```

### Connection Issues

```bash
# Verify MCP config is valid JSON
cat .mcp.json | jq .

# Check server logs
tail -f logs/*.log

# Test individual components
node dist/src/consciousness.js
```

### Environment Variable Issues

```bash
# Load environment
source .env

# Verify variables are set
printenv | grep -E "RPC_URL|API_KEY"

# Use absolute paths if needed
export ARBITRUM_RPC_URL="https://arb1.arbitrum.io/rpc"
```

## Further Reading

- [MCP Configuration Guide](../../docs/MCP_CONFIGURATION.md)
- [Main README](../../README.md)
- [MCP Specification](https://modelcontextprotocol.io/)

## Contributing

To add new examples:

1. Create a new `.mcp.json` file
2. Document the use case
3. List required environment variables
4. Add usage instructions to this README
5. Test the configuration
6. Submit a pull request
