# Arbitrage Bot Dashboard - Frontend

React-based real-time analytics dashboard with WebSocket streaming and interactive visualizations.

## Features

- 📊 Real-time metrics display
- 📈 Interactive charts (Recharts)
- 🚨 Live alert notifications
- ⚡ WebSocket streaming (<50ms latency)
- 📱 Responsive design (TailwindCSS)
- 🎨 Modern UI with hero stats and performance monitoring

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **Recharts** - Data visualization
- **Socket.IO Client** - WebSocket communication

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

Create a `.env` file in the frontend directory:

```env
VITE_SOCKET_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000/api
```

## Development

The dev server runs on port 3001 by default and proxies API requests to the backend on port 3000.

```bash
npm run dev
```

Visit http://localhost:3001 to view the dashboard.

## Components

### MetricsCard
Displays individual metrics with color coding and trend indicators.

### LineChart
Reusable line chart component for time-series data visualization.

### AlertList
Displays recent alerts with filtering by type (info, warning, error, success).

### PerformanceDashboard
Shows system health metrics including uptime, latency, memory usage, and connection count.

## WebSocket Connection

The dashboard automatically connects to the backend WebSocket server and listens for real-time updates:

- Metrics updates every 1 second
- Alert notifications in real-time
- Performance metrics updates
- Automatic reconnection on disconnect

## Building for Production

```bash
# Build optimized production bundle
npm run build

# The build output will be in the `dist` directory
```

## Deployment

The frontend can be deployed to any static hosting service:

- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

Make sure to configure the `VITE_SOCKET_URL` environment variable to point to your production backend server.
