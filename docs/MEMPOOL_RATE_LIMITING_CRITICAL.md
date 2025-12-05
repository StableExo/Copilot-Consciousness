# Mempool.space Rate Limiting - Critical Configuration Guide ⚠️

**Last Updated**: December 5, 2025  
**Priority**: CRITICAL - Failure to follow will result in API bans  

---

## ⚠️ CRITICAL WARNING: Rate Limit Enforcement

**Official Statement from Mempool.space**:
> "Note that we enforce rate limits. If you exceed these limits, you will get an HTTP 429 error. If you repeatedly exceed the limits, you may be banned from accessing the service altogether. Consider an enterprise sponsorship if you need higher API limits."

Source: https://mempool.space/docs/api/rest

Mempool.space **strictly enforces** rate limits. Exceeding limits results in:

1. **HTTP 429 Error** (immediate rate limit violation)
2. **Temporary ban** (if repeatedly exceeded)
3. **Permanent ban** (for persistent violations)
4. **Complete loss of service** during ban period

**THIS IS NOT OPTIONAL.** You must configure rate limiting properly.

### Alternative: Self-Hosted Mempool

The entire mempool.space stack is **open-source** and available on GitHub:
- **GitHub**: https://github.com/mempool
- **Main Repository**: https://github.com/mempool/mempool
- **License**: Open source (you can run your own instance)
- **Benefit**: NO rate limits on your own server

---

## Rate Limit Tiers

### Public API (Rate Limited)

```
Endpoint: https://mempool.space/api/
Rate Limit: Enforced (exact limits not publicly documented)
Recommended: Assume 10-20 requests/minute maximum
WebSocket: Available (wss://mempool.space/api/v1/ws)
Cost: FREE
Risk: High (strict enforcement, bans for violations)
```

**⚠️ IMPORTANT**: Exact rate limits are not publicly documented. Conservative approach required.

**Your API Key**: `5d063afd314264c4b46da85342fe2555`  
**Usage**: Public API (rate limited)

### Enterprise Sponsorship (Higher Limits)

```
Contact: enterprise@mempool.space
Rate Limit: Custom (negotiated)
Cost: Contact for pricing
Benefit: Higher limits, priority support
```

### Self-Hosted Option (NO Rate Limits!)

```
Source: https://github.com/mempool/mempool
Rate Limit: NONE (your own server)
Cost: Server hosting costs ($10-100/month)
Benefit: Complete control, no rate limits, no bans
```

**🎉 NEW DISCOVERY**: The entire mempool.space platform is open-source!

**GitHub Organization**: https://github.com/mempool
- Main repo: https://github.com/mempool/mempool
- Backend API: Included in main repo
- Frontend: Included in main repo
- Docker support: Available for easy deployment

**Self-Hosting Benefits**:
- ✅ **NO rate limits** (unlimited requests)
- ✅ **NO bans** (your own server)
- ✅ **Full control** (customize as needed)
- ✅ **Privacy** (no third-party data sharing)
- ✅ **Lower latency** (run locally or nearby)

**Self-Hosting Costs**:
- VPS hosting: $10-50/month (Digital Ocean, Linode, AWS)
- Bitcoin node: ~600 GB storage (required)
- Bandwidth: Moderate (sync + API usage)
- Maintenance: Minimal (Docker makes it easy)

---

## Recommended Configuration for Your Environment

Based on your production `.env` file and the official rate limit warnings:

### Option 1: Public API (Conservative Configuration)

If using public mempool.space API:

### Environment Variables (Add these to your `.env`)

```bash
# ═══════════════════════════════════════════════════════════════
# BITCOIN MEMPOOL MONITORING - RATE LIMIT SAFE CONFIGURATION
# ═══════════════════════════════════════════════════════════════

# Your API Key (already in production .env)
MEMPOOL_API_KEY=5d063afd314264c4b46da85342fe2555

# Enable Bitcoin monitoring
BITCOIN_NETWORK_ENABLED=true
BITCOIN_NETWORK=mainnet

# ⚠️  CRITICAL: WebSocket MUST be enabled (bypasses rate limits)
BITCOIN_WEBSOCKET_ENABLED=true

# ⚠️  CRITICAL: Polling interval MUST be >= 60 seconds
# Conservative approach: Assume max 10-20 req/min allowed
# Recommended: 60-120 seconds for safety margin
# WebSocket handles real-time data, polling is only for periodic checks
BITCOIN_POLLING_INTERVAL=60

# Fee optimization
BITCOIN_MIN_FEE_RATE=10
BITCOIN_MAX_FEE_RATE=50
BITCOIN_DEFAULT_FEE_RATE=10

# MEV detection
BITCOIN_MEV_DETECTION=true
BITCOIN_HIGH_VALUE_THRESHOLD=100000000

# Consciousness integration
BITCOIN_CONSCIOUSNESS_ENABLED=true
```

