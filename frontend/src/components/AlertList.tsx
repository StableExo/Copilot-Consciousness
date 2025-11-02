/**
 * AlertList Component
 * Displays a list of recent alerts with filtering
 */

import React, { useState } from 'react';
import { Alert } from '../types';

interface AlertListProps {
  alerts: Alert[];
}

export const AlertList: React.FC<AlertListProps> = ({ alerts }) => {
  const [filter, setFilter] = useState<Alert['type'] | 'all'>('all');

  const filteredAlerts = filter === 'all'
    ? alerts
    : alerts.filter((a) => a.type === filter);

  const alertColors = {
    info: 'bg-blue-100 text-blue-800 border-blue-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    error: 'bg-red-100 text-red-800 border-red-300',
    success: 'bg-green-100 text-green-800 border-green-300'
  };

  const alertIcons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Alerts</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200'
            }`}
          >
            All
          </button>
          {(['info', 'warning', 'error', 'success'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1 rounded text-sm ${
                filter === type ? 'bg-gray-800 text-white' : 'bg-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No alerts</p>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded border ${alertColors[alert.type]}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{alertIcons[alert.type]}</span>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold">{alert.title}</h4>
                    <span className="text-xs opacity-70">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
