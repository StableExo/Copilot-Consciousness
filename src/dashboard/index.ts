/**
 * Dashboard Module - Exports
 * 
 * Centralized exports for the Real-Time Analytics Dashboard
 */

export { DashboardServer } from './DashboardServer';
export { MetricsAggregator } from './services/MetricsAggregator';
export { AlertSystem } from './services/AlertSystem';
export { TimeSeriesDB } from './services/TimeSeriesDB';
export { WebSocketHandler } from './websocket/WebSocketHandler';
export { createRoutes } from './routes';
export * from './types';
