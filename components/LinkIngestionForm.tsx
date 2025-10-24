'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Category } from '@/types';

interface LinkIngestionFormProps {
  onIngestionSuccess?: () => void;
}

interface ParseResult {
  title: string;
  url: string;
  status: 'success' | 'error' | 'duplicate';
  message?: string;
}

export default function LinkIngestionForm({ onIngestionSuccess }: LinkIngestionFormProps) {
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<Category>('General');
  const [source, setSource] = useState('Town of Nantucket');
  const [parseHTML, setParseHTML] = useState(true);
  const [recursive, setRecursive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<ParseResult[] | null>(null);
  const [error, setError] = useState('');

  const categories: Category[] = [
    'Budget',
    'Real Estate',
    'Town Meeting',
    'Infrastructure',
    'General',
  ];

  const exampleUrls = [
    'https://nantucket-ma.gov/AgendaCenter/ViewNotice/14895',
    'https://nantucket-ma.gov/Archive.aspx?ADID=1234',
    'https://nantucket-ma.gov/1234/Budget-Documents',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResults(null);
    setIsProcessing(true);
    setProgress('Starting crawl...');

    try {
      // Validate URL
      new URL(url);

      setProgress('Fetching page and searching for PDFs...');

      const response = await fetch('/api/parse-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          category,
          source,
          parseHTML,
          recursive,
          maxPages: recursive ? 50 : 1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process link');
      }

      const data = await response.json();

      setResults(data.results || []);
      setProgress(`Complete! ${data.successCount} new documents added, ${data.duplicateCount} duplicates skipped, ${data.errorCount} errors.`);

      if (data.successCount > 0 && onIngestionSuccess) {
        onIngestionSuccess();
      }

      // Reset form on success
      if (data.successCount > 0) {
        setUrl('');
      }

    } catch (err: any) {
      console.error('Link ingestion error:', err);
      setError(err.message || 'Failed to process link');
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🔗 Link-Based Ingestion</h2>
        <p className="text-gray-600 text-sm">
          Paste a URL to automatically discover and parse PDFs from any Nantucket government webpage
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL Input */}
        <div>
          <label htmlFor="url" className="block text-sm font-semibold text-gray-700 mb-2">
            Page URL *
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ack-blue focus:border-transparent"
            placeholder="https://nantucket-ma.gov/..."
            required
            disabled={isProcessing}
          />
          <div className="mt-2">
            <p className="text-xs text-gray-600 mb-1">Try these examples:</p>
            {exampleUrls.map((exampleUrl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setUrl(exampleUrl)}
                className="text-xs text-ack-blue hover:text-ack-blue/80 mr-3 hover:underline"
                disabled={isProcessing}
              >
                {exampleUrl.split('/').slice(-1)[0] || 'Document Center'}
              </button>
            ))}
          </div>
        </div>

        {/* Category Select */}
        <div>
          <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
            Category *
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ack-blue focus:border-transparent"
            required
            disabled={isProcessing}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Source Input */}
        <div>
          <label htmlFor="source" className="block text-sm font-semibold text-gray-700 mb-2">
            Source *
          </label>
          <input
            type="text"
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ack-blue focus:border-transparent"
            placeholder="e.g., Town Finance Department"
            required
            disabled={isProcessing}
          />
        </div>

        {/* Advanced Options */}
        <div className="border border-gray-300 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Advanced Options</h3>

          <div className="space-y-3">
            {/* Parse HTML Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="parseHTML" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Parse HTML Pages
                </label>
                <p className="text-xs text-gray-600 mt-0.5">
                  Extract and analyze content from HTML pages, not just PDFs
                </p>
              </div>
              <button
                type="button"
                id="parseHTML"
                onClick={() => setParseHTML(!parseHTML)}
                disabled={isProcessing}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ack-blue focus:ring-offset-2 disabled:opacity-50 ${
                  parseHTML ? 'bg-ack-blue' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    parseHTML ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Recursive Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="recursive" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Recursive Crawling
                </label>
                <p className="text-xs text-gray-600 mt-0.5">
                  Follow internal links to discover more pages (max 50 pages)
                </p>
              </div>
              <button
                type="button"
                id="recursive"
                onClick={() => setRecursive(!recursive)}
                disabled={isProcessing}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ack-blue focus:ring-offset-2 disabled:opacity-50 ${
                  recursive ? 'bg-ack-blue' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    recursive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {recursive && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-800">
                ⚠️ Recursive crawling can process many pages and take several minutes. Use for comprehensive document collection.
              </p>
            </div>
          )}
        </div>

        {/* Progress Message */}
        {progress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-4 rounded-xl border ${
              isProcessing
                ? 'bg-blue-50 border-blue-200'
                : results && results.some(r => r.status === 'success')
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {isProcessing && (
                <div className="w-5 h-5 border-2 border-ack-blue border-t-transparent rounded-full animate-spin"></div>
              )}
              <p className={`text-sm font-medium ${
                isProcessing
                  ? 'text-blue-800'
                  : results && results.some(r => r.status === 'success')
                  ? 'text-green-800'
                  : 'text-yellow-800'
              }`}>
                {progress}
              </p>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-red-50 border border-red-200"
          >
            <p className="text-sm font-medium text-red-800">{error}</p>
          </motion.div>
        )}

        {/* Results List */}
        {results && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-gray-200 rounded-xl p-4 max-h-64 overflow-y-auto"
          >
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Processing Results:</h3>
            <div className="space-y-2">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg text-sm ${
                    result.status === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : result.status === 'duplicate'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">
                      {result.status === 'success' ? '✅' : result.status === 'duplicate' ? '⚠️' : '❌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{result.title}</p>
                      {result.message && (
                        <p className="text-xs text-gray-600 mt-1">{result.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing || !url}
          className="w-full py-3 px-6 rounded-xl font-semibold text-white bg-ack-blue hover:bg-ack-blue/90 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200"
        >
          {isProcessing ? 'Processing...' : 'Start Crawl & Parse'}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">🚀 Powerful Capabilities:</h4>
        <ul className="text-xs text-blue-800 space-y-1 mb-3">
          <li>• 📄 <strong>PDF Extraction:</strong> Finds and processes all PDF links on the page</li>
          <li>• 🌐 <strong>HTML Parsing:</strong> Extracts content directly from web pages (not just PDFs!)</li>
          <li>• 🔗 <strong>Recursive Crawling:</strong> Follows internal links to discover more content</li>
          <li>• 🤖 <strong>AI Analysis:</strong> Automatically summarizes and extracts key insights</li>
          <li>• ♻️ <strong>Smart Deduplication:</strong> Skips documents already in database</li>
        </ul>
        <div className="mt-3 pt-3 border-t border-blue-300">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">💡 Usage Tips:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• <strong>Single Page:</strong> Turn off recursive for one specific page</li>
            <li>• <strong>Entire Section:</strong> Turn on recursive to crawl entire doc section</li>
            <li>• <strong>HTML + PDFs:</strong> Parse HTML is on by default - gets everything!</li>
            <li>• <strong>PDFs Only:</strong> Turn off Parse HTML for just PDF documents</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
