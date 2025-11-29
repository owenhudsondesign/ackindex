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

interface ParsedTable {
  headers: string[];
  rowCount: number;
  pageNumber: number;
  confidence: string;
}

interface UploadResult {
  success: boolean;
  document?: {
    id: string;
    title: string;
    pages: number;
    tables: number;
    chunks: number;
    status: string;
  };
  parsed?: {
    textPreview: string;
    tables: ParsedTable[];
  };
  error?: string;
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
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('warrant');
  const [meetingDate, setMeetingDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill title from filename if empty
      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt.replace(/[-_]/g, ' '));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) return;

    setUploading(true);
    setUploadProgress('Uploading document...');
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title);
      formData.append('documentType', documentType);
      if (meetingDate) {
        formData.append('meetingDate', meetingDate);
      }

      setUploadProgress('Parsing with Google Document AI...');

      const res = await fetch('/api/admin/documents/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadResult({ success: false, error: data.error || 'Upload failed' });
      } else {
        setUploadResult(data);
        // Reset form on success
        setTitle('');
        setDocumentType('warrant');
        setMeetingDate('');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      setUploadResult({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
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
              Upload warrants, budgets, and other town documents for parsing and search indexing
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

          {/* Upload Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Upload Document</h2>

            <div className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.tiff,.gif,.webp"
                  onChange={handleFileSelect}
                  disabled={uploading || !status?.configured}
                  className="block w-full text-sm text-gray-700 dark:text-gray-300
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-ack-blue file:text-white
                    hover:file:bg-ack-blue-dark
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., 2024 Annual Town Meeting Warrant"
                  disabled={uploading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-ack-blue focus:border-transparent
                    disabled:opacity-50"
                />
              </div>

              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  disabled={uploading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-ack-blue focus:border-transparent
                    disabled:opacity-50"
                >
                  <option value="warrant">Warrant Article</option>
                  <option value="budget">Budget Document</option>
                  <option value="agenda">Meeting Agenda</option>
                  <option value="minutes">Meeting Minutes</option>
                  <option value="report">Committee Report</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Meeting Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meeting Date (optional)
                </label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  disabled={uploading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-ack-blue focus:border-transparent
                    disabled:opacity-50"
                />
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !title || !status?.configured}
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
                    Upload & Parse Document
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results */}
          {uploadResult && (
            <div className={`mt-8 p-6 rounded-lg border ${
              uploadResult.success
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              {uploadResult.success ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-300">Document Processed Successfully</h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{uploadResult.document?.pages}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Pages</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{uploadResult.document?.tables}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Tables</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{uploadResult.document?.chunks}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Chunks Indexed</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{uploadResult.document?.status}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    </div>
                  </div>

                  {/* Tables Found */}
                  {uploadResult.parsed?.tables && uploadResult.parsed.tables.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Tables Extracted:</h4>
                      <div className="space-y-2">
                        {uploadResult.parsed.tables.map((table, idx) => (
                          <div key={idx} className="bg-white dark:bg-gray-800 p-3 rounded-lg text-sm">
                            <p className="font-medium text-gray-900 dark:text-white">
                              Table {idx + 1} (Page {table.pageNumber}) - {table.rowCount} rows
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                              Headers: {table.headers.join(', ') || 'None detected'}
                            </p>
                            <p className="text-gray-500 dark:text-gray-500 text-xs">
                              Confidence: {table.confidence}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Text Preview */}
                  {uploadResult.parsed?.textPreview && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Text Preview:</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-lg whitespace-pre-wrap">
                        {uploadResult.parsed.textPreview}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Upload Failed</h3>
                    <p className="text-red-600 dark:text-red-400">{uploadResult.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
