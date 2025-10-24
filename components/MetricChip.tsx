'use client';

import { motion } from 'framer-motion';
import { KeyMetric } from '@/types';

interface MetricChipProps {
  metric: KeyMetric;
  index: number;
}

export default function MetricChip({ metric, index }: MetricChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-gradient-to-br from-ack-blue/10 to-ack-sand/10 rounded-xl px-4 py-3 border border-ack-blue/20 hover:border-ack-blue/40 transition-all duration-200"
    >
      <p className="text-xs text-ack-gray font-medium mb-1">{metric.label}</p>
      <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
    </motion.div>
  );
}
