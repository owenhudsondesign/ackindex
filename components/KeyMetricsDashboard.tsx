'use client';

import { motion } from 'framer-motion';

interface AggregatedMetric {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  change_pct?: number;
  category: string;
}

interface KeyMetricsDashboardProps {
  metrics: AggregatedMetric[];
}

export default function KeyMetricsDashboard({ metrics }: KeyMetricsDashboardProps) {
  const getTrendColor = (trend?: 'up' | 'down' | 'stable', label?: string) => {
    if (!trend) return 'text-gray-600';

    // For some metrics, "up" is bad (costs, expenses)
    const badWhenUp = [
      'cost', 'expense', 'debt', 'tax', 'increase', 'deficit', 'spending'
    ].some(word => label?.toLowerCase().includes(word));

    if (trend === 'up') {
      return badWhenUp ? 'text-red-600' : 'text-green-600';
    }
    if (trend === 'down') {
      return badWhenUp ? 'text-green-600' : 'text-red-600';
    }
    return 'text-gray-600';
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    if (!trend) return null;
    const icons = {
      up: '↑',
      down: '↓',
      stable: '→',
    };
    return icons[trend];
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Budget: 'border-l-blue-500',
      'Real Estate': 'border-l-green-500',
      'Town Meeting': 'border-l-purple-500',
      Infrastructure: 'border-l-orange-500',
      General: 'border-l-gray-500',
    };
    return colors[category] || 'border-l-gray-500';
  };

  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No metrics available yet. Upload documents to see key metrics.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Key Metrics at a Glance</h2>
        <p className="text-gray-600">Aggregated data from all civic documents</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            className={`bg-white rounded-xl shadow-md border-l-4 ${getCategoryColor(
              metric.category
            )} p-5 hover:shadow-lg transition-shadow duration-200`}
          >
            <div className="flex flex-col h-full">
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {metric.category}
                </p>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-700 mb-2 leading-tight">
                  {metric.label}
                </h3>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  {metric.trend && (
                    <div className={`flex items-center gap-1 ${getTrendColor(metric.trend, metric.label)}`}>
                      <span className="text-lg font-bold">
                        {getTrendIcon(metric.trend)}
                      </span>
                      {metric.change_pct && (
                        <span className="text-sm font-semibold">
                          {Math.abs(metric.change_pct)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
