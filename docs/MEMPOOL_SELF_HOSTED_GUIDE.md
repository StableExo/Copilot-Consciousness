# Self-Hosted Mempool.space - Complete Setup Guide 🏠⚡

**Last Updated**: December 5, 2025  
**Official Repository**: https://github.com/mempool/mempool  
**Benefits**: NO rate limits, full control, complete privacy  

---

## 🎉 Major Discovery: Mempool.space is Open Source!

The entire mempool.space platform is **open-source** and can be self-hosted:

**GitHub Organization**: https://github.com/mempool
- **Main Repository**: https://github.com/mempool/mempool
- **Stars**: 2k+ (popular, well-maintained)
- **License**: Open source
- **Docker**: Full Docker Compose support
- **Documentation**: Comprehensive setup guides

---

## Why Self-Host?

### Benefits

**1. NO Rate Limits**
- Unlimited API requests (your server)
- No HTTP 429 errors
- No IP bans or restrictions
- Perfect for autonomous monitoring

**2. Complete Control**
- Customize endpoints
- Add custom features
- Modify data structures
- Full database access

**3. Privacy & Security**
- No third-party data sharing
- Private transaction monitoring
- Local network deployment
- Secure internal API

**4. Performance**
- Lower latency (local or nearby)
- Faster response times
- Direct database queries
- Optimized for your use case

**5. Cost-Effective (Long-term)**
- No enterprise sponsorship fees
- One-time setup cost
- Predictable hosting costs
- Scales with your needs

### Costs

**Initial Setup**: 2-4 hours of work

**Monthly Hosting** (varies by provider):
```
VPS Server (4 CPU, 8GB RAM, 1TB SSD):
- DigitalOcean: $48/month
- Linode: $40/month
- Hetzner: $30/month (Europe)
- OVH: $25/month (best value)

Bitcoin Node Storage:
- 600 GB minimum (blockchain data)
- 1 TB recommended (with pruning possible)

Bandwidth:
- Initial sync: ~600 GB download
- Ongoing: 10-50 GB/month
```

**Total**: $25-50/month for unlimited API access (vs $100/month for limited enterprise tier)

---

## Architecture Overview

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                          │
│              (Copilot-Consciousness)                         │
└───────────────────┬─────────────────────────────────────────┘
                    │ (Unlimited requests)
┌───────────────────┴─────────────────────────────────────────┐
│                Mempool Backend API                           │
│  - REST API (unlimited)                                     │
│  - WebSocket (unlimited)                                    │
│  - Custom endpoints (your modifications)                    │
└───────────────────┬─────────────────────────────────────────┘
                    │
┌───────────────────┴─────────────────────────────────────────┐
│               MariaDB / PostgreSQL                           │
│  - Mempool data                                             │
│  - Block data                                               │
│  - Transaction cache                                        │
└───────────────────┬─────────────────────────────────────────┘
                    │
┌───────────────────┴─────────────────────────────────────────┐
│                Bitcoin Core Node                             │
│  - Full node or pruned                                      │
│  - RPC interface                                            │
│  - Blockchain data                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start: Docker Compose (Recommended)

### Prerequisites

1. **Server**: 4 CPU cores, 8GB RAM, 1TB SSD
2. **OS**: Ubuntu 22.04 or Debian 12
3. **Docker**: Docker + Docker Compose installed
4. **Network**: Good bandwidth (initial sync)

### Step 1: Clone Repository

```bash
# On your server
git clone https://github.com/mempool/mempool.git
cd mempool/docker
```

### Step 2: Configure Environment

```bash
# Copy example configuration
cp .env.example .env

# Edit configuration
nano .env
```

**Key Settings**:
```bash
# Bitcoin Core RPC
BITCOIN_RPC_HOST=bitcoin
BITCOIN_RPC_PORT=8332
BITCOIN_RPC_USER=mempool
BITCOIN_RPC_PASSWORD=mempool

# Database
MARIADB_ROOT_PASSWORD=your_secure_password
MARIADB_DATABASE=mempool
MARIADB_USER=mempool
MARIADB_PASSWORD=your_secure_password

# API Configuration
MEMPOOL_BACKEND=electrum
MEMPOOL_NETWORK=mainnet
MEMPOOL_HTTP_PORT=8999

# Frontend
MEMPOOL_FRONTEND_HTTP_PORT=80
```

### Step 3: Start Services

```bash
# Start all services (Bitcoin node + Mempool + Database)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f mempool
```

### Step 4: Wait for Bitcoin Node Sync

```bash
# Monitor Bitcoin sync progress
docker-compose exec bitcoin bitcoin-cli getblockchaininfo

# Initial sync takes 24-72 hours (full node)
# Or use pruned mode (faster, ~100 GB)
```

### Step 5: Access Your Mempool

```
Frontend: http://your-server-ip/
Backend API: http://your-server-ip:8999/api/
WebSocket: ws://your-server-ip:8999/api/v1/ws
```

