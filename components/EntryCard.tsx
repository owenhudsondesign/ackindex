'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CivicEntry } from '@/types';
import MetricChip from './MetricChip';
import ChartBlock from './ChartBlock';

interface EntryCardProps {
  entry: CivicEntry;
  index: number;
}

export default function EntryCard({ entry, index }: EntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Budget: 'bg-blue-100 text-blue-800 border-blue-200',
      'Real Estate': 'bg-green-100 text-green-800 border-green-200',
      'Town Meeting': 'bg-purple-100 text-purple-800 border-purple-200',
      Infrastructure: 'bg-orange-100 text-orange-800 border-orange-200',
      General: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[category] || colors.General;
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
              {entry.title}
            </h2>
            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(
                  entry.category
                )}`}
              >
                {entry.category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                {entry.source}
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-4">
          <p className="text-gray-700 leading-relaxed">
            {isExpanded ? entry.summary : `${entry.summary.slice(0, 200)}...`}
          </p>
          {entry.summary.length > 200 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-ack-blue hover:text-ack-blue/80 text-sm font-medium mt-2 transition-colors"
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>

        {/* Key Metrics */}
        {entry.key_metrics && entry.key_metrics.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {entry.key_metrics.map((metric, idx) => (
                <MetricChip key={idx} metric={metric} index={idx} />
              ))}
            </div>
          </div>
        )}

        {/* Visualizations */}
        {entry.visualizations && entry.visualizations.length > 0 && (
          <div className="mb-6 space-y-4">
            {entry.visualizations.map((viz, idx) => (
              <ChartBlock key={idx} visualization={viz} />
            ))}
          </div>
        )}

        {/* Notable Updates */}
        {entry.notable_updates && entry.notable_updates.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notable Updates</h3>
            <ul className="space-y-2">
              {entry.notable_updates.map((update, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-ack-blue mr-2">•</span>
                  <span className="text-gray-700 text-sm">{update}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {entry.date_published && (
              <span className="mr-4">Published: {formatDate(entry.date_published)}</span>
            )}
            <span>Updated: {formatDate(entry.created_at)}</span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
