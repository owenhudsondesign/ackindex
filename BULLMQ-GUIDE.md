# BullMQ Implementation Guide

## What is Bull/BullMQ?

**BullMQ** is a Redis-based job queue system for Node.js. It handles asynchronous task processing with reliability, retry logic, and monitoring.

- **Bull** - The older, callback-based version
- **BullMQ** - Modern, Promise-based version (recommended)

## Why Do You Need It?

### Current Problems (Fire-and-Forget Pattern)

Looking at your `scrape-url/route.ts`, you're using:

```typescript
processUrlScraping(document.id, url, adminOrError.id).catch(error => {
  console.error('[Scrape API] Background processing failed:', error);
});
```

**Issues with this approach:**

1. **No Persistence**: If your server restarts, in-flight jobs are lost forever
2. **No Retry Logic**: If a scrape fails due to a temporary network issue, it's marked as failed with no automatic retry
3. **No Monitoring**: You can't see:
   - How many jobs are queued
   - Which jobs are running
   - Which jobs failed and why
   - Job progress/ETA
4. **No Rate Limiting**: Multiple scrapes can overwhelm Apify/OpenAI APIs
5. **No Priority**: All jobs are treated equally - can't prioritize urgent scrapes
6. **No Scheduled Jobs**: Can't easily schedule recurring scrapes (you have the table, but no worker)
7. **Blocking**: If embedding generation takes 5 minutes, your API might timeout

### How BullMQ Solves These Problems

1. **Persistence**: Jobs stored in Redis - survive server restarts
2. **Automatic Retries**: Failed jobs can retry 3 times with exponential backoff
3. **Job Monitoring**: Dashboard to see queue status, job history, failures
4. **Rate Limiting**: Process max 5 scrapes concurrently, embed 50 chunks at a time
5. **Priorities**: High-priority jobs jump the queue
6. **Scheduled Jobs**: Built-in support for cron-like scheduling
7. **Non-Blocking**: Jobs run in separate workers, API returns immediately

## How BullMQ Works

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   API       │─────▶│   Redis     │─────▶│   Worker    │
│  (Enqueue)  │      │   (Queue)   │      │  (Process)  │
└─────────────┘      └─────────────┘      └─────────────┘
     │                    │                      │
     │                    │                      ▼
     │                    │              ┌─────────────┐
     │                    └────────────▶│  Database   │
     │                                   │  (Results)  │
     └──────────────────────────────────▶└─────────────┘
              (Update status via API)
```

1. **API Route** receives request → Creates job → Adds to Redis queue → Returns immediately
2. **Worker** (separate process) pulls job from Redis → Processes it → Updates database
3. **Dashboard** shows job status, failures, retries

## Architecture for AckIndex

### Queues Needed

1. **scraping-queue**: Web scraping jobs
   - Priority: High for scheduled scrapes, Normal for manual
   - Concurrency: 5 jobs max
   - Retries: 3 attempts with exponential backoff
   - Timeout: 10 minutes

2. **embedding-queue**: Embedding generation jobs
   - Priority: Normal
   - Concurrency: 2 jobs max (to avoid OpenAI rate limits)
   - Retries: 3 attempts
   - Timeout: 5 minutes

3. **scheduled-scraping-queue**: Cron jobs for scheduled scrapes
   - Runs daily/weekly/monthly based on `scheduled_scrapes` table
   - Repeats automatically

## Implementation Steps

### Step 1: Install Dependencies

```bash
npm install bullmq ioredis
npm install --save-dev @types/ioredis
```

**Why ioredis?** BullMQ needs a Redis client. ioredis is the recommended one.

### Step 2: Set Up Redis

**Option A: Local Development (Docker)**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Option B: Production (Upstash - Free Tier)**
1. Sign up at https://upstash.com
2. Create Redis database (free tier: 10,000 commands/day)
3. Get connection URL
4. Add to `.env.local`:
```env
REDIS_URL=redis://default:password@your-upstash-url:6379
```

### Step 3: Create Queue Configuration

**File: `src/lib/queues.ts`**

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

// Redis connection
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Queue configurations
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

export const embeddingQueue = new Queue('embedding', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600,
      count: 100,
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
```

### Step 4: Create Worker File

**File: `src/lib/workers.ts`**

