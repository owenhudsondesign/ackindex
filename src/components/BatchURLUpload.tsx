'use client';

import { useState } from 'react';
import Button from './Button';
import Textarea from './Textarea';
import Toast from './Toast';

interface BatchUploadResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function BatchURLUpload() {
  const [urls, setUrls] = useState('');
  const [frequency, setFrequency] = useState('1 week');
  const [priority, setPriority] = useState('5');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BatchUploadResult | null>(null);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      // Parse URLs from textarea (one per line)
      const urlList = urls
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      if (urlList.length === 0) {
        showToast('Please enter at least one URL', 'error');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/admin/batch-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urlList,
          frequency,
          priority: parseInt(priority),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload URLs');
      }

      setResult(data);

      // Show success message
      if (data.success > 0) {
        showToast(
          `Successfully scheduled ${data.success} URL${data.success !== 1 ? 's' : ''} for scraping!`,
          'success'
        );
        // Clear form on complete success
        if (data.failed === 0) {
          setUrls('');
        }
      }

      if (data.failed > 0) {
        showToast(
          `Failed to schedule ${data.failed} URL${data.failed !== 1 ? 's' : ''}. See details below.`,
          'error'
        );
      }
    } catch (error) {
      console.error('Batch upload error:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to upload URLs',
        'error'
      );
      setResult({
        success: 0,
        failed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-lg bg-ack-blue/10 flex items-center justify-center mr-3">
            <svg
              className="w-5 h-5 text-ack-blue"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ack-black">Batch URL Upload</h3>
            <p className="text-sm text-ack-dark-gray">
              Schedule multiple URLs for periodic scraping
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="urls" className="block text-sm font-medium text-ack-black mb-2">
              URLs (one per line)
            </label>
            <Textarea
              id="urls"
              placeholder="https://nantucketma.portal.civicclerk.com/&#10;https://www.nantucket-ma.gov/AgendaCenter&#10;https://www.nantucket-ma.gov/DocumentCenter"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="mt-1 text-xs text-ack-dark-gray">
              Paste URLs, one per line. Invalid URLs will be skipped.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="frequency" className="block text-sm font-medium text-ack-black mb-2">
                Scrape Frequency
              </label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ack-blue focus:border-transparent"
              >
                <option value="1 day">Daily</option>
                <option value="3 days">Every 3 Days</option>
                <option value="1 week">Weekly</option>
                <option value="2 weeks">Bi-Weekly</option>
                <option value="1 month">Monthly</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-ack-black mb-2">
                Priority (1-10)
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ack-blue focus:border-transparent"
              >
                <option value="1">1 - Lowest</option>
                <option value="3">3 - Low</option>
                <option value="5">5 - Normal</option>
                <option value="7">7 - High</option>
                <option value="10">10 - Critical</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !urls.trim()}
            className="w-full"
          >
            {isLoading ? 'Uploading URLs...' : 'Schedule URLs for Scraping'}
          </Button>
        </form>

        {result && result.failed > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Failed to schedule {result.failed} URL{result.failed !== 1 ? 's' : ''}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    {result.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast.show && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}
