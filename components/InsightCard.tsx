'use client';

import { motion } from 'framer-motion';
import { Insight } from '@/types';

interface InsightCardProps {
  insight: Insight;
  index: number;
}

export default function InsightCard({ insight, index }: InsightCardProps) {
  const getColorScheme = () => {
    switch (insight.type) {
      case 'concern':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: '⚠️',
          text: 'text-red-800',
          badgeBg: 'bg-red-100',
          badgeText: 'text-red-700'
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: '✅',
          text: 'text-green-800',
          badgeBg: 'bg-green-100',
          badgeText: 'text-green-700'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'ℹ️',
          text: 'text-blue-800',
          badgeBg: 'bg-blue-100',
          badgeText: 'text-blue-700'
        };
    }
  };

  const colors = getColorScheme();

  const getImpactBadge = () => {
    const badges = {
      high: { label: 'High Impact', color: 'bg-red-500 text-white' },
      medium: { label: 'Medium Impact', color: 'bg-yellow-500 text-white' },
      low: { label: 'Low Impact', color: 'bg-gray-500 text-white' }
    };
    return badges[insight.impact];
  };

  const badge = getImpactBadge();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={`${colors.bg} ${colors.border} border-2 rounded-xl p-4 hover:shadow-lg transition-all duration-200`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{colors.icon}</span>
          <h4 className={`font-semibold ${colors.text}`}>{insight.title}</h4>
        </div>
        <span className={`${badge.color} text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap`}>
          {badge.label}
        </span>
      </div>
      <p className={`text-sm ${colors.text} leading-relaxed ml-8`}>
        {insight.description}
      </p>
    </motion.div>
  );
}
