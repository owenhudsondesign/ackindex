'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  saveUploadState,
  loadUploadState,
  clearUploadState,
  markChunkUploaded,
  isChunkUploaded,
  getRemainingChunks,
} from '@/lib/uploadResume';

interface UploadState {
  status: 'idle' | 'uploading' | 'completed' | 'error' | 'cancelled';
  progress: number;
  chunksUploaded: number;
  totalChunks: number;
  bytesUploaded: number;
  totalBytes: number;
  sessionId: string | null;
  error: string | null;
  videoId: string | null;
  canResume: boolean;
}

/**
 * Clean technical suffixes from video filenames
 * Strips resolution, codec info, etc.
 * Example: "Meeting - Nov 17, 2025-1920×1080-avc1-mp4a.mp4" → "Meeting - Nov 17, 2025"
 */
function cleanFilename(filename: string): string {
  // Remove file extension first
  let clean = filename.replace(/\.[^/.]+$/, '');

  // Remove common technical suffixes (resolution, codecs)
  // Pattern matches: -1920×1080, -1920x1080, -avc1, -hevc, -mp4a, -h264, etc.
  clean = clean.replace(/-\d{3,4}[×x]\d{3,4}(-[a-zA-Z0-9]+)*$/, '');

  // Also handle underscore variants
  clean = clean.replace(/_\d{3,4}[×x]\d{3,4}(_[a-zA-Z0-9]+)*$/, '');

  // Remove trailing dashes/underscores
  clean = clean.replace(/[-_]+$/, '');

  return clean.trim();
}

/**
 * Extract date from filename if present
 * Handles formats like "November 17, 2025" or "Nov 17, 2025" or "2025-11-17"
 */
function extractDateFromFilename(filename: string): string | null {
  // Try "Month Day, Year" format
  const monthDayYear = filename.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (monthDayYear) {
    const monthNames: Record<string, string> = {
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'may': '05', 'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12',
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09',
      'oct': '10', 'nov': '11', 'dec': '12'
    };
    const monthMatch = filename.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
    if (monthMatch) {
      const month = monthNames[monthMatch[1].toLowerCase()];
      const day = monthDayYear[1].padStart(2, '0');
      const year = monthDayYear[2];
      return `${year}-${month}-${day}`;
    }
  }

  // Try YYYY-MM-DD format
  const isoDate = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  }

  return null;
}

