# GitHub Repository Secrets and Variables Configuration Guide

**Repository:** StableExo/Copilot-Consciousness  
**Purpose:** Environment synchronization for CI/CD and deployment  
**Last Updated:** 2025-11-23  
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Setup Guide](#quick-setup-guide)
3. [Repository Secrets](#repository-secrets)
4. [Repository Variables](#repository-variables)
5. [Environment-Specific Configuration](#environment-specific-configuration)
6. [Security Best Practices](#security-best-practices)
7. [Testing and Validation](#testing-and-validation)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide documents all GitHub Actions secrets and variables that should be configured in the repository settings to enable:

- ✅ **CI/CD Pipeline** - Automated testing, building, and deployment
- ✅ **Environment Synchronization** - Consistent configuration across dev, staging, and production
- ✅ **Secure Credential Management** - Protected storage of sensitive data
- ✅ **Docker Image Publishing** - Container registry authentication
- ✅ **Deployment Automation** - Kubernetes and cloud deployments

### Where to Configure

Navigate to: **Repository Settings → Secrets and variables → Actions**

- **Secrets** - Sensitive data (API keys, passwords, private keys) - encrypted
- **Variables** - Non-sensitive configuration (URLs, feature flags, settings) - plain text

---

## Quick Setup Guide

### Step 1: Access GitHub Repository Settings

1. Go to: `https://github.com/StableExo/Copilot-Consciousness/settings/secrets/actions`
2. Click **"New repository secret"** for secrets
3. Click **"Variables"** tab and **"New repository variable"** for variables

### Step 2: Add Required Secrets

Add secrets in the following priority order:

**Priority 1 - Critical for CI/CD:**
- `GITHUB_TOKEN` (automatically provided by GitHub Actions)
- `NPM_TOKEN` (if publishing to npm)

**Priority 2 - Blockchain & Wallet:**
- `WALLET_PRIVATE_KEY`
- `ETHEREUM_RPC_URL`
- `BASE_RPC_URL`
- `ALCHEMY_API_KEY`

**Priority 3 - Infrastructure:**
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `RABBITMQ_PASSWORD`

**Priority 4 - Security:**
- `JWT_SECRET`
- `SECRETS_ENCRYPTION_KEY`
- `AUDIT_ENCRYPTION_KEY`

### Step 3: Add Configuration Variables

Add these variables for environment configuration:

- `NODE_ENV`
- `CHAIN_ID`
- `MIN_PROFIT_THRESHOLD`
- `MAX_GAS_PRICE`

### Step 4: Validate Configuration

Run the validation workflow to ensure all secrets and variables are properly configured.

---

## Repository Secrets

### 🔐 Category 1: Blockchain RPC Endpoints

These secrets provide access to blockchain networks via RPC providers (Alchemy, Infura, etc.).

#### Primary Networks

| Secret Name | Description | Example Format | Priority | Required |
|------------|-------------|----------------|----------|----------|
| `ETHEREUM_RPC_URL` | Ethereum mainnet RPC endpoint | `https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY` | HIGH | Yes |
| `BASE_RPC_URL` | Base network RPC endpoint (primary) | `https://base-mainnet.g.alchemy.com/v2/YOUR-API-KEY` | **CRITICAL** | **Yes** |
| `ARBITRUM_RPC_URL` | Arbitrum mainnet RPC endpoint | `https://arb-mainnet.g.alchemy.com/v2/YOUR-API-KEY` | MEDIUM | Optional |
| `OPTIMISM_RPC_URL` | Optimism mainnet RPC endpoint | `https://opt-mainnet.g.alchemy.com/v2/YOUR-API-KEY` | MEDIUM | Optional |
| `POLYGON_RPC_URL` | Polygon mainnet RPC endpoint | `https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY` | MEDIUM | Optional |

#### Backup RPC Endpoints

| Secret Name | Description | Example Format | Priority |
|------------|-------------|----------------|----------|
| `ETHEREUM_RPC_URL_BACKUP` | Ethereum backup RPC | `https://eth-mainnet.public.blastapi.io` | LOW |
| `BASE_RPC_URL_BACKUP` | Base backup RPC | `https://mainnet.base.org` | LOW |

#### WebSocket Endpoints

| Secret Name | Description | Example Format | Priority |
|------------|-------------|----------------|----------|
| `ALCHEMY_WS_URL` | Alchemy WebSocket URL | `wss://eth-mainnet.alchemyapi.io/v2/YOUR-API-KEY` | MEDIUM |
| `INFURA_WS_URL` | Infura WebSocket URL | `wss://mainnet.infura.io/ws/v3/YOUR-PROJECT-ID` | LOW |

#### Enhanced API Access

| Secret Name | Description | Example Format | Priority |
|------------|-------------|----------------|----------|
| `ALCHEMY_API_KEY` | Alchemy Enhanced APIs key | `YOUR-API-KEY` | HIGH |

**How to Get:**
- Alchemy: https://www.alchemy.com/
- Infura: https://infura.io/

---

### 💰 Category 2: Wallet and Private Keys

⚠️ **CRITICAL SECURITY WARNING**: These are the most sensitive secrets. Compromise = loss of funds.

| Secret Name | Description | Format | Priority | Required |
|------------|-------------|--------|----------|----------|
| `WALLET_PRIVATE_KEY` | Private key for transaction signing | `0x` + 64 hex chars | **CRITICAL** | **Yes** |
| `FLASHSWAP_V2_OWNER` | Owner address for FlashSwap contract | `0x` + 40 hex chars | HIGH | Yes |
| `MULTI_SIG_ADDRESS` | Multi-signature wallet address | `0x` + 40 hex chars | MEDIUM | Optional |

**Security Requirements:**
- ✅ Use a dedicated wallet for bot operations only
- ✅ Never share or commit private keys to version control
- ✅ Rotate keys regularly
- ✅ Use multi-sig for large fund management
- ✅ Keep only necessary funds in hot wallet

---

### 🔍 Category 3: Blockchain Explorers

API keys for contract verification and transaction monitoring.

| Secret Name | Description | Where to Get | Priority |
|------------|-------------|--------------|----------|
| `ETHERSCAN_API_KEY` | Etherscan API key | https://etherscan.io/myapikey | MEDIUM |
| `BASESCAN_API_KEY` | Basescan API key | https://basescan.org/myapikey | HIGH |
| `ARBISCAN_API_KEY` | Arbiscan API key | https://arbiscan.io/myapikey | LOW |
| `OPTIMISTIC_ETHERSCAN_API_KEY` | Optimism Etherscan API key | https://optimistic.etherscan.io/myapikey | LOW |
| `POLYGONSCAN_API_KEY` | Polygonscan API key | https://polygonscan.com/myapikey | LOW |

---

### 🗄️ Category 4: Database and Infrastructure

Credentials for backend infrastructure services.

#### PostgreSQL / TimescaleDB

| Secret Name | Description | Example | Priority | Required |
|------------|-------------|---------|----------|----------|
| `POSTGRES_PASSWORD` | PostgreSQL/TimescaleDB password | Strong random password | HIGH | For distributed mode |
| `POSTGRES_USER` | PostgreSQL username | `arbitrage` | MEDIUM | For distributed mode |
| `DATABASE_URL` | Full database connection string | `postgresql://user:pass@host:5432/db` | HIGH | For distributed mode |
| `TIMESCALEDB_PASSWORD` | TimescaleDB password | Strong random password | HIGH | Alternative |

**Generate Password:**
```bash
openssl rand -base64 32
```

#### Redis

| Secret Name | Description | Example | Priority |
|------------|-------------|---------|----------|
| `REDIS_PASSWORD` | Redis authentication password | Strong random password | HIGH |
| `REDIS_URL` | Full Redis connection URL | `redis://:password@localhost:6379` | MEDIUM |

#### RabbitMQ

| Secret Name | Description | Example | Priority |
|------------|-------------|---------|----------|
| `RABBITMQ_PASSWORD` | RabbitMQ password | Strong random password | HIGH |
| `RABBITMQ_USERNAME` | RabbitMQ username | `arbitrage` | MEDIUM |
| `RABBITMQ_URL` | Full RabbitMQ connection URL | `amqp://user:pass@localhost:5672` | MEDIUM |

---

### 🔒 Category 5: Security and Encryption

Cryptographic keys for application security.

| Secret Name | Description | Generation Command | Priority | Required |
|------------|-------------|-------------------|----------|----------|
| `JWT_SECRET` | JWT token signing secret | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | **CRITICAL** | **Yes** |
| `SECRETS_ENCRYPTION_KEY` | Application secrets encryption (32 bytes) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | **CRITICAL** | **Yes** |
| `AUDIT_ENCRYPTION_KEY` | Audit log encryption (32 bytes) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | HIGH | **Yes** |

**Key Requirements:**
- ✅ JWT_SECRET: Minimum 128 hex characters (64 bytes)
- ✅ SECRETS_ENCRYPTION_KEY: Exactly 64 hex characters (32 bytes)
- ✅ AUDIT_ENCRYPTION_KEY: Exactly 64 hex characters (32 bytes)
- ✅ Use cryptographically secure random generation
- ✅ Never reuse keys across environments
- ✅ Rotate keys periodically

---

### 🤖 Category 6: AI and Machine Learning

API keys for AI providers and consciousness system.

#### Google Gemini

| Secret Name | Description | Where to Get | Priority |
|------------|-------------|--------------|----------|
| `GEMINI_API_KEY` | Google Gemini AI API key | https://makersuite.google.com/app/apikey | HIGH |

#### OpenAI

| Secret Name | Description | Where to Get | Priority |
|------------|-------------|--------------|----------|
| `OPENAI_API_KEY` | OpenAI GPT-4/GPT-3.5 API key | https://platform.openai.com/api-keys | MEDIUM |
| `OPENAI_ORGANIZATION` | OpenAI organization ID | https://platform.openai.com/account/org-settings | LOW |

#### GitHub Copilot

| Secret Name | Description | Where to Get | Priority |
|------------|-------------|--------------|----------|
| `GITHUB_COPILOT_API_KEY` | GitHub Copilot API access | https://github.com/settings/copilot | LOW |

---

### 📊 Category 7: Monitoring and Alerts

Credentials for monitoring, logging, and alerting services.

#### Monitoring Stack

| Secret Name | Description | Example | Priority |
|------------|-------------|---------|----------|
| `GRAFANA_PASSWORD` | Grafana admin password | Strong password (NOT "admin") | MEDIUM |

#### Alert Channels

| Secret Name | Description | Where to Get | Priority |
|------------|-------------|--------------|----------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | https://t.me/BotFather | LOW |
| `TELEGRAM_CHAT_ID` | Telegram chat ID | Ask @userinfobot | LOW |
| `DISCORD_WEBHOOK_URL` | Discord webhook for alerts | Discord Server Settings → Integrations | LOW |

#### Error Tracking (Optional)

| Secret Name | Description | Where to Get | Priority |
|------------|-------------|--------------|----------|
| `SENTRY_DSN` | Sentry error tracking DSN | https://sentry.io/settings/ | LOW |

---

### 🔄 Category 8: MEV and Private RPCs

Flashbots and private transaction submission.

| Secret Name | Description | Example | Priority |
|------------|-------------|---------|----------|
| `FLASHBOTS_AUTH_KEY` | Flashbots Protect authentication | Your auth key | MEDIUM |
| `MEV_SHARE_AUTH_KEY` | MEV-Share authentication | Your auth key | MEDIUM |
| `BUILDER_RPC_AUTH_KEY_1` | Builder-specific RPC auth | Builder-provided key | LOW |

**More Info:**
- Flashbots Protect: https://docs.flashbots.net/flashbots-protect/overview
- MEV-Share: https://docs.flashbots.net/flashbots-mev-share/overview

---

### 🌐 Category 9: Deployment and Infrastructure

Cloud provider and deployment credentials.

#### Docker Registry

| Secret Name | Description | Where to Get | Priority |
|------------|-------------|--------------|----------|
| `DOCKER_USERNAME` | Docker Hub username | https://hub.docker.com/ | MEDIUM |
| `DOCKER_PASSWORD` | Docker Hub password or token | https://hub.docker.com/settings/security | MEDIUM |

**Note:** GitHub Container Registry uses `GITHUB_TOKEN` automatically.

#### Kubernetes (if using external cluster)

| Secret Name | Description | Example | Priority |
|------------|-------------|---------|----------|
| `KUBECONFIG` | Kubernetes cluster configuration | Base64 encoded kubeconfig | HIGH |
| `K8S_CLUSTER_ENDPOINT` | Kubernetes API endpoint | `https://your-cluster.example.com` | MEDIUM |

#### Cloud Providers (Optional)

| Secret Name | Description | Where to Get | Priority |
|------------|-------------|--------------|----------|
| `AWS_ACCESS_KEY_ID` | AWS access key | AWS IAM Console | MEDIUM |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | AWS IAM Console | MEDIUM |
| `GCP_SERVICE_ACCOUNT_KEY` | GCP service account JSON | GCP Console | MEDIUM |

---

## Repository Variables

Variables are non-sensitive configuration values that can be different across environments.

### 🌍 Category 1: Environment Configuration

| Variable Name | Description | Default | Options |
|--------------|-------------|---------|---------|
| `NODE_ENV` | Node.js environment | `production` | `development`, `staging`, `production`, `test` |
| `CHAIN_ID` | Primary blockchain network | `8453` | `1` (Ethereum), `8453` (Base), `42161` (Arbitrum) |
| `DRY_RUN` | Simulation mode (no real txs) | `true` | `true`, `false` |

### ⚡ Category 2: Performance Settings

| Variable Name | Description | Default | Notes |
|--------------|-------------|---------|-------|
| `MIN_PROFIT_THRESHOLD` | Minimum profit percentage | `0.01` | `0.01` = 1% |
| `MAX_GAS_PRICE` | Maximum gas price in gwei | `100` | Adjust for network conditions |
| `MAX_SLIPPAGE` | Maximum slippage tolerance | `0.005` | `0.005` = 0.5% |
| `SCAN_INTERVAL` | Time between scans (ms) | `1000` | Balance speed vs resources |
| `CONCURRENCY` | Number of concurrent workers | `10` | Tune for infrastructure |

### 🎯 Category 3: Feature Flags

| Variable Name | Description | Default | Options |
|--------------|-------------|---------|---------|
| `ENABLE_ML_PREDICTIONS` | Enable ML-based predictions | `true` | `true`, `false` |
| `ENABLE_CROSS_CHAIN` | Enable cross-chain arbitrage | `false` | `true`, `false` |
| `ENABLE_LAYER2` | Enable Layer 2 networks | `true` | `true`, `false` |
| `PHASE3_AI_ENABLED` | Enable Phase 3 AI features | `true` | `true`, `false` |
| `PHASE3_SECURITY_ENABLED` | Enable enhanced security | `true` | `true`, `false` |

### 🏪 Category 4: DEX Configuration

| Variable Name | Description | Default | Options |
|--------------|-------------|---------|---------|
| `ENABLE_UNISWAP_V2` | Enable Uniswap V2 | `true` | `true`, `false` |
| `ENABLE_UNISWAP_V3` | Enable Uniswap V3 | `true` | `true`, `false` |
| `ENABLE_SUSHISWAP` | Enable SushiSwap | `true` | `true`, `false` |
| `ENABLE_CURVE` | Enable Curve | `true` | `true`, `false` |
| `ENABLE_BALANCER` | Enable Balancer | `true` | `true`, `false` |

### 📝 Category 5: Logging and Monitoring

| Variable Name | Description | Default | Options |
|--------------|-------------|---------|---------|
| `LOG_LEVEL` | Logging verbosity | `info` | `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | Log output format | `json` | `json`, `pretty` |
| `ENABLE_LOGGING` | Master logging switch | `true` | `true`, `false` |

### 🔒 Category 6: Security Settings

| Variable Name | Description | Default | Notes |
|--------------|-------------|---------|-------|
| `CORS_ORIGIN` | Allowed CORS origins | `https://yourdomain.com` | Comma-separated list or `*` for dev only |
| `REQUIRE_2FA` | Enforce 2FA | `false` | `true`, `false` |
| `SESSION_TIMEOUT` | Session timeout (ms) | `3600000` | 1 hour = 3600000 |

### 📊 Category 7: Dashboard and API

| Variable Name | Description | Default | Notes |
|--------------|-------------|---------|-------|
| `DASHBOARD_PORT` | Dashboard web server port | `3000` | Must not conflict with other services |
| `HEALTH_CHECK_PORT` | Health check endpoint port | `8080` | For load balancer health checks |
| `API_RATE_LIMIT` | API requests per minute | `1000` | Adjust based on usage |

---

## Environment-Specific Configuration

For different deployment environments, you can use GitHub Environments to scope secrets and variables.

### Creating Environments

1. Go to: **Repository Settings → Environments**
2. Create environments: `development`, `staging`, `production`
3. Add environment-specific secrets and variables

### Development Environment

**Variables:**
```yaml
NODE_ENV=development
DRY_RUN=true
LOG_LEVEL=debug
ENABLE_LOGGING=true
CORS_ORIGIN=*
```

### Staging Environment

**Variables:**
```yaml
NODE_ENV=staging
DRY_RUN=true
LOG_LEVEL=info
ENABLE_LOGGING=true
```

### Production Environment

**Variables:**
```yaml
NODE_ENV=production
DRY_RUN=false
LOG_LEVEL=info
ENABLE_LOGGING=true
CORS_ORIGIN=https://dashboard.yourdomain.com
```

**Secrets:**
- All secrets from the main repository
- Production-specific secrets (if different)

### Using in Workflows

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Uses production environment secrets/variables
    steps:
      - name: Use secrets
        run: echo "Deploying with wallet ${{ secrets.WALLET_PRIVATE_KEY }}"
```

---

## Security Best Practices

### ✅ DO's

1. **Use Strong Secrets**
   - Generate cryptographically secure random values
   - Minimum 32 characters for passwords
   - Use the generation commands provided above

2. **Rotate Regularly**
   - Rotate API keys every 90 days
   - Rotate passwords every 180 days
   - Update encryption keys annually

3. **Principle of Least Privilege**
   - Create service accounts with minimal permissions
   - Use read-only keys where possible
   - Separate dev/staging/prod credentials

4. **Monitor Access**
   - Enable audit logging for secret access
   - Monitor for unusual API usage patterns
   - Set up alerts for failed authentication attempts

5. **Backup Securely**
   - Store backup copies of secrets in encrypted password manager
   - Document secret locations and purposes
   - Have recovery plan for lost secrets

6. **Use Environment Protection Rules**
   - Require approvals for production deployments
   - Limit who can access production secrets
   - Enable branch protection rules

### ❌ DON'Ts

1. **Never Commit Secrets to Git**
   - No secrets in `.env`, code files, or config files
   - Use `.gitignore` to exclude sensitive files
   - Use git-secrets or similar tools to prevent accidental commits

2. **Don't Share Secrets**
   - Never send secrets via email, Slack, or messaging
   - Don't share GitHub Actions secrets between repositories unnecessarily
   - Don't log secrets in application logs

3. **Don't Use Weak Secrets**
   - No default passwords (`admin`, `password`, `123456`)
   - No predictable patterns
   - No reusing secrets across services

4. **Don't Hardcode**
   - Never hardcode secrets in workflows
   - Always use GitHub Actions secrets syntax: `${{ secrets.NAME }}`
   - Don't use variables for sensitive data

---

## Testing and Validation

### Validate Secrets Configuration

Create a workflow to validate that all required secrets are configured:

```yaml
name: Validate Secrets
on: [workflow_dispatch]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Check required secrets
        run: |
          errors=0
          
          # Check critical secrets
          if [ -z "${{ secrets.WALLET_PRIVATE_KEY }}" ]; then
            echo "❌ WALLET_PRIVATE_KEY is not set"
            errors=$((errors+1))
          fi
          
          if [ -z "${{ secrets.BASE_RPC_URL }}" ]; then
            echo "❌ BASE_RPC_URL is not set"
            errors=$((errors+1))
          fi
          
          if [ -z "${{ secrets.JWT_SECRET }}" ]; then
            echo "❌ JWT_SECRET is not set"
            errors=$((errors+1))
          fi
          
          if [ $errors -gt 0 ]; then
            echo "❌ $errors critical secrets are missing"
            exit 1
          fi
          
          echo "✅ All critical secrets are configured"
```

### Test RPC Connectivity

```yaml
name: Test RPC Endpoints
on: [workflow_dispatch]

jobs:
  test-rpc:
    runs-on: ubuntu-latest
    steps:
      - name: Test Ethereum RPC
        run: |
          response=$(curl -s -X POST ${{ secrets.ETHEREUM_RPC_URL }} \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}')
          
          if [ -z "$response" ]; then
            echo "❌ Ethereum RPC is not responding"
            exit 1
          fi
          
          echo "✅ Ethereum RPC is working"
```

### Validate Environment Variables

Add to your `package.json`:

```bash
npm run validate-env
```

This runs the existing validation script: `scripts/validate-env.ts`

---

## Troubleshooting

### Secret Not Available in Workflow

**Problem:** Workflow fails with "secret not found" error

**Solutions:**
1. Verify secret name matches exactly (case-sensitive)
2. Check if using environment-specific secrets - ensure environment is specified in job
3. Confirm secret is added to repository (not organization)
4. Wait a few minutes after adding secret (caching delay)

### RPC Connection Failures

**Problem:** Cannot connect to blockchain RPC endpoint

**Solutions:**
1. Verify API key is valid and not expired
2. Check rate limits on your RPC provider account
3. Test endpoint manually with `curl`
4. Ensure backup RPC URLs are configured
5. Check provider status page for outages

### Database Connection Errors

**Problem:** Cannot connect to PostgreSQL/Redis/RabbitMQ

**Solutions:**
1. Verify passwords are correct (no leading/trailing spaces)
2. Check connection string format
3. Ensure services are running and accessible
4. Verify network firewall rules
5. Test connection from same network as GitHub Actions runner

### JWT Token Issues

**Problem:** JWT authentication failures

**Solutions:**
1. Verify JWT_SECRET is at least 128 hex characters
2. Ensure same secret is used across all services
3. Check token expiration settings
4. Verify token signing algorithm

### Encryption Key Errors

**Problem:** Cannot decrypt data with SECRETS_ENCRYPTION_KEY

**Solutions:**
1. Verify key is exactly 64 hex characters (32 bytes)
2. Ensure key hasn't been changed (would invalidate existing encrypted data)
3. Check key encoding (should be hex, not base64)
4. Regenerate encrypted data if key was rotated

---

## Additional Resources

### Documentation
- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Environment Protection Rules](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [ENV_PRODUCTION_READINESS_REVIEW.md](./ENV_PRODUCTION_READINESS_REVIEW.md)
- [MEV_SETUP_GUIDE.md](./MEV_SETUP_GUIDE.md)

### Related Files
- `.env.example` - Template for local development environment variables
- `k8s/base/secret.yaml` - Kubernetes secrets template
- `scripts/validate-env.ts` - Environment validation script
- `.github/workflows/deploy.yml` - Deployment workflow

### Support
For issues or questions about secrets configuration:
1. Review this documentation
2. Check the troubleshooting section
3. Run validation scripts
4. Open an issue in the repository

---

## Checklist for Initial Setup

Use this checklist when setting up a new environment:

### Phase 1: Critical Secrets (Required for Basic Operation)
- [ ] `WALLET_PRIVATE_KEY` - Bot wallet private key
- [ ] `BASE_RPC_URL` - Primary network RPC endpoint
- [ ] `ALCHEMY_API_KEY` - Alchemy enhanced APIs
- [ ] `JWT_SECRET` - Authentication secret (128+ chars)
- [ ] `SECRETS_ENCRYPTION_KEY` - Encryption key (64 hex chars)
- [ ] `AUDIT_ENCRYPTION_KEY` - Audit encryption key (64 hex chars)

### Phase 2: Infrastructure Secrets (Required for Distributed Mode)
- [ ] `POSTGRES_PASSWORD` - Database password
- [ ] `REDIS_PASSWORD` - Cache password
- [ ] `RABBITMQ_PASSWORD` - Message queue password
- [ ] `DATABASE_URL` - Full database connection string

### Phase 3: Additional Networks (Optional)
- [ ] `ETHEREUM_RPC_URL` - Ethereum mainnet
- [ ] `ARBITRUM_RPC_URL` - Arbitrum network
- [ ] `OPTIMISM_RPC_URL` - Optimism network
- [ ] `POLYGON_RPC_URL` - Polygon network

### Phase 4: Monitoring and Alerts (Optional)
- [ ] `TELEGRAM_BOT_TOKEN` - Telegram notifications
- [ ] `TELEGRAM_CHAT_ID` - Telegram chat ID
- [ ] `DISCORD_WEBHOOK_URL` - Discord alerts
- [ ] `GRAFANA_PASSWORD` - Monitoring dashboard

### Phase 5: AI and Advanced Features (Optional)
- [ ] `GEMINI_API_KEY` - Google Gemini AI
- [ ] `OPENAI_API_KEY` - OpenAI GPT
- [ ] `FLASHBOTS_AUTH_KEY` - Flashbots private RPCs

### Phase 6: Configuration Variables
- [ ] `NODE_ENV` - Set to appropriate environment
- [ ] `CHAIN_ID` - Primary network chain ID
- [ ] `MIN_PROFIT_THRESHOLD` - Minimum profit for execution
- [ ] `MAX_GAS_PRICE` - Maximum acceptable gas price
- [ ] `DRY_RUN` - Enable simulation mode initially
- [ ] `LOG_LEVEL` - Logging verbosity

### Phase 7: Validation
- [ ] Run `npm run validate-env`
- [ ] Test RPC connectivity
- [ ] Verify database connections
- [ ] Check monitoring endpoints
- [ ] Review security settings

---

## Summary

This document provides a comprehensive guide for configuring GitHub Actions secrets and variables for the Copilot-Consciousness repository. 

**Key Takeaways:**

1. **Secrets** - 50+ possible secrets organized into 9 categories
2. **Variables** - 30+ configuration variables for environment settings
3. **Security** - Best practices and generation commands for secure values
4. **Validation** - Testing and troubleshooting procedures
5. **Environments** - Development, staging, and production configurations

**Next Steps:**

1. Review this document thoroughly
2. Add critical secrets first (Phase 1 in checklist)
3. Validate configuration after each phase
4. Test in development environment before production
5. Monitor and rotate secrets regularly

---

*Last Updated: 2025-11-23 | Version: 1.0.0*
