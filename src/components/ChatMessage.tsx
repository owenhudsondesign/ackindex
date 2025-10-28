'use client';

interface Citation {
  index: number;
  title: string;
  source: string;
  url?: string;
  similarity: number;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isLoading?: boolean;
}

export default function ChatMessage({ role, content, citations, isLoading }: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-ack-blue text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] shadow-sm">
          <p className="text-sm md:text-base">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[85%]">
        {/* Assistant Message */}
        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          {isLoading ? (
            <div className="flex items-center space-x-2 text-ack-dark-gray">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-ack-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-ack-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-ack-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm">Searching documents...</span>
            </div>
          ) : (
            <p className="text-sm md:text-base text-ack-black leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          )}
        </div>

        {/* Citations */}
        {citations && citations.length > 0 && !isLoading && (
          <div className="mt-3 ml-1">
            <p className="text-xs font-medium text-ack-dark-gray mb-2">Sources:</p>
            <div className="space-y-2">
              {citations.map((citation) => (
                <div
                  key={citation.index}
                  className="block bg-ack-light-gray rounded-lg px-3 py-2"
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-5 h-5 bg-ack-blue text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                      {citation.index}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ack-black truncate">
                          {citation.title}
                        </p>
                        <span className="flex-shrink-0 text-xs text-ack-dark-gray bg-gray-200 px-2 py-0.5 rounded-full">
                          {citation.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-ack-dark-gray">
                          Relevance: {citation.similarity}%
                        </span>
                        {citation.url && (
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-ack-blue hover:underline inline-flex items-center gap-1"
                          >
                            View source
                            <svg 
                              className="w-3 h-3"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
