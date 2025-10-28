'use client';

import { useState, useEffect } from 'react';
import Button from './Button';
import Loading from './Loading';

export default function EmbeddingsManager() {
  const [stats, setStats] = useState<{
    total: number;
    withEmbeddings: number;
    withoutEmbeddings: number;
    percentage: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const response = await fetch('/api/admin/generate-embeddings');
      if (!response.ok) throw new Error('Failed to load stats');
      
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load embedding stats:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateEmbeddings() {
    setIsGenerating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/generate-embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 50 }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate embeddings');
      }

      const data = await response.json();
      
      setMessage({
        text: data.message || 'Embeddings generated successfully!',
        type: 'success',
      });

      // Reload stats
      await loadStats();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Failed to generate embeddings',
        type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-ack-black mb-4">Vector Embeddings</h3>
        <div className="flex justify-center py-4">
          <Loading />
        </div>
      </div>
    );
  }

  const needsEmbeddings = stats && stats.withoutEmbeddings > 0;
  const isComplete = stats && stats.percentage === 100;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-ack-black">Vector Embeddings</h3>
        {isComplete && (
          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
            ✓ Complete
          </span>
        )}
      </div>

      {message && (
        <div className={`
          mb-4 p-3 rounded-lg text-sm
          ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : ''}
          ${message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : ''}
          ${message.type === 'info' ? 'bg-blue-50 text-blue-800 border border-blue-200' : ''}
        `}>
          {message.text}
        </div>
      )}

      {stats && (
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-ack-dark-gray">Total Chunks:</span>
            <span className="font-medium text-ack-black">{stats.total}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ack-dark-gray">With Embeddings:</span>
            <span className="font-medium text-ack-black">{stats.withEmbeddings}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ack-dark-gray">Without Embeddings:</span>
            <span className="font-medium text-ack-black">{stats.withoutEmbeddings}</span>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-ack-dark-gray mb-1">
              <span>Progress</span>
              <span>{stats.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-ack-blue h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {needsEmbeddings ? (
        <div>
          <p className="text-sm text-ack-dark-gray mb-4">
            Generate embeddings to enable semantic search in the chatbot. This process uses OpenAI's API and may take a few minutes.
          </p>
          <Button
            onClick={generateEmbeddings}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating Embeddings...
              </span>
            ) : (
              `Generate Embeddings (${stats?.withoutEmbeddings || 0} chunks)`
            )}
          </Button>
        </div>
      ) : (
        <div className="text-center py-3">
          <svg
            className="w-12 h-12 text-green-500 mx-auto mb-2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-ack-dark-gray">
            All chunks have embeddings. The chatbot is ready!
          </p>
          <Button
            onClick={loadStats}
            variant="ghost"
            size="sm"
            className="mt-2"
          >
            Refresh Stats
          </Button>
        </div>
      )}
    </div>
  );
}
