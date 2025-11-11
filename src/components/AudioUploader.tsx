'use client';

import { useState } from 'react';
import Card from '@/components/Card';

export default function AudioUploader() {
  const [videoId, setVideoId] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'idle' | 'processing' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
        setStatus({
          type: 'error',
          message: 'Please upload a valid audio file (MP3, WAV, or M4A)',
        });
        return;
      }

      setAudioFile(file);
      setStatus({ type: 'idle' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoId.trim()) {
      setStatus({
        type: 'error',
        message: 'Please enter a YouTube video ID',
      });
      return;
    }

    if (!audioFile) {
      setStatus({
        type: 'error',
        message: 'Please select an audio file',
      });
      return;
    }

    setIsUploading(true);
    setStatus({
      type: 'processing',
      message: `Step 1/2: Uploading ${(audioFile.size / 1024 / 1024).toFixed(1)}MB to AssemblyAI...`
    });

    try {
      // Step 1: Upload via our proxy (which adds auth and streams to AssemblyAI)
      const uploadResponse = await fetch('/api/admin/upload-audio', {
        method: 'POST',
        body: audioFile,
      });

      if (!uploadResponse.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await uploadResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Upload failed: ${uploadResponse.status}`;
        }
        throw new Error(errorMessage);
      }

      const uploadData = await uploadResponse.json();
      const audioUrl = uploadData.upload_url;

      // Step 2: Start transcription via our backend (which has the API key)
      setStatus({ type: 'processing', message: 'Step 2/2: Starting transcription and registering job...' });

      const startTranscriptResponse = await fetch('/api/admin/start-transcription', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ audioUrl }),
      });

      if (!startTranscriptResponse.ok) {
        let errorMessage = 'Failed to start transcription';
        try {
          const data = await startTranscriptResponse.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = `${startTranscriptResponse.status}: ${startTranscriptResponse.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const { transcriptId } = await startTranscriptResponse.json();

      // Step 3: Register with our backend
      const registerResponse = await fetch('/api/admin/register-long-video', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          transcriptId,
          fileName: audioFile.name,
        }),
      });

      if (!registerResponse.ok) {
        let errorMessage = 'Failed to register transcript';
        try {
          const data = await registerResponse.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = `${registerResponse.status}: ${registerResponse.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await registerResponse.json();

      setStatus({
        type: 'success',
        message: `✅ ${data.message}`,
      });

      // Clear form
      setVideoId('');
      setAudioFile(null);
      const fileInput = document.getElementById('audio-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh page after delay to show new document
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Audio upload error:', error);
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to process audio file',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Long Video Processing (&gt;120 min)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upload audio files for videos exceeding Gladia's limit (AssemblyAI)
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="video-id"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            YouTube Video ID
          </label>
          <input
            id="video-id"
            type="text"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            placeholder="abc123xyz (from youtube.com/watch?v=abc123xyz)"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
            disabled={isUploading}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Extract the video ID from the YouTube URL (the part after "v=")
          </p>
        </div>

        <div>
          <label
            htmlFor="audio-file"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Audio File (MP3, WAV, M4A)
          </label>
          <div className="flex items-center gap-4">
            <label
              htmlFor="audio-file"
              className="flex-1 flex flex-col items-center px-6 py-8 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-lg cursor-pointer hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
            >
              <svg
                className="w-8 h-8 text-gray-400 dark:text-gray-500 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {audioFile ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {audioFile.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    MP3, WAV, or M4A (up to 2GB for 8-hour videos)
                  </p>
                </div>
              )}
              <input
                id="audio-file"
                type="file"
                accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/m4a,audio/x-m4a"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading || !videoId.trim() || !audioFile}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium flex items-center justify-center gap-2"
        >
          {isUploading ? (
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
              Uploading...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Upload & Process
            </>
          )}
        </button>
      </form>

      {/* Status messages */}
      {status.type !== 'idle' && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            status.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
              : status.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
              : 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
          }`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {status.type === 'error' && (
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
              {status.type === 'success' && (
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
              {status.type === 'processing' && (
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
                  status.type === 'error'
                    ? 'text-red-800 dark:text-red-200'
                    : status.type === 'success'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-blue-800 dark:text-blue-200'
                }`}
              >
                {status.message}
              </p>
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
            <span className="text-purple-600 dark:text-purple-400 mt-0.5">1.</span>
            <span>Download audio from ytmp3.nu or similar service</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 dark:text-purple-400 mt-0.5">2.</span>
            <span>Upload here with YouTube video ID (files up to 2GB)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 dark:text-purple-400 mt-0.5">3.</span>
            <span>File streams through server to AssemblyAI</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 dark:text-purple-400 mt-0.5">4.</span>
            <span>Transcription job starts automatically</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 dark:text-purple-400 mt-0.5">5.</span>
            <span>Processing runs in background (15-30 minutes)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 dark:text-purple-400 mt-0.5">6.</span>
            <span>Video appears in documents list when complete</span>
          </li>
        </ul>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 <strong>Tip:</strong> For videos under 120 minutes, use the YouTube URL processor above instead.
          </p>
        </div>
      </div>
    </Card>
  );
}
