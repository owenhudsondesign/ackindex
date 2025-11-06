interface EmptyStateProps {
  onQuestionClick?: (question: string) => void;
}

export default function EmptyState({ onQuestionClick }: EmptyStateProps) {
  const exampleQueries = [
    "What are the latest Town Meeting articles?",
    "Tell me about recent zoning changes",
    "What permits were approved last month?",
    "Explain the waterfront development proposal"
  ];

  return (
    <div className="mt-12 text-center">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-16 h-16 bg-ack-blue/10 dark:bg-ack-blue/20 rounded-full mb-6">
        <svg className="w-8 h-8 text-ack-blue dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>

      {/* Heading */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Ask anything about Nantucket civic data
      </h3>
      <p className="text-gray-700 dark:text-gray-300 mb-8 max-w-md mx-auto">
        Search through town meeting minutes, planning board documents, and public records to get the information you need.
      </p>

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
            AckIndex searches official documents and provides answers with source citations. 
            If we don't have enough information, we'll let you know.
          </p>
        </div>
      </div>
    </div>
  );
}