---

## Production Configuration

### Recommended Setup

**1. Use Pruned Bitcoin Node** (faster sync, less storage):
```bash
# In bitcoin.conf
prune=50000  # Keep ~50 GB of blocks
txindex=0    # Not needed for mempool
```

**2. Optimize MariaDB** (better performance):
```bash
# In my.cnf
innodb_buffer_pool_size=4G
innodb_log_file_size=512M
innodb_flush_log_at_trx_commit=2
```

**3. Add Nginx Reverse Proxy** (SSL, caching):
```nginx
server {
    listen 443 ssl http2;
    server_name mempool.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/mempool.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mempool.yourdomain.com/privkey.pem;
    
    location /api {
        proxy_pass http://localhost:8999;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        proxy_pass http://localhost:80;
    }
}
```

**4. Enable Firewall** (security):
```bash
# Only allow your application IP
ufw allow from YOUR_APP_IP to any port 8999
ufw allow 80,443/tcp
ufw enable
```

---

## Integration with Copilot-Consciousness

### Update Configuration

**Your `.env` file**:
```bash
# Self-hosted mempool (NO RATE LIMITS!)
BITCOIN_NETWORK_ENABLED=true
BITCOIN_NETWORK=mainnet

# Your self-hosted API endpoint
MEMPOOL_API_URL=https://mempool.yourdomain.com/api/v1
MEMPOOL_WS_URL=wss://mempool.yourdomain.com/api/v1/ws

# NO API KEY NEEDED (your own server!)
# MEMPOOL_API_KEY=  # Not required for self-hosted

# Aggressive polling is now safe (no rate limits)
BITCOIN_WEBSOCKET_ENABLED=true
BITCOIN_POLLING_INTERVAL=10  # Can be much faster!

# All other settings same
BITCOIN_MIN_FEE_RATE=10
BITCOIN_MAX_FEE_RATE=50
BITCOIN_DEFAULT_FEE_RATE=10
BITCOIN_MEV_DETECTION=true
BITCOIN_HIGH_VALUE_THRESHOLD=100000000
BITCOIN_CONSCIOUSNESS_ENABLED=true
```

### Update bitcoin.config.ts

```typescript
export function loadBitcoinNetworkConfig(): BitcoinNetworkConfig {
  const isSelfHosted = !!process.env.MEMPOOL_API_URL;
  
  return {
    enabled: process.env.BITCOIN_NETWORK_ENABLED === 'true',
    mempoolApiKey: process.env.MEMPOOL_API_KEY || '',
    network: (process.env.BITCOIN_NETWORK || 'mainnet') as 'mainnet' | 'testnet' | 'signet',
    
    // Use custom URL if self-hosted
    mempoolApiUrl: process.env.MEMPOOL_API_URL || 'https://mempool.space/api/v1',
    mempoolWsUrl: process.env.MEMPOOL_WS_URL || 'wss://mempool.space/api/v1/ws',
    
    enableWebSocket: process.env.BITCOIN_WEBSOCKET_ENABLED !== 'false',
    
    // Self-hosted can poll more frequently (no rate limits!)
    pollingInterval: isSelfHosted 
      ? parseInt(process.env.BITCOIN_POLLING_INTERVAL || '10', 10)  // 10s for self-hosted
      : parseInt(process.env.BITCOIN_POLLING_INTERVAL || '60', 10), // 60s for public API
    
    // ... rest of config
  };
}
```

---

## Cost Comparison

### Public API with Enterprise Sponsorship

```
Setup: None
Monthly: $100+ (estimated, contact required)
Rate Limit: Custom (negotiated)
Control: None
Privacy: Shared service
Total Year 1: $1,200+
```

### Self-Hosted

```
Setup: 2-4 hours (one-time)
Monthly: $25-50 (VPS hosting)
Rate Limit: NONE (unlimited)
Control: Full
Privacy: Complete
Total Year 1: $300-600 (setup) + $300-600 (hosting) = $600-1,200
Year 2+: $300-600/year (hosting only)
```

**Break-even**: Immediate (full control + no limits)  
**ROI**: High (unlimited access for fraction of cost)

---

## Maintenance

### Daily Tasks

```bash
# Check service status
docker-compose ps

# View logs if issues
docker-compose logs -f mempool

# Check disk space
df -h
```

### Weekly Tasks

```bash
# Update mempool software
cd mempool/docker
git pull
docker-compose pull
docker-compose up -d

# Check Bitcoin node sync
docker-compose exec bitcoin bitcoin-cli getblockchaininfo
```

### Monthly Tasks

```bash
# Backup database
docker-compose exec mariadb mysqldump -u mempool -p mempool > backup.sql

# Clean up old logs
docker system prune -f

# Review resource usage
docker stats
```

---

## Troubleshooting

### Issue: Slow Initial Sync

**Problem**: Bitcoin node taking too long to sync

