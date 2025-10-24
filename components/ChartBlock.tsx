'use client';

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Visualization } from '@/types';

const COLORS = ['#5B8FB9', '#C7B299', '#9CA3AF', '#60A5FA', '#D1D5DB'];

interface ChartBlockProps {
  visualization: Visualization;
}

export default function ChartBlock({ visualization }: ChartBlockProps) {
  const { type, labels, values, title, insight, highlight_index } = visualization;

  // Transform data for Recharts
  const chartData = labels.map((label, index) => ({
    name: label,
    value: values[index],
  }));

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '12px',
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === highlight_index ? '#DC2626' : '#5B8FB9'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#5B8FB9"
                strokeWidth={2}
                dot={{ fill: '#5B8FB9', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={type === 'donut' ? 80 : 100}
                innerRadius={type === 'donut' ? 50 : 0}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Value</th>
                </tr>
              </thead>
              <tbody>
                {labels.map((label, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900">{label}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {values[index].toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Chart Title */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}

      {/* Chart */}
      {renderChart()}

      {/* Insight Caption */}
      {insight && (
        <div className="mt-4 p-3 bg-gradient-to-r from-ack-blue/5 to-ack-sand/5 border border-ack-blue/20 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-ack-blue">💡 Insight:</span> {insight}
          </p>
        </div>
      )}
    </motion.div>
  );
}
