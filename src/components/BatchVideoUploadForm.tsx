'use client';

import React, { useState, useRef } from 'react';

interface QueuedFile {
  id: string;
  file: File;
  meetingTitle: string;
  meetingDate: string;
  boardOrCommittee: string;
  status: 'queued' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  videoId?: string;
}

interface ParsedMetadata {
  meetingTitle: string;
  meetingDate: string | null;
  boardOrCommittee: string;
  confidence: 'high' | 'medium' | 'low';
}

export default function BatchVideoUploadForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState<number | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const files: File[] = [];

    // Handle both files and folders
    const processEntry = async (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        return new Promise((resolve) => {
          fileEntry.file((file) => {
            if (file.type.startsWith('video/')) {
              files.push(file);
            }
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();
        return new Promise((resolve) => {
          const readEntries = () => {
            reader.readEntries(async (entries) => {
              if (entries.length === 0) {
                resolve();
              } else {
                for (const entry of entries) {
                  await processEntry(entry);
                }
                readEntries(); // Continue reading (directories may have many entries)
              }
            });
          };
          readEntries();
        });
      }
    };

    // Process dropped items
    const promises: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        promises.push(processEntry(entry));
      }
    }
    await Promise.all(promises);

    if (files.length > 0) {
      await addFilesToQueue(files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const videoFiles = Array.from(files).filter(f => f.type.startsWith('video/'));
      if (videoFiles.length > 0) {
        await addFilesToQueue(videoFiles);
      }
    }
    // Reset input
    e.target.value = '';
  };

  const addFilesToQueue = async (files: File[]) => {
    setIsParsing(true);

    try {
      // Parse filenames using LLM
      const filenames = files.map(f => f.name);
      const response = await fetch('/api/staff/parse-filename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames }),
      });

      let parsedData: ParsedMetadata[] = [];
      if (response.ok) {
        const data = await response.json();
        parsedData = data.parsed || [];
      }

      // Create queue items
      const newItems: QueuedFile[] = files.map((file, index) => {
        const parsed = parsedData[index];
        const today = new Date().toISOString().split('T')[0];

        return {
          id: generateId(),
          file,
          meetingTitle: parsed?.meetingTitle || file.name.replace(/\.[^/.]+$/, ''),
          meetingDate: parsed?.meetingDate || today,
          boardOrCommittee: parsed?.boardOrCommittee || '',
          status: 'queued' as const,
          progress: 0,
        };
      });

      setQueue(prev => [...prev, ...newItems]);
    } catch (error) {
      console.error('Failed to parse filenames:', error);
      // Add files anyway with basic defaults
      const newItems: QueuedFile[] = files.map((file) => ({
        id: generateId(),
        file,
        meetingTitle: file.name.replace(/\.[^/.]+$/, ''),
        meetingDate: new Date().toISOString().split('T')[0],
        boardOrCommittee: '',
        status: 'queued' as const,
        progress: 0,
      }));
      setQueue(prev => [...prev, ...newItems]);
    } finally {
      setIsParsing(false);
    }
  };

  const updateQueueItem = (id: string, updates: Partial<QueuedFile>) => {
    setQueue(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const uploadFile = async (item: QueuedFile): Promise<void> => {
    updateQueueItem(item.id, { status: 'uploading', progress: 0 });

    try {
      // Step 1: Get upload URL
      const urlResponse = await fetch('/api/staff/upload/get-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: item.file.name,
          fileSize: item.file.size,
          mimeType: item.file.type || 'video/mp4',
          meetingDate: item.meetingDate,
          meetingTitle: item.meetingTitle,
          meetingDescription: '',
        }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(error.error || 'Failed to get upload URL');
      }

      const { sessionId, uploadToken, uploadUrl, accessKey, storagePath } = await urlResponse.json();

      // Step 2: Upload to Bunny.net
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            updateQueueItem(item.id, { progress });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('AccessKey', accessKey);
        xhr.setRequestHeader('Content-Type', item.file.type || 'video/mp4');
        xhr.send(item.file);
      });

      // Step 3: Complete upload
      const completeResponse = await fetch('/api/staff/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, uploadToken, storagePath }),
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.error || 'Failed to complete upload');
      }

      const { videoId } = await completeResponse.json();
      updateQueueItem(item.id, { status: 'completed', progress: 100, videoId });

    } catch (error) {
      console.error('Upload error:', error);
      updateQueueItem(item.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  };

  const startBatchUpload = async () => {
    const queuedItems = queue.filter(item => item.status === 'queued');
    if (queuedItems.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < queuedItems.length; i++) {
      const item = queuedItems[i];
      setCurrentUploadIndex(queue.findIndex(q => q.id === item.id));
      await uploadFile(item);
    }

    setIsUploading(false);
    setCurrentUploadIndex(null);
  };

  const clearCompleted = () => {
    setQueue(prev => prev.filter(item => item.status !== 'completed'));
  };

  const clearAll = () => {
    if (isUploading) return;
    setQueue([]);
  };

  const queuedCount = queue.filter(item => item.status === 'queued').length;
  const completedCount = queue.filter(item => item.status === 'completed').length;
  const errorCount = queue.filter(item => item.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
      >
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Drop video files or folders here
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          or use the buttons below to select files
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Select Files
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Select Folder
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Supports files up to 50GB • MP4, MOV, AVI, and more
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          accept="video/*"
          multiple
          // @ts-ignore - webkitdirectory is not in the type definitions
          webkitdirectory=""
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Parsing indicator */}
      {isParsing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm text-blue-800">Analyzing filenames...</span>
        </div>
      )}

      {/* Queue */}
      {queue.length > 0 && (
        <div className="bg-white rounded-lg shadow-md">
          {/* Queue header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Upload Queue</h3>
              <p className="text-sm text-gray-600">
                {queuedCount} queued • {completedCount} completed • {errorCount} errors
              </p>
            </div>
            <div className="flex gap-2">
              {completedCount > 0 && (
                <button
                  onClick={clearCompleted}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Clear Completed
                </button>
              )}
              {!isUploading && queue.length > 0 && (
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Queue items */}
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {queue.map((item, index) => (
              <div key={item.id} className="px-6 py-4">
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className="flex-shrink-0 mt-1">
                    {item.status === 'queued' && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 font-medium">
                        {index + 1}
                      </div>
                    )}
                    {item.status === 'uploading' && (
                      <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {item.status === 'completed' && (
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {item.status === 'error' && (
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {item.status === 'queued' ? (
                          <input
                            type="text"
                            value={item.meetingTitle}
                            onChange={(e) => updateQueueItem(item.id, { meetingTitle: e.target.value })}
                            className="w-full text-sm font-medium text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent"
                          />
                        ) : (
                          <p className="text-sm font-medium text-gray-900 truncate">{item.meetingTitle}</p>
                        )}
                        <p className="text-xs text-gray-500 truncate">{item.file.name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.status === 'queued' && (
                          <input
                            type="date"
                            value={item.meetingDate}
                            onChange={(e) => updateQueueItem(item.id, { meetingDate: e.target.value })}
                            className="text-xs border border-gray-200 rounded px-2 py-1"
                          />
                        )}
                        {item.status === 'queued' && !isUploading && (
                          <button
                            onClick={() => removeFromQueue(item.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {item.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{item.progress.toFixed(1)}%</p>
                      </div>
                    )}

                    {/* Error message */}
                    {item.status === 'error' && item.error && (
                      <p className="text-xs text-red-600 mt-1">{item.error}</p>
                    )}

                    {/* File size */}
                    <p className="text-xs text-gray-400 mt-1">{formatFileSize(item.file.size)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Start upload button */}
          {queuedCount > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={startBatchUpload}
                disabled={isUploading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isUploading
                  ? `Uploading ${currentUploadIndex !== null ? currentUploadIndex + 1 : ''} of ${queue.length}...`
                  : `Start Upload (${queuedCount} file${queuedCount !== 1 ? 's' : ''})`
                }
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
