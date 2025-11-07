# YouTube Integration Complete! 🎉

The YouTube video processing pipeline has been successfully integrated into your ackindex backend.

## What Was Created

### 1. **YouTube Scraper Module** (`src/lib/youtubeScraper.ts`)
- Detects YouTube URLs automatically
- Calls the Apify orchestrator actor
- Processes enriched meeting data from the 3-stage pipeline
- Stores transcripts, summaries, and metadata in your database
- Creates searchable chunks with meeting-specific metadata

### 2. **Integration with Scheduled Scraping** (`src/lib/scheduledScraping.ts`)
- Added automatic YouTube URL detection
- Routes YouTube URLs to the orchestrator pipeline
- Regular URLs still use existing Apify/Playwright scrapers
- Seamless integration - no changes to your admin UI needed!

### 3. **Environment Variables** (`.env.example`)
- Added `YOUTUBE_ORCHESTRATOR_ACTOR_ID`
- Added `YOUTUBE_API_KEY`
- Added `DEEPGRAM_API_KEY`
- Updated documentation

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     Scheduled Scraping Cron                      │
│                    (runs daily at 2 AM UTC)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              processScheduledUrl(schedule)                       │
│         Check: Is this a YouTube URL?                            │
└─────────┬────────────────────────────────┬──────────────────────┘
          │                                │
    YES   │                                │   NO
          ▼                                ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│  processYouTubeUrl()     │    │  Regular Apify/Playwright │
│                          │    │  Scraping (existing)      │
│  1. Call orchestrator    │    └──────────────────────────┘
│  2. Wait for completion  │
│  3. Get enriched results │
│  4. Store in database    │
└──────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│                 Orchestrator Actor Pipeline                       │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────────┐ │
│  │ Actor 1:        │──▶│ Actor 2:        │──▶│ Actor 3:      │ │
│  │ Download Audio  │   │ Transcribe      │   │ AI Enrichment │ │
│  │ (ytdl-core)     │   │ (Deepgram)      │   │ (OpenAI GPT)  │ │
│  └─────────────────┘   └─────────────────┘   └───────────────┘ │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│              ackindex Database (PostgreSQL)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ documents    │  │ chunks       │  │ Metadata:              │ │
│  │ - YouTube    │  │ - Searchable │  │ - Attendees            │ │
│  │   videos     │  │   content    │  │ - Key decisions        │ │
│  │ - Metadata   │  │ - Embeddings │  │ - Action items         │ │
│  └──────────────┘  └──────────────┘  │ - Notable quotes       │ │
│                                       │ - Topics/keywords      │ │
│                                       └────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Next Steps

### 1. Add Nantucket URL to Database

You can do this through your admin UI or directly in Supabase:

```sql
INSERT INTO scheduled_scrapes (
  url,
  title,
  scrape_frequency,
  status,
  priority,
  next_scrape_at,
  scrape_options
) VALUES (
  'https://www.youtube.com/@townofnantucket/streams',
  'Nantucket Town Government Meetings',
  INTERVAL '1 week',
  'active',
  8,
  NOW(),
  '{"maxVideos": 10, "transcriptionService": "deepgram", "openaiModel": "gpt-4o-mini"}'::jsonb
);
```

### 2. Test with One Video

Before running the full pipeline, test with a single video:

**Option A: Manual Trigger via Admin UI**
1. Go to your admin dashboard
2. Find the Nantucket URL in scheduled scrapes
3. Click "Trigger Now" button

**Option B: API Call**
```bash
curl -X POST https://your-domain.com/api/admin/trigger-scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"scrapeId": "YOUR_SCRAPE_ID"}'
```

**Option C: Test Single Video Directly**
Create a test scrape with just one video URL:
```sql
INSERT INTO scheduled_scrapes (url, title, next_scrape_at, scrape_options)
VALUES (
  'https://www.youtube.com/watch?v=SOME_VIDEO_ID',
  'Test Video',
  NOW(),
  '{"maxVideos": 1}'::jsonb
);
```

### 3. Monitor the Pipeline

**Check Apify Console:**
- https://console.apify.com/actors/runs
- Watch the orchestrator run and its 3 sub-actors
- View logs for any errors

**Check Your Database:**
```sql
-- Check if document was created
SELECT * FROM documents WHERE source_type = 'youtube' ORDER BY created_at DESC LIMIT 5;

-- Check if chunks were stored
SELECT COUNT(*), document_id FROM chunks
WHERE metadata->>'video_id' IS NOT NULL
GROUP BY document_id;

-- View meeting metadata
SELECT
  metadata->>'video_title' as title,
  metadata->>'attendees' as attendees,
  metadata->>'key_decisions' as decisions
FROM chunks
WHERE metadata->>'video_id' IS NOT NULL
LIMIT 1;
```

