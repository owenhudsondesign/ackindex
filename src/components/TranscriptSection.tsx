'use client';

import { useState, useEffect } from 'react';
import Card from './Card';
import Loading from './Loading';

interface TranscriptChunk {
  chunk_index: number;
  content: string;
  start_time: number | null;
  end_time: number | null;
  speakers: string[] | null;
}

interface TranscriptSectionProps {
  documentId: string;
  sourceUrl?: string;
}

export default function TranscriptSection({ documentId, sourceUrl }: TranscriptSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TranscriptChunk[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [fullTranscript, setFullTranscript] = useState<string | null>(null);
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadTranscript = async () => {
    if (fullTranscript) return; // Already loaded

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/transcripts/${documentId}?timestamps=true`);

      if (!response.ok) {
        throw new Error('Failed to load transcript');
      }

      const data = await response.json();
      setFullTranscript(data.transcript.fullText);
      setChunks(data.chunks || []);
    } catch (err) {
      console.error('Error loading transcript:', err);
      setError('Failed to load transcript');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isExpanded && !fullTranscript) {
      loadTranscript();
    }
    setIsExpanded(!isExpanded);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/transcripts/${documentId}?search=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Error searching transcript:', err);
      setError('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const formatTimestamp = (seconds: number | null): string => {
    if (seconds === null) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getYouTubeTimestampUrl = (seconds: number | null): string | null => {
    if (!sourceUrl || seconds === null) return null;

    try {
      const url = new URL(sourceUrl);
      if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
        return `${sourceUrl}&t=${Math.floor(seconds)}s`;
      }
    } catch (e) {
      // Invalid URL
    }
    return null;
  };

  const handleDownload = async (format: 'text' | 'srt' | 'vtt') => {
    try {
      const response = await fetch(`/api/transcripts/${documentId}?format=${format}`);

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${documentId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading transcript:', err);
      alert('Failed to download transcript');
    }
  };

  return (
    <div className="mt-12">
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Full Meeting Transcript
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Search for specific quotes, review the complete discussion, and export for your records
              </p>
            </div>
            <button
              onClick={handleToggle}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {isExpanded ? 'Hide' : 'View'} Transcript
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Source Video Link */}
          {sourceUrl && (
            <div className="mt-4">
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Watch on YouTube
              </a>
            </div>
          )}
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loading />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                <button
                  onClick={loadTranscript}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : fullTranscript ? (
              <>
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="flex gap-2">
                    <div className="flex-grow relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search within this transcript..."
                        className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <svg
                        className="absolute left-3 top-3 w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery.trim()}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSearching ? 'Searching...' : 'Search'}
                    </button>
                  </div>

                  {searchResults.length > 0 && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                    </p>
                  )}
                </div>

                {/* Download Options */}
                <div className="mb-6 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDownload('text')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download TXT
                  </button>
                  <button
                    onClick={() => handleDownload('srt')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download SRT
                  </button>
                  <button
                    onClick={() => handleDownload('vtt')}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download VTT
                  </button>
                </div>

                {/* Display Search Results or Full Transcript */}
                {searchResults.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Search Results</h4>
                      <button
                        onClick={() => {
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                      >
                        Clear search
                      </button>
                    </div>
                    {searchResults.map((chunk) => (
                      <div
                        key={chunk.chunk_index}
                        className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                      >
                        {chunk.start_time !== null && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {formatTimestamp(chunk.start_time)}
                            </span>
                            {getYouTubeTimestampUrl(chunk.start_time) && (
                              <a
                                href={getYouTubeTimestampUrl(chunk.start_time)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Jump to video
                              </a>
                            )}
                          </div>
                        )}
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{chunk.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {chunks.length > 0 ? (
                      <div className="space-y-4">
                        {chunks.filter(c => c.chunk_type !== 'summary').map((chunk) => (
                          <div key={chunk.chunk_index} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4">
                            {chunk.start_time !== null && (
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                  {formatTimestamp(chunk.start_time)}
                                </span>
                                {getYouTubeTimestampUrl(chunk.start_time) && (
                                  <a
                                    href={getYouTubeTimestampUrl(chunk.start_time)!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    Jump to video
                                  </a>
                                )}
                              </div>
                            )}
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{chunk.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{fullTranscript}</p>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
