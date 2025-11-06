# Deploy Nantucket Scraper & Ingest PDFs for RAG

## Overview

This guide will walk you through deploying the stagehand-nantucket-scraper and ingesting the scraped PDFs into AckIndex for RAG chat.

## ✅ What's Already Done

- ✅ Stagehand actor created with bi-directional infinite scroll
- ✅ Actor supports PDF extraction and OpenAI text cleaning
- ✅ Actor deployed to Apify (build 1.0.4+)
- ✅ Integration code exists in `src/lib/apifyScraper.ts`
- ✅ Embedding and chunking pipeline ready in `src/lib/embeddings.ts`

## 🚀 Step 1: Enable Stagehand Auto-Detection

Update your `.env` file:

```bash
# Enable Stagehand for CivicClerk sites
ENABLE_STAGEHAND_AUTO_DETECT=true

# Or force Stagehand for all URLs (optional)
USE_STAGEHAND_ACTOR=true

# Actor IDs (already configured)
STAGEHAND_ACTOR_ID=legible_radish/stagehand-nantucket-scraper
APIFY_ACTOR_ID=legible_radish/ackindex-3

# Required API keys (should already be set)
APIFY_API_TOKEN=your_token_here
OPENAI_API_KEY=your_openai_key_here
```

## 📥 Step 2: Test the Scraper via Admin Panel

### Option A: Via Admin Dashboard (Recommended)

1. Go to https://ackindex.com/admin
2. In the "Scheduled Scrapes Manager" section, click **"Add New URL"**
3. Enter:
   - **URL**: `https://nantucketma.portal.civicclerk.com/`
   - **Title**: "Nantucket Town Meetings"
   - **Frequency**: "1 week" (or your preferred schedule)
   - **Priority**: 5
   - **Status**: Active
4. Click **"Save"**
5. Select the newly added URL (checkbox)
6. Click **"Scrape Selected Now"** to run immediately
7. Monitor progress in the Activity Feed below

### Option B: Via API Route

```bash
curl -X POST https://ackindex.com/api/admin/ingest-external \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://nantucketma.portal.civicclerk.com/",
    "maxPages": 50,
    "maxDepth": 2,
    "extractPDFs": true
  }'
```

### Option C: Via Apify Console (Direct Testing)

1. Go to https://console.apify.com/actors/LG4kRw7XDmReSygb7
2. Click "Start" with input:
```json
{
  "startUrl": "https://nantucketma.portal.civicclerk.com/",
  "maxPages": 100,
  "maxDepth": 1,
  "extractPDFs": true,
  "openaiApiKey": "your-openai-key"
}
```

## 🔍 Step 3: Understand What Gets Scraped

### Scroll Behavior

The actor performs **bi-directional infinite scroll**:

1. **Phase 1 - Future Meetings**: Scrolls down (max 10 attempts) to load ~1 week of future meetings
2. **Phase 2 - Historical Meetings**: Scrolls up (max 50 attempts) to load past meetings
3. **Smart Stopping**: Stops after 5 consecutive attempts with no new meetings
4. **Wait Time**: 3 seconds between scrolls for content to load

### Expected Output

**Per Scrape Run:**
- 1x page item (portal homepage with meeting list)
- Multiple PDF items (each meeting document)

**Page Item Example:**
```json
{
  "type": "page",
  "url": "https://nantucketma.portal.civicclerk.com/",
  "title": "Agendas & Minutes",
  "text": "Meeting listings...",
  "pdf_count": 15,
  "scraped_at": "2025-11-06T..."
}
```

**PDF Item Example:**
```json
{
  "type": "pdf",
  "url": "https://nantucketma.portal.civicclerk.com/event/19778/files",
  "title": "Select Board Meeting Agenda",
  "full_text": "Extracted PDF text...",
  "tables": [...],
  "metadata": {
    "committee": "Select Board",
    "meeting_date": "2025-11-06",
    "asset_type": "agenda"
  }
}
```

## 📊 Step 4: Monitor Ingestion Pipeline

### Check Database for New Documents

```sql
-- View recently ingested documents
SELECT
  id,
  source_type,
  title,
  created_at,
  chunk_count
FROM documents
WHERE source_url LIKE '%civicclerk%'
ORDER BY created_at DESC
LIMIT 20;
```

### Check Embedding Queue

```sql
-- View embedding queue status
SELECT
  status,
  COUNT(*) as count
FROM document_embeddings
GROUP BY status;
```

### Check Logs

```bash
# Check backend logs for scraping activity
grep "Apify" logs/app.log | tail -50

# Check for errors
grep "ERROR" logs/app.log | grep -i "apify\|scrape" | tail -20
```

