import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local FIRST
config({ path: resolve(__dirname, '../.env.local') });

// Now import dependencies AFTER env vars are loaded
import { Queue } from 'bullmq';
import Redis from 'ioredis';

async function checkFailedJobs() {
  console.log('Checking failed PDF processing jobs...\n');

  // Create Redis connection with loaded env vars
  const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: process.env.REDIS_URL?.includes('upstash') ? {} : undefined,
  });

  // Create Queue instance
  const pdfProcessingQueue = new Queue('pdf-processing', {
    connection: redisConnection,
  });

  try {
    const failed = await pdfProcessingQueue.getFailed(0, 10);

    if (failed.length === 0) {
      console.log('No failed jobs found.');
      await pdfProcessingQueue.close();
      await redisConnection.quit();
      process.exit(0);
      return;
    }

    console.log(`Found ${failed.length} failed job(s):\n`);

    for (const job of failed) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Job ID: ${job.id}`);
      console.log(`Job Name: ${job.name}`);
      console.log(`Filename: ${job.data.filename}`);
      console.log(`Document ID: ${job.data.documentId}`);
      console.log(`Attempts: ${job.attemptsMade}/${job.opts.attempts}`);
      console.log(`Failed Reason: ${job.failedReason}`);
      if (job.stacktrace) {
        console.log(`Stack Trace:\n${job.stacktrace.join('\n')}`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

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

checkFailedJobs().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
