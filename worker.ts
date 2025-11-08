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

  console.log('==============================================');
  console.log('🚀 AckIndex BullMQ Workers Starting...');
  console.log('==============================================');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log('----------------------------------------------');
  console.log('📋 Environment Variables Check:');
  console.log(`  REDIS_URL: ${process.env.REDIS_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`  SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  GLADIA_API_KEY: ${process.env.GLADIA_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  YOUTUBE_API_KEY: ${process.env.YOUTUBE_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  APIFY_API_TOKEN: ${process.env.APIFY_API_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log('----------------------------------------------');

  // Import workers after environment is loaded
  console.log('📦 Loading worker modules...');
  const { scrapingWorker, embeddingWorker, pdfProcessingWorker } = await import('./src/lib/workers');
  console.log('✅ Worker modules loaded successfully');
  console.log('----------------------------------------------');

  // Log worker status
  console.log('📊 Worker Status:');
  console.log(`  Scraping Worker: ${scrapingWorker.isRunning() ? '✅ Running' : '❌ Stopped'}`);
  console.log(`  Embedding Worker: ${embeddingWorker.isRunning() ? '✅ Running' : '❌ Stopped'}`);
  console.log(`  PDF Processing Worker: ${pdfProcessingWorker.isRunning() ? '✅ Running' : '❌ Stopped'}`);
  console.log('==============================================');
  console.log('');
  console.log('🎯 Workers are now listening for jobs...');
  console.log('   - Scraping queue: "scraping"');
  console.log('   - Embedding queue: "embedding"');
  console.log('   - PDF Processing queue: "pdf-processing"');
  console.log('');
  console.log('💡 Tip: Jobs should appear below when added to the queue');
  console.log('==============================================\n');

  // Start HTTP server for Railway health checks
  const http = require('http');
  const PORT = process.env.PORT || 8080;

  console.log(`🌐 Starting health check server on port ${PORT}...`);

  const server = http.createServer((req: any, res: any) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        workers: {
          scraping: scrapingWorker.isRunning(),
          embedding: embeddingWorker.isRunning(),
          pdfProcessing: pdfProcessingWorker.isRunning()
        },
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    console.log(`🏥 Health check server listening on port ${PORT}`);
    console.log('');
  });

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
