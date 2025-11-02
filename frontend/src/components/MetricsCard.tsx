/**
 * MetricsCard Component
 * Displays a single metric with label and value
 */

import React from 'react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'green' | 'red' | 'blue' | 'yellow';
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  color = 'blue'
}) => {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900'
  };

  const trendIcon = {
    up: '↑',
    down: '↓',
    neutral: '→'
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses[color]} shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-70">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm mt-1 opacity-60">{subtitle}</p>
          )}
        </div>
        {trend && (
          <span className="text-2xl">{trendIcon[trend]}</span>
        )}
      </div>
    </div>
  );
};
