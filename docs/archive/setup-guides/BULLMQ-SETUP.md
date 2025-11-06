# BullMQ Implementation - Setup Complete ✅

## Overview

AckIndex now uses **BullMQ** with **Upstash Redis** for reliable, scalable background job processing. This replaces the previous fire-and-forget pattern with a robust queue system that provides:

- ✅ **Persistence**: Jobs survive server restarts
- ✅ **Automatic Retries**: Failed jobs retry with exponential backoff
- ✅ **Job Monitoring**: Track job status, progress, and failures
- ✅ **Rate Limiting**: Prevent API overload
- ✅ **Scalability**: Process jobs concurrently with proper limits

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   API       │─────▶│   Redis     │─────▶│   Worker    │
│  (Enqueue)  │      │  (Upstash)  │      │  (Process)  │
└─────────────┘      └─────────────┘      └─────────────┘
     │                                          │
     │                                          ▼
     │                                   ┌─────────────┐
     └──────────────────────────────────▶│  Supabase   │
              (Track status)              │  Database   │
                                          └─────────────┘
```

## Setup Summary

### 1. Dependencies Installed

```bash
npm install bullmq ioredis
npm install --save-dev @types/ioredis tsx
```

### 2. Environment Variables Added

```env
# Upstash Redis Configuration (For BullMQ job queues)
REDIS_URL=redis://default:****@rested-magpie-32424.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://rested-magpie-32424.upstash.io
UPSTASH_REDIS_REST_TOKEN=****
```

### 3. Files Created

- **src/lib/queues.ts** - Queue configurations for scraping and embedding
- **src/lib/workers.ts** - Worker implementations for processing jobs
- **src/app/api/admin/jobs/[jobId]/route.ts** - Job status endpoint
- **src/app/api/admin/queue-dashboard/route.ts** - Queue monitoring dashboard
- **src/app/api/admin/workers/route.ts** - Worker control endpoint
- **worker.ts** - Standalone worker script for deployment
- **test-redis.ts** - Redis connection test script

### 4. Files Updated

- **src/app/api/admin/scrape-url/route.ts** - Now uses scrapingQueue
- **src/app/api/admin/generate-embeddings/route.ts** - Now uses embeddingQueue

## Queue Configuration

### Scraping Queue
- **Concurrency**: 5 jobs max
- **Rate Limit**: 10 jobs/minute
- **Retries**: 3 attempts with exponential backoff (2s → 4s → 8s)
- **Priority Support**: High priority for scheduled scrapes

### Embedding Queue
- **Concurrency**: 2 jobs max
- **Rate Limit**: 5 jobs/minute
- **Retries**: 3 attempts with exponential backoff (1s → 2s → 4s)
- **Batch Processing**: Up to 50 chunks per job

## Running Workers

### Local Development

Start workers in development mode with auto-reload:
```bash
npm run worker:dev
```

Start workers in production mode:
```bash
npm run worker
```

Test Redis connection:
```bash
npm run test:redis
```

### Deployment Options

#### Option 1: Separate Worker Service (Recommended for Production)

Deploy workers to a separate long-running service:

**Railway.app:**
```bash
# 1. Push code to GitHub
# 2. Connect Railway to your repo
# 3. Set start command: npm run worker
# 4. Add environment variables from .env.local
```

**Render.com:**
```bash
# 1. Create new Background Worker
# 2. Set start command: npm run worker
# 3. Add environment variables
```

**Fly.io:**
```bash
flyctl launch
flyctl deploy
```

#### Option 2: Vercel Cron (Serverless)

For serverless environments, use Vercel Cron to periodically process jobs:

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/admin/process-jobs",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Create `/api/admin/process-jobs/route.ts`:
```typescript
import { scrapingWorker, embeddingWorker } from '@/lib/workers';

