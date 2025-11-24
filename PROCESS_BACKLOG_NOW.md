# Process 7,000 Hour Backlog Immediately

## Timeline: 3-4 Weeks Total

---

## Week 1: Setup & Testing (Days 1-7)

### Day 1: Infrastructure Check

**Verify Resources**:
```bash
# Check available RAM
free -h
# Need: 32+ GB for 10 workers (3 GB per worker + 2 GB overhead)

# Check disk space
df -h /tmp
# Need: 100+ GB free for temp video files during processing

# Check database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM documents;"
```

**If insufficient resources**:
- Option A: Reduce workers to 5 (20 days vs 10 days)
- Option B: Spin up cloud VMs (AWS EC2, GCP, etc.)
- Option C: Use multiple machines (split load)

---

### Day 2: Upload Videos to Storage

**If videos are local files**:

```bash
# Create upload script
node scripts/bulk-upload-videos.js --source /path/to/videos --destination r2

# OR use rclone for faster uploads
rclone sync /path/to/videos cloudflare:ackindex-videos \
  --transfers 10 \
  --progress
```

**If videos are already online**:
- Update `meeting_videos` table with `storage_url`
- Ensure workers can access URLs

**Expected time**: 1-3 days depending on upload speed
- 17.5 TB at 100 Mbps = ~17 days upload ⚠️
- 17.5 TB at 1 Gbps = ~2 days upload ✅

**Tip**: Upload while setting up other infrastructure (parallel work)

---

### Day 3-4: Database Preparation

**1. Apply Multi-Tenant Schema (if going multi-town)**:
```bash
# Backup first!
pg_dump $DATABASE_URL > backup_before_multitenancy.sql

# Apply schema
psql $DATABASE_URL -f MULTI_TENANT_SCHEMA.sql

# Create your organization
psql $DATABASE_URL <<SQL
INSERT INTO organizations (name, slug, state_code, subscription_tier, max_hours)
VALUES ('Your Town Name', 'yourtown', 'MA', 'pro', 10000)
RETURNING id;
SQL

# Save the organization ID for next step
```

**2. Create Document Records**:
```bash
# Bulk create document records for all videos
node scripts/create-document-records.js \
  --organization-id <org-uuid> \
  --videos-csv /path/to/videos-metadata.csv
```

**3. Verify Setup**:
```sql
-- Check documents created
SELECT COUNT(*) FROM documents WHERE organization_id = '<your-org-id>';

-- Check meeting_videos linked
SELECT COUNT(*) FROM meeting_videos WHERE organization_id = '<your-org-id>';

-- Verify storage URLs
SELECT storage_url FROM meeting_videos LIMIT 5;
```

---

### Day 5: Worker Configuration

**1. Update Workers for Batch Processing**:

Edit `/src/lib/workers.ts`:

```typescript
// Increase concurrency for backlog processing
scrapingQueue.process('process-meeting-video', 10, async (job) => {
  // ^ 10 concurrent jobs
  return await processMeetingVideoJob(job.data, job);
});

// Add retry logic for failed jobs
scrapingQueue.on('failed', async (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);

  // Retry up to 3 times
  if (job.attemptsMade < 3) {
    await job.retry();
  }
});

// Add progress tracking
scrapingQueue.on('progress', (job, progress) => {
  console.log(`Job ${job.id}: ${progress}%`);
});
```

**2. Set Environment Variables**:
```bash
# Increase timeouts for large backlog
export WORKER_TIMEOUT=3600000  # 1 hour per video
export WORKER_CONCURRENCY=10
export REDIS_MAX_CONNECTIONS=20

# AssemblyAI settings
export ASSEMBLYAI_API_KEY=your_key_here
export ASSEMBLYAI_MAX_RETRIES=3

# OpenAI settings
export OPENAI_API_KEY=your_key_here
export OPENAI_BATCH_SIZE=100
```

**3. Start Worker (Test Mode)**:
```bash
# Test with 5 videos first
npm run worker

# In another terminal, queue 5 test videos
node scripts/queue-videos.js --limit 5
```

---

### Day 6-7: Test Processing Pipeline

**Run End-to-End Test**:

```bash
# Queue 5 videos
node scripts/queue-videos.js --limit 5

# Monitor progress
npx bull-board  # Open http://localhost:3000/admin/queues

# Watch logs
tail -f logs/worker.log

# Verify results
psql $DATABASE_URL -c "
  SELECT
    mv.meeting_title,
    mv.processing_status,
    mv.transcription_status,
    COUNT(dc.id) as chunks
  FROM meeting_videos mv
  LEFT JOIN documents d ON mv.document_id = d.id
  LEFT JOIN document_chunks dc ON dc.document_id = d.id
  GROUP BY mv.id
  LIMIT 5;
"
```

**Expected Results**:
- ✅ Videos downloaded from storage
- ✅ Transcribed with AssemblyAI
- ✅ Chunks created with timestamps
- ✅ Embeddings generated
- ✅ Search returns results

