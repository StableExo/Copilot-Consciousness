/**
 * useDashboard Hook
 * Manages WebSocket connection and real-time data updates
 */

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { DashboardMetrics, Alert, PerformanceMetrics, ChartData } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.PROD ? '' : 'http://localhost:3000'); // Require explicit config in production

export function useDashboard() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [latency, setLatency] = useState<number>(0);

  useEffect(() => {
    // Initialize WebSocket connection
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      
      // Request initial data
      socketInstance.emit('request:metrics');
      socketInstance.emit('request:performance');
      socketInstance.emit('request:chart-data', {});
      socketInstance.emit('request:recent-alerts', { limit: 50 });
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    socketInstance.on('metrics', (data: DashboardMetrics) => {
      setMetrics(data);
    });

    socketInstance.on('alert', (alert: Alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50));
    });

    socketInstance.on('alerts', (data: Alert[]) => {
      setAlerts(data);
    });

    socketInstance.on('performance', (data: PerformanceMetrics) => {
      setPerformance(data);
    });

    socketInstance.on('chart-data', (data: ChartData) => {
      setChartData(data);
    });

    socketInstance.on('pong', ({ latency: lat }: { latency: number }) => {
      setLatency(lat);
    });

    socketInstance.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });

    setSocket(socketInstance);

    // Ping every 5 seconds to measure latency
    const pingInterval = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit('ping', Date.now());
      }
    }, 5000);

    // Cleanup
    return () => {
      clearInterval(pingInterval);
      socketInstance.disconnect();
    };
  }, []);

  const requestMetrics = useCallback(() => {
    socket?.emit('request:metrics');
  }, [socket]);

  const requestChartData = useCallback((timeRange?: { start: number; end: number }) => {
    socket?.emit('request:chart-data', { timeRange });
  }, [socket]);

  const requestAlerts = useCallback((limit: number = 50) => {
    socket?.emit('request:recent-alerts', { limit });
  }, [socket]);

  const requestPerformance = useCallback(() => {
    socket?.emit('request:performance');
  }, [socket]);

  return {
    connected,
    metrics,
    alerts,
    performance,
    chartData,
    latency,
    requestMetrics,
    requestChartData,
    requestAlerts,
    requestPerformance
  };
}
