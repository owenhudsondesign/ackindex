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
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-ack-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading civic updates...</p>
        </div>
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
