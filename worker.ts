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

// Load environment variables first (for local development)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function startWorkers() {
  // Import workers after environment is loaded
  const { scrapingWorker, embeddingWorker } = await import('./src/lib/workers');

  console.log('==============================================');
  console.log('🚀 AckIndex BullMQ Workers Starting...');
  console.log('==============================================');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Redis URL: ${process.env.REDIS_URL ? 'Connected' : 'Not configured'}`);
  console.log('----------------------------------------------');

  // Log worker status
  console.log('📊 Worker Status:');
  console.log(`  Scraping Worker: ${scrapingWorker.isRunning() ? '✅ Running' : '❌ Stopped'}`);
  console.log(`  Embedding Worker: ${embeddingWorker.isRunning() ? '✅ Running' : '❌ Stopped'}`);
  console.log('==============================================\n');

  // Keep the process alive
  process.on('SIGTERM', async () => {
    console.log('\n🛑 SIGTERM received, shutting down workers...');
    await scrapingWorker.close();
    await embeddingWorker.close();
    console.log('✅ Workers shut down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n🛑 SIGINT received, shutting down workers...');
    await scrapingWorker.close();
    await embeddingWorker.close();
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
  process.exit(1);
});