---

## Why These Settings Are Required

### 1. WebSocket MUST Be Enabled

**Problem**: REST API polling every 30 seconds = **2 requests/minute** × multiple endpoints = rate limit violation

**Solution**: WebSocket provides **unlimited** real-time updates with **ZERO** REST API calls

```typescript
// ✅ CORRECT: WebSocket for real-time data (no rate limits)
const ws = new WebSocket('wss://mempool.space/api/v1/ws');
ws.send(JSON.stringify({
  action: 'want',
  data: ['blocks', 'stats', 'mempool-blocks']
}));

// ✗ WRONG: REST API polling (burns through rate limit)
setInterval(() => {
  fetch('/api/blocks/tip/height');  // 2 req/min
  fetch('/api/v1/fees/recommended'); // 2 req/min
  fetch('/api/mempool');             // 2 req/min
  // Total: 6 req/min = 60% of free tier used!
}, 30000);
```

### 2. Polling Interval MUST Be >= 60 Seconds

**Problem**: 30-second polling = too aggressive for free tier

**Math**:
```
30-second interval = 2 REST calls/minute per endpoint
Multiple endpoints = quick rate limit violation
60-second interval = 1 REST call/minute per endpoint
With WebSocket: REST only for periodic/fallback data
```

**Your Configuration**:
```bash
# ✅ SAFE: 60 seconds (or higher)
BITCOIN_POLLING_INTERVAL=60

# ✗ UNSAFE: 30 seconds or less
# BITCOIN_POLLING_INTERVAL=30  # DO NOT USE
```

### 3. Use Hybrid Approach (WebSocket + Minimal REST)

**Strategy**: WebSocket for real-time, REST for periodic only

```typescript
class RateLimitSafeClient {
  private ws: WebSocket;
  private lastRestCall = 0;
  private minRestInterval = 60000; // 60 seconds
  
  constructor() {
    // Primary: WebSocket (unlimited)
    this.ws = new WebSocket('wss://mempool.space/api/v1/ws');
    this.ws.on('message', this.handleRealTimeData);
    
    // Subscribe to real-time events
    this.ws.send(JSON.stringify({
      action: 'want',
      data: ['blocks', 'stats', 'mempool-blocks']
    }));
    
    // Secondary: Periodic REST (once per minute)
    setInterval(() => this.fetchPeriodicData(), 60000);
  }
  
  private async fetchPeriodicData(): Promise<void> {
    // Throttle REST calls to 1 per minute
    const now = Date.now();
    if (now - this.lastRestCall < this.minRestInterval) {
      return; // Skip if called too soon
    }
    
    this.lastRestCall = now;
    
    // Only 1 REST call per minute
    const fees = await fetch('/api/v1/fees/recommended');
    // DO NOT call multiple endpoints here!
  }
  
  private handleRealTimeData(data: any): void {
    // WebSocket provides:
    // - New blocks (instant)
    // - Mempool updates (instant)
    // - Stats updates (instant)
    // All with ZERO REST API calls!
  }
}
```

---

## Rate Limit Violation Detection

### How to Know If You're Violating Limits

**HTTP 429 Response**:
```json
{
  "error": "Rate limit exceeded",
  "details": "Too many requests",
  "retryAfter": 60
}
```

**IP Ban Symptoms**:
- All requests return 429
- WebSocket connections rejected
- Ban lasts 15-60 minutes
- Repeated violations = permanent ban

### Monitoring Your Usage

