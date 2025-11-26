'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAdminUser } from '@/lib/adminAuth';
import PageLayout from '@/components/PageLayout';
import Container from '@/components/Container';
import Link from 'next/link';

interface MeetingVideo {
  id: string;
  uploaded_by: string;
  original_filename: string;
  file_size_bytes: number;
  meeting_date: string;
  meeting_title: string;
  meeting_description: string | null;
  duration_seconds: number | null;
  processing_status: string;
  transcription_status: string;
  is_public: boolean;
  created_at: string;
  document_id: string | null;
  user_profiles: {
    full_name: string;
    email: string;
  };
}

export default function AdminVideosPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<MeetingVideo[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'processing'>('pending');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadVideos();
    }
  }, [filter, loading]);

  // Auto-refresh for processing tab every 10 seconds
  useEffect(() => {
    if (filter === 'processing' && autoRefresh && !loading) {
      const interval = setInterval(() => {
        loadVideos();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [filter, autoRefresh, loading]);

  const checkAuth = async () => {
    try {
      const adminUser = await getAdminUser();
      if (!adminUser) {
        router.push('/admin/login');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/admin/login');
    }
  };

  const loadVideos = async () => {
    try {
      const response = await fetch(`/api/admin/videos?filter=${filter}`);
      const data = await response.json();

      console.log('Videos API response:', response.status, data);

      if (!response.ok) {
        console.error('Videos API error:', data);
        // If unauthorized, don't redirect - just show empty
        if (response.status === 401) {
          console.error('Admin videos API returned 401 - session may have expired');
        }
        return;
      }
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Load error:', error);
    }
  };

  const handleApprove = async (videoId: string) => {
    if (!confirm('Approve this video for public viewing?')) return;

    try {
      const response = await fetch('/api/admin/videos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'approve' }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await loadVideos();
      alert('Video approved and made public!');
    } catch (error) {
      console.error('Approve error:', error);
      alert('Failed to approve video');
    }
  };

  const handleReject = async (videoId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;

    try {
      const response = await fetch('/api/admin/videos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'reject', reason }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await loadVideos();
      alert('Video archived');
    } catch (error) {
      console.error('Reject error:', error);
      alert('Failed to archive video');
    }
  };

  const handleStartProcessing = async (videoId: string) => {
    if (!confirm('Start processing this video? This will trigger transcription.')) return;

    try {
      const response = await fetch('/api/admin/videos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'process' }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await loadVideos();
      alert('Video processing started!');
    } catch (error) {
      console.error('Process error:', error);
      alert('Failed to start processing');
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/videos?id=${videoId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await loadVideos();
      alert('Video deleted');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete video');
    }
  };

  const handleGenerateBlogPost = async (documentId: string) => {
    if (!confirm('Generate a blog post for this video?')) return;

    try {
      const response = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      alert('Blog post generated! Check the Blog Posts page to review and publish.');
    } catch (error) {
      console.error('Generate blog post error:', error);
      alert('Failed to generate blog post: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Batch selection handlers
  const toggleSelect = (videoId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    const pendingVideos = videos.filter(v => !v.is_public && v.processing_status === 'completed');
    setSelectedIds(new Set(pendingVideos.map(v => v.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Approve ${selectedIds.size} video(s) for public viewing?`)) return;

    setBatchActionLoading(true);
    try {
      const response = await fetch('/api/admin/videos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: Array.from(selectedIds), action: 'batch-approve' }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSelectedIds(new Set());
      await loadVideos();
      alert(`${data.approved || selectedIds.size} video(s) approved!`);
    } catch (error) {
      console.error('Batch approve error:', error);
      alert('Failed to approve videos');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchProcess = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Start processing ${selectedIds.size} video(s)?`)) return;

    setBatchActionLoading(true);
    try {
      const response = await fetch('/api/admin/videos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: Array.from(selectedIds), action: 'batch-process' }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSelectedIds(new Set());
      await loadVideos();
      alert(`${data.processed || selectedIds.size} video(s) queued for processing!`);
    } catch (error) {
      console.error('Batch process error:', error);
      alert('Failed to process videos');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateString: string): string => {
    // For date-only strings (YYYY-MM-DD), parse directly to avoid timezone shifts
    // For datetime strings, use Date parsing
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day); // Local timezone
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    // For full datetime strings, parse normally
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      processing: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      failed: 'bg-red-100 text-red-800 border-red-300',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${styles[status as keyof typeof styles] || 'bg-gray-100'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Get processing step info based on transcription status
  const getProcessingInfo = (video: MeetingVideo) => {
    const steps = [
      { key: 'pending', label: 'Queued', progress: 5 },
      { key: 'processing', label: 'Transcribing', progress: 40 },
      { key: 'chunking', label: 'Analyzing', progress: 70 },
      { key: 'embedding', label: 'Indexing', progress: 85 },
      { key: 'completed', label: 'Complete', progress: 100 },
      { key: 'failed', label: 'Failed', progress: 0 },
    ];

    const currentStep = steps.find(s => s.key === video.transcription_status) || steps[0];
    const stepIndex = steps.findIndex(s => s.key === video.transcription_status);

    return {
      ...currentStep,
      stepIndex,
      totalSteps: steps.length - 1, // Exclude 'failed'
      estimatedTime: video.transcription_status === 'processing'
        ? 'Usually takes 3-10 minutes depending on video length'
        : video.transcription_status === 'pending'
        ? 'Starting soon...'
        : null,
    };
  };

  if (loading) {
    return (
      <PageLayout>
        <Container className="py-16">
          <div className="flex items-center justify-center">
            <div className="text-gray-600">Loading...</div>
          </div>
        </Container>
      </PageLayout>
    );
  }

  const pendingCount = videos.filter(v => !v.is_public && v.processing_status === 'completed').length;

  return (
    <PageLayout>
      <Container className="py-8">
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Panel
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Video Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                Review and approve uploaded meeting videos
              </p>
            </div>
          </div>
        </div>
        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setFilter('pending')}
                className={`px-6 py-3 font-medium relative ${
                  filter === 'pending'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending Approval
                {pendingCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilter('processing')}
                className={`px-6 py-3 font-medium flex items-center gap-2 ${
                  filter === 'processing'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Processing
                {filter === 'processing' && autoRefresh && (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-6 py-3 font-medium ${
                  filter === 'approved'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-3 font-medium ${
                  filter === 'all'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* Batch Actions Bar */}
          {filter === 'pending' && videos.filter(v => !v.is_public && v.processing_status === 'completed').length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedIds.size === videos.filter(v => !v.is_public && v.processing_status === 'completed').length && selectedIds.size > 0}
                  onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
                </span>
              </div>
              {selectedIds.size > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleBatchApprove}
                    disabled={batchActionLoading}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
                  >
                    {batchActionLoading ? 'Processing...' : `Approve ${selectedIds.size}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Videos List */}
          <div className="p-6">
            {videos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No {filter !== 'all' ? filter : ''} videos
              </div>
            ) : (
              <div className="space-y-4">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selectedIds.has(video.id)
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        {filter === 'pending' && !video.is_public && video.processing_status === 'completed' && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(video.id)}
                            onChange={() => toggleSelect(video.id)}
                            className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {video.meeting_title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">{video.original_filename}</p>
                          {video.meeting_description && (
                            <p className="text-sm text-gray-500 mt-1">{video.meeting_description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(video.processing_status)}
                        {video.is_public && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full border bg-green-100 text-green-800 border-green-300">
                            PUBLIC
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar for processing videos */}
                    {video.processing_status === 'processing' && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        {(() => {
                          const info = getProcessingInfo(video);
                          return (
                            <>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-blue-900">
                                  {info.label}...
                                </span>
                                <span className="text-sm text-blue-700">
                                  {info.progress}%
                                </span>
                              </div>
                              <div className="w-full bg-blue-200 rounded-full h-2.5 mb-2">
                                <div
                                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                                  style={{ width: `${info.progress}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-2 text-xs text-blue-700">
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>{info.estimatedTime || 'Processing...'}</span>
                              </div>
                              <p className="text-xs text-blue-600 mt-2">
                                Steps: Download → Transcribe → Chunk → Generate Embeddings → Create Blog Post
                              </p>
                              <button
                                onClick={() => handleDelete(video.id)}
                                className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
                              >
                                Delete Video
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <p className="text-gray-500">Uploaded By</p>
                        <p className="font-medium text-gray-900">{video.user_profiles?.full_name || video.user_profiles?.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Meeting Date</p>
                        <p className="font-medium text-gray-900">{formatDate(video.meeting_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">File Size</p>
                        <p className="font-medium text-gray-900">{formatFileSize(video.file_size_bytes)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Duration</p>
                        <p className="font-medium text-gray-900">{formatDuration(video.duration_seconds)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Transcription</p>
                        <p className="font-medium text-gray-900">{video.transcription_status}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Uploaded</p>
                        <p className="font-medium text-gray-900">{formatDate(video.created_at)}</p>
                      </div>
                    </div>

                    {/* Actions for pending processing */}
                    {video.processing_status === 'pending' && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleStartProcessing(video.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                        >
                          Start Processing
                        </button>
                        <button
                          onClick={() => handleReject(video.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                        >
                          Archive
                        </button>
                      </div>
                    )}

                    {/* Actions for completed processing, pending approval */}
                    {!video.is_public && video.processing_status === 'completed' && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleApprove(video.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                        >
                          Approve & Make Public
                        </button>
                        {video.document_id && (
                          <button
                            onClick={() => handleGenerateBlogPost(video.document_id!)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
                          >
                            Generate Blog Post
                          </button>
                        )}
                        <button
                          onClick={() => handleReject(video.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                        >
                          Archive
                        </button>
                      </div>
                    )}

                    {/* Actions for approved/public videos */}
                    {video.is_public && video.processing_status === 'completed' && video.document_id && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleGenerateBlogPost(video.document_id!)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
                        >
                          Generate Blog Post
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </PageLayout>
  );
}
