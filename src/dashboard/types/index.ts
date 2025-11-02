/**
 * Type definitions for the Real-Time Analytics Dashboard
 */

export interface DashboardMetrics {
  // Trading metrics
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  successRate: number;
  
  // Financial metrics
  totalProfit: string; // bigint as string
  totalLoss: string;
  netProfit: string;
  roi: number;
  sharpeRatio: number;
  maxDrawdown: number;
  
  // Performance metrics
  averageExecutionTime: number;
  averageGasCost: string;
  
  // System metrics
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

export interface ArbitrageOpportunity {
  id: string;
  timestamp: number;
  path: string;
  estimatedProfit: string;
  confidence: number;
  chains: string[];
  dexes: string[];
}

export interface Alert {
  id: string;
  timestamp: number;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface AlertConfig {
  profitThreshold?: number;
  lossThreshold?: number;
  gasThreshold?: number;
  successRateThreshold?: number;
  channels: {
    websocket: boolean;
    email?: {
      enabled: boolean;
      recipients: string[];
    };
    telegram?: {
      enabled: boolean;
      chatId: string;
      botToken: string;
    };
    discord?: {
      enabled: boolean;
      webhookUrl: string;
    };
  };
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

export interface BacktestResult {
  id: string;
  startTime: number;
  endTime: number;
  totalTrades: number;
  winRate: number;
  totalProfit: string;
  maxDrawdown: number;
  sharpeRatio: number;
  equityCurve: TimeSeriesData[];
  trades: {
    timestamp: number;
    profit: string;
    type: 'win' | 'loss';
  }[];
}

export interface WebSocketEvent {
  type: 'metrics' | 'trade' | 'opportunity' | 'alert' | 'performance';
  data: DashboardMetrics | LiveTrade | ArbitrageOpportunity | Alert | PerformanceMetrics;
}

export interface DashboardConfig {
  port: number;
  wsPort?: number;
  enableCors: boolean;
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  timescaledb?: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  alerts: AlertConfig;
  updateInterval: number; // milliseconds
  maxConnections: number;
}
