import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local FIRST
config({ path: resolve(__dirname, '../.env.local') });

// Now import dependencies AFTER env vars are loaded
import { Queue } from 'bullmq';
import Redis from 'ioredis';

async function retryFailedJobs() {
  console.log('Retrying failed PDF processing jobs...\n');

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

    console.log(`Found ${failed.length} failed job(s). Retrying...\n`);

    for (const job of failed) {
      console.log(`Retrying job ${job.id}: ${job.data.filename}`);

      // Retry the job
      await job.retry();

      console.log(`✓ Job ${job.id} queued for retry\n`);
    }

    console.log(`\n✅ Successfully queued ${failed.length} job(s) for retry.`);
    console.log('Monitor progress in Bull Board or Railway logs.');

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

retryFailedJobs().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
