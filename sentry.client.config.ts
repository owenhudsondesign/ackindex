/**
 * Sentry Client Configuration
 *
 * Captures errors that occur in the browser.
 * Automatically initialized by Next.js.
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set environment
  environment: process.env.NODE_ENV,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Session replay disabled - GlitchTip doesn't support it
  // If you need replay in the future, consider PostHog instead
  replaysOnErrorSampleRate: 0,
  replaysSessionSampleRate: 0,

  integrations: [],

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send user email in production
    if (event.user) {
      delete event.user.email;
    }

    // Filter out sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }

    return event;
  },

  // Ignore common errors that aren't actionable
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Network errors
    'NetworkError',
    'Failed to fetch',
    // Abort errors
    'AbortError',
  ],
});
