'use client';

import Card from '@/components/Card';

export default function LongVideoInstructions() {
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Long Video Processing (&gt;120 min)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manual workflow for videos exceeding Gladia's limit
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Workflow Steps */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            📋 Quick Workflow (15-20 minutes)
          </h3>

          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-semibold">
                1
              </span>
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  Download Audio File
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Use <a href="https://ytmp3.nu" target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline">ytmp3.nu</a> or similar service (~5 minutes)
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-semibold">
                2
              </span>
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  Extract Video ID
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  From URL: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">youtube.com/watch?v=<span className="text-purple-600 dark:text-purple-400">VIDEO_ID</span></code>
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-semibold">
                3
              </span>
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  Run Processing Script
                </p>
                <div className="mt-2 bg-gray-900 rounded p-3">
                  <code className="text-xs text-green-400 font-mono">
                    npx tsx scripts/process-long-video.ts VIDEO_ID ~/Downloads/audio.mp3
                  </code>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Script handles transcription, enrichment, and storage automatically
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center text-sm font-semibold">
                ✓
              </span>
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  Done! Video is searchable
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Processing takes ~15-30% of video duration
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Example Command */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
            Example
          </h4>
          <div className="space-y-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Video: <span className="text-gray-900 dark:text-gray-100">youtube.com/watch?v=<strong>abc123xyz</strong></span>
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Downloaded to: <span className="text-gray-900 dark:text-gray-100">~/Downloads/meeting.mp3</span>
            </p>
            <div className="mt-3 bg-gray-900 rounded p-3">
              <code className="text-xs text-green-400 font-mono">
                npx tsx scripts/process-long-video.ts abc123xyz ~/Downloads/meeting.mp3
              </code>
            </div>
          </div>
        </div>

        {/* Cost Info */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Cost per 3-hour video
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                AssemblyAI: $1.95 • Your time: 15 min • Revenue: $135 • <strong>Profit: $125+ (93% margin)</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Help */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 <strong>Need help?</strong> See <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">LONG_VIDEO_QUICKSTART.md</code> for detailed instructions
          </p>
        </div>
      </div>
    </Card>
  );
}
