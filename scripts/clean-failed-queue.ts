import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local FIRST
config({ path: resolve(__dirname, '../.env.local') });

import { Queue } from 'bullmq';
import Redis from 'ioredis';

async function cleanFailedQueue() {
  console.log('Cleaning failed jobs from PDF processing queue...\n');

  const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: process.env.REDIS_URL?.includes('upstash') ? {} : undefined,
  });

  const pdfProcessingQueue = new Queue('pdf-processing', {
    connection: redisConnection,
  });

  try {
    // Get all failed jobs
    const failed = await pdfProcessingQueue.getFailed(0, 100);

    if (failed.length === 0) {
      console.log('No failed jobs to clean.');
      await pdfProcessingQueue.close();
      await redisConnection.quit();
      process.exit(0);
      return;
    }

    console.log(`Found ${failed.length} failed job(s). Cleaning...\n`);

    for (const job of failed) {
      console.log(`Removing job ${job.id}: ${job.data.filename}`);
      await job.remove();
    }

    console.log(`\n✅ Removed ${failed.length} failed job(s) from queue.`);

    await pdfProcessingQueue.close();
    await redisConnection.quit();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pdfProcessingQueue.close();
    await redisConnection.quit();
    process.exit(1);
  }
}

cleanFailedQueue().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
