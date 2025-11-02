# CLAUDE_INFRA.md - DevOps, Queues, Caching & Monitoring

## Current Infrastructure

### Hosting
- **Frontend/API**: Vercel (Next.js deployment)
- **Database**: Supabase (PostgreSQL + pgvector)
- **Scraping**: Apify Cloud (Python actors)
- **Payments**: Stripe

### Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Apify
APIFY_API_TOKEN=apify_api_...
APIFY_ACTOR_ID=legible_radish/ackindex-pdf-actor

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Cron
CRON_SECRET=...
```

## Immediate Priority: Job Queue (NEXT_STEPS.md §1.A)

### Problem
Current scraping/embedding is fire-and-forget with no retry logic or monitoring.

### Solution: Bull/BullMQ with Redis
```bash
npm install bull @bull-board/api @bull-board/express
```

### Implementation

**1. Create queue utility (src/lib/queue.ts)**:
```typescript
import Queue from 'bull';

// Connect to Upstash Redis (free tier)
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: {}
};

export const scrapingQueue = new Queue('scraping', { redis: redisConfig });
export const embeddingQueue = new Queue('embedding', { redis: redisConfig });

// Scraping worker
scrapingQueue.process(async (job) => {
  const { url, documentId } = job.data;

  // 1. Start Apify job
  const runId = await startScrapeJob(url);

  // 2. Wait for completion
  await waitForJob(runId, 180000);

  // 3. Fetch results & store chunks
  const results = await getJobResults(runId);
  await storeChunks(documentId, results);

  // 4. Queue embedding job
  await embeddingQueue.add({ documentId }, { attempts: 3 });
});

// Embedding worker
embeddingQueue.process(async (job) => {
  const { documentId } = job.data;

  const chunks = await getPendingChunks(documentId, 50);
  const embeddings = await generateEmbeddingsBatch(chunks.map(c => c.content));

  for (let i = 0; i < chunks.length; i++) {
    await updateChunkEmbedding(chunks[i].id, embeddings[i]);
  }
});
```

**2. Update scrape-url endpoint**:
```typescript
// src/app/api/admin/scrape-url/route.ts
export async function POST(request: Request) {
  const { url } = await request.json();

  const document = await createDocument({ source_url: url });

  // Add to queue instead of fire-and-forget
  await scrapingQueue.add(
    { url, documentId: document.id },
    { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
  );

  return NextResponse.json({ documentId: document.id, queued: true });
}
```

**3. Add queue dashboard (src/app/api/admin/queue-dashboard/route.ts)**:
```typescript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();

createBullBoard({
  queues: [
    new BullAdapter(scrapingQueue),
    new BullAdapter(embeddingQueue)
  ],
  serverAdapter
});

// Access at /admin/queues
```

**Timeline**: 1-2 days
**Cost**: Upstash Redis free tier (10,000 commands/day)

## Caching Strategy (NEXT_STEPS.md §3.A)

### What to Cache
- **User profiles**: 1 hour TTL
- **Subscription status**: 5 minutes TTL
- **Frequently asked questions**: 24 hours TTL
- **Document metadata**: 1 hour TTL

### Implementation: Vercel KV (Redis)
```typescript
// src/lib/cache.ts
import { kv } from '@vercel/kv';

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const cached = await kv.get<T>(key);
  if (cached) return cached;

  const fresh = await fetcher();
  await kv.set(key, fresh, { ex: ttl });
  return fresh;
}

// Usage in API routes
const profile = await getCachedOrFetch(
  `user:${userId}:profile`,
  () => getUserProfile(userId),
  3600
);
```

**Timeline**: 2 days
**Cost**: Vercel KV free tier (256MB storage)

## Error Monitoring (NEXT_STEPS.md §1.B)

### Sentry Integration
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configuration (sentry.client.config.ts)**:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Don't send PII
    if (event.user) {
      delete event.user.email;
    }
    return event;
  }
});
```

**Usage in API routes**:
```typescript
try {
  // ... logic
} catch (error) {
  Sentry.captureException(error, {
    tags: { endpoint: '/api/chat' },
    user: { id: userId }
  });
  throw error;
}
```

**Timeline**: 4 hours
**Cost**: Sentry free tier (5,000 events/month)

## Logging (NEXT_STEPS.md §1.C)

### Structured Logging with Pino
```bash
npm install pino pino-pretty
```

**Setup (src/lib/logger.ts)**:
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

// Usage
logger.info({ userId, endpoint: '/api/chat' }, 'Chat request received');
logger.error({ error, documentId }, 'Failed to scrape URL');
```

**Replace console.log throughout codebase**:
```bash
# Find all console.log instances
grep -r "console.log" src/

# Replace with logger.info/debug/error
```

**Timeline**: 1 day

## Database Optimization (NEXT_STEPS.md §3.B)

### Indexes to Add
```sql
-- If not already present
CREATE INDEX idx_document_chunks_embedding ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_usage_tracking_user_month ON usage_tracking(user_id, year, month);
```

### Query Optimization
```typescript
// Bad: Fetches all columns
const chunks = await supabase.from('document_chunks').select('*');

// Good: Only select needed columns
const chunks = await supabase
  .from('document_chunks')
  .select('id, content, metadata')
  .limit(50);
```

**Timeline**: 1-2 days

## Deployment

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Environment variables**: Set in Vercel dashboard under Settings → Environment Variables

### Database Migrations
```bash
# Apply migrations via Supabase dashboard
# SQL Editor → New query → Paste migration file → Run

# Order:
1. supabase-schema.sql
2. supabase-migration-stage8.sql
3. supabase-migration-stage9.sql
4. add-embedding-index.sql (after 1000+ chunks)
```

## Monitoring Checklist

### Production Monitoring
- [ ] Sentry alerts configured
- [ ] Vercel Analytics enabled
- [ ] Supabase logs reviewed weekly
- [ ] Job queue dashboard accessible
- [ ] Stripe webhook monitoring
- [ ] OpenAI usage tracking

### Performance Metrics
- [ ] API response time <2s (p95)
- [ ] Database query time <100ms (p95)
- [ ] Scraping success rate >90%
- [ ] Embedding success rate >95%

## Cost Management

### Current Monthly Costs (~$100/month)
- Supabase Pro: $25
- OpenAI: $30-50 (usage-based)
- Vercel Pro: $20 (if exceeded free tier)
- Stripe: $0 (pay per transaction)
- Upstash Redis: $0 (free tier)
- Sentry: $0 (free tier)

### Scaling Thresholds
- **500 users**: Upgrade to Vercel Pro ($20/month)
- **1,000 queries/day**: Consider caching layer
- **10,000 documents**: Upgrade Supabase ($25 → $99/month)

## Related Files
- **NEXT_STEPS.md**: Infrastructure roadmap (§1.A, §1.B, §1.C, §3)
- **.env.local**: Environment variables (never commit!)
- **package.json**: Dependencies
