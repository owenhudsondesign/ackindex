'use client';

import { useEffect, useState } from 'react';
import Badge from './Badge';
import Loading from './Loading';

interface Document {
  id: string;
  source_type: 'url' | 'pdf';
  source_url?: string;
  filename?: string;
  title?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  total_chunks: number;
  created_at: string;
}

export default function ActivityFeed() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
    // Refresh every 10 seconds
    const interval = setInterval(loadDocuments, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadDocuments() {
    try {
      const response = await fetch('/api/admin/documents');
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }
      const data = await response.json();
      setDocuments(data.documents || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Failed to load activity');
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusBadge = (status: Document['status']) => {
    const variants: Record<Document['status'], any> = {
      pending: { variant: 'secondary', text: 'Pending' },
      processing: { variant: 'primary', text: 'Processing...' },
      completed: { variant: 'success', text: 'Completed' },
      failed: { variant: 'error', text: 'Failed' },
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getIcon = (sourceType: 'url' | 'pdf') => {
    if (sourceType === 'pdf') {
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }

    return (
      <svg
        className="w-5 h-5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h3>
        <div className="flex justify-center py-8">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
        <button
          onClick={loadDocuments}
          className="text-sm text-ack-blue dark:text-blue-400 hover:text-ack-blue/80 dark:hover:text-blue-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            No documents uploaded yet. Upload a URL or PDF to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors bg-gray-50/50 dark:bg-gray-700/30"
            >
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${doc.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : ''}
                ${doc.status === 'processing' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}
                ${doc.status === 'pending' ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' : ''}
                ${doc.status === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : ''}
              `}>
                {getIcon(doc.source_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {doc.title || doc.filename || doc.source_url}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {doc.source_type === 'url' ? doc.source_url : doc.filename}
                    </p>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>

                {doc.status === 'completed' && doc.total_chunks > 0 && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {doc.total_chunks} chunks indexed
                  </p>
                )}

                {doc.status === 'failed' && doc.error_message && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Error: {doc.error_message}
                  </p>
                )}

                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {formatDate(doc.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
