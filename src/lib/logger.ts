/**
 * Structured Logging with Pino
 *
 * Replaces console.log with structured JSON logging for better debugging
 * and log aggregation in production.
 */

import pino from 'pino';
import { randomUUID } from 'crypto';

// Create base logger with environment-specific configuration
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Pretty print in development, JSON in production
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  } : undefined,

  // Base configuration
  base: {
    env: process.env.NODE_ENV,
  },

  // Serialize errors properly
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },

  // Redact sensitive information
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
});

/**
 * Create a child logger with request context
 *
 * @example
 * const log = createRequestLogger(request);
 * log.info('Processing request');
 */
export function createRequestLogger(request?: Request | { headers: Headers }) {
  const requestId = request?.headers.get('x-request-id') || randomUUID();

  return logger.child({
    requestId,
    path: request instanceof Request ? new URL(request.url).pathname : undefined,
    method: request instanceof Request ? request.method : undefined,
  });
}

/**
 * Create a child logger with custom context
 *
 * @example
 * const log = createLogger({ userId: '123', operation: 'scrape' });
 * log.info('Starting scrape job');
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log levels:
 * - trace: Very detailed debugging (usually disabled)
 * - debug: Detailed debugging information
 * - info: General informational messages
 * - warn: Warning messages (something unexpected but not an error)
 * - error: Error messages (something failed)
 * - fatal: Critical errors (application crash)
 */

// Export default logger for simple usage
export default logger;

/**
 * Example usage:
 *
 * // Simple logging
 * import logger from '@/lib/logger';
 * logger.info('Application started');
 * logger.error({ err: error }, 'Failed to process');
 *
 * // With request context
 * import { createRequestLogger } from '@/lib/logger';
 * const log = createRequestLogger(request);
 * log.info('Received chat request');
 * log.error({ err: error, userId }, 'Chat processing failed');
 *
 * // With custom context
 * import { createLogger } from '@/lib/logger';
 * const log = createLogger({ jobId: '123', type: 'scraping' });
 * log.info('Job started');
 * log.warn('Job taking longer than expected');
 * log.info({ duration: 5000 }, 'Job completed');
 */
