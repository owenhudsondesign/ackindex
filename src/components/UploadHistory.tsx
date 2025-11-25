'use client';

import React, { useEffect, useState } from 'react';

interface MeetingVideo {
  id: string;
  original_filename: string;
  file_size_bytes: number;
  meeting_date: string;
  meeting_title: string;
  meeting_description: string | null;
  processing_status: string;
  transcription_status: string;
  is_public: boolean;
  created_at: string;
}

interface UploadSession {
  id: string;
  filename: string;
  file_size_bytes: number;
  meeting_title: string;
  chunks_received: number;
  total_chunks: number;
  status: string;
  created_at: string;
}

export default function UploadHistory() {
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<MeetingVideo[]>([]);
  const [activeSessions, setActiveSessions] = useState<UploadSession[]>([]);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<string | null>(null);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      const response = await fetch('/api/staff/uploads');
      if (!response.ok) throw new Error('Failed to load uploads');

      const data = await response.json();
      setUploads(data.uploads || []);
      setActiveSessions(data.activeSessions || []);
    } catch (error) {
      console.error('Load uploads error:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this upload? This cannot be undone.')) {
      return;
    }

    setDeletingSession(sessionId);
    try {
      const response = await fetch('/api/staff/upload/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete upload');
      }

      // Remove from local state
      setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Delete session error:', error);
      alert('Failed to delete upload. Please try again.');
    } finally {
      setDeletingSession(null);
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This cannot be undone.')) {
      return;
    }

    setDeletingVideo(videoId);
    try {
      const response = await fetch('/api/staff/video/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete video');
      }

      // Remove from local state
      setUploads(prev => prev.filter(v => v.id !== videoId));
    } catch (error) {
      console.error('Delete video error:', error);
      alert('Failed to delete video. Please try again.');
    } finally {
      setDeletingVideo(null);
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload History</h3>
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Uploads</h3>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Active Uploads</h4>
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div key={session.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{session.meeting_title}</p>
                    <p className="text-xs text-gray-600 truncate">{session.filename}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full border bg-blue-100 text-blue-800 border-blue-300">
                      IN PROGRESS
                    </span>
                    <button
                      onClick={() => deleteSession(session.id)}
                      disabled={deletingSession === session.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete upload"
                    >
                      {deletingSession === session.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>{formatFileSize(session.file_size_bytes)}</span>
                  <span>•</span>
                  <span>{session.chunks_received}/{session.total_chunks} chunks</span>
                  <span>•</span>
                  <span>{((session.chunks_received / session.total_chunks) * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload History */}
      {uploads.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p>No uploads yet</p>
          <p className="text-sm mt-1">Upload your first meeting video above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {uploads.map((video) => (
            <div key={video.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">{video.meeting_title}</h4>
                  <p className="text-xs text-gray-600">{video.original_filename}</p>
                  {video.meeting_description && (
                    <p className="text-xs text-gray-500 mt-1">{video.meeting_description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(video.processing_status)}
                    {!video.is_public && (
                      <span className="text-xs text-gray-500">Pending Approval</span>
                    )}
                  </div>
                  {/* Only allow delete if not yet approved */}
                  {!video.is_public && (
                    <button
                      onClick={() => deleteVideo(video.id)}
                      disabled={deletingVideo === video.id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete video"
                    >
                      {deletingVideo === video.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-600 mt-3">
                <span>{formatFileSize(video.file_size_bytes)}</span>
                <span>•</span>
                <span>Meeting: {formatDate(video.meeting_date)}</span>
                <span>•</span>
                <span>Uploaded: {formatDate(video.created_at)}</span>
                {video.transcription_status !== 'pending' && (
                  <>
                    <span>•</span>
                    <span>Transcription: {video.transcription_status}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {uploads.length > 0 && (
        <button
          onClick={loadUploads}
          className="mt-4 w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Refresh
        </button>
      )}
    </div>
  );
}