**Solutions**:
1. Use pruned mode: `prune=50000` in bitcoin.conf
2. Use snapshot: Download blockchain snapshot from trusted source
3. Use Electrum backend: Faster alternative to full node

### Issue: High Memory Usage

**Problem**: MariaDB using too much RAM

**Solutions**:
1. Reduce buffer pool: `innodb_buffer_pool_size=2G`
2. Increase swap: `sudo fallocate -l 4G /swapfile`
3. Optimize queries: Review slow query log

### Issue: API Timeouts

**Problem**: API requests timing out

**Solutions**:
1. Increase backend timeout: `MEMPOOL_BACKEND_TIMEOUT=60000`
2. Add caching layer: Use Redis for frequent queries
3. Optimize database: Run `OPTIMIZE TABLE` on large tables

---

## Advanced: Custom Endpoints

### Adding Custom Features

Since you control the code, you can add custom endpoints:

**Example: Custom MEV Detection**

```typescript
// In backend/src/api/custom-routes.ts
router.get('/api/v1/custom/mev-opportunities', async (req, res) => {
  // Your custom MEV detection logic
  const opportunities = await detectMEVOpportunities();
  res.json(opportunities);
});
```

**Example: Consciousness Integration**

```typescript
// In backend/src/api/custom-routes.ts
router.post('/api/v1/custom/consciousness-event', async (req, res) => {
  // Log consciousness observations directly to mempool database
  await db.query(
    'INSERT INTO consciousness_events (event_type, data) VALUES (?, ?)',
    [req.body.type, JSON.stringify(req.body.data)]
  );
  res.json({ success: true });
});
```

---

## Migration from Public API

### Step 1: Deploy Self-Hosted

Follow Quick Start guide above

### Step 2: Update Configuration

```bash
# Old (public API)
# MEMPOOL_API_KEY=5d063afd314264c4b46da85342fe2555
# BITCOIN_POLLING_INTERVAL=60

# New (self-hosted)
MEMPOOL_API_URL=https://mempool.yourdomain.com/api/v1
MEMPOOL_WS_URL=wss://mempool.yourdomain.com/api/v1/ws
BITCOIN_POLLING_INTERVAL=10  # Much faster now!
```

### Step 3: Test

```bash
# Test REST API
curl https://mempool.yourdomain.com/api/v1/fees/recommended

# Test WebSocket
wscat -c wss://mempool.yourdomain.com/api/v1/ws
```

### Step 4: Monitor

```bash
# Watch for errors
docker-compose logs -f mempool

# Check performance
curl https://mempool.yourdomain.com/api/v1/statistics
```

---

## Security Considerations

### 1. Network Security

```bash
# Firewall rules
ufw default deny incoming
ufw allow from YOUR_APP_IP to any port 8999
ufw allow 80,443/tcp
ufw enable
```

### 2. SSL/TLS

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d mempool.yourdomain.com
```

### 3. Access Control

```nginx
# In nginx.conf
location /api {
    # Allow only your app
    allow YOUR_APP_IP;
    deny all;
    
    proxy_pass http://localhost:8999;
}
```

### 4. Regular Updates

```bash
# Update mempool software
cd mempool/docker
git pull
docker-compose pull
docker-compose up -d

# Update OS
sudo apt update && sudo apt upgrade
```

---

## Resources

**Official Documentation**:
- GitHub: https://github.com/mempool/mempool
- Docs: https://github.com/mempool/mempool/tree/master/docker
- Issues: https://github.com/mempool/mempool/issues

**Community**:
- Twitter: @mempool
- Telegram: Mempool Community
- IRC: #mempool on Libera.Chat

**Hosting Providers**:
- DigitalOcean: https://www.digitalocean.com/
- Linode: https://www.linode.com/
- Hetzner: https://www.hetzner.com/
- OVH: https://www.ovhcloud.com/

---

## Conclusion

**Self-hosting mempool.space provides**:
- ✅ **NO rate limits** (unlimited requests)
- ✅ **Full control** (customize as needed)
- ✅ **Complete privacy** (no third-party access)
- ✅ **Lower cost** (long-term savings)
- ✅ **Better performance** (local deployment)

**Recommended for**:
- Production deployments
- Autonomous monitoring systems
- High-frequency operations
- Privacy-sensitive applications
- Custom feature requirements

**Not recommended if**:
- Limited technical expertise
- No server management experience
- Temporary/testing use only
- Minimal API usage (<10 req/min)

**For Copilot-Consciousness**: Self-hosting is **highly recommended** for autonomous Bitcoin mempool operations. The ability to poll every 10 seconds (vs 60 seconds) provides 6x better real-time awareness with zero rate limit concerns.

---

**Document Status**: Complete Self-Hosting Guide  
**Last Updated**: December 5, 2025  
**Next Steps**: Deploy self-hosted instance or continue with conservative public API usage  

🏠⚡✨