export async function GET(request: NextRequest) {
  // Process jobs for 4 minutes (Vercel timeout is 5 min)
  const timeout = setTimeout(() => {
    scrapingWorker.pause();
    embeddingWorker.pause();
  }, 240000);

  // Let workers process available jobs
  await new Promise(resolve => setTimeout(resolve, 240000));

  clearTimeout(timeout);
  return NextResponse.json({ message: 'Job processing complete' });
}
```

#### Option 3: Upstash QStash (Recommended for Serverless)

Use Upstash QStash for serverless background jobs:

1. Sign up at https://upstash.com
2. Create a QStash endpoint pointing to your API
3. Configure workers to be invoked by QStash

## API Endpoints

### 1. Check Job Status

```bash
GET /api/admin/jobs/{jobId}
```

Response:
```json
{
  "jobId": "doc-123",
  "queue": "scraping",
  "state": "active",
  "progress": 45,
  "data": {
    "url": "https://example.com",
    "documentId": "doc-123"
  }
}
```

### 2. Queue Dashboard

```bash
GET /api/admin/queue-dashboard
```

Response:
```json
{
  "scraping": {
    "counts": {
      "waiting": 5,
      "active": 2,
      "completed": 100,
      "failed": 3
    },
    "jobs": {
      "active": [...],
      "waiting": [...],
      "completed": [...],
      "failed": [...]
    }
  },
  "embedding": { ... }
}
```

### 3. Worker Control

```bash
POST /api/admin/workers
Body: { "action": "pause|resume", "worker": "scraping|embedding|all" }
```

## Monitoring & Debugging

### View Queue Stats

```bash
curl http://localhost:3000/api/admin/queue-dashboard
```

### Check Worker Status

```bash
curl http://localhost:3000/api/admin/workers
```

### View Job Details

```bash
curl http://localhost:3000/api/admin/jobs/{jobId}
```

### Test Redis Connection

```bash
npm run test:redis
```

## Job Flow

### Scraping Job

1. User submits URL via `/api/admin/scrape-url`
2. Document record created in Supabase
3. Job added to `scraping` queue
4. Worker picks up job from Redis
5. Apify scrapes URL + PDFs
6. Content is chunked and stored
7. Document marked as complete
8. Job result stored in Redis for 24 hours

### Embedding Job

1. User triggers `/api/admin/generate-embeddings`
2. Chunks without embeddings fetched from DB
3. Job added to `embedding` queue
4. Worker picks up job
5. OpenAI generates embeddings
6. Embeddings updated in database
7. Job marked complete

## Error Handling

### Automatic Retries

Jobs automatically retry on failure with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 2 seconds later (scraping) / 1 second (embedding)
- Attempt 3: 4 seconds later (scraping) / 2 seconds (embedding)
- Attempt 4: 8 seconds later (scraping) / 4 seconds (embedding)

### Failed Jobs

Failed jobs are kept in Redis for 7 days for debugging. View them at:
```bash
GET /api/admin/queue-dashboard
```

### Worker Errors

Worker errors are logged and captured in the job's `failedReason` field.

## Performance Optimization

### Rate Limiting

- **Apify**: Max 10 scrapes/minute to avoid rate limits
- **OpenAI**: Max 5 embedding batches/minute

### Concurrency

- **Scraping**: 5 concurrent jobs (long-running)
- **Embedding**: 2 concurrent jobs (API-intensive)

### Job Cleanup

- Completed jobs: Kept for 24 hours
- Failed jobs: Kept for 7 days
- Only last 100 completed jobs retained per queue

## Troubleshooting

### Workers Not Processing Jobs

1. Check worker is running: `curl http://localhost:3000/api/admin/workers`
2. Check Redis connection: `npm run test:redis`
3. Check for paused queues: Workers may be paused

### Jobs Stuck in "Waiting"

- No workers are running
- Workers are paused
- Redis connection lost

### High Failure Rate

1. Check Apify/OpenAI API credentials
2. Review failed job reasons in dashboard
3. Check API rate limits
4. Verify network connectivity

### Redis Connection Issues

```bash
npm run test:redis
```

If fails:
- Verify `REDIS_URL` in `.env.local`
- Check Upstash Redis dashboard
- Verify TLS is enabled for Upstash

## Next Steps

### Production Deployment Checklist

- [ ] Deploy workers to separate service (Railway/Render)
- [ ] Add environment variables to worker service
- [ ] Update Vercel environment variables
- [ ] Set up monitoring (Sentry for errors)
- [ ] Configure alerts for job failures
- [ ] Test end-to-end job processing
- [ ] Monitor Upstash Redis usage

### Optional Enhancements

- [ ] Add job prioritization UI
- [ ] Implement job cancellation
- [ ] Add webhook notifications for job completion
- [ ] Create admin dashboard for queue monitoring
- [ ] Set up scheduled scraping with cron jobs
- [ ] Implement job progress tracking in UI

## Resources

- **BullMQ Docs**: https://docs.bullmq.io/
- **Upstash Redis**: https://upstash.com/docs/redis
- **Upstash QStash**: https://upstash.com/docs/qstash
- **Railway Deployment**: https://railway.app/docs
- **Render Background Workers**: https://render.com/docs/background-workers

## Support

For issues or questions:
1. Check logs: `npx tsx worker.ts`
2. Test Redis: `npm run test:redis`
3. View queue dashboard: `/api/admin/queue-dashboard`
4. Contact: owenhudsondesign@gmail.com