**Check Logs:**
- Vercel logs: https://vercel.com/your-project/deployments
- Search for: "YouTube", "orchestrator", "Detected YouTube URL"

### 4. Adjust Configuration

You can customize the scraping behavior per URL using `scrape_options`:

```sql
UPDATE scheduled_scrapes
SET scrape_options = jsonb_set(
  COALESCE(scrape_options, '{}'::jsonb),
  '{maxVideos}',
  '20'
)
WHERE url = 'https://www.youtube.com/@townofnantucket/streams';
```

**Available options:**
- `maxVideos`: Number of videos to process (default: 10)
- `transcriptionService`: "deepgram", "assemblyai", or "openai-whisper" (default: "deepgram")
- `openaiModel`: "gpt-4o-mini", "gpt-4o", or "gpt-4-turbo" (default: "gpt-4o-mini")
- `enableEmbeddings`: true/false (default: true)

### 5. Cost Estimation

For 10 one-hour meeting videos:
- **YouTube API**: ~500 quota units = FREE (50,000 daily limit)
- **Deepgram**: 10 × 60 min × $0.0043 = **$2.58**
- **OpenAI GPT-4o-mini**: ~$0.50 for analysis
- **OpenAI Embeddings**: ~$0.02
- **Total**: ~**$3.10 per batch**

Weekly scraping (10 new videos/week) = ~$13/month

## Troubleshooting

### "Missing required API keys"
**Solution**: Check that these are set in Vercel:
```bash
YOUTUBE_API_KEY
DEEPGRAM_API_KEY
OPENAI_API_KEY
YOUTUBE_ORCHESTRATOR_ACTOR_ID=legible_radish/youtube-meetings-orchestrator
APIFY_API_TOKEN
```

### "Orchestrator run FAILED"
**Possible causes**:
1. YouTube API quota exceeded (50,000 units/day)
2. Deepgram API key invalid or out of credits
3. OpenAI API key invalid or rate limited
4. Video is private/age-restricted

**Solution**: Check Apify run logs in console for specific error

### "No videos were processed"
**Possible causes**:
1. Channel has no livestream recordings
2. Videos are unlisted/private
3. `maxVideos` is too low
4. URL format incorrect

**Solution**:
- Test with direct video URL first
- Check YouTube channel visibility
- Increase `maxVideos` in scrape_options

### "Chunks not appearing in search"
**Possible causes**:
1. Embeddings not generated
2. Document status stuck at "processing"

**Solution**:
```sql
-- Check document status
SELECT id, status, chunk_count FROM documents
WHERE source_type = 'youtube'
ORDER BY created_at DESC;

-- Reset if stuck
UPDATE documents
SET status = 'completed'
WHERE id = 'YOUR_DOCUMENT_ID' AND status = 'processing';
```

## Architecture Details

### Document Structure
Each YouTube URL creates ONE document with:
- `source_type`: "youtube"
- `source_url`: The YouTube URL
- `title`: Channel name or video title
- Multiple chunks with meeting metadata

### Chunk Metadata
Every chunk includes:
```typescript
{
  video_id: string;
  video_title: string;
  channel: string;
  published_at: string;
  duration: string;
  meeting_type?: string;
  departments?: string[];
  attendees?: Array<{name: string, title: string}>;
  key_decisions?: Array<{decision: string, context: string}>;
  action_items?: Array<{action: string, responsible: string}>;
  topics?: string[];
  keywords?: string[];
  category?: string;
  priority_level?: number;
}
```

### Search Capabilities
Your chatbot can now answer:
- "What decisions were made in the last town meeting?"
- "Who attended the zoning board meeting?"
- "What action items were assigned to the planning department?"
- "Find meetings where parking was discussed"
- "What quotes are there about the budget?"

## Files Modified/Created

### New Files
- ✅ `src/lib/youtubeScraper.ts` - YouTube processing logic
- ✅ `apify-actors/youtube-audio-downloader/` - Actor 1 (complete)
- ✅ `apify-actors/transcription-processor/` - Actor 2 (complete)
- ✅ `apify-actors/meeting-ai-enrichment/` - Actor 3 (complete)
- ✅ `apify-actors/youtube-meetings-orchestrator/` - Actor 4 (complete)

### Modified Files
- ✅ `src/lib/scheduledScraping.ts` - Added YouTube URL detection
- ✅ `.env.example` - Added YouTube/Deepgram/Orchestrator config

### Published Actors
- ✅ `legible_radish/youtube-audio-downloader`
- ✅ `legible_radish/transcription-processor`
- ✅ `legible_radish/meeting-ai-enrichment`
- ✅ `legible_radish/youtube-meetings-orchestrator`

## Ready to Roll! 🚀

Your YouTube meeting transcription pipeline is **fully integrated** and ready to process videos. Just add the Nantucket URL to your scheduled_scrapes table and watch the magic happen!

Need help? Check the logs or reach out with any questions.
