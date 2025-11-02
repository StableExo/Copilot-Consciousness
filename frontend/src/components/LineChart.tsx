/**
 * LineChart Component
 * Reusable line chart using Recharts
 */

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TimeSeriesData } from '../types';

interface LineChartProps {
  data: TimeSeriesData[];
  title: string;
  color?: string;
  yAxisLabel?: string;
  formatValue?: (value: number) => string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  color = '#3b82f6',
  yAxisLabel,
  formatValue = (v) => v.toFixed(2)
}) => {
  const formattedData = data.map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString(),
    value: d.value
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => formatValue(Number(value))} />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            name={title}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};