```typescript
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { processUrlScraping } from '@/lib/apifyScraper'; // Your existing function
import { generateEmbeddingsBatch } from '@/lib/embeddings';
import { getChunksWithoutEmbeddings, updateChunkEmbedding } from '@/lib/database';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Scraping Worker
export const scrapingWorker = new Worker(
  'scraping',
  async (job) => {
    const { documentId, url, userId } = job.data;
    
    // Update job progress
    await job.updateProgress(10);
    
    // Call your existing processing function
    await processUrlScraping(documentId, url, userId);
    
    await job.updateProgress(100);
    
    return { success: true, documentId };
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process max 5 jobs at once
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per minute (rate limit Apify)
    },
  }
);

// Handle scraping job events
scrapingWorker.on('completed', (job) => {
  console.log(`[Worker] Scraping job ${job.id} completed`);
});

scrapingWorker.on('failed', (job, err) => {
  console.error(`[Worker] Scraping job ${job?.id} failed:`, err);
});

scrapingWorker.on('error', (err) => {
  console.error('[Worker] Scraping worker error:', err);
});

// Embedding Worker
export const embeddingWorker = new Worker(
  'embedding',
  async (job) => {
    const { chunks } = job.data;
    
    await job.updateProgress(10);
    
    // Generate embeddings
    const texts = chunks.map((chunk: any) => chunk.content);
    const embeddings = await generateEmbeddingsBatch(texts);
    
    await job.updateProgress(50);
    
    // Update database
    let successCount = 0;
    for (let i = 0; i < chunks.length; i++) {
      try {
        await updateChunkEmbedding(chunks[i].id, embeddings[i]);
        successCount++;
      } catch (error) {
        console.error(`Failed to update chunk ${chunks[i].id}:`, error);
      }
      await job.updateProgress(50 + (i / chunks.length) * 50);
    }
    
    return { success: true, processed: successCount };
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process max 2 embedding jobs at once
    limiter: {
      max: 5, // Max 5 jobs
      duration: 60000, // Per minute (rate limit OpenAI)
    },
  }
);

// Handle embedding job events
embeddingWorker.on('completed', (job) => {
  console.log(`[Worker] Embedding job ${job.id} completed`);
});

embeddingWorker.on('failed', (job, err) => {
  console.error(`[Worker] Embedding job ${job?.id} failed:`, err);
});
```

### Step 5: Initialize Workers (Next.js API Route)

**File: `src/app/api/admin/workers/init/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { scrapingWorker, embeddingWorker } from '@/lib/workers';

// Initialize workers (call this once when server starts)
export async function POST() {
  try {
    // Workers are already initialized when imported
    return NextResponse.json({
      message: 'Workers initialized',
      scraping: scrapingWorker.isRunning(),
      embedding: embeddingWorker.isRunning(),
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to initialize workers', error: String(error) },
      { status: 500 }
    );
  }
}
```

**Important**: In production (Vercel), workers can't run in serverless functions. You need a separate process. See "Deployment" section below.

### Step 6: Update Scrape URL API

**File: `src/app/api/admin/scrape-url/route.ts`** (Modified)

```typescript
import { scrapingQueue } from '@/lib/queues';

export async function POST(request: NextRequest) {
  try {
    // ... auth code ...

    const body = await request.json();
    const { url, priority = 'normal' } = body;

    // ... validation ...

    // Create document record
    const document = await createDocument({
      source_type: 'url',
      source_url: url,
      title: url,
      created_by: adminOrError.id,
    });

    // Add job to queue (instead of fire-and-forget)
    const job = await scrapingQueue.add(
      'scrape-url',
      {
        documentId: document.id,
        url,
        userId: adminOrError.id,
      },
      {
        priority: priority === 'high' ? 1 : 5, // Lower number = higher priority
        jobId: document.id, // Use document ID as job ID for idempotency
      }
    );

    return NextResponse.json({
      message: 'URL scraping queued successfully',
      documentId: document.id,
      jobId: job.id,
      url,
    });
  } catch (error) {
    // ... error handling ...
  }
}
```

### Step 7: Update Embedding Generation

**File: `src/app/api/admin/generate-embeddings/route.ts`** (Modified)

