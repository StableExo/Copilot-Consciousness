/**
 * PerformanceDashboard Component
 * Displays system health and performance metrics
 */

import React from 'react';
import { PerformanceMetrics } from '../types';

interface PerformanceDashboardProps {
  performance: PerformanceMetrics | null;
  wsLatency: number;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  performance,
  wsLatency
}) => {
  if (!performance) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">System Performance</h3>
        <p className="text-gray-500">Loading performance data...</p>
      </div>
    );
  }

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const memoryPercent = (performance.memoryUsed / performance.memoryTotal) * 100;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">System Performance</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-gray-600">Uptime</p>
          <p className="text-xl font-bold">{formatUptime(performance.systemUptime)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">API Latency</p>
          <p className="text-xl font-bold">{performance.apiLatency.toFixed(0)}ms</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">WS Latency</p>
          <p className="text-xl font-bold">{wsLatency.toFixed(0)}ms</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Connections</p>
          <p className="text-xl font-bold">{performance.activeConnections}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Memory</p>
          <p className="text-xl font-bold">{formatBytes(performance.memoryUsed)}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${memoryPercent}%` }}
            />
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">CPU Usage</p>
          <p className="text-xl font-bold">{performance.cpuUsage.toFixed(2)}ms</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Requests/sec</p>
          <p className="text-xl font-bold">{performance.requestsPerSecond.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Errors/min</p>
          <p className="text-xl font-bold">{performance.errorsPerMinute}</p>
        </div>
      </div>
    </div>
  );
};
