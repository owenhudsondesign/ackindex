'use client';

import { useState, useEffect } from 'react';

interface EmptyStateProps {
  onQuestionClick?: (question: string) => void;
}

// Default questions as fallback
const defaultQueries = [
  "What decisions were made at the last Select Board meeting?",
  "Show me recent Planning Board discussions about zoning",
  "What are the latest updates on town budget?",
  "How do recent board decisions affect residents?"
];

export default function EmptyState({ onQuestionClick }: EmptyStateProps) {
  const [exampleQueries, setExampleQueries] = useState<string[]>(defaultQueries);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch dynamic suggested questions based on recent content
    async function fetchSuggestedQuestions() {
      try {
        const response = await fetch('/api/suggested-questions');
        if (response.ok) {
          const data = await response.json();
          if (data.questions && data.questions.length > 0) {
            setExampleQueries(data.questions);
          }
        }
      } catch (error) {
        // Silently fail - use default questions
        console.debug('Failed to fetch suggested questions, using defaults');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSuggestedQuestions();
  }, []);

  return (
    <div className="mt-8 text-center">
      {/* Example Queries */}
      <div className="max-w-2xl mx-auto">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Try asking:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exampleQueries.map((query, index) => (
            <button
              key={index}
              className="text-left px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-ack-blue dark:hover:border-blue-400 hover:bg-ack-blue/5 dark:hover:bg-blue-900/30 transition-all group"
              onClick={() => onQuestionClick?.(query)}
            >
              <div className="flex items-start space-x-2">
                <svg
                  className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-ack-blue dark:group-hover:text-blue-400 transition-colors mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                  {query}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-10 inline-flex items-start space-x-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 max-w-md">
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div className="text-left">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">How it works</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            AckIndex searches through town meeting recordings and provides answers with source citations.
            If we don't have enough information, we'll let you know.
          </p>
        </div>
      </div>
    </div>
  );
}
