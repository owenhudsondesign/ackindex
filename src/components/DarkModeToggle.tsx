'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only render after mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <div className="w-5 h-5 rounded bg-gray-300 dark:bg-gray-600 animate-pulse" />
          </div>
          <div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="w-12 h-7 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
          isDark
            ? 'bg-indigo-900/50 text-indigo-200'
            : 'bg-amber-100 text-amber-600'
        }`}>
          {isDark ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </div>

        {/* Label */}
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isDark ? 'Easier on the eyes' : 'Bright and clear'}
          </p>
        </div>
      </div>

      {/* Toggle Switch */}
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ack-blue focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
          isDark ? 'bg-ack-blue' : 'bg-gray-300'
        }`}
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            isDark ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
