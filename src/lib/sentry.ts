/**
 * Sentry Helper Utilities
 *
 * Provides wrapper functions for error tracking and monitoring.
 * Use these instead of calling Sentry directly for consistency.
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Capture an exception with additional context
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureException(error, {
 *     tags: { endpoint: '/api/chat' },
 *     user: { id: userId }
 *   });
 *   throw error; // Re-throw if needed
 * }
 */
export function captureException(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string | number | boolean>;
    user?: { id: string; email?: string };
    extra?: Record<string, any>;
    level?: Sentry.SeverityLevel;
  }
) {
  Sentry.captureException(error, {
    tags: context?.tags,
    user: context?.user,
    extra: context?.extra,
    level: context?.level || 'error',
  });
}

/**
 * Capture a message (non-error event)
 *
 * @example
 * captureMessage('User completed onboarding', {
 *   level: 'info',
 *   tags: { userId: '123' }
 * });
 */
export function captureMessage(
  message: string,
  context?: {
    tags?: Record<string, string | number | boolean>;
    level?: Sentry.SeverityLevel;
    extra?: Record<string, any>;
  }
) {
  Sentry.captureMessage(message, {
    tags: context?.tags,
    level: context?.level || 'info',
    extra: context?.extra,
  });
}

/**
 * Wrap an API route handler with Sentry error tracking
 *
 * @example
 * export const POST = withSentryAPI(async (request) => {
 *   // Your handler code
 *   return NextResponse.json({ success: true });
 * });
 */
export function withSentryAPI<T extends (...args: any[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Capture the error
      Sentry.captureException(error, {
        tags: {
          handler: 'api-route',
        },
      });

      // Re-throw to let Next.js handle it
      throw error;
    }
  }) as T;
}

/**
 * Wrap an async function with Sentry error tracking
 *
 * @example
 * const scrapeUrl = withSentry(async (url) => {
 *   // Scraping logic
 * }, { operation: 'scrape-url' });
 */
export function withSentry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: {
    operation?: string;
    tags?: Record<string, string | number | boolean>;
  }
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          operation: context?.operation || 'unknown',
          ...context?.tags,
        },
      });
      throw error;
    }
  }) as T;
}

/**
 * Set user context for all subsequent events
 *
 * @example
 * setUserContext({ id: '123', email: 'user@example.com' });
 */
export function setUserContext(user: { id: string; email?: string; role?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 *
 * @example
 * addBreadcrumb('User clicked scrape button', { url: 'https://example.com' });
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  level?: Sentry.SeverityLevel
) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: level || 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a performance transaction
 *
 * @example
 * const transaction = startTransaction('scrape-url', { url });
 * try {
 *   await scrapeUrl(url);
 *   transaction.finish();
 * } catch (error) {
 *   transaction.setStatus('error');
 *   transaction.finish();
 *   throw error;
 * }
 */
export function startTransaction(name: string, data?: Record<string, any>) {
  return Sentry.startTransaction({
    name,
    data,
  });
}
