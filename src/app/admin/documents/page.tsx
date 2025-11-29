/**
 * Admin Documents Dashboard
 * Upload and manage parsed documents (warrants, budgets, etc.)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAdminUser } from '@/lib/adminAuth';
import PageLayout from '@/components/PageLayout';
import Loading from '@/components/Loading';

interface DocumentAIStatus {
  configured: boolean;
  projectId: string | null;
  location: string;
  processorId: string | null;
  supportedTypes: string[];
  maxFileSize: number;
}

interface BatchResult {
  fileName: string;
  success: boolean;
  document?: {
    id: string;
    title: string;
    documentType: string;
    meetingDate: string | null;
    pages: number;
    tables: number;
    chunks: number;
  };
  error?: string;
}

interface BatchUploadResponse {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  results: BatchResult[];
}

export default function AdminDocumentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [status, setStatus] = useState<DocumentAIStatus | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [batchResults, setBatchResults] = useState<BatchUploadResponse | null>(null);

  // Selected files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    async function init() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/admin/login');
          return;
        }

        const adminUser = await getAdminUser();
        if (!adminUser) {
          setIsUnauthorized(true);
          setIsLoading(false);
          return;
        }

        // Fetch Document AI status
        const res = await fetch('/api/admin/documents/parse');
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (error) {
        console.error('Init failed:', error);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      setBatchResults(null);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setTotalFiles(selectedFiles.length);
    setCurrentFileIndex(0);
    setBatchResults(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      setUploadProgress(`Processing ${selectedFiles.length} document${selectedFiles.length > 1 ? 's' : ''} with AI...`);

      const res = await fetch('/api/admin/documents/batch', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setBatchResults({
          success: false,
          processed: 0,
          succeeded: 0,
          failed: selectedFiles.length,
          results: selectedFiles.map(f => ({
            fileName: f.name,
            success: false,
            error: data.error || 'Upload failed',
          })),
        });
      } else {
        setBatchResults(data);
        // Clear files on success
        if (data.success) {
          setSelectedFiles([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }
    } catch (error) {
      setBatchResults({
        success: false,
        processed: 0,
        succeeded: 0,
        failed: selectedFiles.length,
        results: selectedFiles.map(f => ({
          fileName: f.name,
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed',
        })),
      });
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loading />
        </div>
      </PageLayout>
    );
  }

  if (isUnauthorized) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400">You do not have admin access.</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Link
              href="/admin"
              className="inline-flex items-center text-sm text-ack-blue dark:text-blue-400 hover:underline mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin Panel
            </Link>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Document Parser
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Upload warrants, budgets, and other town documents. AI automatically extracts titles, dates, and categories.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Status Card */}
          <div className={`mb-8 p-4 rounded-lg border ${
            status?.configured
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="flex items-center gap-3">
              {status?.configured ? (
                <>
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-300">Google Document AI Connected</p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Project: {status.projectId} • Location: {status.location}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-300">Google Document AI Not Configured</p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_DOCUMENT_AI_PROCESSOR_ID, and GOOGLE_APPLICATION_CREDENTIALS
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Batch Upload Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Batch Upload Documents</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Select multiple files. AI will automatically detect document titles, types, and meeting dates.
            </p>

            <div className="space-y-6">
              {/* Drop Zone / File Input */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  uploading || !status?.configured
                    ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-600 hover:border-ack-blue dark:hover:border-blue-500 cursor-pointer'
                }`}
                onClick={() => !uploading && status?.configured && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.tiff,.gif,.webp"
                  multiple
                  onChange={handleFileSelect}
                  disabled={uploading || !status?.configured}
                  className="hidden"
                />
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
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
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-ack-blue dark:text-blue-400">Click to select files</span> or drag and drop
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  PDF, PNG, JPEG, TIFF, GIF, WebP up to 20MB each
                </p>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Selected Files ({selectedFiles.length})
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedFiles([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline"
                      disabled={uploading}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <svg
                            className="w-5 h-5 text-gray-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                          className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={handleBatchUpload}
                disabled={uploading || selectedFiles.length === 0 || !status?.configured}
                className="w-full py-3 px-4 bg-ack-blue hover:bg-ack-blue-dark text-white font-medium rounded-lg
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {uploadProgress}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload & Parse {selectedFiles.length > 0 ? `${selectedFiles.length} Document${selectedFiles.length > 1 ? 's' : ''}` : 'Documents'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Batch Results */}
          {batchResults && (
            <div className="mt-8 space-y-4">
              {/* Summary */}
              <div className={`p-4 rounded-lg border ${
                batchResults.failed === 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : batchResults.succeeded > 0
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center gap-3">
                  {batchResults.failed === 0 ? (
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Batch Upload Complete
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {batchResults.succeeded} of {batchResults.processed} documents processed successfully
                    </p>
                  </div>
                </div>
              </div>

              {/* Individual Results */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white">Processing Results</h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {batchResults.results.map((result, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-start gap-3">
                        {result.success ? (
                          <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {result.fileName}
                          </p>
                          {result.success && result.document ? (
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Title:</span> {result.document.title}
                              </p>
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                  {result.document.documentType}
                                </span>
                                {result.document.meetingDate && (
                                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                    {result.document.meetingDate}
                                  </span>
                                )}
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                  {result.document.pages} pages
                                </span>
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                  {result.document.tables} tables
                                </span>
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                                  {result.document.chunks} chunks indexed
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                              {result.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
