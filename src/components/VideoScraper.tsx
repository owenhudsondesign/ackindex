'use client';

import { useState } from 'react';
import Card from '@/components/Card';

interface VideoProcessingStatus {
  status: 'idle' | 'processing' | 'completed' | 'error';
  message?: string;
  documentId?: string;
  jobId?: string;
  videoId?: string;
}

export default function VideoScraper() {
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('en');
  const [enableCodeSwitching, setEnableCodeSwitching] = useState(false);
  const [status, setStatus] = useState<VideoProcessingStatus>({
    status: 'idle',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setStatus({
        status: 'error',
        message: 'Please enter a YouTube URL',
      });
      return;
    }

    setIsLoading(true);
    setStatus({ status: 'processing', message: 'Starting video processing...' });

    try {
      const response = await fetch('/api/admin/process-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          language,
          enableCodeSwitching,
          useQueue: true, // Always use queue for background processing
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process video');
      }

      setStatus({
        status: 'completed',
        message:
          'Video processing started! Check the Documents list below for progress.',
        jobId: data.jobId,
        videoId: data.videoId,
      });

      // Clear form
      setUrl('');
    } catch (error) {
      console.error('Video processing error:', error);
      setStatus({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to process video',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isYouTubeUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname.includes('youtube.com') ||
        urlObj.hostname.includes('youtu.be')
      );
    } catch {
      return false;
    }
  };

  const urlIsValid = url.trim() === '' || isYouTubeUrl(url);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              YouTube Video Transcription
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Process YouTube videos with AI-powered transcription (Gladia)
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="video-url"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            YouTube URL
          </label>
          <input
            id="video-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 ${
              !urlIsValid
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {!urlIsValid && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              Please enter a valid YouTube URL
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
              disabled={isLoading}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ar">Arabic</option>
              <option value="">Auto-detect</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableCodeSwitching}
                onChange={(e) => setEnableCodeSwitching(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Enable code-switching (multi-language)
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !urlIsValid || !url.trim()}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
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
              Processing...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Process Video
            </>
          )}
        </button>
      </form>

      {/* Status messages */}
      {status.status !== 'idle' && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            status.status === 'error'
              ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
              : status.status === 'completed'
              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
              : 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
          }`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {status.status === 'error' && (
                <svg
                  className="h-5 w-5 text-red-400 dark:text-red-300"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {status.status === 'completed' && (
                <svg
                  className="h-5 w-5 text-green-400 dark:text-green-300"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {status.status === 'processing' && (
                <svg
                  className="animate-spin h-5 w-5 text-blue-400 dark:text-blue-300"
                  xmlns="http://www.w3.org/2000/svg"
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
              )}
            </div>
            <div className="ml-3">
              <p
                className={`text-sm ${
                  status.status === 'error'
                    ? 'text-red-800 dark:text-red-200'
                    : status.status === 'completed'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-blue-800 dark:text-blue-200'
                }`}
              >
                {status.message}
              </p>
              {status.jobId && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Job ID: {status.jobId}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info section */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          How it works
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">1.</span>
            <span>Enter a YouTube video URL (supports meetings, councils, hearings)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">2.</span>
            <span>Video is transcribed using Gladia AI transcription</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">3.</span>
            <span>Transcript is enriched with OpenAI (extract decisions, action items, topics)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">4.</span>
            <span>Content is chunked and embedded for semantic search</span>
          </li>
        </ul>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ⚠️ <strong>Note:</strong> Videos must be under 2 hours (120 minutes) due to Gladia API limits.
            Longer videos will be rejected. Contact support for enterprise limits if needed.
          </p>
        </div>
      </div>
    </Card>
  );
}
