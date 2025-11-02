import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

// Redis connection for Upstash
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: process.env.REDIS_URL?.includes('upstash') ? {} : undefined,
});

// Scraping Queue Configuration
export const scrapingQueue = new Queue('scraping', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s, then 4s, then 8s
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Embedding Queue Configuration
export const embeddingQueue = new Queue('embedding', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // Start with 1s, then 2s, then 4s
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600,
    },
  },
});

// Queue events for monitoring
export const scrapingQueueEvents = new QueueEvents('scraping', {
  connection: redisConnection,
});

export const embeddingQueueEvents = new QueueEvents('embedding', {
  connection: redisConnection,
});

// Event listeners for monitoring
scrapingQueueEvents.on('completed', ({ jobId }) => {
  console.log(`[Queue] Scraping job ${jobId} completed`);
});

scrapingQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[Queue] Scraping job ${jobId} failed:`, failedReason);
});

embeddingQueueEvents.on('completed', ({ jobId }) => {
  console.log(`[Queue] Embedding job ${jobId} completed`);
});

embeddingQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[Queue] Embedding job ${jobId} failed:`, failedReason);
});
