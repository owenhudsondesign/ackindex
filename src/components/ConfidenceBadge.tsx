'use client';

import React from 'react';

interface ConfidenceBadgeProps {
  confidence: 'high' | 'medium' | 'low';
  avgSimilarity?: number;
  warnings?: string[];
}

export default function ConfidenceBadge({
  confidence,
  avgSimilarity,
  warnings = []
}: ConfidenceBadgeProps) {
  const getBadgeStyle = () => {
    switch (confidence) {
      case 'high':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          border: 'border-green-300',
          icon: '✓',
          label: 'High Confidence',
          description: 'Answer is strongly supported by sources',
        };
      case 'medium':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          border: 'border-yellow-300',
          icon: '!',
          label: 'Medium Confidence',
          description: 'Answer is supported with some limitations',
        };
      case 'low':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          border: 'border-red-300',
          icon: '⚠',
          label: 'Low Confidence',
          description: 'Limited source support - verify independently',
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${style.bg} ${style.text} ${style.border}`}>
      <span className="font-bold text-sm">{style.icon}</span>
      <div className="flex flex-col">
        <span className="text-xs font-semibold">{style.label}</span>
        {avgSimilarity && (
          <span className="text-xs opacity-75">
            {avgSimilarity}% source match
          </span>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="ml-2 text-xs">
          <details className="cursor-pointer">
            <summary className="font-medium">
              {warnings.length} warning{warnings.length > 1 ? 's' : ''}
            </summary>
            <ul className="mt-1 space-y-1 pl-4 list-disc">
              {warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