## 🔄 Step 5: Full Production Deployment

### A. Schedule Regular Scraping

Create a cron job or use Apify's built-in scheduler:

**Via Apify Console:**
1. Go to Actor → Schedules
2. Create schedule: Daily at 2 AM
3. Input:
```json
{
  "startUrl": "https://nantucketma.portal.civicclerk.com/",
  "maxPages": 100,
  "maxDepth": 1,
  "extractPDFs": true,
  "openaiApiKey": "${OPENAI_API_KEY}"
}
```

### B. Set Up Webhook for Automatic Ingestion

1. In Apify Actor settings, add webhook:
   - Event: `ACTOR.RUN.SUCCEEDED`
   - URL: `https://ackindex.com/api/webhooks/apify`

2. Webhook handler will automatically:
   - Fetch dataset results
   - Chunk PDF text
   - Generate embeddings
   - Store in vector database

### C. Enable Duplicate Detection

The system automatically skips duplicates using:
- URL-based deduplication
- Content hash comparison
- Last-modified timestamp checking

## 🎯 Step 6: Verify RAG Chat Works

### Test Query Examples

Once PDFs are embedded, test these queries:

```
"What were the topics discussed in the latest Select Board meeting?"

"Find all meetings related to budget approval"

"What time is the next Capital Program Committee meeting?"

"Show me meeting minutes from October 2024"
```

### Check Vector Search

```sql
-- Test semantic search directly
SELECT
  d.title,
  dc.content,
  dc.embedding <=> '[your_query_embedding]' as distance
FROM document_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE d.source_url LIKE '%civicclerk%'
ORDER BY distance ASC
LIMIT 5;
```

## 🔧 Troubleshooting

### Issue: No PDFs Being Extracted

**Check:**
1. Verify `extractPDFs: true` in actor input
2. Check actor logs for PDF download errors
3. Ensure OpenAI API key is set (needed for text cleaning)

**Solution:**
```bash
# Test PDF extraction manually
curl https://nantucketma.portal.civicclerk.com/event/19778/files
```

### Issue: Embeddings Not Generating

**Check:**
1. Embedding queue status in database
2. OpenAI API quota/errors
3. Job queue worker running

**Solution:**
```bash
# Manually trigger embedding generation
npm run jobs:process-embeddings

# Or via API
curl -X POST https://ackindex.com/api/admin/trigger-embeddings
```

### Issue: Duplicate Documents

**Check:**
1. Deduplication logic in ingestion route
2. Document URL normalization

**Solution:**
```typescript
// In src/app/api/admin/ingest-external/route.ts
// Deduplication happens via unique constraint on source_url
```

### Issue: Scraper Times Out

**Problem:** Long scrapes >10 minutes hit Apify timeout

**Solution:**
- Reduce `maxPages` to 50
- Run multiple smaller scrapes
- Use Apify's resurrection feature

## 📈 Performance Optimization

### Batch Processing

Process PDFs in batches for faster embedding:

```typescript
// In your ingestion handler
const BATCH_SIZE = 10;
for (let i = 0; i < pdfs.length; i += BATCH_SIZE) {
  const batch = pdfs.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(pdf => processAndEmbed(pdf)));
}
```

### Caching

The system already caches:
- ✅ User profiles (1 hour)
- ✅ Search queries (24 hours)
- ✅ Document metadata (5 minutes)

### Historical Data Limits

**Current Setup:**
- Max scroll attempts: 50
- Max total meetings: ~500-1000 (depends on portal)
- Typical historical range: 1-3 years

**To Load More Historical Data:**
1. Increase `maxScrollAttempts` in main.js (line 113)
2. Increase wait time between scrolls (line 150)
3. Run multiple targeted scrapes with date filters

## 🎉 Success Metrics

Your deployment is successful when:

✅ Actor runs complete without errors
✅ PDFs are extracted and text cleaned
✅ Documents appear in database
✅ Embeddings generate automatically
✅ RAG chat returns relevant meeting information
✅ Scheduled runs happen daily
✅ Duplicate meetings are skipped

## 📚 Next Steps

1. **Add More Sources**: Deploy scrapers for other towns
2. **Improve Search**: Fine-tune semantic search weights
3. **Add Summaries**: Generate meeting summaries with GPT-4
4. **Email Alerts**: Notify users of new meetings
5. **Advanced Filters**: Add date/committee/type filtering to chat

---

**Need Help?**
- Check actor logs: https://console.apify.com/actors/LG4kRw7XDmReSygb7/runs
- Review code: `/Users/owenhudson/ackindex/apify-actors/stagehand-nantucket-scraper/`
- Test ingestion: `/Users/owenhudson/ackindex/src/lib/apifyScraper.ts`
