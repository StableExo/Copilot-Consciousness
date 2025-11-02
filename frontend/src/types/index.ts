/**
 * Frontend Type Definitions
 * Shared types for the dashboard frontend
 */

export interface DashboardMetrics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  successRate: number;
  totalProfit: string;
  totalLoss: string;
  netProfit: string;
  roi: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageExecutionTime: number;
  averageGasCost: string;
  uptime: number;
  latency: number;
  memoryUsage: number;
  errorRate: number;
}

export interface LiveTrade {
  id: string;
  timestamp: number;
  type: 'single-chain' | 'cross-chain' | 'multi-hop';
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  profit: string;
  gasUsed: string;
  chain: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface Alert {
  id: string;
  timestamp: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  systemUptime: number;
  apiLatency: number;
  wsLatency: number;
  memoryUsed: number;
  memoryTotal: number;
  cpuUsage: number;
  activeConnections: number;
  requestsPerSecond: number;
  errorsPerMinute: number;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
}

export interface ChartData {
  profitOverTime: TimeSeriesData[];
  gasOverTime: TimeSeriesData[];
  volumeOverTime: TimeSeriesData[];
  successRateOverTime: TimeSeriesData[];
}