```typescript
import { embeddingQueue } from '@/lib/queues';
import { getChunksWithoutEmbeddings } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // ... auth code ...

    const body = await request.json();
    const { batchSize = 50 } = body;

    // Get chunks without embeddings
    const chunks = await getChunksWithoutEmbeddings(batchSize);

    if (chunks.length === 0) {
      return NextResponse.json({
        message: 'All chunks already have embeddings',
      });
    }

    // Add job to queue
    const job = await embeddingQueue.add(
      'generate-embeddings',
      { chunks },
      {
        priority: 5,
      }
    );

    return NextResponse.json({
      message: `Queued embedding generation for ${chunks.length} chunks`,
      jobId: job.id,
      chunkCount: chunks.length,
    });
  } catch (error) {
    // ... error handling ...
  }
}
```

### Step 8: Create Job Status Endpoint

**File: `src/app/api/admin/jobs/[jobId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { scrapingQueue, embeddingQueue } from '@/lib/queues';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    // Check both queues
    let job = await scrapingQueue.getJob(jobId);
    let queueName = 'scraping';

    if (!job) {
      job = await embeddingQueue.getJob(jobId);
      queueName = 'embedding';
    }

    if (!job) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    const state = await job.getState();
    const progress = job.progress;
    const returnValue = job.returnvalue;
    const failedReason = job.failedReason;

    return NextResponse.json({
      jobId: job.id,
      queue: queueName,
      state, // 'completed' | 'failed' | 'active' | 'waiting' | 'delayed'
      progress,
      data: job.data,
      returnValue,
      failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to get job status', error: String(error) },
      { status: 500 }
    );
  }
}
```

### Step 9: Create Queue Dashboard (Optional but Recommended)

**File: `src/app/api/admin/queue-dashboard/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { scrapingQueue, embeddingQueue } from '@/lib/queues';

export async function GET() {
  try {
    const [scrapingStats, embeddingStats] = await Promise.all([
      scrapingQueue.getJobCounts(),
      embeddingQueue.getJobCounts(),
    ]);

    return NextResponse.json({
      scraping: {
        waiting: scrapingStats.waiting,
        active: scrapingStats.active,
        completed: scrapingStats.completed,
        failed: scrapingStats.failed,
        delayed: scrapingStats.delayed,
      },
      embedding: {
        waiting: embeddingStats.waiting,
        active: embeddingStats.active,
        completed: embeddingStats.completed,
        failed: embeddingStats.failed,
        delayed: embeddingStats.delayed,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to get queue stats', error: String(error) },
      { status: 500 }
    );
  }
}
```

## Deployment Considerations

### Vercel (Serverless) Limitation

**Problem**: Vercel serverless functions can't run long-lived workers.

**Solutions**:

1. **Separate Worker Service** (Recommended)
   - Deploy workers to a separate service (Railway, Render, Fly.io)
   - Runs 24/7, pulls jobs from Redis
   - Cost: ~$5-10/month

2. **Vercel Cron Jobs**
   - Use Vercel Cron to trigger workers periodically
   - Workers process jobs in batches
   - Limitation: Not real-time

3. **Upstash Serverless Workers** (Best for Vercel)
   - Upstash offers serverless Redis workers
   - Auto-scales, pay-per-use
   - Integrates with BullMQ

### Example: Separate Worker Service

**File: `worker.ts`** (Separate Node.js service)

```typescript
import { scrapingWorker, embeddingWorker } from './src/lib/workers';

console.log('Workers started');
console.log('Scraping worker running:', scrapingWorker.isRunning());
console.log('Embedding worker running:', embeddingWorker.isRunning());

// Keep process alive
process.on('SIGTERM', async () => {
  await scrapingWorker.close();
  await embeddingWorker.close();
  process.exit(0);
});
```

**Deploy to Railway**:
```bash
# railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node worker.js"
  }
}
```

## Benefits Summary

✅ **Reliability**: Jobs survive server restarts  
✅ **Retries**: Automatic retry on failure  
✅ **Monitoring**: See queue status, job progress  
✅ **Rate Limiting**: Prevent API overload  
✅ **Priorities**: Important jobs processed first  
✅ **Scalability**: Run multiple workers  

## Next Steps

1. Install dependencies
2. Set up Redis (local or Upstash)
3. Create queue configuration
4. Create workers
5. Update API routes to use queues
6. Deploy workers (separate service)
7. Test end-to-end

## Resources

- [BullMQ Docs](https://docs.bullmq.io/)
- [Redis Commands](https://redis.io/commands)
- [Upstash Redis](https://upstash.com/docs/redis/overall/getstarted)

