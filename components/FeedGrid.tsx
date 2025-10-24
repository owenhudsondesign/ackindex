'use client';

import { CivicEntry } from '@/types';
import EntryCard from './EntryCard';

interface FeedGridProps {
  entries: CivicEntry[];
  isLoading: boolean;
  isError?: boolean;
}

export default function FeedGrid({ entries, isLoading, isError }: FeedGridProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        {/* Better loading animation */}
        <div className="relative mb-6">
          <div className="w-20 h-20 border-4 border-ack-blue/20 border-t-ack-blue rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🏛️</span>
          </div>
        </div>
        <p className="text-gray-600 font-medium text-lg">Loading civic data...</p>
        <p className="text-gray-500 text-sm mt-2">Analyzing documents and generating insights</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error loading updates</h3>
          <p className="text-gray-600 mb-4">There was a problem fetching the civic updates.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-ack-blue text-white rounded-lg hover:bg-ack-blue/80 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No updates yet</h3>
          <p className="text-gray-600">Check back soon for civic updates from Nantucket.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8">
      {entries.map((entry, index) => (
        <EntryCard key={entry.id} entry={entry} index={index} />
      ))}
    </div>
  );
}
