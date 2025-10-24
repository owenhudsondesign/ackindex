'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Category } from '@/types';

interface UploadFormProps {
  onUploadSuccess: () => void;
}

export default function UploadForm({ onUploadSuccess }: UploadFormProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('General');
  const [source, setSource] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const categories: Category[] = [
    'Budget',
    'Real Estate',
    'Town Meeting',
    'Infrastructure',
    'General',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setUploadStatus({
          type: 'error',
          message: 'File size must be less than 10MB',
        });
        return;
      }
      if (selectedFile.type !== 'application/pdf') {
        setUploadStatus({
          type: 'error',
          message: 'Only PDF files are allowed',
        });
        return;
      }
      setFile(selectedFile);
      setUploadStatus({ type: null, message: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setUploadStatus({ type: 'error', message: 'Please select a file' });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      console.log('Starting upload process...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        title,
        category,
        source
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('source', source);

      console.log('FormData created, sending request to /api/upload...');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();
      console.log('Response data:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadStatus({
        type: 'success',
        message: 'Document uploaded and parsed successfully!',
      });

      // Reset form
      setTitle('');
      setCategory('General');
      setSource('');
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Notify parent component
      onUploadSuccess();
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: error.message || 'Upload failed. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Document</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
            Title (Optional)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., FY2026 Budget Proposal"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ack-blue focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">Leave blank to auto-generate from document</p>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ack-blue focus:border-transparent"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Source */}
        <div>
          <label htmlFor="source" className="block text-sm font-semibold text-gray-700 mb-2">
            Source
          </label>
          <input
            type="text"
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g., Town Finance Department"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ack-blue focus:border-transparent"
          />
        </div>

        {/* File Upload */}
        <div>
          <label htmlFor="file-upload" className="block text-sm font-semibold text-gray-700 mb-2">
            PDF Document
          </label>
          <div className="mt-2">
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center w-full px-6 py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-ack-blue hover:bg-ack-blue/5 transition-all"
            >
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-4">
                  {file ? (
                    <p className="text-sm font-medium text-ack-blue">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PDF files only (max 10MB)</p>
                    </>
                  )}
                </div>
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Status Messages */}
        {uploadStatus.type && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl ${
              uploadStatus.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <p className="text-sm font-medium">{uploadStatus.message}</p>
          </motion.div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isUploading || !file}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 ${
            isUploading || !file
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-ack-blue hover:bg-ack-blue/90 shadow-md hover:shadow-lg'
          }`}
        >
          {isUploading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Upload & Parse Document'
          )}
        </button>
      </form>
    </motion.div>
  );
}
