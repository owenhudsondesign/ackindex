/**
 * Bull Board Configuration
 *
 * Provides a visual dashboard for monitoring BullMQ job queues.
 * This should only be used in authenticated admin contexts.
 */

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { scrapingQueue, embeddingQueue } from './queues';

// Create Bull Board instance with our queues
export const { addQueue, removeQueue, setQueues, replaceQueues, getQueues } = createBullBoard({
  queues: [
    new BullMQAdapter(scrapingQueue),
    new BullMQAdapter(embeddingQueue),
  ],
  serverAdapter: undefined, // We'll handle the UI rendering in the API route
});

/**
 * Get queue statistics for all queues
 */
export async function getQueueStats() {
  const [scrapingCounts, embeddingCounts] = await Promise.all([
    scrapingQueue.getJobCounts(),
    embeddingQueue.getJobCounts(),
  ]);

  return {
    scraping: {
      name: 'scraping',
      counts: scrapingCounts,
    },
    embedding: {
      name: 'embedding',
      counts: embeddingCounts,
    },
  };
}

/**
 * Get detailed information about a specific job
 */
export async function getJobDetails(queueName: string, jobId: string) {
  const queue = queueName === 'scraping' ? scrapingQueue : embeddingQueue;
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  return {
    id: job.id,
    name: job.name,
    data: job.data,
    progress: job.progress,
    attempts: job.attemptsMade,
    maxAttempts: job.opts.attempts,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
    stacktrace: job.stacktrace,
    returnvalue: job.returnvalue,
  };
}

/**
 * Retry a failed job
 */
export async function retryJob(queueName: string, jobId: string) {
  const queue = queueName === 'scraping' ? scrapingQueue : embeddingQueue;
  const job = await queue.getJob(jobId);

  if (!job) {
    throw new Error('Job not found');
  }

  await job.retry();
  return { success: true, jobId };
}

/**
 * Remove a job from the queue
 */
export async function removeJob(queueName: string, jobId: string) {
  const queue = queueName === 'scraping' ? scrapingQueue : embeddingQueue;
  const job = await queue.getJob(jobId);

  if (!job) {
    throw new Error('Job not found');
  }

  await job.remove();
  return { success: true, jobId };
}
