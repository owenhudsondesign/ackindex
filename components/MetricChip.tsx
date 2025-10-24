'use client';

import { motion } from 'framer-motion';
import { KeyMetric } from '@/types';

interface MetricChipProps {
  metric: KeyMetric;
  index: number;
}

export default function MetricChip({ metric, index }: MetricChipProps) {
  const getTrendIcon = () => {
    if (!metric.trend) return null;

    const icons = {
      up: { icon: '↑', color: 'text-red-600', bg: 'bg-red-50' },
      down: { icon: '↓', color: 'text-green-600', bg: 'bg-green-50' },
      stable: { icon: '→', color: 'text-gray-600', bg: 'bg-gray-50' }
    };

    return icons[metric.trend];
  };

  const trendIcon = getTrendIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-gradient-to-br from-ack-blue/10 to-ack-sand/10 rounded-xl px-4 py-3 border border-ack-blue/20 hover:border-ack-blue/40 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-ack-gray font-medium">{metric.label}</p>
        {trendIcon && (
          <span className={`text-sm font-bold ${trendIcon.color} ${trendIcon.bg} px-2 py-0.5 rounded-full`}>
            {trendIcon.icon}
          </span>
        )}
      </div>
      <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
      {metric.change_pct !== undefined && metric.change_pct !== null && (
        <p className={`text-xs mt-1 font-medium ${
          metric.change_pct > 0 ? 'text-red-600' : metric.change_pct < 0 ? 'text-green-600' : 'text-gray-500'
        }`}>
          {metric.change_pct > 0 ? '+' : ''}{metric.change_pct}% change
        </p>
      )}
    </motion.div>
  );
}
