'use client';

import { useState, useRef } from 'react';
import Button from './Button';
import Toast from './Toast';

interface PDFUploadProps {
  onUploadSuccess?: () => void;
}

export default function PDFUpload({ onUploadSuccess }: PDFUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: 'pending' | 'uploading' | 'success' | 'error'}>({});
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const validFiles: File[] = [];
    const maxSize = 200 * 1024 * 1024; // 200MB in bytes

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      // Validate file type
      if (file.type !== 'application/pdf') {
        showToast(`${file.name} is not a PDF file (skipped)`, 'error');
        continue;
      }

      // Validate file size
      if (file.size > maxSize) {
        showToast(`${file.name} is too large (max 200MB, skipped)`, 'error');
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      // Initialize progress tracking
      const newProgress: {[key: string]: 'pending'} = {};
      validFiles.forEach(f => {
        newProgress[f.name] = 'pending';
      });
      setUploadProgress(prev => ({ ...prev, ...newProgress }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0) {
      showToast('Please select at least one file', 'error');
      return;
    }

    setIsLoading(true);

    let successCount = 0;
    let failCount = 0;

    // Upload files sequentially
    for (const file of files) {
      setUploadProgress(prev => ({ ...prev, [file.name]: 'uploading' }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/admin/upload-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to upload PDF');
        }

        setUploadProgress(prev => ({ ...prev, [file.name]: 'success' }));
        successCount++;
      } catch (error) {
        setUploadProgress(prev => ({ ...prev, [file.name]: 'error' }));
        failCount++;
        console.error(`Failed to upload ${file.name}:`, error);
      }

      // Small delay between uploads
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsLoading(false);

    // Show summary
    if (failCount === 0) {
      showToast(`Successfully uploaded ${successCount} PDF(s)!`, 'success');
      setFiles([]);
      setUploadProgress({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onUploadSuccess?.();
    } else {
      showToast(
        `Uploaded ${successCount} PDF(s), ${failCount} failed`,
        failCount > successCount ? 'error' : 'success'
      );
    }
  };

  const handleClear = () => {
    setFiles([]);
    setUploadProgress({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (filename: string) => {
    setFiles(prev => prev.filter(f => f.name !== filename));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[filename];
      return newProgress;
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-lg bg-ack-blue/10 dark:bg-ack-blue/20 flex items-center justify-center mr-3">
          <svg
            className="w-5 h-5 text-ack-blue dark:text-blue-400"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Upload PDF</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Upload and parse a PDF document
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="pdf-file"
            className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2"
          >
            PDF File
          </label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-ack-blue dark:hover:border-blue-400 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-700/50">
            <input
              ref={fileInputRef}
              id="pdf-file"
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
            <label
              htmlFor="pdf-file"
              className="cursor-pointer flex flex-col items-center"
            >
              <svg
                className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  PDF files only (Max 200MB each) • Multiple files supported
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Selected files list */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Selected files ({files.length}):
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {uploadProgress[file.name] === 'uploading' && (
                      <svg
                        className="animate-spin h-4 w-4 text-blue-500"
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
                    {uploadProgress[file.name] === 'success' && (
                      <span className="text-green-500 text-lg">✓</span>
                    )}
                    {uploadProgress[file.name] === 'error' && (
                      <span className="text-red-500 text-lg">✗</span>
                    )}
                    <span className="truncate text-gray-900 dark:text-gray-100">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 ml-auto flex-shrink-0">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  {!isLoading && uploadProgress[file.name] !== 'uploading' && (
                    <button
                      type="button"
                      onClick={() => removeFile(file.name)}
                      className="ml-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {files.length > 0 && !isLoading && (
            <Button
              type="button"
              onClick={handleClear}
              disabled={isLoading}
              className="flex-1"
              variant="secondary"
            >
              Clear All
            </Button>
          )}
          <Button type="submit" disabled={files.length === 0 || isLoading} className="flex-1">
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                Uploading {files.findIndex(f => uploadProgress[f.name] === 'uploading') + 1}/{files.length}...
              </span>
            ) : (
              `Upload ${files.length} PDF${files.length > 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      </form>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  );
}
