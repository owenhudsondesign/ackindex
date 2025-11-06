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
  // Scraper configuration
  max_depth?: number;
  max_pages?: number;
  extract_pdfs?: boolean;
  scrape_javascript?: boolean;
  wait_for_dynamic_content?: boolean;
  timeout_seconds?: number;
  // Chunking configuration
  chunk_size?: number;
  chunk_overlap?: number;
}

export default function ScheduledScrapesManager() {
  const [scrapes, setScrapes] = useState<ScheduledScrape[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Form state for add/edit
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    scrape_frequency: '1 week',
    priority: 5,
    status: 'active' as 'active' | 'paused' | 'failed',
    // Scraper configuration with defaults
    max_depth: 2,
    max_pages: 20,
    extract_pdfs: true,
    scrape_javascript: false,
    wait_for_dynamic_content: false,
    timeout_seconds: 30,
    // Chunking configuration
    chunk_size: 500,
    chunk_overlap: 50,
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };

  const resetForm = () => {
    setFormData({
      url: '',
      title: '',
      scrape_frequency: '1 week',
      priority: 5,
      status: 'active',
      max_depth: 2,
      max_pages: 20,
      extract_pdfs: true,
      scrape_javascript: false,
      wait_for_dynamic_content: false,
      timeout_seconds: 30,
      chunk_size: 500,
      chunk_overlap: 50,
    });
    setEditingId(null);
    setShowAddForm(false);
    setShowAdvanced(false);
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

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.url.trim()) {
      showToast('URL is required', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/scheduled-scrapes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add URL');
      }

      showToast('URL added successfully!', 'success');
      resetForm();
      fetchScrapes();
    } catch (error) {
      console.error('Error adding URL:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to add URL',
        'error'
      );
    }
  };

  const handleEdit = (scrape: ScheduledScrape) => {
    setFormData({
      url: scrape.url,
      title: scrape.title || '',
      scrape_frequency: scrape.scrape_frequency,
      priority: scrape.priority,
      status: scrape.status,
      max_depth: scrape.max_depth ?? 2,
      max_pages: scrape.max_pages ?? 20,
      extract_pdfs: scrape.extract_pdfs ?? true,
      scrape_javascript: scrape.scrape_javascript ?? false,
      wait_for_dynamic_content: scrape.wait_for_dynamic_content ?? false,
      timeout_seconds: scrape.timeout_seconds ?? 30,
      chunk_size: scrape.chunk_size ?? 500,
      chunk_overlap: scrape.chunk_overlap ?? 50,
    });
    setEditingId(scrape.id);
    setShowAddForm(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) return;

    try {
      const response = await fetch('/api/admin/scheduled-scrapes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...formData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update URL');
      }

      showToast('URL updated successfully!', 'success');
      resetForm();
      fetchScrapes();
    } catch (error) {
      console.error('Error updating URL:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to update URL',
        'error'
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled scrape?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/scheduled-scrapes?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete URL');
      }

      showToast('URL deleted successfully!', 'success');
      fetchScrapes();
    } catch (error) {
      console.error('Error deleting URL:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to delete URL',
        'error'
      );
    }
  };

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
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'paused':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const pendingCount = scrapes.filter((s) => !s.last_scraped_at).length;

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
              <svg
                className="w-5 h-5 text-purple-600 dark:text-purple-400"
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Scheduled Scrapes</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {scrapes.length} total • {pendingCount} pending
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                resetForm();
                setShowAddForm(!showAddForm);
              }}
              variant="secondary"
              size="sm"
            >
              {showAddForm ? 'Cancel' : '+ Add URL'}
            </Button>
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

        {/* Add URL Form */}
        {showAddForm && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Add New URL</h4>
            <form onSubmit={handleAddUrl} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL *
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://example.com/meeting"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Optional title"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.scrape_frequency}
                    onChange={(e) => setFormData({ ...formData, scrape_frequency: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                  >
                    <option value="1 day">Daily</option>
                    <option value="1 week">Weekly</option>
                    <option value="2 weeks">Bi-weekly</option>
                    <option value="1 month">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>

              {/* Advanced Configuration Section */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                  Advanced Configuration
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3">
                    {/* Scraper Configuration */}
                    <div>
                      <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Scraper Settings</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Max Depth (1-10)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.max_depth}
                            onChange={(e) => setFormData({ ...formData, max_depth: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Max Pages (1-200)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={formData.max_pages}
                            onChange={(e) => setFormData({ ...formData, max_pages: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Timeout (10-120s)
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="120"
                            value={formData.timeout_seconds}
                            onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                        <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={formData.extract_pdfs}
                            onChange={(e) => setFormData({ ...formData, extract_pdfs: e.target.checked })}
                            className="rounded border-gray-300 dark:border-gray-600 text-ack-blue dark:text-blue-500 focus:ring-ack-blue dark:focus:ring-blue-500 mr-2"
                          />
                          Extract PDFs
                        </label>
                        <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={formData.scrape_javascript}
                            onChange={(e) => setFormData({ ...formData, scrape_javascript: e.target.checked })}
                            className="rounded border-gray-300 dark:border-gray-600 text-ack-blue dark:text-blue-500 focus:ring-ack-blue dark:focus:ring-blue-500 mr-2"
                          />
                          Execute JavaScript
                        </label>
                        <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={formData.wait_for_dynamic_content}
                            onChange={(e) => setFormData({ ...formData, wait_for_dynamic_content: e.target.checked })}
                            className="rounded border-gray-300 dark:border-gray-600 text-ack-blue dark:text-blue-500 focus:ring-ack-blue dark:focus:ring-blue-500 mr-2"
                          />
                          Wait for Dynamic Content
                        </label>
                      </div>
                    </div>

                    {/* Chunking Configuration */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Chunking Settings</h5>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, chunk_size: 300, chunk_overlap: 30 })}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            title="Best for dense technical docs, API references"
                          >
                            Small
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, chunk_size: 500, chunk_overlap: 50 })}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            title="Good for general content, meeting minutes (default)"
                          >
                            Default
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, chunk_size: 1200, chunk_overlap: 150 })}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            title="Best for long articles, research papers"
                          >
                            Large
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Chunk Size (tokens)
                            <span className="ml-1 text-gray-500 dark:text-gray-400" title="How many tokens per text chunk. ~4 characters = 1 token">ⓘ</span>
                          </label>
                          <input
                            type="number"
                            min="100"
                            max="2000"
                            value={formData.chunk_size}
                            onChange={(e) => setFormData({ ...formData, chunk_size: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                            placeholder="500"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {formData.chunk_size < 400 ? '📄 Small chunks - precise search' :
                             formData.chunk_size > 800 ? '📚 Large chunks - more context' :
                             '📃 Balanced - good for most content'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Chunk Overlap (tokens)
                            <span className="ml-1 text-gray-500 dark:text-gray-400" title="Tokens repeated between chunks to preserve context across boundaries">ⓘ</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="500"
                            value={formData.chunk_overlap}
                            onChange={(e) => setFormData({ ...formData, chunk_overlap: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                            placeholder="50"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {formData.chunk_overlap === 0 ? '⚠️ No overlap - may lose context' :
                             formData.chunk_overlap > 150 ? '🔗 High overlap - better continuity' :
                             '✓ Good balance'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Add URL
                </Button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loading />
          </div>
        ) : scrapes.length === 0 ? (
          <div className="text-center py-12 text-gray-700 dark:text-gray-300">
            <svg
              className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500"
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
            <p className="text-sm mt-2">Click &quot;Add URL&quot; above to schedule your first scrape.</p>
          </div>
        ) : (
          <>
            {selectedIds.size > 0 && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                <span className="text-sm text-blue-800 dark:text-blue-200">
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
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === scrapes.length && scrapes.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 dark:border-gray-600 text-ack-blue dark:text-blue-500 focus:ring-ack-blue dark:focus:ring-blue-500 bg-white dark:bg-gray-700"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last Scraped
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Next Scrape
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {scrapes.map((scrape) => (
                    editingId === scrape.id ? (
                      // Edit Row
                      <tr key={scrape.id} className="bg-blue-50 dark:bg-blue-900/30">
                        <td className="px-4 py-3" colSpan={8}>
                          <form onSubmit={handleUpdate} className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  URL
                                </label>
                                <input
                                  type="url"
                                  value={formData.url}
                                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Title
                                </label>
                                <input
                                  type="text"
                                  value={formData.title}
                                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Frequency
                                </label>
                                <select
                                  value={formData.scrape_frequency}
                                  onChange={(e) => setFormData({ ...formData, scrape_frequency: e.target.value })}
                                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                                >
                                  <option value="1 day">Daily</option>
                                  <option value="1 week">Weekly</option>
                                  <option value="2 weeks">Bi-weekly</option>
                                  <option value="1 month">Monthly</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Priority (1-10)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={formData.priority}
                                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Status
                                </label>
                                <select
                                  value={formData.status}
                                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                                >
                                  <option value="active">Active</option>
                                  <option value="paused">Paused</option>
                                  <option value="failed">Failed</option>
                                </select>
                              </div>
                            </div>

                            {/* Advanced Configuration Section - Edit Form */}
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                              <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path d="M9 5l7 7-7 7" />
                                </svg>
                                Advanced Configuration
                              </button>

                              {showAdvanced && (
                                <div className="mt-3 space-y-3">
                                  {/* Scraper Configuration */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Scraper Settings</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Max Depth (1-10)
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          max="10"
                                          value={formData.max_depth}
                                          onChange={(e) => setFormData({ ...formData, max_depth: parseInt(e.target.value) })}
                                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Max Pages (1-200)
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          max="200"
                                          value={formData.max_pages}
                                          onChange={(e) => setFormData({ ...formData, max_pages: parseInt(e.target.value) })}
                                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Timeout (10-120s)
                                        </label>
                                        <input
                                          type="number"
                                          min="10"
                                          max="120"
                                          value={formData.timeout_seconds}
                                          onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) })}
                                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                      <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                        <input
                                          type="checkbox"
                                          checked={formData.extract_pdfs}
                                          onChange={(e) => setFormData({ ...formData, extract_pdfs: e.target.checked })}
                                          className="rounded border-gray-300 dark:border-gray-600 text-ack-blue dark:text-blue-500 focus:ring-ack-blue dark:focus:ring-blue-500 mr-2"
                                        />
                                        Extract PDFs
                                      </label>
                                      <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                        <input
                                          type="checkbox"
                                          checked={formData.scrape_javascript}
                                          onChange={(e) => setFormData({ ...formData, scrape_javascript: e.target.checked })}
                                          className="rounded border-gray-300 dark:border-gray-600 text-ack-blue dark:text-blue-500 focus:ring-ack-blue dark:focus:ring-blue-500 mr-2"
                                        />
                                        Execute JavaScript
                                      </label>
                                      <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                        <input
                                          type="checkbox"
                                          checked={formData.wait_for_dynamic_content}
                                          onChange={(e) => setFormData({ ...formData, wait_for_dynamic_content: e.target.checked })}
                                          className="rounded border-gray-300 dark:border-gray-600 text-ack-blue dark:text-blue-500 focus:ring-ack-blue dark:focus:ring-blue-500 mr-2"
                                        />
                                        Wait for Dynamic Content
                                      </label>
                                    </div>
                                  </div>

                                  {/* Chunking Configuration */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Chunking Settings</h5>
                                      <div className="flex gap-1">
                                        <button
                                          type="button"
                                          onClick={() => setFormData({ ...formData, chunk_size: 300, chunk_overlap: 30 })}
                                          className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                          title="Best for dense technical docs, API references"
                                        >
                                          Small
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setFormData({ ...formData, chunk_size: 500, chunk_overlap: 50 })}
                                          className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                          title="Good for general content, meeting minutes (default)"
                                        >
                                          Default
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setFormData({ ...formData, chunk_size: 1200, chunk_overlap: 150 })}
                                          className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                                          title="Best for long articles, research papers"
                                        >
                                          Large
                                        </button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Chunk Size (tokens)
                                          <span className="ml-1 text-gray-500 dark:text-gray-400" title="How many tokens per text chunk. ~4 characters = 1 token">ⓘ</span>
                                        </label>
                                        <input
                                          type="number"
                                          min="100"
                                          max="2000"
                                          value={formData.chunk_size}
                                          onChange={(e) => setFormData({ ...formData, chunk_size: parseInt(e.target.value) })}
                                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                                          placeholder="500"
                                        />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                          {formData.chunk_size < 400 ? '📄 Small chunks - precise search' :
                                           formData.chunk_size > 800 ? '📚 Large chunks - more context' :
                                           '📃 Balanced - good for most content'}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                          Chunk Overlap (tokens)
                                          <span className="ml-1 text-gray-500 dark:text-gray-400" title="Tokens repeated between chunks to preserve context across boundaries">ⓘ</span>
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          max="500"
                                          value={formData.chunk_overlap}
                                          onChange={(e) => setFormData({ ...formData, chunk_overlap: parseInt(e.target.value) })}
                                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ack-blue dark:focus:ring-blue-500 focus:border-ack-blue dark:focus:border-blue-500"
                                          placeholder="50"
                                        />
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                          {formData.chunk_overlap === 0 ? '⚠️ No overlap - may lose context' :
                                           formData.chunk_overlap > 150 ? '🔗 High overlap - better continuity' :
                                           '✓ Good balance'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                onClick={resetForm}
                                variant="secondary"
                                size="sm"
                              >
                                Cancel
                              </Button>
                              <Button type="submit" size="sm">
                                Save Changes
                              </Button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      // Regular Row
                      <tr
                        key={scrape.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedIds.has(scrape.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(scrape.id)}
                            onChange={() => toggleSelection(scrape.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-ack-blue dark:text-blue-500 focus:ring-ack-blue dark:focus:ring-blue-500 bg-white dark:bg-gray-700"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-md">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {scrape.title || 'Untitled'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{scrape.url}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(scrape.status)}`}
                          >
                            {scrape.status}
                          </span>
                          {scrape.error_count > 0 && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {scrape.error_count} error{scrape.error_count !== 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {scrape.priority}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {scrape.scrape_frequency}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {scrape.last_scraped_at
                            ? new Date(scrape.last_scraped_at).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {formatDate(scrape.next_scrape_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(scrape)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(scrape.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
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
