'use client';

import { motion } from 'framer-motion';
import { Comparison } from '@/types';

interface ComparisonCardProps {
  comparison: Comparison;
  index?: number;
}

export default function ComparisonCard({ comparison, index = 0 }: ComparisonCardProps) {
  const isAWinner = comparison.winner.toLowerCase().includes(comparison.category_a.toLowerCase());

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <h4 className="font-semibold text-gray-900 mb-4 text-center">{comparison.title}</h4>

      <div className="flex items-center justify-between gap-4">
        {/* Category A */}
        <div className={`flex-1 p-4 rounded-lg border-2 transition-all ${
          isAWinner
            ? 'border-ack-blue bg-ack-blue/5 shadow-sm'
            : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="text-sm text-gray-600 mb-1 font-medium">{comparison.category_a}</div>
          <div className="text-2xl font-bold text-gray-900">{comparison.value_a}</div>
          {isAWinner && (
            <div className="text-xs text-ack-blue mt-2 font-semibold flex items-center gap-1">
              <span className="text-base">↑</span> Winner
            </div>
          )}
        </div>

        {/* VS */}
        <div className="flex flex-col items-center">
          <div className="text-gray-400 font-bold text-sm">VS</div>
        </div>

        {/* Category B */}
        <div className={`flex-1 p-4 rounded-lg border-2 transition-all ${
          !isAWinner
            ? 'border-ack-blue bg-ack-blue/5 shadow-sm'
            : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="text-sm text-gray-600 mb-1 font-medium">{comparison.category_b}</div>
          <div className="text-2xl font-bold text-gray-900">{comparison.value_b}</div>
          {!isAWinner && (
            <div className="text-xs text-ack-blue mt-2 font-semibold flex items-center gap-1">
              <span className="text-base">↑</span> Winner
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-700 bg-gradient-to-r from-blue-50 to-sand-50 p-3 rounded-lg border border-blue-100">
        <strong className="text-ack-blue">📊 Insight:</strong> {comparison.winner}
      </div>
    </motion.div>
  );
}
