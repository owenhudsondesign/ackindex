interface NoResultsProps {
  query?: string;
}

export default function NoResults({ query }: NoResultsProps) {
  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-ack-black mb-2">
        Not enough information
      </h3>
      <p className="text-ack-dark-gray mb-6 max-w-md mx-auto">
        {query 
          ? `I couldn't find enough information in our indexed documents to answer "${query}".`
          : "I don't have enough information to answer that question."
        }
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
        <p className="text-sm text-blue-900 font-medium mb-2">Try these tips:</p>
        <ul className="text-xs text-blue-700 text-left space-y-1">
          <li>• Rephrase your question with different keywords</li>
          <li>• Ask about recent Town Meeting articles or zoning changes</li>
          <li>• Check if the information is available on the town website</li>
          <li>• Contact the relevant town department directly</li>
        </ul>
      </div>
    </div>
  );
}
