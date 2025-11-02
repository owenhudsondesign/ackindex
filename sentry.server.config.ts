/**
 * Sentry Server Configuration
 *
 * Captures errors that occur on the Next.js server (API routes, SSR, etc.).
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

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Don't send PII
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }

    // Filter out sensitive environment variables
    if (event.contexts?.runtime?.environment) {
      const env = event.contexts.runtime.environment as any;
      delete env.SUPABASE_SERVICE_ROLE_KEY;
      delete env.OPENAI_API_KEY;
      delete env.STRIPE_SECRET_KEY;
      delete env.APIFY_API_TOKEN;
      delete env.REDIS_URL;
    }

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Database connection errors (handled by retry logic)
    'ECONNREFUSED',
    'ETIMEDOUT',
  ],
});