**If tests fail**:
- Check logs for errors
- Verify AssemblyAI API key and credits
- Check storage URLs are accessible
- Ensure Redis is running

---

## Week 2-3: Full Processing (Days 8-23)

### Day 8: Queue All Videos

**Create bulk queue script**:

```typescript
// scripts/queue-all-videos.js
import { supabaseAdmin } from '../src/lib/supabaseAdmin';
import { scrapingQueue } from '../src/lib/queues';

async function queueAllVideos() {
  console.log('🚀 Queuing all videos for processing...');

  // Fetch all videos that need processing
  const { data: videos, error } = await supabaseAdmin
    .from('meeting_videos')
    .select('id, document_id, storage_path, storage_url, organization_id')
    .is('document_id', null)  // Not yet processed
    .order('meeting_date', { ascending: true });  // Oldest first

  if (error) throw error;

  console.log(`📊 Found ${videos.length} videos to process`);

  // Queue in batches to avoid overwhelming Redis
  const batchSize = 100;
  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);

    for (const video of batch) {
      await scrapingQueue.add('process-meeting-video', {
        videoId: video.id,
        documentId: video.document_id,
        storagePath: video.storage_path,
        storageUrl: video.storage_url,
        organizationId: video.organization_id,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });
    }

    console.log(`✅ Queued batch ${i / batchSize + 1} (${batch.length} videos)`);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('🎉 All videos queued!');
}

queueAllVideos().catch(console.error);
```

**Run it**:
```bash
node scripts/queue-all-videos.js
```

**Expected output**:
```
🚀 Queuing all videos for processing...
📊 Found 3500 videos to process
✅ Queued batch 1 (100 videos)
✅ Queued batch 2 (100 videos)
...
🎉 All videos queued!
```

---

### Day 9-23: Monitor Processing

**Start Workers (Multiple Terminals)**:

```bash
# Terminal 1: Worker instance 1
WORKER_ID=1 npm run worker

# Terminal 2: Worker instance 2
WORKER_ID=2 npm run worker

# Terminal 3: Monitor BullMQ
npx bull-board

# Terminal 4: Watch logs
tail -f logs/worker.log | grep -E "(completed|failed|error)"

# Terminal 5: Database stats
watch -n 60 'psql $DATABASE_URL -c "
  SELECT
    processing_status,
    COUNT(*) as count,
    ROUND(AVG(duration_seconds)) as avg_duration
  FROM meeting_videos
  GROUP BY processing_status;
"'
```

**Progress Tracking Script**:

```bash
# scripts/check-progress.sh
#!/bin/bash

TOTAL=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM meeting_videos;")
COMPLETED=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM meeting_videos WHERE processing_status = 'completed';")
PROCESSING=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM meeting_videos WHERE processing_status = 'processing';")
FAILED=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM meeting_videos WHERE processing_status = 'failed';")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Processing Progress"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total:      $TOTAL"
echo "Completed:  $COMPLETED ($(awk "BEGIN {printf \"%.1f\", $COMPLETED/$TOTAL*100}")%)"
echo "Processing: $PROCESSING"
echo "Failed:     $FAILED"
echo ""
echo "⏱️  Estimated time remaining: $(awk "BEGIN {print int(($TOTAL-$COMPLETED)/10/24)}")" days

# Run every 5 minutes
watch -n 300 ./scripts/check-progress.sh
```

---

### Handling Issues During Processing

**Problem: Jobs Failing**

```bash
# Check failed jobs
npx bull-board
# -> View failed jobs in UI

# Retry all failed jobs
node scripts/retry-failed-jobs.js
```

**Problem: Running Out of Disk Space**

```bash
# Workers download videos to /tmp
# Clean up temp files periodically
df -h /tmp

# Set up auto-cleanup
crontab -e
# Add: */30 * * * * find /tmp/meeting_video_* -mtime +1 -delete
```

**Problem: AssemblyAI Rate Limits**

```bash
# Reduce concurrency temporarily
# Edit workers.ts, change from 10 to 5
scrapingQueue.process('process-meeting-video', 5, async (job) => {
  // ...
});

# Restart workers
pkill -f "node.*worker"
npm run worker
```

**Problem: OpenAI Embedding Failures**

```sql
-- Find chunks without embeddings
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NULL;

-- Manually queue embedding job
INSERT INTO embedding_jobs (document_id)
SELECT DISTINCT document_id
FROM document_chunks
WHERE embedding IS NULL;
```

---

## Week 4: Verification & Optimization (Days 24-28)

### Day 24: Verify Completion

**Check All Videos Processed**:

```sql
-- Should return 0
SELECT COUNT(*) FROM meeting_videos
WHERE processing_status != 'completed';

-- Total chunks created
SELECT COUNT(*) FROM document_chunks;
-- Expected: ~155,000

-- Total with embeddings
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;
-- Expected: ~155,000 (same as above)

-- Average chunks per video
SELECT AVG(chunks) FROM (
  SELECT d.id, COUNT(dc.id) as chunks
  FROM documents d
  LEFT JOIN document_chunks dc ON dc.document_id = d.id
  GROUP BY d.id
) sub;
-- Expected: ~45 chunks per video
```

