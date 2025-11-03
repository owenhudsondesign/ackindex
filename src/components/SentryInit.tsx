'use client';

import { useEffect } from 'react';

/**
 * Client component to ensure Sentry is initialized
 * This is a workaround for Next.js 16 + Turbopack not auto-loading sentry.client.config.ts
 */
export default function SentryInit() {
  useEffect(() => {
    // Import Sentry config dynamically to ensure it loads
    import('../../sentry.client.config').catch((err) => {
      console.error('Failed to load Sentry client config:', err);
    });
  }, []);

  return null; // This component renders nothing
}
