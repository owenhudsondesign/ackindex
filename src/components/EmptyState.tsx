export default function EmptyState() {
  const exampleQueries = [
    "What are the latest Town Meeting articles?",
    "Tell me about recent zoning changes",
    "What permits were approved last month?",
    "Explain the waterfront development proposal"
  ];

  return (
    <div className="mt-12 text-center">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-16 h-16 bg-ack-blue/10 rounded-full mb-6">
        <svg className="w-8 h-8 text-ack-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>

      {/* Heading */}
      <h3 className="text-xl font-semibold text-ack-black mb-3">
        Ask anything about Nantucket civic data
      </h3>
      <p className="text-ack-dark-gray mb-8 max-w-md mx-auto">
        Search through town meeting minutes, planning board documents, and public records to get the information you need.
      </p>

      {/* Example Queries */}
      <div className="max-w-2xl mx-auto">
        <p className="text-sm font-medium text-ack-dark-gray mb-4">Try asking:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exampleQueries.map((query, index) => (
            <button
              key={index}
              className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-ack-blue hover:bg-ack-blue/5 transition-all group"
              onClick={() => {
                // This will be handled by parent component
                const input = document.querySelector('input[aria-label="Ask a question"]') as HTMLInputElement;
                if (input) {
                  input.value = query;
                  input.focus();
                }
              }}
            >
              <div className="flex items-start space-x-2">
                <svg 
                  className="w-4 h-4 text-ack-dark-gray group-hover:text-ack-blue transition-colors mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="text-sm text-ack-dark-gray group-hover:text-ack-black transition-colors">
                  {query}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-10 inline-flex items-start space-x-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 max-w-md">
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div className="text-left">
          <p className="text-sm font-medium text-blue-900 mb-1">How it works</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            AckIndex searches official documents and provides answers with source citations. 
            If we don't have enough information, we'll let you know.
          </p>
        </div>
      </div>
    </div>
  );
}
