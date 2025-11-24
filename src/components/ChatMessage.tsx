'use client';
import React from 'react';
import { Citation } from '@/lib/types';
import { useState } from 'react';
import ConfidenceBadge from './ConfidenceBadge';
import FlagResponseButton from './FlagResponseButton';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isLoading?: boolean;
  verification?: {
    confidence: 'high' | 'medium' | 'low';
    isValid: boolean;
    warnings: string[];
    details: any;
  };
  stats?: {
    avgSimilarity: number;
  };
  queryText?: string; // Original user query for flagging
}

// Helper function to render content with inline citation links
function renderContentWithCitations(content: string, citations?: Citation[]) {
  if (!citations || citations.length === 0) {
    return <span>{content}</span>;
  }

  // Find all citation markers like [1], [2], etc.
  const citationRegex = /\[(\d+)\]/g;
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(content)) !== null) {
    const citationNumber = parseInt(match[1], 10);
    const citation = citations.find(c => (c.index ?? citations.indexOf(c) + 1) === citationNumber);

    // Add text before the citation
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }

    // Add citation as clickable superscript link
    if (citation && citation.url) {
      parts.push(
        <a
          key={`citation-${citationNumber}-${match.index}`}
          href={citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-baseline text-ack-blue dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 no-underline hover:underline font-semibold"
          title={citation.title}
        >
          <sup className="text-xs">[{citationNumber}]</sup>
        </a>
      );
    } else {
      // Fallback if no URL
      parts.push(
        <sup key={`citation-${citationNumber}-${match.index}`} className="text-xs text-ack-blue dark:text-blue-400">
          [{citationNumber}]
        </sup>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return <>{parts}</>;
}

export default function ChatMessage({
  role,
  content,
  citations,
  isLoading,
  verification,
  stats,
  queryText
}: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false);

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
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          {isLoading ? (
            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-ack-blue dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-ack-blue dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-ack-blue dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm">Searching documents...</span>
            </div>
          ) : (
            <div className="text-sm md:text-base text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
              {renderContentWithCitations(content, citations)}
            </div>
          )}
        </div>

        {/* Confidence Badge & Actions */}
        {!isLoading && verification && (
          <div className="mt-3 ml-1 flex items-center gap-3 flex-wrap">
            <ConfidenceBadge
              confidence={verification.confidence}
              avgSimilarity={stats?.avgSimilarity}
              warnings={verification.warnings}
            />
            {queryText && (
              <FlagResponseButton
                queryText={queryText}
                responseText={content}
                citations={citations || []}
                verificationResult={verification}
                similarityScores={stats}
              />
            )}
          </div>
        )}

        {/* Citations - Collapsible */}
        {citations && citations.length > 0 && !isLoading && (
          <div className="mt-3 ml-1">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-ack-blue dark:hover:text-blue-400 transition-colors uppercase tracking-wide"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showSources ? 'rotate-90' : ''}`}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
              <span>Sources ({citations.length})</span>
            </button>

            {showSources && (
              <div className="space-y-2 mt-3">
                {citations.map((citation, idx) => (
                <div
                  key={idx}
                  className="group bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg px-3 py-3 border border-gray-200 dark:border-gray-600 hover:border-ack-blue dark:hover:border-blue-400 transition-all"
                >
                  <div className="flex items-start space-x-3">
                    {/* Index Badge */}
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-ack-blue to-blue-600 dark:from-blue-500 dark:to-blue-700 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                      {citation.index ?? idx + 1}
                    </div>

                    <div className="flex-grow min-w-0">
                      {/* Header Row */}
                      <div className="flex items-center gap-2 mb-1.5">
                        {/* Document Type Icon */}
                        {citation.source === 'pdf' ? (
                          <svg className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                          </svg>
                        )}

                        {/* Title */}
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {citation.title}
                        </p>

                        {/* Type Badge */}
                        {citation.source && (
                          <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                            citation.source === 'pdf'
                              ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30'
                              : 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30'
                          }`}>
                            {citation.source.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Snippet */}
                      {citation.snippet && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2 line-clamp-2">
                          "{citation.snippet}..."
                        </p>
                      )}

                      {/* Footer Row */}
                      <div className="flex items-center gap-3 text-xs">
                        {/* Relevance Score */}
                        {citation.similarity !== undefined && (
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {citation.similarity}% match
                            </span>
                          </div>
                        )}

                        {/* View Source Link */}
                        {citation.url && (
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-ack-blue dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
                          >
                            <span>View source</span>
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