---

### Day 25: Test Search Quality

**Run Test Queries**:

```bash
# Test search via API
curl http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What did the Select Board discuss about the budget?", "conversationId": null}'

# Check response time
time curl http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Town meeting votes", "conversationId": null}'
```

**Expected Results**:
- ✅ Response time: <2 seconds
- ✅ Citations from multiple meetings
- ✅ Accurate timestamps
- ✅ No hallucinations (verified by anti-hallucination system)

---

### Day 26: Optimize Vector Index

**Create Optimized Index for 155K Chunks**:

```sql
-- Drop existing index if present
DROP INDEX IF EXISTS idx_chunks_embedding;

-- Create optimized IVFFlat index
-- lists = sqrt(total_rows) ≈ sqrt(155000) ≈ 394
CREATE INDEX idx_chunks_embedding
ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 400);

-- Analyze table for query planner
ANALYZE document_chunks;

-- Test search performance
EXPLAIN ANALYZE
SELECT id, content, 1 - (embedding <=> '[...]') as similarity
FROM document_chunks
WHERE 1 - (embedding <=> '[...]') > 0.78
ORDER BY embedding <=> '[...]'
LIMIT 10;
-- Should use idx_chunks_embedding and take <50ms
```

---

### Day 27: Set Up Monitoring

**1. Create Admin Dashboard**:

```typescript
// pages/admin/processing-stats.tsx
export default function ProcessingStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Processing Complete!</h1>
      <div>Total Videos: {stats?.totalVideos}</div>
      <div>Total Hours: {stats?.totalHours}</div>
      <div>Total Chunks: {stats?.totalChunks}</div>
      <div>Searchable Content: {stats?.searchableGB} GB</div>
      <div>Average Search Time: {stats?.avgSearchMs} ms</div>
    </div>
  );
}
```

**2. Set Up Alerts**:

```bash
# Install Sentry for error monitoring
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs

# Configure alerts for:
# - Search failures
# - High query latency (>2s)
# - Database connection issues
```

---

### Day 28: Launch! 🚀

**1. Update Homepage**:

```typescript
// Show impressive stats
<div className="stats">
  <h2>7,000+ Hours of Civic Meetings</h2>
  <p>Fully searchable with AI-powered search</p>
  <p>155,000+ indexed segments</p>
  <p>Instant answers with precise citations</p>
</div>
```

**2. Announce to Users**:

```
🎉 Big News!

We've just indexed 7,000 hours of [Your Town] civic meetings going back 5+ years!

✅ Every Select Board meeting
✅ Every Town Meeting
✅ Every Planning Board meeting
✅ All fully searchable with AI

Try asking:
- "What did the Select Board discuss about affordable housing?"
- "Show me all votes on zoning changes"
- "Summarize last year's budget discussions"

[Try it now →]
```

**3. Monitor First Day**:
- Watch query volume
- Check response times
- Gather user feedback
- Fix any issues immediately

---

## Cost Summary

### One-Time (Weeks 1-3)

| Item | Cost |
|------|------|
| AssemblyAI (6,900 hrs) | $6,210 |
| OpenAI Embeddings (155K chunks) | $23 |
| Infrastructure (local) | $0 |
| **TOTAL** | **$6,233** |

### Ongoing (Starting Week 4)

| Item | Monthly Cost |
|------|--------------|
| Storage (17.5 TB B2) | $105 |
| Supabase Team | $599 |
| New content (83 hrs/mo) | $0 |
| OpenAI queries | $12 |
| Vercel | $20 |
| **TOTAL** | **$736/month** |

---

## Troubleshooting

### Issue: Upload is Too Slow

**Solution**: Use multiple upload streams
```bash
# Split videos into batches
ls videos/ | split -l 100 - batch_

# Upload batches in parallel
for batch in batch_*; do
  rclone sync videos/$(cat $batch) cloudflare:ackindex-videos &
done
wait
```

### Issue: Workers Keep Crashing

**Solution**: Increase memory limits
```bash
# Update workers.ts
export NODE_OPTIONS="--max-old-space-size=4096"  # 4 GB per worker

# Or reduce concurrency
scrapingQueue.process('process-meeting-video', 5, ...)
```

### Issue: Database Running Out of Space

**Solution**: Upgrade Supabase or clean up
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('postgres'));

-- If >8 GB, upgrade to Team plan ($599)
-- Or delete test data
DELETE FROM document_chunks WHERE document_id IN (
  SELECT id FROM documents WHERE title LIKE 'TEST%'
);
```

---

## Next Steps After Processing

1. **Week 5**: Onboard first external town (multi-tenant)
2. **Week 6**: Set up billing (Stripe)
3. **Week 7**: Launch marketing campaign
4. **Week 8**: Reach 5 paying towns → profitability

**Your 7,000-hour archive is now your biggest competitive advantage!** 🚀
