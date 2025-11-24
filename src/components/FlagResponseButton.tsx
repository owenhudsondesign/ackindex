'use client';

import React, { useState } from 'react';

interface FlagResponseButtonProps {
  queryText: string;
  responseText: string;
  citations: any[];
  verificationResult?: any;
  similarityScores?: any;
}

export default function FlagResponseButton({
  queryText,
  responseText,
  citations,
  verificationResult,
  similarityScores,
}: FlagResponseButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [flagType, setFlagType] = useState('incorrect_fact');
  const [flagReason, setFlagReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!flagReason.trim()) {
      setError('Please explain what is incorrect');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/flag-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryText,
          responseText,
          citations,
          flagReason,
          flagType,
          verificationResult,
          similarityScores,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit flag');
      }

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setFlagReason('');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-sm text-green-600 font-medium">
        ✓ Thank you for your feedback!
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-gray-500 hover:text-gray-700 underline"
        title="Report incorrect information"
      >
        Report Issue
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Report Incorrect Answer</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What's the issue?
                </label>
                <select
                  value={flagType}
                  onChange={(e) => setFlagType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="incorrect_fact">Incorrect fact or information</option>
                  <option value="missing_info">Missing important information</option>
                  <option value="wrong_source">Wrong or misleading source citation</option>
                  <option value="hallucination">Made-up information (hallucination)</option>
                  <option value="other">Other issue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Please explain what is incorrect *
                </label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[100px]"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !flagReason.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