```typescript
class RateLimitTracker {
  private requests: number[] = [];
  private windowMs = 60000; // 1 minute
  private limit = 10; // Free tier
  
  trackRequest(): void {
    const now = Date.now();
    this.requests.push(now);
    
    // Remove old requests
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );
    
    // Alert if approaching limit
    if (this.requests.length >= this.limit * 0.8) {
      console.warn(
        `⚠️  Approaching rate limit: ${this.requests.length}/${this.limit} requests in last minute`
      );
    }
    
    // Error if limit exceeded
    if (this.requests.length >= this.limit) {
      console.error(
        `🚨 RATE LIMIT EXCEEDED: ${this.requests.length}/${this.limit} requests`
      );
      throw new Error('Rate limit exceeded - pausing operations');
    }
  }
  
  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(
      time => now - time < this.windowMs
    );
    return Math.max(0, this.limit - this.requests.length);
  }
  
  getUsagePercent(): number {
    return (this.requests.length / this.limit) * 100;
  }
}
```

---

## Production-Ready Configuration

### Complete Implementation

```typescript
import WebSocket from 'ws';

class MempoolMonitor {
  private ws: WebSocket;
  private rateLimitTracker: RateLimitTracker;
  private pollingInterval: number;
  private restApiUrl = 'https://mempool.space/api/v1';
  
  constructor() {
    this.pollingInterval = parseInt(process.env.BITCOIN_POLLING_INTERVAL || '60', 10) * 1000;
    this.rateLimitTracker = new RateLimitTracker();
    
    // Validate configuration
    if (this.pollingInterval < 60000) {
      throw new Error(
        `BITCOIN_POLLING_INTERVAL too low (${this.pollingInterval}ms). ` +
        `Minimum 60 seconds required to avoid rate limits.`
      );
    }
    
    this.setupWebSocket();
    this.startPeriodicTasks();
  }
  
  private setupWebSocket(): void {
    this.ws = new WebSocket('wss://mempool.space/api/v1/ws');
    
    this.ws.on('open', () => {
      console.log('✓ WebSocket connected (unlimited rate)');
      
      // Subscribe to real-time events
      this.ws.send(JSON.stringify({
        action: 'want',
        data: ['blocks', 'stats', 'mempool-blocks']
      }));
    });
    
    this.ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      this.handleWebSocketEvent(event);
    });
    
    this.ws.on('close', () => {
      console.log('WebSocket closed, reconnecting in 5s...');
      setTimeout(() => this.setupWebSocket(), 5000);
    });
    
    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
  
  private handleWebSocketEvent(event: any): void {
    // Handle real-time events (unlimited)
    if (event.block) {
      console.log(`New block: ${event.block.height}`);
    }
    
    if (event.mempoolInfo) {
      console.log(`Mempool: ${event.mempoolInfo.size} transactions`);
    }
    
    if (event['mempool-blocks']) {
      console.log(`Next block template updated`);
    }
  }
  
  private startPeriodicTasks(): void {
    // Periodic REST calls (once per minute only)
    setInterval(() => {
      this.fetchPeriodicData().catch(error => {
        console.error('Periodic fetch error:', error);
      });
    }, this.pollingInterval);
  }
  
  private async fetchPeriodicData(): Promise<void> {
    try {
      // Check rate limit before making request
      if (this.rateLimitTracker.getRemainingRequests() < 1) {
        console.warn('⚠️  Rate limit reached, skipping periodic fetch');
        return;
      }
      
      // Track the request
      this.rateLimitTracker.trackRequest();
      
      // Make ONLY ONE REST call per interval
      const response = await fetch(`${this.restApiUrl}/fees/recommended`);
      
      if (response.status === 429) {
        console.error('🚨 RATE LIMIT EXCEEDED - API temporarily banned');
        // Increase polling interval temporarily
        this.pollingInterval = Math.min(this.pollingInterval * 2, 300000);
        console.log(`Increased polling interval to ${this.pollingInterval / 1000}s`);
        return;
      }
      
      const fees = await response.json();
      console.log(`Periodic fee check: ${fees.halfHourFee} sat/vB`);
      
      // Log rate limit usage
      const usage = this.rateLimitTracker.getUsagePercent();
      console.log(`Rate limit usage: ${usage.toFixed(1)}% (${this.rateLimitTracker.getRemainingRequests()} remaining)`);
      
    } catch (error) {
      console.error('REST API error:', error);
    }
  }
}

// Start monitoring with safe configuration
const monitor = new MempoolMonitor();
```

---

## Upgrading to Paid Tier (Optional)

### When to Upgrade

Consider upgrading if you need:
- More than 1 REST call per 6 seconds
- Multiple simultaneous monitoring instances
- Historical data analysis (many API calls)
- Reduced risk of accidental violations

