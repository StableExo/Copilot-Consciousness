# Real-Time Analytics Dashboard

A comprehensive real-time analytics dashboard for the arbitrage bot with WebSocket streaming, interactive visualizations, multi-channel alerts, and performance monitoring.

## Features

### 📊 Real-Time Metrics
- Live profit/loss tracking with cumulative totals
- Success rate monitoring with trend analysis
- ROI (Return on Investment) calculation
- Sharpe ratio for risk-adjusted returns
- Maximum drawdown tracking
- Gas cost analytics
- System performance metrics (uptime, latency, memory)

### 🔌 WebSocket Streaming
- Low-latency real-time updates (<50ms target)
- Automatic reconnection handling
- Bi-directional communication
- Ping/pong for latency measurement
- Support for 100+ concurrent connections

### 🚨 Multi-Channel Alerts
- **WebSocket**: Real-time browser notifications
- **Email**: SMTP-based email alerts
- **Telegram**: Bot-based notifications
- **Discord**: Webhook notifications
- Configurable thresholds for all alert types

### 📈 Advanced Analytics
- Time-series data aggregation
- Historical data queries
- Cross-chain performance analysis
- Gas optimization tracking
- Bridge success rate monitoring

### 💾 Data Persistence
- TimescaleDB integration for efficient time-series storage
- Redis caching support (optional)
- Historical data retention
- Aggregated statistics

## Architecture

```
Dashboard Server
├── Express HTTP Server (REST API)
├── Socket.IO WebSocket Server
├── Services
│   ├── MetricsAggregator (combines Gas & CrossChain analytics)
│   ├── AlertSystem (multi-channel notifications)
│   └── TimeSeriesDB (historical data)
└── WebSocket Handler (real-time streaming)
```

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

Create a `.env` file in the project root:

```env
# Server Configuration
DASHBOARD_PORT=3000
UPDATE_INTERVAL=1000
MAX_CONNECTIONS=100

# Alert Thresholds
ALERT_PROFIT_THRESHOLD=1.0      # 1 ETH
ALERT_LOSS_THRESHOLD=0.5        # 0.5 ETH
ALERT_GAS_THRESHOLD=0.1         # 0.1 ETH
ALERT_SUCCESS_RATE_THRESHOLD=90 # 90%

# Email Alerts (optional)
EMAIL_ENABLED=false
EMAIL_RECIPIENTS=alerts@example.com,admin@example.com

# Telegram Alerts (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Discord Alerts (optional)
DISCORD_WEBHOOK_URL=your_webhook_url

# TimescaleDB (optional)
TIMESCALEDB_HOST=localhost
TIMESCALEDB_PORT=5432
TIMESCALEDB_DATABASE=arbitrage_dashboard
TIMESCALEDB_USER=postgres
TIMESCALEDB_PASSWORD=your_password

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

## Usage

### Starting the Server

```bash
# Development mode
npm run dashboard:dev

# Production mode
npm run dashboard:server
```

### Accessing the Dashboard

When you start TheWarden, the dashboard is available at `http://localhost:3000` (or the port configured in `DASHBOARD_PORT`).

**Option 1: Built-in Info Page**
Visit `http://localhost:3000` in your browser. You'll see an informative dashboard page showing:
- System status
- Available API endpoints
- WebSocket connection info
- Instructions for the full React dashboard

**Option 2: Full React Dashboard (Recommended)**
For the complete interactive dashboard with charts and real-time updates:

```bash
# Build the frontend (production)
cd frontend
npm install
npm run build

# The backend will automatically serve the built files

# OR run in development mode (hot reload)
cd frontend
npm run dev
# Then visit http://localhost:3001
```

### Programmatic Usage

```typescript
import { DashboardServer } from './src/dashboard';
import { GasAnalytics } from './src/gas/GasAnalytics';
import { CrossChainAnalytics } from './src/chains/CrossChainAnalytics';

// Initialize analytics modules
const gasAnalytics = new GasAnalytics();
const crossChainAnalytics = new CrossChainAnalytics();

// Create dashboard server
const dashboardServer = new DashboardServer(
  gasAnalytics,
  crossChainAnalytics,
  {
    port: 3000,
    enableCors: true,
    updateInterval: 1000,
    alerts: {
      profitThreshold: 1.0,
      channels: { websocket: true }
    }
  }
);

// Start the server
await dashboardServer.start();
```

## API Endpoints

### General

- `GET /` - API information and status
- `GET /api/health` - Health check

### Metrics

