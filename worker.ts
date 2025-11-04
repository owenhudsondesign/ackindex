#!/usr/bin/env tsx
/**
 * Standalone Worker Script
 *
 * This script can be run as a separate process or deployed to a serverless
 * platform like Vercel, Railway, or Render to process BullMQ jobs.
 *
 * Usage:
 *   - Local: npx tsx worker.ts
 *   - Production: node dist/worker.js (after compilation)
 *   - Vercel: Deploy as a separate service or use Vercel Cron
 *
 * For Upstash serverless workers, this will be invoked automatically.
 */

// Load environment variables first (for local development only)
// Railway and other platforms will provide env vars directly
import dotenv from 'dotenv';
import { existsSync } from 'fs';

// Only load .env.local if it exists (local development)
if (existsSync('.env.local')) {
  console.log('📝 Loading .env.local for local development...');
  dotenv.config({ path: '.env.local' });
} else {
  console.log('📝 Using environment variables from platform (Railway, Vercel, etc.)...');
}

// Initialize Sentry for error tracking in workers
import * as Sentry from '@sentry/node';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,

    // Add worker-specific tags
    initialScope: {
      tags: {
        worker: 'bullmq',
        runtime: 'node',
      },
    },

    beforeSend(event) {
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
  });

  console.log('✅ Sentry initialized for worker error tracking');
}

// Validate required environment variables
function validateEnvVars() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'REDIS_URL',
    'APIFY_API_TOKEN'
  ];

  const missing = required.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Set these in Railway dashboard under "Variables" tab');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ All required environment variables are set');
}

async function startWorkers() {
  // Validate environment first
  validateEnvVars();

  // Import workers after environment is loaded
  const { scrapingWorker, embeddingWorker, pdfProcessingWorker } = await import('./src/lib/workers');

  console.log('==============================================');
  console.log('🚀 AckIndex BullMQ Workers Starting...');
  console.log('==============================================');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`Redis URL: ${process.env.REDIS_URL ? 'Connected' : 'Not configured'}`);
  console.log(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log('----------------------------------------------');

  // Log worker status
  console.log('📊 Worker Status:');
  console.log(`  Scraping Worker: ${scrapingWorker.isRunning() ? '✅ Running' : '❌ Stopped'}`);
  console.log(`  Embedding Worker: ${embeddingWorker.isRunning() ? '✅ Running' : '❌ Stopped'}`);
  console.log(`  PDF Processing Worker: ${pdfProcessingWorker.isRunning() ? '✅ Running' : '❌ Stopped'}`);
  console.log('==============================================\n');

  // Keep the process alive
  process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM received, shutting down workers...');
    await scrapingWorker.close();
    await embeddingWorker.close();
    await pdfProcessingWorker.close();
    console.log('✅ Workers shut down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n🛑 SIGINT received, shutting down workers...');
    await scrapingWorker.close();
    await embeddingWorker.close();
    await pdfProcessingWorker.close();
    console.log('✅ Workers shut down gracefully');
    process.exit(0);
  });

  // Log periodic status updates
  setInterval(async () => {
    console.log(`[${new Date().toISOString()}] Workers still running...`);
  }, 60000); // Every minute
}

// Start the workers
startWorkers().catch((error) => {
  console.error('❌ Failed to start workers:', error);

  // Send error to Sentry
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: {
        location: 'worker-startup',
      },
    });

    // Flush Sentry before exiting
    Sentry.close(2000).then(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
