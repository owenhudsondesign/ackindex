'use client';

import { motion } from 'framer-motion';
import { Insight } from '@/types';

interface TopInsightsProps {
  insights: Insight[];
}

export default function TopInsights({ insights }: TopInsightsProps) {
  const getInsightConfig = (type: string, impact: string) => {
    const configs: Record<string, any> = {
      concern: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconBg: 'bg-red-100',
        iconText: 'text-red-600',
        titleText: 'text-red-900',
        icon: '⚠️',
      },
      success: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        iconBg: 'bg-green-100',
        iconText: 'text-green-600',
        titleText: 'text-green-900',
        icon: '✅',
      },
      neutral: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        iconText: 'text-blue-600',
        titleText: 'text-blue-900',
        icon: 'ℹ️',
      },
    };
    return configs[type] || configs.neutral;
  };

  const getImpactBadge = (impact: string) => {
    const badges: Record<string, { text: string; classes: string }> = {
      high: {
        text: 'HIGH IMPACT',
        classes: 'bg-red-100 text-red-700 border-red-300',
      },
      medium: {
        text: 'MEDIUM IMPACT',
        classes: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      },
      low: {
        text: 'LOW IMPACT',
        classes: 'bg-gray-100 text-gray-700 border-gray-300',
      },
    };
    return badges[impact] || badges.medium;
  };

  if (!insights || insights.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No insights available yet. Upload documents to see key insights.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Top Insights</h2>
        <p className="text-gray-600">The most important things you should know</p>
      </div>

      <div className="space-y-4">
        {insights.slice(0, 3).map((insight, idx) => {
          const config = getInsightConfig(insight.type, insight.impact);
          const impactBadge = getImpactBadge(insight.impact);
          const isFirst = idx === 0;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className={`${config.bg} border-2 ${config.border} rounded-2xl p-6 ${
                isFirst ? 'ring-2 ring-offset-2 ring-offset-white ring-ack-blue/30' : ''
              } hover:shadow-lg transition-all duration-200`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`${config.iconBg} ${config.iconText} w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}
                >
                  {config.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className={`text-xl font-bold ${config.titleText} leading-tight`}>
                      {insight.title}
                    </h3>
                    <span
                      className={`${impactBadge.classes} text-xs font-bold px-2 py-1 rounded-full border whitespace-nowrap`}
                    >
                      {impactBadge.text}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{insight.description}</p>
                </div>
              </div>

              {/* Priority indicator for first item */}
              {isFirst && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-ack-blue flex items-center gap-2">
                    <span className="text-base">🔥</span>
                    HIGHEST PRIORITY
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {insights.length > 3 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            +{insights.length - 3} more insight{insights.length - 3 > 1 ? 's' : ''} available in the full data
          </p>
        </div>
      )}
    </div>
  );
}