- `GET /api/metrics` - Current aggregated metrics
- `GET /api/metrics/history?limit=100` - Historical metrics
- `GET /api/chart-data?start=<timestamp>&end=<timestamp>` - Chart data for visualizations

### Trades

- `GET /api/trades/recent?limit=20` - Recent trades

### Gas Analytics

- `GET /api/gas/analytics` - Gas metrics and optimization data

### Alerts

- `GET /api/alerts?limit=50` - Recent alerts
- `GET /api/alerts/stats` - Alert statistics
- `POST /api/alerts/test` - Create test alert

### Performance

- `GET /api/performance` - System performance metrics

### Cross-Chain

- `GET /api/cross-chain/summary` - Cross-chain analytics summary
- `GET /api/cross-chain/chain-pairs` - Chain pair statistics

## WebSocket Events

### Client -> Server

```typescript
// Request current metrics
socket.emit('request:metrics');

// Request chart data
socket.emit('request:chart-data', { timeRange: { start, end } });

// Request recent alerts
socket.emit('request:recent-alerts', { limit: 50 });

// Request performance metrics
socket.emit('request:performance');

// Ping for latency measurement
socket.emit('ping', Date.now());
```

### Server -> Client

```typescript
// Metrics update
socket.on('metrics', (metrics) => {
  console.log('Metrics:', metrics);
});

// Chart data
socket.on('chart-data', (chartData) => {
  console.log('Chart data:', chartData);
});

// Alert
socket.on('alert', (alert) => {
  console.log('Alert:', alert);
});

// Performance metrics
socket.on('performance', (performance) => {
  console.log('Performance:', performance);
});

// Pong response
socket.on('pong', ({ timestamp, latency }) => {
  console.log('Latency:', latency, 'ms');
});
```

## WebSocket Client Example

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// Listen for metrics updates
socket.on('metrics', (metrics) => {
  console.log('Total Profit:', metrics.netProfit);
  console.log('Success Rate:', metrics.successRate);
  console.log('ROI:', metrics.roi);
});

// Listen for alerts
socket.on('alert', (alert) => {
  console.log(`[${alert.type}] ${alert.title}: ${alert.message}`);
});

// Measure latency
setInterval(() => {
  socket.emit('ping', Date.now());
}, 5000);

socket.on('pong', ({ latency }) => {
  console.log('WebSocket latency:', latency, 'ms');
});
```

## Performance Targets

- **WebSocket Latency**: <50ms for real-time updates
- **API Response Time**: <100ms for all endpoints
- **Concurrent Users**: Support 100+ simultaneous connections
- **Update Frequency**: Configurable (default: 1000ms)
- **Memory Efficiency**: Optimized for long-running processes

## Testing

```bash
# Run all dashboard tests
npm test -- src/dashboard/__tests__

# Run specific test file
npm test -- src/dashboard/__tests__/MetricsAggregator.test.ts

# Run with coverage
npm test -- --coverage src/dashboard/__tests__
```

## Development

### Project Structure

```
src/dashboard/
├── DashboardServer.ts        # Main server class
├── server.ts                 # Entry point
├── index.ts                  # Module exports
├── types/
│   └── index.ts             # TypeScript type definitions
├── services/
│   ├── MetricsAggregator.ts # Metrics collection & aggregation
│   ├── AlertSystem.ts       # Multi-channel alerting
│   └── TimeSeriesDB.ts      # Time-series database integration
├── websocket/
│   └── WebSocketHandler.ts # WebSocket connection management
├── routes/
│   └── index.ts             # REST API routes
└── __tests__/               # Unit tests
```

### Adding New Metrics

1. Update `DashboardMetrics` interface in `types/index.ts`
2. Modify `MetricsAggregator.getCurrentMetrics()` to include new metric
3. Update API response in `routes/index.ts`
4. Add WebSocket event if needed in `WebSocketHandler.ts`

### Adding New Alert Channels

1. Extend `AlertConfig` interface in `types/index.ts`
2. Implement channel handler in `AlertSystem.ts`
3. Add configuration in `.env` file
4. Update README documentation

## Troubleshooting

### WebSocket Connection Issues

- Verify CORS configuration in `DashboardServer.ts`
- Check firewall settings for the configured port
- Ensure client uses correct WebSocket URL

### High Memory Usage

- Reduce `maxHistorySize` in services
- Enable Redis caching for external storage
- Configure TimescaleDB for historical data offloading

### Alert Delivery Failures

- Verify third-party service credentials (Telegram, Discord)
- Check network connectivity to external services
- Review alert channel configuration in `.env`

## License

Part of the Copilot-Consciousness project.
