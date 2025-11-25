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

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadVideos();
    }
  }, [filter, loading]);

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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateString: string): string => {
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
                className={`px-6 py-3 font-medium ${
                  filter === 'processing'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Processing
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
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {video.meeting_title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{video.original_filename}</p>
                        {video.meeting_description && (
                          <p className="text-sm text-gray-500 mt-1">{video.meeting_description}</p>
                        )}
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
                        <button
                          onClick={() => handleReject(video.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
                        >
                          Archive
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
