'use client';

import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Visualization } from '@/types';

interface TrendChartsProps {
  visualizations: Visualization[];
}

export default function TrendCharts({ visualizations }: TrendChartsProps) {
  if (!visualizations || visualizations.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No trend data available yet. Upload documents with historical data to see trends.</p>
      </div>
    );
  }

  const renderChart = (viz: Visualization, index: number) => {
    const chartData = viz.labels.map((label, idx) => ({
      name: label,
      value: viz.values[idx],
    }));

    const isHighlighted = (idx: number) => viz.highlight_index === idx;

    if (viz.type === 'line' || viz.type === 'timeline') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#5B8FB9"
              strokeWidth={3}
              dot={{ fill: '#5B8FB9', r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (viz.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={isHighlighted(idx) ? '#DC2626' : '#5B8FB9'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  // Filter to only show line and bar charts (trends over time)
  const trendVisualizations = visualizations.filter(
    (viz) => viz.type === 'line' || viz.type === 'timeline' || viz.type === 'bar'
  );

  if (trendVisualizations.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No trend charts available yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Trends Over Time</h2>
        <p className="text-gray-600">Visual patterns in civic data</p>
      </div>

      <div className="space-y-6">
        {trendVisualizations.map((viz, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200"
          >
            {/* Chart Title */}
            {viz.title && (
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {viz.title}
              </h3>
            )}

            {/* Chart */}
            <div className="w-full overflow-x-auto">
              {renderChart(viz, idx)}
            </div>

            {/* Insight */}
            {viz.insight && (
              <div className="mt-4 p-4 bg-gradient-to-r from-ack-blue/5 to-transparent rounded-lg border-l-4 border-ack-blue">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-ack-blue">Insight:</span>{' '}
                  {viz.insight}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
