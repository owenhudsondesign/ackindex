'use client';

import React, { useState } from 'react';

interface DropboxFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modified: string;
  downloadUrl: string;
  sizeFormatted: string;
  parsedMetadata: {
    meetingTitle: string;
    meetingDate: string | null;
    boardOrCommittee: string;
  };
  // Editable fields
  selected: boolean;
  editedTitle: string;
  editedDate: string;
  editedBoard: string;
}

interface ScanResult {
  folderName: string;
  files: DropboxFile[];
  totalFiles: number;
  totalSize: number;
  totalSizeFormatted: string;
}

export default function DropboxImportForm() {
  const [dropboxUrl, setDropboxUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    successful: number;
    failed: number;
    message: string;
  } | null>(null);

  const handleScan = async () => {
    if (!dropboxUrl.trim()) {
      setError('Please enter a Dropbox folder URL');
      return;
    }

    setIsScanning(true);
    setError(null);
    setScanResult(null);
    setImportResult(null);

    try {
      const response = await fetch('/api/staff/dropbox/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dropboxUrl: dropboxUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan folder');
      }

      // Add editable fields to each file
      const filesWithEditableFields = data.files.map((file: any) => ({
        ...file,
        selected: true,
        editedTitle: file.parsedMetadata.meetingTitle,
        editedDate: file.parsedMetadata.meetingDate || '',
        editedBoard: file.parsedMetadata.boardOrCommittee,
      }));

      setScanResult({
        ...data,
        files: filesWithEditableFields,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan folder');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleFileSelection = (index: number) => {
    if (!scanResult) return;
    const newFiles = [...scanResult.files];
    newFiles[index].selected = !newFiles[index].selected;
    setScanResult({ ...scanResult, files: newFiles });
  };

  const selectAll = () => {
    if (!scanResult) return;
    const newFiles = scanResult.files.map(f => ({ ...f, selected: true }));
    setScanResult({ ...scanResult, files: newFiles });
  };

  const deselectAll = () => {
    if (!scanResult) return;
    const newFiles = scanResult.files.map(f => ({ ...f, selected: false }));
    setScanResult({ ...scanResult, files: newFiles });
  };

  const updateFileField = (index: number, field: 'editedTitle' | 'editedDate' | 'editedBoard', value: string) => {
    if (!scanResult) return;
    const newFiles = [...scanResult.files];
    newFiles[index][field] = value;
    setScanResult({ ...scanResult, files: newFiles });
  };

  const handleImport = async () => {
    if (!scanResult) return;

    const selectedFiles = scanResult.files.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      setError('Please select at least one video to import');
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const response = await fetch('/api/staff/dropbox/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dropboxUrl: dropboxUrl.trim(),
          files: selectedFiles.map(f => ({
            id: f.id,
            name: f.name,
            path: f.path,
            size: f.size,
            downloadUrl: f.downloadUrl,
            meetingTitle: f.editedTitle,
            meetingDate: f.editedDate || null,
            boardOrCommittee: f.editedBoard,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import videos');
      }

      setImportResult({
        successful: data.summary.successful,
        failed: data.summary.failed,
        message: data.message,
      });

      // Clear the scan result after successful import
      setScanResult(null);
      setDropboxUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import videos');
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = scanResult?.files.filter(f => f.selected).length || 0;
  const selectedSize = scanResult?.files
    .filter(f => f.selected)
    .reduce((sum, f) => sum + f.size, 0) || 0;

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Import from Dropbox
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Paste a shared Dropbox folder link to scan for video files. The videos will be
          downloaded server-side and processed automatically.
        </p>

        <div className="flex gap-3">
          <input
            type="url"
            value={dropboxUrl}
            onChange={(e) => setDropboxUrl(e.target.value)}
            placeholder="https://www.dropbox.com/sh/... or https://www.dropbox.com/scl/fo/..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isScanning || isImporting}
          />
          <button
            onClick={handleScan}
            disabled={isScanning || isImporting || !dropboxUrl.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {isScanning ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Scanning...
              </span>
            ) : (
              'Scan Folder'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {importResult && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
            {importResult.message}
          </div>
        )}
      </div>

      {/* Scan Results */}
      {scanResult && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {scanResult.folderName}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {scanResult.totalFiles} video{scanResult.totalFiles !== 1 ? 's' : ''} found ({scanResult.totalSizeFormatted})
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* File List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {scanResult.files.map((file, index) => (
              <div
                key={file.id}
                className={`p-4 border rounded-lg transition-colors ${
                  file.selected
                    ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={file.selected}
                    onChange={() => toggleFileSelection(index)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1 space-y-3">
                    {/* Filename and size */}
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white text-sm truncate max-w-md">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        {file.sizeFormatted}
                      </span>
                    </div>

                    {/* Editable fields */}
                    {file.selected && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Meeting Title
                          </label>
                          <input
                            type="text"
                            value={file.editedTitle}
                            onChange={(e) => updateFileField(index, 'editedTitle', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Meeting Date
                          </label>
                          <input
                            type="date"
                            value={file.editedDate}
                            onChange={(e) => updateFileField(index, 'editedDate', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Board/Committee
                          </label>
                          <input
                            type="text"
                            value={file.editedBoard}
                            onChange={(e) => updateFileField(index, 'editedBoard', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Import Button */}
          <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedCount} video{selectedCount !== 1 ? 's' : ''} selected
              {selectedCount > 0 && (
                <span className="ml-1">
                  ({formatSize(selectedSize)})
                </span>
              )}
            </div>
            <button
              onClick={handleImport}
              disabled={isImporting || selectedCount === 0}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {isImporting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Importing...
                </span>
              ) : (
                `Import ${selectedCount} Video${selectedCount !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!scanResult && !isScanning && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">How it works</h4>
          <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex gap-2">
              <span className="font-medium text-blue-600 dark:text-blue-400">1.</span>
              Get a shared folder link from Dropbox (click "Share" on the folder)
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-blue-600 dark:text-blue-400">2.</span>
              Paste the link above and click "Scan Folder"
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-blue-600 dark:text-blue-400">3.</span>
              Review the videos found and edit metadata if needed
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-blue-600 dark:text-blue-400">4.</span>
              Click "Import" - videos will be downloaded and processed server-side
            </li>
          </ol>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
            Note: Large imports may take several hours to complete. You can close this page
            and check progress in the Videos admin panel.
          </p>
        </div>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
