'use client';

import { useEffect, useState } from 'react';
import Button from './Button';
import Card from './Card';
import Loading from './Loading';
import Toast from './Toast';

interface ScheduledScrape {
  id: string;
  url: string;
  title: string | null;
  scrape_frequency: string;
  last_scraped_at: string | null;
  next_scrape_at: string | null;
  status: 'active' | 'paused' | 'failed';
  priority: number;
  created_at: string;
  error_message: string | null;
  error_count: number;
}

export default function ScheduledScrapesManager() {
  const [scrapes, setScrapes] = useState<ScheduledScrape[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const fetchScrapes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/trigger-scrape?limit=50');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch scrapes');
      }

      setScrapes(data.scrapes || []);
    } catch (error) {
      console.error('Error fetching scrapes:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to fetch scrapes',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScrapes();
  }, []);

  const handleTriggerSelected = async () => {
    if (selectedIds.size === 0) {
      showToast('Please select at least one URL to scrape', 'error');
      return;
    }

    setIsTriggering(true);
    try {
      const response = await fetch('/api/admin/trigger-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scrapeIds: Array.from(selectedIds),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger scraping');
      }

      showToast(
        `Successfully triggered scraping for ${selectedIds.size} URL${selectedIds.size !== 1 ? 's' : ''}!`,
        'success'
      );

      // Clear selection and refresh
      setSelectedIds(new Set());
      setTimeout(() => fetchScrapes(), 1000);
    } catch (error) {
      console.error('Error triggering scrapes:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to trigger scraping',
        'error'
      );
    } finally {
      setIsTriggering(false);
    }
  };

  const handleTriggerAll = async () => {
    if (!confirm('This will immediately scrape all pending URLs. Continue?')) {
      return;
    }

    setIsTriggering(true);
    try {
      const response = await fetch('/api/admin/trigger-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerAll: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger scraping');
      }

      showToast('Successfully triggered scraping for all pending URLs!', 'success');

      // Refresh after a delay
      setTimeout(() => fetchScrapes(), 1000);
    } catch (error) {
      console.error('Error triggering scrapes:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to trigger scraping',
        'error'
      );
    } finally {
      setIsTriggering(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === scrapes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(scrapes.map((s) => s.id)));
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMs < 0) {
      return 'Ready now';
    } else if (diffMins < 60) {
      return `In ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingCount = scrapes.filter((s) => !s.last_scraped_at).length;

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
              <svg
                className="w-5 h-5 text-purple-600"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ack-black">Scheduled Scrapes</h3>
              <p className="text-sm text-ack-dark-gray">
                {scrapes.length} total • {pendingCount} pending
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => fetchScrapes()}
              disabled={isLoading}
              variant="secondary"
              size="sm"
            >
              Refresh
            </Button>
            {pendingCount > 0 && (
              <Button
                onClick={handleTriggerAll}
                disabled={isTriggering || isLoading}
                size="sm"
              >
                {isTriggering ? 'Triggering...' : `Scrape All Pending (${pendingCount})`}
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loading />
          </div>
        ) : scrapes.length === 0 ? (
          <div className="text-center py-12 text-ack-dark-gray">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No scheduled scrapes yet</p>
            <p className="text-sm mt-2">Use the Batch URL Upload tool above to schedule some.</p>
          </div>
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  {selectedIds.size} URL{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <Button
                  onClick={handleTriggerSelected}
                  disabled={isTriggering}
                  size="sm"
                >
                  {isTriggering ? 'Triggering...' : 'Scrape Selected Now'}
                </Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === scrapes.length && scrapes.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-ack-blue focus:ring-ack-blue"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Scraped
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Scrape
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scrapes.map((scrape) => (
                    <tr
                      key={scrape.id}
                      className={`hover:bg-gray-50 ${selectedIds.has(scrape.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(scrape.id)}
                          onChange={() => toggleSelection(scrape.id)}
                          className="rounded border-gray-300 text-ack-blue focus:ring-ack-blue"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {scrape.title || 'Untitled'}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{scrape.url}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(scrape.status)}`}
                        >
                          {scrape.status}
                        </span>
                        {scrape.error_count > 0 && (
                          <div className="text-xs text-red-600 mt-1">
                            {scrape.error_count} error{scrape.error_count !== 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {scrape.priority}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {scrape.scrape_frequency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {scrape.last_scraped_at
                          ? new Date(scrape.last_scraped_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {formatDate(scrape.next_scrape_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
    </>
  );
}