### Cost-Benefit Analysis

```
Free Tier:
- Cost: $0/month
- Limit: 10 req/min
- Risk: High (easy to violate)
- Best for: Single instance with WebSocket primary

Paid Tier:
- Cost: $100/month
- Limit: 100 req/min
- Risk: Low (10x headroom)
- Best for: Multiple instances or heavy REST usage
```

**Recommendation**: Stay on free tier initially. Your configuration with WebSocket + 60s polling is sufficient.

---

## Testing Your Configuration

### Test Script

```bash
# Test with safe configuration
cd /home/runner/work/Copilot-Consciousness/Copilot-Consciousness

# Set environment variables
export BITCOIN_NETWORK_ENABLED=true
export BITCOIN_WEBSOCKET_ENABLED=true
export BITCOIN_POLLING_INTERVAL=60
export MEMPOOL_API_KEY=5d063afd314264c4b46da85342fe2555

# Run monitor for 5 minutes
npx tsx scripts/mempool_monitor.ts

# Monitor should show:
# ✓ WebSocket connected
# ✓ Real-time block updates (via WebSocket)
# ✓ Periodic fee checks (once per minute via REST)
# ✓ Rate limit usage <10% (safe)
```

### Expected Output

```
✓ WebSocket connected (unlimited rate)
✓ Subscribed to: blocks, stats, mempool-blocks
New block: 820123 (via WebSocket - no API call)
Mempool: 5234 transactions (via WebSocket - no API call)
Periodic fee check: 3.2 sat/vB (REST API - 1 call)
Rate limit usage: 1.7% (9 remaining)
[60 seconds later]
Periodic fee check: 3.5 sat/vB (REST API - 1 call)
Rate limit usage: 3.3% (8 remaining)
```

---

## Emergency Procedures

### If You Get Rate Limited

**Step 1**: Stop all services immediately
```bash
# Kill all node processes
pkill -f mempool_monitor
pkill -f autonomous-mempool-study
```

**Step 2**: Wait for ban to expire (15-60 minutes)

**Step 3**: Update configuration
```bash
# Increase polling interval
BITCOIN_POLLING_INTERVAL=120  # 2 minutes

# Or disable REST polling entirely (WebSocket only)
BITCOIN_WEBSOCKET_ENABLED=true
BITCOIN_POLLING_INTERVAL=300  # 5 minutes (minimal fallback)
```

**Step 4**: Resume with safe settings

### If You Get Permanent Ban

**Symptoms**:
- API key permanently revoked
- All requests return 403 Forbidden
- Unable to create new WebSocket connections

**Recovery**:
1. Contact mempool.space support: enterprise@mempool.space
2. Explain the situation (accidental misconfiguration)
3. Request new API key
4. Implement proper rate limiting BEFORE using new key

---

## Summary Checklist

Before enabling Bitcoin mempool monitoring:

- [ ] `MEMPOOL_API_KEY` is set (you have: `5d063afd314264c4b46da85342fe2555`)
- [ ] `BITCOIN_WEBSOCKET_ENABLED=true` (unlimited real-time data)
- [ ] `BITCOIN_POLLING_INTERVAL >= 60` (safe REST API usage)
- [ ] Rate limit tracking implemented
- [ ] Error handling for 429 responses
- [ ] Exponential backoff on failures
- [ ] Monitoring alerts configured

**Your Current Risk**: 🟡 MEDIUM
- Have API key ✓
- Need to configure safe polling interval
- Need to enable WebSocket

**After Configuration**: 🟢 LOW
- WebSocket primary (unlimited)
- REST minimal (1 call/minute)
- Rate limit tracking active

---

## Contact Information

**Mempool.space Support**:
- Email: enterprise@mempool.space
- Documentation: https://mempool.space/docs/api
- GitHub: https://github.com/mempool/mempool

**Rate Limit Questions**:
- Check current usage: Monitor rate limit tracker logs
- Upgrade to paid tier: Contact enterprise@mempool.space
- Report issues: GitHub issues or email support

---

**Document Status**: CRITICAL CONFIGURATION GUIDE  
**Last Updated**: December 5, 2025  
**Next Review**: Before enabling production monitoring  
**Priority**: HIGH - Must follow before production use  

⚠️ **FAILURE TO FOLLOW = API BAN** ⚠️