export default function VideoUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingResume, setPendingResume] = useState<{ filename: string; progress: number } | null>(null);

  // Form data
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');

  // Upload state
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    chunksUploaded: 0,
    totalChunks: 0,
    bytesUploaded: 0,
    totalBytes: 0,
    sessionId: null,
    error: null,
    videoId: null,
    canResume: false,
  });

  // Check for resumable upload on mount
  useEffect(() => {
    const savedState = loadUploadState();
    if (savedState) {
      const progress = (savedState.uploadedChunks.length / savedState.totalChunks) * 100;

      // Show pending resume banner - user needs to re-select the file
      setPendingResume({
        filename: savedState.filename,
        progress,
      });

      setMeetingDate(savedState.meetingDate);
      setMeetingTitle(savedState.meetingTitle);
      setMeetingDescription(savedState.meetingDescription || '');
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type (video files)
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    // Check file size (50GB max)
    const MAX_SIZE = 50 * 1024 * 1024 * 1024; // 50GB
    if (file.size > MAX_SIZE) {
      alert('File size exceeds 50GB limit');
      return;
    }

    // Check if this file matches a resumable upload
    const savedState = loadUploadState();
    if (savedState && savedState.filename === file.name && savedState.fileSize === file.size) {
      // File matches saved state - allow resume
      const progress = (savedState.uploadedChunks.length / savedState.totalChunks) * 100;
      const bytesPerChunk = savedState.fileSize / savedState.totalChunks;
      const bytesUploaded = savedState.uploadedChunks.length * bytesPerChunk;

      setSelectedFile(file);
      setPendingResume(null); // Clear pending resume banner
      setMeetingDate(savedState.meetingDate);
      setMeetingTitle(savedState.meetingTitle);
      setMeetingDescription(savedState.meetingDescription || '');
      setUploadState({
        status: 'idle',
        progress,
        chunksUploaded: savedState.uploadedChunks.length,
        totalChunks: savedState.totalChunks,
        bytesUploaded,
        totalBytes: file.size,
        sessionId: savedState.sessionId,
        error: null,
        videoId: null,
        canResume: true,
      });
    } else {
      // New upload or different file - clear any pending resume
      if (savedState) {
        clearUploadState(); // Clear old saved state since we're starting fresh
      }
      setSelectedFile(file);
      setPendingResume(null);
      setUploadState({
        status: 'idle',
        progress: 0,
        chunksUploaded: 0,
        totalChunks: 0,
        bytesUploaded: 0,
        totalBytes: file.size,
        sessionId: null,
        error: null,
        videoId: null,
        canResume: false,
      });

      // Auto-populate title and date from filename
      const cleanedTitle = cleanFilename(file.name);
      const extractedDate = extractDateFromFilename(file.name);

      setMeetingTitle(cleanedTitle);
      if (extractedDate) {
        setMeetingDate(extractedDate);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const uploadChunkWithRetry = async (
    sessionId: string,
    uploadToken: string,
    chunkIndex: number,
    chunk: Blob,
    maxRetries = 3
  ): Promise<any> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const formData = new FormData();
        formData.append('sessionId', sessionId);
        formData.append('uploadToken', uploadToken);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('chunk', chunk);

        const chunkResponse = await fetch('/api/staff/upload/chunk', {
          method: 'POST',
          body: formData,
        });

        if (!chunkResponse.ok) {
          const error = await chunkResponse.json();
          throw new Error(error.error || `Failed to upload chunk ${chunkIndex}`);
        }

        const result = await chunkResponse.json();
        markChunkUploaded(chunkIndex);
        return result;

      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Upload failed');
  };

  const handleUpload = async (resume = false) => {
    if (!selectedFile) {
      alert('Please select a file');
      return;
    }

    if (!meetingDate || !meetingTitle) {
      alert('Please fill in meeting date and title');
      return;
    }

    try {
      setUploadState(prev => ({ ...prev, status: 'uploading', error: null, totalBytes: selectedFile!.size }));

      // Step 1: Get direct upload URL from server
      const urlResponse = await fetch('/api/staff/upload/get-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile!.name,
          fileSize: selectedFile!.size,
          mimeType: selectedFile!.type || 'video/mp4',
          meetingDate,
          meetingTitle,
          meetingDescription,
        }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(error.error || 'Failed to get upload URL');
      }

      const { sessionId, uploadToken, uploadUrl, accessKey, storagePath } = await urlResponse.json();

      setUploadState(prev => ({
        ...prev,
        sessionId,
        totalChunks: 1,
      }));

      // Step 2: Upload directly to Bunny.net (bypasses Vercel completely)
      // This allows uploads of any size without the 4.5MB serverless limit
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setUploadState(prev => ({
              ...prev,
              bytesUploaded: event.loaded,
              progress,
            }));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed - network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('AccessKey', accessKey);
        xhr.setRequestHeader('Content-Type', selectedFile!.type || 'video/mp4');
        xhr.send(selectedFile);
      });

      // Step 3: Complete upload (register in database)
      const completeResponse = await fetch('/api/staff/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          uploadToken,
          storagePath,
        }),
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.error || 'Failed to complete upload');
      }

      const { videoId } = await completeResponse.json();

      // Clear saved state
      clearUploadState();

      setUploadState(prev => ({
        ...prev,
        status: 'completed',
        videoId,
        progress: 100,
        chunksUploaded: 1,
        canResume: false,
      }));

    } catch (error) {
      console.error('Upload error:', error);
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
        canResume: false, // Direct uploads can't resume - need to start over
      }));
    }
  };

  const handleCancel = async () => {
    if (!uploadState.sessionId || uploadState.status !== 'uploading') return;

    try {
      await fetch('/api/staff/upload/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: uploadState.sessionId }),
      });

      setUploadState(prev => ({
        ...prev,
        status: 'cancelled',
      }));
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  const handleReset = () => {
    clearUploadState();
    setSelectedFile(null);
    setPendingResume(null);
    setMeetingDate('');
    setMeetingTitle('');
    setMeetingDescription('');
    setUploadState({
      status: 'idle',
      progress: 0,
      chunksUploaded: 0,
      totalChunks: 0,
      bytesUploaded: 0,
      totalBytes: 0,
      sessionId: null,
      error: null,
      videoId: null,
      canResume: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Pending resume banner - shown when there's a saved upload but no file selected yet */}
      {pendingResume && !selectedFile && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900 mb-1">Resume Previous Upload</h3>
              <p className="text-sm text-amber-800 mb-2">
                You have an incomplete upload ({pendingResume.progress.toFixed(1)}% complete).
              </p>
              <p className="text-sm text-amber-700 mb-3">
                To resume, please re-select the same file: <span className="font-medium">{pendingResume.filename}</span>
              </p>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Start Fresh Instead
              </button>
            </div>
            <button
              onClick={handleReset}
              className="p-2 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
              title="Clear saved upload"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Resume upload banner - shown when file is selected and matches saved state */}
      {uploadState.canResume && uploadState.status === 'idle' && uploadState.progress > 0 && selectedFile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Resume Previous Upload?</h3>
              <p className="text-sm text-blue-800 mb-3">
                This file has an incomplete upload ({uploadState.progress.toFixed(1)}% complete). Would you like to resume it?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpload(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Resume Upload
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Start New Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload completed */}
      {uploadState.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-1">Upload Successful!</h3>
              <p className="text-sm text-green-800 mb-3">
                Your video has been uploaded and is pending admin approval for public viewing.
              </p>
              <p className="text-xs text-green-700 mb-4">
                Video ID: <span className="font-mono">{uploadState.videoId}</span>
              </p>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Upload Another Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadState.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-1">Upload Failed</h3>
              <p className="text-sm text-red-800 mb-4">{uploadState.error}</p>
              {uploadState.canResume && uploadState.progress > 0 && selectedFile && (
                <p className="text-sm text-red-700 mb-4">
                  Progress saved: {uploadState.progress.toFixed(1)}% complete. You can resume this upload.
                </p>
              )}
              <div className="flex gap-2">
                {uploadState.canResume && uploadState.progress > 0 && selectedFile ? (
                  <>
                    <button
                      onClick={() => handleUpload(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Resume Upload
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      Start Over
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File upload area */}
      {uploadState.status === 'idle' && !selectedFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Drop video file here
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            or click to browse
          </p>
          <p className="text-xs text-gray-500">
            Supports files up to 50GB • MP4, MOV, AVI, and more
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* File selected - show metadata form */}
      {selectedFile && uploadState.status === 'idle' && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected File</h3>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <svg className="w-10 h-10 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-600">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Remove
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g., Select Board Meeting, Town Meeting, Planning Board"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the full meeting name as it should appear
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  placeholder="Add any notes about this meeting..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={() => handleUpload()}
              disabled={!meetingDate || !meetingTitle}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Start Upload
            </button>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploadState.status === 'uploading' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploading Video</h3>

          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{selectedFile?.name}</span>
              <span>{uploadState.progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-500">Chunks Uploaded</p>
              <p className="font-semibold text-gray-900">
                {uploadState.chunksUploaded} / {uploadState.totalChunks}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Data Transferred</p>
              <p className="font-semibold text-gray-900">
                {formatFileSize(uploadState.bytesUploaded)} / {formatFileSize(uploadState.totalBytes)}
              </p>
            </div>
          </div>

          <button
            onClick={handleCancel}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Cancel Upload
          </button>
        </div>
      )}
    </div>
  );
}
