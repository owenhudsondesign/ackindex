import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { Queue } from 'bullmq';
import Redis from 'ioredis';

async function checkEmbeddingQueue() {
  const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: process.env.REDIS_URL?.includes('upstash') ? {} : undefined,
  });

  const embeddingQueue = new Queue('embedding', {
    connection: redisConnection,
  });

  try {
    console.log('Checking embedding queue status...\n');

    const waiting = await embeddingQueue.getWaiting(0, 10);
    const active = await embeddingQueue.getActive(0, 10);
    const completed = await embeddingQueue.getCompleted(0, 10);
    const failed = await embeddingQueue.getFailed(0, 10);

    console.log(`Waiting: ${waiting.length}`);
    console.log(`Active: ${active.length}`);
    console.log(`Completed: ${completed.length}`);
    console.log(`Failed: ${failed.length}\n`);

    if (failed.length > 0) {
      console.log('Failed jobs:\n');
      for (const job of failed.slice(0, 3)) {
        console.log(`Job ${job.id}:`);
        console.log(`  Reason: ${job.failedReason}`);
        if (job.stacktrace) {
          console.log(`  Stack: ${job.stacktrace[0]}`);
        }
        console.log('');
      }
    }

    if (active.length > 0) {
      console.log('Active jobs:');
      for (const job of active) {
        console.log(`  Job ${job.id}: ${job.data.chunks?.length || 0} chunks`);
      }
    }

    await embeddingQueue.close();
    await redisConnection.quit();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await embeddingQueue.close();
    await redisConnection.quit();
    process.exit(1);
  }
}

checkEmbeddingQueue();
